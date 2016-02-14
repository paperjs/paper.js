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

var Canvas = require('canvas'),
    idlUtils = require('jsdom/lib/jsdom/living/generated/utils');

// Add some useful extensions to HTMLCanvasElement:
// - HTMLCanvasElement#type, so we can switch to a PDF canvas
// - Various Node Canvas methods, routed through from HTMLCanvasElement:
//   toBuffer, pngStream, createPNGStream, jpgStream, createJPGStream

module.exports = function(window) {
    var HTMLCanvasElement = window.HTMLCanvasElement;

    function getImplementation(obj) {
        // Try implForWrapper() first, fall back on obj. This appears to be
        // necessary on v7.2.2, but not anymore once we can switch to 8.0.0
        var impl = idlUtils.implForWrapper(obj);
        return impl && impl._canvas ? impl : obj;
    }

    // Add fake HTMLCanvasElement#type property:
    Object.defineProperty(HTMLCanvasElement.prototype, 'type', {
        get: function() {
            var canvas = getImplementation(this)._canvas;
            return canvas && canvas.type || 'image';
        },

        set: function(type) {
            // Allow replacement of internal node-canvas, so we can switch to a
            // PDF canvas.
            var impl = getImplementation(this),
                size = impl._canvas || impl;
            impl._canvas = new Canvas(size.width, size.height, type);
            impl._context = null;
        }
    });

    // Extend HTMLCanvasElement with useful methods from the underlying Canvas:
    ['toBuffer', 'pngStream', 'createPNGStream', 'jpgStream', 'createJPGStream']
        .forEach(function(key) {
            HTMLCanvasElement.prototype[key] = function() {
                var canvas = getImplementation(this)._canvas;
                return canvas[key].apply(canvas, arguments);
            };
        });
};
