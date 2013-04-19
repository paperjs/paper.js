/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name Group
 *
 * @class A Group is a collection of items. When you transform a Group, its
 * children are treated as a single unit without changing their relative
 * positions.
 *
 * @extends Item
 */
var Group = this.Group = Item.extend(/** @lends Group# */{
	_class: 'Group',
	_serializeFields: {
		children: []
	},

	// DOCS: document new Group(item, item...);
	/**
	 * Creates a new Group item and places it at the top of the active layer.
	 *
	 * @name Group#initialize
	 * @param {Item[]} [children] An array of children that will be added to the
	 * newly created group.
	 *
	 * @example {@paperscript}
	 * // Create a group containing two paths:
	 * var path = new Path([100, 100], [100, 200]);
	 * var path2 = new Path([50, 150], [150, 150]);
	 *
	 * // Create a group from the two paths:
	 * var group = new Group([path, path2]);
	 *
	 * // Set the stroke color of all items in the group:
	 * group.strokeColor = 'black';
	 *
	 * // Move the group to the center of the view:
	 * group.position = view.center;
	 *
	 * @example {@paperscript height=320}
	 * // Click in the view to add a path to the group, which in turn is rotated
	 * // every frame:
	 * var group = new Group();
	 *
	 * function onMouseDown(event) {
	 * 	// Create a new circle shaped path at the position
	 * 	// of the mouse:
	 * 	var path = new Path.Circle(event.point, 5);
	 * 	path.fillColor = 'black';
	 *
	 * 	// Add the path to the group's children list:
	 * 	group.addChild(path);
	 * }
	 *
	 * function onFrame(event) {
	 * 	// Rotate the group by 1 degree from
	 * 	// the centerpoint of the view:
	 * 	group.rotate(1, view.center);
	 * }
	 */
	/**
	 * Creates a new Group item and places it at the top of the active layer.
	 *
	 * @name Group#initialize
	 * @param {Object} properties An object literal containing properties to be
	 * set on the Group.
	 *
	 * @example {@paperscript}
	 * var path = new Path([100, 100], [100, 200]);
	 * var path2 = new Path([50, 150], [150, 150]);
	 * 
	 * // Create a group from the two paths:
	 * var group = new Group({
	 * 	children: [path, path2],
	 * 	// Set the stroke color of all items in the group:
	 * 	strokeColor: 'black',
	 * 	// Move the group to the center of the view:
	 * 	position: view.center
	 * });
	 */
	initialize: function(arg) {
		this.base();
		// Allow Group to have children and named children
		this._children = [];
		this._namedChildren = {};
		if (arg && !this._set(arg))
			this.addChildren(Array.isArray(arg) ? arg : arguments);
	},

	_changed: function(flags) {
		// Don't use this.base() for reasons of performance.
		Item.prototype._changed.call(this, flags);
		if (flags & (/*#=*/ ChangeFlag.HIERARCHY | /*#=*/ ChangeFlag.CLIPPING)) {
			// Clear cached clip item whenever hierarchy changes
			delete this._clipItem;
		}
	},

	_getClipItem: function() {
		// Allow us to set _clipItem to null when none is found and still return
		// it as a defined value without searching again
		if (this._clipItem !== undefined)
			return this._clipItem;
		for (var i = 0, l = this._children.length; i < l; i++) {
			var child = this._children[i];
			if (child._clipMask)
				return this._clipItem = child;
		}
		// Make sure we're setting _clipItem to null so it won't be searched for
		// nex time.
		return this._clipItem = null;
	},

	/**
	 * Specifies whether the group item is to be clipped.
	 * When setting to {@code true}, the first child in the group is
	 * automatically defined as the clipping mask.
	 *
	 * @type Boolean
	 * @bean
	 * 
	 * @example {@paperscript}
	 * var star = new Path.Star({
	 * 	center: view.center,
	 * 	points: 6,
	 * 	radius1: 20,
	 * 	radius2: 40,
	 * 	fillColor: 'red'
	 * });
	 * 
	 * var circle = new Path.Circle({
	 * 	center: view.center,
	 * 	radius: 25,
	 * 	strokeColor: 'black'
	 * });
	 * 
	 * // Create a group of the two items and clip it:
	 * var group = new Group(circle, star);
	 * group.clipped = true;
	 * 
	 * // Lets animate the circle:
	 * function onFrame(event) {
	 * 	var offset = Math.sin(event.count / 30) * 30;
	 * 	circle.position.x = view.center.x + offset;
	 * }
	 */
	isClipped: function() {
		return !!this._getClipItem();
	},

	setClipped: function(clipped) {
		var child = this.getFirstChild();
		if (child)
			child.setClipMask(clipped);
	},

	_draw: function(ctx, param) {
		var clipItem = this._getClipItem();
		if (clipItem) {
			param.clip = true;
			clipItem.draw(ctx, param);
			param.clip = false;
		}
		for (var i = 0, l = this._children.length; i < l; i++) {
			var item = this._children[i];
			if (item !== clipItem)
				item.draw(ctx, param);
		}
	}
});
