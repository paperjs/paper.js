var Segment = this.Segment = Base.extend({
	beans: true,

	initialize: function() {
		if (arguments.length == 0) {
			this._point = new Point();
		} else if (arguments.length == 1) {
			// TODO: If beans are not activated, this won't copy from
			// an existing segment. OK?
			var arg = arguments[0];
			if (arg.point) {
				this._point = new Point(arg.point);
				this._handleIn = new Point(arg.handleIn);
				this._handleOut = new Point(arg.handleOut);
			} else {
				this._point = new Point(arguments[0]);
			}
		} else if (arguments.length < 6) {
			if (arguments.length == 2 && !arguments[1].x) {
				this._point = new Point(arguments[0], arguments[1]);
			} else {
				this._point = new Point(arguments[0]);
				// Doesn't matter if these arguments exist, it creates 0, 0
				// points otherwise
				this._handleIn = new Point(arguments[1]);
				this._handleOut = new Point(arguments[2]);
			}
		} else if (arguments.length == 6) {
			this._point = new Point(arguments[0], arguments[1]);
			this._handleIn = new Point(arguments[2], arguments[3]);
			this._handleOut = new Point(arguments[4], arguments[5]);
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
		this._point = Point.read(arguments);
	},

	getHandleIn: function() {
		return this._handleIn;
	},

	getHandleInIfSet: function() {
		return this._handleIn.x == this._handleIn.y == 0
			? null : this._handleIn;
	},

	setHandleIn: function() {
		this._handleIn = Point.read(arguments);
		// Update corner accordingly
		// this.corner = !this._handleIn.isParallel(this._handleOut);
	},

	getHandleOut: function() {
		return this._handleOut;
	},

	getHandleOutIfSet: function() {
		return this._handleOut.x == this._handleOut.y == 0
			? null : this._handleOut;
	},

	setHandleOut: function() {
		this._handleOut = Point.read(arguments);
		// Update corner accordingly
		// this.corner = !this._handleIn.isParallel(this._handleOut);
	},

	getIndex: function() {
		// TODO: Cache and update indices instead of searching?
		return this.path ? this.path._segments.indexOf(this) : -1;
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
		return this.path && this.path._segments[this.getIndex() + 1] || null;
	},

	getPrevious: function() {
		return this.path && this.path._segments[this.getIndex() - 1] || null;
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
		if (this.path && this.path._segments)
			return !!this.path._segments.splice(this.getIndex(), 1).length;
		return false;
	},

	toString: function() {
		return '{ point: ' + this._point
				+ (this._handleIn ? ', handleIn: ' + this._handleIn : '')
				+ (this._handleOut ? ', handleOut: ' + this._handleOut : '')
				+ ' }';
	}
});
