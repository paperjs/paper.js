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

var Document = this.Document = Base.extend({
	beans: true,

	// XXX: Add arguments to define pages, but do not pass canvas here
	initialize: function(canvas) {
		// Store reference to the currently active global paper scope:
		this._scope = paper;
		// Push it onto this._scope.documents and set index:
		this._index = this._scope.documents.push(this) - 1;
		// Activate straight away so paper.document is set, as required by
		// Layer and DoumentView constructors.
		this.activate();
		this.layers = [];
		this.views = [];
		this.symbols = [];
		this.activeLayer = new Layer();
		this.activeView = canvas ? new DocumentView(canvas) : null;
		// XXX: Introduce pages and remove Document#bounds!
		var size = this.activeView && this.activeView._size
				|| new Size(1024, 768);
		this._bounds = Rectangle.create(0, 0, size.width, size.height);
		this._selectedItems = {};
		this._selectedItemCount = 0;
		this.setCurrentStyle(null);
	},

	getBounds: function() {
		// TODO: Consider LinkedRectangle once it is required.
		return this._bounds;
	},

	setBounds: function(rect) {
		rect = Rectangle.read(arguments);
		this._bounds.set(rect.x, rect.y, rect.width, rect.height);
	},

	getSize: function() {
		return this._bounds.getSize();
	},
	
	setSize: function(size) {
		// TODO: Once _bounds is a LinkedRectangle, this will recurse
		this._bounds.setSize.apply(this._bounds, arguments); 
	},

	getCurrentStyle: function() {
		return this._currentStyle;
	},

	setCurrentStyle: function(style) {
		this._currentStyle = PathStyle.create(null, style);
	},

	activate: function() {
		if (this._index != null) {
			this._scope.document = this;
			return true;
		}
		return false;
	},

	remove: function() {
		var res = Base.splice(this._scope.documents, null, this._index, 1);
		this._scope = null;
		// Remove all views. This also removes the event handlers installed for
		// then.
		for (var i = this.views.length - 1; i >= 0; i--)
			this.views[i].remove();
		return !!res.length;
	},

	getIndex: function() {
		return this._index;
	},

	getSelectedItems: function() {
		// TODO: return groups if their children are all selected,
		// and filter out their children from the list.
		// TODO: the order of these items should be that of their
		// drawing order.
		var items = [];
		Base.each(this._selectedItems, function(item) {
			items.push(item);
		});
		return items;
	},

	// TODO: implement setSelectedItems?
	
	_selectItem: function(item, select) {
		if (select) {
			this._selectedItemCount++;
			this._selectedItems[item.getId()] = item;
		} else {
			this._selectedItemCount--;
			delete this._selectedItems[item.getId()];
		}
	},
	
	/**
	 * Selects all items in the document.
	 */
	selectAll: function() {
		// TODO: is using for var i in good practice?
		// or should we use Base.each? (JP)
		for (var i = 0, l = this.layers.length; i < l; i++)
			this.layers[i].setSelected(true);
	},

	/**
	 * Deselects all selected items in the document.
	 */
	deselectAll: function() {
		// TODO: is using for var i in good practice?
		// or should we use Base.each? (JP)
		for (var i in this._selectedItems)
			this._selectedItems[i].setSelected(false);
	},
	
	draw: function(ctx) {
		ctx.save();
		var param = { offset: new Point(0, 0) };
		for (var i = 0, l = this.layers.length; i < l; i++)
			Item.draw(this.layers[i], ctx, param);
		ctx.restore();

		// Draw the selection of the selected items in the document:
		if (this._selectedItemCount > 0) {
			ctx.save();
			ctx.strokeWidth = 1;
			// TODO: use Layer#color
			ctx.strokeStyle = ctx.fillStyle = '#009dec';
			param = { selection: true };
			Base.each(this._selectedItems, function(item) {
				item.draw(ctx, param);
			});
			ctx.restore();
		}
	},

	redraw: function() {
		for (var i = 0, l = this.views.length; i < l; i++)
			this.views[i].draw();
	}
});
