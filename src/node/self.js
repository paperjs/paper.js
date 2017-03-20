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

var self;

try {
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
    });
    self = document.defaultView;

    require('./canvas.js')(self);

    // Define XMLSerializer shim, to emulate browser behavior.
    // Effort to bring XMLSerializer to jsdom:
    // https://github.com/tmpvar/jsdom/issues/1368
    /*jshint -W082 */
    function XMLSerializer() {
    }

    XMLSerializer.prototype.serializeToString = function(node) {
        if (!node)
            return '';
        // Fix a jsdom issue where all SVG tagNames are lowercased:
        // https://github.com/tmpvar/jsdom/issues/620
        var text = node.outerHTML,
            tagNames = ['linearGradient', 'radialGradient', 'clipPath',
                'textPath'];
        for (var i = 0, l = tagNames.length; i < l; i++) {
            var tagName = tagNames[i];
            text = text.replace(
                new RegExp('(<|</)' + tagName.toLowerCase() + '\\b', 'g'),
                function(match, start) {
                    return start + tagName;
                });
        }
        return text;
    };

    self.XMLSerializer = XMLSerializer;
} catch(e) {
    console.info(
            'JSDom module not found, running in a headless context without DOM.');
    self = {
        navigator: {
            userAgent: 'Node.js (' + process.platform + '; U; rv:' +
                    process.version + ')'
        }
    };
}

module.exports = self;
