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

import {
  Base,
  Change,
  CurveLocation,
  Point,
  SegmentPoint,
  SegmentSelection,
  addNamed,
  equals,
  removeNamed,
  serialize
} from '../internal.ts'
import type { PointLike } from '../basic/Point.ts'
import type { Matrix } from '../basic/Matrix.ts'
import type { Curve } from './Curve.ts'
import type { Path } from './Path.ts'

/**
 * The properties that a segment can be created from, as an object.
 */
export type SegmentProps = {
  point?: PointLike
  handleIn?: PointLike
  handleOut?: PointLike
  selection?: number
  name?: string
  data?: object
}

/**
 * What a segment can be passed as, where a function takes one.
 */
export type SegmentLike =
  | Segment
  | PointLike
  | SegmentProps
  // A point with its handles, as JSON stores segments:
  | [PointLike, PointLike?, PointLike?]
  // The coordinates of a point and its handles, flat:
  | number[]

/**
 * The Segment object represents the points of a path through which its
 * {@link Curve} objects pass. The segments of a path can be accessed through
 * its {@link Path#segments} array.
 *
 * Each segment consists of an anchor point ({@link Segment#point}) and
 * optionally an incoming and an outgoing handle ({@link Segment#handleIn} and
 * {@link Segment#handleOut}), describing the tangents of the two {@link Curve}
 * objects that are connected by this segment.
 */
export class Segment extends Base {
  // Read and written by SegmentPoint, Curve, Path and others:
  _point: SegmentPoint
  _handleIn: SegmentPoint
  _handleOut: SegmentPoint
  // Set by Path when the segment is added to it:
  _path: Path
  _index: number
  // The selection state, a combination of SegmentSelection, and the name and
  // data, which Path and the SVG export read, are only stored when set, so
  // other segments don't pay. The defaults are on the prototype:
  declare _selection: number
  declare _name: string
  declare _data: object

  /**
   * Creates a new Segment object.
   *
   * @param point the anchor point of the segment, `{ x: 0, y: 0 }` by default
   * @param handleIn the handle point relative to the anchor point of the
   *     segment that describes the in tangent of the segment
   * @param handleOut the handle point relative to the anchor point of the
   *     segment that describes the out tangent of the segment
   *
   * @example {@paperscript}
   * var handleIn = new Point(-80, -100);
   * var handleOut = new Point(80, 100);
   *
   * var firstPoint = new Point(100, 50);
   * var firstSegment = new Segment(firstPoint, null, handleOut);
   *
   * var secondPoint = new Point(300, 50);
   * var secondSegment = new Segment(secondPoint, handleIn, null);
   *
   * var path = new Path(firstSegment, secondSegment);
   * path.strokeColor = 'black';
   */
  constructor(point?: PointLike, handleIn?: PointLike, handleOut?: PointLike)
  /**
   * Creates a new Segment object.
   *
   * @param object an object containing properties to be set on the
   *     segment
   *
   * @example {@paperscript}
   * // Creating segments using object notation:
   * var firstSegment = new Segment({
   *     point: [100, 50],
   *     handleOut: [80, 100]
   * });
   *
   * var secondSegment = new Segment({
   *     point: [300, 50],
   *     handleIn: [-80, -100]
   * });
   *
   * var path = new Path({
   *     segments: [firstSegment, secondSegment],
   *     strokeColor: 'black'
   * });
   */
  constructor(object: SegmentProps | Segment)
  constructor(
    arg0?: PointLike | SegmentProps | Segment,
    arg1?: PointLike,
    arg2?: PointLike,
    // The selection of the array form in JSON, see #_serialize():
    arg3?: number
  ) {
    super()
    // NOTE: This copies from segments through accessors.
    const props: SegmentProps =
      arg0 && typeof arg0 === 'object' && 'point' in arg0
        ? arg0
        : {
            point: arg0 as PointLike,
            handleIn: arg1,
            handleOut: arg2,
            selection: arg3
          }
    const { point, handleIn, handleOut, selection, name } = props
    // Copy the data of segments without creating it, as #clone() does:
    const data =
      props instanceof Segment
        ? props._data && { ...props._data }
        : props.data
    // SegmentPoint() creates points with (0, 0) for missing arguments:
    new SegmentPoint(point, this, '_point')
    new SegmentPoint(handleIn, this, '_handleIn')
    new SegmentPoint(handleOut, this, '_handleOut')
    if (selection) {
      this.selection = selection
    }
    if (name) {
      this.name = name
    }
    if (data) {
      this._data = data
    }
  }

  _serialize(options: any, dictionary: any) {
    const point = this._point
    const selection = this._selection
    const name = this._name
    const data = this._data
    const hasData = data && !equals(data, {})
    if (name || hasData) {
      // Use the object notation, which can also hold name and data:
      const props = serialize(
        {
          point,
          handleIn: this._handleIn,
          handleOut: this._handleOut,
          selection
        },
        options,
        true,
        dictionary
      )
      if (name) {
        props.name = name
      }
      // Do not use compact mode for data, as in Item#_serialize():
      if (hasData) {
        props.data = serialize(data, options, false, dictionary)
      }
      // Pass the object as the only argument to the constructor:
      return [props]
    } else {
      // If it is has no handles, only serialize point, otherwise handles
      // too.
      const obj: any =
        selection || this.hasHandles()
          ? [point, this._handleIn, this._handleOut]
          : point
      if (selection) {
        obj.push(selection)
      }
      return serialize(obj, options, true, dictionary)
    }
  }

  _changed(point?: SegmentPoint) {
    const path = this._path
    if (path) {
      // Delegate changes to affected curves if they exist.
      const curves = path._curves
      const index = this._index
      let curve: Curve
      if (curves) {
        // Updated the neighboring affected curves, depending on which point
        // is changing.
        // TODO: Consider exposing these curves too, through #curveIn,
        // and #curveOut, next to #curve?
        if (
          (!point || point === this._point || point === this._handleIn) &&
          (curve =
            index > 0
              ? curves[index - 1]
              : path._closed
                ? curves[curves.length - 1]
                : null)
        ) {
          curve._changed()
        }
        // No wrap around needed for outgoing curve, as only closed paths
        // will have one for the last segment.
        if (
          (!point || point === this._point || point === this._handleOut) &&
          (curve = curves[index])
        ) {
          curve._changed()
        }
      }
      path._changed(Change.SEGMENTS)
    }
  }

  /**
   * The name of the segment. If the segment has a name, it can be accessed
   * by name through its path's segments list. If several segments share a
   * name, the first one is found.
   *
   * The name is stored in JSON, and in SVG in the `data-paper-segments`
   * attribute of the path, see {@link Segment#data}.
   *
   * @example
   * var path = new Path([10, 10], [50, 10], [50, 50]);
   * path.segments[1].name = 'corner';
   * console.log(path.segments['corner'].point); // { x: 50, y: 10 }
   */
  get name(): string | null {
    return this._name
  }

  set name(name: string | null) {
    // Keep the name lookup on the path's segments list in sync, as
    // Item#name does on the children list. Paths only create it once a
    // segment has a name:
    const path = this._path
    const named = path?._namedSegments
    if (this._name && named) {
      removeNamed(path._segments, named, this._name, this)
    }
    if (name === +name + '') {
      throw new Error('Names consisting only of numbers are not supported.')
    }
    if (name && path) {
      addNamed(
        path._segments,
        named || (path._namedSegments = {}),
        name,
        this
      )
    }
    this._name = name || undefined
  }

  /**
   * A plain javascript object which can be used to store arbitrary data on
   * the segment.
   *
   * The data is stored in JSON, and in SVG in the `data-paper-segments`
   * attribute of the path, keyed by the index of the segment. Paper.js drops
   * it on import if the indices don't fit the path anymore, as happens when
   * another editor removes segments.
   *
   * @example
   * var segment = new Segment([100, 100]);
   * segment.data.isCorner = true;
   *
   * @example
   * var segment = new Segment({
   *     point: [100, 50],
   *     handleOut: [80, 100],
   *     data: {
   *         isCorner: true
   *     }
   * });
   * console.log(segment.data.isCorner); // true
   */
  get data(): any {
    return (this._data ??= {})
  }

  set data(data: object) {
    this._data = data
  }

  /**
   * The anchor point of the segment.
   */
  get point(): Point {
    return this._point
  }

  set point(point: PointLike) {
    this._point.set(point)
  }

  /**
   * The handle point relative to the anchor point of the segment that
   * describes the in tangent of the segment.
   */
  get handleIn(): Point {
    return this._handleIn
  }

  set handleIn(point: PointLike) {
    this._handleIn.set(point)
  }

  /**
   * The handle point relative to the anchor point of the segment that
   * describes the out tangent of the segment.
   */
  get handleOut(): Point {
    return this._handleOut
  }

  set handleOut(point: PointLike) {
    this._handleOut.set(point)
  }

  /**
   * Checks if the segment has any curve handles set. Handles of which both
   * coordinates are 0 within a tolerance of 1e-12 count as not set, see
   * {@link Point#isZero()}.
   *
   * @return {@true if the segment has handles set}
   * @see Segment#handleIn
   * @see Segment#handleOut
   * @see Curve#hasHandles()
   * @see Path#hasHandles()
   */
  hasHandles(): boolean {
    return !this._handleIn.isZero() || !this._handleOut.isZero()
  }

  /**
   * Checks if the segment connects two curves smoothly, meaning that its two
   * handles are collinear and segment does not form a corner.
   *
   * @return {@true if the segment is smooth}
   * @see Point#isCollinear()
   */
  isSmooth(): boolean {
    const handleIn = this._handleIn
    const handleOut = this._handleOut
    return (
      !handleIn.isZero() &&
      !handleOut.isZero() &&
      handleIn.isCollinear(handleOut)
    )
  }

  /**
   * Clears the segment's handles by setting their coordinates to zero,
   * turning the segment into a corner.
   */
  clearHandles() {
    this._handleIn._set(0, 0)
    this._handleOut._set(0, 0)
  }

  get selection(): number {
    return this._selection
  }

  set selection(selection: number) {
    const oldSelection = this._selection
    const path = this._path
    // Set the selection state even if path is not defined yet, to allow
    // selected segments to be inserted into paths and make JSON
    // deserialization work.
    const newSelection = selection || 0
    this._selection = newSelection
    // If the selection state of the segment has changed, we need to let
    // it's path know and possibly add or remove it from
    // project._selectionItems
    if (path && newSelection !== oldSelection) {
      path._updateSelection(this, oldSelection, newSelection)
      // Let the project know, so the view draws the selection again, see
      // Item#selection:
      const project = path._project
      if (project) {
        project._changed(Change.ATTRIBUTE, path._getChangeOwner())
      }
    }
  }

  _changeSelection(flag: number, selected: boolean) {
    const selection = this._selection
    this.selection = selected ? selection | flag : selection & ~flag
  }

  /**
   * Specifies whether the segment is selected.
   *
   * @example {@paperscript}
   * var path = new Path.Circle({
   *     center: [80, 50],
   *     radius: 40
   * });
   *
   * // Select the third segment point:
   * path.segments[2].selected = true;
   */
  get selected(): boolean {
    return !!(this._selection & SegmentSelection.ALL)
  }

  set selected(selected: boolean) {
    this._changeSelection(SegmentSelection.ALL, selected)
  }

  /**
   * {@grouptitle Hierarchy}
   *
   * The index of the segment in the {@link Path#segments} array that the
   * segment belongs to.
   */
  get index(): number | null {
    return this._index ?? null
  }

  /**
   * The path that the segment belongs to.
   */
  get path(): Path | null {
    return this._path ?? null
  }

  /**
   * The curve that the segment belongs to. For the last segment of an open
   * path, the previous segment is returned.
   */
  get curve(): Curve | null {
    const path = this._path
    let index = this._index
    if (path) {
      // The last segment of an open path belongs to the last curve.
      if (index > 0 && !path._closed && index === path._segments.length - 1) {
        index--
      }
      return path.curves[index] ?? null
    }
    return null
  }

  /**
   * The curve location that describes this segment's position on the path.
   */
  get location(): CurveLocation | null {
    const { curve } = this
    return curve
      ? // Determine whether the parameter for this segment is 0 or 1.
        new CurveLocation(curve, this === curve._segment1 ? 0 : 1)
      : null
  }

  /**
   * {@grouptitle Sibling Segments}
   *
   * The next segment in the {@link Path#segments} array that the segment
   * belongs to. If the segments belongs to a closed path, the first segment
   * is returned for the last segment of the path.
   */
  get next(): Segment | null {
    const segments = this._path?._segments
    return (
      (
        segments &&
        (segments[this._index + 1] || this._path._closed && segments[0])
      ) ||
      null
    )
  }

  /**
   * Smooths the bezier curves that pass through this segment by taking into
   * account the segment's position and distance to the neighboring segments
   * and changing the direction and length of the segment's handles
   * accordingly without moving the segment itself.
   *
   * Two different smoothing methods are available:
   *
   * - `'catmull-rom'` uses the Catmull-Rom spline to smooth the segment.
   *
   *     The optionally passed factor controls the knot parametrization of the
   *     algorithm:
   *
   *     - `0.0`: the standard, uniform Catmull-Rom spline
   *     - `0.5`: the centripetal Catmull-Rom spline, guaranteeing no
   *         self-intersections
   *     - `1.0`: the chordal Catmull-Rom spline
   *
   * - `'geometric'` use a simple heuristic and empiric geometric method to
   *     smooth the segment's handles. The handles were weighted, meaning that
   *     big differences in distances between the segments will lead to
   *     probably undesired results.
   *
   *     The optionally passed factor defines the tension parameter (`0...1`),
   *     controlling the amount of smoothing as a factor by which to scale
   *     each handle.
   *
   * @option [options.type='catmull-rom'] {String} the type of smoothing
   *     method: {@values 'catmull-rom', 'geometric'}
   * @option options.factor {Number} the factor parameterizing the smoothing
   *     method — default: `0.5` for `'catmull-rom'`, `0.4` for `'geometric'`
   *
   * @param options the smoothing options
   *
   * @see PathItem#smooth([options])
   */
  smooth(
    options?: { type?: 'catmull-rom' | 'geometric'; factor?: number },
    _first?: boolean,
    _last?: boolean
  ) {
    const { type, factor } = options ?? {}
    const { previous, next } = this
    // Some precalculations valid for both 'catmull-rom' and 'geometric'
    const p0 = (previous ?? this)._point
    const p1 = this._point
    const p2 = (next ?? this)._point
    const d1 = p0.getDistance(p1)
    const d2 = p1.getDistance(p2)
    if (!type || type === 'catmull-rom') {
      // Implementation of by Catmull-Rom splines with factor parameter
      // based on work by @nicholaswmin:
      // https://github.com/nicholaswmin/VectorTests
      // Using these factors produces different types of splines:
      // 0.0: the standard, uniform Catmull-Rom spline
      // 0.5: the centripetal Catmull-Rom spline, guaranteeing no self-
      //      intersections
      // 1.0: the chordal Catmull-Rom spline
      const a = factor === undefined ? 0.5 : factor
      const d1_a = Math.pow(d1, a)
      const d1_2a = d1_a * d1_a
      const d2_a = Math.pow(d2, a)
      const d2_2a = d2_a * d2_a
      if (!_first && previous) {
        const A = 2 * d2_2a + 3 * d2_a * d1_a + d1_2a
        const N = 3 * d2_a * (d2_a + d1_a)
        this.handleIn =
          N !== 0
            ? new Point(
                (d2_2a * p0._x + A * p1._x - d1_2a * p2._x) / N - p1._x,
                (d2_2a * p0._y + A * p1._y - d1_2a * p2._y) / N - p1._y
              )
            : new Point()
      }
      if (!_last && next) {
        const A = 2 * d1_2a + 3 * d1_a * d2_a + d2_2a
        const N = 3 * d1_a * (d1_a + d2_a)
        this.handleOut =
          N !== 0
            ? new Point(
                (d1_2a * p2._x + A * p1._x - d2_2a * p0._x) / N - p1._x,
                (d1_2a * p2._y + A * p1._y - d2_2a * p0._y) / N - p1._y
              )
            : new Point()
      }
    } else if (type === 'geometric') {
      // Geometric smoothing approach based on:
      // http://www.antigrain.com/research/bezier_interpolation/
      // http://scaledinnovation.com/analytics/splines/aboutSplines.html
      // http://bseth99.github.io/projects/animate/2-bezier-curves.html
      if (previous && next) {
        const vector = p0.subtract(p2)
        const t = factor === undefined ? 0.4 : factor
        const k = t * d1 / (d1 + d2)
        if (!_first) {
          this.handleIn = vector.multiply(k)
        }
        if (!_last) {
          this.handleOut = vector.multiply(k - t)
        }
      }
    } else {
      throw new Error(`Smoothing method '${type}' not supported.`)
    }
  }

  /**
   * The previous segment in the {@link Path#segments} array that the
   * segment belongs to. If the segments belongs to a closed path, the last
   * segment is returned for the first segment of the path.
   */
  get previous(): Segment | null {
    const segments = this._path?._segments
    return (
      segments && (
        segments[this._index - 1] ||
        this._path._closed && segments[segments.length - 1]
      ) ||
      null
    )
  }

  /**
   * Checks if the this is the first segment in the {@link Path#segments}
   * array.
   *
   * @return {@true if this is the first segment}
   */
  isFirst(): boolean {
    return !this._index
  }

  /**
   * Checks if the this is the last segment in the {@link Path#segments}
   * array.
   *
   * @return {@true if this is the last segment}
   */
  isLast(): boolean {
    const path = this._path
    return path && this._index === path._segments.length - 1 || false
  }

  /**
   * Reverses the {@link #handleIn} and {@link #handleOut} vectors of this
   * segment, modifying the actual segment without creating a copy.
   *
   * @return the reversed segment
   */
  reverse() {
    const handleIn = this._handleIn
    const handleOut = this._handleOut
    const tmp = handleIn.clone()
    handleIn.set(handleOut)
    handleOut.set(tmp)
  }

  /**
   * Returns the reversed the segment, without modifying the segment itself.
   * @return the reversed segment
   */
  reversed(): Segment {
    return new Segment(this._point, this._handleOut, this._handleIn)
  }

  /**
   * Removes the segment from the path that it belongs to.
   * @return {@true if the segment was removed}
   */
  remove(): boolean {
    return this._path ? !!this._path.removeSegment(this._index) : false
  }

  /**
   * @return a copy of the segment
   */
  clone(): Segment {
    const segment = new Segment(this._point, this._handleIn, this._handleOut)
    const name = this._name
    const data = this._data
    if (name) {
      segment._name = name
    }
    if (data) {
      segment._data = { ...data }
    }
    return segment
  }

  equals(segment: Segment): boolean {
    return !!(
      segment === this || (
        segment &&
        this.className === segment.className &&
        this._point.equals(segment._point) &&
        this._handleIn.equals(segment._handleIn) &&
        this._handleOut.equals(segment._handleOut)
      )
    )
  }

  /**
   * @return a string representation of the segment
   */
  toString(): string {
    const parts = [`point: ${this._point}`]
    if (!this._handleIn.isZero()) {
      parts.push(`handleIn: ${this._handleIn}`)
    }
    if (!this._handleOut.isZero()) {
      parts.push(`handleOut: ${this._handleOut}`)
    }
    return `{ ${parts.join(', ')} }`
  }

  /**
   * Transform the segment by the specified matrix.
   *
   * @param matrix the matrix to transform the segment by
   */
  transform(matrix: Matrix) {
    this._transformCoordinates(matrix, new Array(6), true)
    this._changed()
  }

  /**
   * Interpolates between the two specified segments and sets the point and
   * handles of this segment accordingly.
   *
   * @param from the segment defining the geometry when `factor` is
   *     `0`
   * @param to the segment defining the geometry when `factor` is
   *     `1`
   * @param factor the interpolation coefficient, typically between
   *     `0` and `1`, but extrapolation is possible too
   */
  interpolate(from: Segment, to: Segment, factor: number) {
    const u = 1 - factor
    const v = factor
    const point1 = from._point
    const point2 = to._point
    const handleIn1 = from._handleIn
    const handleIn2 = to._handleIn
    const handleOut2 = to._handleOut
    const handleOut1 = from._handleOut
    this._point._set(
      u * point1._x + v * point2._x,
      u * point1._y + v * point2._y,
      true
    )
    this._handleIn._set(
      u * handleIn1._x + v * handleIn2._x,
      u * handleIn1._y + v * handleIn2._y,
      true
    )
    this._handleOut._set(
      u * handleOut1._x + v * handleOut2._x,
      u * handleOut1._y + v * handleOut2._y,
      true
    )
    this._changed()
  }

  _transformCoordinates(
    matrix: Matrix | null,
    coords: number[],
    change?: boolean
  ) {
    // Use matrix.transform version() that takes arrays of multiple
    // points for largely improved performance, as no calls to
    // Point.read() and Point constructors are necessary.
    const point = this._point
    // If change is true, only transform handles if they are set, as
    // _transformCoordinates is called only to change the segment, no
    // to receive the coords.
    // This saves some computation time. If change is false, always
    // use the real handles, as we just want to receive a filled
    // coords array for getBounds().
    const handleIn =
      !change || !this._handleIn.isZero()
        ? this._handleIn
        : null
    const handleOut =
      !change || !this._handleOut.isZero()
        ? this._handleOut
        : null
    let x = point._x
    let y = point._y
    let i = 2
    coords[0] = x
    coords[1] = y
    // We need to convert handles to absolute coordinates in order
    // to transform them.
    if (handleIn) {
      coords[i++] = handleIn._x + x
      coords[i++] = handleIn._y + y
    }
    if (handleOut) {
      coords[i++] = handleOut._x + x
      coords[i++] = handleOut._y + y
    }
    // If no matrix was previded, this was just called to get the coords and
    // we are done now.
    if (matrix) {
      matrix._transformCoordinates(coords, coords, i / 2)
      x = coords[0]
      y = coords[1]
      if (change) {
        // If change is true, we need to set the new values back
        point._x = x
        point._y = y
        i = 2
        if (handleIn) {
          handleIn._x = coords[i++] - x
          handleIn._y = coords[i++] - y
        }
        if (handleOut) {
          handleOut._x = coords[i++] - x
          handleOut._y = coords[i++] - y
        }
      } else {
        // We want to receive the results in coords, so make sure
        // handleIn and out are defined too, even if they're 0
        if (!handleIn) {
          coords[i++] = x
          coords[i++] = y
        }
        if (!handleOut) {
          coords[i++] = x
          coords[i++] = y
        }
      }
    }
    return coords
  }

  /**
   * Returns the passed segment if it is one already, or else a new segment
   * created from the passed value: an array of a point and its handles, a
   * flat array of their coordinates, `[x, y, inX, inY, outX, outY]`, or
   * anything that {@link Segment()} reads.
   *
   * @param segment
   */
  static from(segment: SegmentLike): Segment {
    if (segment instanceof Segment) {
      return segment
    } else if (Array.isArray(segment)) {
      // Numbers are a point, or a point and its handles, as flat pairs:
      const points =
        typeof segment[0] === 'number'
          ? [0, 2, 4]
              .filter(index => index < segment.length)
              .map(index => segment.slice(index, index + 2) as number[])
          : (segment as PointLike[])
      return new Segment(...(points as [PointLike, PointLike, PointLike]))
    } else {
      return new Segment(segment as any)
    }
  }

  static {
    this.prototype._selection = 0
    this.prototype._name = null
  }
}
