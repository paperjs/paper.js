/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name Line
 *
 * @class The Line object represents..
 */
var Line = this.Line = Base.extend(/** @lends Line# */{
	// DOCS: document Line class and constructor
	/**
	 * Creates a Line object.
	 *
	 * @param {Point} point1
	 * @param {Point} point2
	 * @param {Boolean} [infinite=true]
	 */
	initialize: function(point1, point2, infinite) {
		// Convention: With 3 parameters, both points are absolute, and infinite
		// controls wether the line extends beyond the defining points, meaning
		// intersection outside the line segment are allowed.
		// With two parameters, the 2nd parameter is a direction, and infinite
		// is automatially true, since we're describing an infinite line.
		var _point1 = Point.read(arguments),
			_point2 = Point.read(arguments),
			_infinite = Base.read(arguments);
		if (_infinite !== undefined) {
			this.point = _point1;
			this.vector = _point2.subtract(_point1);
			this.infinite = _infinite;
		} else {
			this.point = _point1;
			this.vector = _point2;
			this.infinite = true;
		}
	},

	/**
	 * The starting point of the line
	 *
	 * @name Line#point
	 * @type Point
	 */

	/**
	 * The vector of the line
	 *
	 * @name Line#vector
	 * @type Point
	 */

	/**
	 * Specifies whether the line extends infinitely
	 *
	 * @name Line#infinite
	 * @type Boolean
	 */

	/**
	 * @param {Line} line
	 * @return {Point} the intersection point of the lines, {@code undefined}
	 * if the two lines are colinear, or {@code null} if they don't intersect.
	 */
	intersect: function(line) {
		var cross = this.vector.cross(line.vector);
		// Avoid divisions by 0, and errors when getting too close to 0
		if (Numerical.isZero(cross))
			return undefined;
		var v = line.point.subtract(this.point),
			t1 = v.cross(line.vector) / cross,
			t2 = v.cross(this.vector) / cross;
		// Check the ranges of t parameters if the line is not allowed to
		// extend beyond the definition points.
		return (this.infinite || 0 <= t1 && t1 <= 1)
				&& (line.infinite || 0 <= t2 && t2 <= 1)
			? this.point.add(this.vector.multiply(t1))
			: null;
	},

	// DOCS: document Line#getSide(point)
	/**
	 * @param {Point} point
	 * @return {Number}
	 */
	getSide: function(point) {
		var v1 = this.vector,
			v2 = point.subtract(this.point),
			ccw = v2.cross(v1);
		if (ccw === 0) {
			ccw = v2.dot(v1);
			if (ccw > 0) {
				ccw = v2.subtract(v1).dot(v1);
				if (ccw < 0)
				    ccw = 0;
			}
		}
		return ccw < 0 ? -1 : ccw > 0 ? 1 : 0;
	},

	// DOCS: document Line#getDistance(point)
	/**
	 * @param {Point} point
	 * @return {Number}
	 */
	getDistance: function(point) {
		var m = this.vector.y / this.vector.x, // slope
			b = this.point.y - (m * this.point.x); // y offset
		// Distance to the linear equation
		var dist = Math.abs(point.y - (m * point.x) - b) / Math.sqrt(m * m + 1);
		return this.infinite ? dist : Math.min(dist,
				point.getDistance(this.point),
				point.getDistance(this.point.add(this.vector)));
	},

	statics: {
		intersect: function(ax1, ay1, ax2, ay2, bx1, by1, bx2, by2, infinite) {
			var adx = ax2 - ax1,
				ady = ay2 - ay1,
				bdx = bx2 - bx1,
				bdy = by2 - by1,
				dx = ax1 - bx1,
				dy = ay1 - by1,
				cross = bdy * adx - bdx * ady;
			if (!Numerical.isZero(cross)) {
				var ta = (bdx * dy - bdy * dx) / cross,
					tb = (adx * dy - ady * dx) / cross;
					if ((infinite || 0 <= ta && ta <= 1)
							&& (infinite || 0 <= tb && tb <= 1))
						return Point.create(
									ax1 + ta * adx,
									ay1 + ta * ady);
			}
		}
	}
});
