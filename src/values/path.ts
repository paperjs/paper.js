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

// Paths as their segments, and the functions that read, measure and reduce
// them.
import { GEOMETRIC_EPSILON, isZero } from '../util/numerical.ts'
import { Point } from '../basic/Point.ts'
import { getCurveArea, hasStraightHandles } from './curve.ts'
import type { CurveValues } from './curve.ts'

// The joins and caps of strokes, as in canvas and SVG:
export type StrokeJoin = 'miter' | 'round' | 'bevel'
export type StrokeCap = 'round' | 'square' | 'butt'

// A segment as its point with both of its handles, relative to it:
export type SegmentValues = [
  point: number[],
  handleIn: number[],
  handleOut: number[]
]

// A path as its segments, each as arrays in the forms that Paper.js reads
// them: its point, or its point with its handles relative to it, as
// [point, handleIn, handleOut], or with their coordinates in a row:
export type PathValues = {
  segments: (number[] | [number[], (number[] | null)?, (number[] | null)?])[]
  closed: boolean
}

const zero = [0, 0]

// Returns the segments of the path as their points with both handles, from
// any of their forms:
export function getPathSegments({ segments }: PathValues): SegmentValues[] {
  return segments.map(segment => {
    const [point, handleIn, handleOut] = segment as number[][]
    if (typeof point === 'number') {
      const [x, y, inX, inY, outX, outY] = segment as number[]
      return segment.length > 2
        ? [[x, y], [inX ?? 0, inY ?? 0], [outX ?? 0, outY ?? 0]]
        : [segment as number[], zero, zero]
    } else {
      return [point, handleIn ?? zero, handleOut ?? zero]
    }
  })
}

// Returns the values of the curve between the two segments, or of the
// straight line between their points:
export function getCurve(
  [[x1, y1], , [h1x, h1y]]: SegmentValues,
  [[x2, y2], [h2x, h2y]]: SegmentValues,
  straight?: boolean
): CurveValues {
  return straight
    ? [x1, y1, x1, y1, x2, y2, x2, y2]
    : [x1, y1, x1 + h1x, y1 + h1y, x2 + h2x, y2 + h2y, x2, y2]
}

// Whether the curve between the two segments has handles:
export function hasHandles(
  [, , handle1]: SegmentValues,
  [, handle2]: SegmentValues
) {
  return !(
    isZero(handle1[0]) &&
    isZero(handle1[1]) &&
    isZero(handle2[0]) &&
    isZero(handle2[1])
  )
}

// Returns the values of the curves of the path, and of the straight line
// that closes an open one, as filling it does:
export function getPathCurves(path: PathValues): CurveValues[] {
  const segments = getPathSegments(path)
  return segments.map((segment, i) => {
    const isLast = i + 1 === segments.length
    return getCurve(
      segment,
      segments[isLast ? 0 : i + 1],
      isLast && !path.closed
    )
  })
}

// Returns the values of the curves of the path as its stroke follows them,
// without closing open paths:
export function getStrokeCurves(path: PathValues): CurveValues[] {
  const segments = getPathSegments(path)
  const { length } = segments
  const curves: CurveValues[] = []
  for (let i = 0, l = length - (path.closed ? 0 : 1); i < l; i++) {
    curves.push(getCurve(segments[i], segments[(i + 1) % length]))
  }
  return curves
}

// Returns the area of the path, as Path#area does:
export function getPathArea(path: PathValues): number {
  let area = 0
  for (const v of getPathCurves(path)) {
    area += getCurveArea(v)
  }
  return area
}

// Returns the path reduced as Path#reduce() does it with the simplify option:
// without the straight curves that have no length, or that continue along
// the line of the next one:
export function reducePath(path: PathValues): PathValues {
  const { closed } = path
  // With the handles that removing curves changes as copies:
  const list = getPathSegments(path)
  const getCount = () => (closed ? list.length : list.length - 1)
  for (let i = getCount() - 1; i >= 0; i--) {
    const count = getCount()
    const next = (i + 1) % list.length
    if (!hasHandles(list[i], list[next])) {
      const [point1] = list[i]
      const [point2] = list[next]
      const x = point2[0] - point1[0]
      const y = point2[1] - point1[1]
      const hasLength = Math.hypot(x, y) > GEOMETRIC_EPSILON
      // The curve after it, which closed paths have all around:
      const after = i + 1 < count ? i + 1 : closed ? 0 : -1
      if (!hasLength || after >= 0 && isCollinear(list, x, y, after)) {
        // Remove the segment that the curve ends in, and continue with its
        // handle from where the curve starts:
        const [removed] = list.splice(next, 1)
        const start = list[next < i ? i - 1 : i]
        if (start) {
          start[2] = removed[2]
        }
      }
    }
  }
  return { segments: list, closed }
}

// Whether the curve at the index is a straight line along the vector:
function isCollinear(
  list: SegmentValues[],
  x: number,
  y: number,
  index: number
): boolean {
  const [[x1, y1], , [h1x, h1y]] = list[index]
  const [[x2, y2], [h2x, h2y]] = list[(index + 1) % list.length]
  return (
    hasStraightHandles(x1, y1, h1x, h1y, h2x, h2y, x2, y2) &&
    Point.isCollinear(x, y, x2 - x1, y2 - y1)
  )
}
