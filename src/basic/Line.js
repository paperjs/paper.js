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

var Line = this.Line = Base.extend({
	initialize: function(point1, point2, infinite) {
		// Convention: With 3 parameters, both points are absolute, and infinite
		// controls wether the line extends beyond the defining points, meaning
		// intersection outside the line segment are allowed.
		// With two parameters, the 2nd parameter is a direction, and infinite
		// is automatially true, since we're describing an infinite line.
		point1 = Point.read(arguments, 0, 1);
		point2 = Point.read(arguments, 1, 1);
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

	intersect: function(line) {
		var cross = this.vector.cross(line.vector);
		// Epsilon tolerance
		if (Math.abs(cross) <= 10e-6)
			return null;
		var v = line.point.subtract(this.point)
			t1 = v.cross(line.vector) / cross,
			t2 = v.cross(this.vector) / cross;
		// Check the ranges of t parameters if the line is not allowed to
		// extend beyond the definition points.
		return (this.infinite || 0 <= t1 && t1 <= 1)
				&& (line.infinite || 0 <= t2 && t2 <= 1)
			? this.point.add(this.vector.multiply(t1)) : null;
	},

	getSide: function(p) {
		var v1 = this.vector,
			v2 = p.subtract(this.point),
			ccw = v2.cross(v1);
		if (ccw == 0.0) {
			ccw = v2.dot(v1);
			if (ccw > 0.0) {
				ccw = (v2 - v1).dot(v1);
				if (ccw < 0.0)
				    ccw = 0.0;
			}
		}
		return ccw < 0.0 ? -1 : ccw > 0.0 ? 1 : 0;
	}
});
