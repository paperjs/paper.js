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

import { EPSILON, clamp, isMachineZero } from '../util/numerical.ts'
import { Base } from '../core/Base.ts'
import { registerClasses } from '../core/serialization.ts'
import { Point } from './Point.ts'
import type { PointLike } from './Point.ts'

export type LineOptions = {
  from?: PointLike
  to?: PointLike
  point?: PointLike
  vector?: PointLike
  infinite?: boolean
}

/**
 * The Line object represents a straight line from a point to a second point,
 * or from a point in the direction of a vector. It ends at its two points,
 * unless it's {@link #infinite}, and then runs on through them in both
 * directions. {@link TextRange#baseline} returns a line.
 *
 * @example
 * var line = new Line([0, 0], [100, 0]);
 * console.log(line.getDistance([50, 20])); // 20
 * console.log(line.getDistance([130, 40])); // 50
 * console.log(line.intersect(new Line([50, -10], [50, 10]))); // { x: 50, y: 0 }
 *
 * var axis = new Line({ point: [0, 0], vector: [1, 0], infinite: true });
 * console.log(axis.getDistance([130, 40])); // 40
 */
export class Line extends Base {
  static {
    registerClasses({ Line: this })
  }

  #px: number
  #py: number
  #vx: number
  #vy: number
  #infinite: boolean

  /**
   * Creates a line from a point to a second point.
   *
   * @param from the line's point
   * @param to the line's second point
   */
  constructor(from: PointLike, to: PointLike)
  /**
   * Creates a line from an object literal, with either `from` and `to`, or
   * `point` and `vector`.
   *
   * @param object an object containing the line's properties
   * @option object.from {Point} the line's point
   * @option object.to {Point} the line's second point
   * @option object.point {Point} the line's point, with `vector`
   * @option object.vector {Point} the line's direction and length, from its
   *     point
   * @option [object.infinite=false] {Boolean} whether the line runs on
   *     through its points in both directions
   *
   * @example
   * var line = new Line({ from: [0, 0], to: [100, 50] });
   *
   * @example
   * var ray = new Line({ point: [0, 0], vector: [10, 5], infinite: true });
   */
  constructor(object: LineOptions)
  constructor(arg0: PointLike | LineOptions, arg1?: PointLike) {
    super()
    const {
      from,
      to,
      point = from,
      vector,
      infinite = false
    } = (arg1 === undefined ? arg0 : { from: arg0, to: arg1 }) as LineOptions
    const { x, y } = Point.from(point)
    const { x: vx, y: vy } = vector
      ? Point.from(vector)
      : Point.from(to).subtract(x, y)
    this.#px = x
    this.#py = y
    this.#vx = vx
    this.#vy = vy
    this.#infinite = infinite
  }

  /**
   * The line's point, where it starts.
   */
  get point(): Point {
    return new Point(this.#px, this.#py)
  }

  /**
   * The line's vector, from its point to its second point.
   */
  get vector(): Point {
    return new Point(this.#vx, this.#vy)
  }

  /**
   * The length of the line, from its point to its second point.
   */
  get length(): number {
    return this.vector.length
  }

  /**
   * Specifies whether the line runs on through its points in both
   * directions, instead of ending at them.
   */
  get infinite(): boolean {
    return this.#infinite
  }

  /**
   * Returns the point where the line intersects the other line, within the
   * ends of each line that isn't infinite.
   *
   * @param line the other line
   * @return the point of intersection, or `undefined` if the lines don't
   *     intersect or are collinear
   */
  intersect(line: Line): Point | undefined {
    return Line.intersect(
      this.#px, this.#py, this.#vx, this.#vy,
      line.#px, line.#py, line.#vx, line.#vy,
      true, this.#infinite, line.#infinite
    )
  }

  /**
   * Returns on which side of the line the point lies, seen along its vector:
   * `1` to the left, `-1` to the right, and `0` on the line. A point beyond
   * the ends of a line that isn't infinite lies on the side of the end it's
   * beyond, `-1` before its point and `1` after its second point.
   *
   * @param point the point to check
   * @return `-1`, `0` or `1`
   */
  getSide(point: PointLike): number {
    const { x, y } = Point.from(point)
    return Line.getSide(
      this.#px, this.#py, this.#vx, this.#vy,
      x, y, true, this.#infinite
    )
  }

  /**
   * Returns the distance of the point from the line, which is the distance
   * from its nearest end for points beyond the ends of a line that isn't
   * infinite.
   *
   * @param point the point to measure the distance of
   * @return the distance of the point from the line
   */
  getDistance(point: PointLike | number, y?: number): number {
    const other = Point.from(point, y)
    const px = this.#px
    const py = this.#py
    const vx = this.#vx
    const vy = this.#vy
    if (this.#infinite) {
      return Line.getDistance(px, py, vx, vy, other.x, other.y, true)
    } else {
      const dx = other.x - px
      const dy = other.y - py
      // The position of the nearest point along the line, held within it:
      const u = clamp((dx * vx + dy * vy) / (vx * vx + vy * vy) || 0, 0, 1)
      return Math.hypot(dx - u * vx, dy - u * vy)
    }
  }

  /**
   * Returns the distance of the point from the line as
   * {@link #getDistance(point)} measures it, positive on the side where
   * {@link #getSide(point)} returns `1` and negative where it returns `-1`.
   *
   * @param point the point to measure the distance of
   * @return the signed distance of the point from the line
   */
  getSignedDistance(point: PointLike | number, y?: number): number {
    const other = Point.from(point, y)
    return this.#infinite
      ? Line.getSignedDistance(
          this.#px, this.#py, this.#vx, this.#vy,
          other.x, other.y, true
        )
      : this.getSide(other) * this.getDistance(other)
  }

  /**
   * Checks whether the line runs in the same or the opposite direction as
   * the other line, which it then lies on or runs parallel to.
   *
   * @param line the other line
   * @return {@true if the lines are collinear}
   */
  isCollinear(line: Line): boolean {
    return Point.isCollinear(this.#vx, this.#vy, line.#vx, line.#vy)
  }

  /**
   * Checks whether the line is perpendicular to the other line.
   *
   * @param line the other line
   * @return {@true if the lines are orthogonal}
   */
  isOrthogonal(line: Line): boolean {
    return Point.isOrthogonal(this.#vx, this.#vy, line.#vx, line.#vy)
  }

  /**
   * @return a string representation of the line
   */
  toString(): string {
    return `{ point: ${this.point}, vector: ${this.vector}${
      this.#infinite ? ', infinite: true' : ''
    } }`
  }

  /** @private */
  static intersect(
    p1x: number, p1y: number, v1x: number, v1y: number,
    p2x: number, p2y: number, v2x: number, v2y: number,
    asVector?: boolean, isInfinite1?: boolean, isInfinite2?: boolean
  ): Point | undefined {
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
      // Check the ranges of the u parameters of the lines that don't extend
      // beyond their definition points, but compare with EPSILON tolerance
      // over the [0, 1] bounds.
      const uMin = -EPSILON
      const uMax = 1 + EPSILON
      if (
        (isInfinite1 || uMin < u1 && u1 < uMax) &&
        (isInfinite2 || uMin < u2 && u2 < uMax)
      ) {
        if (!isInfinite1) {
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

  /** @private */
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

  /** @private */
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

  /** @private */
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
