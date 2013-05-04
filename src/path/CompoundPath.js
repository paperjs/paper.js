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
	_class: 'CompoundPath',
	_serializeFields: {
		pathData: ''
	},

	/**
	 * Creates a new compound path item and places it in the active layer.
	 *
	 * @param {Path[]} [paths] the paths to place within the compound path.
	 *
	 * @example {@paperscript}
	 * // Create a circle shaped path with a hole in it:
	 * var circle = new Path.Circle({
	 * 	center: new Point(50, 50),
	 * 	radius: 30
	 * });
	 * 
	 * var innerCircle = new Path.Circle({
	 * 	center: new Point(50, 50),
	 * 	radius: 10
	 * });
	 * 
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
		if (arg && !this._set(arg))
			this.addChildren(Array.isArray(arg) ? arg : arguments);
	},

	insertChild: function(index, item, _preserve) {
		// Only allow the insertion of paths
		if (item._type !== 'path')
			return null;
		item = this.base(index, item);
		// All children except for the bottom one (first one in list) are set
		// to anti-clockwise orientation, so that they appear as holes, but
		// only if their orientation was not already specified before
		// (= _clockwise is defined).
		if (!_preserve && item && item._clockwise === undefined)
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

	/**
	 * Reverses the orientation of all nested paths.
	 */
	reverse: function() {
		var children = this._children;
		for (var i = 0, l = children.length; i < l; i++)
			children[i].reverse();
	},

	smooth: function() {
		for (var i = 0, l = this._children.length; i < l; i++)
			this._children[i].smooth();
	},

	/**
	 * Specifies whether the compound path is oriented clock-wise.
	 *
	 * @type Boolean
	 * @bean
	 */
	isClockwise: function() {
		var child = this.getFirstChild();
		return child && child.isClockwise();
	},

	setClockwise: function(clockwise) {
		if (this.isClockwise() != !!clockwise)
			this.reverse();
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
		var children = this._children,
			curves = [];
		for (var i = 0, l = children.length; i < l; i++)
			curves = curves.concat(children[i].getCurves());
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
	 * The area of the path in square points. Self-intersecting paths can
	 * contain sub-areas that cancel each other out.
	 *
	 * @type Number
	 * @bean
	 */
	getArea: function() {
		var children = this._children,
			area = 0;
		for (var i = 0, l = children.length; i < l; i++)
			area += children[i].getArea();
		return area;
	},

	getPathData: function(/* precision */) {
		var children = this._children,
			paths = [];
		for (var i = 0, l = children.length; i < l; i++)
			paths.push(children[i].getPathData(arguments[0]));
		return paths.join(' ');
	},

	/**
	 * A private method to help with both #contains() and #_hitTest().
	 * Instead of simply returning a boolean, it returns a children of all the
	 * children that contain the point. This is required by _hitTest(), and
	 * Item#contains() is prepared for such a result.
	 */
	_contains: function(point) {
		// Compound paths are a little complex: In order to determine wether a
		// point is inside a path or not due to the even-odd rule, we need to
		// check all the children and count how many intersect. If it's an odd
		// number, the point is inside the path. Once we know it's inside the
		// path, _hitTest also needs access to the first intersecting element, 
		// for the HitResult, so we collect and return a list here.
		var children = [];
		for (var i = 0, l = this._children.length; i < l; i++) {
			var child = this._children[i];
			if (child.contains(point))
				children.push(child);
		}
		return (children.length & 1) == 1 && children;
	},

	_hitTest: function(point, options) {
		var res = this.base(point, Base.merge(options, { fill: false }));
		if (!res && options.fill && this._style.getFillColor()) {
			res = this._contains(point);
			res = res ? new HitResult('fill', res[0]) : null;
		}
		return res;
	},

	_draw: function(ctx, param) {
		var children = this._children,
			style = this._style;
		// Return early if the compound path doesn't have any children:
		if (children.length === 0)
			return;
		ctx.beginPath();
		param.compound = true;
		for (var i = 0, l = children.length; i < l; i++)
			children[i].draw(ctx, param);
		param.compound = false;
		if (!param.clip) {
			this._setStyles(ctx);
			if (style.getFillColor())
				ctx.fill();
			if (style.getStrokeColor())
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
			getCurrentPath(this).closePath();
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
