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

    // DOCS: Palette#initialize(props)
    // DOCS: Palette#initialize(title, components, values)
    // DOCS: Palette#components
    // DOCS: Palette#values
    // DOCS: Palette#remove()

    initialize: function Palette(title, components, values) {
        // Support object literal constructor
        var props = Base.isPlainObject(title) && title,
            name;
        if (props) {
            title = props.title;
            components = props.components;
            values = props.values;
            name = props.name;
        }
        this._id = Palette._id = (Palette._id || 0) + 1;
        this._title = title;
        this._name = name || title
                ? Base.hyphenate(title).replace(/\W/g, '_')
                : 'palette-' + this._id;
        this._values = values || {};
        this._components = components;
        // Create one root component that handles the layout and contains all
        // the components.
        var root = this._root = new Component(this, null, 'root', components,
                this._values);
        // Write the created components back into the passed components object,
        // so they are exposed and can easily be accessed from the outside.
        Base.set(components, root._components);
        var parent = DomElement.find('.palettejs-root')
            || DomElement.find('body').appendChild(DomElement.create('div', {
                    class: 'palettejs-root'
                }));
        this._element = parent.appendChild(DomElement.create('div', {
                    class: 'palettejs-palette palettejs-' + root._className,
                    id: 'palettejs-palette-' + this._name
                }, [root._table]));
        this.setTitle(title);
        if (props)
            this._set(props, { title: true, components: true, values: true });
        // Link to the current scope's palettes list.
        // TODO: This is the only paper dependency in Palette.js
        // Find a way to make it independent.
        (this._palettes = paper.palettes).push(this);
    },

    getComponents: function() {
        return this._components;
    },

    getValues: function() {
        return this._values;
    },

    getTitle: function() {
        return this._root.getTitle();
    },

    setTitle: function(title) {
        return this._root.setTitle(title);
    },

    getEnabled: function() {
        return this._root.getEnabled();
    },

    setEnabled: function(enabled) {
        return this._root.setEnabled(enabled);
    },

    /**
     * Resets the values of the components to their
     * {@link Component#defaultValue}.
     */
    reset: function() {
        this._root.reset();
    },

    remove: function() {
        DomElement.remove(this._element);
        var palettes = this._palettes;
        var index = palettes.indexOf(this);
        var remove = index !== -1;
        if (remove)
            palettes.splice(index, 1);
        return remove;
    }
});
