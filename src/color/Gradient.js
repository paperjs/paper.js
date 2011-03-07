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

var Gradient = this.Gradient = Base.extend({
	beans: true,

	initialize: function() {
		this.setStops([
				new GradientStop('white', 0),
				new GradientStop('black', 1)]);
		this.type = 'linear';
	},

	getStops: function() {
		return this._stops;
	},

	setStops: function(stops) {
		if (stops.length < 2)
			throw new Error(
					'Gradient stop list needs to contain at least two stops.');
		this._stops = stops;
	}
});
