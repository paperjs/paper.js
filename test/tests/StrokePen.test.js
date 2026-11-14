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
  createPen,
  getContacts,
  getPenSegments
} from '../../src/offset/pen.ts'
import { Point } from '../../src/internal.ts'
import { equals, test } from '../helpers.js'

// The pens of stroke profiles on the values of curves, without any path:
describe('Stroke pen', () => {
  // A line of the length 100 along the x-axis:
  const line = [0, 0, 0, 0, 100, 0, 100, 0]
  const getPoints = contacts => contacts.map(({ point }) => [point.x, point.y])

  test('getContacts() of a round pen', () => {
    const pen = createPen(
      { width: [1, 0, 0], aspect: [1, 0, 0], angle: [0, 0, 0] },
      10
    )
    const { sides, strips } = getContacts(line, 0.5, pen)
    equals(getPoints(sides), [[50, 10], [50, -10]], 'across the line')
    equals(strips.length, 1, 'one strip between the sides')
  })

  test('getContacts() of a pen that shrinks', () => {
    // By 0.1 per length, so its circle touches the sides of the stroke that
    // far behind its center, at the sine of their slope:
    const pen = createPen(
      { width: [1, -0.01, 0], aspect: [1, 0, 0], angle: [0, 0, 0] },
      10
    )
    const y = 10 * Math.sqrt(1 - 0.1 * 0.1)
    equals(getPoints(getContacts(line, 0.5, pen).sides), [[51, y], [51, -y]])
  })

  test('getContacts() of a flat pen along its direction', () => {
    const pen = createPen(
      { width: [1, 0, 0], aspect: [0.5, 0, 0], angle: [0, 0, 0] },
      10
    )
    equals(getPoints(getContacts(line, 0.5, pen).sides), [[50, 5], [50, -5]])
  })

  test('getContacts() of a pen without a width', () => {
    const pen = createPen(
      { width: [0, 0, 0], aspect: [1, 0, 0], angle: [0, 0, 0] },
      10
    )
    equals(getContacts(line, 0.5, pen), { sides: null, strips: [] })
    equals(getPenSegments(new Point(50, 0), pen), [])
  })

  test('getPenSegments()', () => {
    const pen = createPen(
      { width: [1, 0, 0], aspect: [0.5, 0, 0], angle: [90, 0, 0] },
      10
    )
    const segments = getPenSegments(new Point(50, 0), pen)
    equals(
      segments.map(([point]) => point),
      [[50, 10], [45, 0], [50, -10], [55, 0]],
      'the ellipse, turned by its angle'
    )
  })
})
