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

// The functions on the values of a cubic Bézier curve: the coordinates of its
// two points and of the two control points between them, as
// Curve#getValues() returns them. A straight line is one without handles.
import {
  CURVETIME_EPSILON,
  EPSILON,
  GEOMETRIC_EPSILON,
  findRoot,
  gauss,
  getEpsilon,
  integrate,
  isZero,
  solveCubic,
  solveQuadratic
} from '../util/numerical.ts'
import { Point } from '../basic/Point.ts'
import { Line } from '../basic/Line.ts'

// [x1, y1, handle1x, handle1y, handle2x, handle2y, x2, y2], with the control
// points in absolute coordinates:
export type BezierValues = number[]

// Whether the curve appears as a straight line, see Curve#isStraight():
export function isStraight(v: BezierValues): boolean {
  return testHandles(hasStraightHandles, v)
}

// Whether the curve is parametrically linear, see Curve#isLinear():
export function isLinear(v: BezierValues): boolean {
  return testHandles(hasLinearHandles, v)
}

export function subdivide(
  v: BezierValues,
  t = 0.5
): [BezierValues, BezierValues] {
  const x0 = v[0]
  const y0 = v[1]
  const x1 = v[2]
  const y1 = v[3]
  const x2 = v[4]
  const y2 = v[5]
  const x3 = v[6]
  const y3 = v[7]
  // Triangle computation, with loops unrolled.
  const u = 1 - t
  // Interpolate from 4 to 3 points
  const x4 = u * x0 + t * x1
  const y4 = u * y0 + t * y1
  const x5 = u * x1 + t * x2
  const y5 = u * y1 + t * y2
  const x6 = u * x2 + t * x3
  const y6 = u * y2 + t * y3
  // Interpolate from 3 to 2 points
  const x7 = u * x4 + t * x5
  const y7 = u * y4 + t * y5
  const x8 = u * x5 + t * x6
  const y8 = u * y5 + t * y6
  // Interpolate from 2 points to 1 point
  const x9 = u * x7 + t * x8
  const y9 = u * y7 + t * y8
  // We now have all the values we need to build the sub-curves:
  return [
    [x0, y0, x4, y4, x7, y7, x9, y9], // left
    [x9, y9, x8, y8, x6, y6, x3, y3] // right
  ]
}

// Splits the curve into curves that are monotone in x-direction, or in
// y-direction if dir is true. A curve that is monotone already is returned as
// the only one:
export function getMonoCurves(
  v: BezierValues,
  dir?: boolean
): BezierValues[] {
  const curves = []
  // Determine the ordinate index in the curve values array.
  const io = dir ? 0 : 1
  const o0 = v[io + 0]
  const o1 = v[io + 2]
  const o2 = v[io + 4]
  const o3 = v[io + 6]
  if (
    (o0 >= o1) === (o1 >= o2) && (o1 >= o2) === (o2 >= o3) ||
    isStraight(v)
  ) {
    // Straight curves and curves with all involved points ordered
    // in coordinate direction are guaranteed to be monotone.
    curves.push(v)
  } else {
    const a = 3 * (o1 - o2) - o0 + o3
    const b = 2 * (o0 + o2) - 4 * o1
    const c = o1 - o0
    const tMin = CURVETIME_EPSILON
    const tMax = 1 - tMin
    const roots = []
    const n = solveQuadratic(a, b, c, roots, tMin, tMax)
    if (!n) {
      curves.push(v)
    } else {
      roots.sort()
      let t = roots[0]
      let parts = subdivide(v, t)
      curves.push(parts[0])
      if (n > 1) {
        t = (roots[1] - t) / (1 - t)
        parts = subdivide(parts[1], t)
        curves.push(parts[0])
      }
      curves.push(parts[1])
    }
  }
  return curves
}

// Converts from the point coordinates (p0, p1, p2, p3) for one axis to
// the polynomial coefficients and solves the polynomial for val
export function solve(
  v: BezierValues,
  coord: number,
  val: number,
  roots: number[],
  min?: number,
  max?: number
): number {
  const v0 = v[coord]
  const v1 = v[coord + 2]
  const v2 = v[coord + 4]
  const v3 = v[coord + 6]
  let res = 0
  // If val is outside the curve values, no solution is possible.
  if (!(
    v0 < val && v3 < val && v1 < val && v2 < val ||
    v0 > val && v3 > val && v1 > val && v2 > val
  )) {
    const c = 3 * (v1 - v0)
    const b = 3 * (v2 - v1) - c
    const a = v3 - v0 - c - b
    res = solveCubic(a, b, c, v0 - val, roots, min, max)
  }
  return res
}

// Returns the part of the curve between the two times, reversed if the first
// one is the later:
export function getPart(
  v: BezierValues,
  from: number,
  to: number
): BezierValues {
  const flip = from > to
  if (flip) {
    const tmp = from
    from = to
    to = tmp
  }
  if (from > 0) {
    v = subdivide(v, from)[1] // [1] right
  }
  // Interpolate the parameter at 'to' in the new curve and cut there.
  if (to < 1) {
    v = subdivide(v, (to - from) / (1 - from))[0] // [0] left
  }
  // Return reversed curve if from / to were flipped:
  return flip
    ? [v[6], v[7], v[4], v[5], v[2], v[3], v[0], v[1]]
    : v
}

// Whether the curve is flat enough: it appears as a straight line, and its
// curve-time is linear enough, within the flatness as the largest error:
export function isFlatEnough(v: BezierValues, flatness: number): boolean {
  // Thanks to Kaspar Fischer and Roger Willcocks for the following:
  // http://hcklbrrfnn.files.wordpress.com/2012/08/bez.pdf
  const x0 = v[0]
  const y0 = v[1]
  const x1 = v[2]
  const y1 = v[3]
  const x2 = v[4]
  const y2 = v[5]
  const x3 = v[6]
  const y3 = v[7]
  const ux = 3 * x1 - 2 * x0 - x3
  const uy = 3 * y1 - 2 * y0 - y3
  const vx = 3 * x2 - 2 * x3 - x0
  const vy = 3 * y2 - 2 * y3 - y0
  return (
    Math.max(ux * ux, vx * vx) + Math.max(uy * uy, vy * vy) <=
    16 * flatness * flatness
  )
}

export function getArea(v: BezierValues): number {
  // http://objectmix.com/graphics/133553-area-closed-bezier-curve.html
  const x0 = v[0]
  const y0 = v[1]
  const x1 = v[2]
  const y1 = v[3]
  const x2 = v[4]
  const y2 = v[5]
  const x3 = v[6]
  const y3 = v[7]
  return (
    3 * (
      (y3 - y0) * (x1 + x2) -
      (x3 - x0) * (y1 + y2) +
      y1 * (x0 - x2) -
      x1 * (y0 - y2) +
      y3 * (x2 + x0 / 3) -
      x3 * (y2 + y0 / 3)
    ) /
    20
  )
}

export function classify(v: BezierValues): { type: string; roots: number[] } {
  // See: Loop and Blinn, 2005, Resolution Independent Curve Rendering
  // using Programmable Graphics Hardware, GPU Gems 3 chapter 25
  //
  // Possible types:
  //   'line'       (d1 == d2 == d3 == 0)
  //   'quadratic'  (d1 == d2 == 0)
  //   'serpentine' (d > 0)
  //   'cusp'       (d == 0)
  //   'loop'       (d < 0)
  //   'arch'       (serpentine, cusp or loop with roots outside 0..1)
  //
  // NOTE: Roots for serpentine, cusp and loop curves are only
  // considered if they are within 0..1. If the roots are outside,
  // then we degrade the type of curve down to an 'arch'.

  const x0 = v[0]
  const y0 = v[1]
  const x1 = v[2]
  const y1 = v[3]
  const x2 = v[4]
  const y2 = v[5]
  const x3 = v[6]
  const y3 = v[7]
  // Calculate coefficients of I(s, t), of which the roots are
  // inflection points.
  const a1 = x0 * (y3 - y2) + y0 * (x2 - x3) + x3 * y2 - y3 * x2
  const a2 = x1 * (y0 - y3) + y1 * (x3 - x0) + x0 * y3 - y0 * x3
  const a3 = x2 * (y1 - y0) + y2 * (x0 - x1) + x1 * y0 - y1 * x0
  let d3 = 3 * a3
  let d2 = d3 - a2
  let d1 = d2 - a2 + a1
  // Normalize the vector (d1, d2, d3) to keep error consistent,
  // but treat it as zero if it is within the rounding error of
  // the products of coordinates above, as for straight curves:
  const l = Math.sqrt(d1 * d1 + d2 * d2 + d3 * d3)
  const magnitude = Math.max(
    Math.abs(x0), Math.abs(y0), Math.abs(x1), Math.abs(y1),
    Math.abs(x2), Math.abs(y2), Math.abs(x3), Math.abs(y3)
  )
  const s = l > magnitude * getEpsilon(magnitude) ? 1 / l : 0
  const serpentine = 'serpentine' // short-cut
  d1 *= s
  d2 *= s
  d3 *= s

  function type(type: string, t1?: number, t2?: number) {
    // Roots at the ends, within the curve-time epsilon as in
    // getPeaks(), are the ends themselves, not points inside the
    // curve, and would make isCrossing() sample at a zero
    // distance (#1879, #1387):
    const tMin = CURVETIME_EPSILON
    const tMax = 1 - tMin
    const hasRoots = t1 !== undefined
    let t1Ok = hasRoots && t1 > tMin && t1 < tMax
    let t2Ok = hasRoots && t2 > tMin && t2 < tMax
    // Degrade to arch for serpentine, cusp or loop if no solutions
    // within 0..1 are found. loop requires 2 solutions to be valid.
    if (
      hasRoots &&
      (!(t1Ok || t2Ok) || type === 'loop' && !(t1Ok && t2Ok))
    ) {
      type = 'arch'
      t1Ok = t2Ok = false
    }
    return {
      type,
      roots:
        t1Ok || t2Ok
          ? t1Ok && t2Ok
            ? t1 < t2
              ? [t1, t2]
              : [t2, t1] // 2 solutions
            : [t1Ok ? t1 : t2] // 1 solution
          : null
    }
  }

  if (isZero(d1)) {
    return isZero(d2)
      ? type(isZero(d3) ? 'line' : 'quadratic') // 5. / 4.
      : type(serpentine, d3 / (3 * d2)) // 3b.
  }
  const d = 3 * d2 * d2 - 4 * d1 * d3
  if (isZero(d)) {
    return type('cusp', d2 / (2 * d1)) // 3a.
  }
  const f1 = d > 0 ? Math.sqrt(d / 3) : Math.sqrt(-d)
  const f2 = 2 * d1
  return type(
    d > 0 ? serpentine : 'loop', // 1. / 2.
    (d2 + f1) / f2,
    (d2 - f1) / f2
  )
}

export function getLength(v: BezierValues, a = 0, b = 1): number {
  if (isStraight(v)) {
    // Sub-divide the linear curve at a and b, so we can simply
    // calculate the Pythagorean Theorem to get the range's length.
    let c = v
    if (b < 1) {
      c = subdivide(c, b)[0] // left
      a /= b // Scale parameter to new sub-curve.
    }
    if (a > 0) {
      c = subdivide(c, a)[1] // right
    }
    // The length of straight curves can be calculated more easily.
    const dx = c[6] - c[0] // x3 - x0
    const dy = c[7] - c[1] // y3 - y0
    return Math.sqrt(dx * dx + dy * dy)
  }
  const c = getCoefficients(v)
  return getPartLength(c, getLengthIntegrand(c), a, b)
}

export function getTimeAt(
  v: BezierValues,
  offset: number,
  start = offset < 0 ? 1 : 0
): number {
  if (offset === 0) return start
  // See if we're going forward or backward, and handle cases
  // differently
  const abs = Math.abs
  const epsilon = EPSILON
  const forward = offset > 0
  const a = forward ? start : 0
  const b = forward ? 1 : start
  // Use the same integrand for both the range length and the part
  // lengths in f(t) below:
  const c = getCoefficients(v)
  const ds = getLengthIntegrand(c)
  const rangeLength = getPartLength(c, ds, a, b)
  const diff = abs(offset) - rangeLength
  if (abs(diff) < epsilon) {
    // Matched the end:
    return forward ? b : a
  } else if (diff > epsilon) {
    // We're out of bounds.
    return null
  }
  // Use offset / rangeLength for an initial guess for t, to
  // bring us closer:
  const guess = offset / rangeLength
  let length = 0
  // Iteratively calculate curve range lengths, and add them up.
  // This is much faster than not modifying start and calculating
  // total length each time.
  function f(t: number) {
    // When start > t, the length is negative.
    length += getPartLength(c, ds, start, t)
    start = t
    return length - offset
  }
  // Start with out initial guess for x.
  // NOTE: guess is a negative value when looking backwards.
  // Newton's method converges quadratically, so once its steps are
  // within the curve-time precision, the last one gets it exact:
  return findRoot(f, ds, start + guess, a, b, 32, CURVETIME_EPSILON)
}

export function getTimeOf(
  v: BezierValues,
  point: Point,
  tolerance?: number
): number | null {
  // Compare the beginning and end of the curve first, with the same
  // geometric epsilon as the solutions below: On straight curves,
  // which have no handles, a point near an end solves to a time far
  // from it, as the distance grows with the square of the time
  // there. At large coordinates, the epsilon can't be below their
  // resolution:
  const abs = Math.abs
  const x0 = v[0]
  const y0 = v[1]
  const x3 = v[6]
  const y3 = v[7]
  const px = point.x
  const py = point.y
  const epsilon = (
    tolerance ||
    getEpsilon(
      Math.max(
        abs(x0), abs(y0), abs(v[2]), abs(v[3]),
        abs(v[4]), abs(v[5]), abs(x3), abs(y3)
      ),
      GEOMETRIC_EPSILON
    )
  )

  function isClose(x: number, y: number) {
    const dx = x - px
    const dy = y - py
    return Math.sqrt(dx * dx + dy * dy) <= epsilon
  }

  if (isClose(x0, y0)) return 0
  if (isClose(x3, y3)) return 1
  // Solve the cubic for both x- and y-coordinates and consider all
  // solutions, testing them with the same epsilon. Calculate the
  // curve points as in evaluate(), but without creating them:
  const c = getCoefficients(v)
  const ax = c[0]
  const bx = c[1]
  const cx = c[2]
  const ay = c[3]
  const by = c[4]
  const cy = c[5]
  const roots = []
  for (let i = 0; i < 2; i++) {
    const count = solve(v, i, i ? py : px, roots, 0, 1)
    for (let j = 0; j < count; j++) {
      let t = roots[j]
      const x = getCoordinate(x0, x3, ax, bx, cx, t)
      const y = getCoordinate(y0, y3, ay, by, cy, t)
      if (isClose(x, y)) return t
      // A point off a slanted curve is further from the
      // solution of one coordinate than from the curve: Move
      // along the tangent to the foot of its normal, and test
      // that one too:
      const dx = (3 * ax * t + 2 * bx) * t + cx
      const dy = (3 * ay * t + 2 * by) * t + cy
      const length2 = dx * dx + dy * dy
      if (length2) {
        t = Math.max(
          0,
          Math.min(1, t + ((px - x) * dx + (py - y) * dy) / length2)
        )
        if (
          isClose(
            getCoordinate(x0, x3, ax, bx, cx, t),
            getCoordinate(y0, y3, ay, by, cy, t)
          )
        )
          return t
      }
    }
  }
  return null
}

export function getNearestTime(v: BezierValues, point: Point): number {
  const x0 = v[0]
  const y0 = v[1]
  const x3 = v[6]
  const y3 = v[7]
  const px = point.x
  const py = point.y
  if (isStraight(v)) {
    const vx = x3 - x0
    const vy = y3 - y0
    const det = vx * vx + vy * vy
    // Avoid divisions by zero.
    if (det === 0) return 0
    // Project the point onto the line and calculate its linear
    // parameter u along the line:
    // u = (point - p1).dot(v) / v.dot(v)
    const u = ((px - x0) * vx + (py - y0) * vy) / det
    return u < EPSILON
      ? 0
      : u > 1 - EPSILON
        ? 1
        : getTimeOf(v, new Point(x0 + u * vx, y0 + u * vy))
  }

  // Calculate curve points as in evaluate(), but without creating
  // them, as getDistance() is called a lot:
  const c = getCoefficients(v)
  const ax = c[0]
  const bx = c[1]
  const cx = c[2]
  const ay = c[3]
  const by = c[4]
  const cy = c[5]
  const count = 100
  const distances = []
  let minDistance = Infinity
  let minT = 0

  function getDistance(t: number) {
    const dx = getCoordinate(x0, x3, ax, bx, cx, t) - px
    const dy = getCoordinate(y0, y3, ay, by, cy, t) - py
    return dx * dx + dy * dy
  }

  for (let i = 0; i <= count; i++) {
    distances.push(getDistance(i / count))
  }

  // Refine the solution around each sample closer than its
  // neighbors until we reach the desired precision, as the nearest
  // point may lie between any of these and the next samples:
  for (let i = 0; i <= count; i++) {
    let distance = distances[i]
    if (
      (i === 0 || distance < distances[i - 1]) &&
      (i === count || distance <= distances[i + 1])
    ) {
      let t = i / count
      let step = 1 / (count * 2)
      while (step > CURVETIME_EPSILON) {
        const t1 = t - step
        const t2 = t + step
        const distance1 = t1 >= 0 ? getDistance(t1) : Infinity
        const distance2 = t2 <= 1 ? getDistance(t2) : Infinity
        if (distance1 < distance && distance1 <= distance2) {
          t = t1
          distance = distance1
        } else if (distance2 < distance) {
          t = t2
          distance = distance2
        } else {
          step /= 2
        }
      }
      if (distance < minDistance) {
        minDistance = distance
        minT = t
      }
    }
  }
  return minT
}

export function getPoint(v: BezierValues, t: number): Point {
  return evaluate(v, t, 0, false)
}

export function getTangent(v: BezierValues, t: number): Point {
  return evaluate(v, t, 1, true)
}

export function getWeightedTangent(v: BezierValues, t: number): Point {
  return evaluate(v, t, 1, false)
}

export function getNormal(v: BezierValues, t: number): Point {
  return evaluate(v, t, 2, true)
}

export function getWeightedNormal(v: BezierValues, t: number): Point {
  return evaluate(v, t, 2, false)
}

export function getCurvature(v: BezierValues, t: number): number {
  return evaluate(v, t, 3, false).x
}

// Returns the times of the peaks of the curve, the roots of the dot product
// of its first and second derivative. Peaks share some qualities of
// curvature extrema, but are cheaper to compute, see:
// https://math.stackexchange.com/questions/1954845/bezier-curvature-extrema
export function getPeaks(v: BezierValues): number[] {
  const c = getCoefficients(v)
  const ax = c[0]
  const bx = c[1]
  const cx = c[2]
  const ay = c[3]
  const by = c[4]
  const cy = c[5]
  const tMin = CURVETIME_EPSILON
  const tMax = 1 - tMin
  const roots = []
  solveCubic(
    9 * (ax * ax + ay * ay),
    9 * (ax * bx + by * ay),
    2 * (bx * bx + by * by) + 3 * (cx * ax + cy * ay),
    cx * bx + by * cy,
    // Exclude 0 and 1 as we don't count them as peaks.
    roots,
    tMin,
    tMax
  )
  return roots.sort()
}

// Returns the sorted times where the curve reverses its direction along the
// line that all of its control points lie along within the tolerance, if any:
export function getReversals(v: BezierValues, tolerance: number): number[] {
  // The line's direction, along the longest of the chord and handles:
  let dx = v[6] - v[0]
  let dy = v[7] - v[1]
  for (let i = 0; i < 4; i += 2) {
    const hx = v[i + 2] - v[i]
    const hy = v[i + 3] - v[i + 1]
    if (hx * hx + hy * hy > dx * dx + dy * dy) {
      dx = hx
      dy = hy
    }
  }
  const length = Math.sqrt(dx * dx + dy * dy)
  const o = []
  if (!length) return []
  for (let i = 0; i < 8; i += 2) {
    const x = v[i] - v[0]
    const y = v[i + 1] - v[1]
    if (Math.abs(x * dy - y * dx) > tolerance * length) return []
    // The control point's position along the line:
    o.push((x * dx + y * dy) / length)
  }
  const roots = []
  const count = solveQuadratic(
    3 * (o[1] - o[2]) - o[0] + o[3],
    2 * (o[0] + o[2]) - 4 * o[1],
    o[1] - o[0],
    roots,
    CURVETIME_EPSILON,
    1 - CURVETIME_EPSILON
  )
  return count > 0 ? roots.slice(0, count).sort((a, b) => a - b) : []
}

// Returns the times where the curve is tangential to the tangent, at most
// two, including those at its start and end:
export function getTimesWithTangent(v: BezierValues, tangent: Point): number[] {
  // Algorithm adapted from:
  // https://stackoverflow.com/a/34837312/7615922
  // The coefficients of the derivative of the curve's polynomial:
  const c = getCoefficients(v)
  const ax = 3 * c[0]
  const bx = 2 * c[1]
  const cx = c[2]
  const ay = 3 * c[3]
  const by = 2 * c[4]
  const cy = c[5]
  const normalized = tangent.normalize()
  const tx = normalized.x
  const ty = normalized.y
  let den = 2 * ax * ty - 2 * ay * tx
  const times = []
  if (Math.abs(den) < CURVETIME_EPSILON) {
    const num = cx * ty - cy * tx
    den = bx * ty - by * tx
    if (den != 0) {
      const t = -num / den
      if (t >= 0 && t <= 1) {
        times.push(t)
      }
    }
  } else {
    const delta = (
      (bx * bx - 4 * ax * cx) * ty * ty +
      (-2 * bx * by + 4 * ay * cx + 4 * ax * cy) * tx * ty +
      (by * by - 4 * ay * cy) * tx * tx
    )
    const k = bx * ty - by * tx
    if (delta >= 0 && den != 0) {
      const d = Math.sqrt(delta)
      const t0 = -(k + d) / den
      const t1 = (-k + d) / den
      if (t0 >= 0 && t0 <= 1) {
        times.push(t0)
      }
      if (t1 >= 0 && t1 <= 1) {
        times.push(t1)
      }
    }
  }
  return times
}

// Calls a test of the handles with the coordinates of the curve's points
// and their handles:
function testHandles(test: typeof hasStraightHandles, v: BezierValues) {
  const x1 = v[0]
  const y1 = v[1]
  const x2 = v[6]
  const y2 = v[7]
  return test(
    x1, y1,
    v[2] - x1, v[3] - y1,
    v[4] - x2, v[5] - y2,
    x2, y2
  )
}

// The tests for Curve#isStraight() and #isLinear() by the coordinates of the
// points and their handles, which Curve passes from its segments without
// creating points or arrays, as these are called a lot:
export function hasStraightHandles(
  x1: number, y1: number,
  h1x: number, h1y: number,
  h2x: number, h2y: number,
  x2: number, y2: number
): boolean {
  if (isZero(h1x) && isZero(h1y) && isZero(h2x) && isZero(h2y)) {
    // No handles.
    return true
  } else {
    const isCollinear = Point.isCollinear
    const vx = x2 - x1
    const vy = y2 - y1
    if (isZero(vx) && isZero(vy)) {
      // Zero-length line, with some handles defined.
      return false
    } else if (
      isCollinear(vx, vy, h1x, h1y) &&
      isCollinear(vx, vy, h2x, h2y)
    ) {
      // Collinear handles: In addition to v.isCollinear(h) checks, we
      // need to measure the distance to the line, in order to be able
      // to use the same epsilon as in Curve#getTimeOf(), see #1066.
      const getDistance = Line.getDistance
      const epsilon = GEOMETRIC_EPSILON
      if (
        (
          getDistance(x1, y1, vx, vy, x1 + h1x, y1 + h1y, true) <
          epsilon
        ) && (
          getDistance(x1, y1, vx, vy, x2 + h2x, y2 + h2y, true) <
          epsilon
        )
      ) {
        // Project handles onto line to see if they are in range:
        const div = vx * vx + vy * vy
        const s1 = (vx * h1x + vy * h1y) / div
        const s2 = (vx * h2x + vy * h2y) / div
        return s1 >= 0 && s1 <= 1 && s2 <= 0 && s2 >= -1
      }
    }
  }
  return false
}

export function hasLinearHandles(
  x1: number, y1: number,
  h1x: number, h1y: number,
  h2x: number, h2y: number,
  x2: number, y2: number
): boolean {
  const x = (x2 - x1) / 3
  const y = (y2 - y1) / 3
  return h1x === x && h1y === y && -h2x === x && -h2y === y
}

// Returns the speed of the curve with the coefficients that
// getCoefficients() returns:
function getLengthIntegrand(c: number[]): (t: number) => number {
  // The coefficients of the derivative of the curve's polynomial:
  const ax = 3 * c[0]
  const bx = 2 * c[1]
  const cx = c[2]
  const ay = 3 * c[3]
  const by = 2 * c[4]
  const cy = c[5]

  return function (t) {
    // Calculate quadratic equations of derivatives for x and y
    const dx = (ax * t + bx) * t + cx
    const dy = (ay * t + by) * t + cy
    return Math.sqrt(dx * dx + dy * dy)
  }
}

// The length of the curve with the coefficients that getCoefficients()
// returns and the speed ds between the times a and b. Near cusps, the
// speed bends too sharply where it turns for the integration to follow,
// so we integrate it separately on both sides there:
function getPartLength(
  c: number[],
  ds: (t: number) => number,
  a: number,
  b: number
): number {
  if (a > b) return -getPartLength(c, ds, b, a)
  // The coefficients of the derivative, as in getLengthIntegrand():
  const ax = 3 * c[0]
  const bx = 2 * c[1]
  const cx = c[2]
  const ay = 3 * c[3]
  const by = 2 * c[4]
  const cy = c[5]
  const tolerance = GEOMETRIC_EPSILON
  // Between a and b, the derivative is a quadratic curve with these
  // control points, and its speed is at least its projection onto
  // their sum:
  const x0 = (ax * a + bx) * a + cx
  const y0 = (ay * a + by) * a + cy
  const x1 = ax * a * b + bx * (a + b) * 0.5 + cx
  const y1 = ay * a * b + by * (a + b) * 0.5 + cy
  const x2 = (ax * b + bx) * b + cx
  const y2 = (ay * b + by) * b + cy
  const sx = x0 + x1 + x2
  const sy = y0 + y1 + y2
  const p0 = x0 * sx + y0 * sy
  const p1 = x1 * sx + y1 * sy
  const p2 = x2 * sx + y2 * sy
  const l0 = x0 * x0 + y0 * y0
  const l1 = x1 * x1 + y1 * y1
  const l2 = x2 * x2 + y2 * y2
  const max = l0 > l1 ? (l0 > l2 ? l0 : l2) : l1 > l2 ? l1 : l2
  // Where the middle projection is at least a tenth of the largest
  // control point and the ones at the ends don't point backwards, the
  // speed can only get low at the ends, from where it grows steadily:
  if (
    p0 >= 0 &&
    p2 >= 0 &&
    p1 > 0 &&
    p1 * p1 > 0.01 * (sx * sx + sy * sy) * max
  ) {
    // Where the control points also lie closer together than a tenth
    // of the lowest speed, the 7-point Gauss rule's error shrinks
    // with the seventh power of that ratio to within the tolerance:
    const min = p0 < p1 ? (p0 < p2 ? p0 : p2) : p1 < p2 ? p1 : p2
    const d01 = (x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0)
    const d12 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1)
    return (
      (d01 > d12 ? d01 : d12) * (sx * sx + sy * sy) <
      0.01 * min * min
    )
      ? gauss(ds, a, b)
      : integrate(ds, a, b, tolerance)
  }
  // The speed turns where the derivative is normal to its own
  // derivative:
  const times = []
  const count = Math.max(
    0,
    solveCubic(
      2 * (ax * ax + ay * ay),
      3 * (ax * bx + ay * by),
      bx * bx + by * by + 2 * (ax * cx + ay * cy),
      bx * cx + by * cy,
      times,
      a,
      b
    )
  )
  let length = 0
  times.length = count
  times.sort((t1, t2) => t1 - t2)
  times.push(b)
  for (let i = 0; i <= count; i++) {
    const t = times[i]
    if (t > a) {
      length += integrate(ds, a, t, tolerance)
      a = t
    }
  }
  return length
}

function getCoefficients(v: BezierValues): number[] {
  const x0 = v[0]
  const y0 = v[1]
  let x1 = v[2]
  let y1 = v[3]
  let x2 = v[4]
  let y2 = v[5]
  const x3 = v[6]
  const y3 = v[7]
  // If the curve handles are almost zero, reset the control points to the
  // anchors.
  if (isZero(x1 - x0) && isZero(y1 - y0)) {
    x1 = x0
    y1 = y0
  }
  if (isZero(x2 - x3) && isZero(y2 - y3)) {
    x2 = x3
    y2 = y3
  }
  // Calculate the polynomial coefficients, and return them along with
  // the control points that evaluate() needs at the ends:
  const cx = 3 * (x1 - x0)
  const bx = 3 * (x2 - x1) - cx
  const ax = x3 - x0 - cx - bx
  const cy = 3 * (y1 - y0)
  const by = 3 * (y2 - y1) - cy
  const ay = y3 - y0 - cy - by
  return [ax, bx, cx, ay, by, cy, x1, y1, x2, y2]
}

function getCoordinate(
  v0: number,
  v3: number,
  a: number,
  b: number,
  c: number,
  t: number
): number {
  // Calculate one coordinate of the curve point at parameter value t,
  // from the coefficients that getCoefficients() returns. Use special
  // handling at t === 0 / 1, to avoid imprecisions. See #960
  return t === 0 ? v0 : t === 1 ? v3 : ((a * t + b) * t + c) * t + v0
}

function evaluate(
  v: BezierValues,
  t: number,
  type: number,
  normalized: boolean
): Point {
  // Do not produce results if parameter is out of range or invalid.
  if (t == null || t < 0 || t > 1) return null
  const x0 = v[0]
  const y0 = v[1]
  const x3 = v[6]
  const y3 = v[7]
  const c = getCoefficients(v)
  const ax = c[0]
  const bx = c[1]
  const cx = c[2]
  const ay = c[3]
  const by = c[4]
  const cy = c[5]
  const x1 = c[6]
  const y1 = c[7]
  let x2 = c[8]
  let y2 = c[9]
  let x: number
  let y: number
  if (type === 0) {
    // type === 0: getPoint()
    x = getCoordinate(x0, x3, ax, bx, cx, t)
    y = getCoordinate(y0, y3, ay, by, cy, t)
  } else {
    // type === 1: getTangent()
    // type === 2: getNormal()
    // type === 3: getCurvature()
    const tMin = CURVETIME_EPSILON
    const tMax = 1 - tMin
    // 1: tangent, 1st derivative
    // 2: normal, 1st derivative
    // 3: curvature, 1st derivative & 2nd derivative
    // Prevent tangents and normals of length 0:
    // https://stackoverflow.com/questions/10506868/
    if (t < tMin) {
      x = cx
      y = cy
    } else if (t > tMax) {
      x = 3 * (x3 - x2)
      y = 3 * (y3 - y2)
    } else {
      x = (3 * ax * t + 2 * bx) * t + cx
      y = (3 * ay * t + 2 * by) * t + cy
    }
    if (normalized) {
      // When the tangent at t is zero and we're at the beginning
      // or the end, we can use the vector between the handles,
      // but only when normalizing as its weighted length is 0.
      if (x === 0 && y === 0 && (t < tMin || t > tMax)) {
        x = x2 - x1
        y = y2 - y1
      }
      // Now normalize x & y
      const length = Math.sqrt(x * x + y * y)
      if (length) {
        x /= length
        y /= length
      }
    }
    if (type === 3) {
      // Calculate 2nd derivative, and curvature from there:
      // http://cagd.cs.byu.edu/~557/text/ch2.pdf page#31
      // k = |dx * d2y - dy * d2x| / (( dx^2 + dy^2 )^(3/2))
      x2 = 6 * ax * t + 2 * bx
      y2 = 6 * ay * t + 2 * by
      const d = Math.pow(x * x + y * y, 3 / 2)
      // For JS optimizations we always return a Point, although
      // curvature is just a numeric value, stored in x:
      x = d !== 0 ? (x * y2 - y * x2) / d : 0
      y = 0
    }
  }
  // The normal is simply the rotated tangent:
  return type === 2 ? new Point(y, -x) : new Point(x, y)
}
