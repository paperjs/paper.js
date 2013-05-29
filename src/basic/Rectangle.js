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
 * @name Rectangle
 *
 * @class A Rectangle specifies an area that is enclosed by it's top-left
 * point (x, y), its width, and its height. It should not be confused with a
 * rectangular path, it is not an item.
 */
var Rectangle = Base.extend(/** @lends Rectangle# */{
	// Tell Base.read that the Rectangle constructor supports reading with index
	_readIndex: true,

	/**
	 * Creates a Rectangle object.
	 *
	 * @name Rectangle#initialize
	 * @param {Point} point the top-left point of the rectangle
	 * @param {Size} size the size of the rectangle
	 */
	/**
	 * Creates a Rectangle object.
	 *
	 * @name Rectangle#initialize
	 * @param {Object} object An object literal containing properties to be
	 * set on the rectangle.
	 * 
	 * @example // Create a rectangle between {x: 20, y: 20} and {x: 80, y:80}
	 * var rectangle = new Rectangle({
	 * 	point: [20, 20],
	 * 	size: [60, 60]
	 * });
	 * 
	 * @example // Create a rectangle between {x: 20, y: 20} and {x: 80, y:80}
	 * var rectangle = new Rectangle({
	 * 	from: [20, 20],
	 * 	to: [80, 80]
	 * });
	 */
	/**
	 * Creates a rectangle object.
	 *
	 * @name Rectangle#initialize
	 * @param {Number} x the left coordinate
	 * @param {Number} y the top coordinate
	 * @param {Number} width
	 * @param {Number} height
	 */
	/**
	 * Creates a rectangle object from the passed points. These do not
	 * necessarily need to be the top left and bottom right corners, the
	 * constructor figures out how to fit a rectangle between them.
	 *
	 * @name Rectangle#initialize
	 * @param {Point} from The first point defining the rectangle
	 * @param {Point} to The second point defining the rectangle
	 */
	/**
	 * Creates a new rectangle object from the passed rectangle object.
	 *
	 * @name Rectangle#initialize
	 * @param {Rectangle} rt
	 */
	initialize: function Rectangle(arg0, arg1, arg2, arg3) {
		var type = typeof arg0,
			read = 0;
		if (type === 'number') {
			// new Rectangle(x, y, width, height)
			this.x = arg0;
			this.y = arg1;
			this.width = arg2;
			this.height = arg3;
			read = 4;
		} else if (type === 'undefined' || arg0 === null) {
			// new Rectangle(), new Rectangle(null)
			this.x = this.y = this.width = this.height = 0;
			read = arg0 === null ? 1 : 0;
		} else if (arguments.length === 1) {
			// This can either be an array, or an object literal.
			if (Array.isArray(arg0)) {
				this.x = arg0[0];
				this.y = arg0[1];
				this.width = arg0[2];
				this.height = arg0[3];
				read = 1;
			} else if (arg0.x !== undefined || arg0.width !== undefined) {
				// Another rectangle or a simple object literal
				// describing one. Use duck typing, and 0 as defaults.
				this.x = arg0.x || 0;
				this.y = arg0.y || 0;
				this.width = arg0.width || 0;
				this.height = arg0.height || 0;
				read = 1;
			} else if (arg0.from === undefined && arg0.to === undefined) {
				// Use #_set to support whatever property the rectangle can
				// take, but handle from/to separately below.
				this.x = this.y = this.width = this.height = 0;
				this._set(arg0);
				read = 1;
			}
		}
		if (!read) {
			// Read a point argument and look at the next value to see wether
			// it's a size or a point, then read accordingly.
			// We're supporting both reading from a normal arguments list and
			// covering the Rectangle({ from: , to: }) constructor, through
			// Point.readNamed().
			var point = Point.readNamed(arguments, 'from'),
				next = Base.peek(arguments);
			this.x = point.x;
			this.y = point.y;
			if (next && next.x !== undefined || Base.hasNamed(arguments, 'to')) {
				// new Rectangle(from, to)
				// Read above why we can use readNamed() to cover both cases.
				var to = Point.readNamed(arguments, 'to');
				this.width = to.x - point.x;
				this.height = to.y - point.y;
				// Check if horizontal or vertical order needs to be reversed.
				if (this.width < 0) {
					this.x = to.x;
					this.width = -this.width;
				}
				if (this.height < 0) {
					this.y = to.y;
					this.height = -this.height;
				}
			} else {
				// new Rectangle(point, size)
				var size = Size.read(arguments);
				this.width = size.width;
				this.height = size.height;
			}
			read = arguments._index;
		}
		if (this._read)
			this._read = read;
	},

	/**
	 * The x position of the rectangle.
	 *
	 * @name Rectangle#x
	 * @type Number
	 */

	/**
	 * The y position of the rectangle.
	 *
	 * @name Rectangle#y
	 * @type Number
	 */

	/**
	 * The width of the rectangle.
	 *
	 * @name Rectangle#width
	 * @type Number
	 */

	/**
	 * The height of the rectangle.
	 *
	 * @name Rectangle#height
	 * @type Number
	 */

	// DOCS: Why does jsdocs document this function, when there are no comments?
	/**
	 * @ignore
	 */
	set: function(x, y, width, height) {
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
		return this;
	},

	/**
	 * Returns a copy of the rectangle.
	 */
	clone: function() {
		return new Rectangle(this.x, this.y, this.width, this.height);
	},

	/**
	 * Checks whether the coordinates and size of the rectangle are equal to
	 * that of the supplied rectangle.
	 *
	 * @param {Rectangle} rect
	 * @return {Boolean} {@true if the rectangles are equal}
	 */
	equals: function(rect) {
		rect = Rectangle.read(arguments);
		return this.x == rect.x && this.y == rect.y
				&& this.width == rect.width && this.height == rect.height;
	},

	/**
	 * @return {String} A string representation of this rectangle.
	 */
	toString: function() {
		var f = Formatter.instance;
		return '{ x: ' + f.number(this.x)
				+ ', y: ' + f.number(this.y)
				+ ', width: ' + f.number(this.width)
				+ ', height: ' + f.number(this.height)
				+ ' }';
	},

	_serialize: function(options) {
		var f = options.formatter;
		// See Point#_serialize()
		return [f.number(this.x),
				f.number(this.y),
				f.number(this.width),
				f.number(this.height)];
	},

	/**
	 * The top-left point of the rectangle
	 *
	 * @type Point
	 * @bean
	 */
	getPoint: function(/* dontLink */) {
		// Pass on the optional argument _dontLink which tells LinkedPoint to
		// produce a normal point instead. Used internally for speed reasons.
		return LinkedPoint.create(this, 'setPoint', this.x, this.y, arguments[0]);
	},

	setPoint: function(point) {
		point = Point.read(arguments);
		this.x = point.x;
		this.y = point.y;
	},


	/**
	 * The size of the rectangle
	 *
	 * @type Size
	 * @bean
	 */
	getSize: function(/* dontLink */) {
		return LinkedSize.create(this, 'setSize', this.width, this.height,
				arguments[0]);
	},

	setSize: function(size) {
		size = Size.read(arguments);
		this.width = size.width;
		this.height = size.height;
	},

	/**
	 * {@grouptitle Side Positions}
	 *
	 * The position of the left hand side of the rectangle. Note that this
	 * doesn't move the whole rectangle; the right hand side stays where it was.
	 *
	 * @type Number
	 * @bean
	 */
	getLeft: function() {
		return this.x;
	},

	setLeft: function(left) {
		this.width -= left - this.x;
		this.x = left;
	},

	/**
	 * The top coordinate of the rectangle. Note that this doesn't move the
	 * whole rectangle: the bottom won't move.
	 *
	 * @type Number
	 * @bean
	 */
	getTop: function() {
		return this.y;
	},

	setTop: function(top) {
		this.height -= top - this.y;
		this.y = top;
	},

	/**
	 * The position of the right hand side of the rectangle. Note that this
	 * doesn't move the whole rectangle; the left hand side stays where it was.
	 *
	 * @type Number
	 * @bean
	 */
	getRight: function() {
		return this.x + this.width;
	},

	setRight: function(right) {
		this.width = right - this.x;
	},

	/**
	 * The bottom coordinate of the rectangle. Note that this doesn't move the
	 * whole rectangle: the top won't move.
	 *
	 * @type Number
	 * @bean
	 */
	getBottom: function() {
		return this.y + this.height;
	},

	setBottom: function(bottom) {
		this.height = bottom - this.y;
	},

	/**
	 * The center-x coordinate of the rectangle.
	 *
	 * @type Number
	 * @bean
	 * @ignore
	 */
	getCenterX: function() {
		return this.x + this.width * 0.5;
	},

	setCenterX: function(x) {
		this.x = x - this.width * 0.5;
	},

	/**
	 * The center-y coordinate of the rectangle.
	 *
	 * @type Number
	 * @bean
	 * @ignore
	 */
	getCenterY: function() {
		return this.y + this.height * 0.5;
	},

	setCenterY: function(y) {
		this.y = y - this.height * 0.5;
	},

	/**
	 * {@grouptitle Corner and Center Point Positions}
	 *
	 * The center point of the rectangle.
	 *
	 * @type Point
	 * @bean
	 */
	getCenter: function(/* dontLink */) {
		return LinkedPoint.create(this, 'setCenter',
				this.getCenterX(), this.getCenterY(), arguments[0]);
	},

	setCenter: function(point) {
		point = Point.read(arguments);
		this.setCenterX(point.x);
		this.setCenterY(point.y);
		// A special setter where we allow chaining, because it comes in handy
		// in a couple of places in core.
		return this;
	},

	/**
	 * The top-left point of the rectangle.
	 *
	 * @name Rectangle#topLeft
	 * @type Point
	 */

	/**
	 * The top-right point of the rectangle.
	 *
	 * @name Rectangle#topRight
	 * @type Point
	 */

	/**
	 * The bottom-left point of the rectangle.
	 *
	 * @name Rectangle#bottomLeft
	 * @type Point
	 */

	/**
	 * The bottom-right point of the rectangle.
	 *
	 * @name Rectangle#bottomRight
	 * @type Point
	 */

	/**
	 * The left-center point of the rectangle.
	 *
	 * @name Rectangle#leftCenter
	 * @type Point
	 */

	/**
	 * The top-center point of the rectangle.
	 *
	 * @name Rectangle#topCenter
	 * @type Point
	 */

	/**
	 * The right-center point of the rectangle.
	 *
	 * @name Rectangle#rightCenter
	 * @type Point
	 */

	/**
	 * The bottom-center point of the rectangle.
	 *
	 * @name Rectangle#bottomCenter
	 * @type Point
	 */

	/**
	 * @return {Boolean} {@true the rectangle is empty}
	 */
	isEmpty: function() {
		return this.width == 0 || this.height == 0;
	},

	/**
	 * {@grouptitle Geometric Tests}
	 *
	 * Tests if the specified point is inside the boundary of the rectangle.
	 *
	 * @name Rectangle#contains
	 * @function
	 * @param {Point} point the specified point
	 * @return {Boolean} {@true if the point is inside the rectangle's boundary}
	 *
	 * @example {@paperscript}
	 * // Checking whether the mouse position falls within the bounding
	 * // rectangle of an item:
	 *
	 * // Create a circle shaped path at {x: 80, y: 50}
	 * // with a radius of 30.
	 * var circle = new Path.Circle(new Point(80, 50), 30);
	 * circle.fillColor = 'red';
	 *
	 * function onMouseMove(event) {
	 * 	// Check whether the mouse position intersects with the
	 * 	// bounding box of the item:
	 * 	if (circle.bounds.contains(event.point)) {
	 * 		// If it intersects, fill it with green:
	 * 		circle.fillColor = 'green';
	 * 	} else {
	 * 		// If it doesn't intersect, fill it with red:
	 * 		circle.fillColor = 'red';
	 * 	}
	 * }
	 */
	/**
	 * Tests if the interior of the rectangle entirely contains the specified
	 * rectangle.
	 *
	 * @name Rectangle#contains
	 * @function
	 * @param {Rectangle} rect The specified rectangle
	 * @return {Boolean} {@true if the rectangle entirely contains the specified
	 *                   rectangle}
	 *
	 * @example {@paperscript}
	 * // Checking whether the bounding box of one item is contained within
	 * // that of another item:
	 *
	 * // All newly created paths will inherit these styles:
	 * project.currentStyle = {
	 * 	fillColor: 'green',
	 * 	strokeColor: 'black'
	 * };
	 *
	 * // Create a circle shaped path at {x: 80, y: 50}
	 * // with a radius of 45.
	 * var largeCircle = new Path.Circle(new Point(80, 50), 45);
	 *
	 * // Create a smaller circle shaped path in the same position
	 * // with a radius of 30.
	 * var circle = new Path.Circle(new Point(80, 50), 30);
	 *
	 * function onMouseMove(event) {
	 * 	// Move the circle to the position of the mouse:
	 * 	circle.position = event.point;
	 *
	 * 	// Check whether the bounding box of the smaller circle
	 * 	// is contained within the bounding box of the larger item:
	 * 	if (largeCircle.bounds.contains(circle.bounds)) {
	 * 		// If it does, fill it with green:
	 * 		circle.fillColor = 'green';
	 * 		largeCircle.fillColor = 'green';
	 * 	} else {
	 * 		// If doesn't, fill it with red:
	 * 		circle.fillColor = 'red';
	 * 		largeCircle.fillColor = 'red';
	 * 	}
	 * }
	 */
	contains: function(arg) {
		// Detect rectangles either by checking for 'width' on the passed object
		// or by looking at the amount of elements in the arguments list,
		// or the passed array:
		return arg && arg.width !== undefined
				|| (Array.isArray(arg) ? arg : arguments).length == 4
				? this._containsRectangle(Rectangle.read(arguments))
				: this._containsPoint(Point.read(arguments));
	},

	_containsPoint: function(point) {
		var x = point.x,
			y = point.y;
		return x >= this.x && y >= this.y
				&& x <= this.x + this.width
				&& y <= this.y + this.height;
	},

	_containsRectangle: function(rect) {
		var x = rect.x,
			y = rect.y;
		return x >= this.x && y >= this.y
				&& x + rect.width <= this.x + this.width
				&& y + rect.height <= this.y + this.height;
	},

	/**
	 * Tests if the interior of this rectangle intersects the interior of
	 * another rectangle. Rectangles just touching each other are considered
	 * as non-intersecting.
	 *
	 * @param {Rectangle} rect the specified rectangle
	 * @return {Boolean} {@true if the rectangle and the specified rectangle
	 *                   intersect each other}
	 *
	 * @example {@paperscript}
	 * // Checking whether the bounding box of one item intersects with
	 * // that of another item:
	 *
	 * // All newly created paths will inherit these styles:
	 * project.currentStyle = {
	 * 	fillColor: 'green',
	 * 	strokeColor: 'black'
	 * };
	 *
	 * // Create a circle shaped path at {x: 80, y: 50}
	 * // with a radius of 45.
	 * var largeCircle = new Path.Circle(new Point(80, 50), 45);
	 *
	 * // Create a smaller circle shaped path in the same position
	 * // with a radius of 30.
	 * var circle = new Path.Circle(new Point(80, 50), 30);
	 *
	 * function onMouseMove(event) {
	 * 	// Move the circle to the position of the mouse:
	 * 	circle.position = event.point;
	 *
	 * 	// Check whether the bounding box of the two circle
	 * 	// shaped paths intersect:
	 * 	if (largeCircle.bounds.intersects(circle.bounds)) {
	 * 		// If it does, fill it with green:
	 * 		circle.fillColor = 'green';
	 * 		largeCircle.fillColor = 'green';
	 * 	} else {
	 * 		// If doesn't, fill it with red:
	 * 		circle.fillColor = 'red';
	 * 		largeCircle.fillColor = 'red';
	 * 	}
	 * }
	 */
	intersects: function(rect) {
		rect = Rectangle.read(arguments);
		return rect.x + rect.width > this.x
				&& rect.y + rect.height > this.y
				&& rect.x < this.x + this.width
				&& rect.y < this.y + this.height;
	},

	touches: function(rect) {
		rect = Rectangle.read(arguments);
		return rect.x + rect.width >= this.x
				&& rect.y + rect.height >= this.y
				&& rect.x <= this.x + this.width
				&& rect.y <= this.y + this.height;
	},

	/**
	 * {@grouptitle Boolean Operations}
	 *
	 * Returns a new rectangle representing the intersection of this rectangle
	 * with the specified rectangle.
	 *
	 * @param {Rectangle} rect The rectangle to be intersected with this
	 *                         rectangle
	 * @return {Rectangle} The largest rectangle contained in both the specified
	 *                     rectangle and in this rectangle.
	 *
	 * @example {@paperscript}
	 * // Intersecting two rectangles and visualizing the result using rectangle
	 * // shaped paths:
	 *
	 * // Create two rectangles that overlap each other
	 * var size = new Size(50, 50);
	 * var rectangle1 = new Rectangle(new Point(25, 15), size);
	 * var rectangle2 = new Rectangle(new Point(50, 40), size);
	 *
	 * // The rectangle that represents the intersection of the
	 * // two rectangles:
	 * var intersected = rectangle1.intersect(rectangle2);
	 *
	 * // To visualize the intersecting of the rectangles, we will
	 * // create rectangle shaped paths using the Path.Rectangle
	 * // constructor.
	 *
	 * // Have all newly created paths inherit a black stroke:
	 * project.currentStyle.strokeColor = 'black';
	 *
	 * // Create two rectangle shaped paths using the abstract rectangles
	 * // we created before:
	 * new Path.Rectangle(rectangle1);
	 * new Path.Rectangle(rectangle2);
	 *
	 * // Create a path that represents the intersected rectangle,
	 * // and fill it with red:
	 * var intersectionPath = new Path.Rectangle(intersected);
	 * intersectionPath.fillColor = 'red';
	 */
	intersect: function(rect) {
		rect = Rectangle.read(arguments);
		var x1 = Math.max(this.x, rect.x),
			y1 = Math.max(this.y, rect.y),
			x2 = Math.min(this.x + this.width, rect.x + rect.width),
			y2 = Math.min(this.y + this.height, rect.y + rect.height);
		return new Rectangle(x1, y1, x2 - x1, y2 - y1);
	},

	/**
	 * Returns a new rectangle representing the union of this rectangle with the
	 * specified rectangle.
	 *
	 * @param {Rectangle} rect the rectangle to be combined with this rectangle
	 * @return {Rectangle} the smallest rectangle containing both the specified
	 *                     rectangle and this rectangle.
	 */
	unite: function(rect) {
		rect = Rectangle.read(arguments);
		var x1 = Math.min(this.x, rect.x),
			y1 = Math.min(this.y, rect.y),
			x2 = Math.max(this.x + this.width, rect.x + rect.width),
			y2 = Math.max(this.y + this.height, rect.y + rect.height);
		return new Rectangle(x1, y1, x2 - x1, y2 - y1);
	},

	/**
	 * Adds a point to this rectangle. The resulting rectangle is the
	 * smallest rectangle that contains both the original rectangle and the
	 * specified point.
	 *
	 * After adding a point, a call to {@link #contains(point)} with the added
	 * point as an argument does not necessarily return {@code true}.
	 * The {@link Rectangle#contains(point)} method does not return {@code true}
	 * for points on the right or bottom edges of a rectangle. Therefore, if the
	 * added point falls on the left or bottom edge of the enlarged rectangle,
	 * {@link Rectangle#contains(point)} returns {@code false} for that point.
	 *
	 * @param {Point} point
	 */
	include: function(point) {
		point = Point.read(arguments);
		var x1 = Math.min(this.x, point.x),
			y1 = Math.min(this.y, point.y),
			x2 = Math.max(this.x + this.width, point.x),
			y2 = Math.max(this.y + this.height, point.y);
		return new Rectangle(x1, y1, x2 - x1, y2 - y1);
	},

	/**
	 * Expands the rectangle by the specified amount in both horizontal and
	 * vertical directions.
	 *
	 * @name Rectangle#expand
	 * @function
	 * @param {Number} amount
	 */
	/**
	 * Expands the rectangle in horizontal direction by the specified
	 * {@code hor} amount and in vertical direction by the specified {@code ver}
	 * amount.
	 *
	 * @name Rectangle#expand^2
	 * @function
	 * @param {Number} hor
	 * @param {Number} ver
	 */
	expand: function(hor, ver) {
		if (ver === undefined)
			ver = hor;
		return new Rectangle(this.x - hor / 2, this.y - ver / 2,
				this.width + hor, this.height + ver);
	},

	/**
	 * Scales the rectangle by the specified amount from its center.
	 *
	 * @name Rectangle#scale
	 * @function
	 * @param {Number} amount
	 */
	/**
	 * Scales the rectangle in horizontal direction by the specified
	 * {@code hor} amount and in vertical direction by the specified {@code ver}
	 * amount from its center.
	 *
	 * @name Rectangle#scale^2
	 * @function
	 * @param {Number} hor
	 * @param {Number} ver
	 */
	scale: function(hor, ver) {
		return this.expand(this.width * hor - this.width,
				this.height * (ver === undefined ? hor : ver) - this.height);
	}
}, new function() {
	return Base.each([
			['Top', 'Left'], ['Top', 'Right'],
			['Bottom', 'Left'], ['Bottom', 'Right'],
			['Left', 'Center'], ['Top', 'Center'],
			['Right', 'Center'], ['Bottom', 'Center']
		],
		function(parts, index) {
			var part = parts.join('');
			// find out if the first of the pair is an x or y property,
			// by checking the first character for [R]ight or [L]eft;
			var xFirst = /^[RL]/.test(part);
			// Rename Center to CenterX or CenterY:
			if (index >= 4)
				parts[1] += xFirst ? 'Y' : 'X';
			var x = parts[xFirst ? 0 : 1],
				y = parts[xFirst ? 1 : 0],
				getX = 'get' + x,
				getY = 'get' + y,
				setX = 'set' + x,
				setY = 'set' + y,
				get = 'get' + part,
				set = 'set' + part;
			this[get] = function(/* dontLink */) {
				return LinkedPoint.create(this, set,
						this[getX](), this[getY](), arguments[0]);
			};
			this[set] = function(point) {
				point = Point.read(arguments);
				this[setX](point.x);
				this[setY](point.y);
			};
		}, {});
});

/**
 * @name LinkedRectangle
 *
 * @class An internal version of Rectangle that notifies its owner of each
 * change through setting itself again on the setter that corresponds to the
 * getter that produced this LinkedRectangle.
 * See uses of LinkedRectangle.create()
 * Note: This prototype is not exported.
 *
 * @private
 */
var LinkedRectangle = Rectangle.extend({
	set: function(x, y, width, height, dontNotify) {
		this._x = x;
		this._y = y;
		this._width = width;
		this._height = height;
		if (!dontNotify)
			this._owner[this._setter](this);
		return this;
	},

	statics: {
		/**
		 * Provide a faster creator for Points out of two coordinates that
		 * does not rely on Point#initialize at all. This speeds up all math
		 * operations a lot.
		 *
		 * @ignore
		 */
		create: function(owner, setter, x, y, width, height) {
			var rect = Base.create(LinkedRectangle).set(x, y, width, height, true);
			rect._owner = owner;
			rect._setter = setter;
			return rect;
		}
	}
}, new function() {
	var proto = Rectangle.prototype;

	return Base.each(['x', 'y', 'width', 'height'], function(key) {
		var part = Base.capitalize(key);
		var internal = '_' + key;
		this['get' + part] = function() {
			return this[internal];
		};

		this['set' + part] = function(value) {
			this[internal] = value;
			// Check if this setter is called from another one which sets
			// _dontNotify, as it will notify itself
			if (!this._dontNotify)
				this._owner[this._setter](this);
		};
	}, Base.each(['Point', 'Size', 'Center',
			'Left', 'Top', 'Right', 'Bottom', 'CenterX', 'CenterY',
			'TopLeft', 'TopRight', 'BottomLeft', 'BottomRight',
			'LeftCenter', 'TopCenter', 'RightCenter', 'BottomCenter'],
		function(key) {
			var name = 'set' + key;
			this[name] = function(value) {
				// Make sure the above setters of x, y, width, height do not
				// each notify the owner, as we're going to take care of this
				// afterwards here, only once per change.
				this._dontNotify = true;
				proto[name].apply(this, arguments);
				delete this._dontNotify;
				this._owner[this._setter](this);
			};
		}, /** @lends Rectangle# */{
			/**
			 * {@grouptitle Item Bounds}
			 *
			 * Specifies whether an item's bounds are selected and will also
			 * mark the item as selected.
			 *
			 * Paper.js draws the visual bounds of selected items on top of your
			 * project. This can be useful for debugging.
			 *
			 * @type Boolean
			 * @default false
			 * @bean
			 */
			isSelected: function() {
				return this._owner._boundsSelected;
			},

			setSelected: function(selected) {
				var owner = this._owner;
				if (owner.setSelected) {
					owner._boundsSelected = selected;
					// Update the owner's selected state too, so the bounds
					// actually get drawn. When deselecting, take a path's  
					// _selectedSegmentState into account too, since it will
					// have to remain selected even when bounds are deselected
					owner.setSelected(selected || owner._selectedSegmentState > 0);
				}
			}
		})
	);
});
