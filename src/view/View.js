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
 *
 * If the canvas element has a `resize` or `data-paper-resize` attribute, the
 * view adjusts its size to the size of the element whenever the window is
 * resized. The element itself needs to be sized through CSS, e.g. with
 * `html, body { height: 100%; }` and `canvas[resize] { width: 100%; height:
 * 100%; }` for a canvas that fills the window. Without such CSS, the view does
 * not follow the window, and on HiDPI screens it grows with each resize.
 * Without the attribute, the view sets the element's CSS width and height to
 * its own size, see {@link #viewSize}.
 */
var View = Base.extend(Emitter, /** @lends View# */{
    _class: 'View',

    initialize: function View(project, element) {

        function getSize(name) {
            return element[name] || parseInt(element.getAttribute(name), 10);
        }

        function getCanvasSize() {
            // Try the CSS size first, since that will help handling previously
            // scaled canvases (e.g. when dealing with pixel-ratio), without the
            // padding and border (#1160, #2033), and without the transforms of
            // ancestors, which only scale the canvas on screen:
            var size = new Size(element.offsetWidth, element.offsetHeight);
            return size.isNaN() || size.isZero()
                    // If the element is invisible, we cannot directly access
                    // element.width / height, because they would appear 0.
                    // Reading the attributes should still work.
                    ? new Size(getSize('width'), getSize('height'))
                    : size.subtract(DomElement.getInsets(element));
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
     * event handlers for interaction, animation and load events, this method is
     * invoked for you automatically at the end.
     *
     * @param {Boolean} [force=false] whether to redraw the view even if nothing
     * has changed, e.g. after a web font used by text items has finished
     * loading
     * @return {Boolean} {@true if the view was updated}
     */
    update: function(force) {
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
                    // picks up again as soon as the view is visible. Views
                    // without an element, as in web workers, always animate.
                    if (!element
                            || (!DomElement.getPrefixed(document, 'hidden')
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
     * The project that this view displays.
     *
     * @bean
     * @type Project
     */
    getProject: function() {
        return this._project;
    },

    /**
     * The scope that this view belongs to.
     *
     * @bean
     * @type PaperScope
     */
    getScope: function() {
        return this._scope;
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
     * Setting them fits the view to the given rectangle, as
     * {@link #fitBounds(rectangle)} does. Since the view keeps its aspect
     * ratio, the bounds read back can be larger than the rectangle in one
     * direction.
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

    setBounds: function(/* rect */) {
        this.fitBounds(Rectangle.read(arguments));
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

    // Text is measured with a canvas context: the view's own, or one from the
    // CanvasProvider, which also works in workers with an OffscreenCanvas.
    // Without either, sizes are read as pixels, and text has no width.
    getPixelSize: function(size) {
        var agent = paper.agent,
            element = this._element,
            ctx,
            pixels;
        if (element && agent && agent.firefox) {
            // Firefox doesn't convert context.font sizes to pixels, so use the
            // DOM there, which still doesn't work in workers:
            var parent = element.parentNode,
                temp = document.createElement('div');
            temp.style.fontSize = size;
            parent.appendChild(temp);
            pixels = parseFloat(DomElement.getStyles(temp).fontSize);
            parent.removeChild(temp);
        } else if (ctx = this._context || CanvasProvider.getContext(1, 1)) {
            var prevFont = ctx.font;
            ctx.font = size + ' serif';
            pixels = parseFloat(ctx.font);
            ctx.font = prevFont;
            if (ctx !== this._context)
                CanvasProvider.release(ctx);
        } else {
            pixels = parseFloat(size);
        }
        return pixels;
    },

    getTextWidth: function(font, lines, letterSpacing) {
        var ctx = this._context || CanvasProvider.getContext(1, 1),
            width = 0;
        if (ctx) {
            var prevFont = ctx.font,
                prevLetterSpacing = ctx.letterSpacing;
            ctx.font = font;
            ctx.letterSpacing = letterSpacing;
            // Measure the real width of the text:
            for (var i = 0, l = lines.length; i < l; i++)
                width = Math.max(width, ctx.measureText(lines[i]).width);
            ctx.font = prevFont;
            ctx.letterSpacing = prevLetterSpacing;
            if (ctx !== this._context)
                CanvasProvider.release(ctx);
        }
        return width;
    },

    getFontMetrics: function(font) {
        var ctx = this._context || CanvasProvider.getContext(1, 1),
            metrics = null;
        if (ctx) {
            var prevFont = ctx.font;
            ctx.font = font;
            // Browsers tell the font's own ascent and descent, node-canvas
            // those of its em box:
            var measured = ctx.measureText('H'),
                ascent = measured.fontBoundingBoxAscent,
                descent = measured.fontBoundingBoxDescent;
            if (ascent === undefined) {
                ascent = measured.emHeightAscent;
                descent = measured.emHeightDescent;
            }
            if (ascent !== undefined)
                metrics = { ascent: ascent, descent: descent };
            ctx.font = prevFont;
            if (ctx !== this._context)
                CanvasProvider.release(ctx);
        }
        return metrics;
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
     * Setting it to a value that isn't a positive number has no effect.
     *
     * @bean
     * @type Number
     * @see #scaling
     */
    getZoom: function() {
        var scaling = this._decompose().scaling;
        // Use average since it can be non-uniform, and ignore mirroring.
        return (Math.abs(scaling.x) + Math.abs(scaling.y)) / 2;
    },

    setZoom: function(zoom) {
        // Zooming to 0 can't be undone and leaves the view's matrix without an
        // inverse (#1433):
        if (zoom > 0 && isFinite(zoom)) {
            this.transform(new Matrix().scale(zoom / this.getZoom(),
                this.getCenter()));
        }
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
            // Rotate around the center in view coordinates, so the rotation
            // adds to the decomposed one, also on mirrored views (#1893):
            this._matrix.prepend(new Matrix().rotate(rotation - current,
                    this.projectToView(this.getCenter())));
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
     * Transform the view so that the specified rectangle is centered in it
     * and fitted to it as described by `fit`, keeping the view's rotation and
     * mirroring.
     *
     * @param {Rectangle} rectangle the rectangle to fit, in project
     * coordinates
     * @param {String} [fit='contain'] how to fit the rectangle, as in CSS's
     * `object-fit`: `'contain'` shows all of it, and `'cover'` fills the
     * whole view with it, cropping the parts that don't fit
     *
     * @example {@paperscript height=100}
     * // Fitting the view to the bounds of an item:
     *
     * // Create a circle shaped path around the top left corner of the view:
     * var path = new Path.Circle({
     *     center: [0, 0],
     *     radius: 50,
     *     fillColor: 'orange'
     * });
     *
     * // Make the view show the whole circle:
     * view.fitBounds(path.bounds);
     */
    fitBounds: function(rectangle, fit) {
        rectangle = Rectangle.read(arguments);
        fit = Base.read(arguments);
        // Compare the rectangle with the view in view coordinates, so that
        // rotated views show all of it as well, and scale both axes of the view
        // to the same amount, so that the rectangle keeps its aspect ratio,
        // also if the view was stretched before:
        var matrix = this._matrix,
            size = this._viewSize,
            bounds = matrix._transformBounds(rectangle),
            scaleX = new Point(matrix._a, matrix._c).getLength(),
            scaleY = new Point(matrix._b, matrix._d).getLength(),
            // Empty sides of the rectangle give ratios of Infinity, which can't
            // scale the view, so only use the others:
            ratios = [
                size.width / bounds.width * scaleX,
                size.height / bounds.height * scaleY
            ].filter(function(ratio) {
                return ratio > 0 && isFinite(ratio);
            });
        this.setCenter(rectangle.getCenter());
        if (ratios.length) {
            var amount = fit === 'cover'
                    ? Math.max.apply(Math, ratios)
                    : Math.min.apply(Math, ratios);
            // Scale around the view's center in view coordinates, along the
            // view's own axes:
            matrix.prepend(new Matrix().scale(
                    new Point(amount / scaleX, amount / scaleY),
                    size.divide(2)));
        }
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
        var element = this._element,
            offset = DomEvent.getOffset(event, element),
            size = DomElement.getSize(element);
        // Map the offset on screen, with CSS sizes and transforms applied, to
        // the content box in view coordinates (#549, #1729). Elements that
        // aren't rendered have no size to map from:
        if (!size.isZero()) {
            var cssSize = new Size(element.offsetWidth, element.offsetHeight);
            offset = offset.multiply(cssSize.divide(size))
                    .subtract(DomElement.getInsets(element, true))
                    .multiply(this.getViewSize().divide(
                        cssSize.subtract(DomElement.getInsets(element))));
        }
        return this.viewToProject(offset);
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
     * The function to be called when the user presses a key on the keyboard.
     * The function receives a {@link KeyEvent} object which contains
     * information about the keyboard event.
     *
     * If the function returns `false`, the keyboard event will be prevented
     * from bubbling up. This can be used for example to stop the window from
     * scrolling, when you need the user to interact with arrow keys.
     *
     * @name View#onKeyDown
     * @property
     * @type ?Function
     *
     * @example {@paperscript}
     * // Scaling a path whenever the user presses the space bar:
     *
     * // Create a circle shaped path:
     * var path = new Path.Circle({
     *     center: new Point(50, 50),
     *     radius: 30,
     *     fillColor: 'red'
     * });
     *
     * view.onKeyDown = function(event) {
     *     if (event.key == 'space') {
     *         // Scale the path by 110%:
     *         path.scale(1.1);
     *
     *         // Prevent the key event from bubbling
     *         return false;
     *     }
     * }
     */

    /**
     * The function to be called when the user releases a key on the keyboard.
     * The function receives a {@link KeyEvent} object which contains
     * information about the keyboard event.
     *
     * If the function returns `false`, the keyboard event will be prevented
     * from bubbling up. This can be used for example to stop the window from
     * scrolling, when you need the user to interact with arrow keys.
     *
     * @name View#onKeyUp
     * @property
     * @type ?Function
     *
     * @example
     * view.onKeyUp = function(event) {
     *     if (event.key == 'space') {
     *         console.log('The spacebar was released!');
     *     }
     * }
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
new function() { // Injection scope for mouse and key event handling
    /**
     * Native event handling, coordinate conversion, focus handling and
     * delegation to view and tool objects. The handling is shared by the DOM
     * events in the browser, and #dispatchMouseEvent() and #dispatchKeyEvent()
     * for hosts without a DOM, such as workers.
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

    // The DOM events, which install themselves on the elements of views, see
    // _viewEvents, and on the document:
    var viewEvents = {};

    if (window) {
        // Touch handling inspired by Hammer.js
        var mousedown = 'touchstart',
            mousemove = 'touchmove',
            mouseup = 'touchend touchcancel';
        // Do not add mouse events on mobile and tablet devices
        if (!('ontouchstart' in window && window.navigator.userAgent.match(
                /mobile|tablet|ip(ad|hone|od)|android|silk/i))) {
            // For mixed browsers, like chrome on Windows8 touch laptop.
            mousedown += ' mousedown';
            mousemove += ' mousemove';
            mouseup += ' mouseup';
        }

        var docEvents = {
            // NOTE: mouseleave does not seem to work on document in IE:
            mouseout: function(event) {
                // When the moues leaves the document, fire one last mousemove
                // event, to give items the change to receive a mouseleave, etc.
                var view = View._focused,
                    target = DomEvent.getRelatedTarget(event);
                if (view && (!target || target.nodeName === 'HTML'))
                    handleMouseMove(view, event);
            },

            scroll: updateFocus
        };

        // mousemove and mouseup events need to be installed on document, not
        // the view element, since we want to catch the end of drag events even
        // outside our view. Only the mousedown events are installed on the
        // view, as defined by _viewEvents below.
        viewEvents[mousedown] = function(event) {
            // Get the view from the event, and store a reference to the view
            // that should receive keyboard input.
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
                        // Temporarily focus this view without making it sticky,
                        // so Key events are handled too during the mouse over.
                        // As we switch view, fire one last mousemove in the old
                        // view, to let items receive receive a mouseleave, etc.
                        if (view)
                            handleMouseMove(view, event);
                        if (!prevFocus)
                            prevFocus = view;
                        view = View._focused = tempFocus = target;
                    }
                } else if (tempFocus && tempFocus === view) {
                    // Clear temporary focus again and switch back to previous
                    // focus but only if it is still valid (still in the DOM).
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
            // In order to not switch views during scroll dragging on touch
            // devices, we need to know if the mouse was clicked anywhere on the
            // document (see docEvents[mousemove]) The rest happens in
            // viewEvents[mousedown].
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
    }

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

    // Stands in for the DOM event in #dispatchMouseEvent() and
    // #dispatchKeyEvent(), with what the handling reads from it. Hosts can
    // pass the state of the modifier keys, see Key.modifiers:
    function createEvent(type, options) {
        if (options.modifiers)
            Key.modifiers.set(options.modifiers);
        return {
            type: type,
            // options.timeStamp in milliseconds is deprecated:
            timeStamp: options.time != null ? options.time * 1000
                    : options.timeStamp != null ? options.timeStamp
                    : Date.now(),
            button: options.button || 0,
            cancelable: true,
            defaultPrevented: false,
            preventDefault: function() {
                this.defaultPrevented = true;
            },
            stopPropagation: function() {}
        };
    }

    /**
     * Lookup defining which native events are required by which item events.
     * Required by code that is counting the amount of required natives events.
     * The mapping is native -> virtual.
     */
    var itemEventsMap = {
        // mouseup too, as the press needs the item for needsUp():
        mousedown: {
            mousedown: 1,
            mouseup: 1,
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

    return /** @lends View# */{
        _viewEvents: viewEvents,

        /**
         * Handles a mouse event that the host provides, for hosts without a
         * DOM, such as workers, or with their own event source. It runs the
         * same handling as the DOM's mouse events: the active tool's handlers,
         * with {@link Tool#minDistance} and the like, then those of the items
         * under the point and of the view, including the events that Paper.js
         * derives itself: `'mousedrag'`, `'click'`, `'doubleclick'`,
         * `'mouseenter'` and `'mouseleave'`. Points outside the view's bounds
         * are handled too, since the host decides which events belong to its
         * drawing surface.
         *
         * @option [options.modifiers] {Object} the state of the modifier keys,
         *     see {@link Key#modifiers}
         * @option [options.button=0] {Number} the mouse button
         * @option [options.time=Date.now() / 1000] {Number} the time of the
         *     event in seconds, see {@link Event#time}
         *
         * @param {String} type the type of the event: {@values 'mousedown',
         *     'mousemove', 'mouseup'}
         * @param {Point} point the location of the mouse in project coordinates
         * @param {Object} [options] the details of the event
         * @return {Boolean} {@true if a handler prevented the event's default}
         */
        dispatchMouseEvent: function(type, point, options) {
            if (!/^mouse(down|move|up)$/.test(type))
                throw new Error('Unknown mouse event type: \'' + type + '\'.');
            var event = createEvent(type, options || {});
            // Track presses and drags as the DOM events do:
            if (type === 'mousedown') {
                View._focused = this;
                mouseDown = dragging = true;
            }
            this._handleMouseEvent(type, event, new Point(point), true);
            if (type === 'mouseup')
                mouseDown = dragging = false;
            return event.defaultPrevented;
        },

        /**
         * Handles a key event that the host provides, for hosts without a DOM,
         * such as workers, or with their own event source. It updates
         * {@link Key#modifiers} and {@link Key#isDown(key)}, and calls the
         * view's and the active tool's handlers, as the DOM's key events do.
         *
         * @option [options.character] {String} the character that the key
         *     produces. By default, keydown takes the key itself if it is a
         *     single character, the space, carriage return and tab characters
         *     for 'space', 'enter' and 'tab', and keyup the character of its
         *     keydown
         * @option [options.modifiers] {Object} the state of the modifier keys,
         *     see {@link Key#modifiers}
         * @option [options.time=Date.now() / 1000] {Number} the time of the
         *     event in seconds, see {@link Event#time}
         *
         * @param {String} type the type of the event: {@values 'keydown',
         *     'keyup'}
         * @param {String} key the key, as in {@link KeyEvent#key}
         * @param {Object} [options] the details of the event
         */
        dispatchKeyEvent: function(type, key, options) {
            if (!/^key(down|up)$/.test(type))
                throw new Error('Unknown key event type: \'' + type + '\'.');
            options = options || {};
            Key._handleKey(type === 'keydown', key, options.character,
                    createEvent(type, options), this);
        },

        /**
         * Private method to handle mouse events, and delegate to items and
         * tools.
         */
        _handleMouseEvent: function(type, event, point, dispatched) {
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

            // Whether the press needs its default prevented for the events
            // that follow it: the view's or the tool's mouseup, or those of the
            // hit item and its ancestors. Presses elsewhere are left to the
            // browser, so touches can scroll the page (#1930):
            function needsUp(hitItem) {
                if (view.responds('mouseup')
                        || tool && tool.responds('mouseup'))
                    return true;
                for (var item = hitItem; item; item = item._parent) {
                    for (var key in itemEventsMap.mouseup) {
                        if (item.responds(key))
                            return true;
                    }
                }
                return false;
            }

            // DOM events know the state of the modifier keys, also of those
            // pressed or released while the page didn't have the focus, so no
            // key event told us about them (#1140):
            if (event.shiftKey !== undefined) {
                Key.modifiers.set({
                    shift: event.shiftKey,
                    control: event.ctrlKey,
                    alt: event.altKey,
                    meta: event.metaKey
                });
            }
            // If it's a native mousemove event but the mouse is down, and at
            // least one of the events responds to mousedrag, convert to it.
            // NOTE: emitMouseEvent(), as well as Tool#_handleMouseEvent() fall
            // back to mousemove if the objects don't respond to mousedrag.
            if (nativeMove && dragging && responds('mousedrag'))
                type = 'mousedrag';
            if (!point)
                point = this.getEventPoint(event);

            // The moves come from the whole document, so outside of drags, the
            // pointer is only over the view when no other element covers it,
            // such as a menu (#992). Its own element and its ancestors don't:
            var target = DomEvent.getTarget(event),
                isCovered = nativeMove && !dragging && target
                        && target.nodeType === 1
                        && !target.contains(this._element),
                inView = dispatched
                        || !isCovered && this.getBounds().contains(point),
                // Run the hit-test on items first, but only if we're required
                // to do so for this given mouse event, see hitItems and
                // #_countItemEvent():
                hit = hitItems && inView && view._project.hitTest(point, {
                    tolerance: view._scope.settings.hitTolerance,
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
                    // double-click time and distance, measured from mousedown
                    // to mousedown like native dblclick events, but not for a
                    // third click. Firefox uses 300ms as the max time
                    // difference:
                    var time = Date.now();
                    dblClick = !dblClick && hitItem === clickItem
                        && time - clickTime < 300
                        && point.getDistance(downPoint) < 3;
                    downItem = clickItem = hitItem;
                    clickTime = time;
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
                        emitMouseEvents(this, hitItem, dblClick ? 'doubleclick'
                                : 'click', event, point, downPoint);
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
            // - If this is a unhandled mousedown event, but what follows needs
            //   it, see needsUp().
            //
            // Some events are not cancelable anyway (like during a scroll
            // inertia on mobile) so trying to prevent default in those case
            // would result in no effect and an error.
            if (
                event.cancelable !== false
                && (called && !mouse.move || mouse.down && needsUp(hitItem))
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

            // Call the onKeyDown or onKeyUp handler if present
            emit(this);
            if (tool && tool.responds(type))
                emit(tool);
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
                prevFocus = tempFocus = downPoint = lastPoint =
                    downItem = overItem = dragItem = clickItem = clickTime =
                    dblClick = null;
            }
        }
    };
});
