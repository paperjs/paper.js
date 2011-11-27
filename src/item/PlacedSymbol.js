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
	/**
	 * Creates a new PlacedSymbol Item.
	 *
	 * @param {Symbol} symbol the symbol to place
	 * @param {Point|Matrix} [matrixOrOffset] the center point of the placed
	 * symbol or a {@link Matrix} transformation to transform the placed symbol
	 * with.
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
	initialize: function(symbol, matrixOrOffset) {
		this.base();
		this.setSymbol(symbol instanceof Symbol ? symbol : new Symbol(symbol));
		this._matrix = matrixOrOffset !== undefined
			? matrixOrOffset instanceof Matrix
				? matrixOrOffset
				: new Matrix().translate(Point.read(arguments, 1))
			: new Matrix();
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

	clone: function() {
		return this._clone(new PlacedSymbol(this.symbol, this._matrix.clone()));
	},

	_getBounds: function(type, matrix) {
		// Redirect the call to the symbol definition to calculate the bounds
		return this.symbol._definition._getBounds(type, matrix);
	},

	draw: function(ctx, param) {
		if (param.selection) {
			Item.drawSelectedBounds(this.symbol._definition.getBounds(), ctx,
					this._matrix);
		} else {
			ctx.save();
			this._matrix.applyToContext(ctx);
			Item.draw(this.symbol.getDefinition(), ctx, param);
			ctx.restore();
		}
	}

	// TODO: PlacedSymbol#embed()
});
