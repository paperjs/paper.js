Path = PathItem.extend({
	initialize: function() {
		this.base.apply(this, arguments);
	},
	
	statics: {
		Line: PathItem.extend({
			initialize: function() {
				this.base();
				if(arguments.length == 2) {
					console.log(new Segment(arguments[0]));
					this.addSegment(new Segment(arguments[0]));
					this.addSegment(new Segment(arguments[1]));
				} else if(arguments.length == 4) {
					this.addSegment(Segment.read(arguments[0], arguments[1]));
					this.addSegment(Segment.read(arguments[2], arguments[3]));
				}
			}
		}),
		
		Rectangle: PathItem.extend({
			initialize: function() {
				this.base();
				this.closed = true;
				var rectangle = Rectangle.read(arguments);
				var corners = ['getBottomLeft', 'getTopLeft', 'getTopRight', 'getBottomRight'];
				for(var i = 0; i < 4; i++) {
					this.add(rectangle[corners[i]]());
				}
			}
		}),
		
		RoundRectangle: PathItem.extend(new function() {
			var u = 4 / 3 * (Math.sqrt(2) - 1);
			return {
				initialize: function() {
					this.base();
					var rect, size;
					if(arguments.length == 2) {
						rect = new Rectangle(arguments[0]);
						size = new Size(arguments[1]);
					} else {
						rect = new Rectangle(arguments[0], arguments[1],
							arguments[2], arguments[3]);
						size = new Size(arguments[4], arguments[5]);
					}
					size = Size.min(size, rect.getSize().divide(2));
					uSize = size.multiply(u);

					var bl = rect.getBottomLeft();
					this.add(bl.add(size.width, 0), null, [-uSize.width, 0]);
					this.add(bl.subtract(0, size.height), [0, uSize.height], null);

					var tl = rect.getTopLeft();
					this.add(tl.add(0, size.height), null, [0, -uSize.height]);
					this.add(tl.add(size.width, 0), [-uSize.width, 0], null);

					var tr = rect.getTopRight();
					this.add(tr.subtract(size.width, 0), null, [uSize.width, 0]);
					this.add(tr.add(0, size.height), [0, -uSize.height], null);

					var br = rect.getBottomRight();
					this.add(br.subtract(0, size.height), null, [0, uSize.height]);
					this.add(br.subtract(size.width, 0), [uSize.width, 0], null);

					this.closed = true;
				}
			}
		}),
		
		Oval: PathItem.extend(new function() {
			var u = 2 / 3 * (Math.sqrt(2) - 1);
			var segments = [
				{ handleOut: [0, -u], handleIn: [0, u], point: [ 0, 0.5] },
				{ handleOut: [u, 0], handleIn: [-u, 0], point: [ 0.5, 0] },
				{ handleOut: [0, u], handleIn: [0, -u], point: [ 1, 0.5] },
				{ handleOut: [-u, 0], handleIn: [u, 0], point: [0.5, 1] }
			];
			return {
				initialize: function() {
					this.base();
					var rect = Rectangle.read(arguments);
					var topLeft = rect.getTopLeft();
					var size = new Size(rect.width, rect.height);
					for(var i = 0; i < 4; i++) {
						var segment = Segment.read([segments[i]]);
						segment.handleIn = segment.handleIn.multiply(size);
						segment.handleOut = segment.handleOut.multiply(size);
						segment.point = segment.point.multiply(size).add(topLeft);
						this.segments.push(segment);
					}
					this.closed = true;
				}
			}
		}),
		
		Circle: PathItem.extend({
			initialize: function() {
				this.base();
				var center, radius;
				if(arguments.length == 3) {
					center = new Point(arguments[0], arguments[1]);
					radius = arguments[2];
				} else {
					center = new Point(arguments[0]);
					radius = arguments[1];
				}
				var left = center.subtract(radius, 0);
				this.moveTo(left);
				this.arcTo(center.add(radius, 0), true);
				this.arcTo(left, true);
				var last = this.segments.pop();
				this.segments[0].handleIn = last.handleIn;
				this.closed = true;
			}
		}),
		
		Arc: PathItem.extend({
			initialize: function(from, through, to) {
				this.base();
				this.moveTo(from);
				this.arcTo(through, to);
			}
		})
	}
});