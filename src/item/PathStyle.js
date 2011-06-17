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

var PathStyle = this.PathStyle = Base.extend(new function() {
	/** @lends PathStyle# */

	// windingRule / resolution / fillOverprint / strokeOverprint are currently
	// not supported. The full list of properties would be:
	//	['windingRule', 'resolution', 'strokeColor', 'strokeWidth',
	//		'strokeCap', 'strokeJoin', 'miterLimit', 'dashOffset','dashArray',
	//		'strokeOverprint', 'fillColor', 'fillOverprint'],
	var keys = ['strokeColor', 'strokeWidth', 'strokeCap', 'strokeJoin',
				'miterLimit', 'dashOffset','dashArray', 'fillColor'];

	var strokeFlags = {
		strokeWidth: true,
		strokeCap: true,
		strokeJoin: true,
		miterLimit: true
	};

	var fields = {
		// DOCS: why isn't the example code showing up?
		/**
		 * PathStyle objects don't need to be created directly. Just pass an
		 * object to {@link Item#style} or {@link Project#currentStyle}, it will
		 * be converted to a PathStyle object internally.
		 * 
		 * @constructs PathStyle
		 * @param {object} style
		 * 
		 * @class PathStyle is used for changing the visual styles of items
		 * contained within a Paper.js project and is returned by
		 * {@link Item#style} and {@link Project#currentStyle}.
		 * 
		 * All properties of PathStyle are also reflected directly in {@link Item},
		 * i.e.: {@link Item#fillColor}.
		 * 
		 * To set multiple style properties in one go, you can pass an object to
		 * {@link Item#style}. This is a convenient way to define a style once and
		 * apply it to a series of items:
		 * 
		 * @classexample {@paperscript}
		 * var circleStyle = {
		 * 	fillColor: new RGBColor(1, 0, 0),
		 * 	strokeColor: 'black',
		 * 	strokeWidth: 5
		 * };
		 * 
		 * var path = new Path.Circle(new Point(80, 50), 30);
		 * path.style = circleStyle;
		 */
		initialize: function(style) {
			// If the passed style object is a PathStyle, clone its clonable
			// fields rather than simply copying them.
			var clone = style instanceof PathStyle;
			// Note: This relies on bean getters and setters that get implicetly
			// called when getting from style[key] and setting on this[key].
			for (var i = 0, l = style && keys.length; i < l; i++) {
				var key = keys[i],
					value = style[key];
				if (value !== undefined) {
					this[key] = value && clone && value.clone
							? value.clone() : value;
				}
			}
		},

		statics: {
			create: function(item) {
				var style = new PathStyle(PathStyle.dont);
				style._item = item;
				return style;
			}
		}
	};

	Item.inject(Base.each(keys, function(key) {
		var isColor = !!key.match(/Color$/),
			part = Base.capitalize(key),
			set = 'set' + part,
			get = 'get' + part;

		fields[set] = function(value) {
			var children = this._item && this._item._children;
			value = isColor ? Color.read(arguments) : value;
			if (children) {
				for (var i = 0, l = children.length; i < l; i++)
					children[i]._style[set](value);
			} else {
				var old = this['_' + key];
				if (old != value && !(old && old.equals && old.equals(value))) {
					this['_' + key] = value;
					if (this._item) {
						this._item._changed(ChangeFlags.STYLE
							| (strokeFlags[key] ? ChangeFlags.STROKE : 0));
					}
				}
			}
			return this;
		};

		fields[get] = function() {
			var children = this._item && this._item._children,
				style;
			// If this item has children, walk through all of them and see if
			// they all have the same style.
			if (children) {
				for (var i = 0, l = children.length; i < l; i++) {
					var childStyle = children[i]._style[get]();
					if (!style) {
						style = childStyle;
					} else if (style != childStyle && !(style && style.equals
							&& style.equals(childStyle))) {
						// If there is another item with a different style,
						// the style is not defined:
						// PORT: Change this in Scriptographer
						// (currently returns null)
						return undefined;
					}
				}
				return style;
			} else {
				return this['_' + key];
			}
		};

		// Style-getters and setters for Item:
		// 'this' = the Base.each() side-car = the object that is returned from
		// Base.each and injected into Item above:
		this[set] = function(value) {
			this._style[set](value);
			return this;
		};

		this[get] = function() {
			return this._style[get]();
		};
	}, {}));

	return fields;
});

/**
 * {@grouptitle Stroke Style}
 * 
 * The color of the stroke.
 * 
 * @property
 * @name PathStyle#strokeColor
 * @type RGBColor|HSBColor|GrayColor
 * 
 * @example {@paperscript}
 * // Setting the stroke color of a path:
 * 
 * // Create a circle shaped path at { x: 80, y: 50 }
 * // with a radius of 35:
 * var circle = new Path.Circle(new Point(80, 50), 35);
 * 
 * // Set its stroke color to RGB red:
 * circle.strokeColor = new RGBColor(1, 0, 0);
 */

/**
 * The width of the stroke.
 * 
 * @property
 * @name PathStyle#strokeWidth
 * @default 1
 * @type Number
 * 
 * @example {@paperscript}
 * // Setting an item's stroke width:
 * 
 * // Create a circle shaped path at { x: 80, y: 50 }
 * // with a radius of 35:
 * var circle = new Path.Circle(new Point(80, 50), 35);
 * 
 * // Set its stroke color to black:
 * circle.strokeColor = 'black';
 * 
 * // Set its stroke width to 10:
 * circle.strokeWidth = 10;
 */

/**
 * The shape to be used at the end of open {@link Path} items, when they
 * have a stroke.
 * 
 * @property
 * @name Item#strokeCap
 * @default 'butt'
 * @type String('round', 'square', 'butt')
 * 
 * @example {@paperscript height=200}
 * // A look at the different stroke caps:
 * 
 * var line = new Path(new Point(80, 50), new Point(420, 50));
 * line.strokeColor = 'black';
 * line.strokeWidth = 20;
 * 
 * // Select the path, so we can see where the stroke is formed:
 * line.selected = true;
 * 
 * // Set the stroke cap of the line to be round:
 * line.strokeCap = 'round';
 * 
 * // Copy the path and set its stroke cap to be square:
 * var line2 = line.clone();
 * line2.position.y += 50;
 * line2.strokeCap = 'square';
 * 
 * // Make another copy and set its stroke cap to be butt:
 * var line2 = line.clone();
 * line2.position.y += 100;
 * line2.strokeCap = 'butt';
 */

/**
 * The shape to be used at the corners of paths when they have a stroke.
 * 
 * @property
 * @name PathStyle#strokeJoin
 * @default 'miter'
 * @type String ('miter', 'round', 'bevel')
 * 
 * @example {@paperscript height=120}
 * // A look at the different stroke joins:
 * var path = new Path();
 * path.add(new Point(80, 100));
 * path.add(new Point(120, 40));
 * path.add(new Point(160, 100));
 * path.strokeColor = 'black';
 * path.strokeWidth = 20;
 * 
 * // Select the path, so we can see where the stroke is formed:
 * path.selected = true;
 * 
 * var path2 = path.clone();
 * path2.position.x += path2.bounds.width * 1.5;
 * path2.strokeJoin = 'round';
 * 
 * var path3 = path2.clone();
 * path3.position.x += path3.bounds.width * 1.5;
 * path3.strokeJoin = 'bevel';
 */

/**
 * The dash offset of the stroke.
 * 
 * @property
 * @name PathStyle#dashOffset
 * @default 0
 * @type Number
 */

/**
 * Specifies an array containing the dash and gap lengths of the stroke.
 * 
 * @example {@paperscript}
 * var path = new Path.Circle(new Point(80, 50), 40);
 * path.strokeWidth = 2;
 * path.strokeColor = 'black';
 * 
 * // Set the dashed stroke to [10pt dash, 4pt gap]:
 * path.dashArray = [10, 4];
 * 
 * @property
 * @name PathStyle#dashArray
 * @default []
 * @type Array
 */

/**
 * The miter limit of the stroke.
 * When two line segments meet at a sharp angle and miter joins have been
 * specified for {@link #strokeJoin}, it is possible for the miter to extend
 * far beyond the {@link #strokeWidth} of the path. The miterLimit imposes a
 * limit on the ratio of the miter length to the {@link #strokeWidth}.
 * 
 * @property
 * @default 10
 * @name PathStyle#miterLimit
 * @type Number
 */

/**
 * {@grouptitle Fill Style}
 * 
 * The fill color.
 * 
 * @property
 * @name PathStyle#fillColor
 * @type RGBColor|HSBColor|GrayColor
 * 
 * @example {@paperscript}
 * // Setting the fill color of a path to red:
 * 
 * // Create a circle shaped path at { x: 80, y: 50 }
 * // with a radius of 35:
 * var circle = new Path.Circle(new Point(80, 50), 35);
 * 
 * // Set the fill color of the circle to RGB red:
 * circle.fillColor = new RGBColor(1, 0, 0);
 */