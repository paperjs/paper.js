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

import {
  Change,
  GEOMETRIC_EPSILON,
  Group,
  Path,
  PathItem,
  Rectangle,
  TextItem,
  inject,
  isPlainObject
} from '../internal.ts'
import type { TextLine } from './TextItem.ts'
import type { RectangleLike } from '../basic/Rectangle.ts'
import type { Item } from '../item/Item.ts'
import type { Style } from '../style/Style.ts'
import type { Project } from '../item/Project.ts'

// The fields that change the layout, with their defaults:
const fields = {
  columns: 1,
  rows: 1,
  gutter: 18,
  inset: 0,
  verticalAlign: 'top'
}

/**
 * An AreaText item represents text that flows inside an area, its
 * {@link #textPath}: any path, with holes too, divided into {@link #columns}
 * and {@link #rows}. Its lines break between words to fit the area's width
 * where they sit. What doesn't fit flows on into the next linked text item.
 */
export class AreaText extends TextItem {
  declare _columns: number
  declare _rows: number
  declare _gutter: number
  declare _inset: number
  declare _verticalAlign: string
  // The version of the layer's text wraps that the layout follows, see
  // #_getLayout():
  _textWrapVersion: number

  /**
   * Creates a text item that flows inside an area.
   *
   * @param area the path that the text flows inside
   * @param orientation the orientation of the text
   */
  constructor(area: PathItem, orientation?: string)
  /**
   * Creates a text item that flows inside a rectangle.
   *
   * @param rectangle the rectangle that the text flows inside
   * @param orientation the orientation of the text
   *
   * @example {@paperscript}
   * var text = new AreaText(new Rectangle(20, 20, 160, 100));
   * text.content = 'Text in an area breaks into lines that fit it.';
   */
  constructor(rectangle: RectangleLike, orientation?: string)
  /**
   * Creates a text item that flows inside an area, from the properties
   * described by an object literal.
   *
   * @param object an object containing properties describing the text's
   *     attributes
   */
  constructor(object: object)
  constructor(area: any, orientation?: string) {
    super()
    const hasProps = isPlainObject(area) && area.width === undefined
    this._initialize(hasProps && area)
    if (!hasProps) {
      this.textPath =
        area instanceof PathItem
          ? area
          : new Path.Rectangle({
              rectangle: Rectangle.from(area),
              insert: false
            })
      if (orientation) {
        this.orientation = orientation
      }
    }
  }

  _initializeContent(project: Project) {
    super._initializeContent(project)
    // The text path, see TextItem#textPath:
    this._children = []
  }

  copyContent(source: this) {
    super.copyContent(source)
    for (const name in fields) {
      const key = `_${name}`
      this[key] = source[key]
    }
  }

  // Its place among its layer's text wraps changes when it moves:
  _installEvents(install: boolean) {
    super._installEvents(install)
    this._layout = null
  }

  /**
   * Sets the area's height to the smallest that holds all of its text,
   * scaling its {@link #textPath} vertically from its top. An area without
   * a height, which holds nothing, becomes a rectangle as wide as it.
   *
   * @return this area text
   *
   * @example {@paperscript}
   * var text = new AreaText(new Rectangle(20, 20, 160, 0));
   * text.content = 'The area grows to hold all of its text.';
   * text.fitHeight();
   */
  fitHeight(): this {
    let path = this.textPath
    if (path) {
      const { bounds } = path
      if (!bounds.height) {
        path = new Path.Rectangle({
          rectangle: new Rectangle(bounds.x, bounds.y, bounds.width, 1),
          insert: false
        })
        this.textPath = path
      }
      const top = bounds.topCenter
      const fits = (height: number) => {
        path.scale(1, height / path.bounds.height, top)
        return this._getVisibleRange()[1] === this._story._content.length
      }
      let low = 0
      let high = path.bounds.height
      let count = 0
      // Double the height until all fits, then search between:
      while (!fits(high) && count++ < 32) {
        low = high
        high *= 2
      }
      if (count <= 32) {
        while (high - low > 0.01) {
          const height = (low + high) / 2
          if (fits(height)) {
            high = height
          } else {
            low = height
          }
        }
        fits(high)
      } else {
        // It never fits, as an area without a width:
        fits(bounds.height || 1)
      }
    }
    return this
  }

  // Lay out again when the layer's text wraps change:
  // @override
  _getLayout(): TextLine[] {
    const { layer } = this
    const version = layer?._textWrapVersion
    if (this._textWrapVersion !== version) {
      this._textWrapVersion = version
      this._layout = null
    }
    return super._getLayout()
  }

  // The layout of the story's part that fits the area, see #_measure(): its
  // lines, broken between words to fit the area's width where each sits,
  // filling the regions of its rows and columns one after the other, each
  // line moving down by its own line height and the space between
  // paragraphs, aligned by its paragraph's justification and indents, and
  // evened out by its lineWrap:
  // @override
  _layOut(): TextLine[] {
    const story = this._story
    const content = story._content
    const regions = this._getRegions()
    const wraps = this._getTextWraps()
    // How far each region's first line moves down, to align its lines
    // vertically:
    const offsets = regions.map(() => 0)
    let state

    // Lays out the paragraph from `state`, each line's room narrowed by
    // `getCut(index)` to break it, see #_breakLine():
    const lay = (getCut?: (index: number) => number) => {
      let { pos, region, y } = state
      const paragraph = story._getParagraph(pos)
      const { style } = paragraph
      // The space between paragraphs, once, unless at the top:
      let space =
        pos === paragraph.start && y !== null
          ? Math.max(state.spaceAfter, style.spaceBefore)
          : 0
      const result = []
      let isComplete = false
      while (regions[region]) {
        const bounds = regions[region]
        // The extent of what comes next, to find room:
        const next = this._measure(
          pos,
          Math.min(pos + 1, paragraph.end),
          style.direction
        )
        const baseline =
          y === null
            ? bounds.top + offsets[region] + next.ascent
            : y + next.lineHeight + space
        // Nothing without a height fits anywhere:
        if (!next.lineHeight || next.lineHeight < 0) break
        if (baseline + next.descent > bounds.bottom) {
          // The region is full: on to the next one.
          region++
          y = null
          continue
        }
        // Fill the spans at this height in reading order, each as far as it
        // goes, then go on further down:
        const spans = this._getSpans(bounds, baseline, next, wraps)
        if (style.direction === 'rtl') {
          spans.reverse()
        }
        for (let i = 0, l = spans.length; i < l && !isComplete; i++) {
          const span = spans[i]
          const line = this._breakLine(
            pos,
            paragraph,
            pos === paragraph.start,
            span,
            getCut?.(result.length) ?? 0,
            // A word too wide for any line takes one of its own where
            // nothing narrows the region:
            span[1] - span[0] >= bounds.width - GEOMETRIC_EPSILON
          )
          if (line) {
            line.y = baseline
            line.region = region
            result.push(line)
            pos = line.end
            isComplete = pos === paragraph.end
          }
        }
        y = baseline
        space = 0
        if (isComplete) break
      }
      return {
        lines: result,
        paragraph: style,
        isComplete,
        state: {
          pos,
          region,
          y,
          spaceAfter: style.spaceAfter
        }
      }
    }

    // Finds where `isAbove(value)` turns true for values from 0 to `high`,
    // as the values on either side of it, to `precision`:
    const search = (
      high: number,
      precision: number,
      isAbove: (value: number) => boolean
    ): [number, number] => {
      let low = 0
      while (high - low > precision) {
        const value = (low + high) / 2
        if (isAbove(value)) {
          high = value
        } else {
          low = value
        }
      }
      return [low, high]
    }

    // Narrower lines change nothing as long as they keep the paragraph
    // whole, and its number of lines:
    const keeps = (attempt, count: number) => (
      attempt.isComplete && attempt.lines.length === count
    )

    // Narrows the lines from index `from` on as far as they keep the
    // paragraph, which evens them out:
    const balance = (count: number, from: number) => {
      const cutFrom = (cut: number) => (index: number) =>
        index >= from ? cut : 0
      const widest = regions.reduce(
        (width, bounds) => Math.max(width, bounds.width),
        0
      )
      const [cut] = search(widest, 0.5, cut => !keeps(lay(cutFrom(cut)), count))
      return cut > 0 && lay(cutFrom(cut))
    }

    // Lays out all the paragraphs, one after the other, from where the text
    // starts:
    const layAll = () => {
      const layout = []
      let match
      state = {
        pos: this._getStart(),
        region: 0,
        y: null,
        spaceAfter: 0
      }
      do {
        let result = lay()
        const { lines } = result
        const count = lines.length
        const wrap = result.paragraph.lineWrap
        if (result.isComplete && count > 1) {
          if (wrap === 'balance') {
            result = balance(count, 0) || result
          } else if (
            wrap === 'pretty' &&
            lines[count - 1].width < lines[count - 2].width / 3
          ) {
            // Balance the last four lines, if the last one is short:
            result = balance(count, Math.max(0, count - 4)) || result
          }
        }
        layout.push(...result.lines)
        state = result.state
        // On to the next paragraph, after its line break:
        match = (
          result.isComplete &&
          /^(\r\n|\n|\r)/.exec(content.slice(state.pos))
        )
        if (match) {
          state.pos += match[0].length
        }
      } while (match)
      return layout
    }

    // The region's last line, and the room below it:
    const getLast = (layout: TextLine[], region: number) => {
      for (let i = layout.length - 1; i >= 0; i--) {
        const line = layout[i]
        if (line.region === region) {
          return {
            line,
            free: regions[region].bottom - line.y - line.descent
          }
        }
      }
      return null
    }

    let layout = layAll()
    const align = this._verticalAlign
    if (align !== 'top') {
      // Align each region's lines by laying them out again from lower down,
      // as far as they keep what the region shows, and, to center them, as
      // much room above them as below:
      for (let r = 0, l = regions.length; r < l; r++) {
        const last = getLast(layout, r)
        if (last?.free > 0) {
          const { end } = last.line
          // The room below the lines laid out from `offset` down, beyond
          // what's wanted, or null if the region then shows less:
          const getExcess = (offset: number) => {
            offsets[r] = offset
            const moved = getLast(layAll(), r)
            return moved?.line.end === end
              ? moved.free - (align === 'center' ? offset : 0)
              : null
          }
          // A rectangle aligns in one step, other shapes by searching:
          const excess = getExcess(
            align === 'center' ? last.free / 2 : last.free
          )
          if (excess === null || Math.abs(excess) > 0.01) {
            offsets[r] = search(last.free, 0.01, offset => {
              const excess = getExcess(offset)
              return excess === null || excess < 0
            })[0]
          }
          layout = layAll()
        }
      }
    }
    this._visibleEnd = state.pos
    return layout
  }

  // The regions that the area is divided into by its inset, rows and
  // columns, in the order the text fills them:
  _getRegions(): Rectangle[] {
    const path = this.textPath
    const regions = []
    if (path) {
      const bounds = path.bounds.expand(-2 * this._inset)
      const gutter = this._gutter
      const rows = Math.max(1, this._rows)
      const columns = Math.max(1, this._columns)
      const width = (bounds.width - gutter * (columns - 1)) / columns
      const height = (bounds.height - gutter * (rows - 1)) / rows
      for (let row = 0; row < rows; row++) {
        for (let column = 0; column < columns; column++) {
          regions.push(
            new Rectangle(
              bounds.x + column * (width + gutter),
              bounds.y + row * (height + gutter),
              width,
              height
            )
          )
        }
      }
    }
    return regions
  }

  // The spans of the line at `baseline` in the region, from left to right:
  // where the area holds all of the line's band, from its ascent to its
  // descent, without the text wraps, or only within them when inverted:
  _getSpans(
    region: Rectangle,
    baseline: number,
    line: TextLine,
    wraps: any[]
  ): number[][] {
    const top = baseline - line.ascent
    const bottom = baseline + line.descent
    const middle = (top + bottom) / 2
    const unite = (stretches1: number[][], stretches2: number[][]) => {
      const all = stretches1.concat(stretches2).sort((a, b) => a[0] - b[0])
      const result = []
      for (let i = 0, l = all.length; i < l; i++) {
        const last = result[result.length - 1]
        const stretch = all[i]
        if (last && stretch[0] <= last[1]) {
          last[1] = Math.max(last[1], stretch[1])
        } else {
          result.push(stretch.slice())
        }
      }
      return result
    }
    const intersect = (stretches1: number[][], stretches2: number[][]) => {
      const result = []
      for (let i = 0, l = stretches1.length; i < l; i++) {
        for (let j = 0, m = stretches2.length; j < m; j++) {
          const left = Math.max(stretches1[i][0], stretches2[j][0])
          const right = Math.min(stretches1[i][1], stretches2[j][1])
          if (right > left) {
            result.push([left, right])
          }
        }
      }
      return result
    }
    const subtract = (stretches1: number[][], stretches2: number[][]) =>
      intersect(
        stretches1,
        stretches2.reduce(
          // What's outside the stretches, from left to right:
          (outside, stretch) => {
            const last = outside.pop()
            return outside.concat([
              [last[0], stretch[0]],
              [stretch[1], last[1]]
            ])
          },
          [[-Infinity, Infinity]]
        )
      )
    // The stretches inside the paths along the horizontal at `y`, pairing the
    // crossings of each:
    const inside = (paths: PathItem[], y: number) => {
      const stretches = []
      for (let i = 0, l = paths.length; i < l; i++) {
        const path = paths[i]
        const { bounds } = path
        const xs = path
          .getIntersections(
            new Path.Line({
              from: [bounds.left - 1, y],
              to: [bounds.right + 1, y],
              insert: false
            })
          )
          .map(location => location.point.x)
          .sort((a, b) => a - b)
        for (let j = 0; j + 1 < xs.length; j += 2) {
          stretches.push([xs[j], xs[j + 1]])
        }
      }
      return unite(stretches, [])
    }
    // The area must hold all of the band:
    let spans = [top, middle, bottom].reduce(
      (spans, y) => intersect(spans, inside([this.textPath], y)),
      [[region.left, region.right]]
    )
    for (let i = 0, l = wraps.length; i < l; i++) {
      // A text wrap keeps its offset all around, so look at it from as far
      // above and below the band, and widen or narrow it as much:
      const { offset, invert, paths } = wraps[i]
      const ys = [top - offset, top, middle, bottom, bottom + offset]
      const covered = ys
        .reduce((covered, y) => {
          const stretches = inside(paths, y)
          return covered
            ? invert
              ? intersect(covered, stretches)
              : unite(covered, stretches)
            : stretches
        }, null)
        .map(stretch =>
          invert
            ? [stretch[0] + offset, stretch[1] - offset]
            : [stretch[0] - offset, stretch[1] + offset]
        )
      spans = invert
        ? intersect(spans, covered)
        : subtract(spans, unite(covered, []))
    }
    return spans
  }

  // The items above the text in its layer that push it aside, see
  // Item#textWrap, each with its options and its outline as paths in the
  // text's coordinates: a path's own, a group's children's, or a clip
  // group's clip path, and the bounds of anything else:
  _getTextWraps(): any[] {
    const { layer } = this
    const items = layer?._textWrapItems
    const toText = this._getGlobalMatrix(true).inverted()
    const wraps = []

    const isShown = (item: Item) => {
      for (; item !== layer; item = item._parent) {
        if (!item._visible) return false
      }
      return true
    }

    const getOutline = (item: Item, paths: PathItem[]) => {
      const matrix = toText.appended(item._parent._getGlobalMatrix(true))
      if (item instanceof PathItem) {
        const path = item.clone({ insert: false, deep: true })
        path.transform(matrix)
        paths.push(path)
      } else if (item instanceof Group) {
        const clipItem = item._getClipItem()
        const children = clipItem ? [clipItem] : item._children
        for (let i = 0, l = children.length; i < l; i++) {
          if (children[i]._visible) {
            getOutline(children[i], paths)
          }
        }
      } else {
        paths.push(
          new Path.Rectangle({
            rectangle: item.getBounds(matrix),
            insert: false
          })
        )
      }
      return paths
    }

    for (const id in items) {
      const item = items[id]
      if (item !== this && item.isAbove(this) && isShown(item)) {
        wraps.push({ paths: getOutline(item, []), ...item._textWrap })
      }
    }
    return wraps
  }

  // Breaks the line from `start` at the last word, or soft hyphen, that fits
  // the room, and places it by the paragraph's justification and indents.
  // Spaces at its end hang outside the room. If not even the first word
  // fits, it takes the line alone if `canForce`, else there's no line:
  _breakLine(
    start: number,
    paragraph: { style: Style; start: number; end: number },
    isFirst: boolean,
    room: number[],
    cut: number,
    canForce: boolean
  ): TextLine | null {
    const content = this._story._content
    const { style } = paragraph
    const { direction } = style
    const indented = this._indent(style, isFirst, room[0], room[1])
    const words = /[^\s­]*­|\S+\s*|\s+/g
    const text = content.slice(start, paragraph.end)
    const ends = []
    let match

    // The line up to `end` without its trailing spaces, with a hyphen where
    // it ends at a soft hyphen, in the font of the letter before:
    const measure = (end: number) => {
      const line = this._measure(
        start,
        start + content.slice(start, end).replace(/\s+$/, '').length,
        direction
      )
      if (content[end - 1] === '­') {
        const last = line.pieces[line.pieces.length - 1]
        const width = (
          this.view.getTextWidth(last.font, ['-'], last.tracking, direction) *
          last.scale.x
        )
        line.pieces.push({
          ...last,
          content: '-',
          start: end,
          end,
          x: last.x + last.width,
          width
        })
        line.width += width
      }
      return line
    }

    while ((match = words.exec(text))) {
      ends.push(start + match.index + match[0].length)
    }
    // Search for the last end that fits, as the lines only get wider: first
    // by doubling steps, so nothing much longer than the line is measured,
    // then by halving them between the last two:
    const width = indented[1] - indented[0] - cut
    const fits = (index: number) => measure(ends[index]).width <= width
    let low = -1
    let high = 0
    while (high < ends.length && fits(high)) {
      low = high
      high = 2 * high + 1
    }
    high = Math.min(high, ends.length)
    while (high - low > 1) {
      const middle = (low + high) >> 1
      if (fits(middle)) {
        low = middle
      } else {
        high = middle
      }
    }
    let end = low >= 0 ? ends[low] : start
    if (end === start && ends.length) {
      if (!canForce) return null
      end = ends[0]
    }
    const line = measure(end)
    this._place(line, style, end === paragraph.end, indented)
    line.end = end
    return line
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
export interface AreaText {
  /**
   * The number of columns that the area is divided into, from left to
   * right, which the text fills one after the other.
   *
   * @default 1
   */
  columns: number

  /**
   * The number of rows that the area is divided into, from top to bottom,
   * each with its columns.
   *
   * @default 1
   */
  rows: number

  /**
   * The space between the columns and between the rows.
   *
   * @default 18
   */
  gutter: number

  /**
   * The space between the area's edges and the text.
   *
   * @default 0
   */
  inset: number

  /**
   * Where the lines sit in each column, from top to bottom.
   *
   * @values 'top', 'center', 'bottom'
   * @default 'top'
   */
  verticalAlign: string
}
