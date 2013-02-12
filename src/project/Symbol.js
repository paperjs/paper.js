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
 * @name Symbol
 *
 * @class Symbols allow you to place multiple instances of an item in your
 * project. This can save memory, since all instances of a symbol simply refer
 * to the original item and it can speed up moving around complex objects, since
 * internal properties such as segment lists and gradient positions don't need
 * to be updated with every transformation.
 */
var Symbol = this.Symbol = Base.extend(/** @lends Symbol# */{
	_type: 'symbol',

	/**
	 * Creates a Symbol item.
	 *
	 * @param {Item} item the source item which is copied as the definition of
	 *               the symbol
	 *
	 * @example {@paperscript split=true height=240}
	 * // Placing 100 instances of a symbol:
	 * var path = new Path.Star(new Point(0, 0), 6, 5, 13);
	 * path.style = {
	 *     fillColor: 'white',
	 *     strokeColor: 'black'
	 * };
     *
	 * // Create a symbol from the path:
	 * var symbol = new Symbol(path);
	 *
	 * // Remove the path:
	 * path.remove();
     *
	 * // Place 100 instances of the symbol:
	 * for (var i = 0; i < 100; i++) {
	 *     // Place an instance of the symbol in the project:
	 *     var instance = symbol.place();
     *
	 *     // Move the instance to a random position within the view:
	 *     instance.position = Point.random() * view.size;
     *
	 *     // Rotate the instance by a random amount between
	 *     // 0 and 360 degrees:
	 *     instance.rotate(Math.random() * 360);
     *
	 *     // Scale the instance between 0.25 and 1:
	 *     instance.scale(0.25 + Math.random() * 0.75);
	 * }
	 */
	initialize: function(item) {
		// Define this Symbols's unique id.
		this._id = ++Base._uid;
		this.project = paper.project;
		this.project.symbols.push(this);
		this.setDefinition(item);
		// Hash to keep track of placed instances
		this._instances = {};
	},

	_serialize: function(dictionary) {
		return dictionary.get(this) || dictionary.set(this, [this._type,
				Base.serialize(this._definition, false, dictionary)]);
	},

	// TODO: Symbol#remove()
	// TODO: Symbol#name (accessible by name through project#symbols)

	/**
	 * The project that this symbol belongs to.
	 *
	 * @type Project
	 * @readonly
	 * @name Symbol#project
	 */

	/**
	 * Private notifier that is called whenever a change occurs in this symbol's
	 * definition.
	 *
	 * @param {ChangeFlag} flags describes what exactly has changed.
	 */
	_changed: function(flags) {
		// Notify all PlacedItems of the change in our definition, so they
		// can clear cached bounds.
		Base.each(this._instances, function(item) {
			item._changed(flags);
		});
	},

	/**
	 * The symbol definition.
	 *
	 * @type Item
	 * @bean
	 */
	getDefinition: function() {
		return this._definition;
	},

	setDefinition: function(item) {
		// Make sure we're not steatling another symbol's definition
		if (item._parentSymbol)
			item = item.clone();
		// Remove previous definition's reference to this symbol
		if (this._definition)
			delete this._definition._parentSymbol;
		this._definition = item;
		// Remove item from DOM, as it's embedded in Symbol now.
		item.remove();
		item.setSelected(false);
		// Move position to 0, 0, so it's centered when placed.
		item.setPosition(new Point());
		item._parentSymbol = this;
		this._changed(/*#=*/ Change.GEOMETRY);
	},

	/**
	 * Places in instance of the symbol in the project.
	 *
	 * @param [position] The position of the placed symbol.
	 * @return {PlacedSymbol}
	 */
	place: function(position) {
		return new PlacedSymbol(this, position);
	},

	/**
	 * Returns a copy of the symbol.
	 *
	 * @return {Symbol}
	 */
	clone: function() {
		return new Symbol(this._definition.clone());
	}
});
