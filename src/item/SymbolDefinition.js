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
 * @name SymbolDefinition
 *
 * @class Symbols allow you to place multiple instances of an item in your
 * project. This can save memory, since all instances of a symbol simply refer
 * to the original item and it can speed up moving around complex objects, since
 * internal properties such as segment lists and gradient positions don't need
 * to be updated with every transformation.
 */
var SymbolDefinition = Base.extend(/** @lends SymbolDefinition# */{
    _class: 'SymbolDefinition',

    /**
     * Creates a Symbol definition.
     *
     * @param {Item} item the source item which is removed from the scene graph
     *     and becomes the symbol's definition.
     * @param {Boolean} [dontCenter=false]
     *
     * @example {@paperscript split=true height=240}
     * // Placing 100 instances of a symbol:
     * var path = new Path.Star(new Point(0, 0), 6, 5, 13);
     * path.style = {
     *     fillColor: 'white',
     *     strokeColor: 'black'
     * };
     *
     * // Create a symbol definition from the path:
     * var definition = new SymbolDefinition(path);
     *
     * // Place 100 instances of the symbol definition:
     * for (var i = 0; i < 100; i++) {
     *     // Place an instance of the symbol definition in the project:
     *     var instance = definition.place();
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
    initialize: function SymbolDefinition(item, dontCenter) {
        this._id = UID.get();
        this.project = paper.project;
        if (item)
            this.setItem(item, dontCenter);
    },

    _serialize: function(options, dictionary) {
        return dictionary.add(this, function() {
            return Base.serialize([this._class, this._item],
                    options, false, dictionary);
        });
    },

    /**
     * The project that this symbol belongs to.
     *
     * @type Project
     * @readonly
     * @name SymbolDefinition#project
     */

    /**
     * Private notifier that is called whenever a change occurs in this symbol's
     * definition.
     *
     * @param {ChangeFlag} flags describes what exactly has changed
     */
    _changed: function(flags) {
        if (flags & /*#=*/ChangeFlag.GEOMETRY)
            // Clear cached bounds of all items that this symbol is linked to.
            Item._clearBoundsCache(this);
        if (flags & /*#=*/ChangeFlag.APPEARANCE)
            this.project._changed(flags);
    },

    /**
     * The item used as the symbol's definition.
     *
     * @bean
     * @type Item
     */
    getItem: function() {
        return this._item;
    },

    setItem: function(item, _dontCenter) {
        // Make sure we're not stealing another symbol's definition
        if (item._symbol)
            item = item.clone();
        // Remove previous definition's reference to this symbol
        if (this._item)
            this._item._symbol = null;
        this._item = item;
        // Remove item from DOM, as it's embedded in Symbol now.
        item.remove();
        item.setSelected(false);
        // Move position to 0, 0, so it's centered when placed.
        if (!_dontCenter)
            item.setPosition(new Point());
        item._symbol = this;
        this._changed(/*#=*/Change.GEOMETRY);
    },

    /**
     * @bean
     * @deprecated use {@link #item} instead.
     */
    getDefinition: '#getItem',
    setDefinition: '#setItem',

    /**
     * Places in instance of the symbol in the project.
     *
     * @param {Point} [position] the position of the placed symbol
     * @return {SymbolItem}
     */
    place: function(position) {
        return new SymbolItem(this, position);
    },

    /**
     * Returns a copy of the symbol.
     *
     * @return {SymbolDefinition}
     */
    clone: function() {
        return new SymbolDefinition(this._item.clone(false));
    },

    /**
     * Checks whether the symbol's definition is equal to the supplied symbol.
     *
     * @param {SymbolDefinition} symbol
     * @return {Boolean} {@true if they are equal}
     */
    equals: function(symbol) {
        return symbol === this
                || symbol && this._item.equals(symbol._item)
                || false;
    }
});
