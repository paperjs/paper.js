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

import { Change, Item, SymbolDefinition } from '../internal.ts'
import type { PointLike } from '../basic/Point.ts'
import type { Point } from '../basic/Point.ts'
import type { Matrix } from '../basic/Matrix.ts'
import type { Rectangle } from '../basic/Rectangle.ts'
import type { BoundsOptions } from './Item.ts'
import type { HitResult } from './HitResult.ts'

/**
 * A symbol item represents an instance of a symbol which has been placed in a
 * Paper.js project. All instances share the symbol's definition, which they
 * draw as it is: styles set on a symbol item don't reach the items of the
 * definition, unlike `<use>` elements in SVG.
 */
export class SymbolItem extends Item {
  // Declared by Item, which reads it:
  declare _definition: SymbolDefinition

  /**
   * Creates a new symbol item.
   *
   * @param definition the definition to place or an item to place as a
   *     symbol
   * @param point the center point of the placed symbol
   *
   * @example {@paperscript split=true height=240}
   * // Placing 100 instances of a symbol:
   * // Create a star shaped path at {x: 0, y: 0}:
   * var path = new Path.Star({
   *     center: new Point(0, 0),
   *     points: 6,
   *     radius1: 5,
   *     radius2: 13,
   *     fillColor: 'white',
   *     strokeColor: 'black'
   * });
   *
   * // Create a symbol definition from the path:
   * var definition = new SymbolDefinition(path);
   *
   * // Place 100 instances of the symbol:
   * for (var i = 0; i < 100; i++) {
   *     // Place an instance of the symbol in the project:
   *     var instance = new SymbolItem(definition);
   *
   *     // Move the instance to a random position within the view:
   *     instance.position = Point.random() * view.size;
   *
   *     // Rotate the instance by a random amount between
   *     // 0 and 360 degrees:
   *     instance.rotate(Math.random() * 360);
   *
   *     // Scale the instance between 0.25 and 1:
   *     instance.scale(0.25 + Math.random() * 0.75);
   * }
   */
  constructor(definition: SymbolDefinition | Item, point?: PointLike)
  /**
   * Creates a new symbol item from the properties described by an object
   * literal.
   *
   * @param object an object containing the properties to be set on the
   *     symbol item
   */
  constructor(object: object)
  constructor(definition: SymbolDefinition | Item | object, point?: PointLike) {
    super()
    // Support two forms of item initialization: Passing one object literal
    // describing all the different properties to be set, or a symbol and a
    // point where it should be placed. If _initialize can set properties
    // through object literal, we're done. Otherwise we need to set symbol
    // from definition.
    if (!this._initialize(definition, point)) {
      this.definition =
        definition instanceof SymbolDefinition
          ? definition
          : new SymbolDefinition(definition as Item)
    }
  }

  _equals(item: Item): boolean {
    // TODO: Compare position too!
    return this._definition === item._definition
  }

  copyContent(source: this) {
    this.definition = source._definition
  }

  /**
   * The symbol definition that the placed symbol refers to.
   */
  get definition(): SymbolDefinition {
    return this._definition
  }

  set definition(definition: SymbolDefinition) {
    this._definition = definition
    this._changed(Change.GEOMETRY)
  }

  isEmpty(): boolean {
    return this._definition._item.isEmpty()
  }

  _getBounds(
    matrix: Matrix,
    options: BoundsOptions
  ): { rect: Rectangle; nonscaling: boolean } {
    const item = this._definition._item
    // Redirect the call to the definition item to calculate the bounds.
    return item._getCachedBounds(item._matrix.prepended(matrix), options)
  }

  _hitTestSelf(
    point: Point,
    options: Record<string, any>,
    viewMatrix?: Matrix
  ): HitResult | null {
    // We need to call definition item hit test with `options.all = false`,
    // as otherwise it would populate the array with its own matches.
    // Instead we want only returning one match per symbol-item, see #1680
    // The filters apply to the symbol-item, not to the definition's items:
    const res = this._definition._item._hitTest(
      point,
      Object.assign(Object.create(options), {
        all: false,
        match: null,
        class: null,
        type: null
      }),
      viewMatrix
    )
    // TODO: When the symbol's definition is a path, should hitResult
    // contain information like HitResult#curve?
    if (res) {
      res.item = this
    }
    return res
  }

  _draw(ctx: CanvasRenderingContext2D, param: any) {
    // The definition's item is shared by all its symbol items, so don't let
    // them set its global matrix (#1684):
    this._definition._item.draw(
      ctx,
      Object.assign(Object.create(param), { updateMatrix: false })
    )
  }

  /**
   * Replaces the symbol item with a copy of its definition's item, which
   * keeps the symbol item's appearance: its matrix is applied to the copy,
   * its opacity, visibility, blend mode and other attributes are combined
   * with the copy's, and its name, data and selection are passed on.
   *
   * @return the copy of the definition's item, or `null` if the symbol item
   *     has no parent
   */
  embed(): Item | null {
    if (!this._parent) {
      return null
    }
    const item = this._definition._item.clone(false)
    // The copy applies the matrix to its content or its own matrix,
    // depending on its applyMatrix, as in Group#ungroup():
    item.transform(this._matrix)
    // Both items' opacities and visibilities apply when drawn, but only
    // one blend mode can, the symbol item's if it has one:
    item.opacity = item._opacity * this._opacity
    item.visible = item._visible && this._visible
    item.locked = item._locked || this._locked
    item.guide = item._guide || this._guide
    if (this._blendMode !== 'normal') {
      item.blendMode = this._blendMode
    }
    item.clipMask = this._clipMask
    item.selected = this.selected
    if (this._data) {
      item._data = { ...this._data }
    }
    if (this._name) {
      item.name = this._name
    }
    return this.replaceWith(item) ? item : null
  }

  static {
    Object.assign(this.prototype, {
      _applyMatrix: false,
      _canApplyMatrix: false,
      // SymbolItem uses strokeBounds for bounds
      _boundsOptions: { stroke: true },
      _serializeFields: {
        ...Item.prototype._serializeFields,
        definition: null
      }
    })
  }
}
