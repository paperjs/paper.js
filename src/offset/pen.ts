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
import { EPSILON, GEOMETRIC_EPSILON, findRoot } from '../util/numerical.ts'
import { Matrix } from '../basic/Matrix.ts'
import { Point } from '../basic/Point.ts'
import * as Bezier from '../curve/index.ts'
import type { BezierValues, SegmentValues } from '../curve/index.ts'

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

export type Contacts = { sides: Contact[] | null; strips: Strip[] }

// The angles where the edges of stroke profiles' pens are sampled, with their
// cosines and sines, the same for all pens:
const penSamples: { phi: number; cos: number; sin: number }[] = []

for (let i = 0; i <= 32; i++) {
  const phi = (i + 0.5) * Math.PI / 16
  penSamples.push({ phi, cos: Math.cos(phi), sin: Math.sin(phi) })
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
export function getContacts(v: BezierValues, t: number, pen: Pen): Contacts {
  const { a, b, da, db, dAngle } = pen
  const contacts: Contacts = { sides: null, strips: [] }
  if (a > 0) {
    const point = Bezier.getPoint(v, t)
    const tangent = Bezier.getTangent(v, t)
    const normal = new Point(-tangent.y, tangent.x)
    const curvature = Bezier.getCurvature(v, t)
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
    const ddf = (phi: number) => {
      const c = Math.cos(phi)
      const s = Math.sin(phi)
      return (
        -t1 * b * c -
        t2 * a * s +
        2 * (a * db - da * b) * (c * c - s * s) -
        4 * dAngle * (a * a - b * b) * s * c
      )
    }
    // The root of f between the angles where it changes its
    // sign, by Newton's method from the secant's root:
    const solve = (
      f: (phi: number) => number,
      df: (phi: number) => number,
      phi0: number,
      phi1: number,
      f0: number,
      f1: number
    ) => {
      const sign = f0 < 0 ? 1 : -1
      return findRoot(
        phi => sign * f(phi),
        phi => sign * df(phi),
        (f1 * phi0 - f0 * phi1) / (f1 - f0),
        phi0,
        phi1,
        32,
        EPSILON
      )
    }
    let sample = penSamples[0]
    let phi0 = sample.phi
    let f0 = fcs(sample.cos, sample.sin)
    let d0 = dfcs(sample.cos, sample.sin)
    const roots: Contact[] = []

    // Adds the side at the root of f(φ) between the angles,
    // with the change of φ along the length that keeps it
    // there, for the derivative of its point:
    const addRoot = (
      phi0: number, phi1: number,
      f0: number, f1: number
    ) => {
      const phi = solve(f, df, phi0, phi1, f0, f1)
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

    for (let i = 1, l = penSamples.length; i < l; i++) {
      sample = penSamples[i]
      const phi1 = sample.phi
      const f1 = fcs(sample.cos, sample.sin)
      const d1 = dfcs(sample.cos, sample.sin)
      if (f0 * f1 <= 0 && f0 !== f1) {
        addRoot(phi0, phi1, f0, f1)
      } else if (d0 * d1 < 0) {
        // Two roots close together hide between the
        // samples if the extremum between them crosses:
        const phi = solve(df, ddf, phi0, phi1, d0, d1)
        const f2 = f(phi)
        if (f2 * f0 < 0) {
          addRoot(phi0, phi, f0, f2)
          addRoot(phi, phi1, f2, f1)
        }
      }
      phi0 = phi1
      f0 = f1
      d0 = d1
    }
    const count = roots.length
    for (let i = 0; i < count; i++) {
      const from = roots[i]
      const to = roots[(i + 1) % count]
      const phi = (
        from.phi +
        (
          (
            (to.phi - from.phi + 2 * Math.PI) %
            (2 * Math.PI)
          ) ||
          2 * Math.PI
        ) /
        2
      )
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
  // The point on the unit circle, which the pen's matrix maps:
  function getPoint(phi: number): Point {
    return new Point(Math.cos(phi), Math.sin(phi))
  }

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
    const start = getPoint(angles[0])
    const segments: SegmentValues[] = [[[start.x, start.y], [0, 0], [0, 0]]]
    for (let i = 1, l = angles.length; i < l; i++) {
      const phi0 = angles[i - 1]
      const sweep = angles[i] - phi0
      // Arcs of up to 90°, as Path.ellipse() has:
      const count = Math.ceil(sweep / (Math.PI / 2) - 1e-9)
      const step = sweep / count
      if (sweep > GEOMETRIC_EPSILON) {
        for (let j = 1; j <= count; j++) {
          const last = segments[segments.length - 1]
          const [first, ...arc] = Bezier.getArcThrough(
            new Point(last[0]),
            getPoint(phi0 + (j - 0.5) * step),
            getPoint(phi0 + j * step)
          )
          last[2] = first[2]
          segments.push(...arc)
        }
      }
    }
    // The last segment lies on the first one, which takes its handle:
    const last = segments.pop()
    if (start.isClose(last[0], GEOMETRIC_EPSILON)) {
      segments[0][1] = last[1]
    } else {
      segments.push(last)
    }
    const matrix = new Matrix()
      .translate(point)
      .rotate(pen.angle * 180 / Math.PI)
      .scale(pen.a, pen.b)
    return segments.map(([point, handleIn, handleOut]) => {
      const center = new Point(point)
      const { x, y } = matrix._transformPoint(center)
      // Handles are transformed as points, where there are any:
      const transform = (handle: number[]) => {
        if (handle[0] || handle[1]) {
          const to = matrix._transformPoint(center.add(handle))
          return [to.x - x, to.y - y]
        } else {
          return handle
        }
      }
      return [[x, y], transform(handleIn), transform(handleOut)]
    })
  } else {
    return []
  }
}
