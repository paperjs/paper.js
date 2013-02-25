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
 * @name CompoundPath
 *
 * @class A compound path contains two or more paths, holes are drawn
 * where the paths overlap. All the paths in a compound path take on the
 * style of the backmost path and can be accessed through its
 * {@link Item#children} list.
 *
 * @extends PathItem
 */
var CompoundPath = this.CompoundPath = PathItem.extend(/** @lends CompoundPath# */{
	_type: 'compoundpath',
	/**
	 * Creates a new compound path item and places it in the active layer.
	 *
	 * @param {Path[]} [paths] the paths to place within the compound path.
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
	 */
	initialize: function(arg) {
		this.base();
		// CompoundPath has children and supports named children.
		this._children = [];
		this._namedChildren = {};
		if (!this._set(arg))
			this.addChildren(Array.isArray(arg) ? arg : arguments);
	},

	insertChild: function(index, item, _cloning) {
		// Only allow the insertion of paths
		if (item._type !== 'path')
			return null;
		item = this.base(index, item);
		// All children except for the bottom one (first one in list) are set
		// to anti-clockwise orientation, so that they appear as holes, but
		// only if their orientation was not already specified before
		// (= _clockwise is defined).
		if (!_cloning && item && item._clockwise === undefined)
			item.setClockwise(item._index == 0);
		return item;
	},

	/**
	 * If this is a compound path with only one path inside,
	 * the path is moved outside and the compound path is erased.
	 * Otherwise, the compound path is returned unmodified.
	 *
	 * @return {CompoundPath|Path} the flattened compound path
	 */
	reduce: function() {
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

	/**
	 * The first Segment contained within the path.
	 *
	 * @type Segment
	 * @bean
	 */
	getFirstSegment: function() {
		var first = this.getFirstChild();
		return first && first.getFirstSegment();
	},

	/**
	 * The last Segment contained within the path.
	 *
	 * @type Segment
	 * @bean
	 */
	getLastSegment: function() {
		var last = this.getLastChild();
		return last && last.getLastSegment();
	},

	/**
	 * All the curves contained within the compound-path, from all its child
	 * {@link Path} items.
	 *
	 * @type Curve[]
	 * @bean
	 */
	getCurves: function() {
		var curves = [];
		for (var i = 0, l = this._children.length; i < l; i++)
			curves = curves.concat(this._children[i].getCurves());
		return curves;
	},

	/**
	 * The first Curve contained within the path.
	 *
	 * @type Curve
	 * @bean
	 */
	getFirstCurve: function() {
		var first = this.getFirstChild();
		return first && first.getFirstCurve();
	},

	/**
	 * The last Curve contained within the path.
	 *
	 * @type Curve
	 * @bean
	 */
	getLastCurve: function() {
		var last = this.getLastChild();
		return last && last.getFirstCurve();
	},

	/**
	 * A private method to help with both #contains() and #_hitTest().
	 */
	_contains: function(point) {
		// Compound-paths are a little complex: Due to the even-odd rule, in
		// order to determine wether a point is inside a path or not, we need to
		// check all the children and count how many intersect. If it's an odd
		// number, the point is inside the path. Once we know we're inside the
		// path, _hitTest also needs access to the first intersecting element, 
		// so we return a list here.
		point = Point.read(arguments);
		var children = [];
		for (var i = 0, l = this._children.length; i < l; i++) {
			var child = this._children[i];
			if (child.contains(point))
				children.push(child);
		}
		return (children.length & 1) == 1 && children;
	},

	contains: function(point) {
		return !!this._contains(point);
	},

	_hitTest: function(point, options) {
		var res = this.base(point, Base.merge(options, { fill: false }));
		if (!res && options.fill && this._style._fillColor) {
			res = this._contains(point);
			res = res ? new HitResult('fill', res[0]) : null;
		}
		return res;
	},

	draw: function(ctx, param) {
		var children = this._children,
			style = this._style;
		// Return early if the compound path doesn't have any children:
		if (children.length == 0)
			return;
		ctx.beginPath();
		param.compound = true;
		for (var i = 0, l = children.length; i < l; i++)
			Item.draw(children[i], ctx, param);
		param.compound = false;
		if (this._clipMask) {
			ctx.clip();
		} else {
			this._setStyles(ctx);
			if (style._fillColor)
				ctx.fill();
			if (style._strokeColor)
				ctx.stroke();
		}
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
