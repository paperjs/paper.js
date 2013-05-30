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

// Add PaperScript and Numerical to exports, inject all exports into PaperScope,
// and create the initial paper object, all in one condensed statement:
paper = new (PaperScope.inject(Base.exports.inject({
	PaperScript: PaperScript,
	Numerical: Numerical
})))();
