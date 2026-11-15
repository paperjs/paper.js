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

// The offsets, stroke outlines and dashes of path items, through the outlines
// of strokes on plain paths, see outlineStroke().

import {
  Bezier,
  CompoundPath,
  GEOMETRIC_EPSILON,
  Group,
  Path,
  Point,
  Segment,
  createPathItem,
  getShape,
  offsetPath,
  offsetShape,
  outlineStroke,
  paper,
  setStrokeProfileRuns,
  takeStrokeProfile
} from '../internal.ts'
import type { Item } from '../item/Item.ts'
import type { StrokeProfileStop } from './StrokeProfileStop.ts'
import type { PathItem } from './PathItem.ts'

export type OffsetOptions = {
  join?: string
  miterLimit?: number
  insert?: boolean
}

export type OutlineOptions = {
  width?: number
  join?: string
  cap?: string
  miterLimit?: number
  insert?: boolean
}

export type DashOptions = {
  dashArray?: number[]
  dashOffset?: number
  insert?: boolean
}

// A stop of a stroke profile taken off its path, see takeProfileStops():
type ProfileStop = { stop: StrokeProfileStop; point: Point; normal: Point }

const { abs } = Math

export function offsetPathItem(
  item: PathItem,
  distance: number,
  options?: OffsetOptions | null
): PathItem {
  const join = options?.join || 'miter'
  const miterLimit = options?.miterLimit || 10
  const path = prepare(item)
  const paths = (path._children ?? [path]) as Path[]
  // The offset lies at the distance all along, whatever the stroke profiles
  // of the paths, and takes over their stops:
  const stops = distance ? takeProfileStops(paths) : []
  let result: PathItem
  if (!distance) {
    result = path
  } else if (item._children || (item as Path)._closed) {
    // Shapes grow or shrink by the distance:
    result = createPathItem(
      offsetShape(getShape(path), distance, join, miterLimit)
    ).reduce() as PathItem
  } else {
    // Open paths move to the side of their normals:
    result = new CompoundPath({
      children: path.isEmpty()
        ? []
        : offsetPath(getShape(path).paths[0], distance, join, miterLimit).map(
            ({ segments, closed }) =>
              new Path({ segments, closed, insert: false })
          ),
      insert: false
    }).reduce() as PathItem
  }
  if (stops.length) {
    setOffsetProfiles(result, stops, abs(distance))
  }
  return createResult(item, result, options)
}

export function outlinePathItem(
  item: PathItem,
  options?: OutlineOptions | null
): PathItem {
  const { width, join, cap, miterLimit } = options ?? {}
  let result: PathItem
  if (
    !item._children &&
    item._matrix.isIdentity() &&
    width == null &&
    !join &&
    !cap &&
    !miterLimit
  ) {
    // Paths keep the outline of their own stroke, see
    // Path#_getStrokeOutline():
    result = (item as Path)._getStrokeOutline().clone({ insert: false })
  } else {
    const path = prepare(item)
    result = outlinePaths(
      getDashes(
        (path._children ?? [path]) as Path[],
        item.dashArray,
        item.dashOffset
      ),
      (width ?? item.strokeWidth) / 2,
      join || item.strokeJoin,
      cap || item.strokeCap,
      miterLimit || item.miterLimit
    ).reduce() as PathItem
  }
  result = createResult(item, result, options)
  result.fillColor = item.strokeColor
  result.strokeColor = null
  return result
}

export function dashPathItem(
  item: PathItem,
  options?: DashOptions | null
): Group {
  const path = prepare(item)
  let result = new Group({
    children: getDashes(
      (path._children ?? [path]) as Path[],
      options?.dashArray ?? item.dashArray,
      options?.dashOffset ?? item.dashOffset
    ),
    insert: false
  })
  result = createResult(item, result, options)
  result.dashArray = []
  return result
}

export function getStrokeOutline(item: PathItem): PathItem {
  const copy = item.clone({ insert: false }).reduce()
  // The style of the compound path, for its children:
  const { style } = item
  return outlinePaths(
    getDashes(
      (copy._children ?? [copy]) as Path[],
      style.dashArray,
      style.dashOffset
    ),
    style.strokeWidth / 2,
    style.strokeJoin,
    style.strokeCap,
    style.miterLimit
  ).reduce() as PathItem
}

// Outlines the strokes of the paths, see outlineStroke():
function outlinePaths(
  paths: Path[],
  radius: number,
  join: string,
  cap: string,
  miterLimit: number
): PathItem {
  const shape = outlineStroke(
    paths.map(path => {
      const profile = path._strokeProfile
      return {
        ...getShape(path).paths[0],
        pens: profile && {
          offsets: profile.getPens().map(pen => pen.offset),
          getValues: profile.getValues()
        }
      }
    }),
    radius,
    join,
    cap,
    miterLimit
  )
  return shape.paths.length
    ? createPathItem(shape)
    : new Path({ insert: false })
}

// Takes the stroke profiles off the paths, as their stops with the points
// and normals of the paths there:
function takeProfileStops(paths: Path[]): ProfileStop[] {
  const stops: ProfileStop[] = []
  for (const path of paths) {
    for (const stop of path.strokeProfile ?? []) {
      const { point, normal } = path.getLocationAt(stop.offset)
      stops.push({ stop: stop.clone(), point, normal })
    }
    path.strokeProfile = null
  }
  return stops
}

// Sets the stroke profiles of the paths of an offset at the distance, from
// the stops of the paths that were offset: each along its normal, on either
// side, as closed paths are offset to the side that they are oriented to,
// at the nearest point of the offset. That is also where the stops of
// stretches end up that the offset leaves out, and those at corners:
function setOffsetProfiles(
  result: PathItem,
  stops: ProfileStop[],
  distance: number
) {
  const profiles: Record<number, StrokeProfileStop[]> = {}
  for (const { stop, point, normal } of stops) {
    const vector = normal.multiply(distance)
    const loc1 = result.getNearestLocation(point.add(vector))
    const loc2 = result.getNearestLocation(point.subtract(vector))
    const loc = loc1?.distance < loc2?.distance ? loc1 : loc2 ?? loc1
    if (loc) {
      stop.offset = loc.offset
      ;(profiles[loc.path._id] ??= []).push(stop)
    }
  }
  for (const path of (result._children ?? [result]) as Path[]) {
    path.strokeProfile = profiles[path._id] ?? null
  }
}

// Returns a copy of the path item with its matrix applied, and without
// curves of zero length, which have no directions for joins and caps:
function prepare(item: PathItem): PathItem {
  return item
    .clone({ insert: false })
    .transform(null, true, true)
    .reduce() as PathItem
}

// Returns the dashes of the paths as open paths, as the canvas draws them:
// the pattern starts over on each path, an odd number of lengths repeats
// to alternate dashes and gaps, and patterns without lengths leave the
// paths as they are. Each path is cut in one pass along its curves, and
// the dashes keep the parts of its stroke profile:
function getDashes(
  paths: Path[],
  dashArray: number[],
  dashOffset: number
): Path[] {
  const count = dashArray.length
  const isDashed = dashArray.some(dash => dash > 0)
  const dashes: Path[] = []

  function getDash(i: number): number {
    return dashArray[((i % count) + count) % count]
  }

  function addDashes(path: Path) {
    const { curves, length } = path
    const profile = path._strokeProfile && takeStrokeProfile(path)
    let index = 0
    let start = 0
    let from = -dashOffset
    let j = 0

    // The curve and its time at the offset, walking on from the last
    // one, as the offsets only grow:
    function getLocation(offset: number): { index: number; time: number } {
      let curve = curves[index]
      while (index < curves.length - 1 && start + curve.length < offset) {
        start += curve.length
        curve = curves[++index]
      }
      return {
        index,
        time: Bezier.getTimeAt(
          curve.getValues(),
          Math.min(offset - start, curve.length)
        ) || 0
      }
    }

    function addDash(from: number, to: number) {
      const a = getLocation(from)
      const b = getLocation(to)
      const segments: Segment[] = []
      for (let i = a.index; i <= b.index; i++) {
        const v = Bezier.getPart(
          curves[i].getValues(),
          i === a.index ? a.time : 0,
          i === b.index ? b.time : 1
        )
        if (segments.length) {
          segments[segments.length - 1].handleOut = new Point(
            v[2] - v[0],
            v[3] - v[1]
          )
        } else {
          segments.push(
            new Segment(
              new Point(v[0], v[1]),
              null,
              new Point(v[2] - v[0], v[3] - v[1])
            )
          )
        }
        segments.push(
          new Segment(
            new Point(v[6], v[7]),
            new Point(v[4] - v[6], v[5] - v[7])
          )
        )
      }
      const dash = new Path({ segments, insert: false })
      if (profile) {
        setStrokeProfileRuns(dash, [
          { part: profile, start: from, length: to - from }
        ])
      }
      dashes.push(dash)
    }

    // Step back in the pattern to where it starts before the path:
    while (from > 0) {
      from -= getDash(--j) + getDash(--j)
    }
    while (from < length) {
      const to = from + getDash(j++)
      if (Math.min(to, length) - Math.max(from, 0) > GEOMETRIC_EPSILON) {
        addDash(Math.max(from, 0), Math.min(to, length))
      }
      from = to + getDash(j++)
    }
  }

  for (let i = 0, l = paths.length; i < l; i++) {
    if (isDashed) {
      addDashes(paths[i])
    } else {
      dashes.push(paths[i])
    }
  }
  return dashes
}

function createResult<T extends Item>(
  item: PathItem,
  result: T,
  options?: { insert?: boolean } | null
): T {
  const { insert = paper.settings.insertItems } = options ?? {}
  if (insert) {
    result.insertAbove(item)
  }
  result.copyAttributes(item, true)
  return result
}
