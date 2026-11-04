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

import { Change } from '../constants.ts'
import { CURVETIME_EPSILON } from '../util/numerical.ts'
import { equals, inject } from '../util/object.ts'
import { StrokeProfileStop } from './StrokeProfileStop.ts'
import type { StrokeProfileStopProps } from './StrokeProfileStop.ts'
import type { Path } from './Path.ts'

// The stroke profiles of paths, see Path#strokeProfile. Each stop keeps its
// position as the index of the segment before it plus the fraction of the arc
// length to the next segment, so that it stays between the same segments when
// they move. The methods that insert, remove or reverse segments update the
// indices, and those that keep the shape of the path, splitAt() and join(),
// move the stops by their offsets.

const tMin = CURVETIME_EPSILON
const tMax = 1 - tMin
// The values of the pen, with their defaults where no stop sets them:
const defaults = { width: 1, aspect: 1, angle: 0 }

// A stop of the profile by its offset, see getEntries():
type Entry = {
  offset: number
  width?: number | null
  aspect?: number | null
  angle?: number | null
  smooth?: boolean
}

// A stroke profile taken off a path, see Path#_takeStrokeProfile():
type ProfilePart = { entries: Entry[]; length: number; closed: boolean }

// The values of the pen with their first and second derivatives along the
// path, see Path#_getStrokeProfileValues():
type PenValues = { width: number[]; aspect: number[]; angle: number[] }

/**
 * Adds the stroke profile to Path, see {@link Path#strokeProfile}. Path calls
 * it from its static block.
 *
 * @private
 */
export function defineStrokeProfile(ctor: typeof Path) {
  inject(ctor.prototype, {
    _strokeProfile: null,

    get strokeProfile() {
      return this._strokeProfile
    },

    set strokeProfile(stops) {
      const previous = this._strokeProfile
      let profile = null
      if (stops?.length) {
        profile = stops.map(value => {
          const stop =
            value instanceof StrokeProfileStop
              ? value._path && value._path !== this
                ? value.clone()
                : value
              : new StrokeProfileStop(value)
          if (stop._path !== this) {
            stop._index ??= this._getIndexAt(stop._offset)
            stop._path = this
          }
          return stop
        })
      }
      // The stops that the path no longer has keep their offsets:
      for (const stop of previous || []) {
        if (!profile?.includes(stop)) {
          stop._offset = stop.offset
          stop._index = stop._path = null
        }
      }
      this._strokeProfile = profile
      if (profile) {
        this._sortStrokeProfile()
      }
      this._changed(Change.STROKE)
    },

    getStrokeProfileAt(this: Path, offset: number): StrokeProfileStop {
      const values = getValues(
        getEntries(this),
        offset,
        this.length,
        this._closed,
        true
      )
      for (const [key, value] of Object.entries(defaults)) {
        values[key] ??= value
      }
      return new StrokeProfileStop(values)
    },

    // Returns the pens all along the path, as entries with all values at
    // its ends and at the offsets of the stops, where the curves of the
    // values change. Steps have two entries at the same offset. See
    // PathItem#outline():
    _getStrokeProfilePens(this: Path): Entry[] {
      const entries = getEntries(this)
      const { length, _closed: closed } = this
      const pens = []

      const getPen = (offset: number, after: boolean) => {
        const values = getValues(entries, offset, length, closed, after)
        for (const [key, value] of Object.entries(defaults)) {
          values[key] ??= value
        }
        return values
      }

      const offsets = [0, ...entries.map(entry => entry.offset), length]
      for (let i = 0, l = offsets.length; i < l; i++) {
        const offset = offsets[i]
        if (!i || offset > offsets[i - 1]) {
          if (offset > 0) {
            pens.push(getPen(offset, false))
          }
          if (offset < length) {
            const pen = getPen(offset, true)
            if (!offset || !equals(pen, pens[pens.length - 1])) {
              pens.push(pen)
            }
          }
        }
      }
      return pens
    },

    // Returns a function that returns the values of the pen at an offset
    // with their first and second derivatives, as { width: [value, d1,
    // d2], aspect, angle }, see PathItem#outline():
    _getStrokeProfileValues(
      this: Path
    ): (offset: number, after: boolean) => PenValues {
      const entries = getEntries(this)
      const { length, _closed: closed } = this
      return (offset, after) => {
        const values = {} as PenValues
        for (const [key, value] of Object.entries(defaults)) {
          values[key] = getValue(
            entries,
            key,
            offset,
            length,
            closed,
            after
          ) || [
            value,
            0,
            0
          ]
        }
        return values
      }
    },

    // Returns the index of the stop at the offset: the index of the
    // segment before it plus the fraction of the arc length to the next
    // segment. Offsets wrap around closed paths, and stay within open
    // ones:
    _getIndexAt(this: Path, offset: number): number {
      const { length } = this
      const position = this._closed
        ? length
          ? (offset % length + length) % length
          : 0
        : Math.min(Math.max(offset, 0), length)
      const location = this.getLocationAt(position)
      if (location) {
        const { time } = location
        const curveLength = location.curve.length
        return (
          location.index + (
            time < tMin || !curveLength
              ? 0
              : time > tMax
                ? 1
                : location.curveOffset / curveLength
          )
        )
      }
      return this.curves.length
    },

    _getOffsetAtIndex(this: Path, index: number): number {
      const { curves } = this
      const i = Math.floor(index)
      let offset = 0
      for (let j = 0, l = Math.min(i, curves.length); j < l; j++) {
        offset += curves[j].length
      }
      return i < curves.length
        ? offset + (index - i) * curves[i].length
        : offset
    },

    _sortStrokeProfile(this: Path) {
      this._strokeProfile.sort((a, b) => a._index - b._index)
    },

    // Keeps the stops that the callback returns true for, and lets go of
    // the others:
    _filterStrokeProfile(
      this: Path,
      callback: (stop: StrokeProfileStop) => boolean
    ) {
      this.strokeProfile = this._strokeProfile.filter(callback)
    },

    // Moves the stops after segments were inserted at the index, keeping
    // the ones on the curve that the segments divide at the same fraction
    // of its length, see #_add():
    _insertStrokeProfile(this: Path, index: number, amount: number) {
      const profile = this._strokeProfile
      const count = this._segments.length - amount
      const closed = this._closed
      // The curve that the segments divide, if any:
      const divided = closed
        ? (index + count - 1) % count
        : index > 0 && index < count
          ? index - 1
          : -1
      // Its first segment's index after the insertion:
      const start = divided < index ? divided : divided + amount
      if (count) {
        for (const stop of profile) {
          const x = stop._index
          if (divided >= 0 && x > divided && x < divided + 1) {
            stop._index = getSpanIndex(this, start, amount + 1, x - divided)
          } else if (x >= index) {
            stop._index = x + amount
          }
        }
        this._sortStrokeProfile()
      }
    },

    // Moves the stops before the segments from start to end are removed,
    // keeping the ones between the segments that remain around them at the
    // same fraction of the length there, which becomes one curve. The ones
    // beyond the new ends of open paths go. See #removeSegments():
    _removeStrokeProfile(this: Path, start: number, end: number) {
      const count = this._segments.length
      const closed = this._closed
      const amount = end - start
      const { curves } = this
      // The segment before the removed ones, and its index after:
      const before = closed ? (start + count - 1) % count : start - 1
      const index = before < start ? before : before - amount
      const span = amount + 1

      const isKept = (stop: StrokeProfileStop) => {
        const x = stop._index
        return closed
          ? amount < count
          : start
            ? end < count || x <= before
            : x >= end
      }

      this._filterStrokeProfile(isKept)
      const profile = this._strokeProfile || []
      for (const stop of profile) {
        const x = stop._index
        // How far the stop lies from the segment before:
        const d = closed ? (x - before + count) % count : x - before
        if (before >= 0 && d > 0 && d < span) {
          let position = 0
          let total = 0
          for (let j = 0; j < span; j++) {
            const { length } = curves[(before + j) % curves.length]
            if (j < Math.floor(d)) {
              position += length
            } else if (j === Math.floor(d)) {
              position += (d - j) * length
            }
            total += length
          }
          stop._index = index + (total ? position / total : d / span)
        } else if (x >= end) {
          stop._index = x - amount
        }
      }
      if (profile.length) {
        this._sortStrokeProfile()
      }
    },

    // Moves the stops after the segments were reversed, see #reverse():
    _reverseStrokeProfile(this: Path) {
      const profile = this._strokeProfile
      const count = this._segments.length
      for (const stop of profile) {
        stop._index = this._closed
          ? (2 * count - 1 - stop._index) % count
          : count - 1 - stop._index
      }
      // Keep the order of steps reversed too:
      profile.reverse()
      this._sortStrokeProfile()
    },

    // Takes the stroke profile off the path, as entries by offset, for
    // methods that move it by offsets, see #_setStrokeProfileParts():
    _takeStrokeProfile(this: Path): ProfilePart {
      const part = {
        entries: getEntries(this),
        length: this.length,
        closed: this._closed
      }
      if (this._strokeProfile) {
        this.strokeProfile = null
      }
      return part
    },

    // Sets the stroke profile from parts taken off paths, see
    // #_takeStrokeProfile(), which now follow each other along the path,
    // the first at its start and the last at its end. Where they meet,
    // each keeps its values there as a stop:
    _setStrokeProfileParts(this: Path, parts: ProfilePart[]) {
      const { length, _closed: closed } = this
      const entries = []
      // Where the parts meet, the values that only some of them set
      // are the defaults in the others:
      const fallbacks = {}
      for (const part of parts) {
        for (const entry of part.entries) {
          for (const [key, value] of Object.entries(defaults)) {
            if (entry[key] != null) {
              fallbacks[key] = value
            }
          }
        }
      }
      for (let i = 0, l = parts.length; i < l; i++) {
        const part = parts[i]
        const start = i ? length - part.length : 0
        const hasStart = closed || i > 0
        const hasEnd = closed || i < l - 1
        if (part.entries.length || l > 1 || closed) {
          const shifted = getPart(
            part.entries, 0, part.length, part.length, part.closed,
            hasStart, hasEnd, fallbacks
          )
          for (const entry of shifted) {
            entry.offset += start
            entries.push(entry)
          }
        }
      }
      // On closed paths, the values before the end come first:
      if (closed && entries.length) {
        entries.unshift(entries.pop())
      }
      this.strokeProfile = entries
    },

    // Sets the stroke profile from a part of a profile taken off the path,
    // see #_takeStrokeProfile(), between two offsets on it:
    _setStrokeProfilePart(
      this: Path,
      part: ProfilePart,
      from: number,
      to: number
    ) {
      const { length, closed } = part
      this.strokeProfile = getPart(
        part.entries, from, to, length, closed,
        closed || from > 0, closed || to < length
      )
    }
  })
}

declare module './Path.ts' {
  interface Path {
    // The stops of the stroke profile, null without one (a prototype
    // default):
    _strokeProfile: StrokeProfileStop[] | null

    /**
     * The stroke profile of the path: the stops along it that set the pen
     * that draws its stroke, an ellipse with a width, as a factor of its
     * {@link Style#strokeWidth}, an aspect and an angle, see
     * {@link StrokeProfileStop}. The stops are sorted by their offsets.
     * Between the stops that set a value, it changes along the path,
     * easing into and out of smooth stops and in straight lines from the
     * others, see {@link StrokeProfileStop#smooth}, and beyond the ends
     * of open paths, it stays as at the first and last of them. Two stops
     * at the same offset make a step. The stops stay between the same
     * segments when they move. Without a stroke profile, the stroke is
     * drawn with a round pen of the stroke width all along.
     *
     * It is a property of the path, not of its style, as it is tied to
     * its segments. It can be set to stops or plain objects describing
     * them, `{ offset, width, aspect, angle, smooth }`, and JSON stores
     * them with the indices that tie them to the segments instead of
     * their offsets, `{ index, width, aspect, angle, smooth }`. Changing
     * the returned array directly isn't tracked, as with
     * {@link #segments}.
     *
     * The path draws its stroke as the area that the pens sweep, filled
     * with the stroke color, as {@link PathItem#outline()} returns it,
     * and {@link Item#strokeBounds} and hit-testing measure that area.
     * The children of compound paths are drawn with the stroke of their
     * parent, without their profiles. With {@link Style#strokeScaling}
     * off, the profile scales with the view. {@link PathItem#offset()},
     * the boolean operations, {@link PathItem#interpolate()} and SVG
     * export return paths without the profile.
     *
     * @example
     * var path = new Path.Line([20, 50], [180, 50]);
     * path.strokeColor = 'black';
     * path.strokeWidth = 10;
     * // Taper the stroke from half its width to twice its width:
     * path.strokeProfile = [
     *     { offset: 0, width: 0.5 },
     *     { offset: path.length, width: 2 }
     * ];
     * console.log(path.getStrokeProfileAt(80).width); // 1.25
     */
    get strokeProfile(): StrokeProfileStop[] | null
    set strokeProfile(
      stops: (StrokeProfileStop | StrokeProfileStopProps)[] | null
    )

    /**
     * Returns the pen of the {@link #strokeProfile} at the given offset
     * along the path, as a stop that isn't on the path, with all its
     * values: its width as a factor of the {@link Style#strokeWidth}, its
     * aspect and its angle, `1`, `1` and `0` where no stop sets them.
     * Where the profile has a step, it returns the values after it. Adding
     * the stop to the profile keeps the values at the offset, and where
     * they change in straight lines, also around it if the stop isn't
     * smooth. As a smooth stop, the values ease into it and out of it.
     *
     * @param offset the offset on the path, where `0` is at the
     *     beginning of the path and {@link Path#length} at the end
     * @return the pen at the offset
     *
     * @example
     * var path = new Path.Line([20, 50], [180, 50]);
     * path.strokeProfile = [
     *     { offset: 0, width: 0.5 },
     *     { offset: path.length, width: 2, angle: 90 }
     * ];
     * // Add a stop halfway, with the values there:
     * var stop = path.getStrokeProfileAt(path.length / 2);
     * console.log(stop.width, stop.aspect, stop.angle); // 1.25 1 90
     * path.strokeProfile = path.strokeProfile.concat(stop);
     */
    getStrokeProfileAt(offset: number): StrokeProfileStop

    _getStrokeProfilePens(): Entry[]
    _getStrokeProfileValues(): (offset: number, after: boolean) => PenValues
    _getIndexAt(offset: number): number
    _getOffsetAtIndex(index: number): number
    _sortStrokeProfile(): void
    _filterStrokeProfile(callback: (stop: StrokeProfileStop) => boolean): void
    _insertStrokeProfile(index: number, amount: number): void
    _removeStrokeProfile(start: number, end: number): void
    _reverseStrokeProfile(): void
    _takeStrokeProfile(): ProfilePart
    _setStrokeProfileParts(parts: ProfilePart[]): void
    _setStrokeProfilePart(part: ProfilePart, from: number, to: number): void
  }
}

// Returns the stops of the path as { offset, width, aspect, angle,
// smooth } entries in order:
function getEntries(path: Path): Entry[] {
  return (path._strokeProfile || []).map(stop => ({
    offset: stop.offset,
    width: stop._width,
    aspect: stop._aspect,
    angle: stop._angle,
    smooth: stop._smooth
  }))
}

// Returns the value of the entries that set it at the offset, with its
// first and second derivatives along the path, as [value, d1, d2], or null
// if none sets it. Between two entries, it follows the cubic with their
// values and slopes, see StrokeProfileStop#smooth. It wraps around the end
// of closed paths, and stays as the nearest entry beyond the ends of open
// ones. Where a step lies at the offset, `after` picks the side after it:
function getValue(
  entries: Entry[], key: string, offset: number, length: number,
  closed: boolean, after: boolean
): number[] | null {
  const stops = entries.filter(entry => entry[key] != null)
  const count = stops.length
  let index = -1

  // The stop at the index, also beyond the ends of closed paths:
  const getStop = (index: number) => {
    const turns = Math.floor(index / count)
    const stop = stops[index - turns * count]
    return {
      offset: stop.offset + turns * length,
      value: stop[key],
      smooth: stop.smooth
    }
  }

  // The slope at the stop, towards the next stop or the previous one:
  // flat at smooth stops, so that each stop only shapes the curves on
  // either side of it, and straight on to the other stop otherwise:
  const getSlope = (index: number, forward: boolean) => {
    const stop = getStop(index)
    const other = getStop(forward ? index + 1 : index - 1)
    return stop.smooth
      ? 0
      : (other.value - stop.value) / (other.offset - stop.offset)
  }

  if (count) {
    for (let i = 0; i < count; i++) {
      const stopOffset = stops[i].offset
      if (stopOffset < offset || stopOffset === offset && after) {
        index = i
      }
    }
    if (closed || index >= 0 && index < count - 1) {
      // The cubic Hermite curve between the stops around the offset:
      const stop1 = getStop(index)
      const stop2 = getStop(index + 1)
      const h = stop2.offset - stop1.offset
      const t = (offset - stop1.offset) / h
      const v1 = stop1.value
      const v2 = stop2.value
      const m1 = getSlope(index, true) * h
      const m2 = getSlope(index + 1, false) * h
      return [
        ((2 * t - 3) * t * t + 1) * v1 +
        ((t - 2) * t + 1) * t * m1 +
          (3 - 2 * t) * t * t * v2 +
          (t - 1) * t * t * m2,
        (
          6 * (t - 1) * t * (v1 - v2) +
          ((3 * t - 4) * t + 1) * m1 +
          (3 * t - 2) * t * m2
        ) /
        h,
        ((12 * t - 6) * (v1 - v2) + (6 * t - 4) * m1 + (6 * t - 2) * m2) /
        (h * h)
      ]
    }
    return [stops[index < 0 ? 0 : count - 1][key], 0, 0]
  }
  return null
}

// Returns the values of the entries at the offset, as an entry:
function getValues(
  entries: Entry[], offset: number, length: number,
  closed: boolean, after: boolean
): Entry {
  const values = { offset }
  for (const key of Object.keys(defaults)) {
    const value = getValue(entries, key, offset, length, closed, after)
    values[key] = value && value[0]
  }
  return values
}

// Returns the entries from one offset to another, relative to the first,
// wrapping around closed paths. Where the part ends within the path, its
// values there are added as entries, so that the part keeps them, with
// the fallbacks for the ones that it doesn't set. These entries are as
// smooth as a stop there, and otherwise not, so that values in straight
// lines stay as they are:
function getPart(
  entries: Entry[], from: number, to: number, length: number,
  closed: boolean, hasStart: boolean, hasEnd: boolean,
  fallbacks: Record<string, number> = {}
): Entry[] {
  const getEnd = (offset: number, after?: boolean) => {
    const values = getValues(entries, offset, length, closed, after)
    for (const [key, value] of Object.entries(fallbacks)) {
      values[key] ??= value
    }
    let stop = null
    for (const entry of entries) {
      if (entry.offset === offset && (after || !stop)) {
        stop = entry
      }
    }
    values.smooth = !!stop && stop.smooth
    return values
  }

  const part = []
  for (const entry of entries) {
    let { offset } = entry
    if (closed && offset < from) {
      offset += length
    }
    if (
      (offset > from || offset === from && !hasStart) &&
      (offset < to || offset === to && !hasEnd)
    ) {
      part.push({ ...entry, offset: offset - from })
    }
  }
  part.sort((a, b) => a.offset - b.offset)
  if (hasStart) {
    part.unshift({ ...getEnd(from, true), offset: 0 })
  }
  if (hasEnd) {
    part.push({ ...getEnd(closed ? to % length : to), offset: to - from })
  }
  return part
}

// Returns the index at the fraction of the length of the curves from the
// one at start on, wrapping around closed paths:
function getSpanIndex(
  path: Path, start: number, count: number, fraction: number
): number {
  const { curves } = path
  const lengths = []
  let total = 0
  for (let i = 0; i < count; i++) {
    const { length } = curves[(start + i) % curves.length]
    lengths.push(length)
    total += length
  }
  let rest = fraction * total
  let i = 0
  while (i < count - 1 && rest >= lengths[i]) {
    rest -= lengths[i++]
  }
  const index = (
    start +
    i +
    (lengths[i] ? Math.min(rest / lengths[i], 1) : 0)
  )
  return path._closed ? index % curves.length : index
}
