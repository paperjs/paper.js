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
  Gradient,
  GradientStop,
  Group,
  Matrix,
  Path,
  Point,
  Shape
} from 'paper'
import { comparePixels, equals, test } from '../helpers.js'

describe('Color', () => {
  test('Set named color', () => {
    const path = new Path()
    path.fillColor = 'red'
    equals(path.fillColor, new Color(1, 0, 0))
    equals(path.fillColor.toCSS(), 'rgb(255,0,0)')
  })

  test('Set color to hex', () => {
    let path = new Path()
    path.fillColor = '#ff0000'
    equals(path.fillColor, new Color(1, 0, 0))
    equals(path.fillColor.toCSS(), 'rgb(255,0,0)')

    path = new Path()
    path.fillColor = '#f00'
    equals(path.fillColor, new Color(1, 0, 0))
    equals(path.fillColor.toCSS(), 'rgb(255,0,0)')
  })

  test('Set color to object', () => {
    let path = new Path()
    path.fillColor = { red: 1, green: 0, blue: 1 }
    equals(path.fillColor, new Color(1, 0, 1))
    equals(path.fillColor.toCSS(), 'rgb(255,0,255)')

    path = new Path()
    path.fillColor = { gray: 0.2 }
    equals(path.fillColor, new Color(0.2))
    equals(path.fillColor.toCSS(), 'rgb(51,51,51)')
  })

  test('Set color to array', () => {
    const path = new Path()
    path.fillColor = [1, 0, 0]
    equals(path.fillColor, new Color(1, 0, 0))
    equals(path.fillColor.toCSS(), 'rgb(255,0,0)')
  })

  test('Creating Colors', () => {
    equals(
      new Color(),
      new Color(0, 0, 0),
      'Color with no arguments should be black'
    )

    equals(
      new Color('black'),
      new Color(0, 0, 0),
      'Color from name (black)'
    )

    equals(new Color('red'), new Color(1, 0, 0), 'Color from name (red)')

    equals(
      new Color('transparent'),
      new Color(0, 0, 0, 0),
      'Color from name (transparent)'
    )

    equals(
      new Color('#ff0000'),
      new Color(1, 0, 0),
      'Color from hex string'
    )

    equals(
      new Color('#FF3300'),
      new Color(1, 0.2, 0),
      'Color from uppercase hex string'
    )

    equals(
      new Color('#f009'),
      new Color(1, 0, 0, 0.6),
      'Color from 4 characters hex code with alpha'
    )

    equals(
      new Color('#ff000099'),
      new Color(1, 0, 0, 0.6),
      'Color from 8 characters hex code with alpha'
    )

    equals(
      new Color('rgb(255, 0, 0)'),
      new Color(1, 0, 0),
      'Color from rgb() string'
    )

    equals(
      new Color('rgba(255, 0, 0, 0.5)'),
      new Color(1, 0, 0, 0.5),
      'Color from rgba() string'
    )

    equals(
      new Color('rgba( 255, 0, 0, 0.5 )'),
      new Color(1, 0, 0, 0.5),
      'Color from rgba() string 2nd test'
    )

    equals(
      new Color('rgb(100%, 50%, 0%)'),
      new Color(1, 0.5, 0),
      'Color from rgb() percenst string'
    )

    equals(
      new Color('hsl(180deg, 20%, 40%)'),
      new Color({ hue: 180, saturation: 0.2, lightness: 0.4 }),
      'Color from hsl() string'
    )

    equals(
      new Color({ red: 1, green: 0, blue: 1 }),
      new Color(1, 0, 1),
      'Color from RGB object literal'
    )

    equals(
      new Color({ gray: 0.2 }),
      new Color(0.2),
      'Color from gray object literal'
    )

    equals(
      new Color({ hue: 0, saturation: 1, brightness: 1 }),
      new Color(1, 0, 0).convert('hsb'),
      'Color from HSB object literal'
    )

    equals(new Color([1, 0, 0]), new Color(1, 0, 0), 'RGB Color from array')

    equals(new Color([1]), new Color(1), 'Gray Color from array')
  })

  test('Get gray from RGB Color', () => {
    let color = new Color(1, 0.5, 0.2)
    equals(color.gray, 0.6152)

    color = new Color(0.5, 0.2, 0.1)
    equals(color.gray, 0.27825)
  })

  test('Get gray from HSB Color', () => {
    const color = new Color({ hue: 0, saturation: 0, brightness: 0.2 })
    equals(color.gray, 0.19998)
  })

  test('Get red from HSB Color', () => {
    const color = new Color({ hue: 0, saturation: 1, brightness: 1 })
    equals(color.red, 1)
  })

  test('Get hue from RGB Color', () => {
    const color = new Color(1, 0, 0)
    equals(color.hue, 0)
    equals(color.saturation, 1)
  })

  test('Get gray after conversion', () => {
    const color = new Color(1)
    equals(color.gray, 1, 'color.gray')
    equals(color.red, 1, 'color.red')
    equals(color.blue, 1, 'color.blue')

    color.red = 0.5
    equals(color.gray, 0.85045, 'color.gray')

    color.green = 0.2

    equals(color.red, 0.5, 'color.red')
    equals(color.green, 0.2, 'color.green')
    equals(color.blue, 1, 'color.blue')

    equals(color.gray, 0.38085, 'color.gray')
  })

  test('Converting Colors', () => {
    const rgbColor = new Color(1, 0.5, 0.2)
    equals(rgbColor.gray, 0.6152)
    const grayColor = new Color(0.2)
    equals(grayColor.convert('rgb'), new Color(0.2, 0.2, 0.2))
    equals(
      grayColor.convert('hsb'),
      new Color({ hue: 0, saturation: 0, brightness: 0.2 })
    )
    equals(
      new Color(1, 0, 0).convert('hsb'),
      new Color({ hue: 0, saturation: 1, brightness: 1 })
    )
  })

  test('Setting Color#gray', () => {
    const color = new Color(1, 0.5, 0.2)
    color.gray = 0.1
    equals(color, new Color(0.1))
  })

  test('Setting Color#red', () => {
    const color = new Color({ hue: 180, saturation: 0, brightness: 0 })
    color.red = 1
    equals(color, new Color(1, 0, 0))
  })

  test('Setting Color#gray', () => {
    const color = new Color({ hue: 180, saturation: 0, brightness: 0 })
    color.gray = 0.5
    equals(color, new Color(0.5))
  })

  test('Color.read()', () => {
    const color = Color.read([0, 0, 1])
    equals(color, new Color(0, 0, 1))
  })

  test('Color#clone()', () => {
    const color = new Color(0, 0, 0)
    equals(() => color.clone() !== color, true)

    equals(() => new Color(color) !== color, true)
  })

  test('Color#convert()', () => {
    const color = new Color(0, 0, 0)
    const converted = color.convert('rgb')
    equals(() => converted !== color, true)
    equals(() => converted.equals(color), true)
  })

  test('Getting saturation from black RGB Color', () => {
    equals(() => new Color(0, 0, 0).saturation === 0, true)
  })

  test('Color#add()', () => {
    let color = new Color(0, 1, 1)
    equals(color.add([1, 0, 0]), new Color([1, 1, 1]))
    equals(color.add([1, 0.5, 0]), new Color([1, 1.5, 1]))
    color = new Color(0, 0.5, 0)
    equals(color.add(0.5), new Color([0.5, 1, 0.5]))
  })

  test('Color#subtract()', () => {
    let color = new Color(0, 1, 1)
    equals(color.subtract([0, 1, 1]), new Color([0, 0, 0]))
    equals(color.subtract([0, 0.5, 1]), new Color([0, 0.5, 0]))
    color = new Color(1, 1, 1)
    equals(color.subtract(0.5), new Color([0.5, 0.5, 0.5]))
  })

  test('Color#multiply()', () => {
    let color = new Color(1, 0.5, 0.25)
    equals(color.multiply([0.25, 0.5, 1]), new Color([0.25, 0.25, 0.25]))
    color = new Color(1, 1, 1)
    equals(color.multiply(0.5), new Color([0.5, 0.5, 0.5]))
    color = new Color(0.5, 0.5, 0.5)
    equals(color.multiply(2), new Color([1, 1, 1]))
  })

  test('Color#divide()', () => {
    let color = new Color(1, 1, 1)
    equals(color.divide([1, 2, 4]), new Color([1, 0.5, 0.25]))
    color = new Color(1, 0.5, 0.25)
    equals(color.divide(0.25), new Color([4, 2, 1]))
    color = new Color(1, 1, 1)
    equals(color.divide(4), new Color([0.25, 0.25, 0.25]))
  })

  test('Color#equals()', () => {
    const red = new Color('red')
    equals(() => new Color(1, 0, 0).equals(red), true)
    equals(() => new Color(1, 0, 0, 1).equals(red), true)
  })

  test('Gradient', () => {
    const stop1 = new GradientStop({ offset: 0.5 })
    const stop2 = new GradientStop('red', 0.75)
    const stop3 = new GradientStop(['white', 1])
    const stop4 = new GradientStop({ rampPoint: 0.5 }) // deprecated
    new Gradient([stop1, stop2, stop3], true)
    equals(() => stop1.color, new Color(0, 0, 0))
    equals(() => stop2.color, new Color(1, 0, 0))
    equals(() => stop3.color, new Color(1, 1, 1))
    equals(() => stop4.color, new Color(0, 0, 0))
    equals(() => stop1.offset, 0.5)
    equals(() => stop2.offset, 0.75)
    equals(() => stop3.offset, 1)
    equals(() => stop4.offset, 0.5)
  })

  test('Gradients with applyMatrix', () => {
    const topLeft = [100, 100]
    const bottomRight = [400, 400]
    const gradientColor = {
      gradient: {
        stops: ['yellow', 'red', 'blue']
      },
      origin: topLeft,
      destination: bottomRight
    }

    const path = new Path.Rectangle({
      topLeft,
      bottomRight,
      fillColor: gradientColor,
      applyMatrix: true
    })

    const shape = new Shape.Rectangle({
      topLeft,
      bottomRight,
      fillColor: gradientColor,
      applyMatrix: false
    })

    comparePixels(path, shape)

    path.scale(2)
    path.rotate(45)
    shape.scale(2)
    shape.rotate(45)

    comparePixels(path, shape)
  })

  test('Gradients transform with their item, also unevenly (#1744)', () => {
    // Items that keep their matrix draw their gradient through it, as it should
    // look. Items that apply it transform their gradient color, which has to
    // give the same:
    ;[true, false].forEach(radial => {
      const gradientColor = {
        gradient: { stops: ['yellow', 'red', 'blue'], radial },
        origin: [250, 250],
        destination: [400, 300],
        highlight: radial ? [280, 240] : null
      }
      const path = new Path.Rectangle({
        topLeft: [100, 100],
        bottomRight: [400, 400],
        fillColor: gradientColor,
        applyMatrix: true
      })
      const shape = new Shape.Rectangle({
        topLeft: [100, 100],
        bottomRight: [400, 400],
        fillColor: gradientColor,
        applyMatrix: false
      })
      for (const item of [path, shape]) {
        item.scale(2, 0.5)
        item.shear(0.5, 0)
        item.rotate(30)
      }
      comparePixels(path, shape, radial ? 'radial' : 'linear')
    })
  })

  test('Color#aspect', () => {
    function createColor() {
      return new Color({
        gradient: { stops: ['white', 'blue'], radial: true },
        origin: [0, 0],
        destination: [10, 0]
      })
    }
    const color = createColor()
    equals(color.aspect, 1, 'circles by default')
    color.transform(new Matrix().scale(2, 1))
    equals(color.destination, new Point(20, 0), 'the destination')
    equals(color.aspect, 0.5, 'and the aspect of an uneven scale')
    const sheared = createColor()
    sheared.transform(new Matrix().shear(1, 0))
    // A shear by 1 turns a circle into an ellipse whose axes are in the ratio
    // of the golden ratio squared:
    equals(sheared.aspect, (3 - Math.sqrt(5)) / 2, 'the aspect of a shear')
    equals(
      sheared.destination.length,
      10 * ((1 + Math.sqrt(5)) / 2),
      'its major axis'
    )
    const linear = new Color({
      gradient: { stops: ['white', 'blue'] },
      origin: [0, 0],
      destination: [10, 0]
    })
    linear.transform(new Matrix().shear(0, 1))
    equals(
      linear.destination,
      new Point(10, 0),
      'linear gradients keep running across their stripes'
    )
    const path = new Path({ fillColor: createColor() })
    equals(
      path.exportJSON().includes('[10,0]]'),
      true,
      'JSON of circles as before'
    )
    path.fillColor = color
    const copy = new Path().importJSON(path.exportJSON())
    equals(copy.fillColor.aspect, 0.5, 'JSON of ellipses')
    const imported = paper.project.importSVG(
      path.exportSVG({ asString: true })
    )
    equals(imported.fillColor.aspect, 0.5, 'SVG, through gradientTransform')
    equals(imported.fillColor.destination, color.destination, 'its axis')
  })

  test('Gradients with strokeScaling: false', () => {
    const topLeft = [100, 100]
    const bottomRight = [400, 400]
    const gradientColor = {
      gradient: {
        stops: ['yellow', 'red', 'blue']
      },
      origin: topLeft,
      destination: bottomRight
    }

    // strokeScaling does not affect fills, so a non-scaling shape has to look
    // the same as a scaling one:
    let expected = new Shape.Rectangle({
      topLeft,
      bottomRight,
      fillColor: gradientColor,
      strokeScaling: true
    })

    const shape = new Shape.Rectangle({
      topLeft,
      bottomRight,
      fillColor: gradientColor,
      strokeScaling: false
    })

    comparePixels(shape, expected)

    expected.scale(2)
    expected.rotate(45)
    shape.scale(2)
    shape.rotate(45)

    comparePixels(shape, expected)

    // Gradients drawn without stroke scaling depend on the view, so they must
    // not be reused when drawing at another resolution, or with scaling.
    // NOTE: comparePixels() moves the items, clearing their cached styles, so
    // we rasterize them directly here:
    shape.rasterize(72, false)
    comparePixels(
      shape.rasterize(144, false),
      expected.rasterize(144, false)
    )
    shape.strokeScaling = true
    comparePixels(
      shape.rasterize(144, false),
      expected.rasterize(144, false)
    )

    // A non-scaling stroke on a transformed path has to look the same as the
    // stroke of the same width on a path with the transformation applied to
    // its geometry and gradient:
    expected = new Path.Rectangle({
      topLeft,
      bottomRight,
      fillColor: gradientColor,
      strokeColor: gradientColor,
      strokeWidth: 20
    })

    const path = new Path.Rectangle({
      topLeft,
      bottomRight,
      fillColor: gradientColor,
      strokeColor: gradientColor,
      strokeWidth: 20,
      strokeScaling: false,
      applyMatrix: false
    })

    expected.scale(2)
    expected.rotate(45)
    path.scale(2)
    path.rotate(45)

    equals(path.matrix.isIdentity(), false, 'path.matrix.isIdentity()')
    comparePixels(path, expected)
  })

  test('Modifying group.strokeColor for multiple children', () => {
    const item = new Group(new Path(), new Path())
    item.strokeColor = 'red'
    item.strokeColor
    item.strokeColor.hue = 50
    equals(() => item.strokeColor !== undefined, true)
  })
})
