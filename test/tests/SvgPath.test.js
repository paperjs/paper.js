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

import { describe } from 'vitest'
import { CompoundPath } from 'paper'
import { formatSVGPath, parseSVGPath } from '../../src/data/svg.ts'
import { equals, test } from '../helpers.js'

// SVG path data on plain descriptions of paths, which must read and write as
// the path items do:
describe('SVG path data on plain paths', () => {
  // The children of a compound path with the data, as plain paths:
  const getPaths = data =>
    new CompoundPath(data).children.map(({ segments, closed }) => ({
      segments: segments.map(({ point, handleIn, handleOut }) => [
        [point.x, point.y],
        [handleIn.x, handleIn.y],
        [handleOut.x, handleOut.y]
      ]),
      closed
    }))

  test('parseSVGPath() reads lines and closes paths', () => {
    equals(parseSVGPath('M10,20h30v40l-30,10z'), [
      {
        segments: [
          [[10, 20], [0, 0], [0, 0]],
          [[40, 20], [0, 0], [0, 0]],
          [[40, 60], [0, 0], [0, 0]],
          [[10, 70], [0, 0], [0, 0]]
        ],
        closed: true
      }
    ])
  })

  test('parseSVGPath() reads curves with their handles', () => {
    equals(parseSVGPath('M0,0C10,0 20,10 20,20'), [
      {
        segments: [
          [[0, 0], [0, 0], [10, 0]],
          [[20, 20], [0, -10], [0, 0]]
        ],
        closed: false
      }
    ])
  })

  test('parseSVGPath() starts a path with each move', () => {
    const paths = parseSVGPath('M0,0L10,0M20,20L30,20L30,30z')
    equals(
      paths.map(({ segments, closed }) => [segments.length, closed]),
      [[2, false], [3, true]]
    )
  })

  test('parseSVGPath() merges the ends that a closed path returns to', () => {
    // The curve returns to the start, which takes its incoming handle:
    equals(parseSVGPath('M0,0L10,0C10,10 0,10 0,0z'), [
      {
        segments: [
          [[0, 0], [0, 10], [0, 0]],
          [[10, 0], [0, 0], [0, 10]]
        ],
        closed: true
      }
    ])
  })

  test('parseSVGPath() reads all commands as the path items do', () => {
    for (const data of [
      'M10,10 L20,20 H40 V60 h-10 v-10 l5,5',
      'm10,10 c10,0 20,10 20,20 s10,20 20,20 S80,60 90,40',
      'M10,80 Q50,10 90,80 T170,80 t40,-20',
      'M10,10 A20,30 15 0 1 60,40 a10 10 0 011 1 a5,5 0 1,0 10,10',
      'M0,0 L10,0 L10,10 z l5,5 z M30,30 l10,0 l0,10',
      'M0,0 10,10 20,0 m5,5 10,10'
    ]) {
      equals(parseSVGPath(data), getPaths(data), data)
    }
  })

  test('parseSVGPath() needs a move before other commands', () => {
    let message = null
    try {
      parseSVGPath('L10,10')
    } catch (error) {
      ;({ message } = error)
    }
    equals(message, 'Use a moveTo() command first')
  })

  test('formatSVGPath() writes paths as the path items do', () => {
    for (const data of [
      'M10,20h30v40l-30,10z',
      'M0,0c10,0 20,10 20,20s10,20 20,20',
      'M10,10a20,30 15 0 1 50,30M0,0l10,0l0,10z'
    ]) {
      const item = new CompoundPath(data)
      equals(formatSVGPath(getPaths(data)), item.pathData, data)
      // At another precision, and for segments in their shorter forms:
      equals(
        formatSVGPath(parseSVGPath(data), 2),
        item.exportSVG({ precision: 2 }).getAttribute('d'),
        data
      )
    }
    equals(
      formatSVGPath([{ segments: [[0, 0], [10, 0], [10, 10]], closed: true }]),
      'M0,0h10v10z'
    )
  })
})
