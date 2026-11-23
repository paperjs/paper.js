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

// The intersections of cubic Bézier curves by their values, using fat-line
// clipping. The curves are only values here, with the ends that they share
// on their path, and the intersections the times on them, so this works for
// any kind of curve and location.
import {
  CURVETIME_EPSILON,
  GEOMETRIC_EPSILON,
  MACHINE_EPSILON,
  getEpsilon,
  isZero,
  solveBernstein
} from '../util/numerical.ts'
import { Point } from '../basic/Point.ts'
import { Line } from '../basic/Line.ts'
import {
  classifyCurve,
  getCurvePart,
  getCurvePoint,
  getCurveTimeAt,
  getCurveTimeOf,
  isStraightCurve,
  solveCurve,
  subdivideCurve
} from './bezier.ts'
import type { CurveValues } from './bezier.ts'

// An intersection of two curves by the times on them, or one end of an
// overlap of them:
export type Intersection = [time1: number, time2: number, overlap?: boolean]

// How the two curves that are intersected connect on their path, as the end
// that neighbors share is no intersection, and the distance under which the
// boolean operations take curves as touching or overlapping:
export type IntersectionOptions = {
  // Whether the first curve starts where the second one ends:
  sharesStart?: boolean
  // Whether the first curve ends where the second one starts:
  sharesEnd?: boolean
  tolerance?: number
}

// The two curves on their way through the functions: their intersections as
// they are found, the ends that they share, the tolerance, and the calls of
// addCurveIntersections() so far:
type Pair = {
  intersections: Intersection[]
  sharesStart: boolean
  sharesEnd: boolean
  tolerance?: number
  calls: number
}

// Returns the intersections of the two curves, and the ends of their
// overlaps:
export function getCurveIntersections(
  v1: CurveValues,
  v2: CurveValues,
  options?: IntersectionOptions
): Intersection[] {
  const { sharesStart, sharesEnd, tolerance } = options ?? {}
  const pair: Pair = {
    intersections: [],
    sharesStart,
    sharesEnd,
    tolerance,
    calls: 0
  }
  const { min, max, abs } = Math
  const minX1 = min(v1[0], v1[2], v1[4], v1[6])
  const maxX1 = max(v1[0], v1[2], v1[4], v1[6])
  const minY1 = min(v1[1], v1[3], v1[5], v1[7])
  const maxY1 = max(v1[1], v1[3], v1[5], v1[7])
  const minX2 = min(v2[0], v2[2], v2[4], v2[6])
  const maxX2 = max(v2[0], v2[2], v2[4], v2[6])
  const minY2 = min(v2[1], v2[3], v2[5], v2[7])
  const maxY2 = max(v2[1], v2[3], v2[5], v2[7])
  // Bounds that only touch need a tolerance, also at large
  // coordinates:
  const epsilon = getEpsilon(
    max(
      abs(minX1), abs(maxX1), abs(minY1), abs(maxY1),
      abs(minX2), abs(maxX2), abs(minY2), abs(maxY2)
    )
  )

  // Avoid checking curves if completely out of control bounds, but not
  // curves that getCurveOverlaps() may still find to overlap:
  const boundsEpsilon = max(epsilon, tolerance || GEOMETRIC_EPSILON)
  if (
    maxX1 + boundsEpsilon > minX2 &&
    minX1 - boundsEpsilon < maxX2 &&
    maxY1 + boundsEpsilon > minY2 &&
    minY1 - boundsEpsilon < maxY2
  ) {
    // Now detect and handle overlaps:
    const overlaps = getCurveOverlaps(v1, v2, tolerance)
    if (overlaps) {
      for (let i = 0; i < 2; i++) {
        const overlap = overlaps[i]
        addLocation(pair, overlap[0], overlap[1], false, true)
      }
    } else {
      const straight1 = isStraightCurve(v1)
      const straight2 = isStraightCurve(v2)
      const straight = straight1 && straight2
      let isFound = false
      // Intersections with lines snap to their ends within the
      // geometric epsilon, but not further than a smaller
      // tolerance, as the points of one may lie no further apart:
      const lineTolerance = tolerance < GEOMETRIC_EPSILON ? tolerance : null
      // Determine the correct intersection method based on whether
      // one or curves are straight lines:
      if (straight) {
        isFound = addLineIntersection(v1, v2, pair, lineTolerance)
      } else if (straight1 || straight2) {
        addCurveLineIntersections(
          straight1 ? v2 : v1,
          straight1 ? v1 : v2,
          pair,
          straight1,
          lineTolerance
        )
      } else {
        // recursion, tMin, tMax, uMin, uMax:
        addCurveIntersections(v1, v2, pair, false, 0, 0, 1, 0, 1)
      }
      // Handle the special case where the start- / end-points of one
      // curve lie on the other curve, within the tolerance if one is
      // passed, but only if haven't found a line-line intersection
      // already: #805#issuecomment-148503018
      if (!isFound) {
        const endEpsilon = tolerance || epsilon
        for (let i = 0; i < 4; i++) {
          const isSecond = i >> 1 // 0, 0, 1, 1
          const t = i & 1 // 0, 1, 0, 1
          const v = isSecond ? v2 : v1
          const x = v[t * 6]
          const y = v[t * 6 + 1]
          // Only ends in the other curve's bounds can lie on it:
          if (
            isSecond
              ? x >= minX1 - endEpsilon &&
                x <= maxX1 + endEpsilon &&
                y >= minY1 - endEpsilon &&
                y <= maxY1 + endEpsilon
              : x >= minX2 - endEpsilon &&
                x <= maxX2 + endEpsilon &&
                y >= minY2 - endEpsilon &&
                y <= maxY2 + endEpsilon
          ) {
            const u = getCurveTimeOf(
              isSecond ? v1 : v2,
              new Point(x, y),
              endEpsilon
            )
            if (u !== null) {
              addLocation(pair, t, u, !!isSecond)
            }
          }
        }
      }
    }
  }
  return pair.intersections
}

// Returns the intersection of the curve with itself, if it has a loop. A
// curve that is closed, as the only one of its path, starts where it ends:
export function getCurveSelfIntersection(
  v: CurveValues,
  isClosed?: boolean
): Intersection[] {
  const pair: Pair = {
    intersections: [],
    sharesStart: isClosed,
    sharesEnd: false,
    calls: 0
  }
  const info = classifyCurve(v)
  if (info.type === 'loop') {
    const { roots } = info
    addLocation(pair, roots[0], roots[1])
  }
  return pair.intersections
}

// Returns the two pairs of times where the curves start and end to overlap,
// if they do, based on work by iconexperience in #648:
export function getCurveOverlaps(
  v1: CurveValues,
  v2: CurveValues,
  tolerance?: number
): number[][] | null {
  // Linear curves can only overlap if they are collinear. Instead of
  // using the #isCollinear() check, we pick the longer of the two curves
  // treated as lines, and see how far the starting and end points of the
  // other line are from this line (assumed as an infinite line). But even
  // if the curves are not straight, they might just have tiny handles
  // within geometric epsilon distance, so we have to check for that too.

  function getSquaredLineLength(v: CurveValues) {
    const x = v[6] - v[0]
    const y = v[7] - v[1]
    return x * x + y * y
  }

  const { abs } = Math
  const { getDistance } = Line
  const timeEpsilon = CURVETIME_EPSILON
  const geometricEpsilon = tolerance || GEOMETRIC_EPSILON
  let straight1 = isStraightCurve(v1)
  let straight2 = isStraightCurve(v2)
  let straightBoth = straight1 && straight2
  const flip = getSquaredLineLength(v1) < getSquaredLineLength(v2)
  const l1 = flip ? v2 : v1
  const l2 = flip ? v1 : v2
  // Get l1 start and end point values for faster referencing.
  const px = l1[0]
  const py = l1[1]
  const vx = l1[6] - px
  const vy = l1[7] - py
  // See if the starting and end point of curve two are very close to the
  // picked line. Note that the curve for the picked line might not
  // actually be a line, so we have to perform more checks after.
  if (
    getDistance(px, py, vx, vy, l2[0], l2[1], true) < geometricEpsilon &&
    getDistance(px, py, vx, vy, l2[6], l2[7], true) < geometricEpsilon
  ) {
    // If not both curves are straight, check against both of their
    // handles, and treat them as straight if they are very close.
    if (
      !straightBoth &&
      getDistance(px, py, vx, vy, l1[2], l1[3], true) < geometricEpsilon &&
      getDistance(px, py, vx, vy, l1[4], l1[5], true) < geometricEpsilon &&
      getDistance(px, py, vx, vy, l2[2], l2[3], true) < geometricEpsilon &&
      getDistance(px, py, vx, vy, l2[4], l2[5], true) < geometricEpsilon
    ) {
      straight1 = straight2 = straightBoth = true
    }
  } else if (straightBoth) {
    // If both curves are straight and not very close to each other,
    // there can't be a solution.
    return null
  }
  if (straight1 !== straight2) {
    // If one curve is straight, the other curve must be straight too,
    // otherwise they cannot overlap.
    return null
  }

  const v = [v1, v2]
  let pairs = []
  // Iterate through all end points:
  // First p1 of curve 1 & 2, then p2 of curve 1 & 2.
  for (let i = 0; i < 4 && pairs.length < 2; i++) {
    const i1 = i & 1 // 0, 1, 0, 1
    const i2 = i1 ^ 1 // 1, 0, 1, 0
    const t1 = i >> 1 // 0, 0, 1, 1
    const t2 = getCurveTimeOf(
      v[i1],
      new Point(
        v[i2][t1 ? 6 : 0],
        v[i2][t1 ? 7 : 1]
      ),
      geometricEpsilon
    )
    if (t2 != null) {
      // If point is on curve
      const pair = i1 ? [t1, t2] : [t2, t1]
      // Filter out tiny overlaps.
      if (
        !pairs.length || (
          abs(pair[0] - pairs[0][0]) > timeEpsilon &&
          abs(pair[1] - pairs[0][1]) > timeEpsilon
        )
      ) {
        pairs.push(pair)
      }
    }
    // We checked 3 points but found no match, curves can't overlap.
    if (i > 2 && !pairs.length) break
  }
  if (pairs.length !== 2) {
    pairs = null
  } else if (!straightBoth) {
    // Straight pairs don't need further checks. If we found 2 pairs,
    // the end points on v1 & v2 should be the same.
    const o1 = getCurvePart(v1, pairs[0][0], pairs[1][0])
    const o2 = getCurvePart(v2, pairs[0][1], pairs[1][1])
    // Check if handles of the overlapping curves are the same too.
    if (
      abs(o2[2] - o1[2]) > geometricEpsilon ||
      abs(o2[3] - o1[3]) > geometricEpsilon ||
      abs(o2[4] - o1[4]) > geometricEpsilon ||
      abs(o2[5] - o1[5]) > geometricEpsilon
    ) {
      pairs = null
    }
  }
  return pairs
}

// Adds the intersection of the two curves at their times, unless it is the
// end that neighboring curves share, and returns whether it did. With
// `flip`, the times are those of the second curve and the first:
function addLocation(
  pair: Pair,
  t1: number,
  t2: number,
  flip?: boolean,
  overlap?: boolean
): boolean {
  if (flip) {
    const t = t1
    t1 = t2
    t2 = t
  }
  // The ends of neighbors are part of overlaps, as the curves could overlap
  // themselves there:
  const excludeStart = !overlap && pair.sharesStart
  const excludeEnd = !overlap && pair.sharesEnd
  const tMin = CURVETIME_EPSILON
  const tMax = 1 - tMin
  // Where the start of the first curve connects to the end of the second,
  // the start is excluded on the first and the end on the second, and the
  // other way around where its end connects to the start of the second:
  const isValid = (
    t1 !== null &&
    t1 >= (excludeStart ? tMin : 0) &&
    t1 <= (excludeEnd ? tMax : 1) &&
    t2 !== null &&
    t2 >= (excludeEnd ? tMin : 0) &&
    t2 <= (excludeStart ? tMax : 1)
  )
  if (isValid) {
    pair.intersections.push(overlap ? [t1, t2, true] : [t1, t2])
  }
  return isValid
}

function addCurveIntersections(
  v1: CurveValues,
  v2: CurveValues,
  pair: Pair,
  flip: boolean,
  recursion: number,
  tMin: number,
  tMax: number,
  uMin: number,
  uMax: number
) {
  // Avoid deeper recursion, by counting the total amount of recursions,
  // as well as the total amount of calls, to avoid massive call-trees as
  // suggested by @iconexperience in #904#issuecomment-225283430.
  // See also: #565 #899 #1074
  if (++pair.calls >= 4096 || ++recursion >= 40) return
  const { tolerance } = pair
  // A piece of the second curve only a few units in the last place of its
  // coordinates long has no direction left to clip the first one with, as
  // the rounding of its ends turns it. Locate it on the first one as a point:
  const dx = v2[6] - v2[0]
  const dy = v2[7] - v2[1]
  const magnitude = Math.max(
    Math.abs(v2[0]), Math.abs(v2[1]), Math.abs(v2[6]), Math.abs(v2[7])
  )
  if (Math.hypot(dx, dy) < 64 * MACHINE_EPSILON * magnitude) {
    const t = getCurveTimeOf(v1, getCurvePoint(v2, 0.5))
    if (t !== null) {
      addLocation(pair, tMin + (tMax - tMin) * t, (uMin + uMax) / 2, flip)
    }
    return
  }
  // Use an epsilon smaller than CURVETIME_EPSILON to compare curve-time
  // parameters in fat-line clipping code.
  const fatLineEpsilon = 1e-9
  // Let P be the first curve and Q be the second
  const q0x = v2[0]
  const q0y = v2[1]
  const q3x = v2[6]
  const q3y = v2[7]
  const { getSignedDistance } = Line
  // Calculate the fat-line L for Q is the baseline l and two
  // offsets which completely encloses the curve P.
  const d1 = getSignedDistance(q0x, q0y, q3x, q3y, v2[2], v2[3])
  const d2 = getSignedDistance(q0x, q0y, q3x, q3y, v2[4], v2[5])
  const factor = d1 * d2 > 0 ? 3 / 4 : 4 / 9
  const dMin = factor * Math.min(0, d1, d2)
  const dMax = factor * Math.max(0, d1, d2)
  // Calculate non-parametric bezier curve D(ti, di(t)):
  // - di(t) is the distance of P from baseline l of the fat-line
  // - ti is equally spaced in [0, 1]
  const dp0 = getSignedDistance(q0x, q0y, q3x, q3y, v1[0], v1[1])
  const dp1 = getSignedDistance(q0x, q0y, q3x, q3y, v1[2], v1[3])
  const dp2 = getSignedDistance(q0x, q0y, q3x, q3y, v1[4], v1[5])
  const dp3 = getSignedDistance(q0x, q0y, q3x, q3y, v1[6], v1[7])
  // Get the top and bottom parts of the convex-hull
  const [top, bottom] = getConvexHull(dp0, dp1, dp2, dp3)
  // Where both pieces converge on a crossing from one side, the first one
  // ends on the fat line, and misses it by the rounding of its distances.
  // So only a piece further away than their resolution has no intersection:
  const resolution = 4 * MACHINE_EPSILON * magnitude
  const clip = (top: number[][], bottom: number[][]) => (
    clipConvexHull(top, bottom, dMin, dMax) ??
    clipConvexHull(top, bottom, dMin - resolution, dMax + resolution)
  )
  let tMinClip: number
  let tMaxClip: number
  // Stop iteration if all points and control points are collinear.
  if (
    (
      d1 === 0 &&
      d2 === 0 &&
      dp0 === 0 &&
      dp1 === 0 &&
      dp2 === 0 &&
      dp3 === 0
    ) ||
    // Clip convex-hull with dMin and dMax, taking into account that
    // there will be no intersections if one of the results is null.
    (tMinClip = clip(top, bottom)) == null ||
    (tMaxClip = clip(top.reverse(), bottom.reverse())) == null
  )
    return
  // tMin and tMax are within the range (0, 1). Project it back to the
  // original parameter range for v2.
  let tMinNew = tMin + (tMax - tMin) * tMinClip
  let tMaxNew = tMin + (tMax - tMin) * tMaxClip
  if (Math.max(uMax - uMin, tMaxNew - tMinNew) < fatLineEpsilon) {
    // We have isolated the intersection with sufficient precision
    const t = (tMinNew + tMaxNew) / 2
    const u = (uMin + uMax) / 2
    addLocation(pair, t, u, flip)
  } else {
    // Apply the result of the clipping to curve 1:
    v1 = getCurvePart(v1, tMinClip, tMaxClip)
    const uDiff = uMax - uMin
    if (tMaxClip - tMinClip > 0.8) {
      // With a tolerance, crossings within it of the shared end of
      // neighbouring curves merge into it: cut off the parts of both
      // pieces within it by arc length, and clip the rest again.
      // Otherwise, find the intersections of the pieces where
      // clipping stalls through the implicit form of v2, unless they
      // both lie on the same implicit curve, as parts of one curve:
      // At the end of the first piece, or at its start:
      const atEnd = (
        tolerance &&
        tMaxNew === 1 &&
        uMin === 0 &&
        (flip ? pair.sharesStart : pair.sharesEnd)
      )
      const atStart = (
        tolerance &&
        !atEnd &&
        tMinNew === 0 &&
        uMax === 1 &&
        (flip ? pair.sharesEnd : pair.sharesStart)
      )
      if (atEnd || atStart) {
        const offset = atEnd ? tolerance : -tolerance
        const s1 = getCurveTimeAt(v1, -offset)
        const s2 = getCurveTimeAt(v2, offset)
        // Pieces shorter than the tolerance have nothing left:
        if (s1 !== null && s2 !== null) {
          const t = tMinNew + (tMaxNew - tMinNew) * s1
          const u = uMin + (uMax - uMin) * s2
          if (atEnd) {
            v1 = getCurvePart(v1, 0, s1)
            v2 = getCurvePart(v2, s2, 1)
            tMaxNew = t
            uMin = u
          } else {
            v1 = getCurvePart(v1, s1, 1)
            v2 = getCurvePart(v2, 0, s2)
            tMinNew = t
            uMax = u
          }
          addCurveIntersections(
            v1, v2, pair, flip,
            recursion, tMinNew, tMaxNew, uMin, uMax
          )
        }
      } else if (!(
        tolerance &&
        addImplicitIntersections(
          v1, v2, pair, flip,
          tMinNew, tMaxNew, uMin, uMax
        )
      )) {
        // Subdivide the curve which has converged the least.
        if (tMaxNew - tMinNew > uDiff) {
          const parts = subdivideCurve(v1, 0.5)
          const t = (tMinNew + tMaxNew) / 2
          addCurveIntersections(
            v2, parts[0], pair, !flip,
            recursion, uMin, uMax, tMinNew, t
          )
          addCurveIntersections(
            v2, parts[1], pair, !flip,
            recursion, uMin, uMax, t, tMaxNew
          )
        } else {
          const parts = subdivideCurve(v2, 0.5)
          const u = (uMin + uMax) / 2
          addCurveIntersections(
            parts[0], v1, pair, !flip,
            recursion, uMin, u, tMinNew, tMaxNew
          )
          addCurveIntersections(
            parts[1], v1, pair, !flip,
            recursion, u, uMax, tMinNew, tMaxNew
          )
        }
      }
    } else {
      // Iterate
      // For some unclear reason we need to check against uDiff === 0
      // here, to prevent a regression from happening, see #1638.
      // Maybe @iconexperience could shed some light on this.
      if (uDiff === 0 || uDiff >= fatLineEpsilon) {
        addCurveIntersections(
          v2, v1, pair, !flip,
          recursion, uMin, uMax, tMinNew, tMaxNew
        )
      } else {
        // The interval on the other curve is already tight enough,
        // therefore we keep iterating on the same curve.
        addCurveIntersections(
          v1, v2, pair, flip,
          recursion, tMinNew, tMaxNew, uMin, uMax
        )
      }
    }
  }
}

// Adds the intersections of the piece v1 with the piece v2 as the roots of
// the implicit form of v2, f(x, y) = 0, along v1: f(v1(t)) is a polynomial
// in Bernstein form, of degree 9, or 6 if v2 is a quadratic curve. Its
// roots are isolated by subdivision, and where the curves are within the
// tolerance of each other along a part of v1 shorter than it, the part
// counts as one intersection. The implicit curve extends beyond v2, so
// only roots on v2 itself are kept. Returns false if f(v1(t)) vanishes,
// as both lie on the same implicit curve, or if its errors leave more
// roots than its degree allows. See: Sederberg T. - "Computer
// Aided Geometric Design", chapter 17 on implicitization.
function addImplicitIntersections(
  v1: CurveValues,
  v2: CurveValues,
  pair: Pair,
  flip: boolean,
  tMin: number,
  tMax: number,
  uMin: number,
  uMax: number
): boolean {
  const { tolerance } = pair
  const x0 = v2[0]
  const y0 = v2[1]
  let size = 0
  for (let i = 0; i < 8; i += 2) {
    size = Math.max(
      size,
      Math.abs(v1[i] - x0),
      Math.abs(v1[i + 1] - y0),
      Math.abs(v2[i] - x0),
      Math.abs(v2[i + 1] - y0)
    )
  }
  if (size) {
    // Work in coordinates relative to v2's start and size, to keep the
    // coefficients of the polynomial in the order of 1. The implicit
    // form of a cubic that is a quadratic vanishes, so use the
    // quadratic's when it is within the tolerance: their distance is
    // at most 4/27 of the cubic's third difference.
    const p = getLocalPoints(v1, x0, y0, size)
    const q = getLocalPoints(v2, x0, y0, size)
    const dx = v2[6] - 3 * (v2[4] - v2[2]) - x0
    const dy = v2[7] - 3 * (v2[5] - v2[3]) - y0
    const isQuadratic = (
      4 / 27 * Math.sqrt(dx * dx + dy * dy) <=
      tolerance
    )
    const polynomial = isQuadratic
      ? getQuadraticImplicit(p, [q[0], getQuadraticHandle(q), q[3]])
      : getCubicImplicit(p, q)
    const roots = []
    let speed = 0
    // The width in curve time along which v1 moves less than the
    // tolerance, from a bound of its speed:
    for (let i = 0; i < 6; i += 2) {
      speed = Math.max(
        speed,
        3 *
        Math.sqrt(
          Math.pow(v1[i + 2] - v1[i], 2) +
          Math.pow(v1[i + 3] - v1[i + 1], 2)
        )
      )
    }
    if (
      polynomial.coefficients.every(
        (coefficient, i) => Math.abs(coefficient) <= polynomial.errors[i]
      )
    )
      return false
    const count = solveBernstein(
      polynomial.coefficients,
      polynomial.errors,
      roots,
      speed ? tolerance / speed : 1
    )
    // More roots than its degree mean that the errors swamp the
    // polynomial, e.g. for a piece of v2 much shorter than v1:
    if (count >= polynomial.coefficients.length) return false
    for (let i = 0; i < count; i++) {
      let t = roots[i]
      let u = getCurveTimeOf(v2, getCurvePoint(v1, t), tolerance)
      if (u !== null) {
        t = tMin + (tMax - tMin) * t
        u = uMin + (uMax - uMin) * u
        addLocation(pair, t, u, flip)
      }
    }
    return true
  }
  return false
}

// The polynomials below carry a bound of the rounding error of each of
// their coefficients, accumulated through each operation: the errors of
// the operands, plus the rounding of the result, u * |result|.

type LocalPoint = { x: number; y: number; ex: number; ey: number }
type Polynomial = { coefficients: number[]; errors: number[] }

function getLocalPoints(
  v: CurveValues,
  x0: number,
  y0: number,
  size: number
): LocalPoint[] {
  const u = MACHINE_EPSILON
  const points = []
  for (let i = 0; i < 8; i += 2) {
    const x = (v[i] - x0) / size
    const y = (v[i + 1] - y0) / size
    // A subtraction and a division:
    points.push({
      x,
      y,
      ex: 2 * u * Math.abs(x),
      ey: 2 * u * Math.abs(y)
    })
  }
  return points
}

// The error of the product a * b, from the errors of its factors:
function getProductError(a: number, ea: number, b: number, eb: number): number {
  return (
    Math.abs(a) * eb +
    Math.abs(b) * ea +
    ea * eb +
    MACHINE_EPSILON * Math.abs(a * b)
  )
}

// The linear factors of the implicit forms, l(i, j)(x, y), as polynomials
// along the cubic p in Bernstein form, which as they are linear in x and y
// have the factors at the control points of p as their coefficients:
function getLinearFactor(
  p: LocalPoint[],
  q: LocalPoint[],
  i: number,
  j: number,
  factor: number
): Polynomial {
  const u = MACHINE_EPSILON
  const coefficients = []
  const errors = []
  for (let k = 0; k < 4; k++) {
    const r = p[k]
    const dx1 = q[i].x - r.x
    const dy1 = q[j].y - r.y
    const dx2 = q[j].x - r.x
    const dy2 = q[i].y - r.y
    const error1 = getProductError(
      dx1,
      q[i].ex + r.ex + u * Math.abs(dx1),
      dy1,
      q[j].ey + r.ey + u * Math.abs(dy1)
    )
    const error2 = getProductError(
      dx2,
      q[j].ex + r.ex + u * Math.abs(dx2),
      dy2,
      q[i].ey + r.ey + u * Math.abs(dy2)
    )
    const difference = dx1 * dy1 - dx2 * dy2
    const value = factor * difference
    coefficients.push(value)
    errors.push(
      factor * (error1 + error2 + u * Math.abs(difference)) +
      u * Math.abs(value)
    )
  }
  return { coefficients, errors }
}

// The binomial coefficients up to the degree of the cubic implicit form:
const binomials = [[1]]
for (let i = 1; i <= 9; i++) {
  const row = [1]
  for (let j = 1; j < i; j++) {
    row.push(binomials[i - 1][j - 1] + binomials[i - 1][j])
  }
  row.push(1)
  binomials.push(row)
}

// Multiplies polynomials in Bernstein form:
function multiply(a: Polynomial, b: Polynomial): Polynomial {
  const u = MACHINE_EPSILON
  const m = a.coefficients.length - 1
  const n = b.coefficients.length - 1
  const coefficients = []
  const errors = []
  for (let k = 0; k <= m + n; k++) {
    let sum = 0
    let error = 0
    for (let i = Math.max(0, k - n), l = Math.min(m, k); i <= l; i++) {
      const factor = (
        binomials[m][i] *
        binomials[n][k - i] /
        binomials[m + n][k]
      )
      const a1 = a.coefficients[i]
      const b1 = b.coefficients[k - i]
      const term = factor * (a1 * b1)
      sum += term
      // The factor's division, its product, and the sum:
      error += (
        factor * getProductError(a1, a.errors[i], b1, b.errors[k - i]) +
        u * (2 * Math.abs(term) + Math.abs(sum))
      )
    }
    coefficients.push(sum)
    errors.push(error)
  }
  return { coefficients, errors }
}

function add(a: Polynomial, b: Polynomial, sign: number): Polynomial {
  const coefficients = []
  const errors = []
  for (let i = 0, l = a.coefficients.length; i < l; i++) {
    const sum = a.coefficients[i] + sign * b.coefficients[i]
    coefficients.push(sum)
    errors.push(
      a.errors[i] +
      b.errors[i] +
      MACHINE_EPSILON * Math.abs(sum)
    )
  }
  return { coefficients, errors }
}

function getCubicImplicit(p: LocalPoint[], q: LocalPoint[]): Polynomial {
  // f(x, y) = | l32  l31        l30 |
  //           | l31  l30 + l21  l20 |
  //           | l30  l20        l10 |
  const l32 = getLinearFactor(p, q, 3, 2, 1 * 3)
  const l31 = getLinearFactor(p, q, 3, 1, 1 * 3)
  const l30 = getLinearFactor(p, q, 3, 0, 1 * 1)
  const l21 = getLinearFactor(p, q, 2, 1, 3 * 3)
  const l20 = getLinearFactor(p, q, 2, 0, 3 * 1)
  const l10 = getLinearFactor(p, q, 1, 0, 3 * 1)
  const m = add(l30, l21, 1)
  return add(
    add(
      multiply(l32, add(multiply(m, l10), multiply(l20, l20), -1)),
      multiply(l31, add(multiply(l31, l10), multiply(l20, l30), -1)),
      -1
    ),
    multiply(l30, add(multiply(l31, l20), multiply(m, l30), -1)),
    1
  )
}

// The handle of a cubic that is a quadratic, (3 * q1 - q0) / 2:
function getQuadraticHandle(q: LocalPoint[]): LocalPoint {
  const u = MACHINE_EPSILON
  const x = (3 * q[1].x - q[0].x) / 2
  const y = (3 * q[1].y - q[0].y) / 2
  return {
    x,
    y,
    ex: (3 * q[1].ex + q[0].ex) / 2 + 2 * u * Math.abs(x),
    ey: (3 * q[1].ey + q[0].ey) / 2 + 2 * u * Math.abs(y)
  }
}

function getQuadraticImplicit(p: LocalPoint[], q: LocalPoint[]): Polynomial {
  // f(x, y) = | l21  l20 |
  //           | l20  l10 |
  const l21 = getLinearFactor(p, q, 2, 1, 1 * 2)
  const l20 = getLinearFactor(p, q, 2, 0, 1 * 1)
  const l10 = getLinearFactor(p, q, 1, 0, 2 * 1)
  return add(multiply(l21, l10), multiply(l20, l20), -1)
}

// Calculate the convex hull for the non-parametric bezier curve D(ti, di(t))
// The ti is equally spaced across [0..1] — [0, 1/3, 2/3, 1] for
// di(t), [dq0, dq1, dq2, dq3] respectively. In other words our CVs for the
// curve are already sorted in the X axis in the increasing order.
// Calculating convex-hull is much easier than a set of arbitrary points.
//
// The convex-hull is returned as two parts [TOP, BOTTOM]:
// (both are in a coordinate space where y increases upwards with origin at
// bottom-left)
// TOP: The part that lies above the 'median' (line connecting end points of
// the curve)
// BOTTOM: The part that lies below the median.
function getConvexHull(
  dq0: number,
  dq1: number,
  dq2: number,
  dq3: number
): number[][][] {
  const p0 = [0, dq0]
  const p1 = [1 / 3, dq1]
  const p2 = [2 / 3, dq2]
  const p3 = [1, dq3]
  // Find vertical signed distance of p1 and p2 from line [p0, p3]
  const dist1 = dq1 - (2 * dq0 + dq3) / 3
  const dist2 = dq2 - (dq0 + 2 * dq3) / 3
  let hull: number[][][]
  // Check if p1 and p2 are on the opposite side of the line [p0, p3]
  if (dist1 * dist2 < 0) {
    // p1 and p2 lie on different sides of [p0, p3]. The hull is a
    // quadrilateral and line [p0, p3] is NOT part of the hull so we are
    // pretty much done here. The top part includes p1, we will reverse
    // it later if that is not the case.
    hull = [[p0, p1, p3], [p0, p2, p3]]
  } else {
    // p1 and p2 lie on the same sides of [p0, p3]. The hull can be a
    // triangle or a quadrilateral and line [p0, p3] is part of the
    // hull. Check if the hull is a triangle or a quadrilateral. We have
    // a triangle if the vertical distance of one of the middle points
    // (p1, p2) is equal or less than half the vertical distance of the
    // other middle point.
    const distRatio = dist1 / dist2
    hull = [
      // p2 is inside, the hull is a triangle.
      distRatio >= 2
        ? [p0, p1, p3]
        : // p1 is inside, the hull is a triangle.
          distRatio <= 0.5
          ? [p0, p2, p3]
          : // Hull is a quadrilateral, we need all lines in correct order.
            [p0, p1, p2, p3],
      // Line [p0, p3] is part of the hull.
      [p0, p3]
    ]
  }
  // Flip hull if dist1 is negative or if it is zero and dist2 is negative
  return (dist1 || dist2) < 0 ? hull.reverse() : hull
}

// Clips the convex-hull and returns [tMin, tMax] for the curve contained.
function clipConvexHull(
  hullTop: number[][],
  hullBottom: number[][],
  dMin: number,
  dMax: number
): number | null {
  if (hullTop[0][1] < dMin) {
    // Left of hull is below dMin, walk through the hull until it
    // enters the region between dMin and dMax
    return clipConvexHullPart(hullTop, true, dMin)
  } else if (hullBottom[0][1] > dMax) {
    // Left of hull is above dMax, walk through the hull until it
    // enters the region between dMin and dMax
    return clipConvexHullPart(hullBottom, false, dMax)
  } else {
    // Left of hull is between dMin and dMax, no clipping possible
    return hullTop[0][0]
  }
}

function clipConvexHullPart(
  part: number[][],
  top: boolean,
  threshold: number
): number | null {
  let px = part[0][0]
  let py = part[0][1]
  for (let i = 1, l = part.length; i < l; i++) {
    const qx = part[i][0]
    const qy = part[i][1]
    if (top ? qy >= threshold : qy <= threshold) {
      return qy === threshold
        ? qx
        : px + (threshold - py) * (qx - px) / (qy - py)
    }
    px = qx
    py = qy
  }
  // All points of hull are above / below the threshold
  return null
}

// Intersections between curve and line becomes rather simple here mostly
// because of Numerical class. We can rotate the curve and line so that the
// line is on the X axis, and solve the implicit equations for the X axis
// and the curve.
function getCurveLineIntersections(
  v: CurveValues,
  px: number,
  py: number,
  vx: number,
  vy: number
): number[] {
  if (isZero(vx) && isZero(vy)) {
    // Handle special case of a line with no direction as a point,
    // and check if it is on the curve.
    const t = getCurveTimeOf(v, new Point(px, py))
    return t === null ? [] : [t]
  }
  // Calculate angle to the x-axis (1, 0).
  const angle = Math.atan2(-vy, vx)
  const sin = Math.sin(angle)
  const cos = Math.cos(angle)
  // (rlx1, rly1) = (0, 0)
  // Calculate the curve values of the rotated curve.
  const rv = []
  const roots = []
  for (let i = 0; i < 8; i += 2) {
    const x = v[i] - px
    const y = v[i + 1] - py
    rv.push(
      x * cos - y * sin,
      x * sin + y * cos
    )
  }
  // Solve it for y = 0. We need to include t = 0, 1 and let addLocation()
  // do the filtering, to catch important edge cases.
  solveCurve(rv, 1, 0, roots, 0, 1)
  // The ends of the curve are on the line if their rotated y is about 0,
  // even when the rounding of the rotation keeps solveCubic() from
  // finding them, e.g. as double roots at a zero-length handle (#1848):
  const epsilon = GEOMETRIC_EPSILON
  if (Math.abs(rv[1]) < epsilon) {
    roots.push(0)
  }
  if (Math.abs(rv[7]) < epsilon) {
    roots.push(1)
  }
  return roots
}

function addCurveLineIntersections(
  v1: CurveValues,
  v2: CurveValues,
  pair: Pair,
  flip: boolean,
  tolerance: number
) {
  // addCurveLineIntersections() is called so that v1 is always the curve
  // and v2 the line. flip indicates whether the curves need to be flipped
  // in the call to addLocation().
  const x1 = v2[0]
  const y1 = v2[1]
  const x2 = v2[6]
  const y2 = v2[7]
  const roots = getCurveLineIntersections(v1, x1, y1, x2 - x1, y2 - y1)
  // NOTE: count could be -1 for infinite solutions, but that should only
  // happen with lines, in which case we should not be here.
  for (let i = 0, l = roots.length; i < l; i++) {
    // For each found solution on the rotated curve, get the point on
    // the real curve and with that the location on the line.
    const t1 = roots[i]
    const p1 = getCurvePoint(v1, t1)
    const t2 = getCurveTimeOf(v2, p1, tolerance)
    if (t2 !== null) {
      // Only use the time values if there was no recursion, and let
      // addLocation() figure out the actual time values otherwise.
      addLocation(pair, t1, t2, flip)
    }
  }
}

function addLineIntersection(
  v1: CurveValues,
  v2: CurveValues,
  pair: Pair,
  tolerance: number
): boolean {
  const point = Line.intersect(
    v1[0], v1[1], v1[6], v1[7],
    v2[0], v2[1], v2[6], v2[7]
  )
  return (
    !!point &&
    addLocation(
      pair,
      getCurveTimeOf(v1, point, tolerance),
      getCurveTimeOf(v2, point, tolerance)
    )
  )
}
