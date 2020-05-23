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

/**
 * @name Key
 * @namespace
 */
var Key = new function() {
    var keyLookup = {
            // Unify different key identifier naming schemes, e.g. on Gecko, IE:
            '\t': 'tab',
            ' ': 'space',
            '\b': 'backspace',
            '\x7f': 'delete',
            'Spacebar': 'space',
            'Del': 'delete',
            'Win': 'meta',
            'Esc': 'escape'
        },

        // To find corresponding characters for special keys in keydown events:
        charLookup = {
            'tab': '\t',
            'space': ' ',
            'enter': '\r'
        },

        // Only keypress reliable gets char-codes that are actually representing
        // characters with all modifiers taken into account across all browsers.
        // So we need to perform a little trickery here to use these codes with
        // onKeyDown/Up:
        // - keydown is used to handle modifiers and special keys such as
        //   arrows, space, control, etc, for which events are fired right away.
        // - keypress fires the actual onKeyDown event for all other keys.
        // - keyup handles the onKeyUp events for both.
        keyMap = {}, // Map for currently pressed keys
        charMap = {}, // key -> char mappings for pressed keys
        metaFixMap, // Keys that will not receive keyup events due to Mac bug
        downKey, // The key from the keydown event, if it wasn't handled already

        // Use new Base() to convert into a Base object, for #toString()
        modifiers = new Base({
            shift: false,
            control: false,
            alt: false, // WAS: option
            meta: false, // WAS: command
            capsLock: false,
            space: false
        }).inject({
            // Short-cut to modifiers.alt for backward compatibility
            option: {
                get: function() {
                    return this.alt;
                }
            },

            // Platform independent short-cut to modifiers.control / meta,
            // based on whichever key is used for commands.
            command: {
                get: function() {
                    var agent = paper && paper.agent;
                    return agent && agent.mac ? this.meta : this.control;
                }
            }
        });

    function getKey(event) {
        var key = event.key || event.keyIdentifier;
        key = /^U\+/.test(key)
                // Expand keyIdentifier Unicode format.
                ? String.fromCharCode(parseInt(key.substr(2), 16))
                // Use short version for arrow keys: ArrowLeft -> Left
                : /^Arrow[A-Z]/.test(key) ? key.substr(5)
                // This is far from ideal, but what else can we do?
                : key === 'Unidentified'  || key === undefined
                    ? String.fromCharCode(event.keyCode)
                    : key;
        return keyLookup[key] ||
                // Hyphenate camel-cased special keys, lower-case normal ones:
                (key.length > 1 ? Base.hyphenate(key) : key.toLowerCase());
    }

    function handleKey(down, key, character, event) {
        var type = down ? 'keydown' : 'keyup',
            view = View._focused,
            name;
        keyMap[key] = down;
        // Link the key from keydown with the character form keypress, so keyup
        // can retrieve the character again.
        // Use delete instead of setting to null, so charMap only contains keys
        // that are currently pressed, allowing the use of `key in charMap`
        // checks and enumeration over pressed keys, e.g. in the blur event.
        if (down) {
            charMap[key] = character;
        } else {
            delete charMap[key];
        }
        // Detect modifiers and mark them as pressed / released
        if (key.length > 1 && (name = Base.camelize(key)) in modifiers) {
            modifiers[name] = down;
            var agent = paper && paper.agent;
            if (name === 'meta' && agent && agent.mac) {
                // Fix a strange behavior on Mac where no keyup events are
                // received for any keys pressed while the meta key is down.
                // Keep track of the normal keys being pressed and trigger keyup
                // events for all these keys when meta is released:
                if (down) {
                    metaFixMap = {};
                } else {
                    for (var k in metaFixMap) {
                        // Make sure it wasn't released already in the meantime:
                        if (k in charMap)
                            handleKey(false, k, metaFixMap[k], event);
                    }
                    metaFixMap = null;
                }
            }
        } else if (down && metaFixMap) {
            // A normal key, add it to metaFixMap if that's defined.
            metaFixMap[key] = character;
        }
        if (view) {
            view._handleKeyEvent(down ? 'keydown' : 'keyup', event, key,
                    character);
        }
    }

    DomEvent.add(document, {
        keydown: function(event) {
            var key = getKey(event),
                agent = paper && paper.agent;
            // Directly handle any special keys (key.length > 1) in keydown, as
            // not all of them will receive keypress events.
            // Chrome doesn't fire keypress events for command and alt keys,
            // so we need to handle this in a way that works across all OSes.
            if (key.length > 1 || agent && (agent.chrome && (event.altKey
                        || agent.mac && event.metaKey
                        || !agent.mac && event.ctrlKey))) {
                handleKey(true, key,
                        charLookup[key] || (key.length > 1 ? '' : key), event);
            } else {
                // If it wasn't handled yet, store the downKey so keypress can
                // compare and handle buggy edge cases, known to happen in
                // Chrome on Ubuntu.
                downKey = key;
            }
        },

        keypress: function(event) {
            if (downKey) {
                var key = getKey(event),
                    code = event.charCode,
                    // Try event.charCode if its above 32 and fall back onto the
                    // key value if it's a single character, empty otherwise.
                    character = code >= 32 ? String.fromCharCode(code)
                        : key.length > 1 ? '' : key;
                if (key !== downKey) {
                    // This shouldn't happen, but it does in Chrome on Ubuntu.
                    // In these cases, character is actually the key we want!
                    // See #881
                    key = character.toLowerCase();
                }
                handleKey(true, key, character, event);
                downKey = null;
            }
        },

        keyup: function(event) {
            var key = getKey(event);
            if (key in charMap)
                handleKey(false, key, charMap[key], event);
        }
    });

    DomEvent.add(window, {
        blur: function(event) {
            // Emit key-up events for all currently pressed keys.
            for (var key in charMap)
                handleKey(false, key, charMap[key], event);
        }
    });

    return /** @lends Key */{
        /**
         * The current state of the keyboard modifiers.
         *
         * @property
         * @type Object
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
        modifiers: modifiers,

        /**
         * Checks whether the specified key is pressed.
         *
         * @param {String} key any character or special key descriptor:
         *     {@values 'enter', 'space', 'shift', 'control', 'alt', 'meta',
         *     'caps-lock', 'left', 'up', 'right', 'down', 'escape', 'delete',
         *     ...}
         * @return {Boolean} {@true if the key is pressed}
         *
         * @example
         * // Whenever the user clicks, create a circle shaped path. If the
         * // 'a' key is pressed, fill it with red, otherwise fill it with blue:
         * function onMouseDown(event) {
         *     var path = new Path.Circle(event.point, 10);
         *     if (Key.isDown('a')) {
         *         path.fillColor = 'red';
         *     } else {
         *         path.fillColor = 'blue';
         *     }
         * }
         */
        isDown: function(key) {
            return !!keyMap[key];
        }
    };
};
