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
  Color,
  Group,
  Layer,
  Path,
  Point,
  PointText,
  Rectangle,
  SymbolDefinition
} from 'paper'
import { comparePixels, equals, test } from '../helpers.js'

describe('Group', () => {
  test('new Group()', () => {
    const group = new Group()
    equals(() => paper.project.activeLayer.children[0] === group, true)
  })

  test('new Group([])', () => {
    const group = new Group([])
    equals(() => paper.project.activeLayer.children[0] === group, true)
    equals(() => group.children.length, 0)
  })

  test('new Group([item])', () => {
    const path = new Path()
    const group = new Group([path])
    equals(() => paper.project.activeLayer.children.length, 1)
    equals(() => group.children[0] === path, true)
  })

  test('new Group({children:[item]})', () => {
    const path = new Path()
    const group = new Group({
      children: [path]
    })
    equals(() => paper.project.activeLayer.children.length, 1)
    equals(() => path.parent === group, true)
    equals(() => group.children[0] === path, true)
  })

  test('Group bounds', () => {
    paper.project.currentStyle = {
      strokeWidth: 5,
      strokeColor: 'black'
    }

    const path = new Path.Circle([150, 150], 60)
    const secondPath = new Path.Circle([175, 175], 85)
    const group = new Group([path, secondPath])
    equals(group.bounds, new Rectangle(90, 90, 170, 170), 'group.bounds')
    equals(
      group.strokeBounds,
      new Rectangle(87.5, 87.5, 175, 175),
      'group.strokeBounds'
    )

    group.rotate(20)
    equals(
      group.bounds,
      new Rectangle(89.97687, 82.94085, 170.04627, 177.08228),
      'rotated group.bounds'
    )
    equals(
      group.strokeBounds,
      new Rectangle(87.47687, 80.44085, 175.04627, 182.08228),
      'rotated group.strokeBounds'
    )
    group.rotate(20, new Point(50, 50))
    equals(
      group.bounds,
      new Rectangle(39.70708, 114.9919, 170.00396, 180.22418),
      'rotated group.bounds'
    )
    equals(
      group.strokeBounds,
      new Rectangle(37.20708, 112.4919, 175.00396, 185.22418),
      'rotated group.strokeBounds'
    )
  })

  test('group.addChildren(otherGroup.children)', () => {
    const group = new Group()
    group.addChild(new Path())
    group.addChild(new Path())
    equals(() => group.children.length, 2)

    const secondGroup = new Group()
    secondGroup.addChildren(group.children)
    equals(() => secondGroup.children.length, 2)
    equals(() => group.children.length, 0)
  })

  test('group.insertChildren(0, otherGroup.children)', () => {
    const group = new Group()
    group.addChild(new Path())
    group.addChild(new Path())
    equals(() => group.children.length, 2)

    const secondGroup = new Group()
    secondGroup.insertChildren(0, group.children)
    equals(() => secondGroup.children.length, 2)
    equals(() => group.children.length, 0)
  })

  test('group.addChildren()', () => {
    const group = new Group()
    const path1 = new Path()
    const path2 = new Path()
    let children = [path1, path2]
    group.addChildren(children)
    equals(
      group.children.length,
      2,
      'group.children.length after adding 2 children'
    )
    group.removeChildren()
    equals(
      group.children.length,
      0,
      'group.children.length after removing all children'
    )
    children.splice(1, 0, null)
    equals(
      children.length,
      3,
      'children array length after inserting null at index 1'
    )
    group.addChildren(children)
    equals(
      group.children.length,
      2,
      'calling group.addChildren() with an array with 3 entries, ' +
      'of which 2 are valid, group.children.length should be 2'
    )
    children = [path1, path1, path2]
    group.addChildren(children)
    equals(
      group.children.length,
      2,
      'adding the same item twice should only add it once.'
    )
  })

  test('group.setSelectedColor() with selected bound and position', () => {
    // Working: Set selected color first then add child.
    const group1 = new Group()
    group1.bounds.selected = true
    group1.position.selected = true
    group1.selectedColor = 'black'
    group1.addChild(new Path.Circle([50, 50], 40))
    // Failing: Add child first then set selected color.
    const group2 = new Group()
    group2.bounds.selected = true
    group2.position.selected = true
    group2.addChild(new Path.Circle([50, 50], 40))
    group2.selectedColor = 'black'
    comparePixels(group1, group2)
  })

  test('Group#isEmpty(recursively)', () => {
    let group = new Group()
    equals(true, group.isEmpty())
    equals(true, group.isEmpty(true))
    group = new Group(new Group())
    equals(false, group.isEmpty())
    equals(true, group.isEmpty(true))
    group = new Group(new Path())
    equals(false, group.isEmpty())
    equals(true, group.isEmpty(true))
    group = new Group(new PointText())
    equals(false, group.isEmpty())
    equals(true, group.isEmpty(true))
  })

  test('group.internalBounds with clip item without clip.applyMatrix = false', () => {
    const point = new Point(100, 100)
    const translation = new Point(100, 100)
    const item = new Path.Circle({
      center: point,
      radius: 50,
      fillColor: 'orange'
    })
    const clip = new Path.Rectangle({
      from: point.subtract(translation),
      to: point.add(translation)
    })
    clip.applyMatrix = false
    clip.translate(translation)
    const group = new Group(clip, item)
    group.clipped = true
    const expected = new Rectangle(
      point,
      point.add(translation.multiply(2))
    )
    equals(group.internalBounds, expected)
  })

  test('group.matrix with parent matrix applied (#1711)', () => {
    const child = new Group({ applyMatrix: false })
    const parent = new Group({ applyMatrix: true, children: [child] })
    const scale = 1.1
    const initial = child.scaling.x
    parent.scale(scale)
    equals(child.scaling.x, initial * scale)
  })

  test('Nested group.matrix.apply(true, true) with matrices not applied', () => {
    const path = new Path({ applyMatrix: false })
    const group = new Group({ applyMatrix: false, children: [path] })
    const parent = new Group({ applyMatrix: false, children: [group] })
    const grandParent = new Group({
      applyMatrix: false,
      children: [parent]
    })
    equals(() => grandParent.applyMatrix, false)
    equals(() => group.applyMatrix, false)
    equals(() => path.applyMatrix, false)
    grandParent.matrix.apply(true, true)
    equals(() => grandParent.applyMatrix, true)
    equals(() => group.applyMatrix, true)
    equals(() => path.applyMatrix, true)
  })

  test('Clipping with a group that is clipped itself (#1618)', () => {
    function createClipped(clipItem) {
      clipItem.clipMask = true
      return new Group([
        clipItem,
        new Path.Rectangle({
          point: [0, 0],
          size: [200, 200],
          fillColor: 'red'
        })
      ])
    }

    // The circle lies inside the group's own clip rectangle, so the group clips
    // with the circle, not with the rectangle around it:
    comparePixels(
      createClipped(
        new Group([
          new Path.Rectangle({
            point: [0, 0],
            size: [50, 50],
            clipMask: true
          }),
          new Path.Circle({ center: [25, 25], radius: 20 })
        ])
      ),
      createClipped(new Path.Circle({ center: [25, 25], radius: 20 })),
      'clipping with a clipped group'
    )
    // SVG with a viewBox imports as a group clipped to the viewBox:
    comparePixels(
      createClipped(
        paper.project.importSVG(
          '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"' +
          ' viewBox="0 0 100 100"><circle cx="50" cy="50" r="20"/></svg>'
        )
      ),
      createClipped(new Path.Circle({ center: [50, 50], radius: 20 })),
      'clipping with imported SVG'
    )
  })

  test('group.isolated keeps compositing inside the group (#474)', () => {
    function createGroup(isolated) {
      const rect = new Path.Rectangle({
        point: [0, 0],
        size: [40, 40],
        fillColor: 'red'
      })
      const eraser = new Group({
        children: [
          new Path.Circle({
            center: [20, 20],
            radius: 10,
            fillColor: 'black',
            blendMode: 'destination-out'
          })
        ],
        isolated
      })
      return new Group([rect, eraser])
    }
    // Without isolation, the circle erases the rectangle below it:
    let raster = createGroup(false).rasterize({ resolution: 72 })
    equals(raster.getPixel(20, 20).alpha, 0, 'erased')
    // With it, it only erases inside its own group:
    raster = createGroup(true).rasterize({ resolution: 72 })
    equals(raster.getPixel(20, 20), new Color(1, 0, 0, 1), 'kept')
    const group = new Group({ isolated: true })
    equals(group.isolated, true, 'isolated')
    equals(
      group.exportJSON(),
      '["Group",{"applyMatrix":true,"isolated":true}]',
      'exportJSON()'
    )
    // Buffered groups read as isolated, but don't store it, so turning
    // buffered off after a round trip leaves them unisolated:
    const buffered = new Group({ buffered: true })
    const json = buffered.exportJSON()
    equals(json, '["Group",{"applyMatrix":true,"buffered":true}]', 'buffered')
    const imported = new Group().importJSON(json)
    imported.buffered = false
    equals(imported.isolated, false, 'unisolated after a round trip')
  })

  test('group.clone() keeps isolated and buffered', () => {
    const isolated = new Group({ isolated: true }).clone()
    equals(() => isolated.isolated, true)
    equals(() => isolated.buffered, false)
    const buffered = new Group({ buffered: true }).clone()
    equals(() => buffered.buffered, true)
    // Buffered groups read as isolated, but keep their own isolated value:
    buffered.buffered = false
    equals(() => buffered.isolated, false)
  })

  describe('group.buffered (#377)', () => {
    // A layer below the buffered one, so its blending shows, and a layer with
    // a buffered group of overlapping paths, nested to see their changes:
    function createScene(options) {
      const below = paper.project.activeLayer
      below.addChild(
        new Path.Rectangle({
          point: [0, 0],
          size: [100, 50],
          fillColor: 'blue'
        })
      )
      const path = new Path.Circle({
        center: [40, 40],
        radius: 30,
        fillColor: 'red',
        strokeColor: 'black',
        strokeWidth: 4
      })
      const layer = new Layer(
        Object.assign(
          {
            children: [
              new Group([
                path,
                new Path.Rectangle({
                  point: [40, 40],
                  size: [50, 50],
                  fillColor: new Color(0, 1, 0, 0.5)
                })
              ])
            ]
          },
          options
        )
      )
      return { below, layer, path }
    }

    function getPixels() {
      const { element } = paper.view
      return Array.from(
        element
          .getContext('2d')
          .getImageData(0, 0, element.width, element.height).data
      )
    }

    function equalPixels(actual, expected, message) {
      // Allow for rounding of half-transparent channels:
      equals(
        actual.filter((value, i) => Math.abs(value - expected[i]) > 1).length,
        0,
        message
      )
    }

    // The buffer only shows in how often the items in it are drawn, so count
    // the calls of the item's draw():
    function countDraws(item) {
      const counter = { count: 0 }
      const { draw } = item
      item.draw = function (...args) {
        counter.count++
        return draw.apply(this, args)
      }
      return counter
    }

    // Buffered groups are isolated, so compare them with isolated groups,
    // which also composite their content, with the same rounding:
    test('draws the same pixels as without the buffer', () => {
      for (const options of [
        {},
        { opacity: 0.5 },
        { blendMode: 'multiply' },
        { blendMode: 'negation' },
        { opacity: 0.5, blendMode: 'multiply', position: [55, 45] }
      ]) {
        const name = JSON.stringify(options)
        const { below, layer, path } = createScene(
          Object.assign({ isolated: true }, options)
        )
        const counter = countDraws(path)
        paper.view.update()
        const expected = getPixels()
        layer.isolated = false
        layer.buffered = true
        paper.view.update()
        equalPixels(getPixels(), expected, `${name}, drawn into the buffer`)
        // Change the layer below and back, to draw from the buffer:
        below.opacity = 0.5
        paper.view.update()
        below.opacity = 1
        paper.view.update()
        equalPixels(getPixels(), expected, `${name}, drawn from the buffer`)
        equals(counter.count, 2, `${name}, drawn into the buffer once`)
        paper.project.clear()
      }
    })

    test('is isolated', () => {
      const { layer } = createScene()
      layer.addChild(
        new Path.Rectangle({
          point: [0, 0],
          size: [100, 100],
          fillColor: 'black',
          blendMode: 'destination-out'
        })
      )
      layer.isolated = true
      paper.view.update()
      const expected = getPixels()
      layer.isolated = false
      layer.buffered = true
      equals(layer.isolated, true, 'layer.isolated')
      paper.view.update()
      equalPixels(getPixels(), expected, 'pixels')
      equals(
        layer.rasterize({ insert: false }).getPixel(10, 10),
        new Color(0, 0, 0, 0),
        'rasterize() erases inside the layer only'
      )
    })

    test('is only drawn again after changes in it', () => {
      const { below, layer, path } = createScene({ buffered: true })
      const counter = countDraws(path)
      paper.view.update()
      equals(counter.count, 1, 'first update')
      below.firstChild.fillColor = 'yellow'
      equals(paper.view.update(), true, 'update after a change below')
      equals(counter.count, 1, 'after a change below')
      path.fillColor = 'orange'
      paper.view.update()
      equals(counter.count, 2, 'after a change of a descendant')
      layer.lastChild.addChild(new Path.Circle([10, 10], 5))
      paper.view.update()
      equals(counter.count, 3, 'after adding a descendant')
      paper.view.zoom = 2
      paper.view.update()
      equals(counter.count, 4, 'after zooming')
      paper.view.translate(10, 0)
      paper.view.update()
      equals(counter.count, 5, 'after panning')
      paper.view.update(true)
      equals(counter.count, 6, 'after a forced update')
    })

    test('draws the selection without drawing the buffer again', () => {
      const { layer, path } = createScene({ isolated: true })
      path.segments[0].selected = true
      path.selected = true
      paper.view.update()
      const expected = getPixels()
      path.selected = false
      layer.isolated = false
      layer.buffered = true
      const counter = countDraws(path)
      paper.view.update()
      path.segments[0].selected = true
      path.selected = true
      equals(paper.view.update(), true, 'update after selecting')
      equals(counter.count, 1, 'after selecting')
      equalPixels(getPixels(), expected, 'pixels')
    })

    test('is drawn again after changes of symbol definitions', () => {
      const definition = new SymbolDefinition(
        new Path.Circle({ center: [0, 0], radius: 10, fillColor: 'red' })
      )
      const layer = new Layer({ buffered: true })
      definition.place([50, 50])
      const counter = countDraws(definition.item)
      paper.view.update()
      equals(counter.count, 1, 'first update')
      new Layer()
      new Path.Circle([10, 10], 5)
      paper.view.update()
      equals(counter.count, 1, 'after a change in another layer')
      definition.item.fillColor = 'blue'
      paper.view.update()
      equals(counter.count, 2, 'after a change of the definition')
      equals(layer.children.length, 1)
    })

    test('is drawn again after changes inside symbol definitions', () => {
      const circle = new Path.Circle({
        center: [0, 0],
        radius: 10,
        fillColor: 'red'
      })
      const definition = new SymbolDefinition(new Group(circle))
      new Layer({ buffered: true })
      definition.place([50, 50])
      const counter = countDraws(definition.item)
      paper.view.update()
      equals(counter.count, 1, 'first update')
      circle.fillColor = 'blue'
      paper.view.update()
      equals(counter.count, 2, 'after a change of a child of the definition')
    })

    test('rasterize() and exportSVG() draw without the buffer', () => {
      const { below, layer, path } = createScene()
      const svg = layer.exportSVG({ asString: true })
      const raster = layer.rasterize({ insert: false })
      layer.buffered = true
      const counter = countDraws(path)
      paper.view.update()
      equals(layer.exportSVG({ asString: true }), svg, 'exportSVG()')
      // Compare without comparePixels(), which inserts items into the active
      // layer:
      equalPixels(
        Array.from(layer.rasterize({ insert: false }).getImageData().data),
        Array.from(raster.getImageData().data),
        'rasterize()'
      )
      equals(counter.count, 2, 'drawn by rasterize()')
      below.firstChild.fillColor = 'yellow'
      paper.view.update()
      equals(counter.count, 2, 'buffer kept after rasterize()')
    })

    test('turning it off or removing the group frees the buffer', () => {
      const { below, layer, path } = createScene({ buffered: true })
      const counter = countDraws(path)
      paper.view.update()
      layer.buffered = false
      paper.view.update()
      below.firstChild.fillColor = 'yellow'
      paper.view.update()
      equals(counter.count, 3, 'drawn without the buffer')
      // Freeing the buffer only shows in the internal field:
      equals(layer._buffer, null, 'buffer after turning it off')
      layer.buffered = true
      paper.view.update()
      equals(counter.count, 4, 'drawn into a new buffer')
      layer.remove()
      equals(layer._buffer, null, 'buffer after removing')
      paper.project.addLayer(layer)
      paper.view.update()
      equals(counter.count, 5, 'drawn into a new buffer after inserting')
    })
  })
})
