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
var CompoundPath = PathItem.extend(/** @lends CompoundPath# */{
	_class: 'CompoundPath',
	_serializeFields: {
		children: []
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
	/**
	 * Creates a new compound path item from an object description and places it
	 * at the top of the active layer.
	 *
	 * @name CompoundPath#initialize
	 * @param {Object} object an object literal containing properties to
	 * be set on the path
	 * @return {CompoundPath} the newly created path
	 *
	 * @example {@paperscript}
	 * var path = new CompoundPath({
	 * 	children: [
	 * 		new Path.Circle({
	 * 			center: new Point(50, 50),
	 * 			radius: 30
	 * 		}),
	 * 		new Path.Circle({
	 * 			center: new Point(50, 50),
	 * 			radius: 10
	 * 		})
	 * 	],
	 * 	fillColor: 'black',
	 * 	selected: true
	 * });
	 */
	/**
	 * Creates a new compound path item from SVG path-data and places it at the
	 * top of the active layer.
	 *
	 * @name CompoundPath#initialize
	 * @param {String} pathData the SVG path-data that describes the geometry
	 * of this path.
	 * @return {CompoundPath} the newly created path
	 *
	 * @example {@paperscript}
	 * var pathData = 'M20,50c0,-16.56854 13.43146,-30 30,-30c16.56854,0 30,13.43146 30,30c0,16.56854 -13.43146,30 -30,30c-16.56854,0 -30,-13.43146 -30,-30z M50,60c5.52285,0 10,-4.47715 10,-10c0,-5.52285 -4.47715,-10 -10,-10c-5.52285,0 -10,4.47715 -10,10c0,5.52285 4.47715,10 10,10z';
	 * var path = new CompoundPath(pathData);
	 * path.fillColor = 'black';
	 */
	initialize: function CompoundPath(arg) {
		// CompoundPath has children and supports named children.
		this._children = [];
		this._namedChildren = {};
		if (!this._initialize(arg)) {
			if (typeof arg === 'string') {
				this.setPathData(arg);
			} else {
				this.addChildren(Array.isArray(arg) ? arg : arguments);
			}
		}
	},

	_changed: function _changed(flags) {
		_changed.base.call(this, flags);
		// Clear cached native Path
		if (flags & (/*#=*/ ChangeFlag.HIERARCHY | /*#=*/ ChangeFlag.GEOMETRY))
			this._currentPath = undefined;
	},

	insertChildren: function insertChildren(index, items, _preserve) {
		// Pass on 'path' for _type, to make sure that only paths are added as
		// children.
		items = insertChildren.base.call(this, index, items, _preserve, 'path');
		// All children except for the bottom one (first one in list) are set
		// to anti-clockwise orientation, so that they appear as holes, but
		// only if their orientation was not already specified before
		// (= _clockwise is defined).
		for (var i = 0, l = !_preserve && items && items.length; i < l; i++) {
			var item = items[i];
			if (item._clockwise === undefined)
				item.setClockwise(item._index === 0);
		}
		return items;
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

	_getWinding: function(point) {
		var children =  this._children,
			winding = 0;
		for (var i = 0, l = children.length; i < l; i++)
			winding += children[i]._getWinding(point);
		return winding;
	},

	_getChildHitTestOptions: function(options) {
		// If we're not specifically asked to returns paths through
		// options.type == 'path' do not test children for fill, since a
		// compound path forms one shape.
		return options.type === 'path'
				? options
				: new Base(options, { fill: false });
	},

	_draw: function(ctx, param) {
		var children = this._children;
		// Return early if the compound path doesn't have any children:
		if (children.length === 0)
			return;

		if (this._currentPath) {
			ctx.currentPath = this._currentPath;
		} else {
			ctx.beginPath();
			param = param.extend({ compound: true });
			for (var i = 0, l = children.length; i < l; i++)
				children[i].draw(ctx, param);
			this._currentPath = ctx.currentPath;
		}

		if (!param.clip) {
			this._setStyles(ctx);
			var style = this._style;
			if (style.hasFill()) {
				ctx.fill(style.getWindingRule());
				ctx.shadowColor = 'rgba(0,0,0,0)';
			}
			if (style.hasStroke())
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
		moveTo: function(/* point */) {
			var path = new Path();
			this.addChild(path);
			path.moveTo.apply(path, arguments);
		},

		moveBy: function(/* point */) {
			this.moveTo(getCurrentPath(this).getLastSegment()._point.add(
					Point.read(arguments)));
		},

		closePath: function() {
			getCurrentPath(this).closePath();
		}
	};

	// Redirect all other drawing commands to the current path
	Base.each(['lineTo', 'cubicCurveTo', 'quadraticCurveTo', 'curveTo', 'arcTo',
			'lineBy', 'cubicCurveBy', 'quadraticCurveBy', 'curveBy', 'arcBy'],
			function(key) {
				fields[key] = function() {
					var path = getCurrentPath(this);
					path[key].apply(path, arguments);
				};
			}
	);

	return fields;
});
