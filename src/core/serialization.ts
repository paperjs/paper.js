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

import { isPlainObject } from '../util/object.ts'
import { Formatter } from '../util/Formatter.ts'

// The registered classes by name, for deserialization:
const classes = {}

/**
 * Registers classes under their keys for JSON serialization: Each key becomes
 * the `className` of its class, and `importJSON()` creates the class from it.
 * Keys survive minification, while class names don't.
 *
 * @param classesByName the classes to register, by name
 */
export function registerClasses(
  classesByName: Record<string, abstract new (...args: any[]) => any>
) {
  for (const [name, ctor] of Object.entries(classesByName)) {
    Object.defineProperty(ctor.prototype, 'className', { value: name })
    classes[name] = ctor
  }
}

export function getClass(name: string): new (...args: any[]) => any {
  return classes[name]
}

/**
 * Serializes the passed object into a format that can be passed to
 * `JSON.stringify()` for JSON serialization.
 */
export function serialize(
  obj: any, options?: any, compact?: boolean, dictionary?: any
) {
  options ??= {}
  const isRoot = !dictionary
  let res
  if (isRoot) {
    options.formatter = new Formatter(options.precision)
    // Create a simple dictionary object that handles all the storing and
    // retrieving of dictionary definitions and references, e.g. for symbols
    // and gradients. Items that want to support this need to define globally
    // unique _id attribute.
    dictionary = {
      length: 0,
      definitions: {},
      references: {},
      add(item, create) {
        // See if we have reference entry with the given id already. If not,
        // call create on the item to allow it to create the definition, then
        // store the reference to it and return it.
        const id = '#' + item._id
        let ref = this.references[id]
        if (!ref) {
          this.length++
          const res = create.call(item)
          const name = item.className
          // Also automatically insert class for dictionary entries.
          if (name && res[0] !== name) {
            res.unshift(name)
          }
          this.definitions[id] = res
          ref = this.references[id] = [id]
        }
        return ref
      }
    }
  }
  if (obj?._serialize) {
    res = obj._serialize(options, dictionary)
    // If we don't serialize to compact form (meaning no type identifier), see
    // if _serialize didn't already add the class, e.g. for classes that do not
    // support compact form.
    const name = obj.className
    // Enforce class names on root level, except if the class explicitly asks
    // to be serialized in compact form (Project).
    if (
      name &&
      !obj._compactSerialize &&
      (isRoot || !compact) &&
      res[0] !== name
    ) {
      res.unshift(name)
    }
  } else if (Array.isArray(obj)) {
    res = obj.map(value => serialize(value, options, compact, dictionary))
  } else if (isPlainObject(obj)) {
    res = {}
    for (const [key, value] of Object.entries(obj)) {
      res[key] = serialize(value, options, compact, dictionary)
    }
  } else if (typeof obj === 'number') {
    res = options.formatter.number(obj, options.precision)
  } else {
    res = obj
  }
  return isRoot && dictionary.length > 0
    ? [['dictionary', dictionary.definitions], res]
    : res
}

/**
 * Deserializes from parsed JSON data. A simple convention is followed: Array
 * values with a string at the first position are links to deserializable
 * types through the registered classes, and the values following in the array
 * are the arguments to their constructor. Any other value is passed on
 * unmodified. The passed json data is recursively traversed and converted,
 * leaves first. References of the form `['@key']` are passed to the optional
 * `resolve(key)`, for definitions that the importer provides.
 */
export function deserialize(
  json: any,
  create?: (ctor: any, args: any[], isRoot: boolean) => any,
  resolve?: (key: string) => any,
  _data?: any,
  _setDictionary?: boolean,
  _isRoot?: boolean
) {
  let res = json
  const isFirst = !_data
  const hasDictionary = (
    isFirst &&
    json?.length &&
    json[0][0] === 'dictionary'
  )
  // A _data side-car to deserialize that can hold any kind of 'global' data
  // across a deserialization. It's currently only used to hold dictionary
  // definitions.
  _data ??= {}
  if (Array.isArray(json)) {
    // See if it's a serialized type. If so, the rest of the array are the
    // arguments to the constructor. Either way, we simply deserialize all
    // elements of the array.
    const name = json[0]
    // Handle stored dictionary specially, since we need to keep a lookup
    // table to retrieve referenced items from.
    const isDictionary = name === 'dictionary'
    // First see if this is perhaps a dictionary reference, and if so return
    // its definition instead.
    if (json.length == 1 && /^#/.test(name)) {
      return _data.dictionary[name]
    }
    if (json.length == 1 && resolve && /^@/.test(name)) {
      return resolve(name.slice(1))
    }
    const ctor = classes[name]
    res = []
    // Skip first type entry for arguments. Pass true for _isRoot in children
    // if we have a dictionary, in which case we need to shift the root level
    // one down.
    for (let i = ctor ? 1 : 0, l = json.length; i < l; i++) {
      res.push(
        deserialize(
          json[i], create, resolve, _data, isDictionary, hasDictionary
        )
      )
    }
    if (ctor) {
      // Create serialized type and pass collected arguments to constructor().
      // If a create method is provided, handle our own creation. This is used
      // in #importJSON() to pass on insert = false to all items except layers.
      res = create ? create(ctor, res, isFirst || _isRoot) : new ctor(...res)
    }
  } else if (isPlainObject(json)) {
    res = {}
    // We need to set the dictionary object before further deserialization,
    // because serialized symbols may contain references to serialized
    // gradients
    if (_setDictionary) {
      _data.dictionary = res
    }
    for (const key in json) {
      res[key] = deserialize(json[key], create, resolve, _data)
    }
  }
  // Filter out deserialized dictionary:
  return hasDictionary ? res[1] : res
}

export function exportJSON(
  obj: any,
  options?: { asString?: boolean; precision?: number }
) {
  const json = serialize(obj, options)
  return options?.asString == false ? json : JSON.stringify(json)
}
