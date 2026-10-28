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
import { Curve, Numerical, Path, Point, Rectangle } from 'paper'
import { equals, test } from '../helpers.js'

describe('Curve', () => {
  function testClassify(curve, expeced) {
    const info = curve.classify()
    if (expeced.type) {
      equals(
        info.type,
        expeced.type,
        `info.type == '` + expeced.type + `'`
      )
    }
    if (expeced.roots !== undefined) {
      equals(
        info.roots,
        expeced.roots,
        'info.roots == ' +
        (expeced.roots ? '[' + expeced.roots + ']' : expeced.roots)
      )
    }
  }

  test('Curve#classify()', () => {
    const point = new Curve([100, 100], null, null, [100, 100])
    const line = new Curve([100, 100], null, null, [200, 200])
    const cusp = new Curve(
      [100, 200],
      [100, -100],
      [-100, -100],
      [200, 200]
    )
    const loop = new Curve(
      [100, 200],
      [150, -100],
      [-150, -100],
      [200, 200]
    )
    const single = new Curve([100, 100], [50, 0], [-27, -46], [200, 200])
    const double = new Curve(
      [100, 200],
      [100, -100],
      [-40, -80],
      [200, 200]
    )
    const arch = new Curve([100, 100], [50, 0], [0, -50], [200, 200])
    testClassify(point, { type: 'line', roots: null })
    testClassify(line, { type: 'line', roots: null })
    testClassify(cusp, { type: 'cusp', roots: [0.5] })
    testClassify(loop, {
      type: 'loop',
      roots: [0.17267316464601132, 0.8273268353539888]
    })
    testClassify(single, { type: 'serpentine', roots: [0.870967741935484] })
    testClassify(double, {
      type: 'serpentine',
      roots: [0.15047207654837885, 0.7384168123405099]
    })
    testClassify(arch, { type: 'arch', roots: null })
    // A root at the very end is the end itself, not a point of inflection
    // inside the curve (#1879):
    const end = new Curve(
      [1133.875, 47.56],
      [0.001, 1.2],
      [0, -1.2],
      [1133.876, 51.16]
    )
    testClassify(end, { type: 'arch', roots: null })
    // A straight curve with handles along it is a line, also when rounding
    // keeps its coefficients from being exactly zero, and has no loop:
    const straight = new Curve(
      [256.099999999999, 157.4],
      [-0.12, 0],
      [0.12666666666666, 0],
      [255.729999999999, 157.4]
    )
    testClassify(straight, { type: 'line', roots: null })
    equals(straight.getIntersections(), [], 'straight.getIntersections()')
  })

  test('Curve#getPointAtTime()', () => {
    let curve = new Path.Circle({
      center: [100, 100],
      radius: 100
    }).firstCurve

    const points = [
      [0, new Point(0, 100)],
      [0.25, new Point(7.8585, 61.07549)],
      [0.5, new Point(29.28932, 29.28932)],
      [0.75, new Point(61.07549, 7.8585)],
      [1, new Point(100, 0)]
    ]

    for (let i = 0; i < points.length; i++) {
      const entry = points[i]
      equals(
        curve.getPointAtTime(entry[0]),
        entry[1],
        'curve.getPointAtTime(' + entry[0] + ');'
      )
      // Legacy version:
      equals(
        curve.getPointAt(entry[0], true),
        entry[1],
        'Legacy: curve.getPointAt(' + entry[0] + ', true);'
      )
    }

    equals(
      curve.getPointAt(curve.length + 1),
      null,
      'Should return null when offset is out of range.'
    )

    // #960:
    curve = new Curve({
      segment1: [178.58559999999994, 333.41440000000006],
      segment2: [178.58559999999994, 178.58560000000008]
    })
    equals(
      curve.getPointAtTime(0).y,
      curve.point1.y,
      'Point at t=0 should not deviate from the actual coordinates.'
    )
    equals(
      curve.getPointAtTime(1).y,
      curve.point2.y,
      'Point at t=1 should not deviate from the actual coordinates.'
    )
  })

  test('Curve#getTangentAtTime()', () => {
    const curve = new Path.Circle({
      center: [100, 100],
      radius: 100
    }).firstCurve

    const tangents = [
      [0, new Point(0, -165.68542)],
      [0.25, new Point(60.7233, -143.56602)],
      [0.5, new Point(108.57864, -108.57864)],
      [0.75, new Point(143.56602, -60.7233)],
      [1, new Point(165.68542, 0)]
    ]

    for (let i = 0; i < tangents.length; i++) {
      const entry = tangents[i]
      equals(
        curve.getTangentAtTime(entry[0]),
        entry[1].normalize(),
        'curve.getTangentAtTime(' + entry[0] + ');'
      )
      equals(
        curve.getWeightedTangentAtTime(entry[0]),
        entry[1],
        'curve.getWeightedTangentAtTime(' + entry[0] + ');'
      )
      // Legacy version:
      equals(
        curve.getTangentAt(entry[0], true),
        entry[1].normalize(),
        'Legacy: curve.getTangentAt(' + entry[0] + ', true);'
      )
      equals(
        curve.getWeightedTangentAt(entry[0], true),
        entry[1],
        'Legacy: curve.getWeightedTangentAt(' + entry[0] + ', true);'
      )
    }
  })

  test('Curve#getNormalAtTime()', () => {
    const curve = new Path.Circle({
      center: [100, 100],
      radius: 100
    }).firstCurve

    const normals = [
      [0, new Point(-165.68542, 0)],
      [0.25, new Point(-143.56602, -60.7233)],
      [0.5, new Point(-108.57864, -108.57864)],
      [0.75, new Point(-60.7233, -143.56602)],
      [1, new Point(0, -165.68542)]
    ]

    for (let i = 0; i < normals.length; i++) {
      const entry = normals[i]
      equals(
        curve.getNormalAtTime(entry[0]),
        entry[1].normalize(),
        'curve.getNormalAtTime(' + entry[0] + ');'
      )
      equals(
        curve.getWeightedNormalAtTime(entry[0]),
        entry[1],
        'curve.getWeightedNormalAtTime(' + entry[0] + ');'
      )
      // Legacy version:
      equals(
        curve.getNormalAt(entry[0], true),
        entry[1].normalize(),
        'Legacy: curve.getNormalAt(' + entry[0] + ', true);'
      )
      equals(
        curve.getWeightedNormalAt(entry[0], true),
        entry[1],
        'Legacy: curve.getWeightedNormalAt(' + entry[0] + ', true);'
      )
    }
  })

  test('Curve#getCurvatureAtTime()', () => {
    const curve = new Path.Circle({
      center: [100, 100],
      radius: 100
    }).firstCurve

    const curvatures = [
      [0, 0.009785533905932729],
      [0.25, 0.010062133221584524],
      [0.5, 0.009937576453041297],
      [0.75, 0.010062133221584524],
      [1, 0.009785533905932727]
    ]

    for (let i = 0; i < curvatures.length; i++) {
      const entry = curvatures[i]
      equals(
        curve.getCurvatureAtTime(entry[0]),
        entry[1],
        'curve.getCurvatureAtTime(' + entry[0] + ');'
      )
      // Legacy version:
      equals(
        curve.getCurvatureAt(entry[0], true),
        entry[1],
        'Legacy: curve.getCurvatureAt(' + entry[0] + ', true);'
      )
    }
  })

  test('Curve#getCurvatureAtTime()', () => {
    const curve = new Path.Line({
      from: [100, 100],
      to: [200, 200]
    }).firstCurve

    const curvatures = [
      [0, 0],
      [0.25, 0],
      [0.5, 0],
      [0.75, 0],
      [1, 0]
    ]

    for (let i = 0; i < curvatures.length; i++) {
      const entry = curvatures[i]
      equals(
        curve.getCurvatureAtTime(entry[0]),
        entry[1],
        'curve.getCurvatureAtTime(' + entry[0] + ');'
      )
      // Legacy version:
      equals(
        curve.getCurvatureAt(entry[0], true),
        entry[1],
        'Legacy: curve.getCurvatureAt(' + entry[0] + ', true);'
      )
    }
  })

  test('Curve#getTimeAt()', () => {
    const curve = new Path([
      [[0, 0], [0, 0], [100, 0]],
      [[200, 200]]
    ]).firstCurve

    for (let f = 0; f <= 1; f += 0.1) {
      const o1 = curve.length * f,
        o2 = -curve.length * (1 - f),
        t1 = curve.getTimeAt(o1),
        t2 = curve.getTimeAt(o2)
      const message = (
        'Curve-time parameter at offset ' +
        o1 +
        ' should be the same value as at offset ' +
        o2
      )
      equals(t1, t2, message, Numerical.CURVETIME_EPSILON)
      equals(() => curve.getOffsetAtTime(t1), o1)
      equals(() => curve.getOffsetAtTime(t2), curve.length + o2)
      // Legacy version:
      equals(
        curve.getParameterAt(o1),
        curve.getParameterAt(o2),
        'Legacy: ' + message,
        Numerical.CURVETIME_EPSILON
      )
      // Test other methods with negatives offsets
      equals(
        curve.getTangentAt(o1),
        curve.getTangentAt(o2),
        'Tangent at offset ' +
        o1 +
        ' should be the same value as at offset ' +
        o2
      )
    }

    equals(
      curve.getTimeAt(curve.length + 1),
      null,
      'Should return null when offset is out of range.'
    )
  })

  test('Curve#getTimeAt() with straight curve', () => {
    const path = new Path()
    path.moveTo(100, 100)
    path.lineTo(500, 500)
    const curve = path.firstCurve
    const length = curve.length
    const t = curve.getTimeAt(length / 3)
    equals(t, 0.3869631475722452)
  })

  test('Curve#getTimeAt() with straight curve', () => {
    // #1000:
    const curve = new Curve([
      1584.4999999999998, 1053.2499999999995,
      1584.4999999999998, 1053.2499999999995,
      1520.5, 1053.2499999999995,
      1520.5, 1053.2499999999995
    ])
    const offset = 63.999999999999716
    equals(() => offset < curve.length, true)
    equals(() => curve.getTimeAt(offset), 1)
  })

  test('Curve#getTimeAt() with offset at end of curve', () => {
    // #1149:
    const curve = [
      -7500, 0, -7500, 4142.135623730952, -4142.135623730952, 7500, 0,
      7500
    ]
    equals(Curve.getTimeAt(curve, 11782.625235553916), 1)
  })

  test('Curve#getLocationAt()', () => {
    const curve = new Path([
      [[0, 0], [0, 0], [100, 0]],
      [[200, 200]]
    ]).firstCurve

    equals(
      curve.getLocationAt(curve.length + 1),
      null,
      'Should return null when offset is out of range.'
    )
  })

  test('Curve#isStraight()', () => {
    equals(
      () => new Curve([100, 100], null, null, [200, 200]).isStraight(),
      true
    )
    equals(
      () =>
        new Curve(
          [100, 100],
          [-50, -50],
          null,
          [200, 200]
        ).isStraight(),
      false
    )
    equals(
      () => new Curve([100, 100], [50, 50], null, [200, 200]).isStraight(),
      true
    )
    equals(
      () =>
        new Curve(
          [100, 100],
          [50, 50],
          [-50, -50],
          [200, 200]
        ).isStraight(),
      true
    )
    equals(
      () =>
        new Curve(
          [100, 100],
          [50, 50],
          [50, 50],
          [200, 200]
        ).isStraight(),
      false
    )
    equals(
      () =>
        new Curve(
          [100, 100],
          null,
          [-50, -50],
          [200, 200]
        ).isStraight(),
      true
    )
    equals(
      () => new Curve([100, 100], null, [50, 50], [200, 200]).isStraight(),
      false
    )
    equals(
      () => new Curve([100, 100], null, null, [100, 100]).isStraight(),
      true
    )
    equals(
      () => new Curve([100, 100], [50, 50], null, [100, 100]).isStraight(),
      false
    )
    equals(
      () =>
        new Curve(
          [100, 100],
          null,
          [-50, -50],
          [100, 100]
        ).isStraight(),
      false
    )
    equals(
      () =>
        // #1269
        new Curve(
          [100, 300],
          [20, -20],
          [-10, 10],
          [200, 200]
        ).isStraight(),
      true
    )
  })

  test('Curve#isLinear()', () => {
    equals(
      () =>
        new Curve(
          [100, 100],
          [100 / 3, 100 / 3],
          [-100 / 3, -100 / 3],
          [200, 200]
        ).isLinear(),
      true
    )
    equals(
      () => new Curve([100, 100], null, null, [100, 100]).isLinear(),
      true
    )
    equals(
      () => new Curve([100, 100], null, null, [200, 200]).isLinear(),
      false
    )
  })

  test('Curve#getTimeOf()', () => {
    // #708:
    const path = new Path.Rectangle({
      center: new Point(300, 100),
      size: new Point(100, 100),
      strokeColor: 'black'
    })

    for (let pos = 0; pos < path.length; pos += 10) {
      const point1 = path.getPointAt(pos)
      let point2 = null
      for (let i = 0; i < path.curves.length; i++) {
        const curve = path.curves[i]
        const time = curve.getTimeOf(point1)
        if (time) {
          // Legacy-check-hack:
          equals(
            curve.getParameterOf(point1),
            time,
            'Legacy: curve.getParameterOf() should return the same' +
            ' as curve.getTimeOf()'
          )
          point2 = curve.getLocationAtTime(time).point
          break
        }
      }
      equals(
        point1,
        point2,
        'curve.getLocationAt(curve.getTimeOf(' +
        point1 +
        ')).point;'
      )
    }
  })

  test('Curve#getTimeOf() near the ends of a straight curve', () => {
    // Without handles, a point at a distance d from an end solves to a time of
    // about sqrt(d / 3l) on a curve of length l, far from the end (#2082):
    const curve = new Curve(new Point(100, 100), new Point(200, 200))
    equals(curve.getTimeOf(new Point(100 + 1e-9, 100)), 0, null, {
      tolerance: 0
    })
    equals(curve.getTimeOf(new Point(200 - 1e-9, 200)), 1, null, {
      tolerance: 0
    })
  })

  test('Curve#getTimeOf() off a slanted curve', () => {
    // The solutions of each coordinate lie further from a point off a slanted
    // curve than the curve itself, up to sqrt(2) times at 45°:
    const curve = new Curve(
      new Point(100, 100),
      new Point(30, -10),
      new Point(-40, 10),
      new Point(200, 200)
    )
    for (let i = 1; i < 10; i++) {
      const time = i / 10,
        normal = curve.getNormalAtTime(time),
        point = curve.getPointAtTime(time).add(normal.multiply(0.9e-7))
      equals(curve.getTimeOf(point), time)
    }
  })

  test('Curve#getTimeOf() at large coordinates', () => {
    // Beyond about 2e8, GEOMETRIC_EPSILON is below the resolution of the
    // coordinates, and points on the curve weren't recognized as such:
    const curve = new Curve(
      new Point(288270130.78085, 2621133556.75646),
      new Point(2158145287.70088, 988602383.71608)
    )
    for (let i = 1; i < 10; i++) {
      const time = i / 10 + 0.01
      equals(curve.getTimeOf(curve.getPointAtTime(time)), time)
    }
  })

  test('Curve#getPartLength() with straight curve', () => {
    const curve = new Curve([0, 0, 0, 0, 64, 0, 64, 0])
    equals(() => curve.getPartLength(0.0, 0.25), 10)
    equals(() => curve.getPartLength(0.25, 0.5), 22)
    equals(() => curve.getPartLength(0.25, 0.75), 44)
    equals(() => curve.getPartLength(0.5, 0.75), 22)
    equals(() => curve.getPartLength(0.75, 1), 10)
  })

  test('Curve#getPartLength() and #getTimeAt() where the curve slows down sharply', () => {
    const curve = new Curve([
      55.01, 431.5, -18.24, 499.57, 480.33, 100.07, 499.09, 93.15
    ])
    // The lengths by Simpson's rule with 2,000,000 steps on each side of
    // where the curve is slowest, at 0.07237:
    equals(() => curve.getPartLength(0, 0.1), 12.330377828)
    equals(() => curve.getPartLength(0, 0.15), 21.884684886)
    equals(() => curve.length, 579.795060932)
    equals(() => curve.getTimeAt(21.884684886), 0.15)
  })

  test('Curve#divideAt(offset)', () => {
    const point1 = new Point(0, 0)
    const point2 = new Point(100, 0)
    const middle = point1.add(point2).divide(2)
    equals(() => new Curve(point1, point2).divideAt(50).point1, middle)
    equals(() => new Curve(point1, point2).divideAtTime(0.5).point1, middle)
  })

  test('Curve#getTimesWithTangent()', () => {
    const curve = new Curve([0, 0], [100, 0], [0, -100], [200, 200])
    equals(
      curve.getTimesWithTangent(),
      [],
      'should return empty array when called without argument'
    )
    equals(
      curve.getTimesWithTangent([1, 0]),
      [0],
      'should return tangent at start'
    )
    equals(
      curve.getTimesWithTangent([-1, 0]),
      [0],
      'should return the same when called with opposite direction vector'
    )
    equals(
      curve.getTimesWithTangent([0, 1]),
      [1],
      'should return tangent at end'
    )
    equals(
      curve.getTimesWithTangent([1, 1]),
      [0.5],
      'should return tangent at middle'
    )
    equals(
      curve.getTimesWithTangent([1, -1]),
      [],
      'should return empty array when there is no tangent'
    )

    equals(
      new Curve(
        [0, 0],
        [100, 0],
        [500, -500],
        [-500, -500]
      ).getTimesWithTangent([1, 0]).length,
      2,
      'should return 2 values for specific self-intersecting path case'
    )

    equals(
      new Curve(
        [0, 0],
        [100, 0],
        [0, -100],
        [0, -100]
      ).getTimesWithTangent([1, 0]).length,
      2,
      'should return 2 values for specific parabollic path case'
    )
  })

  test('Curve#getTimesWithTangent() with quadratic curve', () => {
    // The quadratic curve (0, 0), (50, 100), (100, 0) elevated to a cubic. Its
    // derivative 2 * (50, 100 - 200 * t) is parallel to (1, -1) at t = 0.75,
    // to (1, 1) at t = 0.25, to (1, 0) at t = 0.5, and never to (0, 1):
    const curve = new Curve(
      [0, 0],
      [100 / 3, 200 / 3],
      [-100 / 3, 200 / 3],
      [100, 0]
    )
    equals(curve.getTimesWithTangent([1, -1]), [0.75])
    equals(curve.getTimesWithTangent([1, 1]), [0.25])
    equals(curve.getTimesWithTangent([1, 0]), [0.5])
    equals(curve.getTimesWithTangent([0, 1]), [])

    // #1870: A cubic converted from an imported quadratic curve:
    const path = new Path()
    path.moveTo(726.0867795506349, 286.15825464018235)
    path.cubicCurveTo(
      [742.7491045262132, 272.26375773363725],
      [751.0802670140022, 254.7434060566591],
      [751.0802670140022, 233.59719960924784]
    )
    const angle = 122 / 180 * Math.PI,
      tangent = new Point(Math.cos(angle), Math.sin(angle)),
      times = path.firstCurve.getTimesWithTangent(tangent)
    equals(times.length, 1, 'times.length')
    equals(
      path.firstCurve.getTangentAtTime(times[0]).cross(tangent),
      0,
      'tangent at times[0] is parallel to the given tangent'
    )
  })

  test('Curve#getTimesWithTangent(), #length and Curve.getPeaks() far from the origin', () => {
    // The coordinates are multiples of 1 / 4096, which stay exact at 2^40, so
    // the curve moved there has the same shape and the same results:
    function getCurve(offset) {
      const q = 1 / 4096
      return new Curve(
        [offset + 3 * q, offset + 5 * q],
        [30 + 1229 * q, -40 - 2867 * q],
        [-10 - 1229 * q, -60 - 2867 * q],
        [offset + 100 + 409 * q, offset + 20 + 819 * q]
      )
    }
    const curve = getCurve(0),
      moved = getCurve(Math.pow(2, 40)),
      options = { tolerance: 1e-12 }
    equals(
      moved.getTimesWithTangent([1, 0.3]),
      curve.getTimesWithTangent([1, 0.3]),
      'times with tangent',
      options
    )
    equals(moved.length, curve.length, 'length', options)
    equals(
      Curve.getPeaks(moved.getValues()),
      Curve.getPeaks(curve.getValues()),
      'peaks',
      options
    )
  })

  test('Curve#handleBounds', () => {
    // The handle bounds are the bounds of the curve's four points:
    // (0, 0), (-20, 80), (130, 10), (100, 50)
    const expected = new Rectangle(-20, 0, 150, 80)
    const curve = new Curve([0, 0], [-20, 80], [30, -40], [100, 50])
    equals(curve.handleBounds, expected, 'curve.handleBounds')
    // The outer handles of the segments are not part of the curve, and
    // neither is the stroke:
    const path = new Path({
      segments: [
        [[0, 0], [-50, -50], [-20, 80]],
        [[100, 50], [30, -40], [40, 40]]
      ],
      strokeColor: 'black',
      strokeWidth: 10
    })
    equals(
      path.firstCurve.handleBounds,
      expected,
      'path.firstCurve.handleBounds'
    )
  })

  test('Curve#strokeBounds', () => {
    // A curve without a path has no stroke, so its stroke bounds are the
    // bounds of the line from (0, 0) to (10, 10):
    const curve = new Curve([0, 0], [10, 10])
    equals(
      curve.strokeBounds,
      new Rectangle(0, 0, 10, 10),
      'curve.strokeBounds'
    )
    // The curve of a stroked path includes the stroke, here the butt caps of
    // a horizontal line, half the stroke width above and below:
    const path = new Path({
      segments: [[0, 0], [100, 0]],
      strokeColor: 'black',
      strokeWidth: 10
    })
    equals(
      path.firstCurve.strokeBounds,
      new Rectangle(0, -5, 100, 10),
      'path.firstCurve.strokeBounds'
    )
  })

  test('Curve#getNearestPoint() between the first samples of a fast curve', () => {
    // The curve covers a lot of ground at its start, so the nearest point lies
    // between its first samples, which lie further away than those around
    // another, local minimum at t = 0.21:
    const curve = new Curve(
      [936.78495, -14.40565],
      [188.72013, -0.05602],
      [269, -97],
      [65, 167]
    )
    const point = new Point(939.37781, -9.40163)
    equals(curve.getNearestPoint(point).getDistance(point), 4.99919, null, {
      tolerance: 1e-5
    })
  })
})
