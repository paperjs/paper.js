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

import { happyDom, napiCanvas } from './peers.ts'
import type {
  ICanvasAdapter,
  ICanvasAdapterCaller,
  ICanvasRenderingContext2D,
  ICanvasShape,
  Blob
} from 'happy-dom'
import type { Canvas, Image, SKRSContext2D } from '@napi-rs/canvas'

/**
 * Renders the canvases of a happy-dom window through @napi-rs/canvas, modeled
 * on @happy-dom/node-canvas-adapter.
 *
 * @private
 */
export class CanvasAdapter implements ICanvasAdapter {
  // The backing canvases of the window's canvases, and the decoded images by
  // the buffers of their image elements:
  #canvases = new WeakMap<ICanvasShape, Canvas>()
  #images = new WeakMap<Buffer, Image>()

  getContext(
    { canvas, window }: ICanvasAdapterCaller,
    contextType: string,
    contextAttributes?: Record<string, unknown>
  ): ICanvasRenderingContext2D | null {
    const context: SKRSContext2D = this.#getCanvas(canvas).getContext(
      contextType as '2d',
      contextAttributes
    )
    if (context && context.canvas !== canvas) {
      // Link the context to the window's canvas instead of the backing one,
      // and convert the window's image sources and image data to those of
      // @napi-rs/canvas, once:
      const { ImageData } = window
      const {
        drawImage,
        createPattern,
        createImageData,
        getImageData,
        putImageData
      } = context
      Object.defineProperty(context, 'canvas', { value: canvas })
      Object.assign(context, {
        drawImage: (image: any, ...args: any[]) => {
          const source = this.#getSource(image)
          if (source) {
            drawImage.call(context, source, ...args)
          }
        },

        createPattern: (image: any, repetition: string) => {
          const source = this.#getSource(image)
          return source ? createPattern.call(context, source, repetition) : null
        },

        createImageData: (...args: any[]) => {
          const { data, width, height } = createImageData.apply(context, args)
          return new ImageData(data, width, height)
        },

        getImageData: (...args: any[]) => {
          const { data, width, height } = getImageData.apply(context, args)
          return new ImageData(data, width, height)
        },

        putImageData: (imageData: ImageData, ...args: any[]) => {
          const { data, width, height } = imageData
          putImageData.call(
            context,
            new napiCanvas.ImageData(data, width, height),
            ...args
          )
        }
      })
    }
    return context as unknown as ICanvasRenderingContext2D
  }

  toDataURL(
    { canvas }: ICanvasAdapterCaller,
    type?: string,
    quality?: unknown
  ): string {
    return this.#getCanvas(canvas).toDataURL(
      `image/${getFormat(type)}` as 'image/jpeg',
      quality as number
    )
  }

  toBlob(
    { canvas, window }: ICanvasAdapterCaller,
    callback: (blob: Blob | null) => void,
    type?: string,
    quality?: unknown
  ) {
    const format = getFormat(type)
    const backing = this.#getCanvas(canvas)
    const promise =
      format === 'png'
        ? backing.encode('png')
        : backing.encode(format, quality as number)
    promise.then(
      buffer =>
        callback(new window.Blob([buffer], { type: `image/${format}` })),
      () => callback(null)
    )
  }

  #getCanvas(canvas: ICanvasShape): Canvas {
    let backing = this.#canvases.get(canvas)
    if (!backing) {
      backing = napiCanvas.createCanvas(canvas.width, canvas.height)
      this.#canvases.set(canvas, backing)
      if (canvas instanceof happyDom.HTMLCanvasElement) {
        // Resize the backing canvas along with the element, which clears it
        // and resets its context, as in browsers:
        const { onSetAttribute } = happyDom.PropertySymbol
        const setAttribute = canvas[onSetAttribute]
        canvas[onSetAttribute] = (attribute, replacedAttribute) => {
          setAttribute.call(canvas, attribute, replacedAttribute)
          const { name } = attribute
          if (name === 'width' || name === 'height') {
            backing[name] = canvas[name]
          }
        }
      }
    }
    return backing
  }

  /**
   * Decodes the image of an image element with @napi-rs/canvas, which draws
   * nothing until it's done, asynchronously.
   */
  decodeImage(image: HTMLImageElement): Promise<void> {
    return this.#getImage(image[happyDom.PropertySymbol.buffer]).decode()
  }

  #getImage(buffer: Buffer): Image {
    let image = this.#images.get(buffer)
    if (!image) {
      image = new napiCanvas.Image()
      image.src = buffer
      this.#images.set(buffer, image)
    }
    return image
  }

  #getSource(image: any): Canvas | Image | null {
    const {
      HTMLImageElement,
      HTMLCanvasElement,
      HTMLVideoElement,
      OffscreenCanvas,
      ImageBitmap,
      PropertySymbol
    } = happyDom
    if (image instanceof HTMLImageElement) {
      // Images draw nothing until they've loaded, as in browsers:
      const buffer: Buffer = image[PropertySymbol.buffer]
      return buffer ? this.#getImage(buffer) : null
    } else if (
      image instanceof HTMLCanvasElement ||
      image instanceof OffscreenCanvas ||
      image instanceof ImageBitmap
    ) {
      return this.#getCanvas(image[PropertySymbol.canvas] || image)
    } else if (image instanceof HTMLVideoElement) {
      // Videos aren't supported:
      return null
    }
    // Let the images and canvases of @napi-rs/canvas through:
    return image
  }
}

// Fall back on PNG for the types that the encoder doesn't support, as browsers
// do:
function getFormat(type: string): 'png' | 'jpeg' | 'webp' {
  const format = /^image\/(jpeg|webp)$/.exec(type)?.[1] as 'jpeg' | 'webp'
  return format || 'png'
}
