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

import type { Path } from './Path.ts'

// The stroke profiles of paths, see Path#strokeProfile. Each stop keeps its
// position as the index of the segment before it plus the fraction of the arc
// length to the next segment, so that it stays between the same segments when
// they move. The methods that insert, remove or reverse segments update the
// indices, and those that keep the shape of the path, splitAt() and join(),
// move the stops by their offsets.

// The values of the pen, with their defaults where no stop sets them:
export const profileDefaults = { width: 1, aspect: 1, angle: 0 }

// A stop of the profile by its offset, see getProfileEntries():
export type Entry = {
  offset: number
  width?: number | null
  aspect?: number | null
  angle?: number | null
  smooth?: boolean
}

// A stroke profile taken off a path, see Path#_takeStrokeProfile():
export type ProfilePart = { entries: Entry[]; length: number; closed: boolean }

// The values of the pen with their first and second derivatives along the
// path, see Path#_getStrokeProfileValues():
export type PenValues = { width: number[]; aspect: number[]; angle: number[] }

// Returns the stops of the path as { offset, width, aspect, angle,
// smooth } entries in order:
export function getProfileEntries(path: Path): Entry[] {
  return (path._strokeProfile ?? []).map(stop => ({
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
export function getProfileValue(
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
export function getProfileValues(
  entries: Entry[], offset: number, length: number,
  closed: boolean, after: boolean
): Entry {
  const values = { offset }
  for (const key of Object.keys(profileDefaults)) {
    const value = getProfileValue(entries, key, offset, length, closed, after)
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
export function getProfilePart(
  entries: Entry[], from: number, to: number, length: number,
  closed: boolean, hasStart: boolean, hasEnd: boolean,
  fallbacks: Record<string, number> = {}
): Entry[] {
  const getEnd = (offset: number, after?: boolean) => {
    const values = getProfileValues(entries, offset, length, closed, after)
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
export function getProfileSpanIndex(
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
