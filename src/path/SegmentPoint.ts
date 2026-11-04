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

import { Point, SegmentSelection, isZero } from '../internal.ts'
import type { PointLike } from '../basic/Point.ts'
import type { Segment } from './Segment.ts'

/**
 * An internal version of Point that notifies its segment of each change
 *
 * @private
 */
export class SegmentPoint extends Point {
  // Not private, as Segment, Curve and Path read and write the coordinates
  // directly, for speed:
  _x: number
  _y: number
  #owner: Segment

  constructor(
    point: PointLike | null,
    owner: Segment,
    key: '_point' | '_handleIn' | '_handleOut'
  ) {
    super()
    let x = 0
    let y = 0
    let selected = false
    if (Array.isArray(point)) {
      x = point[0]
      y = point[1]
    } else if (point) {
      // Only convert what isn't point-like already, to avoid creating points:
      const pt: any = 'x' in point ? point : Point.from(point)
      x = pt.x
      y = pt.y
      selected = pt.selected
    }
    this._x = x
    this._y = y
    this.#owner = owner
    owner[key] = this
    // Select the point only once the owner references it, see
    // #getSelection():
    if (selected) {
      this.selected = true
    }
  }

  // See Point#_set() for an explanation of _set():
  _set(x: number, y: number, _dontNotify?: boolean): this {
    // Point's constructor calls this before the private fields exist, and our
    // constructor sets the coordinates itself:
    if (#owner in this) {
      this._x = x
      this._y = y
      if (!_dontNotify) {
        this.#owner._changed(this)
      }
    }
    return this
  }

  // @ts-expect-error: Point declares x as a field, SegmentPoint reads _x
  get x(): number {
    return this._x
  }

  set x(x: number) {
    this._x = x
    this.#owner._changed(this)
  }

  // @ts-expect-error: See x
  get y(): number {
    return this._y
  }

  set y(y: number) {
    this._y = y
    this.#owner._changed(this)
  }

  isZero(): boolean {
    // Provide our own version of Point#isZero() that does not use the x / y
    // accessors but the internal properties directly, for performance
    // reasons, since it is used a lot internally.
    return isZero(this._x) && isZero(this._y)
  }

  get selected(): boolean {
    return !!(this.#owner._selection & this.#getSelection())
  }

  set selected(selected: boolean) {
    this.#owner._changeSelection(this.#getSelection(), selected)
  }

  #getSelection(): number {
    const owner = this.#owner
    return this === owner._point
      ? SegmentSelection.POINT
      : this === owner._handleIn
        ? SegmentSelection.HANDLE_IN
        : this === owner._handleOut
          ? SegmentSelection.HANDLE_OUT
          : 0
  }
}
