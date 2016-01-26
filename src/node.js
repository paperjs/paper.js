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

// Node.js emulation layer of browser based environment, based on node-canvas
// and jsdom.

/* global document:true, window:true, navigator:true, HTMLCanvasElement:true,
   Image:true */

var jsdom = require('jsdom'),
    idlUtils = require('jsdom/lib/jsdom/living/generated/utils'),
    fs = require('fs'),
    path = require('path');

// Expose global browser variables and create a document and a window using
// jsdom.
var document = jsdom.jsdom('<html><body></body></html>', {
        features: {
            FetchExternalResources : ['img', 'script']
        }
    }),
    window = document.defaultView,
    navigator = window.navigator,
    HTMLCanvasElement = window.HTMLCanvasElement,
    Image = window.Image;

Base.each(
    ['pngStream', 'createPNGStream', 'jpgStream', 'createJPGStream'],
    function(key) {
        this[key] = function() {
            var impl = this._canvas ? this : idlUtils.implForWrapper(this),
                canvas = impl && impl._canvas;
            return canvas[key].apply(canvas, arguments);
        };
    },
    HTMLCanvasElement.prototype);

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

var sourceMaps = {},
    sourceMapSupport = {
        retrieveSourceMap: function(source) {
            var map = sourceMaps[source];
            return map ? { url: source, map: map } : null;
        }
    };

// Register the .pjs extension for automatic compilation as PaperScript
require.extensions['.pjs'] = function(module, filename) {
    // Requiring a PaperScript on Node.js returns an initialize method which
    // needs to receive a Canvas object when called and returns the
    // PaperScope.
    module.exports = function(canvas) {
        // TODO: Fix this once we can require('paper') from node specific code.
        paper.PaperScript.sourceMapSupport = sourceMapSupport;
        var source = fs.readFileSync(filename, 'utf8'),
            code = 'require("source-map-support").install(paper.PaperScript.sourceMapSupport);\n' + source,
            compiled = paper.PaperScript.compile(code, {
                url: filename,
                source: source,
                sourceMaps: true,
                offset: -1 // remove require("source-map-support")...
            }),
            scope = new paper.PaperScope();
        // Keep track of sourceMaps so retrieveSourceMap() can link them up
        scope.setup(canvas);
        scope.__filename = filename;
        scope.__dirname = path.dirname(filename);
        // Expose core methods and values
        scope.require = require;
        scope.console = console;
        sourceMaps[filename] = compiled.map;
        paper.PaperScript.execute(compiled, scope);
        return scope;
    };
};
