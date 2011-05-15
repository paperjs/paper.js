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

var DocumentView = this.DocumentView = Base.extend({
	beans: true,

	// TODO: Add bounds parameter that defines position within canvas?
	// Find a good name for these bounds, since #bounds is already the artboard
	// bounds of the visible area.
	initialize: function(canvas) {
		// To go with the convention of never passing document to constructors,
		// in all items, associate the view with the currently active document.
		this._document = paper.document;
		// Push it onto document.views and set index:
		this._index = this._document.views.push(this) - 1;
		// Handle canvas argument
		if (canvas && canvas instanceof HTMLCanvasElement) {
			this._canvas = canvas;
			var offset = DomElement.getOffset(canvas);
			// If the canvas has the resize attribute, resize the it to fill the
			// window and resize it again whenever the user resizes the window.
			if (canvas.attributes.resize) {
				this._size = DomElement.getWindowSize().subtract(offset);
				canvas.width = this._size.width;
				canvas.height = this._size.height;
				var that = this;
				DomEvent.add(window, {
					resize: function(event) {
						// Only get canvas offset if it's not invisible (size is
						// 0, 0), as otherwise the offset would be wrong.
						if (!DomElement.getSize(canvas).equals([0, 0]))
							offset = DomElement.getOffset(canvas);
						that.setSize(DomElement.getWindowSize().subtract(offset));
						that.draw();
					}
				});
			} else {
				this._size = Size.create(
						canvas.offsetWidth, canvas.offsetHeight);
			}
			// TODO: Test this on IE:
			if (canvas.attributes.stats) {
				this._stats = new Stats();
				// Align top-left to the canvas
				var element = this._stats.domElement,
					style = element.style;
				style.position = 'absolute';
				style.left = offset.x + 'px';
				style.top = offset.y + 'px';
				document.body.appendChild(element);
			}
		} else {
			// 2nd argument onwards could be view size, otherwise use default:
			this._size = Size.read(arguments, 1);
			if (this._size.isZero())
				this._size = new Size(1024, 768);
			this._canvas = CanvasProvider.getCanvas(this._size);
		}
		this._context = this._canvas.getContext('2d');
		this._matrix = new Matrix();
		this._zoom = 1;
		this._events = this._createEvents();
		DomEvent.add(this._canvas, this._events);
	},

	getDocument: function() {
		return this._document;
	},

	getSize: function() {
		return LinkedSize.create(this, 'setSize',
				this._size.width, this._size.height);
	},

	setSize: function(size) {
		var old = this._size;
		this._size = Size.read(arguments);
		this._canvas.width = this._size.width;
		this._canvas.height = this._size.height;
		// Call onResize handler on any size change
		if (this.onResize) {
			this.onResize({
				size: this._size,
				delta: this._size.subtract(old)
			});
		}
	},

	getBounds: function() {
		return this._bounds;
	},

	getCenter: function() {
	},

	setCenter: function(center) {
	},

	getZoom: function() {
		return this._zoom;
	},

	setZoom: function(zoom) {
		// TODO: Clamp the view between 1/32 and 64, just like Illustrator?
		var mx = new Matrix();
		mx.scale(zoom / this._zoom, this._center);
		this.transform(mx);
		this._zoom = zoom;
	},

	scrollBy: function(point) {
		this.transform(new Matrix().translate(Point.read(arguments).negate()));
	},

	draw: function() {
		if (this._stats)
			this._stats.update();
		// Initial tests conclude that clearing the canvas using clearRect
		// is always faster than setting canvas.width = canvas.width
		// http://jsperf.com/clearrect-vs-setting-width/7
		this._context.clearRect(0, 0, this._size.width + 1, this._size.height + 1);
		this._document.draw(this._context);
	},

	activate: function() {
		this._document.activeView = this;
	},

	remove: function() {
		var res = Base.splice(this._document.views, null, this._index, 1);
		// Uninstall event handlers again for this view.
		DomEvent.remove(this._canvas, this._events);
		this._document = this._canvas = this._events = null;
		return !!res.length;
	},

	transform: function(matrix, flags) {
		this._matrix.preConcatenate(matrix);
		this._bounds = null;
		this._inverse = null;
	},

	_getInverse: function() {
		if (!this._inverse)
			this._inverse = this._matrix.createInverse();
		return this._inverse;
	},

	// TODO: getInvalidBounds
	// TODO: invalidate(rect)
	// TODO: style: artwork / preview / raster / opaque / ink
	// TODO: getShowGrid
	// TODO: getMousePoint
	// TODO: artworkToView(rect)
	artworkToView: function(point) {
		return this._matrix._transformPoint(Point.read(arguments));
	},

	viewToArtwork: function(point) {
		return this._getInverse()._transformPoint(Point.read(arguments));
	},

	/**
	 * Handler to be called whenever a view gets resized.
	 */
	onResize: null,

	/**
	 * Handler to be called on each frame of an animation.
	 */
	getOnFrame: function() {
		return this._onFrame;
	},

	setOnFrame: function(onFrame) {
		this._onFrame = onFrame;
		var that = this,
			running = false,
			before,
			time = 0,
			count = 0;
		function frame() {
			if (!that._onFrame) {
				running = false;
				return;
			}
			// Set the global paper object to the current scope
			paper = that._document._scope;
			// Request next frame already
			DomEvent.requestAnimationFrame(frame, that._canvas);
			running = true;
			var now = Date.now() / 1000,
			 	delta = before ? now - before : 0;
			that._onFrame({
				delta: delta, // Time elapsed since last redraw in seconds
				time: time += delta, // Time since first call of frame() in seconds
				count: count++
			});
			before = now;
			// Automatically draw view on each frame.
			that.draw();
		};
		// Call the onFrame handler straight away, initializing the sequence
		// of onFrame calls.
		if (!running)
			frame();
	},

	_createEvents: function() {
		var that = this,
			scope = this._document._scope,
			tool,
			timer,
			curPoint,
			dragging = false;

		function viewToArtwork(event) {
			return that.viewToArtwork(DomEvent.getOffset(event));
		}

		function mousedown(event) {
			if (!(tool = scope.tool))
				return;
			curPoint = viewToArtwork(event);
			tool.onHandleEvent('mousedown', curPoint, event);
			if (tool.onMouseDown)
				that.draw();
			if (tool.eventInterval != null)
				timer = setInterval(events.mousemove, tool.eventInterval);
			dragging = true;
		}

		function mousemove(event) {
			if (!(tool = scope.tool))
				return;
			// If the event was triggered by a touch screen device, prevent the
			// default behaviour, as it will otherwise scroll the page:
			if (event && event.targetTouches)
				DomEvent.preventDefault(event);
			var point = event && viewToArtwork(event);
			var onlyMove = !!(!tool.onMouseDrag && tool.onMouseMove);
			if (dragging && !onlyMove) {
				curPoint = point || curPoint;
				if (curPoint)
					tool.onHandleEvent('mousedrag', curPoint, event);
				if (tool.onMouseDrag)
					that.draw();
			// PORT: If there is only an onMouseMove handler, also call it when
			// the user is dragging:
			} else if (!dragging || onlyMove) {
				tool.onHandleEvent('mousemove', point, event);
				if (tool.onMouseMove)
					that.draw();
			}
		}

		function mouseup(event) {
			if (!dragging)
				return;
			dragging = false;
			curPoint = null;
			if (tool) {
				if (tool.eventInterval != null)
					timer = clearInterval(timer);
				tool.onHandleEvent('mouseup', viewToArtwork(event), event);
				if (tool.onMouseUp)
					that.draw();
			}
		}

		return {
			mousedown: mousedown,
			mousemove: mousemove,
			mouseup: mouseup,
			touchstart: mousedown,
			touchmove: mousemove,
			touchend: mouseup
		};
	}
});
