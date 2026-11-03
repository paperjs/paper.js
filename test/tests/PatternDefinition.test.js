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
  PatternDefinition,
  PointText,
  Project,
  Raster,
  Rectangle,
  Shape,
  Size
} from 'paper'
import { comparePixels, equals, test, testFontFamily } from '../helpers.js'

// A pattern of red 5 × 5 squares in the top left corner of 10 × 10 tiles:
function createPattern(options) {
  return new PatternDefinition(
    new Path.Rectangle({
      point: [0, 0],
      size: [5, 5],
      fillColor: 'red'
    }),
    Object.assign({ tile: new Rectangle(0, 0, 10, 10) }, options)
  )
}

// The tiles of the pattern repeated by hand, through the matrix that places
// them, clipped by the area that they fill:
function createTiles(area, matrix, options) {
  const { step = 10, size = 5, color = 'red' } = options || {}
  const squares = []
  for (let x = -10 * step; x < 20 * step; x += step) {
    for (let y = -10 * step; y < 20 * step; y += step) {
      squares.push(
        new Path.Rectangle({
          point: [x, y],
          size: [size, size],
          fillColor: color
        })
      )
    }
  }
  const tiles = new Group(squares)
  if (matrix) tiles.transform(matrix)
  area.clipMask = true
  return new Group(area, tiles)
}

describe('PatternDefinition', () => {
  test('Pattern fills', () => {
    const pattern = createPattern()
    const path = new Path.Rectangle({
      point: [0, 0],
      size: [40, 40],
      fillColor: { pattern }
    })
    equals(path.fillColor.type, 'pattern')
    equals(path.fillColor.pattern, pattern)
    equals(path.fillColor.matrix, new Matrix())
    comparePixels(path, createTiles(new Path.Rectangle([0, 0], [40, 40])))
  })

  test('Image patterns', () => {
    // Rasters are centered at 0, 0, and their bounds are the default tile:
    const raster = new Raster(new Size(10, 10))
    const ctx = raster.getContext(true)
    ctx.fillStyle = 'red'
    ctx.fillRect(0, 0, 5, 5)
    const path = new Path.Rectangle({
      point: [0, 0],
      size: [40, 40],
      fillColor: { pattern: new PatternDefinition(raster) }
    })
    comparePixels(
      path,
      createTiles(
        new Path.Rectangle([0, 0], [40, 40]),
        new Matrix().translate(-5, -5)
      )
    )
  })

  test('Pattern strokes', () => {
    const path = new Path.Rectangle({
      point: [10, 10],
      size: [40, 40],
      strokeColor: { pattern: createPattern() },
      strokeWidth: 10
    })
    const area = new Path.Rectangle([5, 5], [50, 50]).subtract(
      new Path.Rectangle([15, 15], [30, 30])
    )
    comparePixels(path, createTiles(area))
  })

  test('Pattern with a rotated matrix', () => {
    const matrix = new Matrix().rotate(90)
    const path = new Path.Rectangle({
      point: [0, 0],
      size: [40, 40],
      fillColor: new Color(createPattern(), matrix)
    })
    comparePixels(
      path,
      createTiles(new Path.Rectangle([0, 0], [40, 40]), matrix)
    )
  })

  test('Pattern with spacing', () => {
    const pattern = createPattern({ spacing: 5 })
    equals(pattern.spacing, new Size(5, 5))
    const path = new Path.Rectangle({
      point: [0, 0],
      size: [40, 40],
      fillColor: { pattern }
    })
    comparePixels(
      path,
      createTiles(new Path.Rectangle([0, 0], [40, 40]), null, { step: 15 })
    )
  })

  test('Pattern colors transform with their item', () => {
    const matrix = new Matrix().translate(3, 7).scale(2)
    // Shapes keep their matrix, paths apply it to their segments:
    for (const item of [
      new Shape.Rectangle({
        point: [0, 0],
        size: [20, 20],
        fillColor: { pattern: createPattern() }
      }),
      new Path.Rectangle({
        point: [0, 0],
        size: [20, 20],
        fillColor: { pattern: createPattern() }
      })
    ]) {
      item.transform(matrix)
      equals(item.fillColor.matrix, matrix, item.className)
      comparePixels(
        item,
        createTiles(new Path.Rectangle([3, 7], [40, 40]), matrix),
        item.className
      )
    }
  })

  test('Pattern strokes with strokeScaling: false', () => {
    // A non-scaling stroke of a scaled item has to look like the scaling
    // stroke of half the width, with the pattern scaled along with the item:
    const pattern = createPattern()
    const create = strokeScaling =>
      new Shape.Rectangle({
        point: [10, 10],
        size: [20, 20],
        strokeColor: { pattern },
        strokeWidth: strokeScaling ? 5 : 10,
        strokeScaling
      }).scale(2, [10, 10])
    comparePixels(create(false), create(true))
  })

  test('Changing the pattern item updates the drawings that use it', () => {
    const pattern = createPattern()
    const path = new Path.Rectangle({
      point: [0, 0],
      size: [40, 40],
      fillColor: { pattern }
    })
    comparePixels(path, createTiles(new Path.Rectangle([0, 0], [40, 40])))
    pattern.item.fillColor = 'blue'
    comparePixels(
      path,
      createTiles(new Path.Rectangle([0, 0], [40, 40]), null, {
        color: 'blue'
      })
    )
    pattern.tile = new Rectangle(0, 0, 5, 5)
    comparePixels(
      path,
      createTiles(new Path.Rectangle([0, 0], [40, 40]), null, {
        step: 5,
        color: 'blue'
      })
    )
  })

  test('Changing the children of the pattern item updates the drawings', () => {
    const square = new Path.Rectangle({
      point: [0, 0],
      size: [5, 5],
      fillColor: 'red'
    })
    const pattern = new PatternDefinition(new Group(square), {
      tile: new Rectangle(0, 0, 10, 10)
    })
    const path = new Path.Rectangle({
      point: [0, 0],
      size: [40, 40],
      fillColor: { pattern }
    })
    const area = () => new Path.Rectangle([0, 0], [40, 40])
    comparePixels(path, createTiles(area()))
    square.fillColor = 'blue'
    comparePixels(path, createTiles(area(), null, { color: 'blue' }), 'style')
    square.scale(2, [0, 0])
    comparePixels(
      path,
      createTiles(area(), null, { size: 10, color: 'blue' }),
      'geometry'
    )
  })

  test('PointText with a pattern fill', () => {
    // A tile that is red all over fills the text as red does:
    const pattern = new PatternDefinition(
      new Path.Rectangle({
        point: [0, 0],
        size: [10, 10],
        fillColor: 'red'
      })
    )
    const create = fillColor =>
      new PointText({
        point: [10, 40],
        content: 'PatternDefinition',
        fontFamily: testFontFamily,
        fontSize: 30,
        fillColor
      })
    comparePixels(create({ pattern }), create('red'))
  })

  test('SVG export and import', () => {
    const items = [
      new Path.Rectangle({
        point: [0, 0],
        size: [40, 40],
        fillColor: new Color(createPattern(), new Matrix().rotate(90)),
        strokeColor: { pattern: createPattern({ spacing: 5 }) },
        strokeWidth: 10
      }),
      // Patterns on an element with a transform, one with a tile that doesn't
      // contain its item, with spacing, which needs to be clipped:
      new Shape.Rectangle({
        point: [0, 0],
        size: [40, 40],
        fillColor: {
          pattern: createPattern({
            tile: new Rectangle(0, 0, 3, 3),
            spacing: [2, 4]
          })
        },
        strokeColor: { pattern: createPattern() },
        strokeWidth: 10
      })
        .rotate(30)
        .scale(2)
    ]
    for (const item of items) {
      const svg = item.exportSVG({ asString: true })
      const imported = paper.project.importSVG(svg)
      equals(imported.fillColor.type, 'pattern', item.className)
      comparePixels(imported, item, item.className)
    }
  })

  test('JSON export and import', () => {
    const pattern = createPattern({ spacing: 5 })
    new Path.Rectangle({
      point: [0, 0],
      size: [40, 40],
      fillColor: { pattern }
    })
    new Shape.Rectangle({
      point: [0, 0],
      size: [40, 40],
      strokeColor: new Color(pattern, new Matrix().rotate(45)),
      strokeWidth: 10
    }).scale(2)
    const project = paper.project
    const json = project.exportJSON()
    equals(
      json.match(/"PatternDefinition"/g).length,
      1,
      'the pattern is shared'
    )
    const copy = new Project()
    copy.importJSON(json)
    equals(copy, project, null, { dontShareProject: true })
    const [path, shape] = copy.activeLayer.children
    equals(path.fillColor.pattern === shape.strokeColor.pattern, true)
    equals(path.fillColor.pattern.spacing, new Size(5, 5))
    comparePixels(path, project.activeLayer.firstChild)
    comparePixels(shape, project.activeLayer.lastChild)
  })
})
