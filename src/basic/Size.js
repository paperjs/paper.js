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
 * @name Size
 *
 * @class The Size object is used to describe the size or dimensions of
 * something, through its {@link #width} and {@link #height} properties.
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
var Size = Base.extend(/** @lends Size# */{
    _class: 'Size',
    // Tell Base.read that the Point constructor supports reading with index
    _readIndex: true,

    /**
     * Creates a Size object with the given width and height values.
     *
     * @name Size#initialize
     * @param {Number} width the width
     * @param {Number} height the height
     *
     * @example
     * // Create a size that is 10pt wide and 5pt high
     * var size = new Size(10, 5);
     * console.log(size.width); // 10
     * console.log(size.height); // 5
     */
    /**
     * Creates a Size object using the numbers in the given array as
     * dimensions.
     *
     * @name Size#initialize
     * @param {Array} array
     *
     * @example
     * // Creating a size of width: 320, height: 240 using an array of numbers:
     * var array = [320, 240];
     * var size = new Size(array);
     * console.log(size.width); // 320
     * console.log(size.height); // 240
     */
    /**
     * Creates a Size object using the properties in the given object.
     *
     * @name Size#initialize
     * @param {Object} object
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
    /**
     * Creates a Size object using the coordinates of the given Size object.
     *
     * @name Size#initialize
     * @param {Size} size
     */
    /**
     * Creates a Size object using the {@link Point#x} and {@link Point#y}
     * values of the given Point object.
     *
     * @name Size#initialize
     * @param {Point} point
     *
     * @example
     * var point = new Point(50, 50);
     * var size = new Size(point);
     * console.log(size.width); // 50
     * console.log(size.height); // 50
     */
    initialize: function Size(arg0, arg1) {
        var type = typeof arg0,
            reading = this.__read,
            read = 0;
        if (type === 'number') {
            var hasHeight = typeof arg1 === 'number';
            this._set(arg0, hasHeight ? arg1 : arg0);
            if (reading)
                read = hasHeight ? 2 : 1;
        } else if (type === 'undefined' || arg0 === null) {
            this._set(0, 0);
            if (reading)
                read = arg0 === null ? 1 : 0;
        } else {
            var obj = type === 'string' ? arg0.split(/[\s,]+/) || [] : arg0;
            read = 1;
            if (Array.isArray(obj)) {
                this._set(+obj[0], +(obj.length > 1 ? obj[1] : obj[0]));
            } else if ('width' in obj) {
                this._set(obj.width || 0, obj.height || 0);
            } else if ('x' in obj) {
                this._set(obj.x || 0, obj.y || 0);
            } else {
                this._set(0, 0);
                read = 0;
            }
        }
        if (reading)
            this.__read = read;
        return this;
    },

    /**
     * Sets the size to the passed values. Note that any sequence of parameters
     * that is supported by the various {@link Size()} constructors also work
     * for calls of `set()`.
     *
     * @function
     * @param {...*} values
     * @return {Size}
     */
    set: '#initialize',

    // See Point#_set() for an explanation of #_set():
    _set: function(width, height) {
        this.width = width;
        this.height = height;
        return this;
    },

    /**
     * The width of the size
     *
     * @name Size#width
     * @type Number
     */

    /**
     * The height of the size
     *
     * @name Size#height
     * @type Number
     */

    /**
     * Checks whether the width and height of the size are equal to those of the
     * supplied size.
     *
     * @param {Size} size the size to compare to
     * @return {Boolean}
     *
     * @example
     * var size = new Size(5, 10);
     * console.log(size == new Size(5, 10)); // true
     * console.log(size == new Size(1, 1)); // false
     * console.log(size != new Size(1, 1)); // true
     */
    equals: function(size) {
        return size === this || size && (this.width === size.width
                && this.height === size.height
                || Array.isArray(size) && this.width === size[0]
                    && this.height === size[1]) || false;
    },

    /**
     * Returns a copy of the size.
     * @return {Size}
     */
    clone: function() {
        return new Size(this.width, this.height);
    },

    /**
     * @return {String} a string representation of the size
     */
    toString: function() {
        var f = Formatter.instance;
        return '{ width: ' + f.number(this.width)
                + ', height: ' + f.number(this.height) + ' }';
    },

    _serialize: function(options) {
        var f = options.formatter;
        // See Point#_serialize()
        return [f.number(this.width),
                f.number(this.height)];
    },

    /**
     * Returns the addition of the supplied value to the width and height of the
     * size as a new size. The object itself is not modified!
     *
     * @name Size#add
     * @function
     * @operator
     * @param {Number} number the number to add
     * @return {Size} the addition of the size and the value as a new size
     *
     * @example
     * var size = new Size(5, 10);
     * var result = size + 20;
     * console.log(result); // {width: 25, height: 30}
     */
    /**
     * Returns the addition of the width and height of the supplied size to the
     * size as a new size. The object itself is not modified!
     *
     * @name Size#add
     * @function
     * @operator
     * @param {Size} size the size to add
     * @return {Size} the addition of the two sizes as a new size
     *
     * @example
     * var size1 = new Size(5, 10);
     * var size2 = new Size(10, 20);
     * var result = size1 + size2;
     * console.log(result); // {width: 15, height: 30}
     */
    add: function(/* size */) {
        var size = Size.read(arguments);
        return new Size(this.width + size.width, this.height + size.height);
    },

    /**
     * Returns the subtraction of the supplied value from the width and height
     * of the size as a new size. The object itself is not modified!
     * The object itself is not modified!
     *
     * @name Size#subtract
     * @function
     * @operator
     * @param {Number} number the number to subtract
     * @return {Size} the subtraction of the size and the value as a new size
     *
     * @example
     * var size = new Size(10, 20);
     * var result = size - 5;
     * console.log(result); // {width: 5, height: 15}
     */
    /**
     * Returns the subtraction of the width and height of the supplied size from
     * the size as a new size. The object itself is not modified!
     *
     * @name Size#subtract
     * @function
     * @operator
     * @param {Size} size the size to subtract
     * @return {Size} the subtraction of the two sizes as a new size
     *
     * @example
     * var firstSize = new Size(10, 20);
     * var secondSize = new Size(5, 5);
     * var result = firstSize - secondSize;
     * console.log(result); // {width: 5, height: 15}
     */
    subtract: function(/* size */) {
        var size = Size.read(arguments);
        return new Size(this.width - size.width, this.height - size.height);
    },

    /**
     * Returns the multiplication of the supplied value with the width and
     * height of the size as a new size. The object itself is not modified!
     *
     * @name Size#multiply
     * @function
     * @operator
     * @param {Number} number the number to multiply by
     * @return {Size} the multiplication of the size and the value as a new size
     *
     * @example
     * var size = new Size(10, 20);
     * var result = size * 2;
     * console.log(result); // {width: 20, height: 40}
     */
    /**
     * Returns the multiplication of the width and height of the supplied size
     * with the size as a new size. The object itself is not modified!
     *
     * @name Size#multiply
     * @function
     * @operator
     * @param {Size} size the size to multiply by
     * @return {Size} the multiplication of the two sizes as a new size
     *
     * @example
     * var firstSize = new Size(5, 10);
     * var secondSize = new Size(4, 2);
     * var result = firstSize * secondSize;
     * console.log(result); // {width: 20, height: 20}
     */
    multiply: function(/* size */) {
        var size = Size.read(arguments);
        return new Size(this.width * size.width, this.height * size.height);
    },

    /**
     * Returns the division of the supplied value by the width and height of the
     * size as a new size. The object itself is not modified!
     *
     * @name Size#divide
     * @function
     * @operator
     * @param {Number} number the number to divide by
     * @return {Size} the division of the size and the value as a new size
     *
     * @example
     * var size = new Size(10, 20);
     * var result = size / 2;
     * console.log(result); // {width: 5, height: 10}
     */
    /**
     * Returns the division of the width and height of the supplied size by the
     * size as a new size. The object itself is not modified!
     *
     * @name Size#divide
     * @function
     * @operator
     * @param {Size} size the size to divide by
     * @return {Size} the division of the two sizes as a new size
     *
     * @example
     * var firstSize = new Size(8, 10);
     * var secondSize = new Size(2, 5);
     * var result = firstSize / secondSize;
     * console.log(result); // {width: 4, height: 2}
     */
    divide: function(/* size */) {
        var size = Size.read(arguments);
        return new Size(this.width / size.width, this.height / size.height);
    },

    /**
     * The modulo operator returns the integer remainders of dividing the size
     * by the supplied value as a new size.
     *
     * @name Size#modulo
     * @function
     * @operator
     * @param {Number} value
     * @return {Size} the integer remainders of dividing the size by the value
     * as a new size
     *
     * @example
     * var size = new Size(12, 6);
     * console.log(size % 5); // {width: 2, height: 1}
     */
    /**
     * The modulo operator returns the integer remainders of dividing the size
     * by the supplied size as a new size.
     *
     * @name Size#modulo
     * @function
     * @operator
     * @param {Size} size
     * @return {Size} the integer remainders of dividing the sizes by each
     * other as a new size
     *
     * @example
     * var size = new Size(12, 6);
     * console.log(size % new Size(5, 2)); // {width: 2, height: 0}
     */
    modulo: function(/* size */) {
        var size = Size.read(arguments);
        return new Size(this.width % size.width, this.height % size.height);
    },

    negate: function() {
        return new Size(-this.width, -this.height);
    },

    /**
     * {@grouptitle Tests}
     * Checks if this size has both the width and height set to 0.
     *
     * @return {Boolean} {@true if both width and height are 0}
     */
    isZero: function() {
        var isZero = Numerical.isZero;
        return isZero(this.width) && isZero(this.height);
    },

    /**
     * Checks if the width or the height of the size are NaN.
     *
     * @return {Boolean} {@true if the width or height of the size are NaN}
     */
    isNaN: function() {
        return isNaN(this.width) || isNaN(this.height);
    },

    /**
     * {@grouptitle Math Functions}
     *
     * Returns a new size with rounded {@link #width} and {@link #height}
     * values. The object itself is not modified!
     *
     * @name Size#round
     * @function
     * @return {Size}
     *
     * @example
     * var size = new Size(10.2, 10.9);
     * var roundSize = size.round();
     * console.log(roundSize); // {x: 10, y: 11}
     */

    /**
     * Returns a new size with the nearest greater non-fractional values to the
     * specified {@link #width} and {@link #height} values. The object itself is
     * not modified!
     *
     * @name Size#ceil
     * @function
     * @return {Size}
     *
     * @example
     * var size = new Size(10.2, 10.9);
     * var ceilSize = size.ceil();
     * console.log(ceilSize); // {x: 11, y: 11}
     */

    /**
     * Returns a new size with the nearest smaller non-fractional values to the
     * specified {@link #width} and {@link #height} values. The object itself is
     * not modified!
     *
     * @name Size#floor
     * @function
     * @return {Size}
     *
     * @example
     * var size = new Size(10.2, 10.9);
     * var floorSize = size.floor();
     * console.log(floorSize); // {x: 10, y: 10}
     */

    /**
     * Returns a new size with the absolute values of the specified
     * {@link #width} and {@link #height} values. The object itself is not
     * modified!
     *
     * @name Size#abs
     * @function
     * @return {Size}
     *
     * @example
     * var size = new Size(-5, 10);
     * var absSize = size.abs();
     * console.log(absSize); // {x: 5, y: 10}
     */

    statics: /** @lends Size */{
        /**
         * Returns a new size object with the smallest {@link #width} and
         * {@link #height} of the supplied sizes.
         *
         * @static
         * @param {Size} size1
         * @param {Size} size2
         * @return {Size} the newly created size object
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
        min: function(size1, size2) {
            return new Size(
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
         * @return {Size} the newly created size object
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
        max: function(size1, size2) {
            return new Size(
                Math.max(size1.width, size2.width),
                Math.max(size1.height, size2.height));
        },

        /**
         * Returns a size object with random {@link #width} and {@link #height}
         * values between `0` and `1`.
         *
         * @return {Size} the newly created size object
         * @static
         *
         * @example
         * var maxSize = new Size(100, 100);
         * var randomSize = Size.random();
         * var size = maxSize * randomSize;
         */
        random: function() {
            return new Size(Math.random(), Math.random());
        }
    }
}, Base.each(['round', 'ceil', 'floor', 'abs'], function(key) {
    // Inject round, ceil, floor, abs:
    var op = Math[key];
    this[key] = function() {
        return new Size(op(this.width), op(this.height));
    };
}, {}));

/**
 * @name LinkedSize
 *
 * @class An internal version of Size that notifies its owner of each change
 * through setting itself again on the setter that corresponds to the getter
 * that produced this LinkedSize.
 *
 * @private
 */
var LinkedSize = Size.extend({
    // Have LinkedSize appear as a normal Size in debugging
    initialize: function Size(width, height, owner, setter) {
        this._width = width;
        this._height = height;
        this._owner = owner;
        this._setter = setter;
    },

    // See Point#_set() for an explanation of #_set():
    _set: function(width, height, _dontNotify) {
        this._width = width;
        this._height = height;
        if (!_dontNotify)
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
    }
});
