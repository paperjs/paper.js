var Path = this.Path = PathItem.extend({
	beans: true,

	initialize: function(/* segments */) {
		this.base();
		this.closed = false;
		this._segments = [];
		// Support both passing of segments as array or arguments
		// If it is an array, it can also be a description of a point, so
		// check its first entry for object as well
		var segments = arguments[0];
		if (!segments || !Array.isArray(segments)
				|| typeof segments[0] != 'object')
			segments = arguments;
		for (var i = 0, l = segments.length; i < l; i++) {
			var seg = Segment.read(segments, i, 1);
			this._add(seg);
		}
	},

	/**
	 * The segments contained within the path.
	 */
	getSegments: function() {
		return this._segments;
	},

	setSegments: function(segments) {
		var l = segments.length;
		this._segments = new Array(l);
		for(var i = 0; i < l; i++) {
			this._segments[i] = Segment.read(segments, i, 1);
		}
	},

	// TODO: Add back to Scriptographer:

	getFirstSegment: function() {
		return this._segments[0];
	},

	getLastSegment: function() {
		return this._segments[this._segments.length - 1];
	},

	// TODO: Consider adding getSubPath(a, b), returning a part of the current
	// path, with the added benefit that b can be < a, and closed looping is
	// taken into account.

	// Calculates arclength of a cubic using adaptive simpson integration.
	getCurveLength: function(goal) {
		var seg0 = this._segments[0],
			seg1 = this._segments[1],
			z0 = seg0._point,
			z1 = seg1._point,
			c0 = z0.add(seg0._handleOut),
			c1 = z1.add(seg1._handleIn);
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

	_transform: function(matrix, flags) {
		var coords = new Array(6);
		for (var i = 0, l = this._segments.length; i < l; i++) {
			var segment = this._segments[i];
			// Use matrix.transform version() that takes arrays of multiple
			// points for largely improved performance, as no calls to
			// Point.read() and Point constructors are necessary.
			var point = segment._point,
				handleIn = segment._handleIn,
				handleOut = segment._handleOut,
				x = point.x,
				y = point.y;
			if (handleIn.isZero())
				handleIn = null;
			if (handleOut.isZero())
				handleOut = null;
			coords[0] = x;
			coords[1] = y;
			var index = 2;
			// We need to convert handles to absolute coordinates in order
			// to transform them.
			if (handleIn) {
				coords[index++] = handleIn.x + x;
				coords[index++] = handleIn.y + y;
			}
			if (handleOut) {
				coords[index++] = handleOut.x + x;
				coords[index++] = handleOut.y + y;
			}
			matrix.transform(coords, 0, coords, 0, index / 2);
			x = point.x = coords[0];
			y = point.y = coords[1];
			index  = 2;
			if (handleIn) {
				handleIn.x = coords[index++] - x;
				handleIn.y = coords[index++] - y;
			}
			if (handleOut) {
				handleOut.x = coords[index++] - x;
				handleOut.y = coords[index++] - y;
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
		if (segment.path)
			segment = new Segment(segment);
		segment.path = this;
		if (index == undefined) {
			this._segments.push(segment);
		} else {
			this._segments.splice(index, 0, segment);
		}
		return segment;
	},

	add: function() {
		var segment = Segment.read(arguments);
		return segment ? this._add(segment) : null;
	},

	insert: function(index, segment) {
		var segment = Segment.read(arguments, 1);
		return segment ? this._add(segment, index) : null;
	},

	/**
	 *  PostScript-style drawing commands
	 */

	/**
	 * Helper method that returns the current segment and checks if we need to
	 * execute a moveTo() command first.
	 */
	getCurrentSegment: function() {
		if (this._segments.length == 0)
			throw('Use a moveTo() command first');
		return this._segments[this._segments.length - 1];
	},

	moveTo: function() {
		var segment = Segment.read(arguments);
		if (segment && !this._segments.length)
			this._add(segment);
	},

	lineTo: function() {
		var segment = Segment.read(arguments);
		if (segment)
			this._add(segment);
	},

	/**
	 * Adds a cubic bezier curve to the path, defined by two handles and a to
	 * point.
	 */
	cubicCurveTo: function(handle1, handle2, to) {
		// First modify the current segment:
		var current = this.currentSegment;
		// Convert to relative values:
		current.setHandleOut(new Point(
				handle1.x - current._point.x,
				handle1.y - current._point.y));
		// And add the new segment, with handleIn set to c2
		this._add(
			new Segment(to, handle2.subtract(to), new Point())
		);
	},

	/**
	 * Adds a quadratic bezier curve to the path, defined by a handle and a to
	 * point.
	 */
	quadraticCurveTo: function(handle, to) {
		// This is exact:
		// If we have the three quad points: A E D,
		// and the cubic is A B C D,
		// B = E + 1/3 (A - E)
		// C = E + 1/3 (D - E)
		var current = this.currentSegment,
			x1 = current._point.x,
			y1 = current._point.y;
		this.cubicCurveTo(
			handle.add(current._point.subtract(handle).multiply(1/3)),
			handle.add(to.subtract(handle).multiply(1/3)),
			to
		);
	},

	curveTo: function(through, to, parameter) {
		through = new Point(through);
		to = new Point(to);
		if (parameter == null)
			parameter = 0.5;
		var current = this.currentSegment._point;
		// handle = (through - (1 - t)^2 * current - t^2 * to) /
		// (2 * (1 - t) * t)
		var t1 = 1 - parameter;
		var handle = through.subtract(
				current.multiply(t1 * t1)).subtract(
						to.multiply(parameter * parameter)).divide(
								2.0 * parameter * t1);
		if (handle.isNaN())
			throw new Error(
					"Cannot put a curve through points with parameter="
					+ parameter);
		this.quadraticCurveTo(handle, to);
	},

	arcTo: function(to, clockwise) {
		var through, to;
		// Get the start point:
		var current = this.currentSegment;
		if (arguments[1] && typeof arguments[1] != 'boolean') {
			through = new Point(arguments[0]);
			to = new Point(arguments[1]);
		} else {
			if (clockwise === null)
				clockwise = true;
			var middle = current._point.add(to).divide(2);
			var step = middle.subtract(current._point);
			through = clockwise 
					? middle.subtract(-step.y, step.x)
					: middle.add(-step.y, step.x);
		}

		var x1 = current._point.x, x2 = through.x, x3 = to.x,
			y1 = current._point.y, y2 = through.y, y3 = to.y,

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
		if (extent <= 0.0)
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
				pt = new Point(centerX + relx * radius,
					centerY + rely * radius);
			var out;
			if (i == arcSegs) out = null;
			else out = new Point(centerX + (relx - z * rely) * radius - pt.x,
					centerY + (rely + z * relx) * radius - pt.y);
			if (i == 0) {
				// Modify startSegment
				current.setHandleOut(out);
			} else {
				// Add new Segment
				var inPoint = new Point(
						centerX + (relx + z * rely) * radius - pt.x,
						centerY + (rely - z * relx) * radius - pt.y);
				this._add(new Segment(pt, inPoint, out));
			}
			angle += inc;
		}
	},

	lineBy: function() {
		var vector = Point.read(arguments);
		if (vector) {
			var current = this.currentSegment;
			this.lineTo(current._point.add(vector));
		}
	},

	curveBy: function(throughVector, toVector, parameter) {
		throughVector = Point.read(throughVector);
		toVector = Point.read(toVector);
		var current = this.currentSegment._point;
		this.curveTo(current.add(throughVector), current.add(toVector),
				parameter);
	},

	arcBy: function(throughVector, toVector) {
		throughVector = Point.read(throughVector);
		toVector = Point.read(toVector);
		var current = this.currentSegment._point;
		this.arcBy(current.add(throughVector), current.add(toVector));
	},

	closePath: function() {
		this.closed = ture;
	},

	draw: function(ctx, param) {
		if (!param.compound)
			ctx.beginPath();
		var segments = this._segments;
		var length = segments.length;
		for (var i = 0; i < length; i++) {
			var segment = segments[i],
				point = segment._point,
				x = point.x,
				y = point.y,
				handleIn = segment._handleIn;
			if (i == 0) {
				ctx.moveTo(x, y);
			} else {
				if (handleOut.isZero() && handleIn.isZero()) {
					ctx.lineTo(x, y);
				} else {
					ctx.bezierCurveTo(
						outX, outY,
						handleIn.x + x, handleIn.y + y,
						x, y
					);
				}
			}
			var handleOut = segment._handleOut,
				outX = handleOut.x + x,
				outY = handleOut.y + y;
		}
		if (this.closed && length > 1) {
			var segment = segments[0],
				point = segment._point,
				x = point.x,
				y = point.y,
				handleIn = segment._handleIn;
			ctx.bezierCurveTo(outX, outY, handleIn.x + x, handleIn.y + y, x, y);
			ctx.closePath();
		}
		// If the path is part of a compound path or doesn't have a fill or
		// stroke, there is no need to continue.
		var fillColor = this.getFillColor(),
			strokeColor = this.getStrokeColor();
		if (!param.compound && (fillColor || strokeColor)) {
			this.setContextStyles(ctx);
			ctx.save();
			// If the path only defines a strokeColor or a fillColor,
			// draw it directly with the globalAlpha set, otherwise
			// we will do it later when we composite the temporary canvas.
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
}, new function() { // Inject methods that require scoped privates

	function calculateBounds(that, strokeRadius) {
		// Code ported and further optimised from:
		// http://blog.hackers-cafe.net/2009/06/how-to-calculate-bezier-curves-bounding.html
		var segments = that._segments, first = segments[0];
		if (!first)
			return null;
		var min = first._point.clone(), max = min.clone(),
			coords = ['x', 'y'], prev = first;
		function processSegment(segment) {
			for (var i = 0; i < 2; i++) {
				var coord = coords[i];

				var v0 = prev._point[coord],
					v1 = v0 + prev._handleOut[coord],
					v3 = segment._point[coord],
					v2 = v3 + segment._handleIn[coord];

				function add(value, t) {
					var radius = 0;
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
						radius = strokeRadius;
					}
					var left = value - radius,
						right = value + radius;
					if (left < min[coord])
						min[coord] = left;
					if (right > max[coord])
						max[coord] = right;
					
				}
				add(v3, null);

				// Calculate derivative of our bezier polynomial, divided by 3.
				// Dividing by 3 allows for simpler calculations of a, b, c and
				// leads to the same quadratic roots below.
				var a = 3 * (v1 - v2) - v0 + v3;
				var b = 2 * (v0 + v2) - 4 * v1;
				var c = v1 - v0;

				// Solve for derivative for quadratic roots. Each good root
				// (meaning a solution 0 < t < 1) is an extrema in the cubic
				// polynomial and thus a potential point defining the bounds
				if (a == 0) {
					if (b == 0)
					    continue;
					var t = -c / b;
					// Test for good root and add to bounds if good (same below)
					if (0 < t && t < 1)
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
				if (0 < t1 && t1 < 1)
					add(null, t1);
				if (0 < t2 && t2 < 1)
					add(null, t2);
			}
			prev = segment;
		}
		for (var i = 1, l = segments.length; i < l; i++)
			processSegment(segments[i]);
		if (that.closed)
			processSegment(first);
	    return new Rectangle(min.x, min.y, max.x - min.x , max.y - min.y);
	}

	/**
	 * Solves a tri-diagonal system for one of coordinates (x or y) of first
	 * bezier control points.
	 * 
	 * @param rhs right hand side vector.
	 * @return Solution vector.
	 */
	function getFirstControlPoints(rhs) {
		var n = rhs.length;
		var x = []; // Solution vector.
		var tmp = []; // Temporary workspace.
		var b = 2;
		x[0] = rhs[0] / b;
		// Decomposition and forward substitution.
		for (var i = 1; i < n; i++) {
			tmp[i] = 1 / b;
			b = (i < n - 1 ? 4.0 : 2.0) - tmp[i];
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

		/**
		 * The bounding rectangle of the item excluding stroke width.
		 */
		getBounds: function() {
			return calculateBounds(this, 0);
		},

		/**
		 * The bounding rectangle of the item including stroke width.
		 */
		getStrokeBounds: function() {
			var width = this.getStrokeWidth(),
				radius = width / 2,
				join = this.getStrokeJoin(),
				cap = this.getStrokeCap(),
				miter = this.getMiterLimit();
			var bounds = calculateBounds(this, radius);
			// TODO: Handle cap and join
			return bounds;
		},

		/**
		 * The bounding rectangle of the item including handles.
		 */
		getControlBounds: function() {
			// TODO: Implement!
		},

		smooth: function() {
			var segments = this._segments;

			// This code is based on the work by Oleg V. Polikarpotchkin,
			// http://ov-p.spaces.live.com/blog/cns!39D56F0C7A08D703!147.entry
			// It was extended to support closed paths by averaging overlapping
			// beginnings and ends. The result of this approach is very close to
			// Polikarpotchkin's closed curve solution, but reuses the same
			// algorithm as for open paths, and is probably executing faster as
			// well, so it is preferred.
			var size = segments.length;
			if (size <= 2)
				return;

			var n = size;
			// Add overlapping ends for averaging handles in closed paths
			var overlap;
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
				rhs[i] = 4 * knots[i].x + 2 * knots[i + 1].x;
			rhs[0] = knots[0].x + 2 * knots[1].x;
			rhs[n - 1] = 3 * knots[n - 1].x;
			// Get first control points X-values
			var x = getFirstControlPoints(rhs);

			// Set right hand side Y values
			for (var i = 1; i < n - 1; i++)
				rhs[i] = 4 * knots[i].y + 2 * knots[i + 1].y;
			rhs[0] = knots[0].y + 2 * knots[1].y;
			rhs[n - 1] = 3 * knots[n - 1].y;
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
								2 * knots[i + 1].x - x[i + 1],
								2 * knots[i + 1].y - y[i + 1]);
					else
						handleIn = new Point(
								(knots[n].x + x[n - 1]) / 2,
								(knots[n].y + y[n - 1]) / 2);
				}
			}
			if (closed && handleIn) {
				var segment = this._segments[0];
				segment.setHandleIn(handleIn.subtract(segment._point));
			}
		},

		setContextStyles: function(context) {
			for (var i in styles) {
				var style;
				if (style = this[i]()) {
					context[styles[i]] = style;
				}
			}
		}
	};
});
