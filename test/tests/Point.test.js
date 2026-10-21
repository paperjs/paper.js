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
import { Path, Point, Size } from 'paper'
import { equals, test } from '../helpers.js'

describe('Point', () => {
  test('new Point(10, 20)', () => {
    const point = new Point(10, 20)
    equals(point.x, 10, 'point.x')
    equals(point.y, 20, 'point.y')
  })

  test('new Point([10, 20])', () => {
    const point = new Point([10, 20])
    equals(point.x, 10, 'point.x')
    equals(point.y, 20, 'point.y')
  })

  test('new Point({x: 10, y: 20})', () => {
    const point = new Point({ x: 10, y: 20 })
    equals(point.x, 10, 'point.x')
    equals(point.y, 20, 'point.y')
  })

  test('new Point(new Size(10, 20))', () => {
    equals(new Point(new Size(10, 20)), new Point(10, 20))
  })

  test('new Point({ width: 10, height: 20})', () => {
    equals(new Point({ width: 10, height: 20 }), new Point(10, 20))
  })

  test('new Point({ angle: 45, length: 20})', () => {
    equals(
      new Point({ angle: 40, length: 20 }),
      new Point(15.32089, 12.85575)
    )
  })

  test('new Point({ angleInRadians: 1, length: 20 })', () => {
    equals(
      new Point({ angleInRadians: 1, length: 20 }),
      new Point(20 * Math.cos(1), 20 * Math.sin(1))
    )
  })

  test('new Point("10, 20")', () => {
    equals(new Point('10, 20'), new Point(10, 20))
    equals(new Point('10,20'), new Point(10, 20))
    equals(new Point('10 20'), new Point(10, 20))
    // Make sure it's integer values from the string:
    equals(new Point('10 20').add(10), new Point(20, 30))
  })

  test('normalize(length)', () => {
    const point = new Point(0, 10).normalize(20)
    equals(point, new Point(0, 20))
  })

  test('set length', () => {
    const point = new Point(0, 10)
    point.length = 20
    equals(point, new Point(0, 20))
  })

  test('get angle', () => {
    const angle = new Point(0, 10).angle
    equals(angle, 90)
  })

  test('getAngle(point)', () => {
    const angle = new Point(0, 10).getAngle([10, 10])
    equals(Math.round(angle), 45)
  })

  test('rotate(degrees)', () => {
    const point = new Point(100, 50).rotate(90)
    equals(point, new Point(-50, 100))
  })

  test('set angle', () => {
    const point = new Point(10, 20)
    point.angle = 92
    equals(point.angle, 92)
    equals(
      point,
      new Point({
        angle: 92,
        length: Math.sqrt(10 * 10 + 20 * 20)
      })
    )
  })

  test('set angle & length', () => {
    const point1 = new Point()
    point1.length = Math.SQRT2
    point1.angle = -45

    const point2 = new Point()
    point2.angle = -45
    point2.length = Math.SQRT2

    equals(point2, point1)
  })

  test('getting angle after x / y change', () => {
    const vector = new Point(1, 0)
    equals(vector.angle, 0, 'angle before x / y change')
    vector.x = 0
    vector.y = 1
    equals(vector.angle, 90, 'angle after x / y change')
  })

  test('getDirectedAngle(point)', () => {
    equals(() => new Point(10, 10).getDirectedAngle(new Point(1, 0)), -45)

    equals(() => new Point(-10, 10).getDirectedAngle(new Point(1, 0)), -135)

    equals(() => new Point(-10, -10).getDirectedAngle(new Point(1, 0)), 135)

    equals(() => new Point(10, -10).getDirectedAngle(new Point(1, 0)), 45)
  })

  test('equals()', () => {
    equals(() => new Point(10, 10).equals([10, 10]), true)

    equals(() => new Point(0, 0).equals({}), false)

    equals(() => new Point(0, 0).equals(null), false)
  })

  test('clamp(min, max)', () => {
    const min = new Point(0, 10),
      max = new Point(100, 50)
    equals(new Point(-5, 60).clamp(min, max), new Point(0, 50))
    equals(new Point(150, 0).clamp(min, max), new Point(100, 10))
    equals(new Point(20, 30).clamp(min, max), new Point(20, 30))
    equals(new Point(-5, 60).clamp([0, 10], [100, 50]), new Point(0, 50))
  })

  test('isCollinear()', () => {
    equals(() => new Point(10, 5).isCollinear(new Point(20, 10)), true)
    equals(() => new Point(5, 10).isCollinear(new Point(-5, -10)), true)
    equals(() => new Point(10, 10).isCollinear(new Point(20, 10)), false)
    equals(() => new Point(10, 10).isCollinear(new Point(10, -10)), false)
  })

  test('isOrthogonal()', () => {
    equals(() => new Point(10, 5).isOrthogonal(new Point(5, -10)), true)
    equals(() => new Point(5, 10).isOrthogonal(new Point(-10, 5)), true)
    equals(() => new Point(10, 10).isOrthogonal(new Point(20, 20)), false)
    equals(() => new Point(10, 10).isOrthogonal(new Point(10, -20)), false)
  })

  test('Point#values', () => {
    equals(new Point(10, 20).values, [10, 20])
    // Points linked to their owners read through them:
    const path = new Path([[30, 40], [50, 60]])
    equals(path.firstSegment.point.values, [30, 40], 'segment point')
  })
})
