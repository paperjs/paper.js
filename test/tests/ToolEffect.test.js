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
import paper, { Effect, Path, Tool, ToolEffect } from 'paper'
import { equals, test } from '../helpers.js'

describe('ToolEffect', () => {
  // Records the events that its tool gets, and draws a dot at each drag:
  const events = []
  new ToolEffect({
    type: 'recording',
    parameters: { size: { value: 2 } },
    tool: {
      onMouseDown(event) {
        events.push(['down', event.point])
      },
      onMouseDrag(event) {
        events.push(['drag', event.point, event.delta.length])
        new Path.Circle({
          center: event.point,
          radius: event.effect.size * Math.random(),
          fillColor: 'black'
        })
      },
      onMouseUp(event) {
        events.push(['up', event.point, event.path])
      }
    }
  })

  function createLine(length, parameters) {
    events.length = 0
    return new Path({
      segments: [
        [0, 0],
        [length, 0]
      ],
      strokeColor: 'black',
      effects: [{ type: 'recording', parameters }]
    })
  }

  test('The tool draws along the path, outside of the document', () => {
    const path = createLine(100, { acceleration: Infinity })
    const { project } = paper
    const tools = paper.tools.length
    const output = path.getEffectOutput()
    equals(events[0], ['down', path.firstSegment.point])
    const [type, point, drawn] = events[events.length - 1]
    equals([type, point], ['up', path.lastSegment.point])
    equals(drawn !== path && drawn.equals(path), true, 'the path of the event')
    equals(output.children.length, events.length - 2, 'a dot per drag')
    equals(project.activeLayer.children.length, 1, 'only the path')
    equals(paper.project === project, true)
    equals(paper.tools.length, tools)
  })

  test('The hand moves at its speed, every frame', () => {
    createLine(100, { speed: 600, acceleration: Infinity }).getEffectOutput()
    // 600 points per second are 10 points per frame:
    const drags = events.filter(event => event[0] === 'drag')
    equals(drags.length, 10)
    equals(drags[0][2], 10, null, { tolerance: 1e-6 })
  })

  test('The hand accelerates from rest and slows down in turns', () => {
    createLine(300, { speed: 600, acceleration: 3000 }).getEffectOutput()
    const deltas = events
      .filter(event => event[0] === 'drag')
      .map(event => event[2])
    equals(deltas[0] < deltas[5], true, 'accelerating')
    equals(deltas[deltas.length - 1] < deltas[5], true, 'braking')
    // A turn of radius 20 is taken at √(20 · 2000) = 200 points per second:
    events.length = 0
    new Path.Arc({
      from: [0, 0],
      through: [20, 20],
      to: [40, 0],
      effects: [
        {
          type: 'recording',
          parameters: { speed: 600, acceleration: Infinity }
        }
      ]
    }).getEffectOutput()
    const turn = events.filter(event => event[0] === 'drag')
    equals(turn[1][2] * 60, 200, null, { tolerance: 1 })
  })

  test('The tool gets the same random numbers each time', () => {
    const path = createLine(100)
    const output = path.getEffectOutput().exportJSON()
    const random = Math.random
    path.effects[0].size = 3
    path.effects[0].size = 2
    equals(path.getEffectOutput().exportJSON(), output)
    equals(Math.random === random, true, 'restored')
  })

  test('Effects can draw with existing tools', () => {
    const points = []
    const tool = new Tool({
      minDistance: 20,
      onMouseDrag(event) {
        points.push(event.point)
      }
    })
    const effect = new ToolEffect({ type: 'existing', tool })
    try {
      equals(effect.tool === tool, true)
      equals(Effect.get('existing').parameters.speed.value, 300)
      createLine(100, null)
        .set({ effects: [{ type: 'existing' }] })
        .getEffectOutput()
      const gaps = points.slice(1).map((point, i) => point.x - points[i].x)
      equals(gaps.length > 2 && Math.min(...gaps) >= 20, true, 'its distances')
      equals(paper.tools.includes(tool), true, 'kept')
    } finally {
      effect.remove()
      tool.remove()
    }
  })
})
