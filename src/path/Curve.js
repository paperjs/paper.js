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
	 * @param {Segment} segment1
	 * @param {Segment} segment2
	 */
	initialize: function(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7) {
		var count = arguments.length;
		if (count == 0) {
			this._segment1 = new Segment();
			this._segment2 = new Segment();
		} else if (count == 1) {
			// TODO: If beans are not activated, this won't copy from
			// an existing segment. OK?
			this._segment1 = new Segment(arg0.segment1);
			this._segment2 = new Segment(arg0.segment2);
		} else if (count == 2) {
			this._segment1 = new Segment(arg0);
			this._segment2 = new Segment(arg1);
		} else if (count == 4) {
			this._segment1 = new Segment(arg0, null, arg1);
			this._segment2 = new Segment(arg3, arg2, null);
		} else if (count == 8) {
			// An array as returned by getValues
			var p1 = Point.create(arg0, arg1),
				p2 = Point.create(arg6, arg7);
			this._segment1 = new Segment(p1, null,
					Point.create(arg2, arg3).subtract(p1));
			this._segment2 = new Segment(p2,
					Point.create(arg4, arg5).subtract(p2), null);
		}
	},

	_changed: function() {
		// Clear cached values.
		delete this._length;
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

	// DOCS: document Curve#getLength(from, to)
	/**
	 * The approximated length of the curve in points.
	 * 
	 * @type Number
	 * @bean
	 */
	getLength: function(/* from, to */) {
		var from = arguments[0],
			to = arguments[1];
			fullLength = arguments.length == 0 || from == 0 && to == 1;
		if (fullLength && this._length != null)
			return this._length;
		// Hide parameters from Bootstrap so it injects bean too
		var args = this.getValues();
		if (!fullLength)
			args.push(from, to);
		var length = Curve.getLength.apply(Curve, args);
		if (fullLength)
			this._length = length;
		return length;
	},

	getPart: function(from, to) {
		var args = this.getValues();
		args.push(from, to);
		return new Curve(Curve.getPart.apply(Curve, args));
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

	// PORT: Add support for start parameter to Sg
	// DOCS: document Curve#getParameter(length, start)
	/**
	 * @param {Number} length
	 * @param {Number} [start]
	 * @return {Boolean} {@true the curve is linear}
	 */
	getParameter: function(length, start) {
		var args = this.getValues();
		args.push(length, start !== undefined ? start : length < 0 ? 1 : 0);
		return Curve.getParameter.apply(Curve, args);
	},

	_evaluate: function(parameter, type) {
		var args = this.getValues();
		args.push(parameter, type);
		return Curve.evaluate.apply(Curve, args);
	},

	/**
	 * Returns the point on the curve at the specified position.
	 * 
	 * @param {Number} parameter the position at which to find the point as
	 *                 a value between {@code 0} and {@code 1}.
	 * @return {Point}
	 */
	getPoint: function(parameter) {
		return this._evaluate(parameter, 0);
	},

	/**
	 * Returns the tangent point on the curve at the specified position.
	 * 
	 * @param {Number} parameter the position at which to find the tangent
	 *                 point as a value between {@code 0} and {@code 1}.
	 */
	getTangent: function(parameter) {
		return this._evaluate(parameter, 1);
	},

	/**
	 * Returns the normal point on the curve at the specified position.
	 * 
	 * @param {Number} parameter the position at which to find the normal
	 *                 point as a value between {@code 0} and {@code 1}.
	 */
	getNormal: function(parameter) {
		return this._evaluate(parameter, 2);
	},

	// TODO: getParameter(point, precision)
	// TODO: getLocation
	// TODO: getIntersections
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

	// TODO: divide
	// TODO: split

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

	statics: {
		create: function(path, segment1, segment2) {
			var curve = new Curve(Curve.dont);
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

		evaluate: function(p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y, t, type) {
			var x, y;

			// Handle special case at beginning / end of curve
			// PORT: Change in Sg too, so 0.000000000001 won't be
			// required anymore
			if (t == 0 || t == 1) {
				var point;
				switch (type) {
				case 0: // point
					x = t == 0 ? p1x : p2x;
					y = t == 0 ? p1y : p2y;
					break;
				case 1: // tangent
				case 2: // normal
					var px, py;
					if (t == 0) {
						if (c1x == p1x && c1y == p1y) { // handle1 = 0
							if (c2x == p2x && c2y == p2y) { // handle2 = 0
								px = p2x; py = p2y; // p2
							} else {
								px = c2x; py = c2y; // c2
							}
						} else {
							px = c1x; py = c1y; // handle1
						}
						x = px - p1x;
						y = py - p1y;
					} else {
						if (c2x == p2x && c2y == p2y) { // handle2 = 0
							if (c1x == p1x && c1y == p1y) { // handle1 = 0
								px = p1x; py = p1y; // p1
							} else {
								px = c1x; py = c1y; // c1
							}
						} else { // handle2
							px = c2x; py = c2y;
						}
						x = p2x - px;
						y = p2y - py;
					}
					break;
				}
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
				case 1: // tangent
				case 2: // normal
					// Simply use the derivation of the bezier function for both
					// the x and y coordinates:
					x = (3 * ax * t + 2 * bx) * t + cx;
					y = (3 * ay * t + 2 * by) * t + cy;
					break;
				}
			}
			// The normal is simply the rotated tangent:
			// TODO: Rotate normals the other way in Scriptographer too?
			// (Depending on orientation, I guess?)
			return type == 2 ? new Point(y, -x) : new Point(x, y);
		},

		subdivide: function(p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y, t) {
			if (t === undefined)
				t = 0.5;
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
			// We now have all the values we need to build the subcurves:
			return [
				[p1x, p1y, p3x, p3y, p6x, p6y, p8x, p8y], // left
				[p8x, p8y, p7x, p7y, p5x, p5y, p2x, p2y] // right
			];
		},

		// TODO: Find better name
		getPart: function(p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y, from, to) {
			var curve = [p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y];
			if (from > 0) {
				// 8th argument of Curve.subdivide() == t, and values can be
				// directly used as arguments list for apply().
				curve[8] = from;
				curve = Curve.subdivide.apply(Curve, curve)[1]; // right
			}
			if (to < 1) {
				// Se above about curve[8].
				// Interpolate the  parameter at 'to' in the new curve and
				// cut there
				curve[8] = (to - from) / (1 - from);
				curve = Curve.subdivide.apply(Curve, curve)[0]; // left
			}
			return curve;
		},

		isSufficientlyFlat: function(p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y) {
			// Inspired by Skia, but to be tested:
			// Calculate 1/3 (m1) and 2/3 (m2) along the line between start (p1)
			// and end (p2), measure distance from there the control points and
			// see if they are further away than 1/2.
			// Seems all very inaccurate, especially since the distance
			// measurement is just the bigger one of x / y...
			// TODO: Find a more accurate and still fast way to determine this.
			var vx = (p2x - p1x) / 3,
				vy = (p2y - p1y) / 3,
				m1x = p1x + vx,
				m1y = p1y + vy,
				m2x = p2x - vx,
				m2y = p2y - vy;
			return Math.max(
					Math.abs(m1x - c1x), Math.abs(m1y - c1y),
					Math.abs(m2x - c1x), Math.abs(m1y - c1y)) < 1 / 2;
			/*
			// Thanks to Kaspar Fischer for the following:
			// http://www.inf.ethz.ch/personal/fischerk/pubs/bez.pdf
			var ux = 3 * c1x - 2 * p1x - p2x;
			ux *= ux;
			var uy = 3 * c1y - 2 * p1y - p2y;
			uy *= uy;
			var vx = 3 * c2x - 2 * p2x - p1x;
			vx *= vx;
			var vy = 3 * c2y - 2 * p2y - p1y;
			vy *= vy;
			if (ux < vx)
				ux = vx;
			if (uy < vy)
				uy = vy;
			// Tolerance is 16 * tol ^ 2
			return ux + uy <= 16 * Numerical.TOLERNACE * Numerical.TOLERNACE;
			*/
		}
	}
}, new function() { // Scope for methods that require numerical integration

	function getLengthIntegrand(p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y) {
		// Calculate the coefficients of a Bezier derivative.
		var ax = 9 * (c1x - c2x) + 3 * (p2x - p1x),
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

		getLength: function(p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y, a, b) {
			if (a === undefined)
				a = 0;
			if (b === undefined)
				b = 1;
			if (p1x == c1x && p1y == c1y && p2x == c2x && p2y == c2y) {
				// Straight line
				var dx = p2x - p1x,
					dy = p2y - p1y;
				return (b - a) * Math.sqrt(dx * dx + dy * dy);
			}
			var ds = getLengthIntegrand(
					p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y);
			return Numerical.integrate(ds, a, b, getIterations(a, b));
		},

		getParameter: function(p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y,
				length, start) {
			if (length == 0)
				return start;
			// See if we're going forward or backward, and handle cases
			// differently
			var forward = length > 0,
				a = forward ? start : 0,
				b = forward ? 1 : start,
				length = Math.abs(length),
				// Use integrand to calculate both range length and part
				// lengths in f(t) below.
				ds = getLengthIntegrand(
						p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y),
				// Get length of total range
				rangeLength = Numerical.integrate(ds, a, b,
						getIterations(a, b));
			if (length >= rangeLength)
				return forward ? b : a;
			// Use length / rangeLength for an initial guess for t, to
			// bring us closer:
			var guess = length / rangeLength,
				len = 0;
			// Iteratively calculate curve range lengths, and add them up,
			// using integration precision depending on the size of the
			// range. This is much faster and also more precise than not
			// modifing start and calculating total length each time.
			function f(t) {
				var count = getIterations(start, t);
				if (start < t) {
					len += Numerical.integrate(ds, start, t, count);
				} else {
					len -= Numerical.integrate(ds, t, start, count);
				}
				start = t;
				return len - length;
			}
			return Numerical.findRoot(f, ds,
					forward ? a + guess : b - guess, // Initial guess for x
					a, b, 16, Numerical.TOLERANCE);
		}
	};
});
