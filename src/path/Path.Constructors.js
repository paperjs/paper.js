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

	function createPath(args) {
		var path = new Path(),
			named = Base.getNamed(args);
		if (named)
			path._set(named);
		return path;
	}

	function createRectangle(/* rect */) {
		var rect = Rectangle.readNamed(arguments, 'rectangle'),
			radius = Size.readNamed(arguments, 'radius', 0, 0, false, true), // readNull
			bl = rect.getBottomLeft(true),
			tl = rect.getTopLeft(true),
			tr = rect.getTopRight(true),
			br = rect.getBottomRight(true),
			path = createPath(arguments);
		if (!radius || radius.isZero()) {
			path._add([
				new Segment(bl),
				new Segment(tl),
				new Segment(tr),
				new Segment(br)
			]);
		} else {
			radius = Size.min(radius, rect.getSize(true).divide(2));
			var h = radius.multiply(kappa * 2); // handle vector
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
		}
		path._closed = true;
		return path;
	}

	var kappa = Numerical.KAPPA;

	var ellipseSegments = [
		new Segment([0, 0.5], [0, kappa ], [0, -kappa]),
		new Segment([0.5, 0], [-kappa, 0], [kappa, 0 ]),
		new Segment([1, 0.5], [0, -kappa], [0, kappa ]),
		new Segment([0.5, 1], [kappa, 0 ], [-kappa, 0])
	];

	function createEllipse(/* rect */) {
		var rect = Rectangle.readNamed(arguments, 'rectangle'),
			path = createPath(arguments),
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
		 * @name Path.Line
		 * @param {Point} from the first anchor point of the path
		 * @param {Point} to the second anchor point of the path
		 * @return {Path} the newly created path
		 *
		 * @example {@paperscript}
		 * var from = new Point(20, 20);
		 * var to = new Point(80, 80);
		 * var path = new Path.Line(from, to);
		 * path.strokeColor = 'black';
		 * 
		 * @example {@paperscript}
		 * var path = new Path.Line({
		 * 	from: [20, 20],
		 * 	to: [80, 80],
		 * 	strokeColor: 'black'
		 * });
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
		 * @example {@paperscript}
		 * var point = new Point(20, 20);
		 * var size = new Size(60, 60);
		 * var path = new Path.Rectangle(point, size);
		 * path.strokeColor = 'black';
		 *
		 * @example {@paperscript}
		 * var path = new Path.Rectangle({
		 * 	point: [20, 20],
		 * 	size: [60, 60],
		 * 	strokeColor: 'black'
		 * });
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
		 * @example {@paperscript}
		 * var from = new Point(20, 20);
		 * var to = new Point(80, 80);
		 * var path = new Path.Rectangle(from, to);
		 * path.strokeColor = 'black';
		 *
		 * @example {@paperscript}
		 * var path = new Path.Rectangle({
		 * 	from: [20, 20],
		 * 	to: [80, 80],
		 * 	strokeColor: 'black'
		 * });
		 */
		/**
		 * Creates a rectangle shaped Path Item from the passed abstract
		 * {@link Rectangle}.
		 *
		 * @name Path.Rectangle
		 * @param {Rectangle} rectangle
		 * @return {Path} the newly created path
		 *
		 * @example {@paperscript}
		 * var rectangle = new Rectangle({
		 * 	point: new Point(20, 20),
		 * 	size: new Size(60, 60)
		 * });
		 * var path = new Path.Rectangle(rectangle);
		 * path.strokeColor = 'black';
		 *
		 * @example {@paperscript}
		 * var rectangle = new Rectangle({
		 * 	point: [20, 20],
		 * 	size: [60, 60]
		 * });
		 * 
		 * var path = new Path.Rectangle({
		 * 	rectangle: rectangle,
		 * 	strokeColor: 'black'
		 * });
		 */
		/**
		 * Creates a rectangular Path Item with rounded corners.
		 *
		 * @name Path.Rectangle
		 * @param {Rectangle} rectangle
		 * @param {Size} radius the size of the rounded corners
		 * @return {Path} the newly created path
		 *
		 * @example {@paperscript}
		 * var rectangle = new Rectangle({
		 * 	point: new Point(20, 20),
		 * 	size: new Size(60, 60)
		 * });
		 * var cornerSize = new Size(10, 10);
		 * var path = new Path.Rectangle(rectangle, cornerSize);
		 * path.strokeColor = 'black';
		 *
		 * @example {@paperscript}
		 * var path = new Path.Rectangle({
		 * 	rectangle: {
		 * 		point: [20, 20],
		 * 		size: [60, 60]
		 * 	},
		 * 	radius: 10,
		 * 	strokeColor: 'black'
		 * });
		 */
		Rectangle: createRectangle,

		/**
		 * @deprecated use {@link #Path.Rectangle(rectangle, size)} instead.
		 */
		RoundRectangle: createRectangle,

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
		 * @example {@paperscript}
		 * var rectangle = new Rectangle({
		 * 	point: [20, 20],
		 * 	size: [180, 60]
		 * });
		 * var path = new Path.Ellipse(rectangle);
		 * path.fillColor = 'black';
		 *
		 * @example {@paperscript}
		 * var path = new Path.Ellipse({
		 * 	point: [20, 20],
		 * 	size: [180, 60],
		 * 	fillColor: 'black'
		 * });
		 */
		Ellipse: createEllipse,

		/**
		 * @deprecated use {@link #Path.Ellipse(rectangle)} instead.
		 */
		Oval: createEllipse,

		/**
		 * Creates a circle shaped Path Item.
		 *
		 * @param {Point} center the center point of the circle
		 * @param {Number} radius the radius of the circle
		 * @return {Path} the newly created path
		 *
		 * @example {@paperscript}
		 * var path = new Path.Circle(new Point(80, 50), 30);
		 * path.strokeColor = 'black';
		 *
		 * @example {@paperscript}
		 * var path = new Path.Circle({
		 * 	center: [80, 50],
		 * 	radius: 30,
		 * 	strokeColor: 'black'
		 * });
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
		 * @example {@paperscript}
		 * var from = new Point(20, 20);
		 * var through = new Point(60, 20);
		 * var to = new Point(80, 80);
		 * var path = new Path.Arc(from, through, to);
		 * path.strokeColor = 'black';
		 *
		 * @example {@paperscript}
		 * var path = new Path.Arc({
		 * 	from: [20, 20],
		 * 	through: [60, 20],
		 * 	to: [80, 80],
		 * 	strokeColor: 'black'
		 * });
		 */
		Arc: function(/* from, through, to */) {
			var from = Point.readNamed(arguments, 'from'),
				through = Point.readNamed(arguments, 'through'),
				to = Point.readNamed(arguments, 'to'),
				path = createPath(arguments);
			path.moveTo(from);
			path.arcTo(through, to);
			return path;
		},

		/**
		 * Creates a regular polygon shaped Path Item.
		 *
		 * @param {Point} center the center point of the polygon
		 * @param {Number} sides the number of sides of the polygon
		 * @param {Number} radius the radius of the polygon
		 * @return {Path} the newly created path
		 *
		 * @example {@paperscript}
		 * var center = new Point(50, 50);
		 * var sides = 3;
		 * var radius = 40;
		 * var triangle = new Path.RegularPolygon(center, sides, radius);
		 * triangle.fillColor = 'black';
		 *
		 * @example {@paperscript}
		 * var triangle = new Path.RegularPolygon({
		 * 	center: [50, 50],
		 * 	sides: 10,
		 * 	radius: 40,
		 * 	fillColor: 'black'
		 * });
		 */
		RegularPolygon: function(/* center, sides, radius */) {
			var center = Point.readNamed(arguments, 'center'),
				sides = Base.readNamed(arguments, 'sides'),
				radius = Base.readNamed(arguments, 'radius'),
				path = createPath(arguments),
				step = 360 / sides,
				three = !(sides % 3),
				vector = new Point(0, three ? -radius : radius),
				offset = three ? -1 : 0.5,
				segments = new Array(sides);
			for (var i = 0; i < sides; i++) {
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
		 * @param {Number} points the number of points of the star
		 * @param {Number} radius1
		 * @param {Number} radius2
		 * @return {Path} the newly created path
		 *
		 * @example {@paperscript}
		 * var center = new Point(50, 50);
		 * var points = 12;
		 * var radius1 = 25;
		 * var radius2 = 40;
		 * var path = new Path.Star(center, points, radius1, radius2);
		 * path.fillColor = 'black';
		 *
		 * @example {@paperscript}
		 * var path = new Path.Star({
		 * 	center: [50, 50],
		 * 	points: 12,
		 * 	radius1: 25,
		 * 	radius2: 40,
		 * 	fillColor: 'black'
		 * });
		 */
		Star: function(/* center, points, radius1, radius2 */) {
			var center = Point.readNamed(arguments, 'center'),
				points = Base.readNamed(arguments, 'points') * 2,
				radius1 = Base.readNamed(arguments, 'radius1'),
				radius2 = Base.readNamed(arguments, 'radius2'),
				path = createPath(arguments),
				step = 360 / points,
				vector = new Point(0, -1),
				segments = new Array(points);
			for (var i = 0; i < points; i++) {
				segments[i] = new Segment(center.add(
					vector.rotate(step * i).multiply(i % 2 ? radius2 : radius1)));
			}
			path._add(segments);
			path._closed = true;
			return path;
		}
	};
}});
