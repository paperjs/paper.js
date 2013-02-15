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

// Iterate over all produced Base classes and set the _name property of their
// constructors to the key under which they are stored. This is a simple hack
// that allow us to use their names.
// Setting Function#name is not possible, as that is read-only.
Base.each(this, function(val, key) {
	if (val && val.prototype instanceof Base) {
		val._name = key;
/*#*/ if (options.version == 'dev') {
		// If we're in dev mode, also export all classes through PaperScope, to
		// mimick scoping behavior of the built library.
		PaperScope.prototype[key] = val;
/*#*/ } // options.version == 'dev'
	}
});

/*#*/ if (options.version == 'dev') {
// See paper.js for the non-dev version of this code. We cannot handle dev there
// due to the seperate loading of all source files, which are only availabe
// after the execution of paper.js
paper = new PaperScope();
/*#*/ } // options.version == 'dev'
