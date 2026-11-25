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

// Based on goog.graphics.AffineTransform, as part of the Closure Library.
// Copyright 2008 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");

import { Change } from '../constants.ts'
import { inject } from '../util/object.ts'
import { Formatter } from '../util/Formatter.ts'
import { registerClasses, serialize } from '../core/serialization.ts'
import { Base } from '../core/Base.ts'
import { Point } from './Point.ts'
import { Rectangle } from './Rectangle.ts'
import {
  appendMatrix,
  createMatrix,
  inverseTransformPoint,
  prependMatrix,
  resetMatrix,
  rotateMatrix,
  scaleMatrix,
  setMatrix,
  transformPoint,
  translateMatrix
} from '../values/matrix.ts'
import type { PointLike } from './Point.ts'
import type { MatrixValues } from '../values/matrix.ts'

/**
 * An affine transformation matrix performs a linear mapping from 2D
 * coordinates to other 2D coordinates that preserves the "straightness" and
 * "parallelness" of lines.
 *
 * Such a coordinate transformation can be represented by a 3 row by 3
 * column matrix with an implied last row of `[ 0 0 1 ]`. This matrix
 * transforms source coordinates `(x, y)` into destination coordinates `(x',y')`
 * by considering them to be a column vector and multiplying the coordinate
 * vector by the matrix according to the following process:
 *
 *     [ x ]   [ a  c  tx ] [ x ]   [ a * x + c * y + tx ]
 *     [ y ] = [ b  d  ty ] [ y ] = [ b * x + d * y + ty ]
 *     [ 1 ]   [ 0  0  1  ] [ 1 ]   [         1          ]
 *
 * Note the locations of b and c.
 *
 * This class is optimized for speed and minimizes calculations based on its
 * knowledge of the underlying matrix (as opposed to say simply performing
 * matrix multiplication).
 */
export class Matrix extends Base {
  // The values that Item#transform() saves before it applies the matrix:
  declare _backup: number[]
  // The values a, b, c, d, tx and ty:
  declare _values: MatrixValues
  // The item or view that the matrix belongs to, if any:
  declare _owner: any

  /**
   * Creates a 2D affine transformation matrix that describes the identity
   * transformation.
   */
  constructor()
  /**
   * Creates a 2D affine transformation matrix.
   *
   * @param a the a property of the transform
   * @param b the b property of the transform
   * @param c the c property of the transform
   * @param d the d property of the transform
   * @param tx the tx property of the transform
   * @param ty the ty property of the transform
   */
  constructor(
    a: number, b: number,
    c: number, d: number,
    tx: number, ty: number
  )
  /**
   * Creates a 2D affine transformation matrix from the values in the given
   * array.
   *
   * @param values the matrix values to initialize this matrix with
   */
  constructor(values: number[])
  /**
   * Creates a 2D affine transformation matrix with the values of the given
   * matrix.
   *
   * @param matrix the matrix to copy the values from
   */
  constructor(matrix: Matrix)
  constructor(
    a?: Matrix | number[] | number, b?: number,
    c?: number, d?: number,
    tx?: number, ty?: number
  ) {
    super()
    // Most matrices are created without values, or with all six: Create
    // their array as it is, where set() would write it a second time:
    if (typeof a === 'number' && ty !== undefined) {
      this._values = [a, b, c, d, tx, ty] as MatrixValues
    } else {
      this._values = createMatrix()
      if (a !== undefined) {
        this.set(a, b, c, d, tx, ty)
      }
    }
  }

  /**
   * Sets the matrix to the passed values. Note that any sequence of
   * parameters that is supported by the various {@link Matrix()} constructors
   * also work for calls of `set()`.
   *
   * @param values
   */
  set(...values: any[]): this
  set(
    a?: Matrix | number[] | number, b?: number,
    c?: number, d?: number,
    tx?: number, ty?: number
  ): this {
    if (typeof a === 'number' && ty !== undefined) {
      this._set(a, b!, c!, d!, tx!, ty)
    } else if (a === undefined) {
      this.reset()
    } else if (a instanceof Matrix) {
      const v = a._values
      this._set(v[0], v[1], v[2], v[3], v[4], v[5])
    } else if (Array.isArray(a)) {
      this._set(a[0], a[1], a[2], a[3], a[4], a[5])
    } else {
      throw new Error('Unsupported matrix parameters')
    }
    return this
  }

  // See Point#_set() for an explanation of _set():
  _set(
    a: number, b: number,
    c: number, d: number,
    tx: number, ty: number
  ): this {
    setMatrix(this._values, a, b, c, d, tx, ty)
    this.#changed()
    return this
  }

  _serialize(options: any, dictionary: any) {
    return serialize(this.values, options, true, dictionary)
  }

  #changed() {
    const owner = this._owner
    if (owner) {
      // If owner has #applyMatrix set, directly bake the change in now.
      if (owner._applyMatrix) {
        owner.transform(null, true)
      } else {
        owner._changed(Change.MATRIX)
      }
    }
  }

  /**
   * @return a copy of this transform
   */
  clone(): Matrix {
    const v = this._values
    return new Matrix(v[0], v[1], v[2], v[3], v[4], v[5])
  }

  /**
   * Checks whether the two matrices describe the same transformation.
   *
   * @param matrix the matrix to compare this matrix to
   * @return {@true if the matrices are equal}
   */
  equals(matrix?: Matrix | null): boolean {
    const v = this._values
    const m = matrix?._values
    return !!(
      matrix === this || (
        m &&
        v[0] === m[0] &&
        v[1] === m[1] &&
        v[2] === m[2] &&
        v[3] === m[3] &&
        v[4] === m[4] &&
        v[5] === m[5]
      )
    )
  }

  /**
   * @return a string representation of this transform
   */
  toString(): string {
    const { instance } = Formatter
    const format = (...values: number[]) =>
      values.map(value => instance.number(value)).join(', ')
    const v = this._values
    return `[[${format(v[0], v[2], v[4])}], [${format(v[1], v[3], v[5])}]]`
  }

  /**
   * Resets the matrix by setting its values to the ones of the identity
   * matrix that results in no transformation.
   */
  reset(): this {
    resetMatrix(this._values)
    this.#changed()
    return this
  }

  /**
   * Attempts to apply the matrix to the content of item that it belongs to,
   * meaning its transformation is baked into the item's content or children.
   *
   * @param recursively controls whether to apply
   *     transformations recursively on children
   * @return {@true if the matrix was applied}
   */
  apply(recursively = true, _setApplyMatrix?: boolean): boolean {
    const owner = this._owner
    if (owner) {
      owner.transform(null, recursively, _setApplyMatrix)
      // If the matrix was successfully applied, it will be reset now.
      return this.isIdentity()
    }
    return false
  }

  /**
   * Concatenates this matrix with a translate transformation.
   *
   * @param point the vector to translate by
   * @return this affine transform
   */
  translate(point: PointLike): this
  /**
   * Concatenates this matrix with a translate transformation by the given
   * horizontal and vertical distances.
   *
   * @param dx the distance to translate in the x direction
   * @param dy the distance to translate in the y direction
   * @return this affine transform
   */
  translate(dx: number, dy: number): this
  translate(arg0: PointLike | number, arg1?: number): this {
    const { x, y } = Point.from(arg0, arg1)
    translateMatrix(this._values, x, y)
    this.#changed()
    return this
  }

  /**
   * Concatenates this matrix with a scaling transformation.
   *
   * @param scale the scaling factor
   * @param center the center for the scaling transformation
   * @return this affine transform
   */
  scale(scale: PointLike | number, center?: PointLike): this
  /**
   * Concatenates this matrix with a scaling transformation by separate
   * horizontal and vertical factors.
   *
   * @param hor the horizontal scaling factor
   * @param ver the vertical scaling factor
   * @param center the center for the scaling transformation
   * @return this affine transform
   */
  scale(hor: number, ver: number, center?: PointLike): this
  scale(
    arg0: PointLike | number,
    arg1?: PointLike | number,
    arg2?: PointLike
  ): this {
    const hasVer = typeof arg1 === 'number'
    const scale = Point.from(arg0, hasVer ? arg1 : undefined)
    const origin = hasVer ? arg2 : arg1
    const center = origin ? Point.from(origin) : null
    if (center) {
      translateMatrix(this._values, center.x, center.y)
    }
    scaleMatrix(this._values, scale.x, scale.y)
    if (center) {
      translateMatrix(this._values, -center.x, -center.y)
    }
    this.#changed()
    return this
  }

  /**
   * Concatenates this matrix with a rotation transformation around an
   * anchor point.
   *
   * @param angle the angle of rotation measured in degrees
   * @param center the anchor point to rotate around
   * @return this affine transform
   */
  rotate(angle: number, center?: PointLike): this {
    const { x, y } = Point.from(center)
    rotateMatrix(this._values, angle, x, y)
    this.#changed()
    return this
  }

  /**
   * Concatenates this matrix with a shear transformation.
   *
   * @param shear the shear factor in x and y direction
   * @param center the center for the shear transformation
   * @return this affine transform
   */
  shear(shear: PointLike | number, center?: PointLike): this
  /**
   * Concatenates this matrix with a shear transformation by separate
   * horizontal and vertical factors.
   *
   * @param hor the horizontal shear factor
   * @param ver the vertical shear factor
   * @param center the center for the shear transformation
   * @return this affine transform
   */
  shear(hor: number, ver: number, center?: PointLike): this
  shear(
    arg0: PointLike | number,
    arg1?: PointLike | number,
    arg2?: PointLike
  ): this {
    const hasVer = typeof arg1 === 'number'
    const shear = Point.from(arg0, hasVer ? arg1 : undefined)
    const origin = hasVer ? arg2 : arg1
    const center = origin ? Point.from(origin) : null
    const v = this._values
    if (center) {
      translateMatrix(v, center.x, center.y)
    }
    const a = v[0]
    const b = v[1]
    v[0] += shear.y * v[2]
    v[1] += shear.y * v[3]
    v[2] += shear.x * a
    v[3] += shear.x * b
    if (center) {
      translateMatrix(v, -center.x, -center.y)
    }
    this.#changed()
    return this
  }

  /**
   * Concatenates this matrix with a skew transformation.
   *
   * @param skew the skew angles in x and y direction in degrees
   * @param center the center for the skew transformation
   * @return this affine transform
   */
  skew(skew: PointLike | number, center?: PointLike): this
  /**
   * Concatenates this matrix with a skew transformation by separate
   * horizontal and vertical angles.
   *
   * @param hor the horizontal skew angle in degrees
   * @param ver the vertical skew angle in degrees
   * @param center the center for the skew transformation
   * @return this affine transform
   */
  skew(hor: number, ver: number, center?: PointLike): this
  skew(
    arg0: PointLike | number,
    arg1?: PointLike | number,
    arg2?: PointLike
  ): this {
    const hasVer = typeof arg1 === 'number'
    const skew = Point.from(arg0, hasVer ? arg1 : undefined)
    const center = hasVer ? arg2 : arg1
    const toRadians = Math.PI / 180
    const shear = new Point(
      Math.tan(skew.x * toRadians),
      Math.tan(skew.y * toRadians)
    )
    return this.shear(shear, center as PointLike)
  }

  /**
   * Appends the specified matrix to this matrix. This is the equivalent of
   * multiplying `(this matrix) * (specified matrix)`.
   *
   * @param matrix the matrix to append
   * @return this matrix, modified
   */
  append(matrix?: Matrix | null): this {
    if (matrix) {
      appendMatrix(this._values, matrix._values)
      this.#changed()
    }
    return this
  }

  /**
   * Prepends the specified matrix to this matrix. This is the equivalent of
   * multiplying `(specified matrix) * (this matrix)`.
   *
   * @param matrix the matrix to prepend
   * @return this matrix, modified
   */
  prepend(matrix?: Matrix | null): this {
    if (matrix) {
      prependMatrix(this._values, matrix._values)
      this.#changed()
    }
    return this
  }

  /**
   * Returns a new matrix as the result of appending the specified matrix to
   * this matrix. This is the equivalent of multiplying
   * `(this matrix) * (specified matrix)`.
   *
   * @param matrix the matrix to append
   * @return the newly created matrix
   */
  appended(matrix?: Matrix | null): Matrix {
    return this.clone().append(matrix)
  }

  /**
   * Returns a new matrix as the result of prepending the specified matrix
   * to this matrix. This is the equivalent of multiplying
   * `(specified matrix) * (this matrix)`.
   *
   * @param matrix the matrix to prepend
   * @return the newly created matrix
   */
  prepended(matrix?: Matrix | null): Matrix {
    return this.clone().prepend(matrix)
  }

  /**
   * Inverts the matrix, causing it to perform the opposite transformation.
   * If the matrix is not invertible (in which case {@link #isSingular()}
   * returns true), `null` is returned.
   *
   * @return this matrix, or `null`, if the matrix is singular.
   */
  invert(): this | null {
    let res: this | null = null
    if (this.isInvertible()) {
      const v = this._values
      const a = v[0]
      const b = v[1]
      const c = v[2]
      const d = v[3]
      const tx = v[4]
      const ty = v[5]
      const det = a * d - b * c
      v[0] = d / det
      v[1] = -b / det
      v[2] = -c / det
      v[3] = a / det
      v[4] = (c * ty - d * tx) / det
      v[5] = (b * tx - a * ty) / det
      res = this
    }
    return res
  }

  /**
   * Creates a new matrix that is the inversion of this matrix, causing it to
   * perform the opposite transformation. If the matrix is not invertible (in
   * which case {@link #isSingular()} returns true), `null` is returned.
   *
   * @return the inverted matrix, or `null`, if the matrix is singular
   */
  inverted(): Matrix | null {
    return this.clone().invert()
  }

  /**
   * A private helper function to create a clone of this matrix, without the
   * translation factored in.
   *
   * @return a clone of this matrix, with {@link #tx} and {@link #ty}
   * set to `0`.
   */
  _shiftless(): Matrix {
    const v = this._values
    return new Matrix(v[0], v[1], v[2], v[3], 0, 0)
  }

  _orNullIfIdentity(): this | null {
    return this.isIdentity() ? null : this
  }

  /**
   * @return whether this matrix is the identity matrix
   */
  isIdentity(): boolean {
    const v = this._values
    return (
      v[0] === 1 &&
      v[1] === 0 &&
      v[2] === 0 &&
      v[3] === 1 &&
      v[4] === 0 &&
      v[5] === 0
    )
  }

  /**
   * Checks whether the matrix is invertible. A matrix is not invertible if
   * the determinant is 0 or any value is infinite or NaN.
   *
   * @return whether the matrix is invertible
   */
  isInvertible(): boolean {
    const v = this._values
    const det = v[0] * v[3] - v[2] * v[1]
    return !!det && !isNaN(det) && isFinite(v[4]) && isFinite(v[5])
  }

  // The geometric mean of the scale factors, as used for strokes:
  _getMeanScale(): number {
    const v = this._values
    return Math.sqrt(Math.abs(v[0] * v[3] - v[1] * v[2]))
  }

  /**
   * Checks whether the matrix is singular or not. Singular matrices cannot be
   * inverted.
   *
   * @return whether the matrix is singular
   */
  isSingular(): boolean {
    return !this.isInvertible()
  }

  /**
   * Transforms a point and returns the result.
   *
   * @param point the point to be transformed
   * @return the transformed point
   */
  transform(point: PointLike | number, y?: number): Point
  /**
   * Transforms an array of coordinates by this matrix and stores the results
   * into the destination array, which is also returned.
   *
   * @param src the array containing the source points
   * as x, y value pairs
   * @param dst the array into which to store the transformed
   * point pairs
   * @param count the number of points to transform
   * @return the dst array, containing the transformed coordinates
   */
  transform(src: number[], dst: number[], count: number): number[]
  transform(
    src: PointLike | number,
    dst?: number[] | number,
    count?: number
  ): Point | number[] {
    return count === undefined
      ? // TODO: Check for rectangle and use _tranformBounds?
        this._transformPoint(Point.from(src, dst as number))
      : this._transformCoordinates(src as number[], dst as number[], count)
  }

  /**
   * A faster version of transform that only takes one point and does not
   * attempt to convert it.
   */
  _transformPoint(point: Point, dest?: Point): Point {
    return transformPoint(this._values, point, dest)
  }

  _transformCoordinates(src: number[], dst: number[], count: number) {
    const v = this._values
    for (let i = 0, max = 2 * count; i < max; i += 2) {
      const x = src[i]
      const y = src[i + 1]
      dst[i] = x * v[0] + y * v[2] + v[4]
      dst[i + 1] = x * v[1] + y * v[3] + v[5]
    }
    return dst
  }

  _transformCorners(rect: Rectangle): number[] {
    const x1 = rect.x
    const y1 = rect.y
    const x2 = x1 + rect.width
    const y2 = y1 + rect.height
    const coords = [x1, y1, x2, y1, x2, y2, x1, y2]
    return this._transformCoordinates(coords, coords, 4)
  }

  /**
   * Returns the 'transformed' bounds rectangle by transforming each corner
   * point and finding the new bounding box to these points. This is not
   * really the transformed rectangle!
   */
  _transformBounds(bounds: Rectangle, dest?: Rectangle): Rectangle {
    const coords = this._transformCorners(bounds)
    const min = coords.slice(0, 2)
    const max = min.slice()
    for (let i = 2; i < 8; i++) {
      const val = coords[i]
      const j = i & 1
      if (val < min[j]) {
        min[j] = val
      } else if (val > max[j]) {
        max[j] = val
      }
    }
    return (dest ?? new Rectangle())._set(
      min[0], min[1],
      max[0] - min[0], max[1] - min[1]
    )
  }

  /**
   * Inverse transforms a point and returns the result.
   *
   * @param point the point to be transformed
   */
  inverseTransform(point: PointLike | number, y?: number): Point | null {
    return this._inverseTransform(Point.from(point, y))
  }

  _inverseTransform(point: Point): Point | null {
    return this.isInvertible()
      ? inverseTransformPoint(this._values, point)
      : null
  }

  /**
   * Decomposes the affine transformation described by this matrix into
   * `scaling`, `rotation` and `skewing`, and returns an object with
   * these properties.
   *
   * @return the decomposed matrix
   */
  decompose(): {
    translation: Point
    rotation: number
    scaling: Point
    skewing: Point
  } {
    // http://dev.w3.org/csswg/css3-2d-transforms/#matrix-decomposition
    // http://www.maths-informatique-jeux.com/blog/frederic/?post/2013/12/01/Decomposition-of-2D-transform-matrices
    // https://github.com/wisec/DOMinator/blob/master/layout/style/nsStyleAnimation.cpp#L946
    const v = this._values
    const a = v[0]
    const b = v[1]
    const c = v[2]
    const d = v[3]
    const det = a * d - b * c
    const { sqrt, atan2 } = Math
    const degrees = 180 / Math.PI
    let rotate
    let scale
    let skew
    if (a !== 0 || b !== 0) {
      const r = sqrt(a * a + b * b)
      rotate = Math.acos(a / r) * (b > 0 ? 1 : -1)
      scale = [r, det / r]
      skew = [atan2(a * c + b * d, r * r), 0]
    } else if (c !== 0 || d !== 0) {
      const s = sqrt(c * c + d * d)
      // rotate = Math.PI/2 - (d > 0 ? Math.acos(-c/s) : -Math.acos(c/s));
      rotate = Math.asin(c / s) * (d > 0 ? 1 : -1)
      scale = [det / s, s]
      skew = [0, atan2(a * c + b * d, s * s)]
    } else {
      // a = b = c = d = 0
      rotate = 0
      skew = scale = [0, 0]
    }
    return {
      translation: this.translation,
      rotation: rotate * degrees,
      scaling: new Point(scale),
      skewing: new Point(skew[0] * degrees, skew[1] * degrees)
    }
  }

  /**
   * The matrix values as an array, in the same sequence as they are passed
   * to {@link Matrix()}.
   */
  get values(): MatrixValues {
    return [...this._values]
  }

  /**
   * The translation of the matrix as a vector.
   */
  get translation(): Point {
    // No decomposition is required to extract translation.
    const v = this._values
    return new Point(v[4], v[5])
  }

  /**
   * The scaling values of the matrix, if it can be decomposed.
   *
   * @see #decompose()
   */
  get scaling(): Point {
    return this.decompose().scaling
  }

  /**
   * The rotation angle of the matrix, if it can be decomposed.
   *
   * @see #decompose()
   */
  get rotation(): number {
    return this.decompose().rotation
  }

  /**
   * Applies this matrix to the specified Canvas Context.
   *
   * @param ctx
   */
  applyToContext(ctx: CanvasRenderingContext2D) {
    if (!this.isIdentity()) {
      const v = this._values
      ctx.transform(v[0], v[1], v[2], v[3], v[4], v[5])
    }
  }

  /**
   * Returns the horizontal and vertical half-extents of a circle of the
   * given radius, transformed by the matrix, if any.
   */
  static _getCircleExtents(
    radius: number,
    matrix?: Matrix | null
  ): number[] {
    if (!matrix) return [radius, radius]
    // x = radius * (a * cos(t) + c * sin(t)) is at most
    // radius * sqrt(a² + c²), and y the same with b and d:
    const v = matrix._values
    const a = v[0]
    const b = v[1]
    const c = v[2]
    const d = v[3]
    return [
      radius * Math.sqrt(a * a + c * c),
      radius * Math.sqrt(b * b + d * d)
    ]
  }

  static {
    registerClasses({ Matrix: this })
    // Inject accessors for the values, that notify the owner of changes:
    for (const [index, key] of ['a', 'b', 'c', 'd', 'tx', 'ty'].entries()) {
      inject(this.prototype, {
        get [key]() {
          return this._values[index]
        },
        set [key](value: number) {
          this._values[index] = value
          this.#changed()
        }
      })
    }
  }
}

// The members defined at runtime rather than in the class body:
export interface Matrix {
  /**
   * The value that affects the transformation along the x axis when scaling
   * or rotating, positioned at (0, 0) in the transformation matrix.
   */
  a: number

  /**
   * The value that affects the transformation along the y axis when rotating
   * or skewing, positioned at (1, 0) in the transformation matrix.
   */
  b: number

  /**
   * The value that affects the transformation along the x axis when rotating
   * or skewing, positioned at (0, 1) in the transformation matrix.
   */
  c: number

  /**
   * The value that affects the transformation along the y axis when scaling
   * or rotating, positioned at (1, 1) in the transformation matrix.
   */
  d: number

  /**
   * The distance by which to translate along the x axis, positioned at (2, 0)
   * in the transformation matrix.
   */
  tx: number

  /**
   * The distance by which to translate along the y axis, positioned at (2, 1)
   * in the transformation matrix.
   */
  ty: number
}
