var RGBColor = Color.extend(new function() {
	// TODO: convert hex codes to [r,g,b]?
	var namedColors = {
		lightpink: 'FFB6C1', pink: 'FFC0CB', crimson: 'DC143C',
		lavenderblush: 'FFF0F5', palevioletred: 'DB7093', hotpink: 'FF69B4',
		deeppink: 'FF1493', mediumvioletred: 'C71585', orchid: 'DA70D6',
		thistle: 'D8BFD8', plum: 'DDA0DD', violet: 'EE82EE', fuchsia: 'FF00FF',
		darkmagenta: '8B008B', purple: '800080', mediumorchid: 'BA55D3',
		darkviolet: '9400D3', darkorchid: '9932CC', indigo: '4B0082',
		blueviolet: '8A2BE2', mediumpurple: '9370DB', mediumslateblue: '7B68EE',
		slateblue: '6A5ACD', darkslateblue: '483D8B', ghostwhite: 'F8F8FF',
		lavender: 'E6E6FA', blue: '0000FF', mediumblue: '0000CD',
		darkblue: '00008B', navy: '000080', midnightblue: '191970',
		royalblue: '4169E1', cornflowerblue: '6495ED', lightsteelblue: 'B0C4DE',
		lightslategray: '778899', slategray: '708090', dodgerblue: '1E90FF',
		aliceblue: 'F0F8FF', steelblue: '4682B4', lightskyblue: '87CEFA',
		skyblue: '87CEEB', deepskyblue: '00BFFF', lightblue: 'ADD8E6',
		powderblue: 'B0E0E6', cadetblue: '5F9EA0', darkturquoise: '00CED1',
		azure: 'F0FFFF', lightcyan: 'E0FFFF', paleturquoise: 'AFEEEE',
		aqua: '00FFFF', darkcyan: '008B8B', teal: '008080', darkslategray: '2F4F4F',
		mediumturquoise: '48D1CC', lightseagreen: '20B2AA', turquoise: '40E0D0',
		aquamarine: '7FFFD4', mediumaquamarine: '66CDAA', mediumspringgreen: '00FA9A',
		mintcream: 'F5FFFA', springgreen: '00FF7F', mediumseagreen: '3CB371',
		seagreen: '2E8B57', honeydew: 'F0FFF0', darkseagreen: '8FBC8F',
		palegreen: '98FB98', lightgreen: '90EE90', limegreen: '32CD32',
		lime: '00FF00', forestgreen: '228B22', green: '008000', darkgreen: '006400',
		lawngreen: '7CFC00', chartreuse: '7FFF00', greenyellow: 'ADFF2F',
		darkolivegreen: '556B2F', yellowgreen: '9ACD32', olivedrab: '6B8E23',
		ivory: 'FFFFF0', beige: 'F5F5DC', lightyellow: 'FFFFE0',
		lightgoldenrodyellow: 'FAFAD2', yellow: 'FFFF00', olive: '808000',
		darkkhaki: 'BDB76B', palegoldenrod: 'EEE8AA', lemonchiffon: 'FFFACD',
		khaki: 'F0E68C', gold: 'FFD700', cornsilk: 'FFF8DC', goldenrod: 'DAA520',
		darkgoldenrod: 'B8860B', floralwhite: 'FFFAF0', oldlace: 'FDF5E6',
		wheat: 'F5DEB3', orange: 'FFA500', moccasin: 'FFE4B5', papayawhip: 'FFEFD5',
		blanchedalmond: 'FFEBCD', navajowhite: 'FFDEAD', antiquewhite: 'FAEBD7',
		tan: 'D2B48C', burlywood: 'DEB887', darkorange: 'FF8C00', bisque: 'FFE4C4',
		linen: 'FAF0E6', peru: 'CD853F', peachpuff: 'FFDAB9', sandybrown: 'F4A460',
		chocolate: 'D2691E', saddlebrown: '8B4513', seashell: 'FFF5EE',
		sienna: 'A0522D', lightsalmon: 'FFA07A', coral: 'FF7F50',
		orangered: 'FF4500', darksalmon: 'E9967A', tomato: 'FF6347',
		salmon: 'FA8072', mistyrose: 'FFE4E1', lightcoral: 'F08080', snow: 'FFFAFA',
		rosybrown: 'BC8F8F', indianred: 'CD5C5C', red: 'FF0000', brown: 'A52A2A',
		firebrick: 'B22222', darkred: '8B0000', maroon: '800000', white: 'FFFFFF',
		whitesmoke: 'F5F5F5', gainsboro: 'DCDCDC', lightgrey: 'D3D3D3',
		silver: 'C0C0C0', darkgray: 'A9A9A9', gray: '808080', dimgray: '696969',
		black: '000000'
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
				rgb.push((hex[i].length == 1 ? hex[i] + hex[i] : hex[i]).toInt(16) / 255);
			return rgb;
		}
	};

	function namedToComponents(name) {
		var hex = namedColors[name];
		if (!hex) throw Error('The named color "' + name + '" does not exist.');
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
					this.alpha = -1;
				} else if (Array.isArray(arg)) {
					this._red = arg[0];
					this._green = arg[1];
					this._blue = arg[2];
					this.alpha = (arg.length > 3) ? arg[3] : -1;
				} else if (arg.red !== undefined) {
					this._red = arg.red;
					this._blue = arg.blue;
					this._green = arg.green;
					this.alpha = arg.alpha ? arg.alpha : -1;
				} else if (arg.gray !== undefined) {
					this._red = this._green = this._blue = 1 - arg.gray;
					this.alpha = arg.alpha ? arg.alpha : -1;
				};
			} else if (arguments.length >= 3) {
				this._red = arguments[0];
				this._green = arguments[1];
				this._blue = arguments[2];
				this.alpha = (arguments.length > 3) ? arguments[3] : -1;
			}
		},

		getType: function() {
			return this.alpha == -1 ? 'rgb' : 'argb';
		},

		getComponents: function() {
			return [this._red, this._blue, this._green, this._alpha];
		},

		/**
		 * A value between 0 and 1 that specifies the amount of red in the RGB color.
		 */
		getRed: function() {
			return this._red;
		},

		setRed: function(red) {
			this._cssString = null;
			this._red = red;
		},

		/**
		 * A value between 0 and 1 that specifies the amount of green in the RGB color.
		 */
		getGreen: function() {
			return this._green;
		},

		setGreen: function(green) {
			this._cssString = null;
			this._green = green;
		},

		/**
		 * A value between 0 and 1 that specifies the amount of blue in the RGB color.
		 */
		getBlue: function() {
			return this._blue;
		},

		setBlue: function(blue) {
			this._cssString = null;
			this._blue = blue;
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
				return this.red == color.red &&
					this.green == color.green &&
					this.blue == color.blue &&
					this.alpha == color.alpha;
			}
			return false;
		},

		toString: function() {
			return '{ red: ' + this.red
				+ ', green: ' + this.green
				+ ', blue: ' + this.blue
				+ ((this.alpha != -1) ? ', alpha: ' + this.alpha : '')
				+ ' }';
		},

		getCssString: function() {
			if (!this._cssString) {
				this._cssString = 'rgba('
					+ (Math.round(this.red * 255)) + ', '
					+ (Math.round(this.green * 255)) + ', '
					+ (Math.round(this.blue * 255)) + ', '
					+ ((this.alpha != -1) ? this.alpha : 1)
					+ ')';
			}
			return this._cssString;
		}
	};
});
