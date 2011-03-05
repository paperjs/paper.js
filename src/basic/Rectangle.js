var Rectangle = this.Rectangle = Base.extend({
	beans: true,

	initialize: function() {
		if (arguments.length == 1) {
			var rect = arguments[0];
			// Use 0 as defaults, in case we're reading from a Point or Size
			this.x = rect.x || 0;
			this.y = rect.y || 0;
			this.width = rect.width || 0;
			this.height = rect.height || 0;
		} else if (arguments.length == 2) {
			if (arguments[1].x !== undefined) {
				// new Rectangle(point1, point2)
				var point1 = new Point(arguments[0]);
				var point2 = new Point(arguments[1]);
				this.x = point1.x;
				this.y = point1.y;
				this.width = point2.x - point1.x;
				this.height = point2.y - point1.y;
				if (this.width < 0) {
					this.x = point2.x;
					this.width = -this.width;
				}
				if (this.height < 0) {
					this.y = point2.y;
					this.height = -this.height;
				}
			} else {
				// new Rectangle(point, size)
				var point = new Point(arguments[0]);
				var size = new Size(arguments[1]);
				this.x = point.x;
				this.y = point.y;
				this.width = size.width;
				this.height = size.height;
			}
		} else if (arguments.length == 4) {
			// new Rectangle(x, y, width, height)
			this.x = arguments[0];
			this.y = arguments[1];
			this.width = arguments[2];
			this.height = arguments[3];
		} else {
			// new Rectangle()
			this.x = this.y = this.width = this.height = 0;
		}
	},

	set: function(x, y, width, height) {
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
		return this;
	},

	getPoint: function() {
		return Point.create(this.x, this.y);
	},

	setPoint: function() {
		var point = Point.read(arguments);
		this.x = point.x;
		this.y = point.y;
		return this;
	},

	getSize: function() {
		return Size.create(this.width, this.height);
	},

	setSize: function() {
		var size = Size.read(arguments);
		this.width = size.width;
		this.height = size.height;
		return this;
	},

	getLeft: function() {
		return this.x;
	},

	setLeft: function(left) {
		// right should not move
		this.width -= left - this.x;
		this.x = left;
		return this;
	},

	getTop: function() {
		return this.y;
	},

	setTop: function(top) {
		this.height -= top - this.y;
		this.y = top;
		return this;
	},

	getRight: function() {
		return this.x + this.width;
	},

	setRight: function(right) {
		this.width = right - this.x;
		return this;
	},

	getBottom: function() {
		return this.y + this.height;
	},

	setBottom: function(bottom) {
		this.height = bottom - this.y;
		return this;
	},

	getCenterX: function() {
		return this.x + this.width * 0.5;
	},

	setCenterX: function(x) {
		this.x = x - this.width * 0.5;
		return this;
	},

	getCenterY: function() {
		return this.y + this.height * 0.5;
	},

	setCenterY: function(y) {
		this.y = y - this.height * 0.5;
		return this;
	},

	getCenter: function() {
		return Point.create(this.getCenterX(), this.getCenterY());
	},

	setCenter: function() {
		var pt = Point.read(arguments);
		return this.setCenterX(pt.x).setCenterY(pt.y);
	},

	getTopLeft: function() {
		return Point.create(this.getLeft(), this.getTop());
	},

	setTopLeft: function() {
		var pt = Point.read(arguments);
		return this.setLeft(pt.x).setTop(pt.y);
	},

	getTopRight: function() {
		return Point.create(this.getRight(), this.getTop());
	},

	setTopRight: function() {
		var pt = Point.read(arguments);
		return this.setRight(pt.x).setTop(pt.y);
	},

	getBottomLeft: function() {
		return Point.create(this.getLeft(), this.getBottom());
	},

	setBottomLeft: function() {
		var pt = Point.read(arguments);
		return this.setLeft(pt.x).setBottom(pt.y);
	},

	getBottomRight: function() {
		return Point.create(this.getRight(), this.getBottom());
	},

	setBottomRight: function() {
		var pt = Point.read(arguments);
		return this.setRight(pt.x).setBottom(pt.y);
	},

	getLeftCenter: function() {
		return Point.create(this.getLeft(), this.getCenterY());
	},

	setLeftCenter: function() {
		var pt = Point.read(arguments);
		return this.setLeft(pt.x).setCenterY(pt.y);
	},

	getTopCenter: function() {
		return Point.create(this.getCenterX(), this.getTop());
	},

	setTopCenter: function() {
		var pt = Point.read(arguments);
		return this.setCenterX(pt.x).setTop(pt.y);
	},

	getRightCenter: function() {
		return Point.create(this.getRight(), this.getCenterY());
	},

	setRightCenter: function() {
		var pt = Point.read(arguments);
		return this.setRight(pt.x).setCenterY(pt.y);
	},

	getBottomCenter: function() {
		return Point.create(this.getCenterX(), this.getBottom());
	},

	setBottomCenter: function() {
		var pt = Point.read(arguments);
		return this.setCenterX(pt.x).setBottom(pt.y);
	},

	clone: function() {
		return new Rectangle(this);
	},

	equals: function() {
		var rect = Rectangle.read(arguments);
		return this.x == rect.x && this.y == rect.y
				&& this.width == rect.width && this.height == rect.height;
	},

	isEmpty: function() {
		return this.width == 0 || this.height == 0;
	},

	contains: function(rect) {
		if (rect.width !== undefined) {
			return rect.x >= this.x && rect.y >= this.y
					&& rect.x + rect.width <= this.x + this.width
					&& rect.y + rect.height <= this.y + this.height;
		} else {
			var point = Point.read(arguments);
			return point.x >= this.x && point.y >= this.y
					&& point.x <= this.x + this.width
					&& point.y <= this.y + this.height;
		}
	},

	intersects: function() {
		var rect = Rectangle.read(arguments);
		return rect.x + rect.width > this.x
				&& rect.y + rect.height > this.y
				&& rect.x < this.x + this.width
				&& rect.y < this.y + this.height;
	},

	intersect: function() {
		var rect = Rectangle.read(arguments);
		var x1 = Math.max(this.x, rect.x);
		var y1 = Math.max(this.y, rect.y);
		var x2 = Math.min(this.x + this.width, rect.x + rect.width);
		var y2 = Math.min(this.y + this.height, rect.y + rect.height);
		return new Rectangle(x1, y1, x2 - x1, y2 - y1);
	},

	unite: function() {
		var rect = Rectangle.read(arguments);
		var x1 = Math.min(this.x, rect.x);
		var y1 = Math.min(this.y, rect.y);
		var x2 = Math.max(this.x + this.width, rect.x + rect.width);
		var y2 = Math.max(this.y + this.height, rect.y + rect.height);
		return new Rectangle(x1, y1, x2 - x1, y2 - y1);
	},

	include: function() {
		var point = Point.read(arguments);
		var x1 = Math.min(this.x, point.x);
		var y1 = Math.min(this.y, point.y);
		var x2 = Math.max(this.x + this.width, point.x);
		var y2 = Math.max(this.y + this.height, point.y);
		return new Rectangle(x1, y1, x2 - x1, y2 - y1);
	},

	toString: function() {
		return '{ x: ' + this.x
				+ ', y: ' + this.y
				+ ', width: ' + this.width
				+ ', height: ' + this.height
				+ ' }';
	}
});
