/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name SegmentPoint
 * @class An internal version of Point that notifies its segment of each change
 * Note: This prototype is not exported.
 *
 * @private
 */
var SegmentPoint = Point.extend({
	set: function(x, y) {
		this._x = x;
		this._y = y;
		this._owner._changed(this);
		return this;
	},

	getX: function() {
		return this._x;
	},

	setX: function(x) {
		this._x = x;
		this._owner._changed(this);
	},

	getY: function() {
		return this._y;
	},

	setY: function(y) {
		this._y = y;
		this._owner._changed(this);
	},

	isZero: function() {
		// Provide our own version of Point#isZero() that does not use the x / y
		// accessors but the internal properties directly, for performance
		// reasons, since it is used a lot internally.
		return this._x == 0 && this._y == 0;
	},

	setSelected: function(selected) {
		this._owner._setSelected(this, selected);
	},

	isSelected: function() {
		return this._owner._isSelected(this);
	},

	statics: {
		create: function(segment, key, pt) {
			var point = new SegmentPoint(SegmentPoint.dont),
				x, y, selected;
			if (!pt) {
				x = y = 0;
			} else if ((x = pt[0]) !== undefined) { // Array-like
				y = pt[1];
			} else {
				// If not Point-like already, read Point from pt = 3rd argument
				if ((x = pt.x) === undefined) {
					pt = Point.read(arguments, 2);
					x = pt.x;
				}
				y = pt.y;
				selected = pt.selected;
			}
			point._x = x;
			point._y = y;
			point._owner = segment;
			// We need to set the point on the segment before copying over the
			// selected state, as otherwise this won't actually select it.
			segment[key] = point;
			if (selected)
				point.setSelected(true);
			return point;
		}
	}
});
