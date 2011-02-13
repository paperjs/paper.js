Path = PathItem.extend({
	initialize: function() {
		this.base.apply(this, arguments);
	},
	
	statics: {
		Line: Base.extend({
			initialize: function() {
				var path = new Path();
				if(arguments.length == 2) {
					path.addSegment(new Segment(arguments[0]));
					path.addSegment(new Segment(arguments[1]));
				} else if(arguments.length == 4) {
					path.addSegment(Segment.read(arguments[0], arguments[1]));
					path.addSegment(Segment.read(arguments[2], arguments[3]));
				}
				return path;
			}
		}),
		
		Rectangle: Base.extend({
			initialize: function() {
				var path = new Path();
				path.closed = true;
				var rectangle = Rectangle.read(arguments);
				var corners = ['bottomLeft', 'topLeft', 'topRight', 'bottomRight'];
				for(var i = 0; i < 4; i++) {
					path.add(rectangle[corners[i]]);
				}
				return path;
			}
		}),
		
		RoundRectangle: Base.extend(new function() {
			var u = 4 / 3 * (Math.sqrt(2) - 1);
			return {
				initialize: function() {
					var path = new Path();
					var rect, size;
					if(arguments.length == 2) {
						rect = new Rectangle(arguments[0]);
						size = new Size(arguments[1]);
					} else {
						rect = new Rectangle(arguments[0], arguments[1],
							arguments[2], arguments[3]);
						size = new Size(arguments[4], arguments[5]);
					}
					size = Size.min(size, rect.size.divide(2));
					uSize = size.multiply(u);

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
				}
			}
		}),
		
		Oval: Base.extend(new function() {
			var u = 2 / 3 * (Math.sqrt(2) - 1);
			var segments = [
				{ handleOut: [0, -u], handleIn: [0, u], point: [ 0, 0.5] },
				{ handleOut: [u, 0], handleIn: [-u, 0], point: [ 0.5, 0] },
				{ handleOut: [0, u], handleIn: [0, -u], point: [ 1, 0.5] },
				{ handleOut: [-u, 0], handleIn: [u, 0], point: [0.5, 1] }
			];
			return {
				initialize: function() {
					var path = new Path();
					var rect = Rectangle.read(arguments);
					var topLeft = rect.topLeft;
					var size = new Size(rect.width, rect.height);
					for(var i = 0; i < 4; i++) {
						var segment = Segment.read([segments[i]]);
						segment.handleIn = segment.handleIn.multiply(size);
						segment.handleOut = segment.handleOut.multiply(size);
						segment.point = segment.point.multiply(size).add(topLeft);
						path._segments.push(segment);
					}
					path.closed = true;
					return path;
				}
			}
		}),
		
		Circle: Base.extend({
			initialize: function() {
				var path = new Path();
				var center, radius;
				if(arguments.length == 3) {
					center = new Point(arguments[0], arguments[1]);
					radius = arguments[2];
				} else {
					center = new Point(arguments[0]);
					radius = arguments[1];
				}
				var left = center.subtract(radius, 0);
				path.moveTo(left);
				path.arcTo(center.add(radius, 0), true);
				path.arcTo(left, true);
				var last = path._segments.pop();
				path._segments[0].handleIn = last.handleIn;
				path.closed = true;
				return path;
			}
		}),
		
		Arc: PathItem.extend({
			initialize: function(from, through, to) {
				var path = new Path();
				path.moveTo(from);
				path.arcTo(through, to);
				return path;
			}
		})
	}
});