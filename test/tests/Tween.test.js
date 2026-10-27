/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2020, Jürg Lehni & Jonathan Puckey
 * http://juerglehni.com/ & https://puckey.studio/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

import { describe } from 'vitest'
import { Base, Path, Point, Project, Tween } from 'paper'
import { equals, test } from '../helpers.js'

describe('Tween', () => {
  test('Tween#update() interpolates points and colors', () => {
    const path = new Path.Circle({
      center: [0, 0],
      radius: 10,
      fillColor: 'black'
    })
    const tween = path.tween(
      { position: [0, 0], fillColor: 'black' },
      { position: [100, 50], fillColor: 'white' },
      { duration: 1000, start: false }
    )
    tween.start().update(0.5)
    equals(path.position, new Point(50, 25))
    equals(() => path.fillColor.toCSS(true), '#808080')
  })

  test('Tween#update() with relative values', () => {
    const path = new Path.Circle({
      center: [50, 25],
      radius: 10,
      opacity: 0.5
    })
    const tween = path.tween(
      { position: '+= [10, 0]', opacity: '-= 0.25' },
      { duration: 1000, start: false }
    )
    tween.start().update(1)
    equals(path.position, new Point(60, 25))
    equals(path.opacity, 0.25)
  })

  test('Tween.easings: sine, expo and circ easings', () => {
    // Expected values evaluated by hand from the easing formulas on
    // easings.net (Robert Penner's equations), at t = 0, 0.25, 0.5, 0.75, 1:
    const expected = {
      easeInSine: [0, 0.0761205, 0.2928932, 0.6173166, 1],
      easeOutSine: [0, 0.3826834, 0.7071068, 0.9238795, 1],
      easeInOutSine: [0, 0.1464466, 0.5, 0.8535534, 1],
      easeInExpo: [0, 0.0055243, 0.03125, 0.1767767, 1],
      easeOutExpo: [0, 0.8232233, 0.96875, 0.9944757, 1],
      easeInOutExpo: [0, 0.015625, 0.5, 0.984375, 1],
      easeInCirc: [0, 0.0317542, 0.1339746, 0.3385622, 1],
      easeOutCirc: [0, 0.6614378, 0.8660254, 0.9682458, 1],
      easeInOutCirc: [0, 0.0669873, 0.5, 0.9330127, 1]
    }
    Base.each(expected, (values, type) => {
      const easing = Tween.easings[type]
      for (let i = 0; i < values.length; i++) {
        const t = i / 4
        equals(easing(t), values[i], type + '(' + t + ')', {
          tolerance: 1e-6
        })
      }
    })
  })

  test('Tween with easing type easeInOutSine', () => {
    const path = new Path.Circle({ center: [0, 0], radius: 10 })
    const tween = path.tween(
      { position: [0, 0] },
      { position: [100, 0] },
      { duration: 1000, easing: 'easeInOutSine', start: false }
    )
    tween.start().update(0.25)
    // (1 - cos(PI / 4)) / 2 * 100:
    equals(path.position, new Point(14.6446609, 0))
  })

  test('Tween.easings: quad, cubic, quart and quint easings', () => {
    // Expected values evaluated by hand from the easing formulas, at t = 0,
    // 0.25, 0.5, 0.75, 1:
    const expected = {
      linear: [0, 0.25, 0.5, 0.75, 1],
      easeInQuad: [0, 0.0625, 0.25, 0.5625, 1],
      easeOutQuad: [0, 0.4375, 0.75, 0.9375, 1],
      easeInOutQuad: [0, 0.125, 0.5, 0.875, 1],
      easeInCubic: [0, 0.015625, 0.125, 0.421875, 1],
      easeOutCubic: [0, 0.578125, 0.875, 0.984375, 1],
      easeInOutCubic: [0, 0.0625, 0.5, 0.9375, 1],
      easeInQuart: [0, 0.00390625, 0.0625, 0.31640625, 1],
      easeOutQuart: [0, 0.68359375, 0.9375, 0.99609375, 1],
      easeInOutQuart: [0, 0.03125, 0.5, 0.96875, 1],
      easeInQuint: [0, 0.0009765625, 0.03125, 0.2373046875, 1],
      easeOutQuint: [0, 0.7626953125, 0.96875, 0.9990234375, 1],
      easeInOutQuint: [0, 0.015625, 0.5, 0.984375, 1]
    }
    Base.each(expected, (values, type) => {
      const easing = Tween.easings[type]
      for (let i = 0; i < values.length; i++) {
        const t = i / 4
        equals(easing(t), values[i], type + '(' + t + ')', {
          tolerance: 1e-9
        })
      }
    })
  })

  test('Tween with an easing function', () => {
    const path = new Path.Circle({ center: [0, 0], radius: 10 })
    const tween = path.tween(
      { position: [0, 0] },
      { position: [100, 0] },
      { duration: 1000, easing: t => t * t, start: false }
    )
    equals(tween.type, 'function')
    tween.start().update(0.5)
    equals(path.position, new Point(25, 0))
  })

  test('Tween#update() with relative numbers', () => {
    const path = new Path.Circle({ center: [0, 0], radius: 10, opacity: 0.2 })
    path
      .tween({ opacity: '+= 0.2' }, { duration: 1000, start: false })
      .start()
      .update(1)
    equals(path.opacity, 0.4)
    path
      .tween({ opacity: '*= 2' }, { duration: 1000, start: false })
      .start()
      .update(1)
    equals(path.opacity, 0.8)
    path
      .tween({ opacity: '/= 4' }, { duration: 1000, start: false })
      .start()
      .update(1)
    equals(path.opacity, 0.2)
    path
      .tween({ opacity: ['+=', 0.5] }, { duration: 1000, start: false })
      .start()
      .update(1)
    equals(path.opacity, 0.7)
  })

  test('Tween#onUpdate, #then() and #stop()', () => {
    const path = new Path.Circle({ center: [0, 0], radius: 10 })
    const tween = path.tween(
      { position: [0, 0] },
      { position: [100, 0] },
      { duration: 1000, start: false }
    )
    const updates = []
    let finished = null
    tween.onUpdate = event => updates.push([event.progress, event.factor])
    equals(tween.then(object => (finished = object)) === tween, true)
    tween.start().update(0.5)
    equals(finished, null)
    // Progress beyond the end finishes the tween:
    tween.update(1.5)
    equals(tween.running, false)
    equals(finished === path, true)
    equals(updates, [
      [0.5, 0.5],
      [1, 1]
    ])
    // Updates of stopped tweens change nothing:
    path.position = [0, 0]
    tween.start().stop().update(0.5)
    equals(path.position, new Point(0, 0))
    equals(updates.length, 2)
  })

  test('Item#tween() runs on the frames of the view', () => {
    const view = new Project().view
    const path = new Path.Circle({ center: [0, 0], radius: 10 })
    const tween = path.tween({ position: [0, 0] }, { position: [100, 0] }, 1000)
    equals(tween.running, true)
    // Play the frames that the view emits while animating:
    let time = 0
    for (let i = 0; i < 10 && tween.running; i++) {
      const delta = i ? 0.25 : 0
      view.emit('frame', new Base({ delta, time: (time += delta), count: i }))
    }
    equals(tween.running, false)
    equals(path.position, new Point(100, 0))
    equals(path.responds('frame'), false)
  })
})
