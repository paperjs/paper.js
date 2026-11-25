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

import {
  Color,
  CompoundPath,
  DrawEvent,
  Group,
  ItemSelection,
  Matrix,
  Point,
  Rectangle,
  Size,
  blend,
  clamp,
  getCanvas,
  getContext,
  nativeBlendModes,
  releaseCanvas
} from '../internal.ts'
import type { Style } from '../style/Style.ts'
import type { Item } from './Item.ts'
import type { View } from '../view/View.ts'

// The state of drawing that items pass on to their content, overriding parts
// of it in objects that inherit the rest through Object.create(), see
// Project#draw():
export type DrawParam = {
  matrices: Matrix[]
  offset?: Point
  pixelRatio?: number
  view?: View
  viewMatrix?: Matrix | null
  updateMatrix?: boolean
  clip?: boolean
  clipItem?: Item
  dontStart?: boolean
  dontFinish?: boolean
  dontShadow?: boolean
}

// Set the styles of path-like items on the canvas context, also for text,
// which passes the style of each of its runs:
export function setStyles(
  item: Item,
  ctx: CanvasRenderingContext2D,
  param: DrawParam,
  viewMatrix: Matrix,
  strokeMatrix?: Matrix | null,
  style: Style = item._style
) {
  // We can access internal properties since we're only using this on
  // items without children, where styles would be merged. Text passes
  // the style of each of its runs.
  const matrix = item._matrix
  if (style.hasFill()) {
    ctx.fillStyle = style.fillColor.toCanvasStyle(ctx, matrix, strokeMatrix)
  }
  if (style.hasStroke()) {
    ctx.strokeStyle = style.strokeColor.toCanvasStyle(
      ctx, matrix, strokeMatrix
    )
    ctx.lineWidth = style.strokeWidth
    const { strokeJoin, strokeCap, miterLimit, dashArray } = style
    if (strokeJoin) {
      ctx.lineJoin = strokeJoin
    }
    if (strokeCap) {
      ctx.lineCap = strokeCap
    }
    if (miterLimit) {
      ctx.miterLimit = miterLimit
    }
    if (dashArray?.length) {
      ctx.setLineDash(dashArray)
      ctx.lineDashOffset = style.dashOffset
    }
  }
  // The shadow is the item's, also for text, which passes the styles of
  // its runs. Items whose shadow is cast when compositing them don't
  // draw it, see drawItem():
  if (item._style.hasShadow() && !param.dontShadow) {
    setShadow(item, ctx, param, viewMatrix)
  }
}

// Fill and stroke the path defined on the canvas context, shared by Path,
// CompoundPath and Shape:
export function paintItem(
  item: Item,
  ctx: CanvasRenderingContext2D,
  param: DrawParam,
  viewMatrix: Matrix,
  strokeMatrix?: Matrix | null
) {
  const style = item._style
  const hasFill = style.hasFill()
  const hasStroke = style.hasStroke()
  if (hasFill || hasStroke) {
    const isStrokeFirst = hasStroke && style.paintOrder === 'stroke'
    setStyles(item, ctx, param, viewMatrix, strokeMatrix)
    // If shadowColor is defined, clear it after the first paint, so it
    // won't be applied to both fill and stroke.
    if (isStrokeFirst) {
      ctx.stroke()
      ctx.shadowColor = 'rgba(0,0,0,0)'
    }
    if (hasFill) {
      // Elliptical radial gradients are drawn as circles, through
      // the matrix that stretches them, see Color#toCanvasStyle():
      const { fillColor } = style
      const ellipse = fillColor._getEllipseMatrix(item._matrix, strokeMatrix)
      if (ellipse) {
        ctx.save()
        ellipse.applyToContext(ctx)
        ctx.fillStyle = fillColor.toCanvasStyle(ctx, null, null, true)
      }
      ctx.fill(style.fillRule)
      if (ellipse) {
        ctx.restore()
      }
      ctx.shadowColor = 'rgba(0,0,0,0)'
    }
    if (hasStroke && !isStrokeFirst) {
      ctx.stroke()
    }
  }
}

export function setShadow(
  item: Item,
  ctx: CanvasRenderingContext2D,
  param: DrawParam,
  viewMatrix: Matrix
) {
  // In Canvas, shadows unfortunately ignore all transformations
  // completely. As almost no browser supports ctx.currentTransform,
  // we need to calculate our own here, and then use it to transform
  // the shadow-blur and offset accordingly.
  const style = item._style
  const pixelRatio = param.pixelRatio || 1
  const mx = viewMatrix
    ._shiftless()
    .prepend(new Matrix().scale(pixelRatio, pixelRatio))
  // Transform the blur value as a vector and use its new length:
  const blur = mx.transform(new Point(style.shadowBlur, 0))
  const offset = mx.transform(item.shadowOffset)
  ctx.shadowColor = style.shadowColor.toCanvasStyle(ctx) as string
  ctx.shadowBlur = blur.length
  ctx.shadowOffsetX = offset.x
  ctx.shadowOffsetY = offset.y
}

export function drawItem(
  item: Item,
  ctx: CanvasRenderingContext2D,
  param: DrawParam,
  parentStrokeMatrix?: Matrix | null
) {
  // Each time the project gets drawn, it's _updateVersion is increased.
  // Keep the _updateVersion of drawn items in sync, so we have an easy
  // way to know for which selected items we need to draw selection info.
  item._updateVersion = item._project._updateVersion
  // Now bail out if no actual drawing is required.
  if (!item._visible || item._opacity === 0) {
    return
  }
  // Keep calculating the current global matrix, by keeping a history
  // and pushing / popping as we go along.
  const { matrices } = param
  const matrix = item._matrix
  const parentMatrix = matrices[matrices.length - 1]
  const globalMatrix = parentMatrix.appended(matrix)
  // If the item is not invertible, do not draw it. It appears to be a
  // good idea generally to not draw in such circumstances, e.g. SVG
  // handles it the same way.
  if (!globalMatrix.isInvertible()) {
    return
  }

  // Since globalMatrix does not take the view's matrix into account (we
  // could have multiple views with different zooms), we may have to
  // prepend the view's matrix.
  // NOTE: param.viewMatrix is only provided if it isn't the identity
  // matrix.
  const viewMatrix = param.viewMatrix
    ? param.viewMatrix.appended(globalMatrix)
    : globalMatrix

  // Only keep track of transformation if told so. See Project#draw()
  matrices.push(globalMatrix)
  if (param.updateMatrix) {
    // Remember the parent's global matrix that this one is built from,
    // see Item#globalMatrix. Layers start from identity, not a parent.
    item._globalMatrix = globalMatrix
    item._parentGlobalMatrix = item._parent && parentMatrix
  }

  // If the item has a blendMode or is defining an opacity, draw it on
  // a temporary canvas first and composite the canvas afterwards.
  // Paths with an opacity < 1 that both define a fillColor
  // and strokeColor also need to be drawn on a temporary canvas
  // first, since otherwise their stroke is drawn half transparent
  // over their fill.
  // Exclude Raster items since they never draw a stroke and handle
  // opacity by themselves (they also don't call _setStyles)
  const blendMode = item._blendMode
  const opacity = clamp(item._opacity, 0, 1)
  const normalBlend = blendMode === 'normal'
  const nativeBlend = nativeBlendModes[blendMode]
  const style = item._style
  // Canvas fills and strokes separately, so items with both can only
  // cast the shadow of one. Draw them on a temporary canvas, and cast
  // the shadow when compositing it, which native blending can. Pass
  // true for dontMerge, as groups don't draw the shadows of their
  // children (#892):
  const shadow = (
    (normalBlend || nativeBlend) &&
    style._get('shadowColor', true) &&
    style.hasShadow() &&
    style.hasFill() &&
    style.hasStroke()
  )
  // Determine if we can draw directly, or if we need to draw into a
  // separate canvas and then composite onto the main canvas.
  const direct = (
    !shadow && ( // e.g. CompoundPath
      (
        normalBlend &&
        opacity === 1 &&
        !(item instanceof Group && item.isolated)
      ) ||
      // If native blending is possible, see if the item allows it
      (nativeBlend || normalBlend && opacity < 1) &&
      item._canComposite()
    ) ||
    param.dontStart ||
    param.clip
  )
  const pixelRatio = param.pixelRatio || 1
  // Set when drawing into a temporary canvas, not directly:
  let mainCtx!: CanvasRenderingContext2D
  let itemOffset!: Point
  let prevOffset: Point | undefined
  let itemSize!: Size
  let buffer: any
  let isFresh = false
  if (!direct) {
    // Buffered groups drawn by a view keep their temporary canvas, and
    // only draw into it again when it's stale, see Group#buffered.
    // A clip item isn't part of the group, so its changes wouldn't
    // make the buffer stale:
    buffer = (
      item._buffered &&
      param.view &&
      !param.clipItem &&
      (item._buffer ??= {})
    )
    const version = item._project._bufferVersion
    isFresh = (
      buffer &&
      viewMatrix.equals(buffer.matrix) &&
      buffer.version === version
    )
    // Apply the parent's global matrix to the calculation of correct
    // bounds, with what effects draw, and include the item's shadow
    // (#1628).
    let bounds = isFresh ? buffer.bounds : item.getPreviewBounds(viewMatrix)
    // Pass true for dontMerge, as groups don't draw the shadows of
    // their children.
    if (!isFresh && style._get('shadowColor', true)) {
      // Transform the shadow the same way as in _setStyles(), and
      // cover its blur up to three times the standard deviation,
      // which is half of shadowBlur in Canvas.
      const mx = viewMatrix._shiftless()
      const blur = mx.transform(new Point(style._get('shadowBlur', true), 0))
      const offset = mx.transform(style._get('shadowOffset', true))
      bounds = bounds.unite(
        new Rectangle(bounds.point.add(offset), bounds.size)
          .expand(blur.length * 3)
      )
    }
    if (buffer) {
      buffer.matrix = viewMatrix
      buffer.version = version
      buffer.bounds = bounds
    }
    // Only cover the part of the bounds that is visible on the canvas
    // that we're drawing into (#1644). NOTE: Item#rasterize() doesn't
    // set param.offset, so new Point() turns it into 0, 0.
    const { canvas } = ctx
    bounds = bounds.intersect(
      new Rectangle(
        new Point(param.offset),
        new Size(canvas.width, canvas.height).divide(pixelRatio)
      )
    )
    if (bounds.width <= 0 || bounds.height <= 0) {
      // Item won't be drawn so its global matrix need to be removed
      // from the stack (#1561).
      matrices.pop()
      return
    }
    // Store previous offset and save the main context, so we can
    // draw onto it later.
    prevOffset = param.offset
    // Floor the offset and ceil the size, so we don't cut off any
    // antialiased pixels when drawing onto the temporary canvas.
    const { left, top, width, height } = bounds
    itemOffset = param.offset = new Point(left, top).floor()
    itemSize = new Size(width, height)
      .ceil()
      .add(1)
      .multiply(pixelRatio)
      .floor()
    // Set ctx to the context of the temporary canvas, so we draw onto
    // it, instead of the mainCtx. It may be larger than itemSize,
    // since only that part of it is composited:
    mainCtx = ctx
    if (buffer) {
      let bufferCanvas = buffer.canvas
      isFresh = (
        isFresh &&
        itemOffset.equals(buffer.offset) &&
        itemSize.equals(buffer.size)
      )
      if (
        !bufferCanvas ||
        bufferCanvas.width < itemSize.width ||
        bufferCanvas.height < itemSize.height
      ) {
        // In Chrome, OffscreenCanvas stays fast with many paths
        // where a detached canvas element doesn't:
        bufferCanvas = buffer.canvas = globalThis.OffscreenCanvas
          ? new OffscreenCanvas(itemSize.width, itemSize.height)
          : getCanvas(itemSize)
        isFresh = false
      }
      buffer.offset = itemOffset
      buffer.size = itemSize
      ctx = bufferCanvas.getContext('2d')
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      if (!isFresh) {
        ctx.clearRect(0, 0, bufferCanvas.width, bufferCanvas.height)
      }
    } else {
      // Drawing has canvases:
      ctx = getContext(itemSize, { minimum: true })!
    }
    if (pixelRatio !== 1) {
      ctx.scale(pixelRatio, pixelRatio)
    }
  }
  ctx.save()
  // Get the transformation matrix for non-scaling strokes.
  const strokeMatrix = parentStrokeMatrix
    ? parentStrokeMatrix.appended(matrix)
    : // pass `true` for dontMerge
      item._canScaleStroke && !item._style._get('strokeScaling', true)
      ? viewMatrix
      : null
  // If we're drawing into a separate canvas and a clipItem is defined
  // for the current rendering loop, we need to draw the clip item
  // again.
  const clip = !direct && param.clipItem
  // Clip items only clip, and the children of compound paths only add
  // to the path of their parent, so neither emits:
  const event =
    item.responds('draw') && !isFresh && !param.clip && !param.dontStart
      ? new DrawEvent({
          item: item,
          context: ctx,
          matrix: viewMatrix.clone(),
          pixelRatio,
          view: param.view ?? null
        })
      : null
  // If we're drawing with a strokeMatrix, the CTM is reset either way
  // so we don't need to set it, except when we also have to draw a
  // clipItem, or emit the draw event in the item's coordinates.
  const transform = !strokeMatrix || clip || event
  // If drawing directly, handle opacity and native blending now,
  // otherwise we will do it later when the temporary canvas is composited.
  if (direct) {
    ctx.globalAlpha = opacity
    if (nativeBlend) {
      ctx.globalCompositeOperation = blendMode as GlobalCompositeOperation
    }
  } else if (transform) {
    // Translate the context so the topLeft of the item is at (0, 0)
    // on the temporary canvas.
    ctx.translate(-itemOffset.x, -itemOffset.y)
  }
  if (clip) {
    // The clip item is a sibling of this item, so draw it with the
    // parent's matrices before applying this item's matrix (#1594):
    ;(
      param.viewMatrix
        ? param.viewMatrix.appended(parentMatrix)
        : parentMatrix

    ).applyToContext(ctx)
    drawItem(
      clip,
      ctx,
      Object.assign(Object.create(param), {
        clip: true,
        matrices: matrices.slice(0, -1)
      })
    )
    matrix.applyToContext(ctx)
  } else if (transform) {
    // Apply viewMatrix when drawing into temporary canvas.
    ;(direct ? matrix : viewMatrix).applyToContext(ctx)
  }
  if (event) {
    // Don't let the handler's state leak into the default drawing:
    ctx.save()
    item.emit('draw', event)
    ctx.restore()
  }
  if (strokeMatrix) {
    // Reset the transformation but take HiDPI pixel ratio into account.
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
    // Also offset again when drawing non-directly.
    // NOTE: Don't use itemOffset since offset might be from the parent,
    // e.g. CompoundPath
    const { offset } = param
    if (offset) {
      ctx.translate(-offset.x, -offset.y)
    }
  }
  if (!isFresh && !event?.prevented) {
    const drawParam =
      shadow && !direct
        ? Object.assign(Object.create(param), { dontShadow: true })
        : param
    const output = item.getEffectOutput()
    if (output) {
      // The output of the effects is drawn in the item's place, in
      // its coordinates, see Item#effects:
      drawItem(
        output,
        ctx,
        Object.assign(Object.create(drawParam), { updateMatrix: false }),
        strokeMatrix
      )
    } else {
      item._draw(ctx, drawParam, viewMatrix, strokeMatrix)
    }
  }
  ctx.restore()
  matrices.pop()
  if (param.clip && !param.dontFinish) {
    // Pass fill-rule to handle clipping with compound-paths (#1361).
    ctx.clip(item.fillRule)
  }
  // If a temporary canvas was created, composite it onto the main canvas:
  if (!direct) {
    if (shadow) {
      mainCtx.save()
      setShadow(item, mainCtx, param, viewMatrix)
    }
    // Use blend() even for processing normal blendMode with opacity.
    blend(
      blendMode,
      ctx,
      mainCtx,
      opacity,
      // Calculate the pixel offset of the temporary canvas to the
      // main canvas. We also need to factor in the pixel-ratio.
      (prevOffset ? itemOffset.subtract(prevOffset) : itemOffset).multiply(
        pixelRatio
      ),
      itemSize
    )
    if (shadow) {
      mainCtx.restore()
    }
    // Return the temporary context, so it can be reused, unless the
    // group keeps it as its buffer:
    if (!buffer) {
      releaseCanvas(ctx)
    }
    // Restore previous offset.
    param.offset = prevOffset
  }
}

// Check the _updateVersion of the item to see if it got drawn in the draw
// loop. If the version is out of sync, the item is either not in the scene
// graph anymore or is invisible:
export function isItemUpdated(item: Item, updateVersion: number): boolean {
  const parent = item._parent
  // For compound-paths, use the _updateVersion of the parent, because the
  // shape gets drawn at once at might get cached (e.g. Path2D soon).
  if (parent instanceof CompoundPath) {
    return isItemUpdated(parent, updateVersion)
  }
  // In case a parent is visible but isn't drawn (e.g. opacity == 0), the
  // _updateVersion of all its children will not be updated, but the
  // children should still be considered updated, and selections should be
  // drawn for them. Excluded are only items with _visible == false:
  let updated = item._updateVersion === updateVersion
  if (
    !updated &&
    parent?._visible &&
    isItemUpdated(parent, updateVersion)
  ) {
    item._updateVersion = updateVersion
    updated = true
  }
  return updated
}

// Hosts that draw the selection themselves only want the handlers, see
// Project#hasDrawHandlers():
export function drawSelection(
  item: Item,
  ctx: CanvasRenderingContext2D,
  matrix: Matrix,
  size: number,
  selectionItems: Record<string, Item>,
  updateVersion: number,
  handlersOnly?: boolean
) {
  const selection = item._selection
  let itemSelected: number | boolean = selection & ItemSelection.ITEM
  const boundsSelected = (
    selection & ItemSelection.BOUNDS ||
    itemSelected && item._selectBounds
  )
  const strokeBoundsSelected = selection & ItemSelection.STROKE_BOUNDS
  const positionSelected = selection & ItemSelection.POSITION
  if (!item._drawSelected) {
    itemSelected = false
  }
  // Items of symbol definitions are drawn too, but aren't inserted:
  if (selection && isItemUpdated(item, updateVersion) && item.isInserted()) {
    // Allow definition of selected color on a per item and per
    // layer level, with a fallback to #009dec
    const color = (
      item._style._get('selectedColor', true) ||
      item.layer?._style._get('selectedColor', true)
    )
    const mx = matrix.appended(item._getGlobalMatrix(true))
    const half = size / 2
    ctx.strokeStyle = ctx.fillStyle = color
      ? color.toCanvasStyle(ctx)
      : '#009dec'
    if (item.responds('drawselection')) {
      const event = new DrawEvent({
        item: item,
        context: ctx,
        matrix: mx.clone(),
        size,
        color: color ?? new Color(ctx.strokeStyle as string),
        view: item.view
      })
      // Don't let the handler's state leak into the default drawing:
      ctx.save()
      item.emit('drawselection', event)
      ctx.restore()
      if (event.prevented) {
        return
      }
    }
    if (handlersOnly) {
      return
    }
    if (itemSelected) {
      item._drawSelected?.(ctx, mx, selectionItems)
    }
    if (positionSelected) {
      // Convert position from the parent's coordinates system to the
      // global one:
      const { position } = item
      const parent = item._parent
      const { x, y } = parent?.localToGlobal(position) ?? position
      ctx.beginPath()
      ctx.arc(x, y, half, 0, Math.PI * 2, true)
      ctx.stroke()
      const deltas = [[0, -1], [1, 0], [0, 1], [-1, 0]]
      const start = half
      const end = size + 1
      for (const [dx, dy] of deltas) {
        ctx.moveTo(x + dx * start, y + dy * start)
        ctx.lineTo(x + dx * end, y + dy * end)
        ctx.stroke()
      }
    }
    const drawBounds = (bounds: Rectangle) => {
      const coords = mx._transformCorners(bounds)
      // Now draw a rectangle that connects the transformed
      // bounds corners, and draw the corners.
      ctx.beginPath()
      for (let i = 0; i < 8; i++) {
        ctx[!i ? 'moveTo' : 'lineTo'](coords[i], coords[++i])
      }
      ctx.closePath()
      ctx.stroke()
      for (let i = 0; i < 8; i++) {
        ctx.fillRect(coords[i] - half, coords[++i] - half, size, size)
      }
    }
    if (boundsSelected) {
      drawBounds(item.internalBounds)
    }
    if (strokeBoundsSelected) {
      drawBounds(item.getBounds({ internal: true, stroke: true }))
    }
  }
}
