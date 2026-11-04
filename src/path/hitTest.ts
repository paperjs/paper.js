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
  Curve,
  CurveLocation,
  EPSILON,
  HitResult,
  Matrix,
  Path,
  Point,
  Segment,
  Size,
  addBevelJoin,
  addSquareCap
} from '../internal.ts'

/**
 * Hit-tests the path, see Item#hitTest().
 *
 * @private
 */
export function hitTestPath(
  path: Path,
  point: Point,
  options: any,
  viewMatrix: Matrix,
  strokeMatrix: Matrix
): HitResult | HitResult[] | null {
  let i: number
  let l: number

  const { style } = path
  const segments = path._segments
  const numSegments = segments.length
  const closed = path._closed
  // Measure where the stroke is drawn with a round pen: for
  // non-scaling strokes in the view's coordinates, through the
  // inverted strokeMatrix that Item#_hitTest() passes, otherwise in
  // the item's own. Curve times are the same in both (#2334):
  const strokeSpace = strokeMatrix?.inverted()
  const strokePoint = point.transform(strokeSpace)
  // The tolerance padding in that space, see Item#_hitTest(): for
  // non-scaling strokes, the tolerance of the project in the view's
  // coordinates. The stroke padding is added on top of it below.
  const tolerancePadding = strokeSpace
    ? new Size(
        Matrix._getCircleExtents(
          Math.max(options.tolerance, EPSILON),
          path.view._matrix._shiftless()
        )
      )
    : options._tolerancePadding
  let strokePadding = tolerancePadding
  let join: string
  let cap: string
  let miterLimit: number
  let area: Path
  let loc: CurveLocation
  let res: any
  // When collecting all hits for hitTestAll(), we report every
  // segment and handle in range, not just the first one:
  const hits: HitResult[] = options.all && []
  const hitStroke = options.stroke && style.hasStroke()
  // Transparent fills are hit too, only no fill isn't, as in SVG
  // (#1157):
  const hitFill = options.fill && !!style.fillColor
  const hitCurves = options.curves
  const strokeRadius = hitStroke
    ? style.strokeWidth / 2
    : // Set radius to 0 when we're hit-testing fills with
      // tolerance, to handle tolerance through stroke hit-test
      // functionality. Also use 0 when hit-testing curves.
      hitFill && options.tolerance > 0 || hitCurves
      ? 0
      : null
  if (strokeRadius !== null) {
    if (strokeRadius > 0) {
      join = style.strokeJoin
      cap = style.strokeCap
      miterLimit = style.miterLimit
      // Add the stroke radius to tolerance padding, which is round
      // where the stroke is measured:
      strokePadding = strokePadding.add(strokeRadius)
    } else {
      join = cap = 'round'
    }
    // Using tolerance padding for fill tests will also work if there is
    // no stroke, in which case radius = 0 and we will test for stroke
    // locations to extend the fill area by tolerance.
  }

  // Checks a point where the stroke is measured, see strokeSpace:
  function isCloseEnough(pt: Point, padding: Size) {
    return strokePoint.subtract(pt).divide(padding).length <= 1
  }

  const checkSegmentPoint = (seg: Segment, pt: Point, name: string) => {
    if (!options.selected || pt.selected) {
      const anchor = seg._point
      const position = pt !== anchor ? pt.add(anchor) : pt
      if (isCloseEnough(position.transform(strokeSpace), strokePadding)) {
        const hit = new HitResult(name, path, {
          segment: seg,
          point: position
        })
        if (!hits) return hit
        hits.push(hit)
      }
    }
  }

  function checkSegmentPoints(seg: Segment, ends?: boolean) {
    // Note, when checking for ends, we don't also check for handles,
    // since path will happen afterwards in a separate loop, see below.
    return (
      (
        (ends || options.segments) &&
        checkSegmentPoint(seg, seg._point, 'segment')
      ) || (
        !ends &&
        options.handles && (
          checkSegmentPoint(seg, seg._handleIn, 'handle-in') ||
          checkSegmentPoint(seg, seg._handleOut, 'handle-out')
        )
      )
    )
  }

  // Code to check stroke join / cap areas

  function addToArea(point: Point) {
    area.add(point)
  }

  // Returns the tangent where the curve meets the segment, looking past
  // curves without length, which have no direction:
  function getJoinTangent(curve: Curve, forward: boolean) {
    for (let i = 0; curve && i < numSegments; i++) {
      if (curve.hasLength()) return curve.getTangentAtTime(forward ? 0 : 1)
      curve = forward ? curve.next : curve.previous
    }
  }

  function isFlatJoin(segment: Segment) {
    const { curve } = segment
    const tangent1 = getJoinTangent(curve.previous, false)
    const tangent2 = getJoinTangent(curve, true)
    return (
      tangent1 &&
      tangent2 &&
      tangent1.isCollinear(tangent2) &&
      tangent1.dot(tangent2) > 0
    )
  }

  function checkSegmentStroke(segment: Segment) {
    // Handle joins / caps that are not round specifically, by
    // hit-testing their polygon areas.
    const isJoin = (
      closed ||
      segment._index > 0 && segment._index < numSegments - 1
    )
    // Smooth segments are always joined round, as in addJoin() in
    // getStrokeBounds(), and so are segments where the curves meet in
    // the same direction, such as a line running into a curve, as the
    // join adds nothing there:
    if (
      isJoin && (segment.isSmooth() || isFlatJoin(segment)) ||
      (isJoin ? join : cap) === 'round'
    ) {
      // Round join / cap is easy to handle.
      return isCloseEnough(
        segment._point.transform(strokeSpace),
        strokePadding
      )
    } else {
      // Create an 'internal' path without id and outside the scene
      // graph to run the hit-test on it, where the stroke is
      // measured.
      area = new Path({ internal: true, closed: true })
      if (isJoin) {
        // addBevelJoin() handles both 'bevel' and 'miter'.
        addBevelJoin(
          segment,
          join,
          strokeRadius,
          miterLimit,
          strokeSpace,
          null,
          addToArea,
          true
        )
      } else {
        // addSquareCap() handles both 'square' and 'butt' caps.
        addSquareCap(
          segment,
          cap,
          strokeRadius,
          strokeSpace,
          null,
          addToArea,
          true
        )
      }
      // See if the above produced an area to check for
      if (!area.isEmpty()) {
        // Also use stroke check with tolerancePadding if the point
        // is not inside the area itself, to use test caps and joins
        // with same tolerance.
        let loc: CurveLocation
        return (
          area.contains(strokePoint) || (
            (loc = area.getNearestLocation(strokePoint)) &&
            isCloseEnough(loc.point, tolerancePadding)
          )
        )
      }
    }
  }

  // If we're asked to query for segments, ends or handles, do all that
  // before stroke or fill.
  if (options.ends && !options.segments && !closed) {
    if (
      (res = (
        checkSegmentPoints(segments[0], true) ||
        checkSegmentPoints(segments[numSegments - 1], true)
      ))
    )
      return res
  } else if (options.segments || options.handles) {
    for (i = 0; i < numSegments; i++) {
      if ((res = checkSegmentPoints(segments[i]))) return res
    }
  }
  // If we're querying for stroke, perform that before fill
  if (strokeRadius !== null) {
    // Find the nearest location where the stroke is measured, as
    // PathItem#getNearestLocation() does in the item's coordinates:
    const { curves } = path
    let minDistance = Infinity
    let nearest: Point
    for (i = 0, l = curves.length; i < l; i++) {
      const values = curves[i].getValues(strokeSpace)
      const t = Curve.getNearestTime(values, strokePoint)
      const pt = Curve.getPoint(values, t)
      const distance = pt.getDistance(strokePoint)
      if (distance < minDistance) {
        minDistance = distance
        loc = new CurveLocation(curves[i], t)
        nearest = pt
      }
    }
    // Note that paths need at least two segments to have an actual
    // stroke. But we still check for segments with the radius fallback
    // check if there is only one segment.
    // Stroke profiles are hit within the outline of their stroke:
    const outline = (
      hitStroke &&
      path._hasStrokeProfile() &&
      path._getStrokeOutline()
    )
    if (loc && outline) {
      if (
        !outline.contains(strokePoint) &&
        !isCloseEnough(outline.getNearestPoint(strokePoint), tolerancePadding)
      ) {
        loc = null
      }
    } else if (loc) {
      // Now see if we're on a segment, and if so, check for its
      // stroke join / cap first. If not, do a normal radius check
      // for round strokes.
      const { time } = loc
      if (time === 0 || time === 1 && numSegments > 1) {
        if (!checkSegmentStroke(loc.segment)) {
          loc = null
        }
      } else if (!isCloseEnough(nearest, strokePadding)) {
        loc = null
      }
    }
    // If we have miter joins, we may not be done yet, since they can be
    // longer than the radius. Check for each segment within reach now.
    if (!loc && !outline && join === 'miter' && numSegments > 1) {
      for (i = 0; i < numSegments; i++) {
        const segment = segments[i]
        if (
          (
            strokePoint.getDistance(segment._point.transform(strokeSpace)) <=
            miterLimit * strokeRadius
          ) &&
          checkSegmentStroke(segment)
        ) {
          loc = segment.location
          break
        }
      }
    }
  }
  // Don't process loc yet, as we also need to query for stroke after fill
  // in some cases. Simply skip fill query if we already have a matching
  // stroke. If we have a loc and no stroke then it's a result for fill.
  res =
    (
      !loc && hitFill && path._contains(point) ||
      loc && !hitStroke && !hitCurves
    )
      ? new HitResult('fill', path)
      : loc
        ? new HitResult(hitStroke ? 'stroke' : 'curve', path, {
            location: loc,
            // It's fine performance wise to read the point
            // again since it was already calculated before.
            point: loc.point
          })
        : null
  if (hits) {
    // Report the closest segments and handles first, then the rest:
    hits.sort(
      (hit1, hit2) => (
        hit1.point.getDistance(point) - hit2.point.getDistance(point)
      )
    )
    if (res) {
      hits.push(res)
    }
    return hits
  }
  return res
}
