var Segment = this.Segment = Base.extend({
	beans: true,

	initialize: function(arg0, arg1, arg2, arg3, arg4, arg5) {
		if (arguments.length == 0) {
			this._point = new Point();
		} else if (arguments.length == 1) {
			// TODO: If beans are not activated, this won't copy from
			// an existing segment. OK?
			if (arg0.point) {
				this._point = new Point(arg0.point);
				this._handleIn = new Point(arg0.handleIn);
				this._handleOut = new Point(arg0.handleOut);
			} else {
				this._point = new Point(arg0);
			}
		} else if (arguments.length < 6) {
			if (arguments.length == 2 && !arg1.x) {
				this._point = new Point(arg0, arg1);
			} else {
				this._point = new Point(arg0);
				// Doesn't matter if these arguments exist, it creates 0, 0
				// points otherwise
				this._handleIn = new Point(arg1);
				this._handleOut = new Point(arg2);
			}
		} else if (arguments.length == 6) {
			this._point = new Point(arg0, arg1);
			this._handleIn = new Point(arg2, arg3);
			this._handleOut = new Point(arg4, arg5);
		}
		if (!this._handleIn)
			this._handleIn = new Point();
		if (!this._handleOut)
			this._handleOut = new Point();
	},

	getPoint: function() {
		return this._point;
	},

	setPoint: function() {
		// Do not replace the internal object but update it instead, so
		// references to it are kept alive.
		var point = Point.read(arguments);
		this._point.set(point.x, point.y);
	},

	getHandleIn: function() {
		return this._handleIn;
	},

	setHandleIn: function() {
		// See #setPoint:
		var point = Point.read(arguments);
		this._handleIn.set(point.x, point.y);
		// Update corner accordingly
		// this.corner = !this._handleIn.isParallel(this._handleOut);
	},

	getHandleInIfSet: function() {
		return this._handleIn.x == 0 && this._handleIn.y == 0
			? null : this._handleIn;
	},

	getHandleOut: function() {
		return this._handleOut;
	},

	setHandleOut: function() {
		// See #setPoint:
		var point = Point.read(arguments);
		this._handleOut.set(point.x, point.y);
		// Update corner accordingly
		// this.corner = !this._handleIn.isParallel(this._handleOut);
	},

	getHandleOutIfSet: function() {
		return this._handleOut.x == 0 && this._handleOut.y == 0
			? null : this._handleOut;
	},

	getIndex: function() {
		// TODO: Cache and update indices instead of searching?
		return this._path ? this._path._segments.indexOf(this) : -1;
	},

	getPath: function() {
		return this._path;
	},

	getCurve: function() {
		if (this._path != null) {
			var index = this.getIndex();
			// The last segment of an open path belongs to the last curve
			// TODO: Port back to Scriptographer
			if (!this._path.closed && index == this._path._segments.length - 1)
				index--;
			return this._path.getCurves()[index];
		}
		return null;
	},

	getNext: function() {
		return this._path && this._path._segments[this.getIndex() + 1] || null;
	},

	getPrevious: function() {
		return this._path && this._path._segments[this.getIndex() - 1] || null;
	},

	// TODO:
	// isSelected: function() {
	// 
	// }
	// 
	// setSelected: function(pt, selected)

	reverse: function() {
		return new Segment(this._point, this._handleOut, this._handleIn);
	},

	clone: function() {
		return new Segment(this);
	},

	remove: function() {
		if (this._path && this._path._segments)
			return !!this._path._segments.splice(this.getIndex(), 1).length;
		return false;
	},

	toString: function() {
		return '{ point: ' + this._point
				+ (!this._handleIn.isZero()
					? ', handleIn: ' + this._handleIn : '')
				+ (this._handleOut.isZero()
					? ', handleOut: ' + this._handleOut : '')
				+ ' }';
	},

	_transformCoordinates: function(matrix, coords, change) {
		// Use matrix.transform version() that takes arrays of multiple
		// points for largely improved performance, as no calls to
		// Point.read() and Point constructors are necessary.
		var point = this._point,
			// If a matrix is defined, only transform handles if they are set.
			// This saves some computation time. If no matrix is set, always
			// use the real handles, as we just want to receive a filled 
			// coords array for _calculateBounds().
			handleIn =  matrix && this.getHandleInIfSet() || this._handleIn,
			handleOut = matrix && this.getHandleOutIfSet() || this._handleOut,
			x = point.x,
			y = point.y;
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
		if (matrix) {
			matrix.transform(coords, 0, coords, 0, index / 2);
			x = coords[0];
			y = coords[1];
			if (change) {
				// If change is true, we need to set the new values back
				point.x = x;
				point.y = y;
				index  = 2;
				if (handleIn) {
					handleIn.x = coords[index++] - x;
					handleIn.y = coords[index++] - y;
				}
				if (handleOut) {
					handleOut.x = coords[index++] - x;
					handleOut.y = coords[index++] - y;
				}
			} else {
				// We want to receive the results in coords, so make sure
				// handleIn and out are defined too, even if they're 0
				if (!handleIn) {
					coords[index++] = x;
					coords[index++] = y;
				}
				if (!handleOut) {
					coords[index++] = x;
					coords[index++] = y;
				}
			}
		}
	}
});
