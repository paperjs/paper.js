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
var Palette = Base.extend(Emitter, /** @lends Palette# */{
    _class: 'Palette',
    _events: [ 'onChange' ],

    // DOCS: Palette#initialize(props)
    // DOCS: Palette#initialize(title, components, values)
    // DOCS: Palette#components
    // DOCS: Palette#values
    // DOCS: Palette#remove()

    initialize: function Palette(props) {
        // Support legacy constructor(title, components, values)
        if (!Base.isPlainObject(props)) {
            var args = arguments;
            props = { title: args[0], components: args[1], values: args[2] };
        }
        var components = this._components = props.components,
            id = this._id = Palette._id = (Palette._id || 0) + 1,
            title = props.title,
            name = this._name = props.name || (title
                    ? Base.hyphenate(title).replace(/\W/g, '_')
                    : 'palette-' + this._id);
        this._values = props.values || {};
        // Create one root component that handles the layout and contains all
        // the components.
        var root = this._root = new Component(this, null, 'root', components,
                this._values);
        // Write the created components back into the passed components object,
        // so they are exposed and can easily be accessed from the outside.
        Base.set(components, root._components);
        var parent = props.parent
                || DomElement.find('.palettejs-root')
                || DomElement.find('body').appendChild(
                    DomElement.create('div', { class: 'palettejs-root' }));
        this._element = parent.appendChild(DomElement.create('div', {
                    class: 'palettejs-palette palettejs-' + root._className,
                    id: 'palettejs-palette-' + name,
                    'data-id': id
                }, [root._table]));
        this._set(props, { components: true, values: true, parent: true });
        // Link to the current scope's palettes list.
        // TODO: This is the only paper dependency in Palette.js
        // Find a way to make it independent.
        (this._palettes = paper.palettes).push(this);
        Palette._palettes[id] = this;
    },

    getName: function() {
        return this._name;
    },

    getElement: function() {
        return this._element;
    },

    getComponents: function() {
        return this._components;
    },

    getValues: function() {
        return this._values;
    },

    /**
     * @name Palette#reset()
     * @function
     *
     * Resets the values of the components to their
     * {@link Component#defaultValue}.
     */

    remove: function() {
        DomElement.remove(this._element);
        var palettes = this._palettes;
        var index = palettes.indexOf(this);
        var remove = index !== -1;
        if (remove)
            palettes.splice(index, 1);
        return remove;
    },

    statics: {
        _palettes: {},

        get: function(idOrElement) {
            if (typeof idOrElement === 'object') {
                // Support child elements by walking up the parents of the
                // element until the palette element is found.
                while (idOrElement && !DomElement.hasClass(idOrElement,
                        'palettejs-palette'))
                    idOrElement = idOrElement.parentNode;
                idOrElement = DomElement.get(idOrElement, 'data-id');
            }
            return Palette._palettes[idOrElement];
        }
    }
}, Base.each(['getTitle', 'setTitle', 'isEnabled', 'setEnabled', 'reset'],
    function(name) {
        this[name] = function() {
            var root = this._root;
            return root[name].apply(root, arguments);
        }
    }, {})
);
