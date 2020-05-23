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
 * @name PaperScopeItem
 *
 * @class A private base class for all classes that have lists and references in
 * the {@link PaperScope} ({@link Project}, {@link View}, {@link Tool}), so
 * functionality can be shared.
 *
 * @private
 */
var PaperScopeItem = Base.extend(Emitter, /** @lends PaperScopeItem# */{

    /**
     * Creates a PaperScopeItem object.
     */
    initialize: function(activate) {
        // Store reference to the currently active global paper scope:
        this._scope = paper;
        // Push it onto this._scope[this._list] and set _index:
        this._index = this._scope[this._list].push(this) - 1;
        // If the project has no active reference, activate this one
        if (activate || !this._scope[this._reference])
            this.activate();
    },

    activate: function() {
        if (!this._scope)
            return false;
        var prev = this._scope[this._reference];
        if (prev && prev !== this)
            prev.emit('deactivate');
        this._scope[this._reference] = this;
        this.emit('activate', prev);
        return true;
    },

    isActive: function() {
        return this._scope[this._reference] === this;
    },

    remove: function() {
        if (this._index == null)
            return false;
        Base.splice(this._scope[this._list], null, this._index, 1);
        // Clear the active tool reference if it was pointint to this.
        if (this._scope[this._reference] == this)
            this._scope[this._reference] = null;
        this._scope = null;
        return true;
    },

    getView: function() {
        return this._scope.getView();
    }
});
