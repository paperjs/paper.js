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
import { createGraph, traceGraph } from '../../src/boolean/graph.ts'
import { splitGraph } from '../../src/boolean/split.ts'
import { uniteRegions } from '../../src/boolean/operations.ts'
import { getSegments, reduceRegion } from '../../src/boolean/region.ts'
import { equals, test } from '../helpers.js'

// The graph of the boolean operations on plain descriptions of paths, without
// any path items:
describe('Boolean graph', () => {
  function createSquare(x, y, size) {
    return {
      fillRule: 'nonzero',
      paths: [
        {
          closed: true,
          segments: [
            [x, y],
            [x + size, y],
            [x + size, y + size],
            [x, y + size]
          ]
        }
      ]
    }
  }

  const getPoints = path => path.segments.map(([point]) => point)

  test('traceGraph() unites and intersects two squares', () => {
    const operands = [createSquare(0, 0, 100), createSquare(50, 50, 100)]
    const united = traceGraph(operands, (a, b) => a || b)
    equals(united.length, 1)
    equals(getPoints(united[0]), [
      [0, 0],
      [100, 0],
      [100, 50],
      [150, 50],
      [150, 150],
      [50, 150],
      [50, 100],
      [0, 100]
    ])
    const intersected = traceGraph(operands, (a, b) => a && b)
    equals(getPoints(intersected[0]), [
      [100, 50],
      [100, 100],
      [50, 100],
      [50, 50]
    ])
  })

  test('traceGraph() tells where each piece comes from', () => {
    const [path] = traceGraph(
      [createSquare(0, 0, 100), createSquare(50, 50, 100)],
      (a, b) => a && !b
    )
    equals(getPoints(path), [
      [0, 0],
      [100, 0],
      [100, 50],
      [50, 50],
      [50, 100],
      [0, 100]
    ])
    // Along the first square, then backwards along two sides of the second:
    equals(
      path.sources.map(source => [
        source.operand,
        source.curve,
        source.time1,
        source.time2
      ]),
      [
        [0, 0, 0, 1],
        [0, 1, 0, 0.5],
        [1, 0, 0.5, 0],
        [1, 3, 1, 0.5],
        [0, 2, 0.5, 1],
        [0, 3, 0, 1]
      ]
    )
  })

  test('traceGraph() reads handles and fill rules', () => {
    // A circle of radius 25 around [50, 50], in a square that runs the same
    // way around:
    const k = 25 * 0.5522847498307936
    const circle = {
      closed: true,
      segments: [
        [[25, 50], [0, k], [0, -k]],
        [[50, 25], [-k, 0], [k, 0]],
        [[75, 50], [0, -k], [0, k]],
        [[50, 75], [k, 0], [-k, 0]]
      ]
    }
    const [square] = createSquare(0, 0, 100).paths
    const resolve = fillRule =>
      traceGraph([{ fillRule, paths: [square, circle] }], inside => inside)
    equals(resolve('nonzero').length, 1, 'filled all through')
    const paths = resolve('evenodd')
    equals(paths.length, 2, 'the circle is a hole')
    // It runs the other way around then, from where it started second:
    equals(paths[1].segments[0], [
      [50, 25],
      [k, 0],
      [-k, 0]
    ])
  })

  test('traceGraph() reads all forms of segments', () => {
    const k = 25 * 0.5522847498307936
    const points = [
      [25, 50],
      [50, 25],
      [75, 50],
      [50, 75]
    ]
    const handles = [
      [0, k],
      [-k, 0],
      [0, -k],
      [k, 0]
    ]
    const resolve = segments =>
      traceGraph(
        [{ fillRule: 'nonzero', paths: [{ closed: true, segments }] }],
        inside => inside
      )[0].segments
    // A point with its handles, and their coordinates in a row:
    const circle = resolve(
      points.map(([x, y], i) => [
        [x, y],
        handles[i],
        [-handles[i][0], -handles[i][1]]
      ])
    )
    equals(circle[1], [
      [50, 25],
      [-k, 0],
      [k, 0]
    ])
    equals(
      resolve(
        points.map(([x, y], i) => [
          x,
          y,
          ...handles[i],
          -handles[i][0],
          -handles[i][1]
        ])
      ),
      circle
    )
    // Handles that are left out or null, as JSON has them:
    const polygon = resolve(points)
    equals(polygon[1], [
      [50, 25],
      [0, 0],
      [0, 0]
    ])
    equals(resolve(points.map(point => [point])), polygon)
    equals(resolve(points.map(point => [point, null, null])), polygon)
  })

  test('createGraph() measures open and empty paths', () => {
    // A curve whose start lies beyond its other points:
    const segments = [
      [
        [1000, 0],
        [0, 0],
        [-2000, 0]
      ],
      [0, 10]
    ]
    const getEpsilon = closed =>
      createGraph([{ fillRule: 'nonzero', paths: [{ closed, segments }] }])
        .epsilon
    equals(getEpsilon(false), getEpsilon(true))
    equals(
      createGraph([{ fillRule: 'nonzero', paths: [] }]).epsilon < 1e-9,
      true,
      'without paths'
    )
  })

  test('reduceRegion() removes curves without length and along a line', () => {
    const reduce = segments =>
      reduceRegion({
        fillRule: 'nonzero',
        paths: [{ closed: true, segments }]
      }).paths.map(getPoints)
    // A square with a point in the middle of a side, and one twice:
    equals(
      reduce([
        [0, 0],
        [50, 0],
        [100, 0],
        [100, 100],
        [100, 100],
        [0, 100]
      ]),
      [
        [
          [0, 0],
          [100, 0],
          [100, 100],
          [0, 100]
        ]
      ]
    )
    // Curves stay, and paths without any segments left go:
    const k = 20
    const curved = [
      [[0, 0], [0, 0], [k, 0]],
      [[50, 0], [-k, 0], [k, 0]],
      [[100, 0], [-k, 0], [0, 0]],
      [50, 80]
    ]
    equals(reduce(curved)[0].length, 4)
    equals(reduce([[10, 10]]), [])
  })

  test('uniteRegions() unites many regions and resolves one', () => {
    // Three squares in a row that overlap by half, and one apart:
    const united = uniteRegions([
      createSquare(0, 0, 100),
      createSquare(50, 0, 100),
      createSquare(100, 0, 100),
      createSquare(300, 0, 100)
    ])
    equals(united.fillRule, 'nonzero')
    equals(united.paths.map(getPoints), [
      [
        [0, 0],
        [200, 0],
        [200, 100],
        [0, 100]
      ],
      [
        [300, 0],
        [400, 0],
        [400, 100],
        [300, 100]
      ]
    ])
    // A square that runs around twice is resolved to once:
    const [square] = createSquare(0, 0, 100).paths
    const twice = {
      fillRule: 'nonzero',
      paths: [
        { closed: true, segments: [...square.segments, ...square.segments] }
      ]
    }
    equals(uniteRegions([twice]).paths.map(getPoints), [
      [
        [0, 0],
        [100, 0],
        [100, 100],
        [0, 100]
      ]
    ])
  })

  test('splitGraph() of lines crossing, touching and along a square', () => {
    const square = createSquare(0, 0, 100)
    const getPieces = (paths, region = square) =>
      splitGraph(paths, region).map(piece => [
        getSegments(piece).map(([point]) => point),
        piece.isInside,
        piece.isWhole
      ])
    // A line that crosses the square, in its order along the line:
    equals(
      getPieces([{ segments: [[-50, 50], [150, 50]], closed: false }]),
      [
        [[[-50, 50], [0, 50]], false, false],
        [[[0, 50], [100, 50]], true, false],
        [[[100, 50], [150, 50]], false, false]
      ]
    )
    // A line that only touches it is not split:
    equals(
      getPieces([{ segments: [[-50, 0], [0, 0], [-50, -50]], closed: false }]),
      [[[[-50, 0], [0, 0], [-50, -50]], false, true]]
    )
    // A line along its edge lies inside, but is split from the rest:
    equals(
      getPieces([{ segments: [[-50, 0], [50, 0]], closed: false }]),
      [
        [[[-50, 0], [0, 0]], false, false],
        [[[0, 0], [50, 0]], true, false]
      ]
    )
    // An open path of the region is filled as if closed by a straight line:
    const triangle = {
      fillRule: 'nonzero',
      paths: [{ segments: [[0, 0], [100, 0], [100, 100]], closed: false }]
    }
    equals(
      getPieces([{ segments: [[60, 20], [60, 80]], closed: false }], triangle),
      [
        [[[60, 20], [60, 60]], true, false],
        [[[60, 60], [60, 80]], false, false]
      ]
    )
  })
})
