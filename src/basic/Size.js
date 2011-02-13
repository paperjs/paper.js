var Size = Base.extend({
	initialize: function() {
		if (arguments.length == 2) {
			this.width = arguments[0];
			this.height = arguments[1];
		} else if (arguments.length == 1) {
			var first = arguments[0];
			if (first.width !== undefined || first.height !== undefined) {
				this.width = first.width ? first.width : 0;
				this.height = first.height ? first.height : 0;
			} else if (first.x !== undefined || first.y !== undefined) {
				this.width = first.x ? first.x : 0;
				this.height = first.y ? first.y : 0;
			} else if (first.length !== undefined) {
				this.width = first[0];
				this.height = first.length > 1 ? first[1] : first[0];
			} else if (typeof first === 'number') {
				this.width = this.height = first;
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
		read: function(args) {
			if (args.length == 1 && args[0] instanceof Size) {
				return args[0];
			} else if (args.length) {
				var size = new Size();
				size.initialize.apply(size, args);
				return size;
			}
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
