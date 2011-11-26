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
 * @name PlacedItem
 *
 * @class The PlacedItem class is the base for any items that have a matrix
 * associated with them, describing their placement in the project, such as
 * {@link Raster} and {@link PlacedSymbol}.
 *
 * @extends Item
 */
var PlacedItem = this.PlacedItem = Item.extend(/** @lends PlacedItem# */{
	// PlacedItem uses strokeBounds for bounds
	_boundsType: { bounds: 'strokeBounds' },

	_transform: function(matrix, flags) {
		// In order to set the right context transformation when drawing the
		// raster, simply preconcatenate the internal matrix with the provided
		// one.
		this._matrix.preConcatenate(matrix);
	},

	/**
	 * The item's transformation matrix, defining position and dimensions in the
	 * document.
	 *
	 * @type Matrix
	 * @bean
	 */
	getMatrix: function() {
		return this._matrix;
	},

	setMatrix: function(matrix) {
		this._matrix = matrix.clone();
		this._changed(Change.GEOMETRY);
	}
});
