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
  CompoundPath,
  Curve,
  CurveLocation,
  EPSILON,
  GEOMETRIC_EPSILON,
  Item,
  Path,
  Point,
  findItemBoundsCollisions,
  paper,
  push,
  tracePaths
} from '../internal.ts'
import type { Rectangle } from '../basic/Rectangle.ts'
import type { PathItem } from './PathItem.ts'
import type { Operator } from './graph.ts'

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

function filterIntersection(inter: CurveLocation): boolean {
  // TODO: Change isCrossing() to also handle overlaps (hasOverlap())
  // that are actually involved in a crossing! For this we need proper
  // overlap range detection / merging first... But as we call
  // #resolveCrossings() first in boolean operations, removing all
  // self-touching areas in paths, this works for the known use cases.
  // The ideal implementation would deal with it in a way outlined in:
  // https://github.com/paperjs/paper.js/issues/874#issuecomment-168332391
  return inter.hasOverlap() || inter.isCrossing()
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
export function getRayWinding(point: Point, v: number[]): number {
  let winding = 0
  const { x, y } = point
  // Only curves that reach the ray at all:
  if (
    y >= min(v[1], v[3], v[5], v[7]) &&
    y <= max(v[1], v[3], v[5], v[7]) &&
    x < max(v[0], v[2], v[4], v[6])
  ) {
    const monoCurves = Bezier.getMonoCurves(v)
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
          Bezier.solve(mv, 1, y, roots, 0, 1) > 0
            ? Bezier.getPoint(mv, roots[0]).x
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
            : Bezier.solve(v, io, po, roots, 0, 1) > 0
              ? roots[0]
              : 1
    const a =
      t === 0 ? a0 : t === 1 ? a3 : Bezier.getPoint(v, t)[dir ? 'y' : 'x']
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
      Bezier.getTangent(v, t)[dir ? 'x' : 'y'] === 0 &&
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
          : Bezier.getMonoCurves(v, dir)
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
          path.lastCurve.segment2, curve.segment1, null, true
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
