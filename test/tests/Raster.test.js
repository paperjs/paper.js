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
  CompoundPath,
  Group,
  Path,
  Point,
  Raster,
  Rectangle,
  Size
} from 'paper'
import {
  comparePixels,
  equals,
  pushFailure,
  test
} from '../helpers.js'

const { document } = paper

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
    const ctx = raster._getContext(true)
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
    Object.assign(img, {
      onload() {
        const raster = new Raster(img)
        equals(raster.size, new Size(146, 146), true)
        document.body.removeChild(img)
        done()
      },
      onerror() {
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

  test('Create a raster from a dom id', assert => {
    const done = assert.async()
    const img = document.createElement('img')
    img.src = 'assets/paper-js.gif'
    img.id = 'testimage'
    document.body.appendChild(img)
    Object.assign(img, {
      onload() {
        const raster = new Raster('testimage')
        equals(raster.size, new Size(146, 146), true)
        document.body.removeChild(img)
        done()
      },
      onerror() {
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
      equals(() => Array.from(ctx.getImageData(0, 0, 1, 2).data), expected)
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
    const raster = paper.project.activeLayer.rasterize({ resolution: 72 })
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
    const raster = paper.project.activeLayer.rasterize({ resolution: 72 })
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
        ctx = raster._getContext(true)
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

  // A raster of 10 × 10 pixels, red on its left half and blue on its right:
  function createHalves() {
    const raster = new Raster({ size: [10, 10], position: [5, 5] })
    const ctx = raster._getContext(true)
    ctx.fillStyle = 'red'
    ctx.fillRect(0, 0, 5, 10)
    ctx.fillStyle = 'blue'
    ctx.fillRect(5, 0, 5, 10)
    return raster
  }

  test('Raster#getAverageColor() of all of it, a rectangle and a point', () => {
    const raster = createHalves()
    equals(raster.getAverageColor(), new Color(0.5, 0, 0.5), null, {
      tolerance: 1e-2
    })
    equals(
      raster.getAverageColor(new Rectangle(0, 0, 5, 10)),
      new Color(1, 0, 0),
      null,
      { tolerance: 1e-2 }
    )
    equals(raster.getAverageColor(new Point(8, 5)), new Color(0, 0, 1), null, {
      tolerance: 1e-2
    })
  })

  test('Raster#getSubRaster() and image data', () => {
    const raster = createHalves()
    const sub = raster.getSubRaster(new Rectangle(5, 0, 5, 10))
    equals(sub.size, new Size(5, 10))
    equals(sub.getPixel(0, 0), new Color(0, 0, 1, 1))
    // Image data, in pixels:
    const data = raster.getImageData(new Rectangle(0, 0, 5, 10))
    const copy = new Raster({ size: [10, 10], insert: false })
    copy.putImageData(data, new Point(5, 0))
    equals(copy.getPixel(7, 5), new Color(1, 0, 0, 1))
    equals(copy.getPixel(2, 5).alpha, 0, 'left out')
    copy.setImageData(raster.createImageData(new Size(4, 4)))
    equals(copy.size, new Size(4, 4))
    // Drawing an image into it:
    copy.drawImage(raster.getSubCanvas(new Rectangle(0, 0, 2, 2)), [1, 1])
    equals(copy.getPixel(2, 2), new Color(1, 0, 0, 1))
    copy.clear()
    equals(copy.getPixel(2, 2).alpha, 0, 'cleared')
  })

  test('Raster#size can be empty', () => {
    const raster = createHalves()
    raster.size = [0, 10]
    equals([raster.size, raster.width], [new Size(0, 10), 0])
  })

  test('Raster#equals() compares the content, and #loaded', () => {
    const raster = createHalves()
    equals(raster.loaded, true)
    equals(raster.equals(raster.clone({ insert: false })), true)
    // Rasters of canvases compare their content:
    equals(raster.equals(createHalves()), true, 'the same content')
    equals(
      raster.equals(new Raster({ size: [10, 10], insert: false })),
      false,
      'other content'
    )
  })

  test('Hits on rasters report the pixel and its color', () => {
    const raster = createHalves()
    const hit = raster.hitTest(new Point(2, 5))
    equals([hit.type, hit.offset], ['pixel', new Point(2, 5)])
    equals(hit.color, new Color(1, 0, 0, 1))
  })
})
