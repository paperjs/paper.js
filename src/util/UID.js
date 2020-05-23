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
 * @name UID
 * @namespace
 * @private
 */
var UID = {
    _id: 1,
    _pools: {},

    /**
     * Returns the next unique id.
     * @method get
     * @return {Number} the next unique id
     * @static
     **/
    get: function(name) {
        if (name) {
            // Use one UID pool per given constructor
            var pool = this._pools[name];
            if (!pool)
                pool = this._pools[name] = { _id: 1 };
            return pool._id++;
        } else {
            // Use the global UID pool:
            return this._id++;
        }
    }
};
