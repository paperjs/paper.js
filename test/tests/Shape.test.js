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
import { Shape, Size } from 'paper'
import { equals, test } from '../helpers.js'

describe('Shape', () => {
  test('shape.toPath().toShape()', () => {
    const shapes = {
      circle: new Shape.Circle({
        center: [100, 100],
        radius: 50,
        fillColor: 'red'
      }),

      ellipse: new Shape.Ellipse({
        center: [100, 200],
        radius: [50, 25],
        fillColor: 'blue',
        strokeColor: 'black',
        strokeWidth: 4,
        rotation: 20
      }),

      rect: new Shape.Rectangle({
        center: [100, 300],
        size: [100, 50],
        fillColor: 'green',
        strokeColor: 'black',
        strokeWidth: 4,
        rotation: -20
      }),

      roundRect: new Shape.Rectangle({
        center: [100, 400],
        size: [50, 100],
        radius: [15, 20],
        fillColor: 'orange',
        strokeColor: 'black',
        strokeWidth: 4,
        rotation: 20
      })
    }

    for (const [name, shape] of Object.entries(shapes)) {
      equals(
        shape.toPath().toShape(),
        shape,
        name + '.toPath().toShape()'
      )
    }
  })

  test('new Shape.Rectangle() with position set before size', () => {
    const shape1 = new Shape.Rectangle({
      position: [0, 0],
      size: new Size(100, 100)
    })
    equals(shape1.bounds.width, 100)
  })

  test('Shape.Rectangle radius works with negative size', () => {
    const shape = new Shape.Rectangle({
      center: [50, 50],
      size: 50,
      fillColor: 'black'
    })

    shape.size = [-25, -25]

    equals(shape.radius.width, 0)
    equals(shape.radius.height, 0)

    shape.radius = [10, 50]
    shape.size = [50, -25]

    equals(shape.radius.width, 10)
    equals(shape.radius.height, 12.5)

    shape.size = [50, 75]

    equals(shape.radius.height, 12.5)
  })

  test('new Shape.Rectangle(rectangle, radius)', () => {
    const shape = new Shape.Rectangle([0, 0, 10, 20], 2)
    equals(shape.size, new Size(10, 20))
    equals(shape.radius, new Size(2, 2))
  })

  test(`new Shape({ type: 'circle', radius })`, () => {
    const shape = new Shape({ type: 'circle', radius: 10 })
    equals(shape.size, new Size(20, 20))
    equals(shape.radius, 10)
  })

  test('Shape#equals() compares type, size and radius', () => {
    const rectangle = new Shape.Rectangle({
      point: [0, 0],
      size: [40, 20],
      radius: 5
    })
    equals(rectangle.equals(rectangle.clone()), true)
    const other = rectangle.clone()
    other.radius = 6
    equals(rectangle.equals(other), false, 'radius')
    equals(
      rectangle.equals(new Shape.Ellipse({ point: [0, 0], size: [40, 20] })),
      false,
      'type'
    )
  })

  test('Shape#size and #radius keep each other in shape', () => {
    // Circles take the average of width and height:
    const circle = new Shape.Circle({ center: [0, 0], radius: 10 })
    circle.size = [20, 40]
    equals([circle.size, circle.radius], [new Size(30, 30), 15])
    // Ellipses take half of each:
    const ellipse = new Shape.Ellipse({ point: [0, 0], size: [10, 10] })
    ellipse.size = [20, 40]
    equals(ellipse.radius, new Size(10, 20))
    // Rectangles grow to fit their radius:
    const rectangle = new Shape.Rectangle({ point: [0, 0], size: [10, 10] })
    rectangle.radius = [10, 8]
    equals(
      [rectangle.size, rectangle.radius],
      [new Size(20, 16), new Size(10, 8)]
    )
  })

  test('Shape#contains() of rounded rectangles leaves out their corners', () => {
    const rectangle = new Shape.Rectangle({
      point: [0, 0],
      size: [40, 40],
      radius: 10,
      fillColor: 'black'
    })
    equals(rectangle.contains([1, 1]), false, 'beyond the corner')
    equals(rectangle.contains([4, 4]), true, 'within the corner')
    equals(rectangle.contains([20, 1]), true, 'along the side')
  })

  test('Shapes with opacity draw directly unless filled and stroked', () => {
    const getAlpha = shape => {
      const raster = shape.rasterize({ resolution: 72, insert: false })
      return raster.getPixel(raster.width / 2, raster.height / 2).alpha
    }
    const circle = new Shape.Circle({
      center: [20, 20],
      radius: 10,
      fillColor: 'black',
      opacity: 0.5
    })
    equals(getAlpha(circle), 0.5, null, { tolerance: 0.01 })
    circle.set({ strokeColor: 'black', strokeWidth: 4 })
    equals(getAlpha(circle), 0.5, null, { tolerance: 0.01 })
  })
})
