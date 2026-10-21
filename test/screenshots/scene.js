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

import { afterEach, expect } from 'vitest'
import { page } from 'vitest/browser'
import paper from 'paper'
import { testFontFamily } from '../helpers.js'

let canvas

afterEach(() => {
  paper.project.remove()
  canvas.remove()
})

// Sets up a project on a white canvas in the page, of the given size, and
// returns the defaults for the scene's texts:
export function createScene(width, height) {
  canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  // Draw at one pixel per point, whatever the screen:
  canvas.setAttribute('hidpi', 'off')
  canvas.style.background = 'white'
  document.body.append(canvas)
  paper.setup(canvas)
  return { fontFamily: testFontFamily, fontSize: 12, fillColor: 'black' }
}

// Draws the outline of the area or path that text flows in, which text items
// don't draw themselves:
export function outline(path) {
  const copy = path.clone({ insert: false })
  copy.set({ strokeColor: '#ccc', strokeWidth: 1, fillColor: null })
  paper.project.activeLayer.insertChild(0, copy)
  return copy
}

// Compares the scene with its screenshot, named after the test:
export async function expectScene() {
  paper.view.update()
  await expect.element(page.elementLocator(canvas)).toMatchScreenshot()
}
