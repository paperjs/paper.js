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

import { Base, Key } from '../internal.ts'
import type { KeyModifiers } from './Key.ts'

/**
 * The Event object is the base class for any of the other event types,
 * such as {@link MouseEvent}, {@link ToolEvent} and {@link KeyEvent}.
 */
export class Event extends Base {
  // The native event that this one wraps:
  event: globalThis.Event
  type: string
  prevented = false
  stopped = false

  constructor(event?: globalThis.Event) {
    super()
    this.event = event
    this.type = event?.type
  }

  /**
   * Cancels the event if it is cancelable, without stopping further
   * propagation of the event.
   */
  preventDefault() {
    this.prevented = true
    this.event.preventDefault()
  }

  /**
   * Prevents further propagation of the current event.
   */
  stopPropagation() {
    this.stopped = true
    this.event.stopPropagation()
  }

  /**
   * Cancels the event if it is cancelable, and stops stopping further
   * propagation of the event. This is has the same effect as calling both
   * {@link #stopPropagation()} and {@link #preventDefault()}.
   *
   * Any handler can also return `false` to indicate that `stop()` should be
   * called right after.
   */
  stop() {
    this.stopPropagation()
    this.preventDefault()
  }

  /**
   * The time at which the event was created, in seconds, as the times of
   * frame events are. Browsers count from the page's time origin, as
   * `performance.now()` does, while
   * {@link View#dispatchMouseEvent(type, point[, options])} and
   * {@link View#dispatchKeyEvent(type, key[, options])} use `Date.now()`
   * unless the host passes a time, so only compare the times of events from
   * the same source.
   */
  get time(): number {
    return this.event.timeStamp / 1000
  }

  /**
   * The current state of the keyboard modifiers.
   *
   * @see Key.modifiers
   */
  get modifiers(): KeyModifiers {
    return Key.modifiers
  }
}
