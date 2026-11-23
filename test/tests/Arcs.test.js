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

import { describe, expect } from 'vitest'
import {
  getArcAround,
  getArcThrough,
  getArcTowards,
  getEllipticArc
} from '../../src/values/arcs.ts'
import { KAPPA } from '../../src/util/numerical.ts'
import { Path, Point, Size } from '../../src/internal.ts'
import { equals, test } from '../helpers.js'

// Arcs as plain segments, without any path:
describe('Arcs', () => {
  const handle = 50 * KAPPA
  const halfCircle = [
    [[-50, 0], [0, 0], [0, -handle]],
    [[0, -50], [-handle, 0], [handle, 0]],
    [[50, 0], [0, -handle], [0, 0]]
  ]
  const line = [
    [[-50, 0], [0, 0], [0, 0]],
    [[50, 0], [0, 0], [0, 0]]
  ]
  const from = new Point(-50, 0)
  const to = new Point(50, 0)

  test('getArcThrough()', () => {
    equals(getArcThrough(from, new Point(0, -50), to), halfCircle)
    equals(getArcThrough(from, new Point(0, 0), to), line, 'collinear points')
  })

  test('getArcAround()', () => {
    equals(getArcAround(from, new Point(0, 0), 180), halfCircle)
    equals(getArcAround(from, new Point(0, 0), 0), [], 'no angle')
  })

  test('getArcTowards()', () => {
    equals(getArcTowards(from, new Point(0, -1), to), halfCircle)
    equals(getArcTowards(from, new Point(1, 0), to), line, 'straight ahead')
    expect(() => getArcTowards(from, new Point(-1, 0), to)).toThrow()
  })

  test('getEllipticArc()', () => {
    const radius = new Size(50, 50)
    equals(getEllipticArc(from, to, radius, 0, true, false), halfCircle)
    equals(
      getEllipticArc(from, to, new Size(0, 50), 0, true, false),
      line,
      'without a radius'
    )
    equals(getEllipticArc(from, from, radius, 0, true, false), [], 'no arc')
  })

  test('Path#arcTo() of a straight arc', () => {
    const path = new Path({ segments: [[[-50, 0], null, [0, -20]]] })
    path.arcTo([0, 0], [50, 0])
    equals(path.segments.length, 2)
    equals(path.firstSegment.handleOut, new Point(0, 0), 'a straight line')
  })
})
