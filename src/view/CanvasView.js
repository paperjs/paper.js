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
        if (!(canvas instanceof window.HTMLCanvasElement)) {
            // See if the arguments describe the view size:
            var size = Size.read(arguments, 1);
            if (size.isZero())
                throw new Error(
                        'Cannot create CanvasView with the provided argument: '
                        + [].slice.call(arguments, 1));
            canvas = CanvasProvider.getCanvas(size);
        }
        this._context = canvas.getContext('2d');
        this._pixelRatio = 1;
        if (!/^off|false$/.test(PaperScope.getAttribute(canvas, 'hidpi'))) {
            // Hi-DPI Canvas support based on:
            // http://www.html5rocks.com/en/tutorials/canvas/hidpi/
            var deviceRatio = window.devicePixelRatio || 1,
                backingStoreRatio = DomElement.getPrefixed(this._context,
                        'backingStorePixelRatio') || 1;
            this._pixelRatio = deviceRatio / backingStoreRatio;
        }
        View.call(this, project, canvas);
    },

    _setViewSize: function _setViewSize(width, height) {
        var pixelRatio = this._pixelRatio;
        // Upscale the canvas if the pixel ratio is more than 1.
        _setViewSize.base.call(this, width * pixelRatio, height * pixelRatio);
        if (pixelRatio !== 1) {
            var element = this._element;
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
     * pixels.
     */
    getPixelSize: function(size) {
        var agent = paper.agent,
            pixels;
        if (agent && agent.firefox) {
            // Firefox doesn't appear to convert context.font sizes to pixels,
            // while other browsers do. Workaround:
            var parent = this._element.parentNode,
                temp = document.createElement('div');
            temp.style.fontSize = size;
            parent.appendChild(temp);
            pixels = parseFloat(DomElement.getStyles(temp).fontSize);
            parent.removeChild(temp);
        } else {
            var ctx = this._context,
                prevFont = ctx.font;
            ctx.font = size + ' serif';
            pixels = parseFloat(ctx.font);
            ctx.font = prevFont;
        }
        return pixels;
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
     * @return {Boolean} {@true if the view was updated}
     */
    update: function() {
        var project = this._project;
        if (!project || !project._needsUpdate)
            return false;
        var ctx = this._context,
            size = this._viewSize;
        ctx.clearRect(0, 0, size.width + 1, size.height + 1);
        project.draw(ctx, this._matrix, this._pixelRatio);
        project._needsUpdate = false;
        return true;
    }
});
