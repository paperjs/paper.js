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
 * @name SymbolItem
 *
 * @class A symbol item represents an instance of a symbol which has been
 * placed in a Paper.js project.
 *
 * @extends Item
 */
var SymbolItem = Item.extend(/** @lends SymbolItem# */{
    _class: 'SymbolItem',
    _applyMatrix: false,
    _canApplyMatrix: false,
    // SymbolItem uses strokeBounds for bounds
    _boundsOptions: { stroke: true },
    _serializeFields: {
        symbol: null
    },

    /**
     * Creates a new symbol item.
     *
     * @name SymbolItem#initialize
     * @param {SymbolDefinition|Item} definition the definition to place or an
     *     item to place as a symbol
     * @param {Point} [point] the center point of the placed symbol
     *
     * @example {@paperscript split=true height=240}
     * // Placing 100 instances of a symbol:
     * // Create a star shaped path at {x: 0, y: 0}:
     * var path = new Path.Star({
     *     center: new Point(0, 0),
     *     points: 6,
     *     radius1: 5,
     *     radius2: 13,
     *     fillColor: 'white',
     *     strokeColor: 'black'
     * });
     *
     * // Create a symbol definition from the path:
     * var definition = new SymbolDefinition(path);
     *
     * // Place 100 instances of the symbol:
     * for (var i = 0; i < 100; i++) {
     *     // Place an instance of the symbol in the project:
     *     var instance = new SymbolItem(definition);
     *
     *     // Move the instance to a random position within the view:
     *     instance.position = Point.random() * view.size;
     *
     *     // Rotate the instance by a random amount between
     *     // 0 and 360 degrees:
     *     instance.rotate(Math.random() * 360);
     *
     *     // Scale the instance between 0.25 and 1:
     *     instance.scale(0.25 + Math.random() * 0.75);
     * }
     */
    initialize: function SymbolItem(arg0, arg1) {
        // Support two forms of item initialization: Passing one object literal
        // describing all the different properties to be set, or a symbol (arg0)
        // and a point where it should be placed (arg1).
        // If _initialize can set properties through object literal, we're done.
        // Otherwise we need to set symbol from arg0.
        if (!this._initialize(arg0,
                arg1 !== undefined && Point.read(arguments, 1)))
            this.setDefinition(arg0 instanceof SymbolDefinition ?
                    arg0 : new SymbolDefinition(arg0));
    },

    _equals: function(item) {
        // TODO: Compare position too!
        return this._definition === item._definition;
    },

    copyContent: function(source) {
        this.setDefinition(source._definition);
    },

    /**
     * The symbol definition that the placed symbol refers to.
     *
     * @bean
     * @type SymbolDefinition
     */
    getDefinition: function() {
        return this._definition;
    },

    setDefinition: function(definition) {
        this._definition = definition;
        this._changed(/*#=*/Change.GEOMETRY);
    },

    /**
     * @bean
     * @deprecated use {@link #definition} instead.
     */
    getSymbol: '#getDefinition',
    setSymbol: '#setDefinition',

    isEmpty: function() {
        return this._definition._item.isEmpty();
    },

    _getBounds: function(matrix, options) {
        var item = this._definition._item;
        // Redirect the call to the definition item to calculate the bounds.
        return item._getCachedBounds(item._matrix.prepended(matrix), options);
    },

    _hitTestSelf: function(point, options, viewMatrix) {
        // We need to call definition item hit test with `options.all = false`,
        // as otherwise it would populate the array with its own matches.
        // Instead we want only returning one match per symbol-item, see #1680
        var opts = options.extend({ all: false });
        var res = this._definition._item._hitTest(point, opts, viewMatrix);
        // TODO: When the symbol's definition is a path, should hitResult
        // contain information like HitResult#curve?
        if (res)
            res.item = this;
        return res;
    },

    _draw: function(ctx, param) {
        this._definition._item.draw(ctx, param);
    }

    // TODO: SymbolItem#embed()
});
