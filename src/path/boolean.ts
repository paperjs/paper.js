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
 * Boolean Geometric Path Operations
 *
 * Supported
 *  - Path and CompoundPath items
 *  - Boolean Union
 *  - Boolean Intersection
 *  - Boolean Subtraction
 *  - Boolean Exclusion
 *  - Resolving a self-intersecting Path items
 *  - Boolean operations on self-intersecting Paths items
 *
 * @author Harikrishnan Gopalakrishnan <hari.exeption@gmail.com>
 * @author Jan Boesenberg <jan.boesenberg@gmail.com>
 * @author Jürg Lehni <juerg@scratchdisk.com>
 */

import {
  CompoundPath,
  EPSILON,
  Item,
  Path,
  Point,
  getFeature,
  getScope,
  getStrokeProfilePart,
  setStrokeProfileRuns
} from '../internal.ts'
import type { Rectangle } from '../basic/Rectangle.ts'
import type { Operator } from '../boolean/graph.ts'
import type { RegionValues } from '../values/region.ts'
import type { PathItem } from './PathItem.ts'
import type { ProfilePart } from './StrokeProfile.ts'
import type { FillRule } from '../values/region.ts'

export type BooleanOperation =
  | 'unite'
  | 'intersect'
  | 'subtract'
  | 'exclude'
  | 'divide'

export type BooleanOptions = {
  insert?: boolean
  trace?: boolean
  stroke?: boolean
}

const { abs } = Math

function getPaths(path: PathItem): Path[] {
  return (path._children ?? [path]) as Path[]
}

/*
 * Creates a clone of the path that we can modify freely, with its matrix
 * applied to its geometry. Calls #reduce() to simplify compound paths and
 * remove empty curves, and closes open paths if required.
 */
function preparePath(path: PathItem, close?: boolean): PathItem {
  const res = path
    .clone(false)
    .reduce({ simplify: true })
    .transform(null, true, true) as PathItem
  return close ? closePaths(res) : res
}

/*
 * Closes the open paths of the path item with straight lines, as filling
 * them does.
 */
export function closePaths<T extends PathItem>(item: T): T {
  const paths = getPaths(item)
  for (let i = 0, l = paths.length; i < l; i++) {
    const path = paths[i]
    if (!path._closed && !path.isEmpty()) {
      // Close with epsilon tolerance, to avoid tiny straight
      // that would cause issues with intersection detection.
      // If the ends meet, this joins them and keeps the curve
      // that ends there. Only a new closing curve is straight
      // (#1929):
      const count = path._segments.length
      path.closePath(EPSILON)
      if (path._segments.length === count) {
        path.firstSegment.handleIn = [0, 0]
        path.lastSegment.handleOut = [0, 0]
      }
    }
  }
  return item
}

/*
 * Returns the path item as the plain description that the graph takes.
 */
export function getRegion(item: PathItem): RegionValues {
  return {
    fillRule: item.fillRule,
    paths: getPaths(item).map(path => ({
      closed: path._closed,
      segments: path._segments.map(
        ({ _point: point, _handleIn: handleIn, _handleOut: handleOut }) => [
          [point._x, point._y],
          [handleIn._x, handleIn._y],
          [handleOut._x, handleOut._y]
        ]
      )
    }))
  }
}

/*
 * Returns the region as a path item: a path, or a compound path of several.
 */
export function createPathItem({ paths, fillRule }: RegionValues): PathItem {
  const create = ({ segments, closed }: RegionValues['paths'][number]) =>
    new Path({ segments, closed, insert: false })
  const item =
    paths.length === 1
      ? create(paths[0])
      : new CompoundPath({ children: paths.map(create), insert: false })
  item.fillRule = fillRule
  return item
}

/*
 * Traces the outlines of the areas that the operator includes, see
 * traceGraph(), and returns them as paths. Where any of the operands' paths
 * has a stroke profile, each traced path takes the parts of the profiles of
 * the paths that it runs along.
 */
export function tracePaths(operands: PathItem[], operator: Operator): Path[] {
  const sources = operands.map(getPaths)
  const hasProfiles = sources.some(paths =>
    paths.some(path => path._strokeProfile)
  )
  // The profile of each path and the offsets of its curves, once needed:
  const profiles: Record<number, { part: ProfilePart; offsets: number[] }> = {}
  const getProfile = (path: Path) => {
    let offset = 0
    return (profiles[path._id] ??= {
      part: getStrokeProfilePart(path),
      offsets: path.curves.map(curve => {
        const start = offset
        offset += curve.length
        return start
      })
    })
  }

  const { traceGraph } = getFeature('boolean')
  const paths: Path[] = []
  for (const traced of traceGraph(operands.map(getRegion), operator)) {
    const path = new Path(Item.NO_INSERT)
    path.segments = traced.segments
    path.closed = true
    if (hasProfiles) {
      setStrokeProfileRuns(
        path,
        traced.sources.map(({ operand, path, curve, time1, time2 }) => {
          const source = sources[operand][path]
          const { part, offsets } = getProfile(source)
          const reversed = time1 > time2
          const from = reversed ? time2 : time1
          const { curves } = source
          return {
            part,
            start: offsets[curve] + curves[curve].getPartLength(0, from),
            length: curves[curve].getPartLength(from, reversed ? time1 : time2),
            reversed
          }
        })
      )
    }
    // Only add paths that cover an area to the result.
    if (path.area !== 0) {
      paths.push(path)
    }
  }
  return paths
}

export function createResult(
  paths: PathItem[],
  simplify: boolean,
  path1: PathItem,
  path2: PathItem | PathItem[] | null,
  options?: BooleanOptions
): PathItem {
  let result = new CompoundPath(Item.NO_INSERT) as PathItem
  result.addChildren(paths)
  // See if the item can be reduced to just a simple Path.
  result = result.reduce({ simplify }) as PathItem
  const { insert = getScope().settings.insertItems } = options ?? {}
  if (insert) {
    // Insert the resulting path above whichever of the paths that are
    // siblings of path1 appears furthest up in the stack:
    let above = path1
    const others = [].concat(path2 ?? [])
    for (let i = 0, l = others.length; i < l; i++) {
      const other = others[i]
      if (path1.isSibling(other) && other.index > above.index) {
        above = other
      }
    }
    result.insertAbove(above)
  }
  // Copy over the input path attributes, excluding matrix and we're done.
  result.copyAttributes(path1, true)
  return result
}

export function traceBoolean(
  path1: PathItem,
  path2: PathItem | PathItem[] | null,
  operation: BooleanOperation,
  options?: BooleanOptions
): PathItem {
  // Only support subtract and intersect operations when computing stroke
  // based boolean operations (options.split = true).
  if (
    options &&
    (options.trace == false || options.stroke) &&
    /^(subtract|intersect)$/.test(operation)
  ) {
    return splitBoolean(path1, path2, operation, options)
  }
  const { booleanOperators } = getFeature('boolean')
  // We do not modify the operands themselves, but trace copies of them.
  // NOTE: The result paths might not belong to the same type i.e.
  // subtract(A:Path, B:Path):CompoundPath etc.
  let paths: Path[]
  if (operation === 'exclude' && Array.isArray(path2) && path2.length > 1) {
    // Resolved on its own, each path fills where its winding is odd.
    // So together, they fill where an odd number of them do, as one
    // compound path with the even-odd rule:
    const items = [path1].concat(path2)
    const compound = new CompoundPath(Item.NO_INSERT)
    compound.fillRule = 'evenodd'
    for (let i = 0, l = items.length; i < l; i++) {
      compound.addChildren(
        tracePaths([preparePath(items[i], true)], booleanOperators.unite)
      )
    }
    paths = tracePaths([compound], booleanOperators.unite)
  } else {
    paths = tracePaths(
      getOperands(path1, combinePaths(path2, operation)),
      booleanOperators[operation]
    )
  }
  return createResult(paths, true, path1, path2, options)
}

/*
 * Combines a list of paths into the one path that path1 is operated on
 * with, pairwise in a balanced tree so that each step only meets results
 * of similar size. To subtract them, we subtract their union.
 */
function combinePaths(
  paths: PathItem | PathItem[] | null,
  operation: BooleanOperation
): PathItem | null {
  const isUnite = operation === 'unite' || operation === 'subtract'

  type Entry = { path: PathItem; bounds: Rectangle; center: Point }

  function combine(entries: Entry[]): PathItem {
    if (entries.length > 1) {
      if (isUnite) {
        // Split the paths along the longer side of their bounds,
        // so each step unites paths that lie close to each other:
        let { bounds } = entries[0]
        for (let i = 1, l = entries.length; i < l; i++) {
          bounds = bounds.unite(entries[i].bounds)
        }
        const key = bounds.width > bounds.height ? 'x' : 'y'
        entries.sort(
          (entry1, entry2) => entry1.center[key] - entry2.center[key]
        )
      }
      const middle = entries.length >> 1
      return traceBoolean(
        combine(entries.slice(0, middle)),
        combine(entries.slice(middle)),
        isUnite ? 'unite' : operation,
        { insert: false }
      )
    }
    return entries[0].path
  }

  const entries = [].concat(paths ?? []).map((path: PathItem) => {
    const { bounds } = path
    return { path, bounds, center: bounds.center }
  })
  return entries.length ? combine(entries) : null
}

export function splitBoolean(
  path1: PathItem,
  path2: PathItem | PathItem[] | null,
  operation: BooleanOperation,
  options?: BooleanOptions
): PathItem {
  const _path1 = preparePath(path1)
  const _path2 = preparePath(combinePaths(path2, operation))
  const sources = getPaths(_path1)
  const parts: Record<number, ProfilePart> = {}
  const paths: Path[] = []
  const { splitGraph } = getFeature('boolean')
  for (const piece of splitGraph(getRegion(_path1).paths, getRegion(_path2))) {
    if (
      operation === 'divide' ||
      piece.isInside !== (operation === 'subtract')
    ) {
      const source = sources[piece.source]
      if (piece.isWhole) {
        paths.push(source)
      } else {
        const path = new Path({ segments: piece.segments, insert: false })
        // The pieces keep the parts of the profiles of their paths:
        if (source._strokeProfile) {
          setStrokeProfileRuns(path, [
            {
              part: (parts[piece.source] ??= getStrokeProfilePart(source)),
              start: piece.offset,
              length: path.length
            }
          ])
        }
        paths.push(path)
      }
    }
  }
  return createResult(paths, false, path1, path2, options)
}

/*
 * Reorients the paths so that they fill the same area by any fill rule as
 * they do by the given one: The graph traces the outlines of that area, and
 * each path that an outline runs along takes its orientation, or is left out
 * if none does. Outlines that run along several paths, which touch or cross
 * there, or along parts of one, replace them. The outer paths get the given
 * orientation, by default that of the largest path.
 */
export function reorientPaths(
  paths: Path[],
  fillRule: FillRule,
  clockwise?: boolean
): Path[] {
  if (paths.length) {
    clockwise ??= paths.reduce((largest, path) =>
      abs(path.area) > abs(largest.area) ? path : largest
    ).clockwise
    const outlines = getFeature('boolean').traceGraph(
      [
        {
          fillRule,
          paths: paths.map(path => ({
            ...getRegion(path).paths[0],
            closed: true
          }))
        }
      ],
      inside => inside
    )
    // How many outlines run along each path:
    const counts = paths.map(() => 0)
    for (const { sources } of outlines) {
      for (const index of new Set(sources.map(source => source.path))) {
        counts[index]++
      }
    }
    // The paths of the result at the index of the first path that their
    // outline runs along, to keep their order:
    const results: Path[][] = paths.map(() => [])
    for (const { segments, sources } of outlines) {
      const indices = [...new Set(sources.map(source => source.path))]
      const index = Math.min(...indices)
      let path = paths[index]
      if (indices.length === 1 && counts[index] === 1) {
        // The graph traces outer paths clockwise:
        const { time1, time2 } = sources[0]
        if (time1 > time2 === clockwise) {
          path.reverse()
        }
      } else {
        path = new Path(Item.NO_INSERT)
        path.segments = segments
        path.closed = true
        path.clockwise = path.clockwise === clockwise
      }
      results[index].push(path)
    }
    return results.flat()
  } else {
    return paths
  }
}

/*
 * Prepares the operands of a boolean operation. Without path2, the
 * operation resolves path1 on its own.
 */
export function getOperands(
  path1: PathItem,
  path2?: PathItem | null
): PathItem[] {
  const operands = [preparePath(path1, true)]
  if (path2) {
    operands.push(preparePath(path2, true))
  }
  return operands
}
