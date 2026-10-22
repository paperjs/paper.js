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

import { beforeAll, describe, expect, test } from 'vitest'
import paper, {
  CompoundPath,
  Path,
  Point,
  Project,
  Rectangle,
  Size
} from 'paper'
import { equals } from '../helpers.js'
import cases from '../offsetting/cases.json'
import known from '../offsetting/known.json'
import {
  caps,
  checkOutline,
  createPath,
  joins
} from '../offsetting/check.mjs'

describe('PathItem#offset() and #outline()', () => {
  beforeAll(() => {
    new Project(new Size(500, 500))
  })

  test('PathItem#offset() of closed paths', () => {
    const rect = new Path.Rectangle({ point: [0, 0], size: [100, 50] })
    equals(rect.offset(10).bounds, new Rectangle(-10, -10, 120, 70))
    equals(rect.offset(10).area, 120 * 70)
    // The corners are quarter circles:
    equals(
      rect.offset(10, { join: 'round' }).area,
      100 * 50 + 300 * 10 + Math.PI * 100,
      null,
      { tolerance: 0.5 }
    )
    equals(rect.offset(-10).bounds, new Rectangle(10, 10, 80, 30))
    equals(rect.offset(-30).isEmpty(), true)
    // Closed paths grow by positive distances, whichever way they run:
    rect.reverse()
    equals(rect.offset(10).area, 120 * 70)
  })

  test('PathItem#offset() of compound paths', () => {
    const path = new CompoundPath({
      children: [
        new Path.Rectangle([0, 0], [100, 100]),
        new Path.Rectangle([25, 25], [50, 50])
      ]
    })
    path.reorient()
    equals(path.offset(5).area, 110 * 110 - 40 * 40)
    equals(path.offset(-5).area, 90 * 90 - 60 * 60)
  })

  test('PathItem#offset() of open paths', () => {
    const line = new Path([0, 0], [100, 0])
    // Along the normals, and against them:
    equals(line.offset(10).pathData, 'M0,-10h100')
    equals(line.offset(-10).pathData, 'M0,10h100')
    // The outer side of the corner gets the join:
    const corner = new Path([0, 0], [50, 50], [100, 0])
    equals(corner.offset(-10).segments.length, 3)
    // A round join passes at the distance below the corner:
    const point = new Point(50, 60)
    equals(
      corner
        .offset(-10, { join: 'round' })
        .getNearestPoint(point)
        .getDistance(point),
      0,
      null,
      { tolerance: 0.01 }
    )
    // The inner side meets in the corner:
    const offset = corner.offset(10)
    equals(offset.segments.length, 3)
    equals(offset.segments[1].point, new Point(50, 50 - 10 * Math.SQRT2))
  })

  test('PathItem#outline()', () => {
    const line = new Path({
      segments: [[0, 0], [100, 0]],
      strokeColor: 'red',
      strokeWidth: 20
    })
    const outline = line.outline()
    equals(outline.bounds, new Rectangle(0, -10, 100, 20))
    equals(outline.fillColor, line.strokeColor)
    equals(outline.strokeColor, null)
    equals(outline.index, line.index + 1)
    equals(line.outline({ insert: false }).parent, null)
    equals(
      line.outline({ width: 10, cap: 'square' }).bounds,
      new Rectangle(-5, -5, 110, 10)
    )
    const circle = new Path.Circle({
      center: [200, 200],
      radius: 50,
      strokeColor: 'black',
      strokeWidth: 10
    })
    equals(circle.outline().area, Math.PI * (55 * 55 - 45 * 45), null, {
      tolerance: 1
    })
  })
})

// The outlines of the strokes of the cases in test/offsetting/cases.json, at
// one width. The ones in known.json are expected to fail, until they're fixed.
// test/offsetting/sweep.mjs checks all widths, and fuzz.mjs finds new cases.
describe('PathItem offsetting', () => {
  beforeAll(() => {
    new Project(new Size(2000, 2000))
  })

  const strokeWidth = 62
  for (const entry of cases) {
    for (const strokeJoin of joins) {
      for (const strokeCap of caps) {
        const key = `${entry.name} / ${strokeJoin} ${strokeCap} ${strokeWidth}`
        ;(key in known ? test.fails : test)(key, () => {
          const path = createPath(paper, entry, {
            strokeWidth,
            strokeJoin,
            strokeCap
          })
          expect(checkOutline(paper, path)).toEqual([])
        })
      }
    }
  }
})
