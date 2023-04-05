/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2020, Jürg Lehni & Jonathan Puckey
 * http://juerglehni.com/ & https://puckey.studio/
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
var View = Base.extend(Emitter, /** @lends View# */{
    _class: 'View',

    initialize: function View(project, element) {

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

        var size;
        if (window && element) {
            // Generate an id for this view / element if it does not have one
            this._id = element.getAttribute('id');
            if (this._id == null)
                element.setAttribute('id', this._id = 'paper-view-' + View._id++);
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

            // If the element has the resize attribute, listen to resize events
            // and update its coordinate space accordingly
            if (PaperScope.hasAttribute(element, 'resize')) {
                var that = this;
                DomEvent.add(window, this._windowEvents = {
                    resize: function() {
                        that.setViewSize(getCanvasSize());
                    }
                });
            }

            size = getCanvasSize();

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
        } else {
            // For web-workers: Allow calling of `paper.setup(new Size(x, y));`
            size = new Size(element);
            element = null;
        }
        // Store reference to the currently active global paper scope, and the
        // active project, which will be represented by this view
        this._project = project;
        this._scope = project._scope;
        this._element = element;
        // Sub-classes may set _pixelRatio first
        if (!this._pixelRatio)
            this._pixelRatio = window && window.devicePixelRatio || 1;
        // Set canvas size even if we just determined the size from it, since
        // it might have been set to a % size, in which case it would use some
        // default internal size (300x150 on WebKit) and scale up the pixels.
        // We also need this call here for HiDPI support.
        this._setElementSize(size.width, size.height);
        this._viewSize = size;
        // Keep track of views internally
        View._views.push(this);
        // Link this id to our view
        View._viewsById[this._id] = this;
        (this._matrix = new Matrix())._owner = this;
        // Make sure the first view is focused for keyboard input straight away
        if (!View._focused)
            View._focused = this;
        // Items that need the onFrame handler called on them
        this._frameItems = {};
        this._frameItemCount = 0;
        // Count the installed native and virtual item events,
        // see #_countItemEvent():
        this._itemEvents = { native: {}, virtual: {} };
        // Do not set _autoUpdate on Node.js by default:
        this._autoUpdate = !paper.agent.node;
        this._needsUpdate = false;
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
        // Uninstall event handlers again for this view.
        DomEvent.remove(this._element, this._viewEvents);
        DomEvent.remove(window, this._windowEvents);
        this._element = this._project = null;
        // Remove all onFrame handlers.
        // TODO: Shouldn't we remove all other event handlers, automatically
        this.off('frame');
        this._animate = false;
        this._frameItems = {};
        return true;
    },

    _events: Base.each(
        Item._itemHandlers.concat(['onResize', 'onKeyDown', 'onKeyUp']),
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

    /**
     * Controls whether the view is automatically updated in the next animation
     * frame on changes, or whether you prefer to manually call
     * {@link #update()} or {@link #requestUpdate()} after changes.
     * Note that this is `true` by default, except for Node.js, where manual
     * updates make more sense.
     *
     * @bean
     * @type Boolean
     */
    getAutoUpdate: function() {
        return this._autoUpdate;
    },

    setAutoUpdate: function(autoUpdate) {
        this._autoUpdate = autoUpdate;
        if (autoUpdate)
            this.requestUpdate();
    },

    /**
     * Updates the view if there are changes. Note that when using built-in
     * event hanlders for interaction, animation and load events, this method is
     * invoked for you automatically at the end.
     *
     * @return {Boolean} {@true if the view was updated}
     */
    update: function() {
    },

    /**
     * Updates the view if there are changes.
     *
     * @deprecated use {@link #update()} instead.
     */
    // NOTE: We cannot use draw: '#update'` as that would not work on CanvasView
    draw: function() {
        this.update();
    },

    /**
     * Requests an update of the view if there are changes through the browser's
     * requestAnimationFrame() mechanism for smooth animation. Note that when
     * using built-in event handlers for interaction, animation and load events,
     * updates are automatically invoked for you automatically at the end.
     */
    requestUpdate: function() {
        if (!this._requested) {
            var that = this;
            DomEvent.requestAnimationFrame(function() {
                that._requested = false;
                // Only handle the frame and request the next one if we don't
                // need to stop, e.g.  due to a call to pause(), or a request
                // for a single redraw.
                if (that._animate) {
                    // Request next update before handling the current frame
                    that.requestUpdate();
                    var element = that._element;
                    // Only keep animating if we're allowed to, based on whether
                    // the document is visible and the setting of keepalive. We
                    // keep requesting frame regardless though, so the animation
                    // picks up again as soon as the view is visible.
                    if ((!DomElement.getPrefixed(document, 'hidden')
                            || PaperScope.getAttribute(element, 'keepalive')
                                === 'true') && DomElement.isInView(element)) {
                        that._handleFrame();
                    }
                }
                // Even if we're not animating, update the view now since this
                // might have been a request for a single redraw after a change.
                // NOTE: If nothing has changed (e.g. _handleFrame() wasn't
                // called above), then this does not actually do anything.
                if (that._autoUpdate)
                    that.update();
            });
            this._requested = true;
        }
    },

    /**
     * Makes all animation play by adding the view to the request animation
     * loop.
     */
    play: function() {
        this._animate = true;
        // Request a frame handler straight away to initialize the
        // sequence of onFrame calls.
        this.requestUpdate();
    },

    /**
     * Makes all animation pause by removing the view from the request animation
     * loop.
     */
    pause: function() {
        this._animate = false;
    },

    _handleFrame: function() {
        // Set the global paper object to the current scope
        paper = this._scope;
        var now = Date.now() / 1000,
            delta = this._last ? now - this._last : 0;
        this._last = now;
        // Use new Base() to convert into a Base object, for #toString()
        this.emit('frame', new Base({
            // Time elapsed since last frame in seconds:
            delta: delta,
            // Total since first frame in seconds:
            time: this._time += delta,
            count: this._count++
        }));
        if (this._stats)
            this._stats.update();
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

    /**
     * Private notifier that is called whenever a change occurs in this view.
     * Used only by Matrix for now.
     */
    _changed: function() {
        // The only one calling View._changed() is Matrix, so it can only mean
        // one thing:
        this._project._changed(/*#=*/Change.VIEW);
        // Force recalculation of these values next time they are requested.
        this._bounds = this._decomposed = undefined;
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
     * The resolution of the underlying canvas / device in pixel per inch (DPI).
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
        this._setElementSize(size.width, size.height);
        this._viewSize.set(size);
        this._changed();
        // Emit resize event on any size changes.
        this.emit('resize', { size: size, delta: delta });
        if (this._autoUpdate) {
            // Update right away, don't wait for the next animation frame as
            // otherwise the view would flicker during resizes, see #1126
            this.update();
        }
    },

    /**
     * Private method, overridden in CanvasView for HiDPI support.
     */
    _setElementSize: function(width, height) {
        var element = this._element;
        if (element) {
            if (element.width !== width)
                element.width = width;
            if (element.height !== height)
                element.height = height;
        }
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

    // Empty stubs of #getPixelSize() and #getTextWidth(), around so that
    // web-workers don't fail. Overridden with proper functionality in
    // CanvasView.
    getPixelSize: function(size) {
        var element = this._element,
            pixels;
        if (element) {
            // this code is part of the Firefox workaround in CanvasView, but
            // also provides a way to determine pixel-size that does not involve
            // a Canvas. It still does not work in a web-worker though.
            var parent = element.parentNode,
                temp = document.createElement('div');
            temp.style.fontSize = size;
            parent.appendChild(temp);
            pixels = parseFloat(DomElement.getStyles(temp).fontSize);
            parent.removeChild(temp);
        } else {
            pixels = parseFloat(pixels);
        }
        return pixels;
    },

    getTextWidth: function(font, lines) {
        return 0;
    }
}, Base.each(['rotate', 'scale', 'shear', 'skew'], function(key) {
    var rotate = key === 'rotate';
    this[key] = function(/* value, center */) {
        var args = arguments,
            value = (rotate ? Base : Point).read(args),
            center = Point.read(args, 0, { readNull: true });
        return this.transform(new Matrix()[key](value,
                center || this.getCenter(true)));
    };
}, /** @lends View# */{
    _decompose: function() {
        return this._decomposed || (this._decomposed = this._matrix.decompose());
    },

    /**
     * {@grouptitle Transform Functions}
     *
     * Translates (scrolls) the view by the given offset vector.
     *
     * @param {Point} delta the offset to translate the view by
     */
    translate: function(/* delta */) {
        var mx = new Matrix();
        return this.transform(mx.translate.apply(mx, arguments));
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
        this.translate(this.getCenter().subtract(center));
    },

    /**
     * The view's zoom factor by which the project coordinates are magnified.
     *
     * @bean
     * @type Number
     * @see #scaling
     */
    getZoom: function() {
        var scaling = this._decompose().scaling;
        // Use average since it can be non-uniform.
        return (scaling.x + scaling.y) / 2;
    },

    setZoom: function(zoom) {
        this.transform(new Matrix().scale(zoom / this.getZoom(),
            this.getCenter()));
    },

    /**
     * The current rotation angle of the view, as described by its
     * {@link #matrix}.
     *
     * @bean
     * @type Number
     */
    getRotation: function() {
        return this._decompose().rotation;
    },

    setRotation: function(rotation) {
        var current = this.getRotation();
        if (current != null && rotation != null) {
            this.rotate(rotation - current);
        }
    },

    /**
     * The current scale factor of the view, as described by its
     * {@link #matrix}.
     *
     * @bean
     * @type Point
     * @see #zoom
     */
    getScaling: function() {
        var scaling = this._decompose().scaling;
        return new LinkedPoint(scaling.x, scaling.y, this, 'setScaling');
    },

    setScaling: function(/* scaling */) {
        var current = this.getScaling(),
            // Clone existing points since we're caching internally.
            scaling = Point.read(arguments, 0, { clone: true, readNull: true });
        if (current && scaling) {
            this.scale(scaling.x / current.x, scaling.y / current.y);
        }
    },

    /**
     * The view's transformation matrix, defining the view onto the project's
     * contents (position, zoom level, rotation, etc).
     *
     * @bean
     * @type Matrix
     */
    getMatrix: function() {
        return this._matrix;
    },

    setMatrix: function() {
        // Use Matrix#initialize to easily copy over values.
        // NOTE: calling initialize() also calls #_changed() for us, through its
        // call to #set() / #reset(), and this also handles _applyMatrix for us.
        var matrix = this._matrix;
        matrix.set.apply(matrix, arguments);
    },

    /**
     * Rotates the view by a given angle around the given center point.
     *
     * Angles are oriented clockwise and measured in degrees.
     *
     * @name View#rotate
     * @function
     * @param {Number} angle the rotation angle
     * @param {Point} [center={@link View#center}]
     * @see Matrix#rotate(angle[, center])
     */

    /**
     * Scales the view by the given value from its center point, or optionally
     * from a supplied point.
     *
     * @name View#scale
     * @function
     * @param {Number} scale the scale factor
     * @param {Point} [center={@link View#center}]
     */
    /**
     * Scales the view by the given values from its center point, or optionally
     * from a supplied point.
     *
     * @name View#scale
     * @function
     * @param {Number} hor the horizontal scale factor
     * @param {Number} ver the vertical scale factor
     * @param {Point} [center={@link View#center}]
     */

    /**
     * Shears the view by the given value from its center point, or optionally
     * by a supplied point.
     *
     * @name View#shear
     * @function
     * @param {Point} shear the horizontal and vertical shear factors as a point
     * @param {Point} [center={@link View#center}]
     * @see Matrix#shear(shear[, center])
     */
    /**
     * Shears the view by the given values from its center point, or optionally
     * by a supplied point.
     *
     * @name View#shear
     * @function
     * @param {Number} hor the horizontal shear factor
     * @param {Number} ver the vertical shear factor
     * @param {Point} [center={@link View#center}]
     * @see Matrix#shear(hor, ver[, center])
     */

    /**
     * Skews the view by the given angles from its center point, or optionally
     * by a supplied point.
     *
     * @name View#skew
     * @function
     * @param {Point} skew the horizontal and vertical skew angles in degrees
     * @param {Point} [center={@link View#center}]
     * @see Matrix#shear(skew[, center])
     */
    /**
     * Skews the view by the given angles from its center point, or optionally
     * by a supplied point.
     *
     * @name View#skew
     * @function
     * @param {Number} hor the horizontal skew angle in degrees
     * @param {Number} ver the vertical sskew angle in degrees
     * @param {Point} [center={@link View#center}]
     * @see Matrix#shear(hor, ver[, center])
     */

    /**
     * Transform the view.
     *
     * @param {Matrix} matrix the matrix by which the view shall be transformed
     */
    transform: function(matrix) {
        this._matrix.append(matrix);
    },

    /**
     * Scrolls the view by the given vector.
     *
     * @param {Point} point
     * @deprecated use {@link #translate(delta)} instead (using opposite
     *     direction).
     */
    scrollBy: function(/* point */) {
        this.translate(Point.read(arguments).negate());
    }
}), /** @lends View# */{
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
     * @name View#onFrame
     * @property
     * @type ?Function
     * @see Item#onFrame
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
     */

    /**
     * Handler function that is called whenever a view is resized.
     *
     * @name View#onResize
     * @property
     * @type ?Function
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
     */

    /**
     * The function to be called when the mouse button is pushed down on the
     * view. The function receives a {@link MouseEvent} object which contains
     * information about the mouse event.
     * Note that such mouse events bubble up the scene graph hierarchy, reaching
     * the view at the end, unless they are stopped before with {@link
     * Event#stopPropagation()} or by returning `false` from a handler.
     *
     * @name View#onMouseDown
     * @property
     * @type ?Function
     * @see Item#onMouseDown
     */

    /**
     * The function to be called when the mouse position changes while the mouse
     * is being dragged over the view. The function receives a {@link
     * MouseEvent} object which contains information about the mouse event.
     * Note that such mouse events bubble up the scene graph hierarchy, reaching
     * the view at the end, unless they are stopped before with {@link
     * Event#stopPropagation()} or by returning `false` from a handler.
     *
     * @name View#onMouseDrag
     * @property
     * @type ?Function
     * @see Item#onMouseDrag
     */

    /**
     * The function to be called when the mouse button is released over the item.
     * The function receives a {@link MouseEvent} object which contains
     * information about the mouse event.
     *
     * @name View#onMouseUp
     * @property
     * @type ?Function
     * @see Item#onMouseUp
     */

    /**
     * The function to be called when the mouse clicks on the view. The function
     * receives a {@link MouseEvent} object which contains information about the
     * mouse event.
     * Note that such mouse events bubble up the scene graph hierarchy, reaching
     * the view at the end, unless they are stopped before with {@link
     * Event#stopPropagation()} or by returning `false` from a handler.
     *
     * @name View#onClick
     * @property
     * @type ?Function
     * @see Item#onClick
     */

    /**
     * The function to be called when the mouse double clicks on the view. The
     * function receives a {@link MouseEvent} object which contains information
     * about the mouse event.
     * Note that such mouse events bubble up the scene graph hierarchy, reaching
     * the view at the end, unless they are stopped before with {@link
     * Event#stopPropagation()} or by returning `false` from a handler.
     *
     * @name View#onDoubleClick
     * @property
     * @type ?Function
     * @see Item#onDoubleClick
     */

    /**
     * The function to be called repeatedly while the mouse moves over the
     * view. The function receives a {@link MouseEvent} object which contains
     * information about the mouse event.
     * Note that such mouse events bubble up the scene graph hierarchy, reaching
     * the view at the end, unless they are stopped before with {@link
     * Event#stopPropagation()} or by returning `false` from a handler.
     *
     * @name View#onMouseMove
     * @property
     * @type ?Function
     * @see Item#onMouseMove
     */

    /**
     * The function to be called when the mouse moves over the view. This
     * function will only be called again, once the mouse moved outside of the
     * view first. The function receives a {@link MouseEvent} object which
     * contains information about the mouse event.
     * Note that such mouse events bubble up the scene graph hierarchy, reaching
     * the view at the end, unless they are stopped before with {@link
     * Event#stopPropagation()} or by returning `false` from a handler.
     *
     * @name View#onMouseEnter
     * @property
     * @type ?Function
     * @see Item#onMouseEnter
     */

    /**
     * The function to be called when the mouse moves out of the view.
     * The function receives a {@link MouseEvent} object which contains
     * information about the mouse event.
     * Note that such mouse events bubble up the scene graph hierarchy, reaching
     * the view at the end, unless they are stopped before with {@link
     * Event#stopPropagation()} or by returning `false` from a handler.
     *
     * @name View#onMouseLeave
     * @property
     * @type ?Function
     * @see View#onMouseLeave
     */


    /**
     * {@grouptitle Event Handling}
     *
     * Attach an event handler to the view.
     *
     * @name View#on
     * @function
     * @param {String} type the type of event: {@values 'frame', 'resize',
     *     'mousedown', 'mouseup', 'mousedrag', 'click', 'doubleclick',
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
     * @param {String} type the event type: {@values 'frame', 'resize',
     *     'mousedown', 'mouseup', 'mousedrag', 'click', 'doubleclick',
     *     'mousemove', 'mouseenter', 'mouseleave'}
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
     * @param {String} type the event type: {@values 'frame', 'resize',
     *     'mousedown', 'mouseup', 'mousedrag', 'click', 'doubleclick',
     *     'mousemove', 'mouseenter', 'mouseleave'}
     * @param {Object} event an object literal containing properties describing
     * the event
     * @return {Boolean} {@true if the event had listeners}
     */

    /**
     * Check if the view has one or more event handlers of the specified type.
     *
     * @name View#responds
     * @function
     * @param {String} type the event type: {@values 'frame', 'resize',
     *     'mousedown', 'mouseup', 'mousedrag', 'click', 'doubleclick',
     *     'mousemove', 'mouseenter', 'mouseleave'}
     * @return {Boolean} {@true if the view has one or more event handlers of
     * the specified type}
     */
}, {
    statics: {
        _views: [],
        _viewsById: {},
        _id: 0,

        create: function(project, element) {
            if (document && typeof element === 'string')
                element = document.getElementById(element);
            // Factory to provide the right View subclass for a given element.
            // Produces only CanvasView or View items (for workers) for now:
            var ctor = window ? CanvasView : View;
            return new ctor(project, element);
        }
    }
},
new function() { // Injection scope for event handling on the browser
    if (!window)
        return;
    /**
     * Native event handling, coordinate conversion, focus handling and
     * delegation to view and tool objects.
     */
    var prevFocus,
        tempFocus,
        dragging = false, // mousedown that started on a view.
        mouseDown = false; // mousedown anywhere.

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
        view._handleMouseEvent('mousemove', event, point);
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
        if (!dragging) {
            dragging = true;
            view._handleMouseEvent('mousedown', event);
        }
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

    docEvents[mousedown] = function() {
        // In order to not switch views during scroll dragging on touch devices,
        // we need to know if the mouse was clicked anywhere on the document
        // (see docEvents[mousemove]) The rest happens in viewEvents[mousedown].
        mouseDown = true;
    };

    docEvents[mouseup] = function(event) {
        var view = View._focused;
        if (view && dragging)
            view._handleMouseEvent('mouseup', event);
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
        prevented = false,
        // Event fallbacks for "virutal" events, e.g. if an item doesn't respond
        // to doubleclick, fall back to click:
        fallbacks = {
            doubleclick: 'click',
            mousedrag: 'mousemove'
        },
        // Various variables required by #_handleMouseEvent()
        wasInView = false,
        overView,
        downPoint,
        lastPoint,
        downItem,
        overItem,
        dragItem,
        clickItem,
        clickTime,
        dblClick;

    // Returns true if event was prevented, false otherwise.
    function emitMouseEvent(obj, target, type, event, point, prevPoint,
            stopItem) {
        var stopped = false,
            mouseEvent;

        // Returns true if the event was stopped, false otherwise.
        function emit(obj, type) {
            if (obj.responds(type)) {
                // Only produce the event object if we really need it, and then
                // reuse it if we're bubbling.
                if (!mouseEvent) {
                    mouseEvent = new MouseEvent(type, event, point,
                            target || obj,
                            // Calculate delta if prevPoint was passed
                            prevPoint ? point.subtract(prevPoint) : null);
                }
                if (obj.emit(type, mouseEvent)) {
                    called = true;
                    if (mouseEvent.prevented)
                        prevented = true;
                    // Bail out if propagation is stopped
                    if (mouseEvent.stopped)
                        return stopped = true;
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
                break;
            obj = obj._parent;
        }
        return stopped;
    }

    // Returns true if event was stopped, false otherwise.
    function emitMouseEvents(view, hitItem, type, event, point, prevPoint) {
        // Before handling events, process removeOn() calls for cleanup.
        // NOTE: As soon as there is one event handler receiving mousedrag
        // events, non of the removeOnMove() items will be removed while the
        // user is dragging.
        view._project.removeOn(type);
        // Set called and prevented to false, so they will reflect if the
        // following calls to emitMouseEvent() have called a handler, and if
        // and of the handlers called event.preventDefault()
        prevented = called = false;
        // First handle the drag-item and its parents, through bubbling.
        return (dragItem && emitMouseEvent(dragItem, null, type, event,
                    point, prevPoint)
            // Next handle the hit-item, if it's different from the drag-item
            // and not a descendant of it (in which case it would already have
            // received an event in the call above). Translate mousedrag to
            // mousemove, since drag is handled above.
            || hitItem && hitItem !== dragItem
                && !hitItem.isDescendant(dragItem)
                && emitMouseEvent(hitItem, null, type === 'mousedrag' ?
                    'mousemove' : type, event, point, prevPoint, dragItem)
            // Lastly handle the mouse events on the view, if we're still here.
            || emitMouseEvent(view, dragItem || hitItem || view, type, event,
                    point, prevPoint));
    }

    /**
     * Lookup defining which native events are required by which item events.
     * Required by code that is counting the amount of required natives events.
     * The mapping is native -> virtual.
     */
    var itemEventsMap = {
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

    return {
        _viewEvents: viewEvents,

        /**
         * Private method to handle mouse events, and delegate to items and
         * tools.
         */
        _handleMouseEvent: function(type, event, point) {
            var itemEvents = this._itemEvents,
                // Look up hitItems, which tells us whether a given native mouse
                // event requires an item hit-test or not, before changing type
                // to the virtual value (e.g. mousemove -> mousedrag):
                hitItems = itemEvents.native[type],
                nativeMove = type === 'mousemove',
                tool = this._scope.tool,
                view = this;

            function responds(type) {
                return itemEvents.virtual[type] || view.responds(type)
                        || tool && tool.responds(type);
            }

            // If it's a native mousemove event but the mouse is down, and at
            // least one of the events responds to mousedrag, convert to it.
            // NOTE: emitMouseEvent(), as well as Tool#_handleMouseEvent() fall
            // back to mousemove if the objects don't respond to mousedrag.
            if (nativeMove && dragging && responds('mousedrag'))
                type = 'mousedrag';
            if (!point)
                point = this.getEventPoint(event);

            // Run the hit-test on items first, but only if we're required to do
            // so for this given mouse event, see hitItems, #_countItemEvent():
            var inView = this.getBounds().contains(point),
                hit = hitItems && inView && view._project.hitTest(point, {
                    tolerance: 0,
                    fill: true,
                    stroke: true
                }),
                hitItem = hit && hit.item || null,
                // Keep track if view event should be handled, so we can use it
                // to decide if tool._handleMouseEvent() shall be called after.
                handle = false,
                mouse = {};
            // Create a simple lookup object to quickly check for different
            // mouse event types.
            mouse[type.substr(5)] = true;

            // Handle mouseenter / leave between items and views first.
            if (hitItems && hitItem !== overItem) {
                if (overItem) {
                    emitMouseEvent(overItem, null, 'mouseleave', event, point);
                }
                if (hitItem) {
                    emitMouseEvent(hitItem, null, 'mouseenter', event, point);
                }
                overItem = hitItem;
            }
            // Handle mouseenter / leave on the view.
            if (wasInView ^ inView) {
                emitMouseEvent(this, null, inView ? 'mouseenter' : 'mouseleave',
                        event, point);
                overView = inView ? this : null;
                handle = true; // To include the leaving move.
            }
            // Now handle the mousemove / mousedrag event.
            // Always call the view's mouse handlers first, as required by
            // CanvasView, and then handle the active tool after, if any.
            // mousedrag is allowed to leave the view and still triggers events,
            // but do not trigger two subsequent even with the same location.
            if ((inView || mouse.drag) && !point.equals(lastPoint)) {
                // Handle mousemove even if this is not actually a mousemove
                // event but the mouse has moved since the last event.
                emitMouseEvents(this, hitItem, nativeMove ? type : 'mousemove',
                        event, point, lastPoint);
                handle = true;
            }
            wasInView = inView;
            // Now handle mousedown / mouseup
            // We emit mousedown only when in the view, and mouseup regardless,
            // as long as the mousedown event was inside.
            if (mouse.down && inView || mouse.up && downPoint) {
                emitMouseEvents(this, hitItem, type, event, point, downPoint);
                if (mouse.down) {
                    // See if we're clicking again on the same item, within the
                    // double-click time. Firefox uses 300ms as the max time
                    // difference:
                    dblClick = hitItem === clickItem
                        && (Date.now() - clickTime < 300);
                    downItem = clickItem = hitItem;
                    // Only start dragging if the mousedown event has not
                    // prevented the default, and if the hitItem or any of its
                    // parents actually respond to mousedrag events.
                    if (!prevented && hitItem) {
                        var item = hitItem;
                        while (item && !item.responds('mousedrag'))
                            item = item._parent;
                        if (item)
                            dragItem = hitItem;
                    }
                    downPoint = point;
                } else if (mouse.up) {
                    // Emulate click / doubleclick, but only on the hit-item,
                    // not the view.
                    if (!prevented && hitItem === downItem) {
                        clickTime = Date.now();
                        emitMouseEvents(this, hitItem, dblClick ? 'doubleclick'
                                : 'click', event, point, downPoint);
                        dblClick = false;
                    }
                    downItem = dragItem = null;
                }
                // Clear wasInView so we're not accidentally handling mousedrag
                // events that started outside the view as mousemove events on
                // the view (needed to handle touch scrolling correctly).
                wasInView = false;
                handle = true;
            }
            lastPoint = point;
            // Now finally call the tool events, but filter mouse move events
            // to only be fired if we're inside the view or if we just left it.
            // Prevent default if at least one handler was called, and none of
            // them enforces default, to prevent scrolling on touch devices.
            if (handle && tool) {
                called = tool._handleMouseEvent(type, event, point, mouse)
                    || called;
            }

            // Now call `preventDefault()`, if any of these conditions are met:
            // - If any of the handlers were called, except for mousemove events
            //   which can call `preventDefault()` explicitly or return `false`.
            // - If this is a unhandled mousedown event, but the view or tools
            //   respond to mouseup.
            //
            // Some events are not cancelable anyway (like during a scroll
            // inertia on mobile) so trying to prevent default in those case
            // would result in no effect and an error.
            if (
                event.cancelable !== false
                && (called && !mouse.move || mouse.down && responds('mouseup'))
            ) {
                event.preventDefault();
            }
        },

        /**
         * Private method to handle key events.
         */
        _handleKeyEvent: function(type, event, key, character) {
            var scope = this._scope,
                tool = scope.tool,
                keyEvent;

            function emit(obj) {
                if (obj.responds(type)) {
                    // Update global reference to this scope.
                    paper = scope;
                    // Only produce the event object if we really need it.
                    obj.emit(type, keyEvent = keyEvent
                            || new KeyEvent(type, event, key, character));
                }
            }

            if (this.isVisible()) {
                // Call the onKeyDown or onKeyUp handler if present
                emit(this);
                if (tool && tool.responds(type))
                    emit(tool);
            }
        },

        _countItemEvent: function(type, sign) {
            // If the view requires counting of installed mouse events,
            // change the event counters now according to itemEventsMap
            // (defined in the code further above).
            var itemEvents = this._itemEvents,
                native = itemEvents.native,
                virtual = itemEvents.virtual;
            for (var key in itemEventsMap) {
                native[key] = (native[key] || 0)
                        + (itemEventsMap[key][type] || 0) * sign;
            }
            // Also update the count of virtual events installed.
            virtual[type] = (virtual[type] || 0) + sign;
        },

        statics: {
            /**
             * Loops through all views and sets the focus on the first
             * active one.
             */
            updateFocus: updateFocus,

            /**
             * Clear all events handling state information. Made for testing
             * purpose, to have a way to start with a fresh state before each
             * test.
             * @private
             */
            _resetState: function() {
                dragging = mouseDown = called = wasInView = false;
                prevFocus = tempFocus = overView = downPoint = lastPoint =
                    downItem = overItem = dragItem = clickItem = clickTime =
                    dblClick = null;
            }
        }
    };
});
