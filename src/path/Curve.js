var Curve = this.Curve = Base.extend({
	beans: true,

	initialize: function(arg0, arg1, arg2, arg3) {
		if (arguments.length == 0) {
			this._segment1 = new Segment();
			this._segment2 = new Segment();
		} else if (arguments.length == 1) {
			// TODO: If beans are not activated, this won't copy from
			// an existing segment. OK?
			this._segment1 = new Segment(arg0.segment1);
			this._segment2 = new Segment(arg0.segment2);
		} else if (arguments.length == 2) {
			if (arg0 instanceof Path) {
				this._path = arg0;
				this._index1 = arg1;
				this._updateSegments();
			} else {
				this._segment1 = new Segment(arg0);
				this._segment2 = new Segment(arg1);
			}
		} else if (arguments.length == 4) {
			this._segment1 = new Segment(arg0, null, arg1);
			this._segment2 = new Segment(arg3, arg2, null);
		}
	},

	_updateSegments: function() {
		if (this._path) {
			this._index2 = this._index1 + 1;
			// A closing curve?
			var segments = this._path._segments;
			if (this._index2 >= segments.length)
				this._index2 = 0;
			this._segment1 = segments[this._index1];
			this._segment2 = segments[this._index2];
		}
	},

	/**
	 * The first anchor point of the curve.
	 */
	getPoint1: function() {
		return this._segment1._point;
	},

	setPoint1: function() {
		var point = Point.read(arguments);
		this._segment1._point.set(point.x, point.y);
	},

	/**
	 * The second anchor point of the curve.
	 */
	getPoint2: function() {
		return this._segment2._point;
	},

	setPoint2: function() {
		var point = Point.read(arguments);
		this._segment2._point.set(point.x, point.y);
	},
	
	/**
	 * The handle point that describes the tangent in the first anchor point.
	 */
	getHandle1: function() {
		return this._segment1._handleOut;
	},

	setHandle1: function() {
		var point = Point.read(arguments);
		this._segment1._handleOut.set(point.x, point.y);
	},

	/**
	 * The handle point that describes the tangent in the second anchor point.
	 */
	getHandle2: function() {
		return this._segment2._handleIn;
	},

	setHandle2: function() {
		var point = Point.read(arguments);
		this._segment2._handleIn.set(point.x, point.y);
	},

	/**
	 * The first segment of the curve.
	 */
	getSegment1: function() {
		return this._segment1;
	},

	/**
	 * The second segment of the curve.
	 */
	getSegment2: function() {
		return this._segment2;
	},

	getPath: function() {
		return this._path;
	},

	getIndex: function() {
		return this._index1;
	},

	_setIndex: function(index) {
		this._index1 = index;
		this._updateSegments();
	},

	getNext: function() {
		var curves = this._path && this._path._curves;
		// TODO: Add cyclic looping when closed back to Scriptographer
		return curves && (curves[this._index1 + 1]
				|| this._path.closed && curves[0]) || null;
	},

	getPrevious: function() {
		var curves = this._path && this._path._curves;
		return curves && (curves[this._index1 - 1]
				|| this._path.closed && curves[curves.length - 1]) || null;
	},

	getCurveValues: function() {
		var p1 = this._segment1._point,
			h1 = this._segment1._handleOut,
			h2 = this._segment2._handleIn,
			p2 = this._segment2._point;
		return [
			p1.x, p1.y,
			p1.x + h1.x, p1.y + h1.y,
			p2.x + h2.x, p2.y + h2.y,
			p2.x, p2.y
		];
	},

	getLength: function() {
		return Curve.getLength.apply(Curve, this.getCurveValues());
	},

	/**
	 * Checks if this curve is linear, meaning it does not define any curve
	 * handle.

	 * @return {@true if the curve is linear}
	 */
	isLinear: function() {
		return this._segment1._handleOut.isZero()
				&& this._segment2._handleIn.isZero();
	},

	getParameter: function(length) {
		return Curve.getParameter.apply(Curve,
				this.getCurveValues().concat(length));
	},

	// TODO: getParameter(point, precision)
	// TODO: getLocation
	// TODO: getIntersections
	// TODO: adjustThroughPoint

	transform: function(matrix) {
		return new Curve(
				matrix.transform(this._segment1._point),
				matrix.transform(this._segment1._handleOut),
				matrix.transform(this._segment2._handleIn),
				matrix.transform(this._segment2._point));
	},

	reverse: function() {
		return new Curve(this._segment2.reverse(), this._segment1.reverse());
	},

	// TODO: divide
	// TODO: split
	// TODO: getPartLength(fromParameter, toParameter)

	clone: function() {
		return new Curve(this._segment1, this._segment2);
	},

	toString: function() {
		return '{ point1: ' + this._segment1._point
				+ (!this._segment1._handleOut.isZero()
					? ', handle1: ' + this._segment1._handleOut : '')
				+ (this._segment2._handleIn.isZero()
					? ', handle2: ' + this._segment2._handleIn : '')
				+ ', point2: ' + this._segment2._point
				+ ' }';
	},

	statics: {
		getLength: function(p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y) {
			// TODO: Check for straight lines and handle separately.

			// Calculate the coefficients of a Bezier derivative.
			var ax = 9 * (c1x - c2x) + 3 * (p2x - p1x),
				bx = 6 * (p1x + c2x) - 12 * c1x,
				cx = 3 * (c1x - p1x),

				ay = 9 * (c1y - c2y) + 3 * (p2y - p1y),
				by = 6 * (p1y + c2y) - 12 * c1y,
				cy = 3 * (c1y - p1y);

			function ds(t) {
				// Calculate quadratic equations of derivatives for x and y
				var dx = (ax * t + bx) * t + cx,
					dy = (ay * t + by) * t + cy;
				return Math.sqrt(dx * dx + dy * dy);
			}

			return Numerical.gauss(ds, 0.0, 1.0, 8);
		},

		subdivide: function(p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y, t) {
			var u = 1 - t,
				// Interpolate from 4 to 3 points
				p3x = u * p1x + t * c1x,
				p3y = u * p1y + t * c1y,
				p4x = u * c1x + t * c2x,
				p4y = u * c1y + t * c2y,
				p5x = u * c2x + t * p2x,
				p5y = u * c2y + t * p2y,
				// Interpolate from 3 to 2 points
				p6x = u * p3x + t * p4x,
				p6y = u * p3y + t * p4y,
				p7x = u * p4x + t * p5x,
				p7y = u * p4y + t * p5y,
				// Interpolate from 2 points to 1 point
				p8x = u * p6x + t * p7x,
				p8y = u * p6y + t * p7y;
			// We now have all the values we need to build the subcurves
			return [
				[p1x, p1y, p3x, p3y, p6x, p6y, p8x, p8y], // left
				[p8x, p8y, p7x, p7y, p5x, p5y, p2x, p2y] // right
			];
		},

		getPartLength: function(p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y, t, right) {
			if (t == 0)
				return 0;
			if (t < 1) {
				curve = Curve.subdivide(p1x, p1y, c1x, c1y, c2x, c2y,
						p2x, p2y, t)[right ? 1 : 0];
			} else {
				curve = arguments;
			}
			return Curve.getLength.apply(Curve, curve);
		},

		getParameter: function(p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y, length) {
			if (length <= 0)
				return 0;
			var bezierLength = Curve.getLength(
					p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y);
			if (length >= bezierLength)
				return 1;
			// Let's use the Van Wijngaarden–Dekker–Brent Method to find
			// solutions more reliably than with False Position Method.
			function f(t) {
				return Curve.getPartLength(
						p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y, t) - length;
			}
			// Use length / bezierLength for an initial guess for b, to bring
			// us closer:
			return Numerical.brent(f, 0, length / bezierLength,
					Numerical.TOLERANCE);
		}
	}
}, new function() {
	function evaluate(that, t, type) {
		// Calculate the polynomial coefficients. caution: handles are relative
		// to points
		var point1 = that._segment1._point,
			handle1 = that._segment1._handleOut,
			handle2 = that._segment2._handleIn,
			point2 = that._segment2._point,
			x, y;

		// Handle special case at beginning / end of curve
		// TODO: Port back to Scriptographer, so 0.000000000001 won't be
		// required anymore
		if (t == 0 || t == 1) {
			var point;
			switch (type) {
			case 0: // point
				point = t == 0 ? point1 : point2;
				break;
			case 1: // tangent
			case 2: // normal
				point = t == 0
					? handle1.isZero()
						? handle2.isZero()
							? point2.subtract(point1)
							: point2.add(handle2).subtract(point1)
						: handle1
					: handle2.isZero() // t == 1
						? handle1.isZero()
							? point1.subtract(point2)
							: point1.add(handle1).subtract(point2)
						: handle2;
				break;
			}
			x = point.x;
			y = point.y;
		} else {
			var dx = point2.x - point1.x,
				cx = 3 * handle1.x,
				bx = 3 * (dx + handle2.x - handle1.x) - cx,
				ax = dx - cx - bx,

				dy = point2.y - point1.y,
				cy = 3.0 * handle1.y,
				by = 3.0 * (dy + handle2.y - handle1.y) - cy,
				ay = dy - cy - by;

			switch (type) {
			case 0: // point
				x = ((ax * t + bx) * t + cx) * t + point1.x;
				y = ((ay * t + by) * t + cy) * t + point1.y;
				break;
			case 1: // tangent
			case 2: // normal
				// Simply use the derivation of the bezier function for both
				// the x and y coordinates:
				x = (3 * ax * t + 2 * bx) * t + cx,
				y = (3 * ay * t + 2 * by) * t + cy;
			}
		}
		// The normal is simply the rotated tangent:
		// TODO: Rotate normals the other way in Scriptographer too?
		// (Depending on orientation, I guess?)
		return type == 2 ? new Point(y, -x) : new Point(x, y);
	}

	return {
		getPoint: function(parameter) {
			return evaluate(this, parameter, 0);
		},

		getTangent: function(parameter) {
			return evaluate(this, parameter, 1);
		},

		getNormal: function(parameter) {
			return evaluate(this, parameter, 2);
		}
	};
});
