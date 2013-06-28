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
 * @name Shape
 *
 * @class
 *
 * @extends Item
 */
var Shape = Item.extend(/** @lends Shape# */{
	_class: 'Shape',
	_transformContent: false,

	initialize: function Shape(type, point, size) {
		Item.call(this, point);
		this._type = type;
		this._size = size;
	},

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
		if (!this._size.equals(size)) {
			this._size.set(size.width, size.height);
			this._changed(/*#=*/ Change.GEOMETRY);
		}
	},

	/**
	 * The radius of the shape if it is a circle.
	 *
	 * @type Size
	 * @bean
	 */
	getRadius: function() {
		var size = this._size;
		// Average half of width & height for radius...
		return (size.width + size.height) / 4;
	},

	setRadius: function(radius) {
		var size = radius * 2;
		this.setSize(size, size);
	},

	_draw: function(ctx, param) {
		var style = this._style,
			size = this._size,
			width = size.width,
			height = size.height,
			fillColor = style.getFillColor(),
			strokeColor = style.getStrokeColor();
		if (fillColor || strokeColor || param.clip) {
			ctx.beginPath();
			switch (this._type) {
			case 'rect':
				ctx.rect(-width / 2, -height / 2, width, height);
				break;
			case 'circle':
				// Average half of width & height for radius...
				ctx.arc(0, 0, (width + height) / 4, 0, Math.PI * 2, true);
				break;
			case 'ellipse':
				// Use four bezier curves and KAPPA value to aproximate ellipse
				var mx = width / 2,
					my = height / 2,
					kappa = Numerical.KAPPA,
					cx = mx * kappa,
					cy = my * kappa;
				ctx.moveTo(-mx, 0);
				ctx.bezierCurveTo(-mx, -cy, -cx, -my, 0, -my);
				ctx.bezierCurveTo(cx, -my, mx, -cy, mx, 0);
				ctx.bezierCurveTo(mx, cy, cx, my, 0, my);
				ctx.bezierCurveTo(-cx, my, -mx, cy, -mx, 0);
				break;
			}
		}
		if (!param.clip && (fillColor || strokeColor)) {
			this._setStyles(ctx);
			if (fillColor)
				ctx.fill();
			if (strokeColor)
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
	},

	_contains: function _contains(point) {
		switch (this._type) {
		case 'rect':
			return _contains.base.call(this, point);
		case 'circle':
		case 'ellipse':
			return point.divide(this._size).getLength() <= 0.5;
		}
	},

	_hitTest: function _hitTest(point) {
		if (this.hasStroke()) {
			var type = this._type,
				strokeWidth = this.getStrokeWidth();
			switch (type) {
			case 'rect':
				var rect = new Rectangle(this._size).setCenter(0, 0),
					outer = rect.expand(strokeWidth),
					inner = rect.expand(-strokeWidth);
				if (outer._containsPoint(point) && !inner._containsPoint(point))
					return new HitResult('stroke', this);
				break;
			case 'circle':
			case 'ellipse':
				var size = this._size,
					width = size.width,
					height = size.height,
					radius;
				if (type === 'ellipse') {
					// Calculate ellipse radius at angle
					var angle = point.getAngleInRadians(),
						x = width * Math.sin(angle),
						y = height * Math.cos(angle);
					radius = width * height / (2 * Math.sqrt(x * x + y * y));
				} else {
					// Average half of width & height for radius...
					radius = (width + height) / 4;
				}
				if (2 * Math.abs(point.getLength() - radius) <= strokeWidth)
					return new HitResult('stroke', this);
				break;
			}
		}
		return _hitTest.base.apply(this, arguments);
	},

	statics: new function() {
		function createShape(type, point, size, args) {
			var shape = new Shape(type, point, size),
				named = Base.getNamed(args);
			if (named)
				shape._set(named);
			return shape;
		}

		return /** @lends Shape */{
			/**
			 * Creates a circular Shape item.
			 *
			 * @param {Point} center the center point of the circle
			 * @param {Number} radius the radius of the circle
			 * @return {Shape} the newly created shape
			 *
			 * @example {@paperscript}
			 * var shape = new Shape.Circle(new Point(80, 50), 30);
			 * shape.strokeColor = 'black';
			 *
			 * @example {@paperscript} // Using object notation
			 * var shape = new Shape.Circle({
			 * 	center: [80, 50],
			 * 	radius: 30,
			 * 	strokeColor: 'black'
			 * });
			 */
			Circle: function(/* center, radius */) {
				var center = Point.readNamed(arguments, 'center'),
					radius = Base.readNamed(arguments, 'radius');
				return createShape('circle', center, new Size(radius * 2),
						arguments);
			},

			/**
			 * Creates a rectangular Shape item from the passed point and size.
			 *
			 * @name Shape.Rectangle
			 * @param {Point} point
			 * @param {Size} size
			 * @return {Shape} the newly created shape
			 *
			 * @example {@paperscript}
			 * var point = new Point(20, 20);
			 * var size = new Size(60, 60);
			 * var shape = new Shape.Rectangle(point, size);
			 * shape.strokeColor = 'black';
			 *
			 * @example {@paperscript} // Using object notation
			 * var shape = new Shape.Rectangle({
			 * 	point: [20, 20],
			 * 	size: [60, 60],
			 * 	strokeColor: 'black'
			 * });
			 */
			/**
			 * Creates a rectanglular Shape item from the passed points. These
			 * do not necessarily need to be the top left and bottom right
			 * corners, the constructor figures out how to fit a rectangle
			 * between them.
			 *
			 * @name Shape.Rectangle
			 * @param {Point} from The first point defining the rectangle
			 * @param {Point} to The second point defining the rectangle
			 * @return {Shape} the newly created shape
			 *
			 * @example {@paperscript}
			 * var from = new Point(20, 20);
			 * var to = new Point(80, 80);
			 * var shape = new Shape.Rectangle(from, to);
			 * shape.strokeColor = 'black';
			 *
			 * @example {@paperscript} // Using object notation
			 * var shape = new Shape.Rectangle({
			 * 	from: [20, 20],
			 * 	to: [80, 80],
			 * 	strokeColor: 'black'
			 * });
			 */
			/**
			 * Creates a rectangular Shape item from the passed abstract
			 * {@link Rectangle}.
			 *
			 * @name Shape.Rectangle
			 * @param {Rectangle} rectangle
			 * @return {Shape} the newly created shape
			 *
			 * @example {@paperscript}
			 * var rectangle = new Rectangle({
			 * 	point: new Point(20, 20),
			 * 	size: new Size(60, 60)
			 * });
			 * var shape = new Shape.Rectangle(rectangle);
			 * shape.strokeColor = 'black';
			 *
			 * @example {@paperscript}
			 * var rectangle = new Rectangle({
			 * 	point: [20, 20],
			 * 	size: [60, 60]
			 * });
			 * 
			 * var shape = new Shape.Rectangle({
			 * 	rectangle: rectangle,
			 * 	strokeColor: 'black'
			 * });
			 */
			Rectangle: function(/* rectangle */) {
				var rect = Rectangle.readNamed(arguments, 'rectangle');
				return createShape('rect', rect.getCenter(true),
						rect.getSize(true), arguments);
			},

			/**
			 * Creates an elliptic Shape item.
			 *
			 * @param {Rectangle} rectangle
			 * @return {Shape} the newly created shape
			 *
			 * @example {@paperscript}
			 * var rectangle = new Rectangle({
			 * 	point: [20, 20],
			 * 	size: [180, 60]
			 * });
			 * var shape = new Shape.Ellipse(rectangle);
			 * shape.fillColor = 'black';
			 *
			 * @example {@paperscript} // Using object notation
			 * var shape = new Shape.Ellipse({
			 * 	point: [20, 20],
			 * 	size: [180, 60],
			 * 	fillColor: 'black'
			 * });
			 */
			Ellipse: function(/* rectangle */) {
				var rect = Rectangle.readNamed(arguments, 'rectangle');
				return createShape('ellipse', rect.getCenter(true),
						rect.getSize(true), arguments);
			}
		};
	}
});
