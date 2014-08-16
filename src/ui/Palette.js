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
  * @name Palette
  * @class
  */
/* var Palette = */ Base.extend(Callback, /** @lends Palette# */{
    _class: 'Palette',
    _events: [ 'onChange' ],

    // DOCS: Palette#initialize
    // DOCS: Palette#components
    // DOCS: Palette#values
    // DOCS: Palette#remove()

    initialize: function Palette(title, components, values) {
        var parent = DomElement.find('.palettejs-panel')
            || DomElement.find('body').appendChild(
                DomElement.create('div', { 'class': 'palettejs-panel' }));
        this._element = parent.appendChild(
            DomElement.create('table', { 'class': 'palettejs-pane' }));
        this._title = title;
        if (!values)
            values = {};
        for (var name in (this.components = components)) {
            var component = components[name];
            if (!(component instanceof Component)) {
                if (component.value == null)
                    component.value = values[name];
                component.name = name;
                component = components[name] = new Component(component);
            }
            this._element.appendChild(component._element);
            component._palette = this;
            // Make sure each component has an entry in values, so observers get
            // installed further down.
            if (values[name] === undefined)
                values[name] = component.value;
        }
        // Now replace each entry in values with a getter / setters so we can
        // directly link the value to the component and  observe change.
        this.values = Base.each(values, function(value, name) {
            var component = components[name];
            if (component) {
                Base.define(values, name, {
                    enumerable: true,
                    configurable: true,
                    get: function() {
                        return component._value;
                    },
                    set: function(val) {
                        component.setValue(val);
                    }
                });
            }
        });
        if (window.paper)
            paper.palettes.push(this);
    },

    /**
     * Resets the values of the components to their
     * {@link Component#defaultValue}.
     */
    reset: function() {
        for (var i in this.components)
            this.components[i].reset();
    },

    remove: function() {
        DomElement.remove(this._element);
    }
});
