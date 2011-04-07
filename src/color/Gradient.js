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

var Gradient = this.Gradient = Base.extend({
	beans: true,

	// Todo: should type here be called 'radial' and have it
	// receive a boolean value?
	initialize: function(stops, type) {
		if(!stops) {
			stops = [new GradientStop('white', 0),
					new GradientStop('black', 1)];
		}
		this.setStops(stops);
		this.type = type ? type : 'linear';
	},

	getStops: function() {
		return this._stops;
	},

	setStops: function(stops) {
		if (stops.length < 2)
			throw new Error(
					'Gradient stop list needs to contain at least two stops.');
		if(!(stops[0] instanceof GradientStop)) {
			for(var i = 0, l = stops.length; i < l; i++) {
				var midPoint;
				var stop = stops[i];
				// If it is an array, the second argument is the midPoint:
				if(stop.length) {
					midPoint = stop[1];
					stop = stop[0];
				} else {
				// Otherwise stops is an array of colors, and we need to
				// calculate the midPoint:
					midPoint = i / (l - 1);
				}
				stops[i] = new GradientStop(stop, midPoint);
			}
		}
		this._stops = stops;
	}
});
