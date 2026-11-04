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

// The next id of the global pool, and of each named pool:
let nextId = 1
const nextIdsByName: Record<string, number> = {}

/**
 * Returns the next unique id, of the pool with the given name if there is
 * one, e.g. one per class, or else of the global pool.
 *
 * @private
 */
export function getUID(name?: string): number {
  return name
    ? (nextIdsByName[name] = (nextIdsByName[name] || 1) + 1) - 1
    : nextId++
}
