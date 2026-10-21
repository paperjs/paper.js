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
     * @param {HTMLCanvasElement} canvas the Canvas object that this view should
     *     wrap
     */
    /**
     * Creates a view object that wraps a newly created canvas element.
     *
     * @name CanvasView#initialize
     * @param {Size} size the size of the canvas to be created
     */
    initialize: function CanvasView(project, canvas) {
        // Handle canvas argument
        if (!(canvas instanceof window.HTMLCanvasElement)) {
            // See if the arguments describe the view size:
            var size = Size.read(arguments, 1);
            if (size.isZero())
                throw new Error(
                        'Cannot create CanvasView with the provided argument: '
                        + Base.slice(arguments, 1));
            canvas = CanvasProvider.getCanvas(size);
        }
        var ctx = this._context = canvas.getContext('2d');
        // Save context right away, and restore in #remove(). Also restore() and
        // save() again in _setElementSize() to prevent accumulation of scaling.
        ctx.save();
        this._pixelRatio = 1;
        if (!/^off|false$/.test(PaperScope.getAttribute(canvas, 'hidpi'))) {
            // Hi-DPI Canvas support based on:
            // https://www.html5rocks.com/en/tutorials/canvas/hidpi/
            this._pixelRatio = window.devicePixelRatio || 1;
        }
        View.call(this, project, canvas);
        // We can't be sure the canvas is clear
        this._needsUpdate = true;
    },

    remove: function remove() {
        this._context.restore();
        return remove.base.call(this);
    },

    _setElementSize: function _setElementSize(width, height) {
        var pixelRatio = this._pixelRatio,
            element = this._element;
        // Upscale the canvas if the pixel ratio is more than 1.
        _setElementSize.base.call(this, width * pixelRatio, height * pixelRatio);
        // Set the size of non-resizable canvases through their style, as they
        // would appear too big on HiDPI screens otherwise. Also at a pixel
        // ratio of 1, so they behave the same on every screen (#2088):
        if (!PaperScope.hasAttribute(element, 'resize')) {
            // With border-box sizing, the style includes padding and border:
            var style = element.style,
                insets = DomElement.getStyles(element).boxSizing
                    === 'border-box'
                        ? DomElement.getInsets(element)
                        : new Size();
            style.width = (width + insets.width) + 'px';
            style.height = (height + insets.height) + 'px';
        }
        if (pixelRatio !== 1) {
            // Scale the context to counter the fact that we've manually scaled
            // our canvas element.
            var ctx = this._context;
            ctx.restore();
            ctx.save();
            ctx.scale(pixelRatio, pixelRatio);
        }
    },

    getContext: function() {
        return this._context;
    },

    /**
     * Converts the provide size in any of the units allowed in the browser to
     * pixels.
     */
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
        if (!this._needsUpdate && !force)
            return false;
        var project = this._project,
            ctx = this._context,
            size = this._viewSize;
        ctx.clearRect(0, 0, size.width + 1, size.height + 1);
        if (project)
            project.draw(ctx, this._matrix, this._pixelRatio);
        this._needsUpdate = false;
        return true;
    }
});
