/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2026, Jürg Lehni & Jonathan Puckey
 * http://juerglehni.com/ & https://puckey.studio/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * The offsets and stroke outlines of plain descriptions of paths, without the
 * items of the library, imported as `paper/offset`, with paths and regions
 * as in {@link paper/boolean}, and with its `parseSVGPath()` and
 * `formatSVGPath()` for SVG path data.
 *
 * @example
 * import { outline } from 'paper/offset'
 * const line = { segments: [[0, 0], [100, 0]], closed: false }
 * const stroke = outline([line], { width: 20, cap: 'round' })
 *
 * @module paper/offset
 */
import type { PathValues, RegionValues } from '../values/index.ts'
import { offsetPath as offsetPathData, offsetRegion } from './offset.ts'
import { outlineStroke } from './outline.ts'

export { formatSVGPath, parseSVGPath } from '../values/index.ts'
export type { PathValues, RegionValues } from '../values/index.ts'

export type OffsetOptions = { join?: string; miterLimit?: number }

export type OutlineOptions = OffsetOptions & { width?: number; cap?: string }

/**
 * Returns the region grown by the distance, or shrunk where it is negative.
 *
 * @param region the region to offset
 * @param distance the distance to offset it by
 * @param options the join at corners, `'miter'`, `'round'` or `'bevel'`,
 *     and the miter limit, as with {@link PathItem#offset()}
 * @return the offset region
 */
export function offset(
  region: RegionValues,
  distance: number,
  { join = 'miter', miterLimit = 10 }: OffsetOptions = {}
): RegionValues {
  return offsetRegion(region, distance, join, miterLimit)
}

// The function also stands for offsetting in `use(offset)` with
// `paper/core`, with what the path items use of it:
offset.feature = {
  name: 'offset' as const,
  offsetRegion,
  offsetPath: offsetPathData,
  outlineStroke
}

/**
 * Returns the offset of the open path at the distance, on the side of its
 * normals where it is positive, as one or more open paths.
 *
 * @param path the open path to offset
 * @param distance the distance to offset it by
 * @param options the join at corners and the miter limit, as with
 *     {@link PathItem#offset()}
 * @return the paths of the offset
 */
export function offsetPath(
  path: PathValues,
  distance: number,
  { join = 'miter', miterLimit = 10 }: OffsetOptions = {}
): PathValues[] {
  return offsetPathData(path, distance, join, miterLimit)
}

/**
 * Returns the outline of the strokes of the paths, as the region that they
 * cover.
 *
 * @param paths the paths to outline
 * @param options the width of the strokes, their join, cap and miter limit,
 *     as with {@link PathItem#outline()}
 * @return the region of the outline
 */
export function outline(
  paths: PathValues[],
  {
    width = 1,
    join = 'miter',
    cap = 'butt',
    miterLimit = 10
  }: OutlineOptions = {}
): RegionValues {
  return outlineStroke(paths, width / 2, join, cap, miterLimit)
}
