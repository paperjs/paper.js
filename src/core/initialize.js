/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/*#*/ if (options.version == 'dev') {
// When in dev mode, also export all classes through PaperScope, to mimick
// scoping behavior of the built library.
Base.each(this, function(val, key) {
	if (val && val.prototype instanceof Base)
		PaperScope.prototype[key] = val;
});
// See paper.js for the non-dev version of this code. We cannot handle dev there
// due to the seperate loading of all source files, which are only availabe
// after the execution of paper.js
var paper = new PaperScope();
/*#*/ } // options.version == 'dev'
