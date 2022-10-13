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
 * @name Formatter
 * @class
 * @private
 */
var Formatter = Base.extend(/** @lends Formatter# */{
    /**
     * @param {Number} [precision=5] the amount of fractional digits
     * @return {VoidFunction}
     */
    initialize: function(precision) {
        this.precision = Base.pick(precision, 5);
        this.multiplier = Math.pow(10, this.precision);
    },

    /**
     * Utility function for rendering numbers as strings at a precision of
     * up to the amount of fractional digits.
     *
     * @param {Number} num the number to be converted to a string
     * @return {Number} precise number
     */
    number: function(num) {
        // It would be nice to use Number#toFixed() instead, but it pads with 0,
        // unnecessarily consuming space.
        // If precision is >= 16, don't do anything at all, since that appears
        // to be the limit of the precision (it actually varies).
        return this.precision < 16
                ? Math.round(num * this.multiplier) / this.multiplier : num;
    },

    /**
     * Utility function to create string representation of a pair
     * @param {Number} val1
     * @param {Number} val2
     * @param {String} separator
     * @return {String} example: (1, 2, ',') => 1,2
     */
    pair: function(val1, val2, separator) {
        return this.number(val1) + (separator || ',') + this.number(val2);
    },

    /**
     * Utility function to create string representation of a point
     * @param {{ x: Number, y: Number }} val
     * @param {String} separator
     * @return {String} example: ({x:1, y: 2}, ',') => 1,2
     */
    point: function(val, separator) {
        return this.number(val.x) + (separator || ',') + this.number(val.y);
    },

    /**
     * Utility function to create string representation of a size
     * @param {{ width: Number, height: Number }} val
     * @param {String} separator
     * @return {String} example: ({width:1, height: 2}, ',') => 1,2
     */
    size: function(val, separator) {
        return this.number(val.width) + (separator || ',')
                + this.number(val.height);
    },

    /**
     * Utility function to create string representation of a rectangle
     * @param {{ x: Number, y: Number, width: Number, height: Number }} val
     * @param {String} separator
     * @return {String} example: ({x:1, y: 2}, ',') => 1,2
     */
    rectangle: function(val, separator) {
        return this.point(val, separator) + (separator || ',')
                + this.size(val, separator);
    }
});

Formatter.instance = new Formatter();
