/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name Color
 *
 * @class All properties and functions that expect color values accept
 * instances of the different color classes such as {@link RgbColor},
 * {@link HsbColor} and {@link GrayColor}, and also accept named colors
 * and hex values as strings which are then converted to instances of
 * {@link RgbColor} internally.
 *
 * @classexample {@paperscript}
 * // Named color values:
 *
 * // Create a circle shaped path at {x: 80, y: 50}
 * // with a radius of 30.
 * var circle = new Path.Circle(new Point(80, 50), 30);
 *
 * // Pass a color name to the fillColor property, which is internally
 * // converted to an RgbColor.
 * circle.fillColor = 'green';
 *
 * @classexample {@paperscript}
 * // Hex color values:
 *
 * // Create a circle shaped path at {x: 80, y: 50}
 * // with a radius of 30.
 * var circle = new Path.Circle(new Point(80, 50), 30);
 *
 * // Pass a hex string to the fillColor property, which is internally
 * // converted to an RgbColor.
 * circle.fillColor = '#ff0000';
 */
var Color = this.Color = Base.extend(new function() {

	var components = {
		gray: ['gray'],
		rgb: ['red', 'green', 'blue'],
		hsb: ['hue', 'saturation', 'brightness'],
		hsl: ['hue', 'saturation', 'lightness']
	};

	var colorCache = {},
		colorContext;

	function nameToRgbColor(name) {
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
		return (colorCache[name] = RgbColor.read(rgb)).clone();
	}

	function hexToRgbColor(string) {
		var hex = string.match(/^#?(\w{1,2})(\w{1,2})(\w{1,2})$/);
		if (hex.length >= 4) {
			var rgb = new Array(3);
			for (var i = 0; i < 3; i++) {
				var channel = hex[i + 1];
				rgb[i] = parseInt(channel.length == 1
						? channel + channel : channel, 16) / 255;
			}
			return RgbColor.read(rgb);
		}
	}

	// For hsb-rgb conversion, used to lookup the right parameters in the
	// values array.
	var hsbIndices = [
		[0, 3, 1], // 0
		[2, 0, 1], // 1
		[1, 0, 3], // 2
		[1, 2, 0], // 3
		[3, 1, 0], // 4
		[0, 1, 2]  // 5
	];

	var converters = {
		'rgb-hsb': function(color) {
			var r = color._red,
				g = color._green,
				b = color._blue,
				max = Math.max(r, g, b),
				min = Math.min(r, g, b),
				delta = max - min,
				h = delta == 0 ? 0
					:   ( max == r ? (g - b) / delta + (g < b ? 6 : 0)
						: max == g ? (b - r) / delta + 2
						:            (r - g) / delta + 4) * 60, // max == b
				s = max == 0 ? 0 : delta / max,
				v = max; // = brightness, also called value
			return new HsbColor(h, s, v, color._alpha);
		},

		'hsb-rgb': function(color) {
			var h = (color._hue / 60) % 6, // Scale to 0..6
				s = color._saturation,
				b = color._brightness,
				i = Math.floor(h), // 0..5
				f = h - i,
				i = hsbIndices[i],
				v = [
					b,						// b, index 0
					b * (1 - s),			// p, index 1
					b * (1 - s * f),		// q, index 2
					b * (1 - s * (1 - f))	// t, index 3
				];
			return new RgbColor(v[i[0]], v[i[1]], v[i[2]], color._alpha);
		},

		// HSL code is based on:
		// http://mjijackson.com/2008/02/rgb-to-hsl-and-rgb-to-hsv-color-model-conversion-algorithms-in-javascript
		'rgb-hsl': function(color) {
			var r = color._red,
				g = color._green,
				b = color._blue,
				max = Math.max(r, g, b),
				min = Math.min(r, g, b),
				delta = max - min,
				achromatic = delta == 0,
				h = achromatic ? 0
					:   ( max == r ? (g - b) / delta + (g < b ? 6 : 0)
						: max == g ? (b - r) / delta + 2
						:            (r - g) / delta + 4) * 60, // max == b
				l = (max + min) / 2,
				s = achromatic ? 0 : l < 0.5
						? delta / (max + min)
						: delta / (2 - max - min);
			return new HslColor(h, s, l, color._alpha);
		},

		'hsl-rgb': function(color) {
			var s = color._saturation,
				h = color._hue / 360,
				l = color._lightness;
			if (s == 0)
				return new RgbColor(l, l, l, color._alpha);
			var t3s = [ h + 1 / 3, h, h - 1 / 3 ],
				t2 = l < 0.5 ? l * (1 + s) : l + s - l * s,
				t1 = 2 * l - t2,
				c = [];
			for (var i = 0; i < 3; i++) {
				var t3 = t3s[i];
				if (t3 < 0) t3 += 1;
				if (t3 > 1) t3 -= 1;
				c[i] = 6 * t3 < 1
					? t1 + (t2 - t1) * 6 * t3
					: 2 * t3 < 1
						? t2
						: 3 * t3 < 2
							? t1 + (t2 - t1) * ((2 / 3) - t3) * 6
							: t1;
			}
			return new RgbColor(c[0], c[1], c[2], color._alpha);
		},

		'rgb-gray': function(color) {
			// Using the standard NTSC conversion formula that is used for
			// calculating the effective luminance of an RGB color:
			// http://www.mathworks.com/support/solutions/en/data/1-1ASCU/index.html?solution=1-1ASCU
			return new GrayColor(1 - (color._red * 0.2989 + color._green * 0.587
					+ color._blue * 0.114), color._alpha);
		},

		'gray-rgb': function(color) {
			var comp = 1 - color._gray;
			return new RgbColor(comp, comp, comp, color._alpha);
		},

		'gray-hsb': function(color) {
			return new HsbColor(0, 0, 1 - color._gray, color._alpha);
		},

		'gray-hsl': function(color) {
			return new HslColor(0, 0, 1 - color._gray, color._alpha);
		}
	};

	var fields = /** @lends Color# */{
		_readNull: true,

		initialize: function(arg) {
			var isArray = Array.isArray(arg),
				type = this._colorType;
			if (typeof arg === 'object' && !isArray) {
				if (!type) {
					// Called on the abstract Color class. Guess color type
					// from arg
					return arg.red !== undefined
						? new RgbColor(arg.red, arg.green, arg.blue, arg.alpha)
						: arg.gray !== undefined
						? new GrayColor(arg.gray, arg.alpha)
						: arg.lightness !== undefined
						? new HslColor(arg.hue, arg.saturation, arg.lightness,
								arg.alpha)
						: arg.hue !== undefined
						? new HsbColor(arg.hue, arg.saturation, arg.brightness,
								arg.alpha)
						: new RgbColor(); // Fallback
				} else {
					// Called on a subclass instance. Return the converted
					// color.
					return Color.read(arguments).convert(type);
				}
			} else if (typeof arg === 'string') {
				var rgbColor = arg.match(/^#[0-9a-f]{3,6}$/i)
						? hexToRgbColor(arg)
						: nameToRgbColor(arg);
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
					//	return new CmykColor(components);
					if (components.length >= 3)
						return new RgbColor(components);
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
		 * @return {RgbColor|GrayColor|HsbColor} a copy of the color object
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
			var converter;
			return this._colorType == type
					? this.clone()
					: (converter = converters[this._colorType + '-' + type])
						? converter(this)
						: converters['rgb-' + type](
								converters[this._colorType + '-rgb'](this));
		},

		statics: /** @lends Color */{
			/**
			 * Override Color.extend() to produce getters and setters based
			 * on the component types defined in _components.
			 *
			 * @ignore
			 */
			extend: function(src) {
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
							this._changed();
							return this;
						};
					}, src);
				}
				return this.base(src);
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
}, /** @lends Color# */{

	/**
	 * Called by various setters whenever a color value changes
	 */
	_changed: function() {
		this._cssString = null;
		if (this._owner)
			this._owner._changed(Change.STYLE);
	},

	/**
	 * Returns the type of the color as a string.
	 *
	 * @type String('rgb', 'hsb', 'gray')
	 * @bean
	 *
	 * @example
	 * var color = new RgbColor(1, 0, 0);
	 * console.log(color.type); // 'rgb'
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
	 * The color's alpha value as a number between {@code 0} and {@code 1}. All
	 * colors of the different subclasses support alpha values.
	 *
	 * @type Number
	 * @bean
	 *
	 * @example {@paperscript}
	 * // A filled path with a half transparent stroke:
	 * var circle = new Path.Circle(new Point(80, 50), 30);
	 *
	 * // Fill the circle with red and give it a 20pt green stroke:
	 * circle.style = {
	 * 	fillColor: 'red',
	 * 	strokeColor: 'green',
	 * 	strokeWidth: 20
	 * };
	 *
	 * // Make the stroke half transparent:
	 * circle.strokeColor.alpha = 0.5;
	 */
	getAlpha: function() {
		return this._alpha != null ? this._alpha : 1;
	},

	setAlpha: function(alpha) {
		this._alpha = alpha == null ? null : Math.min(Math.max(alpha, 0), 1);
		this._changed();
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
	 * @return {String} A css string representation of the color.
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
	 *
	 * @example {@paperscript}
	 * // Changing the amount of red in a color:
	 * var circle = new Path.Circle(new Point(80, 50), 30);
	 * circle.fillColor = 'blue';
	 *
	 * // Blue + red = purple:
	 * circle.fillColor.red = 1;
	 */

	/**
	 * The amount of green in the color as a value between {@code 0} and
	 * {@code 1}.
	 *
	 * @name Color#green
	 * @property
	 * @type Number
	 *
	 * @example {@paperscript}
	 * // Changing the amount of green in a color:
	 * var circle = new Path.Circle(new Point(80, 50), 30);
	 *
	 * // First we set the fill color to red:
	 * circle.fillColor = 'red';
	 *
	 * // Red + green = yellow:
	 * circle.fillColor.green = 1;
	 */

	/**
	 * The amount of blue in the color as a value between {@code 0} and
	 * {@code 1}.
	 *
	 * @name Color#blue
	 * @property
	 * @type Number
	 *
	 * @example {@paperscript}
	 * // Changing the amount of blue in a color:
	 * var circle = new Path.Circle(new Point(80, 50), 30);
	 *
	 * // First we set the fill color to red:
	 * circle.fillColor = 'red';
	 *
	 * // Red + blue = purple:
	 * circle.fillColor.blue = 1;
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
	 *
	 * @example {@paperscript}
	 * // Changing the hue of a color:
	 * var circle = new Path.Circle(new Point(80, 50), 30);
	 * circle.fillColor = 'red';
	 * circle.fillColor.hue += 30;
	 *
	 * @example {@paperscript}
	 * // Hue cycling:
	 *
	 * // Create a rectangle shaped path, using the dimensions
	 * // of the view:
	 * var path = new Path.Rectangle(view.bounds);
	 * path.fillColor = 'red';
	 *
	 * function onFrame(event) {
	 * 	path.fillColor.hue += 0.5;
	 * }
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

	/**
	 * {@grouptitle HSL Components}
	 *
	 * The lightness of the color as a value between {@code 0} and {@code 1}.
	 *
	 * @name Color#lightness
	 * @property
	 * @type Number
	 */
});

/**
 * @name GrayColor
 * @class A GrayColor object is used to represent any gray color value.
 * @extends Color
 */
var GrayColor = this.GrayColor = Color.extend(/** @lends GrayColor# */{
	/**
	 * Creates a GrayColor object
	 *
	 * @name GrayColor#initialize
	 * @param {Number} gray the amount of gray in the color as a value
	 * between {@code 0} and {@code 1}
	 * @param {Number} [alpha] the alpha of the color as a value between
	 * {@code 0} and {@code 1}
	 *
	 * @example {@paperscript}
	 * // Creating a GrayColor:
	 *
	 * // Create a circle shaped path at {x: 80, y: 50}
	 * // with a radius of 30:
	 * var circle = new Path.Circle(new Point(80, 50), 30);
	 *
	 * // Create a GrayColor with 50% gray:
	 * circle.fillColor = new GrayColor(0.5);
	 */

	/**
	 * The amount of gray in the color as a value between {@code 0} and
	 * {@code 1}.
	 *
	 * @name GrayColor#gray
	 * @property
	 * @type Number
	 */

	_colorType: 'gray'
});

/**
 * @name RgbColor
 * @class An RgbColor object is used to represent any RGB color value.
 * @extends Color
 */
// RGBColor references RgbColor inside PaperScopes for backward compatibility
var RgbColor = this.RgbColor = this.RGBColor = Color.extend(/** @lends RgbColor# */{
	/**
	 * Creates an RgbColor object
	 *
	 * @name RgbColor#initialize
	 * @param {Number} red the amount of red in the color as a value
	 * between {@code 0} and {@code 1}
	 * @param {Number} green the amount of green in the color as a value
	 * between {@code 0} and {@code 1}
	 * @param {Number} blue the amount of blue in the color as a value
	 * between {@code 0} and {@code 1}
	 * @param {Number} [alpha] the alpha of the color as a value between
	 * {@code 0} and {@code 1}
	 *
	 * @example {@paperscript}
	 * // Creating an RgbColor:
	 *
	 * // Create a circle shaped path at {x: 80, y: 50}
	 * // with a radius of 30:
	 * var circle = new Path.Circle(new Point(80, 50), 30);
	 *
	 * // 100% red, 0% blue, 50% blue:
	 * circle.fillColor = new RgbColor(1, 0, 0.5);
	 */

	/**
	 * The amount of red in the color as a value between {@code 0} and
	 * {@code 1}.
	 *
	 * @name RgbColor#red
	 * @property
	 * @type Number
	 *
	 * @example {@paperscript}
	 * // Changing the amount of red in a color:
	 * var circle = new Path.Circle(new Point(80, 50), 30);
	 * circle.fillColor = 'blue';
	 *
	 * // Blue + red = purple:
	 * circle.fillColor.red = 1;
	 */

	/**
	 * The amount of green in the color as a value between {@code 0} and
	 * {@code 1}.
	 *
	 * @name RgbColor#green
	 * @property
	 * @type Number
	 *
	 * @example {@paperscript}
	 * // Changing the amount of green in a color:
	 * var circle = new Path.Circle(new Point(80, 50), 30);
	 *
	 * // First we set the fill color to red:
	 * circle.fillColor = 'red';
	 *
	 * // Red + green = yellow:
	 * circle.fillColor.green = 1;
	 */

	/**
	 * The amount of blue in the color as a value between {@code 0} and
	 * {@code 1}.
	 *
	 * @name RgbColor#blue
	 * @property
	 * @type Number
	 *
	 * @example {@paperscript}
	 * // Changing the amount of blue in a color:
	 * var circle = new Path.Circle(new Point(80, 50), 30);
	 *
	 * // First we set the fill color to red:
	 * circle.fillColor = 'red';
	 *
	 * // Red + blue = purple:
	 * circle.fillColor.blue = 1;
	 */

	_colorType: 'rgb'
});

/**
 * @name HsbColor
 * @class An HsbColor object is used to represent any HSB color value.
 * @extends Color
 */
// HSBColor references HsbColor inside PaperScopes for backward compatibility
var HsbColor = this.HsbColor = this.HSBColor = Color.extend(/** @lends HsbColor# */{
	/**
	 * Creates an HsbColor object
	 *
	 * @name HsbColor#initialize
	 * @param {Number} hue the hue of the color as a value in degrees between
	 * {@code 0} and {@code 360}.
	 * @param {Number} saturation the saturation of the color as a value
	 * between {@code 0} and {@code 1}
	 * @param {Number} brightness the brightness of the color as a value
	 * between {@code 0} and {@code 1}
	 * @param {Number} [alpha] the alpha of the color as a value between
	 * {@code 0} and {@code 1}
	 *
	 * @example {@paperscript}
	 * // Creating an HsbColor:
	 *
	 * // Create a circle shaped path at {x: 80, y: 50}
	 * // with a radius of 30:
	 * var circle = new Path.Circle(new Point(80, 50), 30);
	 *
	 * // Create an HsbColor with a hue of 90 degrees, a saturation
	 * // 100% and a brightness of 100%:
	 * circle.fillColor = new HsbColor(90, 1, 1);
	 */

	/**
	 * The hue of the color as a value in degrees between {@code 0} and
	 * {@code 360}.
	 *
	 * @name HsbColor#hue
	 * @property
	 * @type Number
	 *
	 * @example {@paperscript}
	 * // Changing the hue of a color:
	 * var circle = new Path.Circle(new Point(80, 50), 30);
	 * circle.fillColor = 'red';
	 * circle.fillColor.hue += 30;
	 *
	 * @example {@paperscript}
	 * // Hue cycling:
	 *
	 * // Create a rectangle shaped path, using the dimensions
	 * // of the view:
	 * var path = new Path.Rectangle(view.bounds);
	 * path.fillColor = 'red';
	 *
	 * function onFrame(event) {
	 * 	path.fillColor.hue += 0.5;
	 * }
	 */

	/**
	 * The saturation of the color as a value between {@code 0} and {@code 1}.
	 *
	 * @name HsbColor#saturation
	 * @property
	 * @type Number
	 */

	/**
	 * The brightness of the color as a value between {@code 0} and {@code 1}.
	 *
	 * @name HsbColor#brightness
	 * @property
	 * @type Number
	 */

	_colorType: 'hsb'
});


/**
 * @name HslColor
 * @class An HslColor object is used to represent any HSL color value.
 * @extends Color
 */
// HSLColor references HslColor inside PaperScopes for backward compatibility
var HslColor = this.HslColor = this.HSLColor = Color.extend(/** @lends HslColor# */{
	/**
	 * Creates an HslColor object
	 *
	 * @name HslColor#initialize
	 * @param {Number} hue the hue of the color as a value in degrees between
	 * {@code 0} and {@code 360}.
	 * @param {Number} saturation the saturation of the color as a value
	 * between {@code 0} and {@code 1}
	 * @param {Number} lightness the lightness of the color as a value
	 * between {@code 0} and {@code 1}
	 * @param {Number} [alpha] the alpha of the color as a value between
	 * {@code 0} and {@code 1}
	 *
	 * @example {@paperscript}
	 * // Creating an HslColor:
	 *
	 * // Create a circle shaped path at {x: 80, y: 50}
	 * // with a radius of 30:
	 * var circle = new Path.Circle(new Point(80, 50), 30);
	 *
	 * // Create an HslColor with a hue of 90 degrees, a saturation
	 * // 100% and a lightness of 50%:
	 * circle.fillColor = new HslColor(90, 1, 0.5);
	 */

	/**
	 * The hue of the color as a value in degrees between {@code 0} and
	 * {@code 360}.
	 *
	 * @name HslColor#hue
	 * @property
	 * @type Number
	 */

	/**
	 * The saturation of the color as a value between {@code 0} and {@code 1}.
	 *
	 * @name HslColor#saturation
	 * @property
	 * @type Number
	 */

	/**
	 * The lightness of the color as a value between {@code 0} and {@code 1}.
	 *
	 * @name HslColor#lightness
	 * @property
	 * @type Number
	 */

	_colorType: 'hsl'
});