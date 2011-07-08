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
 * @name HitResult
 *
 * @class
 *
 * @extends CurveLocation
 */
HitResult = Base.extend(/** @lends HitResult# */{
	initialize: function(type, item, location) {
		this.type = type;
		this.item = item;
		if (location)
			this.location = location;
	},

	statics: {
		/**
		 * Merges default options into options hash for #hitTest() calls, and
		 * marks as merged, to prevent repeated merging in nested calls.
		 *
		 * @private
		 */
		getOptions: function(point, options) {
			// TODO: Consier moving to HitResult / HitEvent?
			return options && options._merged ? options : Base.merge({
				// Use the converted options object to perform point conversion
				// only once.
				point: Point.read(arguments, 0, 1),
				// Type of item, for instanceof check: PathItem, TexItem, etc
				type: Item,
				// Tolerance
				tolerance: 2,
				// Hit the fill of items
				fill: true,
				// Hit the curves of path items, taking into account the stroke
				// width.
				stroke: true,
				// Hit the part of segments that curves pass through, excluding
				// its segments (Segment#point)
				segments: true,
				// Hit the parts of segments that define the curvature
				handles: true,
				// Only first or last segment hits on path (mutually exclusive
				// with segments: true)
				ends: false,
				// Hit test the center of the bounds
				center: false,
				// Hit test the corners and side-centers of the boudning box
				bounds: false,
				//  Hit items that are marked as guides
				guides: false,
				// Only hit selected objects
				selected: false,
				// Mark as merged, so next time Base.merge isn't called
				_merged: true
			}, options);
		}
	}
});
