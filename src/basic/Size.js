var Size = this.Size = Base.extend({
	initialize: function() {
		if (arguments.length == 2) {
			this.width = arguments[0];
			this.height = arguments[1];
		} else if (arguments.length == 1) {
			var arg = arguments[0];
			if (arg == null) {
				this.width = this.height = 0;
			} else if (arg.width !== undefined) {
				this.width = arg.width;
				this.height = arg.height;
			} else if (arg.x !== undefined) {
				this.width = arg.x;
				this.height = arg.y;
			} else if (Array.isArray(arg)) {
				this.width = arg[0];
				this.height = arg.length > 1 ? arg[1] : arg[0];
			} else if (typeof arg === 'number') {
				this.width = this.height = arg;
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
			var size = new Size(Size.dont);
			size.width = width;
			size.height = height;
			return size;
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
