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

// The areas that strokes sweep along paths: the parts of their curves, the
// turns where curves reverse along their lines, the joins between curves and
// the caps of open paths, or the dots of paths without length. Subclasses
// sweep them with their kind of pen.
import { GEOMETRIC_EPSILON } from '../util/numerical.ts'
import { Point } from '../basic/Point.ts'
import {
  getCurveLength,
  getCurvePoint,
  getCurveReversals
} from '../curve/index.ts'
import type { CurveValues, SegmentValues } from '../curve/index.ts'
import {
  createRegion,
  getPathSegments,
  getStrokeCurves
} from '../data/region.ts'
import type { PathValues, RegionValues } from '../data/region.ts'
import { regularize } from './curves.ts'

// The stroke to outline, with the tolerance of its outline:
export type Stroke = {
  radius: number
  tolerance: number
  join: string
  cap: string
  miterLimit: number
}

// A part of a curve, as its values:
export type Part = { v: CurveValues }

// A curve of the path as its parts, with its directions at its ends, and
// whether it reverses along its line between them:
export type CurveParts<P extends Part> = {
  curve: CurveValues
  parts: P[]
  reverses: boolean
  start: Point
  end: Point
}

export abstract class Sweep<P extends Part = Part> {
  path: PathValues
  stroke: Stroke
  areas: RegionValues[] = []
  curves: CurveParts<P>[] = []
  parts: P[] = []
  length = 0

  constructor(path: PathValues, stroke: Stroke) {
    this.path = path
    this.stroke = stroke
  }

  // Returns the areas that the stroke sweeps along the path:
  sweep(): RegionValues[] {
    const { closed } = this.path
    const { tolerance, cap } = this.stroke
    const segments = this.readSegments()
    for (const curve of getStrokeCurves({ segments, closed })) {
      const length = getCurveLength(curve)
      if (length > GEOMETRIC_EPSILON) {
        const v = regularize(curve, tolerance / 4)
        // The ends of the curve, and the points where a curve along a line
        // reverses along it, between straight runs:
        const points = [new Point(v[0], v[1])]
        for (const t of getCurveReversals(v, tolerance)) {
          points.push(getCurvePoint(v, t))
        }
        points.push(new Point(v[6], v[7]))
        const ends = this.splitCurve(v, points, this.length, length)
        this.curves.push({ curve, reverses: points.length > 2, ...ends })
        this.parts.push(...ends.parts)
      }
      this.length += length
    }
    const { curves } = this
    if (!this.length) {
      // A dot, as caps only apply to open paths:
      if (segments.length && !closed && cap !== 'butt') {
        this.addDot(new Point(segments[0][0]))
      }
    } else {
      for (const { parts, reverses } of curves) {
        for (const part of parts) {
          this.addPart(part)
        }
        if (reverses) {
          for (let i = 1, l = parts.length; i < l; i++) {
            this.addTurn(parts[i - 1], parts[i])
          }
        }
      }
      this.addStops()
      for (let i = 1, l = curves.length; i <= l; i++) {
        if (i < l || closed) {
          this.addJoin(curves[i - 1], curves[i % l])
        }
      }
      if (!closed && curves.length) {
        const first = curves[0]
        const last = curves[curves.length - 1]
        this.addCap(first, false, first.start.negate())
        this.addCap(last, true, last.end)
      }
    }
    return this.areas
  }

  // @overridable
  readSegments(): SegmentValues[] {
    return getPathSegments(this.path)
  }

  // Returns the parts of the curve with the values v, from the offset along
  // the path, and its directions at its ends. `points` holds the ends of the
  // curve, and the points where it reverses between straight runs:
  abstract splitCurve(
    v: CurveValues,
    points: Point[],
    offset: number,
    length: number
  ): { parts: P[]; start: Point; end: Point }

  abstract addPart(part: P): void

  // Adds the turn where the straight runs of a curve reverse:
  abstract addTurn(part1: P, part2: P): void

  // @overridable
  addStops() {
    // Only pens that change along the path have stops.
  }

  // Adds the join between the curves, unless they continue each other:
  abstract addJoin(curve1: CurveParts<P>, curve2: CurveParts<P>): void

  // Adds the cap at the start or the end of the curve, in the direction of
  // the tangent:
  abstract addCap(curve: CurveParts<P>, atEnd: boolean, tangent: Point): void

  abstract addDot(center: Point): void

  addArea(segments: PathValues['segments']) {
    this.areas.push(createRegion(segments))
  }

  addPolygon(points: Point[]) {
    this.addArea(points.map(({ x, y }) => [x, y]))
  }
}
