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
window = window || require('./node/window');
var document = window.document;
