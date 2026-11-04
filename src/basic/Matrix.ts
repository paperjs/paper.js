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

// Based on goog.graphics.AffineTransform, as part of the Closure Library.
// Copyright 2008 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");

import { Base } from '../core/Base.ts'
import { serialize } from '../core/serialization.ts'
import { Formatter } from '../util/Formatter.ts'
import { inject } from '../util/object.ts'
import { Change } from '../constants.ts'
import { Point } from './Point.ts'
import type { PointLike } from './Point.ts'
import { Rectangle } from './Rectangle.ts'

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
  declare _a: number
  declare _b: number
  declare _c: number
  declare _d: number
  declare _tx: number
  declare _ty: number
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
   * Creates a 2D affine transformation matrix.
   *
   * @param values the matrix values to initialize this matrix with
   */
  constructor(values: number[])
  /**
   * Creates a 2D affine transformation matrix.
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
    this.set(a, b, c, d, tx, ty)
  }

  /**
   * Sets the matrix to the passed values. Note that any sequence of
   * parameters that is supported by the various {@link Matrix()} constructors
   * also work for calls of `set()`.
   *
   * @param values
   */
  set(
    a?: Matrix | number[] | number, b?: number | boolean,
    c?: number, d?: number,
    tx?: number, ty?: number,
    _dontNotify?: boolean
  ): this {
    if (typeof a === 'number') {
      this._set(a, b as number, c, d, tx, ty, _dontNotify)
    } else if (a === undefined) {
      this.reset()
    } else if (a instanceof Matrix) {
      // Pass on the optional _dontNotify argument:
      this._set(a._a, a._b, a._c, a._d, a._tx, a._ty, b as boolean)
    } else if (Array.isArray(a)) {
      this._set(a[0], a[1], a[2], a[3], a[4], a[5], b as boolean)
    } else {
      throw new Error('Unsupported matrix parameters')
    }
    return this
  }

  // See Point#_set() for an explanation of _set():
  _set(
    a: number, b: number,
    c: number, d: number,
    tx: number, ty: number,
    _dontNotify?: boolean
  ): this {
    this._a = a
    this._b = b
    this._c = c
    this._d = d
    this._tx = tx
    this._ty = ty
    if (!_dontNotify) {
      this.#changed()
    }
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
    return new Matrix(this._a, this._b, this._c, this._d, this._tx, this._ty)
  }

  /**
   * Checks whether the two matrices describe the same transformation.
   *
   * @param matrix the matrix to compare this matrix to
   * @return {@true if the matrices are equal}
   */
  equals(matrix: Matrix): boolean {
    return !!(
      matrix === this || (
        matrix &&
        this._a === matrix._a &&
        this._b === matrix._b &&
        this._c === matrix._c &&
        this._d === matrix._d &&
        this._tx === matrix._tx &&
        this._ty === matrix._ty
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
    return (
      `[[${format(this._a, this._c, this._tx)}], ` +
      `[${format(this._b, this._d, this._ty)}]]`
    )
  }

  /**
   * Resets the matrix by setting its values to the ones of the identity
   * matrix that results in no transformation.
   */
  reset(_dontNotify?: boolean): this {
    this._a = this._d = 1
    this._b = this._c = this._tx = this._ty = 0
    if (!_dontNotify) {
      this.#changed()
    }
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
   * Concatenates this matrix with a translate transformation.
   *
   * @param dx the distance to translate in the x direction
   * @param dy the distance to translate in the y direction
   * @return this affine transform
   */
  translate(dx: number, dy: number): this
  translate(point: PointLike | number, y?: number): this {
    const delta = Point.from(point, y)
    this._tx += delta.x * this._a + delta.y * this._c
    this._ty += delta.x * this._b + delta.y * this._d
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
   * Concatenates this matrix with a scaling transformation.
   *
   * @param hor the horizontal scaling factor
   * @param ver the vertical scaling factor
   * @param center the center for the scaling transformation
   * @return this affine transform
   */
  scale(hor: number, ver: number, center?: PointLike): this
  scale(
    hor: PointLike | number,
    ver?: PointLike | number,
    center?: PointLike | number
  ): this {
    const hasVer = typeof ver === 'number'
    const scale = Point.from(hor, hasVer ? ver : undefined)
    const origin = hasVer ? center : ver
    const point = origin ? Point.from(origin) : null
    if (point) {
      this.translate(point)
    }
    this._a *= scale.x
    this._b *= scale.x
    this._c *= scale.y
    this._d *= scale.y
    if (point) {
      this.translate(point.negate())
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
    const radians = angle * Math.PI / 180
    // Concatenate rotation matrix into this one
    const { x, y } = Point.from(center)
    const cos = Math.cos(radians)
    const sin = Math.sin(radians)
    const tx = x - x * cos + y * sin
    const ty = y - x * sin - y * cos
    const a = this._a
    const b = this._b
    const c = this._c
    const d = this._d
    this._a = cos * a + sin * c
    this._b = cos * b + sin * d
    this._c = -sin * a + cos * c
    this._d = -sin * b + cos * d
    this._tx += tx * a + ty * c
    this._ty += tx * b + ty * d
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
   * Concatenates this matrix with a shear transformation.
   *
   * @param hor the horizontal shear factor
   * @param ver the vertical shear factor
   * @param center the center for the shear transformation
   * @return this affine transform
   */
  shear(hor: number, ver: number, center?: PointLike): this
  shear(
    hor: PointLike | number,
    ver?: PointLike | number,
    center?: PointLike | number
  ): this {
    const hasVer = typeof ver === 'number'
    const shear = Point.from(hor, hasVer ? ver : undefined)
    const origin = hasVer ? center : ver
    const point = origin ? Point.from(origin) : null
    if (point) {
      this.translate(point)
    }
    const a = this._a
    const b = this._b
    this._a += shear.y * this._c
    this._b += shear.y * this._d
    this._c += shear.x * a
    this._d += shear.x * b
    if (point) {
      this.translate(point.negate())
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
   * Concatenates this matrix with a skew transformation.
   *
   * @param hor the horizontal skew angle in degrees
   * @param ver the vertical skew angle in degrees
   * @param center the center for the skew transformation
   * @return this affine transform
   */
  skew(hor: number, ver: number, center?: PointLike): this
  skew(
    hor: PointLike | number,
    ver?: PointLike | number,
    center?: PointLike | number
  ): this {
    const hasVer = typeof ver === 'number'
    const skew = Point.from(hor, hasVer ? ver : undefined)
    const origin = hasVer ? center : ver
    const toRadians = Math.PI / 180
    const shear = new Point(
      Math.tan(skew.x * toRadians),
      Math.tan(skew.y * toRadians)
    )
    return this.shear(shear, origin as PointLike)
  }

  /**
   * Appends the specified matrix to this matrix. This is the equivalent of
   * multiplying `(this matrix) * (specified matrix)`.
   *
   * @param matrix the matrix to append
   * @return this matrix, modified
   */
  append(matrix: Matrix, _dontNotify?: boolean): this {
    if (matrix) {
      const a1 = this._a
      const b1 = this._b
      const c1 = this._c
      const d1 = this._d
      const a2 = matrix._a
      const b2 = matrix._c
      const c2 = matrix._b
      const d2 = matrix._d
      const tx2 = matrix._tx
      const ty2 = matrix._ty
      this._a = a2 * a1 + c2 * c1
      this._c = b2 * a1 + d2 * c1
      this._b = a2 * b1 + c2 * d1
      this._d = b2 * b1 + d2 * d1
      this._tx += tx2 * a1 + ty2 * c1
      this._ty += tx2 * b1 + ty2 * d1
      if (!_dontNotify) {
        this.#changed()
      }
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
  prepend(matrix: Matrix, _dontNotify?: boolean): this {
    if (matrix) {
      const a1 = this._a
      const b1 = this._b
      const c1 = this._c
      const d1 = this._d
      const tx1 = this._tx
      const ty1 = this._ty
      const a2 = matrix._a
      const b2 = matrix._c
      const c2 = matrix._b
      const d2 = matrix._d
      const tx2 = matrix._tx
      const ty2 = matrix._ty
      this._a = a2 * a1 + b2 * b1
      this._c = a2 * c1 + b2 * d1
      this._b = c2 * a1 + d2 * b1
      this._d = c2 * c1 + d2 * d1
      this._tx = a2 * tx1 + b2 * ty1 + tx2
      this._ty = c2 * tx1 + d2 * ty1 + ty2
      if (!_dontNotify) {
        this.#changed()
      }
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
  appended(matrix: Matrix): Matrix {
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
  prepended(matrix: Matrix): Matrix {
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
    let res = null
    if (this.isInvertible()) {
      const a = this._a
      const b = this._b
      const c = this._c
      const d = this._d
      const tx = this._tx
      const ty = this._ty
      const det = a * d - b * c
      this._a = d / det
      this._b = -b / det
      this._c = -c / det
      this._d = a / det
      this._tx = (c * ty - d * tx) / det
      this._ty = (b * tx - a * ty) / det
      res = this
    }
    return res
  }

  /**
   * Creates a new matrix that is the inversion of this matrix, causing it to
   * perform the opposite transformation. If the matrix is not invertible (in
   * which case {@link #isSingular()} returns true), `null` is returned.
   *
   * @return this matrix, or `null`, if the matrix is singular.
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
    return new Matrix(this._a, this._b, this._c, this._d, 0, 0)
  }

  _orNullIfIdentity(): this | null {
    return this.isIdentity() ? null : this
  }

  /**
   * @return whether this matrix is the identity matrix
   */
  isIdentity(): boolean {
    return (
      this._a === 1 &&
      this._b === 0 &&
      this._c === 0 &&
      this._d === 1 &&
      this._tx === 0 &&
      this._ty === 0
    )
  }

  /**
   * Checks whether the matrix is invertible. A matrix is not invertible if
   * the determinant is 0 or any value is infinite or NaN.
   *
   * @return whether the matrix is invertible
   */
  isInvertible(): boolean {
    const det = this._a * this._d - this._c * this._b
    return !!det && !isNaN(det) && isFinite(this._tx) && isFinite(this._ty)
  }

  // The geometric mean of the scale factors, as used for strokes:
  _getMeanScale(): number {
    return Math.sqrt(Math.abs(this._a * this._d - this._b * this._c))
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
  _transformPoint(point: Point, dest?: Point, _dontNotify?: boolean): Point {
    const { x, y } = point
    return (dest || new Point())._set(
      x * this._a + y * this._c + this._tx,
      x * this._b + y * this._d + this._ty,
      // @ts-expect-error: Only LinkedPoint and SegmentPoint take _dontNotify
      _dontNotify
    )
  }

  _transformCoordinates(src: number[], dst: number[], count: number) {
    for (let i = 0, max = 2 * count; i < max; i += 2) {
      const x = src[i]
      const y = src[i + 1]
      dst[i] = x * this._a + y * this._c + this._tx
      dst[i + 1] = x * this._b + y * this._d + this._ty
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
    return (dest || new Rectangle())._set(
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
    let res = null
    if (this.isInvertible()) {
      const a = this._a
      const b = this._b
      const c = this._c
      const d = this._d
      const det = a * d - b * c
      const x = point.x - this._tx
      const y = point.y - this._ty
      res = new Point((x * d - y * c) / det, (y * a - x * b) / det)
    }
    return res
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
    const a = this._a
    const b = this._b
    const c = this._c
    const d = this._d
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
  get values(): number[] {
    return [this._a, this._b, this._c, this._d, this._tx, this._ty]
  }

  /**
   * The translation of the matrix as a vector.
   */
  get translation(): Point {
    // No decomposition is required to extract translation.
    return new Point(this._tx, this._ty)
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
      ctx.transform(this._a, this._b, this._c, this._d, this._tx, this._ty)
    }
  }

  /**
   * Returns the horizontal and vertical half-extents of a circle of the
   * given radius, transformed by the matrix, if any.
   */
  static _getCircleExtents(radius: number, matrix?: Matrix): number[] {
    if (!matrix) return [radius, radius]
    // x = radius * (a * cos(t) + c * sin(t)) is at most
    // radius * sqrt(a² + c²), and y the same with b and d:
    const a = matrix._a
    const b = matrix._b
    const c = matrix._c
    const d = matrix._d
    return [
      radius * Math.sqrt(a * a + c * c),
      radius * Math.sqrt(b * b + d * d)
    ]
  }

  static {
    // Inject accessors for the values, that notify the owner of changes:
    inject(
      this.prototype,
      ...['a', 'b', 'c', 'd', 'tx', 'ty'].map(key => {
        const field = `_${key}`
        return {
          get [key]() {
            return this[field]
          },
          set [key](value: number) {
            this[field] = value
            this.#changed()
          }
        }
      })
    )
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
