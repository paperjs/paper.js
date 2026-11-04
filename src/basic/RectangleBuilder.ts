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

import { Rectangle } from './Rectangle.ts'
import { Size } from './Size.ts'
import type { SizeLike } from './Size.ts'

// Reads object literals such as `{ right: 100, width: 50 }` in any order: The
// first side or center set per axis moves the rectangle and keeps its size,
// further ones change the size.
export class RectangleBuilder extends Rectangle {
  // #fixWidth / #fixHeight protect the width / height against changes. They
  // are on by default, and switched off once properties are used that change
  // the outside of the rectangle, so combinations of: left / top / right /
  // bottom.
  // #anchorX / #anchorY can either be 0 (left), 0.5 (center) or 1 (right),
  // and are used as direct factors to calculate the x / y adjustments from
  // the size differences.
  #fixWidth = true
  #fixHeight = true
  #anchorX = 0
  #anchorY = 0

  constructor(object: object) {
    super()
    // Set the supported properties in the order of the object:
    for (const [key, value] of Object.entries(object)) {
      if (key in this && value !== undefined) {
        this[key] = value
      }
    }
  }

  get size(): Size {
    return super.size
  }

  set size(size: SizeLike) {
    const { width, height } = Size.from(size)
    if (this.#anchorX) {
      this.x += (this.width - width) * this.#anchorX
    }
    if (this.#anchorY) {
      this.y += (this.height - height) * this.#anchorY
    }
    this.width = width
    this.height = height
    this.#fixWidth = this.#fixHeight = true
  }

  get left(): number {
    return super.left
  }

  set left(left: number) {
    if (!this.#fixWidth) {
      const amount = left - this.x
      this.width -= this.#anchorX === 0.5 ? amount * 2 : amount
    }
    this.x = left
    this.#anchorX = 0
    this.#fixWidth = false
  }

  get top(): number {
    return super.top
  }

  set top(top: number) {
    if (!this.#fixHeight) {
      const amount = top - this.y
      this.height -= this.#anchorY === 0.5 ? amount * 2 : amount
    }
    this.y = top
    this.#anchorY = 0
    this.#fixHeight = false
  }

  get right(): number {
    return super.right
  }

  set right(right: number) {
    if (!this.#fixWidth) {
      const amount = right - this.x
      this.width = this.#anchorX === 0.5 ? amount * 2 : amount
    }
    this.x = right - this.width
    this.#anchorX = 1
    this.#fixWidth = false
  }

  get bottom(): number {
    return super.bottom
  }

  set bottom(bottom: number) {
    if (!this.#fixHeight) {
      const amount = bottom - this.y
      this.height = this.#anchorY === 0.5 ? amount * 2 : amount
    }
    this.y = bottom - this.height
    this.#anchorY = 1
    this.#fixHeight = false
  }

  get centerX(): number {
    return super.centerX
  }

  set centerX(x: number) {
    // If we're asked to fix the width or if #anchorX is already in center
    // mode, just keep moving the center.
    if (this.#fixWidth || this.#anchorX === 0.5) {
      this.x = x - this.width / 2
    } else {
      if (this.#anchorX) {
        this.x += (x - this.x) * 2 * this.#anchorX
      }
      this.width = (x - this.x) * 2
    }
    this.#anchorX = 0.5
    this.#fixWidth = false
  }

  get centerY(): number {
    return super.centerY
  }

  set centerY(y: number) {
    // If we're asked to fix the height or if #anchorY is already in center
    // mode, just keep moving the center.
    if (this.#fixHeight || this.#anchorY === 0.5) {
      this.y = y - this.height / 2
    } else {
      if (this.#anchorY) {
        this.y += (y - this.y) * 2 * this.#anchorY
      }
      this.height = (y - this.y) * 2
    }
    this.#anchorY = 0.5
    this.#fixHeight = false
  }
}
