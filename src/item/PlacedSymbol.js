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
		this.symbol = symbol instanceof Symbol ? symbol : new Symbol(symbol);
		this.matrix = matrixOrOffset !== undefined
			? matrixOrOffset instanceof Matrix
				? matrixOrOffset
				: new Matrix().translate(Point.read(arguments, 1))
			: new Matrix();
	},

	clone: function() {
		return this._clone(new PlacedSymbol(this.symbol, this.matrix.clone()));
	},

	_transform: function(matrix, flags) {
		// In order to set the right context transformation when drawing the
		// raster, simply preconcatenate the internal matrix with the provided
		// one.
		this.matrix.preConcatenate(matrix);
	},

	getBounds: function() {
		var bounds = this.symbol._definition.getStrokeBounds(this.matrix);
		return LinkedRectangle.create(this, 'setBounds',
				bounds.x, bounds.y, bounds.width, bounds.height);
	},

	getStrokeBounds: function() {
		return this.getBounds();
	},

	draw: function(ctx, param) {
		if (param.selection) {
			Item.drawSelectedBounds(this.symbol._definition.getStrokeBounds(),
					ctx, this.matrix);
		} else {
			ctx.save();
			this.matrix.applyToContext(ctx);
			Item.draw(this.symbol.getDefinition(), ctx, param);
			ctx.restore();
		}
	}

	// TODO:
	// embed()
});
