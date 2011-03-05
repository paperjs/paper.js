var PlacedSymbol = this.PlacedSymbol = Item.extend({
	beans: true,

	initialize: function() {
		this.base();
		if (arguments[0] instanceof Symbol) {
			this.symbol = arguments[0];
		} else {
			this.symbol = new Symbol(arguments[0]);
		}
		if (arguments.length > 1) {
			var arg = arguments[1];
			if (arg instanceof Matrix) {
				this.matrix = arguments[2];
			} else {
				var offset = Point.read(arguments, 1);
				this.matrix = new Matrix().translate(offset);
			}
		} else {
			this.matrix = new Matrix();
		}
		// TODO: should size be cached here, or on Symbol?
		this._size = this.symbol.getDefinition().getStrokeBounds().getSize();
	},

	_transform: function(matrix, flags) {
		// In order to set the right context transformation when drawing the
		// raster, simply preconcatenate the internal matrix with the provided
		// one.
		this.matrix.preConcatenate(matrix);
		this._bounds = null;
	},

	getBounds: function() {
		// TODO: Is this right here? Shouldn't we calculate the bounds of the
		// symbol transformed by this.matrix?
		if (!this._bounds) {
			this._bounds = this.matrix.transformBounds(this._size);
		}
		return this._bounds;
	},

	draw: function(ctx, param) {
		// TODO: we need to preserve strokewidth
		ctx.save();
		this.matrix.applyToContext(ctx);
		Item.draw(this.symbol.getDefinition(), ctx, param);
		ctx.restore();
	}

	// TODO:
	// embed()
});
