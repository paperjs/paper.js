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

var CurveFlattener = Base.extend({
	initialize: function(curve) {
		this.parts = [];
		this.length = 0;
		// Keep a current index from where we last where in getParameter(), to
		// optimise for iterator-like usage of the flattener.
		this.index = 0;
		this.curve = curve.getCurveValues();
		this._computeParts(this.curve, 0, 1);
	},

	_computeParts: function(values, minT, maxT) {
		// Check if the t-span is big enough for subdivision.
		// We're not subdividing more than 32 times...
		if ((maxT - minT) > 1 / 32
				&& !Curve.isSufficientlyFlat.apply(Curve, values)) {
			var curves = Curve.subdivide.apply(Curve, values);
			var halfT = (minT + maxT) / 2;
			// Recursively subdive and compute parts again.
			this._computeParts(curves[0], minT, halfT);
			this._computeParts(curves[1], halfT, maxT);
		} else {
			// Calculate distance between p1 and p2
			var x = values[6] - values[0],
				y = values[7] - values[1],
				dist = Math.sqrt(x * x + y * y);
			if (dist > Numerical.TOLERANCE) {
				this.length += dist;
				this.parts.push({
					length: this.length,
					value: maxT
				});
			}
		}
	},

	getParameter: function(length) {
		// Make sure we're not beyond the requested length already. Search the
		// start position backwards from where to then process the loop below.
		var i, j = this.index;
		for (;;) {
			i = j;
			if (j == 0 || this.parts[--j].length < length)
				break;
		}
		// Find the segment that succeeds the given length, then interpolate
		// with the previous segment
		for (var l = this.parts.length; i < l; i++) {
			var segment = this.parts[i];
			if (segment.length >= length) {
				this.index = i;
				var prev = this.parts[i - 1],
					prevValue = prev ? prev.value : 0,
					prevLength = prev ? prev.length : 0;
				// Interpolate
				return prevValue + (segment.value - prevValue)
					* (length - prevLength) /  (segment.length - prevLength);
			}
		}
		return 1;
	},

	drawDash: function(ctx, from, to, moveTo) {
		from = this.getParameter(from);
		to = this.getParameter(to);
		var curve = this.curve;
		if (from > 0) {
			// 8th argument of Curve.subdivide() == t, and values can be
			// directly used as arguments list for apply().
			curve[8] = from; // See above
			curve = Curve.subdivide.apply(Curve, curve)[1]; // right
		}
		if (moveTo) {
			ctx.moveTo(curve[0], curve[1]);
		}
		if (to < 1) {
			// Se above about curve[8].
			// Interpolate the  parameter at 'to' in the new curve and cut there
			curve[8] = (to - from) / (1 - from);
			curve = Curve.subdivide.apply(Curve, curve)[0]; // left
		}
		ctx.bezierCurveTo.apply(ctx, curve.slice(2));
	}
});
