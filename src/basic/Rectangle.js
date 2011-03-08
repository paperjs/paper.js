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

var Rectangle = this.Rectangle = Base.extend({
	beans: true,

	initialize: function(arg0, arg1, arg2, arg3) {
		if (arguments.length == 1) {
			// Use 0 as defaults, in case we're reading from a Point or Size
			this.x = arg0.x || 0;
			this.y = arg0.y || 0;
			this.width = arg0.width || 0;
			this.height = arg0.height || 0;
		} else if (arguments.length == 2) {
			if (arg1.x !== undefined) {
				// new Rectangle(point1, point2)
				var point1 = Point.read(arguments, 0, 1);
				var point2 = Point.read(arguments, 1, 1);
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
				var point = Point.read(arguments, 0, 1);
				var size = Size.read(arguments, 1, 1);
				this.x = point.x;
				this.y = point.y;
				this.width = size.width;
				this.height = size.height;
			}
		} else if (arguments.length == 4) {
			// new Rectangle(x, y, width, height)
			this.x = arg0;
			this.y = arg1;
			this.width = arg2;
			this.height = arg3;
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
			x1 = Math.max(this.x, rect.x),
			y1 = Math.max(this.y, rect.y),
			x2 = Math.min(this.x + this.width, rect.x + rect.width),
			y2 = Math.min(this.y + this.height, rect.y + rect.height);
		return Rectangle.create(x1, y1, x2 - x1, y2 - y1);
	},

	unite: function() {
		var rect = Rectangle.read(arguments),
			x1 = Math.min(this.x, rect.x),
			y1 = Math.min(this.y, rect.y),
			x2 = Math.max(this.x + this.width, rect.x + rect.width),
			y2 = Math.max(this.y + this.height, rect.y + rect.height);
		return Rectangle.create(x1, y1, x2 - x1, y2 - y1);
	},

	include: function() {
		var point = Point.read(arguments),
			x1 = Math.min(this.x, point.x),
			y1 = Math.min(this.y, point.y),
			x2 = Math.max(this.x + this.width, point.x),
			y2 = Math.max(this.y + this.height, point.y);
		return Rectangle.create(x1, y1, x2 - x1, y2 - y1);
	},

	toString: function() {
		return '{ x: ' + this.x
				+ ', y: ' + this.y
				+ ', width: ' + this.width
				+ ', height: ' + this.height
				+ ' }';
	},

	statics: {
		// See Point.create()
		create: function(x, y, width, height) {
			return new Rectangle(Rectangle.dont).set(x, y, width, height);
		}
	}
}, new function() {
	var keys = [
		['Top', 'Left'], ['Top', 'Right'],
		['Bottom', 'Left'], ['Bottom', 'Right'],
		['Left', 'Center'], ['Top', 'Center'],
		['Right', 'Center'], ['Bottom', 'Center']
	];
	
	return Base.each(keys,
		function(parts, index) {
			var key = parts.join('');
			// find out if the first of the pair is an x or y property,
			// by checking the first character for [R]ight or [L]eft;
			var xFirst = /^[RL]/.test(key);
			// Rename Center to CenterX or CenterY:
			if (index >= 4)
				parts[1] += xFirst ? 'Y' : 'X';
			var x = parts[xFirst ? 0 : 1],
				y = parts[xFirst ? 1 : 0],
				getX = 'get' + x,
				getY = 'get' + y,
				setX = 'set' + x,
				setY = 'set' + y;
			this['get' + key] = function() {
				return Point.create(this[getX](), this[getY]());
			};
			this['set' + key] = function(value) {
				var pt = Point.read(arguments);
				return this[setX](pt.x)[setY](pt.y); // Note: chaining here!
			};
		}, { beans: true });
});
