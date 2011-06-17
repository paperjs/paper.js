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
			this.addChild(path);
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
			child.insertAbove(this);
			this.remove();
			return child;
		}
		return this;
	},

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
	/**
	 * Helper method that returns the current path and checks if a moveTo()
	 * command is required first.
	 */
	function getCurrentPath(that) {
		if (!that._children.length)
			throw new Error('Use a moveTo() command first');
		return that._children[that._children.length - 1];
	}

	var fields = {
		// Note: Documentation for these methods is found in PathItem, as they
		// are considered abstract methods of PathItem and need to be defined in
		// all implementing classes.
		moveTo: function(point) {
			var path = new Path();
			this.addChild(path);
			path.moveTo.apply(path, arguments);
		},

		moveBy: function(point) {
			this.moveTo(getCurrentPath(this).getLastSegment()._point.add(
					Point.read(arguments)));
		},

		closePath: function() {
			getCurrentPath(this).setClosed(true);
		}
	};

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
