GrayColor = Color.extend({
	beans: true,

	initialize: function() {
		if (arguments.length) {
			var arg = arguments[0];
			if (typeof arg == 'number') {
				this._gray = arg;
				this.alpha = arg.alpha ? arg.alpha : -1;
			} else if (arg instanceof Color) {
				this._gray = arg.gray;
				this.alpha = arg.alpha;
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
	 * A value between 0 and 1 that specifies the amount of gray in the gray color.
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
	 * @return {@true if the RGBColor is the same}
	 */
	equals: function(color) {
		if (color instanceof GrayColor) {
			return this.gray == color.gray &&
				this.alpha == color.alpha;
		}
		return false;
	},
	
	toString: function() {
		return '{ gray: ' + this.gray
			+ ((this.alpha != -1) ? ', alpha: ' + this.alpha : '')
			+ ' }';
	},
	
	getCssString: function() {
		if (!this._cssString) {
			var component = Math.round((1 - this.gray) * 255) + ',';
			this._cssString = 'rgba('
				+ component + component + component
				+ ((this.alpha != -1) ? this.alpha : 1)
				+ ')';
		}
		return this._cssString;
	}
}, new function() {
	var fields = { beans: true };
	
	// Using the standard NTSC conversion formula that is used for
	// calculating the effective luminance of an RGB color:
	// http://www.mathworks.com/support/solutions/en/data/1-1ASCU/index.html?solution=1-1ASCU
	var componentWeights = {
		red: 0.2989,
		green: 0.5870,
		blue: 0.114
	};

	Base.each(componentWeights, function(weight, key) {
		fields['get' + key.capitalize()] = function() {
			return 1 - this._gray;
		};
		fields['set' + key.capitalize()] = function(value) {
			this._gray = this._gray * (1 - weight) + weight * (1 - value);
		};
	});
	return fields;
});