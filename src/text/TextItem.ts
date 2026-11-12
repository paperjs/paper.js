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
  Change,
  ChangeFlag,
  HitResult,
  Item,
  Line,
  Point,
  Rectangle,
  Style,
  TextRange,
  TextStory,
  equals,
  inject,
  serialize
} from '../internal.ts'
import type { Matrix } from '../basic/Matrix.ts'
import type { Project } from '../item/Project.ts'
import type { PathItem } from '../path/PathItem.ts'

// How a style sets its letters, see TextItem#_getPiece(), and, placed on a
// line, its content, where it is in the story, and its place and extent:
export type TextPiece = {
  style: Style
  font: string
  tracking: string
  size: number
  ascent: number
  descent: number
  lineHeight: number
  y: number
  scale: Point
  rotation: number
  capitals: boolean
  content?: string
  start?: number
  end?: number
  x?: number
  dx?: number
  width?: number
}

// A line of the text's layout, see TextItem#_measure():
export type TextLine = {
  pieces: TextPiece[]
  start: number
  end: number
  x: number
  y: number
  width: number
  lineHeight: number
  ascent: number
  descent: number
  region?: number
}

/**
 * The TextItem type allows you to create typography. Its functionality is
 * inherited by different text item types such as {@link PointText},
 * {@link PathText} and {@link AreaText}. They each add a layer of
 * functionality that is unique to their type, but share the underlying
 * properties and functions that they inherit from TextItem.
 */
export class TextItem extends Item {
  // The internals of text items aren't private, as hosted shells are created
  // without the constructor, see Item#_loadContent().
  declare _orientation: string
  _story: TextStory
  _layout: TextLine[]
  _fontMetrics: Record<string, { ascent: number; descent: number }>
  _visibleEnd: number

  _initializeContent(project: Project) {
    // The text's own style stands for its runs' and paragraphs' styles,
    // see #_getStyles(), so the story comes before the style:
    this._story = new TextStory([this])
    super._initializeContent(project)
  }

  // Styles that differ within the text are kept by run and by paragraph:
  _serialize(options: any, dictionary: any) {
    const json = super._serialize(options, dictionary)
    const props = json[1]
    const story = this._story
    const content = story._content
    const runs = story._getRuns()
    const paragraphs = story._paragraphs
    const keys = story._paragraphKeys
    const itemKeys = story._itemKeys

    // Style values that differ from the defaults, serialized with the
    // item's options and dictionary, where gradients go:
    function serializeValue(json: any, style: Style, key: string) {
      const value = style[key]
      if (value !== undefined && !equals(value, style._defaults[key])) {
        json[key] = serialize(value, options, false, dictionary)
      }
    }

    if (runs.length > 1) {
      // Each run's character properties as its own style has them, which is
      // quicker than reading them through a range. Those it doesn't set are
      // the defaults, which the JSON leaves out:
      props.runs = runs.map(run => {
        const { style } = run
        const values = style._values
        const json = { content: content.slice(run.start, run.end) }
        for (const key in style._defaults) {
          if (key in values && !(key in keys || key in itemKeys)) {
            serializeValue(json, style, key)
          }
        }
        return json
      })
      delete props.content
    }
    if (paragraphs.some(style => !style.equals(paragraphs[0]))) {
      props.paragraphs = paragraphs.map(style => {
        const json = {}
        for (const key in keys) {
          serializeValue(json, style, key)
        }
        return json
      })
    }
    return json
  }

  _equals(item: TextItem): boolean {
    const story1 = this._story
    const story2 = item._story
    const runs1 = story1._getRuns()
    const runs2 = story2._getRuns()
    const paragraphs1 = story1._paragraphs
    const paragraphs2 = story2._paragraphs
    return (
      story1._content === story2._content &&
      runs1.length === runs2.length &&
      runs1.every((run, i) => {
        const other = runs2[i]
        return run.end === other.end && run.style.equals(other.style)
      }) &&
      paragraphs1.length === paragraphs2.length &&
      paragraphs1.every((style, i) => style.equals(paragraphs2[i]))
    )
  }

  _changed(flags: number) {
    super._changed(flags)
    // The layout follows the content and the styles of the runs, and where
    // the text starts in its story, which the item before it decides:
    if (flags & (ChangeFlag.GEOMETRY | ChangeFlag.STYLE)) {
      this._layout = this._fontMetrics = null
      const next = this.nextTextItem
      if (next) {
        next._changed(Change.GEOMETRY)
      }
    }
  }

  // A copy shows a copy of the story, on its own:
  copyContent(source: this) {
    super.copyContent(source)
    this._story = source._story._clone([this])
    this._orientation = source._orientation
    this._changed(Change.CONTENT)
  }

  // The text's own style stands for its story's runs' and paragraphs'
  // styles, and keeps only the properties of the text item itself:
  // @override
  _getStyles(style: Style, key: string): Style[] | null {
    const story = this._story
    return !(key in story._itemKeys)
      ? key in story._paragraphKeys
        ? story._paragraphs
        : story._runs.map(run => run.style)
      : null
  }

  /**
   * The direction the text's lines run in: `'horizontal'`, or `'vertical'`
   * from top to bottom, with the lines from right to left.
   *
   * @values 'horizontal', 'vertical'
   * @default 'horizontal'
   */
  get orientation(): string {
    return this._orientation
  }

  set orientation(orientation: string) {
    if (orientation !== this._orientation) {
      this._orientation = orientation
      this._changed(Change.GEOMETRY)
    }
  }

  /**
   * The path that the text flows in ({@link AreaText}) or along
   * ({@link PathText}). It guides the text and isn't drawn itself.
   */
  get textPath(): PathItem | null {
    return this._children && (this._children[0] as PathItem) || null
  }

  set textPath(path: PathItem | null) {
    this.removeChildren()
    if (path) {
      this.addChild(path)
    }
    this._changed(Change.GEOMETRY)
  }

  // The text path is the text's child, but it guides the text instead of
  // being one of its parts, so text items show no children, and they're
  // never hit:
  // @override
  get children(): Item[] {
    return null
  }

  set children(items: Item[]) {
    super.children = items
  }

  // @override
  get firstChild(): Item {
    return null
  }

  // @override
  get lastChild(): Item {
    return null
  }

  // @override
  _hitTestChildren(): HitResult | null {
    return null
  }

  /**
   * {@grouptitle Linking}
   *
   * The story the text item shows: the text of all the text items linked
   * with it.
   */
  get story(): TextStory {
    return this._story
  }

  /**
   * Links the text item `next` after this one, so the story flows on into
   * it. Its own story joins the end of this one.
   *
   * @param next the text item to link
   * @return {@true if the text item was linked}
   */
  link(next: TextItem): boolean {
    const story = this._story
    const other = next._story
    if (other === story) return false
    // Join the other story's content, styles and text items:
    const items = story._items
    const joined = other._items
    story._append(other)
    items.splice(items.indexOf(this) + 1, 0, ...joined)
    for (let i = 0, l = joined.length; i < l; i++) {
      joined[i]._story = story
    }
    story._changed(Change.CONTENT)
    return true
  }

  /**
   * Checks whether the text item is linked with others.
   *
   * @return {@true if the text item is linked with others}
   */
  isLinked(): boolean {
    return this._story._items.length > 1
  }

  /**
   * Unlinks the text item: `'both'` takes it out of its story, which flows
   * on through the others, `'before'` and `'after'` break the story into
   * two there.
   *
   * @param [which='both'] `'both'`, `'before'` or `'after'`
   * @return {@true if the text item was unlinked}
   */
  unlink(which?: 'both' | 'before' | 'after'): boolean {
    const story = this._story
    const items = story._items
    const index = items.indexOf(this)
    which ||= 'both'
    if (
      items.length > 1 &&
      !(
        which === 'before' && index === 0 ||
        which === 'after' && index === items.length - 1
      )
    ) {
      if (which === 'both') {
        // The item keeps the style its text started with, in a story of its
        // own:
        const start = this.visibleRange._start
        const own = new TextStory([this])
        own._runs[0].style = new Style(
          story._getRangeStyles('fontSize', start, start)[0],
          own
        )
        items.splice(index, 1)
        this._story = own
        story._changed(Change.CONTENT)
        this._changed(Change.CONTENT)
      } else {
        // Break the story where the items after the break start:
        const at = which === 'before' ? index : index + 1
        const start = items[at].visibleRange._start
        const moved = items.splice(at, items.length - at)
        const rest = story._extract(start, moved)
        for (let i = 0, l = moved.length; i < l; i++) {
          moved[i]._story = rest
        }
        story._changed(Change.CONTENT)
        rest._changed(Change.CONTENT)
      }
      return true
    }
    return false
  }

  /**
   * The text item after this one in its story, if any.
   */
  get nextTextItem(): TextItem | null {
    const items = this._story._items
    return items[items.indexOf(this) + 1] ?? null
  }

  /**
   * The text item before this one in its story, if any.
   */
  get previousTextItem(): TextItem | null {
    const items = this._story._items
    return items[items.indexOf(this) - 1] ?? null
  }

  /**
   * The range of the story that this text item shows, as its layout flows
   * the story through the linked text items: without the overflow, and
   * without what the ones before it show.
   */
  get visibleRange(): TextRange {
    const [start, end] = this._getVisibleRange()
    return new TextRange(this._story, start, end)
  }

  // The part of the story that the item shows, as [start, end], from where
  // the items before it end to where its layout ends:
  _getVisibleRange(): [number, number] {
    this._getLayout()
    return [this._getStart(), this._visibleEnd]
  }

  // The layout of the text, see #_layOut(), kept until the text changes:
  _getLayout(): TextLine[] {
    return (this._layout ??= this._layOut())
  }

  // The lines of the text, as #_measure() makes them, and where the visible
  // part of the story ends, as _visibleEnd:
  // @overridable
  _layOut(): TextLine[] {
    // To be overridden in sub-classes.
    return []
  }

  _getStart(): number {
    return this.previousTextItem?._getVisibleRange()[1] ?? 0
  }

  isEmpty(): boolean {
    return !this._story._content
  }

  // Lays the story out from `start` to `end` along a straight baseline from
  // x = 0: the pieces of its runs, each with its style, place and extent,
  // the width, and the line height, the largest of the runs'. Neighboring
  // pieces of one font are measured as one string, so each advance holds the
  // font's kerning with the letter before it, in the paragraph's
  // `direction`, as shaping can differ by it. With `byLetter`, and in runs
  // with manual kerning or rotated letters, each letter is a piece:
  _measure(
    start: number,
    end: number,
    direction: string,
    byLetter?: boolean
  ): TextLine {
    const { view } = this
    const story = this._story
    const content = story._content
    const runs = story._runs
    let letters = null
    let index = 0
    const pieces = []
    let total = 0
    let lineHeight = 0
    let ascent = 0
    let descent = 0
    let group = ''
    let groupWidth = 0
    let previous = null

    // The advance of `text` after the group measured so far:
    function advance(piece: TextPiece, text: string): number {
      if (
        !(
          previous?.font === piece.font &&
          previous.tracking === piece.tracking &&
          previous.scale.equals(piece.scale) &&
          previous.y === piece.y
        )
      ) {
        group = ''
        groupWidth = 0
      }
      const before = groupWidth
      group += text
      groupWidth = (
        view.getTextWidth(piece.font, [group], piece.tracking, direction) *
        piece.scale.x
      )
      return groupWidth - before
    }

    // Adds the piece of `text`, from `from` to `to` in the story, with
    // `extra` space after it:
    function add(
      piece: TextPiece,
      text: string,
      from: number,
      to: number,
      extra: number
    ) {
      const shown = piece.capitals ? text.toUpperCase() : text
      const width = advance(piece, shown) + extra
      pieces.push(
        (previous = {
          ...piece,
          content: shown,
          start: from,
          end: to,
          x: total,
          width
        })
      )
      total += width
    }

    for (let i = 0, l = runs.length, pos = 0; i < l; i++) {
      const run = runs[i]
      const next = pos + run.length
      const from = Math.max(pos, start)
      const to = Math.min(next, end)
      // An empty line takes its line height from the run it's in:
      if (from < to || start === end && from === to && !lineHeight) {
        const { style } = run
        const piece = this._getPiece(style)
        const kerning = style.letterKerning
        if (byLetter || kerning != null || piece.rotation) {
          // Walk the letters once, through all the runs:
          letters ??= story._getLetters()
          while (index < letters.length && letters[index]._start < to) {
            const letter = letters[index++]
            if (letter._start >= from) {
              if (kerning != null) {
                // Manual kerning replaces the font's pair:
                previous = null
              }
              add(
                piece,
                letter.content,
                letter._start,
                letter._end,
                (kerning || 0) / 1000 * piece.size
              )
            }
          }
        } else {
          add(piece, content.slice(from, to), from, to, 0)
        }
        lineHeight = Math.max(lineHeight, piece.lineHeight)
        ascent = Math.max(ascent, piece.ascent - piece.y)
        descent = Math.max(descent, piece.descent + piece.y)
      }
      pos = next
    }
    return {
      pieces,
      start,
      end,
      x: 0,
      y: 0,
      width: total,
      lineHeight,
      ascent,
      descent
    }
  }

  /**
   * The lines of the text, as its layout breaks them: each a range of its
   * story, with its `baseline`, a {@link Line} along it, and its `bounds`,
   * in the text item's own coordinates. A {@link PathText}'s one line
   * follows its path: these describe it laid out straight.
   */
  get lines(): TextRange[] {
    const story = this._story
    return this._getLayout().map(line => {
      const range = new TextRange(story, line.start, line.end)
      range.baseline = new Line(
        new Point(line.x, line.y),
        new Point(line.x + line.width, line.y)
      )
      range.bounds = this._getBox(line, line.x, line.y)
      return range
    })
  }

  // How a style sets its letters: its canvas font and tracking, its size,
  // the font's ascent and descent and the line height, how far it moves them
  // from the baseline, its scaling and rotation:
  _getPiece(style: Style): TextPiece {
    const size = style._getFontSize()
    const font = style._getCanvasFont()
    const position = style.baselinePosition
    const scale = Point.from(style.letterScaling)
    // The font's metrics, kept until the text changes, as its layout, or
    // guessed from its size without them:
    const cache = (this._fontMetrics ??= {})
    const metrics = (
      cache[font] ||
      (cache[font] = this.view.getFontMetrics(font) || {
        ascent: 0.75 * size,
        descent: 0.25 * size
      })
    )
    return {
      style,
      font,
      tracking: style._getCanvasLetterSpacing(),
      size,
      ascent: metrics.ascent * scale.y,
      descent: metrics.descent * scale.y,
      lineHeight: style._getLineHeight(),
      y: (
        -style.baselineShift -
        (position === 'superscript' ? 1 : position === 'subscript' ? -1 : 0) *
        size *
        style._scriptShift
      ),
      scale,
      rotation: style.letterRotation,
      capitals: style.capitals === 'all'
    }
  }

  // The box of a line or a piece with its baseline at `x`, `y`: as high as
  // its line height, which leaves the same leading above its ascent as
  // below its descent:
  _getBox(entry: TextLine | TextPiece, x: number, y: number): Rectangle {
    const leading = (entry.lineHeight - entry.ascent - entry.descent) / 2
    return new Rectangle(
      x,
      y - entry.ascent - leading,
      entry.width,
      entry.lineHeight
    )
  }

  // The room between `left` and `right` that the paragraph's indents leave
  // a line, with the first line's indent on its first:
  _indent(
    paragraph: Style,
    isFirst: boolean,
    left: number,
    right: number
  ): [number, number] {
    const isRightToLeft = paragraph.direction === 'rtl'
    const start = (
      paragraph.startIndent +
      (isFirst ? paragraph.firstLineIndent : 0)
    )
    const end = paragraph.endIndent
    return [
      left + (isRightToLeft ? end : start),
      right - (isRightToLeft ? start : end)
    ]
  }

  // Places the line in the room by the paragraph's justification, by its
  // justifyLast on the last line of a justified paragraph:
  _place(
    line: TextLine,
    paragraph: Style,
    isLast: boolean,
    room: [number, number]
  ) {
    const { justification, justifyLast, direction } = paragraph
    const side = this._getSide(
      justification === 'justify' && isLast && justifyLast !== 'all'
        ? justifyLast
        : justification,
      direction
    )
    const [left, right] = room
    if (side === 'justify' || side === 'all') {
      this._justify(line, right - left, direction)
    }
    if (direction === 'rtl') {
      this._mirror(line.pieces, line.width)
    }
    this._shift(
      line,
      side === 'right'
        ? right - line.width
        : side === 'center'
          ? (left + right - line.width) / 2
          : left,
      0
    )
  }

  // Spreads the line's extra width between its words, by moving each piece
  // by the spaces before it:
  _justify(line: TextLine, width: number, direction: string) {
    const { pieces } = line
    const content = this._story._content
    const spaces = (
      content
        .slice(
          pieces.length ? pieces[0].start : 0,
          pieces.length ? pieces[pieces.length - 1].end : 0
        )
        .match(/\s+/g) ?? []
    ).length
    if (spaces && width > line.width) {
      const extra = (width - line.width) / spaces
      let moved = 0
      const result = []
      for (let i = 0, l = pieces.length; i < l; i++) {
        // Split pieces at their spaces, so each word can move. Pieces
        // without any, as a soft hyphen's, move whole:
        const piece = pieces[i]
        const parts = piece.content.split(/(\s+)/)
        let from = piece.start
        let { x } = piece
        if (parts.length === 1) {
          result.push({ ...piece, x: x + moved })
        } else {
          for (let j = 0, m = parts.length; j < m; j++) {
            const part = parts[j]
            if (part) {
              const advance = this._measure(
                from,
                from + part.length,
                direction
              ).width
              if (/^\s+$/.test(part)) {
                moved += extra
              } else {
                result.push({
                  ...piece,
                  content: part,
                  start: from,
                  end: from + part.length,
                  x: x + moved,
                  width: advance
                })
              }
              x += advance
              from += part.length
            }
          }
        }
      }
      line.pieces = result
      line.width = width
    }
  }

  // Places the pieces of a line as wide as `width`, laid out from the left
  // in reading order, from the right, as right-to-left paragraphs read:
  _mirror(pieces: TextPiece[], width: number) {
    for (let i = 0, l = pieces.length; i < l; i++) {
      const piece = pieces[i]
      piece.x = width - piece.x - piece.width
    }
  }

  // Moves the line, and its pieces, by `x` and `y`:
  _shift(line: TextLine, x: number, y: number) {
    const { pieces } = line
    line.x = (line.x || 0) + x
    line.y += y
    for (let i = 0, l = pieces.length; i < l; i++) {
      pieces[i].x += x
    }
  }

  // Where lines align by `justification`, 'start' and 'end' resolved by the
  // paragraph's `direction`:
  _getSide(justification: string, direction: string): string {
    const isRightToLeft = direction === 'rtl'
    return justification === 'start'
      ? isRightToLeft
        ? 'right'
        : 'left'
      : justification === 'end'
        ? isRightToLeft
          ? 'left'
          : 'right'
        : justification
  }

  // Draw the pieces of the text's layout, see #_getLayout(), each in its
  // style, at its place and angle:
  _draw(ctx: CanvasRenderingContext2D, param: any, viewMatrix: Matrix) {
    if (param.dontFinish || param.clip) {
      // The glyph outlines aren't known, so clip with the bounds (#1845):
      const rect = this.internalBounds
      if (!param.dontStart) {
        ctx.beginPath()
      }
      ctx.rect(rect.x, rect.y, rect.width, rect.height)
    } else if (this._story._content) {
      const story = this._story
      const lines = this._getLayout()
      let paragraph = null
      // Glyphs can only be stroked through the transformation, unlike paths,
      // so approximate non-scaling strokes by dividing the width and the
      // dashes by the scale (#1703):
      const scale = !this._style.strokeScaling && viewMatrix._getMeanScale()
      ctx.textAlign = 'left'
      for (let i = 0, l = lines.length; i < l; i++) {
        const line = lines[i]
        const { pieces } = line
        // Canvas orders the letters within the pieces by their paragraph's
        // direction, looked up once for all its lines:
        if (!paragraph || line.start > paragraph.end) {
          paragraph = story._getParagraph(line.start)
          const direction = paragraph.style.direction || 'ltr'
          if (ctx.direction !== direction) {
            ctx.direction = direction
          }
        }
        for (let j = 0, m = pieces.length; j < m; j++) {
          const piece = pieces[j]
          const { style, size } = piece
          const hasFill = style.hasFill()
          const hasStroke = style.hasStroke()
          const isStrokeFirst = hasStroke && style.paintOrder === 'stroke'
          let x = piece.dx || 0
          this._setStyles(ctx, param, viewMatrix, null, style)
          if (hasStroke && scale) {
            ctx.lineWidth /= scale
            ctx.setLineDash(ctx.getLineDash().map(dash => dash / scale))
            ctx.lineDashOffset /= scale
          }
          ctx.save()
          ctx.translate(piece.x, line.y + piece.y)
          if (piece.rotation) {
            ctx.rotate(piece.rotation * Math.PI / 180)
          }
          // Underlines and strikethroughs, in the fill color:
          if (hasFill) {
            const thickness = size / 15
            if (style.underline) {
              ctx.fillRect(x, size / 8, piece.width, thickness)
            }
            if (style.strikethrough) {
              ctx.fillRect(x, -size * 0.3, piece.width, thickness)
            }
          }
          ctx.scale(piece.scale.x, piece.scale.y)
          x /= piece.scale.x
          ctx.font = piece.font
          ctx.letterSpacing = piece.tracking
          // Cast the shadow of the first paint only, see Item#_paint():
          if (isStrokeFirst) {
            ctx.strokeText(piece.content, x, 0)
            ctx.shadowColor = 'rgba(0,0,0,0)'
          }
          if (hasFill) {
            ctx.fillText(piece.content, x, 0)
            ctx.shadowColor = 'rgba(0,0,0,0)'
          }
          if (hasStroke && !isStrokeFirst) {
            ctx.strokeText(piece.content, x, 0)
          }
          ctx.restore()
        }
      }
    }
  }

  _hitTestSelf(point: Point, options: any): HitResult | undefined {
    if (options.fill) {
      // The glyph outlines aren't known, so hit the letters' boxes, also
      // within the tolerance around them (#632):
      const lines = this._getLayout()
      for (let i = 0, l = lines.length; i < l; i++) {
        const line = lines[i]
        const { pieces } = line
        for (let j = 0, m = pieces.length; j < m; j++) {
          const piece = pieces[j]
          const local = point
            .subtract(piece.x, line.y + piece.y)
            .rotate(-piece.rotation)
          const rect = this._getBox(piece, piece.dx || 0, 0)
          const closest = local.clamp(
            rect._getTopLeft(true),
            rect._getBottomRight(true)
          )
          // Transparent fills are hit too, see Path#_hitTestSelf():
          if (piece.style.fillColor) {
            const offset = local
              .subtract(closest)
              .divide(options._tolerancePadding)
            if (offset.length <= 1) return new HitResult('fill', this)
          }
        }
      }
    }
  }

  static {
    Object.assign(this.prototype, {
      _applyMatrix: false,
      _canApplyMatrix: false,
      _serializeFields: {
        ...Item.prototype._serializeFields,
        content: null,
        orientation: 'horizontal'
      },
      // The paragraphs follow the content, whatever order objects give them
      // in:
      _prioritize: ['applyMatrix', 'content', 'runs'],
      _orientation: 'horizontal',
      // TextItem has no handles, so share the cache of #handleBounds and
      // #bounds:
      _boundsOptions: { handle: false }
    })
    // The text items' content is their story's:
    for (const key of ['content', 'runs', 'paragraphs']) {
      inject(this.prototype, {
        get [key]() {
          return this._story[key]
        },
        set [key](value: any) {
          this._story[key] = value
        }
      })
    }
    for (const key of ['words', 'letters']) {
      inject(this.prototype, {
        get [key]() {
          return this._story[key]
        }
      })
    }
    for (const key of ['replace', 'range']) {
      inject(this.prototype, {
        [key](...args: any[]) {
          return this._story[key](...args)
        }
      })
    }
  }
}

// The members defined at runtime rather than in the class body:
export interface TextItem {
  /**
   * {@grouptitle Character Style}
   *
   * The font-family to be used in text content.
   *
   * @default 'sans-serif'
   */
  fontFamily: string

  /**
   * The font-weight to be used in text content.
   *
   * @default 'normal'
   */
  fontWeight: string | number

  /**
   * The font size of text content, as a number in pixels, or as a string with
   * optional units `'px'`, `'pt'` and `'em'`.
   *
   * @default 12
   */
  fontSize: number | string

  /**
   * The line height of text content: the distance from one line's baseline
   * to the next. Automatic, as `'auto'` (1.2) or another factor of the
   * letters' font size, each line moving down by its largest letters'; or
   * fixed, as a length with units as the font size takes them (`'18px'`,
   * `'12pt'`).
   *
   * @default 'auto'
   */
  lineHeight: number | string

  /**
   * The letter tracking of text content: the space added after each letter,
   * along the line, in thousandths of an em, as in Adobe Illustrator and
   * InDesign. A tracking of 100 adds a tenth of the font size.
   *
   * @default 0
   */
  letterTracking: number

  /**
   * The letter kerning of text content: the space added after a letter,
   * along the line, in thousandths of an em, in place of the font's own
   * kerning pair; `null` for the font's kerning.
   *
   * @default null
   */
  letterKerning: number | null

  /**
   * The font style of text content, as in CSS: upright or slanted. Together
   * with the {@link #fontWeight}, it says what a font's style name says, e.g.
   * `'Bold Italic'`.
   *
   * @values 'normal', 'italic', 'oblique'
   * @default 'normal'
   */
  fontStyle: string

  /**
   * The settings of a variable font's axes, by their tags: `{ wght: 600,
   * wdth: 80 }`. Kept for hosts that lay text out with its fonts; canvas
   * doesn't draw them.
   *
   * @default null
   */
  fontVariations: Record<string, number>

  /**
   * How far the letters move up from the baseline, in pixels.
   *
   * @default 0
   */
  baselineShift: number

  /**
   * Whether the letters are set as superscripts or subscripts: smaller, and
   * above or below the baseline.
   *
   * @values 'normal', 'superscript', 'subscript'
   * @default 'normal'
   */
  baselinePosition: string

  /**
   * How much the letters are scaled, as {@link Item#scaling}: one factor for
   * both directions, or a point with the horizontal and vertical ones.
   *
   * @default 1
   */
  letterScaling: number | number[]

  /**
   * The rotation of each letter about its origin on the baseline, in degrees.
   *
   * @default 0
   */
  letterRotation: number

  /**
   * Whether the letters are set as capitals, or as small capitals.
   *
   * @values 'normal', 'all', 'small'
   * @default 'normal'
   */
  capitals: string

  /**
   * Whether the letters are underlined.
   *
   * @default false
   */
  underline: boolean

  /**
   * Whether the letters are struck through.
   *
   * @default false
   */
  strikethrough: boolean

  /**
   * The OpenType features to turn on (`'dlig'`) or off (`'-liga'`). Kept for
   * hosts that lay text out with its fonts; canvas doesn't draw them.
   *
   * @default null
   */
  features: string[]

  /**
   * {@grouptitle Paragraph Style}
   *
   * The justification of text paragraphs.
   *
   * @values 'left', 'right', 'center', 'start', 'end', 'justify'
   * @default 'left'
   */
  justification: string

  /**
   * How the last line of a justified paragraph is aligned; `'all'` justifies
   * it too.
   *
   * @values 'left', 'right', 'center', 'start', 'end', 'all'
   * @default 'left'
   */
  justifyLast: string

  /**
   * How far justification may change the spacing, each as `[minimum, desired,
   * maximum]` in percent: `{ word: [80, 100, 133], letter: [0, 0, 0], glyph:
   * [100, 100, 100] }`; `null` for those. Kept for hosts: canvas text
   * justifies by the word spacing alone.
   *
   * @default null
   */
  justifySpacing: {
    word?: number[]
    letter?: number[]
    glyph?: number[]
  } | null

  /**
   * The indent where the paragraph's lines start: left in left-to-right text,
   * right in right-to-left text.
   *
   * @default 0
   */
  startIndent: number

  /**
   * The indent where the paragraph's lines end.
   *
   * @default 0
   */
  endIndent: number

  /**
   * The indent of the paragraph's first line, added to its start indent.
   *
   * @default 0
   */
  firstLineIndent: number

  /**
   * The space above the paragraph. Between two paragraphs, the larger of this
   * one's and the space after the one before it is used.
   *
   * @default 0
   */
  spaceBefore: number

  /**
   * The space below the paragraph.
   *
   * @default 0
   */
  spaceAfter: number

  /**
   * Whether words are hyphenated at the ends of lines, and how: `true`, or `{
   * wordsLongerThan, afterFirst, beforeLast, limit, zone, capitalized }`.
   * Kept for hosts: canvas text breaks only at soft hyphens.
   *
   * @default false
   */
  hyphenation:
    | boolean
    | {
        wordsLongerThan?: number
        afterFirst?: number
        beforeLast?: number
        limit?: number
        zone?: number
        capitalized?: boolean
      }

  /**
   * How lines are broken: one line at a time, or all of the paragraph's lines
   * together, for the most even spacing. Kept for hosts: canvas text breaks
   * one line at a time.
   *
   * @values 'line', 'paragraph'
   * @default 'paragraph'
   */
  composer: string

  /**
   * How the lines of a paragraph in an area are evened out: `'normal'`
   * fills each line as far as it goes, `'balance'` makes them all about as
   * long, and `'pretty'` balances the last four lines when the last one is
   * shorter than a third of the one before. Both keep the paragraph's number
   * of lines.
   *
   * @values 'normal', 'balance', 'pretty'
   * @default 'normal'
   */
  lineWrap: string

  /**
   * The paragraph's tab stops: `[{ position, align, leader }]`, with `align`
   * one of `'left'`, `'center'`, `'right'` and `'decimal'`. Kept for hosts:
   * canvas text doesn't set tabs yet.
   *
   * @default null
   */
  tabs: object[]

  /**
   * The direction the paragraph's lines run in, which `'start'` and `'end'`
   * follow, and from which side their pieces are placed; `null` for left to
   * right. Lines that mix directions across styles aren't reordered by the
   * Unicode bidirectional algorithm: their pieces follow the paragraph's
   * direction, and canvas orders only the letters within each piece.
   *
   * @values 'ltr', 'rtl'
   * @default null
   */
  direction: string

  /**
   * {@grouptitle Content}
   *
   * The text of the item's story, see {@link TextStory#content}.
   */
  content: string

  /**
   * Replaces the content from `start` to `end` of the item's story, see
   * {@link TextStory#replace(content, start, end)}.
   *
   * @param content the new content
   * @param start the index of the first character to replace
   * @param end the index after the last character to replace
   */
  replace(content: string, start: number, end: number): void

  /**
   * Returns the range of the item's story from `start` to `end`.
   *
   * @param start the index of its first character
   * @param end the index after its last character
   * @return the range of the item's story
   */
  range(start: number, end: number): TextRange

  /**
   * The runs of the item's story, see {@link TextStory#runs}.
   */
  get runs(): TextRange[]
  set runs(runs: (TextRange | Record<string, any>)[])

  /**
   * The paragraphs of the item's story, see {@link TextStory#paragraphs}.
   */
  get paragraphs(): TextRange[]
  set paragraphs(paragraphs: (TextRange | Record<string, any>)[])

  /**
   * The words of the item's story, see {@link TextStory#words}.
   */
  readonly words: TextRange[]

  /**
   * The letters of the item's story, see {@link TextStory#letters}.
   */
  readonly letters: TextRange[]
}
