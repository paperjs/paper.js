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

var Project = this.Project = Base.extend({
	beans: true,

	// XXX: Add arguments to define pages, but do not pass canvas here
	initialize: function(canvas) {
		// Store reference to the currently active global paper scope:
		this._scope = paper;
		// Push it onto this._scope.projects and set index:
		this._index = this._scope.projects.push(this) - 1;
		// Activate straight away so paper.project is set, as required by
		// Layer and DoumentView constructors.
		this.activate();
		this.layers = [];
		this.views = [];
		this.symbols = [];
		this.activeLayer = new Layer();
		this.activeView = canvas ? new ProjectView(canvas) : null;
		this._selectedItems = {};
		this._selectedItemCount = 0;
		this._currentStyle = PathStyle.create(null);
	},

	getCurrentStyle: function() {
		return this._currentStyle;
	},

	setCurrentStyle: function(style) {
		this._currentStyle.initialize(style);
	},

	activate: function() {
		if (this._index != null) {
			this._scope.project = this;
			return true;
		}
		return false;
	},

	remove: function() {
		var res = Base.splice(this._scope.projects, null, this._index, 1);
		this._scope = null;
		// Remove all views. This also removes the installed event handlers.
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
	 * Selects all items in the project.
	 */
	selectAll: function() {
		// TODO: is using for var i in good practice?
		// or should we use Base.each? (JP)
		for (var i = 0, l = this.layers.length; i < l; i++)
			this.layers[i].setSelected(true);
	},

	/**
	 * Deselects all selected items in the project.
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

		// Draw the selection of the selected items in the project:
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
