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

// The areas that the pens of stroke profiles sweep: the ellipses that change
// along curves between the stops, see Path#strokeProfile. The sides of the
// stroke lie where the moving pen touches the edge of the area, which we find
// exactly at each time on the curves, and fit with cubics. Where the pens
// change abruptly or the sides end, at stops, steps, corners and reversals,
// we add the pens there as they are, as each lies within the area.
import {
  CURVETIME_EPSILON,
  GEOMETRIC_EPSILON,
  clamp,
  findSignChange,
  isZero
} from '../util/numerical.ts'
import { Line } from '../basic/Line.ts'
import { Point } from '../basic/Point.ts'
import {
  getCurveArea,
  getCurveLength,
  getCurveNormal,
  getCurvePoint,
  getCurveRayWinding,
  getCurveTangent,
  getCurveTimeAt,
  getNearestCurveTime
} from '../curve/index.ts'
import type { CurveValues } from '../curve/index.ts'
import { uniteRegions } from '../boolean/operations.ts'
import { createRegion, getPathCurves } from '../data/region.ts'
import type { PathValues, RegionValues } from '../data/region.ts'
import {
  fitSide,
  getCurvatureExtrema,
  getInflections,
  getTurn,
  joinSides,
  regularizeCusp
} from './curves.ts'
import type { Side } from './curves.ts'
import { createPen, getAxes, getContacts, getPenSegments } from './pen.ts'
import type { Contact, Contacts, Pen, PenValues, Strip } from './pen.ts'
import { Sweep } from './sweep.ts'
import type { CurveParts, Part, Stroke } from './sweep.ts'

// The pens of a stroke profile: the offsets along the path where they
// change, twice at steps, and their values at any offset with the first and
// second derivatives, on the side after a step or before it:
export type StrokePens = {
  offsets: number[]
  getValues: (offset: number, after: boolean) => PenValues
}

// The stretch of a stroke profile between two of its stops, by their offsets:
type Span = { start: number; end: number }

// A part of a curve, with its offset and length along the path, and the
// length of its curve:
type ProfilePart = Part & {
  offset: number
  length: number
  curveLength: number
}

const { abs } = Math

export class ProfileSweep extends Sweep<ProfilePart> {
  pens: StrokePens
  spans: Span[] = []
  // The ends of the sides of the slivers left out last, with where they
  // start, as the strips right after them start there instead, to meet the
  // ones before them:
  moves: [Point, Point][] = []

  constructor(path: PathValues, pens: StrokePens, stroke: Stroke) {
    super(path, stroke)
    const { offsets } = pens
    this.pens = pens
    for (let i = 1, l = offsets.length; i < l; i++) {
      if (offsets[i] > offsets[i - 1]) {
        this.spans.push({ start: offsets[i - 1], end: offsets[i] })
      }
    }
  }

  // Curves that reverse along their line become straight parts between the
  // reversals, where the pen turns as it is. Each part keeps its offset along
  // the path, and the length of its curve, measured once for getOffset() and
  // getTime(). Straight parts get handles, as the contacts need a derivative:
  // @override
  splitCurve(
    v: CurveValues,
    points: Point[],
    offset: number,
    length: number
  ) {
    const parts: ProfilePart[] = []
    if (points.length > 2) {
      // The runs share the curve's length along the path, see getOffset():
      let total = 0
      for (let i = 1, l = points.length; i < l; i++) {
        total += points[i - 1].getDistance(points[i])
      }
      for (let i = 1, start = offset, l = points.length; i < l; i++) {
        const p1 = points[i - 1]
        const p2 = points[i]
        const third = p2.subtract(p1).divide(3)
        const distance = p1.getDistance(p2) * length / total
        parts.push(
          createPart(
            [
              p1.x,
              p1.y,
              p1.x + third.x,
              p1.y + third.y,
              p2.x - third.x,
              p2.y - third.y,
              p2.x,
              p2.y
            ],
            start,
            distance
          )
        )
        start += distance
      }
    } else {
      parts.push(
        createPart(regularizeCusp(v, this.stroke.tolerance / 4), offset, length)
      )
    }
    return {
      parts,
      start: getCurveTangent(parts[0].v, 0),
      end: getCurveTangent(parts[parts.length - 1].v, 1)
    }
  }

  // Adds the areas that the pen sweeps along the part, split at the spans
  // that it crosses:
  // @override
  addPart(part: ProfilePart) {
    const start = part.offset
    const end = start + part.length
    for (const span of this.spans) {
      const from = Math.max(span.start, start)
      const to = Math.min(span.end, end)
      const ta = this.getTime(part, from)
      const tb = this.getTime(part, to)
      if (to > from && tb > ta) {
        this.addPiece(part, span, ta, tb)
      }
    }
  }

  // @override
  addTurn(part1: ProfilePart, part2: ProfilePart) {
    const start = part2.offset
    const span = this.getSpan(start)
    this.addPen(
      new Point(part2.v[0], part2.v[1]),
      this.getSpanPen(span, start),
      this.getContacts(part1, 1, span).strips.concat(
        this.getContacts(part2, 0, span).strips
      )
    )
  }

  // A dot is the pen, or the rectangle around it:
  // @override
  addDot(center: Point) {
    const pen = this.getPen(0, true)
    if (this.stroke.cap === 'round') {
      this.addPen(center, pen)
    } else {
      const axes = getAxes(pen)
      const x = axes[0].multiply(pen.a)
      const y = axes[1].multiply(pen.b)
      this.addPolygon([
        center.subtract(x).subtract(y),
        center.add(x).subtract(y),
        center.add(x).add(y),
        center.subtract(x).add(y)
      ])
    }
  }

  // The pen at the offset. Where a step lies there, `after` picks the side
  // after it:
  getPen(offset: number, after: boolean): Pen {
    return createPen(this.pens.getValues(offset, after), this.stroke.radius)
  }

  // The pen of the span at the offset within it, also where rounding took
  // the offset beyond its ends, and onto the other side of a step there:
  getSpanPen(span: Span, offset: number): Pen {
    const { end } = span
    return offset < end
      ? this.getPen(Math.max(offset, span.start), true)
      : this.getPen(end, false)
  }

  // The offset along the path at the time on the part. Regularizing can
  // make its curve a little longer or shorter than the part is along the
  // path, so we scale its lengths, and the parts meet at the same offsets,
  // with the same pens:
  getOffset(part: ProfilePart, t: number): number {
    return (
      part.offset +
      part.length *
      getCurveLength(part.v, 0, t) /
      part.curveLength
    )
  }

  // The time on the part at the offset along the path, the inverse of
  // getOffset():
  getTime(part: ProfilePart, offset: number): number {
    const start = part.offset
    return offset <= start
      ? 0
      : offset >= start + part.length
        ? 1
        : getCurveTimeAt(
            part.v,
            (offset - start) *
            part.curveLength /
            part.length
          )
  }

  // The span at the offset, or the one before it where they meet. Before
  // the start of closed paths lies their end:
  getSpan(offset: number, after?: boolean): Span {
    const { spans } = this
    if (this.path.closed && !after && !offset) {
      offset = this.length
    }
    for (let i = 0, l = spans.length; i < l; i++) {
      const span = spans[i]
      if (after ? offset < span.end : offset <= span.end) return span
    }
    return spans[spans.length - 1]
  }

  // Where the pen at the time on the part touches the edge of the area that
  // it sweeps, see getContacts():
  getContacts(part: ProfilePart, t: number, span: Span): Contacts {
    return getContacts(
      part.v,
      t,
      this.getSpanPen(span, this.getOffset(part, t))
    )
  }

  // Adds the areas that the pen sweeps along the curve from ta to tb,
  // within the span, as strips between the paths of the points where
  // it touches the edge of the area, see getContacts(). We split them
  // where these points appear or vanish, where two strips trade
  // places, and where a strip folds over as one of its ends turns
  // back across it. The pens at the first two lie within the area and
  // cover the ends of the strips there. Strips that fold over sweep
  // beyond their inner edge, so we split them into two areas at the
  // points that stand still across them, as RoundSweep#addPart() does at
  // the evolute (Nehab):
  addPiece(part: ProfilePart, span: Span, ta: number, tb: number) {
    const { tolerance } = this.stroke
    // As the points that touch the edge move around the pen
    // as it and the curve turn, sample them at least every 10°:
    const { v } = part
    const turn = (
      abs(
        this.getSpanPen(span, this.getOffset(part, tb)).angle -
        this.getSpanPen(span, this.getOffset(part, ta)).angle
      ) +
      getTurn(v, ta, tb)
    )
    const count = Math.max(16, Math.ceil(turn * 18 / Math.PI))
    // The times where the parts end and the next ones start:
    const splits = [[ta, ta], [tb, tb]]
    const cache: Record<number, Strip[]> = {}

    // Fitting asks for the same times for each end of a strip:
    const getStrips = (t: number): Strip[] =>
      (cache[t] ??= this.getContacts(part, t, span).strips)

    // The point at the end of the strip at the time, or the curve's
    // point where a change between the samples took the strip away,
    // which lies within the pen too:
    const getEnd = (t: number, j: number, end: 'from' | 'to'): Point => {
      const strip = getStrips(t)[j]
      return strip ? strip[end].point : getCurvePoint(v, t)
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
        let last = s0
        for (let j = 0; j < 40; j++) {
          const middle = (t + u) / 2
          const strips = getStrips(middle)
          // Close to the last ones too, to find the first of the changes:
          if (isSame(strips, s0) && isClose(strips, last)) {
            t = middle
            last = strips
          } else {
            u = middle
          }
        }
        const next = getStrips(u)
        // Where they only moved too fast for the samples, nothing changes:
        if (!isSame(next, last) || !isClose(next, last)) {
          splits.push([t, u])
          this.addPen(
            getCurvePoint(v, t),
            this.getSpanPen(span, this.getOffset(part, t)),
            last.concat(next)
          )
        }
        t0 = u
        s0 = next
      }
      for (let j = 0, l = s0.length; j < l; j++) {
        const m0 = getMotions(s0[j])
        const m1 = getMotions(s1[j])
        const getMotion = (t: number, k: number) => {
          const strip = getStrips(t)[j]
          return strip ? getMotions(strip)[k] : 0
        }
        const addChange = (
          k: number,
          from: number,
          to: number,
          motion1: number,
          motion2: number
        ) => {
          const t = findSignChange(
            t => getMotion(t, k),
            from,
            to,
            motion1,
            motion2,
            1e-9
          )
          splits.push([t, t])
          return t
        }
        for (let k = 0; k < 2; k++) {
          if (m0[k] * m1[k] < 0) {
            const t = addChange(k, t0, t1, m0[k], m1[k])
            // The other end may change twice between the samples, around
            // this change, where its motion has the other sign:
            const other = 1 - k
            const m = getMotion(t, other)
            if (m0[other] * m1[other] > 0 && m0[other] * m < 0) {
              addChange(other, t0, t, m0[other], m)
              addChange(other, t, t1, m, m1[other])
            }
          }
        }
      }
      t0 = t1
      s0 = s1
    }
    splits.sort((a, b) => a[0] - b[0])
    // Moves the start of the side where a sliver left out ends to where it
    // starts, so that it meets the strip before the sliver:
    const moveStart = (side: Side) => {
      const move = this.moves.find(([end]) =>
        end.isClose(side[0][0], GEOMETRIC_EPSILON)
      )
      if (move) {
        const { x, y } = move[1]
        side[0][0] = [x, y]
      }
    }

    for (let i = 1, l = splits.length; i < l; i++) {
      const t0 = splits[i - 1][1]
      const t1 = splits[i][0]
      const strips = t1 - t0 > GEOMETRIC_EPSILON ? getStrips((t0 + t1) / 2) : []
      const moves: [Point, Point][] = []
      for (let j = 0, m = strips.length; j < m; j++) {
        const motions = getMotions(strips[j])
        const from = fitSide(t => getEnd(t, j, 'from'), t0, t1, tolerance)
        const to = fitSide(t => getEnd(t, j, 'to'), t0, t1, tolerance)
        const start1 = new Point(from[0][0])
        const start2 = new Point(to[0][0])
        moveStart(from)
        moveStart(to)
        // Strips whose ends stand still sweep nothing, and the
        // points that stand still across them are only noise:
        if (
          motions[0] * motions[1] < 0 &&
          (isMoving(from, tolerance) || isMoving(to, tolerance))
        ) {
          const still = fitSide(
            t => {
              const strip = getStrips(t)[j]
              if (!strip) return getCurvePoint(v, t)
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
            t1,
            tolerance
          )
          // It starts between the sides as before, also where they moved:
          const distance = start1.getDistance(start2)
          const { x, y } = new Point(from[0][0]).add(
            new Point(to[0][0])
              .subtract(from[0][0])
              .multiply(
                distance
                  ? start1.getDistance(new Point(still[0][0])) / distance
                  : 0
              )
          )
          still[0][0] = [x, y]
          // Both halves of the fold connect the strips before and after it,
          // also where they are thin. Where only one of them is, the strip
          // between the sides covers both:
          const strip1 = createStrip(from, still)
          const strip2 = createStrip(to, still)
          if (isThin(strip1, tolerance) === isThin(strip2, tolerance)) {
            this.areas.push(strip1, strip2)
          } else {
            this.addStrip(from, to)
          }
        } else if (!this.addStrip(from, to)) {
          // The strips around a short sliver miss each other by its width,
          // so the next one starts where it does. A longer one is a thin
          // strip, whose gap is no wider than the outline may be off:
          const ends = [from, to].map((side): [Point, Point] => [
            new Point(side[side.length - 1][0]),
            new Point(side[0][0])
          ])
          if (ends.every(([end, start]) => end.isClose(start, 2 * tolerance))) {
            moves.push(...ends)
          }
        }
      }
      this.moves = moves
    }
  }

  // Adds the pens where the spans meet and the pen changes abruptly, as the
  // sides jump there, except at steps, which end the parts straight across, as
  // butt caps do. Where the pen changes smoothly, the parts meet in the same
  // points:
  // @override
  addStops() {
    const { length, parts } = this
    const { closed } = this.path
    const { offsets } = this.pens
    for (let i = 0, l = offsets.length; i < l; i++) {
      const offset = offsets[i]
      if (
        !isStep(offsets, offset) &&
        (closed ? offset < length : offset > 0 && offset < length)
      ) {
        const pen = this.getPen(offset, true)
        const before = this.getPen(offset, false)
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
          while (parts[j].offset + parts[j].length <= offset) {
            j++
          }
          const part = parts[j]
          const t = this.getTime(part, offset)
          const previous = t
            ? part
            : parts[j - 1] ?? parts[parts.length - 1]
          this.addPen(
            getCurvePoint(part.v, t),
            pen,
            this.getContacts(
              previous,
              t || 1,
              this.getSpan(offset, false)
            ).strips.concat(
              this.getContacts(part, t, this.getSpan(offset, true)).strips
            )
          )
        }
      }
    }
  }

  // Adds the join at the start of the second curve, on the outer side of
  // their turn. Round joins are the pen, the others connect its sides there:
  // @override
  addJoin(curve1: CurveParts<ProfilePart>, curve2: CurveParts<ProfilePart>) {
    const { radius, tolerance, join, miterLimit } = this.stroke
    const point = new Point(curve2.curve[0], curve2.curve[1])
    const part1 = curve1.parts.at(-1)
    const part2 = curve2.parts[0]
    const { offset } = part2
    const tangent1 = curve1.end
    const tangent2 = curve2.start
    const cross = tangent1.cross(tangent2)
    const span1 = this.getSpan(offset, false)
    const span = this.getSpan(offset, true)
    const pen = this.getSpanPen(span, offset)
    const strips1 = this.getContacts(part1, 1, span1).strips
    const strips2 = this.getContacts(part2, 0, span).strips
    // Where the curves continue each other, their parts meet in the same
    // points, and need no join:
    if (!isZero(cross) || tangent1.dot(tangent2) < 0) {
      if (join === 'round') {
        this.addPen(point, pen, strips1.concat(strips2))
      } else {
        // The side against the turn, see getContacts():
        const k = cross > 0 ? 1 : 0
        const sides1 = this.getContacts(part1, 1, span1).sides
        const sides2 = this.getContacts(part2, 0, span).sides
        if (sides1 && sides2) {
          // Widen the join into the parts on both sides, as
          // RoundSweep#addJoin() does, by turning the sides' points
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
              this.getSpanPen(span1, part1.offset + part1.length),
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
          this.addPolygon(
            points.concat(
              side2,
              widen(sides2[k], pen, 1),
              sides2[1 - k].point
            )
          )
        }
      }
    } else if (
      !isMeeting(strips1, strips2) &&
      !isStep(this.pens.offsets, offset)
    ) {
      // Where their parts don't meet, the pen covers the seam between them,
      // except at steps, which end the parts straight across:
      this.addPen(point, pen, strips1.concat(strips2))
    }
  }

  // Round caps are the pen, square ones extend its sides as far as it
  // reaches ahead:
  // @override
  addCap(curve: CurveParts<ProfilePart>, atEnd: boolean, tangent: Point) {
    const { cap } = this.stroke
    const { parts } = curve
    const part = atEnd ? parts[parts.length - 1] : parts[0]
    const t = atEnd ? 1 : 0
    const offset = part.offset + (t ? part.length : 0)
    const span = this.getSpan(offset, !t)
    const pen = this.getSpanPen(span, offset)
    if (cap === 'round') {
      this.addPen(
        getCurvePoint(part.v, t),
        pen,
        this.getContacts(part, t, span).strips
      )
    } else if (cap === 'square') {
      const { sides } = this.getContacts(part, t, span)
      if (sides) {
        const axes = getAxes(pen)
        const reach = new Point(
          pen.a * tangent.dot(axes[0]),
          pen.b * tangent.dot(axes[1])
        ).length
        const ahead = tangent.multiply(reach)
        const side0 = sides[0].point
        const side1 = sides[1].point
        this.addPolygon([side0, side0.add(ahead), side1.add(ahead), side1])
      }
    }
  }

  // Adds the pen at the point, with points where the strips touch it, see
  // getPenSegments(), if it has an area:
  addPen(point: Point, pen: Pen, strips?: Strip[]) {
    const segments = getPenSegments(point, pen, strips)
    if (segments.length) {
      this.addArea(segments)
    }
  }

  // Adds the strip between the two sides, resolved, unless it is a sliver
  // thinner than the tolerance, which only adds points so close to the
  // others' that the union can't tell them apart, and returns whether it
  // did:
  addStrip(side1: Side, side2: Side): boolean {
    const strip = createStrip(side1, side2)
    const isStrip = !isThin(strip, this.stroke.tolerance)
    if (isStrip) {
      this.areas.push(strip)
    }
    return isStrip
  }
}

// The strip between the two sides, resolved:
function createStrip(side1: Side, side2: Side): RegionValues {
  return uniteRegions([createRegion(joinSides(side1, side2))])
}

function createPart(
  v: CurveValues,
  offset: number,
  length: number
): ProfilePart {
  return { v, offset, length, curveLength: getCurveLength(v) }
}

// Whether two of the pens' offsets lie at the offset, as a step:
function isStep(offsets: number[], offset: number): boolean {
  return offsets.indexOf(offset) !== offsets.lastIndexOf(offset)
}

// Whether the ends of the strips meet those of the strips after them:
function isMeeting(strips1: Strip[], strips2: Strip[]): boolean {
  return (
    strips1.length === strips2.length &&
    strips1.every(
      ({ from, to }, i) => (
        from.point.isClose(strips2[i].from.point, GEOMETRIC_EPSILON) &&
        to.point.isClose(strips2[i].to.point, GEOMETRIC_EPSILON)
      )
    )
  )
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
function isMoving(side: Side, tolerance: number): boolean {
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

// Checks that the part is thin on average, and also where it may taper,
// looking half the tolerance inside the middle of each curve, on the
// side that unite() leaves inside. Points that lie that far from the
// outline, within rounding, are thick:
function isThin({ paths }: RegionValues, tolerance: number): boolean {
  const half = tolerance / 2
  const curves = paths.flatMap(getPathCurves)
  let area = 0
  let length = 0
  for (const v of curves) {
    area += getCurveArea(v)
    length += getCurveLength(v)
  }
  return (
    abs(area) <= half * length &&
    !curves.some(v => {
      const inside = getCurvePoint(v, 0.5).subtract(
        getCurveNormal(v, 0.5).multiply(half)
      )
      let winding = 0
      let distance = Infinity
      for (const other of curves) {
        winding += getCurveRayWinding(other, inside)
        distance = Math.min(
          distance,
          inside.getDistance(
            getCurvePoint(other, getNearestCurveTime(other, inside))
          )
        )
      }
      return winding && distance > half * 0.99
    })
  )
}
