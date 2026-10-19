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

/**
 * The flags that describe what has changed in an item, as reported by
 * {@link Project#takeChanges()}. They are bit flags that can be combined.
 *
 * @name ChangeFlag
 * @namespace
 */
var ChangeFlag = /** @lends ChangeFlag */{
    /**
     * Anything affecting the appearance of an item, including GEOMETRY,
     * STROKE, STYLE and ATTRIBUTE (except for the invisible ones: locked, name)
     *
     * @property
     * @type Number
     */
    APPEARANCE: 0x1,

    /**
     * A change in the item's children
     *
     * @property
     * @type Number
     */
    CHILDREN: 0x2,

    /**
     * A change of the item's place in the scene graph (removed, inserted,
     * moved)
     *
     * @property
     * @type Number
     */
    INSERTION: 0x4,

    /**
     * Item geometry (path, bounds)
     *
     * @property
     * @type Number
     */
    GEOMETRY: 0x8,

    /**
     * The item's matrix has changed
     *
     * @property
     * @type Number
     */
    MATRIX: 0x10,

    /**
     * Only segment(s) have changed, and affected curves have already been
     * notified. This is to implement an optimization in _changed() calls
     *
     * @property
     * @type Number
     */
    SEGMENTS: 0x20,

    /**
     * Stroke geometry (excluding color)
     *
     * @property
     * @type Number
     */
    STROKE: 0x40,

    /**
     * Fill style or stroke color / dash
     *
     * @property
     * @type Number
     */
    STYLE: 0x80,

    /**
     * Item attributes: visible, blendMode, locked, name, opacity, clipMask ...
     *
     * @property
     * @type Number
     */
    ATTRIBUTE: 0x100,

    /**
     * Text content
     *
     * @property
     * @type Number
     */
    CONTENT: 0x200,

    /**
     * Raster pixels
     *
     * @property
     * @type Number
     */
    PIXELS: 0x400,

    /**
     * Clipping in one of the child items
     *
     * @property
     * @type Number
     */
    CLIPPING: 0x800,

    /**
     * The view has been transformed
     *
     * @property
     * @type Number
     */
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
