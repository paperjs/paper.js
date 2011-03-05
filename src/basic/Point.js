/**
 * The Point object represents a point in the two dimensional space of the
 * Paper.js document. It is also used to represent two dimensional vector
 * objects.
 */
var Point = this.Point = Base.extend({
	beans: true,

	initialize: function() {
		if (arguments.length == 2) {
			this.x = arguments[0];
			this.y = arguments[1];
		} else if (arguments.length == 1) {
			var arg = arguments[0];
			if (arg == null) {
				this.x = this.y = 0;
			} else if (arg.x !== undefined) {
				this.x = arg.x;
				this.y = arg.y;
			} else if (arg.width !== undefined) {
				this.x = arg.width;
				this.y = arg.height;
			} else if (Array.isArray(arg)) {
				this.x = arg[0];
				this.y = arg.length > 1 ? arg[1] : arg[0];
			} else if (typeof arg === 'number') {
				this.x = this.y = arg;
			} else {
				this.x = this.y = 0;
			}
		} else {
			this.x = this.y = 0;
		}
	},

	set: function(x, y) {
		this.x = x;
		this.y = y;
		return this;
	},

	/**
	 * Returns a copy of the point.
	 * This is useful as the following code only generates a flat copy:
	 * 
	 * <code>
	 * var point1 = new Point();
	 * var point2 = point1;
	 * point2.x = 1; // also changes point1.x
	 * 
	 * var point2 = point1.clone();
	 * point2.x = 1; // doesn't change point1.x
	 * </code>
	 * 
	 * @return the cloned point
	 */
	clone: function() {
		return Point.create(this.x, this.y);
	},

	add: function() {
		var point = Point.read(arguments);
		return Point.create(this.x + point.x, this.y + point.y);
	},

	subtract: function() {
		var point = Point.read(arguments);
		return Point.create(this.x - point.x, this.y - point.y);
	},

	multiply: function() {
		var point = Point.read(arguments);
		return Point.create(this.x * point.x, this.y * point.y);
	},

	divide: function() {
		var point = Point.read(arguments);
		return Point.create(this.x / point.x, this.y / point.y);
	},

	modulo: function() {
		var point = Point.read(arguments);
		return Point.create(this.x % point.x, this.y % point.y);
	},

	negate: function() {
		return Point.create(-this.x, -this.y);
	},

	equals: function() {
		var point = Point.read(arguments);
		return this.x == point.x && this.y == point.y;
	},

	transform: function(matrix) {
		return matrix.transform(this);
	},

	/**
	 * Returns the distance between the point and another point.
	 * 
	 * Sample code:
	 * <code>
	 * var firstPoint = new Point(5, 10);
	 * var secondPoint = new Point(5, 20);
	 * 
	 * var distance = firstPoint.getDistance(secondPoint);
	 * 
	 * print(distance); // 10
	 * </code>
	 * 
	 * @param px
	 * @param py
	 */
	getDistance: function() {
		var point = Point.read(arguments);
		var px = point.x - this.x;
		var py = point.y - this.y;
		return Math.sqrt(px * px + py * py);
	},

	getDistanceSquared: function() {
		var point = Point.read(arguments);
		var px = point.x - this.x;
		var py = point.y - this.y;
		return px * px + py * py;
	},

	/**
	 * The length of the vector that is represented by this point's coordinates.
	 * Each point can be interpreted as a vector that points from the origin
	 * ({@code x = 0},{@code y = 0}) to the point's location.
	 * Setting the length changes the location but keeps the vector's angle.
	 */
	getLength: function() {
		var point = Point.read(arguments);
		return Math.sqrt(this.x * this.x + this.y * this.y);
	},

	setLength: function(length) {
		if (this.isZero()) {
			if (this._angle != null) {
				var a = this._angle;
				this.x = Math.cos(a) * length;
				this.y = Math.sin(a) * length;
			} else {
				// Assume angle = 0
				this.x = length;
				// y is already 0
			}
		} else {
			var scale = length / this.getLength();
			if (scale == 0.0) {
				// Calculate angle now, so it will be preserved even when
				// x and y are 0
				this.getAngle();
			}
			this.x *= scale;
			this.y *= scale;
		}
		return this;
	},

	normalize: function(length) {
		if (length === null)
			length = 1;
		var len = this.getLength();
		var scale = len != 0 ? length / len : 0;
		var res = Point.create(this.x * scale, this.y * scale);
		// Preserve angle.
		res._angle = this._angle;
		return res;
	},

	getAngleInRadians: function() {
		// TODO: Not sur we want this one, but if so, just rely on
		// this.getAngle(), which caches values internally?
		return Math.atan2(this.y, this.x);
	},

	getAngleInDegrees: function() {
		// TODO: Not sur we want this one, but if so, just rely on
		// this.getAngle(), which caches values internally?
		return Math.atan2(this.y, this.x) * 180 / Math.PI;
	},

	getQuadrant: function() {
		if (this.x >= 0) {
			if (this.y >= 0) {
				return 1;
			} else {
				return 4;
			}
		} else {
			if (this.y >= 0) {
				return 2;
			} else {
				return 3;
			}
		}
	},

	/**
	 * {@grouptitle Angle & Rotation}
	 * 
	 * The vector's angle, measured from the x-axis to the vector.
	 * 
	 * When supplied with a point, returns the smaller angle between two
	 * vectors. The angle is unsigned, no information about rotational
	 * direction is given.
	 * 
	 * Read more about angle units and orientation in the description of the
	 * {@link #getAngle()} property.
	 * 
	 * @param point
	 */
	getAngle: function() {
		var angle;
		if (arguments.length) {
			var point = Point.read(arguments);
			var div = this.getLength() * point.getLength();
			if (div == 0) {
				return NaN;
			} else {
				angle = Math.acos(this.dot(point) / div);
			}
		} else {
			if (this._angle == null)
				this._angle = Math.atan2(this.y, this.x);
			angle = this._angle;
		}
		return angle * 180 / Math.PI;
	},

	setAngle: function(angle) {
		angle = this._angle = angle * Math.PI / 180;
		if (!this.isZero()) {
			var length = this.getLength();
			this.x = Math.cos(angle) * length;
			this.y = Math.sin(angle) * length;
		}
		return this;
	},

	/**
	 * Returns the angle between two vectors. The angle is directional and
	 * signed, giving information about the rotational direction.
	 * 
	 * Read more about angle units and orientation in the description of the
	 * {@link #getAngle()} property.
	 * 
	 * @param point
	 */
	getDirectedAngle: function() {
		var point = Point.read(arguments);
		var angle = this.getAngle() - point.getAngle();
		var bounds = 180;
		if (angle < - bounds) {
			return angle + bounds * 2;
		} else if (angle > bounds) {
			return angle - bounds * 2;
		} else {
			return angle;
		}
	},

	/**
	 * Rotates the point by the given angle around an optional center point.
	 * The object itself is not modified.
	 * 
	 * Read more about angle units and orientation in the description of the
	 * {@link #getAngle()} property.
	 * 
	 * @param angle the rotation angle
	 * @param center the center point of the rotation
	 * @return the rotated point
	 */
	rotate: function(angle, center) {
		var point = center ? this.subtract(center) : this;
		angle = angle * Math.PI / 180;
		var s = Math.sin(angle);
		var c = Math.cos(angle);
		point = Point.create(
			point.x * c - point.y * s,
			point.y * c + point.x * s
		);
		return center ? point.add(center) : point;
	},

	/**
	 * Returns the interpolation point between the point and another point.
	 * The object itself is not modified!
	 * 
	 * @param point
	 * @param t the position between the two points as a value between 0 and 1
	 * @return the interpolation point
	 * 
	 * @jshide
	 */
	interpolate: function(point, t) {
		return Point.create(
			this.x * (1 - t) + point.x * t,
			this.y * (1 - t) + point.y * t
		);
	},

	/**
	 * {@grouptitle Tests}
	 * 
	 * Checks whether the point is inside the boundaries of the rectangle.
	 * 
	 * @param rect the rectangle to check against
	 * @return {@true if the point is inside the rectangle}
	 */
	isInside: function(rect) {
		return rect.contains(this);
	},

	/**
	 * Checks if the point is within a given distance of another point.
	 * 
	 * @param point the point to check against
	 * @param tolerance the maximum distance allowed
	 * @return {@true if it is within the given distance}
	 */
	isClose: function(point, tolerance) {
		return this.getDistance(point) < tolerance;
	},

	/**
	 * Checks if the vector represented by this point is parallel (collinear) to
	 * another vector.
	 * 
	 * @param point the vector to check against
	 * @return {@true if it is parallel}
	 */
	isParallel: function(point) {
		return Math.abs(this.x / point.x - this.y / point.y) < 0.00001;
	},

	/**
	 * Checks if this point has both the x and y coordinate set to 0. 
	 * 
	 * @return {@true if both x and y are 0}
	 */
	isZero: function() {
		return this.x == 0 && this.y == 0;
	},

	/**
	 * Checks if this point has an undefined value for at least one of its
	 * coordinates.
	 * 
	 * @return {@true if either x or y are not a number}
	 */
	isNaN: function() {
		return isNaN(this.x) || isNaN(this.y);
	},

	/**
	 * {@grouptitle Math Functions}
	 * 
	 * Returns a new point with rounded {@link #x} and {@link #y} values. The
	 * object itself is not modified!
	 * 
	 * Sample code:
	 * <code>
	 * var point = new Point(10.2, 10.9);
	 * var roundPoint = point.round();
	 * print(roundPoint); // { x: 10.0, y: 11.0 }
	 * </code>
	 */
	round: function() {
		return Point.create(Math.round(this.x), Math.round(this.y));
	},

	/**
	 * Returns a new point with the nearest greater non-fractional values to the
	 * specified {@link #x} and {@link #y} values. The object itself is not
	 * modified!
	 * 
	 * Sample code:
	 * <code>
	 * var point = new Point(10.2, 10.9);
	 * var ceilPoint = point.ceil();
	 * print(ceilPoint); // { x: 11.0, y: 11.0 }
	 * </code>
	 */
	ceil: function() {
		return Point.create(Math.ceil(this.x), Math.ceil(this.y));
	},

	/**
	 * Returns a new point with the nearest smaller non-fractional values to the
	 * specified {@link #x} and {@link #y} values. The object itself is not
	 * modified!
	 * 
	 * Sample code:
	 * <code>
	 * var point = new Point(10.2, 10.9);
	 * var floorPoint = point.floor();
	 * print(floorPoint); // { x: 10.0, y: 10.0 }
	 * </code>
	 */
	floor: function() {
		return Point.create(Math.floor(this.x), Math.floor(this.y));
	},

	/**
	 * Returns a new point with the absolute values of the specified {@link #x}
	 * and {@link #y} values. The object itself is not modified!
	 * 
	 * Sample code:
	 * <code>
	 * var point = new Point(-5, 10);
	 * var absPoint = point.abs();
	 * print(absPoint); // { x: 5.0, y: 10.0 }
	 * </code>
	 */
	abs: function() {
		return Point.create(Math.abs(this.x), Math.abs(this.y));
	},

	/**
	 * {@grouptitle Vectorial Math Functions}
	 * 
	 * Returns the dot product of the point and another point.
	 * @param point
	 * @return the dot product of the two points
	 */
	dot: function() {
		var point = Point.read(arguments);
		return this.x * point.x + this.y * point.y;
	},

	/**
	 * Returns the cross product of the point and another point.
	 * @param point
	 * @return the cross product of the two points
	 */
	cross: function() {
		var point = Point.read(arguments);
		return this.x * point.y - this.y - point.x;
	},

	/**
	 * Returns the projection of the point on another point.
	 * Both points are interpreted as vectors.
	 * 
	 * @param point
	 * @return the project of the point on another point
	 */
	project: function() {
		var point = Point.read(arguments);
		if (point.isZero()) {
			return Point.create(0, 0);
		} else {
			var scale = this.dot(point) / point.dot(point);
			return Point.create(
				point.x * scale,
				point.y * scale
			);
		}
	},

	toString: function() {
		return '{ x: ' + this.x + ', y: ' + this.y + ' }';
	},

	statics: {
		/**
		 * Provide a faster creator for Points out of two coordinates that
		 * does not rely on Point#initialize at all. This speeds up all math
		 * operations a lot.
		 */
		create: function(x, y) {
			var point = new Point(Point.dont);
			point.x = x;
			point.y = y;
			return point;
		},

		/**
		 * Returns a new point object with the smallest {@link #x} and
		 * {@link #y} of the supplied points.
		 * 
		 * Sample code:
		 * <code>
		 * var point1 = new Point(10, 100);
		 * var point2 = new Point(200, 5);
		 * var minPoint = Point.min(point1, point2);
		 * print(minPoint); // { x: 10.0, y: 5.0 }
		 * </code>
		 * 
		 * @param point1
		 * @param point2
		 * @return The newly created point object
		 */
		min: function(point1, point2) {
			return Point.create(
				Math.min(point1.x, point2.x),
				Math.min(point1.y, point2.y));
		},

		/**
		 * Returns a new point object with the largest {@link #x} and
		 * {@link #y} of the supplied points.
		 * 
		 * Sample code:
		 * <code>
		 * var point1 = new Point(10, 100);
		 * var point2 = new Point(200, 5);
		 * var maxPoint = Point.max(point1, point2);
		 * print(maxPoint); // { x: 200.0, y: 100.0 }
		 * </code>
		 * 
		 * @param point1
		 * @param point2
		 * @return The newly created point object
		 */
		max: function(point1, point2) {
			return Point.create(
				Math.max(point1.x, point2.x),
				Math.max(point1.y, point2.y));
		},

		/**
		 * Returns a point object with random {@link #x} and {@link #y} values
		 * between {@code 0} and {@code 1}.
		 * 
		 * Sample code:
		 * <code>
		 * var maxPoint = new Point(100, 100);
		 * var randomPoint = Point.random();
		 * 
		 * // A point between {x:0, y:0} and {x:100, y:100}:
		 * var point = maxPoint * randomPoint;
		 * </code>
		 */
		random: function() {
			return Point.create(Math.random(), Math.random());
		}
	}
});
