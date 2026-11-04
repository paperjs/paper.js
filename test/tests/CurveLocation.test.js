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
import { Path, Point } from 'paper'
import { equals, test } from '../helpers.js'

describe('CurveLocation', () => {
  test('CurveLocation#offset', () => {
    const path = new Path()
    path.add(new Point(100, 100))
    path.add(new Point(200, 100))
    path.add(new Point(300, 100))
    path.add(new Point(400, 100))

    for (let i = 0; i < 4; i++) {
      equals(path.segments[i].location.offset, i * 100)
    }
  })

  test('CurveLocation#segment is the nearer one inside a curve', () => {
    const path = new Path([[0, 0], [100, 0]])
    equals(path.getLocationAt(20).segment === path.firstSegment, true)
    equals(path.getLocationAt(80).segment === path.lastSegment, true)
  })

  test('CurveLocation#divide()', () => {
    const path = new Path([[0, 0], [100, 0]])
    const location = path.getLocationAt(30)
    location.divide()
    equals(path.segments.length, 3)
    // The location moves to the new segment:
    equals(location.segment === path.segments[1], true)
    equals([location.point, location.time], [new Point(30, 0), 0])
  })

  test('CurveLocation#distance and #toString()', () => {
    const path = new Path([[0, 0], [100, 0]])
    const location = path.getNearestLocation([30, 10])
    equals(location.distance, 10)
    // Lines without handles move slower near their ends, so their time isn't
    // their fraction of the length:
    equals(
      location.toString(),
      '{ point: { x: 30, y: 0 }, index: 0, time: 0.36326, distance: 10 }'
    )
  })

  test('CurveLocation#intersection, #isCrossing() and #isTouching()', () => {
    const line = new Path([[0, 0], [100, 0]])
    // Crossing:
    const [crossing] = line.getIntersections(new Path([[50, -50], [50, 50]]))
    equals(crossing.intersection.intersection === crossing, true)
    equals([crossing.isCrossing(), crossing.isTouching()], [true, false])
    // Touching, by a circle on the line:
    const circle = Path.circle({ center: [50, -50], radius: 50 })
    const [touching] = line.getIntersections(circle)
    equals([touching.isCrossing(), touching.isTouching()], [false, true])
    // Locations that aren't intersections do neither:
    const location = line.getLocationAt(10)
    equals([location.isCrossing(), location.isTouching()], [false, false])
  })
})
