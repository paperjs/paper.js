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

// The bounds of segment lists, for paths and curves, with and without their
// strokes and handles, see Path#_getBounds() and Curve#getBounds():
import {
  Curve,
  Line,
  Matrix,
  Point,
  Rectangle,
  Segment,
  Size
} from '../internal.ts'
import type { Path } from './Path.ts'

/**
 * Returns the bounding rectangle of the item excluding stroke width.
 *
 * @private
 */
export function getSegmentBounds(
  segments: Segment[],
  closed: boolean,
  path?: Path,
  matrix?: Matrix,
  options?: any,
  strokePadding?: number[]
): Rectangle {
  const first = segments[0]
  // If there are no segments, return "empty" rectangle, just like groups,
  // since #bounds is assumed to never return null.
  if (!first) return new Rectangle()
  let coords = new Array(6)
  // Make coordinates for first segment available in prevCoords.
  let prevCoords = first._transformCoordinates(matrix, new Array(6))
  const min = prevCoords.slice(0, 2) // Start with values of first point
  const max = min.slice() // clone
  const roots = new Array(2)

  function processSegment(segment: Segment) {
    segment._transformCoordinates(matrix, coords)
    for (let i = 0; i < 2; i++) {
      Curve._addBounds(
        prevCoords[i], // prev.point
        prevCoords[i + 4], // prev.handleOut
        coords[i + 2], // segment.handleIn
        coords[i], // segment.point,
        i,
        strokePadding?.[i] ?? 0,
        min,
        max,
        roots
      )
    }
    // Swap coordinate buffers.
    const tmp = prevCoords
    prevCoords = coords
    coords = tmp
  }

  for (let i = 1, l = segments.length; i < l; i++) {
    processSegment(segments[i])
  }
  if (closed) {
    processSegment(first)
  }
  return new Rectangle(min[0], min[1], max[0] - min[0], max[1] - min[1])
}

/**
 * Returns the bounding rectangle of the item including stroke width.
 *
 * @private
 */
export function getSegmentStrokeBounds(
  segments: Segment[],
  closed: boolean,
  path: Path,
  matrix?: Matrix,
  options?: any
): Rectangle {
  const { style } = path
  const stroke = style.hasStroke()
  const strokeRadius = style.strokeWidth / 2
  const strokeMatrix = stroke ? path._getStrokeMatrix(matrix, options) : null
  const strokePadding = (
    stroke &&
    Matrix._getCircleExtents(strokeRadius, strokeMatrix)
  )
  // Start with normal path bounds with added stroke padding. Then we
  // only need to look at each segment and handle join / cap / miter.
  let bounds = getSegmentBounds(
    segments,
    closed,
    path,
    matrix,
    options,
    strokePadding
  )
  if (!stroke) return bounds
  const join = style.strokeJoin
  const cap = style.strokeCap
  const { miterLimit } = style
  // Create a rectangle of padding size, used for union with bounds
  // further down
  const joinBounds = new Rectangle(new Size(strokePadding).multiply(2))

  // helper function that is passed to addBevelJoin() and addSquareCap()
  // to handle the point transformations.
  function addPoint(point: Point) {
    bounds = bounds.include(point)
  }

  function addRound(segment: Segment) {
    joinBounds.center = segment._point.transform(matrix)
    bounds = bounds.unite(joinBounds)
  }

  function addJoin(segment: Segment, join: string) {
    // When both handles are set in a segment and they are collinear,
    // the join setting is ignored and round is always used.
    if (join === 'round' || segment.isSmooth()) {
      addRound(segment)
    } else {
      // addBevelJoin() handles both 'bevel' and 'miter' joins.
      addBevelJoin(
        segment,
        join,
        strokeRadius,
        miterLimit,
        matrix,
        strokeMatrix,
        addPoint
      )
    }
  }

  function addCap(segment: Segment, cap: string) {
    if (cap === 'round') {
      addRound(segment)
    } else {
      // addSquareCap() handles both 'square' and 'butt' caps.
      addSquareCap(
        segment,
        cap,
        strokeRadius,
        matrix,
        strokeMatrix,
        addPoint
      )
    }
  }

  const length = segments.length - (closed ? 0 : 1)
  if (length > 0) {
    for (let i = 1; i < length; i++) {
      addJoin(segments[i], join)
    }
    if (closed) {
      // Go back to the beginning
      addJoin(segments[0], join)
    } else {
      // Handle caps on open paths
      addCap(segments[0], cap)
      addCap(segments[segments.length - 1], cap)
    }
  }
  return bounds
}

/**
 * Returns the bounding rectangle of the item including handles.
 *
 * @private
 */
export function getSegmentHandleBounds(
  segments: Segment[],
  closed: boolean,
  path: Path,
  matrix?: Matrix,
  options?: any
): Rectangle {
  // If there are no segments, return "empty" rectangle, as getBounds().
  if (!segments.length) return new Rectangle()
  const { style } = path
  const stroke = options.stroke && style.hasStroke()
  let strokePadding: number[]
  let joinPadding: number[]
  if (stroke) {
    const strokeMatrix = path._getStrokeMatrix(matrix, options)
    const strokeRadius = style.strokeWidth / 2
    let joinRadius = strokeRadius
    if (style.strokeJoin === 'miter') {
      joinRadius = strokeRadius * style.miterLimit
    }
    if (style.strokeCap === 'square') {
      joinRadius = Math.max(joinRadius, strokeRadius * Math.SQRT2)
    }
    strokePadding = Matrix._getCircleExtents(strokeRadius, strokeMatrix)
    joinPadding = Matrix._getCircleExtents(joinRadius, strokeMatrix)
  }
  const coords = new Array(6)
  let x1 = Infinity
  let x2 = -x1
  let y1 = x1
  let y2 = x2
  for (let i = 0, l = segments.length; i < l; i++) {
    const segment = segments[i]
    segment._transformCoordinates(matrix, coords)
    for (let j = 0; j < 6; j += 2) {
      // Use different padding for points or handles
      const padding = !j ? joinPadding : strokePadding
      const paddingX = padding?.[0] ?? 0
      const paddingY = padding?.[1] ?? 0
      const x = coords[j]
      const y = coords[j + 1]
      const xn = x - paddingX
      const xx = x + paddingX
      const yn = y - paddingY
      const yx = y + paddingY
      if (xn < x1) {
        x1 = xn
      }
      if (xx > x2) {
        x2 = xx
      }
      if (yn < y1) {
        y1 = yn
      }
      if (yx > y2) {
        y2 = yx
      }
    }
  }
  return new Rectangle(x1, y1, x2 - x1, y2 - y1)
}

/**
 * Returns the normal of the curve at the given time with the length of the
 * stroke's radius, in the space where the stroke is drawn with a round pen,
 * from the curve's tangent transformed into it, as the matrices don't
 * preserve angles (#2065). For strokes that scale with the matrix, this is
 * the curve's own space.
 */

export function addBevelJoin(
  segment: Segment,
  join: string,
  radius: number,
  miterLimit: number,
  matrix: Matrix,
  strokeMatrix: Matrix,
  addPoint: (point: Point) => void,
  isArea?: boolean
) {
  // Handles both 'bevel' and 'miter' joins, as they share a lot of code,
  // using different matrices to transform segment points and stroke
  // vectors to support Style#strokeScaling. The join is constructed
  // where the stroke is drawn, see getStrokeNormal(), and its vectors
  // transformed from there.
  const curve2 = segment.curve
  const curve1 = curve2.previous
  const point = curve2.point1.transform(matrix)
  let normal1 = getStrokeNormal(curve1, 1, radius, matrix, strokeMatrix)
  let normal2 = getStrokeNormal(curve2, 0, radius, matrix, strokeMatrix)
  const angle = normal1.getDirectedAngle(normal2)
  if (angle < 0 || angle >= 180) {
    normal1 = normal1.negate()
    normal2 = normal2.negate()
  }
  if (isArea) {
    addPoint(point)
  }
  addPoint(point.add(normal1.transform(strokeMatrix)))
  if (join === 'miter') {
    // Intersect the two lines
    const corner = new Line(
      normal1,
      new Point(-normal1.y, normal1.x),
      true
    ).intersect(new Line(normal2, new Point(-normal2.y, normal2.x), true), true)
    // See if we actually get a bevel point and if its distance is below
    // the miterLimit. If not, make a normal bevel.
    if (corner?.length <= miterLimit * radius) {
      addPoint(point.add(corner.transform(strokeMatrix)))
    }
  }
  // Produce a normal bevel
  addPoint(point.add(normal2.transform(strokeMatrix)))
}

export function addSquareCap(
  segment: Segment,
  cap: string,
  radius: number,
  matrix: Matrix,
  strokeMatrix: Matrix,
  addPoint: (point: Point) => void,
  isArea?: boolean
) {
  // Handles both 'square' and 'butt' caps, as they share a lot of code.
  // Calculate the corner points of butt and square caps, using different
  // matrices to transform segment points and stroke vectors to support
  // Style#strokeScaling.
  let point = segment._point.transform(matrix)
  const loc = segment.location
  const { time } = loc
  // Checking the time for 0 is to see whether this is the first or
  // the last segment of the open path, in order to determine in which
  // direction to flip the normal.
  const vector = getStrokeNormal(
    loc.curve,
    time,
    time === 0 ? radius : -radius,
    matrix,
    strokeMatrix
  )
  const normal = vector.transform(strokeMatrix)
  // For square caps, we need to step away from point in the direction of
  // the tangent, which is the normal rotated before transforming it, as
  // the matrices don't preserve angles (#2065).
  if (cap === 'square') {
    if (isArea) {
      addPoint(point.subtract(normal))
      addPoint(point.add(normal))
    }
    point = point.add(vector.rotate(-90).transform(strokeMatrix))
  }
  addPoint(point.add(normal))
  addPoint(point.subtract(normal))
}

function getStrokeNormal(
  curve: Curve,
  time: number,
  radius: number,
  matrix: Matrix,
  strokeMatrix: Matrix
): Point {
  const shiftless = matrix?._shiftless() ?? new Matrix()
  const inverse = strokeMatrix?.inverted()
  const tangent = curve
    .getTangentAtTime(time)
    .transform(inverse?.append(shiftless) ?? shiftless)
  return new Point(tangent.y, -tangent.x).normalize(radius)
}
