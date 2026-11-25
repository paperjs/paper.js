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

import { describe, onTestFinished } from 'vitest'
import paper, { Group, Path, registerClasses } from 'paper'
import { equals, test } from '../helpers.js'

describe('Item subclasses (#1050)', () => {
  class Badge extends Path {
    get label() {
      return this.data.label
    }

    set label(label) {
      this.data.label = label
    }
  }

  class Frame extends Group {}

  registerClasses({ Badge, Frame })

  function createBadge() {
    const badge = new Badge({
      segments: [[0, 0], [20, 0], [10, 15]],
      closed: true,
      fillColor: 'red'
    })
    badge.label = 'New'
    return badge
  }

  test('Copies keep the class and the state in data', () => {
    const copy = createBadge().clone()
    equals(copy instanceof Badge, true)
    equals(copy.label, 'New')
  })

  test('JSON creates registered subclasses again', () => {
    const badge = createBadge()
    const frame = new Frame([badge])
    const copy = paper.project.activeLayer.importJSON(frame.exportJSON())
    equals(copy instanceof Frame, true)
    equals(copy.firstChild instanceof Badge, true)
    equals(copy.firstChild.label, 'New')
  })

  test('SVG exports subclasses as the classes they extend', () => {
    const frame = new Frame([createBadge()])
    const node = frame.exportSVG()
    equals(node.nodeName, 'g')
    equals(node.firstChild.nodeName, 'path')
    equals(node.firstChild.getAttribute('data-paper-data'), '{"label":"New"}')
  })

  test('Drawing handlers of the class draw all its items', () => {
    const drawn = []
    Badge.onDraw = function () {
      drawn.push(this.label)
    }
    onTestFinished(() => {
      Badge.onDraw = null
    })
    createBadge()
    Path.circle({ center: [50, 50], radius: 10, fillColor: 'blue' })
    paper.view.update(true)
    equals(drawn, ['New'])
  })
})
