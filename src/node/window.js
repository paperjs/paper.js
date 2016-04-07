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

var jsdom = require('jsdom');

// Create our document and window objects through jsdom.
/* global document:true, window:true */
var document = jsdom.jsdom('<html><body></body></html>', {
        // Use the current working directory as the document's origin, so
        // requests to local files work correctly with CORS.
        url: 'file://' + process.cwd() + '/',
        features: {
            FetchExternalResources: ['img', 'script']
        }
    }),
    window = document.defaultView;

require('./canvas')(window);

// Define XMLSerializer and DOMParser shims, to emulate browser behavior.
// Effort to bring this to jsdom: https://github.com/tmpvar/jsdom/issues/1368
function XMLSerializer() {
}

XMLSerializer.prototype.serializeToString = function(node) {
    if (!node)
        return '';
    var text = node.outerHTML;
    // Fix a jsdom issue where all SVG tagNames are lowercased:
    // https://github.com/tmpvar/jsdom/issues/620
    var tagNames = ['linearGradient', 'radialGradient', 'clipPath', 'textPath'];
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

DOMParser.prototype.parseFromString = function(string, contentType) {
    // Create a new document, since we're supposed to always return one.
    var doc = document.implementation.createHTMLDocument(''),
        body = doc.body,
        last;
    // Set the body's HTML, then change the DOM according the specs.
    body.innerHTML = string;
    // Remove all top-level children (<html><head/><body/></html>)
    while (last = doc.lastChild)
        doc.removeChild(last);
    // Insert the first child of the body at the top.
    doc.appendChild(body.firstChild);
    return doc;
};

window.XMLSerializer = XMLSerializer;
window.DOMParser = DOMParser;

module.exports = window;
