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

	// Calculates arclength of a cubic using adaptive simpson integration.
	getLength: function(goal) {
		var z0 = this._segment1._point,
			z1 = this._segment2._point,
			c0 = z0.add(this._segment1._handleOut),
			c1 = z1.add(this._segment2._handleIn);
		// TODO: Check for straight lines and handle separately.

		// Calculate the coefficients of a Bezier derivative, divided by 3.
		var ax = 3 * (c0.x - c1.x) - z0.x + z1.x,
			bx = 2 * (z0.x + c1.x) - 4 * c0.x,
			cx = c0.x - z0.x,

			ay = 3 * (c0.y - c1.y) - z0.y + z1.y,
			by = 2 * (z0.y + c1.y) - 4 * c0.y,
			cy = c0.y - z0.y;

		function ds(t) {
			// Calculate quadratic equations of derivatives for x and y
			var dx = (ax * t + bx) * t + cx,
				dy = (ay * t + by) * t + cy;
			return Math.sqrt(dx * dx + dy * dy);
		}

		var integral = MathUtils.simpson(ds, 0.0, 1.0, MathUtils.EPSILON, 1.0);
		if (integral == null)
			throw new Error('Nesting capacity exceeded in Path#getLenght()');
		// Multiply by 3 again, as derivative was divided by 3
		var length = 3 * integral;
		if (goal == undefined || goal < 0 || goal >= length)
			return length;
		var result = MathUtils.unsimpson(goal, ds, 0, goal / integral,
				100 * MathUtils.EPSILON, integral, Math.sqrt(MathUtils.EPSILON), 1);
		if (!result)
			throw new Error('Nesting capacity exceeded in computing arctime');
		return -result.b;
	},

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
		return type == 2 ? new Point(-y, x) : new Point(x, y);
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
