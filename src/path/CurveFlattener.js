var CurveFlattener = Base.extend({
	initialize: function(curve) {
		this.curve = curve;
		this.segments = [];
		this.length = 0;
		this._computeSegments(curve.getCurveValues(), 0, 1);
	},

	_computeSegments: function(values, minT, maxT) {
		// Check if the t-span is big enough for subdivision.
		// We're not subdividing more than 32 times...
		if ((maxT - minT) > 1 / 32
				&& !Curve.isSufficientlyFlat.apply(Curve, values)) {
			var curves = Curve.subdivide.apply(Curve, values);
			var halfT = (minT + maxT) / 2;
			// Recursively subdive and compute segments again.
			this._computeSegments(curves[0], minT, halfT);
			this._computeSegments(curves[1], halfT, maxT);
		} else {
			// Calculate distance between p1 and p2
			var x = values[6] - values[0],
				y = values[7] - values[1],
				dist = Math.sqrt(x * x + y * y);
			if (dist > Numerical.TOLERANCE) {
				this.length += dist;
				this.segments.push({
					length: this.length,
					value: maxT
				});
			}
		}
	},

	getParameter: function(length) {
		// Find the segment that succeeds the given length, then interpolate
		// with the previous segment
		for (var i = 0, l = this.segments.length; i < l; i++) {
			var segment = this.segments[i];
			if (segment.length >= length) {
				var prev = this.segments[i - 1],
					prevValue = prev ? prev.value : 0,
					prevLength = prev ? prev.length : 0;
				// Interpolate
				return prevValue + (segment.value - prevValue)
					* (length - prevLength) /  (segment.length - prevLength);
			}
		}
		return 1;
	}
});
