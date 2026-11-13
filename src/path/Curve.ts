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

import {
  Base,
  Bezier,
  CURVETIME_EPSILON,
  CurveLocation,
  GEOMETRIC_EPSILON,
  Line,
  MACHINE_EPSILON,
  Path,
  Point,
  Rectangle,
  Segment,
  TRIGONOMETRIC_EPSILON,
  capitalize,
  curveEvaluations,
  findCurveBoundsCollisions,
  getEpsilon,
  getSegmentBounds,
  getSegmentStrokeBounds,
  inject,
  isZero,
  serialize,
  solveBernstein,
  solveQuadratic
} from '../internal.ts'
import type { PointLike } from '../basic/Point.ts'
import type { Matrix } from '../basic/Matrix.ts'
import type { BezierValues } from '../curve/bezier.ts'

/**
 * The Curve object represents the parts of a path that are connected by
 * two following {@link Segment} objects. The curves of a path can be accessed
 * through its {@link Path#curves} array.
 *
 * While a segment describe the anchor point and its incoming and outgoing
 * handles, a Curve object describes the curve passing between two such
 * segments. Curves and segments represent two different ways of looking at the
 * same thing, but focusing on different aspects. Curves for example offer many
 * convenient ways to work with parts of the path, finding lengths, positions or
 * tangents at given offsets.
 */
export class Curve extends Base {
  _path: Path
  _segment1: Segment
  _segment2: Segment
  #length: number
  #bounds: Record<string, Rectangle>

  /**
   * Creates a new curve object between two segments, which are copied.
   *
   * @param segment1 the first segment of the curve
   * @param segment2 the second segment of the curve
   */
  constructor(segment1: Segment, segment2: Segment)
  /**
   * Creates a new curve object from its anchor points and handles.
   *
   * @param point1 the first anchor point of the curve
   * @param handle1 the handle of the first anchor point, relative to it
   * @param handle2 the handle of the second anchor point, relative to it
   * @param point2 the second anchor point of the curve
   */
  constructor(
    point1: PointLike,
    handle1: PointLike,
    handle2: PointLike,
    point2: PointLike
  )
  /**
   * Creates a new curve object from another curve, from an object with its
   * points and handles as {@link #toString()} prints them, or from the
   * values that {@link #getValues()} returns.
   *
   * @param object the curve, the object with its points and handles, or
   *     the curve values
   */
  constructor(
    object?:
      | { segment1: Segment; segment2: Segment }
      | {
          point1: PointLike
          handle1?: PointLike
          handle2?: PointLike
          point2: PointLike
        }
      | number[]
  )
  // Creates a curve of a path, as Path#curves does, for internal use:
  constructor(path: Path, segment1: Segment, segment2: Segment)
  constructor(arg0?: any, arg1?: any, arg2?: any, arg3?: any) {
    super()
    const count = arguments.length
    let segment1: Segment
    let segment2: Segment
    let point1: PointLike
    let point2: PointLike
    let handle1: PointLike
    let handle2: PointLike
    // The following code has to either set segment1 & segment2,
    // or point1, point2, handle1 & handle2. At the end, the internal
    // segments are created accordingly.
    if (count === 3) {
      // Undocumented internal constructor, used by Path#curves
      // new Segment(path, segment1, segment2);
      this._path = arg0
      segment1 = arg1
      segment2 = arg2
    } else if (!count) {
      segment1 = new Segment()
      segment2 = new Segment()
    } else if (count === 1) {
      // new Segment(segment);
      // NOTE: This copies from existing segments through their accessors
      if ('segment1' in arg0) {
        segment1 = new Segment(arg0.segment1)
        segment2 = new Segment(arg0.segment2)
      } else if ('point1' in arg0) {
        // As printed by #toString()
        point1 = arg0.point1
        handle1 = arg0.handle1
        handle2 = arg0.handle2
        point2 = arg0.point2
      } else if (Array.isArray(arg0)) {
        // Convert getValues() array back to points and handles so we
        // can create segments for those.
        point1 = [arg0[0], arg0[1]]
        point2 = [arg0[6], arg0[7]]
        handle1 = [arg0[2] - arg0[0], arg0[3] - arg0[1]]
        handle2 = [arg0[4] - arg0[6], arg0[5] - arg0[7]]
      }
    } else if (count === 2) {
      // new Segment(segment1, segment2);
      segment1 = new Segment(arg0)
      segment2 = new Segment(arg1)
    } else if (count === 4) {
      point1 = arg0
      handle1 = arg1
      handle2 = arg2
      point2 = arg3
    }
    this._segment1 = segment1 ?? new Segment(point1, null, handle1)
    this._segment2 = segment2 ?? new Segment(point2, handle2, null)
  }

  _serialize(options: any, dictionary: any) {
    // If it has no handles, only serialize points, otherwise handles too.
    return serialize(
      this.hasHandles()
        ? [this.point1, this.handle1, this.handle2, this.point2]
        : [this.point1, this.point2],
      options,
      true,
      dictionary
    )
  }

  _changed() {
    // Clear cached values.
    this.#length = this.#bounds = undefined
  }

  /**
   * Returns a copy of the curve.
   */
  clone(): Curve {
    return new Curve(this._segment1, this._segment2)
  }

  /**
   * Returns a string representation of the curve.
   *
   * @return a string representation of the curve
   */
  toString(): string {
    const parts = [`point1: ${this._segment1._point}`]
    if (!this._segment1._handleOut.isZero()) {
      parts.push(`handle1: ${this._segment1._handleOut}`)
    }
    if (!this._segment2._handleIn.isZero()) {
      parts.push(`handle2: ${this._segment2._handleIn}`)
    }
    parts.push(`point2: ${this._segment2._point}`)
    return `{ ${parts.join(', ')} }`
  }

  /**
   * Determines the type of cubic Bézier curve via discriminant
   * classification, as well as the curve-time parameters of the associated
   * points of inflection, loops, cusps, etc.
   *
   * @return the curve classification information as an object, see
   *     options
   * @result info.type {String} the type of Bézier curve, possible values are:
   *     {@values 'line', 'quadratic', 'serpentine', 'cusp', 'loop', 'arch'}
   * @result info.roots {Number[]} the curve-time parameters of the
   *     associated points of inflection for serpentine curves, loops, cusps,
         etc
   */
  classify(): { type: string; roots: number[] } {
    return Bezier.classify(this.getValues())
  }

  /**
   * Removes the curve from the path that it belongs to, by removing its
   * second segment and merging its handle with the first segment.
   * @return {@true if the curve was removed}
   */
  remove(): boolean {
    let removed = false
    if (this._path) {
      const segment2 = this._segment2
      const handleOut = segment2._handleOut
      removed = segment2.remove()
      if (removed) {
        this._segment1._handleOut.set(handleOut)
      }
    }
    return removed
  }

  /**
   * The first anchor point of the curve.
   */
  get point1(): Point {
    return this._segment1._point
  }

  set point1(point: PointLike) {
    this._segment1._point.set(point)
  }

  /**
   * The second anchor point of the curve.
   */
  get point2(): Point {
    return this._segment2._point
  }

  set point2(point: PointLike) {
    this._segment2._point.set(point)
  }

  /**
   * The handle point that describes the tangent in the first anchor point.
   */
  get handle1(): Point {
    return this._segment1._handleOut
  }

  set handle1(point: PointLike) {
    this._segment1._handleOut.set(point)
  }

  /**
   * The handle point that describes the tangent in the second anchor point.
   */
  get handle2(): Point {
    return this._segment2._handleIn
  }

  set handle2(point: PointLike) {
    this._segment2._handleIn.set(point)
  }

  /**
   * The first segment of the curve.
   */
  get segment1(): Segment {
    return this._segment1
  }

  /**
   * The second segment of the curve.
   */
  get segment2(): Segment {
    return this._segment2
  }

  /**
   * The path that the curve belongs to.
   */
  get path(): Path {
    return this._path
  }

  /**
   * The index of the curve in the {@link Path#curves} array.
   */
  get index(): number {
    return this._segment1._index
  }

  /**
   * The next curve in the {@link Path#curves} array that the curve
   * belongs to.
   */
  get next(): Curve {
    const curves = this._path?._curves
    return (
      (
        curves && (
          curves[this._segment1._index + 1] ||
          this._path._closed && curves[0]
        )
      ) ||
      null
    )
  }

  /**
   * The previous curve in the {@link Path#curves} array that the curve
   * belongs to.
   */
  get previous(): Curve {
    const curves = this._path?._curves
    return (
      (
        curves && (
          curves[this._segment1._index - 1] ||
          this._path._closed && curves[curves.length - 1]
        )
      ) ||
      null
    )
  }

  /**
   * Checks if this is the first curve in the {@link Path#curves} array.
   *
   * @return {@true if this is the first curve}
   */
  isFirst(): boolean {
    return !this._segment1._index
  }

  /**
   * Checks if this is the last curve in the {@link Path#curves} array.
   *
   * @return {@true if this is the last curve}
   */
  isLast(): boolean {
    const path = this._path
    return (
      path && this._segment1._index === path._curves.length - 1 ||
      false
    )
  }

  /**
   * Specifies whether the points and handles of the curve are selected.
   */
  get selected(): boolean {
    return (
      this.point1.selected &&
      this.handle1.selected &&
      this.handle2.selected &&
      this.point2.selected
    )
  }

  set selected(selected: boolean) {
    this.point1.selected = selected
    this.handle1.selected = selected
    this.handle2.selected = selected
    this.point2.selected = selected
  }

  /**
   * Returns an array of 8 float values, describing this curve's geometry in
   * four absolute x/y pairs (point1, handle1, handle2, point2). This format
   * is used internally for efficient processing of curve geometries, e.g.
   * when calculating intersections or bounds.
   *
   * Note that the handles are converted to absolute coordinates.
   *
   * @param matrix the matrix to transform the values with, if any
   * @return the curve values
   */
  getValues(matrix?: Matrix): BezierValues {
    return Curve.getValues(this._segment1, this._segment2, matrix)
  }

  /**
   * An array of 4 point objects, describing this curve's geometry in absolute
   * coordinates (point1, handle1, handle2, point2).
   *
   * Note that the handles are converted to absolute coordinates.
   */
  get points(): Point[] {
    // Convert to array of absolute points
    const coords = this.getValues()
    const points = []
    for (let i = 0; i < 8; i += 2) {
      points.push(new Point(coords[i], coords[i + 1]))
    }
    return points
  }

  /**
   * The approximated length of the curve.
   */
  get length(): number {
    this.#length ??= Bezier.getLength(this.getValues(), 0, 1)
    return this.#length
  }

  /**
   * The area that the curve's geometry is covering.
   */
  get area(): number {
    return Bezier.getArea(this.getValues())
  }

  /**
   * @private
   */
  get line(): Line {
    return new Line(this._segment1._point, this._segment2._point)
  }

  /**
   * Creates a new curve as a sub-curve from this curve, its range defined by
   * the given curve-time parameters. If `from` is larger than `to`, then
   * the resulting curve will have its direction reversed.
   *
   * @param from the curve-time parameter at which the sub-curve
   * starts
   * @param to the curve-time parameter at which the sub-curve
   * ends
   * @return the newly created sub-curve
   */
  getPart(from: number, to: number): Curve {
    return new Curve(Bezier.getPart(this.getValues(), from, to))
  }

  // DOCS: Curve#getPartLength(from, to)
  getPartLength(from: number, to: number): number {
    return Bezier.getLength(this.getValues(), from, to)
  }

  // TODO: adjustThroughPoint

  /**
   * Divides the curve into two curves at the given offset or location. The
   * curve itself is modified and becomes the first part, the second part is
   * returned as a new curve. If the curve belongs to a path item, a new
   * segment is inserted into the path at the given location, and the second
   * part becomes a part of the path as well.
   *
   * @param location the offset or location on the
   *     curve at which to divide
   * @return the second part of the divided curve if the location is
   *     valid, `null` otherwise
   * @see #divideAtTime(time)
   */
  divideAt(location: number | CurveLocation): Curve {
    // Accept offsets and CurveLocation objects, as well as objects that act
    // like them.
    return this.divideAtTime(
      location && (location as CurveLocation).curve === this
        ? (location as CurveLocation).time
        : this.getTimeAt(location as number)
    )
  }

  /**
   * Divides the curve into two curves at the given curve-time parameter. The
   * curve itself is modified and becomes the first part, the second part is
   * returned as a new curve. If the modified curve belongs to a path item,
   * the second part is also added to the path.
   *
   * @param time the curve-time parameter on the curve at which to
   *     divide
   * @return the second part of the divided curve, if the offset is
   *     within the valid range, `null` otherwise.
   * @see #divideAt(location)
   */
  divideAtTime(time: number): Curve {
    // Only divide if not at the beginning or end.
    const tMin = CURVETIME_EPSILON
    const tMax = 1 - tMin
    let res = null
    if (time >= tMin && time <= tMax) {
      const [left, right] = Bezier.subdivide(this.getValues(), time)
      const setHandles = this.hasHandles()
      const segment1 = this._segment1
      const segment2 = this._segment2
      const path = this._path
      if (setHandles) {
        // Adjust the handles on the existing segments. The new segment
        // will be inserted between the existing segment1 and segment2:
        // Convert absolute -> relative
        segment1._handleOut._set(left[2] - left[0], left[3] - left[1])
        segment2._handleIn._set(right[4] - right[6], right[5] - right[7])
      }
      // Create the new segment:
      const x = left[6]
      const y = left[7]
      const segment = new Segment(
        new Point(x, y),
        setHandles && new Point(left[4] - x, left[5] - y),
        setHandles && new Point(right[2] - x, right[3] - y)
      )
      // Insert it in the segments list, if needed:
      if (path) {
        // By inserting at segment1.index + 1, we make sure to insert at
        // the end if this curve is a closing curve of a closed path,
        // as with segment2.index it would be inserted at 0.
        path.insert(segment1._index + 1, segment)
        // The newly inserted segment is the start of the next curve:
        res = this.next
      } else {
        // otherwise create it from the result of split
        this._segment2 = segment
        this._changed()
        res = new Curve(segment, segment2)
      }
    }
    return res
  }

  /**
   * Splits the path this curve belongs to at the given offset. After
   * splitting, the path will be open. If the path was open already, splitting
   * will result in two paths.
   *
   * @param location the offset or location on the
   *     curve at which to split
   * @return the newly created path after splitting, if any
   * @see Path#splitAt(location)
   */
  splitAt(location: number | CurveLocation): Path {
    const path = this._path
    return path?.splitAt(location) ?? null
  }

  /**
   * Splits the path this curve belongs to at the given curve-time parameter.
   * After splitting, the path will be open. If the path was open already,
   * splitting will result in two paths.
   *
   * @param time the curve-time parameter on the curve at which to
   *     split
   * @return the newly created path after splitting, if any
   * @see Path#splitAt(location)
   */
  splitAtTime(time: number): Path {
    return this.splitAt(this.getLocationAtTime(time))
  }

  /**
   * Returns a reversed version of the curve, without modifying the curve
   * itself.
   *
   * @return a reversed version of the curve
   */
  reversed(): Curve {
    return new Curve(this._segment2.reversed(), this._segment1.reversed())
  }

  /**
   * Clears the curve's handles by setting their coordinates to zero,
   * turning the curve into a straight line.
   */
  clearHandles() {
    this._segment1._handleOut._set(0, 0)
    this._segment2._handleIn._set(0, 0)
  }

  static getValues(
    segment1: Segment,
    segment2: Segment,
    matrix?: Matrix,
    straight?: boolean
  ): BezierValues {
    const p1 = segment1._point
    const h1 = segment1._handleOut
    const h2 = segment2._handleIn
    const p2 = segment2._point
    const x1 = p1.x
    const y1 = p1.y
    const x2 = p2.x
    const y2 = p2.y
    const values = straight
      ? [x1, y1, x1, y1, x2, y2, x2, y2]
      : [
          x1,
          y1,
          x1 + h1._x,
          y1 + h1._y,
          x2 + h2._x,
          y2 + h2._y,
          x2,
          y2
        ]
    if (matrix) {
      matrix._transformCoordinates(values, values, 4)
    }
    return values
  }

  /**
   * Private helper for Path.getBounds(), which finds the 0-crossings of the
   * derivative of a bezier curve polynomial, to determine potential extremas
   * when finding the bounds of a curve.
   */
  static _addBounds(
    v0: number, v1: number, v2: number, v3: number,
    coord: number,
    padding: number,
    min: number[],
    max: number[],
    roots: number[]
  ) {
    // Code ported and further optimised from:
    // http://blog.hackers-cafe.net/2009/06/how-to-calculate-bezier-curves-bounding.html
    function add(value: number, padding: number) {
      const left = value - padding
      const right = value + padding
      if (left < min[coord]) {
        min[coord] = left
      }
      if (right > max[coord]) {
        max[coord] = right
      }
    }

    const minPad = min[coord] + padding
    const maxPad = max[coord] - padding
    // Perform a rough bounds checking first: The curve can only extend the
    // current bounds if at least one value is outside the min-max range.
    if (
      v0 < minPad ||
      v1 < minPad ||
      v2 < minPad ||
      v3 < minPad ||
      v0 > maxPad ||
      v1 > maxPad ||
      v2 > maxPad ||
      v3 > maxPad
    ) {
      if (v1 < v0 != v1 < v3 && v2 < v0 != v2 < v3) {
        // If the values of a curve are sorted, the extrema are simply
        // the start and end point.
        // Only add strokeWidth to bounds for points which lie within 0
        // < t < 1. The corner cases for cap and join are handled in
        // getStrokeBounds()
        add(v0, 0)
        add(v3, 0)
      } else {
        // Calculate derivative of our bezier polynomial, divided by 3.
        // Doing so allows for simpler calculations of a, b, c and leads
        // to the same quadratic roots.
        const a = 3 * (v1 - v2) - v0 + v3
        const b = 2 * (v0 + v2) - 4 * v1
        const c = v1 - v0
        const count = solveQuadratic(a, b, c, roots)
        // Add some tolerance for good roots, as t = 0, 1 are added
        // separately anyhow, and we don't want joins to be added
        // with radii in getStrokeBounds()
        const tMin = CURVETIME_EPSILON
        const tMax = 1 - tMin
        // See above for an explanation of padding = 0 here:
        add(v3, 0)
        for (let i = 0; i < count; i++) {
          const t = roots[i]
          const u = 1 - t
          // Test for good roots and only add to bounds if good.
          if (tMin <= t && t <= tMax) {
            // Calculate bezier polynomial at t.
            add(
              u * u * u * v0 +
              3 * u * u * t * v1 +
              3 * u * t * t * v2 +
              t * t * t * v3,
              padding
            )
          }
        }
      }
    }
  }

  /**
   * {@grouptitle Bounding Boxes}
   *
   * The bounding rectangle of the curve excluding stroke width.
   */
  get bounds(): Rectangle {
    return this.#getBounds(false)
  }

  /**
   * The bounding rectangle of the curve including stroke width.
   */
  get strokeBounds(): Rectangle {
    return this.#getBounds(true)
  }

  #getBounds(stroke: boolean): Rectangle {
    this.#bounds ??= {}
    const key = stroke ? 'strokeBounds' : 'bounds'
    let bounds = this.#bounds[key]
    if (!bounds) {
      // Calculate the curve bounds by passing a segment list for the
      // curve to the getSegment*Bounds() functions. Without a path,
      // there is no stroke, so the stroke bounds are the bounds.
      const path = this._path
      const getBounds =
        path && stroke ? getSegmentStrokeBounds : getSegmentBounds
      bounds = this.#bounds[key] = getBounds(
        [this._segment1, this._segment2],
        false,
        path
      )
    }
    return bounds.clone()
  }

  /**
   * The bounding rectangle of the curve including handles.
   */
  get handleBounds(): Rectangle {
    // Unlike getSegmentHandleBounds(), only include the curve's own handles,
    // not the outer handles of its two segments.
    const v = this.getValues()
    const x1 = Math.min(v[0], v[2], v[4], v[6])
    const y1 = Math.min(v[1], v[3], v[5], v[7])
    const x2 = Math.max(v[0], v[2], v[4], v[6])
    const y2 = Math.max(v[1], v[3], v[5], v[7])
    return new Rectangle(x1, y1, x2 - x1, y2 - y1)
  }

  /**
   * {@grouptitle Curve Tests}
   *
   * Checks if this curve has any curve handles set. Handles of which both
   * coordinates are 0 within a tolerance of 1e-12 count as not set, see
   * {@link Point#isZero()}.
   *
   * @return {@true if the curve has handles set}
   * @see Curve#handle1
   * @see Curve#handle2
   * @see Segment#hasHandles()
   * @see Path#hasHandles()
   */
  hasHandles(): boolean {
    return (
      !this._segment1._handleOut.isZero() ||
      !this._segment2._handleIn.isZero()
    )
  }

  /**
   * Checks if this curve has any length.
   *
   * @param [epsilon=0] the epsilon against which to compare the
   *     curve's length
   * @return {@true if the curve is longer than the given epsilon}
   */
  hasLength(epsilon?: number): boolean {
    return (
      (!this.point1.equals(this.point2) || this.hasHandles()) &&
      this.length > (epsilon || 0)
    )
  }

  /**
   * Checks if the two curves describe straight lines that are
   * collinear, meaning they run in parallel.
   *
   * @param curve the other curve to check against
   * @return {@true if the two lines are collinear}
   */
  isCollinear(curve: Curve): boolean {
    return (
      curve &&
      this.isStraight() &&
      curve.isStraight() &&
      this.line.isCollinear(curve.line)
    )
  }

  /**
   * Checks if the curve is a straight horizontal line.
   *
   * @return {@true if the line is horizontal}
   */
  isHorizontal(): boolean {
    return (
      this.isStraight() &&
      Math.abs(this.getTangentAtTime(0.5).y) < TRIGONOMETRIC_EPSILON
    )
  }

  /**
   * Checks if the curve is a straight vertical line.
   *
   * @return {@true if the line is vertical}
   */
  isVertical(): boolean {
    return (
      this.isStraight() &&
      Math.abs(this.getTangentAtTime(0.5).x) < TRIGONOMETRIC_EPSILON
    )
  }

  /**
   * {@grouptitle Positions on Curves}
   *
   * Calculates the curve location at the specified offset on the curve, or
   * `null` if the offset exceeds the length of the curve.
   *
   * @param offset the offset on the curve
   * @return the curve location at the specified offset
   */
  getLocationAt(offset: number): CurveLocation {
    return this.getLocationAtTime(this.getTimeAt(offset))
  }

  /**
   * Calculates the curve location at the specified curve-time parameter on
   * the curve, or `null` if the parameter lies outside of `0..1`.
   *
   * @param time the curve-time parameter on the curve
   * @return the curve location at the specified curve-time parameter
   */
  getLocationAtTime(time: number): CurveLocation {
    return time != null && time >= 0 && time <= 1
      ? new CurveLocation(this, time)
      : null
  }

  /**
   * Calculates the curve-time parameter of the specified offset on the path,
   * relative to the provided start parameter. If offset is a negative value,
   * the parameter is searched to the left of the start parameter. If no start
   * parameter is provided, a default of `0` for positive values of `offset`
   * and `1` for negative values of `offset`.
   *
   * @param offset the offset at which to find the curve-time, in
   *     curve length units
   * @param [start] the curve-time in relation to which the offset is
   *     determined
   * @return the curve-time parameter at the specified location, or
   *     `null` if the offset exceeds the length of the curve
   */
  getTimeAt(offset: number, start?: number): number {
    return Bezier.getTimeAt(this.getValues(), offset, start)
  }

  /**
   * Calculates the curve-time parameters where the curve is tangential to
   * provided tangent. Note that tangents at the start or end are included.
   *
   * @param tangent the tangent to which the curve must be tangential
   * @return at most two curve-time parameters, where the curve is
   * tangential to the given tangent
   */
  getTimesWithTangent(tangent: PointLike | number, y?: number): number[] {
    const vector = Point.from(tangent, y)
    return vector.isZero()
      ? []
      : Bezier.getTimesWithTangent(this.getValues(), vector)
  }

  /**
   * Calculates the curve offset at the specified curve-time parameter on
   * the curve.
   *
   * @param time the curve-time parameter on the curve
   * @return the curve offset at the specified curve-time parameter
   */
  getOffsetAtTime(time: number): number {
    return this.getPartLength(0, time)
  }

  /**
   * Returns the curve location of the specified point if it lies on the
   * curve, `null` otherwise.
   *
   * @param point the point on the curve
   * @return the curve location of the specified point
   */
  getLocationOf(point: PointLike | number, y?: number): CurveLocation | null {
    return this.getLocationAtTime(this.getTimeOf(point, y))
  }

  /**
   * Returns the length of the path from its beginning up to the
   * specified point if it lies on the path, `null` otherwise.
   *
   * @param point the point on the path
   * @return the length of the path up to the specified point
   */
  getOffsetOf(point: PointLike | number, y?: number): number | null {
    const location = this.getLocationOf(point, y)
    return location?.offset ?? null
  }

  /**
   * Returns the curve-time parameter of the specified point if it lies on the
   * curve, `null` otherwise.
   * Note that if there is more than one possible solution in a
   * self-intersecting curve, the first found result is returned.
   *
   * @param point the point on the curve
   * @return the curve-time parameter of the specified point
   */
  getTimeOf(point: PointLike | number, y?: number): number | null {
    return Bezier.getTimeOf(this.getValues(), Point.from(point, y))
  }

  /**
   * Returns the nearest location on the curve to the specified point.
   *
   * @param point the point for which we search the nearest location
   * @return the location on the curve that's the closest to
   * the specified point
   */
  getNearestLocation(point: PointLike | number, y?: number): CurveLocation {
    const target = Point.from(point, y)
    const values = this.getValues()
    const t = Bezier.getNearestTime(values, target)
    const pt = Bezier.getPoint(values, t)
    return new CurveLocation(this, t, pt, null, target.getDistance(pt))
  }

  /**
   * Returns the nearest point on the curve to the specified point.
   *
   * @param point the point for which we search the nearest point
   * @return the point on the curve that's the closest to the
   * specified point
   */
  getNearestPoint(point: PointLike | number, y?: number): Point {
    const location = this.getNearestLocation(point, y)
    return location?.point ?? null
  }

  /**
   * Code to detect overlaps of intersecting based on work by
   * iconexperience in #648
   *
   * @private
   */
  static getOverlaps(
    v1: number[],
    v2: number[],
    tolerance?: number
  ): number[][] | null {
    // Linear curves can only overlap if they are collinear. Instead of
    // using the #isCollinear() check, we pick the longer of the two curves
    // treated as lines, and see how far the starting and end points of the
    // other line are from this line (assumed as an infinite line). But even
    // if the curves are not straight, they might just have tiny handles
    // within geometric epsilon distance, so we have to check for that too.

    function getSquaredLineLength(v: number[]) {
      const x = v[6] - v[0]
      const y = v[7] - v[1]
      return x * x + y * y
    }

    const abs = Math.abs
    const getDistance = Line.getDistance
    const timeEpsilon = CURVETIME_EPSILON
    const geometricEpsilon = tolerance || GEOMETRIC_EPSILON
    let straight1 = Bezier.isStraight(v1)
    let straight2 = Bezier.isStraight(v2)
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
      const t2 = Bezier.getTimeOf(
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
      const o1 = Bezier.getPart(v1, pairs[0][0], pairs[1][0])
      const o2 = Bezier.getPart(v2, pairs[0][1], pairs[1][1])
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

  static getIntersections(
    curves1: Curve[],
    curves2: Curve[] | null,
    include?: (location: CurveLocation) => boolean,
    matrix1?: Matrix,
    matrix2?: Matrix,
    _returnFirst?: boolean,
    _tolerance?: number,
    _collisions?: number[][]
  ): CurveLocation[] {
    // Boolean operations pass their own tolerance, the distance under
    // which curves count as overlapping or touching:
    const self = !curves2
    if (self) {
      curves2 = curves1
    }
    const length1 = curves1.length
    const length2 = curves2.length
    const values1 = new Array(length1)
    const values2 = self ? values1 : new Array(length2)
    const locations = []

    for (let i = 0; i < length1; i++) {
      values1[i] = curves1[i].getValues(matrix1)
    }
    if (!self) {
      for (let i = 0; i < length2; i++) {
        values2[i] = curves2[i].getValues(matrix2)
      }
    }
    // Boolean operations may pass the collisions of the curves' bounds,
    // found within at least their tolerance:
    const boundsCollisions = (
      _collisions ||
      findCurveBoundsCollisions(
        values1, values2,
        _tolerance || GEOMETRIC_EPSILON
      )
    )
    for (let index1 = 0; index1 < length1; index1++) {
      const curve1 = curves1[index1]
      const v1 = values1[index1]
      if (self) {
        // First check for self-intersections within the same curve.
        getSelfIntersection(v1, curve1, locations, include)
      }
      // Check for intersections with potentially intersecting curves.
      const collisions1 = boundsCollisions[index1]
      if (collisions1) {
        for (let j = 0; j < collisions1.length; j++) {
          // There might be already one location from the above
          // self-intersection check:
          if (_returnFirst && locations.length) return locations
          const index2 = collisions1[j]
          if (!self || index2 > index1) {
            const curve2 = curves2[index2]
            const v2 = values2[index2]
            getCurveIntersections(
              v1,
              v2,
              curve1,
              curve2,
              locations,
              include,
              _tolerance
            )
          }
        }
      }
    }
    return locations
  }

  /**
   * Returns all intersections between two {@link Curve} objects as an
   * array of {@link CurveLocation} objects.
   *
   * @param curve the other curve to find the intersections with
   *     (if the curve itself or `null` is passed, the self intersection
   *     of the curve is returned, if it exists)
   * @return the locations of all intersections between
   *     the curves
   */
  getIntersections(curve?: Curve): CurveLocation[] {
    const v1 = this.getValues()
    const v2 = curve && curve !== this && curve.getValues()
    return v2
      ? getCurveIntersections(v1, v2, this, curve, [])
      : getSelfIntersection(v1, this, [])
  }

  static {
    for (const [name, test] of Object.entries({
      isStraight: Bezier.hasStraightHandles,
      isLinear: Bezier.hasLinearHandles
    })) {
      // The versions that are called on curve objects pass the coordinates
      // without creating points or arrays, as these are called a lot:
      inject(this.prototype, {
        [name]() {
          const p1 = this._segment1._point
          const h1 = this._segment1._handleOut
          const h2 = this._segment2._handleIn
          const p2 = this._segment2._point
          return test(
            p1._x, p1._y,
            h1._x, h1._y,
            h2._x, h2._y,
            p2._x, p2._y
          )
        }
      })
    }

    // NOTE: (For easier searching): This loop produces:
    // getPointAt, getTangentAt, getNormalAt, getWeightedTangentAt,
    // getWeightedNormalAt, getCurvatureAt, getPointAtTime,
    // getTangentAtTime, getNormalAtTime, getWeightedTangentAtTime,
    // getWeightedNormalAtTime, getCurvatureAtTime
    for (const key of curveEvaluations) {
      const name = `get${capitalize(key)}`
      inject(this.prototype, {
        [`${name}At`](offset: number) {
          const values = this.getValues()
          return Bezier[name](values, Bezier.getTimeAt(values, offset))
        },
        [`${name}AtTime`](time: number) {
          return Bezier[name](this.getValues(), time)
        }
      })
    }
  }
}

// The members defined at runtime rather than in the class body:
export interface Curve {
  /**
   * Checks if this curve appears as a straight line. This can mean that
   * it has no handles defined, or that the handles run collinear with the
   * line that connects the curve's start and end point, not falling
   * outside of the line.
   *
   * @return {@true if the curve is straight}
   */
  isStraight(): boolean

  /**
   * Checks if this curve is parametrically linear, meaning that it is
   * straight and its handles are positioned at 1/3 and 2/3 of the total
   * length of the curve.
   *
   * @return {@true if the curve is parametrically linear}
   */
  isLinear(): boolean

  /**
   * Calculates the point on the curve at the given location.
   *
   * @param location the offset or location on the
   *     curve
   * @return the point on the curve at the given location
   */
  getPointAt(location: number): Point

  /**
   * Calculates the normalized tangent vector of the curve at the given
   * location.
   *
   * @param location the offset or location on the
   *     curve
   * @return the normalized tangent of the curve at the given location
   */
  getTangentAt(location: number): Point

  /**
   * Calculates the normal vector of the curve at the given location.
   *
   * @param location the offset or location on the
   *     curve
   * @return the normal of the curve at the given location
   */
  getNormalAt(location: number): Point

  /**
   * Calculates the weighted tangent vector of the curve at the given
   * location, its length reflecting the curve velocity at that location.
   *
   * @param location the offset or location on the
   *     curve
   * @return the weighted tangent of the curve at the given location
   */
  getWeightedTangentAt(location: number): Point

  /**
   * Calculates the weighted normal vector of the curve at the given location,
   * its length reflecting the curve velocity at that location.
   *
   * @param location the offset or location on the
   *     curve
   * @return the weighted normal of the curve at the given location
   */
  getWeightedNormalAt(location: number): Point

  /**
   * Calculates the curvature of the curve at the given location. Curvatures
   * indicate how sharply a curve changes direction. A straight line has zero
   * curvature, where as a circle has a constant curvature. The curve's radius
   * at the given location is the reciprocal value of its curvature.
   *
   * @param location the offset or location on the
   *     curve
   * @return the curvature of the curve at the given location
   */
  getCurvatureAt(location: number): number

  /**
   * Calculates the point on the curve at the given curve-time parameter.
   *
   * @param time the curve-time parameter on the curve
   * @return the point on the curve at the given curve-time parameter
   */
  getPointAtTime(time: number): Point

  /**
   * Calculates the normalized tangent vector of the curve at the given
   * curve-time parameter.
   *
   * @param time the curve-time parameter on the curve
   * @return the normalized tangent of the curve at the given curve-time
   *     parameter
   */
  getTangentAtTime(time: number): Point

  /**
   * Calculates the normal vector of the curve at the given curve-time
   * parameter.
   *
   * @param time the curve-time parameter on the curve
   * @return the normal of the curve at the given curve-time parameter
   */
  getNormalAtTime(time: number): Point

  /**
   * Calculates the weighted tangent vector of the curve at the given
   * curve-time parameter, its length reflecting the curve velocity there.
   *
   * @param time the curve-time parameter on the curve
   * @return the weighted tangent of the curve at the given curve-time
   *     parameter
   */
  getWeightedTangentAtTime(time: number): Point

  /**
   * Calculates the weighted normal vector of the curve at the given
   * curve-time parameter, its length reflecting the curve velocity there.
   *
   * @param time the curve-time parameter on the curve
   * @return the weighted normal of the curve at the given curve-time
   *     parameter
   */
  getWeightedNormalAtTime(time: number): Point

  /**
   * Calculates the curvature of the curve at the given curve-time
   * parameter. Curvatures indicate how sharply a curve changes direction. A
   * straight line has zero curvature, where as a circle has a constant
   * curvature. The curve's radius at the given curve-time parameter is the
   * reciprocal value of its curvature.
   *
   * @param time the curve-time parameter on the curve
   * @return the curvature of the curve at the given curve-time parameter
   */
  getCurvatureAtTime(time: number): number
}

// Bezier intersection using fat-line clipping:

type Include = (location: CurveLocation) => boolean

function addLocation(
  locations: CurveLocation[],
  include: Include,
  c1: Curve,
  t1: number,
  c2: Curve,
  t2: number,
  overlap?: boolean
) {
  // Determine if locations at the beginning / end of the curves should be
  // excluded, in case the two curves are neighbors, but do not exclude
  // connecting points between two curves if they were part of overlap
  // checks, as they could be self-overlapping.
  // NOTE: We don't pass p1 and p2, because v1 and v2 may be transformed
  // by their path.matrix, while c1 and c2 are untransformed. Passing null
  // for point in CurveLocation() will do the right thing.
  const excludeStart = !overlap && c1.previous === c2
  const excludeEnd = !overlap && c1 !== c2 && c1.next === c2
  const tMin = CURVETIME_EPSILON
  const tMax = 1 - tMin
  // Check t1 and t2 against correct bounds, based on excludeStart/End:
  // - excludeStart means the start of c1 connects to the end of c2
  // - excludeEnd means the end of c1 connects to the start of c2
  // - If either c1 or c2 are at the end of the path, exclude their end,
  //   which connects back to the beginning, but only if it's not part of
  //   a found overlap. The normal intersection will already be found at
  //   the beginning, and would be added twice otherwise.
  if (
    t1 !== null &&
    t1 >= (excludeStart ? tMin : 0) &&
    t1 <= (excludeEnd ? tMax : 1)
  ) {
    if (
      t2 !== null &&
      t2 >= (excludeEnd ? tMin : 0) &&
      t2 <= (excludeStart ? tMax : 1)
    ) {
      const location1 = new CurveLocation(c1, t1, null, overlap)
      const location2 = new CurveLocation(c2, t2, null, overlap)
      // Link the two locations to each other.
      location1._intersection = location2
      location2._intersection = location1
      if (!include || include(location1)) {
        CurveLocation.insert(locations, location1, true)
      }
    }
  }
}

function addCurveIntersections(
  v1: number[],
  v2: number[],
  c1: Curve,
  c2: Curve,
  locations: CurveLocation[],
  include: Include,
  flip: boolean,
  recursion: number,
  calls: number,
  tMin: number,
  tMax: number,
  uMin: number,
  uMax: number,
  tolerance: number
): number {
  // Avoid deeper recursion, by counting the total amount of recursions,
  // as well as the total amount of calls, to avoid massive call-trees as
  // suggested by @iconexperience in #904#issuecomment-225283430.
  // See also: #565 #899 #1074
  if (++calls >= 4096 || ++recursion >= 40) return calls
  // Use an epsilon smaller than CURVETIME_EPSILON to compare curve-time
  // parameters in fat-line clipping code.
  const fatLineEpsilon = 1e-9
  // Let P be the first curve and Q be the second
  const q0x = v2[0]
  const q0y = v2[1]
  const q3x = v2[6]
  const q3y = v2[7]
  const getSignedDistance = Line.getSignedDistance
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
    (tMinClip = clipConvexHull(top, bottom, dMin, dMax)) == null || (
      (tMaxClip = clipConvexHull(
        top.reverse(),
        bottom.reverse(),
        dMin,
        dMax
      )) ==
      null
    )
  )
    return calls
  // tMin and tMax are within the range (0, 1). Project it back to the
  // original parameter range for v2.
  let tMinNew = tMin + (tMax - tMin) * tMinClip
  let tMaxNew = tMin + (tMax - tMin) * tMaxClip
  if (Math.max(uMax - uMin, tMaxNew - tMinNew) < fatLineEpsilon) {
    // We have isolated the intersection with sufficient precision
    const t = (tMinNew + tMaxNew) / 2
    const u = (uMin + uMax) / 2
    addLocation(
      locations,
      include,
      flip ? c2 : c1,
      flip ? u : t,
      flip ? c1 : c2,
      flip ? t : u
    )
  } else {
    // Apply the result of the clipping to curve 1:
    v1 = Bezier.getPart(v1, tMinClip, tMaxClip)
    const uDiff = uMax - uMin
    if (tMaxClip - tMinClip > 0.8) {
      // With a tolerance, crossings within it of the shared end of
      // neighbouring curves merge into it: cut off the parts of both
      // pieces within it by arc length, and clip the rest again.
      // Otherwise, find the intersections of the pieces where
      // clipping stalls through the implicit form of v2, unless they
      // both lie on the same implicit curve, as parts of one curve:
      const isNext = (
        tolerance &&
        tMaxNew === 1 &&
        uMin === 0 &&
        c1.next === c2
      )
      const isPrevious = (
        tolerance &&
        !isNext &&
        tMinNew === 0 &&
        uMax === 1 &&
        c1.previous === c2
      )
      if (isNext || isPrevious) {
        const offset = isNext ? tolerance : -tolerance
        const s1 = Bezier.getTimeAt(v1, -offset)
        const s2 = Bezier.getTimeAt(v2, offset)
        // Pieces shorter than the tolerance have nothing left:
        if (s1 !== null && s2 !== null) {
          const t = tMinNew + (tMaxNew - tMinNew) * s1
          const u = uMin + (uMax - uMin) * s2
          if (isNext) {
            v1 = Bezier.getPart(v1, 0, s1)
            v2 = Bezier.getPart(v2, s2, 1)
            tMaxNew = t
            uMin = u
          } else {
            v1 = Bezier.getPart(v1, s1, 1)
            v2 = Bezier.getPart(v2, 0, s2)
            tMinNew = t
            uMax = u
          }
          calls = addCurveIntersections(
            v1, v2, c1, c2, locations, include, flip,
            recursion, calls, tMinNew, tMaxNew, uMin, uMax,
            tolerance
          )
        }
      } else if (!(
        tolerance &&
        addImplicitIntersections(
          v1, v2, c1, c2, locations, include, flip,
          tMinNew, tMaxNew, uMin, uMax, tolerance
        )
      )) {
        // Subdivide the curve which has converged the least.
        if (tMaxNew - tMinNew > uDiff) {
          const parts = Bezier.subdivide(v1, 0.5)
          const t = (tMinNew + tMaxNew) / 2
          calls = addCurveIntersections(
            v2, parts[0], c2, c1, locations, include, !flip,
            recursion, calls, uMin, uMax, tMinNew, t,
            tolerance
          )
          calls = addCurveIntersections(
            v2, parts[1], c2, c1, locations, include, !flip,
            recursion, calls, uMin, uMax, t, tMaxNew,
            tolerance
          )
        } else {
          const parts = Bezier.subdivide(v2, 0.5)
          const u = (uMin + uMax) / 2
          calls = addCurveIntersections(
            parts[0], v1, c2, c1, locations, include, !flip,
            recursion, calls, uMin, u, tMinNew, tMaxNew,
            tolerance
          )
          calls = addCurveIntersections(
            parts[1], v1, c2, c1, locations, include, !flip,
            recursion, calls, u, uMax, tMinNew, tMaxNew,
            tolerance
          )
        }
      }
    } else {
      // Iterate
      // For some unclear reason we need to check against uDiff === 0
      // here, to prevent a regression from happening, see #1638.
      // Maybe @iconexperience could shed some light on this.
      if (uDiff === 0 || uDiff >= fatLineEpsilon) {
        calls = addCurveIntersections(
          v2, v1, c2, c1, locations, include, !flip,
          recursion, calls, uMin, uMax, tMinNew, tMaxNew,
          tolerance
        )
      } else {
        // The interval on the other curve is already tight enough,
        // therefore we keep iterating on the same curve.
        calls = addCurveIntersections(
          v1, v2, c1, c2, locations, include, flip,
          recursion, calls, tMinNew, tMaxNew, uMin, uMax,
          tolerance
        )
      }
    }
  }
  return calls
}

/**
 * Adds the intersections of the piece v1 with the piece v2 as the roots of
 * the implicit form of v2, f(x, y) = 0, along v1: f(v1(t)) is a polynomial
 * in Bernstein form, of degree 9, or 6 if v2 is a quadratic curve. Its
 * roots are isolated by subdivision, and where the curves are within the
 * tolerance of each other along a part of v1 shorter than it, the part
 * counts as one intersection. The implicit curve extends beyond v2, so
 * only roots on v2 itself are kept. Returns false if f(v1(t)) vanishes,
 * as both lie on the same implicit curve, or if its errors leave more
 * roots than its degree allows. See: Sederberg T. - "Computer
 * Aided Geometric Design", chapter 17 on implicitization.
 */
function addImplicitIntersections(
  v1: number[],
  v2: number[],
  c1: Curve,
  c2: Curve,
  locations: CurveLocation[],
  include: Include,
  flip: boolean,
  tMin: number,
  tMax: number,
  uMin: number,
  uMax: number,
  tolerance: number
): boolean {
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
      let u = Bezier.getTimeOf(v2, Bezier.getPoint(v1, t), tolerance)
      if (u !== null) {
        t = tMin + (tMax - tMin) * t
        u = uMin + (uMax - uMin) * u
        addLocation(
          locations,
          include,
          flip ? c2 : c1,
          flip ? u : t,
          flip ? c1 : c2,
          flip ? t : u
        )
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
  v: number[],
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
function getProductError(
  a: number,
  ea: number,
  b: number,
  eb: number
): number {
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

/**
 * Calculate the convex hull for the non-parametric bezier curve D(ti, di(t))
 * The ti is equally spaced across [0..1] — [0, 1/3, 2/3, 1] for
 * di(t), [dq0, dq1, dq2, dq3] respectively. In other words our CVs for the
 * curve are already sorted in the X axis in the increasing order.
 * Calculating convex-hull is much easier than a set of arbitrary points.
 *
 * The convex-hull is returned as two parts [TOP, BOTTOM]:
 * (both are in a coordinate space where y increases upwards with origin at
 * bottom-left)
 * TOP: The part that lies above the 'median' (line connecting end points of
 * the curve)
 * BOTTOM: The part that lies below the median.
 */
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

/**
 * Clips the convex-hull and returns [tMin, tMax] for the curve contained.
 */
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

/**
 * Intersections between curve and line becomes rather simple here mostly
 * because of Numerical class. We can rotate the curve and line so that the
 * line is on the X axis, and solve the implicit equations for the X axis
 * and the curve.
 */
function getCurveLineIntersections(
  v: number[],
  px: number,
  py: number,
  vx: number,
  vy: number
): number[] {
  if (isZero(vx) && isZero(vy)) {
    // Handle special case of a line with no direction as a point,
    // and check if it is on the curve.
    const t = Bezier.getTimeOf(v, new Point(px, py))
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
  Bezier.solve(rv, 1, 0, roots, 0, 1)
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
  v1: number[],
  v2: number[],
  c1: Curve,
  c2: Curve,
  locations: CurveLocation[],
  include: Include,
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
    const p1 = Bezier.getPoint(v1, t1)
    const t2 = Bezier.getTimeOf(v2, p1, tolerance)
    if (t2 !== null) {
      // Only use the time values if there was no recursion, and let
      // addLocation() figure out the actual time values otherwise.
      addLocation(
        locations,
        include,
        flip ? c2 : c1,
        flip ? t2 : t1,
        flip ? c1 : c2,
        flip ? t1 : t2
      )
    }
  }
}

function addLineIntersection(
  v1: number[],
  v2: number[],
  c1: Curve,
  c2: Curve,
  locations: CurveLocation[],
  include: Include,
  tolerance: number
) {
  const point = Line.intersect(
    v1[0], v1[1], v1[6], v1[7],
    v2[0], v2[1], v2[6], v2[7]
  )
  if (point) {
    addLocation(
      locations,
      include,
      c1,
      Bezier.getTimeOf(v1, point, tolerance),
      c2,
      Bezier.getTimeOf(v2, point, tolerance)
    )
  }
}

function getCurveIntersections(
  v1: number[],
  v2: number[],
  c1: Curve,
  c2: Curve,
  locations: CurveLocation[],
  include?: Include,
  tolerance?: number
): CurveLocation[] {
  const min = Math.min
  const max = Math.max
  const abs = Math.abs
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
  // curves that getOverlaps() may still find to overlap:
  const boundsEpsilon = max(epsilon, tolerance || GEOMETRIC_EPSILON)
  if (
    maxX1 + boundsEpsilon > minX2 &&
    minX1 - boundsEpsilon < maxX2 &&
    maxY1 + boundsEpsilon > minY2 &&
    minY1 - boundsEpsilon < maxY2
  ) {
    // Now detect and handle overlaps:
    const overlaps = Curve.getOverlaps(v1, v2, tolerance)
    if (overlaps) {
      for (let i = 0; i < 2; i++) {
        const overlap = overlaps[i]
        addLocation(
          locations,
          include,
          c1,
          overlap[0],
          c2,
          overlap[1],
          true
        )
      }
    } else {
      const straight1 = Bezier.isStraight(v1)
      const straight2 = Bezier.isStraight(v2)
      const straight = straight1 && straight2
      const before = locations.length
      // Intersections with lines snap to their ends within the
      // geometric epsilon, but not further than a smaller
      // tolerance, as the points of one may lie no further apart:
      const lineTolerance = tolerance < GEOMETRIC_EPSILON ? tolerance : null
      // Determine the correct intersection method based on whether
      // one or curves are straight lines:
      if (straight) {
        addLineIntersection(
          v1,
          v2,
          c1,
          c2,
          locations,
          include,
          lineTolerance
        )
      } else if (straight1 || straight2) {
        addCurveLineIntersections(
          straight1 ? v2 : v1,
          straight1 ? v1 : v2,
          straight1 ? c2 : c1,
          straight1 ? c1 : c2,
          locations,
          include,
          straight1,
          lineTolerance
        )
      } else {
        // recursion, calls, tMin, tMax, uMin, uMax:
        addCurveIntersections(
          v1,
          v2,
          c1,
          c2,
          locations,
          include,
          false,
          0,
          0,
          0,
          1,
          0,
          1,
          tolerance
        )
      }
      // Handle the special case where the start- / end-points of one
      // curve lie on the other curve, within the tolerance if one is
      // passed, but only if haven't found a line-line intersection
      // already: #805#issuecomment-148503018
      if (!straight || locations.length === before) {
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
            const u = Bezier.getTimeOf(
              isSecond ? v1 : v2,
              new Point(x, y),
              endEpsilon
            )
            if (u !== null) {
              addLocation(
                locations,
                include,
                c1,
                isSecond ? u : t,
                c2,
                isSecond ? t : u
              )
            }
          }
        }
      }
    }
  }
  return locations
}

function getSelfIntersection(
  v1: number[],
  c1: Curve,
  locations: CurveLocation[],
  include?: Include
): CurveLocation[] {
  const info = Bezier.classify(v1)
  if (info.type === 'loop') {
    const { roots } = info
    addLocation(locations, include, c1, roots[0], c1, roots[1])
  }
  return locations
}
