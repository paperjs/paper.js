/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * All rights reserved.
 */

var ChangeFlags = {
	GEOMETRY: 1, // Item geometry (path, bounds)
	STROKE: 2, // Stroke geometry (excluding color)
	STYLE: 4, // Fill style or stroke color / dash,
	APPEARANCE: 8, // Visible item attributes: visible, blendMode, opacity ...
	ATTRIBUTE: 16, // Any attributes, also inviislbe ones: locked, name, ...
	HIERARCHY: 32 // Change in item hierarchy
};
