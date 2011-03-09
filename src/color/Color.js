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
	var namedColors = {
		lightpink: 'ffb6c1', pink: 'ffc0cb', crimson: 'dc143c',
		lavenderblush: 'fff0f5', palevioletred: 'db7093', hotpink: 'ff69b4',
		deeppink: 'ff1493', mediumvioletred: 'c71585', orchid: 'da70d6',
		thistle: 'd8bfd8', plum: 'dda0dd', violet: 'ee82ee', fuchsia: 'ff00ff',
		darkmagenta: '8b008b', purple: '800080', mediumorchid: 'ba55d3',
		darkviolet: '9400d3', darkorchid: '9932cc', indigo: '4b0082',
		blueviolet: '8a2be2', mediumpurple: '9370db', mediumslateblue: '7b68ee',
		slateblue: '6a5acd', darkslateblue: '483d8b', ghostwhite: 'f8f8ff',
		lavender: 'e6e6fa', blue: '0000ff', mediumblue: '0000cd',
		darkblue: '00008b', navy: '000080', midnightblue: '191970',
		royalblue: '4169e1', cornflowerblue: '6495ed', lightsteelblue: 'b0c4de',
		lightslategray: '778899', slategray: '708090', dodgerblue: '1e90ff',
		aliceblue: 'f0f8ff', steelblue: '4682b4', lightskyblue: '87cefa',
		skyblue: '87ceeb', deepskyblue: '00bfff', lightblue: 'add8e6',
		powderblue: 'b0e0e6', cadetblue: '5f9ea0', darkturquoise: '00ced1',
		azure: 'f0ffff', lightcyan: 'e0ffff', paleturquoise: 'afeeee',
		aqua: '00ffff', darkcyan: '008b8b', teal: '008080',
		darkslategray: '2f4f4f', mediumturquoise: '48d1cc',
		lightseagreen: '20b2aa', turquoise: '40e0d0', aquamarine: '7fffd4',
		mediumaquamarine: '66cdaa', mediumspringgreen: '00fa9a',
		mintcream: 'f5fffa', springgreen: '00ff7f', mediumseagreen: '3cb371',
		seagreen: '2e8b57', honeydew: 'f0fff0', darkseagreen: '8fbc8f',
		palegreen: '98fb98', lightgreen: '90ee90', limegreen: '32cd32',
		lime: '00ff00', forestgreen: '228b22', green: '008000',
		darkgreen: '006400', lawngreen: '7cfc00', chartreuse: '7fff00',
		greenyellow: 'adff2f', darkolivegreen: '556b2f', yellowgreen: '9acd32',
		olivedrab: '6b8e23', ivory: 'fffff0', beige: 'f5f5dc',
		lightyellow: 'ffffe0', lightgoldenrodyellow: 'fafad2', yellow: 'ffff00',
		olive: '808000', darkkhaki: 'bdb76b', palegoldenrod: 'eee8aa',
		lemonchiffon: 'fffacd', khaki: 'f0e68c', gold: 'ffd700',
		cornsilk: 'fff8dc', goldenrod: 'daa520', darkgoldenrod: 'b8860b',
		floralwhite: 'fffaf0', oldlace: 'fdf5e6', wheat: 'f5deb3',
		orange: 'ffa500', moccasin: 'ffe4b5', papayawhip: 'ffefd5',
		blanchedalmond: 'ffebcd', navajowhite: 'ffdead', antiquewhite: 'faebd7',
		tan: 'd2b48c', burlywood: 'deb887', darkorange: 'ff8c00',
		bisque: 'ffe4c4', linen: 'faf0e6', peru: 'cd853f', peachpuff: 'ffdab9',
		sandybrown: 'f4a460', chocolate: 'd2691e', saddlebrown: '8b4513',
		seashell: 'fff5ee', sienna: 'a0522d', lightsalmon: 'ffa07a',
		coral: 'ff7f50', orangered: 'ff4500', darksalmon: 'e9967a',
		tomato: 'ff6347', salmon: 'fa8072', mistyrose: 'ffe4e1',
		lightcoral: 'f08080', snow: 'fffafa', rosybrown: 'bc8f8f',
		indianred: 'cd5c5c', red: 'ff0000', brown: 'a52a2a',
		firebrick: 'b22222', darkred: '8b0000', maroon: '800000',
		white: 'ffffff', whitesmoke: 'f5f5f5', gainsboro: 'dcdcdc',
		lightgrey: 'd3d3d3', silver: 'c0c0c0', darkgray: 'a9a9a9',
		gray: '808080', dimgray: '696969', black: '000000'
	};
	
	function hexToRGB(hex) {
		hex = hex.match(/^#?(\w{1,2})(\w{1,2})(\w{1,2})$/);
		if (hex.length >= 4) {
			var rgb = new Array(3);
			for (var i = 0; i < 3; i++) {
				var channel = hex[i + 1];
				rgb[i] = parseInt(channel.length == 1
						? channel + channel : channel, 16) / 255;
			}
			return rgb;
		}
	}
	
	function stringToRGB(string) {
		if (string.match(/^#[0-9a-f]{3,6}$/i)) {
			return hexToRGB(string);
		} else { 
			var hex = namedColors[string];
			if (!hex)
				throw new Error('The named color "' + string
						+ '" does not exist.');
			return hexToRGB(hex);
		}
	};
	
	return {
		beans: true,

		initialize: function(arg) {
			var isArray = Array.isArray(arg);
			if (typeof arg == 'object' && !isArray) {
				if (!this._colorType) {
					// Called on the abstract Color class. Guess color type
					// from arg
					if (arg.red !== undefined) {
						return new RGBColor(arg.red, arg.green, arg.blue,
								arg.alpha);
					} else if (arg.gray !== undefined) {
						return new GrayColor(arg.gray, arg.alpha);
					} else if (arg.hue !== undefined) {
						return new HSBColor(arg.hue, arg.saturation,
								arg.brightness, arg.alpha);
					}
				} else {
					// Called on a subclass instance. Return the converted
					// color.
					var color = Color.read(arguments, 0, 1);
					return this._colorType
							? color.convert(this._colorType)
							: color;
				}
			} else if (typeof arg == 'string') {
				var rgbColor = RGBColor.read(stringToRGB(arg));
				return this._colorType
						? rgbColor.convert(this._colorType)
						: rgbColor;
			} else {
				var components = isArray ? arg : arguments;
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
							this['_' + name] = value !== undefined
									? value
									// TODO: is this correct?
									// Shouldn't alpha be set to -1?
									: name == 'alpha' ? 1 : null;
						}, this);
				}
			}
		},

		getType: function() {
			return this._colorType;
		},

		getComponents: function() {
			var l = this._components.length;
			var components = new Array(l);
			for (var i = 0; i < l; i++) {
				components[i] = this['_' + this._components[i]];
			}
			return components;
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
			this._alpha = alpha < 0 ? 0 : alpha > 1 ? 1 : alpha;
			this._cssString = null;
		},

		/**
		 * Checks if the color has an alpha value.
		 *
		 * @return {@true if the color has an alpha value}
		 */
		hasAlpha: function() {
			return this._alpha != null;
		},

		/**
		 * Checks if the component color values of the color are the
		 * same as those of the supplied one.
		 * 
		 * @param obj the GrayColor to compare with
		 * @return {@true if the GrayColor is the same}
		 */
		equals: function(color) {
			if (color._colorType == this._colorType) {
				for (var i = 0, l = this._components; i < l; i++) {
					var component = '_' + this._components[i];
					if (this[component] !== color[component])
						return false;
				}
				return true;
			}
			return false;
		},

		toString: function() {
			var string = '';
			for (var i = 0, l = this._components.length; i < l; i++) {
				var component = this._components[i];
				var value = this['_' + component];
				if (component == 'alpha' && value == null)
					value = 1;
				string += (i > 0 ? ', ' : '') + component + ': ' + value;
			}
			return '{ ' + string + ' }';
		},

		toCssString: function() {
			if (!this._cssString) {
				var color = this._colorType == 'rgb'
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
	};
}, new function() {
	function rgbToHsb(r, g, b) {
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
		return [hue * 360, saturation, brightness];
	}

	function colorToHsb(color) {
		return rgbToHsb(color.getRed(), color.getGreen(), color.getBlue());
	}

	function hsbToRgb(hue, saturation, brightness) {
		if (hue < 0)
			hue += 360;
		hue = hue % 360;
		var f = hue % 60,
			p = (brightness * (1 - saturation)) / 1,
			q = (brightness * (60 - saturation * f)) / 60,
			t = (brightness * (60 - saturation * (60 - f))) / 60;
		switch (Math.floor(hue / 60)) {
			case 0: return [brightness, t, p];
			case 1: return [q, brightness, p];
			case 2: return [p, brightness, t];
			case 3: return [p, q, brightness];
			case 4: return [t, p, brightness];
			case 5: return [brightness, p, q];
		}
	}

	var converters = {
		'rgb-hsb': function(color) {
			var components = rgbToHsb(color._red, color._green, color._blue);
			components.push(color._alpha);
			return HSBColor.read(components);
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
		
		'hsb-rgb': function(color) {
			var components = hsbToRgb(color._hue, color._saturation,
					color._brightness);
			components.push(color._alpha);
			return RGBColor.read(components);
		},
		
		'hsb-gray': function(color) {
			var rgbColor = converters['hsb-rgb'](color);
			return converters['rgb-gray'](rgbColor);
		},
		
		'gray-rgb': function(color) {
			var component = 1 - color.getGray();
			return new RGBColor(component, component, component);
		},
		
		'gray-hsb': function(color) {
			return new HSBColor(0, 0, 1 - color.getGray());
		}
	};

	return {
		convert: function(type) {
			return this._colorType == type
				? this
				: converters[this._colorType + '-' + type](this);
		}
	};
}, new function() {
	return Base.each({
		rgb: ['red', 'green', 'blue'],
		hsb: ['hue', 'saturation', 'brightness'],
		gray: ['gray']
	}, function(components, colorType) {
		Base.each(components, function(component) {
			this['get' + Base.capitalize(component)] = function() {
				return this.convert(colorType)[component];
			};
			this['set' + Base.capitalize(component)] = function(value) {
				// TODO: can this be optimized?
				var convertedColor = this.convert(colorType);
				convertedColor[component] = value;
				var color = convertedColor.convert(this._colorType);
				for (var i = 0, l = this._components.length; i < l; i++) {
					this[this._components[i]] = color[this._components[i]];
				}
			};
		}, this);
	}, { beans: true });
});