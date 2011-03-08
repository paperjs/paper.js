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

	getCanvasStyle: function() {
		return this.toCssString();
	}
}, new function() {
	function colorToHsb(color) {
		var r = color.getRed(),
			g = color.getGreen(),
			b = color.getBlue(),
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
		return [hue * 360, saturation, brightness];
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
	
	return Base.each(
		['hue', 'saturation', 'brightness'],
		function(key, index) {
			this['get' + Base.capitalize(key)] = function() {
				return colorToHsb(this)[index];
			};
			this['set' + Base.capitalize(key)] = function(value) {
				var hsb = colorToHsb(this);
				hsb[index] = value;
				var rgb = hsbToRgb.apply(this, hsb);
				this.setRed(rgb[0]).setGreen(rgb[1]).setBlue(rgb[2]);
			};
		},
		{ beans: true }
	);
});