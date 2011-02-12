Segment = Base.extend({
	initialize: function() {
		if(arguments.length == 0) {
			this.point = new Point();
		} else if(arguments.length == 1) {
			if(arguments[0].point) {
				var segment = arguments[0];
				this.point = new Point(segment.point);
				if(segment.handleIn)
					this.handleIn = new Point(segment.handleIn);
				if(segment.handleOut)
					this.handleOut = new Point(segment.handleOut);
			} else {
				this.point = new Point(arguments[0]);
			}
		} else if(arguments.length < 6) {
			if(arguments.length == 2 && !arguments[1].x) {
				this.point = new Point(arguments[0], arguments[1]);
			} else {
				this.point = new Point(arguments[0]);
				if(arguments[1])
					this.handleIn = new Point(arguments[1]);
				if(arguments[2])
					this.handleOut = new Point(arguments[2]);
			}
		} else if(arguments.length == 6) {
			this.point = new Point(arguments[0], arguments[1]);
			this.handleIn = new Point(arguments[2], arguments[3]);
			this.handleOut = new Point(arguments[4], arguments[5]);
		} 
	},
	
	// TODO:
	// insert: function() {
	// 	if(this.segments && this.segments.path) {
	// 		var path = this.segments.path;
	// 		path.checkValid();
	// 		
	// 	}
	// },
	
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
		var segments = this.path.segments;
		for(var i = 0, l = segments.length; i < l; i++) {
			if(segments[i] == this)
				return i;
		}
	},

	getPath: function() {
		return this._path;
	},
	
	// todo
	// getCurve: function() {
	// 	if(this.segments && this.segments.path) {
	// 		var curves = this.segments.path.getCurves();
	// 		// The curves list handles closing curves, so the curves.size
	// 		// is adjusted accordingly. just check to be in the boundaries here:
	// 		return index < curves.length ? curves[index] : null;
	// 	}
	// },
	
	getNext: function() {
		var index = this.index;
		return this.path && index < this.path.segments.length - 1
			? this.path.segments[index + 1] : null;
	},
	
	getPrevious: function() {
		return this.path != null && index > 0 ? this.segments[this.index - 1] : null;
	},
	
	// todo
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
		if(this.segments)
			return this.path.segments.unshift(this.index, 1);
		return false;
	},
	
	toString: function() {
		return '{ point: ' + this.point.toString()
				+ ', handleIn '+ this.handleIn.toString()
				+ ', handleOut ' + this.handleOut.toString()
				+ ' }';
	},
	
	statics: {
		read: function(args) {
			if(args.length && args[0] != null) {
				var segment = new Segment();
				segment.initialize.apply(segment, args);
				return segment;
			}
		}
	}
})