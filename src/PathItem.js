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
		initialize: function() {
			this.closed = false;
			this.segments = [];//new SegmentList(this);
			this.bounds = new Rectangle();
			for(var i = 0, l = arguments.length; i < l; i++) {
				var segment = new Segment(arguments[i]);
				this.addSegment(segment);
			}
		},

		addSegment: function(segment) {
			segment.path = this;
			this.segments.push(segment);
		},

		add: function() {
			var segment = Segment.read(arguments);
			if(segment)
				this.addSegment(segment);
		},


		moveTo: function() {
			var segment = Segment.read(arguments);
			if(segment && !this.segments.length)
				this.addSegment(segment);
		},

		lineTo: function() {
			var segment = Segment.read(arguments);
			if(segment && this.segments.length)
				this.addSegment(segment);
		},
		
		/**
		 * Adds a cubic bezier curve to the path, defined by two handles and a to
		 * point.
		 */
		cubicCurveTo: function(handle1, handle2, to) {
			// First modify the current segment:
			var current = getCurrentSegment();
			// Convert to relative values:
			current.handleOut.set(
					handle1.x - current.point.x,
					handle1.y - current.point.y);
			// And add the new segment, with handleIn set to c2
			this.segments.push(
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
			var current = this.segments[this.segments.length - 1];
			var x1 = current.point.x;
			var y1 = current.point.y;
			cubicCurveTo(
				handle.add(current.point.subtract(handle).multiply(1/3)),
				handle.add(to.subtract(handle).multiply(1/3)),
				to
			);
		},
		
		curveTo: function(through, to, parameter) {
			through = new Point(through);
			to = new Point(to);
			if(parameter == null)
				parameter = 0.5;
			var current = this.segments[this.segments.length - 1];
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
			if(arguments[1] && typeof arguments[1] != 'boolean') {
				through = new Point(arguments[0]);
				to = new Point(arguments[1]);
			} else {
				if(clockwise === null)
					clockwise = true;
				var current = this.segments[this.segments.length - 1].point;
				var middle = current.add(to).divide(2);
				var step = middle.subtract(current);
				through = clockwise 
						? middle.subtract(-step.y, step.x)
						: middle.add(-step.y, step.x);
			}
			
			// Get the start point:
			var current = this.segments[this.segments.length - 1];
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
					this.segments.push(new Segment(pt, inPoint, out));
				}
				angle += inc;
			}
		},
		
		lineBy: function() {
			var vector = Point.read(arguments);
			if(vector) {
				var current = this.segments[this.segments.length - 1];
				this.lineTo(current.point.add(vector));
			}
		},
		
		smooth: function() {
			var segments = this.segments;
			
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
				var segment = get(0);
				segment.handleIn = handleIn.subtract(segment.point);
			}
		},
		
		curveBy: function(throughVector, toVector, parameter) {
			throughVector = Point.read(throughVector);
			toVector = Point.read(toVector);
			var current = this.segments[this.segments.length - 1].point;
			this.curveTo(current.add(throughVector), current.add(toVector), parameter);
		},
		
		arcBy: function(throughVector, toVector) {
			throughVector = Point.read(throughVector);
			toVector = Point.read(toVector);
			var current = this.segments[this.segments.length - 1].point;
			this.arcBy(current.add(throughVector), current.add(toVector));
		},
		
		setCtxStyles: function(ctx) {
			for(var i in styleNames) {
				var style;
				if(style = this[i])
					ctx[styleNames[i]] = style;
			}
		},
		
		draw: function(ctx) {
			ctx.beginPath();
			var cp1;
			for(var i = 0, l = this.segments.length; i < l; i++) {
				var segment = this.segments[i];
				var point = segment.point;
				var handleIn = segment.handleIn ? segment.handleIn.add(point) : point;
				var handleOut = segment.handleOut ? segment.handleOut.add(point) : point;
				if(i == 0) {
					ctx.moveTo(point.x, point.y);
				} else {
					ctx.bezierCurveTo(cp1.x, cp1.y, handleIn.x, handleIn.y,
						point.x, point.y);
				}
				cp1 = handleOut;
			}
			if(this.closed) {
				var segment = this.segments[0];
				var point = segment.point;
				var handleIn = segment.handleIn ? segment.handleIn.add(point) : point;
				ctx.bezierCurveTo(cp1.x, cp1.y, handleIn.x, handleIn.y,
					point.x, point.y);
				ctx.closePath();
			}
			this.setCtxStyles(ctx);
			if(this.fillColor) ctx.fill();
			if(this.strokeColor) ctx.stroke();
		}
	};
});