/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2014, Juerg Lehni & Jonathan Puckey
 * http://scratchdisk.com/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name Event
 * @class
 */
var Event = Base.extend(/** @lends Event# */{
    _class: 'Event',

    initialize: function Event(event) {
        this.event = event;
    },

    isPrevented: false,
    isStopped: false,

    preventDefault: function() {
        this.isPrevented = true;
        this.event.preventDefault();
    },

    stopPropagation: function() {
        this.isStopped = true;
        this.event.stopPropagation();
    },

    stop: function() {
        this.stopPropagation();
        this.preventDefault();
    },

    // DOCS: Document Event#modifiers
    /**
     * @type object
     * @bean
     */
    getModifiers: function() {
        return Key.modifiers;
    }
});
