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
  Matrix,
  Path,
  Rectangle,
  capitalize,
  equals,
  isPlainObject
} from '../internal.ts'
import type { Item } from './Item.ts'
import type { Project } from './Project.ts'

// NOTE: Documentation is in Item#matches()
export function matchItem(item: Item, name: any, compare?: any): boolean {
  const type = typeof name
  if (type === 'object') {
    // `name` is the match object, not a string
    for (const key in name) {
      if (Object.hasOwn(name, key) && !matchItem(item, key, name[key])) {
        return false
      }
    }
    return true
  } else if (type === 'function') {
    return name(item)
  } else if (name === 'match') {
    return compare(item)
  } else {
    let value = /^(empty|editable)$/.test(name)
      ? // Handle boolean test functions separately, by calling them
        // to get the value.
        item['is' + capitalize(name)]()
      : item[name]
    if (name === 'class') {
      if (typeof compare === 'function') {
        return item instanceof compare
      }
      // Compare further with the className property value instead.
      value = item.className
    }
    if (typeof compare === 'function') {
      return !!compare(value)
    } else if (compare) {
      if (compare.test) {
        // RegExp-ish
        return compare.test(value)
      } else if (isPlainObject(compare)) {
        return matchObject(compare, value)
      }
    }
    return equals(value, compare)
  }
}

// NOTE: Documentation is in Item#getItems()
// The owner is an item, or the project with its layers as children:
export function getItems(
  owner: Item | Project,
  options: any,
  matrix?: Matrix | null,
  firstOnly?: boolean
): Item[] {
  const items: Item[] = []
  const obj = typeof options === 'object' && options
  const overlapping = obj && obj.overlapping
  const inside = obj && obj.inside
  const recursive = !obj || obj.recursive !== false
  // If overlapping is set, we also perform the inside check:
  const bounds = overlapping || inside
  const rect = bounds && Rectangle.from(bounds)
  const path = overlapping && Path.rectangle({ rectangle: rect, insert: false })
  if (obj) {
    // Match against a copy of the options without these special properties,
    // or values that are undefined:
    options = {}
    for (const [key, value] of Object.entries(obj)) {
      if (
        value !== undefined &&
        !/^(recursive|inside|overlapping)$/.test(key)
      ) {
        options[key] = value
      }
    }
  }

  const collect = (item: Item | Project, matrix?: Matrix | null) => {
    const transform = rect ? (matrix ?? new Matrix()) : null
    for (const child of item._children ?? []) {
      const childMatrix = transform?.appended(child._matrix)
      let add = true
      if (rect) {
        const bounds = child.getBounds(childMatrix)
        // Regardless of the setting of inside / overlapping, if the
        // bounds don't even intersect, we can skip this child.
        if (!rect.intersects(bounds)) {
          continue
        }
        if (
          !(
            rect.contains(bounds) || (
              // First check the bounds, if the rect is fully
              // contained, we are always overlapping, and don't
              // need to perform further checks, otherwise perform
              // a proper #intersects() check:
              overlapping &&
              path.intersects(child, childMatrix)
            )
          )
        ) {
          add = false
        }
      }
      if (add && matchItem(child, options)) {
        items.push(child)
        if (firstOnly) {
          break
        }
      }
      // Only into the children that the item shows:
      if (recursive && child.children) {
        collect(child, childMatrix)
      }
      if (firstOnly && items.length > 0) {
        break
      }
    }
  }

  collect(owner, matrix)
  return items
}

// Match against objects in a nested manner, as for Item#data:
function matchObject(obj1: object, obj2: object): boolean {
  for (const key in obj1) {
    if (Object.hasOwn(obj1, key)) {
      const value1 = obj1[key]
      const value2 = obj2[key]
      if (isPlainObject(value1) && isPlainObject(value2)) {
        if (!matchObject(value1, value2)) {
          return false
        }
      } else if (!equals(value1, value2)) {
        return false
      }
    }
  }
  return true
}
