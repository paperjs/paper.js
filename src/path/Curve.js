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
 * @name Curve
 *
 * @class The Curve object represents the parts of a path that are connected by
 * two following {@link Segment} objects. The curves of a path can be accessed
 * through its {@link Path#curves} array.
 *
 * While a segment describe the anchor point and its incoming and outgoing
 * handles, a Curve object describes the curve passing between two such
 * segments. Curves and segments represent two different ways of looking at the
 * same thing, but focusing on different aspects. Curves for example offer many
 * convenient ways to work with parts of the path, finding lengths, positions or
 * tangents at given offsets.
 */
var Curve = this.Curve = Base.extend(/** @lends Curve# */{
	/**
	 * Creates a new curve object.
	 *
	 * @name Curve#initialize
	 * @param {Segment} segment1
	 * @param {Segment} segment2
	 */
	/**
	 * Creates a new curve object.
	 *
	 * @name Curve#initialize
	 * @param {Point} point1
	 * @param {Point} handle1
	 * @param {Point} handle2
	 * @param {Point} point2
	 */
	/**
	 * Creates a new curve object.
	 *
	 * @name Curve#initialize
	 * @ignore
	 * @param {Number} x1
	 * @param {Number} y1
	 * @param {Number} handle1x
	 * @param {Number} handle1y
	 * @param {Number} handle2x
	 * @param {Number} handle2y
	 * @param {Number} x2
	 * @param {Number} y2
	 */
	initialize: function(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7) {
		var count = arguments.length;
		if (count === 0) {
			this._segment1 = new Segment();
			this._segment2 = new Segment();
		} else if (count == 1) {
			// Note: This copies from existing segments through bean getters
			this._segment1 = new Segment(arg0.segment1);
			this._segment2 = new Segment(arg0.segment2);
		} else if (count == 2) {
			this._segment1 = new Segment(arg0);
			this._segment2 = new Segment(arg1);
		} else {
			var point1, handle1, handle2, point2;
			if (count == 4) {
				point1 = arg0;
				handle1 = arg1;
				handle2 = arg2;
				point2 = arg3;
			} else if (count == 8) {
				// Convert getValue() array back to points and handles so we
				// can create segments for those.
				point1 = [arg0, arg1];
				point2 = [arg6, arg7];
				handle1 = [arg2 - arg0, arg3 - arg1];
				handle2 = [arg4 - arg6, arg5 - arg7];
			}
			this._segment1 = new Segment(point1, null, handle1);
			this._segment2 = new Segment(point2, handle2, null);
		}
	},

	_changed: function() {
		// Clear cached values.
		delete this._length;
		delete this._bounds;
	},

	/**
	 * The first anchor point of the curve.
	 *
	 * @type Point
	 * @bean
	 */
	getPoint1: function() {
		return this._segment1._point;
	},

	setPoint1: function(point) {
		point = Point.read(arguments);
		this._segment1._point.set(point.x, point.y);
	},

	/**
	 * The second anchor point of the curve.
	 *
	 * @type Point
	 * @bean
	 */
	getPoint2: function() {
		return this._segment2._point;
	},

	setPoint2: function(point) {
		point = Point.read(arguments);
		this._segment2._point.set(point.x, point.y);
	},

	/**
	 * The handle point that describes the tangent in the first anchor point.
	 *
	 * @type Point
	 * @bean
	 */
	getHandle1: function() {
		return this._segment1._handleOut;
	},

	setHandle1: function(point) {
		point = Point.read(arguments);
		this._segment1._handleOut.set(point.x, point.y);
	},

	/**
	 * The handle point that describes the tangent in the second anchor point.
	 *
	 * @type Point
	 * @bean
	 */
	getHandle2: function() {
		return this._segment2._handleIn;
	},

	setHandle2: function(point) {
		point = Point.read(arguments);
		this._segment2._handleIn.set(point.x, point.y);
	},

	/**
	 * The first segment of the curve.
	 *
	 * @type Segment
	 * @bean
	 */
	getSegment1: function() {
		return this._segment1;
	},

	/**
	 * The second segment of the curve.
	 *
	 * @type Segment
	 * @bean
	 */
	getSegment2: function() {
		return this._segment2;
	},

	/**
	 * The path that the curve belongs to.
	 *
	 * @type Path
	 * @bean
	 */
	getPath: function() {
		return this._path;
	},

	/**
	 * The index of the curve in the {@link Path#curves} array.
	 *
	 * @type Number
	 * @bean
	 */
	getIndex: function() {
		return this._segment1._index;
	},

	/**
	 * The next curve in the {@link Path#curves} array that the curve
	 * belongs to.
	 *
	 * @type Curve
	 * @bean
	 */
	getNext: function() {
		var curves = this._path && this._path._curves;
		return curves && (curves[this._segment1._index + 1]
				|| this._path._closed && curves[0]) || null;
	},

	/**
	 * The previous curve in the {@link Path#curves} array that the curve
	 * belongs to.
	 *
	 * @type Curve
	 * @bean
	 */
	getPrevious: function() {
		var curves = this._path && this._path._curves;
		return curves && (curves[this._segment1._index - 1]
				|| this._path._closed && curves[curves.length - 1]) || null;
	},

	/**
	 * Specifies whether the handles of the curve are selected.
	 *
	 * @type Boolean
	 * @bean
	 */
	isSelected: function() {
		return this.getHandle1().isSelected() && this.getHandle2().isSelected();
	},

	setSelected: function(selected) {
		this.getHandle1().setSelected(selected);
		this.getHandle2().setSelected(selected);
	},

	getValues: function() {
		return Curve.getValues(this._segment1, this._segment2);
	},

	getPoints: function() {
		// Convert to array of absolute points
		var coords = this.getValues(),
			points = [];
		for (var i = 0; i < 8; i += 2)
			points.push(Point.create(coords[i], coords[i + 1]));
		return points;
	},

	// DOCS: document Curve#getLength(from, to)
	/**
	 * The approximated length of the curve in points.
	 *
	 * @type Number
	 * @bean
	 */
	 // Hide parameters from Bootstrap so it injects bean too
	getLength: function(/* from, to */) {
		var from = arguments[0],
			to = arguments[1],
			fullLength = arguments.length === 0 || from === 0 && to === 1;
		if (fullLength && this._length != null)
			return this._length;
		var length = Curve.getLength(this.getValues(), from, to);
		if (fullLength)
			this._length = length;
		return length;
	},

	getArea: function() {
		return Curve.getArea(this.getValues());
	},

	getPart: function(from, to) {
		return new Curve(Curve.getPart(this.getValues(), from, to));
	},

	/**
	 * Checks if this curve is linear, meaning it does not define any curve
	 * handle.

	 * @return {Boolean} {@true the curve is linear}
	 */
	isLinear: function() {
		return this._segment1._handleOut.isZero()
				&& this._segment2._handleIn.isZero();
	},

	getIntersections: function(curve) {
		return Curve.getIntersections(this.getValues(), curve.getValues(),
				this, curve, []);
	},

	getCrossings: function(point, roots) {
		// Implementation of the crossing number algorithm:
		// http://en.wikipedia.org/wiki/Point_in_polygon
		// Solve the y-axis cubic polynomial for point.y and count all solutions
		// to the right of point.x as crossings.
		var vals = this.getValues(),
			count = Curve.solveCubic(vals, 1, point.y, roots),
			crossings = 0,
			tolerance = /*#=*/ Numerical.TOLERANCE,
			abs = Math.abs;

		// Checks the y-slope between the current curve and the previous for a
		// change of orientation, when a solution is found at t == 0
		function changesOrientation(curve, tangent) {
			return Curve.evaluate(curve.getPrevious().getValues(), 1, true, 1).y
					* tangent.y > 0;
		}

		// TODO: See if this speeds up code, or slows it down:
		// var bounds = this.getBounds();
		// if (point.y < bounds.getTop() || point.y > bounds.getBottom()
		// 		|| point.x > bounds.getRight())
		// 	return 0;

		if (count === -1) {
			// Infinite solutions, so we have a horizontal curve.
			// Find parameter through getParameterOf()
			roots[0] = Curve.getParameterOf(vals, point.x, point.y);
			count = roots[0] !== null ? 1 : 0;
		}
		for (var i = 0; i < count; i++) {
			var t = roots[i];
			if (t > -tolerance && t < 1 - tolerance) {
				var pt = Curve.evaluate(vals, t, true, 0);
				if (point.x < pt.x + tolerance) {
					// Passing 1 for Curve.evaluate() type calculates tangents
					var tan = Curve.evaluate(vals, t, true, 1);
					// Handle all kind of edge cases when points are on contours
					// or rays are touching countours, to termine wether the
					// crossing counts or not.
					// See if the actual point is on the countour:
					if (abs(pt.x - point.x) < tolerance) {
						// Do not count the crossing if it is on the left hand
						// side of the shape (tangent pointing upwards), since
						// the ray will go out the other end, count as
						// crossing there, and the point is on the contour, so
						// to be considered inside.
						var angle = tan.getAngle();
						if (angle > -180 && angle < 0
							// Handle special case where point is on a corner,
							// in which case this crossing is skipped if both
							// tangents have the same orientation.
							&& (t > tolerance || changesOrientation(this, tan)))
								continue;
					} else  {
						// Skip touching stationary points:
						if (abs(tan.y) < tolerance
							// Check derivate for stationary points. If root is
							// close to 0 and not changing vertical orientation
							// from the previous curve, do not count this root,
							// as it's touching a corner.
							|| t < tolerance && !changesOrientation(this, tan))
								continue;
					}
					crossings++;
				}
			}
		}
		return crossings;
	},

	// TODO: adjustThroughPoint

	/**
	 * Returns a reversed version of the curve, without modifying the curve
	 * itself.
	 *
	 * @return {Curve} a reversed version of the curve
	 */
	reverse: function() {
		return new Curve(this._segment2.reverse(), this._segment1.reverse());
	},

	/**
	 * Divides the curve into two at the specified position. The curve itself is
	 * modified and becomes the first part, the second part is returned as a new
	 * curve. If the modified curve belongs to a path item, the second part is
	 * added to it.
	 *
	 * @param parameter the position at which to split the curve as a value
	 *        between 0 and 1 {@default 0.5}
	 * @return {Curve} the second part of the divided curve
	 */
	divide: function(parameter) {
		var res = null;
		// Accept CurveLocation objects, and objects that act like them:
		if (parameter && parameter.curve === this)
			parameter = parameter.parameter;
		if (parameter > 0 && parameter < 1) {
			var parts = Curve.subdivide(this.getValues(), parameter),
				isLinear = this.isLinear(),
				left = parts[0],
				right = parts[1];

			// Write back the results:
			if (!isLinear) {
				this._segment1._handleOut.set(left[2] - left[0],
						left[3] - left[1]);
				// segment2 is the end segment. By inserting newSegment
				// between segment1 and 2, 2 becomes the end segment.
				// Convert absolute -> relative
				this._segment2._handleIn.set(right[4] - right[6],
						right[5] - right[7]);
			}

			// Create the new segment, convert absolute -> relative:
			var x = left[6], y = left[7],
				segment = new Segment(Point.create(x, y),
						!isLinear && Point.create(left[4] - x, left[5] - y),
						!isLinear && Point.create(right[2] - x, right[3] - y));

			// Insert it in the segments list, if needed:
			if (this._path) {
				// Insert at the end if this curve is a closing curve of a
				// closed path, since otherwise it would be inserted at 0.
				if (this._segment1._index > 0 && this._segment2._index === 0) {
					this._path.add(segment);
				} else {
					this._path.insert(this._segment2._index, segment);
				}
				// The way Path#_add handles curves, this curve will always
				// become the owner of the newly inserted segment.
				// TODO: I expect this.getNext() to produce the correct result,
				// but since we're inserting differently in _add (something
				// linked with CurveLocation#divide()), this is not the case...
				res = this; // this.getNext();
			} else {
				// otherwise create it from the result of split
				var end = this._segment2;
				this._segment2 = segment;
				res = new Curve(segment, end);
			}
		}
		return res;
	},

	/**
	 * Splits the path that this curve belongs to at the given parameter, using
	 * {@link Path#split(index, parameter)}.
	 *
	 * @return {Path} the second part of the split path
	 */
	split: function(parameter) {
		return this._path
			? this._path.split(this._segment1._index, parameter)
			: null;
	},

	/**
	 * Returns a copy of the curve.
	 *
	 * @return {Curve}
	 */
	clone: function() {
		return new Curve(this._segment1, this._segment2);
	},

	/**
	 * @return {String} A string representation of the curve.
	 */
	toString: function() {
		var parts = [ 'point1: ' + this._segment1._point ];
		if (!this._segment1._handleOut.isZero())
			parts.push('handle1: ' + this._segment1._handleOut);
		if (!this._segment2._handleIn.isZero())
			parts.push('handle2: ' + this._segment2._handleIn);
		parts.push('point2: ' + this._segment2._point);
		return '{ ' + parts.join(', ') + ' }';
	},

// Mess with indentation in order to get more line-space below...
statics: {
	create: function(path, segment1, segment2) {
		var curve = Base.create(Curve);
		curve._path = path;
		curve._segment1 = segment1;
		curve._segment2 = segment2;
		return curve;
	},

	getValues: function(segment1, segment2) {
		var p1 = segment1._point,
			h1 = segment1._handleOut,
			h2 = segment2._handleIn,
			p2 = segment2._point;
		return [
			p1._x, p1._y,
			p1._x + h1._x, p1._y + h1._y,
			p2._x + h2._x, p2._y + h2._y,
			p2._x, p2._y
		];
	},

	evaluate: function(v, offset, isParameter, type) {
		var t = isParameter ? offset : Curve.getParameterAt(v, offset, 0),
			p1x = v[0], p1y = v[1],
			c1x = v[2], c1y = v[3],
			c2x = v[4], c2y = v[5],
			p2x = v[6], p2y = v[7],
			x, y;

		// Handle special case at beginning / end of curve
		if (type === 0 && (t === 0 || t === 1)) {
			x = t === 0 ? p1x : p2x;
			y = t === 0 ? p1y : p2y;
		} else {
			// Calculate the polynomial coefficients.
			var cx = 3 * (c1x - p1x),
				bx = 3 * (c2x - c1x) - cx,
				ax = p2x - p1x - cx - bx,

				cy = 3 * (c1y - p1y),
				by = 3 * (c2y - c1y) - cy,
				ay = p2y - p1y - cy - by;
			switch (type) {
			case 0: // point
				// Calculate the curve point at parameter value t
				x = ((ax * t + bx) * t + cx) * t + p1x;
				y = ((ay * t + by) * t + cy) * t + p1y;
				break;
			case 1: // tangent, 1st derivative
			case 2: // normal, 1st derivative
				// Prevent tangents and normals of length 0:
				// http://stackoverflow.com/questions/10506868/
				var tMin = /*#=*/ Numerical.TOLERANCE;
				if (t < tMin && c1x == p1x && c1y == p1y
						|| t > 1 - tMin && c2x == p2x && c2y == p2y) {
					x = c2x - c1x;
					y = c2y - c1y;
				} else {
					// Simply use the derivation of the bezier function for both
					// the x and y coordinates:
					x = (3 * ax * t + 2 * bx) * t + cx;
					y = (3 * ay * t + 2 * by) * t + cy;
				}
				break;
			case 3: // curvature, 2nd derivative
				x = 6 * ax * t + 2 * bx;
				y = 6 * ay * t + 2 * by;
				break;
			}
		}
		// The normal is simply the rotated tangent:
		return type == 2 ? new Point(y, -x) : new Point(x, y);
	},

	subdivide: function(v, t) {
		var p1x = v[0], p1y = v[1],
			c1x = v[2], c1y = v[3],
			c2x = v[4], c2y = v[5],
			p2x = v[6], p2y = v[7];
		if (t === undefined)
			t = 0.5;
		// Triangle computation, with loops unrolled.
		var u = 1 - t,
			// Interpolate from 4 to 3 points
			p3x = u * p1x + t * c1x, p3y = u * p1y + t * c1y,
			p4x = u * c1x + t * c2x, p4y = u * c1y + t * c2y,
			p5x = u * c2x + t * p2x, p5y = u * c2y + t * p2y,
			// Interpolate from 3 to 2 points
			p6x = u * p3x + t * p4x, p6y = u * p3y + t * p4y,
			p7x = u * p4x + t * p5x, p7y = u * p4y + t * p5y,
			// Interpolate from 2 points to 1 point
			p8x = u * p6x + t * p7x, p8y = u * p6y + t * p7y;
		// We now have all the values we need to build the subcurves:
		return [
			[p1x, p1y, p3x, p3y, p6x, p6y, p8x, p8y], // left
			[p8x, p8y, p7x, p7y, p5x, p5y, p2x, p2y] // right
		];
	},

	// Converts from the point coordinates (p1, c1, c2, p2) for one axis to
	// the polynomial coefficients and solves the polynomial for val
	solveCubic: function (v, coord, val, roots) {
		var p1 = v[coord],
			c1 = v[coord + 2],
			c2 = v[coord + 4],
			p2 = v[coord + 6],
			c = 3 * (c1 - p1),
			b = 3 * (c2 - c1) - c,
			a = p2 - p1 - c - b;
		return Numerical.solveCubic(a, b, c, p1 - val, roots);
	},

	getParameterOf: function(v, x, y) {
		// Handle beginnings and end seperately, as they are not detected
		// sometimes.
		if (Math.abs(v[0] - x) < /*#=*/ Numerical.TOLERANCE
				&& Math.abs(v[1] - y) < /*#=*/ Numerical.TOLERANCE)
			return 0;
		if (Math.abs(v[6] - x) < /*#=*/ Numerical.TOLERANCE
				&& Math.abs(v[7] - y) < /*#=*/ Numerical.TOLERANCE)
			return 1;
		var txs = [],
			tys = [],
			sx = Curve.solveCubic(v, 0, x, txs),
			sy = Curve.solveCubic(v, 1, y, tys),
			tx, ty;
		// sx, sy == -1 means infinite solutions:
		// Loop through all solutions for x and match with solutions for y,
		// to see if we either have a matching pair, or infinite solutions
		// for one or the other.
		for (var cx = 0;  sx == -1 || cx < sx;) {
			if (sx == -1 || (tx = txs[cx++]) >= 0 && tx <= 1) {
				for (var cy = 0; sy == -1 || cy < sy;) {
					if (sy == -1 || (ty = tys[cy++]) >= 0 && ty <= 1) {
						// Handle infinite solutions by assigning root of
						// the other polynomial
						if (sx == -1) tx = ty;
						else if (sy == -1) ty = tx;
						// Use average if we're within tolerance
						if (Math.abs(tx - ty) < /*#=*/ Numerical.TOLERANCE)
							return (tx + ty) * 0.5;
					}
				}
				// Avoid endless loops here: If sx is infinite and there was
				// no fitting ty, there's no solution for this bezier
				if (sx == -1)
					break;
			}
		}
		return null;
	},

	// TODO: Find better name
	getPart: function(v, from, to) {
		if (from > 0)
			v = Curve.subdivide(v, from)[1]; // [1] right
		// Interpolate the  parameter at 'to' in the new curve and
		// cut there.
		if (to < 1)
			v = Curve.subdivide(v, (to - from) / (1 - from))[0]; // [0] left
		return v;
	},

	isLinear: function(v) {
		return v[0] === v[2] && v[1] === v[3] && v[4] === v[6] && v[5] === v[7];
	},

	isFlatEnough: function(v, tolerance) {
		// Thanks to Kaspar Fischer and Roger Willcocks for the following:
		// http://hcklbrrfnn.files.wordpress.com/2012/08/bez.pdf
		var p1x = v[0], p1y = v[1],
			c1x = v[2], c1y = v[3],
			c2x = v[4], c2y = v[5],
			p2x = v[6], p2y = v[7],
			ux = 3 * c1x - 2 * p1x - p2x,
			uy = 3 * c1y - 2 * p1y - p2y,
			vx = 3 * c2x - 2 * p2x - p1x,
			vy = 3 * c2y - 2 * p2y - p1y;
		return Math.max(ux * ux, vx * vx) + Math.max(uy * uy, vy * vy)
				< 10 * tolerance * tolerance;
	},

	getBounds: function(v) {
		var min = v.slice(0, 2), // Start with values of point1
			max = min.slice(), // clone
			roots = [0, 0];
		for (var i = 0; i < 2; i++)
			Curve._addBounds(v[i], v[i + 2], v[i + 4], v[i + 6],
					i, 0, min, max, roots);
		return Rectangle.create(min[0], min[1], max[0] - min[0], max[1] - min[1]);
	},

	/**
	 * Private helper for both Curve.getBounds() and Path.getBounds(), which
	 * finds the 0-crossings of the derivative of a bezier curve polynomial, to
	 * determine potential extremas when finding the bounds of a curve.
	 * Note: padding is only used for Path.getBounds().
	 */
	_addBounds: function(v0, v1, v2, v3, coord, padding, min, max, roots) {
		// Code ported and further optimised from:
		// http://blog.hackers-cafe.net/2009/06/how-to-calculate-bezier-curves-bounding.html
		function add(value, padding) {
			var left = value - padding,
				right = value + padding;
			if (left < min[coord])
				min[coord] = left;
			if (right > max[coord])
				max[coord] = right;
		}
		// Calculate derivative of our bezier polynomial, divided by 3.
		// Doing so allows for simpler calculations of a, b, c and leads to the
		// same quadratic roots.
		var a = 3 * (v1 - v2) - v0 + v3,
			b = 2 * (v0 + v2) - 4 * v1,
			c = v1 - v0,
			count = Numerical.solveQuadratic(a, b, c, roots),
			// Add some tolerance for good roots, as t = 0 / 1 are added
			// seperately anyhow, and we don't want joins to be added with
			// radiuses in getStrokeBounds()
			tMin = /*#=*/ Numerical.TOLERANCE,
			tMax = 1 - tMin;
		// Only add strokeWidth to bounds for points which lie  within 0 < t < 1
		// The corner cases for cap and join are handled in getStrokeBounds()
		add(v3, 0);
		for (var i = 0; i < count; i++) {
			var t = roots[i],
				u = 1 - t;
			// Test for good roots and only add to bounds if good.
			if (tMin < t && t < tMax)
				// Calculate bezier polynomial at t.
				add(u * u * u * v0
					+ 3 * u * u * t * v1
					+ 3 * u * t * t * v2
					+ t * t * t * v3,
					padding);
		}
	}
}}, Base.each(['getBounds', 'getStrokeBounds', 'getHandleBounds', 'getRoughBounds'],
	// Note: Although Curve.getBounds() exists, we are using Path.getBounds() to
	// determine the bounds of Curve objects with defined segment1 and segment2
	// values Curve.getBounds() can be used directly on curve arrays, without
	// the need to create a Curve object first, as required by the code that
	// finds path interesections.
	function(name) {
		this[name] = function() {
			if (!this._bounds)
				this._bounds = {};
			var bounds = this._bounds[name];
			if (!bounds) {
				// Calculate the curve bounds by passing a segment list for the
				// curve to the static Path.get*Boudns methods.
				bounds = this._bounds[name] = Path[name](
					[this._segment1, this._segment2], false, this._path._style);
			}
			return bounds.clone();
		};
	},
/** @lends Curve# */{
	/**
	 * The bounding rectangle of the curve excluding stroke width.
	 *
	 * @name Curve#getBounds
	 * @type Rectangle
	 * @bean
	 */

	/**
	 * The bounding rectangle of the curve including stroke width.
	 *
	 * @name Curve#getStrokeBounds
	 * @type Rectangle
	 * @bean
	 */

	/**
	 * The bounding rectangle of the curve including handles.
	 *
	 * @name Curve#getHandleBounds
	 * @type Rectangle
	 * @bean
	 */

	/**
	 * The rough bounding rectangle of the curve that is shure to include all of
	 * the drawing, including stroke width.
	 *
	 * @name Curve#getRoughBounds
	 * @type Rectangle
	 * @bean
	 * @ignore
	 */
}), Base.each(['getPoint', 'getTangent', 'getNormal', 'getCurvature'],
	// Note: Although Curve.getBounds() exists, we are using Path.getBounds() to
	// determine the bounds of Curve objects with defined segment1 and segment2
	// values Curve.getBounds() can be used directly on curve arrays, without
	// the need to create a Curve object first, as required by the code that
	// finds path interesections.
	function(name, index) {
		this[name + 'At'] = function(offset, isParameter) {
			return Curve.evaluate(this.getValues(), offset, isParameter, index);
		};
		// Deprecated and undocumented, but keep around for now.
		// TODO: Remove once enough time has passed (28.01.2013)
		this[name] = function(parameter) {
			return Curve.evaluate(this.getValues(), parameter, true, index);
		};
	},
/** @lends Curve# */{
	/**
	 * Calculates the curve time parameter of the specified offset on the path,
	 * relative to the provided start parameter. If offset is a negative value,
	 * the parameter is searched to the left of the start parameter. If no start
	 * parameter is provided, a default of {@code 0} for positive values of
	 * {@code offset} and {@code 1} for negative values of {@code offset}.
	 * @param {Number} offset
	 * @param {Number} [start]
	 * @return {Number} the curve time parameter at the specified offset.
	 */
	getParameterAt: function(offset, start) {
		return Curve.getParameterAt(this.getValues(), offset,
				start !== undefined ? start : offset < 0 ? 1 : 0);
	},

	/**
	 * Returns the curve time parameter of the specified point if it lies on the
	 * curve, {@code null} otherwise.
	 * @param {Point} point the point on the curve.
	 * @return {Number} the curve time parameter of the specified point.
	 */
	getParameterOf: function(point) {
		point = Point.read(arguments);
		return Curve.getParameterOf(this.getValues(), point.x, point.y);
	},

	/**
	 * Calculates the curve location at the specified offset or curve time
	 * parameter.
	 * @param {Number} offset the offset on the curve, or the curve time
	 *        parameter if {@code isParameter} is {@code true}
	 * @param {Boolean} [isParameter=false] pass {@code true} if {@code offset}
	 *        is a curve time parameter.
	 * @return {CurveLocation} the curve location at the specified the offset.
	 */
	getLocationAt: function(offset, isParameter) {
		if (!isParameter)
			offset = this.getParameterAt(offset);
		return new CurveLocation(this, offset);
	},

	/**
	 * Returns the curve location of the specified point if it lies on the
	 * curve, {@code null} otherwise.
	 * @param {Point} point the point on the curve.
	 * @return {CurveLocation} the curve location of the specified point.
	 */
	getLocationOf: function(point) {
		var t = this.getParameterOf.apply(this, arguments);
		return t != null ? new CurveLocation(this, t) : null;
	},

	getNearestLocation: function(point) {
		point = Point.read(arguments);
		var values = this.getValues(),
			step = 1 / 100,
			tolerance = Numerical.TOLERANCE,
			minDist = Infinity,
			minT = 0,
			max = 1 + tolerance; // Accomodate imprecision

		function refine(t) {
			if (t >= 0 && t <= 1) {
				var dist = point.getDistance(
						Curve.evaluate(values, t, true, 0), true);
				if (dist < minDist) {
					minDist = dist;
					minT = t;
					return true;
				}
			}
		}

		for (var t = 0; t <= max; t += step)
			refine(t);

		// Now iteratively refine solution until we reach desired precision.
		step /= 2;
		while (step > tolerance) {
			if (!refine(minT - step) && !refine(minT + step))
				step /= 2;
		}
		var pt = Curve.evaluate(values, minT, true, 0);
		return new CurveLocation(this, minT, pt, null, point.getDistance(pt));
	},

	getNearestPoint: function(point) {
		return this.getNearestLocation.apply(this, arguments).getPoint();
	}

	/**
	 * Returns the point on the curve at the specified offset.
	 *
	 * @name Curve#getPointAt
	 * @function
	 * @param {Number} offset the offset on the curve, or the curve time
	 *        parameter if {@code isParameter} is {@code true}
	 * @param {Boolean} [isParameter=false] pass {@code true} if {@code offset}
	 *        is a curve time parameter.
	 * @return {Point} the point on the curve at the specified offset.
	 */

	/**
	 * Returns the tangent vector of the curve at the specified position.
	 *
	 * @name Curve#getTangentAt
	 * @function
	 * @param {Number} offset the offset on the curve, or the curve time
	 *        parameter if {@code isParameter} is {@code true}
	 * @param {Boolean} [isParameter=false] pass {@code true} if {@code offset}
	 *        is a curve time parameter.
	 * @return {Point} the tangent of the curve at the specified offset.
	 */

	/**
	 * Returns the normal vector of the curve at the specified position.
	 *
	 * @name Curve#getNormalAt
	 * @function
	 * @param {Number} offset the offset on the curve, or the curve time
	 *        parameter if {@code isParameter} is {@code true}
	 * @param {Boolean} [isParameter=false] pass {@code true} if {@code offset}
	 *        is a curve time parameter.
	 * @return {Point} the normal of the curve at the specified offset.
	 */

	/**
	 * Returns the curvature vector of the curve at the specified position.
	 *
	 * @name Curve#getCurvatureAt
	 * @function
	 * @param {Number} offset the offset on the curve, or the curve time
	 *        parameter if {@code isParameter} is {@code true}
	 * @param {Boolean} [isParameter=false] pass {@code true} if {@code offset}
	 *        is a curve time parameter.
	 * @return {Point} the curvature of the curve at the specified offset.
	 */
}),
new function() { // Scope for methods that require numerical integration

	function getLengthIntegrand(v) {
		// Calculate the coefficients of a Bezier derivative.
		var p1x = v[0], p1y = v[1],
			c1x = v[2], c1y = v[3],
			c2x = v[4], c2y = v[5],
			p2x = v[6], p2y = v[7],

			ax = 9 * (c1x - c2x) + 3 * (p2x - p1x),
			bx = 6 * (p1x + c2x) - 12 * c1x,
			cx = 3 * (c1x - p1x),

			ay = 9 * (c1y - c2y) + 3 * (p2y - p1y),
			by = 6 * (p1y + c2y) - 12 * c1y,
			cy = 3 * (c1y - p1y);

		return function(t) {
			// Calculate quadratic equations of derivatives for x and y
			var dx = (ax * t + bx) * t + cx,
				dy = (ay * t + by) * t + cy;
			return Math.sqrt(dx * dx + dy * dy);
		};
	}

	// Amount of integral evaluations for the interval 0 <= a < b <= 1
	function getIterations(a, b) {
		// Guess required precision based and size of range...
		// TODO: There should be much better educated guesses for
		// this. Also, what does this depend on? Required precision?
		return Math.max(2, Math.min(16, Math.ceil(Math.abs(b - a) * 32)));
	}

	return {
		statics: true,

		getLength: function(v, a, b) {
			if (a === undefined)
				a = 0;
			if (b === undefined)
				b = 1;
			// if (p1 == c1 && p2 == c2):
			if (v[0] == v[2] && v[1] == v[3] && v[6] == v[4] && v[7] == v[5]) {
				// Straight line
				var dx = v[6] - v[0], // p2x - p1x
					dy = v[7] - v[1]; // p2y - p1y
				return (b - a) * Math.sqrt(dx * dx + dy * dy);
			}
			var ds = getLengthIntegrand(v);
			return Numerical.integrate(ds, a, b, getIterations(a, b));
		},

		getArea: function(v) {
			var p1x = v[0], p1y = v[1],
				c1x = v[2], c1y = v[3],
				c2x = v[4], c2y = v[5],
				p2x = v[6], p2y = v[7];
			// http://objectmix.com/graphics/133553-area-closed-bezier-curve.html
			return (  3.0 * c1y * p1x - 1.5 * c1y * c2x
					- 1.5 * c1y * p2x - 3.0 * p1y * c1x
					- 1.5 * p1y * c2x - 0.5 * p1y * p2x
					+ 1.5 * c2y * p1x + 1.5 * c2y * c1x
					- 3.0 * c2y * p2x + 0.5 * p2y * p1x
					+ 1.5 * p2y * c1x + 3.0 * p2y * c2x) / 10;
		},

		getParameterAt: function(v, offset, start) {
			if (offset === 0)
				return start;
			// See if we're going forward or backward, and handle cases
			// differently
			var forward = offset > 0,
				a = forward ? start : 0,
				b = forward ? 1 : start,
				offset = Math.abs(offset),
				// Use integrand to calculate both range length and part
				// lengths in f(t) below.
				ds = getLengthIntegrand(v),
				// Get length of total range
				rangeLength = Numerical.integrate(ds, a, b,
						getIterations(a, b));
			if (offset >= rangeLength)
				return forward ? b : a;
			// Use offset / rangeLength for an initial guess for t, to
			// bring us closer:
			var guess = offset / rangeLength,
				length = 0;
			// Iteratively calculate curve range lengths, and add them up,
			// using integration precision depending on the size of the
			// range. This is much faster and also more precise than not
			// modifing start and calculating total length each time.
			function f(t) {
				var count = getIterations(start, t);
				length += start < t
						? Numerical.integrate(ds, start, t, count)
						: -Numerical.integrate(ds, t, start, count);
				start = t;
				return length - offset;
			}
			return Numerical.findRoot(f, ds,
					forward ? a + guess : b - guess, // Initial guess for x
					a, b, 16, /*#=*/ Numerical.TOLERANCE);
		}
	};
}, new function() { // Scope for intersection using bezier fat-line clipping
	function addLocation(locations, curve1, parameter, point, curve2) {
		// Avoid duplicates when hitting segments (closed paths too)
		var first = locations[0],
			last = locations[locations.length - 1];
		if ((!first || !point.equals(first._point))
				&& (!last || !point.equals(last._point)))
			locations.push(new CurveLocation(curve1, parameter, point, curve2));
	}

	function addCurveIntersections(v1, v2, curve1, curve2, locations,
			range1, range2, recursion) {
/*#*/ if (options.fatline) {
		// NOTE: range1 and range1 are only used for recusion
		recursion = (recursion || 0) + 1;
		// Avoid endless recursion.
		// Perhaps we should fall back to a more expensive method after this,
		// but so far endless recursion happens only when there is no real
		// intersection and the infinite fatline continue to intersect with the
		// other curve outside its bounds!
		if (recursion > 20)
			return;
		// Set up the parameter ranges.
		range1 = range1 || [ 0, 1 ];
		range2 = range2 || [ 0, 1 ];
		// Get the clipped parts from the original curve, to avoid cumulative
		// errors
		var part1 = Curve.getPart(v1, range1[0], range1[1]),
			part2 = Curve.getPart(v2, range2[0], range2[1]),
			iteration = 0;
		// markCurve(part1, '#f0f', true);
		// markCurve(part2, '#0ff', false);
		// Loop until both parameter range converge. We have to handle the
		// degenerate case seperately, where fat-line clipping can become
		// numerically unstable when one of the curves has converged to a point
		// and the other hasn't.
		while (iteration++ < 20
				&& (Math.abs(range1[1] - range1[0]) > /*#=*/ Numerical.TOLERANCE
				|| Math.abs(range2[1] - range2[0]) > /*#=*/ Numerical.TOLERANCE)) {
			// First we clip v2 with v1's fat-line
			var range,
				intersects1 = clipFatLine(part1, part2, range = range2.slice()),
				intersects2 = 0;
			// Stop if there are no possible intersections
			if (intersects1 === 0)
				break;
			if (intersects1 > 0) {
				// Get the clipped parts from the original v2, to avoid
				// cumulative errors
				range2 = range;
				part2 = Curve.getPart(v2, range2[0], range2[1]);
				// markCurve(part2, '#0ff', false);
				// Next we clip v1 with nuv2's fat-line
				intersects2 = clipFatLine(part2, part1, range = range1.slice());
				// Stop if there are no possible intersections
				if (intersects2 === 0)
					break;
				if (intersects1 > 0) {
					// Get the clipped parts from the original v2, to avoid
					// cumulative errors
					range1 = range;
					part1 = Curve.getPart(v1, range1[0], range1[1]);
				}
				// markCurve(part1, '#f0f', true);
			}
			// Get the clipped parts from the original v1
			// Check if there could be multiple intersections
			if (intersects1 < 0 || intersects2 < 0) {
				// Subdivide the curve which has converged the least from the
				// original range [0,1], which would be the curve with the
				// largest parameter range after clipping
				if (range1[1] - range1[0] > range2[1] - range2[0]) {
					// subdivide v1 and recurse
					var t = (range1[0] + range1[1]) / 2;
					addCurveIntersections(v1, v2, curve1, curve2, locations,
							[ range1[0], t ], range2, recursion);
					addCurveIntersections(v1, v2, curve1, curve2, locations,
							[ t, range1[1] ], range2, recursion);
					break;
				} else {
					// subdivide v2 and recurse
					var t = (range2[0] + range2[1]) / 2;
					addCurveIntersections(v1, v2, curve1, curve2, locations,
							range1, [ range2[0], t ], recursion);
					addCurveIntersections(v1, v2, curve1, curve2, locations,
							range1, [ t, range2[1] ], recursion);
					break;
				}
			}
			// We need to bailout of clipping and try a numerically stable
			// method if any of the following are true.
			//  1. One of the parameter ranges is converged to a point.
			//  2. Both of the parameter ranges have converged reasonably well
			//     (according to Numerical.TOLERANCE).
			//  3. One of the parameter range is converged enough so that it is
			//     *flat enough* to calculate line curve intersection implicitly
			//
			// Check if one of the parameter range has converged completely to a
			// point. Now things could get only worse if we iterate more for the
			// other curve to converge if it hasn't yet happened so.
			if (Math.abs(range1[1] - range1[0]) < /*#=*/ Numerical.TOLERANCE) {
				var t = (range1[0] + range1[1]) / 2;
				addLocation(locations, curve1, t,
						Curve.evaluate(v1, t, true, 0), curve2);
				break;
			}
			if (Math.abs(range2[1] - range2[0]) < /*#=*/ Numerical.TOLERANCE) {
				var t = (range2[0] + range2[1]) / 2;
				addLocation(locations, curve2, t,
						Curve.evaluate(v2, t, true, 0), curve1);
				break;
			}
			// see if either or both of the curves are flat enough to be treated
			// as lines.
			var flat1 = Curve.isFlatEnough(part1, /*#=*/ Numerical.TOLERANCE),
				flat2 = Curve.isFlatEnough(part2, /*#=*/ Numerical.TOLERANCE);
			if (flat1 || flat2) {
				(flat1 && flat2
						? addLineIntersection
						// Use curve line intersection method while specifying
						// which curve to be treated as line
						: addCurveLineIntersections)(part1, part2,
								curve1, curve2, locations, flat1);
				break;
			}
		}
/*#*/ } else { // !options.fatline
		var bounds1 = Curve.getBounds(v1),
			bounds2 = Curve.getBounds(v2);
		if (bounds1.touches(bounds2)) {
			// See if both curves are flat enough to be treated as lines, either
			// because they have no control points at all, or are "flat enough"
			// If the curve was flat in a previous iteration, we don't need to
			// recalculate since it does not need further subdivision then.
			if ((Curve.isLinear(v1)
					|| Curve.isFlatEnough(v1, /*#=*/ Numerical.TOLERANCE))
				&& (Curve.isLinear(v2)
					|| Curve.isFlatEnough(v2, /*#=*/ Numerical.TOLERANCE))) {
				// See if the parametric equations of the lines interesct.
				addLineIntersection(v1, v2, curve1, curve2, locations);
			} else {
				// Subdivide both curves, and see if they intersect.
				// If one of the curves is flat already, no further subdivion
				// is required.
				var v1s = Curve.subdivide(v1),
					v2s = Curve.subdivide(v2);
				for (var i = 0; i < 2; i++)
					for (var j = 0; j < 2; j++)
						Curve.getIntersections(v1s[i], v2s[j], curve1, curve2,
								locations);
			}
		}
		return locations;
/*#*/ } // !options.fatline
	}

/*#*/ if (options.fatline) {
	/**
	 * Clip curve V2 with fat-line of v1
	 * @param {Array} v1 section of the first curve, for which we will make a
	 * fat-line
	 * @param {Array} v2 section of the second curve; we will clip this curve
	 * with the fat-line of v1
	 * @param {Array} range2 the parameter range of v2
	 * @return {Number} 0: no Intersection, 1: one intersection, -1: more than
	 * one ntersection
	 */
	function clipFatLine(v1, v2, range2) {
		// P = first curve, Q = second curve
		var p0x = v1[0], p0y = v1[1], p1x = v1[2], p1y = v1[3],
			p2x = v1[4], p2y = v1[5], p3x = v1[6], p3y = v1[7],
			q0x = v2[0], q0y = v2[1], q1x = v2[2], q1y = v2[3],
			q2x = v2[4], q2y = v2[5], q3x = v2[6], q3y = v2[7],
			getSignedDistance = Line.getSignedDistance,
			// Calculate the fat-line L for P is the baseline l and two
			// offsets which completely encloses the curve P.
			d1 = getSignedDistance(p0x, p0y, p3x, p3y, p1x, p1y) || 0,
			d2 = getSignedDistance(p0x, p0y, p3x, p3y, p2x, p2y) || 0,
			factor = d1 * d2 > 0 ? 3 / 4 : 4 / 9,
			dmin = factor * Math.min(0, d1, d2),
			dmax = factor * Math.max(0, d1, d2),
			// Calculate non-parametric bezier curve D(ti, di(t)) - di(t) is the
			// distance of Q from the baseline l of the fat-line, ti is equally
			// spaced in [0, 1]
			dq0 = getSignedDistance(p0x, p0y, p3x, p3y, q0x, q0y),
			dq1 = getSignedDistance(p0x, p0y, p3x, p3y, q1x, q1y),
			dq2 = getSignedDistance(p0x, p0y, p3x, p3y, q2x, q2y),
			dq3 = getSignedDistance(p0x, p0y, p3x, p3y, q3x, q3y);
		// Find the minimum and maximum distances from l, this is useful for
		// checking whether the curves intersect with each other or not.
		// If the fatlines don't overlap, we have no intersections!
		if (dmin > Math.max(dq0, dq1, dq2, dq3)
				|| dmax < Math.min(dq0, dq1, dq2, dq3))
			return 0;
		var hull = getConvexHull(dq0, dq1, dq2, dq3),
			swap;
		if (dq3 < dq0) {
			swap = dmin;
			dmin = dmax;
			dmax = swap;
		}
		// Calculate the convex hull for non-parametric bezier curve D(ti, di(t))
		// Now we clip the convex hulls for D(ti, di(t)) with dmin and dmax
		// for the coorresponding t values (tmin, tmax): Portions of curve v2
		// before tmin and after tmax can safely be clipped away.
		var tmaxdmin = -Infinity,
			tmin = Infinity,
			tmax = -Infinity;
		for (var i = 0, l = hull.length; i < l; i++) {
			var p1 = hull[i],
				p2 = hull[(i + 1) % l];
			if (p2[1] < p1[1]) {
				swap = p2;
				p2 = p1;
				p1 = swap;
			}
			var	x1 = p1[0],
				y1 = p1[1],
				x2 = p2[0],
				y2 = p2[1];
			// We know that (x2 - x1) is never 0
			var inv = (y2 - y1) / (x2 - x1);
			if (dmin >= y1 && dmin <= y2) {
				var ixdx = x1 + (dmin - y1) / inv;
				if (ixdx < tmin)
					tmin = ixdx;
				if (ixdx > tmaxdmin)
					tmaxdmin = ixdx;
			}
			if (dmax >= y1 && dmax <= y2) {
				var ixdx = x1 + (dmax - y1) / inv;
				if (ixdx > tmax)
					tmax = ixdx;
				if (ixdx < tmin)
					tmin = 0;
			}
		}
		// Return the parameter values for v2 for which we can be sure that the
		// intersection with v1 lies within.
		if (tmin !== Infinity && tmax !== -Infinity) {
			var min = Math.min(dmin, dmax),
				max = Math.max(dmin, dmax);
			if (dq3 > min && dq3 < max)
				tmax = 1;
			if (dq0 > min && dq0 < max)
				tmin = 0;
			if (tmaxdmin > tmax)
				tmax = 1;
			// tmin and tmax are within the range (0, 1). We need to project it
			// to the original parameter range for v2.
			var v2tmin = range2[0],
				tdiff = range2[1] - v2tmin;
			range2[0] = v2tmin + tmin * tdiff;
			range2[1] = v2tmin + tmax * tdiff;
			// If the new parameter range fails to converge by atleast 20% of
			// the original range, possibly we have multiple intersections.
			// We need to subdivide one of the curves.
			if ((tdiff - (range2[1] - range2[0])) / tdiff >= 0.2)
				return 1;
		}
		// TODO: Try checking with a perpendicular fatline to see if the curves
		// overlap if it is any faster than this
		if (Curve.getBounds(v1).touches(Curve.getBounds(v2)))
			return -1;
		return 0;
	}

	/**
	 * Calculate the convex hull for the non-paramertic bezier curve D(ti, di(t))
	 * The ti is equally spaced across [0..1] — [0, 1/3, 2/3, 1] for
	 * di(t), [dq0, dq1, dq2, dq3] respectively. In other words our CVs for the
	 * curve are already sorted in the X axis in the increasing order.
	 * Calculating convex-hull is much easier than a set of arbitrary points.
	 */
	function getConvexHull(dq0, dq1, dq2, dq3) {
		var p0 = [ 0, dq0 ],
			p1 = [ 1 / 3, dq1 ],
			p2 = [ 2 / 3, dq2 ],
			p3 = [ 1, dq3 ],
			// Find signed distance of p1 and p2 from line [ p0, p3 ]
			getSignedDistance = Line.getSignedDistance,
			dist1 = getSignedDistance(0, dq0, 1, dq3, 1 / 3, dq1),
			dist2 = getSignedDistance(0, dq0, 1, dq3, 2 / 3, dq2);
		// Check if p1 and p2 are on the same side of the line [ p0, p3 ]
		if (dist1 * dist2 < 0) {
			// p1 and p2 lie on different sides of [ p0, p3 ]. The hull is a
			// quadrilateral and line [ p0, p3 ] is NOT part of the hull so we
			// are pretty much done here.
			return [ p0, p1, p3, p2 ];
		}
		// p1 and p2 lie on the same sides of [ p0, p3 ]. The hull can be
		// a triangle or a quadrilateral and line [ p0, p3 ] is part of the
		// hull. Check if the hull is a triangle or a quadrilateral.
		var pmax, cross;
		if (Math.abs(dist1) > Math.abs(dist2)) {
			pmax = p1;
			// apex is dq3 and the other apex point is dq0 vector
			// dqapex->dqapex2 or base vector which is already part of the hull.
			// cross = (vqa1a2X * vqa1MinY - vqa1a2Y * vqa1MinX)
			//		* (vqa1MaxX * vqa1MinY - vqa1MaxY * vqa1MinX)
			cross = (dq3 - dq2 - (dq3 - dq0) / 3)
					* (2 * (dq3 - dq2) - dq3 + dq1) / 3;
		} else {
			pmax = p2;
			// apex is dq0 in this case, and the other apex point is dq3 vector
			// dqapex->dqapex2 or base vector which is already part of the hull.
			cross = (dq1 - dq0 + (dq0 - dq3) / 3)
					* (-2 * (dq0 - dq1) + dq0 - dq2) / 3;
		}
		// Compare cross products of these vectors to determine if the point is
		// in the triangle [ p3, pmax, p0 ], or if it is a quadrilateral.
		return cross < 0
				// p2 is inside the triangle, hull is a triangle.
				? [ p0, pmax, p3 ]
				// Convexhull is a quadrilateral and we need all lines in the
				// correct order where line [ p1, p3 ] is part of the hull.
				: [ p0, p1, p2, p3 ];
	}
/*#*/ } // options.fatline

	/**
	 * Intersections between curve and line becomes rather simple here mostly
	 * because of Numerical class. We can rotate the curve and line so that the
	 * line is on the X axis, and solve the implicit equations for the X axis
	 * and the curve.
	 */
	function addCurveLineIntersections(v1, v2, curve1, curve2, locations, flip) {
		if (flip === undefined)
			flip = Curve.isLinear(v1);
		var vc = flip ? v2 : v1,
			vl = flip ? v1 : v2,
			l1x = vl[0], l1y = vl[1],
			l2x = vl[6], l2y = vl[7],
			// Rotate both curve and line around l1 so that line is on x axis
			lvx = l2x - l1x,
			lvy = l2y - l1y,
			// Angle with x axis (1, 0)
			angle = Math.atan2(-lvy, lvx),
			sin = Math.sin(angle),
			cos = Math.cos(angle),
			// (rl1x, rl1y) = (0, 0)
			rl2x = lvx * cos - lvy * sin,
			rl2y = lvy * cos + lvx * sin,
			vcr = [];

		for(var i = 0; i < 8; i += 2) {
			var x = vc[i] - l1x,
				y = vc[i + 1] - l1y;
			vcr.push(
				x * cos - y * sin,
				y * cos + x * sin);
		}
		var roots = [],
			count = Curve.solveCubic(vcr, 1, 0, roots);
		// NOTE: count could be -1 for inifnite solutions, but that should only
		// happen with lines, in which case we should not be here.
		for (var i = 0; i < count; i++) {
			var t = roots[i];
			if (t >= 0 && t <= 1) {
				var point = Curve.evaluate(vcr, t, true, 0);
				// We do have a point on the infinite line. Check if it falls on
				// the line *segment*.
				if (point.x  >= 0 && point.x <= rl2x)
					addLocation(locations,
							flip ? curve2 : curve1,
							// The actual intersection point
							t, Curve.evaluate(vc, t, true, 0), 
							flip ? curve1 : curve2);
			}
		}
	}

	function addLineIntersection(v1, v2, curve1, curve2, locations) {
		var point = Line.intersect(
				v1[0], v1[1], v1[6], v1[7],
				v2[0], v2[1], v2[6], v2[7]);
		// Passing null for parameter leads to lazy determination of parameter
		// values in CurveLocation#getParameter() only once they are requested.
		if (point)
			addLocation(locations, curve1, null, point, curve2);
	}

	return { statics: /** @lends Curve */{
		// We need to provide the original left curve reference to the
		// #getIntersections() calls as it is required to create the resulting
		// CurveLocation objects.
		getIntersections: function(v1, v2, curve1, curve2, locations) {
			var linear1 = Curve.isLinear(v1),
				linear2 = Curve.isLinear(v2);
			// Determine the correct intersection method based on values of
			// linear1 & 2:
			(linear1 && linear2
				? addLineIntersection
				: linear1 || linear2
					? addCurveLineIntersections
					: addCurveIntersections)(v1, v2, curve1, curve2, locations);
			return locations;
		}
	}};
});
