/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name PlacedSymbol
 *
 * @class A PlacedSymbol represents an instance of a symbol which has been
 * placed in a Paper.js project.
 *
 * @extends PlacedItem
 */
var PlacedSymbol = this.PlacedSymbol = PlacedItem.extend(/** @lends PlacedSymbol# */{
	_type: 'placedsymbol',
	/**
	 * Creates a new PlacedSymbol Item.
	 *
	 * @param {Symbol} symbol the symbol to place
	 * @param {Point} [point] the center point of the placed symbol
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
	 *     var instance = new PlacedSymbol(symbol);
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
	initialize: function(arg0, arg1) {
		// Support two forms of item initialization: Passing one object literal
		// describing all the different properties to be set, or a symbol (arg0)
		// and a point where it should be placed (arg1).
		this.base(arg1 !== undefined && Point.read(arguments, 1));
		// If we can handle setting properties through object literal, we're all
		// set. Otherwise we need to set symbol.
		if (!this.setProperties(arg0))
			this.setSymbol(arg0 instanceof Symbol ? arg0 : new Symbol(arg0));
	},

	/**
	 * The symbol that the placed symbol refers to.
	 *
	 * @type Symbol
	 * @bean
	 */
	getSymbol: function() {
		return this._symbol;
	},

	setSymbol: function(symbol) {
		// Remove from previous symbol's instances
		if (this._symbol)
			delete this._symbol._instances[this._id];
		this._symbol = symbol;
		// Add to the new one's
		symbol._instances[this._id] = this;
	},

	isEmpty: function() {
		return this._symbol._definition.isEmpty();
	},

	clone: function() {
		return this._clone(new PlacedSymbol(this.symbol, this._matrix.clone()));
	},

	_getBounds: function(getter, matrix) {
		// Redirect the call to the symbol definition to calculate the bounds
		// TODO: Implement bounds caching through passing on of cacheItem, so
		// that Symbol#_changed() notification become unnecessary!
		return this.symbol._definition._getCachedBounds(getter, matrix);
	},

	draw: function(ctx, param) {
		Item.draw(this.symbol._definition, ctx, param);
	},

	drawSelected: function(ctx, matrix) {
		Item.drawSelectedBounds(this.symbol._definition.getBounds(), ctx,
				matrix);
	}

	// TODO: PlacedSymbol#embed()
});
