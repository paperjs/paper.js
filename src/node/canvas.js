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

// Add some useful extensions to HTMLCanvasElement:
// - HTMLCanvasElement#type, so we can switch to a PDF canvas
// - Various Node Canvas methods, routed through from HTMLCanvasElement:
//   toBuffer, pngStream, createPNGStream, jpgStream, createJPGStream

module.exports = function(window) {
    var Canvas;
    try {
        Canvas = require('canvas');
    } catch(e) {
        // Remove `self.window`, so we still have the global `self` reference,
        // but no `window` object:
        // - On the browser, this corresponds to a worker context.
        // - On Node.js, it basically means the canvas is missing or not working
        //   which can be treated the same way.
        delete window.window;
        console.info(
                'Unable to load Canvas module. Running in a headless context.');
        return;
    }

    var idlUtils = require('jsdom/lib/jsdom/living/generated/utils'),
        HTMLCanvasElement = window.HTMLCanvasElement;

    // Add fake HTMLCanvasElement#type property:
    Object.defineProperty(HTMLCanvasElement.prototype, 'type', {
        get: function() {
            var canvas = idlUtils.implForWrapper(this)._canvas;
            return canvas && canvas.type || 'image';
        },

        set: function(type) {
            // Allow replacement of internal node-canvas, so we can switch to a
            // PDF canvas.
            var impl = idlUtils.implForWrapper(this),
                size = impl._canvas || impl;
            impl._canvas = new Canvas(size.width, size.height, type);
            impl._context = null;
        }
    });

    // Extend HTMLCanvasElement with useful methods from the underlying Canvas:
    ['toBuffer', 'pngStream', 'createPNGStream', 'jpgStream', 'createJPGStream']
        .forEach(function(key) {
            HTMLCanvasElement.prototype[key] = function() {
                var canvas = idlUtils.implForWrapper(this)._canvas;
                return canvas[key].apply(canvas, arguments);
            };
        });
};
