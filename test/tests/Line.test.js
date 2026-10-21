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
import { Line, Point } from 'paper'
import { equals, test } from '../helpers.js'

describe('Line', () => {
  test('new Line(10, 20, 30, 40)', () => {
    const line = new Line(10, 20, 30, 40)
    equals(line.point, new Point(10, 20), 'line.point')
    equals(line.vector, new Point(20, 20), 'line.vector')
  })

  test('new Line(10, 20, 30, 40, true)', () => {
    const line = new Line(10, 20, 30, 40, true)
    equals(line.point, new Point(10, 20), 'line.point')
    equals(line.vector, new Point(30, 40), 'line.vector')
  })

  test('getDistance()', () => {
    equals(
      () => new Line(10, 20, 20, 10, true).getDistance(new Point(20, 10)),
      13.416407864998737
    )
    equals(
      () => new Line(10, 20, -20, -10, true).getDistance(new Point(20, 10)),
      13.416407864998737
    )
    equals(
      () => new Line(10, 20, 20, 10, true).getDistance(new Point(0, 30)),
      13.416407864998737
    )
    equals(
      () => new Line(10, 20, -20, -10, true).getDistance(new Point(0, 30)),
      13.416407864998737
    )
  })

  test('getSignedDistance()', () => {
    equals(
      () =>
        new Line(10, 20, 20, 10, true).getSignedDistance(
          new Point(20, 10)
        ),
      13.416407864998737
    )
    equals(
      () =>
        // Change the line direction
        new Line(10, 20, -20, -10, true).getSignedDistance(
          new Point(20, 10)
        ),
      -13.416407864998737
    )
    equals(
      () =>
        // Change the point side
        new Line(10, 20, 20, 10, true).getSignedDistance(
          new Point(0, 30)
        ),
      -13.416407864998737
    )
    equals(
      () =>
        // Change the line direction and the point side
        new Line(10, 20, -20, -10, true).getSignedDistance(
          new Point(0, 30)
        ),
      13.416407864998737
    )
    // Directions with mixed signs, on either side of the diagonal: the cross
    // product of (10, -10) with the direction, divided by its length:
    equals(
      () =>
        new Line(10, 20, -10, 20, true).getSignedDistance(
          new Point(20, 10)
        ),
      100 / Math.sqrt(500)
    )
    equals(
      () =>
        new Line(10, 20, 10, -20, true).getSignedDistance(
          new Point(20, 10)
        ),
      -100 / Math.sqrt(500)
    )
  })
})
