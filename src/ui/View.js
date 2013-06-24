/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name View
 *
 * @class The View object wraps an HTML element and handles drawing and user
 * interaction through mouse and keyboard for it. It offer means to scroll the
 * view, find the currently visible bounds in project coordinates, or the
 * center, both useful for constructing artwork that should appear centered on
 * screen.
 */
var View = Base.extend(Callback, /** @lends View# */{
	_class: 'View',

	initialize: function View(element) {
		// Store reference to the currently active global paper scope, and the
		// active project, which will be represented by this view
		this._scope = paper;
		this._project = paper.project;
		this._element = element;
		var size;
/*#*/ if (options.browser) {
		// Generate an id for this view / element if it does not have one
		this._id = element.getAttribute('id');
		if (this._id == null)
			element.setAttribute('id', this._id = 'view-' + View._id++);
		// Install event handlers
		DomEvent.add(element, this._viewHandlers);
		// If the element has the resize attribute, resize the it to fill the
		// window and resize it again whenever the user resizes the window.
		if (PaperScope.hasAttribute(element, 'resize')) {
			// Subtract element' viewport offset from the total size, to
			// stretch it in
			var offset = DomElement.getOffset(element, true),
				that = this;
			size = DomElement.getViewportBounds(element)
					.getSize().subtract(offset);
			this._windowHandlers = {
				resize: function(event) {
					// Only update element offset if it's not invisible, as
					// otherwise the offset would be wrong.
					if (!DomElement.isInvisible(element))
						offset = DomElement.getOffset(element, true);
					// Set the size now, which internally calls onResize
					// and redraws the view
					that.setViewSize(DomElement.getViewportBounds(element)
							.getSize().subtract(offset));
				}
			};
			DomEvent.add(window, this._windowHandlers);
		} else {
			// If the element is invisible, we cannot directly access
			// element.width / height, because they would appear 0.
			// Reading the attributes still works.
			size = new Size(parseInt(element.getAttribute('width'), 10),
						parseInt(element.getAttribute('height'), 10));
			// If no size was specified on the canvas, read it from CSS
			if (size.isNaN())
				size = DomElement.getSize(element);
		}
		// Set canvas size even if we just deterined the size from it, since
		// it might have been set to a % size, in which case it would use some
		// default internal size (300x150 on WebKit) and scale up the pixels.
		element.width = size.width;
		element.height = size.height;
		// TODO: Test this on IE:
		if (PaperScope.hasAttribute(element, 'stats')) {
			this._stats = new Stats();
			// Align top-left to the element
			var stats = this._stats.domElement,
				style = stats.style,
				offset = DomElement.getOffset(element);
			style.position = 'absolute';
			style.left = offset.x + 'px';
			style.top = offset.y + 'px';
			document.body.appendChild(stats);
		}
/*#*/ } else if (options.node) {
		// Generate an id for this view
		this._id = 'view-' + View._id++;
		size = new Size(element.width, element.height);
/*#*/ } // options.node
		// Keep track of views internally
		View._views.push(this);
		// Link this id to our view
		View._viewsById[this._id] = this;
		this._viewSize = LinkedSize.create(this, 'setViewSize',
				size.width, size.height);
		this._matrix = new Matrix();
		this._zoom = 1;
		// Make sure the first view is focused for keyboard input straight away
		if (!View._focused)
			View._focused = this;
		// Items that need the onFrame handler called on them
		this._frameItems = {};
		this._frameItemCount = 0;
	},

	/**
	 * Removes this view from and frees the associated element.
	 */
	remove: function() {
		if (!this._project)
			return false;
		// Clear focus if removed view had it
		if (View._focused == this)
			View._focused = null;
		// Remove view from internal structures
		View._views.splice(View._views.indexOf(this), 1);
		delete View._viewsById[this._id];
		// Unlink from project
		if (this._project.view == this)
			this._project.view = null;
		// Uninstall event handlers again for this view.
		DomEvent.remove(this._element, this._viewHandlers);
		DomEvent.remove(window, this._windowHandlers);
		this._element = this._project = null;
		// Removing all onFrame handlers makes the onFrame handler stop
		// automatically through its uninstall method.
		this.detach('frame');
		this._frameItems = {};
		return true;
	},

	/**
	 * @namespace
	 * @ignore
	 */
	_events: {
		/**
		 * @namespace
		 */
		onFrame: {
			install: function() {
/*#*/ if (options.browser) {
				// Call the onFrame handler straight away and initialize the
				// sequence of onFrame calls.
				if (!this._requested) {
					this._animate = true;
					this._handleFrame(true);
				}
/*#*/ } // options.browser
			},

			uninstall: function() {
				this._animate = false;
			}
		},

		onResize: {}
	},

	// These are default values for event related properties on the prototype. 
	// Writing item._count++ does not change the defaults, it creates / updates
	// the property on the instance. Useful!
	_animate: false,
	_time: 0,
	_count: 0,

	_handleFrame: function(request) {
		this._requested = false;
		// See if we need to stop due to a call to uninstall()
		if (!this._animate)
			return;
		// Set the global paper object to the current scope
		paper = this._scope;
		if (request) {
			// Request next frame already
			this._requested = true;
			var that = this;
			DomEvent.requestAnimationFrame(function() {
				that._handleFrame(true);
			}, this._element);
		}
		var now = Date.now() / 1000,
			delta = this._before ? now - this._before : 0;
		this._before = now;
		this._handlingFrame = true;
		// Use Base.merge to convert into a Base object, for #toString()
		this.fire('frame', Base.merge({
			// Time elapsed since last redraw in seconds:
			delta: delta,
			// Time since first call of frame() in seconds:
			time: this._time += delta,
			count: this._count++
		}));
		// Update framerate stats
		if (this._stats)
			this._stats.update();
		this._handlingFrame = false;
		// Automatically draw view on each frame.
		this.draw(true);
	},

	_animateItem: function(item, animate) {
		var items = this._frameItems;
		if (animate) {
			items[item._id] = {
				item: item,
				// Additional information for the event callback
				time: 0,
				count: 0
			};
			if (++this._frameItemCount == 1)
				this.attach('frame', this._handleFrameItems);
		} else {
			delete items[item._id];
			if (--this._frameItemCount == 0) {
				// If this is the last one, just stop animating straight away.
				this.detach('frame', this._handleFrameItems);
			}
		}
	},

	// An empty callback that's only there so _frameItems can be handled
	// through the onFrame callback framework that automatically starts and
	// stops the animation for us whenever there's one or more frame handlers
	_handleFrameItems: function(event) {
		for (var i in this._frameItems) {
			var entry = this._frameItems[i];
			entry.item.fire('frame', Base.merge(event, {
				// Time since first call of frame() in seconds:
				time: entry.time += event.delta,
				count: entry.count++
			}));
		}
	},

	_redraw: function() {
		this._project._needsRedraw = true;
		if (this._handlingFrame)
			return;
		if (this._animate) {
			// If we're animating, call _handleFrame staight away, but without
			// requesting another animation frame.
			this._handleFrame();
		} else {
			// Otherwise simply redraw the view now
			this.draw();
		}
	},

	_transform: function(matrix) {
		this._matrix.concatenate(matrix);
		// Force recalculation of these values next time they are requested.
		this._bounds = null;
		this._inverse = null;
		this._redraw();
	},

	/**
	 * The underlying native element.
	 *
	 * @type HTMLCanvasElement
	 * @bean
	 */
	getElement: function() {
		return this._element;
	},

	/**
	 * The size of the view. Changing the view's size will resize it's
	 * underlying element.
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
		this._element.width = size.width;
		this._element.height = size.height;
		// Update _viewSize but don't notify of change.
		this._viewSize.set(size.width, size.height, true);
		this._bounds = null; // Force recalculation
		// Call onResize handler on any size change
		this.fire('resize', {
			size: size,
			delta: delta
		});
		this._redraw();
	},

	/**
	 * The bounds of the currently visible area in project coordinates.
	 *
	 * @type Rectangle
	 * @bean
	 */
	getBounds: function() {
		if (!this._bounds)
			this._bounds = this._getInverse()._transformBounds(
					new Rectangle(new Point(), this._viewSize));
		return this._bounds;
	},

	/**
	 * The size of the visible area in project coordinates.
	 *
	 * @type Size
	 * @bean
	 */
	getSize: function(/* dontLink */) {
		return this.getBounds().getSize(arguments[0]);
	},

	/**
	 * The center of the visible area in project coordinates.
	 *
	 * @type Point
	 * @bean
	 */
	getCenter: function(/* dontLink */) {
		return this.getBounds().getCenter(arguments[0]);
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
		this._transform(new Matrix().scale(zoom / this._zoom,
			this.getCenter()));
		this._zoom = zoom;
	},

	/**
	 * Checks whether the view is currently visible within the current browser
	 * viewport.
	 *
	 * @return {Boolean} Whether the view is visible.
	 */
	isVisible: function() {
		return DomElement.isInView(this._element);
	},

	/**
	 * Scrolls the view by the given vector.
	 *
	 * @param {Point} point
	 */
	scrollBy: function(point) {
		this._transform(new Matrix().translate(Point.read(arguments).negate()));
	},

	/**
	 * Draws the view.
	 *
	 * @name View#draw
	 * @function
	 */
	/*
	draw: function(checkRedraw) {
	},
	*/

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
			this._inverse = this._matrix.inverted();
		return this._inverse;
	}

	/**
	 * {@grouptitle Event Handlers}
	 * Handler function to be called on each frame of an animation.
	 * The function receives an event object which contains information about
	 * the frame event:
	 *
	 * <b>{@code event.count}</b>: the number of times the frame event was
	 * fired.
	 * <b>{@code event.time}</b>: the total amount of time passed since the
	 * first frame event in seconds.
	 * <b>{@code event.delta}</b>: the time passed in seconds since the last
	 * frame event.
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
	 * @name View#onFrame
	 * @property
	 * @type Function
	 */

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
	 * @name View#onResize
	 * @property
	 * @type Function
	 */
	/**
	 * {@grouptitle Event Handling}
	 * 
	 * Attach an event handler to the view.
	 *
	 * @name View#on
	 * @function
	 * @param {String('frame', 'resize')} type the event type
	 * @param {Function} function The function to be called when the event
	 * occurs
	 * 
	 * @example {@paperscript}
	 * // Create a rectangle shaped path with its top left point at:
	 * // {x: 50, y: 25} and a size of {width: 50, height: 50}
	 * var path = new Path.Rectangle(new Point(50, 25), new Size(50, 50));
	 * path.fillColor = 'black';
	 * 
	 * var frameHandler = function(event) {
	 * 	// Every frame, rotate the path by 3 degrees:
	 * 	path.rotate(3);
	 * };
	 * 
	 * view.on('frame', frameHandler);
	 */
	/**
	 * Attach one or more event handlers to the view.
	 *
	 * @name View#on^2
	 * @function
	 * @param {Object} param An object literal containing one or more of the
	 * following properties: {@code frame, resize}.
	 * // Create a rectangle shaped path with its top left point at:
	 * // {x: 50, y: 25} and a size of {width: 50, height: 50}
	 * var path = new Path.Rectangle(new Point(50, 25), new Size(50, 50));
	 * path.fillColor = 'black';
	 * 
	 * var frameHandler = function(event) {
	 * 	// Every frame, rotate the path by 3 degrees:
	 * 	path.rotate(3);
	 * };
	 * 
	 * view.on({
	 * 	frame: frameHandler
	 * });
	 */

	/**
	 * Detach an event handler from the view.
	 *
	 * @name View#detach
	 * @function
	 * @param {String('frame', 'resize')} type the event type
	 * @param {Function} function The function to be detached
	 * 
	 * @example {@paperscript}
	 * // Create a rectangle shaped path with its top left point at:
	 * // {x: 50, y: 25} and a size of {width: 50, height: 50}
	 * var path = new Path.Rectangle(new Point(50, 25), new Size(50, 50));
	 * path.fillColor = 'black';
	 * 
	 * var frameHandler = function(event) {
	 * 	// Every frame, rotate the path by 3 degrees:
	 * 	path.rotate(3);
	 * };
	 * 
	 * view.on({
	 * 	frame: frameHandler
	 * });
	 * 
	 * // When the user presses the mouse,
	 * // detach the frame handler from the view:
	 * function onMouseDown(event) {
	 * 	view.detach('frame');
	 * }
	 */
	/**
	 * Detach one or more event handlers from the view.
	 *
	 * @name View#detach^2
	 * @function
	 * @param {Object} param An object literal containing one or more of the
	 * following properties: {@code frame, resize}
	 */

	/**
	 * Fire an event on the view.
	 *
	 * @name View#fire
	 * @function
	 * @param {String('frame', 'resize')} type the event type
	 * @param {Object} event An object literal containing properties describing
	 * the event.
	 */

	/**
	 * Check if the view has one or more event handlers of the specified type.
	 *
	 * @name View#responds
	 * @function
	 * @param {String('frame', 'resize')} type the event type
	 * @return {Boolean} {@true if the view has one or more event handlers of
	 * the specified type}
	 */
}, {
	statics: {
		_views: [],
		_viewsById: {},
		_id: 0,

		create: function(element) {
/*#*/ if (options.browser) {
			if (typeof element === 'string')
				element = document.getElementById(element);
/*#*/ } // options.browser
			// Factory to provide the right View subclass for a given element.
			// Produces only CanvasViews for now:
			return new CanvasView(element);
		}
	}
}, new function() {
	// Injection scope for mouse events on the browser
/*#*/ if (options.browser) {
	var tool,
		prevFocus,
		tempFocus,
		dragging = false;

	function getView(event) {
		// Get the view from the current event target.
		var target = DomEvent.getTarget(event);
		// Some node do not have the getAttribute method, e.g. SVG nodes.
		return target.getAttribute && View._viewsById[target.getAttribute('id')];
	}

	function viewToProject(view, event) {
		return view.viewToProject(DomEvent.getOffset(event, view._element));
	}

	function updateFocus() {
		if (!View._focused || !View._focused.isVisible()) {
			// Find the first visible view
			for (var i = 0, l = View._views.length; i < l; i++) {
				var view = View._views[i];
				if (view && view.isVisible()) {
					View._focused = tempFocus = view;
					break;
				}
			}
		}
	}

	function mousedown(event) {
		// Get the view from the event, and store a reference to the view that
		// should receive keyboard input.
		var view = View._focused = getView(event),
			point = viewToProject(view, event);
		dragging = true;
		// Always first call the view's mouse handlers, as required by
		// CanvasView, and then handle the active tool, if any.
		if (view._onMouseDown)
			view._onMouseDown(event, point);
		if (tool = view._scope._tool)
			tool._onHandleEvent('mousedown', point, event);
		// In the end we always call draw(), but pass checkRedraw = true, so we
		// only redraw the view if anything has changed in the above calls.
		view.draw(true);
	}

	function mousemove(event) {
		var view;
		if (!dragging) {
			// See if we can get the view from the current event target, and
			// handle the mouse move over it.
			view = getView(event);
			if (view) {
				// Temporarily focus this view without making it sticky, so
				// Key events are handled too during the mouse over
				prevFocus = View._focused;
				View._focused = tempFocus = view;
			} else if (tempFocus && tempFocus == View._focused) {
				// Clear temporary focus again and update it.
				View._focused = prevFocus;
				updateFocus();
			}
		}
		if (!(view = view || View._focused))
			return;
		var point = event && viewToProject(view, event);
		if (view._onMouseMove)
			view._onMouseMove(event, point);
		if (tool = view._scope._tool) {
			// If there's no onMouseDrag, fire onMouseMove while dragging too.
			if (tool._onHandleEvent(dragging && tool.responds('mousedrag')
					? 'mousedrag' : 'mousemove', point, event))
				DomEvent.stop(event);
		}
		view.draw(true);
	}

	function mouseup(event) {
		var view = View._focused;
		if (!view || !dragging)
			return;
		var point = viewToProject(view, event);
		curPoint = null;
		dragging = false;
		if (view._onMouseUp)
			view._onMouseUp(event, point);
		// Cancel DOM-event if it was handled by our tool
		if (tool && tool._onHandleEvent('mouseup', point, event))
			DomEvent.stop(event);
		view.draw(true);
	}

	function selectstart(event) {
		// Only stop this even if we're dragging already, since otherwise no
		// text whatsoever can be selected on the page.
		if (dragging)
			DomEvent.stop(event);
	}

	// mousemove and mouseup events need to be installed on document, not the
	// view element, since we want to catch the end of drag events even outside
	// our view. Only the mousedown events are installed on the view, as handled
	// by _createHandlers below.

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
		_viewHandlers: {
			mousedown: mousedown,
			touchstart: mousedown,
			selectstart: selectstart
		},

		statics: {
			/**
			 * Loops through all views and sets the focus on the first
			 * active one.
			 */
			updateFocus: updateFocus
		}
	};
/*#*/ } // options.browser
});
