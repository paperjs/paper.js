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
	// Anything affecting the appearance of an item, including GEOMETRY,
	// STROKE, STYLE and ATTRIBUTE (except for the invisible ones: locked, name)
	APPEARANCE: 1,
	// Change in item hierarchy
	HIERARCHY: 2,
	// Item geometry (path, bounds)
	GEOMETRY: 4,
	// Stroke geometry (excluding color)
	STROKE: 8,
	// Fill style or stroke color / dash
	STYLE: 16,
	// Item attributes: visible, blendMode, locked, name, opacity, clipMask ...
	ATTRIBUTE: 32
};

// Shortcuts to the ChangeFlags to send to #_changed(), all including appearance
var Change = {
	HIERARCHY: ChangeFlags.HIERARCHY | ChangeFlags.APPEARANCE,
	GEOMETRY: ChangeFlags.GEOMETRY | ChangeFlags.APPEARANCE,
	STROKE: ChangeFlags.STROKE | ChangeFlags.APPEARANCE,
	STYLE: ChangeFlags.STYLE | ChangeFlags.APPEARANCE,
	ATTRIBUTE: ChangeFlags.ATTRIBUTE | ChangeFlags.APPEARANCE
};
