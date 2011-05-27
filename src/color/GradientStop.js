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

// TODO: Support midPoint? (initial tests didn't look nice)
var GradientStop = this.GradientStop = Base.extend({
	/** @lends GradientStop# */

	beans: true,

	/**
	 * Creates a GradientStop object.
	 * 
	 * @param {Color} [color=new RGBColor(0, 0, 0)] the color of the stop
	 * @param {Number} [rampPoint=0] the position of the stop on the gradient
	 *                               ramp {@default 0}
	 * @constructs GradientStop
	 * 
	 * @class The GradientStop object.
	 */
	initialize: function(arg0, arg1) {
		if (arg1 === undefined && Array.isArray(arg0)) {
			// [color, rampPoint]
			this.setColor(arg0[0]);
			this.setRampPoint(arg0[1]);
		} else if (arg0.color) {
			// stop
			this.setColor(arg0.color);
			this.setRampPoint(arg0.rampPoint);
		} else {
			// color [, rampPoint]
			this.setColor(arg0);
			this.setRampPoint(arg1);
		}
	},

	/**
	 * @return {GradientColor} a copy of the gradient-stop
	 */
	clone: function() {
		return new GradientStop(this._color.clone(), this._rampPoint);
	},

	/**
	 * The ramp-point of the gradient stop as a value between 0 and 1.
	 * 
	 * @type Number
	 * @bean
	 */
	getRampPoint: function() {
		return this._rampPoint;
	},

	setRampPoint: function(rampPoint) {
		this._defaultRamp = rampPoint == null;
		this._rampPoint = rampPoint || 0;
	},

	/**
	 * The color of the gradient stop.
	 * 
	 * @type Color
	 * @bean
	 */
	getColor: function() {
		return this._color;
	},

	setColor: function(color) {
		this._color = Color.read(arguments);
	},

	equals: function(stop) {
		return stop == this || stop instanceof GradientStop
				&& this._color.equals(stop._color)
				&& this._rampPoint == stop._rampPoint;
	}
});
