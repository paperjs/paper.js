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

import { serialize } from '../core/serialization.ts'
import { isPlainObject } from '../util/object.ts'
import type { PointLike } from '../basic/Point.ts'
import { ItemDefinition } from './ItemDefinition.ts'
import { SymbolItem } from './SymbolItem.ts'
import type { Item } from './Item.ts'
import type { Project } from './Project.ts'

/**
 * Symbols allow you to place multiple instances of an item in your project.
 * This can save memory, since all instances of a symbol simply refer to the
 * original item and it can speed up moving around complex objects, since
 * internal properties such as segment lists and gradient positions don't need
 * to be updated with every transformation.
 */
export class SymbolDefinition extends ItemDefinition {
  /**
   * Creates a Symbol definition.
   *
   * @param item the source item which is removed from the scene graph and
   *     becomes the symbol's definition.
   * @param dontCenter
   *
   * @example {@paperscript split=true height=240}
   * // Placing 100 instances of a symbol:
   * var path = new Path.Star(new Point(0, 0), 6, 5, 13);
   * path.style = {
   *     fillColor: 'white',
   *     strokeColor: 'black'
   * };
   *
   * // Create a symbol definition from the path:
   * var definition = new SymbolDefinition(path);
   *
   * // Place 100 instances of the symbol definition:
   * for (var i = 0; i < 100; i++) {
   *     // Place an instance of the symbol definition in the project:
   *     var instance = definition.place();
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
  constructor(item: Item, dontCenter?: boolean)
  /**
   * Creates a Symbol definition with the options that JSON passes.
   *
   * @param item the source item which is removed from the scene graph and
   *     becomes the symbol's definition.
   * @param options
   * @option [options.dontCenter=false] {Boolean} whether to leave the item
   *     where it is, instead of moving it to 0, 0
   * @option [options.name] {String} the name of the symbol
   */
  constructor(item: Item, options: { dontCenter?: boolean; name?: string })
  constructor(
    item?: Item,
    options?: boolean | { dontCenter?: boolean; name?: string }
  ) {
    super()
    // JSON passes the options of the definition instead, which can include
    // dontCenter:
    const { dontCenter, ...props } = isPlainObject(options)
      ? (options as { dontCenter?: boolean; name?: string })
      : { dontCenter: options as boolean }
    if (item) {
      this._setItem(item, dontCenter)
    }
    this.set(props)
  }

  _serialize(options: any, dictionary: any) {
    return dictionary.add(this, () => {
      const json: any[] = [this._item]
      const props: { dontCenter?: boolean; name?: string } = {}
      // Keep items that the definition didn't center in place:
      if (!this._item.position.isZero()) {
        props.dontCenter = true
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

  /**
   * Places in instance of the symbol in the project.
   *
   * @param position the position of the placed symbol
   */
  place(position?: PointLike): SymbolItem {
    return new SymbolItem(this, position)
  }

  /**
   * Returns a copy of the symbol, with a copy of its item and its name.
   */
  clone(): SymbolDefinition {
    // The copied item is already where this definition placed it:
    return new SymbolDefinition(this._item.clone(false), {
      dontCenter: true,
      name: this._name
    })
  }

  /**
   * Checks whether the symbol's definition is equal to the supplied symbol.
   *
   * @param symbol
   * @return {@true if they are equal}
   */
  equals(symbol: SymbolDefinition): boolean {
    return !!(symbol === this || symbol && this._item.equals(symbol._item))
  }

  static {
    // Move the item to 0, 0, so it's centered when placed:
    this.prototype._centerItem = true
  }
}

// The members that ItemDefinition defines:
export interface SymbolDefinition {
  /**
   * The project that this symbol belongs to.
   *
   * @readonly
   */
  project: Project

  /**
   * The name of the symbol.
   */
  get name(): string
  set name(name: string)

  /**
   * The item used as the symbol's definition.
   */
  get item(): Item
  set item(item: Item)
}
