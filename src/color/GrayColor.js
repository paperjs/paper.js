var GrayColor = this.GrayColor = Color.extend({
	beans: true,

	initialize: function() {
		if (arguments.length) {
			var arg = arguments[0];
			if (typeof arg == 'number') {
				this._gray = arg;
			} else if (arg instanceof Color) {
				this._gray = arg.getGray();
				this._alpha = arg.getAlpha();
			}
		}
	},

	getType: function() {
		return this.alpha == -1 ? 'gray' : 'agray';
	},

	getComponents: function() {
		return [this._gray, this._alpha];
	},

	/**
	 * A value between 0 and 1 that specifies the amount of gray in the gray
	 * color.
	 */
	getGray: function() {
		return this._gray;
	},

	setGray: function(gray) {
		this._cssString = null;
		this._gray = gray;
	},

	/**
	 * Checks if the component color values of the GrayColor are the
	 * same as those of the supplied one.
	 * 
	 * @param obj the GrayColor to compare with
	 * @return {@true if the GrayColor is the same}
	 */
	equals: function(color) {
		if (color instanceof GrayColor) {
			return this._gray == color._gray &&
				this._alpha == color._alpha;
		}
		return false;
	},

	toString: function() {
		return '{ gray: ' + this._gray
				+ (this._alpha != null ? ', alpha: ' + this._alpha : '')
				+ ' }';
	},

	toCssString: function() {
		if (!this._cssString) {
			var component = Math.round((1 - this._gray) * 255) + ',';
			this._cssString = 'rgba('
					+ component + component + component
					+ (this._alpha != null ? this.alpha : 1)
					+ ')';
		}
		return this._cssString;
	}
}, new function() {
	// Using the standard NTSC conversion formula that is used for
	// calculating the effective luminance of an RGB color:
	// http://www.mathworks.com/support/solutions/en/data/1-1ASCU/index.html?solution=1-1ASCU
	return Base.each({ red: 0.2989, green: 0.5870, blue: 0.114 },
		function(weight, key) {
			this['get' + Base.capitalize(key)] = function() {
				return 1 - this._gray;
			};
			this['set' + Base.capitalize(key)] = function(value) {
				this._cssString = null;
				this._gray = this._gray * (1 - weight) + weight * (1 - value);
			};
		}, { beans: true });
});
