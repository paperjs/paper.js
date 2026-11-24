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

// The pens of stroke profiles: ellipses that move along curves while they
// turn and change their size, and where they touch the edge of the area that
// they sweep.
import {
  EPSILON,
  GEOMETRIC_EPSILON,
  findRoot,
  isZero,
  solveQuartic
} from '../util/numerical.ts'
import { Point } from '../basic/Point.ts'
import {
  createMatrix,
  getArcThrough,
  getCurvature,
  getCurvePoint,
  getCurveTangent,
  rotateMatrix,
  scaleMatrix,
  transformPoint,
  translateMatrix
} from '../values/index.ts'
import type { CurveValues, SegmentValues } from '../values/index.ts'

// The values of the pen of a stroke profile with their first and second
// derivatives along the path:
export type PenValues = { width: number[]; aspect: number[]; angle: number[] }

// The pen of a stroke profile:
export type Pen = {
  a: number
  b: number
  angle: number
  da: number
  db: number
  dda: number
  ddb: number
  dAngle: number
  ddAngle: number
}

// A point where the pen touches the edge of the area that it sweeps:
export type Contact = {
  phi: number
  point: Point
  derivative: Point
  distance?: number
}

// An arc of the pen's edge between two contacts, that sweeps the area:
export type Strip = { from: Contact; to: Contact; distance: number }

// The angle on the pen that the strip covers:
export function getStripWidth({
  from,
  to
}: Pick<Strip, 'from' | 'to'>): number {
  const full = 2 * Math.PI
  return ((to.phi - from.phi) % full + full) % full || full
}

export type Contacts = { sides: Contact[] | null; strips: Strip[] }

// Eight angles around the pen with their cosines and sines, and those of
// their doubles, to find one where f(φ) of getContacts() is far from zero:
const penAngles: {
  cos: number
  sin: number
  cos2: number
  sin2: number
}[] = []

for (let i = 0; i < 8; i++) {
  const phi = i * Math.PI / 4
  penAngles.push({
    cos: Math.cos(phi),
    sin: Math.sin(phi),
    cos2: Math.cos(2 * phi),
    sin2: Math.sin(2 * phi)
  })
}

// Returns the pen with the values at the radius of the stroke, as the half
// axes of its ellipse and its angle in radians, with their first and second
// derivatives along the path. As the product of the width and the aspect, b
// changes with both:
export function createPen(
  { width, aspect, angle }: PenValues,
  radius: number
): Pen {
  const toRadians = Math.PI / 180
  const a = radius * width[0]
  return {
    a,
    b: a * aspect[0],
    angle: angle[0] * toRadians,
    da: radius * width[1],
    db: radius * (width[1] * aspect[0] + width[0] * aspect[1]),
    dda: radius * width[2],
    ddb: (
      radius * (
        width[2] * aspect[0] +
        2 * width[1] * aspect[1] +
        width[0] * aspect[2]
      )
    ),
    dAngle: angle[1] * toRadians,
    ddAngle: angle[2] * toRadians
  }
}

// The axes of the pen's ellipse:
export function getAxes(pen: Pen): [Point, Point] {
  const cos = Math.cos(pen.angle)
  const sin = Math.sin(pen.angle)
  return [new Point(cos, sin), new Point(-sin, cos)]
}

// Returns where the pen at the time on the curve with the values v touches
// the edge
// of the area that it sweeps, with the derivatives of these points
// along the curve's length. On the pen
// p + a cos(φ) e1 + b sin(φ) e2, they lie at the angles φ where its
// motion runs along its edge, the roots of a trigonometric
// quadratic f(φ), which we bracket and refine. Between them, the
// arcs of its edge where f(φ) > 0 move outwards and sweep the
// area, as strips between the paths of their ends. Mostly, there is
// one of them, between the sides of the stroke, and two where the
// pen turns faster than it moves. They are sorted along the
// curve's normal, as are the sides:
export function getContacts(v: CurveValues, t: number, pen: Pen): Contacts {
  const { a, b, da, db, dAngle } = pen
  const contacts: Contacts = { sides: null, strips: [] }
  if (a > 0) {
    const point = getCurvePoint(v, t)
    const tangent = getCurveTangent(v, t)
    const normal = new Point(-tangent.y, tangent.x)
    const curvature = getCurvature(v, t)
    const axes = getAxes(pen)
    // The tangent in the pen's axes, and its changes:
    const t1 = tangent.dot(axes[0])
    const t2 = tangent.dot(axes[1])
    const dt1 = (dAngle - curvature) * t2
    const dt2 = (curvature - dAngle) * t1
    // f(φ) and its derivative by the cosine and sine of φ,
    // which the samples have already:
    const fcs = (c: number, s: number) => (
      t1 * b * c +
      t2 * a * s +
      da * b * c * c +
      a * db * s * s +
      dAngle * (a * a - b * b) * s * c
    )
    const dfcs = (c: number, s: number) => (
      -t1 * b * s +
      t2 * a * c +
      2 * (a * db - da * b) * s * c +
      dAngle *
      (a * a - b * b) *
      (c * c - s * s)
    )
    const f = (phi: number) => fcs(Math.cos(phi), Math.sin(phi))
    const df = (phi: number) => dfcs(Math.cos(phi), Math.sin(phi))
    const roots: Contact[] = []

    // Adds the side at the root φ of f(φ), with the change of φ along the
    // length that keeps it there, for the derivative of its point:
    const addRoot = (phi: number) => {
      const c = Math.cos(phi)
      const s = Math.sin(phi)
      const dfs = (
        (dt1 * b + t1 * db) * c +
        (dt2 * a + t2 * da) * s +
        da * db +
        pen.dda * b * c * c +
        a * pen.ddb * s * s +
        (
          pen.ddAngle * (a * a - b * b) +
          2 * dAngle * (a * da - b * db)
        ) *
        s *
        c
      )
      const dfphi = df(phi)
      const dphi = dfphi ? -dfs / dfphi : 0
      const side: Contact = {
        phi,
        point: point
          .add(axes[0].multiply(a * c))
          .add(axes[1].multiply(b * s)),
        derivative: axes[0]
          .multiply(
            t1 +
            da * c -
            (a * dphi + dAngle * b) * s
          )
          .add(
            axes[1].multiply(
              t2 +
              db * s +
              (b * dphi + dAngle * a) * c
            )
          )
      }
      side.distance = side.point.subtract(point).dot(normal)
      roots.push(side)
    }

    // In cosines and sines of φ and 2φ, f(φ) is
    // k1 cos(φ) + k2 sin(φ) + k3 cos(2φ) + k4 sin(2φ) + k5:
    const k1 = t1 * b
    const k2 = t2 * a
    const k3 = (da * b - a * db) / 2
    const k4 = dAngle * (a * a - b * b) / 2
    const k5 = (da * b + a * db) / 2
    if (isZero(k3) && isZero(k4)) {
      // A pen that keeps its shape, as round ones do, has two roots at equal
      // angles around the one where k1 cos(φ) + k2 sin(φ) peaks, or none
      // where it changes its size faster than it moves:
      const cos = -k5 / Math.hypot(k1, k2)
      if (Math.abs(cos) < 1) {
        const peak = Math.atan2(k2, k1)
        const angle = Math.acos(cos)
        addRoot(peak - angle)
        addRoot(peak + angle)
      }
    } else {
      // With u = tan(ψ / 2), it is a quartic in u over (1 + u²)², which has no
      // root at ψ = π. So we measure ψ from the angle opposite the one where
      // f(φ) is furthest from zero, the quartic's leading coefficient:
      let pole = penAngles[0]
      let value = 0
      for (const angle of penAngles) {
        const v = (
          k1 * angle.cos +
          k2 * angle.sin +
          k3 * angle.cos2 +
          k4 * angle.sin2 +
          k5
        )
        if (Math.abs(v) > Math.abs(value)) {
          pole = angle
          value = v
        }
      }
      const k1r = -k1 * pole.cos - k2 * pole.sin
      const k2r = k1 * pole.sin - k2 * pole.cos
      const k3r = k3 * pole.cos2 + k4 * pole.sin2
      const k4r = -k3 * pole.sin2 + k4 * pole.cos2
      const phis: number[] = []
      const start = Math.atan2(-pole.sin, -pole.cos)
      for (
        let i = 0,
          l = solveQuartic(
            k5 + k3r - k1r,
            2 * k2r - 4 * k4r,
            2 * k5 - 6 * k3r,
            2 * k2r + 4 * k4r,
            k1r + k3r + k5,
            phis
          );
        i < l;
        i++
      ) {
        phis[i] = start + 2 * Math.atan(phis[i])
      }
      phis.sort((phi1, phi2) => phi1 - phi2)
      // Between its roots, f(φ) keeps its sign, so the angles halfway between
      // them bracket each root to refine it, and tell those apart where it
      // only touches zero:
      const middles: number[] = []
      const values: number[] = []
      for (let i = 0, l = phis.length; i < l; i++) {
        const phi = (
          (phis[i] + (i < l - 1 ? phis[i + 1] : phis[0] + 2 * Math.PI)) /
          2
        )
        middles.push(phi)
        values.push(f(phi))
      }
      for (let i = 0, l = phis.length; i < l; i++) {
        const j = i ? i - 1 : l - 1
        const phi0 = i ? middles[j] : middles[j] - 2 * Math.PI
        const f0 = values[j]
        if (f0 * values[i] < 0) {
          const sign = f0 < 0 ? 1 : -1
          addRoot(
            findRoot(
              phi => sign * f(phi),
              phi => sign * df(phi),
              phis[i],
              phi0,
              middles[i],
              32,
              EPSILON
            )
          )
        }
      }
    }
    const count = roots.length
    for (let i = 0; i < count; i++) {
      const from = roots[i]
      const to = roots[(i + 1) % count]
      const phi = from.phi + getStripWidth({ from, to }) / 2
      if (f(phi) > 0) {
        contacts.strips.push({
          from,
          to,
          distance: axes[0]
            .multiply(a * Math.cos(phi))
            .add(axes[1].multiply(b * Math.sin(phi)))
            .dot(normal)
        })
      }
    }
    contacts.strips.sort((a, b) => b.distance - a.distance)
    if (count > 1) {
      roots.sort((a, b) => b.distance - a.distance)
      contacts.sides = [roots[0], roots[count - 1]]
    }
  }
  return contacts
}

// Returns the segments of the pen at the point, with points at the angles
// where the sides of the strips that end and start there touch it, so that
// it meets them there instead of crossing them at shallow angles, as the
// pen's ellipse drawn with points at its axes would. A pen without an area
// has none:
export function getPenSegments(
  point: Point,
  pen: Pen,
  strips?: Strip[]
): SegmentValues[] {
  if (pen.a > 0 && pen.b > 0) {
    const full = 2 * Math.PI
    const angles: number[] = []
    for (const { from, to } of strips ?? []) {
      for (const phi of [from.phi, to.phi]) {
        angles.push((phi % full + full) % full)
      }
    }
    angles.sort((a, b) => a - b)
    if (!angles.length) {
      angles.push(0)
    }
    angles.push(angles[0] + full)
    const segments = getPenArc(point, pen, angles)
    // The last segment lies on the first one, which takes its handle:
    const last = segments.pop()
    if (new Point(segments[0][0]).isClose(last[0], GEOMETRIC_EPSILON)) {
      segments[0][1] = last[1]
    } else {
      segments.push(last)
    }
    return segments
  } else {
    return []
  }
}

// Returns the segments of the arc of the pen at the point that runs through
// the angles, which follow each other in one direction around it:
export function getPenArc(
  point: Point,
  pen: Pen,
  angles: number[]
): SegmentValues[] {
  // The point on the unit circle, which the pen's matrix maps:
  function getPoint(phi: number): Point {
    return new Point(Math.cos(phi), Math.sin(phi))
  }

  const start = getPoint(angles[0])
  const segments: SegmentValues[] = [[[start.x, start.y], [0, 0], [0, 0]]]
  for (let i = 1, l = angles.length; i < l; i++) {
    const phi0 = angles[i - 1]
    const sweep = angles[i] - phi0
    // Arcs of up to 90°, as Path.ellipse() has:
    const count = Math.ceil(Math.abs(sweep) / (Math.PI / 2) - 1e-9)
    const step = sweep / count
    if (Math.abs(sweep) > GEOMETRIC_EPSILON) {
      for (let j = 1; j <= count; j++) {
        const last = segments.at(-1)
        const [first, ...arc] = getArcThrough(
          new Point(last[0]),
          getPoint(phi0 + (j - 0.5) * step),
          getPoint(phi0 + j * step)
        )
        last[2] = first[2]
        segments.push(...arc)
      }
    }
  }
  const matrix = createMatrix()
  translateMatrix(matrix, point.x, point.y)
  rotateMatrix(matrix, pen.angle * 180 / Math.PI)
  scaleMatrix(matrix, pen.a, pen.b)
  return segments.map(([point, handleIn, handleOut]) => {
    const center = new Point(point)
    const { x, y } = transformPoint(matrix, center)
    // Handles are transformed as points, where there are any:
    const transform = (handle: number[]) => {
      if (handle[0] || handle[1]) {
        const to = transformPoint(matrix, center.add(handle))
        return [to.x - x, to.y - y]
      } else {
        return handle
      }
    }
    return [[x, y], transform(handleIn), transform(handleOut)]
  })
}
