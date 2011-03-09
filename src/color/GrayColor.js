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

var GrayColor = this.GrayColor = Color.extend({
	beans: true,

	_colorType: 'gray',
	_components: ['gray', 'alpha'],

	/**
	 * A value between 0 and 1 that specifies the amount of gray in the gray
	 * color.
	 */
	getGray: function() {
		return this._gray;
	},

	setGray: function(value) {
		this._cssString = null;
		// this._gray = Math.min(Math.max(value, 0), 1);
		this._gray = value < 0 ? 0 : value > 1 ? 1 : value;
		return this;
	}
});
