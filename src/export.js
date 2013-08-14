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

// First add Base and a couple of other objects that are not automatically
// exported to exports (Numerical, Key, etc), then inject all exports into
// PaperScope, and create the initial paper object, all in one statement:
/*#*/ if (options.browser) {

paper = new (PaperScope.inject(Base.merge(Base.exports, {
	// Mark fields as enumeralbe so PaperScope.inject can pick them up
	enumerable: true,
	Base: Base,
	Numerical: Numerical,
	DomElement: DomElement,
	DomEvent: DomEvent,
	Key: Key
})))();

// Support AMD (e.g. require.js)
if (typeof define === 'function' && define.amd)
	define('paper', [], function() { return paper; });

/*#*/ } else if (options.node) {

paper = new (PaperScope.inject(Base.merge(Base.exports, {
	// Mark fields as enumeralbe so PaperScope.inject can pick them up
	enumerable: true,
	Base: Base,
	Numerical: Numerical,
	DomElement: DomElement,
	// Export dom/node.js stuff too
	XMLSerializer: XMLSerializer,
	DOMParser: DOMParser,
	Canvas: Canvas
})))();

// Export the paper scope.
module.exports = paper;

/*#*/ } // options.node
