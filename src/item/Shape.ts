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
  Change,
  HitResult,
  Item,
  KAPPA,
  LinkedSize,
  Matrix,
  Path,
  Point,
  Rectangle,
  Size,
  defineDeprecatedConstructors,
  equals,
  isPlainObject,
  isRectangle,
  paper,
  readEllipse,
  readRectangle
} from '../internal.ts'
import type { PointLike } from '../basic/Point.ts'
import type { SizeLike } from '../basic/Size.ts'
import type { RectangleLike } from '../basic/Rectangle.ts'
import type { BoundsOptions } from './Item.ts'

export class Shape extends Item {
  // Not private, as hosted shells are created without the constructor, see
  // Item#_loadContent(), and read by the SVG export:
  _type: string
  _size: Size
  _radius: number | Size

  /**
   * Creates a circular shape item.
   *
   * @param center the center point of the circle
   * @param radius the radius of the circle
   * @return the newly created shape
   *
   * @example {@paperscript}
   * var shape = Shape.circle(new Point(80, 50), 30);
   * shape.strokeColor = 'black';
   */
  static circle(center: PointLike, radius: number): Shape
  /**
   * Creates a circular shape item from the properties described by an
   * object literal.
   *
   * @param object an object containing properties describing the shape's
   *     attributes
   * @return the newly created shape
   *
   * @example {@paperscript}
   * var shape = Shape.circle({
   *     center: [80, 50],
   *     radius: 30,
   *     strokeColor: 'black'
   * });
   */
  static circle(object: object): Shape
  static circle(center: any, radius?: number): Shape {
    const {
      center: point,
      radius: circleRadius,
      ...props
    } = isPlainObject(center) && radius === undefined
      ? center
      : { center, radius }
    return createShape(
      'circle',
      point,
      new Size(circleRadius * 2),
      circleRadius,
      props
    )
  }

  /**
   * Creates a rectangular shape item, with optionally rounded corners.
   *
   * @param rectangle the rectangle object describing the geometry of the
   *     rectangular shape to be created
   * @param [radius=null] the size of the rounded corners
   * @return the newly created shape
   *
   * @example {@paperscript}
   * var rectangle = new Rectangle(new Point(20, 20), new Size(60, 60));
   * var shape = Shape.rectangle(rectangle);
   * shape.strokeColor = 'black';
   *
   * @example {@paperscript} // The same, with rounder corners
   * var rectangle = new Rectangle(new Point(20, 20), new Size(60, 60));
   * var cornerSize = new Size(10, 10);
   * var shape = Shape.rectangle(rectangle, cornerSize);
   * shape.strokeColor = 'black';
   */
  static rectangle(rectangle: RectangleLike, radius?: SizeLike | number): Shape
  /**
   * Creates a rectangular shape item from a point and a size object.
   *
   * @param point the rectangle's top-left corner.
   * @param size the rectangle's size.
   * @return the newly created shape
   *
   * @example {@paperscript}
   * var point = new Point(20, 20);
   * var size = new Size(60, 60);
   * var shape = Shape.rectangle(point, size);
   * shape.strokeColor = 'black';
   */
  static rectangle(point: PointLike, size: SizeLike): Shape
  /**
   * Creates a rectangular shape item from the passed points. These do not
   * necessarily need to be the top left and bottom right corners, the
   * constructor figures out how to fit a rectangle between them.
   *
   * @param from the first point defining the rectangle
   * @param to the second point defining the rectangle
   * @return the newly created shape
   *
   * @example {@paperscript}
   * var from = new Point(20, 20);
   * var to = new Point(80, 80);
   * var shape = Shape.rectangle(from, to);
   * shape.strokeColor = 'black';
   */
  static rectangle(from: PointLike, to: PointLike): Shape
  /**
   * Creates a rectangular shape item from the properties described by an
   * object literal.
   *
   * @param object an object containing properties describing the shape's
   *     attributes
   * @return the newly created shape
   *
   * @example {@paperscript}
   * var shape = Shape.rectangle({
   *     point: [20, 20],
   *     size: [60, 60],
   *     strokeColor: 'black'
   * });
   *
   * @example {@paperscript}
   * var shape = Shape.rectangle({
   *     from: [20, 20],
   *     to: [80, 80],
   *     strokeColor: 'black'
   * });
   *
   * @example {@paperscript}
   * var shape = Shape.rectangle({
   *     rectangle: {
   *         topLeft: [20, 20],
   *         bottomRight: [80, 80]
   *     },
   *     strokeColor: 'black'
   * });
   *
   * @example {@paperscript}
   * var shape = Shape.rectangle({
   *     topLeft: [20, 20],
   *     bottomRight: [80, 80],
   *     radius: 10,
   *     strokeColor: 'black'
   * });
   */
  static rectangle(object: object): Shape
  static rectangle(rectangle: any, radius?: any): Shape {
    // A second argument is either the radius, or the size or the second point
    // if the first one is a point, not a rectangle:
    const { radius: cornerRadius, ...object } =
      isPlainObject(rectangle) && radius === undefined
        ? rectangle
        : radius === undefined || isRectangle(rectangle)
          ? { rectangle, radius }
          : { rectangle: new Rectangle(rectangle, radius) }
    const [rect, props] = readRectangle(object)
    const size = rect._getSize(true)
    return createShape(
      'rectangle',
      rect._getCenter(true),
      size,
      Size.min(new Size(cornerRadius ?? 0), size.divide(2)),
      props
    )
  }

  /**
   * Creates an elliptical shape item.
   *
   * @param rectangle the rectangle circumscribing the ellipse
   * @return the newly created shape
   *
   * @example {@paperscript}
   * var rectangle = new Rectangle(new Point(20, 20), new Size(180, 60));
   * var shape = Shape.ellipse(rectangle);
   * shape.fillColor = 'black';
   */
  static ellipse(rectangle: RectangleLike): Shape
  /**
   * Creates an elliptical shape item from the properties described by an
   * object literal.
   *
   * @param object an object containing properties describing the shape's
   *     attributes
   * @return the newly created shape
   *
   * @example {@paperscript}
   * var shape = Shape.ellipse({
   *     point: [20, 20],
   *     size: [180, 60],
   *     fillColor: 'black'
   * });
   *
   * @example {@paperscript} // Placing by center and radius
   * var shape = Shape.ellipse({
   *     center: [110, 50],
   *     radius: [90, 30],
   *     fillColor: 'black'
   * });
   */
  static ellipse(object: object): Shape
  static ellipse(rectangle: any): Shape {
    const { center, radius, props } = readEllipse(
      isPlainObject(rectangle) ? rectangle : { rectangle }
    )
    return createShape('ellipse', center, radius.multiply(2), radius, props)
  }

  /** @deprecated Use {@link Shape.circle()} instead. */
  declare static Circle: new (...args: any[]) => Shape
  /** @deprecated Use {@link Shape.rectangle()} instead. */
  declare static Rectangle: new (...args: any[]) => Shape
  /** @deprecated Use {@link Shape.ellipse()} instead. */
  declare static Ellipse: new (...args: any[]) => Shape

  // The factories above and JSON create shapes from their properties,
  // centered at the point:
  constructor(props?: object, point?: PointLike) {
    super()
    this._initialize(props, point)
  }

  _equals(item: Item): boolean {
    const shape = item as Shape
    return (
      this._type === shape._type &&
      this._size.equals(shape._size) &&
      // Radius can be a number or size:
      equals(this._radius, shape._radius)
    )
  }

  copyContent(source: this) {
    this.type = source._type
    this.size = source._size
    this.radius = source._radius
  }

  /**
   * The type of shape of the item as a string.
   *
   * @values 'rectangle', 'circle', 'ellipse'
   */
  get type(): string {
    return this._type
  }

  set type(type: string) {
    this._type = type
  }

  /**
   * The size of the shape.
   */
  get size(): Size {
    const size = this._size
    return new LinkedSize(size.width, size.height, this, 'size')
  }

  set size(value: SizeLike | number) {
    const size = Size.from(value)
    if (!this._size) {
      // First time, e.g. when reading from JSON...
      this._size = size.clone()
    } else if (!this._size.equals(size)) {
      const type = this._type
      let { width, height } = size
      if (type === 'rectangle') {
        // Shrink radius accordingly
        const radius = this._radius as Size
        radius.set(Size.min(radius, size.divide(2).abs()))
      } else if (type === 'circle') {
        // Use average of width and height as new size, then calculate
        // radius as a number from that:
        width = height = (width + height) / 2
        this._radius = width / 2
      } else if (type === 'ellipse') {
        // The radius is a size.
        ;(this._radius as Size)._set(width / 2, height / 2)
      }
      this._size._set(width, height)
      this._changed(Change.GEOMETRY)
    }
  }

  /**
   * The radius of the shape, as a number if it is a circle, or a size object
   * for ellipses and rounded rectangles.
   */
  get radius(): number | Size {
    const radius = this._radius
    return this._type === 'circle'
      ? radius
      : new LinkedSize(
          (radius as Size).width,
          (radius as Size).height,
          this,
          'radius'
        )
  }

  set radius(value: number | SizeLike) {
    const type = this._type
    if (type === 'circle') {
      if (value === this._radius) {
        return
      }
      const size = (value as number) * 2
      this._radius = value as number
      if (this._size) {
        this._size._set(size, size)
      } else {
        // First time, e.g. when no size was set before:
        this._size = new Size(size, size)
      }
    } else {
      const radius = Size.from(value as SizeLike)
      if (!this._radius) {
        // First time, e.g. when reading from JSON...
        this._radius = radius.clone()
      } else {
        const ownRadius = this._radius as Size
        if (ownRadius.equals(radius)) {
          return
        }
        ownRadius.set(radius)
        if (type === 'rectangle') {
          // Grow size accordingly
          this._size.set(Size.max(this._size, radius.multiply(2)))
        } else if (type === 'ellipse') {
          this._size._set(radius.width * 2, radius.height * 2)
        }
      }
    }
    this._changed(Change.GEOMETRY)
  }

  isEmpty(): boolean {
    // A shape can never be "empty" in the sense that it always holds a
    // definition. This is required for Group#bounds to work correctly when
    // containing a Shape.
    return false
  }

  /**
   * Creates a new path item with same geometry as this shape item, and
   * inherits all settings from it, similar to {@link Item#clone()}.
   *
   * @param [insert=true] specifies whether the new path should be inserted
   *     into the scene graph. When set to `true`, it is inserted above the
   *     shape item
   * @return the newly created path item with the same geometry as this shape
   *     item
   * @see Path#toShape(insert)
   */
  toPath(insert?: boolean): Path {
    const path = this._asPathItem()
    // Respect the setting of paper.settings.applyMatrix for new paths:
    if (paper.settings.applyMatrix) {
      path.applyMatrix = true
    }
    if (insert !== undefined ? insert : paper.settings.insertItems) {
      path.insertAbove(this)
    }
    return path
  }

  toShape(insert?: boolean): Shape {
    return this.clone(insert)
  }

  _asPathItem(): Path {
    const path = Path[this._type]({
      center: new Point(),
      size: this._size,
      radius: this._radius,
      insert: false
    })
    // The created path inherits #applyMatrix from this Shape, hence it
    // will always be false, as required by Item#_asPathItem().
    path.copyAttributes(this)
    return path
  }

  _draw(
    ctx: CanvasRenderingContext2D,
    param: any,
    viewMatrix: Matrix,
    strokeMatrix?: Matrix
  ) {
    const style = this._style
    const hasFill = style.hasFill()
    const hasStroke = style.hasStroke()
    const dontPaint = param.dontFinish || param.clip
    const untransformed = !strokeMatrix
    if (hasFill || hasStroke || dontPaint) {
      const type = this._type
      const radius = this._radius
      const isCircle = type === 'circle'
      if (!param.dontStart) {
        ctx.beginPath()
      }
      if (untransformed && isCircle) {
        ctx.arc(0, 0, radius as number, 0, Math.PI * 2, true)
      } else {
        const rx = isCircle ? (radius as number) : (radius as Size).width
        const ry = isCircle ? (radius as number) : (radius as Size).height
        const { width, height } = this._size
        if (untransformed && type === 'rectangle' && rx === 0 && ry === 0) {
          // Rectangles with no rounding
          ctx.rect(-width / 2, -height / 2, width, height)
        } else {
          // Round rectangles, ellipses, transformed circles
          const x = width / 2
          const y = height / 2
          // Use 1 - KAPPA to calculate position of control points
          // from the corners inwards.
          const kappa = 1 - KAPPA
          const cx = rx * kappa
          const cy = ry * kappa
          // Build the coordinates list, so it can optionally be
          // transformed by the strokeMatrix.
          // prettier-ignore
          const c = [
            -x, -y + ry,
            -x, -y + cy,
            -x + cx, -y,
            -x + rx, -y,
            x - rx, -y,
            x - cx, -y,
            x, -y + cy,
            x, -y + ry,
            x, y - ry,
            x, y - cy,
            x - cx, y,
            x - rx, y,
            -x + rx, y,
            -x + cx, y,
            -x, y - cy,
            -x, y - ry
          ]
          if (strokeMatrix) {
            strokeMatrix.transform(c, c, 32)
          }
          ctx.moveTo(c[0], c[1])
          ctx.bezierCurveTo(c[2], c[3], c[4], c[5], c[6], c[7])
          if (x !== rx) {
            ctx.lineTo(c[8], c[9])
          }
          ctx.bezierCurveTo(c[10], c[11], c[12], c[13], c[14], c[15])
          if (y !== ry) {
            ctx.lineTo(c[16], c[17])
          }
          ctx.bezierCurveTo(c[18], c[19], c[20], c[21], c[22], c[23])
          if (x !== rx) {
            ctx.lineTo(c[24], c[25])
          }
          ctx.bezierCurveTo(c[26], c[27], c[28], c[29], c[30], c[31])
        }
      }
      ctx.closePath()
    }
    if (!dontPaint) {
      this._paint(ctx, param, viewMatrix, strokeMatrix)
    }
  }

  _canComposite(): boolean {
    // A path with only a fill or a stroke can be directly blended, but if it
    // has both, it needs to be drawn into a separate canvas first.
    return !(this.hasFill() && this.hasStroke())
  }

  _getBounds(matrix: Matrix, options: BoundsOptions): Rectangle {
    // set() may transform the shape before it sets its size:
    const { width, height } = this._size ?? new Size()
    let rect = new Rectangle(-width / 2, -height / 2, width, height)
    const style = this._style
    const strokeRadius = (
      options.stroke &&
      style.hasStroke() &&
      style.strokeWidth / 2
    )
    // If we're getting the strokeBounds, include the stroke width before
    // or after transforming the rect, based on strokeScaling.
    if (matrix) {
      if (this._type === 'rectangle') {
        rect = matrix._transformBounds(rect)
      } else {
        // Use the exact bounds of the transformed ellipse, the unit circle
        // transformed by the matrix scaled to its radii:
        const [x, y] = Matrix._getCircleExtents(
          1,
          matrix.clone().scale(width / 2, height / 2)
        )
        rect = new Rectangle(matrix._tx - x, matrix._ty - y, x * 2, y * 2)
      }
    }
    return strokeRadius
      ? rect.expand(
          new Size(
            Matrix._getCircleExtents(
              strokeRadius,
              this._getStrokeMatrix(matrix, options)
            )
          ).multiply(2)
        )
      : rect
  }

  _contains(point: Point): boolean {
    if (this._type === 'rectangle') {
      const center = getCornerCenter(this, point)
      return center
        ? // If there's a quarter ellipse center, use the same check as for
          // ellipses below.
          point.subtract(center).divide(this._radius as Size).length <= 1
        : super._contains(point)
    } else {
      return point.divide(this.size).length <= 0.5
    }
  }

  _hitTestSelf(
    point: Point,
    options: Record<string, any>,
    viewMatrix?: Matrix,
    strokeMatrix?: Matrix
  ): HitResult | null {
    // Hit-test the shape as its path, see #toPath(), which measures strokes
    // and tolerance where they're drawn (#2334), but without its segments,
    // handles and curves, which shapes don't have:
    const hit = this._asPathItem()._hitTestSelf(
      point,
      Object.assign(Object.create(options), {
        segments: false,
        handles: false,
        ends: false,
        curves: false,
        all: false
      }),
      viewMatrix,
      strokeMatrix
    )
    return hit && new HitResult((hit as HitResult).type, this)
  }

  static {
    defineDeprecatedConstructors(this, ['circle', 'rectangle', 'ellipse'])
    Object.assign(this.prototype, {
      _applyMatrix: false,
      _canApplyMatrix: false,
      _canScaleStroke: true,
      _serializeFields: {
        ...Item.prototype._serializeFields,
        type: null,
        size: null,
        radius: null
      },
      // Prioritize `type` over `radius`, which depends on it:
      _prioritize: ['type']
    })
  }
}

function createShape(
  type: string,
  center: PointLike,
  size: Size,
  radius: number | Size,
  props: object
): Shape {
  // The geometry overrides what the properties hold for it, e.g. the
  // undefined size of Path#toShape(). #_prioritize sets the type first:
  return new Shape({ ...props, type, size, radius }, center)
}

// Returns the center of the quarter corner ellipse for rounded rectangle, if
// the point lies within its bounding box.
function getCornerCenter(shape: Shape, point: Point): Point | undefined {
  const radius = shape._radius as Size
  if (!radius.isZero()) {
    const halfSize = shape._size.divide(2)
    for (let q = 1; q <= 4; q++) {
      // Calculate the bounding boxes of the four quarter ellipses that
      // define the rounded rectangle, and hit-test these.
      // Setup `dir` to be in quadrant `q` (See Point#isInQuadrant()):
      const dir = new Point(q > 1 && q < 4 ? -1 : 1, q > 2 ? -1 : 1)
      const corner = dir.multiply(halfSize)
      const center = corner.subtract(dir.multiply(radius))
      const rect = new Rectangle(corner, center)
      if (rect.contains(point)) {
        return center
      }
    }
  }
}
