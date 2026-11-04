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

import { Item, Path, PathItem, Point, inject, push } from '../internal.ts'
import type { HitResult } from '../item/HitResult.ts'
import type { Project } from '../item/Project.ts'
import type { PointLike } from '../basic/Point.ts'
import type { SizeLike } from '../basic/Size.ts'
import type { Matrix } from '../basic/Matrix.ts'
import type { Segment } from './Segment.ts'
import type { Curve } from './Curve.ts'

/**
 * A compound path is a complex path that is made up of one or more
 * simple sub-paths. It can have the `nonzero` fill rule, or the `evenodd` rule
 * applied. Both rules use mathematical equations to determine if any region is
 * outside or inside the final shape. The `evenodd` rule is more predictable:
 * Every other region within a such a compound path is a hole, regardless of
 * path direction.
 *
 * All the paths in a compound path take on the style of the compound path and
 * can be accessed through its {@link Item#children} list.
 */
export class CompoundPath extends PathItem {
  declare _children: Path[]

  /**
   * Creates a new compound path item and places it in the active layer.
   *
   * @param paths the paths to place within the compound path
   *
   * @example {@paperscript}
   * // Create a circle shaped path with a hole in it:
   * var circle = Path.circle({
   *     center: new Point(50, 50),
   *     radius: 30
   * });
   *
   * var innerCircle = Path.circle({
   *     center: new Point(50, 50),
   *     radius: 10
   * });
   *
   * var compoundPath = new CompoundPath([circle, innerCircle]);
   * compoundPath.fillColor = 'red';
   *
   * // Move the inner circle 5pt to the right:
   * compoundPath.children[1].position.x += 5;
   */
  constructor(paths?: Path[])
  /**
   * Creates a new compound path item from an object description and places it
   * at the top of the active layer.
   *
   * @param object an object containing properties to be set on the
   *     path
   * @return the newly created path
   *
   * @example {@paperscript}
   * var path = new CompoundPath({
   *     children: [
   *         Path.circle({
   *             center: new Point(50, 50),
   *             radius: 30
   *         }),
   *         Path.circle({
   *             center: new Point(50, 50),
   *             radius: 10
   *         })
   *     ],
   *     fillColor: 'black',
   *     selected: true
   * });
   */
  constructor(object: object)
  /**
   * Creates a new compound path item from SVG path-data and places it at the
   * top of the active layer.
   *
   * @param pathData the SVG path-data that describes the geometry
   * of this path
   * @return the newly created path
   *
   * @example {@paperscript}
   * var pathData = 'M20,50c0,-16.56854 13.43146,-30 30,-30c16.56854,0 30,13.43146 30,30c0,16.56854 -13.43146,30 -30,30c-16.56854,0 -30,-13.43146 -30,-30z M50,60c5.52285,0 10,-4.47715 10,-10c0,-5.52285 -4.47715,-10 -10,-10c-5.52285,0 -10,4.47715 -10,10c0,5.52285 4.47715,10 10,10z';
   * var path = new CompoundPath(pathData);
   * path.fillColor = 'black';
   */
  constructor(pathData: string)
  constructor(...paths: Path[])
  constructor(...args: any[]) {
    super()
    const [arg] = args
    if (!this._initialize(arg)) {
      if (typeof arg === 'string') {
        this.pathData = arg
      } else {
        this.addChildren(Array.isArray(arg) ? arg : args)
      }
    }
  }

  _initializeContent(project: Project) {
    super._initializeContent(project)
    // CompoundPath has children and supports named children. They're its
    // content, which loading resets, unlike a group's:
    this._children = []
    this._namedChildren = {}
  }

  _transformContent(
    matrix: Matrix,
    applyRecursively?: boolean,
    setApplyMatrix?: boolean
  ): boolean {
    this._scaleStroke(matrix)
    return super._transformContent(matrix, applyRecursively, setApplyMatrix)
  }

  insertChildren(index: number, items: any[]): Item[] {
    // If we're passed a segment array describing a simple path instead of a
    // compound-path, wrap it in another array to turn it into the array
    // notation for compound-paths.
    let list = items
    const [first] = list
    if (first && typeof first[0] === 'number') {
      list = [list]
    }
    // Perform some conversions depending on the type of item passed:
    // Convert array-notation to paths, and expand compound-paths in the
    // items list by adding their children to the it replacing their parent.
    for (let i = list.length - 1; i >= 0; i--) {
      const item = list[i]
      // Clone the list array before modifying it, as it may be a passed
      // children array from another item.
      if (list === items && !(item instanceof Path)) {
        list = list.slice()
      }
      if (Array.isArray(item)) {
        list[i] = new Path({ segments: item, insert: false })
      } else if (item instanceof CompoundPath) {
        list.splice(i, 1, ...item.removeChildren())
        item.remove()
      }
    }
    return super.insertChildren(index, list)
  }

  // DOCS: reduce()
  reduce(options?: object): Item {
    const children = this._children
    for (let i = children.length - 1; i >= 0; i--) {
      const path = children[i].reduce(options)
      if (path.isEmpty()) {
        path.remove()
      }
    }
    if (!children.length) {
      // Replace with a simple empty Path
      const path = new Path(Item.NO_INSERT)
      path.copyAttributes(this)
      path.insertAbove(this)
      this.remove()
      return path
    }
    const item = super.reduce()
    // A single child takes on the attributes that it was drawn with:
    if (item !== this) {
      item.copyAttributes(this, true)
    }
    return item
  }

  /**
   * Specifies whether the compound-path is fully closed, meaning all its
   * contained sub-paths are closed path.
   *
   * @see Path#closed
   */
  get closed(): boolean {
    return this._children.every(child => child._closed)
  }

  set closed(closed: boolean) {
    for (const child of this._children) {
      child.closed = closed
    }
  }

  /**
   * The first Segment contained within the compound-path, a short-cut to
   * calling {@link Path#firstSegment} on {@link Item#firstChild}.
   */
  get firstSegment(): Segment | null {
    const first = this.firstChild as Path
    return first?.firstSegment ?? null
  }

  /**
   * The last Segment contained within the compound-path, a short-cut to
   * calling {@link Path#lastSegment} on {@link Item#lastChild}.
   */
  get lastSegment(): Segment | null {
    const last = this.lastChild as Path
    return last?.lastSegment ?? null
  }

  /**
   * All the curves contained within the compound-path, from all its child
   * {@link Path} items.
   */
  get curves(): Curve[] {
    const curves = []
    for (const child of this._children) {
      push(curves, child.curves)
    }
    return curves
  }

  /**
   * The first Curve contained within the compound-path, a short-cut to
   * calling {@link Path#firstCurve} on {@link Item#firstChild}.
   */
  get firstCurve(): Curve | null {
    const first = this.firstChild as Path
    return first?.firstCurve ?? null
  }

  /**
   * The last Curve contained within the compound-path, a short-cut to
   * calling {@link Path#lastCurve} on {@link Item#lastChild}.
   */
  get lastCurve(): Curve | null {
    const last = this.lastChild as Path
    return last?.lastCurve ?? null
  }

  /**
   * The area that the compound-path's geometry is covering, calculated by
   * getting the {@link Path#area} of each sub-path and it adding up.
   * Note that self-intersecting paths and sub-paths of different orientation
   * can result in areas that cancel each other out.
   */
  get area(): number {
    let area = 0
    for (const child of this._children) {
      area += child.area
    }
    return area
  }

  /**
   * The total length of all sub-paths in this compound-path, calculated by
   * getting the {@link Path#length} of each sub-path and it adding up.
   */
  get length(): number {
    let length = 0
    for (const child of this._children) {
      length += child.length
    }
    return length
  }

  _getPathData(_matrix?: Matrix, _precision?: number): string {
    return this._children
      .map(child => {
        const matrix = child._matrix
        return child._getPathData(
          _matrix && !matrix.isIdentity() ? _matrix.appended(matrix) : _matrix,
          _precision
        )
      })
      .join('')
  }

  _hitTestChildren(
    point: Point,
    options: any,
    viewMatrix?: Matrix
  ): HitResult | null {
    return super._hitTestChildren(
      point,
      // If we're not specifically asked to returns paths through
      // options.class == Path, do not test children for fill, since a
      // compound path forms one shape.
      // Also support legacy format `type: 'path'`.
      options.class === Path || options.type === 'path'
        ? options
        : Object.assign(Object.create(options), { fill: false }),
      viewMatrix
    )
  }

  _draw(
    ctx: CanvasRenderingContext2D,
    param: any,
    viewMatrix: Matrix,
    strokeMatrix: Matrix
  ) {
    const children = this._children
    // Return early if the compound path doesn't have any children:
    if (!children.length) return

    param = Object.assign(Object.create(param), {
      dontStart: true,
      dontFinish: true
    })
    ctx.beginPath()
    for (const child of children) {
      child.draw(ctx, param, strokeMatrix)
    }
    if (!param.clip) {
      this._paint(ctx, param, viewMatrix, strokeMatrix)
    }
  }

  _drawSelected(
    ctx: CanvasRenderingContext2D,
    matrix: Matrix,
    selectionItems: Record<string, Item>
  ) {
    for (const child of this._children) {
      const childMatrix = child._matrix
      // Do not draw this child now if it's separately marked as selected,
      // as it would be drawn twice otherwise.
      if (!selectionItems[child._id]) {
        child._drawSelected(
          ctx,
          childMatrix.isIdentity() ? matrix : matrix.appended(childMatrix)
        )
      }
    }
  }

  // NOTE: Documentation for these methods is found in PathItem, as they are
  // considered abstract methods of PathItem and need to be defined in all
  // implementing classes.
  moveTo(point: PointLike | number, y?: number) {
    const current = getCurrentPath(this)
    // Reuse current path if nothing was added yet
    const path = current?.isEmpty() ? current : new Path(Item.NO_INSERT)
    if (path !== current) {
      this.addChild(path)
    }
    path.moveTo(point, y)
  }

  moveBy(point: PointLike | number, y?: number) {
    const last = getCurrentPath(this, true).lastSegment
    const vector = Point.from(point, y)
    this.moveTo(last ? vector.add(last._point) : vector)
  }

  closePath(tolerance?: number) {
    getCurrentPath(this, true).closePath(tolerance)
  }

  // NOTE: Documentation is in PathItem
  simplify(options?: any): boolean {
    let res = false
    for (const child of this._children) {
      res = child.simplify(options) || res
    }
    return res
  }

  static {
    Object.assign(this.prototype, {
      _serializeFields: {
        ...PathItem.prototype._serializeFields,
        children: []
      }
    })

    // Redirect all other drawing commands to the current path:
    for (const key of [
      'lineTo', 'cubicCurveTo', 'quadraticCurveTo', 'curveTo', 'arcTo',
      'arcAround', 'arcTowards', 'lineBy', 'cubicCurveBy', 'quadraticCurveBy',
      'curveBy', 'arcBy'
    ]) {
      inject(this.prototype, {
        [key](...args: any[]) {
          getCurrentPath(this, true)[key](...args)
        }
      })
    }

    // Forward these methods to the child paths:
    for (const key of ['reverse', 'flatten', 'smooth']) {
      inject(this.prototype, {
        [key](param?: any) {
          for (const child of this._children) {
            child[key](param)
          }
        }
      })
    }
  }
}

// The drawing commands that are redirected to the current path, and the
// methods forwarded to the child paths. NOTE: Documentation is in PathItem.
export interface CompoundPath {
  lineTo(point: PointLike | number, y?: number): void
  cubicCurveTo(handle1: PointLike, handle2: PointLike, to: PointLike): void
  quadraticCurveTo(handle: PointLike, to: PointLike): void
  curveTo(through: PointLike, to: PointLike, time?: number): void
  arcTo(through: PointLike, to: PointLike): void
  arcTo(to: PointLike, clockwise?: boolean): void
  arcTo(
    to: PointLike,
    radius: SizeLike | number,
    rotation: number,
    clockwise: boolean,
    large: boolean
  ): void
  arcAround(center: PointLike, angle: number): void
  arcTowards(to: PointLike | number, y?: number): void
  lineBy(point: PointLike | number, y?: number): void
  cubicCurveBy(handle1: PointLike, handle2: PointLike, to: PointLike): void
  quadraticCurveBy(handle: PointLike, to: PointLike): void
  curveBy(through: PointLike, to: PointLike, time?: number): void
  arcBy(through: PointLike, to: PointLike): void
  arcBy(to: PointLike, clockwise?: boolean): void
  reverse(): void
  flatten(flatness?: number): void
  smooth(options?: object): void
}

// Returns the current path and checks if a moveTo() command is required
// first:
function getCurrentPath(compoundPath: CompoundPath, check?: boolean): Path {
  const children = compoundPath._children
  if (check && !children.length) {
    throw new Error('Use a moveTo() command first')
  }
  return children[children.length - 1]
}
