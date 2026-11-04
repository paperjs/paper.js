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
  Curve,
  CurveLocation,
  EPSILON,
  GEOMETRIC_EPSILON,
  Item,
  Path,
  Point,
  Segment,
  findBoundsCollisions,
  findCurveBoundsCollisions,
  findItemBoundsCollisions,
  getEpsilon,
  paper,
  push
} from '../internal.ts'
import type { Rectangle } from '../basic/Rectangle.ts'
import type { PathItem } from './PathItem.ts'

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

export type Winding = {
  winding: number
  windingL: number
  windingR: number
  onPath: boolean
}

type Operator = (inside1: boolean, inside2: boolean) => boolean

// The planar graph of createGraph(), with points stored by their index in its
// list of cut points, and vertices, edges and half-edges by their index:
type Cut = { time: number; point: number }

type Vertex = {
  x: number
  y: number
  isEnd: boolean
  point: number
  outgoing: number[]
}

type Edge = {
  values: number[]
  from: number
  to: number
  isStraight: boolean
  windings: number[]
  curve: number
  time1: number
  time2: number
  reversed?: number[]
  length?: number
}

type HalfEdge = {
  edge: Edge
  values: number[]
  from: number
  to: number
  directions?: { start: number; width: number }
  point?: Point
  angle?: number
  position?: number
  next?: number
  face?: Face
}

type Face = {
  halfEdges: number[]
  area: number
  windings: number[] | null
  component: Component | null
  isInside?: boolean
}

type Component = {
  edges: Edge[]
  bounds: number[]
  outside: Face
}

export type Graph = {
  curves: Curve[]
  values: number[][]
  vertices: Vertex[]
  edges: Edge[]
  halfEdges: HalfEdge[]
  faces: Face[]
  nonZeros: boolean[]
  epsilon: number
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
  return (path._children || [path]) as Path[]
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

/**
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

/**
 * Creates the item that a boolean operation returns from its paths, and
 * inserts it above the operands, unless `options.insert` is `false`.
 */
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
  // An explicit null leaves the result out, as undefined falls back:
  const insert = options?.insert
  if (insert !== undefined ? insert : paper.settings.insertItems) {
    // Insert the resulting path above whichever of the paths that are
    // siblings of path1 appears furthest up in the stack:
    let above = path1
    const others = [].concat(path2 || [])
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

function filterIntersection(location: CurveLocation): boolean {
  // TODO: Change isCrossing() to also handle overlaps (hasOverlap())
  // that are actually involved in a crossing! For this we need proper
  // overlap range detection / merging first... But as we call
  // #resolveCrossings() first in boolean operations, removing all
  // self-touching areas in paths, this works for the known use cases.
  // The ideal implementation would deal with it in a way outlined in:
  // https://github.com/paperjs/paper.js/issues/874#issuecomment-168332391
  return location.hasOverlap() || location.isCrossing()
}

/**
 * Performs the boolean operation on path1 with path2, which may be a list of
 * paths, by tracing the areas that it includes, or by splitting path1 for
 * stroke based operations.
 */
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
        let bounds = entries[0].bounds
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

  const entries = [].concat(paths || []).map((path: PathItem) => {
    const { bounds } = path
    return { path, bounds, center: bounds.center }
  })
  return entries.length ? combine(entries) : null
}

/**
 * Performs the boolean operation by splitting the paths of path1 where they
 * cross path2, and keeping the pieces that the operation includes.
 */
export function splitBoolean(
  path1: PathItem,
  path2: PathItem | PathItem[] | null,
  operation: BooleanOperation,
  options?: BooleanOptions
): PathItem {
  const _path1 = preparePath(path1)
  const _path2 = preparePath(combinePaths(path2, operation))
  const crossings = _path1.getIntersections(_path2, filterIntersection)
  const subtract = operation === 'subtract'
  const divide = operation === 'divide'
  const pieces: Path[] = []
  const paths: Path[] = []

  // Split the paths of path1 at all crossings, backwards so the earlier
  // locations stay valid. A split returns the part after it, or for a
  // closed path, the path itself, opened at the split, so pieces are
  // only tested once all splitting is done (#1540):
  for (let i = crossings.length - 1; i >= 0; i--) {
    const crossing = crossings[i]
    const split = crossing.path
    const path = crossing.split()
    if (path) {
      // Clear the handles on both sides of the split, as they might
      // have belonged to curves:
      path.firstSegment.handleIn = [0, 0]
      split.lastSegment.handleOut = [0, 0]
      if (pieces.indexOf(path) === -1) {
        pieces.push(path)
      }
    }
  }
  // Add what's left of the paths of path1, split or not, which for a
  // compound path are its children (#1541):
  const children = getPaths(_path1)
  for (let i = 0, l = children.length; i < l; i++) {
    if (pieces.indexOf(children[i]) === -1) {
      pieces.push(children[i])
    }
  }
  // Simply see if the point halfway across each piece is inside path2,
  // and include or exclude it based on the operation.
  for (let i = 0, l = pieces.length; i < l; i++) {
    const piece = pieces[i]
    if (
      divide ||
      _path2.contains(piece.getPointAt(piece.length / 2)) !== subtract
    ) {
      paths.unshift(piece)
    }
  }
  return createResult(paths, false, path1, path2, options)
}

/*
 * Returns the winding of the point against the curve values, as the sum of
 * the curve's parts that cross a ray from it in x-direction, upwards as +1
 * and downwards as -1. Both reorientPaths() and the graph's components
 * tell with it which path lies inside which.
 */
function getRayWinding(point: Point, v: number[]): number {
  let winding = 0
  const { x, y } = point
  // Only curves that reach the ray at all:
  if (
    y >= min(v[1], v[3], v[5], v[7]) &&
    y <= max(v[1], v[3], v[5], v[7]) &&
    x < max(v[0], v[2], v[4], v[6])
  ) {
    const monoCurves = Curve.getMonoCurves(v)
    const roots = []
    for (let i = 0, l = monoCurves.length; i < l; i++) {
      const mv = monoCurves[i]
      const y0 = mv[1]
      const y3 = mv[7]
      const dir = y0 < y3 ? 1 : y0 > y3 ? -1 : 0
      if (dir && y >= min(y0, y3) && y < max(y0, y3)) {
        // The monotone curve crosses the ray once. solveCubic()
        // can miss it close to the ends, where it is at the end:
        const px =
          Curve.solveCubic(mv, 1, y, roots, 0, 1) > 0
            ? Curve.getPoint(mv, roots[0]).x
            : abs(y - y0) < abs(y - y3)
              ? mv[0]
              : mv[6]
        if (px > x) {
          winding += dir
        }
      }
    }
  }
  return winding
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
  const length = paths && paths.length
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
    const collisions = findItemBoundsCollisions(
      sorted,
      null,
      GEOMETRIC_EPSILON
    )
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
            point = point || path1.interiorPoint
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
              winding += getRayWinding(point, curves[k].getValues())
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

/**
 * Returns the winding contribution number of the given point in respect
 * to the shapes described by the passed curves.
 *
 * See #1073#issuecomment-226942348 and #1073#issuecomment-226946965 for a
 * detailed description of the approach developed by @iconexperience to
 * precisely determine the winding contribution in all known edge cases.
 *
 * @param point the location for which to determine the winding
 *     contribution
 * @param curves The curves that describe the shape against which
 *     to check, as returned by {@link Path#curves} or
 *     {@link CompoundPath#curves}.
 * @param [dir=false] the direction in which to determine the
 *     winding contribution, `false`: in x-direction, `true`: in y-direction
 * @param [dontFlip=false] controls whether the algorithm is
 *     allowed to flip direction if it is deemed to produce better results
 * @return an object containing the calculated winding number, as
 *     well as an indication whether the point was situated on the contour
 * @private
 */
export function getWinding(
  point: Point,
  curves: Curve[],
  dir?: boolean,
  dontFlip?: boolean
): Winding {
  let res: Winding | false

  // Determine the index of the abscissa and ordinate values in the curve
  // values arrays, based on the direction:
  const ia = dir ? 1 : 0 // the abscissa index
  const io = ia ^ 1 // the ordinate index
  const pv = [point.x, point.y]
  const pa = pv[ia] // the point's abscissa
  const po = pv[io] // the point's ordinate
  // Use a separate epsilon for winding contribution code.
  const windingEpsilon = 1e-9
  const paL = pa - windingEpsilon
  const paR = pa + windingEpsilon
  let windingL = 0
  let windingR = 0
  let pathWindingL = 0
  let pathWindingR = 0
  let onPath = false
  let onAnyPath = false
  const roots = []
  let vPrev: number[]
  let vClose: number[]

  function addWinding(v: number[]): Winding | false {
    const o0 = v[io + 0]
    const o3 = v[io + 6]
    if (po < min(o0, o3) || po > max(o0, o3)) {
      // If the curve is outside the ordinates' range, no intersection
      // with the ray is possible.
      return
    }
    const a0 = v[ia + 0]
    const a1 = v[ia + 2]
    const a2 = v[ia + 4]
    const a3 = v[ia + 6]
    if (o0 === o3) {
      // A horizontal curve is not necessarily between two non-
      // horizontal curves. We have to take cases like these into
      // account:
      //          +-----+
      //     +----+     |
      //          +-----+
      if ((a0 < paR && a3 > paL) || (a3 < paR && a0 > paL)) {
        onPath = true
      }
      // If curve does not change in ordinate direction, windings will
      // be added by adjacent curves.
      // Bail out without updating vPrev at the end of the call.
      return
    }
    // Determine the curve-time value corresponding to the point.
    const t =
      po === o0
        ? 0
        : po === o3
          ? 1
          : // If the abscissa is outside the curve, we can use any
            // value except 0 (requires special handling). Use 1, as it
            // does not require additional calculations for the point.
            paL > max(a0, a1, a2, a3) || paR < min(a0, a1, a2, a3)
            ? 1
            : Curve.solveCubic(v, io, po, roots, 0, 1) > 0
              ? roots[0]
              : 1
    const a =
      t === 0 ? a0 : t === 1 ? a3 : Curve.getPoint(v, t)[dir ? 'y' : 'x']
    const winding = o0 > o3 ? 1 : -1
    const windingPrev = vPrev[io] > vPrev[io + 6] ? 1 : -1
    const a3Prev = vPrev[ia + 6]
    if (po !== o0) {
      // Standard case, curve is not crossed at its starting point.
      if (a < paL) {
        pathWindingL += winding
      } else if (a > paR) {
        pathWindingR += winding
      } else {
        onPath = true
      }
    } else {
      // Curve is crossed at starting point.
      if (winding !== windingPrev) {
        // Winding changes from previous curve, cancel its winding.
        if (a0 < paL) {
          pathWindingL += winding
        } else if (a0 > paR) {
          pathWindingR += winding
        }
      } else if (a0 != a3Prev) {
        // Handle a horizontal curve between the current and
        // previous non-horizontal curve. See
        // #1261#issuecomment-282726147 for a detailed explanation:
        if (a3Prev < paR && a > paR) {
          // Right winding was not added before, so add it now.
          pathWindingR += winding
          onPath = true
        } else if (a3Prev > paL && a < paL) {
          // Left winding was not added before, so add it now.
          pathWindingL += winding
          onPath = true
        }
      }
    }
    vPrev = v
    // If we're on the curve, look at the tangent to decide whether to
    // flip direction to better determine a reliable winding number:
    // If the tangent is parallel to the direction, call getWinding()
    // again with flipped direction and return that result instead.
    return (
      !dontFlip &&
      a > paL &&
      a < paR &&
      Curve.getTangent(v, t)[dir ? 'x' : 'y'] === 0 &&
      getWinding(point, curves, !dir, true)
    )
  }

  function handleCurve(v: number[]): Winding | false {
    // Get the ordinates:
    const o0 = v[io + 0]
    const o1 = v[io + 2]
    const o2 = v[io + 4]
    const o3 = v[io + 6]
    // Only handle curves that can cross the point's ordinate.
    if (po <= max(o0, o1, o2, o3) && po >= min(o0, o1, o2, o3)) {
      // Get the abscissas:
      const a0 = v[ia + 0]
      const a1 = v[ia + 2]
      const a2 = v[ia + 4]
      const a3 = v[ia + 6]
      // Get monotone curves. If the curve is outside the point's
      // abscissa, it can be treated as a monotone curve:
      const monoCurves =
        paL > max(a0, a1, a2, a3) || paR < min(a0, a1, a2, a3)
          ? [v]
          : Curve.getMonoCurves(v, dir)
      let res: Winding | false
      for (let i = 0, l = monoCurves.length; i < l; i++) {
        // Calling addWinding() my lead to direction flipping, in
        // which case we already have the result and can return it.
        if ((res = addWinding(monoCurves[i]))) return res
      }
    }
  }

  for (let i = 0, l = curves.length; i < l; i++) {
    const curve = curves[i]
    const path = curve._path
    const v = curve.getValues()

    if (!i || curves[i - 1]._path !== path) {
      // We're on a new (sub-)path, so we need to determine values of
      // the last non-horizontal curve on this path.
      vPrev = null
      // If the path is not closed, connect the first and last segment
      // with a straight curve, just like how filling open paths works:
      if (!path._closed) {
        vClose = Curve.getValues(
          path.lastCurve.segment2,
          curve.segment1,
          null,
          true
        )
        // This closing curve is a potential candidate for the last
        // non-horizontal curve.
        if (vClose[io] !== vClose[io + 6]) {
          vPrev = vClose
        }
      }

      if (!vPrev) {
        // Walk backwards through list of the path's curves until we
        // find one that is not horizontal.
        // Fall-back to the first curve's values if none is found:
        vPrev = v
        let prev = path.lastCurve
        while (prev && prev !== curve) {
          const v2 = prev.getValues()
          if (v2[io] !== v2[io + 6]) {
            vPrev = v2
            break
          }
          prev = prev.previous
        }
      }
    }

    // Calling handleCurve() my lead to direction flipping, in which
    // case we already have the result and can return it.
    if ((res = handleCurve(v))) return res

    if (i + 1 === l || curves[i + 1]._path !== path) {
      // We're at the last curve of the current (sub-)path. If a
      // closing curve was calculated at the beginning of it, handle
      // it now to treat the path as closed:
      if (vClose && (res = handleCurve(vClose))) return res
      if (onPath && !pathWindingL && !pathWindingR) {
        // If the point is on the path and the windings canceled
        // each other, we treat the point as if it was inside the
        // path. A point inside a path has a winding of [+1,-1]
        // for clockwise and [-1,+1] for counter-clockwise paths.
        // If the ray is cast in y direction (dir == true), the
        // windings always have opposite sign.
        pathWindingL = pathWindingR = path.clockwise !== !!dir ? 1 : -1
      }
      windingL += pathWindingL
      windingR += pathWindingR
      pathWindingL = pathWindingR = 0
      if (onPath) {
        onAnyPath = true
        onPath = false
      }
      vClose = null
    }
  }
  // Use the unsigned winding contributions when determining which areas
  // are part of the boolean result.
  windingL = abs(windingL)
  windingR = abs(windingR)
  return {
    winding: max(windingL, windingR),
    windingL,
    windingR,
    onPath: onAnyPath
  }
}

/*
 * Returns the part of the curve values v between the curve times, with its
 * ends moved to the given points, along with their handles. Straight
 * curves remain straight.
 */
function getPart(
  v: number[],
  hasHandles: boolean,
  time1: number,
  time2: number,
  point1: { x: number; y: number },
  point2: { x: number; y: number }
): number[] {
  let part: number[]
  if (hasHandles) {
    part = Curve.getPart(v, time1, time2).slice()
    const dx1 = point1.x - part[0]
    const dy1 = point1.y - part[1]
    const dx2 = point2.x - part[6]
    const dy2 = point2.y - part[7]
    part[0] += dx1
    part[1] += dy1
    part[2] += dx1
    part[3] += dy1
    part[4] += dx2
    part[5] += dy2
    part[6] += dx2
    part[7] += dy2
  } else {
    part = [
      point1.x,
      point1.y,
      point1.x,
      point1.y,
      point2.x,
      point2.y,
      point2.x,
      point2.y
    ]
  }
  return part
}

/**
 * Creates a planar graph of the operands' curves: All intersections become
 * vertices, the pieces of curves between them edges, and the edges bound
 * faces with a known winding for each operand.
 *
 * @param operands the operands, with closed paths only
 * @return the graph's vertices, edges, half-edges and faces
 */
export function createGraph(operands: PathItem[]): Graph {
  const curves: Curve[] = []
  const curveOperands: number[] = []
  const offsets: Record<number, number> = {}
  const nonZeros: boolean[] = []
  let bounds: Rectangle = null
  for (let i = 0, l = operands.length; i < l; i++) {
    const operand = operands[i]
    const paths = getPaths(operand)
    nonZeros.push(operand.fillRule === 'nonzero')
    bounds = bounds ? bounds.unite(operand.bounds) : operand.bounds
    for (let j = 0, k = paths.length; j < k; j++) {
      const pathCurves = paths[j].curves
      offsets[paths[j]._id] = curves.length
      for (let m = 0, n = pathCurves.length; m < n; m++) {
        curves.push(pathCurves[m])
        curveOperands.push(i)
      }
    }
  }
  // Points closer than epsilon are one vertex. It is relative to the size
  // of the operands, but not below the resolution of their coordinates:
  const epsilon = getEpsilon(
    max(
      abs(bounds.left), abs(bounds.right),
      abs(bounds.top), abs(bounds.bottom)
    ),
    bounds.topLeft.getDistance(bounds.bottomRight) * GEOMETRIC_EPSILON
  )
  const values: number[][] = []
  const cuts: Cut[][] = []
  const xs: number[] = []
  const ys: number[] = []
  const isEnds: boolean[] = []

  function addCut(index: number, time: number, point: Point, isEnd: boolean) {
    cuts[index].push({ time, point: xs.length })
    xs.push(point.x)
    ys.push(point.y)
    isEnds.push(isEnd)
  }

  // 1. Cut the curves at their ends and at all intersections, including
  // those within the same operand and the ends of overlaps:
  for (let i = 0, l = curves.length; i < l; i++) {
    const curve = curves[i]
    values.push(curve.getValues())
    cuts.push([])
    addCut(i, 0, curve._segment1._point, true)
    addCut(i, 1, curve._segment2._point, true)
  }
  // The curves whose bounds come within 2 epsilon of each other, for the
  // intersections and the hot pixels below:
  const collisions = findCurveBoundsCollisions(values, values, 2 * epsilon)
  const locations = CurveLocation.expand(
    Curve.getIntersections(
      curves,
      null,
      null,
      null,
      null,
      false,
      epsilon,
      collisions
    )
  )
  for (let i = 0, l = locations.length; i < l; i++) {
    const location = locations[i]
    const { curve } = location
    addCut(
      offsets[curve._path._id] + curve.index,
      location.time,
      location.point,
      false
    )
  }
  // Curves whose control points lie along a line can reverse along it,
  // and overlap themselves and the other curves along it. Cut them where
  // they reverse, so that their pieces run in one direction, and the
  // hot pixels below cut the curves they overlap at the same vertices:
  for (let i = 0, l = curves.length; i < l; i++) {
    const times = Curve.getReversals(values[i], epsilon)
    for (let j = 0, k = times.length; j < k; j++) {
      addCut(i, times[j], Curve.getPoint(values[i], times[j]), false)
    }
  }

  // 2. Merge points closer than epsilon into vertices, through union-find
  // on the points sorted by x. A vertex takes the position of a curve end
  // if it has one, so the operands' own vertices stay where they are:
  const count = xs.length
  const parents = new Array(count)
  const order = new Array(count)
  for (let i = 0; i < count; i++) {
    parents[i] = order[i] = i
  }

  function getRoot(i: number): number {
    while (parents[i] !== i) {
      i = parents[i] = parents[parents[i]]
    }
    return i
  }

  order.sort((a, b) => xs[a] - xs[b])
  for (let i = 0; i < count; i++) {
    const a = order[i]
    for (let j = i + 1; j < count && xs[order[j]] - xs[a] <= epsilon; j++) {
      const b = order[j]
      const dx = xs[b] - xs[a]
      const dy = ys[b] - ys[a]
      if (dx * dx + dy * dy <= epsilon * epsilon) {
        parents[getRoot(a)] = getRoot(b)
      }
    }
  }
  let vertexIndices: Record<number, number>
  let vertices: Vertex[]

  function createVertices() {
    vertexIndices = {}
    vertices = []
    for (let i = 0; i < count; i++) {
      const root = getRoot(i)
      const index = vertexIndices[root]
      if (index === undefined) {
        vertexIndices[root] = vertices.length
        vertices.push({
          x: xs[i],
          y: ys[i],
          isEnd: isEnds[i],
          point: i,
          outgoing: []
        })
      } else if (isEnds[i] && !vertices[index].isEnd) {
        vertices[index] = {
          x: xs[i],
          y: ys[i],
          isEnd: true,
          point: i,
          outgoing: []
        }
      }
    }
  }

  createVertices()

  function getVertex(point: number): number {
    return vertexIndices[getRoot(point)]
  }

  // The piece of curve i between two cuts, with its ends moved to their
  // vertices, along with their handles:
  function getPiece(i: number, cut1: Cut, cut2: Cut): number[] {
    return getPart(
      values[i],
      curves[i].hasHandles(),
      cut1.time,
      cut2.time,
      vertices[getVertex(cut1.point)],
      vertices[getVertex(cut2.point)]
    )
  }

  function sortCuts(list: Cut[]): Cut[] {
    return list.sort((a, b) => a.time - b.time)
  }

  // The last curve that tested each vertex in getHotPixels(), to test
  // each only once per curve:
  let marks: number[]

  // 2b. Cut the curves where they pass within epsilon of a vertex, the
  // hot pixels of snap rounding. Moving the pieces to their vertices
  // can bring them within epsilon of further ones, so the pieces of each
  // cut are tested again, until none passes a vertex. As cuts only use
  // existing vertices, this ends:
  // The vertices that may cut curve i, as the ones within 2 epsilon of
  // its bounds, since its pieces stay within epsilon of it. Each vertex
  // lies on a curve that it cuts, so we find it among the cuts of the
  // curves whose bounds come that close:
  function getHotPixels(i: number): number[] {
    const v = values[i]
    const left = min(v[0], v[2], v[4], v[6]) - 2 * epsilon
    const top = min(v[1], v[3], v[5], v[7]) - 2 * epsilon
    const right = max(v[0], v[2], v[4], v[6]) + 2 * epsilon
    const bottom = max(v[1], v[3], v[5], v[7]) + 2 * epsilon
    const indices = collisions[i]
    const hotPixels = []
    for (let j = 0, k = indices.length; j < k; j++) {
      const list = cuts[indices[j]]
      for (let m = 0, n = list.length; m < n; m++) {
        const index = getVertex(list[m].point)
        if (marks[index] !== i) {
          const vertex = vertices[index]
          marks[index] = i
          if (
            vertex.x >= left &&
            vertex.x <= right &&
            vertex.y >= top &&
            vertex.y <= bottom
          ) {
            hotPixels.push(index)
          }
        }
      }
    }
    return hotPixels.sort((a, b) => a - b)
  }

  type Piece = { values: number[]; cut1: Cut; cut2: Cut }

  // The pieces of a curve that a vertex may cut, as the ones that don't
  // end in it, and whose bounds come within epsilon of it:
  function isNearPiece(piece: Piece, index: number, vertex: Vertex): boolean {
    const v = piece.values
    const { x, y } = vertex
    return (
      getVertex(piece.cut1.point) !== index &&
      getVertex(piece.cut2.point) !== index &&
      x >= min(v[0], v[2], v[4], v[6]) - epsilon &&
      x <= max(v[0], v[2], v[4], v[6]) + epsilon &&
      y >= min(v[1], v[3], v[5], v[7]) - epsilon &&
      y <= max(v[1], v[3], v[5], v[7]) + epsilon
    )
  }

  function addPiece(pieces: Piece[], i: number, cut1: Cut, cut2: Cut) {
    pieces.push({
      values: getPiece(i, cut1, cut2),
      cut1,
      cut2
    })
  }

  function cutAtHotPixels(i: number) {
    const candidates = getHotPixels(i)
    if (candidates.length) {
      const list = sortCuts(cuts[i])
      const pieces: Piece[] = []
      for (let j = 1, k = list.length; j < k; j++) {
        addPiece(pieces, i, list[j - 1], list[j])
      }
      while (pieces.length) {
        const piece = pieces.pop()
        for (let j = 0, k = candidates.length; j < k; j++) {
          const index = candidates[j]
          const vertex = vertices[index]
          if (isNearPiece(piece, index, vertex)) {
            const point = new Point(vertex.x, vertex.y)
            const t = Curve.getNearestTime(piece.values, point)
            if (
              t > 0 &&
              t < 1 &&
              point.isClose(Curve.getPoint(piece.values, t), epsilon)
            ) {
              const { cut1, cut2 } = piece
              const cut = {
                time: curves[i].hasHandles()
                  ? cut1.time + (cut2.time - cut1.time) * t
                  : Curve.getNearestTime(values[i], point),
                point: vertex.point
              }
              cuts[i].push(cut)
              addPiece(pieces, i, cut1, cut)
              addPiece(pieces, i, cut, cut2)
              break
            }
          }
        }
      }
    }
  }

  // 2c. Merge the vertices that pieces shorter than 4 epsilon join: As
  // the hot pixels reach 2 epsilon, the order of the edges around such
  // vertices can't be told apart. Merged vertices span up to about 5
  // epsilon, the precision of the result. Returns true if it merged
  // any, as moving vertices can bring pieces within epsilon of others:
  function mergeShortPieces(): boolean {
    const pieces: number[][] = []
    let isMerged = false
    for (let i = 0, l = curves.length; i < l; i++) {
      const list = sortCuts(cuts[i])
      for (let j = 1, k = list.length; j < k; j++) {
        const cut1 = list[j - 1]
        const cut2 = list[j]
        if (getVertex(cut1.point) !== getVertex(cut2.point)) {
          // The pieces are at least as long as their ends are
          // apart, so we only measure them if close:
          const v = getPiece(i, cut1, cut2)
          const dx = v[6] - v[0]
          const dy = v[7] - v[1]
          if (
            dx * dx + dy * dy < 16 * epsilon * epsilon &&
            Curve.getLength(v) < 4 * epsilon
          ) {
            pieces.push([cut1.point, cut2.point])
          }
        }
      }
    }
    for (let i = 0, l = pieces.length; i < l; i++) {
      const root1 = getRoot(pieces[i][0])
      const root2 = getRoot(pieces[i][1])
      if (root1 !== root2) {
        parents[root1] = root2
        isMerged = true
      }
    }
    if (isMerged) {
      createVertices()
    }
    return isMerged
  }

  // Cut at the hot pixels and merge, until no vertices move any more,
  // which ends as each merge leaves fewer of them:
  do {
    marks = new Array(vertices.length)
    for (let i = 0, l = curves.length; i < l; i++) {
      cutAtHotPixels(i)
    }
  } while (mergeShortPieces())

  // 3. Create the edges between the vertices along each curve, with the
  // change in winding of each operand when crossing them from right to
  // left. Coincident pieces become one edge that adds up their changes:
  const edges: Edge[] = []
  const edgesByVertex: Edge[][] = []

  function getCoincidence(edge1: Edge, edge2: Edge): number {
    // Compare points along edge2 to edge1, and return the direction
    // of edge2 relative to edge1 if they coincide, or 0:
    const v1 = edge1.values
    const v2 = edge2.values
    const times = []
    for (let i = 1; i <= 3; i++) {
      const point = Curve.getPoint(v2, i / 4)
      const time = Curve.getNearestTime(v1, point)
      if (!point.isClose(Curve.getPoint(v1, time), epsilon)) return 0
      times.push(time)
    }
    return times[0] < times[2] ? 1 : -1
  }

  function addEdge(edge: Edge) {
    // Look up the edges between the same vertices by the first one:
    const first = min(edge.from, edge.to)
    const last = max(edge.from, edge.to)
    const list = edgesByVertex[first] || (edgesByVertex[first] = [])
    for (let i = 0, l = list.length; i < l; i++) {
      const other = list[i]
      const direction = (
        max(other.from, other.to) === last &&
        getCoincidence(other, edge)
      )
      if (direction) {
        for (let j = 0; j < 2; j++) {
          other.windings[j] += direction * edge.windings[j]
        }
        return
      }
    }
    list.push(edge)
    edges.push(edge)
  }

  for (let i = 0, l = curves.length; i < l; i++) {
    const list = cuts[i] // Sorted in 2c.
    const isStraight = !curves[i].hasHandles()
    let prev = list[0]
    for (let j = 1, k = list.length; j < k; j++) {
      const cut = list[j]
      const from = getVertex(prev.point)
      const to = getVertex(cut.point)
      const part = getPiece(i, prev, cut)
      // Drop pieces that start and end in the same vertex, unless
      // they form a loop that is longer than the pieces that vertices
      // merge, see above:
      if (from !== to || Curve.getLength(part) >= 4 * epsilon) {
        const windings = [0, 0]
        windings[curveOperands[i]] = 1
        addEdge({
          values: part,
          from,
          to,
          isStraight,
          windings,
          curve: i,
          time1: prev.time,
          time2: cut.time
        })
      }
      prev = cut
    }
  }

  // 4. Sort the half-edges leaving each vertex by angle. Edge i has the
  // half-edges 2 * i, leaving from its start, and 2 * i + 1, leaving
  // from its end. Their angles are measured to points a short distance
  // along them, where tangent curves already separate, but no other
  // vertex is reached yet:
  const halfEdges: HalfEdge[] = []

  // The point at the distance along the half-edge. Straight edges keep
  // their handles at their ends, so their times don't run evenly:
  function getPointAt(halfEdge: HalfEdge, distance: number): Point {
    const v = halfEdge.values
    const { edge } = halfEdge
    const t = distance / edge.length
    return edge.isStraight
      ? new Point(v[0] + (v[6] - v[0]) * t, v[1] + (v[7] - v[1]) * t)
      : Curve.getPoint(v, Curve.getTimeAt(v, distance))
  }

  function getSide(halfEdge1: HalfEdge, halfEdge2: HalfEdge): number {
    // Half-edges that leave a vertex tangentially and can't be told
    // apart where their angles are measured: Tell on which side of the
    // first one the second one runs, half way along the shorter one,
    // as they don't cross before they end, or return 0 if it doesn't
    // run alongside the first one there:
    const v1 = halfEdge1.values
    const point = getPointAt(
      halfEdge2,
      min(halfEdge1.edge.length, halfEdge2.edge.length) / 2
    )
    const time = Curve.getNearestTime(v1, point)
    return time > 0 && time < 1
      ? (
          Curve.getTangent(v1, time).cross(
            point.subtract(Curve.getPoint(v1, time))
          ) > 0
        )
        ? -1
        : 1
      : 0
  }

  // The range of angles of a half-edge's control polygon, which contains
  // all directions in which it leaves its vertex, or null if the range
  // isn't within a half-plane:
  function getDirections(v: number[]): { start: number; width: number } {
    const angles = []
    for (let i = 0; i < 6; i += 2) {
      const dx = v[i + 2] - v[i]
      const dy = v[i + 3] - v[i + 1]
      if (dx || dy) {
        angles.push(Math.atan2(dy, dx))
      }
    }
    const first = angles[0]
    let from = 0
    let to = 0
    for (let i = 1, l = angles.length; i < l; i++) {
      const difference = (
        ((angles[i] - first + 3 * Math.PI) % (2 * Math.PI)) -
        Math.PI
      )
      from = min(from, difference)
      to = max(to, difference)
    }
    return to - from < Math.PI
      ? {
          start: (first + from + 2 * Math.PI) % (2 * Math.PI),
          width: to - from
        }
      : null
  }

  // Sort the half-edges by their ranges of directions and return true,
  // if these are apart far enough that the points where their angles
  // are measured below lie over 2 epsilon apart: These points lie within
  // the ranges, at least half the shortest chord along the half-edges,
  // and so at least cos(width / 2) times that away from the vertex:
  function sortByDirections(outgoing: number[]): boolean {
    let distance = Infinity
    for (let j = 0, k = outgoing.length; j < k; j++) {
      const halfEdge = halfEdges[outgoing[j]]
      const v = halfEdge.values
      halfEdge.directions = getDirections(v)
      if (!halfEdge.directions) return false
      distance = min(
        distance,
        Math.sqrt(
          (v[6] - v[0]) * (v[6] - v[0]) +
          (v[7] - v[1]) * (v[7] - v[1])
        ) / 2
      )
    }
    const sorted = outgoing
      .slice()
      .sort(
        (a, b) => halfEdges[a].directions.start - halfEdges[b].directions.start
      )
    let gap = Infinity
    let width = 0
    for (let j = 0, k = sorted.length; j < k; j++) {
      const directions1 = halfEdges[sorted[j]].directions
      const directions2 = halfEdges[sorted[(j + 1) % k]].directions
      gap = min(
        gap,
        directions2.start -
        directions1.start -
        directions1.width +
        (j + 1 < k ? 0 : 2 * Math.PI)
      )
      width = max(width, directions1.width)
    }
    if (
      gap > 0 && (
        distance * Math.cos(width / 2) * Math.sin(min(gap, Math.PI / 2)) >
        2 * epsilon
      )
    ) {
      for (let j = 0, k = sorted.length; j < k; j++) {
        outgoing[j] = sorted[j]
      }
      return true
    }
    return false
  }

  for (let i = 0, l = edges.length; i < l; i++) {
    const edge = edges[i]
    const v = edge.values
    edge.reversed = [v[6], v[7], v[4], v[5], v[2], v[3], v[0], v[1]]
    halfEdges.push(
      { edge, values: v, from: edge.from, to: edge.to },
      { edge, values: edge.reversed, from: edge.to, to: edge.from }
    )
    vertices[edge.from].outgoing.push(2 * i)
    vertices[edge.to].outgoing.push(2 * i + 1)
  }
  for (let i = 0, l = vertices.length; i < l; i++) {
    const vertex = vertices[i]
    const { outgoing } = vertex
    // Up to two half-edges are in the same cyclic order either way,
    // and where their ranges of directions are apart far enough,
    // these give the order already:
    if (outgoing.length > 2 && !sortByDirections(outgoing)) {
      let distance = Infinity
      for (let j = 0, k = outgoing.length; j < k; j++) {
        const { edge } = halfEdges[outgoing[j]]
        edge.length = edge.length || Curve.getLength(edge.values)
        distance = min(distance, edge.length / 2)
      }
      for (let j = 0, k = outgoing.length; j < k; j++) {
        const halfEdge = halfEdges[outgoing[j]]
        const point = getPointAt(halfEdge, distance)
        halfEdge.point = point
        halfEdge.angle = Math.atan2(point.y - vertex.y, point.x - vertex.x)
      }
      // Start the order after the largest gap between the angles,
      // so that half-edges which are hard to tell apart are not
      // separated by the turn from pi to -pi:
      outgoing.sort((a, b) => halfEdges[a].angle - halfEdges[b].angle)
      let start = -Math.PI
      let gap = 0
      for (let j = 0, k = outgoing.length; j < k; j++) {
        const angle = halfEdges[outgoing[j]].angle
        const previous = halfEdges[outgoing[(j || k) - 1]].angle
        const difference = (
          (angle - previous + 2 * Math.PI) % (2 * Math.PI) ||
          2 * Math.PI
        )
        if (difference > gap) {
          gap = difference
          start = angle
        }
      }
      for (let j = 0, k = outgoing.length; j < k; j++) {
        const halfEdge = halfEdges[outgoing[j]]
        halfEdge.angle = (halfEdge.angle - start + 2 * Math.PI) % (2 * Math.PI)
      }
      outgoing.sort((a, b) => {
        const halfEdge1 = halfEdges[a]
        const halfEdge2 = halfEdges[b]
        return (
          (
            halfEdge1.point.isClose(halfEdge2.point, epsilon) &&
            getSide(halfEdge1, halfEdge2)
          ) ||
          halfEdge1.angle - halfEdge2.angle
        )
      })
    }
    for (let j = 0, k = outgoing.length; j < k; j++) {
      halfEdges[outgoing[j]].position = j
    }
  }
  // Walking along a face with the face on the left, the next half-edge
  // leaves the reached vertex right before the one we came back on, in
  // counter-clockwise order:
  for (let i = 0, l = halfEdges.length; i < l; i++) {
    const { outgoing } = vertices[halfEdges[i].to]
    const { position } = halfEdges[i ^ 1]
    halfEdges[i].next = outgoing[(position || outgoing.length) - 1]
  }

  // 5. Collect the faces, each on the left of its half-edges, and their
  // signed areas, which are negative for the outside of each connected
  // component of the graph:
  const faces: Face[] = []
  for (let i = 0, l = halfEdges.length; i < l; i++) {
    if (halfEdges[i].face === undefined) {
      const face: Face = {
        halfEdges: [],
        area: 0,
        windings: null,
        component: null
      }
      let index = i
      do {
        const halfEdge = halfEdges[index]
        halfEdge.face = face
        face.halfEdges.push(index)
        face.area += Curve.getArea(halfEdge.values)
        index = halfEdge.next
      } while (index !== i)
      faces.push(face)
    }
  }

  // 6. Propagate the windings from the outside of each connected
  // component of the graph across its edges. A component that lies
  // within others gets the windings of its outside from a ray cast
  // against their edges:
  const components: Component[] = []
  const rays: number[][] = []
  const componentBounds: number[][] = []
  for (let i = 0, l = faces.length; i < l; i++) {
    const face = faces[i]
    if (!face.component) {
      const component: Component = {
        edges: [],
        bounds: [Infinity, Infinity, -Infinity, -Infinity],
        outside: face
      }
      const list = [face]
      face.component = component
      for (let j = 0; j < list.length; j++) {
        const indices = list[j].halfEdges
        if (list[j].area < component.outside.area) {
          component.outside = list[j]
        }
        for (let k = 0, n = indices.length; k < n; k++) {
          const other = halfEdges[indices[k] ^ 1].face
          if (!other.component) {
            other.component = component
            list.push(other)
          }
        }
      }
      const vertex = vertices[halfEdges[component.outside.halfEdges[0]].from]
      components.push(component)
      rays.push([vertex.x, vertex.y, Infinity, vertex.y])
      componentBounds.push(component.bounds)
    }
  }
  // Collect the edges and bounds of each component, to cast each ray
  // only against the components whose bounds it reaches:
  for (let i = 0, l = edges.length; i < l; i++) {
    const edge = edges[i]
    const v = edge.values
    const { component } = halfEdges[2 * i].face
    const b = component.bounds
    component.edges.push(edge)
    b[0] = min(b[0], v[0], v[2], v[4], v[6])
    b[1] = min(b[1], v[1], v[3], v[5], v[7])
    b[2] = max(b[2], v[0], v[2], v[4], v[6])
    b[3] = max(b[3], v[1], v[3], v[5], v[7])
  }
  const rayCollisions = findBoundsCollisions(rays, componentBounds, 0, true)
  for (let i = 0, l = components.length; i < l; i++) {
    const { outside } = components[i]
    const point = new Point(rays[i][0], rays[i][1])
    const indices = rayCollisions[i]
    const windings = [0, 0]
    for (let j = 0, k = indices.length; j < k; j++) {
      if (indices[j] !== i) {
        const list = components[indices[j]].edges
        for (let m = 0, n = list.length; m < n; m++) {
          const edge = list[m]
          const winding = getRayWinding(point, edge.values)
          windings[0] += winding * edge.windings[0]
          windings[1] += winding * edge.windings[1]
        }
      }
    }
    outside.windings = windings
    const queue = [outside]
    for (let j = 0; j < queue.length; j++) {
      const face = queue[j]
      const indices = face.halfEdges
      for (let k = 0, n = indices.length; k < n; k++) {
        const index = indices[k]
        const other = halfEdges[index ^ 1].face
        if (!other.windings) {
          // The face on the left of a half-edge has the higher
          // winding when the half-edge runs along its edge:
          const edgeWindings = halfEdges[index].edge.windings
          const sign = index & 1 ? -1 : 1
          other.windings = [
            face.windings[0] - sign * edgeWindings[0],
            face.windings[1] - sign * edgeWindings[1]
          ]
          queue.push(other)
        }
      }
    }
  }
  return {
    curves,
    values,
    vertices,
    edges,
    halfEdges,
    faces,
    nonZeros,
    epsilon
  }
}

/**
 * Traces the outlines of the areas that the operator includes, along the
 * edges of the operands' graph that have the result on their left and not
 * on their right. At each vertex, we turn through the result until the
 * next of them, which keeps contours apart that only touch.
 *
 * @param operands the operands, with closed paths only
 * @param operator decides if a face is part of the result, from
 *     whether it is inside each of the operands
 * @return the traced paths
 */
export function tracePaths(operands: PathItem[], operator: Operator): Path[] {
  const graph = createGraph(operands)
  const { halfEdges, faces, nonZeros } = graph
  for (let i = 0, l = faces.length; i < l; i++) {
    const face = faces[i]
    const { windings } = face
    face.isInside = !!operator(
      nonZeros[0] ? !!windings[0] : !!(windings[0] & 1),
      nonZeros[1] ? !!windings[1] : !!(windings[1] & 1)
    )
  }

  function isBoundary(index: number): boolean {
    return (
      halfEdges[index].face.isInside &&
      !halfEdges[index ^ 1].face.isInside
    )
  }

  // The curve times along a half-edge, and if the next one continues
  // it along the same curve:
  function getTimes(index: number): number[] {
    const { edge } = halfEdges[index]
    return index & 1 ? [edge.time2, edge.time1] : [edge.time1, edge.time2]
  }

  function isContinued(index: number, next: number): boolean {
    return (
      halfEdges[index].edge.curve === halfEdges[next].edge.curve &&
      getTimes(index)[1] === getTimes(next)[0]
    )
  }

  const paths: Path[] = []
  const isVisited: boolean[] = []
  for (let i = 0, l = halfEdges.length; i < l; i++) {
    if (!isVisited[i] && isBoundary(i)) {
      const contour = []
      let index = i
      do {
        isVisited[index] = true
        contour.push(index)
        index = halfEdges[index].next
        while (!isBoundary(index)) {
          index = halfEdges[index ^ 1].next
        }
      } while (index !== i)
      // Start where a piece doesn't continue the one before it, as
      // the pieces of a closed curve don't continue across its end:
      const length = contour.length
      let start = 0
      while (
        start < length &&
        isContinued(contour[(start || length) - 1], contour[start])
      ) {
        start++
      }
      // Join the pieces of the same curve that follow each other
      // back into one part of it:
      const segments: Segment[] = []
      let handleIn: Point = null
      for (let j = 0; j < length;) {
        const first = contour[(start + j) % length]
        let last = first
        while (
          ++j < length &&
          isContinued(last, contour[(start + j) % length])
        ) {
          last = contour[(start + j) % length]
        }
        const { edge } = halfEdges[first]
        const { isStraight } = edge
        const v =
          first === last
            ? halfEdges[first].values
            : getPart(
                graph.values[edge.curve],
                !isStraight,
                getTimes(first)[0],
                getTimes(last)[1],
                graph.vertices[halfEdges[first].from],
                graph.vertices[halfEdges[last].to]
              )
        segments.push(
          new Segment(
            new Point(v[0], v[1]),
            handleIn,
            isStraight ? null : new Point(v[2] - v[0], v[3] - v[1])
          )
        )
        handleIn = isStraight ? null : new Point(v[4] - v[6], v[5] - v[7])
      }
      if (handleIn) {
        segments[0].handleIn = handleIn
      }
      const path = new Path(Item.NO_INSERT)
      path.segments = segments
      path.closed = true
      // Only add paths that cover an area to the result.
      if (path.area !== 0) {
        paths.push(path)
      }
    }
  }
  return paths
}

/**
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

/**
 * Returns a point that is guaranteed to be inside the path item.
 */
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
      push(monoCurves, Curve.getMonoCurves(curves[i].getValues()))
    }
    for (let i = 0, l = monoCurves.length; i < l; i++) {
      ys.push(monoCurves[i][1], monoCurves[i][7])
    }
    ys.sort((a, b) => a - b)
    // The center lies between the top and the bottom of the
    // bounds, which are among the ys, unless the path is flat:
    let y = point.y
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
          Curve.solveCubic(mv, 1, y, roots, 0, 1) === 1
            ? Curve.getPoint(mv, roots[0]).x
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
