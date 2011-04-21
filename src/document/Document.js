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
		this._selectedItems = [];
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
	
	draw: function() {
		if (this.canvas) {
			// Initial tests conclude that clearing the canvas using clearRect
			// is always faster than setting canvas.width = canvas.width
			// http://jsperf.com/clearrect-vs-setting-width/7
			this.context.clearRect(0, 0,
					this.size.width + 1, this.size.height + 1);
			this.context.save();
			var param = { offset: new Point(0, 0) };
			for (var i = 0, l = this.layers.length; i < l; i++)
				Item.draw(this.layers[i], this.context, param);
			this.context.restore();

			// Draw the selection of the selected items in the document:
			var selectedItems = this._selectedItems,
				length = selectedItems.length;
			if (length) {
				this.context.strokeWidth = 1;
				// Todo: use Layer#color
				this.context.strokeStyle = this.context.fillStyle = '#4f7aff';
				param = { selection: true };
				for (var i = 0; i < length; i++)
					selectedItems[i].draw(this.context, param);
			}
		}
	},

	redraw: function() {
		this.draw();
	}
});
