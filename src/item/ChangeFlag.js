/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2020, Jürg Lehni & Jonathan Puckey
 * http://juerglehni.com/ & https://puckey.studio/
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
    // moved)
    INSERTION: 0x4,
    // Item geometry (path, bounds)
    GEOMETRY: 0x8,
    // The item's matrix has changed
    MATRIX: 0x10,
    // Only segment(s) have changed, and affected curves have already been
    // notified. This is to implement an optimization in _changed() calls
    SEGMENTS: 0x20,
    // Stroke geometry (excluding color)
    STROKE: 0x40,
    // Fill style or stroke color / dash
    STYLE: 0x80,
    // Item attributes: visible, blendMode, locked, name, opacity, clipMask ...
    ATTRIBUTE: 0x100,
    // Text content
    CONTENT: 0x200,
    // Raster pixels
    PIXELS: 0x400,
    // Clipping in one of the child items
    CLIPPING: 0x800,
    // The view has been transformed
    VIEW: 0x1000
};

// Shortcuts to often used ChangeFlag values including APPEARANCE
var Change = {
    // CHILDREN also changes GEOMETRY, since removing children from groups
    // changes bounds.
    CHILDREN: ChangeFlag.CHILDREN | ChangeFlag.GEOMETRY | ChangeFlag.APPEARANCE,
    // Changing the insertion can change the appearance through parent's matrix.
    INSERTION: ChangeFlag.INSERTION | ChangeFlag.APPEARANCE,
    GEOMETRY: ChangeFlag.GEOMETRY | ChangeFlag.APPEARANCE,
    MATRIX: ChangeFlag.MATRIX | ChangeFlag.GEOMETRY | ChangeFlag.APPEARANCE,
    SEGMENTS: ChangeFlag.SEGMENTS | ChangeFlag.GEOMETRY | ChangeFlag.APPEARANCE,
    STROKE: ChangeFlag.STROKE | ChangeFlag.STYLE | ChangeFlag.APPEARANCE,
    STYLE: ChangeFlag.STYLE | ChangeFlag.APPEARANCE,
    ATTRIBUTE: ChangeFlag.ATTRIBUTE | ChangeFlag.APPEARANCE,
    CONTENT: ChangeFlag.CONTENT | ChangeFlag.GEOMETRY | ChangeFlag.APPEARANCE,
    PIXELS: ChangeFlag.PIXELS | ChangeFlag.APPEARANCE,
    VIEW: ChangeFlag.VIEW | ChangeFlag.APPEARANCE
};
