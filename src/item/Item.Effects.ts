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
  Effect,
  EffectInstance,
  Item,
  Matrix,
  inject,
  splice
} from '../internal.ts'
import type { Rectangle } from '../basic/Rectangle.ts'

type EffectProps = {
  type: string
  parameters?: Record<string, any>
  visible?: boolean
}

// The live effects of items, see Item#effects. Their output is computed when
// it's first needed, and kept until the item, its content, its effects or the
// registered effects change, see Item#_changed().
inject(Item.prototype, {
  _effects: null,

  get effects(): EffectInstance[] {
    return this._effects ?? []
  },

  set effects(effects: EffectProps[] | null) {
    this.removeEffects()
    if (effects?.length) {
      this.insertEffects(0, effects)
    }
  },

  addEffect(this: Item, effect: EffectProps): EffectInstance {
    return this.insertEffect(this.effects.length, effect)
  },

  insertEffect(this: Item, index: number, effect: EffectProps): EffectInstance {
    return this.insertEffects(index, [effect])[0]
  },

  insertEffects(
    this: Item,
    index: number,
    effects: EffectProps[]
  ): EffectInstance[] {
    const list = (this._effects ??= [])
    const inserted = effects.map(effect => {
      const instance = new EffectInstance(effect)
      instance._item = this
      return instance
    })
    // Keeps the indices of the effects up to date:
    splice(list, inserted, index, 0)
    this._changed(Change.ATTRIBUTE)
    return inserted
  },

  removeEffect(this: Item, index: number): EffectInstance | null {
    return this.removeEffects(index, index + 1)[0] ?? null
  },

  removeEffects(this: Item, start = 0, end?: number): EffectInstance[] {
    const list = this._effects
    let removed = []
    if (list) {
      removed = splice(list, null, start, (end ?? list.length) - start)
      for (const instance of removed) {
        instance._item = instance._index = null
      }
      if (removed.length) {
        this._changed(Change.ATTRIBUTE)
      }
      if (!list.length) {
        this._effects = null
      }
    }
    return removed
  },

  _hasEffects(this: Item): boolean {
    return !!this._effects?.some(instance => instance._visible)
  },

  getEffectOutput(this: Item): Item | null {
    let output = this._effectOutput
    if (output === undefined || this._effectVersion !== Effect._version) {
      const art = this._hasEffects() && this._getEffectArt()
      output = art ? this._applyEffects(art) ?? art : null
      this._effectOutput = output
      this._effectVersion = Effect._version
    }
    return output
  },

  _applyEffects(this: Item, art: Item): Item | null {
    let output = null
    for (const instance of this._effects ?? []) {
      const { effect } = instance
      const onApply = effect?.onApply
      // Unknown effects leave the art as it is:
      if (instance._visible && onApply) {
        output ??= art
        output = onApply.call(instance, { art: output, item: this }) || output
      }
    }
    return output
  },

  _getEffectArt(this: Item): Item {
    const art = this.clone({ insert: false })
    art.effects = null
    art.matrix = new Matrix()

    function expand(source: Item, copy: Item) {
      const children = source._children
      if (children) {
        children.forEach((child, i) => {
          const output = child.getEffectOutput()
          if (output) {
            const transformed = output.clone({ insert: false })
            transformed.transform(child._matrix)
            copy._children[i].replaceWith(transformed)
          } else {
            expand(child, copy._children[i])
          }
        })
      }
    }

    expand(this, art)
    return art
  },

  get previewBounds(): Rectangle {
    return this.getPreviewBounds()
  },

  getPreviewBounds(this: Item, matrix?: Matrix): Rectangle {
    const output = this.getEffectOutput()
    const children = this._children
    // Without effects in it, it's the item's own:
    if (output || children && hasEffects(this)) {
      let bounds = null
      if (output) {
        bounds = output.strokeBounds
      } else {
        for (const child of children) {
          if (child._visible) {
            const rect = child.previewBounds
            bounds = bounds?.unite(rect) ?? rect
          }
        }
      }
      if (bounds) {
        return (
          matrix ? matrix.appended(this._matrix) : this._matrix
        )._transformBounds(bounds)
      }
    }
    return this.getStrokeBounds(matrix)
  }
})

// The members that Item doesn't declare itself:
declare module './Item.ts' {
  interface Item {
    /**
     * The live effects of the item, in the order in which they apply, as the
     * instances of the {@link Effect effects} that they use. They derive what
     * is drawn from the item without changing it: drawing draws their output,
     * and {@link #previewBounds} measures it, while hit testing,
     * {@link #bounds} and {@link #strokeBounds} stay with the item itself. It
     * is set to plain objects describing them, `{ type, parameters, visible }`,
     * with the `type` of the effect. Changing the returned array directly
     * isn't tracked, as with {@link Path#segments}.
     *
     * Paper.js has these effects, and {@link Effect} creates more:
     *
     * - `offset`: offsets the paths, see {@link PathItem#offset()}, with the
     *   parameters `distance` (`0`), `join` (`'miter'`) and `miterLimit`
     *   (`10`).
     * - `outline`: outlines the strokes of the paths as filled areas next to
     *   their fills, see {@link PathItem#outline()}, following their
     *   {@link Path#strokeProfile}.
     *
     * @example {@paperscript}
     * var path = new Path.Star({
     *     center: view.center,
     *     points: 5,
     *     radius1: 20,
     *     radius2: 40,
     *     strokeColor: 'black',
     *     strokeWidth: 8
     * });
     * path.effects = [
     *     { type: 'offset', parameters: { distance: 10, join: 'round' } },
     *     { type: 'outline' }
     * ];
     */
    get effects(): EffectInstance[]
    set effects(effects: EffectProps[] | null)

    /**
     * The bounds of what the item looks like with its effects, in the
     * coordinate space of its parent: of their output with its strokes, or of
     * its children's with their effects, and its {@link #strokeBounds} without
     * them, as Illustrator's "Use Preview Bounds".
     */
    readonly previewBounds: Rectangle

    /**
     * Returns the bounds of what the item looks like with its effects, as
     * {@link #previewBounds}, in the coordinate space that the matrix maps
     * to.
     *
     * @param matrix the matrix to transform the bounds with
     */
    getPreviewBounds(matrix?: Matrix): Rectangle

    /**
     * Returns what the item's visible effects make of it, in the item's own
     * coordinates, outside of the scene graph, or `null` if it has none. It is
     * kept until the item, its content, its effects or the registered effects
     * change, so changing it isn't tracked.
     *
     * @return the output of the effects
     */
    getEffectOutput(): Item | null

    _effects: EffectInstance[] | null

    // The version of the registered effects that #_effectOutput is from:
    _effectVersion: number

    /**
     * Adds an effect at the end of the item's effects.
     *
     * @param effect the plain object describing the effect
     * @return the added instance
     */
    addEffect(effect: EffectProps): EffectInstance

    /**
     * Inserts an effect into the item's effects at the given index.
     *
     * @param index the index at which to insert the effect
     * @param effect the plain object describing the effect
     * @return the inserted instance
     */
    insertEffect(index: number, effect: EffectProps): EffectInstance

    /**
     * Inserts effects into the item's effects at the given index.
     *
     * @param index the index at which to insert the effects
     * @param effects the plain objects describing the effects
     * @return the inserted instances
     */
    insertEffects(index: number, effects: EffectProps[]): EffectInstance[]

    /**
     * Removes the effect at the given index from the item's effects.
     *
     * @param index the index of the effect to remove
     * @return the removed instance, or `null`
     */
    removeEffect(index: number): EffectInstance | null

    /**
     * Removes the effects from the start index to the end index from the
     * item's effects, or all of them.
     *
     * @param [start=0] the index of the first effect to remove
     * @param [end=effects.length] the index after the last one
     * @return the removed instances
     */
    removeEffects(start?: number, end?: number): EffectInstance[]

    // Returns whether any of the item's effects are visible:
    _hasEffects(): boolean

    // Applies the visible effects to the art in turn, and returns what they
    // make of it, or null if none applied:
    _applyEffects(art: Item): Item | null

    // Returns a copy of the item for its effects to apply to, in its own
    // coordinates, with the effects of its content expanded and without its
    // own:
    _getEffectArt(): Item
  }
}

// Returns whether the item or its content have visible effects:
function hasEffects(item: Item): boolean {
  return (
    item._hasEffects() ||
    !!item._children?.some(child => hasEffects(child))
  )
}
