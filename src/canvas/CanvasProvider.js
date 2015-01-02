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

// TODO: Run through the canvas array to find a canvas with the requested
// width / height, so we don't need to resize it?
var CanvasProvider = {
    canvases: [],

    getCanvas: function(width, height) {
        var canvas,
            clear = true;
        if (typeof width === 'object') {
            height = width.height;
            width = width.width;
        }
        if (this.canvases.length) {
            canvas = this.canvases.pop();
        } else {
/*#*/ if (__options.environment == 'browser') {
            canvas = document.createElement('canvas');
/*#*/ } else { // __options.environment != 'browser'
            canvas = new Canvas(width, height);
            clear = false; // It's already cleared through constructor.
/*#*/ } // __options.environment != 'browser'
        }
        var ctx = canvas.getContext('2d');
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

    getContext: function(width, height) {
        return this.getCanvas(width, height).getContext('2d');
    },

     // release can receive either a canvas or a context.
    release: function(obj) {
        var canvas = obj.canvas ? obj.canvas : obj;
        // We restore contexts on release(), see getCanvas()
        canvas.getContext('2d').restore();
        this.canvases.push(canvas);
    }
};
