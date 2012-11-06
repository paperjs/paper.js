/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
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
		point1 = Point.read(arguments);
		point2 = Point.read(arguments);
		if (arguments.length == 3) {
			this.point = point1;
			this.vector = point2.subtract(point1);
			this.infinite = infinite;
		} else {
			this.point = point1;
			this.vector = point2;
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
	 * @return {Point} the intersection point of the lines
	 */
	intersect: function(line) {
		var cross = this.vector.cross(line.vector);
		// Avoid divisions by 0, and errors when getting too close to 0
		if (Numerical.isZero(cross))
			return null;
		var v = line.point.subtract(this.point),
			t1 = v.cross(line.vector) / cross,
			t2 = v.cross(this.vector) / cross;
		// Check the ranges of t parameters if the line is not allowed to
		// extend beyond the definition points.
		return (this.infinite || 0 <= t1 && t1 <= 1)
				&& (line.infinite || 0 <= t2 && t2 <= 1)
			? this.point.add(this.vector.multiply(t1)) : null;
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
	}
});
