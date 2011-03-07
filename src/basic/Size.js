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

var Size = this.Size = Base.extend({
	initialize: function(arg0, arg1) {
		if (arguments.length == 2) {
			this.width = arg0;
			this.height = arg1;
		} else if (arguments.length == 1) {
			if (arg0 == null) {
				this.width = this.height = 0;
			} else if (arg0.width !== undefined) {
				this.width = arg0.width;
				this.height = arg0.height;
			} else if (arg0.x !== undefined) {
				this.width = arg0.x;
				this.height = arg0.y;
			} else if (Array.isArray(arg0)) {
				this.width = arg0[0];
				this.height = arg0.length > 1 ? arg0[1] : arg0[0];
			} else if (typeof arg0 === 'number') {
				this.width = this.height = arg0;
			} else {
				this.width = this.height = 0;
			}
		} else {
			this.width = this.height = 0;
		}
	},

	set: function(width, height) {
		this.width = width;
		this.height = height;
		return this;
	},

	add: function() {
		var size = Size.read(arguments);
		return Size.create(this.width + size.width, this.height + size.height);
	},

	subtract: function() {
		var size = Size.read(arguments);
		return Size.create(this.width - size.width, this.height - size.height);
	},

	multiply: function() {
		var size = Size.read(arguments);
		return Size.create(this.width * size.width, this.height * size.height);
	},

	divide: function() {
		var size = Size.read(arguments);
		return Size.create(this.width / size.width, this.height / size.height);
	},

	modulo: function() {
		var size = Size.read(arguments);
		return Size.create(this.width % size.width, this.height % size.height);
	},

	negate: function() {
		return Size.create(-this.width, -this.height);
	},

	equals: function() {
		var size = Size.read(arguments);
		return this.width == size.width && this.height == size.height;
	},

	isNaN: function() {
		return isNaN(this.width) || isNaN(this.height);
	},

	round: function() {
		return Size.create(Math.round(this.width), Math.round(this.height));
	},

	ceil: function() {
		return Size.create(Math.ceil(this.width), Math.ceil(this.height));
	},

	floor: function() {
		return Size.create(Math.floor(this.width), Math.floor(this.height));
	},

	abs: function() {
		return Size.create(Math.abs(this.width), Math.abs(this.height));
	},

	dot: function(Size) {
		return this.width * size.width + this.height * size.height;
	},

	toString: function() {
		return '{ x: ' + this.width + ', y: ' + this.height + ' }';
	},

	statics: {
		// See Point.create()
		create: function(width, height) {
			return new Size(Size.dont).set(width, height);
		},

		min: function(Size1, Size2) {
			return Size.create(
				Math.min(Size1.width, Size2.width),
				Math.min(Size1.height, Size2.height));
		},

		max: function(Size1, Size2) {
			return Size.create(
				Math.max(Size1.width, Size2.width),
				Math.max(Size1.height, Size2.height));
		},

		random: function() {
			return Size.create(Math.random(), Math.random());
		}
	}
});
