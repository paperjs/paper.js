/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2026, Jürg Lehni & Jonathan Puckey
 * http://juerglehni.com/ & https://puckey.studio/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

import {
  LinkedPoint,
  Point,
  Rectangle,
  TextItem,
  TextRange,
  isPlainObject
} from '../internal.ts'
import type { TextLine } from './TextItem.ts'
import type { PointLike } from '../basic/Point.ts'
import type { Matrix } from '../basic/Matrix.ts'

/**
 * A PointText item represents a piece of typography in your Paper.js project
 * which starts from a certain point and extends by the amount of characters
 * contained in it.
 */
export class PointText extends TextItem {
  /**
   * Creates a point text item
   *
   * @param point the position where the text will start
   *
   * @example {@paperscript}
   * var text = new PointText(new Point(200, 50));
   * text.justification = 'center';
   * text.fillColor = 'black';
   * text.content = 'The contents of the point text';
   */
  constructor(point: PointLike | number, y?: number)
  /**
   * Creates a point text item from the properties described by an object
   * literal.
   *
   * @param object an object containing properties describing the path's
   *     attributes
   *
   * @example {@paperscript}
   * var text = new PointText({
   *     point: [50, 50],
   *     content: 'The contents of the point text',
   *     fillColor: 'black',
   *     fontFamily: 'Courier New',
   *     fontWeight: 'bold',
   *     fontSize: 25
   * });
   */
  constructor(object: object)
  constructor(arg?: any, y?: number) {
    super()
    // Support two forms of item initialization: Passing one object literal
    // describing all the different properties to be set, or a point where it
    // should be placed (arg). See if a point is passed, and if so, pass it on
    // to _initialize(). If not, it might be a properties object literal.
    const hasProps = (
      isPlainObject(arg) &&
      arg.x === undefined &&
      arg.y === undefined
    )
    this._initialize(hasProps && arg, !hasProps && Point.from(arg, y))
  }

  /**
   * The PointText's anchor point
   */
  get point(): Point {
    // Se Item#position for an explanation why we create new LinkedPoint
    // objects each time.
    const { x, y } = this._matrix.translation
    return new LinkedPoint(x, y, this, 'point')
  }

  set point(point: PointLike) {
    this.translate(Point.from(point).subtract(this._matrix.translation))
  }

  // The lines of the text as canvas lays them out, see #_measure(): one per
  // paragraph, each moving down by its own line height from the first
  // baseline at 0, and by the space between its paragraph and the one
  // before, aligned by its paragraph's justification and indents:
  // @override
  _layOut(): TextLine[] {
    const story = this._story
    const { length } = story._content
    const { paragraphs } = new TextRange(story, this._getStart(), length)
    const lines = []
    let y = 0
    let spaceAfter = 0
    for (let i = 0, l = paragraphs.length; i < l; i++) {
      const range = paragraphs[i]
      const paragraph = story._getParagraph(range._start).style
      const line = this._measure(range._start, range._end, paragraph.direction)
      if (i > 0) {
        y += line.lineHeight + Math.max(spaceAfter, paragraph.spaceBefore)
      }
      spaceAfter = paragraph.spaceAfter
      line.y = y
      this._place(line, paragraph, true, this._indent(paragraph, true, 0, 0))
      lines.push(line)
    }
    this._visibleEnd = length
    return lines
  }

  _getBounds(matrix: Matrix, options: any): Rectangle {
    const lines = this._getLayout()
    let rect = new Rectangle()
    let strokeWidth = 0
    for (let i = 0, l = lines.length; i < l; i++) {
      const line = lines[i]
      const box = this._getBox(line, line.x, line.y)
      rect = i ? rect.unite(box) : box
      for (let j = 0, m = line.pieces.length; j < m; j++) {
        const { style } = line.pieces[j]
        if (style.hasStroke()) {
          strokeWidth = Math.max(strokeWidth, style.strokeWidth)
        }
      }
    }
    // The glyph outlines aren't known, so add half the stroke width all
    // around, before transforming as strokes of text always scale. Sharp
    // miter joins can stick out further.
    if (options.stroke && strokeWidth) {
      rect = rect.expand(strokeWidth)
    }
    return matrix?._transformBounds(rect, rect) ?? rect
  }
}
