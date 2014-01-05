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

var ChangeFlag = {
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
	ATTRIBUTE: 32,
	// Text content
	CONTENT: 64,
	// Raster pixels
	PIXELS: 128,
	// Clipping in one of the child items
	CLIPPING: 256
};

// Shortcuts to often used ChangeFlag values including APPEARANCE
var Change = {
	// HIERARCHY also changes GEOMETRY, since removing children from groups
	// change bounds
	HIERARCHY: ChangeFlag.HIERARCHY | ChangeFlag.GEOMETRY
			| ChangeFlag.APPEARANCE,
	GEOMETRY: ChangeFlag.GEOMETRY | ChangeFlag.APPEARANCE,
	STROKE: ChangeFlag.STROKE | ChangeFlag.STYLE | ChangeFlag.APPEARANCE,
	STYLE: ChangeFlag.STYLE | ChangeFlag.APPEARANCE,
	ATTRIBUTE: ChangeFlag.ATTRIBUTE | ChangeFlag.APPEARANCE,
	CONTENT: ChangeFlag.CONTENT | ChangeFlag.GEOMETRY | ChangeFlag.APPEARANCE,
	PIXELS: ChangeFlag.PIXELS | ChangeFlag.APPEARANCE
};
