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

import { Base } from '../core/Base.ts'
import { Change } from '../constants.ts'
import { Style } from '../style/Style.ts'
import { TextRange } from './TextRange.ts'
import type { TextItem } from './TextItem.ts'

/**
 * The text of one or more linked {@link TextItem}s, which it flows through in
 * order: its content, kept in runs of characters that share a style, and the
 * styles of its paragraphs. A text item that isn't linked has a story of its
 * own.
 */
export class TextStory extends Base {
  // The style properties of whole paragraphs, and of the text items
  // themselves. All others are those of the characters, kept in runs:
  declare _paragraphKeys: Record<string, boolean>
  declare _itemKeys: Record<string, boolean>

  _content: string
  _runs: { length: number; style: Style }[]
  _paragraphs: Style[]
  _items: TextItem[]
  // The letters for laying out, and the content they were found in, see
  // #_getLetters():
  #letters: TextRange[]
  #lettersOf: string

  constructor(items?: TextItem[]) {
    super()
    this._content = ''
    this._runs = [{ length: 0, style: new Style(null, this) }]
    this._paragraphs = [new Style(null, this)]
    this._items = items || []
  }

  /**
   * The text items that the story flows through, in order.
   */
  get textItems(): TextItem[] {
    return this._items.slice()
  }

  // A copy of the story's content and styles, for the text items `items`:
  _clone(items: TextItem[]): TextStory {
    const story = new TextStory(items)
    story._content = this._content
    story._runs = this._runs.map(run => ({
      length: run.length,
      style: new Style(run.style, story)
    }))
    story._paragraphs = this._paragraphs.map(style => new Style(style, story))
    return story
  }

  // Joins the content and styles of the story `other` onto the end of this
  // one. The paragraph they meet in keeps this one's style:
  _append(other: TextStory) {
    const runs = other._runs.map(run => ({
      length: run.length,
      style: new Style(run.style, this)
    }))
    this._content += other._content
    this._runs = this._runs.concat(runs).filter(run => run.length > 0)
    if (!this._runs.length) {
      this._runs = [runs[0]]
    }
    this._paragraphs = this._paragraphs.concat(
      other._paragraphs.slice(1).map(style => new Style(style, this))
    )
  }

  // Takes the content from `start` on out of the story, into a new one for
  // the text items `items`. The paragraph it breaks continues in both:
  _extract(start: number, items: TextItem[]): TextStory {
    const rest = this._clone(items)
    const content = this._content
    const paragraph =
      this._paragraphs[this.#countBreaks(content.slice(0, start))]
    rest.replace('', 0, start)
    rest._paragraphs[0] = new Style(paragraph, rest)
    this.replace('', start, content.length)
    return rest
  }

  // The styles of the runs and paragraphs are their own:
  _getStyles(): undefined {}

  // Changes to the story change the text items it flows through:
  _changed(flags: number) {
    const items = this._items
    for (let i = 0, l = items.length; i < l; i++) {
      items[i]._changed(flags)
    }
  }

  /**
   * The text of the story, from the first of its text items to the last.
   *
   * @example {@paperscript}
   * // Setting the content of a PointText item:
   *
   * // Create a point-text item at {x: 30, y: 30}:
   * var text = new PointText(new Point(30, 30));
   * text.fillColor = 'black';
   *
   * // Set the content of the text item:
   * text.content = 'Hello world';
   *
   * @example {@paperscript}
   * // Interactive example, move your mouse over the view below:
   *
   * // Create a point-text item at {x: 30, y: 30}:
   * var text = new PointText(new Point(30, 30));
   * text.fillColor = 'black';
   *
   * text.content = 'Move your mouse over the view, to see its position';
   *
   * function onMouseMove(event) {
   *     // Each time the mouse is moved, set the content of
   *     // the point text to describe the position of the mouse:
   *     text.content = 'Your position is: ' + event.point.toString();
   * }
   */
  get content(): string {
    return this._content
  }

  set content(content: string) {
    this.replace(content, 0, this._content.length)
  }

  /**
   * Replaces the content from `start` to `end`, or of a range, with new
   * content, which takes the style of the content it replaces, or of the
   * character before it when it's inserted.
   *
   * @param content the new content
   * @param start the index of the first character to replace
   * @param end the index after the last character to replace
   */
  replace(
    content: string,
    start: number | { start: number; end: number },
    end?: number
  ) {
    const range = typeof start === 'number' ? { start, end } : start
    const old = this._content
    const { length } = old
    const runs = this._runs
    const paragraphs = this._paragraphs
    const text = '' + content
    const from = Math.max(0, Math.min(range.start, length))
    const to = Math.max(from, Math.min(range.end, length))
    // 1. The runs: the new content becomes one, between the split runs.
    const i = this.#split(from)
    const j = this.#split(to)
    const source = (i < j ? runs[i] : runs[i - 1] || runs[i]).style
    runs.splice(i, j - i, {
      length: text.length,
      style: new Style(source, this)
    })
    this._runs = runs.filter(run => run.length > 0)
    if (!this._runs.length) {
      this._runs = [runs[i]]
    }
    // 2. The paragraphs: those whose breaks are replaced merge into the
    // first, and new breaks split it, keeping its style.
    const first = this.#countBreaks(old.slice(0, from))
    const removed = this.#countBreaks(old.slice(from, to))
    const added = this.#countBreaks(text)
    const style = paragraphs[first]
    const inserted = []
    for (let k = 0; k < added; k++) {
      inserted.push(new Style(style, this))
    }
    paragraphs.splice(first + 1, removed, ...inserted)
    this._content = old.slice(0, from) + text + old.slice(to)
    this._changed(Change.CONTENT)
  }

  // The paragraph that `pos` is in: its style, and where it starts and ends,
  // before its line break:
  _getParagraph(pos: number): { style: Style; start: number; end: number } {
    const content = this._content
    const before = content.slice(0, pos)
    const start = /(\r\n|\n|\r)[^\r\n]*$/.exec(before)
    const end = /\r\n|\n|\r/.exec(content.slice(pos))
    return {
      style: this._paragraphs[this.#countBreaks(before)],
      start: start ? start.index + start[1].length : 0,
      end: end ? pos + end.index : content.length
    }
  }

  // The number of line breaks in content, where its paragraphs end:
  #countBreaks(content: string): number {
    const matches = content.match(/\r\n|\n|\r/g)
    return matches ? matches.length : 0
  }

  // Splits the run at `index`, and returns the index of the run that starts
  // there:
  #split(index: number): number {
    const runs = this._runs
    for (let i = 0, l = runs.length, start = 0; i < l; i++) {
      const run = runs[i]
      if (start === index) return i
      if (index < start + run.length) {
        runs.splice(i + 1, 0, {
          length: start + run.length - index,
          style: new Style(run.style, this)
        })
        run.length = index - start
        return i + 1
      }
      start += run.length
    }
    return runs.length
  }

  // The styles that the range from start to end stands for: those of the
  // paragraphs it touches, or of its runs, split at its ends for `setting`.
  _getRangeStyles(
    key: string,
    start: number,
    end: number,
    setting?: boolean
  ): Style[] {
    const runs = this._runs
    if (key in this._itemKeys) {
      return []
    } else if (key in this._paragraphKeys) {
      const content = this._content
      const first = this.#countBreaks(content.slice(0, start))
      const last = this.#countBreaks(
        content.slice(0, Math.max(start, end - 1))
      )
      return this._paragraphs.slice(first, last + 1)
    } else if (setting) {
      const i = this.#split(start)
      return runs.slice(i, this.#split(end)).map(run => run.style)
    } else {
      // An empty range has the style of the character before it, as
      // content typed there would:
      const from = start < end ? start : Math.max(0, start - 1)
      const to = start < end ? end : from + 1
      const styles = []
      for (let i = 0, l = runs.length, pos = 0; i < l; i++) {
        const run = runs[i]
        const next = pos + run.length
        if (from < next && to > pos) {
          styles.push(run.style)
        }
        pos = next
      }
      // An empty text has the style of its one empty run:
      return styles.length ? styles : [runs[0].style]
    }
  }

  /**
   * The range of the text from `start` to `end`.
   *
   * @param start the index of its first character
   * @param end the index after its last character
   */
  range(start: number, end: number): TextRange {
    return new TextRange(this, start, end)
  }

  /**
   * The runs of the text: its ranges that each have one style throughout.
   * Set it to plain objects with a `content` and style properties, which
   * then make the whole text.
   */
  get runs(): TextRange[] {
    return this._getRuns().map(run => new TextRange(this, run.start, run.end))
  }

  set runs(runs: (TextRange | Record<string, any>)[]) {
    const objects = runs.map(run =>
      run instanceof TextRange ? run.toJSON() : run
    )
    this.content = objects.map(run => run.content || '').join('')
    this._runs = objects
      .map(run => {
        // Style#set() takes only the style properties, not the content:
        const style = new Style(this._runs[0].style, this)
        style.set(run)
        return { length: (run.content || '').length, style }
      })
      .filter(run => run.length > 0)
    if (!this._runs.length) {
      this._runs = [{ length: 0, style: new Style(null, this) }]
    }
    this._changed(Change.CONTENT)
  }

  // The runs, with the neighbors that share a style joined:
  _getRuns(): { start: number; end: number; style: Style }[] {
    const runs = this._runs
    const joined = []
    for (let i = 0, l = runs.length, start = 0, end = 0; i < l; i++) {
      const run = runs[i]
      const next = runs[i + 1]
      end += run.length
      if (!next || !run.style.equals(next.style)) {
        joined.push({ start, end, style: run.style })
        start = end
      }
    }
    return joined
  }

  /**
   * The paragraphs of the text, without their line breaks. Set it to plain
   * objects with paragraph style properties, one per paragraph.
   */
  get paragraphs(): TextRange[] {
    const ranges = []
    const breaks = /\r\n|\n|\r/g
    const content = this._content
    let start = 0
    let match
    while ((match = breaks.exec(content))) {
      ranges.push(new TextRange(this, start, match.index))
      start = match.index + match[0].length
    }
    ranges.push(new TextRange(this, start, content.length))
    return ranges
  }

  set paragraphs(paragraphs: (TextRange | Record<string, any>)[]) {
    const styles = this._paragraphs
    const keys = this._paragraphKeys
    for (
      let i = 0, l = Math.min(paragraphs.length, styles.length);
      i < l;
      i++
    ) {
      const paragraph = paragraphs[i]
      const style = styles[i]
      for (const key in keys) {
        const value = paragraph[key]
        if (value !== undefined) {
          style[key] = value
        }
      }
    }
  }

  /**
   * The words of the text, as the browser finds them (Intl.Segmenter), or
   * else separated by white space.
   */
  get words(): TextRange[] {
    return this.#segment('word', /\S+/g)
  }

  /**
   * The letters of the text, each as readers see one (a grapheme: an emoji,
   * or a letter with its accents), spaces and punctuation included.
   */
  get letters(): TextRange[] {
    return this.#segment('grapheme', /[\s\S]/g)
  }

  // The letters for laying out, kept until the content changes:
  _getLetters(): TextRange[] {
    if (this.#lettersOf !== this._content) {
      this.#letters = this.letters
      this.#lettersOf = this._content
    }
    return this.#letters
  }

  #segment(granularity: 'word' | 'grapheme', pattern: RegExp): TextRange[] {
    const content = this._content
    const ranges = []
    const Segmenter = typeof Intl !== 'undefined' && Intl.Segmenter
    if (Segmenter) {
      const segments = new Segmenter(undefined, { granularity }).segment(
        content
      )
      const iterator = segments[Symbol.iterator]()
      let step
      while (!(step = iterator.next()).done) {
        const segment = step.value
        if (granularity !== 'word' || segment.isWordLike) {
          ranges.push(
            new TextRange(
              this,
              segment.index,
              segment.index + segment.segment.length
            )
          )
        }
      }
    } else {
      let match
      while ((match = pattern.exec(content))) {
        ranges.push(
          new TextRange(this, match.index, match.index + match[0].length)
        )
      }
    }
    return ranges
  }

  static {
    Object.assign(this.prototype, {
      _paragraphKeys: {
        justification: true,
        justifyLast: true,
        justifySpacing: true,
        startIndent: true,
        endIndent: true,
        firstLineIndent: true,
        spaceBefore: true,
        spaceAfter: true,
        hyphenation: true,
        composer: true,
        lineWrap: true,
        tabs: true,
        direction: true
      },
      _itemKeys: {
        fillRule: true,
        strokeScaling: true,
        shadowColor: true,
        shadowBlur: true,
        shadowOffset: true,
        selectedColor: true
      }
    })
  }
}
