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

// Plain descriptions of paths, as the boolean operations and offsetting take
// and return them, and the functions that read, measure and reduce them.
import { GEOMETRIC_EPSILON, isZero } from '../util/numerical.ts'
import { Point } from '../basic/Point.ts'
import { Rectangle } from '../basic/Rectangle.ts'
import * as Bezier from '../curve/index.ts'
import type { BezierValues } from '../curve/index.ts'

// A segment as arrays, in the forms that Paper.js reads them: its point, or
// its point with its handles relative to it, as [point, handleIn, handleOut],
// or with their coordinates in a row:
export type SegmentData =
  | number[]
  | [number[], (number[] | null)?, (number[] | null)?]

export type PathData = { segments: SegmentData[]; closed: boolean }

// The paths that are filled as one, by their fill rule:
export type ShapeData = { paths: PathData[]; fillRule: string }

// A segment as its point with both of its handles:
export type Segment = [point: number[], handleIn: number[], handleOut: number[]]

const zero = [0, 0]

// Returns the segments of the path as their points with both handles, from
// any of the forms of SegmentData:
export function getSegments({ segments }: PathData): Segment[] {
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
export function getValues(
  [[x1, y1], , [h1x, h1y]]: Segment,
  [[x2, y2], [h2x, h2y]]: Segment,
  straight?: boolean
): BezierValues {
  return straight
    ? [x1, y1, x1, y1, x2, y2, x2, y2]
    : [x1, y1, x1 + h1x, y1 + h1y, x2 + h2x, y2 + h2y, x2, y2]
}

// Whether the curve between the two segments has handles:
export function hasHandles([, , handle1]: Segment, [, handle2]: Segment) {
  return !(
    isZero(handle1[0]) &&
    isZero(handle1[1]) &&
    isZero(handle2[0]) &&
    isZero(handle2[1])
  )
}

// Returns the bounds of the shape, as those of a path item with its paths:
export function getBounds({ paths }: ShapeData): Rectangle {
  const roots = new Array(2)
  let bounds: Rectangle = null
  for (const path of paths) {
    const segments = getSegments(path)
    const count = segments.length
    if (count) {
      const min = segments[0][0].slice()
      const max = min.slice()
      for (let i = 0, l = path.closed ? count : count - 1; i < l; i++) {
        const v = getValues(segments[i], segments[(i + 1) % count])
        for (let c = 0; c < 2; c++) {
          Bezier.addBounds(
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
      bounds = paths.length > 1 && bounds ? bounds.unite(rect) : rect
    }
  }
  return bounds ?? new Rectangle()
}

// Returns the area of the path, as Path#area does:
export function getArea(path: PathData): number {
  const segments = getSegments(path)
  let area = 0
  for (let i = 0, l = segments.length; i < l; i++) {
    const isLast = i + 1 === l
    area += Bezier.getArea(
      getValues(
        segments[i],
        segments[isLast ? 0 : i + 1],
        // The line that closes an open path has no handles:
        isLast && !path.closed
      )
    )
  }
  return area
}

// Returns the shape with its paths reduced as Path#reduce() does it with the
// simplify option: without the straight curves that have no length, or
// that continue along the line of the next one, and without the paths that
// are empty then:
export function reduceShape({ paths, fillRule }: ShapeData): ShapeData {
  return {
    fillRule,
    paths: paths.map(reducePath).filter(({ segments }) => segments.length)
  }
}

function reducePath(path: PathData): PathData {
  const { closed } = path
  // With the handles that removing curves changes as copies:
  const list = getSegments(path)
  const getCount = () => (closed ? list.length : list.length - 1)
  for (let i = getCount() - 1; i >= 0; i--) {
    const count = getCount()
    const next = (i + 1) % list.length
    if (!hasHandles(list[i], list[next])) {
      const [point1] = list[i]
      const [point2] = list[next]
      const x = point2[0] - point1[0]
      const y = point2[1] - point1[1]
      const hasLength = (
        (x !== 0 || y !== 0) &&
        Math.sqrt(x * x + y * y) > GEOMETRIC_EPSILON
      )
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
  list: Segment[],
  x: number,
  y: number,
  index: number
): boolean {
  const [[x1, y1], , [h1x, h1y]] = list[index]
  const [[x2, y2], [h2x, h2y]] = list[(index + 1) % list.length]
  return (
    Bezier.hasStraightHandles(x1, y1, h1x, h1y, h2x, h2y, x2, y2) &&
    Point.isCollinear(x, y, x2 - x1, y2 - y1)
  )
}
