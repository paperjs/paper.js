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

import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

// happy-dom and @napi-rs/canvas are optional peer dependencies, which only
// paper/node needs, so say how to install them when they're missing:
function load(name: string) {
  try {
    return require(name)
  } catch (error) {
    throw error.code === 'MODULE_NOT_FOUND'
      ? new Error(
          `Unable to load '${name}'. Install happy-dom and @napi-rs/canvas.`,
          { cause: error }
        )
      : error
  }
}

export const happyDom: typeof import('happy-dom') = load('happy-dom')
export const napiCanvas: typeof import('@napi-rs/canvas') =
  load('@napi-rs/canvas')
