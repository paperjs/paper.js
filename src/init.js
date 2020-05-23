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

// Here we only make sure that there's a window and document object in the node
// environment. We can't do this directly in src/paper.js, due to the nature of
// how Prepro.js loads the include() files in the various scenarios. E.g. on
// Node.js,only the files included in such a way see each other's variables in
// their shared scope.

// Set up a local `window` variable valid across the full the paper.js scope,
// pointing to the native window in browsers and the one provided by JSDom in
// Node.js
// In workers and on Node.js, the global `window` variable is null. In workers,
// `self` is defined as a `WorkerGlobalScope` object, while in Node.js, `self`
// is null.
// When `self` is null (Node.js only). './node/self.js' is required to provide
// a window object through JSDom and assigned it to `self`.
// When `self.window` and therefore the local `window` is still null after that,
// we know that we are in a worker-like context. This check is used all across
// the library, see for example `View.create()`.
// NOTE: We're not modifying the global `self` here. We receive its value passed
// to the paper.js function scope, and this is the one that is modified here.
self = self || require('./node/self.js');
var window = self.window,
    document = self.document;
