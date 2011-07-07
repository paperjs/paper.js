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
HitResult = CurveLocation.extend(/** @lends HitResult# */{
	initialize: function(type, item) {
		this._type = type;
		if (item instanceof CurveLocation) {
			// If a CurveLocation is passed, we can simply copy over values
			// since HitResult is also an instance of CurveLocation.
			this._item = item._curve._path;
			Base.each(item, function(value, key) {
				this[key] = value;
			}, this);
		} else {
			this._item = item;
		}
	},

	statics: {
		/**
		 * Merges default options into options hash for #hitTest() calls, and
		 * marks as merged, to prevent repeated merging in nested calls.
		 *
		 * @private
		 */
		getOptions: function(options) {
			// TODO: Consier moving to HitResult / HitEvent?
			return options && options._merged ? options : Base.merge({
				// Hit the fill of items
				fill: true,
				// Hit the curves of path items, taking into account the stroke
				// width.
				stroke: true,
				// Hit the part of segments that curves pass through
				// (Segment#point)
				// TODO: Shall we call this points?
				segments: true,
				// Only first or last segment hits on path (mutually exclusive
				// with segments: true)
				// TODO: Shall we calls this: endPoints?
				ends: false,
				// Hit the parts of segments that define the curvature
				handles: true,
				//  Hit items that are marked as guides
				guides: false,
				// Only hit selected objects
				selected: false,
				// Type of item, for instanceof check: PathItem, TexItem, etc
				type: Item,
				// Tolerance
				tolerance: 2,
				// Mark as merged, so next time Base.merge isn't called
				_merged: true
			}, options);
		}
	}
});
