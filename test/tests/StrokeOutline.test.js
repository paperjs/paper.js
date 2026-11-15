/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2026, Jürg Lehni & Jonathan Puckey
 * http://juerglehni.com/ & https://puckey.studio/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

import { describe } from 'vitest'
import { outlineStroke } from '../../src/offset/outline.ts'
import { offsetPath, offsetRegion } from '../../src/offset/offset.ts'
import { getArea, getBounds } from '../../src/boolean/region.ts'
import { equals, test } from '../helpers.js'

// The outlines of strokes on plain descriptions of paths, without any path
// items:
describe('Stroke outline', () => {
  const line = { segments: [[0, 0], [100, 0]], closed: false }
  const getRect = region => {
    const { x, y, width, height } = getBounds(region)
    return [x, y, width, height]
  }

  test('outlineStroke() of a line', () => {
    const butt = outlineStroke([line], 10, 'miter', 'butt', 10)
    equals(butt.paths.length, 1)
    equals(getRect(butt), [0, -10, 100, 20])
    equals(Math.abs(getArea(butt.paths[0])), 2000)
    const square = outlineStroke([line], 10, 'miter', 'square', 10)
    equals(getRect(square), [-10, -10, 120, 20])
    const round = outlineStroke([line], 10, 'miter', 'round', 10)
    equals(getRect(round), [-10, -10, 120, 20])
    equals(
      Math.abs(getArea(round.paths[0])),
      2000 + Math.PI * 100,
      'with the area of both caps',
      { tolerance: 0.1 }
    )
  })

  test('outlineStroke() of a closed path', () => {
    const square = {
      segments: [[0, 0], [100, 0], [100, 100], [0, 100]],
      closed: true
    }
    const { paths } = outlineStroke([square], 10, 'miter', 'butt', 10)
    equals(paths.length, 2, 'the outer and the inner outline')
    equals(
      paths.map(path => Math.abs(getArea(path))).sort((a, b) => a - b),
      [80 * 80, 120 * 120]
    )
  })

  test('outlineStroke() with pens', () => {
    // A pen of half the width in the middle, in straight lines between:
    const pens = {
      offsets: [0, 50, 100],
      getValues: offset => {
        const slope = offset < 50 ? -0.01 : 0.01
        return {
          width: [1 - 0.5 * (1 - Math.abs(offset - 50) / 50), slope, 0],
          aspect: [1, 0, 0],
          angle: [0, 0, 0]
        }
      }
    }
    const region = outlineStroke([{ ...line, pens }], 10, 'miter', 'butt', 10)
    equals(region.paths.length, 1)
    // The pen shrinks by 0.1 per length, so its circle touches the sides
    // of the stroke that far behind its center, at the sine of their slope:
    const x = 10 * 0.1
    const y = 10 * Math.sqrt(1 - 0.1 * 0.1)
    equals(getRect(region), [x, -y, 100 - 2 * x, 2 * y], null, {
      tolerance: 1e-6
    })
  })

  test('outlineStroke() without paths', () => {
    equals(outlineStroke([], 10, 'miter', 'butt', 10).paths, [])
  })

  test('offsetRegion() of a square', () => {
    const square = {
      paths: [
        {
          segments: [[0, 0], [100, 0], [100, 100], [0, 100]],
          closed: true
        }
      ],
      fillRule: 'nonzero'
    }
    const grown = offsetRegion(square, 10, 'miter', 10)
    equals(getRect(grown), [-10, -10, 120, 120])
    equals(Math.abs(getArea(grown.paths[0])), 120 * 120)
    const shrunk = offsetRegion(square, -10, 'miter', 10)
    equals(getRect(shrunk), [10, 10, 80, 80])
    equals(Math.abs(getArea(shrunk.paths[0])), 80 * 80)
    equals(offsetRegion(square, 0, 'miter', 10), square, 'without a distance')
  })

  test('offsetPath() of a line', () => {
    // The normals of a line to the right point up, to negative y, and a
    // positive distance moves it to their side:
    const getLines = paths =>
      paths.map(({ segments, closed }) => [
        segments.map(([point]) => point),
        closed
      ])
    equals(getLines(offsetPath(line, 10, 'miter', 10)), [
      [[[0, -10], [100, -10]], false]
    ])
    equals(getLines(offsetPath(line, -10, 'miter', 10)), [
      [[[0, 10], [100, 10]], false]
    ])
  })
})
