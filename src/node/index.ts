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

// The entry for Node.js, rendering through happy-dom and @napi-rs/canvas.
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { CanvasView, inject, setEnvironment } from '../internal.ts'
import { happyDom, napiCanvas } from './peers.ts'
import { CanvasAdapter } from './CanvasAdapter.ts'

declare module '../view/CanvasView.ts' {
  export interface CanvasView {
    /**
     * Exports the view's animation as a sequence of image files, one for
     * each frame: it emits the `frame` event with the times of the given
     * frame rate rather than real ones, and writes the image of the view
     * after each.
     *
     * @option options.directory {String} the directory to write the files to
     * @option [options.fps=30] {Number} the frame rate of the animation
     * @option [options.amount=1] {Number} the amount of frames to export
     * @option [options.prefix='frame-'] {String} the prefix of the file
     *     names, which continue with the padded frame number
     * @option [options.padding] {Number} the amount of digits of the frame
     *     numbers, by default as many as the last frame needs
     * @option [options.format='png'] {String} the image format, `'png'` or
     *     `'jpeg'`
     * @option [options.onProgress] {Function} called after each frame, with
     *     an object describing the progress: `count`, `amount`, `percentage`,
     *     and the milliseconds `time` since the start and `delta` since the
     *     previous frame
     *
     * @param options the options of the export
     * @return a promise that resolves once all frames are written
     */
    exportFrames(options: {
      directory: string
      fps?: number
      amount?: number
      prefix?: string
      padding?: number
      format?: 'png' | 'jpeg'
      onProgress?(progress: {
        count: number
        amount: number
        percentage: number
        time: number
        delta: number
      }): void
    }): Promise<void>

    /**
     * Updates the view and writes its image to a file, as JPEG if the file
     * name ends in `.jpg` or `.jpeg`, and as PNG otherwise.
     *
     * @param path the path of the file to write
     * @return a promise that resolves once the file is written
     */
    exportImage(path: string): Promise<void>
  }
}

// Create the window to draw in. Its document lies in the working directory, so
// relative URLs load files from there, through file: URLs, which happy-dom
// can't load by itself:
const canvasAdapter = new CanvasAdapter()
const window = new happyDom.Window({
  url: pathToFileURL(`${process.cwd()}/`).href,
  settings: {
    canvasAdapter,
    enableImageFileLoading: true,
    // Give iframes their documents, as SVG import computes styles in one:
    enableIframePageLoading: true,
    fetch: {
      interceptor: {
        async beforeAsyncRequest({ request, window }) {
          const url = new URL(request.url)
          if (url.protocol === 'file:') {
            return new window.Response(await readFile(url))
          }
        }
      }
    }
  }
})

// happy-dom fires the load events of images before @napi-rs/canvas has
// decoded them, so they would draw nothing. Hold them back until then:
// NOTE: Remove once @napi-rs/canvas fixes this:
// https://github.com/Brooooooklyn/canvas/issues/1423
{
  const { HTMLImageElement, PropertySymbol } = happyDom
  const { dispatchEvent } = HTMLImageElement.prototype
  HTMLImageElement.prototype.dispatchEvent = function (event) {
    // Only the first call, not those of the event's phases:
    if (
      event.type === 'load' &&
      !event[PropertySymbol.dispatching] &&
      this[PropertySymbol.window] === window
    ) {
      const buffer = this[PropertySymbol.buffer]
      this[PropertySymbol.complete] = false
      canvasAdapter
        .decodeImage(this)
        .then(
          () => true,
          () => false
        )
        .then(isDecoded => {
          // Unless the image changed its source in the meantime:
          if (this[PropertySymbol.buffer] === buffer) {
            this[PropertySymbol.complete] = true
            dispatchEvent.call(
              this,
              isDecoded ? event : new window.Event('error')
            )
          }
        })
      return true
    }
    return dispatchEvent.call(this, event)
  }
}

setEnvironment(window as unknown as Window & typeof globalThis)

inject(CanvasView.prototype, {
  async exportFrames(this: CanvasView, options) {
    const {
      directory,
      fps = 30,
      amount = 1,
      prefix = 'frame-',
      padding = String(amount - 1).length,
      format = 'png',
      onProgress
    } = options
    if (!directory) {
      throw new Error('Missing options.directory.')
    }
    if (!/^(jpeg|png)$/.test(format)) {
      throw new Error(`Unsupported format: '${format}'. Use 'png' or 'jpeg'.`)
    }
    const delta = 1 / fps
    const startTime = Date.now()
    let lastTime = startTime
    for (let count = 0; count < amount; count++) {
      this.emit('frame', { delta, time: delta * count, count })
      const number = String(count).padStart(padding, '0')
      await this.exportImage(join(directory, `${prefix}${number}.${format}`))
      const time = Date.now()
      onProgress?.({
        count,
        amount,
        percentage: Math.round((count + 1) / amount * 10000) / 100,
        time: time - startTime,
        delta: time - lastTime
      })
      lastTime = time
    }
  },

  async exportImage(this: CanvasView, path: string) {
    this.update()
    const type = /\.jpe?g$/.test(path) ? 'image/jpeg' : 'image/png'
    const blob = await new Promise<Blob>(resolve =>
      this._element.toBlob(resolve, type)
    )
    await writeFile(path, new Uint8Array(await blob.arrayBuffer()))
  }
})

/**
 * The fonts of @napi-rs/canvas, to register fonts for text on Node.js, e.g.
 * `GlobalFonts.registerFromPath('fonts/Inter.ttf', 'Inter')`.
 */
export const { GlobalFonts } = napiCanvas

export * from '../index.ts'
export { default } from '../index.ts'
