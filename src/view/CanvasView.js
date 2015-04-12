/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2014, Juerg Lehni & Jonathan Puckey
 * http://scratchdisk.com/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name CanvasView
 * @class
 * @private
 */
var CanvasView = View.extend(/** @lends CanvasView# */{
    _class: 'CanvasView',

    /**
     * Creates a view object that wraps a canvas element.
     *
     * @name CanvasView#initialize
     * @param {HTMLCanvasElement} canvas the canvas object that this view should
     * wrap
     */
    /**
     * Creates a view object that wraps a newly created canvas element.
     *
     * @name CanvasView#initialize
     * @param {Size} size the size of the canvas to be created
     */
    initialize: function CanvasView(project, canvas) {
        // Handle canvas argument
        if (!(canvas instanceof HTMLCanvasElement)) {
            // See if the arguments describe the view size:
            var size = Size.read(arguments, 1);
            if (size.isZero())
                throw new Error(
                        'Cannot create CanvasView with the provided argument: '
                        + [].slice.call(arguments, 1));
            canvas = CanvasProvider.getCanvas(size);
        }
        this._context = canvas.getContext('2d');
        // Have Item count installed mouse events.
        this._eventCounters = {};
        this._pixelRatio = 1;
/*#*/ if (__options.environment == 'browser') {
        if (!/^off|false$/.test(PaperScope.getAttribute(canvas, 'hidpi'))) {
            // Hi-DPI Canvas support based on:
            // http://www.html5rocks.com/en/tutorials/canvas/hidpi/
            var deviceRatio = window.devicePixelRatio || 1,
                backingStoreRatio = DomElement.getPrefixed(this._context,
                        'backingStorePixelRatio') || 1;
            this._pixelRatio = deviceRatio / backingStoreRatio;
        }
/*#*/ } // __options.environment == 'browser'
        View.call(this, project, canvas);
    },

    _setViewSize: function(size) {
        var element = this._element,
            pixelRatio = this._pixelRatio,
            width = size.width,
            height = size.height;
        // Upscale the canvas if the pixel ratio is more than 1.
        element.width = width * pixelRatio;
        element.height = height * pixelRatio;
        if (pixelRatio !== 1) {
            // We need to set the correct size on non-resizable canvases through
            // their style when HiDPI is active, as otherwise they would appear
            // too big.
            if (!PaperScope.hasAttribute(element, 'resize')) {
                var style = element.style;
                style.width = width + 'px';
                style.height = height + 'px';
            }
            // Scale the context to counter the fact that we've manually scaled
            // our canvas element.
            this._context.scale(pixelRatio, pixelRatio);
        }
    },

    /**
     * Converts the provide size in any of the units allowed in the browser to
     * pixels, by the use of the context.font property.
     */
    getPixelSize: function(size) {
        var ctx = this._context,
            prevFont = ctx.font;
        ctx.font = size + ' serif';
        size = parseFloat(ctx.font);
        ctx.font = prevFont;
        return size;
    },

    getTextWidth: function(font, lines) {
        var ctx = this._context,
            prevFont = ctx.font,
            width = 0;
        ctx.font = font;
        // Measure the real width of the text. Unfortunately, there is no sane
        // way to measure text height with canvas.
        for (var i = 0, l = lines.length; i < l; i++)
            width = Math.max(width, ctx.measureText(lines[i]).width);
        ctx.font = prevFont;
        return width;
    },

    /**
     * Updates the view if there are changes. Note that when using built-in
     * event hanlders for interaction, animation and load events, this method is
     * invoked for you automatically at the end.
     *
     * @param {Boolean} [force=false] {@true if the view should be updated even
     * if no change has happened}
     * @return {Boolean} {@true if the view was updated}
     */
    update: function(force) {
        var project = this._project;
        if (!project || !force && !project._needsUpdate)
            return false;
        // Initial tests conclude that clearing the canvas using clearRect
        // is always faster than setting canvas.width = canvas.width
        // http://jsperf.com/clearrect-vs-setting-width/7
        var ctx = this._context,
            size = this._viewSize;
        ctx.clearRect(0, 0, size.width + 1, size.height + 1);
        project.draw(ctx, this._matrix, this._pixelRatio);
        project._needsUpdate = false;
        return true;
    }
}, new function() { // Item based mouse handling:

    var downPoint,
        lastPoint,
        overPoint,
        downItem,
        lastItem,
        overItem,
        dragItem,
        dblClick,
        clickTime;

    // Returns true if event was stopped, false otherwise, whether handler was
    // called or not!
    function callEvent(view, type, event, point, target, lastPoint) {
        var item = target,
            mouseEvent;

        function call(obj) {
            if (obj.responds(type)) {
                // Only produce the event object if we really need it, and then
                // reuse it if we're bubbling.
                if (!mouseEvent) {
                    mouseEvent = new MouseEvent(type, event, point, target,
                            // Calculate delta if lastPoint was passed
                            lastPoint ? point.subtract(lastPoint) : null);
                }
                if (obj.emit(type, mouseEvent) && mouseEvent.isStopped) {
                    // Call preventDefault() on native event if mouse event was
                    // handled here.
                    event.preventDefault();
                    return true;
                }
            }
        }

        // Bubble up the DOM and find a parent that responds to this event.
        while (item) {
            if (call(item))
                return true;
            item = item.getParent();
        }
        // Also call event handler on view, if installed.
        if (call(view))
            return true;
        return false;
    }

    return /** @lends CanvasView# */{
        /**
         * Returns true if event was stopped, false otherwise, whether handler
         * was called or not!
         */
        _handleEvent: function(type, point, event) {
            // Drop out if we don't have any event handlers for this type
            if (!this._eventCounters[type])
                return;
            // Run the hit-test first
            var project = this._project,
                hit = project.hitTest(point, {
                    tolerance: 0,
                    fill: true,
                    stroke: true
                }),
                item = hit && hit.item,
                stopped = false;
            // Now handle the mouse events
            switch (type) {
            case 'mousedown':
                stopped = callEvent(this, type, event, point, item);
                // See if we're clicking again on the same item, within the
                // double-click time. Firefox uses 300ms as the max time
                // difference:
                dblClick = lastItem == item && (Date.now() - clickTime < 300);
                downItem = lastItem = item;
                downPoint = lastPoint = overPoint = point;
                // Only start dragging if none of the mosedown events have
                // stopped propagation.
                dragItem = !stopped && item;
                // Find the first item pu the chain that responds to drag.
                // NOTE: Drag event don't bubble
                while (dragItem && !dragItem.responds('mousedrag'))
                    dragItem = dragItem._parent;
                break;
            case 'mouseup':
                // stopping mousup events does not prevent mousedrag / mousemove
                // hanlding here, but it does click / doubleclick
                stopped = callEvent(this, type, event, point, item, downPoint);
                if (dragItem) {
                    // If the point has changed since the last mousedrag event,
                    // send another one
                    if (lastPoint && !lastPoint.equals(point))
                        callEvent(this, 'mousedrag', event, point, dragItem,
                                lastPoint);
                    // If we end up over another item, send it a mousemove event
                    // now. Use point as overPoint, so delta is (0, 0) since
                    // this will be the first mousemove event for this item.
                    if (item !== dragItem) {
                        overPoint = point;
                        callEvent(this, 'mousemove', event, point, item,
                                overPoint);
                    }
                }
                if (!stopped && item && item === downItem) {
                    clickTime = Date.now();
                    callEvent(this, dblClick && downItem.responds('doubleclick')
                            ? 'doubleclick' : 'click', event, downPoint, item);
                    dblClick = false;
                }
                downItem = dragItem = null;
                break;
            case 'mousemove':
                // Allow both mousedrag and mousemove events to stop mousemove
                // events from reaching tools.
                if (dragItem)
                    stopped = callEvent(this, 'mousedrag', event, point,
                            dragItem, lastPoint);
                // TODO: Consider implementing this again? "If we have a
                // mousedrag event, do not send mousemove events to any
                // item while we're dragging."
                // For now, we let other items receive mousemove events even
                // during a drag event.
                // If we change the overItem, reset overPoint to point so
                // delta is (0, 0)
                if (!stopped) {
                    if (item !== overItem)
                        overPoint = point;
                    stopped = callEvent(this, type, event, point, item,
                            overPoint);
                }
                lastPoint = overPoint = point;
                if (item !== overItem) {
                    callEvent(this, 'mouseleave', event, point, overItem);
                    overItem = item;
                    callEvent(this, 'mouseenter', event, point, item);
                }
                break;
            }
            return stopped;
        }
    };
});

/*#*/ if (__options.environment == 'node') {
// Node.js based image exporting code.
CanvasView.inject(new function() {
    // Utility function that converts a number to a string with
    // x amount of padded 0 digits:
    function toPaddedString(number, length) {
        var str = number.toString(10);
        for (var i = 0, l = length - str.length; i < l; i++) {
            str = '0' + str;
        }
        return str;
    }

    var fs = require('fs');

    return {
        // DOCS: CanvasView#exportFrames(param);
        exportFrames: function(param) {
            param = new Base({
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
                startTime = Date.now(),
                lastTime = startTime;

            // Start exporting frames by exporting the first frame:
            exportFrame(param);

            function exportFrame(param) {
                var filename = param.prefix + toPaddedString(count, 6) + '.png',
                    path = param.directory + '/' + filename;
                var out = view.exportImage(path, function() {
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
                // Use new Base() to convert into a Base object, for #toString()
                view.emit('frame', new Base({
                    delta: frameDuration,
                    time: frameDuration * count,
                    count: count
                }));
                count++;
            }
        },

        // DOCS: CanvasView#exportImage(path, callback);
        exportImage: function(path, callback) {
            this.draw();
            var out = fs.createWriteStream(path),
                stream = this._element.createPNGStream();
            // Pipe the png stream to the write stream:
            stream.pipe(out);
            if (callback) {
                out.on('close', callback);
            }
            return out;
        }
    };
});
/*#*/ } // __options.environment == 'node'
