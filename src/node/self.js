/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2019, Juerg Lehni & Jonathan Puckey
 * http://scratchdisk.com/ & https://puckey.studio/
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
    requireName = parent && path.basename(path.dirname(parent.filename));
requireName = /^paper/.test(requireName) ? requireName : 'paper';

var jsdom,
    self;

try {
    jsdom = require('jsdom');
} catch(e) {
    // Check the required module's name to see if it contains jsdom, and only
    // complain about its lack if the module requires it.
    if (/\bjsdom\b/.test(requireName)) {
        throw new Error('Unable to load jsdom module.');
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
    require('./canvas.js')(self, requireName);
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
