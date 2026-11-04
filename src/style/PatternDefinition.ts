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
  ChangeFlag,
  EPSILON,
  ItemDefinition,
  Matrix,
  Rectangle,
  Size,
  equals,
  getCanvas,
  serialize
} from '../internal.ts'
import type { RectangleLike } from '../basic/Rectangle.ts'
import type { SizeLike } from '../basic/Size.ts'
import type { Item } from '../item/Item.ts'
import type { Project } from '../item/Project.ts'

/**
 * A pattern definition repeats an item as the tile of pattern colors, which
 * fill and stroke items with it, see {@link Color#pattern}: a {@link Raster}
 * for image patterns, or any other item for vector patterns. As with symbol
 * definitions, the item is removed from the scene graph, and all pattern
 * colors that use the pattern share it, so they change along with it.
 *
 * @classexample {@paperscript height=200}
 * // A dotted pattern, filling and stroking a circle:
 * var dot = new Path.Circle({
 *     center: [5, 5],
 *     radius: 3,
 *     fillColor: 'red'
 * });
 *
 * // Repeat the dot every 10 points, with a gap of 2 points between the
 * // tiles of the stroke's pattern:
 * var pattern = new PatternDefinition(dot, {
 *     tile: new Rectangle(0, 0, 10, 10)
 * });
 * var spaced = new PatternDefinition(dot.clone(), {
 *     tile: new Rectangle(0, 0, 10, 10),
 *     spacing: 2
 * });
 *
 * var circle = new Path.Circle({
 *     center: view.center,
 *     radius: 70,
 *     fillColor: { pattern: pattern },
 *     strokeColor: {
 *         pattern: spaced,
 *         matrix: new Matrix().rotate(45)
 *     },
 *     strokeWidth: 20
 * });
 */
export class PatternDefinition extends ItemDefinition {
  // Read by the SVG export and the hosted items:
  _tile: Rectangle = null
  _spacing = new Size()
  // The tiles at each resolution that they're needed in, see #_toCanvasStyle():
  #canvases: Record<number, HTMLCanvasElement | OffscreenCanvas> = {}

  /**
   * Creates a pattern definition.
   *
   * @param item the item to repeat, which is removed from the scene graph and
   *     becomes the pattern's tile content
   * @param options
   * @option [options.tile] {Rectangle} the rectangle that is repeated, the
   *     bounds of the item by default
   * @option [options.spacing=0] {Size} the gap between the tiles
   * @option [options.name] {String} the name of the pattern
   */
  constructor(
    item?: Item,
    options?: { tile?: RectangleLike; spacing?: SizeLike; name?: string }
  ) {
    super()
    if (item) {
      this._setItem(item)
    }
    if (options) {
      this.set(options)
    }
  }

  _serialize(options: any, dictionary: any) {
    return dictionary.add(this, () => {
      const json: any[] = [this._item]
      const props: { tile?: Rectangle; spacing?: Size; name?: string } = {}
      // Leave out the options that are the defaults:
      if (this._tile) {
        props.tile = this._tile
      }
      if (!this._spacing.isZero()) {
        props.spacing = this._spacing
      }
      if (this._name) {
        props.name = this._name
      }
      if (Object.keys(props).length) {
        json.push(props)
      }
      return serialize(json, options, false, dictionary)
    })
  }

  _changed(flags: number) {
    super._changed(flags)
    // Draw the tiles again at each resolution that they're needed in:
    if (flags & ChangeFlag.APPEARANCE) {
      this.#canvases = {}
    }
  }

  /**
   * The rectangle that is repeated, in the coordinates of the pattern's item.
   *
   * @default the bounds of the pattern's item
   */
  get tile(): Rectangle {
    return this._tile || this._item.bounds
  }

  set tile(tile: RectangleLike | null) {
    this._tile = tile == null ? null : new Rectangle(tile)
    this._changed(Change.STYLE)
  }

  /**
   * The gap between the tiles, horizontally and vertically.
   *
   * @default 0
   */
  get spacing(): Size {
    return this._spacing
  }

  set spacing(spacing: SizeLike | number) {
    this._spacing = new Size(spacing)
    this._changed(Change.STYLE)
  }

  /**
   * Returns a copy of the pattern, with a copy of its item and its name.
   */
  clone(): PatternDefinition {
    return new PatternDefinition(this._item.clone(false), {
      tile: this._tile,
      spacing: this._spacing,
      name: this._name
    })
  }

  /**
   * Checks whether the pattern is equal to the supplied pattern.
   *
   * @param pattern
   * @return {@true if they are equal}
   */
  equals(pattern: PatternDefinition): boolean {
    return !!(
      pattern === this || (
        pattern &&
        this.className === pattern.className &&
        this._item.equals(pattern._item) &&
        equals(this._tile, pattern._tile) &&
        this._spacing.equals(pattern._spacing)
      )
    )
  }

  // Returns a CanvasPattern of the tiles, placed through the matrix from the
  // pattern's coordinates to those of the context. The tiles are drawn at
  // the context's resolution, rounded up to quarter octaves, so that items
  // at nearby scales share them. See Color#toCanvasStyle():
  _toCanvasStyle(
    ctx: CanvasRenderingContext2D,
    matrix: Matrix
  ): CanvasPattern | string {
    const transform = ctx.getTransform()
    const device = new Matrix(
      transform.a, transform.b,
      transform.c, transform.d,
      0, 0
    ).append(matrix)
    const scale = Math.max(
      Math.sqrt(device._a * device._a + device._b * device._b),
      Math.sqrt(device._c * device._c + device._d * device._d)
    )
    const level = Math.ceil(Math.log(scale) / Math.LN2 * 4 - EPSILON)
    const { tile } = this
    const cell = tile.size.add(this._spacing)
    const size = cell.multiply(Math.pow(2, level / 4)).ceil()
    if (!(size.width > 0 && size.height > 0)) {
      return 'rgba(0,0,0,0)'
    }
    let canvas = this.#canvases[level]
    if (!canvas) {
      // The tiles are kept for as long as the pattern doesn't change, so
      // they're never released to the canvas provider's pool, as with the
      // buffers of groups, see Item#draw():
      const { OffscreenCanvas } = globalThis
      canvas = this.#canvases[level] = OffscreenCanvas
        ? new OffscreenCanvas(size.width, size.height)
        : getCanvas(size)
      const tileCtx = canvas.getContext('2d') as CanvasRenderingContext2D
      const tileMatrix = new Matrix()
        .scale(size.divide(cell))
        .translate(tile.point.negate())
      tileMatrix.applyToContext(tileCtx)
      // Leave the spacing between the tiles empty:
      if (!this._spacing.isZero()) {
        tileCtx.beginPath()
        tileCtx.rect(tile.x, tile.y, tile.width, tile.height)
        tileCtx.clip()
      }
      // The item is shared by all colors of the pattern, so don't let them
      // set its global matrix, as in SymbolItem#_draw():
      this._item.draw(tileCtx, {
        matrices: [tileMatrix],
        updateMatrix: false
      })
    }
    const pattern = ctx.createPattern(canvas, 'repeat')
    const placement = matrix.appended(
      new Matrix().translate(tile.point).scale(cell.divide(size))
    )
    // Reuse the context's DOMMatrix, as node-canvas only takes its own:
    transform.a = placement._a
    transform.b = placement._b
    transform.c = placement._c
    transform.d = placement._d
    transform.e = placement._tx
    transform.f = placement._ty
    pattern.setTransform(transform)
    return pattern
  }

  /**
   * Returns the passed pattern if it is one already, or else a new pattern
   * that repeats the passed item.
   *
   * @param pattern
   */
  static from(pattern: PatternDefinition | Item): PatternDefinition {
    return pattern instanceof PatternDefinition
      ? pattern
      : new PatternDefinition(pattern)
  }
}

// The members that ItemDefinition defines:
export interface PatternDefinition {
  /**
   * The project that this pattern belongs to.
   *
   * @readonly
   */
  project: Project

  /**
   * The name of the pattern.
   */
  get name(): string
  set name(name: string)

  /**
   * The item that the pattern repeats. Unlike the items of symbols, it isn't
   * moved to 0, 0, so the tiles are at its own coordinates.
   */
  get item(): Item
  set item(item: Item)
}
