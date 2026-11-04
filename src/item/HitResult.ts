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

import { Base } from '../core/Base.ts'
import { paper } from '../core/PaperScope.ts'
import type { Point } from '../basic/Point.ts'
import type { Color } from '../style/Color.ts'
import type { CurveLocation } from '../path/CurveLocation.ts'
import type { Segment } from '../path/Segment.ts'
import type { Item } from './Item.ts'
import type { Raster } from './Raster.ts'

/**
 * A HitResult object contains information about the results of a hit test. It
 * is returned by {@link Item#hitTest(point)} and
 * {@link Project#hitTest(point)}.
 */
export class HitResult extends Base {
  /**
   * Describes the type of the hit result. For example, if you hit a segment
   * point, the type would be `'segment'`.
   *
   * @values 'segment', 'handle-in', 'handle-out', 'curve', 'stroke', 'fill',
   *     'bounds', 'center', 'pixel'
   */
  type: string

  /**
   * If the HitResult has a {@link HitResult#type} of `'bounds'`, this
   * property describes which corner of the bounding rectangle was hit.
   *
   * The names refer to the item's own bounding rectangle, transformed by its
   * {@link Item#matrix}, which is the rectangle that the item's selection
   * draws. On mirrored or rotated items, a handle can therefore appear
   * elsewhere on screen than its name says, while its opposite handle and
   * the rectangle's axes stay the ones to transform the item by. To choose
   * a cursor, use the direction from the rectangle's center to
   * {@link HitResult#point}, both in project coordinates.
   *
   * @values 'top-left', 'top-right', 'bottom-left', 'bottom-right',
   *     'left-center', 'top-center', 'right-center', 'bottom-center'
   */
  name: string

  /**
   * The item that was hit.
   */
  item: Item

  /**
   * If the HitResult has a type of 'curve' or 'stroke', this property gives
   * more information about the exact position that was hit on the path.
   */
  location: CurveLocation

  /**
   * If the HitResult has a type of 'stroke', 'segment', 'handle-in' or
   * 'handle-out', this property refers to the segment that was hit or that
   * is closest to the hitResult.location on the curve.
   */
  segment: Segment

  /**
   * Describes the actual coordinates of the segment, handle or bounding box
   * corner that was hit.
   */
  point: Point

  // The pixel of the raster that was hit, for #color:
  offset: Point

  constructor(type: string, item: Item, values?: Partial<HitResult>) {
    super()
    this.type = type
    this.item = item
    // Assign the passed values, so we can be flexible about the HitResult
    // properties.
    if (values) {
      Object.assign(this, values)
    }
  }

  /**
   * If the HitResult has a type of 'pixel', this property refers to the color
   * of the pixel on the {@link Raster} that was hit.
   */
  get color(): Color | null {
    // Only read the pixel when asked for it:
    return this.type === 'pixel'
      ? (this.item as Raster).getPixel(this.offset)
      : undefined
  }

  /**
   * Merges default options into options hash for #hitTest() calls.
   *
   * @private
   */
  static getOptions(options?: Record<string, any>): Record<string, any> {
    return {
      // Type of item, for instanceof check: Group, Layer, Path, CompoundPath,
      // Shape, Raster, SymbolItem, ...
      type: null,
      // Tolerance
      tolerance: paper.settings.hitTolerance,
      // Hit the fill of items
      fill: !options,
      // Hit the curves of path items, taking into account the stroke width.
      stroke: !options,
      // Hit the part of segments that curves pass through, excluding its
      // segments (Segment#point)
      segments: !options,
      // Hit the parts of segments that define the curvature
      handles: false,
      // Only first or last segment hits on path (mutually exclusive with
      // segments: true)
      ends: false,
      // Hit test the item position
      position: false,
      // Hit test the center of the bounds
      center: false,
      // Hit test the corners and side-centers of the bounding box
      bounds: false,
      //  Hit items that are marked as guides
      guides: false,
      // Only hit selected objects
      selected: false,
      ...options
    }
  }
}
