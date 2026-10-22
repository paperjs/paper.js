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

import { describe, test } from 'vitest'
import paper, {
  CompoundPath,
  Group,
  Path,
  PointText,
  Raster,
  Rectangle
} from 'paper'
import { createScene, expectScene } from './scene.js'

function loadRaster(source) {
  return new Promise((resolve, reject) => {
    const raster = new Raster(source)
    raster.onLoad = () => resolve(raster)
    raster.onError = reject
  })
}

describe('Blend modes', () => {
  test('The CSS blend modes and our own', async () => {
    const style = createScene(420, 330)
    const modes = [
      'normal',
      'multiply',
      'screen',
      'overlay',
      'soft-light',
      'hard-light',
      'color-dodge',
      'color-burn',
      'darken',
      'lighten',
      'difference',
      'exclusion',
      'hue',
      'saturation',
      'color',
      'luminosity',
      'add',
      'subtract',
      'average',
      'pin-light',
      'negation'
    ]
    modes.forEach((blendMode, i) => {
      const x = (i % 6) * 70 + 35
      const y = Math.floor(i / 6) * 80 + 35
      new Path.Circle({ center: [x - 8, y], radius: 20, fillColor: '#e63' })
      new Path.Circle({
        center: [x + 8, y],
        radius: 20,
        fillColor: '#39c',
        blendMode
      })
      new PointText({
        ...style,
        point: [x, y + 35],
        content: blendMode,
        fontSize: 9,
        justification: 'center'
      })
    })
    await expectScene()
  })

  test('Opacity of items and of groups', async () => {
    createScene(300, 110)
    const colors = ['#e63', '#39c', '#9c3']
    const circles = x =>
      colors.map(
        (fillColor, i) =>
          new Path.Circle({
            center: [x + i * 25, 55],
            radius: 30,
            fillColor,
            strokeColor: 'black',
            strokeWidth: 4
          })
      )
    // Each item half transparent, with its stroke on its own fill:
    circles(30).forEach(circle => (circle.opacity = 0.5))
    // The group half transparent as a whole:
    new Group({ children: circles(190), opacity: 0.5 })
    await expectScene()
  })
})

describe('Shadows', () => {
  test('Fills, strokes, groups and text', async () => {
    const style = createScene(300, 200)
    const shadow = {
      shadowColor: 'rgba(0, 0, 0, 0.5)',
      shadowBlur: 8,
      shadowOffset: [5, 5]
    }
    new Path.Rectangle({
      rectangle: new Rectangle(20, 20, 60, 60),
      fillColor: '#fc3',
      ...shadow
    })
    new Path.Circle({
      center: [150, 50],
      radius: 30,
      strokeColor: '#39c',
      strokeWidth: 6,
      ...shadow
    })
    // Fill and stroke cast one shadow together:
    new Path.Star({
      center: [250, 50],
      points: 5,
      radius1: 15,
      radius2: 32,
      fillColor: '#e63',
      strokeColor: 'black',
      strokeWidth: 3,
      ...shadow
    })
    new Group({
      children: [
        new Path.Circle({ center: [60, 140], radius: 25, fillColor: '#9c3' }),
        new Path.Circle({ center: [90, 150], radius: 25, fillColor: '#39c' })
      ],
      ...shadow
    })
    new PointText({
      ...style,
      ...shadow,
      point: [150, 155],
      content: 'Shadow',
      fontSize: 36
    })
    await expectScene()
  })
})

describe('Clipping', () => {
  test('Clip masks, nested and compound', async () => {
    createScene(300, 120)
    const stripes = x =>
      Array.from(
        { length: 10 },
        (_, i) =>
          new Path.Rectangle({
            rectangle: new Rectangle(x + i * 10, 10, 5, 100),
            fillColor: i % 2 ? '#39c' : '#e63'
          })
      )
    new Group({
      children: [
        new Path.Circle({ center: [50, 60], radius: 40 }),
        ...stripes(0)
      ],
      clipped: true
    })
    new Group({
      children: [
        new Path.Rectangle(new Rectangle(110, 20, 80, 80)),
        new Group({
          children: [
            new Path.Circle({ center: [150, 60], radius: 45 }),
            ...stripes(100)
          ],
          clipped: true
        })
      ],
      clipped: true
    })
    new Group({
      children: [
        new CompoundPath({
          children: [
            new Path.Circle({ center: [250, 60], radius: 45 }),
            new Path.Circle({ center: [250, 60], radius: 20 })
          ],
          fillRule: 'evenodd'
        }),
        ...stripes(200)
      ],
      clipped: true
    })
    await expectScene()
  })
})

describe('Gradients', () => {
  test('Linear, radial, highlights and strokes', async () => {
    createScene(300, 200)
    new Path.Rectangle({
      rectangle: new Rectangle(10, 10, 80, 80),
      fillColor: {
        gradient: { stops: ['#fc3', '#e63', '#39c'] },
        origin: [10, 10],
        destination: [90, 90]
      }
    })
    new Path.Circle({
      center: [150, 50],
      radius: 40,
      fillColor: {
        gradient: { stops: ['white', '#39c'], radial: true },
        origin: [150, 50],
        destination: [190, 50]
      }
    })
    new Path.Circle({
      center: [250, 50],
      radius: 40,
      fillColor: {
        gradient: { stops: ['white', '#9c3', 'black'], radial: true },
        origin: [250, 50],
        destination: [290, 50],
        highlight: [235, 35]
      }
    })
    new Path.Circle({
      center: [50, 150],
      radius: 30,
      strokeWidth: 12,
      strokeColor: {
        gradient: { stops: ['#e63', '#39c'] },
        origin: [20, 150],
        destination: [80, 150]
      }
    })
    // The gradient transforms with the item:
    const rect = new Path.Rectangle({
      rectangle: new Rectangle(120, 120, 60, 60),
      fillColor: {
        gradient: {
          stops: [
            ['#e63', 0],
            ['#e63', 0.5],
            ['#39c', 0.5],
            ['#39c', 1]
          ]
        },
        origin: [120, 150],
        destination: [180, 150]
      },
      applyMatrix: false
    })
    rect.rotate(30)
    rect.scale(1.3, 0.8)
    new Path.Rectangle({
      rectangle: new Rectangle(210, 120, 80, 60),
      fillColor: {
        gradient: { stops: [['#fc3', 0.2], ['rgba(57, 153, 204, 0)', 0.8]] },
        origin: [210, 150],
        destination: [290, 150]
      }
    })
    await expectScene()
  })
})

describe('Elliptical gradients', () => {
  test('Applied, kept in a matrix, and exported to SVG', async () => {
    createScene(250, 240)
    const fillColor = {
      gradient: { stops: ['white', '#fc3', '#e63', '#39c'], radial: true },
      origin: [75, 60],
      destination: [115, 60],
      highlight: [65, 50]
    }
    function createItem(applyMatrix, x) {
      const item = new Path.Rectangle({
        rectangle: new Rectangle(35, 20, 80, 80),
        fillColor,
        applyMatrix
      })
      item.translate(x, 0)
      item.scale(1.2, 0.8)
      item.shear(0.4, 0)
      return item
    }
    createItem(true, 0)
    // Below it, the browser's rendering of it, exported to SVG:
    const svg = paper.project.exportSVG({
      asString: true,
      bounds: new Rectangle(0, 0, 250, 120)
    })
    const raster = await loadRaster('data:image/svg+xml;base64,' + btoa(svg))
    raster.position = paper.view.center.add(0, 60)
    // Next to it, the same with the transformation kept in its matrix:
    createItem(false, 110)
    await expectScene()
  })
})

describe('Strokes', () => {
  test('Joins, caps, dashes and miter limits', async () => {
    createScene(300, 200)
    const zigzag = (x, y) => [
      [x, y + 30],
      [x + 20, y],
      [x + 40, y + 30],
      [x + 60, y]
    ]
    ;['miter', 'round', 'bevel'].forEach((strokeJoin, i) => {
      new Path({
        segments: zigzag(20 + i * 95, 20),
        strokeColor: 'black',
        strokeWidth: 10,
        strokeJoin
      })
    })
    ;['butt', 'round', 'square'].forEach((strokeCap, i) => {
      new Path({
        segments: [
          [30 + i * 95, 90],
          [80 + i * 95, 90]
        ],
        strokeColor: 'black',
        strokeWidth: 12,
        strokeCap
      })
    })
    new Path({
      segments: [
        [20, 130],
        [280, 130]
      ],
      strokeColor: '#39c',
      strokeWidth: 4,
      dashArray: [12, 6, 2, 6],
      dashOffset: 4
    })
    new Path.Circle({
      center: [60, 170],
      radius: 20,
      strokeColor: '#e63',
      strokeWidth: 3,
      dashArray: [8, 4]
    })
    // A sharp angle, cut off by a low miter limit:
    ;[10, 2].forEach((miterLimit, i) => {
      new Path({
        segments: [
          [140 + i * 80, 190],
          [155 + i * 80, 145],
          [170 + i * 80, 190]
        ],
        strokeColor: 'black',
        strokeWidth: 8,
        miterLimit
      })
    })
    await expectScene()
  })

  test(`Strokes that scale, and strokes that don't`, async () => {
    createScene(300, 120)
    ;[true, false].forEach((strokeScaling, i) => {
      const star = new Path.Star({
        center: [80 + i * 150, 60],
        points: 5,
        radius1: 10,
        radius2: 22,
        strokeColor: 'black',
        strokeWidth: 3,
        strokeJoin: 'miter',
        strokeScaling,
        applyMatrix: false
      })
      star.scale(2.5, 1.2)
    })
    await expectScene()
  })
})

describe('Rasters', () => {
  test('Transformed, smoothed and transparent', async () => {
    createScene(300, 200)
    const raster = await loadRaster('/assets/paper-js.gif')
    raster.position = [80, 80]
    raster.scale(0.8)
    const rotated = raster.clone()
    rotated.position = [220, 80]
    rotated.rotate(20)
    rotated.opacity = 0.5
    // Small, scaled up, without and with smoothing:
    ;['off', 'high'].forEach((smoothing, i) => {
      const small = raster.clone()
      small.set({ smoothing, scaling: 1 })
      small.size = [16, 16]
      small.position = [40 + i * 60, 170]
      small.scale(3)
    })
    await expectScene()
  })
})

describe('SVG import', () => {
  // Paper.js's import on the left, the browser's own rendering of the same
  // SVG on the right:
  async function compare(name, width, height) {
    createScene(width * 2 + 30, height + 20)
    const svg = await (await fetch(`/assets/${name}`)).text()
    const item = paper.project.importSVG(svg)
    item.position = [10 + width / 2, 10 + height / 2]
    const raster = await loadRaster(
      'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)))
    )
    raster.position = [20 + width * 1.5, 10 + height / 2]
    await expectScene()
  }

  test('gradients-1.svg', () => compare('gradients-1.svg', 450, 220))
  test('gradients-2.svg', () => compare('gradients-2.svg', 300, 300))
  test('viewbox.svg', () => compare('viewbox.svg', 300, 200))
  test('symbol.svg', () => compare('symbol.svg', 150, 150))
  test('butterfly.svg', () => compare('butterfly.svg', 399, 249))
})
