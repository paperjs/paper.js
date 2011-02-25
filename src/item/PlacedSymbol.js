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
		var width = this._size.width;
		var height = this._size.height;
		var x = width * -0.5;
		var y = height * -0.5;
		var coords = [
			x, y,
			x + width, y,
			x + width, y + height,
			x, y + height];
		this.matrix.preConcatenate(matrix);
		this.matrix.transform(coords, 0, coords, 0, 4);
		
		var xMin = coords[0], xMax = coords[0];
		var yMin = coords[1], yMax = coords[1];
		for(var i = 2; i < 8; i += 2) {
			var x = coords[i];
			var y = coords[i + 1];
			xMin = Math.min(x, xMin);
			xMax = Math.max(x, xMax);
			yMin = Math.min(y, yMin);
			yMax = Math.max(y, yMax);
		};
		var bounds = this._bounds;
		bounds.x = xMin;
		bounds.y = yMin;
		bounds.width = xMax - xMin;
		bounds.height = yMax - yMin;
	},
	
	getBounds: function() {
		return this._bounds;
	},
	
	draw: function(ctx, param) {
		if(this.blendMode != 'normal' && !param.ignoreBlendMode) {
			BlendMode.process(ctx, this, param);
		} else {
			// TODO: we need to preserve strokewidth, but still transform the fill
			ctx.save();
			if(param.ignoreBlendMode !== true)
				this.matrix.applyToContext(ctx);
			param.ignoreBlendMode = false;
			this.symbol.definition.draw(ctx, param);
			ctx.restore();
		}
	}
	// TODO:
	// embed()
});