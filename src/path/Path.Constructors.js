/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * All rights reserved. See LICENSE file for details.
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
		Line: function() {
			var path = new Path();
			if (arguments.length == 2) {
				path._add(new Segment(arguments[0]));
				path._add(new Segment(arguments[1]));
			} else if (arguments.length == 4) {
				path._add(new Segment(arguments[0], arguments[1]));
				path._add(new Segment(arguments[2], arguments[3]));
			}
			return path;
		},

		Rectangle: function() {
			var path = new Path(),
				rectangle = Rectangle.read(arguments),
				corners = ['getBottomLeft', 'getTopLeft', 'getTopRight',
						'getBottomRight'];
			for (var i = 0; i < 4; i++) {
				path.add(rectangle[corners[i]]());
			}
			path.closed = true;
			return path;
		},

		RoundRectangle: function() {
			var path = new Path(),
				rect, size;
			if (arguments.length == 2) {
				rect = Rectangle.read(arguments, 0, 1);
				size = Size.read(arguments, 1, 1);
			} else if (arguments.length == 6) {
				rect = Rectangle.read(arguments, 0, 4);
				size = Size.read(arguments, 4, 2);
			}
			size = Size.min(size, rect.getSize().divide(2));
			var uSize = size.multiply(kappa * 2),
				
				bl = rect.getBottomLeft(),
				tl = rect.getTopLeft(),
				tr = rect.getTopRight(),
				br = rect.getBottomRight();

			path.add(bl.add(size.width, 0), null, [-uSize.width, 0]);
			path.add(bl.subtract(0, size.height), [0, uSize.height], null);

			path.add(tl.add(0, size.height), null, [0, -uSize.height]);
			path.add(tl.add(size.width, 0), [-uSize.width, 0], null);

			path.add(tr.subtract(size.width, 0), null, [uSize.width, 0]);
			path.add(tr.add(0, size.height), [0, -uSize.height], null);

			path.add(br.subtract(0, size.height), null, [0, uSize.height]);
			path.add(br.subtract(size.width, 0), [uSize.width, 0], null);

			path.closed = true;
			return path;
		},

		Oval: function() {
			var path = new Path(),
				rect = Rectangle.read(arguments),
				topLeft = rect.getTopLeft(),
				size = new Size(rect.width, rect.height);
			for (var i = 0; i < 4; i++) {
				var segment = ovalSegments[i];
				path._add(new Segment(
					segment._point.multiply(size).add(topLeft),
					segment._handleIn.multiply(size),
					segment._handleOut.multiply(size)
				));
			}
			path.closed = true;
			return path;
		},

		Circle: function() {
			var center, radius;
			if (arguments.length == 3) {
				center = new Point(arguments[0], arguments[1]);
				radius = arguments[2];
			} else {
				center = new Point(arguments[0]);
				radius = arguments[1];
			}
			return Path.Oval(new Rectangle(center.subtract(radius),
					new Size(radius * 2, radius * 2)));
		},

		Arc: function(from, through, to) {
			var path = new Path();
			path.moveTo(from);
			path.arcTo(through, to);
			return path;
		},

		RegularPolygon: function(center, numSides, radius) {
			center = new Point(center);
			var path = new Path(),
				three = !(numSides % 3),
				vector = new Point(0, three ? -radius : radius),
				offset = three ? -1 : 0.5;
			for (var i = 0; i < numSides; i++) {
				var angle = (360 / numSides) * (i + offset);
				path.add(center.add(vector.rotate(angle)));
			}
			path.closed = true;
			return path;
		}
	};
}});
