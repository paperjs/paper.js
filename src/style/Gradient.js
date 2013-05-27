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
 * @name Gradient
 *
 * @class The Gradient object.
 * 
 * @classexample {@paperscript height=300}
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
 * // Fill the path with a gradient of three evenly divided color stops
 * // that runs between the two points we defined earlier:
 * path.fillColor = {
 * 	gradient: {
 * 		stops: ['yellow', 'red', 'blue']
 * 	},
 * 	origin: topLeft,
 * 	destination: bottomRight
 * };
 * 
 * @classexample {@paperscript height=300}
 * // Create a circle shaped path at the center of the view,
 * // using 40% of the height of the view as its radius
 * // and fill it with a radial gradient color:
 * var path = new Path.Circle({
 * 	center: view.center,
 * 	radius: view.bounds.height * 0.4
 * });
 * 
 * // Fill the path with a radial gradient color with three stops:
 * // yellow from 0% to 5%, mix between red from 5% to 20%,
 * // mix between red and black from 20% to 100%:
 * path.fillColor = {
 * 	gradient: {
 * 		stops: [['yellow', 0.05], ['red', 0.2], ['black', 1]],
 * 		radial: true
 * 	},
 * 	origin: path.position,
 * 	destination: path.bounds.rightCenter
 * };
 */
var Gradient = Base.extend(/** @lends Gradient# */{
	// DOCS: Document #initialize()
	initialize: function Gradient(stops, radial) {
		// Define this Gradient's unique id.
		this._id = Gradient._id = (Gradient._id || 0) + 1;
		if (stops && this._set(stops))
			stops = radial = null;
		if (!this._stops)
			this.setStops(stops || ['white', 'black']);
		if (this._radial == null)
			// Support old string type argument and new radial boolean.
			this.setRadial(typeof radial === 'string' && radial === 'radial'
					|| radial || false);
	},

	_serialize: function(options, dictionary) {
		return dictionary.add(this, function() {
			return Base.serialize([this._stops, this._radial],
					options, true, dictionary);
		});
	},

	/**
	 * Called by various setters whenever a gradient value changes
	 */
	_changed: function() {
		// Loop through the gradient-colors that use this gradient and notify
		// them, so they can notify the items they belong to.
		for (var i = 0, l = this._owners && this._owners.length; i < l; i++)
			this._owners[i]._changed();
	},

	/**
	 * Called by Color#setGradient()
	 * This is required to pass on _changed() notifications to the _owners.
	 */
	_addOwner: function(color) {
		if (!this._owners)
			this._owners = [];
		this._owners.push(color);
	},

	/**
	 * Called by Color whenever this gradient stops being used.
	 */
	_removeOwner: function(color) {
		var index = this._owners ? this._owners.indexOf(color) : -1;
		if (index != -1) {
			this._owners.splice(index, 1);
			if (this._owners.length === 0)
				delete this._owners;
		}
	},

	/**
	 * @return {Gradient} a copy of the gradient
	 */
	clone: function() {
		var stops = [];
		for (var i = 0, l = this._stops.length; i < l; i++)
			stops[i] = this._stops[i].clone();
		return new this.constructor(stops);
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
		// If this gradient already contains stops, first remove
		// this gradient as their owner.
		if (this.stops) {
			for (var i = 0, l = this._stops.length; i < l; i++)
				delete this._stops[i]._owner;
		}
		if (stops.length < 2)
			throw new Error(
					'Gradient stop list needs to contain at least two stops.');
		this._stops = GradientStop.readAll(stops, 0, true); // clone
		// Now reassign ramp points if they were not specified.
		for (var i = 0, l = this._stops.length; i < l; i++) {
			var stop = this._stops[i];
			stop._owner = this;
			if (stop._defaultRamp)
				stop.setRampPoint(i / (l - 1));
		}
		this._changed();
	},

	/**
	 * Specifies whether the gradient is radial or linear.
	 *
	 * @type Boolean
	 * @bean
	 */
	getRadial: function() {
		return this._radial;
	},

	setRadial: function(radial) {
		this._radial = radial;
		this._changed();
	},

	/**
	 * Checks whether the gradient is equal to the supplied gradient.
	 *
	 * @param {Gradient} gradient
	 * @return {Boolean} {@true they are equal}
	 */
	equals: function(gradient) {
		if (gradient && gradient.constructor == this.constructor
				&& this._stops.length == gradient._stops.length) {
			for (var i = 0, l = this._stops.length; i < l; i++) {
				if (!this._stops[i].equals(gradient._stops[i]))
					return false;
			}
			return true;
		}
		return false;
	}
});
