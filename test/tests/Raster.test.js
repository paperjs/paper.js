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
  Base,
  Color,
  CompoundPath,
  DomEvent,
  Group,
  Path,
  Point,
  Raster,
  Rectangle,
  Size,
  document
} from 'paper'
import {
  comparePixels,
  equals,
  isNodeContext,
  pushFailure,
  test
} from '../helpers.js'

describe('Raster', () => {
  test('Create a raster without a source and check its size', () => {
    const raster = new Raster()
    equals(raster.size, new Size(0, 0), true)
  })

  test('Create a raster without a source and set its size', () => {
    const raster = new Raster()
    raster.size = [640, 480]
    equals(raster.size, new Size(640, 480), true)
  })

  test('raster.size keeps the content, scaled to the new size', () => {
    const raster = new Raster({ size: [400, 400], insert: false })
    const ctx = raster.getContext(true)
    ctx.fillStyle = '#ff0000'
    ctx.fillRect(0, 0, 400, 400)
    raster.size = [200, 100]
    equals(raster.size, new Size(200, 100), true)
    equals(raster.getPixel(100, 50), new Color(1, 0, 0, 1), 'red')
  })

  test('Create a raster from a URL', assert => {
    const done = assert.async()
    const raster = new Raster('assets/paper-js.gif')
    raster.onLoad = () => {
      equals(raster.size, new Size(146, 146), true)
      done()
    }
    raster.onError = () => {
      pushFailure(
        'Loading from a valid local URL should not give an error.'
      )
      done()
    }
  })

  test('Create a raster from a data URL', assert => {
    const done = assert.async()
    const raster = new Raster(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAABlJREFUeNpi+s/AwPCfgYmR4f9/hv8AAQYAHiAFAS8Lwy8AAAAASUVORK5CYII='
    )
    raster.onLoad = () => {
      equals(raster.size, new Size(2, 2), true)
      done()
    }
    raster.onError = () => {
      pushFailure(
        'Loading from a valid data URL should not give an error.'
      )
      done()
    }
  })

  test('Create a raster from a dom image', assert => {
    const done = assert.async()
    const img = document.createElement('img')
    img.src = 'assets/paper-js.gif'
    document.body.appendChild(img)
    DomEvent.add(img, {
      load() {
        const raster = new Raster(img)
        equals(raster.size, new Size(146, 146), true)
        document.body.removeChild(img)
        done()
      },
      error() {
        pushFailure(
          'Loading from a valid data URL should not give an error.'
        )
        done()
      }
    })
  })

  test('Create a raster from a canvas', () => {
    const canvas = paper.createCanvas(30, 20)
    const raster = new Raster(canvas)
    equals(raster.size, new Size(30, 20), true)
  })

  if (isNodeContext) {
    test('Create an SVG canvas', () => {
      const canvas = paper.createCanvas(30, 20, 'svg')
      equals(() => canvas.type, 'svg')
      equals(
        () => /viewBox="0 0 30 20"/.test(canvas.toBuffer().toString()),
        true
      )
    })
  }

  test('Create a raster from a dom id', assert => {
    const done = assert.async()
    const img = document.createElement('img')
    img.src = 'assets/paper-js.gif'
    img.id = 'testimage'
    document.body.appendChild(img)
    DomEvent.add(img, {
      load() {
        const raster = new Raster('testimage')
        equals(raster.size, new Size(146, 146), true)
        document.body.removeChild(img)
        done()
      },
      error() {
        pushFailure(
          'Loading from a valid data URL should not give an error.'
        )
        done()
      }
    })
  })

  test('Raster#getPixel / setPixel', assert => {
    const done = assert.async()
    const raster = new Raster(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAABlJREFUeNpi+s/AwPCfgYmR4f9/hv8AAQYAHiAFAS8Lwy8AAAAASUVORK5CYII='
    )
    raster.onLoad = () => {
      equals(raster.getPixel(0, 0), new Color(1, 0, 0, 1))
      equals(raster.getPixel(1, 0), new Color(0, 1, 0, 1))
      equals(raster.getPixel(0, 1), new Color(0, 0, 1, 1))
      equals(raster.getPixel(1, 1), new Color(1, 1, 1, 1))

      // Alpha
      const color = new Color(1, 1, 0, 0.50196)
      raster.setPixel([0, 0], color)
      equals(raster.getPixel([0, 0]), color, 'alpha', { tolerance: 1e-2 })
      done()
    }
  })

  test('Raster#getSubCanvas', assert => {
    const done = assert.async()
    const raster = new Raster(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAABlJREFUeNpi+s/AwPCfgYmR4f9/hv8AAQYAHiAFAS8Lwy8AAAAASUVORK5CYII='
    )
    raster.onLoad = () => {
      const canvas = raster.getSubCanvas(
        new Rectangle({
          point: [1, 0],
          size: [1, 2]
        })
      )
      equals(() => canvas.width, 1)
      equals(() => canvas.height, 2)
      const ctx = canvas.getContext('2d')
      const expected = [
        // green pixel:
        0, 255, 0, 255,
        // white pixel:
        255, 255, 255, 255
      ]
      equals(
        () =>
          Base.equals(
            Base.slice(ctx.getImageData(0, 0, 1, 2).data),
            expected
          ),
        true
      )
      done()
    }
  })

  test('Raster#getAverageColor(path)', () => {
    new Path.Rectangle({
      point: [0, 0],
      size: [100, 100],
      fillColor: new Color(0, 1, 0)
    })
    const circle = new Path.Circle({
      center: [50, 50],
      radius: 25,
      fillColor: new Color(1, 0, 0)
    })
    const raster = paper.project.activeLayer.rasterize(72)
    circle.scale(0.8)
    equals(raster.getAverageColor(circle), circle.fillColor, null, {
      tolerance: 1e-3
    })
  })

  test('Raster#getAverageColor(path) with compound path', () => {
    new Path.Rectangle({
      point: [0, 0],
      size: [100, 100],
      fillColor: new Color(0, 1, 0)
    })
    const path = new Path.Circle({
      center: [50, 50],
      radius: 25
    })
    const path2 = new Path.Circle({
      center: [50, 50],
      radius: 10
    })
    const compoundPath = new CompoundPath(path, path2)
    compoundPath.fillColor = new Color(1, 0, 0)
    const raster = paper.project.activeLayer.rasterize(72)
    path.scale(0.8)
    path2.scale(1.2)
    equals(raster.getAverageColor(compoundPath), new Color(1, 0, 0), null, {
      tolerance: 1e-3
    })
  })

  test(`Raster#smoothing defaults to 'low'`, () => {
    const raster = new Raster()
    equals(raster.smoothing, 'low')
  })

  test('Raster#smoothing', () => {
    const raster = new Raster({ smoothing: 'off' })
    equals(raster.smoothing, 'off')

    raster.smoothing = 'medium'
    equals(raster.smoothing, 'medium')

    raster.smoothing = false
    equals(raster.smoothing, 'off')

    raster.smoothing = true
    equals(raster.smoothing, 'low')
  })

  test('Raster#smoothing setting does not impact canvas context', assert => {
    const done = assert.async()
    const raster = new Raster(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAABlJREFUeNpi+s/AwPCfgYmR4f9/hv8AAQYAHiAFAS8Lwy8AAAAASUVORK5CYII='
    )
    const view = raster.view
    const context = view._context
    raster.onLoad = () => {
      const originalValue = context.imageSmoothingEnabled
      raster.smoothing = false
      view.update()
      equals(context.imageSmoothingEnabled, originalValue)
      done()
    }
  })

  test('new Raster(size[, position])', () => {
    // Size only.
    let raster = new Raster(new Size(100, 100))
    equals(raster.position, new Point(0, 0))
    equals(raster.bounds, new Rectangle(-50, -50, 100, 100))

    raster = new Raster({ size: new Size(100, 100) })
    equals(raster.position, new Point(0, 0))
    equals(raster.bounds, new Rectangle(-50, -50, 100, 100))

    raster = new Raster({ width: 100, height: 100 })
    equals(raster.position, new Point(0, 0))
    equals(raster.bounds, new Rectangle(-50, -50, 100, 100))

    // Size and position.
    raster = new Raster(new Size(100, 100), new Point(100, 100))
    equals(raster.position, new Point(100, 100))
    equals(raster.bounds, new Rectangle(50, 50, 100, 100))

    raster = new Raster({
      size: new Size(100, 100),
      position: new Point(100, 100)
    })
    equals(raster.position, new Point(100, 100))
    equals(raster.bounds, new Rectangle(50, 50, 100, 100))

    raster = new Raster({
      width: 100,
      height: 100,
      position: new Point(100, 100)
    })
    equals(raster.position, new Point(100, 100))
    equals(raster.bounds, new Rectangle(50, 50, 100, 100))
  })

  test('new Raster(source, position)', () => {
    let raster = new Raster(new Size(30, 20), new Point(5, 6))
    equals(raster.position, new Point(5, 6))
    raster = new Raster(
      'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      [30, 40]
    )
    equals(raster.position, new Point(30, 40))
  })

  test('Raster#clipMask (#1845)', () => {
    // Rasters clip with their rectangle without drawing their image, also after
    // other paths were drawn before them:
    function createClipped(clipItem) {
      clipItem.clipMask = true
      return new Group([
        new Path.Circle({
          center: [100, 100],
          radius: 50,
          fillColor: 'blue'
        }),
        new Group([
          clipItem,
          new Path.Rectangle({
            point: [0, 0],
            size: [200, 200],
            fillColor: 'red'
          })
        ])
      ])
    }

    function createRaster() {
      const raster = new Raster({ size: [50, 50], position: [50, 50] }),
        ctx = raster.getContext(true)
      ctx.fillStyle = 'green'
      ctx.fillRect(0, 0, 50, 50)
      return raster
    }

    function createRectangle() {
      return new Path.Rectangle([25, 25], [50, 50])
    }

    function createCircle() {
      return new Path.Circle({ center: [150, 150], radius: 20 })
    }

    comparePixels(
      createClipped(createRaster()),
      createClipped(createRectangle())
    )
    // Also together with other items in a group used as clip mask:
    comparePixels(
      createClipped(new Group([createRaster(), createCircle()])),
      createClipped(new Group([createRectangle(), createCircle()]))
    )
  })

  test('Raster#exportJSON() and #importJSON() keep the size (#1598)', assert => {
    const done = assert.async()
    const raster = new Raster({ size: [20, 10] })
    const json = raster.exportJSON()
    raster.remove()
    // The size comes before the source, so older versions apply it first:
    equals(/"size":\[20,10\],"source":/.test(json), true, 'exported')
    const imported = paper.project.activeLayer.importJSON(json)
    equals(imported.size, new Size(20, 10), 'before the image has loaded')
    equals(imported.bounds.width, 20, 'bounds before the image has loaded')
    imported.onLoad = () => {
      equals(
        imported.size,
        new Size(20, 10),
        'after the image has loaded'
      )
      done()
    }
  })

  test('Raster#importJSON() without a size, as in older saves (#1598)', assert => {
    const done = assert.async()
    const source = new Raster({ size: [20, 10], insert: false }).source
    const imported = paper.project.activeLayer.importJSON(
      JSON.stringify(['Raster', { source }])
    )
    imported.onLoad = () => {
      equals(
        imported.size,
        new Size(20, 10),
        'after the image has loaded'
      )
      done()
    }
  })
})
