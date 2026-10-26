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
  ChangeFlag,
  Group,
  Layer,
  Path,
  PatternDefinition,
  Project,
  SymbolDefinition,
  Tool
} from 'paper'
import { equals, test } from '../helpers.js'

describe('Project', () => {
  test('activate()', () => {
    const project = new Project()
    const secondDoc = new Project()
    project.activate()
    const path = new Path()
    equals(() => project.activeLayer.children[0] === path, true)
    equals(() => secondDoc.activeLayer.children.length === 0, true)
  })

  test('onActivate and onDeactivate', () => {
    const first = new Project()
    const second = new Project()
    const events = []
    first.onActivate = previous => events.push(['first', previous === second])
    first.onDeactivate = () => events.push('first deactivate')
    second.onActivate = previous => events.push(['second', previous === first])
    second.onDeactivate = () => events.push('second deactivate')
    first.activate()
    equals(events, ['second deactivate', ['first', true]])
    events.length = 0
    first.remove()
    equals(events, ['first deactivate'], 'removing the active project')
    events.length = 0
    second.remove()
    equals(events, [], 'removing an inactive project')
  })

  test('Project.onActivate and Project.onDeactivate', () => {
    const events = []
    const activate = function (previous) {
      events.push(['activate', this, previous])
    }
    const deactivate = function () {
      events.push(['deactivate', this])
    }
    Project.on('activate', activate)
    Project.onDeactivate = deactivate
    onTestFinished(() => {
      Project.off('activate', activate)
      Project.onDeactivate = null
    })
    const previous = paper.project
    const first = new Project()
    equals(
      () => (
        events.length === 2 &&
        events[0][0] === 'deactivate' &&
        events[0][1] === previous &&
        events[1][0] === 'activate' &&
        events[1][1] === first &&
        events[1][2] === previous
      ),
      true,
      'heard from a new project'
    )
    const second = new Project()
    second.onActivate = () => events.push(['own'])
    events.length = 0
    previous.activate()
    second.activate()
    equals(
      () => (
        events[2][0] === 'deactivate' &&
        events[2][1] === previous &&
        events[3][0] === 'own' &&
        events[4][0] === 'activate' &&
        events[4][1] === second
      ),
      true,
      'after the handlers of the project'
    )
    events.length = 0
    second.remove()
    equals(
      () => events.length === 1 && events[0][1] === second,
      true,
      'removing the active project'
    )
    Project.off('activate', activate)
    first.activate()
    events.length = 0
    previous.activate()
    equals(
      () => (
        events.length === 1 &&
        events[0][0] === 'deactivate' &&
        events[0][1] === first
      ),
      true,
      'none after off()'
    )
  })

  test('clear()', () => {
    const project = new Project()
    new Layer()
    new Layer()
    new Layer()
    equals(project.layers.length, 3)
    project.clear()
    equals(project.layers.length, 0)
  })

  test('Removed selected items are released from the selection (#1856)', () => {
    const project = new Project()
    const path = new Path.Circle({ center: [50, 50], radius: 20 })
    const child = new Path.Rectangle({ point: [0, 0], size: [10, 10] })
    const group = new Group([child])
    const layer = new Layer([new Path.Line([0, 0], [10, 10])])
    path.selected = true
    child.segments[0].selected = true
    layer.firstChild.fullySelected = true
    equals(project.selectedItems.length, 3)
    path.remove()
    group.remove()
    layer.remove()
    equals(project.selectedItems.length, 0)
    // There is no public API that exposes the removed items, so check the
    // internal selection registry that keeps them from being collected:
    equals(Object.keys(project._selectionItems).length, 0)
    equals(project._selectionCount, 0)
  })

  test('Reinserted selected items are added to the selection again', () => {
    const project = new Project()
    const path = new Path.Circle({ center: [50, 50], radius: 20 })
    const child = new Path.Rectangle({ point: [0, 0], size: [10, 10] })
    const group = new Group([child])
    path.selected = true
    child.selected = true
    path.remove()
    group.remove()
    project.activeLayer.addChildren([path, group])
    equals(
      () => (
        project.selectedItems.length === 2 &&
        project.selectedItems.indexOf(path) !== -1 &&
        project.selectedItems.indexOf(child) !== -1
      ),
      true
    )
    equals(project._selectionCount, 2)
  })

  test('Selected items are only added to the selection once inserted', () => {
    const project = new Project()
    const path = new Path.Circle({
      center: [50, 50],
      radius: 20,
      selected: true,
      insert: false
    })
    const group = new Group({ insert: false })
    group.addChild(path)
    equals(path.selected, true)
    equals(Object.keys(project._selectionItems).length, 0)
    project.activeLayer.addChild(group)
    equals(
      () => (
        project.selectedItems.length === 1 &&
        project.selectedItems[0] === path
      ),
      true
    )
    equals(project._selectionCount, 1)
  })

  test('trackChanges / takeChanges()', () => {
    const project = new Project()
    const path = new Path.Circle([50, 50], 20)
    const removed = new Path.Rectangle([0, 0], [10, 10])
    equals(project.takeChanges(), null)
    project.trackChanges = true
    path.fillColor = 'red'
    path.position.x += 10
    removed.remove()
    const inserted = new Path()
    const changes = project.takeChanges()
    function getFlags(item) {
      for (let i = 0; i < changes.length; i++) {
        if (changes[i].item === item) return changes[i].flags
      }
      return 0
    }
    equals(changes.length, 4) // Including the layer's children.
    equals(!!(getFlags(path) & ChangeFlag.STYLE), true)
    equals(!!(getFlags(path) & ChangeFlag.GEOMETRY), true)
    equals(!!(getFlags(removed) & ChangeFlag.INSERTION), true)
    equals(!!(getFlags(inserted) & ChangeFlag.INSERTION), true)
    equals(!!(getFlags(project.activeLayer) & ChangeFlag.CHILDREN), true)
    equals(project.takeChanges().length, 0)
    project.trackChanges = false
    path.rotate(10)
    equals(project.takeChanges(), null)
  })

  test('hasChanges()', () => {
    const project = new Project()
    const path = new Path.Circle([50, 50], 20)
    equals(project.hasChanges(), false)
    project.trackChanges = true
    equals(project.hasChanges(), false)
    path.fillColor = 'red'
    equals(project.hasChanges(), true)
    // Asking doesn't take the changes:
    equals(project.hasChanges(), true)
    equals(project.takeChanges().length, 1)
    equals(project.hasChanges(), false)
    path.rotate(10)
    project.trackChanges = false
    equals(project.hasChanges(), false)
  })

  test('trackChanges logs removed layers', () => {
    const project = new Project()
    const layer = new Layer()
    project.trackChanges = true
    layer.remove()
    const changes = project.takeChanges()
    equals(changes.length, 1)
    equals(changes[0].item, layer)
    equals(!!(changes[0].flags & ChangeFlag.INSERTION), true)
  })

  test('trackChanges leaves out items that moved to another project', () => {
    const project = new Project()
    const path = new Path.Circle([50, 50], 20)
    const other = new Project()
    project.trackChanges = true
    path.fillColor = 'red'
    other.activeLayer.addChild(path)
    const changes = project.takeChanges()
    equals(changes.length, 1)
    equals(changes[0].item === project.activeLayer, true, 'the parent it left')
  })

  test('trackChanges ignores items that are not inserted', () => {
    const project = new Project()
    const path1 = new Path.Rectangle([0, 0], [20, 20])
    const path2 = new Path.Rectangle([10, 10], [20, 20])
    const detached = new Path({ insert: false })
    project.trackChanges = true
    detached.add([10, 10])
    equals(project.takeChanges().length, 0)
    // Only the result is logged, not the temporary paths:
    const result = path1.unite(path2)
    const changes = project.takeChanges()
    equals(changes.length, 2)
    equals(changes[0].item === result || changes[1].item === result, true)
  })

  test('trackChanges logs changes of definitions', () => {
    const project = new Project()
    const symbol = new SymbolDefinition(new Path.Rectangle([0, 0], [10, 10]))
    const pattern = new PatternDefinition(new Path.Rectangle([0, 0], [5, 5]))
    project.trackChanges = true
    symbol.item.fillColor = 'red'
    pattern.spacing = 10
    pattern.name = 'Dots'
    const changes = project.takeChanges()
    equals(changes.length, 2)
    equals(changes[0].definition === symbol, true)
    equals(!!(changes[0].flags & ChangeFlag.STYLE), true)
    equals(changes[1].definition === pattern, true)
    equals(!!(changes[1].flags & ChangeFlag.STYLE), true)
    equals(!!(changes[1].flags & ChangeFlag.ATTRIBUTE), true)
  })

  test('project.patternDefinitions', () => {
    const project = new Project()
    const pattern = new PatternDefinition(new Path.Rectangle([0, 0], [5, 5]))
    const other = new PatternDefinition(new Path.Circle([0, 0], 5))
    new Path.Rectangle({
      point: [0, 0],
      size: [40, 40],
      fillColor: { pattern }
    })
    new Path.Rectangle({
      point: [50, 0],
      size: [40, 40],
      fillColor: { pattern },
      strokeColor: { pattern: other }
    })
    new Group(
      new Path.Rectangle({
        point: [100, 0],
        size: [40, 40],
        fillColor: { pattern: other }
      })
    )
    const definitions = project.patternDefinitions
    equals(definitions.length, 2)
    equals(definitions[0] === pattern, true)
    equals(definitions[1] === other, true)
  })

  test('project.scope, view.scope, item.scope and tool.scope (#1634)', () => {
    const path = new Path(),
      tool = new Tool()
    equals(
      () => (
        paper.project.scope === paper &&
        paper.view.scope === paper &&
        path.scope === paper &&
        tool.scope === paper
      ),
      true
    )
    tool.remove()
  })
})
