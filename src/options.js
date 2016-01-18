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

var __options = {
    version: 'dev',
    environment: 'browser',
    parser: 'acorn',
    svg: true,
    booleanOperations: true,
    nativeContains: false,
    paperScript: true
};
