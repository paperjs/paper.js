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

var Layer = this.Layer = Group.extend({
	beans: true,

	initialize: function() {
		this.children = [];
		this._document = paper.document;
		// Push it onto document.layers and set index:
		this._index = this._document.layers.push(this) - 1;
		this.activate();
	},

	/**
	* Removes the layer from its document's layers list
	* or its parent's children list.
	*/
	_removeFromParent: function() {
		return this.parent ? this.base()
			: !!Base.splice(this._document.layers, null, this._index, 1).length;
	},

	getNextSibling: function() {
		return this.parent ? this.base()
				: this._document.layers[this._index + 1] || null;
	},

	getPreviousSibling: function() {
		return this.parent ? this.base()
				: this._document.layers[this._index - 1] || null;
	},

	activate: function() {
		this._document.activeLayer = this;
	}
}, new function () {
	function move(above) {
		return function(item) {
			// if the item is a layer and contained within Document#layers
			if (item instanceof Layer && !item.parent
						&& this._removeFromParent()) {
				Base.splice(item._document.layers, [this],
						item._index + (above ? 1 : -1), 0);
				this._setDocument(item._document);
				return true;
			}
			return this.base(item);
		};
	}

	return {
		moveAbove: move(true),

		moveBelow: move(false)
	};
});
