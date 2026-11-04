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
export function equals(arg1, arg2) {
  if (arg1 === arg2) {
    return true
  }
  if (arg1?.equals) {
    return arg1.equals(arg2)
  }
  if (arg2?.equals) {
    return arg2.equals(arg1)
  }
  if (Array.isArray(arg1) && Array.isArray(arg2)) {
    let { length } = arg1
    if (length === arg2.length) {
      while (length--) {
        if (!equals(arg1[length], arg2[length])) {
          return false
        }
      }
      return true
    }
  } else if (
    arg1 &&
    arg2 &&
    typeof arg1 === 'object' &&
    typeof arg2 === 'object'
  ) {
    const keys = Object.keys(arg1)
    if (keys.length === Object.keys(arg2).length) {
      for (const key of keys) {
        if (!(Object.hasOwn(arg2, key) && equals(arg1[key], arg2[key]))) {
          return false
        }
      }
      return true
    }
  }
  return false
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

// Defines the constructors of 0.17 that factories replace, deprecated, e.g.
// `new Path.Circle()` for `Path.circle()`:
export function defineDeprecatedConstructors(ctor: any, names: string[]) {
  for (const name of names) {
    const factory = ctor[name]
    ctor[name[0].toUpperCase() + name.slice(1)] = function (...args: any[]) {
      return factory.apply(ctor, args)
    }
  }
}
