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

// The operations on regions through the planar graph, for the steps between
// which no path items are needed.
import { Point } from '../basic/Point.ts'
import { Rectangle } from '../basic/Rectangle.ts'
import { traceGraph } from './graph.ts'
import type { Operator } from './graph.ts'
import { getPathArea, getRegionBounds, reduceRegion } from '../values/index.ts'
import type { RegionValues } from '../values/index.ts'

// Unites the regions, pairwise in a balanced tree, so that each step only
// meets results of similar size, see combinePaths(). The first one is united
// with the union of the others, and resolved on its own if it is the only
// one. Between the steps, the results are reduced as path items are:
export function uniteRegions(regions: RegionValues[]): RegionValues {
  const [first, ...others] = regions
  return unite(
    first,
    others.length
      ? combine(
          others.map(region => {
            const bounds = getRegionBounds(region)
            return { region, bounds, center: bounds.center }
          })
        )
      : null
  )
}

type Entry = { region: RegionValues; bounds: Rectangle; center: Point }

function combine(entries: Entry[]): RegionValues {
  if (entries.length > 1) {
    // Split the regions along the longer side of their bounds, so each step
    // unites regions that lie close to each other:
    let { bounds } = entries[0]
    for (let i = 1, l = entries.length; i < l; i++) {
      bounds = bounds.unite(entries[i].bounds)
    }
    const key = bounds.width > bounds.height ? 'x' : 'y'
    entries.sort((entry1, entry2) => entry1.center[key] - entry2.center[key])
    const middle = entries.length >> 1
    return unite(
      combine(entries.slice(0, middle)),
      combine(entries.slice(middle))
    )
  } else {
    return entries[0].region
  }
}

// Subtracts the second region from the first one:
export function subtractRegions(
  region1: RegionValues,
  region2: RegionValues
): RegionValues {
  return traceRegions(
    region1,
    region2,
    (inside1, inside2) => inside1 && !inside2
  )
}

// Unites the two regions, or resolves the first one on its own:
function unite(
  region1: RegionValues,
  region2: RegionValues | null
): RegionValues {
  return traceRegions(
    region1,
    region2,
    (inside1, inside2) => inside1 || inside2
  )
}

// Traces the areas of the regions that the operator includes, reducing them
// before and the result after, as path items are, and leaving out paths
// without an area:
export function traceRegions(
  region1: RegionValues,
  region2: RegionValues | null,
  operator: Operator
): RegionValues {
  const operands = [reduceRegion(region1)]
  if (region2) {
    operands.push(reduceRegion(region2))
  }
  const paths = []
  for (const { segments } of traceGraph(operands, operator)) {
    const path = { segments, closed: true }
    if (getPathArea(path) !== 0) {
      paths.push(path)
    }
  }
  return reduceRegion({ paths, fillRule: region1.fillRule })
}
