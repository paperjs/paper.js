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

  test('new Segment(object) with name and data', () => {
    const segment = new Segment({
      point: [10, 10],
      name: 'corner',
      data: { isCorner: true }
    })
    equals(segment.name, 'corner')
    equals(segment.data, { isCorner: true })
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

  test('segment.clone() with name and data', () => {
    const segment = new Segment({
      point: [10, 10],
      name: 'corner',
      data: { isCorner: true }
    })
    const clone = segment.clone()
    equals(clone.name, 'corner')
    equals(clone.data, { isCorner: true })
    equals(() => clone.data !== segment.data, true)
  })

  test('new Segment(segment) with name and data', () => {
    const segment = new Segment({
      point: [10, 10],
      name: 'corner',
      data: { isCorner: true }
    })
    const copy = new Segment(segment)
    equals(copy.name, 'corner')
    equals(copy.data, { isCorner: true })
    equals(() => copy.data !== segment.data, true)
    const plain = new Segment([10, 10])
    new Segment(plain)
    // The copy must not create the data on the source, which is internal:
    equals(() => plain._data, undefined)
  })

  test('segment.name and segment.data in JSON', () => {
    const path = new Path(
      [10, 10],
      new Segment([50, 10], [-10, 0], [10, 0]),
      [50, 50]
    )
    const json = path.exportJSON()
    path.segments[1].name = 'corner'
    path.segments[2].data.isCorner = true
    path.segments[2].data.point = new Point(5, 5)
    const copy = new Path().importJSON(path.exportJSON())
    equals(copy.segments[1].name, 'corner')
    equals(copy.segments[1].handleIn, new Point(-10, 0))
    equals(copy.segments[2].data, { isCorner: true, point: new Point(5, 5) })
    equals(copy.segments[2].point, new Point(50, 50))
    const segment = new Segment().importJSON(path.segments[1].exportJSON())
    equals(segment.name, 'corner')
    equals(segment.handleOut, new Point(10, 0))
    path.segments[1].name = null
    path.segments[2].data = {}
    equals(
      path.exportJSON(),
      json,
      'unnamed segments without data keep their JSON'
    )
  })

  test('segment.name consisting only of numbers', () => {
    const path = new Path([10, 10], [50, 10])
    expect(() => {
      path.segments[1].name = '0'
    }).toThrow('Names consisting only of numbers are not supported.')
    expect(() => new Segment({ point: [10, 10], name: '1' })).toThrow(
      'Names consisting only of numbers are not supported.'
    )
    equals(() => path.segments[0] === path.firstSegment, true)
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
