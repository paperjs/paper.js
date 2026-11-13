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

import { capitalize } from './string.ts'

export function isPlainObject(arg) {
  const ctor = arg?.constructor
  // We also need to check for ctor.name === 'Object', in case this is an object
  // from another global scope (e.g. an iframe, or another vm context in Node.js).
  return !!ctor && (ctor === Object || ctor.name === 'Object')
}

/**
 * Checks if two values or objects are equal to each other, by using their
 * equals() methods if available, and also comparing elements of arrays and
 * properties of objects.
 */
export function equals(obj1, obj2) {
  if (obj1 === obj2) return true
  // Call #equals() on both obj1 and obj2
  if (obj1?.equals) return obj1.equals(obj2)
  if (obj2?.equals) return obj2.equals(obj1)
  // Deep compare objects or arrays
  if (
    obj1 &&
    obj2 &&
    typeof obj1 === 'object' &&
    typeof obj2 === 'object'
  ) {
    // Compare arrays
    if (Array.isArray(obj1) && Array.isArray(obj2)) {
      let { length } = obj1
      if (length !== obj2.length) return false
      while (length--) {
        if (!equals(obj1[length], obj2[length])) return false
      }
    } else {
      // Deep compare objects.
      const keys = Object.keys(obj1)
      // Ensure that both objects contain the same number of properties before
      // comparing deep equality.
      if (keys.length !== Object.keys(obj2).length) return false
      for (const key of keys) {
        // Deep compare each member
        if (!(Object.hasOwn(obj2, key) && equals(obj1[key], obj2[key]))) {
          return false
        }
      }
    }
    return true
  }
  return false
}

/**
 * Creates a shallow copy of an object, array or instance, keeping its class.
 */
export function clone<T extends object>(obj: T): T {
  return Object.assign(new (obj.constructor as new () => T)(), obj)
}

/**
 * Defines the members of the source on the target the way a class body does:
 * not enumerable unless asked for, and with accessors copied rather than
 * evaluated.
 */
export function inject<T extends object>(
  target: T,
  source: object,
  { enumerable = false } = {}
): T {
  const descriptors = Object.getOwnPropertyDescriptors(source)
  for (const descriptor of Object.values(descriptors)) {
    descriptor.enumerable = enumerable
  }
  return Object.defineProperties(target, descriptors)
}

// Keep `new Path.Circle()` working as a deprecated alias of `Path.circle()`:
export function defineDeprecatedConstructors(ctor: any, names: string[]) {
  for (const name of names) {
    const factory = ctor[name]
    ctor[capitalize(name)] = function (...args: any[]) {
      return factory.apply(ctor, args)
    }
  }
}
