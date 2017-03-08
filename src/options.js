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

// Define __options for code preprocessing when building the library, as well as
// browser based compile-time preprocessing when loading the separate source
// files directly through load.js / Prepro.js during development.

// The paper.js version.
// NOTE: Adjust value here before calling `gulp publish`, which then updates and
// publishes the various JSON package files automatically.
var version = '0.10.3';

// If this file is loaded in the browser, we're in load.js mode.
var load = typeof window === 'object';

var __options = {
    version: version + (load ? '-load' : ''),
    load: load,
    parser: 'acorn',
    svg: true,
    booleanOperations: true,
    nativeContains: false,
    paperScript: true
};

// Export for use in Gulp.js
if (typeof module !== 'undefined')
    module.exports = __options;
