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
  Change,
  Effect,
  EffectInstance,
  Matrix,
  splice
} from '../internal.ts'
import type { Rectangle } from '../basic/Rectangle.ts'
import type { EffectProps, Item } from './Item.ts'

/**
 * The live effects of items, for `use(effects)` with `paper/core`, see the
 * `use()` function there.
 */
export const effects = {
  feature: {
    name: 'effects' as const,
    Effect,
    insertEffects,
    removeEffects,
    getEffectOutput,
    getPreviewBounds
  }
}

// NOTE: Documentation is in Item#insertEffects()
export function insertEffects(
  item: Item,
  index: number,
  effects: EffectProps[]
): EffectInstance[] {
  const list = (item._effects ??= [])
  const inserted = effects.map(effect => {
    const instance = new EffectInstance(effect)
    instance._item = item
    return instance
  })
  // Keeps the indices of the effects up to date:
  splice(list, inserted, index, 0)
  item._changed(Change.ATTRIBUTE)
  return inserted
}

// NOTE: Documentation is in Item#removeEffects()
export function removeEffects(
  item: Item,
  start = 0,
  end?: number
): EffectInstance[] {
  const list = item._effects
  let removed = []
  if (list) {
    removed = splice(list, null, start, (end ?? list.length) - start)
    for (const instance of removed) {
      instance._item = instance._index = null
    }
    if (removed.length) {
      item._changed(Change.ATTRIBUTE)
    }
    if (!list.length) {
      item._effects = null
    }
  }
  return removed
}

// NOTE: Documentation is in Item#getEffectOutput()
export function getEffectOutput(item: Item): Item | null {
  let output = item._effectOutput
  if (output === undefined || item._effectVersion !== Effect._version) {
    const art = item._hasEffects() && getEffectArt(item)
    output = art ? item._applyEffects(art) ?? art : null
    item._effectOutput = output
    item._effectVersion = Effect._version
  }
  return output
}

// Returns a copy of the item for its effects to apply to, in its own
// coordinates, with the effects of its content expanded and without its own.
// Drawing the item applies its opacity and blend mode, so the copy has none:
export function getEffectArt(item: Item): Item {
  const art = item.clone({ insert: false })
  art.effects = null
  art.matrix = new Matrix()
  art.opacity = 1
  art.blendMode = 'normal'

  function expand(source: Item, copy: Item) {
    const children = source._children
    for (let i = 0, l = children ? children.length : 0; i < l; i++) {
      const child = children[i]
      let output = getEffectOutput(child)
      if (output) {
        output = output.clone({ insert: false })
        output.transform(child._matrix)
        copy._children[i].replaceWith(output)
      } else {
        expand(child, copy._children[i])
      }
    }
  }

  expand(item, art)
  return art
}

// NOTE: Documentation is in Item#getPreviewBounds()
export function getPreviewBounds(item: Item, matrix?: Matrix): Rectangle {
  const output = getEffectOutput(item)
  const children = item._children
  // Without effects in it, it's the item's own:
  if (output || children && hasEffects(item)) {
    let bounds = null
    if (output) {
      bounds = output.strokeBounds
    } else {
      for (const child of children) {
        if (child._visible) {
          const rect = getPreviewBounds(child)
          bounds = bounds ? bounds.unite(rect) : rect
        }
      }
    }
    if (bounds) {
      return (
        matrix ? matrix.appended(item._matrix) : item._matrix
      )._transformBounds(bounds)
    }
  }
  return item.getStrokeBounds(matrix)
}

// Returns whether the item or its content have visible effects:
function hasEffects(item: Item): boolean {
  return (
    item._hasEffects() ||
    !!item._children?.some(child => hasEffects(child))
  )
}
