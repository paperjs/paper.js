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
import { Path, Point, Segment, Size } from 'paper'
import { equals, test } from '../helpers.js'

describe('Segment', () => {
  test('new Segment()', () => {
    const segment = new Segment(null, null, null)
    equals(segment.toString(), '{ point: { x: 0, y: 0 } }')
  })

  test('new Segment(point)', () => {
    const segment = new Segment(new Point(10, 10))
    equals(segment.toString(), '{ point: { x: 10, y: 10 } }')
  })

  test('new Segment(x, y)', () => {
    const segment = new Segment(10, 10)
    equals(segment.toString(), '{ point: { x: 10, y: 10 } }')
  })

  test('new Segment(undefined)', () => {
    const segment = new Segment(undefined)
    equals(segment.toString(), '{ point: { x: 0, y: 0 } }')
  })

  test('new Segment(object)', () => {
    const segment = new Segment({
      point: { x: 10, y: 10 },
      handleIn: { x: 5, y: 5 },
      handleOut: { x: 15, y: 15 }
    })
    equals(
      segment.toString(),
      '{ point: { x: 10, y: 10 }, handleIn: { x: 5, y: 5 }, handleOut: { x: 15, y: 15 } }'
    )
  })

  test('new Segment(point, handleIn, handleOut)', () => {
    const segment = new Segment(
      new Point(10, 10),
      new Point(5, 5),
      new Point(15, 15)
    )
    equals(
      segment.toString(),
      '{ point: { x: 10, y: 10 }, handleIn: { x: 5, y: 5 }, handleOut: { x: 15, y: 15 } }'
    )
  })

  test('new Segment(null, null, null)', () => {
    const segment = new Segment(null, null, null)
    equals(segment.toString(), '{ point: { x: 0, y: 0 } }')
  })

  test('new Segment(undefined, null, null)', () => {
    const segment = new Segment(undefined, null, null)
    equals(segment.toString(), '{ point: { x: 0, y: 0 } }')
  })

  test('new Segment(x, y, inX, inY, outX, outY)', () => {
    const segment = new Segment(10, 10, 5, 5, 15, 15)
    equals(
      segment.toString(),
      '{ point: { x: 10, y: 10 }, handleIn: { x: 5, y: 5 }, handleOut: { x: 15, y: 15 } }'
    )
  })

  test('new Segment(size)', () => {
    const segment = new Segment(new Size(10, 10))
    equals(segment.toString(), '{ point: { x: 10, y: 10 } }')
  })

  test('segment.reverse()', () => {
    const segment = new Segment(
      new Point(10, 10),
      new Point(5, 5),
      new Point(15, 15)
    )
    segment.reverse()
    equals(
      segment.toString(),
      '{ point: { x: 10, y: 10 }, handleIn: { x: 15, y: 15 }, handleOut: { x: 5, y: 5 } }'
    )
  })

  test('segment.clone()', () => {
    const segment = new Segment(
      new Point(10, 10),
      new Point(5, 5),
      new Point(15, 15)
    )
    const clone = segment.clone()
    equals(() => segment === clone, false)

    equals(() => segment.toString(), clone.toString())
  })

  test('segment.remove()', () => {
    const path = new Path([10, 10], [5, 5], [10, 10])
    path.segments[1].remove()
    equals(
      path.segments.toString(),
      '{ point: { x: 10, y: 10 } },{ point: { x: 10, y: 10 } }'
    )
  })

  test('segment.selected', () => {
    const path = new Path([10, 20], [50, 100])
    path.segments[0].point.selected = true
    equals(() => path.segments[0].point.selected, true)
    path.segments[0].point.selected = false
    equals(() => path.segments[0].point.selected, false)
  })
})
