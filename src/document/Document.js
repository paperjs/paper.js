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
		// Store reference to the currently active global paper scope:
		this._scope = paper;
		if (canvas && canvas instanceof HTMLCanvasElement) {
			this.canvas = canvas;
			if (canvas.attributes.resize) {
				// If the canvas has a fullscreen attribute,
				// resize the canvas to fill the window and resize it again
				// whenever the user resizes the window.
				// TODO: set the following styles on the body tag:
				// body {
				//	background: black;
				//	margin: 0;
				//	overflow: hidden;
				// }
				this._size = DomElement.getWindowSize()
						.subtract(DomElement.getOffset(this.canvas));
				this.canvas.width = this._size.width;
				this.canvas.height = this._size.height;
				var that = this;
				var offset = DomElement.getOffset(this.canvas);
				DomEvent.add(window, {
					resize: function(event) {
						// Only get canvas offset if it's not invisible (size is
						// 0, 0), as otherwise the offset would be wrong.
						if (!DomElement.getSize(that.canvas).equals([0, 0]))
							offset = DomElement.getOffset(that.canvas);
						that.setSize(DomElement.getWindowSize().subtract(offset));
						that.redraw();
					}
				});
			} else {
				this._size = Size.create(canvas.offsetWidth, 
						canvas.offsetHeight);
			}
		} else {
			this._size = Size.read(arguments) || new Size(1024, 768);
			this.canvas = CanvasProvider.getCanvas(this._size);
		}
		// TODO: Currently we don't do anything with Document#bounds.
		// What does it mean to change the bounds of the document? (JP)
		this.bounds = Rectangle.create(0, 0, this._size.width,
				this._size.height);
		this.context = this.canvas.getContext('2d');
		// Push it onto this._scope.documents and set index:
		this._index = this._scope.documents.push(this) - 1;
		this.activate();
		this.layers = [];
		this.activeLayer = new Layer();
		this.setCurrentStyle(null);
		this.symbols = [];
		this.activeView = new DocumentView(this);
		this.views = [this.activeView];
		this._selectedItems = {};
		this._selectedItemCount = 0;
		// TODO: Test this on IE:
		if (this.canvas.attributes.stats) {
			this.stats = new Stats();
			// Align top-left to the canvas
			var element = this.stats.domElement,
				style = element.style,
				offset = DomElement.getOffset(this.canvas);
			style.position = 'absolute';
			style.left = offset.x + 'px';
			style.top = offset.y + 'px';
			document.body.appendChild(element);
		}
	},
	
	getSize: function() {
		return this._size;
	},
	
	setSize: function(size) {
		size = Size.read(arguments);
		if (this.canvas) {
			this.canvas.width = size.width;
			this.canvas.height = size.height;
		}
		this._size = size;
		this.bounds.setSize(size); 
	},

	getCurrentStyle: function() {
		return this._currentStyle;
	},

	setCurrentStyle: function(style) {
		this._currentStyle = PathStyle.create(null, style);
	},

	getIndex: function() {
		return this._index;
	},

	activate: function() {
		if (this._index != null) {
			this._scope.document = this;
			return true;
		}
		return false;
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
	
	draw: function() {
		if (this.canvas) {
			if (this.stats)
				this.stats.update();
			var ctx = this.context;
			ctx.save();

			// TODO: Remove dirty rectangle test code once it's actually
			// implemented.
			var testDirtyRects = false;
			if (testDirtyRects) {
				var left = this.size.width / 8,
					top = this.size.height / 8;

				function clear(rect) {
					ctx.clearRect(rect.x, rect.y, rect.width, rect.height);

					if (true) {
						ctx.moveTo(rect.x, rect.y);
						ctx.lineTo(rect.x + rect.width, rect.y);
						ctx.lineTo(rect.x + rect.width, rect.y + rect.height);
						ctx.lineTo(rect.x, rect.y + rect.height);
					}
				}

				ctx.beginPath();

				clear(Rectangle.create(left, top, 2 * left, 2 * top));
				clear(Rectangle.create(3 * left, 3 * top, 2 * left, 2 * top));

//				clear(Rectangle.create(left, top, 4 * left, 4 * top));

				ctx.closePath();
				ctx.clip();
			} else {
				// Initial tests conclude that clearing the canvas using clearRect
				// is always faster than setting canvas.width = canvas.width
				// http://jsperf.com/clearrect-vs-setting-width/7
				ctx.clearRect(0, 0, this.size.width + 1, this.size.height + 1);
			}

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
		}
	},

	redraw: function() {
		this.draw();
	}
});
