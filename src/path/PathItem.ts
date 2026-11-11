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
  Change,
  CompoundPath,
  Curve,
  EPSILON,
  GEOMETRIC_EPSILON,
  Item,
  Path,
  Point,
  Segment,
  Size,
  closePaths,
  createGraph,
  createResult,
  dashPathItem,
  findItemBoundsCollisions,
  getEpsilon,
  getInteriorPoint,
  getOperands,
  getWinding,
  isPlainObject,
  offsetPathItem,
  outlinePathItem,
  reorientPaths,
  splitBoolean,
  traceBoolean,
  tracePaths
} from '../internal.ts'
import type { PointLike } from '../basic/Point.ts'
import type { SizeLike } from '../basic/Size.ts'
import type { Matrix } from '../basic/Matrix.ts'
import type { CurveLocation } from './CurveLocation.ts'
import type { SegmentLike } from './Segment.ts'
import type { BooleanOptions, Graph, Winding } from './boolean.ts'
import type { Group } from '../item/Group.ts'
import type {
  DashOptions,
  OffsetOptions,
  OutlineOptions
} from './offset.ts'

/**
 * The PathItem class is the base for any items that describe paths and
 * offer standardised methods for drawing and path manipulation, such as
 * {@link Path} and {@link CompoundPath}.
 */
export abstract class PathItem extends Item {
  // Scale the stroke with the matrix that is applied to the content, when
  // settings.scaleStrokes asks for it:
  _scaleStroke(matrix: Matrix) {
    const style = this._style
    if (this._project._scope.settings.scaleStrokes && style.strokeScaling) {
      style.strokeWidth *= matrix._getMeanScale()
    }
  }

  /**
   * Creates a path item from the given SVG path-data, determining if the
   * data describes a plain path or a compound-path with multiple
   * sub-paths.
   *
   * @param pathData the SVG path-data to parse
   * @return the newly created path item
   */
  static create(pathData: string): Path | CompoundPath
  /**
   * Creates a path item from the given segments array, determining if the
   * array describes a plain path or a compound-path with multiple
   * sub-paths.
   *
   * @param segments the segments array to parse
   * @return the newly created path item
   */
  static create(segments: SegmentLike[] | SegmentLike[][]): Path | CompoundPath
  /**
   * Creates a path item from the given object, determining if the
   * contained information describes a plain path or a compound-path with
   * multiple sub-paths.
   *
   * @param object an object containing the properties describing
   *     the item to be created
   * @return the newly created path item
   */
  static create(object: object): Path | CompoundPath
  static create(arg: any): Path | CompoundPath {
    let data: string
    let segments: any[]
    let compound: boolean
    if (isPlainObject(arg)) {
      segments = arg.segments
      data = arg.pathData
    } else if (Array.isArray(arg)) {
      segments = arg
    } else if (typeof arg === 'string') {
      data = arg
    }
    if (segments) {
      const first = segments[0]
      compound = first && Array.isArray(first[0])
    } else if (data) {
      // If there are multiple moveTo commands or a closePath command
      // followed by other commands, we have a CompoundPath.
      compound = (
        (data.match(/m/gi) ?? []).length > 1 ||
        /z\s*\S+/i.test(data)
      )
    }
    const ctor = compound ? CompoundPath : Path
    return new ctor(arg)
  }

  _asPathItem(): PathItem {
    // See Item#_asPathItem()
    return this
  }

  /**
   * Specifies whether the path as a whole is oriented clock-wise, by looking
   * at the path's area.
   * Note that self-intersecting paths and sub-paths of different orientation
   * can result in areas that cancel each other out.
   *
   * @see Path#area
   * @see CompoundPath#area
   */
  get clockwise(): boolean {
    return this.area >= 0
  }

  set clockwise(clockwise: boolean) {
    // Only revers the path if its clockwise orientation is not the same
    // as what it is now demanded to be.
    if (this.clockwise !== !!clockwise) {
      this.reverse()
    }
  }

  /**
   * The path's geometry, formatted as SVG style path data.
   */
  get pathData(): string {
    return this._getPathData()
  }

  set pathData(data: string) {
    // This is a very compact SVG Path Data parser that works both for Path
    // and CompoundPath.

    // First split the path data into parts of command-coordinates pairs
    // Commands are any of these characters: mzlhvcsqta
    const parts = data?.match(/[mlhvcsqtaz][^mlhvcsqtaz]*/gi)
    let coords: string[]
    let relative = false
    let previous: string
    let control: Point
    let current = new Point()
    let start = new Point()
    const number = '([+-]?(?:\\d*\\.\\d+|\\d+\\.?)(?:[eE][+-]?\\d+)?)'
    const numbers = new RegExp(number, 'g')
    // The arc flags are single characters that don't need to be
    // separated from what follows, e.g. 'a1 1 0 011 1', see #1808:
    const flag = '([01])'
    const arcs = new RegExp(
      [number, number, number, flag, flag, number, number].join('[\\s,]*'),
      'g'
    )

    const getCoord = (index: number, coord: 'x' | 'y') => {
      const value = +coords[index]
      return relative ? value + current[coord] : value
    }

    const getPoint = (index: number) =>
      new Point(getCoord(index, 'x'), getCoord(index + 1, 'y'))

    // First clear the previous content
    this.clear()

    for (const part of parts ?? []) {
      const command = part[0]
      const lower = command.toLowerCase()
      // Match all coordinate values
      coords = part.match(numbers)
      const length = coords?.length
      relative = command === lower
      // Fix issues with z in the middle of SVG path data, not followed by
      // a m command, see #413:
      if (previous === 'z' && !/[mz]/.test(lower)) {
        this.moveTo(current)
      }
      switch (lower) {
        case 'm':
        case 'l': {
          let move = lower === 'm'
          for (let i = 0; i < length; i += 2) {
            this[move ? 'moveTo' : 'lineTo']((current = getPoint(i)))
            if (move) {
              start = current
              move = false
            }
          }
          control = current
          break
        }
        case 'h':
        case 'v': {
          const coord = lower === 'h' ? 'x' : 'y'
          current = current.clone() // Clone as we're going to modify it.
          for (let i = 0; i < length; i++) {
            current[coord] = getCoord(i, coord)
            this.lineTo(current)
          }
          control = current
          break
        }
        case 'c':
          for (let i = 0; i < length; i += 6) {
            this.cubicCurveTo(
              getPoint(i),
              (control = getPoint(i + 2)),
              (current = getPoint(i + 4))
            )
          }
          break
        case 's':
          // Smooth cubicCurveTo
          for (let i = 0; i < length; i += 4) {
            this.cubicCurveTo(
              /[cs]/.test(previous)
                ? current.multiply(2).subtract(control)
                : current,
              (control = getPoint(i)),
              (current = getPoint(i + 2))
            )
            previous = lower
          }
          break
        case 'q':
          for (let i = 0; i < length; i += 4) {
            this.quadraticCurveTo(
              (control = getPoint(i)),
              (current = getPoint(i + 2))
            )
          }
          break
        case 't':
          // Smooth quadraticCurveTo
          for (let i = 0; i < length; i += 2) {
            this.quadraticCurveTo(
              (control = /[qt]/.test(previous)
                ? current.multiply(2).subtract(control)
                : current),
              (current = getPoint(i))
            )
            previous = lower
          }
          break
        case 'a':
          while ((coords = arcs.exec(part))) {
            this.arcTo(
              (current = getPoint(6)),
              new Size(+coords[1], +coords[2]),
              +coords[3],
              coords[5] === '1',
              coords[4] === '1'
            )
          }
          break
        case 'z':
          // Merge first and last segment with EPSILON tolerance to address
          // imprecisions in relative SVG data.
          this.closePath(EPSILON)
          // Correctly handle relative m commands, see #1101:
          current = start
          break
      }
      previous = lower
    }
  }

  // NOTE: #_getPathData() is defined in CompoundPath / Path
  abstract _getPathData(_matrix?: Matrix, _precision?: number): string

  _canComposite(): boolean {
    // A path with only a fill or a stroke can be directly blended, but if
    // it has both, it needs to be drawn into a separate canvas first.
    return !(this.hasFill() && this.hasStroke())
  }

  _contains(point: Point): boolean {
    // NOTE: point is reverse transformed by _matrix, so we don't need to
    // apply the matrix here.
    // Check the transformed point against the untransformed (internal)
    // handle bounds, which is the fastest rough bounding box to calculate
    // for a quick check before calculating the actual winding.
    const winding: Partial<Winding> = point.isInside(
      this.getBounds(null, { internal: true, handle: true })
    )
      ? getWinding(point, this.curves)
      : {}
    // See #1116#issuecomment-243794824 for an explanation of the
    // winding.onPath check here.
    return (
      winding.onPath ||
      !!(
        this.fillRule === 'evenodd'
          ? winding.windingL & 1 || winding.windingR & 1
          : winding.winding
      )
    )
  }

  /**
   * {@grouptitle Path Intersections and Locations}
   *
   * Returns all intersections between two {@link PathItem} items as an array
   * of {@link CurveLocation} objects. {@link CompoundPath} items are also
   * supported.
   *
   * @param path the other item to find the intersections with
   * @param include a callback function that can be used to
   *     filter out undesired locations right while they are collected. When
   *     defined, it shall return {@true to include a location}.
   * @return the locations of all intersection between the
   *     paths
   * @see #getCrossings(path)
   * @example {@paperscript} // Finding the intersections between two paths
   * var path = Path.rectangle(new Point(30, 25), new Size(50, 50));
   * path.strokeColor = 'black';
   *
   * var secondPath = path.clone();
   * var intersectionGroup = new Group();
   *
   * function onFrame(event) {
   *     secondPath.rotate(1);
   *
   *     var intersections = path.getIntersections(secondPath);
   *     intersectionGroup.removeChildren();
   *
   *     for (var i = 0; i < intersections.length; i++) {
   *         var intersectionPath = Path.circle({
   *             center: intersections[i].point,
   *             radius: 4,
   *             fillColor: 'red',
   *             parent: intersectionGroup
   *         });
   *     }
   * }
   */
  getIntersections(
    path?: PathItem,
    include?: (location: CurveLocation) => boolean,
    _matrix?: Matrix,
    _returnFirst?: boolean
  ): CurveLocation[] {
    // NOTE: For self-intersection, path is null. This means you can also
    // just call path.getIntersections() without an argument to get self
    // intersections.
    // NOTE: The hidden argument _matrix is used internally to override the
    // passed path's transformation matrix.
    const self = this === path || !path // self-intersections?
    const matrix1 = this._matrix._orNullIfIdentity()
    const matrix2 = self
      ? matrix1
      : (_matrix ?? path._matrix)._orNullIfIdentity()
    // First check the bounds of the two paths. If they don't intersect,
    // we don't need to iterate through their curves. Bounds that only
    // touch need a tolerance, also at large coordinates:
    const bounds1 = !self && this.getBounds(matrix1)
    const bounds2 = !self && path.getBounds(matrix2)
    const { abs } = Math
    return (
      self ||
      bounds1.intersects(
        bounds2,
        getEpsilon(
          Math.max(
            abs(bounds1.left),
            abs(bounds1.right),
            abs(bounds1.top),
            abs(bounds1.bottom),
            abs(bounds2.left),
            abs(bounds2.right),
            abs(bounds2.top),
            abs(bounds2.bottom)
          )
        )
      )
    )
      ? Curve.getIntersections(
          this.curves, self ? null : path.curves, include,
          matrix1, matrix2, _returnFirst
        )
      : []
  }

  /**
   * Returns all crossings between two {@link PathItem} items as an array of
   * {@link CurveLocation} objects. {@link CompoundPath} items are also
   * supported. Crossings are intersections where the paths actually are
   * crossing each other, as opposed to simply touching.
   *
   * @param path the other item to find the crossings with
   * @return the locations of all crossings between the
   *     paths
   * @see #getIntersections(path)
   */
  getCrossings(path: PathItem): CurveLocation[] {
    return this.getIntersections(path, location => location.isCrossing())
  }

  /**
   * Returns the nearest location on the path item to the specified point.
   *
   * @param point the point for which we search the nearest location
   * @return the location on the path that's the closest to
   * the specified point
   */
  getNearestLocation(point: PointLike | number, y?: number): CurveLocation {
    const target = Point.from(point, y)
    let minDistance = Infinity
    let minLocation = null
    for (const curve of this.curves) {
      const location = curve.getNearestLocation(target)
      if (location._distance < minDistance) {
        minDistance = location._distance
        minLocation = location
      }
    }
    return minLocation
  }

  /**
   * Returns the nearest point on the path item to the specified point.
   *
   * @param point the point for which we search the nearest point
   * @return the point on the path that's the closest to the specified
   * point
   *
   * @example {@paperscript height=200}
   * var star = Path.star({
   *     center: view.center,
   *     points: 10,
   *     radius1: 30,
   *     radius2: 60,
   *     strokeColor: 'black'
   * });
   *
   * var circle = Path.circle({
   *     center: view.center,
   *     radius: 3,
   *     fillColor: 'red'
   * });
   *
   * function onMouseMove(event) {
   *     // Get the nearest point from the mouse position
   *     // to the star shaped path:
   *     var nearestPoint = star.getNearestPoint(event.point);
   *
   *     // Move the red circle to the nearest point:
   *     circle.position = nearestPoint;
   * }
   */
  getNearestPoint(point: PointLike | number, y?: number): Point {
    const location = this.getNearestLocation(point, y)
    return location?.point ?? null
  }

  /**
   * {@grouptitle Path Manipulation}
   *
   * Reverses the orientation of the path item. When called on
   * {@link CompoundPath} items, each of the nested paths is reversed. On
   * {@link Path} items, the sequence of {@link Path#segments} is reversed.
   */
  abstract reverse(): void

  /**
   * Flattens the curves in path items to a sequence of straight lines, by
   * subdividing them enough times until the specified maximum error is met.
   *
   * @param flatness the maximum error between the flattened
   *     lines and the original curves
   *
   * @example {@paperscript}
   * // Flattening a circle shaped path:
   *
   * // Create a circle shaped path at { x: 80, y: 50 }
   * // with a radius of 35:
   * var path = Path.circle({
   *     center: [80, 50],
   *     radius: 35
   * });
   *
   * // Select the path, so we can inspect its segments:
   * path.selected = true;
   *
   * // Create a copy of the path and move it by 150 points:
   * var copy = path.clone();
   * copy.position.x += 150;
   *
   * // Flatten the copied path, with a maximum error of 4 points:
   * copy.flatten(4);
   */
  abstract flatten(flatness?: number): void

  // TODO: Write about negative indices, and add an example for ranges.
  /**
   * Smooths the path item without changing the amount of segments in the path
   * or moving the segments' locations, by smoothing and adjusting the angle
   * and length of the segments' handles based on the position and distance of
   * neighboring segments.
   *
   * Smoothing works both for open paths and closed paths, and can be applied
   * to the full path, as well as a sub-range of it. If a range is defined
   * using the `options.from` and `options.to` properties, only the curve
   * handles inside that range are touched. If one or both limits of the range
   * are specified in negative indices, the indices are wrapped around the end
   * of the curve. That way, a smoothing range in a close path can even wrap
   * around the connection between the last and the first segment.
   *
   * Four different smoothing methods are available:
   *
   * - `'continuous'` smooths the path item by adjusting its curve handles so
   *     that the first and second derivatives of all involved curves are
   *     continuous across their boundaries.
   *
   *     This method tends to result in the smoothest results, but does not
   *     allow for further parametrization of the handles.
   *
   * - `'asymmetric'` is based on the same principle as `'continuous'` but
   *     uses different factors so that the result is asymmetric. This used to
   *     the only method available until v0.10.0, and is currently still the
   *     default when no method is specified, for reasons of backward
   *     compatibility. It will eventually be removed.
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
   * @option [options.type='asymmetric'] {String} the type of smoothing
   *     method: {@values 'continuous', 'asymmetric', 'catmull-rom',
   *     'geometric'}
   * @option options.factor {Number} the factor parameterizing the smoothing
   *     method — default: `0.5` for `'catmull-rom'`, `0.4` for `'geometric'`
   * @option options.from {Number|Segment|Curve} the segment or curve at which
   *     to start smoothing, if not the full path shall be smoothed
   *     (inclusive). This can either be a segment index, or a segment or
   *     curve object that is part of the path. If the passed number is
   *     negative, the index is wrapped around the end of the path.
   * @option options.to {Number|Segment|Curve} the segment or curve to which
   *     the handles of the path shall be processed (inclusive). This can
   *     either be a segment index, or a segment or curve object that is part
   *     of the path. If the passed number is negative, the index is wrapped
   *     around the end of the path.
   *
   * @param options the smoothing options
   * @see Segment#smooth([options])
   *
   * @example {@paperscript}
   * // Smoothing a closed shape:
   *
   * // Create a rectangular path with its top-left point at
   * // {x: 30, y: 25} and a size of {width: 50, height: 50}:
   * var path = Path.rectangle({
   *     point: [30, 25],
   *     size: [50, 50],
   *     strokeColor: 'black',
   * });
   *
   * // Select the path, so we can see its handles:
   * path.fullySelected = true;
   *
   * // Create a copy of the path and move it 100 to the right:
   * var copy = path.clone();
   * copy.position.x += 100;
   *
   * // Smooth the segments of the copy:
   * copy.smooth({ type: 'continuous' });
   *
   * @example {@paperscript height=220}
   * var path = new Path();
   * path.strokeColor = 'black';
   *
   * path.add(new Point(30, 50));
   *
   * var y = 5;
   * var x = 3;
   *
   * for (var i = 0; i < 28; i++) {
   *     y *= -1.1;
   *     x *= 1.1;
   *     path.lineBy(x, y);
   * }
   *
   * // Create a copy of the path and move it 100 down:
   * var copy = path.clone();
   * copy.position.y += 120;
   *
   * // Select the path, so we can see its handles:
   * copy.fullySelected = true;
   *
   * // Smooth the path using centripetal Catmull-Rom splines:
   * copy.smooth({ type: 'catmull-rom', factor: 0.5 });
   *
   * @example {@paperscript height=110}
   * // Smoothing ranges of paths, using segments, curves or indices:
   *
   * // Create 5 rectangles, next to each other:
   * var paths = [];
   * for (var i = 0; i < 5; i++) {
   *     paths.push(Path.rectangle({
   *         point: [30 + i * 100, 30],
   *         size: [50, 50],
   *         fullySelected: true
   *     }));
   * }
   * // Smooth a range, using segments:
   * paths[1].smooth({
   *     type: 'continuous',
   *     from: paths[1].segments[0],
   *     to: paths[1].segments[2]
   * });
   *
   * // Smooth a range, using curves:
   * paths[2].smooth({
   *     type: 'continuous',
   *     from: paths[2].curves[0],
   *     to: paths[2].curves[1]
   * });
   *
   * // Smooth a range, using indices:
   * paths[3].smooth({ type: 'continuous', from: 0, to: 2 });
   *
   * // Smooth a range, using negative indices:
   * paths[4].smooth({ type: 'continuous', from: -1, to: 1 });
   */
  abstract smooth(options?: {
    type?: 'continuous' | 'asymmetric' | 'catmull-rom' | 'geometric'
    factor?: number
    from?: number | Segment | Curve
    to?: number | Segment | Curve
  }): void

  /**
   * Fits a sequence of as few curves as possible through the path's anchor
   * points, ignoring the path items's curve-handles, with an allowed maximum
   * error. When called on {@link CompoundPath} items, each of the nested
   * paths is simplified. On {@link Path} items, the {@link Path#segments}
   * array is processed and replaced by the resulting sequence of fitted
   * curves.
   *
   * This method can be used to process and simplify the point data received
   * from a mouse or touch device.
   *
   * With `options.from` and `options.to`, only the segments in that range
   * are replaced. The fitted curves join the curves outside of the range
   * tangentially where these have handles.
   *
   * @option [options.tolerance=2.5] {Number} the allowed maximum error when
   *     fitting the curves through the segment points
   * @option options.from {Number|Segment|Curve} the segment or curve at which
   *     to start simplifying, if not the full path shall be simplified
   *     (inclusive). This can either be a segment index, or a segment or
   *     curve object that is part of the path. If the passed number is
   *     negative, the index is wrapped around the end of the path.
   * @option options.to {Number|Segment|Curve} the segment or curve up to
   *     which to simplify (inclusive). This can either be a segment index,
   *     or a segment or curve object that is part of the path. If the passed
   *     number is negative, the index is wrapped around the end of the path.
   *
   * @param options the simplification options, or the
   *     tolerance as a number
   * @return {@true if the method was capable of fitting curves
   *     through the path's segment points}
   *
   * @example {@paperscript height=300}
   * // Click and drag below to draw to draw a line, when you release the
   * // mouse, the is made smooth using path.simplify():
   *
   * var path;
   * function onMouseDown(event) {
   *     // If we already made a path before, deselect it:
   *     if (path) {
   *         path.selected = false;
   *     }
   *
   *     // Create a new path and add the position of the mouse
   *     // as its first segment. Select it, so we can see the
   *     // segment points:
   *     path = new Path({
   *         segments: [event.point],
   *         strokeColor: 'black',
   *         selected: true
   *     });
   * }
   *
   * function onMouseDrag(event) {
   *     // On every drag event, add a segment to the path
   *     // at the position of the mouse:
   *     path.add(event.point);
   * }
   *
   * function onMouseUp(event) {
   *     // When the mouse is released, simplify the path:
   *     path.simplify();
   *     path.selected = true;
   * }
   */
  abstract simplify(
    options?:
      | number
      | {
          tolerance?: number
          from?: number | Segment | Curve
          to?: number | Segment | Curve
        }
  ): boolean

  /**
   * Interpolates between the two specified path items and uses the result
   * as the geometry for this path item. The number of children and
   * segments in the two paths involved in the operation should be the same.
   *
   * @param from the path item defining the geometry when `factor`
   *     is `0`
   * @param to the path item defining the geometry  when `factor`
   *     is `1`
   * @param factor the interpolation coefficient, typically between
   *     `0` and `1`, but extrapolation is possible too
   */
  interpolate(from: PathItem, to: PathItem, factor: number) {
    const isPath = !this._children
    const name = isPath ? '_segments' : '_children'
    const itemsFrom = from[name]
    const itemsTo = to[name]
    const items = this[name]
    if (!itemsFrom || !itemsTo || itemsFrom.length !== itemsTo.length) {
      throw new Error(`Invalid operands in interpolate() call: ${from}, ${to}`)
    }
    const current = items.length
    const { length } = itemsTo
    if (current < length) {
      for (let i = current; i < length; i++) {
        this[isPath ? 'add' : 'addChild'](
          isPath ? new Segment() : new Path(Item.NO_INSERT)
        )
      }
    } else if (current > length) {
      this[isPath ? 'removeSegments' : 'removeChildren'](length, current)
    }
    for (let i = 0; i < length; i++) {
      items[i].interpolate(itemsFrom[i], itemsTo[i], factor)
    }
    if (isPath) {
      this.closed = from.closed
      this._changed(Change.GEOMETRY)
    }
  }

  /**
   * Compares the geometry of two paths to see if they describe the same
   * shape, detecting cases where paths start in different segments or even
   * use different amounts of curves to describe the same shape, as long as
   * their orientation is the same, and their segments and handles really
   * result in the same visual appearance of curves.
   *
   * @param path the path to compare this path's geometry with
   * @return {@true if two paths describe the same shape}
   */
  compare(path: PathItem): boolean {
    let ok = false
    if (path) {
      const paths1 = (this._children ?? [this]) as PathItem[]
      const paths2 = (path._children?.slice() ?? [path]) as PathItem[]
      const length1 = paths1.length
      const length2 = paths2.length
      const matched = []
      let count = 0
      ok = true
      const boundsOverlaps = findItemBoundsCollisions(
        paths1,
        paths2,
        GEOMETRIC_EPSILON
      )
      for (let i1 = length1 - 1; i1 >= 0 && ok; i1--) {
        const path1 = paths1[i1]
        ok = false
        const pathBoundsOverlaps = boundsOverlaps[i1]
        if (pathBoundsOverlaps) {
          for (let i2 = pathBoundsOverlaps.length - 1; i2 >= 0 && !ok; i2--) {
            if (path1.compare(paths2[pathBoundsOverlaps[i2]])) {
              if (!matched[pathBoundsOverlaps[i2]]) {
                matched[pathBoundsOverlaps[i2]] = true
                count++
              }
              ok = true
            }
          }
        }
      }
      // Each path in path2 needs to be matched at least once.
      ok = ok && count === length2
    }
    return ok
  }

  /**
   * {@grouptitle Postscript Style Drawing Commands}
   *
   * On a normal empty {@link Path}, the point is simply added as the path's
   * first segment. If called on a {@link CompoundPath}, a new {@link Path} is
   * created as a child and the point is added as its first segment.
   *
   * @param point the point in which to start the path
   */
  abstract moveTo(point: PointLike | number, y?: number): void

  /**
   * Adds a straight curve to the path, from the the last segment in the path
   * to the specified point.
   *
   * @param point the destination point of the newly added straight
   *     curve
   */
  abstract lineTo(point: PointLike | number, y?: number): void

  /**
   * Adds an arc from the position of the last segment in the path, passing
   * through the specified `through` point, to the specified `to` point, by
   * adding one or more segments to the path.
   *
   * @param through the point where the arc should pass through
   * @param to the point where the arc should end
   *
   * @example {@paperscript}
   * var path = new Path();
   * path.strokeColor = 'black';
   *
   * var firstPoint = new Point(30, 75);
   * path.add(firstPoint);
   *
   * // The point through which we will create the arc:
   * var throughPoint = new Point(40, 40);
   *
   * // The point at which the arc will end:
   * var toPoint = new Point(130, 75);
   *
   * // Draw an arc through 'throughPoint' to 'toPoint'
   * path.arcTo(throughPoint, toPoint);
   *
   * // Add a red circle shaped path at the position of 'throughPoint':
   * var circle = Path.circle(throughPoint, 3);
   * circle.fillColor = 'red';
   *
   * @example {@paperscript height=300}
   * // Interactive example. Click and drag in the view below:
   *
   * var myPath;
   * function onMouseDrag(event) {
   *     // If we created a path before, remove it:
   *     if (myPath) {
   *         myPath.remove();
   *     }
   *
   *     // Create a new path and add a segment point to it
   *     // at {x: 150, y: 150):
   *     myPath = new Path();
   *     myPath.add(150, 150);
   *
   *     // Draw an arc through the position of the mouse to 'toPoint'
   *     var toPoint = new Point(350, 150);
   *     myPath.arcTo(event.point, toPoint);
   *
   *     // Select the path, so we can see its segments:
   *     myPath.selected = true;
   * }
   *
   * // When the mouse is released, deselect the path
   * // and fill it with black.
   * function onMouseUp(event) {
   *     myPath.selected = false;
   *     myPath.fillColor = 'black';
   * }
   */
  abstract arcTo(through: PointLike, to: PointLike): void
  /**
   * Adds an arc from the position of the last segment in the path to
   * the specified point, by adding one or more segments to the path.
   *
   * @param to the point where the arc should end
   * @param clockwise specifies whether the arc should be
   *     drawn in clockwise direction
   *
   * @example {@paperscript}
   * var path = new Path();
   * path.strokeColor = 'black';
   *
   * path.add(new Point(30, 75));
   * path.arcTo(new Point(130, 75));
   *
   * var path2 = new Path();
   * path2.strokeColor = 'red';
   * path2.add(new Point(180, 25));
   *
   * // To draw an arc in anticlockwise direction,
   * // we pass `false` as the second argument to arcTo:
   * path2.arcTo(new Point(280, 25), false);
   *
   * @example {@paperscript height=300}
   * // Interactive example. Click and drag in the view below:
   * var myPath;
   *
   * // The mouse has to move at least 20 points before
   * // the next mouse drag event is fired:
   * tool.minDistance = 20;
   *
   * // When the user clicks, create a new path and add
   * // the current mouse position to it as its first segment:
   * function onMouseDown(event) {
   *     myPath = new Path();
   *     myPath.strokeColor = 'black';
   *     myPath.add(event.point);
   * }
   *
   * // On each mouse drag event, draw an arc to the current
   * // position of the mouse:
   * function onMouseDrag(event) {
   *     myPath.arcTo(event.point);
   * }
   */
  abstract arcTo(to: PointLike, clockwise?: boolean): void
  // DOCS: PathItem#arcTo(to, radius, rotation, clockwise, large)
  abstract arcTo(
    to: PointLike,
    radius: SizeLike | number,
    rotation: number,
    clockwise: boolean,
    large: boolean
  ): void

  /**
   * Adds an arc that sweeps the specified angle around the specified
   * `center` point, from the position of the last segment in the path, by
   * adding one or more segments to the path. Positive angles draw the arc in
   * clockwise direction, negative ones in anticlockwise direction.
   *
   * @param center the center of the arc
   * @param angle the angle in degrees that the arc sweeps over
   *
   * @example {@paperscript}
   * var path = new Path();
   * path.strokeColor = 'black';
   * path.add(new Point(30, 75));
   * path.lineTo(new Point(80, 75));
   *
   * // Draw a half circle around (105, 75) and continue on the other side:
   * path.arcAround(new Point(105, 75), 180);
   * path.lineTo(new Point(180, 75));
   *
   * // Draw a full circle around (230, 75):
   * var circle = new Path();
   * circle.strokeColor = 'red';
   * circle.add(new Point(250, 75));
   * circle.arcAround(new Point(230, 75), 360);
   */
  abstract arcAround(center: PointLike, angle: number): void

  /**
   * Adds an arc from the position of the last segment in the path to the
   * specified point, by adding one or more segments to the path. The arc
   * continues in the direction in which the path ends, without a corner.
   *
   * @param to the point where the arc should end
   *
   * @example {@paperscript}
   * var path = new Path();
   * path.strokeColor = 'black';
   * path.add(new Point(30, 125));
   * path.lineTo(new Point(80, 125));
   *
   * // Each arc continues smoothly from where the path ends:
   * path.arcTowards(new Point(130, 75));
   * path.arcTowards(new Point(230, 75));
   * path.lineTo(new Point(230, 125));
   *
   * @example {@paperscript height=300}
   * // Interactive example. Click and drag in the view below:
   * var myPath;
   *
   * // The mouse has to move at least 20 points before
   * // the next mouse drag event is fired:
   * tool.minDistance = 20;
   *
   * // When the user clicks, create a new path that starts
   * // with a horizontal line ending at the mouse position:
   * function onMouseDown(event) {
   *     myPath = new Path();
   *     myPath.strokeColor = 'black';
   *     myPath.add(event.point - [20, 0], event.point);
   * }
   *
   * // On each mouse drag event, continue the path smoothly
   * // with an arc to the current position of the mouse:
   * function onMouseDrag(event) {
   *     myPath.arcTowards(event.point);
   * }
   */
  abstract arcTowards(to: PointLike | number, y?: number): void

  /**
   * Adds a curve from the last segment in the path through the specified
   * `through` point, to the specified destination point by adding one segment
   * to the path.
   *
   * @param through the point through which the curve should pass
   * @param to the destination point of the newly added curve
   * @param time the curve-time parameter at which the
   *     `through` point is to be located
   *
   * @example {@paperscript height=300}
   * // Interactive example. Move your mouse around the view below:
   *
   * var myPath;
   * function onMouseMove(event) {
   *     // If we created a path before, remove it:
   *     if (myPath) {
   *         myPath.remove();
   *     }
   *
   *     // Create a new path and add a segment point to it
   *     // at {x: 150, y: 150):
   *     myPath = new Path();
   *     myPath.add(150, 150);
   *
   *     // Draw a curve through the position of the mouse to 'toPoint'
   *     var toPoint = new Point(350, 150);
   *     myPath.curveTo(event.point, toPoint);
   *
   *     // Select the path, so we can see its segments:
   *     myPath.selected = true;
   * }
   */
  abstract curveTo(through: PointLike, to: PointLike, time?: number): void

  /**
   * Adds a cubic bezier curve to the path, from the last segment to the
   * specified destination point, with the curve itself defined by two
   * specified handles.
   *
   * @param handle1 the location of the first handle of the newly
   *     added curve in absolute coordinates, out of which the relative values
   *     for {@link Segment#handleOut} of its first segment are calculated
   * @param handle2 the location of the second handle of the newly
   *     added curve in absolute coordinates, out of which the relative values
   *     for {@link Segment#handleIn} of its second segment are calculated
   * @param to the destination point of the newly added curve
   */
  abstract cubicCurveTo(
    handle1: PointLike,
    handle2: PointLike,
    to: PointLike
  ): void

  /**
   * Adds a quadratic bezier curve to the path, from the last segment to the
   * specified destination point, with the curve itself defined by the
   * specified handle.
   *
   * Note that Paper.js only stores cubic curves, so the handle is actually
   * converted.
   *
   * @param handle the location of the handle of the newly added
   *     quadratic curve in absolute coordinates, out of which the relative
   *     values for {@link Segment#handleOut} of the resulting cubic curve's
   *     first segment and {@link Segment#handleIn} of its second segment are
   *     calculated
   * @param to the destination point of the newly added curve
   */
  abstract quadraticCurveTo(handle: PointLike, to: PointLike): void

  /**
   * Closes the path. When closed, Paper.js connects the first and last
   * segment of the path with an additional curve. The difference to setting
   * {@link Path#closed} to `true` is that this will also merge the first
   * segment with the last if they lie in the same location.
   *
   * @see Path#closed
   */
  abstract closePath(tolerance?: number): void

  /**
   * {@grouptitle Relative Drawing Commands}
   *
   * If called on a {@link CompoundPath}, a new {@link Path} is created as a
   * child and a point is added as its first segment relative to the position
   * of the last segment of the current path.
   *
   * @param to
   */
  abstract moveBy(to: PointLike | number, y?: number): void

  /**
   * Adds a straight curve to the path, from the the last segment in the path
   * to the `to` vector specified relatively to it.
   *
   * @param point the vector describing the destination of the newly
   *     added straight curve
   *
   * @example {@paperscript}
   * var path = new Path();
   * path.strokeColor = 'black';
   *
   * // Add a segment at {x: 50, y: 50}
   * path.add(25, 25);
   *
   * // Add a segment relative to the last segment of the path.
   * // 50 in x direction and 0 in y direction, becomes {x: 75, y: 25}
   * path.lineBy(50, 0);
   *
   * // 0 in x direction and 50 in y direction, becomes {x: 75, y: 75}
   * path.lineBy(0, 50);
   *
   * @example {@paperscript height=300}
   * // Drawing a spiral using lineBy:
   * var path = new Path();
   * path.strokeColor = 'black';
   *
   * // Add the first segment at {x: 50, y: 50}
   * path.add(view.center);
   *
   * // Loop 500 times:
   * for (var i = 0; i < 500; i++) {
   *     // Create a vector with an ever increasing length
   *     // and an angle in increments of 45 degrees
   *     var vector = new Point({
   *         angle: i * 45,
   *         length: i / 2
   *     });
   *     // Add the vector relatively to the last segment point:
   *     path.lineBy(vector);
   * }
   *
   * // Smooth the handles of the path:
   * path.smooth();
   *
   * // Uncomment the following line and click on 'run' to see
   * // the construction of the path:
   * // path.selected = true;
   */
  abstract lineBy(point: PointLike | number, y?: number): void

  /**
   * Adds an arc from the position of the last segment in the path, passing
   * through the specified `through` vector, to the specified `to` vector, all
   * specified relatively to it by these given vectors, by adding one or more
   * segments to the path.
   *
   * @param through the vector where the arc should pass through
   * @param to the vector where the arc should end
   */
  abstract arcBy(through: PointLike, to: PointLike): void
  /**
   * Adds an arc from the position of the last segment in the path to the `to`
   * vector specified relatively to it, by adding one or more segments to the
   * path.
   *
   * @param to the vector where the arc should end
   * @param clockwise specifies whether the arc should be
   *     drawn in clockwise direction
   */
  abstract arcBy(to: PointLike, clockwise?: boolean): void

  /**
   * Adds a curve from the last segment in the path through the specified
   * `through` vector, to the specified `to` vector, all specified relatively
   * to it by these given vectors, by adding one segment to the path.
   *
   * @param through the vector through which the curve should pass
   * @param to the destination vector of the newly added curve
   * @param time the curve-time parameter at which the
   *     `through` point is to be located
   */
  abstract curveBy(through: PointLike, to: PointLike, time?: number): void

  /**
   * Adds a cubic bezier curve to the path, from the last segment to the
   * to the specified `to` vector, with the curve itself defined by two
   * specified handles.
   *
   * @param handle1 the location of the first handle of the newly
   *     added curve
   * @param handle2 the location of the second handle of the newly
   *     added curve
   * @param to the destination point of the newly added curve
   */
  abstract cubicCurveBy(
    handle1: PointLike,
    handle2: PointLike,
    to: PointLike
  ): void

  /**
   * Adds a quadratic bezier curve to the path, from the last segment to the
   * specified destination point, with the curve itself defined by the
   * specified handle.
   *
   * Note that Paper.js only stores cubic curves, so the handle is actually
   * converted.
   *
   * @param handle the handle of the newly added quadratic curve out
   *     of which the values for {@link Segment#handleOut} of the resulting
   *     cubic curve's first segment and {@link Segment#handleIn} of its
   *     second segment are calculated
   * @param to the destination point of the newly added curve
   */
  abstract quadraticCurveBy(handle: PointLike, to: PointLike): void

  // The graph of a boolean operation, to check its planarity in the tests:
  static _createGraph(path1: PathItem, path2?: PathItem): Graph {
    return createGraph(getOperands(path1, path2))
  }

  /**
   * {@grouptitle Boolean Path Operations}
   *
   * Unites the geometry of the specified path with this path's geometry
   * and returns the result as a new path item. With an array of paths,
   * the result covers the areas inside any of them or this path. Each
   * path keeps its own fill rule.
   *
   * @option [options.insert=true] {Boolean} whether the resulting item
   *     should be inserted back into the scene graph, above all paths
   *     involved in the operation
   *
   * @param path the path or paths to unite with
   * @param options the boolean operation options
   * @return the resulting path item
   *
   * @example {@paperscript}
   * var result = Path.regularPolygon([50, 50], 3, 40)
   *     .unite(Path.circle([50, 50], 25));
   * result.fillColor = 'red';
   *
   * @example {@paperscript}
   * // Uniting many paths at once:
   * var circles = [];
   * for (var i = 0; i < 6; i++) {
   *     circles.push(Path.circle([30 + i * 20, 50], 20));
   * }
   * var result = circles[0].unite(circles.slice(1));
   * result.fillColor = 'red';
   */
  unite(path?: PathItem | PathItem[], options?: BooleanOptions): PathItem {
    return traceBoolean(this, path, 'unite', options)
  }

  /**
   * Intersects the geometry of the specified path with this path's
   * geometry and returns the result as a new path item. With an array of
   * paths, the result covers the areas inside all of them and this path.
   * Each path keeps its own fill rule.
   *
   * @option [options.insert=true] {Boolean} whether the resulting item
   *     should be inserted back into the scene graph, above all paths
   *     involved in the operation
   * @option [options.trace=true] {Boolean} whether the tracing method is
   *     used, treating all paths as areas when determining which parts
   *     of the paths are to be kept in the result, or whether the first
   *     path is only to be split at intersections, keeping the parts of
   *     the curves that intersect with the areas of all other paths.
   *
   * @param path the path or paths to intersect
   *     with
   * @param options the boolean operation options
   * @return the resulting path item
   *
   * @example {@paperscript}
   * var result = Path.regularPolygon([50, 50], 3, 40)
   *     .intersect(Path.circle([50, 50], 25));
   * result.fillColor = 'red';
   */
  intersect(path: PathItem | PathItem[], options?: BooleanOptions): PathItem {
    return traceBoolean(this, path, 'intersect', options)
  }

  /**
   * Subtracts the geometry of the specified path from this path's
   * geometry and returns the result as a new path item. With an array of
   * paths, the result covers the areas inside this path and outside all
   * of them. Each path keeps its own fill rule.
   *
   * @option [options.insert=true] {Boolean} whether the resulting item
   *     should be inserted back into the scene graph, above all paths
   *     involved in the operation
   * @option [options.trace=true] {Boolean} whether the tracing method is
   *     used, treating all paths as areas when determining which parts
   *     of the paths are to be kept in the result, or whether the first
   *     path is only to be split at intersections, removing the parts of
   *     the curves that intersect with the area of any other path.
   *
   * @param path the path or paths to subtract
   * @param options the boolean operation options
   * @return the resulting path item
   *
   * @example {@paperscript}
   * var result = Path.regularPolygon([50, 50], 3, 40)
   *     .subtract(Path.circle([50, 50], 25));
   * result.fillColor = 'red';
   */
  subtract(path: PathItem | PathItem[], options?: BooleanOptions): PathItem {
    return traceBoolean(this, path, 'subtract', options)
  }

  /**
   * Excludes the intersection of the geometry of the specified path with
   * this path's geometry and returns the result as a new path item. With
   * an array of paths, the result covers the areas inside an odd number
   * of the paths, this one included. Each path keeps its own fill rule.
   *
   * @option [options.insert=true] {Boolean} whether the resulting item
   *     should be inserted back into the scene graph, above all paths
   *     involved in the operation
   *
   * @param path the path or paths to exclude the
   *     intersection of
   * @param options the boolean operation options
   * @return the resulting path item
   *
   * @example {@paperscript}
   * var result = Path.regularPolygon([50, 50], 3, 40)
   *     .exclude(Path.circle([50, 50], 25));
   * result.fillColor = 'red';
   */
  exclude(path: PathItem | PathItem[], options?: BooleanOptions): PathItem {
    return traceBoolean(this, path, 'exclude', options)
  }

  /**
   * Splits the geometry of this path along the geometry of the specified
   * path returns the result as a new group item. This is equivalent to
   * calling {@link #subtract(path)} and {@link #intersect(path)} and
   * putting the results into a new group.
   *
   * @option [options.insert=true] {Boolean} whether the resulting item
   *     should be inserted back into the scene graph, above both paths
   *     involved in the operation
   * @option [options.trace=true] {Boolean} whether the tracing method is
   *     used, treating both paths as areas when determining which parts
   *     of the paths are to be kept in the result, or whether the first
   *     path is only to be split at intersections.
   *
   * @param path the path to divide by
   * @param options the boolean operation options
   * @return the resulting path item
   */
  divide(path: PathItem, options?: BooleanOptions): PathItem {
    return options && (options.trace == false || options.stroke)
      ? splitBoolean(this, path, 'divide', options)
      : createResult(
          [this.subtract(path, options), this.intersect(path, options)],
          true,
          this,
          path,
          options
        )
  }

  /*
   * Resolves all crossings of a path item by splitting the path or
   * compound-path in each self-intersection and tracing the result.
   * If possible, the existing path / compound-path is modified if the
   * amount of resulting paths allows so, otherwise a new path /
   * compound-path is created, replacing the current one.
   *
   * @return the resulting path item
   */
  resolveCrossings(): PathItem {
    const children = this._children
    // Trace the outline of the area that the path item fills
    // according to its fill rule, without the curves inside it:
    const paths = tracePaths([closePaths(this.clone(false))], inside => inside)
    // Determine how to return the paths: First try to recycle the
    // current path / compound-path, if the amount of paths does not
    // require a conversion.
    const { length } = paths
    let item: PathItem
    if (length > 1 && children) {
      if (paths !== children) {
        this.children = paths
      }
      item = this
    } else if (length === 1 && !children) {
      const path = this as PathItem as Path
      if (paths[0] !== path) {
        path.segments = paths[0].removeSegments()
      }
      item = this
    }
    // Otherwise create a new compound-path and see if we can reduce it,
    // and attempt to replace this item with it.
    if (!item) {
      item = new CompoundPath(Item.NO_INSERT)
      item.addChildren(paths)
      item = item.reduce() as PathItem
      item.copyAttributes(this)
      this.replaceWith(item)
    }
    return item
  }

  /**
   * Fixes the orientation of the sub-paths of a compound-path, assuming
   * that non of its sub-paths intersect, by reorienting them so that they
   * are of different winding direction than their containing paths,
   * except for disjoint sub-paths, i.e. islands, which are oriented so
   * that they have the same winding direction as the the biggest path.
   *
   * @param [nonZero=false] controls if the non-zero fill-rule
   *     is to be applied, by counting the winding of each nested path and
   *     discarding sub-paths that do not contribute to the final result
   * @param clockwise if provided, the orientation of the root
   *     paths will be set to the orientation specified by `clockwise`,
   *     otherwise the orientation of the largest root child is used.
   * @return a reference to the item itself, reoriented
   */
  reorient(nonZero?: boolean, clockwise?: boolean): this {
    const children = this._children
    if (children?.length) {
      this.children = reorientPaths(
        this.removeChildren() as PathItem[],
        // Handle both even-odd and non-zero rule.
        winding => !!(nonZero ? winding : winding & 1),
        clockwise
      )
    } else if (clockwise !== undefined) {
      this.clockwise = clockwise
    }
    return this
  }

  /**
   * Returns a point that is guaranteed to be inside the path.
   */
  get interiorPoint(): Point {
    return getInteriorPoint(this)
  }

  /**
   * {@grouptitle Offsetting and Outlining}
   *
   * Offsets the path item by the given distance and returns the result
   * as a new path item. Closed paths and compound paths grow by positive
   * distances and shrink by negative ones, open paths are offset along
   * their normals for positive distances, and against them for negative
   * ones. As with the boolean operations, the path item's matrix is
   * applied first.
   *
   * @option [options.join='miter'] {String} the shape of the corners
   *     that the offset adds where the path turns away from it:
   *     {@values 'miter', 'round', 'bevel'}
   * @option [options.miterLimit=10] {Number} the limit of miter corners,
   *     see {@link Style#miterLimit}
   * @option [options.insert=true] {Boolean} whether the resulting item
   *     should be inserted back into the scene graph, above this path
   *
   * @param distance the distance to offset the path item by
   * @param options the offset options
   * @return the resulting path item
   *
   * @example {@paperscript}
   * var path = Path.star([50, 50], 5, 20, 40);
   * path.strokeColor = 'black';
   * var result = path.offset(10, { join: 'round' });
   * result.strokeColor = 'red';
   */
  offset(distance: number, options?: OffsetOptions): PathItem {
    return offsetPathItem(this, distance, options)
  }

  /**
   * Outlines the stroke of the path item, and returns the area that it
   * covers as a new path item, filled with the stroke's color. As with
   * the boolean operations, the path item's matrix is applied first.
   * Dashed strokes are outlined as their dashes, each with the stroke's
   * caps, as the canvas draws them, see {@link #dash(options)}.
   *
   * Paths with a {@link Path#strokeProfile} are outlined as the area
   * that its pens sweep. Their round joins and caps are the pens
   * themselves, and their other joins and caps connect the points where
   * the pens touch the sides of the stroke. Steps in the profile end
   * the parts of the stroke straight across, as butt caps do.
   *
   * @option [options.width=this.strokeWidth] {Number} the width of the
   *     stroke
   * @option [options.join=this.strokeJoin] {String} the shape of the
   *     stroke's corners: {@values 'miter', 'round', 'bevel'}
   * @option [options.cap=this.strokeCap] {String} the shape of the
   *     stroke's ends: {@values 'round', 'square', 'butt'}
   * @option [options.miterLimit=this.miterLimit] {Number} the limit of
   *     miter corners, see {@link Style#miterLimit}
   * @option [options.insert=true] {Boolean} whether the resulting item
   *     should be inserted back into the scene graph, above this path
   *
   * @param options the outline options
   * @return the resulting path item
   *
   * @example {@paperscript}
   * var path = Path.arc([20, 70], [50, 20], [80, 70]);
   * path.strokeColor = 'black';
   * path.strokeWidth = 20;
   * path.strokeCap = 'round';
   * var result = path.outline();
   * result.strokeColor = 'red';
   * result.strokeWidth = 1;
   * path.remove();
   */
  outline(options?: OutlineOptions): PathItem {
    return outlinePathItem(this, options)
  }

  /**
   * Cuts the stroke of the path item into its dashes, as the canvas draws
   * them with the {@link Style#dashArray} and {@link Style#dashOffset}
   * of the path item or those of the options, and returns them as a new
   * group of open paths with the path item's style, without its dash
   * pattern. The pattern starts over on each path of a compound path,
   * and the dashes keep the parts of the paths' stroke profiles. As with
   * the boolean operations, the path item's matrix is applied first.
   *
   * @option [options.dashArray=this.dashArray] {Number[]} the lengths of
   *     the dashes and the gaps between them
   * @option [options.dashOffset=this.dashOffset] {Number} the offset
   *     into the pattern at which the dashes start
   * @option [options.insert=true] {Boolean} whether the resulting group
   *     should be inserted back into the scene graph, above this path
   *     item
   *
   * @param options the dash options
   * @return the dashes, as a new group of paths
   *
   * @example {@paperscript}
   * var path = Path.circle({
   *     center: [80, 50],
   *     radius: 35,
   *     strokeColor: 'black',
   *     strokeWidth: 4,
   *     dashArray: [12, 6]
   * });
   * // Turn every other dash red:
   * var dashes = path.dash();
   * dashes.children.forEach(function(dash, i) {
   *     if (i % 2)
   *         dash.strokeColor = 'red';
   * });
   * path.remove();
   */
  dash(options?: DashOptions): Group {
    return dashPathItem(this, options)
  }

  // Documented in Path and CompoundPath, which both define them:
  abstract get closed(): boolean
  abstract set closed(closed: boolean)
  abstract get area(): number
  abstract get length(): number
  abstract get curves(): Curve[]

  static {
    Object.assign(this.prototype, {
      _selectBounds: false,
      _canScaleStroke: true
    })
  }
}
