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
  ANGULAR_EPSILON,
  CURVETIME_EPSILON,
  Change,
  ChangeFlag,
  CompoundPath,
  Curve,
  CurveLocation,
  EPSILON,
  Effect,
  Formatter,
  GEOMETRIC_EPSILON,
  Group,
  HitResult,
  Item,
  ItemSelection,
  KAPPA,
  Line,
  Matrix,
  PathFitter,
  PathFlattener,
  PathItem,
  Point,
  Rectangle,
  Segment,
  SegmentSelection,
  Shape,
  Size,
  capitalize,
  curveEvaluations,
  defineConstructors,
  defineStrokeProfile,
  equals,
  getStrokeOutline,
  inject,
  isZero,
  paper,
  push,
  removeNamed
} from '../internal.ts'
import type { PointLike } from '../basic/Point.ts'
import type { Project } from '../item/Project.ts'
import type { SizeLike } from '../basic/Size.ts'
import type { Style } from '../style/Style.ts'
import type { SegmentLike } from './Segment.ts'
import type { SegmentPoint } from './SegmentPoint.ts'

/**
 * The path item represents a path in a Paper.js project.
 */
// DOCS: Explain that path matrix is always applied with each transformation.
export class Path extends PathItem {
  // NOTE: Path keeps its state and internal methods in `_` members rather
  // than `#private` ones, as hosted items are shells created from the
  // prototype without the constructor (see Item.Hosted), which have no
  // private brand. The hosted loading also copies these fields by name.
  _segments: Segment[]
  _closed: boolean
  // Increased on every change of segments, so CurveLocation knows when to
  // update its internally cached values:
  _version: number
  _curves: Curve[]
  // The sum of the selection states of all segments, see SegmentSelection:
  _segmentSelection: number
  // The segments by name, see Segment#name:
  _namedSegments: Record<string, Segment[]>
  // The cached length and area, cleared by #_changed():
  _length: number
  _area: number
  // The cached outline of the stroke profile, see #_getStrokeOutline():
  _strokeOutline: PathItem

  /**
   * Creates a new path item and places it at the top of the active layer.
   *
   * @param segments An array of segments (or points to be converted to
   *     segments) that will be added to the path
   *
   * @example
   * // Create an empty path and add segments to it:
   * var path = new Path();
   * path.strokeColor = 'black';
   * path.add(new Point(30, 30));
   * path.add(new Point(100, 100));
   *
   * @example
   * // Create a path with two segments:
   * var segments = [new Point(30, 30), new Point(100, 100)];
   * var path = new Path(segments);
   * path.strokeColor = 'black';
   */
  constructor(segments?: SegmentLike[])
  /**
   * Creates a new path item from an object description and places it at the
   * top of the active layer.
   *
   * @param object an object containing properties to be set on the
   *     path
   *
   * @example {@paperscript}
   * var path = new Path({
   *     segments: [[20, 20], [80, 80], [140, 20]],
   *     fillColor: 'black',
   *     closed: true
   * });
   *
   * @example {@paperscript}
   * var path = new Path({
   *     segments: [[20, 20], [80, 80], [140, 20]],
   *     strokeColor: 'red',
   *     strokeWidth: 20,
   *     strokeCap: 'round',
   *     selected: true
   * });
   */
  constructor(object: object)
  /**
   * Creates a new path item from SVG path-data and places it at the top of
   * the active layer. A path holds a single sub-path: further `M` commands
   * are ignored, and the commands that follow them continue the same path.
   * Use {@link CompoundPath} or {@link PathItem.create(pathData)} to create
   * items with multiple sub-paths.
   *
   * @param pathData the SVG path-data that describes the geometry
   * of this path
   *
   * @example {@paperscript}
   * var pathData = 'M100,50c0,27.614-22.386,50-50,50S0,77.614,0,50S22.386,0,50,0S100,22.386,100,50';
   * var path = new Path(pathData);
   * path.fillColor = 'red';
   */
  constructor(pathData: string)
  constructor(...segments: SegmentLike[])
  constructor(...args: any[]) {
    super()
    // arg can either be an object literal containing properties to be set
    // on the path, a list of segments to be set, or the first of multiple
    // arguments describing separate segments.
    // If it is an array, it can also be a description of a point, so
    // check its first entry for object as well.
    // But first see if segments are directly passed at all. If not, try
    // _set(arg).
    const [arg] = args
    const segments = Array.isArray(arg)
      ? typeof arg[0] === 'object'
        ? arg
        : args
      : // See if it behaves like a segment or a point, but filter out
        // rectangles, as accepted by some Path.Constructor constructors.
        (
            arg &&
            arg.size === undefined &&
            (arg.x !== undefined || arg.point !== undefined)
          )
        ? args
        : null
    const isPathData = !segments && typeof arg === 'string'
    // Only pass on arg as props if it isn't consumed for segments or path
    // data, which go in after #_initializeContent() set up the segments:
    this._initialize(!segments && !isPathData && arg)
    if (segments && segments.length > 0) {
      this.segments = segments
    } else if (isPathData) {
      this.pathData = arg
    }
  }

  _initializeContent(project: Project) {
    super._initializeContent(project)
    this._closed = false
    this._segments = []
    this._version = 0
    this._curves = undefined
    this._segmentSelection = 0
  }

  _equals(item: this): boolean {
    return (
      this._closed === item._closed &&
      equals(this._segments, item._segments) &&
      equals(this._strokeProfile, item._strokeProfile)
    )
  }

  copyContent(source: this) {
    const profile = source._strokeProfile
    this.segments = source._segments
    this._closed = source._closed
    // The same segments, so the same indices:
    if (profile || this._strokeProfile) {
      this.strokeProfile = (
        profile &&
        profile.map(stop => ({
          index: stop._index,
          width: stop._width,
          aspect: stop._aspect,
          angle: stop._angle,
          smooth: stop._smooth
        }))
      )
    }
  }

  _changed(flags: number) {
    super._changed(flags)
    if (flags & ChangeFlag.GEOMETRY) {
      this._length = this._area = undefined
      if (flags & ChangeFlag.SEGMENTS) {
        this._version++ // See CurveLocation
      } else if (this._curves) {
        // Only notify all curves if we're not told that only segments
        // have changed and took already care of notifications.
        for (let i = 0, l = this._curves.length; i < l; i++) {
          this._curves[i]._changed()
        }
      }
    }
    if (flags & (ChangeFlag.GEOMETRY | ChangeFlag.STROKE)) {
      this._strokeOutline = undefined
    }
  }

  // Whether the path draws its stroke as the outline of its stroke profile.
  // Compound paths draw the strokes of their children as one:
  _hasStrokeProfile(): boolean {
    return (
      !!this._strokeProfile &&
      this.hasStroke() &&
      !(this._parent instanceof CompoundPath)
    )
  }

  // Paths with a stroke profile draw their stroke as its outline, filled with
  // the stroke color, after their effects:
  _hasEffects(): boolean {
    return super._hasEffects() || this._hasStrokeProfile()
  }

  _applyEffects(art: Item): Item {
    let output = super._applyEffects(art)
    if (this._hasStrokeProfile()) {
      if (output) {
        const effect = Effect.get('outline')
        output = effect?.onApply({ art: output, item: this }) || output
      } else {
        // Without effects, it's the path's own outline:
        const outline = this._getStrokeOutline().clone({ insert: false })
        outline.set({
          fillColor: this.strokeColor,
          strokeColor: null
        })
        if (art.hasFill()) {
          art.strokeColor = null
          output = new Group({
            children:
              this.paintOrder === 'stroke' ? [outline, art] : [art, outline],
            insert: false
          })
        } else {
          output = outline
        }
      }
    }
    return output
  }

  // @override
  get style(): Style {
    // If this path is part of a compound-path, return the parent's style.
    const parent = this._parent
    return (parent instanceof CompoundPath ? parent : this)._style
  }

  set style(style: any) {
    super.style = style
  }

  /**
   * The segments contained within the path. Segments that define a
   * {@link Segment#name} can also be accessed by name.
   *
   * @example {@paperscript}
   * // Accessing segments by name:
   * var path = new Path([20, 80], [50, 20], [80, 80]);
   * path.strokeColor = 'black';
   *
   * // Set the name of the top segment:
   * path.segments[1].name = 'top';
   *
   * // The segment can be accessed by name:
   * path.segments['top'].point.y += 20;
   */
  get segments(): Segment[] {
    return this._segments
  }

  set segments(segments: SegmentLike[]) {
    const { fullySelected } = this
    let length = segments && segments.length
    const named = this._namedSegments
    // The new segments keep the stroke profile by the fractions of
    // its offsets along the path:
    const profile = this._strokeProfile
    let pathLength = profile && this.length
    const fractions = (
      profile &&
      profile.map(stop => (pathLength ? stop.offset / pathLength : 0))
    )
    this._strokeProfile = null
    if (named) {
      for (const name in named) {
        delete this._segments[name]
      }
      this._namedSegments = null
    }
    this._segments.length = 0
    this._segmentSelection = 0
    // Calculate new curves next time we read #curves
    this._curves = undefined
    if (length) {
      // See if the last segment is a boolean describing the path's closed
      // state. This is part of the shorter segment array notation that
      // can also be nested to create compound-paths out of one array.
      const last = segments[length - 1]
      if (typeof last === 'boolean') {
        this.closed = last
        length--
      }
      this._add(readSegments(segments, 0, length))
    }
    // Preserve fullySelected state.
    // TODO: Do we still need this?
    if (fullySelected) {
      this.fullySelected = true
    }
    if (profile) {
      this._strokeProfile = profile
      pathLength = this.length
      for (let i = 0, l = profile.length; i < l; i++) {
        profile[i]._index = this._getIndexAt(fractions[i] * pathLength)
      }
      this._sortStrokeProfile()
    }
  }

  /**
   * The first Segment contained within the path.
   */
  get firstSegment(): Segment {
    return this._segments[0]
  }

  /**
   * The last Segment contained within the path.
   */
  get lastSegment(): Segment {
    return this._segments[this._segments.length - 1]
  }

  /**
   * The curves contained within the path.
   */
  get curves(): Curve[] {
    let curves = this._curves
    const segments = this._segments
    if (!curves) {
      const length = this._countCurves()
      curves = this._curves = new Array(length)
      for (let i = 0; i < length; i++) {
        curves[i] = new Curve(
          this,
          segments[i],
          // Use first segment for segment2 of closing curve
          segments[i + 1] || segments[0]
        )
      }
    }
    return curves
  }

  /**
   * The first Curve contained within the path.
   */
  get firstCurve(): Curve {
    return this.curves[0]
  }

  /**
   * The last Curve contained within the path.
   */
  get lastCurve(): Curve {
    const { curves } = this
    return curves[curves.length - 1]
  }

  /**
   * Specifies whether the path is closed. If it is closed, Paper.js connects
   * the first and last segments.
   *
   * @example {@paperscript}
   * var myPath = new Path();
   * myPath.strokeColor = 'black';
   * myPath.add(new Point(50, 75));
   * myPath.add(new Point(100, 25));
   * myPath.add(new Point(150, 75));
   *
   * // Close the path:
   * myPath.closed = true;
   */
  get closed(): boolean {
    return this._closed
  }

  set closed(closed: boolean) {
    // On-the-fly conversion to boolean:
    const isClosed = !!closed
    if (this._closed != isClosed) {
      // Opening the path lets go of the stops on its closing curve:
      if (!isClosed && this._strokeProfile) {
        const last = this._segments.length - 1
        this._filterStrokeProfile(stop => stop._index <= last)
      }
      this._closed = isClosed
      // Update _curves length
      if (this._curves) {
        const length = (this._curves.length = this._countCurves())
        // If we were closing this path, we need to add a new curve now
        if (isClosed) {
          this._curves[length - 1] = new Curve(
            this,
            this._segments[length - 1],
            this._segments[0]
          )
        }
      }
      // Use SEGMENTS notification instead of GEOMETRY since curves are
      // up-to-date and don't need notification.
      this._changed(Change.SEGMENTS)
    }
  }

  _getPathData(_matrix?: Matrix, _precision?: number): string {
    // NOTE: The pathData accessors are defined in PathItem.
    const segments = this._segments
    const { length } = segments
    const formatter = new Formatter(_precision)
    const coords = new Array(6)
    let first = true
    let curX: number
    let curY: number
    let prevX: number
    let prevY: number
    let inX: number
    let inY: number
    let outX: number
    let outY: number
    const parts = []

    function addSegment(segment: Segment, skipLine?: boolean) {
      segment._transformCoordinates(_matrix, coords)
      curX = coords[0]
      curY = coords[1]
      if (first) {
        parts.push('M' + formatter.pair(curX, curY))
        first = false
      } else {
        inX = coords[2]
        inY = coords[3]
        if (inX === curX && inY === curY && outX === prevX && outY === prevY) {
          // l = relative lineto:
          if (!skipLine) {
            const dx = curX - prevX
            const dy = curY - prevY
            parts.push(
              dx === 0
                ? 'v' + formatter.number(dy)
                : dy === 0
                  ? 'h' + formatter.number(dx)
                  : 'l' + formatter.pair(dx, dy)
            )
          }
        } else {
          // c = relative curveto:
          parts.push(
            'c' +
            formatter.pair(outX - prevX, outY - prevY) +
            ' ' +
            formatter.pair(inX - prevX, inY - prevY) +
            ' ' +
            formatter.pair(curX - prevX, curY - prevY)
          )
        }
      }
      prevX = curX
      prevY = curY
      outX = coords[4]
      outY = coords[5]
    }

    if (!length) return ''

    for (let i = 0; i < length; i++) {
      addSegment(segments[i])
    }
    // Close path by drawing first segment again
    if (this._closed && length > 0) {
      addSegment(segments[0], true)
      parts.push('z')
    }
    return parts.join('')
  }

  // TODO: Consider adding getSubPath(a, b), returning a part of the current
  // path, with the added benefit that b can be < a, and closed looping is
  // taken into account.

  isEmpty(): boolean {
    return !this._segments.length
  }

  _transformContent(matrix: Matrix): boolean {
    const segments = this._segments
    const coords = new Array(6)
    for (let i = 0, l = segments.length; i < l; i++) {
      segments[i]._transformCoordinates(matrix, coords, true)
    }
    this._scaleStroke(matrix)
    return true
  }

  /**
   * Private method that adds segments to the segment list. It assumes that
   * the passed object is an array of segments already and does not perform
   * any checks. If a curves list was requested, it will be kept in sync with
   * the segments list automatically.
   */
  _add(segs: Segment[] & { _curves?: Curve[] }, index?: number): Segment[] {
    let i: number
    let l: number

    // Local short-cuts:
    const segments = this._segments
    const curves = this._curves
    const amount = segs.length
    const append = index == null
    const start = append ? segments.length : index
    // Scan through segments to add first, convert if necessary and set
    // _path and _index references on them.
    for (i = 0; i < amount; i++) {
      let segment = segs[i]
      // If the segments belong to another path already, clone them before
      // adding:
      if (segment._path) {
        segment = segs[i] = segment.clone()
      }
      segment._path = this
      segment._index = start + i
      // Set the name again to add it to the segments' name lookup.
      if (segment._name) {
        segment.name = segment._name
      }
      // If parts of this segment are selected, adjust the internal
      // _segmentSelection now
      if (segment._selection) {
        this._updateSelection(segment, 0, segment._selection)
      }
    }
    if (append) {
      // Append them all at the end.
      push(segments, segs)
    } else {
      // Insert somewhere else
      segments.splice(start, 0, ...segs)
      // Adjust the indices of the segments above.
      for (i = start + amount, l = segments.length; i < l; i++) {
        segments[i]._index = i
      }
    }
    // Keep the curves list in sync all the time in case it was requested
    // already.
    if (curves) {
      const total = this._countCurves()
      // If we're adding a new segment to the end of an open path,
      // we need to step one index down to get its curve.
      const first =
        start > 0 && start + amount - 1 === total ? start - 1 : start
      let insert = first
      const end = Math.min(first + amount, total)
      if (segs._curves) {
        // Reuse removed curves.
        curves.splice(first, 0, ...segs._curves)
        insert += segs._curves.length
      }
      // Insert new curves, but do not initialize their segments yet,
      // since #_adjustCurves() handles all that for us.
      for (i = insert; i < end; i++) {
        curves.splice(i, 0, new Curve(this, null, null))
      }
      // Adjust segments for the curves before and after the removed ones
      this._adjustCurves(first, end)
    }
    if (this._strokeProfile) {
      this._insertStrokeProfile(start, amount)
    }
    // Use SEGMENTS notification instead of GEOMETRY since curves are kept
    // up-to-date by _adjustCurves() and don't need notification.
    this._changed(Change.SEGMENTS)
    return segs
  }

  /**
   * Adjusts segments of curves before and after inserted / removed segments.
   */
  _adjustCurves(start: number, end: number) {
    const segments = this._segments
    const curves = this._curves
    let curve: Curve
    for (let i = start; i < end; i++) {
      curve = curves[i]
      curve._path = this
      curve._segment1 = segments[i]
      curve._segment2 = segments[i + 1] || segments[0]
      curve._changed()
    }
    // If it's the first segment, correct the last segment of closed
    // paths too:
    if (
      (curve = curves[this._closed && !start ? segments.length - 1 : start - 1])
    ) {
      curve._segment2 = segments[start] || segments[0]
      curve._changed()
    }
    // Fix the segment after the modified range, if it exists
    if ((curve = curves[end])) {
      curve._segment1 = segments[end]
      curve._changed()
    }
  }

  /**
   * Returns the amount of curves this path item is supposed to have, based
   * on its amount of #segments and #closed state.
   */
  _countCurves(): number {
    const { length } = this._segments
    // Reduce length by one if it's an open path:
    return !this._closed && length > 0 ? length - 1 : length
  }

  // DOCS: find a way to document the variable segment parameters of Path#add
  /**
   * Adds one or more segments to the end of the {@link #segments} array of
   * this path.
   *
   * @param segment the segment or point to be
   * added.
   * @return the added segment(s). This is not necessarily
   * the same object, e.g. if the segment to be added already belongs to
   * another path.
   *
   * @example {@paperscript}
   * // Adding segments to a path using point objects:
   * var path = new Path({
   *     strokeColor: 'black'
   * });
   *
   * // Add a segment at {x: 30, y: 75}
   * path.add(new Point(30, 75));
   *
   * // Add two segments in one go at {x: 100, y: 20}
   * // and {x: 170, y: 75}:
   * path.add(new Point(100, 20), new Point(170, 75));
   *
   * @example {@paperscript}
   * // Adding segments to a path using arrays containing number pairs:
   * var path = new Path({
   *     strokeColor: 'black'
   * });
   *
   * // Add a segment at {x: 30, y: 75}
   * path.add([30, 75]);
   *
   * // Add two segments in one go at {x: 100, y: 20}
   * // and {x: 170, y: 75}:
   * path.add([100, 20], [170, 75]);
   *
   * @example {@paperscript}
   * // Adding segments to a path using objects:
   * var path = new Path({
   *     strokeColor: 'black'
   * });
   *
   * // Add a segment at {x: 30, y: 75}
   * path.add({x: 30, y: 75});
   *
   * // Add two segments in one go at {x: 100, y: 20}
   * // and {x: 170, y: 75}:
   * path.add({x: 100, y: 20}, {x: 170, y: 75});
   *
   * @example {@paperscript}
   * // Adding a segment with handles to a path:
   * var path = new Path({
   *     strokeColor: 'black'
   * });
   *
   * path.add(new Point(30, 75));
   *
   * // Add a segment with handles:
   * var point = new Point(100, 20);
   * var handleIn = new Point(-50, 0);
   * var handleOut = new Point(50, 0);
   * var added = path.add(new Segment(point, handleIn, handleOut));
   *
   * // Select the added segment, so we can see its handles:
   * added.selected = true;
   *
   * path.add(new Point(170, 75));
   */
  add(segment: SegmentLike): Segment
  add(...segments: SegmentLike[]): Segment[]
  add(...segments: SegmentLike[]): Segment | Segment[] {
    return segments.length > 1
      ? this._add(readSegments(segments))
      : this._add([Segment.from(segments[0])])[0]
  }

  /**
   * Inserts one or more segments at a given index in the list of this path's
   * segments.
   *
   * @param index the index at which to insert the segment
   * @param segment the segment or point to be inserted.
   * @return the added segment. This is not necessarily the same
   * object, e.g. if the segment to be added already belongs to another path
   *
   * @example {@paperscript}
   * // Inserting a segment:
   * var myPath = new Path();
   * myPath.strokeColor = 'black';
   * myPath.add(new Point(50, 75));
   * myPath.add(new Point(150, 75));
   *
   * // Insert a new segment into myPath at index 1:
   * myPath.insert(1, new Point(100, 25));
   *
   * // Select the segment which we just inserted:
   * myPath.segments[1].selected = true;
   *
   * @example {@paperscript}
   * // Inserting multiple segments:
   * var myPath = new Path();
   * myPath.strokeColor = 'black';
   * myPath.add(new Point(50, 75));
   * myPath.add(new Point(150, 75));
   *
   * // Insert two segments into myPath at index 1:
   * myPath.insert(1, [80, 25], [120, 25]);
   *
   * // Select the segments which we just inserted:
   * myPath.segments[1].selected = true;
   * myPath.segments[2].selected = true;
   */
  insert(index: number, segment: SegmentLike): Segment
  insert(index: number, ...segments: SegmentLike[]): Segment[]
  insert(index: number, ...segments: SegmentLike[]): Segment | Segment[] {
    return segments.length > 1
      ? this._add(readSegments(segments), index)
      : this._add([Segment.from(segments[0])], index)[0]
  }

  addSegment(segment: SegmentLike): Segment {
    return this._add([Segment.from(segment)])[0]
  }

  insertSegment(index: number, segment: SegmentLike): Segment {
    return this._add([Segment.from(segment)], index)[0]
  }

  /**
   * Adds an array of segments (or types that can be converted to segments)
   * to the end of the {@link #segments} array.
   *
   * @param segments
   * @return an array of the added segments. These segments are
   * not necessarily the same objects, e.g. if the segment to be added already
   * belongs to another path
   *
   * @example {@paperscript}
   * // Adding an array of Point objects:
   * var path = new Path({
   *     strokeColor: 'black'
   * });
   * var points = [new Point(30, 50), new Point(170, 50)];
   * path.addSegments(points);
   *
   * @example {@paperscript}
   * // Adding an array of [x, y] arrays:
   * var path = new Path({
   *     strokeColor: 'black'
   * });
   * var array = [[30, 75], [100, 20], [170, 75]];
   * path.addSegments(array);
   *
   * @example {@paperscript}
   * // Adding segments from one path to another:
   *
   * var path = new Path({
   *     strokeColor: 'black'
   * });
   * path.addSegments([[30, 75], [100, 20], [170, 75]]);
   *
   * var path2 = new Path();
   * path2.strokeColor = 'red';
   *
   * // Add the second and third segments of path to path2:
   * path2.add(path.segments[1], path.segments[2]);
   *
   * // Move path2 30pt to the right:
   * path2.position.x += 30;
   */
  addSegments(segments: SegmentLike[]): Segment[] {
    return this._add(readSegments(segments))
  }

  /**
   * Inserts an array of segments at a given index in the path's
   * {@link #segments} array.
   *
   * @param index the index at which to insert the segments
   * @param segments the segments to be inserted
   * @return an array of the added segments. These segments are
   * not necessarily the same objects, e.g. if the segment to be added already
   * belongs to another path
   */
  insertSegments(index: number, segments: SegmentLike[]): Segment[] {
    return this._add(readSegments(segments), index)
  }

  /**
   * Removes the segment at the specified index of the path's
   * {@link #segments} array.
   *
   * @param index the index of the segment to be removed
   * @return the removed segment
   *
   * @example {@paperscript}
   * // Removing a segment from a path:
   *
   * // Create a circle shaped path at { x: 80, y: 50 }
   * // with a radius of 35:
   * var path = new Path.Circle({
   *     center: new Point(80, 50),
   *     radius: 35,
   *     strokeColor: 'black'
   * });
   *
   * // Remove its second segment:
   * path.removeSegment(1);
   *
   * // Select the path, so we can see its segments:
   * path.selected = true;
   */
  removeSegment(index: number): Segment | null {
    return this.removeSegments(index, index + 1)[0] || null
  }

  /**
   * Removes all segments from the path's {@link #segments} array.
   *
   * @return an array containing the removed segments
   */
  removeSegments(): Segment[]
  /**
   * Removes the segments from the specified `from` index to the `to` index
   * from the path's {@link #segments} array. On closed paths, `from` can be
   * bigger than `to`, to remove the segments from `from` to the end and then
   * from the beginning up to `to`, wrapping around the closing curve.
   *
   * @param from the beginning index, inclusive
   * @param to the ending index, exclusive
   * @return an array containing the removed segments, in the
   *     order in which they appeared along the path
   *
   * @example {@paperscript}
   * // Removing segments from a path:
   *
   * // Create a circle shaped path at { x: 80, y: 50 }
   * // with a radius of 35:
   * var path = new Path.Circle({
   *     center: new Point(80, 50),
   *     radius: 35,
   *     strokeColor: 'black'
   * });
   *
   * // Remove the segments from index 1 till index 2:
   * path.removeSegments(1, 2);
   *
   * // Select the path, so we can see its segments:
   * path.selected = true;
   */
  removeSegments(
    from: number,
    to?: number,
    _includeCurves?: boolean
  ): Segment[]
  removeSegments(
    from?: number,
    to?: number,
    _includeCurves?: boolean
  ): Segment[] & { _curves?: Curve[] } {
    let i: number
    let l: number

    const start = from || 0
    const end = to !== undefined ? to : this._segments.length
    // On closed paths, wrap around from the end to the beginning:
    if (start > end && this._closed) {
      return this.removeSegments(start).concat(this.removeSegments(0, end))
    }
    const segments = this._segments
    const count = segments.length // segment count before removal
    if (this._strokeProfile && start < Math.min(end, count)) {
      this._removeStrokeProfile(start, Math.min(end, count))
    }
    // Moving the stroke profile may have created the curves:
    let curves = this._curves
    const removed: Segment[] & { _curves?: Curve[] } = segments.splice(
      start,
      end - start
    )
    const amount = removed.length
    if (!amount) return removed
    // Update selection state accordingly
    for (i = 0; i < amount; i++) {
      const segment = removed[i]
      if (segment._selection) {
        this._updateSelection(segment, segment._selection, 0)
      }
      if (segment._name) {
        removeNamed(segments, this._namedSegments, segment._name, segment)
      }
      // Clear the indices and path references of the removed segments
      segment._index = segment._path = null
    }
    // Adjust the indices of the segments above.
    for (i = start, l = segments.length; i < l; i++) {
      segments[i]._index = i
    }
    // Keep curves in sync
    if (curves) {
      // If we're removing the last segment, remove the last curve (the
      // one to the left of the segment, not to the right, as normally).
      // Also take into account closed paths, which have one curve more
      // than segments.
      const index =
        start > 0 && end === count + (this._closed ? 1 : 0) ? start - 1 : start
      curves = curves.splice(index, amount)
      // Unlink the removed curves from the path.
      for (i = curves.length - 1; i >= 0; i--) {
        curves[i]._path = null
      }
      // Return the removed curves as well, if we're asked to include
      // them, but exclude the first curve, since that's shared with the
      // previous segment and does not connect the returned segments.
      if (_includeCurves) {
        removed._curves = curves.slice(1)
      }
      // Adjust segments for the curves before and after the removed ones
      this._adjustCurves(index, index)
    }
    // Use SEGMENTS notification instead of GEOMETRY since curves are kept
    // up-to-date by _adjustCurves() and don't need notification.
    this._changed(Change.SEGMENTS)
    return removed
  }

  // DOCS Path#clear()
  clear(): Segment[] {
    return this.removeSegments()
  }

  /**
   * Checks if any of the curves in the path have curve handles set. Handles
   * of which both coordinates are 0 within a tolerance of 1e-12 count as not
   * set, see {@link Point#isZero()}.
   *
   * @return {@true if the path has curve handles set}
   * @see Segment#hasHandles()
   * @see Curve#hasHandles()
   */
  hasHandles(): boolean {
    const segments = this._segments
    for (let i = 0, l = segments.length; i < l; i++) {
      if (segments[i].hasHandles()) return true
    }
    return false
  }

  /**
   * Clears the path's handles by setting their coordinates to zero,
   * turning the path into a polygon (or a polyline if it isn't closed).
   */
  clearHandles() {
    const segments = this._segments
    for (let i = 0, l = segments.length; i < l; i++) {
      segments[i].clearHandles()
    }
  }

  /**
   * The approximate length of the path.
   */
  get length(): number {
    if (this._length == null) {
      const { curves } = this
      let length = 0
      for (let i = 0, l = curves.length; i < l; i++) {
        length += curves[i].length
      }
      this._length = length
    }
    return this._length
  }

  /**
   * The area that the path's geometry is covering. Self-intersecting paths
   * can contain sub-areas that cancel each other out.
   */
  get area(): number {
    let area = this._area
    if (area == null) {
      const segments = this._segments
      const closed = this._closed
      area = 0
      for (let i = 0, l = segments.length; i < l; i++) {
        const last = i + 1 === l
        area += Curve.getArea(
          Curve.getValues(
            segments[i], segments[last ? 0 : i + 1],
            // If this is the last curve and the last is not closed,
            // connect with a straight curve and ignore the handles.
            null, last && !closed
          )
        )
      }
      this._area = area
    }
    return area
  }

  /**
   * Specifies whether the path and all its segments are selected. Cannot be
   * `true` on an empty path.
   *
   * @example {@paperscript}
   * // A path is fully selected, if all of its segments are selected:
   * var path = new Path.Circle({
   *     center: [80, 50],
   *     radius: 35
   * });
   * path.fullySelected = true;
   *
   * var path2 = new Path.Circle({
   *     center: [180, 50],
   *     radius: 35
   * });
   *
   * // Deselect the second segment of the second path:
   * path2.segments[1].selected = false;
   *
   * // If the path is fully selected (which it is),
   * // set its fill color to red:
   * if (path.fullySelected) {
   *     path.fillColor = 'red';
   * }
   *
   * // If the second path is fully selected (which it isn't, since we just
   * // deselected its second segment),
   * // set its fill color to red:
   * if (path2.fullySelected) {
   *     path2.fillColor = 'red';
   * }
   */
  get fullySelected(): boolean {
    const { length } = this._segments
    return (
      this.selected &&
      length > 0 &&
      this._segmentSelection === length * SegmentSelection.ALL
    )
  }

  set fullySelected(selected: boolean) {
    // No need to call _selectSegments() when selected is false, since
    // #selected does that for us
    if (selected) {
      this._selectSegments(true)
    }
    this.selected = selected
  }

  // @override
  get selection(): number {
    return super.selection
  }

  set selection(selection: number) {
    // Deselect all segments when path is marked as not selected
    if (!(selection & ItemSelection.ITEM)) {
      this._selectSegments(false)
    }
    super.selection = selection
  }

  _selectSegments(selected: boolean) {
    const segments = this._segments
    const { length } = segments
    const selection = selected ? SegmentSelection.ALL : 0
    this._segmentSelection = selection * length
    for (let i = 0; i < length; i++) {
      segments[i]._selection = selection
    }
  }

  _updateSelection(
    segment: Segment,
    oldSelection: number,
    newSelection: number
  ) {
    segment._selection = newSelection
    const selection = (this._segmentSelection += newSelection - oldSelection)
    // Set this path as selected in case we have selected segments. Do not
    // unselect if we're down to 0, as the path itself can still remain
    // selected even when empty.
    if (selection > 0) {
      this.selected = true
    }
  }

  /**
   * Divides the path on the curve at the given offset or location into two
   * curves, by inserting a new segment at the given location.
   *
   * @param location the offset or location on the
   *     path at which to divide the existing curve by inserting a new segment
   * @return the newly inserted segment if the location is valid,
   *     `null` otherwise
   * @see Curve#divideAt(location)
   */
  divideAt(location: number | CurveLocation): Segment | null {
    const loc = this.getLocationAt(location)
    let curve: Curve
    return loc && (curve = loc.curve.divideAt(loc.curveOffset))
      ? curve._segment1
      : null
  }

  /**
   * Splits the path at the given offset or location. After splitting, the
   * path will be open. If the path was open already, splitting will result in
   * two paths.
   *
   * @param location the offset or location at which to
   *     split the path
   * @return the newly created path after splitting, if any
   *
   * @example {@paperscript}
   * var path = new Path.Circle({
   *     center: view.center,
   *     radius: 40,
   *     strokeColor: 'black'
   * });
   *
   * var pointOnCircle = view.center + {
   *     length: 40,
   *     angle: 30
   * };
   *
   * var location = path.getNearestLocation(pointOnCircle);
   *
   * path.splitAt(location);
   * path.lastSegment.selected = true;
   *
   * @example {@paperscript} // Splitting an open path
   * // Draw a V shaped path:
   * var path = new Path([20, 20], [50, 80], [80, 20]);
   * path.strokeColor = 'black';
   *
   * // Split the path half-way:
   * var path2 = path.splitAt(path.length / 2);
   *
   * // Give the resulting path a red stroke-color
   * // and move it 20px to the right:
   * path2.strokeColor = 'red';
   * path2.position.x += 20;
   *
   * @example {@paperscript} // Splitting a closed path
   * var path = new Path.Rectangle({
   *     from: [20, 20],
   *     to: [80, 80],
   *     strokeColor: 'black'
   * });
   *
   * // Split the path half-way:
   * path.splitAt(path.length / 2);
   *
   * // Move the first segment, to show where the path
   * // was split:
   * path.firstSegment.point.x += 20;
   *
   * // Select the first segment:
   * path.firstSegment.selected = true;
   */
  splitAt(location: number | CurveLocation): Path | null {
    // NOTE: getLocationAt() handles both offset and location:
    const loc = this.getLocationAt(location)
    let index = loc && loc.index
    let time = loc && loc.time
    const tMin = CURVETIME_EPSILON
    const tMax = 1 - tMin
    if (time > tMax) {
      // time == 1 is the same location as time == 0 and index++
      index++
      time = 0
    }
    const { curves } = this
    if (loc && index < curves.length) {
      // Both parts keep their shapes, so the stroke profile moves along
      // by offsets:
      const cut = loc.offset
      const profile = this._strokeProfile && this._takeStrokeProfile()
      // Only divide curves if we're not on an existing segment already.
      if (time >= tMin) {
        // Divide the curve with the index at the given curve-time.
        // Increase because dividing adds more segments to the path.
        curves[index++].divideAtTime(time)
      }
      // Create the new path with the segments to the right of given
      // curve-time, which are removed from the current path. Pass true
      // for includeCurves, since we want to preserve and move them to
      // the new path through _add(), allowing us to have CurveLocation
      // keep the connection to the new path through moved curves.
      const segs = this.removeSegments(index, this._segments.length, true)
      let path: Path
      if (this._closed) {
        // If the path is closed, open it and move the segments round,
        // otherwise create two paths.
        this.closed = false
        // Just have path point to this. The moving around of segments
        // will happen below.
        path = this
      } else {
        path = new Path(Item.NO_INSERT)
        path.insertAbove(this)
        path.copyAttributes(this)
      }
      path._add(segs, 0)
      // Add dividing segment again. In case of a closed path, that's the
      // beginning segment again at the end, since we opened it.
      this.addSegment(segs[0])
      if (profile) {
        if (path === this) {
          this._setStrokeProfilePart(profile, cut, cut + profile.length)
        } else {
          this._setStrokeProfilePart(profile, 0, cut)
          path._setStrokeProfilePart(profile, cut, profile.length)
        }
      }
      return path
    }
    return null
  }

  /**
   * Joins the path with the other specified path, which will be removed in
   * the process. They can be joined if the first or last segments of either
   * path lie in the same location. Locations are optionally compare with a
   * provide `tolerance` value.
   *
   * If `null` or `this` is passed as the other path, the path will be joined
   * with itself if the first and last segment are in the same location.
   *
   * @param path the path to join this path with; `null` or `this` to
   *     join the path with itself
   * @param tolerance the tolerance with which to decide if two
   *     segments are to be considered the same location when joining
   *
   * @example {@paperscript}
   * // Joining two paths:
   * var path = new Path({
   *     segments: [[30, 25], [30, 75]],
   *     strokeColor: 'black'
   * });
   *
   * var path2 = new Path({
   *     segments: [[200, 25], [200, 75]],
   *     strokeColor: 'black'
   * });
   *
   * // Join the paths:
   * path.join(path2);
   *
   * @example {@paperscript}
   * // Joining two paths that share a point at the start or end of their
   * // segments array:
   * var path = new Path({
   *     segments: [[30, 25], [30, 75]],
   *     strokeColor: 'black'
   * });
   *
   * var path2 = new Path({
   *     segments: [[30, 25], [80, 25]],
   *     strokeColor: 'black'
   * });
   *
   * // Join the paths:
   * path.join(path2);
   *
   * // After joining, path with have 3 segments, since it
   * // shared its first segment point with the first
   * // segment point of path2.
   *
   * // Select the path to show that they have joined:
   * path.selected = true;
   *
   * @example {@paperscript}
   * // Joining two paths that connect at two points:
   * var path = new Path({
   *     segments: [[30, 25], [80, 25], [80, 75]],
   *     strokeColor: 'black'
   * });
   *
   * var path2 = new Path({
   *     segments: [[30, 25], [30, 75], [80, 75]],
   *     strokeColor: 'black'
   * });
   *
   * // Join the paths:
   * path.join(path2);
   *
   * // Because the paths were joined at two points, the path is closed
   * // and has 4 segments.
   *
   * // Select the path to show that they have joined:
   * path.selected = true;
   */
  join(path: Path | null, tolerance?: number): this {
    const epsilon = tolerance || 0
    // The joined paths keep their shapes, so their stroke profiles
    // move along by offsets, as parts in their order along the path:
    let parts = null
    if (path && path !== this) {
      const segments = path._segments
      const last1 = this.lastSegment
      let last2 = path.lastSegment
      if (!last2) return this // an empty path?
      if (this._strokeProfile || path._strokeProfile) {
        parts = [this._takeStrokeProfile()]
      }
      if (last1 && last1._point.isClose(last2._point, epsilon)) {
        path.reverse()
      }
      const first2 = path.firstSegment
      if (last1 && last1._point.isClose(first2._point, epsilon)) {
        if (parts) {
          parts.push(path._takeStrokeProfile())
        }
        last1.handleOut = first2._handleOut
        this._add(segments.slice(1))
      } else {
        const first1 = this.firstSegment
        if (first1 && first1._point.isClose(first2._point, epsilon)) {
          path.reverse()
        }
        last2 = path.lastSegment
        if (parts) {
          parts.push(path._takeStrokeProfile())
        }
        if (first1 && first1._point.isClose(last2._point, epsilon)) {
          if (parts) {
            parts.reverse()
          }
          first1.handleIn = last2._handleIn
          // Prepend all segments from path except the last one.
          this._add(segments.slice(0, segments.length - 1), 0)
        } else {
          this._add(segments.slice())
        }
      }
      if (path._closed) {
        this._add([segments[0]])
      }
      path.remove()
    }
    // If the first and last segment touch, close the resulting path and
    // merge the end segments. Also do this if no path argument was provided
    // in which cases the path is joined with itself only if its ends touch.
    const first = this.firstSegment
    const last = this.lastSegment
    if (first !== last && first._point.isClose(last._point, epsilon)) {
      if (!parts && this._strokeProfile) {
        parts = [this._takeStrokeProfile()]
      }
      first.handleIn = last._handleIn
      last.remove()
      this.closed = true
    }
    if (parts) {
      this._setStrokeProfileParts(parts)
    }
    return this
  }

  /**
   * Reduces the path by removing straight curves that have a length of 0.
   * With `options.simplify`, it also removes straight curves that are almost
   * 0 in length, and unnecessary segments between two collinear straight
   * curves.
   *
   * @option [options.simplify=false] {Boolean} also remove almost zero-length
   *     curves and segments between collinear straight curves
   *
   * @param options the reduce options
   * @return the reduced path
   */
  reduce(options?: { simplify?: boolean }): this {
    const { curves } = this
    // TODO: Find a better name, to not confuse with PathItem#simplify()
    const simplify = options?.simplify
    // When not simplifying, only remove curves if their lengths are
    // absolutely 0.
    const tolerance = simplify ? GEOMETRIC_EPSILON : 0
    for (let i = curves.length - 1; i >= 0; i--) {
      const curve = curves[i]
      // When simplifying, compare curves with isCollinear() will remove
      // any collinear neighboring curves regardless of their orientation.
      // This serves as a reliable way to remove linear overlaps but only
      // as long as the lines are truly overlapping.
      if (
        !curve.hasHandles() && (
          !curve.hasLength(tolerance) ||
          simplify && curve.isCollinear(curve.next)
        )
      ) {
        curve.remove()
      }
    }
    return this
  }

  // NOTE: Documentation is in PathItem#reverse()
  reverse() {
    this._segments.reverse()
    // Reverse the handles:
    for (let i = 0, l = this._segments.length; i < l; i++) {
      const segment = this._segments[i]
      const handleIn = segment._handleIn
      segment._handleIn = segment._handleOut
      segment._handleOut = handleIn
      segment._index = i
    }
    // Clear curves since it all has changed.
    this._curves = null
    if (this._strokeProfile) {
      this._reverseStrokeProfile()
    }
    this._changed(Change.GEOMETRY)
  }

  // NOTE: Documentation is in PathItem#flatten()
  flatten(flatness?: number) {
    // Use PathFlattener to subdivide the curves into parts that are flat
    // enough, as specified by `flatness` / Curve.isFlatEnough():
    const flattener = new PathFlattener(this, flatness || 0.25, 256, true)
    const { parts } = flattener
    const { length } = parts
    const segments = []
    for (let i = 0; i < length; i++) {
      segments.push(new Segment(parts[i].curve.slice(0, 2)))
    }
    if (!this._closed && length > 0) {
      // Explicitly add the end point of the last curve on open paths.
      segments.push(new Segment(parts[length - 1].curve.slice(6)))
    }
    this.segments = segments
  }

  // NOTE: Documentation is in PathItem#simplify()
  simplify(options?: any): boolean {
    const opts =
      typeof options === 'number' ? { tolerance: options } : options || {}
    const segments = this._segments
    const { length } = segments
    let fitted = null
    if (length > 0) {
      const { from, to, loop } = this._getRange(opts.from, opts.to)
      const first = segments[from < 0 ? from + length : from]
      const last = segments[to]
      // Join the curves outside of the range tangentially, where
      // they have handles:
      const getTangent = (handle: Point, neighbor: Segment) => (
        !loop && neighbor && !handle.isZero() && handle.negate()
      )
      fitted = new PathFitter(
        from < 0
          ? segments.slice(from).concat(segments.slice(0, to + 1))
          : segments.slice(from, to + 1),
        loop
      ).fit(
        opts.tolerance || 2.5,
        getTangent(first._handleIn, first.previous),
        getTangent(last._handleOut, last.next)
      )
      if (loop || !first.previous && !last.next) {
        this.segments = fitted
      } else {
        const { fullySelected } = this
        fitted[0].handleIn = first._handleIn
        fitted[fitted.length - 1].handleOut = last._handleOut
        if (from < 0) {
          this.removeSegments(from + length)
          this.removeSegments(0, to + 1)
          this.addSegments(fitted)
        } else {
          this.removeSegments(from, to + 1)
          this.insertSegments(from, fitted)
        }
        if (fullySelected) {
          this.fullySelected = true
        }
      }
    }
    return !!fitted
  }

  // NOTE: Documentation is in PathItem#smooth()
  smooth(options?: any) {
    let i: number
    let j: number
    let max: number

    const opts = options || {}
    const type = opts.type || 'asymmetric'
    const segments = this._segments
    const { length } = segments
    const closed = this._closed
    const { from, to, loop } = this._getRange(opts.from, opts.to)

    if (/^(?:asymmetric|continuous)$/.test(type)) {
      // Continuous smoothing approach based on work by Lubos Brieda,
      // Particle In Cell Consulting LLC, but further simplified by
      // addressing handle symmetry across segments, and the possibility
      // to process x and y coordinates simultaneously. Also added
      // handling of closed paths.
      // https://www.particleincell.com/2012/bezier-splines/
      //
      // We use different parameters for the two supported smooth methods
      // that use this algorithm: continuous and asymmetric. asymmetric
      // was the only approach available in v0.9.25 & below.
      const asymmetric = type === 'asymmetric'
      const min = Math.min
      const amount = to - from + 1
      let n = amount - 1
      // Overlap by up to 4 points on closed paths since a current
      // segment is affected by its 4 neighbors on both sides (?).
      const padding = loop ? min(amount, 4) : 1
      let paddingLeft = padding
      let paddingRight = padding
      const knots = []
      if (!closed) {
        // If the path is open and a range is defined, try using a
        // padding of 1 on either side.
        paddingLeft = min(1, from)
        paddingRight = min(1, length - to - 1)
      }
      // Set up the knots array now, taking the paddings into account.
      n += paddingLeft + paddingRight
      if (n <= 1) return
      for (i = 0, j = from - paddingLeft; i <= n; i++, j++) {
        knots[i] = segments[(j < 0 ? j + length : j) % length]._point
      }

      // In the algorithm we treat these 3 cases:
      // - left most segment (L)
      // - internal segments (I)
      // - right most segment (R)
      //
      // In both the continuous and asymmetric method, c takes these
      // values and can hence be removed from the loop starting in n - 2:
      // c = 1 (L), 1 (I), 0 (R)
      //
      // continuous:
      // a = 0 (L), 1 (I), 2 (R)
      // b = 2 (L), 4 (I), 7 (R)
      // u = 1 (L), 4 (I), 8 (R)
      // v = 2 (L), 2 (I), 1 (R)
      //
      // asymmetric:
      // a = 0 (L), 1 (I), 1 (R)
      // b = 2 (L), 4 (I), 2 (R)
      // u = 1 (L), 4 (I), 3 (R)
      // v = 2 (L), 2 (I), 0 (R)

      // (L): u = 1, v = 2
      let x = knots[0]._x + 2 * knots[1]._x
      let y = knots[0]._y + 2 * knots[1]._y
      let f = 2
      const n_1 = n - 1
      const rx = [x]
      const ry = [y]
      const rf = [f]
      const px = []
      const py = []
      // Solve with the Thomas algorithm
      for (i = 1; i < n; i++) {
        const internal = i < n_1
        //  internal--(I)  asymmetric--(R) (R)--continuous
        const a = internal ? 1 : asymmetric ? 1 : 2
        const b = internal ? 4 : asymmetric ? 2 : 7
        const u = internal ? 4 : asymmetric ? 3 : 8
        const v = internal ? 2 : asymmetric ? 0 : 1
        const m = a / f
        f = rf[i] = b - m
        x = rx[i] = u * knots[i]._x + v * knots[i + 1]._x - m * x
        y = ry[i] = u * knots[i]._y + v * knots[i + 1]._y - m * y
      }

      px[n_1] = rx[n_1] / rf[n_1]
      py[n_1] = ry[n_1] / rf[n_1]
      for (i = n - 2; i >= 0; i--) {
        px[i] = (rx[i] - px[i + 1]) / rf[i]
        py[i] = (ry[i] - py[i + 1]) / rf[i]
      }
      px[n] = (3 * knots[n]._x - px[n_1]) / 2
      py[n] = (3 * knots[n]._y - py[n_1]) / 2

      // Now update the segments
      for (
        i = paddingLeft, max = n - paddingRight, j = from;
        i <= max;
        i++, j++
      ) {
        const segment = segments[j < 0 ? j + length : j]
        const point = segment._point
        const hx = px[i] - point._x
        const hy = py[i] - point._y
        if (loop || i < max) {
          segment.handleOut = new Point(hx, hy)
        }
        if (loop || i > paddingLeft) {
          segment.handleIn = new Point(-hx, -hy)
        }
      }
    } else {
      // All other smoothing methods are handled directly on the segments:
      for (i = from; i <= to; i++) {
        segments[i < 0 ? i + length : i].smooth(
          opts,
          !loop && i === from,
          !loop && i === to
        )
      }
    }
  }

  // Resolve the `from` and `to` options of #smooth() and #simplify() to
  // segment indices. Where a range on a closed path wraps around its end,
  // `from` is negative.
  _getRange(
    from: number | Segment | Curve,
    to: number | Segment | Curve
  ): { from: number; to: number; loop: boolean } {
    const { length } = this._segments
    const closed = this._closed

    // Helper method to pick the right from / to indices.
    // Supports numbers and segment objects.
    // For numbers, the `to` index is exclusive, while for segments and
    // curves, it is inclusive, handled by the `offset` parameter.
    const getIndex = (value: any, _default: number) => {
      // Support both Segment and Curve through #index getter.
      let index = value && value.index
      if (index != null) {
        // Make sure the segment / curve is not from a wrong path.
        const { path } = value
        if (path && path !== this) {
          throw new Error(
            `${value.className} ${index} of ${path} is not part of ${this}`
          )
        }
        // Add offset of 1 to curves to reach their end segment.
        if (_default && value instanceof Curve) {
          index++
        }
      } else {
        index = typeof value === 'number' ? value : _default
      }
      // Negative values count from the end. Ranges on closed paths are
      // allowed to wrap around the beginning/end (e.g. start near the
      // end, end near the beginning), see below, while ranges on open
      // paths stay within the path's open range.
      return Math.min(
        index >= 0
          ? index
          : closed
            ? (index % length + length) % length
            : index + length,
        length - 1
      )
    }

    const loop = closed && from === undefined && to === undefined
    let start = getIndex(from, 0)
    let end = getIndex(to, length - 1)

    if (start > end) {
      if (closed) {
        start -= length
      } else {
        const tmp = start
        start = end
        end = tmp
      }
    }
    return { from: start, to: end, loop }
  }

  // TODO: reduceSegments([flatness])

  /**
   * Attempts to create a new shape item with same geometry as this path item,
   * and inherits all settings from it, similar to {@link Item#clone()}.
   *
   * @param insert specifies whether the new shape should be
   * inserted into the scene graph. When set to `true`, it is inserted above
   * the path item
   * @return the newly created shape item with the same geometry as
   * this path item if it can be matched, `null` otherwise
   * @see Shape#toPath(insert)
   */
  toShape(insert?: boolean): Shape | null {
    if (!this._closed) return null

    const segments = this._segments
    let type: any
    let size: Size
    let radius: Size | number
    let topCenter: Point

    function isCollinear(i: number, j: number) {
      const seg1 = segments[i]
      const seg2 = seg1.next
      const seg3 = segments[j]
      const seg4 = seg3.next
      return (
        seg1._handleOut.isZero() &&
        seg2._handleIn.isZero() &&
        seg3._handleOut.isZero() &&
        seg4._handleIn.isZero() &&
        seg2._point.subtract(seg1._point).isCollinear(
          seg4._point.subtract(seg3._point)
        )
      )
    }

    function isOrthogonal(i: number) {
      const seg2 = segments[i]
      const seg1 = seg2.previous
      const seg3 = seg2.next
      return (
        seg1._handleOut.isZero() &&
        seg2._handleIn.isZero() &&
        seg2._handleOut.isZero() &&
        seg3._handleIn.isZero() &&
        seg2._point.subtract(seg1._point).isOrthogonal(
          seg3._point.subtract(seg2._point)
        )
      )
    }

    function isArc(i: number) {
      const seg1 = segments[i]
      const seg2 = seg1.next
      const handle1 = seg1._handleOut
      const handle2 = seg2._handleIn
      const kappa = KAPPA
      // Look at handle length and the distance to the imaginary corner
      // point and see if it their relation is kappa.
      if (handle1.isOrthogonal(handle2)) {
        const pt1 = seg1._point
        const pt2 = seg2._point
        // Find the corner point by intersecting the lines described
        // by both handles:
        const corner = new Line(pt1, handle1, true).intersect(
          new Line(pt2, handle2, true), true
        )
        return (
          corner &&
          isZero(handle1.length / corner.subtract(pt1).length - kappa) &&
          isZero(handle2.length / corner.subtract(pt2).length - kappa)
        )
      }
      return false
    }

    function getDistance(i: number, j: number) {
      return segments[i]._point.getDistance(segments[j]._point)
    }

    // See if actually have any curves in the path. Differentiate
    // between straight objects (line, polyline, rect, and polygon) and
    // objects with curves(circle, ellipse, roundedRectangle).
    if (
      !this.hasHandles() &&
      segments.length === 4 &&
      isCollinear(0, 2) &&
      isCollinear(1, 3) &&
      isOrthogonal(1)
    ) {
      type = Shape.Rectangle
      size = new Size(getDistance(0, 3), getDistance(0, 1))
      topCenter = segments[1]._point.add(segments[2]._point).divide(2)
    } else if (
      segments.length === 8 &&
      isArc(0) &&
      isArc(2) &&
      isArc(4) &&
      isArc(6) &&
      isCollinear(1, 5) &&
      isCollinear(3, 7)
    ) {
      // It's a rounded rectangle.
      type = Shape.Rectangle
      size = new Size(getDistance(1, 6), getDistance(0, 3))
      // Subtract side lengths from total width and divide by 2 to get the
      // corner radius size.
      radius = size
        .subtract(new Size(getDistance(0, 7), getDistance(1, 2)))
        .divide(2)
      topCenter = segments[3]._point.add(segments[4]._point).divide(2)
    } else if (
      segments.length === 4 &&
      isArc(0) &&
      isArc(1) &&
      isArc(2) &&
      isArc(3)
    ) {
      // If the distance between (point0 and point2) and (point1
      // and point3) are equal, then it is a circle
      if (isZero(getDistance(0, 2) - getDistance(1, 3))) {
        type = Shape.Circle
        radius = getDistance(0, 2) / 2
      } else {
        type = Shape.Ellipse
        radius = new Size(getDistance(2, 0) / 2, getDistance(3, 1) / 2)
      }
      topCenter = segments[1]._point
    }

    if (type) {
      const center = this._getPosition(true)
      const shape = new type({
        center,
        size,
        radius,
        insert: false
      })
      // Pass `true` to exclude the matrix, so we can prepend after
      shape.copyAttributes(this, true)
      shape._matrix.prepend(this._matrix)
      // Determine and apply the shape's angle of rotation.
      shape.rotate(topCenter.subtract(center).angle + 90)
      if (insert !== undefined ? insert : paper.settings.insertItems) {
        shape.insertAbove(this)
      }
      return shape
    }
    return null
  }

  toPath(options?: any): Path {
    return this.clone(options)
  }

  // NOTE: Documentation is in PathItem#compare()
  compare(path: PathItem): boolean {
    let v2: number[]
    let overlaps: number[][]

    // If a compound-path is involved, redirect to PathItem#compare()
    if (!path || path instanceof CompoundPath) return super.compare(path)
    const curves1 = this.curves
    const curves2 = (path as Path).curves
    const length1 = curves1.length
    const length2 = curves2.length
    if (!length1 || !length2) {
      // If one path defines curves and the other doesn't, we can't have
      // matching geometries.
      return length1 == length2
    }
    let v1 = curves1[0].getValues()
    const values2 = []
    let pos1 = 0
    let pos2: number
    let end1 = 0
    let end2: number
    // First, loop through curves2, looking for the start of the overlapping
    // sequence with curves1[0]. Also cache curve values for later reuse.
    for (let i = 0; i < length2; i++) {
      v2 = curves2[i].getValues()
      values2.push(v2)
      overlaps = Curve.getOverlaps(v1, v2)
      if (overlaps) {
        // If the overlap doesn't start at the beginning of v2, then it
        // can only be a partial overlap with curves2[0], and the start
        // will be at curves2[length2 - 1]:
        pos2 = !i && overlaps[0][0] > 0 ? length2 - 1 : i
        // Set end2 to the start of the first overlap on curves2, so
        // connection checks further down can work.
        end2 = overlaps[0][1]
        break
      }
    }
    // Now loop through both curve arrays, find their overlaps, verify that
    // they keep joining, and see if we end back at the start on both paths.
    const abs = Math.abs
    const epsilon = CURVETIME_EPSILON
    v2 = values2[pos2]
    let start2: number[]
    while (v1 && v2) {
      overlaps = Curve.getOverlaps(v1, v2)
      if (overlaps) {
        // Check that the overlaps are joining on curves1.
        const t1 = overlaps[0][0]
        if (abs(t1 - end1) < epsilon) {
          end1 = overlaps[1][0]
          if (end1 === 1) {
            // Skip to the next curve if we're at the end of the
            // current, and set v1 to null if at the end of curves1.
            v1 = ++pos1 < length1 ? curves1[pos1].getValues() : null
            end1 = 0
          }
          // Check that the overlaps are joining on curves2.
          const t2 = overlaps[0][1]
          if (abs(t2 - end2) < epsilon) {
            if (!start2) {
              start2 = [pos2, t2]
            }
            end2 = overlaps[1][1]
            if (end2 === 1) {
              // Wrap pos2 around the end on values2:
              if (++pos2 >= length2) {
                pos2 = 0
              }
              // Reuse cached values from initial search.
              v2 = values2[pos2] || curves2[pos2].getValues()
              end2 = 0
            }
            if (!v1) {
              // We're done with curves1. If we're not back at the
              // start on curve2, the two paths are not identical.
              return start2[0] === pos2 && start2[1] === end2
            }
            // All good, continue to avoid the break; further down.
            continue
          }
        }
      }
      // No overlap match found, break out early.
      break
    }
    return false
  }

  _hitTestSelf(
    point: Point,
    options: any,
    viewMatrix: Matrix,
    strokeMatrix: Matrix
  ): HitResult | HitResult[] | null {
    let i: number
    let l: number

    const { style } = this
    const segments = this._segments
    const numSegments = segments.length
    const closed = this._closed
    // Measure where the stroke is drawn with a round pen: for
    // non-scaling strokes in the view's coordinates, through the
    // inverted strokeMatrix that Item#_hitTest() passes, otherwise in
    // the item's own. Curve times are the same in both (#2334):
    const strokeSpace = strokeMatrix && strokeMatrix.inverted()
    const strokePoint = point.transform(strokeSpace)
    // The tolerance padding in that space, see Item#_hitTest(): for
    // non-scaling strokes, the tolerance of the project in the view's
    // coordinates. The stroke padding is added on top of it below.
    const tolerancePadding = strokeSpace
      ? new Size(
          Matrix._getCircleExtents(
            Math.max(options.tolerance, EPSILON),
            this.view._matrix._shiftless()
          )
        )
      : options._tolerancePadding
    let strokePadding = tolerancePadding
    let join: string
    let cap: string
    let miterLimit: number
    let area: Path
    let loc: CurveLocation
    let res: any
    // When collecting all hits for hitTestAll(), we report every
    // segment and handle in range, not just the first one:
    const hits: HitResult[] = options.all && []
    const hitStroke = options.stroke && style.hasStroke()
    // Transparent fills are hit too, only no fill isn't, as in SVG
    // (#1157):
    const hitFill = options.fill && !!style.fillColor
    const hitCurves = options.curves
    const strokeRadius = hitStroke
      ? style.strokeWidth / 2
      : // Set radius to 0 when we're hit-testing fills with
        // tolerance, to handle tolerance through stroke hit-test
        // functionality. Also use 0 when hit-testing curves.
        hitFill && options.tolerance > 0 || hitCurves
        ? 0
        : null
    if (strokeRadius !== null) {
      if (strokeRadius > 0) {
        join = style.strokeJoin
        cap = style.strokeCap
        miterLimit = style.miterLimit
        // Add the stroke radius to tolerance padding, which is round
        // where the stroke is measured:
        strokePadding = strokePadding.add(strokeRadius)
      } else {
        join = cap = 'round'
      }
      // Using tolerance padding for fill tests will also work if there is
      // no stroke, in which case radius = 0 and we will test for stroke
      // locations to extend the fill area by tolerance.
    }

    // Checks a point where the stroke is measured, see strokeSpace:
    function isCloseEnough(pt: Point, padding: Size) {
      return strokePoint.subtract(pt).divide(padding).length <= 1
    }

    const checkSegmentPoint = (seg: Segment, pt: Point, name: string) => {
      if (!options.selected || pt.selected) {
        const anchor = seg._point
        const position = pt !== anchor ? pt.add(anchor) : pt
        if (isCloseEnough(position.transform(strokeSpace), strokePadding)) {
          const hit = new HitResult(name, this, {
            segment: seg,
            point: position
          })
          if (!hits) return hit
          hits.push(hit)
        }
      }
    }

    function checkSegmentPoints(seg: Segment, ends?: boolean) {
      // Note, when checking for ends, we don't also check for handles,
      // since this will happen afterwards in a separate loop, see below.
      return (
        (
          (ends || options.segments) &&
          checkSegmentPoint(seg, seg._point, 'segment')
        ) || (
          !ends &&
          options.handles && (
            checkSegmentPoint(seg, seg._handleIn, 'handle-in') ||
            checkSegmentPoint(seg, seg._handleOut, 'handle-out')
          )
        )
      )
    }

    // Code to check stroke join / cap areas

    function addToArea(point: Point) {
      area.add(point)
    }

    // Returns the tangent where the curve meets the segment, looking past
    // curves without length, which have no direction:
    function getJoinTangent(curve: Curve, forward: boolean) {
      for (let i = 0; curve && i < numSegments; i++) {
        if (curve.hasLength()) return curve.getTangentAtTime(forward ? 0 : 1)
        curve = forward ? curve.next : curve.previous
      }
    }

    function isFlatJoin(segment: Segment) {
      const { curve } = segment
      const tangent1 = getJoinTangent(curve.previous, false)
      const tangent2 = getJoinTangent(curve, true)
      return (
        tangent1 &&
        tangent2 &&
        tangent1.isCollinear(tangent2) &&
        tangent1.dot(tangent2) > 0
      )
    }

    function checkSegmentStroke(segment: Segment) {
      // Handle joins / caps that are not round specifically, by
      // hit-testing their polygon areas.
      const isJoin = (
        closed ||
        segment._index > 0 && segment._index < numSegments - 1
      )
      // Smooth segments are always joined round, as in addJoin() in
      // getStrokeBounds(), and so are segments where the curves meet in
      // the same direction, such as a line running into a curve, as the
      // join adds nothing there:
      if (
        isJoin && (segment.isSmooth() || isFlatJoin(segment)) ||
        (isJoin ? join : cap) === 'round'
      ) {
        // Round join / cap is easy to handle.
        return isCloseEnough(
          segment._point.transform(strokeSpace),
          strokePadding
        )
      } else {
        // Create an 'internal' path without id and outside the scene
        // graph to run the hit-test on it, where the stroke is
        // measured.
        area = new Path({ internal: true, closed: true })
        if (isJoin) {
          // addBevelJoin() handles both 'bevel' and 'miter'.
          addBevelJoin(
            segment,
            join,
            strokeRadius,
            miterLimit,
            strokeSpace,
            null,
            addToArea,
            true
          )
        } else {
          // addSquareCap() handles both 'square' and 'butt' caps.
          addSquareCap(
            segment,
            cap,
            strokeRadius,
            strokeSpace,
            null,
            addToArea,
            true
          )
        }
        // See if the above produced an area to check for
        if (!area.isEmpty()) {
          // Also use stroke check with tolerancePadding if the point
          // is not inside the area itself, to use test caps and joins
          // with same tolerance.
          let loc: CurveLocation
          return (
            area.contains(strokePoint) || (
              (loc = area.getNearestLocation(strokePoint)) &&
              isCloseEnough(loc.point, tolerancePadding)
            )
          )
        }
      }
    }

    // If we're asked to query for segments, ends or handles, do all that
    // before stroke or fill.
    if (options.ends && !options.segments && !closed) {
      if (
        (res = (
          checkSegmentPoints(segments[0], true) ||
          checkSegmentPoints(segments[numSegments - 1], true)
        ))
      )
        return res
    } else if (options.segments || options.handles) {
      for (i = 0; i < numSegments; i++) {
        if ((res = checkSegmentPoints(segments[i]))) return res
      }
    }
    // If we're querying for stroke, perform that before fill
    if (strokeRadius !== null) {
      // Find the nearest location where the stroke is measured, as
      // PathItem#getNearestLocation() does in the item's coordinates:
      const { curves } = this
      let minDistance = Infinity
      let nearest: Point
      for (i = 0, l = curves.length; i < l; i++) {
        const values = curves[i].getValues(strokeSpace)
        const t = Curve.getNearestTime(values, strokePoint)
        const pt = Curve.getPoint(values, t)
        const distance = pt.getDistance(strokePoint)
        if (distance < minDistance) {
          minDistance = distance
          loc = new CurveLocation(curves[i], t)
          nearest = pt
        }
      }
      // Note that paths need at least two segments to have an actual
      // stroke. But we still check for segments with the radius fallback
      // check if there is only one segment.
      // Stroke profiles are hit within the outline of their stroke:
      const outline = (
        hitStroke &&
        this._hasStrokeProfile() &&
        this._getStrokeOutline()
      )
      if (loc && outline) {
        if (
          !outline.contains(strokePoint) &&
          !isCloseEnough(outline.getNearestPoint(strokePoint), tolerancePadding)
        ) {
          loc = null
        }
      } else if (loc) {
        // Now see if we're on a segment, and if so, check for its
        // stroke join / cap first. If not, do a normal radius check
        // for round strokes.
        const { time } = loc
        if (time === 0 || time === 1 && numSegments > 1) {
          if (!checkSegmentStroke(loc.segment)) {
            loc = null
          }
        } else if (!isCloseEnough(nearest, strokePadding)) {
          loc = null
        }
      }
      // If we have miter joins, we may not be done yet, since they can be
      // longer than the radius. Check for each segment within reach now.
      if (!loc && !outline && join === 'miter' && numSegments > 1) {
        for (i = 0; i < numSegments; i++) {
          const segment = segments[i]
          if (
            (
              strokePoint.getDistance(segment._point.transform(strokeSpace)) <=
              miterLimit * strokeRadius
            ) &&
            checkSegmentStroke(segment)
          ) {
            loc = segment.location
            break
          }
        }
      }
    }
    // Don't process loc yet, as we also need to query for stroke after fill
    // in some cases. Simply skip fill query if we already have a matching
    // stroke. If we have a loc and no stroke then it's a result for fill.
    res =
      (
        !loc && hitFill && this._contains(point) ||
        loc && !hitStroke && !hitCurves
      )
        ? new HitResult('fill', this)
        : loc
          ? new HitResult(hitStroke ? 'stroke' : 'curve', this, {
              location: loc,
              // It's fine performance wise to read the point
              // again since it was already calculated before.
              point: loc.point
            })
          : null
    if (hits) {
      // Report the closest segments and handles first, then the rest:
      hits.sort(
        (hit1, hit2) => (
          hit1.point.getDistance(point) - hit2.point.getDistance(point)
        )
      )
      if (res) {
        hits.push(res)
      }
      return hits
    }
    return res
  }

  // TODO: intersects(item)
  // TODO: contains(item)

  /**
   * {@grouptitle Positions on Paths and Curves}
   *
   * Returns the curve location of the specified point if it lies on the
   * path, `null` otherwise.
   *
   * @param point the point on the path
   * @return the curve location of the specified point
   */
  getLocationOf(point: PointLike | number, y?: number): CurveLocation | null {
    const target = Point.from(point, y)
    const { curves } = this
    for (let i = 0, l = curves.length; i < l; i++) {
      const loc = curves[i].getLocationOf(target)
      if (loc) return loc
    }
    return null
  }

  /**
   * Returns the length of the path from its beginning up to up to the
   * specified point if it lies on the path, `null` otherwise.
   *
   * @param point the point on the path
   * @return the length of the path up to the specified point
   */
  getOffsetOf(point: PointLike | number, y?: number): number | null {
    const loc = this.getLocationOf(point, y)
    return loc ? loc.offset : null
  }

  /**
   * Returns the curve location of the specified offset on the path, or
   * `null` if the offset exceeds the length of the path.
   *
   * @param offset the offset on the path, where `0` is at
   * the beginning of the path and {@link Path#length} at the end
   * @return the curve location at the specified offset
   */
  getLocationAt(offset: number | CurveLocation): CurveLocation | null {
    if (typeof offset === 'number') {
      const { curves } = this
      let length = 0
      for (let i = 0, l = curves.length; i < l; i++) {
        const start = length
        const curve = curves[i]
        length += curve.length
        if (length > offset) {
          // Found the segment within which the length lies
          return curve.getLocationAt(offset - start)
        }
      }
      // It may be that through imprecision of getLength, that the end of
      // the last curve was missed:
      if (curves.length > 0 && offset <= this.length) {
        return new CurveLocation(curves[curves.length - 1], 1)
      }
    } else if (offset instanceof CurveLocation && offset.path === this) {
      // offset is already a CurveLocation on this path, just return it.
      return offset
    }
    return null
  }

  /**
   * Calculates path offsets where the path is tangential to the provided
   * tangent. Note that tangents at the start or end are included. Tangents at
   * segment points are returned even if only one of their handles is
   * collinear with the provided tangent.
   *
   * @param tangent the tangent to which the path must be tangential
   * @return path offsets where the path is tangential to the
   * provided tangent
   */
  getOffsetsWithTangent(tangent: PointLike | number, y?: number): number[] {
    const vector = Point.from(tangent, y)
    if (vector.isZero()) {
      return []
    }

    const offsets = []
    let curveStart = 0
    const { curves } = this
    for (let i = 0, l = curves.length; i < l; i++) {
      const curve = curves[i]
      // Calculate curves times at vector tangent...
      const curveTimes = curve.getTimesWithTangent(vector)
      for (let j = 0, m = curveTimes.length; j < m; j++) {
        // ...and convert them to path offsets...
        const offset = curveStart + curve.getOffsetAtTime(curveTimes[j])
        // ...avoiding duplicates.
        if (offsets.indexOf(offset) < 0) {
          offsets.push(offset)
        }
      }
      curveStart += curve.length
    }
    return offsets
  }

  _draw(
    ctx: CanvasRenderingContext2D,
    param: any,
    viewMatrix: Matrix,
    strokeMatrix: Matrix
  ) {
    const dontPaint = param.dontFinish || param.clip
    if (!param.dontStart) {
      ctx.beginPath()
    }
    if (this.hasFill() || this.hasStroke() || dontPaint) {
      // Prepare the canvas path if we have any situation that
      // requires it to be defined.
      drawSegments(ctx, this, strokeMatrix)
      if (this._closed) {
        ctx.closePath()
      }
    }
    if (!dontPaint) {
      this._paint(ctx, param, viewMatrix, strokeMatrix)
    }
  }

  _drawSelected(ctx: CanvasRenderingContext2D, matrix: Matrix) {
    ctx.beginPath()
    drawSegments(ctx, this, matrix)
    // Now stroke it and draw its handles:
    ctx.stroke()
    const { handleSize, segmentSize } = paper.settings
    // segmentSize is null by default, which falls back on handleSize:
    drawHandles(
      ctx,
      this._segments,
      matrix,
      handleSize,
      segmentSize != null ? segmentSize : handleSize
    )
  }

  // NOTE: Documentation for these methods is found in PathItem, as they
  // are considered abstract methods of PathItem and need to be defined in
  // all implementing classes.

  moveTo(point: PointLike | number, y?: number) {
    // moveTo should only be called at the beginning of paths. But it
    // can ce called again if there is nothing drawn yet, in which case
    // the first segment gets readjusted.
    const segments = this._segments
    if (segments.length === 1) {
      this.removeSegment(0)
    }
    // Let's not be picky about calling moveTo() when not at the
    // beginning of a path, just bail out:
    if (!segments.length) {
      this._add([new Segment(Point.from(point, y))])
    }
  }

  moveBy(/* point, y */): never {
    throw new Error('moveBy() is unsupported on Path items.')
  }

  lineTo(point: PointLike | number, y?: number) {
    // Let's not be picky about calling moveTo() first:
    this._add([new Segment(Point.from(point, y))])
  }

  cubicCurveTo(handle1: PointLike, handle2: PointLike, to: PointLike) {
    const end = Point.from(to)
    // First modify the current segment:
    const current = getCurrentSegment(this)
    // Convert to relative values:
    current.handleOut = Point.from(handle1).subtract(current._point)
    // And add the new segment, with handleIn set to c2
    this._add([new Segment(end, Point.from(handle2).subtract(end))])
  }

  quadraticCurveTo(handle: PointLike, to: PointLike) {
    const control = Point.from(handle)
    const end = Point.from(to)
    const current = getCurrentSegment(this)._point
    // This is exact:
    // If we have the three quad points: A E D,
    // and the cubic is A B C D,
    // B = E + 1/3 (A - E)
    // C = E + 1/3 (D - E)
    this.cubicCurveTo(
      control.add(current.subtract(control).multiply(1 / 3)),
      control.add(end.subtract(control).multiply(1 / 3)),
      end
    )
  }

  curveTo(through: PointLike, to: PointLike, time = 0.5) {
    const end = Point.from(to)
    const t = time
    const t1 = 1 - t
    const current = getCurrentSegment(this)._point
    // handle = (through - (1 - t)^2 * current - t^2 * to) /
    // (2 * (1 - t) * t)
    const handle = Point.from(through)
      .subtract(current.multiply(t1 * t1))
      .subtract(end.multiply(t * t))
      .divide(2 * t * t1)
    if (handle.isNaN()) {
      throw new Error(`Cannot put a curve through points with parameter = ${t}`)
    }
    this.quadraticCurveTo(handle, end)
  }

  arcTo(
    to: PointLike,
    arg?: boolean | PointLike | SizeLike | number,
    rotation?: number,
    clockwise?: boolean | number,
    large?: boolean | number
  ) {
    let through: Point
    let middle: Point
    let center: Point
    let extent: number
    let vector: Point
    let matrix: Matrix

    // Get the start point:
    const abs = Math.abs
    const sqrt = Math.sqrt
    const from = getCurrentSegment(this)._point
    let end = Point.from(to)
    // See if the second argument is clockwise, with true as the default:
    const direction = arg !== undefined ? arg : true
    // We're handling three different approaches to drawing arcs in one
    // large function:
    if (typeof direction === 'boolean') {
      // #1: arcTo(to, clockwise)
      middle = from.add(end).divide(2)
      through = middle.add(
        middle.subtract(from).rotate(direction ? -90 : 90)
      )
    } else if (rotation === undefined) {
      // #2: arcTo(through, to)
      through = end
      end = Point.from(arg as PointLike)
    } else if (!from.equals(end)) {
      // #3: arcTo(to, radius, rotation, clockwise, large)
      // Draw arc in SVG style, but only if `from` and `to` are not
      // equal (#1613).
      const radius = Size.from(arg as SizeLike | number)
      // If rx = 0 or ry = 0 then this arc is treated as a
      // straight line joining the endpoints.
      // NOTE: radius.isZero() would require both values to be 0.
      if (isZero(radius.width) || isZero(radius.height)) {
        return this.lineTo(end)
      }
      // See for an explanation of the following calculations:
      // https://www.w3.org/TR/SVG/implnote.html#ArcImplementationNotes
      const isClockwise = !!clockwise
      const isLarge = !!large
      middle = from.add(end).divide(2)
      const { x, y } = from.subtract(middle).rotate(-rotation)
      let rx = abs(radius.width)
      let ry = abs(radius.height)
      let rxSq = rx * rx
      let rySq = ry * ry
      const xSq = x * x
      const ySq = y * y
      // "...ensure radii are large enough"
      let factor = sqrt(xSq / rxSq + ySq / rySq)
      if (factor > 1) {
        rx *= factor
        ry *= factor
        rxSq = rx * rx
        rySq = ry * ry
      }
      factor = (
        (rxSq * rySq - rxSq * ySq - rySq * xSq) /
        (rxSq * ySq + rySq * xSq)
      )
      if (abs(factor) < EPSILON) {
        factor = 0
      }
      if (factor < 0) {
        throw new Error('Cannot create an arc with the given arguments')
      }
      center = new Point(rx * y / ry, -ry * x / rx)
        // "...where the + sign is chosen if fA != fS,
        // and the - sign is chosen if fA = fS."
        .multiply((isLarge === isClockwise ? -1 : 1) * sqrt(factor))
        .rotate(rotation)
        .add(middle)
      // Now create a matrix that maps the unit circle to the ellipse,
      // for easier construction below.
      matrix = new Matrix().translate(center).rotate(rotation).scale(rx, ry)
      // Transform from and to to the unit circle coordinate space
      // and calculate start vector and extend from there.
      vector = matrix._inverseTransform(from)
      extent = vector.getDirectedAngle(matrix._inverseTransform(end))
      // "...if fS = 0 and extent is > 0, then subtract 360, whereas
      // if fS = 1 and extend is < 0, then add 360."
      if (!isClockwise && extent > 0) {
        extent -= 360
      } else if (isClockwise && extent < 0) {
        extent += 360
      }
    }
    if (through) {
      // Calculate center, vector and extend for non SVG versions:
      // Construct the two perpendicular middle lines to
      // (from, through) and (through, to), and intersect them to get
      // the center.
      const l1 = new Line(
        from.add(through).divide(2),
        through.subtract(from).rotate(90),
        true
      )
      const l2 = new Line(
        through.add(end).divide(2),
        end.subtract(through).rotate(90),
        true
      )
      const line = new Line(from, end)
      const throughSide = line.getSide(through)
      center = l1.intersect(l2, true)
      // If the two lines are collinear, there cannot be an arc as the
      // circle is infinitely big and has no center point. If side is
      // 0, the connecting arc line of this huge circle is a line
      // between the two points, so we can use #lineTo instead.
      // Otherwise we bail out:
      if (!center) {
        if (!throughSide) return this.lineTo(end)
        throw new Error('Cannot create an arc with the given arguments')
      }
      vector = from.subtract(center)
      extent = vector.getDirectedAngle(end.subtract(center))
      const centerSide = line.getSide(center, true)
      if (centerSide === 0) {
        // If the center is lying on the line, we might have gotten
        // the wrong sign for extent above. Use the sign of the side
        // of the through point.
        extent = throughSide * abs(extent)
      } else if (throughSide === centerSide) {
        // If the center is on the same side of the line (from, to)
        // as the through point, we're extending bellow 180 degrees
        // and need to adapt extent.
        extent += extent < 0 ? 360 : -360
      }
    }
    addArc(this, center, vector, extent, end, matrix)
  }

  arcAround(center: PointLike, angle: number) {
    const origin = Point.from(center)
    const vector = getCurrentSegment(this)._point.subtract(origin)
    addArc(this, origin, vector, angle, origin.add(vector.rotate(angle)))
  }

  arcTowards(point: PointLike | number, y?: number) {
    const to = Point.from(point, y)
    const current = getCurrentSegment(this)
    const { previous } = current
    const from = current._point
    const tangent = previous
      ? new Curve(previous, current).getTangentAtTime(1)
      : new Point()
    const normal = tangent.rotate(90)
    const vector = to.subtract(from)
    // The distance of `to` from the tangent, signed by its side:
    const distance = vector.dot(normal)
    if (!isZero(distance)) {
      // The center lies on the normal, as far from `from` as from
      // `to`, and the arc continues in the direction of the tangent:
      const center = from.add(
        normal.multiply(vector.dot(vector) / (2 * distance))
      )
      const start = from.subtract(center)
      let extent = start.getDirectedAngle(to.subtract(center))
      if (extent * distance < 0) {
        extent += distance > 0 ? 360 : -360
      }
      addArc(this, center, start, extent, to)
    } else if (vector.dot(tangent) > 0) {
      this.lineTo(to)
    } else {
      // `to` lies behind, or there is no tangent to continue:
      throw new Error('Cannot create an arc with the given arguments')
    }
  }

  lineBy(point: PointLike | number, y?: number) {
    const current = getCurrentSegment(this)._point
    this.lineTo(current.add(Point.from(point, y)))
  }

  curveBy(through: PointLike, to: PointLike, time?: number) {
    const current = getCurrentSegment(this)._point
    this.curveTo(current.add(through), current.add(to), time)
  }

  cubicCurveBy(handle1: PointLike, handle2: PointLike, to: PointLike) {
    const current = getCurrentSegment(this)._point
    this.cubicCurveTo(
      current.add(handle1),
      current.add(handle2),
      current.add(to)
    )
  }

  quadraticCurveBy(handle: PointLike, to: PointLike) {
    const current = getCurrentSegment(this)._point
    this.quadraticCurveTo(current.add(handle), current.add(to))
  }

  // TODO: Implement version for: (to, radius, rotation, clockwise, large)
  arcBy(point: PointLike, arg?: boolean | PointLike) {
    const current = getCurrentSegment(this)._point
    const to = current.add(point)
    // See if the second argument is clockwise, with true as the default:
    const direction = arg !== undefined ? arg : true
    if (typeof direction === 'boolean') {
      this.arcTo(to, direction)
    } else {
      this.arcTo(to, current.add(direction))
    }
  }

  closePath(tolerance?: number) {
    this.closed = true
    this.join(this, tolerance)
  }

  // A dedicated scope for the tricky bounds calculations
  // We define all the different getBounds functions as static methods on Path
  // and have #_getBounds directly access these. All static bounds functions
  // below have the same first four parameters: segments, closed, path,
  // matrix, so they can be called from #_getBounds() and also be used in
  // Curve. But not all of them use all these parameters, and some define
  // additional ones after.

  _getBounds(matrix: Matrix, options: any): Rectangle {
    const segments = this._segments
    const closed = this._closed
    return options.handle
      ? Path._getSegmentHandleBounds(segments, closed, this, matrix, options)
      : !options.stroke
        ? Path._getSegmentBounds(segments, closed, this, matrix, options)
        : this._hasStrokeProfile()
          ? // Stroke profiles cover the outline of their stroke:
            this._getStrokeOutline().getBounds(matrix)
          : Path._getSegmentStrokeBounds(
              segments,
              closed,
              this,
              matrix,
              options
            )
  }

  /**
   * Returns the bounding rectangle of the item excluding stroke width.
   *
   * @private
   */
  static _getSegmentBounds(
    segments: Segment[],
    closed: boolean,
    path?: Path,
    matrix?: Matrix,
    options?: any,
    strokePadding?: number[]
  ): Rectangle {
    const first = segments[0]
    // If there are no segments, return "empty" rectangle, just like groups,
    // since #bounds is assumed to never return null.
    if (!first) return new Rectangle()
    let coords = new Array(6)
    // Make coordinates for first segment available in prevCoords.
    let prevCoords = first._transformCoordinates(matrix, new Array(6))
    const min = prevCoords.slice(0, 2) // Start with values of first point
    const max = min.slice() // clone
    const roots = new Array(2)

    function processSegment(segment: Segment) {
      segment._transformCoordinates(matrix, coords)
      for (let i = 0; i < 2; i++) {
        Curve._addBounds(
          prevCoords[i], // prev.point
          prevCoords[i + 4], // prev.handleOut
          coords[i + 2], // segment.handleIn
          coords[i], // segment.point,
          i,
          strokePadding ? strokePadding[i] : 0,
          min,
          max,
          roots
        )
      }
      // Swap coordinate buffers.
      const tmp = prevCoords
      prevCoords = coords
      coords = tmp
    }

    for (let i = 1, l = segments.length; i < l; i++) {
      processSegment(segments[i])
    }
    if (closed) {
      processSegment(first)
    }
    return new Rectangle(min[0], min[1], max[0] - min[0], max[1] - min[1])
  }

  /**
   * Returns the bounding rectangle of the item including stroke width.
   *
   * @private
   */
  static _getSegmentStrokeBounds(
    segments: Segment[],
    closed: boolean,
    path: Path,
    matrix?: Matrix,
    options?: any
  ): Rectangle {
    const { style } = path
    const stroke = style.hasStroke()
    const strokeRadius = style.strokeWidth / 2
    const strokeMatrix = stroke && path._getStrokeMatrix(matrix, options)
    const strokePadding = (
      stroke &&
      Matrix._getCircleExtents(strokeRadius, strokeMatrix)
    )
    // Start with normal path bounds with added stroke padding. Then we
    // only need to look at each segment and handle join / cap / miter.
    let bounds = Path._getSegmentBounds(
      segments,
      closed,
      path,
      matrix,
      options,
      strokePadding
    )
    if (!stroke) return bounds
    const join = style.strokeJoin
    const cap = style.strokeCap
    const { miterLimit } = style
    // Create a rectangle of padding size, used for union with bounds
    // further down
    const joinBounds = new Rectangle(new Size(strokePadding).multiply(2))

    // helper function that is passed to addBevelJoin() and addSquareCap()
    // to handle the point transformations.
    function addPoint(point: Point) {
      bounds = bounds.include(point)
    }

    function addRound(segment: Segment) {
      joinBounds.center = segment._point.transform(matrix)
      bounds = bounds.unite(joinBounds)
    }

    function addJoin(segment: Segment, join: string) {
      // When both handles are set in a segment and they are collinear,
      // the join setting is ignored and round is always used.
      if (join === 'round' || segment.isSmooth()) {
        addRound(segment)
      } else {
        // addBevelJoin() handles both 'bevel' and 'miter' joins.
        addBevelJoin(
          segment,
          join,
          strokeRadius,
          miterLimit,
          matrix,
          strokeMatrix,
          addPoint
        )
      }
    }

    function addCap(segment: Segment, cap: string) {
      if (cap === 'round') {
        addRound(segment)
      } else {
        // addSquareCap() handles both 'square' and 'butt' caps.
        addSquareCap(
          segment,
          cap,
          strokeRadius,
          matrix,
          strokeMatrix,
          addPoint
        )
      }
    }

    const length = segments.length - (closed ? 0 : 1)
    if (length > 0) {
      for (let i = 1; i < length; i++) {
        addJoin(segments[i], join)
      }
      if (closed) {
        // Go back to the beginning
        addJoin(segments[0], join)
      } else {
        // Handle caps on open paths
        addCap(segments[0], cap)
        addCap(segments[segments.length - 1], cap)
      }
    }
    return bounds
  }

  /**
   * Returns the bounding rectangle of the item including handles.
   *
   * @private
   */
  static _getSegmentHandleBounds(
    segments: Segment[],
    closed: boolean,
    path: Path,
    matrix?: Matrix,
    options?: any
  ): Rectangle {
    // If there are no segments, return "empty" rectangle, as getBounds().
    if (!segments.length) return new Rectangle()
    const { style } = path
    const stroke = options.stroke && style.hasStroke()
    let strokePadding: number[]
    let joinPadding: number[]
    if (stroke) {
      const strokeMatrix = path._getStrokeMatrix(matrix, options)
      const strokeRadius = style.strokeWidth / 2
      let joinRadius = strokeRadius
      if (style.strokeJoin === 'miter') {
        joinRadius = strokeRadius * style.miterLimit
      }
      if (style.strokeCap === 'square') {
        joinRadius = Math.max(joinRadius, strokeRadius * Math.SQRT2)
      }
      strokePadding = Matrix._getCircleExtents(strokeRadius, strokeMatrix)
      joinPadding = Matrix._getCircleExtents(joinRadius, strokeMatrix)
    }
    const coords = new Array(6)
    let x1 = Infinity
    let x2 = -x1
    let y1 = x1
    let y2 = x2
    for (let i = 0, l = segments.length; i < l; i++) {
      const segment = segments[i]
      segment._transformCoordinates(matrix, coords)
      for (let j = 0; j < 6; j += 2) {
        // Use different padding for points or handles
        const padding = !j ? joinPadding : strokePadding
        const paddingX = padding ? padding[0] : 0
        const paddingY = padding ? padding[1] : 0
        const x = coords[j]
        const y = coords[j + 1]
        const xn = x - paddingX
        const xx = x + paddingX
        const yn = y - paddingY
        const yx = y + paddingY
        if (xn < x1) {
          x1 = xn
        }
        if (xx > x2) {
          x2 = xx
        }
        if (yn < y1) {
          y1 = yn
        }
        if (yx > y2) {
          y2 = yx
        }
      }
    }
    return new Rectangle(x1, y1, x2 - x1, y2 - y1)
  }

  // The outline of the path's stroke in its own coordinates, with its
  // dashes, kept until its geometry or its stroke changes, see
  // #_changed(). Paths with a stroke profile draw, bound and hit-test
  // their stroke with it:
  _getStrokeOutline(): PathItem {
    return (this._strokeOutline ||= getStrokeOutline(this))
  }

  static {
    defineConstructors(this)
    defineStrokeProfile(this)
    Object.assign(this.prototype, {
      _serializeFields: {
        ...PathItem.prototype._serializeFields,
        segments: [],
        closed: false,
        strokeProfile: null
      },
      // The offsets of the stroke profile lie on the segments, so set those
      // first:
      _prioritize: ['applyMatrix', 'segments', 'closed']
    })

    // Inject the evaluators at path offsets, through the curve locations.
    // NOTE: (For easier searching): This loop produces:
    // getPointAt, getTangentAt, getNormalAt, getWeightedTangentAt,
    // getWeightedNormalAt, getCurvatureAt
    for (const key of curveEvaluations) {
      inject(this.prototype, {
        [`get${capitalize(key)}At`](offset: number | CurveLocation) {
          const location = this.getLocationAt(offset)
          return location && location[key]
        }
      })
    }
  }
}

// The members defined at runtime rather than in the class body:
export interface Path {
  /**
   * Specifies whether an path is selected and will also return `true` if the
   * path is partially selected, i.e. one or more of its segments is selected.
   *
   * Paper.js draws the visual outlines of selected items on top of your
   * project. This can be useful for debugging, as it allows you to see the
   * construction of paths, position of path curves, individual segment points
   * and bounding boxes of symbol and raster items.
   *
   * @see Project#selectedItems
   * @see Segment#selected
   * @see Point#selected
   *
   * @example {@paperscript}
   * // Selecting an item:
   * var path = new Path.Circle({
   *     center: [80, 50],
   *     radius: 35
   * });
   * path.selected = true; // Select the path
   *
   * @example {@paperscript}
   * // A path is selected, if one or more of its segments is selected:
   * var path = new Path.Circle({
   *     center: [80, 50],
   *     radius: 35
   * });
   *
   * // Select the second segment of the path:
   * path.segments[1].selected = true;
   *
   * // If the path is selected (which it is), set its fill color to red:
   * if (path.selected) {
   *     path.fillColor = 'red';
   * }
   *
   */
  get selected(): boolean
  set selected(selected: boolean)

  /**
   * Calculates the point on the path at the given offset.
   *
   * @param offset the offset on the path, where `0` is at
   * the beginning of the path and {@link Path#length} at the end
   * @return the point at the given offset
   *
   * @example {@paperscript height=150}
   * // Finding the point on a path at a given offset:
   *
   * // Create an arc shaped path:
   * var path = new Path({
   *     strokeColor: 'black'
   * });
   *
   * path.add(new Point(40, 100));
   * path.arcTo(new Point(150, 100));
   *
   * // We're going to be working with a third of the length
   * // of the path as the offset:
   * var offset = path.length / 3;
   *
   * // Find the point on the path:
   * var point = path.getPointAt(offset);
   *
   * // Create a small circle shaped path at the point:
   * var circle = new Path.Circle({
   *     center: point,
   *     radius: 3,
   *     fillColor: 'red'
   * });
   *
   * @example {@paperscript height=150}
   * // Iterating over the length of a path:
   *
   * // Create an arc shaped path:
   * var path = new Path({
   *     strokeColor: 'black'
   * });
   *
   * path.add(new Point(40, 100));
   * path.arcTo(new Point(150, 100));
   *
   * var amount = 5;
   * var length = path.length;
   * for (var i = 0; i < amount + 1; i++) {
   *     var offset = i / amount * length;
   *
   *     // Find the point on the path at the given offset:
   *     var point = path.getPointAt(offset);
   *
   *     // Create a small circle shaped path at the point:
   *     var circle = new Path.Circle({
   *         center: point,
   *         radius: 3,
   *         fillColor: 'red'
   *     });
   * }
   */
  getPointAt(offset: number | CurveLocation): Point

  /**
   * Calculates the normalized tangent vector of the path at the given offset.
   *
   * @param offset the offset on the path, where `0` is at
   * the beginning of the path and {@link Path#length} at the end
   * @return the normalized tangent vector at the given offset
   *
   * @example {@paperscript height=150}
   * // Working with the tangent vector at a given offset:
   *
   * // Create an arc shaped path:
   * var path = new Path({
   *     strokeColor: 'black'
   * });
   *
   * path.add(new Point(40, 100));
   * path.arcTo(new Point(150, 100));
   *
   * // We're going to be working with a third of the length
   * // of the path as the offset:
   * var offset = path.length / 3;
   *
   * // Find the point on the path:
   * var point = path.getPointAt(offset);
   *
   * // Find the tangent vector at the given offset
   * // and give it a length of 60:
   * var tangent = path.getTangentAt(offset) * 60;
   *
   * var line = new Path({
   *     segments: [point, point + tangent],
   *     strokeColor: 'red'
   * })
   *
   * @example {@paperscript height=200}
   * // Iterating over the length of a path:
   *
   * // Create an arc shaped path:
   * var path = new Path({
   *     strokeColor: 'black'
   * });
   *
   * path.add(new Point(40, 100));
   * path.arcTo(new Point(150, 100));
   *
   * var amount = 6;
   * var length = path.length;
   * for (var i = 0; i < amount + 1; i++) {
   *     var offset = i / amount * length;
   *
   *     // Find the point on the path at the given offset:
   *     var point = path.getPointAt(offset);
   *
   *     // Find the tangent vector on the path at the given offset
   *     // and give it a length of 60:
   *     var tangent = path.getTangentAt(offset) * 60;
   *
   *     var line = new Path({
   *         segments: [point, point + tangent],
   *         strokeColor: 'red'
   *     })
   * }
   */
  getTangentAt(offset: number | CurveLocation): Point

  /**
   * Calculates the normal vector of the path at the given offset.
   *
   * @param offset the offset on the path, where `0` is at
   * the beginning of the path and {@link Path#length} at the end
   * @return the normal vector at the given offset
   *
   * @example {@paperscript height=150}
   * // Working with the normal vector at a given offset:
   *
   * // Create an arc shaped path:
   * var path = new Path({
   *     strokeColor: 'black'
   * });
   *
   * path.add(new Point(40, 100));
   * path.arcTo(new Point(150, 100));
   *
   * // We're going to be working with a third of the length
   * // of the path as the offset:
   * var offset = path.length / 3;
   *
   * // Find the point on the path:
   * var point = path.getPointAt(offset);
   *
   * // Find the normal vector on the path at the given offset
   * // and give it a length of 30:
   * var normal = path.getNormalAt(offset) * 30;
   *
   * var line = new Path({
   *     segments: [point, point + normal],
   *     strokeColor: 'red'
   * });
   *
   * @example {@paperscript height=200}
   * // Iterating over the length of a path:
   *
   * // Create an arc shaped path:
   * var path = new Path({
   *     strokeColor: 'black'
   * });
   *
   * path.add(new Point(40, 100));
   * path.arcTo(new Point(150, 100));
   *
   * var amount = 10;
   * var length = path.length;
   * for (var i = 0; i < amount + 1; i++) {
   *     var offset = i / amount * length;
   *
   *     // Find the point on the path at the given offset:
   *     var point = path.getPointAt(offset);
   *
   *     // Find the normal vector on the path at the given offset
   *     // and give it a length of 30:
   *     var normal = path.getNormalAt(offset) * 30;
   *
   *     var line = new Path({
   *         segments: [point, point + normal],
   *         strokeColor: 'red'
   *     });
   * }
   */
  getNormalAt(offset: number | CurveLocation): Point

  /**
   * Calculates the weighted tangent vector of the path at the given offset.
   *
   * @param offset the offset on the path, where `0` is at
   * the beginning of the path and {@link Path#length} at the end
   * @return the weighted tangent vector at the given offset
   */
  getWeightedTangentAt(offset: number | CurveLocation): Point

  /**
   * Calculates the weighted normal vector of the path at the given offset.
   *
   * @param offset the offset on the path, where `0` is at
   * the beginning of the path and {@link Path#length} at the end
   * @return the weighted normal vector at the given offset
   */
  getWeightedNormalAt(offset: number | CurveLocation): Point

  /**
   * Calculates the curvature of the path at the given offset. Curvatures
   * indicate how sharply a path changes direction. A straight line has zero
   * curvature, where as a circle has a constant curvature. The path's radius
   * at the given offset is the reciprocal value of its curvature.
   *
   * @param offset the offset on the path, where `0` is at
   * the beginning of the path and {@link Path#length} at the end
   * @return the normal vector at the given offset
   */
  getCurvatureAt(offset: number | CurveLocation): number
}

// Converts a segment description to a segment, as the array forms of JSON and
// the constructors describe them: `[x, y]` for a point, and `[point, handleIn,
// handleOut, selection]` for a segment with handles.
function readSegments(list: any[], start = 0, end = list.length): Segment[] {
  const segments = new Array(end - start)
  for (let i = start; i < end; i++) {
    segments[i - start] = Segment.from(list[i])
  }
  return segments
}

// Note that in the drawing code below we're often accessing _x and _y on
// point objects that were read from segments. This is because the
// SegmentPoint class overrides the plain x / y properties with getter /
// setters and stores the values in these private properties internally. To
// avoid calling of getter functions all the time we directly access these
// private properties here. The distinction between normal Point objects and
// SegmentPoint objects maybe seem a bit tedious but is worth the benefit in
// performance.

function drawHandles(
  ctx: CanvasRenderingContext2D,
  segments: Segment[],
  matrix: Matrix,
  handleSize: number,
  segmentSize: number
) {
  // Only draw the handles and segments whose size is positive.
  const handleHalf = handleSize / 2
  const half = segmentSize / 2
  const miniSize = segmentSize - 2
  const miniHalf = half - 1
  const coords = new Array(6)
  let pX: number
  let pY: number

  function drawHandle(index: number) {
    const hX = coords[index]
    const hY = coords[index + 1]
    if (handleSize > 0 && (pX != hX || pY != hY)) {
      ctx.beginPath()
      ctx.moveTo(pX, pY)
      ctx.lineTo(hX, hY)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(hX, hY, handleHalf, 0, Math.PI * 2, true)
      ctx.fill()
    }
  }

  for (let i = 0, l = segments.length; i < l; i++) {
    const segment = segments[i]
    const selection = segment._selection
    segment._transformCoordinates(matrix, coords)
    pX = coords[0]
    pY = coords[1]
    if (selection & SegmentSelection.HANDLE_IN) {
      drawHandle(2)
    }
    if (selection & SegmentSelection.HANDLE_OUT) {
      drawHandle(4)
    }
    if (segmentSize > 0) {
      // Draw a rectangle at segment.point:
      ctx.fillRect(pX - half, pY - half, segmentSize, segmentSize)
      // If the point is not selected, draw a white square that is 1px
      // smaller on all sides, but only draw it if size is big enough.
      if (miniSize > 0 && !(selection & SegmentSelection.POINT)) {
        const { fillStyle } = ctx
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(pX - miniHalf, pY - miniHalf, miniSize, miniSize)
        ctx.fillStyle = fillStyle
      }
    }
  }
}

function drawSegments(
  ctx: CanvasRenderingContext2D,
  path: Path,
  matrix: Matrix
) {
  const segments = path._segments
  const { length } = segments
  const coords = new Array(6)
  let first = true
  let curX: number
  let curY: number
  let prevX: number
  let prevY: number
  let inX: number
  let inY: number
  let outX: number
  let outY: number

  function drawSegment(segment: Segment) {
    let handle: SegmentPoint

    // Optimise code when no matrix is provided by accessing segment
    // points hand handles directly, since this is the default when
    // drawing paths. Matrix is only used for drawing selections and
    // when #strokeScaling is false.
    if (matrix) {
      segment._transformCoordinates(matrix, coords)
      curX = coords[0]
      curY = coords[1]
    } else {
      const point = segment._point
      curX = point._x
      curY = point._y
    }
    if (first) {
      ctx.moveTo(curX, curY)
      first = false
    } else {
      if (matrix) {
        inX = coords[2]
        inY = coords[3]
      } else {
        handle = segment._handleIn
        inX = curX + handle._x
        inY = curY + handle._y
      }
      if (inX === curX && inY === curY && outX === prevX && outY === prevY) {
        ctx.lineTo(curX, curY)
      } else {
        ctx.bezierCurveTo(outX, outY, inX, inY, curX, curY)
      }
    }
    prevX = curX
    prevY = curY
    if (matrix) {
      outX = coords[4]
      outY = coords[5]
    } else {
      handle = segment._handleOut
      outX = prevX + handle._x
      outY = prevY + handle._y
    }
  }

  for (let i = 0; i < length; i++) {
    drawSegment(segments[i])
  }
  // Close path by drawing first segment again
  if (path._closed && length > 0) {
    drawSegment(segments[0])
  }
}

/**
 * Helper method that returns the current segment and checks if a moveTo()
 * command is required first.
 */
function getCurrentSegment(path: Path): Segment {
  const segments = path._segments
  if (!segments.length) throw new Error('Use a moveTo() command first')
  return segments[segments.length - 1]
}

/**
 * Helper method that adds an arc of `extent` degrees around `center`, from
 * the current segment at `vector` from `center` to `to`. The optional
 * `matrix` maps `center` and `vector` from the unit circle to an ellipse.
 */
function addArc(
  path: Path,
  center: Point,
  vector: Point,
  extent: number,
  to: Point,
  matrix?: Matrix
) {
  const current = getCurrentSegment(path)
  const epsilon = ANGULAR_EPSILON
  // Calculate amount of segments required to approximate over
  // `extend` degrees (extend / 90), but prevent ceil() from
  // rounding up small imprecisions by subtracting epsilon.
  const count = Math.ceil((Math.abs(extent) - epsilon) / 90)
  if (count) {
    const inc = extent / count
    const half = inc * Math.PI / 360
    const z = 4 / 3 * Math.sin(half) / (1 + Math.cos(half))
    const segments = []
    for (let i = 0; i <= count; i++) {
      // Explicitly use to point for last segment, since depending
      // on values the calculation adds imprecision:
      let point = to
      let handleOut = null
      if (i < count) {
        handleOut = vector.rotate(90).multiply(z)
        if (matrix) {
          point = matrix._transformPoint(vector)
          handleOut = matrix
            ._transformPoint(vector.add(handleOut))
            .subtract(point)
        } else {
          point = center.add(vector)
        }
      }
      if (!i) {
        // Modify startSegment
        current.handleOut = handleOut
      } else {
        // Add new Segment
        let handleIn = vector.rotate(-90).multiply(z)
        if (matrix) {
          handleIn = matrix
            ._transformPoint(vector.add(handleIn))
            .subtract(point)
        }
        segments.push(new Segment(point, handleIn, handleOut))
      }
      vector = vector.rotate(inc)
    }
    // Add all segments at once at the end for higher performance
    path._add(segments)
  } else if (extent && !to.equals(current._point)) {
    // Arcs too small to approximate are straight:
    path.lineTo(to)
  }
}

/**
 * Returns the normal of the curve at the given time with the length of the
 * stroke's radius, in the space where the stroke is drawn with a round pen,
 * from the curve's tangent transformed into it, as the matrices don't
 * preserve angles (#2065). For strokes that scale with the matrix, this is
 * the curve's own space.
 */
function getStrokeNormal(
  curve: Curve,
  time: number,
  radius: number,
  matrix: Matrix,
  strokeMatrix: Matrix
): Point {
  const shiftless = matrix ? matrix._shiftless() : new Matrix()
  const inverse = strokeMatrix && strokeMatrix.inverted()
  const tangent = curve
    .getTangentAtTime(time)
    .transform(inverse ? inverse.append(shiftless) : shiftless)
  return new Point(tangent.y, -tangent.x).normalize(radius)
}

function addBevelJoin(
  segment: Segment,
  join: string,
  radius: number,
  miterLimit: number,
  matrix: Matrix,
  strokeMatrix: Matrix,
  addPoint: (point: Point) => void,
  isArea?: boolean
) {
  // Handles both 'bevel' and 'miter' joins, as they share a lot of code,
  // using different matrices to transform segment points and stroke
  // vectors to support Style#strokeScaling. The join is constructed
  // where the stroke is drawn, see getStrokeNormal(), and its vectors
  // transformed from there.
  const curve2 = segment.curve
  const curve1 = curve2.previous
  const point = curve2.point1.transform(matrix)
  let normal1 = getStrokeNormal(curve1, 1, radius, matrix, strokeMatrix)
  let normal2 = getStrokeNormal(curve2, 0, radius, matrix, strokeMatrix)
  const angle = normal1.getDirectedAngle(normal2)
  if (angle < 0 || angle >= 180) {
    normal1 = normal1.negate()
    normal2 = normal2.negate()
  }
  if (isArea) {
    addPoint(point)
  }
  addPoint(point.add(normal1.transform(strokeMatrix)))
  if (join === 'miter') {
    // Intersect the two lines
    const corner = new Line(
      normal1,
      new Point(-normal1.y, normal1.x),
      true
    ).intersect(new Line(normal2, new Point(-normal2.y, normal2.x), true), true)
    // See if we actually get a bevel point and if its distance is below
    // the miterLimit. If not, make a normal bevel.
    if (corner && corner.length <= miterLimit * radius) {
      addPoint(point.add(corner.transform(strokeMatrix)))
    }
  }
  // Produce a normal bevel
  addPoint(point.add(normal2.transform(strokeMatrix)))
}

function addSquareCap(
  segment: Segment,
  cap: string,
  radius: number,
  matrix: Matrix,
  strokeMatrix: Matrix,
  addPoint: (point: Point) => void,
  isArea?: boolean
) {
  // Handles both 'square' and 'butt' caps, as they share a lot of code.
  // Calculate the corner points of butt and square caps, using different
  // matrices to transform segment points and stroke vectors to support
  // Style#strokeScaling.
  let point = segment._point.transform(matrix)
  const loc = segment.location
  const { time } = loc
  // Checking the time for 0 is to see whether this is the first or
  // the last segment of the open path, in order to determine in which
  // direction to flip the normal.
  const vector = getStrokeNormal(
    loc.curve,
    time,
    time === 0 ? radius : -radius,
    matrix,
    strokeMatrix
  )
  const normal = vector.transform(strokeMatrix)
  // For square caps, we need to step away from point in the direction of
  // the tangent, which is the normal rotated before transforming it, as
  // the matrices don't preserve angles (#2065).
  if (cap === 'square') {
    if (isArea) {
      addPoint(point.subtract(normal))
      addPoint(point.add(normal))
    }
    point = point.add(vector.rotate(-90).transform(strokeMatrix))
  }
  addPoint(point.add(normal))
  addPoint(point.subtract(normal))
}
