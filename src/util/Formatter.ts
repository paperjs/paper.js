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
   * @param num the number to be converted to a string
   */
  number(val) {
    // It would be nice to use Number#toFixed() instead, but it pads with 0,
    // unnecessarily consuming space.
    // If precision is >= 16, don't do anything at all, since that appears
    // to be the limit of the precision (it actually varies).
    return this.precision < 16
      ? Math.round(val * this.multiplier) / this.multiplier
      : val
  }

  pair(val1, val2, separator) {
    return this.number(val1) + (separator || ',') + this.number(val2)
  }

  point(val, separator) {
    return this.number(val.x) + (separator || ',') + this.number(val.y)
  }

  size(val, separator) {
    return (
      this.number(val.width) +
      (separator || ',') +
      this.number(val.height)
    )
  }

  rectangle(val, separator) {
    return (
      this.point(val, separator) +
      (separator || ',') +
      this.size(val, separator)
    )
  }

  static instance = new Formatter()
}
