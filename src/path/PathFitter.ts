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

// An Algorithm for Automatically Fitting Digitized Curves
// by Philip J. Schneider
// from "Graphics Gems", Academic Press, 1990
// Modifications and optimizations of original algorithm by Jürg Lehni.

import { Base, EPSILON, Segment, isMachineZero } from '../internal.ts'
import type { Point } from '../basic/Point.ts'

/**
 * @private
 */
export class PathFitter extends Base {
  #points: Point[]
  #closed: boolean

  constructor(segments: Segment[], closed?: boolean) {
    super()
    const points: Point[] = []
    let previous: Point
    // Copy over points from path and filter out adjacent duplicates.
    for (let i = 0, l = segments.length; i < l; i++) {
      const { point } = segments[i]
      if (!previous || !previous.equals(point)) {
        points.push((previous = point.clone()))
      }
    }
    // We need to duplicate the first and last segment when simplifying a
    // closed path.
    if (closed) {
      points.unshift(points[points.length - 1])
      points.push(points[1]) // The point previously at index 0 is now 1.
    }
    this.#points = points
    this.#closed = closed
  }

  fit(error: number, tangent1?: Point, tangent2?: Point): Segment[] | null {
    const points = this.#points
    const { length } = points
    let segments = null
    if (length > 0) {
      // To support reducing paths with multiple points in the same place
      // to one segment:
      segments = [new Segment(points[0])]
      if (length > 1) {
        this.#fitCubic(
          segments,
          error,
          0,
          length - 1,
          // Left Tangent
          tangent1 || points[1].subtract(points[0]),
          // Right Tangent
          tangent2 || points[length - 2].subtract(points[length - 1])
        )
        // Remove the duplicated segments for closed paths again.
        if (this.#closed) {
          segments.shift()
          segments.pop()
        }
      }
    }
    return segments
  }

  // Fit a Bezier curve to a (sub)set of digitized points
  #fitCubic(
    segments: Segment[], error: number,
    first: number, last: number,
    tangent1: Point, tangent2: Point
  ) {
    const points = this.#points
    //  Use heuristic if region only has two points in it
    if (last - first === 1) {
      const point1 = points[first]
      const point2 = points[last]
      const distance = point1.getDistance(point2) / 3
      this.#addCurve(segments, [
        point1,
        point1.add(tangent1.normalize(distance)),
        point2.add(tangent2.normalize(distance)),
        point2
      ])
      return
    }
    // Parameterize points, and attempt to fit curve
    const uPrime = this.#chordLengthParameterize(first, last)
    let maxError = Math.max(error, error * error)
    let split: number
    let parametersInOrder = true
    // Try 4 iterations
    for (let i = 0; i <= 4; i++) {
      const curve = this.#generateBezier(
        first,
        last,
        uPrime,
        tangent1,
        tangent2
      )
      //  Find max deviation of points to fitted curve
      const max = this.#findMaxError(first, last, curve, uPrime)
      if (max.error < error && parametersInOrder) {
        this.#addCurve(segments, curve)
        return
      }
      split = max.index
      // If error not too large, try reparameterization and iteration
      if (max.error >= maxError) break
      parametersInOrder = this.#reparameterize(first, last, uPrime, curve)
      maxError = max.error
    }
    // Fitting failed -- split at max error point and fit recursively
    const tangentCenter = points[split - 1].subtract(points[split + 1])
    this.#fitCubic(segments, error, first, split, tangent1, tangentCenter)
    this.#fitCubic(
      segments,
      error,
      split,
      last,
      tangentCenter.negate(),
      tangent2
    )
  }

  #addCurve(segments: Segment[], curve: Point[]) {
    const previous = segments[segments.length - 1]
    previous.handleOut = curve[1].subtract(curve[0])
    segments.push(new Segment(curve[3], curve[2].subtract(curve[3])))
  }

  // Use least-squares method to find Bezier control points for region.
  #generateBezier(
    first: number, last: number,
    uPrime: number[],
    tangent1: Point, tangent2: Point
  ): Point[] {
    const abs = Math.abs
    const points = this.#points
    const point1 = points[first]
    const point2 = points[last]
    // Create the C and X matrices
    const C = [[0, 0], [0, 0]]
    const X = [0, 0]

    for (let i = 0, l = last - first + 1; i < l; i++) {
      const u = uPrime[i]
      const t = 1 - u
      const b = 3 * u * t
      const b0 = t * t * t
      const b1 = b * t
      const b2 = b * u
      const b3 = u * u * u
      const a1 = tangent1.normalize(b1)
      const a2 = tangent2.normalize(b2)
      const tmp = points[first + i]
        .subtract(point1.multiply(b0 + b1))
        .subtract(point2.multiply(b2 + b3))
      C[0][0] += a1.dot(a1)
      C[0][1] += a1.dot(a2)
      // C[1][0] += a1.dot(a2);
      C[1][0] = C[0][1]
      C[1][1] += a2.dot(a2)
      X[0] += a1.dot(tmp)
      X[1] += a2.dot(tmp)
    }

    // Compute the determinants of C and X
    const detC0C1 = C[0][0] * C[1][1] - C[1][0] * C[0][1]
    let alpha1: number
    let alpha2: number
    if (abs(detC0C1) > EPSILON) {
      // Kramer's rule
      const detC0X = C[0][0] * X[1] - C[1][0] * X[0]
      const detXC1 = X[0] * C[1][1] - X[1] * C[0][1]
      // Derive alpha values
      alpha1 = detXC1 / detC0C1
      alpha2 = detC0X / detC0C1
    } else {
      // Matrix is under-determined, try assuming alpha1 == alpha2
      const c0 = C[0][0] + C[0][1]
      const c1 = C[1][0] + C[1][1]
      alpha1 = alpha2 =
        abs(c0) > EPSILON ? X[0] / c0 : abs(c1) > EPSILON ? X[1] / c1 : 0
    }

    // If alpha negative, use the Wu/Barsky heuristic (see text)
    // (if alpha is 0, you get coincident control points that lead to
    // divide by zero in any subsequent NewtonRaphsonRootFind() call.
    const segmentLength = point2.getDistance(point1)
    const eps = EPSILON * segmentLength
    let handle1: Point
    let handle2: Point
    if (alpha1 < eps || alpha2 < eps) {
      // fall back on standard (probably inaccurate) formula,
      // and subdivide further if needed.
      alpha1 = alpha2 = segmentLength / 3
    } else {
      // Check if the found control points are in the right order when
      // projected onto the line through point1 and point2.
      const line = point2.subtract(point1)
      // Control points 1 and 2 are positioned an alpha distance out
      // on the tangent vectors, left and right, respectively
      handle1 = tangent1.normalize(alpha1)
      handle2 = tangent2.normalize(alpha2)
      if (
        handle1.dot(line) - handle2.dot(line) >
        segmentLength * segmentLength
      ) {
        // Fall back to the Wu/Barsky heuristic above.
        alpha1 = alpha2 = segmentLength / 3
        handle1 = handle2 = null // Force recalculation
      }
    }

    // First and last control points of the Bezier curve are
    // positioned exactly at the first and last data points
    return [
      point1,
      point1.add(handle1 || tangent1.normalize(alpha1)),
      point2.add(handle2 || tangent2.normalize(alpha2)),
      point2
    ]
  }

  // Given set of points and their parameterization, try to find
  // a better parameterization.
  #reparameterize(
    first: number, last: number,
    u: number[], curve: Point[]
  ): boolean {
    const points = this.#points
    for (let i = first; i <= last; i++) {
      u[i - first] = this.#findRoot(curve, points[i], u[i - first])
    }
    // Detect if the new parameterization has reordered the points.
    // In that case, we would fit the points of the path in the wrong order.
    for (let i = 1, l = u.length; i < l; i++) {
      if (u[i] <= u[i - 1]) return false
    }
    return true
  }

  // Use Newton-Raphson iteration to find better root.
  #findRoot(curve: Point[], point: Point, u: number): number {
    const curve1: Point[] = []
    const curve2: Point[] = []
    // Generate control vertices for Q'
    for (let i = 0; i <= 2; i++) {
      curve1[i] = curve[i + 1].subtract(curve[i]).multiply(3)
    }
    // Generate control vertices for Q''
    for (let i = 0; i <= 1; i++) {
      curve2[i] = curve1[i + 1].subtract(curve1[i]).multiply(2)
    }
    // Compute Q(u), Q'(u) and Q''(u)
    const pt = this.#evaluate(3, curve, u)
    const pt1 = this.#evaluate(2, curve1, u)
    const pt2 = this.#evaluate(1, curve2, u)
    const diff = pt.subtract(point)
    const df = pt1.dot(pt1) + diff.dot(pt2)
    // u = u - f(u) / f'(u)
    return isMachineZero(df) ? u : u - diff.dot(pt1) / df
  }

  // Evaluate a bezier curve at a particular parameter value
  #evaluate(degree: number, curve: Point[], t: number): Point {
    // Copy array
    const tmp = curve.slice()
    // Triangle computation
    for (let i = 1; i <= degree; i++) {
      for (let j = 0; j <= degree - i; j++) {
        tmp[j] = tmp[j].multiply(1 - t).add(tmp[j + 1].multiply(t))
      }
    }
    return tmp[0]
  }

  // Assign parameter values to digitized points
  // using relative distances between points.
  #chordLengthParameterize(first: number, last: number): number[] {
    const points = this.#points
    const u = [0]
    for (let i = first + 1; i <= last; i++) {
      u[i - first] = u[i - first - 1] + points[i].getDistance(points[i - 1])
    }
    for (let i = 1, m = last - first; i <= m; i++) {
      u[i] /= u[m]
    }
    return u
  }

  // Find the maximum squared distance of digitized points to fitted curve.
  #findMaxError(
    first: number, last: number,
    curve: Point[], u: number[]
  ): { error: number; index: number } {
    const points = this.#points
    let index = Math.floor((last - first + 1) / 2)
    let maxDistance = 0
    for (let i = first + 1; i < last; i++) {
      const P = this.#evaluate(3, curve, u[i - first])
      const v = P.subtract(points[i])
      const distance = v.x * v.x + v.y * v.y // squared
      if (distance >= maxDistance) {
        maxDistance = distance
        index = i
      }
    }
    return {
      error: maxDistance,
      index
    }
  }
}
