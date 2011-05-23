/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * All rights reserved.
 */

var Size = this.Size = Base.extend({
	/** @lends Size# */

	// DOCS: improve Size class description
	/**
	 * Creates a Size object with the given width and height values.
	 *
	 * @name Size
	 * @constructor
	 * @param {number} width the width
	 * @param {number} height the height
	 * 
	 * @class The Size object represents the size of something.
	 */
	initialize: function(arg0, arg1) {
		if (arg1 !== undefined) {
			this.width = arg0;
			this.height = arg1;
		} else if (arg0 !== undefined) {
			if (arg0 == null) {
				this.width = this.height = 0;
			} else if (arg0.width !== undefined) {
				this.width = arg0.width;
				this.height = arg0.height;
			} else if (arg0.x !== undefined) {
				this.width = arg0.x;
				this.height = arg0.y;
			} else if (Array.isArray(arg0)) {
				this.width = arg0[0];
				this.height = arg0.length > 1 ? arg0[1] : arg0[0];
			} else if (typeof arg0 === 'number') {
				this.width = this.height = arg0;
			} else {
				this.width = this.height = 0;
			}
		} else {
			this.width = this.height = 0;
		}
	},

	/**
	 * The width of the size
	 *
	 * @name Size#width
	 * @type number
	 */

	/**
	 * The height of the size
	 *
	 * @name Size#height
	 * @type number
	 */

	set: function(width, height) {
		this.width = width;
		this.height = height;
		return this;
	},

	/**
	 * Returns the addition of the supplied value to the width and height of the
	 * size as a new size. The object itself is not modified!
	 * 
	 * @example
	 * var size = new Size(5, 10);
	 * var result = size + 20;
	 * console.log(result); // { width: 25.0, height: 30.0 }
	 * 
	 * @name Size#add^2
	 * @function
	 * @param {number} number the number to add
	 * @return {Size} the addition of the size and the value as a new size
	 */
	/**
	 * Returns the addition of the width and height of the supplied size to the
	 * size as a new size. The object itself is not modified!
	 * 
	 * @example
	 * var size1 = new Size(5, 10);
	 * var size2 = new Size(10, 20);
	 * var result = size1 + size2;
	 * console.log(result); // { width: 15.0, height: 30.0 }
	 * 
	 * @name Size#add
	 * @function
	 * @param {Size} size the size to add
	 * @return {Size} the addition of the two sizes as a new size
	 */
	add: function(size) {
		size = Size.read(arguments);
		return Size.create(this.width + size.width, this.height + size.height);
	},

	/**
	 * Returns the subtraction of the supplied value from the width and height
	 * of the size as a new size. The object itself is not modified!
	 * The object itself is not modified!
	 * 
	 * @example
	 * var size = new Size(10, 20);
	 * var result = size - 5;
	 * console.log(result); // { width: 5.0, height: 15.0 }
	 * 
	 * @name Size#subtract^2
	 * @function
	 * @param {number} number the number to subtract
	 * @return {Size} the subtraction of the size and the value as a new size
	 */
	/**
	 * Returns the subtraction of the width and height of the supplied size from
	 * the size as a new size. The object itself is not modified!
	 * 
	 * @example
	 * var firstSize = new Size(10, 20);
	 * var secondSize = new Size(5, 5);
	 * var result = firstSize - secondSize;
	 * console.log(result); // { width: 5.0, height: 15.0 }
	 * 
	 * @name Size#subtract
	 * @function
	 * @param {Size} size the size to subtract
	 * @return {Size} the subtraction of the two sizes as a new size
	 */
	subtract: function(size) {
		size = Size.read(arguments);
		return Size.create(this.width - size.width, this.height - size.height);
	},

	/**
	 * Returns the multiplication of the supplied value with the width and
	 * height of the size as a new size. The object itself is not modified!
	 * 
	 * @example
	 * var size = new Size(10, 20);
	 * var result = size * 2;
	 * console.log(result); // { width: 20.0, height: 40.0 }
	 * 
	 * @name Size#multiply^2
	 * @function
	 * @param {number} number the number to multiply by
	 * @return {Size} the multiplication of the size and the value as a new size
	 */
	/**
	 * Returns the multiplication of the width and height of the supplied size
	 * with the size as a new size. The object itself is not modified!
	 * 
	 * @example
	 * var firstSize = new Size(5, 10);
	 * var secondSize = new Size(4, 2);
	 * var result = firstSize * secondSize;
	 * console.log(result); // { width: 20.0, height: 20.0 }
	 * 
	 * @name Size#multiply
	 * @function
	 * @param {Size} size the size to multiply by
	 * @return {Size} the multiplication of the two sizes as a new size
	 */
	multiply: function(size) {
		size = Size.read(arguments);
		return Size.create(this.width * size.width, this.height * size.height);
	},

	/**
	 * Returns the division of the supplied value by the width and height of the
	 * size as a new size. The object itself is not modified!
	 * 
	 * @example
	 * var size = new Size(10, 20);
	 * var result = size / 2;
	 * console.log(result); // { width: 5.0, height: 10.0 }
	 * 
	 * @name Size#divide^2
	 * @function
	 * @param {number} number the number to divide by
	 * @return {Size} the division of the size and the value as a new size
	 */
	/**
	 * Returns the division of the width and height of the supplied size by the
	 * size as a new size. The object itself is not modified!
	 * 
	 * @example
	 * var firstSize = new Size(8, 10);
	 * var secondSize = new Size(2, 5);
	 * var result = firstSize / secondSize;
	 * console.log(result); // { width: 4.0, height: 2.0 }
	 * 
	 * @name Size#divide
	 * @function
	 * @param {Size} size the size to divide by
	 * @return {Size} the division of the two sizes as a new size
	 */
	divide: function(size) {
		size = Size.read(arguments);
		return Size.create(this.width / size.width, this.height / size.height);
	},

	/**
	 * The modulo operator returns the integer remainders of dividing the size
	 * by the supplied value as a new size.
	 * 
	 * @example
	 * var size = new Size(12, 6);
	 * console.log(size % 5); // {width: 2, height: 1}
	 * 
	 * @name Size#modulo^2
	 * @function
	 * @param {number} value
	 * @return {Size} the integer remainders of dividing the size by the value
	 *                 as a new size
	 */
	/**
	 * The modulo operator returns the integer remainders of dividing the size
	 * by the supplied size as a new size.
	 * 
	 * @example
	 * var size = new Size(12, 6);
	 * console.log(size % new Size(5, 2)); // {width: 2, height: 0}
	 * 
	 * @name Size#modulo
	 * @function
	 * @param {Size} size
	 * @return {Size} the integer remainders of dividing the sizes by each
	 *                 other as a new size
	 */
	modulo: function(size) {
		size = Size.read(arguments);
		return Size.create(this.width % size.width, this.height % size.height);
	},

	negate: function() {
		return Size.create(-this.width, -this.height);
	},

	/**
	 * Checks whether the width and height of the size are equal to those of the
	 * supplied size.
	 * 
	 * @example
	 * var size = new Size(5, 10);
	 * print(size == new Size(5, 10)); // true
	 * print(size == new Size(1, 1)); // false
	 * print(size != new Size(1, 1)); // true
	 *
	 * @param {Size}
	 * @return {boolean}
	 */
	equals: function(size) {
		size = Size.read(arguments);
		return this.width == size.width && this.height == size.height;
	},

	/**
	 * Checks if this size has both the width and height set to 0.
	 * 
	 * @return {boolean} true if both width and height are 0, false otherwise.
	 */
	isZero: function() {
		return this.width == 0 && this.width == 0;
	},

	/**
	 * Checks if the width or the height of the size are NaN.
	 * 
	 * @return {boolean} true if the width or height of the size are NaN, false
	 * otherwise.
	 */
	isNaN: function() {
		return isNaN(this.width) || isNaN(this.height);
	},

	/**
	 * @return {string} A string representation of the size.
	 */
	toString: function() {
		var format = Base.formatNumber;
		return '{ width: ' + format(this.width)
				+ ', height: ' + format(this.height) + ' }';
	},

	statics: {
		/** @lends Size */

		// See Point.create()
		create: function(width, height) {
			return new Size(Size.dont).set(width, height);
		},

		/**
		 * Returns a new size object with the smallest {@link #width} and
		 * {@link #height} of the supplied sizes.
		 * 
		 * @static
		 * @param {Size} size1
		 * @param {Size} size2
		 * @returns {Size} The newly created size object
		 */
		min: function(size1, size2) {
			return Size.create(
				Math.min(size1.width, size2.width),
				Math.min(size1.height, size2.height));
		},

		/**
		 * Returns a new size object with the largest {@link #width} and
		 * {@link #height} of the supplied sizes.
		 * 
		 * @static
		 * @param {Size} size1
		 * @param {Size} size2
		 * @returns {Size} The newly created size object
		 */
		max: function(size1, size2) {
			return Size.create(
				Math.max(size1.width, size2.width),
				Math.max(size1.height, size2.height));
		},

		/**
		 * Returns a size object with random {@link #width} and {@link #height}
		 * values between {@code 0} and {@code 1}.
		 * 
		 * @returns {Size} The newly created size object
		 * @static
		 */
		random: function() {
			return Size.create(Math.random(), Math.random());
		}
	}
}, new function() { // Scope for injecting round, ceil, floor, abs:

	/**
	 * {@grouptitle Math Functions}
	 * 
	 * Returns a new size with rounded {@link #width} and {@link #height} values.
	 * The object itself is not modified!
	 * 
	 * @example
	 * var size = new Size(10.2, 10.9);
	 * var roundSize = size.round();
	 * console.log(roundSize); // { x: 10.0, y: 11.0 }
	 * 
	 * @name Size#round
	 * @function
	 * @return {Size}
	 */

	/**
	 * Returns a new size with the nearest greater non-fractional values to the
	 * specified {@link #width} and {@link #height} values. The object itself is not
	 * modified!
	 * 
	 * @example
	 * var size = new Size(10.2, 10.9);
	 * var ceilSize = size.ceil();
	 * console.log(ceilSize); // { x: 11.0, y: 11.0 }
	 * 
	 * @name Size#ceil
	 * @function
	 * @return {Size}
	 */

	/**
	 * Returns a new size with the nearest smaller non-fractional values to the
	 * specified {@link #width} and {@link #height} values. The object itself is not
	 * modified!
	 * 
	 * @example
	 * var size = new Size(10.2, 10.9);
	 * var floorSize = size.floor();
	 * console.log(floorSize); // { x: 10.0, y: 10.0 }
	 * 
	 * @name Size#floor
	 * @function
	 * @return {Size}
	 */

	/**
	 * Returns a new size with the absolute values of the specified {@link #width}
	 * and {@link #height} values. The object itself is not modified!
	 * 
	 * @example
	 * var size = new Size(-5, 10);
	 * var absSize = size.abs();
	 * console.log(absSize); // { x: 5.0, y: 10.0 }
	 * 
	 * @name Size#abs
	 * @function
	 * @return {Size}
	 */

	return Base.each(['round', 'ceil', 'floor', 'abs'], function(name) {
		var op = Math[name];
		this[name] = function() {
			return Size.create(op(this.width), op(this.height));
		};
	}, {});
});

/**
 * An internal version of Size that notifies its owner of each change through
 * setting itself again on the setter that corresponds to the getter that
 * produced this LinkedSize. See uses of LinkedSize.create()
 * Note: This prototype is not exported.
 * @ignore
 */
var LinkedSize = Size.extend({
	beans: true,

	set: function(width, height, dontNotify) {
		this._width = width;
		this._height = height;
		if (!dontNotify)
			this._owner[this._setter](this);
		return this;
	},

	getWidth: function() {
		return this._width;
	},

	setWidth: function(width) {
		this._width = width;
		this._owner[this._setter](this);
	},

	getHeight: function() {
		return this._height;
	},

	setHeight: function(height) {
		this._height = height;
		this._owner[this._setter](this);
	},

	statics: {
		create: function(owner, setter, width, height) {
			var point = new LinkedSize(LinkedSize.dont);
			point._width = width;
			point._height = height;
			point._owner = owner;
			point._setter = setter;
			return point;
		}
	}
});
