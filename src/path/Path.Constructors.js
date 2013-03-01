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

Path.inject({ statics: new function() {

	function readRectangle(list) {
		var props = Base.getNamed(list),
			rect;
		if (props) {
			if ('from' in props) {
				rect = new Rectangle(Point.readNamed(list, 'from'),
						Point.readNamed(list, 'to'));
			} else {
				rect = new Rectangle();
				rect._set(Base.getNamed(list));
			}
		} else {
			rect = Rectangle.read(list);
		}
		return rect;
	}

	function createRectangle(/* rect */) {
		var rect = readRectangle(arguments),
			left = rect.getLeft(),
			top = rect.getTop(),
			right = rect.getRight(),
			bottom = rect.getBottom(),
			path = new Path(Base.getNamed(arguments));
		path._add([
			new Segment(Point.create(left, bottom)),
			new Segment(Point.create(left, top)),
			new Segment(Point.create(right, top)),
			new Segment(Point.create(right, bottom))
		]);
		path._closed = true;
		return path;
	}

	// Kappa, see: http://www.whizkidtech.redprince.net/bezier/circle/kappa/
	var kappa = 2 * (Math.sqrt(2) - 1) / 3;

	var ellipseSegments = [
		new Segment([0, 0.5], [0, kappa ], [0, -kappa]),
		new Segment([0.5, 0], [-kappa, 0], [kappa, 0 ]),
		new Segment([1, 0.5], [0, -kappa], [0, kappa ]),
		new Segment([0.5, 1], [kappa, 0 ], [-kappa, 0])
	];

	function createEllipse(/* rect */) {
		var rect = readRectangle(arguments),
			path = new Path(Base.getNamed(arguments)),
			point = rect.getPoint(true),
			size = rect.getSize(true),
			segments = new Array(4);
		for (var i = 0; i < 4; i++) {
			var segment = ellipseSegments[i];
			segments[i] = new Segment(
				segment._point.multiply(size).add(point),
				segment._handleIn.multiply(size),
				segment._handleOut.multiply(size)
			);
		}
		path._add(segments);
		path._closed = true;
		return path;
	}

	return /** @lends Path */{
		/**
		 * {@grouptitle Shaped Paths}
		 *
		 * Creates a Path Item with two anchor points forming a line.
		 *
		 * @param {Point} from the first anchor point of the path
		 * @param {Point} to the second anchor point of the path
		 * @return {Path} the newly created path
		 *
		 * @example
		 * var from = new Point(20, 20);
		 * var to = new Point(100, 100);
		 * var path = new Path.Line(from, to);
		 * path.strokeColor = 'black';
		 */
		Line: function(/* from, to */) {
			return new Path(
				Point.readNamed(arguments, 'from'),
				Point.readNamed(arguments, 'to')
			).set(Base.getNamed(arguments));
		},

		/**
		 * Creates a rectangle shaped Path Item from the passed point and size.
		 *
		 * @name Path.Rectangle
		 * @param {Point} point
		 * @param {Size} size
		 * @return {Path} the newly created path
		 *
		 * @example
		 * var point = new Point(100, 100);
		 * var size = new Size(100, 100);
		 * var rectangle = new Rectangle(point, size);
		 * var path = new Path.Rectangle(rectangle);
		 * path.strokeColor = 'black';
		 */
		/**
		 * Creates a rectangle shaped Path Item from the passed points. These do not
		 * necessarily need to be the top left and bottom right corners, the
		 * constructor figures out how to fit a rectangle between them.
		 *
		 * @name Path.Rectangle
		 * @param {Point} from The first point defining the rectangle
		 * @param {Point} to The second point defining the rectangle
		 * @return {Path} the newly created path
		 *
		 * @example
		 * var point = new Point(100, 100);
		 * var point2 = new Point(200, 300);
		 * var path = new Path.Rectangle(point, point2);
		 * path.strokeColor = 'black';
		 */
		/**
		 * Creates a rectangle shaped Path Item from the passed abstract
		 * {@link Rectangle}.
		 *
		 * @param {Rectangle} rectangle
		 * @return {Path} the newly created path
		 *
		 * @example
		 * var point = new Point(100, 100);
		 * var size = new Size(100, 100);
		 * var rectangle = new Rectangle(point, size);
		 * var path = new Path.Rectangle(rectangle);
		 * path.strokeColor = 'black';
		 */
		Rectangle: createRectangle,

		/**
		 * Creates a rectangular Path Item with rounded corners.
		 *
		 * @param {Rectangle} rectangle
		 * @param {Size} radius the size of the rounded corners
		 * @return {Path} the newly created path
		 *
		 * @example
		 * var point = new Point(100, 100);
		 * var size = new Size(100, 100);
		 * var rectangle = new Rectangle(point, size);
		 * var cornerSize = new Size(30, 30);
		 * var path = new Path.RoundRectangle(rectangle, cornerSize);
		 */
		RoundRectangle: function(/* rect, radius */) {
			var rect = readRectangle(arguments),
				radius = Size.readNamed(arguments, 'radius');
			if (radius.isZero())
				return createRectangle(rect);
			radius = Size.min(radius, rect.getSize(true).divide(2));
			var bl = rect.getBottomLeft(true),
				tl = rect.getTopLeft(true),
				tr = rect.getTopRight(true),
				br = rect.getBottomRight(true),
				h = radius.multiply(kappa * 2), // handle vector
				path = new Path(Base.getNamed(arguments));
			path._add([
				new Segment(bl.add(radius.width, 0), null, [-h.width, 0]),
				new Segment(bl.subtract(0, radius.height), [0, h.height], null),

				new Segment(tl.add(0, radius.height), null, [0, -h.height]),
				new Segment(tl.add(radius.width, 0), [-h.width, 0], null),

				new Segment(tr.subtract(radius.width, 0), null, [h.width, 0]),
				new Segment(tr.add(0, radius.height), [0, -h.height], null),

				new Segment(br.subtract(0, radius.height), null, [0, h.height]),
				new Segment(br.subtract(radius.width, 0), [h.width, 0], null)
			]);
			path._closed = true;
			return path;
		},

		/**
		* Creates an ellipse shaped Path Item.
		 *
		 * @param {Rectangle} rectangle
		 * @param {Boolean} [circumscribed=false] when set to {@code true} the
		 *        ellipse shaped path will be created so the rectangle fits into
		 *        it. When set to {@code false} the ellipse path will fit within
		 *        the rectangle.
		 * @return {Path} the newly created path
		 *
		 * @example
		 * var topLeft = new Point(100, 100);
		 * var size = new Size(150, 100);
		 * var rectangle = new Rectangle(topLeft, size);
		 * var path = new Path.Ellipse(rectangle);
		 * path.fillColor = 'black';
		 */
		Ellipse: createEllipse,

		/**
		 * @deprecated use {@link #Path.Ellipse(rect)} instead.
		 */
		Oval: createEllipse,

		/**
		 * Creates a circle shaped Path Item.
		 *
		 * @param {Point} center the center point of the circle
		 * @param {Number} radius the radius of the circle
		 * @return {Path} the newly created path
		 *
		 * @example
		 * var path = new Path.Circle(new Point(100, 100), 50);
		 */
		Circle: function(/* center, radius */) {
			var center = Point.readNamed(arguments, 'center'),
				radius = Base.readNamed(arguments, 'radius');
			return createEllipse(new Rectangle(center.subtract(radius),
					Size.create(radius * 2, radius * 2)))
					.set(Base.getNamed(arguments));
		},

		/**
		 * Creates a circular arc shaped Path Item.
		 *
		 * @param {Point} from the starting point of the circular arc
		 * @param {Point} through the point the arc passes through
		 * @param {Point} to the end point of the arc
		 * @return {Path} the newly created path
		 *
		 * @example
		 * var start = new Point(0, 0);
		 * var through = new Point(100, 100);
		 * var to = new Point(200, 150);
		 * var path = new Path.Arc(start, through, to);
		 * path.strokeColor = 'black';
		 */
		Arc: function(/* from, through, to */) {
			var from = Point.readNamed(arguments, 'from'),
				through = Point.readNamed(arguments, 'through'),
				to = Point.readNamed(arguments, 'to'),
				path = new Path(Base.getNamed(arguments));
			path.moveTo(from);
			path.arcTo(through, to);
			return path;
		},

		/**
		 * Creates a regular polygon shaped Path Item.
		 *
		 * @param {Point} center the center point of the polygon
		 * @param {Number} numSides the number of sides of the polygon
		 * @param {Number} radius the radius of the polygon
		 * @return {Path} the newly created path
		 *
		 * @example
		 * // Create a triangle shaped path
		 * var center = new Point(100, 100);
		 * var sides = 3;
		 * var radius = 50;
		 * var triangle = new Path.RegularPolygon(center, sides, radius);
		 * triangle.fillColor = 'black';
		 *
		 * @example
		 * // Create a decahedron shaped path
		 * var center = new Point(100, 100);
		 * var sides = 10;
		 * var radius = 50;
		 * var decahedron = new Path.RegularPolygon(center, sides, radius);
		 * decahedron.fillColor = 'black';
		 */
		RegularPolygon: function(/* center, numSides, radius */) {
			var center = Point.readNamed(arguments, 'center'),
				numSides = Base.readNamed(arguments, 'numSides'),
				radius = Base.readNamed(arguments, 'radius'),
				path = new Path(Base.getNamed(arguments)),
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
		 * @param {Point} center the center point of the star
		 * @param {Number} numPoints the number of points of the star
		 * @param {Number} radius1
		 * @param {Number} radius2
		 * @return {Path} the newly created path
		 *
		 * @example
		 * var center = new Point(100, 100);
		 * var points = 6;
		 * var radius1 = 20;
		 * var radius2 = 50;
		 * var path = new Path.Star(center, points, radius1, radius2);
		 * path.fillColor = 'black';
		 */
		Star: function(/* center, numPoints, radius1, radius2 */) {
			var center = Point.readNamed(arguments, 'center'),
				numPoints = Base.readNamed(arguments, 'numPoints') * 2,
				radius1 = Base.readNamed(arguments, 'radius1'),
				radius2 = Base.readNamed(arguments, 'radius2'),
				path = new Path(Base.getNamed(arguments)),
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
