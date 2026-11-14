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
  Path,
  Point,
  Rectangle,
  Segment,
  TRIGONOMETRIC_EPSILON,
  capitalize,
  curveEvaluations,
  findCurveBoundsCollisions,
  getSegmentBounds,
  getSegmentStrokeBounds,
  inject,
  serialize,
  solveQuadratic
} from '../internal.ts'
import type { PointLike } from '../basic/Point.ts'
import type { Matrix } from '../basic/Matrix.ts'
import type { BezierValues } from '../curve/bezier.ts'
import type { Report } from '../curve/intersections.ts'

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

  static getIntersections(
    curves1: Curve[],
    curves2: Curve[] | null,
    include?: (location: CurveLocation) => boolean,
    matrix1?: Matrix,
    matrix2?: Matrix,
    _returnFirst?: boolean
  ): CurveLocation[] {
    const self = !curves2
    if (self) {
      curves2 = curves1
    }
    const length1 = curves1.length
    const length2 = curves2.length
    const values1 = new Array(length1)
    const values2 = self ? values1 : new Array(length2)
    const locations: CurveLocation[] = []
    const report = createReport(locations, include)

    for (let i = 0; i < length1; i++) {
      values1[i] = curves1[i].getValues(matrix1)
    }
    if (!self) {
      for (let i = 0; i < length2; i++) {
        values2[i] = curves2[i].getValues(matrix2)
      }
    }
    const boundsCollisions = findCurveBoundsCollisions(
      values1, values2, GEOMETRIC_EPSILON
    )
    for (let index1 = 0; index1 < length1; index1++) {
      const curve1 = curves1[index1]
      const v1 = values1[index1]
      if (self) {
        // First check for self-intersections within the same curve.
        Bezier.getSelfIntersection(v1, curve1, report)
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
            Bezier.getIntersections(v1, v2, curve1, curve2, report)
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
    const locations: CurveLocation[] = []
    const report = createReport(locations)
    if (v2) {
      Bezier.getIntersections(v1, v2, this, curve, report)
    } else {
      Bezier.getSelfIntersection(v1, this, report)
    }
    return locations
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

// Returns the function that takes the intersections of curves as they are
// found, see Bezier.getIntersections(), and adds them to the locations: as two
// locations that are linked to each other, merged with the one that is there
// already at the same place. The filter leaves out the ones it rejects.
function createReport(
  locations: CurveLocation[],
  include?: (location: CurveLocation) => boolean
): Report {
  return (c1, t1, c2, t2, overlap) => {
    // NOTE: We don't pass points, because the values may be transformed by
    // the matrices of their paths, while the curves are not. CurveLocation
    // gets the points from the curves then.
    const location1 = new CurveLocation(c1 as Curve, t1, null, overlap)
    const location2 = new CurveLocation(c2 as Curve, t2, null, overlap)
    location1._intersection = location2
    location2._intersection = location1
    // Inserting returns the location that it merged it with, if any:
    return (
      (!include || include(location1)) &&
      CurveLocation.insert(locations, location1, true) === location1
    )
  }
}
