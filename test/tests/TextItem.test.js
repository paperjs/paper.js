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
  CanvasProvider,
  Color,
  Group,
  Path,
  Point,
  PointText,
  Rectangle,
  Shape
} from 'paper'
import {
  comparePixels,
  equals,
  isNodeContext,
  test,
  testFontFamily
} from '../helpers.js'

describe('TextItem', () => {
  test('PointText', () => {
    const text = new PointText({
      fontFamily: 'Arial, Helvetica',
      fontSize: 14,
      point: [100, 100],
      content: 'Hello World!'
    })
    equals(
      text.fillColor,
      new Color(0, 0, 0),
      'text.fillColor should be black by default'
    )
    equals(text.point, new Point(100, 100), 'text.point')
    equals(
      text.bounds,
      new Rectangle(100, 87.4, 76.25, 16.8),
      'text.bounds',
      { tolerance: 1.0 }
    )
    equals(() => text.hitTest(text.bounds.center) != null, true)
  })

  test('PointText#strokeBounds (#1322)', () => {
    const text = new PointText({
      fontFamily: 'Arial, Helvetica',
      fontSize: 40,
      point: [100, 100],
      content: 'WAVE'
    })
    equals(
      text.strokeBounds,
      text.bounds,
      'text.strokeBounds without stroke'
    )
    // The stroke adds half its width all around:
    text.strokeColor = 'black'
    text.strokeWidth = 10
    equals(text.strokeBounds, text.bounds.expand(10), 'text.strokeBounds')
    // The stroke of text always scales with it:
    const bounds = text.internalBounds.expand(10)
    text.rotate(30)
    text.scale(2, 1)
    equals(
      text.strokeBounds,
      text.matrix._transformBounds(bounds),
      'text.strokeBounds after transforming'
    )
  })

  test('PointText with stroke and opacity (#1322)', () => {
    // Draw the text with a semi-transparent stroke color directly, and with
    // opacity through a separate canvas, which needs to fit the stroke. Use a
    // single glyph, as the strokes of overlapping glyphs add up when drawn
    // directly:
    function createText(opacity, strokeColor) {
      const text = new PointText({
        fontFamily: 'Arial, Helvetica',
        fontSize: 40,
        point: [20, 60],
        content: 'W',
        fillColor: null,
        strokeColor,
        strokeWidth: 10,
        strokeJoin: 'round',
        opacity
      })
      // Rasterize on a background large enough for the stroke:
      return new Group(
        new Shape.Rectangle({
          rectangle: text.bounds.expand(200),
          fillColor: 'white'
        }),
        text
      )
    }
    comparePixels(
      createText(0.5, 'black'),
      createText(1, new Color(0, 0, 0, 0.5))
    )
  })

  test('PointText with strokeScaling: false (#1703)', () => {
    // A scaled text with a non-scaling stroke draws like one whose stroke
    // scales, with its width and dashes divided by the scale:
    function createText(strokeWidth, dashArray, strokeScaling) {
      const text = new PointText({
        fontFamily: 'Arial, Helvetica',
        fontSize: 10,
        point: [5, 15],
        content: 'W',
        fillColor: null,
        strokeColor: 'black',
        strokeWidth,
        dashArray,
        strokeScaling
      })
      text.scale(4, new Point(0, 0))
      return new Group(
        new Shape.Rectangle({
          rectangle: text.bounds.expand(20),
          fillColor: 'white'
        }),
        text
      )
    }
    comparePixels(
      createText(2, [4, 2], false),
      createText(0.5, [1, 0.5], true)
    )
  })

  test('PointText#tracking', () => {
    const text = new PointText({
      point: [10, 20],
      content: 'Hello'
    })
    equals(text.tracking, 0, 'text.tracking by default')
    text.tracking = 100
    equals(text.tracking, 100, 'text.tracking')
    const imported = paper.project.importJSON(text.exportJSON())
    equals(imported.tracking, 100, 'imported.tracking from JSON')
  })

  // node-canvas doesn't support letterSpacing:
  if (!isNodeContext) {
    test('PointText#bounds with tracking', () => {
      const text = new PointText({
        fontFamily: 'Arial, Helvetica',
        fontSize: 14,
        point: [50, 100],
        content: 'Hello World!'
      })
      const bounds = text.bounds
      // Tracking is in thousandths of an em, and canvas adds the spacing
      // after each of the 12 characters, including the last one:
      text.tracking = 500
      equals(
        text.bounds,
        new Rectangle(
          bounds.x,
          bounds.y,
          bounds.width + 12 * 7,
          bounds.height
        ),
        'text.bounds'
      )
      text.tracking = 1000
      equals(
        text.bounds,
        new Rectangle(
          bounds.x,
          bounds.y,
          bounds.width + 12 * 14,
          bounds.height
        ),
        'text.bounds, 1 em'
      )
      text.justification = 'right'
      equals(
        text.bounds,
        new Rectangle(
          bounds.x - bounds.width - 12 * 14,
          bounds.y,
          bounds.width + 12 * 14,
          bounds.height
        ),
        'text.bounds right-justified'
      )
      // No tracking ignores spacing left on the view's context:
      paper.view.context.letterSpacing = '5px'
      text.tracking = 0
      text.justification = 'left'
      equals(text.bounds, bounds, 'text.bounds without tracking')
      paper.view.context.letterSpacing = '0px'
    })

    test('PointText with tracking', () => {
      // Draw the same text with the same spacing directly on a canvas, and
      // compare it with what the view draws: A tracking of 250 at a font
      // size of 20 is 5 pixels.
      const text = new PointText({
        fontFamily: 'Arial, Helvetica',
        fontSize: 20,
        tracking: 250,
        point: [10, 60],
        content: 'Hello'
      })
      const pixelRatio = paper.view.pixelRatio,
        size = paper.view.viewSize.multiply(pixelRatio),
        canvas = CanvasProvider.getCanvas(size),
        ctx = canvas.getContext('2d')
      ctx.scale(pixelRatio, pixelRatio)
      ctx.font = '20px Arial, Helvetica'
      ctx.letterSpacing = '5px'
      ctx.fillText('Hello', 10, 60)
      paper.view.update(true)
      const actual = paper.view.context.getImageData(
        0,
        0,
        size.width,
        size.height
      )
      const expected = ctx.getImageData(0, 0, size.width, size.height)
      let differences = 0
      let inked = 0
      for (let i = 3, l = expected.data.length; i < l; i += 4) {
        if (actual.data[i] !== expected.data[i]) differences++
        if (expected.data[i]) inked++
      }
      equals(inked > 0, true, 'drawn pixels')
      equals(differences, 0, 'differing pixels')
      text.remove()
    })
  }

  test('PointText#clipMask (#1845)', () => {
    // The glyph outlines aren't known, so text clips with its bounds without
    // drawing itself, also after other paths were drawn before it:
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

    function createText() {
      return new PointText({
        fontFamily: 'Arial, Helvetica',
        fontSize: 40,
        point: [20, 60],
        content: 'Clip',
        fillColor: 'green'
      })
    }

    function createRectangle() {
      const text = createText()
      text.remove()
      return new Path.Rectangle(text.bounds)
    }

    function createCircle() {
      return new Path.Circle({ center: [150, 150], radius: 20 })
    }

    comparePixels(
      createClipped(createText()),
      createClipped(createRectangle())
    )
    // Also together with other items in a group used as clip mask:
    comparePixels(
      createClipped(new Group([createText(), createCircle()])),
      createClipped(new Group([createRectangle(), createCircle()]))
    )
  })

  test('PointText with shadow (#2347)', () => {
    // The shadow is offset below the text, so the text's bounds moved by the
    // offset only contain pixels of the shadow, in its color:
    const offset = new Point(0, 45)

    function countPixels(rect, color) {
      const pixelRatio = paper.view.pixelRatio

      const data = paper.view.context.getImageData(
        rect.x * pixelRatio,
        rect.y * pixelRatio,
        rect.width * pixelRatio,
        rect.height * pixelRatio
      ).data

      let count = 0
      for (let i = 0, l = data.length; i < l; i += 4) {
        if (
          color
            ? data[i] === color[0] &&
              data[i + 1] === color[1] &&
              data[i + 2] === color[2] &&
              data[i + 3] === 255
            : data[i + 3] > 0
        )
          count++
      }
      return count
    }

    function drawText(props) {
      const text = new PointText(
        Base.set(
          {
            fontFamily: 'Arial, Helvetica',
            fontSize: 30,
            point: [20, 40],
            content: 'W',
            fillColor: 'black'
          },
          props
        )
      )
      paper.view.update(true)
      const bounds = text.strokeBounds,
        rect = new Rectangle(bounds.point.add(offset), bounds.size)
      text.remove()
      return {
        shadow: countPixels(rect, [255, 0, 0]),
        all: countPixels(rect)
      }
    }

    const shadow = { shadowColor: 'red', shadowOffset: offset },
      filled = drawText(shadow)
    equals(filled.shadow > 0, true, 'the shadow of the fill')
    equals(drawText().all, 0, 'no shadow without shadowColor')
    // Text with a fill and a stroke casts the shadow of both, which reaches
    // further than that of the fill alone:
    const stroked = drawText(
      Base.set(
        {
          strokeColor: 'blue',
          strokeWidth: 4
        },
        shadow
      )
    )
    equals(
      stroked.shadow > filled.shadow,
      true,
      'the shadow of the fill and the stroke'
    )
  })

  test(`The tests' own font is loaded`, () => {
    const view = paper.view,
      width = family =>
        view.getTextWidth('normal 20px ' + family, ['Wide iii'], '0em')
    equals(
      width(testFontFamily) !== width('No Such Font'),
      true,
      'measured in it, not a fallback'
    )
  })
})
