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
  if (entry.strokeProfile) path.strokeProfile = entry.strokeProfile
  return path
}

// Outlines the path's stroke, and adds the problems of outlines of all kinds
// to the problems. Returns null where there's nothing more to check:
function getOutline(path, problems) {
  let outline
  try {
    outline = path.outline({ insert: false })
  } catch (err) {
    problems.push(`throws ${err.message}`)
    return null
  }
  // Dots of closed paths or with butt caps have no outline:
  if (outline.isEmpty()) {
    if (path.length || !path.closed && path.strokeCap !== 'butt')
      problems.push('empty')
    return null
  }
  const crossings = outline
    .getIntersections()
    .filter(location => location.isCrossing()).length
  if (crossings) problems.push(`${crossings} crossings`)
  return outline
}

// Returns the problems of the outline of the path's stroke, as strings:
export function checkOutline(paper, path) {
  const problems = []
  const offset = path.strokeWidth / 2
  const outline = getOutline(path, problems)
  if (!outline) return problems
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

// The signed distance of the point to the ellipse with the half axes a and b,
// in its coordinates, negative inside, by Eberly's bisection:
function getEllipseDistance(x, y, a, b) {
  x = Math.abs(x)
  y = Math.abs(y)
  if (a < b) [x, y, a, b] = [y, x, b, a]
  if (!b) {
    // A flat pen is a line:
    return Math.hypot(Math.max(x - a, 0), y)
  }
  const isInside = (x / a) ** 2 + (y / b) ** 2 < 1
  let distance
  if (!y) {
    const x0 = a * x / (a * a - b * b)
    distance =
      x0 < 1
        ? Math.hypot(a * x0 - x, b * Math.sqrt(1 - x0 * x0))
        : Math.abs(x - a)
  } else if (!x) {
    distance = Math.abs(y - b)
  } else {
    const z0 = x / a
    const z1 = y / b
    const r0 = (a / b) ** 2
    const n0 = r0 * z0
    let s0 = z1 - 1
    let s1 = isInside ? 0 : Math.hypot(n0, z1) - 1
    let s = 0
    for (let i = 0; i < 100; i++) {
      s = (s0 + s1) / 2
      if (s === s0 || s === s1) break
      const g = (n0 / (s + r0)) ** 2 + (z1 / (s + 1)) ** 2 - 1
      if (g > 0) s0 = s
      else if (g < 0) s1 = s
      else break
    }
    distance = Math.hypot(x - r0 * x / (s + r0), y - y / (s + 1))
  }
  return isInside ? -distance : distance
}

// Returns the problems of the outline of the path's stroke profile, as
// strings. The outline is the union of the pens along the path, their
// ellipses, and of the joins and caps:
export function checkProfileOutline(paper, path) {
  const problems = []
  const outline = getOutline(path, problems)
  if (!outline) return problems
  const radius = path.strokeWidth / 2
  const { curves, length, closed } = path
  const getPen = offset => {
    const { width, aspect, angle } = path.getStrokeProfileAt(offset)
    const a = radius * width
    return {
      offset,
      center: path.getPointAt(offset),
      tangent: path.getTangentAt(offset),
      a,
      b: a * aspect,
      angle,
      size: Math.max(a, a * aspect)
    }
  }
  // The outline fits the sides within the tolerance of the stroke's width at
  // their samples, along curves regularized within a quarter of it, and the
  // ellipses of big pens are off as much as circles:
  const getPenTolerance = size => (
    2 * Math.min(0.1, radius / 100) + 5e-4 * Math.max(radius, size)
  )
  const getDistance = (point, pen) => {
    const { x, y } = point.subtract(pen.center).rotate(-pen.angle)
    return getEllipseDistance(x, y, pen.a, pen.b)
  }
  // The pens along each curve, and on both sides of each stop, as close
  // together as the gaps between them stay within the tolerance, by how far
  // the points on their edges move from one to the next:
  const stopOffsets = path.strokeProfile.map(stop => stop.offset)
  const steps = stopOffsets.filter(
    (offset, i) => stopOffsets.indexOf(offset) !== i
  )
  const offsets = [...stopOffsets, length]
  let start = 0
  for (const curve of curves) {
    // Curves can end where they start:
    for (let i = 0; i < 8; i++) offsets.push(start + curve.length * i / 8)
    start += curve.length
  }
  for (const offset of stopOffsets) {
    if (offset > 0) offsets.push(offset - length * 1e-9)
  }
  const pens = []
  // The points on the edges turn around the pens with them, and with the
  // path, where they touch the sides:
  const getMove = (pen1, pen2) => (
    pen1.center.getDistance(pen2.center) +
    Math.abs(pen1.a - pen2.a) +
    Math.abs(pen1.b - pen2.b) +
    Math.max(pen1.size, pen2.size) *
    (Math.abs(pen1.angle - pen2.angle) + pen1.tangent.getAngle(pen2.tangent)) *
    Math.PI / 180
  )
  const addPens = (pen1, pen2) => {
    // The gaps grow with the moves' squares over the edges' tightest radius
    // of curvature, at the ends of the ellipses' major axes:
    const getRadius = ({ a, b }) => Math.min(a, b) ** 2 / Math.max(a, b) || 0
    const edgeRadius = Math.min(getRadius(pen1), getRadius(pen2))
    const tolerance = getPenTolerance(Math.min(pen1.size, pen2.size))
    if (
      pen2.offset - pen1.offset > tolerance &&
      getMove(pen1, pen2) > Math.sqrt(8 * edgeRadius * tolerance)
    ) {
      const pen = getPen((pen1.offset + pen2.offset) / 2)
      addPens(pen1, pen)
      addPens(pen, pen2)
    } else {
      pens.push(pen2)
    }
  }
  const ends = [...new Set(offsets)].sort((a, b) => a - b).map(getPen)
  pens.push(ends[0])
  for (let i = 1; i < ends.length; i++) addPens(ends[i - 1], ends[i])
  // Where the outline cuts the pens off: at butt caps and steps, and at the
  // joins that aren't round. Miter joins and square caps reach beyond them:
  const cuts = steps.map(offset => ({ point: path.getPointAt(offset) }))
  if (!closed) {
    for (const offset of [0, length]) {
      cuts.push({
        point: path.getPointAt(offset),
        isBeyond: path.strokeCap === 'square'
      })
    }
  }
  if (path.strokeJoin !== 'round') {
    for (let i = 0, l = curves.length; i < (closed ? l : l - 1); i++) {
      const tangent1 = curves[i].getTangentAtTime(1)
      const tangent2 = curves[(i + 1) % l].getTangentAtTime(0)
      if (
        Math.abs(tangent1.cross(tangent2)) > 1e-8 ||
        tangent1.dot(tangent2) < 0
      ) {
        cuts.push({
          point: curves[i].point2,
          isBeyond: path.strokeJoin === 'miter'
        })
      }
    }
  }
  // How far the pens reach around each cut, and around which the outline is
  // cut, or reaches beyond the pens:
  for (const cut of cuts) {
    cut.size = Math.max(
      ...pens
        .filter(pen => pen.center.getDistance(cut.point) < 2 * pen.size)
        .map(pen => pen.size),
      0
    )
  }
  const isNearCut = (point, isBeyond) =>
    cuts.some(
      cut => (
        (!isBeyond || cut.isBeyond) && (
          point.getDistance(cut.point) <
          (isBeyond ? path.miterLimit + 1 : 2) * cut.size
        )
      )
    )
  // The points within the pens are inside the outline, checked where the pens
  // moved by a quarter of their size:
  let outside = 0
  let checked = null
  for (const pen of pens) {
    const tolerance = getPenTolerance(pen.size)
    if (
      pen.size > tolerance &&
      !isNearCut(pen.center) &&
      !(checked && getMove(checked, pen) < pen.size / 4)
    ) {
      checked = pen
      for (let i = 0; i < 16; i++) {
        const phi = Math.PI * i / 8
        const point = pen.center.add(
          new paper.Point(
            0.9 * pen.a * Math.cos(phi),
            0.9 * pen.b * Math.sin(phi)
          ).rotate(pen.angle)
        )
        if (
          !outline.contains(point) &&
          outline.getNearestPoint(point).getDistance(point) > tolerance
        )
          outside++
      }
    }
  }
  if (outside) problems.push(`${outside} points of the pens outside`)
  // The points of the outline lie on the edge of the union of the pens: in
  // none of them, and on one of them:
  let far = 0
  let near = 0
  let error = 0
  let index = 0
  const maxSize = pens.reduce((max, pen) => Math.max(max, pen.size), 0)
  const indicesByX = pens
    .map((_, i) => i)
    .sort((i, j) => pens[i].center.x - pens[j].center.x)
  // The first of the pens sorted by x with its center at x or beyond:
  const findIndex = x => {
    let lo = 0
    let hi = indicesByX.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (pens[indicesByX[mid]].center.x < x) lo = mid + 1
      else hi = mid
    }
    return lo
  }
  for (const curve of outline.getCurves()) {
    for (let i = 0; i <= 16; i++) {
      const point = curve.getPointAtTime(i / 16)
      // Start with the pen nearest to the previous point, as the outline
      // mostly follows the path:
      let min = getDistance(point, pens[index])
      // The pens about as close as the nearest one, within the tolerance of
      // the largest, as the pens between them may be closer:
      const margin = getPenTolerance(maxSize)
      const distances = []
      // Only the pens with centers this close in x can be nearer:
      const reach = min + maxSize + margin
      const end = findIndex(point.x + reach)
      for (let k = findIndex(point.x - reach); k < end; k++) {
        const j = indicesByX[k]
        const pen = pens[j]
        if (point.getDistance(pen.center) - pen.size < min + margin) {
          const distance = getDistance(point, pen)
          distances.push([j, distance])
          if (distance < min) {
            min = distance
            index = j
          }
        }
      }
      let pen = pens[index]
      // Outside the sampled pens, it may still lie on the pens between them:
      if (min > getPenTolerance(pen.size)) {
        const limit = min + margin
        for (const [j, distance] of distances) {
          if (distance <= limit) {
            let o0 = pens[Math.max(j - 1, 0)].offset
            let o1 = pens[Math.min(j + 1, pens.length - 1)].offset
            for (let k = 0; k < 40; k++) {
              const m0 = o0 + (o1 - o0) / 3
              const m1 = o1 - (o1 - o0) / 3
              if (
                getDistance(point, getPen(m0)) <
                getDistance(point, getPen(m1))
              )
                o1 = m1
              else o0 = m0
            }
            const between = getPen((o0 + o1) / 2)
            const betweenDistance = getDistance(point, between)
            if (betweenDistance < min) {
              min = betweenDistance
              pen = between
            }
          }
        }
      }
      const tolerance = getPenTolerance(pen.size)
      if (min > tolerance && !isNearCut(point, true)) {
        far++
        error = Math.max(error, min)
      }
      if (min < -tolerance && !isNearCut(point)) {
        near++
        error = Math.max(error, -min)
      }
    }
  }
  if (far) problems.push(`${far} points of the outline outside the pens`)
  if (near) problems.push(`${near} points of the outline within the pens`)
  if (error) problems.push(`off by ${error.toFixed(2)}`)
  return problems
}
