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

// Node.js emulation layer of browser environment, based on jsdom with node-
// canvas integration.

var path = require('path');
// Determine the name by which name the module was required (either 'paper',
// 'paper-jsdom' or 'paper-jsdom-canvas'), and use this to determine if error
// exceptions should be thrown or if loading should fail silently.
var parent = module.parent && module.parent.parent,
    // The REPL's module has no filename:
    requireName = parent && parent.filename &&
            path.basename(path.dirname(parent.filename));
requireName = /^paper/.test(requireName) ? requireName : 'paper';

var jsdom,
    self;

try {
    jsdom = require('jsdom');
} catch(e) {
    // Check the required module's name to see if it contains jsdom, and only
    // complain about its lack if the module requires it.
    if (/\bjsdom\b/.test(requireName)) {
        throw new Error('Unable to load jsdom module.', { cause: e });
    }
}

if (jsdom) {
    // Create our document and window objects through jsdom.
    /* global document:true, window:true */
    var document = new jsdom.JSDOM('<html><body></body></html>', {
        // Use the current working directory as the document's origin, so
        // requests to local files work correctly with CORS.
        url: 'file://' + process.cwd() + '/',
        resources: 'usable'
    });
    self = document.window;
    if (!require('./canvas.js')(self, requireName)) {
        // Hide `self.window`, so we still have the global `self` reference,
        // but no `window` object:
        // - On the browser, this corresponds to a worker context.
        // - On Node.js, it basically means the canvas is missing or not working
        //   which can be treated the same way.
        // jsdom's window can't be removed from itself, so inherit from it:
        self = Object.create(self, { window: { value: null } });
    }
    require('./xml.js')(self);
} else {
    self = {
        navigator: {
            userAgent: 'Node.js (' + process.platform + '; U; rv:' +
                    process.version + ')'
        }
    };
}

module.exports = self;
