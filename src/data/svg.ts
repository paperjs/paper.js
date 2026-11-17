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

// SVG path data, read into the commands that build paths, and written from
// their segments, for the path items and for plain descriptions of paths.
import { EPSILON } from '../util/numerical.ts'
import { Formatter } from '../util/Formatter.ts'
import { Point } from '../basic/Point.ts'
import { Size } from '../basic/Size.ts'
import { getEllipticArc } from '../curve/index.ts'
import type { SegmentValues } from '../curve/index.ts'
import { getSegments } from './region.ts'
import type { PathData } from './region.ts'

// The commands that path data is read into, as the path items have them:
export type PathBuilder = {
  moveTo(point: Point): void
  lineTo(point: Point): void
  cubicCurveTo(handle1: Point, handle2: Point, to: Point): void
  quadraticCurveTo(handle: Point, to: Point): void
  arcTo(
    to: Point,
    radius: Size,
    rotation: number,
    clockwise: boolean,
    large: boolean
  ): void
  closePath(tolerance: number): void
}

/**
 * Reads the SVG path data into the commands of the builder.
 *
 * @param data the path data
 * @param builder receives the commands, a path item or createPathBuilder()
 */
export function readSVGPath(data: string, builder: PathBuilder) {
  // First split the path data into parts of command-coordinates pairs
  // Commands are any of these characters: mzlhvcsqta
  const parts = data?.match(/[mlhvcsqtaz][^mlhvcsqtaz]*/gi)
  let coords: string[]
  let relative = false
  let previous: string
  let control: Point
  let current = new Point()
  let start = new Point()
  const number = '([+-]?(?:\\d*\\.\\d+|\\d+\\.?)(?:[eE][+-]?\\d+)?)'
  const numbers = new RegExp(number, 'g')
  // The arc flags are single characters that don't need to be
  // separated from what follows, e.g. 'a1 1 0 011 1', see #1808:
  const flag = '([01])'
  const arcs = new RegExp(
    [number, number, number, flag, flag, number, number].join('[\\s,]*'),
    'g'
  )

  const getCoord = (index: number, coord: 'x' | 'y') => {
    const value = +coords[index]
    return relative ? value + current[coord] : value
  }

  const getPoint = (index: number) =>
    new Point(getCoord(index, 'x'), getCoord(index + 1, 'y'))

  for (const part of parts ?? []) {
    const command = part[0]
    const lower = command.toLowerCase()
    // Match all coordinate values
    coords = part.match(numbers)
    const length = coords?.length
    relative = command === lower
    // Fix issues with z in the middle of SVG path data, not followed by
    // a m command, see #413:
    if (previous === 'z' && !/[mz]/.test(lower)) {
      builder.moveTo(current)
    }
    switch (lower) {
      case 'm':
      case 'l': {
        let move = lower === 'm'
        for (let i = 0; i < length; i += 2) {
          builder[move ? 'moveTo' : 'lineTo']((current = getPoint(i)))
          if (move) {
            start = current
            move = false
          }
        }
        control = current
        break
      }
      case 'h':
      case 'v': {
        const coord = lower === 'h' ? 'x' : 'y'
        current = current.clone() // Clone as we're going to modify it.
        for (let i = 0; i < length; i++) {
          current[coord] = getCoord(i, coord)
          builder.lineTo(current)
        }
        control = current
        break
      }
      case 'c':
        for (let i = 0; i < length; i += 6) {
          builder.cubicCurveTo(
            getPoint(i),
            (control = getPoint(i + 2)),
            (current = getPoint(i + 4))
          )
        }
        break
      case 's':
        // Smooth cubicCurveTo
        for (let i = 0; i < length; i += 4) {
          builder.cubicCurveTo(
            /[cs]/.test(previous)
              ? current.multiply(2).subtract(control)
              : current,
            (control = getPoint(i)),
            (current = getPoint(i + 2))
          )
          previous = lower
        }
        break
      case 'q':
        for (let i = 0; i < length; i += 4) {
          builder.quadraticCurveTo(
            (control = getPoint(i)),
            (current = getPoint(i + 2))
          )
        }
        break
      case 't':
        // Smooth quadraticCurveTo
        for (let i = 0; i < length; i += 2) {
          builder.quadraticCurveTo(
            (control = /[qt]/.test(previous)
              ? current.multiply(2).subtract(control)
              : current),
            (current = getPoint(i))
          )
          previous = lower
        }
        break
      case 'a':
        while ((coords = arcs.exec(part))) {
          builder.arcTo(
            (current = getPoint(6)),
            new Size(+coords[1], +coords[2]),
            +coords[3],
            coords[5] === '1',
            coords[4] === '1'
          )
        }
        break
      case 'z':
        // Merge first and last segment with EPSILON tolerance to address
        // imprecisions in relative SVG data.
        builder.closePath(EPSILON)
        // Correctly handle relative m commands, see #1101:
        current = start
        break
    }
    previous = lower
  }
}

/**
 * Returns the SVG path data as plain descriptions of its paths, one for each
 * move command, as the children of a compound path with this data.
 *
 * @param data the path data
 * @return the paths, with their segments as [point, handleIn, handleOut]
 */
export function parseSVGPath(data: string): PathData[] {
  const paths: { segments: SegmentValues[]; closed: boolean }[] = []

  // The last segment, which the commands continue from:
  const getCurrent = () => {
    const path = paths.at(-1)
    if (!path) throw new Error('Use a moveTo() command first')
    return path.segments.at(-1)
  }

  const add = (segments: SegmentValues[]) => {
    paths.at(-1).segments.push(...segments)
  }

  const builder: PathBuilder = {
    moveTo({ x, y }) {
      paths.push({ segments: [[[x, y], [0, 0], [0, 0]]], closed: false })
    },

    lineTo({ x, y }) {
      getCurrent()
      add([[[x, y], [0, 0], [0, 0]]])
    },

    cubicCurveTo(handle1, handle2, to) {
      const current = getCurrent()
      const [[x, y]] = current
      current[2] = [handle1.x - x, handle1.y - y]
      add([[[to.x, to.y], [handle2.x - to.x, handle2.y - to.y], [0, 0]]])
    },

    quadraticCurveTo(handle, to) {
      // This is exact, see Path#quadraticCurveTo():
      const from = new Point(getCurrent()[0])
      builder.cubicCurveTo(
        handle.add(from.subtract(handle).multiply(1 / 3)),
        handle.add(to.subtract(handle).multiply(1 / 3)),
        to
      )
    },

    arcTo(to, radius, rotation, clockwise, large) {
      const current = getCurrent()
      const [first, ...segments] = getEllipticArc(
        new Point(current[0]),
        to,
        radius,
        rotation,
        clockwise,
        large
      )
      if (first) {
        current[2] = first[2]
        add(segments)
      }
    },

    closePath(tolerance) {
      // Merge the ends where they meet, as Path#join() does:
      const path = paths.at(-1)
      if (!path) throw new Error('Use a moveTo() command first')
      const { segments } = path
      const first = segments[0]
      const last = segments.at(-1)
      path.closed = true
      if (
        first !== last &&
        new Point(first[0]).isClose(new Point(last[0]), tolerance)
      ) {
        first[1] = last[1]
        segments.pop()
      }
    }
  }
  readSVGPath(data, builder)
  return paths
}

/**
 * Returns the plain descriptions of paths as SVG path data.
 *
 * @param paths the paths
 * @param precision the amount of fractional digits
 * @return the path data
 */
export function formatSVGPath(paths: PathData[], precision?: number): string {
  const formatter = new Formatter(precision)
  return paths
    .map(path => {
      const segments = getSegments(path)
      return writeSVGPath(
        segments.length,
        path.closed,
        (index, coords) => {
          const [[x, y], [inX, inY], [outX, outY]] = segments[index]
          coords[0] = x
          coords[1] = y
          coords[2] = x + inX
          coords[3] = y + inY
          coords[4] = x + outX
          coords[5] = y + outY
        },
        formatter
      )
    })
    .join('')
}

/**
 * Writes a path as SVG path data, from the absolute coordinates of its
 * segments, which the path items transform first.
 *
 * @param count the amount of segments
 * @param closed whether the path is closed
 * @param getCoords fills the array with the coordinates of the segment at
 *     the index: its point, its incoming and its outgoing handle
 * @param formatter formats the numbers
 * @return the path data
 */
export function writeSVGPath(
  count: number,
  closed: boolean,
  getCoords: (index: number, coords: number[]) => void,
  formatter: Formatter
): string {
  const coords = new Array(6)
  let first = true
  let curX: number
  let curY: number
  let prevX: number
  let prevY: number
  let inX: number
  let inY: number
  let outX: number
  let outY: number
  const parts = []

  function addSegment(index: number, skipLine?: boolean) {
    getCoords(index, coords)
    curX = coords[0]
    curY = coords[1]
    if (first) {
      parts.push('M' + formatter.pair(curX, curY))
      first = false
    } else {
      inX = coords[2]
      inY = coords[3]
      if (inX === curX && inY === curY && outX === prevX && outY === prevY) {
        // l = relative lineto:
        if (!skipLine) {
          const dx = curX - prevX
          const dy = curY - prevY
          parts.push(
            dx === 0
              ? 'v' + formatter.number(dy)
              : dy === 0
                ? 'h' + formatter.number(dx)
                : 'l' + formatter.pair(dx, dy)
          )
        }
      } else {
        // c = relative curveto:
        parts.push(
          'c' +
          formatter.pair(outX - prevX, outY - prevY) +
          ' ' +
          formatter.pair(inX - prevX, inY - prevY) +
          ' ' +
          formatter.pair(curX - prevX, curY - prevY)
        )
      }
    }
    prevX = curX
    prevY = curY
    outX = coords[4]
    outY = coords[5]
  }

  for (let i = 0; i < count; i++) {
    addSegment(i)
  }
  // Close path by drawing first segment again
  if (closed && count > 0) {
    addSegment(0, true)
    parts.push('z')
  }
  return parts.join('')
}
