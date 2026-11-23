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

/*
 * The outlines of strokes, with the offsets of curves after kurbo by Raph
 * Levien and the Linebender contributors, and the areas of tight turns after
 * "Converting Stroked Primitives to Filled Primitives" by Diego Nehab. They
 * work on plain paths, without path items.
 *
 * @author Jan Bösenberg <jan.boesenberg@gmail.com>
 * @author Jürg Lehni <juerg@scratchdisk.com>
 */

import { uniteRegions } from '../boolean/operations.ts'
import type { PathValues, RegionValues } from '../data/region.ts'
import { ProfileSweep } from './profile.ts'
import type { StrokePens } from './profile.ts'
import { RoundSweep } from './round.ts'

// A path to outline the stroke of, with the pens of its stroke profile:
export type StrokePath = PathValues & { pens?: StrokePens }

const errorThreshold = 0.1

// Returns the outline of the strokes of the paths, as the union of the areas
// that their pens sweep, see Sweep. The curves are split into parts that
// each sweep in one direction, so that no opposite windings cancel.
export function outlineStroke(
  paths: StrokePath[],
  radius: number,
  join: string,
  cap: string,
  miterLimit: number
): RegionValues {
  // The offsets' error, relative to small radii:
  const tolerance = Math.min(errorThreshold, radius / 100)
  const stroke = { radius, tolerance, join, cap, miterLimit }
  const areas: RegionValues[] = []
  for (const path of paths) {
    const sweep = path.pens
      ? new ProfileSweep(path, path.pens, stroke)
      : new RoundSweep(path, stroke)
    areas.push(...sweep.sweep())
  }
  return areas.length ? uniteRegions(areas) : { paths: [], fillRule: 'nonzero' }
}
