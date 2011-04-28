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

var Path = this.Path = PathItem.extend({
	beans: true,

	initialize: function(segments) {
		this.base();
		this.closed = false;
		this._selectedSegmentCount = 0;
		// Support both passing of segments as array or arguments
		// If it is an array, it can also be a description of a point, so
		// check its first entry for object as well
		this.setSegments(!segments || !Array.isArray(segments)
				|| typeof segments[0] !== 'object' ? arguments : segments);
	},

	/**
	 * The curves contained within the path.
	 */
	getCurves: function() {
		var length = this._segments.length;
		// Reduce length by one if it's an open path:
		if (!this.closed && length > 0)
			length--;
		var curves = this._curves = this._curves || new Array(length);
		curves.length = length;
		for (var i = 0; i < length; i++) {
			var curve = curves[i];
			if (!curve) {
				curve = curves[i] = new Curve(this, i);
			} else {
				// Make sure index is kept up to date.
				curve._setIndex(i);
			}
		}
		return curves;
	},

	getFirstSegment: function() {
		return this._segments[0];
	},

	getLastSegment: function() {
		return this._segments[this._segments.length - 1];
	},

	getFirstCurve: function() {
		return this.getCurves()[0];
	},

	getLastCurve: function() {
		var curves = this.getCurves();
		return curves[curves.length - 1];
	},

	// TODO: Consider adding getSubPath(a, b), returning a part of the current
	// path, with the added benefit that b can be < a, and closed looping is
	// taken into account.

	_transform: function(matrix, flags) {
		if (!matrix.isIdentity()) {
			var coords = new Array(6);
			for (var i = 0, l = this._segments.length; i < l; i++) {
				this._segments[i]._transformCoordinates(matrix, coords, true);
			}
		}
	},

	/**
	 * Private method that adds a segment to the segment list. It assumes that
	 * the passed object is a segment already and does not perform any checks.
	 */
	_add: function(segment, index) {
		// If this segment belongs to another path already, clone it before
		// adding.
		if (segment._path)
			segment = new Segment(segment);
		segment._path = this;
		if (index === undefined) {
			this._segments.push(segment);
		} else {
			this._segments.splice(index, 0, segment);
		}
		return segment;
	},

	add: function(segment) {
		segment = Segment.read(arguments);
		return segment ? this._add(segment) : null;
	},

	insert: function(index, segment) {
		segment = Segment.read(arguments, 1);
		return segment ? this._add(segment, index) : null;
	},
	
	remove: function() {
		if (!arguments.length) {
			// remove()
			this.base();
		} else if (arguments.length == 1) {
			if (arguments[0].point) {
				// remove(segment)
				arguments[0].remove();
			} else {
				// remove(index)
				this._segments[arguments[0]].remove();
			}
		} else {
			// remove(fromIndex, toIndex)
			for(var i = arguments[1], l = arguments[0]; i >= l; i--)
				this._segments[i].remove();
		}
	},
	
	isSelected: function() {
		return this._selectedSegmentCount > 0;
	},
	
	setSelected: function(selected) {
		var wasSelected = this.isSelected(),
			length = this._segments.length;
		if (!wasSelected != !selected && length)
			this._document._selectItem(this, selected);
		this._selectedSegmentCount = selected ? length : 0;
		for (var i = 0; i < length; i++)
			this._segments[i]._selectionState = selected
					? SelectionState.POINT : 0;
	},
	
	isFullySelected: function() {
		return this._selectedSegmentCount == this._segments.length;
	},
	
	setFullySelected: function(selected) {
		this.setSelected(selected);
	},
	
	// TODO: pointsToCurves([tolerance[, threshold[, cornerRadius[, scale]]]])
	// TODO: curvesToPoints([maxPointDistance[, flatness]])
	// TODO: reduceSegments([flatness])
	// TODO: split(offset) / split(location) / split(index[, parameter])
	
	/**
	 * Reverses the segments of the path.
	 */
	reverse: function() {
		var segments = this._segments;
		segments.reverse();
		// Reverse the handles:
		for (var i = 0, l = segments.length; i < l; i++) {
			var segment = segments[i];
			var handleIn = segment._handleIn;
			segment._handleIn = segment._handleOut;
			segment._handleOut = handleIn;
		}
	},

	join: function(path) {
		if (path) {
			var segments = path.segments,
				last1 = this.getLastSegment(),
				last2 = path.getLastSegment();
			if (last1._point.equals(last2._point))
				path.reverse();
			var first2 = path.getFirstSegment();
			if (last1._point.equals(first2._point)) {
				last1.setHandleOut(first2._handleOut);
				for (var i = 1, l = segments.length; i < l; i++)
					this._add(segments[i]);
			} else {
				var first1 = this.getFirstSegment();
				if (first1._point.equals(first2._point))
					path.reverse();
				if (first1._point.equals(last2._point)) {
					first1.setHandleIn(last2._handleIn);
					// Prepend all segments from path except last one
					for (var i = 0, l = segments.length - 1; i < l; i++)
						this._add(segments[i], 0);
				} else {
					for (var i = 0, l = segments.length; i < l; i++)
						this._add(segments[i]);
				}
			}
			path.remove();
			// Close if they touch in both places
			var first1 = this.getFirstSegment();
			last1 = this.getLastSegment();
			if (last1._point.equals(first1._point)) {
				first1.setHandleIn(last1._handleIn);
				last1.remove();
				this.closed = true;
			}
			return true;
		}
		return false;
	},

	getLength: function() {
		var curves = this.getCurves();
		var length = 0;
		for (var i = 0, l = curves.length; i < l; i++)
			length += curves[i].getLength();
		return length;
	},

	_getOffset: function(location) {
		var index = location && location.getIndex();
		if (index != null) {
			var curves = this.getCurves(),
				offset = 0;
			for (var i = 0; i < index; i++)
				offset += curves[i].getLength();
			var curve = curves[index];
			return offset + curve.getLength(0, location.getParameter());
		}
		return null;
	},

	// TODO: getLocationAt(point, precision)
	// TODO: Port back renaming and new isParameter argument to Scriptographer
	getLocationAt: function(offset, isParameter) {
		var curves = this.getCurves(),
			length = 0;
		if (isParameter) {
			// offset consists of curve index and curve parameter, before and
			// after the fractional digit.
			var index = ~~offset; // = Math.floor()
			return new CurveLocation(curves[index], offset - index);
		}
		for (var i = 0, l = curves.length; i < l; i++) {
			var start = length,
				curve = curves[i];
			length += curve.getLength();
			if (length >= offset) {
				// Found the segment within which the length lies
				return new CurveLocation(curve,
						curve.getParameter(offset - start));
			}
		}
		// It may be that through impreciseness of getLength, that the end
		// of the curves was missed:
		if (offset <= this.getLength())
			return new CurveLocation(curves[curves.length - 1], 1);
		return null;
	},

	/**
	 * Returns the point of the path at the given offset.
	 */
	getPointAt: function(offset, isParameter) {
		var loc = this.getLocationAt(offset, isParameter);
		return loc && loc.getPoint();
	},
	
	/**
	 * Returns the tangent to the path at the given offset as a vector
	 * point.
	 */
	getTangentAt: function(offset, isParameter) {
		var loc = this.getLocationAt(offset, isParameter);
		return loc && loc.getTangent();
	},
	
	/**
	 * Returns the normal to the path at the given offset as a vector point.
	 */
	getNormalAt: function(offset, isParameter) {
		var loc = this.getLocationAt(offset, isParameter);
		return loc && loc.getNormal();
	}
}, new function() { // Scope for drawing

	// Note that in the code below we're often accessing _x and _y on point
	// objects that were read from segments. This is because the SegmentPoint
	// class overrides the plain x / y properties with getter / setters and
	// stores the values in these private properties internally. To avoid
	// of getter functions all the time we directly access these private
	// properties here. The distinction between normal Point objects and
	// SegmentPoint objects maybe seem a bit tedious but is worth the
	// performance benefit.

	function drawHandles(ctx, segments) {
		for (var i = 0, l = segments.length; i < l; i++) {
			var segment = segments[i],
				point = segment._point,
				pointSelected = segment._selectionState == SelectionState.POINT;
			// TODO: draw handles depending on selection state of
			// segment.point and neighbouring segments.
				if (pointSelected || segment.isSelected(segment._handleIn))
					drawHandle(ctx, point, segment._handleIn);
				if (pointSelected || segment.isSelected(segment._handleOut))
					drawHandle(ctx, point, segment._handleOut);
			// Draw a rectangle at segment.point:
			ctx.save();
			ctx.beginPath();
			ctx.rect(point._x - 2, point._y - 2, 4, 4);
			ctx.fill();
			// TODO: Only draw white rectangle if point.isSelected()
			// is false:
			if (!pointSelected) {
				ctx.beginPath();
				ctx.rect(point._x - 1, point._y - 1, 2, 2);
				ctx.fillStyle = '#ffffff';
				ctx.fill();
				ctx.restore();
			}
		}
	}
	
	function drawHandle(ctx, point, handle) {
		if (!handle.isZero()) {
			var handleX = point._x + handle._x,
				handleY = point._y + handle._y;
			ctx.beginPath();
			ctx.moveTo(point._x, point._y);
			ctx.lineTo(handleX, handleY);
			ctx.stroke();
			ctx.beginPath();
			ctx.rect(handleX - 1, handleY - 1, 2, 2);
			ctx.stroke();
		}
	}
	
	return {
		draw: function(ctx, param) {
			if (!param.compound)
				ctx.beginPath();
			var segments = this._segments,
				length = segments.length,
				handleOut, outX, outY;
			for (var i = 0; i < length; i++) {
				var segment = segments[i],
					point = segment._point,
					x = point._x,
					y = point._y,
					handleIn = segment._handleIn;
				if (i == 0) {
					ctx.moveTo(x, y);
				} else {
					if (handleIn.isZero() && handleOut.isZero()) {
						ctx.lineTo(x, y);
					} else {
						ctx.bezierCurveTo(outX, outY,
								handleIn._x + x, handleIn._y + y,
								x, y);
					}
				}
				handleOut = segment._handleOut;
				outX = handleOut._x + x;
				outY = handleOut._y + y;
			}
			if (this.closed && length > 1) {
				var segment = segments[0],
					point = segment._point,
					x = point._x,
					y = point._y,
					handleIn = segment._handleIn;
				ctx.bezierCurveTo(outX, outY,
						handleIn._x + x, handleIn._y + y, x, y);
				ctx.closePath();
			}
			// If we are drawing the selection of a path, stroke it and draw
			// its handles:
			if (param.selection) {
				ctx.stroke();
				drawHandles(ctx, this._segments);
			} else {
				// If the path is part of a compound path or doesn't have a fill
				// or stroke, there is no need to continue.
				var fillColor = this.getFillColor(),
					strokeColor = this.getStrokeColor();
				if (!param.compound && (fillColor || strokeColor)) {
					this._setStyles(ctx);
					ctx.save();
					// If the path only defines a strokeColor or a fillColor,
					// draw it directly with the globalAlpha set, otherwise
					// we will do it later when we composite the temporary
					// canvas.
					if (!fillColor || !strokeColor)
						ctx.globalAlpha = this.opacity;
					if (fillColor) {
						ctx.fillStyle = fillColor.getCanvasStyle(ctx);
						ctx.fill();
					}
					if (strokeColor) {
						ctx.strokeStyle = strokeColor.getCanvasStyle(ctx);
						ctx.stroke();
					}
					ctx.restore();
				}
			}
		}
	};
}, new function() { // Scope for segments list change detection

	var segmentsFields = Base.each(
		['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'],
		function(name) {
			var func = Array.prototype[name];
			this[name] = function() {
				return func.apply(this, arguments);
			};
		}, {});

	return {
		beans: true,

		/**
		 * The segments contained within the path.
		 */
		getSegments: function() {
			return this._segments;
		},

		setSegments: function(segments) {
			var length = segments.length;
			if (!this._segments) {
				// Enhance the _segments array with functions that watch for
				// change.
				this._segments = Base.each(segmentsFields,
					function(value, name) {
						this[name] = value;
					}, []);
			} else {
				this.setSelected(false);
				this._segments.length = 0;
			}
			for(var i = 0; i < length; i++) {
				this._add(Segment.read(segments, i, 1));
			}
		}
	};
}, new function() { // Inject methods that require scoped privates

	/**
	 * Solves a tri-diagonal system for one of coordinates (x or y) of first
	 * bezier control points.
	 * 
	 * @param rhs right hand side vector.
	 * @return Solution vector.
	 */
	function getFirstControlPoints(rhs) {
		var n = rhs.length,
			x = [], // Solution vector.
			tmp = [], // Temporary workspace.
			b = 2;
		x[0] = rhs[0] / b;
		// Decomposition and forward substitution.
		for (var i = 1; i < n; i++) {
			tmp[i] = 1 / b;
			b = (i < n - 1 ? 4 : 2) - tmp[i];
			x[i] = (rhs[i] - x[i - 1]) / b;
		}
		// Back-substitution.
		for (var i = 1; i < n; i++) {
			x[n - i - 1] -= tmp[n - i] * x[n - i];
		}
		return x;
	};

	var styles = {
		getStrokeWidth: 'lineWidth',
		getStrokeJoin: 'lineJoin',
		getStrokeCap: 'lineCap',
		getMiterLimit: 'miterLimit'
	};

	return {
		beans: true,
		
		smooth: function() {
			// This code is based on the work by Oleg V. Polikarpotchkin,
			// http://ov-p.spaces.live.com/blog/cns!39D56F0C7A08D703!147.entry
			// It was extended to support closed paths by averaging overlapping
			// beginnings and ends. The result of this approach is very close to
			// Polikarpotchkin's closed curve solution, but reuses the same
			// algorithm as for open paths, and is probably executing faster as
			// well, so it is preferred.
			var segments = this._segments,
				size = segments.length,
				n = size,
				// Add overlapping ends for averaging handles in closed paths
				overlap;

			if (size <= 2)
				return;

			if (this.closed) {
				// Overlap up to 4 points since averaging beziers affect the 4
				// neighboring points
				overlap = Math.min(size, 4);
				n += Math.min(size, overlap) * 2;
			} else {
				overlap = 0;
			}
			var knots = [];
			for (var i = 0; i < size; i++)
				knots[i + overlap] = segments[i]._point;
			if (this.closed) {
				// If we're averaging, add the 4 last points again at the
				// beginning, and the 4 first ones at the end.
				for (var i = 0; i < overlap; i++) {
					knots[i] = segments[i + size - overlap]._point;
					knots[i + size + overlap] = segments[i]._point;
				}
			} else {
				n--;
			}
			// Calculate first Bezier control points
			// Right hand side vector
			var rhs = [];

			// Set right hand side X values
			for (var i = 1; i < n - 1; i++)
				rhs[i] = 4 * knots[i]._x + 2 * knots[i + 1]._x;
			rhs[0] = knots[0]._x + 2 * knots[1]._x;
			rhs[n - 1] = 3 * knots[n - 1]._x;
			// Get first control points X-values
			var x = getFirstControlPoints(rhs);

			// Set right hand side Y values
			for (var i = 1; i < n - 1; i++)
				rhs[i] = 4 * knots[i]._y + 2 * knots[i + 1]._y;
			rhs[0] = knots[0]._y + 2 * knots[1]._y;
			rhs[n - 1] = 3 * knots[n - 1]._y;
			// Get first control points Y-values
			var y = getFirstControlPoints(rhs);

			if (this.closed) {
				// Do the actual averaging simply by linearly fading between the
				// overlapping values.
				for (var i = 0, j = size; i < overlap; i++, j++) {
					var f1 = (i / overlap);
					var f2 = 1 - f1;
					// Beginning
					x[j] = x[i] * f1 + x[j] * f2;
					y[j] = y[i] * f1 + y[j] * f2;
					// End
					var ie = i + overlap, je = j + overlap;
					x[je] = x[ie] * f2 + x[je] * f1;
					y[je] = y[ie] * f2 + y[je] * f1;
				}
				n--;
			}
			var handleIn = null;
			// Now set the calculated handles
			for (var i = overlap; i <= n - overlap; i++) {
				var segment = segments[i - overlap];
				if (handleIn)
					segment.setHandleIn(handleIn.subtract(segment._point));
				if (i < n) {
					segment.setHandleOut(
							new Point(x[i], y[i]).subtract(segment._point));
					if (i < n - 1)
						handleIn = new Point(
								2 * knots[i + 1]._x - x[i + 1],
								2 * knots[i + 1]._y - y[i + 1]);
					else
						handleIn = new Point(
								(knots[n]._x + x[n - 1]) / 2,
								(knots[n]._y + y[n - 1]) / 2);
				}
			}
			if (this.closed && handleIn) {
				var segment = this._segments[0];
				segment.setHandleIn(handleIn.subtract(segment._point));
			}
		},

		_setStyles: function(ctx) {
			for (var i in styles) {
				var style = this[i]();
				if (style)
					ctx[styles[i]] = style;
			}
		}
	};
}, new function() { // PostScript-style drawing commands

	function getCurrentSegment(that) {
		var segments = that._segments;
		if (segments.length == 0)
			throw('Use a moveTo() command first');
		return segments[segments.length - 1];
	}

	/**
	 * Helper method that returns the current segment and checks if we need to
	 * execute a moveTo() command first.
	 */
	return {
		moveTo: function() {
			var segment = new Segment(Point.read(arguments));
			if (segment && !this._segments.length)
				this._add(segment);
		},

		lineTo: function() {
			var segment = new Segment(Point.read(arguments));
			if (segment)
				this._add(segment);
		},

		/**
		 * Adds a cubic bezier curve to the path, defined by two handles and a
		 * to point.
		 */
		cubicCurveTo: function(handle1, handle2, to) {
			handle1 = Point.read(arguments, 0, 1);
			handle2 = Point.read(arguments, 1, 1);
			to = Point.read(arguments, 2, 1);
			// First modify the current segment:
			var current = getCurrentSegment(this);
			// Convert to relative values:
			current.setHandleOut(new Point(
					handle1.x - current._point._x,
					handle1.y - current._point._y));
			// And add the new segment, with handleIn set to c2
			this._add(new Segment(to, handle2.subtract(to), new Point()));
		},

		/**
		 * Adds a quadratic bezier curve to the path, defined by a handle and a
		 * to point.
		 */
		quadraticCurveTo: function(handle, to) {
			handle = Point.read(arguments, 0, 1);
			to = Point.read(arguments, 1, 1);
			// This is exact:
			// If we have the three quad points: A E D,
			// and the cubic is A B C D,
			// B = E + 1/3 (A - E)
			// C = E + 1/3 (D - E)
			var current = getCurrentSegment(this)._point;
			this.cubicCurveTo(
				handle.add(current.subtract(handle).multiply(1/3)),
				handle.add(to.subtract(handle).multiply(1/3)),
				to
			);
		},

		curveTo: function(through, to, parameter) {
			through = Point.read(arguments, 0, 1);
			to = Point.read(arguments, 1, 1);
			var t = Base.pick(parameter, 0.5),
				t1 = 1 - t,
				current = getCurrentSegment(this)._point,
				// handle = (through - (1 - t)^2 * current - t^2 * to) /
				// (2 * (1 - t) * t)
				handle = through.subtract(current.multiply(t1 * t1))
					.subtract(to.multiply(t * t)).divide(2 * t * t1);
			if (handle.isNaN())
				throw new Error(
					"Cannot put a curve through points with parameter=" + t);
			this.quadraticCurveTo(handle, to);
		},

		arcTo: function(to, clockwise) {
			// Get the start point:
			var current = getCurrentSegment(this),
				through;
			if (arguments[1] && typeof arguments[1] !== 'boolean') {
				through = Point.read(arguments, 0, 1);
				to = Point.read(arguments, 1, 1);
			} else {
				to = Point.read(arguments, 0, 1);
				if (clockwise === null)
					clockwise = true;
				var middle = current._point.add(to).divide(2),
					step = middle.subtract(current._point);
				through = clockwise 
						? middle.subtract(-step.y, step.x)
						: middle.add(-step.y, step.x);
			}

			var x1 = current._point._x, x2 = through.x, x3 = to.x,
				y1 = current._point._y, y2 = through.y, y3 = to.y,

				f = x3 * x3 - x3 * x2 - x1 * x3 + x1 * x2 + y3 * y3 - y3 * y2
					- y1 * y3 + y1 * y2,
				g = x3 * y1 - x3 * y2 + x1 * y2 - x1 * y3 + x2 * y3 - x2 * y1,
				m = g == 0 ? 0 : f / g,

				c = (m * y2) - x2 - x1 - (m * y1),
				d = (m * x1) - y1 - y2 - (x2 * m),
				e = (x1 * x2) + (y1 * y2) - (m * x1 * y2) + (m * x2 * y1),

				centerX = -c / 2,
				centerY = -d / 2,
				radius = Math.sqrt(centerX * centerX + centerY * centerY - e),

			// Note: reversing the Y equations negates the angle to adjust
			// for the upside down coordinate system.
				angle = Math.atan2(centerY - y1, x1 - centerX),
				middle = Math.atan2(centerY - y2, x2 - centerX),
				extent = Math.atan2(centerY - y3, x3 - centerX),

				diff = middle - angle;

			if (diff < -Math.PI)
				diff += Math.PI * 2;
			else if (diff > Math.PI)
				diff -= Math.PI * 2;

			extent -= angle;
			if (extent <= 0)
				extent += Math.PI * 2;

			if (diff < 0) extent = Math.PI * 2 - extent;
			else extent = -extent;
			angle = -angle;

			var ext = Math.abs(extent),
				arcSegs;
			if (ext >= 2 * Math.PI) arcSegs = 4;
			else arcSegs = Math.ceil(ext * 2 / Math.PI);

			var inc = extent;
			if (inc > 2 * Math.PI) inc = 2 * Math.PI;
			else if (inc < -2 * Math.PI) inc = -2 * Math.PI;
			inc /= arcSegs;

			var halfInc = inc / 2,
				z = 4 / 3 * Math.sin(halfInc) / (1 + Math.cos(halfInc));

			for (var i = 0; i <= arcSegs; i++) {
				var relx = Math.cos(angle),
					rely = Math.sin(angle),
					pt = new Point(
							centerX + relx * radius,
							centerY + rely * radius);
				var out;
				if (i == arcSegs) {
					out = null;
				} else {
					out = new Point(
							centerX + (relx - z * rely) * radius - pt.x,
							centerY + (rely + z * relx) * radius - pt.y);
				}
				if (i == 0) {
					// Modify startSegment
					current.setHandleOut(out);
				} else {
					// Add new Segment
					var handleIn = new Point(
							centerX + (relx + z * rely) * radius - pt.x,
							centerY + (rely - z * relx) * radius - pt.y);
					this._add(new Segment(pt, handleIn, out));
				}
				angle += inc;
			}
		},

		lineBy: function(vector) {
			vector = Point.read(arguments);
			var current = getCurrentSegment(this);
			this.lineTo(current._point.add(vector));
		},

		curveBy: function(throughVector, toVector, parameter) {
			throughVector = Point.read(throughVector);
			toVector = Point.read(toVector);
			var current = getCurrentSegment(this)._point;
			this.curveTo(current.add(throughVector), current.add(toVector),
					parameter);
		},

		arcBy: function(throughVector, toVector) {
			throughVector = Point.read(throughVector);
			toVector = Point.read(toVector);
			var current = getCurrentSegment(this)._point;
			this.arcBy(current.add(throughVector), current.add(toVector));
		},

		closePath: function() {
			this.closed = true;
		}
	};
}, new function() { // A dedicated scope for the tricky bounds calculations

	// Add some tolerance for good roots, as t = 0 / 1 are added seperately
	// anyhow, and we don't want joins to be added with radiuses in
	// getBounds()
	var tMin = 10e-6, tMax = 1 - 10e-6;

	function getBounds(that, matrix, strokePadding) {
		// Code ported and further optimised from:
		// http://blog.hackers-cafe.net/2009/06/how-to-calculate-bezier-curves-bounding.html
		var segments = that._segments,
			first = segments[0];
		if (!first)
			return null;
		var coords = new Array(6),
			prevCoords = new Array(6);
		// Make coordinates for first segment available in prevCoords.
		if (matrix && matrix.isIdentity())
			matrix = null;
		first._transformCoordinates(matrix, prevCoords, false);
		var min = prevCoords.slice(0, 2),
			max = min.slice(0); // clone
		function processSegment(segment) {
			segment._transformCoordinates(matrix, coords, false);

			for (var i = 0; i < 2; i++) {
				var v0 = prevCoords[i], // prev.point
					v1 = prevCoords[i + 4], // prev.handleOut
					v2 = coords[i + 2], // segment.handleIn
					v3 = coords[i]; // segment.point

				function add(value, t) {
					var padding = 0;
					if (value == null) {
						// Calculate bezier polynomial at t
						var u = 1 - t;
						value = u * u * u * v0
								+ 3 * u * u * t * v1
								+ 3 * u * t * t * v2
								+ t * t * t * v3;
						// Only add strokeWidth to bounds for points which lie
						// within 0 < t < 1. The corner cases for cap and join
						// are handled in getStrokeBounds()
						padding = strokePadding ? strokePadding[i] : 0;
					}
					var left = value - padding,
						right = value + padding;
					if (left < min[i])
						min[i] = left;
					if (right > max[i])
						max[i] = right;

				}
				add(v3, null);

				// Calculate derivative of our bezier polynomial, divided by 3.
				// Dividing by 3 allows for simpler calculations of a, b, c and
				// leads to the same quadratic roots below.
				var a = 3 * (v1 - v2) - v0 + v3,
					b = 2 * (v0 + v2) - 4 * v1,
					c = v1 - v0;

				// Solve for derivative for quadratic roots. Each good root
				// (meaning a solution 0 < t < 1) is an extrema in the cubic
				// polynomial and thus a potential point defining the bounds
				if (a == 0) {
					if (b == 0)
					    continue;
					var t = -c / b;
					// Test for good root and add to bounds if good (same below)
					if (tMin < t && t < tMax)
						add(null, t);
					continue;
				}

				var b2ac = b * b - 4 * a * c;
				if (b2ac < 0)
					continue;
				var sqrt = Math.sqrt(b2ac),
					f = 1 / (a * -2),
				 	t1 = (b - sqrt) * f,
					t2 = (b + sqrt) * f;
				if (tMin < t1 && t1 < tMax)
					add(null, t1);
				if (tMin < t2 && t2 < tMax)
					add(null, t2);
			}
			// Swap coordinate buffers
			var tmp = prevCoords;
			prevCoords = coords;
			coords = tmp;
		}
		for (var i = 1, l = segments.length; i < l; i++)
			processSegment(segments[i]);
		if (that.closed)
			processSegment(first);
		return Rectangle.create(min[0], min[1],
					max[0] - min[0], max[1] - min[1]);
	}

	function getPenPadding(radius, matrix) {
		if (!matrix)
			return [radius, radius];
		// If a matrix is provided, we need to rotate the stroke circle
		// and calculate the bounding box of the resulting rotated elipse:
		// Get rotated hor and ver vectors, and determine rotation angle
		// and elipse values from them:
		var mx = matrix.createShiftless(),
			hor = mx.transform(new Point(radius, 0)),
			ver = mx.transform(new Point(0, radius)),
			phi = hor.getAngleInRadians(),
			a = hor.getLength(),
			b = ver.getLength();
		// Formula for rotated ellipses:
		// x = cx + a*cos(t)*cos(phi) - b*sin(t)*sin(phi)
		// y = cy + b*sin(t)*cos(phi) + a*cos(t)*sin(phi)
		// Derivates (by Wolfram Alpha):
		// derivative of x = cx + a*cos(t)*cos(phi) - b*sin(t)*sin(phi)
		// dx/dt = a sin(t) cos(phi) + b cos(t) sin(phi) = 0
		// derivative of y = cy + b*sin(t)*cos(phi) + a*cos(t)*sin(phi)
		// dy/dt = b cos(t) cos(phi) - a sin(t) sin(phi) = 0
		// this can be simplified to:
		// tan(t) = -b * tan(phi) / a // x
		// tan(t) = b * cot(phi) / a // y
		// Solving for t gives:
		// t = pi * n - arctan(b tan(phi)) // x
		// t = pi * n + arctan(b cot(phi)) // y
		var tx = - Math.atan(b * Math.tan(phi)),
			ty = + Math.atan(b / Math.tan(phi)),
			// Due to symetry, we don't need to cycle through pi * n
			// solutions:
			x = a * Math.cos(tx) * Math.cos(phi)
				- b * Math.sin(tx) * Math.sin(phi),
			y = b * Math.sin(ty) * Math.cos(phi)
				+ a * Math.cos(ty) * Math.sin(phi);
		// Now update the join / round padding, as required by
		// getBounds() and code below.
		return [Math.abs(x), Math.abs(y)];
	}

	return {
		beans: true,

		/**
		 * The bounding rectangle of the item excluding stroke width.
		 * @param matrix optional
		 */
		getBounds: function(/* matrix */) {
			// Pass the matrix hidden from Bootstrap, so it still inject 
			// getBounds as bean too.
			var bounds = getBounds(this, arguments[0]);
			return LinkedRectangle.create(this, 'setBounds',
					bounds.x, bounds.y, bounds.width, bounds.height);
		},

		/**
		 * The bounding rectangle of the item including stroke width.
		 */
		getStrokeBounds: function(/* matrix */) {
			var matrix = arguments[0], // set #getBounds()
				width = this.getStrokeWidth(),
				radius = width / 2,
				padding = getPenPadding(radius, matrix),
				join = this.getStrokeJoin(),
				cap = this.getStrokeCap(),
				// miter is relative to width. Divide it by 2 since we're
				// measuring half the distance below
				miter = this.getMiterLimit() * width / 2,
				segments = this._segments,
				length = segments.length,
				closed= this.closed,
				// It seems to be compatible with Ai we need to pass pen padding
				// untransformed to getBounds()
				bounds = getBounds(this, matrix, getPenPadding(radius));

			// Create a rectangle of padding size, used for union with bounds
			// further down
			var joinBounds = new Rectangle(new Size(padding).multiply(2));

			function add(point) {
				bounds = bounds.include(matrix
					? matrix.transform(point) : point);
			}

			function addBevelJoin(curve, t) {
				var point = curve.getPoint(t),
					normal = curve.getNormal(t).normalize(radius);
				add(point.add(normal));
				add(point.subtract(normal));
			}

			function addJoin(segment, join) {
				var handleIn = segment.getHandleInIfSet(),
					handleOut = segment.getHandleOutIfSet();
				// When both handles are set in a segment, the join setting is
				// ignored and round is always used.
				if (join === 'round' || handleIn && handleOut) {
					bounds = bounds.unite(joinBounds.setCenter(matrix
						? matrix.transform(segment._point) : segment._point));
				} else {
					switch (join) {
					case 'bevel':
						var curve = segment.getCurve();
						addBevelJoin(curve, 0);
						addBevelJoin(curve.getPrevious(), 1);
						break;
					case 'miter':
						var curve2 = segment.getCurve(),
							curve1 = curve2.getPrevious(),
							point = curve2.getPoint(0),
							normal1 = curve1.getNormal(1).normalize(radius),
							normal2 = curve2.getNormal(0).normalize(radius),
							// Intersect the two lines
							line1 = new Line(point.add(normal1),
									new Point(-normal1.y, normal1.x)),
							line2 = new Line(point.subtract(normal2),
									new Point(-normal2.y, normal2.x)),
							corner = line1.intersect(line2);
						// Now measure the distance from the segment to the
						// intersection, which his half of the miter distance
						if (!corner || point.getDistance(corner) > miter) {
							addJoin(segment, 'bevel');
						} else {
							add(corner);
						}
						break;
					}
				}
			}

			function addCap(segment, cap, t) {
				switch (cap) {
				case 'round':
					return addJoin(segment, cap);
				case 'butt':
				case 'square':
					// Calculate the corner points of butt and square caps
					var curve = segment.getCurve(),
						point = curve.getPoint(t),
						normal = curve.getNormal(t).normalize(radius);
					// For square caps, we need to step away from point in the
					// direction of the tangent, which is the rotated normal
					if (cap === 'square')
						point = point.add(normal.y, -normal.x);
					add(point.add(normal));
					add(point.subtract(normal));
					break;
				}
			}

			for (var i = 1, l = length - (closed ? 0 : 1); i < l; i++) {
				addJoin(segments[i], join);
			}
			if (closed) {
				addJoin(segments[0], join);
			} else {
				addCap(segments[0], cap, 0);
				addCap(segments[length - 1], cap, 1);
			}

			return bounds;
		},

		/**
		 * The bounding rectangle of the item including handles.
		 */
		getControlBounds: function() {
			// TODO: Implement!
		}
		
		// TODO: intersects(item)
		// TODO: contains(item)
		// TODO: contains(point)
		// TODO: intersect(item)
		// TODO: unite(item)
		// TODO: exclude(item)
		// TODO: getIntersections(path)
	};
});
