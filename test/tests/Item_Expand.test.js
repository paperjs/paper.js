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
import {
  Color,
  Group,
  Matrix,
  Path,
  PathItem,
  PatternDefinition,
  Shape,
  SymbolDefinition,
  SymbolItem
} from 'paper'
import { comparePixels, equals, test } from '../helpers.js'

describe('Item#expand()', () => {
  // The descendants of the item, and the item itself:
  function getAll(item) {
    return [item, ...item.getItems({ match: () => true })]
  }

  test('Applies effects, embeds symbols and turns shapes into paths', () => {
    const definition = new SymbolDefinition(
      Path.circle({ center: [0, 0], radius: 10, fillColor: 'blue' })
    )
    const group = new Group([
      Shape.rectangle({ point: [10, 10], size: [30, 20], fillColor: 'red' }),
      new SymbolItem(definition, [70, 30]),
      Path.star({
        center: [120, 30],
        points: 5,
        radius1: 8,
        radius2: 16,
        fillColor: 'green',
        effects: [{ type: 'offset', parameters: { distance: 4 } }]
      })
    ])
    group.opacity = 0.5
    const expected = group.clone()
    equals(group.expand() === group, true, 'the group stays')
    const items = getAll(group)
    equals(
      items.some(item => item instanceof Shape),
      false,
      'no shapes'
    )
    equals(
      items.some(item => item instanceof SymbolItem),
      false,
      'no symbols'
    )
    equals(
      items.some(item => item.effects.length),
      false,
      'no effects'
    )
    comparePixels(group, expected)
    expected.remove()
  })

  test('Outlines strokes next to fills, dashed ones as their dashes', () => {
    const path = Path.star({
      center: [50, 50],
      points: 5,
      radius1: 20,
      radius2: 40,
      fillColor: 'yellow',
      strokeColor: 'black',
      strokeWidth: 6,
      dashArray: [10, 4],
      opacity: 0.5,
      name: 'star'
    })
    const expected = path.clone()
    expected.position.x += 100
    const result = path.expand({ strokes: true })
    equals(result instanceof Group, true)
    equals(path.isInserted(), false, 'replaced')
    equals(result.name, 'star')
    equals(result.opacity, 0.5)
    const paths = getAll(result).filter(item => item instanceof PathItem)
    equals(
      paths.some(item => item.hasStroke()),
      false,
      'no strokes'
    )
    result.position.x += 100
    comparePixels(result, expected, null, { tolerance: 1e-2 })
    expected.remove()
  })

  test('Expands pattern fills into their tiles, clipped by the path', () => {
    const dot = Path.circle({ center: [5, 5], radius: 3, fillColor: 'red' })
    const pattern = new PatternDefinition(dot, {
      tile: [0, 0, 10, 10],
      spacing: 2
    })
    const path = Path.circle({
      center: [50, 50],
      radius: 35,
      fillColor: new Color(pattern, new Matrix().rotate(30)),
      strokeColor: 'black',
      strokeWidth: 2
    })
    const expected = path.clone()
    const result = path.expand({ fills: true })
    const colors = getAll(result).flatMap(item => [
      item.fillColor,
      item.strokeColor
    ])
    equals(
      colors.some(color => color?.type === 'pattern'),
      false
    )
    comparePixels(result, expected, null, { tolerance: 1e-2 })
    expected.remove()
  })

  test('Returns the result without inserting it for items without a parent', () => {
    const shape = Shape.circle({
      center: [0, 0],
      radius: 10,
      fillColor: 'red',
      insert: false
    })
    const result = shape.expand()
    equals(result instanceof Path, true)
    equals(result.isInserted(), false)
  })
})
