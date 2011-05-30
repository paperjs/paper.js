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
	 * @param {Array} [children] An optional array of children that will be
	 * added to the newly created group.
	 * 
	 * @example
	 * // Create an empty group and append a path to the top of its children
	 * // array:
	 * 
	 * // Create an empty group:
	 * var group = new Group();
	 * 
	 * var path = new Path([new Point(10, 10), new Point(50, 50)]);
	 * path.strokeColor = 'black';
	 * 
	 * // Append the path to the group:
	 * group.appendTop(path);
	 * 
	 * // Set the stroke color of all items in the group:
	 * circleGroup.strokeColor = 'black';
	 * 
	 * @example
	 * // Create a group containing two paths:
	 * var circle = new Path.Circle(new Point(30, 50), 10);
	 * var circle2 = new Path.Circle(new Point(50, 50), 10);
	 * 
	 * var circleGroup = new Group([circle, circle2]);
	 * // Set the fill color of all items in the group:
	 * circleGroup.fillColor = 'black';
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
	 * @type Boolean
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
