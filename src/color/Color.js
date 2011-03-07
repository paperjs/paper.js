/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * All rights reserved. See LICENSE file for details.
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
		if (alpha < 0) this._alpha = 0;
		else if (alpha > 1) this._alpha = 1;
		else this._alpha = alpha;
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
});
