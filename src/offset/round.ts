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

// The areas that a round pen of the stroke's radius sweeps, between the
// offsets of the curves on both sides, and the areas of tight turns after
// "Converting Stroked Primitives to Filled Primitives" by Diego Nehab.
import { GEOMETRIC_EPSILON, isZero } from '../util/numerical.ts'
import { Point } from '../basic/Point.ts'
import { Size } from '../basic/Size.ts'
import {
  getArcThrough,
  getCurvature,
  getCurveLength,
  getCurvePart,
  getCurveTangent,
  getEllipse
} from '../values/index.ts'
import type { CurveValues, SegmentValues } from '../values/index.ts'
import {
  getCuspTimes,
  getEvolute,
  getOffsetSegments,
  getTurn,
  joinSides
} from './curves.ts'
import { Sweep } from './sweep.ts'
import type { CurveParts, Part } from './sweep.ts'

const { abs } = Math

export class RoundSweep extends Sweep {
  // Makes segments smooth that are so within the tolerance, which moves the
  // curves less than it, as their joins would only add slivers, and their
  // parts' corners lie too close to tell apart:
  // @override
  readSegments(): SegmentValues[] {
    const { radius, tolerance } = this.stroke
    return super.readSegments().map(segment => {
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
  }

  // Curves that reverse along their line become straight parts between the
  // reversals, joined round, as the limit of a tight turn (kurbo's
  // do_linear()). The others are split where their offsets have cusps:
  // @override
  splitCurve(v: CurveValues, points: Point[]) {
    const parts: Part[] = []
    if (points.length > 2) {
      for (let i = 1, l = points.length; i < l; i++) {
        const p1 = points[i - 1]
        const p2 = points[i]
        parts.push({ v: [p1.x, p1.y, p1.x, p1.y, p2.x, p2.y, p2.x, p2.y] })
      }
      return {
        parts,
        start: points[1].subtract(points[0]).normalize(),
        end: points
          .at(-1)
          .subtract(points[points.length - 2])
          .normalize()
      }
    } else {
      const times = getCuspTimes(v, this.stroke.radius).concat(1)
      for (let i = 0, t0 = 0, l = times.length; i < l; i++) {
        const t = times[i]
        if (
          t === 1 || (
            !this.isSliver(v, t0, t) &&
            !this.isSliver(v, t, times[i + 1])
          )
        ) {
          parts.push({ v: getCurvePart(v, t0, t) })
          t0 = t
        }
      }
      return {
        parts,
        start: getCurveTangent(v, 0),
        end: getCurveTangent(v, 1)
      }
    }
  }

  // Tight parts whose normals turn by less than the tolerance at the radius
  // would only add slivers, so they stay with their neighbors, as do parts
  // shorter than it that turn as little. Other parts don't, as they would
  // lose their own sweeps to their neighbors' kind:
  isSliver(v: CurveValues, t1: number, t2: number): boolean {
    const { radius, tolerance } = this.stroke
    return (
      getTurn(v, t1, t2) * radius < tolerance && (
        abs(getCurvature(v, (t1 + t2) / 2)) * radius > 1 ||
        getCurveLength(v, t1, t2) < tolerance
      )
    )
  }

  // Adds the area between the offsets of the part. Where it turns more
  // tightly than the radius, the inner side sweeps backwards beyond the
  // evolute, so we split it there into two areas (Nehab):
  // @override
  addPart({ v }: Part) {
    const { radius, tolerance } = this.stroke
    const curvature = getCurvature(v, 0.5)
    if (abs(curvature) * radius > 1) {
      // The centers of curvature lie against the normals:
      const inner = curvature > 0 ? -radius : radius
      const evolute = getEvolute(v, inner, tolerance)
      this.addArea(joinSides(getOffsetSegments(v, -inner, tolerance), evolute))
      this.addArea(joinSides(getOffsetSegments(v, inner, tolerance), evolute))
    } else {
      this.addArea(
        joinSides(
          getOffsetSegments(v, radius, tolerance),
          getOffsetSegments(v, -radius, tolerance)
        )
      )
    }
  }

  // The turn sweeps a whole circle, ahead of it and behind, in two halves
  // that end at the parts' sides:
  // @override
  addTurn({ v }: Part) {
    const p1 = new Point(v[0], v[1])
    const p2 = new Point(v[6], v[7])
    const tangent = p2.subtract(p1).normalize()
    const normal = new Point(-tangent.y, tangent.x).multiply(this.stroke.radius)
    this.addSector(p2, normal, normal.negate(), tangent)
    this.addSector(p2, normal.negate(), normal, tangent.negate())
  }

  // Adds the join at the start of the second curve, between their
  // directions, on the outer side of their turn:
  // @override
  addJoin({ end: tangent1 }: CurveParts<Part>, curve2: CurveParts<Part>) {
    const { radius, tolerance, join, miterLimit } = this.stroke
    const { curve, start: tangent2 } = curve2
    const point = new Point(curve[0], curve[1])
    // Paper.js's normals, to tell the outer side by their angle:
    let normal1 = new Point(tangent1.y, -tangent1.x).multiply(radius)
    let normal2 = new Point(tangent2.y, -tangent2.x).multiply(radius)
    const angle = normal1.getDirectedAngle(normal2)
    if (!isZero(tangent1.cross(tangent2)) || tangent1.dot(tangent2) < 0) {
      if (angle < 0) {
        normal1 = normal1.negate()
        normal2 = normal2.negate()
      }
      // Widen the join into the parts on both sides, so that it overlaps
      // them rather than sharing edges that the union can't tell apart at
      // small angles. Its arc stays within the tolerance of their offsets
      // there:
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
        this.addSector(point, outer1, outer2, direction)
      } else {
        const length = radius / Math.cos(abs(angle) * Math.PI / 360)
        const points = [point, point.add(outer1), point.add(normal1)]
        if (join === 'miter' && length <= miterLimit * radius) {
          points.push(point.add(direction.normalize(length)))
        }
        this.addPolygon(points.concat(point.add(normal2), point.add(outer2)))
      }
    }
  }

  // @override
  addCap({ curve }: CurveParts<Part>, atEnd: boolean, tangent: Point) {
    const { radius, cap } = this.stroke
    const point = atEnd
      ? new Point(curve[6], curve[7])
      : new Point(curve[0], curve[1])
    const normal = new Point(-tangent.y, tangent.x).multiply(radius)
    if (cap === 'round') {
      this.addSector(point, normal, normal.negate(), tangent)
    } else if (cap === 'square') {
      const ahead = tangent.multiply(radius)
      this.addPolygon([
        point.add(normal),
        point.add(normal).add(ahead),
        point.subtract(normal).add(ahead),
        point.subtract(normal)
      ])
    }
  }

  // A dot is a circle or a square:
  // @override
  addDot(center: Point) {
    const { radius, cap } = this.stroke
    if (cap === 'round') {
      this.addArea(getEllipse(center, new Size(radius, radius)))
    } else {
      const { x: left, y: top } = center.subtract(radius)
      const right = left + 2 * radius
      const bottom = top + 2 * radius
      this.addArea([[left, top], [right, top], [right, bottom], [left, bottom]])
    }
  }

  // Adds a round join or cap as the sector of the circle between the
  // normals, which ends where the sides of the parts do, instead of crossing
  // them at shallow angles as a whole circle would:
  addSector(point: Point, normal1: Point, normal2: Point, direction: Point) {
    this.addArea([
      [point.x, point.y],
      ...getArcThrough(
        point.add(normal1),
        point.add(direction.normalize(this.stroke.radius)),
        point.add(normal2)
      )
    ])
  }
}
