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

import { describe } from 'vitest'
import paper, { AreaText, Path, PathText, PointText } from 'paper'
import { equals, test, testFontFamily } from '../helpers.js'

describe('TextDirection', () => {
  // Hebrew for 'hello' and 'world':
  const shalom = '\u05e9\u05dc\u05d5\u05dd'
  const olam = '\u05e2\u05d5\u05dc\u05dd'

  // What canvas draws and measures can't be read back as text, so record the
  // view context's calls of `name` during `callback()`, with their content and
  // where and in which direction they are made:
  function recordCalls(name, callback) {
    const { view } = paper
    const ctx = view.context
    const original = ctx[name]
    const calls = []
    ctx[name] = function (content, x, ...args) {
      calls.push({
        content,
        x: this.getTransform().e / view.pixelRatio + (x || 0),
        direction: this.direction
      })
      return original.call(this, content, x, ...args)
    }
    callback()
    delete ctx[name]
    return calls
  }

  function getDrawnText() {
    return recordCalls('fillText', () => paper.view.update(true))
  }

  // A point text with its second word in bold, as a run of its own:
  function createDirectionText(content, direction) {
    const text = new PointText({
      point: [10, 50],
      content,
      fontFamily: testFontFamily,
      fontSize: 12,
      direction
    })
    text.range(content.indexOf(' ') + 1, content.length).fontWeight = 'bold'
    return text
  }

  function createDirectionPathText(content, direction) {
    return new PathText({
      textPath: new Path.Line([0, 0], [200, 0]),
      content,
      fontFamily: testFontFamily,
      fontSize: 12,
      justification: 'start',
      direction
    })
  }

  test('The pieces of right-to-left lines are placed from the right', () => {
    let text = createDirectionText(shalom + ' ' + olam, 'rtl')
    let drawn = getDrawnText()
    equals(drawn.length, 2, 'one piece for each word')
    equals(drawn[0].content, shalom + ' ', 'the first word first')
    equals(drawn[0].x > drawn[1].x, true, 'and on the right')
    equals(drawn[1].x, text.bounds.left, 'the second word on the left', {
      tolerance: 0.01
    })
    text.remove()
    text = createDirectionText('Hello world')
    drawn = getDrawnText()
    equals(drawn[0].x, text.bounds.left, 'left-to-right lines from the left', {
      tolerance: 0.01
    })
    equals(drawn[0].x < drawn[1].x, true, 'in reading order')
  })

  test('Right-to-left justified lines spread from the right', () => {
    const text = new AreaText({
      textPath: new Path.Rectangle([0, 0], [100, 100]),
      content: [shalom, olam, shalom, olam, shalom, olam].join(' '),
      fontFamily: testFontFamily,
      fontSize: 12,
      justification: 'justify',
      direction: 'rtl'
    })
    const line = text.lines[0]
    // Each word of a justified line is a piece of its own:
    const drawn = getDrawnText().slice(
      0,
      line.content.trim().split(' ').length
    )
    const xs = drawn.map(call => call.x)
    const width = text.view.getTextWidth(
      'normal 12px ' + testFontFamily,
      [shalom],
      '0em'
    )
    equals(drawn[0].content, shalom, 'the first word first')
    equals(drawn[0].x + width, line.bounds.right, `at the line's right end`, {
      tolerance: 0.01
    })
    equals(
      xs,
      xs.slice().sort((a, b) => b - a),
      'and each word left of the one before'
    )
  })

  test('Text in right-to-left paragraphs is drawn right to left', () => {
    const text = createDirectionText('Hello world\n' + shalom + ' ' + olam)
    text.paragraphs[1].direction = 'rtl'
    const drawn = getDrawnText()
    equals(
      drawn.map(call => call.direction),
      ['ltr', 'ltr', 'rtl'],
      `drawn by each paragraph's direction`
    )
  })

  test('Text in right-to-left paragraphs is measured right to left', () => {
    const text = createDirectionText('Hello world\n' + shalom + ' ' + olam)
    text.paragraphs[1].direction = 'rtl'
    const measured = recordCalls('measureText', () => text.bounds)
    const directions = {}
    for (const call of measured) directions[call.content] = call.direction
    equals(
      directions['Hello '],
      'ltr',
      'left-to-right paragraphs left to right'
    )
    equals(
      directions[shalom + ' ' + olam],
      'rtl',
      'right-to-left paragraphs right to left'
    )
  })

  test(`Path text places its letters from the path's end`, () => {
    const text = createDirectionPathText(shalom, 'rtl')
    let drawn = getDrawnText()
    const width = text.view.getTextWidth(
      'normal 12px ' + testFontFamily,
      [shalom[0]],
      '0em'
    )
    equals(drawn[0].content, shalom[0], 'the first letter first')
    equals(drawn[0].x + width, 200, `at the path's end`, { tolerance: 0.01 })
    equals(drawn[3].x, text.bounds.left, 'the last one furthest from it', {
      tolerance: 0.01
    })
    text.remove()
    createDirectionPathText('Hello')
    drawn = getDrawnText()
    equals(drawn[0].x < drawn[4].x, true, 'left-to-right text along the path')
  })

  test('Letters are hit where they are placed', () => {
    let text = createDirectionText(shalom + ' ' + olam, 'rtl')
    let bounds = text.bounds
    const y = bounds.center.y
    text.range(5, 9).fillColor = null
    equals(
      text.hitTest([bounds.right - 2, y]) != null,
      true,
      'the first word on the right'
    )
    equals(
      text.hitTest([bounds.left + 2, y]),
      null,
      'the second word, without a fill, on the left'
    )
    text.remove()
    text = createDirectionText('Hello world')
    bounds = text.bounds
    text.range(6, 11).fillColor = null
    equals(
      text.hitTest([bounds.left + 2, y]) != null,
      true,
      'left to right, the first word on the left'
    )
    equals(
      text.hitTest([bounds.right - 2, y]),
      null,
      'and the second one on the right'
    )
  })
})
