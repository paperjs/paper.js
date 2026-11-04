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

import {
  CanvasView,
  Change,
  Emitter,
  Item,
  Key,
  KeyEvent,
  LinkedPoint,
  LinkedSize,
  Matrix,
  MouseEvent,
  PaperScope,
  Point,
  Rectangle,
  Size,
  addEvents,
  defineEvents,
  getContext,
  getDocument,
  getEventOffset,
  getInsets,
  getOffset,
  getSize,
  getStyles,
  getWindow,
  handleKey,
  inject,
  installKeyEvents,
  isInView,
  isInserted,
  paper,
  releaseCanvas,
  removeEvents,
  requestFrame,
  setPrefixed
} from '../internal.ts'
import type { PointLike } from '../basic/Point.ts'
import type { SizeLike } from '../basic/Size.ts'
import type { RectangleLike } from '../basic/Rectangle.ts'
import type { Project } from '../item/Project.ts'

// The Stats.js library, if the page loads it, see the `stats` attribute:
declare const Stats: any

type Handler = (this: View, ...args: any[]) => any

type MouseHandler = ((this: View, event: MouseEvent) => any) | null

type KeyHandler = ((this: View, event: KeyEvent) => any) | null

type Listener = (event: any) => void

type FrameEvent = { delta: number; time: number; count: number }

/**
 * The View object wraps an HTML element and handles drawing and user
 * interaction through mouse and keyboard for it. It offer means to scroll the
 * view, find the currently visible bounds in project coordinates, or the
 * center, both useful for constructing artwork that should appear centered on
 * screen.
 *
 * If the canvas element has a `resize` or `data-paper-resize` attribute, the
 * view adjusts its size to the size of the element whenever the window is
 * resized. The element itself needs to be sized through CSS, e.g. with
 * `html, body { height: 100%; }` and `canvas[resize] { width: 100%; height:
 * 100%; }` for a canvas that fills the window. Without such CSS, the view does
 * not follow the window, and on HiDPI screens it grows with each resize.
 * Without the attribute, the view sets the element's CSS width and height to
 * its own size, see {@link #viewSize}.
 */
export class View extends Emitter {
  // The view that receives keyboard input, see Key:
  static _focused: View = null

  _project: Project
  _element: HTMLCanvasElement
  // The context of the element, which also measures text, see getTextWidth():
  _context: CanvasRenderingContext2D
  _pixelRatio: number
  _viewSize: Size
  _matrix: Matrix
  _autoUpdate: boolean
  _needsUpdate = false
  _requested = false
  // Count the installed native and virtual item events,
  // see #_countItemEvent():
  _itemEvents = { native: {}, virtual: {} }
  #scope: PaperScope
  #id: string
  #windowEvents: Record<string, Listener>
  #stats: any
  #bounds: Rectangle
  #decomposed: ReturnType<Matrix['decompose']>
  // Items that need the onFrame handler called on them
  #frameItems: Record<string, { item: Item; time: number; count: number }> = {}
  #frameItemCount = 0
  #animate = false
  #time = 0
  #count = 0
  #last: number

  constructor(project: Project, element: HTMLCanvasElement | SizeLike) {
    super()
    // Install the DOM's listeners and the item events with the first view:
    installEvents()
    const window = getWindow()
    let size: Size
    if (window && element) {
      const canvas = element as HTMLCanvasElement

      const getSizeAttribute = (name: 'width' | 'height') => (
        canvas[name] || parseInt(canvas.getAttribute(name), 10)
      )

      const getCanvasSize = () => {
        // Try the CSS size first, since that will help handling previously
        // scaled canvases (e.g. when dealing with pixel-ratio), without the
        // padding and border (#1160, #2033), and without the transforms of
        // ancestors, which only scale the canvas on screen:
        const size = new Size(canvas.offsetWidth, canvas.offsetHeight)
        return size.isNaN() || size.isZero()
          ? // If the element is invisible, we cannot directly access
            // element.width / height, because they would appear 0.
            // Reading the attributes should still work.
            new Size(getSizeAttribute('width'), getSizeAttribute('height'))
          : size.subtract(getInsets(canvas))
      }

      // Generate an id for this view / element if it does not have one
      this.#id = canvas.getAttribute('id')
      if (this.#id == null) {
        this.#id = `paper-view-${nextId++}`
        canvas.setAttribute('id', this.#id)
      }
      // Install event handlers
      addEvents(canvas, viewEvents)
      // Borrowed from Hammer.js:
      const none = 'none'
      setPrefixed(canvas.style, {
        userDrag: none,
        userSelect: none,
        touchCallout: none,
        tapHighlightColor: 'rgba(0,0,0,0)'
      })

      // If the element has the resize attribute, listen to resize events
      // and update its coordinate space accordingly
      if (PaperScope.hasAttribute(canvas, 'resize')) {
        this.#windowEvents = {
          resize: () => {
            this.viewSize = getCanvasSize()
          }
        }
        addEvents(window, this.#windowEvents)
      }

      size = getCanvasSize()

      if (
        PaperScope.hasAttribute(canvas, 'stats') &&
        typeof Stats !== 'undefined'
      ) {
        this.#stats = new Stats()
        // Align top-left to the element
        const stats = this.#stats.domElement
        const { style } = stats
        const offset = getOffset(canvas)
        style.position = 'absolute'
        style.left = `${offset.x}px`
        style.top = `${offset.y}px`
        getDocument().body.appendChild(stats)
      }
      this._element = canvas
      this._context = canvas.getContext('2d')
      // Hi-DPI Canvas support based on:
      // https://www.html5rocks.com/en/tutorials/canvas/hidpi/
      const hidpi = PaperScope.getAttribute(canvas, 'hidpi')
      this._pixelRatio = /^off|false$/.test(hidpi)
        ? 1
        : window.devicePixelRatio || 1
    } else {
      // For web-workers: Allow calling of `paper.setup(new Size(x, y));`
      size = new Size(element as SizeLike)
      this._element = null
      this._context = null
      this._pixelRatio = 1
    }
    // Store reference to the currently active global paper scope, and the
    // active project, which will be represented by this view
    this._project = project
    this.#scope = project._scope
    // Set canvas size even if we just determined the size from it, since
    // it might have been set to a % size, in which case it would use some
    // default internal size (300x150 on WebKit) and scale up the pixels.
    // We also need this call here for HiDPI support.
    this._setElementSize(size.width, size.height)
    this._viewSize = size
    // Keep track of views internally
    views.push(this)
    // Link this id to our view
    viewsById[this.#id] = this
    this._matrix = new Matrix()
    this._matrix._owner = this
    // Make sure the first view is focused for keyboard input straight away
    View._focused ??= this
    // Do not set _autoUpdate on Node.js by default:
    this._autoUpdate = !paper.agent.node
  }

  /**
   * Removes this view from the project and frees the associated element.
   */
  remove(): boolean {
    if (!this._project) {
      return false
    }
    // Clear focus if removed view had it
    if (View._focused === this) {
      View._focused = null
    }
    // Remove view from internal structures
    views.splice(views.indexOf(this), 1)
    delete viewsById[this.#id]
    // Unlink from project
    const project = this._project
    if (project._view === this) {
      project._view = null
    }
    // Uninstall event handlers again for this view.
    removeEvents(this._element, viewEvents)
    if (this.#windowEvents) {
      removeEvents(getWindow(), this.#windowEvents)
    }
    this._element = this._project = null
    // Remove all onFrame handlers.
    // TODO: Shouldn't we remove all other event handlers, automatically
    this.off('frame')
    this.#animate = false
    this.#frameItems = {}
    return true
  }

  /**
   * Controls whether the view is automatically updated in the next animation
   * frame on changes, or whether you prefer to manually call
   * {@link #update()} or {@link #requestUpdate()} after changes.
   * Note that this is `true` by default, except for Node.js, where manual
   * updates make more sense.
   */
  get autoUpdate(): boolean {
    return this._autoUpdate
  }

  set autoUpdate(autoUpdate: boolean) {
    this._autoUpdate = autoUpdate
    if (autoUpdate) {
      this.requestUpdate()
    }
  }

  /**
   * Updates the view if there are changes. Note that when using built-in
   * event handlers for interaction, animation and load events, this method is
   * invoked for you automatically at the end.
   *
   * @param [force=false] whether to redraw the view even if nothing
   * has changed, e.g. after a web font used by text items has finished
   * loading, also in buffered groups, see {@link Group#buffered}
   * @return {@true if the view was updated}
   */
  // @overridable
  update(force?: boolean): boolean {
    // To be overridden in sub-classes, see CanvasView#update():
    return false
  }

  /**
   * Requests an update of the view if there are changes through the browser's
   * requestAnimationFrame() mechanism for smooth animation. Note that when
   * using built-in event handlers for interaction, animation and load events,
   * updates are automatically invoked for you automatically at the end.
   */
  requestUpdate() {
    // Node.js has no display for frames to update, and frame requests would
    // keep its process running, see exportFrames() for animations there:
    if (!this._requested && !paper.agent.node) {
      requestFrame(() => {
        this._requested = false
        // Only handle the frame and request the next one if we don't
        // need to stop, e.g.  due to a call to pause(), or a request
        // for a single redraw.
        if (this.#animate) {
          // Request next update before handling the current frame
          this.requestUpdate()
          const element = this._element
          // Only keep animating if we're allowed to, based on whether
          // the document is visible and the setting of keepalive. We
          // keep requesting frame regardless though, so the animation
          // picks up again as soon as the view is visible. Views
          // without an element, as in web workers, always animate.
          if (
            !element || (
              (
                !getDocument().hidden ||
                PaperScope.getAttribute(element, 'keepalive') === 'true'
              ) &&
              isInView(element)
            )
          ) {
            this.#handleFrame()
          }
        }
        // Even if we're not animating, update the view now since this
        // might have been a request for a single redraw after a change.
        // NOTE: If nothing has changed (e.g. #handleFrame() wasn't
        // called above), then this does not actually do anything.
        if (this._autoUpdate) {
          this.update()
        }
      })
      this._requested = true
    }
  }

  /**
   * Makes all animation play by adding the view to the request animation
   * loop.
   */
  play() {
    this.#animate = true
    // Request a frame handler straight away to initialize the
    // sequence of onFrame calls.
    this.requestUpdate()
  }

  /**
   * Makes all animation pause by removing the view from the request animation
   * loop.
   */
  pause() {
    this.#animate = false
  }

  #handleFrame() {
    // Set the global paper object to the current scope
    this.#scope.activate()
    const now = Date.now() / 1000
    const delta = this.#last ? now - this.#last : 0
    this.#last = now
    this.emit('frame', {
      // Time elapsed since last frame in seconds:
      delta,
      // Total since first frame in seconds:
      time: (this.#time += delta),
      count: this.#count++
    })
    this.#stats?.update()
  }

  _animateItem(item: Item, animate: boolean) {
    const items = this.#frameItems
    if (animate) {
      items[item._id] = {
        item,
        // Additional information for the event callback
        time: 0,
        count: 0
      }
      if (++this.#frameItemCount === 1) {
        this.on('frame', this.#handleFrameItems)
      }
    } else {
      delete items[item._id]
      if (--this.#frameItemCount === 0) {
        // If this is the last one, just stop animating straight away.
        this.off('frame', this.#handleFrameItems)
      }
    }
  }

  // Handles #frameItems and fires the 'frame' event on them.
  #handleFrameItems(event: FrameEvent) {
    for (const entry of Object.values(this.#frameItems)) {
      entry.item.emit('frame', {
        ...event,
        // Time since first call of frame() in seconds:
        time: (entry.time += event.delta),
        count: entry.count++
      })
    }
  }

  /**
   * Private notifier that is called whenever a change occurs in this view.
   * Used only by Matrix for now.
   */
  _changed() {
    // The only one calling View._changed() is Matrix, so it can only mean
    // one thing:
    this._project._changed(Change.VIEW)
    // Force recalculation of these values next time they are requested.
    this.#bounds = this.#decomposed = undefined
  }

  /**
   * The underlying native element.
   */
  get element(): HTMLCanvasElement {
    return this._element
  }

  /**
   * The project that this view displays.
   */
  get project(): Project {
    return this._project
  }

  /**
   * The scope that this view belongs to.
   */
  get scope(): PaperScope {
    return this.#scope
  }

  /**
   * The ratio between physical pixels and device-independent pixels (DIPs)
   * of the underlying canvas / device.
   * It is `1` for normal displays, and `2` or more for
   * high-resolution displays.
   */
  get pixelRatio(): number {
    return this._pixelRatio
  }

  /**
   * The resolution of the underlying canvas / device in pixel per inch (DPI).
   * It is `72` for normal displays, and `144` for high-resolution
   * displays with a pixel-ratio of `2`.
   */
  get resolution(): number {
    return this._pixelRatio * 72
  }

  /**
   * The size of the view. Changing the view's size will resize it's
   * underlying element.
   */
  get viewSize(): Size {
    const { width, height } = this._viewSize
    return new LinkedSize(width, height, this, 'viewSize')
  }

  set viewSize(size: SizeLike) {
    const viewSize = Size.from(size)
    const delta = viewSize.subtract(this._viewSize)
    if (!delta.isZero()) {
      this._setElementSize(viewSize.width, viewSize.height)
      this._viewSize.set(viewSize)
      this._changed()
      // Emit resize event on any size changes.
      this.emit('resize', { size: viewSize, delta })
      if (this._autoUpdate) {
        // Update right away, don't wait for the next animation frame as
        // otherwise the view would flicker during resizes, see #1126
        this.update()
      }
    }
  }

  /**
   * Private method, overridden in CanvasView for HiDPI support.
   */
  _setElementSize(width: number, height: number) {
    const element = this._element
    if (element) {
      if (element.width !== width) {
        element.width = width
      }
      if (element.height !== height) {
        element.height = height
      }
    }
  }

  /**
   * The bounds of the currently visible area in project coordinates.
   * Setting them fits the view to the given rectangle, as
   * {@link #fitBounds(rectangle)} does. Since the view keeps its aspect
   * ratio, the bounds read back can be larger than the rectangle in one
   * direction.
   */
  get bounds(): Rectangle {
    this.#bounds ??= this._matrix
      .inverted()
      ._transformBounds(new Rectangle(new Point(), this._viewSize))
    return this.#bounds
  }

  set bounds(rect: RectangleLike) {
    this.fitBounds(rect)
  }

  /**
   * The size of the visible area in project coordinates.
   */
  get size(): Size {
    return this.bounds.size
  }

  /**
   * Checks whether the view is currently visible within the current browser
   * viewport.
   *
   * @return {@true if the view is visible}
   */
  isVisible(): boolean {
    return isInView(this._element)
  }

  /**
   * Checks whether the view is inserted into the browser DOM.
   *
   * @return  {@true if the view is inserted}
   */
  isInserted(): boolean {
    return isInserted(this._element)
  }

  // Converts the provide size in any of the units allowed in the browser to
  // pixels. Text is measured with a canvas context: the view's own, or one
  // from the canvas provider, which also works in workers with an
  // OffscreenCanvas. Without either, sizes are read as pixels, and text has no
  // width.
  getPixelSize(size: string): number {
    const { agent } = paper
    const element = this._element
    let ctx: CanvasRenderingContext2D
    let pixels: number
    if (element && agent?.firefox) {
      // Firefox doesn't convert context.font sizes to pixels, so use the
      // DOM there, which still doesn't work in workers:
      const parent = element.parentNode
      const temp = getDocument().createElement('div')
      temp.style.fontSize = size
      parent.appendChild(temp)
      pixels = parseFloat(getStyles(temp).fontSize)
      parent.removeChild(temp)
    } else if ((ctx = this._context || getContext(1, 1))) {
      const prevFont = ctx.font
      ctx.font = `${size} serif`
      pixels = parseFloat(ctx.font)
      ctx.font = prevFont
      if (ctx !== this._context) {
        releaseCanvas(ctx)
      }
    } else {
      pixels = parseFloat(size)
    }
    return pixels
  }

  getTextWidth(
    font: string,
    lines: string[],
    letterSpacing: string,
    direction?: string
  ): number {
    const ctx = this._context ?? getContext(1, 1)
    let width = 0
    if (ctx) {
      const prevFont = ctx.font
      const prevLetterSpacing = ctx.letterSpacing
      const prevDirection = ctx.direction
      // Shaping can differ by direction, as with mirrored brackets:
      const textDirection = (direction || 'ltr') as CanvasDirection
      ctx.font = font
      ctx.letterSpacing = letterSpacing
      if (prevDirection !== textDirection) {
        ctx.direction = textDirection
      }
      // Measure the real width of the text:
      for (const line of lines) {
        width = Math.max(width, ctx.measureText(line).width)
      }
      ctx.font = prevFont
      ctx.letterSpacing = prevLetterSpacing
      if (prevDirection !== textDirection) {
        ctx.direction = prevDirection
      }
      if (ctx !== this._context) {
        releaseCanvas(ctx)
      }
    }
    return width
  }

  getFontMetrics(font: string): { ascent: number; descent: number } | null {
    const ctx = this._context ?? getContext(1, 1)
    let metrics = null
    if (ctx) {
      const prevFont = ctx.font
      ctx.font = font
      // Browsers tell the font's own ascent and descent, node-canvas
      // those of its em box:
      const measured = ctx.measureText('H') as TextMetrics & {
        emHeightAscent?: number
        emHeightDescent?: number
      }
      let ascent = measured.fontBoundingBoxAscent
      let descent = measured.fontBoundingBoxDescent
      if (ascent === undefined) {
        ascent = measured.emHeightAscent
        descent = measured.emHeightDescent
      }
      if (ascent !== undefined) {
        metrics = { ascent, descent }
      }
      ctx.font = prevFont
      if (ctx !== this._context) {
        releaseCanvas(ctx)
      }
    }
    return metrics
  }

  #decompose() {
    this.#decomposed ??= this._matrix.decompose()
    return this.#decomposed
  }

  /**
   * {@grouptitle Transform Functions}
   *
   * Translates (scrolls) the view by the given offset vector.
   *
   * @param delta the offset to translate the view by
   */
  translate(delta: PointLike | number, y?: number) {
    this.transform(new Matrix().translate(Point.from(delta, y)))
  }

  /**
   * The center of the visible area in project coordinates.
   */
  get center(): Point {
    return this.bounds.center
  }

  set center(center: PointLike) {
    this.translate(this.center.subtract(Point.from(center)))
  }

  /**
   * The view's zoom factor by which the project coordinates are magnified.
   * Setting it to a value that isn't a positive number has no effect.
   *
   * @see #scaling
   */
  get zoom(): number {
    const { scaling } = this.#decompose()
    // Use average since it can be non-uniform, and ignore mirroring.
    return (Math.abs(scaling.x) + Math.abs(scaling.y)) / 2
  }

  set zoom(zoom: number) {
    // Zooming to 0 can't be undone and leaves the view's matrix without an
    // inverse (#1433):
    if (zoom > 0 && isFinite(zoom)) {
      this.transform(new Matrix().scale(zoom / this.zoom, this.center))
    }
  }

  /**
   * The current rotation angle of the view, as described by its
   * {@link #matrix}.
   */
  get rotation(): number {
    return this.#decompose().rotation
  }

  set rotation(rotation: number) {
    const current = this.rotation
    if (current != null && rotation != null) {
      // Rotate around the center in view coordinates, so the rotation
      // adds to the decomposed one, also on mirrored views (#1893):
      this._matrix.prepend(
        new Matrix().rotate(
          rotation - current,
          this.projectToView(this.center)
        )
      )
    }
  }

  /**
   * The current scale factor of the view, as described by its
   * {@link #matrix}.
   *
   * @see #zoom
   */
  get scaling(): Point {
    const { scaling } = this.#decompose()
    return new LinkedPoint(scaling.x, scaling.y, this, 'scaling')
  }

  set scaling(scaling: PointLike) {
    if (scaling != null) {
      const current = this.scaling
      const { x, y } = Point.from(scaling)
      this.scale(x / current.x, y / current.y)
    }
  }

  /**
   * The view's transformation matrix, defining the view onto the project's
   * contents (position, zoom level, rotation, etc).
   */
  get matrix(): Matrix {
    return this._matrix
  }

  set matrix(matrix: Matrix | number[]) {
    // Use Matrix#set() to easily copy over values.
    // NOTE: calling set() also calls #_changed() for us.
    this._matrix.set(matrix)
  }

  /**
   * Transform the view.
   *
   * @param matrix the matrix by which the view shall be transformed
   */
  transform(matrix: Matrix) {
    this._matrix.append(matrix)
  }

  /**
   * Transform the view so that the specified rectangle is centered in it
   * and fitted to it as described by `fit`, keeping the view's rotation and
   * mirroring.
   *
   * @param rectangle the rectangle to fit, in project
   * coordinates
   * @param [fit='contain'] how to fit the rectangle, as in CSS's
   * `object-fit`: `'contain'` shows all of it, and `'cover'` fills the
   * whole view with it, cropping the parts that don't fit
   *
   * @example {@paperscript height=100}
   * // Fitting the view to the bounds of an item:
   *
   * // Create a circle shaped path around the top left corner of the view:
   * var path = new Path.Circle({
   *     center: [0, 0],
   *     radius: 50,
   *     fillColor: 'orange'
   * });
   *
   * // Make the view show the whole circle:
   * view.fitBounds(path.bounds);
   */
  fitBounds(rectangle: RectangleLike, fit?: 'contain' | 'cover') {
    const rect = Rectangle.from(rectangle)
    // Compare the rectangle with the view in view coordinates, so that
    // rotated views show all of it as well, and scale both axes of the view
    // to the same amount, so that the rectangle keeps its aspect ratio,
    // also if the view was stretched before:
    const matrix = this._matrix
    const size = this._viewSize
    const bounds = matrix._transformBounds(rect)
    const scaleX = new Point(matrix._a, matrix._c).length
    const scaleY = new Point(matrix._b, matrix._d).length
    // Empty sides of the rectangle give ratios of Infinity, which can't
    // scale the view, so only use the others:
    const ratios = [
      size.width / bounds.width * scaleX,
      size.height / bounds.height * scaleY
    ].filter(ratio => ratio > 0 && isFinite(ratio))
    this.center = rect.center
    if (ratios.length) {
      const amount = fit === 'cover' ? Math.max(...ratios) : Math.min(...ratios)
      // Scale around the view's center in view coordinates, along the
      // view's own axes:
      matrix.prepend(
        new Matrix().scale(
          new Point(amount / scaleX, amount / scaleY),
          size.divide(2)
        )
      )
    }
  }

  // TODO: getInvalidBounds
  // TODO: invalidate(rect)
  // TODO: style: artwork / preview / raster / opaque / ink
  // TODO: getShowGrid
  // TODO: getMousePoint
  // TODO: projectToView(rect)

  /**
   * Converts the passed point from project coordinate space to view
   * coordinate space, which is measured in browser pixels in relation to the
   * position of the view element.
   *
   * @param point the point in project coordinates to be converted
   * @return the point converted into view coordinates
   */
  projectToView(point: PointLike | number, y?: number): Point {
    return this._matrix._transformPoint(Point.from(point, y))
  }

  /**
   * Converts the passed point from view coordinate space to project
   * coordinate space.
   *
   * @param point the point in view coordinates to be converted
   * @return the point converted into project coordinates
   */
  viewToProject(point: PointLike | number, y?: number): Point {
    return this._matrix._inverseTransform(Point.from(point, y))
  }

  /**
   * Determines and returns the event location in project coordinate space.
   *
   * @param event the native event object for which to determine the
   *     location.
   * @return the event point in project coordinates.
   */
  getEventPoint(event: globalThis.MouseEvent | TouchEvent): Point {
    const element = this._element
    let offset = getEventOffset(event, element)
    const size = getSize(element)
    // Map the offset on screen, with CSS sizes and transforms applied, to
    // the content box in view coordinates (#549, #1729). Elements that
    // aren't rendered have no size to map from:
    if (!size.isZero()) {
      const cssSize = new Size(element.offsetWidth, element.offsetHeight)
      offset = offset
        .multiply(cssSize.divide(size))
        .subtract(getInsets(element, true))
        .multiply(this.viewSize.divide(cssSize.subtract(getInsets(element))))
    }
    return this.viewToProject(offset)
  }

  /**
   * Handles a mouse event that the host provides, for hosts without a
   * DOM, such as workers, or with their own event source. It runs the
   * same handling as the DOM's mouse events: the active tool's handlers,
   * with {@link Tool#minDistance} and the like, then those of the items
   * under the point and of the view, including the events that Paper.js
   * derives itself: `'mousedrag'`, `'click'`, `'doubleclick'`,
   * `'mouseenter'` and `'mouseleave'`. Points outside the view's bounds
   * are handled too, since the host decides which events belong to its
   * drawing surface.
   *
   * @option [options.modifiers] {Object} the state of the modifier keys,
   *     see {@link Key#modifiers}
   * @option [options.button=0] {Number} the mouse button
   * @option [options.time=Date.now() / 1000] {Number} the time of the
   *     event in seconds, see {@link Event#time}
   *
   * @param type the type of the event: {@values 'mousedown',
   *     'mousemove', 'mouseup'}
   * @param point the location of the mouse in project coordinates
   * @param [options] the details of the event
   * @return {@true if a handler prevented the event's default}
   */
  dispatchMouseEvent(
    type: string,
    point: PointLike,
    options: DispatchOptions & { button?: number } = {}
  ): boolean {
    if (!/^mouse(down|move|up)$/.test(type)) {
      throw new Error(`Unknown mouse event type: '${type}'.`)
    }
    const event = createEvent(type, options)
    // Track presses and drags as the DOM events do:
    if (type === 'mousedown') {
      View._focused = this
      mouseDown = dragging = true
    }
    this._handleMouseEvent(type, event, new Point(point), true)
    if (type === 'mouseup') {
      mouseDown = dragging = false
    }
    return event.defaultPrevented
  }

  /**
   * Handles a key event that the host provides, for hosts without a DOM,
   * such as workers, or with their own event source. It updates
   * {@link Key#modifiers} and {@link Key#isDown(key)}, and calls the
   * view's and the active tool's handlers, as the DOM's key events do.
   *
   * @option [options.character] {String} the character that the key
   *     produces. By default, keydown takes the key itself if it is a
   *     single character, the space, carriage return and tab characters
   *     for 'space', 'enter' and 'tab', and keyup the character of its
   *     keydown
   * @option [options.modifiers] {Object} the state of the modifier keys,
   *     see {@link Key#modifiers}
   * @option [options.time=Date.now() / 1000] {Number} the time of the
   *     event in seconds, see {@link Event#time}
   *
   * @param type the type of the event: {@values 'keydown',
   *     'keyup'}
   * @param key the key, as in {@link KeyEvent#key}
   * @param [options] the details of the event
   */
  dispatchKeyEvent(
    type: string,
    key: string,
    options: DispatchOptions & { character?: string } = {}
  ) {
    if (!/^key(down|up)$/.test(type)) {
      throw new Error(`Unknown key event type: '${type}'.`)
    }
    handleKey(
      type === 'keydown',
      key,
      options.character,
      createEvent(type, options),
      this
    )
  }

  /**
   * Private method to handle mouse events, and delegate to items and
   * tools.
   */
  _handleMouseEvent(
    type: string,
    event: any,
    point?: Point,
    dispatched?: boolean
  ) {
    const itemEvents = this._itemEvents
    // Look up hitItems, which tells us whether a given native mouse
    // event requires an item hit-test or not, before changing type
    // to the virtual value (e.g. mousemove -> mousedrag):
    const hitItems = itemEvents.native[type]
    const nativeMove = type === 'mousemove'
    const { tool } = this.#scope

    const responds = (type: string) => (
      itemEvents.virtual[type] || this.responds(type) || tool?.responds(type)
    )

    // Whether the press needs its default prevented for the events
    // that follow it: the view's or the tool's mouseup, or those of the
    // hit item and its ancestors. Presses elsewhere are left to the
    // browser, so touches can scroll the page (#1930):
    const needsUp = (hitItem: Item) => {
      if (this.responds('mouseup') || tool?.responds('mouseup')) {
        return true
      }
      for (let item = hitItem; item; item = item._parent) {
        for (const key in itemEventsMap.mouseup) {
          if (item.responds(key)) {
            return true
          }
        }
      }
      return false
    }

    // DOM events know the state of the modifier keys, also of those
    // pressed or released while the page didn't have the focus, so no
    // key event told us about them (#1140):
    if (event.shiftKey !== undefined) {
      Object.assign(Key.modifiers, {
        shift: event.shiftKey,
        control: event.ctrlKey,
        alt: event.altKey,
        meta: event.metaKey
      })
    }
    // If it's a native mousemove event but the mouse is down, and at
    // least one of the events responds to mousedrag, convert to it.
    // NOTE: emitMouseEvent(), as well as Tool#_handleMouseEvent() fall
    // back to mousemove if the objects don't respond to mousedrag.
    if (nativeMove && dragging && responds('mousedrag')) {
      type = 'mousedrag'
    }
    point ??= this.getEventPoint(event)

    // The moves come from the whole document, so outside of drags, the
    // pointer is only over the view when no other element covers it,
    // such as a menu (#992). Its own element and its ancestors don't:
    const { target } = event
    const isCovered = (
      nativeMove &&
      !dragging &&
      target?.nodeType === 1 &&
      !target.contains(this._element)
    )
    const inView = (
      dispatched ||
      !isCovered && this.bounds.contains(point)
    )
    // Run the hit-test on items first, but only if we're required
    // to do so for this given mouse event, see hitItems and
    // #_countItemEvent():
    const hit = (
      hitItems &&
      inView &&
      this._project.hitTest(point, {
        tolerance: this.#scope.settings.hitTolerance,
        fill: true,
        stroke: true
      })
    )
    const hitItem: Item = hit?.item ?? null
    // Keep track if view event should be handled, so we can use it
    // to decide if tool._handleMouseEvent() shall be called after.
    let handle = false
    // Create a simple lookup object to quickly check for different
    // mouse event types.
    const mouse: Record<string, boolean> = { [type.slice(5)]: true }

    // Handle mouseenter / leave between items and views first.
    if (hitItems && hitItem !== overItem) {
      if (overItem) {
        emitMouseEvent(overItem, null, 'mouseleave', event, point)
      }
      if (hitItem) {
        emitMouseEvent(hitItem, null, 'mouseenter', event, point)
      }
      overItem = hitItem
    }
    // Handle mouseenter / leave on the view.
    if (wasInView !== inView) {
      emitMouseEvent(
        this,
        null,
        inView ? 'mouseenter' : 'mouseleave',
        event,
        point
      )
      handle = true // To include the leaving move.
    }
    // Now handle the mousemove / mousedrag event.
    // Always call the view's mouse handlers first, as required by
    // CanvasView, and then handle the active tool after, if any.
    // mousedrag is allowed to leave the view and still triggers events,
    // but do not trigger two subsequent even with the same location.
    if ((inView || mouse.drag) && !point.equals(lastPoint)) {
      // Handle mousemove even if this is not actually a mousemove
      // event but the mouse has moved since the last event.
      emitMouseEvents(
        this,
        hitItem,
        nativeMove ? type : 'mousemove',
        event,
        point,
        lastPoint
      )
      handle = true
    }
    wasInView = inView
    // Now handle mousedown / mouseup
    // We emit mousedown only when in the view, and mouseup regardless,
    // as long as the mousedown event was inside.
    if (mouse.down && inView || mouse.up && downPoint) {
      emitMouseEvents(this, hitItem, type, event, point, downPoint)
      if (mouse.down) {
        // See if we're clicking again on the same item, within the
        // double-click time and distance, measured from mousedown
        // to mousedown like native dblclick events, but not for a
        // third click. Firefox uses 300ms as the max time
        // difference:
        const time = Date.now()
        dblClick = (
          !dblClick &&
          hitItem === clickItem &&
          time - clickTime < 300 &&
          point.getDistance(downPoint) < 3
        )
        downItem = clickItem = hitItem
        clickTime = time
        // Only start dragging if the mousedown event has not
        // prevented the default, and if the hitItem or any of its
        // parents actually respond to mousedrag events.
        if (!prevented && hitItem) {
          let item = hitItem
          while (item && !item.responds('mousedrag')) {
            item = item._parent
          }
          if (item) {
            dragItem = hitItem
          }
        }
        downPoint = point
      } else if (mouse.up) {
        // Emulate click / doubleclick, but only on the hit-item,
        // not the view.
        if (!prevented && hitItem === downItem) {
          emitMouseEvents(
            this,
            hitItem,
            dblClick ? 'doubleclick' : 'click',
            event,
            point,
            downPoint
          )
        }
        downItem = dragItem = null
      }
      // Clear wasInView so we're not accidentally handling mousedrag
      // events that started outside the view as mousemove events on
      // the view (needed to handle touch scrolling correctly).
      wasInView = false
      handle = true
    }
    lastPoint = point
    // Now finally call the tool events, but filter mouse move events
    // to only be fired if we're inside the view or if we just left it.
    // Prevent default if at least one handler was called, and none of
    // them enforces default, to prevent scrolling on touch devices.
    if (handle && tool) {
      called = tool._handleMouseEvent(type, event, point, mouse) || called
    }

    // Now call `preventDefault()`, if any of these conditions are met:
    // - If any of the handlers were called, except for mousemove events
    //   which can call `preventDefault()` explicitly or return `false`.
    // - If this is a unhandled mousedown event, but what follows needs
    //   it, see needsUp().
    //
    // Some events are not cancelable anyway (like during a scroll
    // inertia on mobile) so trying to prevent default in those case
    // would result in no effect and an error.
    if (
      event.cancelable !== false &&
      (called && !mouse.move || mouse.down && needsUp(hitItem))
    ) {
      event.preventDefault()
    }
  }

  /**
   * Private method to handle key events.
   */
  _handleKeyEvent(
    type: string,
    event: globalThis.Event,
    key: string,
    character: string
  ) {
    const scope = this.#scope
    const { tool } = scope
    let keyEvent: KeyEvent

    const emit = (obj: View | typeof tool) => {
      if (obj.responds(type)) {
        // Update global reference to this scope.
        scope.activate()
        // Only produce the event object if we really need it.
        keyEvent ??= new KeyEvent(type, event, key, character)
        obj.emit(type, keyEvent)
      }
    }

    // Call the onKeyDown or onKeyUp handler if present
    emit(this)
    if (tool?.responds(type)) {
      emit(tool)
    }
  }

  _countItemEvent(type: string, sign: number) {
    // If the view requires counting of installed mouse events,
    // change the event counters now according to itemEventsMap
    // (defined in the code further below).
    const { native, virtual } = this._itemEvents
    for (const key in itemEventsMap) {
      native[key] = (native[key] || 0) + (itemEventsMap[key][type] || 0) * sign
    }
    // Also update the count of virtual events installed.
    virtual[type] = (virtual[type] || 0) + sign
  }

  static create(
    project: Project,
    element: HTMLCanvasElement | string | SizeLike
  ): View {
    const document = getDocument()
    const canvas =
      document && typeof element === 'string'
        ? (document.getElementById(element) as HTMLCanvasElement)
        : (element as HTMLCanvasElement | SizeLike)
    // Factory to provide the right View subclass for a given element.
    // Produces only CanvasView or View items (for workers) for now:
    const ctor = getWindow() ? CanvasView : View
    return new ctor(project, canvas)
  }

  /**
   * Loops through all views and sets the focus on the first
   * active one.
   */
  static updateFocus() {
    const focused = View._focused
    if (!focused || !focused.isVisible()) {
      // Find the first visible view
      const view = views.find(view => view.isVisible())
      if (view) {
        View._focused = tempFocus = view
      }
    }
  }

  /**
   * Clear all events handling state information. Made for testing
   * purpose, to have a way to start with a fresh state before each
   * test.
   *
   * @private
   */
  static _resetState() {
    dragging = mouseDown = called = wasInView = false
    prevFocus = tempFocus = null
    downPoint = lastPoint = null
    downItem = overItem = dragItem = clickItem = null
    clickTime = null
    dblClick = null
  }

  static {
    defineEvents(this, {
      onFrame: {
        install(this: View) {
          this.play()
        },

        uninstall(this: View) {
          this.pause()
        }
      },
      onResize: {},
      onKeyDown: {},
      onKeyUp: {}
    })

    // Inject the transformations, around the view's center by default:
    for (const key of ['rotate', 'scale', 'shear', 'skew']) {
      inject(this.prototype, {
        [key](this: View, ...args: any[]) {
          // The center follows the angle, the scale, shear or skew point, or
          // their hor and ver values:
          const index = key !== 'rotate' && typeof args[1] === 'number' ? 2 : 1
          args[index] ??= this.center
          this.transform(new Matrix()[key](...args))
        }
      })
    }
  }
}

// The members defined at runtime rather than in the class body:
export interface View {
  /**
   * Rotates the view by a given angle around the given center point.
   *
   * Angles are oriented clockwise and measured in degrees.
   *
   * @param angle the rotation angle
   * @param [center={@link View#center}]
   * @see Matrix#rotate(angle[, center])
   */
  rotate(angle: number, center?: PointLike): void

  /**
   * Scales the view by the given value from its center point, or optionally
   * from a supplied point.
   *
   * @param scale the scale factor
   * @param [center={@link View#center}]
   */
  scale(scale: PointLike | number, center?: PointLike): void
  /**
   * Scales the view by the given values from its center point, or optionally
   * from a supplied point.
   *
   * @param hor the horizontal scale factor
   * @param ver the vertical scale factor
   * @param [center={@link View#center}]
   */
  scale(hor: number, ver: number, center?: PointLike): void

  /**
   * Shears the view by the given value from its center point, or optionally
   * by a supplied point.
   *
   * @param shear the horizontal and vertical shear factors as a point
   * @param [center={@link View#center}]
   * @see Matrix#shear(shear[, center])
   */
  shear(shear: PointLike | number, center?: PointLike): void
  /**
   * Shears the view by the given values from its center point, or optionally
   * by a supplied point.
   *
   * @param hor the horizontal shear factor
   * @param ver the vertical shear factor
   * @param [center={@link View#center}]
   * @see Matrix#shear(hor, ver[, center])
   */
  shear(hor: number, ver: number, center?: PointLike): void

  /**
   * Skews the view by the given angles from its center point, or optionally
   * by a supplied point.
   *
   * @param skew the horizontal and vertical skew angles in degrees
   * @param [center={@link View#center}]
   * @see Matrix#shear(skew[, center])
   */
  skew(skew: PointLike | number, center?: PointLike): void
  /**
   * Skews the view by the given angles from its center point, or optionally
   * by a supplied point.
   *
   * @param hor the horizontal skew angle in degrees
   * @param ver the vertical sskew angle in degrees
   * @param [center={@link View#center}]
   * @see Matrix#shear(hor, ver[, center])
   */
  skew(hor: number, ver: number, center?: PointLike): void

  /**
   * {@grouptitle Event Handlers}
   * Handler function to be called on each frame of an animation.
   * The function receives an event object which contains information about
   * the frame event:
   *
   * @option event.count {Number} the number of times the frame event was
   * fired
   * @option event.time {Number} the total amount of time passed since the
   * first frame event in seconds
   * @option event.delta {Number} the time passed in seconds since the last
   * frame event
   *
   * @see Item#onFrame
   *
   * @example {@paperscript}
   * // Creating an animation:
   *
   * // Create a rectangle shaped path with its top left point at:
   * // {x: 50, y: 25} and a size of {width: 50, height: 50}
   * var path = new Path.Rectangle(new Point(50, 25), new Size(50, 50));
   * path.fillColor = 'black';
   *
   * view.onFrame = function(event) {
   *     // Every frame, rotate the path by 3 degrees:
   *     path.rotate(3);
   * }
   */
  onFrame: ((this: View, event: FrameEvent) => any) | null

  /**
   * Handler function that is called whenever a view is resized.
   *
   * @example
   * // Repositioning items when a view is resized:
   *
   * // Create a circle shaped path in the center of the view:
   * var path = new Path.Circle(view.bounds.center, 30);
   * path.fillColor = 'red';
   *
   * view.onResize = function(event) {
   *     // Whenever the view is resized, move the path to its center:
   *     path.position = view.center;
   * }
   */
  onResize: ((this: View, event: { size: Size; delta: Size }) => any) | null

  /**
   * The function to be called when the mouse button is pushed down on the
   * view. The function receives a {@link MouseEvent} object which contains
   * information about the mouse event.
   * Note that such mouse events bubble up the scene graph hierarchy, reaching
   * the view at the end, unless they are stopped before with {@link
   * Event#stopPropagation()} or by returning `false` from a handler.
   *
   * @see Item#onMouseDown
   */
  onMouseDown: MouseHandler

  /**
   * The function to be called when the mouse position changes while the mouse
   * is being dragged over the view. The function receives a {@link
   * MouseEvent} object which contains information about the mouse event.
   * Note that such mouse events bubble up the scene graph hierarchy, reaching
   * the view at the end, unless they are stopped before with {@link
   * Event#stopPropagation()} or by returning `false` from a handler.
   *
   * @see Item#onMouseDrag
   */
  onMouseDrag: MouseHandler

  /**
   * The function to be called when the mouse button is released over the item.
   * The function receives a {@link MouseEvent} object which contains
   * information about the mouse event.
   *
   * @see Item#onMouseUp
   */
  onMouseUp: MouseHandler

  /**
   * The function to be called when the mouse clicks on the view. The function
   * receives a {@link MouseEvent} object which contains information about the
   * mouse event.
   * Note that such mouse events bubble up the scene graph hierarchy, reaching
   * the view at the end, unless they are stopped before with {@link
   * Event#stopPropagation()} or by returning `false` from a handler.
   *
   * @see Item#onClick
   */
  onClick: MouseHandler

  /**
   * The function to be called when the mouse double clicks on the view. The
   * function receives a {@link MouseEvent} object which contains information
   * about the mouse event.
   * Note that such mouse events bubble up the scene graph hierarchy, reaching
   * the view at the end, unless they are stopped before with {@link
   * Event#stopPropagation()} or by returning `false` from a handler.
   *
   * @see Item#onDoubleClick
   */
  onDoubleClick: MouseHandler

  /**
   * The function to be called repeatedly while the mouse moves over the
   * view. The function receives a {@link MouseEvent} object which contains
   * information about the mouse event.
   * Note that such mouse events bubble up the scene graph hierarchy, reaching
   * the view at the end, unless they are stopped before with {@link
   * Event#stopPropagation()} or by returning `false` from a handler.
   *
   * @see Item#onMouseMove
   */
  onMouseMove: MouseHandler

  /**
   * The function to be called when the mouse moves over the view. This
   * function will only be called again, once the mouse moved outside of the
   * view first. The function receives a {@link MouseEvent} object which
   * contains information about the mouse event.
   * Note that such mouse events bubble up the scene graph hierarchy, reaching
   * the view at the end, unless they are stopped before with {@link
   * Event#stopPropagation()} or by returning `false` from a handler.
   *
   * @see Item#onMouseEnter
   */
  onMouseEnter: MouseHandler

  /**
   * The function to be called when the mouse moves out of the view.
   * The function receives a {@link MouseEvent} object which contains
   * information about the mouse event.
   * Note that such mouse events bubble up the scene graph hierarchy, reaching
   * the view at the end, unless they are stopped before with {@link
   * Event#stopPropagation()} or by returning `false` from a handler.
   *
   * @see View#onMouseLeave
   */
  onMouseLeave: MouseHandler

  /**
   * The function to be called when the user presses a key on the keyboard.
   * The function receives a {@link KeyEvent} object which contains
   * information about the keyboard event.
   *
   * If the function returns `false`, the keyboard event will be prevented
   * from bubbling up. This can be used for example to stop the window from
   * scrolling, when you need the user to interact with arrow keys.
   *
   * @example {@paperscript}
   * // Scaling a path whenever the user presses the space bar:
   *
   * // Create a circle shaped path:
   * var path = new Path.Circle({
   *     center: new Point(50, 50),
   *     radius: 30,
   *     fillColor: 'red'
   * });
   *
   * view.onKeyDown = function(event) {
   *     if (event.key == 'space') {
   *         // Scale the path by 110%:
   *         path.scale(1.1);
   *
   *         // Prevent the key event from bubbling
   *         return false;
   *     }
   * }
   */
  onKeyDown: KeyHandler

  /**
   * The function to be called when the user releases a key on the keyboard.
   * The function receives a {@link KeyEvent} object which contains
   * information about the keyboard event.
   *
   * If the function returns `false`, the keyboard event will be prevented
   * from bubbling up. This can be used for example to stop the window from
   * scrolling, when you need the user to interact with arrow keys.
   *
   * @example
   * view.onKeyUp = function(event) {
   *     if (event.key == 'space') {
   *         console.log('The spacebar was released!');
   *     }
   * }
   */
  onKeyUp: KeyHandler

  /**
   * {@grouptitle Event Handling}
   *
   * Attach an event handler to the view.
   *
   * @param type the type of event: {@values 'frame', 'resize',
   *     'mousedown', 'mouseup', 'mousedrag', 'click', 'doubleclick',
   *     'mousemove', 'mouseenter', 'mouseleave'}
   * @param function the function to be called when the event
   *     occurs, receiving a {@link MouseEvent} or {@link Event} object as its
   *     sole argument
   * @return this view itself, so calls can be chained
   *
   * @example {@paperscript}
   * // Create a rectangle shaped path with its top left point at:
   * // {x: 50, y: 25} and a size of {width: 50, height: 50}
   * var path = new Path.Rectangle(new Point(50, 25), new Size(50, 50));
   * path.fillColor = 'black';
   *
   * var frameHandler = function(event) {
   *     // Every frame, rotate the path by 3 degrees:
   *     path.rotate(3);
   * };
   *
   * view.on('frame', frameHandler);
   */
  on(type: string, func: Handler): this
  /**
   * Attach one or more event handlers to the view.
   *
   * @param param an object literal containing one or more of the
   *     following properties: {@values frame, resize}
   * @return this view itself, so calls can be chained
   *
   * @example {@paperscript}
   * // Create a rectangle shaped path with its top left point at:
   * // {x: 50, y: 25} and a size of {width: 50, height: 50}
   * var path = new Path.Rectangle(new Point(50, 25), new Size(50, 50));
   * path.fillColor = 'black';
   *
   * var frameHandler = function(event) {
   *     // Every frame, rotate the path by 3 degrees:
   *     path.rotate(3);
   * };
   *
   * view.on({
   *     frame: frameHandler
   * });
   */
  on(param: Record<string, Handler>): this

  /**
   * Detach an event handler from the view.
   *
   * @param type the event type: {@values 'frame', 'resize',
   *     'mousedown', 'mouseup', 'mousedrag', 'click', 'doubleclick',
   *     'mousemove', 'mouseenter', 'mouseleave'}
   * @param function the function to be detached
   * @return this view itself, so calls can be chained
   *
   * @example {@paperscript}
   * // Create a rectangle shaped path with its top left point at:
   * // {x: 50, y: 25} and a size of {width: 50, height: 50}
   * var path = new Path.Rectangle(new Point(50, 25), new Size(50, 50));
   * path.fillColor = 'black';
   *
   * var frameHandler = function(event) {
   *     // Every frame, rotate the path by 3 degrees:
   *     path.rotate(3);
   * };
   *
   * view.on({
   *     frame: frameHandler
   * });
   *
   * // When the user presses the mouse,
   * // detach the frame handler from the view:
   * function onMouseDown(event) {
   *     view.off('frame');
   * }
   */
  off(type: string, func?: Handler): this
  /**
   * Detach one or more event handlers from the view.
   *
   * @param param an object literal containing one or more of the
   *     following properties: {@values frame, resize}
   * @return this view itself, so calls can be chained
   */
  off(param: Record<string, Handler>): this

  /**
   * Emit an event on the view.
   *
   * @param type the event type: {@values 'frame', 'resize',
   *     'mousedown', 'mouseup', 'mousedrag', 'click', 'doubleclick',
   *     'mousemove', 'mouseenter', 'mouseleave'}
   * @param event an object literal containing properties describing
   * the event
   * @return {@true if the event had listeners}
   */
  emit(type: string, event?: any): boolean

  /**
   * Check if the view has one or more event handlers of the specified type.
   *
   * @param type the event type: {@values 'frame', 'resize',
   *     'mousedown', 'mouseup', 'mousedrag', 'click', 'doubleclick',
   *     'mousemove', 'mouseenter', 'mouseleave'}
   * @return {@true if the view has one or more event handlers of
   * the specified type}
   */
  responds(type: string): boolean
}

type DispatchOptions = {
  modifiers?: Partial<typeof Key.modifiers>
  time?: number
}

// Native event handling, coordinate conversion, focus handling and
// delegation to view and tool objects. The handling is shared by the DOM
// events in the browser, and #dispatchMouseEvent() and #dispatchKeyEvent()
// for hosts without a DOM, such as workers. Its state is shared by all views.

// Keep track of views internally, and of their ids, to find them from the
// targets of the DOM's events:
const views: View[] = []
const viewsById: Record<string, View> = {}
let nextId = 0
// Whether installEvents() has added the DOM's listeners:
let isInstalled = false
// The DOM's events, which installEvents() sets up, and which install
// themselves on the elements of views:
let viewEvents: Record<string, Listener> = {}
let prevFocus: View
let tempFocus: View
let dragging = false // mousedown that started on a view.
let mouseDown = false // mousedown anywhere.

// Higher level event handling, hit-testing, and emitting of normal mouse
// events along with "virtual" events such as mouseenter, mouseleave,
// mousedrag, click, doubleclick, on both the hit-test item and the view,
// with support for bubbling (event-propagation).

let called = false
let prevented = false
// Event fallbacks for "virutal" events, e.g. if an item doesn't respond
// to doubleclick, fall back to click:
const fallbacks = {
  doubleclick: 'click',
  mousedrag: 'mousemove'
}
// Various variables required by #_handleMouseEvent()
let wasInView = false
let downPoint: Point
let lastPoint: Point
let downItem: Item
let overItem: Item
let dragItem: Item
let clickItem: Item
let clickTime: number
let dblClick: boolean

// Lookup defining which native events are required by which item events.
// Required by code that is counting the amount of required natives events.
// The mapping is native -> virtual.
const itemEventsMap: Record<string, Record<string, number>> = {
  // mouseup too, as the press needs the item for needsUp():
  mousedown: {
    mousedown: 1,
    mouseup: 1,
    mousedrag: 1,
    click: 1,
    doubleclick: 1
  },
  mouseup: {
    mouseup: 1,
    mousedrag: 1,
    click: 1,
    doubleclick: 1
  },
  mousemove: {
    mousedrag: 1,
    mousemove: 1,
    mouseenter: 1,
    mouseleave: 1
  }
}

// Declare the item events of views, which come from Item, and install the
// listeners for the DOM's events, once, with the first view:
function installEvents() {
  if (!isInstalled) {
    isInstalled = true
    defineEvents(
      View,
      Object.fromEntries(Item._itemHandlers.map(name => [name, {}]))
    )
    installKeyEvents()
    const window = getWindow()
    if (window) {
      // Touch handling inspired by Hammer.js
      let mousedown = 'touchstart'
      let mousemove = 'touchmove'
      let mouseup = 'touchend touchcancel'
      // Do not add mouse events on mobile and tablet devices
      if (!(
        'ontouchstart' in window &&
        window.navigator.userAgent.match(
          /mobile|tablet|ip(ad|hone|od)|android|silk/i
        )
      )) {
        // For mixed browsers, like chrome on Windows8 touch laptop.
        mousedown += ' mousedown'
        mousemove += ' mousemove'
        mouseup += ' mouseup'
      }

      // mousemove and mouseup events need to be installed on document, not
      // the view element, since we want to catch the end of drag events even
      // outside our view. Only the mousedown events are installed on the
      // view, as defined by viewEvents.
      viewEvents = {
        [mousedown](event: Event) {
          // Get the view from the event, and store a reference to the view
          // that should receive keyboard input.
          const view = (View._focused = getView(event))
          if (!dragging) {
            dragging = true
            view._handleMouseEvent('mousedown', event)
          }
        }
      }

      addEvents(getDocument(), {
        // NOTE: mouseleave does not seem to work on document in IE:
        mouseout(event: globalThis.MouseEvent) {
          // When the moues leaves the document, fire one last mousemove
          // event, to give items the change to receive a mouseleave, etc.
          const view = View._focused
          const target = event.relatedTarget as Element
          if (view && (!target || target.nodeName === 'HTML')) {
            handleMouseMove(view, event)
          }
        },

        scroll() {
          View.updateFocus()
        },

        [mousemove](event: Event) {
          let view = View._focused
          if (!mouseDown) {
            // See if we can get the view from the current event target, and
            // handle the mouse move over it.
            const target = getView(event)
            if (target) {
              if (view !== target) {
                // Temporarily focus this view without making it sticky,
                // so Key events are handled too during the mouse over.
                // As we switch view, fire one last mousemove in the old
                // view, to let items receive receive a mouseleave, etc.
                if (view) {
                  handleMouseMove(view, event)
                }
                prevFocus ??= view
                view = View._focused = tempFocus = target
              }
            } else if (tempFocus && tempFocus === view) {
              // Clear temporary focus again and switch back to previous
              // focus but only if it is still valid (still in the DOM).
              if (prevFocus && !prevFocus.isInserted()) {
                prevFocus = null
              }
              view = View._focused = prevFocus
              prevFocus = null
              View.updateFocus()
            }
          }
          if (view) {
            handleMouseMove(view, event)
          }
        },

        [mousedown]() {
          // In order to not switch views during scroll dragging on touch
          // devices, we need to know if the mouse was clicked anywhere on the
          // document (see the mousemove listener) The rest happens in
          // viewEvents[mousedown].
          mouseDown = true
        },

        [mouseup](event: Event) {
          const view = View._focused
          if (view && dragging) {
            view._handleMouseEvent('mouseup', event)
          }
          mouseDown = dragging = false
        }
      })

      addEvents(window, {
        load() {
          View.updateFocus()
        }
      })
    }
  }
}

function getView(event: Event): View {
  // Get the view from the current event target.
  const target = event.target as Element
  // Some node do not have the getAttribute method, e.g. SVG nodes.
  return target.getAttribute && viewsById[target.getAttribute('id')]
}

function handleMouseMove(view: View, event: Event, point?: Point) {
  view._handleMouseEvent('mousemove', event, point)
}

// Returns true if event was prevented, false otherwise.
function emitMouseEvent(
  obj: View | Item,
  target: View | Item,
  type: string,
  event: Event,
  point: Point,
  prevPoint?: Point,
  stopItem?: Item
): boolean {
  let stopped = false
  let mouseEvent: MouseEvent

  // Returns true if the event was stopped, false otherwise.
  function emit(obj: View | Item, type: string): boolean {
    if (obj.responds(type)) {
      // Only produce the event object if we really need it, and then
      // reuse it if we're bubbling.
      mouseEvent ??= new MouseEvent(
        type,
        event,
        point,
        (target || obj) as Item,
        // Calculate delta if prevPoint was passed
        prevPoint ? point.subtract(prevPoint) : null
      )
      if (obj.emit(type, mouseEvent)) {
        called = true
        if (mouseEvent.prevented) {
          prevented = true
        }
        // Bail out if propagation is stopped
        if (mouseEvent.stopped) {
          return (stopped = true)
        }
      }
    } else {
      const fallback = fallbacks[type]
      if (fallback) {
        return emit(obj, fallback)
      }
    }
  }

  // Bubble up the parents and emit this event until we're told to stop.
  while (obj && obj !== stopItem) {
    if (emit(obj, type)) {
      break
    }
    obj = (obj as Item)._parent
  }
  return stopped
}

// Returns true if event was stopped, false otherwise.
function emitMouseEvents(
  view: View,
  hitItem: Item,
  type: string,
  event: Event,
  point: Point,
  prevPoint: Point
): boolean {
  // Before handling events, process removeOn() calls for cleanup.
  // NOTE: As soon as there is one event handler receiving mousedrag
  // events, non of the removeOnMove() items will be removed while the
  // user is dragging.
  view._project.removeOn(type)
  // Set called and prevented to false, so they will reflect if the
  // following calls to emitMouseEvent() have called a handler, and if
  // and of the handlers called event.preventDefault()
  prevented = called = false
  // First handle the drag-item and its parents, through bubbling.
  return (
    (
      dragItem &&
      emitMouseEvent(dragItem, null, type, event, point, prevPoint)
    ) ||
    // Next handle the hit-item, if it's different from the drag-item
    // and not a descendant of it (in which case it would already have
    // received an event in the call above). Translate mousedrag to
    // mousemove, since drag is handled above.
    (
      hitItem &&
      hitItem !== dragItem &&
      !hitItem.isDescendant(dragItem) &&
      emitMouseEvent(
        hitItem,
        null,
        type === 'mousedrag' ? 'mousemove' : type,
        event,
        point,
        prevPoint,
        dragItem
      )
    ) ||
    // Lastly handle the mouse events on the view, if we're still here.
    emitMouseEvent(
      view,
      dragItem || hitItem || view,
      type,
      event,
      point,
      prevPoint
    )
  )
}

// Stands in for the DOM event in #dispatchMouseEvent() and
// #dispatchKeyEvent(), with what the handling reads from it. Hosts can
// pass the state of the modifier keys, see Key.modifiers:
function createEvent(
  type: string,
  options: DispatchOptions & { button?: number }
) {
  if (options.modifiers) {
    Object.assign(Key.modifiers, options.modifiers)
  }
  return {
    type,
    timeStamp: options.time != null ? options.time * 1000 : Date.now(),
    button: options.button || 0,
    cancelable: true,
    defaultPrevented: false,
    preventDefault() {
      this.defaultPrevented = true
    },
    stopPropagation() {}
  } as unknown as Event
}
