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

var GradientStop = this.GradientStop = Base.extend({
	beans: true,

	// TODO: support midPoint? (initial tests didn't look nice)
	initialize: function(color, rampPoint) {
		this.setColor(color);
		this.setRampPoint(rampPoint);
	},

	getRampPoint: function() {
		return this._rampPoint;
	},

	setRampPoint: function(rampPoint) {
		this._rampPoint = rampPoint !== null ? rampPoint : 0;
	},

	getColor: function() {
		return this._color;
	},

	setColor: function() {
		this._color = Color.read(arguments);
	}
});
