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
 * @name MouseEvent
 *
 * @class The MouseEvent object is received by the {@link Item}'s mouse event
 * handlers {@link Item#onMouseDown}, {@link Item#onMouseDrag},
 * {@link Item#onMouseMove}, {@link Item#onMouseUp}, {@link Item#onClick},
 * {@link Item#onDoubleClick}, {@link Item#onMouseEnter} and
 * {@link Item#onMouseLeave}. The MouseEvent object is the only parameter passed
 * to these functions and contains information about the mouse event.
 *
 * @extends Event
 */
/* global MouseEvent: true */
var MouseEvent = Event.extend(/** @lends MouseEvent# */{
    _class: 'MouseEvent',

    initialize: function MouseEvent(type, event, point, target, delta) {
        this.type = type;
        this.event = event;
        this.point = point;
        this.target = target;
        this.delta = delta;
    },

    /**
     * The type of mouse event.
     *
     * @name MouseEvent#type
     * @type String
     * @values 'mousedown', 'mouseup', 'mousedrag', 'click', 'doubleclick',
     *     'mousemove', 'mouseenter', mouseleave'
     */

    /**
     * The position of the mouse in project coordinates when the event was
     * fired.
     *
     * @name MouseEvent#point
     * @type Point
     */

    // DOCS: document MouseEvent#target
    /**
     * @name MouseEvent#target
     * @type Item
     */

    // DOCS: document MouseEvent#delta
    /**
     * @name MouseEvent#delta
     * @type Point
     */

    /**
     * @return {String} a string representation of the mouse event
     */
    toString: function() {
        return "{ type: '" + this.type
                + "', point: " + this.point
                + ', target: ' + this.target
                + (this.delta ? ', delta: ' + this.delta : '')
                + ', modifiers: ' + this.getModifiers()
                + ' }';
    }
});
