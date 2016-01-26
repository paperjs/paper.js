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
     * @param {Boolean} [force=false] {@true if the view should be updated even
     * if no change has happened}
     * @return {Boolean} {@true if the view was updated}
     */
    update: function(force) {
        var project = this._project;
        if (!project || !force && !project._needsUpdate)
            return false;
        var ctx = this._context,
            size = this._viewSize;
        ctx.clearRect(0, 0, size.width + 1, size.height + 1);
        project.draw(ctx, this._matrix, this._pixelRatio);
        project._needsUpdate = false;
        return true;
    }
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
