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

	_transform: function(matrix, flags) {
		// In order to set the right context transformation when drawing the
		// raster, simply preconcatenate the internal matrix with the provided
		// one.
		this._matrix.preConcatenate(matrix);
	},

	_changed: function(flags) {
		// Don't use base() for reasons of performance.
		Item.prototype._changed.call(this, flags);
		if (flags & ChangeFlag.GEOMETRY) {
			delete this._strokeBounds;
			// TODO: These are not used in Raster. Do we mind?
			delete this._handleBounds;
			delete this._roughBounds;
		}
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
	},

	getBounds: function(/* matrix */) {
		var useCache = arguments[0] === undefined;
		if (useCache && this._bounds)
			return this._bounds;
		// The bounds of PlacedItems are the same as the strokeBounds, but are
		// wrapped in a LinkedRectangle that catch changes for us.
		var bounds = this.getStrokeBounds(arguments[0]);
		if (useCache)
			bounds = this._bounds = this._createBounds(bounds);
		return bounds;
	},

	_getBounds: function(getter, cacheName, args) {
		var matrix = args[0],
			useCache = matrix === undefined;
		if (useCache && this[cacheName])
			return this[cacheName];
		// Concatenate the passed matrix with the internal one
		matrix = matrix ? matrix.clone().concatenate(this._matrix)
				: this._matrix;
		// Call _calculateBounds, which needs to be defined in the subclasses:
		var bounds = this._calculateBounds(getter, matrix);
		if (useCache)
			this[cacheName] = bounds;
		return bounds;
	}
});
