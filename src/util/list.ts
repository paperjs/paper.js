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

/**
 * Utility function for pushing a large amount of items to an array.
 */
export function push(list, items) {
  const itemsLength = items.length
  // It seems for "small" amounts of items, this performs better, but once it
  // reaches a certain amount, some browsers start crashing:
  if (itemsLength < 4096) {
    list.push(...items)
  } else {
    // Use a loop as the best way to handle big arrays (see #1493). Set the new
    // array length once before the loop for better performance.
    const startLength = list.length
    list.length += itemsLength
    for (let i = 0; i < itemsLength; i++) {
      list[startLength + i] = items[i]
    }
  }
  return list
}

/**
 * Utility function for adding and removing items from a list of which each
 * entry keeps a reference to its index in the list in the private _index
 * property. Used for PaperScope#projects and Item#children.
 */
export function splice(list, items, index, remove) {
  const amount = items?.length ?? 0
  const append = index === undefined
  index = append ? list.length : index
  if (index > list.length) {
    index = list.length
  }
  // Update _index on the items to be added first.
  for (let i = 0; i < amount; i++) {
    items[i]._index = index + i
  }
  if (append) {
    // Append them all at the end by using push
    push(list, items)
    // Nothing removed, and nothing to adjust above
    return []
  } else {
    // Insert somewhere else and/or remove
    const args = [index, remove]
    if (items) {
      push(args, items)
    }
    const removed = list.splice(...args)
    // Erase the indices of the removed items
    for (const item of removed) {
      item._index = undefined
    }
    // Adjust the indices of the items above.
    for (let i = index + amount, l = list.length; i < l; i++) {
      list[i]._index = i
    }
    return removed
  }
}

/**
 * Utility function for looking up items of a list by name, as in
 * `list[name]`. The first item with a name wins, the others wait in the
 * `named` lookup to take over when it is removed. Used for Item#children and
 * Path#segments.
 */
export function addNamed(list, named, name, item) {
  ;(named[name] ??= []).push(item)
  // Only set this item if there isn't one under the same name already
  if (!(name in list)) {
    list[name] = item
  }
}

/**
 * Removes the named reference to an item added by addNamed().
 */
export function removeNamed(list, named, name, item) {
  const namedArray = named[name]
  const index = namedArray?.indexOf(item) ?? -1
  if (index !== -1) {
    // Remove the named reference
    if (list[name] == item) {
      delete list[name]
    }
    // Remove this entry
    namedArray.splice(index, 1)
    // If there are any items left in the named array, set the first of them
    // to be list[name]
    if (namedArray.length) {
      list[name] = namedArray[0]
    } else {
      // Otherwise delete the empty array
      delete named[name]
    }
  }
}
