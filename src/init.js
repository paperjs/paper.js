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

// Here we only make sure that there's a window and document object in the node
// environment. We can't do this directly in src/paper.js, due to the nature of
// how Prepro.js loads the include() files in the various scenarios. E.g. on
// Node.js,only the files included in such a way see each other's variables in
// their shared scope.

/* global document:true, window:true */
// Create a window variable valid in the paper.js scope, that points to the
// native window in browsers and the emulated JSDom one in node.js
// In workers, window is null (but self is defined), so we can use the validity
// of the local window object to detect a worker-like context in the library.
var window = self ? self.window : require('./node/window'),
    document = window && window.document;
// Make sure 'self' always points to a window object, also on Node.js.
// NOTE: We're not modifying the global `self` here. We receive its value passed
// to the paper.js function scope, and this is the one that is modified here.
self = self || window;
