/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name Color
 *
 * @class All properties and functions that expect color values in the form
 * of instances of Color objects, also accept named colors and hex values as
 * strings which are then converted to instances of
 * {@link Color} internally.
 *
 * @classexample {@paperscript}
 * // Named color values:
 *
 * // Create a circle shaped path at {x: 80, y: 50}
 * // with a radius of 30.
 * var circle = new Path.Circle(new Point(80, 50), 30);
 *
 * // Pass a color name to the fillColor property, which is internally
 * // converted to a Color.
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
 * // converted to a Color.
 * circle.fillColor = '#ff0000';
 */
var Color = Base.extend(new function() {

	var types = {
		gray: ['gray'],
		rgb: ['red', 'green', 'blue'],
		hsb: ['hue', 'saturation', 'brightness'],
		hsl: ['hue', 'saturation', 'lightness'],
		gradient: ['gradient', 'origin', 'destination', 'highlight'],
		pattern: ['pattern', 'url', 'repeat', 'width', 'height']
	};

	var componentParsers = {}, // Parsers of values for setters, by type and property
		colorCache = {},
		colorCtx;

	function nameToRGB(name) {
		var cached = colorCache[name];
		if (!cached) {
			// Use a canvas to draw to with the given name and then retrieve rgb
			// values from. Build a cache for all the used colors.
			if (!colorCtx) {
				colorCtx = CanvasProvider.getContext(1, 1);
				colorCtx.globalCompositeOperation = 'copy';
			}
			// Set the current fillStyle to transparent, so that it will be
			// transparent instead of the previously set color in case the new
			// color can not be interpreted.
			colorCtx.fillStyle = 'rgba(0,0,0,0)';
			// Set the fillStyle of the context to the passed name and fill the
			// canvas with it, then retrieve the data for the drawn pixel:
			colorCtx.fillStyle = name;
			colorCtx.fillRect(0, 0, 1, 1);
			var data = colorCtx.getImageData(0, 0, 1, 1).data;
			cached = colorCache[name] = [
				data[0] / 255,
				data[1] / 255,
				data[2] / 255
			];
		}
		return cached.slice();
	}

	function hexToRGB(string) {
		var hex = string.match(/^#?(\w{1,2})(\w{1,2})(\w{1,2})$/);
		if (hex.length >= 4) {
			var components = [0, 0, 0];
			for (var i = 0; i < 3; i++) {
				var value = hex[i + 1];
				components[i] = parseInt(value.length == 1
						? value + value : value, 16) / 255;
			}
			return components;
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

	// Calling convention for converters:
	// The components are passed as an arguments list, and returned as an array.
	// alpha is left out, because the conversion does not change it.
	var converters = {
		'rgb-hsb': function(r, g, b) {
			var max = Math.max(r, g, b),
				min = Math.min(r, g, b),
				delta = max - min,
				h = delta === 0 ? 0
					:   ( max == r ? (g - b) / delta + (g < b ? 6 : 0)
						: max == g ? (b - r) / delta + 2
						:            (r - g) / delta + 4) * 60; // max == b
			return [h, max === 0 ? 0 : delta / max, max];
		},

		'hsb-rgb': function(h, s, b) {
			var h = (h / 60) % 6, // Scale to 0..6
				i = Math.floor(h), // 0..5
				f = h - i,
				i = hsbIndices[i],
				v = [
					b,						// b, index 0
					b * (1 - s),			// p, index 1
					b * (1 - s * f),		// q, index 2
					b * (1 - s * (1 - f))	// t, index 3
				];
			return [v[i[0]], v[i[1]], v[i[2]]];
		},

		// HSL code is based on:
		// http://mjijackson.com/2008/02/rgb-to-hsl-and-rgb-to-hsv-color-model-conversion-algorithms-in-javascript
		'rgb-hsl': function(r, g, b) {
			var max = Math.max(r, g, b),
				min = Math.min(r, g, b),
				delta = max - min,
				achromatic = delta === 0,
				h = achromatic ? 0
					:   ( max == r ? (g - b) / delta + (g < b ? 6 : 0)
						: max == g ? (b - r) / delta + 2
						:            (r - g) / delta + 4) * 60, // max == b
				l = (max + min) / 2,
				s = achromatic ? 0 : l < 0.5
						? delta / (max + min)
						: delta / (2 - max - min);
			return [h, s, l];
		},

		'hsl-rgb': function(h, s, l) {
			h /= 360;
			if (s === 0)
				return [l, l, l];
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
			return c;
		},

		'rgb-gray': function(r, g, b) {
			// Using the standard NTSC conversion formula that is used for
			// calculating the effective luminance of an RGB color:
			// http://www.mathworks.com/support/solutions/en/data/1-1ASCU/index.html?solution=1-1ASCU
			return [r * 0.2989 + g * 0.587 + b * 0.114];
		},

		'gray-rgb': function(g) {
			return [g, g, g];
		},

		'gray-hsb': function(g) {
			return [0, 0, g];
		},

		'gray-hsl': function(g) {
			// TODO: Is lightness really the same as brightness for gray?
			return [0, 0, g];
		},

		'gradient-rgb': function(/* gradient */) {
			// TODO: Implement
			return [];
		},

		'rgb-gradient': function(/* r, g, b */) {
			// TODO: Implement
			return [];
		}

	};

	// Produce getters and setter methods for the various color components known
	// by the different color types. Requesting any of these components on any
	// color internally converts the color to the required type and then returns
	// its component.
	return Base.each(types, function(properties, type) {
		// Keep track of parser functions per type.
		componentParsers[type] = [];
		Base.each(properties, function(name, index) {
			var part = Base.capitalize(name),
				// Both hue and saturation have overlapping properties between
				// hsb and hsl. Handle this here separately, by testing for
				// overlaps and skipping conversion if the type is /hs[bl]/
				hasOverlap = /^(hue|saturation)$/.test(name);
				// Produce value parser function for the given type / propeprty
				// name combination.
				// 
				var parser;
				if(name === 'pattern'){
					parser = componentParsers[type][index] = function(value) {
						value = new Pattern(value.url, value.repeat, value.width, value.height);
						value._addOwner(this);
						return value;
					};
				}
				else
				parser = componentParsers[type][index] = name === 'gradient'
					? function(value) {
						var current = this._components[0];
						value = Gradient.read(
								Array.isArray(value) ? value : arguments,
								0, 0, { readNull: true });
						if (current !== value) {
							if (current)
								current._removeOwner(this);
							if (value)
								value._addOwner(this);
						}
						return value;
					}
					: name === 'hue'
						? function(value) {
							// Keep negative values within modulo 360 too:
							return isNaN(value) ? 0
									: ((value % 360) + 360) % 360;
						}
						: type === 'gradient'
							? function(/* value */) {
								return Point.read(arguments, 0, 0, {
										readNull: name === 'highlight',
										clone: true
								});
							}
							: function(value) {
								return isNaN(value) ? 0
										: Math.min(Math.max(value, 0), 1);
							};

			this['get' + part] = function() {
				return this._type === type
					|| hasOverlap && /^hs[bl]$/.test(this._type)
						? this._components[index]
						: this._convert(type)[index];
			};

			this['set' + part] = function(value) {
				// Convert to the requrested type before setting the value
				if (this._type !== type
						&& !(hasOverlap && /^hs[bl]$/.test(this._type))) {
					this._components = this._convert(type);
					this._properties = types[type];
					this._type = type;
				}
				value = parser.call(this, value);
				if (value != null) {
					this._components[index] = value;
					this._changed();
				}
			};
		}, this);
	}, /** @lends Color# */{
		_class: 'Color',
		// Tell Base.read that the Point constructor supports reading with index
		_readIndex: true,

		/**
		 * Creates a RGB Color object.
		 *
		 * @name Color#initialize
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
		 * // Creating a RGB Color:
		 *
		 * // Create a circle shaped path at {x: 80, y: 50}
		 * // with a radius of 30:
		 * var circle = new Path.Circle(new Point(80, 50), 30);
		 *
		 * // 100% red, 0% blue, 50% blue:
		 * circle.fillColor = new Color(1, 0, 0.5);
		 */
		/**
		 * Creates a gray Color object.
		 *
		 * @name Color#initialize
		 * @param {Number} gray the amount of gray in the color as a value
		 * between {@code 0} and {@code 1}
		 * @param {Number} [alpha] the alpha of the color as a value between
		 * {@code 0} and {@code 1}
		 *
		 * @example {@paperscript}
		 * // Creating a gray Color:
		 *
		 * // Create a circle shaped path at {x: 80, y: 50}
		 * // with a radius of 30:
		 * var circle = new Path.Circle(new Point(80, 50), 30);
		 *
		 * // Create a GrayColor with 50% gray:
		 * circle.fillColor = new Color(0.5);
		 */
		/**
		 * Creates a HSB, HSL or gradient Color object from the properties of
		 * the provided object:
  		 *
  		 * <b>HSB Color</b>:<br>
 		 * {@code hue: Number} — the hue of the color as a value in
 		 * degrees between {@code 0} and {@code 360}<br>
 		 * {@code saturation: Number} — the saturation of the color as a
 		 * value between {@code 0} and {@code 1}<br>
 		 * {@code brightness: Number} — the brightness of the color as a
 		 * value between {@code 0} and {@code 1}<br>
 		 * {@code alpha: Number} — the alpha of the color as a value between
 		 * {@code 0} and {@code 1}
 		 *
  		 * <b>HSL Color</b>:<br>
 		 * {@code hue: Number} — the hue of the color as a value in
 		 * degrees between {@code 0} and {@code 360}<br>
 		 * {@code saturation: Number} — the saturation of the color as a
 		 * value between {@code 0} and {@code 1}<br>
 		 * {@code lightness: Number} — the lightness of the color as a
 		 * value between {@code 0} and {@code 1}<br>
 		 * {@code alpha: Number} — the alpha of the color as a value between
 		 * {@code 0} and {@code 1}
 		 *
  		 * <b>Gradient Color</b>:<br>
		 * {@code gradient: Gradient} — the gradient object that describes the
		 *  color stops and type of gradient to be used.<br>
		 * {@code origin: Point} — the origin point of the gradient<br>
		 * {@code destination: Point} — the destination point of the gradient
		 * {@code stops: Array of GradientStop} — the gradient stops describing
		 * the gradient, as an alternative to providing a gradient object<br>
		 * {@code radial: Boolean} — controls whether the gradient is radial, as
		 * an alternative to providing a gradient object<br>
		 *
		 * @name Color#initialize
		 * @param {Object} object an object describing the components and 
		 *        properties of the color.
		 *
		 * @example {@paperscript}
		 * // Creating a HSB Color:
		 *
		 * // Create a circle shaped path at {x: 80, y: 50}
		 * // with a radius of 30:
		 * var circle = new Path.Circle(new Point(80, 50), 30);
		 *
		 * // Create an HSB Color with a hue of 90 degrees, a saturation
		 * // 100% and a brightness of 100%:
		 * circle.fillColor = { hue: 90, saturation: 1, brightness: 1 };
 		 *
 		 * @example {@paperscript}
 		 * // Creating a HSL Color:
 		 *
 		 * // Create a circle shaped path at {x: 80, y: 50}
 		 * // with a radius of 30:
 		 * var circle = new Path.Circle(new Point(80, 50), 30);
 		 *
 		 * // Create an HSL Color with a hue of 90 degrees, a saturation
 		 * // 100% and a lightness of 50%:
 		 * circle.fillColor = { hue: 90, saturation: 1, lightness: 0.5 };
 		 *
 		 * @example {@paperscript height=200}
 		 * // Creating a gradient color from an object literal:
 		 *
 		 * // Define two points which we will be using to construct
 		 * // the path and to position the gradient color:
 		 * var topLeft = view.center - [80, 80];
 		 * var bottomRight = view.center + [80, 80];
  		 * 
 		 * var path = new Path.Rectangle({
 		 * 	topLeft: topLeft,
 		 * 	bottomRight: bottomRight,
 		 * 	// Fill the path with a gradient of three color stops
 		 * 	// that runs between the two points we defined earlier:
 		 * 	fillColor: {
		 * 		stops: ['yellow', 'red', 'blue'],
 		 * 		origin: topLeft,
 		 * 		destination: bottomRight
 		 * 	}
 		 * });
 		 */
		/**
		 * Creates a gradient Color object.
		 *
		 * @name Color#initialize
		 * @param {Gradient} gradient
		 * @param {Point} origin
		 * @param {Point} destination
		 * @param {Point} [highlight]
		 *
		 * @example {@paperscript height=200}
		 * // Applying a linear gradient color containing evenly distributed
		 * // color stops:
		 *
		 * // Define two points which we will be using to construct
		 * // the path and to position the gradient color:
		 * var topLeft = view.center - [80, 80];
		 * var bottomRight = view.center + [80, 80];
		 *
		 * // Create a rectangle shaped path between
		 * // the topLeft and bottomRight points:
		 * var path = new Path.Rectangle(topLeft, bottomRight);
		 *
		 * // Create the gradient, passing it an array of colors to be converted
		 * // to evenly distributed color stops:
		 * var gradient = new Gradient(['yellow', 'red', 'blue']);
		 *
		 * // Have the gradient color run between the topLeft and
		 * // bottomRight points we defined earlier:
		 * var gradientColor = new Color(gradient, topLeft, bottomRight);
		 *
		 * // Set the fill color of the path to the gradient color:
		 * path.fillColor = gradientColor;
		 *
		 * @example {@paperscript height=200}
		 * // Applying a radial gradient color containing unevenly distributed
		 * // color stops:
		 *
		 * // Create a circle shaped path at the center of the view
		 * // with a radius of 80:
		 * var path = new Path.Circle({
		 * 	center: view.center,
		 * 	radius: 80
		 * });
		 *
		 * // The stops array: yellow mixes with red between 0 and 15%,
		 * // 15% to 30% is pure red, red mixes with black between 30% to 100%:
		 * var stops = [['yellow', 0], ['red', 0.15], ['red', 0.3], ['black', 0.9]];
		 *
		 * // Create a radial gradient using the color stops array:
		 * var gradient = new Gradient(stops, true);
		 *
		 * // We will use the center point of the circle shaped path as
		 * // the origin point for our gradient color
		 * var from = path.position;
		 *
		 * // The destination point of the gradient color will be the
		 * // center point of the path + 80pt in horizontal direction:
		 * var to = path.position + [80, 0];
		 *
		 * // Create the gradient color:
		 * var gradientColor = new Color(gradient, from, to);
		 *
		 * // Set the fill color of the path to the gradient color:
		 * path.fillColor = gradientColor;
		 */
		initialize: function Color(arg) {
			// We are storing color internally as an array of components
			var slice = Array.prototype.slice,
				args = arguments,
				read = 0,
				parse = true,
				type,
				components,
				alpha,
				values;
			// If first argument is an array, replace arguments with it.
			if (Array.isArray(arg)) {
				args = arg;
				arg = args[0];
			}
			// First see if it's a type string argument, and if so, set it and
			// shift it out of the arguments list.
			var argType = arg != null && typeof arg;
			if (argType === 'string' && arg in types) {
				type = arg;
				arg = args[1];
				if (Array.isArray(arg)) {
					// Internal constructor that is called with the following
					// arguments, without parsing: (type, componets, alpha)
					components = arg;
					alpha = args[2];
				} else {
					// For deserialization, shift out and process normally.
					if (this.__read)
						read = 1; // Will be increased below
					// Shift type out of the arguments, and process normally.
					args = slice.call(args, 1);
					argType = typeof arg;
				}
			}
			if (!components) {
				// Only parse values if we're not told to not do so
				parse = !(this.__options && this.__options.dontParse);
				// Determine if there is a values array
				values = argType === 'number'
						? args
						// Do not use Array.isArray() to also support arguments
						: argType === 'object' && arg.length != null
							? arg
							: null;
				// The various branches below produces a values array if the
				// values still need parsing, and a components array if they are
				// already parsed.
				if (values) {
					if (!type)
						// type = values.length >= 4
						// 		? 'cmyk'
						// 		: values.length >= 3
						type = values.length >= 3
								? 'rgb'
								: 'gray';
					var length = types[type].length;
					alpha = values[length];
					if (this.__read)
						read += values === arguments
							? length + (alpha != null ? 1 : 0)
							: 1;
					if (values.length > length)
						values = slice.call(values, 0, length);
				} else if (argType === 'string') {
					components = arg.match(/^#[0-9a-f]{3,6}$/i)
							? hexToRGB(arg)
							: nameToRGB(arg);
					type = 'rgb';
				} else if (argType === 'object') {
					if (arg.constructor === Color) {
						type = arg._type;
						components = arg._components.slice();
						alpha = arg._alpha;
						if (type === 'gradient') {
							// Clone all points, since they belong to the other
							// color already.
							for (var i = 1, l = components.length; i < l; i++) {
								var point = components[i];
								if (point)
									components[i] = point.clone();
							}
						}
					} else if (arg.constructor === Gradient) {
						type = 'gradient';
						values = args;
					} else if (arg.constructor === Pattern) {
						type = 'pattern';
						values = args;
					} else {
						// Determine type by presence of object property names
						if('pattern' in arg)
							type = 'pattern';
						else
							type = 'hue' in arg
								? 'lightness' in arg
									? 'hsl'
									: 'hsb'
								: 'gradient' in arg || 'stops' in arg
										|| 'radial' in arg
									? 'gradient'
									: 'gray' in arg
										? 'gray'
										: 'rgb';
						// Convert to array and parse in one loop, for efficiency
						var properties = types[type];
							parsers = parse && componentParsers[type];
						this._components = components = [];
						for (var i = 0, l = properties.length; i < l; i++) {
							var value = arg[properties[i]];
							// Allow implicit definition of gradients through
							// stops / radial properties. Conversion happens
							// here on the fly:
							if (value == null && i === 0 && type === 'gradient'
									&& 'stops' in arg) {
								value = {
									stops: arg.stops,
									radial: arg.radial
								};
							}
							if (parse)
								value = parsers[i].call(this, value);
							if (value != null)
								components[i] = value;
						}
						alpha = arg.alpha;
					}
				}
				if (this.__read && type)
					read = 1;
			}
			// Default fallbacks: rgb, black
			this._type = type || 'rgb';
			// Define this gradient Color's unique id.
			if (type === 'gradient')
				this._id = Color._id = (Color._id || 0) + 1;
			if (!components) {
				// Produce a components array now, and parse values. Even if no
				// values are defined, parsers are still called to produce
				// defaults.
				this._components = components = [];
				var parsers = componentParsers[this._type];
				for (var i = 0, l = parsers.length; i < l; i++) {
					var value = values && values[i];
					if (parse)
						value = parsers[i].call(this, value);
					if (value != null)
						components[i] = value;
				}
			}
			this._components = components;
			this._properties = types[this._type];
			this._alpha = alpha;
			if (this.__read)
				this.__read = read;
		},

		_serialize: function(options, dictionary) {
			var components = this.getComponents();
			return Base.serialize(
					// We can ommit the type for gray and rgb:
					/^(gray|rgb)$/.test(this._type)
						? components
						: [this._type].concat(components),
					options, true, dictionary);
		},

		/**
		 * Called by various setters whenever a color value changes
		 */
		_changed: function() {
			this._canvasStyle = null;
			if (this._owner)
				this._owner._changed(/*#=*/ Change.STYLE);
		},

		/**
		 * @return {Color} a copy of the color object
		 */
		clone: function() {
			return new Color(this._type, this._components.slice(), this._alpha);
		},

		/**
		 * @return {Number[]} the converted components as an array.
		 */
		_convert: function(type) {
			var converter;
			return this._type === type
					? this._components.slice()
					: (converter = converters[this._type + '-' + type])
						? converter.apply(this, this._components)
						// Convert to and from rgb if no direct converter exists
						: converters['rgb-' + type].apply(this,
							converters[this._type + '-rgb'].apply(this,
									this._components));
		},

		convert: function(type) {
			return new Color(type, this._convert(type), this._alpha);
		},

		/**
		 * The type of the color as a string.
		 *
		 * @type String('rgb', 'hsb', 'gray')
		 * @bean
		 *
		 * @example
		 * var color = new Color(1, 0, 0);
		 * console.log(color.type); // 'rgb'
		 */
		getType: function() {
			return this._type;
		},

		setType: function(type) {
			this._components = this._convert(type);
			this._properties = types[type];
			this._type = type;
		},

		getComponents: function() {
			var components = this._components.slice();
			if (this._alpha != null)
				components.push(this._alpha);
			return components;
		},

		/**
		 * The color's alpha value as a number between {@code 0} and {@code 1}.
		 * All colors of the different subclasses support alpha values.
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
			if (Base.isPlainValue(color))
				color = Color.read(arguments);
			return color === this || color && this._type === color._type
					&& this._alpha === color._alpha
					&& Base.equals(this._components, color._components)
					|| false;
		},

		/**
		 * {@grouptitle String Representations}
		 * @return {String} a string representation of the color
		 */
		toString: function() {
			var properties = this._properties,
				parts = [],
				isGradient = this._type === 'gradient',
				f = Formatter.instance;
			for (var i = 0, l = properties.length; i < l; i++) {
				var value = this._components[i];
				if (value != null)
					parts.push(properties[i] + ': '
							+ (isGradient ? value : f.number(value)));
			}
			if (this._alpha != null)
				parts.push('alpha: ' + f.number(this._alpha));
			return '{ ' + parts.join(', ') + ' }';
		},

		/**
		 * @return {String} a css string representation of the color
		 */
		toCSS: function(noAlpha) {
			var components = this._convert('rgb'),
				alpha = noAlpha || this._alpha == null ? 1 : this._alpha;
			components = [
				Math.round(components[0] * 255),
				Math.round(components[1] * 255),
				Math.round(components[2] * 255)
			];
			if (alpha < 1)
				components.push(alpha);
			return (components.length == 4 ? 'rgba(' : 'rgb(')
					+ components.join(',') + ')';
		},

		toCanvasStyle: function(ctx, matrix) {
			if (this._canvasStyle)
				return this._canvasStyle;
			// Normal colors are simply represented by their css string.
			if (this._type !== 'gradient' && this._type !== 'pattern')
				return this._canvasStyle = this.toCSS();

			if(this._type === 'gradient'){
				// Gradient code form here onwards
				var components = this._components,
					// We need to counteract the matrix translation. The other
					// transformations will be handled by the matrix which was
					// applied to ctx.
					translation = matrix ? matrix.getTranslation() : new Point(),
					gradient = components[0],
					stops = gradient._stops,
					origin = components[1].subtract(translation),
					destination = components[2].subtract(translation),
					canvasGradient;
				if (gradient._radial) {
					var radius = destination.getDistance(origin),
						highlight = components[3];
					if (highlight) {
						var vector = highlight.subtract(translation).subtract(origin);
						if (vector.getLength() > radius)
							highlight = origin.add(vector.normalize(radius - 0.1));
					}
					var start = highlight || origin;
					canvasGradient = ctx.createRadialGradient(start.x, start.y,
							0, origin.x, origin.y, radius);
				} else {
					canvasGradient = ctx.createLinearGradient(origin.x, origin.y,
							destination.x, destination.y);
				}
				for (var i = 0, l = stops.length; i < l; i++) {
					var stop = stops[i];
					canvasGradient.addColorStop(stop._rampPoint,
							stop._color.toCanvasStyle());
				}
				return this._canvasStyle = canvasGradient;
			}
			else if (this._type === 'pattern') {
				var pattern = this._components[0],
						image;
		/*#*/ if (options.browser) {
				var that = this,
					// src can be an URL or a DOM ID to load the image from
					image = document.getElementById(pattern._url) || new Image();

				// IE has naturalWidth / Height defined, but width / height set to 0
				// when the image is invisible in the document.
				if (image.naturalWidth && image.naturalHeight) {
					// Fire load event delayed, so behavior is the same as when it's 
					// actually loaded and we give the code time to install event
					setTimeout(loaded, 0);
				} else {
					// Trigger the onLoad event on the image once it's loaded
					DomEvent.add(image, {
						load: function() {
							paper.view.draw();
						}
					});
					// A new image created above? Set the source now.
					if (!image.src)
						image.src = pattern._url;
				}
		/*#*/ } else if (options.node) {
				image = new Image();
				if(pattern._width)
					image.width = pattern._width
				if(pattern._height)
					image.height = pattern._height
				// If we're running on the server and it's a string,
				// check if it is a data URL
				if (/^data:/.test(pattern._url)) {
					image.src = pattern._url;
				} else {
					var fs = require('fs');
					image.src = fs.readFileSync(pattern._url);
				}
		/*#*/ } // options.node
				if(image.complete)
					return this._canvasStyle = ctx.createPattern(image, pattern._repeat);

				return null;
			}
		},

		/**
		 * Transform the gradient color by the specified matrix.
		 *
		 * @param {Matrix} matrix the matrix to transform the gradient color by
		 */
		transform: function(matrix) {
			if (this._type === 'gradient') {
				var components = this._components;
				for (var i = 1, l = components.length; i < l; i++) {
					var point = components[i];
					matrix._transformPoint(point, point, true);
				}
				this._changed();
			}
		},

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

		/**
		 * {@grouptitle Gradient Components}
		 *
		 * The gradient object describing the type of gradient and the stops.
		 *
		 * @name Color#gradient
		 * @property
		 * @type Gradient
		 */

		/* The origin point of the gradient.
		 *
		 * @name Color#origin
		 * @property
		 * @type Point
		 *
		 * @example {@paperscript height=200}
		 * // Move the origin point of the gradient, by moving your mouse over
		 * // the view below:
		 *
		 * // Create a rectangle shaped path with the same dimensions as
		 * // that of the view and fill it with a gradient color:
		 * var path = new Path.Rectangle(view.bounds);
		 * var gradient = new Gradient(['yellow', 'red', 'blue']);
		 *
		 * // Have the gradient color run from the top left point of the view,
		 * // to the bottom right point of the view:
		 * var from = view.bounds.topLeft;
		 * var to = view.bounds.bottomRight;
		 * var gradientColor = new Color(gradient, from, to);
		 * path.fillColor = gradientColor;
		 *
		 * function onMouseMove(event) {
		 * 	// Set the origin point of the path's gradient color
		 * 	// to the position of the mouse:
		 * 	path.fillColor.origin = event.point;
		 * }
		 */

		/*
		 * The destination point of the gradient.
		 *
		 * @name Color#destination
		 * @property
		 * @type Point
		 *
		 * @example {@paperscript height=300}
		 * // Move the destination point of the gradient, by moving your mouse over
		 * // the view below:
		 *
		 * // Create a circle shaped path at the center of the view,
		 * // using 40% of the height of the view as its radius
		 * // and fill it with a radial gradient color:
		 * var path = new Path.Circle({
		 * 	center: view.center,
		 * 	radius: view.bounds.height * 0.4
		 * });
		 *
		 * var gradient = new Gradient(['yellow', 'red', 'black'], true);
		 * var from = view.center;
		 * var to = view.bounds.bottomRight;
		 * var gradientColor = new Color(gradient, from, to);
		 * path.fillColor = gradientColor;
		 *
		 * function onMouseMove(event) {
		 * 	// Set the origin point of the path's gradient color
		 * 	// to the position of the mouse:
		 * 	path.fillColor.destination = event.point;
		 * }
		 */

		/**
		 * The highlight point of the gradient.
		 *
		 * @name Color#highlight
		 * @property
		 * @type Point
		 *
		 * @example {@paperscript height=300}
		 * // Create a circle shaped path at the center of the view,
		 * // using 40% of the height of the view as its radius
		 * // and fill it with a radial gradient color:
		 * var path = new Path.Circle({
		 * 	center: view.center,
		 * 	radius: view.bounds.height * 0.4
		 * });
		 * 
		 * path.fillColor = {
		 * 	gradient: {
		 * 		stops: ['yellow', 'red', 'black'],
		 * 		radial: true
		 * 	},
		 * 	origin: path.position,
		 * 	destination: path.bounds.rightCenter
		 * };
		 * 
		 * function onMouseMove(event) {
		 * 	// Set the origin highlight of the path's gradient color
		 * 	// to the position of the mouse:
		 * 	path.fillColor.highlight = event.point;
		 * }
		 */

		statics: /** @lends Color */{
			// Export for backward compatibility code below.
			_types: types,

			random: function() {
				var random = Math.random;
				return new Color(random(), random(), random());
			}
		}
	});
}, new function() {
	function clamp(value, hue) {
		return value < 0
				? 0
				: hue && value > 360
					? 360
					: !hue && value > 1
						? 1
						: value;
	}

	var operators = {
		add: function(a, b, hue) {
			return clamp(a + b, hue);
		},

		subtract: function(a, b, hue) {
			return clamp(a - b, hue);
		},

		multiply: function(a, b, hue) {
			return clamp(a * b, hue);
		},

		divide: function(a, b, hue) {
			return clamp(a / b, hue);
		}
	};

	return Base.each(operators, function(operator, name) {
		// Tell the argument reader not to parse values for multiply and divide,
		// so the are not clamped yet.
		var options = { dontParse: /^(multiply|divide)$/.test(name) };

		this[name] = function(color) {
			color = Color.read(arguments, 0, 0, options);
			var type = this._type,
				properties = this._properties,
				components1 = this._components,
				components2 = color._convert(type);
			for (var i = 0, l = components1.length; i < l; i++)
				components2[i] = operator(components1[i], components2[i],
						properties[i] === 'hue');
			return new Color(type, components2,
					this._alpha != null
							? operator(this._alpha, color.getAlpha())
							: null);
		};
	}, /** @lends Color# */{
		/**
		 * Returns the addition of the supplied value to both coordinates of
		 * the color as a new color.
		 * The object itself is not modified!
		 *
		 * @name Color#add
		 * @function
		 * @operator
		 * @param {Number} number the number to add
		 * @return {Color} the addition of the color and the value as a new color
		 *
		 * @example
		 * var color = new Color(0.5, 1, 1);
		 * var result = color + 1;
		 * console.log(result); // { red: 1, blue: 1, green: 1 }
		 */
		/**
		 * Returns the addition of the supplied color to the color as a new
		 * color.
		 * The object itself is not modified!
		 *
		 * @name Color#add
		 * @function
		 * @operator
		 * @param {Color} color the color to add
		 * @return {Color} the addition of the two colors as a new color
		 *
		 * @example
		 * var color1 = new Color(0, 1, 1);
		 * var color2 = new Color(1, 0, 0);
		 * var result = color1 + color2;
		 * console.log(result); // { red: 1, blue: 1, green: 1 }
		 */
		/**
		 * Returns the subtraction of the supplied value to both coordinates of
		 * the color as a new color.
		 * The object itself is not modified!
		 *
		 * @name Color#subtract
		 * @function
		 * @operator
		 * @param {Number} number the number to subtract
		 * @return {Color} the subtraction of the color and the value as a new
		 *         color
		 *
		 * @example
		 * var color = new Color(0.5, 1, 1);
		 * var result = color - 1;
		 * console.log(result); // { red: 0, blue: 0, green: 0 }
		 */
		/**
		 * Returns the subtraction of the supplied color to the color as a new
		 * color.
		 * The object itself is not modified!
		 *
		 * @name Color#subtract
		 * @function
		 * @operator
		 * @param {Color} color the color to subtract
		 * @return {Color} the subtraction of the two colors as a new color
		 *
		 * @example
		 * var color1 = new Color(0, 1, 1);
		 * var color2 = new Color(1, 0, 0);
		 * var result = color1 - color2;
		 * console.log(result); // { red: 0, blue: 1, green: 1 }
		 */
		/**
		 * Returns the multiplication of the supplied value to both coordinates
		 * of the color as a new color.
		 * The object itself is not modified!
		 *
		 * @name Color#multiply
		 * @function
		 * @operator
		 * @param {Number} number the number to multiply
		 * @return {Color} the multiplication of the color and the value as a
		 *         new color
		 *
		 * @example
		 * var color = new Color(0.5, 1, 1);
		 * var result = color * 0.5;
		 * console.log(result); // { red: 0.25, blue: 0.5, green: 0.5 }
		 */
		/**
		 * Returns the multiplication of the supplied color to the color as a
		 * new color.
		 * The object itself is not modified!
		 *
		 * @name Color#multiply
		 * @function
		 * @operator
		 * @param {Color} color the color to multiply
		 * @return {Color} the multiplication of the two colors as a new color
		 *
		 * @example
		 * var color1 = new Color(0, 1, 1);
		 * var color2 = new Color(0.5, 0, 0.5);
		 * var result = color1 * color2;
		 * console.log(result); // { red: 0, blue: 0, green: 0.5 }
		 */
		/**
		 * Returns the division of the supplied value to both coordinates of
		 * the color as a new color.
		 * The object itself is not modified!
		 *
		 * @name Color#divide
		 * @function
		 * @operator
		 * @param {Number} number the number to divide
		 * @return {Color} the division of the color and the value as a new
		 *         color
		 *
		 * @example
		 * var color = new Color(0.5, 1, 1);
		 * var result = color / 2;
		 * console.log(result); // { red: 0.25, blue: 0.5, green: 0.5 }
		 */
		/**
		 * Returns the division of the supplied color to the color as a new
		 * color.
		 * The object itself is not modified!
		 *
		 * @name Color#divide
		 * @function
		 * @operator
		 * @param {Color} color the color to divide
		 * @return {Color} the division of the two colors as a new color
		 *
		 * @example
		 * var color1 = new Color(0, 1, 1);
		 * var color2 = new Color(0.5, 0, 0.5);
		 * var result = color1 / color2;
		 * console.log(result); // { red: 0, blue: 0, green: 1 }
		 */
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
	});
});

// Expose Color.RGB, etc. constructors, as well as RgbColor, RGBColor, etc.for
// backward compatibility.
Base.each(Color._types, function(properties, type) {
	var ctor = this[Base.capitalize(type) + 'Color'] = function(arg) {
			var argType = arg != null && typeof arg,
				components = argType === 'object' && arg.length != null
					? arg
					: argType === 'string'
						? null
						: arguments;
			return components
					? new Color(type, components)
					: new Color(arg);
		};
	if (type.length == 3) {
		var acronym = type.toUpperCase();
		Color[acronym] = this[acronym + 'Color'] = ctor;
	}
}, Base.exports);
