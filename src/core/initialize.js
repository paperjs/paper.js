/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
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
	if (val && val.prototype instanceof Base)
		val._name = key;
});

/*#*/ if (options.version == 'dev') {
// We're already leaking into the global scope, so let's just assign the global
// paper object with a prepare scope. See paper.js for the non-dev version of
// this code.
paper = new PaperScope();
/*#*/ } // options.version == 'dev'
