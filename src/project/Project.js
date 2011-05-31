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
	/** @lends Project# */

	beans: true,

	// TODO: Add arguments to define pages
	// DOCS: document Project constructor and class
	/**
	 * Creates a Paper.js project
	 *
	 * @name Project
	 * @constructor
	 * 
	 * @class The Project item refers to..
	 * 
	 * The currently active project can be accessed through the global {@code
	 * project} variable.
	 * 
	 * An array of all open projects is accessible through the global {@code
	 * projects} variable.
	 */
	initialize: function() {
		// Store reference to the currently active global paper scope:
		this._scope = paper;
		// Push it onto this._scope.projects and set index:
		this._index = this._scope.projects.push(this) - 1;
		this._currentStyle = PathStyle.create(null);
		this.setCurrentStyle({
			strokeWidth: 1,
			strokeCap: 'butt',
			strokeJoin: 'miter',
			miterLimit: 10,
			dashOffset: 0,
			dashArray: []
		});
		this._selectedItems = {};
		this._selectedItemCount = 0;
		// Activate straight away so paper.project is set, as required by
		// Layer and DoumentView constructors.
		this.activate();
		this.layers = [];
		this.symbols = [];
		this.activeLayer = new Layer();
	},

	/**
	 * The currently active path style. All selected items and newly
	 * created items will be styled with this style.
	 * 
	 * @type PathStyle
	 * @bean
	 * 
	 * @example
	 * project.currentStyle = {
	 * 	fillColor: 'red',
	 * 	strokeColor: 'black',
	 * 	strokeWidth: 5
	 * }
	 * 
	 * // The following path will take over all style properties of
	 * // the current style:
	 * var path = new Path.Circle(new Point(50, 50), 30);
	 * console.log(path.strokeWidth); // 5
	 * 
	 * @example
	 * project.currentStyle.fillColor = 'red';
	 * 
	 * // The following path will take over the fill color we just set:
	 * var path = new Path.Circle(new Point(50, 50), 30);
	 * console.log(path.fillColor); // RGBColor(1, 0, 0)
	 */
	getCurrentStyle: function() {
		return this._currentStyle;
	},

	setCurrentStyle: function(style) {
		// TODO: style selected items with the style:
		this._currentStyle.initialize(style);
	},

	/**
	 * Activates this project, so all newly created items will be placed
	 * in it.
	 */
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
		return !!res.length;
	},

	/**
	 * The index of the project in the global projects array.
	 *
	 * @type Number
	 * @bean
	 */
	getIndex: function() {
		return this._index;
	},

	/**
	 * The selected items contained within the project.
	 *
	 * @type Item[]
	 * @bean
	 */
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

	/**
	 * {@grouptitle Project Hierarchy}
	 * 
	 * The layers contained within the project.
	 *
	 * @name Project#layers
	 * @type Layer[]
	 */

	/**
	 * The layer which is currently active. New items will be created on this
	 * layer by default.
	 *
	 * @name Project#activeLayer
	 * @type Layer
	 */

	/**
	 * The symbols contained within the project.
	 *
	 * @name Project#symbols
	 * @type Symbol[]
	 */

	/**
	 * The views contained within the project.
	 *
	 * @name Project#views
	 * @type View[]
	 */

	/**
	 * The view which is currently active.
	 *
	 * @name Project#activeView
	 * @type View
	 */

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

	/**
	 * @deprecated
	 * @ignore
	 */
	redraw: function() {
		this._scope.view.draw();
	}
});
