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
  * @extends Pane
  */
/* var Palette = */ Pane.extend(/** @lends Palette# */{
    _class: 'Palette',

    // DOCS: Palette#initialize(props)
    // DOCS: Palette#initialize(title, components, values)
    // DOCS: Palette#components
    // DOCS: Palette#values
    // DOCS: Palette#remove()

    initialize: function Palette(title, components, values) {
        Pane.call(this, title, components, values, 'palettejs-palette');
        var parent = DomElement.find('.palettejs-panel')
            || DomElement.find('body').appendChild(
                DomElement.create('div', { class: 'palettejs-panel' }));
        parent.appendChild(this._element);
        // Link to the current scope's palettes list.
        // TODO: This is the only paper dependency in Palette.js
        // Find a way to make it independent.
        (this._palettes = paper.palettes).push(this);
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
