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

/*
 * The curves along the sides of strokes: the offsets of cubic curves after
 * kurbo by Raph Levien and the Linebender contributors, and their evolutes,
 * for the areas of tight turns after "Converting Stroked Primitives to Filled
 * Primitives" by Diego Nehab.
 */

import {
  EPSILON,
  clamp,
  findSignChange,
  solveQuadratic
} from '../util/numerical.ts'
import { Line } from '../basic/Line.ts'
import { Point } from '../basic/Point.ts'
import * as Bezier from '../curve/index.ts'
import type { SegmentValues } from '../curve/index.ts'

const { abs } = Math

// A side of the area that a part of a stroke sweeps, as its segments:
export type Side = SegmentValues[]

// A point on the evolute of a curve:
type EvolutePoint = {
  point: Point
  derivative: Point
  speed?: number
  radius?: number
}

type CubicPart = {
  t0: number
  t1: number
  utan0: Point
  utan1: Point
  cusp0: number
  cusp1: number
  depth: number
}

// Returns the angle in radians by which the tangent of the curve with the
// values v turns from t1 to t2, in total across its inflections:
export function getTurn(v: number[], t1: number, t2: number): number {
  const times = [t1].concat(
    getInflections(v).filter(t => t > t1 && t < t2),
    t2
  )
  let turn = 0
  for (let i = 1, l = times.length; i < l; i++) {
    turn += abs(
      Bezier.getTangent(v, times[i - 1]).getDirectedAngle(
        Bezier.getTangent(v, times[i])
      )
    )
  }
  return turn * Math.PI / 180
}

// Returns the times where the offsets on either side of the curve have a
// cusp, where its radius of curvature equals the radius. Between the
// extrema and the inflections of the curvature, its magnitude changes
// monotonically, so each of these intervals holds at most one:
export function getCuspTimes(v: number[], radius: number): number[] {
  const times = getCurvatureExtrema(v)
    .concat(getInflections(v), 0, 1)
    .sort((a, b) => a - b)
  const cusps: number[] = []

  function f(t: number): number {
    const curvature = Bezier.getCurvature(v, t) * radius
    return 1 - curvature * curvature
  }

  for (let i = 1, l = times.length; i < l; i++) {
    const t0 = times[i - 1]
    const t1 = times[i]
    const f0 = f(t0)
    const f1 = f(t1)
    if (f0 * f1 < 0) {
      cusps.push(findSignChange(f, t0, t1, f0, f1, EPSILON))
    }
  }
  return cusps
}

// Returns the center of curvature of the curve with the values v at t, its
// derivative, and the numerator of its speed, which is zero where the
// curvature has its extrema. With the derivatives d1, d2, d3 of the curve,
// the center lies at p + perp(d1) * |d1|² / (d1 × d2), and moves along
// perp(d1):
function getEvoluteAt(v: number[], t: number): EvolutePoint {
  const x0 = v[0]
  const y0 = v[1]
  const cx = 3 * (v[2] - x0)
  const cy = 3 * (v[3] - y0)
  const bx = 3 * (v[4] - v[2]) - cx
  const by = 3 * (v[5] - v[3]) - cy
  const ax = v[6] - x0 - cx - bx
  const ay = v[7] - y0 - cy - by
  const dx = (3 * ax * t + 2 * bx) * t + cx
  const dy = (3 * ay * t + 2 * by) * t + cy
  const ddx = 6 * ax * t + 2 * bx
  const ddy = 6 * ay * t + 2 * by
  const cross = dx * ddy - dy * ddx
  const length2 = dx * dx + dy * dy
  const speed = (
    3 * (dx * ddx + dy * ddy) * cross -
    length2 * (dx * 6 * ay - dy * 6 * ax)
  )
  const perp = new Point(-dy, dx)
  return {
    point: Bezier.getPoint(v, t).add(perp.multiply(length2 / cross)),
    derivative: perp.multiply(speed / (cross * cross)),
    speed,
    // The signed radius of curvature, along perp(d1):
    radius: length2 * Math.sqrt(length2) / cross
  }
}

// Returns the times where the curvature of the curve has its extrema:
export function getCurvatureExtrema(v: number[]): number[] {
  const count = 32
  const times: number[] = []

  function f(t: number): number {
    return getEvoluteAt(v, t).speed
  }

  for (let i = 1, f0 = f(0); i <= count; i++) {
    const t0 = (i - 1) / count
    const t1 = i / count
    const f1 = f(t1)
    if (f0 * f1 < 0) {
      times.push(findSignChange(f, t0, t1, f0, f1, EPSILON))
    }
    f0 = f1
  }
  return times
}

// Returns a side that starts at the point, to add its curves to:
export function createSide(point: Point): Side {
  return [[[point.x, point.y], [0, 0], [0, 0]]]
}

// Adds the curve with the given handles to the point to the side:
export function addCurve(
  side: Side,
  handle1: Point,
  point: Point,
  handle2: Point
) {
  side[side.length - 1][2] = [handle1.x, handle1.y]
  side.push([[point.x, point.y], [handle2.x, handle2.y], [0, 0]])
}

// Returns the segments around the area between the two sides:
export function joinSides(side1: Side, side2: Side): SegmentValues[] {
  const segments = [...side1]
  for (let i = side2.length - 1; i >= 0; i--) {
    const [point, handleIn, handleOut] = side2[i]
    segments.push([point, handleOut, handleIn])
  }
  return segments
}

// Returns the side fitted with cubics to the points that the function
// returns from t0 to t1, with the directions at their ends, by least squares,
// and subdivided while they are off by more than the tolerance:
export function fitSide(
  evaluate: (t: number) => Point,
  t0: number,
  t1: number,
  tolerance: number
): Side {
  const count = 8
  const start = evaluate(t0)
  const side = createSide(start)

  function fit(
    t0: number, t1: number,
    p0: Point, p3: Point,
    depth: number
  ) {
    const delta = (t1 - t0) * 1e-5
    const chord = p3.subtract(p0)
    let tangent0 = evaluate(t0 + delta).subtract(p0)
    let tangent3 = p3.subtract(evaluate(t1 - delta))
    const points: Point[] = []
    const times: number[] = []
    let total = 0
    let gap = 0
    let index: number
    tangent0 = (tangent0.isZero() ? chord : tangent0).normalize()
    tangent3 = (tangent3.isZero() ? chord : tangent3).normalize()
    let prev = p0
    for (let i = 0; i <= count; i++) {
      const point =
        i < count
          ? evaluate(
              t0 + (
                (t1 - t0) *
                (i + 1) /
                (count + 1)
              )
            )
          : p3
      const distance = point.getDistance(prev)
      total += distance
      if (distance > gap) {
        gap = distance
        index = i
      }
      if (i < count) {
        points.push(point)
        times.push(total)
      }
      prev = point
    }
    // The points lie at the times on the cubic by their
    // distances along the chords at first, refined to their
    // nearest times on it while it is off (Schneider):
    for (let i = 0; i < count; i++) {
      times[i] = total ? times[i] / total : 0
    }
    const { length } = chord
    let handle1: Point
    let handle2: Point
    let c: number[]
    let error: number
    for (let iteration = 0; iteration < 4; iteration++) {
      // The handles' lengths with the least squares error
      // at the points:
      let c11 = 0
      let c12 = 0
      let c22 = 0
      let x1 = 0
      let x2 = 0
      for (let i = 0; i < count; i++) {
        const u = times[i]
        const w = 1 - u
        const a1 = tangent0.multiply(3 * w * w * u)
        const a2 = tangent3.multiply(-3 * w * u * u)
        const rest = points[i]
          .subtract(p0.multiply(w * w * (w + 3 * u)))
          .subtract(p3.multiply(u * u * (u + 3 * w)))
        c11 += a1.dot(a1)
        c12 += a1.dot(a2)
        c22 += a2.dot(a2)
        x1 += a1.dot(rest)
        x2 += a2.dot(rest)
      }
      const det = c11 * c22 - c12 * c12
      let alpha = det ? (x1 * c22 - x2 * c12) / det : 0
      let beta = det ? (c11 * x2 - c12 * x1) / det : 0
      if (!(
        alpha > EPSILON &&
        beta > EPSILON &&
        alpha < 2 * total &&
        beta < 2 * total
      )) {
        alpha = beta = length / 3
      }
      handle1 = tangent0.multiply(alpha)
      handle2 = tangent3.multiply(-beta)
      c = [
        p0.x,
        p0.y,
        p0.x + handle1.x,
        p0.y + handle1.y,
        p3.x + handle2.x,
        p3.y + handle2.y,
        p3.x,
        p3.y
      ]
      error = 0
      for (let i = 0; i < count; i++) {
        const time = Bezier.getNearestTime(c, points[i])
        error = Math.max(
          error,
          points[i].getDistance(Bezier.getPoint(c, time))
        )
        times[i] = time
      }
      if (error <= tolerance) break
    }
    // Measure the error halfway between the points too, where
    // the cubic may bulge away from the side:
    for (let i = 0; i <= count; i++) {
      const point = evaluate(
        t0 + (
          (t1 - t0) *
          (i + 0.5) /
          (count + 1)
        )
      )
      error = Math.max(
        error,
        point.getDistance(
          Bezier.getPoint(c, Bezier.getNearestTime(c, point))
        )
      )
    }
    // Where the points pass most of the way between two of
    // them, the side moves faster than they tell, and the
    // cubic may swing away from the line between them:
    if (gap > Math.max(total / 2, tolerance)) {
      const from = index ? points[index - 1] : p0
      const to = index < count ? points[index] : p3
      const point = Bezier.getPoint(
        c,
        (
          (index ? times[index - 1] : 0) +
          (index < count ? times[index] : 1)
        ) /
        2
      )
      error = Math.max(
        error,
        Line.getDistance(from.x, from.y, to.x, to.y, point.x, point.y)
      )
    }
    if (error > tolerance && depth < 12) {
      const t = (t0 + t1) / 2
      const point = evaluate(t)
      fit(t0, t, p0, point, depth + 1)
      fit(t, t1, point, p3, depth + 1)
    } else {
      addCurve(side, handle1, p3, handle2)
    }
  }

  fit(t0, t1, start, evaluate(t1), 0)
  return side
}

// Returns the segments of the evolute of the curve with the values v, the
// curve of its centers of curvature, fitted with cubic Hermite curves
// between its cusps. Where the centers lie beyond the inner offset, or on
// the other side, the inner side doesn't sweep backwards, and the evolute
// follows the inner offset instead:
export function getEvolute(
  v: number[],
  inner: number,
  tolerance: number
): Side {
  const c = regularizeCusp(v, tolerance / 4)
  const times = getCurvatureExtrema(c).concat(1)
  let t0 = 0
  let e0 = evaluate(0)
  const side = createSide(e0.point)

  function evaluate(t: number): EvolutePoint {
    let e = getEvoluteAt(c, t)
    // Paper.js's normals point against perp(d1):
    const distance = inner > 0 ? -e.radius : e.radius
    // Also where the radius is undefined, at zero derivatives, and
    // where it lies within the tolerance of the inner offset, so that
    // both meet exactly at the ends of the tight parts:
    if (!(distance >= 0 && distance < abs(inner) - tolerance)) {
      const derivative = Bezier.getWeightedTangent(c, t)
      e = {
        point: Bezier.getPoint(c, t).add(
          Bezier.getNormal(c, t).multiply(inner)
        ),
        derivative: derivative.multiply(
          1 + inner * Bezier.getCurvature(c, t)
        )
      }
    }
    return e
  }

  function fit(
    t0: number, e0: EvolutePoint,
    t1: number, e1: EvolutePoint,
    depth: number
  ) {
    const tm = (t0 + t1) / 2
    const em = evaluate(tm)
    const h0 = e0.derivative.multiply((t1 - t0) / 3)
    const h1 = e1.derivative.multiply((t0 - t1) / 3)
    const mid = e0.point
      .add(e1.point)
      .multiply(0.5)
      .add(h0.add(h1).multiply(3 / 8))
    if (depth < 8 && mid.getDistance(em.point) > tolerance / 10) {
      fit(t0, e0, tm, em, depth + 1)
      fit(tm, em, t1, e1, depth + 1)
    } else {
      addCurve(side, h0, e1.point, h1)
    }
  }

  for (let i = 0, l = times.length; i < l; i++) {
    const e1 = evaluate(times[i])
    fit(t0, e0, times[i], e1, 0)
    t0 = times[i]
    e0 = e1
  }
  return side
}

// Returns the segments of the offset of the curve with the values v:
export function getOffsetSegments(
  v: number[],
  offset: number,
  tolerance: number
): Side {
  if (Bezier.isStraight(v)) {
    // Along the normals at the ends, as the joins and caps use them:
    const zero = new Point()
    const side = createSide(
      new Point(v[0], v[1]).add(Bezier.getNormal(v, 0).multiply(offset))
    )
    addCurve(
      side,
      zero,
      new Point(v[6], v[7]).add(Bezier.getNormal(v, 1).multiply(offset)),
      zero
    )
    return side
  } else {
    // Paper.js's normals point the other way than those of the method
    // below, see getUnitNormal():
    return offsetCubic(v, -offset, tolerance)
  }
}

// The offset of a cubic Bézier curve after kurbo's offset_cubic(), by Raph
// Levien and the Linebender contributors (Apache-2.0 OR MIT):
// https://github.com/linebender/kurbo/blob/main/kurbo/src/offset.rs
// Each part is drawn as an arc, refined by least squares, and subdivided
// while its error exceeds the tolerance, first at the cusps of the offset.
function offsetCubic(v: number[], d: number, tolerance: number): Side {
  const c = regularizeCusp(v, tolerance / 4)
  const p0 = new Point(c[0], c[1])
  const p1 = new Point(c[2], c[3])
  const p2 = new Point(c[4], c[5])
  const p3 = new Point(c[6], c[7])
  // The control points of the derivative:
  const q0 = p1.subtract(p0).multiply(3)
  const q1 = p2.subtract(p1).multiply(3)
  const q2 = p3.subtract(p2).multiply(3)
  // The cross product of the second and first derivatives, times the
  // offset, as the polynomial c0 + c1 * t + c2 * t^2:
  const q1xq0 = q1.cross(q0)
  const q2xq0 = q2.cross(q0)
  const q2xq1 = q2.cross(q1)
  const c0 = 2 * d * q1xq0
  const c1 = 2 * d * (q2xq0 - 2 * q1xq0)
  const c2 = 2 * d * (q2xq1 - q2xq0 + q1xq0)
  const utan0 = Bezier.getTangent(c, 0)
  const utan1 = Bezier.getTangent(c, 1)
  const side = createSide(p0.add(getUnitNormal(utan0, d)))
  // The Bézier weights of the points of the least squares fit:
  const count = 8
  const weights: number[] = []
  for (let i = 0; i < count; i++) {
    const t = (i + 1) / (count + 1)
    weights.push(3 * (1 - t) * (1 - t) * t)
  }

  function getUnitNormal(utan: Point, length: number): Point {
    return new Point(-utan.y, utan.x).multiply(length)
  }

  function evaluate(t: number): Point {
    return Bezier.getPoint(c, t)
  }

  function derive(t: number): Point {
    const u = 1 - t
    const w0 = u * u
    const w1 = 2 * t * u
    const w2 = t * t
    return new Point(
      w0 * q0.x + w1 * q1.x + w2 * q2.x,
      w0 * q0.y + w1 * q1.y + w2 * q2.y
    )
  }

  // The curvature times the offset plus one, which is zero where the
  // offset has a cusp:
  function getCusp(t: number): number {
    const ds2 = derive(t).dot(derive(t))
    return ((c2 * t + c1) * t + c0) / (ds2 * Math.sqrt(ds2)) + 1
  }

  function getEndCusp(tangent: Point, y: number): number {
    const length = Math.max(tangent.length, EPSILON)
    return y / (length * length * length) + 1
  }

  // The offset curve of the part from t0 to t1, with the handles of the
  // offset drawn as an arc that a and b adjust:
  function getOffsetCurve(part: CubicPart, a: number, b: number): Point[] {
    const s = (part.t1 - part.t0) / 3
    const start = evaluate(part.t0).add(getUnitNormal(part.utan0, d))
    const end = evaluate(part.t1).add(getUnitNormal(part.utan1, d))
    const l0 = s * derive(part.t0).length + a * d
    const l1 = s * derive(part.t1).length - b * d
    return [
      start,
      l0 * part.cusp0 > 0 ? start.add(part.utan0.multiply(l0)) : start,
      l1 * part.cusp1 > 0 ? end.subtract(part.utan1.multiply(l1)) : end,
      end
    ]
  }

  // The error of the offset curve, at the points on it whose normals meet
  // the curve at the times in ts, which a Newton step refines. It is
  // called a lot, so we calculate with coordinates, not points:
  function getError(
    part: CubicPart,
    points: Point[],
    ts: number[]
  ): { squared: number; normals: Point[]; vectors: Point[] } {
    let error = 0
    const normals: Point[] = []
    const vectors: Point[] = []
    const { x: x0, y: y0 } = points[0]
    const { x: x1, y: y1 } = points[1]
    const { x: x2, y: y2 } = points[2]
    const { x: x3, y: y3 } = points[3]
    const sign = part.cusp0 < 0 ? -1 : 1
    for (let i = 0; i < count; i++) {
      const ta = (i + 1) / (count + 1)
      const u = 1 - ta
      const w0 = u * u * u
      const w1 = 3 * u * u * ta
      const w2 = 3 * u * ta * ta
      const w3 = ta * ta * ta
      const px = w0 * x0 + w1 * x1 + w2 * x2 + w3 * x3
      const py = w0 * y0 + w1 * y1 + w2 * y2 + w3 * y3
      const tx = (
        (x1 - x0) * u * u +
        (x2 - x1) * 2 * u * ta +
        (x3 - x2) * ta * ta
      )
      const ty = (
        (y1 - y0) * u * u +
        (y2 - y1) * 2 * u * ta +
        (y3 - y2) * ta * ta
      )
      let t = ts[i]
      let point = evaluate(t)
      const derivative = derive(t)
      t += (
        (tx * (px - point.x) + ty * (py - point.y)) /
        (tx * derivative.x + ty * derivative.y)
      )
      t = ts[i] = clamp(t, part.t0, part.t1)
      point = evaluate(t)
      const length = Math.sqrt(tx * tx + ty * ty)
      const nx = -ty / length * sign
      const ny = tx / length * sign
      const vx = px - point.x - nx * d
      const vy = py - point.y - ny * d
      const squared = vx * vx + vy * vy
      normals.push(new Point(nx, ny))
      vectors.push(new Point(vx, vy))
      // Reject refinements that produce invalid values:
      error = Math.max(error, isFinite(squared) ? squared : 1e12)
    }
    return { squared: error, normals, vectors }
  }

  // Adjusts a and b to minimize the least squares error, mostly normal to
  // the offset, with a little of the error along it blended in:
  function refine(
    part: CubicPart,
    a: number,
    b: number,
    error: { normals: Point[]; vectors: Point[] }
  ): [number, number] {
    const blend = 1e-3
    let aa = 0
    let ab = 0
    let ac = 0
    let bb = 0
    let bc = 0
    for (let i = 0; i < count; i++) {
      const n = error.normals[i]
      const vector = error.vectors[i]
      const cn = vector.dot(n)
      const ct = vector.cross(n)
      const an = weights[i] * part.utan0.dot(n)
      const at = weights[i] * part.utan0.cross(n)
      const bn = weights[count - 1 - i] * part.utan1.dot(n)
      const bt = weights[count - 1 - i] * part.utan1.cross(n)
      aa += an * an + blend * at * at
      ab += an * bn + blend * at * bt
      ac += an * cn + blend * at * ct
      bb += bn * bn + blend * bt * bt
      bc += bn * cn + blend * bt * ct
    }
    const idet = 1 / (d * (aa * bb - ab * ab))
    return [
      a - idet * (ac * bb - ab * bc),
      b - idet * (aa * bc - ac * ab)
    ]
  }

  // Finds the time in t0..t1 where the tangent points along `tangent`,
  // with `force` returning the end with the smaller derivative if there
  // isn't exactly one:
  function getTimeWithTangent(
    utan0: Point,
    t0: number,
    t1: number,
    tangent: Point,
    force: boolean
  ): { t: number; utan: Point } | null {
    const z0 = tangent.cross(q0)
    const z1 = tangent.cross(q1)
    const z2 = tangent.cross(q2)
    const roots: number[] = []
    const found = solveQuadratic(
      z2 - 2 * z1 + z0,
      2 * (z1 - z0),
      z0,
      roots,
      t0,
      t1
    )
    let t = roots[0]
    if (found !== 1) {
      if (!force) return null
      t = derive(t0).length > derive(t1).length ? t1 : t0
    }
    const q = derive(t)
    return {
      t,
      utan:
        found === 1 && q.dot(q) >= EPSILON
          ? q.normalize()
          : tangent.dot(tangent) >= EPSILON
            ? tangent.normalize()
            : // A U-turn: pick a direction.
              getUnitNormal(utan0, 1)
    }
  }

  // Where to subdivide: in the middle if its tangent is balanced between
  // the ends', otherwise at the tangent that bisects them, or with an
  // inflection, at half of the total turning:
  function getSubdivision(part: CubicPart): { t: number; utan: Point } {
    const t = (part.t0 + part.t1) / 2
    const q = derive(t)
    const x0 = abs(part.utan0.cross(q))
    const x1 = abs(part.utan1.cross(q))
    if (x0 > 0.1 * x1 && x1 > 0.1 * x0) return { t, utan: q.normalize() }
    const chord = evaluate(part.t1).subtract(evaluate(part.t0))
    if (chord.cross(part.utan0) * chord.cross(part.utan1) < 0) {
      const split = getTimeWithTangent(
        part.utan0,
        part.t0,
        part.t1,
        part.utan0.add(part.utan1),
        false
      )
      if (split) return split
    }
    const tangents = [part.utan0]
    const ts = [part.t0]
    const inflections = getInflections(c)
    for (let i = 0; i < inflections.length; i++) {
      const ti = inflections[i]
      if (ti > part.t0 && ti < part.t1) {
        tangents.push(derive(ti))
        ts.push(ti)
      }
    }
    tangents.push(part.utan1)
    ts.push(part.t1)
    const angles: number[] = []
    let sum = 0
    for (let i = 0; i < tangents.length - 1; i++) {
      const angle = Math.atan2(
        tangents[i].cross(tangents[i + 1]),
        tangents[i].dot(tangents[i + 1])
      )
      sum += abs(angle)
      angles.push(angle)
    }
    let target = sum / 2
    let j = 0
    while (abs(angles[j]) < target) {
      target -= abs(angles[j])
      j++
    }
    const base = tangents[j]
    const turn = angles[j] < 0 ? -target : target
    const tangent = base.rotate(turn * 180 / Math.PI)
    return getTimeWithTangent(
      j ? base.normalize() : part.utan0,
      ts[j],
      ts[j + 1],
      tangent,
      true
    )
  }

  function subdivide(
    part: CubicPart,
    t: number,
    utan: Point,
    cuspMinus: number,
    cuspPlus: number
  ) {
    offsetPart({
      t0: part.t0,
      t1: t,
      utan0: part.utan0,
      utan1: utan,
      cusp0: part.cusp0,
      cusp1: cuspMinus,
      depth: part.depth + 1
    })
    offsetPart({
      t0: t,
      t1: part.t1,
      utan0: utan,
      utan1: part.utan1,
      cusp0: cuspPlus,
      cusp1: part.cusp1,
      depth: part.depth + 1
    })
  }

  function offsetPart(part: CubicPart) {
    // Subdivide at a cusp of the offset first:
    if (part.cusp0 * part.cusp1 < 0) {
      const t = findSignChange(
        getCusp, part.t0, part.t1, part.cusp0, part.cusp1, EPSILON
      )
      subdivide(
        part,
        t,
        derive(t).normalize(),
        part.cusp0 < 0 ? -EPSILON : EPSILON,
        part.cusp1 < 0 ? -EPSILON : EPSILON
      )
      return
    }
    // The arc from the normal at the start to the one at the end:
    const angle = Math.atan2(
      part.utan1.cross(part.utan0),
      part.utan1.dot(part.utan0)
    )
    let a = 2 / 3 / (1 + Math.cos(angle / 2)) * 2 * Math.sin(angle / 2)
    let b = -a
    const dt = (part.t1 - part.t0) / (count + 1)
    const ts: number[] = []
    for (let i = 0; i < count; i++) {
      ts.push(part.t0 + (i + 1) * dt)
    }
    let points = getOffsetCurve(part, a, b)
    let error = getError(part, points, ts)
    const tolerance2 = tolerance * tolerance
    for (let i = 0; i < 2 && error.squared > tolerance2; i++) {
      const refined = refine(part, a, b, error)
      const points2 = getOffsetCurve(part, refined[0], refined[1])
      const error2 = getError(part, points2, ts)
      if (error2.squared >= error.squared) break
      a = refined[0]
      b = refined[1]
      points = points2
      error = error2
    }
    // Pieces within the tolerance of their start can't be off by
    // more, as near cusps of the offset, where the error doesn't
    // converge and subdivision only adds pieces of no length:
    const isShort = (
      points[1].getDistance(points[0]) < tolerance &&
      points[2].getDistance(points[0]) < tolerance &&
      points[3].getDistance(points[0]) < tolerance
    )
    if (part.depth < 16 && error.squared > tolerance2 && !isShort) {
      const split = getSubdivision(part)
      const cusp = getCusp(split.t)
      subdivide(part, split.t, split.utan, cusp, cusp)
    } else {
      addCurve(
        side,
        points[1].subtract(points[0]),
        points[3],
        points[2].subtract(points[3])
      )
    }
  }

  offsetPart({
    t0: 0,
    t1: 1,
    utan0,
    utan1,
    cusp0: getEndCusp(q0, c0),
    cusp1: getEndCusp(q2, c0 + c1 + c2),
    depth: 0
  })
  return side
}

// The times of the inflections of the curve:
export function getInflections(v: number[]): number[] {
  const p0 = new Point(v[0], v[1])
  const p1 = new Point(v[2], v[3])
  const p2 = new Point(v[4], v[5])
  const p3 = new Point(v[6], v[7])
  const a = p1.subtract(p0)
  const b = p2.subtract(p1).subtract(a)
  const c = p3.subtract(p0).subtract(p2.subtract(p1).multiply(3))
  const roots: number[] = []
  const count = solveQuadratic(
    b.cross(c),
    a.cross(c),
    a.cross(b),
    roots,
    0,
    1
  )
  return count > 0 ? roots.slice(0, count) : []
}

// Gives handles that are shorter than the dimension that length, towards
// the next control point, so that the curve's derivative doesn't vanish at
// its ends, and hooks too short to see don't turn its joins and caps (after
// kurbo's CubicBez::regularize()):
export function regularize(v: number[], dimension: number): number[] {
  const p0 = new Point(v[0], v[1])
  let p1 = new Point(v[2], v[3])
  let p2 = new Point(v[4], v[5])
  const p3 = new Point(v[6], v[7])
  const handle1 = p1.subtract(p0)
  const handle2 = p2.subtract(p3)
  if (handle1.length < dimension) {
    if (p0.getDistance(p2) >= dimension) {
      p1 = p0.add(p2.subtract(p0).normalize(dimension))
    } else {
      p1 = p0.add(p3.subtract(p0).divide(3))
      p2 = p3.add(p0.subtract(p3).divide(3))
    }
  }
  if (handle2.length < dimension) {
    if (p3.getDistance(p1) >= dimension) {
      p2 = p3.add(p1.subtract(p3).normalize(dimension))
    } else {
      p1 = p0.add(p3.subtract(p0).divide(3))
      p2 = p3.add(p0.subtract(p3).divide(3))
    }
  }
  return [p0.x, p0.y, p1.x, p1.y, p2.x, p2.y, p3.x, p3.y]
}

// Nudges the handles of a curve with a cusp within it, where its derivative
// vanishes, so that its curvature stays finite (kurbo's regularize_cusp()):
export function regularizeCusp(v: number[], dimension: number): number[] {
  const p0 = new Point(v[0], v[1])
  let p1 = new Point(v[2], v[3])
  let p2 = new Point(v[4], v[5])
  const p3 = new Point(v[6], v[7])
  const d01 = p1.subtract(p0)
  const d02 = p2.subtract(p0)
  const d03 = p3.subtract(p0)
  const d12 = p2.subtract(p1)
  const d23 = p3.subtract(p2)
  const det012 = d01.cross(d02)
  const det123 = d12.cross(d23)
  const det013 = d01.cross(d03)
  const det023 = d02.cross(d03)
  if (det012 * det123 > 0 && det012 * det013 < 0 && det012 * det023 < 0) {
    // The derivative is the quadratic of q0, q1, q2. Find where it is
    // shortest, and its curvature there:
    const q0 = d01.multiply(3)
    const q1 = d12.multiply(3)
    const q2 = d23.multiply(3)
    const t = Bezier.getNearestTime(
      [
        q0.x,
        q0.y,
        q0.x + (q1.x - q0.x) * 2 / 3,
        q0.y + (q1.y - q0.y) * 2 / 3,
        q2.x + (q1.x - q2.x) * 2 / 3,
        q2.y + (q1.y - q2.y) * 2 / 3,
        q2.x,
        q2.y
      ],
      new Point(0, 0)
    )
    const u = 1 - t
    const q = q0
      .multiply(u * u)
      .add(q1.multiply(2 * t * u))
      .add(q2.multiply(t * t))
    const dq = q1
      .subtract(q0)
      .multiply(2 * u)
      .add(q2.subtract(q1).multiply(2 * t))
    const cross = q.cross(dq)
    const distance2 = q.dot(q)
    if (
      distance2 * distance2 * distance2 <=
      cross * dimension * cross * dimension
    ) {
      const a = 3 * det012 + det023 - 2 * det013
      const b = -3 * det012 + det013
      const discriminant = b * b - 4 * a * det012
      const l01 = d01.length
      const l23 = d23.length
      if (discriminant > 0) {
        // A double inflection: keep the handles at least as long as
        // the dimension.
        if (l01 > 2 * dimension) {
          p1 = p1.subtract(d01.multiply(dimension / l01))
        }
        if (l23 > 2 * dimension) {
          p2 = p2.add(d23.multiply(dimension / l23))
        }
      } else {
        // A loop:
        p1 = p1.add(d01.multiply(dimension / l01))
        p2 = p2.subtract(d23.multiply(dimension / l23))
      }
    }
  }
  return [p0.x, p0.y, p1.x, p1.y, p2.x, p2.y, p3.x, p3.y]
}
