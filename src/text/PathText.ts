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

import { TextItem } from './TextItem.ts'
import type { TextLine } from './TextItem.ts'
import { Change } from '../constants.ts'
import { inject, isPlainObject } from '../util/object.ts'
import { Rectangle } from '../basic/Rectangle.ts'
import { Matrix } from '../basic/Matrix.ts'
import { PathFlattener } from '../path/PathFlattener.ts'
import type { PathItem } from '../path/PathItem.ts'
import type { Path } from '../path/Path.ts'

// The fields that change the layout, with their defaults:
const fields = {
  startOffset: 0,
  endOffset: null,
  alignment: 'baseline',
  spacing: 0
}

/**
 * A PathText item represents text that runs along a path, its
 * {@link #textPath}, each letter turned to the path's direction where it
 * sits. On a compound path, the text runs along one of its paths after the
 * other. What doesn't fit between {@link #startOffset} and
 * {@link #endOffset} flows on into the next linked text item. When its first
 * paragraph runs right to left, its letters follow each other backwards
 * along the path. Each letter is drawn on its own, so scripts that join their
 * letters, as Arabic, lose their joined forms.
 */
export class PathText extends TextItem {
  declare _startOffset: number
  declare _endOffset: number | null
  declare _alignment: string
  declare _spacing: number

  /**
   * Creates a text item that runs along a path.
   *
   * @param path the path that the text runs along
   * @param orientation the orientation of the text
   *
   * @example {@paperscript}
   * var path = new Path.Circle({ center: [80, 80], radius: 60 });
   * var text = new PathText(path);
   * text.content = 'Around and around and around';
   * text.fontSize = 16;
   */
  constructor(path: PathItem, orientation?: string)
  /**
   * Creates a text item that runs along a path, from the properties
   * described by an object literal.
   *
   * @param object an object containing properties describing the text's
   *     attributes
   */
  constructor(object: object)
  constructor(path: any, orientation?: string) {
    super()
    const hasProps = isPlainObject(path)
    this._children = []
    this._initialize(hasProps && path)
    if (!hasProps) {
      this.textPath = path
      if (orientation) {
        this.orientation = orientation
      }
    }
  }

  copyContent(source: this) {
    super.copyContent(source)
    for (const name in fields) {
      const key = `_${name}`
      this[key] = source[key]
    }
  }

  // The layout of the story's part that fits along the path, see
  // #_measure(): one line of letters, each turned to the path where its
  // middle sits, found by flatteners that walk the paths one after the
  // other:
  // @override
  _layOut(): TextLine[] {
    const path = this.textPath
    const story = this._story
    const start = this._getStart()
    const flatteners = ((path ? path._children || [path] : []) as Path[]).map(
      child =>
        // In the text's coordinates, through the compound path's matrix too:
        new PathFlattener(
          child,
          0.25,
          32,
          false,
          child === path ? path._matrix : path._matrix.appended(child._matrix)
        )
    )
    const lengths = flatteners.map(flattener => flattener.length)
    const length = lengths.reduce((sum, length) => sum + length, 0)
    const from = Math.max(0, Math.min(this._startOffset, length))
    const to =
      this._endOffset == null
        ? length
        : Math.max(from, Math.min(this._endOffset, length))
    const spacing = this._spacing
    const paragraph = story._getParagraph(start).style
    const measured = this._measure(
      start,
      story._content.length,
      paragraph.direction,
      true
    )
    const letters = measured.pieces
    const pieces = []
    let width = 0
    // 1. The letters that fit, each spaced on from the one before, from the
    // right in a right-to-left first paragraph:
    for (let i = 0, l = letters.length; i < l; i++) {
      const piece = letters[i]
      if (width + piece.width > to - from) break
      piece.x = width
      pieces.push(piece)
      width += piece.width + spacing
    }
    width -= pieces.length ? spacing : 0
    if (paragraph.direction === 'rtl') {
      this._mirror(pieces, width)
    }
    // 2. Placed along the paths by the first paragraph's justification, with
    // the part of the letters that sits on them:
    const side = this._getSide(paragraph.justification, paragraph.direction)
    const offset =
      side === 'right'
        ? to - width
        : side === 'center'
          ? from + (to - from - width) / 2
          : from
    const alignment = this._alignment
    const below =
      alignment === 'ascender'
        ? measured.ascent
        : alignment === 'descender'
          ? -measured.descent
          : alignment === 'center'
            ? (measured.ascent - measured.descent) / 2
            : 0
    for (let i = 0, l = pieces.length; i < l; i++) {
      const piece = pieces[i]
      let middle = offset + piece.x + piece.width / 2
      let index = 0
      while (index < lengths.length - 1 && middle > lengths[index]) {
        middle -= lengths[index]
        index++
      }
      const flattener = flatteners[index]
      const tangent = flattener.getTangentAt(middle).normalize()
      const point = flattener
        .getPointAt(middle)
        .add(tangent.rotate(90).multiply(below + piece.y))
      piece.x = point.x
      piece.y = point.y
      piece.dx = -piece.width / 2
      piece.rotation += tangent.angle
    }
    const last = pieces[pieces.length - 1]
    this._visibleEnd = last ? last.end : start
    return [
      Object.assign(measured, {
        pieces,
        end: this._visibleEnd,
        width
      })
    ]
  }

  // The letters' boxes, turned with them:
  _getBounds(matrix: Matrix /* , options */): Rectangle {
    const { pieces } = this._getLayout()[0]
    let bounds = null
    for (let i = 0, l = pieces.length; i < l; i++) {
      const piece = pieces[i]
      let rect = this._getBox(piece, piece.dx, 0)
      const local = new Matrix()
        .translate(piece.x, piece.y)
        .rotate(piece.rotation)
      if (matrix) {
        local.prepend(matrix)
      }
      rect = local._transformBounds(rect, rect)
      bounds = bounds ? bounds.unite(rect) : rect
    }
    return bounds || new Rectangle()
  }

  static {
    for (const [name, value] of Object.entries(fields)) {
      const key = `_${name}`
      this.prototype[key] = value
      inject(this.prototype, {
        get [name]() {
          return this[key]
        },
        set [name](value: any) {
          this[key] = value
          this._changed(Change.GEOMETRY)
        }
      })
    }
    this.prototype._serializeFields = {
      ...TextItem.prototype._serializeFields,
      textPath: null,
      ...fields
    }
  }
}

// The members defined at runtime rather than in the class body:
export interface PathText {
  /**
   * The length along the path where the text starts.
   *
   * @default 0
   */
  startOffset: number

  /**
   * The length along the path where the text ends, or `null` for its end.
   *
   * @default null
   */
  endOffset: number | null

  /**
   * Which part of the letters sits on the path.
   *
   * @values 'baseline', 'ascender', 'descender', 'center'
   * @default 'baseline'
   */
  alignment: string

  /**
   * Space added between the letters, where the path bends tightly.
   *
   * @default 0
   */
  spacing: number
}
