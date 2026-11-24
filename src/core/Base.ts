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

import { exportJSON, serialize } from './serialization.ts'

/**
 * @private
 */
export class Base {
  // The name of the class, which registerClasses() defines on its prototype:
  declare readonly className: string

  /**
   * Exports (serializes) this object to a JSON data object or string.
   *
   * @option [options.asString=true] {Boolean} whether the JSON is returned as
   *     a `Object` or a `String`
   * @option [options.precision=5] {Number} the amount of fractional digits in
   *     numbers used in JSON data
   *
   * @param options the serialization options
   * @return the exported JSON data
   */
  exportJSON(options?: { asString?: boolean; precision?: number }) {
    return exportJSON(this, options)
  }

  // To support JSON.stringify:
  toJSON() {
    return serialize(this)
  }

  /**
   * Exports (serializes) a value to a JSON data object or string, also one
   * that holds Paper.js objects without being one, such as a plain object or
   * an array, see {@link #exportJSON(options)}.
   *
   * @option [options.asString=true] {Boolean} whether the JSON is returned as
   *     a `Object` or a `String`
   * @option [options.precision=5] {Number} the amount of fractional digits in
   *     numbers used in JSON data
   *
   * @param value the value to export
   * @param options the serialization options
   * @return the exported JSON data
   */
  static exportJSON(
    value: any,
    options?: { asString?: boolean; precision?: number }
  ) {
    return exportJSON(value, options)
  }

  /**
   * Imports (deserializes) the JSON data of a value that
   * {@link Base.exportJSON(value, options)} or {@link #exportJSON(options)}
   * exported. Items are created without being inserted, except for layers,
   * which go into the active project.
   *
   * @param json the JSON data to import
   * @return the imported value
   */
  declare static importJSON: (json: string | any[]) => any
}
