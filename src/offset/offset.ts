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

// The offsets of regions and open paths at a distance, through the outlines
// of their strokes, see outlineStroke().
import { CURVETIME_EPSILON } from '../util/numerical.ts'
import { Point } from '../basic/Point.ts'
import {
  getCurveLength,
  getCurveNormal,
  getCurvePoint,
  getNearestCurveTime
} from '../curve/index.ts'
import type { SegmentValues } from '../curve/index.ts'
import { subtractRegions, uniteRegions } from '../boolean/operations.ts'
import {
  getCurve,
  getPathSegments,
  getStrokeCurves,
  hasHandles
} from '../data/region.ts'
import type { PathValues, RegionValues } from '../data/region.ts'
import { outlineStroke } from './outline.ts'

const { abs } = Math

// Returns the region grown by the distance, or shrunk where it is negative,
// united with the outline of its paths' strokes, or without it:
export function offsetRegion(
  region: RegionValues,
  distance: number,
  join: string,
  miterLimit: number
): RegionValues {
  if (distance) {
    const outline = outlineStroke(
      region.paths,
      abs(distance),
      join,
      'butt',
      miterLimit
    )
    return distance > 0
      ? uniteRegions([region, outline])
      : subtractRegions(region, outline)
  } else {
    return region
  }
}

// Returns the offset of the open path at the distance, on the side of its
// normals where it is positive, as the curves of the outline of its stroke
// with butt caps on that side, without the caps, each running along the
// path:
export function offsetPath(
  path: PathValues,
  distance: number,
  join: string,
  miterLimit: number
): PathValues[] {
  const curves = getStrokeCurves(path)
  // A point, or points on each other, have no sides to move:
  if (!curves.length) return []
  const radius = abs(distance)
  const outline = outlineStroke([path], radius, join, 'butt', miterLimit)
  const lengths = curves.map(v => getCurveLength(v, 0, 1))
  const first = curves[0]
  const last = curves[curves.length - 1]
  const caps: [Point, Point][] = [
    [new Point(first[0], first[1]), getCurveNormal(first, 0)],
    [new Point(last[6], last[7]), getCurveNormal(last, 1)]
  ]
  const tolerance = radius / 1e4
  const paths: PathValues[] = []

  // The location on the path nearest to the point, with its point, its
  // normal and its offset along the path, as PathItem#getNearestLocation()
  // finds it:
  const getNearestLocation = (point: Point) => {
    let index = 0
    let time = 0
    let nearest: Point = null
    let minDistance = Infinity
    for (let i = 0, l = curves.length; i < l; i++) {
      const t = getNearestCurveTime(curves[i], point)
      const pt = getCurvePoint(curves[i], t)
      const distance = point.getDistance(pt)
      if (distance < minDistance) {
        minDistance = distance
        index = i
        time = t
        nearest = pt
      }
    }
    // A time at the end of a curve lies at the start of the next one, as
    // where curves meet at a cusp, its normal is the next one's:
    if (time >= 1 - CURVETIME_EPSILON && index < curves.length - 1) {
      index++
      time = 0
    }
    const v = curves[index]
    let offset = 0
    for (let i = 0; i < index; i++) {
      offset += lengths[i]
    }
    return {
      point: nearest,
      normal: getCurveNormal(v, time),
      offset: offset + getCurveLength(v, 0, time)
    }
  }

  // The caps are the straight curves along the normals at the ends:
  const isCap = (segment1: SegmentValues, segment2: SegmentValues) => {
    if (!hasHandles(segment1, segment2)) {
      for (const [point, normal] of caps) {
        const vector1 = new Point(segment1[0]).subtract(point)
        const vector2 = new Point(segment2[0]).subtract(point)
        if (
          abs(vector1.cross(normal)) < tolerance &&
          abs(vector2.cross(normal)) < tolerance
        )
          return true
      }
    }
    return false
  }

  const isOnSide = (segment1: SegmentValues, segment2: SegmentValues) => {
    if (isCap(segment1, segment2)) {
      return false
    } else {
      const point = getCurvePoint(getCurve(segment1, segment2), 0.5)
      const location = getNearestLocation(point)
      return point.subtract(location.point).dot(location.normal) * distance > 0
    }
  }

  // Adds the run of curves between the segments, along the path:
  const addRun = (run: SegmentValues[]) => {
    const [start] = run
    const end = run[run.length - 1]
    const segments: SegmentValues[] = [
      [start[0], [0, 0], start[2]],
      ...run.slice(1, -1),
      [end[0], end[1], [0, 0]]
    ]
    if (
      getNearestLocation(new Point(start[0])).offset >
      getNearestLocation(new Point(end[0])).offset
    ) {
      segments.reverse()
      for (let i = 0, l = segments.length; i < l; i++) {
        const [point, handleIn, handleOut] = segments[i]
        segments[i] = [point, handleOut, handleIn]
      }
    }
    paths.push({ segments, closed: false })
  }

  for (const contour of outline.paths) {
    const segments = getPathSegments(contour)
    const count = segments.length
    const keeps: boolean[] = []
    let start = -1
    for (let i = 0; i < count; i++) {
      keeps.push(isOnSide(segments[i], segments[(i + 1) % count]))
      if (!keeps[i]) {
        start = i
      }
    }
    if (count && start === -1) {
      // The whole contour lies on the side:
      paths.push({ segments, closed: true })
    } else {
      // Collect the runs of curves on the side, starting after one that
      // isn't, so that none wraps around the contour's end:
      let run: SegmentValues[] = []
      for (let i = 1; i <= count; i++) {
        const index = (start + i) % count
        if (keeps[index]) {
          if (!run.length) {
            run.push(segments[index])
          }
          run.push(segments[(index + 1) % count])
        } else if (run.length) {
          addRun(run)
          run = []
        }
      }
    }
  }
  return paths
}
