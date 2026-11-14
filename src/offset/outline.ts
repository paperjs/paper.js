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

/*
 * The outlines of strokes, with the offsets of curves after kurbo by Raph
 * Levien and the Linebender contributors, and the areas of tight turns after
 * "Converting Stroked Primitives to Filled Primitives" by Diego Nehab. They
 * work on plain paths, without path items.
 *
 * @author Jan Bösenberg <jan.boesenberg@gmail.com>
 * @author Jürg Lehni <juerg@scratchdisk.com>
 */

import {
  CURVETIME_EPSILON,
  EPSILON,
  GEOMETRIC_EPSILON,
  clamp,
  findRoot,
  findSignChange,
  isZero,
  solveQuadratic
} from '../util/numerical.ts'
import { Line } from '../basic/Line.ts'
import { Matrix } from '../basic/Matrix.ts'
import { Point } from '../basic/Point.ts'
import { Size } from '../basic/Size.ts'
import * as Bezier from '../curve/index.ts'
import type { BezierValues, SegmentValues } from '../curve/index.ts'
import { uniteShapes } from '../boolean/operations.ts'
import { getCurves, getSegments, getValues } from '../boolean/shape.ts'
import type { PathData, SegmentData, ShapeData } from '../boolean/shape.ts'

// The values of the pen of a stroke profile with their first and second
// derivatives along the path:
export type PenValues = { width: number[]; aspect: number[]; angle: number[] }

// The pen of a stroke profile:
type Pen = {
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
type Contact = {
  phi: number
  point: Point
  derivative: Point
  distance?: number
}

// An arc of the pen's edge between two contacts, that sweeps the area:
type Strip = { from: Contact; to: Contact; distance: number }

type Contacts = { sides: Contact[] | null; strips: Strip[] }

// The stretch of a stroke profile between two of its stops, by their offsets:
type Span = { start: number; end: number }

// The pens of a stroke profile: the offsets along the path where they
// change, twice at steps, and their values at any offset with the first and
// second derivatives, on the side after a step or before it:
export type StrokePens = {
  offsets: number[]
  getValues: (offset: number, after: boolean) => PenValues
}

// A path to outline the stroke of, with the pens of its stroke profile:
export type StrokePath = PathData & { pens?: StrokePens }

// A part of a curve, with its offset and length along the path:
type Part = {
  v: number[]
  offset: number
  length: number
  curveLength?: number
}

// The parts of a curve with a stroke profile, with its directions at their
// ends:
type PartEnd = {
  point: Point
  first: Part
  last: Part
  start: Point
  end: Point
}

// A side of the area that a part of a stroke sweeps, as its segments:
type Side = SegmentValues[]

// A point on the evolute of a curve:
type EvolutePoint = {
  point: Point
  derivative: Point
  speed?: number
  radius?: number
}

type CubicPart = {
  t0: number
  t1: number
  utan0: Point
  utan1: Point
  cusp0: number
  cusp1: number
  depth: number
}

const { abs } = Math
const errorThreshold = 0.1
// The angles where the edges of stroke profiles' pens are sampled, with their
// cosines and sines, the same for all pens:
const penSamples: { phi: number; cos: number; sin: number }[] = []

for (let i = 0; i <= 32; i++) {
  const phi = (i + 0.5) * Math.PI / 16
  penSamples.push({ phi, cos: Math.cos(phi), sin: Math.sin(phi) })
}

// The outline of the strokes of the paths, as the union of the areas that
// their parts sweep, their joins and their caps. The curves are split where
// an offset has a cusp, and the parts into areas that each sweep in one
// direction, so that no opposite windings cancel.
export function outlineStroke(
  paths: StrokePath[],
  radius: number,
  join: string,
  cap: string,
  miterLimit: number
): ShapeData {
  // The offsets' error, relative to small radii:
  const tolerance = Math.min(errorThreshold, radius / 100)
  const areas: ShapeData[] = []

  function addArea(segments: SegmentData[]) {
    areas.push({ paths: [{ segments, closed: true }], fillRule: 'nonzero' })
  }

  // Adds the area between two sides of a part. The union at the
  // end resolves each area by its own winding. Strips of stroke profiles
  // are resolved here, to leave out slivers thinner than the tolerance,
  // which only add points so close to the others' that the union can't
  // tell them apart:
  function addSides(side1: Side, side2: Side, isStrip?: boolean) {
    const segments = [...side1]
    for (let i = side2.length - 1; i >= 0; i--) {
      const [point, handleIn, handleOut] = side2[i]
      segments.push([point, handleOut, handleIn])
    }
    if (isStrip) {
      const strip = uniteShapes([
        { paths: [{ segments, closed: true }], fillRule: 'nonzero' }
      ])
      if (!isThin(strip)) {
        areas.push(strip)
      }
    } else {
      addArea(segments)
    }
  }

  // Checks that the part is thin on average, and also where it may taper,
  // looking half the tolerance inside the middle of each curve, on the
  // side that unite() leaves inside. Points that lie that far from the
  // outline, within rounding, are thick:
  function isThin({ paths }: ShapeData): boolean {
    const half = tolerance / 2
    const curves = paths.flatMap(getCurves)
    let area = 0
    let length = 0
    for (const v of curves) {
      area += Bezier.getArea(v)
      length += Bezier.getLength(v)
    }
    return (
      abs(area) <= half * length &&
      !curves.some(v => {
        const inside = Bezier.getPoint(v, 0.5).subtract(
          Bezier.getNormal(v, 0.5).multiply(half)
        )
        let winding = 0
        let distance = Infinity
        for (const other of curves) {
          winding += Bezier.getRayWinding(other, inside)
          distance = Math.min(
            distance,
            inside.getDistance(
              Bezier.getPoint(other, Bezier.getNearestTime(other, inside))
            )
          )
        }
        return winding && distance > half * 0.99
      })
    )
  }

  // Adds the area of the part of the curve with the values v. Where it
  // turns more tightly than the radius, the inner side sweeps backwards
  // beyond the evolute, so we split it there into two areas (Nehab):
  function addPart(v: number[]) {
    const curvature = Bezier.getCurvature(v, 0.5)
    if (abs(curvature) * radius > 1) {
      // The centers of curvature lie against the normals:
      const inner = curvature > 0 ? -radius : radius
      const evolute = getEvolute(v, inner, tolerance)
      addSides(getOffsetSegments(v, -inner, tolerance), evolute)
      addSides(getOffsetSegments(v, inner, tolerance), evolute)
    } else {
      addSides(
        getOffsetSegments(v, radius, tolerance),
        getOffsetSegments(v, -radius, tolerance)
      )
    }
  }

  // Adds a round join or cap as the sector of the circle between the
  // normals, which ends where the sides of the parts do, instead of
  // crossing them at shallow angles as a whole circle would:
  function addSector(
    point: Point,
    normal1: Point,
    normal2: Point,
    direction: Point
  ) {
    addArea([
      [point.x, point.y],
      ...Bezier.getArcThrough(
        point.add(normal1),
        point.add(direction.normalize(radius)),
        point.add(normal2)
      )
    ])
  }

  function addPolygon(points: Point[]) {
    addArea(points.map(({ x, y }) => [x, y]))
  }

  // Adds the join at the point between the directions of the curves,
  // on the outer side of their turn, unless they continue each other:
  function addJoin(point: Point, tangent1: Point, tangent2: Point) {
    // Paper.js's normals, to tell the outer side by their angle:
    let normal1 = new Point(tangent1.y, -tangent1.x).multiply(radius)
    let normal2 = new Point(tangent2.y, -tangent2.x).multiply(radius)
    const angle = normal1.getDirectedAngle(normal2)
    if (!isZero(tangent1.cross(tangent2)) || tangent1.dot(tangent2) < 0) {
      if (angle < 0) {
        normal1 = normal1.negate()
        normal2 = normal2.negate()
      }
      // Widen the join into the parts on both sides, so that it
      // overlaps them rather than sharing edges that the union can't
      // tell apart at small angles. Its arc stays within the
      // tolerance of their offsets there:
      const widening = (
        Math.sqrt(tolerance / radius) *
        180 /
        Math.PI *
        (angle < 0 ? -1 : 1)
      )
      const outer1 = normal1.rotate(-widening)
      const outer2 = normal2.rotate(widening)
      let direction = normal1.add(normal2)
      // Cusps turn back, ahead of the first curve:
      if (direction.length < GEOMETRIC_EPSILON * radius) {
        direction = tangent1
      }
      if (join === 'round') {
        addSector(point, outer1, outer2, direction)
      } else {
        const length = radius / Math.cos(abs(angle) * Math.PI / 360)
        const points = [point, point.add(outer1), point.add(normal1)]
        if (join === 'miter' && length <= miterLimit * radius) {
          points.push(point.add(direction.normalize(length)))
        }
        addPolygon(points.concat(point.add(normal2), point.add(outer2)))
      }
    }
  }

  // Adds the cap at the point, at the end of the path in the direction
  // of the tangent:
  function addCap(point: Point, tangent: Point) {
    const normal = new Point(-tangent.y, tangent.x).multiply(radius)
    if (cap === 'round') {
      addSector(point, normal, normal.negate(), tangent)
    } else if (cap === 'square') {
      const ahead = tangent.multiply(radius)
      addPolygon([
        point.add(normal),
        point.add(normal).add(ahead),
        point.subtract(normal).add(ahead),
        point.subtract(normal)
      ])
    }
  }

  // Tight parts whose normals turn by less than the tolerance at the
  // radius would only add slivers, so they stay with their neighbors,
  // as do parts shorter than it that turn as little. Other parts don't,
  // as they would lose their own sweeps to their neighbors' kind:
  function isSliver(v: number[], t1: number, t2: number): boolean {
    return (
      getTurn(v, t1, t2) * radius < tolerance && (
        abs(Bezier.getCurvature(v, (t1 + t2) / 2)) * radius > 1 ||
        Bezier.getLength(v, t1, t2) < tolerance
      )
    )
  }

  function addPath(path: StrokePath) {
    const { closed } = path
    // Make segments smooth that are so within the tolerance, which
    // moves the curves less than it, as their joins would only add
    // slivers, and their parts' corners lie too close to tell apart:
    const segments = getSegments(path).map(segment => {
      const handleIn = new Point(segment[1])
      const handleOut = new Point(segment[2])
      if (!handleIn.isZero() && !handleOut.isZero()) {
        const angle = (
          abs(handleOut.getDirectedAngle(handleIn.negate())) *
          Math.PI /
          180
        )
        const lengthIn = handleIn.length
        const lengthOut = handleOut.length
        if (
          angle && (
            angle * Math.max(radius, lengthIn, lengthOut) <
            tolerance
          )
        ) {
          const direction = handleOut.normalize().subtract(
            handleIn.normalize()
          )
          const { x: inX, y: inY } = direction.normalize(-lengthIn)
          const { x: outX, y: outY } = direction.normalize(lengthOut)
          return [segment[0], [inX, inY], [outX, outY]] as SegmentValues
        }
      }
      return segment
    })
    const curves = getStrokeCurves(segments, closed)
    const lengths = curves.map(v => Bezier.getLength(v))
    if (!lengths.reduce((sum, length) => sum + length, 0)) {
      // A dot, as a circle or a square, as caps only apply to open
      // paths:
      if (segments.length && !closed && cap !== 'butt') {
        const center = new Point(segments[0][0])
        if (cap === 'round') {
          addArea(Bezier.getEllipse(center, new Size(radius, radius)))
        } else {
          const { x: left, y: top } = center.subtract(radius)
          const right = left + 2 * radius
          const bottom = top + 2 * radius
          addArea([[left, top], [right, top], [right, bottom], [left, bottom]])
        }
      }
    } else {
      // The curves with their directions at their ends, as their
      // parts use them, which the joins and caps continue:
      const ends: { curve: BezierValues; start: Point; end: Point }[] = []
      for (let i = 0, l = curves.length; i < l; i++) {
        const curve = curves[i]
        if (lengths[i] > GEOMETRIC_EPSILON) {
          const v = regularize(curve, tolerance / 4)
          const reversals = Bezier.getReversals(v, tolerance)
          let start = Bezier.getTangent(v, 0)
          let end = Bezier.getTangent(v, 1)
          if (reversals.length) {
            // A curve along a line that reverses along it:
            // straight parts between the reversals, joined
            // round, as the limit of a tight turn (kurbo's
            // do_linear()):
            const points = [new Point(v[0], v[1])]
            for (let j = 0, m = reversals.length; j < m; j++) {
              points.push(Bezier.getPoint(v, reversals[j]))
            }
            points.push(new Point(v[6], v[7]))
            start = points[1].subtract(points[0]).normalize()
            end = points[points.length - 1].subtract(
              points[points.length - 2]
            ).normalize()
            for (let j = 1, m = points.length; j < m; j++) {
              const p1 = points[j - 1]
              const p2 = points[j]
              addPart([p1.x, p1.y, p1.x, p1.y, p2.x, p2.y, p2.x, p2.y])
              if (j < m - 1) {
                // The turn sweeps a whole circle, ahead of
                // it and behind, in two halves that end
                // at the parts' sides:
                const tangent = p2.subtract(p1).normalize()
                const normal = new Point(-tangent.y, tangent.x).multiply(
                  radius
                )
                addSector(p2, normal, normal.negate(), tangent)
                addSector(p2, normal.negate(), normal, tangent.negate())
              }
            }
          } else {
            const times = getCuspTimes(v, radius).concat(1)
            for (let j = 0, t0 = 0, m = times.length; j < m; j++) {
              const t = times[j]
              if (
                t === 1 || (
                  !isSliver(v, t0, t) &&
                  !isSliver(v, t, times[j + 1])
                )
              ) {
                addPart(Bezier.getPart(v, t0, t))
                t0 = t
              }
            }
          }
          ends.push({ curve, start, end })
        }
      }
      for (let i = 1, l = ends.length; i <= l; i++) {
        const end1 = ends[i - 1]
        const end2 = ends[i % l]
        if (i < l || closed) {
          addJoin(getStart(end2.curve), end1.end, end2.start)
        }
      }
      if (!closed && ends.length) {
        const first = ends[0]
        const last = ends[ends.length - 1]
        addCap(getStart(first.curve), first.start.negate())
        addCap(getEnd(last.curve), last.end)
      }
    }
  }

  // Adds the area that the pens of the path's stroke profile sweep: the
  // ellipses that change along curves between the stops, see
  // Path#strokeProfile. The sides of the stroke lie where the moving pen
  // touches the edge of the area, which we find exactly at each time on
  // the curves, and fit with cubics. Where the pens change abruptly or
  // the sides end, at stops, steps, corners and reversals, we add the
  // pens there as they are, as each lies within the area.
  function addProfilePath(path: StrokePath) {
    const { closed } = path
    const { offsets, getValues: getPenValues } = path.pens
    const segments = getSegments(path)
    const curves = getStrokeCurves(segments, closed)
    const lengths = curves.map(v => Bezier.getLength(v))
    const length = lengths.reduce((sum, length) => sum + length, 0)
    const spans: Span[] = []
    const ends: PartEnd[] = []
    const allParts: Part[] = []

    // The pen at the offset, as the half axes of its ellipse and its
    // angle in radians, with their first and second derivatives along
    // the path. Where a step lies at the offset, `after` picks the side
    // after it. As the product of the width and the aspect, b changes
    // with both:
    function getPen(offset: number, after: boolean): Pen {
      const { width, aspect, angle } = getPenValues(offset, after)
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

    // The pen of the span at the offset within it, also where rounding
    // took the offset beyond its ends, and onto the other side of a
    // step there:
    function getSpanPen(span: Span, offset: number): Pen {
      const { end } = span
      return offset < end
        ? getPen(Math.max(offset, span.start), true)
        : getPen(end, false)
    }

    // The offset along the path at the time on the part. Regularizing
    // can make its curve a little longer or shorter than the part is
    // along the path, so we scale its lengths, and the parts meet at
    // the same offsets, with the same pens:
    function getOffset(part: Part, t: number): number {
      return (
        part.offset +
        part.length *
        Bezier.getLength(part.v, 0, t) /
        part.curveLength
      )
    }

    // The time on the part at the offset along the path, the inverse
    // of getOffset():
    function getTime(part: Part, offset: number): number {
      const start = part.offset
      return offset <= start
        ? 0
        : offset >= start + part.length
          ? 1
          : Bezier.getTimeAt(
              part.v,
              (offset - start) *
              part.curveLength /
              part.length
            )
    }

    // The span at the offset, or the one before it where they meet.
    // Before the start of closed paths lies their end:
    function getSpan(offset: number, after?: boolean): Span {
      if (closed && !after && !offset) {
        offset = length
      }
      for (let i = 0, l = spans.length; i < l; i++) {
        const span = spans[i]
        if (after ? offset < span.end : offset <= span.end) return span
      }
      return spans[spans.length - 1]
    }

    // Adds the pen at the point, with points at the angles where the
    // sides of the strips that end and start there touch it, so that
    // it meets them there instead of crossing them at shallow angles,
    // as the pen's ellipse drawn with points at its axes would:
    function addPen(point: Point, pen: Pen, strips?: Strip[]) {
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
        addArea(
          segments.map(([point, handleIn, handleOut]) => {
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
        )
      }
    }

    // The axes of the pen's ellipse:
    function getAxes(pen: Pen): [Point, Point] {
      const cos = Math.cos(pen.angle)
      const sin = Math.sin(pen.angle)
      return [new Point(cos, sin), new Point(-sin, cos)]
    }

    // Returns where the pen at the time on the curve touches the edge
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
    function getContacts(part: Part, t: number, span: Span): Contacts {
      const { v } = part
      const pen = getSpanPen(span, getOffset(part, t))
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

    function getSides(part: Part, t: number, span: Span): Contact[] | null {
      return getContacts(part, t, span).sides
    }

    // Adds the area that the pen sweeps along the curve from ta to tb,
    // within the span, as strips between the paths of the points where
    // it touches the edge of the area, see getContacts(). We split them
    // where these points appear or vanish, where two strips trade
    // places, and where a strip folds over as one of its ends turns
    // back across it. The pens at the first two lie within the area and
    // cover the ends of the strips there. Strips that fold over sweep
    // beyond their inner edge, so we split them into two areas at the
    // points that stand still across them, as with the evolute in
    // addPart() (Nehab):
    function addPiece(part: Part, span: Span, ta: number, tb: number) {
      // As the points that touch the edge move around the pen
      // as it and the curve turn, sample them at least every 10°:
      const { v } = part
      const turn = (
        abs(
          getSpanPen(span, getOffset(part, tb)).angle -
          getSpanPen(span, getOffset(part, ta)).angle
        ) +
        getTurn(v, ta, tb)
      )
      const count = Math.max(16, Math.ceil(turn * 18 / Math.PI))
      // The times where the parts end and the next ones start:
      const splits = [[ta, ta], [tb, tb]]
      const cache: Record<number, Strip[]> = {}

      // Fitting asks for the same times for each end of a strip:
      function getStrips(t: number): Strip[] {
        return (cache[t] ??= getContacts(part, t, span).strips)
      }

      // The point at the end of the strip at the time, or the curve's
      // point where a change between the samples took the strip away,
      // which lies within the pen too:
      function getEnd(t: number, j: number, end: 'from' | 'to'): Point {
        const strip = getStrips(t)[j]
        return strip ? strip[end].point : Bezier.getPoint(v, t)
      }

      // The motions of the strip's ends across the line between them:
      function getMotions(strip: Strip): [number, number] {
        const vector = strip.to.point.subtract(strip.from.point)
        const normal = new Point(-vector.y, vector.x)
        return [
          strip.from.derivative.dot(normal),
          strip.to.derivative.dot(normal)
        ]
      }

      // Whether the fitted side moves away from where it starts by
      // more than the tolerance, with the handles that bound it:
      function isMoving(side: Side): boolean {
        const point = new Point(side[0][0])
        return side.some(
          ([other, handleIn, handleOut]) => (
            point.getDistance(other) > tolerance ||
            point.getDistance(new Point(other).add(handleIn)) > tolerance ||
            point.getDistance(new Point(other).add(handleOut)) > tolerance
          )
        )
      }

      // Whether the strips are the same ones as before, in the same
      // order, by the angles on the pen where they start:
      function isSame(strips: Strip[], before: Strip[]): boolean {
        if (strips.length !== before.length) return false
        for (let i = 0, l = strips.length; i < l; i++) {
          const { phi } = strips[i].from
          for (let j = 0; j < l; j++) {
            if (
              j !== i && (
                getAngle(phi, before[j].from.phi) <
                getAngle(phi, before[i].from.phi)
              )
            )
              return false
          }
        }
        return true
      }

      function getAngle(phi1: number, phi2: number): number {
        const angle = Math.abs(phi1 - phi2) % (2 * Math.PI)
        return Math.min(angle, 2 * Math.PI - angle)
      }

      // Whether the ends of the same strips moved less than 20° on
      // the pen, as they jump where pairs of them appear and vanish
      // again between the samples, and less than half the width of
      // narrow strips, which can do so without moving that far:
      function isClose(strips: Strip[], before: Strip[]): boolean {
        return strips.every((strip, i) => {
          const other = before[i]
          const limit = Math.min(
            0.35,
            Math.max(getWidth(strip), getWidth(other)) / 2
          )
          return (
            getAngle(strip.from.phi, other.from.phi) < limit &&
            getAngle(strip.to.phi, other.to.phi) < limit
          )
        })
      }

      // The angle on the pen that the strip covers:
      function getWidth(strip: Strip): number {
        const full = 2 * Math.PI
        return ((strip.to.phi - strip.from.phi) % full + full) % full || full
      }

      // Sample the strips evenly, and where the curve's curvature
      // peaks or changes sign, as the strips fold over around there:
      const samples: number[] = []
      for (let i = 0; i < count; i++) {
        samples.push(ta + (tb - ta) * i / count)
      }
      // Exactly at the end, as rounding could take it beyond:
      samples.push(tb)
      for (const t of getCurvatureExtrema(v).concat(getInflections(v))) {
        if (t > ta && t < tb) {
          samples.push(t)
        }
      }
      samples.sort((a, b) => a - b)
      let t0 = ta
      let s0 = getStrips(ta)
      for (let i = 1; i < samples.length; i++) {
        const t1 = samples[i]
        const s1 = getStrips(t1)
        if (
          isSame(s1, s0) &&
          !isClose(s1, s0) &&
          t1 - t0 > CURVETIME_EPSILON
        ) {
          // Sample halfway before going on:
          samples.splice(i--, 0, (t0 + t1) / 2)
          continue
        }
        // There may be more than one change between the samples:
        while (!isSame(s1, s0)) {
          let t = t0
          let u = t1
          for (let j = 0; j < 40; j++) {
            const middle = (t + u) / 2
            if (isSame(getStrips(middle), s0)) {
              t = middle
            } else {
              u = middle
            }
          }
          splits.push([t, u])
          addPen(
            Bezier.getPoint(v, t),
            getSpanPen(span, getOffset(part, t)),
            getStrips(t).concat(getStrips(u))
          )
          t0 = u
          s0 = getStrips(u)
        }
        for (let j = 0, l = s0.length; j < l; j++) {
          const m0 = getMotions(s0[j])
          const m1 = getMotions(s1[j])
          for (let k = 0; k < 2; k++) {
            if (m0[k] * m1[k] < 0) {
              const t = findSignChange(
                t => {
                  const strip = getStrips(t)[j]
                  return strip ? getMotions(strip)[k] : 0
                },
                t0,
                t1,
                m0[k],
                m1[k],
                1e-9
              )
              splits.push([t, t])
            }
          }
        }
        t0 = t1
        s0 = s1
      }
      splits.sort((a, b) => a[0] - b[0])
      for (let i = 1, l = splits.length; i < l; i++) {
        const t0 = splits[i - 1][1]
        const t1 = splits[i][0]
        const strips =
          t1 - t0 > GEOMETRIC_EPSILON ? getStrips((t0 + t1) / 2) : []
        for (let j = 0, m = strips.length; j < m; j++) {
          const motions = getMotions(strips[j])
          const from = fitSide(t => getEnd(t, j, 'from'), t0, t1)
          const to = fitSide(t => getEnd(t, j, 'to'), t0, t1)
          // Strips whose ends stand still sweep nothing, and the
          // points that stand still across them are only noise:
          if (
            motions[0] * motions[1] < 0 &&
            (isMoving(from) || isMoving(to))
          ) {
            const still = fitSide(
              t => {
                const strip = getStrips(t)[j]
                if (!strip) return Bezier.getPoint(v, t)
                const motions = getMotions(strip)
                const { point } = strip.from
                // Within the strip, also where its motions
                // vary more than the samples tell:
                const factor = clamp(
                  motions[0] /
                  (motions[0] - motions[1]),
                  0,
                  1
                )
                return point.add(
                  strip.to.point.subtract(point).multiply(factor)
                )
              },
              t0,
              t1
            )
            addSides(from, still, true)
            addSides(to, still, true)
          } else {
            addSides(from, to, true)
          }
        }
      }
    }

    // Adds the part of a curve, split at the spans that it crosses:
    function addPart(part: Part) {
      const start = part.offset
      const end = start + part.length
      // Measured once, for getOffset() and getTime():
      part.curveLength = Bezier.getLength(part.v)
      for (let i = 0, l = spans.length; i < l; i++) {
        const span = spans[i]
        const from = Math.max(span.start, start)
        const to = Math.min(span.end, end)
        const ta = getTime(part, from)
        const tb = getTime(part, to)
        if (to > from && tb > ta) {
          addPiece(part, span, ta, tb)
        }
      }
    }

    // Fits cubics to the points that the function returns from t0 to
    // t1, with the directions at their ends, by least squares, and
    // subdivided while they are off by more than the tolerance:
    function fitSide(
      evaluate: (t: number) => Point,
      t0: number,
      t1: number
    ): Side {
      const count = 8
      const start = evaluate(t0)
      const side = createSide(start)

      function fit(
        t0: number, t1: number,
        p0: Point, p3: Point,
        depth: number
      ) {
        const delta = (t1 - t0) * 1e-5
        const chord = p3.subtract(p0)
        let tangent0 = evaluate(t0 + delta).subtract(p0)
        let tangent3 = p3.subtract(evaluate(t1 - delta))
        const points: Point[] = []
        const times: number[] = []
        let total = 0
        let gap = 0
        let index: number
        tangent0 = (tangent0.isZero() ? chord : tangent0).normalize()
        tangent3 = (tangent3.isZero() ? chord : tangent3).normalize()
        let prev = p0
        for (let i = 0; i <= count; i++) {
          const point =
            i < count
              ? evaluate(
                  t0 + (
                    (t1 - t0) *
                    (i + 1) /
                    (count + 1)
                  )
                )
              : p3
          const distance = point.getDistance(prev)
          total += distance
          if (distance > gap) {
            gap = distance
            index = i
          }
          if (i < count) {
            points.push(point)
            times.push(total)
          }
          prev = point
        }
        // The points lie at the times on the cubic by their
        // distances along the chords at first, refined to their
        // nearest times on it while it is off (Schneider):
        for (let i = 0; i < count; i++) {
          times[i] = total ? times[i] / total : 0
        }
        const { length } = chord
        let handle1: Point
        let handle2: Point
        let c: number[]
        let error: number
        for (let iteration = 0; iteration < 4; iteration++) {
          // The handles' lengths with the least squares error
          // at the points:
          let c11 = 0
          let c12 = 0
          let c22 = 0
          let x1 = 0
          let x2 = 0
          for (let i = 0; i < count; i++) {
            const u = times[i]
            const w = 1 - u
            const a1 = tangent0.multiply(3 * w * w * u)
            const a2 = tangent3.multiply(-3 * w * u * u)
            const rest = points[i]
              .subtract(p0.multiply(w * w * (w + 3 * u)))
              .subtract(p3.multiply(u * u * (u + 3 * w)))
            c11 += a1.dot(a1)
            c12 += a1.dot(a2)
            c22 += a2.dot(a2)
            x1 += a1.dot(rest)
            x2 += a2.dot(rest)
          }
          const det = c11 * c22 - c12 * c12
          let alpha = det ? (x1 * c22 - x2 * c12) / det : 0
          let beta = det ? (c11 * x2 - c12 * x1) / det : 0
          if (!(
            alpha > EPSILON &&
            beta > EPSILON &&
            alpha < 2 * total &&
            beta < 2 * total
          )) {
            alpha = beta = length / 3
          }
          handle1 = tangent0.multiply(alpha)
          handle2 = tangent3.multiply(-beta)
          c = [
            p0.x,
            p0.y,
            p0.x + handle1.x,
            p0.y + handle1.y,
            p3.x + handle2.x,
            p3.y + handle2.y,
            p3.x,
            p3.y
          ]
          error = 0
          for (let i = 0; i < count; i++) {
            const time = Bezier.getNearestTime(c, points[i])
            error = Math.max(
              error,
              points[i].getDistance(Bezier.getPoint(c, time))
            )
            times[i] = time
          }
          if (error <= tolerance) break
        }
        // Measure the error halfway between the points too, where
        // the cubic may bulge away from the side:
        for (let i = 0; i <= count; i++) {
          const point = evaluate(
            t0 + (
              (t1 - t0) *
              (i + 0.5) /
              (count + 1)
            )
          )
          error = Math.max(
            error,
            point.getDistance(
              Bezier.getPoint(c, Bezier.getNearestTime(c, point))
            )
          )
        }
        // Where the points pass most of the way between two of
        // them, the side moves faster than they tell, and the
        // cubic may swing away from the line between them:
        if (gap > Math.max(total / 2, tolerance)) {
          const from = index ? points[index - 1] : p0
          const to = index < count ? points[index] : p3
          const point = Bezier.getPoint(
            c,
            (
              (index ? times[index - 1] : 0) +
              (index < count ? times[index] : 1)
            ) /
            2
          )
          error = Math.max(
            error,
            Line.getDistance(from.x, from.y, to.x, to.y, point.x, point.y)
          )
        }
        if (error > tolerance && depth < 12) {
          const t = (t0 + t1) / 2
          const point = evaluate(t)
          fit(t0, t, p0, point, depth + 1)
          fit(t, t1, point, p3, depth + 1)
        } else {
          addCurve(side, handle1, p3, handle2)
        }
      }

      fit(t0, t1, start, evaluate(t1), 0)
      return side
    }

    // Adds the join at the point between the curves at their ends, on
    // the outer side of their turn, unless they continue each other.
    // Round joins are the pen, the others connect its sides there:
    function addJoin(end1: PartEnd, end2: PartEnd) {
      const { point } = end2
      const part1 = end1.last
      const part2 = end2.first
      const { offset } = part2
      const tangent1 = end1.end
      const tangent2 = end2.start
      const cross = tangent1.cross(tangent2)
      const span = getSpan(offset, true)
      const pen = getSpanPen(span, offset)
      // Where the curves continue each other, their parts meet in
      // the same points, and need no join:
      if (!isZero(cross) || tangent1.dot(tangent2) < 0) {
        if (join === 'round') {
          addPen(
            point,
            pen,
            getContacts(part1, 1, getSpan(offset, false)).strips.concat(
              getContacts(part2, 0, span).strips
            )
          )
        } else {
          const span1 = getSpan(offset, false)
          // The side against the turn, see getSides():
          const k = cross > 0 ? 1 : 0
          const sides1 = getSides(part1, 1, span1)
          const sides2 = getSides(part2, 0, span)
          if (sides1 && sides2) {
            // Widen the join into the parts on both sides, as
            // in addJoin() above, by turning the sides' points
            // around their pens, back along the first side and
            // ahead along the second:
            const widening = Math.sqrt(tolerance / radius)
            const widen = (side: Contact, pen: Pen, direction: number) => {
              const axes = getAxes(pen)
              const c = Math.cos(side.phi)
              const s = Math.sin(side.phi)
              const along = axes[0]
                .multiply(-pen.a * s)
                .add(axes[1].multiply(pen.b * c))
                .dot(side.derivative)
              const phi = (
                side.phi + (
                  widening *
                  (along > 0 ? direction : -direction)
                )
              )
              return side.point
                .add(axes[0].multiply(pen.a * (Math.cos(phi) - c)))
                .add(axes[1].multiply(pen.b * (Math.sin(phi) - s)))
            }
            const side1 = sides1[k].point
            const side2 = sides2[k].point
            const direction1 = sides1[k].derivative.normalize()
            const direction2 = sides2[k].derivative.normalize()
            // From the inner sides, as the ends of the
            // parts only run through the point where the
            // pen doesn't change. All lie on the pen:
            const points = [
              sides1[1 - k].point,
              widen(
                sides1[k],
                getSpanPen(span1, part1.offset + part1.length),
                -1
              ),
              side1
            ]
            if (join === 'miter') {
              const miter = Line.intersect(
                side1.x, side1.y,
                direction1.x, direction1.y,
                side2.x, side2.y,
                direction2.x, direction2.y,
                true, true
              )
              if (
                miter && (
                  miter.getDistance(point) <=
                  miterLimit * pen.a
                )
              ) {
                points.push(miter)
              }
            }
            addPolygon(
              points.concat(
                side2,
                widen(sides2[k], pen, 1),
                sides2[1 - k].point
              )
            )
          }
        }
      }
    }

    // Adds the cap at the end of the part at the time, in the
    // direction of the tangent. Round caps are the pen, square ones
    // extend its sides as far as it reaches ahead:
    function addCap(part: Part, t: number, tangent: Point) {
      const offset = part.offset + (t ? part.length : 0)
      const span = getSpan(offset, !t)
      const pen = getSpanPen(span, offset)
      if (cap === 'round') {
        addPen(
          Bezier.getPoint(part.v, t),
          pen,
          getContacts(part, t, span).strips
        )
      } else if (cap === 'square') {
        const sides = getSides(part, t, span)
        if (sides) {
          const axes = getAxes(pen)
          const reach = new Point(
            pen.a * tangent.dot(axes[0]),
            pen.b * tangent.dot(axes[1])
          ).length
          const ahead = tangent.multiply(reach)
          const side0 = sides[0].point
          const side1 = sides[1].point
          addPolygon([side0, side0.add(ahead), side1.add(ahead), side1])
        }
      }
    }

    if (!length) {
      // A dot, as the pen or the square around it, as caps only
      // apply to open paths:
      if (segments.length && !closed && cap !== 'butt') {
        const center = new Point(segments[0][0])
        const pen = getPen(0, true)
        const axes = getAxes(pen)
        if (cap === 'round') {
          addPen(center, pen)
        } else {
          const x = axes[0].multiply(pen.a)
          const y = axes[1].multiply(pen.b)
          addPolygon([
            center.subtract(x).subtract(y),
            center.add(x).subtract(y),
            center.add(x).add(y),
            center.subtract(x).add(y)
          ])
        }
      }
    } else {
      for (let i = 1, l = offsets.length; i < l; i++) {
        if (offsets[i] > offsets[i - 1]) {
          spans.push({ start: offsets[i - 1], end: offsets[i] })
        }
      }
      for (let i = 0, offset = 0, l = curves.length; i < l; i++) {
        const curve = curves[i]
        const curveLength = lengths[i]
        if (curveLength > GEOMETRIC_EPSILON) {
          const v = regularize(curve, tolerance / 4)
          const reversals = Bezier.getReversals(v, tolerance)
          const parts: Part[] = []
          if (reversals.length) {
            // A curve along a line that reverses along it:
            // straight parts between the reversals, as in
            // addPath(), where the pen turns as it is:
            const points = [new Point(v[0], v[1])]
            for (let j = 0, m = reversals.length; j < m; j++) {
              points.push(Bezier.getPoint(v, reversals[j]))
            }
            points.push(new Point(v[6], v[7]))
            for (let j = 1, start = offset, m = points.length; j < m; j++) {
              const p1 = points[j - 1]
              const p2 = points[j]
              const third = p2.subtract(p1).divide(3)
              const distance = p1.getDistance(p2)
              parts.push({
                v: [
                  p1.x,
                  p1.y,
                  p1.x + third.x,
                  p1.y + third.y,
                  p2.x - third.x,
                  p2.y - third.y,
                  p2.x,
                  p2.y
                ],
                offset: start,
                length: distance
              })
              start += distance
            }
          } else {
            parts.push({
              v: regularizeCusp(v, tolerance / 4),
              offset,
              length: curveLength
            })
          }
          parts.forEach(addPart)
          // The straight parts reverse where they meet, and the
          // pen turns around there:
          for (let j = 1, m = parts.length; j < m; j++) {
            const part = parts[j]
            const start = part.offset
            const span = getSpan(start)
            addPen(
              new Point(part.v[0], part.v[1]),
              getSpanPen(span, start),
              getContacts(parts[j - 1], 1, span).strips.concat(
                getContacts(part, 0, span).strips
              )
            )
          }
          allParts.push(...parts)
          const first = parts[0]
          const last = parts[parts.length - 1]
          ends.push({
            point: getStart(curve),
            first,
            last,
            start: Bezier.getTangent(first.v, 0),
            end: Bezier.getTangent(last.v, 1)
          })
        }
        offset += curveLength
      }
      // The pens where the spans meet and the pen changes abruptly,
      // as the sides jump there, except at steps, which end the parts
      // straight across, as butt caps do. Where the pen changes
      // smoothly, the parts meet in the same points:
      for (let i = 0, l = offsets.length; i < l; i++) {
        const offset = offsets[i]
        const isStep = (
          i > 0 && offsets[i - 1] === offset ||
          i < l - 1 && offsets[i + 1] === offset
        )
        if (
          !isStep &&
          (closed ? offset < length : offset > 0 && offset < length)
        ) {
          const pen = getPen(offset, true)
          const before = getPen(offset, false)
          // About how far the sides jump, by the pen's size.
          // Where values change in straight lines through
          // the stop, the rates on both sides only differ by
          // rounding:
          const size = Math.max(pen.a, pen.b)
          const jump = (
            size * (
              Math.abs(pen.da - before.da) +
              Math.abs(pen.db - before.db) +
              size * Math.abs(pen.dAngle - before.dAngle)
            )
          )
          if (jump > GEOMETRIC_EPSILON) {
            // The part that the stop lies on, and the one
            // before it where the stop starts it:
            let j = 0
            while (allParts[j].offset + allParts[j].length <= offset) {
              j++
            }
            const part = allParts[j]
            const t = getTime(part, offset)
            const previous = t
              ? part
              : allParts[j - 1] ?? allParts[allParts.length - 1]
            addPen(
              Bezier.getPoint(part.v, t),
              pen,
              getContacts(
                previous,
                t || 1,
                getSpan(offset, false)
              ).strips.concat(
                getContacts(part, t, getSpan(offset, true)).strips
              )
            )
          }
        }
      }
      for (let i = 1, l = ends.length; i <= l; i++) {
        if (i < l || closed) {
          addJoin(ends[i - 1], ends[i % l])
        }
      }
      if (!closed && ends.length) {
        const first = ends[0]
        const last = ends[ends.length - 1]
        addCap(first.first, 0, first.start.negate())
        addCap(last.last, 1, last.end)
      }
    }
  }

  for (let i = 0, l = paths.length; i < l; i++) {
    const path = paths[i]
    if (path.pens) {
      addProfilePath(path)
    } else {
      addPath(path)
    }
  }
  return areas.length ? uniteShapes(areas) : { paths: [], fillRule: 'nonzero' }
}

// Returns the values of the curves of the stroke between the segments:
function getStrokeCurves(segments: SegmentValues[], closed: boolean) {
  const curves: BezierValues[] = []
  const { length } = segments
  for (let i = 0, l = length - (closed ? 0 : 1); i < l; i++) {
    curves.push(getValues(segments[i], segments[(i + 1) % length]))
  }
  return curves
}

function getStart(v: BezierValues): Point {
  return new Point(v[0], v[1])
}

function getEnd(v: BezierValues): Point {
  return new Point(v[6], v[7])
}

// Returns the angle in radians by which the tangent of the curve with the
// values v turns from t1 to t2, in total across its inflections:
function getTurn(v: number[], t1: number, t2: number): number {
  const times = [t1].concat(
    getInflections(v).filter(t => t > t1 && t < t2),
    t2
  )
  let turn = 0
  for (let i = 1, l = times.length; i < l; i++) {
    turn += abs(
      Bezier.getTangent(v, times[i - 1]).getDirectedAngle(
        Bezier.getTangent(v, times[i])
      )
    )
  }
  return turn * Math.PI / 180
}

// Returns the times where the offsets on either side of the curve have a
// cusp, where its radius of curvature equals the radius. Between the
// extrema and the inflections of the curvature, its magnitude changes
// monotonically, so each of these intervals holds at most one:
function getCuspTimes(v: number[], radius: number): number[] {
  const times = getCurvatureExtrema(v)
    .concat(getInflections(v), 0, 1)
    .sort((a, b) => a - b)
  const cusps: number[] = []

  function f(t: number): number {
    const curvature = Bezier.getCurvature(v, t) * radius
    return 1 - curvature * curvature
  }

  for (let i = 1, l = times.length; i < l; i++) {
    const t0 = times[i - 1]
    const t1 = times[i]
    const f0 = f(t0)
    const f1 = f(t1)
    if (f0 * f1 < 0) {
      cusps.push(findSignChange(f, t0, t1, f0, f1, EPSILON))
    }
  }
  return cusps
}

// Returns the center of curvature of the curve with the values v at t, its
// derivative, and the numerator of its speed, which is zero where the
// curvature has its extrema. With the derivatives d1, d2, d3 of the curve,
// the center lies at p + perp(d1) * |d1|² / (d1 × d2), and moves along
// perp(d1):
function getEvoluteAt(v: number[], t: number): EvolutePoint {
  const x0 = v[0]
  const y0 = v[1]
  const cx = 3 * (v[2] - x0)
  const cy = 3 * (v[3] - y0)
  const bx = 3 * (v[4] - v[2]) - cx
  const by = 3 * (v[5] - v[3]) - cy
  const ax = v[6] - x0 - cx - bx
  const ay = v[7] - y0 - cy - by
  const dx = (3 * ax * t + 2 * bx) * t + cx
  const dy = (3 * ay * t + 2 * by) * t + cy
  const ddx = 6 * ax * t + 2 * bx
  const ddy = 6 * ay * t + 2 * by
  const cross = dx * ddy - dy * ddx
  const length2 = dx * dx + dy * dy
  const speed = (
    3 * (dx * ddx + dy * ddy) * cross -
    length2 * (dx * 6 * ay - dy * 6 * ax)
  )
  const perp = new Point(-dy, dx)
  return {
    point: Bezier.getPoint(v, t).add(perp.multiply(length2 / cross)),
    derivative: perp.multiply(speed / (cross * cross)),
    speed,
    // The signed radius of curvature, along perp(d1):
    radius: length2 * Math.sqrt(length2) / cross
  }
}

// Returns the times where the curvature of the curve has its extrema:
function getCurvatureExtrema(v: number[]): number[] {
  const count = 32
  const times: number[] = []

  function f(t: number): number {
    return getEvoluteAt(v, t).speed
  }

  for (let i = 1, f0 = f(0); i <= count; i++) {
    const t0 = (i - 1) / count
    const t1 = i / count
    const f1 = f(t1)
    if (f0 * f1 < 0) {
      times.push(findSignChange(f, t0, t1, f0, f1, EPSILON))
    }
    f0 = f1
  }
  return times
}

// Returns a side that starts at the point, to add its curves to:
function createSide(point: Point): Side {
  return [[[point.x, point.y], [0, 0], [0, 0]]]
}

// Adds the curve with the given handles to the point to the side:
function addCurve(side: Side, handle1: Point, point: Point, handle2: Point) {
  side[side.length - 1][2] = [handle1.x, handle1.y]
  side.push([[point.x, point.y], [handle2.x, handle2.y], [0, 0]])
}

// Returns the segments of the evolute of the curve with the values v, the
// curve of its centers of curvature, fitted with cubic Hermite curves
// between its cusps. Where the centers lie beyond the inner offset, or on
// the other side, the inner side doesn't sweep backwards, and the evolute
// follows the inner offset instead:
function getEvolute(v: number[], inner: number, tolerance: number): Side {
  const c = regularizeCusp(v, tolerance / 4)
  const times = getCurvatureExtrema(c).concat(1)
  let t0 = 0
  let e0 = evaluate(0)
  const side = createSide(e0.point)

  function evaluate(t: number): EvolutePoint {
    let e = getEvoluteAt(c, t)
    // Paper.js's normals point against perp(d1):
    const distance = inner > 0 ? -e.radius : e.radius
    // Also where the radius is undefined, at zero derivatives, and
    // where it lies within the tolerance of the inner offset, so that
    // both meet exactly at the ends of the tight parts:
    if (!(distance >= 0 && distance < abs(inner) - tolerance)) {
      const derivative = Bezier.getWeightedTangent(c, t)
      e = {
        point: Bezier.getPoint(c, t).add(
          Bezier.getNormal(c, t).multiply(inner)
        ),
        derivative: derivative.multiply(
          1 + inner * Bezier.getCurvature(c, t)
        )
      }
    }
    return e
  }

  function fit(
    t0: number, e0: EvolutePoint,
    t1: number, e1: EvolutePoint,
    depth: number
  ) {
    const tm = (t0 + t1) / 2
    const em = evaluate(tm)
    const h0 = e0.derivative.multiply((t1 - t0) / 3)
    const h1 = e1.derivative.multiply((t0 - t1) / 3)
    const mid = e0.point
      .add(e1.point)
      .multiply(0.5)
      .add(h0.add(h1).multiply(3 / 8))
    if (depth < 8 && mid.getDistance(em.point) > tolerance / 10) {
      fit(t0, e0, tm, em, depth + 1)
      fit(tm, em, t1, e1, depth + 1)
    } else {
      addCurve(side, h0, e1.point, h1)
    }
  }

  for (let i = 0, l = times.length; i < l; i++) {
    const e1 = evaluate(times[i])
    fit(t0, e0, times[i], e1, 0)
    t0 = times[i]
    e0 = e1
  }
  return side
}

// Returns the segments of the offset of the curve with the values v:
function getOffsetSegments(
  v: number[],
  offset: number,
  tolerance: number
): Side {
  if (Bezier.isStraight(v)) {
    // Along the normals at the ends, as the joins and caps use them:
    const zero = new Point()
    const side = createSide(
      new Point(v[0], v[1]).add(Bezier.getNormal(v, 0).multiply(offset))
    )
    addCurve(
      side,
      zero,
      new Point(v[6], v[7]).add(Bezier.getNormal(v, 1).multiply(offset)),
      zero
    )
    return side
  } else {
    // Paper.js's normals point the other way than those of the method
    // below, see getUnitNormal():
    return offsetCubic(v, -offset, tolerance)
  }
}

// The offset of a cubic Bézier curve after kurbo's offset_cubic(), by Raph
// Levien and the Linebender contributors (Apache-2.0 OR MIT):
// https://github.com/linebender/kurbo/blob/main/kurbo/src/offset.rs
// Each part is drawn as an arc, refined by least squares, and subdivided
// while its error exceeds the tolerance, first at the cusps of the offset.
function offsetCubic(v: number[], d: number, tolerance: number): Side {
  const c = regularizeCusp(v, tolerance / 4)
  const p0 = new Point(c[0], c[1])
  const p1 = new Point(c[2], c[3])
  const p2 = new Point(c[4], c[5])
  const p3 = new Point(c[6], c[7])
  // The control points of the derivative:
  const q0 = p1.subtract(p0).multiply(3)
  const q1 = p2.subtract(p1).multiply(3)
  const q2 = p3.subtract(p2).multiply(3)
  // The cross product of the second and first derivatives, times the
  // offset, as the polynomial c0 + c1 * t + c2 * t^2:
  const q1xq0 = q1.cross(q0)
  const q2xq0 = q2.cross(q0)
  const q2xq1 = q2.cross(q1)
  const c0 = 2 * d * q1xq0
  const c1 = 2 * d * (q2xq0 - 2 * q1xq0)
  const c2 = 2 * d * (q2xq1 - q2xq0 + q1xq0)
  const utan0 = Bezier.getTangent(c, 0)
  const utan1 = Bezier.getTangent(c, 1)
  const side = createSide(p0.add(getUnitNormal(utan0, d)))
  // The Bézier weights of the points of the least squares fit:
  const count = 8
  const weights: number[] = []
  for (let i = 0; i < count; i++) {
    const t = (i + 1) / (count + 1)
    weights.push(3 * (1 - t) * (1 - t) * t)
  }

  function getUnitNormal(utan: Point, length: number): Point {
    return new Point(-utan.y, utan.x).multiply(length)
  }

  function evaluate(t: number): Point {
    return Bezier.getPoint(c, t)
  }

  function derive(t: number): Point {
    const u = 1 - t
    const w0 = u * u
    const w1 = 2 * t * u
    const w2 = t * t
    return new Point(
      w0 * q0.x + w1 * q1.x + w2 * q2.x,
      w0 * q0.y + w1 * q1.y + w2 * q2.y
    )
  }

  // The curvature times the offset plus one, which is zero where the
  // offset has a cusp:
  function getCusp(t: number): number {
    const ds2 = derive(t).dot(derive(t))
    return ((c2 * t + c1) * t + c0) / (ds2 * Math.sqrt(ds2)) + 1
  }

  function getEndCusp(tangent: Point, y: number): number {
    const length = Math.max(tangent.length, EPSILON)
    return y / (length * length * length) + 1
  }

  // The offset curve of the part from t0 to t1, with the handles of the
  // offset drawn as an arc that a and b adjust:
  function getOffsetCurve(part: CubicPart, a: number, b: number): Point[] {
    const s = (part.t1 - part.t0) / 3
    const start = evaluate(part.t0).add(getUnitNormal(part.utan0, d))
    const end = evaluate(part.t1).add(getUnitNormal(part.utan1, d))
    const l0 = s * derive(part.t0).length + a * d
    const l1 = s * derive(part.t1).length - b * d
    return [
      start,
      l0 * part.cusp0 > 0 ? start.add(part.utan0.multiply(l0)) : start,
      l1 * part.cusp1 > 0 ? end.subtract(part.utan1.multiply(l1)) : end,
      end
    ]
  }

  // The error of the offset curve, at the points on it whose normals meet
  // the curve at the times in ts, which a Newton step refines. It is
  // called a lot, so we calculate with coordinates, not points:
  function getError(
    part: CubicPart,
    points: Point[],
    ts: number[]
  ): { squared: number; normals: Point[]; vectors: Point[] } {
    let error = 0
    const normals: Point[] = []
    const vectors: Point[] = []
    const { x: x0, y: y0 } = points[0]
    const { x: x1, y: y1 } = points[1]
    const { x: x2, y: y2 } = points[2]
    const { x: x3, y: y3 } = points[3]
    const sign = part.cusp0 < 0 ? -1 : 1
    for (let i = 0; i < count; i++) {
      const ta = (i + 1) / (count + 1)
      const u = 1 - ta
      const w0 = u * u * u
      const w1 = 3 * u * u * ta
      const w2 = 3 * u * ta * ta
      const w3 = ta * ta * ta
      const px = w0 * x0 + w1 * x1 + w2 * x2 + w3 * x3
      const py = w0 * y0 + w1 * y1 + w2 * y2 + w3 * y3
      const tx = (
        (x1 - x0) * u * u +
        (x2 - x1) * 2 * u * ta +
        (x3 - x2) * ta * ta
      )
      const ty = (
        (y1 - y0) * u * u +
        (y2 - y1) * 2 * u * ta +
        (y3 - y2) * ta * ta
      )
      let t = ts[i]
      let point = evaluate(t)
      const derivative = derive(t)
      t += (
        (tx * (px - point.x) + ty * (py - point.y)) /
        (tx * derivative.x + ty * derivative.y)
      )
      t = ts[i] = clamp(t, part.t0, part.t1)
      point = evaluate(t)
      const length = Math.sqrt(tx * tx + ty * ty)
      const nx = -ty / length * sign
      const ny = tx / length * sign
      const vx = px - point.x - nx * d
      const vy = py - point.y - ny * d
      const squared = vx * vx + vy * vy
      normals.push(new Point(nx, ny))
      vectors.push(new Point(vx, vy))
      // Reject refinements that produce invalid values:
      error = Math.max(error, isFinite(squared) ? squared : 1e12)
    }
    return { squared: error, normals, vectors }
  }

  // Adjusts a and b to minimize the least squares error, mostly normal to
  // the offset, with a little of the error along it blended in:
  function refine(
    part: CubicPart,
    a: number,
    b: number,
    error: { normals: Point[]; vectors: Point[] }
  ): [number, number] {
    const blend = 1e-3
    let aa = 0
    let ab = 0
    let ac = 0
    let bb = 0
    let bc = 0
    for (let i = 0; i < count; i++) {
      const n = error.normals[i]
      const vector = error.vectors[i]
      const cn = vector.dot(n)
      const ct = vector.cross(n)
      const an = weights[i] * part.utan0.dot(n)
      const at = weights[i] * part.utan0.cross(n)
      const bn = weights[count - 1 - i] * part.utan1.dot(n)
      const bt = weights[count - 1 - i] * part.utan1.cross(n)
      aa += an * an + blend * at * at
      ab += an * bn + blend * at * bt
      ac += an * cn + blend * at * ct
      bb += bn * bn + blend * bt * bt
      bc += bn * cn + blend * bt * ct
    }
    const idet = 1 / (d * (aa * bb - ab * ab))
    return [
      a - idet * (ac * bb - ab * bc),
      b - idet * (aa * bc - ac * ab)
    ]
  }

  // Finds the time in t0..t1 where the tangent points along `tangent`,
  // with `force` returning the end with the smaller derivative if there
  // isn't exactly one:
  function getTimeWithTangent(
    utan0: Point,
    t0: number,
    t1: number,
    tangent: Point,
    force: boolean
  ): { t: number; utan: Point } | null {
    const z0 = tangent.cross(q0)
    const z1 = tangent.cross(q1)
    const z2 = tangent.cross(q2)
    const roots: number[] = []
    const found = solveQuadratic(
      z2 - 2 * z1 + z0,
      2 * (z1 - z0),
      z0,
      roots,
      t0,
      t1
    )
    let t = roots[0]
    if (found !== 1) {
      if (!force) return null
      t = derive(t0).length > derive(t1).length ? t1 : t0
    }
    const q = derive(t)
    return {
      t,
      utan:
        found === 1 && q.dot(q) >= EPSILON
          ? q.normalize()
          : tangent.dot(tangent) >= EPSILON
            ? tangent.normalize()
            : // A U-turn: pick a direction.
              getUnitNormal(utan0, 1)
    }
  }

  // Where to subdivide: in the middle if its tangent is balanced between
  // the ends', otherwise at the tangent that bisects them, or with an
  // inflection, at half of the total turning:
  function getSubdivision(part: CubicPart): { t: number; utan: Point } {
    const t = (part.t0 + part.t1) / 2
    const q = derive(t)
    const x0 = abs(part.utan0.cross(q))
    const x1 = abs(part.utan1.cross(q))
    if (x0 > 0.1 * x1 && x1 > 0.1 * x0) return { t, utan: q.normalize() }
    const chord = evaluate(part.t1).subtract(evaluate(part.t0))
    if (chord.cross(part.utan0) * chord.cross(part.utan1) < 0) {
      const split = getTimeWithTangent(
        part.utan0,
        part.t0,
        part.t1,
        part.utan0.add(part.utan1),
        false
      )
      if (split) return split
    }
    const tangents = [part.utan0]
    const ts = [part.t0]
    const inflections = getInflections(c)
    for (let i = 0; i < inflections.length; i++) {
      const ti = inflections[i]
      if (ti > part.t0 && ti < part.t1) {
        tangents.push(derive(ti))
        ts.push(ti)
      }
    }
    tangents.push(part.utan1)
    ts.push(part.t1)
    const angles: number[] = []
    let sum = 0
    for (let i = 0; i < tangents.length - 1; i++) {
      const angle = Math.atan2(
        tangents[i].cross(tangents[i + 1]),
        tangents[i].dot(tangents[i + 1])
      )
      sum += abs(angle)
      angles.push(angle)
    }
    let target = sum / 2
    let j = 0
    while (abs(angles[j]) < target) {
      target -= abs(angles[j])
      j++
    }
    const base = tangents[j]
    const turn = angles[j] < 0 ? -target : target
    const tangent = base.rotate(turn * 180 / Math.PI)
    return getTimeWithTangent(
      j ? base.normalize() : part.utan0,
      ts[j],
      ts[j + 1],
      tangent,
      true
    )
  }

  function subdivide(
    part: CubicPart,
    t: number,
    utan: Point,
    cuspMinus: number,
    cuspPlus: number
  ) {
    offsetPart({
      t0: part.t0,
      t1: t,
      utan0: part.utan0,
      utan1: utan,
      cusp0: part.cusp0,
      cusp1: cuspMinus,
      depth: part.depth + 1
    })
    offsetPart({
      t0: t,
      t1: part.t1,
      utan0: utan,
      utan1: part.utan1,
      cusp0: cuspPlus,
      cusp1: part.cusp1,
      depth: part.depth + 1
    })
  }

  function offsetPart(part: CubicPart) {
    // Subdivide at a cusp of the offset first:
    if (part.cusp0 * part.cusp1 < 0) {
      const t = findSignChange(
        getCusp, part.t0, part.t1, part.cusp0, part.cusp1, EPSILON
      )
      subdivide(
        part,
        t,
        derive(t).normalize(),
        part.cusp0 < 0 ? -EPSILON : EPSILON,
        part.cusp1 < 0 ? -EPSILON : EPSILON
      )
      return
    }
    // The arc from the normal at the start to the one at the end:
    const angle = Math.atan2(
      part.utan1.cross(part.utan0),
      part.utan1.dot(part.utan0)
    )
    let a = 2 / 3 / (1 + Math.cos(angle / 2)) * 2 * Math.sin(angle / 2)
    let b = -a
    const dt = (part.t1 - part.t0) / (count + 1)
    const ts: number[] = []
    for (let i = 0; i < count; i++) {
      ts.push(part.t0 + (i + 1) * dt)
    }
    let points = getOffsetCurve(part, a, b)
    let error = getError(part, points, ts)
    const tolerance2 = tolerance * tolerance
    for (let i = 0; i < 2 && error.squared > tolerance2; i++) {
      const refined = refine(part, a, b, error)
      const points2 = getOffsetCurve(part, refined[0], refined[1])
      const error2 = getError(part, points2, ts)
      if (error2.squared >= error.squared) break
      a = refined[0]
      b = refined[1]
      points = points2
      error = error2
    }
    // Pieces within the tolerance of their start can't be off by
    // more, as near cusps of the offset, where the error doesn't
    // converge and subdivision only adds pieces of no length:
    const isShort = (
      points[1].getDistance(points[0]) < tolerance &&
      points[2].getDistance(points[0]) < tolerance &&
      points[3].getDistance(points[0]) < tolerance
    )
    if (part.depth < 16 && error.squared > tolerance2 && !isShort) {
      const split = getSubdivision(part)
      const cusp = getCusp(split.t)
      subdivide(part, split.t, split.utan, cusp, cusp)
    } else {
      addCurve(
        side,
        points[1].subtract(points[0]),
        points[3],
        points[2].subtract(points[3])
      )
    }
  }

  offsetPart({
    t0: 0,
    t1: 1,
    utan0,
    utan1,
    cusp0: getEndCusp(q0, c0),
    cusp1: getEndCusp(q2, c0 + c1 + c2),
    depth: 0
  })
  return side
}

// The times of the inflections of the curve:
function getInflections(v: number[]): number[] {
  const p0 = new Point(v[0], v[1])
  const p1 = new Point(v[2], v[3])
  const p2 = new Point(v[4], v[5])
  const p3 = new Point(v[6], v[7])
  const a = p1.subtract(p0)
  const b = p2.subtract(p1).subtract(a)
  const c = p3.subtract(p0).subtract(p2.subtract(p1).multiply(3))
  const roots: number[] = []
  const count = solveQuadratic(
    b.cross(c),
    a.cross(c),
    a.cross(b),
    roots,
    0,
    1
  )
  return count > 0 ? roots.slice(0, count) : []
}

// Gives handles that are shorter than the dimension that length, towards
// the next control point, so that the curve's derivative doesn't vanish at
// its ends, and hooks too short to see don't turn its joins and caps (after
// kurbo's CubicBez::regularize()):
function regularize(v: number[], dimension: number): number[] {
  const p0 = new Point(v[0], v[1])
  let p1 = new Point(v[2], v[3])
  let p2 = new Point(v[4], v[5])
  const p3 = new Point(v[6], v[7])
  const handle1 = p1.subtract(p0)
  const handle2 = p2.subtract(p3)
  if (handle1.length < dimension) {
    if (p0.getDistance(p2) >= dimension) {
      p1 = p0.add(p2.subtract(p0).normalize(dimension))
    } else {
      p1 = p0.add(p3.subtract(p0).divide(3))
      p2 = p3.add(p0.subtract(p3).divide(3))
    }
  }
  if (handle2.length < dimension) {
    if (p3.getDistance(p1) >= dimension) {
      p2 = p3.add(p1.subtract(p3).normalize(dimension))
    } else {
      p1 = p0.add(p3.subtract(p0).divide(3))
      p2 = p3.add(p0.subtract(p3).divide(3))
    }
  }
  return [p0.x, p0.y, p1.x, p1.y, p2.x, p2.y, p3.x, p3.y]
}

// Nudges the handles of a curve with a cusp within it, where its derivative
// vanishes, so that its curvature stays finite (kurbo's regularize_cusp()):
function regularizeCusp(v: number[], dimension: number): number[] {
  const p0 = new Point(v[0], v[1])
  let p1 = new Point(v[2], v[3])
  let p2 = new Point(v[4], v[5])
  const p3 = new Point(v[6], v[7])
  const d01 = p1.subtract(p0)
  const d02 = p2.subtract(p0)
  const d03 = p3.subtract(p0)
  const d12 = p2.subtract(p1)
  const d23 = p3.subtract(p2)
  const det012 = d01.cross(d02)
  const det123 = d12.cross(d23)
  const det013 = d01.cross(d03)
  const det023 = d02.cross(d03)
  if (det012 * det123 > 0 && det012 * det013 < 0 && det012 * det023 < 0) {
    // The derivative is the quadratic of q0, q1, q2. Find where it is
    // shortest, and its curvature there:
    const q0 = d01.multiply(3)
    const q1 = d12.multiply(3)
    const q2 = d23.multiply(3)
    const t = Bezier.getNearestTime(
      [
        q0.x,
        q0.y,
        q0.x + (q1.x - q0.x) * 2 / 3,
        q0.y + (q1.y - q0.y) * 2 / 3,
        q2.x + (q1.x - q2.x) * 2 / 3,
        q2.y + (q1.y - q2.y) * 2 / 3,
        q2.x,
        q2.y
      ],
      new Point(0, 0)
    )
    const u = 1 - t
    const q = q0
      .multiply(u * u)
      .add(q1.multiply(2 * t * u))
      .add(q2.multiply(t * t))
    const dq = q1
      .subtract(q0)
      .multiply(2 * u)
      .add(q2.subtract(q1).multiply(2 * t))
    const cross = q.cross(dq)
    const distance2 = q.dot(q)
    if (
      distance2 * distance2 * distance2 <=
      cross * dimension * cross * dimension
    ) {
      const a = 3 * det012 + det023 - 2 * det013
      const b = -3 * det012 + det013
      const discriminant = b * b - 4 * a * det012
      const l01 = d01.length
      const l23 = d23.length
      if (discriminant > 0) {
        // A double inflection: keep the handles at least as long as
        // the dimension.
        if (l01 > 2 * dimension) {
          p1 = p1.subtract(d01.multiply(dimension / l01))
        }
        if (l23 > 2 * dimension) {
          p2 = p2.add(d23.multiply(dimension / l23))
        }
      } else {
        // A loop:
        p1 = p1.add(d01.multiply(dimension / l01))
        p2 = p2.subtract(d23.multiply(dimension / l23))
      }
    }
  }
  return [p0.x, p0.y, p1.x, p1.y, p2.x, p2.y, p3.x, p3.y]
}
