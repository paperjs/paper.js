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
 * @name Formatter
 * @class
 * @private
 */
var Formatter = Base.extend(/** @lends Formatter# */{
	/**
	 * @param {Number} [precision=5] the amount of fractional digits.
	 */
	initialize: function(precision) {
		this.precision = precision || 5;
		this.multiplier = Math.pow(10, this.precision);
	},

	/**
	 * Utility function for rendering numbers as strings at a precision of
	 * up to the amount of fractional digits.
	 *
	 * @param {Number} num the number to be converted to a string
	 */
	number: function(val) {
		// It would be nice to use Number#toFixed() instead, but it pads with 0,
		// unecessarily consuming space.
		return Math.round(val * this.multiplier) / this.multiplier;
	},

	point: function(val, separator) {
		return this.number(val.x) + (separator || ',') + this.number(val.y);
	},

	size: function(val, separator) {
		return this.number(val.width) + (separator || ',')
				+ this.number(val.height);
	},

	rectangle: function(val, separator) {
		return this.point(val, separator) + (separator || ',')
				+ this.size(val, separator);
	}
});

Formatter.instance = new Formatter();
