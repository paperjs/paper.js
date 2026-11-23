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

import * as Bezier from '../curve/index.ts'
import { createGraph, isFilled, joinPieces } from './graph.ts'
import type { Piece } from './graph.ts'
import type { PathValues, RegionValues } from '../data/region.ts'

// A piece of a path that splitGraph() returns, with whether it lies inside
// the region, the index of the path that it comes from, and where it starts
// along it. A path that isn't split comes back whole:
export type SplitPiece = PathValues & {
  isInside: boolean
  source: number
  offset: number
  isWhole: boolean
}

/**
 * Splits the paths where they cross the outline of the region, into pieces
 * inside of it and outside, in their order along the paths. The graph cuts
 * the paths as it does for the boolean operations, so it decides as they do
 * where paths touch the outline or run along it. The pieces along it count
 * as inside, but are split from the pieces next to them.
 *
 * @param paths the paths to split, open or closed
 * @param region the region to split them by
 * @return the pieces of the paths
 */
export function splitGraph(
  paths: PathValues[],
  region: RegionValues
): SplitPiece[] {
  const graph = createGraph([{ paths }, region])
  const { curves, values, pieces, halfEdges } = graph
  // The side of the outline that a piece lies on, by how many of its sides
  // are inside the region: 2 inside, 0 outside, or 1 along it:
  const getSide = ({ edge }: Piece) =>
    [2 * edge, 2 * edge + 1].filter(index =>
      isFilled(graph, halfEdges[index].face.windings, 1)
    ).length
  const result: SplitPiece[] = []
  let index = 0
  paths.forEach((path, source) => {
    // The pieces of the path's curves in their order, joined into stretches
    // on the same side, also around the end of closed paths:
    const first = index
    while (curves[index]?.operand === 0 && curves[index].path === source) {
      index++
    }
    const offsets: number[] = []
    let length = 0
    for (let i = first; i < index; i++) {
      offsets[i] = length
      length += Bezier.getLength(values[i])
    }
    const stretches: { side: number; pieces: Piece[] }[] = []
    for (let i = first; i < index; i++) {
      for (const piece of pieces[i]) {
        const side = getSide(piece)
        const last = stretches[stretches.length - 1]
        if (last?.side === side) {
          last.pieces.push(piece)
        } else {
          stretches.push({ side, pieces: [piece] })
        }
      }
    }
    const last = stretches[stretches.length - 1]
    if (
      path.closed &&
      stretches.length > 1 &&
      stretches[0].side === last.side
    ) {
      stretches[0].pieces.unshift(...last.pieces)
      stretches.pop()
    }
    for (const { side, pieces } of stretches) {
      const isWhole = stretches.length === 1
      const [{ curve, time1 }] = pieces
      result.push({
        ...(
          isWhole
            ? path
            : {
                segments: joinPieces(graph, pieces).segments,
                closed: false
              }
        ),
        isInside: side > 0,
        source,
        offset: isWhole
          ? 0
          : offsets[curve] + Bezier.getLength(values[curve], 0, time1),
        isWhole
      })
    }
  })
  return result
}
