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

import { describe, onTestFinished } from 'vitest'
import paper, {
  Color,
  Effect,
  EffectInstance,
  Group,
  Path,
  Point,
  Project,
  Rectangle
} from 'paper'
import { equals, test } from '../helpers.js'

describe('Effect', () => {
  function createSquare() {
    return new Path.Rectangle({
      point: [20, 20],
      size: [40, 40],
      fillColor: 'red'
    })
  }

  // Read the color of the view's pixel at x, y in view coordinates:
  function getViewPixel(x, y) {
    const { pixelRatio, element } = paper.view
    const data = element
      .getContext('2d')
      .getImageData(x * pixelRatio, y * pixelRatio, 1, 1).data
    return new Color(data[0] / 255, data[1] / 255, data[2] / 255, data[3] / 255)
  }

  // Define an effect for the test, and remove it again after it:
  function defineEffect(props) {
    const effect = new Effect(props)
    onTestFinished(() => effect.remove())
    return effect
  }

  test('Effects are registered by their types', () => {
    const offset = Effect.get('offset')
    equals([offset.type, Effect.get('outline').type], ['offset', 'outline'])
    equals(Effect.get('wobble'), null)
    const wobble = defineEffect({ type: 'wobble' })
    equals(Effect.get('wobble') === wobble, true)
    equals(Effect.getAll().includes(wobble), true)
    // Defining an effect again replaces it:
    const again = defineEffect({ type: 'wobble' })
    equals(Effect.get('wobble') === again, true)
    equals(wobble.remove(), false, 'not registered anymore')
    equals(again.remove(), true)
    equals(Effect.get('wobble'), null)
    Effect.add(again)
    equals(Effect.get('wobble') === again, true)
  })

  test('Effects have labels and categories for hosts', () => {
    const wobble = defineEffect({
      type: 'wobble',
      label: 'Wobble',
      category: 'Distort'
    })
    equals([wobble.label, wobble.category], ['Wobble', 'Distort'])
    const plain = defineEffect({ type: 'plain' })
    equals([plain.label, plain.category], ['plain', null], 'the defaults')
    equals(Effect.get('offset').label, 'Offset Path')
  })

  test('Effects keep the objects describing their parameters', () => {
    const amount = {
      label: 'Amount',
      type: 'number',
      range: [0, 100],
      value: 10
    }
    const onEditParameters = () => {}
    const wobble = defineEffect({
      type: 'wobble',
      parameters: { amount },
      onEditParameters
    })
    equals(wobble.parameters.amount === amount, true)
    equals(amount, {
      label: 'Amount',
      type: 'number',
      range: [0, 100],
      value: 10
    })
    equals(wobble.onEditParameters === onEditParameters, true)
  })

  test('Parameters are properties of the instances, with defaults', () => {
    defineEffect({
      type: 'wobble',
      parameters: {
        amount: { type: 'number', value: 10 },
        smooth: { type: 'checkbox', value: true }
      }
    })
    const path = createSquare()
    const instance = path.addEffect({
      type: 'wobble',
      parameters: { amount: 20 }
    })
    equals(instance instanceof EffectInstance, true)
    equals(instance.type, 'wobble')
    equals(instance.effect === Effect.get('wobble'), true)
    equals([instance.amount, instance.smooth], [20, true])
    equals(instance.parameters, { amount: 20, smooth: true })
    instance.amount = 30
    equals(instance.parameters.amount, 30)
    equals(path.effects[0].visible, true)
  })

  test('Effects apply with the instance as this', () => {
    let event = null
    let self = null
    defineEffect({
      type: 'shrink',
      parameters: { amount: { value: 0.5 } },
      onApply(applyEvent) {
        event = applyEvent
        self = this
        return applyEvent.art.scale(this.amount)
      }
    })
    const path = createSquare()
    const instance = path.addEffect({ type: 'shrink' })
    equals(path.getEffectOutput().bounds, new Rectangle(30, 30, 20, 20))
    equals(self === instance, true)
    equals(event.item === path, true)
    equals(
      event.art !== path && event.art.bounds,
      new Rectangle(30, 30, 20, 20)
    )
  })

  test('Redefining an effect applies it again', () => {
    defineEffect({
      type: 'shrink',
      onApply: event => event.art.scale(0.5)
    })
    const path = createSquare()
    const instance = path.addEffect({ type: 'shrink' })
    equals(path.previewBounds, new Rectangle(30, 30, 20, 20))
    const shrink = defineEffect({
      type: 'shrink',
      parameters: { amount: { value: 0.25 } },
      onApply(event) {
        return event.art.scale(this.amount)
      }
    })
    equals(path.previewBounds, new Rectangle(35, 35, 10, 10))
    equals(instance.effect === shrink, true)
    equals(instance.amount, 0.25, 'the new parameter')
    shrink.remove()
    equals(path.previewBounds, path.bounds, 'as it is')
    equals(instance.effect, null)
  })

  test('Effects can only declare parameters that aren’t taken', () => {
    let message = null
    try {
      defineEffect({ type: 'wobble', parameters: { visible: { value: 1 } } })
    } catch (err) {
      message = err.message
    }
    equals(message, `Invalid parameter name: 'visible'.`)
  })

  test('Item#addEffect(), #insertEffect() and #removeEffect()', () => {
    const path = createSquare()
    const offset = path.addEffect({
      type: 'offset',
      parameters: { distance: 5 }
    })
    equals([offset.item === path, offset.index], [true, 0])
    const outline = path.insertEffect(0, { type: 'outline' })
    equals(
      path.effects.map(instance => instance.type),
      ['outline', 'offset']
    )
    equals([outline.index, offset.index], [0, 1], 'renumbered')
    equals(path.removeEffect(0) === outline, true)
    equals([outline.item, outline.index], [null, null])
    equals(offset.index, 0)
    equals(offset.remove(), true)
    equals(path.effects, [])
    path.effects = [{ type: 'offset' }, { type: 'outline' }]
    equals(path.removeEffects().length, 2)
  })

  test('The output of effects is drawn in the item’s place', () => {
    const path = createSquare()
    const instance = path.addEffect({
      type: 'offset',
      parameters: { distance: 10 }
    })
    equals(path.getEffectOutput().bounds, new Rectangle(10, 10, 60, 60))
    paper.view.update(true)
    equals(getViewPixel(15, 40), new Color(1, 0, 0, 1), 'drawn offset')
    // Changes of the instance and of the item update the output:
    instance.distance = 5
    equals(path.getEffectOutput().bounds, new Rectangle(15, 15, 50, 50))
    path.position = path.position.add(10)
    equals(path.getEffectOutput().bounds, new Rectangle(25, 25, 50, 50))
    instance.visible = false
    equals(path.getEffectOutput(), null)
    paper.view.update(true)
    equals(getViewPixel(29, 50), new Color(0, 0, 0, 0), 'drawn as it is')
  })

  test('Item#previewBounds measures the effects, the others the item', () => {
    const path = createSquare()
    path.strokeColor = 'black'
    path.strokeWidth = 4
    path.addEffect({ type: 'offset', parameters: { distance: 10 } })
    equals(path.bounds, new Rectangle(20, 20, 40, 40))
    equals(path.strokeBounds, new Rectangle(18, 18, 44, 44))
    equals(path.previewBounds, new Rectangle(8, 8, 64, 64))
    // Groups measure their children with their effects:
    const group = new Group([path, new Path.Circle([100, 40], 10)])
    equals(group.previewBounds, new Rectangle(8, 8, 102, 64))
    equals(
      new Path.Circle([0, 0], 10).previewBounds,
      new Rectangle(-10, -10, 20, 20),
      'without effects'
    )
    // Hit testing stays with the item itself:
    equals(path.hitTest(new Point(12, 40)), null)
  })

  test('Effects of groups apply to the effects of their children', () => {
    const path = createSquare()
    path.addEffect({ type: 'offset', parameters: { distance: 10 } })
    const group = new Group([path])
    group.addEffect({ type: 'offset', parameters: { distance: 5 } })
    equals(group.previewBounds, new Rectangle(5, 5, 70, 70))
    // Changes of the children update the group's output:
    path.effects[0].distance = 0
    equals(group.previewBounds, new Rectangle(15, 15, 50, 50))
  })

  test('Outline effects outline strokes next to fills', () => {
    const path = createSquare()
    path.set({ strokeColor: 'black', strokeWidth: 10, strokeJoin: 'miter' })
    path.addEffect({ type: 'outline' })
    const output = path.getEffectOutput()
    equals(output instanceof Group, true)
    equals(output.children[0].strokeColor, null, 'the fill')
    equals(output.children[1].fillColor, new Color(0, 0, 0), 'the stroke')
    equals(path.previewBounds, path.strokeBounds)
  })

  test('Instances of unknown effects keep their parameters and round-trip', () => {
    const path = createSquare()
    path.effects = [
      { type: 'zigzag', parameters: { size: 3, ridges: 4 }, visible: false }
    ]
    const [instance] = path.effects
    equals(
      [instance.type, instance.effect, instance.visible],
      ['zigzag', null, false]
    )
    equals(instance.parameters, { size: 3, ridges: 4 })
    equals(path.getEffectOutput(), null, 'not visible')
    instance.visible = true
    equals(path.getEffectOutput().bounds, path.bounds, 'as it is')
    const json = path.exportJSON()
    equals(json.includes('"type":"zigzag"'), true)
    const copy = new Project().importJSON(json)
    equals(copy.effects[0].parameters, { size: 3, ridges: 4 })
  })

  test('Parameters of any name round-trip, also type and visible', () => {
    const path = createSquare()
    const parameters = { type: 'fineDots', visible: 1 }
    path.effects = [{ type: 'pixelate.mezzotint', parameters }]
    equals(path.effects[0].type, 'pixelate.mezzotint')
    equals(path.effects[0].visible, true)
    equals(path.clone().effects[0].parameters, parameters, 'clone')
    const copy = new Project().importJSON(path.exportJSON())
    equals(copy.effects[0].parameters, parameters, 'JSON')
  })

  test('Changing parameters updates the effect', () => {
    const path = createSquare()
    const offset = path.addEffect({
      type: 'offset',
      parameters: { distance: 10 }
    })
    offset.parameters.distance = 20
    equals(offset.distance, 20)
    equals(path.previewBounds, new Rectangle(0, 0, 80, 80))
    // Effects of unknown types only have their parameters to change:
    const zigzag = path.addEffect({
      type: 'zigzag',
      parameters: { size: 3 }
    })
    path.project.trackChanges = true
    path.project.takeChanges()
    const output = path.getEffectOutput()
    zigzag.parameters.size = 5
    equals(path.project.takeChanges().length, 1, 'logged')
    equals(path.getEffectOutput() !== output, true, 'applied again')
    // Setting them all adds new ones, which are then updated too:
    zigzag.parameters = Object.assign({}, zigzag.parameters, { ridges: 4 })
    equals(zigzag.parameters, { size: 5, ridges: 4 })
    zigzag.parameters.ridges = 6
    equals(path.project.takeChanges().length, 1)
    let message = null
    try {
      zigzag.parameters.amount = 2
    } catch (err) {
      message = err.constructor.name
    }
    equals(message, 'TypeError', 'new ones only through the setter')
    equals(path.exportJSON().includes('"ridges":6'), true)
  })

  test('Clones and JSON keep effects', () => {
    const path = createSquare()
    path.effects = [
      { type: 'offset', parameters: { distance: 4, join: 'round' } },
      { type: 'outline', visible: false }
    ]
    const clone = path.clone()
    equals(clone.effects.length, 2)
    equals(clone.effects[0] !== path.effects[0], true)
    equals(clone.effects[0].item === clone, true)
    equals(clone.effects[0].join, 'round')
    const json = path.exportJSON()
    equals(
      json.includes('"effects":[{"type":"offset","parameters":{"distance":4'),
      true
    )
    const copy = new Project().importJSON(json)
    equals(
      copy.effects.map(instance => [instance.type, instance.visible]),
      [
        ['offset', true],
        ['outline', false]
      ]
    )
    equals(copy.previewBounds, path.previewBounds)
  })

  test('SVG export writes the output of effects', () => {
    const path = createSquare()
    path.addEffect({ type: 'offset', parameters: { distance: 10 } })
    const svg = path.exportSVG({ asString: true })
    equals(svg.includes('d="M10,10h60v60h-60z"'), true)
  })

  test('Hosts can replace the effects of Paper.js', () => {
    const native = Effect.get('offset')
    onTestFinished(() => Effect.add(native))
    new Effect({
      type: 'offset',
      parameters: { distance: { value: 0 } },
      onApply: event => event.art.scale(2)
    })
    const path = createSquare()
    path.addEffect({ type: 'offset', parameters: { distance: 1 } })
    equals(path.previewBounds, new Rectangle(0, 0, 80, 80))
  })
})
