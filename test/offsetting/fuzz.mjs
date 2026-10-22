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

// Outlines the strokes of random paths, with the features that make offsetting
// hard: cusps, loops, tight turns, coincident points, zero and reversed
// handles, and extreme scales. Shrinks each failure to a small path that still
// fails, and prints it as an entry for cases.json.
// Usage: node test/offsetting/fuzz.mjs [count=500] [seed=1]

import { createRequire } from 'node:module'
import { caps, checkOutline, createPath, joins } from './check.mjs'

const require = createRequire(import.meta.url)
const paper = require('../../dist/paper-full.js')
const count = +process.argv[2] || 500
let seed = +process.argv[3] || 1

paper.setup(new paper.Size(2000, 2000))

// A seeded random number generator (mulberry32), so runs can be repeated:
function random() {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

const pick = list => list[Math.floor(random() * list.length)]
const round = value => Math.round(value * 100) / 100

function createHandle() {
  const length = pick([0, 0, 20, 100, 300, 600])
  const angle = random() * Math.PI * 2
  return [round(Math.cos(angle) * length), round(Math.sin(angle) * length)]
}

// A path as drawn by hand: a random walk, smoothed with simplify(), with some
// tiny handles and nearly coincident points, as such paths have:
function createDrawnSegments() {
  const path = new paper.Path({ insert: false })
  let point = new paper.Point(random() * 500, random() * 500)
  let angle = random() * 360
  const count = 5 + Math.floor(random() * 40)
  for (let i = 0; i < count; i++) {
    path.add(point)
    // Mostly gentle turns, some sharp ones and reversals:
    angle += random() < 0.15 ? 120 + random() * 120 : (random() - 0.5) * 60
    point = point.add(
      new paper.Point({ length: 1 + random() * 30, angle })
    )
  }
  path.simplify(pick([0.5, 2.5, 10]))
  return path.segments.map(segment => {
    const handles = [segment.handleIn, segment.handleOut].map(handle =>
      random() < 0.1 ? handle.normalize(random()) : handle
    )
    const offset = random() < 0.1 ? random() * 0.05 : 0
    return [segment.point.add(offset), ...handles].map(({ x, y }) => [
      Math.round(x * 1e5) / 1e5,
      Math.round(y * 1e5) / 1e5
    ])
  })
}

function createEntry() {
  const scale = pick([1, 1, 1, 1, 0.01, 100])
  if (random() < 0.5) {
    return {
      segments: createDrawnSegments().map(segment =>
        segment.map(([x, y]) => [x * scale, y * scale])
      ),
      closed: random() < 0.2,
      style: {
        strokeWidth: round((0.5 + random() * 150) * scale),
        strokeJoin: pick(joins),
        strokeCap: pick(caps)
      }
    }
  }
  const segments = []
  const length = 2 + Math.floor(random() * 4)
  for (let i = 0; i < length; i++) {
    const previous = segments[i - 1]
    const point =
      previous && random() < 0.15
        ? [...previous[0]] // Coincident with the previous one.
        : [round(random() * 500), round(random() * 500)]
    const handleIn = createHandle()
    const kind = random()
    const handleOut =
      kind < 0.3
        ? [-handleIn[0], -handleIn[1]] // Smooth.
        : kind < 0.45
          ? [...handleIn] // A cusp, reversing the direction.
          : createHandle()
    segments.push([point, handleIn, handleOut])
  }
  return {
    segments: segments.map(segment =>
      segment.map(([x, y]) => [round(x * scale), round(y * scale)])
    ),
    closed: random() < 0.3,
    style: {
      strokeWidth: round((0.5 + random() * 150) * scale),
      strokeJoin: pick(joins),
      strokeCap: pick(caps)
    }
  }
}

function check(entry) {
  return checkOutline(paper, createPath(paper, entry, entry.style))
}

// Shrinks the failing entry by trying simpler versions that still fail:
function shrink(entry) {
  let changed = true
  while (changed) {
    changed = false
    const candidates = []
    const { segments } = entry
    if (segments.length > 2) {
      for (let i = 0; i < segments.length; i++) {
        candidates.push({
          ...entry,
          segments: segments.filter((_, j) => j !== i)
        })
      }
    }
    if (entry.closed) candidates.push({ ...entry, closed: false })
    for (let i = 0; i < segments.length; i++) {
      for (const h of [1, 2]) {
        if (segments[i][h][0] || segments[i][h][1]) {
          const copy = segments.map(segment => segment.map(p => [...p]))
          copy[i][h] = [0, 0]
          candidates.push({ ...entry, segments: copy })
        }
      }
    }
    for (const candidate of candidates) {
      if (check(candidate).length) {
        entry = candidate
        changed = true
        break
      }
    }
  }
  return entry
}

const found = []
for (let i = 0; i < count; i++) {
  const entry = createEntry()
  if (check(entry).length) {
    const small = shrink(entry)
    found.push({ ...small, problems: check(small) })
  }
}
console.log(`${found.length} of ${count} random outlines fail.`)
for (const entry of found) {
  const { style, problems, ...path } = entry
  console.log(
    JSON.stringify({
      name: `Fuzzed: ${problems.join(', ')}`,
      segments: path.segments,
      closed: path.closed,
      ...style
    })
  )
}
