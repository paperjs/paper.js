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

import { Base } from '../core/Base.ts'
import { inject } from '../util/object.ts'
import { TRIGONOMETRIC_EPSILON, clamp, isZero } from '../util/numerical.ts'
import { Formatter } from '../util/Formatter.ts'
import { ItemSelection } from '../constants.ts'
import { Rectangle } from './Rectangle.ts'
import type { RectangleLike } from './Rectangle.ts'
import type { Size } from './Size.ts'
import type { Matrix } from './Matrix.ts'

/**
 * What a point can be passed as, where a function takes one.
 */
export type PointLike =
  | Point
  | number[]
  | { x: number; y: number }
  | { width: number; height: number }
  | { angle: number; length: number }
  | { angleInRadians: number; length: number }

/**
 * The Point object represents a point in the two dimensional space
 * of the Paper.js project. It is also used to represent two dimensional
 * vector objects.
 *
 * Wherever a point is the only argument of a function, it can also be passed
 * as two numbers, e.g. `point.add(10, 20)` or `item.translate(10, 20)`.
 *
 * @classexample
 * // Create a point at x: 10, y: 5
 * var point = new Point(10, 5);
 * console.log(point.x); // 10
 * console.log(point.y); // 5
 */
export class Point extends Base {
  /**
   * The x coordinate of the point
   */
  declare x: number

  /**
   * The y coordinate of the point
   */
  declare y: number

  // The angle that the vector keeps when its length is set to 0:
  #angle: number

  /**
   * Creates a Point object with the given x and y coordinates.
   *
   * @param x the x coordinate
   * @param y the y coordinate
   *
   * @example
   * // Create a point at x: 10, y: 5
   * var point = new Point(10, 5);
   * console.log(point.x); // 10
   * console.log(point.y); // 5
   */
  constructor(x: number, y?: number)
  /**
   * Creates a Point object using the numbers in the given array as
   * coordinates.
   *
   * @param array
   *
   * @example
   * // Creating a point at x: 10, y: 5 using an array of numbers:
   * var array = [10, 5];
   * var point = new Point(array);
   * console.log(point.x); // 10
   * console.log(point.y); // 5
   *
   * @example
   * // Passing an array to a functionality that expects a point:
   *
   * // Create a circle shaped path at x: 50, y: 50
   * // with a radius of 30:
   * var path = new Path.Circle([50, 50], 30);
   * path.fillColor = 'red';
   *
   * // Which is the same as doing:
   * var path = new Path.Circle(new Point(50, 50), 30);
   * path.fillColor = 'red';
   */
  constructor(array: number[])
  /**
   * Creates a Point object using the properties in the given object.
   *
   * @param object the object describing the point's properties
   *
   * @example
   * // Creating a point using an object literal with length and angle
   * // properties:
   *
   * var point = new Point({
   *     length: 10,
   *     angle: 90
   * });
   * console.log(point.length); // 10
   * console.log(point.angle); // 90
   *
   * @example
   * // The angle can also be specified in radians:
   *
   * var point = new Point({
   *     length: 10,
   *     angleInRadians: Math.PI / 2
   * });
   * console.log(point.angle); // 90
   *
   * @example
   * // Creating a point at x: 10, y: 20 using an object literal:
   *
   * var point = new Point({
   *     x: 10,
   *     y: 20
   * });
   * console.log(point.x); // 10
   * console.log(point.y); // 20
   *
   * @example
   * // Passing an object to a functionality that expects a point:
   *
   * var center = {
   *     x: 50,
   *     y: 50
   * };
   *
   * // Creates a circle shaped path at x: 50, y: 50
   * // with a radius of 30:
   * var path = new Path.Circle(center, 30);
   * path.fillColor = 'red';
   */
  constructor(
    object:
      | { x: number; y: number }
      | { angle: number; length: number }
      | { angleInRadians: number; length: number }
  )
  /**
   * Creates a Point object using the width and height values of the given
   * Size object.
   *
   * @param size
   *
   * @example
   * // Creating a point using a size object.
   *
   * // Create a Size with a width of 100pt and a height of 50pt
   * var size = new Size(100, 50);
   * console.log(size); // { width: 100, height: 50 }
   * var point = new Point(size);
   * console.log(point); // { x: 100, y: 50 }
   */
  constructor(size: Size)
  /**
   * Creates a Point object using the coordinates of the given Point object.
   *
   * @param point
   */
  constructor(point?: Point)
  /**
   * Creates a Point object from any of the values that a function taking a
   * point accepts, as {@link Point.from()} does.
   *
   * @param point
   * @param y
   */
  constructor(point: PointLike | number, y?: number)
  constructor(x?: PointLike | number | string, y?: number) {
    super()
    this.set(x, y)
  }

  /**
   * Sets the point to the passed values. Note that any sequence of parameters
   * that is supported by the various {@link Point()} constructors also work
   * for calls of `set()`.
   *
   * @param values
   */
  set(arg0?: PointLike | number | string, arg1?: number): this {
    if (typeof arg0 === 'number') {
      this._set(arg0, typeof arg1 === 'number' ? arg1 : arg0)
    } else if (arg0 === undefined || arg0 === null) {
      this._set(0, 0)
    } else {
      const obj: any = typeof arg0 === 'string' ? arg0.split(/[\s,]+/) : arg0
      if (Array.isArray(obj)) {
        this._set(+obj[0], +(obj.length > 1 ? obj[1] : obj[0]))
      } else if ('x' in obj) {
        this._set(obj.x || 0, obj.y || 0)
      } else if ('width' in obj) {
        this._set(obj.width || 0, obj.height || 0)
      } else if ('angle' in obj) {
        this._set(obj.length || 0, 0)
        this.angle = obj.angle || 0
      } else if ('angleInRadians' in obj) {
        this._set(obj.length || 0, 0)
        this.#setAngleInRadians(obj.angleInRadians || 0)
      } else {
        this._set(0, 0)
      }
    }
    return this
  }

  /**
   * Internal helper function to directly set the underlying properties.
   *
   * Convention regarding {@link #set()} VS {@link #_set()}:
   *
   * - {@link #_set()} is for actually setting properties, e.g. on Point,
   *   Size, so that derived classes can reuse other parts (e.g. SegmentPoint)
   * - {@link #set()} takes the same arguments as the constructor on all
   *   basic types, to offer the same amount of flexibility when setting
   *   values.
   */
  _set(x: number, y: number): this {
    this.x = x
    this.y = y
    return this
  }

  /**
   * Checks whether the coordinates of the point are equal to that of the
   * supplied point.
   *
   * @param point
   * @return {@true if the points are equal}
   *
   * @example
   * var point = new Point(5, 10);
   * console.log(point == new Point(5, 10)); // true
   * console.log(point == new Point(1, 1)); // false
   * console.log(point != new Point(1, 1)); // true
   */
  equals(point: any): boolean {
    return !!(
      this === point || (
        point && (
          this.x === point.x && this.y === point.y || (
            Array.isArray(point) &&
            this.x === point[0] &&
            this.y === point[1]
          )
        )
      )
    )
  }

  /**
   * Returns a copy of the point.
   *
   * @example
   * var point1 = new Point();
   * var point2 = point1;
   * point2.x = 1; // also changes point1.x
   *
   * var point2 = point1.clone();
   * point2.x = 1; // doesn't change point1.x
   *
   * @return the cloned point
   */
  clone(): Point {
    return new Point(this.x, this.y)
  }

  /**
   * @return a string representation of the point
   */
  toString(): string {
    const { instance } = Formatter
    return `{ x: ${
      instance.number(this.x)
    }, y: ${
      instance.number(this.y)
    } }`
  }

  _serialize(options: { formatter: Formatter }): number[] {
    const { formatter } = options
    // For speed reasons, we directly call formatter.number() here, instead
    // of converting array through serialize() which makes a copy.
    return [formatter.number(this.x), formatter.number(this.y)]
  }

  /**
   * The point's coordinates as an array, `[x, y]`, as
   * {@link Matrix#values} gives those of a matrix.
   */
  get values(): number[] {
    return [this.x, this.y]
  }

  /**
   * The length of the vector that is represented by this point's coordinates.
   * Each point can be interpreted as a vector that points from the origin (`x
   * = 0`, `y = 0`) to the point's location. Setting the length changes the
   * location but keeps the vector's angle.
   */
  get length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y)
  }

  set length(length: number) {
    // Whenever chaining both x & y, use #_set() instead of direct
    // assignment, so LinkedPoint does not report changes twice.
    if (this.isZero()) {
      const angle = this.#angle || 0
      this._set(
        Math.cos(angle) * length,
        Math.sin(angle) * length
      )
    } else {
      const scale = length / this.length
      // Force calculation of angle now, so it will be preserved even when
      // x and y are 0
      if (isZero(scale)) {
        this.angle
      }
      this._set(
        this.x * scale,
        this.y * scale
      )
    }
  }
  /**
   * The vector's angle in degrees, measured from the x-axis to the vector.
   */
  get angle(): number {
    // Return the preserved angle in case the vector has no length, and
    // update the internal #angle in case it has one, see
    // #setAngleInRadians():
    const angle = this.isZero()
      ? this.#angle || 0
      : (this.#angle = Math.atan2(this.y, this.x))
    return angle * 180 / Math.PI
  }

  set angle(angle: number) {
    this.#setAngleInRadians(angle * Math.PI / 180)
  }

  #setAngleInRadians(angle: number) {
    // We store a reference to #angle internally so we still preserve it
    // when the vector's length is set to zero, and then anything else.
    // Note that we cannot rely on it if x and y are something else than 0,
    // since updating x / y does not automatically change #angle!
    this.#angle = angle
    if (!this.isZero()) {
      const { length } = this
      // Use #_set() instead of direct assignment of x/y, so LinkedPoint
      // does not report changes twice.
      this._set(Math.cos(angle) * length, Math.sin(angle) * length)
    }
  }

  /**
   * Returns the smaller angle between two vectors. The angle is unsigned, no
   * information about rotational direction is given.
   *
   * @param point
   * @return the angle in degrees
   */
  getAngle(point: PointLike | number, y?: number): number {
    return this.getAngleInRadians(point, y) * 180 / Math.PI
  }

  /**
   * Returns the smaller angle between two vectors in radians. The angle is
   * unsigned, no information about rotational direction is given.
   *
   * @param point
   * @return the angle in radians
   */
  getAngleInRadians(point: PointLike | number, y?: number): number {
    const other = Point.from(point, y)
    const div = this.length * other.length
    if (isZero(div)) {
      return NaN
    } else {
      const a = this.dot(other) / div
      return Math.acos(a < -1 ? -1 : a > 1 ? 1 : a)
    }
  }

  /**
   * The quadrant of the {@link #angle} of the point.
   *
   * Angles between 0 and 90 degrees are in quadrant `1`. Angles between 90
   * and 180 degrees are in quadrant `2`, angles between 180 and 270 degrees
   * are in quadrant `3` and angles between 270 and 360 degrees are in
   * quadrant `4`.
   *
   *
   * @example
   * var point = new Point({
   *     angle: 10,
   *     length: 20
   * });
   * console.log(point.quadrant); // 1
   *
   * point.angle = 100;
   * console.log(point.quadrant); // 2
   *
   * point.angle = 190;
   * console.log(point.quadrant); // 3
   *
   * point.angle = 280;
   * console.log(point.quadrant); // 4
   */
  get quadrant(): number {
    return this.x >= 0 ? (this.y >= 0 ? 1 : 4) : this.y >= 0 ? 2 : 3
  }

  /**
   * Returns the angle between two vectors. The angle is directional and
   * signed, giving information about the rotational direction.
   *
   * Read more about angle units and orientation in the description of the
   * {@link #angle} property.
   *
   * @param point
   * @return the angle between the two vectors
   */
  getDirectedAngle(point: PointLike | number, y?: number): number {
    const other = Point.from(point, y)
    return Math.atan2(this.cross(other), this.dot(other)) * 180 / Math.PI
  }

  /**
   * Returns the distance between the point and another point.
   *
   * @param point
   * @param squared Controls whether the distance should
   * remain squared, or its square root should be calculated
   */
  getDistance(point: PointLike, squared?: boolean): number {
    const other = Point.from(point)
    const x = other.x - this.x
    const y = other.y - this.y
    const d = x * x + y * y
    return squared ? d : Math.sqrt(d)
  }

  /**
   * Normalize modifies the {@link #length} of the vector to `1` without
   * changing its angle and returns it as a new point. The optional `length`
   * parameter defines the length to normalize to. The object itself is not
   * modified!
   *
   * @param length The length of the normalized vector
   * @return the normalized vector of the vector that is represented
   *     by this point's coordinates
   */
  normalize(length = 1): Point {
    const current = this.length
    const scale = current !== 0 ? length / current : 0
    const point = new Point(this.x * scale, this.y * scale)
    // Preserve angle.
    if (scale >= 0) {
      point.#angle = this.#angle
    }
    return point
  }

  /**
   * Rotates the point by the given angle around an optional center point.
   * The object itself is not modified.
   *
   * Read more about angle units and orientation in the description of the
   * {@link #angle} property.
   *
   * @param angle the rotation angle
   * @param center the center point of the rotation
   * @return the rotated point
   */
  rotate(angle: number, center?: PointLike): Point {
    if (angle === 0) return this.clone()
    angle = angle * Math.PI / 180
    let point = center ? this.subtract(center) : this
    const sin = Math.sin(angle)
    const cos = Math.cos(angle)
    point = new Point(
      point.x * cos - point.y * sin,
      point.x * sin + point.y * cos
    )
    return center ? point.add(center) : point
  }

  /**
   * Transforms the point by the matrix as a new point. The object itself is
   * not modified!
   *
   * @param matrix
   * @return the transformed point
   */
  transform(matrix: Matrix): Point {
    return matrix ? matrix._transformPoint(this) : this
  }

  /**
   * Returns the addition of the supplied value to both coordinates of
   * the point as a new point.
   * The object itself is not modified!
   *
   * @operator
   * @param number the number to add
   * @return the addition of the point and the value as a new point
   *
   * @example
   * var point = new Point(5, 10);
   * var result = point + 20; // PaperScript
   * var result = point.add(20); // JavaScript
   * console.log(result); // {x: 25, y: 30}
   */
  add(number: number): Point
  /**
   * Returns the addition of the supplied point to the point as a new
   * point.
   * The object itself is not modified!
   *
   * @operator
   * @param point the point to add
   * @return the addition of the two points as a new point
   *
   * @example
   * var point1 = new Point(5, 10);
   * var point2 = new Point(10, 20);
   * var result = point1 + point2; // PaperScript
   * var result = point1.add(point2); // JavaScript
   * console.log(result); // {x: 15, y: 30}
   */
  add(point: PointLike): Point
  add(x: number, y: number): Point
  add(point: PointLike | number, y?: number): Point {
    const other = Point.from(point, y)
    return new Point(this.x + other.x, this.y + other.y)
  }

  /**
   * Returns the subtraction of the supplied value to both coordinates of
   * the point as a new point.
   * The object itself is not modified!
   *
   * @operator
   * @param number the number to subtract
   * @return the subtraction of the point and the value as a new point
   *
   * @example
   * var point = new Point(10, 20);
   * var result = point - 5; // PaperScript
   * var result = point.subtract(5); // JavaScript
   * console.log(result); // {x: 5, y: 15}
   */
  subtract(number: number): Point
  /**
   * Returns the subtraction of the supplied point to the point as a new
   * point.
   * The object itself is not modified!
   *
   * @operator
   * @param point the point to subtract
   * @return the subtraction of the two points as a new point
   *
   * @example
   * var firstPoint = new Point(10, 20);
   * var secondPoint = new Point(5, 5);
   * var result = firstPoint - secondPoint; // PaperScript
   * var result = firstPoint.subtract(secondPoint); // JavaScript
   * console.log(result); // {x: 5, y: 15}
   */
  subtract(point: PointLike): Point
  subtract(x: number, y: number): Point
  subtract(point: PointLike | number, y?: number): Point {
    const other = Point.from(point, y)
    return new Point(this.x - other.x, this.y - other.y)
  }

  /**
   * Returns the multiplication of the supplied value to both coordinates of
   * the point as a new point.
   * The object itself is not modified!
   *
   * @operator
   * @param number the number to multiply by
   * @return the multiplication of the point and the value as a new
   *     point
   *
   * @example
   * var point = new Point(10, 20);
   * var result = point * 2; // PaperScript
   * var result = point.multiply(2); // JavaScript
   * console.log(result); // {x: 20, y: 40}
   */
  multiply(number: number): Point
  /**
   * Returns the multiplication of the supplied point to the point as a new
   * point.
   * The object itself is not modified!
   *
   * @operator
   * @param point the point to multiply by
   * @return the multiplication of the two points as a new point
   *
   * @example
   * var firstPoint = new Point(5, 10);
   * var secondPoint = new Point(4, 2);
   * var result = firstPoint * secondPoint; // PaperScript
   * var result = firstPoint.multiply(secondPoint); // JavaScript
   * console.log(result); // {x: 20, y: 20}
   */
  multiply(point: PointLike): Point
  multiply(x: number, y: number): Point
  multiply(point: PointLike | number, y?: number): Point {
    const other = Point.from(point, y)
    return new Point(this.x * other.x, this.y * other.y)
  }

  /**
   * Returns the division of the supplied value to both coordinates of
   * the point as a new point.
   * The object itself is not modified!
   *
   * @operator
   * @param number the number to divide by
   * @return the division of the point and the value as a new point
   *
   * @example
   * var point = new Point(10, 20);
   * var result = point / 2; // PaperScript
   * var result = point.divide(2); // JavaScript
   * console.log(result); // {x: 5, y: 10}
   */
  divide(number: number): Point
  /**
   * Returns the division of the supplied point to the point as a new
   * point.
   * The object itself is not modified!
   *
   * @operator
   * @param point the point to divide by
   * @return the division of the two points as a new point
   *
   * @example
   * var firstPoint = new Point(8, 10);
   * var secondPoint = new Point(2, 5);
   * var result = firstPoint / secondPoint; // PaperScript
   * var result = firstPoint.divide(secondPoint); // JavaScript
   * console.log(result); // {x: 4, y: 2}
   */
  divide(point: PointLike): Point
  divide(x: number, y: number): Point
  divide(point: PointLike | number, y?: number): Point {
    const other = Point.from(point, y)
    return new Point(this.x / other.x, this.y / other.y)
  }

  /**
   * The modulo operator returns the integer remainders of dividing the point
   * by the supplied value as a new point.
   *
   * @operator
   * @param point
   * @return the integer remainders of dividing the points by each
   * other as a new point
   *
   * @example
   * var point = new Point(12, 6);
   * var result = point % new Point(5, 2); // PaperScript
   * var result = point.modulo(new Point(5, 2)); // JavaScript
   * console.log(result); // {x: 2, y: 0}
   */
  modulo(number: number): Point
  /**
   * The modulo operator returns the integer remainders of dividing the point
   * by the supplied value as a new point.
   *
   * @operator
   * @param value
   * @return the integer remainders of dividing the point by the value
   * as a new point
   *
   * @example
   * var point = new Point(12, 6);
   * var result = point % 5; // PaperScript
   * var result = point.modulo(5); // JavaScript
   * console.log(result); // {x: 2, y: 1}
   */
  modulo(point: PointLike): Point
  modulo(x: number, y: number): Point
  modulo(point: PointLike | number, y?: number): Point {
    const other = Point.from(point, y)
    return new Point(this.x % other.x, this.y % other.y)
  }

  /**
   * Returns a new point with both coordinates negated.
   * PaperScript uses it for the unary minus operator.
   * The object itself is not modified!
   *
   * @return the negation of the point as a new point
   *
   * @example
   * var point = new Point(12, -6);
   * var result = -point; // PaperScript
   * var result = point.negate(); // JavaScript
   * console.log(result); // {x: -12, y: 6}
   */
  negate(): Point {
    return new Point(-this.x, -this.y)
  }

  /**
   * {@grouptitle Tests}
   *
   * Checks whether the point is inside the boundaries of the rectangle.
   *
   * @param rect the rectangle to check against
   * @return {@true if the point is inside the rectangle}
   */
  isInside(rect: RectangleLike): boolean {
    return Rectangle.from(rect).contains(this)
  }

  /**
   * Checks if the point is within a given distance of another point.
   *
   * @param point the point to check against
   * @param tolerance the maximum distance allowed
   * @return {@true if it is within the given distance}
   */
  isClose(point: PointLike, tolerance: number): boolean {
    return this.getDistance(point) <= tolerance
  }

  /**
   * Checks if the vector represented by this point is collinear (parallel) to
   * another vector, within a tolerance of 1e-8 for the sine of the angle
   * between them.
   *
   * @param point the vector to check against
   * @return {@true it is collinear}
   */
  isCollinear(point: PointLike | number, y?: number): boolean {
    const other = Point.from(point, y)
    return Point.isCollinear(this.x, this.y, other.x, other.y)
  }

  /**
   * Checks if the vector represented by this point is orthogonal
   * (perpendicular) to another vector, within a tolerance of 1e-8 for the
   * cosine of the angle between them.
   *
   * @param point the vector to check against
   * @return {@true it is orthogonal}
   */
  isOrthogonal(point: PointLike | number, y?: number): boolean {
    const other = Point.from(point, y)
    return Point.isOrthogonal(this.x, this.y, other.x, other.y)
  }

  /**
   * Checks if this point has both the x and y coordinate set to 0, within
   * a tolerance of 1e-12, unlike {@link #equals(point)}, which compares
   * exactly.
   *
   * @return {@true if both x and y are 0, within the tolerance}
   */
  isZero(): boolean {
    return isZero(this.x) && isZero(this.y)
  }

  /**
   * Checks if this point has an undefined value for at least one of its
   * coordinates.
   *
   * @return {@true if either x or y are not a number}
   */
  isNaN(): boolean {
    return isNaN(this.x) || isNaN(this.y)
  }

  /**
   * Checks if the vector is within the specified quadrant. Note that if the
   * vector lies on the boundary between two quadrants, `true` will be
   * returned for both quadrants.
   *
   * @param quadrant the quadrant to check against
   * @return {@true if either x or y are not a number}
   * @see #quadrant
   */
  isInQuadrant(quadrant: number): boolean {
    // Map quadrant to x & y coordinate pairs and multiply with coordinates,
    // then check sign:
    // 1: [ 1,  1]
    // 2: [-1,  1]
    // 3: [-1, -1]
    // 4: [ 1, -1]
    return (
      this.x * (quadrant > 1 && quadrant < 4 ? -1 : 1) >= 0 &&
      this.y * (quadrant > 2 ? -1 : 1) >= 0
    )
  }

  /**
   * {@grouptitle Vector Math Functions}
   * Returns the dot product of the point and another point.
   *
   * @param point
   * @return the dot product of the two points
   */
  dot(point: PointLike | number, y?: number): number {
    const other = Point.from(point, y)
    return this.x * other.x + this.y * other.y
  }

  /**
   * Returns the cross product of the point and another point.
   *
   * @param point
   * @return the cross product of the two points
   */
  cross(point: PointLike | number, y?: number): number {
    const other = Point.from(point, y)
    return this.x * other.y - this.y * other.x
  }

  /**
   * Returns the projection of the point onto another point.
   * Both points are interpreted as vectors.
   *
   * @param point
   * @return the projection of the point onto another point
   */
  project(point: PointLike | number, y?: number): Point {
    const other = Point.from(point, y)
    const scale = other.isZero() ? 0 : this.dot(other) / other.dot(other)
    return new Point(
      other.x * scale,
      other.y * scale
    )
  }

  /**
   * Returns a new point with the {@link #x} and {@link #y} values clamped to
   * the range between the given minimum and maximum points. The object
   * itself is not modified!
   *
   * @param min the point with the smallest values
   * @param max the point with the largest values
   * @return the clamped point as a new point
   *
   * @example
   * var point = new Point(-5, 150);
   * var clampPoint = point.clamp(new Point(0, 0), new Point(100, 100));
   * console.log(clampPoint); // {x: 0, y: 100}
   *
   * @example
   * // Keep a point inside a rectangle:
   * var rect = new Rectangle(10, 20, 100, 50);
   * var point = new Point(200, 40);
   * var clampPoint = point.clamp(rect.topLeft, rect.bottomRight);
   * console.log(clampPoint); // {x: 110, y: 40}
   */
  clamp(min: PointLike, max: PointLike): Point {
    const { x: minX, y: minY } = Point.from(min)
    const { x: maxX, y: maxY } = Point.from(max)
    return new Point(
      clamp(this.x, minX, maxX),
      clamp(this.y, minY, maxY)
    )
  }

  /**
   * Returns the passed point if it is one already, or else a new point
   * created from the passed values, as {@link Point()} reads them.
   *
   * @param point
   * @param y
   */
  static from(point: PointLike | number, y?: number): Point {
    return point instanceof Point ? point : new Point(point, y)
  }

  /**
   * Returns a new point object with the smallest {@link #x} and
   * {@link #y} of the supplied points.
   *
   * @param point1
   * @param point2
   * @return the newly created point object
   *
   * @example
   * var point1 = new Point(10, 100);
   * var point2 = new Point(200, 5);
   * var minPoint = Point.min(point1, point2);
   * console.log(minPoint); // {x: 10, y: 5}
   *
   * @example
   * // Find the minimum of multiple points:
   * var point1 = new Point(60, 100);
   * var point2 = new Point(200, 5);
   * var point3 = new Point(250, 35);
   * [point1, point2, point3].reduce(Point.min) // {x: 60, y: 5}
   */
  static min(point1: PointLike, point2: PointLike): Point {
    const first = Point.from(point1)
    const second = Point.from(point2)
    return new Point(Math.min(first.x, second.x), Math.min(first.y, second.y))
  }

  /**
   * Returns a new point object with the largest {@link #x} and
   * {@link #y} of the supplied points.
   *
   * @param point1
   * @param point2
   * @return the newly created point object
   *
   * @example
   * var point1 = new Point(10, 100);
   * var point2 = new Point(200, 5);
   * var maxPoint = Point.max(point1, point2);
   * console.log(maxPoint); // {x: 200, y: 100}
   *
   * @example
   * // Find the maximum of multiple points:
   * var point1 = new Point(60, 100);
   * var point2 = new Point(200, 5);
   * var point3 = new Point(250, 35);
   * [point1, point2, point3].reduce(Point.max) // {x: 250, y: 100}
   */
  static max(point1: PointLike, point2: PointLike): Point {
    const first = Point.from(point1)
    const second = Point.from(point2)
    return new Point(Math.max(first.x, second.x), Math.max(first.y, second.y))
  }

  /**
   * Returns a point object with random {@link #x} and {@link #y} values
   * between `0` and `1`.
   *
   * @return the newly created point object
   *
   * @example
   * var maxPoint = new Point(100, 100);
   * var randomPoint = Point.random();
   *
   * // A point between {x:0, y:0} and {x:100, y:100}:
   * var point = maxPoint * randomPoint;
   */
  static random(): Point {
    return new Point(Math.random(), Math.random())
  }

  static isCollinear(
    x1: number, y1: number,
    x2: number, y2: number
  ): boolean {
    // NOTE: We use normalized vectors so that the epsilon comparison is
    // reliable. We could instead scale the epsilon based on the vector
    // length. But instead of normalizing the vectors before calculating
    // the cross product, we can scale the epsilon accordingly.
    return (
      Math.abs(x1 * y2 - y1 * x2) <=
      Math.sqrt((x1 * x1 + y1 * y1) * (x2 * x2 + y2 * y2)) *
      TRIGONOMETRIC_EPSILON
    )
  }

  static isOrthogonal(
    x1: number, y1: number,
    x2: number, y2: number
  ): boolean {
    // See Point.isCollinear()
    return (
      Math.abs(x1 * x2 + y1 * y2) <=
      Math.sqrt((x1 * x1 + y1 * y1) * (x2 * x2 + y2 * y2)) *
      TRIGONOMETRIC_EPSILON
    )
  }

  static {
    // Inject round, ceil, floor, abs:
    inject(
      this.prototype,
      ...['round', 'ceil', 'floor', 'abs'].map(key => {
        const op = Math[key]
        return {
          [key]() {
            return new Point(op(this.x), op(this.y))
          }
        }
      })
    )
  }
}

// The members defined at runtime rather than in the class body:
export interface Point {
  /**
   * This property is only valid if the point is an anchor or handle point
   * of a {@link Segment} or a {@link Curve}, or the position of an
   * {@link Item}, as returned by {@link Item#position},
   * {@link Segment#point}, {@link Segment#handleIn},
   * {@link Segment#handleOut}, {@link Curve#point1}, {@link Curve#point2},
   * {@link Curve#handle1}, {@link Curve#handle2}.
   *
   * In those cases, it returns {@true if it the point is selected}.
   *
   * Paper.js renders selected points on top of your project. This is very
   * useful when debugging.
   *
   * @default false
   *
   * @example {@paperscript}
   * var path = new Path.Circle({
   *     center: [80, 50],
   *     radius: 40
   * });
   *
   * // Select the third segment point:
   * path.segments[2].point.selected = true;
   *
   * // Select the item's position, which is the pivot point
   * // around which it is transformed:
   * path.position.selected = true;
   */
  selected: boolean

  /**
   * {@grouptitle Math Functions}
   *
   * Returns a new point with rounded {@link #x} and {@link #y} values. The
   * object itself is not modified!
   *
   *
   * @example
   * var point = new Point(10.2, 10.9);
   * var roundPoint = point.round();
   * console.log(roundPoint); // {x: 10, y: 11}
   */
  round(): Point

  /**
   * Returns a new point with the nearest greater non-fractional values to the
   * specified {@link #x} and {@link #y} values. The object itself is not
   * modified!
   *
   *
   * @example
   * var point = new Point(10.2, 10.9);
   * var ceilPoint = point.ceil();
   * console.log(ceilPoint); // {x: 11, y: 11}
   */
  ceil(): Point

  /**
   * Returns a new point with the nearest smaller non-fractional values to the
   * specified {@link #x} and {@link #y} values. The object itself is not
   * modified!
   *
   *
   * @example
   * var point = new Point(10.2, 10.9);
   * var floorPoint = point.floor();
   * console.log(floorPoint); // {x: 10, y: 10}
   */
  floor(): Point

  /**
   * Returns a new point with the absolute values of the specified {@link #x}
   * and {@link #y} values. The object itself is not modified!
   *
   *
   * @example
   * var point = new Point(-5, 10);
   * var absPoint = point.abs();
   * console.log(absPoint); // {x: 5, y: 10}
   */
  abs(): Point
}

/**
 * An internal version of Point that notifies its owner of each change
 * through setting itself again on the property that produced it.
 *
 * @private
 */
export class LinkedPoint extends Point {
  #x: number
  #y: number
  #owner: any
  #key: string

  constructor(x: number, y: number, owner: any, key: string) {
    super()
    this.#x = x
    this.#y = y
    this.#owner = owner
    this.#key = key
  }

  // See Point#_set() for an explanation of _set():
  _set(x: number, y: number, _dontNotify?: boolean): this {
    // Point's constructor calls this before the private fields exist, and the
    // constructor below sets them:
    if (#x in this) {
      this.#x = x
      this.#y = y
      if (!_dontNotify) {
        this.#owner[this.#key] = this
      }
    }
    return this
  }

  // @ts-expect-error: Point declares x as a field, LinkedPoint reads #x
  get x(): number {
    return this.#x
  }

  set x(x: number) {
    this.#x = x
    this.#owner[this.#key] = this
  }

  // @ts-expect-error: See x
  get y(): number {
    return this.#y
  }

  set y(y: number) {
    this.#y = y
    this.#owner[this.#key] = this
  }

  get selected(): boolean {
    return !!(this.#owner._selection & this.#getSelection())
  }

  set selected(selected: boolean) {
    this.#owner._changeSelection(this.#getSelection(), selected)
  }

  #getSelection(): number {
    return this.#key === 'position' ? ItemSelection.POSITION : 0
  }
}
