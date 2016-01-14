/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2016, Juerg Lehni & Jonathan Puckey
 * http://scratchdisk.com/ & http://jonathanpuckey.com/
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
/* jshint -W082 */
var View = Base.extend(Emitter, /** @lends View# */{
    _class: 'View',

    initialize: function View(project, element) {
        // Store reference to the currently active global paper scope, and the
        // active project, which will be represented by this view
        this._project = project;
        this._scope = project._scope;
        this._element = element;
        var size;
/*#*/ if (__options.environment == 'browser') {
        // Sub-classes may set _pixelRatio first
        if (!this._pixelRatio)
            this._pixelRatio = window.devicePixelRatio || 1;
        // Generate an id for this view / element if it does not have one
        this._id = element.getAttribute('id');
        if (this._id == null)
            element.setAttribute('id', this._id = 'view-' + View._id++);
        // Install event handlers
        DomEvent.add(element, this._viewEvents);
        // Borrowed from Hammer.js:
        var none = 'none';
        DomElement.setPrefixed(element.style, {
            userDrag: none,
            userSelect: none,
            touchCallout: none,
            contentZooming: none,
            tapHighlightColor: 'rgba(0,0,0,0)'
        });

        function getSize(name) {
            return element[name] || parseInt(element.getAttribute(name), 10);
        }

        function getCanvasSize() {
            // Try visible size first, since that will help handling previously
            // scaled canvases (e.g. when dealing with pixel-ratio)
            var size = DomElement.getSize(element);
            return size.isNaN() || size.isZero()
                    // If the element is invisible, we cannot directly access
                    // element.width / height, because they would appear 0.
                    // Reading the attributes should still work.
                    ? new Size(getSize('width'), getSize('height'))
                    : size;
        }

        // If the element has the resize attribute, listen to resize events and
        // update its coordinate space accordingly
        if (PaperScope.hasAttribute(element, 'resize')) {
            var that = this;
            DomEvent.add(window, this._windowEvents = {
                resize: function() {
                    that.setViewSize(getCanvasSize());
                }
            });
        }
        // Set canvas size even if we just determined the size from it, since
        // it might have been set to a % size, in which case it would use some
        // default internal size (300x150 on WebKit) and scale up the pixels.
        // We also need this call here for HiDPI support.
        this._setViewSize(size = getCanvasSize());
        // TODO: Test this on IE:
        if (PaperScope.hasAttribute(element, 'stats')
                && typeof Stats !== 'undefined') {
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
/*#*/ } else if (__options.environment == 'node') {
        // Sub-classes may set _pixelRatio first
        if (!this._pixelRatio)
            this._pixelRatio = 1;
        // Generate an id for this view
        this._id = 'view-' + View._id++;
        size = new Size(element.width, element.height);
/*#*/ } // __options.environment == 'node'
        // Keep track of views internally
        View._views.push(this);
        // Link this id to our view
        View._viewsById[this._id] = this;
        this._viewSize = size;
        (this._matrix = new Matrix())._owner = this;
        this._zoom = 1;
        // Make sure the first view is focused for keyboard input straight away
        if (!View._focused)
            View._focused = this;
        // Items that need the onFrame handler called on them
        this._frameItems = {};
        this._frameItemCount = 0;
        // Count the installed item events, see _countItemEvent().
        this._itemEvents = {};
    },

    /**
     * Removes this view from the project and frees the associated element.
     */
    remove: function() {
        if (!this._project)
            return false;
        // Clear focus if removed view had it
        if (View._focused === this)
            View._focused = null;
        // Remove view from internal structures
        View._views.splice(View._views.indexOf(this), 1);
        delete View._viewsById[this._id];
        // Unlink from project
        var project = this._project;
        if (project._view === this)
            project._view = null;
/*#*/ if (__options.environment == 'browser') {
        // Uninstall event handlers again for this view.
        DomEvent.remove(this._element, this._viewEvents);
        DomEvent.remove(window, this._windowEvents);
/*#*/ } // __options.environment == 'browser'
        this._element = this._project = null;
        // Remove all onFrame handlers.
        // TODO: Shouldn't we remove all handlers, automatically
        this.off('frame');
        this._animate = false;
        this._frameItems = {};
        return true;
    },

    _events: Base.each(['onResize', 'onMouseDown', 'onMouseUp', 'onMouseMove',
            'onMouseDrag', 'onMouseEnter', 'onMouseLeave'],
        function(name) {
            this[name] = {};
        }, {
            onFrame: {
                install: function() {
                    this.play();
                },

                uninstall: function() {
                    this.pause();
                }
            }
        }
    ),

    // These are default values for event related properties on the prototype.
    // Writing item._count++ does not change the defaults, it creates / updates
    // the property on the instance. Useful!
    _animate: false,
    _time: 0,
    _count: 0,

    _requestFrame: function() {
/*#*/ if (__options.environment == 'browser') {
        var that = this;
        DomEvent.requestAnimationFrame(function() {
            that._requested = false;
            // Do we need to stop due to a call to the frame event's uninstall()
            if (!that._animate)
                return;
            // Request next frame already before handling the current frame
            that._requestFrame();
            that._handleFrame();
        }, this._element);
        this._requested = true;
/*#*/ } // __options.environment == 'browser'
    },

    _handleFrame: function() {
        // Set the global paper object to the current scope
        paper = this._scope;
        var now = Date.now() / 1000,
            delta = this._before ? now - this._before : 0;
        this._before = now;
        this._handlingFrame = true;
        // Use new Base() to convert into a Base object, for #toString()
        this.emit('frame', new Base({
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
        // Automatically update view on each frame.
        this.update();
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
            if (++this._frameItemCount === 1)
                this.on('frame', this._handleFrameItems);
        } else {
            delete items[item._id];
            if (--this._frameItemCount === 0) {
                // If this is the last one, just stop animating straight away.
                this.off('frame', this._handleFrameItems);
            }
        }
    },

    // Handles _frameItems and fires the 'frame' event on them.
    _handleFrameItems: function(event) {
        for (var i in this._frameItems) {
            var entry = this._frameItems[i];
            entry.item.emit('frame', new Base(event, {
                // Time since first call of frame() in seconds:
                time: entry.time += event.delta,
                count: entry.count++
            }));
        }
    },

    _update: function() {
        this._project._needsUpdate = true;
        if (this._handlingFrame)
            return;
        if (this._animate) {
            // If we're animating, call _handleFrame staight away, but without
            // requesting another animation frame.
            this._handleFrame();
        } else {
            // Otherwise simply update the view now
            this.update();
        }
    },

    /**
     * Private notifier that is called whenever a change occurs in this view.
     * Used only by Matrix for now.
     *
     * @param {ChangeFlag} flags describes what exactly has changed
     */
    _changed: function(flags) {
        if (flags & /*#=*/ChangeFlag.APPEARANCE)
            this._project._needsUpdate = true;
    },

    _transform: function(matrix) {
        this._matrix.concatenate(matrix);
        // Force recalculation of these values next time they are requested.
        this._bounds = null;
        this._update();
    },

    /**
     * The underlying native element.
     *
     * @bean
     * @type HTMLCanvasElement
     */
    getElement: function() {
        return this._element;
    },

    /**
     * The ratio between physical pixels and device-independent pixels (DIPs)
     * of the underlying canvas / device.
     * It is `1` for normal displays, and `2` or more for
     * high-resolution displays.
     *
     * @bean
     * @type Number
     */
    getPixelRatio: function() {
        return this._pixelRatio;
    },

    /**
     * The resoltuion of the underlying canvas / device in pixel per inch (DPI).
     * It is `72` for normal displays, and `144` for high-resolution
     * displays with a pixel-ratio of `2`.
     *
     * @bean
     * @type Number
     */
    getResolution: function() {
        return this._pixelRatio * 72;
    },

    /**
     * The size of the view. Changing the view's size will resize it's
     * underlying element.
     *
     * @bean
     * @type Size
     */
    getViewSize: function() {
        var size = this._viewSize;
        return new LinkedSize(size.width, size.height, this, 'setViewSize');
    },

    setViewSize: function(/* size */) {
        var size = Size.read(arguments),
            delta = size.subtract(this._viewSize);
        if (delta.isZero())
            return;
        this._viewSize.set(size.width, size.height);
        this._setViewSize(size);
        this._bounds = null; // Force recalculation
        // Call onResize handler on any size change
        this.emit('resize', {
            size: size,
            delta: delta
        });
        this._update();
    },

    /**
     * Private method, overriden in CanvasView for HiDPI support.
     */
    _setViewSize: function(size) {
        var element = this._element;
        element.width = size.width;
        element.height = size.height;
    },

    /**
     * The bounds of the currently visible area in project coordinates.
     *
     * @bean
     * @type Rectangle
     */
    getBounds: function() {
        if (!this._bounds)
            this._bounds = this._matrix.inverted()._transformBounds(
                    new Rectangle(new Point(), this._viewSize));
        return this._bounds;
    },

    /**
     * The size of the visible area in project coordinates.
     *
     * @bean
     * @type Size
     */
    getSize: function() {
        return this.getBounds().getSize();
    },

    /**
     * The center of the visible area in project coordinates.
     *
     * @bean
     * @type Point
     */
    getCenter: function() {
        return this.getBounds().getCenter();
    },

    setCenter: function(/* center */) {
        var center = Point.read(arguments);
        this.scrollBy(center.subtract(this.getCenter()));
    },

    /**
     * The zoom factor by which the project coordinates are magnified.
     *
     * @bean
     * @type Number
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
     * @return {Boolean} {@true if the view is visible}
     */
    isVisible: function() {
        return DomElement.isInView(this._element);
    },

    /**
     * Checks whether the view is inserted into the browser DOM.
     *
     * @return {Boolean}  {@true if the view is inserted}
     */
    isInserted: function() {
        return DomElement.isInserted(this._element);
    },

    /**
     * Scrolls the view by the given vector.
     *
     * @param {Point} point
     */
    scrollBy: function(/* point */) {
        this._transform(new Matrix().translate(Point.read(arguments).negate()));
    },

    /**
     * Makes all animation play by adding the view to the request animation
     * loop.
     */
    play: function() {
        this._animate = true;
/*#*/ if (__options.environment == 'browser') {
        // Request a frame handler straight away to initialize the
        // sequence of onFrame calls.
        if (!this._requested)
            this._requestFrame();
/*#*/ } // __options.environment == 'browser'
    },

    /**
     * Makes all animation pause by removing the view to the request animation
     * loop.
     */
    pause: function() {
        this._animate = false;
    },

    /**
     * Updates the view if there are changes. Note that when using built-in
     * event hanlders for interaction, animation and load events, this method is
     * invoked for you automatically at the end.
     *
     * @name View#update
     * @function
     * @param {Boolean} [force=false] {@true if the view should be updated even
     * if no change has happened}
     * @return {Boolean} {@true if the view was updated}
     */
    // update: function(force) {
    // },

    /**
     * Updates the view if there are changes.
     *
     * @deprecated use {@link #update()} instead.
     */
    draw: function() {
        this.update();
    },

    // TODO: getInvalidBounds
    // TODO: invalidate(rect)
    // TODO: style: artwork / preview / raster / opaque / ink
    // TODO: getShowGrid
    // TODO: getMousePoint
    // TODO: projectToView(rect)

    /**
     * Converts the passed point from project coordinate space to view
     * coordinate space, which is measured in browser pixels in relation to the
     * position of the view element.
     *
     * @param {Point} point the point in project coordinates to be converted
     * @return {Point} the point converted into view coordinates
     */
    projectToView: function(/* point */) {
        return this._matrix._transformPoint(Point.read(arguments));
    },

    /**
     * Converts the passed point from view coordinate space to project
     * coordinate space.
     *
     * @param {Point} point the point in view coordinates to be converted
     * @return {Point} the point converted into project coordinates
     */
    viewToProject: function(/* point */) {
        return this._matrix._inverseTransform(Point.read(arguments));
    },

    /**
     * Determines and returns the event location in project coordinate space.
     *
     * @param {Event} event the native event object for which to determine the
     *     location.
     * @return {Point} the event point in project coordinates.
     */
    getEventPoint: function(event) {
        return this.viewToProject(DomEvent.getOffset(event, this._element));
    },

    /**
     * {@grouptitle Event Handlers}
     * Handler function to be called on each frame of an animation.
     * The function receives an event object which contains information about
     * the frame event:
     *
     * @option event.count {Number} the number of times the frame event was
     * fired
     * @option event.time {Number} the total amount of time passed since the
     * first frame event in seconds
     * @option event.delta {Number} the time passed in seconds since the last
     * frame event
     *
     * @example {@paperscript}
     * // Creating an animation:
     *
     * // Create a rectangle shaped path with its top left point at:
     * // {x: 50, y: 25} and a size of {width: 50, height: 50}
     * var path = new Path.Rectangle(new Point(50, 25), new Size(50, 50));
     * path.fillColor = 'black';
     *
     * view.onFrame = function(event) {
     *     // Every frame, rotate the path by 3 degrees:
     *     path.rotate(3);
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
     * view.onResize = function(event) {
     *     // Whenever the view is resized, move the path to its center:
     *     path.position = view.center;
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
     * @param {String} type the type of event: {@values 'frame', 'resize',
     *     mousedown', 'mouseup', 'mousedrag', 'click', 'doubleclick',
     *     'mousemove', 'mouseenter', 'mouseleave'}
     * @param {Function} function the function to be called when the event
     *     occurs, receiving a {@link MouseEvent} or {@link Event} object as its
     *     sole argument
     * @return {View} this view itself, so calls can be chained
     *
     * @example {@paperscript}
     * // Create a rectangle shaped path with its top left point at:
     * // {x: 50, y: 25} and a size of {width: 50, height: 50}
     * var path = new Path.Rectangle(new Point(50, 25), new Size(50, 50));
     * path.fillColor = 'black';
     *
     * var frameHandler = function(event) {
     *     // Every frame, rotate the path by 3 degrees:
     *     path.rotate(3);
     * };
     *
     * view.on('frame', frameHandler);
     */
    /**
     * Attach one or more event handlers to the view.
     *
     * @name View#on
     * @function
     * @param {Object} param an object literal containing one or more of the
     *     following properties: {@values frame, resize}
     * @return {View} this view itself, so calls can be chained
     *
     * @example {@paperscript}
     * // Create a rectangle shaped path with its top left point at:
     * // {x: 50, y: 25} and a size of {width: 50, height: 50}
     * var path = new Path.Rectangle(new Point(50, 25), new Size(50, 50));
     * path.fillColor = 'black';
     *
     * var frameHandler = function(event) {
     *     // Every frame, rotate the path by 3 degrees:
     *     path.rotate(3);
     * };
     *
     * view.on({
     *     frame: frameHandler
     * });
     */

    /**
     * Detach an event handler from the view.
     *
     * @name View#off
     * @function
     * @param {String} type the event type: {@values 'frame', 'resize'}
     * @param {Function} function the function to be detached
     * @return {View} this view itself, so calls can be chained
     *
     * @example {@paperscript}
     * // Create a rectangle shaped path with its top left point at:
     * // {x: 50, y: 25} and a size of {width: 50, height: 50}
     * var path = new Path.Rectangle(new Point(50, 25), new Size(50, 50));
     * path.fillColor = 'black';
     *
     * var frameHandler = function(event) {
     *     // Every frame, rotate the path by 3 degrees:
     *     path.rotate(3);
     * };
     *
     * view.on({
     *     frame: frameHandler
     * });
     *
     * // When the user presses the mouse,
     * // detach the frame handler from the view:
     * function onMouseDown(event) {
     *     view.off('frame');
     * }
     */
    /**
     * Detach one or more event handlers from the view.
     *
     * @name View#off
     * @function
     * @param {Object} param an object literal containing one or more of the
     *     following properties: {@values frame, resize}
     * @return {View} this view itself, so calls can be chained
     */

    /**
     * Emit an event on the view.
     *
     * @name View#emit
     * @function
     * @param {String} type the event type: {@values 'frame', 'resize'}
     * @param {Object} event an object literal containing properties describing
     * the event
     * @return {Boolean} {@true if the event had listeners}
     */

    /**
     * Check if the view has one or more event handlers of the specified type.
     *
     * @name View#responds
     * @function
     * @param {String} type the event type: {@values 'frame', 'resize'}
     * @return {Boolean} {@true if the view has one or more event handlers of
     * the specified type}
     */
}, {
    statics: {
        _views: [],
        _viewsById: {},
        _id: 0,

        create: function(project, element) {
/*#*/ if (__options.environment == 'browser') {
            if (typeof element === 'string')
                element = document.getElementById(element);
/*#*/ } // __options.environment == 'browser'
            // Factory to provide the right View subclass for a given element.
            // Produces only CanvasViews for now:
            return new CanvasView(project, element);
        }
    }
},
new function() { // Injection scope for mouse events on the browser
/*#*/ if (__options.environment == 'browser') {

    /**
     * Native event handling, coordinate conversion, focus handling and
     * delegation to view and tool objects.
     */

    var prevFocus,
        tempFocus,
        dragging = false, // mousedown that started on a view.
        mouseDown = false; // mouesdown anywhere.

    function getView(event) {
        // Get the view from the current event target.
        var target = DomEvent.getTarget(event);
        // Some node do not have the getAttribute method, e.g. SVG nodes.
        return target.getAttribute && View._viewsById[
                target.getAttribute('id')];
    }

    function updateFocus() {
        var view = View._focused;
        if (!view || !view.isVisible()) {
            // Find the first visible view
            for (var i = 0, l = View._views.length; i < l; i++) {
                if ((view = View._views[i]).isVisible()) {
                    View._focused = tempFocus = view;
                    break;
                }
            }
        }
    }

    function handleMouseMove(view, event, point) {
        view._handleEvent('mousemove', event, point);
    }

    // Touch handling inspired by Hammer.js
    var navigator = window.navigator,
        mousedown, mousemove, mouseup;
    if (navigator.pointerEnabled || navigator.msPointerEnabled) {
        // HTML5 / MS pointer events
        mousedown = 'pointerdown MSPointerDown';
        mousemove = 'pointermove MSPointerMove';
        mouseup = 'pointerup pointercancel MSPointerUp MSPointerCancel';
    } else {
        mousedown = 'touchstart';
        mousemove = 'touchmove';
        mouseup = 'touchend touchcancel';
        // Do not add mouse events on mobile and tablet devices
        if (!('ontouchstart' in window && navigator.userAgent.match(
                /mobile|tablet|ip(ad|hone|od)|android|silk/i))) {
            // For non pointer events browsers and mixed browsers, like chrome
            // on Windows8 touch laptop.
            mousedown += ' mousedown';
            mousemove += ' mousemove';
            mouseup += ' mouseup';
        }
    }

    var viewEvents = {},
        docEvents = {
            // NOTE: mouseleave does not seem to work on document in IE:
            mouseout: function(event) {
                // When the moues leaves the document, fire one last mousemove
                // event, to give items the change to receive a mouseleave, etc.
                var view = View._focused,
                    target = DomEvent.getRelatedTarget(event);
                if (view && (!target || target.nodeName === 'HTML')) {
                    // See #800 for this bizarre workaround for an issue of
                    // Chrome on Windows:
                    // TODO: Remove again after Dec 2016, once fixed in Chrome.
                    var offset = DomEvent.getOffset(event, view._element),
                        x = offset.x,
                        abs = Math.abs,
                        ax = abs(x),
                        max = 1 << 25,
                        diff = ax - max;
                    offset.x = abs(diff) < ax ? diff * (x < 0 ? -1 : 1) : x;
                    handleMouseMove(view, event, view.viewToProject(offset));
                }
            },

            scroll: updateFocus
        };

    // mousemove and mouseup events need to be installed on document, not the
    // view element, since we want to catch the end of drag events even outside
    // our view. Only the mousedown events are installed on the view, as defined
    // by _viewEvents below.
    viewEvents[mousedown] = function(event) {
        // Get the view from the event, and store a reference to the view that
        // should receive keyboard input.
        var view = View._focused = getView(event);
        dragging = true;
        view._handleEvent('mousedown', event);
    };

    docEvents[mousemove] = function(event) {
        var view = View._focused;
        if (!mouseDown) {
            // See if we can get the view from the current event target, and
            // handle the mouse move over it.
            var target = getView(event);
            if (target) {
                if (view !== target) {
                    // Temporarily focus this view without making it sticky, so
                    // Key events are handled too during the mouse over.
                    // As we switch view, fire one last mousemove in the old
                    // view, to let items receive receive a mouseleave, etc.
                    if (view)
                        handleMouseMove(view, event);
                    if (!prevFocus)
                        prevFocus = view;
                    view = View._focused = tempFocus = target;
                }
            } else if (tempFocus && tempFocus === view) {
                // Clear temporary focus again and switch back to previous focus
                // but only if it is still valid (still in the DOM).
                if (prevFocus && !prevFocus.isInserted())
                    prevFocus = null;
                view = View._focused = prevFocus;
                prevFocus = null;
                updateFocus();
            }
        }
        if (view)
            handleMouseMove(view, event);
    };

    docEvents[mousedown] = function(event) {
        // In order to not switch views during scroll dragging on touch devices,
        // we need to know if the mouse was clicked anywhere on the document
        // (see docEvents[mousemove]) The rest happens in viewEvents[mousedown].
        mouseDown = true;
    };

    docEvents[mouseup] = function(event) {
        var view = View._focused;
        if (view && dragging)
            view._handleEvent('mouseup', event);
        mouseDown = dragging = false;
    };

    DomEvent.add(document, docEvents);

    DomEvent.add(window, {
        load: updateFocus
    });

    /**
     * Higher level event handling, hit-testing, and emitting of normal mouse
     * events along with "virtual" events such as mouseenter, mouseleave,
     * mousedrag, click, doubleclick, on both the hit-test item and the view,
     * with support for bubbling (event-propagation).
     */

    var called = false,
        // Event fallbacks for "virutal" events, e.g. if an item doesn't respond
        // to doubleclick, fall back to click:
        fallbacks = {
            doubleclick: 'click',
            mousedrag: 'mousemove'
        };

    // Returns true if event was stopped, false otherwise.
    function emitEvent(obj, type, event, point, prevPoint, stopItem) {
        var target = obj,
            mouseEvent;

        function emit(obj, type) {
            if (obj.responds(type)) {
                // Only produce the event object if we really need it, and then
                // reuse it if we're bubbling.
                if (!mouseEvent) {
                    mouseEvent = new MouseEvent(
                            type, event, point, target,
                            // Calculate delta if prevPoint was passed
                            prevPoint ? point.subtract(prevPoint) : null);
                }
                if (obj.emit(type, mouseEvent)) {
                    called = true;
                    // Bail out if propagation is stopped
                    if (mouseEvent.stopped)
                        return true;
                }
            } else {
                var fallback = fallbacks[type];
                if (fallback)
                    return emit(obj, fallback);
            }
        }

        // Bubble up the parents and emit this event until we're told to stop.
        while (obj && obj !== stopItem) {
            if (emit(obj, type))
                return true;
            obj = obj._parent;
        }
        return false;
    }

    // Returns true if event was stopped, false otherwise.
    function emitEvents(view, item, type, event, point, prevPoint) {
        // Set called to false, so it will reflect if the following calls to
        // emitEvent() have called a handler.
        called = false;
        // First handle the drag-item and its parents, through bubbling.
        return (dragItem && emitEvent(dragItem, type, event, point,
                    prevPoint)
            // Next handle the hit-test item, if it's different from the drag
            // item and not a descendant of it (in which case it would already
            // have received an event in the call above). Use fallbacks to
            // translate mousedrag to mousemove, since drag is handled above.
            || item && item !== dragItem && !item.isDescendant(dragItem)
                && emitEvent(item, fallbacks[type] || type, event, point,
                    prevPoint, dragItem)
            // Lastly handle the move / drag on the view, if we're still here.
            || emitEvent(view, type, event, point, prevPoint));
    }

    /**
     * Lookup defining which native events are required by which item events.
     * Required by code that is counting the amount of required natives events.
     * The mapping is native -> virtual.
     */
    var itemEvents = {
        mousedown: {
            mousedown: 1,
            mousedrag: 1,
            click: 1,
            doubleclick: 1
        },
        mouseup: {
            mouseup: 1,
            mousedrag: 1,
            click: 1,
            doubleclick: 1
        },
        mousemove: {
            mousedrag: 1,
            mousemove: 1,
            mouseenter: 1,
            mouseleave: 1
        }
    };

    /**
     * Various variables required by #_handleEvent()
     */
    var downPoint,
        lastPoint,
        downItem,
        overItem,
        dragItem,
        clickItem,
        clickTime,
        dblClick,
        overView,
        wasInView = false;

    return {
        _viewEvents: viewEvents,

        /**
         * Private method to handle view and item events.
         */
        _handleEvent: function(type, event, point) {
            var handleItems = this._itemEvents[type],
                project = paper.project,
                tool = this._scope.tool,
                view = this;
            // If it's a native mousemove event but the mouse is down, convert
            // it to a mousedrag.
            // NOTE: emitEvent(), as well as Tool#_handleEvent() fall back to
            // mousemove if the objects don't respond to mousedrag.
            if (type === 'mousemove' && dragging)
                type = 'mousedrag';
            // Before handling events, process removeOn() calls for cleanup.
            if (project)
                project.removeOn(type);
            if (!point)
                point = this.getEventPoint(event);
            // Run the hit-test on items first, but only if we're required to do
            // so for this given mouse event, see #_countItemEvent().
            var inView = this.getBounds().contains(point),
                hit = inView && handleItems && this._project.hitTest(point, {
                    tolerance: 0,
                    fill: true,
                    stroke: true
                }),
                item = hit && hit.item || undefined,
                // Keep track if view event should be handled, so we can use it
                // to decide if tool._handleEvent() shall be called after.
                handle = false,
                stopped = false,
                mouse = {};
            // Create a simple lookup object to quickly check for different
            // mouse event types.
            mouse[type.substr(5)] = true;
            // Always first call the view's mouse handlers, as required by
            // CanvasView, and then handle the active tool after, if any.
            // Handle mousemove first, even if this is not actually a mousemove
            // event but the mouse has moved since the last event, but do not
            // allow it to stop the other events in that case.
            var nativeMove = mouse.move || mouse.drag,
                moveType = nativeMove && type || 'mousemove';
            if (moveType) {
                // Handle mouseenter / leave between items, as well as views.
                if (item !== overItem) {
                    if (overItem)
                        emitEvent(overItem, 'mouseleave', event, point);
                    if (item)
                        emitEvent(item, 'mouseenter', event, point);
                }
                overItem = item;
                if (nativeMove && (wasInView ^ inView)) {
                    emitEvent(this, inView ? 'mouseenter' : 'mouseleave', event,
                            point);
                    overView = inView ? this : null;
                    handle = nativeMove; // To include the leaving move.
                }
                if (inView || mouse.drag && !lastPoint.equals(point)) {
                    stopped = emitEvents(this, item, moveType, event, point,
                            lastPoint);
                    handle = nativeMove;
                }
                wasInView = inView;
            }
            // Now handle mousedown / mouseup
            if (!nativeMove &&
                    // We emit mousedown only when in the view, and mouseup
                    // regardless, as long as the mousedown event was inside.
                    (handle = mouse.down && inView || mouse.up && !!downPoint)) {
                stopped = emitEvents(this, item, type, event, point, downPoint);
                // Clear wasInView so we're not accidentally handling mousedrag
                // events that started outside the view as mousemove events on
                // the view (needed to handle touch scrolling correctly).
                wasInView = false;
                if (mouse.down) {
                    // See if we're clicking again on the same item, within the
                    // double-click time. Firefox uses 300ms as the max time
                    // difference:
                    if (item) {
                        dblClick = item === clickItem
                            && (Date.now() - clickTime < 300);
                        downItem = clickItem = item;
                        // Only start dragging if the mousedown event has not
                        // stopped propagation.
                        dragItem = !stopped && item;
                    }
                    downPoint = lastPoint = point;
                } else if (mouse.up) {
                    // Emulate click / doubleclick, but only on item, not view
                    if (!stopped && item && item === downItem) {
                        clickTime = Date.now();
                        emitEvent(item, dblClick ? 'doubleclick' : 'click',
                                event, point, downPoint);
                        dblClick = false;
                    }
                    downItem = dragItem = null;
                }
            }
            lastPoint = point;
            // Now finally call the tool events, but filter mouse move events
            // to only be fired if we're inside the view or if we just left it.
            // Prevent default if at least one handler was called, and none of
            // them enforces default, to prevent scrolling on touch devices.
            if (handle && tool)
                called = tool._handleEvent(type, event, point, mouse) || called;

            // Now call preventDefault()`, if any of these conditions are met:
            // - If any of the handlers were called, except for mousemove events
            //   which need to call `event.preventDefault()` explicitly, or
            //   `return false;`.
            // - If this is a mousedown event, and the view or tools respond to
            //   mouseup.

            function responds(type) {
                return view._itemEvents[type] || view.responds(type)
                        || tool.responds(type);
            }

            if (called && (!nativeMove || responds('mousedrag'))
                    || mouse.down && responds('mouseup'))
                event.preventDefault();

            // In the end we always call update(), which only updates the view
            // if anything has changed in the above calls.
            this.update();
        },

        _countItemEvent: function(type, sign) {
            // If the view requires counting of installed mouse events,
            // change the event counters now according to itemEvents.
            var events = this._itemEvents;
            for (var key in itemEvents) {
                events[key] = (events[key] || 0)
                        + (itemEvents[key][type] || 0) * sign;
            }
        },

        statics: {
            /**
             * Loops through all views and sets the focus on the first
             * active one.
             */
            updateFocus: updateFocus
        }
    };
/*#*/ } // __options.environment == 'browser'
});
