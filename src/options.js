/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2014, Juerg Lehni & Jonathan Puckey
 * http://scratchdisk.com/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

// Define default options for browser based compile-time preprocessing.
// These are also used for building, but some values are overridden
// (e.g. version, stats). 

var __options = {
	parser: 'acorn',
	version: 'dev',
	environment: 'browser',
	legacy: true,
	stats: true,
	svg: true,
	fatlineClipping: true,
	booleanOperations: true,
	nativeContains: false,
	paperScript: true,
	palette: true,
	debug: false
};
