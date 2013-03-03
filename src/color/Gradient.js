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
 */
var Gradient = this.Gradient = Base.extend(/** @lends Gradient# */{
	initialize: function(stops, _type) {
		// Keep supporting the old way of creating gradients for the time being.
		if (this.constructor === Gradient)
			return new (_type === 'radial' ? RadialGradient : LinearGradient)(
					stops);
		// Define this Gradient's unique id.
		this._id = ++Base._uid;
		this.setStops((arguments.length > 1 ? arguments : stops)
				|| ['white', 'black']);
	},

	_serialize: function(options, dictionary) {
		return dictionary.add(this, function() {
			return Base.serialize([this._type, this._stops],
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
	 * Called by GradientColor#initialize
	 * This is required to pass on _changed() notifications to the _owners.
	 */
	_addOwner: function(color) {
		if (!this._owners)
			this._owners = [];
		this._owners.push(color);
	},

	// TODO: Where and when should this be called:
	/**
	 * Called by GradientColor whenever this gradient stops being used.
	 */
	_removeOwner: function(color) {
		var index = this._owners ? this._owners.indexOf(color) : -1;
		if (index != -1) {
			this._owners.splice(index, 1);
			if (this._owners.length == 0)
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
		return this;
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

/**
 * @name LinearGradient
 *
 * @class The LinearGradient object.
 */
var LinearGradient = this.LinearGradient = Gradient.extend(/** @lends LinearGradient# */{
	_type: 'LinearGradient'

	/**
	 * Creates a linear gradient object
	 *
	 * @name LinearGradient#initialize
	 * @param {GradientStop[]} stops
	 */
});

/**
 * @name RadialGradient
 *
 * @class The RadialGradient object.
 */
var RadialGradient = this.RadialGradient = Gradient.extend(/** @lends RadialGradient# */{
	_type: 'RadialGradient'

	/**
	 * Creates a radial gradient object
	 *
	 * @name RadialGradient#initialize
	 * @param {GradientStop[]} stops
	 */
});
