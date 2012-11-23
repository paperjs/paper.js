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

	_hitTest: function(point, options, matrix) {
		console.log(point);
		point = point.transform(this.matrix);
		var hitResult = this._symbol._definition.hitTest(point, options, matrix);
		// TODO: When the symbol's definition is a path, should hitResult contain
		// information like HitResult#curve?
		if (hitResult)
			hitResult.item = this;
		return hitResult;
	}
});