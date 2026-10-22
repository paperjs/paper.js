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

var CanvasProvider = Base.exports.CanvasProvider = {
    canvases: [],

    getCanvas: function(width, height, options) {
        // Web-workers have no DOM, but may support OffscreenCanvas:
        if (!window && !self.OffscreenCanvas)
            return null;
        if (typeof width === 'object') {
            options = height;
            height = width.height;
            width = width.width;
        }
        // With options.minimum, a pooled canvas that is at least as large is
        // reused without resizing it, since resizing reallocates its pixels:
        var minimum = options && options.minimum,
            canvases = this.canvases,
            fits = function(canvas) {
                return minimum
                        ? canvas.width >= width && canvas.height >= height
                        : canvas.width === width && canvas.height === height;
            },
            index = canvases.length - 1;
        for (var i = index; i >= 0; i--) {
            if (fits(canvases[i])) {
                index = i;
                break;
            }
        }
        var canvas = index >= 0
                ? canvases.splice(index, 1)[0]
                : window
                    ? document.createElement('canvas')
                    : new self.OffscreenCanvas(width, height),
            ctx = canvas.getContext('2d', options || {});
        if (!ctx) {
            throw new Error('Canvas ' + canvas +
                    ' is unable to provide a 2D context.');
        }
        if (fits(canvas)) {
            // Clear the reused pixels and reset the context's state:
            if (ctx.reset) {
                ctx.reset();
            } else {
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.globalAlpha = 1;
                ctx.globalCompositeOperation = 'source-over';
                ctx.filter = 'none';
                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = ctx.shadowOffsetX = ctx.shadowOffsetY = 0;
            }
        } else {
            // Resizing clears the pixels and resets the context's state.
            canvas.width = width;
            canvas.height = height;
        }
        return canvas;
    },

    getContext: function(width, height, options) {
        var canvas = this.getCanvas(width, height, options);
        return canvas ? canvas.getContext('2d') : null;
    },

     // release can receive either a canvas or a context.
    release: function(obj) {
        var canvas = obj && obj.canvas ? obj.canvas : obj;
        if (canvas && canvas.getContext) {
            // Keep small canvases at their size, so getCanvas() can reuse them
            // without reallocating their pixels, but free the pixels of larger
            // ones right away. Keep only a few, to bound the retained memory:
            if (canvas.width * canvas.height > 256 * 256)
                canvas.width = canvas.height = 0;
            if (this.canvases.length < 8)
                this.canvases.push(canvas);
        }
    }
};
