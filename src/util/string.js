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

/**
 * Capitalizes the passed string: hello world -> Hello World
 */
export function capitalize(str) {
  return str.replace(/\b[a-z]/g, match => match.toUpperCase())
}

/**
 * Camelizes the passed hyphenated string: caps-lock -> capsLock
 */
export function camelize(str) {
  return str.replace(/-(.)/g, (match, chr) => chr.toUpperCase())
}

/**
 * Converts camelized strings to hyphenated ones: CapsLock -> caps-lock
 */
export function hyphenate(str) {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
}
