/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name View
 *
 * @class The View object wraps a canvas element and handles drawing and user
 * interaction through mouse and keyboard for it. It offer means to scroll the
 * view, find the currently visible bounds in project coordinates, or the
 * center, both useful for constructing artwork that should appear centered on
 * screen.
 */
var View = this.View = PaperScopeItem.extend(/** @lends View# */{
	_list: 'views',
	_reference: 'view',

	/**
	 * Creates a view object
	 * @param {HTMLCanvasElement|String} canvas The canvas object that this
	 * view should wrap, or the String id that represents it
	 */
	initialize: function(canvas) {
		this.base();
		// Handle canvas argument
		var size;

/*#*/ if (options.server) {
		if (canvas && canvas instanceof Canvas) {
			this._canvas = canvas;
			size = Size.create(canvas.width, canvas.height);
		} else {
			// 2nd argument onwards could be view size, otherwise use default:
			size = Size.read(arguments, 1);
			if (size.isZero())
				size = new Size(1024, 768);
			this._canvas = CanvasProvider.getCanvas(size);
		}

		// Generate an id for this view / canvas if it does not have one
		this._id = this._canvas.id;
		if (this._id == null)
			this._canvas.id = this._id = 'canvas-' + View._id++;
/*#*/ } // options.server

/*#*/ if (options.browser) {
		if (typeof canvas === 'string')
			canvas = document.getElementById(canvas);
		if (canvas instanceof HTMLCanvasElement) {
			this._canvas = canvas;
			// If the canvas has the resize attribute, resize the it to fill the
			// window and resize it again whenever the user resizes the window.
			if (PaperScript.hasAttribute(canvas, 'resize')) {
				// Subtract canvas' viewport offset from the total size, to
				// stretch it in
				var offset = DomElement.getOffset(canvas, true),
					that = this;
				size = DomElement.getViewportBounds(canvas)
						.getSize().subtract(offset);
				canvas.width = size.width;
				canvas.height = size.height;
				DomEvent.add(window, {
					resize: function(event) {
						// Only update canvas offset if it's not invisible, as
						// otherwise the offset would be wrong.
						if (!DomElement.isInvisible(canvas))
							offset = DomElement.getOffset(canvas, true);
						// Set the size now, which internally calls onResize
						// and redraws the view
						that.setViewSize(DomElement.getViewportBounds(canvas)
								.getSize().subtract(offset));
					}
				});
			} else {
				size = DomElement.isInvisible(canvas)
					? Size.create(parseInt(canvas.getAttribute('width')),
							parseInt(canvas.getAttribute('height')))
					: DomElement.getSize(canvas);
			}
			// TODO: Test this on IE:
			if (PaperScript.hasAttribute(canvas, 'stats')) {
				this._stats = new Stats();
				// Align top-left to the canvas
				var element = this._stats.domElement,
					style = element.style,
					offset = DomElement.getOffset(canvas);
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
		// Generate an id for this view / canvas if it does not have one
		this._id = this._canvas.getAttribute('id');
		if (this._id == null)
			this._canvas.setAttribute('id', this._id = 'canvas-' + View._id++);
/*#*/ } // options.browser

		// Link this id to our view
		View._views[this._id] = this;
		this._viewSize = LinkedSize.create(this, 'setViewSize',
				size.width, size.height);
		this._context = this._canvas.getContext('2d');
		this._matrix = new Matrix();
		this._zoom = 1;

/*#*/ if (options.browser) {
		this._events = this._createEvents();
		DomEvent.add(this._canvas, this._events);
		// Make sure the first view is focused for keyboard input straight away
		if (!View._focused)
			View._focused = this;
/*#*/ } // options.browser

		// As soon as a new view is added we need to mark the redraw as not
		// motified, so the next call loops through all the views again.
		this._scope._redrawNotified = false;
	},

	/**
	 * Makes this view the active one, meaning {@link PaperScope#view} will
	 * point to it.
	 *
	 * @name View#activate
	 * @function
	 */

 	/**
	 * Removes thsi view from the {@link PaperScope#views} list and frees the
	 * associated canvas.
	 */
	remove: function() {
		if (!this.base())
			return false;
		// Clear focus if removed view had it
		if (View._focused == this)
			View._focused = null;
		delete View._views[this._id];
		// Uninstall event handlers again for this view.
		DomEvent.remove(this._canvas, this._events);
		// Clearing _onFrame makes the frame handler stop automatically.
		this._canvas = this._events = this._onFrame = null;
		return true;
	},

	/**
	 * The underlying native canvas element.
	 *
	 * @type HTMLCanvasElement
	 * @bean
	 */
	getCanvas: function() {
		return this._canvas;
	},

	/**
	 * The size of the view canvas. Changing the view's size will resize it's
	 * underlying canvas.
	 *
	 * @type Size
	 * @bean
	 */
	getViewSize: function() {
		return this._viewSize;
	},

	setViewSize: function(size) {
		size = Size.read(arguments);
		var delta = size.subtract(this._viewSize);
		if (delta.isZero())
			return;
		this._canvas.width = size.width;
		this._canvas.height = size.height;
		// Update _viewSize but don't notify of change.
		this._viewSize.set(size.width, size.height, true);
		// Force recalculation
		this._bounds = null;
		this._redrawNeeded = true;
		// Call onResize handler on any size change
		if (this.onResize) {
			this.onResize({
				size: size,
				delta: delta
			});
		}
		if (this._onFrameCallback) {
			// If there's a _onFrameCallback, call it staight away,
			// but without requesting another animation frame.
			this._onFrameCallback(0, true);
		} else {
			// Otherwise simply redraw the view now
			this.draw(true);
		}
	},

	/**
	 * The bounds of the currently visible area in project coordinates.
	 *
	 * @type Rectangle
	 * @bean
	 */
	getBounds: function() {
		if (!this._bounds)
			this._bounds = this._matrix._transformBounds(
					new Rectangle(new Point(), this._viewSize));
		return this._bounds;
	},

	/**
	 * The size of the visible area in project coordinates.
	 *
	 * @type Size
	 * @bean
	 */
	getSize: function() {
		return this.getBounds().getSize();
	},

	/**
	 * The center of the visible area in project coordinates.
	 *
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
	 * The zoom factor by which the project coordinates are magnified.
	 *
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
	 * Checks whether the view is currently visible within the current browser
	 * viewport.
	 *
	 * @return {Boolean} Whether the view is visible.
	 */
	isVisible: function() {
		// TODO: Take bounds into account if it's not the full canvas?
		return DomElement.isVisible(this._canvas);
	},

	/**
	 * Scrolls the view by the given vector.
	 *
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

	/**
	 * Draws the view.
	 *
	 * @name View#draw
	 * @function
	 */
	draw: function(checkRedraw) {
		if (checkRedraw && !this._redrawNeeded)
			return false;
		if (this._stats)
			this._stats.update();
		// Initial tests conclude that clearing the canvas using clearRect
		// is always faster than setting canvas.width = canvas.width
		// http://jsperf.com/clearrect-vs-setting-width/7
		var ctx = this._context,
			size = this._viewSize;
		ctx.clearRect(0, 0, size._width + 1, size._height + 1);

		ctx.save();
		this._matrix.applyToContext(ctx);
		// Just draw the active project for now
		this._scope.project.draw(ctx);
		ctx.restore();
		if (this._redrawNeeded) {
			this._redrawNeeded = false;
			// Update _redrawNotified in PaperScope as soon as a view was drawn
			this._scope._redrawNotified = false;
		}
		return true;
	},

	// TODO: getInvalidBounds
	// TODO: invalidate(rect)
	// TODO: style: artwork / preview / raster / opaque / ink
	// TODO: getShowGrid
	// TODO: getMousePoint
	// TODO: projectToView(rect)

	projectToView: function(point) {
		return this._matrix._transformPoint(Point.read(arguments));
	},

	viewToProject: function(point) {
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
	 * @example {@paperscript}
	 * // Creating an animation:
	 *
	 * // Create a rectangle shaped path with its top left point at:
	 * // {x: 50, y: 25} and a size of {width: 50, height: 50}
	 * var path = new Path.Rectangle(new Point(50, 25), new Size(50, 50));
	 * path.fillColor = 'black';
	 *
	 * function onFrame(event) {
	 * 	// Every frame, rotate the path by 3 degrees:
	 * 	path.rotate(3);
	 * }
	 *
	 * @type Function
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
/*#*/ if (options.browser) {
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
			// Use Base.merge to convert into a Base object, for #toString()
			that._onFrame(Base.merge({
				delta: delta, // Time elapsed since last redraw in seconds
				time: time += delta, // Time since first call of frame() in seconds
				count: count++
			}));
			before = now;
			// Automatically draw view on each frame.
			that.draw(true);
		};
		// Call the onFrame handler straight away, initializing the sequence
		// of onFrame calls.
		if (!requested)
			this._onFrameCallback();
/*#*/ } // options.browser
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
	 * @type Function
	 */
	onResize: null
}, {
	statics: {
		_views: {},
		_id: 0
	}
}, new function() { // Injection scope for mouse handlers
/*#*/ if (options.browser) {
	var tool,
		timer,
		curPoint,
		tempFocus,
		dragging = false;

	function viewToProject(view, event) {
		return view.viewToProject(DomEvent.getOffset(event, view._canvas));
	}

	function updateFocus() {
		if (!View._focused || !View._focused.isVisible()) {
			// Find the first visible view in all scopes
			PaperScope.each(function(scope) {
				for (var i = 0, l = scope.views.length; i < l; i++) {
					var view = scope.views[i];
					if (view.isVisible()) {
						View._focused = tempFocus = view;
						throw Base.stop;
					}
				}
			});
		}
	}

	function mousemove(event) {
		var view;
		if (!dragging) {
			// See if we can get the view from the current event target, and
			// handle the mouse move over it.
		 	view = View._views[DomEvent.getTarget(event).getAttribute('id')];
			if (view) {
				// Temporarily focus this view without making it sticky, so
				// Key events are handled too during the mouse over
				View._focused = tempFocus = view;
			} else if (tempFocus && tempFocus == View._focused) {
				// Clear temporary focus again and update it.
				View._focused = null;
				updateFocus();
			}
		}
		if (!(view = view || View._focused) || !(tool = view._scope.tool))
			return;
		var point = event && viewToProject(view, event);
		var onlyMove = !!(!tool.onMouseDrag && tool.onMouseMove);
		if (dragging && !onlyMove) {
			curPoint = point || curPoint;
			if (curPoint && tool.onHandleEvent('mousedrag', curPoint, event)) {
				view.draw(true);
				DomEvent.stop(event);
			}
		// PORT: If there is only an onMouseMove handler, also call it when
		// the user is dragging:
		} else if ((!dragging || onlyMove)
				&& tool.onHandleEvent('mousemove', point, event)) {
			view.draw(true);
			DomEvent.stop(event);
		}
	}

	function mouseup(event) {
		var view = View._focused;
		if (!view || !dragging)
			return;
		dragging = false;
		curPoint = null;
		if (tool) {
			if (timer != null)
				timer = clearInterval(timer);
			if (tool.onHandleEvent('mouseup', viewToProject(view, event), event)) {
				view.draw(true);
				DomEvent.stop(event);
			}
		}
	}

	function selectstart(event) {
		// Only stop this even if we're dragging already, since otherwise no
		// text whatsoever can be selected on the page.
		if (dragging)
			DomEvent.stop(event);
	}

	// mousemove and mouseup events need to be installed on document, not the
	// view canvas, since we want to catch the end of drag events even outside
	// our view. Only the mousedown events are installed on the view, as handled
	// by _createEvents below.

	DomEvent.add(document, {
		mousemove: mousemove,
		mouseup: mouseup,
		touchmove: mousemove,
		touchend: mouseup,
		selectstart: selectstart,
		scroll: updateFocus
	});

	DomEvent.add(window, {
		load: updateFocus
	});

	return {
		_createEvents: function() {
			var view = this;

			function mousedown(event) {
				// Tell the Key class which view should receive keyboard input.
				View._focused = view;
				if (!(tool = view._scope.tool))
					return;
				curPoint = viewToProject(view, event);
				if (tool.onHandleEvent('mousedown', curPoint, event))
					view.draw(true);
				if (tool.eventInterval != null)
					timer = setInterval(mousemove, tool.eventInterval);
				dragging = true;
			}

			return {
				mousedown: mousedown,
				touchstart: mousedown,
				selectstart: selectstart
			};
		},

		statics: {

			/**
			 * Loops through all scopes and their views and sets the focus on
			 * the first active one.
			 */
			updateFocus: updateFocus
		}
	};
/*#*/ } // options.browser
}, new function() {
/*#*/ if (options.server) {
	var path = require('path');
	// Utility function that converts a number to a string with
	// x amount of padded 0 digits:
	function toPaddedString(number, length) {
		var str = number.toString(10);
		for (var i = 0, l = length - str.length; i < l; i++) {
			str = '0' + str;
		}
		return str;
	}
	return {
		// DOCS: View#exportFrames(param);
		exportFrames: function(param) {
			param = Base.merge({
				fps: 30,
				prefix: 'frame-',
				amount: 1
			}, param);
			if (!param.directory) {
				throw new Error('Missing param.directory');
			}
			var view = this,
				count = 0,
				frameDuration = 1 / param.fps,
				lastTime = startTime = Date.now();

			// Start exporting frames by exporting the first frame:
			exportFrame(param);

			function exportFrame(param) {
				count++;
				var filename = param.prefix + toPaddedString(count, 6) + '.png',
					uri = param.directory + '/' + filename;
				var out = view.exportImage(uri, function() {
					// When the file has been closed, export the next fame:
					var then = Date.now();
					if (param.onProgress) {
						param.onProgress({
							count: count,
							amount: param.amount,
							percentage: Math.round(count / param.amount
									* 10000) / 100,
							time: then - startTime,
							delta: then - lastTime
						});
					}
					lastTime = then;
					if (count < param.amount) {
						exportFrame(param);
					} else {
						// Call onComplete handler when finished:
						if (param.onComplete) {
							param.onComplete();
						}
					}
				});
				if (view.onFrame) {
					view.onFrame({
						delta: frameDuration,
						time: frameDuration * count,
						count: count
					});
				}
			}
		},
		// DOCS: View#exportImage(uri, callback);
		exportImage: function(uri, callback) {
			this.draw();
			// TODO: is it necessary to resolve the path?
			var out = fs.createWriteStream(path.resolve(__dirname, uri)),
				stream = this._canvas.createPNGStream();
			// Pipe the png stream to the write stream:
			stream.pipe(out);
			if (callback) {
				out.on('close', callback);
			}
			return out;
		}
	};
/*#*/ } // options.server
});
