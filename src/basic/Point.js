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

/**
 * The Point object represents a point in the two dimensional space of the
 * Paper.js document. It is also used to represent two dimensional vector
 * objects.
 */
var Point = this.Point = Base.extend({
	beans: true,

	initialize: function(arg0, arg1) {
		if (arguments.length == 2) {
			this.x = arg0;
			this.y = arg1;
		} else if (arguments.length == 1) {
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

	set: function(x, y) {
		this.x = x;
		this.y = y;
		return this;
	},

	/**
	 * Returns a copy of the point.
	 * This is useful as the following code only generates a flat copy:
	 * 
	 * @return the cloned point
	 */
	clone: function() {
		return Point.create(this.x, this.y);
	},

	add: function(point) {
		point = Point.read(arguments);
		return Point.create(this.x + point.x, this.y + point.y);
	},

	subtract: function(point) {
		point = Point.read(arguments);
		return Point.create(this.x - point.x, this.y - point.y);
	},

	multiply: function(point) {
		point = Point.read(arguments);
		return Point.create(this.x * point.x, this.y * point.y);
	},

	divide: function(point) {
		point = Point.read(arguments);
		return Point.create(this.x / point.x, this.y / point.y);
	},

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

	getQuadrant: function() {
		return this.x >= 0 ? this.y >= 0 ? 1 : 4 : this.y >= 0 ? 2 : 3;
	},

	/**
	 * The vector's angle, measured from the x-axis to the vector.
	 * 
	 * When supplied with a point, returns the smaller angle between two
	 * vectors. The angle is unsigned, no information about rotational
	 * direction is given.
	 * 
	 * Read more about angle units and orientation in the description of the
	 * {@link #getAngle()} property.
	 * 
	 * @param point
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
	 * {@link #getAngle()} property.
	 * 
	 * @param point
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
	 * {@link #getAngle()} property.
	 * 
	 * @param angle the rotation angle
	 * @param center the center point of the rotation
	 * @return the rotated point
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

	equals: function(point) {
		point = Point.read(arguments);
		return this.x == point.x && this.y == point.y;
	},

	/**
	 * Checks whether the point is inside the boundaries of the rectangle.
	 * 
	 * @param rect the rectangle to check against
	 * @return true if the point is inside the rectangle, false otherwise.
	 */
	isInside: function(rect) {
		return rect.contains(this);
	},

	/**
	 * Checks if the point is within a given distance of another point.
	 * 
	 * @param point the point to check against
	 * @param tolerance the maximum distance allowed
	 * @return true if it is within the given distance, false otherwise.
	 */
	isClose: function(point, tolerance) {
		return this.getDistance(point) < tolerance;
	},

	/**
	 * Checks if the vector represented by this point is colinear (parallel) to
	 * another vector.
	 * 
	 * @param point the vector to check against
	 * @return true if it is parallel, false otherwise.
	 */
	isColinear: function(point) {
		return this.cross(point) < Numerical.TOLERANCE;
	},

	/**
	 * Checks if the vector represented by this point is orthogonal
	 * (perpendicular) to another vector.
	 * 
	 * @param point the vector to check against
	 * @return true if it is orthogonal, false otherwise.
	 */
	isOrthogonal: function(point) {
		return this.dot(point) < Numerical.TOLERANCE;
	},

	/**
	 * Checks if this point has both the x and y coordinate set to 0.
	 * 
	 * @return true if both x and y are 0, false otherwise.
	 */
	isZero: function() {
		return this.x == 0 && this.y == 0;
	},

	/**
	 * Checks if this point has an undefined value for at least one of its
	 * coordinates.
	 * 
	 * @return true if either x or y are not a number, false otherwise.
	 */
	isNaN: function() {
		return isNaN(this.x) || isNaN(this.y);
	},
	
	/**
	 * Returns the dot product of the point and another point.
	 * @param point
	 * @return the dot product of the two points
	 */
	dot: function(point) {
		point = Point.read(arguments);
		return this.x * point.x + this.y * point.y;
	},

	/**
	 * Returns the cross product of the point and another point.
	 * @param point
	 * @return the cross product of the two points
	 */
	cross: function(point) {
		point = Point.read(arguments);
		return this.x * point.y - this.y * point.x;
	},

	/**
	 * Returns the projection of the point on another point.
	 * Both points are interpreted as vectors.
	 * 
	 * @param point
	 * @return the project of the point on another point
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

	toString: function() {
		var format = Base.formatNumber;
		return '{ x: ' + format(this.x) + ', y: ' + format(this.y) + ' }';
	},

	statics: {
		/**
		 * Provide a faster creator for Points out of two coordinates that
		 * does not rely on Point#initialize at all. This speeds up all math
		 * operations a lot.
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
		 * @param point1
		 * @param point2
		 * @return The newly created point object
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
		 * @param point1
		 * @param point2
		 * @return The newly created point object
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
		 */
		random: function() {
			return Point.create(Math.random(), Math.random());
		}
	}
}, new function() { // Scope for injecting round, ceil, floor, abs:
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
 */
var LinkedPoint = Point.extend({
	beans: true,

	set: function(x, y) {
		this._x = x;
		this._y = y;
		this._owner[this._set](this);
		return this;
	},

	getX: function() {
		return this._x;
	},

	setX: function(x) {
		this._x = x;
		this._owner[this._set](this);
	},

	getY: function() {
		return this._y;
	},

	setY: function(y) {
		this._y = y;
		this._owner[this._set](this);
	},

	statics: {
		create: function(owner, set, x, y) {
			var point = new LinkedPoint(LinkedPoint.dont);
			point._x = x;
			point._y = y;
			point._owner = owner;
			point._set = set;
			return point;
		}
	}
});
