/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2014, Juerg Lehni & Jonathan Puckey
 * http://scratchdisk.com/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

// Define __options for code preprocessing when building the library, as well as
// browser based compile-time preprocessing when loading the separate source
// files directly through load.js / prepro.js during development.

// The paper.js version.
// NOTE: Adjust value here before calling publish.sh, which then updates and
// publishes the various JSON package files automatically.
var version = '0.9.19';

var __options = {
    // If this file is loaded in the browser, we're in dev mode through load.js
    version: typeof window === 'object' ? 'dev' : version,
    environment: 'browser',
    parser: 'acorn',
    legacy: true,
    svg: true,
    fatlineClipping: true,
    booleanOperations: true,
    nativeContains: false,
    paperScript: true,
    palette: true,
    debug: false
};
