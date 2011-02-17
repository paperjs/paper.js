new function() {
	var kappa = 2 / 3 * (Math.sqrt(2) - 1);

	var ovalSegments = [
		new Segment([0, 0.5], [0, kappa ], [0, -kappa]),
		new Segment([0.5, 0], [-kappa, 0], [kappa, 0 ]),
		new Segment([1, 0.5], [0, -kappa], [0, kappa ]),
		new Segment([0.5, 1], [kappa, 0 ], [-kappa, 0])
	];
	
	var constructors = {
		Line: function() {
			var path = new Path();
			if (arguments.length == 2) {
				path.addSegment(new Segment(arguments[0]));
				path.addSegment(new Segment(arguments[1]));
			} else if (arguments.length == 4) {
				path.addSegment(Segment.read(arguments[0], arguments[1]));
				path.addSegment(Segment.read(arguments[2], arguments[3]));
			}
			return path;
		},

		Rectangle: function() {
			var path = new Path();
			path.closed = true;
			var rectangle = Rectangle.read(arguments);
			var corners = ['bottomLeft', 'topLeft', 'topRight',
			 		'bottomRight'];
			for (var i = 0; i < 4; i++) {
				path.add(rectangle[corners[i]]);
			}
			return path;
		},

		RoundRectangle: function() {
			var path = new Path();
			var rect, size;
			if (arguments.length == 2) {
				rect = new Rectangle(arguments[0]);
				size = new Size(arguments[1]);
			} else {
				rect = new Rectangle(arguments[0], arguments[1],
					arguments[2], arguments[3]);
				size = new Size(arguments[4], arguments[5]);
			}
			size = Size.min(size, rect.size.divide(2));
			uSize = size.multiply(kappa * 2);

			var bl = rect.bottomLeft;
			path.add(bl.add(size.width, 0), null, [-uSize.width, 0]);
			path.add(bl.subtract(0, size.height), [0, uSize.height], null);

			var tl = rect.topLeft;
			path.add(tl.add(0, size.height), null, [0, -uSize.height]);
			path.add(tl.add(size.width, 0), [-uSize.width, 0], null);

			var tr = rect.topRight;
			path.add(tr.subtract(size.width, 0), null, [uSize.width, 0]);
			path.add(tr.add(0, size.height), [0, -uSize.height], null);

			var br = rect.bottomRight;
			path.add(br.subtract(0, size.height), null, [0, uSize.height]);
			path.add(br.subtract(size.width, 0), [uSize.width, 0], null);

			path.closed = true;
			return path;
		},

		Oval: function() {
			var path = new Path();
			var rect = Rectangle.read(arguments);
			var topLeft = rect.topLeft;
			var size = new Size(rect.width, rect.height);
			for (var i = 0; i < 4; i++) {
				var segment = ovalSegments[i];
				path.addSegment(new Segment(
					segment.point.multiply(size).add(topLeft),
					segment.handleIn.multiply(size),
					segment.handleOut.multiply(size)
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
		}
	};
	
	Path.inject({ statics: constructors });
};