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

var Color = this.Color = Base.extend(new function() {
	
	var components = {
		gray: ['gray'],
		rgb: ['red', 'green', 'blue'],
		hsb: ['hue', 'saturation', 'brightness']
	};

	var colorCache = {},
		colorContext;

	function nameToRGBColor(name) {
		var color = colorCache[name];
		if (color)
			return color.clone();
		// Use a canvas to draw to with the given name and then retrieve rgb
		// values from. Build a cache for all the used colors.
		if (!colorContext) {
			var canvas = CanvasProvider.getCanvas(Size.create(1, 1));
			colorContext = canvas.getContext('2d');
			colorContext.globalCompositeOperation = 'copy';
		}
		// Set the current fillStyle to transparent, so that it will be
		// transparent instead of the previously set color in case the new color
		// can not be interpreted.
		colorContext.fillStyle = 'rgba(0,0,0,0)';
		// Set the fillStyle of the context to the passed name and fill the
		// canvas with it, then retrieve the data for the drawn pixel:
		colorContext.fillStyle = name;
		colorContext.fillRect(0, 0, 1, 1);
		var data = colorContext.getImageData(0, 0, 1, 1).data,
			rgb = [data[0] / 255, data[1] / 255, data[2] / 255];
		return (colorCache[name] = RGBColor.read(rgb)).clone();
	}

	function hexToRGBColor(string) {
		var hex = string.match(/^#?(\w{1,2})(\w{1,2})(\w{1,2})$/);
		if (hex.length >= 4) {
			var rgb = new Array(3);
			for (var i = 0; i < 3; i++) {
				var channel = hex[i + 1];
				rgb[i] = parseInt(channel.length == 1
						? channel + channel : channel, 16) / 255;
			}
			return RGBColor.read(rgb);
		}
	}

	var converters = {
		'rgb-hsb': function(color) {
			var hsb = Color.RGBtoHSB(color._red, color._green, color._blue);
			return new HSBColor(hsb[0] * 360, hsb[1], hsb[2], color._alpha);
		},

		'hsb-rgb': function(color) {
			var rgb = Color.HSBtoRGB(color._hue / 360, color._saturation,
					color._brightness);
			return new RGBColor(rgb[0], rgb[1], rgb[2], color._alpha);
		},

		'rgb-gray': function(color) {
			// Using the standard NTSC conversion formula that is used for
			// calculating the effective luminance of an RGB color:
			// http://www.mathworks.com/support/solutions/en/data/1-1ASCU/index.html?solution=1-1ASCU
			return new GrayColor(1 -
					(color._red * 0.2989
					+ color._green * 0.5866
					+ color._blue * 0.1145),
					color._alpha);
		},

		'gray-rgb': function(color) {
			var comp = 1 - color.getGray();
			return new RGBColor(comp, comp, comp, color._alpha);
		},

		'hsb-gray': function(color) {
			return converters['rgb-gray'](converters['hsb-rgb'](color));
		},

		'gray-hsb': function(color) {
			return new HSBColor(0, 0, 1 - color._gray, color._alpha);
		}
	};

	var fields = {
	/** @lends Color# */

		beans: true,
		_readNull: true,

		// DOCS: write Color constructor and class documentation.
		/**
		 * @constructs Color
		 * @class
		 */
		initialize: function(arg) {
			var isArray = Array.isArray(arg),
				type = this._colorType;
			if (typeof arg === 'object' && !isArray) {
				if (!type) {
					// Called on the abstract Color class. Guess color type
					// from arg
					return arg.red !== undefined
						? new RGBColor(arg.red, arg.green, arg.blue, arg.alpha)
						: arg.gray !== undefined
						? new GrayColor(arg.gray, arg.alpha)
						: arg.hue !== undefined
						? new HSBColor(arg.hue, arg.saturation, arg.brightness,
								arg.alpha)
						: new RGBColor(); // Fallback
				} else {
					// Called on a subclass instance. Return the converted
					// color.
					return Color.read(arguments).convert(type);
				}
			} else if (typeof arg === 'string') {
				var rgbColor = arg.match(/^#[0-9a-f]{3,6}$/i)
						? hexToRGBColor(arg)
						: nameToRGBColor(arg);
				return type
						? rgbColor.convert(type)
						: rgbColor;
			} else {
				var components = isArray ? arg
						: Array.prototype.slice.call(arguments);
				if (!type) {
					// Called on the abstract Color class. Guess color type
					// from arg
					//if (components.length >= 4)
					//	return new CMYKColor(components);
					if (components.length >= 3)
						return new RGBColor(components);
					return new GrayColor(components);
				} else {
					// Called on a subclass instance. Just copy over
					// components.
					Base.each(this._components,
						function(name, i) {
							var value = components[i];
							// Set internal propery directly
							this['_' + name] = value !== undefined
									? value : null;
						},
					this);
				}
			}
		},

		/**
		 * @return {RGBColor|GrayColor|HSBColor} a copy of the color object
		 */
		clone: function() {
			var ctor = this.constructor,
				copy = new ctor(ctor.dont),
				components = this._components;
			for (var i = 0, l = components.length; i < l; i++) {
				var key = '_' + components[i];
				copy[key] = this[key];
			}
			return copy;
		},

		convert: function(type) {
			return this._colorType == type
				? this.clone()
				: converters[this._colorType + '-' + type](this);
		},

		statics: {
			/**
			 * Override Color.extend() to produce getters and setters based
			 * on the component types defined in _components.
			 */
			extend: function(src) {
				src.beans = true;
				if (src._colorType) {
					var comps = components[src._colorType];
					// Automatically produce the _components field, adding alpha
					src._components = comps.concat(['alpha']);
					Base.each(comps, function(name) {
						var isHue = name === 'hue',
							part = Base.capitalize(name),
							name = '_' + name;
						this['get' + part] = function() {
							return this[name];
						};
						this['set' + part] = function(value) {
							this[name] = isHue
								// Keep negative values within modulo 360 too:
								? ((value % 360) + 360) % 360
								// All other values are 0..1
								: Math.min(Math.max(value, 0), 1);
							this._cssString = null;
							return this;
						};
					}, src);
				}
				return this.base(src);
			},

			// Expose HSB converters since they are required in BlendMode:
			RGBtoHSB: function(r, g, b) {
				var max = Math.max(r, g, b),
					min = Math.min(r, g, b),
					delta = max - min,
					hue,
					saturation = (max != 0) ? delta / max : 0,
					brightness = max;
				if (saturation == 0) {
					hue = 0;
				} else {
					var rr = (max - r) / delta,
						gr = (max - g) / delta,
						br = (max - b) / delta;
					hue = r == max
						? br - gr
						: g == max
							? 2 + rr - br
							: 4 + gr - rr;
					hue /= 6;
					if (hue < 0)
						hue++;
				}
				return [hue, saturation, brightness];
			},

			HSBtoRGB: function(h, s, b) {
				h = (h - Math.floor(h)) * 6;
				var r = Math.floor(h),
					f = h - r,
					p = b * (1 - s),
					q = b * (1 - s * f),
					t = b * (1 - s * (1 - f));
				switch (r) {
				case 0: return [b, t, p];
				case 1: return [q, b, p];
				case 2: return [p, b, t];
				case 3: return [p, q, b];
				case 4: return [t, p, b];
				case 5: return [b, p, q];
				}
			}
		}
	};

	// Produce conversion methods for the various color components known by the
	// possible color types. Requesting any of these components on any color
	// internally converts the color to the required type and then returns its
	// component, using bean access.
	Base.each(components, function(comps, type) {
		Base.each(comps, function(component) {
			var part = Base.capitalize(component);
			fields['get' + part] = function() {
				return this.convert(type)[component];
			};
			fields['set' + part] = function(value) {
				var color = this.convert(type);
				color[component] = value;
				color = color.convert(this._colorType);
				for (var i = 0, l = this._components.length; i < l; i++) {
					var key = this._components[i];
					this[key] = color[key];
				}
			};
		});
	});

	return fields;
}, {
	/** @lends Color# */

	beans: true,

	/**
	 * Returns the type of the color as a string.
	 * 
	 * Example:
	 * <code>
	 * var color = new RGBColor(1, 0, 0);
	 * console.log(color.type); // 'rgb'
	 * </code>
	 * 
	 * @type String('rgb', 'hsb', 'gray')
	 * @bean
	 */
	getType: function() {
		return this._colorType;
	},

	getComponents: function() {
		var length = this._components.length;
		var comps = new Array(length);
		for (var i = 0; i < length; i++)
			comps[i] = this['_' + this._components[i]];
		return comps;
	},

	/**
	 * A value between {@code 0} and {@code 1} that specifies the color's alpha
	 * value. All colors of the different subclasses support alpha values.
	 * 
	 * @type Number
	 * @bean
	 */
	getAlpha: function() {
		return this._alpha != null ? this._alpha : 1;
	},

	setAlpha: function(alpha) {
		this._alpha = alpha == null ? null : Math.min(Math.max(alpha, 0), 1);
		this._cssString = null;
		return this;
	},

	/**
	 * Checks if the color has an alpha value.
	 *
	 * @return {Boolean} {@true if the color has an alpha value}
	 */
	hasAlpha: function() {
		return this._alpha != null;
	},

	/**
	 * Checks if the component color values of the color are the
	 * same as those of the supplied one.
	 * 
	 * @param {Color} color the color to compare with
	 * @return {Boolean} {@true if the colors are the same}
	 */
	equals: function(color) {
		if (color && color._colorType === this._colorType) {
			for (var i = 0, l = this._components.length; i < l; i++) {
				var component = '_' + this._components[i];
				if (this[component] !== color[component])
					return false;
			}
			return true;
		}
		return false;
	},

	/**
	 * {@grouptitle String Representations}
	 * @return {String} A string representation of the color.
	 */
	toString: function() {
		var parts = [],
			format = Base.formatNumber;
		for (var i = 0, l = this._components.length; i < l; i++) {
			var component = this._components[i],
				value = this['_' + component];
			if (component === 'alpha' && value == null)
				value = 1;
			parts.push(component + ': ' + format(value));
		}
		return '{ ' + parts.join(', ') + ' }';
	},

	/**
	 * @return {String} A css representation of the color.
	 */
	toCssString: function() {
		if (!this._cssString) {
			var color = this.convert('rgb'),
				alpha = color.getAlpha(),
				components = [
					Math.round(color._red * 255),
					Math.round(color._green * 255),
					Math.round(color._blue * 255),
					alpha != null ? alpha : 1
				];
			this._cssString = 'rgba(' + components.join(', ') + ')';
		}
		return this._cssString;
	},

	getCanvasStyle: function() {
		return this.toCssString();
	}
	
	/**
	 * {@grouptitle RGB Components}
	 *
	 * The amount of red in the color as a value between {@code 0} and
	 * {@code 1}.
	 * 
	 * @name Color#red
	 * @property
	 * @type Number
	 */

	/**
	 * The amount of green in the color as a value between {@code 0} and
	 * {@code 1}.
	 * 
	 * @name Color#green
	 * @property
	 * @type Number
	 */

	/**
	 * The amount of blue in the color as a value between {@code 0} and
	 * {@code 1}.
	 * 
	 * @name Color#blue
	 * @property
	 * @type Number
	 */

	/**
	 * {@grouptitle Gray Components}
	 *
	 * The amount of gray in the color as a value between {@code 0} and
	 * {@code 1}.
	 * 
	 * @name Color#gray
	 * @property
	 * @type Number
	 */

	/**
	 * {@grouptitle HSB Components}
	 *
	 * The hue of the color as a value in degrees between {@code 0} and
	 * {@code 360}.
	 * 
	 * @name Color#hue
	 * @property
	 * @type Number
	 */

	/**
	 * The saturation of the color as a value between {@code 0} and {@code 1}.
	 * 
	 * @name Color#saturation
	 * @property
	 * @type Number
	 */

	/**
	 * The brightness of the color as a value between {@code 0} and {@code 1}.
	 * 
	 * @name Color#brightness
	 * @property
	 * @type Number
	 */

});

var GrayColor = this.GrayColor = Color.extend(/** @scope GrayColor */{
	/**
	 * Creates a GrayColor object
	 * 
	 * @param {Number} gray the amount of gray in the color as a value
	 * between {@code 0} and {@code 1}
	 * @param {Number} [alpha] the alpha of the color as a value between
	 * {@code 0} and {@code 1}
	 * @constructor
	 * @name GrayColor
	 * 
	 * @class A GrayColor object is used to represent any gray color value.
	 * @extends Color
	 */

	_colorType: 'gray'
});

var RGBColor = this.RGBColor = Color.extend(/** @scope RGBColor */{
	/**
	 * Creates an RGBColor object
	 * 
	 * @param {Number} red the amount of red in the color as a value
	 * between {@code 0} and {@code 1}
	 * @param {Number} green the amount of green in the color as a value
	 * between {@code 0} and {@code 1}
	 * @param {Number} blue the amount of blue in the color as a value
	 * between {@code 0} and {@code 1}
	 * @param {Number} [alpha] the alpha of the color as a value between
	 * {@code 0} and {@code 1}
	 * @constructor
	 * @name RGBColor
	 * 
	 * @class An RGBColor object is used to represent any RGB color value.
	 * @extends Color
	 */

	_colorType: 'rgb'
});

var HSBColor = this.HSBColor = Color.extend(/** @scope HSBColor */{
	/**
	 * Creates an HSBColor object
	 * 
	 * @param {Number} hue the hue of the color as a value in degrees between
	 * {@code 0} and {@code 360}.
	 * @param {Number} saturation the saturation of the color as a value
	 * between {@code 0} and {@code 1}
	 * @param {Number} brightness the brightness of the color as a value
	 * between {@code 0} and {@code 1}
	 * @param {Number} [alpha] the alpha of the color as a value between
	 * {@code 0} and {@code 1}
	 * @constructor
	 * @name HSBColor
	 * 
	 * @class An HSBColor object is used to represent any HSB color value.
	 * @extends Color
	 */

	_colorType: 'hsb'
});
