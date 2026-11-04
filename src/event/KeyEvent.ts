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

import { Event } from './Event.ts'

/**
 * The KeyEvent object is received by the {@link Tool}'s keyboard
 * handlers {@link Tool#onKeyDown}, {@link Tool#onKeyUp}. The KeyEvent object is
 * the only parameter passed to these functions and contains information about
 * the keyboard event.
 */
export class KeyEvent extends Event {
  /**
   * The type of mouse event.
   *
   * @values 'keydown', 'keyup'
   */
  declare type: string

  /**
   * The character representation of the key that caused this key event,
   * taking into account the current key-modifiers (e.g. shift, control,
   * caps-lock, etc.)
   */
  character: string

  /**
   * The key that caused this key event, either as a lower-case character or
   * special key descriptor.
   *
   * @values 'enter', 'space', 'shift', 'control', 'alt', 'meta', 'caps-lock',
   *     'left', 'up', 'right', 'down', 'escape', 'delete', ...
   */
  key: string

  constructor(
    type: string,
    event: globalThis.Event,
    key: string,
    character: string
  ) {
    super(event)
    this.type = type
    this.key = key
    this.character = character
  }

  /**
   * @return a string representation of the key event
   */
  toString(): string {
    return (
      `{ type: '${this.type}', key: '${this.key}', ` +
      `character: '${this.character}', modifiers: ${this.modifiers} }`
    )
  }
}
