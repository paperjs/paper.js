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

	initialize: function(canvas) {
		if (canvas && canvas instanceof HTMLCanvasElement) {
			this.canvas = canvas;
			this.size = new Size(canvas.offsetWidth, canvas.offsetHeight);
		} else {
			this.size = Size.read(arguments) || new Size(1024, 768);
			this.canvas = document.createElement('canvas');
			this.canvas.width = this.size.width;
			this.canvas.height = this.size.height;
		}
		this.bounds = new Rectangle(new Point(0, 0), this.size);
		this.context = this.canvas.getContext('2d');
		paper.documents.push(this);
		this.activate();
		this.layers = [];
		this.activeLayer = new Layer();
		this.setCurrentStyle(null);
		this.symbols = [];
		this.views = [new DocumentView(this)];
		this.activeView = this.views[0];
		this._selectedItems = {};
		this._selectedItemCount = 0;
	},

	getCurrentStyle: function() {
		return this._currentStyle;
	},

	setCurrentStyle: function(style) {
		this._currentStyle = new PathStyle(this, style);
	},

	activate: function() {
		var index = paper.documents.indexOf(this);
		if (index != -1) {
			paper.document = this;
			return true;
		}
		return false;
	},
	
	getSelectedItems: function() {
		// TODO: return groups if their children are all selected,
		// and filter out their children from the list.
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
	
	draw: function() {
		if (this.canvas) {
			var context = this.context;
			// Initial tests conclude that clearing the canvas using clearRect
			// is always faster than setting canvas.width = canvas.width
			// http://jsperf.com/clearrect-vs-setting-width/7
			context.clearRect(0, 0,
					this.size.width + 1, this.size.height + 1);
			context.save();
			var param = { offset: new Point(0, 0) };
			for (var i = 0, l = this.layers.length; i < l; i++)
				Item.draw(this.layers[i], context, param);
			context.restore();

			// Draw the selection of the selected items in the document:
			if (this._selectedItemCount > 0) {
				context.save();
				context.strokeWidth = 1;
				// Todo: use Layer#color
				context.strokeStyle = context.fillStyle = '#4f7aff';
				param = { selection: true };
				Base.each(this._selectedItems, function(item) {
					item.draw(context, param);
				});
				context.restore();
			}
		}
	},

	redraw: function() {
		this.draw();
	}
});
