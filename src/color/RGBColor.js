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

var RGBColor = this.RGBColor = Color.extend(new function() {
	// TODO: convert hex codes to [r,g,b]?
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

	function stringToComponents(string) {
		return string.match(/^#[0-9a-f]{3,6}$/i)
				? hexToComponents(string)
				: namedToComponents(string);
	};

	function hexToComponents(string) {
		var hex = string.match(/^#?(\w{1,2})(\w{1,2})(\w{1,2})$/);
		if (hex.length >= 4) {
			var rgb = [];
			for (var i = 1; i < 4; i++)
				rgb.push(parseInt(hex[i].length == 1
						? hex[i] + hex[i] : hex[i], 16) / 255);
			return rgb;
		}
	};

	function namedToComponents(name) {
		var hex = namedColors[name];
		if (!hex)
			throw new Error('The named color "' + name + '" does not exist.');
		return hex && hexToComponents(hex);
	};

	return {
		beans: true,

		initialize: function() {
			if (arguments.length == 1) {
				var arg = arguments[0];
				if (typeof arg == 'string') {
					var components = stringToComponents(arg);
					this._red = components[0];
					this._green = components[1];
					this._blue = components[2];
					this._alpha = null;
				} else if (Array.isArray(arg)) {
					this._red = arg[0];
					this._green = arg[1];
					this._blue = arg[2];
					this._alpha = arg.length > 3 ? arg[3] : null;
				} else if (arg.red !== undefined) {
					// TODO: If beans are not activated, this won't copy from
					// an existing color. OK?
					this._red = arg.red;
					this._blue = arg.blue;
					this._green = arg.green;
					this._alpha = arg.alpha ? arg.alpha : null;
				} else if (arg.gray !== undefined) {
					// TODO: Shouldn't this follow the NTSC convention as well?
					this._red = this._green = this._blue = 1 - arg.gray;
					this._alpha = arg.alpha ? arg.alpha : null;
				};
			} else if (arguments.length >= 3) {
				this._red = arguments[0];
				this._green = arguments[1];
				this._blue = arguments[2];
				this._alpha = arguments.length > 3 ? arguments[3] : null;
			}
		},

		getType: function() {
			return this.alpha == -1 ? 'rgb' : 'argb';
		},

		getComponents: function() {
			return [this._red, this._blue, this._green, this._alpha];
		},

		/**
		 * A value between 0 and 1 that specifies the amount of red in the RGB
		 * color.
		 */
		getRed: function() {
			return this._red;
		},

		setRed: function(red) {
			this._cssString = null;
			this._red = red;
			return this;
		},

		/**
		 * A value between 0 and 1 that specifies the amount of green in the RGB
		 * color.
		 */
		getGreen: function() {
			return this._green;
		},

		setGreen: function(green) {
			this._cssString = null;
			this._green = green;
			return this;
		},

		/**
		 * A value between 0 and 1 that specifies the amount of blue in the RGB
		 * color.
		 */
		getBlue: function() {
			return this._blue;
		},

		setBlue: function(blue) {
			this._cssString = null;
			this._blue = blue;
			return this;
		},

		getGray: function() {
			// Using the standard NTSC conversion formula that is used for
			// calculating the effective luminance of an RGB color:
			// http://www.mathworks.com/support/solutions/en/data/1-1ASCU/index.html?product=IP&solution=1-1ASCU

			return 1 - (this._red * 0.2989 + this._green * 0.5870
				+ this._blue * 0.114);
		},

		setGray: function(gray) {
			this._cssString = null;
			this._red = this._green = this._blue = 1 - gray;
			return this;
		},

		/**
		 * Checks if the component color values of the RGBColor are the
		 * same as those of the supplied one.
		 * 
		 * @param obj the RGBColor to compare with
		 * @return {@true if the RGBColor is the same}
		 */
		equals: function(color) {
			if (color instanceof RGBColor) {
				return this._red == color._red &&
					this._green == color._green &&
					this._blue == color._blue &&
					this._alpha == color._alpha;
			}
			return false;
		},

		toString: function() {
			return '{ red: ' + this._red
				+ ', green: ' + this._green
				+ ', blue: ' + this._blue
				+ (this._alpha != null ? ', alpha: ' + this._alpha : '')
				+ ' }';
		},

		toCssString: function() {
			if (!this._cssString) {
				this._cssString = 'rgba('
					+ (Math.round(this._red * 255)) + ', '
					+ (Math.round(this._green * 255)) + ', '
					+ (Math.round(this._blue * 255)) + ', '
					+ (this._alpha != null ? this._alpha : 1)
					+ ')';
			}
			return this._cssString;
		}
	};
});
