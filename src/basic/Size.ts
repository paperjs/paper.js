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

import { Base, Formatter, inject, isZero } from '../internal.ts'
import type { Point } from './Point.ts'

/**
 * What a size can be passed as, where a function takes one.
 */
export type SizeLike =
  | Size
  | number[]
  | { width: number; height: number }
  | { x: number; y: number }

/**
 * The Size object is used to describe the size or dimensions of something,
 * through its {@link #width} and {@link #height} properties.
 *
 * Wherever a size is the only argument of a function, it can also be passed
 * as two numbers, e.g. `size.multiply(2, 3)`.
 *
 * @classexample
 * // Create a size that is 10pt wide and 5pt high,
 * // and use it to define a rectangle:
 * var size = new Size(10, 5);
 * console.log(size.width); // 10
 * console.log(size.height); // 5
 * var rect = new Rectangle(new Point(20, 15), size);
 * console.log(rect); // { x: 20, y: 15, width: 10, height: 5 }
 */
export class Size extends Base {
  /**
   * The width of the size
   */
  declare width: number

  /**
   * The height of the size
   */
  declare height: number

  /**
   * Creates a Size object with the given width and height values.
   *
   * @param width the width
   * @param height the height
   *
   * @example
   * // Create a size that is 10pt wide and 5pt high
   * var size = new Size(10, 5);
   * console.log(size.width); // 10
   * console.log(size.height); // 5
   */
  constructor(width: number, height?: number)
  /**
   * Creates a Size object using the numbers in the given array as
   * dimensions.
   *
   * @param array
   *
   * @example
   * // Creating a size of width: 320, height: 240 using an array of numbers:
   * var array = [320, 240];
   * var size = new Size(array);
   * console.log(size.width); // 320
   * console.log(size.height); // 240
   */
  constructor(array: number[])
  /**
   * Creates a Size object using the properties in the given object.
   *
   * @param object
   *
   * @example
   * // Creating a size of width: 10, height: 20 using an object literal:
   *
   * var size = new Size({
   *     width: 10,
   *     height: 20
   * });
   * console.log(size.width); // 10
   * console.log(size.height); // 20
   */
  constructor(object: { width: number; height: number })
  /**
   * Creates a Size object using the coordinates of the given Size object.
   *
   * @param size
   */
  constructor(size?: Size)
  /**
   * Creates a Size object using the {@link Point#x} and {@link Point#y}
   * values of the given Point object.
   *
   * @param point
   *
   * @example
   * var point = new Point(50, 50);
   * var size = new Size(point);
   * console.log(size.width); // 50
   * console.log(size.height); // 50
   */
  constructor(point: Point)
  /**
   * Creates a Size object from any of the values that a function taking a
   * size accepts, as {@link Size.from()} does.
   *
   * @param size
   * @param height
   */
  constructor(size: SizeLike | number, height?: number)
  constructor(width?: SizeLike | number | string, height?: number) {
    super()
    this.set(width, height)
  }

  /**
   * Sets the size to the passed values. Note that any sequence of parameters
   * that is supported by the various {@link Size()} constructors also work
   * for calls of `set()`.
   *
   * @param values
   */
  set(arg0?: SizeLike | number | string, arg1?: number): this {
    if (typeof arg0 === 'number') {
      this._set(arg0, typeof arg1 === 'number' ? arg1 : arg0)
    } else if (arg0 === undefined || arg0 === null) {
      this._set(0, 0)
    } else {
      const obj: any = typeof arg0 === 'string' ? arg0.split(/[\s,]+/) : arg0
      if (Array.isArray(obj)) {
        this._set(+obj[0], +(obj.length > 1 ? obj[1] : obj[0]))
      } else if ('width' in obj) {
        this._set(obj.width || 0, obj.height || 0)
      } else if ('x' in obj) {
        this._set(obj.x || 0, obj.y || 0)
      } else {
        this._set(0, 0)
      }
    }
    return this
  }

  // See Point#_set() for an explanation of _set():
  _set(width: number, height: number): this {
    this.width = width
    this.height = height
    return this
  }

  /**
   * Checks whether the width and height of the size are equal to those of the
   * supplied size.
   *
   * @param size the size to compare to
   *
   * @example
   * var size = new Size(5, 10);
   * console.log(size == new Size(5, 10)); // true
   * console.log(size == new Size(1, 1)); // false
   * console.log(size != new Size(1, 1)); // true
   */
  equals(size: any): boolean {
    return !!(
      this === size || (
        size && (
          this.width === size.width && this.height === size.height || (
            Array.isArray(size) &&
            this.width === size[0] &&
            this.height === size[1]
          )
        )
      )
    )
  }

  /**
   * Returns a copy of the size.
   */
  clone(): Size {
    return new Size(this.width, this.height)
  }

  /**
   * @return a string representation of the size
   */
  toString(): string {
    const { instance } = Formatter
    return `{ width: ${
      instance.number(this.width)
    }, height: ${
      instance.number(this.height)
    } }`
  }

  _serialize(options: { formatter: Formatter }): number[] {
    const { formatter } = options
    // See Point#_serialize()
    return [formatter.number(this.width), formatter.number(this.height)]
  }

  /**
   * The size's dimensions as an array, `[width, height]`, as
   * {@link Matrix#values} gives those of a matrix.
   */
  get values(): number[] {
    return [this.width, this.height]
  }

  /**
   * Returns the addition of the supplied value to the width and height of the
   * size as a new size. The object itself is not modified!
   *
   * @operator
   * @param number the number to add
   * @return the addition of the size and the value as a new size
   *
   * @example
   * var size = new Size(5, 10);
   * var result = size + 20; // PaperScript
   * var result = size.add(20); // JavaScript
   * console.log(result); // {width: 25, height: 30}
   */
  add(number: number): Size
  /**
   * Returns the addition of the width and height of the supplied size to the
   * size as a new size. The object itself is not modified!
   *
   * @operator
   * @param size the size to add
   * @return the addition of the two sizes as a new size
   *
   * @example
   * var size1 = new Size(5, 10);
   * var size2 = new Size(10, 20);
   * var result = size1 + size2; // PaperScript
   * var result = size1.add(size2); // JavaScript
   * console.log(result); // {width: 15, height: 30}
   */
  add(size: SizeLike): Size
  add(width: number, height: number): Size
  add(size: SizeLike | number, height?: number): Size {
    const other = Size.from(size, height)
    return new Size(this.width + other.width, this.height + other.height)
  }

  /**
   * Returns the subtraction of the supplied value from the width and height
   * of the size as a new size. The object itself is not modified!
   * The object itself is not modified!
   *
   * @operator
   * @param number the number to subtract
   * @return the subtraction of the size and the value as a new size
   *
   * @example
   * var size = new Size(10, 20);
   * var result = size - 5; // PaperScript
   * var result = size.subtract(5); // JavaScript
   * console.log(result); // {width: 5, height: 15}
   */
  subtract(number: number): Size
  /**
   * Returns the subtraction of the width and height of the supplied size from
   * the size as a new size. The object itself is not modified!
   *
   * @operator
   * @param size the size to subtract
   * @return the subtraction of the two sizes as a new size
   *
   * @example
   * var firstSize = new Size(10, 20);
   * var secondSize = new Size(5, 5);
   * var result = firstSize - secondSize; // PaperScript
   * var result = firstSize.subtract(secondSize); // JavaScript
   * console.log(result); // {width: 5, height: 15}
   */
  subtract(size: SizeLike): Size
  subtract(width: number, height: number): Size
  subtract(size: SizeLike | number, height?: number): Size {
    const other = Size.from(size, height)
    return new Size(this.width - other.width, this.height - other.height)
  }

  /**
   * Returns the multiplication of the supplied value with the width and
   * height of the size as a new size. The object itself is not modified!
   *
   * @operator
   * @param number the number to multiply by
   * @return the multiplication of the size and the value as a new size
   *
   * @example
   * var size = new Size(10, 20);
   * var result = size * 2; // PaperScript
   * var result = size.multiply(2); // JavaScript
   * console.log(result); // {width: 20, height: 40}
   */
  multiply(number: number): Size
  /**
   * Returns the multiplication of the width and height of the supplied size
   * with the size as a new size. The object itself is not modified!
   *
   * @operator
   * @param size the size to multiply by
   * @return the multiplication of the two sizes as a new size
   *
   * @example
   * var firstSize = new Size(5, 10);
   * var secondSize = new Size(4, 2);
   * var result = firstSize * secondSize; // PaperScript
   * var result = firstSize.multiply(secondSize); // JavaScript
   * console.log(result); // {width: 20, height: 20}
   */
  multiply(size: SizeLike): Size
  multiply(width: number, height: number): Size
  multiply(size: SizeLike | number, height?: number): Size {
    const other = Size.from(size, height)
    return new Size(this.width * other.width, this.height * other.height)
  }

  /**
   * Returns the division of the supplied value by the width and height of the
   * size as a new size. The object itself is not modified!
   *
   * @operator
   * @param number the number to divide by
   * @return the division of the size and the value as a new size
   *
   * @example
   * var size = new Size(10, 20);
   * var result = size / 2; // PaperScript
   * var result = size.divide(2); // JavaScript
   * console.log(result); // {width: 5, height: 10}
   */
  divide(number: number): Size
  /**
   * Returns the division of the width and height of the supplied size by the
   * size as a new size. The object itself is not modified!
   *
   * @operator
   * @param size the size to divide by
   * @return the division of the two sizes as a new size
   *
   * @example
   * var firstSize = new Size(8, 10);
   * var secondSize = new Size(2, 5);
   * var result = firstSize / secondSize; // PaperScript
   * var result = firstSize.divide(secondSize); // JavaScript
   * console.log(result); // {width: 4, height: 2}
   */
  divide(size: SizeLike): Size
  divide(width: number, height: number): Size
  divide(size: SizeLike | number, height?: number): Size {
    const other = Size.from(size, height)
    return new Size(this.width / other.width, this.height / other.height)
  }

  /**
   * The modulo operator returns the integer remainders of dividing the size
   * by the supplied size as a new size.
   *
   * @operator
   * @param size
   * @return the integer remainders of dividing the sizes by each
   * other as a new size
   *
   * @example
   * var size = new Size(12, 6);
   * var result = size % new Size(5, 2); // PaperScript
   * var result = size.modulo(new Size(5, 2)); // JavaScript
   * console.log(result); // {width: 2, height: 0}
   */
  modulo(number: number): Size
  /**
   * The modulo operator returns the integer remainders of dividing the size
   * by the supplied value as a new size.
   *
   * @operator
   * @param value
   * @return the integer remainders of dividing the size by the value
   * as a new size
   *
   * @example
   * var size = new Size(12, 6);
   * var result = size % 5; // PaperScript
   * var result = size.modulo(5); // JavaScript
   * console.log(result); // {width: 2, height: 1}
   */
  modulo(size: SizeLike): Size
  modulo(width: number, height: number): Size
  modulo(size: SizeLike | number, height?: number): Size {
    const other = Size.from(size, height)
    return new Size(this.width % other.width, this.height % other.height)
  }

  /**
   * Returns a new size with both dimensions negated.
   * PaperScript uses it for the unary minus operator.
   * The object itself is not modified!
   *
   * @return the negation of the size as a new size
   *
   * @example
   * var size = new Size(12, -6);
   * var result = -size; // PaperScript
   * var result = size.negate(); // JavaScript
   * console.log(result); // {width: -12, height: 6}
   */
  negate(): Size {
    return new Size(-this.width, -this.height)
  }

  /**
   * {@grouptitle Tests}
   * Checks if this size has both the width and height set to 0, within a
   * tolerance of 1e-12, unlike {@link #equals(size)}, which compares
   * exactly.
   *
   * @return {@true if both width and height are 0, within the tolerance}
   */
  isZero(): boolean {
    return isZero(this.width) && isZero(this.height)
  }

  /**
   * Checks if the width or the height of the size are NaN.
   *
   * @return {@true if the width or height of the size are NaN}
   */
  isNaN(): boolean {
    return isNaN(this.width) || isNaN(this.height)
  }

  /**
   * Returns the passed size if it is one already, or else a new size created
   * from the passed values, as {@link Size()} reads them.
   *
   * @param size
   * @param height
   */
  static from(size: SizeLike | number, height?: number): Size {
    return size instanceof Size ? size : new Size(size, height)
  }

  /**
   * Returns a new size object with the smallest {@link #width} and
   * {@link #height} of the supplied sizes.
   *
   * @param size1
   * @param size2
   * @return the newly created size object
   *
   * @example
   * var size1 = new Size(10, 100);
   * var size2 = new Size(200, 5);
   * var minSize = Size.min(size1, size2);
   * console.log(minSize); // {width: 10, height: 5}
   *
   * @example
   * // Find the minimum of multiple sizes:
   * var size1 = new Size(60, 100);
   * var size2 = new Size(200, 5);
   * var size3 = new Size(250, 35);
   * [size1, size2, size3].reduce(Size.min) // {width: 60, height: 5}
   */
  static min(size1: SizeLike, size2: SizeLike): Size {
    const first = Size.from(size1)
    const second = Size.from(size2)
    return new Size(
      Math.min(first.width, second.width),
      Math.min(first.height, second.height)
    )
  }

  /**
   * Returns a new size object with the largest {@link #width} and
   * {@link #height} of the supplied sizes.
   *
   * @param size1
   * @param size2
   * @return the newly created size object
   *
   * @example
   * var size1 = new Size(10, 100);
   * var size2 = new Size(200, 5);
   * var maxSize = Size.max(size1, size2);
   * console.log(maxSize); // {width: 200, height: 100}
   *
   * @example
   * // Find the maximum of multiple sizes:
   * var size1 = new Size(60, 100);
   * var size2 = new Size(200, 5);
   * var size3 = new Size(250, 35);
   * [size1, size2, size3].reduce(Size.max) // {width: 250, height: 100}
   */
  static max(size1: SizeLike, size2: SizeLike): Size {
    const first = Size.from(size1)
    const second = Size.from(size2)
    return new Size(
      Math.max(first.width, second.width),
      Math.max(first.height, second.height)
    )
  }

  /**
   * Returns a size object with random {@link #width} and {@link #height}
   * values between `0` and `1`.
   *
   * @return the newly created size object
   *
   * @example
   * var maxSize = new Size(100, 100);
   * var randomSize = Size.random();
   * var size = maxSize * randomSize;
   */
  static random(): Size {
    return new Size(Math.random(), Math.random())
  }

  static {
    // Inject round, ceil, floor, abs:
    for (const key of ['round', 'ceil', 'floor', 'abs']) {
      const op = Math[key]
      inject(this.prototype, {
        [key]() {
          return new Size(op(this.width), op(this.height))
        }
      })
    }
  }
}

// The members defined at runtime rather than in the class body:
export interface Size {
  /**
   * {@grouptitle Math Functions}
   *
   * Returns a new size with rounded {@link #width} and {@link #height}
   * values. The object itself is not modified!
   *
   *
   * @example
   * var size = new Size(10.2, 10.9);
   * var roundSize = size.round();
   * console.log(roundSize); // {x: 10, y: 11}
   */
  round(): Size

  /**
   * Returns a new size with the nearest greater non-fractional values to the
   * specified {@link #width} and {@link #height} values. The object itself is
   * not modified!
   *
   *
   * @example
   * var size = new Size(10.2, 10.9);
   * var ceilSize = size.ceil();
   * console.log(ceilSize); // {x: 11, y: 11}
   */
  ceil(): Size

  /**
   * Returns a new size with the nearest smaller non-fractional values to the
   * specified {@link #width} and {@link #height} values. The object itself is
   * not modified!
   *
   *
   * @example
   * var size = new Size(10.2, 10.9);
   * var floorSize = size.floor();
   * console.log(floorSize); // {x: 10, y: 10}
   */
  floor(): Size

  /**
   * Returns a new size with the absolute values of the specified
   * {@link #width} and {@link #height} values. The object itself is not
   * modified!
   *
   *
   * @example
   * var size = new Size(-5, 10);
   * var absSize = size.abs();
   * console.log(absSize); // {x: 5, y: 10}
   */
  abs(): Size
}

/**
 * An internal version of Size that notifies its owner of each change
 * through setting itself again on the property that produced it.
 *
 * @private
 */
export class LinkedSize extends Size {
  #width: number
  #height: number
  #owner: any
  #key: string

  constructor(width: number, height: number, owner: any, key: string) {
    super()
    this.#width = width
    this.#height = height
    this.#owner = owner
    this.#key = key
  }

  // See Point#_set() for an explanation of _set():
  _set(width: number, height: number, _dontNotify?: boolean): this {
    // Size's constructor calls this before the private fields exist, and the
    // constructor below sets them:
    if (#width in this) {
      this.#width = width
      this.#height = height
      if (!_dontNotify) {
        this.#owner[this.#key] = this
      }
    }
    return this
  }

  // @ts-expect-error: Size declares width as a field, LinkedSize reads #width
  get width(): number {
    return this.#width
  }

  set width(width: number) {
    this.#width = width
    this.#owner[this.#key] = this
  }

  // @ts-expect-error: See width
  get height(): number {
    return this.#height
  }

  set height(height: number) {
    this.#height = height
    this.#owner[this.#key] = this
  }
}
