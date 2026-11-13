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

import {
  Base,
  Bezier,
  Curve,
  Point,
  capitalize,
  curveEvaluations,
  inject
} from '../internal.ts'
import type { Matrix } from '../basic/Matrix.ts'
import type { Path } from './Path.ts'
import type { Segment } from './Segment.ts'

interface Part {
  offset: number
  curve: number[]
  index: number
  time: number
  isStraight: boolean
}

/**
 * @private
 */
export class PathFlattener extends Base {
  #curves: number[][]
  parts: Part[]
  length: number
  #index: number

  /**
   * Creates a path flattener for the given path. The flattener converts
   * curves into a sequence of straight lines by the use of curve-subdivision
   * with an allowed maximum error to create a lookup table that maps curve-
   * time to path offsets, and can be used for efficient iteration over the
   * full length of the path, and getting points / tangents / normals and
   * curvature in path offset space.
   *
   * @param path the path to create the flattener for
   * @param [flatness=0.25] the maximum error allowed for the
   *     straight lines to deviate from the original curves
   * @param [maxRecursion=32] the maximum amount of recursion in
   *     curve subdivision when mapping offsets to curve parameters
   * @param [ignoreStraight=false] if only interested in the result
   *     of the sub-division (e.g. for path flattening), passing `true` will
   *     protect straight curves from being subdivided for curve-time
   *     translation
   * @param [matrix] the matrix by which to transform the path's
   *     coordinates without modifying the actual path.
   * @return the newly created path flattener
   */
  constructor(
    path: Path,
    flatness?: number,
    maxRecursion?: number,
    ignoreStraight?: boolean,
    matrix?: Matrix
  ) {
    super()
    // Instead of relying on path.curves, we only use segments here and
    // get the curve values from them.
    const curves: number[][] = [] // The curve values as returned by getValues()
    const parts: Part[] = [] // The calculated, subdivided parts of the path
    let length = 0 // The total length of the path
    // By default, we're not subdividing more than 32 times.
    const minSpan = 1 / (maxRecursion || 32)
    const segments = path._segments
    let segment1 = segments[0]
    let segment2: Segment

    // Iterate through all curves and compute the parts for each of them,
    // by recursively calling computeParts().
    function addCurve(segment1: Segment, segment2: Segment) {
      const curve = Curve.getValues(segment1, segment2, matrix)
      curves.push(curve)
      computeParts(curve, segment1._index, 0, 1)
    }

    function computeParts(
      curve: number[], index: number,
      t1: number, t2: number
    ) {
      // Check if the t-span is big enough for subdivision.
      if (
        (t2 - t1) > minSpan &&
        !(ignoreStraight && Bezier.isStraight(curve)) &&
        // After quite a bit of testing, a default flatness of 0.25
        // appears to offer a good trade-off between speed and
        // precision for display purposes.
        !Bezier.isFlatEnough(curve, flatness || 0.25)
      ) {
        const halves = Bezier.subdivide(curve, 0.5)
        const tMid = (t1 + t2) / 2
        // Recursively subdivide and compute parts again.
        computeParts(halves[0], index, t1, tMid)
        computeParts(halves[1], index, tMid, t2)
      } else {
        // Calculate the length of the curve interpreted as a line.
        const dx = curve[6] - curve[0]
        const dy = curve[7] - curve[1]
        const distance = Math.sqrt(dx * dx + dy * dy)
        if (distance > 0) {
          length += distance
          parts.push({
            offset: length,
            curve,
            index,
            time: t2,
            // On straight parts, curve-time doesn't follow their
            // length, see #get():
            isStraight: Bezier.isStraight(curve)
          })
        }
      }
    }

    for (let i = 1, l = segments.length; i < l; i++) {
      segment2 = segments[i]
      addCurve(segment1, segment2)
      segment1 = segment2
    }
    if (path._closed) {
      addCurve(segment2 || segment1, segments[0])
    }
    this.#curves = curves
    this.parts = parts
    this.length = length
    // Keep a current index from the part where we last where in
    // #get(), to optimise for iterator-like usage of flattener.
    this.#index = 0
  }

  #get(offset: number): { index: number; time: number } {
    // Make sure we're not beyond the requested offset already. Search the
    // start position backwards from where to then process the loop below.
    const { parts } = this
    const { length } = parts
    let i: number
    let j = this.#index
    for (;;) {
      i = j
      if (!j || parts[--j].offset < offset) break
    }
    // Find the part that succeeds the given offset, then interpolate
    // with the previous part
    for (; i < length; i++) {
      const part = parts[i]
      if (part.offset >= offset) {
        // Found the right part, remember current position
        this.#index = i
        // Now get the previous part so we can linearly interpolate
        // the curve parameter
        const previous = parts[i - 1]
        // Make sure we only use the previous parameter value if its
        // for the same curve, by checking index. Use 0 otherwise.
        const previousTime = previous?.index === part.index ? previous.time : 0
        const previousOffset = previous?.offset ?? 0
        let factor = (offset - previousOffset) / (part.offset - previousOffset)
        if (part.isStraight) {
          // The part's time at the point on its line:
          const v = part.curve
          factor = Bezier.getTimeOf(
            v,
            new Point(
              v[0] + (v[6] - v[0]) * factor,
              v[1] + (v[7] - v[1]) * factor
            )
          )
        }
        return {
          index: part.index,
          // Interpolate
          time: previousTime + (part.time - previousTime) * factor
        }
      }
    }
    // If we're still here, return last one
    return {
      index: parts[length - 1].index,
      time: 1
    }
  }

  static {
    // Inject the evaluators at path offsets, getPointAt() …:
    for (const key of curveEvaluations) {
      const name = `get${capitalize(key)}`
      inject(this.prototype, {
        [`${name}At`](this: PathFlattener, offset: number) {
          const { index, time } = this.#get(offset)
          return Bezier[name](this.#curves[index], time)
        }
      })
    }
  }
}

// The members defined at runtime rather than in the class body:
export interface PathFlattener {
  getPointAt(offset: number): Point
  getTangentAt(offset: number): Point
  getNormalAt(offset: number): Point
  getWeightedTangentAt(offset: number): Point
  getWeightedNormalAt(offset: number): Point
  getCurvatureAt(offset: number): number
}
