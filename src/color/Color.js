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
			return color; // TODO: return a clone of the color
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
		colorContext.fillStyle = 'rgba(0, 0, 0, 0)';
		// Set the fillStyle of the context to the passed name and fill the
		// canvas with it, then retrieve the data for the drawn pixel:
		colorContext.fillStyle = name;
		colorContext.fillRect(0, 0, 1, 1);
		var data = colorContext.getImageData(0, 0, 1, 1).data,
			rgb = [data[0] / 255, data[1] / 255, data[2] / 255];
		return colorCache[name] = RGBColor.read(rgb); // TODO: return a clone
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
			var r = color._red,
				g = color._green,
				b = color._blue,
				alpha = color._alpha,
				max = Math.max(r, g, b),
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
			return new HSBColor(hue * 360, saturation, brightness, alpha);
		},

		'hsb-rgb': function(color) {
			var h = color._hue,
				s = color._saturation,
				b = color._brightness,
				a = color._alpha,
				f = h % 60,
				p = (b * (1 - s)) / 1,
				q = (b * (60 - s * f)) / 60,
				t = (b * (60 - s * (60 - f))) / 60;
			switch (Math.floor(h / 60)) {
				case 0: return new RGBColor(b, t, p, a);
				case 1: return new RGBColor(q, b, p, a);
				case 2: return new RGBColor(p, b, t, a);
				case 3: return new RGBColor(p, q, b, a);
				case 4: return new RGBColor(t, p, b, a);
				case 5: return new RGBColor(b, p, q, a);
			}
		},

		'rgb-gray': function(color) {
			// Using the standard NTSC conversion formula that is used for
			// calculating the effective luminance of an RGB color:
			// http://www.mathworks.com/support/solutions/en/data/1-1ASCU/index.html?solution=1-1ASCU
			return new GrayColor(1 -
					(color._red * 0.2989
					+ color._green * 0.587
					+ color._blue * 0.114),
					color._alpha
				);
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
		beans: true,
		_readNull: true,

		initialize: function(arg) {
			var isArray = Array.isArray(arg);
			if (typeof arg === 'object' && !isArray) {
				if (!this._colorType) {
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
					var color = Color.read(arguments, 0, 1);
					return this._colorType
							? color.convert(this._colorType)
							: color;
				}
			} else if (typeof arg === 'string') {
				var rgbColor = arg.match(/^#[0-9a-f]{3,6}$/i)
						? hexToRGBColor(arg)
						: nameToRGBColor(arg);
				return this._colorType
						? rgbColor.convert(this._colorType)
						: rgbColor;
			} else {
				var components = isArray ? arg
						: Array.prototype.slice.call(arguments);
				if (!this._colorType) {
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
							// TODO: Should we call the setter?
							// this['set' + name.capitalize()]
							this[name] = value !== undefined
									? value
									// TODO: Is this correct?
									// Shouldn't alpha be set to -1?
									: name === 'alpha' ? 1 : null;
						},
					this);
				}
			}
		},

		convert: function(type) {
			return this._colorType == type
				? this
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
						var part = Base.capitalize(name),
							name = '_' + name,
							set = 'set' + part;
						this['get' + part] = function() {
							return this[name];
						};
						// Only define setters if they are not provided already
						// in a specialy required version, e.g. hue.
						if (!this[set]) {
							this[set] = function(value) {
								this[name] = Math.min(Math.max(value, 0), 1);
								this._cssString = null;
								return this;
							};
						}
					}, src)
				}
				return this.base(src);
			}
		}
	};

	// Produce conversion methods for the various color components known by the
	// possible color types. Requesting any of these components on any color
	// internally converts the color to the required type and then returns its
	// component, using bean access.
	Base.each(components, function(comps, colorType) {
		Base.each(comps, function(component) {
			var part = Base.capitalize(component);
			fields['get' + part] = function() {
				return this.convert(colorType)[component];
			};
			fields['set' + part] = function(value) {
				var color = this.convert(colorType);
				color[component] = value;
				color = color.convert(this._colorType);
				for (var i = 0, l = this._components.length; i < l; i++) {
					this[this._components[i]] = color[this._components[i]];
				}
			};
		});
	});

	return fields;
}, {
	beans: true,

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
	 * A value between 0 and 1 that specifies the color's alpha value.
	 * All colors of the different subclasses support alpha values.
	 */
	getAlpha: function() {
		return this._alpha != null ? this._alpha : 1;
	},

	setAlpha: function(alpha) {
		this._alpha = Math.min(Math.max(alpha, 0), 1);
		this._cssString = null;
		return this;
	},

	/**
	 * Checks if the color has an alpha value.
	 *
	 * @return true if the color has an alpha value, false otherwise.
	 */
	hasAlpha: function() {
		return this._alpha != null;
	},

	/**
	 * Checks if the component color values of the color are the
	 * same as those of the supplied one.
	 * 
	 * @param obj the GrayColor to compare with
	 * @return true if the GrayColor is the same, false otherwise.
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

	toCssString: function() {
		if (!this._cssString) {
			var color = this._colorType === 'rgb'
					? this
					: this.convert('rgb');
			var alpha = color.getAlpha();
			var components = [
				Math.round(color.getRed() * 255),
				Math.round(color.getGreen() * 255),
				Math.round(color.getBlue() * 255),
				alpha != null ? this.alpha : 1
			];
			this._cssString = 'rgba(' + components.join(', ') + ')';
		}
		return this._cssString;
	},

	getCanvasStyle: function() {
		return this.toCssString();
	}
});
