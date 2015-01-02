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
 * @name SegmentPoint
 * @class An internal version of Point that notifies its segment of each change
 * Note: This prototype is not exported.
 *
 * @private
 */
var SegmentPoint = Point.extend({
    initialize: function SegmentPoint(point, owner, key) {
        var x, y, selected;
        if (!point) {
            x = y = 0;
        } else if ((x = point[0]) !== undefined) { // Array-like
            y = point[1];
        } else {
            // So we don't have to modify the point argument which causes
            // deoptimization:
            var pt = point;
            // If not Point-like already, read Point from arguments
            if ((x = pt.x) === undefined) {
                pt = Point.read(arguments);
                x = pt.x;
            }
            y = pt.y;
            selected = pt.selected;
        }
        this._x = x;
        this._y = y;
        this._owner = owner;
        // We have to set the owner's property that points to this point already
        // now, so #setSelected(true) can work.
        owner[key] = this;
        if (selected)
            this.setSelected(true);
    },

    set: function(x, y) {
        this._x = x;
        this._y = y;
        this._owner._changed(this);
        return this;
    },

    _serialize: function(options) {
        var f = options.formatter,
            x = f.number(this._x),
            y = f.number(this._y);
        return this.isSelected()
                ? { x: x, y: y, selected: true }
                : [x, y];
    },

    getX: function() {
        return this._x;
    },

    setX: function(x) {
        this._x = x;
        this._owner._changed(this);
    },

    getY: function() {
        return this._y;
    },

    setY: function(y) {
        this._y = y;
        this._owner._changed(this);
    },

    isZero: function() {
        // Provide our own version of Point#isZero() that does not use the x / y
        // accessors but the internal properties directly, for performance
        // reasons, since it is used a lot internally.
        return Numerical.isZero(this._x) && Numerical.isZero(this._y);
    },

    setSelected: function(selected) {
        this._owner.setSelected(selected, this);
    },

    isSelected: function() {
        return this._owner.isSelected(this);
    }
});
