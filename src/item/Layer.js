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
 * @name Layer
 *
 * @class The Layer item represents a layer in a Paper.js project.
 *
 * The layer which is currently active can be accessed through
 * {@link Project#activeLayer}.
 * An array of all layers in a project can be accessed through
 * {@link Project#layers}.
 *
 * @extends Group
 */
var Layer = Group.extend(/** @lends Layer# */{
    _class: 'Layer',
    // Turn on again for now, since examples depend on it.
    // TODO: Discus with @puckey and come to a conclusion
    // _selectChildren: false,

    // DOCS: improve constructor code example.
    /**
     * Creates a new Layer item and places it at the end of the
     * {@link Project#layers} array. The newly created layer will be activated,
     * so all newly created items will be placed within it.
     *
     * @name Layer#initialize
     * @param {Item[]} [children] An array of items that will be added to the
     * newly created layer
     *
     * @example
     * var layer = new Layer();
     */
    /**
     * Creates a new Layer item and places it at the end of the
     * {@link Project#layers} array. The newly created layer will be activated,
     * so all newly created items will be placed within it.
     *
     * @name Layer#initialize
     * @param {Object} object an object containing the properties to be set on
     *     the layer
     *
     * @example {@paperscript}
     * var path = new Path([100, 100], [100, 200]);
     * var path2 = new Path([50, 150], [150, 150]);
     *
     * // Create a layer. The properties in the object literal
     * // are set on the newly created layer.
     * var layer = new Layer({
     *     children: [path, path2],
     *     strokeColor: 'black',
     *     position: view.center
     * });
     */
    initialize: function Layer() {
        Group.apply(this, arguments);
    },

    /**
     * Private helper to return the owner, either the parent, or the project
     * for top-level layers, if they are inserted in it.
     */
    _getOwner: function() {
        return this._parent || this._index != null && this._project;
    },

    isInserted: function isInserted() {
        return this._parent ? isInserted.base.call(this) : this._index != null;
    },

    /**
     * Activates the layer.
     *
     * @example
     * var firstLayer = project.activeLayer;
     * var secondLayer = new Layer();
     * console.log(project.activeLayer == secondLayer); // true
     * firstLayer.activate();
     * console.log(project.activeLayer == firstLayer); // true
     */
    activate: function() {
        this._project._activeLayer = this;
    },

    _hitTestSelf: function() {
    }
});
