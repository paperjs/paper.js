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

import { exportJSON, serialize } from './serialization.js'

/**
 * @name Base
 * @class
 * @private
 */
export class Base {
  /**
   * Exports (serializes) this object to a JSON data object or string.
   *
   * @option [options.asString=true] {Boolean} whether the JSON is returned as
   *     a `Object` or a `String`
   * @option [options.precision=5] {Number} the amount of fractional digits in
   *     numbers used in JSON data
   *
   * @param {Object} [options] the serialization options
   * @return {String} the exported JSON data
   */
  exportJSON(options) {
    return exportJSON(this, options)
  }

  // To support JSON.stringify:
  toJSON() {
    return serialize(this)
  }
}
