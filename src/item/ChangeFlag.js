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
	APPEARANCE: 0x1,
	// Change in item hierarchy
	CHILDREN: 0x2,
	// Item geometry (path, bounds)
	GEOMETRY: 0x4,
	// Only segment(s) have changed, and affected curves have alredy been
	// notified. This is to implement an optimization in _changed() calls.
	SEGMENTS: 0x8,
	// Stroke geometry (excluding color)
	STROKE: 0x10,
	// Fill style or stroke color / dash
	STYLE: 0x20,
	// Item attributes: visible, blendMode, locked, name, opacity, clipMask ...
	ATTRIBUTE: 0x40,
	// Text content
	CONTENT: 0x80,
	// Raster pixels
	PIXELS: 0x100,
	// Clipping in one of the child items
	CLIPPING: 0x200
};

// Shortcuts to often used ChangeFlag values including APPEARANCE
var Change = {
	// CHILDREN also changes GEOMETRY, since removing children from groups
	// changes bounds.
	CHILDREN: ChangeFlag.CHILDREN | ChangeFlag.GEOMETRY | ChangeFlag.APPEARANCE,
	GEOMETRY: ChangeFlag.GEOMETRY | ChangeFlag.APPEARANCE,
	SEGMENTS: ChangeFlag.SEGMENTS | ChangeFlag.GEOMETRY | ChangeFlag.APPEARANCE,
	STROKE: ChangeFlag.STROKE | ChangeFlag.STYLE | ChangeFlag.APPEARANCE,
	STYLE: ChangeFlag.STYLE | ChangeFlag.APPEARANCE,
	ATTRIBUTE: ChangeFlag.ATTRIBUTE | ChangeFlag.APPEARANCE,
	CONTENT: ChangeFlag.CONTENT | ChangeFlag.GEOMETRY | ChangeFlag.APPEARANCE,
	PIXELS: ChangeFlag.PIXELS | ChangeFlag.APPEARANCE
};
