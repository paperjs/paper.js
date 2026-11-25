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

// The entry of the core library: the classes, and the first scope, which the
// classes are installed on, as `paper`.
import * as core from './core.ts'
import { PaperScope, getDocument, getWindow, inject } from './internal.ts'
import { boolean } from './boolean/index.ts'
import { offset } from './offset/index.ts'
import { svg } from './svg/index.ts'

// The full library has all the features that paper/core leaves to use():
core.use(boolean, offset, svg, core.effects, core.raster, core.tween)

// Make the classes and namespaces properties of every scope, enumerable for
// PaperScope#install() and PaperScript, which enumerate them:
type Members = Omit<
  typeof core,
  'registerClasses' | 'use' | 'effects' | 'raster' | 'tween'
> & {
  readonly document: Document | null
  readonly window: Window | null
}
const { registerClasses, use, effects, raster, tween, ...classes } = core
const members: Members = {
  ...classes,
  get document() {
    return getDocument()
  },
  get window() {
    return getWindow()
  }
}
inject(PaperScope.prototype, members, { enumerable: true })

declare module './scope/PaperScope.ts' {
  interface PaperScope extends Members {}
}

/**
 * The first scope, which is also the active one until another is created or
 * activated, see {@link PaperScope#activate()}.
 */
const paper = new PaperScope()

export default paper
export * from './core.ts'
