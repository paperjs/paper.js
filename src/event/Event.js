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
 * @name Event
 *
 * @class The Event object is the base class for any of the other event types,
 * such as {@link MouseEvent}, {@link ToolEvent} and {@link KeyEvent}.
 */
/* global Event: true */
var Event = Base.extend(/** @lends Event# */{
    _class: 'Event',

    initialize: function Event(event) {
        this.event = event;
        this.type = event && event.type;
    },

    prevented: false,
    stopped: false,

    /**
     * Cancels the event if it is cancelable, without stopping further
     * propagation of the event.
     */
    preventDefault: function() {
        this.prevented = true;
        this.event.preventDefault();
    },

    /**
     * Prevents further propagation of the current event.
     */
    stopPropagation: function() {
        this.stopped = true;
        this.event.stopPropagation();
    },

    /**
     * Cancels the event if it is cancelable, and stops stopping further
     * propagation of the event. This is has the same effect as calling both
     * {@link #stopPropagation()} and {@link #preventDefault()}.
     *
     * Any handler can also return `false` to indicate that `stop()` should be
     * called right after.
     */
    stop: function() {
        this.stopPropagation();
        this.preventDefault();
    },

    /**
     * The time at which the event was created, in seconds, as the times of
     * frame events are. Browsers count from the page's time origin, as
     * `performance.now()` does, while
     * {@link View#dispatchMouseEvent(type, point[, options])} and
     * {@link View#dispatchKeyEvent(type, key[, options])} use `Date.now()`
     * unless the host passes a time, so only compare the times of events from
     * the same source.
     *
     * @bean
     * @type Number
     */
    getTime: function() {
        return this.event.timeStamp / 1000;
    },

    /**
     * @private
     * @bean
     * @deprecated use {@link #time} instead, which is in seconds.
     */
    getTimeStamp: function() {
        return this.event.timeStamp;
    },

    /**
     * The current state of the keyboard modifiers.
     *
     * @bean
     * @type object
     * @see Key.modifiers
     */
    getModifiers: function() {
        return Key.modifiers;
    }
});
