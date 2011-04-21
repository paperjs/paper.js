/**
 * An internal version of Point that notifies its segment of each change
 * Note: This prototype is not exported.
 */
var SegmentPoint = Point.extend({
	beans: true,

	set: function(x, y) {
		this._x = x;
		this._y = y;
//		this._segment._markDirty(DirtyFlags.BOUNDS);
		return this;
	},

	getX: function() {
		return this._x;
	},

	setX: function(x) {
		this._x = x;
//		this._segment._markDirty(DirtyFlags.BOUNDS);
	},

	getY: function() {
		return this._y;
	},

	setY: function(y) {
		this._y = y;
//		this._segment._markDirty(DirtyFlags.BOUNDS);
	},
	
	setSelected: function(selected) {
		this._segment.setSelected(this, selected);
	},
	
	getSelected: function() {
		return this._segment.getSelected(this);
	},
	
	statics: {
		create: function(segment, arg1, arg2) {
			var point;
			if (arguments.length == 2) {
				point = new SegmentPoint(arg1);
			} else {
				point = new SegmentPoint(SegmentPoint.dont);
				point._x = arg1;
				point._y = arg2;
			}
			point._segment = segment;
			return point;
		}
	}
});
