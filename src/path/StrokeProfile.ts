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
  CURVETIME_EPSILON,
  Change,
  StrokeProfileStop,
  equals
} from '../internal.ts'
import type { Path } from './Path.ts'
import type { StrokeProfileStopProps } from './StrokeProfileStop.ts'

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

// A stroke profile taken off a path, see takeStrokeProfile():
export type ProfilePart = { entries: Entry[]; length: number; closed: boolean }

// The values of the pen with their first and second derivatives along the
// path, see StrokeProfile#getValues():
export type PenValues = { width: number[]; aspect: number[]; angle: number[] }

/**
 * The stroke profile of a path, see {@link Path#strokeProfile}. Each stop
 * keeps its position as the index of the segment before it plus the fraction
 * of the arc length to the next segment, so that it stays between the same
 * segments when they move. The path updates the indices when it inserts,
 * removes or reverses segments, and the methods that keep its shape,
 * {@link Path#splitAt()} and {@link Path#join()}, move the stops by their
 * offsets.
 *
 * @private
 */
export class StrokeProfile {
  _path: Path
  _stops: StrokeProfileStop[]

  constructor(
    path: Path,
    stops: (StrokeProfileStop | StrokeProfileStopProps)[]
  ) {
    this._path = path
    this._stops = stops.map(value => {
      const stop =
        value instanceof StrokeProfileStop
          ? value._path && value._path !== path
            ? value.clone()
            : value
          : new StrokeProfileStop(value)
      if (stop._path !== path) {
        stop._index ??= this.getIndexAt(stop._offset)
        stop._path = path
      }
      return stop
    })
    this.sort()
  }

  // Returns the pens all along the path, as entries with all values at its
  // ends and at the offsets of the stops, where the curves of the values
  // change. Steps have two entries at the same offset. See
  // PathItem#outline():
  getPens(): Entry[] {
    const path = this._path
    const entries = getEntries(path)
    const { length, _closed: closed } = path
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
  }

  // Returns a function that returns the values of the pen at an offset with
  // their first and second derivatives, as { width: [value, d1, d2], aspect,
  // angle }, see PathItem#outline():
  getValues(): (offset: number, after: boolean) => PenValues {
    const path = this._path
    const entries = getEntries(path)
    const { length, _closed: closed } = path
    return (offset, after) => {
      const values = {} as PenValues
      for (const [key, value] of Object.entries(defaults)) {
        values[key] = getValue(entries, key, offset, length, closed, after) || [
          value,
          0,
          0
        ]
      }
      return values
    }
  }

  // Returns the index of the stop at the offset: the index of the segment
  // before it plus the fraction of the arc length to the next segment.
  // Offsets wrap around closed paths, and stay within open ones:
  getIndexAt(offset: number): number {
    const path = this._path
    const { length } = path
    offset = path._closed
      ? length
        ? (offset % length + length) % length
        : 0
      : Math.min(Math.max(offset, 0), length)
    const loc = path.getLocationAt(offset)
    if (loc) {
      const { time } = loc
      const curveLength = loc.curve.length
      return (
        loc.index + (
          time < tMin || !curveLength
            ? 0
            : time > tMax
              ? 1
              : loc.curveOffset / curveLength
        )
      )
    }
    return path.curves.length
  }

  getOffsetAt(index: number): number {
    const { curves } = this._path
    const i = Math.floor(index)
    let offset = 0
    for (let j = 0, l = Math.min(i, curves.length); j < l; j++) {
      offset += curves[j].length
    }
    return i < curves.length
      ? offset + (index - i) * curves[i].length
      : offset
  }

  sort() {
    this._stops.sort((a, b) => a._index - b._index)
  }

  // Keeps the stops that the callback returns true for, and lets go of the
  // others:
  filter(callback: (stop: StrokeProfileStop) => boolean) {
    const path = this._path
    const stops = this._stops.filter(callback)
    this.release(stops)
    this._stops = stops
    if (!stops.length) {
      path._strokeProfile = null
    }
    path._changed(Change.STROKE)
  }

  // Lets go of the stops that aren't among the given ones, which keep their
  // offsets:
  release(stops: StrokeProfileStop[]) {
    for (const stop of this._stops) {
      if (!stops.includes(stop)) {
        stop._offset = stop.offset
        stop._index = stop._path = null
      }
    }
  }

  // Moves the stops after segments were inserted at the index, keeping the
  // ones on the curve that the segments divide at the same fraction of its
  // length, see Path#_add():
  insert(index: number, amount: number) {
    const path = this._path
    const count = path._segments.length - amount
    // The curve that the segments divide, if any:
    const divided = path._closed
      ? (index + count - 1) % count
      : index > 0 && index < count
        ? index - 1
        : -1
    // Its first segment's index after the insertion:
    const start = divided < index ? divided : divided + amount
    if (count) {
      for (const stop of this._stops) {
        const x = stop._index
        if (divided >= 0 && x > divided && x < divided + 1) {
          stop._index = getSpanIndex(path, start, amount + 1, x - divided)
        } else if (x >= index) {
          stop._index = x + amount
        }
      }
      this.sort()
    }
  }

  // Moves the stops before the segments from start to end are removed,
  // keeping the ones between the segments that remain around them at the
  // same fraction of the length there, which becomes one curve. The ones
  // beyond the new ends of open paths go. See Path#removeSegments():
  remove(start: number, end: number) {
    const path = this._path
    const count = path._segments.length
    const closed = path._closed
    const amount = end - start
    const { curves } = path
    // The segment before the removed ones, and its index after:
    const before = closed ? (start + count - 1) % count : start - 1
    const index = before < start ? before : before - amount
    const span = amount + 1

    function isKept(stop: StrokeProfileStop) {
      const x = stop._index
      return closed
        ? amount < count
        : start
          ? end < count || x <= before
          : x >= end
    }

    this.filter(isKept)
    for (const stop of this._stops) {
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
    this.sort()
  }

  // Moves the stops after the segments were reversed, see Path#reverse():
  reverse() {
    const path = this._path
    const count = path._segments.length
    for (const stop of this._stops) {
      stop._index = path._closed
        ? (2 * count - 1 - stop._index) % count
        : count - 1 - stop._index
    }
    // Keep the order of steps reversed too:
    this._stops.reverse()
    this.sort()
  }
}

/**
 * Returns the pen of the path's stroke profile at the offset, see
 * {@link Path#getStrokeProfileAt()}.
 *
 * @private
 */
export function getStrokeProfileAt(
  path: Path,
  offset: number
): StrokeProfileStop {
  const values = getValues(
    getEntries(path),
    offset,
    path.length,
    path._closed,
    true
  )
  for (const [key, value] of Object.entries(defaults)) {
    values[key] ??= value
  }
  return new StrokeProfileStop(values)
}

/**
 * Takes the stroke profile off the path, as entries by offset, for the
 * methods that move it by offsets, see {@link setStrokeProfileParts()}.
 *
 * @private
 */
export function takeStrokeProfile(path: Path): ProfilePart {
  const part = {
    entries: getEntries(path),
    length: path.length,
    closed: path._closed
  }
  if (path._strokeProfile) {
    path.strokeProfile = null
  }
  return part
}

/**
 * Sets the stroke profile of the path from parts taken off paths, see
 * {@link takeStrokeProfile()}, which now follow each other along the path, the
 * first at its start and the last at its end. Where they meet, each keeps its
 * values there as a stop.
 *
 * @private
 */
export function setStrokeProfileParts(path: Path, parts: ProfilePart[]) {
  const { length, _closed: closed } = path
  const entries = []
  // Where the parts meet, the values that only some of them set are the
  // defaults in the others:
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
  path.strokeProfile = entries
}

/**
 * Sets the stroke profile of the path from a part of a profile taken off it,
 * see {@link takeStrokeProfile()}, between two offsets on it.
 *
 * @private
 */
export function setStrokeProfilePart(
  path: Path,
  part: ProfilePart,
  from: number,
  to: number
) {
  const { length, closed } = part
  path.strokeProfile = getPart(
    part.entries, from, to, length, closed,
    closed || from > 0, closed || to < length
  )
}

// Returns the stops of the path as { offset, width, aspect, angle, smooth }
// entries in order:
function getEntries(path: Path): Entry[] {
  return (path._strokeProfile?._stops ?? []).map(stop => ({
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
    values[key] = value?.[0] ?? null
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
    values.smooth = !!stop?.smooth
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
