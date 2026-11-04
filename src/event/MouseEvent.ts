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

import { Event } from '../internal.ts'
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
  delta: Point

  constructor(
    type: string,
    event: globalThis.Event,
    point: Point,
    target: Item,
    delta?: Point
  ) {
    super(event)
    this.type = type
    this.point = point
    this.target = target
    this.delta = delta
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
