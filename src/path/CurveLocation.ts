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

import {
  Base,
  CURVETIME_EPSILON,
  Curve,
  Formatter,
  GEOMETRIC_EPSILON,
  capitalize,
  inject
} from '../internal.ts'
import type { Point } from '../basic/Point.ts'
import type { Path } from './Path.ts'
import type { Segment } from './Segment.ts'

/**
 * CurveLocation objects describe a location on {@link Curve} objects, as
 *     defined by the curve-time {@link #time}, a value between `0` (beginning
 *     of the curve) and `1` (end of the curve). If the curve is part of a
 *     {@link Path} item, its {@link #index} inside the {@link Path#curves}
 *     array is also provided.
 *
 * The class is in use in many places, such as
 * {@link Path#getLocationAt(offset)},
 * {@link Path#getLocationOf(point)},
 * {@link PathItem#getNearestLocation(point)},
 * {@link PathItem#getIntersections(path)},
 * etc.
 */
export class CurveLocation extends Base {
  // The linked intersection location, set by Curve:
  _intersection: CurveLocation | null
  // Read by PathItem#getNearestLocation():
  _distance: number
  #curve: Curve | null
  #time: number | null
  #point: Point
  #overlap: boolean
  #path: Path | null
  #version: number
  #segment: Segment | null
  #segment1: Segment
  #segment2: Segment | null
  #offset: number | null
  #curveOffset: number | null

  // DOCS: CurveLocation class description: add these back when the mentioned
  // functioned have been added: {@link Path#split(location)}
  /**
   * Creates a new CurveLocation object.
   *
   * @param curve
   * @param time
   * @param point
   */
  constructor(
    curve: Curve,
    time: number,
    point?: Point | null,
    _overlap?: boolean,
    _distance?: number
  ) {
    super()
    let locationCurve = curve
    let locationTime = time
    // Merge intersections very close to the end of a curve with the
    // beginning of the next curve.
    if (time >= 1 - CURVETIME_EPSILON) {
      const { next } = curve
      if (next) {
        locationTime = 0
        locationCurve = next
      }
    }
    this.#setCurve(locationCurve)
    this.#time = locationTime
    this.#point = point ?? locationCurve.getPointAtTime(locationTime)
    this.#overlap = _overlap
    this._distance = _distance
    this._intersection = null
  }

  #setPath(path: Path | null) {
    // We only store the path to verify versions for cached values.
    // To ensure we use the right path (e.g. after splitting), we shall
    // always access the path on the result of #curve.
    this.#path = path
    this.#version = path?._version ?? 0
  }

  #setCurve(curve: Curve) {
    this.#setPath(curve._path)
    this.#curve = curve
    this.#segment = null // To be determined, see #segment
    // Also store references to segment1 and segment2, in case path
    // splitting / dividing is going to happen, in which case the segments
    // can be used to determine the new curves, see #curve
    this.#segment1 = curve._segment1
    this.#segment2 = curve._segment2
  }

  #setSegment(segment: Segment) {
    const { curve } = segment
    if (curve) {
      this.#setCurve(curve)
    } else {
      this.#setPath(segment._path)
      this.#segment1 = segment
      this.#segment2 = null
    }
    this.#segment = segment
    this.#time = segment === this.#segment1 ? 0 : 1
    // To avoid issues with imprecision in #curve / trySegment()
    this.#point = segment._point.clone()
  }

  /**
   * The segment of the curve which is closer to the described location.
   */
  get segment(): Segment {
    // Request curve first, so #segment gets invalidated if it's out of sync
    let segment = this.#segment
    if (!segment) {
      const { curve, time } = this
      if (time === 0) {
        segment = curve._segment1
      } else if (time === 1) {
        segment = curve._segment2
      } else if (time != null) {
        // Determine the closest segment by comparing curve lengths
        segment =
          (
            curve.getPartLength(0, time) <
            curve.getPartLength(time, 1)
          )
            ? curve._segment1
            : curve._segment2
      }
      this.#segment = segment
    }
    return segment
  }

  /**
   * The curve that this location belongs to.
   */
  get curve(): Curve {
    const path = this.#path
    if (path && path._version !== this.#version) {
      // If the path's segments have changed, clear the cached time and
      // offset values and force re-fetching of the correct curve.
      this.#time = this.#offset = this.#curveOffset = this.#curve = null
    }

    // If path is out of sync, access current curve objects through segment1
    // / segment2. Since path splitting or dividing might have happened in
    // the meantime, try segment1's curve, and see if #point lies on it
    // still, otherwise assume it's the curve before segment2.
    const trySegment = (segment: Segment | null) => {
      const curve = segment?.curve
      if (curve && (this.#time = curve.getTimeOf(this.#point)) != null) {
        // Fetch path again as it could be on a new one through split()
        this.#setCurve(curve)
        return curve
      }
    }

    return (
      this.#curve ||
      trySegment(this.#segment) ||
      trySegment(this.#segment1) ||
      trySegment(this.#segment2.previous)
    )
  }

  /**
   * The path that this locations is situated on.
   */
  get path(): Path {
    const { curve } = this
    return curve?._path ?? null
  }

  /**
   * The index of the {@link #curve} within the {@link Path#curves} list, if
   * it is part of a {@link Path} item.
   */
  get index(): number {
    const { curve } = this
    return curve?.index ?? null
  }

  /**
   * The curve-time parameter, as used by various bezier curve calculations.
   * It is value between `0` (beginning of the curve) and `1` (end of the
   * curve).
   */
  get time(): number {
    const { curve } = this
    const time = this.#time
    return curve && time == null
      ? (this.#time = curve.getTimeOf(this.#point))
      : time
  }

  /**
   * The point which is defined by the {@link #curve} and
   * {@link #time}.
   */
  get point(): Point {
    return this.#point
  }

  /**
   * The length of the path from its beginning up to the location described
   * by this object. If the curve is not part of a path, then the length
   * within the curve is returned instead.
   */
  get offset(): number {
    let offset = this.#offset
    if (offset == null) {
      offset = 0
      const { path, index } = this
      if (path && index != null) {
        const { curves } = path
        for (let i = 0; i < index; i++) {
          offset += curves[i].length
        }
      }
      this.#offset = offset += this.curveOffset
    }
    return offset
  }

  /**
   * The length of the curve from its beginning up to the location described
   * by this object.
   */
  get curveOffset(): number {
    let offset = this.#curveOffset
    if (offset == null) {
      const { curve, time } = this
      this.#curveOffset = offset = (
        time != null &&
        curve &&
        curve.getPartLength(0, time)
      )
    }
    return offset
  }

  /**
   * The curve location on the intersecting curve, if this location is the
   * result of a call to {@link PathItem#getIntersections(path)} /
   * {@link Curve#getIntersections(curve)}.
   */
  get intersection(): CurveLocation | null {
    return this._intersection
  }

  /**
   * The distance from the queried point to the returned location.
   *
   * @see Curve#getNearestLocation(point)
   * @see PathItem#getNearestLocation(point)
   */
  get distance(): number {
    return this._distance
  }

  // DOCS: divide(), split()

  divide(): Curve | null {
    const { curve } = this
    const res = curve?.divideAtTime(this.time) ?? null
    // Change to the newly inserted segment, also adjusts #time.
    if (res) {
      this.#setSegment(res._segment1)
    }
    return res
  }

  split(): Path | null {
    const { curve } = this
    const path = curve._path
    const res = curve?.splitAtTime(this.time) ?? null
    if (res) {
      // Set the segment to the end-segment of the path after splitting.
      this.#setSegment(path.lastSegment)
    }
    return res
  }

  /**
   * Checks whether tow CurveLocation objects are describing the same location
   * on a path, by applying the same tolerances as elsewhere when dealing with
   * curve-time parameters.
   *
   * @param location
   * @return {@true if the locations are equal}
   */
  equals(location: CurveLocation, _ignoreOther?: boolean): boolean {
    let res = this === location
    if (!res && location instanceof CurveLocation) {
      const c1 = this.curve
      const c2 = location.curve
      const p1 = c1._path
      const p2 = c2._path
      if (p1 === p2) {
        // instead of comparing curve-time, compare the actual offsets
        // of both locations to determine if they're in the same spot,
        // taking into account the wrapping around path ends. This is
        // necessary to avoid issues wit CURVETIME_EPSILON imprecisions.
        // The offsets differ at least by how far the points are apart,
        // both ways around the path, so we only measure them if close:
        const { abs } = Math
        const epsilon = GEOMETRIC_EPSILON
        const i1 = !_ignoreOther && this._intersection
        const i2 = !_ignoreOther && location._intersection
        const diff = this.point.isClose(location.point, epsilon)
          ? abs(this.offset - location.offset)
          : Infinity
        res = (
          (diff < epsilon || p1 && abs(p1.length - diff) < epsilon) &&
          // Compare the the other location, but prevent endless
          // recursion by passing `true` for _ignoreOther.
          (!i1 && !i2 || i1 && i2 && i1.equals(i2, true))
        )
      }
    }
    return res
  }

  /**
   * @return a string representation of the curve location
   */
  toString(): string {
    const parts = []
    const { point, index, time } = this
    const { instance } = Formatter
    if (point) {
      parts.push(`point: ${point}`)
    }
    if (index != null) {
      parts.push(`index: ${index}`)
    }
    if (time != null) {
      parts.push(`time: ${instance.number(time)}`)
    }
    if (this._distance != null) {
      parts.push(`distance: ${instance.number(this._distance)}`)
    }
    return `{ ${parts.join(', ')} }`
  }

  /**
   * {@grouptitle Tests}
   * Checks if the location is an intersection with another curve and is
   * merely touching the other curve, as opposed to crossing it.
   *
   * @return {@true if the location is an intersection that is
   * merely touching another curve}
   * @see #isCrossing()
   */
  isTouching(): boolean {
    const inter = this._intersection
    if (inter && this.tangent.isCollinear(inter.tangent)) {
      // Only consider two straight curves as touching if their lines
      // don't intersect.
      const curve1 = this.curve
      const curve2 = inter.curve
      return !(
        curve1.isStraight() &&
        curve2.isStraight() &&
        curve1.line.intersect(curve2.line)
      )
    }
    return false
  }

  /**
   * Checks if the location is an intersection with another curve and is
   * crossing the other curve, as opposed to just touching it.
   *
   * @return {@true if the location is an intersection that is
   * crossing another curve}
   * @see #isTouching()
   */
  isCrossing(): boolean {
    // Implementation loosely based on work by Andy Finnell:
    // http://losingfight.com/blog/2011/07/09/how-to-implement-boolean-operations-on-bezier-paths-part-3/
    // https://bitbucket.org/andyfinnell/vectorboolean
    const inter = this._intersection
    if (!inter) return false
    const t1 = this.time
    const t2 = inter.time
    const tMin = CURVETIME_EPSILON
    const tMax = 1 - tMin
    // t*Inside specifies if the found intersection is inside the curve.
    const t1Inside = t1 >= tMin && t1 <= tMax
    const t2Inside = t2 >= tMin && t2 <= tMax
    // If the intersection is in the middle of both paths, it is either a
    // tangent or a crossing, no need for the detailed corner check below:
    if (t1Inside && t2Inside) return !this.isTouching()
    // Now get the references to the 4 curves involved in the intersection:
    // - c1 & c2 are the curves on the first intersecting path, left and
    //   right of the intersection.
    // - c3 & c4 are the same for the second intersecting path.
    // - If the intersection is in the middle of the curve (t*Inside), then
    //   both values point to the same curve, and the curve-time is to be
    //   handled accordingly further down.
    let c2 = this.curve
    const c1 = c2 && t1 < tMin ? c2.previous : c2
    let c4 = inter.curve
    const c3 = c4 && t2 < tMin ? c4.previous : c4
    // If t1 / t2 are at the end, then step to the next curve.
    if (t1 > tMax) {
      c2 = c2.next
    }
    if (t2 > tMax) {
      c4 = c4.next
    }
    if (!c1 || !c2 || !c3 || !c4) return false

    // Calculate unambiguous angles for all 4 tangents at the intersection:
    // - If the intersection is inside a curve (t1 / t2Inside), the tangent
    //   at t1 / t2 is unambiguous, because the curve is continuous.
    // - If the intersection is on a segment, step away at equal offsets on
    //   each curve, to calculate unambiguous angles. The vector from the
    //   intersection to this new location is used to determine the angle.

    const offsets = []

    function addOffsets(curve: Curve, end: boolean) {
      // Find the largest offset of unambiguous direction on the curve,
      // taking their loops, cusps, inflections, and "peaks" into account.
      const v = curve.getValues()
      const roots = Curve.classify(v).roots ?? Curve.getPeaks(v)
      const count = roots.length
      const offset = Curve.getLength(
        v,
        end && count ? roots[count - 1] : 0,
        !end && count ? roots[0] : 1
      )
      // When no root was found, the full length was calculated. Use a
      // fraction of it. By trial & error, 64 was determined to work well.
      offsets.push(count ? offset : offset / 32)
    }

    function isInRange(angle: number, min: number, max: number) {
      return min < max
        ? angle > min && angle < max
        : // min > max: the range wraps around -180 / 180 degrees
          angle > min || angle < max
    }

    if (!t1Inside) {
      addOffsets(c1, true)
      addOffsets(c2, false)
    }
    if (!t2Inside) {
      addOffsets(c3, true)
      addOffsets(c4, false)
    }
    const pt = this.point
    // Determined the shared unambiguous offset by the taking the
    // shortest offsets on all involved curves that are unambiguous.
    const offset = Math.min(...offsets)
    const v2 = t1Inside
      ? c2.getTangentAtTime(t1)
      : c2.getPointAt(offset).subtract(pt)
    const v1 = t1Inside ? v2.negate() : c1.getPointAt(-offset).subtract(pt)
    const v4 = t2Inside
      ? c4.getTangentAtTime(t2)
      : c4.getPointAt(offset).subtract(pt)
    const v3 = t2Inside ? v4.negate() : c3.getPointAt(-offset).subtract(pt)
    const a1 = v1.angle
    const a2 = v2.angle
    const a3 = v3.angle
    const a4 = v4.angle
    // Count how many times curve2 angles appear between the curve1 angles.
    // If each pair of angles split the other two, then the edges cross.
    // Use t1Inside to decide which angle pair to check against.
    // If t1 is inside the curve, check against a3 & a4, otherwise a1 & a2.
    return !!(
      t1Inside
        ? (isInRange(a1, a3, a4) !== isInRange(a2, a3, a4)) &&
          (isInRange(a1, a4, a3) !== isInRange(a2, a4, a3))
        : (isInRange(a3, a1, a2) !== isInRange(a4, a1, a2)) &&
          (isInRange(a3, a2, a1) !== isInRange(a4, a2, a1))
    )
  }

  /**
   * Checks if the location is an intersection with another curve and is
   * part of an overlap between the two involved paths.
   *
   * @return {@true if the location is an intersection that is
   * part of an overlap between the two involved paths}
   * @see #isCrossing()
   * @see #isTouching()
   */
  hasOverlap(): boolean {
    return !!this.#overlap
  }

  static insert(
    locations: CurveLocation[],
    location: CurveLocation,
    merge: boolean
  ): CurveLocation {
    // Insert-sort by path-id, curve, time so we can easily merge
    // duplicates with calls to equals() after.
    const { length } = locations
    let l = 0
    let r = length - 1

    function search(index: number, dir: number) {
      // If we reach the beginning/end of the list, also compare with the
      // location at the other end, as paths are circular lists.
      // NOTE: When merging, the locations array will only contain
      // locations on the same path, so it is fine that check for the end
      // to address circularity. See PathItem#getIntersections()
      for (let i = index + dir; i >= -1 && i <= length; i += dir) {
        // Wrap the index around, to match the other ends:
        const other = locations[((i % length) + length) % length]
        // Once we're outside the spot, we can stop searching.
        if (!location.point.isClose(other.point, GEOMETRIC_EPSILON)) break
        if (location.equals(other)) return other
      }
      return null
    }

    while (l <= r) {
      const m = (l + r) >>> 1
      const other = locations[m]
      // See if the two locations are actually the same, and merge if
      // they are. If they aren't check the other neighbors with search()
      const found = (
        merge &&
        (location.equals(other) ? other : search(m, -1) ?? search(m, 1))
      )
      if (found) {
        // We're done, don't insert, merge with the found location
        // instead, and carry over overlap:
        if (location.#overlap) {
          found.#overlap = found._intersection.#overlap = true
        }
        return found
      }
      const path1 = location.path
      const path2 = other.path
      // NOTE: equals() takes the intersection location into account,
      // while this calculation of diff doesn't!
      const diff =
        path1 !== path2
          ? // Sort by path id to group all locs on same path.
            path1._id - path2._id
          : // Sort by both index and time on the same path. The two values
            // added together provides a convenient sorting index.
            location.index +
            location.time -
            (other.index + other.time)
      if (diff < 0) {
        r = m - 1
      } else {
        l = m + 1
      }
    }
    // We didn't merge with a preexisting location, insert it now.
    locations.splice(l, 0, location)
    return location
  }

  static expand(locations: CurveLocation[]): CurveLocation[] {
    // Create a copy since insert() keeps modifying the array and
    // inserting at sorted indices.
    const expanded = locations.slice()
    for (let i = locations.length - 1; i >= 0; i--) {
      CurveLocation.insert(expanded, locations[i]._intersection, false)
    }
    return expanded
  }

  static {
    // Inject the evaluators at the location's curve-time, next to #point.
    // NOTE: (For easier searching): This loop produces:
    // tangent, normal, weightedTangent, weightedNormal, curvature
    for (const key of [
      'tangent', 'normal', 'weightedTangent', 'weightedNormal', 'curvature'
    ]) {
      const evaluate = `get${capitalize(key)}AtTime`
      inject(this.prototype, {
        get [key]() {
          const { curve, time } = this
          return time != null && curve ? curve[evaluate](time) : null
        }
      })
    }
  }
}

// The members defined at runtime rather than in the class body:
export interface CurveLocation {
  /**
   * The tangential vector to the {@link #curve} at the given location.
   */
  get tangent(): Point

  /**
   * The normal vector to the {@link #curve} at the given location.
   */
  get normal(): Point

  /**
   * The weighted tangential vector to the {@link #curve} at the given
   * location, its length reflecting the curve velocity at that location.
   */
  get weightedTangent(): Point

  /**
   * The weighted normal vector to the {@link #curve} at the given location,
   * its length reflecting the curve velocity at that location.
   */
  get weightedNormal(): Point

  /**
   * The curvature of the {@link #curve} at the given location.
   */
  get curvature(): number
}
