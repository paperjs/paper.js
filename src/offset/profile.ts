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
  createRegion,
  getCurveArea,
  getCurveLength,
  getCurveNormal,
  getCurvePoint,
  getCurveRayWinding,
  getCurveTangent,
  getCurveTimeAt,
  getNearestCurveTime,
  getPathArea,
  getPathCurves,
  isStraightCurve
} from '../values/index.ts'
import type { CurveValues, PathValues, RegionValues } from '../values/index.ts'
import { uniteRegions } from '../boolean/operations.ts'
import {
  addCurve,
  createSide,
  fitSide,
  getCurvatureExtrema,
  getInflections,
  getTurn,
  joinSides,
  regularizeCusp
} from './curves.ts'
import type { Side, SidePoint } from './curves.ts'
import {
  createPen,
  getAxes,
  getContacts,
  getPenArc,
  getPenSegments,
  getStripWidth
} from './pen.ts'
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

// A strip that was left out as too thin, with the points where its two sides
// end and start:
type Sliver = { strip: RegionValues; sides: [end: Point, start: Point][] }

// Two times on a part between which no strips are swept, see getSplits():
type Split = [start: number, end: number, strips?: Strip[]]

// A part of a curve, with its offset and length along the path, and the
// length of its curve:
type ProfilePart = Part & {
  offset: number
  length: number
  curveLength: number
  // The slivers left out at its end, see ProfileSweep#slivers:
  slivers?: Sliver[]
}

const { abs } = Math

export class ProfileSweep extends Sweep<ProfilePart> {
  pens: StrokePens
  spans: Span[] = []
  // The slivers left out last. What comes right after them starts where
  // they do instead of where they end, to meet the strips before them: the
  // next strips, or the join or cap at the end of a part:
  slivers: Sliver[] = []

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
      end: getCurveTangent(parts.at(-1).v, 1)
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
    part.slivers = this.slivers
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
    return spans.at(-1)
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
  // places, and where a strip folds over, see getSplits(). Strips that
  // fold over sweep beyond their inner edge, so we split them into two
  // areas at the points that stand still across them, as
  // RoundSweep#addPart() does at the evolute (Nehab):
  addPiece(part: ProfilePart, span: Span, ta: number, tb: number) {
    const { tolerance } = this.stroke
    const { v } = part
    const pen1 = this.getSpanPen(span, this.getOffset(part, ta))
    const pen2 = this.getSpanPen(span, this.getOffset(part, tb))
    // Along a straight part, a pen that doesn't change touches the edge in
    // the same points all the way, so its strips are straight too, and
    // their ends tell them:
    const isStraight = isStraightCurve(v) && isConstant(pen1, pen2)
    // Otherwise, as the points that touch the edge move around the pen as
    // it and the curve turn, sample them at least every 10°:
    const turn = abs(pen2.angle - pen1.angle) + getTurn(v, ta, tb)
    const count = isStraight ? 1 : Math.max(16, Math.ceil(turn * 18 / Math.PI))
    const cache = new Map<number, Strip[]>()

    // Fitting asks for the same times for each end of a strip:
    const getStrips = (t: number): Strip[] => {
      let strips = cache.get(t)
      if (!strips) {
        strips = this.getContacts(part, t, span).strips
        cache.set(t, strips)
      }
      return strips
    }

    // The curve's point, for the sides where a change between the samples
    // took their strip away, as it lies within the pen too. The sides
    // reach it in directions of their own:
    const getCenter = (t: number): SidePoint => ({
      point: getCurvePoint(v, t),
      derivative: new Point()
    })

    const getEnd = (t: number, j: number, end: 'from' | 'to'): SidePoint => (
      getStrips(t)[j]?.[end] ?? getCenter(t)
    )

    // The side along the points that the function returns from t0 to t1:
    const getSide = (
      evaluate: (t: number) => SidePoint,
      t0: number,
      t1: number
    ): Side => {
      if (isStraight) {
        const zero = new Point()
        const side = createSide(evaluate(t0).point)
        addCurve(side, zero, evaluate(t1).point, zero)
        return side
      } else {
        return fitSide(evaluate, t0, t1, tolerance)
      }
    }

    // Sample the strips evenly, and where the curve's curvature
    // peaks or changes sign, as the strips fold over around there:
    const samples: number[] = []
    for (let i = 0; i < count; i++) {
      samples.push(ta + (tb - ta) * i / count)
    }
    // Exactly at the end, as rounding could take it beyond:
    samples.push(tb)
    if (!isStraight) {
      for (const t of getCurvatureExtrema(v).concat(getInflections(v))) {
        if (t > ta && t < tb) {
          samples.push(t)
        }
      }
    }
    samples.sort((a, b) => a - b)
    const splits = getSplits(getStrips, samples)
    // The pens where the strips change lie within the area, and cover the
    // ends of the strips there:
    for (const [t, , strips] of splits) {
      if (strips) {
        this.addPen(
          getCurvePoint(v, t),
          this.getSpanPen(span, this.getOffset(part, t)),
          strips
        )
      }
    }
    // Moves the start of the side where a sliver left out ends to where it
    // starts, so that it meets the strip before the sliver:
    const moveStart = (side: Side) => {
      const [{ x, y }] = getSliverSide(this.slivers, new Point(side[0][0]))
      side[0][0] = [x, y]
    }

    for (let i = 1, l = splits.length; i < l; i++) {
      const t0 = splits[i - 1][1]
      const t1 = splits[i][0]
      const strips = t1 - t0 > GEOMETRIC_EPSILON ? getStrips((t0 + t1) / 2) : []
      const slivers: Sliver[] = []
      for (let j = 0, m = strips.length; j < m; j++) {
        const motions = getMotions(strips[j])
        const from = getSide(t => getEnd(t, j, 'from'), t0, t1)
        const to = getSide(t => getEnd(t, j, 'to'), t0, t1)
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
          // While the sides still stand at their starts, the point only
          // moves along the strip, and sweeps nothing. Start it once they
          // have moved, as it would run back along the strip's start,
          // at the first halving of the time where they haven't yet:
          const isMoved = (t: number) => (
            getEnd(t, j, 'from').point.getDistance(start1) > tolerance / 10 ||
            getEnd(t, j, 'to').point.getDistance(start2) > tolerance / 10
          )
          let ts = isMoved(t1) ? t1 : t0
          while (ts - t0 > CURVETIME_EPSILON && isMoved(ts)) {
            ts = (t0 + ts) / 2
          }
          const still = fitSide(
            time => {
              // At the times of the sides' samples, which the cache holds:
              const t = Math.max(time, ts)
              const strip = getStrips(t)[j]
              if (!strip) return getCenter(t)
              const motions = getMotions(strip)
              const { point } = strip.from
              const vector = strip.to.point.subtract(point)
              // Within the strip, also where its motions
              // vary more than the samples tell:
              const factor = clamp(
                motions[0] /
                (motions[0] - motions[1]),
                0,
                1
              )
              // As it stands still across the strip, it moves along it,
              // except at the ends, which it leaves in a turn:
              return {
                point: point.add(vector.multiply(factor)),
                derivative:
                  factor > 0 && factor < 1 && time >= ts ? vector : new Point()
              }
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
            this.addStrip(from, to, slivers)
          }
        } else {
          this.addStrip(from, to, slivers)
        }
      }
      this.slivers = slivers
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
            : parts[j - 1] ?? parts.at(-1)
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
    const contacts1 = this.getContacts(part1, 1, span1)
    const contacts2 = this.getContacts(part2, 0, span)
    const strips1 = contacts1.strips
    const strips2 = contacts2.strips
    // Where the curves continue each other, their parts meet in the same
    // points, and need no join:
    if (!isZero(cross) || tangent1.dot(tangent2) < 0) {
      // The side against the turn, see getContacts():
      const k = cross > 0 ? 1 : 0
      const sides1 = contacts1.sides
      const sides2 = contacts2.sides
      const pen1 = this.getSpanPen(span1, part1.offset + part1.length)
      // Round joins are the pen's arc there, where the pen doesn't change:
      // The parts then end straight across it, and leave nothing else of
      // it uncovered. A pen that changes stays whole:
      const hasArc = join === 'round' && isConstant(pen1, pen)
      if (sides1 && sides2 && (hasArc || join !== 'round')) {
        // Widen the join into the parts on both sides, as
        // RoundSweep#addJoin() does, by turning the sides' points
        // around their pens, back along the first curve and
        // ahead along the second. The sides themselves run
        // against their curves where these bend more tightly
        // than the pen:
        const widening = Math.sqrt(tolerance / radius)
        const widen = (side: Contact, pen: Pen, ahead: Point): number => {
          const axes = getAxes(pen)
          const along = axes[0]
            .multiply(-pen.a * Math.sin(side.phi))
            .add(axes[1].multiply(pen.b * Math.cos(side.phi)))
            .dot(ahead)
          return side.phi + (along > 0 ? widening : -widening)
        }
        // The point at the angle on the pen that touches the side:
        const getPoint = (side: Contact, pen: Pen, phi: number): Point => {
          const axes = getAxes(pen)
          return side.point
            .add(
              axes[0].multiply(pen.a * (Math.cos(phi) - Math.cos(side.phi)))
            )
            .add(
              axes[1].multiply(pen.b * (Math.sin(phi) - Math.sin(side.phi)))
            )
        }
        const side1 = sides1[k].point
        const side2 = sides2[k].point
        const phi1 = widen(sides1[k], pen1, tangent1.negate())
        const phi2 = widen(sides2[k], pen, tangent2)
        // From the inner sides, as the ends of the parts only run
        // through the point where the pen doesn't change, and from
        // where the slivers left out at the end of the first part
        // start, which the join covers that way:
        const { slivers } = part1
        const inner1 = getSliverSide(slivers, sides1[1 - k].point)[0]
        const inner2 = sides2[1 - k].point
        const ends1 = getSliverSide(slivers, side1)
        if (hasArc) {
          // Around the pen from the first side to the second, away from
          // where the first one is widened to. Turns of up to 180° come
          // out a little beyond that by rounding, or below 0°:
          const full = 2 * Math.PI
          const direction = phi1 > sides1[k].phi ? -1 : 1
          const turn = (
            (
              (direction * (sides2[k].phi - sides1[k].phi) + Math.PI / 2) %
              full +
              full
            ) %
            full -
            Math.PI / 2
          )
          const end = sides1[k].phi + direction * turn
          const arc = getPenArc(point, pen, [
            phi1,
            sides1[k].phi,
            end,
            end + direction * widening
          ])
          this.addArea([
            [inner1.x, inner1.y],
            ...ends1.slice(0, -1).map(({ x, y }) => [x, y]),
            ...arc,
            [inner2.x, inner2.y]
          ])
        } else {
          const points = [inner1, getPoint(sides1[k], pen1, phi1), ...ends1]
          if (join === 'miter') {
            const direction1 = sides1[k].derivative.normalize()
            const direction2 = sides2[k].derivative.normalize()
            const miter = Line.intersect(
              side1.x, side1.y,
              direction1.x, direction1.y,
              side2.x, side2.y,
              direction2.x, direction2.y,
              true, true
            )
            if (miter && miter.getDistance(point) <= miterLimit * pen.a) {
              points.push(miter)
            }
          }
          this.addPolygon(
            points.concat(side2, getPoint(sides2[k], pen, phi2), inner2)
          )
        }
      } else if (join === 'round') {
        this.addPen(point, pen, strips1.concat(strips2))
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
    const part = atEnd ? parts.at(-1) : parts[0]
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
      // From where the slivers left out at the end of the part start:
      const slivers = atEnd ? part.slivers : []
      if (sides) {
        const axes = getAxes(pen)
        const reach = new Point(
          pen.a * tangent.dot(axes[0]),
          pen.b * tangent.dot(axes[1])
        ).length
        const ahead = tangent.multiply(reach)
        const side0 = sides[0].point
        const side1 = sides[1].point
        this.addPolygon([
          getSliverSide(slivers, side0)[0],
          side0.add(ahead),
          side1.add(ahead),
          getSliverSide(slivers, side1)[0]
        ])
      }
    } else if (atEnd) {
      // Nothing covers the slivers left out before a butt cap:
      this.areas.push(...part.slivers.map(({ strip }) => strip))
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

  // Adds the strip between the two sides, resolved. A sliver thinner than
  // the tolerance only adds points so close to the others' that the union
  // can't tell them apart, but without it, the strips around it miss each
  // other by its width. So we only leave it out where it is short enough
  // for what follows to start where it does, and add it to the slivers:
  addStrip(side1: Side, side2: Side, slivers: Sliver[]) {
    const { tolerance } = this.stroke
    const strip = createStrip(side1, side2)
    const sides = [side1, side2].map((side): [Point, Point] => [
      new Point(side.at(-1)[0]),
      new Point(side[0][0])
    ])
    if (
      isThin(strip, tolerance) &&
      sides.every(([end, start]) => end.isClose(start, 2 * tolerance))
    ) {
      slivers.push({ strip, sides })
    } else {
      this.areas.push(strip)
    }
  }
}

// Returns the side of one of the slivers that ends at the point, from its
// start, or only the point:
function getSliverSide(slivers: Sliver[], point: Point): Point[] {
  for (const { sides } of slivers) {
    for (const [end, start] of sides) {
      if (end.isClose(point, GEOMETRIC_EPSILON)) return [start, point]
    }
  }
  return [point]
}

// Returns the times between the first and the last sample where the strips
// that getStrips() returns end and the next ones start, in their order:
// twice the same time where a strip folds over, as one of its ends turns back
// across it, and the times right before and after where the strips change,
// as their ends appear or vanish or two of them trade places, with the
// strips on both sides. The samples only need to be close enough to tell the
// strips at one from those at the next:
function getSplits(
  getStrips: (t: number) => Strip[],
  samples: number[]
): Split[] {
  const ta = samples[0]
  const tb = samples.at(-1)
  const splits: Split[] = [[ta, ta], [tb, tb]]
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
        splits.push([t, u, last.concat(next)])
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
  return splits.sort((a, b) => a[0] - b[0])
}

// The strip between the two sides, resolved. Between two lines, it is a
// quadrilateral, which only needs its orientation if neither its sides nor
// its ends cross:
function createStrip(side1: Side, side2: Side): RegionValues {
  const region = createRegion(joinSides(side1, side2))
  if (isLine(side1) && isLine(side2)) {
    const [from1, to1] = side1.map(([point]) => new Point(point))
    const [from2, to2] = side2.map(([point]) => new Point(point))
    const isCrossing = (p1: Point, p2: Point, p3: Point, p4: Point) =>
      !!Line.intersect(
        p1.x, p1.y, p2.x - p1.x, p2.y - p1.y,
        p3.x, p3.y, p4.x - p3.x, p4.y - p3.y,
        true
      )
    if (
      !isCrossing(from1, to1, from2, to2) &&
      !isCrossing(from1, from2, to1, to2)
    ) {
      return getPathArea(region.paths[0]) < 0
        ? createRegion(joinSides(side2, side1))
        : region
    }
  }
  return uniteRegions([region])
}

// Whether the side is one line, without handles:
function isLine(side: Side): boolean {
  return (
    side.length === 2 &&
    side.every(
      ([, handleIn, handleOut]) => (
        !handleIn[0] && !handleIn[1] && !handleOut[0] && !handleOut[1]
      )
    )
  )
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

// Whether the pen is the same at two offsets and doesn't change at either,
// and so not between them:
function isConstant(pen1: Pen, pen2: Pen): boolean {
  const isSteady = (pen: Pen) => (
    !pen.da &&
    !pen.db &&
    !pen.dAngle &&
    !pen.dda &&
    !pen.ddb &&
    !pen.ddAngle
  )
  return (
    pen1.a === pen2.a &&
    pen1.b === pen2.b &&
    pen1.angle === pen2.angle &&
    isSteady(pen1) &&
    isSteady(pen2)
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
      Math.max(getStripWidth(strip), getStripWidth(other)) / 2
    )
    return (
      getAngle(strip.from.phi, other.from.phi) < limit &&
      getAngle(strip.to.phi, other.to.phi) < limit
    )
  })
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
