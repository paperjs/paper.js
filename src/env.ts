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

// The window and document that Paper.js works with, resolved at first use: in
// browsers the native ones, on Node.js the ones passed to setEnvironment() by
// the Node layer, and in workers none. A DOM whose canvas has no 2D context,
// as jsdom without the canvas module, can't draw either, so it counts as a
// worker as well, with a document but no window (#1805).
let isResolved = false
let window: Window = null
let document: Document = null

/**
 * Sets the window, and with it the document, that Paper.js works with.
 *
 * @private
 */
export function setEnvironment(environment: Window) {
  document = environment?.document || null
  window = document?.createElement('canvas').getContext('2d')
    ? environment
    : null
  isResolved = true
}

/**
 * Returns the window that Paper.js draws in, or null in workers.
 *
 * @private
 */
export function getWindow(): Window {
  if (!isResolved) {
    setEnvironment(globalThis.window)
  }
  return window
}

/**
 * Returns the document that Paper.js creates elements in, if there is one.
 *
 * @private
 */
export function getDocument(): Document {
  if (!isResolved) {
    setEnvironment(globalThis.window)
  }
  return document
}
