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

// Node.js emulation layer of browser environment, based on jsdom with node-
// canvas integration.

var jsdom = require('jsdom'),
    idlUtils = require('jsdom/lib/jsdom/living/generated/utils');

// Create our document and window objects through jsdom.
/* global document:true, window:true */
var document = jsdom.jsdom('<html><body></body></html>', {
        features: {
            FetchExternalResources : ['img', 'script']
        }
    }),
    window = document.defaultView;

['pngStream', 'createPNGStream', 'jpgStream', 'createJPGStream'].forEach(
    function(key) {
        this[key] = function() {
            var impl = this._canvas ? this : idlUtils.implForWrapper(this),
                canvas = impl && impl._canvas;
            return canvas[key].apply(canvas, arguments);
        };
    },
    window.HTMLCanvasElement.prototype);

// Define XMLSerializer and DOMParser shims, to emulate browser behavior.
// TODO: Put this into a simple node module, with dependency on jsdom?
function XMLSerializer() {
}

XMLSerializer.prototype.serializeToString = function(node) {
    var text = jsdom.serializeDocument(node);
    // Fix a jsdom issue where all SVG tagNames are lowercased:
    // https://github.com/tmpvar/jsdom/issues/620
    var tagNames = ['linearGradient', 'radialGradient', 'clipPath'];
    for (var i = 0, l = tagNames.length; i < l; i++) {
        var tagName = tagNames[i];
        text = text.replace(
            new RegExp('(<|</)' + tagName.toLowerCase() + '\\b', 'g'),
            function(all, start) {
                return start + tagName;
            });
    }
    return text;
};

function DOMParser() {
}

DOMParser.prototype.parseFromString = function(string, contenType) {
    var div = document.createElement('div');
    div.innerHTML = string;
    return div.firstChild;
};

window.XMLSerializer = XMLSerializer;
window.DOMParser = DOMParser;

module.exports = window;
