/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2016, Juerg Lehni & Jonathan Puckey
 * http://scratchdisk.com/ & http://jonathanpuckey.com/
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
            'Spacebar': 'space',
            'Win': 'meta',
            'Del': 'delete',
            'Esc': 'escape',
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
        // - keydown is used to store the downKey and handle modifiers and
        //   special keys such as arrows, space, etc.
        // - keypress then fires the actual onKeyDown event and maps the downKey
        //   to the keypress charCode so keyup can do the right thing.
        keyMap = {}, // Map for currently pressed keys
        charMap = {}, // key -> char mappings for pressed keys
        metaFixMap, // Keys that will not receive keyup events due to Mac bug
        downKey, // The last key from keydown

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
                    return paper.browser.mac ? this.meta : this.control;
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
                : key === 'Unidentified' ? String.fromCharCode(event.keyCode)
                : key;
        return keyLookup[key] ||
                // Hyphenate camel-cased special keys, lower-case normal ones:
                (key.length > 1 ? Base.hyphenate(key) : key.toLowerCase());
    }

    function handleKey(down, key, character, event) {
        var type = down ? 'keydown' : 'keyup',
            view = View._focused,
            scope = view && view.isVisible() && view._scope,
            tool = scope && scope.tool,
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
            if (name === 'meta' && paper.browser.mac) {
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
        if (tool && tool.responds(type)) {
            // Update global reference to this scope.
            paper = scope;
            // Call the onKeyDown or onKeyUp handler if present
            tool.emit(type, new KeyEvent(down, key, character, event));
            if (view)
                view.update();
        }
    }

    DomEvent.add(document, {
        keydown: function(event) {
            var key = getKey(event),
                browser = paper.browser;
            // Directly handle any special keys (key.length > 1) in keydown, as
            // not all of them will receive keypress events.
            // Chrome doesn't fire keypress events for command and alt keys,
            // so we need to handle this in a way that works across all OSes.
            if (key.length > 1 || browser.chrome && (event.altKey
                        || browser.mac && event.metaKey
                        || !browser.mac && event.ctrlKey)) {
                handleKey(true, key, charLookup[key]
                        || (key.length > 1 ? '' : key), event);
                // Do not set downKey as we handled it already. E.g. space would
                // be handled twice otherwise, once here, once in keypress.
            } else {
                downKey = key;
            }
        },

        keypress: function(event) {
            if (downKey) {
                var code = event.charCode;
                // Try event.charCode if its above 32 and fall back onto the
                // key value if it's a single character, empty otherwise.
                handleKey(true, downKey, code >= 32
                        ? String.fromCharCode(code)
                        : downKey.length > 1 ? '' : downKey, event);
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
         * @param {String} key any character or special key descriptor, e.g.:
         *     {@strings enter, space, shift, control, alt, meta, caps-lock,
         *     left, up, right, down, escape, delete, ...}
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
