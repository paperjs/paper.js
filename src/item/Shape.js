/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2014, Juerg Lehni & Jonathan Puckey
 * http://scratchdisk.com/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name Shape
 *
 * @class
 *
 * @extends Item
 */
var Shape = Item.extend(/** @lends Shape# */{
	_class: 'Shape',
	_applyMatrix: false,
	_canApplyMatrix: false,
	_boundsSelected: true,
	_serializeFields: {
		type: null,
		size: null,
		radius: null
	},

	initialize: function Shape(props) {
		this._initialize(props);
	},

	_equals: function(item) {
		return this._type === item._type
			&& this._size.equals(item._size)
			// Radius can be a number or size:
			&& Base.equals(this._radius, item._radius);
	},

	clone: function(insert) {
		var copy = new Shape(Item.NO_INSERT);
		copy.setType(this._type);
		copy.setSize(this._size);
		copy.setRadius(this._radius);
		return this._clone(copy, insert);
	},

	/**
	 * The type of shape of the item as a string.
	 *
	 * @type String('rectangle', 'circle', 'ellipse')
	 * @bean
	 */
	getType: function() {
		return this._type;
	},

	setType: function(type) {
		this._type = type;
	},

	/**
	 * @private
	 * @bean
	 * @deprecated use {@link #getType()} instead.
	 */
	getShape: '#getType',
	setShape: '#setType',

	/**
	 * The size of the shape.
	 *
	 * @type Size
	 * @bean
	 */
	getSize: function() {
		var size = this._size;
		return new LinkedSize(size.width, size.height, this, 'setSize');
	},

	setSize: function(/* size */) {
		var size = Size.read(arguments);
		if (!this._size) {
			// First time, e.g. whean reading from JSON...
			this._size = size.clone();
		} else if (!this._size.equals(size)) {
			var type = this._type,
				width = size.width,
				height = size.height;
			if (type === 'rectangle') {
				// Shrink radius accordingly
				var radius = Size.min(this._radius, size.divide(2));
				this._radius.set(radius.width, radius.height);
			} else if (type === 'circle') {
				// Use average of width and height as new size, then calculate
				// radius as a number from that:
				width = height = (width + height) / 2;
				this._radius = width / 2;
			} else if (type === 'ellipse') {
				// The radius is a size.
				this._radius.set(width / 2, height / 2);
			}
			this._size.set(width, height);
			this._changed(/*#=*/ Change.GEOMETRY);
		}
	},

	/**
	 * The radius of the shape, as a number if it is a circle, or a size object
	 * for ellipses and rounded rectangles.
	 *
	 * @type Number|Size
	 * @bean
	 */
	getRadius: function() {
		var rad = this._radius;
		return this._type === 'circle'
				? rad
				: new LinkedSize(rad.width, rad.height, this, 'setRadius');
	},

	setRadius: function(radius) {
		var type = this._type;
		if (type === 'circle') {
			if (radius === this._radius)
				return;
			var size = radius * 2;
			this._radius = radius;
			this._size.set(size, size);
		} else {
			radius = Size.read(arguments);
			if (!this._radius) {
				// First time, e.g. whean reading from JSON...
				this._radius = radius.clone();
			} else {
				if (this._radius.equals(radius))
					return;
				this._radius.set(radius.width, radius.height);
				if (type === 'rectangle') {
					// Grow size accordingly
					var size = Size.max(this._size, radius.multiply(2));
					this._size.set(size.width, size.height);
				} else if (type === 'ellipse') {
					this._size.set(radius.width * 2, radius.height * 2);
				}
			}
		}
		this._changed(/*#=*/ Change.GEOMETRY);
	},

	isEmpty: function() {
		// A shape can never be "empty" in the sense that it always holds a
		// definition. This is required for Group#bounds to work correctly when
		// containing a Shape.
		return false;
	},

	// DOCS: #toPath([insert=true])
	toPath: function(insert) {
		var path = new Path[Base.capitalize(this._type)]({
			center: new Point(),
			size: this._size,
			radius: this._radius,
			insert: false
		});
		path.setStyle(this._style);
		path.transform(this._matrix);
		// Insert is true by default.
		if (insert || insert === undefined)
			path.insertAbove(this);
		return path;
	},

	_draw: function(ctx, param) {
		var style = this._style,
			hasFill = style.hasFill(),
			hasStroke = style.hasStroke(),
			dontPaint = param.dontFinish || param.clip;
		if (hasFill || hasStroke || dontPaint) {
			var radius = this._radius,
				type = this._type;
			if (!param.dontStart)
				ctx.beginPath();
			if (type === 'circle') {
				ctx.arc(0, 0, radius, 0, Math.PI * 2, true);
			} else {
				var rx = radius.width,
					ry = radius.height,
					kappa = /*#=*/ Numerical.KAPPA;
				if (type === 'ellipse') {
					// Approximate ellipse with four bezier curves and KAPPA.
					var	cx = rx * kappa,
						cy = ry * kappa;
					ctx.moveTo(-rx, 0);
					ctx.bezierCurveTo(-rx, -cy, -cx, -ry, 0, -ry);
					ctx.bezierCurveTo(cx, -ry, rx, -cy, rx, 0);
					ctx.bezierCurveTo(rx, cy, cx, ry, 0, ry);
					ctx.bezierCurveTo(-cx, ry, -rx, cy, -rx, 0);
				} else { // rect
					var size = this._size,
						width = size.width,
						height = size.height;
					if (rx === 0 && ry === 0) {
						// straight rect
						ctx.rect(-width / 2, -height / 2, width, height);
					} else {
						// rounded rect. Use 1 - KAPPA to calculate position of
						// control points from the corners inwards.
						kappa = 1 - kappa;
						var x = width / 2,
							y = height / 2,
							cx = rx * kappa,
							cy = ry * kappa;
						ctx.moveTo(-x, -y + ry);
						ctx.bezierCurveTo(-x, -y + cy, -x + cx, -y, -x + rx, -y);
						ctx.lineTo(x - rx, -y);
						ctx.bezierCurveTo(x - cx, -y, x, -y + cy, x, -y + ry);
						ctx.lineTo(x, y - ry);
						ctx.bezierCurveTo(x, y - cy, x - cx, y, x - rx, y);
						ctx.lineTo(-x + rx, y);
						ctx.bezierCurveTo(-x + cx, y, -x, y - cy, -x, y - ry);
					}
				}
			}
			ctx.closePath();
		}
		if (!dontPaint && (hasFill || hasStroke)) {
			this._setStyles(ctx);
			if (hasFill) {
				ctx.fill(style.getWindingRule());
				ctx.shadowColor = 'rgba(0,0,0,0)';
			}
			if (hasStroke)
				ctx.stroke();
		}
	},

	_canComposite: function() {
		// A path with only a fill  or a stroke can be directly blended, but if
		// it has both, it needs to be drawn into a separate canvas first.
		return !(this.hasFill() && this.hasStroke());
	},

	_getBounds: function(getter, matrix) {
		var rect = new Rectangle(this._size).setCenter(0, 0);
		if (getter !== 'getBounds' && this.hasStroke())
			rect = rect.expand(this.getStrokeWidth());
		return matrix ? matrix._transformBounds(rect) : rect;
	}
},
new function() { // Scope for _contains() and _hitTestSelf() code.

	// Returns the center of the quarter corner ellipse for rounded rectangle,
	// if the point lies within its bounding box.
	function getCornerCenter(that, point, expand) {
		var radius = that._radius;
		if (!radius.isZero()) {
			var halfSize = that._size.divide(2);
			for (var i = 0; i < 4; i++) {
				// Calculate the bounding boxes of the four quarter ellipses
				// that define the rounded rectangle, and hit-test these.
				var dir = new Point(i & 1 ? 1 : -1, i > 1 ? 1 : -1),
					corner = dir.multiply(halfSize),
					center = corner.subtract(dir.multiply(radius)),
					rect = new Rectangle(corner, center);
				if ((expand ? rect.expand(expand) : rect).contains(point))
					return center;
			}
		}
	}

	// Calculates the length of the ellipse radius that passes through the point
	function getEllipseRadius(point, radius) {
		var angle = point.getAngleInRadians(),
			width = radius.width * 2,
			height = radius.height * 2,
			x = width * Math.sin(angle),
			y = height * Math.cos(angle);
		return width * height / (2 * Math.sqrt(x * x + y * y));
	}

	return /** @lends Shape# */{
		_contains: function _contains(point) {
			if (this._type === 'rectangle') {
				var center = getCornerCenter(this, point);
				return center
						// If there's a quarter ellipse center, use the same
						// check as for ellipses below.
						? point.subtract(center).divide(this._radius)
							.getLength() <= 1
						: _contains.base.call(this, point);
			} else {
				return point.divide(this.size).getLength() <= 0.5;
			}
		},

		_hitTestSelf: function _hitTestSelf(point, options) {
			var hit = false;
			if (this.hasStroke()) {
				var type = this._type,
					radius = this._radius,
					strokeWidth = this.getStrokeWidth() + 2 * options.tolerance;
				if (type === 'rectangle') {
					var center = getCornerCenter(this, point, strokeWidth);
					if (center) {
						// Check the stroke of the quarter corner ellipse,
						// similar to the ellipse check further down:
						var pt = point.subtract(center);
						hit = 2 * Math.abs(pt.getLength()
								- getEllipseRadius(pt, radius)) <= strokeWidth;
					} else {
						var rect = new Rectangle(this._size).setCenter(0, 0),
							outer = rect.expand(strokeWidth),
							inner = rect.expand(-strokeWidth);
						hit = outer._containsPoint(point)
								&& !inner._containsPoint(point);
					}
				} else {
					if (type === 'ellipse')
						radius = getEllipseRadius(point, radius);
					hit = 2 * Math.abs(point.getLength() - radius)
							<= strokeWidth;
				}
			}
			return hit
					? new HitResult('stroke', this)
					: _hitTestSelf.base.apply(this, arguments);
		}
	};
}, {
// Mess with indentation in order to get more line-space below:
statics: new function() {
	function createShape(type, point, size, radius, args) {
		var item = new Shape(Base.getNamed(args));
		item._type = type;
		item._size = size;
		item._radius = radius;
		return item.translate(point);
	}

	return /** @lends Shape */{
		/**
		 * Creates a circular shape item.
		 *
		 * @name Shape.Circle
		 * @param {Point} center the center point of the circle
		 * @param {Number} radius the radius of the circle
		 * @return {Shape} the newly created shape
		 *
		 * @example {@paperscript}
		 * var shape = new Shape.Circle(new Point(80, 50), 30);
		 * shape.strokeColor = 'black';
		 */
		/**
		 * Creates a circular shape item from the properties described by an
		 * object literal.
		 *
		 * @name Shape.Circle
		 * @param {Object} object an object literal containing properties
		 * describing the shape's attributes
		 * @return {Shape} the newly created shape
		 *
		 * @example {@paperscript}
		 * var shape = new Shape.Circle({
		 *     center: [80, 50],
		 *     radius: 30,
		 *     strokeColor: 'black'
		 * });
		 */
		Circle: function(/* center, radius */) {
			var center = Point.readNamed(arguments, 'center'),
				radius = Base.readNamed(arguments, 'radius');
			return createShape('circle', center, new Size(radius * 2), radius,
					arguments);
		},

		/**
		 * Creates a rectangular shape item, with optionally rounded corners.
		 *
		 * @name Shape.Rectangle
		 * @param {Rectangle} rectangle the rectangle object describing the
		 * geometry of the rectangular shape to be created.
		 * @param {Size} [radius=null] the size of the rounded corners
		 * @return {Shape} the newly created shape
		 *
		 * @example {@paperscript}
		 * var rectangle = new Rectangle(new Point(20, 20), new Size(60, 60));
		 * var shape = new Shape.Rectangle(rectangle);
		 * shape.strokeColor = 'black';
		 *
		 * @example {@paperscript} // The same, with rounder corners
		 * var rectangle = new Rectangle(new Point(20, 20), new Size(60, 60));
		 * var cornerSize = new Size(10, 10);
		 * var shape = new Shape.Rectangle(rectangle, cornerSize);
		 * shape.strokeColor = 'black';
		 */
		/**
		 * Creates a rectangular shape item from a point and a size object.
		 *
		 * @name Shape.Rectangle
		 * @param {Point} point the rectangle's top-left corner.
		 * @param {Size} size the rectangle's size.
		 * @return {Shape} the newly created shape
		 *
		 * @example {@paperscript}
		 * var point = new Point(20, 20);
		 * var size = new Size(60, 60);
		 * var shape = new Shape.Rectangle(point, size);
		 * shape.strokeColor = 'black';
		 */
		/**
		 * Creates a rectangular shape item from the passed points. These do not
		 * necessarily need to be the top left and bottom right corners, the
		 * constructor figures out how to fit a rectangle between them.
		 *
		 * @name Shape.Rectangle
		 * @param {Point} from the first point defining the rectangle
		 * @param {Point} to the second point defining the rectangle
		 * @return {Shape} the newly created shape
		 *
		 * @example {@paperscript}
		 * var from = new Point(20, 20);
		 * var to = new Point(80, 80);
		 * var shape = new Shape.Rectangle(from, to);
		 * shape.strokeColor = 'black';
		 */
		/**
		 * Creates a rectangular shape item from the properties described by an
		 * object literal.
		 *
		 * @name Shape.Rectangle
		 * @param {Object} object an object literal containing properties
		 * describing the shape's attributes
		 * @return {Shape} the newly created shape
		 *
		 * @example {@paperscript}
		 * var shape = new Shape.Rectangle({
		 *     point: [20, 20],
		 *     size: [60, 60],
		 *     strokeColor: 'black'
		 * });
		 *
		 * @example {@paperscript}
		 * var shape = new Shape.Rectangle({
		 *     from: [20, 20],
		 *     to: [80, 80],
		 *     strokeColor: 'black'
		 * });
		 *
		 * @example {@paperscript}
		 * var shape = new Shape.Rectangle({
		 *     rectangle: {
		 *         topLeft: [20, 20],
		 *         bottomRight: [80, 80]
		 *     },
		 *     strokeColor: 'black'
		 * });
		 *
		 * @example {@paperscript}
		 * var shape = new Shape.Rectangle({
	 	 *	topLeft: [20, 20],
	 	 *     bottomRight: [80, 80],
		 *     radius: 10,
		 *     strokeColor: 'black'
		 * });
		 */
		Rectangle: function(/* rectangle */) {
			var rect = Rectangle.readNamed(arguments, 'rectangle'),
				radius = Size.min(Size.readNamed(arguments, 'radius'),
						rect.getSize(true).divide(2));
			return createShape('rectangle', rect.getCenter(true),
					rect.getSize(true), radius, arguments);
		},

		/**
		 * Creates an elliptical shape item.
		 *
		 * @name Shape.Ellipse
		 * @param {Rectangle} rectangle the rectangle circumscribing the ellipse
		 * @return {Shape} the newly created shape
		 *
		 * @example {@paperscript}
		 * var rectangle = new Rectangle(new Point(20, 20), new Size(180, 60));
		 * var shape = new Shape.Ellipse(rectangle);
		 * shape.fillColor = 'black';
		 */
		/**
		 * Creates an elliptical shape item from the properties described by an
		 * object literal.
		 *
		 * @name Shape.Ellipse
		 * @param {Object} object an object literal containing properties
		 * describing the shape's attributes
		 * @return {Shape} the newly created shape
		 *
		 * @example {@paperscript}
		 * var shape = new Shape.Ellipse({
		 *     point: [20, 20],
		 *     size: [180, 60],
		 *     fillColor: 'black'
		 * });
		 *
		 * @example {@paperscript} // Placing by center and radius
		 * var shape = new Shape.Ellipse({
		 *     center: [110, 50],
		 *     radius: [90, 30],
		 *     fillColor: 'black'
		 * });
		 */
		Ellipse: function(/* rectangle */) {
			var ellipse = Shape._readEllipse(arguments),
				radius = ellipse.radius;
			return createShape('ellipse', ellipse.center, radius.multiply(2),
					radius, arguments);
		},

		// Private method to read ellipse center and radius from arguments list,
		// shared with Path.Ellipse constructor.
		_readEllipse: function(args) {
			var center,
				radius;
			if (Base.hasNamed(args, 'radius')) {
				center = Point.readNamed(args, 'center');
				radius = Size.readNamed(args, 'radius');
			} else {
				var rect = Rectangle.readNamed(args, 'rectangle');
				center = rect.getCenter(true);
				radius = rect.getSize(true).divide(2);
			}
			return { center: center, radius: radius };
		}
	};
}});
