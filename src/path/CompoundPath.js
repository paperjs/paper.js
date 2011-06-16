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

var CompoundPath = this.CompoundPath = PathItem.extend({
	/** @lends CompoundPath# */

	/**
	 * Creates a new compound path item and places it in the active layer.
	 * 
	 * @constructs CompoundPath
	 * @param {Array} [paths] the paths to place within the compound path.
	 * 
	 * @example {@paperscript}
	 * // Create a circle shaped path with a hole in it:
	 * var circle = new Path.Circle(new Point(50, 50), 30);
	 * var innerCircle = new Path.Circle(new Point(50, 50), 10);
	 * var compoundPath = new CompoundPath([circle, innerCircle]);
	 * compoundPath.fillColor = 'red';
	 * 
	 * // Move the inner circle 5pt to the right:
	 * compoundPath.children[1].position.x += 5;
	 * 
	 * @class A compound path contains two or more paths, holes are drawn
	 * where the paths overlap. All the paths in a compound path take on the
	 * style of the backmost path and can be accessed through its
	 * {@link Item#children} list.
	 * 
	 * @extends PathItem
	 */
	initialize: function(paths) {
		this.base();
		this._children = [];
		// Do not reassign to paths, since arguments would get modified, which
		// we potentially use as array, depending on what is passed.
		var items = !paths || !Array.isArray(paths)
				|| typeof paths[0] !== 'object' ? arguments : paths;
		for (var i = 0, l = items.length; i < l; i++) {
			var path = items[i];
			// All paths except for the top one (last one in list) are set to
			// clockwise orientation when creating a compound path, so that they
			// appear as holes, but only if their orientation was not already
			// specified before (= _clockwise is defined).
			// TODO: Should this be handled in appendTop / Bottom instead?
			if (path._clockwise === undefined)
				path.setClockwise(i < l - 1);
			this.appendTop(path);
		}
	},

	/**
	 * If this is a compound path with only one path inside,
	 * the path is moved outside and the compound path is erased.
	 * Otherwise, the compound path is returned unmodified.
	 * 
	 * @return {CompoundPath|Path} the simplified compound path
	 */
	simplify: function() {
		if (this._children.length == 1) {
			var child = this._children[0];
			child.moveAbove(this);
			this.remove();
			return child;
		}
		return this;
	},

	/**
	 * Smooth bezier curves without changing the amount of segments or their
	 * points, by only smoothing and adjusting their handle points, for both
	 * open ended and closed paths.
	 * 
	 * @author Oleg V. Polikarpotchkin
	 */
	smooth: function() {
		for (var i = 0, l = this._children.length; i < l; i++)
			this._children[i].smooth();
	},

	draw: function(ctx, param) {
		var firstChild = this._children[0];
		ctx.beginPath();
		param.compound = true;
		for (var i = 0, l = this._children.length; i < l; i++)
			Item.draw(this._children[i], ctx, param);
		firstChild._setStyles(ctx);
		var fillColor = firstChild.getFillColor(),
			strokeColor = firstChild.getStrokeColor();
		if (fillColor) {
			ctx.fillStyle = fillColor.getCanvasStyle(ctx);
			ctx.fill();
		}
		if (strokeColor) {
			ctx.strokeStyle = strokeColor.getCanvasStyle(ctx);
			ctx.stroke();
		}
		param.compound = false;
	}
}, new function() { // Injection scope for PostScript-like drawing functions
	function getCurrentPath(that) {
		if (!that._children.length)
			throw new Error('Use a moveTo() command first');
		return that._children[that._children.length - 1];
	}

	var fields = {
		/** @lends CompoundPath# */

		/**
		 * {@grouptitle Postscript Style Drawing Commands}
		 * 
		 * Creates a new path in the compound-path and adds the point
		 * as its first segment.
		 * 
		 * @param {Point} point
		 */
		moveTo: function(point) {
			var path = new Path();
			this.appendTop(path);
			path.moveTo.apply(path, arguments);
		},

		/**
		 * Creates a new path in the compound-path and adds the point as its
		 * first segment relative to the position of the last segment of the
		 * current path.
		 * 
		 * @param {Point} point
		 */
		moveBy: function(point) {
			this.moveTo(getCurrentPath(this).getLastSegment()._point.add(
					Point.read(arguments)));
		},

		/**
		 * Closes the path. If it is closed, Paper.js connects the first and
		 * last segments.
		 */
		closePath: function() {
			getCurrentPath(this).setClosed(true);
		}
	};

	// DOCS: document CompoundPath#lineTo
	/**
	 * @name CompoundPath#lineTo
	 * @function
	 * @param {Point} point
	 */

	/**
	 * Adds a cubic bezier curve to the current path, defined by two handles and
	 * a to point.
	 * 
	 * @name CompoundPath#cubicCurveTo
	 * @function
	 * @param {Point} handle1
	 * @param {Point} handle2
	 * @param {Point} to
	 */

	/**
	 * Adds a quadratic bezier curve to the current path, defined by a handle
	 * and a to point.
	 * 
	 * @name CompoundPath#quadraticCurveTo
	 * @function
	 * @param {Point} handle
	 * @param {Point} to
	 */

	// DOCS: document CompoundPath#curveTo
	/**
	 * @name CompoundPath#curveTo
	 * @function
	 * @param {Point} through
	 * @param {Point} to
	 * @param {Number} [parameter=0.5]
	 */

	// DOCS: document CompoundPath#arcTo
	/**
	 * @name CompoundPath#arcTo
	 * @function
	 * @param {Point} to
	 * @param {Boolean} [clockwise=true]
	 */

	// DOCS: document CompoundPath#lineBy
	/**
	 * @name CompoundPath#lineBy
	 * @function
	 * @param {Point} vector
	 */

	// DOCS: document CompoundPath#curveBy
	/**
	 * @name CompoundPath#curveBy
	 * @function
	 * @param {Point} throughVector
	 * @param {Point} toVector
	 * @param {Number} [parameter=0.5]
	 */
	
	// DOCS: document CompoundPath#arcBy
	/**
	 * @name CompoundPath#arcBy
	 * @function
	 * @param {Point} throughVector
	 * @param {Point} toVector
	 */

	// DOCS: document CompoundPath#lineTo, CompoundPath#cubicCurveTo etc
	// Redirect all other drawing commands to the current path
	Base.each(['lineTo', 'cubicCurveTo', 'quadraticCurveTo', 'curveTo',
			'arcTo', 'lineBy', 'curveBy', 'arcBy'], function(key) {
		fields[key] = function() {
			var path = getCurrentPath(this);
			path[key].apply(path, arguments);
		};
	});

	return fields;
});
