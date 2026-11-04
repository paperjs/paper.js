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

/**
 * @private
 */
export class Formatter {
  precision: number
  multiplier: number

  /**
   * @param precision the amount of fractional digits
   */
  constructor(precision = 5) {
    this.precision = precision
    this.multiplier = Math.pow(10, precision)
  }

  /**
   * Utility function for rendering numbers as strings at a precision of
   * up to the amount of fractional digits.
   *
   * @param value the number to be converted to a string
   */
  number(value: number): number {
    // It would be nice to use Number#toFixed() instead, but it pads with 0,
    // unnecessarily consuming space.
    // If precision is >= 16, don't do anything at all, since that appears
    // to be the limit of the precision (it actually varies).
    return this.precision < 16
      ? Math.round(value * this.multiplier) / this.multiplier
      : value
  }

  pair(value1: number, value2: number, separator = ','): string {
    return this.number(value1) + separator + this.number(value2)
  }

  point(point: { x: number; y: number }, separator = ','): string {
    return this.pair(point.x, point.y, separator)
  }

  size(size: { width: number; height: number }, separator = ','): string {
    return this.pair(size.width, size.height, separator)
  }

  rectangle(
    rectangle: { x: number; y: number; width: number; height: number },
    separator = ','
  ): string {
    return (
      this.point(rectangle, separator) +
      separator +
      this.size(rectangle, separator)
    )
  }

  static instance = new Formatter()
}
