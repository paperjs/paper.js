var Color = this.Color = Base.extend({
	beans: true,

	initialize: function() {
		var rgb = new RGBColor(RGBColor.dont);
		rgb.initialize.apply(rgb, arguments);
		return rgb;
	},

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
		return this._cssString;
	}
});
