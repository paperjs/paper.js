/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2014, Juerg Lehni & Jonathan Puckey
 * http://scratchdisk.com/ & http://jonathanpuckey.com/
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
     * @return {Number} The next unique id
     * @static
     **/
    get: function(ctor) {
        if (ctor) {
            // Use one UID pool per given constructor
            var name = ctor._class,
                pool = this._pools[name];
            if (!pool)
                pool = this._pools[name] = { _id: 1 };
            return pool._id++;
        } else {
            // Use the global UID pool:
            return this._id++;
        }
    }
};
