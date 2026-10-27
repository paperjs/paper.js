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
  test('Item#tween() counts its duration from the first frame', () => {
    const view = new Project().view
    const path = new Path.Circle({ center: [0, 0], radius: 10 })
    path.tween({ position: [0, 0] }, { position: [100, 0] }, 1000)
    // Play the frames that the view emits while animating, the first of
    // them at time 0:
    const positions = []
    for (let i = 0; i <= 4; i++) {
      view.emit('frame', new Base({ delta: i ? 0.25 : 0, time: i * 0.25 }))
      positions.push(path.position.x)
    }
    equals(positions, [0, 25, 50, 75, 100])
  })

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
})
