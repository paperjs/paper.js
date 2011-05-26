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
	/** @lends Gradient# */

	beans: true,

	// TODO: Should type here be called 'radial' and have it
	// receive a boolean value?
	/**
	 * Creates a gradient object
	 * 
	 * @param {GradientStop[]} stops
	 * @param {string} [type='linear'] 'linear' or 'radial'
	 * @constructs Gradient
	 * 
	 * @class The Gradient object.
	 */
	initialize: function(stops, type) {
		this.setStops(stops || ['white', 'black']);
		this.type = type || 'linear';
	},

	/**
	 * @return {Gradient} a copy of the gradient
	 */
	clone: function() {
		var stops = [];
		for (var i = 0, l = this._stops.length; i < l; i++)
			stops[i] = this._stops[i].clone();
		return new Gradient(stops, this.type);
	},

	/**
	 * The gradient stops on the gradient ramp.
	 * 
	 * @type GradientStop[]
	 * @bean
	 */
	getStops: function() {
		return this._stops;
	},

	setStops: function(stops) {
		if (stops.length < 2)
			throw new Error(
					'Gradient stop list needs to contain at least two stops.');
		this._stops = GradientStop.readAll(stops);
		// Now reassign ramp points if they were not specified.
		for (var i = 0, l = this._stops.length; i < l; i++) {
			var stop = this._stops[i];
			if (stop._defaultRamp)
				stop.setRampPoint(i / (l - 1));
		}
	},

	/**
	 * Checks whether the gradient is equal to the supplied gradient.
	 *
	 * @param {Gradient} gradient
	 * @return {boolean} true if they are equal, false otherwise
	 */
	equals: function(gradient) {
		if (gradient.type != this.type)
			return false;
		if (this._stops.length == gradient._stops.length) {
			for (var i = 0, l = this._stops.length; i < l; i++) {
				if (!this._stops[i].equals(gradient._stops[i]))
					return false;
			}
			return true;
		}
		return false;
	}
});
