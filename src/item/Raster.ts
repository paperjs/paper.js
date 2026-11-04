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

import { Change } from '../constants.ts'
import { clamp } from '../util/numerical.ts'
import { getDocument } from '../env.ts'
import {
  getCanvas,
  getContext,
  releaseCanvas
} from '../canvas/canvasProvider.ts'
import { addEvents } from '../dom/domEvent.ts'
import { Event } from '../event/Event.ts'
import { Point } from '../basic/Point.ts'
import type { PointLike } from '../basic/Point.ts'
import { Size, LinkedSize } from '../basic/Size.ts'
import type { SizeLike } from '../basic/Size.ts'
import { Rectangle } from '../basic/Rectangle.ts'
import type { RectangleLike } from '../basic/Rectangle.ts'
import { Matrix } from '../basic/Matrix.ts'
import { Color } from '../style/Color.ts'
import type { ColorLike } from '../style/Color.ts'
import { PathItem } from '../path/PathItem.ts'
import { Item } from './Item.ts'
import type { BoundsOptions } from './Item.ts'
import { HitResult } from './HitResult.ts'
import type { Project } from './Project.ts'

type Handler = (this: Raster, ...args: any[]) => any
type Image = HTMLImageElement | HTMLCanvasElement

// The context that #getAverageColor() samples in, reused for speed. Memory
// consumption is low since it's only 32 x 32 pixels:
let sampleContext: CanvasRenderingContext2D = null

/**
 * The Raster item represents an image in a Paper.js project.
 */
export class Raster extends Item {
  declare _smoothing: string
  // Not private, as hosted shells are created without the constructor and
  // load these fields, see Item#_loadContent():
  _size: Size
  _loaded: boolean
  _image: HTMLImageElement
  _canvas: HTMLCanvasElement
  _context: CanvasRenderingContext2D
  _crossOrigin: string

  // TODO: Implement type, width, height.
  // TODO: Have SymbolItem & Raster inherit from a shared class?
  /**
   * Creates a new raster item from the passed argument, and places it in the
   * active layer. `source` can either be a DOM Image, a Canvas, or a string
   * describing the URL to load the image from, or the ID of a DOM element to
   * get the image from (either a DOM Image or a Canvas).
   *
   * @param [source] the source of the raster
   * @param [position] the center position at which the raster item is
   *     placed
   *
   * @example {@paperscript height=300} // Creating a raster using a url
   * var url = 'http://assets.paperjs.org/images/marilyn.jpg';
   * var raster = new Raster(url);
   *
   * // If you create a Raster using a url, you can use the onLoad
   * // handler to do something once it is loaded:
   * raster.onLoad = function() {
   *     console.log('The image has loaded.');
   * };
   *
   * @example // Creating a raster using the id of a DOM Image:
   *
   * // Create a raster using the id of the image:
   * var raster = new Raster('art');
   *
   * @example // Creating a raster using a DOM Image:
   *
   * // Find the element using its id:
   * var imageElement = document.getElementById('art');
   *
   * // Create the raster:
   * var raster = new Raster(imageElement);
   */
  constructor(source?: Image | string, position?: PointLike)
  /**
   * Creates a new empty raster of the given size, and places it in the
   * active layer.
   *
   * @param size the size of the raster
   * @param [position] the center position at which the raster item is
   *     placed
   *
   * @example {@paperscript height=150}
   * // Creating an empty raster and fill it with random pixels:
   * var width = 100;
   * var height = 100;
   *
   * // Create an empty raster placed at view center.
   * var raster = new Raster(new Size(width, height), view.center);
   *
   * // For all of its pixels...
   * for (var i = 0; i < width; i++) {
   *     for (var j = 0; j < height; j++) {
   *         // ...set a random color.
   *         raster.setPixel(i, j, Color.random());
   *     }
   * }
   */
  constructor(size: SizeLike, position?: PointLike)
  /**
   * Creates a new raster from an object description, and places it in the
   * active layer.
   *
   * @param object an object containing properties to be set on the raster
   *
   * @example {@paperscript height=300}
   * var raster = new Raster({
   *     source: 'http://assets.paperjs.org/images/marilyn.jpg',
   *     position: view.center
   * });
   *
   * raster.scale(0.5);
   * raster.rotate(10);
   */
  constructor(object: object)
  constructor(
    source?: Image | SizeLike | string | object,
    position?: PointLike
  ) {
    super()
    // Support three forms of item initialization:
    // - One object literal describing all the different properties.
    // - An image (Image|Canvas|String) and an optional position (Point).
    // - A size (Size) describing the canvas that will be  created and an
    //   optional position (Point).
    // If _initialize can set properties through object literal, we're done.
    // Otherwise we need to check the type of object:
    if (!this._initialize(source, position)) {
      let image: Image
      const object: any =
        typeof source === 'string'
          ? getDocument()?.getElementById(source)
          : typeof source === 'object'
            ? source
            : null
      if (object) {
        if (object.getContext || object.naturalHeight != null) {
          image = object
        } else {
          // See if the argument describes the raster size:
          const size = Size.from(object)
          if (!size.isZero()) {
            image = getCanvas(size) as HTMLCanvasElement
          }
        }
      }
      if (image) {
        // #image handles both canvas and image types.
        this.image = image
      } else {
        this.source = source as string
      }
    }
  }

  _initializeContent(project: Project) {
    super._initializeContent(project)
    this._size = new Size()
    this._loaded = false
  }

  _equals(item: Item): boolean {
    return this.source === (item as Raster).source
  }

  copyContent(source: this) {
    const { _image: image, _canvas: canvas } = source
    if (image) {
      this._setImage(image)
    } else if (canvas) {
      // If the Raster contains a Canvas object, we need to create a new one
      // and draw this raster's canvas on it.
      const copyCanvas = getCanvas(source._size) as HTMLCanvasElement
      copyCanvas.getContext('2d').drawImage(canvas, 0, 0)
      this._setImage(copyCanvas)
    }
    // TODO: Shouldn't this be copied with attributes instead of content?
    this._crossOrigin = source._crossOrigin
  }

  /**
   * The size of the raster in pixels.
   */
  get size(): Size {
    const size = this._size
    return new LinkedSize(
      size ? size.width : 0,
      size ? size.height : 0,
      this,
      'size'
    )
  }

  set size(size: SizeLike) {
    this._setSize(size)
  }

  _setSize(value: SizeLike, _clear?: boolean) {
    const size = Size.from(value)
    if (!size.equals(this._size)) {
      // NOTE: this._size could be null
      if (size.width > 0 && size.height > 0) {
        const element = !_clear && this.element
        const canvas = getCanvas(size) as HTMLCanvasElement
        // Draw the element onto the new canvas before #_setImage() releases
        // the old one, which frees its pixels:
        if (element) {
          canvas
            .getContext('2d')
            .drawImage(element, 0, 0, size.width, size.height)
        }
        // NOTE: Setting canvas internally sets _size.
        this._setImage(canvas)
      } else {
        // 0-width / height dimensions do not require the creation of an
        // internal canvas. Just reflect the size for now.
        if (this._canvas) {
          releaseCanvas(this._canvas)
        }
        this._size = size.clone()
      }
    } else if (_clear) {
      // We can reuse the canvas, but need to clear it.
      this.clear()
    }
  }

  /**
   * The width of the raster in pixels.
   */
  get width(): number {
    return this._size ? this._size.width : 0
  }

  set width(width: number) {
    this._setSize(new Size(width, this.height))
  }

  /**
   * The height of the raster in pixels.
   */
  get height(): number {
    return this._size ? this._size.height : 0
  }

  set height(height: number) {
    this._setSize(new Size(this.width, height))
  }

  /**
   * The loading state of the raster image.
   */
  get loaded(): boolean {
    return this._loaded
  }

  isEmpty(): boolean {
    const size = this._size
    return !size || size.width === 0 && size.height === 0
  }

  /**
   * The resolution of the raster at its current size, in PPI (pixels per
   * inch).
   */
  get resolution(): Size {
    const matrix = this._matrix
    const origin = new Point(0, 0).transform(matrix)
    const u = new Point(1, 0).transform(matrix).subtract(origin)
    const v = new Point(0, 1).transform(matrix).subtract(origin)
    return new Size(72 / u.length, 72 / v.length)
  }

  /**
   * The HTMLImageElement or Canvas element of the raster, if one is
   * associated.
   * Note that for consistency, a {@link #onLoad} event will be triggered on
   * the raster even if the image has already finished loading before, or if
   * we are setting the raster to a canvas.
   */
  get image(): Image {
    return this._image
  }

  set image(image: Image) {
    const emit = (event?: globalThis.Event) => {
      const { view } = this
      const type = event?.type || 'load'
      if (view && this.responds(type)) {
        view.scope.activate()
        this.emit(type, new Event(event))
      }
    }

    this._setImage(image)
    if (this._loaded) {
      // Emit load event with a delay, so behavior is the same as when it's
      // actually loaded and we give the code time to install event.
      setTimeout(emit, 0)
    } else if (image) {
      // Trigger the load event on the image once it's loaded
      addEvents(image, {
        load: (event: globalThis.Event) => {
          this._setImage(image)
          emit(event)
        },
        error: emit
      })
    }
  }

  set(props: any, exclude?: Record<string, boolean>): this {
    // A size that comes with a source, as from #importJSON(), only holds the
    // place of the image's size until it has loaded, see #_setImage(), so
    // don't create a canvas for it:
    if (props?.source && props.size) {
      this._size = new Size(props.size)
      return super.set(props, { size: true, ...exclude })
    }
    return super.set(props, exclude)
  }

  /**
   * Internal version of {@link #image} that does not trigger events. This is
   * used by #image, but also in other places where underlying canvases are
   * replaced, resized, etc.
   */
  _setImage(image: Image) {
    if (this._canvas) {
      releaseCanvas(this._canvas)
    }
    const img = image as HTMLImageElement
    // Due to similarities, we can handle both canvas and image types here.
    if (image && (image as HTMLCanvasElement).getContext) {
      // A Canvas object
      this._image = null
      this._canvas = image as HTMLCanvasElement
      this._loaded = true
    } else {
      // A Image object
      this._image = img
      this._canvas = null
      this._loaded = !!(img && img.src && img.complete)
    }
    // Both canvas and image have width / height attributes. Due to IE,
    // naturalWidth / Height needs to be checked for a swell, because it
    // apparently can have width / height set to 0 when the image is
    // invisible in the document.
    // While an image is still loading, keep the current size as a
    // placeholder, such as the one from #importJSON() (#1598), until the
    // loaded image sets its own:
    this._size =
      image && !this._loaded
        ? this._size || new Size()
        : new Size(
            image ? img.naturalWidth || image.width : 0,
            image ? img.naturalHeight || image.height : 0
          )
    this._context = null
    this._changed(Change.GEOMETRY | Change.PIXELS)
  }

  /**
   * The Canvas object of the raster. If the raster was created from an image,
   * accessing its canvas causes the raster to try and create one and draw the
   * image into it. Depending on security policies, this might fail, in which
   * case `null` is returned instead.
   */
  get canvas(): HTMLCanvasElement {
    if (!this._canvas) {
      const ctx = getContext(this._size)
      // Since drawImage into canvas might fail based on security policies
      // wrap the call in try-catch and only set _canvas if we succeeded.
      try {
        if (this._image) {
          ctx.drawImage(this._image, 0, 0)
        }
        this._canvas = ctx.canvas
      } catch (e) {
        releaseCanvas(ctx)
      }
    }
    return this._canvas
  }

  // Setting the canvas is a simple alias to #image
  set canvas(canvas: HTMLCanvasElement) {
    this.image = canvas
  }

  /**
   * The Canvas 2D drawing context of the raster.
   */
  get context(): CanvasRenderingContext2D {
    return this._getContext()
  }

  set context(context: CanvasRenderingContext2D) {
    this._context = context
  }

  _getContext(_change?: boolean): CanvasRenderingContext2D {
    if (!this._context) {
      this._context = this.canvas.getContext('2d')
    }
    // Support a hidden parameter that indicates if the context will be used
    // to change the Raster object. We can notify such changes ahead since
    // they are only used afterwards for redrawing.
    if (_change) {
      // Also set _image to null since the Raster stops representing it.
      // NOTE: This should theoretically be in our own _changed() handler
      // for ChangeFlag.PIXELS, but since it's only happening in one place
      // this is fine:
      this._image = null
      this._changed(Change.PIXELS)
    }
    return this._context
  }

  /**
   * The source of the raster, which can be set using a string describing the
   * URL to load the image from, or a data url. Reading this property will
   * return the url of the source image or a data-url.
   * To set the raster to a DOM Image or a Canvas, use {@link #image} or
   * {@link #canvas} instead. The ID of a DOM Image or Canvas element is only
   * accepted by the constructor.
   * Note that for consistency, a {@link #onLoad} event will be triggered on
   * the raster even if the image has already finished loading before.
   *
   * @example {@paperscript}
   * var raster = new Raster();
   * raster.source = 'http://paperjs.org/about/paper-js.gif';
   * raster.position = view.center;
   *
   * @example {@paperscript}
   * var raster = new Raster({
   *     source: 'http://paperjs.org/about/paper-js.gif',
   *     position: view.center
   * });
   */
  get source(): string {
    const image = this._image
    return image && image.src || this.toDataURL()
  }

  set source(source: string) {
    const image = getDocument().createElement('img')
    const crossOrigin = this._crossOrigin
    if (crossOrigin) {
      image.crossOrigin = crossOrigin
    }
    // Prevent setting image source to `null`, as this isn't supported by
    // browsers, and it would actually throw exceptions in JSDOM.
    // TODO: Look into fixing this bug in JSDOM.
    if (source) {
      image.src = source
    }
    this.image = image
  }

  /**
   * The crossOrigin value to be used when loading the image resource, in
   * order to support CORS. Note that this needs to be set before setting the
   * {@link #source} property in order to always work (e.g. when the image is
   * cached in the browser).
   *
   * @example {@paperscript}
   * var raster = new Raster({
   *     crossOrigin: 'anonymous',
   *     source: 'http://assets.paperjs.org/images/marilyn.jpg',
   *     position: view.center
   * });
   *
   * console.log(view.element.toDataURL('image/png').substring(0, 32));
   */
  get crossOrigin(): string {
    const image = this._image
    return image && image.crossOrigin || this._crossOrigin || ''
  }

  set crossOrigin(crossOrigin: string) {
    this._crossOrigin = crossOrigin
    const image = this._image
    if (image) {
      image.crossOrigin = crossOrigin
    }
  }

  /**
   * Determines if the raster is drawn with pixel smoothing when scaled up or
   * down, and if so, at which quality its pixels are to be smoothed. The
   * settings of this property control both the `imageSmoothingEnabled` and
   * `imageSmoothingQuality` properties of the `CanvasRenderingContext2D`
   * interface.
   *
   * By default, smoothing is enabled at `'low'` quality. It can be set to of
   * `'off'` to scale the raster's pixels by repeating the nearest neighboring
   * pixels, or to `'low'`, `'medium'` or `'high'` to control the various
   * degrees of available image smoothing quality.
   *
   * For backward compatibility, it can can also be set to `false` (= `'off'`)
   * or `true` (= `'low'`).
   *
   * @default 'low'
   * @values 'low', 'medium', 'high', 'off'
   *
   * @example {@paperscript} var raster = new Raster({source:
   * 'http://assets.paperjs.org/images/marilyn.jpg', smoothing: 'off'
   * });
   * raster.scale(5);
   */
  get smoothing(): string {
    return this._smoothing
  }

  set smoothing(smoothing: string | boolean) {
    this._smoothing =
      typeof smoothing === 'string' ? smoothing : smoothing ? 'low' : 'off'
    this._changed(Change.ATTRIBUTE)
  }

  // DOCS: document Raster#element
  get element(): Image {
    // Only return the internal element if the content is actually ready.
    return this._canvas || this._loaded && this._image
  }

  /**
   * Extracts a part of the Raster's content as a sub image, and returns it as
   * a Canvas object.
   *
   * @param rect the boundaries of the sub image in pixel coordinates
   *
   * @return the sub image as a Canvas object
   */
  getSubCanvas(
    rect: RectangleLike | PointLike | number,
    y?: PointLike | SizeLike | number,
    width?: number,
    height?: number
  ): HTMLCanvasElement {
    const area = Rectangle.from(rect, y, width, height)
    const ctx = getContext(area.size)
    ctx.drawImage(
      this.canvas,
      area.x,
      area.y,
      area.width,
      area.height,
      0,
      0,
      area.width,
      area.height
    )
    return ctx.canvas
  }

  /**
   * Extracts a part of the raster item's content as a new raster item, placed
   * in exactly the same place as the original content.
   *
   * @param rect the boundaries of the sub raster in pixel coordinates
   *
   * @return the sub raster as a newly created raster item
   */
  getSubRaster(
    rect: RectangleLike | PointLike | number,
    y?: PointLike | SizeLike | number,
    width?: number,
    height?: number
  ): Raster {
    const area = Rectangle.from(rect, y, width, height)
    const raster = new Raster(Item.NO_INSERT)
    raster._setImage(this.getSubCanvas(area))
    raster.translate(area.center.subtract(this.size.divide(2)))
    raster._matrix.prepend(this._matrix)
    raster.insertAbove(this)
    return raster
  }

  /**
   * Returns a Base 64 encoded `data:` URL representation of the raster.
   * If the raster shows an image that was loaded from a `data:` URL, that
   * URL is returned unchanged. Otherwise, the arguments are passed on to
   * `HTMLCanvasElement#toDataURL()` of the raster's {@link #canvas}.
   * In web-workers, where the canvas is an `OffscreenCanvas`, this is not
   * supported, and neither are {@link #source} and exporting the raster to
   * JSON, which rely on it. Use the canvas' asynchronous `convertToBlob()`
   * there instead.
   *
   * @param [type='image/png'] the image format to encode
   * @param [quality] the image quality between `0` and `1`, for formats that
   *     use lossy compression, such as `'image/jpeg'`
   * @return the `data:` URL of the raster
   */
  toDataURL(type?: string, quality?: number): string {
    // See if the linked image is base64 encoded already, if so reuse it,
    // otherwise try using canvas.toDataURL()
    const src = this._image?.src
    if (/^data:/.test(src)) {
      return src
    }
    const { canvas } = this
    return canvas ? canvas.toDataURL(type, quality) : null
  }

  /**
   * Draws an image on the raster.
   *
   * @param image
   * @param point the offset of the image as a point in pixel coordinates
   */
  drawImage(image: CanvasImageSource, point: PointLike) {
    const { x, y } = Point.from(point)
    this._getContext(true).drawImage(image, x, y)
  }

  /**
   * Calculates the average color of the image within the given path,
   * rectangle or point. This can be used for creating raster image effects.
   *
   * @param object
   * @return the average color contained in the area covered by the specified
   *     path, rectangle or point
   */
  getAverageColor(object?: PathItem | RectangleLike | PointLike): Color | null {
    let bounds: Rectangle
    let path: PathItem
    if (!object) {
      bounds = this.bounds
    } else if (object instanceof PathItem) {
      // TODO: What if the path is smaller than 1 px?
      // TODO: How about rounding of bounds.size?
      path = object
      bounds = object.bounds
    } else if (typeof object === 'object') {
      if ('width' in object) {
        bounds = new Rectangle(object)
      } else if ('x' in object) {
        // Create a rectangle of 1px size around the specified point.
        const { x, y } = object as { x: number; y: number }
        bounds = new Rectangle(x - 0.5, y - 0.5, 1, 1)
      }
    }
    if (!bounds) {
      return null
    }
    // Use a sample size of max 32 x 32 pixels, into which the path is scaled
    // as a clipping path, and then the actual image is drawn in and sampled.
    const sampleSize = 32
    const width = Math.min(bounds.width, sampleSize)
    const height = Math.min(bounds.height, sampleSize)
    let ctx = sampleContext
    if (!ctx) {
      ctx = sampleContext = getContext(new Size(sampleSize))
    } else {
      // Clear the sample canvas:
      ctx.clearRect(0, 0, sampleSize + 1, sampleSize + 1)
    }
    ctx.save()
    // Scale the context so that the bounds ends up at the given sample size
    const matrix = new Matrix()
      .scale(width / bounds.width, height / bounds.height)
      .translate(-bounds.x, -bounds.y)
    matrix.applyToContext(ctx)
    // If a path was passed, draw it as a clipping mask:
    if (path) {
      path.draw(ctx, { clip: true, matrices: [matrix] })
    }
    // Now draw the image clipped into it.
    this._matrix.applyToContext(ctx)
    const { element } = this
    const size = this._size
    if (element) {
      ctx.drawImage(element, -size.width / 2, -size.height / 2)
    }
    ctx.restore()
    // Get pixel data from the context and calculate the average color value
    // from it, taking alpha into account.
    const pixels = ctx.getImageData(
      0.5,
      0.5,
      Math.ceil(width),
      Math.ceil(height)
    ).data
    const channels = [0, 0, 0]
    let total = 0
    for (let i = 0, l = pixels.length; i < l; i += 4) {
      let alpha = pixels[i + 3]
      total += alpha
      alpha /= 255
      channels[0] += pixels[i] * alpha
      channels[1] += pixels[i + 1] * alpha
      channels[2] += pixels[i + 2] * alpha
    }
    for (let i = 0; i < 3; i++) {
      channels[i] /= total
    }
    return total ? new Color(channels) : null
  }

  /**
   * {@grouptitle Pixels}
   * Gets the color of a pixel in the raster.
   *
   * @param x the x offset of the pixel in pixel coordinates
   * @param y the y offset of the pixel in pixel coordinates
   * @return the color of the pixel
   */
  getPixel(x: number, y: number): Color
  /**
   * Gets the color of a pixel in the raster.
   *
   * @param point the offset of the pixel as a point in pixel coordinates
   * @return the color of the pixel
   */
  getPixel(point: PointLike): Color
  getPixel(point: PointLike | number, y?: number): Color {
    const { x, y: top } = Point.from(point, y)
    const { data } = this.context.getImageData(x, top, 1, 1)
    // Alpha is separate now:
    return new Color(
      'rgb',
      [data[0] / 255, data[1] / 255, data[2] / 255],
      data[3] / 255
    )
  }

  /**
   * Sets the color of the specified pixel to the specified color.
   *
   * @param x the x offset of the pixel in pixel coordinates
   * @param y the y offset of the pixel in pixel coordinates
   * @param color the color that the pixel will be set to
   */
  setPixel(x: number, y: number, color: ColorLike): void
  /**
   * Sets the color of the specified pixel to the specified color.
   *
   * @param point the offset of the pixel as a point in pixel coordinates
   * @param color the color that the pixel will be set to
   */
  setPixel(point: PointLike, color: ColorLike): void
  setPixel(
    point: PointLike | number,
    y: number | ColorLike,
    color?: ColorLike
  ) {
    const hasCoordinates = typeof point === 'number'
    const offset = hasCoordinates
      ? new Point(point, y as number)
      : Point.from(point)
    const pixelColor = Color.from(hasCoordinates ? color : y)
    const components = pixelColor._convert('rgb')
    const ctx = this._getContext(true)
    const imageData = ctx.createImageData(1, 1)
    const { data } = imageData
    data[0] = components[0] * 255
    data[1] = components[1] * 255
    data[2] = components[2] * 255
    data[3] = pixelColor.alpha * 255
    ctx.putImageData(imageData, offset.x, offset.y)
  }

  /**
   * Clears the image, if it is backed by a canvas.
   */
  // @override, clearing the pixels instead of the children
  clear(): undefined {
    const size = this._size
    this._getContext(true).clearRect(0, 0, size.width + 1, size.height + 1)
  }

  // DOCS: document Raster#createImageData
  /**
   * {@grouptitle Image Data}
   * @param size
   */
  createImageData(size: SizeLike | number, height?: number): ImageData {
    const { width, height: imageHeight } = Size.from(size, height)
    return this.context.createImageData(width, imageHeight)
  }

  /**
   * Returns the image data of the pixels within the specified rectangle, or
   * of the whole raster if no rectangle or an empty one is passed.
   *
   * @param [rect] the area of the raster to get the image data of, in pixel
   *     coordinates
   * @return the image data of the specified area
   */
  getImageData(
    rect?: RectangleLike | PointLike | number,
    y?: PointLike | SizeLike | number,
    width?: number,
    height?: number
  ): ImageData {
    let area = Rectangle.from(rect, y, width, height)
    if (area.isEmpty()) {
      area = new Rectangle(this._size)
    }
    return this.context.getImageData(
      area.x,
      area.y,
      area.width,
      area.height
    )
  }

  // DOCS: document Raster#putImageData
  /**
   * @param data
   * @param point
   */
  putImageData(data: ImageData, point: PointLike) {
    const { x, y } = Point.from(point)
    this._getContext(true).putImageData(data, x, y)
  }

  // DOCS: document Raster#setImageData
  /**
   * @param data
   */
  setImageData(data: ImageData) {
    this._setSize(data)
    this._getContext(true).putImageData(data, 0, 0)
  }

  _getBounds(matrix: Matrix, _options?: BoundsOptions): Rectangle {
    const { width, height } = this._size
    const rect = new Rectangle(-width / 2, -height / 2, width, height)
    return matrix ? matrix._transformBounds(rect) : rect
  }

  _hitTestSelf(point: Point): HitResult | undefined {
    if (this._contains(point)) {
      return new HitResult('pixel', this, {
        offset: point.add(this._size.divide(2)).round()
      })
    }
  }

  _draw(ctx: CanvasRenderingContext2D, param: any, viewMatrix: Matrix) {
    const { element } = this
    if (param.dontFinish || param.clip) {
      // Clip with the raster's rectangle (#1845):
      const rect = this.internalBounds
      if (!param.dontStart) {
        ctx.beginPath()
      }
      ctx.rect(rect.x, rect.y, rect.width, rect.height)
    } else if (element && element.width > 0 && element.height > 0) {
      // Only draw if image is not empty (#1320).
      // Handle opacity for Rasters separately from the rest, since Rasters
      // never draw a stroke. See Item#draw().
      ctx.globalAlpha = clamp(this._opacity, 0, 1)

      // Call _setStyles() to make sure shadow is drawn (#1437).
      this._setStyles(ctx, param, viewMatrix)

      // `Raster#smoothing` controlls both the `imageSmoothingQuality` and
      // `imageSmoothingEnabled` canvas context properties:
      const smoothing = this._smoothing
      if (smoothing === 'off') {
        ctx.imageSmoothingEnabled = false
      } else {
        ctx.imageSmoothingQuality = smoothing as ImageSmoothingQuality
      }

      ctx.drawImage(element, -this._size.width / 2, -this._size.height / 2)
    }
  }

  _canComposite(): boolean {
    return true
  }

  static {
    Object.assign(this.prototype, {
      _applyMatrix: false,
      _canApplyMatrix: false,
      // Raster doesn't make the distinction between the different bounds,
      // so use the same name for all of them
      _boundsOptions: { stroke: false, handle: false },
      _serializeFields: {
        ...Item.prototype._serializeFields,
        crossOrigin: null, // NOTE: Needs to be set before source to work!
        // The size comes before the source, so versions that don't treat it
        // as a placeholder, see #set(), apply it before the source too:
        size: new Size(),
        source: null
      },
      // Prioritize `crossOrigin` over `source`:
      _prioritize: ['crossOrigin'],
      _smoothing: 'low'
    })
  }
}

// The members defined at runtime rather than in the class body:
export interface Raster {
  /**
   * {@grouptitle Event Handlers}
   *
   * The event handler function to be called when the underlying image has
   * finished loading and is ready to be used. This is also triggered when
   * the image is already loaded, or when a canvas is used instead of an
   * image.
   *
   * @example
   * var url = 'http://assets.paperjs.org/images/marilyn.jpg';
   * var raster = new Raster(url);
   *
   * // If you create a Raster using a url, you can use the onLoad
   * // handler to do something once it is loaded:
   * raster.onLoad = function() {
   *     console.log('The image has finished loading.');
   * };
   *
   * // As with all events in paper.js, you can also use this notation instead
   * // to install multiple handlers:
   * raster.on('load', function() {
   *     console.log('Now the image is definitely ready.');
   * });
   */
  get onLoad(): Handler | null
  set onLoad(func: Handler | null)

  /**
   *
   * The event handler function to be called when there is an error loading
   * the underlying image.
   */
  get onError(): Handler | null
  set onError(func: Handler | null)
}
