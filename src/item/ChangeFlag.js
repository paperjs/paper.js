/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2016, Juerg Lehni & Jonathan Puckey
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
    // A change in the item's children
    CHILDREN: 0x2,
    // A change of the item's place in the scene graph (removed, inserted,
    // moved).
    INSERTION: 0x4,
    // Item geometry (path, bounds)
    GEOMETRY: 0x8,
    // Only segment(s) have changed, and affected curves have already been
    // notified. This is to implement an optimization in _changed() calls.
    SEGMENTS: 0x10,
    // Stroke geometry (excluding color)
    STROKE: 0x20,
    // Fill style or stroke color / dash
    STYLE: 0x40,
    // Item attributes: visible, blendMode, locked, name, opacity, clipMask ...
    ATTRIBUTE: 0x80,
    // Text content
    CONTENT: 0x100,
    // Raster pixels
    PIXELS: 0x200,
    // Clipping in one of the child items
    CLIPPING: 0x400,
    // The view has been transformed
    VIEW: 0x800
};

// Shortcuts to often used ChangeFlag values including APPEARANCE
var Change = {
    // CHILDREN also changes GEOMETRY, since removing children from groups
    // changes bounds.
    CHILDREN: ChangeFlag.CHILDREN | ChangeFlag.GEOMETRY | ChangeFlag.APPEARANCE,
    // Changing the insertion can change the appearance through parent's matrix.
    INSERTION: ChangeFlag.INSERTION | ChangeFlag.APPEARANCE,
    GEOMETRY: ChangeFlag.GEOMETRY | ChangeFlag.APPEARANCE,
    SEGMENTS: ChangeFlag.SEGMENTS | ChangeFlag.GEOMETRY | ChangeFlag.APPEARANCE,
    STROKE: ChangeFlag.STROKE | ChangeFlag.STYLE | ChangeFlag.APPEARANCE,
    STYLE: ChangeFlag.STYLE | ChangeFlag.APPEARANCE,
    ATTRIBUTE: ChangeFlag.ATTRIBUTE | ChangeFlag.APPEARANCE,
    CONTENT: ChangeFlag.CONTENT | ChangeFlag.GEOMETRY | ChangeFlag.APPEARANCE,
    PIXELS: ChangeFlag.PIXELS | ChangeFlag.APPEARANCE,
    VIEW: ChangeFlag.VIEW | ChangeFlag.APPEARANCE
};
