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

// Run the PaperScripts of the page once it has loaded, for the script files,
// see build.mjs. The ES module leaves this to PaperScript.load():
import { addEvents, getDocument, getWindow } from '../internal.ts'
import { PaperScript } from './index.ts'

const window = getWindow()
if (window) {
  // Catch cases where paper.js is loaded after the browser event has
  // already occurred.
  if (getDocument().readyState === 'complete') {
    // Handle it asynchronously
    setTimeout(() => PaperScript.load())
  } else {
    addEvents(window, { load: () => PaperScript.load() })
  }
}
