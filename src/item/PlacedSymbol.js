/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * All rights reserved.
 */

var PlacedSymbol = this.PlacedSymbol = Item.extend({
	beans: true,

	initialize: function(symbol, matrixOrOffset) {
		this.base();
		if (symbol instanceof Symbol) {
			this.symbol = symbol;
		} else {
			this.symbol = new Symbol(symbol);
		}
		if (matrixOrOffset !== undefined) {
			if (matrixOrOffset instanceof Matrix) {
				this.matrix = matrixOrOffset;
			} else {
				this.matrix = new Matrix().translate(Point.read(arguments, 1));
			}
		} else {
			this.matrix = new Matrix();
		}
	},

	_transform: function(matrix, flags) {
		// In order to set the right context transformation when drawing the
		// raster, simply preconcatenate the internal matrix with the provided
		// one.
		this.matrix.preConcatenate(matrix);
	},

	getBounds: function() {
		var bounds = this.symbol._definition.getStrokeBounds(this.matrix, true);
		return ObservedRectangle.create(this, 'setBounds',
				bounds.x, bounds.y, bounds.width, bounds.height);
	},

	getStrokeBounds: function() {
		return this.getBounds();
	},

	draw: function(ctx, param) {
		ctx.save();
		this.matrix.applyToContext(ctx);
		Item.draw(this.symbol.getDefinition(), ctx, param);
		ctx.restore();
	}

	// TODO:
	// embed()
});
