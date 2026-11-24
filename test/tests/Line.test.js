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
import { Line, Point } from 'paper'
import { equals, test } from '../helpers.js'

describe('Line', () => {
  test('new Line(from, to)', () => {
    const line = new Line([10, 20], [30, 40])
    equals(line.point, new Point(10, 20), 'line.point')
    equals(line.vector, new Point(20, 20), 'line.vector')
    equals(line.infinite, false, 'line.infinite')
  })

  test('new Line({ from, to })', () => {
    const line = new Line({ from: [10, 20], to: [30, 40] })
    equals(line.point, new Point(10, 20), 'line.point')
    equals(line.vector, new Point(20, 20), 'line.vector')
  })

  test('new Line({ point, vector, infinite })', () => {
    const line = new Line({ point: [10, 20], vector: [30, 40], infinite: true })
    equals(line.point, new Point(10, 20), 'line.point')
    equals(line.vector, new Point(30, 40), 'line.vector')
    equals(line.infinite, true, 'line.infinite')
  })

  test('toString()', () => {
    equals(
      new Line([10, 20], [30, 40]).toString(),
      '{ point: { x: 10, y: 20 }, vector: { x: 20, y: 20 } }'
    )
    equals(
      new Line({ point: [0, 0], vector: [1, 0], infinite: true }).toString(),
      '{ point: { x: 0, y: 0 }, vector: { x: 1, y: 0 }, infinite: true }'
    )
  })

  test('intersect() within the ends of lines that are not infinite', () => {
    const line = new Line([0, 0], [100, 0])
    const short = new Line([150, -10], [150, 10])
    equals(line.intersect(new Line([50, -10], [50, 10])), new Point(50, 0))
    equals(line.intersect(short), undefined)
    equals(short.intersect(line), undefined)
    // Each line decides for itself whether it ends at its points:
    const ray = new Line({ point: [0, 0], vector: [100, 0], infinite: true })
    equals(ray.intersect(short), new Point(150, 0))
    equals(short.intersect(ray), new Point(150, 0))
    equals(
      ray.intersect(new Line([150, 20], [150, 10])),
      undefined,
      'beyond the end of the other line'
    )
    equals(line.intersect(new Line([0, 10], [100, 10])), undefined, 'parallel')
  })

  test('getDistance() of points beyond the ends', () => {
    const line = new Line([0, 0], [100, 0])
    equals(line.getDistance([50, 20]), 20)
    equals(line.getDistance([130, 40]), 50)
    equals(line.getDistance([-30, -40]), 50)
    equals(line.getSignedDistance([130, 40]), -50)
    equals(line.getSignedDistance([-30, -40]), 50)
    const infinite = new Line({
      point: [0, 0],
      vector: [100, 0],
      infinite: true
    })
    equals(infinite.getDistance([130, 40]), 40)
    equals(infinite.getSignedDistance([130, 40]), -40)
  })

  test('getDistance()', () => {
    equals(
      () =>
        new Line({
          point: [10, 20],
          vector: [20, 10],
          infinite: true
        }).getDistance(new Point(20, 10)),
      13.416407864998737
    )
    equals(
      () =>
        new Line({
          point: [10, 20],
          vector: [-20, -10],
          infinite: true
        }).getDistance(new Point(20, 10)),
      13.416407864998737
    )
    equals(
      () =>
        new Line({
          point: [10, 20],
          vector: [20, 10],
          infinite: true
        }).getDistance(new Point(0, 30)),
      13.416407864998737
    )
    equals(
      () =>
        new Line({
          point: [10, 20],
          vector: [-20, -10],
          infinite: true
        }).getDistance(new Point(0, 30)),
      13.416407864998737
    )
  })

  test('getSignedDistance()', () => {
    equals(
      () =>
        new Line({
          point: [10, 20],
          vector: [20, 10],
          infinite: true
        }).getSignedDistance(
          new Point(20, 10)
        ),
      13.416407864998737
    )
    equals(
      () =>
        // Change the line direction
        new Line({
          point: [10, 20],
          vector: [-20, -10],
          infinite: true
        }).getSignedDistance(
          new Point(20, 10)
        ),
      -13.416407864998737
    )
    equals(
      () =>
        // Change the point side
        new Line({
          point: [10, 20],
          vector: [20, 10],
          infinite: true
        }).getSignedDistance(
          new Point(0, 30)
        ),
      -13.416407864998737
    )
    equals(
      () =>
        // Change the line direction and the point side
        new Line({
          point: [10, 20],
          vector: [-20, -10],
          infinite: true
        }).getSignedDistance(
          new Point(0, 30)
        ),
      13.416407864998737
    )
    // Directions with mixed signs, on either side of the diagonal: the cross
    // product of (10, -10) with the direction, divided by its length:
    equals(
      () =>
        new Line({
          point: [10, 20],
          vector: [-10, 20],
          infinite: true
        }).getSignedDistance(
          new Point(20, 10)
        ),
      100 / Math.sqrt(500)
    )
    equals(
      () =>
        new Line({
          point: [10, 20],
          vector: [10, -20],
          infinite: true
        }).getSignedDistance(
          new Point(20, 10)
        ),
      -100 / Math.sqrt(500)
    )
  })

  test('getSide() of points on the line beyond its ends', () => {
    // A vertical line, where the projection onto the line depends on y only:
    const line = new Line(new Point(0, 0), new Point(0, 10))
    equals(() => line.getSide(new Point(0, 20)), 1)
    equals(() => line.getSide(new Point(0, -10)), -1)
    equals(() => line.getSide(new Point(0, 5)), 0)
    equals(
      () =>
        new Line({ point: [0, 0], vector: [0, 10], infinite: true }).getSide(
          new Point(0, 20)
        ),
      0
    )
  })
})
