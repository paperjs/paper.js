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
import { Base, Path, Point, Rectangle, Size } from 'paper'
import { equals, test } from '../helpers.js'

describe('Rectangle', () => {
  test('new Rectangle(Point, Size);', () => {
    const rect = new Rectangle(new Point(10, 20), new Size(30, 40))
    equals(rect, new Rectangle(10, 20, 30, 40))
  })

  test('new Rectangle({ point, size });', () => {
    let rect = new Rectangle({ point: [10, 20], size: [30, 40] })
    equals(rect, new Rectangle(10, 20, 30, 40))
    rect = new Rectangle({
      point: new Point(10, 20),
      size: new Size(30, 40)
    })
    equals(rect, new Rectangle(10, 20, 30, 40))
  })

  test('new Rectangle(Array, Array);', () => {
    const rect = new Rectangle([10, 20], [30, 40])
    equals(rect, new Rectangle(10, 20, 30, 40))
  })

  test('new Rectangle(Point, Point);', () => {
    const rect = new Rectangle(new Point(10, 20), new Point(30, 40))
    equals(rect, new Rectangle(10, 20, 20, 20))
  })

  test('new Rectangle({ from, to });', () => {
    const rect = new Rectangle({ from: [10, 20], to: [30, 40] })
    equals(rect, new Rectangle(10, 20, 20, 20))
  })

  test('new Rectangle(x, y, width, height);', () => {
    const rect = new Rectangle(10, 20, 30, 40)
    equals(rect, new Rectangle(10, 20, 30, 40))
  })

  test('new Rectangle({ x, y, width, height });', () => {
    const rect = new Rectangle({ x: 10, y: 20, width: 30, height: 40 })
    equals(rect, new Rectangle(10, 20, 30, 40))
  })

  test('new Rectangle(object)', () => {
    const expected = new Rectangle(100, 50, 100, 200)

    equals(
      () =>
        new Rectangle({
          top: expected.top,
          right: expected.right,
          bottom: expected.bottom,
          left: expected.left
        }),
      expected
    )

    function testProperties(key1, key2) {
      const obj = {}
      obj[key1] = expected[key1]
      obj[key2] = expected[key2]
      const rect = new Rectangle(obj)
      equals(
        rect,
        expected,
        'new Rectangle({ ' + key1 + ', ' + key2 + ' });'
      )
    }

    const tests = [
      ['center', 'size'],
      ['topLeft', 'size'],
      ['topRight', 'size'],
      ['bottomRight', 'size'],
      ['bottomLeft', 'size'],
      ['leftCenter', 'size'],
      ['topCenter', 'size'],
      ['rightCenter', 'size'],
      ['bottomCenter', 'size'],
      ['topLeft', 'bottomRight'],
      ['topRight', 'bottomLeft'],
      ['topLeft', 'bottomCenter'],
      ['topLeft', 'rightCenter'],
      ['topRight', 'bottomCenter'],
      ['topRight', 'leftCenter'],
      ['bottomLeft', 'topCenter'],
      ['bottomLeft', 'rightCenter'],
      ['bottomRight', 'topCenter'],
      ['bottomRight', 'leftCenter']
    ]

    tests.forEach(test => {
      testProperties(test[0], test[1])
      testProperties(test[1], test[0])
    })
  })

  test('rect.left / rect.top VS rect.right / rect.bottom', () => {
    let rect = new Rectangle({
      point: [0, 0],
      size: [100, 100]
    })
    rect.left -= 10
    rect.top -= 10
    equals(rect.right, 100)
    equals(rect.bottom, 100)

    rect = new Rectangle([0, 0], [100, 100])
    rect.left -= 10
    rect.top -= 10
    equals(rect.right, 100)
    equals(rect.bottom, 100)

    rect = new Rectangle({
      topLeft: [0, 0],
      bottomRight: [100, 100]
    })
    rect.left -= 10
    rect.top -= 10
    equals(rect.right, 100)
    equals(rect.bottom, 100)
  })

  test('Rectangle side, corner and center setters (#2024)', () => {
    // Sides and corners move only their own edges, centers and #point move the
    // whole rectangle, all on a 100 x 100 rectangle at 0, 0:
    const expected = {
      left: [10, [10, 0, 90, 100]],
      right: [50, [0, 0, 50, 100]],
      top: [10, [0, 10, 100, 90]],
      bottom: [50, [0, 0, 100, 50]],
      topLeft: [[10, 20], [10, 20, 90, 80]],
      topRight: [[50, 20], [0, 20, 50, 80]],
      bottomLeft: [[10, 50], [10, 0, 90, 50]],
      bottomRight: [[50, 60], [0, 0, 50, 60]],
      topCenter: [[70, 20], [20, 20, 100, 80]],
      bottomCenter: [[70, 60], [20, 0, 100, 60]],
      leftCenter: [[10, 70], [10, 20, 90, 100]],
      rightCenter: [[50, 70], [0, 20, 50, 100]],
      centerX: [70, [20, 0, 100, 100]],
      centerY: [70, [0, 20, 100, 100]],
      center: [[70, 20], [20, -30, 100, 100]],
      point: [[10, 20], [10, 20, 100, 100]]
    }
    Base.each(expected, (entry, key) => {
      const rect = new Rectangle(0, 0, 100, 100)
      rect[key] = entry[0]
      equals(rect, new Rectangle(entry[1]), 'rect.' + key)
      // item.bounds is fitted to the changed rectangle:
      const path = new Path.Rectangle(new Rectangle(0, 0, 100, 100))
      path.bounds[key] = entry[0]
      equals(path.bounds, new Rectangle(entry[1]), 'path.bounds.' + key)
    })
    // Repeated and mixed setters keep going from the current rectangle:
    const rect = new Rectangle(0, 0, 100, 100)
    rect.left = 10
    rect.left = 20
    equals(rect, new Rectangle(20, 0, 80, 100), 'rect.left twice')
    rect.right = 50
    equals(
      rect,
      new Rectangle(20, 0, 30, 100),
      'rect.right after rect.left'
    )
    rect.center = [50, 50]
    equals(rect, new Rectangle(35, 0, 30, 100), 'rect.center after sides')
  })

  test('rect.size', () => {
    const rect = new Rectangle(10, 10, 20, 30)
    equals(() => rect.size.equals([20, 30]), true)
    rect.size = [30, 40]
    equals(rect, new Rectangle(10, 10, 30, 40))
  })

  test('rect.center', () => {
    const rect = new Rectangle(10, 10, 20, 30)
    equals(() => rect.size, new Size(20, 30))
    equals(() => rect.center, new Point(20, 25))
    rect.center = [100, 100]
    equals(() => rect.center, new Point(100, 100))
    equals(() => rect.size, new Size(20, 30))
    rect.center = [200, 200]
    equals(() => rect.center, new Point(200, 200))
    equals(() => rect.size, new Size(20, 30))
  })

  test('rect.topLeft', () => {
    const rect = new Rectangle(10, 10, 20, 20)
    let point = rect.topLeft
    equals(point, { x: 10, y: 10 })
    rect.topLeft = [10, 15]
    point = rect.topLeft
    equals(point, { x: 10, y: 15 })
  })

  test('rect.topRight', () => {
    let rect = new Rectangle(10, 10, 20, 20)
    let point = rect.topRight
    equals(point, { x: 30, y: 10 })
    rect = new Rectangle(10, 10, 20, 20)
    rect.topRight = [10, 15]
    point = rect.topRight
    equals(point, { x: 10, y: 15 })
  })

  test('rect.bottomLeft', () => {
    let rect = new Rectangle(10, 10, 20, 20)
    let point = rect.bottomLeft
    equals(point, { x: 10, y: 30 })
    rect = new Rectangle(10, 10, 20, 20)
    rect.bottomLeft = [10, 15]
    point = rect.bottomLeft
    equals(point, { x: 10, y: 15 })
  })

  test('rect.bottomRight', () => {
    let rect = new Rectangle(10, 10, 20, 20)
    let point = rect.bottomRight
    equals(point, { x: 30, y: 30 })
    rect = new Rectangle(10, 10, 20, 20)
    rect.bottomRight = [10, 15]
    point = rect.bottomRight
    equals(point, { x: 10, y: 15 })
  })

  test('rect.bottomCenter', () => {
    let rect = new Rectangle(10, 10, 20, 20)
    let point = rect.bottomCenter
    equals(point, { x: 20, y: 30 })
    rect = new Rectangle(10, 10, 20, 20)
    rect.bottomCenter = [10, 15]
    point = rect.bottomCenter
    equals(point, { x: 10, y: 15 })
  })

  test('rect.topCenter', () => {
    let rect = new Rectangle(10, 10, 20, 20)
    let point = rect.topCenter
    equals(point, { x: 20, y: 10 })
    rect = new Rectangle(10, 10, 20, 20)
    rect.topCenter = [10, 15]
    point = rect.topCenter
    equals(point, { x: 10, y: 15 })
  })

  test('rect.leftCenter', () => {
    let rect = new Rectangle(10, 10, 20, 20)
    let point = rect.leftCenter
    equals(point, { x: 10, y: 20 })
    rect = new Rectangle(10, 10, 20, 20)
    rect.leftCenter = [10, 15]
    point = rect.leftCenter
    equals(point, { x: 10, y: 15 })
  })

  test('rect.rightCenter', () => {
    let rect = new Rectangle(10, 10, 20, 20)
    let point = rect.rightCenter
    equals(point, { x: 30, y: 20 })
    rect = new Rectangle(10, 10, 20, 20)
    rect.rightCenter = [10, 15]
    point = rect.rightCenter
    equals(point, { x: 10, y: 15 })
  })

  test('rect1.intersects(rect2)', () => {
    let rect1 = new Rectangle(160, 270, 20, 20)
    let rect2 = new Rectangle(195, 301, 19, 19)
    equals(() => rect1.intersects(rect2), false)
    rect1 = new Rectangle(160, 270, 20, 20)
    rect2 = new Rectangle(170.5, 280.5, 19, 19)
    equals(() => rect1.intersects(rect2), true)
  })

  test('rect1.contains(rect2)', () => {
    let rect1 = new Rectangle(160, 270, 20, 20)
    let rect2 = new Rectangle(195, 301, 19, 19)
    equals(() => rect1.contains(rect2), false)
    rect1 = new Rectangle(160, 270, 20, 20)
    rect2 = new Rectangle(170.5, 280.5, 19, 19)
    equals(() => rect1.contains(rect2), false)

    rect1 = new Rectangle(299, 161, 137, 129)
    rect2 = new Rectangle(340, 197, 61, 61)
    equals(() => rect1.contains(rect2), true)
    equals(() => rect2.contains(rect1), false)
  })

  test('rect.contains(point)', () => {
    const rect = new Rectangle(160, 270, 20, 20)
    let point = new Point(166, 280)
    equals(() => rect.contains(point), true)
    point = new Point(30, 30)
    equals(() => rect.contains(point), false)
  })

  test('rect1.intersect(rect2)', () => {
    const rect1 = new Rectangle(160, 270, 20, 20)
    const rect2 = new Rectangle(170.5, 280.5, 19, 19)
    const intersected = rect1.intersect(rect2)
    equals(
      () => intersected.equals(new Rectangle(170.5, 280.5, 9.5, 9.5)),
      true
    )
  })

  test('rect1.unite(rect2)', () => {
    const rect1 = new Rectangle(160, 270, 20, 20)
    const rect2 = new Rectangle(170.5, 280.5, 19, 19)
    const united = rect1.unite(rect2)
    equals(() => united.equals(new Rectangle(160, 270, 29.5, 29.5)), true)
  })

  test('rect.include(point)', () => {
    const rect1 = new Rectangle(95, 151, 20, 20)
    const included = rect1.include([50, 50])
    equals(() => included.equals(new Rectangle(50, 50, 65, 121)), true)
  })

  test('rect.scale()', () => {
    const rect = new Rectangle(10, 20, 30, 40)
    equals(rect.scale(2), new Rectangle(-5, 0, 60, 80))
    equals(rect.scale(2, 0.5), new Rectangle(-5, 30, 60, 20))
  })

  test('rect.scale(amount, center) (#1352)', () => {
    const rect = new Rectangle(10, 20, 30, 40)
    equals(rect.scale(2, [10, 20]), new Rectangle(10, 20, 60, 80))
    equals(
      rect.scale(2, 0.5, new Point(40, 60)),
      new Rectangle(-20, 40, 60, 20)
    )
    // Negative amounts mirror the rectangle about the center:
    equals(rect.scale(-1, [10, 20]), new Rectangle(-20, -20, 30, 40))
  })

  test('rect.toString()', () => {
    const string = new Rectangle(10, 20, 30, 40).toString()
    equals(string, '{ x: 10, y: 20, width: 30, height: 40 }')
  })

  test('Rectangle#values', () => {
    equals(new Rectangle(10, 20, 30, 40).values, [10, 20, 30, 40])
    // Rectangles linked to their items read through them:
    const path = new Path.Rectangle([50, 60], [70, 80])
    equals(path.bounds.values, [50, 60, 70, 80], 'item bounds')
  })
})
