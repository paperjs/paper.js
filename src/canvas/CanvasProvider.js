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
        var canvas;
        if (typeof width === 'object') {
            height = width.height;
            width = width.width;
        }
        if (this.canvases.length) {
            canvas = this.canvases.pop();
        } else {
            canvas = window
                    ? document.createElement('canvas')
                    : new self.OffscreenCanvas(width, height);
        }
        var ctx = canvas.getContext('2d', options || {});
        if (!ctx) {
            throw new Error('Canvas ' + canvas +
                    ' is unable to provide a 2D context.');
        }
        // No need to clear: pooled canvases are 0 × 0, new ones are blank.
        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
        }
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
            // Resizing frees the pixels right away, and also resets the
            // context's state. Keep only a few canvases, to reuse their
            // elements and contexts:
            canvas.width = canvas.height = 0;
            if (this.canvases.length < 8)
                this.canvases.push(canvas);
        }
    }
};
