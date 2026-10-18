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

// Reads object literals such as `{ right: 100, width: 50 }` in any order: The
// first side or center set per axis moves the rectangle and keeps its size,
// further ones change the size.
var RectangleBuilder = Rectangle.extend({
    // Redefine the bean accessors of the overridden setters, including #size,
    // whose getter has a hidden parameter:
    beans: true,

    // _fw / _fh can either be 0 (off) or 1 (on), and is used to protect
    // width / height values against changes. They are on by default, and
    // switched off once properties are used that change the outside of the
    // rectangle, so combinations of: left / top / right / bottom.
    // _sx / _sy can either be 0 (left), 0.5 (center) or 1 (right), and is
    // used as direct factors to calculate the x / y adjustments from the size
    // differences.
    _fw: 1,
    _fh: 1,

    setSize: function(/* size */) {
        var size = Size.read(arguments),
            sx = this._sx,
            sy = this._sy,
            w = size.width,
            h = size.height;
        if (sx) {
            this.x += (this.width - w) * sx;
        }
        if (sy) {
            this.y += (this.height - h) * sy;
        }
        this.width = w;
        this.height = h;
        this._fw = this._fh = 1;
    },

    setLeft: function(left) {
        if (!this._fw) {
            var amount = left - this.x;
            this.width -= this._sx === 0.5 ? amount * 2 : amount;
        }
        this.x = left;
        this._sx = this._fw = 0;
    },

    setTop: function(top) {
        if (!this._fh) {
            var amount = top - this.y;
            this.height -= this._sy === 0.5 ? amount * 2 : amount;
        }
        this.y = top;
        this._sy = this._fh = 0;
    },

    setRight: function(right) {
        if (!this._fw) {
            var amount = right - this.x;
            this.width = this._sx === 0.5 ? amount * 2 : amount;
        }
        this.x = right - this.width;
        this._sx = 1;
        this._fw = 0;
    },

    setBottom: function(bottom) {
        if (!this._fh) {
            var amount = bottom - this.y;
            this.height = this._sy === 0.5 ? amount * 2 : amount;
        }
        this.y = bottom - this.height;
        this._sy = 1;
        this._fh = 0;
    },

    setCenterX: function(x) {
        // If we're asked to fix the width or if _sx is already in center mode,
        // just keep moving the center.
        if (this._fw || this._sx === 0.5) {
            this.x = x - this.width / 2;
        } else {
            if (this._sx) {
                this.x += (x - this.x) * 2 * this._sx;
            }
            this.width = (x - this.x) * 2;
        }
        this._sx = 0.5;
        this._fw = 0;
    },

    setCenterY: function(y) {
        // If we're asked to fix the height or if _sy is already in center mode,
        // just keep moving the center.
        if (this._fh || this._sy === 0.5) {
            this.y = y - this.height / 2;
        } else {
            if (this._sy) {
                this.y += (y - this.y) * 2 * this._sy;
            }
            this.height = (y - this.y) * 2;
        }
        this._sy = 0.5;
        this._fh = 0;
    }
});
