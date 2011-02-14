PathItem = Item.extend(new function() {
	var styleNames = {
		fillColor: 'fillStyle',
		strokeColor: 'strokeStyle',
		strokeWidth: 'lineWidth',
		strokeJoin: 'lineJoin',
		strokeCap: 'lineCap',
		miterLimit: 'miterLimit'
	};
	
	 /**
	 * Solves a tri-diagonal system for one of coordinates (x or y) of first
	 * bezier control points.
	 * 
	 * @param rhs right hand side vector.
	 * @return Solution vector.
	 */
	var getFirstControlPoints = function(rhs) {
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
	
	return {
		beans: true,

		initialize: function(/* segments */) {
			this.base();
			this.closed = false;
			this._segments = [];
			// Support both passing of segments as array or arguments
			// TODO: Use better isArray check, i.e. the one from
			// http://ejohn.org/blog/ecmascript-5-strict-mode-json-and-more/
			// Or rely on Base.type() in Bootstrap?
			// If it is an array, it can also be a description of a point, so
			// check its first entry for object as well
			var segments = arguments[0];
			if (!segments || segments.length === undefined
					|| typeof segments[0] != 'object')
				segments = arguments;
			for (var i = 0, l = segments.length; i < l; i++)
				this.addSegment(new Segment(segments[i]));
		},

		/**
		 * The segments contained within the path.
		 */
		getSegments: function() {
			return this._segments;
		},

		setSegments: function(segments) {
			this._segments = segments;
		},

		/*
		 * The bounding rectangle of the item excluding stroke width.
		 */
		getBounds: function() {
			// Code ported from:
			// http://blog.hackers-cafe.net/2009/06/how-to-calculate-bezier-curves-bounding.html
			var segments = this._segments;
			var first = segments[0];
			if (!first)
				return null;
			var p0 = first.point, prev = first;
			var min = {
				x: p0.x,
				y: p0.y
			};
			var max = {
				x: p0.x,
				y: p0.y
			}
			var coords = ['x', 'y'];
			function processSegment(segment) {
				var p1 = p0.add(prev.handleOut);
				var p3 = segment.point;
				var p2 = p3.add(segment.handleIn);
				for (var i = 0; i < 2; i++) {
					var coord = coords[i];
					var v0 = p0[coord], v1 = p1[coord],
						v2 = p2[coord], v3 = p3[coord];

					function bounds(value) {
						if (value < min[coord]) {
							min[coord] = value;
						} else if (value > max[coord]) {
							max[coord] = value;
						}
					}
					bounds(v3);

					function f(t) {
						var omt = 1 - t;
						return omt * omt * omt * v0
								+ 3 * omt * omt * t * v1
								+ 3 * omt * t * t * v2
								+ t * t * t * v3;
					}

					var b = 6 * v0 - 12 * v1 + 6 * v2;
					var a = -3 * v0 + 9 * v1 - 9 * v2 + 3 * v3;
					var c = 3 * v1 - 3 * v0;

					if (a == 0) {
						if (b == 0)
						    continue;
						var t = -c / b;
						if (0 < t && t < 1)
							bounds(f(t));
						continue;
					}

					var b2ac = b * b - 4 * c * a;
					if (b2ac < 0)
						continue;
					var t1 = (-b + Math.sqrt(b2ac)) / (2 * a);
					if (0 < t1 && t1 < 1)
						bounds(f(t1));
					var t2 = (-b - Math.sqrt(b2ac)) / (2 * a);
					if (0 < t2 && t2 < 1)
						bounds(f(t2));
				}
				p0 = p3;
				prev = segment;
			}
			for (var i = 1, l = segments.length; i < l; i++)
				processSegment(segments[i]);
			if (this.closed)
				processSegment(first);
		    return new Rectangle(min.x, min.y, max.x - min.x , max.y - min.y);
		},

		transformContent: function(matrix, flags) {
			for (var i = 0, l = this._segments.length; i < l; i++) {
				var segment = this._segments[i];
				// We need to convert handles to absolute coordinates in order
				// to transform them.
				// TODO: Is transformation even required if they are [0, 0]?
				// TODO: Can we optimise this by using the matrix.transform()
				// version that takes arrays as in and output values, and just
				// modifying points rather than producing new ones? This would
				// consume less memory for sure.
				var point = segment.point;
				var handleIn = segment.handleIn.add(point);
				var handleOut = segment.handleOut.add(point);
				point = matrix.transform(point);
				segment.point = point;
				// Convert handles back to relative values after transformation
				segment.handleIn = matrix.transform(handleIn).subtract(point);
				segment.handleOut = matrix.transform(handleOut).subtract(point);
			}
		},

		addSegment: function(segment) {
			segment.path = this;
			this._segments.push(segment);
		},

		add: function() {
			var segment = Segment.read(arguments);
			if (segment)
				this.addSegment(segment);
		},

		insert: function(index, segment) {
			this._segments.splice(index, 0, new Segment(segment));
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
				this.addSegment(segment);
		},

		lineTo: function() {
			var segment = Segment.read(arguments);
			if (segment && this._segments.length)
				this.addSegment(segment);
		},
		
		/**
		 * Adds a cubic bezier curve to the path, defined by two handles and a to
		 * point.
		 */
		cubicCurveTo: function(handle1, handle2, to) {
			// First modify the current segment:
			var current = this.currentSegment;
			// Convert to relative values:
			current.handleOut = new Point(
					handle1.x - current.point.x,
					handle1.y - current.point.y);
			// And add the new segment, with handleIn set to c2
			this.addSegment(
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
			var current = this.currentSegment;
			var x1 = current.point.x;
			var y1 = current.point.y;
			this.cubicCurveTo(
				handle.add(current.point.subtract(handle).multiply(1/3)),
				handle.add(to.subtract(handle).multiply(1/3)),
				to
			);
		},
		
		curveTo: function(through, to, parameter) {
			through = new Point(through);
			to = new Point(to);
			if (parameter == null)
				parameter = 0.5;
			var current = this.currentSegment.point;
			// handle = (through - (1 - t)^2 * current - t^2 * to) / (2 * (1 - t) * t)
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
				var middle = current.point.add(to).divide(2);
				var step = middle.subtract(current.point);
				through = clockwise 
						? middle.subtract(-step.y, step.x)
						: middle.add(-step.y, step.x);
			}
			
			var x1 = current.point.x, x2 = through.x, x3 = to.x;
			var y1 = current.point.y, y2 = through.y, y3 = to.y;

			var f = x3 * x3 - x3 * x2 - x1 * x3 + x1 * x2 + y3 * y3 - y3 * y2
					- y1 * y3 + y1 * y2;
			var g = x3 * y1 - x3 * y2 + x1 * y2 - x1 * y3 + x2 * y3 - x2 * y1;
			var m = g == 0 ? 0 : f / g;

			var c = (m * y2) - x2 - x1 - (m * y1);
			var d = (m * x1) - y1 - y2 - (x2 * m);
			var e = (x1 * x2) + (y1 * y2) - (m * x1 * y2) + (m * x2 * y1);

			var centerX = -c / 2;
			var centerY = -d / 2;
			var radius = Math.sqrt(centerX * centerX + centerY * centerY - e);

			// Note: reversing the Y equations negates the angle to adjust
			// for the upside down coordinate system.
			var angle = Math.atan2(centerY - y1, x1 - centerX);
			var middle = Math.atan2(centerY - y2, x2 - centerX);
			var extent = Math.atan2(centerY - y3, x3 - centerX);

			var diff = middle - angle;
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

			var ext = Math.abs(extent);
			var arcSegs;
			if (ext >= 2 * Math.PI) arcSegs = 4;
			else arcSegs = Math.ceil(ext * 2 / Math.PI);

			var inc = extent;
			if (inc > 2 * Math.PI) inc = 2 * Math.PI;
			else if (inc < -2 * Math.PI) inc = -2 * Math.PI;
			inc /= arcSegs;

			var halfInc = inc / 2;
			var z = 4 / 3 * Math.sin(halfInc) / (1 + Math.cos(halfInc));

			for (var i = 0; i <= arcSegs; i++) {
				var relx = Math.cos(angle);
				var rely = Math.sin(angle);
				var pt = new Point(centerX + relx * radius,
						centerY + rely * radius);
				var out;
				if (i == arcSegs) out = null;
				else out = new Point(centerX + (relx - z * rely) * radius - pt.x,
						centerY + (rely + z * relx) * radius - pt.y);
				if (i == 0) {
					// Modify startSegment
					current.handleOut = out;
				} else {
					// Add new Segment
					var inPoint = new Point(
							centerX + (relx + z * rely) * radius - pt.x,
							centerY + (rely - z * relx) * radius - pt.y);
					this.addSegment(new Segment(pt, inPoint, out));
				}
				angle += inc;
			}
		},
		
		lineBy: function() {
			var vector = Point.read(arguments);
			if (vector) {
				var current = this.currentSegment;
				this.lineTo(current.point.add(vector));
			}
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
				knots[i + overlap] = segments[i].point;
			if (this.closed) {
				// If we're averaging, add the 4 last points again at the beginning,
				// and the 4 first ones at the end.
				for (var i = 0; i < overlap; i++) {
					knots[i] = segments[i + size - overlap].point;
					knots[i + size + overlap] = segments[i].point;
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
				if (handleIn != null)
					segment.handleIn = handleIn.subtract(segment.point);
				if (i < n) {
					segment.handleOut =
							new Point(x[i], y[i]).subtract(segment.point);
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
			if (closed && handleIn != null) {
				var segment = this._segments[0];
				segment.handleIn = handleIn.subtract(segment.point);
			}
		},
		
		curveBy: function(throughVector, toVector, parameter) {
			throughVector = Point.read(throughVector);
			toVector = Point.read(toVector);
			var current = this.currentSegment.point;
			this.curveTo(current.add(throughVector), current.add(toVector), parameter);
		},
		
		arcBy: function(throughVector, toVector) {
			throughVector = Point.read(throughVector);
			toVector = Point.read(toVector);
			var current = this.currentSegment.point;
			this.arcBy(current.add(throughVector), current.add(toVector));
		},
		
		setCtxStyles: function(ctx) {
			for (var i in styleNames) {
				var style;
				if (style = this[i])
					ctx[styleNames[i]] = style;
			}
		},
		
		draw: function(ctx) {
			if (!this.visible) return;
			ctx.beginPath();
			var cp1;
			for (var i = 0, l = this._segments.length; i < l; i++) {
				var segment = this._segments[i];
				var point = segment.point;
				var handleIn = segment.handleIn.add(point);
				var handleOut = segment.handleOut.add(point);
				if (i == 0) {
					ctx.moveTo(point.x, point.y);
				} else {
					ctx.bezierCurveTo(cp1.x, cp1.y, handleIn.x, handleIn.y,
						point.x, point.y);
				}
				cp1 = handleOut;
			}
			if (this.closed && this._segments.length > 1) {
				var segment = this._segments[0];
				var point = segment.point;
				var handleIn = segment.handleIn.add(point);
				ctx.bezierCurveTo(cp1.x, cp1.y, handleIn.x, handleIn.y,
					point.x, point.y);
				ctx.closePath();
			}
			this.setCtxStyles(ctx);
			if (this.fillColor) ctx.fill();
			if (this.strokeColor) ctx.stroke();
		}
	};
});
