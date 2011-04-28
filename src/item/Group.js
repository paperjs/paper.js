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
	beans: true,

	initialize: function(items) {
		this.base();
		this.children = [];
		if (items) {
			for (var i = 0, l = items.length; i < l; i++) {
				this.appendTop(items[i]);
			}
		}
		this.setClipped(false);
	},

	/**
	 * Specifies whether the group item is to be clipped.
	 * When setting to true, the first child in the group is automatically
	 * defined as the clipping mask.
	 *
	 * Sample code:
	 * <code>
	 * var group = new Group();
	 * group.appendChild(path);
	 * group.clipped = true;
	 * </code>
	 * @return {@true if the group item is to be clipped}
	 */
	isClipped: function() {
		return this._clipped;
	},

	setClipped: function(clipped) {
		this._clipped = clipped;
		var child = this.firstChild;
		if (child)
			child.setClipMask(clipped);
	},

	draw: function(ctx, param) {
		for (var i = 0, l = this.children.length; i < l; i++) {
			Item.draw(this.children[i], ctx, param);
			if (this._clipped && i == 0)
				ctx.clip();
		}
	}
});
