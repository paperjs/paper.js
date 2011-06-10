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

var View = this.View = Base.extend({
	/** @lends View# */

	beans: true,

	// DOCS: View: there is alot left to document
	// TODO: Add bounds parameter that defines position within canvas?
	// Find a good name for these bounds, since #bounds is already the artboard
	// bounds of the visible area.
	/**
	 * Creates a view object
	 * @param {Canvas} canvas
	 * @constructs View
	 * 
	 * @class The View object..
	 */
	initialize: function(canvas) {
		// Associate this view with the active paper scope.
		this._scope = paper;
		// Push it onto project.views and set index:
		this._index = this._scope.views.push(this) - 1;
		// Handle canvas argument
		var size;
		if (canvas && canvas instanceof HTMLCanvasElement) {
			this._canvas = canvas;
			var offset = DomElement.getOffset(canvas);
			// If the canvas has the resize attribute, resize the it to fill the
			// window and resize it again whenever the user resizes the window.
			if (canvas.attributes.resize) {
				size = DomElement.getWindowSize().subtract(offset);
				canvas.width = size.width;
				canvas.height = size.height;
				var that = this;
				DomEvent.add(window, {
					resize: function(event) {
						// Only get canvas offset if it's not invisible (size is
						// 0, 0), as otherwise the offset would be wrong.
						if (!DomElement.getSize(canvas).equals([0, 0]))
							offset = DomElement.getOffset(canvas);
						// Set the size now, which internally calls onResize
						that.setViewSize(
								DomElement.getWindowSize().subtract(offset));
						// If there's a _onFrameCallback, call it staight away,
						// but without requesting another animation frame.
						if (that._onFrameCallback) {
							that._onFrameCallback(0, true);
						} else {
							that.draw();
						}
					}
				});
			} else {
				size = Size.create(canvas.offsetWidth, canvas.offsetHeight);
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
			size = Size.read(arguments, 1);
			if (size.isZero())
				size = new Size(1024, 768);
			this._canvas = CanvasProvider.getCanvas(size);
		}
		this._viewBounds = LinkedRectangle.create(this, 'setViewBounds',
				0, 0, size.width, size.height);
		this._context = this._canvas.getContext('2d');
		this._matrix = new Matrix();
		this._zoom = 1;
		this._events = this._createEvents();
		DomEvent.add(this._canvas, this._events);
		// Make sure the first view is focused for keyboard input straight away
		if (!View.focused)
			View.focused = this;
	},

	getCanvas: function() {
		return this._canvas;
	},

	/**
	 * The bounds of the view, i.e. the bounds of the part of the project which
	 * is visible in the window.
	 * 
	 * @type Rectangle
	 * @bean
	 */
	getViewBounds: function() {
		return this._viewBounds;
	},

	setViewBounds: function(bounds) {
		bounds = Rectangle.read(arguments);
		var size = bounds.getSize(),
			delta = size.subtract(this._viewBounds.getSize());
		// TODO: Take into acount bounds.x/y and decide on what grounds to
		// change canvas size. Also, if x/y is not 0, do we need to add that
		// to transform, or is that up to the user?
		this._canvas.width = size.width;
		this._canvas.height = size.height;
		// Call onResize handler on any size change
		if (this.onResize) {
			this.onResize({
				size: size,
				delta: delta
			});
		}
		// Force recalculation
		this._bounds = null;
	},

	/**
	 * @type Size
	 * @bean
	 */
	getViewSize: function() {
		return this._viewBounds.getSize();
	},

	setViewSize: function(size) {
		this._viewBounds.setSize.apply(this._viewBounds, arguments);
	},

	/**
	 * @type Rectangle
	 * @bean
	 */
	getBounds: function() {
		if (!this._bounds)
			this._bounds = this._matrix._transformBounds(this._viewBounds);
		return this._bounds;
	},

	/**
	 * @type Size
	 * @bean
	 */
	getSize: function() {
		return this.getBounds().getSize();
	},

	/**
	 * @type Point
	 * @bean
	 */
	getCenter: function() {
		return this.getBounds().getCenter();
	},

	setCenter: function(center) {
		this.scrollBy(Point.read(arguments).subtract(this.getCenter()));
	},

	/**
	 * @type Number
	 * @bean
	 */
	getZoom: function() {
		return this._zoom;
	},

	setZoom: function(zoom) {
		// TODO: Clamp the view between 1/32 and 64, just like Illustrator?
		this._transform(new Matrix().scale(zoom / this._zoom, this.getCenter()));
		this._zoom = zoom;
	},

	/**
	 * @param {Point} point
	 */
	scrollBy: function(point) {
		this._transform(new Matrix().translate(Point.read(arguments).negate()));
	},

	_transform: function(matrix, flags) {
		this._matrix.preConcatenate(matrix);
		// Force recalculation of these values next time they are requested.
		this._bounds = null;
		this._inverse = null;
	},

	draw: function() {
		if (this._stats)
			this._stats.update();
		// Initial tests conclude that clearing the canvas using clearRect
		// is always faster than setting canvas.width = canvas.width
		// http://jsperf.com/clearrect-vs-setting-width/7
		var ctx =this._context,
			bounds = this._viewBounds;
		ctx.clearRect(bounds._x, bounds._y,
				// TODO: +1... what if we have multiple views in one canvas? 
				bounds._width + 1, bounds._height + 1);

		ctx.save();
		this._matrix.applyToContext(ctx);
		// Just draw the active project for now
		this._scope.project.draw(ctx);
		ctx.restore();
	},

	activate: function() {
		this._scope.view = this;
	},

	remove: function() {
		var res = Base.splice(this._scope.views, null, this._index, 1);
		// Uninstall event handlers again for this view.
		DomEvent.remove(this._canvas, this._events);
		// Clearing _onFrame makes the frame handler stop automatically.
		this._scope = this._canvas = this._events = this._onFrame = null;
		return !!res.length;
	},

	// TODO: getInvalidBounds
	// TODO: invalidate(rect)
	// TODO: style: artwork / preview / raster / opaque / ink
	// TODO: getShowGrid
	// TODO: getMousePoint
	// TODO: artworkToView(rect)

	// TODO: Consider naming these projectToView, viewToProject
	artworkToView: function(point) {
		return this._matrix._transformPoint(Point.read(arguments));
	},

	viewToArtwork: function(point) {
		return this._getInverse()._transformPoint(Point.read(arguments));
	},

	_getInverse: function() {
		if (!this._inverse)
			this._inverse = this._matrix.createInverse();
		return this._inverse;
	},

	/**
	 * {@grouptitle Event Handlers}
	 * Handler function to be called on each frame of an animation.
	 * The function receives an event object which contains information about
	 * the frame event:
	 * 
	 * <b>{@code event.count}</b>: the number of times the frame event was fired.
	 * <b>{@code event.time}</b>: the total amount of time passed since the first frame
	 * event in seconds.
	 * <b>{@code event.delta}</b>: the time passed in seconds since the last frame
	 * event.
	 * 
	 * @example
	 * // Creating an animation:
	 * 
	 * // Create a rectangle shaped path between {x: 20, y: 20}
	 * // and {x: 50, y: 50}:
	 * var path = new Path.Rectangle([20, 20], [50, 50]);
	 * path.fillColor = 'black';
	 * 
	 * function onFrame(event) {
	 * 	// Every frame, rotate the path by 1 degree:
	 * 	path.rotate(1);
	 * }
	 * 
	 * @type function
	 * @bean
	 */
	getOnFrame: function() {
		return this._onFrame;
	},

	setOnFrame: function(onFrame) {
		this._onFrame = onFrame;
		if (!onFrame) {
			delete this._onFrameCallback;
			return;
		}
		var that = this,
			requested = false,
			before,
			time = 0,
			count = 0;
		this._onFrameCallback = function(param, dontRequest) {
			requested = false;
			if (!that._onFrame)
				return;
			// Set the global paper object to the current scope
			paper = that._scope;
			// Request next frame already
			requested = true;
			if (!dontRequest) {
				DomEvent.requestAnimationFrame(that._onFrameCallback,
						that._canvas);
			}
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
		if (!requested)
			this._onFrameCallback();
	},

	/**
	 * Handler function that is called whenever a view is resized.
	 * 
	 * @example
	 * // Repositioning items when a view is resized:
	 * 
	 * // Create a circle shaped path in the center of the view:
	 * var path = new Path.Circle(view.bounds.center, 30);
	 * path.fillColor = 'red';
	 * 
	 * function onResize(event) {
	 * 	// Whenever the view is resized, move the path to its center:
	 * 	path.position = view.center;
	 * }
	 * 
	 * @type function
	 */
	onResize: null,

	_createEvents: function() {
		var that = this,
			tool,
			timer,
			curPoint,
			dragging = false;

		function viewToArtwork(event) {
			return that.viewToArtwork(DomEvent.getOffset(event));
		}

		function mousedown(event) {
			// Tell the Key class which view should receive keyboard input.
			View.focused = that;
			if (!(tool = that._scope.tool))
				return;
			curPoint = viewToArtwork(event);
			tool.onHandleEvent('mousedown', curPoint, event);
			if (tool.onMouseDown)
				that.draw();
			if (tool.eventInterval != null)
				timer = setInterval(mousemove, tool.eventInterval);
			dragging = true;
		}

		function mousemove(event) {
			if (!(tool = that._scope.tool))
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
				if (tool.onMouseDrag && !tool.onFrame)
					that.draw();
			// PORT: If there is only an onMouseMove handler, also call it when
			// the user is dragging:
			} else if (!dragging || onlyMove) {
				tool.onHandleEvent('mousemove', point, event);
				if (tool.onMouseMove && !tool.onFrame)
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
