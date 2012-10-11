/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name GradientColor
 *
 * @class The GradientColor object.
 */
var GradientColor = this.GradientColor = Color.extend(/** @lends GradientColor# */{

	/**
	 * Creates a gradient color object.
	 *
	 * @param {Gradient} gradient
	 * @param {Point} origin
	 * @param {Point} destination
	 * @param {Point} [hilite]
	 *
	 * @example {@paperscript height=200}
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
	 * // Create the gradient, passing it an array of colors to be converted
	 * // to evenly distributed color stops:
	 * var gradient = new Gradient(['yellow', 'red', 'blue']);
	 *
	 * // Have the gradient color run between the topLeft and
	 * // bottomRight points we defined earlier:
	 * var gradientColor = new GradientColor(gradient, topLeft, bottomRight);
	 *
	 * // Set the fill color of the path to the gradient color:
	 * path.fillColor = gradientColor;
	 *
	 * @example {@paperscript height=200}
	 * // Applying a radial gradient color containing unevenly distributed
	 * // color stops:
	 *
	 * // Create a circle shaped path at the center of the view
	 * // with a radius of 80:
	 * var path = new Path.Circle(view.center, 80);
	 *
	 * // The stops array: yellow mixes with red between 0 and 15%,
	 * // 15% to 30% is pure red, red mixes with black between 30% to 100%:
	 * var stops = [['yellow', 0], ['red', 0.15], ['red', 0.3], ['black', 0.9]];
	 *
	 * // Create a radial gradient using the color stops array:
	 * var gradient = new Gradient(stops, 'radial');
	 *
	 * // We will use the center point of the circle shaped path as
	 * // the origin point for our gradient color
	 * var from = path.position;
	 *
	 * // The destination point of the gradient color will be the
	 * // center point of the path + 80pt in horizontal direction:
	 * var to = path.position + [80, 0];
	 *
	 * // Create the gradient color:
	 * var gradientColor = new GradientColor(gradient, from, to);
	 *
	 * // Set the fill color of the path to the gradient color:
	 * path.fillColor = gradientColor;
	 */
	initialize: function(gradient, origin, destination, hilite) {
		this.gradient = gradient || new Gradient();
		this.gradient._addOwner(this);
		this.setOrigin(origin);
		this.setDestination(destination);
		if (hilite)
			this.setHilite(hilite);
	},

	/**
	 * @return {GradientColor} a copy of the gradient color
	 */
	clone: function() {
		return new GradientColor(this.gradient, this._origin, this._destination,
				this._hilite);
	},

	/**
	 * The origin point of the gradient.
	 *
	 * @type Point
	 * @bean
	 *
	 * @example {@paperscript height=200}
	 * // Move the origin point of the gradient, by moving your mouse over
	 * // the view below:
	 *
	 * // Create a rectangle shaped path with the same dimensions as
	 * // that of the view and fill it with a gradient color:
	 * var path = new Path.Rectangle(view.bounds);
	 * var gradient = new Gradient(['yellow', 'red', 'blue']);
	 *
	 * // Have the gradient color run from the top left point of the view,
	 * // to the bottom right point of the view:
	 * var from = view.bounds.topLeft;
	 * var to = view.bounds.bottomRight;
	 * var gradientColor = new GradientColor(gradient, from, to);
	 * path.fillColor = gradientColor;
	 *
	 * function onMouseMove(event) {
	 * 	// Set the origin point of the path's gradient color
	 * 	// to the position of the mouse:
	 * 	path.fillColor.origin = event.point;
	 * }
	 *
	 */
	getOrigin: function() {
		return this._origin;
	},

	setOrigin: function(origin) {
		// PORT: Add origin cloning to Scriptographer
		origin = Point.read(arguments, 0, 0, true); // clone
		this._origin = origin;
		if (this._destination)
			this._radius = this._destination.getDistance(this._origin);
		this._changed();
		return this;
	},

	/**
	 * The destination point of the gradient.
	 *
	 * @type Point
	 * @bean
	 *
	 * @example {@paperscript height=300}
	 * // Move the destination point of the gradient, by moving your mouse over
	 * // the view below:
	 *
	 * // Create a circle shaped path at the center of the view,
	 * // using 40% of the height of the view as its radius
	 * // and fill it with a radial gradient color:
	 * var path = new Path.Circle(view.center, view.bounds.height * 0.4);
	 *
	 * var gradient = new Gradient(['yellow', 'red', 'black'], 'radial');
	 * var from = view.center;
	 * var to = view.bounds.bottomRight;
	 * var gradientColor = new GradientColor(gradient, from, to);
	 * path.fillColor = gradientColor;
	 *
	 * function onMouseMove(event) {
	 * 	// Set the origin point of the path's gradient color
	 * 	// to the position of the mouse:
	 * 	path.fillColor.destination = event.point;
	 * }
	 */
	getDestination: function() {
		return this._destination;
	},

	setDestination: function(destination) {
		// PORT: Add destination cloning to Scriptographer
		destination = Point.read(arguments, 0, 0, true); // clone
		this._destination = destination;
		this._radius = this._destination.getDistance(this._origin);
		this._changed();
		return this;
	},

	/**
	 * The hilite point of the gradient.
	 *
	 * @type Point
	 * @bean
	 *
	 * @example {@paperscript height=300}
	 * // Move the hilite point of the gradient, by moving your mouse over
	 * // the view below:
	 *
	 * // Create a circle shaped path at the center of the view,
	 * // using 40% of the height of the view as its radius
	 * // and fill it with a radial gradient color:
	 * var path = new Path.Circle(view.center, view.bounds.height * 0.4);
	 * var gradient = new Gradient(['yellow', 'red', 'black'], 'radial');
	 * var from = path.position;
	 * var to = path.bounds.rightCenter;
	 * var gradientColor = new GradientColor(gradient, from, to);
	 * path.fillColor = gradientColor;
	 *
	 * function onMouseMove(event) {
	 * 	// Set the origin hilite of the path's gradient color
	 * 	// to the position of the mouse:
	 * 	path.fillColor.hilite = event.point;
	 * }
	 */
	getHilite: function() {
		return this._hilite;
	},

	setHilite: function(hilite) {
		// PORT: Add hilite cloning to Scriptographer
		hilite = Point.read(arguments, 0, 0, true); // clone
		var vector = hilite.subtract(this._origin);
		if (vector.getLength() > this._radius) {
			this._hilite = this._origin.add(
					vector.normalize(this._radius - 0.1));
		} else {
			this._hilite = hilite;
		}
		this._changed();
		return this;
	},

	getCanvasStyle: function(ctx) {
		var gradient;
		if (this.gradient.type === 'linear') {
			gradient = ctx.createLinearGradient(this._origin.x, this._origin.y,
					this._destination.x, this._destination.y);
		} else {
			var origin = this._hilite || this._origin;
			gradient = ctx.createRadialGradient(origin.x, origin.y,
					0, this._origin.x, this._origin.y, this._radius);
		}
		for (var i = 0, l = this.gradient._stops.length; i < l; i++) {
			var stop = this.gradient._stops[i];
			gradient.addColorStop(stop._rampPoint, stop._color.toCssString());
		}
		return gradient;
	},

	/**
	 * Checks if the gradient color has the same properties as that of the
	 * supplied one.
	 *
	 * @param {GradientColor} color
	 * @return {@true the GradientColor is the same}
	 */
	equals: function(color) {
		return color == this || color && color._colorType === this._colorType
				&& this.gradient.equals(color.gradient)
				&& this._origin.equals(color._origin)
				&& this._destination.equals(color._destination);
	},

	/**
	 * Transform the gradient color by the specified matrix.
	 *
	 * @param {Matrix} matrix the matrix to transform the gradient color by
	 */
	transform: function(matrix) {
		matrix._transformPoint(this._origin, this._origin, true);
		matrix._transformPoint(this._destination, this._destination, true);
		if (this._hilite)
			matrix._transformPoint(this._hilite, this._hilite, true);
		this._radius = this._destination.getDistance(this._origin);
	}
});

