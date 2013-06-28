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

var PathFlattener = Base.extend({
	initialize: function(path) {
		this.curves = []; // The curve values as returned by getValues()
		this.parts = []; // The calculated, subdivided parts of the path
		this.length = 0; // The total length of the path
		// Keep a current index from the part where we last where in
		// getParameterAt(), to optimise for iterator-like usage of flattener.
		this.index = 0;

		// Instead of relying on path.curves, we only use segments here and
		// get the curve values from them.

		// Now walk through all curves and compute the parts for each of them,
		// by recursively calling _computeParts().
		var segments = path._segments,
			segment1 = segments[0],
			segment2,
			that = this;

		function addCurve(segment1, segment2) {
			var curve = Curve.getValues(segment1, segment2);
			that.curves.push(curve);
			that._computeParts(curve, segment1._index, 0, 1);
		}

		for (var i = 1, l = segments.length; i < l; i++) {
			segment2 = segments[i];
			addCurve(segment1, segment2);
			segment1 = segment2;
		}
		if (path._closed)
			addCurve(segment2, segments[0]);
	},

	_computeParts: function(curve, index, minT, maxT) {
		// Check if the t-span is big enough for subdivision.
		// We're not subdividing more than 32 times...
		// After quite a bit of testing, a tolerance of 0.25 appears to be a
		// good trade-off between speed and precision.
		if ((maxT - minT) > 1 / 32 && !Curve.isFlatEnough(curve, 0.25)) {
			var curves = Curve.subdivide(curve);
			var halfT = (minT + maxT) / 2;
			// Recursively subdive and compute parts again.
			this._computeParts(curves[0], index, minT, halfT);
			this._computeParts(curves[1], index, halfT, maxT);
		} else {
			// Calculate distance between p1 and p2
			var x = curve[6] - curve[0],
				y = curve[7] - curve[1],
				dist = Math.sqrt(x * x + y * y);
			if (dist > /*#=*/ Numerical.TOLERANCE) {
				this.length += dist;
				this.parts.push({
					offset: this.length,
					value: maxT,
					index: index
				});
			}
		}
	},

	getParameterAt: function(offset) {
		// Make sure we're not beyond the requested offset already. Search the
		// start position backwards from where to then process the loop below.
		var i, j = this.index;
		for (;;) {
			i = j;
			if (j == 0 || this.parts[--j].offset < offset)
				break;
		}
		// Find the part that succeeds the given offset, then interpolate
		// with the previous part
		for (var l = this.parts.length; i < l; i++) {
			var part = this.parts[i];
			if (part.offset >= offset) {
				// Found the right part, remember current position
				this.index = i;
				// Now get the previous part so we can linearly interpolate
				// the curve parameter
				var prev = this.parts[i - 1];
				// Make sure we only use the previous parameter value if its
				// for the same curve, by checking index. Use 0 otherwise.
				var prevVal = prev && prev.index == part.index ? prev.value : 0,
					prevLen = prev ? prev.offset : 0;
				return {
					// Interpolate
					value: prevVal + (part.value - prevVal)
						* (offset - prevLen) /  (part.offset - prevLen),
					index: part.index
				};
			}
		}
		// Return last one
		var part = this.parts[this.parts.length - 1];
		return {
			value: 1,
			index: part.index
		};
	},

	evaluate: function(offset, type) {
		var param = this.getParameterAt(offset);
		return Curve.evaluate(this.curves[param.index], param.value, type);
	},

	drawPart: function(ctx, from, to) {
		from = this.getParameterAt(from);
		to = this.getParameterAt(to);
		for (var i = from.index; i <= to.index; i++) {
			var curve = Curve.getPart(this.curves[i],
					i == from.index ? from.value : 0,
					i == to.index ? to.value : 1);
			if (i == from.index)
				ctx.moveTo(curve[0], curve[1]);
			ctx.bezierCurveTo.apply(ctx, curve.slice(2));
		}
	}
});
