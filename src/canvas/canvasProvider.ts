import { getDocument, getWindow } from '../internal.ts'
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

type Canvas = HTMLCanvasElement | OffscreenCanvas

// The released canvases, for getCanvas() to reuse, exported for the tests:
export const canvases: Canvas[] = []

/**
 * Returns a canvas of the given size, reusing one that was released if there
 * is one, or null in workers without OffscreenCanvas.
 *
 * @private
 * @option [options.minimum=false] {Boolean} reuse a released canvas that is at
 *     least as large, without resizing it, since resizing reallocates its
 *     pixels
 */
export function getCanvas(
  width: number | { width: number; height: number },
  height?: number | object,
  options?: CanvasRenderingContext2DSettings & { minimum?: boolean }
): Canvas {
  const window = getWindow()
  // Web-workers have no DOM, but may support OffscreenCanvas:
  if (!window && !globalThis.OffscreenCanvas) {
    return null
  }
  // Accept a size object as the first argument, followed by the options:
  const size =
    typeof width === 'object'
      ? width
      : { width, height: height as number }
  if (typeof width === 'object') {
    options = height as typeof options
  }
  const minimum = options?.minimum
  const fits = (canvas: Canvas) =>
    minimum
      ? canvas.width >= size.width && canvas.height >= size.height
      : canvas.width === size.width && canvas.height === size.height
  let index = canvases.length - 1
  for (let i = index; i >= 0; i--) {
    if (fits(canvases[i])) {
      index = i
      break
    }
  }
  const canvas =
    index >= 0
      ? canvases.splice(index, 1)[0]
      : window
        ? getDocument().createElement('canvas')
        : new OffscreenCanvas(size.width, size.height)
  const context = canvas.getContext('2d', options || {}) as any
  if (!context) {
    throw new Error(`Canvas ${canvas} is unable to provide a 2D context.`)
  }
  if (fits(canvas)) {
    // Clear the reused pixels and reset the context's state:
    if (context.reset) {
      context.reset()
    } else {
      context.setTransform(1, 0, 0, 1, 0, 0)
      context.clearRect(0, 0, canvas.width, canvas.height)
      context.globalAlpha = 1
      context.globalCompositeOperation = 'source-over'
      context.filter = 'none'
      context.shadowColor = 'transparent'
      context.shadowBlur = context.shadowOffsetX = context.shadowOffsetY = 0
    }
  } else {
    // Resizing clears the pixels and resets the context's state.
    canvas.width = size.width
    canvas.height = size.height
  }
  return canvas
}

/**
 * Returns the 2D context of a canvas of the given size, see getCanvas().
 *
 * @private
 */
export function getContext(
  width: number | { width: number; height: number },
  height?: number | object,
  options?: CanvasRenderingContext2DSettings & { minimum?: boolean }
): CanvasRenderingContext2D {
  const canvas = getCanvas(width, height, options)
  return canvas ? (canvas.getContext('2d') as CanvasRenderingContext2D) : null
}

/**
 * Releases a canvas, or the canvas of a context, for getCanvas() to reuse.
 *
 * @private
 */
export function releaseCanvas(canvasOrContext: any) {
  const canvas = canvasOrContext?.canvas || canvasOrContext
  if (canvas?.getContext) {
    // Keep small canvases at their size, so getCanvas() can reuse them without
    // reallocating their pixels, but free the pixels of larger ones right
    // away. Keep only a few, to bound the retained memory:
    if (canvas.width * canvas.height > 256 * 256) {
      canvas.width = canvas.height = 0
    }
    if (canvases.length < 8) {
      canvases.push(canvas)
    }
  }
}
