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
	_boundsGetter: { getBounds: 'getStrokeBounds' },

	_hitTest: function(point, options, matrix) {
		var result = this._symbol._definition._hitTest(point, options, matrix);
		// TODO: When the symbol's definition is a path, should hitResult
		// contain information like HitResult#curve?
		if (result)
			result.item = this;
		return result;
	}
});