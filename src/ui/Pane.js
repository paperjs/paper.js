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

    initialize: function Pane(title, components, values) {
        // Support object literal constructor
        var props = Base.isPlainObject(title) && title;
        if (props) {
            title = props.title;
            components = props.components;
            values = props.values;
        }
        if (!values)
            values = {};
        this._table = DomElement.create('table', { class: 'palettejs-pane' });
        this._title = title;
        // NOTE: We modify the actual passed components and values objects so
        // the newly created components and their values can easily be
        // referenced from outside.
        this._components = components;
        this._values = values;
        this._maxComponents = 1; // 1 component per row is the default.
        for (var name in components) {
            var row = DomElement.create('tr', { class: 'palettejs-row' }),
                component = new Component(this, name, components[name],
                        values[name], row);
            DomElement.set(row, 'id', 'palettejs-row-' + component._name);
            this._table.appendChild(row);
        }
        if (this._maxComponents > 1) {
            for (name in components) {
                var component = components[name];
                if (component._inputCell && !component._parent) {
                    DomElement.set(component._inputCell, 'colspan',
                            this._maxComponents * 2 - 1);
                }
            }
        }
        // Now replace each entry in values with a getter / setters so we can
        // directly link the value to the component and  observe change.
        Base.each(values, function(value, name) {
            var component = components && components[name];
            if (component) {
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
            }
        });
        if (props) {
            Base.set(this, props,
                    { title: true, components: true, values: true });
        }
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
