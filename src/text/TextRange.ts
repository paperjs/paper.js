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
  Base,
  Style,
  defineStyleAccessors,
  equals,
  inject,
  serialize
} from '../internal.ts'
import type { Line } from '../basic/Line.ts'
import type { Rectangle } from '../basic/Rectangle.ts'
import type { TextStory } from './TextStory.ts'

/**
 * A part of a {@link TextStory}'s content, from its {@link #start} to its
 * {@link #end}, whose style is that of its letters and paragraphs: read, a
 * property is the one they share, or `undefined`; set, it changes them. It
 * has the same style properties as items, e.g. `text.words[0].fontSize = 24`.
 * A range is a snapshot of two indices: changing styles never moves it, but
 * changing the content leaves ranges taken before out of date, as indices
 * into any string.
 *
 * @example {@paperscript}
 * var text = new PointText({
 *     point: [20, 50],
 *     content: 'Every word its size',
 *     fillColor: 'black'
 * });
 * text.words.forEach(function(word) {
 *     word.fontSize = 8 + word.content.length * 3;
 * });
 */
export class TextRange extends Base {
  _story: TextStory
  _start: number
  _end: number
  _style: Style
  // The lines of a text item have these too, see TextItem#lines:
  declare baseline?: Line
  declare bounds?: Rectangle

  constructor(story: TextStory, start: number, end: number) {
    super()
    const { length } = story._content
    this._story = story
    this._start = Math.max(0, Math.min(start, length))
    this._end = Math.max(this._start, Math.min(end, length))
    this._style = new Style(null, this)
  }

  /**
   * Sets the properties of the passed object literal on the range, e.g. its
   * style properties.
   *
   * @param props an object describing the properties to set
   */
  set(props: Record<string, any>): this {
    Object.assign(this, props)
    return this
  }

  /**
   * The story the range is part of.
   */
  get story(): TextStory {
    return this._story
  }

  /**
   * The index of the range's first character.
   */
  get start(): number {
    return this._start
  }

  /**
   * The index after the range's last character.
   */
  get end(): number {
    return this._end
  }

  /**
   * The content of the range.
   */
  get content(): string {
    return this._story._content.slice(this._start, this._end)
  }

  /**
   * The style of the range: of its characters, and of the paragraphs it
   * touches.
   */
  get style(): Style {
    return this._style
  }

  set style(style: Style | object) {
    this._style.set(style)
  }

  // The range's style stands for those of the text's runs and paragraphs
  // that it covers, see Style.merge() and Style.apply():
  _getStyles(style: Style, key: string, setting?: boolean): Style[] {
    return this._story._getRangeStyles(key, this._start, this._end, setting)
  }

  _changed(flags: number) {
    this._story._changed(flags)
  }

  // The range's content and its style properties that differ from the
  // defaults, and that it has throughout:
  toJSON(): Record<string, any> {
    const style = this._style
    const defaults = style._defaults
    const json: Record<string, any> = {
      start: this._start,
      end: this._end,
      content: this.content
    }
    for (const key in defaults) {
      const value = style[key]
      if (value !== undefined && !equals(value, defaults[key])) {
        json[key] = serialize(value)
      }
    }
    return json
  }

  toString(): string {
    return this.content
  }

  static {
    defineStyleAccessors(this)
    for (const key of ['runs', 'paragraphs', 'words', 'letters']) {
      inject(this.prototype, {
        // The story's runs, paragraphs, words or letters within the range,
        // clipped to it. An empty paragraph is within it where the range
        // holds its place:
        get [key]() {
          const story = this._story
          const start = this._start
          const end = this._end
          return story[key]
            .filter(
              range => (
                range._start < end && range._end > start || (
                  range._start === range._end &&
                  range._start >= start &&
                  range._start <= end
                )
              )
            )
            .map(
              range =>
                new TextRange(
                  story,
                  Math.max(range._start, start),
                  Math.min(range._end, end)
                )
            )
        }
      })
    }
  }
}

// The members defined at runtime rather than in the class body:
export interface TextRange {
  /**
   * The runs of the story within the range, clipped to it.
   */
  readonly runs: TextRange[]

  /**
   * The paragraphs of the story within the range, clipped to it. An empty
   * paragraph is within it where the range holds its place.
   */
  readonly paragraphs: TextRange[]

  /**
   * The words of the story within the range, clipped to it.
   */
  readonly words: TextRange[]

  /**
   * The letters of the story within the range, clipped to it.
   */
  readonly letters: TextRange[]
}
