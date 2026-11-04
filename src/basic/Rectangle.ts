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
  Formatter,
  ItemSelection,
  LinkedPoint,
  LinkedSize,
  Point,
  Size,
  capitalize,
  inject,
  isPlainObject
} from '../internal.ts'
import type { PointLike } from './Point.ts'
import type { SizeLike } from './Size.ts'

/**
 * What a rectangle can be passed as, where a function takes one.
 */
export type RectangleLike =
  | Rectangle
  | number[]
  | { x: number; y: number; width: number; height: number }
  | { point: PointLike; size: SizeLike }
  | { from: PointLike; to: PointLike }
  // Any other combination of the rectangle's properties, e.g.
  // `{ center, size }`:
  | { [key: string]: number | PointLike | SizeLike }

/**
 * A Rectangle specifies an area that is enclosed by it's top-left point (x,
 * y), its width, and its height. It should not be confused with a rectangular
 * path, it is not an item.
 *
 * Wherever a rectangle is the only argument of a function, it can also be
 * passed in any of the forms that the {@link Rectangle()} constructors take,
 * e.g. `rect.unite(0, 0, 10, 10)`.
 */
export class Rectangle extends Base {
  /**
   * The x position of the rectangle.
   */
  declare x: number

  /**
   * The y position of the rectangle.
   */
  declare y: number

  /**
   * The width of the rectangle.
   */
  declare width: number

  /**
   * The height of the rectangle.
   */
  declare height: number

  /**
   * Creates a Rectangle object.
   *
   * @param point the top-left point of the rectangle
   * @param size the size of the rectangle
   */
  constructor(point: PointLike, size: SizeLike)
  /**
   * Creates a Rectangle object.
   *
   * @param object an object containing properties to be set on the
   * rectangle
   *
   * @example // Create a rectangle between {x: 20, y: 20} and {x: 80, y:80}
   * var rectangle = new Rectangle({
   *     point: [20, 20],
   *     size: [60, 60]
   * });
   *
   * @example // Create a rectangle between {x: 20, y: 20} and {x: 80, y:80}
   * var rectangle = new Rectangle({
   *     from: [20, 20],
   *     to: [80, 80]
   * });
   */
  constructor(object: Exclude<RectangleLike, Rectangle | number[]>)
  /**
   * Creates a rectangle object.
   *
   * @param x the left coordinate
   * @param y the top coordinate
   * @param width
   * @param height
   */
  constructor(x: number, y: number, width: number, height: number)
  /**
   * Creates a rectangle object from the passed points. These do not
   * necessarily need to be the top left and bottom right corners, the
   * constructor figures out how to fit a rectangle between them.
   *
   * @param from the first point defining the rectangle
   * @param to the second point defining the rectangle
   */
  constructor(from: PointLike, to: PointLike)
  /**
   * Creates a new rectangle object from the passed rectangle object.
   *
   * @param rectangle
   */
  constructor(rectangle?: Rectangle)
  /**
   * Creates a Rectangle object from any of the values that a function taking
   * a rectangle accepts, as {@link Rectangle.from()} does.
   *
   * @param rect
   * @param y
   * @param width
   * @param height
   */
  constructor(
    rect: RectangleLike | PointLike | number,
    y?: PointLike | SizeLike | number,
    width?: number,
    height?: number
  )
  constructor(
    x?: RectangleLike | PointLike | number,
    y?: PointLike | SizeLike | number,
    width?: number,
    height?: number
  ) {
    super()
    this.set(x, y, width, height)
  }

  /**
   * Sets the rectangle to the passed values. Note that any sequence of
   * parameters that is supported by the various {@link Rectangle()}
   * constructors also work for calls of `set()`.
   *
   * @param values
   */
  set(
    arg0?: RectangleLike | PointLike | number,
    arg1?: PointLike | SizeLike | number,
    arg2?: number,
    arg3?: number
  ): this {
    if (typeof arg0 === 'number') {
      this._set(arg0, arg1 as number, arg2, arg3)
    } else if (arg0 === undefined || arg0 === null) {
      this._set(0, 0, 0, 0)
    } else if (arg1 !== undefined) {
      // A second point makes it (from, to), anything else (point, size):
      const next: any = arg1
      if (next.x !== undefined) {
        this.#setFromTo(arg0 as PointLike, next)
      } else {
        const { x, y } = Point.from(arg0 as PointLike)
        const { width, height } = Size.from(next)
        this._set(x, y, width, height)
      }
    } else {
      const obj: any = arg0
      if (Array.isArray(obj)) {
        this._set(obj[0], obj[1], obj[2], obj[3])
      } else if (obj.x !== undefined || obj.width !== undefined) {
        // Another rectangle or a simple object literal describing one. Use
        // duck typing, and 0 as defaults.
        this._set(obj.x || 0, obj.y || 0, obj.width || 0, obj.height || 0)
      } else if (obj.from !== undefined || obj.to !== undefined) {
        this.#setFromTo(obj.from, obj.to)
      } else {
        // Any other combination of the rectangle's properties:
        const { x, y, width, height } = new RectangleBuilder(obj)
        this._set(x, y, width, height)
      }
    }
    return this
  }

  #setFromTo(from: PointLike, to: PointLike) {
    let { x, y } = Point.from(from)
    const point = Point.from(to)
    let width = point.x - x
    let height = point.y - y
    // Check if horizontal or vertical order needs to be reversed.
    if (width < 0) {
      x = point.x
      width = -width
    }
    if (height < 0) {
      y = point.y
      height = -height
    }
    this._set(x, y, width, height)
  }

  // See Point#_set() for an explanation of _set():
  _set(x: number, y: number, width: number, height: number): this {
    this.x = x
    this.y = y
    this.width = width
    this.height = height
    return this
  }

  /**
   * Returns a copy of the rectangle.
   */
  clone(): Rectangle {
    return new Rectangle(this.x, this.y, this.width, this.height)
  }

  /**
   * Checks whether the coordinates and size of the rectangle are equal to
   * that of the supplied rectangle.
   *
   * @param rect
   * @return {@true if the rectangles are equal}
   */
  equals(rect: any): boolean {
    const other =
      Array.isArray(rect) || isPlainObject(rect) ? Rectangle.from(rect) : rect
    return !!(
      other === this || (
        other &&
        this.x === other.x &&
        this.y === other.y &&
        this.width === other.width &&
        this.height === other.height
      )
    )
  }

  /**
   * @return a string representation of this rectangle
   */
  toString(): string {
    const { instance } = Formatter
    return (
      `{ x: ${instance.number(this.x)}, y: ${instance.number(this.y)}, ` +
      `width: ${instance.number(this.width)}, ` +
      `height: ${instance.number(this.height)} }`
    )
  }

  _serialize(options: { formatter: Formatter }): number[] {
    const { formatter } = options
    // See Point#_serialize()
    return [
      formatter.number(this.x),
      formatter.number(this.y),
      formatter.number(this.width),
      formatter.number(this.height)
    ]
  }

  /**
   * The rectangle's position and size as an array,
   * `[x, y, width, height]`, as {@link Matrix#values} gives those of a
   * matrix.
   */
  get values(): number[] {
    return [this.x, this.y, this.width, this.height]
  }

  /**
   * The top-left point of the rectangle. Setting it moves the whole
   * rectangle, unlike {@link #topLeft}.
   */
  get point(): Point {
    return this._getPoint()
  }

  set point(point: PointLike) {
    const { x, y } = Point.from(point)
    this.x = x
    this.y = y
  }

  _getPoint(_dontLink?: boolean): Point {
    return _dontLink
      ? new Point(this.x, this.y)
      : new LinkedPoint(this.x, this.y, this, 'point')
  }

  /**
   * The size of the rectangle
   */
  get size(): Size {
    return this._getSize()
  }

  set size(size: SizeLike) {
    const { width, height } = Size.from(size)
    this.width = width
    this.height = height
  }

  _getSize(_dontLink?: boolean): Size {
    return _dontLink
      ? new Size(this.width, this.height)
      : new LinkedSize(this.width, this.height, this, 'size')
  }

  /**
   * {@grouptitle Side Positions}
   *
   * The position of the left hand side of the rectangle. Note that this
   * doesn't move the whole rectangle; the right hand side stays where it was.
   */
  get left(): number {
    return this.x
  }

  set left(left: number) {
    this.width -= left - this.x
    this.x = left
  }

  /**
   * The top coordinate of the rectangle. Note that this doesn't move the
   * whole rectangle: the bottom won't move.
   */
  get top(): number {
    return this.y
  }

  set top(top: number) {
    this.height -= top - this.y
    this.y = top
  }

  /**
   * The position of the right hand side of the rectangle. Note that this
   * doesn't move the whole rectangle; the left hand side stays where it was.
   */
  get right(): number {
    return this.x + this.width
  }

  set right(right: number) {
    this.width = right - this.x
  }

  /**
   * The bottom coordinate of the rectangle. Note that this doesn't move the
   * whole rectangle: the top won't move.
   */
  get bottom(): number {
    return this.y + this.height
  }

  set bottom(bottom: number) {
    this.height = bottom - this.y
  }

  /**
   * The center-x coordinate of the rectangle. Setting it moves the whole
   * rectangle horizontally.
   *
   * @ignore
   */
  get centerX(): number {
    return this.x + this.width / 2
  }

  set centerX(x: number) {
    this.x = x - this.width / 2
  }

  /**
   * The center-y coordinate of the rectangle. Setting it moves the whole
   * rectangle vertically.
   *
   * @ignore
   */
  get centerY(): number {
    return this.y + this.height / 2
  }

  set centerY(y: number) {
    this.y = y - this.height / 2
  }

  /**
   * {@grouptitle Corner and Center Point Positions}
   *
   * The center point of the rectangle. Setting it moves the whole rectangle.
   */
  get center(): Point {
    return this._getCenter()
  }

  set center(point: PointLike) {
    const { x, y } = Point.from(point)
    this.centerX = x
    this.centerY = y
  }

  _getCenter(_dontLink?: boolean): Point {
    return _dontLink
      ? new Point(this.centerX, this.centerY)
      : new LinkedPoint(this.centerX, this.centerY, this, 'center')
  }

  /**
   * The area of the rectangle.
   */
  get area(): number {
    return this.width * this.height
  }

  /**
   * @return {@true if the rectangle is empty}
   */
  isEmpty(): boolean {
    return this.width === 0 || this.height === 0
  }

  /**
   * {@grouptitle Geometric Tests}
   *
   * Tests if the specified point is inside the boundary of the rectangle.
   *
   * @param point the specified point
   * @return {@true if the point is inside the rectangle's boundary}
   *
   * @example {@paperscript}
   * // Checking whether the mouse position falls within the bounding
   * // rectangle of an item:
   *
   * // Create a circle shaped path at {x: 80, y: 50}
   * // with a radius of 30.
   * var circle = Path.circle(new Point(80, 50), 30);
   * circle.fillColor = 'red';
   *
   * function onMouseMove(event) {
   *     // Check whether the mouse position intersects with the
   *     // bounding box of the item:
   *     if (circle.bounds.contains(event.point)) {
   *         // If it intersects, fill it with green:
   *         circle.fillColor = 'green';
   *     } else {
   *         // If it doesn't intersect, fill it with red:
   *         circle.fillColor = 'red';
   *     }
   * }
   */
  contains(point: PointLike | number, y?: number): boolean
  /**
   * Tests if the interior of the rectangle entirely contains the specified
   * rectangle.
   *
   * @param rect the specified rectangle
   * @return {@true if the rectangle entirely contains the specified
   * rectangle}
   *
   * @example {@paperscript}
   * // Checking whether the bounding box of one item is contained within
   * // that of another item:
   *
   * // All newly created paths will inherit these styles:
   * project.currentStyle = {
   *     fillColor: 'green',
   *     strokeColor: 'black'
   * };
   *
   * // Create a circle shaped path at {x: 80, y: 50}
   * // with a radius of 45.
   * var largeCircle = Path.circle(new Point(80, 50), 45);
   *
   * // Create a smaller circle shaped path in the same position
   * // with a radius of 30.
   * var circle = Path.circle(new Point(80, 50), 30);
   *
   * function onMouseMove(event) {
   *     // Move the circle to the position of the mouse:
   *     circle.position = event.point;
   *
   *     // Check whether the bounding box of the smaller circle
   *     // is contained within the bounding box of the larger item:
   *     if (largeCircle.bounds.contains(circle.bounds)) {
   *         // If it does, fill it with green:
   *         circle.fillColor = 'green';
   *         largeCircle.fillColor = 'green';
   *     } else {
   *         // If doesn't, fill it with red:
   *         circle.fillColor = 'red';
   *         largeCircle.fillColor = 'red';
   *     }
   * }
   */
  contains(
    rect: RectangleLike | number,
    y?: number,
    width?: number,
    height?: number
  ): boolean
  contains(
    arg: RectangleLike | PointLike | number,
    y?: number,
    width?: number,
    height?: number
  ): boolean {
    // Detect rectangles either by checking for 'width' on the passed object
    // or by looking at the amount of values passed, as numbers or an array:
    const obj: any = arg
    return (
      obj?.width !== undefined ||
      Array.isArray(obj) && obj.length === 4 ||
      width !== undefined
    )
      ? this.#containsRectangle(Rectangle.from(arg, y, width, height))
      : this._containsPoint(Point.from(arg as PointLike, y))
  }

  _containsPoint(point: Point): boolean {
    const { x, y } = point
    return (
      x >= this.x &&
      y >= this.y &&
      x <= this.x + this.width &&
      y <= this.y + this.height
    )
  }

  #containsRectangle(rect: Rectangle): boolean {
    const { x, y } = rect
    return (
      x >= this.x &&
      y >= this.y &&
      x + rect.width <= this.x + this.width &&
      y + rect.height <= this.y + this.height
    )
  }

  /**
   * Tests if the interior of this rectangle intersects the interior of
   * another rectangle. Rectangles just touching each other are considered as
   * non-intersecting, except if a `epsilon` value is specified by which this
   * rectangle's dimensions are increased before comparing.
   *
   * @param rect the specified rectangle
   * @param epsilon the epsilon against which to compare the
   *     rectangle's dimensions
   * @return {@true if the rectangle and the specified rectangle
   *     intersect each other}
   *
   * @example {@paperscript}
   * // Checking whether the bounding box of one item intersects with
   * // that of another item:
   *
   * // All newly created paths will inherit these styles:
   * project.currentStyle = {
   *     fillColor: 'green',
   *     strokeColor: 'black'
   * };
   *
   * // Create a circle shaped path at {x: 80, y: 50}
   * // with a radius of 45.
   * var largeCircle = Path.circle(new Point(80, 50), 45);
   *
   * // Create a smaller circle shaped path in the same position
   * // with a radius of 30.
   * var circle = Path.circle(new Point(80, 50), 30);
   *
   * function onMouseMove(event) {
   *     // Move the circle to the position of the mouse:
   *     circle.position = event.point;
   *
   *     // Check whether the bounding box of the two circle
   *     // shaped paths intersect:
   *     if (largeCircle.bounds.intersects(circle.bounds)) {
   *         // If it does, fill it with green:
   *         circle.fillColor = 'green';
   *         largeCircle.fillColor = 'green';
   *     } else {
   *         // If doesn't, fill it with red:
   *         circle.fillColor = 'red';
   *         largeCircle.fillColor = 'red';
   *     }
   * }
   */
  intersects(rect: RectangleLike, epsilon = 0): boolean {
    const other = Rectangle.from(rect)
    return (
      other.x + other.width > this.x - epsilon &&
      other.y + other.height > this.y - epsilon &&
      other.x < this.x + this.width + epsilon &&
      other.y < this.y + this.height + epsilon
    )
  }

  /**
   * {@grouptitle Boolean Operations}
   *
   * Returns a new rectangle representing the intersection of this rectangle
   * with the specified rectangle.
   *
   * @param rect the rectangle to be intersected with this
   * rectangle
   * @return the largest rectangle contained in both the specified
   * rectangle and in this rectangle
   *
   * @example {@paperscript}
   * // Intersecting two rectangles and visualizing the result using rectangle
   * // shaped paths:
   *
   * // Create two rectangles that overlap each other
   * var size = new Size(50, 50);
   * var rectangle1 = new Rectangle(new Point(25, 15), size);
   * var rectangle2 = new Rectangle(new Point(50, 40), size);
   *
   * // The rectangle that represents the intersection of the
   * // two rectangles:
   * var intersected = rectangle1.intersect(rectangle2);
   *
   * // To visualize the intersecting of the rectangles, we will
   * // create rectangle shaped paths using Path.rectangle()
   * // constructor.
   *
   * // Have all newly created paths inherit a black stroke:
   * project.currentStyle.strokeColor = 'black';
   *
   * // Create two rectangle shaped paths using the abstract rectangles
   * // we created before:
   * Path.rectangle(rectangle1);
   * Path.rectangle(rectangle2);
   *
   * // Create a path that represents the intersected rectangle,
   * // and fill it with red:
   * var intersectionPath = Path.rectangle(intersected);
   * intersectionPath.fillColor = 'red';
   */
  intersect(
    rect: RectangleLike | PointLike | number,
    y?: PointLike | SizeLike | number,
    width?: number,
    height?: number
  ): Rectangle {
    const other = Rectangle.from(rect, y, width, height)
    const x1 = Math.max(this.x, other.x)
    const y1 = Math.max(this.y, other.y)
    const x2 = Math.min(this.x + this.width, other.x + other.width)
    const y2 = Math.min(this.y + this.height, other.y + other.height)
    return new Rectangle(x1, y1, x2 - x1, y2 - y1)
  }

  /**
   * Returns a new rectangle representing the union of this rectangle with the
   * specified rectangle.
   *
   * @param rect the rectangle to be combined with this rectangle
   * @return the smallest rectangle containing both the specified
   * rectangle and this rectangle
   */
  unite(
    rect: RectangleLike | PointLike | number,
    y?: PointLike | SizeLike | number,
    width?: number,
    height?: number
  ): Rectangle {
    const other = Rectangle.from(rect, y, width, height)
    const x1 = Math.min(this.x, other.x)
    const y1 = Math.min(this.y, other.y)
    const x2 = Math.max(this.x + this.width, other.x + other.width)
    const y2 = Math.max(this.y + this.height, other.y + other.height)
    return new Rectangle(x1, y1, x2 - x1, y2 - y1)
  }

  /**
   * Adds a point to this rectangle. The resulting rectangle is the smallest
   * rectangle that contains both the original rectangle and the specified
   * point.
   *
   * After adding a point, a call to {@link #contains(point)} with the added
   * point as an argument does not necessarily return `true`. The {@link
   * Rectangle#contains(point)} method does not return `true` for points on
   * the right or bottom edges of a rectangle. Therefore, if the added point
   * falls on the left or bottom edge of the enlarged rectangle, {@link
   * Rectangle#contains(point)} returns `false` for that point.
   *
   * @param point
   * @return the smallest rectangle that contains both the
   * original rectangle and the specified point
   */
  include(point: PointLike | number, y?: number): Rectangle {
    const other = Point.from(point, y)
    const x1 = Math.min(this.x, other.x)
    const y1 = Math.min(this.y, other.y)
    const x2 = Math.max(this.x + this.width, other.x)
    const y2 = Math.max(this.y + this.height, other.y)
    return new Rectangle(x1, y1, x2 - x1, y2 - y1)
  }

  /**
   * Returns a new rectangle expanded by the specified amount in horizontal
   * and vertical directions.
   *
   * @param amount the amount to expand the rectangle in
   * both directions
   * @return the expanded rectangle
   */
  expand(amount: SizeLike | number): Rectangle
  /**
   * Returns a new rectangle expanded by the specified amounts in horizontal
   * and vertical directions.
   *
   * @param hor the amount to expand the rectangle in horizontal
   * direction
   * @param ver the amount to expand the rectangle in vertical
   * direction
   * @return the expanded rectangle
   */
  expand(hor: number, ver: number): Rectangle
  expand(amount: SizeLike | number, ver?: number): Rectangle {
    const { width, height } = Size.from(amount, ver)
    return new Rectangle(
      this.x - width / 2,
      this.y - height / 2,
      this.width + width,
      this.height + height
    )
  }

  /**
   * Returns a new rectangle scaled by the specified factor from its center,
   * or from the given center point.
   *
   * @param scale the scale factor
   * @param center
   * @return the scaled rectangle
   */
  scale(scale: PointLike | number, center?: PointLike): Rectangle
  /**
   * Returns a new rectangle scaled in horizontal direction by the specified
   * `hor` factor and in vertical direction by the specified `ver` factor
   * from its center, or from the given center point.
   *
   * @param hor the horizontal scale factor
   * @param ver the vertical scale factor
   * @param center
   * @return the scaled rectangle
   */
  scale(hor: number, ver: number, center?: PointLike): Rectangle
  scale(
    hor: PointLike | number,
    ver?: PointLike | number,
    center?: PointLike | number
  ): Rectangle {
    const hasVer = typeof ver === 'number'
    const scale = Point.from(hor, hasVer ? ver : undefined)
    const origin = Point.from((hasVer ? center : ver) ?? this._getCenter(true))
    // Scale the corners from the center, which also normalizes the
    // rectangle for negative amounts:
    return new Rectangle(
      this._getTopLeft(true).subtract(origin).multiply(scale).add(origin),
      this._getBottomRight(true).subtract(origin).multiply(scale).add(origin)
    )
  }

  /**
   * Returns the passed rectangle if it is one already, or else a new
   * rectangle created from the passed values, as {@link Rectangle()} reads
   * them.
   *
   * @param rect
   * @param y
   * @param width
   * @param height
   */
  static from(
    rect: RectangleLike | PointLike | number,
    y?: PointLike | SizeLike | number,
    width?: number,
    height?: number
  ): Rectangle {
    return rect instanceof Rectangle
      ? rect
      : new Rectangle(rect, y, width, height)
  }

  static {
    // Inject the corners and the centers of the sides from their x and y
    // parts, as accessors and as _get…(_dontLink) methods:
    const corners = {
      topLeft: ['left', 'top'],
      topRight: ['right', 'top'],
      bottomLeft: ['left', 'bottom'],
      bottomRight: ['right', 'bottom'],
      leftCenter: ['left', 'centerY'],
      topCenter: ['centerX', 'top'],
      rightCenter: ['right', 'centerY'],
      bottomCenter: ['centerX', 'bottom']
    }
    for (const [key, [keyX, keyY]] of Object.entries(corners)) {
      const getter = `_get${capitalize(key)}`
      inject(this.prototype, {
        [getter](_dontLink?: boolean) {
          return _dontLink
            ? new Point(this[keyX], this[keyY])
            : new LinkedPoint(this[keyX], this[keyY], this, key)
        },
        get [key]() {
          return this[getter]()
        },
        set [key](point: PointLike) {
          const { x, y } = Point.from(point)
          this[keyX] = x
          this[keyY] = y
        }
      })
    }
  }
}

// The members defined at runtime rather than in the class body:
export interface Rectangle {
  /**
   * The top-left point of the rectangle. Note that this doesn't move the
   * whole rectangle; the bottom-right corner stays where it was.
   */
  get topLeft(): Point
  set topLeft(point: PointLike)

  /**
   * The top-right point of the rectangle. Note that this doesn't move the
   * whole rectangle; the bottom-left corner stays where it was.
   */
  get topRight(): Point
  set topRight(point: PointLike)

  /**
   * The bottom-left point of the rectangle. Note that this doesn't move the
   * whole rectangle; the top-right corner stays where it was.
   */
  get bottomLeft(): Point
  set bottomLeft(point: PointLike)

  /**
   * The bottom-right point of the rectangle. Note that this doesn't move the
   * whole rectangle; the top-left corner stays where it was.
   */
  get bottomRight(): Point
  set bottomRight(point: PointLike)

  /**
   * The left-center point of the rectangle. Setting it moves the left hand
   * side while the right hand side stays where it was, and moves the whole
   * rectangle vertically.
   */
  get leftCenter(): Point
  set leftCenter(point: PointLike)

  /**
   * The top-center point of the rectangle. Setting it moves the top while
   * the bottom stays where it was, and moves the whole rectangle
   * horizontally.
   */
  get topCenter(): Point
  set topCenter(point: PointLike)

  /**
   * The right-center point of the rectangle. Setting it moves the right
   * hand side while the left hand side stays where it was, and moves the
   * whole rectangle vertically.
   */
  get rightCenter(): Point
  set rightCenter(point: PointLike)

  /**
   * The bottom-center point of the rectangle. Setting it moves the bottom
   * while the top stays where it was, and moves the whole rectangle
   * horizontally.
   */
  get bottomCenter(): Point
  set bottomCenter(point: PointLike)

  _getTopLeft(_dontLink?: boolean): Point
  _getTopRight(_dontLink?: boolean): Point
  _getBottomLeft(_dontLink?: boolean): Point
  _getBottomRight(_dontLink?: boolean): Point
  _getLeftCenter(_dontLink?: boolean): Point
  _getTopCenter(_dontLink?: boolean): Point
  _getRightCenter(_dontLink?: boolean): Point
  _getBottomCenter(_dontLink?: boolean): Point
}

/**
 * An internal version of Rectangle that notifies its owner of each change
 * through setting itself again on the property that produced it.
 *
 * @private
 */
export class LinkedRectangle extends Rectangle {
  #x: number
  #y: number
  #width: number
  #height: number
  #owner: any
  #key: string

  constructor(
    x: number, y: number,
    width: number, height: number,
    owner: any, key: string
  ) {
    super()
    this.#x = x
    this.#y = y
    this.#width = width
    this.#height = height
    this.#owner = owner
    this.#key = key
  }

  // See Point#_set() for an explanation of _set():
  _set(
    x: number, y: number,
    width: number, height: number,
    _dontNotify?: boolean
  ): this {
    // Rectangle's constructor calls this before the private fields exist, and
    // the constructor above sets them:
    if (#x in this) {
      this.#x = x
      this.#y = y
      this.#width = width
      this.#height = height
      if (!_dontNotify) {
        this.#owner[this.#key] = this
      }
    }
    return this
  }

  // @ts-expect-error: Rectangle declares x as a field, LinkedRectangle reads #x
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

  // @ts-expect-error: See x
  get width(): number {
    return this.#width
  }

  set width(width: number) {
    this.#width = width
    this.#owner[this.#key] = this
  }

  // @ts-expect-error: See x
  get height(): number {
    return this.#height
  }

  set height(height: number) {
    this.#height = height
    this.#owner[this.#key] = this
  }

  /**
   * {@grouptitle Item Bounds}
   *
   * Specifies whether an item's bounds are to appear as selected.
   *
   * Paper.js draws the bounds of items with selected bounds on top of
   * your project. This is very useful when debugging.
   *
   * This property is only available on the rectangles returned by
   * {@link Item#bounds} and {@link Item#strokeBounds}, which are
   * selected independently of each other, each showing its own
   * bounds. Rectangles returned by other getters such as {@link
   * Item#handleBounds} don't have it.
   *
   * @default false
   *
   * @example {@paperscript}
   * var path = Path.circle({
   *     center: [80, 50],
   *     radius: 40,
   *     selected: true
   * });
   *
   * path.bounds.selected = true;
   */
  get selected(): boolean {
    return !!(this.#owner._selection & this.#getSelection())
  }

  set selected(selected: boolean) {
    const owner = this.#owner
    if (owner._changeSelection) {
      owner._changeSelection(this.#getSelection(), selected)
    }
  }

  #getSelection(): number {
    return this.#key === 'strokeBounds'
      ? ItemSelection.STROKE_BOUNDS
      : ItemSelection.BOUNDS
  }

  static {
    // Have the properties derived from x, y, width and height change a plain
    // copy, so the owner is notified only once per change:
    const keys = [
      'point', 'size', 'center', 'left', 'top', 'right', 'bottom',
      'centerX', 'centerY', 'topLeft', 'topRight', 'bottomLeft',
      'bottomRight', 'leftCenter', 'topCenter', 'rightCenter',
      'bottomCenter'
    ]
    for (const key of keys) {
      const { get } = Object.getOwnPropertyDescriptor(Rectangle.prototype, key)
      inject(this.prototype, {
        get [key]() {
          return get.call(this)
        },
        set [key](value) {
          const rect = this.clone()
          rect[key] = value
          this._set(rect.x, rect.y, rect.width, rect.height)
        }
      })
    }
  }
}

// Reads object literals such as `{ right: 100, width: 50 }` in any order: The
// first side or center set per axis moves the rectangle and keeps its size,
// further ones change the size.
class RectangleBuilder extends Rectangle {
  // #fixWidth / #fixHeight protect the width / height against changes. They
  // are on by default, and switched off once properties are used that change
  // the outside of the rectangle, so combinations of: left / top / right /
  // bottom.
  // #anchorX / #anchorY can either be 0 (left), 0.5 (center) or 1 (right),
  // and are used as direct factors to calculate the x / y adjustments from
  // the size differences.
  #fixWidth = true
  #fixHeight = true
  #anchorX = 0
  #anchorY = 0

  constructor(object: object) {
    super()
    // Set the supported properties in the order of the object:
    for (const [key, value] of Object.entries(object)) {
      if (key in this && value !== undefined) {
        this[key] = value
      }
    }
  }

  get size(): Size {
    return super.size
  }

  set size(size: SizeLike) {
    const { width, height } = Size.from(size)
    if (this.#anchorX) {
      this.x += (this.width - width) * this.#anchorX
    }
    if (this.#anchorY) {
      this.y += (this.height - height) * this.#anchorY
    }
    this.width = width
    this.height = height
    this.#fixWidth = this.#fixHeight = true
  }

  get left(): number {
    return super.left
  }

  set left(left: number) {
    if (!this.#fixWidth) {
      const amount = left - this.x
      this.width -= this.#anchorX === 0.5 ? amount * 2 : amount
    }
    this.x = left
    this.#anchorX = 0
    this.#fixWidth = false
  }

  get top(): number {
    return super.top
  }

  set top(top: number) {
    if (!this.#fixHeight) {
      const amount = top - this.y
      this.height -= this.#anchorY === 0.5 ? amount * 2 : amount
    }
    this.y = top
    this.#anchorY = 0
    this.#fixHeight = false
  }

  get right(): number {
    return super.right
  }

  set right(right: number) {
    if (!this.#fixWidth) {
      const amount = right - this.x
      this.width = this.#anchorX === 0.5 ? amount * 2 : amount
    }
    this.x = right - this.width
    this.#anchorX = 1
    this.#fixWidth = false
  }

  get bottom(): number {
    return super.bottom
  }

  set bottom(bottom: number) {
    if (!this.#fixHeight) {
      const amount = bottom - this.y
      this.height = this.#anchorY === 0.5 ? amount * 2 : amount
    }
    this.y = bottom - this.height
    this.#anchorY = 1
    this.#fixHeight = false
  }

  get centerX(): number {
    return super.centerX
  }

  set centerX(x: number) {
    // If we're asked to fix the width or if #anchorX is already in center
    // mode, just keep moving the center.
    if (this.#fixWidth || this.#anchorX === 0.5) {
      this.x = x - this.width / 2
    } else {
      if (this.#anchorX) {
        this.x += (x - this.x) * 2 * this.#anchorX
      }
      this.width = (x - this.x) * 2
    }
    this.#anchorX = 0.5
    this.#fixWidth = false
  }

  get centerY(): number {
    return super.centerY
  }

  set centerY(y: number) {
    // If we're asked to fix the height or if #anchorY is already in center
    // mode, just keep moving the center.
    if (this.#fixHeight || this.#anchorY === 0.5) {
      this.y = y - this.height / 2
    } else {
      if (this.#anchorY) {
        this.y += (y - this.y) * 2 * this.#anchorY
      }
      this.height = (y - this.y) * 2
    }
    this.#anchorY = 0.5
    this.#fixHeight = false
  }
}

/**
 * Tells whether the first of several arguments describes a rectangle, rather
 * than the point of (point, size) or (from, to): an array of four values, or
 * an object with both `x` and `width`.
 *
 * @private
 */
export function isRectangle(value: any): boolean {
  return Array.isArray(value)
    ? value.length === 4
    : value.x !== undefined && value.width !== undefined
}

/**
 * Reads the rectangle that a named object describes, through its `rectangle`
 * or through any of the rectangle's properties, and returns it with the
 * object's other properties, for set(), as the Path and Shape factories use it.
 *
 * @private
 */
export function readRectangle(
  object: Record<string, any>
): [Rectangle, Record<string, any>] {
  const { rectangle, ...rest } = object
  if (rectangle) {
    return [Rectangle.from(rectangle), rest]
  }
  // Tell the rectangle's properties by the ones a rectangle has, plus the
  // `from` and `to` that its constructor takes:
  const keys = new Rectangle()
  const values = {}
  const props = {}
  for (const [key, value] of Object.entries(rest)) {
    if (key in keys || key === 'from' || key === 'to') {
      values[key] = value
    } else {
      props[key] = value
    }
  }
  return [new Rectangle(values), props]
}

/**
 * Reads the center and radius of an ellipse from a named object, either from
 * its `center` and `radius`, or from the rectangle that it describes, see
 * readRectangle(), and returns them with the object's other properties, for
 * set(), as the Path and Shape factories use it.
 *
 * @private
 */
export function readEllipse(object: Record<string, any>): {
  center: Point
  radius: Size
  props: Record<string, any>
} {
  if (object.radius != null) {
    const { center, radius, ...props } = object
    return { center: Point.from(center), radius: Size.from(radius), props }
  } else {
    const [rect, props] = readRectangle(object)
    return {
      center: rect._getCenter(true),
      radius: rect._getSize(true).divide(2),
      props
    }
  }
}
