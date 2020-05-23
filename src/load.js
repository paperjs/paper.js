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

// This file uses Prepro.js to preprocess the paper.js source code on the fly in
// the browser, avoiding the step of having to manually preprocess it after each
// change. This is very useful during development of the library itself.
if (typeof window === 'object') {
    // Browser based loading through Prepro.js:
    if (!window.include) {
        // Get the last script tag and assume it's the one that loaded this file
        // then get its src attribute and figure out the location of our root.
        var scripts = document.getElementsByTagName('script'),
            src = scripts[scripts.length - 1].getAttribute('src'),
            // Assume that we're loading from a non-root folder, either through
            // ../../dist/paper-full.js, or directly through ../../src/load.js,
            // and match root as all the path's parts that lead to that folder,
            // exclude the last bit (dist|src), as that's a sub-folder of paper.
            root = src.match(/^(.*\/)\w*\//)[1],
            load = function(src) {
                document.write('<script src="' + src + '"></script>');
            };
        // First load the prepro's browser.js file, which provides the include()
        // function for the browser.
        load(root + 'node_modules/prepro/lib/browser.js');
        // Now that we will have window.include() through browser.js, trigger
        // the loading of this file again, which will execute the lower part of
        // the code the 2nd time around.
        load(root + 'src/load.js');
    } else {
        // Some native javascript classes have name collisions with Paper.js
        // classes. Store them to be able to use them later in tests.
        this.nativeClasses = {
            Event: window.Event,
            MouseEvent: window.MouseEvent
        };
        include('options.js');
        // Load constants.js, required by the on-the-fly preprocessing:
        include('constants.js');
        // Automatically load stats.js while developing.
        include('../node_modules/stats.js/build/stats.min.js');
        include('paper.js');
    }
} else if (typeof require !== 'undefined') {
    // Node.js based loading through Prepro.js:
    var prepro = require('prepro/lib/node'),
        // Load the default browser-based options for further amendments.
        // Step out and back into src, in case this is loaded from
        // dist/paper-node.js
        options = require('../src/options.js');
    // Override Node.js specific options.
    options.load = true;
    options.version += '-load';
    prepro.setup(function() {
        // Return objects to be defined in the preprocess-scope.
        // Note that this would be merge in with already existing objects.
        // We're defining self here since the paper-scope argument is only
        // available in the included scripts when the library is actually built.
        return { __options: options, self: undefined };
    });
    // Load constants.js, required by the on-the-fly preprocessing:
    prepro.include('../src/constants.js');
    // Load Paper.js library files.
    prepro.include('../src/paper.js');
}
