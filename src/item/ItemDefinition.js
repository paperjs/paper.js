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

// The private base of SymbolDefinition and PatternDefinition, which hold an
// item outside of the scene graph that other items draw. The item refers back
// to its definition through #_symbol, which Item#_changed() notifies:
var ItemDefinition = Base.extend({
    // Definitions that center their items move them to 0, 0, see #setItem():
    _centerItem: false,

    initialize: function ItemDefinition(item, dontCenter) {
        this._id = UID.get();
        this.project = paper.project;
        if (item)
            this.setItem(item, dontCenter);
    },

    // Called whenever the definition's item changes:
    _changed: function(flags) {
        if (flags & /*#=*/ChangeFlag.GEOMETRY)
            // Clear cached bounds of all items that this definition is linked
            // to.
            Item._clearBoundsCache(this);
        if (flags & /*#=*/ChangeFlag.APPEARANCE) {
            var project = this.project;
            // Its items may be drawn in any buffered group:
            project._bufferVersion++;
            project._changed(flags);
        }
    },

    getItem: function() {
        return this._item;
    },

    setItem: function(item, _dontCenter) {
        // Make sure we're not stealing another definition's item
        if (item._symbol)
            item = item.clone();
        // Remove previous item's reference to this definition
        if (this._item)
            this._item._symbol = null;
        this._item = item;
        // Remove item from DOM, as it's embedded in the definition now.
        item.remove();
        item.setSelected(false);
        if (this._centerItem && !_dontCenter)
            item.setPosition(new Point());
        item._symbol = this;
        this._changed(/*#=*/Change.GEOMETRY);
    }
});
