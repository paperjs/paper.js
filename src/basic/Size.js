var Size = Base.extend({
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

	add: function() {
		var size = Size.read(arguments);
		return new Size(this.width + size.width, this.height + size.height);
	},

	subtract: function() {
		var size = Size.read(arguments);
		return new Size(this.width - size.width, this.height - size.height);
	},

	multiply: function() {
		var size = Size.read(arguments);
		return new Size(this.width * size.width, this.height * size.height);
	},

	divide: function() {
		var size = Size.read(arguments);
		return new Size(this.width / size.width, this.height / size.height);
	},

	modulo: function() {
		var size = Size.read(arguments);
		return new Size(this.width % size.width, this.height % size.height);
	},

	negate: function() {
		return new Size(-this.width, -this.height);
	},

	equals: function() {
		var size = Size.read(arguments);
		return this.width == size.width && this.height == size.height;
	},

	isNaN: function() {
		return isNaN(this.width) || isNaN(this.height);
	},

	round: function() {
		return new Size(Math.round(this.width), Math.round(this.height));
	},

	ceil: function() {
		return new Size(Math.ceil(this.width), Math.ceil(this.height));
	},

	floor: function() {
		return new Size(Math.floor(this.width), Math.floor(this.height));
	},

	abs: function() {
		return new Size(Math.abs(this.width), Math.abs(this.height));
	},

	dot: function(Size) {
		return this.width * size.width + this.height * size.height;
	},

	toString: function() {
		return '{ x: ' + this.width + ', y: ' + this.height + ' }';
	},

	statics: {
		read: function(args, index) {
			var index = index || 0, length = args.length - index;
			if (length == 1 && args[index] instanceof Size) {
				return args[index];
			} else if (length != 0) {
				var size = new Size(Size.dont);
				size.initialize.apply(size, index > 0
						? Array.prototype.slice.call(args, index) : args);
				return size;
			}
			return null;
		},

		min: function(Size1, Size2) {
			return new Size(
				Math.min(Size1.width, Size2.width),
				Math.min(Size1.height, Size2.height));
		},

		max: function(Size1, Size2) {
			return new Size(
				Math.max(Size1.width, Size2.width),
				Math.max(Size1.height, Size2.height));
		},

		random: function() {
			return new Size(Math.random(), Math.random());
		}
	}
});
