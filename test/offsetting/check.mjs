/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2020, Jürg Lehni & Jonathan Puckey
 * http://juerglehni.com/ & https://puckey.studio/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

// The checks of the outlines of strokes, shared by the tests and the fuzzer:
// the outline exists, it doesn't cross itself, the points within the stroke
// along the path's normals are inside it, and with round joins and caps, every
// point of it lies at half the stroke width from the path.

// How far the points of round outlines may be off: the offsets' error, with a
// margin, plus that of the circles of round joins and caps:
export function getTolerance(radius) {
  return 1.5 * Math.min(0.1, radius / 100) + 5e-4 * radius
}

export const joins = ['round', 'miter', 'bevel']
export const caps = ['round', 'square', 'butt']
export const widths = [10, 62, 120]

export function createPath(paper, entry, style) {
  const path = new paper.Path({
    ...(
      entry.pathData
        ? { pathData: entry.pathData }
        : { segments: entry.segments }
    ),
    closed: !!entry.closed,
    insert: false
  })
  path.set(style)
  return path
}

// Returns the problems of the outline of the path's stroke, as strings:
export function checkOutline(paper, path) {
  const problems = []
  const offset = path.strokeWidth / 2
  let outline
  try {
    outline = path.outline({ insert: false })
  } catch (err) {
    return [`throws ${err.message}`]
  }
  // Dots of closed paths or with butt caps have no outline:
  if (outline.isEmpty())
    return path.length || (!path.closed && path.strokeCap !== 'butt')
      ? ['empty']
      : []
  const crossings = outline
    .getIntersections()
    .filter(location => location.isCrossing()).length
  if (crossings) problems.push(`${crossings} crossings`)
  // Points along the normals within the stroke are inside, sampled by length
  // and along each curve, as short curves can turn a lot. The ends of open
  // paths with butt caps lie on their edge:
  const isCut = path.strokeCap === 'butt' && !path.closed
  const { curves, length } = path
  const count = 60
  const locations = []
  for (let i = 0; i <= count; i++) {
    locations.push(path.getLocationAt(length * i / count))
    for (const curve of curves) {
      locations.push(curve.getLocationAtTime(i / count))
    }
  }
  let outside = 0
  for (const location of locations) {
    const isEnd = (
      location && (
        location.curve === curves[0] && location.time === 0 ||
        location.curve === curves[curves.length - 1] && location.time === 1
      )
    )
    if (location && !(isCut && isEnd)) {
      for (const side of [-1, 1]) {
        const point = location.point.add(
          location.normal.multiply(side * offset * 0.9)
        )
        // Inside tight turns, such points can lie on the outline:
        if (
          !outline.contains(point) && (
            outline.getNearestPoint(point).getDistance(point) >
            getTolerance(offset)
          )
        )
          outside++
      }
    }
  }
  if (outside) problems.push(`${outside} points of the stroke outside`)
  // Each point of the outline lies at the radius from the path, except at the
  // joins and caps, where it may lie closer, or further at miters and squares,
  // up to their limits. With round joins and caps, measure how far off they
  // are:
  const tolerance = getTolerance(offset)
  const isRound = path.strokeJoin === 'round' && path.strokeCap === 'round'
  const limit = (
    offset *
    Math.max(
      path.strokeJoin === 'miter' ? path.miterLimit : 1,
      path.strokeCap === 'square' ? Math.SQRT2 : 1
    ) +
    tolerance
  )
  // Points on the outline of the sweep end a normal of the path at the radius,
  // also where they lie closer to other points of the path:
  const isOnSweep = point => {
    const count = 64
    const getDot = (curve, t) =>
      point.subtract(curve.getPointAtTime(t)).dot(curve.getTangentAtTime(t))
    return curves.some(curve => {
      for (let i = 1, d0 = getDot(curve, 0); i <= count; i++) {
        const d1 = getDot(curve, i / count)
        if (d0 * d1 <= 0) {
          // Bisect to the foot of the normal, and see if it ends there:
          let t0 = (i - 1) / count
          let t1 = i / count
          for (let j = 0; j < 40; j++) {
            const t = (t0 + t1) / 2
            if (getDot(curve, t) * d0 > 0) t0 = t
            else t1 = t
          }
          // It ends there at the radius, or at the center of curvature, where
          // the normals fold over along the evolute:
          const t = (t0 + t1) / 2
          const distance = curve.getPointAtTime(t).getDistance(point)
          const center = 1 / Math.abs(curve.getCurvatureAtTime(t))
          if (
            Math.abs(distance - offset) < tolerance ||
            center <= offset && Math.abs(distance - center) < tolerance
          )
            return true
        }
        d0 = d1
      }
      return false
    })
  }
  // The normals at the segments, at the ends of the curves' sweeps, which
  // neither the joins nor butt caps cover where the path turns back:
  const normals = curves.flatMap(curve => [
    [curve.point1, curve.getNormalAtTime(0)],
    [curve.point2, curve.getNormalAtTime(1)]
  ])
  let error = 0
  let far = 0
  let near = 0
  for (const curve of outline.getCurves()) {
    for (let i = 0; i <= 16; i++) {
      const point = curve.getPointAtTime(i / 16)
      const location = point && path.getNearestLocation(point)
      // Invalid coordinates have no nearest point:
      const distance = location ? location.point.getDistance(point) : Infinity
      const isAtSegment = (
        location &&
        path.segments.some(
          segment => segment.point.getDistance(location.point) < tolerance
        )
      )
      const isOnNormal = normals.some(
        ([end, normal]) => (
          Math.abs(point.subtract(end).cross(normal)) < tolerance &&
          point.getDistance(end) <= offset + tolerance
        )
      )
      if (isRound) error = Math.max(error, Math.abs(distance - offset))
      if (distance > limit) far++
      if (
        distance < offset - tolerance &&
        !isAtSegment &&
        !isOnNormal &&
        !isOnSweep(point)
      )
        near++
    }
  }
  if (error > tolerance) problems.push(`off by ${error.toFixed(2)}`)
  if (far) problems.push(`${far} points of the outline too far`)
  if (near) problems.push(`${near} points of the outline within the stroke`)
  return problems
}
