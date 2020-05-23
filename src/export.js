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

// First add Base and a couple of other objects that are not automatically
// exported to exports (Numerical, Key, etc), then inject all exports into
// PaperScope, and create the initial paper object, all in one statement:
// NOTE: Do not create local variable `var paper` since it would shield the
// global one in the whole scope.

var paper = new (PaperScope.inject(Base.exports, {
    Base: Base,
    Numerical: Numerical,
    Key: Key,
    DomEvent: DomEvent,
    DomElement: DomElement,
    // Export jsdom document and window too, for Node.js
    document: document,
    window: window,
    // TODO: Remove in 1.0.0? (deprecated January 2016):
    Symbol: SymbolDefinition,
    PlacedSymbol: SymbolItem
}))();

// If we're on node, require some additional functionality now before finishing:
// - PaperScript support in require() with sourceMaps
// - exportFrames / exportImage on CanvasView
if (paper.agent.node) {
    require('./node/extend.js')(paper);
}

// https://github.com/umdjs/umd
if (typeof define === 'function' && define.amd) {
    // Support AMD (e.g. require.js)
    // Use named module AMD syntax since there are other unnamed calls to
    // define() inside the built library (from inlined Acorn / Esprima) that
    // apparently confuse the require.js optimizer.
    define('paper', paper);
} else if (typeof module === 'object' && module) { // could be `null`
    // Support CommonJS module
    // NOTE: Do not check typeof module.exports === 'object' since it will be
    // the Base constructor function after straps.js is included.
    module.exports = paper;
}
