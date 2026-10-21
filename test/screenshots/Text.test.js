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
import {
  AreaText,
  CompoundPath,
  Path,
  PathText,
  PointText,
  Rectangle
} from 'paper'
import { createScene, expectScene, outline } from './scene.js'

const words = (
  `Text in an area breaks into lines that fit the area's width where they ` +
  `sit, and what doesn't fit flows on into the next area of its story.`
)

describe('Point text', () => {
  test('Lines, paragraphs and justification', async () => {
    const style = createScene(300, 140)
    new PointText({
      ...style,
      point: [10, 30],
      content: 'Left\nlonger line'
    })
    new PointText({
      ...style,
      point: [150, 30],
      content: 'Centered\nlonger line',
      justification: 'center'
    })
    new PointText({
      ...style,
      point: [290, 30],
      content: 'Right\nlonger line',
      justification: 'right'
    })
    new PointText({
      ...style,
      point: [10, 100],
      content: 'A fixed line height\nof 30 points',
      lineHeight: '30px'
    })
    await expectScene()
  })

  test('Runs in mixed styles', async () => {
    const style = createScene(300, 80)
    const text = new PointText({
      ...style,
      point: [10, 40],
      content: 'Small, Large, bold, red, italic and underlined.'
    })
    text.range(7, 12).fontSize = 24
    text.range(14, 18).fontWeight = 'bold'
    text.range(20, 23).fillColor = 'red'
    text.range(25, 31).fontStyle = 'italic'
    text.range(36, 46).underline = true
    await expectScene()
  })

  test('Letter styles', async () => {
    const style = createScene(300, 200)
    const lines = [
      ['Tracking of 200', { letterTracking: 200 }],
      ['Letter scaling of 150%', { letterScaling: 1.5 }],
      ['Letter rotation of 20°', { letterRotation: 20 }],
      ['Small Capitals', { capitals: 'small' }],
      ['All capitals', { capitals: 'all' }],
      ['Struck through', { strikethrough: true }],
      ['A stroke and no fill', { fillColor: null, strokeColor: 'blue' }]
    ]
    lines.forEach(([content, properties], i) => {
      new PointText({ ...style, point: [10, 22 + i * 25], content })
        .set(properties)
    })
    const text = new PointText({
      ...style,
      point: [160, 22],
      content: 'E = mc2, H2O, shifted'
    })
    text.range(6, 7).baselinePosition = 'superscript'
    text.range(10, 11).baselinePosition = 'subscript'
    text.range(14, 21).baselineShift = 5
    await expectScene()
  })

  test('Transformed', async () => {
    const style = createScene(300, 120)
    new PointText({ ...style, point: [20, 40], content: 'Rotated' })
      .rotate(-20)
    new PointText({ ...style, point: [110, 50], content: 'Scaled' })
      .scale(2, 1)
    new PointText({ ...style, point: [200, 90], content: 'Sheared' })
      .shear(-0.5, 0)
    await expectScene()
  })
})

describe('Area text', () => {
  test('Lines break between words to fit the area', async () => {
    const style = createScene(300, 140)
    const area = new Rectangle(10, 10, 130, 120)
    outline(new Path.Rectangle(area))
    new AreaText({
      ...style,
      textPath: new Path.Rectangle(area),
      content: words
    })
    const justified = new Rectangle(160, 10, 130, 120)
    outline(new Path.Rectangle(justified))
    new AreaText({
      ...style,
      textPath: new Path.Rectangle(justified),
      content: words,
      justification: 'justify'
    })
    await expectScene()
  })

  test('Paragraphs, indents and space between them', async () => {
    const style = createScene(300, 200)
    const area = new Rectangle(10, 10, 280, 180)
    outline(new Path.Rectangle(area))
    const text = new AreaText({
      ...style,
      textPath: new Path.Rectangle(area),
      content: `${words}\n${words}\n${words}`
    })
    text.paragraphs[0].firstLineIndent = 20
    text.paragraphs[1].set({ startIndent: 30, endIndent: 30, spaceBefore: 10 })
    text.paragraphs[2].set({
      justification: 'right',
      spaceBefore: 10
    })
    await expectScene()
  })

  test('Columns, gutter, inset and vertical alignment', async () => {
    const style = createScene(300, 200)
    const area = new Rectangle(10, 10, 280, 85)
    outline(new Path.Rectangle(area))
    new AreaText({
      ...style,
      textPath: new Path.Rectangle(area),
      content: words,
      columns: 3,
      gutter: 15,
      inset: 5
    })
    const centered = new Rectangle(10, 105, 135, 85)
    outline(new Path.Rectangle(centered))
    new AreaText({
      ...style,
      textPath: new Path.Rectangle(centered),
      content: 'In the middle',
      verticalAlign: 'center',
      justification: 'center'
    })
    const bottom = new Rectangle(155, 105, 135, 85)
    outline(new Path.Rectangle(bottom))
    new AreaText({
      ...style,
      textPath: new Path.Rectangle(bottom),
      content: 'At the bottom',
      verticalAlign: 'bottom',
      justification: 'right'
    })
    await expectScene()
  })

  test('Any shape, and holes', async () => {
    const style = createScene(300, 200)
    const circle = new Path.Circle({ center: [80, 100], radius: 75 })
    outline(circle)
    new AreaText({
      ...style,
      textPath: circle,
      content: `${words} ${words}`,
      justification: 'center'
    })
    const ring = new CompoundPath({
      children: [
        new Path.Rectangle(new Rectangle(170, 25, 120, 150)),
        new Path.Circle({ center: [230, 100], radius: 35 })
      ]
    })
    outline(ring)
    new AreaText({ ...style, textPath: ring, content: `${words} ${words}` })
    await expectScene()
  })

  test('Line wrap: normal, balance and pretty', async () => {
    const style = createScene(300, 130)
    const content =
      'The lines of this short paragraph wrap in different ways, or so.'
    ;['normal', 'balance', 'pretty'].forEach((lineWrap, i) => {
      const area = new Rectangle(10 + i * 95, 10, 90, 110)
      outline(new Path.Rectangle(area))
      new AreaText({
        ...style,
        textPath: new Path.Rectangle(area),
        content,
        lineWrap
      })
    })
    await expectScene()
  })

  test('Soft hyphens break words, with a hyphen where they do', async () => {
    const style = createScene(300, 80)
    const area = new Rectangle(10, 10, 110, 60)
    outline(new Path.Rectangle(area))
    new AreaText({
      ...style,
      textPath: new Path.Rectangle(area),
      content: 'Extra­ordinarily long words hy­phen­ate.'
    })
    await expectScene()
  })

  test('Text wrap around items above the text', async () => {
    const style = createScene(300, 200)
    const area = new Rectangle(10, 10, 280, 180)
    outline(new Path.Rectangle(area))
    new AreaText({
      ...style,
      textPath: new Path.Rectangle(area),
      content: `${words} ${words} ${words} ${words} ${words}`
    })
    new Path.Circle({
      center: [90, 80],
      radius: 35,
      fillColor: '#9cf',
      textWrap: { offset: 6 }
    })
    new Path.Rectangle({
      rectangle: new Rectangle(190, 110, 80, 60),
      fillColor: '#fc9',
      textWrap: true
    })
    await expectScene()
  })
})

describe('Right to left', () => {
  test('Lines, runs and paths run from the right', async () => {
    const style = createScene(300, 160)
    const area = new Rectangle(10, 10, 280, 60)
    outline(new Path.Rectangle(area))
    const text = new AreaText({
      ...style,
      textPath: new Path.Rectangle(area),
      content: 'שלום עולם, שלום עולם, שלום עולם, שלום עולם, שלום עולם',
      direction: 'rtl',
      fontSize: 16
    })
    text.range(5, 9).fontWeight = 'bold'
    text.range(16, 20).fillColor = 'red'
    const arc = new Path.Arc([20, 150], [150, 90], [280, 150])
    outline(arc)
    new PathText({
      ...style,
      textPath: arc,
      content: 'שלום עולם על מסלול',
      direction: 'rtl',
      fontSize: 16
    })
    await expectScene()
  })
})

describe('Story flow', () => {
  test('Linked area texts flow into each other', async () => {
    const style = createScene(300, 200)
    const areas = [
      new Rectangle(10, 10, 135, 85),
      new Rectangle(155, 10, 135, 85),
      new Rectangle(10, 105, 280, 85)
    ]
    const texts = areas.map((area, i) => {
      outline(new Path.Rectangle(area))
      return new AreaText({
        ...style,
        textPath: new Path.Rectangle(area),
        content: i ? '' : `${words} ${words} ${words} ${words}`
      })
    })
    texts[0].link(texts[1])
    texts[1].link(texts[2])
    await expectScene()
  })

  test('Linked path texts flow into each other', async () => {
    const style = createScene(300, 120)
    const first = new Path.Line([10, 30], [140, 30])
    const second = new Path.Arc([160, 90], [225, 20], [290, 90])
    outline(first)
    outline(second)
    const text = new PathText({
      ...style,
      textPath: first,
      content: 'Text along a path flows on along the next path of its story.'
    })
    text.link(new PathText({ ...style, textPath: second }))
    await expectScene()
  })
})

describe('Type along a path', () => {
  test('Letters follow curves', async () => {
    const style = createScene(300, 160)
    const wave = new Path({
      segments: [
        [10, 60],
        [80, 20],
        [150, 60],
        [220, 100],
        [290, 60]
      ]
    })
    wave.smooth()
    outline(wave)
    new PathText({
      ...style,
      textPath: wave,
      content: 'Letters turn to the direction of the path where they sit.',
      fontSize: 14
    })
    const circle = new Path.Circle({ center: [150, 125], radius: 25 })
    outline(circle)
    new PathText({
      ...style,
      textPath: circle,
      content: 'Around a circle, once around a circle',
      fontSize: 9
    })
    await expectScene()
  })

  test('Alignment, offsets and spacing', async () => {
    const style = createScene(300, 200)
    const alignments = ['baseline', 'ascender', 'descender', 'center']
    alignments.forEach((alignment, i) => {
      const path = new Path.Line([10, 30 + i * 30], [290, 30 + i * 30])
      outline(path)
      new PathText({
        ...style,
        textPath: path,
        content: `Alignment: ${alignment}`,
        alignment,
        startOffset: 10 + i * 40
      })
    })
    const arc = new Path.Arc([10, 190], [150, 150], [290, 190])
    outline(arc)
    new PathText({
      ...style,
      textPath: arc,
      content: 'Spacing where the path bends',
      spacing: 2,
      startOffset: 40,
      endOffset: 260
    })
    await expectScene()
  })

  test('A text path with a transformation of its own', async () => {
    const style = createScene(300, 120)
    const path = new Path.Arc([20, 80], [140, 20], [260, 80])
    path.applyMatrix = false
    path.scale(1, 1.5)
    path.rotate(10)
    outline(path)
    new PathText({
      ...style,
      textPath: path,
      content: 'The path is scaled and rotated, the letters are not.'
    })
    await expectScene()
  })
})
