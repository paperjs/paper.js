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
 * @name KeyEvent
 *
 * @class The KeyEvent object is received by the {@link Tool}'s keyboard
 * handlers {@link Tool#onKeyDown}, {@link Tool#onKeyUp}. The KeyEvent object is
 * the only parameter passed to these functions and contains information about
 * the keyboard event.
 *
 * @extends Event
 */
var KeyEvent = Event.extend(/** @lends KeyEvent# */{
    _class: 'KeyEvent',

    initialize: function KeyEvent(type, event, key, character) {
        this.type = type;
        this.event = event;
        this.key = key;
        this.character = character;
    },

    /**
     * The type of mouse event.
     *
     * @name KeyEvent#type
     * @type String
     * @values 'keydown', 'keyup'
     */

    /**
     * The character representation of the key that caused this key event,
     * taking into account the current key-modifiers (e.g. shift, control,
     * caps-lock, etc.)
     *
     * @name KeyEvent#character
     * @type String
     */

    /**
     * The key that caused this key event, either as a lower-case character or
     * special key descriptor.
     *
     * @name KeyEvent#key
     * @type String
     * @values 'enter', 'space', 'shift', 'control', 'alt', 'meta', 'caps-lock',
     *     'left', 'up', 'right', 'down', 'escape', 'delete', ...
     */

    /**
     * @return {String} a string representation of the key event
     */
    toString: function() {
        return "{ type: '" + this.type
                + "', key: '" + this.key
                + "', character: '" + this.character
                + "', modifiers: " + this.getModifiers()
                + " }";
    }
});
