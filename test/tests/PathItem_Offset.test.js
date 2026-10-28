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

import { beforeAll, describe, expect, test } from 'vitest'
import paper, {
  CompoundPath,
  Path,
  Point,
  Project,
  Rectangle,
  Size
} from 'paper'
import { equals } from '../helpers.js'
import cases from '../offsetting/cases.json'
import known from '../offsetting/known.json'
import {
  caps,
  checkOutline,
  createPath,
  joins
} from '../offsetting/check.mjs'

describe('PathItem#offset() and #outline()', () => {
  beforeAll(() => {
    new Project(new Size(500, 500))
  })

  // How far the points of the outline lie outside the pens of the path's
  // stroke profile, sampled closely along it. It is measured along the pens'
  // minor axes, which underestimates the distance elsewhere:
  function getDeviation(path, outline) {
    const pens = []
    for (let offset = 0; offset <= path.length; offset += 0.05) {
      const stop = path.getStrokeProfileAt(offset)
      const a = path.strokeWidth / 2 * stop.width
      pens.push({
        point: path.getPointAt(offset),
        a,
        b: a * stop.aspect,
        angle: stop.angle
      })
    }
    let deviation = 0
    for (const curve of outline.curves) {
      for (let t = 0; t < 1; t += 0.25) {
        const point = curve.getPointAtTime(t)
        let distance = Infinity
        for (const pen of pens) {
          const { x, y } = point.subtract(pen.point).rotate(-pen.angle)
          distance = Math.min(
            distance,
            (Math.sqrt((x / pen.a) ** 2 + (y / pen.b) ** 2) - 1) * pen.b
          )
        }
        deviation = Math.max(deviation, distance)
      }
    }
    return deviation
  }

  test('PathItem#offset() of closed paths', () => {
    const rect = new Path.Rectangle({ point: [0, 0], size: [100, 50] })
    equals(rect.offset(10).bounds, new Rectangle(-10, -10, 120, 70))
    equals(rect.offset(10).area, 120 * 70)
    // The corners are quarter circles:
    equals(
      rect.offset(10, { join: 'round' }).area,
      100 * 50 + 300 * 10 + Math.PI * 100,
      null,
      { tolerance: 0.5 }
    )
    equals(rect.offset(-10).bounds, new Rectangle(10, 10, 80, 30))
    equals(rect.offset(-30).isEmpty(), true)
    // Closed paths grow by positive distances, whichever way they run:
    rect.reverse()
    equals(rect.offset(10).area, 120 * 70)
  })

  test('PathItem#offset() of compound paths', () => {
    const path = new CompoundPath({
      children: [
        new Path.Rectangle([0, 0], [100, 100]),
        new Path.Rectangle([25, 25], [50, 50])
      ]
    })
    path.reorient()
    equals(path.offset(5).area, 110 * 110 - 40 * 40)
    equals(path.offset(-5).area, 90 * 90 - 60 * 60)
  })

  test('PathItem#offset() of open paths', () => {
    const line = new Path([0, 0], [100, 0])
    // Along the normals, and against them:
    equals(line.offset(10).pathData, 'M0,-10h100')
    equals(line.offset(-10).pathData, 'M0,10h100')
    // The outer side of the corner gets the join:
    const corner = new Path([0, 0], [50, 50], [100, 0])
    equals(corner.offset(-10).segments.length, 3)
    // A round join passes at the distance below the corner:
    const point = new Point(50, 60)
    equals(
      corner
        .offset(-10, { join: 'round' })
        .getNearestPoint(point)
        .getDistance(point),
      0,
      null,
      { tolerance: 0.01 }
    )
    // The inner side meets in the corner:
    const offset = corner.offset(10)
    equals(offset.segments.length, 3)
    equals(offset.segments[1].point, new Point(50, 50 - 10 * Math.SQRT2))
  })

  test('PathItem#outline()', () => {
    const line = new Path({
      segments: [[0, 0], [100, 0]],
      strokeColor: 'red',
      strokeWidth: 20
    })
    const outline = line.outline()
    equals(outline.bounds, new Rectangle(0, -10, 100, 20))
    equals(outline.fillColor, line.strokeColor)
    equals(outline.strokeColor, null)
    equals(outline.index, line.index + 1)
    equals(line.outline({ insert: false }).parent, null)
    equals(
      line.outline({ width: 10, cap: 'square' }).bounds,
      new Rectangle(-5, -5, 110, 10)
    )
    const circle = new Path.Circle({
      center: [200, 200],
      radius: 50,
      strokeColor: 'black',
      strokeWidth: 10
    })
    equals(circle.outline().area, Math.PI * (55 * 55 - 45 * 45), null, {
      tolerance: 1
    })
  })

  test('PathItem#outline() of stroke profiles', () => {
    // Uniform profiles outline the stroke as without them:
    for (const strokeJoin of joins) {
      for (const strokeCap of caps) {
        const style = { strokeWidth: 30, strokeJoin, strokeCap }
        const segments = [[50, 300], [200, 100], [350, 300], [380, 150]]
        const path = new Path({ segments, ...style, insert: false })
        const plain = path.outline({ insert: false })
        path.strokeProfile = [{ offset: 0, width: 1 }]
        const profiled = path.outline({ insert: false })
        equals(plain.exclude(profiled, { insert: false }).area, 0, null, {
          tolerance: 0.5
        })
      }
    }
    const createLine = (strokeProfile, strokeCap = 'butt') => {
      const line = new Path({
        segments: [[0, 0], [100, 0]],
        strokeWidth: 20,
        strokeCap,
        insert: false
      })
      line.strokeProfile = strokeProfile
      return line.outline({ insert: false })
    }
    // A flat pen along the line, and across it:
    equals(
      createLine([{ offset: 0, aspect: 0.2 }]).bounds,
      new Rectangle(0, -2, 100, 4)
    )
    equals(
      createLine([{ offset: 0, aspect: 0.2, angle: 90 }]).bounds,
      new Rectangle(0, -10, 100, 20)
    )
    // A taper in a straight line touches its sides behind the pens'
    // centers, where the pens grow along them, with r(s) = 5 + 0.15 s:
    const k = 0.15
    equals(
      createLine([
        { offset: 0, width: 0.5, smooth: false },
        { offset: 100, width: 2, smooth: false }
      ]).area,
      25 * Math.sqrt(1 - k * k) * (100 - k * 15),
      null,
      { tolerance: 0.5 }
    )
    // Steps end the parts straight across:
    equals(
      createLine([
        { offset: 0, width: 0.5 },
        { offset: 40, width: 0.5 },
        { offset: 40, width: 2 }
      ]).area,
      40 * 10 + 60 * 40,
      null,
      { tolerance: 0.01 }
    )
    // Where the pen grows faster than it moves, it covers its own motion:
    const burst = createLine([
      { offset: 0, width: 0.1 },
      { offset: 10, width: 3 },
      { offset: 100, width: 1 }
    ])
    const pen = new Path.Circle({ center: [10, 0], radius: 30, insert: false })
    equals(pen.subtract(burst, { insert: false }).area, 0, null, {
      tolerance: 0.5
    })
    // Where the strips of smooth segments meet, the union leaves no slit
    // towards the path:
    const wave = new Path({
      segments: [[100, 320], [260, 180], [420, 420]],
      strokeWidth: 60,
      strokeCap: 'round',
      insert: false
    })
    wave.smooth({ type: 'catmull-rom' })
    wave.strokeProfile = [
      { offset: 0, width: 1.2, aspect: 0.15, angle: 0 },
      { offset: wave.length, angle: 180 }
    ]
    const peak = new Point(260, 180)
    equals(
      wave.outline({ insert: false }).getNearestPoint(peak).getDistance(peak) >
      1,
      true
    )
    // Where the pen changes smoothly, across curves and stops, the pieces of
    // the sides meet in the same points and continue each other, so the
    // outline has no seams there: no points close together, and no slight
    // kinks, which the seams had at 1° to 4°:
    const pressure = new Path({
      segments: [[100, 320], [260, 180], [420, 420], [580, 180], [740, 320]],
      strokeWidth: 60,
      insert: false
    })
    pressure.smooth({ type: 'catmull-rom' })
    const length = pressure.length
    pressure.strokeProfile = [
      { offset: 0, width: 0.2, aspect: 0.15, angle: -35 },
      { offset: length * 0.3, width: 1.4 },
      { offset: length * 0.7, width: 1.1 },
      { offset: length, width: 0.2 }
    ]
    const getSeams = outline =>
      outline.segments.filter(segment => {
        const { handleIn, handleOut } = segment
        const kink =
          handleIn.isZero() || handleOut.isZero()
            ? 0
            : 180 - Math.abs(handleIn.getDirectedAngle(handleOut))
        return (
          segment.point.getDistance(segment.next.point) < 0.5 ||
          kink > 0.1 && kink < 5
        )
      }).length
    const pressureOutline = pressure.outline({ insert: false })
    equals(getSeams(pressureOutline), 0, 'seams')
    // The sides take as few cubics as stay within the tolerance, with the
    // times of the points on them refined:
    equals(pressureOutline.segments.length, 44)
    equals(getDeviation(pressure, pressureOutline) < 0.1, true, 'tolerance')
    // Also at a smooth stop between curves:
    const joint = pressure.clone({ insert: false })
    joint.strokeProfile = pressure.strokeProfile.concat({
      offset: joint.segments[2].location.offset,
      width: 1.2
    })
    equals(getSeams(joint.outline({ insert: false })), 0, 'seams at joint')
    // Stops that keep values in straight lines add no pens, also where their
    // slopes on both sides differ in the last digits:
    const taper = new Path({
      segments: [[100, 320], [260, 140], [420, 420], [580, 180], [740, 320]],
      strokeWidth: 60,
      insert: false
    })
    taper.smooth({ type: 'catmull-rom' })
    const taperEnds = [
      { offset: 0, width: 0.2, aspect: 0.15, angle: -35, smooth: false },
      {
        offset: taper.length,
        width: 1.4,
        aspect: 0.5,
        angle: 60,
        smooth: false
      }
    ]
    taper.strokeProfile = taperEnds
    const taperOutline = taper.outline({ insert: false })
    const stop = taper.getStrokeProfileAt(taper.segments[2].location.offset)
    stop.smooth = false
    taper.strokeProfile = [taperEnds[0], stop, taperEnds[1]]
    equals(
      taper.outline({ insert: false }).segments.length,
      taperOutline.segments.length,
      'segments with straight stop'
    )
    // The round caps meet the sides where they end, instead of crossing them
    // close to there:
    pressure.strokeCap = 'round'
    equals(
      pressure
        .outline({ insert: false })
        .segments.filter(
          segment => segment.point.getDistance(segment.next.point) < 0.5
        ).length,
      0,
      'points close together'
    )
    // Pens that turn much faster than they move, with points that touch the
    // edge appearing and vanishing between the samples:
    const spin = new Path({
      pathData: (
        'M100,320c0,0 110.15211,-146.61749 160,-140c58.06213,7.70796 ' +
        '106.66667,240 160,240c53.33333,0 101.93787,-232.29204 160,-240' +
        'c49.84789,-6.61749 160,140 160,140'
      ),
      strokeWidth: 60,
      strokeCap: 'round',
      insert: false
    })
    spin.strokeProfile = [
      { offset: 0, width: 0.2, aspect: 0.15, angle: -35 },
      { offset: 308.64439, width: 1.03, angle: -47.47409 },
      { offset: 720.17024, width: 1.1 },
      { offset: 1028.81462, width: 3.2, aspect: 1.29, angle: 2378.48632 }
    ]
    // The last pen lies within the outline, sampled on its exact ellipse, as
    // the cubics of Path.Ellipse bulge out a little. Its edge is the outline's
    // there:
    const end = spin.lastSegment.point
    const outline = spin.outline({ insert: false })
    const outside = []
    for (let i = 0; i < 360; i++) {
      const angle = i * Math.PI / 180
      const point = end.add(
        new Point(96 * Math.cos(angle), 96 * 1.29 * Math.sin(angle)).rotate(
          2378.48632
        )
      )
      if (
        !outline.contains(point) &&
        outline.getNearestPoint(point).getDistance(point) > 0.01
      )
        outside.push(point)
    }
    equals(outside.length, 0, 'the last pen')
    equals(getDeviation(spin, outline) < 0.2, true, 'outside the pens')
    // Smooth profiles change their pens along curves, which the outline
    // follows as exactly:
    const brush = new Path({
      segments: [[0, 0], [[150, 80], [-60, 0], [60, 0]], [300, 0]],
      strokeWidth: 40,
      strokeCap: 'round',
      insert: false
    })
    brush.strokeProfile = [
      { offset: 0, width: 0.2, aspect: 0.3, angle: 0 },
      { offset: 120, width: 1.5, aspect: 1 },
      { offset: 220, width: 0.6, angle: 120 },
      { offset: brush.length, width: 1.2, aspect: 0.2, angle: 30 }
    ]
    equals(
      getDeviation(brush, brush.outline({ insert: false })) < 0.15,
      true,
      'smooth profiles'
    )
    // Samples at the ends of pieces stay on their curves, also where
    // rounding would take them beyond:
    const hook = new Path({
      pathData:
        'M695,173c0,0 10,11 0,211c10,-200 -178.35136999999997,-72.70272999999997 -600,-100z',
      strokeWidth: 4,
      insert: false
    })
    hook.strokeProfile = [
      { offset: 88.89864587887895, width: 0.01, angle: 0 },
      { offset: 88.89864587887895, width: 0.5378344890372057 },
      {
        offset: 909.1328934785826,
        width: 1.5462994098413265,
        angle: 894.3395560580952
      }
    ]
    equals(hook.outline({ insert: false }).isEmpty(), false)
    // Strips whose ends stand still, where a curve slows down sharply at its
    // end, sweep nothing, instead of sides fitted to noise:
    const stall = new Path({
      segments: [
        [[27768.474, 36165.767], [0, 0], [56.114, 2.44]],
        [[30544.58, 35227.701], [-465.712, -857.933], [463.507, 853.87]],
        [[25350.015, 40884.779], [927.15, -383.875], [-607.547, 251.547]],
        [[23400.244, 41184.607], [653.632, -71.798], [-411.34, 45.184]],
        [[22253.338, 40709.436], [389.452, 139.892], [-4404.194, -1581.993]],
        [[11128.562, 34371.612], [5141.093, -546.481], [0, 0]]
      ],
      closed: true,
      strokeWidth: 12942.21,
      insert: false
    })
    stall.strokeProfile = [{ offset: 0, width: 1.64 }]
    equals(stall.outline({ insert: false }).curves.length < 100, true)
    // Round caps are the pens at the ends:
    equals(
      createLine([{ offset: 0, aspect: 0.5, angle: 90 }], 'round').bounds,
      new Rectangle(-5, -10, 110, 20)
    )
    // Closed paths join their last curves to the first ones with the pens
    // at their ends, wherever they start:
    for (const strokeJoin of joins) {
      const createTriangle = (segments, offset) => {
        const triangle = new Path({
          segments,
          closed: true,
          strokeWidth: 20,
          strokeJoin,
          insert: false
        })
        const { length } = triangle
        triangle.strokeProfile = [
          { offset: offset % length, width: 0.5 },
          { offset: (offset + length / 2) % length, width: 2 }
        ]
        return triangle.outline({ insert: false })
      }
      const triangle1 = createTriangle([[0, 0], [200, 0], [100, 150]], 0)
      const triangle2 = createTriangle(
        [[200, 0], [100, 150], [0, 0]],
        2 * Math.hypot(100, 150)
      )
      equals(triangle1.exclude(triangle2, { insert: false }).area, 0, null, {
        tolerance: 0.01
      })
    }
  })
})

// The outlines of the strokes of the cases in test/offsetting/cases.json, at
// one width. The ones in known.json are expected to fail, until they're fixed.
// test/offsetting/sweep.mjs checks all widths, and fuzz.mjs finds new cases.
describe('PathItem offsetting', () => {
  beforeAll(() => {
    new Project(new Size(2000, 2000))
  })

  const strokeWidth = 62
  for (const entry of cases) {
    for (const strokeJoin of joins) {
      for (const strokeCap of caps) {
        const key = `${entry.name} / ${strokeJoin} ${strokeCap} ${strokeWidth}`
        ;(key in known ? test.fails : test)(key, () => {
          const path = createPath(paper, entry, {
            strokeWidth,
            strokeJoin,
            strokeCap
          })
          expect(checkOutline(paper, path)).toEqual([])
        })
      }
    }
  }

  // The same with uniform stroke profiles, which outline the strokes by the
  // pens' sweep instead:
  for (const entry of cases) {
    for (const strokeJoin of joins) {
      for (const strokeCap of caps) {
        const key = `${entry.name} / ${strokeJoin} ${strokeCap} profile`
        test(key, () => {
          const path = createPath(paper, entry, {
            strokeWidth,
            strokeJoin,
            strokeCap
          })
          path.strokeProfile = [{ offset: 0, width: 1 }]
          expect(checkOutline(paper, path)).toEqual([])
        })
      }
    }
  }
})
