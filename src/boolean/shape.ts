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

// The functions on plain descriptions of paths that the boolean operations
// and offsetting need between their steps: measuring them, reducing them, and
// uniting many of them, without creating path items in between.
import { GEOMETRIC_EPSILON, isZero } from '../util/numerical.ts'
import { Point } from '../basic/Point.ts'
import { Rectangle } from '../basic/Rectangle.ts'
import * as Bezier from '../curve/index.ts'
import { getSegment, traceGraph } from './graph.ts'
import type { PathData, SegmentData, ShapeData } from './graph.ts'

// Unites the shapes, pairwise in a balanced tree, so that each step only
// meets results of similar size, see combinePaths(). The first one is united
// with the union of the others, and resolved on its own if it is the only
// one. Between the steps, the results are reduced as path items are:
export function uniteShapes(shapes: ShapeData[]): ShapeData {
  const [first, ...others] = shapes
  return unite(
    first,
    others.length
      ? combine(
          others.map(shape => {
            const bounds = getBounds(shape)
            return { shape, bounds, center: bounds.center }
          })
        )
      : null
  )
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

type Entry = { shape: ShapeData; bounds: Rectangle; center: Point }

function combine(entries: Entry[]): ShapeData {
  if (entries.length > 1) {
    // Split the shapes along the longer side of their bounds, so each step
    // unites shapes that lie close to each other:
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
    return entries[0].shape
  }
}

// Unites the two shapes, or resolves the first one on its own, reducing them
// before and the result after, and leaving out paths without an area:
function unite(shape1: ShapeData, shape2: ShapeData | null): ShapeData {
  const operands = [reduceShape(shape1)]
  if (shape2) {
    operands.push(reduceShape(shape2))
  }
  const paths = []
  for (const { segments } of traceGraph(operands, (a, b) => a || b)) {
    const path = { segments, closed: true }
    if (getArea(path) !== 0) {
      paths.push(path)
    }
  }
  return reduceShape({ paths, fillRule: shape1.fillRule })
}

// Returns the bounds of the shape, as those of a path item with its paths:
function getBounds({ paths }: ShapeData): Rectangle {
  const roots = new Array(2)
  let bounds: Rectangle = null
  for (const { segments, closed } of paths) {
    const count = segments.length
    if (count) {
      const [first] = getSegment(segments[0])
      const min = first.slice()
      const max = first.slice()
      for (let i = 0, l = closed ? count : count - 1; i < l; i++) {
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
function getArea({ segments, closed }: PathData): number {
  let area = 0
  for (let i = 0, l = segments.length; i < l; i++) {
    const isLast = i + 1 === l
    area += Bezier.getArea(
      getValues(
        segments[i],
        segments[isLast ? 0 : i + 1],
        // The line that closes an open path has no handles:
        isLast && !closed
      )
    )
  }
  return area
}

function reducePath({ segments, closed }: PathData): PathData {
  // With the handles that removing curves changes as copies:
  const list = segments.map(segment => getSegment(segment).slice())
  const getCount = () => (closed ? list.length : list.length - 1)
  for (let i = getCount() - 1; i >= 0; i--) {
    const count = getCount()
    const [point1, , handle1] = list[i]
    const next = (i + 1) % list.length
    const [point2, handle2] = list[next]
    if (isZeroPoint(handle1) && isZeroPoint(handle2)) {
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
  return { segments: list as SegmentData[], closed }
}

// Whether the curve at the index is a straight line along the vector:
function isCollinear(
  list: number[][][],
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

function isZeroPoint([x, y]: number[]): boolean {
  return isZero(x) && isZero(y)
}

// Returns the values of the curve between the two segments, or of the
// straight line between their points:
function getValues(
  segment1: PathData['segments'][number],
  segment2: PathData['segments'][number],
  straight?: boolean
): number[] {
  const [[x1, y1], , [h1x, h1y]] = getSegment(segment1)
  const [[x2, y2], [h2x, h2y]] = getSegment(segment2)
  return straight
    ? [x1, y1, x1, y1, x2, y2, x2, y2]
    : [x1, y1, x1 + h1x, y1 + h1y, x2 + h2x, y2 + h2y, x2, y2]
}
