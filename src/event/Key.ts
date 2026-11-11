import {
  View,
  addEvents,
  camelize,
  getDocument,
  getWindow,
  hyphenate,
  paper
} from '../internal.ts'
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

export interface KeyModifiers {
  shift: boolean
  control: boolean
  alt: boolean
  meta: boolean
  capsLock: boolean
  space: boolean
  readonly option: boolean
  readonly command: boolean
}

const keyLookup = {
  // Unify different key identifier naming schemes, e.g. on Gecko, IE:
  '\t': 'tab',
  ' ': 'space',
  '\xA0': 'space', // Option + Space on macOS = non-breaking space.
  '\b': 'backspace',
  '\x7f': 'delete',
  'Spacebar': 'space',
  'Del': 'delete',
  'Win': 'meta',
  'Esc': 'escape'
}
// To find corresponding characters for special keys in keydown events:
const charLookup = {
  tab: '\t',
  space: ' ',
  enter: '\r'
}
// Only keypress reliable gets char-codes that are actually representing
// characters with all modifiers taken into account across all browsers.
// So we need to perform a little trickery here to use these codes with
// onKeyDown/Up:
// - keydown is used to handle modifiers and special keys such as
//   arrows, space, control, etc, for which events are fired right away.
// - keypress fires the actual onKeyDown event for all other keys.
// - keyup handles the onKeyUp events for both.

// Map for currently pressed keys:
const keyMap: Record<string, boolean> = {}
// key -> char mappings for pressed keys:
const charMap: Record<string, string> = {}
// Keys that will not receive keyup events due to Mac bug:
let metaFixMap: Record<string, string>
// The key from the keydown event, if it wasn't handled already:
let downKey: string
// Whether installKeyEvents() has added the DOM's listeners:
let isInstalled = false

const modifiers = Object.defineProperties(
  {
    shift: false,
    control: false,
    alt: false, // WAS: option
    meta: false, // WAS: command
    capsLock: false,
    space: false
  } as KeyModifiers,
  {
    // Short-cut to modifiers.alt for backward compatibility
    option: {
      get() {
        return this.alt
      }
    },

    // Platform independent short-cut to modifiers.control / meta,
    // based on whichever key is used for commands.
    command: {
      get() {
        return paper?.agent.mac ? this.meta : this.control
      }
    },

    toString: {
      value() {
        return `{ ${
          Object.entries(this)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ')
        } }`
      }
    }
  }
)

export const Key = {
  /**
   * The current state of the keyboard modifiers.
   *
   * @option modifiers.shift {Boolean} {@true if the shift key is
   *     pressed}.
   * @option modifiers.control {Boolean} {@true if the control key is
   *     pressed}.
   * @option modifiers.alt {Boolean} {@true if the alt/option key is
   *     pressed}.
   * @option modifiers.meta {Boolean} {@true if the meta/windows/command
   *     key is pressed}.
   * @option modifiers.capsLock {Boolean} {@true if the caps-lock key is
   *     active}.
   * @option modifiers.space {Boolean} {@true if the space key is
   *     pressed}.
   * @option modifiers.option {Boolean} {@true if the alt/option key is
   *     pressed}. This is the same as `modifiers.alt`
   * @option modifiers.command {Boolean} {@true if the meta key is pressed
   *     on Mac, or the control key is pressed on Windows and Linux}.
   */
  modifiers,

  /**
   * Checks whether the specified key is pressed.
   *
   * @param key any character or special key descriptor:
   *     {@values 'enter', 'space', 'shift', 'control', 'alt', 'meta',
   *     'caps-lock', 'left', 'up', 'right', 'down', 'escape', 'delete',
   *     ...}
   * @return {@true if the key is pressed}
   *
   * @example
   * // Whenever the user clicks, create a circle shaped path. If the
   * // 'a' key is pressed, fill it with red, otherwise fill it with blue:
   * function onMouseDown(event) {
   *     var path = Path.circle(event.point, 10);
   *     if (Key.isDown('a')) {
   *         path.fillColor = 'red';
   *     } else {
   *         path.fillColor = 'blue';
   *     }
   * }
   */
  isDown(key: string): boolean {
    return !!keyMap[key]
  }
}

/**
 * Installs the listeners for the DOM's key events, once, with the first
 * {@link View}.
 *
 * @private
 */
export function installKeyEvents() {
  if (!isInstalled) {
    isInstalled = true
    addEvents(getDocument(), {
      keydown(event: KeyboardEvent) {
        const key = getKey(event)
        // Directly handle any special keys (key.length > 1) in keydown, as
        // not all of them will receive keypress events. Neither do keys
        // pressed with control, alt or meta in modern browsers.
        if (key.length > 1 || event.ctrlKey || event.altKey || event.metaKey) {
          handleKey(true, key, null, event)
        } else {
          // If it wasn't handled yet, store the downKey so keypress can
          // compare and handle buggy edge cases, known to happen in
          // Chrome on Ubuntu.
          downKey = key
        }
      },

      keypress(event: KeyboardEvent) {
        if (downKey) {
          let key = getKey(event)
          const code = event.charCode
          // Try event.charCode if its above 32 and fall back onto the
          // key value if it's a single character, empty otherwise.
          const character =
            code >= 32 ? String.fromCharCode(code) : key.length > 1 ? '' : key
          if (key !== downKey) {
            // This shouldn't happen, but it does in Chrome on Ubuntu.
            // In these cases, character is actually the key we want!
            // See #881
            key = character.toLowerCase()
          }
          handleKey(true, key, character, event)
          downKey = null
        }
      },

      keyup(event: KeyboardEvent) {
        const key = getKey(event)
        if (key in charMap) {
          handleKey(false, key, charMap[key], event)
        }
      }
    })

    addEvents(getWindow(), {
      blur(event: FocusEvent) {
        // Emit key-up events for all currently pressed keys.
        for (const key in charMap) {
          handleKey(false, key, charMap[key], event)
        }
      }
    })
  }
}

/**
 * Handles a key going down or up, from the DOM's key events or from
 * {@link View#dispatchKeyEvent(type, key[, options])}.
 *
 * @private
 */
export function handleKey(
  down: boolean,
  key: string,
  character: string,
  event: Event,
  view?: View
) {
  // View#dispatchKeyEvent() passes its view. For the DOM's key events, the
  // focused view may have been hidden since the last mouse event, while
  // another one became visible (#1953), and only visible views get them:
  if (!view) {
    View.updateFocus()
    view = View._focused
    if (view && !view.isVisible()) {
      view = null
    }
  }
  // The keydown handler and View#dispatchKeyEvent() can leave out the
  // character, which keyup takes from keydown, as the DOM's keyup does:
  if (character == null) {
    character = down
      ? charLookup[key] || (key.length > 1 ? '' : key)
      : charMap[key] || ''
  }
  keyMap[key] = down
  // Link the key from keydown with the character form keypress, so keyup
  // can retrieve the character again.
  // Use delete instead of setting to null, so charMap only contains keys
  // that are currently pressed, allowing the use of `key in charMap`
  // checks and enumeration over pressed keys, e.g. in the blur event.
  if (down) {
    charMap[key] = character
  } else {
    delete charMap[key]
  }
  // Detect modifiers and mark them as pressed / released
  const name = key.length > 1 && camelize(key)
  if (name && name in modifiers) {
    modifiers[name] = down
    if (name === 'meta' && paper?.agent.mac) {
      // Fix a strange behavior on Mac where no keyup events are
      // received for any keys pressed while the meta key is down.
      // Keep track of the normal keys being pressed and trigger keyup
      // events for all these keys when meta is released:
      if (down) {
        metaFixMap = {}
      } else {
        for (const pressed in metaFixMap) {
          // Make sure it wasn't released already in the meantime:
          if (pressed in charMap) {
            handleKey(false, pressed, metaFixMap[pressed], event, view)
          }
        }
        metaFixMap = null
      }
    }
  } else if (down && metaFixMap) {
    // A normal key, add it to metaFixMap if that's defined.
    metaFixMap[key] = character
  }
  if (view) {
    view._handleKeyEvent(down ? 'keydown' : 'keyup', event, key, character)
  }
}

function getKey(event: KeyboardEvent): string {
  let { key } = event
  // Use short version for arrow keys: ArrowLeft -> Left
  key = /^Arrow[A-Z]/.test(key)
    ? key.substr(5)
    : // This is far from ideal, but what else can we do?
      key === 'Unidentified' || key === undefined
      ? String.fromCharCode(event.keyCode)
      : key
  return (
    keyLookup[key] ||
    // Hyphenate camel-cased special keys, lower-case normal ones:
    (key.length > 1 ? hyphenate(key) : key.toLowerCase())
  )
}
