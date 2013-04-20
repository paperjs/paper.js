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
 * @name Style
 *
 * @class Style is used for changing the visual styles of items
 * contained within a Paper.js project and is returned by
 * {@link Item#style} and {@link Project#currentStyle}.
 *
 * All properties of Style are also reflected directly in {@link Item},
 * i.e.: {@link Item#fillColor}.
 *
 * To set multiple style properties in one go, you can pass an object to
 * {@link Item#style}. This is a convenient way to define a style once and
 * apply it to a series of items:
 *
 * @classexample {@paperscript}
 *
 * var path = new Path.Circle(new Point(80, 50), 30);
 * path.style = {
 * 	fillColor: new Color(1, 0, 0),
 * 	strokeColor: 'black',
 * 	strokeWidth: 5
 * };
 *
 * @classexample
 * var text = new PointText(new Point(50, 50));
 * text.content = 'Hello world.';
 * text.style = {
 * 	fontSize: 50,
 * 	fillColor: 'black',
 * };
 *
 * @classexample
 * var text = new PointText(new Point(0,0));
 * text.fillColor = 'black';
 * text.content = 'Hello world.';
 * text.justification = 'center';
 */
var Style = this.Style = Base.extend(new function() {
	// windingRule / resolution / fillOverprint / strokeOverprint are currently
	// not supported.
	var defaults = {
		// path styles
		fillColor: undefined,
		strokeColor: undefined,
		strokeWidth: 1,
		strokeCap: 'butt',
		strokeJoin: 'miter',
		miterLimit: 10,
		dashOffset: 0,
		dashArray: [],
		// character styles
		font: 'sans-serif',
		fontSize: 12,
		leading: null,
		// paragraph styles
		justification: 'left'
	};

	var flags = {
		strokeWidth: /*#=*/ Change.STROKE,
		strokeCap: /*#=*/ Change.STROKE,
		strokeJoin: /*#=*/ Change.STROKE,
		miterLimit: /*#=*/ Change.STROKE,
		font: /*#=*/ Change.GEOMETRY,
		fontSize: /*#=*/ Change.GEOMETRY,
		leading: /*#=*/ Change.GEOMETRY,
		justification: /*#=*/ Change.GEOMETRY
	};

	var item = {},
		fields = {
			_defaults: defaults,
			// Override default fillColor for text items
			_textDefaults: Base.merge(defaults, {
				fillColor: 'black'
			})
		};

	Base.each(defaults, function(value, key) {
		var isColor = /Color$/.test(key),
			part = Base.capitalize(key),
			flag = flags[key],
			set = 'set' + part,
			get = 'get' + part;

		// Define getters and setters to be injected into this class
		fields[set] = function(value) {
			var children = this._item && this._item._children;
			// Clone color objects since they reference their owner
			// value = isColor ? Color.read(arguments, 0, 0, true) : value;
			// Only unify styles on children of Groups, excluding CompoundPaths.
			if (children && children.length > 0
					&& this._item._type !== 'compound-path') {
				for (var i = 0, l = children.length; i < l; i++)
					children[i]._style[set](value);
			} else {
				var old = this._values[key];
				if (old === undefined || !Base.equals(old, value)) {
					if (isColor) {
						if (old)
							delete old._owner;
						if (value && value.constructor === Color)
							value._owner = this._item;
					}
					this._values[key] = value;
					// Notify the item of the style change STYLE is always set,
					// additional flags come from flags, as used for STROKE:
					if (this._item)
						this._item._changed(flag || /*#=*/ Change.STYLE);
				}
			}
		};

		fields[get] = function() {
			var value,
				children = this._item && this._item._children;
			// If this item has children, walk through all of them and see if
			// they all have the same style.
			if (!children || children.length === 0
					|| this._item._type === 'compound-path') {
				var value = this._values[key];
				if (value === undefined) {
					value = this._defaults[key];
					if (value && value.clone)
						value = value.clone();
					this._values[key] = value;
				} else if (isColor && !(value instanceof Color)) {
					this._values[key] = value = Color.read([value], 0, 0, true, true);
					if (value)
						value._owner = this._item;
				}
				return value;
			}
			for (var i = 0, l = children.length; i < l; i++) {
				var childValue = children[i]._style[get]();
				if (!value) {
					value = childValue;
				} else if (!Base.equals(value, childValue)) {
					// If there is another item with a different
					// style, the style is not defined:
					return undefined;
				}
			}
			return value;
		};

		// Inject style getters and setters into the Item class, which redirect
		// calls to the linked style object.
		item[get] = function() {
			return this._style[get]();
		};

		item[set] = function(value) {
			this._style[set](value);
		};
	});

	Item.inject(item);
	return fields;
}, /** @lends Style# */{
	initialize: function(style) {
		// Keep values in a separate object that we can iterate over.
		this._values = {};
		if (this._item instanceof TextItem)
			this._defaults = this._textDefaults;
		if (style) {
			// If the passed style object is also a Style, clone its clonable
			// fields rather than simply copying them.
			var isStyle = style instanceof Style,
				// Use the other stlyle's _values object for iteration
				values = isStyle ? style._values : style;
			for (var key in values) {
				if (key in this._defaults) {
					var value = values[key];
					// Delegate to setter, so Group styles work too.
					this[key] = value && isStyle && value.clone
							? value.clone() : value;
				}
			}
		}
	},

	getLeading: function() {
		// Override leading to return fontSize * 1.2 by default.
		var leading = this.base();
		return leading != null ? leading : this.getFontSize() * 1.2;
	},

	getFontStyle: function() {
		var size = this.getFontSize();
		return (/[a-z]/i.test(size) ? size + ' ' : size + 'px ')
				+ this.getFont();
	},

	statics: {
		create: function(item) {
			var style = Base.create(this);
			style._item = item;
			return style;
		}
	}

	// DOCS: why isn't the example code showing up?
	/**
	 * Style objects don't need to be created directly. Just pass an object to
	 * {@link Item#style} or {@link Project#currentStyle}, it will be converted
	 * to a Style object internally.
	 *
	 * @name Style#initialize
	 * @param {object} style
	 */

	/**
	 * {@grouptitle Stroke Style}
	 *
	 * The color of the stroke.
	 *
	 * @name Style#strokeColor
	 * @property
	 * @type Color
	 *
	 * @example {@paperscript}
	 * // Setting the stroke color of a path:
	 *
	 * // Create a circle shaped path at { x: 80, y: 50 }
	 * // with a radius of 35:
	 * var circle = new Path.Circle(new Point(80, 50), 35);
	 *
	 * // Set its stroke color to RGB red:
	 * circle.strokeColor = new Color(1, 0, 0);
	 */

	/**
	 * The width of the stroke.
	 *
	 * @name Style#strokeWidth
	 * @property
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
	 * @name Style#strokeCap
	 * @property
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
	 * @name Style#strokeJoin
	 * @property
	 * @default 'miter'
	 * @type String('miter', 'round', 'bevel')
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
	 * @name Style#dashOffset
	 * @property
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
	 * @name Style#dashArray
	 * @property
	 * @default []
	 * @type Array
	 */

	/**
	 * The miter limit of the stroke. When two line segments meet at a sharp
	 * angle and miter joins have been specified for {@link #strokeJoin}, it is
	 * possible for the miter to extend far beyond the {@link #strokeWidth} of
	 * the path. The miterLimit imposes a limit on the ratio of the miter length
	 * to the {@link #strokeWidth}.
	 *
	 * @name Style#miterLimit
	 * @property
	 * @default 10
	 * @type Number
	 */

	/**
	 * {@grouptitle Fill Style}
	 *
	 * The fill color.
	 *
	 * @name Style#fillColor
	 * @property
	 * @type Color
	 *
	 * @example {@paperscript}
	 * // Setting the fill color of a path to red:
	 *
	 * // Create a circle shaped path at { x: 80, y: 50 }
	 * // with a radius of 35:
	 * var circle = new Path.Circle(new Point(80, 50), 35);
	 *
	 * // Set the fill color of the circle to RGB red:
	 * circle.fillColor = new Color(1, 0, 0);
	 */

	/**
	 * {@grouptitle Character Style}
	 *
	 * The font to be used in text content.
	 *
	 * @name Style#font
	 * @default 'sans-serif'
	 * @type String
	 */

	/**
	 * The font size of text content, as {@Number} in pixels, or as {@String}
	 * with optional units {@code 'px'}, {@code 'pt'} and {@code 'em'}.
	 *
	 * @name Style#fontSize
	 * @default 10
	 * @type Number|String
	 */

	/**
	 * The text leading of text content.
	 *
	 * @name Style#leading
	 * @default fontSize * 1.2
	 * @type Number|String
	 */

	/**
	 * {@grouptitle Paragraph Style}
	 *
	 * The justification of text paragraphs.
	 *
	 * @name Style#justification
	 * @default 'left'
	 * @type String('left', 'right', 'center')
	 */
});
