var Curve = this.Curve = Base.extend({
	initialize: function(arg0, arg1, arg2, arg3) {
		if (arguments.length == 0) {
			this._segment1 = new Segment();
			this._segment2 = new Segment();
		} else if (arguments.length == 1) {
			// TODO: If beans are not activated, this won't copy from
			// an existing segment. OK?
			this._segment1 = new Segment(arg0.segment1);
			this._segment2 = new Segment(arg0.segment2);
		} else if (arguments.length == 2) {
			if (arg0 instanceof Path) {
				this._path = arg0;
				this._index1 = arg1;
				this._updateSegments();
			} else {
				this._segment1 = new Segment(arg0);
				this._segment2 = new Segment(arg1);
			}
		} else if (arguments.length == 4) {
			this._segment1 = new Segment(arg0, null, arg1);
			this._segment2 = new Segment(arg3, arg2, null);
		}
	},

	_updateSegments: function() {
		if (this._path) {
			this._index2 = this._index1 + 1;
			// A closing curve?
			var segments = this._path._segments;
			if (this._index2 >= segments.length)
				this._index2 = 0;
			this._segment1 = segments[this._index1];
			this._segment2 = segments[this._index2];
		}
	},

	getPath: function() {
		return this._path;
	},

	getIndex: function() {
		return this._index1;
	},

	_setIndex: function(index) {
		if (this._index1 != index) {
			this._index1 = index;
			this._updateSegments();
		}
	},

	/**
	 * The first anchor point of the curve.
	 */
	getPoint1: function() {
		return this._segment1._point;
	},

	setPoint1: function() {
		var point = Point.read(arguments);
		this._segment1._point.set(point.x, point.y);
	},

	/**
	 * The second anchor point of the curve.
	 */
	getPoint2: function() {
		return this._segment2._point;
	},

	setPoint2: function() {
		var point = Point.read(arguments);
		this._segment2._point.set(point.x, point.y);
	},
	
	/**
	 * The handle point that describes the tangent in the first anchor point.
	 */
	getHandle1: function() {
		return this._segment1._handleOut;
	},

	setHandle1: function() {
		var point = Point.read(arguments);
		this._segment1._handleOut.set(point.x, point.y);
	},

	/**
	 * The handle point that describes the tangent in the second anchor point.
	 */
	getHandle2: function() {
		return this._segment2._handleIn;
	},

	setHandle2: function() {
		var point = Point.read(arguments);
		this._segment2._handleIn.set(point.x, point.y);
	},

	/**
	 * The first segment of the curve.
	 */
	getSegment1: function() {
		return this._segment1;
	},

	/**
	 * The second segment of the curve.
	 */
	getSegment2: function() {
		return this._segment2;
	}
});
