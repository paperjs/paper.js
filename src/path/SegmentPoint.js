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
 * @name SegmentPoint
 * @class An internal version of Point that notifies its segment of each change
 *
 * @private
 */
var SegmentPoint = Point.extend({
    initialize: function SegmentPoint(point, owner, key) {
        var x, y,
            selected;
        if (!point) {
            x = y = 0;
        } else if ((x = point[0]) !== undefined) { // Array-like
            y = point[1];
        } else {
            // So we don't have to modify the point argument which would cause
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
        owner[key] = this;
        // We need to call #setSelected(true) after setting property on the
        // owner that references this point.
        if (selected)
            this.setSelected(true);
    },

    // See Point#_set() for an explanation of #_set():
    _set: function(x, y) {
        this._x = x;
        this._y = y;
        this._owner._changed(this);
        return this;
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
        var isZero = Numerical.isZero;
        // Provide our own version of Point#isZero() that does not use the x / y
        // accessors but the internal properties directly, for performance
        // reasons, since it is used a lot internally.
        return isZero(this._x) && isZero(this._y);
    },

    isSelected: function() {
        return !!(this._owner._selection & this._getSelection());
    },

    setSelected: function(selected) {
        this._owner._changeSelection(this._getSelection(), selected);
    },

    _getSelection: function() {
        var owner = this._owner;
        return this === owner._point ? /*#=*/SegmentSelection.POINT
            : this === owner._handleIn ? /*#=*/SegmentSelection.HANDLE_IN
            : this === owner._handleOut ? /*#=*/SegmentSelection.HANDLE_OUT
            : 0;
    }
});
