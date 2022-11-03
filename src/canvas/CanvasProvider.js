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

// TODO: Run through the canvas array to find a canvas with the requested
// width / height, so we don't need to resize it?
var CanvasProvider = Base.exports.CanvasProvider = {
    canvases: [],

    getCanvas: function(width, height, options) {
        if (!window)
            return null;
        var canvas,
            clear = true;
        if (typeof width === 'object') {
            height = width.height;
            width = width.width;
        }
        if (this.canvases.length) {
            canvas = this.canvases.pop();
        } else {
            canvas = document.createElement('canvas');
            clear = false; // It's already cleared through createElement().
        }
        var ctx = canvas.getContext('2d', options || {});
        if (!ctx) {
            throw new Error('Canvas ' + canvas +
                    ' is unable to provide a 2D context.');
        }
        // If they are not the same size, we don't need to clear them
        // using clearRect and visa versa.
        if (canvas.width === width && canvas.height === height) {
            // +1 is needed on some browsers to really clear the borders
            if (clear)
                ctx.clearRect(0, 0, width + 1, height + 1);
        } else {
            canvas.width = width;
            canvas.height = height;
        }
        // We save on retrieval and restore on release.
        ctx.save();
        return canvas;
    },

    getContext: function(width, height, options) {
        var canvas = this.getCanvas(width, height, options);
        return canvas ? canvas.getContext('2d', options || {}) : null;
    },

     // release can receive either a canvas or a context.
    release: function(obj) {
        var canvas = obj && obj.canvas ? obj.canvas : obj;
        if (canvas && canvas.getContext) {
            // We restore contexts on release(), see getCanvas()
            canvas.getContext('2d').restore();
            this.canvases.push(canvas);
        }
    }
};
