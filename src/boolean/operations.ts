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

// The operations on shapes through the planar graph, for the steps between
// which no path items are needed.
import { Point } from '../basic/Point.ts'
import { Rectangle } from '../basic/Rectangle.ts'
import { traceGraph } from './graph.ts'
import { getArea, getBounds, reduceShape } from './shape.ts'
import type { ShapeData } from './shape.ts'

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
