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

// Regions as the paths that are filled as one, as the boolean operations and
// offsetting take and return them.
import type { Point } from '../basic/Point.ts'
import { Rectangle } from '../basic/Rectangle.ts'
import { addCurveBounds, getCurveRayWinding } from './curve.ts'
import type { CurveValues } from './curve.ts'
import { getCurve, getPathSegments, reducePath } from './path.ts'
import type { PathValues } from './path.ts'

// The paths that are filled as one, by their fill rule:
// The rule by which paths fill, as in canvas and SVG:
export type FillRule = 'nonzero' | 'evenodd'

export type RegionValues = { paths: PathValues[]; fillRule: FillRule }

// Returns the region of one closed path with the segments:
export function createRegion(segments: PathValues['segments']): RegionValues {
  return { paths: [{ segments, closed: true }], fillRule: 'nonzero' }
}

// Whether the area that the curves enclose by the fill rule contains the
// point, which it also does on the curves. Open paths count with the lines
// that close them among their curves, as getPathCurves() returns them:
export function containsPoint(
  curves: CurveValues[],
  fillRule: FillRule,
  point: Point
): boolean {
  let total = 0
  for (const v of curves) {
    const winding = getCurveRayWinding(v, point, 1e-9)
    if (winding === null) return true
    total += winding
  }
  return !!(fillRule === 'evenodd' ? total & 1 : total)
}

// Returns the bounds of the region, as those of a path item with its paths:
export function getRegionBounds({
  paths
}: Pick<RegionValues, 'paths'>): Rectangle {
  const roots = new Array(2)
  let bounds: Rectangle | null = null
  for (const path of paths) {
    const segments = getPathSegments(path)
    const count = segments.length
    if (count) {
      const min = segments[0][0].slice()
      const max = min.slice()
      for (let i = 0, l = path.closed ? count : count - 1; i < l; i++) {
        const v = getCurve(segments[i], segments[(i + 1) % count])
        for (let c = 0; c < 2; c++) {
          addCurveBounds(
            v[c], v[c + 2], v[c + 4], v[c + 6], c, 0, min, max, roots
          )
        }
      }
      const rect = new Rectangle(
        min[0],
        min[1],
        max[0] - min[0],
        max[1] - min[1]
      )
      bounds = bounds ? bounds.unite(rect) : rect
    }
  }
  return bounds ?? new Rectangle()
}

// Returns the region with its paths reduced, see reducePath(), and without
// the paths that are empty then:
export function reduceRegion({ paths, fillRule }: RegionValues): RegionValues {
  return {
    fillRule,
    paths: paths.map(reducePath).filter(({ segments }) => segments.length)
  }
}
