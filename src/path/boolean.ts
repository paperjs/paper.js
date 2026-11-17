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
  Bezier,
  getWinding,
  splitGraph,
  CompoundPath,
  EPSILON,
  GEOMETRIC_EPSILON,
  Item,
  Path,
  Point,
  findItemBoundsCollisions,
  getStrokeProfilePart,
  paper,
  push,
  setStrokeProfileRuns,
  traceGraph
} from '../internal.ts'
import type { Winding } from '../boolean/winding.ts'
import type { Rectangle } from '../basic/Rectangle.ts'
import type { Operator } from '../boolean/graph.ts'
import type { RegionData } from '../data/region.ts'
import type { PathItem } from './PathItem.ts'
import type { ProfilePart } from './StrokeProfile.ts'

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

const { min, max, abs } = Math

// The boolean operators decide if an area is part of the result, from
// whether it is inside each of the two operands.
const operators: Record<string, Operator> = {
  unite: (inside1, inside2) => inside1 || inside2,
  intersect: (inside1, inside2) => inside1 && inside2,
  subtract: (inside1, inside2) => inside1 && !inside2,
  exclude: (inside1, inside2) => inside1 !== inside2
}

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
export function getRegion(item: PathItem): RegionData {
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
export function createPathItem({ paths, fillRule }: RegionData): PathItem {
  const create = ({ segments, closed }: RegionData['paths'][number]) =>
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
  const { insert = paper.settings.insertItems } = options ?? {}
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
        tracePaths([preparePath(items[i], true)], operators.unite)
      )
    }
    paths = tracePaths([compound], operators.unite)
  } else {
    paths = tracePaths(
      getOperands(path1, combinePaths(path2, operation)),
      operators[operation]
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

/**
 * Reorients the specified paths.
 *
 * @param paths the paths of which the orientation needs to be
 *     reoriented
 * @param isInside determines if the inside of a path is filled.
 *     For non-zero fill rule this function would be implemented as follows:
 *
 *     function isInside(w) {
 *       return w != 0;
 *     }
 * @param clockwise if provided, the orientation of the root
 *     paths will be set to the orientation specified by `clockwise`,
 *     otherwise the orientation of the largest root child is used.
 * @return the reoriented paths
 */
export function reorientPaths(
  paths: PathItem[],
  isInside: (winding: number) => boolean,
  clockwise?: boolean
): PathItem[] {
  const length = paths?.length
  if (length) {
    // Build a lookup table with information for each path's
    // original index and winding contribution.
    const lookup: Record<
      number,
      {
        container: PathItem | null
        winding: number
        index: number
        exclude?: boolean
      }
    > = {}
    for (let i = 0; i < length; i++) {
      const path = paths[i]
      lookup[path._id] = {
        container: null,
        winding: path.clockwise ? 1 : -1,
        index: i
      }
    }
    // Now sort the paths by their areas, from large to small.
    const sorted = paths.slice().sort((a, b) => abs(b.area) - abs(a.area))
    // Get reference to the first, largest path and insert it
    // already.
    const first = sorted[0]
    // create lookup containing potentially overlapping path bounds
    const collisions = findItemBoundsCollisions(sorted, null, GEOMETRIC_EPSILON)
    if (clockwise == null) {
      clockwise = first.clockwise
    }
    // Now determine the winding for each path, from large to small.
    for (let i = 0; i < length; i++) {
      const path1 = sorted[i]
      const entry1 = lookup[path1._id]
      let containerWinding = 0
      const indices = collisions[i]
      if (indices) {
        let point = null // interior point, only get it if required.
        for (let j = indices.length - 1; j >= 0; j--) {
          if (indices[j] < i) {
            point ??= path1.interiorPoint
            const path2 = sorted[indices[j]]
            // As we run through the paths from largest to
            // smallest, for any current path, all potentially
            // containing paths have already been processed and
            // their orientation fixed. To achieve correct
            // orientation of contained paths based on winding,
            // find one containing path with different
            // "insideness" and set opposite orientation.
            const { curves } = path2
            let winding = 0
            for (let k = 0, n = curves.length; k < n; k++) {
              winding += Bezier.getRayWinding(curves[k].getValues(), point)
            }
            if (winding) {
              const entry2 = lookup[path2._id]
              containerWinding = entry2.winding
              entry1.winding += containerWinding
              entry1.container = entry2.exclude ? entry2.container : path2
              break
            }
          }
        }
      }
      // Only keep paths if the "insideness" changes when crossing the
      // path, e.g. the inside of the path is filled and the outside
      // is not, or vice versa.
      if (isInside(entry1.winding) === isInside(containerWinding)) {
        entry1.exclude = true
        // No need to delete excluded entries. Setting to null is
        // enough, as #setChildren() can handle arrays with gaps.
        paths[entry1.index] = null
      } else {
        // If the containing path is not excluded, we're done
        // searching for the orientation defining path.
        const { container } = entry1
        path1.clockwise = container ? !container.clockwise : clockwise
      }
    }
  }
  return paths
}

// Returns the winding of the point against the paths of the path item, see
// getWinding() in the boolean module:
export function getItemWinding(point: Point, item: PathItem): Winding {
  return getWinding(
    point,
    getPaths(item).map(path => ({
      curves: path.curves.map(curve => curve.getValues()),
      closed: path._closed,
      get clockwise() {
        return path.clockwise
      }
    }))
  )
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

export function getInteriorPoint(item: PathItem): Point {
  const { bounds } = item
  const point = bounds._getCenter(true)
  // contains() includes the boundary, but a point on the path isn't
  // interior, e.g. a vertex shared with another path (#1837):
  if (
    !item.contains(point) ||
    item.getNearestPoint(point).isClose(point, GEOMETRIC_EPSILON)
  ) {
    // Since there is no guarantee that a poly-bezier path contains
    // the center of its bounding rectangle, we shoot a ray in x
    // direction and select a point between the first consecutive
    // intersections of the ray on the left. The ray runs through
    // the middle of the band around the center where no
    // y-monotone curve starts or ends, so that it crosses the path
    // instead of touching it or running along it (#1837):
    const { curves } = item
    const monoCurves = []
    const ys = []
    const intercepts = []
    const roots = []
    for (let i = 0, l = curves.length; i < l; i++) {
      push(monoCurves, Bezier.getMonoCurves(curves[i].getValues()))
    }
    for (let i = 0, l = monoCurves.length; i < l; i++) {
      ys.push(monoCurves[i][1], monoCurves[i][7])
    }
    ys.sort((a, b) => a - b)
    // The center lies between the top and the bottom of the
    // bounds, which are among the ys, unless the path is flat:
    let { y } = point
    let below = y
    let above = y
    for (let i = 0, l = ys.length; i < l && above === y; i++) {
      if (ys[i] <= y) {
        below = ys[i]
      } else {
        above = ys[i]
      }
    }
    y = point.y = (below + above) / 2
    for (let i = 0, l = monoCurves.length; i < l; i++) {
      const mv = monoCurves[i]
      const mo0 = mv[1]
      const mo3 = mv[7]
      if (y > min(mo0, mo3) && y < max(mo0, mo3)) {
        intercepts.push(
          Bezier.solve(mv, 1, y, roots, 0, 1) === 1
            ? Bezier.getPoint(mv, roots[0]).x
            : (mv[0] + mv[6]) / 2
        )
      }
    }
    if (intercepts.length > 1) {
      intercepts.sort((a, b) => a - b)
      point.x = (intercepts[0] + intercepts[1]) / 2
    }
  }
  return point
}
