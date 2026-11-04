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

import { Base, EPSILON, Point, isMachineZero } from '../internal.ts'
import type { PointLike } from './Point.ts'

/**
 * The Line object represents..
 *
 * @private
 */
export class Line extends Base {
  #px: number
  #py: number
  #vx: number
  #vy: number

  // DOCS: document Line class and constructor
  /**
   * Creates a Line object.
   *
   * @param point1
   * @param point2
   * @param asVector
   */
  constructor(point1: PointLike, point2: PointLike, asVector?: boolean)
  /**
   * Creates a Line object from the coordinates of its point and its second
   * point, or its vector if `asVector` is set.
   *
   * @param px
   * @param py
   * @param vx
   * @param vy
   * @param asVector
   */
  constructor(
    px: number, py: number,
    vx: number, vy: number,
    asVector?: boolean
  )
  constructor(
    arg0: PointLike | number,
    arg1: PointLike | number,
    arg2?: boolean | number,
    arg3?: number,
    arg4?: boolean
  ) {
    super()
    let asVector: boolean
    if (typeof arg0 === 'number') {
      this.#px = arg0
      this.#py = arg1 as number
      this.#vx = arg2 as number
      this.#vy = arg3
      asVector = arg4
    } else {
      const point1 = Point.from(arg0)
      const point2 = Point.from(arg1)
      this.#px = point1.x
      this.#py = point1.y
      this.#vx = point2.x
      this.#vy = point2.y
      asVector = arg2 as boolean
    }
    if (!asVector) {
      this.#vx -= this.#px
      this.#vy -= this.#py
    }
  }

  /**
   * The starting point of the line.
   */
  get point(): Point {
    return new Point(this.#px, this.#py)
  }

  /**
   * The direction of the line as a vector.
   */
  get vector(): Point {
    return new Point(this.#vx, this.#vy)
  }

  /**
   * The length of the line.
   */
  get length(): number {
    return this.vector.length
  }

  /**
   * @param line
   * @param isInfinite
   * @return the intersection point of the lines, `undefined` if the
   *     two lines are collinear, or `null` if they don't intersect.
   */
  intersect(line: Line, isInfinite?: boolean): Point {
    return Line.intersect(
      this.#px, this.#py, this.#vx, this.#vy,
      line.#px, line.#py, line.#vx, line.#vy,
      true, isInfinite
    )
  }

  // DOCS: document Line#getSide(point)
  /**
   * @param point
   * @param isInfinite
   */
  getSide(point: PointLike, isInfinite?: boolean): number {
    const { x, y } = Point.from(point)
    return Line.getSide(
      this.#px, this.#py, this.#vx, this.#vy,
      x, y, true, isInfinite
    )
  }

  // DOCS: document Line#getDistance(point)
  /**
   * @param point
   */
  getDistance(point: PointLike | number, y?: number): number {
    return Math.abs(this.getSignedDistance(point, y))
  }

  // DOCS: document Line#getSignedDistance(point)
  /**
   * @param point
   */
  getSignedDistance(point: PointLike | number, y?: number): number {
    const other = Point.from(point, y)
    return Line.getSignedDistance(
      this.#px, this.#py, this.#vx, this.#vy,
      other.x, other.y, true
    )
  }

  isCollinear(line: Line): boolean {
    return Point.isCollinear(this.#vx, this.#vy, line.#vx, line.#vy)
  }

  isOrthogonal(line: Line): boolean {
    return Point.isOrthogonal(this.#vx, this.#vy, line.#vx, line.#vy)
  }

  static intersect(
    p1x: number, p1y: number, v1x: number, v1y: number,
    p2x: number, p2y: number, v2x: number, v2y: number,
    asVector?: boolean, isInfinite?: boolean
  ): Point {
    // Convert 2nd points to vectors if they are not specified as such.
    if (!asVector) {
      v1x -= p1x
      v1y -= p1y
      v2x -= p2x
      v2y -= p2y
    }
    const cross = v1x * v2y - v1y * v2x
    // Avoid divisions by 0, and errors when getting too close to 0
    if (!isMachineZero(cross)) {
      const dx = p1x - p2x
      const dy = p1y - p2y
      let u1 = (v2x * dy - v2y * dx) / cross
      const u2 = (v1x * dy - v1y * dx) / cross
      // Check the ranges of the u parameters if the line is not
      // allowed to extend beyond the definition points, but
      // compare with EPSILON tolerance over the [0, 1] bounds.
      const epsilon = EPSILON
      const uMin = -epsilon
      const uMax = 1 + epsilon
      if (isInfinite || uMin < u1 && u1 < uMax && uMin < u2 && u2 < uMax) {
        if (!isInfinite) {
          // Address the tolerance at the bounds by clipping to
          // the actual range.
          u1 = u1 <= 0 ? 0 : u1 >= 1 ? 1 : u1
        }
        return new Point(
          p1x + u1 * v1x,
          p1y + u1 * v1y
        )
      }
    }
  }

  static getSide(
    px: number, py: number, vx: number, vy: number,
    x: number, y: number,
    asVector?: boolean, isInfinite?: boolean
  ): number {
    if (!asVector) {
      vx -= px
      vy -= py
    }
    const v2x = x - px
    const v2y = y - py
    // ccw = v2.cross(v1);
    let ccw = v2x * vy - v2y * vx
    if (!isInfinite && isMachineZero(ccw)) {
      // If the point is on the infinite line, check if it's on the
      // finite line too: Project v2 onto v1 and determine ccw based
      // on which side of the finite line the point lies. Calculate
      // the 'u' value of the point on the line, and use it for ccw:
      // u = v2.dot(v1) / v1.dot(v1)
      ccw = (v2x * vx + v2y * vy) / (vx * vx + vy * vy)
      // If the 'u' value is within the line range, set ccw to 0,
      // otherwise its already correct sign is all we need.
      if (ccw >= 0 && ccw <= 1) {
        ccw = 0
      }
    }
    return ccw < 0 ? -1 : ccw > 0 ? 1 : 0
  }

  static getSignedDistance(
    px: number, py: number, vx: number, vy: number,
    x: number, y: number,
    asVector?: boolean
  ): number {
    if (!asVector) {
      vx -= px
      vy -= py
    }
    // Based on the error analysis by @iconexperience outlined in #799
    return vx === 0
      ? vy > 0
        ? x - px
        : px - x
      : vy === 0
        ? vx < 0
          ? y - py
          : py - y
        : ((x - px) * vy - (y - py) * vx) /
          // NOTE: Comparing vy > vx rather than their absolute
          // values keeps the results of fat-line clipping in
          // curve intersections unchanged.
          (
            vy > vx
              ? Math.abs(vy) *
                Math.sqrt(1 + vx * vx / (vy * vy))
              : Math.abs(vx) *
                Math.sqrt(1 + vy * vy / (vx * vx))
          )
  }

  static getDistance(
    px: number, py: number, vx: number, vy: number,
    x: number, y: number,
    asVector?: boolean
  ): number {
    return Math.abs(
      Line.getSignedDistance(px, py, vx, vy, x, y, asVector)
    )
  }
}
