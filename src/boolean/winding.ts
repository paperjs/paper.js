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

// The winding of points against paths, by the curves that cross a ray from
// them, which tells whether a region contains them.
import {
  getCurvePoint,
  getCurveTangent,
  getMonoCurves,
  solveCurve
} from '../values/index.ts'
import type { CurveValues } from '../values/index.ts'
import type { Point } from '../basic/Point.ts'

const { abs, max, min } = Math

// A path to wind around: the values of its curves, and whether it is closed:
export type WindingPath = {
  curves: CurveValues[]
  closed: boolean
}

export type Winding = {
  winding: number
  windingL: number
  windingR: number
  onPath: boolean
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
 * @param paths the paths that describe the shape against which to check,
 *     as the values of their curves, and whether they are closed
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
  paths: WindingPath[],
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
            : solveCurve(v, io, po, roots, 0, 1) > 0
              ? roots[0]
              : 1
    const a = t === 0 ? a0 : t === 1 ? a3 : getCurvePoint(v, t)[dir ? 'y' : 'x']
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
      getCurveTangent(v, t)[dir ? 'x' : 'y'] === 0 &&
      getWinding(point, paths, !dir, true)
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
          : getMonoCurves(v, dir)
      let res: Winding | false
      for (let i = 0, l = monoCurves.length; i < l; i++) {
        // Calling addWinding() my lead to direction flipping, in
        // which case we already have the result and can return it.
        if ((res = addWinding(monoCurves[i]))) return res
      }
    }
  }

  for (const { curves, closed } of paths) {
    const l = curves.length
    for (let i = 0; i < l; i++) {
      const v = curves[i]
      if (!i) {
        // We're on a new (sub-)path, so we need to determine values of
        // the last non-horizontal curve on this path.
        vPrev = null
        // If the path is not closed, connect the first and last segment
        // with a straight curve, just like how filling open paths works:
        if (!closed) {
          const last = curves[l - 1]
          vClose = [
            last[6],
            last[7],
            last[6],
            last[7],
            v[0],
            v[1],
            v[0],
            v[1]
          ]
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
          for (let j = l - 1; j > 0; j--) {
            const v2 = curves[j]
            if (v2[io] !== v2[io + 6]) {
              vPrev = v2
              break
            }
          }
        }
      }

      // Calling handleCurve() my lead to direction flipping, in which
      // case we already have the result and can return it.
      if ((res = handleCurve(v))) return res

      if (i + 1 === l) {
        // We're at the last curve of the current (sub-)path. If a
        // closing curve was calculated at the beginning of it, handle
        // it now to treat the path as closed:
        if (vClose && (res = handleCurve(vClose))) return res
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
