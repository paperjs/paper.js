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
  Change,
  ChangeFlag,
  Item,
  getUID,
  paper
} from '../internal.ts'
import type { Project } from './Project.ts'

// The private base of SymbolDefinition and PatternDefinition, which hold an
// item outside of the scene graph that other items draw. The item refers back
// to its definition through Item#_symbol, which Item#_changed() notifies:
export class ItemDefinition extends Base {
  declare _name: string
  // Read by the dictionary of JSON and by Project:
  _id: number
  _item: Item
  project: Project

  // The subclasses set the item once their own fields exist, as setting it
  // calls #_changed():
  constructor() {
    super()
    this._id = getUID()
    this.project = paper.project
  }

  /**
   * Sets the properties of the passed object on the definition.
   *
   * @param props the properties to set
   */
  set(props: object): this {
    return Object.assign(this, props)
  }

  // Called whenever the definition's item changes:
  _changed(flags: number) {
    const { project } = this
    if (flags & ChangeFlag.GEOMETRY) {
      // Clear cached bounds of all items that this definition is linked to.
      Item._clearBoundsCache(this)
    }
    if (flags & ChangeFlag.APPEARANCE) {
      // Its items may be drawn in any buffered group:
      project._bufferVersion++
      project._changed(flags)
    }
    project._logChange('definition', this, flags)
  }

  get name(): string {
    return this._name
  }

  set name(name: string) {
    this._name = name || null
    this._changed(Change.ATTRIBUTE)
  }

  get item(): Item {
    return this._item
  }

  set item(item: Item) {
    this._setItem(item)
  }

  _setItem(item: Item) {
    // Make sure we're not stealing another definition's item
    const ownItem = item._symbol ? item.clone() : item
    // Remove previous item's reference to this definition
    if (this._item) {
      this._item._symbol = null
    }
    this._item = ownItem
    // Remove item from DOM, as it's embedded in the definition now.
    ownItem.remove()
    ownItem.selected = false
    ownItem._symbol = this
    this._changed(Change.GEOMETRY)
  }

  static {
    this.prototype._name = null
  }
}
