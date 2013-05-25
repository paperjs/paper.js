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

// This file is only used by examples and unit tests, using prepro.js to
// 'preprocess' it on the fly in the browser, avoiding the step of having to
// manually preprocess it after each change.

// Define options for compile-time preprocessing.
var options = {
	parser: 'acorn',
	version: 'dev',
	browser: true,
	stats: true,
	svg: true,
	fatline: true,
	debug: false
};

// This folder is specified relatively to the lib folder from which prepro.js is
// loaded, and which is referenced as the root.
include('../src/paper.js');
