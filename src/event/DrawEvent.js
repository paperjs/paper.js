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
 * @name DrawEvent
 *
 * @class The DrawEvent object is received by the {@link Item}'s drawing
 * handlers {@link Item#onDraw} and {@link Item#onDrawSelection}, which
 * describe its fields.
 */
var DrawEvent = Base.extend(/** @lends DrawEvent# */{
    _class: 'DrawEvent',

    initialize: function DrawEvent(props) {
        Base.set(this, props);
    },

    prevented: false,

    /**
     * Skips the item's default drawing, as returning `false` from the handler
     * does.
     */
    preventDefault: function() {
        this.prevented = true;
    },

    // Emitter#emit() calls stop() when a handler returns false:
    stop: '#preventDefault'
});
