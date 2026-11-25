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

import { Event, registerClasses } from '../internal.ts'
import type { Point } from '../basic/Point.ts'
import type { Item } from '../item/Item.ts'

/**
 * The MouseEvent object is received by the {@link Item}'s mouse event
 * handlers {@link Item#onMouseDown}, {@link Item#onMouseDrag},
 * {@link Item#onMouseMove}, {@link Item#onMouseUp}, {@link Item#onClick},
 * {@link Item#onDoubleClick}, {@link Item#onMouseEnter} and
 * {@link Item#onMouseLeave}. The MouseEvent object is the only parameter passed
 * to these functions and contains information about the mouse event.
 */
export class MouseEvent extends Event {
  static {
    registerClasses({ MouseEvent: this })
  }

  declare event: PointerEvent

  /**
   * The type of mouse event.
   *
   * @values 'mousedown', 'mouseup', 'mousedrag', 'click', 'doubleclick',
   *     'mousemove', 'mouseenter', 'mouseleave'
   */
  declare type: string

  /**
   * The position of the mouse in project coordinates when the event was
   * fired.
   */
  point: Point

  /**
   * The item that dispatched the event. It is different from
   * {@link #currentTarget} when the event handler is called during
   * the bubbling phase of the event.
   */
  target: Item

  /**
   * The current target for the event, as the event traverses the scene graph.
   * It always refers to the element the event handler has been attached to as
   * opposed to {@link #target} which identifies the element on
   * which the event occurred.
   */
  declare currentTarget: Item // Set by Emitter#emit() during the handlers.

  // DOCS: document MouseEvent#delta
  delta: Point | null

  constructor(
    type: string,
    event: PointerEvent,
    point: Point,
    target: Item,
    delta?: Point | null
  ) {
    super(event)
    this.type = type
    this.point = point
    this.target = target
    this.delta = delta ?? null
  }

  /**
   * The button that the event is about: `0` for the main button, usually
   * the left one, `1` for the middle and `2` for the secondary one, and
   * `-1` for moves, during which no button changes.
   */
  get button(): number {
    return this.event.button
  }

  /**
   * The buttons that are down during the event, as the sum of `1` for the
   * main button, `2` for the secondary and `4` for the middle one.
   * Touches and pens in contact count as the main button.
   */
  get buttons(): number {
    return this.event.buttons
  }

  /**
   * The kind of pointer that caused the event.
   *
   * @values 'mouse', 'touch', 'pen'
   */
  get pointerType(): string {
    return this.event.pointerType
  }

  /**
   * The pressure of the pointer, between `0` and `1`. Pointers that
   * don't measure it report `0.5` while a button is down or they are in
   * contact, and `0` otherwise.
   */
  get pressure(): number {
    return this.event.pressure
  }

  /**
   * @return a string representation of the mouse event
   */
  toString(): string {
    const delta = this.delta ? `, delta: ${this.delta}` : ''
    return (
      `{ type: '${this.type}', point: ${this.point}, ` +
      `target: ${this.target}${delta}, modifiers: ${this.modifiers} }`
    )
  }
}
