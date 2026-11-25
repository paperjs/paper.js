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
  CompoundPath,
  Group,
  Layer,
  PathItem,
  Shape,
  SymbolItem,
  expandStroke
} from '../internal.ts'
import type { Item } from './Item.ts'

export type ExpandOptions = {
  strokes?: boolean
  fills?: boolean
}

// Returns what replaces the item, expanded into plain items that draw the
// same, or the item itself, with its children expanded in place. See
// Item#expand():
export function expandItem(item: Item, options: ExpandOptions): Item {
  const { strokes, fills } = options
  let result = item
  // Layers can't be replaced, so they keep their own effects:
  if (item._hasEffects() && !(item instanceof Layer)) {
    // Items with effects have their output:
    result = getEffectReplacement(item)!
  } else if (item instanceof SymbolItem) {
    result = item._createEmbedded()
  } else if (item instanceof Shape) {
    result = item.toPath(false)
  } else if (item instanceof PathItem && !item._clipMask) {
    const isStroke = strokes && item.hasStroke()
    if (isStroke || fills && item.fillColor?.type === 'pattern') {
      // The items that replace the path draw its appearance once, as a whole:
      const path = item.clone({ insert: false })
      path.opacity = 1
      path.blendMode = 'normal'
      path.name = null
      path._data = null
      result = isStroke ? expandStroke(path) : expandFill(path)
      result._combineAppearance(item)
    }
  }
  if (result !== item) {
    // The result may hold more to expand, e.g. the pattern fill of a stroke's
    // outline, or symbols that effects placed:
    return expandItem(result, options)
  }
  // The children of compound paths only add to their parent's path:
  if (!(item instanceof CompoundPath)) {
    for (const child of [...(item._children ?? [])]) {
      const expanded = expandItem(child, options)
      if (expanded !== child) {
        child.replaceWith(expanded)
      }
    }
  }
  return item
}

// Returns a copy of the output of the item's effects, in the item's place and
// with its appearance, to replace it, or null if it has none. SVG export writes
// it, too:
export function getEffectReplacement(item: Item): Item | null {
  const output = item.getEffectOutput()?.clone({ insert: false })
  if (output) {
    output.transform(item._matrix)
    output._combineAppearance(item)
  }
  return output ?? null
}

// Returns the pattern fill of the path as the pattern's tiles, clipped by the
// path, below the path for its stroke:
function expandFill(path: PathItem): Item {
  // Only called for pattern fills:
  const { pattern, matrix } = path.fillColor!
  const mask = path.clone({ insert: false })
  const tiles = pattern._getTiles(path.internalBounds, matrix)
  tiles.transform(path._matrix)
  const fill = new Group({
    children: [mask, tiles],
    clipped: true,
    insert: false
  })
  path.fillColor = null
  return path.hasStroke()
    ? new Group({ children: [fill, path], insert: false })
    : fill
}
