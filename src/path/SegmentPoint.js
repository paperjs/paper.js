/**
 * An internal version of Point that notifies its segment of each change
 * Note: This prototype is not exported.
 */
var SegmentPoint = Point.extend({
	beans: true,

	set: function(x, y) {
		this._x = x;
		this._y = y;
		this._segment._changed(this);
		return this;
	},

	getX: function() {
		return this._x;
	},

	setX: function(x) {
		this._x = x;
		this._segment._changed(this);
	},

	getY: function() {
		return this._y;
	},

	setY: function(y) {
		this._y = y;
		this._segment._changed(this);
	},
	
	setSelected: function(selected) {
		this._segment._setSelected(this, selected);
	},
	
	isSelected: function() {
		return this._segment._isSelected(this);
	},
	
	statics: {
		create: function(segment, x, y) {
			if (y === undefined) {
				// Use the normal point constructor to read in point values
				var tmp = new Point(x);
				x = tmp.x;
				y = tmp.y;
			}
			var point = new SegmentPoint(SegmentPoint.dont);
			point._x = x;
			point._y = y;
			point._segment = segment;
			return point;
		}
	}
});
