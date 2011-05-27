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

Path.inject({ statics: new function() {
	var kappa = 2 / 3 * (Math.sqrt(2) - 1);

	var ovalSegments = [
		new Segment([0, 0.5], [0, kappa ], [0, -kappa]),
		new Segment([0.5, 0], [-kappa, 0], [kappa, 0 ]),
		new Segment([1, 0.5], [0, -kappa], [0, kappa ]),
		new Segment([0.5, 1], [kappa, 0 ], [-kappa, 0])
	];

	return {
		/** @lends Path */
		
		/**
		 * Creates a Path Item with two anchor points forming a line.
		 * 
		 * @example
		 * var path = new Path.Line(new Point(20, 20, new Point(100, 100));
		 * path.strokeColor = 'black';
		 * 
		 * @param {Point} pt1 the first anchor point of the path
		 * @param {Point} pt2 the second anchor point of the path
		 * @return {Path} the newly created path
		 */
		Line: function() {
			var step = Math.floor(arguments.length / 2);
			return new Path(
				Segment.read(arguments, 0, step),
				Segment.read(arguments, step, step)
			);
		},

		/**
		 * Creates a rectangle shaped Path Item from the passed point and size.
		 * 
		 * @example
		 * var rectangle = new Rectangle(new Point(100, 100), new Size(100, 100));
		 * var path = new Path.Rectangle(rectangle);
		 * 
		 * @name Path.Rectangle^3
		 * @function
		 * @param {Point} point
		 * @param {Size} size
		 * @return {Path} the newly created path
		 */
		/**
		 * Creates a rectangle shaped Path Item from the passed points. These do not
		 * necessarily need to be the top left and bottom right corners, the
		 * constructor figures out how to fit a rectangle between them.
		 * 
		 * @example
		 * var path = new Path.Rectangle(new Point(100, 100), new Point(200, 300));
		 * 
		 * @name Path.Rectangle^2
		 * @function
		 * @param {Point} point1 The first point defining the rectangle
		 * @param {Point} point2 The second point defining the rectangle
		 * @return {Path} the newly created path
		 */
		/**
		 * Creates a rectangle shaped Path Item from the passed abstract
		 * {@link Rectangle}.
		 * 
		 * @example
		 * var rectangle = new Rectangle(new Point(100, 100), new Size(100, 100));
		 * var path = new Path.Rectangle(rectangle);
		 * path.strokeColor = 'black';
		 * 
		 * @param {Rectangle} rect
		 * @return {Path} the newly created path
		 */
		Rectangle: function(rect) {
			rect = Rectangle.read(arguments);
			var path = new Path(),
				corners = ['getBottomLeft', 'getTopLeft', 'getTopRight',
					'getBottomRight'],
				segments = new Array(4);
			for (var i = 0; i < 4; i++)
				segments[i] = new Segment(rect[corners[i]]());
			path._add(segments);
			path._closed = true;
			return path;
		},

		/**
	 	* Creates a rectangular Path Item with rounded corners.
		 * 
		 * @example
		 * var rectangle = new Rectangle(new Point(100, 100), new Size(100, 100));
		 * var path = new Path.RoundRectangle(rectangle, new Size(30, 30));
		 * 
		 * @param {Rectangle} rect
		 * @param {Size} size the size of the rounded corners
		 * @return {Path} the newly created path
		 */
		RoundRectangle: function(rect, size) {
			if (arguments.length == 2) {
				rect = Rectangle.read(arguments, 0, 1);
				size = Size.read(arguments, 1, 1);
			} else if (arguments.length == 6) {
				rect = Rectangle.read(arguments, 0, 4);
				size = Size.read(arguments, 4, 2);
			}
			size = Size.min(size, rect.getSize().divide(2));
			var path = new Path(),
				uSize = size.multiply(kappa * 2),
				bl = rect.getBottomLeft(),
				tl = rect.getTopLeft(),
				tr = rect.getTopRight(),
				br = rect.getBottomRight();
			path._add([
				new Segment(bl.add(size.width, 0), null, [-uSize.width, 0]),
				new Segment(bl.subtract(0, size.height), [0, uSize.height], null),

				new Segment(tl.add(0, size.height), null, [0, -uSize.height]),
				new Segment(tl.add(size.width, 0), [-uSize.width, 0], null),

				new Segment(tr.subtract(size.width, 0), null, [uSize.width, 0]),
				new Segment(tr.add(0, size.height), [0, -uSize.height], null),

				new Segment(br.subtract(0, size.height), null, [0, uSize.height]),
				new Segment(br.subtract(size.width, 0), [uSize.width, 0], null)
			]);
			path._closed = true;
			return path;
		},

		/**
		* Creates an oval shaped Path Item.
		 * 
		 * @example
		 * var rectangle = new Rectangle(new Point(100, 100), new Size(150, 100));
		 * var path = new Path.Oval(rectangle);
		 * 
		 * @param {Rectangle} rect
		 * @param {boolean} [circumscribed=false] if this is set to true the
		 *        oval shaped path will be created so the rectangle fits into
		 *        it. If it's set to false the oval path will fit within the
		 *        rectangle.
		 * @return {Path} the newly created path
		 */
		Oval: function(rect) {
			rect = Rectangle.read(arguments);
			var path = new Path(),
				topLeft = rect.getTopLeft(),
				size = new Size(rect.width, rect.height),
				segments = new Array(4);
			for (var i = 0; i < 4; i++) {
				var segment = ovalSegments[i];
				segments[i] = new Segment(
					segment._point.multiply(size).add(topLeft),
					segment._handleIn.multiply(size),
					segment._handleOut.multiply(size)
				);
			}
			path._add(segments);
			path._closed = true;
			return path;
		},

		/**
		 * Creates a circle shaped Path Item.
		 * 
		 * @example
		 * var path = new Path.Circle(new Point(100, 100), 50);
		 * 
		 * @param {Point} center the center point of the circle
		 * @param {Number} radius the radius of the circle
		 * @return {Path} the newly created path
		 */
		Circle: function(center, radius) {
			if (arguments.length == 3) {
				center = Point.read(arguments, 0, 2);
				radius = arguments[2];
			} else {
				center = Point.read(arguments, 0, 1);
			}
			return Path.Oval(new Rectangle(center.subtract(radius),
					new Size(radius * 2, radius * 2)));
		},

		/**
		 * Creates a circular arc shaped Path Item.
		 * 
		 * @example
		 * var path = new Path.Arc(new Point(0, 0), new Point(100, 100),
		 *         new Point(200, 150));
		 * 
		 * @param {Point} from the starting point of the circular arc
		 * @param {Point} through the point the arc passes through
		 * @param {Point} to the end point of the arc
		 * @return {Path} the newly created path
		 */
		Arc: function(from, through, to) {
			var path = new Path();
			path.moveTo(from);
			path.arcTo(through, to);
			return path;
		},

		/**
		 * Creates a regular polygon shaped Path Item.
		 * 
		 * @example
		 * // Create a triangle shaped path
		 * var triangle = new Path.RegularPolygon(new Point(100, 100), 3, 50);
		 * 
		 * // Create a decahedron shaped path
		 * var decahedron = new Path.RegularPolygon(new Point(200, 100), 10, 50);
		 * 
		 * @param {Point} center the center point of the polygon
		 * @param {Number} numSides the number of sides of the polygon
		 * @param {Number} radius the radius of the polygon
		 * @return {Path} the newly created path
		 */
		RegularPolygon: function(center, numSides, radius) {
			center = Point.read(arguments, 0, 1);
			var path = new Path(),
				step = 360 / numSides,
				three = !(numSides % 3),
				vector = new Point(0, three ? -radius : radius),
				offset = three ? -1 : 0.5,
				segments = new Array(numSides);
			for (var i = 0; i < numSides; i++) {
				segments[i] = new Segment(center.add(
					vector.rotate((i + offset) * step)));
			}
			path._add(segments);
			path._closed = true;
			return path;
		},

		/**
		 * Creates a star shaped Path Item.
		 * 
		 * The largest of {@code radius1} and {@code radius2} will be the outer
		 * radius of the star. The smallest of radius1 and radius2 will be the
		 * inner radius.
		 * 
		 * @example
		 * var center = new Point(100, 100);
		 * var points = 6;
		 * var innerRadius = 20;
		 * var outerRadius = 50;
		 * var path = new Path.Star(center, points, innerRadius, outerRadius);
		 * 
		 * @param {Point} center the center point of the star
		 * @param {Number} numPoints the number of points of the star
		 * @param {Number} radius1
		 * @param {Number} radius2
		 * @return {Path} the newly created path
		 */	
		Star: function(center, numPoints, radius1, radius2) {
			center = Point.read(arguments, 0, 1);
			numPoints *= 2;
			var path = new Path(),
				step = 360 / numPoints,
				vector = new Point(0, -1),
				segments = new Array(numPoints);
			for (var i = 0; i < numPoints; i++) {
				segments[i] = new Segment(center.add(
					vector.rotate(step * i).multiply(i % 2 ? radius2 : radius1)));
			}
			path._add(segments);
			path._closed = true;
			return path;
		}
	};
}});
