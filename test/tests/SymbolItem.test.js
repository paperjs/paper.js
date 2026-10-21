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
import paper, {
  CompoundPath,
  Group,
  Matrix,
  Path,
  Point,
  Rectangle,
  SymbolDefinition,
  SymbolItem
} from 'paper'
import { equals, test } from '../helpers.js'

describe('Symbol & Placed Symbol', () => {
  test('SymbolItem#bounds', () => {
    const path = new Path.Circle([50, 50], 50)
    path.strokeColor = 'black'
    path.strokeWidth = 1
    path.strokeCap = 'round'
    path.strokeJoin = 'round'
    equals(
      path.strokeBounds,
      new Rectangle(-0.5, -0.5, 101, 101),
      'Path initial bounds'
    )
    const definition = new SymbolDefinition(path)
    const item = new SymbolItem(definition)

    equals(
      item.bounds,
      new Rectangle(-50.5, -50.5, 101, 101),
      'SymbolItem initial bounds'
    )

    item.scale(1, 0.5)
    equals(
      item.bounds,
      new Rectangle(-50.5, -25.25, 101, 50.5),
      'Bounds after scale'
    )

    item.rotate(40)
    equals(
      item.bounds,
      new Rectangle(-41.96283, -37.79252, 83.92567, 75.58503),
      'Bounds after rotation'
    )
  })

  test('bounds of group of SymbolItem instances', () => {
    const path = new Path.Circle(new Point(), 10)
    const definition = new SymbolDefinition(path)
    const instances = []
    for (let i = 0; i < 10; i++) {
      const instance = definition.place(new Point(i * 20, 20))
      instances.push(instance)
    }
    const group = new Group(instances)
    equals(group.bounds, new Rectangle(-10, 10, 200, 20), 'Group bounds')
  })

  test('bounds of a SymbolItem that contains a group of items', () => {
    const path = new Path.Circle(new Point(), 10)
    const path2 = path.clone()
    path2.position.x += 20
    equals(path.bounds, new Rectangle(-10, -10, 20, 20), 'path bounds')
    equals(path2.bounds, new Rectangle(10, -10, 20, 20), 'path2 bounds')
    const group = new Group(path, path2)
    equals(group.bounds, new Rectangle(-10, -10, 40, 20), 'Group bounds')
    const definition = new SymbolDefinition(group)
    const instance = definition.place(new Point(50, 50))
    equals(
      instance.bounds,
      new Rectangle(30, 40, 40, 20),
      'Instance bounds'
    )
  })

  test('Changing the definition of a symbol should change the bounds of all instances of it.', () => {
    const path = new Path.Circle(new Point(), 10)
    const path2 = new Path.Circle(new Point(), 20)
    const definition = new SymbolDefinition(path)
    const instance = definition.place(new Point(0, 0))
    equals(
      instance.bounds,
      new Rectangle(-10, -10, 20, 20),
      'Initial bounds'
    )
    definition.item = path2
    equals(
      instance.bounds,
      new Rectangle(-20, -20, 40, 40),
      'Bounds after changing symbol definition'
    )
    definition.item.scale(0.5, 0.5)
    equals(
      instance.bounds,
      new Rectangle(-10, -10, 20, 20),
      'Bounds after modifying symbol definition'
    )
  })

  test('SymbolDefinition item selection', () => {
    const path = new Path.Circle([50, 50], 50)
    path.selected = true
    const definition = new SymbolDefinition(path)
    equals(() => definition.item.selected === false, true)
    equals(() => paper.project.selectedItems.length === 0, true)
  })

  test('SymbolDefinition item selection is not drawn', () => {
    // Count the pixels that the view draws. The items have no fill and stroke,
    // so only their selection draws pixels:
    function countPixels() {
      paper.view.update()
      const size = paper.view.viewSize.multiply(paper.view.pixelRatio)

      const data = paper.view.element
        .getContext('2d')
        .getImageData(0, 0, size.width, size.height).data

      let count = 0
      for (let i = 3, l = data.length; i < l; i += 4) {
        if (data[i]) count++
      }
      return count
    }

    const group = new Group(new Path.Rectangle([0, 0], [20, 20])),
      definition = new SymbolDefinition(group),
      placed = definition.place([50, 50]),
      path = group.firstChild
    equals(countPixels(), 0, 'nothing selected')
    path.selected = true
    equals(countPixels(), 0, 'path.selected = true')
    path.selected = false
    path.firstSegment.selected = true
    equals(countPixels(), 0, 'path.firstSegment.selected = true')
    path.firstSegment.selected = false
    group.selected = true
    equals(countPixels(), 0, 'group.selected = true')
    group.selected = false
    // The placed instance still draws its own selection:
    placed.selected = true
    const count = countPixels()
    equals(count > 0, true, 'placed.selected = true')
    group.selected = true
    equals(countPixels(), count, 'placed.selected = group.selected = true')
  })

  test('SymbolDefinition#place()', () => {
    const path = new Path.Circle([50, 50], 50)
    const symbol = new SymbolDefinition(path)
    const placed = symbol.place()
    equals(() => placed.parent === paper.project.activeLayer, true)

    equals(() => placed.definition === symbol, true)

    equals(() => placed.position.toString(), '{ x: 0, y: 0 }')
  })

  test('SymbolDefinition#place(position)', () => {
    const path = new Path.Circle([50, 50], 50)
    const symbol = new SymbolDefinition(path)
    const placed = symbol.place(new Point(100, 100))
    equals(() => placed.position.toString(), '{ x: 100, y: 100 }')
  })

  test('SymbolItem#bounds with #applyMatrix = false', () => {
    const path = new Path.Rectangle({
      point: [100, 100],
      size: [50, 50],
      strokeColor: 'red',
      applyMatrix: false,
      strokeWidth: 50
    })
    const symbol = new SymbolDefinition(path)
    const placed = symbol.place([200, 200])
    equals(() => placed.bounds, { x: 150, y: 150, width: 100, height: 100 })
  })

  test('SymbolItem#hitTestAll', () => {
    const symbol = new SymbolDefinition(
      new Path.Circle({
        center: [0, 0],
        radius: 10,
        fillColor: 'orange'
      })
    )
    const symbolItem = symbol.place([50, 50])

    const hitTestAll = symbolItem.hitTestAll([50, 50])
    equals(hitTestAll.length, 1)
    equals(hitTestAll[0].item.id, symbolItem.id)
  })

  test('paper.install() keeps the native Symbol', () => {
    const scope = { Symbol: 'native' }
    paper.install(scope)
    equals(scope.Symbol, 'native')
    equals(() => scope.SymbolDefinition === SymbolDefinition, true)
    // The deprecated alias is still available on paper itself:
    equals(() => paper.Symbol === SymbolDefinition, true)
  })

  test('paper.install() keeps what the scope already has (#1832, #1652)', () => {
    const scope = { Event: 'native', MouseEvent: 'native', Path: 'own' }
    paper.install(scope)
    equals(scope.Event, 'native', 'Event')
    equals(scope.MouseEvent, 'native', 'MouseEvent')
    equals(scope.Path, 'own', 'Path')
    equals(
      () => scope.Group === Group && scope.project === paper.project,
      true,
      'the rest'
    )
  })

  test('SymbolItem#hitTest() with filters (#1774)', () => {
    function getItem(hit) {
      return hit && hit.item
    }

    const definition = new SymbolDefinition(
        new Group(
          new Path.Circle({
            center: [0, 0],
            radius: 10,
            fillColor: 'orange'
          })
        )
      ),
      placed = definition.place([50, 50]),
      group = new Group(placed),
      options = { fill: true, class: SymbolItem }
    equals(
      () => getItem(paper.project.hitTest([50, 50], options)) === placed,
      true
    )
    equals(
      () => (
        getItem(
          paper.project.hitTest([50, 50], {
            fill: true,
            type: 'symbol-item'
          })
        ) === placed
      ),
      true
    )
    equals(
      () => (
        getItem(
          paper.project.hitTest([50, 50], {
            fill: true,
            match(hit) {
              return hit.item === placed
            }
          })
        ) === placed
      ),
      true
    )
    equals(() => paper.project.hitTest([70, 50], options), null)
    // The group placing the symbol is hit, but not the group defining it:
    equals(
      () => (
        getItem(
          paper.project.hitTest([50, 50], {
            fill: true,
            class: Group
          })
        ) === group
      ),
      true
    )
    equals(
      () => paper.project.hitTest([50, 50], { fill: true, class: Path }),
      null
    )
    equals(() => {
      const hits = paper.project.hitTestAll([50, 50], options)
      return hits.length === 1 && hits[0].item === placed
    }, true)
    equals(() => {
      const hits = paper.project.hitTestAll([50, 50], { fill: true })
      return (
        hits.length === 2 &&
        hits[0].item === placed &&
        hits[1].item === group
      )
    }, true)
  })

  test('SymbolItem#hitTest() with filters on compound paths (#1774)', () => {
    function getItem(hit) {
      return hit && hit.item
    }

    const definition = new SymbolDefinition(
        new CompoundPath({
          children: [
            new Path.Circle({ center: [0, 0], radius: 20 }),
            new Path.Circle({ center: [0, 0], radius: 10 })
          ],
          fillColor: 'orange',
          fillRule: 'evenodd'
        })
      ),
      placed = definition.place([50, 50]),
      options = { fill: true, class: SymbolItem }
    equals(
      () => getItem(paper.project.hitTest([65, 50], options)) === placed,
      true
    )
    equals(() => paper.project.hitTest([50, 50], options), null)
    equals(
      () =>
        paper.project.hitTest([65, 50], {
          fill: true,
          class: CompoundPath
        }),
      null
    )
  })

  test('SymbolItem drawing keeps the global matrix of the definition (#1684)', () => {
    const path = new Path.Rectangle({
      size: [20, 20],
      strokeWidth: 10,
      strokeColor: 'red',
      strokeScaling: false
    })
    const definition = new SymbolDefinition(path)
    const placed = definition.place([100, 100])
    placed.scale(4, 2)
    paper.view.update()
    // The definition's item isn't inserted, so its global matrix is its own
    // identity matrix, and the stroke without scaling surrounds its 20 x 20
    // rectangle by 5 on each side:
    equals(path.globalMatrix, new Matrix(), 'path.globalMatrix')
    equals(
      path.strokeBounds,
      new Rectangle(-15, -15, 30, 30),
      'path.strokeBounds'
    )

    // The example from the issue: The definition's item is inserted into the
    // project again, where it gets drawn before the symbol item too:
    const group = new Group({ applyMatrix: false, children: [path] })
    group.translate(10, 20)
    group.insertBelow(placed)
    paper.view.update()
    equals(
      path.globalMatrix,
      new Matrix(1, 0, 0, 1, 10, 20),
      'path.globalMatrix when inserted'
    )
  })
  test('SymbolItem#embed()', () => {
    const layer = paper.project.activeLayer
    const path = new Path.Rectangle({
      point: [0, 0],
      size: [20, 10],
      fillColor: 'red'
    })
    const definition = new SymbolDefinition(path)
    const before = new Path()
    const placed = definition.place([100, 100])
    const after = new Path()
    placed.rotate(90)
    placed.scale(2)
    const bounds = placed.bounds
    const embedded = placed.embed()
    equals(() => embedded !== path, true)
    equals(() => embedded.className, 'Path')
    equals(layer.children, [before, embedded, after])
    equals(placed.parent, null)
    equals(embedded.bounds, bounds)
    equals(embedded.matrix, new Matrix())
    equals(embedded.fillColor, path.fillColor)
    // The definition remains unchanged:
    equals(path.bounds, new Rectangle(-10, -5, 20, 10))
    equals(() => definition.item === path, true)
  })

  test('SymbolItem#embed() with #applyMatrix = false', () => {
    const group = new Group({
      children: [new Path.Rectangle([0, 0], [20, 10])],
      applyMatrix: false
    })
    group.scale(2)
    const definition = new SymbolDefinition(group)
    const placed = definition.place([100, 100])
    placed.rotate(90)
    const bounds = placed.bounds
    const embedded = placed.embed()
    equals(embedded.bounds, bounds)
    // The matrix combines the symbol item's with the definition's:
    equals(embedded.matrix, group.matrix.prepended(placed.matrix))
    equals(embedded.firstChild.segments[0].point, new Point(0, 10))
  })

  test('SymbolItem#embed() keeps the attributes', () => {
    const path = new Path.Circle({
      center: [0, 0],
      radius: 10,
      opacity: 0.5
    })
    const definition = new SymbolDefinition(path)
    const placed = definition.place([50, 50])
    placed.opacity = 0.5
    placed.blendMode = 'multiply'
    placed.visible = false
    placed.locked = true
    placed.guide = true
    placed.name = 'circle'
    placed.data = { value: 1 }
    placed.selected = true
    const embedded = placed.embed()
    equals(embedded.opacity, 0.25)
    equals(embedded.blendMode, 'multiply')
    equals(embedded.visible, false)
    equals(embedded.locked, true)
    equals(embedded.guide, true)
    equals(embedded.name, 'circle')
    equals(() => paper.project.activeLayer.children.circle === embedded, true)
    equals(embedded.data, { value: 1 })
    equals(() => embedded.data !== placed.data, true)
    equals(embedded.selected, true)
    equals(paper.project.selectedItems, [embedded])
  })

  test('SymbolItem#embed() as a clipping mask', () => {
    const definition = new SymbolDefinition(new Path.Circle([0, 0], 10))
    const placed = definition.place([50, 50])
    const group = new Group({
      children: [placed, new Path.Rectangle([0, 0], [100, 100])],
      clipped: true
    })
    const embedded = placed.embed()
    equals(embedded.clipMask, true)
    equals(group.bounds, new Rectangle(40, 40, 20, 20))
  })

  test('SymbolItem#embed() without a parent', () => {
    const definition = new SymbolDefinition(new Path.Circle([0, 0], 10))
    const placed = new SymbolItem({ definition, insert: false })
    equals(placed.embed(), null)
  })
})
