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
  Base,
  Change,
  Color,
  Group,
  Point,
  TextItem,
  TextRange,
  TextStory,
  equals,
  inject,
  paper
} from '../internal.ts'
import type { PointLike } from '../basic/Point.ts'
import type { ColorLike } from './Color.ts'
import type { Project } from '../item/Project.ts'
import type { View } from '../view/View.ts'

// Defaults for items without text-styles (PathItem, Shape, Raster, ...):
const itemDefaults = {
  // Paths
  fillColor: null,
  fillRule: 'nonzero',
  strokeColor: null,
  strokeWidth: 1,
  strokeCap: 'butt',
  strokeJoin: 'miter',
  strokeScaling: true,
  miterLimit: 10,
  dashOffset: 0,
  dashArray: [],
  paintOrder: 'fill',
  // Shadows
  shadowColor: null,
  shadowBlur: 0,
  shadowOffset: new Point(),
  // Selection
  selectedColor: null
}

// Defaults for Group, Layer and Project (anything item that allows nesting
// needs to be able to pass down text styles as well):
const groupDefaults = {
  ...itemDefaults,
  // Characters
  fontFamily: 'sans-serif',
  fontWeight: 'normal',
  fontStyle: 'normal',
  fontSize: 12,
  fontVariations: null,
  lineHeight: 'auto',
  letterTracking: 0,
  letterKerning: null,
  baselineShift: 0,
  baselinePosition: 'normal',
  letterScaling: 1,
  letterRotation: 0,
  capitals: 'normal',
  underline: false,
  strikethrough: false,
  features: null,
  // Paragraphs
  justification: 'left',
  justifyLast: 'left',
  justifySpacing: null,
  startIndent: 0,
  endIndent: 0,
  firstLineIndent: 0,
  spaceBefore: 0,
  spaceAfter: 0,
  hyphenation: false,
  composer: 'paragraph',
  lineWrap: 'normal',
  tabs: null,
  direction: null
}

// Defaults for TextItem (override default fillColor to black):
const textDefaults = {
  ...groupDefaults,
  fillColor: new Color() // black
}

const flags = {
  strokeWidth: Change.STROKE,
  strokeCap: Change.STROKE,
  strokeJoin: Change.STROKE,
  // The dashes of strokes are their geometry too, see PathItem#dash():
  dashArray: Change.STROKE,
  dashOffset: Change.STROKE,
  // strokeScaling can change the coordinates of cached path items
  strokeScaling: Change.STROKE | Change.GEOMETRY,
  miterLimit: Change.STROKE
}
for (const key in groupDefaults) {
  // All text properties but the decorations change the layout:
  if (
    !(key in itemDefaults) &&
    key !== 'underline' &&
    key !== 'strikethrough'
  ) {
    flags[key] = Change.GEOMETRY
  }
}

// What a style belongs to: an item, a text story or a text range.
interface StyleOwner {
  _project?: Project
  _changed(flags: number): void
  _getStyles(style: Style, key: string, setting?: boolean): Style[]
}

// Inject style getters and setters into the Item class, which redirect calls
// to the linked style object.
export function defineStyleAccessors(ctor: { prototype: object }) {
  for (const key of Style.keys) {
    inject(ctor.prototype, {
      get [key]() {
        return this._style._get(key)
      },
      set [key](value: any) {
        this._style._set(key, value)
      }
    })
  }
}

/**
 * Style is used for changing the visual styles of items
 * contained within a Paper.js project and is returned by
 * {@link Item#style} and {@link Project#currentStyle}.
 *
 * All properties of Style are also reflected directly in {@link Item},
 * i.e.: {@link Item#fillColor}.
 *
 * Styles set on a {@link Group} or {@link Layer} are applied to the children
 * that it contains at that moment. Items added to it later do not receive them.
 *
 * To set multiple style properties in one go, you can pass an object to
 * {@link Item#style}. This is a convenient way to define a style once and
 * apply it to a series of items:
 *
 * @classexample {@paperscript} // Styling paths
 *
 * var path = Path.circle(new Point(80, 50), 30);
 * path.style = {
 *     fillColor: new Color(1, 0, 0),
 *     strokeColor: 'black',
 *     strokeWidth: 5
 * };
 *
 * @classexample {@paperscript} // Styling text items
 * var text = new PointText(view.center);
 * text.content = 'Hello world.';
 * text.style = {
 *     fontFamily: 'Courier New',
 *     fontWeight: 'bold',
 *     fontSize: 20,
 *     fillColor: 'red',
 *     justification: 'center'
 * };
 *
 * @classexample {@paperscript} // Styling groups
 * var path1 = Path.circle({
 *     center: [100, 50],
 *     radius: 30
 * });
 *
 * var path2 = Path.rectangle({
 *     from: [170, 20],
 *     to: [230, 80]
 * });
 *
 * var group = new Group(path1, path2);
 *
 * // All styles set on a group are automatically
 * // set on the current children of the group:
 * group.style = {
 *     strokeColor: 'black',
 *     dashArray: [4, 10],
 *     strokeWidth: 4,
 *     strokeCap: 'round'
 * };
 */
export class Style extends Base {
  /**
   * The names of all style properties.
   *
   * @private
   */
  static keys = Object.keys(groupDefaults)

  declare _scriptSize: number
  declare _scriptShift: number
  // We keep values in a separate object that we can iterate over.
  _values: Record<string, any> = {}
  _defaults: Record<string, any>
  #owner: StyleOwner
  #project: Project

  // DOCS: why isn't the example code showing up?
  /**
   * Style objects don't need to be created directly. Just pass an object to
   * {@link Item#style} or {@link Project#currentStyle}, it will be converted
   * to a Style object internally.
   *
   * @param style
   */
  constructor(
    style?: object,
    _owner?: StyleOwner,
    _project?: Project
  ) {
    super()
    this.#owner = _owner
    this.#project = _owner?._project ?? _project ?? paper.project
    // Use different defaults based on the owner
    this._defaults =
      !_owner || _owner instanceof Group
        ? groupDefaults
        : (
              _owner instanceof TextItem ||
              _owner instanceof TextStory ||
              _owner instanceof TextRange
            )
          ? textDefaults
          : itemDefaults
    if (style) {
      this.set(style)
    }
  }

  // The value that all styles share for key, or undefined if they differ:
  static merge(styles: Style[], key: string): any {
    let value: any
    for (let i = 0; i < styles.length; i++) {
      const other = styles[i][key]
      if (!i) {
        value = other
      } else if (!equals(value, other)) {
        return undefined
      }
    }
    return value
  }

  static _apply(styles: Style[], key: string, value: any) {
    for (const style of styles) {
      style[key] = value
    }
  }

  set(style: object): this {
    // If the passed style object is also a Style, clone its cloneable fields
    // rather than simply copying them.
    const isStyle = style instanceof Style
    // Use the other style's _values object for iteration
    const values = isStyle ? style._values : style
    if (values) {
      for (const key in values) {
        if (key in this._defaults) {
          const value = values[key]
          // Delegate to setter, so Group styles work too.
          this[key] = value && isStyle && value.clone ? value.clone() : value
        }
      }
    }
    return this
  }

  // Style values are handled like this:
  // - They are all stored in _values, which starts empty, with a fallback on
  //   _defaults in _get().
  // - Only the styles that are explicitly set on the object get defined in
  //   _values.
  // - Color values are not stored as converted colors immediately. The raw
  //   value is stored, and conversion only happens in _get().
  _set(key: string, value: any) {
    const owner = this.#owner
    // The styles the owner stands for, as a Group its children's:
    const styles = owner?._getStyles(this, key, true)
    if (styles) {
      Style._apply(styles, key, value)
    }
    // Always store selectedColor in item _values to make sure that group
    // selected bounds and position color is coherent whether it has children
    // or not when the value is set.
    if ((key === 'selectedColor' || !styles) && key in this._defaults) {
      const old = this._values[key]
      if (old !== value) {
        if (/Color$/.test(key)) {
          // The old value may be a native string or other color description
          // that wasn't coerced to a color object yet
          if (old instanceof Color) {
            Color._setOwner(old, null)
            old._canvasStyle = null
          }
          if (value instanceof Color) {
            // NOTE: If value is not a Color, it is only converted and cloned
            // in _get() further down.
            value = Color._setOwner(
              value,
              owner,
              // Only provide a key for the owner to set the color again if the
              // style is to be applied to the children:
              styles && key
            )
          }
        }
        // NOTE: We do not convert the values to Colors here. This only happens
        // once _get() is called.
        this._values[key] = value
        // Notify the owner of the style change. STYLE is always set,
        // additional flags come from flags, as used for STROKE:
        owner?._changed(flags[key] || Change.STYLE)
      }
    }
  }

  _get(key: string, dontMerge?: boolean): any {
    let value: any
    const owner = this.#owner
    const styles = owner?._getStyles(this, key)
    const isColor = /Color$/.test(key)
    // If true is passed for dontMerge, don't merge children styles.
    if (styles && !dontMerge) {
      value = Style.merge(styles, key)
    } else if (key in this._defaults) {
      value = this._values[key]
      if (value === undefined) {
        value = this._defaults[key]
        // Clone defaults if available:
        if (value && value.clone) {
          value = value.clone()
        }
      } else {
        const ctor = isColor ? Color : key === 'shadowOffset' ? Point : null
        if (ctor && value != null && value.constructor !== ctor) {
          // Convert to a Color / Point, and store the result of the
          // conversion.
          this._values[key] = value = new ctor(value)
        }
      }
    }
    if (value && isColor) {
      // Color._setOwner() may clone the color if it already has a different
      // owner (e.g. resulting from `childValue` above). Only provide a key for
      // the owner to set the color again if the style is to be applied to the
      // children:
      value = Color._setOwner(value, owner, styles && key)
    }
    return value
  }

  equals(style: any): boolean {
    // Since we're dealing with defaults, loop through style values in both
    // objects and compare with default fall-back. But in the secondary pass
    // only check against keys that weren't already in the first object:
    function compare(style1: Style, style2: Style, secondary?: boolean) {
      const values1 = style1._values
      const values2 = style2._values
      const defaults2 = style2._defaults
      for (const key in values1) {
        const value1 = values1[key]
        const value2 = values2[key]
        if (
          !(secondary && key in values2) &&
          !equals(value1, value2 === undefined ? defaults2[key] : value2)
        ) {
          return false
        }
      }
      return true
    }

    return (
      style === this || (
        style instanceof Style &&
        compare(this, style) &&
        compare(style, this, true)
      )
    )
  }

  _dispose() {
    for (const color of [this.fillColor, this.strokeColor, this.shadowColor]) {
      if (color) {
        color._canvasStyle = null
      }
    }
  }

  // DOCS: Style#hasFill()
  hasFill(): boolean {
    const color = this.fillColor
    return color?.alpha > 0
  }

  // DOCS: Style#hasStroke()
  hasStroke(): boolean {
    const color = this.strokeColor
    return color?.alpha > 0 && this.strokeWidth > 0
  }

  // DOCS: Style#hasShadow()
  hasShadow(): boolean {
    const color = this.shadowColor
    // In order to draw a shadow, we need either a shadow blur or an offset, or
    // both.
    return (
      color?.alpha > 0 &&
      (this.shadowBlur > 0 || !this.shadowOffset.isZero())
    )
  }

  /**
   * The view that this style belongs to.
   */
  get view(): View {
    return this.#project._view
  }

  // The font as canvas takes it:
  _getCanvasFont(): string {
    let fontSize: any = this.fontSize
    const { fontStyle } = this
    // CSS reads unquoted families only as identifiers, which can't start with
    // digits, so quote all but single words and the ones that are quoted
    // already:
    const families = this.fontFamily.split(',').map((family: string) => {
      family = family.trim()
      return /^(["'].*|[a-z-]+)$/i.test(family)
        ? family
        : `"${family.replace(/["\\]/g, '\\$&')}"`
    })
    // Superscripts and subscripts are set smaller:
    if (this.baselinePosition !== 'normal' && !isNaN(fontSize)) {
      fontSize *= this._scriptSize
    }
    // To prevent an obscure iOS 7 crash, we have to convert the size to a
    // string first before passing it to the regular expression.
    // The following nonsensical statement would also prevent the bug,
    // proving that the issue is not the regular expression itself, but
    // something deeper down in the optimizer:
    // `if (size === 0) size = 0;`
    return (
      (fontStyle !== 'normal' ? fontStyle + ' ' : '') +
      (this.capitals === 'small' ? 'small-caps ' : '') +
      this.fontWeight +
      ' ' +
      fontSize +
      (/[a-z]/i.test(fontSize + '') ? ' ' : 'px ') +
      families.join(', ')
    )
  }

  // The letter tracking as canvas takes it: in thousandths of an em, which
  // canvas resolves through the font of the context:
  _getCanvasLetterSpacing(): string {
    return `${this.letterTracking / 1000}em`
  }

  // The font size in pixels, which it can be given in other units:
  _getFontSize(): number {
    const fontSize: any = this.fontSize
    return /pt|em|%|px/.test(fontSize)
      ? this.view.getPixelSize(fontSize)
      : fontSize
  }

  // The line height in pixels: automatic ('auto', 1.2, or another factor) of
  // the font size, or fixed, with units as the font size takes them:
  _getLineHeight(): number {
    const { lineHeight } = this
    return lineHeight === 'auto'
      ? 1.2 * this._getFontSize()
      : typeof lineHeight === 'string'
        ? this.view.getPixelSize(lineHeight)
        : lineHeight * this._getFontSize()
  }

  static {
    Object.assign(this.prototype, {
      // The size of superscripts and subscripts, and how far they move, of
      // the font size:
      _scriptSize: 0.583,
      _scriptShift: 0.333
    })
    // Iterate over groupDefaults to inject getters / setters, to cover all
    // properties
    for (const key of Style.keys) {
      inject(this.prototype, {
        get [key]() {
          return this._get(key)
        },
        set [key](value: any) {
          this._set(key, value)
        }
      })
    }
  }
}

/**
 * The style properties, which Style, Item and TextRange have as accessors,
 * see defineStyleAccessors().
 */
export interface StyleProperties {
  /**
   * {@grouptitle Stroke Style}
   *
   * The color of the stroke.
   *
   *
   * @example {@paperscript}
   * // Setting the stroke color of a path:
   *
   * // Create a circle shaped path at { x: 80, y: 50 }
   * // with a radius of 35:
   * var circle = Path.circle(new Point(80, 50), 35);
   *
   * // Set its stroke color to RGB red:
   * circle.strokeColor = new Color(1, 0, 0);
   */
  get strokeColor(): Color
  set strokeColor(color: ColorLike)

  /**
   * The width of the stroke.
   *
   * @default 1
   *
   * @example {@paperscript}
   * // Setting an item's stroke width:
   *
   * // Create a circle shaped path at { x: 80, y: 50 }
   * // with a radius of 35:
   * var circle = Path.circle(new Point(80, 50), 35);
   *
   * // Set its stroke color to black:
   * circle.strokeColor = 'black';
   *
   * // Set its stroke width to 10:
   * circle.strokeWidth = 10;
   */
  strokeWidth: number

  /**
   * The shape to be used at the beginning and end of open {@link Path} items,
   * when they have a stroke.
   *
   * @values 'round', 'square', 'butt'
   * @default 'butt'
   *
   * @example {@paperscript height=200}
   * // A look at the different stroke caps:
   *
   * var line = new Path(new Point(80, 50), new Point(420, 50));
   * line.strokeColor = 'black';
   * line.strokeWidth = 20;
   *
   * // Select the path, so we can see where the stroke is formed:
   * line.selected = true;
   *
   * // Set the stroke cap of the line to be round:
   * line.strokeCap = 'round';
   *
   * // Copy the path and set its stroke cap to be square:
   * var line2 = line.clone();
   * line2.position.y += 50;
   * line2.strokeCap = 'square';
   *
   * // Make another copy and set its stroke cap to be butt:
   * var line2 = line.clone();
   * line2.position.y += 100;
   * line2.strokeCap = 'butt';
   */
  strokeCap: string

  /**
   * The shape to be used at the segments and corners of {@link Path} items
   * when they have a stroke.
   *
   * @values 'miter', 'round', 'bevel'
   * @default 'miter'
   *
   * @example {@paperscript height=120}
   * // A look at the different stroke joins:
   * var path = new Path();
   * path.add(new Point(80, 100));
   * path.add(new Point(120, 40));
   * path.add(new Point(160, 100));
   * path.strokeColor = 'black';
   * path.strokeWidth = 20;
   *
   * // Select the path, so we can see where the stroke is formed:
   * path.selected = true;
   *
   * var path2 = path.clone();
   * path2.position.x += path2.bounds.width * 1.5;
   * path2.strokeJoin = 'round';
   *
   * var path3 = path2.clone();
   * path3.position.x += path3.bounds.width * 1.5;
   * path3.strokeJoin = 'bevel';
   */
  strokeJoin: string

  /**
   * Specifies whether the stroke is to be drawn taking the current affine
   * transformation into account (the default behavior), or whether it should
   * appear as a non-scaling stroke. On text, non-scaling strokes are exact for
   * uniform scaling only, as the glyphs are always stroked through the
   * transformation.
   *
   * @default true
   */
  strokeScaling: boolean

  /**
   * The dash offset of the stroke.
   *
   * @default 0
   */
  dashOffset: number

  /**
   * Specifies an array containing the dash and gap lengths of the stroke.
   *
   * @example {@paperscript}
   * var path = Path.circle(new Point(80, 50), 40);
   * path.strokeWidth = 2;
   * path.strokeColor = 'black';
   *
   * // Set the dashed stroke to [10pt dash, 4pt gap]:
   * path.dashArray = [10, 4];
   *
   * @default []
   */
  dashArray: number[]

  /**
   * The miter limit of the stroke. When two line segments meet at a sharp
   * angle and miter joins have been specified for {@link #strokeJoin}, it is
   * possible for the miter to extend far beyond the {@link #strokeWidth} of
   * the path. The miterLimit imposes a limit on the ratio of the miter length
   * to the {@link #strokeWidth}.
   *
   * @default 10
   */
  miterLimit: number

  /**
   * The order in which the fill and the stroke are painted, as in SVG's
   * `paint-order`, named after what is painted first: `'fill'` paints the
   * fill first, `'stroke'` paints the stroke first, so the fill covers its
   * inner half.
   *
   * @values 'fill', 'stroke'
   * @default 'fill'
   *
   * @example {@paperscript}
   * var text = new PointText({
   *     point: [20, 70],
   *     content: 'Paper',
   *     fontSize: 50,
   *     fillColor: 'white',
   *     strokeColor: 'black',
   *     strokeWidth: 8,
   *     strokeJoin: 'round'
   * });
   *
   * // Paint the stroke behind the fill:
   * text.paintOrder = 'stroke';
   */
  paintOrder: string

  /**
   * {@grouptitle Fill Style}
   *
   * The fill color.
   *
   *
   * @example {@paperscript}
   * // Setting the fill color of a path to red:
   *
   * // Create a circle shaped path at { x: 80, y: 50 }
   * // with a radius of 35:
   * var circle = Path.circle(new Point(80, 50), 35);
   *
   * // Set the fill color of the circle to RGB red:
   * circle.fillColor = new Color(1, 0, 0);
   */
  get fillColor(): Color
  set fillColor(color: ColorLike)

  /**
   * The fill-rule with which the shape gets filled. Please note that only
   * modern browsers support fill-rules other than `'nonzero'`.
   *
   * @values 'nonzero', 'evenodd'
   * @default 'nonzero'
   */
  fillRule: string

  /**
   * {@grouptitle Shadow Style}
   *
   * The shadow color.
   *
   *
   * @example {@paperscript}
   * // Creating a circle with a black shadow:
   *
   * var circle = Path.circle({
   *     center: [80, 50],
   *     radius: 35,
   *     fillColor: 'white',
   *     // Set the shadow color of the circle to RGB black:
   *     shadowColor: new Color(0, 0, 0),
   *     // Set the shadow blur radius to 12:
   *     shadowBlur: 12,
   *     // Offset the shadow by { x: 5, y: 5 }
   *     shadowOffset: new Point(5, 5)
   * });
   */
  get shadowColor(): Color
  set shadowColor(color: ColorLike)

  /**
   * The shadow's blur radius.
   *
   * @default 0
   */
  shadowBlur: number

  /**
   * The shadow's offset.
   *
   * @default 0
   */
  get shadowOffset(): Point
  set shadowOffset(point: PointLike)

  /**
   * {@grouptitle Selection Style}
   *
   * The color the item is highlighted with when selected. If the item does
   * not specify its own color, the color defined by its layer is used instead.
   */
  get selectedColor(): Color
  set selectedColor(color: ColorLike)

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
}

// The members defined at runtime rather than in the class body:
export interface Style extends StyleProperties {}
