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
 * @name HostItem
 *
 * @class A HostItem represents a node of a host document that has no
 * counterpart in Paper.js. Its bounds come from the host, it draws nothing,
 * and only its matrix and attributes can be changed. Hosts can extend it to
 * expose their own node kinds, storing their properties in `_values`, and
 * declare `_hasChildren: true` for kinds that contain other items.
 *
 * @extends Item
 */
var HostItem = Item.extend(/** @lends HostItem# */{
    _class: 'HostItem',
    _applyMatrix: false,
    _canApplyMatrix: false,
    _hasChildren: false,

    initialize: function HostItem(props) {
        this._values = {};
        if (this._hasChildren) {
            this._children = [];
            this._namedChildren = {};
        }
        this._initialize(props);
    },

    _getBounds: function(matrix, options) {
        // The host's bounds also cover what it paints beyond the children:
        var rect = this._getSourceBounds(options);
        return matrix ? matrix._transformBounds(rect) : rect;
    },

    _hitTestSelf: function(point, options) {
        var bounds = this._getSourceBounds({ stroke: true, handle: true });
        if (options.fill && bounds._containsPoint(point)) {
            return new HitResult('fill', this);
        }
    },

    _draw: function() {
        // The host draws its own nodes.
    }
});
