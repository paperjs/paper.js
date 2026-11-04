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
 */
export const ChangeFlag = {
  /**
   * Anything affecting the appearance of an item, including GEOMETRY,
   * STROKE, STYLE and ATTRIBUTE (except for the invisible ones: locked, name)
   *
   * @property
   */
  APPEARANCE: 0x1,

  /**
   * A change in the item's children
   *
   * @property
   */
  CHILDREN: 0x2,

  /**
   * A change of the item's place in the scene graph (removed, inserted,
   * moved)
   *
   * @property
   */
  INSERTION: 0x4,

  /**
   * Item geometry (path, bounds)
   *
   * @property
   */
  GEOMETRY: 0x8,

  /**
   * The item's matrix has changed
   *
   * @property
   */
  MATRIX: 0x10,

  /**
   * Only segment(s) have changed, and affected curves have already been
   * notified. This is to implement an optimization in _changed() calls
   *
   * @property
   */
  SEGMENTS: 0x20,

  /**
   * Stroke geometry (excluding color)
   *
   * @property
   */
  STROKE: 0x40,

  /**
   * Fill style or stroke color / dash
   *
   * @property
   */
  STYLE: 0x80,

  /**
   * Item attributes: visible, blendMode, locked, name, opacity, clipMask ...
   *
   * @property
   */
  ATTRIBUTE: 0x100,

  /**
   * Text content
   *
   * @property
   */
  CONTENT: 0x200,

  /**
   * Raster pixels
   *
   * @property
   */
  PIXELS: 0x400,

  /**
   * Clipping in one of the child items
   *
   * @property
   */
  CLIPPING: 0x800,

  /**
   * The view has been transformed
   *
   * @property
   */
  VIEW: 0x1000
}

// Shortcuts to often used ChangeFlag values including APPEARANCE
export const Change = {
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
}

export const ItemSelection = {
  ITEM: 1,
  BOUNDS: 2,
  POSITION: 4,
  STROKE_BOUNDS: 8
}

// Path#_segmentSelection is the addition of all segment's states, and is
// compared with SegmentSelection.ALL, the combination of all
// SegmentSelection values to see if all segments are fully selected.
export const SegmentSelection = {
  POINT: 1,
  HANDLE_IN: 2,
  HANDLE_OUT: 4,
  ALL: 1 | 2 | 4 // POINT | HANDLE_IN | HANDLE_OUT
}
