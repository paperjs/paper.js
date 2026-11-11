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

// The window and document that Paper.js works with, resolved at first use:
let isResolved = false
let window: Window & typeof globalThis = null
let document: Document = null

/**
 * Sets the window, and with it the document, that Paper.js works with.
 *
 * @private
 */
export function setEnvironment(environment: Window & typeof globalThis) {
  document = environment?.document ?? null
  // A DOM whose canvas has no 2D context, as jsdom without the canvas module in
  // jest, can't draw either, so treat it like a worker as well (#1805):
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
export function getWindow(): Window & typeof globalThis {
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
