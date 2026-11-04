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

import { Base } from '../core/Base.ts'
import type { Item } from '../item/Item.ts'
import type { Matrix } from '../basic/Matrix.ts'
import type { Color } from '../style/Color.ts'
import type { View } from '../view/View.ts'

/**
 * The DrawEvent object is received by the {@link Item}'s drawing
 * handlers {@link Item#onDraw} and {@link Item#onDrawSelection}, which
 * describe its fields.
 */
export class DrawEvent extends Base {
  // The fields that the handlers describe, set from the constructor's props:
  declare item: Item
  declare context: CanvasRenderingContext2D
  declare matrix: Matrix
  declare view: View
  declare pixelRatio: number // Only for onDraw.
  declare size: number // Only for onDrawSelection.
  declare color: Color // Only for onDrawSelection.
  prevented = false

  constructor(props: Partial<DrawEvent>) {
    super()
    Object.assign(this, props)
  }

  /**
   * Skips the item's default drawing, as returning `false` from the handler
   * does.
   */
  preventDefault() {
    this.prevented = true
  }

  // Emitter#emit() calls stop() when a handler returns false:
  stop() {
    this.preventDefault()
  }
}
