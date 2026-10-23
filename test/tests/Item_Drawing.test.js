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
  Matrix,
  Path,
  Point,
  Rectangle,
  SymbolDefinition
} from 'paper'
import { equals, test } from '../helpers.js'

describe('Item Drawing', () => {
  // Read the color of the view's pixel at x, y in view coordinates:
  function getViewPixel(x, y) {
    const { pixelRatio, element } = paper.view
    const data = element
      .getContext('2d')
      .getImageData(x * pixelRatio, y * pixelRatio, 1, 1).data
    return new Color(data[0] / 255, data[1] / 255, data[2] / 255, data[3] / 255)
  }

  function fillBlue(ctx, x, y, width, height) {
    ctx.fillStyle = 'blue'
    ctx.fillRect(x, y, width, height)
  }

  const red = new Color(1, 0, 0, 1)
  const blue = new Color(0, 0, 1, 1)
  const empty = new Color(0, 0, 0, 0)

  describe('Item#onDraw', () => {
    test('is called in views with the documented fields', () => {
      const path = new Path.Rectangle({
        point: [0, 0],
        size: [20, 20],
        fillColor: 'red',
        applyMatrix: false
      })
      path.scale(2, [0, 0])
      path.translate(10, 10)
      paper.view.translate(5, 0)
      const events = []
      path.onDraw = function (event) {
        events.push(event)
        // Draw in the item's coordinates, from 0 to 10 in item space:
        fillBlue(event.context, 0, 0, 10, 10)
        return false
      }
      paper.view.update(true)
      equals(events.length, 1, 'calls')
      const event = events[0]
      equals(event.item === path, true, 'event.item')
      equals(
        event.context === paper.view.element.getContext('2d'),
        true,
        'event.context'
      )
      equals(
        event.matrix,
        new Matrix().translate(15, 10).scale(2),
        'event.matrix'
      )
      equals(event.pixelRatio, paper.view.pixelRatio, 'event.pixelRatio')
      equals(event.view === paper.view, true, 'event.view')
      equals(getViewPixel(20, 15), blue, 'drawn in the item coordinates')
      equals(getViewPixel(50, 45), empty, 'default drawing skipped')
    })

    test('is called in rasterize() with the documented fields', () => {
      const path = new Path.Rectangle({
        point: [0, 0],
        size: [20, 20],
        fillColor: 'red',
        applyMatrix: false
      })
      path.scale(2, [0, 0])
      path.translate(10, 10)
      const events = []
      path.onDraw = function (event) {
        events.push(event)
        fillBlue(event.context, 0, 0, 10, 10)
        return false
      }
      const raster = path.rasterize({ resolution: 144, insert: false })
      equals(events.length, 1, 'calls')
      const event = events[0]
      equals(event.item === path, true, 'event.item')
      equals(
        event.context === raster.getContext(),
        true,
        'event.context'
      )
      // The raster starts at the top-left corner of the path's bounds:
      equals(
        event.matrix,
        new Matrix().scale(2),
        'event.matrix'
      )
      equals(event.pixelRatio, 2, 'event.pixelRatio')
      equals(event.view, null, 'event.view')
      // Item coordinates 0 to 10 are 0 to 20 in the project, and 0 to 40
      // in the raster's pixels at a pixel ratio of 2:
      equals(raster.getPixel(30, 30), blue, 'drawn in the item coordinates')
      equals(raster.getPixel(60, 60), empty, 'default drawing skipped')
    })

    test('draws beneath the default drawing in a transformed group', () => {
      const group = new Group({
        children: [
          new Path.Rectangle({
            point: [10, 10],
            size: [20, 20],
            fillColor: 'red'
          })
        ],
        applyMatrix: false
      })
      group.translate(20, 20)
      group.onDraw = function (event) {
        fillBlue(event.context, 0, 0, 50, 50)
      }
      paper.view.update(true)
      equals(getViewPixel(40, 40), red, 'the default drawing on top')
      equals(getViewPixel(25, 25), blue, 'the handler beneath')
      equals(getViewPixel(15, 15), empty, 'nothing outside the group space')
    })

    // Paths without stroke scaling draw in view coordinates, but the handler
    // still gets the item's:
    test('draws in the item coordinates without stroke scaling', () => {
      const path = new Path.Rectangle({
        point: [0, 0],
        size: [20, 20],
        strokeColor: 'red',
        strokeScaling: false,
        applyMatrix: false
      })
      path.scale(2, [0, 0])
      path.onDraw = function (event) {
        fillBlue(event.context, 0, 0, 10, 10)
        return false
      }
      paper.view.update(true)
      equals(getViewPixel(15, 15), blue, 'drawn in the item coordinates')
    })

    test(`isn't called for clip masks, which only clip`, () => {
      const mask = new Path.Rectangle({
        point: [0, 0],
        size: [50, 50],
        clipMask: true
      })
      const path = new Path.Rectangle({
        point: [10, 10],
        size: [60, 60],
        fillColor: 'red'
      })
      new Group([mask, path])
      const items = []
      mask.onDraw = path.onDraw = function () {
        items.push(this)
      }
      paper.view.update(true)
      equals(items.length === 1 && items[0] === path, true, 'drawn items')
    })

    test('event.preventDefault() skips the default drawing', () => {
      const path = new Path.Rectangle({
        point: [10, 10],
        size: [20, 20],
        fillColor: 'red'
      })
      path.onDraw = function (event) {
        event.preventDefault()
      }
      paper.view.update(true)
      equals(getViewPixel(20, 20), empty, 'default drawing skipped')
      path.onDraw = function () {}
      paper.view.update(true)
      equals(getViewPixel(20, 20), red, 'default drawing after a handler')
    })

    test('is called once per placement of a symbol', () => {
      const path = new Path.Rectangle({
        point: [0, 0],
        size: [10, 10],
        fillColor: 'red'
      })
      const definition = new SymbolDefinition(path)
      definition.place([20, 20])
      definition.place([60, 20])
      const matrices = []
      path.onDraw = function (event) {
        matrices.push(event.matrix)
        fillBlue(event.context, -5, -5, 10, 10)
        return false
      }
      paper.view.update(true)
      equals(matrices.length, 2, 'calls')
      equals(matrices[0], new Matrix().translate(20, 20), 'first placement')
      equals(matrices[1], new Matrix().translate(60, 20), 'second placement')
      equals(getViewPixel(20, 20), blue, 'drawn at the first placement')
      equals(getViewPixel(60, 20), blue, 'drawn at the second placement')
    })

    test('is only called in buffered groups when they draw their buffer', () => {
      const path = new Path.Rectangle({
        point: [10, 10],
        size: [20, 20],
        fillColor: 'red'
      })
      new Group({ children: [path], buffered: true })
      let count = 0
      path.onDraw = function () {
        count++
      }
      paper.view.update()
      equals(count, 1, 'drawn into the buffer')
      new Path.Rectangle({
        point: [50, 50],
        size: [20, 20],
        fillColor: 'red'
      })
      paper.view.update()
      equals(count, 1, 'drawn from the buffer')
      path.fillColor = 'blue'
      paper.view.update()
      equals(count, 2, 'drawn into the buffer again')
    })

    test(`doesn't draw into hit testing, bounds and SVG export`, () => {
      const path = new Path.Rectangle({
        point: [10, 10],
        size: [20, 20],
        fillColor: 'red'
      })
      const svg = path.exportSVG({ asString: true })
      path.onDraw = function (event) {
        fillBlue(event.context, 50, 50, 20, 20)
      }
      paper.view.update(true)
      equals(getViewPixel(60, 60), blue, 'drawn')
      equals(path.hitTest(new Point(60, 60)), null, 'hitTest()')
      equals(path.bounds, new Rectangle(10, 10, 20, 20), 'bounds')
      equals(path.exportSVG({ asString: true }), svg, 'exportSVG()')
    })
  })

  describe('Item#onDrawSelection', () => {
    test('is called for selected items with the documented fields', () => {
      const path = new Path.Rectangle({
        point: [10, 10],
        size: [20, 20],
        strokeColor: 'red',
        applyMatrix: false
      })
      path.translate(10, 0)
      paper.view.translate(0, 5)
      const events = []
      path.onDrawSelection = function (event) {
        events.push(event)
      }
      paper.view.update(true)
      equals(events.length, 0, 'not called while unselected')
      path.selected = true
      paper.view.update(true)
      equals(events.length, 1, 'called once selected')
      const event = events[0]
      equals(event.item === path, true, 'event.item')
      equals(
        event.context === paper.view.element.getContext('2d'),
        true,
        'event.context'
      )
      equals(
        event.matrix,
        new Matrix().translate(10, 5),
        'event.matrix'
      )
      equals(event.size, paper.settings.handleSize, 'event.size')
      equals(event.color, new Color('#009dec'), 'event.color')
      equals(event.view === paper.view, true, 'event.view')
      path.selectedColor = 'red'
      paper.view.update(true)
      equals(
        events[1].color,
        new Color('red'),
        'event.color with selectedColor'
      )
    })

    test('draws over the content and false skips the default', () => {
      const path = new Path.Rectangle({
        point: [10, 10],
        size: [20, 20],
        strokeColor: 'black',
        selectedColor: 'red',
        selected: true
      })
      // A later sibling covering the path:
      new Path.Rectangle({
        point: [0, 0],
        size: [50, 50],
        fillColor: 'green'
      })
      path.onDrawSelection = function (event) {
        const point = event.matrix.transform(new Point(20, 20))
        fillBlue(event.context, point.x, point.y, 5, 5)
        return false
      }
      paper.view.update(true)
      equals(getViewPixel(22, 22), blue, 'drawn over the later sibling')
      // The selection's 1pt line at y = 10 covers half of the pixel row, over
      // the green sibling, which has no red:
      equals(getViewPixel(20, 10).red, 0, 'default selection drawing skipped')
      path.onDrawSelection = null
      paper.view.update(true)
      equals(getViewPixel(20, 10).red > 0, true, 'default selection drawing')
    })
  })
})
