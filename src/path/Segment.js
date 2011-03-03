Segment = Base.extend({
	initialize: function() {
		if (arguments.length == 0) {
			this.point = new Point();
		} else if (arguments.length == 1) {
			if (arguments[0].point) {
				var segment = arguments[0];
				this.point = new Point(segment.point);
				if (segment.handleIn)
					this.handleIn = new Point(segment.handleIn);
				if (segment.handleOut)
					this.handleOut = new Point(segment.handleOut);
			} else {
				this.point = new Point(arguments[0]);
			}
		} else if (arguments.length < 6) {
			if (arguments.length == 2 && !arguments[1].x) {
				this.point = new Point(arguments[0], arguments[1]);
			} else {
				this.point = new Point(arguments[0]);
				if (arguments[1])
					this.handleIn = new Point(arguments[1]);
				if (arguments[2])
					this.handleOut = new Point(arguments[2]);
			}
		} else if (arguments.length == 6) {
			this.point = new Point(arguments[0], arguments[1]);
			this.handleIn = new Point(arguments[2], arguments[3]);
			this.handleOut = new Point(arguments[4], arguments[5]);
		}
		if (!this.handleIn)
			this.handleIn = new Point();
		if (!this.handleOut)
			this.handleOut = new Point();
	},
	
	getPoint: function() {
		return this.point;
	},
	
	setPoint: function() {
		var point = Point.read(arguments);
		this.point = point;
	},
	
	getHandleIn: function() {
		return this.handleIn;
	},
	
	setHandleIn: function() {
		var point = Point.read(arguments);
		this.handleIn = point;
	},

	getHandleOut: function() {
		return this.handleOut;
	},
	
	setHandleOut: function() {
		var point = Point.read(arguments);
		this.handleOut = point;
		this.corner = !handleIn.isParallel(handleOut);
	},
	
	getIndex: function() {
		// TODO: Cache and update indices instead of searching?
		return this.path._segments.indexOf(this);
	},

	getPath: function() {
		return this._path;
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
		var index = this.index;
		return this.path && index < this.path._segments.length - 1
			? this.path._segments[index + 1] : null;
	},
	
	getPrevious: function() {
		return this.path != null && index > 0
			? this.path._segments[this.index - 1] : null;
	},
	
	// TODO:
	// isSelected: function() {
	// 	
	// }
	// 
	// setSelected: function(pt, selected)
	
	reverse: function() {
		return new Segment(this.point, this.handleOut, this.handleIn);
	},
	
	clone: function() {
		return new Segment(this);
	},
	
	remove: function() {
		if (this.path && this.path._segments)
			return this.path._segments.splice(this.index, 1);
		return false;
	},
	
	toString: function() {
		return '{ point: ' + this.point
				+ (this.handleIn ? ', handleIn '+ this.handleIn : '')
				+ (this.handleOut ? ', handleOut ' + this.handleOut : '')
				+ ' }';
	},
	
	statics: {
		read: function(args, index, length) {
			var index = index || 0, length = length || args.length - index;
			if (length == 1 && args[index] instanceof Segment) {
				return args[index];
			} else if (length != 0) {
				var segment = new Segment(Segment.dont);
				segment.initialize.apply(segment, index > 0
						? Array.prototype.slice.call(args, index) : args);
				return segment;
			}
			return null;
		}
	}
});
