/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * All rights reserved.
 */

var Group = this.Group = Item.extend({
	/** @lends Group# */

	beans: true,

	/**
	 * Creates a new Group item and places it at the top of the active layer.
	 * 
	 * @example
	 * // Create an empty group:
	 * var group = new Group();
	 * // Append a path to the group:
	 * var line = new Path.Line(new Point(10, 10), new Point(50, 50));
	 * group.appendTop(line);
	 * 
	 * // Create a group containing a path:
	 * var circle = new Path.Circle(new Point(10, 10), 100);
	 * var circleGroup = new Group([circle]);
	 * 
	 * @param {array} [children] An optional array of children that will be
	 * added to the newly created group.
	 * 
	 * @class A Group is a collection of items. When you transform a Group, its
	 * children are treated as a single unit without changing their relative
	 * positions.
	 * @extends Item
	 * @constructs Group
	 */
	initialize: function(items) {
		this.base();
		this._children = [];
		this._namedChildren = {};
		this._clipped = false;
		this.setChildren(!items || !Array.isArray(items)
				|| typeof items[0] !== 'object' ? arguments : items);
	},

	clone: function() {
		var copy = this.base();
		copy._clipped = this._clipped;
		return copy;
	},

	/**
	 * Specifies whether the group item is to be clipped.
	 * When setting to true, the first child in the group is automatically
	 * defined as the clipping mask.
	 *
	 * @type boolean
	 * @bean
	 */
	isClipped: function() {
		return this._clipped;
	},

	setClipped: function(clipped) {
		this._clipped = clipped;
		var child = this.getFirstChild();
		if (child)
			child.setClipMask(clipped);
	},

	draw: function(ctx, param) {
		for (var i = 0, l = this._children.length; i < l; i++) {
			Item.draw(this._children[i], ctx, param);
			if (this._clipped && i == 0)
				ctx.clip();
		}
	}
});
