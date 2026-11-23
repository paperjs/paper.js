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

// Arcs as the segments of the curves that approximate them, from the point
// where they start, in the ways that the drawing commands of paths and SVG
// path data describe them. An arc that is too flat to be one is the line to
// its end, and one that goes nowhere has no segments.
import { ANGULAR_EPSILON, EPSILON, KAPPA, isZero } from '../util/numerical.ts'
import { Line } from '../basic/Line.ts'
import { Matrix } from '../basic/Matrix.ts'
import { Point } from '../basic/Point.ts'
import type { Size } from '../basic/Size.ts'
import type { SegmentValues } from './path.ts'

// Returns the arc from `from` through `through` to `to`.
export function getArcThrough(from: Point, through: Point, to: Point) {
  // Intersect the perpendicular bisectors of (from, through) and
  // (through, to) to get the center:
  const center = new Line(
    from.add(through).divide(2),
    through.subtract(from).rotate(90),
    true
  ).intersect(
    new Line(
      through.add(to).divide(2),
      to.subtract(through).rotate(90),
      true
    ),
    true
  )
  const line = new Line(from, to)
  const throughSide = line.getSide(through)
  if (center) {
    const vector = from.subtract(center)
    let extent = vector.getDirectedAngle(to.subtract(center))
    const centerSide = line.getSide(center, true)
    if (centerSide === 0) {
      // With the center on the line, the sign of the extent may be wrong,
      // so we take it from the side of the through point:
      extent = throughSide * Math.abs(extent)
    } else if (throughSide === centerSide) {
      // With the center on the same side of the line as the through point,
      // the arc extends beyond 180 degrees:
      extent += extent < 0 ? 360 : -360
    }
    return getArc(from, to, center, extent)
  } else if (!throughSide) {
    // The three points are collinear, on a circle that is infinitely big:
    return getLine(from, to)
  } else {
    throw new Error('Cannot create an arc with the given arguments')
  }
}

// Returns the arc of `angle` degrees around `center`.
export function getArcAround(from: Point, center: Point, angle: number) {
  const to = center.add(from.subtract(center).rotate(angle))
  return getArc(from, to, center, angle)
}

// Returns the arc to `to` that continues in the direction of `tangent`.
export function getArcTowards(from: Point, tangent: Point, to: Point) {
  const normal = tangent.rotate(90)
  const vector = to.subtract(from)
  // The distance of `to` from the tangent, signed by its side:
  const distance = vector.dot(normal)
  if (!isZero(distance)) {
    // The center lies on the normal, as far from `from` as from `to`:
    const center = from.add(
      normal.multiply(vector.dot(vector) / (2 * distance))
    )
    let extent = from.subtract(center).getDirectedAngle(to.subtract(center))
    if (extent * distance < 0) {
      extent += distance > 0 ? 360 : -360
    }
    return getArc(from, to, center, extent)
  } else if (vector.dot(tangent) > 0) {
    return getLine(from, to)
  } else {
    // `to` lies behind, or there is no tangent to continue:
    throw new Error('Cannot create an arc with the given arguments')
  }
}

// Returns the arc of an ellipse of the given radius, rotated by `rotation`
// degrees, as the arcs of SVG path data describe it. See:
// https://www.w3.org/TR/SVG/implnote.html#ArcImplementationNotes
export function getEllipticArc(
  from: Point,
  to: Point,
  radius: Size,
  rotation: number,
  clockwise: boolean,
  large: boolean
) {
  const { abs, sqrt } = Math
  if (from.equals(to)) {
    // Equal points describe no arc at all (#1613).
    return []
  } else if (isZero(radius.width) || isZero(radius.height)) {
    return getLine(from, to)
  } else {
    const middle = from.add(to).divide(2)
    const { x, y } = from.subtract(middle).rotate(-rotation)
    let rx = abs(radius.width)
    let ry = abs(radius.height)
    let rxSq = rx * rx
    let rySq = ry * ry
    const xSq = x * x
    const ySq = y * y
    // "...ensure radii are large enough"
    let factor = sqrt(xSq / rxSq + ySq / rySq)
    if (factor > 1) {
      rx *= factor
      ry *= factor
      rxSq = rx * rx
      rySq = ry * ry
    }
    factor = (
      (rxSq * rySq - rxSq * ySq - rySq * xSq) /
      (rxSq * ySq + rySq * xSq)
    )
    if (abs(factor) < EPSILON) {
      factor = 0
    }
    if (factor < 0) {
      throw new Error('Cannot create an arc with the given arguments')
    }
    const center = new Point(rx * y / ry, -ry * x / rx)
      // "...where the + sign is chosen if fA != fS,
      // and the - sign is chosen if fA = fS."
      .multiply((large === clockwise ? -1 : 1) * sqrt(factor))
      .rotate(rotation)
      .add(middle)
    // Map the unit circle to the ellipse, and get the extent there:
    const matrix = new Matrix().translate(center).rotate(rotation).scale(rx, ry)
    let extent = matrix
      ._inverseTransform(from)
      .getDirectedAngle(matrix._inverseTransform(to))
    // "...if fS = 0 and extent is > 0, then subtract 360, whereas
    // if fS = 1 and extent is < 0, then add 360."
    if (!clockwise && extent > 0) {
      extent -= 360
    } else if (clockwise && extent < 0) {
      extent += 360
    }
    return getArc(from, to, center, extent, matrix)
  }
}

// The segments of the unit circle, from the right, as SVG converts ellipses,
// so dashes match (#601):
const circle = [
  [[1, 0], [0, -KAPPA], [0, KAPPA]],
  [[0, 1], [KAPPA, 0], [-KAPPA, 0]],
  [[-1, 0], [0, KAPPA], [0, -KAPPA]],
  [[0, -1], [-KAPPA, 0], [KAPPA, 0]]
]

// Returns the whole ellipse around `center`.
export function getEllipse(
  { x, y }: Point,
  { width, height }: Size
): SegmentValues[] {
  return circle.map(([[px, py], [inX, inY], [outX, outY]]) => [
    [x + px * width, y + py * height],
    [inX * width, inY * height],
    [outX * width, outY * height]
  ])
}

// Returns the arc of `extent` degrees around `center`, or on the ellipse that
// `matrix` maps the unit circle to.
function getArc(
  from: Point,
  to: Point,
  center: Point,
  extent: number,
  matrix?: Matrix
): SegmentValues[] {
  const { abs, ceil, cos, sin, PI } = Math
  // One curve per 90 degrees, without letting small imprecisions add one:
  const count = ceil((abs(extent) - ANGULAR_EPSILON) / 90)
  if (count) {
    const step = extent / count
    const half = step * PI / 360
    const z = 4 / 3 * sin(half) / (1 + cos(half))
    const segments: SegmentValues[] = []
    let vector = matrix ? matrix._inverseTransform(from) : from.subtract(center)
    for (let i = 0; i <= count; i++) {
      // Use the given point at the end, as calculating it adds imprecision:
      const point =
        i === count
          ? to
          : matrix
            ? matrix._transformPoint(vector)
            : center.add(vector)
      const getHandle = (angle: number) => {
        const handle = vector.rotate(angle).multiply(z)
        return matrix
          ? matrix._transformPoint(vector.add(handle)).subtract(point)
          : handle
      }
      segments.push([
        getValues(i > 0 ? point : from),
        i > 0 ? getValues(getHandle(-90)) : [0, 0],
        i < count ? getValues(getHandle(90)) : [0, 0]
      ])
      vector = vector.rotate(step)
    }
    return segments
  } else if (extent && !to.equals(from)) {
    // Arcs too small to approximate are straight:
    return getLine(from, to)
  } else {
    return []
  }
}

function getLine(from: Point, to: Point): SegmentValues[] {
  return [
    [getValues(from), [0, 0], [0, 0]],
    [getValues(to), [0, 0], [0, 0]]
  ]
}

function getValues({ x, y }: Point) {
  return [x, y]
}
