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
  PaperScope,
  Size,
  View,
  getCanvas,
  getInsets,
  getStyles,
  getWindow
} from '../internal.ts'
import type { SizeLike } from '../basic/Size.ts'
import type { Project } from '../item/Project.ts'

/**
 * @private
 */
export class CanvasView extends View {
  /**
   * Creates a view object that wraps a canvas element.
   *
   * @param canvas the Canvas object that this view should
   *     wrap
   */
  constructor(project: Project, canvas: HTMLCanvasElement)
  /**
   * Creates a view object that wraps a newly created canvas element.
   *
   * @param size the size of the canvas to be created
   */
  constructor(project: Project, size: SizeLike)
  constructor(project: Project, canvas: HTMLCanvasElement | SizeLike) {
    let element: HTMLCanvasElement
    if (canvas instanceof getWindow().HTMLCanvasElement) {
      element = canvas
    } else {
      // See if the arguments describe the view size:
      const size = Size.from(canvas)
      if (size.isZero()) {
        throw new Error(
          `Cannot create CanvasView with the provided argument: ${canvas}`
        )
      }
      element = getCanvas(size) as HTMLCanvasElement
    }
    // Save context right away, and restore in #remove(). Also restore() and
    // save() again in _setElementSize() to prevent accumulation of scaling.
    // View's constructor takes the context and the pixel ratio from the
    // element, as it sets its size through _setElementSize():
    element.getContext('2d').save()
    super(project, element)
    // We can't be sure the canvas is clear
    this._needsUpdate = true
  }

  // @override
  remove(): boolean {
    this._context.restore()
    return super.remove()
  }

  // @override
  _setElementSize(width: number, height: number) {
    const pixelRatio = this._pixelRatio
    const element = this._element
    // Upscale the canvas if the pixel ratio is more than 1.
    super._setElementSize(width * pixelRatio, height * pixelRatio)
    // Set the size of non-resizable canvases through their style, as they
    // would appear too big on HiDPI screens otherwise. Also at a pixel
    // ratio of 1, so they behave the same on every screen (#2088):
    if (!PaperScope.hasAttribute(element, 'resize')) {
      // With border-box sizing, the style includes padding and border:
      const { style } = element
      const insets =
        getStyles(element).boxSizing === 'border-box'
          ? getInsets(element)
          : new Size()
      style.width = `${width + insets.width}px`
      style.height = `${height + insets.height}px`
    }
    if (pixelRatio !== 1) {
      // Scale the context to counter the fact that we've manually scaled
      // our canvas element.
      const ctx = this._context
      ctx.restore()
      ctx.save()
      ctx.scale(pixelRatio, pixelRatio)
    }
  }

  get context(): CanvasRenderingContext2D {
    return this._context
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
  // @override
  update(force?: boolean): boolean {
    if (!this._needsUpdate && !force) {
      return false
    }
    const project = this._project
    const ctx = this._context
    const size = this._viewSize
    ctx.clearRect(0, 0, size.width + 1, size.height + 1)
    if (project) {
      // Forced updates follow changes that the buffers don't know of:
      if (force) {
        project._bufferVersion++
      }
      project.draw(ctx, this._matrix, this._pixelRatio, this)
    }
    this._needsUpdate = false
    return true
  }
}
