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
import paper, { Group, Layer, Path, Point, Size } from 'paper'
import { equals, test } from '../helpers.js'

describe('Layer', () => {
  test('#previousSibling / #nextSibling', () => {
    const project = paper.project
    const firstLayer = project.activeLayer
    const secondLayer = new Layer()
    equals(() => secondLayer.previousSibling === firstLayer, true)
    equals(() => secondLayer.nextSibling == null, true)

    // Move another layer into secondLayer and check nextSibling /
    // previousSibling:
    const path = new Path()
    const thirdLayer = new Layer()
    secondLayer.insertChild(0, thirdLayer)
    equals(() => secondLayer.children.length, 2)
    equals(() => thirdLayer.nextSibling === path, true)
    secondLayer.addChild(thirdLayer)
    equals(() => thirdLayer.nextSibling, null)
    equals(() => thirdLayer.previousSibling === path, true)
    equals(() => project.layers.length, 2)

    firstLayer.addChild(secondLayer)
    equals(() => project.layers.length, 1)
  })

  test('#insertAbove() / #insertBelow()', () => {
    const project = paper.project
    const firstLayer = project.activeLayer
    firstLayer.name = 'first'
    const secondLayer = new Layer()
    secondLayer.name = 'second'
    const thirdLayer = new Layer()
    thirdLayer.name = 'third'

    thirdLayer.insertBelow(firstLayer)
    equals(() => thirdLayer.previousSibling == null, true)
    equals(() => thirdLayer.nextSibling === firstLayer, true)

    secondLayer.insertBelow(firstLayer)
    equals(() => secondLayer.previousSibling === thirdLayer, true)
    equals(() => secondLayer.nextSibling === firstLayer, true)

    const path = new Path()
    firstLayer.addChild(path)

    // move the layer above the path, inside the firstLayer.
    // 'Above' means visually appearing on top, thus with a larger index.
    secondLayer.insertAbove(path)
    equals(() => path.nextSibling === secondLayer, true)
    equals(() => secondLayer.parent === firstLayer, true)
    // There should now only be two layers left:
    equals(() => project.layers.length, 2)
  })

  test('#addChild() / #insertBelow() with nesting', () => {
    const project = paper.project
    const firstLayer = project.activeLayer
    const secondLayer = new Layer()
    // There should be two layers now in project.layers
    equals(() => project.layers.length, 2)
    firstLayer.addChild(secondLayer)
    equals(() => secondLayer.parent === firstLayer, true)
    // There should only be the firsLayer now in project.layers
    equals(() => project.layers.length, 1)
    equals(() => project.layers[0] === firstLayer, true)
    // Now move secondLayer bellow the first again, in which case it should
    // reappear in project.layers
    secondLayer.insertBelow(firstLayer)
    // There should be two layers now in project.layers again now
    equals(() => project.layers.length, 2)
    equals(
      () => (
        project.layers[0] === secondLayer &&
        project.layers[1] === firstLayer
      ),
      true
    )
  })

  test('#remove() with named layers', () => {
    const name = 'my layer'
    new Layer({ name })
    new Layer({ name })
    let removeCount = 0
    while (paper.project.layers[name]) {
      paper.project.layers[name].remove()
      if (++removeCount > 2) break
    }
    equals(
      removeCount,
      2,
      'project.layers[name].remove(); should be called twice'
    )
  })

  test('#bounds with nested empty items', () => {
    const item = new Path.Rectangle(new Point(10, 10), new Size(10))
    new Group(new Group())
    equals(item.bounds, paper.project.activeLayer.bounds)
  })
})
