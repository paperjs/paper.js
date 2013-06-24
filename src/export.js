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

// First add Base and Numerical to exports, then inject all exports into
// PaperScope, and create the initial paper object, all in one statement:
paper = new (PaperScope.inject(Base.merge(Base.exports, {
	// Mark fields as enumeralbe so PaperScope.inject can pick them up
	enumerable: true,
	Base: Base,
	Numerical: Numerical,
	DomElement: DomElement,
	DomEvent: DomEvent
})))();
