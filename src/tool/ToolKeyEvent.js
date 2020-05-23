/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2019, Juerg Lehni & Jonathan Puckey
 * http://scratchdisk.com/ & https://puckey.studio/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name ToolKeyEvent
 *
 * @class ToolKeyEvent The ToolKeyEvent object is received by the {@link Tool}'s key
 * event handlers {@link Tool#onKeyDown} and {@link Tool#onKeyUp}. The ToolKeyEvent
 * object is the only parameter passed to these functions and contains
 * information about the key event.
 *
 * @extends Event
 */
var ToolKeyEvent = Event.extend(/** @lends ToolKeyEvent# */{
    _class: 'ToolKeyEvent',
    // Have ToolKeyEvent#item fall back to returning null, not undefined.
    _item: null,

    initialize: function ToolKeyEvent(tool, type, event, key, character) {
        this.tool = tool;
        this.type = type;
        this.event = event;
        this.key = key;
        this.character = character;
    },

    /**
     * The type of tool event.
     *
     * @name ToolKeyEvent#type
     * @type String
     * @values 'keydown', 'keyup'
     */

    /**
     * Convenience method to allow local overrides of point values.
     * See application below.
     */
    _choosePoint: function(point, toolPoint) {
        return point ? point : toolPoint ? toolPoint.clone() : null;
    },

    /**
     * The position of the mouse in project coordinates when the previous
     * mouse event was fired.
     *
     * @bean
     * @type Point
     */
    getPoint: function() {
        return this._choosePoint(this._lastPoint, this.tool._point || this.tool._lastPoint);
    },

    setPoint: function(lastPoint) {
        this._lastPoint = lastPoint;
    },

    /**
     * The position of the mouse in project coordinates when the mouse button
     * was last clicked.
     *
     * @bean
     * @type Point
     */
    getDownPoint: function() {
        return this._choosePoint(this._downPoint, this.tool._downPoint);
    },

    setDownPoint: function(downPoint) {
        this._downPoint = downPoint;
    },

    /**
     * The item at the position of the mouse (if any).
     *
     * If the item is contained within one or more {@link Group} or
     * {@link CompoundPath} items, the most top level group or compound path
     * that it is contained within is returned.
     *
     * @bean
     * @type Item
     */
    getItem: function() {
        if (!this._item) {
            var result = this.tool._scope.project.hitTest(this.getLastPoint());
            if (result) {
                var item = result.item,
                    // Find group parent, but exclude layers
                    parent = item._parent;
                while (/^(Group|CompoundPath)$/.test(parent._class)) {
                    item = parent;
                    parent = parent._parent;
                }
                this._item = item;
            }
        }
        return this._item;
    },

    setItem: function(item) {
        this._item = item;
    },

    /**
     * @return {String} a string representation of the tool event
     */
    toString: function() {
        return "{ type: '" + this.type
                + "', key: '" + this.key
                + "', character: '" + this.character
                + "', modifiers: " + this.getModifiers()
                + " }";
    }
});
