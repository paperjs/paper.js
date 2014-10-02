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
  * @name Pane
  * @class
  */
var Pane = Base.extend(Callback, /** @lends Pane# */{
    _class: 'Pane',
    _events: [ 'onChange' ],
    // Defaults for internals
    _enabled: true,

    initialize: function Pane(components, values, parent, parentRow) {
        if (!values)
            values = {};
        this._table = !parentRow && DomElement.create('table', {
            class: 'palettejs-pane'
        });
        // NOTE: We modify the actual passed components in the root pane, and
        // also the values objects, so the newly created components and their
        // values can easily be referenced from outside.
        var comps = this._components = parent ? {} : components;
        this._values = values;
        var numCells = 0;
        this._numCells = 0;
        for (var name in components) {
            var component = components[name];
            if (Base.isPlainObject(component)) {
                var row = parentRow || DomElement.addChildren(this._table,
                        ['tr', { class: 'palettejs-row' }])[0];
                new Component(this, name, component, values, row, parent);
                numCells = Math.max(numCells, this._numCells);
                // Do not reset cell counter if all components go to the same
                // parent row.
                if (!parentRow)
                    this._numCells = 0;
                if (parent) {
                    // If this is a child pane, remove the entry now from the
                    // object that was provided to create it, since the left
                    // overs will be injected into the parent component through
                    // #_set()
                    delete components[name];
                }
            }
        }
        this._numCells = numCells;
        Base.each(comps, function(component, name) {
            // Update colspan in all components that are not nested in another
            // component.
            if (numCells > 2 && component._cell
                    && (!parent || parent._type === 'column')) {
                DomElement.set(component._cell, 'colspan', numCells - 1);
            }
            // Now replace each entry in values with a getter / setters so we
            // can directly link the value to the component and  observe change.
            Base.define(values, name, {
                enumerable: true,
                configurable: true,
                get: function() {
                    return component.getValue();
                },
                set: function(val) {
                    component.setValue(val);
                }
            });
        });
    },

    getComponents: function() {
        return this._components;
    },

    getValues: function() {
        return this._values;
    },

    getEnabled: function() {
        return this._enabled;
    },

    setEnabled: function(enabled) {
        this._enabled = enabled;
        for (var i in this._components)
            this._components[i].setEnabled(enabled, true);
    },

    /**
     * Resets the values of the components to their
     * {@link Component#defaultValue}.
     */
    reset: function() {
        for (var i in this._components)
            this._components[i].reset();
    }
});
