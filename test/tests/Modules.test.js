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
import {
  contains,
  exclude,
  intersect,
  split,
  subtract,
  unite
} from '../../src/boolean/index.ts'
import { offset, offsetPath, outline } from '../../src/offset/index.ts'
import { getArea, getBounds } from '../../src/data/region.ts'
import { equals, isNodeContext, test } from '../helpers.js'

// The entries paper/boolean and paper/offset, on plain descriptions of paths
// only:
describe('paper/boolean and paper/offset', () => {
  const square = (x, y, size) => ({
    paths: [
      {
        segments: [[x, y], [x + size, y], [x + size, y + size], [x, y + size]],
        closed: true
      }
    ],
    fillRule: 'nonzero'
  })
  const getTotalArea = region =>
    Math.abs(region.paths.reduce((sum, path) => sum + getArea(path), 0))
  const getRect = region => {
    const { x, y, width, height } = getBounds(region)
    return [x, y, width, height]
  }
  const a = square(0, 0, 100)
  const b = square(50, 0, 100)
  const c = square(25, 50, 100)

  test('unite(), subtract(), intersect() and exclude()', () => {
    equals(getTotalArea(unite([a, b])), 15000)
    equals(getTotalArea(subtract(a, b)), 5000)
    equals(getTotalArea(subtract(a, [b, c])), 3750, 'the union of others')
    equals(getTotalArea(intersect(a, b)), 5000)
    equals(getTotalArea(intersect(a, [b, c])), 2500, 'all of them')
    equals(getTotalArea(exclude(a, b)), 10000)
  })

  test('contains()', () => {
    equals(contains(a, [50, 50]), true)
    equals(contains(a, [150, 50]), false)
    equals(contains(a, [100, 50]), true, 'on the outline')
  })

  test('split()', () => {
    const line = { segments: [[-50, 50], [150, 50]], closed: false }
    const { inside, outside } = split([line], a)
    const getPoints = paths =>
      paths.map(({ segments }) => segments.map(([point]) => point))
    equals(getPoints(inside), [[[0, 50], [100, 50]]])
    equals(getPoints(outside), [
      [[-50, 50], [0, 50]],
      [[100, 50], [150, 50]]
    ])
  })

  test('offset(), offsetPath() and outline()', () => {
    equals(getRect(offset(a, 10)), [-10, -10, 120, 120])
    equals(getRect(offset(a, -10)), [10, 10, 80, 80])
    const line = { segments: [[0, 0], [100, 0]], closed: false }
    equals(
      offsetPath(line, 10).map(({ segments }) =>
        segments.map(([point]) => point)
      ),
      [[[0, -10], [100, -10]]]
    )
    equals(getRect(outline([line], { width: 20 })), [0, -10, 100, 20])
    equals(
      getRect(outline([line], { width: 20, cap: 'square' })),
      [-10, -10, 120, 20]
    )
  })

  // Bundling needs Node's file system:
  if (isNodeContext) {
    test('The bundles of the entries leave out the scene graph', async () => {
      const { build } = await import('rolldown')
      for (const name of ['boolean', 'offset']) {
        const { output } = await build({
          input: new URL(`../../src/${name}/index.ts`, import.meta.url)
            .pathname,
          write: false,
          output: { format: 'es' }
        })
        const classes = output[0].code.match(/\bclass [A-Z]\w*/g) ?? []
        equals(
          classes.filter(name =>
            /\b(Item|Path|Project|PaperScope|View|Style)$/.test(name)
          ),
          [],
          name
        )
      }
    })
  }
})
