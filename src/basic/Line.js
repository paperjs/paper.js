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
	 * @param {Boolean} [asVector=false]
	 */
	initialize: function(point1, point2, asVector) {
		this.point = Point.read(arguments);
		this.vector = Point.read(arguments);
		if (!Base.read(arguments))
			this.vector = this.vector.subtract(this.point);
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
	 * @param {Line} line
	 * @param {Boolean} [isInfinite=false]
	 * @return {Point} the intersection point of the lines, {@code undefined}
	 * if the two lines are colinear, or {@code null} if they don't intersect.
	 */
	intersect: function(line, isInfinite) {
		var p1 = this.point,
			v1 = this.vector,
			p2 = line.point,
			v2 = line.vector;
		return Line.intersect(p1.x, p1.y, v1.x, v1.y, p2.x, p2.y, v2.x, v2.y,
				true, isInfinite);
	},

	// DOCS: document Line#getSide(point)
	/**
	 * @param {Point} point
	 * @return {Number}
	 */
	getSide: function(point) {
		point = Point.read(arguments);
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

	// DOCS: document Line#getSignedDistance(point)
	/**
	 * @param {Point} point
	 * @return {Number}
	 */
	getSignedDistance: function(point) {
		var m = this.vector.y / this.vector.x, // slope
			b = this.point.y - (m * this.point.x); // y offset
		// Distance to the linear equation
		return (point.y - (m * point.x) - b) / Math.sqrt(m * m + 1);
	},

	// DOCS: document Line#getDistance(point)
	/**
	 * @param {Point} point
	 * @return {Number}
	 */
	getDistance: function(point) {
		return Math.abs(this.getSignedDistance(point));
	},

	statics: /** @lends Line */{
		intersect: function(ax1, ay1, ax2, ay2, bx1, by1, bx2, by2, asVectors,
				isInfinite) {
			// Convert 2nd points to vectors if they are not specified as such.
			if (!asVectors) {
				ax2 -= ax1;
				ay2 -= ay1;
				bx2 -= bx1;
				by2 -= by1;
			}
			var cross = by2 * ax2 - bx2 * ay2;
			// Avoid divisions by 0, and errors when getting too close to 0
			if (!Numerical.isZero(cross)) {
				var dx = ax1 - bx1,
					dy = ay1 - by1,
					ta = (bx2 * dy - by2 * dx) / cross,
					tb = (ax2 * dy - ay2 * dx) / cross;
				// Check the ranges of t parameters if the line is not allowed
				// to extend beyond the definition points.
				if ((isInfinite || 0 <= ta && ta <= 1)
						&& (isInfinite || 0 <= tb && tb <= 1))
					return Point.create(
								ax1 + ta * ax2,
								ay1 + ta * ay2);
			}
		}
	}
});
