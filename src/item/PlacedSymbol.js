PlacedSymbol = Item.extend({
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
		this._bounds = this.symbol.definition.bounds.clone();
	},
	
	transformContent: function(matrix, flags) {
		var bounds = this.bounds;
		var coords = [bounds.x, bounds.y,
			bounds.x + bounds.width, bounds.y + bounds.height];
		matrix.transform(coords, 0, coords, 0, 2);
		this.matrix.preConcatenate(matrix);
		bounds.x = coords[0];
		bounds.y = coords[1];
		bounds.width = coords[2] - coords[0];
		bounds.height = coords[3] - coords[1];
	},
	
	getBounds: function() {
		return this._bounds;
	},
	
	draw: function(ctx) {
		// TODO: we need to preserve strokewidth, but still transform the fill
		ctx.save();
		this.matrix.applyToContext(ctx);
		this.symbol.definition.draw(ctx);
		ctx.restore();
	}
	// TODO:
	// embed()
});