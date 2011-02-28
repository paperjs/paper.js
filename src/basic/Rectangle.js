Rectangle = Base.extend({
	beans: true,

	initialize: function() {
		if (arguments.length == 1) {
			var rect = arguments[0];
			this.x = rect.x;
			this.y = rect.y;
			this.width = rect.width;
			this.height = rect.height;
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
	},

	getPoint: function() {
		return new Point(this.x, this.y);
	},

	setPoint: function() {
		var point = Point.read(arguments);
		this.x = point.x;
		this.y = point.y;
	},

	getSize: function() {
		return new Size(this.width, this.height);
	},

	setSize: function() {
		var size = Size.read(arguments);
		this.width = size.width;
		this.height = size.height;
	},

	getLeft: function() {
		return this.x;
	},

	setLeft: function(left) {
		// right should not move
		this.width -= left - this.x;
		this.x = left;
	},

	getTop: function() {
		return this.y;
	},

	setTop: function(top) {
		this.height -= top - this.y;
		this.y = top;
	},

	getRight: function() {
		return this.x + this.width;
	},

	setRight: function(right) {
		this.width = right - this.x;
	},

	getBottom: function() {
		return this.y + this.height;
	},

	setBottom: function(bottom) {
		this.height = bottom - this.y;
	},

	getCenterX: function() {
		return this.x + this.width * 0.5;
	},

	setCenterX: function(x) {
		this.x = x - this.width * 0.5;
	},

	getCenterY: function() {
		return this.y + this.height * 0.5;
	},

	setCenterY: function(y) {
		this.y = y - this.height * 0.5;
	},

	getCenter: function() {
		return new Point(this.x + this.width * 0.5, this.y + this.height * 0.5);
	},

	setCenter: function() {
		var center = Point.read(arguments);
		this.x = center.x - this.width * 0.5;
		this.y = center.y - this.height * 0.5;
	},

	getTopLeft: function() {
		return new Point(this.left, this.top);
	},

	setTopLeft: function() {
		var topLeft = Point.read(arguments);
		this.left = topLeft.x;
		this.top = topLeft.y;
	},

	getTopRight: function() {
		return new Point(this.right, this.top);
	},

	setTopRight: function() {
		var topRight = Point.read(arguments);
		this.right = topRight.x;
		this.top = topRight.y;
	},

	getBottomLeft: function() {
		return new Point(this.left, this.bottom);
	},

	setBottomLeft: function() {
		var bottomLeft = Point.read(arguments);
		this.left = bottomLeft.x;
		this.bottom = bottomLeft.y;
	},

	getBottomRight: function() {
		return new Point(this.right, this.bottom);
	},

	setBottomRight: function() {
		var bottomRight = Point.read(arguments);
		this.bottom = bottomRight.y;
		this.right = bottomRight.x;
	},

	getLeftCenter: function() {
		return new Point(this.left, this.centerY);
	},

	setLeftCenter: function() {
		var leftCenter = Point.read(arguments);
		this.left = leftCenter.x;
		this.centerY = leftCenter.y;
	},

	getTopCenter: function() {
		return new Point(this.centerX, this.top);
	},

	setTopCenter: function() {
		var topCenter = Point.read(arguments);
		this.centerX = topCenter.x;
		this.top = topCenter.y;
	},

	getRightCenter: function() {
		return new Point(this.right, this.centerY);
	},

	setRightCenter: function() {
		var rightCenter = Point.read(arguments);
		this.right = rightCenter.x;
		this.centerY = rightCenter.y;
	},

	getBottomCenter: function() {
		return new Point(this.centerX, this.bottom);
	},

	setBottomCenter: function() {
		var bottomCenter = Point.read(arguments);
		this.bottom = bottomCenter.y;
		this.centerX = bottomCenter.x;
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
	},

	statics: {
		read: function(args, index) {
			var index = index || 0, length = args.length - index;
			if (length == 1 && args[index] instanceof Rectangle) {
				return args[index];
			} else if (length != 0) {
				var rect = new Rectangle(Rectangle.dont);
				rect.initialize.apply(rect, index > 0
						? Array.prototype.slice.call(args, index) : args);
				return rect;
			}
			return null;
		}
	}
});
