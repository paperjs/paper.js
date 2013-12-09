/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
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
	_selectChildren: false,

	// DOCS: improve constructor code example.
	/**
	 * Creates a new Layer item and places it at the end of the
	 * {@link Project#layers} array. The newly created layer will be activated,
	 * so all newly created items will be placed within it.
	 *
	 * @name Layer#initialize
	 * @param {Item[]} [children] An array of items that will be added to the
	 * newly created layer.
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
	 * @param {Object} object an object literal containing the properties to be
	 * set on the layer.
	 *
	 * @example {@paperscript}
	 * var path = new Path([100, 100], [100, 200]);
	 * var path2 = new Path([50, 150], [150, 150]);
	 * 
	 * // Create a layer. The properties in the object literal
	 * // are set on the newly created layer.
	 * var layer = new Layer({
	 * 	children: [path, path2],
	 * 	strokeColor: 'black',
	 * 	position: view.center
	 * });
	 */
	initialize: function Layer(arg) {
		var props = Base.isPlainObject(arg)
				? new Base(arg) // clone so we can add insert = false
				: { children: Array.isArray(arg) ? arg : arguments },
			insert = props.insert;
		// Call the group constructor but don't insert yet!
		props.insert = false;
		Group.call(this, props);
		if (insert || insert === undefined) {
			this._project.addChild(this);
			// When inserted, also activate the layer by default.
			this.activate();
		}
	},

	/**
	* Removes the layer from its project's layers list
	* or its parent's children list.
	*/
	_remove: function _remove(notify) {
		if (this._parent)
			return _remove.base.call(this, notify);
		if (this._index != null) {
			if (this._project.activeLayer === this)
				this._project.activeLayer = this.getNextSibling()
						|| this.getPreviousSibling();
			Base.splice(this._project.layers, null, this._index, 1);
			this._installEvents(false);
			// Tell project we need a redraw. This is similar to _changed()
			// mechanism.
			this._project._needsUpdate = true;
			return true;
		}
		return false;
	},

	getNextSibling: function getNextSibling() {		
		return this._parent ? getNextSibling.base.call(this)
				: this._project.layers[this._index + 1] || null;
	},

	getPreviousSibling: function getPreviousSibling() {
		return this._parent ? getPreviousSibling.base.call(this)
				: this._project.layers[this._index - 1] || null;
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
		this._project.activeLayer = this;
	},

	// Private helper for #insertAbove() / #insertBelow()
	_insert: function _insert(above, item, _preserve) {
		// If the item is a layer and contained within Project#layers, use
		// our own version of move().
		if (item instanceof Layer && !item._parent) {
			this._remove(true);
			Base.splice(item._project.layers, [this],
					item._index + (above ? 1 : 0), 0);
			this._setProject(item._project, true);
			return this;
		}
		return _insert.base.call(this, above, item, _preserve);
	}
});
