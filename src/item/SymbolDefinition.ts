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
  ItemDefinition,
  SymbolItem,
  serialize
} from '../internal.ts'
import type { PointLike } from '../basic/Point.ts'
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
   * The item keeps its place: its coordinates are the symbol's own, and
   * {@link #place(position)} puts their origin at the position.
   *
   * @param item the source item which is removed from the scene graph and
   *     becomes the symbol's definition.
   *
   * @example {@paperscript split=true height=240}
   * // Placing 100 instances of a symbol:
   * var path = Path.star(new Point(0, 0), 6, 5, 13);
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
  constructor(item: Item)
  /**
   * Creates a Symbol definition with the properties that JSON passes.
   *
   * @param item the source item which is removed from the scene graph and
   *     becomes the symbol's definition.
   * @param props
   * @option [props.name] {String} the name of the symbol
   */
  constructor(item: Item, props: { name?: string })
  constructor(item?: Item, props?: { name?: string }) {
    super()
    if (item) {
      this._setItem(item)
    }
    this.set(props)
  }

  _serialize(options: any, dictionary: any) {
    return dictionary.add(this, () => {
      const json: any[] = [this._item]
      if (this._name) {
        json.push({ name: this._name })
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
    return new SymbolDefinition(this._item.clone(false), {
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
