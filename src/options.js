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

// Define __options for code preprocessing when building the library, as well as
// browser based compile-time preprocessing when loading the separate source
// files directly through load.js / Prepro.js during development.

// The paper.js version.
// NOTE: Adjust value here before calling `gulp publish`, which then updates the
// various JSON package files and commits, tags and pushes the release, for the
// release workflow on GitHub Actions to publish it.
var version = '0.14.0';

// If this file is loaded in the browser, we're in load.js mode.
var load = typeof window === 'object';

var __options = {
    version: version + (load ? '-load' : ''),
    load: load,
    parser: 'acorn',
    svg: true,
    booleanOperations: true,
    nativeContains: false,
    paperScript: true,
    // Items backed by a host document, see Project#source. Only in the
    // paper-hosted.js build, and when loading the sources directly:
    hosted: load
};

// Export for use in Gulp.js
if (typeof module !== 'undefined')
    module.exports = __options;
