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
import paper, { Color, Group, Path, Point, PointText, Rectangle } from 'paper'
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
  })
})
