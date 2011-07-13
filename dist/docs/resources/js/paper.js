/***
 *
 * Paper.js
 *
 * A JavaScript Vector Graphics Library, based on Scriptographer.org and
 * designed to be largely API compatible.
 * http://Paperjs.org/
 * http://scriptographer.org/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * All rights reserved.
 *
 ***
 *
 * Bootstrap.js JavaScript Framework.
 * http://bootstrapjs.org/
 *
 * Distributed under the MIT license.
 *
 * Copyright (c) 2006 - 2011 Juerg Lehni
 * http://lehni.org/
 *
 ***
 *
 * Parse-JS, A JavaScript tokenizer / parser / generator.
 *
 * Distributed under the BSD license.
 *
 * Copyright (c) 2010, Mihai Bazon <mihai.bazon@gmail.com>
 * http://mihai.bazon.net/blog/
 *
 ***/

var paper = new function() {

var Base = new function() { 
	var fix = !this.__proto__,
		hidden = /^(statics|generics|preserve|enumerable|beans|prototype|__proto__|toString|valueOf)$/,
		proto = Object.prototype,
		has = fix
			? function(name) {
				return name !== '__proto__' && this.hasOwnProperty(name);
			}
			: proto.hasOwnProperty,
		toString = proto.toString,
		proto = Array.prototype,
		isArray = Array.isArray = Array.isArray || function(obj) {
			return toString.call(obj) === '[object Array]';
		},
		slice = proto.slice,
		forEach = proto.forEach = proto.forEach || function(iter, bind) {
			for (var i = 0, l = this.length; i < l; i++)
				iter.call(bind, this[i], i, this);
		},
		forIn = function(iter, bind) {
			for (var i in this)
				if (this.hasOwnProperty(i))
					iter.call(bind, this[i], i, this);
		},
		_define = Object.defineProperty,
		_describe = Object.getOwnPropertyDescriptor;

	function define(obj, name, desc) {
		if (_define) {
			try {
				delete obj[name];
				return _define(obj, name, desc);
			} catch (e) {}
		}
		if ((desc.get || desc.set) && obj.__defineGetter__) {
			desc.get && obj.__defineGetter__(name, desc.get);
			desc.set && obj.__defineSetter__(name, desc.set);
		} else {
			obj[name] = desc.value;
		}
		return obj;
	}

	function describe(obj, name) {
		if (_describe) {
			try {
				return _describe(obj, name);
			} catch (e) {}
		}
		var get = obj.__lookupGetter__ && obj.__lookupGetter__(name);
		return get
			? { get: get, set: obj.__lookupSetter__(name), enumerable: true,
					configurable: true }
			: has.call(obj, name)
				? { value: obj[name], enumerable: true, configurable: true,
						writable: true }
				: null;
	}

	function inject(dest, src, enumerable, base, preserve, generics) {
		var beans, bean;

		function field(name, val, dontCheck, generics) {
			var val = val || (val = describe(src, name))
					&& (val.get ? val : val.value),
				func = typeof val === 'function',
				res = val,
				prev = preserve || func
					? (val && val.get ? name in dest : dest[name]) : null;
			if (generics && func && (!preserve || !generics[name])) {
				generics[name] = function(bind) {
					return bind && dest[name].apply(bind,
							slice.call(arguments, 1));
				}
			}
			if ((dontCheck || val !== undefined && has.call(src, name))
					&& (!preserve || !prev)) {
				if (func) {
					if (prev && /\bthis\.base\b/.test(val)) {
						var fromBase = base && base[name] == prev;
						res = function() {
							var tmp = describe(this, 'base');
							define(this, 'base', { value: fromBase
								? base[name] : prev, configurable: true });
							try {
								return val.apply(this, arguments);
							} finally {
								tmp ? define(this, 'base', tmp)
									: delete this.base;
							}
						};
						res.toString = function() {
							return val.toString();
						}
						res.valueOf = function() {
							return val.valueOf();
						}
					}
					if (beans && val.length == 0
							&& (bean = name.match(/^(get|is)(([A-Z])(.*))$/)))
						beans.push([ bean[3].toLowerCase() + bean[4], bean[2] ]);
				}
				if (!res || func || !res.get && !res.set)
					res = { value: res, writable: true };
				if ((describe(dest, name)
						|| { configurable: true }).configurable) {
					res.configurable = true;
					res.enumerable = enumerable;
				}
				define(dest, name, res);
			}
		}
		if (src) {
			beans = src.beans && [];
			for (var name in src)
				if (has.call(src, name) && !hidden.test(name))
					field(name, null, true, generics);
			field('toString');
			field('valueOf');
			for (var i = 0, l = beans && beans.length; i < l; i++)
				try {
					var bean = beans[i], part = bean[1];
					field(bean[0], {
						get: dest['get' + part] || dest['is' + part],
						set: dest['set' + part]
					}, true);
				} catch (e) {}
		}
		return dest;
	}

	function extend(obj) {
		var ctor = function(dont) {
			if (fix) define(this, '__proto__', { value: obj });
			if (this.initialize && dont !== ctor.dont)
				return this.initialize.apply(this, arguments);
		}
		ctor.prototype = obj;
		ctor.toString = function() {
			return (this.prototype.initialize || function() {}).toString();
		}
		return ctor;
	}

	function iterator(iter) {
		return !iter
			? function(val) { return val }
			: typeof iter !== 'function'
				? function(val) { return val == iter }
				: iter;
	}

	function each(obj, iter, bind, asArray) {
		try {
			if (obj)
				(asArray || asArray === undefined && isArray(obj)
					? forEach : forIn).call(obj, iterator(iter),
						bind = bind || obj);
		} catch (e) {
			if (e !== Base.stop) throw e;
		}
		return bind;
	}

	function clone(obj) {
		return each(obj, function(val, i) {
			this[i] = val;
		}, new obj.constructor());
	}

	return inject(function() {}, {
		inject: function(src) {
			if (src) {
				var proto = this.prototype,
					base = proto.__proto__ && proto.__proto__.constructor,
					statics = src.statics == true ? src : src.statics;
				if (statics != src)
					inject(proto, src, src.enumerable, base && base.prototype,
							src.preserve, src.generics && this);
				inject(this, statics, true, base, src.preserve);
			}
			for (var i = 1, l = arguments.length; i < l; i++)
				this.inject(arguments[i]);
			return this;
		},

		extend: function(src) {
			var proto = new this(this.dont),
				ctor = extend(proto);
			define(proto, 'constructor',
					{ value: ctor, writable: true, configurable: true });
			ctor.dont = {};
			inject(ctor, this, true);
			return arguments.length ? this.inject.apply(ctor, arguments) : ctor;
		}
	}, true).inject({
		has: has,
		each: each,

		inject: function() {
			for (var i = 0, l = arguments.length; i < l; i++)
				inject(this, arguments[i]);
			return this;
		},

		extend: function() {
			var res = new (extend(this));
			return res.inject.apply(res, arguments);
		},

		each: function(iter, bind) {
			return each(this, iter, bind);
		},

		clone: function() {
			return clone(this);
		},

		statics: {
			each: each,
			clone: clone,
			define: define,
			describe: describe,
			iterator: iterator,

			has: function(obj, name) {
				return has.call(obj, name);
			},

			type: function(obj) {
				return (obj || obj === 0) && (obj._type || typeof obj) || null;
			},

			check: function(obj) {
				return !!(obj || obj === 0);
			},

			pick: function() {
				for (var i = 0, l = arguments.length; i < l; i++)
					if (arguments[i] !== undefined)
						return arguments[i];
				return null;
			},

			stop: {}
		}
	});
}

this.Base = Base.inject({

	clone: function() {
		return new this.constructor(this);
	},

	statics: {
		read: function(list, start, length) {
			var start = start || 0,
				length = length || list.length - start;
			var obj = list[start];
			if (obj instanceof this
					|| this.prototype._readNull && obj == null && length <= 1)
				return obj;
			obj = new this(this.dont);
			return obj.initialize.apply(obj, start > 0 || length < list.length
				? Array.prototype.slice.call(list, start, start + length)
				: list) || obj;
		},

		readAll: function(list, start) {
			var res = [], entry;
			for (var i = start || 0, l = list.length; i < l; i++) {
				res.push(Array.isArray(entry = list[i])
					? this.read(entry, 0)
					: this.read(list, i, 1));
			}
			return res;
		},

		initialize: function(object, values, defaults) {
			if (!values)
				values = defaults;
			return Base.each(defaults, function(value, key) {
				this[key] = values[key] || value;
			}, object);
		},

		splice: function(list, items, index, remove) {
			var amount = items && items.length,
				append = index === undefined;
			index = append ? list.length : index;
			for (var i = 0; i < amount; i++)
				items[i]._index = index + i;
			if (append) {
				list.push.apply(list, items);
				return [];
			} else {
				var args = [index, remove];
				if (items)
					args.push.apply(args, items);
				var removed = list.splice.apply(list, args);
				for (var i = 0, l = removed.length; i < l; i++)
					delete removed[i]._index;
				for (var i = index + amount, l = list.length; i < l; i++)
					list[i]._index = i;
				return removed;
			}
		},

		capitalize: function(str) {
			return str.replace(/\b[a-z]/g, function(match) {
				return match.toUpperCase();
			});
		},

		camelize: function(str) {
			return str.replace(/-(\w)/g, function(all, chr) {
				return chr.toUpperCase();
			});
		},

		formatNumber: function(num) {
			return (Math.round(num * 100000) / 100000).toString();
		},

		formatObject: function(obj) {
			return '{ ' + Base.each(obj, function(value, key) {
				this.push(key + ': ' + value);
			}, []).join(', ') + ' }';
		}
	}
});

var PaperScope = this.PaperScope = Base.extend({

	initialize: function(id) {
		this.project = null;

		this.projects = [];

		this.view = null;
		this.views = [];

		this.tool = null;
		this.tools = [];
		this.id = id;
		PaperScope._scopes[id] = this;

	},

	evaluate: function(code) {
		return PaperScript.evaluate(code, this);
	},

	install: function(scope) {
		return Base.each(this, function(value, key) {
			this[key] = value;
		}, scope);
	},

	clear: function() {
		for (var i = this.projects.length - 1; i >= 0; i--)
			this.projects[i].remove();
		for (var i = this.views.length - 1; i >= 0; i--)
			this.views[i].remove();
		for (var i = this.tools.length - 1; i >= 0; i--)
			this.tools[i].remove();
	},

	remove: function() {
		this.clear();
		delete PaperScope._scopes[this.id];
	},

	statics: {
		_scopes: {},

		get: function(id) {
			if (typeof id === 'object')
				id = id.getAttribute('id');
			return this._scopes[id] || null;
		}
	}
});

var Point = this.Point = Base.extend({

	beans: true,

	initialize: function(arg0, arg1) {
		if (arg1 !== undefined) {
			this.x = arg0;
			this.y = arg1;
		} else if (arg0 !== undefined) {
			if (arg0 == null) {
				this.x = this.y = 0;
			} else if (arg0.x !== undefined) {
				this.x = arg0.x;
				this.y = arg0.y;
			} else if (arg0.width !== undefined) {
				this.x = arg0.width;
				this.y = arg0.height;
			} else if (Array.isArray(arg0)) {
				this.x = arg0[0];
				this.y = arg0.length > 1 ? arg0[1] : arg0[0];
			} else if (arg0.angle !== undefined) {
				this.x = arg0.length;
				this.y = 0;
				this.setAngle(arg0.angle);
			} else if (typeof arg0 === 'number') {
				this.x = this.y = arg0;
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

	clone: function() {
		return Point.create(this.x, this.y);
	},

	toString: function() {
		var format = Base.formatNumber;
		return '{ x: ' + format(this.x) + ', y: ' + format(this.y) + ' }';
	},

	add: function(point) {
		point = Point.read(arguments);
		return Point.create(this.x + point.x, this.y + point.y);
	},

	subtract: function(point) {
		point = Point.read(arguments);
		return Point.create(this.x - point.x, this.y - point.y);
	},

	multiply: function(point) {
		point = Point.read(arguments);
		return Point.create(this.x * point.x, this.y * point.y);
	},

	divide: function(point) {
		point = Point.read(arguments);
		return Point.create(this.x / point.x, this.y / point.y);
	},

	modulo: function(point) {
		point = Point.read(arguments);
		return Point.create(this.x % point.x, this.y % point.y);
	},

	negate: function() {
		return Point.create(-this.x, -this.y);
	},

	transform: function(matrix) {
		return matrix._transformPoint(this);
	},

	getDistance: function(point) {
		point = Point.read(arguments);
		var x = point.x - this.x,
			y = point.y - this.y;
		return Math.sqrt(x * x + y * y);
	},

	getLength: function() {
		return Math.sqrt(this.x * this.x + this.y * this.y);
	},

	setLength: function(length) {
		if (this.isZero()) {
			var angle = this._angle || 0;
			this.set(
				Math.cos(angle) * length,
				Math.sin(angle) * length
			);
		} else {
			var scale = length / this.getLength();
			if (scale == 0)
				this.getAngle();
			this.set(
				this.x * scale,
				this.y * scale
			);
		}
		return this;
	},

	normalize: function(length) {
		if (length === undefined)
			length = 1;
		var current = this.getLength(),
			scale = current != 0 ? length / current : 0,
			point = Point.create(this.x * scale, this.y * scale);
		point._angle = this._angle;
		return point;
	},

	getAngle: function() {
		return this.getAngleInRadians(arguments[0]) * 180 / Math.PI;
	},

	setAngle: function(angle) {
		angle = this._angle = angle * Math.PI / 180;
		if (!this.isZero()) {
			var length = this.getLength();
			this.set(
				Math.cos(angle) * length,
				Math.sin(angle) * length
			);
		}
		return this;
	},

	getAngleInRadians: function() {
		if (arguments[0] === undefined) {
			if (this._angle == null)
				this._angle = Math.atan2(this.y, this.x);
			return this._angle;
		} else {
			var point = Point.read(arguments),
				div = this.getLength() * point.getLength();
			if (div == 0) {
				return NaN;
			} else {
				return Math.acos(this.dot(point) / div);
			}
		}
	},

	getAngleInDegrees: function() {
		return this.getAngle(arguments[0]);
	},

	getQuadrant: function() {
		return this.x >= 0 ? this.y >= 0 ? 1 : 4 : this.y >= 0 ? 2 : 3;
	},

	getDirectedAngle: function(point) {
		point = Point.read(arguments);
		var angle = this.getAngle() - point.getAngle();
		return angle < -180 ? angle + 360 : angle > 180 ? angle - 360 : angle;
	},

	rotate: function(angle, center) {
		angle = angle * Math.PI / 180;
		var point = center ? this.subtract(center) : this,
			s = Math.sin(angle),
			c = Math.cos(angle);
		point = Point.create(
			point.x * c - point.y * s,
			point.y * c + point.x * s
		);
		return center ? point.add(center) : point;
	},

	equals: function(point) {
		point = Point.read(arguments);
		return this.x == point.x && this.y == point.y;
	},

	isInside: function(rect) {
		return rect.contains(this);
	},

	isClose: function(point, tolerance) {
		return this.getDistance(point) < tolerance;
	},

	isColinear: function(point) {
		return this.cross(point) < Numerical.TOLERANCE;
	},

	isOrthogonal: function(point) {
		return this.dot(point) < Numerical.TOLERANCE;
	},

	isZero: function() {
		return this.x == 0 && this.y == 0;
	},

	isNaN: function() {
		return isNaN(this.x) || isNaN(this.y);
	},
	dot: function(point) {
		point = Point.read(arguments);
		return this.x * point.x + this.y * point.y;
	},

	cross: function(point) {
		point = Point.read(arguments);
		return this.x * point.y - this.y * point.x;
	},

	project: function(point) {
		point = Point.read(arguments);
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

	statics: {

		create: function(x, y) {
			var point = new Point(Point.dont);
			point.x = x;
			point.y = y;
			return point;
		},

		min: function(point1, point2) {
			point1 = Point.read(arguments, 0, 1);
			point2 = Point.read(arguments, 1, 1);
			return Point.create(
				Math.min(point1.x, point2.x),
				Math.min(point1.y, point2.y)
			);
		},

		max: function(point1, point2) {
			point1 = Point.read(arguments, 0, 1);
			point2 = Point.read(arguments, 1, 1);
			return Point.create(
				Math.max(point1.x, point2.x),
				Math.max(point1.y, point2.y)
			);
		},

		random: function() {
			return Point.create(Math.random(), Math.random());
		}
	}
}, new function() { 

	return Base.each(['round', 'ceil', 'floor', 'abs'], function(name) {
		var op = Math[name];
		this[name] = function() {
			return Point.create(op(this.x), op(this.y));
		};
	}, {});
});

var LinkedPoint = Point.extend({
	beans: true,

	set: function(x, y, dontNotify) {
		this._x = x;
		this._y = y;
		if (!dontNotify)
			this._owner[this._setter](this);
		return this;
	},

	getX: function() {
		return this._x;
	},

	setX: function(x) {
		this._x = x;
		this._owner[this._setter](this);
	},

	getY: function() {
		return this._y;
	},

	setY: function(y) {
		this._y = y;
		this._owner[this._setter](this);
	},

	statics: {
		create: function(owner, setter, x, y) {
			var point = new LinkedPoint(LinkedPoint.dont);
			point._x = x;
			point._y = y;
			point._owner = owner;
			point._setter = setter;
			return point;
		}
	}
});

var Size = this.Size = Base.extend({

	initialize: function(arg0, arg1) {
		if (arg1 !== undefined) {
			this.width = arg0;
			this.height = arg1;
		} else if (arg0 !== undefined) {
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

	toString: function() {
		var format = Base.formatNumber;
		return '{ width: ' + format(this.width)
				+ ', height: ' + format(this.height) + ' }';
	},

	set: function(width, height) {
		this.width = width;
		this.height = height;
		return this;
	},

	add: function(size) {
		size = Size.read(arguments);
		return Size.create(this.width + size.width, this.height + size.height);
	},

	subtract: function(size) {
		size = Size.read(arguments);
		return Size.create(this.width - size.width, this.height - size.height);
	},

	multiply: function(size) {
		size = Size.read(arguments);
		return Size.create(this.width * size.width, this.height * size.height);
	},

	divide: function(size) {
		size = Size.read(arguments);
		return Size.create(this.width / size.width, this.height / size.height);
	},

	modulo: function(size) {
		size = Size.read(arguments);
		return Size.create(this.width % size.width, this.height % size.height);
	},

	negate: function() {
		return Size.create(-this.width, -this.height);
	},

	equals: function(size) {
		size = Size.read(arguments);
		return this.width == size.width && this.height == size.height;
	},

	isZero: function() {
		return this.width == 0 && this.width == 0;
	},

	isNaN: function() {
		return isNaN(this.width) || isNaN(this.height);
	},

	statics: {

		create: function(width, height) {
			return new Size(Size.dont).set(width, height);
		},

		min: function(size1, size2) {
			return Size.create(
				Math.min(size1.width, size2.width),
				Math.min(size1.height, size2.height));
		},

		max: function(size1, size2) {
			return Size.create(
				Math.max(size1.width, size2.width),
				Math.max(size1.height, size2.height));
		},

		random: function() {
			return Size.create(Math.random(), Math.random());
		}
	}
}, new function() { 

	return Base.each(['round', 'ceil', 'floor', 'abs'], function(name) {
		var op = Math[name];
		this[name] = function() {
			return Size.create(op(this.width), op(this.height));
		};
	}, {});
});

var LinkedSize = Size.extend({
	beans: true,

	set: function(width, height, dontNotify) {
		this._width = width;
		this._height = height;
		if (!dontNotify)
			this._owner[this._setter](this);
		return this;
	},

	getWidth: function() {
		return this._width;
	},

	setWidth: function(width) {
		this._width = width;
		this._owner[this._setter](this);
	},

	getHeight: function() {
		return this._height;
	},

	setHeight: function(height) {
		this._height = height;
		this._owner[this._setter](this);
	},

	statics: {
		create: function(owner, setter, width, height) {
			var point = new LinkedSize(LinkedSize.dont);
			point._width = width;
			point._height = height;
			point._owner = owner;
			point._setter = setter;
			return point;
		}
	}
});

var Rectangle = this.Rectangle = Base.extend({
	beans: true,

	initialize: function(arg0, arg1, arg2, arg3) {
		if (arguments.length == 4) {
			this.x = arg0;
			this.y = arg1;
			this.width = arg2;
			this.height = arg3;
		} else if (arguments.length == 2) {
			if (arg1 && arg1.x !== undefined) {
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
				var point = Point.read(arguments, 0, 1);
				var size = Size.read(arguments, 1, 1);
				this.x = point.x;
				this.y = point.y;
				this.width = size.width;
				this.height = size.height;
			}
		} else if (arg0) {
			this.x = arg0.x || 0;
			this.y = arg0.y || 0;
			this.width = arg0.width || 0;
			this.height = arg0.height || 0;
		} else {
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
		return LinkedPoint.create(this, 'setPoint', this.x, this.y);
	},

	setPoint: function(point) {
		point = Point.read(arguments);
		this.x = point.x;
		this.y = point.y;
		return this;
	},

	getSize: function() {
		return LinkedSize.create(this, 'setSize', this.width, this.height);
	},

	setSize: function(size) {
		size = Size.read(arguments);
		this.width = size.width;
		this.height = size.height;
		return this;
	},

	getLeft: function() {
		return this.x;
	},

	setLeft: function(left) {
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
		return LinkedPoint.create(this, 'setCenter',
				this.getCenterX(), this.getCenterY());
	},

	setCenter: function(point) {
		point = Point.read(arguments);
		return this.setCenterX(point.x).setCenterY(point.y);
	},

	equals: function(rect) {
		rect = Rectangle.read(arguments);
		return this.x == rect.x && this.y == rect.y
				&& this.width == rect.width && this.height == rect.height;
	},

	isEmpty: function() {
		return this.width == 0 || this.height == 0;
	},

	toString: function() {
		var format = Base.formatNumber;
		return '{ x: ' + format(this.x)
				+ ', y: ' + format(this.y)
				+ ', width: ' + format(this.width)
				+ ', height: ' + format(this.height)
				+ ' }';
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

	intersects: function(rect) {
		rect = Rectangle.read(arguments);
		return rect.x + rect.width > this.x
				&& rect.y + rect.height > this.y
				&& rect.x < this.x + this.width
				&& rect.y < this.y + this.height;
	},

	intersect: function(rect) {
		rect = Rectangle.read(arguments);
		var x1 = Math.max(this.x, rect.x),
			y1 = Math.max(this.y, rect.y),
			x2 = Math.min(this.x + this.width, rect.x + rect.width),
			y2 = Math.min(this.y + this.height, rect.y + rect.height);
		return Rectangle.create(x1, y1, x2 - x1, y2 - y1);
	},

	unite: function(rect) {
		rect = Rectangle.read(arguments);
		var x1 = Math.min(this.x, rect.x),
			y1 = Math.min(this.y, rect.y),
			x2 = Math.max(this.x + this.width, rect.x + rect.width),
			y2 = Math.max(this.y + this.height, rect.y + rect.height);
		return Rectangle.create(x1, y1, x2 - x1, y2 - y1);
	},

	include: function(point) {
		point = Point.read(arguments);
		var x1 = Math.min(this.x, point.x),
			y1 = Math.min(this.y, point.y),
			x2 = Math.max(this.x + this.width, point.x),
			y2 = Math.max(this.y + this.height, point.y);
		return Rectangle.create(x1, y1, x2 - x1, y2 - y1);
	},

	statics: {
		create: function(x, y, width, height) {
			return new Rectangle(Rectangle.dont).set(x, y, width, height);
		}
	}
}, new function() {
	return Base.each([
			['Top', 'Left'], ['Top', 'Right'],
			['Bottom', 'Left'], ['Bottom', 'Right'],
			['Left', 'Center'], ['Top', 'Center'],
			['Right', 'Center'], ['Bottom', 'Center']
		],
		function(parts, index) {
			var part = parts.join('');
			var xFirst = /^[RL]/.test(part);
			if (index >= 4)
				parts[1] += xFirst ? 'Y' : 'X';
			var x = parts[xFirst ? 0 : 1],
				y = parts[xFirst ? 1 : 0],
				getX = 'get' + x,
				getY = 'get' + y,
				setX = 'set' + x,
				setY = 'set' + y,
				get = 'get' + part,
				set = 'set' + part;
			this[get] = function() {
				return LinkedPoint.create(this, set,
						this[getX](), this[getY]());
			};
			this[set] = function(point) {
				point = Point.read(arguments);
				return this[setX](point.x)[setY](point.y);
			};
		}, { beans: true });
});

var LinkedRectangle = Rectangle.extend({
	beans: true,

	set: function(x, y, width, height, dontNotify) {
		this._x = x;
		this._y = y;
		this._width = width;
		this._height = height;
		if (!dontNotify)
			this._owner[this._setter](this);
		return this;
	},

	statics: {
		create: function(owner, setter, x, y, width, height) {
			var rect = new LinkedRectangle(LinkedRectangle.dont).set(
					x, y, width, height, true);
			rect._owner = owner;
			rect._setter = setter;
			return rect;
		}
	}
}, new function() {
	var proto = Rectangle.prototype;

	return Base.each(['x', 'y', 'width', 'height'], function(key) {
		var part = Base.capitalize(key);
		var internal = '_' + key;
		this['get' + part] = function() {
			return this[internal];
		};

		this['set' + part] = function(value) {
			this[internal] = value;
			if (!this._dontNotify)
				this._owner[this._setter](this);
		};
	}, Base.each(['Point', 'Size', 'Center',
			'Left', 'Top', 'Right', 'Bottom', 'CenterX', 'CenterY',
			'TopLeft', 'TopRight', 'BottomLeft', 'BottomRight',
			'LeftCenter', 'TopCenter', 'RightCenter', 'BottomCenter'],
		function(key) {
			var name = 'set' + key;
			this[name] = function(value) {
				this._dontNotify = true;
				proto[name].apply(this, arguments);
				delete this._dontNotify;
				this._owner[this._setter](this);
				return this;
			};
		}, { beans: true })
	);
});

var Matrix = this.Matrix = Base.extend({

	beans: true,

	initialize: function(m00, m10, m01, m11, m02, m12) {
		var ok = true;
		if (arguments.length == 6) {
			this.set(m00, m10, m01, m11, m02, m12);
		} else if (arguments.length == 1) {
			if (m00 instanceof Matrix) {
				this.set(m00._m00, m00._m10, m00._m01,
						m00._m11, m00._m02, m00._m12);
			} else if (Array.isArray(m00)) {
				this.set.apply(this, m00);
			} else {
				ok = false;
			} 
		} else if (arguments.length > 0) {
			ok = false;
		} else {
			this._m00 = this._m11 = 1;
			this._m10 = this._m01 = this._m02 = this._m12 = 0;
		}
		if (!ok)
			throw new Error('Unsupported matrix parameters');
	},

	clone: function() {
		return Matrix.create(this._m00, this._m10, this._m01,
				this._m11, this._m02, this._m12);
	},

	set: function(m00, m10, m01, m11, m02, m12) {
		this._m00 = m00;
		this._m10 = m10;
		this._m01 = m01;
		this._m11 = m11;
		this._m02 = m02;
		this._m12 = m12;
		return this;
	},

	scale: function(sx, sy , center) {
		if (arguments.length < 2 || typeof sy === 'object') {
			center = Point.read(arguments, 1);
			sy = sx;
		} else {
			center = Point.read(arguments, 2);
		}
		if (center)
			this.translate(center);
		this._m00 *= sx;
		this._m10 *= sx;
		this._m01 *= sy;
		this._m11 *= sy;
		if (center)
			this.translate(center.negate());
		return this;
	},

	translate: function(point) {
		point = Point.read(arguments);
		var x = point.x, y = point.y;
		this._m02 += x * this._m00 + y * this._m01;
		this._m12 += x * this._m10 + y * this._m11;
		return this;
	},

	rotate: function(angle, center) {
		return this.concatenate(
				Matrix.getRotateInstance.apply(Matrix, arguments));
	},

	shear: function(shx, shy, center) {
		if (arguments.length < 2 || typeof shy === 'object') {
			center = Point.read(arguments, 1);
			sy = sx;
		} else {
			center = Point.read(arguments, 2);
		}
		if (center)
			this.translate(center);
		var m00 = this._m00;
		var m10 = this._m10;
		this._m00 += shy * this._m01;
		this._m10 += shy * this._m11;
		this._m01 += shx * m00;
		this._m11 += shx * m10;
		if (center)
			this.translate(center.negate());
		return this;
	},

	toString: function() {
		var format = Base.formatNumber;
		return '[[' + [format(this._m00), format(this._m01),
					format(this._m02)].join(', ') + '], ['
				+ [format(this._m10), format(this._m11),
					format(this._m12)].join(', ') + ']]';
	},

	concatenate: function(mx) {
		var m0 = this._m00,
			m1 = this._m01;
		this._m00 = mx._m00 * m0 + mx._m10 * m1;
		this._m01 = mx._m01 * m0 + mx._m11 * m1;
		this._m02 += mx._m02 * m0 + mx._m12 * m1;

		m0 = this._m10;
		m1 = this._m11;
		this._m10 = mx._m00 * m0 + mx._m10 * m1;
		this._m11 = mx._m01 * m0 + mx._m11 * m1;
		this._m12 += mx._m02 * m0 + mx._m12 * m1;
		return this;
	},

	preConcatenate: function(mx) {
		var m0 = this._m00,
			m1 = this._m10;
		this._m00 = mx._m00 * m0 + mx._m01 * m1;
		this._m10 = mx._m10 * m0 + mx._m11 * m1;

		m0 = this._m01;
		m1 = this._m11;
		this._m01 = mx._m00 * m0 + mx._m01 * m1;
		this._m11 = mx._m10 * m0 + mx._m11 * m1;

		m0 = this._m02;
		m1 = this._m12;
		this._m02 = mx._m00 * m0 + mx._m01 * m1 + mx._m02;
		this._m12 = mx._m10 * m0 + mx._m11 * m1 + mx._m12;
		return this;
	},

	transform: function( src, srcOff, dst, dstOff, numPts) {
		return arguments.length < 5
			? this._transformPoint(Point.read(arguments))
			: this._transformCoordinates(src, srcOff, dst, dstOff, numPts);
	},

	_transformPoint: function(point, dest, dontNotify) {
		var x = point.x,
			y = point.y;
		if (!dest)
			dest = new Point(Point.dont);
		return dest.set(
			x * this._m00 + y * this._m01 + this._m02,
			x * this._m10 + y * this._m11 + this._m12,
			dontNotify
		);
	},

	_transformCoordinates: function(src, srcOff, dst, dstOff, numPts) {
		var i = srcOff, j = dstOff,
			srcEnd = srcOff + 2 * numPts;
		while (i < srcEnd) {
			var x = src[i++];
			var y = src[i++];
			dst[j++] = x * this._m00 + y * this._m01 + this._m02;
			dst[j++] = x * this._m10 + y * this._m11 + this._m12;
		}
		return dst;
	},

	_transformCorners: function(rect) {
		var x1 = rect.x,
			y1 = rect.y,
			x2 = x1 + rect.width,
			y2 = y1 + rect.height,
			coords = [ x1, y1, x2, y1, x2, y2, x1, y2 ];
		return this._transformCoordinates(coords, 0, coords, 0, 4);
	},

	_transformBounds: function(bounds) {
		var coords = this._transformCorners(bounds),
			min = coords.slice(0, 2),
			max = coords.slice(0);
		for (var i = 2; i < 8; i++) {
			var val = coords[i],
				j = i & 1;
			if (val < min[j])
				min[j] = val;
			else if (val > max[j])
				max[j] = val;
		}
		return Rectangle.create(min[0], min[1],
				max[0] - min[0], max[1] - min[1]);
	},

	getDeterminant: function() {
		return this._m00 * this._m11 - this._m01 * this._m10;
	},

	isIdentity: function() {
		return this._m00 == 1 && this._m10 == 0 && this._m01 == 0 &&
				this._m11 == 1 && this._m02 == 0 && this._m12 == 0;
	},

	isInvertible: function() {
		var det = this.getDeterminant();
		return isFinite(det) && det != 0 && isFinite(this._m02)
				&& isFinite(this._m12);
	},

	isSingular: function() {
		return !this.isInvertible();
	},

	createInverse: function() {
		var det = this.getDeterminant();
		if (isFinite(det) && det != 0 && isFinite(this._m02)
				&& isFinite(this._m12)) {
			return Matrix.create(
				this._m11 / det,
				-this._m10 / det,
				-this._m01 / det,
				this._m00 / det,
				(this._m01 * this._m12 - this._m11 * this._m02) / det,
				(this._m10 * this._m02 - this._m00 * this._m12) / det);
		}
		return null;
	},

	createShiftless: function() {
		return Matrix.create(this._m00, this._m10, this._m01, this._m11, 0, 0);
	},

	setToScale: function(sx, sy) {
		return this.set(sx, 0, 0, sy, 0, 0);
	},

	setToTranslation: function(delta) {
		delta = Point.read(arguments);
		return this.set(1, 0, 0, 1, delta.x, delta.y);
	},

	setToShear: function(shx, shy) {
		return this.set(1, shy, shx, 1, 0, 0);
	},

	setToRotation: function(angle, center) {
		center = Point.read(arguments, 1);
		angle = angle * Math.PI / 180;
		var x = center.x,
			y = center.y,
			cos = Math.cos(angle),
			sin = Math.sin(angle);
		return this.set(cos, sin, -sin, cos,
				x - x * cos + y * sin,
				y - x * sin - y * cos);
	},

	applyToContext: function(ctx, reset) {
		ctx[reset ? 'setTransform' : 'transform'](
			this._m00, this._m10, this._m01,
			this._m11, this._m02, this._m12
		);
		return this;
	},

	statics: {

		create: function(m00, m10, m01, m11, m02, m12) {
			return new Matrix(Matrix.dont).set(m00, m10, m01, m11, m02, m12);
		},

		getScaleInstance: function(sx, sy) {
			var mx = new Matrix();
			return mx.setToScale.apply(mx, arguments);
		},

		getTranslateInstance: function(delta) {
			var mx = new Matrix();
			return mx.setToTranslation.apply(mx, arguments);
		},

		getShearInstance: function(shx, shy, center) {
			var mx = new Matrix();
			return mx.setToShear.apply(mx, arguments);
		},

		getRotateInstance: function(angle, center) {
			var mx = new Matrix();
			return mx.setToRotation.apply(mx, arguments);
		}
	}
}, new function() {
	return Base.each({
		scaleX: '_m00',
		scaleY: '_m11',
		translateX: '_m02',
		translateY: '_m12',
		shearX: '_m01',
		shearY: '_m10'
	}, function(prop, name) {
		name = Base.capitalize(name);
		this['get' + name] = function() {
			return this[prop];
		};
		this['set' + name] = function(value) {
			this[prop] = value;
		};
	}, { beans: true });
});

var Line = this.Line = Base.extend({
	initialize: function(point1, point2, infinite) {
		point1 = Point.read(arguments, 0, 1);
		point2 = Point.read(arguments, 1, 1);
		if (arguments.length == 3) {
			this.point = point1;
			this.vector = point2.subtract(point1);
			this.infinite = infinite;
		} else {
			this.point = point1;
			this.vector = point2;
			this.infinite = true;
		}
	},

	intersect: function(line) {
		var cross = this.vector.cross(line.vector);
		if (Math.abs(cross) <= Numerical.TOLERANCE)
			return null;
		var v = line.point.subtract(this.point),
			t1 = v.cross(line.vector) / cross,
			t2 = v.cross(this.vector) / cross;
		return (this.infinite || 0 <= t1 && t1 <= 1)
				&& (line.infinite || 0 <= t2 && t2 <= 1)
			? this.point.add(this.vector.multiply(t1)) : null;
	},

	getSide: function(point) {
		var v1 = this.vector,
			v2 = point.subtract(this.point),
			ccw = v2.cross(v1);
		if (ccw == 0) {
			ccw = v2.dot(v1);
			if (ccw > 0) {
				ccw = (v2 - v1).dot(v1);
				if (ccw < 0)
				    ccw = 0;
			}
		}
		return ccw < 0 ? -1 : ccw > 0 ? 1 : 0;
	},

	getDistance: function(point) {
		var m = this.vector.y / this.vector.x, 
			b = this.point.y - (m * this.point.x); 
		var dist = Math.abs(point.y - (m * point.x) - b) / Math.sqrt(m * m + 1);
		return this.infinite ? dist : Math.min(dist,
				point.getDistance(this.point),
				point.getDistance(this.point.add(this.vector)));
	}
});

var Project = this.Project = Base.extend({

	beans: true,

	initialize: function() {
		this._scope = paper;
		this._index = this._scope.projects.push(this) - 1;
		this._currentStyle = PathStyle.create(null);
		this.setCurrentStyle({
			strokeWidth: 1,
			strokeCap: 'butt',
			strokeJoin: 'miter',
			miterLimit: 10,
			dashOffset: 0,
			dashArray: []
		});
		this._selectedItems = {};
		this._selectedItemCount = 0;
		this.activate();
		this.layers = [];
		this.symbols = [];
		this.activeLayer = new Layer();
	},

	getCurrentStyle: function() {
		return this._currentStyle;
	},

	setCurrentStyle: function(style) {
		this._currentStyle.initialize(style);
	},

	activate: function() {
		if (this._index != null) {
			this._scope.project = this;
			return true;
		}
		return false;
	},

	remove: function() {
		var res = Base.splice(this._scope.projects, null, this._index, 1);
		this._scope = null;
		return !!res.length;
	},

	getIndex: function() {
		return this._index;
	},

	getSelectedItems: function() {
		var items = [];
		Base.each(this._selectedItems, function(item) {
			items.push(item);
		});
		return items;
	},

	_selectItem: function(item, select) {
		if (select) {
			this._selectedItemCount++;
			this._selectedItems[item.getId()] = item;
		} else {
			this._selectedItemCount--;
			delete this._selectedItems[item.getId()];
		}
	},
	selectAll: function() {
		for (var i = 0, l = this.layers.length; i < l; i++)
			this.layers[i].setSelected(true);
	},

	deselectAll: function() {
		for (var i in this._selectedItems)
			this._selectedItems[i].setSelected(false);
	},

	draw: function(ctx) {
		ctx.save();
		var param = { offset: new Point(0, 0) };
		for (var i = 0, l = this.layers.length; i < l; i++)
			Item.draw(this.layers[i], ctx, param);
		ctx.restore();

		if (this._selectedItemCount > 0) {
			ctx.save();
			ctx.strokeWidth = 1;
			ctx.strokeStyle = ctx.fillStyle = '#009dec';
			param = { selection: true };
			Base.each(this._selectedItems, function(item) {
				item.draw(ctx, param);
			});
			ctx.restore();
		}
	},

	redraw: function() {
		this._scope.view.draw();
	}
});

var Symbol = this.Symbol = Base.extend({

	beans: true,

	initialize: function(item) {
		this.project = paper.project;
		this.project.symbols.push(this);
		this.setDefinition(item);
	},

	getDefinition: function() {
		return this._definition;
	},

	setDefinition: function(item) {
		this._definition = item;
		item.setSelected(false);
		item._removeFromParent();
		item.setPosition(new Point());
	},

	place: function(position) {
		return new PlacedSymbol(this, position);
	},

	clone: function() {
	 	return new Symbol(this._definition.clone());
	}
});

var ChangeFlags = {
	GEOMETRY: 1, 
	STROKE: 2, 
	STYLE: 4, 
	HIERARCHY: 8 
};

var Item = this.Item = Base.extend({
	beans: true,

	initialize: function() {
		if (!this._project)
			paper.project.activeLayer.appendTop(this);
		this._style = PathStyle.create(this);
		this.setStyle(this._project.getCurrentStyle());
	},

	_changed: function(flags) {
		if (flags & ChangeFlags.GEOMETRY) {
			delete this._position;
		}
	},

	getId: function() {
		if (this._id == null)
			this._id = Item._id = (Item._id || 0) + 1;
		return this._id;
	},

	getName: function() {
		return this._name;
	},

	setName: function(name) {
		var children = this._parent._children,
			namedChildren = this._parent._namedChildren;
		if (name != this._name) {
			if (this._name)
				this._removeFromNamed();
			this._name = name || undefined;
		}
		if (name) {
			(namedChildren[name] = namedChildren[name] || []).push(this);
			children[name] = this;
		} else {
			delete children[name];
		}
	},

	getPosition: function() {
		var pos = this._position
				|| (this._position = this.getBounds().getCenter());
		return LinkedPoint.create(this, 'setPosition', pos._x, pos._y);
	},

	setPosition: function(point) {
		this.translate(Point.read(arguments).subtract(this.getPosition()));
	},

	getStyle: function() {
		return this._style;
	},

	setStyle: function(style) {
		this._style.initialize(style);
	},

	isSelected: function() {
		if (this._children) {
			for (var i = 0, l = this._children.length; i < l; i++) {
				if (this._children[i].isSelected()) {
					return true;
				}
			}
		} else {
			return !!this._selected;
		}
		return false;
	},

	setSelected: function(selected) {
		if (this._children) {
			for (var i = 0, l = this._children.length; i < l; i++) {
				this._children[i].setSelected(selected);
			}
		} else {
			if ((selected = !!selected) != this._selected) {
				this._selected = selected;
				this._project._selectItem(this, selected);
			}
		}
	},

	locked: false,

	visible: true,

	isClipMask: function() {
		return this._clipMask;
	},

	setClipMask: function(clipMask) {
		this._clipMask = clipMask;
		if (this._clipMask) {
			this.setFillColor(null);
			this.setStrokeColor(null);
		}
	},

	blendMode: 'normal',

	opacity: 1,

	getProject: function() {
		return this._project;
	},

	_setProject: function(project) {
		if (this._project != project) {
			this._project = project;
			if (this._children) {
				for (var i = 0, l = this._children.length; i < l; i++) {
					this._children[i]._setProject(project);
				}
			}
		}
	},

	getParent: function() {
		return this._parent;
	},

	getChildren: function() {
		return this._children;
	},

	setChildren: function(items) {
		this.removeChildren();
		for (var i = 0, l = items && items.length; i < l; i++)
			this.appendTop(items[i]);
	},

	getFirstChild: function() {
		return this._children && this._children[0] || null;
	},

	getLastChild: function() {
		return this._children && this._children[this._children.length - 1]
				|| null;
	},

	getNextSibling: function() {
		return this._parent && this._parent._children[this._index + 1] || null;
	},

	getPreviousSibling: function() {
		return this._parent && this._parent._children[this._index - 1] || null;
	},

	getIndex: function() {
		return this._index;
	},

	_removeFromNamed: function() {
		var children = this._parent._children,
			namedChildren = this._parent._namedChildren,
			name = this._name,
			namedArray = namedChildren[name];
		if (children[name] = this)
			delete children[name];
		namedArray.splice(namedArray.indexOf(this), 1);
		if (namedArray.length) {
			children[name] = namedArray[namedArray.length - 1];
		} else {
			delete namedChildren[name];
		}
	},

	_removeFromParent: function() {
		if (this._parent) {
			if (this._name)
				this._removeFromNamed();
			var res = Base.splice(this._parent._children, null, this._index, 1);
			this._parent = null;
			return !!res.length;
		}
		return false;
	},

	remove: function() {
		if (this.isSelected())
			this.setSelected(false);
		return this._removeFromParent();
	},

	removeChildren: function() {
		var removed = false;
		if (this._children) {
			for (var i = this._children.length - 1; i >= 0; i--)
				removed = this._children[i].remove() || removed;
		}
		return removed;
	},

	copyTo: function(itemOrProject) {
		var copy = this.clone();
		if (itemOrProject.layers) {
			itemOrProject.activeLayer.appendTop(copy);
		} else {
			itemOrProject.appendTop(copy);
		}
		return copy;
	},

	clone: function() {
		return this._clone(new this.constructor());
	},

	_clone: function(copy) {
		copy.setStyle(this._style);
		if (this._children) {
			for (var i = 0, l = this._children.length; i < l; i++)
				copy.appendTop(this._children[i].clone());
		}
		var keys = ['locked', 'visible', 'opacity', 'blendMode', '_clipMask'];
		for (var i = 0, l = keys.length; i < l; i++) {
			var key = keys[i];
			if (this.hasOwnProperty(key))
				copy[key] = this[key];
		}
		copy.moveAbove(this);
		if (this._name)
			copy.setName(this._name);
		return copy;
	},

	reverseChildren: function() {
		if (this._children) {
			this._children.reverse();
			for (var i = 0, l = this._children.length; i < l; i++) {
				this._children[i]._index = i;
			}
		}
	},

	rasterize: function(resolution) {
		var bounds = this.getStrokeBounds(),
			scale = (resolution || 72) / 72,
			canvas = CanvasProvider.getCanvas(bounds.getSize().multiply(scale)),
			ctx = canvas.getContext('2d'),
			matrix = new Matrix().scale(scale).translate(-bounds.x, -bounds.y);
		matrix.applyToContext(ctx);
		this.draw(ctx, {});
		var raster = new Raster(canvas);
		raster.setPosition(this.getPosition());
		raster.scale(1 / scale);
		return raster;
	},

	hasChildren: function() {
		return this._children && this._children.length > 0;
	},

	isEditable: function() {
		var item = this;
		while (item) {
			if (!item.visible || item.locked)
				return false;
			item = item._parent;
		}
		return true;
	},

	_getOrder: function(item) {
		function getList(item) {
			var list = [];
			do {
				list.unshift(item);
			} while (item = item._parent)
			return list;
		}
		var list1 = getList(this),
			list2 = getList(item);
		for (var i = 0, l = Math.min(list1.length, list2.length); i < l; i++) {
			if (list1[i] != list2[i]) {
				return list1[i]._index < list2[i]._index ? 1 : -1;
			}
		}
		return 0;
	},

	isAbove: function(item) {
		return this._getOrder(item) == -1;
	},

	isBelow: function(item) {
		return this._getOrder(item) == 1;
	},

	isParent: function(item) {
		return this._parent == item;
	},

	isChild: function(item) {
		return item && item._parent == this;
	},

	isDescendant: function(item) {
		var parent = this;
		while (parent = parent._parent) {
			if (parent == item)
				return true;
		}
		return false;
	},

	isAncestor: function(item) {
		return item ? item.isDescendant(this) : false;
	},

	isGroupedWith: function(item) {
		var parent = this._parent;
		while (parent) {
			if (parent._parent
				&& (parent instanceof Group || parent instanceof CompoundPath)
				&& item.isDescendant(parent))
					return true;
			parent = parent._parent;
		}
		return false;
	},

	getBounds: function() {
		return this._getBounds(false);
	},

	getStrokeBounds: function() {
		return this._getBounds(true);
	},

	_getBounds: function(includeStroke) {
		var children = this._children;
		if (children && children.length) {
			var x1 = Infinity,
				x2 = -Infinity,
				y1 = x1,
				y2 = x2;
			for (var i = 0, l = children.length; i < l; i++) {
				var child = children[i];
				if (child.visible) {
					var rect = includeStroke
							? child.getStrokeBounds()
							: child.getBounds();
					x1 = Math.min(rect.x, x1);
					y1 = Math.min(rect.y, y1);
					x2 = Math.max(rect.x + rect.width, x2);
					y2 = Math.max(rect.y + rect.height, y2);
				}
			}
			return includeStroke
				? Rectangle.create(x1, y1, x2 - x1, y2 - y1)
				: LinkedRectangle.create(this, 'setBounds',
						x1, y1, x2 - x1, y2 - y1);
		}
		return new Rectangle();
	},

	setBounds: function(rect) {
		rect = Rectangle.read(arguments);
		var bounds = this.getBounds(),
			matrix = new Matrix(),
			center = rect.center;
		matrix.translate(center);
		if (rect.width != bounds.width || rect.height != bounds.height) {
			matrix.scale(
					bounds.width != 0 ? rect.width / bounds.width : 1,
					bounds.height != 0 ? rect.height / bounds.height : 1);
		}
		center = bounds.center;
		matrix.translate(-center.x, -center.y);
		this.transform(matrix);
	},

	scale: function(sx, sy , center) {
		if (arguments.length < 2 || typeof sy === 'object') {
			center = sy;
			sy = sx;
		}
		return this.transform(new Matrix().scale(sx, sy,
				center || this.getPosition()));
	},

	translate: function(delta) {
		var mx = new Matrix();
		return this.transform(mx.translate.apply(mx, arguments));
	},

	rotate: function(angle, center) {
		return this.transform(new Matrix().rotate(angle,
				center || this.getPosition()));
	},

	shear: function(shx, shy, center) {
		if (arguments.length < 2 || typeof sy === 'object') {
			center = shy;
			shy = shx;
		}
		return this.transform(new Matrix().shear(shx, shy,
				center || this.getPosition()));
	},

	transform: function(matrix, flags) {
		if (this._transform)
			this._transform(matrix, flags);
		if (this._position)
			matrix._transformPoint(this._position, this._position, true);
		if (this._children) {
			for (var i = 0, l = this._children.length; i < l; i++) {
				var child = this._children[i];
				child.transform(matrix, flags);
			}
		}
		return this;
	},

	statics: {
		drawSelectedBounds: function(bounds, ctx, matrix) {
			var coords = matrix._transformCorners(bounds);
			ctx.beginPath();
			for (var i = 0; i < 8; i++)
				ctx[i == 0 ? 'moveTo' : 'lineTo'](coords[i], coords[++i]);
			ctx.closePath();
			ctx.stroke();
			for (var i = 0; i < 8; i++) {
				ctx.beginPath();
				ctx.rect(coords[i] - 2, coords[++i] - 2, 4, 4);
				ctx.fill();
			}
		},

		draw: function(item, ctx, param) {
			if (!item.visible || item.opacity == 0)
				return;

			var tempCanvas, parentCtx;
			if (item.blendMode !== 'normal'
					|| item.opacity < 1
					&& !(item._segments && (!item.getFillColor()
							|| !item.getStrokeColor()))) {
				var bounds = item.getStrokeBounds() || item.getBounds();
				if (!bounds.width || !bounds.height)
					return;

				var itemOffset = bounds.getTopLeft().floor(),
					size = bounds.getSize().ceil().add(new Size(1, 1));
				tempCanvas = CanvasProvider.getCanvas(size);

				parentCtx = ctx;

				ctx = tempCanvas.getContext('2d');
				ctx.save();

				ctx.translate(-itemOffset.x, -itemOffset.y);
			}
			var savedOffset;
			if (itemOffset) {
				savedOffset = param.offset;
				param.offset = itemOffset;
			}
			item.draw(ctx, param);
			if (itemOffset)
				param.offset = savedOffset;

			if (tempCanvas) {

				ctx.restore();

				if (item.blendMode !== 'normal') {
					var pixelOffset = itemOffset.subtract(param.offset);
					BlendMode.process(item.blendMode, ctx, parentCtx,
						item.opacity, pixelOffset);
				} else {
					parentCtx.save();
					parentCtx.globalAlpha = item.opacity;
					parentCtx.drawImage(tempCanvas,
							itemOffset.x, itemOffset.y);
					parentCtx.restore();
				}

				CanvasProvider.returnCanvas(tempCanvas);
			}
		}
	}
}, new function() {

	function append(top) {
		return function(item) {
			item._removeFromParent();
			if (this._children) {
				Base.splice(this._children, [item], top ? undefined : 0, 0);
				item._parent = this;
				item._setProject(this._project);
				if (item._name)
					item.setName(item._name);
				return true;
			}
			return false;
		};
	}

	function move(above) {
		return function(item) {
			if (item._parent && this._removeFromParent()) {
				Base.splice(item._parent._children, [this],
						item._index + (above ? 1 : -1), 0);
				this._parent = item._parent;
				this._setProject(item._project);
				if (item._name)
					item.setName(item._name);
				return true;
			}
			return false;
		};
	}

	return {

		appendTop: append(true),

		appendBottom: append(false),

		moveAbove: move(true),

		moveBelow: move(false)
	};
}, new function() {

	var sets = {
		down: {}, drag: {}, up: {}, move: {}
	};

	function removeAll(set) {
		for (var id in set) {
			var item = set[id];
			item.remove();
			for (var type in sets) {
				var other = sets[type];
				if (other != set && other[item.getId()])
					delete other[item.getId()];
			}
		}
	}

	function installHandler(name) {
		var handler = 'onMouse' + Base.capitalize(name);
		var func = paper.tool[handler];
		if (!func || !func._installed) {
			var hash = {};
			hash[handler] = function(event) {
				if (name === 'up')
					sets.drag = {};
				removeAll(sets[name]);
				sets[name] = {};
				if (this.base)
					this.base(event);
			};
			paper.tool.inject(hash);
			paper.tool[handler]._installed = true;
		}
	}

	return Base.each(['down', 'drag', 'up', 'move'], function(name) {
		this['removeOn' + Base.capitalize(name)] = function() {
			var hash = {};
			hash[name] = true;
			return this.removeOn(hash);
		};
	}, {
		removeOn: function(obj) {
			for (var name in obj) {
				if (obj[name]) {
					sets[name][this.getId()] = this;
					if (name === 'drag')
						installHandler('up');
					installHandler(name);
				}
			}
			return this;
		}
	});
});

var Group = this.Group = Item.extend({

	beans: true,

	initialize: function(items) {
		this.base();
		this._children = [];
		this._namedChildren = {};
		this._clipped = false;
		this.setChildren(!items || !Array.isArray(items)
				|| typeof items[0] !== 'object' ? arguments : items);
	},

	clone: function() {
		var copy = this.base();
		copy._clipped = this._clipped;
		return copy;
	},

	isClipped: function() {
		return this._clipped;
	},

	setClipped: function(clipped) {
		this._clipped = clipped;
		var child = this.getFirstChild();
		if (child)
			child.setClipMask(clipped);
	},

	draw: function(ctx, param) {
		for (var i = 0, l = this._children.length; i < l; i++) {
			Item.draw(this._children[i], ctx, param);
			if (this._clipped && i == 0)
				ctx.clip();
		}
	}
});

var Layer = this.Layer = Group.extend({

	beans: true,
	initialize: function(items) {
		this._project = paper.project;
		this._index = this._project.layers.push(this) - 1;
		this.base.apply(this, arguments);
		this.activate();
	},

	_removeFromParent: function() {
		return this._parent ? this.base()
			: !!Base.splice(this._project.layers, null, this._index, 1).length;
	},

	getNextSibling: function() {
		return this._parent ? this.base()
				: this._project.layers[this._index + 1] || null;
	},

	getPreviousSibling: function() {
		return this._parent ? this.base()
				: this._project.layers[this._index - 1] || null;
	},

	activate: function() {
		this._project.activeLayer = this;
	}
}, new function () {
	function move(above) {
		return function(item) {
			if (item instanceof Layer && !item._parent
						&& this._removeFromParent()) {
				Base.splice(item._project.layers, [this],
						item._index + (above ? 1 : -1), 0);
				this._setProject(item._project);
				return true;
			}
			return this.base(item);
		};
	}

	return {
		moveAbove: move(true),

		moveBelow: move(false)
	};
});

var Raster = this.Raster = Item.extend({

	beans: true,

	initialize: function(object) {
		this.base();
		if (object.getContext) {
			this.setCanvas(object);
		} else {
			if (typeof object === 'string')
				object = document.getElementById(object);
			this.setImage(object);
		}
		this.matrix = new Matrix();
	},

	clone: function() {
		var image = this._image;
		if (!image) {
			image = CanvasProvider.getCanvas(this._size);
			image.getContext('2d').drawImage(this._canvas, 0, 0);
		}
		var copy = new Raster(image);
		copy.matrix = this.matrix.clone();
		return this._clone(copy);
	},

	getSize: function() {
		return this._size;
	},

	setSize: function() {
		var size = Size.read(arguments),
			image = this.getImage();
		this.setCanvas(CanvasProvider.getCanvas(size));
		this.getContext().drawImage(image, 0, 0, size.width, size.height);
	},

	getWidth: function() {
		return this._size.width;
	},

	getHeight: function() {
		return this._size.height;
	},

	getPpi: function() {
		var matrix = this.matrix,
			orig = new Point(0, 0).transform(matrix),
			u = new Point(1, 0).transform(matrix).subtract(orig),
			v = new Point(0, 1).transform(matrix).subtract(orig);
		return new Size(
			72 / u.getLength(),
			72 / v.getLength()
		);
	},

	getContext: function() {
		if (!this._context) {
			this._context = this.getCanvas().getContext('2d');
		}
		return this._context;
	},

	setContext: function(context) {
		this._context = context;
	},

	getCanvas: function() {
		if (!this._canvas) {
			this._canvas = CanvasProvider.getCanvas(this._size);
			if (this._image)
				this.getContext().drawImage(this._image, 0, 0);
		}
		return this._canvas;
	},

	setCanvas: function(canvas) {
		if (this._canvas)
			CanvasProvider.returnCanvas(this._canvas);
		this._canvas = canvas;
		this._size = new Size(canvas.width, canvas.height);
		this._image = null;
		this._context = null;
		this._bounds = null;
	},

	getImage: function() {
		return this._image || this.getCanvas();
	},

	setImage: function(image) {
		if (this._canvas)
			CanvasProvider.returnCanvas(this._canvas);
		this._image = image;
		this._size = new Size(image.naturalWidth, image.naturalHeight);
		this._canvas = null;
		this._context = null;
		this._bounds = null;
	},

	getSubImage: function(rect) {
		rect = Rectangle.read(arguments);
		var canvas = CanvasProvider.getCanvas(rect.getSize());
		canvas.getContext('2d').drawImage(this.getCanvas(), rect.x, rect.y,
				canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
		return canvas;
	},

	drawImage: function(image, point) {
		point = Point.read(arguments, 1);
		this.getContext().drawImage(image, point.x, point.y);
	},

	getAverageColor: function(object) {
		if (!object)
			object = this.getBounds();
		var bounds, path;
		if (object instanceof PathItem) {
			path = object;
			bounds = object.getBounds();
		} else if (object.width) {
			bounds = new Rectangle(object);
		} else if (object.x) {
			bounds = Rectangle.create(object.x - 0.5, object.y - 0.5, 1, 1);
		}
		var sampleSize = 32,
			width = Math.min(bounds.width, sampleSize),
			height = Math.min(bounds.height, sampleSize);
		var ctx = Raster._sampleContext;
		if (!ctx) {
			ctx = Raster._sampleContext = CanvasProvider.getCanvas(
					new Size(sampleSize)).getContext('2d');
		} else {
			ctx.clearRect(0, 0, sampleSize, sampleSize);
		}
		ctx.save();
		ctx.scale(width / bounds.width, height / bounds.height);
		ctx.translate(-bounds.x, -bounds.y);
		if (path)
			path.draw(ctx, { clip: true });
		this.matrix.applyToContext(ctx);
		ctx.drawImage(this._canvas || this._image,
				-this._size.width / 2, -this._size.height / 2);
		ctx.restore();
		var pixels = ctx.getImageData(0.5, 0.5, Math.ceil(width),
				Math.ceil(height)).data,
			channels = [0, 0, 0],
			total = 0;
		for (var i = 0, l = pixels.length; i < l; i += 4) {
			var alpha = pixels[i + 3];
			total += alpha;
			alpha /= 255;
			channels[0] += pixels[i] * alpha;
			channels[1] += pixels[i + 1] * alpha;
			channels[2] += pixels[i + 2] * alpha;
		}
		for (var i = 0; i < 3; i++)
			channels[i] /= total;
		return total ? Color.read(channels) : null;
	},

	getPixel: function(point) {
		point = Point.read(arguments);
		var pixels = this.getContext().getImageData(point.x, point.y, 1, 1).data,
			channels = new Array(4);
		for (var i = 0; i < 4; i++)
			channels[i] = pixels[i] / 255;
		return RGBColor.read(channels);
	},

	setPixel: function(point, color) {
		var hasPoint = arguments.length == 2;
		point = Point.read(arguments, 0, hasPoint ? 1 : 2);
		color = Color.read(arguments, hasPoint ? 1 : 2);
		var ctx = this.getContext(),
			imageData = ctx.createImageData(1, 1),
			alpha = color.getAlpha();
		imageData.data[0] = color.getRed() * 255;
		imageData.data[1] = color.getGreen() * 255;
		imageData.data[2] = color.getBlue() * 255;
		imageData.data[3] = alpha != null ? alpha * 255 : 255;
		ctx.putImageData(imageData, point.x, point.y);
	},

	createData: function(size) {
		size = Size.read(arguments);
		return this.getContext().createImageData(size.width, size.height);
	},

	getData: function(rect) {
		rect = Rectangle.read(arguments);
		if (rect.isEmpty())
			rect = new Rectangle(this.getSize());
		return this.getContext().getImageData(rect.x, rect.y,
				rect.width, rect.height);
	},

	setData: function(data, point) {
		point = Point.read(arguments, 1);
		this.getContext().putImageData(data, point.x, point.y);
	},

	_transform: function(matrix, flags) {
		this.matrix.preConcatenate(matrix);
		this._bounds = null;
	},

	getBounds: function() {
		if (!this._bounds) {
			this._bounds = this.matrix._transformBounds(
					new Rectangle(this._size).setCenter(0, 0));
		}
		return this._bounds;
	},
	getStrokeBounds: function() {
		return this.getBounds();
	},

	draw: function(ctx, param) {
		if (param.selection) {
			var bounds = new Rectangle(this._size).setCenter(0, 0);
			Item.drawSelectedBounds(bounds, ctx, this.matrix);
		} else {
			ctx.save();
			this.matrix.applyToContext(ctx);
			ctx.drawImage(this._canvas || this._image,
					-this._size.width / 2, -this._size.height / 2);
			ctx.restore();
		}
	}
});

var PlacedSymbol = this.PlacedSymbol = Item.extend({

	beans: true,

	initialize: function(symbol, matrixOrOffset) {
		this.base();
		this.symbol = symbol instanceof Symbol ? symbol : new Symbol(symbol);
		this.matrix = matrixOrOffset !== undefined
			? matrixOrOffset instanceof Matrix
				? matrixOrOffset
				: new Matrix().translate(Point.read(arguments, 1))
			: new Matrix();
	},

	clone: function() {
		return this._clone(new PlacedSymbol(this.symbol, this.matrix.clone()));
	},

	_transform: function(matrix, flags) {
		this.matrix.preConcatenate(matrix);
	},

	getBounds: function() {
		var bounds = this.symbol._definition.getStrokeBounds(this.matrix);
		return LinkedRectangle.create(this, 'setBounds',
				bounds.x, bounds.y, bounds.width, bounds.height);
	},

	getStrokeBounds: function() {
		return this.getBounds();
	},

	draw: function(ctx, param) {
		if (param.selection) {
			Item.drawSelectedBounds(this.symbol._definition.getStrokeBounds(),
					ctx, this.matrix);
		} else {
			ctx.save();
			this.matrix.applyToContext(ctx);
			Item.draw(this.symbol.getDefinition(), ctx, param);
			ctx.restore();
		}
	}

});

var PathStyle = this.PathStyle = Base.extend(new function() {

	var keys = ['strokeColor', 'strokeWidth', 'strokeCap', 'strokeJoin',
				'miterLimit', 'dashOffset','dashArray', 'fillColor'];

	var strokeFlags = {
		strokeWidth: true,
		strokeCap: true,
		strokeJoin: true,
		miterLimit: true
	};

	var fields = {
		beans: true,

		initialize: function(style) {
			var clone = style instanceof PathStyle;
			for (var i = 0, l = style && keys.length; i < l; i++) {
				var key = keys[i],
					value = style[key];
				if (value !== undefined) {
					this[key] = value && clone && value.clone
							? value.clone() : value;
				}
			}
		},

		statics: {
			create: function(item) {
				var style = new PathStyle(PathStyle.dont);
				style._item = item;
				return style;
			}
		}
	};

	Item.inject(Base.each(keys, function(key) {
		var isColor = !!key.match(/Color$/),
			part = Base.capitalize(key),
			set = 'set' + part,
			get = 'get' + part;

		fields[set] = function(value) {
			var children = this._item && this._item._children;
			value = isColor ? Color.read(arguments) : value;
			if (children) {
				for (var i = 0, l = children.length; i < l; i++)
					children[i]._style[set](value);
			} else {
				var old = this['_' + key];
				if (old != value && !(old && old.equals && old.equals(value))) {
					this['_' + key] = value;
					if (this._item) {
						this._item._changed(ChangeFlags.STYLE
							| (strokeFlags[key] ? ChangeFlags.STROKE : 0));
					}
				}
			}
			return this;
		};

		fields[get] = function() {
			var children = this._item && this._item._children,
				style;
			if (children) {
				for (var i = 0, l = children.length; i < l; i++) {
					var childStyle = children[i]._style[get]();
					if (!style) {
						style = childStyle;
					} else if (style != childStyle && !(style && style.equals
							&& style.equals(childStyle))) {
						return undefined;
					}
				}
				return style;
			} else {
				return this['_' + key];
			}
		};

		this[set] = function(value) {
			this._style[set](value);
			return this;
		};

		this[get] = function() {
			return this._style[get]();
		};
	}, { beans: true }));

	return fields;
});

var Segment = this.Segment = Base.extend({
	beans: true,

	initialize: function(arg0, arg1, arg2, arg3, arg4, arg5) {
		var count = arguments.length,
			createPoint = SegmentPoint.create,
			point, handleIn, handleOut;
		if (count == 0) {
		} else if (count == 1) {
			if (arg0.point) {
				point = arg0.point;
				handleIn = arg0.handleIn;
				handleOut = arg0.handleOut;
			} else {
				point = arg0;
			}
		} else if (count < 6) {
			if (count == 2 && arg1.x === undefined) {
				point = [ arg0, arg1 ];
			} else {
				point = arg0;
				handleIn = arg1;
				handleOut = arg2;
			}
		} else if (count == 6) {
			point = [ arg0, arg1 ];
			handleIn = [ arg2, arg3 ];
			handleOut = [ arg4, arg5 ];
		}
		createPoint(this, '_point', point);
		createPoint(this, '_handleIn', handleIn);
		createPoint(this, '_handleOut', handleOut);
	},

	_changed: function(point) {
		if (!this._path)
			return;
		var curve = this._path._curves && this.getCurve(), other;
		if (curve) {
			curve._changed();
			if (other = (curve[point == this._point
					|| point == this._handleIn && curve._segment1 == this
					? 'getPrevious' : 'getNext']())) {
				other._changed();
			}
		}
		this._path._changed(ChangeFlags.GEOMETRY);
	},

	getPoint: function() {
		return this._point;
	},

	setPoint: function(point) {
		point = Point.read(arguments);
		this._point.set(point.x, point.y);
	},

	getHandleIn: function() {
		return this._handleIn;
	},

	setHandleIn: function(point) {
		point = Point.read(arguments);
		this._handleIn.set(point.x, point.y);
	},

	getHandleInIfSet: function() {
		return this._handleIn._x == 0 && this._handleIn._y == 0
			? null : this._handleIn;
	},

	getHandleOut: function() {
		return this._handleOut;
	},

	setHandleOut: function(point) {
		point = Point.read(arguments);
		this._handleOut.set(point.x, point.y);
	},

	getHandleOutIfSet: function() {
		return this._handleOut._x == 0 && this._handleOut._y == 0
			? null : this._handleOut;
	},

	_isSelected: function(point) {
		var state = this._selectionState;
		return point == this._point ? !!(state & SelectionState.POINT)
			: point == this._handleIn ? !!(state & SelectionState.HANDLE_IN)
			: point == this._handleOut ? !!(state & SelectionState.HANDLE_OUT)
			: false;
	},

	_setSelected: function(point, selected) {
		var path = this._path,
			selected = !!selected, 
			state = this._selectionState,
			wasSelected = !!state,
			selection = [
				!!(state & SelectionState.POINT),
				!!(state & SelectionState.HANDLE_IN),
				!!(state & SelectionState.HANDLE_OUT)
			];
		if (point == this._point) {
			if (selected) {
				selection[1] = selection[2] = false;
			} else {
				var previous = this.getPrevious(),
					next = this.getNext();
				selection[1] = previous && (previous._point.isSelected()
						|| previous._handleOut.isSelected());
				selection[2] = next && (next._point.isSelected()
						|| next._handleIn.isSelected());
			}
			selection[0] = selected;
		} else {
			var index = point == this._handleIn ? 1 : 2;
			if (selection[index] != selected) {
				if (selected)
					selection[0] = false;
				selection[index] = selected;
			}
		}
		this._selectionState = (selection[0] ? SelectionState.POINT : 0)
				| (selection[1] ? SelectionState.HANDLE_IN : 0)
				| (selection[2] ? SelectionState.HANDLE_OUT : 0);
		if (path && wasSelected != !!this._selectionState)
			path._updateSelection(this);
	},

	isSelected: function() {
		return this._isSelected(this._point);
	},

	setSelected: function(selected) {
		this._setSelected(this._point, selected);
	},

	getIndex: function() {
		return this._index !== undefined ? this._index : null;
	},

	getPath: function() {
		return this._path || null;
	},

	getCurve: function() {
		if (this._path) {
			var index = this._index;
			if (!this._path._closed && index == this._path._segments.length - 1)
				index--;
			return this._path.getCurves()[index] || null;
		}
		return null;
	},

	getNext: function() {
		var segments = this._path && this._path._segments;
		return segments && (segments[this._index + 1]
				|| this._path._closed && segments[0]) || null;
	},

	getPrevious: function() {
		var segments = this._path && this._path._segments;
		return segments && (segments[this._index - 1]
				|| this._path._closed && segments[segments.length - 1]) || null;
	},

	reverse: function() {
		return new Segment(this._point, this._handleOut, this._handleIn);
	},

	remove: function() {
		return this._path ? !!this._path.removeSegment(this._index) : false;
	},

	toString: function() {
		var parts = [ 'point: ' + this._point ];
		if (!this._handleIn.isZero())
			parts.push('handleIn: ' + this._handleIn);
		if (!this._handleOut.isZero())
			parts.push('handleOut: ' + this._handleOut);
		return '{ ' + parts.join(', ') + ' }';
	},

	_transformCoordinates: function(matrix, coords, change) {
		var point = this._point,
			handleIn =  matrix && this.getHandleInIfSet() || this._handleIn,
			handleOut = matrix && this.getHandleOutIfSet() || this._handleOut,
			x = point._x,
			y = point._y,
			i = 2;
		coords[0] = x;
		coords[1] = y;
		if (handleIn) {
			coords[i++] = handleIn._x + x;
			coords[i++] = handleIn._y + y;
		}
		if (handleOut) {
			coords[i++] = handleOut._x + x;
			coords[i++] = handleOut._y + y;
		}
		if (matrix) {
			matrix._transformCoordinates(coords, 0, coords, 0, i / 2);
			x = coords[0];
			y = coords[1];
			if (change) {
				point._x = x;
				point._y = y;
				i  = 2;
				if (handleIn) {
					handleIn._x = coords[i++] - x;
					handleIn._y = coords[i++] - y;
				}
				if (handleOut) {
					handleOut._x = coords[i++] - x;
					handleOut._y = coords[i++] - y;
				}
			} else {
				if (!handleIn) {
					coords[i++] = x;
					coords[i++] = y;
				}
				if (!handleOut) {
					coords[i++] = x;
					coords[i++] = y;
				}
			}
		}
	}
});

var SegmentPoint = Point.extend({
	beans: true,

	set: function(x, y) {
		this._x = x;
		this._y = y;
		this._owner._changed(this);
		return this;
	},

	getX: function() {
		return this._x;
	},

	setX: function(x) {
		this._x = x;
		this._owner._changed(this);
	},

	getY: function() {
		return this._y;
	},

	setY: function(y) {
		this._y = y;
		this._owner._changed(this);
	},
	setSelected: function(selected) {
		this._owner._setSelected(this, selected);
	},
	isSelected: function() {
		return this._owner._isSelected(this);
	},
	statics: {
		create: function(segment, key, pt) {
			var point = new SegmentPoint(SegmentPoint.dont),
				x, y, selected;
			if (!pt) {
				x = y = 0;
			} else if (pt.x !== undefined) {
				x = pt.x;
				y = pt.y;
				selected = pt.selected;
			} else {
				x = pt[0];
				y = pt[1];
			}
			point._x = x;
			point._y = y;
			point._owner = segment;
			segment[key] = point;
			if (selected)
				point.setSelected(true);
			return point;
		}
	}
});

var SelectionState = {
	POINT: 1,
	HANDLE_IN: 2,
	HANDLE_OUT: 4,
	HANDLE_BOTH: 6
};

var Curve = this.Curve = Base.extend({

	beans: true,

	initialize: function(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7) {
		var count = arguments.length;
		if (count == 0) {
			this._segment1 = new Segment();
			this._segment2 = new Segment();
		} else if (count == 1) {
			this._segment1 = new Segment(arg0.segment1);
			this._segment2 = new Segment(arg0.segment2);
		} else if (count == 2) {
			this._segment1 = new Segment(arg0);
			this._segment2 = new Segment(arg1);
		} else if (count == 4) {
			this._segment1 = new Segment(arg0, null, arg1);
			this._segment2 = new Segment(arg3, arg2, null);
		} else if (count == 8) {
			var p1 = Point.create(arg0, arg1),
				p2 = Point.create(arg6, arg7);
			p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y
			this._segment1 = new Segment(p1, null,
					Point.create(arg2, arg3).subtract(p1));
			this._segment2 = new Segment(p2,
					Point.create(arg4, arg5).subtract(p2), null);
		}
	},

	_changed: function() {
		delete this._length;
	},

	getPoint1: function() {
		return this._segment1._point;
	},

	setPoint1: function(point) {
		point = Point.read(arguments);
		this._segment1._point.set(point.x, point.y);
	},

	getPoint2: function() {
		return this._segment2._point;
	},

	setPoint2: function(point) {
		point = Point.read(arguments);
		this._segment2._point.set(point.x, point.y);
	},
	getHandle1: function() {
		return this._segment1._handleOut;
	},

	setHandle1: function(point) {
		point = Point.read(arguments);
		this._segment1._handleOut.set(point.x, point.y);
	},

	getHandle2: function() {
		return this._segment2._handleIn;
	},

	setHandle2: function(point) {
		point = Point.read(arguments);
		this._segment2._handleIn.set(point.x, point.y);
	},

	getSegment1: function() {
		return this._segment1;
	},

	getSegment2: function() {
		return this._segment2;
	},

	getPath: function() {
		return this._path;
	},

	getIndex: function() {
		return this._segment1._index;
	},

	getNext: function() {
		var curves = this._path && this._path._curves;
		return curves && (curves[this._segment1._index + 1]
				|| this._path._closed && curves[0]) || null;
	},

	getPrevious: function() {
		var curves = this._path && this._path._curves;
		return curves && (curves[this._segment1._index - 1]
				|| this._path._closed && curves[curves.length - 1]) || null;
	},

	isSelected: function() {
		return this.getHandle1().isSelected() && this.getHandle2().isSelected();
	},

	setSelected: function(selected) {
		this.getHandle1().setSelected(selected);
		this.getHandle2().setSelected(selected);
	},

	getValues: function() {
		return Curve.getValues(this._segment1, this._segment2);
	},

	getLength: function() {
		var from = arguments[0],
			to = arguments[1];
			fullLength = arguments.length == 0 || from == 0 && to == 1;
		if (fullLength && this._length != null)
			return this._length;
		var args = this.getValues();
		if (!fullLength)
			args.push(from, to);
		var length = Curve.getLength.apply(Curve, args);
		if (fullLength)
			this._length = length;
		return length;
	},

	getPart: function(from, to) {
		var args = this.getValues();
		args.push(from, to);
		return new Curve(Curve.getPart.apply(Curve, args));
	},

	isLinear: function() {
		return this._segment1._handleOut.isZero()
				&& this._segment2._handleIn.isZero();
	},

	getParameter: function(length, start) {
		var args = this.getValues();
		args.push(length, start !== undefined ? start : length < 0 ? 1 : 0);
		return Curve.getParameter.apply(Curve, args);
	},

	_evaluate: function(parameter, type) {
		var args = this.getValues();
		args.push(parameter, type);
		return Curve.evaluate.apply(Curve, args);
	},

	getPoint: function(parameter) {
		return this._evaluate(parameter, 0);
	},

	getTangent: function(parameter) {
		return this._evaluate(parameter, 1);
	},

	getNormal: function(parameter) {
		return this._evaluate(parameter, 2);
	},

	reverse: function() {
		return new Curve(this._segment2.reverse(), this._segment1.reverse());
	},

	clone: function() {
		return new Curve(this._segment1, this._segment2);
	},

	toString: function() {
		var parts = [ 'point1: ' + this._segment1._point ];
		if (!this._segment1._handleOut.isZero())
			parts.push('handle1: ' + this._segment1._handleOut);
		if (!this._segment2._handleIn.isZero())
			parts.push('handle2: ' + this._segment2._handleIn);
		parts.push('point2: ' + this._segment2._point);
		return '{ ' + parts.join(', ') + ' }';
	},

	statics: {
		create: function(path, segment1, segment2) {
			var curve = new Curve(Curve.dont);
			curve._path = path;
			curve._segment1 = segment1;
			curve._segment2 = segment2;
			return curve;
		},

		getValues: function(segment1, segment2) {
			var p1 = segment1._point,
				h1 = segment1._handleOut,
				h2 = segment2._handleIn,
				p2 = segment2._point;
			return [
				p1._x, p1._y,
				p1._x + h1._x, p1._y + h1._y,
				p2._x + h2._x, p2._y + h2._y,
				p2._x, p2._y
			];
		},

		evaluate: function(p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y, t, type) {
			var x, y;

			if (t == 0 || t == 1) {
				var point;
				switch (type) {
				case 0: 
					x = t == 0 ? p1x : p2x;
					y = t == 0 ? p1y : p2y;
					break;
				case 1: 
				case 2: 
					var px, py;
					if (t == 0) {
						if (c1x == p1x && c1y == p1y) { 
							if (c2x == p2x && c2y == p2y) { 
								px = p2x; py = p2y; 
							} else {
								px = c2x; py = c2y; 
							}
						} else {
							px = c1x; py = c1y; 
						}
						x = px - p1x;
						y = py - p1y;
					} else {
						if (c2x == p2x && c2y == p2y) { 
							if (c1x == p1x && c1y == p1y) { 
								px = p1x; py = p1y; 
							} else {
								px = c1x; py = c1y; 
							}
						} else { 
							px = c2x; py = c2y;
						}
						x = p2x - px;
						y = p2y - py;
					}
					break;
				}
			} else {
				var cx = 3 * (c1x - p1x),
					bx = 3 * (c2x - c1x) - cx,
					ax = p2x - p1x - cx - bx,

					cy = 3 * (c1y - p1y),
					by = 3 * (c2y - c1y) - cy,
					ay = p2y - p1y - cy - by;
				switch (type) {
				case 0: 
					x = ((ax * t + bx) * t + cx) * t + p1x;
					y = ((ay * t + by) * t + cy) * t + p1y;
					break;
				case 1: 
				case 2: 
					x = (3 * ax * t + 2 * bx) * t + cx;
					y = (3 * ay * t + 2 * by) * t + cy;
					break;
				}
			}
			return type == 2 ? new Point(y, -x) : new Point(x, y);
		},

		subdivide: function(p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y, t) {
			if (t === undefined)
				t = 0.5;
			var u = 1 - t,
				p3x = u * p1x + t * c1x,
				p3y = u * p1y + t * c1y,
				p4x = u * c1x + t * c2x,
				p4y = u * c1y + t * c2y,
				p5x = u * c2x + t * p2x,
				p5y = u * c2y + t * p2y,
				p6x = u * p3x + t * p4x,
				p6y = u * p3y + t * p4y,
				p7x = u * p4x + t * p5x,
				p7y = u * p4y + t * p5y,
				p8x = u * p6x + t * p7x,
				p8y = u * p6y + t * p7y;
			return [
				[p1x, p1y, p3x, p3y, p6x, p6y, p8x, p8y], 
				[p8x, p8y, p7x, p7y, p5x, p5y, p2x, p2y] 
			];
		},

		getPart: function(p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y, from, to) {
			var curve = [p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y];
			if (from > 0) {
				curve[8] = from;
				curve = Curve.subdivide.apply(Curve, curve)[1]; 
			}
			if (to < 1) {
				curve[8] = (to - from) / (1 - from);
				curve = Curve.subdivide.apply(Curve, curve)[0]; 
			}
			return curve;
		},

		isSufficientlyFlat: function(p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y) {
			var vx = (p2x - p1x) / 3,
				vy = (p2y - p1y) / 3,
				m1x = p1x + vx,
				m1y = p1y + vy,
				m2x = p2x - vx,
				m2y = p2y - vy;
			return Math.max(
					Math.abs(m1x - c1x), Math.abs(m1y - c1y),
					Math.abs(m2x - c1x), Math.abs(m1y - c1y)) < 1 / 2;
		}
	}
}, new function() { 

	function getLengthIntegrand(p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y) {
		var ax = 9 * (c1x - c2x) + 3 * (p2x - p1x),
			bx = 6 * (p1x + c2x) - 12 * c1x,
			cx = 3 * (c1x - p1x),

			ay = 9 * (c1y - c2y) + 3 * (p2y - p1y),
			by = 6 * (p1y + c2y) - 12 * c1y,
			cy = 3 * (c1y - p1y);

		return function(t) {
			var dx = (ax * t + bx) * t + cx,
				dy = (ay * t + by) * t + cy;
			return Math.sqrt(dx * dx + dy * dy);
		};
	}

	function getIterations(a, b) {
		return Math.max(2, Math.min(16, Math.ceil(Math.abs(b - a) * 32)));
	}

	return {
		statics: true,

		getLength: function(p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y, a, b) {
			if (a === undefined)
				a = 0;
			if (b === undefined)
				b = 1;
			if (p1x == c1x && p1y == c1y && p2x == c2x && p2y == c2y) {
				var dx = p2x - p1x,
					dy = p2y - p1y;
				return (b - a) * Math.sqrt(dx * dx + dy * dy);
			}
			var ds = getLengthIntegrand(
					p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y);
			return Numerical.integrate(ds, a, b, getIterations(a, b));
		},

		getParameter: function(p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y,
				length, start) {
			if (length == 0)
				return start;
			var forward = length > 0,
				a = forward ? start : 0,
				b = forward ? 1 : start,
				length = Math.abs(length),
				ds = getLengthIntegrand(
						p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y),
				rangeLength = Numerical.integrate(ds, a, b,
						getIterations(a, b));
			if (length >= rangeLength)
				return forward ? b : a;
			var guess = length / rangeLength,
				len = 0;
			function f(t) {
				var count = getIterations(start, t);
				if (start < t) {
					len += Numerical.integrate(ds, start, t, count);
				} else {
					len -= Numerical.integrate(ds, t, start, count);
				}
				start = t;
				return len - length;
			}
			return Numerical.findRoot(f, ds,
					forward ? a + guess : b - guess, 
					a, b, 16, Numerical.TOLERANCE);
		}
	};
});

CurveLocation = Base.extend({

	beans: true,

	initialize: function(curve, parameter, point) {
		this._curve = curve;
		this._parameter = parameter;
		this._point = point;
	},

	getSegment: function() {
		if (!this._segment) {
			var parameter = this.getParameter();
			if (parameter == 0) {
				this._segment = curve._segment1;
			} else if (parameter == 1) {
				this._segment = curve._segment2;
			} else if (parameter == null) {
				return null;
			} else {
				this._segment = curve.getLength(0, parameter)
					< curve.getLength(parameter, 1)
						? curve._segment1
						: curve._segment2;
			}
		}
		return this._segment;
	},

	getCurve: function() {
		return this._curve;
	},

	getItem: function() {
		return this._curve && this._curve._path;
	},

	getIndex: function() {
		return this._curve && this._curve.getIndex();
	},

	getOffset: function() {
		var path = this._curve && this._curve._path;
		return path && path._getOffset(this);
	},

	getCurveOffset: function() {
		var parameter = this._curve && this.getParameter();
		return parameter != null ? this._curve.getLength(0, parameter) : null;
	},

	getParameter: function() {
		if (this._parameter == null && this._point)
			this._parameter = this._curve.getParameter(this._point);
		return this._parameter;
	},

	getPoint: function() {
		if (!this._point && this._curve) {
			var parameter = this.getParameter();
			if (parameter != null)
				this._point = this._curve.getPoint(parameter);
		}
		return this._point;
	},

	getTangent: function() {
		var parameter = this.getParameter();
		return parameter != null && this._curve
				&& this._curve.getTangent(parameter);
	},
	getNormal: function() {
		var parameter = this.getParameter();
		return parameter != null && this._curve
				&& this._curve.getNormal(parameter);
	},

	toString: function() {
		var parts = [],
			point = this.getPoint();
		if (point)
			parts.push('point: ' + point);
		var index = this.getIndex();
		if (index != null)
			parts.push('index: ' + index);
		var parameter = this.getParameter();
		if (parameter != null)
			parts.push('parameter: ' + Base.formatNumber(parameter));
		return '{ ' + parts.join(', ') + ' }';
	}
});

var PathItem = this.PathItem = Item.extend({
});

var Path = this.Path = PathItem.extend({

	beans: true,

	initialize: function(segments) {
		this.base();
		this._closed = false;
		this._selectedSegmentCount = 0;
		this.setSegments(!segments || !Array.isArray(segments)
				|| typeof segments[0] !== 'object' ? arguments : segments);
	},

	clone: function() {
		var copy = this._clone(new Path(this._segments));
		copy._closed = this._closed;
		if (this._clockwise !== undefined)
			copy._clockwise = this._clockwise;
		return copy;
	},

	_changed: function(flags) {
		if (flags & ChangeFlags.GEOMETRY) {
			delete this._length;
			delete this._bounds;
			delete this._position;
			delete this._strokeBounds;
			delete this._clockwise;
		} else if (flags & ChangeFlags.STROKE) {
			delete this._strokeBounds;
		}
	},

	getSegments: function() {
		return this._segments;
	},

	setSegments: function(segments) {
		if (!this._segments) {
			this._segments = [];
		} else {
			this.setSelected(false);
			this._segments.length = 0;
			if (this._curves)
				delete this._curves;
		}
		this._add(Segment.readAll(segments));
	},

	getFirstSegment: function() {
		return this._segments[0];
	},

	getLastSegment: function() {
		return this._segments[this._segments.length - 1];
	},

	getCurves: function() {
		if (!this._curves) {
			var segments = this._segments,
				length = segments.length;
			if (!this._closed && length > 0)
				length--;
			this._curves = new Array(length);
			for (var i = 0; i < length; i++)
				this._curves[i] = Curve.create(this, segments[i],
					segments[i + 1] || segments[0]);
		}
		return this._curves;
	},

	getFirstCurve: function() {
		return this.getCurves()[0];
	},

	getLastCurve: function() {
		var curves = this.getCurves();
		return curves[curves.length - 1];
	},

	getClosed: function() {
		return this._closed;
	},

	setClosed: function(closed) {
		if (this._closed != (closed = !!closed)) {
			this._closed = closed;
			if (this._curves) {
				var length = this._segments.length,
					i;
				if (!closed && length > 0)
					length--;
				this._curves.length = length;
				if (closed)
					this._curves[i = length - 1] = Curve.create(this,
						this._segments[i], this._segments[0]);
			}
			this._changed(ChangeFlags.GEOMETRY);
		}
	},

	_transform: function(matrix, flags) {
		if (!matrix.isIdentity()) {
			var coords = new Array(6);
			for (var i = 0, l = this._segments.length; i < l; i++) {
				this._segments[i]._transformCoordinates(matrix, coords, true);
			}
			var fillColor = this.getFillColor(),
				strokeColor = this.getStrokeColor();
			if (fillColor && fillColor.transform)
				fillColor.transform(matrix);
			if (strokeColor && strokeColor.transform)
				strokeColor.transform(matrix);
		}
		this._changed(ChangeFlags.GEOMETRY);
	},

	_add: function(segs, index) {
		var segments = this._segments,
			curves = this._curves,
			amount = segs.length,
			append = index == null,
			index = append ? segments.length : index;
		for (var i = 0; i < amount; i++) {
			var segment = segs[i];
			if (segment._path) {
				segment = segs[i] = new Segment(segment);
			}
			segment._path = this;
			segment._index = index + i;
			if (segment._selectionState)
				this._updateSelection(segment);
		}
		if (append) {
			segments.push.apply(segments, segs);
		} else {
			segments.splice.apply(segments, [index, 0].concat(segs));
			for (var i = index + amount, l = segments.length; i < l; i++) {
				segments[i]._index = i;
			}
		}
		if (curves && --index >= 0) {
			curves.splice(index, 0, Curve.create(this, segments[index],
				segments[index + 1]));
			var curve = curves[index + amount];
			if (curve) {
				curve._segment1 = segments[index + amount];
			}
		}
		this._changed(ChangeFlags.GEOMETRY);
		return segs;
	},

	_updateSelection: function(segment) {
		var count = this._selectedSegmentCount +=
				segment._selectionState ? 1 : -1;
		if (count <= 1)
			this._project._selectItem(this, count == 1);
	},

	add: function(segment1 ) {
		return arguments.length > 1 && typeof segment1 !== 'number'
			? this._add(Segment.readAll(arguments))
			: this._add([ Segment.read(arguments) ])[0];
	},

	insert: function(index, segment1 ) {
		return arguments.length > 2 && typeof segment1 !== 'number'
			? this._add(Segment.readAll(arguments, 1), index)
			: this._add([ Segment.read(arguments, 1) ], index)[0];
	},

	addSegment: function(segment) {
		return this._add([ Segment.read(arguments) ])[0];
	},

	insertSegment: function(index, segment) {
		return this._add([ Segment.read(arguments, 1) ], index)[0];
	},

	addSegments: function(segments) {
		return this._add(Segment.readAll(segments));
	},

	insertSegments: function(index, segments) {
		return this._add(Segment.readAll(segments), index);
	},

	removeSegment: function(index) {
		var segments = this.removeSegments(index, index + 1);
		return segments[0] || null;
	},
	removeSegments: function(from, to) {
		from = from || 0;
	 	to = Base.pick(to, this._segments.length - 1);
		var segments = this._segments,
			curves = this._curves,
			last = to >= segments.length,
			removed = segments.splice(from, to - from),
			amount = removed.length;
		if (!amount)
			return removed;
		for (var i = 0; i < amount; i++) {
			var segment = removed[i];
			if (segment._selectionState) {
				segment._selectionState = 0;
				this._updateSelection(segment);
			}
			removed._index = removed._path = undefined;
		}
		for (var i = from, l = segments.length; i < l; i++)
			segments[i]._index = i;
		if (curves) {
			curves.splice(from, amount);
			var curve;
			if (curve = curves[from - 1])
				curve._segment2 = segments[from];
			if (curve = curves[from])
				curve._segment1 = segments[from];
			if (last && this._closed && (curve = curves[curves.length - 1]))
				curve._segment2 = segments[0];
		}
		this._changed(ChangeFlags.GEOMETRY);
		return removed;
	},

	isSelected: function() {
		return this._selectedSegmentCount > 0;
	},
	setSelected: function(selected) {
		var wasSelected = this.isSelected(),
			length = this._segments.length;
		if (!wasSelected != !selected && length)
			this._project._selectItem(this, selected);
		this._selectedSegmentCount = selected ? length : 0;
		for (var i = 0; i < length; i++)
			this._segments[i]._selectionState = selected
					? SelectionState.POINT : 0;
	},

	isFullySelected: function() {
		return this._selectedSegmentCount == this._segments.length;
	},
	setFullySelected: function(selected) {
		this.setSelected(selected);
	},

	curvesToPoints: function(maxDistance) {
		var flattener = new PathFlattener(this),
			pos = 0,
			step = flattener.length / Math.ceil(flattener.length / maxDistance),
			end = flattener.length + step / 2;
		var segments = [];
		while (pos <= end) {
			segments.push(new Segment(flattener.evaluate(pos, 0)));
			pos += step;
		}
		this.setSegments(segments);
	},

	pointsToCurves: function(tolerance) {
		var fitter = new PathFitter(this, tolerance || 2.5);
		this.setSegments(fitter.fit());
	},

	isClockwise: function() {
		if (this._clockwise !== undefined)
			return this._clockwise;
		var sum = 0,
			xPre, yPre;
		function edge(x, y) {
			if (xPre !== undefined)
				sum += (xPre - x) * (y + yPre);
			xPre = x;
			yPre = y;
		}
		for (var i = 0, l = this._segments.length; i < l; i++) {
			var seg1 = this._segments[i],
				seg2 = this._segments[i + 1 < l ? i + 1 : 0],
				point1 = seg1._point,
				handle1 = seg1._handleOut,
				handle2 = seg2._handleIn,
				point2 = seg2._point;
			edge(point1._x, point1._y);
			edge(point1._x + handle1._x, point1._y + handle1._y);
			edge(point2._x + handle2._x, point2._y + handle2._y);
			edge(point2._x, point2._y);
		}
		return sum > 0;
	},

	setClockwise: function(clockwise) {
		if (this.isClockwise() != (clockwise = !!clockwise)) {
			this.reverse();
			this._clockwise = clockwise;
		}
	},

	reverse: function() {
		this._segments.reverse();
		for (var i = 0, l = this._segments.length; i < l; i++) {
			var segment = this._segments[i];
			var handleIn = segment._handleIn;
			segment._handleIn = segment._handleOut;
			segment._handleOut = handleIn;
		}
		if (this._clockwise !== undefined)
			this._clockwise = !this._clockwise;
	},

	join: function(path) {
		if (path) {
			var segments = path._segments,
				last1 = this.getLastSegment(),
				last2 = path.getLastSegment();
			if (last1._point.equals(last2._point))
				path.reverse();
			var first2 = path.getFirstSegment();
			if (last1._point.equals(first2._point)) {
				last1.setHandleOut(first2._handleOut);
				this._add(segments.slice(1));
			} else {
				var first1 = this.getFirstSegment();
				if (first1._point.equals(first2._point))
					path.reverse();
				last2 = path.getLastSegment();
				if (first1._point.equals(last2._point)) {
					first1.setHandleIn(last2._handleIn);
					this._add(segments.slice(0, segments.length - 1), 0);
				} else {
					this._add(segments.slice(0));
				}
			}
			path.remove();
			var first1 = this.getFirstSegment();
			last1 = this.getLastSegment();
			if (last1._point.equals(first1._point)) {
				first1.setHandleIn(last1._handleIn);
				last1.remove();
				this.setClosed(true);
			}
			this._changed(ChangeFlags.GEOMETRY);
			return true;
		}
		return false;
	},

	getLength: function() {
		if (this._length == null) {
			var curves = this.getCurves();
			this._length = 0;
			for (var i = 0, l = curves.length; i < l; i++)
				this._length += curves[i].getLength();
		}
		return this._length;
	},

	_getOffset: function(location) {
		var index = location && location.getIndex();
		if (index != null) {
			var curves = this.getCurves(),
				offset = 0;
			for (var i = 0; i < index; i++)
				offset += curves[i].getLength();
			var curve = curves[index];
			return offset + curve.getLength(0, location.getParameter());
		}
		return null;
	},

	getLocationAt: function(offset, isParameter) {
		var curves = this.getCurves(),
			length = 0;
		if (isParameter) {
			var index = ~~offset; 
			return new CurveLocation(curves[index], offset - index);
		}
		for (var i = 0, l = curves.length; i < l; i++) {
			var start = length,
				curve = curves[i];
			length += curve.getLength();
			if (length >= offset) {
				return new CurveLocation(curve,
						curve.getParameter(offset - start));
			}
		}
		if (offset <= this.getLength())
			return new CurveLocation(curves[curves.length - 1], 1);
		return null;
	},

	getPointAt: function(offset, isParameter) {
		var loc = this.getLocationAt(offset, isParameter);
		return loc && loc.getPoint();
	},
	getTangentAt: function(offset, isParameter) {
		var loc = this.getLocationAt(offset, isParameter);
		return loc && loc.getTangent();
	},
	getNormalAt: function(offset, isParameter) {
		var loc = this.getLocationAt(offset, isParameter);
		return loc && loc.getNormal();
	}
}, new function() { 

	function drawHandles(ctx, segments) {
		for (var i = 0, l = segments.length; i < l; i++) {
			var segment = segments[i],
				point = segment._point,
				pointSelected = segment._selectionState == SelectionState.POINT;
				if (pointSelected || segment._isSelected(segment._handleIn))
					drawHandle(ctx, point, segment._handleIn);
				if (pointSelected || segment._isSelected(segment._handleOut))
					drawHandle(ctx, point, segment._handleOut);
			ctx.save();
			ctx.beginPath();
			ctx.rect(point._x - 2, point._y - 2, 4, 4);
			ctx.fill();
			if (!pointSelected) {
				ctx.beginPath();
				ctx.rect(point._x - 1, point._y - 1, 2, 2);
				ctx.fillStyle = '#ffffff';
				ctx.fill();
				ctx.restore();
			}
		}
	}
	function drawHandle(ctx, point, handle) {
		if (!handle.isZero()) {
			var handleX = point._x + handle._x,
				handleY = point._y + handle._y;
			ctx.beginPath();
			ctx.moveTo(point._x, point._y);
			ctx.lineTo(handleX, handleY);
			ctx.stroke();
			ctx.beginPath();
			ctx.arc(handleX, handleY, 1.75, 0, Math.PI * 2, true);
			ctx.fill();
		}
	}

	function drawSegments(ctx, path) {
		var segments = path._segments,
			length = segments.length,
			handleOut, outX, outY;

		function drawSegment(i) {
			var segment = segments[i],
				point = segment._point,
				x = point._x,
				y = point._y,
				handleIn = segment._handleIn;
			if (!handleOut) {
				ctx.moveTo(x, y);
			} else {
				if (handleIn.isZero() && handleOut.isZero()) {
					ctx.lineTo(x, y);
				} else {
					ctx.bezierCurveTo(outX, outY,
							handleIn._x + x, handleIn._y + y, x, y);
				}
			}
			handleOut = segment._handleOut;
			outX = handleOut._x + x;
			outY = handleOut._y + y;
		}

		for (var i = 0; i < length; i++)
			drawSegment(i);
		if (path._closed && length > 1)
			drawSegment(0);
	}

	function drawDashes(ctx, path, dashArray, dashOffset) {
		var flattener = new PathFlattener(path),
			from = dashOffset, to,
			i = 0;
		while (from < flattener.length) {
			to = from + dashArray[(i++) % dashArray.length];
			flattener.drawPart(ctx, from, to);
			from = to + dashArray[(i++) % dashArray.length];
		}
	}

	return {
		draw: function(ctx, param) {
			if (!param.compound)
				ctx.beginPath();

			var fillColor = this.getFillColor(),
				strokeColor = this.getStrokeColor(),
				dashArray = this.getDashArray() || [], 
				hasDash = !!dashArray.length;

			if (param.compound || param.selection || param.clip || fillColor
					|| strokeColor && !hasDash) {
				drawSegments(ctx, this);
			}

			if (param.selection) {
				ctx.stroke();
				drawHandles(ctx, this._segments);
			} else if (param.clip) {
				ctx.clip();
			} else if (!param.compound && (fillColor || strokeColor)) {
				ctx.save();
				this._setStyles(ctx);
				if (!fillColor || !strokeColor)
					ctx.globalAlpha = this.opacity;
				if (fillColor) {
					ctx.fillStyle = fillColor.getCanvasStyle(ctx);
					ctx.fill();
				}
				if (strokeColor) {
					ctx.strokeStyle = strokeColor.getCanvasStyle(ctx);
					if (hasDash) {
						ctx.beginPath();
						drawDashes(ctx, this, dashArray, this.getDashOffset());
					}
					ctx.stroke();
				}
				ctx.restore();
			}
		}
	};
}, new function() { 

	function getFirstControlPoints(rhs) {
		var n = rhs.length,
			x = [], 
			tmp = [], 
			b = 2;
		x[0] = rhs[0] / b;
		for (var i = 1; i < n; i++) {
			tmp[i] = 1 / b;
			b = (i < n - 1 ? 4 : 2) - tmp[i];
			x[i] = (rhs[i] - x[i - 1]) / b;
		}
		for (var i = 1; i < n; i++) {
			x[n - i - 1] -= tmp[n - i] * x[n - i];
		}
		return x;
	};

	var styles = {
		getStrokeWidth: 'lineWidth',
		getStrokeJoin: 'lineJoin',
		getStrokeCap: 'lineCap',
		getMiterLimit: 'miterLimit'
	};

	return {

		_setStyles: function(ctx) {
			for (var i in styles) {
				var style = this._style[i]();
				if (style)
					ctx[styles[i]] = style;
			}
		},

		smooth: function() {
			var segments = this._segments,
				size = segments.length,
				n = size,
				overlap;

			if (size <= 2)
				return;

			if (this._closed) {
				overlap = Math.min(size, 4);
				n += Math.min(size, overlap) * 2;
			} else {
				overlap = 0;
			}
			var knots = [];
			for (var i = 0; i < size; i++)
				knots[i + overlap] = segments[i]._point;
			if (this._closed) {
				for (var i = 0; i < overlap; i++) {
					knots[i] = segments[i + size - overlap]._point;
					knots[i + size + overlap] = segments[i]._point;
				}
			} else {
				n--;
			}
			var rhs = [];

			for (var i = 1; i < n - 1; i++)
				rhs[i] = 4 * knots[i]._x + 2 * knots[i + 1]._x;
			rhs[0] = knots[0]._x + 2 * knots[1]._x;
			rhs[n - 1] = 3 * knots[n - 1]._x;
			var x = getFirstControlPoints(rhs);

			for (var i = 1; i < n - 1; i++)
				rhs[i] = 4 * knots[i]._y + 2 * knots[i + 1]._y;
			rhs[0] = knots[0]._y + 2 * knots[1]._y;
			rhs[n - 1] = 3 * knots[n - 1]._y;
			var y = getFirstControlPoints(rhs);

			if (this._closed) {
				for (var i = 0, j = size; i < overlap; i++, j++) {
					var f1 = (i / overlap);
					var f2 = 1 - f1;
					x[j] = x[i] * f1 + x[j] * f2;
					y[j] = y[i] * f1 + y[j] * f2;
					var ie = i + overlap, je = j + overlap;
					x[je] = x[ie] * f2 + x[je] * f1;
					y[je] = y[ie] * f2 + y[je] * f1;
				}
				n--;
			}
			var handleIn = null;
			for (var i = overlap; i <= n - overlap; i++) {
				var segment = segments[i - overlap];
				if (handleIn)
					segment.setHandleIn(handleIn.subtract(segment._point));
				if (i < n) {
					segment.setHandleOut(
							new Point(x[i], y[i]).subtract(segment._point));
					if (i < n - 1)
						handleIn = new Point(
								2 * knots[i + 1]._x - x[i + 1],
								2 * knots[i + 1]._y - y[i + 1]);
					else
						handleIn = new Point(
								(knots[n]._x + x[n - 1]) / 2,
								(knots[n]._y + y[n - 1]) / 2);
				}
			}
			if (this._closed && handleIn) {
				var segment = this._segments[0];
				segment.setHandleIn(handleIn.subtract(segment._point));
			}
		}
	};
}, new function() { 

	function getCurrentSegment(that) {
		var segments = that._segments;
		if (segments.length == 0)
			throw('Use a moveTo() command first');
		return segments[segments.length - 1];
	}

	return {

		moveTo: function(point) {
			if (!this._segments.length)
				this._add([ new Segment(Point.read(arguments)) ]);
		},

		lineTo: function(point) {
			this._add([ new Segment(Point.read(arguments)) ]);
		},

		cubicCurveTo: function(handle1, handle2, to) {
			handle1 = Point.read(arguments, 0, 1);
			handle2 = Point.read(arguments, 1, 1);
			to = Point.read(arguments, 2, 1);
			var current = getCurrentSegment(this);
			current.setHandleOut(handle1.subtract(current._point));
			this._add([ new Segment(to, handle2.subtract(to)) ]);
		},

		quadraticCurveTo: function(handle, to) {
			handle = Point.read(arguments, 0, 1);
			to = Point.read(arguments, 1, 1);
			var current = getCurrentSegment(this)._point;
			this.cubicCurveTo(
				handle.add(current.subtract(handle).multiply(1/3)),
				handle.add(to.subtract(handle).multiply(1/3)),
				to
			);
		},

		curveTo: function(through, to, parameter) {
			through = Point.read(arguments, 0, 1);
			to = Point.read(arguments, 1, 1);
			var t = Base.pick(parameter, 0.5),
				t1 = 1 - t,
				current = getCurrentSegment(this)._point,
				handle = through.subtract(current.multiply(t1 * t1))
					.subtract(to.multiply(t * t)).divide(2 * t * t1);
			if (handle.isNaN())
				throw new Error(
					"Cannot put a curve through points with parameter=" + t);
			this.quadraticCurveTo(handle, to);
		},

		arcTo: function(to, clockwise) {
			var current = getCurrentSegment(this),
				through;
			if (arguments[1] && typeof arguments[1] !== 'boolean') {
				through = Point.read(arguments, 0, 1);
				to = Point.read(arguments, 1, 1);
			} else {
				to = Point.read(arguments, 0, 1);
				if (clockwise === undefined)
					clockwise = true;
				var middle = current._point.add(to).divide(2),
					step = middle.subtract(current._point);
				through = clockwise 
						? middle.subtract(-step.y, step.x)
						: middle.add(-step.y, step.x);
			}

			var x1 = current._point._x, x2 = through.x, x3 = to.x,
				y1 = current._point._y, y2 = through.y, y3 = to.y,

				f = x3 * x3 - x3 * x2 - x1 * x3 + x1 * x2 + y3 * y3 - y3 * y2
					- y1 * y3 + y1 * y2,
				g = x3 * y1 - x3 * y2 + x1 * y2 - x1 * y3 + x2 * y3 - x2 * y1,
				m = g == 0 ? 0 : f / g,
				e = x1 * x2 + y1 * y2 - m * (x1 * y2 - y1 * x2),
				cx = (x1 + x2 - m * (y2 - y1)) / 2,
				cy = (y1 + y2 - m * (x1 - x2)) / 2,
				radius = Math.sqrt(cx * cx + cy * cy - e),
				angle = Math.atan2(y1 - cy, x1 - cx),
				middle = Math.atan2(y2 - cy, x2 - cx),
				extent = Math.atan2(y3 - cy, x3 - cx),
				diff = middle - angle,
				d90 = Math.PI, 
				d180 = d90 * 2; 

			if (diff < -d90)
				diff += d180;
			else if (diff > d90)
				diff -= d180;

			extent -= angle;
			if (extent <= 0)
				extent += d180;
			if (diff < 0)
				extent -= d180;

			var ext = Math.abs(extent),
				arcSegs =  ext >= d180
				 	? 4 : Math.ceil(ext * 2 / Math.PI),
				inc = Math.min(Math.max(extent, -d180), d180) / arcSegs,
				z = 4 / 3 * Math.sin(inc / 2) / (1 + Math.cos(inc / 2)),
				segments = [];
			for (var i = 0; i <= arcSegs; i++) {
				var relx = Math.cos(angle),
					rely = Math.sin(angle);
				var pt = new Point(
					cx + relx * radius,
					cy + rely * radius
				);
				var out = i == arcSegs
					? null
					: new Point(
						cx + (relx - z * rely) * radius - pt.x,
						cy + (rely + z * relx) * radius - pt.y
					);
				if (i == 0) {
					current.setHandleOut(out);
				} else {
					segments.push(new Segment(pt, new Point(
						cx + (relx + z * rely) * radius - pt.x,
						cy + (rely - z * relx) * radius - pt.y
					), out));
				}
				angle += inc;
			}
			this._add(segments);
		},

		lineBy: function(vector) {
			vector = Point.read(arguments);
			var current = getCurrentSegment(this);
			this.lineTo(current._point.add(vector));
		},

		curveBy: function(throughVector, toVector, parameter) {
			throughVector = Point.read(throughVector);
			toVector = Point.read(toVector);
			var current = getCurrentSegment(this)._point;
			this.curveTo(current.add(throughVector), current.add(toVector),
					parameter);
		},

		arcBy: function(throughVector, toVector) {
			throughVector = Point.read(throughVector);
			toVector = Point.read(toVector);
			var current = getCurrentSegment(this)._point;
			this.arcBy(current.add(throughVector), current.add(toVector));
		},

		closePath: function() {
			this.setClosed(true);
		}
	};
}, new function() { 

	function getBounds(that, matrix, strokePadding) {
		var segments = that._segments,
			first = segments[0];
		if (!first)
			return null;
		var coords = new Array(6),
			prevCoords = new Array(6);
		if (matrix && matrix.isIdentity())
			matrix = null;
		first._transformCoordinates(matrix, prevCoords, false);
		var min = prevCoords.slice(0, 2),
			max = min.slice(0), 
			tMin = Numerical.TOLERANCE,
			tMax = 1 - tMin;
		function processSegment(segment) {
			segment._transformCoordinates(matrix, coords, false);

			for (var i = 0; i < 2; i++) {
				var v0 = prevCoords[i], 
					v1 = prevCoords[i + 4], 
					v2 = coords[i + 2], 
					v3 = coords[i]; 

				function add(value, t) {
					var padding = 0;
					if (value == null) {
						var u = 1 - t;
						value = u * u * u * v0
								+ 3 * u * u * t * v1
								+ 3 * u * t * t * v2
								+ t * t * t * v3;
						padding = strokePadding ? strokePadding[i] : 0;
					}
					var left = value - padding,
						right = value + padding;
					if (left < min[i])
						min[i] = left;
					if (right > max[i])
						max[i] = right;

				}
				add(v3, null);

				var a = 3 * (v1 - v2) - v0 + v3,
					b = 2 * (v0 + v2) - 4 * v1,
					c = v1 - v0;

				if (a == 0) {
					if (b == 0)
					    continue;
					var t = -c / b;
					if (tMin < t && t < tMax)
						add(null, t);
					continue;
				}

				var b2ac = b * b - 4 * a * c;
				if (b2ac < 0)
					continue;
				var sqrt = Math.sqrt(b2ac),
					f = 1 / (a * -2),
				 	t1 = (b - sqrt) * f,
					t2 = (b + sqrt) * f;
				if (tMin < t1 && t1 < tMax)
					add(null, t1);
				if (tMin < t2 && t2 < tMax)
					add(null, t2);
			}
			var tmp = prevCoords;
			prevCoords = coords;
			coords = tmp;
		}
		for (var i = 1, l = segments.length; i < l; i++)
			processSegment(segments[i]);
		if (that._closed)
			processSegment(first);
		return Rectangle.create(min[0], min[1],
					max[0] - min[0], max[1] - min[1]);
	}

	function getPenPadding(radius, matrix) {
		if (!matrix)
			return [radius, radius];
		var mx = matrix.createShiftless(),
			hor = mx.transform(new Point(radius, 0)),
			ver = mx.transform(new Point(0, radius)),
			phi = hor.getAngleInRadians(),
			a = hor.getLength(),
			b = ver.getLength();
		var tx = - Math.atan(b * Math.tan(phi)),
			ty = + Math.atan(b / Math.tan(phi)),
			x = a * Math.cos(tx) * Math.cos(phi)
				- b * Math.sin(tx) * Math.sin(phi),
			y = b * Math.sin(ty) * Math.cos(phi)
				+ a * Math.cos(ty) * Math.sin(phi);
		return [Math.abs(x), Math.abs(y)];
	}

	return {
		beans: true,

		getBounds: function() {
			var useCache = arguments.length == 0;
			if (!useCache || !this._bounds) {
				var bounds = getBounds(this, arguments[0]);
				if (!useCache)
					return bounds;
				this._bounds = LinkedRectangle.create(this, 'setBounds',
						bounds.x, bounds.y, bounds.width, bounds.height);
			}
			return this._bounds;
		},

		getStrokeBounds: function() {
			if (!this._style._strokeColor || !this._style._strokeWidth)
				return this.getBounds.apply(this, arguments);
			var useCache = arguments.length == 0;
			if (this._strokeBounds && useCache)
				return this._strokeBounds;
			var matrix = arguments[0], 
				width = this.getStrokeWidth(),
				radius = width / 2,
				padding = getPenPadding(radius, matrix),
				join = this.getStrokeJoin(),
				cap = this.getStrokeCap(),
				miter = this.getMiterLimit() * width / 2,
				segments = this._segments,
				length = segments.length,
				bounds = getBounds(this, matrix, getPenPadding(radius));
			var joinBounds = new Rectangle(new Size(padding).multiply(2));

			function add(point) {
				bounds = bounds.include(matrix
					? matrix.transform(point) : point);
			}

			function addBevelJoin(curve, t) {
				var point = curve.getPoint(t),
					normal = curve.getNormal(t).normalize(radius);
				add(point.add(normal));
				add(point.subtract(normal));
			}

			function addJoin(segment, join) {
				var handleIn = segment.getHandleInIfSet(),
					handleOut = segment.getHandleOutIfSet();
				if (join === 'round' || handleIn && handleOut) {
					bounds = bounds.unite(joinBounds.setCenter(matrix
						? matrix.transform(segment._point) : segment._point));
				} else if (join == 'bevel') {
					var curve = segment.getCurve();
					addBevelJoin(curve, 0);
					addBevelJoin(curve.getPrevious(), 1);
				} else if (join == 'miter') {
					var curve2 = segment.getCurve(),
						curve1 = curve2.getPrevious(),
						point = curve2.getPoint(0),
						normal1 = curve1.getNormal(1).normalize(radius),
						normal2 = curve2.getNormal(0).normalize(radius),
						line1 = new Line(point.add(normal1),
								new Point(-normal1.y, normal1.x)),
						line2 = new Line(point.subtract(normal2),
								new Point(-normal2.y, normal2.x)),
						corner = line1.intersect(line2);
					if (!corner || point.getDistance(corner) > miter) {
						addJoin(segment, 'bevel');
					} else {
						add(corner);
					}
				}
			}

			function addCap(segment, cap, t) {
				switch (cap) {
				case 'round':
					return addJoin(segment, cap);
				case 'butt':
				case 'square':
					var curve = segment.getCurve(),
						point = curve.getPoint(t),
						normal = curve.getNormal(t).normalize(radius);
					if (cap === 'square')
						point = point.add(normal.y, -normal.x);
					add(point.add(normal));
					add(point.subtract(normal));
					break;
				}
			}

			for (var i = 1, l = length - (this._closed ? 0 : 1); i < l; i++) {
				addJoin(segments[i], join);
			}
			if (this._closed) {
				addJoin(segments[0], join);
			} else {
				addCap(segments[0], cap, 0);
				addCap(segments[length - 1], cap, 1);
			}
			if (useCache)
				this._strokeBounds = bounds;
			return bounds;
		},

		getControlBounds: function() {
		}
	};
});

var CompoundPath = this.CompoundPath = PathItem.extend({

	initialize: function(paths) {
		this.base();
		this._children = [];
		var items = !paths || !Array.isArray(paths)
				|| typeof paths[0] !== 'object' ? arguments : paths;
		for (var i = 0, l = items.length; i < l; i++) {
			var path = items[i];
			if (path._clockwise === undefined)
				path.setClockwise(i < l - 1);
			this.appendTop(path);
		}
	},

	simplify: function() {
		if (this._children.length == 1) {
			var child = this._children[0];
			child.moveAbove(this);
			this.remove();
			return child;
		}
		return this;
	},

	smooth: function() {
		for (var i = 0, l = this._children.length; i < l; i++)
			this._children[i].smooth();
	},

	draw: function(ctx, param) {
		var firstChild = this._children[0];
		ctx.beginPath();
		param.compound = true;
		for (var i = 0, l = this._children.length; i < l; i++)
			Item.draw(this._children[i], ctx, param);
		firstChild._setStyles(ctx);
		var fillColor = firstChild.getFillColor(),
			strokeColor = firstChild.getStrokeColor();
		if (fillColor) {
			ctx.fillStyle = fillColor.getCanvasStyle(ctx);
			ctx.fill();
		}
		if (strokeColor) {
			ctx.strokeStyle = strokeColor.getCanvasStyle(ctx);
			ctx.stroke();
		}
		param.compound = false;
	}
}, new function() { 
	function getCurrentPath(that) {
		if (!that._children.length)
			throw new Error('Use a moveTo() command first');
		return that._children[that._children.length - 1];
	}

	var fields = {

		moveTo: function(point) {
			var path = new Path();
			this.appendTop(path);
			path.moveTo.apply(path, arguments);
		},

		moveBy: function(point) {
			this.moveTo(getCurrentPath(this).getLastSegment()._point.add(
					Point.read(arguments)));
		},

		closePath: function() {
			getCurrentPath(this).setClosed(true);
		}
	};

	Base.each(['lineTo', 'cubicCurveTo', 'quadraticCurveTo', 'curveTo',
			'arcTo', 'lineBy', 'curveBy', 'arcBy'], function(key) {
		fields[key] = function() {
			var path = getCurrentPath(this);
			path[key].apply(path, arguments);
		};
	});

	return fields;
});

Path.inject({ statics: new function() {
	var kappa = 2 / 3 * (Math.sqrt(2) - 1);

	var ovalSegments = [
		new Segment([0, 0.5], [0, kappa ], [0, -kappa]),
		new Segment([0.5, 0], [-kappa, 0], [kappa, 0 ]),
		new Segment([1, 0.5], [0, -kappa], [0, kappa ]),
		new Segment([0.5, 1], [kappa, 0 ], [-kappa, 0])
	];

	return {
		Line: function() {
			var step = Math.floor(arguments.length / 2);
			return new Path(
				Segment.read(arguments, 0, step),
				Segment.read(arguments, step, step)
			);
		},

		Rectangle: function(rect) {
			rect = Rectangle.read(arguments);
			var path = new Path(),
				corners = ['getBottomLeft', 'getTopLeft', 'getTopRight',
					'getBottomRight'],
				segments = new Array(4);
			for (var i = 0; i < 4; i++)
				segments[i] = new Segment(rect[corners[i]]());
			path._add(segments);
			path._closed = true;
			return path;
		},

		RoundRectangle: function(rect, size) {
			if (arguments.length == 2) {
				rect = Rectangle.read(arguments, 0, 1);
				size = Size.read(arguments, 1, 1);
			} else if (arguments.length == 6) {
				rect = Rectangle.read(arguments, 0, 4);
				size = Size.read(arguments, 4, 2);
			}
			size = Size.min(size, rect.getSize().divide(2));
			var path = new Path(),
				uSize = size.multiply(kappa * 2),
				bl = rect.getBottomLeft(),
				tl = rect.getTopLeft(),
				tr = rect.getTopRight(),
				br = rect.getBottomRight();
			path._add([
				new Segment(bl.add(size.width, 0), null, [-uSize.width, 0]),
				new Segment(bl.subtract(0, size.height), [0, uSize.height], null),

				new Segment(tl.add(0, size.height), null, [0, -uSize.height]),
				new Segment(tl.add(size.width, 0), [-uSize.width, 0], null),

				new Segment(tr.subtract(size.width, 0), null, [uSize.width, 0]),
				new Segment(tr.add(0, size.height), [0, -uSize.height], null),

				new Segment(br.subtract(0, size.height), null, [0, uSize.height]),
				new Segment(br.subtract(size.width, 0), [uSize.width, 0], null)
			]);
			path._closed = true;
			return path;
		},

		Oval: function(rect) {
			rect = Rectangle.read(arguments);
			var path = new Path(),
				topLeft = rect.getTopLeft(),
				size = new Size(rect.width, rect.height),
				segments = new Array(4);
			for (var i = 0; i < 4; i++) {
				var segment = ovalSegments[i];
				segments[i] = new Segment(
					segment._point.multiply(size).add(topLeft),
					segment._handleIn.multiply(size),
					segment._handleOut.multiply(size)
				);
			}
			path._add(segments);
			path._closed = true;
			return path;
		},

		Circle: function(center, radius) {
			if (arguments.length == 3) {
				center = Point.read(arguments, 0, 2);
				radius = arguments[2];
			} else {
				center = Point.read(arguments, 0, 1);
			}
			return Path.Oval(new Rectangle(center.subtract(radius),
					new Size(radius * 2, radius * 2)));
		},

		Arc: function(from, through, to) {
			var path = new Path();
			path.moveTo(from);
			path.arcTo(through, to);
			return path;
		},

		RegularPolygon: function(center, numSides, radius) {
			center = Point.read(arguments, 0, 1);
			var path = new Path(),
				step = 360 / numSides,
				three = !(numSides % 3),
				vector = new Point(0, three ? -radius : radius),
				offset = three ? -1 : 0.5,
				segments = new Array(numSides);
			for (var i = 0; i < numSides; i++) {
				segments[i] = new Segment(center.add(
					vector.rotate((i + offset) * step)));
			}
			path._add(segments);
			path._closed = true;
			return path;
		},

		Star: function(center, numPoints, radius1, radius2) {
			center = Point.read(arguments, 0, 1);
			numPoints *= 2;
			var path = new Path(),
				step = 360 / numPoints,
				vector = new Point(0, -1),
				segments = new Array(numPoints);
			for (var i = 0; i < numPoints; i++) {
				segments[i] = new Segment(center.add(
					vector.rotate(step * i).multiply(i % 2 ? radius2 : radius1)));
			}
			path._add(segments);
			path._closed = true;
			return path;
		}
	};
}});

var PathFlattener = Base.extend({
	initialize: function(path) {
		this.curves = []; 
		this.parts = []; 
		this.length = 0; 
		this.index = 0;

		var segments = path._segments,
			segment1 = segments[0],
			segment2,
			that = this;

		function addCurve(segment1, segment2) {
			var curve = Curve.getValues(segment1, segment2);
			that.curves.push(curve);
			that._computeParts(curve, segment1._index, 0, 1);
		}

		for (var i = 1, l = segments.length; i < l; i++) {
			segment2 = segments[i];
			addCurve(segment1, segment2);
			segment1 = segment2;
		}
		if (path._closed)
			addCurve(segment2, segments[0]);
	},

	_computeParts: function(curve, index, minT, maxT) {
		if ((maxT - minT) > 1 / 32
				&& !Curve.isSufficientlyFlat.apply(Curve, curve)) {
			var curves = Curve.subdivide.apply(Curve, curve);
			var halfT = (minT + maxT) / 2;
			this._computeParts(curves[0], index, minT, halfT);
			this._computeParts(curves[1], index, halfT, maxT);
		} else {
			var x = curve[6] - curve[0],
				y = curve[7] - curve[1],
				dist = Math.sqrt(x * x + y * y);
			if (dist > Numerical.TOLERANCE) {
				this.length += dist;
				this.parts.push({
					offset: this.length,
					value: maxT,
					index: index
				});
			}
		}
	},

	getParameter: function(offset) {
		var i, j = this.index;
		for (;;) {
			i = j;
			if (j == 0 || this.parts[--j].offset < offset)
				break;
		}
		for (var l = this.parts.length; i < l; i++) {
			var part = this.parts[i];
			if (part.offset >= offset) {
				this.index = i;
				var prev = this.parts[i - 1];
				var prevVal = prev && prev.index == part.index ? prev.value : 0,
					prevLen = prev ? prev.offset : 0;
				return {
					value: prevVal + (part.value - prevVal)
						* (offset - prevLen) /  (part.offset - prevLen),
					index: part.index
				};
			}
		}
		var part = this.parts[this.parts.length - 1];
		return {
			value: 1,
			index: part.index
		};
	},

	evaluate: function(offset, type) {
		var param = this.getParameter(offset);
		return Curve.evaluate.apply(Curve,
				this.curves[param.index].concat([param.value, type]));
	},

	drawPart: function(ctx, from, to) {
		from = this.getParameter(from);
		to = this.getParameter(to);
		for (var i = from.index; i <= to.index; i++) {
			var curve = Curve.getPart.apply(Curve, this.curves[i].concat(
					i == from.index ? from.value : 0,
					i == to.index ? to.value : 1));
			if (i == from.index)
				ctx.moveTo(curve[0], curve[1]);
			ctx.bezierCurveTo.apply(ctx, curve.slice(2));
		}
	}
});

var PathFitter = Base.extend({
	initialize: function(path, error) {
		this.points = [];
		var segments = path._segments,
			prev;
		for (var i = 0, l = segments.length; i < l; i++) {
			var point = segments[i].point.clone();
			if (!prev || !prev.equals(point)) {
				this.points[i] = point;
				prev = point;
			}
		}
		this.error = error;
	},

	fit: function() {
		this.segments = [new Segment(this.points[0])];
		this.fitCubic(0, this.points.length - 1,
				this.points[1].subtract(this.points[0]).normalize(),
				this.points[this.points.length - 2].subtract(
					this.points[this.points.length - 1]).normalize());
		return this.segments;
	},

	fitCubic: function(first, last, tan1, tan2) {
		if (last - first == 1) {
			var pt1 = this.points[first],
				pt2 = this.points[last],
				dist = pt1.getDistance(pt2) / 3;
			this.addCurve([pt1, pt1.add(tan1.normalize(dist)),
					pt2.add(tan2.normalize(dist)), pt2]);
			return;
		}
		var uPrime = this.chordLengthParameterize(first, last),
			maxError = Math.max(this.error, this.error * this.error),
			error,
			split;
		for (var i = 0; i <= 4; i++) {
			var curve = this.generateBezier(first, last, uPrime, tan1, tan2);
			var max = this.findMaxError(first, last, curve, uPrime);
			if (max.error < this.error) {
				this.addCurve(curve);
				return;
			}
			split = max.index;
			if (max.error >= maxError)
				break;
			this.reparameterize(first, last, uPrime, curve);
			maxError = max.error;
		}
		var V1 = this.points[split - 1].subtract(this.points[split]),
			V2 = this.points[split].subtract(this.points[split + 1]),
			tanCenter = V1.add(V2).divide(2).normalize();
		this.fitCubic(first, split, tan1, tanCenter);
		this.fitCubic(split, last, tanCenter.negate(), tan2);
	},

	addCurve: function(curve) {
		var prev = this.segments[this.segments.length - 1];
		prev.setHandleOut(curve[1].subtract(curve[0]));
		this.segments.push(
				new Segment(curve[3], curve[2].subtract(curve[3])));
	},

	generateBezier: function(first, last, uPrime, tan1, tan2) {
		var epsilon = Numerical.TOLERANCE,
			pt1 = this.points[first],
			pt2 = this.points[last],
		 	C = [[0, 0], [0, 0]],
			X = [0, 0];

		for (var i = 0, l = last - first + 1; i < l; i++) {
			var u = uPrime[i],
				t = 1 - u,
				b = 3 * u * t,
				b0 = t * t * t,
				b1 = b * t,
				b2 = b * u,
				b3 = u * u * u,
				a1 = tan1.normalize(b1),
				a2 = tan2.normalize(b2),
				tmp = this.points[first + i]
					.subtract(pt1.multiply(b0 + b1))
					.subtract(pt2.multiply(b2 + b3));
			C[0][0] += a1.dot(a1);
			C[0][1] += a1.dot(a2);
			C[1][0] = C[0][1];
			C[1][1] += a2.dot(a2);
			X[0] += a1.dot(tmp);
			X[1] += a2.dot(tmp);
		}

		var detC0C1 = C[0][0] * C[1][1] - C[1][0] * C[0][1],
			alpha1, alpha2;
		if (Math.abs(detC0C1) > epsilon) {
			var detC0X  = C[0][0] * X[1]    - C[1][0] * X[0],
				detXC1  = X[0]    * C[1][1] - X[1]    * C[0][1];
			alpha1 = detXC1 / detC0C1;
			alpha2 = detC0X / detC0C1;
		} else {
			var c0 = C[0][0] + C[0][1],
				c1 = C[1][0] + C[1][1];
			if (Math.abs(c0) > epsilon) {
				alpha1 = alpha2 = X[0] / c0;
			} else if (Math.abs(c0) > epsilon) {
				alpha1 = alpha2 = X[1] / c1;
			} else {
				alpha1 = alpha2 = 0.;
			}
		}

		var segLength = pt2.getDistance(pt1);
		epsilon *= segLength;
		if (alpha1 < epsilon || alpha2 < epsilon) {
			alpha1 = alpha2 = segLength / 3;
		}

		return [pt1, pt1.add(tan1.normalize(alpha1)),
				pt2.add(tan2.normalize(alpha2)), pt2];
	},

	reparameterize: function(first, last, u, curve) {
		for (var i = first; i <= last; i++) {
			u[i - first] = this.findRoot(curve, this.points[i], u[i - first]);
		}
	},

	findRoot: function(curve, point, u) {
		var curve1 = [],
			curve2 = [];
		for (var i = 0; i <= 2; i++) {
			curve1[i] = curve[i + 1].subtract(curve[i]).multiply(3);
		}
		for (var i = 0; i <= 1; i++) {
			curve2[i] = curve1[i + 1].subtract(curve1[i]).multiply(2);
		}
		var pt = this.evaluate(3, curve, u),
		 	pt1 = this.evaluate(2, curve1, u),
		 	pt2 = this.evaluate(1, curve2, u),
		 	diff = pt.subtract(point),
			df = pt1.dot(pt1) + diff.dot(pt2);
		if (Math.abs(df) < Numerical.TOLERANCE)
			return u;
		return u - diff.dot(pt1) / df;
	},

	evaluate: function(degree, curve, t) {
		var tmp = curve.slice();
		for (var i = 1; i <= degree; i++) {
			for (var j = 0; j <= degree - i; j++) {
				tmp[j] = tmp[j].multiply(1 - t).add(tmp[j + 1].multiply(t));
			}
		}
		return tmp[0];
	},

	chordLengthParameterize: function(first, last) {
		var u = [0];
		for (var i = first + 1; i <= last; i++) {
			u[i - first] = u[i - first - 1]
					+ this.points[i].getDistance(this.points[i - 1]);
		}
		for (var i = 1, m = last - first; i <= m; i++) {
			u[i] /= u[m];
		}
		return u;
	},

	findMaxError: function(first, last, curve, u) {
		var index = Math.floor((last - first + 1) / 2),
			maxDist = 0;
		for (var i = first + 1; i < last; i++) {
			var P = this.evaluate(3, curve, u[i - first]);
			var v = P.subtract(this.points[i]);
			var dist = v.x * v.x + v.y * v.y; 
			if (dist >= maxDist) {
				maxDist = dist;
				index = i;
			}
		}
		return {
			error: maxDist,
			index: index
		};
	}
});

var ParagraphStyle = this.ParagraphStyle = Base.extend({

	initialize: function(style) {
		Base.initialize(this, style, {
			justification: 'left'
		});
	},

	statics: {
		create: function(item) {
			var style = new ParagraphStyle(ParagraphStyle.dont);
			style._item = item;
			return style;
		}
	}
});

var CharacterStyle = this.CharacterStyle = PathStyle.extend({

	initialize: function(style) {
		Base.initialize(this, style, {
			fontSize: 10,
			font: 'sans-serif'
		});
		this.base(style);
	},

	statics: {
		create: function(item) {
			var style = new CharacterStyle(CharacterStyle.dont);
			style._item = item;
			return style;
		}
	}
});

var TextItem = this.TextItem = Item.extend({

	beans: true,

	initialize: function() {
		this.base();
		this.content = null;
		this._characterStyle = CharacterStyle.create(this);
		this.setCharacterStyle(this._project.getCurrentStyle());
		this._paragraphStyle = ParagraphStyle.create(this);
		this.setParagraphStyle();
	},

	_clone: function(copy) {
		copy.setCharacterStyle(this._characterStyle);
		copy.setParagraphStyle(this._paragraphStyle);
		return this.base(copy);
	},

	getCharacterStyle: function() {
		return this._characterStyle;
	},

	setCharacterStyle: function(style) {
		this._characterStyle.initialize(style);
	},

	getParagraphStyle: function() {
		return this._paragraphStyle;
	},

	setParagraphStyle: function(style) {
		this._paragraphStyle.initialize(style);
	}
});

var PointText = this.PointText = TextItem.extend({

	beans: true,

	initialize: function(point) {
		this.base();
		var point = Point.read(arguments);
		this.content = '';
		this._point = LinkedPoint.create(this, 'setPoint', point.x, point.y);
		this._matrix = new Matrix().translate(point);
	},

	clone: function() {
		var copy = this._clone(new PointText(this._point));
		copy.content = this.content;
		copy._matrix.initialize(this._matrix);
		return copy;
	},

	getPoint: function() {
		return this._point;
	},

	setPoint: function(point) {
		this._transform(new Matrix().translate(
				Point.read(arguments).subtract(this._point)));
	},
	getPosition: function() {
		return this._point;
	},
	setPosition: function(point) {
		this.setPoint.apply(this, arguments);
	},
	_transform: function(matrix, flags) {
		this._matrix.preConcatenate(matrix);
		matrix._transformPoint(this._point, this._point, true);
	},
	draw: function(ctx) {
		if (this.content == null)
			return;
		ctx.save();
		ctx.font = this._characterStyle.fontSize + 'pt ' +
				this._characterStyle.font;
		ctx.textAlign = this._paragraphStyle.justification;
		this._matrix.applyToContext(ctx);
		var fillColor = this.getFillColor();
		var strokeColor = this.getStrokeColor();
		if (!fillColor || !strokeColor)
			ctx.globalAlpha = this.opacity;
		if (fillColor) {
			ctx.fillStyle = fillColor.getCanvasStyle(ctx);
			ctx.fillText(this.content, 0, 0);
		}
		if (strokeColor) {
			ctx.strokeStyle = strokeColor.getCanvasStyle(ctx);
			ctx.strokeText(this.content, 0, 0);
		}
		ctx.restore();
	}
});

var Color = this.Color = Base.extend(new function() {
	var components = {
		gray: ['gray'],
		rgb: ['red', 'green', 'blue'],
		hsb: ['hue', 'saturation', 'brightness']
	};

	var colorCache = {},
		colorContext;

	function nameToRGBColor(name) {
		var color = colorCache[name];
		if (color)
			return color.clone();
		if (!colorContext) {
			var canvas = CanvasProvider.getCanvas(Size.create(1, 1));
			colorContext = canvas.getContext('2d');
			colorContext.globalCompositeOperation = 'copy';
		}
		colorContext.fillStyle = 'rgba(0,0,0,0)';
		colorContext.fillStyle = name;
		colorContext.fillRect(0, 0, 1, 1);
		var data = colorContext.getImageData(0, 0, 1, 1).data,
			rgb = [data[0] / 255, data[1] / 255, data[2] / 255];
		return (colorCache[name] = RGBColor.read(rgb)).clone();
	}

	function hexToRGBColor(string) {
		var hex = string.match(/^#?(\w{1,2})(\w{1,2})(\w{1,2})$/);
		if (hex.length >= 4) {
			var rgb = new Array(3);
			for (var i = 0; i < 3; i++) {
				var channel = hex[i + 1];
				rgb[i] = parseInt(channel.length == 1
						? channel + channel : channel, 16) / 255;
			}
			return RGBColor.read(rgb);
		}
	}

	var hsbIndices = [
		[0, 3, 1], 
		[2, 0, 1], 
		[1, 0, 3], 
		[1, 2, 0], 
		[3, 1, 0], 
		[0, 1, 2]  
	];

	var converters = {
		'rgb-hsb': function(color) {
			var r = color._red,
				g = color._green,
				b = color._blue,
				max = Math.max(r, g, b),
				min = Math.min(r, g, b),
				delta = max - min,
				h,
				s = max == 0 ? 0 : delta / max,
				v = max; 
			if (delta == 0) {
				h = 0; 
			} else {
				switch (max) {
				case r: h = (g - b) / delta + (g < b ? 6 : 0); break;
				case g: h = (b - r) / delta + 2; break;
				case b: h = (r - g) / delta + 4; break;
				}
				h /= 6;
			}
			return new HSBColor(h * 360, s, v, color._alpha);
		},

		'hsb-rgb': function(color) {
			var h = (color._hue / 60) % 6, 
				s = color._saturation,
				b = color._brightness,
				i = Math.floor(h), 
				f = h - i,
				i = hsbIndices[i],
				v = [
					b, 						
					b * (1 - s),			
					b * (1 - s * f),		
					b * (1 - s * (1 - f))	
				];
			return new RGBColor(v[i[0]], v[i[1]], v[i[2]], color._alpha);
		},

		'rgb-gray': function(color) {
			return new GrayColor(1 - (color._red * 0.2989 + color._green * 0.587
					+ color._blue * 0.114), color._alpha);
		},

		'gray-rgb': function(color) {
			var comp = 1 - color._gray;
			return new RGBColor(comp, comp, comp, color._alpha);
		},

		'hsb-gray': function(color) {
			return converters['rgb-gray'](converters['hsb-rgb'](color));
		},

		'gray-hsb': function(color) {
			return new HSBColor(0, 0, 1 - color._gray, color._alpha);
		}
	};

	var fields = {

		beans: true,
		_readNull: true,

		initialize: function(arg) {
			var isArray = Array.isArray(arg),
				type = this._colorType;
			if (typeof arg === 'object' && !isArray) {
				if (!type) {
					return arg.red !== undefined
						? new RGBColor(arg.red, arg.green, arg.blue, arg.alpha)
						: arg.gray !== undefined
						? new GrayColor(arg.gray, arg.alpha)
						: arg.hue !== undefined
						? new HSBColor(arg.hue, arg.saturation, arg.brightness,
								arg.alpha)
						: new RGBColor(); 
				} else {
					return Color.read(arguments).convert(type);
				}
			} else if (typeof arg === 'string') {
				var rgbColor = arg.match(/^#[0-9a-f]{3,6}$/i)
						? hexToRGBColor(arg)
						: nameToRGBColor(arg);
				return type
						? rgbColor.convert(type)
						: rgbColor;
			} else {
				var components = isArray ? arg
						: Array.prototype.slice.call(arguments);
				if (!type) {
					if (components.length >= 3)
						return new RGBColor(components);
					return new GrayColor(components);
				} else {
					Base.each(this._components,
						function(name, i) {
							var value = components[i];
							this['_' + name] = value !== undefined
									? value : null;
						},
					this);
				}
			}
		},

		clone: function() {
			var ctor = this.constructor,
				copy = new ctor(ctor.dont),
				components = this._components;
			for (var i = 0, l = components.length; i < l; i++) {
				var key = '_' + components[i];
				copy[key] = this[key];
			}
			return copy;
		},

		convert: function(type) {
			return this._colorType == type
				? this.clone()
				: converters[this._colorType + '-' + type](this);
		},

		statics: {
			extend: function(src) {
				src.beans = true;
				if (src._colorType) {
					var comps = components[src._colorType];
					src._components = comps.concat(['alpha']);
					Base.each(comps, function(name) {
						var isHue = name === 'hue',
							part = Base.capitalize(name),
							name = '_' + name;
						this['get' + part] = function() {
							return this[name];
						};
						this['set' + part] = function(value) {
							this[name] = isHue
								? ((value % 360) + 360) % 360
								: Math.min(Math.max(value, 0), 1);
							this._cssString = null;
							return this;
						};
					}, src);
				}
				return this.base(src);
			}
		}
	};

	Base.each(components, function(comps, type) {
		Base.each(comps, function(component) {
			var part = Base.capitalize(component);
			fields['get' + part] = function() {
				return this.convert(type)[component];
			};
			fields['set' + part] = function(value) {
				var color = this.convert(type);
				color[component] = value;
				color = color.convert(this._colorType);
				for (var i = 0, l = this._components.length; i < l; i++) {
					var key = this._components[i];
					this[key] = color[key];
				}
			};
		});
	});

	return fields;
}, {

	beans: true,

	getType: function() {
		return this._colorType;
	},

	getComponents: function() {
		var length = this._components.length;
		var comps = new Array(length);
		for (var i = 0; i < length; i++)
			comps[i] = this['_' + this._components[i]];
		return comps;
	},

	getAlpha: function() {
		return this._alpha != null ? this._alpha : 1;
	},

	setAlpha: function(alpha) {
		this._alpha = alpha == null ? null : Math.min(Math.max(alpha, 0), 1);
		this._cssString = null;
		return this;
	},

	hasAlpha: function() {
		return this._alpha != null;
	},

	equals: function(color) {
		if (color && color._colorType === this._colorType) {
			for (var i = 0, l = this._components.length; i < l; i++) {
				var component = '_' + this._components[i];
				if (this[component] !== color[component])
					return false;
			}
			return true;
		}
		return false;
	},

	toString: function() {
		var parts = [],
			format = Base.formatNumber;
		for (var i = 0, l = this._components.length; i < l; i++) {
			var component = this._components[i],
				value = this['_' + component];
			if (component === 'alpha' && value == null)
				value = 1;
			parts.push(component + ': ' + format(value));
		}
		return '{ ' + parts.join(', ') + ' }';
	},

	toCssString: function() {
		if (!this._cssString) {
			var color = this.convert('rgb'),
				alpha = color.getAlpha(),
				components = [
					Math.round(color._red * 255),
					Math.round(color._green * 255),
					Math.round(color._blue * 255),
					alpha != null ? alpha : 1
				];
			this._cssString = 'rgba(' + components.join(', ') + ')';
		}
		return this._cssString;
	},

	getCanvasStyle: function() {
		return this.toCssString();
	}

});

var GrayColor = this.GrayColor = Color.extend({

	_colorType: 'gray'
});

var RGBColor = this.RGBColor = Color.extend({

	_colorType: 'rgb'
});

var HSBColor = this.HSBColor = Color.extend({

	_colorType: 'hsb'
});

var GradientColor = this.GradientColor = Color.extend({

	beans: true,

	initialize: function(gradient, origin, destination, hilite) {
		this.gradient = gradient || new Gradient();
		this.setOrigin(origin);
		this.setDestination(destination);
		if (hilite)
			this.setHilite(hilite);
	},

	clone: function() {
		return new GradientColor(this.gradient, this._origin, this._destination,
				this._hilite);
	},

	getOrigin: function() {
		return this._origin;
	},

	setOrigin: function(origin) {
		origin = Point.read(arguments).clone();
		this._origin = origin;
		if (this._destination)
			this._radius = this._destination.getDistance(this._origin);
		return this;
	},

	getDestination: function() {
		return this._destination;
	},

	setDestination: function(destination) {
		destination = Point.read(arguments).clone();
		this._destination = destination;
		this._radius = this._destination.getDistance(this._origin);
		return this;
	},

	getHilite: function() {
		return this._hilite;
	},

	setHilite: function(hilite) {
		hilite = Point.read(arguments).clone();
		var vector = hilite.subtract(this._origin);
		if (vector.getLength() > this._radius) {
			this._hilite = this._origin.add(
					vector.normalize(this._radius - 0.1));
		} else {
			this._hilite = hilite;
		}
		return this;
	},

	getCanvasStyle: function(ctx) {
		var gradient;
		if (this.gradient.type === 'linear') {
			gradient = ctx.createLinearGradient(this._origin.x, this._origin.y,
					this._destination.x, this._destination.y);
		} else {
			var origin = this._hilite || this._origin;
			gradient = ctx.createRadialGradient(origin.x, origin.y,
					0, this._origin.x, this._origin.y, this._radius);
		}
		for (var i = 0, l = this.gradient._stops.length; i < l; i++) {
			var stop = this.gradient._stops[i];
			gradient.addColorStop(stop._rampPoint, stop._color.toCssString());
		}
		return gradient;
	},

	equals: function(color) {
		return color == this || color && color._colorType === this._colorType
				&& this.gradient.equals(color.gradient)
				&& this._origin.equals(color._origin)
				&& this._destination.equals(color._destination);
	},

	transform: function(matrix) {
		matrix._transformPoint(this._origin, this._origin, true);
		matrix._transformPoint(this._destination, this._destination, true);
		if (this._hilite)
			matrix._transformPoint(this._hilite, this._hilite, true);
		this._radius = this._destination.getDistance(this._origin);
	}
});

var Gradient = this.Gradient = Base.extend({

	beans: true,

	initialize: function(stops, type) {
		this.setStops(stops || ['white', 'black']);
		this.type = type || 'linear';
	},

	clone: function() {
		var stops = [];
		for (var i = 0, l = this._stops.length; i < l; i++)
			stops[i] = this._stops[i].clone();
		return new Gradient(stops, this.type);
	},

	getStops: function() {
		return this._stops;
	},

	setStops: function(stops) {
		if (stops.length < 2)
			throw new Error(
					'Gradient stop list needs to contain at least two stops.');
		this._stops = GradientStop.readAll(stops);
		for (var i = 0, l = this._stops.length; i < l; i++) {
			var stop = this._stops[i];
			if (stop._defaultRamp)
				stop.setRampPoint(i / (l - 1));
		}
	},

	equals: function(gradient) {
		if (gradient.type != this.type)
			return false;
		if (this._stops.length == gradient._stops.length) {
			for (var i = 0, l = this._stops.length; i < l; i++) {
				if (!this._stops[i].equals(gradient._stops[i]))
					return false;
			}
			return true;
		}
		return false;
	}
});

var GradientStop = this.GradientStop = Base.extend({

	beans: true,

	initialize: function(arg0, arg1) {
		if (arg1 === undefined && Array.isArray(arg0)) {
			this.setColor(arg0[0]);
			this.setRampPoint(arg0[1]);
		} else if (arg0.color) {
			this.setColor(arg0.color);
			this.setRampPoint(arg0.rampPoint);
		} else {
			this.setColor(arg0);
			this.setRampPoint(arg1);
		}
	},

	clone: function() {
		return new GradientStop(this._color.clone(), this._rampPoint);
	},

	getRampPoint: function() {
		return this._rampPoint;
	},

	setRampPoint: function(rampPoint) {
		this._defaultRamp = rampPoint == null;
		this._rampPoint = rampPoint || 0;
	},

	getColor: function() {
		return this._color;
	},

	setColor: function(color) {
		this._color = Color.read(arguments);
	},

	equals: function(stop) {
		return stop == this || stop instanceof GradientStop
				&& this._color.equals(stop._color)
				&& this._rampPoint == stop._rampPoint;
	}
});

var DomElement = new function() {
	function cumulate(el, name, parent, positioned) {
		var left = name + 'Left',
			top = name + 'Top',
			x = 0,
			y = 0;
			while (el && (!positioned
					|| !/^(relative|absolute)$/.test(el.style.position))) {
			x += el[left] || 0;
			y += el[top] || 0;
			el = el[parent];
		}
		return Point.create(x, y);
	}

	return {
		getOffset: function(el, positioned, scroll) {
			var point = cumulate(el, 'offset', 'offsetParent', positioned);
			return scroll
				? point.subtract(cumulate(el, 'scroll', 'parentNode'))
				: point;
		},

		getSize: function(el) {
			return Size.create(el.offsetWidth, el.offsetHeight);
		},

		getBounds: function(el, positioned, scroll) {
			return new Rectangle(DomElement.getOffset(el, positioned, scroll),
					DomElement.getSize(el));
		},

		getWindowSize: function() {
			var doc = document.getElementsByTagName(
					document.compatMode === 'CSS1Compat' ? 'html' : 'body')[0];
			return Size.create(
				window.innerWidth || doc.clientWidth,
				window.innerHeight || doc.clientHeight
			);
		},

		isVisible: function(el) {
			return new Rectangle([0, 0], DomElement.getWindowSize())
					.intersects(DomElement.getBounds(el, false, true));
		}
	};
};

var DomEvent = {
	add: function(el, events) {
		for (var type in events) {
			var func = events[type];
			if (el.addEventListener) {
				el.addEventListener(type, func, false);
			} else if (el.attachEvent) {
				el.attachEvent('on' + type, func.bound = function() {
					func.call(el, window.event);
				});
			}
		}
	},

	remove: function(el, events) {
		for (var type in events) {
			var func = events[type];
			if (el.removeEventListener) {
				el.removeEventListener(type, func, false);
			} else if (el.detachEvent) {
				el.detachEvent('on' + type, func.bound);
			}
		}
	},

	getPoint: function(event) {
		var pos = event.targetTouches
				? event.targetTouches.length
					? event.targetTouches[0]
					: event.changedTouches[0]
				: event;
		return Point.create(
			pos.pageX || pos.clientX + document.documentElement.scrollLeft,
			pos.pageY || pos.clientY + document.documentElement.scrollTop
		);
	},

	getElement: function(event) {
		return event.target || event.srcElement;
	},

	getOffset: function(event) {
		return DomEvent.getPoint(event).subtract(
				DomElement.getOffset(DomEvent.getElement(event), true));
	},

	preventDefault: function(event) {
		if (event.preventDefault) {
			event.preventDefault();
		} else {
			event.returnValue = false;
		}
	},

	stopPropagation: function(event) {
		if (event.stopPropagation) {
			event.stopPropagation();
		} else {
			event.cancelBubble = true;
		}
	}
};

DomEvent.requestAnimationFrame = new function() {
	var part = 'equestAnimationFrame',
		request = window['r' + part] || window['webkitR' + part]
			|| window['mozR' + part] || window['oR' + part]
			|| window['msR' + part];
	if (request) {
		request(function(time) {
			if (time == undefined)
				request = null;
		});
	}

	var callbacks = [],
		focused = true,
		timer;

	DomEvent.add(window, {
		focus: function() {
			focused = true;
		},
		blur: function() {
			focused = false;
		}
	});

	return function(callback, element) {
		if (request)
			return request(callback, element);
		callbacks.push([callback, element]);
		if (!timer) {
			timer = window.setInterval(function() {
				for (var i = callbacks.length - 1; i >= 0; i--) {
					var entry = callbacks[i],
						func = entry[0],
						element = entry[1];
					if (!element || element.getAttribute('keepalive') == 'true'
							|| focused && DomElement.isVisible(element)) {
						callbacks.splice(i, 1);
						func(Date.now());
					}
				}
			}, 1000 / 60);
		}
	};
};

var View = this.View = Base.extend({

	beans: true,

	initialize: function(canvas) {
		this._scope = paper;
		this._index = this._scope.views.push(this) - 1;
		var size;
		if (canvas && canvas instanceof HTMLCanvasElement) {
			this._canvas = canvas;
			var offset = DomElement.getOffset(canvas);
			if (canvas.attributes.resize) {
				size = DomElement.getWindowSize().subtract(offset);
				canvas.width = size.width;
				canvas.height = size.height;
				var that = this;
				DomEvent.add(window, {
					resize: function(event) {
						if (!DomElement.getSize(canvas).equals([0, 0]))
							offset = DomElement.getOffset(canvas);
						that.setViewSize(
								DomElement.getWindowSize().subtract(offset));
						if (that._onFrameCallback) {
							that._onFrameCallback(0, true);
						} else {
							that.draw();
						}
					}
				});
			} else {
				size = Size.create(canvas.offsetWidth, canvas.offsetHeight);
			}
			if (canvas.attributes.stats) {
				this._stats = new Stats();
				var element = this._stats.domElement,
					style = element.style;
				style.position = 'absolute';
				style.left = offset.x + 'px';
				style.top = offset.y + 'px';
				document.body.appendChild(element);
			}
		} else {
			size = Size.read(arguments, 1);
			if (size.isZero())
				size = new Size(1024, 768);
			this._canvas = CanvasProvider.getCanvas(size);
		}
		this._viewBounds = LinkedRectangle.create(this, 'setViewBounds',
				0, 0, size.width, size.height);
		this._context = this._canvas.getContext('2d');
		this._matrix = new Matrix();
		this._zoom = 1;
		this._events = this._createEvents();
		DomEvent.add(this._canvas, this._events);
		if (!View.focused)
			View.focused = this;
	},

	getCanvas: function() {
		return this._canvas;
	},

	getViewBounds: function() {
		return this._viewBounds;
	},

	setViewBounds: function(bounds) {
		bounds = Rectangle.read(arguments);
		var size = bounds.getSize(),
			delta = size.subtract(this._viewBounds.getSize());
		this._canvas.width = size.width;
		this._canvas.height = size.height;
		if (this.onResize) {
			this.onResize({
				size: size,
				delta: delta
			});
		}
		this._bounds = null;
	},

	getViewSize: function() {
		return this._viewBounds.getSize();
	},

	setViewSize: function(size) {
		this._viewBounds.setSize.apply(this._viewBounds, arguments);
	},

	getBounds: function() {
		if (!this._bounds)
			this._bounds = this._matrix._transformBounds(this._viewBounds);
		return this._bounds;
	},

	getSize: function() {
		return this.getBounds().getSize();
	},

	getCenter: function() {
		return this.getBounds().getCenter();
	},

	setCenter: function(center) {
		this.scrollBy(Point.read(arguments).subtract(this.getCenter()));
	},

	getZoom: function() {
		return this._zoom;
	},

	setZoom: function(zoom) {
		this._transform(new Matrix().scale(zoom / this._zoom, this.getCenter()));
		this._zoom = zoom;
	},

	scrollBy: function(point) {
		this._transform(new Matrix().translate(Point.read(arguments).negate()));
	},

	_transform: function(matrix, flags) {
		this._matrix.preConcatenate(matrix);
		this._bounds = null;
		this._inverse = null;
	},

	draw: function() {
		if (this._stats)
			this._stats.update();
		var ctx =this._context,
			bounds = this._viewBounds;
		ctx.clearRect(bounds._x, bounds._y,
				bounds._width + 1, bounds._height + 1);

		ctx.save();
		this._matrix.applyToContext(ctx);
		this._scope.project.draw(ctx);
		ctx.restore();
	},

	activate: function() {
		this._scope.view = this;
	},

	remove: function() {
		var res = Base.splice(this._scope.views, null, this._index, 1);
		DomEvent.remove(this._canvas, this._events);
		this._scope = this._canvas = this._events = this._onFrame = null;
		return !!res.length;
	},

	artworkToView: function(point) {
		return this._matrix._transformPoint(Point.read(arguments));
	},

	viewToArtwork: function(point) {
		return this._getInverse()._transformPoint(Point.read(arguments));
	},

	_getInverse: function() {
		if (!this._inverse)
			this._inverse = this._matrix.createInverse();
		return this._inverse;
	},

	getOnFrame: function() {
		return this._onFrame;
	},

	setOnFrame: function(onFrame) {
		this._onFrame = onFrame;
		if (!onFrame) {
			delete this._onFrameCallback;
			return;
		}
		var that = this,
			requested = false,
			before,
			time = 0,
			count = 0;
		this._onFrameCallback = function(param, dontRequest) {
			requested = false;
			if (!that._onFrame)
				return;
			paper = that._scope;
			requested = true;
			if (!dontRequest) {
				DomEvent.requestAnimationFrame(that._onFrameCallback,
						that._canvas);
			}
			var now = Date.now() / 1000,
			 	delta = before ? now - before : 0;
			that._onFrame({
				delta: delta, 
				time: time += delta, 
				count: count++
			});
			before = now;
			that.draw();
		};
		if (!requested)
			this._onFrameCallback();
	},

	onResize: null,

	_createEvents: function() {
		var that = this,
			tool,
			timer,
			curPoint,
			dragging = false;

		function viewToArtwork(event) {
			return that.viewToArtwork(DomEvent.getOffset(event));
		}

		function mousedown(event) {
			View.focused = that;
			if (!(tool = that._scope.tool))
				return;
			curPoint = viewToArtwork(event);
			tool.onHandleEvent('mousedown', curPoint, event);
			if (tool.onMouseDown)
				that.draw();
			if (tool.eventInterval != null)
				timer = setInterval(mousemove, tool.eventInterval);
			dragging = true;
		}

		function mousemove(event) {
			if (!(tool = that._scope.tool))
				return;
			if (event && event.targetTouches)
				DomEvent.preventDefault(event);
			var point = event && viewToArtwork(event);
			var onlyMove = !!(!tool.onMouseDrag && tool.onMouseMove);
			if (dragging && !onlyMove) {
				curPoint = point || curPoint;
				if (curPoint)
					tool.onHandleEvent('mousedrag', curPoint, event);
				if (tool.onMouseDrag)
					that.draw();
			} else if (!dragging || onlyMove) {
				tool.onHandleEvent('mousemove', point, event);
				if (tool.onMouseMove)
					that.draw();
			}
		}

		function mouseup(event) {
			if (!dragging)
				return;
			dragging = false;
			curPoint = null;
			if (tool) {
				if (tool.eventInterval != null)
					timer = clearInterval(timer);
				tool.onHandleEvent('mouseup', viewToArtwork(event), event);
				if (tool.onMouseUp)
					that.draw();
			}
		}

		return {
			mousedown: mousedown,
			mousemove: mousemove,
			mouseup: mouseup,
			touchstart: mousedown,
			touchmove: mousemove,
			touchend: mouseup
		};
	}
});

var Event = this.Event = Base.extend({
	beans: true,

	initialize: function(event) {
		this.event = event;
	},

	preventDefault: function() {
		DomEvent.preventDefault(this.event);
	},

	stopPropagation: function() {
		DomEvent.stopPropagation(this.event);
	},

	stop: function() {
		this.stopPropagation();
		this.preventDefault();
	},

	getModifiers: function() {
		return Key.modifiers;
	}
});

var KeyEvent = this.KeyEvent = Event.extend(new function() {
	return {

		beans: true,

		initialize: function(down, key, character, event) {
			this.base(event);
			this.type = down ? 'keydown' : 'keyup';
			this.key = key;
			this.character = character;
		},

		toString: function() {
			return '{ type: ' + this.type 
					+ ', key: ' + this.key
					+ ', character: ' + this.character
					+ ', modifiers: ' + this.getModifiers()
					+ ' }';
		}
	};
});

var Key = this.Key = new function() {

	var keys = {
		 8: 'backspace',
		13: 'enter',
		16: 'shift',
		17: 'control',
		18: 'option',
		19: 'pause',
		20: 'caps-lock',
		27: 'escape',
		32: 'space',
		35: 'end',
		36: 'home',
		37: 'left',
		38: 'up',
		39: 'right',
		40: 'down',
		46: 'delete',
		91: 'command'
	},

	modifiers = {
		shift: false,
		control: false,
		option: false,
		command: false,
		capsLock: false,

		toString: function() {
			return Base.formatObject(this);
		}
	},

	charCodeMap = {}, 
	keyMap = {}, 
	downCode; 

	function handleKey(down, keyCode, charCode, event) {
		var character = String.fromCharCode(charCode),
			key = keys[keyCode] || character.toLowerCase(),
			handler = down ? 'onKeyDown' : 'onKeyUp',
			scope = View.focused && View.focused._scope,
			tool = scope && scope.tool;
		keyMap[key] = down;
		if (tool && tool[handler]) {
			var keyEvent = new KeyEvent(down, key, character, event);
			if (tool[handler](keyEvent) === false)
				keyEvent.preventDefault();
		}
	}

	DomEvent.add(document, {
		keydown: function(event) {
			var code = event.which || event.keyCode;
			var key = keys[code], name;
			if (key) {
				if (modifiers[name = Base.camelize(key)] !== undefined) {
					modifiers[name] = true;
				} else {
					charCodeMap[code] = 0;
					handleKey(true, code, null, event);
				}
			} else {
				downCode = code;
			}
		},

		keypress: function(event) {
			if (downCode != null) {
				var code = event.which || event.keyCode;
				charCodeMap[downCode] = code;
				handleKey(true, downCode, code, event);
				downCode = null;
			}
		},

		keyup: function(event) {
			var code = event.which || event.keyCode,
				key = keys[code], name;
			if (key && modifiers[name = Base.camelize(key)] !== undefined) {
				modifiers[name] = false;
			} else if (charCodeMap[code] != null) {
				handleKey(false, code, charCodeMap[code], event);
				delete charCodeMap[code];
			}
		}
	});

	return {

		modifiers: modifiers,

		isDown: function(key) {
			return !!keyMap[key];
		}
	};
};

var ToolEvent = this.ToolEvent = Base.extend({

	beans: true,

	initialize: function(tool, type, event) {
		this.tool = tool;
		this.type = type;
		this.event = event;
	},

	_choosePoint: function(point, toolPoint) {
		return point ? point : toolPoint ? toolPoint.clone() : null;
	},

	getPoint: function() {
		return this._choosePoint(this._point, this.tool._point);
	},

	setPoint: function(point) {
		this._point = point;
	},

	getLastPoint: function() {
		return this._choosePoint(this._lastPoint, this.tool._lastPoint);
	},

	setLastPoint: function(lastPoint) {
		this._lastPoint = lastPoint;
	},

	getDownPoint: function() {
		return this._choosePoint(this._downPoint, this.tool._downPoint);
	},

	setDownPoint: function(downPoint) {
		this._downPoint = downPoint;
	},

	getMiddlePoint: function() {
		if (!this._middlePoint && this.tool._lastPoint) {
			return this.tool._point.add(this.tool._lastPoint).divide(2);
		}
		return this.middlePoint;
	},

	setMiddlePoint: function(middlePoint) {
		this._middlePoint = middlePoint;
	},

	getDelta: function() {
		return !this._delta && this.tool._lastPoint
		 		? this.tool._point.subtract(this.tool._lastPoint)
				: this._delta;
	},

	setDelta: function(delta) {
		this._delta = delta;
	},

	getCount: function() {
		return /^mouse(down|up)$/.test(this.type)
				? this.tool._downCount
				: this.tool._count;
	},

	setCount: function(count) {
		this.tool[/^mouse(down|up)$/.test(this.type) ? 'downCount' : 'count']
			= count;
	},

	getModifiers: function() {
		return Key.modifiers;
	},

	toString: function() {
		return '{ type: ' + this.type 
				+ ', point: ' + this.getPoint()
				+ ', count: ' + this.getCount()
				+ ', modifiers: ' + this.getModifiers()
				+ ' }';
	}
});

var Tool = this.Tool = Base.extend({

	beans: true,

	initialize: function(handlers, scope) {
		this._scope = scope;
		this._firstMove = true;
		this._count = 0;
		this._downCount = 0;
		for (var i in handlers)
			this[i] = handlers[i];
	},

	eventInterval: null,

	getMinDistance: function() {
		return this._minDistance;
	},

	setMinDistance: function(minDistance) {
		this._minDistance = minDistance;
		if (this._minDistance != null && this._maxDistance != null
				&& this._minDistance > this._maxDistance) {
			this._maxDistance = this._minDistance;
		}
	},

	getMaxDistance: function() {
		return this._maxDistance;
	},

	setMaxDistance: function(maxDistance) {
		this._maxDistance = maxDistance;
		if (this._minDistance != null && this._maxDistance != null
				&& this._maxDistance < this._minDistance) {
			this._minDistance = maxDistance;
		}
	},

	getFixedDistance: function() {
		return this._minDistance == this._maxDistance
			? this._minDistance : null;
	},

	setFixedDistance: function(distance) {
		this._minDistance = distance;
		this._maxDistance = distance;
	},

	updateEvent: function(type, pt, minDistance, maxDistance, start,
			needsChange, matchMaxDistance) {
		if (!start) {
			if (minDistance != null || maxDistance != null) {
				var minDist = minDistance != null ? minDistance : 0;
				var vector = pt.subtract(this._point);
				var distance = vector.getLength();
				if (distance < minDist)
					return false;
				var maxDist = maxDistance != null ? maxDistance : 0;
				if (maxDist != 0) {
					if (distance > maxDist) {
						pt = this._point.add(vector.normalize(maxDist));
					} else if (matchMaxDistance) {
						return false;
					}
				}
			}
			if (needsChange && pt.equals(this._point))
				return false;
		}
		this._lastPoint = start && type == 'mousemove' ? pt : this._point;
		this._point = pt;
		switch (type) {
		case 'mousedown':
			this._lastPoint = this._downPoint;
			this._downPoint = this._point;
			this._downCount++;
			break;
		case 'mouseup':
			this._lastPoint = this._downPoint;
			break;
		}
		this._count = start ? 0 : this._count + 1;
		return true;
	},

	onHandleEvent: function(type, pt, event) {
		paper = this._scope;
		switch (type) {
		case 'mousedown':
			this.updateEvent(type, pt, null, null, true, false, false);
			if (this.onMouseDown)
				this.onMouseDown(new ToolEvent(this, type, event));
			break;
		case 'mousedrag':
			var needsChange = false,
				matchMaxDistance = false;
			while (this.updateEvent(type, pt, this.minDistance,
					this.maxDistance, false, needsChange, matchMaxDistance)) {
				if (this.onMouseDrag)
					this.onMouseDrag(new ToolEvent(this, type, event));
				needsChange = true;
				matchMaxDistance = true;
			}
			break;
		case 'mouseup':
			if ((this._point.x != pt.x || this._point.y != pt.y)
					&& this.updateEvent('mousedrag', pt, this.minDistance,
							this.maxDistance, false, false, false)) {
				if (this.onMouseDrag)
					this.onMouseDrag(new ToolEvent(this, type, event));
			}
			this.updateEvent(type, pt, null, this.maxDistance, false,
					false, false);
			if (this.onMouseUp)
				this.onMouseUp(new ToolEvent(this, type, event));
			this.updateEvent(type, pt, null, null, true, false, false);
			this._firstMove = true;
			break;
		case 'mousemove':
			while (this.updateEvent(type, pt, this.minDistance,
					this.maxDistance, this._firstMove, true, false)) {
				if (this.onMouseMove)
					this.onMouseMove(new ToolEvent(this, type, event));
				this._firstMove = false;
			}
			break;
		}
	}
});

var CanvasProvider = {
	canvases: [],
	getCanvas: function(size) {
		if (this.canvases.length) {
			var canvas = this.canvases.pop();
			if ((canvas.width != size.width)
					|| (canvas.height != size.height)) {
				canvas.width = size.width;
				canvas.height = size.height;
			} else {
				canvas.getContext('2d').clearRect(0, 0,
						size.width + 1, size.height + 1);
			}
			return canvas;
		} else {
			var canvas = document.createElement('canvas');
			canvas.width = size.width;
			canvas.height = size.height;
			return canvas;
		}
	},

	returnCanvas: function(canvas) {
		this.canvases.push(canvas);
	}
};

var Numerical = new function() {

	var abscissas = [
		[  0.5773502691896257645091488],
		[0,0.7745966692414833770358531],
		[  0.3399810435848562648026658,0.8611363115940525752239465],
		[0,0.5384693101056830910363144,0.9061798459386639927976269],
		[  0.2386191860831969086305017,0.6612093864662645136613996,0.9324695142031520278123016],
		[0,0.4058451513773971669066064,0.7415311855993944398638648,0.9491079123427585245261897],
		[  0.1834346424956498049394761,0.5255324099163289858177390,0.7966664774136267395915539,0.9602898564975362316835609],
		[0,0.3242534234038089290385380,0.6133714327005903973087020,0.8360311073266357942994298,0.9681602395076260898355762],
		[  0.1488743389816312108848260,0.4333953941292471907992659,0.6794095682990244062343274,0.8650633666889845107320967,0.9739065285171717200779640],
		[0,0.2695431559523449723315320,0.5190961292068118159257257,0.7301520055740493240934163,0.8870625997680952990751578,0.9782286581460569928039380],
		[  0.1252334085114689154724414,0.3678314989981801937526915,0.5873179542866174472967024,0.7699026741943046870368938,0.9041172563704748566784659,0.9815606342467192506905491],
		[0,0.2304583159551347940655281,0.4484927510364468528779129,0.6423493394403402206439846,0.8015780907333099127942065,0.9175983992229779652065478,0.9841830547185881494728294],
		[  0.1080549487073436620662447,0.3191123689278897604356718,0.5152486363581540919652907,0.6872929048116854701480198,0.8272013150697649931897947,0.9284348836635735173363911,0.9862838086968123388415973],
		[0,0.2011940939974345223006283,0.3941513470775633698972074,0.5709721726085388475372267,0.7244177313601700474161861,0.8482065834104272162006483,0.9372733924007059043077589,0.9879925180204854284895657],
		[  0.0950125098376374401853193,0.2816035507792589132304605,0.4580167776572273863424194,0.6178762444026437484466718,0.7554044083550030338951012,0.8656312023878317438804679,0.9445750230732325760779884,0.9894009349916499325961542]
	],

	weights = [
		[1],
		[0.8888888888888888888888889,0.5555555555555555555555556],
		[0.6521451548625461426269361,0.3478548451374538573730639],
		[0.5688888888888888888888889,0.4786286704993664680412915,0.2369268850561890875142640],
		[0.4679139345726910473898703,0.3607615730481386075698335,0.1713244923791703450402961],
		[0.4179591836734693877551020,0.3818300505051189449503698,0.2797053914892766679014678,0.1294849661688696932706114],
		[0.3626837833783619829651504,0.3137066458778872873379622,0.2223810344533744705443560,0.1012285362903762591525314],
		[0.3302393550012597631645251,0.3123470770400028400686304,0.2606106964029354623187429,0.1806481606948574040584720,0.0812743883615744119718922],
		[0.2955242247147528701738930,0.2692667193099963550912269,0.2190863625159820439955349,0.1494513491505805931457763,0.0666713443086881375935688],
		[0.2729250867779006307144835,0.2628045445102466621806889,0.2331937645919904799185237,0.1862902109277342514260976,0.1255803694649046246346943,0.0556685671161736664827537],
		[0.2491470458134027850005624,0.2334925365383548087608499,0.2031674267230659217490645,0.1600783285433462263346525,0.1069393259953184309602547,0.0471753363865118271946160],
		[0.2325515532308739101945895,0.2262831802628972384120902,0.2078160475368885023125232,0.1781459807619457382800467,0.1388735102197872384636018,0.0921214998377284479144218,0.0404840047653158795200216],
		[0.2152638534631577901958764,0.2051984637212956039659241,0.1855383974779378137417166,0.1572031671581935345696019,0.1215185706879031846894148,0.0801580871597602098056333,0.0351194603317518630318329],
		[0.2025782419255612728806202,0.1984314853271115764561183,0.1861610000155622110268006,0.1662692058169939335532009,0.1395706779261543144478048,0.1071592204671719350118695,0.0703660474881081247092674,0.0307532419961172683546284],
		[0.1894506104550684962853967,0.1826034150449235888667637,0.1691565193950025381893121,0.1495959888165767320815017,0.1246289712555338720524763,0.0951585116824927848099251,0.0622535239386478928628438,0.0271524594117540948517806]
	];

	return {
		TOLERANCE: 10e-6,

		integrate: function(f, a, b, n) {
			var x = abscissas[n - 2],
				w = weights[n - 2],
				A = 0.5 * (b - a),
				B = A + a,
				i = 0,
				m = (n + 1) >> 1,
				sum = n & 1 ? w[i++] * f(B) : 0; 
			while (i < m) {
				var Ax = A * x[i];
				sum += w[i++] * (f(B + Ax) + f(B - Ax));
			}
			return A * sum;
		},

		findRoot: function(f, df, x, a, b, n, tol) {
			for (var i = 0; i < n; i++) {
				var fx = f(x),
					dx = fx / df(x);
				if (Math.abs(dx) < tol)
					return x;
				var nx = x - dx;
				if (fx > 0) {
					b = x;
					x = nx <= a ? 0.5 * (a + b) : nx;
				} else {
					a = x;
					x = nx >= b ? 0.5 * (a + b) : nx;
				}
			}
		}
	};
};

var BlendMode = {
	process: function(blendMode, srcContext, dstContext, alpha, offset) {
		var srcCanvas = srcContext.canvas,
			dstData = dstContext.getImageData(offset.x, offset.y,
					srcCanvas.width, srcCanvas.height),
			dst  = dstData.data,
			src  = srcContext.getImageData(0, 0,
					srcCanvas.width, srcCanvas.height).data,
			min = Math.min,
			max = Math.max,
			abs = Math.abs,
			sr, sg, sb, sa, 
			br, bg, bb, ba, 
			dr, dg, db;     

		function getLum(r, g, b) {
			return 0.2989 * r + 0.587 * g + 0.114 * b;
		}

		function setLum(r, g, b, l) {
			var d = l - getLum(r, g, b);
			dr = r + d;
			dg = g + d;
			db = b + d;
			var l = getLum(dr, dg, db),
				mn = min(dr, dg, db),
				mx = max(dr, dg, db);
			if (mn < 0) {
				var lmn = l - mn;
				dr = l + (dr - l) * l / lmn;
				dg = l + (dg - l) * l / lmn;
				db = l + (db - l) * l / lmn;
			}
			if (mx > 255) {
				var ln = 255 - l, mxl = mx - l;
				dr = l + (dr - l) * ln / mxl;
				dg = l + (dg - l) * ln / mxl;
				db = l + (db - l) * ln / mxl;
			}
		}

		function getSat(r, g, b) {
			return max(r, g, b) - min(r, g, b);
		}

		function setSat(r, g, b, s) {
			var col = [r, g, b],
				mx = max(r, g, b), 
				mn = min(r, g, b), 
				md; 
			mn = mn == r ? 0 : mn == g ? 1 : 2;
			mx = mx == r ? 0 : mx == g ? 1 : 2;
			md = min(mn, mx) == 0 ? max(mn, mx) == 1 ? 2 : 1 : 0;
			if (col[mx] > col[mn]) {
				col[md] = (col[md] - col[mn]) * s / (col[mx] - col[mn]);
				col[mx] = s;
			} else {
				col[md] = col[mx] = 0;
			}
			col[mn] = 0;
			dr = col[0];
			dg = col[1];
			db = col[2];
		}

		var modes = {
			multiply: function() {
				dr = br * sr / 255;
				dg = bg * sg / 255;
				db = bb * sb / 255;
			},

			screen: function() {
				dr = 255 - (255 - br) * (255 - sr) / 255;
				dg = 255 - (255 - bg) * (255 - sg) / 255;
				db = 255 - (255 - bb) * (255 - sb) / 255;
			},

			overlay: function() {
				dr = br < 128 ? 2 * br * sr / 255 : 255 - 2 * (255 - br) * (255 - sr) / 255;
				dg = bg < 128 ? 2 * bg * sg / 255 : 255 - 2 * (255 - bg) * (255 - sg) / 255;
				db = bb < 128 ? 2 * bb * sb / 255 : 255 - 2 * (255 - bb) * (255 - sb) / 255;
			},

			'soft-light': function() {
				var t = sr * br / 255;
				dr = t + br * (255 - (255 - br) * (255 - sr) / 255 - t) / 255;
				t = sg * bg / 255;
				dg = t + bg * (255 - (255 - bg) * (255 - sg) / 255 - t) / 255;
				t = sb * bb / 255;
				db = t + bb * (255 - (255 - bb) * (255 - sb) / 255 - t) / 255;
			},

			'hard-light': function() {
				dr = sr < 128 ? 2 * sr * br / 255 : 255 - 2 * (255 - sr) * (255 - br) / 255;
				dg = sg < 128 ? 2 * sg * bg / 255 : 255 - 2 * (255 - sg) * (255 - bg) / 255;
				db = sb < 128 ? 2 * sb * bb / 255 : 255 - 2 * (255 - sb) * (255 - bb) / 255;
			},

			'color-dodge': function() {
				dr = sr == 255 ? sr : min(255, br * 255 / (255 - sr));
				dg = sg == 255 ? sg : min(255, bg * 255 / (255 - sg));
				db = sb == 255 ? sb : min(255, bb * 255 / (255 - sb));
			},

			'color-burn': function() {
				dr = sr == 0 ? 0 : max(255 - ((255 - br) * 255) / sr, 0);
				dg = sg == 0 ? 0 : max(255 - ((255 - bg) * 255) / sg, 0);
				db = sb == 0 ? 0 : max(255 - ((255 - bb) * 255) / sb, 0);
			},

			darken: function() {
				dr = br < sr ? br : sr;
				dg = bg < sg ? bg : sg;
				db = bb < sb ? bb : sb;
			},

			lighten: function() {
				dr = br > sr ? br : sr;
				dg = bg > sg ? bg : sg;
				db = bb > sb ? bb : sb;
			},

			difference: function() {
				dr = br - sr;
				if (dr < 0)
					dr = -dr;
				dg = bg - sg;
				if (dg < 0)
					dg = -dg;
				db = bb - sb;
				if (db < 0)
					db = -db;
			},

			exclusion: function() {
				dr = br + sr * (255 - br - br) / 255;
				dg = bg + sg * (255 - bg - bg) / 255;
				db = bb + sb * (255 - bb - bb) / 255;
			},

			hue: function() {
				setSat(sr, sg, sb, getSat(br, bg, bb));
				setLum(dr, dg, db, getLum(br, bg, bb));
			},

			saturation: function() {
				setSat(br, bg, bb, getSat(sr, sg, sb));
				setLum(dr, dg, db, getLum(br, bg, bb));
			},

			luminosity: function() {
				setLum(br, bg, bb, getLum(sr, sg, sb));
			},

			color: function() {
				setLum(sr, sg, sb, getLum(br, bg, bb));
			},

			add: function() {
				dr = min(br + sr, 255);
				dg = min(bg + sg, 255);
				db = min(bb + sb, 255);
			},

			subtract: function() {
				dr = max(br - sr, 0);
				dg = max(bg - sg, 0);
				db = max(bb - sb, 0);
			},

			average: function() {
				dr = (br + sr) / 2;
				dg = (bg + sg) / 2;
				db = (bb + sb) / 2;
			},

			negation: function() {
				dr = 255 - abs(255 - sr - br);
				dg = 255 - abs(255 - sg - bg);
				db = 255 - abs(255 - sb - bb);
			}
		};

		var process = modes[blendMode];
		if (!process)
			return;

		for (var i = 0, l = dst.length; i < l; i += 4) {
			sr = src[i];
			br = dst[i];
			sg = src[i + 1];
			bg = dst[i + 1];
			sb = src[i + 2];
			bb = dst[i + 2];
			sa = src[i + 3];
			ba = dst[i + 3];
			process();
			var a1 = sa * alpha / 255,
				a2 = 1 - a1;
			dst[i] = a1 * dr + a2 * br;
			dst[i + 1] = a1 * dg + a2 * bg;
			dst[i + 2] = a1 * db + a2 * bb;
			dst[i + 3] = sa * alpha + a2 * ba;
		}
		dstContext.putImageData(dstData, offset.x, offset.y);
	}
};

var PaperScript = this.PaperScript = new function() {
var parse_js=new function(){function S(a,b,c){var d=[];for(var e=0;e<a.length;++e)d.push(b.call(c,a[e],e));return d}function R(a,b){return Object.prototype.hasOwnProperty.call(a,b)}function Q(c){return/^[a-z_$][a-z0-9_$]*$/i.test(c)&&c!="this"&&!R(d,c)&&!R(b,c)&&!R(a,c)}function P(a,b){var c={};a===!0&&(a={});for(var d in b)R(b,d)&&(c[d]=a&&R(a,d)?a[d]:b[d]);return c}function O(a,b){for(var c=b.length;--c>=0;)if(b[c]===a)return!0;return!1}function N(a){return a.split("")}function M(a,b){return Array.prototype.slice.call(a,b==null?0:b)}function L(a){var b={};for(var c=0;c<a.length;++c)b[a[c]]=!0;return b}function K(a){a instanceof Function&&(a=a());for(var b=1,c=arguments.length;--c>0;++b)arguments[b]();return a}function J(a){var b=M(arguments,1);return function(){return a.apply(this,b.concat(M(arguments)))}}function I(a,b){function y(a){var b=a[0],c=p[b];if(!c)throw new Error("Can't find generator for \""+b+'"');x.push(a);var d=c.apply(b,a.slice(1));x.pop();return d}function w(a){var b=a[0],c=a[1];c!=null&&(b=h([b,"=",y(c)]));return b}function v(a){if(!a)return";";if(a.length==0)return"{}";return"{"+d+g(function(){return t(a).join(d)})+d+f("}")}function u(a){var c=a.length;if(c==0)return"{}";return"{"+d+S(a,function(a,e){var i=a[1].length>0,j=g(function(){return f(a[0]?h(["case",y(a[0])+":"]):"default:")},.5)+(i?d+g(function(){return t(a[1]).join(d)}):"");!b&&i&&e<c-1&&(j+=";");return j}).join(d)+d+f("}")}function t(a){for(var c=[],d=a.length-1,e=0;e<=d;++e){var g=a[e],h=y(g);h!=";"&&(!b&&e==d&&(g[0]=="while"&&F(g[2])||O(g[0],["for","for-in"])&&F(g[4])||g[0]=="if"&&F(g[2])&&!g[3]||g[0]=="if"&&g[3]&&F(g[3])?h=h.replace(/;*\s*$/,";"):h=h.replace(/;+\s*$/,"")),c.push(h))}return S(c,f)}function s(a){return a.toString()}function r(a,b,c,d){var e=d||"function";a&&(e+=" "+s(a)),e+="("+j(S(b,s))+")";return h([e,v(c)])}function q(a){if(a[0]=="do")return y(["block",[a]]);var b=a;for(;;){var c=b[0];if(c=="if"){if(!b[3])return y(["block",[a]]);b=b[3]}else if(c=="while"||c=="do")b=b[2];else if(c=="for"||c=="for-in")b=b[4];else break}return y(a)}function o(a){var b=a.toString(10),c=[b.replace(/^0\./,".")],d;Math.floor(a)===a?(c.push("0x"+a.toString(16).toLowerCase(),"0"+a.toString(8)),(d=/^(.*?)(0+)$/.exec(a))&&c.push(d[1]+"e"+d[2].length)):(d=/^0?\.(0+)(.*)$/.exec(a))&&c.push(d[2]+"e-"+(d[1].length+d[2].length),b.substr(b.indexOf(".")));return l(c)}function m(a){if(a[0]=="function"){var b=M(x),c=b.pop(),d=b.pop();while(d){if(d[0]=="stat")return!0;if(d[0]=="seq"&&d[1]===c||d[0]=="call"&&d[1]===c||d[0]=="binary"&&d[2]===c)c=d,d=b.pop();else return!1}}return!R(G,a[0])}function l(a){if(a.length==1)return a[0];if(a.length==2){var b=a[1];a=a[0];return a.length<=b.length?a:b}return l([a[0],l(a.slice(1))])}function k(a){var b=y(a);for(var c=1;c<arguments.length;++c){var d=arguments[c];if(d instanceof Function&&d(a)||a[0]==d)return"("+b+")"}return b}function j(a){return a.join(","+e)}function h(a){if(b)return a.join(" ");var c=[];for(var d=0;d<a.length;++d){var e=a[d+1];c.push(a[d]),e&&(/[a-z0-9_\x24]$/i.test(a[d].toString())&&/^[a-z0-9_\x24]/i.test(e.toString())||/[\+\-]$/.test(a[d].toString())&&/^[\+\-]/.test(e.toString()))&&c.push(" ")}return c.join("")}function g(a,b){b==null&&(b=1),c+=b;try{return a.apply(null,M(arguments,1))}finally{c-=b}}function f(a){a==null&&(a=""),b&&(a=Array(b.indent_start+c*b.indent_level).join(" ")+a);return a}b&&(b=P(b,{indent_start:0,indent_level:4,quote_keys:!1,space_colon:!1}));var c=0,d=b?"\n":"",e=b?" ":"",p={string:H,num:o,name:s,toplevel:function(a){return t(a).join(d+d)},block:v,"var":function(a){return"var "+j(S(a,w))+";"},"const":function(a){return"const "+j(S(a,w))+";"},"try":function(a,b,c){var d=["try",v(a)];b&&d.push("catch","("+b[0]+")",v(b[1])),c&&d.push("finally",v(c));return h(d)},"throw":function(a){return h(["throw",y(a)])+";"},"new":function(a,b){b=b.length>0?"("+j(S(b,y))+")":"";return h(["new",k(a,"seq","binary","conditional","assign",function(a){var b=E(),c={};try{b.with_walkers({call:function(){throw c},"function":function(){return this}},function(){b.walk(a)})}catch(d){if(d===c)return!0;throw d}})+b])},"switch":function(a,b){return h(["switch","("+y(a)+")",u(b)])},"break":function(a){var b="break";a!=null&&(b+=" "+s(a));return b+";"},"continue":function(a){var b="continue";a!=null&&(b+=" "+s(a));return b+";"},conditional:function(a,b,c){return h([k(a,"assign","seq","conditional"),"?",k(b,"seq"),":",k(c,"seq")])},assign:function(a,b,c){a&&a!==!0?a+="=":a="=";return h([y(b),a,k(c,"seq")])},dot:function(a){var b=y(a),c=1;a[0]=="num"?b+=".":m(a)&&(b="("+b+")");while(c<arguments.length)b+="."+s(arguments[c++]);return b},call:function(a,b){var c=y(a);m(a)&&(c="("+c+")");return c+"("+j(S(b,function(a){return k(a,"seq")}))+")"},"function":r,defun:r,"if":function(a,b,c){var d=["if","("+y(a)+")",c?q(b):y(b)];c&&d.push("else",y(c));return h(d)},"for":function(a,b,c,d){var f=["for"];a=(a!=null?y(a):"").replace(/;*\s*$/,";"+e),b=(b!=null?y(b):"").replace(/;*\s*$/,";"+e),c=(c!=null?y(c):"").replace(/;*\s*$/,"");var g=a+b+c;g=="; ; "&&(g=";;"),f.push("("+g+")",y(d));return h(f)},"for-in":function(a,b,c,d){var e=h(["for","("]);a&&(e+="var "),e+=h([s(b)+" in "+y(c)+")",y(d)]);return e},"while":function(a,b){return h(["while","("+y(a)+")",y(b)])},"do":function(a,b){return h(["do",y(b),"while","("+y(a)+")"])+";"},"return":function(a){var b=["return"];a!=null&&b.push(y(a));return h(b)+";"},binary:function(a,b,c){var d=y(b),e=y(c);if(O(b[0],["assign","conditional","seq"])||b[0]=="binary"&&z[a]>z[b[1]])d="("+d+")";if(O(c[0],["assign","conditional","seq"])||c[0]=="binary"&&z[a]>=z[c[1]]&&(c[1]!=a||!O(a,["&&","||","*"])))e="("+e+")";return h([d,a,e])},"unary-prefix":function(a,b){var c=y(b);b[0]=="num"||b[0]=="unary-prefix"&&!R(i,a+b[1])||!m(b)||(c="("+c+")");return a+(n(a.charAt(0))?" ":"")+c},"unary-postfix":function(a,b){var c=y(b);b[0]=="num"||b[0]=="unary-postfix"&&!R(i,a+b[1])||!m(b)||(c="("+c+")");return c+a},sub:function(a,b){var c=y(a);m(a)&&(c="("+c+")");return c+"["+y(b)+"]"},object:function(a){if(a.length==0)return"{}";return"{"+d+g(function(){return S(a,function(a){if(a.length==3)return f(r(a[0],a[1][2],a[1][3],a[2]));var c=a[0],d=y(a[1]);b&&b.quote_keys?c=H(c):(typeof c=="number"||!b&&+c+""==c)&&parseFloat(c)>=0?c=o(+c):Q(c)||(c=H(c));return f(h(b&&b.space_colon?[c,":",d]:[c+":",d]))}).join(","+d)})+d+f("}")},regexp:function(a,b){return"/"+a+"/"+b},array:function(a){if(a.length==0)return"[]";return h(["[",j(S(a,function(a){if(!b&&a[0]=="atom"&&a[1]=="undefined")return"";return k(a,"seq")})),"]"])},stat:function(a){return y(a).replace(/;*\s*$/,";")},seq:function(){return j(S(M(arguments),y))},label:function(a,b){return h([s(a),":",y(b)])},"with":function(a,b){return h(["with","("+y(a)+")",y(b)])},atom:function(a){return s(a)}},x=[];return y(a)}function H(a){var b=0,c=0;a=a.replace(/[\\\b\f\n\r\t\x22\x27]/g,function(a){switch(a){case"\\":return"\\\\";case"\b":return"\\b";case"\f":return"\\f";case"\n":return"\\n";case"\r":return"\\r";case"\t":return"\\t";case'"':++b;return'"';case"'":++c;return"'"}return a});return b>c?"'"+a.replace(/\x27/g,"\\'")+"'":'"'+a.replace(/\x22/g,'\\"')+'"'}function F(a){return!a||a[0]=="block"&&(!a[1]||a[1].length==0)}function E(){function f(a,b){var d={},e;for(e in a)R(a,e)&&(d[e]=c[e],c[e]=a[e]);var f=b();for(e in d)R(d,e)&&(d[e]?c[e]=d[e]:delete c[e]);return f}function e(a){if(a==null)return null;try{d.push(a);var e=a[0],f=c[e];if(f){var g=f.apply(a,a.slice(1));if(g!=null)return g}f=b[e];return f.apply(a,a.slice(1))}finally{d.pop()}}function a(a){return[this[0],S(a,function(a){var b=[a[0]];a.length>1&&(b[1]=e(a[1]));return b})]}var b={string:function(a){return[this[0],a]},num:function(a){return[this[0],a]},name:function(a){return[this[0],a]},toplevel:function(a){return[this[0],S(a,e)]},block:function(a){var b=[this[0]];a!=null&&b.push(S(a,e));return b},"var":a,"const":a,"try":function(a,b,c){return[this[0],S(a,e),b!=null?[b[0],S(b[1],e)]:null,c!=null?S(c,e):null]},"throw":function(a){return[this[0],e(a)]},"new":function(a,b){return[this[0],e(a),S(b,e)]},"switch":function(a,b){return[this[0],e(a),S(b,function(a){return[a[0]?e(a[0]):null,S(a[1],e)]})]},"break":function(a){return[this[0],a]},"continue":function(a){return[this[0],a]},conditional:function(a,b,c){return[this[0],e(a),e(b),e(c)]},assign:function(a,b,c){return[this[0],a,e(b),e(c)]},dot:function(a){return[this[0],e(a)].concat(M(arguments,1))},call:function(a,b){return[this[0],e(a),S(b,e)]},"function":function(a,b,c){return[this[0],a,b.slice(),S(c,e)]},defun:function(a,b,c){return[this[0],a,b.slice(),S(c,e)]},"if":function(a,b,c){return[this[0],e(a),e(b),e(c)]},"for":function(a,b,c,d){return[this[0],e(a),e(b),e(c),e(d)]},"for-in":function(a,b,c,d){return[this[0],a,b,e(c),e(d)]},"while":function(a,b){return[this[0],e(a),e(b)]},"do":function(a,b){return[this[0],e(a),e(b)]},"return":function(a){return[this[0],e(a)]},binary:function(a,b,c){return[this[0],a,e(b),e(c)]},"unary-prefix":function(a,b){return[this[0],a,e(b)]},"unary-postfix":function(a,b){return[this[0],a,e(b)]},sub:function(a,b){return[this[0],e(a),e(b)]},object:function(a){return[this[0],S(a,function(a){return a.length==2?[a[0],e(a[1])]:[a[0],e(a[1]),a[2]]})]},regexp:function(a,b){return[this[0],a,b]},array:function(a){return[this[0],S(a,e)]},stat:function(a){return[this[0],e(a)]},seq:function(){return[this[0]].concat(S(M(arguments),e))},label:function(a,b){return[this[0],a,e(b)]},"with":function(a,b){return[this[0],e(a),e(b)]},atom:function(a){return[this[0],a]}},c={},d=[];return{walk:e,with_walkers:f,parent:function(){return d[d.length-2]},stack:function(){return d}}}function D(a,b,c){function bj(a){try{++d.in_loop;return a()}finally{--d.in_loop}}function bi(a){arguments.length==0&&(a=!0);var b=bh();if(a&&e("punc",",")){g();return p("seq",b,bi())}return b}function bh(){var a=bf(),b=d.token.value;if(e("operator")&&R(y,b)){if(bg(a)){g();return p("assign",y[b],a,bh())}i("Invalid assignment")}return a}function bg(a){switch(a[0]){case"dot":case"sub":return!0;case"name":return a[1]!="this"}}function bf(){var a=be();if(e("operator","?")){g();var b=bi(!1);m(":");return p("conditional",a,b,bi(!1))}return a}function be(){return bd(X(!0),0)}function bd(a,b){var c=e("operator")?d.token.value:null,f=c!=null?z[c]:null;if(f!=null&&f>b){g();var h=bd(X(!0),f);return bd(p("binary",c,a,h),b)}return a}function bc(a,b,c){(b=="++"||b=="--")&&!bg(c)&&i("Invalid use of "+b+" operator");return p(a,b,c)}function bb(a,b){if(e("punc",".")){g();return bb(p("dot",a,ba()),b)}if(e("punc","[")){g();return bb(p("sub",a,K(bi,J(m,"]"))),b)}if(b&&e("punc","(")){g();return bb(p("call",a,Y(")")),!0)}if(b&&e("operator")&&R(x,d.token.value))return K(J(bc,"unary-postfix",d.token.value,a),g);return a}function ba(){switch(d.token.type){case"name":case"operator":case"keyword":case"atom":return K(d.token.value,g);default:k()}}function _(){switch(d.token.type){case"num":case"string":return K(d.token.value,g)}return ba()}function $(){var a=!0,c=[];while(!e("punc","}")){a?a=!1:m(",");if(!b&&e("punc","}"))break;var f=d.token.type,h=_();f!="name"||h!="get"&&h!="set"||!!e("punc",":")?(m(":"),c.push([h,bi(!1)])):c.push([ba(),I(!1),h])}g();return p("object",c)}function Z(){return p("array",Y("]",!b,!0))}function Y(a,b,c){var d=!0,f=[];while(!e("punc",a)){d?d=!1:m(",");if(b&&e("punc",a))break;e("punc",",")&&c?f.push(["atom","undefined"]):f.push(bi(!1))}g();return f}function X(a){if(e("operator","new")){g();return W()}if(e("operator")&&R(w,d.token.value))return bc("unary-prefix",K(d.token.value,g),X(a));if(e("punc")){switch(d.token.value){case"(":g();return bb(K(bi,J(m,")")),a);case"[":g();return bb(Z(),a);case"{":g();return bb($(),a)}k()}if(e("keyword","function")){g();return bb(I(!1),a)}if(R(B,d.token.type)){var b=d.token.type=="regexp"?p("regexp",d.token.value[0],d.token.value[1]):p(d.token.type,d.token.value);return bb(K(b,g),a)}k()}function W(){var a=X(!1),b;e("punc","(")?(g(),b=Y(")")):b=[];return bb(p("new",a,b),!0)}function V(){return p("const",T())}function U(){return p("var",T())}function T(){var a=[];for(;;){e("name")||k();var b=d.token.value;g(),e("operator","=")?(g(),a.push([b,bi(!1)])):a.push([b]);if(!e("punc",","))break;g()}return a}function S(){var a=P(),b,c;if(e("keyword","catch")){g(),m("("),e("name")||i("Name expected");var f=d.token.value;g(),m(")"),b=[f,P()]}e("keyword","finally")&&(g(),c=P()),!b&&!c&&i("Missing catch/finally blocks");return p("try",a,b,c)}function P(){m("{");var a=[];while(!e("punc","}"))e("eof")&&k(),a.push(u());g();return a}function N(){var a=q(),b=u(),c;e("keyword","else")&&(g(),c=u());return p("if",a,b,c)}function L(a){var b=e("name")?K(d.token.value,g):null;a&&!b&&k(),m("(");return p(a?"defun":"function",b,function(a,b){while(!e("punc",")"))a?a=!1:m(","),e("name")||k(),b.push(d.token.value),g();g();return b}(!0,[]),function(){++d.in_function;var a=d.in_loop;d.in_loop=0;var b=P();--d.in_function,d.in_loop=a;return b}())}function H(){m("(");var a=e("keyword","var");a&&g();if(e("name")&&t(f(),"operator","in")){var b=d.token.value;g(),g();var c=bi();m(")");return p("for-in",a,b,c,bj(u))}var h=e("punc",";")?null:a?U():bi();m(";");var i=e("punc",";")?null:bi();m(";");var j=e("punc",")")?null:bi();m(")");return p("for",h,i,j,bj(u))}function G(a){var b=e("name")?d.token.value:null;b!=null?(g(),O(b,d.labels)||i("Label "+b+" without matching loop or statement")):d.in_loop==0&&i(a+" not inside a loop or switch"),o();return p(a,b)}function F(){return p("stat",K(bi,o))}function E(a){d.labels.push(a);var c=d.token,e=u();b&&!R(A,e[0])&&k(c),d.labels.pop();return p("label",a,e)}function D(){e("operator","/")&&(d.peeked=null,d.token=d.input(!0));switch(d.token.type){case"num":case"string":case"regexp":case"operator":case"atom":return F();case"name":return t(f(),"punc",":")?E(K(d.token.value,g,g)):F();case"punc":switch(d.token.value){case"{":return p("block",P());case"[":case"(":return F();case";":g();return p("block");default:k()};case"keyword":switch(K(d.token.value,g)){case"break":return G("break");case"continue":return G("continue");case"debugger":o();return p("debugger");case"do":return function(a){l("keyword","while");return p("do",K(q,o),a)}(bj(u));case"for":return H();case"function":return I(!0);case"if":return N();case"return":d.in_function==0&&i("'return' outside of function");return p("return",e("punc",";")?(g(),null):n()?null:K(bi,o));case"switch":return p("switch",q(),Q());case"throw":return p("throw",K(bi,o));case"try":return S();case"var":return K(U,o);case"const":return K(V,o);case"while":return p("while",q(),bj(u));case"with":return p("with",q(),u());default:k()}}}function r(a,b,c){return a instanceof C?a:new C(a,b,c)}function q(){m("(");var a=bi();m(")");return a}function p(){return M(arguments)}function o(){e("punc",";")?g():n()||k()}function n(){return!b&&(d.token.nlb||e("eof")||e("punc","}"))}function m(a){return l("punc",a)}function l(a,b){if(e(a,b))return g();j(d.token,"Unexpected token "+d.token.type+", expected "+a)}function k(a){a==null&&(a=d.token),j(a,"Unexpected token: "+a.type+" ("+a.value+")")}function j(a,b){i(b,a.line,a.col)}function i(a,b,c,e){var f=d.input.context();s(a,b!=null?b:f.tokline,c!=null?c:f.tokcol,e!=null?e:f.tokpos)}function h(){return d.prev}function g(){d.prev=d.token,d.peeked?(d.token=d.peeked,d.peeked=null):d.token=d.input();return d.token}function f(){return d.peeked||(d.peeked=d.input())}function e(a,b){return t(d.token,a,b)}var d={input:typeof a=="string"?v(a,!0):a,token:null,prev:null,peeked:null,in_function:0,in_loop:0,labels:[]};d.token=g();var u=c?function(){var a=d.token,b=D.apply(this,arguments);b[0]=r(b[0],a,h());return b}:D,I=c?function(){var a=h(),b=L.apply(this,arguments);b[0]=r(b[0],a,h());return b}:L,Q=J(bj,function(){m("{");var a=[],b=null;while(!e("punc","}"))e("eof")&&k(),e("keyword","case")?(g(),b=[],a.push([bi(),b]),m(":")):e("keyword","default")?(g(),m(":"),b=[],a.push([null,b])):(b||k(),b.push(u()));g();return a});return p("toplevel",function(a){while(!e("eof"))a.push(u());return a}([]))}function C(a,b,c){this.name=a,this.start=b,this.end=c}function v(b){function N(a){if(a)return H();y(),v();var b=g();if(!b)return w("eof");if(p(b))return B();if(b=='"'||b=="'")return E();if(R(l,b))return w("punc",h());if(b==".")return K();if(b=="/")return J();if(R(e,b))return I();if(o(b))return L();A("Unexpected character '"+b+"'")}function M(a,b){try{return b()}catch(c){if(c===u)A(a);else throw c}}function L(){var b=z(o);return R(a,b)?R(i,b)?w("operator",b):R(d,b)?w("atom",b):w("keyword",b):w("name",b)}function K(){h();return p(g())?B("."):w("punc",".")}function J(){h();var a=f.regex_allowed;switch(g()){case"/":f.comments_before.push(F()),f.regex_allowed=a;return N();case"*":f.comments_before.push(G()),f.regex_allowed=a;return N()}return f.regex_allowed?H():I("/")}function I(a){function b(a){if(!g())return a;var c=a+g();if(R(i,c)){h();return b(c)}return a}return w("operator",b(a||h()))}function H(){return M("Unterminated regular expression",function(){var a=!1,b="",c,d=!1;while(c=h(!0))if(a)b+="\\"+c,a=!1;else if(c=="[")d=!0,b+=c;else if(c=="]"&&d)d=!1,b+=c;else{if(c=="/"&&!d)break;c=="\\"?a=!0:b+=c}var e=z(function(a){return R(m,a)});return w("regexp",[b,e])})}function G(){h();return M("Unterminated multiline comment",function(){var a=t("*/",!0),b=f.text.substring(f.pos,a),c=w("comment2",b,!0);f.pos=a+2,f.line+=b.split("\n").length-1,f.newline_before=b.indexOf("\n")>=0;return c})}function F(){h();var a=t("\n"),b;a==-1?(b=f.text.substr(f.pos),f.pos=f.text.length):(b=f.text.substring(f.pos,a),f.pos=a);return w("comment1",b,!0)}function E(){return M("Unterminated string constant",function(){var a=h(),b="";for(;;){var c=h(!0);if(c=="\\")c=C();else if(c==a)break;b+=c}return w("string",b)})}function D(a){var b=0;for(;a>0;--a){var c=parseInt(h(!0),16);isNaN(c)&&A("Invalid hex-character pattern in string"),b=b<<4|c}return b}function C(){var a=h(!0);switch(a){case"n":return"\n";case"r":return"\r";case"t":return"\t";case"b":return"\b";case"v":return"";case"f":return"\f";case"0":return" ";case"x":return String.fromCharCode(D(2));case"u":return String.fromCharCode(D(4));default:return a}}function B(a){var b=!1,c=!1,d=!1,e=a==".",f=z(function(f,g){if(f=="x"||f=="X"){if(d)return!1;return d=!0}if(!d&&(f=="E"||f=="e")){if(b)return!1;return b=c=!0}if(f=="-"){if(c||g==0&&!a)return!0;return!1}if(f=="+")return c;c=!1;if(f=="."){if(!e)return e=!0;return!1}return n(f)});a&&(f=a+f);var g=q(f);if(!isNaN(g))return w("num",g);A("Invalid syntax: "+f)}function A(a){s(a,f.tokline,f.tokcol,f.tokpos)}function z(a){var b="",c=g(),d=0;while(c&&a(c,d++))b+=h(),c=g();return b}function y(){while(R(j,g()))h()}function w(a,b,d){f.regex_allowed=a=="operator"&&!R(x,b)||a=="keyword"&&R(c,b)||a=="punc"&&R(k,b);var e={type:a,value:b,line:f.tokline,col:f.tokcol,pos:f.tokpos,nlb:f.newline_before};d||(e.comments_before=f.comments_before,f.comments_before=[]),f.newline_before=!1;return e}function v(){f.tokline=f.line,f.tokcol=f.col,f.tokpos=f.pos}function t(a,b){var c=f.text.indexOf(a,f.pos);if(b&&c==-1)throw u;return c}function r(){return!f.peek()}function h(a){var b=f.text.charAt(f.pos++);if(a&&!b)throw u;b=="\n"?(f.newline_before=!0,++f.line,f.col=0):++f.col;return b}function g(){return f.text.charAt(f.pos)}var f={text:b.replace(/\r\n?|[\n\u2028\u2029]/g,"\n").replace(/^\uFEFF/,""),pos:0,tokpos:0,line:0,tokline:0,col:0,tokcol:0,newline_before:!1,regex_allowed:!1,comments_before:[]};N.context=function(a){a&&(f=a);return f};return N}function t(a,b,c){return a.type==b&&(c==null||a.value==c)}function s(a,b,c,d){throw new r(a,b,c,d)}function r(a,b,c,d){this.message=a,this.line=b,this.col=c,this.pos=d;try{({})()}catch(e){this.stack=e.stack}}function q(a){if(f.test(a))return parseInt(a.substr(2),16);if(g.test(a))return parseInt(a.substr(1),8);if(h.test(a))return parseFloat(a)}function p(a){a=a.charCodeAt(0);return a>=48&&a<=57}function o(a){return n(a)||a=="$"||a=="_"}function n(a){a=a.charCodeAt(0);return a>=48&&a<=57||a>=65&&a<=90||a>=97&&a<=122}var a=L(["break","case","catch","const","continue","default","delete","do","else","finally","for","function","if","in","instanceof","new","return","switch","throw","try","typeof","var","void","while","with"]),b=L(["abstract","boolean","byte","char","class","debugger","double","enum","export","extends","final","float","goto","implements","import","int","interface","long","native","package","private","protected","public","short","static","super","synchronized","throws","transient","volatile"]),c=L(["return","new","delete","throw","else","case"]),d=L(["false","null","true","undefined"]),e=L(N("+-*&%=<>!?|~^")),f=/^0x[0-9a-f]+$/i,g=/^0[0-7]+$/,h=/^\d*\.?\d*(?:e[+-]?\d*(?:\d\.?|\.?\d)\d*)?$/i,i=L(["in","instanceof","typeof","new","void","delete","++","--","+","-","!","~","&","|","^","*","/","%",">>","<<",">>>","<",">","<=",">=","==","===","!=","!==","?","=","+=","-=","/=","*=","%=",">>=","<<=",">>>=","%=","|=","^=","&=","&&","||"]),j=L(N(" \n\r\t")),k=L(N("[{}(,.;:")),l=L(N("[]{}(),;:")),m=L(N("gmsiy"));r.prototype.toString=function(){return this.message+" (line: "+this.line+", col: "+this.col+", pos: "+this.pos+")"+"\n\n"+this.stack};var u={},w=L(["typeof","void","delete","--","++","!","~","-","+"]),x=L(["--","++"]),y=function(a,b,c){while(c<a.length)b[a[c]]=a[c].substr(0,a[c].length-1),c++;return b}(["+=","-=","/=","*=","%=",">>=","<<=",">>>=","|=","^=","&="],{"=":!0},0),z=function(a,b){for(var c=0,d=1;c<a.length;++c,++d){var e=a[c];for(var f=0;f<e.length;++f)b[e[f]]=d}return b}([["||"],["&&"],["|"],["^"],["&"],["==","===","!=","!=="],["<",">","<=",">=","in","instanceof"],[">>","<<",">>>"],["+","-"],["*","/","%"]],{}),A=L(["for","do","while","switch"]),B=L(["atom","num","string","regexp","name"]);C.prototype.toString=function(){return this.name};var G=L(["name","array","string","dot","sub","call","regexp"]);return{parse:D,stringify:I,tokenizer:v,walker:E}}

	var operators = {
		'+': 'add',
		'-': 'subtract',
		'*': 'multiply',
		'/': 'divide',
		'%': 'modulo',
		'==': 'equals',
		'!=': 'equals'
	};

	function $eval(left, operator, right) {
		var handler = operators[operator];
		if (left && left[handler]) {
			var res = left[handler](right);
			return operator == '!=' ? !res : res;
		}
		switch (operator) {
		case '+': return left + right;
		case '-': return left - right;
		case '*': return left * right;
		case '/': return left / right;
		case '%': return left % right;
		case '==': return left == right;
		case '!=': return left != right;
		default:
			throw new Error('Implement Operator: ' + operator);
		}
	};

	var signOperators = {
		'-': 'negate'
	};

	function $sign(operator, value) {
		var handler = signOperators[operator];
		if (value && value[handler]) {
			return value[handler]();
		}
		switch (operator) {
		case '+': return +value;
		case '-': return -value;
		default:
			throw new Error('Implement Sign Operator: ' + operator);
		}
	}

	function isDynamic(exp) {
		var type = exp[0];
		return type != 'num' && type != 'string';
	}

	function handleOperator(operator, left, right) {
		if (operators[operator] && isDynamic(left)) {
			return ['call', ['name', '$eval'],
					[left, ['string', operator], right]];
		}
	}

	function compile(code) {
		var ast = parse_js.parse(code),
			walker = parse_js.walker(),
			walk = walker.walk;

		ast = walker.with_walkers({
			'binary': function(operator, left, right) {
				return handleOperator(operator, left = walk(left),
						right = walk(right))
						|| [this[0], operator, left, right];
			},

			'assign': function(operator, left, right) {
				var res = handleOperator(operator, left = walk(left),
						right = walk(right));
				if (res)
					return [this[0], true, left, res];
				return [this[0], operator, left, right];
			},

			'unary-prefix': function(operator, exp) {
				if (signOperators[operator] && isDynamic(exp)) {
					return ['call', ['name', '$sign'],
							[['string', operator], walk(exp)]];
				}
			}
		}, function() {
			return walk(ast);
		});

		return parse_js.stringify(ast, true);
	}

	function evaluate(code, scope) {
		if (typeof code !== 'string') {
			var canvas = code.getAttribute('canvas');
			if (canvas = canvas && document.getElementById(canvas)) {
				paper = scope;
				new Project();
				new View(canvas).activate();
			}
			if (code.src) {
				return request(code.src, scope);
			} else {
				code = code.innerHTML;
			}
		}
		var view = scope.view,
			tool = scope.tool = /on(?:Key|Mouse)(?:Up|Down|Move|Drag)/.test(code)
					&& new Tool(null, scope),
			res;
		paper = scope;
		with (scope) {
			(function() {
				var onEditOptions, onSelect, onDeselect, onReselect, onMouseDown,
					onMouseUp, onMouseDrag, onMouseMove, onKeyDown, onKeyUp,
					onFrame, onResize,
					handlers = [ 'onEditOptions', 'onSelect', 'onDeselect',
						'onReselect', 'onMouseDown', 'onMouseUp', 'onMouseDrag',
						'onMouseMove', 'onKeyDown', 'onKeyUp'];
				res = eval(compile(code));
				if (tool) {
					Base.each(handlers, function(key) {
						tool[key] = eval(key);
					});
				}
				if (view) {
					view.onResize = onResize;
					if (onFrame) {
						view.setOnFrame(onFrame);
					} else {
						view.draw();
					}
				}
			}).call(scope);
		}
		return res;
	}

	function request(url, scope) {
		var xhr = new (window.ActiveXObject || XMLHttpRequest)(
				'Microsoft.XMLHTTP');
		xhr.open('GET', url, true);
		if (xhr.overrideMimeType) {
			xhr.overrideMimeType('text/plain');
		}
		xhr.onreadystatechange = function() {
			if (xhr.readyState === 4) {
				return evaluate(xhr.responseText, scope);
			}
		};
		return xhr.send(null);
	}

	function load() {
		var scripts = document.getElementsByTagName('script'),
			count = 0;
		for (var i = 0, l = scripts.length; i < l; i++) {
			var script = scripts[i];
			if (script.type === 'text/paperscript'
					&& !script.getAttribute('loaded')) {
				var scope = new PaperScope(script.getAttribute('id')
						|| script.src || ('paperscript-' + (count++)));
				script.setAttribute('id', scope.id);
				evaluate(script, scope);
				script.setAttribute('loaded', true);
			}
		}
	}

	DomEvent.add(window, { load: load });

	return {
		compile: compile,
		evaluate: evaluate,
		load: load
	};

};

this.load = PaperScript.load;

return new (PaperScope.inject(this));
};
