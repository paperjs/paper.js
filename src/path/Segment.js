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

	getPath: function() {
		return this._path;
	},

	getIndex: function() {
		// TODO: Cache and update indices instead of searching?
		return this._path ? this._path._segments.indexOf(this) : -1;
	},

	// TODO:
	// getCurve: function() {
	// 	if (this._segments && this._segments.path) {
	// 		var curves = this._segments.path.getCurves();
	// 		// The curves list handles closing curves, so the curves.size
	// 		// is adjusted accordingly. just check to be in the boundaries here:
	// 		return index < curves.length ? curves[index] : null;
	// 	}
	// },

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
	}
});
