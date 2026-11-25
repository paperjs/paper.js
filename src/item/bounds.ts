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

import { Matrix, Rectangle, isInheritingStyle } from '../internal.ts'
import type { BoundsOptions, Item } from './Item.ts'

// NOTE: Documentation is in Item#getBounds()
export function getItemBounds(
  item: Item,
  matrix?: Matrix | BoundsOptions | null,
  options?: BoundsOptions
): Rectangle {
  const hasMatrix = options || matrix instanceof Matrix
  const opts = {
    ...(hasMatrix ? options : (matrix as BoundsOptions)),
    ...item._boundsOptions
  }
  // We can only cache the bounds if the path uses stroke-scaling, or if
  // no stroke is involved in the calculation of the bounds.
  // When strokeScaling is false, the bounds are affected by the zoom
  // level of the view, hence we can't cache.
  // TODO: Look more into handling of stroke-scaling, e.g. on groups with
  // some children that have strokeScaling, as well as SymbolItem with
  // SymbolDefinition that have strokeScaling!
  // TODO: Once that is resolved, we should be able to turn off
  // opts.stroke if a resolved item definition does not have a stroke,
  // allowing the code to share caches between #strokeBounds and #bounds.
  if (!opts.stroke || item.strokeScaling) {
    opts.cacheItem = item
  }
  // If we're caching bounds, pass on the item as cacheItem, so
  // the children can setup _boundsCache structures for it.
  return item._getCachedBounds(hasMatrix ? (matrix as Matrix) : null, opts).rect
}

/**
 * Deals with the calling of _getBounds(), recursive matrix concatenation and
 * all the caching, behind Item#_getCachedBounds(), which hosted shells
 * override.
 *
 * @private
 */
export function getCachedBounds(
  item: Item,
  matrix: Matrix | null,
  options: BoundsOptions,
  noInternal?: boolean
): { rect: Rectangle; nonscaling: boolean } {
  // See if we can cache these bounds. We only cache the bounds
  // transformed with the internally stored _matrix, (the default if no
  // matrix is passed).
  // Do not transform by the internal matrix for internal, untransformed
  // bounds.
  const internal = options.internal && !noInternal
  const { cacheItem } = options
  const _matrix = internal ? null : item._matrix._orNullIfIdentity()
  // A passed identity matrix still replaces the internal matrix:
  const transform = matrix ? matrix._orNullIfIdentity() : _matrix
  // Create a key for caching, reflecting all bounds options. Bounds measured
  // through a symbol item can depend on its style, so they aren't cached,
  // see Style#_get():
  const cacheKey = (
    cacheItem &&
    !isInheritingStyle() &&
    (transform ? transform.equals(_matrix) : !_matrix) &&
    getBoundsCacheKey(options, internal)
  )
  // Only items whose bounds come from other items need to pass the
  // cacheItem chain on, so that clearing caches propagates up:
  const isIntermediate = (
    cacheKey &&
    cacheItem !== item &&
    (item._children || item._definition)
  )
  let bounds = item._bounds
  // NOTE: This needs to happen before returning cached values, since even
  // then, _boundsCache needs to be kept up-to-date.
  updateBoundsCache(item._parent || item._symbol, cacheItem)
  if (isIntermediate) {
    updateBoundsCache(item, cacheItem)
  }
  if (cacheKey && bounds && cacheKey in bounds) {
    const cached = bounds[cacheKey]
    return {
      rect: cached.rect.clone(),
      nonscaling: cached.nonscaling
    }
  }
  const res = item._getBounds(
    transform,
    isIntermediate ? { ...options, cacheItem: item } : options
  )
  // Support two versions of _getBounds(): One that directly returns a
  // Rectangle, and one that returns a bounds object with nonscaling.
  const rect = res instanceof Rectangle ? res : res.rect
  const style = item._style
  const nonscaling = (
    !(res instanceof Rectangle) && res.nonscaling ||
    style.hasStroke() && !style.strokeScaling
  )
  // If we can cache the result, update the _bounds cache structure
  // before returning
  if (cacheKey) {
    if (!bounds) {
      item._bounds = bounds = {}
    }
    bounds[cacheKey] = {
      rect: rect.clone(),
      nonscaling,
      stroke: options.stroke,
      // Mark as internal, so Item#transform() won't transform it
      internal
    }
  }
  return { rect, nonscaling }
}

export function getBoundsCacheKey(
  options: BoundsOptions,
  internal?: boolean
): string {
  return [
    options.stroke ? 1 : 0,
    options.handle ? 1 : 0,
    internal ? 1 : 0
  ].join('')
}

/**
 * Returns to correct matrix to use to transform stroke related geometries
 * when calculating bounds: the item's matrix if {@link Item#strokeScaling} is
 * `true`, otherwise the parent's inverted view matrix. The returned matrix
 * is always shiftless, meaning its translation vector is reset to zero.
 *
 * @private
 */
export function getStrokeMatrix(
  item: Item,
  matrix: Matrix | null | undefined,
  options?: BoundsOptions
): Matrix | null {
  const parent = item.strokeScaling
    ? null
    : options?.internal
      ? item
      : item._parent ?? item._symbol?._item
  let mx = parent ? parent.viewMatrix.invert() : matrix
  const transform = !parent && options?.transform
  // When predicting the bounds after a transformation, see
  // Item#strokeBounds, it doesn't scale the strokes of items that apply it
  // to their content, all the way up to the transformed item:
  if (transform) {
    for (let owner = item; owner?._applyMatrix; owner = owner._parent) {
      if (owner === transform.item) {
        mx = transform.matrix.inverted().appended(mx)
        break
      }
    }
  }
  return mx?._shiftless() ?? null
}

/**
 * Set up a boundsCache structure that keeps track of items that keep
 * cached bounds that depend on an item. We store this in the parent,
 * for multiple reasons:
 * The parent receives CHILDREN change notifications for when its
 * children are added or removed and can thus clear the cache, and we
 * save a lot of memory, e.g. when grouping 100 items and asking the
 * group for its bounds. If stored on the children, we would have 100
 * times the same structure.
 *
 * @private
 */
export function updateBoundsCache(parent: any, item: Item) {
  if (parent && item) {
    // Set-up the parent's boundsCache structure if it does not
    // exist yet and add the item to it.
    const id = item._id
    const ref = (parent._boundsCache ??= {
      // Use a hash-table for ids and an array for the list,
      // so we can keep track of items that were added already
      ids: {},
      list: []
    })
    if (!ref.ids[id]) {
      ref.list.push(item)
      ref.ids[id] = item
    }
  }
}

/**
 * Clears cached bounds of all items that the children of the item are
 * contributing to. See updateBoundsCache() for an explanation why this
 * information is stored on parents, not the children themselves.
 *
 * @private
 */
export function clearBoundsCache(item: any) {
  // Clear the position as well, since it's depending on bounds.
  const cache = item._boundsCache
  if (cache) {
    // Erase cache before looping, to prevent circular recursion.
    item._bounds = item._position = item._boundsCache = undefined
    for (const other of cache.list) {
      if (other !== item) {
        other._bounds = other._position = undefined
        // We need to recursively call clearBoundsCache(), as
        // when the cache for the other item's children is not
        // valid anymore, that propagates up the scene graph.
        if (other._boundsCache) {
          clearBoundsCache(other)
        }
      }
    }
  }
}

/**
 * Gets the combined bounds of all specified items, transformed by the
 * matrix, or in project coordinates if global is set.
 *
 * @private
 */
export function getCombinedBounds(
  items: Item[],
  matrix: Matrix | null,
  options?: BoundsOptions,
  global?: boolean
): { rect: Rectangle; nonscaling: boolean } {
  let x1 = Infinity
  let x2 = -x1
  let y1 = x1
  let y2 = x2
  let nonscaling = false
  // NOTE: As soon as one child-item has non-scaling strokes, the full
  // bounds need to be considered non-scaling for caching purposes.
  const opts = options ?? {}
  for (const item of items) {
    // Item is handled if it is visible and not recursively empty.
    // This avoid errors with nested empty groups (#1467).
    if (item._visible && !item.isEmpty(true)) {
      // Pass true for noInternal, since even when getting
      // internal bounds for this item, we need to apply the
      // matrices to its children.
      const bounds = item._getCachedBounds(
        global
          ? item._getGlobalMatrix(true)
          : matrix?.appended(item._matrix),
        opts,
        true
      )
      const { rect } = bounds
      x1 = Math.min(rect.x, x1)
      y1 = Math.min(rect.y, y1)
      x2 = Math.max(rect.x + rect.width, x2)
      y2 = Math.max(rect.y + rect.height, y2)
      if (bounds.nonscaling) {
        nonscaling = true
      }
    }
  }
  return {
    rect: isFinite(x1)
      ? new Rectangle(x1, y1, x2 - x1, y2 - y1)
      : new Rectangle(),
    nonscaling
  }
}
