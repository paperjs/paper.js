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
import paper, { Color, Group, Point, PointText } from 'paper'
import { equals, test, testFontFamily } from '../helpers.js'

describe('TextRange', () => {
  function createText(content) {
    return new PointText({
      point: [20, 50],
      content,
      fontFamily: testFontFamily,
      fontSize: 12
    })
  }

  test('Styling a range splits the runs', () => {
    const text = createText('Hello world')
    text.range(6, 11).fontSize = 24
    const runs = text.runs
    equals(runs.length, 2, 'two runs')
    equals(runs[0].content, 'Hello ')
    equals(runs[1].content, 'world')
    equals(runs[1].fontSize, 24)
    equals(text.range(0, 5).fontSize, 12, 'the rest keeps its size')
    equals(text.fontSize, undefined, 'mixed sizes read as undefined')
    equals(text.range(4, 8).fontSize, undefined, 'a range across both')
    equals(text.fillColor, new Color(0, 0, 0), 'what they share reads')
  })

  test('Setting a property on the text sets it throughout', () => {
    const text = createText('Hello world')
    text.range(6, 11).fontSize = 24
    text.fontSize = 10
    equals(text.fontSize, 10)
    equals(text.runs.length, 1, 'the runs join again')
  })

  test('Walking the words and restyling them', () => {
    const text = createText('Every word its size')
    const words = text.words
    equals(words.map(word => word.content).join(), 'Every,word,its,size')
    words.forEach(word => {
      word.fontSize = word.content.length * 4
    })
    equals(text.words.map(word => word.fontSize).join(), '20,16,12,16')
    equals(text.range(5, 6).fontSize, 12, 'the spaces keep theirs')
  })

  test('Letters are what readers see as one', () => {
    // An e with a combining accent, and a precomposed one, escaped so that
    // the test loads in any encoding:
    const text = createText('e\u0301t\u00e9')
    equals(
      text.letters.map(letter => letter.content.length).join(),
      typeof Intl !== 'undefined' && Intl.Segmenter
        ? '2,1,1'
        : '1,1,1,1'
    )
  })

  test('Paragraph properties apply to whole paragraphs', () => {
    const text = createText('One\nTwo\nThree')
    text.range(5, 6).justification = 'center'
    equals(
      text.paragraphs
        .map(
          paragraph => paragraph.content + ':' + paragraph.justification
        )
        .join(),
      'One:left,Two:center,Three:left'
    )
    equals(text.justification, undefined, 'mixed justifications')
    text.range(0, 9).justification = 'right'
    equals(
      text.paragraphs.map(paragraph => paragraph.justification).join(),
      'right,right,right',
      'all the paragraphs a range touches'
    )
  })

  test('Replacing content keeps styles', () => {
    const text = createText('Hello world')
    text.range(6, 11).fontSize = 24
    text.replace('there', 6, 11)
    equals(text.content, 'Hello there')
    equals(text.range(6, 11).fontSize, 24, `the replaced content's style`)
    text.replace('!', 11, 11)
    equals(
      text.range(11, 12).fontSize,
      24,
      'inserted content takes the style before it'
    )
    text.replace('Hi', text.words[0])
    equals(text.content, 'Hi there!', 'a range')
    equals(text.range(0, 2).fontSize, 12)
  })

  test('Replacing line breaks merges and splits paragraphs', () => {
    const text = createText('One\nTwo')
    text.paragraphs[1].justification = 'center'
    text.replace(' ', 3, 4)
    equals(text.paragraphs.length, 1, 'merged')
    equals(text.justification, 'left', 'into the first')
    text.replace('\nand\n', 3, 4)
    equals(
      text.paragraphs.map(paragraph => paragraph.content).join('|'),
      'One|and|Two',
      'split'
    )
  })

  test('The style of a range', () => {
    const text = createText('Hello world')
    text.range(0, 5).style = { fontSize: 30, fillColor: 'red' }
    equals(text.range(0, 5).style.fontSize, 30)
    equals(text.range(0, 5).fillColor, new Color('red'))
    text.words[1].style = { tracking: 100 }
    equals(text.words[1].letterTracking, 100, 'by its former name')
    equals(
      text.style.letterTracking,
      undefined,
      `the text's own style is mixed`
    )
  })

  test('Colors of ranges change their letters', () => {
    const text = createText('Hello world')
    const range = text.range(0, 5)
    range.fillColor = 'red'
    range.fillColor.blue = 1
    equals(text.range(0, 5).fillColor, new Color(1, 0, 1))
    equals(text.range(6, 11).fillColor, new Color(0, 0, 0))
  })

  test('Runs as plain objects', () => {
    const text = createText('')
    text.runs = [
      { content: 'Big ', fontSize: 30 },
      { content: 'small', fontSize: 8, fillColor: 'blue' }
    ]
    equals(text.content, 'Big small')
    equals(text.range(0, 3).fontSize, 30)
    equals(text.range(4, 9).fillColor, new Color('blue'))
    const json = text.runs[1].toJSON()
    equals(json.content, 'small')
    equals(json.fontSize, 8)
    equals(json.start, 4)
    equals('fontWeight' in json, false, 'only what differs from defaults')
    const copy = createText('')
    copy.runs = text.runs
    equals(copy.range(4, 9).fontSize, 8, `from another text's runs`)
  })

  test('Clones and JSON keep the runs and paragraphs', () => {
    const text = createText('Hello\nworld')
    text.range(6, 11).fontSize = 24
    text.paragraphs[1].justification = 'right'
    const clone = text.clone()
    equals(clone.range(6, 11).fontSize, 24, 'clone')
    equals(clone.paragraphs[1].justification, 'right', 'clone')
    equals(clone.equals(text), true, 'equals()')
    clone.range(0, 1).fontSize = 2
    equals(clone.equals(text), false, 'equals() after a change')
    const imported = new PointText().importJSON(text.exportJSON())
    equals(imported.content, 'Hello\nworld', 'importJSON()')
    equals(imported.range(6, 11).fontSize, 24, 'importJSON()')
    equals(imported.range(0, 5).fontSize, 12, 'importJSON()')
    equals(imported.paragraphs[1].justification, 'right', 'importJSON()')
    const plain = createText('Plain')
    equals(
      JSON.parse(plain.exportJSON())[1].runs,
      undefined,
      'one style throughout serializes as before'
    )
  })

  test('JSON keeps the gradients and colors of runs (#2348)', () => {
    const text = createText('Hello')
    const fill = {
        gradient: { stops: ['red', 'blue'] },
        origin: [20, 40],
        destination: [60, 40]
      },
      stroke = {
        gradient: { stops: ['yellow', 'green'], radial: true },
        origin: [30, 45],
        destination: [40, 45]
      }
    text.range(0, 2).fillColor = fill
    text.range(2, 4).strokeColor = stroke
    text.range(4, 5).fillColor = 'orange'
    const imported = new PointText().importJSON(text.exportJSON())

    function equalsGradient(color, expected, message) {
      const gradient = color.gradient
      equals(color.type, 'gradient', message)
      equals(
        gradient.stops[0].color,
        new Color(expected.gradient.stops[0]),
        message + ' first stop'
      )
      equals(
        gradient.stops[1].color,
        new Color(expected.gradient.stops[1]),
        message + ' second stop'
      )
      equals(gradient.radial, !!expected.gradient.radial, message)
      equals(color.origin, new Point(expected.origin), message)
      equals(color.destination, new Point(expected.destination), message)
    }

    equalsGradient(imported.range(0, 2).fillColor, fill, 'gradient fill')
    equalsGradient(
      imported.range(2, 4).strokeColor,
      stroke,
      'gradient stroke'
    )
    equals(
      imported.range(4, 5).fillColor,
      new Color('orange'),
      'plain color'
    )
  })

  test('JSON rounds the style values of runs and paragraphs to the precision', () => {
    const text = createText('One\nTwo')
    text.range(0, 3).fontSize = 10.12345
    text.paragraphs[1].startIndent = 4.56789
    const json = JSON.parse(text.exportJSON({ precision: 2 }))[1]
    equals(json.runs[0].fontSize, 10.12, 'run')
    equals(json.paragraphs[1].startIndent, 4.57, 'paragraph')
  })

  test('Groups set the styles of the texts in them', () => {
    const text = createText('Hello world')
    text.range(6, 11).fontSize = 24
    const group = new Group([text])
    equals(group.fontSize, undefined, 'mixed within the text')
    group.fontSize = 16
    equals(text.range(6, 11).fontSize, 16)
  })

  // A line's box above and below its baseline: as high as its line height, with
  // the same leading above the font's ascent as below its descent:
  function lineBox(view, size) {
    const metrics = view.getFontMetrics(
        'normal ' +
        size +
        'px ' +
        testFontFamily
      ),
      leading = (1.2 * size - metrics.ascent - metrics.descent) / 2
    return [metrics.ascent + leading, metrics.descent + leading]
  }

  test('Mixed styles lay out run by run', () => {
    const text = createText('Hello\nworld'),
      view = text.view,
      bounds = text.bounds
    text.range(6, 11).fontSize = 24
    const width = view.getTextWidth(
      'normal 24px ' + testFontFamily,
      ['world'],
      '0em'
    )
    equals(text.bounds.width, width, 'the widest line, in its own size', {
      tolerance: 0.01
    })
    // Each line moves down by its own line height (fontSize * 1.2):
    equals(
      text.bounds.height,
      lineBox(view, 12)[0] +
      28.8 +
      lineBox(view, 24)[1],
      `the second line's line height`,
      { tolerance: 0.01 }
    )
    equals(text.bounds.top, bounds.top, 'the first line stays')
  })

  test('Runs of one font are measured together', () => {
    const text = createText('AVAV'),
      view = text.view
    text.range(2, 4).fillColor = 'red'
    equals(
      text.bounds.width,
      view.getTextWidth('normal 12px ' + testFontFamily, ['AVAV'], '0em'),
      'as one string',
      { tolerance: 0.01 }
    )
  })

  test('Justification by paragraph', () => {
    const text = createText('One\nTwo'),
      view = text.view,
      width = view.getTextWidth(
        'normal 12px ' + testFontFamily,
        ['Two'],
        '0em'
      )
    text.paragraphs[1].justification = 'right'
    equals(
      text.bounds.left,
      text.point.x - width,
      'the right-justified line reaches left of the point',
      { tolerance: 0.01 }
    )
  })

  test('Font style and weight, small capitals, superscripts', () => {
    const text = createText('Wide'),
      view = text.view
    function width(font) {
      return view.getTextWidth(font, ['Wide'], '0em')
    }

    text.fontStyle = 'italic'
    text.fontWeight = 'bold'
    equals(
      text.bounds.width,
      width('italic bold 12px ' + testFontFamily),
      'italic and bold',
      { tolerance: 0.01 }
    )
    text.capitals = 'small'
    text.baselinePosition = 'superscript'
    equals(
      text.bounds.width,
      width(
        'italic small-caps bold ' +
        12 * 0.583 +
        'px ' +
        testFontFamily
      ),
      'small capitals, and superscripts set smaller',
      { tolerance: 0.01 }
    )
  })

  test('Letter scaling widens the letters', () => {
    const text = createText('Wide'),
      width = text.bounds.width
    text.letterScaling = [2, 1]
    equals(text.bounds.width, width * 2, 'twice as wide', {
      tolerance: 0.01
    })
    text.letterScaling = 0.5
    equals(text.bounds.width, width / 2, 'one factor for both', {
      tolerance: 0.01
    })
  })

  test('Letter kerning adds space after each letter', () => {
    const text = createText('AV'),
      view = text.view,
      font = 'normal 12px ' + testFontFamily,
      width = (
        view.getTextWidth(font, ['A'], '0em') +
        view.getTextWidth(font, ['V'], '0em')
      )
    text.letterKerning = 100
    equals(
      text.bounds.width,
      width + 2 * 1.2,
      'the letters on their own, each with a tenth of an em',
      { tolerance: 0.01 }
    )
  })

  test('Indents and space between paragraphs', () => {
    const text = createText('One\nTwo'),
      height = text.bounds.height
    text.paragraphs[1].spaceBefore = 10
    equals(text.bounds.height, height + 10, 'space before')
    text.paragraphs[0].spaceAfter = 20
    equals(
      text.bounds.height,
      height + 20,
      'the larger of the space after and before'
    )
    const left = text.bounds.left
    text.startIndent = 5
    equals(text.bounds.left, left + 5, 'start indent')
  })

  test('Start and end justification follow the direction', () => {
    const text = createText('One'),
      width = text.bounds.width,
      x = text.point.x
    text.justification = 'end'
    equals(text.bounds.left, x - width, 'end: right in LTR', {
      tolerance: 0.01
    })
    text.direction = 'rtl'
    equals(text.bounds.left, x, 'end: left in RTL', { tolerance: 0.01 })
    text.justification = 'start'
    equals(text.bounds.left, x - width, 'start: right in RTL', {
      tolerance: 0.01
    })
  })

  test('Line height: automatic, or fixed', () => {
    const text = createText('One\nTwo'),
      view = text.view
    // Two lines are twice their line height tall: one between their
    // baselines, and the leading split around the font's ascent and descent:
    equals(text.lineHeight, 'auto', 'automatic by default')
    equals(text.bounds.height, 2 * 14.4, '1.2 of the font size, 12')
    text.lineHeight = 1.5
    equals(text.bounds.height, 2 * 18, 'another factor', {
      tolerance: 0.01
    })
    text.lineHeight = '18px'
    equals(text.bounds.height, 2 * 18, 'fixed', { tolerance: 0.01 })
    text.lineHeight = '18pt'
    equals(
      text.bounds.height,
      2 * view.getPixelSize('18pt'),
      'fixed, with units as the font size takes them',
      { tolerance: 0.01 }
    )
    text.lineHeight = 'auto'
    text.range(4, 7).fontSize = 24
    equals(
      text.bounds.height,
      lineBox(view, 12)[0] +
      28.8 +
      lineBox(view, 24)[1],
      'automatic: each line by its largest letters',
      { tolerance: 0.01 }
    )
  })

  test('leading, as Paper.js had it before: a fixed line height', () => {
    const text = createText('One\nTwo')
    equals(text.leading, 14.4, 'the automatic line height, in pixels')
    text.leading = 18
    equals(text.lineHeight, '18px', 'a number is fixed')
    equals(text.bounds.height, 2 * 18, 'two lines', { tolerance: 0.01 })
    text.style = { leading: 20, tracking: 100 }
    equals(
      text.lineHeight + ' ' + text.letterTracking,
      '20px 100',
      'set by the former names in style objects'
    )
  })

  test('Ranges have their runs, paragraphs, words and letters', () => {
    const text = createText('One two\nthree four\n\nfive')
    const paragraphs = text.paragraphs
    equals(
      paragraphs[1].words.map(word => word.content).join(),
      'three,four',
      `a paragraph's words`
    )
    equals(
      text.range(0, 1000).paragraphs.length,
      4,
      'all the paragraphs, the empty one too'
    )
    equals(
      text
        .range(5, 12)
        .words.map(word => word.content)
        .join(),
      'wo,thre',
      `clipped at the range's ends`
    )
    paragraphs[1].words[0].fontSize = 20
    equals(text.range(8, 13).fontSize, 20, 'styled through them')
    equals(text.range(8, 18).runs.length, 2, `a range's runs`)
    equals(paragraphs[3].letters.length, 4, `a paragraph's letters`)
  })

  test('Text changes are logged for hosts', () => {
    const text = createText('Hello world')
    function changed() {
      return paper.project
        .takeChanges()
        .map(change => (change.item === text ? 'text' : change.item.className))
        .join()
    }

    paper.project.trackChanges = true
    paper.project.takeChanges()
    text.range(6, 11).fontSize = 20
    equals(changed(), 'text', 'styling a range')
    text.replace('there', 6, 11)
    equals(changed(), 'text', 'replacing content')
    text.paragraphs[0].justification = 'center'
    equals(changed(), 'text', 'a paragraph property')
    paper.project.trackChanges = false
  })

  test(`New texts take the project's current style, as SVG import sets it`, () => {
    paper.project.currentStyle.fontSize = 30
    const text = new PointText([0, 0])
    text.content = 'Hello'
    equals(text.fontSize, 30, 'in their runs')
    paper.project.currentStyle.fontSize = 12
  })

  test('JSON imports the paragraphs after the content, in any order', () => {
    const text = new PointText({
      paragraphs: [{ justification: 'left' }, { justification: 'right' }],
      content: 'One\nTwo'
    })
    equals(text.paragraphs[1].justification, 'right', 'the second one')
  })

  test('JSON writes each run as its range has it', () => {
    const text = createText('Every word its own size')
    text.words.forEach((word, i) => {
      word.fontSize = 10 + i * 4
      word.fillColor = i % 2 ? 'red' : 'blue'
    })
    text.range(0, 3).underline = true
    const keys = text.story._paragraphKeys,
      runs = text.runs.map(run => {
        const json = run.toJSON()
        delete json.start
        delete json.end
        for (const key in keys) delete json[key]
        return json
      })
    equals(
      JSON.stringify(JSON.parse(text.exportJSON())[1].runs),
      JSON.stringify(runs),
      'their content and character properties'
    )
  })
})
