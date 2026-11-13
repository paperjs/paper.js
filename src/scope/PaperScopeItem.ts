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

import { Emitter, paper, splice } from '../internal.ts'
import type { PaperScope } from './PaperScope.ts'
import type { View } from '../view/View.ts'

/**
 * A private base class for all classes that have lists and references in the
 * {@link PaperScope} ({@link Project}, {@link Tool}), so functionality can be
 * shared.
 *
 * @private
 */
export class PaperScopeItem extends Emitter {
  // The names of the scope's list and reference, as prototype defaults set by
  // the subclasses, e.g. 'projects' and 'project':
  declare _list: string
  declare _reference: string
  declare _scope: PaperScope
  declare _index: number

  /**
   * Creates a PaperScopeItem object.
   */
  constructor(activate?: boolean) {
    super()
    // Store reference to the currently active global paper scope:
    this._scope = paper
    // Push it onto this._scope[this._list] and set _index:
    this._index = this._scope[this._list].push(this) - 1
    // If the project has no active reference, activate this one
    if (activate || !this._scope[this._reference]) {
      this.activate()
    }
  }

  activate(): boolean {
    if (!this._scope) return false
    const previous = this._scope[this._reference]
    if (previous && previous !== this) {
      previous.emit('deactivate')
    }
    this._scope[this._reference] = this
    this.emit('activate', previous)
    return true
  }

  isActive(): boolean {
    return this._scope[this._reference] === this
  }

  get scope(): PaperScope {
    return this._scope
  }

  remove(): boolean {
    if (this._index == null) return false
    splice(this._scope[this._list], null, this._index, 1)
    // Clear the active reference if it was pointing to this:
    if (this._scope[this._reference] == this) {
      this._scope[this._reference] = null
      this.emit('deactivate')
    }
    this._scope = null
    return true
  }

  get view(): View {
    return this._scope.view
  }
}
