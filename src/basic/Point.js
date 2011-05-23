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

var Point = this.Point = Base.extend({
	/** @lends Point# */

	beans: true,

	/**
	 * Creates a Point object with the given x and y coordinates.
	 *
	 * @name Point
	 * @constructor
	 * @param {number} x the x coordinate
	 * @param {number} y the y coordinate
	 * 
	 * @class The Point object represents a point in the two dimensional space
	 * of the Paper.js project. It is also used to represent two dimensional
	 * vector objects.
	 */
	initialize: function(arg0, arg1) {
		if (arg1 !== undefined) {
			this.x = arg0;
			this.y = arg1;
		} else if (arg0 !== undefined) {
			if (arg0 == null) {
				this.x = this.y = 0;
			} else if (arg0.x !== undefined) {
				this.x = arg0.x;
				this.y = arg0.y;
			} else if (arg0.width !== undefined) {
				this.x = arg0.width;
				this.y = arg0.height;
			} else if (Array.isArray(arg0)) {
				this.x = arg0[0];
				this.y = arg0.length > 1 ? arg0[1] : arg0[0];
			} else if (arg0.angle !== undefined) {
				this.x = arg0.length;
				this.y = 0;
				this.setAngle(arg0.angle);
			} else if (typeof arg0 === 'number') {
				this.x = this.y = arg0;
			} else {
				this.x = this.y = 0;
			}
		} else {
			this.x = this.y = 0;
		}
	},

	/**
	 * The x coordinate of the point
	 *
	 * @name Point#x
	 * @type number
	 */

	/**
	 * The y coordinate of the point
	 * 
	 * @name Point#y
	 * @type number
	 */

	set: function(x, y) {
		this.x = x;
		this.y = y;
		return this;
	},

	/**
	 * Returns a copy of the point.
	 * This is useful as the following code only generates a flat copy:
	 * @example
	 * var point1 = new Point();
	 * var point2 = point1;
	 * point2.x = 1; // also changes point1.x
	 * 
	 * var point2 = point1.clone();
	 * point2.x = 1; // doesn't change point1.x
	 * 
	 * @returns {Point} the cloned point
	 */
	clone: function() {
		return Point.create(this.x, this.y);
	},

	/**
	 * Returns the addition of the supplied value to both coordinates of
	 * the point as a new point.
	 * The object itself is not modified!
	 * 
	 * @example
	 * var point = new Point(5, 10);
	 * var result = point + 20;
	 * console.log(result); // { x: 25.0, y: 30.0 }
	 * 
	 * @name Point#add^2
	 * @function
	 * @param {number} number the number to add
	 * @return {Point} the addition of the point and the value as a new point
	 */
	/**
	 * Returns the addition of the supplied point to the point as a new
	 * point.
	 * The object itself is not modified!
	 * 
	 * @example
	 * var point1 = new Point(5, 10);
	 * var point2 = new Point(10, 20);
	 * var result = point1 + point2;
	 * console.log(result); // { x: 15.0, y: 30.0 }
	 * 
	 * @name Point#add
	 * @function
	 * @param {Point} point the point to add
	 * @return {Point} the addition of the two points as a new point
	 */
	add: function(point) {
		point = Point.read(arguments);
		return Point.create(this.x + point.x, this.y + point.y);
	},

	/**
	 * Returns the subtraction of the supplied value to both coordinates of
	 * the point as a new point.
	 * The object itself is not modified!
	 * 
	 * @example
	 * var point = new Point(10, 20);
	 * var result = point - 5;
	 * console.log(result); // { x: 5.0, y: 15.0 }
	 * 
	 * @name Point#subtract^2
	 * @function
	 * @param {number} number the number to subtract
	 * @return {Point} the subtraction of the point and the value as a new point
	 */
	/**
	 * Returns the subtraction of the supplied point to the point as a new
	 * point.
	 * The object itself is not modified!
	 * 
	 * @example
	 * var firstPoint = new Point(10, 20);
	 * var secondPoint = new Point(5, 5);
	 * var result = firstPoint - secondPoint;
	 * console.log(result); // { x: 5.0, y: 15.0 }
	 * 
	 * @name Point#subtract
	 * @function
	 * @param {Point} point the point to subtract
	 * @return {Point} the subtraction of the two points as a new point
	 */
	subtract: function(point) {
		point = Point.read(arguments);
		return Point.create(this.x - point.x, this.y - point.y);
	},

	/**
	 * Returns the multiplication of the supplied value to both coordinates of
	 * the point as a new point.
	 * The object itself is not modified!
	 * 
	 * @example
	 * var point = new Point(10, 20);
	 * var result = point * 2;
	 * console.log(result); // { x: 20.0, y: 40.0 }
	 * 
	 * @name Point#multiply^2
	 * @function
	 * @param {number} number the number to multiply by
	 * @return {Point} the multiplication of the point and the value as a new point
	 */
	/**
	 * Returns the multiplication of the supplied point to the point as a new
	 * point.
	 * The object itself is not modified!
	 * 
	 * @example
	 * var firstPoint = new Point(5, 10);
	 * var secondPoint = new Point(4, 2);
	 * var result = firstPoint * secondPoint;
	 * console.log(result); // { x: 20.0, y: 20.0 }
	 * 
	 * @name Point#multiply
	 * @function
	 * @param {Point} point the point to multiply by
	 * @return {Point} the multiplication of the two points as a new point
	 */
	multiply: function(point) {
		point = Point.read(arguments);
		return Point.create(this.x * point.x, this.y * point.y);
	},

	/**
	 * Returns the division of the supplied value to both coordinates of
	 * the point as a new point.
	 * The object itself is not modified!
	 * 
	 * @example
	 * var point = new Point(10, 20);
	 * var result = point / 2;
	 * console.log(result); // { x: 5.0, y: 10.0 }
	 * 
	 * @name Point#divide^2
	 * @function
	 * @param {number} number the number to divide by
	 * @return {Point} the division of the point and the value as a new point
	 */
	/**
	 * Returns the division of the supplied point to the point as a new
	 * point.
	 * The object itself is not modified!
	 * 
	 * @example
	 * var firstPoint = new Point(8, 10);
	 * var secondPoint = new Point(2, 5);
	 * var result = firstPoint / secondPoint;
	 * console.log(result); // { x: 4.0, y: 2.0 }
	 * 
	 * @name Point#divide
	 * @function
	 * @param {Point} point the point to divide by
	 * @return {Point} the division of the two points as a new point
	 */
	divide: function(point) {
		point = Point.read(arguments);
		return Point.create(this.x / point.x, this.y / point.y);
	},

	/**
	 * The modulo operator returns the integer remainders of dividing the point
	 * by the supplied value as a new point.
	 * 
	 * @example
	 * var point = new Point(12, 6);
	 * console.log(point % 5); // {x: 2, y: 1}
	 * 
	 * @name Point#modulo^2
	 * @function
	 * @param {number} value
	 * @return {Point} the integer remainders of dividing the point by the value
	 *                 as a new point
	 */
	/**
	 * The modulo operator returns the integer remainders of dividing the point
	 * by the supplied value as a new point.
	 * 
	 * @example
	 * var point = new Point(12, 6);
	 * console.log(point % new Point(5, 2)); // {x: 2, y: 0}
	 * 
	 * @name Point#modulo
	 * @function
	 * @param {Point} point
	 * @return {Point} the integer remainders of dividing the points by each
	 *                 other as a new point
	 */
	modulo: function(point) {
		point = Point.read(arguments);
		return Point.create(this.x % point.x, this.y % point.y);
	},

	negate: function() {
		return Point.create(-this.x, -this.y);
	},

	transform: function(matrix) {
		return matrix._transformPoint(this);
	},

	/**
	 * Returns the distance between the point and another point.
	 * @return {number}
	 */
	getDistance: function(point) {
		point = Point.read(arguments);
		var x = point.x - this.x,
			y = point.y - this.y;
		return Math.sqrt(x * x + y * y);
	},

	/**
	 * The length of the vector that is represented by this point's coordinates.
	 * Each point can be interpreted as a vector that points from the origin
	 * ({@code x = 0},{@code y = 0}) to the point's location.
	 * Setting the length changes the location but keeps the vector's angle.
	 * 
	 * @type number
	 * @bean
	 */
	getLength: function() {
		return Math.sqrt(this.x * this.x + this.y * this.y);
	},

	setLength: function(length) {
		// Whenever setting x/y, use #set() instead of direct assignment,
		// so LinkedPoint does not report changes twice.
		if (this.isZero()) {
			var angle = this._angle || 0;
			this.set(
				Math.cos(angle) * length,
				Math.sin(angle) * length
			);
		} else {
			var scale = length / this.getLength();
			// Force calculation of angle now, so it will be preserved even when
			// x and y are 0
			if (scale == 0)
				this.getAngle();
			this.set(
				this.x * scale,
				this.y * scale
			);
		}
		return this;
	},

	// DOCS: Point#length
	/**
	 * @param {number} length
	 * @return {Point}
	 */
	normalize: function(length) {
		if (length === undefined)
			length = 1;
		var current = this.getLength(),
			scale = current != 0 ? length / current : 0,
			point = Point.create(this.x * scale, this.y * scale);
		// Preserve angle.
		point._angle = this._angle;
		return point;
	},

	// DOCS: Point#getQuadrant
	/**
	 * @return {number}
	 */
	getQuadrant: function() {
		return this.x >= 0 ? this.y >= 0 ? 1 : 4 : this.y >= 0 ? 2 : 3;
	},

	/**
	 * Returns the smaller angle between two vectors. The angle is unsigned, no
	 * information about rotational direction is given.
	 * 
	 * @name Point#getAngle
	 * @function
	 * @param {Point} point
	 * @return {number} the angle in degrees
	 */
	/**
	 * The vector's angle in degrees, measured from the x-axis to the vector.
	 * 
	 * The angle is unsigned, no information about rotational direction is
	 * given.
	 * 
	 * @type number
	 * @bean
	 */
	getAngle: function(/* point */) {
		// Hide parameters from Bootstrap so it injects bean too
		return this.getAngleInRadians(arguments[0]) * 180 / Math.PI;
	},

	setAngle: function(angle) {
		angle = this._angle = angle * Math.PI / 180;
		if (!this.isZero()) {
			var length = this.getLength();
			// Use #set() instead of direct assignment of x/y, so LinkedPoint
			// does not report changes twice.
			this.set(
				Math.cos(angle) * length,
				Math.sin(angle) * length
			);
		}
		return this;
	},

	/**
	 * Returns the smaller angle between two vectors in radians. The angle is
	 * unsigned, no information about rotational direction is given.
	 * 
	 * @name Point#getAngleInRadians
	 * @function
	 * @param {Point} point
	 * @return {number} the angle in radians
	 */
	/**
	 * The vector's angle in radians, measured from the x-axis to the vector.
	 * 
	 * The angle is unsigned, no information about rotational direction is
	 * given.
	 * 
	 * @type number
	 * @bean
	 */
	getAngleInRadians: function(/* point */) {
		// Hide parameters from Bootstrap so it injects bean too
		if (arguments[0] === undefined) {
			if (this._angle == null)
				this._angle = Math.atan2(this.y, this.x);
			return this._angle;
		} else {
			var point = Point.read(arguments),
				div = this.getLength() * point.getLength();
			if (div == 0) {
				return NaN;
			} else {
				return Math.acos(this.dot(point) / div);
			}
		}
	},

	getAngleInDegrees: function(/* point */) {
		return this.getAngle(arguments[0]);
	},

	/**
	 * Returns the angle between two vectors. The angle is directional and
	 * signed, giving information about the rotational direction.
	 * 
	 * Read more about angle units and orientation in the description of the
	 * {@link #angle} property.
	 * 
	 * @param {Point} point
	 */
	getDirectedAngle: function(point) {
		point = Point.read(arguments);
		var angle = this.getAngle() - point.getAngle();
		return angle < -180 ? angle + 360 : angle > 180 ? angle - 360 : angle;
	},

	/**
	 * Rotates the point by the given angle around an optional center point.
	 * The object itself is not modified.
	 * 
	 * Read more about angle units and orientation in the description of the
	 * {@link #angle} property.
	 * 
	 * @param {number} angle the rotation angle
	 * @param {Point} center the center point of the rotation
	 * @returns {Point} the rotated point
	 */
	rotate: function(angle, center) {
		angle = angle * Math.PI / 180;
		var point = center ? this.subtract(center) : this,
			s = Math.sin(angle),
			c = Math.cos(angle);
		point = Point.create(
			point.x * c - point.y * s,
			point.y * c + point.x * s
		);
		return center ? point.add(center) : point;
	},

	/**
	 * Checks whether the coordinates of the point are equal to that of the
	 * supplied point.
	 * 
	 * @example
	 * var point = new Point(5, 10);
	 * console.log(point == new Point(5, 10)); // true
	 * console.log(point == new Point(1, 1)); // false
	 * console.log(point != new Point(1, 1)); // true
	 *
	 * @param {Point}
	 * @return {boolean}
	 */
	equals: function(point) {
		point = Point.read(arguments);
		return this.x == point.x && this.y == point.y;
	},

	/**
	 * Checks whether the point is inside the boundaries of the rectangle.
	 * 
	 * @param {Rectangle} rect the rectangle to check against
	 * @returns {boolean} true if the point is inside the rectangle, false
	 * otherwise.
	 */
	isInside: function(rect) {
		return rect.contains(this);
	},

	/**
	 * Checks if the point is within a given distance of another point.
	 * 
	 * @param {Point} point the point to check against
	 * @param {number} tolerance the maximum distance allowed
	 * @returns {boolean} true if it is within the given distance, false
	 * otherwise.
	 */
	isClose: function(point, tolerance) {
		return this.getDistance(point) < tolerance;
	},

	/**
	 * Checks if the vector represented by this point is colinear (parallel) to
	 * another vector.
	 * 
	 * @param {Point} point the vector to check against
	 * @returns {boolean} true if it is parallel, false otherwise.
	 */
	isColinear: function(point) {
		return this.cross(point) < Numerical.TOLERANCE;
	},

	/**
	 * Checks if the vector represented by this point is orthogonal
	 * (perpendicular) to another vector.
	 * 
	 * @param {Point} point the vector to check against
	 * @returns {boolean} true if it is orthogonal, false otherwise.
	 */
	isOrthogonal: function(point) {
		return this.dot(point) < Numerical.TOLERANCE;
	},

	/**
	 * Checks if this point has both the x and y coordinate set to 0.
	 * 
	 * @returns {boolean} true if both x and y are 0, false otherwise.
	 */
	isZero: function() {
		return this.x == 0 && this.y == 0;
	},

	/**
	 * Checks if this point has an undefined value for at least one of its
	 * coordinates.
	 * 
	 * @returns {boolean} true if either x or y are not a number, false
	 * otherwise.
	 */
	isNaN: function() {
		return isNaN(this.x) || isNaN(this.y);
	},
	
	/**
	 * Returns the dot product of the point and another point.
	 * 
	 * @param {Point} point
	 * @returns {number} the dot product of the two points
	 */
	dot: function(point) {
		point = Point.read(arguments);
		return this.x * point.x + this.y * point.y;
	},

	/**
	 * Returns the cross product of the point and another point.
	 * 
	 * @param {Point} point
	 * @returns {number} the cross product of the two points
	 */
	cross: function(point) {
		point = Point.read(arguments);
		return this.x * point.y - this.y * point.x;
	},

	/**
	 * Returns the projection of the point on another point.
	 * Both points are interpreted as vectors.
	 * 
	 * @param {Point} point
	 * @returns {Point} the projection of the point on another point
	 */
	project: function(point) {
		point = Point.read(arguments);
		if (point.isZero()) {
			return Point.create(0, 0);
		} else {
			var scale = this.dot(point) / point.dot(point);
			return Point.create(
				point.x * scale,
				point.y * scale
			);
		}
	},

	/**
	 * @return {string} A string representation of the point.
	 */
	toString: function() {
		var format = Base.formatNumber;
		return '{ x: ' + format(this.x) + ', y: ' + format(this.y) + ' }';
	},

	statics: {
		/** @lends Point */

		/**
		 * Provide a faster creator for Points out of two coordinates that
		 * does not rely on Point#initialize at all. This speeds up all math
		 * operations a lot.
		 * 
		 * @ignore
		 */
		create: function(x, y) {
			// Don't use the shorter form as we want absolute maximum
			// performance here:
			// return new Point(Point.dont).set(x, y);
			// TODO: Benchmark and decide
			var point = new Point(Point.dont);
			point.x = x;
			point.y = y;
			return point;
		},

		/**
		 * Returns a new point object with the smallest {@link #x} and
		 * {@link #y} of the supplied points.
		 * 
		 * @static
		 * @param {Point} point1
		 * @param {Point} point2
		 * @returns {Point} The newly created point object
		 */
		min: function(point1, point2) {
			point1 = Point.read(arguments, 0, 1);
			point2 = Point.read(arguments, 1, 1);
			return Point.create(
				Math.min(point1.x, point2.x),
				Math.min(point1.y, point2.y)
			);
		},

		/**
		 * Returns a new point object with the largest {@link #x} and
		 * {@link #y} of the supplied points.
		 * 
		 * @static
		 * @param {Point} point1
		 * @param {Point} point2
		 * @returns {Point} The newly created point object
		 */
		max: function(point1, point2) {
			point1 = Point.read(arguments, 0, 1);
			point2 = Point.read(arguments, 1, 1);
			return Point.create(
				Math.max(point1.x, point2.x),
				Math.max(point1.y, point2.y)
			);
		},

		/**
		 * Returns a point object with random {@link #x} and {@link #y} values
		 * between {@code 0} and {@code 1}.
		 * 
		 * @returns {Point} The newly created point object
		 * @static
		 */
		random: function() {
			return Point.create(Math.random(), Math.random());
		}
	}
}, new function() { // Scope for injecting round, ceil, floor, abs:
	/**
	 * {@grouptitle Math Functions}
	 * 
	 * Returns a new point with rounded {@link #x} and {@link #y} values. The
	 * object itself is not modified!
	 * 
	 * @example
	 * var point = new Point(10.2, 10.9);
	 * var roundPoint = point.round();
	 * console.log(roundPoint); // { x: 10.0, y: 11.0 }
	 * 
	 * @name Point#round
	 * @function
	 * @return {Point}
	 */

	/**
	 * Returns a new point with the nearest greater non-fractional values to the
	 * specified {@link #x} and {@link #y} values. The object itself is not
	 * modified!
	 * 
	 * @example
	 * var point = new Point(10.2, 10.9);
	 * var ceilPoint = point.ceil();
	 * console.log(ceilPoint); // { x: 11.0, y: 11.0 }
	 * 
	 * @name Point#ceil
	 * @function
	 * @return {Point}
	 */

	/**
	 * Returns a new point with the nearest smaller non-fractional values to the
	 * specified {@link #x} and {@link #y} values. The object itself is not
	 * modified!
	 * 
	 * @example
	 * var point = new Point(10.2, 10.9);
	 * var floorPoint = point.floor();
	 * console.log(floorPoint); // { x: 10.0, y: 10.0 }
	 * 
	 * @name Point#floor
	 * @function
	 * @return {Point}
	 */

	/**
	 * Returns a new point with the absolute values of the specified {@link #x}
	 * and {@link #y} values. The object itself is not modified!
	 * 
	 * @example
	 * var point = new Point(-5, 10);
	 * var absPoint = point.abs();
	 * console.log(absPoint); // { x: 5.0, y: 10.0 }
	 * 
	 * @name Point#abs
	 * @function
	 * @return {Point}
	 */

	return Base.each(['round', 'ceil', 'floor', 'abs'], function(name) {
		var op = Math[name];
		this[name] = function() {
			return Point.create(op(this.x), op(this.y));
		};
	}, {});
});

/**
 * An internal version of Point that notifies its owner of each change through
 * setting itself again on the setter that corresponds to the getter that
 * produced this LinkedPoint. See uses of LinkedPoint.create()
 * Note: This prototype is not exported.
 *
 * @ignore
 */
var LinkedPoint = Point.extend({
	beans: true,

	set: function(x, y, dontNotify) {
		this._x = x;
		this._y = y;
		if (!dontNotify)
			this._owner[this._setter](this);
		return this;
	},

	getX: function() {
		return this._x;
	},

	setX: function(x) {
		this._x = x;
		this._owner[this._setter](this);
	},

	getY: function() {
		return this._y;
	},

	setY: function(y) {
		this._y = y;
		this._owner[this._setter](this);
	},

	statics: {
		create: function(owner, setter, x, y) {
			var point = new LinkedPoint(LinkedPoint.dont);
			point._x = x;
			point._y = y;
			point._owner = owner;
			point._setter = setter;
			return point;
		}
	}
});
