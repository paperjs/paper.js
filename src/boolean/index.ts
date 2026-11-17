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
 * The boolean operations on plain descriptions of paths, without the items of
 * the library, imported as `paper/boolean`. A path is `{ segments, closed }`,
 * with each segment as its point `[x, y]`, or as `[point, handleIn,
 * handleOut]` with the handles relative to the point. A region is `{ paths,
 * fillRule }`: the paths that are filled as one by the fill rule, `'nonzero'`
 * or `'evenodd'`, with open paths closed by straight lines. The results have
 * their segments as `[point, handleIn, handleOut]`.
 *
 * @example
 * import { unite } from 'paper/boolean'
 * const square = x => ({
 *   paths: [{
 *     segments: [[x, 0], [x + 100, 0], [x + 100, 100], [x, 100]],
 *     closed: true
 *   }],
 *   fillRule: 'nonzero'
 * })
 * const union = unite([square(0), square(50)])
 *
 * @module paper/boolean
 */
import { Point } from '../basic/Point.ts'
import { splitGraph } from './split.ts'
import { traceRegions, uniteRegions } from './operations.ts'
import { getArea, getStrokeCurves } from '../data/region.ts'
import type { PathData, RegionData } from '../data/region.ts'
import { getWinding } from './winding.ts'

export type { PathData, RegionData, SegmentData } from '../data/region.ts'

/**
 * Unites the regions.
 *
 * @param regions the regions to unite
 * @return the region that they cover together
 */
export function unite(regions: RegionData[]): RegionData {
  return uniteRegions(regions)
}

/**
 * Subtracts the other regions from the region.
 *
 * @param region the region to subtract from
 * @param others the region or regions to subtract
 * @return the part of the region that the others don't cover
 */
export function subtract(
  region: RegionData,
  others: RegionData | RegionData[]
): RegionData {
  // The union of the others, as path items subtract it:
  return traceRegions(
    region,
    uniteRegions(toList(others)),
    (inside1, inside2) => inside1 && !inside2
  )
}

/**
 * Intersects the region with the other regions.
 *
 * @param region the region to intersect
 * @param others the region or regions to intersect it with
 * @return the part of the region that all others cover
 */
export function intersect(
  region: RegionData,
  others: RegionData | RegionData[]
): RegionData {
  return toList(others).reduce(
    (result, other) =>
      traceRegions(result, other, (inside1, inside2) => inside1 && inside2),
    region
  )
}

/**
 * Excludes the other regions from the region, and the region from them.
 *
 * @param region the region to exclude
 * @param others the region or regions to exclude it with
 * @return the parts that either the region or the others cover, not both
 */
export function exclude(
  region: RegionData,
  others: RegionData | RegionData[]
): RegionData {
  return toList(others).reduce(
    (result, other) =>
      traceRegions(result, other, (inside1, inside2) => inside1 !== inside2),
    region
  )
}

/**
 * Checks whether the region contains the point, which it also does on its
 * outline.
 *
 * @param region the region to check
 * @param point the point, as `[x, y]`
 * @return true if the region contains the point
 */
export function contains(region: RegionData, [x, y]: number[]): boolean {
  const { winding, windingL, windingR, onPath } = getWinding(
    new Point(x, y),
    region.paths.map(path => ({
      curves: getStrokeCurves(path),
      closed: path.closed,
      get clockwise() {
        return getArea(path) >= 0
      }
    }))
  )
  return (
    onPath ||
    !!(region.fillRule === 'evenodd' ? windingL & 1 || windingR & 1 : winding)
  )
}

/**
 * Splits the paths where they cross the outline of the region. The pieces
 * along the outline count as inside of it.
 *
 * @param paths the paths to split, open or closed
 * @param region the region to split them by
 * @return the pieces inside the region and outside of it, in their order
 *     along the paths
 */
export function split(
  paths: PathData[],
  region: RegionData
): { inside: PathData[]; outside: PathData[] } {
  const inside: PathData[] = []
  const outside: PathData[] = []
  for (const { segments, closed, isInside } of splitGraph(paths, region)) {
    ;(isInside ? inside : outside).push({ segments, closed })
  }
  return { inside, outside }
}

function toList(others: RegionData | RegionData[]): RegionData[] {
  return Array.isArray(others) ? others : [others]
}
