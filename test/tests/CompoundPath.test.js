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

import { describe, expect } from 'vitest'
import { Color, CompoundPath, Path, Point, Rectangle } from 'paper'
import { equals, test } from '../helpers.js'

describe('Compound Path', () => {
  test('CompoundPath#simplify() without children', () => {
    equals(() => new CompoundPath().simplify(), false)
  })

  test('moveTo() / lineTo()', () => {
    const path = new CompoundPath()

    const lists = [
      [
        new Point(279, 151),
        new Point(149, 151),
        new Point(149, 281),
        new Point(279, 281)
      ],
      [
        new Point(319, 321),
        new Point(109, 321),
        new Point(109, 111),
        new Point(319, 111)
      ]
    ]

    for (let i = 0; i < lists.length; i++) {
      const list = lists[i]
      for (let j = 0; j < list.length; j++) {
        path[!j ? 'moveTo' : 'lineTo'](list[j])
      }
    }

    path.fillColor = 'black'

    equals(() => path.children.length, 2)
  })

  test('CompoundPath#reduce() with a single child keeps its attributes', () => {
    const compound = new CompoundPath({
      children: [new Path.Rectangle([0, 0], [10, 10])],
      fillColor: 'red',
      strokeWidth: 3,
      opacity: 0.5,
      name: 'single'
    })
    const result = compound.reduce()
    equals(() => result instanceof Path, true)
    equals(() => result.fillColor, new Color('red'))
    equals(() => result.strokeWidth, 3)
    equals(() => result.opacity, 0.5)
    equals(() => result.name, 'single')
    equals(() => compound.parent, null)
  })

  test('CompoundPath#reorient()', () => {
    const path1 = new Path.Rectangle([300, 300], [100, 100])
    const path2 = new Path.Rectangle([50, 50], [200, 200])
    const path3 = new Path.Rectangle([0, 0], [500, 500])

    equals(() => path1.clockwise, true)
    equals(() => path2.clockwise, true)
    equals(() => path3.clockwise, true)

    const compound = new CompoundPath({
      children: [path1, path2, path3]
    }).reorient()

    equals(() => compound.lastChild === path3, true)
    equals(() => compound.firstChild === path1, true)
    equals(() => path1.clockwise, false)
    equals(() => path2.clockwise, false)
    equals(() => path3.clockwise, true)
  })

  test('new CompoundPath(segments)', () => {
    const compound = new CompoundPath([
      [0, 0],
      [10, 0],
      [10, 10]
    ])
    equals(() => compound.children.length, 1)
    equals(() => compound.firstChild.segments.length, 3)
  })

  test('new CompoundPath(segmentLists)', () => {
    const compound = new CompoundPath([
      [
        [0, 0],
        [10, 0]
      ],
      [
        [20, 0],
        [30, 0]
      ]
    ])
    equals(() => compound.children.length, 2)
    equals(() => compound.lastChild.firstSegment.point, new Point(20, 0))
  })

  test('new CompoundPath(items) with a compound path', () => {
    const inner = new CompoundPath({
      children: [
        new Path.Rectangle([0, 0], [10, 10]),
        new Path.Rectangle([2, 2], [5, 5])
      ]
    })
    const compound = new CompoundPath([inner, new Path.Circle([50, 50], 5)])
    // The children of the inner compound path move up, and it is removed:
    equals(() => compound.children.length, 3)
    equals(() => inner.children.length, 0)
    equals(() => inner.parent, null)
  })

  test('CompoundPath#reduce() with empty children', () => {
    const compound = new CompoundPath({
      children: [new Path(), new Path.Rectangle([0, 0], [10, 10]), new Path()]
    })
    const result = compound.reduce()
    equals(() => result instanceof Path, true)
    equals(() => result.bounds, new Rectangle(0, 0, 10, 10))
    equals(() => compound.parent, null)
  })

  test('CompoundPath#reduce() without any children', () => {
    const compound = new CompoundPath({
      children: [new Path(), new Path()],
      fillColor: 'red',
      name: 'empty'
    })
    const result = compound.reduce()
    equals(() => result instanceof Path, true)
    equals(() => result.isEmpty(), true)
    equals(() => result.fillColor, new Color('red'))
    equals(() => result.name, 'empty')
    equals(() => result.index, 0)
    equals(() => compound.parent, null)
  })

  test('CompoundPath#reduce() with several children', () => {
    const compound = new CompoundPath({
      children: [
        new Path.Rectangle([0, 0], [10, 10]),
        new Path.Rectangle([20, 0], [10, 10])
      ]
    })
    equals(() => compound.reduce() === compound, true)
    equals(() => compound.children.length, 2)
  })

  test('CompoundPath#closed', () => {
    const compound = new CompoundPath({
      children: [
        new Path([
          [0, 0],
          [10, 0]
        ]),
        new Path.Rectangle([20, 0], [10, 10])
      ]
    })
    equals(() => compound.closed, false)
    compound.closed = true
    equals(() => compound.closed, true)
    equals(() => compound.firstChild.closed, true)
  })

  test('CompoundPath#firstSegment / #lastSegment / #firstCurve / #lastCurve', () => {
    const compound = new CompoundPath({
      children: [
        new Path([
          [0, 0],
          [10, 0]
        ]),
        new Path([
          [20, 0],
          [30, 0],
          [30, 10]
        ])
      ]
    })
    equals(() => compound.firstSegment.point, new Point(0, 0))
    equals(() => compound.lastSegment.point, new Point(30, 10))
    equals(() => compound.firstCurve.point2, new Point(10, 0))
    equals(() => compound.lastCurve.point1, new Point(30, 0))
    equals(() => compound.curves.length, 3)
  })

  test('CompoundPath#firstSegment / #lastSegment / #firstCurve / #lastCurve without children', () => {
    const compound = new CompoundPath()
    equals(() => compound.firstSegment, null)
    equals(() => compound.lastSegment, null)
    equals(() => compound.firstCurve, null)
    equals(() => compound.lastCurve, null)
  })

  test('CompoundPath#moveBy()', () => {
    const compound = new CompoundPath()
    compound.moveTo([10, 10])
    compound.lineBy([5, 0])
    compound.moveBy([10, 10])
    compound.lineBy([0, 5])
    equals(() => compound.children.length, 2)
    equals(() => compound.pathData, 'M10,10h5M25,20v5')
  })

  test('CompoundPath drawing commands without moveTo()', () => {
    const compound = new CompoundPath()
    expect(() => compound.lineTo([10, 10])).toThrow(
      'Use a moveTo() command first'
    )
    expect(() => compound.moveBy([10, 10])).toThrow(
      'Use a moveTo() command first'
    )
  })

  test('CompoundPath#reverse()', () => {
    const compound = new CompoundPath({
      children: [
        new Path.Rectangle([0, 0], [10, 10]),
        new Path.Circle([50, 50], 5)
      ]
    })
    compound.reverse()
    equals(() => compound.firstChild.clockwise, false)
    equals(() => compound.lastChild.clockwise, false)
  })

  test('CompoundPath#flatten()', () => {
    const compound = new CompoundPath({
      children: [
        new Path.Rectangle([0, 0], [10, 10]),
        new Path.Circle([50, 50], 50)
      ]
    })
    compound.flatten(1)
    equals(() => compound.firstChild.segments.length, 4)
    equals(
      () => compound.lastChild.curves.every(curve => curve.isStraight()),
      true
    )
  })

  test('CompoundPath#simplify()', () => {
    const compound = new CompoundPath({
      children: [
        new Path([
          [0, 0],
          [1, 1],
          [2, 2.1],
          [3, 3],
          [4, 4.1]
        ]),
        new Path([
          [0, 10],
          [5, 10]
        ])
      ]
    })
    equals(() => compound.simplify(), true)
    equals(() => compound.firstChild.segments.length, 2)
  })

  test('CompoundPath#smooth()', () => {
    const compound = new CompoundPath({
      children: [
        new Path([
          [0, 0],
          [10, 5],
          [20, 0]
        ])
      ]
    })
    compound.smooth()
    equals(() => compound.firstChild.segments[1].handleIn.isZero(), false)
  })
})
