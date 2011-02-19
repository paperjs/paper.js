Color = Base.extend({
	beans: true,

	/**
	 * A value between 0 and 1 that specifies the color's alpha value.
	 * All colors of the different subclasses support alpha values.
	 */
	getAlpha: function() {
		return this._alpha;
	},
	
	setAlpha: function(alpha) {
		if (this._alpha == null || alpha == -1) this._alpha = -1;
		else if (this._alpha < 0) this._alpha = 0;
		else if (alpha > 1) this._alpha = 1;
		else this._alpha = alpha;
		this._cssString = null;
	},
	
	/**
	 * Checks if the color has an alpha value.
	 * 
	 * @return {@true if the color has an alpha value}
	 */
	hasAlpha: function() {
		return this._alpha != -1;
	},
	
	getCanvasStyle: function() {
		return this.cssString;
	},
	
	statics: {
		read: function(args, index) {
			var index = index || 0, length = args.length - index;
			if (length == 1 && args[index] instanceof Color) {
				return args[index];
			} else if (length != 0) {
				var rgbColor = new RGBColor();
				rgbColor.initialize.apply(rgbColor, index > 0
						? Array.prototype.slice.call(args, index) : args);
				return rgbColor;
			}
			return null;
		}
	}
});