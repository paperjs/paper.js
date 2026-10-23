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
var SymbolDefinition = ItemDefinition.extend(/** @lends SymbolDefinition# */{
    _class: 'SymbolDefinition',
    // Move the item to 0, 0, so it's centered when placed:
    _centerItem: true,

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
        // JSON passes the options of the definition instead, which can
        // include dontCenter:
        var options = Base.isPlainObject(dontCenter) && dontCenter;
        ItemDefinition.call(this, item,
                options ? options.dontCenter : dontCenter);
        if (options)
            this.set(options, { dontCenter: true });
    },

    _serialize: function(options, dictionary) {
        return dictionary.add(this, function() {
            var json = [this._class, this._item],
                props = {};
            // Keep items that the definition didn't center in place:
            if (!this._item.getPosition().isZero())
                props.dontCenter = true;
            if (this._name)
                props.name = this._name;
            if (Object.keys(props).length)
                json.push(props);
            return Base.serialize(json, options, false, dictionary);
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
     * The name of the symbol.
     *
     * @name SymbolDefinition#name
     * @property
     * @type String
     */

    /**
     * The item used as the symbol's definition.
     *
     * @name SymbolDefinition#item
     * @property
     * @type Item
     */

    /**
     * @bean
     * @type Item
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
