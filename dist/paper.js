/*!
 * Paper.js v0.3 - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 *
 * Date: Thu Feb 14 22:13:10 2013 -0800
 *
 ***
 *
 * Bootstrap.js JavaScript Inheritance Micro-Framework
 * Copyright (c) 2006 - 2013 Juerg Lehni
 * http://lehni.org/
 *
 * Distributed under the MIT license.
 *
 ***
 *
 * Acorn.js
 * http://marijnhaverbeke.nl/acorn/
 *
 * Acorn is a tiny, fast JavaScript parser written in JavaScript,
 * created by Marijn Haverbeke and released under an MIT license.
 *
 */

var paper = new function() {

var Base = new function() { 
	var hidden = /^(statics|generics|preserve|enumerable|prototype|toString|valueOf)$/,
		proto = Object.prototype,
		toString = proto.toString,
		proto = Array.prototype,
		isArray = Array.isArray = Array.isArray || function(obj) {
			return toString.call(obj) === '[object Array]';
		},
		slice = proto.slice,
		forEach = proto.forEach || function(iter, bind) {
			for (var i = 0, l = this.length; i < l; i++)
				iter.call(bind, this[i], i, this);
		},
		forIn = function(iter, bind) {
			for (var i in this)
				if (this.hasOwnProperty(i))
					iter.call(bind, this[i], i, this);
		},
		create = Object.create || function(proto) {
			return { __proto__: proto };
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
			: obj.hasOwnProperty(name)
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
			if ((dontCheck || val !== undefined && src.hasOwnProperty(name))
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
						};
						res.valueOf = function() {
							return val.valueOf();
						};
					}
					if (beans && val.length === 0
							&& (bean = name.match(/^(get|is)(([A-Z])(.*))$/)))
						beans.push([ bean[3].toLowerCase() + bean[4], bean[2] ]);
				}
				if (!res || func || !res.get)
					res = { value: res, writable: true };
				if ((describe(dest, name)
						|| { configurable: true }).configurable) {
					res.configurable = true;
					res.enumerable = enumerable;
				}
				define(dest, name, res);
			}
			if (generics && func && (!preserve || !generics[name])) {
				generics[name] = function(bind) {
					return bind && dest[name].apply(bind,
							slice.call(arguments, 1));
				};
			}
		}
		if (src) {
			beans = [];
			for (var name in src)
				if (src.hasOwnProperty(name) && !hidden.test(name))
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

	function each(obj, iter, bind, asArray) {
		try {
			if (obj)
				(asArray || asArray === undefined && isArray(obj)
					? forEach : forIn).call(obj, iter, bind = bind || obj);
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
					base = Object.getPrototypeOf(proto).constructor,
					statics = src.statics === true ? src : src.statics;
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
			var ctor = function() {
				if (this.initialize)
					return this.initialize.apply(this, arguments);
			};
			ctor.prototype = create(this.prototype);
			ctor.toString = function() {
				return (this.prototype.initialize || function() {}).toString();
			};
			define(ctor.prototype, 'constructor',
					{ value: ctor, writable: true, configurable: true });
			inject(ctor, this, true);
			return arguments.length ? this.inject.apply(ctor, arguments) : ctor;
		}
	}, true).inject({
		inject: function() {
			for (var i = 0, l = arguments.length; i < l; i++)
				inject(this, arguments[i], arguments[i].enumerable);
			return this;
		},

		extend: function() {
			var res = create(this);
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

			create: function(ctor) {
				return create(ctor.prototype);
			},

			isPlainObject: function(obj) {
				var proto = obj !== null && typeof obj === 'object'
					&& Object.getPrototypeOf(obj);
				return proto && (proto === Object.prototype
						|| proto === Base.prototype);
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
};

this.Base = Base.inject({
	generics: true,

	clone: function() {
		return new this.constructor(this);
	},

	toString: function() {
		return '{ ' + Base.each(this, function(value, key) {
			if (!/^_/.test(key)) {
				var type = typeof value;
				this.push(key + ': ' + (type === 'number'
						? Base.formatFloat(value)
						: type === 'string' ? "'" + value + "'" : value));
			}
		}, []).join(', ') + ' }';
	},

	toJson: function(options) {
		return Base.toJson(this, options);
	},

	statics: {

		_types: {},

		_uid: 0,

		extend: function(src) {
			var res = this.base.apply(this, arguments);
			if (src._type)
				Base._types[src._type] = res;
			return res;
		},

		equals: function(obj1, obj2) {
			function checkKeys(o1, o2) {
				for (var i in o1)
					if (o1.hasOwnProperty(i) && typeof o2[i] === 'undefined')
						return false;
				return true;
			}
			if (obj1 == obj2)
				return true;
			if (obj1 && obj1.equals)
				return obj1.equals(obj2);
			if (obj2 && obj2.equals)
				return obj2.equals(obj1);
			if (Array.isArray(obj1) && Array.isArray(obj2)) {
				if (obj1.length !== obj2.length)
					return false;
				for (var i = 0, l = obj1.length; i < l; i++) {
					if (!Base.equals(obj1[i], obj2[i]))
						return false;
				}
				return true;
			}
			if (obj1 && typeof obj1 === 'object'
					&& obj2 && typeof obj2 === 'object') {
				if (!checkKeys(obj1, obj2) || !checkKeys(obj2, obj1))
					return false;
				for (var i in obj1) {
					if (obj1.hasOwnProperty(i) && !Base.equals(obj1[i], obj2[i]))
						return false;
				}
				return true;
			}
			return false;
		},

		read: function(list, start, length, clone, readNull) {
			if (this === Base) {
				var value = this.peek(list, start);
				list._index++;
				list._read = 1;
				return value;
			}
			var proto = this.prototype,
				readIndex = proto._readIndex,
				index = start || readIndex && list._index || 0;
			if (!length)
				length = list.length - index;
			var obj = list[index];
			if (obj instanceof this
				|| (proto._readNull || readNull) && obj == null && length <= 1) {
				if (readIndex)
					list._index = index + 1;
				return obj && clone ? obj.clone() : obj;
			}
			obj = Base.create(this);
			if (readIndex)
				obj._read = true;
			obj = obj.initialize.apply(obj, index > 0 || length < list.length
				? Array.prototype.slice.call(list, index, index + length)
				: list) || obj;
			if (readIndex) {
				list._index = index + obj._read;
				list._read = obj._read;
				delete obj._read;
			}
			return obj;
		},

		peek: function(list, start) {
			return list[list._index = start || list._index || 0];
		},

		readAll: function(list, start, clone) {
			var res = [], entry;
			for (var i = start || 0, l = list.length; i < l; i++) {
				res.push(Array.isArray(entry = list[i])
					? this.read(entry, 0, 0, clone) 
					: this.read(list, i, 1, clone));
			}
			return res;
		},

		readNamed: function(list, name, filter) {
			var value = this.getNamed(list, name),
				hasObject = value !== undefined;
			if (hasObject && filter !== false) {
				if (!list._filtered)
					list._filtered = Base.merge(list[0]);
				delete list._filtered[name];
			}
			return this.read(hasObject ? [value] : list);
		},

		getNamed: function(list, name) {
			var arg = list[0];
			if (list._hasObject === undefined)
				list._hasObject = list.length === 1 && Base.isPlainObject(arg);
			if (list._hasObject) {
				value = arg[name];
				return value !== undefined ? value : null;
			}
		},

		hasNamed: function(list, name) {
			return !!this.getNamed(list, name);
		},

		serialize: function(obj, options, compact, dictionary) {
			options = options || {};
			var root = !dictionary,
				res;
			if (root) {
				dictionary = {
					length: 0,
					definitions: {},
					references: {},
					add: function(item, create) {
						var id = '#' + item._id,
							ref = this.references[id];
						if (!ref) {
							this.length++;
							this.definitions[id] = create.call(item);
							ref = this.references[id] = [id];
						}
						return ref;
					}
				};
			}
			if (obj && obj._serialize) {
				res = obj._serialize(options, dictionary);
				if (obj._type && !compact && res[0] !== obj._type)
					res.unshift(obj._type);
			} else if (Array.isArray(obj)) {
				res = [];
				for (var i = 0, l = obj.length; i < l; i++)
					res[i] = Base.serialize(obj[i], options, compact,
							dictionary);
			} else if (Base.isPlainObject(obj)) {
				res = {};
				for (var i in obj)
					if (obj.hasOwnProperty(i))
						res[i] = Base.serialize(obj[i], options, compact,
								dictionary);
			} else if (typeof obj === 'number') {
				res = Base.formatFloat(obj, options.precision);
			} else {
				res = obj;
			}
			return root && dictionary.length > 0
					? [['dictionary', dictionary.definitions], res]
					: res;
		},

		deserialize: function(obj, data) {
			var res = obj;
			data = data || {};
			if (Array.isArray(obj)) {
				var type = obj[0],
					isDictionary = type === 'dictionary';
				if (!isDictionary) {
					if (data.dictionary && obj.length == 1 && /^#/.test(type))
						return data.dictionary[type];
					type = Base._types[type];
				}
				res = [];
				for (var i = type ? 1 : 0, l = obj.length; i < l; i++)
					res.push(Base.deserialize(obj[i], data));
				if (isDictionary) {
					data.dictionary = res[0];
				} else if (type) {
					var args = res;
					res = Base.create(type);
					res.initialize.apply(res, args);
				}
			} else if (Base.isPlainObject(obj)) {
				res = {};
				for (var key in obj)
					res[key] = Base.deserialize(obj[key], data);
			}
			return res;
		},

		toJson: function(obj, options) {
			return JSON.stringify(Base.serialize(obj, options));
		},

		fromJson: function(json) {
			return Base.deserialize(JSON.parse(json));
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

		merge: function() {
			return Base.each(arguments, function(hash) {
				Base.each(hash, function(value, key) {
					this[key] = value;
				}, this);
			}, new Base(), true); 
		},

		capitalize: function(str) {
			return str.replace(/\b[a-z]/g, function(match) {
				return match.toUpperCase();
			});
		},

		camelize: function(str) {
			return str.replace(/-(.)/g, function(all, chr) {
				return chr.toUpperCase();
			});
		},

		hyphenate: function(str) {
			return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
		},

		formatFloat: function(num, precision) {
			precision = precision ? Math.pow(10, precision) : 100000;
			return (Math.round(num * precision) / precision);
		},

		toFloat: function(str) {
			return parseFloat(str, 10);
		}
	}
});

var Callback = {
	attach: function(type, func) {
		if (typeof type !== 'string') {
			return Base.each(type, function(value, key) {
				this.attach(key, value);
			}, this);
		}
		var entry = this._eventTypes[type];
		if (!entry)
			return this;
		var handlers = this._handlers = this._handlers || {};
		handlers = handlers[type] = handlers[type] || [];
		if (handlers.indexOf(func) == -1) { 
			handlers.push(func);
			if (entry.install && handlers.length == 1)
				entry.install.call(this, type);
		}
		return this;
	},

	detach: function(type, func) {
		if (typeof type !== 'string') {
			return Base.each(type, function(value, key) {
				this.detach(key, value);
			}, this);
		}
		var entry = this._eventTypes[type],
			handlers = this._handlers && this._handlers[type],
			index;
		if (entry && handlers) {
			if (!func || (index = handlers.indexOf(func)) != -1
					&& handlers.length == 1) {
				if (entry.uninstall)
					entry.uninstall.call(this, type);
				delete this._handlers[type];
			} else if (index != -1) {
				handlers.splice(index, 1);
			}
		}
		return this;
	},

	fire: function(type, event) {
		var handlers = this._handlers && this._handlers[type];
		if (!handlers)
			return false;
		var args = [].slice.call(arguments, 1);
		Base.each(handlers, function(func) {
			if (func.apply(this, args) === false && event && event.stop)
				event.stop();
		}, this);
		return true;
	},

	responds: function(type) {
		return !!(this._handlers && this._handlers[type]);
	},

	statics: {
		inject: function() {
			for (var i = 0, l = arguments.length; i < l; i++) {
				var src = arguments[i],
					events = src._events;
				if (events) {
					var types = {};
					Base.each(events, function(entry, key) {
						var isString = typeof entry === 'string',
							name = isString ? entry : key,
							part = Base.capitalize(name),
							type = name.substring(2).toLowerCase();
						types[type] = isString ? {} : entry;
						name = '_' + name;
						src['get' + part] = function() {
							return this[name];
						};
						src['set' + part] = function(func) {
							if (func) {
								this.attach(type, func);
							} else if (this[name]) {
								this.detach(type, this[name]);
							}
							this[name] = func;
						};
					});
					src._eventTypes = types;
				}
				this.base(src);
			}
			return this;
		}
	}
};

var PaperScope = this.PaperScope = Base.extend({

	initialize: function(script) {
		paper = this;
		this.project = null;
		this.projects = [];
		this.tools = [];
		this.palettes = [];
		this._id = script && (script.getAttribute('id') || script.src)
				|| ('paperscope-' + (PaperScope._id++));
		if (script)
			script.setAttribute('id', this._id);
		PaperScope._scopes[this._id] = this;
		if (!this.support) {
			var ctx = CanvasProvider.getContext(1, 1);
			PaperScope.prototype.support = {
				nativeDash: 'setLineDash' in ctx || 'mozDash' in ctx
			};
			CanvasProvider.release(ctx);
		}
	},

	version: 0.3,

	getView: function() {
		return this.project && this.project.view;
	},

	getTool: function() {
		if (!this._tool)
			this._tool = new Tool();
		return this._tool;
	},

	evaluate: function(code) {
		var res = PaperScript.evaluate(code, this);
		View.updateFocus();
		return res;
	},

	install: function(scope) {
		var that = this;
		Base.each(['project', 'view', 'tool'], function(key) {
			Base.define(scope, key, {
				configurable: true,
				writable: true,
				get: function() {
					return that[key];
				}
			});
		});
		for (var key in this) {
			if (!/^(version|_id)/.test(key) && !(key in scope))
				scope[key] = this[key];
		}
	},

	setup: function(canvas) {
		paper = this;
		this.project = new Project(canvas);
	},

	clear: function() {
		for (var i = this.projects.length - 1; i >= 0; i--)
			this.projects[i].remove();
		for (var i = this.tools.length - 1; i >= 0; i--)
			this.tools[i].remove();
		for (var i = this.palettes.length - 1; i >= 0; i--)
			this.palettes[i].remove();
	},

	remove: function() {
		this.clear();
		delete PaperScope._scopes[this._id];
	},

	statics: {
		_scopes: {},
		_id: 0,

		get: function(id) {
			if (typeof id === 'object')
				id = id.getAttribute('id');
			return this._scopes[id] || null;
		}
	}
});

var PaperScopeItem = Base.extend(Callback, {

	initialize: function(activate) {
		this._scope = paper;
		this._index = this._scope[this._list].push(this) - 1;
		if (activate || !this._scope[this._reference])
			this.activate();
	},

	activate: function() {
		if (!this._scope)
			return false;
		var prev = this._scope[this._reference];
		if (prev && prev != this)
			prev.fire('deactivate');
		this._scope[this._reference] = this;
		this.fire('activate', prev);
		return true;
	},

	isActive: function() {
		return this._scope[this._reference] === this;
	},

	remove: function() {
		if (this._index == null)
			return false;
		Base.splice(this._scope[this._list], null, this._index, 1);
		if (this._scope[this._reference] == this)
			this._scope[this._reference] = null;
		this._scope = null;
		return true;
	}
});

var Point = this.Point = Base.extend({
	_readIndex: true,

	initialize: function(arg0, arg1) {
		var type = typeof arg0;
		if (type === 'number') {
			var hasY = typeof arg1 === 'number';
			this.x = arg0;
			this.y = hasY ? arg1 : arg0;
			if (this._read)
				this._read = hasY ? 2 : 1;
		} else if (type === 'undefined' || arg0 === null) {
			this.x = this.y = 0;
			if (this._read)
				this._read = arg0 === null ? 1 : 0;
		} else {
			if (Array.isArray(arg0)) {
				this.x = arg0[0];
				this.y = arg0.length > 1 ? arg0[1] : arg0[0];
			} else if (arg0.x != null) {
				this.x = arg0.x;
				this.y = arg0.y;
			} else if (arg0.width != null) {
				this.x = arg0.width;
				this.y = arg0.height;
			} else if (arg0.angle != null) {
				this.x = arg0.length;
				this.y = 0;
				this.setAngle(arg0.angle);
			} else {
				this.x = this.y = 0;
				if (this._read)
					this._read = 0;
			}
			if (this._read)
				this._read = 1;
		}
	},

	_serialize: function(options) {
		var format = Base.formatFloat;
		return [format(this.x, options.precision),
				format(this.y, options.precision)];
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
		var format = Base.formatFloat;
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
		return matrix ? matrix._transformPoint(this) : this;
	},

	getDistance: function(point, squared) {
		point = Point.read(arguments);
		var x = point.x - this.x,
			y = point.y - this.y,
			d = x * x + y * y;
		return squared ? d : Math.sqrt(d);
	},

	getLength: function() {
		var l = this.x * this.x + this.y * this.y;
		return arguments.length && arguments[0] ? l : Math.sqrt(l);
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
			if (Numerical.isZero(div)) {
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
		return Math.atan2(this.cross(point), this.dot(point)) * 180 / Math.PI;
	},

	rotate: function(angle, center) {
		if (angle === 0)
			return this.clone();
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
		return this.cross(point) < 0.00001;
	},

	isOrthogonal: function(point) {
		return this.dot(point) < 0.00001;
	},

	isZero: function() {
		return Numerical.isZero(this.x) && Numerical.isZero(this.y);
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
			var point = Base.create(Point);
			point.x = x;
			point.y = y;
			return point;
		},

		min: function(point1, point2) {
			var _point1 = Point.read(arguments);
				_point2 = Point.read(arguments);
			return Point.create(
				Math.min(_point1.x, _point2.x),
				Math.min(_point1.y, _point2.y)
			);
		},

		max: function(point1, point2) {
			var _point1 = Point.read(arguments);
				_point2 = Point.read(arguments);
			return Point.create(
				Math.max(_point1.x, _point2.x),
				Math.max(_point1.y, _point2.y)
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
		create: function(owner, setter, x, y, dontLink) {
			if (dontLink)
				return Point.create(x, y);
			var point = Base.create(LinkedPoint);
			point._x = x;
			point._y = y;
			point._owner = owner;
			point._setter = setter;
			return point;
		}
	}
});

var Size = this.Size = Base.extend({
	_readIndex: true,

	initialize: function(arg0, arg1) {
		var type = typeof arg0;
		if (type === 'number') {
			var hasHeight = typeof arg1 === 'number';
			this.width = arg0;
			this.height = hasHeight ? arg1 : arg0;
			if (this._read)
				this._read = hasHeight ? 2 : 1;
		} else if (type === 'undefined' || arg0 === null) {
			this.width = this.height = 0;
			if (this._read)
				this._read = arg0 === null ? 1 : 0;
		} else {
			if (Array.isArray(arg0)) {
				this.width = arg0[0];
				this.height = arg0.length > 1 ? arg0[1] : arg0[0];
			} else if (arg0.width != null) {
				this.width = arg0.width;
				this.height = arg0.height;
			} else if (arg0.x != null) {
				this.width = arg0.x;
				this.height = arg0.y;
			} else {
				this.width = this.height = 0;
				if (this._read)
					this._read = 0;
			}
			if (this._read)
				this._read = 1;
		}
	},

	toString: function() {
		var format = Base.formatFloat;
		return '{ width: ' + format(this.width)
				+ ', height: ' + format(this.height) + ' }';
	},

	set: function(width, height) {
		this.width = width;
		this.height = height;
		return this;
	},

	clone: function() {
		return Size.create(this.width, this.height);
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
		return Numerical.isZero(this.width) && Numerical.isZero(this.height);
	},

	isNaN: function() {
		return isNaN(this.width) || isNaN(this.height);
	},

	statics: {
		create: function(width, height) {
			return Base.create(Size).set(width, height);
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
		create: function(owner, setter, width, height, dontLink) {
			if (dontLink)
				return Size.create(width, height);
			var size = Base.create(LinkedSize);
			size._width = width;
			size._height = height;
			size._owner = owner;
			size._setter = setter;
			return size;
		}
	}
});

var Rectangle = this.Rectangle = Base.extend({
	_readIndex: true,

	initialize: function(arg0, arg1, arg2, arg3) {
		var type = typeof arg0;
		if (type === 'number') {
			this.x = arg0;
			this.y = arg1;
			this.width = arg2;
			this.height = arg3;
			if (this._read)
				this._read = 4;
		} else if (type === 'undefined' || arg0 === null) {
			this.x = this.y = this.width = this.height = 0;
			if (this._read)
				this._read = arg0 === null ? 1 : 0;
		} else {
			var args = arguments,
				center = null;
			if (arguments.length == 1) {
				args = null;
				if (Array.isArray(arg0)) {
					this.x = arg0[0];
					this.y = arg0[1];
					this.width = arg0[2];
					this.height = arg0[3];
				} else {
					if (arg0.size) {
						args = [Point.read([arg0.point]), Size.read([arg0.size])];
						if (arg0.center)
							center = Point.read([arg0.center]);
					} else {
						this.x = arg0.x || 0;
						this.y = arg0.y || 0;
						this.width = arg0.width || 0;
						this.height = arg0.height || 0;
					}
				}
				if (this._read)
					this._read = 1;
			}
			if (args && args.length > 1) {
				var point = Point.read(args),
					next = Base.peek(args);
				this.x = point.x;
				this.y = point.y;
				if (next && next.x !== undefined) {
					var point2 = Point.read(args);
					this.width = point2.x - point.x;
					this.height = point2.y - point.y;
					if (this.width < 0) {
						this.x = point2.x;
						this.width = -this.width;
					}
					if (this.height < 0) {
						this.y = point2.y;
						this.height = -this.height;
					}
				} else {
					var size = Size.read(args);
					this.width = size.width;
					this.height = size.height;
				}
				if (this._read)
					this._read = arguments._index;
			}
			if (center)
				this.setCenter(center);
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
		return LinkedPoint.create(this, 'setPoint', this.x, this.y, arguments[0]);
	},

	setPoint: function(point) {
		point = Point.read(arguments);
		this.x = point.x;
		this.y = point.y;
		return this;
	},

	getSize: function() {
		return LinkedSize.create(this, 'setSize', this.width, this.height,
				arguments[0]);
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
				this.getCenterX(), this.getCenterY(), arguments[0]);
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
		var format = Base.formatFloat;
		return '{ x: ' + format(this.x)
				+ ', y: ' + format(this.y)
				+ ', width: ' + format(this.width)
				+ ', height: ' + format(this.height)
				+ ' }';
	},

	contains: function(arg) {
		return arg && arg.width !== undefined
				|| (Array.isArray(arg) ? arg : arguments).length == 4
				? this._containsRectangle(Rectangle.read(arguments))
				: this._containsPoint(Point.read(arguments));
	},

	_containsPoint: function(point) {
		var x = point.x,
			y = point.y;
		return x >= this.x && y >= this.y
				&& x <= this.x + this.width
				&& y <= this.y + this.height;
	},

	_containsRectangle: function(rect) {
		var x = rect.x,
			y = rect.y;
		return x >= this.x && y >= this.y
				&& x + rect.width <= this.x + this.width
				&& y + rect.height <= this.y + this.height;
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

	expand: function(hor, ver) {
		if (ver === undefined)
			ver = hor;
		return Rectangle.create(this.x - hor / 2, this.y - ver / 2,
				this.width + hor, this.height + ver);
	},

	scale: function(hor, ver) {
		return this.expand(this.width * hor - this.width,
				this.height * (ver === undefined ? hor : ver) - this.height);
	},

	statics: {
		create: function(x, y, width, height) {
			return Base.create(Rectangle).set(x, y, width, height);
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
						this[getX](), this[getY](), arguments[0]);
			};
			this[set] = function(point) {
				point = Point.read(arguments);
				return this[setX](point.x)[setY](point.y);
			};
		}, {});
});

var LinkedRectangle = Rectangle.extend({
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
			var rect = Base.create(LinkedRectangle).set(x, y, width, height, true);
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
		}, {})
	);
});

var Matrix = this.Matrix = Base.extend({
	_type: 'matrix',

	initialize: function(arg) {
		var count = arguments.length,
			ok = true;
		if (count == 6) {
			this.set.apply(this, arguments);
		} else if (count == 1) {
			if (arg instanceof Matrix) {
				this.set(arg._a, arg._c, arg._b, arg._d, arg._tx, arg._ty);
			} else if (Array.isArray(arg)) {
				this.set.apply(this, arg);
			} else {
				ok = false;
			}
		} else if (count == 0) {
			this.reset();
		} else {
			ok = false;
		}
		if (!ok)
			throw new Error('Unsupported matrix parameters');
	},

	_serialize: function(options) {
		return Base.serialize(this.getValues(), options);
	},

	clone: function() {
		return Matrix.create(this._a, this._c, this._b, this._d,
				this._tx, this._ty);
	},

	set: function(a, c, b, d, tx, ty) {
		this._a = a;
		this._c = c;
		this._b = b;
		this._d = d;
		this._tx = tx;
		this._ty = ty;
		return this;
	},

	reset: function() {
		this._a = this._d = 1;
		this._c = this._b = this._tx = this._ty = 0;
		return this;
	},

	scale: function(scale, center) {
		var _scale = Point.read(arguments),
			_center = Point.read(arguments, 0, 0, false, true); 
		if (_center)
			this.translate(_center);
		this._a *= _scale.x;
		this._c *= _scale.x;
		this._b *= _scale.y;
		this._d *= _scale.y;
		if (_center)
			this.translate(_center.negate());
		return this;
	},

	translate: function(point) {
		point = Point.read(arguments);
		var x = point.x,
			y = point.y;
		this._tx += x * this._a + y * this._b;
		this._ty += x * this._c + y * this._d;
		return this;
	},

	rotate: function(angle, center) {
		center = Point.read(arguments, 1);
		angle = angle * Math.PI / 180;
		var x = center.x,
			y = center.y,
			cos = Math.cos(angle),
			sin = Math.sin(angle),
			tx = x - x * cos + y * sin,
			ty = y - x * sin - y * cos,
			a = this._a,
			b = this._b,
			c = this._c,
			d = this._d;
		this._a = cos * a + sin * b;
		this._b = -sin * a + cos * b;
		this._c = cos * c + sin * d;
		this._d = -sin * c + cos * d;
		this._tx += tx * a + ty * b;
		this._ty += tx * c + ty * d;
		return this;
	},

	shear: function(point, center) {
		var _point = Point.read(arguments),
			_center = Point.read(arguments);
		if (_center)
			this.translate(_center);
		var a = this._a,
			c = this._c;
		this._a += _point.y * this._b;
		this._c += _point.y * this._d;
		this._b += _point.x * a;
		this._d += _point.x * c;
		if (_center)
			this.translate(_center.negate());
		return this;
	},

	toString: function() {
		var format = Base.formatFloat;
		return '[[' + [format(this._a), format(this._b),
					format(this._tx)].join(', ') + '], ['
				+ [format(this._c), format(this._d),
					format(this._ty)].join(', ') + ']]';
	},

	equals: function(mx) {
		return mx && this._a == mx._a && this._b == mx._b && this._c == mx._c
				&& this._d == mx._d && this._tx == mx._tx && this._ty == mx._ty;
	},

	isIdentity: function() {
		return this._a == 1 && this._c == 0 && this._b == 0 && this._d == 1
				&& this._tx == 0 && this._ty == 0;
	},

	isInvertible: function() {
		return !!this._getDeterminant();
	},

	isSingular: function() {
		return !this._getDeterminant();
	},

	concatenate: function(mx) {
		var a = this._a,
			b = this._b,
			c = this._c,
			d = this._d;
		this._a = mx._a * a + mx._c * b;
		this._b = mx._b * a + mx._d * b;
		this._c = mx._a * c + mx._c * d;
		this._d = mx._b * c + mx._d * d;
		this._tx += mx._tx * a + mx._ty * b;
		this._ty += mx._tx * c + mx._ty * d;
		return this;
	},

	preConcatenate: function(mx) {
		var a = this._a,
			b = this._b,
			c = this._c,
			d = this._d,
			tx = this._tx,
			ty = this._ty;
		this._a = mx._a * a + mx._b * c;
		this._b = mx._a * b + mx._b * d;
		this._c = mx._c * a + mx._d * c;
		this._d = mx._c * b + mx._d * d;
		this._tx = mx._a * tx + mx._b * ty + mx._tx;
		this._ty = mx._c * tx + mx._d * ty + mx._ty;
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
			dest = Base.create(Point);
		return dest.set(
			x * this._a + y * this._b + this._tx,
			x * this._c + y * this._d + this._ty,
			dontNotify
		);
	},

	_transformCoordinates: function(src, srcOff, dst, dstOff, numPts) {
		var i = srcOff, j = dstOff,
			srcEnd = srcOff + 2 * numPts;
		while (i < srcEnd) {
			var x = src[i++],
				y = src[i++];
			dst[j++] = x * this._a + y * this._b + this._tx;
			dst[j++] = x * this._c + y * this._d + this._ty;
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

	_transformBounds: function(bounds, dest, dontNotify) {
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
		if (!dest)
			dest = Base.create(Rectangle);
		return dest.set(min[0], min[1], max[0] - min[0], max[1] - min[1],
				dontNotify);
	},

	inverseTransform: function(point) {
		return this._inverseTransform(Point.read(arguments));
	},

	_getDeterminant: function() {
		var det = this._a * this._d - this._b * this._c;
		return isFinite(det) && !Numerical.isZero(det)
				&& isFinite(this._tx) && isFinite(this._ty)
				? det : null;
	},

	_inverseTransform: function(point, dest, dontNotify) {
		var det = this._getDeterminant();
		if (!det)
			return null;
		var x = point.x - this._tx,
			y = point.y - this._ty;
		if (!dest)
			dest = Base.create(Point);
		return dest.set(
			(x * this._d - y * this._b) / det,
			(y * this._a - x * this._c) / det,
			dontNotify
		);
	},

	decompose: function() {
		var a = this._a, b = this._b, c = this._c, d = this._d;
		if (Numerical.isZero(a * d - b * c))
			return null;

		var scaleX = Math.sqrt(a * a + b * b);
		a /= scaleX;
		b /= scaleX;

		var shear = a * c + b * d;
		c -= a * shear;
		d -= b * shear;

		var scaleY = Math.sqrt(c * c + d * d);
		c /= scaleY;
		d /= scaleY;
		shear /= scaleY;

		if (a * d < b * c) {
			a = -a;
			b = -b;
			shear = -shear;
			scaleX = -scaleX;
		}

		return {
			translation: this.getTranslation(),
			scaling: Point.create(scaleX, scaleY),
			rotation: -Math.atan2(b, a) * 180 / Math.PI,
			shearing: shear
		};
	},

	getValues: function() {
		return [ this._a, this._c, this._b, this._d, this._tx, this._ty ];
	},

	getTranslation: function() {
		return Point.create(this._tx, this._ty);
	},

	getScaling: function() {
		return (this.decompose() || {}).scaling;
	},

	getRotation: function() {
		return (this.decompose() || {}).rotation;
	},

	inverted: function() {
		var det = this._getDeterminant();
		return det && Matrix.create(
				this._d / det,
				-this._c / det,
				-this._b / det,
				this._a / det,
				(this._b * this._ty - this._d * this._tx) / det,
				(this._c * this._tx - this._a * this._ty) / det);
	},

	shiftless: function() {
		return Matrix.create(this._a, this._c, this._b, this._d, 0, 0);
	},

	applyToContext: function(ctx, reset) {
		ctx[reset ? 'setTransform' : 'transform'](
				this._a, this._c, this._b, this._d, this._tx, this._ty);
		return this;
	},

	statics: {
		create: function(a, c, b, d, tx, ty) {
			return Base.create(Matrix).set(a, c, b, d, tx, ty);
		}
	}
}, new function() {
	return Base.each({
		scaleX: '_a',
		scaleY: '_d',
		translateX: '_tx',
		translateY: '_ty',
		shearX: '_b',
		shearY: '_c'
	}, function(prop, name) {
		name = Base.capitalize(name);
		this['get' + name] = function() {
			return this[prop];
		};
		this['set' + name] = function(value) {
			this[prop] = value;
		};
	}, {});
});

var Line = this.Line = Base.extend({
	initialize: function(point1, point2, infinite) {
		var _point1 = Point.read(arguments),
			_point2 = Point.read(arguments),
			_infinite = Base.read(arguments);
		if (_infinite !== undefined) {
			this.point = _point1;
			this.vector = _point2.subtract(_point1);
			this.infinite = _infinite;
		} else {
			this.point = _point1;
			this.vector = _point2;
			this.infinite = true;
		}
	},

	intersect: function(line) {
		var cross = this.vector.cross(line.vector);
		if (Numerical.isZero(cross))
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
		if (ccw === 0) {
			ccw = v2.dot(v1);
			if (ccw > 0) {
				ccw = v2.subtract(v1).dot(v1);
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

var Project = this.Project = PaperScopeItem.extend({
	_list: 'projects',
	_reference: 'project',

	initialize: function(view) {
		this.base(true);
		this.layers = [];
		this.symbols = [];
		this.activeLayer = new Layer();
		if (view)
			this.view = view instanceof View ? view : View.create(view);
		this._currentStyle = new PathStyle();
		this._selectedItems = {};
		this._selectedItemCount = 0;
		this._drawCount = 0;
	},

	_serialize: function(options, dictionary) {
		return Base.serialize(this.layers, options, false, dictionary);
	},

	_needsRedraw: function() {
		if (this.view)
			this.view._redrawNeeded = true;
	},

	remove: function() {
		if (!this.base())
			return false;
		if (this.view)
			this.view.remove();
		return true;
	},

	getCurrentStyle: function() {
		return this._currentStyle;
	},

	setCurrentStyle: function(style) {
		this._currentStyle.initialize(style);
	},

	getIndex: function() {
		return this._index;
	},

	getSelectedItems: function() {
		var items = [];
		for (var id in this._selectedItems) {
			var item = this._selectedItems[id];
			if (item._drawCount === this._drawCount)
				items.push(item);
		}
		return items;
	},

	_updateSelection: function(item) {
		if (item._selected) {
			this._selectedItemCount++;
			this._selectedItems[item._id] = item;
			if (item.isInserted())
				item._drawCount = this._drawCount;
		} else {
			this._selectedItemCount--;
			delete this._selectedItems[item._id];
		}
	},

	selectAll: function() {
		for (var i = 0, l = this.layers.length; i < l; i++)
			this.layers[i].setSelected(true);
	},

	deselectAll: function() {
		for (var i in this._selectedItems)
			this._selectedItems[i].item.setSelected(false);
	},

	hitTest: function(point, options) {
		point = Point.read(arguments);
		options = HitResult.getOptions(Base.read(arguments));
		for (var i = this.layers.length - 1; i >= 0; i--) {
			var res = this.layers[i].hitTest(point, options);
			if (res) return res;
		}
		return null;
	},

	draw: function(ctx, matrix) {
		var matrices = {};
		function getGlobalMatrix(item, mx, cached) {
			var cache = cached && matrices[item._id];
			if (cache)
				return cache.clone();
			if (item._parent)
				mx = getGlobalMatrix(item._parent, mx, true);
			if (!item._matrix.isIdentity())
				mx.concatenate(item._matrix);
			if (cached)
				matrices[item._id] = mx.clone();
			return mx;
		}

		this._drawCount++;
		ctx.save();
		if (!matrix.isIdentity())
			matrix.applyToContext(ctx);
		var param = { offset: new Point(0, 0) };
		for (var i = 0, l = this.layers.length; i < l; i++)
			Item.draw(this.layers[i], ctx, param);
		ctx.restore();

		if (this._selectedItemCount > 0) {
			ctx.save();
			ctx.strokeWidth = 1;
			ctx.strokeStyle = ctx.fillStyle = '#009dec';
			for (var id in this._selectedItems) {
				var item = this._selectedItems[id];
				if (item._drawCount === this._drawCount)
					item.drawSelected(ctx, getGlobalMatrix(item, matrix.clone()));
			}
			ctx.restore();
		}
	}
});

var Symbol = this.Symbol = Base.extend({
	_type: 'symbol',

	initialize: function(item) {
		this._id = ++Base._uid;
		this.project = paper.project;
		this.project.symbols.push(this);
		this.setDefinition(item);
		this._instances = {};
	},

	_serialize: function(options, dictionary) {
		return dictionary.add(this, function() {
			return Base.serialize([this._type, this._definition],
					options, false, dictionary);
		});
	},

	_changed: function(flags) {
		Base.each(this._instances, function(item) {
			item._changed(flags);
		});
	},

	getDefinition: function() {
		return this._definition;
	},

	setDefinition: function(item) {
		if (item._parentSymbol)
			item = item.clone();
		if (this._definition)
			delete this._definition._parentSymbol;
		this._definition = item;
		item.remove();
		item.setSelected(false);
		item.setPosition(new Point());
		item._parentSymbol = this;
		this._changed(5);
	},

	place: function(position) {
		return new PlacedSymbol(this, position);
	},

	clone: function() {
		return new Symbol(this._definition.clone());
	}
});

var Item = this.Item = Base.extend(Callback, {
	statics: {
		extend: function(src) {
			if (src._serializeFields)
				src._serializeFields = Base.merge(
						this.prototype._serializeFields, src._serializeFields);
			return this.base.apply(this, arguments);
		}
	}
}, {
	_serializeFields: {
		name: null,
		children: [],
		matrix: new Matrix(),
		locked: false,
		visible: true,
		blendMode: 'normal',
		opacity: 1,
		guide: false
	},

	initialize: function(point) {
		this._id = ++Base._uid;
		if (!this._project)
			paper.project.activeLayer.addChild(this);
		if (!this._style)
			this._style = PathStyle.create(this);
		this.setStyle(this._project.getCurrentStyle());
		this._matrix = new Matrix();
		if (point)
			this._matrix.translate(point);
	},

	_events: new function() {

		var mouseFlags = {
			mousedown: {
				mousedown: 1,
				mousedrag: 1,
				click: 1,
				doubleclick: 1
			},
			mouseup: {
				mouseup: 1,
				mousedrag: 1,
				click: 1,
				doubleclick: 1
			},
			mousemove: {
				mousedrag: 1,
				mousemove: 1,
				mouseenter: 1,
				mouseleave: 1
			}
		};

		var mouseEvent = {
			install: function(type) {
				var counters = this._project.view._eventCounters;
				if (counters) {
					for (var key in mouseFlags) {
						counters[key] = (counters[key] || 0)
								+ (mouseFlags[key][type] || 0);
					}
				}
			},
			uninstall: function(type) {
				var counters = this._project.view._eventCounters;
				if (counters) {
					for (var key in mouseFlags)
						counters[key] -= mouseFlags[key][type] || 0;
				}
			}
		};

		return Base.each(['onMouseDown', 'onMouseUp', 'onMouseDrag', 'onClick',
			'onDoubleClick', 'onMouseMove', 'onMouseEnter', 'onMouseLeave'],
			function(name) {
				this[name] = mouseEvent;
			}, {
				onFrame: {
					install: function() {
						this._project.view._animateItem(this, true);
					},
					uninstall: function() {
						this._project.view._animateItem(this, false);
					}
				},

				onLoad: {}
			}
		);
	},

	_setProperties: function(props) {
		if (Base.isPlainObject(props))
			return this.set(props);
	},

	set: function(props) {
		if (props) {
			for (var key in props)
				if (props.hasOwnProperty(key))
					this[key] = props[key];
		}
		return this;
	},

	_serialize: function(options, dictionary) {
		var props = {},
			that = this;

		function serialize(fields, compact) {
			for (var key in fields) {
				var value = that[key];
				if (!Base.equals(value, fields[key]))
					props[key] = Base.serialize(value, options, compact,
							dictionary);
			}
		}

		serialize(this._serializeFields, true);
		serialize(this._style._defaults, false);
		return [ this._type, props ];
	},

	_changed: function(flags) {
		if (flags & 4) {
			delete this._bounds;
			delete this._position;
		}
		if (this._parent
				&& (flags & (4 | 8))) {
			this._parent._clearBoundsCache();
		}
		if (flags & 2) {
			this._clearBoundsCache();
		}
		if (flags & 1) {
			this._project._needsRedraw();
		}
		if (this._parentSymbol)
			this._parentSymbol._changed(flags);
		if (this._project._changes) {
			var entry = this._project._changesById[this._id];
			if (entry) {
				entry.flags |= flags;
			} else {
				entry = { item: this, flags: flags };
				this._project._changesById[this._id] = entry;
				this._project._changes.push(entry);
			}
		}
	},

	getId: function() {
		return this._id;
	},

	getType: function() {
		return this._type;
	},

	getName: function() {
		return this._name;
	},

	setName: function(name, unique) {

		if (this._name)
			this._removeFromNamed();
		if (name && this._parent) {
			var children = this._parent._children,
				namedChildren = this._parent._namedChildren,
				orig = name,
				i = 1;
			while (unique && children[name])
				name = orig + ' ' + (i++);
			(namedChildren[name] = namedChildren[name] || []).push(this);
			children[name] = this;
		}
		this._name = name || undefined;
		this._changed(32);
	}

}, Base.each(['locked', 'visible', 'blendMode', 'opacity', 'guide'],
	function(name) {
		var part = Base.capitalize(name),
			name = '_' + name;
		this['get' + part] = function() {
			return this[name];
		};
		this['set' + part] = function(value) {
			if (value != this[name]) {
				this[name] = value;
				this._changed(name === '_locked'
						? 32 : 33);
			}
		};
}, {}), {

	_locked: false,

	_visible: true,

	_blendMode: 'normal',

	_opacity: 1,

	_guide: false,

	applyMatrix: false,

	isSelected: function() {
		if (this._children) {
			for (var i = 0, l = this._children.length; i < l; i++)
				if (this._children[i].isSelected())
					return true;
		}
		return this._selected;
	},

	setSelected: function(selected ) {
		if (this._children && !arguments[1]) {
			for (var i = 0, l = this._children.length; i < l; i++)
				this._children[i].setSelected(selected);
		} else if ((selected = !!selected) != this._selected) {
			this._selected = selected;
			this._project._updateSelection(this);
			this._changed(33);
		}
	},

	_selected: false,

	isFullySelected: function() {
		if (this._children && this._selected) {
			for (var i = 0, l = this._children.length; i < l; i++)
				if (!this._children[i].isFullySelected())
					return false;
			return true;
		}
		return this._selected;
	},

	setFullySelected: function(selected) {
		if (this._children) {
			for (var i = 0, l = this._children.length; i < l; i++)
				this._children[i].setFullySelected(selected);
		}
		this.setSelected(selected, true);
	},

	isClipMask: function() {
		return this._clipMask;
	},

	setClipMask: function(clipMask) {
		if (this._clipMask != (clipMask = !!clipMask)) {
			this._clipMask = clipMask;
			if (clipMask) {
				this.setFillColor(null);
				this.setStrokeColor(null);
			}
			this._changed(33);
			if (this._parent)
				this._parent._changed(256);
		}
	},

	_clipMask: false,

	getPosition: function() {
		var pos = this._position
				|| (this._position = this.getBounds().getCenter(true));
		return arguments[0] ? pos
				: LinkedPoint.create(this, 'setPosition', pos.x, pos.y);
	},

	setPosition: function(point) {
		this.translate(Point.read(arguments).subtract(this.getPosition(true)));
	},

	getMatrix: function() {
		return this._matrix;
	},

	setMatrix: function(matrix) {
		this._matrix.initialize(matrix);
		this._changed(5);
	},

	isEmpty: function() {
		return true;
	}
}, Base.each(['getBounds', 'getStrokeBounds', 'getHandleBounds', 'getRoughBounds'],
	function(name) {
		this[name] = function() {
			var getter = this._boundsGetter,
				bounds = this._getCachedBounds(typeof getter == 'string'
						? getter : getter && getter[name] || name, arguments[0]);
			return name == 'bounds' ? LinkedRectangle.create(this, 'setBounds',
					bounds.x, bounds.y, bounds.width, bounds.height) : bounds;
		};
	},
{
	_getCachedBounds: function(getter, matrix, cacheItem) {
		var cache = (!matrix || matrix.equals(this._matrix)) && getter;
		if (cacheItem && this._parent) {
			var id = cacheItem._id,
				ref = this._parent._boundsCache
					= this._parent._boundsCache || {
				ids: {},
				list: []
			};
			if (!ref.ids[id]) {
				ref.list.push(cacheItem);
				ref.ids[id] = cacheItem;
			}
		}
		if (cache && this._bounds && this._bounds[cache])
			return this._bounds[cache];
		var identity = this._matrix.isIdentity();
		matrix = !matrix || matrix.isIdentity()
				? identity ? null : this._matrix
				: identity ? matrix : matrix.clone().concatenate(this._matrix);
		var bounds = this._getBounds(getter, matrix, cache ? this : cacheItem);
		if (cache) {
			if (!this._bounds)
				this._bounds = {};
			this._bounds[cache] = bounds.clone();
		}
		return bounds;
	},

	_clearBoundsCache: function() {
		if (this._boundsCache) {
			for (var i = 0, list = this._boundsCache.list, l = list.length;
					i < l; i++) {
				var item = list[i];
				delete item._bounds;
				if (item != this && item._boundsCache)
					item._clearBoundsCache();
			}
			delete this._boundsCache;
		}
	},

	_getBounds: function(getter, matrix, cacheItem) {
		var children = this._children;
		if (!children || children.length == 0)
			return new Rectangle();
		var x1 = Infinity,
			x2 = -x1,
			y1 = x1,
			y2 = x2;
		for (var i = 0, l = children.length; i < l; i++) {
			var child = children[i];
			if (child._visible && !child.isEmpty()) {
				var rect = child._getCachedBounds(getter, matrix, cacheItem);
				x1 = Math.min(rect.x, x1);
				y1 = Math.min(rect.y, y1);
				x2 = Math.max(rect.x + rect.width, x2);
				y2 = Math.max(rect.y + rect.height, y2);
			}
		}
		return Rectangle.create(x1, y1, x2 - x1, y2 - y1);
	},

	setBounds: function(rect) {
		rect = Rectangle.read(arguments);
		var bounds = this.getBounds(),
			matrix = new Matrix(),
			center = rect.getCenter();
		matrix.translate(center);
		if (rect.width != bounds.width || rect.height != bounds.height) {
			matrix.scale(
					bounds.width != 0 ? rect.width / bounds.width : 1,
					bounds.height != 0 ? rect.height / bounds.height : 1);
		}
		center = bounds.getCenter();
		matrix.translate(-center.x, -center.y);
		this.transform(matrix);
	}

}), {
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

	getLayer: function() {
		var parent = this;
		while (parent = parent._parent) {
			if (parent instanceof Layer)
				return parent;
		}
		return null;
	},

	getParent: function() {
		return this._parent;
	},

	getChildren: function() {
		return this._children;
	},

	setChildren: function(items) {
		this.removeChildren();
		this.addChildren(items);
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

	isInserted: function() {
		return this._parent ? this._parent.isInserted() : false;
	},

	clone: function() {
		return this._clone(new this.constructor());
	},

	_clone: function(copy) {
		copy.setStyle(this._style);
		if (this._children) {
			for (var i = 0, l = this._children.length; i < l; i++)
				copy.addChild(this._children[i].clone(), true);
		}
		var keys = ['_locked', '_visible', '_blendMode', '_opacity',
				'_clipMask', '_guide', 'applyMatrix'];
		for (var i = 0, l = keys.length; i < l; i++) {
			var key = keys[i];
			if (this.hasOwnProperty(key))
				copy[key] = this[key];
		}
		copy._matrix.initialize(this._matrix);
		copy.setSelected(this._selected);
		if (this._name)
			copy.setName(this._name, true);
		return copy;
	},

	copyTo: function(itemOrProject) {
		var copy = this.clone();
		if (itemOrProject.layers) {
			itemOrProject.activeLayer.addChild(copy);
		} else {
			itemOrProject.addChild(copy);
		}
		return copy;
	},

	rasterize: function(resolution) {
		var bounds = this.getStrokeBounds(),
			scale = (resolution || 72) / 72,
			canvas = CanvasProvider.getCanvas(bounds.getSize().multiply(scale)),
			ctx = canvas.getContext('2d');
		new Matrix().scale(scale).translate(-bounds.x, -bounds.y)
			.applyToContext(ctx);
		Item.draw(this, ctx, {});
		var raster = new Raster(canvas);
		raster.setBounds(bounds);
		return raster;
	},

	hitTest: function(point, options) {
		function checkBounds(type, part) {
			var pt = bounds['get' + part]();
			if (point.getDistance(pt) < options.tolerance)
				return new HitResult(type, that,
						{ name: Base.hyphenate(part), point: pt });
		}

		point = Point.read(arguments);
		options = HitResult.getOptions(Base.read(arguments));
		if (!this._children && !this.getRoughBounds()
				.expand(options.tolerance)._containsPoint(point))
			return null;
		point = this._matrix._inverseTransform(point);
		if ((options.center || options.bounds) &&
				!(this instanceof Layer && !this._parent)) {
			var bounds = this.getBounds(),
				that = this,
				points = ['TopLeft', 'TopRight', 'BottomLeft', 'BottomRight',
				'LeftCenter', 'TopCenter', 'RightCenter', 'BottomCenter'],
				res;
			if (options.center && (res = checkBounds('center', 'Center')))
				return res;
			if (options.bounds) {
				for (var i = 0; i < 8; i++)
					if (res = checkBounds('bounds', points[i]))
						return res;
			}
		}

		return this._children || !(options.guides && !this._guide
				|| options.selected && !this._selected)
					? this._hitTest(point, options) : null;
	},

	_hitTest: function(point, options) {
		if (this._children) {
			for (var i = this._children.length - 1; i >= 0; i--) {
				var res = this._children[i].hitTest(point, options);
				if (res) return res;
			}
		}
	},

	addChild: function(item, _cloning) {
		return this.insertChild(undefined, item, _cloning);
	},

	insertChild: function(index, item, _cloning) {
		if (this._children) {
			item._remove(true);
			Base.splice(this._children, [item], index, 0);
			item._parent = this;
			item._setProject(this._project);
			if (item._name)
				item.setName(item._name);
			this._changed(3);
			return item;
		}
		return null;
	},

	addChildren: function(items, _cloning) {
		return this.insertChildren(this._children.length, items, _cloning);
	},

	insertChildren: function(index, items, _cloning) {
		items = items && Array.prototype.slice.apply(items);
		var i = index;
		for (var j = 0, l = items && items.length; j < l; j++) {
			if (this.insertChild(i, items[j], _cloning))
				i++;
		}
		return i != index;
	},

	insertAbove: function(item, _cloning) {
		var index = item._index;
		if (item._parent == this._parent && index < this._index)
			 index++;
		return item._parent.insertChild(index, this, _cloning);
	},

	insertBelow: function(item, _cloning) {
		var index = item._index;
		if (item._parent == this._parent && index > this._index)
			 index--;
		return item._parent.insertChild(index, this, _cloning);
	},

	sendToBack: function() {
		return this._parent.insertChild(0, this);
	},

	bringToFront: function() {
		return this._parent.addChild(this);
	},

	appendTop: function(item) {
		return this.addChild(item);
	},

	appendBottom: function(item) {
		return this.insertChild(0, item);
	},

	moveAbove: function(item) {
		return this.insertAbove(item);
	},

	moveBelow: function(item) {
		return this.insertBelow(item);
	},

	_removeFromNamed: function() {
		var children = this._parent._children,
			namedChildren = this._parent._namedChildren,
			name = this._name,
			namedArray = namedChildren[name],
			index = namedArray ? namedArray.indexOf(this) : -1;
		if (index == -1)
			return;
		if (children[name] == this)
			delete children[name];
		namedArray.splice(index, 1);
		if (namedArray.length) {
			children[name] = namedArray[namedArray.length - 1];
		} else {
			delete namedChildren[name];
		}
	},

	_remove: function(notify) {
		if (this._parent) {
			if (this._name)
				this._removeFromNamed();
			if (this._index != null)
				Base.splice(this._parent._children, null, this._index, 1);
			if (notify)
				this._parent._changed(3);
			this._parent = null;
			return true;
		}
		return false;
	},

	remove: function() {
		return this._remove(true);
	},

	removeChildren: function(from, to) {
		if (!this._children)
			return null;
		from = from || 0;
		to = Base.pick(to, this._children.length);
		var removed = Base.splice(this._children, null, from, to - from);
		for (var i = removed.length - 1; i >= 0; i--)
			removed[i]._remove(false);
		if (removed.length > 0)
			this._changed(3);
		return removed;
	},

	reverseChildren: function() {
		if (this._children) {
			this._children.reverse();
			for (var i = 0, l = this._children.length; i < l; i++)
				this._children[i]._index = i;
			this._changed(3);
		}
	},

	isEditable: function() {
		var item = this;
		while (item) {
			if (!item._visible || item._locked)
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
			} while (item = item._parent);
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

	hasChildren: function() {
		return this._children && this._children.length > 0;
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

	scale: function(hor, ver , center) {
		if (arguments.length < 2 || typeof ver === 'object') {
			center = ver;
			ver = hor;
		}
		return this.transform(new Matrix().scale(hor, ver,
				center || this.getPosition(true)));
	},

	translate: function(delta) {
		var mx = new Matrix();
		return this.transform(mx.translate.apply(mx, arguments));
	},

	rotate: function(angle, center) {
		return this.transform(new Matrix().rotate(angle,
				center || this.getPosition(true)));
	},

	shear: function(hor, ver, center) {
		if (arguments.length < 2 || typeof ver === 'object') {
			center = ver;
			ver = hor;
		}
		return this.transform(new Matrix().shear(hor, ver,
				center || this.getPosition(true)));
	},

	transform: function(matrix ) {
		var bounds = this._bounds,
			position = this._position;
		this._matrix.preConcatenate(matrix);
		if (this._transform)
			this._transform(matrix);
		if ((this.applyMatrix || arguments[1])
				&& this._applyMatrix(this._matrix))
			this._matrix.reset();
		this._changed(5);
		if (bounds && matrix.getRotation() % 90 === 0) {
			for (var key in bounds) {
				var rect = bounds[key];
				matrix._transformBounds(rect, rect);
			}
			var getter = this._boundsGetter,
				rect = bounds[getter && getter.getBounds || getter || 'getBounds'];
			if (rect)
				this._position = rect.getCenter(true);
			this._bounds = bounds;
		} else if (position) {
			this._position = matrix._transformPoint(position, position);
		}
		return this;
	},

	_applyMatrix: function(matrix) {
		if (this._children) {
			for (var i = 0, l = this._children.length; i < l; i++)
				this._children[i].transform(matrix, true);
			return true;
		}
	},

	fitBounds: function(rectangle, fill) {
		rectangle = Rectangle.read(arguments);
		var bounds = this.getBounds(),
			itemRatio = bounds.height / bounds.width,
			rectRatio = rectangle.height / rectangle.width,
			scale = (fill ? itemRatio > rectRatio : itemRatio < rectRatio)
					? rectangle.width / bounds.width
					: rectangle.height / bounds.height,
			newBounds = new Rectangle(new Point(),
					Size.create(bounds.width * scale, bounds.height * scale));
		newBounds.setCenter(rectangle.getCenter());
		this.setBounds(newBounds);
	},

	toString: function() {
		return (this.constructor._name || 'Item') + (this._name
				? " '" + this._name + "'"
				: ' @' + this._id);
	},

	_setStyles: function(ctx) {
		var style = this._style,
			width = style._strokeWidth,
			join = style._strokeJoin,
			cap = style._strokeCap,
			limit = style._miterLimit,
			fillColor = style._fillColor,
			strokeColor = style._strokeColor,
			dashArray = style._dashArray,
			dashOffset = style._dashOffset;
		if (width != null)
			ctx.lineWidth = width;
		if (join)
			ctx.lineJoin = join;
		if (cap)
			ctx.lineCap = cap;
		if (limit)
			ctx.miterLimit = limit;
		if (fillColor)
			ctx.fillStyle = fillColor.getCanvasStyle(ctx);
		if (strokeColor) {
			ctx.strokeStyle = strokeColor.getCanvasStyle(ctx);
			if (paper.support.nativeDash && dashArray && dashArray.length) {
				if ('setLineDash' in ctx) {
					ctx.setLineDash(dashArray);
					ctx.lineDashOffset = dashOffset;
				} else {
					ctx.mozDash = dashArray;
					ctx.mozDashOffset = dashOffset;
				}
			}
		}
		if (!fillColor || !strokeColor)
			ctx.globalAlpha = this._opacity;
	},

	drawSelected: function(ctx, matrix) {
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
			if (!item._visible || item._opacity == 0)
				return;
			item._drawCount = item._project._drawCount;
			var parentCtx, itemOffset, prevOffset;
			if (item._blendMode !== 'normal' || item._opacity < 1
					&& item._type !== 'raster' && (item._type !== 'path'
						|| item.getFillColor() && item.getStrokeColor())) {
				var bounds = item.getStrokeBounds();
				if (!bounds.width || !bounds.height)
					return;
				prevOffset = param.offset;
				itemOffset = param.offset = bounds.getTopLeft().floor();
				parentCtx = ctx;
				ctx = CanvasProvider.getContext(
						bounds.getSize().ceil().add(Size.create(1, 1)));
			}
			if (!param.clipping)
				ctx.save();
			if (parentCtx)
				ctx.translate(-itemOffset.x, -itemOffset.y);
			item._matrix.applyToContext(ctx);
			item.draw(ctx, param);
			if (!param.clipping)
				ctx.restore();
			if (parentCtx) {
				param.offset = prevOffset;
				if (item._blendMode !== 'normal') {
					BlendMode.process(item._blendMode, ctx, parentCtx,
						item._opacity, itemOffset.subtract(prevOffset));
				} else {
					parentCtx.save();
					parentCtx.globalAlpha = item._opacity;
					parentCtx.drawImage(ctx.canvas, itemOffset.x, itemOffset.y);
					parentCtx.restore();
				}
				CanvasProvider.release(ctx);
			}
		}
	}
}, Base.each(['down', 'drag', 'up', 'move'], function(name) {
	this['removeOn' + Base.capitalize(name)] = function() {
		var hash = {};
		hash[name] = true;
		return this.removeOn(hash);
	};
}, {

	removeOn: function(obj) {
		for (var name in obj) {
			if (obj[name]) {
				var key = 'mouse' + name,
					sets = Tool._removeSets = Tool._removeSets || {};
				sets[key] = sets[key] || {};
				sets[key][this._id] = this;
			}
		}
		return this;
	}
}));

var Group = this.Group = Item.extend({
	_type: 'group',

	initialize: function(arg) {
		this.base();
		this._children = [];
		this._namedChildren = {};
		if (!this._setProperties(arg))
			this.addChildren(Array.isArray(arg) ? arg : arguments);
	},

	_changed: function(flags) {
		Item.prototype._changed.call(this, flags);
		if (flags & (2 | 256)) {
			delete this._clipItem;
		}
	},

	_getClipItem: function() {
		if (this._clipItem !== undefined)
			return this._clipItem;
		for (var i = 0, l = this._children.length; i < l; i++) {
			var child = this._children[i];
			if (child._clipMask)
				return this._clipItem = child;
		}
		return this._clipItem = null;
	},

	isClipped: function() {
		return !!this._getClipItem();
	},

	setClipped: function(clipped) {
		var child = this.getFirstChild();
		if (child)
			child.setClipMask(clipped);
		return this;
	},

	isEmpty: function() {
		return this._children.length == 0;
	},

	draw: function(ctx, param) {
		var clipItem = this._getClipItem();
		if (clipItem) {
			param.clipping = true;
			Item.draw(clipItem, ctx, param);
			delete param.clipping;
		}
		for (var i = 0, l = this._children.length; i < l; i++) {
			var item = this._children[i];
			if (item != clipItem)
				Item.draw(item, ctx, param);
		}
	}
});

var Layer = this.Layer = Group.extend({
	_type: 'layer',
	initialize: function(items) {
		this._project = paper.project;
		this._index = this._project.layers.push(this) - 1;
		this.base.apply(this, arguments);
		this.activate();
	},

	_remove: function(notify) {
		if (this._parent)
			return this.base(notify);
		if (this._index != null) {
			Base.splice(this._project.layers, null, this._index, 1);
			this._project._needsRedraw();
			return true;
		}
		return false;
	},

	getNextSibling: function() {
		return this._parent ? this.base()
				: this._project.layers[this._index + 1] || null;
	},

	getPreviousSibling: function() {
		return this._parent ? this.base()
				: this._project.layers[this._index - 1] || null;
	},

	isInserted: function() {
		return this._index != null;
	},

	activate: function() {
		this._project.activeLayer = this;
	}
}, new function () {
	function insert(above) {
		return function(item) {
			if (item instanceof Layer && !item._parent
						&& this._remove(true)) {
				Base.splice(item._project.layers, [this],
						item._index + (above ? 1 : 0), 0);
				this._setProject(item._project);
				return true;
			}
			return this.base(item);
		};
	}

	return {
		insertAbove: insert(true),

		insertBelow: insert(false)
	};
});

var PlacedItem = this.PlacedItem = Item.extend({
	_boundsGetter: { getBounds: 'getStrokeBounds' },

	_hitTest: function(point, options, matrix) {
		var result = this._symbol._definition._hitTest(point, options, matrix);
		if (result)
			result.item = this;
		return result;
	}
});

var Raster = this.Raster = PlacedItem.extend({
	_type: 'raster',
	_serializeFields: {
		source: null
	},
	_boundsGetter: 'getBounds',

	initialize: function(arg0, arg1) {
		this.base(arg1 !== undefined && Point.read(arguments, 1));
		if (!this._setProperties(arg0)) {
			if (arg0.getContext) {
				this.setCanvas(arg0);
			} else if (typeof arg0 === 'string') {
				this.setSource(arg0);
			} else {
				this.setImage(arg0);
			}
		}
	},

	clone: function() {
		var element = this._image;
		if (!element) {
			element = CanvasProvider.getCanvas(this._size);
			element.getContext('2d').drawImage(this._canvas, 0, 0);
		}
		var copy = new Raster(element);
		return this._clone(copy);
	},

	getSize: function() {
		return this._size;
	},

	setSize: function() {
		var size = Size.read(arguments);
		if (!this._size.equals(size)) {
			var element = this.getElement();
			this.setCanvas(CanvasProvider.getCanvas(size));
			this.getContext(true).drawImage(element, 0, 0,
					size.width, size.height);
		}
	},

	getWidth: function() {
		return this._size.width;
	},

	getHeight: function() {
		return this._size.height;
	},

	isEmpty: function() {
		return this._size.width == 0 && this._size.height == 0;
	},

	getPpi: function() {
		var matrix = this._matrix,
			orig = new Point(0, 0).transform(matrix),
			u = new Point(1, 0).transform(matrix).subtract(orig),
			v = new Point(0, 1).transform(matrix).subtract(orig);
		return Size.create(
			72 / u.getLength(),
			72 / v.getLength()
		);
	},

	getContext: function() {
		if (!this._context)
			this._context = this.getCanvas().getContext('2d');
		if (arguments[0]) {
			this._image = null;
			this._changed(129);
		}
		return this._context;
	},

	setContext: function(context) {
		this._context = context;
	},

	getCanvas: function() {
		if (!this._canvas) {
			var ctx = CanvasProvider.getContext(this._size);
			try {
				if (this._image)
					ctx.drawImage(this._image, 0, 0);
				this._canvas = ctx.canvas;
			} catch (e) {
				CanvasProvider.release(ctx);
			}
		}
		return this._canvas;
	},

	setCanvas: function(canvas) {
		if (this._canvas)
			CanvasProvider.release(this._canvas);
		this._canvas = canvas;
		this._size = Size.create(canvas.width, canvas.height);
		this._image = null;
		this._context = null;
		this._changed(5 | 129);
	},

	getImage: function() {
		return this._image;
	},

	setImage: function(image) {
		if (this._canvas)
			CanvasProvider.release(this._canvas);
		this._image = image;
		this._size = Size.create(image.naturalWidth, image.naturalHeight);
		this._canvas = null;
		this._context = null;
		this._changed(5);
	},

	getSource: function() {
		return this._image && this._image.src || this.toDataURL();
	},

	setSource: function(src) {
		var that = this,
			image = document.getElementById(src) || new Image();
		function loaded() {
			that.fire('load');
			if (that._project.view)
				that._project.view.draw(true);
		}
		DomEvent.add(image, {
			load: function() {
				that.setImage(image);
				loaded();
			}
		});
		if (image.width && image.height) {
			setTimeout(loaded, 0);
		} else if (!image.src) {
			image.src = src;
		}
		this.setImage(image);
	},

	getElement: function() {
		return this._canvas || this._image;
	},

	getSubImage: function(rect) {
		rect = Rectangle.read(arguments);
		var ctx = CanvasProvider.getContext(rect.getSize());
		ctx.drawImage(this.getCanvas(), rect.x, rect.y,
				canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
		return ctx.canvas;
	},

	toDataURL: function() {
		var src = this._image && this._image.src;
		if (/^data:/.test(src)) 
			return src;
		var canvas = this.getCanvas();
		return canvas ? canvas.toDataURL() : null;
	},

	drawImage: function(image, point) {
		point = Point.read(arguments, 1);
		this.getContext(true).drawImage(image, point.x, point.y);
	},

	getAverageColor: function(object) {
		var bounds, path;
		if (!object) {
			bounds = this.getBounds();
		} else if (object instanceof PathItem) {
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
			ctx = Raster._sampleContext = CanvasProvider.getContext(
					new Size(sampleSize));
		} else {
			ctx.clearRect(0, 0, sampleSize + 1, sampleSize + 1);
		}
		ctx.save();
		ctx.scale(width / bounds.width, height / bounds.height);
		ctx.translate(-bounds.x, -bounds.y);
		if (path)
			path.draw(ctx, { clip: true });
		this._matrix.applyToContext(ctx);
		ctx.drawImage(this.getElement(),
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
		return RgbColor.read(channels);
	},

	setPixel: function(point, color) {
		var _point = Point.read(arguments),
			_color = Color.read(arguments);
		var ctx = this.getContext(true),
			imageData = ctx.createImageData(1, 1),
			alpha = color.getAlpha();
		imageData.data[0] = _color.getRed() * 255;
		imageData.data[1] = _color.getGreen() * 255;
		imageData.data[2] = _color.getBlue() * 255;
		imageData.data[3] = alpha != null ? alpha * 255 : 255;
		ctx.putImageData(imageData, _point.x, _point.y);
	},

	createImageData: function(size) {
		size = Size.read(arguments);
		return this.getContext().createImageData(size.width, size.height);
	},

	getImageData: function(rect) {
		rect = Rectangle.read(arguments);
		if (rect.isEmpty())
			rect = new Rectangle(this.getSize());
		return this.getContext().getImageData(rect.x, rect.y,
				rect.width, rect.height);
	},

	setImageData: function(data, point) {
		point = Point.read(arguments, 1);
		this.getContext(true).putImageData(data, point.x, point.y);
	},

	_getBounds: function(getter, matrix) {
		var rect = new Rectangle(this._size).setCenter(0, 0);
		return matrix ? matrix._transformBounds(rect) : rect;
	},

	_hitTest: function(point, options) {
		if (point.isInside(this._getBounds())) {
			var that = this;
			return new HitResult('pixel', that, {
				offset: point.add(that._size.divide(2)).round(),
				color: {
					get: function() {
						return that.getPixel(this.offset);
					}
				}
			});
		}
	},

	draw: function(ctx, param) {
		var element = this.getElement();
		if (element) {
			ctx.globalAlpha = this._opacity;
			ctx.drawImage(element,
					-this._size.width / 2, -this._size.height / 2);
		}
	},

	drawSelected: function(ctx, matrix) {
		Item.drawSelectedBounds(new Rectangle(this._size).setCenter(0, 0), ctx,
				matrix);
	}
});

var PlacedSymbol = this.PlacedSymbol = PlacedItem.extend({
	_type: 'placedsymbol',
	_serializeFields: {
		symbol: null
	},
	initialize: function(arg0, arg1) {
		this.base(arg1 !== undefined && Point.read(arguments, 1));
		if (!this._setProperties(arg0))
			this.setSymbol(arg0 instanceof Symbol ? arg0 : new Symbol(arg0));
	},

	getSymbol: function() {
		return this._symbol;
	},

	setSymbol: function(symbol) {
		if (this._symbol)
			delete this._symbol._instances[this._id];
		this._symbol = symbol;
		symbol._instances[this._id] = this;
	},

	isEmpty: function() {
		return this._symbol._definition.isEmpty();
	},

	clone: function() {
		return this._clone(new PlacedSymbol(this.symbol, this._matrix.clone()));
	},

	_getBounds: function(getter, matrix) {
		return this.symbol._definition._getCachedBounds(getter, matrix);
	},

	draw: function(ctx, param) {
		Item.draw(this.symbol._definition, ctx, param);
	},

	drawSelected: function(ctx, matrix) {
		Item.drawSelectedBounds(this.symbol._definition.getBounds(), ctx,
				matrix);
	}

});

var HitResult = this.HitResult = Base.extend({
	initialize: function(type, item, values) {
		this.type = type;
		this.item = item;
		if (values) {
			values.enumerable = true;
			this.inject(values);
		}
	},

	statics: {
		getOptions: function(options) {
			return options && options._merged ? options : Base.merge({
				type: null,
				tolerance: 2,
				fill: !options,
				stroke: !options,
				segments: !options,
				handles: false,
				ends: false,
				center: false,
				bounds: false,
				guides: false,
				selected: false,
				_merged: true
			}, options);
		}
	}
});

var Segment = this.Segment = Base.extend({
	_type: 'segment',

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

	_serialize: function(options) {
		return Base.serialize(this._handleIn.isZero() && this._handleOut.isZero()
				? this._point
				: [this._point, this._handleIn, this._handleOut], options, true);
	},

	_changed: function(point) {
		if (!this._path)
			return;
		var curve = this._path._curves && this.getCurve(),
			other;
		if (curve) {
			curve._changed();
			if (other = (curve[point == this._point
					|| point == this._handleIn && curve._segment1 == this
					? 'getPrevious' : 'getNext']())) {
				other._changed();
			}
		}
		this._path._changed(5);
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

	getHandleOut: function() {
		return this._handleOut;
	},

	setHandleOut: function(point) {
		point = Point.read(arguments);
		this._handleOut.set(point.x, point.y);
	},

	isLinear: function() {
		return this._handleIn.isZero() && this._handleOut.isZero();
	},

	_isSelected: function(point) {
		var state = this._selectionState;
		return point == this._point ? !!(state & 4)
			: point == this._handleIn ? !!(state & 1)
			: point == this._handleOut ? !!(state & 2)
			: false;
	},

	_setSelected: function(point, selected) {
		var path = this._path,
			selected = !!selected, 
			state = this._selectionState || 0,
			selection = [
				!!(state & 4),
				!!(state & 1),
				!!(state & 2)
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
		this._selectionState = (selection[0] ? 4 : 0)
				| (selection[1] ? 1 : 0)
				| (selection[2] ? 2 : 0);
		if (path && state != this._selectionState) {
			path._updateSelection(this, state, this._selectionState);
			path._changed(33);
		}
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

	clone: function() {
		return new Segment(this._point, this._handleIn, this._handleOut);
	},

	equals: function(segment) {
		return segment == this || segment
				&& this._point.equals(segment._point)
				&& this._handleIn.equals(segment._handleIn)
				&& this._handleOut.equals(segment._handleOut);
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
			handleIn =  !change || !this._handleIn.isZero()
					? this._handleIn : null,
			handleOut = !change || !this._handleOut.isZero()
					? this._handleOut : null,
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
		return coords;
		nop().nop();
	}
});

var SegmentPoint = Point.extend({
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

	isZero: function() {
		return Numerical.isZero(this._x) && Numerical.isZero(this._y);
	},

	setSelected: function(selected) {
		this._owner._setSelected(this, selected);
	},

	isSelected: function() {
		return this._owner._isSelected(this);
	},

	statics: {
		create: function(segment, key, pt) {
			var point = Base.create(SegmentPoint),
				x, y, selected;
			if (!pt) {
				x = y = 0;
			} else if ((x = pt[0]) !== undefined) { 
				y = pt[1];
			} else {
				if ((x = pt.x) === undefined) {
					pt = Point.read(arguments, 2);
					x = pt.x;
				}
				y = pt.y;
				selected = pt.selected;
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

var Curve = this.Curve = Base.extend({
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
		} else {
			var point1, handle1, handle2, point2;
			if (count == 4) {
				point1 = arg0;
				handle1 = arg1;
				handle2 = arg2;
				point2 = arg3;
			} else if (count == 8) {
				point1 = [arg0, arg1];
				point2 = [arg6, arg7];
				handle1 = [arg2 - arg0, arg7 - arg1];
				handle2 = [arg4 - arg6, arg5 - arg7];
			}
			this._segment1 = new Segment(point1, null, handle1);
			this._segment2 = new Segment(point2, handle2, null);
		}
	},

	_changed: function() {
		delete this._length;
		delete this._bounds;
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

	getPoints: function() {
		var coords = this.getValues(),
			points = [];
		for (var i = 0; i < 8; i += 2)
			points.push(Point.create(coords[i], coords[i + 1]));
		return points;
	},

	getLength: function() {
		var from = arguments[0],
			to = arguments[1],
			fullLength = arguments.length == 0 || from == 0 && to == 1;
		if (fullLength && this._length != null)
			return this._length;
		var length = Curve.getLength(this.getValues(), from, to);
		if (fullLength)
			this._length = length;
		return length;
	},

	getPart: function(from, to) {
		return new Curve(Curve.getPart(this.getValues(), from, to));
	},

	isLinear: function() {
		return this._segment1._handleOut.isZero()
				&& this._segment2._handleIn.isZero();
	},

	getIntersections: function(curve) {
		return Curve._addIntersections(this.getValues(), curve.getValues(),
				this, []);
	},

	getCrossings: function(point, roots) {
		var vals = this.getValues(),
			count = Curve.solveCubic(vals, 1, point.y, roots),
			crossings = 0;
		for (var i = 0; i < count; i++) {
			var t = roots[i];
			if (t >= 0 && t < 1 && Curve.evaluate(vals, t, true, 0).x > point.x) {
				if (t < 0.00001
					&& Curve.evaluate(this.getPrevious().getValues(), 1, true, 1).y
						* Curve.evaluate(vals, t, true, 1).y
							>= 0.00001)
					continue;
				crossings++;
			}
		}
		return crossings;
	},

	reverse: function() {
		return new Curve(this._segment2.reverse(), this._segment1.reverse());
	},

	divide: function(parameter) {
		var res = null;
		if (parameter && parameter.curve === this)
			parameter = parameter.parameter;
		if (parameter > 0 && parameter < 1) {
			var parts = Curve.subdivide(this.getValues(), parameter),
				left = parts[0],
				right = parts[1],
				point1 = this._segment1._point,
				point2 = this._segment2._point;
			this._segment1._handleOut.set(left[2] - point1._x,
					left[3] - point1._y);
			this._segment2._handleIn.set(right[4] - point2._x,
					right[5] - point2._y);

			var x = left[6], y = left[7],
				segment = new Segment(Point.create(x, y),
						Point.create(left[4] - x, left[5] - y),
						Point.create(right[2] - x, right[3] - y));
			if (this._path) {
				if (this._segment1._index > 0 && this._segment2._index == 0) {
					this._path.add(segment);
				} else {
					this._path.insert(this._segment2._index, segment);
				}
				res = this.getNext();
			} else {
				var end = this._segment2;
				this._segment2 = segment;
				res = new Curve(segment, end);
			}
		}
		return res;
	},

	split: function(parameter) {
		return this._path
			? this._path.split(this._segment1._index, parameter)
			: null;
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
		var curve = Base.create(Curve);
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

	evaluate: function(v, offset, isParameter, type) {
		var t = isParameter ? offset : Curve.getParameterAt(v, offset, 0),
			p1x = v[0], p1y = v[1],
			c1x = v[2], c1y = v[3],
			c2x = v[4], c2y = v[5],
			p2x = v[6], p2y = v[7],
			x, y;

		if (type == 0 && (t == 0 || t == 1)) {
			x = t == 0 ? p1x : p2x;
			y = t == 0 ? p1y : p2y;
		} else {
			var tMin = 0.00001;
			if (t < tMin && c1x == p1x && c1y == p1y)
				t = tMin;
			else if (t > 1 - tMin && c2x == p2x && c2y == p2y)
				t = 1 - tMin;
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

	subdivide: function(v, t) {
		var p1x = v[0], p1y = v[1],
			c1x = v[2], c1y = v[3],
			c2x = v[4], c2y = v[5],
			p2x = v[6], p2y = v[7];
		if (t === undefined)
			t = 0.5;
		var u = 1 - t,
			p3x = u * p1x + t * c1x, p3y = u * p1y + t * c1y,
			p4x = u * c1x + t * c2x, p4y = u * c1y + t * c2y,
			p5x = u * c2x + t * p2x, p5y = u * c2y + t * p2y,
			p6x = u * p3x + t * p4x, p6y = u * p3y + t * p4y,
			p7x = u * p4x + t * p5x, p7y = u * p4y + t * p5y,
			p8x = u * p6x + t * p7x, p8y = u * p6y + t * p7y;
		return [
			[p1x, p1y, p3x, p3y, p6x, p6y, p8x, p8y], 
			[p8x, p8y, p7x, p7y, p5x, p5y, p2x, p2y] 
		];
	},

	solveCubic: function (v, coord, val, roots) {
		var p1 = v[coord],
			c1 = v[coord + 2],
			c2 = v[coord + 4],
			p2 = v[coord + 6],
			c = 3 * (c1 - p1),
			b = 3 * (c2 - c1) - c,
			a = p2 - p1 - c - b;
		return Numerical.solveCubic(a, b, c, p1 - val, roots,
				0.00001);
	},

	getParameterOf: function(v, x, y) {
		if (Math.abs(v[0] - x) < 0.00001
				&& Math.abs(v[1] - y) < 0.00001)
			return 0;
		if (Math.abs(v[6] - x) < 0.00001
				&& Math.abs(v[7] - y) < 0.00001)
			return 1;
		var txs = [],
			tys = [],
			sx = Curve.solveCubic(v, 0, x, txs),
			sy = Curve.solveCubic(v, 1, y, tys),
			tx, ty;
		for (var cx = 0;  sx == -1 || cx < sx;) {
			if (sx == -1 || (tx = txs[cx++]) >= 0 && tx <= 1) {
				for (var cy = 0; sy == -1 || cy < sy;) {
					if (sy == -1 || (ty = tys[cy++]) >= 0 && ty <= 1) {
						if (sx == -1) tx = ty;
						else if (sy == -1) ty = tx;
						if (Math.abs(tx - ty) < 0.00001)
							return (tx + ty) * 0.5;
					}
				}
				if (sx == -1)
					break;
			}
		}
		return null;
	},

	getPart: function(v, from, to) {
		if (from > 0)
			v = Curve.subdivide(v, from)[1]; 
		if (to < 1)
			v = Curve.subdivide(v, (to - from) / (1 - from))[0]; 
		return v;
	},

	isFlatEnough: function(v, tolerance) {
		var p1x = v[0], p1y = v[1],
			c1x = v[2], c1y = v[3],
			c2x = v[4], c2y = v[5],
			p2x = v[6], p2y = v[7],
			ux = 3 * c1x - 2 * p1x - p2x,
			uy = 3 * c1y - 2 * p1y - p2y,
			vx = 3 * c2x - 2 * p2x - p1x,
			vy = 3 * c2y - 2 * p2y - p1y;
		return Math.max(ux * ux, vx * vx) + Math.max(uy * uy, vy * vy)
				< 16 * tolerance * tolerance;
	},

	getBounds: function(v) {
		var min = v.slice(0, 2), 
			max = min.slice(0), 
			roots = new Array(2);
		for (var i = 0; i < 2; i++)
			Curve._addBounds(v[i], v[i + 2], v[i + 4], v[i + 6],
					i, 0, min, max, roots);
		return Rectangle.create(min[0], min[1], max[0] - min[0], max[1] - min[1]);
	},

	_addBounds: function(v0, v1, v2, v3, coord, padding, min, max, roots) {
		function add(value, padding) {
			var left = value - padding,
				right = value + padding;
			if (left < min[coord])
				min[coord] = left;
			if (right > max[coord])
				max[coord] = right;
		}
		var a = 3 * (v1 - v2) - v0 + v3,
			b = 2 * (v0 + v2) - 4 * v1,
			c = v1 - v0,
			count = Numerical.solveQuadratic(a, b, c, roots,
					0.00001),
			tMin = 0.00001,
			tMax = 1 - tMin;
		add(v3, 0);
		for (var j = 0; j < count; j++) {
			var t = roots[j],
				u = 1 - t;
			if (tMin < t && t < tMax)
				add(u * u * u * v0
					+ 3 * u * u * t * v1
					+ 3 * u * t * t * v2
					+ t * t * t * v3,
					padding);
		}
	},

	_addIntersections: function(v1, v2, curve, locations) {
		var bounds1 = Curve.getBounds(v1),
			bounds2 = Curve.getBounds(v2);
		if (bounds1.x + bounds1.width >= bounds2.x
				&& bounds1.y + bounds1.height >= bounds2.y
				&& bounds1.x < bounds2.x + bounds2.width
				&& bounds1.y < bounds2.y + bounds2.height) {
			if (Curve.isFlatEnough(v1, 0.00001)
					&& Curve.isFlatEnough(v2, 0.00001)) {
				var point = new Line(v1[0], v1[1], v1[6], v1[7], false)
						.intersect(new Line(v2[0], v2[1], v2[6], v2[7], false));
				if (point)
					locations.push(new CurveLocation(curve, null, point));
			} else {
				var v1s = Curve.subdivide(v1),
					v2s = Curve.subdivide(v2);
				for (var i = 0; i < 2; i++)
					for (var j = 0; j < 2; j++)
						this._addIntersections(v1s[i], v2s[j], curve, locations);
			}
		}
		return locations;
	}
}}, Base.each(['getBounds', 'getStrokeBounds', 'getHandleBounds', 'getRoughBounds'],
	function(name) {
		this[name] = function() {
			if (!this._bounds)
				this._bounds = {};
			var bounds = this._bounds[name];
			if (!bounds) {
				bounds = this._bounds[name] = Path[name](
					[this._segment1, this._segment2], false, this._path._style);
			}
			return bounds.clone();
		};
	},
{

}), Base.each(['getPoint', 'getTangent', 'getNormal'],
	function(name, index) {
		this[name + 'At'] = function(offset, isParameter) {
			return Curve.evaluate(this.getValues(), offset, isParameter, index);
		};
		this[name] = function(parameter) {
			return Curve.evaluate(this.getValues(), parameter, true, index);
		};
	},
{
	getParameterAt: function(offset, start) {
		return Curve.getParameterAt(this.getValues(), offset,
				start !== undefined ? start : offset < 0 ? 1 : 0);
	},

	getParameterOf: function(point) {
		point = Point.read(arguments);
		return Curve.getParameterOf(this.getValues(), point.x, point.y);
	},

	getLocationAt: function(offset, isParameter) {
		if (!isParameter)
			offset = this.getParameterAt(offset);
		return new CurveLocation(this, offset);
	},

	getLocationOf: function(point) {
		var t = this.getParameterOf.apply(this, arguments);
		return t != null ? new CurveLocation(this, t) : null;
	}

}),
new function() { 

	function getLengthIntegrand(v) {
		var p1x = v[0], p1y = v[1],
			c1x = v[2], c1y = v[3],
			c2x = v[4], c2y = v[5],
			p2x = v[6], p2y = v[7],

			ax = 9 * (c1x - c2x) + 3 * (p2x - p1x),
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

		getLength: function(v, a, b) {
			if (a === undefined)
				a = 0;
			if (b === undefined)
				b = 1;
			if (v[0] == v[2] && v[1] == v[3] && v[6] == v[4] && v[7] == v[5]) {
				var dx = v[6] - v[0], 
					dy = v[7] - v[1]; 
				return (b - a) * Math.sqrt(dx * dx + dy * dy);
			}
			var ds = getLengthIntegrand(v);
			return Numerical.integrate(ds, a, b, getIterations(a, b));
		},

		getParameterAt: function(v, offset, start) {
			if (offset == 0)
				return start;
			var forward = offset > 0,
				a = forward ? start : 0,
				b = forward ? 1 : start,
				offset = Math.abs(offset),
				ds = getLengthIntegrand(v),
				rangeLength = Numerical.integrate(ds, a, b,
						getIterations(a, b));
			if (offset >= rangeLength)
				return forward ? b : a;
			var guess = offset / rangeLength,
				length = 0;
			function f(t) {
				var count = getIterations(start, t);
				length += start < t
						? Numerical.integrate(ds, start, t, count)
						: -Numerical.integrate(ds, t, start, count);
				start = t;
				return length - offset;
			}
			return Numerical.findRoot(f, ds,
					forward ? a + guess : b - guess, 
					a, b, 16, 0.00001);
		}
	};
}, new function() { 

	var maxDepth = 32,
		epsilon = Math.pow(2, -maxDepth - 1);

	var zCubic = [
		[1.0, 0.6, 0.3, 0.1],
		[0.4, 0.6, 0.6, 0.4],
		[0.1, 0.3, 0.6, 1.0]
	];

	var xAxis = new Line(new Point(0, 0), new Point(1, 0));

	function toBezierForm(v, point) {
		var n = 3, 
			degree = 5, 
			c = [],
			d = [],
			cd = [],
			w = [];
		for(var i = 0; i <= n; i++) {
			c[i] = v[i].subtract(point);
			if (i < n)
				d[i] = v[i + 1].subtract(v[i]).multiply(n);
		}

		for (var row = 0; row < n; row++) {
			cd[row] = [];
			for (var column = 0; column <= n; column++)
				cd[row][column] = d[row].dot(c[column]);
		}

		for (var i = 0; i <= degree; i++)
			w[i] = new Point(i / degree, 0);

		for (var k = 0; k <= degree; k++) {
			var lb = Math.max(0, k - n + 1),
				ub = Math.min(k, n);
			for (var i = lb; i <= ub; i++) {
				var j = k - i;
				w[k].y += cd[j][i] * zCubic[j][i];
			}
		}

		return w;
	}

	function findRoots(w, depth) {
		switch (countCrossings(w)) {
		case 0:
			return [];
		case 1:
			if (depth >= maxDepth)
				return [0.5 * (w[0].x + w[5].x)];
			if (isFlatEnough(w)) {
				var line = new Line(w[0], w[5], true);
				return [ Numerical.isZero(line.vector.getLength(true))
						? line.point.x
						: xAxis.intersect(line).x ];
			}
		}

		var p = [[]],
			left = [],
			right = [];
		for (var j = 0; j <= 5; j++)
		 	p[0][j] = new Point(w[j]);

		for (var i = 1; i <= 5; i++) {
			p[i] = [];
			for (var j = 0 ; j <= 5 - i; j++)
				p[i][j] = p[i - 1][j].add(p[i - 1][j + 1]).multiply(0.5);
		}
		for (var j = 0; j <= 5; j++) {
			left[j]  = p[j][0];
			right[j] = p[5 - j][j];
		}

		return findRoots(left, depth + 1).concat(findRoots(right, depth + 1));
	}

	function countCrossings(v) {
		var crossings = 0,
			prevSign = null;
		for (var i = 0, l = v.length; i < l; i++)  {
			var sign = v[i].y < 0 ? -1 : 1;
			if (prevSign != null && sign != prevSign)
				crossings++;
			prevSign = sign;
		}
		return crossings;
	}

	function isFlatEnough(v) {

		var n = v.length - 1,
			a = v[0].y - v[n].y,
			b = v[n].x - v[0].x,
			c = v[0].x * v[n].y - v[n].x * v[0].y,
			maxAbove = 0,
			maxBelow = 0;
		for (var i = 1; i < n; i++) {
			var val = a * v[i].x + b * v[i].y + c,
				dist = val * val;
			if (val < 0 && dist > maxBelow) {
				maxBelow = dist;
			} else if (dist > maxAbove) {
				maxAbove = dist;
			}
		}
		return Math.abs((maxAbove + maxBelow) / (2 * a * (a * a + b * b)))
				< epsilon;
	}

	return {
		getNearestLocation: function(point) {
			var w = toBezierForm(this.getPoints(), point);
			var roots = findRoots(w, 0).concat([0, 1]);
			var minDist = Infinity,
				minT,
				minPoint;
			for (var i = 0; i < roots.length; i++) {
				var pt = this.getPointAt(roots[i], true),
					dist = point.getDistance(pt, true);
				if (dist < minDist) {
					minDist = dist;
					minT = roots[i];
					minPoint = pt;
				}
			}
			return new CurveLocation(this, minT, minPoint, Math.sqrt(minDist));
		},

		getNearestPoint: function(point) {
			return this.getNearestLocation(point).getPoint();
		}
	};
});

var CurveLocation = this.CurveLocation = Base.extend({
	initialize: function(curve, parameter, point, distance) {
		this._curve = curve;
		this._segment1 = curve._segment1;
		this._segment2 = curve._segment2;
		this._parameter = parameter;
		this._point = point;
		this._distance = distance;
	},

	getSegment: function() {
		if (!this._segment) {
			var curve = this.getCurve(),
				parameter = this.getParameter();
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
		if (!this._curve || arguments[0]) {
			this._curve = this._segment1.getCurve();
			if (this._curve.getParameterOf(this._point) == null)
				this._curve = this._segment2.getPrevious().getCurve();
		}
		return this._curve;
	},

	getPath: function() {
		var curve = this.getCurve();
		return curve && curve._path;
	},

	getIndex: function() {
		var curve = this.getCurve();
		return curve && curve.getIndex();
	},

	getOffset: function() {
		var path = this.getPath();
		return path && path._getOffset(this);
	},

	getCurveOffset: function() {
		var curve = this.getCurve(),
			parameter = this.getParameter();
		return parameter != null && curve && curve.getLength(0, parameter);
	},

	getParameter: function() {
		if ((this._parameter == null || arguments[0]) && this._point) {
			var curve = this.getCurve(arguments[0] && this._point);
			this._parameter = curve && curve.getParameterOf(this._point);
		}
		return this._parameter;
	},

	getPoint: function() {
		if (!this._point && this._parameter != null) {
			var curve = this.getCurve();
			this._point = curve && curve.getPointAt(this._parameter, true);
		}
		return this._point;
	},

	getTangent: function() {
		var parameter = this.getParameter(),
			curve = this.getCurve();
		return parameter != null && curve && curve.getTangentAt(parameter, true);
	},

	getNormal: function() {
		var parameter = this.getParameter(),
			curve = this.getCurve();
		return parameter != null && curve && curve.getNormalAt(parameter, true);
	},

	getDistance: function() {
		return this._distance;
	},

	divide: function() {
		var curve = this.getCurve();
		return curve && curve.divide(this.getParameter(true));
	},

	split: function() {
		var curve = this.getCurve();
		return curve && curve.split(this.getParameter(true));
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
			parts.push('parameter: ' + Base.formatFloat(parameter));
		if (this._distance != null)
			parts.push('distance: ' + Base.formatFloat(this._distance));
		return '{ ' + parts.join(', ') + ' }';
	}
});

var PathItem = this.PathItem = Item.extend({

	getIntersections: function(path) {
		if (!this.getBounds().intersects(path.getBounds()))
			return [];
		var locations = [],
			curves1 = this.getCurves(),
			curves2 = path.getCurves(),
			length2 = curves2.length,
			values2 = [];
		for (var i = 0; i < length2; i++)
			values2[i] = curves2[i].getValues();
		for (var i = 0, l = curves1.length; i < l; i++) {
			var curve = curves1[i],
				values1 = curve.getValues();
			for (var j = 0; j < length2; j++)
				Curve._addIntersections(values1, values2[j], curve, locations);
		}
		return locations;
	}

});

var Path = this.Path = PathItem.extend({
	_type: 'path',
	_serializeFields: {
		segments: [],
		closed: false
	},

	initialize: function(arg) {
		this._closed = false;
		this._segments = [];
		this.base();
		var segments = Array.isArray(arg)
			? typeof arg[0] === 'object'
				? arg
				: arguments
			: arg && (arg.point !== undefined || arg.x !== undefined)
				? arguments
				: null;
		this.setSegments(segments || []);
		if (!segments)
			this._setProperties(arg);
	},

	clone: function() {
		var copy = this._clone(new Path(this._segments));
		copy._closed = this._closed;
		if (this._clockwise !== undefined)
			copy._clockwise = this._clockwise;
		return copy;
	},

	_changed: function(flags) {
		Item.prototype._changed.call(this, flags);
		if (flags & 4) {
			delete this._length;
			delete this._clockwise;
			if (this._curves) {
				for (var i = 0, l = this._curves.length; i < l; i++) {
					this._curves[i]._changed(5);
				}
			}
		} else if (flags & 8) {
			delete this._bounds;
		}
	},

	getSegments: function() {
		return this._segments;
	},

	setSegments: function(segments) {
		this._selectedSegmentState = 0;
		this._segments.length = 0;
		delete this._curves;
		this._add(Segment.readAll(segments));
	},

	getFirstSegment: function() {
		return this._segments[0];
	},

	getLastSegment: function() {
		return this._segments[this._segments.length - 1];
	},

	getCurves: function() {
		var curves = this._curves,
			segments = this._segments;
		if (!curves) {
			var length = this._countCurves();
			curves = this._curves = new Array(length);
			for (var i = 0; i < length; i++)
				curves[i] = Curve.create(this, segments[i],
					segments[i + 1] || segments[0]);
		}
		if (arguments[0] && !this._closed && this._style._fillColor) {
			curves = curves.concat([
				Curve.create(this, segments[segments.length - 1], segments[0])
			]);
		}
		return curves;
	},

	getFirstCurve: function() {
		return this.getCurves()[0];
	},

	getLastCurve: function() {
		var curves = this.getCurves();
		return curves[curves.length - 1];
	},

	isClosed: function() {
		return this._closed;
	},

	setClosed: function(closed) {
		if (this._closed != (closed = !!closed)) {
			this._closed = closed;
			if (this._curves) {
				var length = this._curves.length = this._countCurves();
				if (closed)
					this._curves[length - 1] = Curve.create(this,
						this._segments[length - 1], this._segments[0]);
			}
			this._changed(5);
		}
	},

	isEmpty: function() {
		return this._segments.length === 0;
	},

	isPolygon: function() {
		for (var i = 0, l = this._segments.length; i < l; i++) {
			if (!this._segments[i].isLinear())
				return false;
		}
		return true;
	},

	applyMatrix: true,

	_applyMatrix: function(matrix) {
		var coords = new Array(6);
		for (var i = 0, l = this._segments.length; i < l; i++) {
			this._segments[i]._transformCoordinates(matrix, coords, true);
		}
		var style = this._style,
			fillColor = style._fillColor,
			strokeColor = style._strokeColor;
		if (fillColor && fillColor.transform)
			fillColor.transform(matrix);
		if (strokeColor && strokeColor.transform)
			strokeColor.transform(matrix);
		return true;
	},

	_add: function(segs, index) {
		var segments = this._segments,
			curves = this._curves,
			amount = segs.length,
			append = index == null,
			index = append ? segments.length : index,
			fullySelected = this.isFullySelected();
		for (var i = 0; i < amount; i++) {
			var segment = segs[i];
			if (segment._path)
				segment = segs[i] = segment.clone();
			segment._path = this;
			segment._index = index + i;
			if (fullySelected)
				segment._selectionState = 4;
			if (segment._selectionState)
				this._updateSelection(segment, 0, segment._selectionState);
		}
		if (append) {
			segments.push.apply(segments, segs);
		} else {
			segments.splice.apply(segments, [index, 0].concat(segs));
			for (var i = index + amount, l = segments.length; i < l; i++)
				segments[i]._index = i;
		}
		if (curves || segs._curves) {
			if (!curves)
				curves = this._curves = [];
			var from = index > 0 ? index - 1 : index,
				start = from,
				to = Math.min(from + amount, this._countCurves());
			if (segs._curves) {
				curves.splice.apply(curves, [from, 0].concat(segs._curves));
				start += segs._curves.length;
			}
			for (var i = start; i < to; i++)
				curves.splice(i, 0, Base.create(Curve));
			this._adjustCurves(from, to);
		}
		this._changed(5);
		return segs;
	},

	_adjustCurves: function(from, to) {
		var segments = this._segments,
			curves = this._curves,
			curve;
		for (var i = from; i < to; i++) {
			curve = curves[i];
			curve._path = this;
			curve._segment1 = segments[i];
			curve._segment2 = segments[i + 1] || segments[0];
		}
		if (curve = curves[this._closed && from === 0 ? segments.length - 1
				: from - 1])
			curve._segment2 = segments[from] || segments[0];
		if (curve = curves[to])
			curve._segment1 = segments[to];
	},

	_countCurves: function() {
		var length = this._segments.length;
		return !this._closed && length > 0 ? length - 1 : length;
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
		return this.removeSegments(index, index + 1)[0] || null;
	},

	removeSegments: function(from, to) {
		from = from || 0;
		to = Base.pick(to, this._segments.length);
		var segments = this._segments,
			curves = this._curves,
			count = segments.length, 
			removed = segments.splice(from, to - from),
			amount = removed.length;
		if (!amount)
			return removed;
		for (var i = 0; i < amount; i++) {
			var segment = removed[i];
			if (segment._selectionState)
				this._updateSelection(segment, segment._selectionState, 0);
			delete segment._index;
			delete segment._path;
		}
		for (var i = from, l = segments.length; i < l; i++)
			segments[i]._index = i;
		if (curves) {
			var index = to == count + (this._closed ? 1 : 0) ? from - 1 : from,
				curves = curves.splice(index, amount);
			if (arguments[2])
				removed._curves = curves.slice(1);
			this._adjustCurves(index, index);
		}
		this._changed(5);
		return removed;
	},

	isFullySelected: function() {
		return this._selected && this._selectedSegmentState
				== this._segments.length * 4;
	},

	setFullySelected: function(selected) {
		var length = this._segments.length;
		this._selectedSegmentState = selected
				? length * 4 : 0;
		for (var i = 0; i < length; i++)
			this._segments[i]._selectionState = selected
					? 4 : 0;
		this.setSelected(selected);
	},

	_updateSelection: function(segment, oldState, newState) {
		segment._selectionState = newState;
		var total = this._selectedSegmentState += newState - oldState;
		if (total > 0)
			this.setSelected(true);
	},

	flatten: function(maxDistance) {
		var flattener = new PathFlattener(this),
			pos = 0,
			step = flattener.length / Math.ceil(flattener.length / maxDistance),
			end = flattener.length + (this._closed ? -step : step) / 2;
		var segments = [];
		while (pos <= end) {
			segments.push(new Segment(flattener.evaluate(pos, 0)));
			pos += step;
		}
		this.setSegments(segments);
	},

	simplify: function(tolerance) {
		if (this._segments.length > 2) {
			var fitter = new PathFitter(this, tolerance || 2.5);
			this.setSegments(fitter.fit());
		}
	},

	split: function(index, parameter) {
		if (parameter === null)
			return;
		if (arguments.length == 1) {
			var arg = index;
			if (typeof arg === 'number')
				arg = this.getLocationAt(arg);
			index = arg.index;
			parameter = arg.parameter;
		}
		if (parameter >= 1) {
			index++;
			parameter--;
		}
		var curves = this.getCurves();
		if (index >= 0 && index < curves.length) {
			if (parameter > 0) {
				curves[index++].divide(parameter);
			}
			var segs = this.removeSegments(index, this._segments.length, true),
				path;
			if (this._closed) {
				this.setClosed(false);
				path = this;
			} else if (index > 0) {
				path = this._clone(new Path().insertAbove(this, true));
			}
			path._add(segs, 0);
			this.addSegment(segs[0]);
			return path;
		}
		return null;
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
		}
		this._clockwise = clockwise;
	},

	reverse: function() {
		this._segments.reverse();
		for (var i = 0, l = this._segments.length; i < l; i++) {
			var segment = this._segments[i];
			var handleIn = segment._handleIn;
			segment._handleIn = segment._handleOut;
			segment._handleOut = handleIn;
			segment._index = i;
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
			this._changed(5);
			return true;
		}
		return false;
	},

	reduce: function() {
		return this;
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

	getLocationOf: function(point) {
		point = Point.read(arguments);
		var curves = this.getCurves();
		for (var i = 0, l = curves.length; i < l; i++) {
			var loc = curves[i].getLocationOf(point);
			if (loc)
				return loc;
		}
		return null;
	},

	getLocationAt: function(offset, isParameter) {
		var curves = this.getCurves(),
			length = 0;
		if (isParameter) {
			var index = ~~offset; 
			return curves[index].getLocationAt(offset - index, true);
		}
		for (var i = 0, l = curves.length; i < l; i++) {
			var start = length,
				curve = curves[i];
			length += curve.getLength();
			if (length >= offset) {
				return curve.getLocationAt(offset - start);
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
	},

	getNearestLocation: function(point) {
		var curves = this.getCurves(),
			minDist = Infinity,
			minLoc = null;
		for (var i = 0, l = curves.length; i < l; i++) {
			var loc = curves[i].getNearestLocation(point);
			if (loc._distance < minDist) {
				minDist = loc._distance;
				minLoc = loc;
			}
		}
		return minLoc;
	},

	getNearestPoint: function(point) {
		return this.getNearestLocation(point).getPoint();
	},

	contains: function(point) {
		point = Point.read(arguments);
		if (!this._closed && !this._style._fillColor
				|| !this.getRoughBounds()._containsPoint(point))
			return false;
		var curves = this.getCurves(true),
			crossings = 0,
			roots = new Array(3);
		for (var i = 0, l = curves.length; i < l; i++)
			crossings += curves[i].getCrossings(point, roots);
		return (crossings & 1) == 1;
	},

	_hitTest: function(point, options) {
		var style = this._style,
			tolerance = options.tolerance || 0,
			radius = (options.stroke && style._strokeColor
					? style._strokeWidth / 2 : 0) + tolerance,
			loc,
			res;
		var coords = [],
			that = this;
		function checkPoint(seg, pt, name) {
			if (point.getDistance(pt) < tolerance)
				return new HitResult(name, that, { segment: seg, point: pt });
		}
		function checkSegment(seg, ends) {
			var point = seg._point;
			return (ends || options.segments)
					&& checkPoint(seg, point, 'segment')
				|| (!ends && options.handles) && (
					checkPoint(seg, point.add(seg._handleIn), 'handle-in') ||
					checkPoint(seg, point.add(seg._handleOut), 'handle-out'));
		}
		if (options.ends && !options.segments && !this._closed) {
			if (res = checkSegment(this.getFirstSegment(), true)
					|| checkSegment(this.getLastSegment(), true))
				return res;
		} else if (options.segments || options.handles) {
			for (var i = 0, l = this._segments.length; i < l; i++) {
				if (res = checkSegment(this._segments[i]))
					return res;
			}
		}
		if (options.stroke && radius > 0)
			loc = this.getNearestLocation(point);
		if (!(loc && loc._distance <= radius) && options.fill
				&& style._fillColor && this.contains(point))
			return new HitResult('fill', this);
		if (!loc && options.stroke && radius > 0)
			loc = this.getNearestLocation(point);
		if (loc && loc._distance <= radius)
			return options.stroke
					? new HitResult('stroke', this, { location: loc })
					: new HitResult('fill', this);
	}

}, new function() { 

	function drawHandles(ctx, segments, matrix) {
		function drawHandle(index) {
			var hX = coords[index],
				hY = coords[index + 1];
			if (pX != hX || pY != hY) {
				ctx.beginPath();
				ctx.moveTo(pX, pY);
				ctx.lineTo(hX, hY);
				ctx.stroke();
				ctx.beginPath();
				ctx.arc(hX, hY, 1.75, 0, Math.PI * 2, true);
				ctx.fill();
			}
		}

		var coords = new Array(6);
		for (var i = 0, l = segments.length; i < l; i++) {
			var segment = segments[i];
			segment._transformCoordinates(matrix, coords, false);
			var state = segment._selectionState,
				selected = state & 4,
				pX = coords[0],
				pY = coords[1];
			if (selected || (state & 1))
				drawHandle(2);
			if (selected || (state & 2))
				drawHandle(4);
			ctx.save();
			ctx.beginPath();
			ctx.rect(pX - 2, pY - 2, 4, 4);
			ctx.fill();
			if (!selected) {
				ctx.beginPath();
				ctx.rect(pX - 1, pY - 1, 2, 2);
				ctx.fillStyle = '#ffffff';
				ctx.fill();
			}
			ctx.restore();
		}
	}

	function drawSegments(ctx, path, matrix) {
		var segments = path._segments,
			length = segments.length,
			coords = new Array(6),
			first = true,
			curX, curY,
			prevX, prevY,
			inX, inY,
			outX, outY;

		function drawSegment(i) {
			var segment = segments[i];
			if (matrix) {
				segment._transformCoordinates(matrix, coords, false);
				curX = coords[0];
				curY = coords[1];
			} else {
				var point = segment._point;
				curX = point._x;
				curY = point._y;
			}
			if (first) {
				ctx.moveTo(curX, curY);
				first = false;
			} else {
				if (matrix) {
					inX = coords[2];
					inY = coords[3];
				} else {
					var handle = segment._handleIn;
					inX = curX + handle._x;
					inY = curY + handle._y;
				}
				if (inX == curX && inY == curY && outX == prevX && outY == prevY) {
					ctx.lineTo(curX, curY);
				} else {
					ctx.bezierCurveTo(outX, outY, inX, inY, curX, curY);
				}
			}
			prevX = curX;
			prevY = curY;
			if (matrix) {
				outX = coords[4];
				outY = coords[5];
			} else {
				var handle = segment._handleOut;
				outX = prevX + handle._x;
				outY = prevY + handle._y;
			}
		}

		for (var i = 0; i < length; i++)
			drawSegment(i);
		if (path._closed && length > 1)
			drawSegment(0);
	}

	return {
		draw: function(ctx, param) {
			if (!param.compound)
				ctx.beginPath();

			var style = this._style,
				fillColor = style._fillColor,
				strokeColor = style._strokeColor,
				dashArray = style._dashArray,
				drawDash = !paper.support.nativeDash && strokeColor
						&& dashArray && dashArray.length;

			if (param.compound || this._clipMask || fillColor || strokeColor
					&& !drawDash)
				drawSegments(ctx, this);

			if (this._closed)
				ctx.closePath();

			if (this._clipMask) {
				ctx.clip();
			} else if (!param.compound && (fillColor || strokeColor)) {
				this._setStyles(ctx);
				if (fillColor)
					ctx.fill();
				if (strokeColor) {
					if (drawDash) {
						ctx.beginPath();
						var flattener = new PathFlattener(this),
							from = style._dashOffset, to,
							i = 0;
						while (from < flattener.length) {
							to = from + dashArray[(i++) % dashArray.length];
							flattener.drawPart(ctx, from, to);
							from = to + dashArray[(i++) % dashArray.length];
						}
					}
					ctx.stroke();
				}
			}
		},

		drawSelected: function(ctx, matrix) {
			ctx.beginPath();
			drawSegments(ctx, this, matrix);
			ctx.stroke();
			drawHandles(ctx, this._segments, matrix);
			if (this._selectedSegmentState == 0) {
				Item.drawSelectedBounds(this.getBounds(), ctx, matrix);
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
	}

	return {
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
					var f1 = i / overlap,
						f2 = 1 - f1,
						ie = i + overlap,
						je = j + overlap;
					x[j] = x[i] * f1 + x[j] * f2;
					y[j] = y[i] * f1 + y[j] * f2;
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
							Point.create(x[i], y[i]).subtract(segment._point));
					if (i < n - 1)
						handleIn = Point.create(
								2 * knots[i + 1]._x - x[i + 1],
								2 * knots[i + 1]._y - y[i + 1]);
					else
						handleIn = Point.create(
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
			throw new Error('Use a moveTo() command first');
		return segments[segments.length - 1];
	}

	return {
		moveTo: function(point) {
			if (this._segments.length === 1)
				this.removeSegment(0);
			if (!this._segments.length)
				this._add([ new Segment(Point.read(arguments)) ]);
		},

		moveBy: function(point) {
			throw new Error('moveBy() is unsupported on Path items.');
		},

		lineTo: function(point) {
			this._add([ new Segment(Point.read(arguments)) ]);
		},

		cubicCurveTo: function(handle1, handle2, to) {
			var _handle1 = Point.read(arguments),
				_handle2 = Point.read(arguments),
				_to = Point.read(arguments);
			var current = getCurrentSegment(this);
			current.setHandleOut(_handle1.subtract(current._point));
			this._add([ new Segment(_to, _handle2.subtract(to)) ]);
		},

		quadraticCurveTo: function(handle, to) {
			var _handle = Point.read(arguments),
				to = Point.read(arguments);
			var current = getCurrentSegment(this)._point;
			this.cubicCurveTo(
				_handle.add(current.subtract(_handle).multiply(1 / 3)),
				_handle.add(to.subtract(_handle).multiply(1 / 3)),
				to
			);
		},

		curveTo: function(through, to, parameter) {
			var _through = Point.read(arguments),
				_to = Point.read(arguments),
				t = Base.pick(Base.read(arguments), 0.5),
				t1 = 1 - t,
				current = getCurrentSegment(this)._point,
				handle = _through.subtract(current.multiply(t1 * t1))
					.subtract(_to.multiply(t * t)).divide(2 * t * t1);
			if (handle.isNaN())
				throw new Error(
					'Cannot put a curve through points with parameter = ' + t);
			this.quadraticCurveTo(handle, _to);
		},

		arcTo: function(to, clockwise ) {
			var current = getCurrentSegment(this),
				from = current._point,
				through,
				point = Point.read(arguments),
				next = Base.pick(Base.peek(arguments), true);
			if (typeof next === 'boolean') {
				to = point;
				clockwise = next;
				var middle = from.add(to).divide(2),
				through = middle.add(middle.subtract(from).rotate(
						clockwise ? -90 : 90));
			} else {
				through = point;
				to = Point.read(arguments);
			}
			var l1 = new Line(from.add(through).divide(2),
					through.subtract(from).rotate(90)),
			 	l2 = new Line(through.add(to).divide(2),
					to.subtract(through).rotate(90)),
				center = l1.intersect(l2),
				line = new Line(from, to, true),
				throughSide = line.getSide(through);
			if (!center) {
				if (!throughSide)
					return this.lineTo(to);
				throw new Error("Cannot put an arc through the given points: "
					+ [from, through, to]);
			}
			var vector = from.subtract(center),
				radius = vector.getLength(),
				extent = vector.getDirectedAngle(to.subtract(center)),
				centerSide = line.getSide(center);
			if (centerSide == 0) {
				extent = throughSide * Math.abs(extent);
			} else if (throughSide == centerSide) {
				extent -= 360 * (extent < 0 ? -1 : 1);
			}
			var ext = Math.abs(extent),
				count =  ext >= 360 ? 4 : Math.ceil(ext / 90),
				inc = extent / count,
				half = inc * Math.PI / 360,
				z = 4 / 3 * Math.sin(half) / (1 + Math.cos(half)),
				segments = [];
			for (var i = 0; i <= count; i++) {
				var pt = i < count ? center.add(vector) : to;
				var out = i < count ? vector.rotate(90).multiply(z) : null;
				if (i == 0) {
					current.setHandleOut(out);
				} else {
					segments.push(
						new Segment(pt, vector.rotate(-90).multiply(z), out));
				}
				vector = vector.rotate(inc);
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
}, {  

	_getBounds: function(getter, matrix) {
		return Path[getter](this._segments, this._closed, this._style, matrix);
	},

statics: {
	getBounds: function(segments, closed, style, matrix, strokePadding) {
		var first = segments[0];
		if (!first)
			return new Rectangle();
		var coords = new Array(6),
			prevCoords = first._transformCoordinates(matrix, new Array(6), false),
			min = prevCoords.slice(0, 2), 
			max = min.slice(0), 
			roots = new Array(2);

		function processSegment(segment) {
			segment._transformCoordinates(matrix, coords, false);
			for (var i = 0; i < 2; i++) {
				Curve._addBounds(
					prevCoords[i], 
					prevCoords[i + 4], 
					coords[i + 2], 
					coords[i], 
					i, strokePadding ? strokePadding[i] : 0, min, max, roots);
			}
			var tmp = prevCoords;
			prevCoords = coords;
			coords = tmp;
		}

		for (var i = 1, l = segments.length; i < l; i++)
			processSegment(segments[i]);
		if (closed)
			processSegment(first);
		return Rectangle.create(min[0], min[1], max[0] - min[0], max[1] - min[1]);
	},

	getStrokeBounds: function(segments, closed, style, matrix) {
		function getPenPadding(radius, matrix) {
			if (!matrix)
				return [radius, radius];
			var mx = matrix.shiftless(),
				hor = mx.transform(Point.create(radius, 0)),
				ver = mx.transform(Point.create(0, radius)),
				phi = hor.getAngleInRadians(),
				a = hor.getLength(),
				b = ver.getLength();
			var sin = Math.sin(phi),
				cos = Math.cos(phi),
				tan = Math.tan(phi),
				tx = -Math.atan(b * tan / a),
				ty = Math.atan(b / (tan * a));
			return [Math.abs(a * Math.cos(tx) * cos - b * Math.sin(tx) * sin),
					Math.abs(b * Math.sin(ty) * cos + a * Math.cos(ty) * sin)];
		}

		if (!style._strokeColor || !style._strokeWidth)
			return Path.getBounds(segments, closed, style, matrix);
		var radius = style._strokeWidth / 2,
			padding = getPenPadding(radius, matrix),
			bounds = Path.getBounds(segments, closed, style, matrix, padding),
			join = style._strokeJoin,
			cap = style._strokeCap,
			miter = style._miterLimit * style._strokeWidth / 2;
		var joinBounds = new Rectangle(new Size(padding).multiply(2));

		function add(point) {
			bounds = bounds.include(matrix
				? matrix._transformPoint(point, point) : point);
		}

		function addBevelJoin(curve, t) {
			var point = curve.getPointAt(t, true),
				normal = curve.getNormalAt(t, true).normalize(radius);
			add(point.add(normal));
			add(point.subtract(normal));
		}

		function addJoin(segment, join) {
			if (join === 'round' || !segment._handleIn.isZero()
					&& !segment._handleOut.isZero()) {
				bounds = bounds.unite(joinBounds.setCenter(matrix
					? matrix._transformPoint(segment._point) : segment._point));
			} else if (join == 'bevel') {
				var curve = segment.getCurve();
				addBevelJoin(curve, 0);
				addBevelJoin(curve.getPrevious(), 1);
			} else if (join == 'miter') {
				var curve2 = segment.getCurve(),
					curve1 = curve2.getPrevious(),
					point = curve2.getPointAt(0, true),
					normal1 = curve1.getNormalAt(1, true).normalize(radius),
					normal2 = curve2.getNormalAt(0, true).normalize(radius),
					line1 = new Line(point.subtract(normal1),
							Point.create(-normal1.y, normal1.x)),
					line2 = new Line(point.subtract(normal2),
							Point.create(-normal2.y, normal2.x)),
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
					point = curve.getPointAt(t, true),
					normal = curve.getNormalAt(t, true).normalize(radius);
				if (cap === 'square')
					point = point.add(normal.rotate(t == 0 ? -90 : 90));
				add(point.add(normal));
				add(point.subtract(normal));
				break;
			}
		}

		for (var i = 1, l = segments.length - (closed ? 0 : 1); i < l; i++)
			addJoin(segments[i], join);
		if (closed) {
			addJoin(segments[0], join);
		} else {
			addCap(segments[0], cap, 0);
			addCap(segments[segments.length - 1], cap, 1);
		}
		return bounds;
	},

	getHandleBounds: function(segments, closed, style, matrix, strokePadding,
			joinPadding) {
		var coords = new Array(6),
			x1 = Infinity,
			x2 = -x1,
			y1 = x1,
			y2 = x2;
		strokePadding = strokePadding / 2 || 0;
		joinPadding = joinPadding / 2 || 0;
		for (var i = 0, l = segments.length; i < l; i++) {
			var segment = segments[i];
			segment._transformCoordinates(matrix, coords, false);
			for (var j = 0; j < 6; j += 2) {
				var padding = j == 0 ? joinPadding : strokePadding,
					x = coords[j],
					y = coords[j + 1],
					xn = x - padding,
					xx = x + padding,
					yn = y - padding,
					yx = y + padding;
				if (xn < x1) x1 = xn;
				if (xx > x2) x2 = xx;
				if (yn < y1) y1 = yn;
				if (yx > y2) y2 = yx;
			}
		}
		return Rectangle.create(x1, y1, x2 - x1, y2 - y1);
	},

	getRoughBounds: function(segments, closed, style, matrix) {
		var strokeWidth = style._strokeColor ? style._strokeWidth : 0;
		return Path.getHandleBounds(segments, closed, style, matrix,
				strokeWidth,
				style._strokeJoin == 'miter'
					? strokeWidth * style._miterLimit
					: strokeWidth);
	}
}});

Path.inject({ statics: new function() {

	function readRectangle(list) {
		var rect;
		if (Base.hasNamed(list, 'from')) {
			rect = new Rectangle(Point.readNamed(list, 'from'),
					Point.readNamed(list, 'to'));
		} else if (Base.hasNamed(list, 'size')) {
			rect = new Rectangle(Point.readNamed(list, 'point'),
					Size.readNamed(list, 'size'));
			if (Base.hasNamed(list, 'center'))
				rect.setCenter(Point.readNamed(list, 'center'));
		} else {
			rect = Rectangle.readNamed(list, 'rectangle');
		}
		return rect;
	}

	function createRectangle() {
		var rect = readRectangle(arguments),
			left = rect.getLeft(),
			top = rect.getTop(),
			right = rect.getRight(),
			bottom = rect.getBottom(),
			path = new Path(arguments._filtered);
		path._add([
			new Segment(Point.create(left, bottom)),
			new Segment(Point.create(left, top)),
			new Segment(Point.create(right, top)),
			new Segment(Point.create(right, bottom))
		]);
		path._closed = true;
		return path;
	}

	var kappa = 2 * (Math.sqrt(2) - 1) / 3;

	var ellipseSegments = [
		new Segment([0, 0.5], [0, kappa ], [0, -kappa]),
		new Segment([0.5, 0], [-kappa, 0], [kappa, 0 ]),
		new Segment([1, 0.5], [0, -kappa], [0, kappa ]),
		new Segment([0.5, 1], [kappa, 0 ], [-kappa, 0])
	];

	function createEllipse() {
		var rect = readRectangle(arguments),
			path = new Path(arguments._filtered),
			point = rect.getPoint(true),
			size = rect.getSize(true),
			segments = new Array(4);
		for (var i = 0; i < 4; i++) {
			var segment = ellipseSegments[i];
			segments[i] = new Segment(
				segment._point.multiply(size).add(point),
				segment._handleIn.multiply(size),
				segment._handleOut.multiply(size)
			);
		}
		path._add(segments);
		path._closed = true;
		return path;
	}

	return {
		Line: function() {
			return new Path(
				Point.readNamed(arguments, 'from'),
				Point.readNamed(arguments, 'to')
			).set(arguments._filtered);
		},

		Rectangle: createRectangle,

		RoundRectangle: function() {
			var rect = readRectangle(arguments),
				radius = Size.readNamed(arguments, 'radius');
			if (radius.isZero())
				return createRectangle(rect);
			radius = Size.min(radius, rect.getSize(true).divide(2));
			var bl = rect.getBottomLeft(true),
				tl = rect.getTopLeft(true),
				tr = rect.getTopRight(true),
				br = rect.getBottomRight(true),
				h = radius.multiply(kappa * 2), 
				path = new Path(arguments._filtered);
			path._add([
				new Segment(bl.add(radius.width, 0), null, [-h.width, 0]),
				new Segment(bl.subtract(0, radius.height), [0, h.height], null),

				new Segment(tl.add(0, radius.height), null, [0, -h.height]),
				new Segment(tl.add(radius.width, 0), [-h.width, 0], null),

				new Segment(tr.subtract(radius.width, 0), null, [h.width, 0]),
				new Segment(tr.add(0, radius.height), [0, -h.height], null),

				new Segment(br.subtract(0, radius.height), null, [0, h.height]),
				new Segment(br.subtract(radius.width, 0), [h.width, 0], null)
			]);
			path._closed = true;
			return path;
		},

		Ellipse: createEllipse,

		Oval: createEllipse,

		Circle: function() {
			var center = Point.readNamed(arguments, 'center'),
				radius = Base.readNamed(arguments, 'radius');
			return createEllipse(new Rectangle(center.subtract(radius),
					Size.create(radius * 2, radius * 2)))
					.set(arguments._filtered);
		},

		Arc: function() {
			var from = Point.readNamed(arguments, 'from'),
				through = Point.readNamed(arguments, 'through'),
				to = Point.readNamed(arguments, 'to'),
				path = new Path(arguments._filtered);
			path.moveTo(from);
			path.arcTo(through, to);
			return path;
		},

		RegularPolygon: function() {
			var center = Point.readNamed(arguments, 'center'),
				numSides = Base.readNamed(arguments, 'numSides'),
				radius = Base.readNamed(arguments, 'radius'),
				path = new Path(arguments._filtered),
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

		Star: function() {
			var center = Point.readNamed(arguments, 'center'),
				numPoints = Base.readNamed(arguments, 'numPoints') * 2,
				radius1 = Base.readNamed(arguments, 'radius1'),
				radius2 = Base.readNamed(arguments, 'radius2'),
				path = new Path(arguments._filtered),
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

var CompoundPath = this.CompoundPath = PathItem.extend({
	_type: 'compoundpath',
	initialize: function(arg) {
		this.base();
		this._children = [];
		this._namedChildren = {};
		if (!this._setProperties(arg))
			this.addChildren(Array.isArray(arg) ? arg : arguments);
	},

	insertChild: function(index, item, _cloning) {
		if (item._type !== 'path')
			return null;
		item = this.base(index, item);
		if (!_cloning && item && item._clockwise === undefined)
			item.setClockwise(item._index == 0);
		return item;
	},

	reduce: function() {
		if (this._children.length == 1) {
			var child = this._children[0];
			child.insertAbove(this);
			this.remove();
			return child;
		}
		return this;
	},

	smooth: function() {
		for (var i = 0, l = this._children.length; i < l; i++)
			this._children[i].smooth();
	},

	getCurves: function() {
		var curves = [];
		for (var i = 0, l = this._children.length; i < l; i++)
			curves = curves.concat(this._children[i].getCurves());
		return curves;
	},

	isEmpty: function() {
		return this._children.length == 0;
	},

	contains: function(point) {
		point = Point.read(arguments);
		var count = 0;
		for (var i = 0, l = this._children.length; i < l; i++) {
			if (this._children[i].contains(point))
				count++;
		}
		return (count & 1) == 1;
	},

	_hitTest: function(point, options) {
		return this.base(point, Base.merge(options, { fill: false }))
			|| options.fill && this._style._fillColor && this.contains(point)
				? new HitResult('fill', this)
				: null;
	},

	draw: function(ctx, param) {
		var children = this._children,
			style = this._style;
		if (children.length == 0)
			return;
		ctx.beginPath();
		param.compound = true;
		for (var i = 0, l = children.length; i < l; i++)
			Item.draw(children[i], ctx, param);
		param.compound = false;
		if (this._clipMask) {
			ctx.clip();
		} else {
			this._setStyles(ctx);
			if (style._fillColor)
				ctx.fill();
			if (style._strokeColor)
				ctx.stroke();
		}
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
			this.addChild(path);
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
		if ((maxT - minT) > 1 / 32 && !Curve.isFlatEnough(curve, 0.25)) {
			var curves = Curve.subdivide(curve);
			var halfT = (minT + maxT) / 2;
			this._computeParts(curves[0], index, minT, halfT);
			this._computeParts(curves[1], index, halfT, maxT);
		} else {
			var x = curve[6] - curve[0],
				y = curve[7] - curve[1],
				dist = Math.sqrt(x * x + y * y);
			if (dist > 0.00001) {
				this.length += dist;
				this.parts.push({
					offset: this.length,
					value: maxT,
					index: index
				});
			}
		}
	},

	getParameterAt: function(offset) {
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
		var param = this.getParameterAt(offset);
		return Curve.evaluate(this.curves[param.index], param.value, true, type);
	},

	drawPart: function(ctx, from, to) {
		from = this.getParameterAt(from);
		to = this.getParameterAt(to);
		for (var i = from.index; i <= to.index; i++) {
			var curve = Curve.getPart(this.curves[i],
					i == from.index ? from.value : 0,
					i == to.index ? to.value : 1);
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
				this.points.push(point);
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
		var epsilon = 1e-11,
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
			} else if (Math.abs(c1) > epsilon) {
				alpha1 = alpha2 = X[1] / c1;
			} else {
				alpha1 = alpha2 = 0;
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
		if (Math.abs(df) < 0.00001)
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

var TextItem = this.TextItem = Item.extend({
	_serializeFields: {
		content: null
	},
	_boundsGetter: 'getBounds',

	initialize: function(arg) {
		this._style = CharacterStyle.create(this);
		this._paragraphStyle = ParagraphStyle.create(this);
		var hasProperties = Base.isPlainObject(arg)
				&& arg.x === undefined && arg.y === undefined;
		this.base(hasProperties ? null : Point.read(arguments));
		this.setParagraphStyle();
		this._content = '';
		this._lines = [];
		if (hasProperties) {
			this._setProperties(arg);
		}
	},

	_clone: function(copy) {
		copy.setContent(this._content);
		copy.setParagraphStyle(this._paragraphStyle);
		return this.base(copy);
	},

	getContent: function() {
		return this._content;
	},

	setContent: function(content) {
		this._content = '' + content;
		this._lines = this._content.split(/\r\n|\n|\r/mg);
		this._changed(65);
	},

	isEmpty: function() {
		return !this._content;
	},

	getCharacterStyle: function() {
		return this.getStyle();
	},

	setCharacterStyle: function(style) {
		this.setStyle(style);
	}

});

var PointText = this.PointText = TextItem.extend({
	_type: 'pointtext',

	clone: function() {
		return this._clone(new PointText());
	},

	getPoint: function() {
		var point = this._matrix.getTranslation();
		return LinkedPoint.create(this, 'setPoint', point.x, point.y);
	},

	setPoint: function(point) {
		this.translate(Point.read(arguments).subtract(
				this._matrix.getTranslation()));
	},

	draw: function(ctx) {
		if (!this._content)
			return;
		this._setStyles(ctx);
		var style = this._style,
			leading = this.getLeading(),
			lines = this._lines;
		ctx.font = style.getFontStyle();
		ctx.textAlign = this.getJustification();
		for (var i = 0, l = lines.length; i < l; i++) {
			var line = lines[i];
			if (style._fillColor)
				ctx.fillText(line, 0, 0);
			if (style._strokeColor)
				ctx.strokeText(line, 0, 0);
			ctx.translate(0, leading);
		}
	},

	drawSelected: function(ctx, matrix) {
		Item.drawSelectedBounds(this._getBounds(), ctx, matrix);
	}
}, new function() {
	var measureCtx = null;

	return {
		_getBounds: function(getter, matrix) {
			if (!measureCtx)
				measureCtx = CanvasProvider.getContext(1, 1);
			var justification = this.getJustification(),
				x = 0;
			measureCtx.font = this._style.getFontStyle();
			var width = 0;
			for (var i = 0, l = this._lines.length; i < l; i++)
				width = Math.max(width, measureCtx.measureText(
						this._lines[i]).width);
			if (justification !== 'left')
				x -= width / (justification === 'center' ? 2: 1);
			var leading = this.getLeading(),
				count = this._lines.length,
				bounds = Rectangle.create(x,
						count ? leading / 4 + (count - 1) * leading : 0,
						width, -count * leading);
			return matrix ? matrix._transformBounds(bounds, bounds) : bounds;
		}
	};
});

var SvgStyles = Base.each({
	fillColor: ['fill', 'color'],
	strokeColor: ['stroke', 'color'],
	strokeWidth: ['stroke-width', 'number'],
	strokeCap: ['stroke-linecap', 'string'],
	strokeJoin: ['stroke-linejoin', 'string'],
	miterLimit: ['stroke-miterlimit', 'number'],
	dashArray: ['stroke-dasharray', 'array'],
	dashOffset: ['stroke-dashoffset', 'number']
}, function(entry, key) {
	var part = Base.capitalize(key);
	this.attributes[entry[0]] = this.properties[key] = {
		type: entry[1],
		property: key,
		attribute: entry[0],
		get: 'get' + part,
		set: 'set' + part
	};
}, {
	properties: {},
	attributes: {}
});

new function() {
	var formatFloat = Base.formatFloat,
		namespaces = {
			href: 'http://www.w3.org/1999/xlink'
		};

	function formatPoint(point) {
		return formatFloat(point.x) + ',' + formatFloat(point.y);
	}

	function formatRectangle(rect) {
		return formatFloat(rect.x) + ',' + formatFloat(rect.y)
			+ ',' + formatFloat(rect.width) + ',' + formatFloat(rect.height);
	}

	function setAttributes(node, attrs) {
		for (var key in attrs) {
			var val = attrs[key],
				namespace = namespaces[key];
			if (typeof val === 'number')
				val = formatFloat(val);
			if (namespace) {
				node.setAttributeNS(namespace, key, val);
			} else {
				node.setAttribute(key, val);
			}
		}
		return node;
	}

	function createElement(tag, attrs) {
		return setAttributes(
			document.createElementNS('http://www.w3.org/2000/svg', tag), attrs);
	}

	function getDistance(segments, index1, index2) {
		return segments[index1]._point.getDistance(segments[index2]._point);
	}

	function getTransform(item, coordinates) {
		var matrix = item._matrix,
			trans = matrix.getTranslation(),
			attrs = {};
		if (coordinates) {
			matrix = matrix.shiftless();
			var point = matrix._inverseTransform(trans);
			attrs.x = point.x;
			attrs.y = point.y;
			trans = null;
		}
		if (matrix.isIdentity())
			return attrs;
		var decomposed = matrix.decompose();
		if (decomposed && !decomposed.shearing) {
			var parts = [],
				angle = decomposed.rotation,
				scale = decomposed.scaling;
			if (trans && !trans.isZero())
				parts.push('translate(' + formatPoint(trans) + ')');
			if (!Numerical.isZero(scale.x - 1) || !Numerical.isZero(scale.y - 1))
				parts.push('scale(' + formatPoint(scale) +')');
			if (angle)
				parts.push('rotate(' + formatFloat(angle) + ')');
			attrs.transform = parts.join(' ');
		} else {
			attrs.transform = 'matrix(' + matrix.getValues().join(',') + ')';
		}
		return attrs;
	}

	function getPath(path) {
		var segments = path._segments,
			style = path._style,
			parts = [];

		function addCurve(seg1, seg2, skipLine) {
			var point1 = seg1._point,
				point2 = seg2._point,
				handle1 = seg1._handleOut,
				handle2 = seg2._handleIn;
			if (handle1.isZero() && handle2.isZero()) {
				if (!skipLine) {
					parts.push('L' + formatPoint(point2));
				}
			} else {
				var end = point2.subtract(point1);
				parts.push('c' + formatPoint(handle1),
					formatPoint(end.add(handle2)),
					formatPoint(end));
			}
		}

		parts.push('M' + formatPoint(segments[0]._point));
		for (i = 0, l = segments.length  - 1; i < l; i++)
			addCurve(segments[i], segments[i + 1], false);
		if (path._closed && style._strokeColor || style._fillColor)
			addCurve(segments[segments.length - 1], segments[0], true);
		if (path._closed)
			parts.push('z');
		return parts.join(' ');
	}

	function determineAngle(path, segments, type, center) {
		var topCenter = type === 'rect'
				? segments[1]._point.add(segments[2]._point).divide(2)
				: type === 'roundrect'
				? segments[3]._point.add(segments[4]._point).divide(2)
				: type === 'circle' || type === 'ellipse'
				? segments[1]._point
				: null;
		var angle = topCenter && topCenter.subtract(center).getAngle() + 90;
		return Numerical.isZero(angle || 0) ? 0 : angle;
	}

	function determineType(path, segments) {
		function isColinear(i, j) {
			var seg1 = segments[i],
				seg2 = seg1.getNext(),
				seg3 = segments[j],
				seg4 = seg3.getNext();
			return seg1._handleOut.isZero() && seg2._handleIn.isZero()
					&& seg3._handleOut.isZero() && seg4._handleIn.isZero()
					&& seg2._point.subtract(seg1._point).isColinear(
						seg4._point.subtract(seg3._point));
		}

		var kappa = 4 * (Math.sqrt(2) - 1) / 3;

		function isArc(i) {
			var segment = segments[i],
				next = segment.getNext(),
				handle1 = segment._handleOut,
				handle2 = next._handleIn;
			if (handle1.isOrthogonal(handle2)) {
				var from = segment._point,
					to = next._point,
					corner = new Line(from, handle1).intersect(
							new Line(to, handle2));
				return corner && Numerical.isZero(handle1.getLength() /
						corner.subtract(from).getLength() - kappa)
					&& Numerical.isZero(handle2.getLength() /
						corner.subtract(to).getLength() - kappa);
			}
		}

		if (path.isPolygon()) {
			return  segments.length === 4 && path._closed
					&& isColinear(0, 2) && isColinear(1, 3)
					? 'rect'
					: segments.length === 0
						? 'empty'
						: segments.length >= 3
							? path._closed ? 'polygon' : 'polyline'
							: 'line';
		} else if (path._closed) {
			if (segments.length === 8
					&& isArc(0) && isArc(2) && isArc(4) && isArc(6)
					&& isColinear(1, 5) && isColinear(3, 7)) {
				return 'roundrect';
			} else if (segments.length === 4
					&& isArc(0) && isArc(1) && isArc(2) && isArc(3)) {
				return Numerical.isZero(getDistance(segments, 0, 2)
						- getDistance(segments, 1, 3))
						? 'circle'
						: 'ellipse';
			} 
		}
		return 'path';
	}

	function exportGroup(item) {
		var attrs = getTransform(item),
			children = item._children;
		attrs.fill = 'none';
		var node = createElement('g', attrs);
		for (var i = 0, l = children.length; i < l; i++) {
			var child = exportSvg(children[i]);
			if (child)
				node.appendChild(child);
		}
		return node;
	}

	function exportRaster(item) {
		var attrs = getTransform(item, true),
			size = item.getSize();
		attrs.x -= size.width / 2;
		attrs.y -= size.height / 2;
		attrs.width = size.width;
		attrs.height = size.height;
		attrs.href = item.toDataURL();
		return createElement('image', attrs);
	}

	function exportText(item) {
		var attrs = getTransform(item, true),
			style = item._style;
		if (style._font != null)
			attrs['font-family'] = style._font;
		if (style._fontSize != null)
			attrs['font-size'] = style._fontSize;
		var node = createElement('text', attrs);
		node.textContent = item._content;
		return node;
	}

	function exportPath(item) {
		var segments = item._segments,
			center = item.getPosition(true),
			type = determineType(item, segments),
			angle = determineAngle(item, segments, type, center),
			attrs;
		switch (type) {
		case 'empty':
			return null;
		case 'path':
			attrs = {
				d: getPath(item)
			};
			break;
		case 'polyline':
		case 'polygon':
			var parts = [];
			for(i = 0, l = segments.length; i < l; i++)
				parts.push(formatPoint(segments[i]._point));
			attrs = {
				points: parts.join(' ')
			};
			break;
		case 'rect':
			var width = getDistance(segments, 0, 3),
				height = getDistance(segments, 0, 1),
				point = segments[1]._point.rotate(-angle, center);
			attrs = {
				x: point.x,
				y: point.y,
				width: width,
				height: height
			};
			break;
		case 'roundrect':
			type = 'rect';
			var width = getDistance(segments, 1, 6),
				height = getDistance(segments, 0, 3),
				rx = (width - getDistance(segments, 0, 7)) / 2,
				ry = (height - getDistance(segments, 1, 2)) / 2,
				left = segments[3]._point, 
				right = segments[4]._point, 
				point = left.subtract(right.subtract(left).normalize(rx))
						.rotate(-angle, center);
			attrs = {
				x: point.x,
				y: point.y,
				width: width,
				height: height,
				rx: rx,
				ry: ry
			};
			break;
		case'line':
			var first = segments[0]._point,
				last = segments[segments.length - 1]._point;
			attrs = {
				x1: first._x,
				y1: first._y,
				x2: last._x,
				y2: last._y
			};
			break;
		case 'circle':
			var radius = getDistance(segments, 0, 2) / 2;
			attrs = {
				cx: center.x,
				cy: center.y,
				r: radius
			};
			break;
		case 'ellipse':
			var rx = getDistance(segments, 2, 0) / 2,
				ry = getDistance(segments, 3, 1) / 2;
			attrs = {
				cx: center.x,
				cy: center.y,
				rx: rx,
				ry: ry
			};
			break;
		}
		if (angle) {
			attrs.transform = 'rotate(' + formatFloat(angle) + ','
					+ formatPoint(center) + ')';
			item._gradientMatrix = new Matrix().rotate(-angle, center);
		}
		return createElement(type, attrs);
	}

	function exportCompoundPath(item) {
		var attrs = getTransform(item, true),
			children = item._children,
			paths = [];
		for (var i = 0, l = children.length; i < l; i++)
			paths.push(getPath(children[i]));
		attrs.d = paths.join(' ');
		return createElement('path', attrs);
	}

	function exportPlacedSymbol(item) {
		var attrs = getTransform(item, true),
			symbol = item.getSymbol(),
			symbolNode = getDefinition(symbol);
			definition = symbol.getDefinition(),
			bounds = definition.getBounds();
		if (!symbolNode) {
			symbolNode = createElement('symbol', {
				viewBox: formatRectangle(bounds)
			});
			symbolNode.appendChild(exportSvg(definition));
			setDefinition(symbol, symbolNode);
		}
		attrs.href = '#' + symbolNode.id;
		attrs.x += bounds.x;
		attrs.y += bounds.y;
		attrs.width = formatFloat(bounds.width);
		attrs.height = formatFloat(bounds.height);
		return createElement('use', attrs);
	}

	function exportGradient(color, item) {
		var gradientNode = getDefinition(color);
		if (!gradientNode) {
			var gradient = color.gradient,
				matrix = item._gradientMatrix,
				origin = color._origin.transform(matrix),
				destination = color._destination.transform(matrix),
				highlight = color._hilite && color._hilite.transform(matrix),
				attrs;
				if (gradient.type == 'radial') {
					attrs = {
						cx: origin.x,
						cy: origin.y,
						r: origin.getDistance(destination)
					};
					if (highlight) {
						attrs.fx = highlight.x;
						attrs.fy = highlight.y;
					}
				} else {
					attrs = {
						x1: origin.x,
						y1: origin.y,
						x2: destination.x,
						y2: destination.y
					};
				}
			attrs.gradientUnits = 'userSpaceOnUse';
			gradientNode = createElement(gradient.type + 'Gradient', attrs);
			var stops = gradient._stops;
			for (var i = 0, l = stops.length; i < l; i++) {
				var stop = stops[i],
					stopColor = stop._color;
				attrs = {
					offset: stop._rampPoint,
					'stop-color': stopColor.toCss(true)
				};
				if (stopColor.getAlpha() < 1)
					attrs['stop-opacity'] = stopColor._alpha;
				gradientNode.appendChild(createElement('stop', attrs));
			}
			setDefinition(color, gradientNode);
		}
		return 'url(#' + gradientNode.id + ')';
	}

	var exporters = {
		group: exportGroup,
		layer: exportGroup,
		raster: exportRaster,
		pointtext: exportText,
		placedsymbol: exportPlacedSymbol,
		path: exportPath,
		compoundpath: exportCompoundPath
	};

	function applyStyle(item, node) {
		var attrs = {},
			style = item._style,
			parent = item.getParent(),
			parentStyle = parent && parent._style;

		if (item._name != null)
			attrs.id = item._name;

		Base.each(SvgStyles.properties, function(entry) {
			var value = style[entry.get]();
			if (!parentStyle || !Base.equals(parentStyle[entry.get](), value)) {
				if (entry.type === 'color' && value != null && value.getAlpha() < 1)
					attrs[entry.attribute + '-opacity'] = value._alpha;
				attrs[entry.attribute] = value == null
					? 'none'
					: entry.type === 'color'
						? value.gradient
							? exportGradient(value, item)
							: value.toCss(true) 
						: entry.type === 'array'
							? value.join(',')
							: entry.type === 'number'
								? formatFloat(value)
								: value;
			}
		});

		if (item._opacity != null && item._opacity < 1)
			attrs.opacity = item._opacity;

		if (item._visibility != null && !item._visibility)
			attrs.visibility = 'hidden';

		delete item._gradientMatrix; 
		return setAttributes(node, attrs);
	}

	var definitions;
	function getDefinition(item) {
		if (!definitions)
			definitions = { ids: {}, svgs: {} };
		return definitions.svgs[item._id];
	}

	function setDefinition(item, node) {
		var type = item._type,
			id = definitions.ids[type] = (definitions.ids[type] || 0) + 1;
		node.id = type + '-' + id;
		definitions.svgs[item._id] = node;
	}

	function exportDefinitions(node) {
		if (!definitions)
			return node;
		var container = node.nodeName.toLowerCase() == 'svg' && node,
			firstChild = container ? container.firstChild : node;
		for (var i in definitions.svgs) {
			if (!container) {
				container = createElement('svg');
				container.appendChild(node);
			}
			container.insertBefore(definitions.svgs[i], firstChild);
		}
		definitions = null;
		return container;
	}

	function exportSvg(item) {
		var exporter = exporters[item._type],
			node = exporter && exporter(item, item._type);
		return node && applyStyle(item, node);
	}

	Item.inject({
		exportSvg: function() {
			var node = exportSvg(this);
			return exportDefinitions(node);
		}
	});

	Project.inject({
		exportSvg: function() {
			var node = createElement('svg'),
				layers = this.layers;
			for (var i = 0, l = layers.length; i < l; i++)
				node.appendChild(exportSvg(layers[i]));
			return exportDefinitions(node);
		}
	});
};

new function() {

	function getValue(node, key, allowNull, index) {
		var base = (!allowNull || node.getAttribute(key) != null)
				&& node[key] && node[key].baseVal;
		return base
				? index !== undefined
					? index < base.numberOfItems
						? Base.pick((base = base.getItem(index)).value, base)
						: null
					: Base.pick(base.value, base)
				: null;
	}

	function getPoint(node, x, y, allowNull, index) {
		x = getValue(node, x, allowNull, index);
		y = getValue(node, y, allowNull, index);
		return allowNull && x == null && y == null ? null
				: Point.create(x || 0, y || 0);
	}

	function getSize(node, w, h, allowNull, index) {
		w = getValue(node, w, allowNull, index);
		h = getValue(node, h, allowNull, index);
		return allowNull && w == null && h == null ? null
				: Size.create(w || 0, h || 0);
	}

	function convertValue(value, type) {
		return value === 'none'
				? null
				: type === 'number'
					? Base.toFloat(value)
					: type === 'array'
						? value ? value.split(/[\s,]+/g).map(parseFloat) : []
						: type === 'color' && getDefinition(value)
							|| value;
	}

	function createClipGroup(item, clip) {
		clip.setClipMask(true);
		return new Group(clip, item);
	}

	function importGroup(node, type) {
		var nodes = node.childNodes,
			compound = type === 'clippath',
			group = compound ? new CompoundPath() : new Group(),
			project = group._project,
			currentStyle = project._currentStyle;
		applyAttributes(group, node);
		project._currentStyle = group._style.clone();
		for (var i = 0, l = nodes.length; i < l; i++) {
			var child = nodes[i],
				item;
			if (child.nodeType == 1 && (item = importSvg(child))) {
				if (compound && item instanceof CompoundPath) {
					group.addChildren(item.removeChildren());
					item.remove();
				} else if (!(item instanceof Symbol)) {
					group.addChild(item);
				}
			}
		}
		project._currentStyle = currentStyle;
		if (type == 'defs') {
			group.remove();
			group = null;
		}
		return group;
	}

	function importPoly(node, type) {
		var path = new Path(),
			points = node.points;
		path.moveTo(points.getItem(0));
		for (var i = 1, l = points.numberOfItems; i < l; i++)
			path.lineTo(points.getItem(i));
		if (type === 'polygon')
			path.closePath();
		return path;
	}

	function importPath(node) {
		var path = new Path(),
			list = node.pathSegList,
			compoundPath, lastPoint;
		for (var i = 0, l = list.numberOfItems; i < l; i++) {
			var segment = list.getItem(i),
				segType = segment.pathSegType,
				isRelative = segType % 2 == 1;
			if (segType === 0)
				continue;
			if (!path.isEmpty())
				lastPoint = path.getLastSegment().getPoint();
			var relative = isRelative && !path.isEmpty()
					? lastPoint
					: Point.create(0, 0);
			var coord = (segType == 12
					|| segType == 13) && 'y'
					|| (segType == 14
					|| segType == 15) && 'x';
			if (coord)
				segment[coord] = isRelative ? 0 : lastPoint[coord];
			var point = Point.create(segment.x, segment.y).add(relative);
			switch (segType) {
			case 1:
				path.closePath();
				break;
			case 2:
			case 3:
				if (!path.isEmpty() && !compoundPath) {
					compoundPath = new CompoundPath([path]);
				}
				if (compoundPath) {
					path = new Path();
					compoundPath.addChild(path);
				}
				path.moveTo(point);
				break;
			case 4:
			case 5:
			case 12:
			case 13:
			case 14:
			case 15:
				path.lineTo(point);
				break;
			case 6:
			case 7:
				path.cubicCurveTo(
					relative.add(segment.x1, segment.y1),
					relative.add(segment.x2, segment.y2),
					point
				);
				break;
			case 8:
			case 9:
				path.quadraticCurveTo(
					relative.add(segment.x1, segment.y1),
					point
				);
				break;
			case 16:
			case 17:
				var prev = list.getItem(i - 1),
					control = lastPoint.add(lastPoint.subtract(
						Point.create(prev.x2, prev.y2)
							.subtract(prev.x, prev.y)
							.add(lastPoint)));
				path.cubicCurveTo(
					control,
					relative.add(segment.x2, segment.y2),
					point);
				break;
			case 18:
			case 19:
				var control,
					j = i;
				for (; j >= 0; j--) {
					var prev = list.getItem(j);
					if (prev.pathSegType === 8 ||
							prev.pathSegType === 9) {
						control = Point.create(prev.x1, prev.y1)
								.subtract(prev.x, prev.y)
								.add(path._segments[j].getPoint());
						break;
					}
				}
				for (; j < i; ++j) {
					var anchor = path._segments[j].getPoint();
					control = anchor.add(anchor.subtract(control));
				}
				path.quadraticCurveTo(control, point);
				break;
			}
		}
		return compoundPath || path;
	}

	function importGradient(node, type) {
		var nodes = node.childNodes,
			stops = [];
		for (var i = 0, l = nodes.length; i < l; i++) {
			var child = nodes[i];
			if (child.nodeType == 1)
				stops.push(applyAttributes(new GradientStop(), child));
		}
		var gradient = new Gradient(stops),
			isRadial = type == 'radialgradient',
			origin, destination, highlight;
		if (isRadial) {
			gradient.type = 'radial';
			origin = getPoint(node, 'cx', 'cy');
			destination = origin.add(getValue(node, 'r'), 0);
			highlight = getPoint(node, 'fx', 'fy', true);
		} else {
			origin = getPoint(node, 'x1', 'y1');
			destination = getPoint(node, 'x2', 'y2');
		}
		applyAttributes(
			new GradientColor(gradient, origin, destination, highlight), node);
		return null;
	}

	var importers = {
		g: importGroup,
		svg: importGroup,
		clippath: importGroup,
		polygon: importPoly,
		polyline: importPoly,
		path: importPath,
		lineargradient: importGradient,
		radialgradient: importGradient,

		image: function (node) {
			var raster = new Raster(getValue(node, 'href'));
			raster.attach('load', function() {
				var size = getSize(node, 'width', 'height');
				this.setSize(size);
				this.translate(getPoint(node, 'x', 'y').add(size.divide(2)));
			});
			return raster;
		},

		symbol: function(node, type) {
			return new Symbol(importGroup(node, type));
		},

		defs: importGroup,

		use: function(node, type) {
			var id = (getValue(node, 'href') || '').substring(1),
				definition = definitions[id];
			return definition
					? definition instanceof Symbol
						? definition.place()
						: definition.clone()
					: null;
		},

		circle: function(node) {
			return new Path.Circle(getPoint(node, 'cx', 'cy'),
					getValue(node, 'r'));
		},

		ellipse: function(node) {
			var center = getPoint(node, 'cx', 'cy'),
				radius = getSize(node, 'rx', 'ry');
			return new Path.Ellipse(new Rectangle(center.subtract(radius),
					center.add(radius)));
		},

		rect: function(node) {
			var point = getPoint(node, 'x', 'y'),
				size = getSize(node, 'width', 'height'),
				radius = getSize(node, 'rx', 'ry');
			return new Path.RoundRectangle(new Rectangle(point, size), radius);
		},

		line: function(node) {
			return new Path.Line(getPoint(node, 'x1', 'y1'),
					getPoint(node, 'x2', 'y2'));
		},

		text: function(node) {
			var text = new PointText(getPoint(node, 'x', 'y', false, 0)
					.add(getPoint(node, 'dx', 'dy', false, 0)));
			text.setContent(node.textContent || '');
			return text;
		}
	};

	function applyAttributes(item, node) {
		for (var i = 0, l = node.style.length; i < l; i++) {
			var name = node.style[i];
			item = applyAttribute(item, node, name, node.style[Base.camelize(name)]);
		}
		for (var i = 0, l = node.attributes.length; i < l; i++) {
			var attr = node.attributes[i];
			item = applyAttribute(item, node, attr.name, attr.value);
		}
		return item;
	}

	 function applyAttribute(item, node, name, value) {
		if (value == null)
			return item;
		var entry = SvgStyles.attributes[name];
		if (entry) {
			item._style[entry.set](convertValue(value, entry.type));
		} else {
			switch (name) {
			case 'id':
				definitions[value] = item;
				if (item.setName)
					item.setName(value);
				break;
			case 'clip-path':
				item = createClipGroup(item,
					getDefinition(value).clone().reduce());
				break;
			case 'gradientTransform':
			case 'transform':
				var transforms = node[name].baseVal,
					matrix = new Matrix();
				for (var i = 0, l = transforms.numberOfItems; i < l; i++) {
					var mx = transforms.getItem(i).matrix;
					matrix.concatenate(
						new Matrix(mx.a, mx.b, mx.c, mx.d, mx.e, mx.f));
				}
				item.transform(matrix);
				break;
			case 'stop-opacity':
			case 'opacity':
				var opacity = Base.toFloat(value);
				if (name === 'stop-opacity') {
					item.color.setAlpha(opacity);
				} else {
					item.setOpacity(opacity);
				}
				break;
			case 'fill-opacity':
			case 'stroke-opacity':
				var color = item[name == 'fill-opacity' ? 'getFillColor'
						: 'getStrokeColor']();
				if (color)
					color.setAlpha(Base.toFloat(value));
				break;
			case 'visibility':
				item.setVisible(value === 'visible');
				break;
			case 'font':
			case 'font-family':
			case 'font-size':
			case 'text-anchor':
				applyTextAttribute(item, node, name, value);
				break;
			case 'stop-color':
				item.setColor(value);
				break;
			case 'offset':
				var percentage = value.match(/(.*)%$/);
				item.setRampPoint(percentage ? percentage[1] / 100 : value);
				break;
			case 'viewBox':
				if (item instanceof Symbol)
					break;
				var values = convertValue(value, 'array'),
					rectangle = Rectangle.create.apply(this, values),
					size = getSize(node, 'width', 'height', true),
					scale = size ? rectangle.getSize().divide(size) : 1,
					offset = rectangle.getPoint(),
					matrix = new Matrix().translate(offset).scale(scale);
				item.transform(matrix.inverted());
				if (size)
					rectangle.setSize(size);
				rectangle.setPoint(0);
				item = createClipGroup(item, new Path.Rectangle(rectangle));
				break;
			}
		}
		return item;
	}

	function applyTextAttribute(item, node, name, value) {
		if (item instanceof TextItem) {
			switch (name) {
			case 'font':
				var text = document.createElement('span');
				text.style.font = value;
				for (var i = 0; i < text.style.length; i++) {
					var name = text.style[i];
					item = applyAttribute(item, node, name, text.style[name]);
				}
				break;
			case 'font-family':
				item.setFont(value.split(',')[0].replace(/^\s+|\s+$/g, ''));
				break;
			case 'font-size':
				item.setFontSize(Base.toFloat(value));
				break;
			case 'text-anchor':
				item.setJustification({
					start: 'left',
					middle: 'center',
					end: 'right'
				}[value]);
				break;
			}
		} else if (item instanceof Group) {
			var children = item._children;
			for (var i = 0, l = children.length; i < l; i++) {
				applyTextAttribute(children[i], node, name, value);
			}
		}
	}

	var definitions = {};
	function getDefinition(value) {
		var match = value.match(/\(#([^)']+)/);
        return match && definitions[match[1]];
	}

	function importSvg(node, clearDefs) {
		var type = node.nodeName.toLowerCase(),
			importer = importers[type],
			item = importer && importer(node, type);
		// See importGroup() for an explanation of this filtering:
		if (item && item._type !== 'group')
			item = applyAttributes(item, node);
		// Clear definitions at the end of import?
		if (clearDefs)
			definitions = {};
		return item;
	}

	Item.inject(/** @lends Item# */{
		/**
		 * Converts the passed node node into a Paper.js item and adds it to the
		 * children of this item.
		 *
		 * @param {SVGSVGElement} node the SVG DOM node to convert
		 * @return {Item} the converted Paper.js item
		 */
		importSvg: function(node) {
			return this.addChild(importSvg(node, true));
		}
	});

	Project.inject(/** @lends Project# */{
		/**
		 * Converts the passed node node into a Paper.js item and adds it to the
		 * active layer of this project.
		 *
		 * @param {SVGSVGElement} node the SVG DOM node to convert
		 * @return {Item} the converted Paper.js item
		 */
		importSvg: function(node) {
			this.activate();
			return importSvg(node, true);
		}
	});
};

/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name Style
 *
 * @class Internal base-class for all style objects, e.g. PathStyle,
 * CharacterStyle, PargraphStyle.
 *
 * @private
 */
var Style = Base.extend({
	initialize: function(style) {
		// If the passed style object is also a Style, clone its clonable
		// fields rather than simply copying them.
		var clone = style instanceof Style;
		// Note: This relies on bean getters and setters that get implicetly
		// called when getting from style[key] and setting on this[key].
		return Base.each(this._defaults, function(value, key) {
			value = style && style[key] || value;
			this[key] = value && clone && value.clone
					? value.clone() : value;
		}, this);
	},

	/**
	 * Returns the children to be used to unify style attributes, if any.
	 */
	_getChildren: function() {
		// Only unify styles on children of Group items, excluding CompoundPath.
		return this._item instanceof Group && this._item._children;
	},

	statics: {
		create: function(item) {
			var style = Base.create(this);
			style._item = item;
			return style;
		},

		extend: function(src) {
			// Inject style getters and setters into the 'owning' class, which
			// redirect calls to the linked style objects through their internal
			// property on the instances of that class, as defined by _style.
			var styleKey = '_' + src._style,
				stylePart = Base.capitalize(src._style),
				flags = src._flags || {},
				owner = {};

			// Define accessor on owner class for this style:
			owner['get' + stylePart] = function() {
				return this[styleKey];
			};

			owner['set' + stylePart] = function(style) {
				this[styleKey].initialize(style);
			};

			Base.each(src._defaults, function(value, key) {
				var isColor = /Color$/.test(key),
					part = Base.capitalize(key),
					set = 'set' + part,
					get = 'get' + part;
				// Simply extend src with these getters and setters, to be
				// injected into this class using this.base() further down.
				src[set] = function(value) {
					var children = this._getChildren();
					// Clone color objects since they reference their owner
					value = isColor ? Color.read(arguments, 0, 0, true) : value;
					if (children && children.length > 0) {
						for (var i = 0, l = children.length; i < l; i++)
							children[i][styleKey][set](value);
					} else {
						var old = this['_' + key];
						if (!Base.equals(old, value)) {
							if (isColor) {
								if (old)
									delete old._owner;
								if (value) {
									value._owner = this._item;
								}
							}
							this['_' + key] = value;
							// Notify the item of the style change STYLE is
							// always set, additional flags come from _flags,
							// as used for STROKE:
							if (this._item)
								this._item._changed(flags[key] || 17);
						}
					}
				};
				src[get] = function() {
					var children = this._getChildren(),
						style;
					// If this item has children, walk through all of them and
					// see if they all have the same style.
					if (!children || children.length === 0)
						return this['_' + key];
					for (var i = 0, l = children.length; i < l; i++) {
						var childStyle = children[i][styleKey][get]();
						if (!style) {
							style = childStyle;
						} else if (!Base.equals(style, childStyle)) {
							// If there is another item with a different
							// style, the style is not defined:
							return undefined;
						}
					}
					return style;
				};
				// Style-getters and setters for owner class:
				owner[set] = function(value) {
					this[styleKey][set](value);
					return this;
				};
				owner[get] = function() {
					return this[styleKey][get]();
				};
			});
			src._owner.inject(owner);
			// Pass on to base()
			return this.base.apply(this, arguments);
		}
	}
});

/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name PathStyle
 *
 * @class PathStyle is used for changing the visual styles of items
 * contained within a Paper.js project and is returned by
 * {@link Item#style} and {@link Project#currentStyle}.
 *
 * All properties of PathStyle are also reflected directly in {@link Item},
 * i.e.: {@link Item#fillColor}.
 *
 * To set multiple style properties in one go, you can pass an object to
 * {@link Item#style}. This is a convenient way to define a style once and
 * apply it to a series of items:
 *
 * @classexample {@paperscript}
 * var circleStyle = {
 * 	fillColor: new RgbColor(1, 0, 0),
 * 	strokeColor: 'black',
 * 	strokeWidth: 5
 * };
 *
 * var path = new Path.Circle(new Point(80, 50), 30);
 * path.style = circleStyle;
 */
var PathStyle = this.PathStyle = Style.extend(/** @lends PathStyle# */{
	_owner: Item,
	_style: 'style',
	// windingRule / resolution / fillOverprint / strokeOverprint are currently
	// not supported.
	_defaults: {
		fillColor: undefined,
		strokeColor: undefined,
		strokeWidth: 1,
		strokeCap: 'butt',
		strokeJoin: 'miter',
		miterLimit: 10,
		dashOffset: 0,
		dashArray: []
	},
	_flags: {
		strokeWidth: 25,
		strokeCap: 25,
		strokeJoin: 25,
		miterLimit: 25
	}

	// DOCS: why isn't the example code showing up?

});

var ParagraphStyle = this.ParagraphStyle = Style.extend({
	_owner: TextItem,
	_style: 'paragraphStyle',
	_defaults: {
		justification: 'left'
	},
	_flags: {
		justification: 5
	}

});

var CharacterStyle = this.CharacterStyle = PathStyle.extend({
	_owner: TextItem,
	_style: 'style',
	_defaults: Base.merge(PathStyle.prototype._defaults, {
		fillColor: 'black',
		fontSize: 12,
		leading: null,
		font: 'sans-serif'
	}),
	_flags: {
		fontSize: 5,
		leading: 5,
		font: 5
	}

}, {
	getLeading: function() {
		var leading = this.base();
		return leading != null ? leading : this.getFontSize() * 1.2;
	},

	getFontStyle: function() {
		var size = this._fontSize;
		return (/[a-z]/i.test(size) ? size + ' ' : size + 'px ') + this._font;
	}
});

var Color = this.Color = Base.extend(new function() {

	var components = {
		gray: ['gray'],
		rgb: ['red', 'green', 'blue'],
		hsl: ['hue', 'saturation', 'lightness'],
		hsb: ['hue', 'saturation', 'brightness']
	};

	var colorCache = {},
		colorCtx;

	function nameToRgbColor(name) {
		var color = colorCache[name];
		if (color)
			return color.clone();
		if (!colorCtx) {
			colorCtx = CanvasProvider.getContext(1, 1);
			colorCtx.globalCompositeOperation = 'copy';
		}
		colorCtx.fillStyle = 'rgba(0,0,0,0)';
		colorCtx.fillStyle = name;
		colorCtx.fillRect(0, 0, 1, 1);
		var data = colorCtx.getImageData(0, 0, 1, 1).data,
			rgb = [data[0] / 255, data[1] / 255, data[2] / 255];
		return (colorCache[name] = RgbColor.read(rgb)).clone();
	}

	function hexToRgbColor(string) {
		var hex = string.match(/^#?(\w{1,2})(\w{1,2})(\w{1,2})$/);
		if (hex.length >= 4) {
			var rgb = new Array(3);
			for (var i = 0; i < 3; i++) {
				var channel = hex[i + 1];
				rgb[i] = parseInt(channel.length == 1
						? channel + channel : channel, 16) / 255;
			}
			return RgbColor.read(rgb);
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
				h = delta == 0 ? 0
					:   ( max == r ? (g - b) / delta + (g < b ? 6 : 0)
						: max == g ? (b - r) / delta + 2
						:            (r - g) / delta + 4) * 60, 
				s = max == 0 ? 0 : delta / max,
				v = max; 
			return new HsbColor(h, s, v, color._alpha);
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
			return new RgbColor(v[i[0]], v[i[1]], v[i[2]], color._alpha);
		},

		'rgb-hsl': function(color) {
			var r = color._red,
				g = color._green,
				b = color._blue,
				max = Math.max(r, g, b),
				min = Math.min(r, g, b),
				delta = max - min,
				achromatic = delta == 0,
				h = achromatic ? 0
					:   ( max == r ? (g - b) / delta + (g < b ? 6 : 0)
						: max == g ? (b - r) / delta + 2
						:            (r - g) / delta + 4) * 60, 
				l = (max + min) / 2,
				s = achromatic ? 0 : l < 0.5
						? delta / (max + min)
						: delta / (2 - max - min);
			return new HslColor(h, s, l, color._alpha);
		},

		'hsl-rgb': function(color) {
			var s = color._saturation,
				h = color._hue / 360,
				l = color._lightness;
			if (s == 0)
				return new RgbColor(l, l, l, color._alpha);
			var t3s = [ h + 1 / 3, h, h - 1 / 3 ],
				t2 = l < 0.5 ? l * (1 + s) : l + s - l * s,
				t1 = 2 * l - t2,
				c = [];
			for (var i = 0; i < 3; i++) {
				var t3 = t3s[i];
				if (t3 < 0) t3 += 1;
				if (t3 > 1) t3 -= 1;
				c[i] = 6 * t3 < 1
					? t1 + (t2 - t1) * 6 * t3
					: 2 * t3 < 1
						? t2
						: 3 * t3 < 2
							? t1 + (t2 - t1) * ((2 / 3) - t3) * 6
							: t1;
			}
			return new RgbColor(c[0], c[1], c[2], color._alpha);
		},

		'rgb-gray': function(color) {
			return new GrayColor(1 - (color._red * 0.2989 + color._green * 0.587
					+ color._blue * 0.114), color._alpha);
		},

		'gray-rgb': function(color) {
			var comp = 1 - color._gray;
			return new RgbColor(comp, comp, comp, color._alpha);
		},

		'gray-hsb': function(color) {
			return new HsbColor(0, 0, 1 - color._gray, color._alpha);
		},

		'gray-hsl': function(color) {
			return new HslColor(0, 0, 1 - color._gray, color._alpha);
		}
	};

	var fields = {
		_readNull: true,
		_readIndex: true,

		initialize: function(arg) {
			var isArray = Array.isArray(arg),
				type = this._type,
				res;
			if (typeof arg === 'object' && !isArray) {
				if (!type) {
					res = arg.red !== undefined
						? new RgbColor(arg.red, arg.green, arg.blue, arg.alpha)
						: arg.gray !== undefined
						? new GrayColor(arg.gray, arg.alpha)
						: arg.lightness !== undefined
						? new HslColor(arg.hue, arg.saturation, arg.lightness,
								arg.alpha)
						: arg.hue !== undefined
						? new HsbColor(arg.hue, arg.saturation, arg.brightness,
								arg.alpha)
						: new RgbColor(); 
					if (this._read)
						res._read = 1;
				} else {
					res = Color.read(arguments).convert(type);
					if (this._read)
						res._read = arguments._read;
				}
			} else if (typeof arg === 'string') {
				var rgbColor = arg.match(/^#[0-9a-f]{3,6}$/i)
						? hexToRgbColor(arg)
						: nameToRgbColor(arg);
				res = type
						? rgbColor.convert(type)
						: rgbColor;
				if (this._read)
					res._read = 1;
			} else {
				var components = isArray ? arg
						: Array.prototype.slice.call(arguments);
				if (!type) {
					var ctor = components.length >= 3
							? RgbColor
							: GrayColor;
					res = new ctor(components);
				} else {
					res = Base.each(this._components,
						function(name, i) {
							var value = components[i];
							this['_' + name] = value !== undefined
									? value : null;
						},
					this);
				}
				if (this._read)
					res._read = res._components.length;
			}
			return res;
		},

		_serialize: function(options) {
			var res = [];
			for (var i = 0, l = this._components.length; i < l; i++) {
				var component = this._components[i],
					value = this['_' + component];
				if (component !== 'alpha' || value != null && value < 1)
					res.push(Base.formatFloat(value, options.precision));
			}
			return res;
		},

		clone: function() {
			var copy = Base.create(this.constructor),
				components = this._components;
			for (var i = 0, l = components.length; i < l; i++) {
				var key = '_' + components[i];
				copy[key] = this[key];
			}
			return copy;
		},

		convert: function(type) {
			var converter;
			return this._type == type
					? this.clone()
					: (converter = converters[this._type + '-' + type])
						? converter(this)
						: converters['rgb-' + type](
								converters[this._type + '-rgb'](this));
		},

		statics: {
			extend: function(src) {
				var comps = components[src._type];
				if (comps) {
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
							this._changed();
							return this;
						};
					}, src);
				}
				return this.base.apply(this, arguments);
			},

			random: function() {
				return new RgbColor(Math.random(), Math.random(), Math.random());
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
				color = color.convert(this._type);
				for (var i = 0, l = this._components.length; i < l; i++) {
					var key = this._components[i];
					this[key] = color[key];
				}
			};
		});
	});

	return fields;
}, {

	_changed: function() {
		this._css = null;
		if (this._owner)
			this._owner._changed(17);
	},

	getType: function() {
		return this._type;
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
		this._changed();
		return this;
	},

	hasAlpha: function() {
		return this._alpha != null;
	},

	equals: function(color) {
		if (color && color._type === this._type) {
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
			format = Base.formatFloat;
		for (var i = 0, l = this._components.length; i < l; i++) {
			var component = this._components[i],
				value = this['_' + component];
			if (component === 'alpha' && value == null)
				value = 1;
			parts.push(component + ': ' + format(value));
		}
		return '{ ' + parts.join(', ') + ' }';
	},

	toCss: function(noAlpha) {
		var css = this._css;
		if (!css || noAlpha) {
			var color = this.convert('rgb'),
				alpha = noAlpha ? 1 : color.getAlpha(),
				components = [
					Math.round(color._red * 255),
					Math.round(color._green * 255),
					Math.round(color._blue * 255)
				];
			if (alpha < 1)
				components.push(alpha);
			var css = (components.length == 4 ? 'rgba(' : 'rgb(')
					+ components.join(', ') + ')';
			if (!noAlpha)
				this._css = css;
		}
		return css;
	},

	getCanvasStyle: function() {
		return this.toCss();
	}

});

var GrayColor = this.GrayColor = Color.extend({

	_type: 'gray'
});

var RgbColor = this.RgbColor = this.RGBColor = Color.extend({

	_type: 'rgb'
});

var HsbColor = this.HsbColor = this.HSBColor = Color.extend({

	_type: 'hsb'
});

var HslColor = this.HslColor = this.HSLColor = Color.extend({

	_type: 'hsl'
});

var GradientColor = this.GradientColor = Color.extend({
	_type: 'gradientcolor',

	initialize: function(gradient, origin, destination, hilite) {
		this._id = ++Base._uid;
		this.gradient = gradient || new Gradient();
		this.gradient._addOwner(this);
		this.setOrigin(origin);
		this.setDestination(destination);
		if (hilite)
			this.setHilite(hilite);
	},

	clone: function() {
		return new GradientColor(this.gradient, this._origin, this._destination,
				this._hilite);
	},

	_serialize: function(options, dictionary) {
		var values = [ this.gradient, this._origin, this._destination ];
		if (this._hilite)
			values.push(this._hilite);
		return Base.serialize(values, options, true, dictionary);
	},

	getOrigin: function() {
		return this._origin;
	},

	setOrigin: function(origin) {
		origin = Point.read(arguments, 0, 0, true); 
		this._origin = origin;
		if (this._destination)
			this._radius = this._destination.getDistance(this._origin);
		this._changed();
		return this;
	},

	getDestination: function() {
		return this._destination;
	},

	setDestination: function(destination) {
		destination = Point.read(arguments, 0, 0, true); 
		this._destination = destination;
		this._radius = this._destination.getDistance(this._origin);
		this._changed();
		return this;
	},

	getHilite: function() {
		return this._hilite;
	},

	setHilite: function(hilite) {
		hilite = Point.read(arguments, 0, 0, true); 
		var vector = hilite.subtract(this._origin);
		if (vector.getLength() > this._radius) {
			this._hilite = this._origin.add(
					vector.normalize(this._radius - 0.1));
		} else {
			this._hilite = hilite;
		}
		this._changed();
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
			gradient.addColorStop(stop._rampPoint, stop._color.toCss());
		}
		return gradient;
	},

	equals: function(color) {
		return color == this || color && color._type === this._type
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
	_type: 'gradient',

	initialize: function(stops, type) {
		this._id = ++Base._uid;
		this.setStops(stops || ['white', 'black']);
		this.type = type || 'linear';
	},

	_serialize: function(options, dictionary) {
		return dictionary.add(this, function() {
			return Base.serialize([this._type, this._stops, this.type],
					options, true, dictionary);
		});
	},

	_changed: function() {
		for (var i = 0, l = this._owners && this._owners.length; i < l; i++)
			this._owners[i]._changed();
	},

	_addOwner: function(color) {
		if (!this._owners)
			this._owners = [];
		this._owners.push(color);
	},

	_removeOwner: function(color) {
		var index = this._owners ? this._owners.indexOf(color) : -1;
		if (index != -1) {
			this._owners.splice(index, 1);
			if (this._owners.length == 0)
				delete this._owners;
		}
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
		if (this.stops) {
			for (var i = 0, l = this._stops.length; i < l; i++)
				delete this._stops[i]._owner;
		}
		if (stops.length < 2)
			throw new Error(
					'Gradient stop list needs to contain at least two stops.');
		this._stops = GradientStop.readAll(stops, 0, true); 
		for (var i = 0, l = this._stops.length; i < l; i++) {
			var stop = this._stops[i];
			stop._owner = this;
			if (stop._defaultRamp)
				stop.setRampPoint(i / (l - 1));
		}
		this._changed();
		return this;
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
	initialize: function(arg0, arg1) {
		if (arg0) {
			var color, rampPoint;
			if (arg1 === undefined && Array.isArray(arg0)) {
				color = arg0[0];
				rampPoint = arg0[1];
			} else if (arg0.color) {
				color = arg0.color;
				rampPoint = arg0.rampPoint;
			} else {
				color = arg0;
				rampPoint = arg1;
			}
			this.setColor(color);
			this.setRampPoint(rampPoint);
		}
	},

	clone: function() {
		return new GradientStop(this._color.clone(), this._rampPoint);
	},

	_serialize: function(options, dictionary) {
		return Base.serialize([this._color, this._rampPoint], options, false, 
				dictionary);
	},

	_changed: function() {
		if (this._owner)
			this._owner._changed(17);
	},

	getRampPoint: function() {
		return this._rampPoint;
	},

	setRampPoint: function(rampPoint) {
		this._defaultRamp = rampPoint == null;
		this._rampPoint = rampPoint || 0;
		this._changed();
	},

	getColor: function() {
		return this._color;
	},

	setColor: function(color) {
		this._color = Color.read(arguments);
		if (this._color === color)
			this._color = color.clone();
		this._color._owner = this;
		this._changed();
	},

	equals: function(stop) {
		return stop == this || stop instanceof GradientStop
				&& this._color.equals(stop._color)
				&& this._rampPoint == stop._rampPoint;
	}
});

var DomElement = new function() {

	var special = /^(checked|value|selected|disabled)$/i,
		translated = { text: 'textContent', html: 'innerHTML' },
		unitless = { lineHeight: 1, zoom: 1, zIndex: 1, opacity: 1 };

	function create(nodes, parent) {
		var res = [];
		for (var i =  0, l = nodes && nodes.length; i < l;) {
			var el = nodes[i++];
			if (typeof el === 'string') {
				el = document.createElement(el);
			} else if (!el || !el.nodeType) {
				continue;
			}
			if (Base.isPlainObject(nodes[i]))
				DomElement.set(el, nodes[i++]);
			if (Array.isArray(nodes[i]))
				create(nodes[i++], el);
			if (parent)
				parent.appendChild(el);
			res.push(el);
		}
		return res;
	}

	return {
		create: function(nodes, parent) {
			var isArray = Array.isArray(nodes),
				res = create(isArray ? nodes : arguments, isArray ? parent : null);
			return res.length == 1 ? res[0] : res;
		},

		find: function(selector, root) {
			return (root || document).querySelector(selector);
		},

		findAll: function(selector, root) {
			return (root || document).querySelectorAll(selector);
		},

		get: function(el, key) {
			return el
				? special.test(key)
					? key === 'value' || typeof el[key] !== 'string'
						? el[key]
						: true
					: key in translated
						? el[translated[key]]
						: el.getAttribute(key)
				: null;
		},

		set: function(el, key, value) {
			if (typeof key !== 'string') {
				for (var name in key)
					if (key.hasOwnProperty(name))
						this.set(el, name, key[name]);
			} else if (!el || value === undefined) {
				return el;
			} else if (special.test(key)) {
				el[key] = value;
			} else if (key in translated) {
				el[translated[key]] = value;
			} else if (key === 'style') {
				this.setStyle(el, value);
			} else if (key === 'events') {
				DomEvent.add(el, value);
			} else {
				el.setAttribute(key, value);
			}
			return el;
		},

		getStyle: function(el, key) {
			var style = el.ownerDocument.defaultView.getComputedStyle(el, '');
			return el.style[key] || style && style[key] || null;
		},

		setStyle: function(el, key, value) {
			if (typeof key !== 'string') {
				for (var name in key)
					if (key.hasOwnProperty(name))
						this.setStyle(el, name, key[name]);
			} else {
				if (/^-?[\d\.]+$/.test(value) && !(key in unitless))
					value += 'px';
				el.style[key] = value;
			}
			return el;
		},

		hasClass: function(el, cls) {
			return new RegExp('\\s*' + cls + '\\s*').test(el.className);
		},

		addClass: function(el, cls) {
			el.className = (el.className + ' ' + cls).trim();
		},

		removeClass: function(el, cls) {
			el.className = el.className.replace(
				new RegExp('\\s*' + cls + '\\s*'), ' ').trim();
		},

		remove: function(el) {
			if (el.parentNode)
				el.parentNode.removeChild(el);
		},

		removeChildren: function(el) {
			while (el.firstChild)
				el.removeChild(el.firstChild);
		},

		getBounds: function(el, viewport) {
			var rect = el.getBoundingClientRect(),
				doc = el.ownerDocument,
				body = doc.body,
				html = doc.documentElement,
				x = rect.left - (html.clientLeft || body.clientLeft || 0),
				y = rect.top - (html.clientTop  || body.clientTop  || 0);
			if (!viewport) {
				var view = doc.defaultView;
				x += view.pageXOffset || html.scrollLeft || body.scrollLeft;
				y += view.pageYOffset || html.scrollTop || body.scrollTop;
			}
			return new Rectangle(x, y, rect.width, rect.height);
		},

		getViewportBounds: function(el) {
			var doc = el.ownerDocument,
				view = doc.defaultView,
				html = doc.documentElement;
			return Rectangle.create(0, 0, 
				view.innerWidth || html.clientWidth,
				view.innerHeight || html.clientHeight
			);
		},

		getOffset: function(el, viewport) {
			return this.getBounds(el, viewport).getPoint();
		},

		getSize: function(el) {
			return this.getBounds(el, true).getSize();
		},

		isInvisible: function(el) {
			return this.getSize(el).equals([0, 0]);
		},

		isInView: function(el) {
			return !this.isInvisible(el) && this.getViewportBounds(el).intersects(
					this.getBounds(el, true));
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

	getTarget: function(event) {
		return event.target || event.srcElement;
	},

	getOffset: function(event, target) {
		return DomEvent.getPoint(event).subtract(DomElement.getOffset(
				target || DomEvent.getTarget(event)));
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
	},

	stop: function(event) {
		DomEvent.stopPropagation(event);
		DomEvent.preventDefault(event);
	}
};

DomEvent.requestAnimationFrame = new function() {
	var part = 'equestAnimationFrame',
		request = window['r' + part] || window['webkitR' + part]
			|| window['mozR' + part] || window['oR' + part]
			|| window['msR' + part];
	if (request) {
		request(function(time) {
			if (time == null)
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
		if (timer)
			return;
		timer = setInterval(function() {
			for (var i = callbacks.length - 1; i >= 0; i--) {
				var entry = callbacks[i],
					func = entry[0],
					el = entry[1];
				if (!el || (PaperScript.getAttribute(el, 'keepalive') == 'true'
						|| focused) && DomElement.isInView(el)) {
					callbacks.splice(i, 1);
					func(Date.now());
				}
			}
		}, 1000 / 60);
	};
};

var View = this.View = Base.extend(Callback, {
	initialize: function(element) {
		this._scope = paper;
		this._project = paper.project;
		this._element = element;
		var size;
		this._id = element.getAttribute('id');
		if (this._id == null)
			element.setAttribute('id', this._id = 'view-' + View._id++);
		DomEvent.add(element, this._viewHandlers);
		if (PaperScript.hasAttribute(element, 'resize')) {
			var offset = DomElement.getOffset(element, true),
				that = this;
			size = DomElement.getViewportBounds(element)
					.getSize().subtract(offset);
			this._windowHandlers = {
				resize: function(event) {
					if (!DomElement.isInvisible(element))
						offset = DomElement.getOffset(element, true);
					that.setViewSize(DomElement.getViewportBounds(element)
							.getSize().subtract(offset));
				}
			};
			DomEvent.add(window, this._windowHandlers);
		} else {
			size = Size.create(parseInt(element.getAttribute('width'), 10),
						parseInt(element.getAttribute('height'), 10));
		}
		element.width = size.width;
		element.height = size.height;
		if (PaperScript.hasAttribute(element, 'stats')) {
			this._stats = new Stats();
			var stats = this._stats.domElement,
				style = stats.style,
				offset = DomElement.getOffset(element);
			style.position = 'absolute';
			style.left = offset.x + 'px';
			style.top = offset.y + 'px';
			document.body.appendChild(stats);
		}
		View._views.push(this);
		View._viewsById[this._id] = this;
		this._viewSize = LinkedSize.create(this, 'setViewSize',
				size.width, size.height);
		this._matrix = new Matrix();
		this._zoom = 1;
		if (!View._focused)
			View._focused = this;
		this._frameItems = {};
		this._frameItemCount = 0;
	},

	remove: function() {
		if (!this._project)
			return false;
		if (View._focused == this)
			View._focused = null;
		View._views.splice(View._views.indexOf(this), 1);
		delete View._viewsById[this._id];
		if (this._project.view == this)
			this._project.view = null;
		DomEvent.remove(this._element, this._viewHandlers);
		DomEvent.remove(window, this._windowHandlers);
		this._element = this._project = null;
		this.detach('frame');
		this._frameItems = {};
		return true;
	},

	_events: {
		onFrame: {
			install: function() {
				if (!this._requested) {
					this._animate = true;
					this._handleFrame(true);
				}
			},

			uninstall: function() {
				this._animate = false;
			}
		},

		onResize: {}
	},

	_animate: false,
	_time: 0,
	_count: 0,

	_handleFrame: function(request) {
		this._requested = false;
		if (!this._animate)
			return;
		paper = this._scope;
		if (request) {
			this._requested = true;
			var that = this;
			DomEvent.requestAnimationFrame(function() {
				that._handleFrame(true);
			}, this._element);
		}
		var now = Date.now() / 1000,
			delta = this._before ? now - this._before : 0;
		this._before = now;
		this.fire('frame', Base.merge({
			delta: delta,
			time: this._time += delta,
			count: this._count++
		}));
		if (this._stats)
			this._stats.update();
		this.draw(true);
	},

	_animateItem: function(item, animate) {
		var items = this._frameItems;
		if (animate) {
			items[item._id] = {
				item: item,
				time: 0,
				count: 0
			};
			if (++this._frameItemCount == 1)
				this.attach('frame', this._handleFrameItems);
		} else {
			delete items[item._id];
			if (--this._frameItemCount == 0) {
				this.detach('frame', this._handleFrameItems);
			}
		}
	},

	_handleFrameItems: function(event) {
		for (var i in this._frameItems) {
			var entry = this._frameItems[i];
			entry.item.fire('frame', Base.merge(event, {
				time: entry.time += event.delta,
				count: entry.count++
			}));
		}
	},

	_redraw: function() {
		this._redrawNeeded = true;
		if (this._animate) {
			this._handleFrame();
		} else {
			this.draw();
		}
	},

	_transform: function(matrix) {
		this._matrix.concatenate(matrix);
		this._bounds = null;
		this._inverse = null;
		this._redraw();
	},

	getElement: function() {
		return this._element;
	},

	getViewSize: function() {
		return this._viewSize;
	},

	setViewSize: function(size) {
		size = Size.read(arguments);
		var delta = size.subtract(this._viewSize);
		if (delta.isZero())
			return;
		this._element.width = size.width;
		this._element.height = size.height;
		this._viewSize.set(size.width, size.height, true);
		this._bounds = null;
		this._redrawNeeded = true;
		this.fire('resize', {
			size: size,
			delta: delta
		});
		this._redraw();
	},

	getBounds: function() {
		if (!this._bounds)
			this._bounds = this._getInverse()._transformBounds(
					new Rectangle(new Point(), this._viewSize));
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
		this._transform(new Matrix().scale(zoom / this._zoom,
			this.getCenter()));
		this._zoom = zoom;
	},

	isVisible: function() {
		return DomElement.isInView(this._element);
	},

	scrollBy: function(point) {
		this._transform(new Matrix().translate(Point.read(arguments).negate()));
	},

	projectToView: function(point) {
		return this._matrix._transformPoint(Point.read(arguments));
	},

	viewToProject: function(point) {
		return this._getInverse()._transformPoint(Point.read(arguments));
	},

	_getInverse: function() {
		if (!this._inverse)
			this._inverse = this._matrix.inverted();
		return this._inverse;
	}

}, {
	statics: {
		_views: [],
		_viewsById: {},
		_id: 0,

		create: function(element) {
			if (typeof element === 'string')
				element = document.getElementById(element);
			return new CanvasView(element);
		}
	}
}, new function() {
	var tool,
		curPoint,
		prevFocus,
		tempFocus,
		dragging = false;

	function getView(event) {
		var target = DomEvent.getTarget(event);
		return target.getAttribute && View._viewsById[target.getAttribute('id')];
	}

	function viewToProject(view, event) {
		return view.viewToProject(DomEvent.getOffset(event, view._element));
	}

	function updateFocus() {
		if (!View._focused || !View._focused.isVisible()) {
			for (var i = 0, l = View._views.length; i < l; i++) {
				var view = View._views[i];
				if (view && view.isVisible()) {
					View._focused = tempFocus = view;
					break;
				}
			}
		}
	}

	function mousedown(event) {
		var view = View._focused = getView(event);
		curPoint = viewToProject(view, event);
		dragging = true;
		if (view._onMouseDown)
			view._onMouseDown(event, curPoint);
		if (tool = view._scope._tool)
			tool._onHandleEvent('mousedown', curPoint, event);
		view.draw(true);
	}

	function mousemove(event) {
		var view;
		if (!dragging) {
			view = getView(event);
			if (view) {
				prevFocus = View._focused;
				View._focused = tempFocus = view;
			} else if (tempFocus && tempFocus == View._focused) {
				View._focused = prevFocus;
				updateFocus();
			}
		}
		if (!(view = view || View._focused))
			return;
		var point = event && viewToProject(view, event);
		if (view._onMouseMove)
			view._onMouseMove(event, point);
		if (tool = view._scope._tool) {
			var onlyMove = !!(!tool.onMouseDrag && tool.onMouseMove);
			if (dragging && !onlyMove) {
				if ((curPoint = point || curPoint) 
						&& tool._onHandleEvent('mousedrag', curPoint, event))
					DomEvent.stop(event);
			} else if ((!dragging || onlyMove)
					&& tool._onHandleEvent('mousemove', point, event)) {
				DomEvent.stop(event);
			}
		}
		view.draw(true);
	}

	function mouseup(event) {
		var view = View._focused;
		if (!view || !dragging)
			return;
		var point = viewToProject(view, event);
		curPoint = null;
		dragging = false;
		if (view._onMouseUp)
			view._onMouseUp(event, point);
		if (tool && tool._onHandleEvent('mouseup', point, event))
			DomEvent.stop(event);
		view.draw(true);
	}

	function selectstart(event) {
		if (dragging)
			DomEvent.stop(event);
	}

	DomEvent.add(document, {
		mousemove: mousemove,
		mouseup: mouseup,
		touchmove: mousemove,
		touchend: mouseup,
		selectstart: selectstart,
		scroll: updateFocus
	});

	DomEvent.add(window, {
		load: updateFocus
	});

	return {
		_viewHandlers: {
			mousedown: mousedown,
			touchstart: mousedown,
			selectstart: selectstart
		},

		statics: {
			updateFocus: updateFocus
		}
	};
});

var CanvasView = View.extend({
	initialize: function(canvas) {
		if (!(canvas instanceof HTMLCanvasElement)) {
			var size = Size.read(arguments, 1);
			if (size.isZero())
				size = Size.create(1024, 768);
			canvas = CanvasProvider.getCanvas(size);
		}
		this._context = canvas.getContext('2d');
		this._eventCounters = {};
		this.base(canvas);
	},

	draw: function(checkRedraw) {
		if (checkRedraw && !this._redrawNeeded)
			return false;
		var ctx = this._context,
			size = this._viewSize;
		ctx.clearRect(0, 0, size._width + 1, size._height + 1);
		this._project.draw(ctx, this._matrix);
		this._redrawNeeded = false;
		return true;
	}
}, new function() { 

	var hitOptions = {
		fill: true,
		stroke: true,
		tolerance: 0
	};

	var downPoint,
		lastPoint,
		overPoint,
		downItem,
		lastItem,
		overItem,
		hasDrag,
		doubleClick,
		clickTime;

	function callEvent(type, event, point, target, lastPoint, bubble) {
		var item = target,
			mouseEvent;
		while (item) {
			if (item.responds(type)) {
				if (!mouseEvent)
					mouseEvent = new MouseEvent(type, event, point, target,
							lastPoint ? point.subtract(lastPoint) : null);
				if (item.fire(type, mouseEvent)
						&& (!bubble || mouseEvent._stopped))
					return false;
			}
			item = item.getParent();
		}
		return true;
	}

	function handleEvent(view, type, event, point, lastPoint) {
		if (view._eventCounters[type]) {
			var hit = view._project.hitTest(point, hitOptions),
				item = hit && hit.item;
			if (item) {
				if (type == 'mousemove' && item != overItem)
					lastPoint = point;
				if (type != 'mousemove' || !hasDrag)
					callEvent(type, event, point, item, lastPoint);
				return item;
			}
		}
	}

	return {
		_onMouseDown: function(event, point) {
			var item = handleEvent(this, 'mousedown', event, point);
			doubleClick = lastItem == item && (Date.now() - clickTime < 300);
			downItem = lastItem = item;
			downPoint = lastPoint = overPoint = point;
			hasDrag = downItem && downItem.responds('mousedrag');
		},

		_onMouseUp: function(event, point) {
			var item = handleEvent(this, 'mouseup', event, point);
			if (hasDrag) {
				if (lastPoint && !lastPoint.equals(point))
					callEvent('mousedrag', event, point, downItem, lastPoint);
				if (item != downItem) {
					overPoint = point;
					callEvent('mousemove', event, point, item, overPoint);
				}
			}
			if (item == downItem) {
				clickTime = Date.now();
				if (!doubleClick
						|| callEvent('doubleclick', event, downPoint, overItem))
					callEvent('click', event, downPoint, overItem);
				doubleClick = false;
			}
			downItem = null;
			hasDrag = false;
		},

		_onMouseMove: function(event, point) {
			if (downItem)
				callEvent('mousedrag', event, point, downItem, lastPoint);
			var item = handleEvent(this, 'mousemove', event, point, overPoint);
			lastPoint = overPoint = point;
			if (item != overItem) {
				callEvent('mouseleave', event, point, overItem);
				overItem = item;
				callEvent('mouseenter', event, point, item);
			}
		}
	};
});

var Event = this.Event = Base.extend({
	initialize: function(event) {
		this.event = event;
	},

	preventDefault: function() {
		this._prevented = true;
		DomEvent.preventDefault(this.event);
		return this;
	},

	stopPropagation: function() {
		this._stopped = true;
		DomEvent.stopPropagation(this.event);
		return this;
	},

	stop: function() {
		return this.stopPropagation().preventDefault();
	},

	getModifiers: function() {
		return Key.modifiers;
	}
});

var KeyEvent = this.KeyEvent = Event.extend({
	initialize: function(down, key, character, event) {
		this.base(event);
		this.type = down ? 'keydown' : 'keyup';
		this.key = key;
		this.character = character;
	},

	toString: function() {
		return "{ type: '" + this.type
				+ "', key: '" + this.key
				+ "', character: '" + this.character
				+ "', modifiers: " + this.getModifiers()
				+ " }";
	}
});

var Key = this.Key = new function() {

	var keys = {
		8: 'backspace',
		9: 'tab',
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
		91: 'command',
		93: 'command', 
		224: 'command'  
	},

	modifiers = Base.merge({
		shift: false,
		control: false,
		option: false,
		command: false,
		capsLock: false,
		space: false
	}),

	charCodeMap = {}, 
	keyMap = {}, 
	downCode; 

	function handleKey(down, keyCode, charCode, event) {
		var character = String.fromCharCode(charCode),
			key = keys[keyCode] || character.toLowerCase(),
			type = down ? 'keydown' : 'keyup',
			view = View._focused,
			scope = view && view.isVisible() && view._scope,
			tool = scope && scope._tool;
		keyMap[key] = down;
		if (tool && tool.responds(type)) {
			tool.fire(type, new KeyEvent(down, key, character, event));
			if (view)
				view.draw(true);
		}
	}

	DomEvent.add(document, {
		keydown: function(event) {
			var code = event.which || event.keyCode;
			var key = keys[code], name;
			if (key) {
				if ((name = Base.camelize(key)) in modifiers)
					modifiers[name] = true;
				charCodeMap[code] = 0;
				handleKey(true, code, null, event);
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
			if (key && (name = Base.camelize(key)) in modifiers)
				modifiers[name] = false;
			if (charCodeMap[code] != null) {
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

var MouseEvent = this.MouseEvent = Event.extend({
	initialize: function(type, event, point, target, delta) {
		this.base(event);
		this.type = type;
		this.point = point;
		this.target = target;
		this.delta = delta;
	},

	toString: function() {
		return "{ type: '" + this.type
				+ "', point: " + this.point
				+ ', target: ' + this.target
				+ (this.delta ? ', delta: ' + this.delta : '')
				+ ', modifiers: ' + this.getModifiers()
				+ ' }';
	}
});

var Palette = this.Palette = Base.extend(Callback, {
	_events: [ 'onChange' ],

	initialize: function(title, components, values) {
		var parent = DomElement.find('.palettejs-panel')
			|| DomElement.find('body').appendChild(
				DomElement.create('div', { 'class': 'palettejs-panel' }));
		this._element = parent.appendChild(
			DomElement.create('table', { 'class': 'palettejs-pane' })),
		this._title = title;
		if (!values)
			values = {};
		for (var name in (this._components = components)) {
			var component = components[name];
			if (!(component instanceof Component)) {
				if (component.value == null)
					component.value = values[name];
				component.name = name;
				component = components[name] = new Component(component);
			}
			this._element.appendChild(component._element);
			component._palette = this;
			if (values[name] === undefined)
				values[name] = component.value;
		}
		this._values = Base.each(values, function(value, name) {
			var component = components[name];
			if (component) {
				Base.define(values, name, {
					enumerable: true,
					configurable: true,
					writable: true,
					get: function() {
						return component._value;
					},
					set: function(val) {
						component.setValue(val);
					}
				});
			}
		});
		if (window.paper)
			paper.palettes.push(this);
	},

	reset: function() {
		for (var i in this._components)
			this._components[i].reset();
	},

	remove: function() {
		DomElement.remove(this._element);
	}
});

var Component = this.Component = Base.extend(Callback, {
	_events: [ 'onChange', 'onClick' ],

	_types: {
		'boolean': {
			type: 'checkbox',
			value: 'checked'
		},

		string: {
			type: 'text'
		},

		number: {
			type: 'number',
			number: true
		},

		button: {
			type: 'button'
		},

		text: {
			tag: 'div',
			value: 'text'
		},

		slider: {
			type: 'range',
			number: true
		},

		list: {
			tag: 'select',

			options: function() {
				DomElement.removeChildren(this._inputItem);
				DomElement.create(Base.each(this._options, function(option) {
					this.push('option', { value: option, text: option });
				}, []), this._inputItem);
			}
		}
	},

	initialize: function(obj) {
		this._type = obj.type in this._types
			? obj.type
			: 'options' in obj
				? 'list'
				: 'onClick' in obj
					? 'button'
					: typeof obj.value;
		this._info = this._types[this._type] || { type: this._type };
		var that = this,
			fireChange = false;
		this._inputItem = DomElement.create(this._info.tag || 'input', {
			type: this._info.type,
			events: {
				change: function() {
					that.setValue(
						DomElement.get(this, that._info.value || 'value'));
					if (fireChange) {
						that._palette.fire('change', that, that.name, that._value);
						that.fire('change', that._value);
					}
				},
				click: function() {
					that.fire('click');
				}
			}
		});
		this._element = DomElement.create('tr', [
			this._labelItem = DomElement.create('td'),
			'td', [this._inputItem]
		]);
		Base.each(obj, function(value, key) {
			this[key] = value;
		}, this);
		this._defaultValue = this._value;
		fireChange = true;
	},

	getType: function() {
		return this._type;
	},

	getLabel: function() {
		return this._label;
	},

	setLabel: function(label) {
		this._label = label;
		DomElement.set(this._labelItem, 'text', label + ':');
	},

	getOptions: function() {
		return this._options;
	},

	setOptions: function(options) {
		this._options = options;
		if (this._info.options)
			this._info.options.call(this);
	},

	getValue: function() {
		return this._value;
	},

	setValue: function(value) {
		var key = this._info.value || 'value';
		DomElement.set(this._inputItem, key, value);
		value = DomElement.get(this._inputItem, key);
		this._value = this._info.number ? Base.toFloat(value) : value;
	},

	getRange: function() {
		return [Base.toFloat(DomElement.get(this._inputItem, 'min')),
				Base.toFloat(DomElement.get(this._inputItem, 'max'))];
	},

	setRange: function(min, max) {
		var range = Array.isArray(min) ? min : [min, max];
		DomElement.set(this._inputItem, { min: range[0], max: range[1] });
	},

	getMin: function() {
		return this.getRange()[0];
	},

	setMin: function(min) {
		this.setRange(min, this.getMax());
	},

	getMax: function() {
		return this.getRange()[1];
	},

	setMax: function(max) {
		this.setRange(this.getMin(), max);
	},

	getStep: function() {
		return Base.toFloat(DomElement.get(this._inputItem, 'step'));
	},

	setStep: function(step) {
		DomElement.set(this._inputItem, 'step', step);
	},

	reset: function() {
		this.setValue(this._defaultValue);
	}
});

var ToolEvent = this.ToolEvent = Event.extend({
	_item: null,

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

	getItem: function() {
		if (!this._item) {
			var result = this.tool._scope.project.hitTest(this.getPoint());
			if (result) {
				var item = result.item,
					parent = item._parent;
				while ((parent instanceof Group && !(parent instanceof Layer))
						|| parent instanceof CompoundPath) {
					item = parent;
					parent = parent._parent;
				}
				this._item = item;
			}
		}
		return this._item;
	},
	setItem: function(item) {
		this._item = item;
	},

	toString: function() {
		return '{ type: ' + this.type
				+ ', point: ' + this.getPoint()
				+ ', count: ' + this.getCount()
				+ ', modifiers: ' + this.getModifiers()
				+ ' }';
	}
});

var Tool = this.Tool = PaperScopeItem.extend({
	_list: 'tools',
	_reference: '_tool', 
	_events: [ 'onActivate', 'onDeactivate', 'onEditOptions',
			'onMouseDown', 'onMouseUp', 'onMouseDrag', 'onMouseMove',
			'onKeyDown', 'onKeyUp' ],

	initialize: function() {
		this.base();
		this._firstMove = true;
		this._count = 0;
		this._downCount = 0;
	},

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

	_updateEvent: function(type, pt, minDistance, maxDistance, start,
			needsChange, matchMaxDistance) {
		if (!start) {
			if (minDistance != null || maxDistance != null) {
				var minDist = minDistance != null ? minDistance : 0,
					vector = pt.subtract(this._point),
					distance = vector.getLength();
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

	_onHandleEvent: function(type, pt, event) {
		paper = this._scope;
		var sets = Tool._removeSets;
		if (sets) {
			if (type === 'mouseup')
				sets.mousedrag = null;
			var set = sets[type];
			if (set) {
				for (var id in set) {
					var item = set[id];
					for (var key in sets) {
						var other = sets[key];
						if (other && other != set && other[item._id])
							delete other[item._id];
					}
					item.remove();
				}
				sets[type] = null;
			}
		}
		var called = false;
		switch (type) {
		case 'mousedown':
			this._updateEvent(type, pt, null, null, true, false, false);
			if (this.responds(type))
				called = this.fire(type, new ToolEvent(this, type, event));
			break;
		case 'mousedrag':
			var needsChange = false,
				matchMaxDistance = false;
			while (this._updateEvent(type, pt, this.minDistance,
					this.maxDistance, false, needsChange, matchMaxDistance)) {
				if (this.responds(type))
					called = this.fire(type, new ToolEvent(this, type, event));
				needsChange = true;
				matchMaxDistance = true;
			}
			break;
		case 'mouseup':
			if ((this._point.x != pt.x || this._point.y != pt.y)
					&& this._updateEvent('mousedrag', pt, this.minDistance,
							this.maxDistance, false, false, false)) {
				if (this.responds('mousedrag'))
					called = this.fire('mousedrag',
							new ToolEvent(this, type, event));
			}
			this._updateEvent(type, pt, null, this.maxDistance, false,
					false, false);
			if (this.responds(type))
				called = this.fire(type, new ToolEvent(this, type, event));
			this._updateEvent(type, pt, null, null, true, false, false);
			this._firstMove = true;
			break;
		case 'mousemove':
			while (this._updateEvent(type, pt, this.minDistance,
					this.maxDistance, this._firstMove, true, false)) {
				if (this.responds(type))
					called = this.fire(type, new ToolEvent(this, type, event));
				this._firstMove = false;
			}
			break;
		}
		return called;
	}

});

var CanvasProvider = {
	canvases: [],

	getCanvas: function(width, height) {
		var size = height === undefined ? width : Size.create(width, height);
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

	getContext: function(width, height) {
		return this.getCanvas(width, height).getContext('2d');
	},

	release: function(obj) {
		this.canvases.push(obj.canvas ? obj.canvas : obj);
	},
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
	];

	var weights = [
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

	var abs = Math.abs,
		sqrt = Math.sqrt,
		pow = Math.pow,
		cos = Math.cos,
		PI = Math.PI;

	function cbrt(x) {
		return x > 0 ? pow(x, 1 / 3) : x < 0 ? -pow(-x, 1 / 3) : 0;
	}

	return {
		TOLERANCE: 10e-6,
		EPSILON: 10e-12,

		isZero: function(val) {
			return Math.abs(val) <= this.EPSILON;
		},

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

		findRoot: function(f, df, x, a, b, n, tolerance) {
			for (var i = 0; i < n; i++) {
				var fx = f(x),
					dx = fx / df(x);
				if (abs(dx) < tolerance)
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
		},

		solveQuadratic: function(a, b, c, roots, tolerance) {
			if (abs(a) < tolerance) {
				if (abs(b) >= tolerance) {
					roots[0] = -c / b;
					return 1;
				}
				return abs(c) < tolerance ? -1 : 0; 
			}
			var q = b * b - 4 * a * c;
			if (q < 0)
				return 0; 
			q = sqrt(q);
			a *= 2; 
			var n = 0;
			roots[n++] = (-b - q) / a;
			if (q > 0)
				roots[n++] = (-b + q) / a;
			return n; 
		},

		solveCubic: function(a, b, c, d, roots, tolerance) {
			if (abs(a) < tolerance)
				return Numerical.solveQuadratic(b, c, d, roots, tolerance);
			b /= a;
			c /= a;
			d /= a;
			var bb = b * b,
				p = 1 / 3 * (-1 / 3 * bb + c),
				q = 1 / 2 * (2 / 27 * b * bb - 1 / 3 * b * c + d),
				ppp = p * p * p,
				D = q * q + ppp;
			b /= 3;
			if (abs(D) < tolerance) {
			    if (abs(q) < tolerance) { 
			        roots[0] = - b;
			        return 1;
			    } else { 
			        var u = cbrt(-q);
			        roots[0] = 2 * u - b;
			        roots[1] = - u - b;
			        return 2;
			    }
			} else if (D < 0) { 
			    var phi = 1 / 3 * Math.acos(-q / sqrt(-ppp));
			    var t = 2 * sqrt(-p);
			    roots[0] =   t * cos(phi) - b;
			    roots[1] = - t * cos(phi + PI / 3) - b;
			    roots[2] = - t * cos(phi - PI / 3) - b;
			    return 3;
			} else { 
			    D = sqrt(D);
			    roots[0] = cbrt(D - q) - cbrt(D + q) - b;
			    return 1;
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

(function(e){"use strict";function r(e,r){throw"number"==typeof e&&(e=Br(nr,e)),r+=" ("+e.line+":"+e.column+")",new SyntaxError(r)}function t(e){function r(e){if(1==e.length)return t+="return str === "+JSON.stringify(e[0])+";";t+="switch(str){";for(var r=0;e.length>r;++r)t+="case "+JSON.stringify(e[r])+":";t+="return true}return false;"}e=e.split(" ");var t="",n=[];e:for(var a=0;e.length>a;++a){for(var o=0;n.length>o;++o)if(n[o][0].length==e[a].length){n[o].push(e[a]);continue e}n.push([e[a]])}if(n.length>3){n.sort(function(e,r){return r.length-e.length}),t+="switch(str.length){";for(var a=0;n.length>a;++a){var i=n[a];t+="case "+i[0].length+":",r(i)}t+="}"}else r(e);return Function("str",t)}function n(e){return 65>e?36===e:91>e?!0:97>e?95===e:123>e?!0:e>=170&&zt.test(String.fromCharCode(e))}function a(e){return 48>e?36===e:58>e?!0:65>e?!1:91>e?!0:97>e?95===e:123>e?!0:e>=170&&Nt.test(String.fromCharCode(e))}function o(){Jt.lastIndex=yr;var e=Jt.exec(nr);return e?e.index+e[0].length:nr.length+1}function i(){for(;ir>=gr;)++br,yr=gr,gr=o();return{line:br,column:ir-yr}}function s(){br=1,ir=yr=0,gr=o(),hr=!0,vr=null,f()}function u(e,r){ur=ir,tr.locations&&(lr=i()),fr=e,f(),pr=r,mr=vr,hr=e.beforeExpr}function c(){var e=nr.indexOf("*/",ir+=2);-1===e&&r(ir-2,"Unterminated comment"),tr.trackComments&&(vr||(vr=[])).push(nr.slice(ir,e)),ir=e+2}function l(){for(var e=ir,r=nr.charCodeAt(ir+=2);ar>ir&&10!==r&&13!==r&&8232!==r&&8329!==r;)++ir,r=nr.charCodeAt(ir);tr.trackComments&&(vr||(vr=[])).push(nr.slice(e,ir))}function f(){for(vr=null;ar>ir;){var e=nr.charCodeAt(ir);if(47===e){var r=nr.charCodeAt(ir+1);if(42===r)c();else{if(47!==r)break;l()}}else if(14>e&&e>8)++ir;else if(32===e||160===e)++ir;else{if(!(e>=5760&&Mt.test(String.fromCharCode(e))))break;++ir}}}function p(e){if(sr=ir,tr.locations&&(cr=i()),dr=vr,e)return m();if(ir>=ar)return u(qr);var t=nr.charCodeAt(ir);if(n(t)||92===t)return x();var a=nr.charCodeAt(ir+1);switch(t){case 46:return a>=48&&57>=a?b(String.fromCharCode(t)):(++ir,u(vt));case 40:return++ir,u(ft);case 41:return++ir,u(pt);case 59:return++ir,u(mt);case 44:return++ir,u(dt);case 91:return++ir,u(st);case 93:return++ir,u(ut);case 123:return++ir,u(ct);case 125:return++ir,u(lt);case 58:return++ir,u(ht);case 63:return++ir,u(bt);case 48:if(120===a||88===a)return v();case 49:case 50:case 51:case 52:case 53:case 54:case 55:case 56:case 57:return b(String.fromCharCode(t));case 34:case 39:return y(t);case 47:return hr?(++ir,m()):61===a?d(kt,2):d(yt,1);case 37:case 42:return 61===a?d(kt,2):d(Ft,1);case 124:case 38:return a===t?d(124===t?Ct:At,2):61===a?d(kt,2):d(124===t?St:Ut,1);case 94:return 61===a?d(kt,2):d(It,1);case 43:case 45:return a===t?d(wt,2):61===a?d(kt,2):d(xt,1);case 60:case 62:var o=1;return a===t?(o=62===t&&62===nr.charCodeAt(ir+2)?3:2,61===nr.charCodeAt(ir+o)?d(kt,o+1):d(Vt,o)):(61===a&&(o=61===nr.charCodeAt(ir+2)?3:2),d(Lt,o));case 61:case 33:return 61===a?d(Bt,61===nr.charCodeAt(ir+2)?3:2):d(61===t?gt:Et,1);case 126:return d(Et,1)}var s=String.fromCharCode(t);return"\\"===s||zt.test(s)?x():(r(ir,"Unexpected character '"+s+"'"),void 0)}function d(e,r){var t=nr.slice(ir,ir+r);ir+=r,u(e,t)}function m(){for(var e,t,n="",a=ir;;){ir>=ar&&r(a,"Unterminated regular expression");var o=nr.charAt(ir);if(Wt.test(o)&&r(a,"Unterminated regular expression"),e)e=!1;else{if("["===o)t=!0;else if("]"===o&&t)t=!1;else if("/"===o&&!t)break;e="\\"===o}++ir}var n=nr.slice(a,ir);++ir;var i=k();return i&&!/^[gmsiy]*$/.test(i)&&r(a,"Invalid regexp flag"),u(Vr,RegExp(n,i))}function h(e,r){for(var t=ir,n=0;;){var a,o=nr.charCodeAt(ir);if(a=o>=97?o-97+10:o>=65?o-65+10:o>=48&&57>=o?o-48:1/0,a>=e)break;++ir,n=n*e+a}return ir===t||null!=r&&ir-t!==r?null:n}function v(){ir+=2;var e=h(16);return null==e&&r(sr+2,"Expected hexadecimal number"),n(nr.charCodeAt(ir))&&r(ir,"Identifier directly after number"),u(Lr,e)}function b(e){var t=ir,a="."===e;if(a||null!=h(10)||r(t,"Invalid number"),a||"."===nr.charAt(ir)){var o=nr.charAt(++ir);("-"===o||"+"===o)&&++ir,null===h(10)&&"."===e&&r(t,"Invalid number"),a=!0}if(/e/i.test(nr.charAt(ir))){var o=nr.charAt(++ir);("-"===o||"+"===o)&&++ir,null===h(10)&&r(t,"Invalid number"),a=!0}n(nr.charCodeAt(ir))&&r(ir,"Identifier directly after number");var i,s=nr.slice(t,ir);return a?i=parseFloat(s):"0"!==e||1===s.length?i=parseInt(s,10):/[89]/.test(s)||Ar?r(t,"Invalid number"):i=parseInt(s,8),u(Lr,i)}function y(e){ir++;for(var t=[];;){ir>=ar&&r(sr,"Unterminated string constant");var n=nr.charCodeAt(ir);if(n===e)return++ir,u(Fr,String.fromCharCode.apply(null,t));if(92===n){n=nr.charCodeAt(++ir);var a=/^[0-7]+/.exec(nr.slice(ir,ir+3));for(a&&(a=a[0]);a&&parseInt(a,8)>255;)a=a.slice(0,a.length-1);if("0"===a&&(a=null),++ir,a)Ar&&r(ir-2,"Octal literal in strict mode"),t.push(parseInt(a,8)),ir+=a.length-1;else switch(n){case 110:t.push(10);break;case 114:t.push(13);break;case 120:t.push(g(2));break;case 117:t.push(g(4));break;case 85:t.push(g(8));break;case 116:t.push(9);break;case 98:t.push(8);break;case 118:t.push(11);break;case 102:t.push(12);break;case 48:t.push(0);break;case 13:10===nr.charCodeAt(ir)&&++ir;case 10:break;default:t.push(n)}}else(13===n||10===n||8232===n||8329===n)&&r(sr,"Unterminated string constant"),92!==n&&t.push(n),++ir}}function g(e){var t=h(16,e);return null===t&&r(sr,"Bad character escape sequence"),t}function k(){Sr=!1;for(var e,t=!0,o=ir;;){var i=nr.charCodeAt(ir);if(a(i))Sr&&(e+=nr.charAt(ir)),++ir;else{if(92!==i)break;Sr||(e=nr.slice(o,ir)),Sr=!0,117!=nr.charCodeAt(++ir)&&r(ir,"Expecting Unicode escape sequence \\uXXXX"),++ir;var s=g(4),u=String.fromCharCode(s);u||r(ir-1,"Invalid Unicode escape"),(t?n(s):a(s))||r(ir-4,"Invalid Unicode escape"),e+=u}t=!1}return Sr?e:nr.slice(o,ir)}function x(){var e=k(),t=Rr;return Sr||(Tt(e)?t=it[e]:(tr.forbidReserved&&(3===tr.ecmaVersion?Rt:qt)(e)||Ar&&Dt(e))&&r(sr,"The keyword '"+e+"' is reserved")),u(t,e)}function w(){kr=sr,xr=ur,wr=lr,p()}function E(e){Ar=e,ir=xr,f(),p()}function C(){var e={type:null,start:sr,end:null};return tr.trackComments&&dr&&(e.commentsBefore=dr,dr=null),tr.locations&&(e.loc={start:cr,end:null,source:or}),tr.ranges&&(e.range=[sr,0]),e}function A(e){var r={type:null,start:e.start};return e.commentsBefore&&(r.commentsBefore=e.commentsBefore,e.commentsBefore=null),tr.locations&&(r.loc={start:e.loc.start,end:null,source:e.loc.source}),tr.ranges&&(r.range=[e.range[0],0]),r}function S(e,r){return e.type=r,e.end=xr,tr.trackComments&&(mr?(e.commentsAfter=mr,mr=null):Ir&&Ir.end===xr&&Ir.commentsAfter&&(e.commentsAfter=Ir.commentsAfter,Ir.commentsAfter=null),Ir=e),tr.locations&&(e.loc.end=wr),tr.ranges&&(e.range[1]=xr),e}function I(e){return tr.ecmaVersion>=5&&"ExpressionStatement"===e.type&&"Literal"===e.expression.type&&"use strict"===e.expression.value}function U(e){return fr===e?(w(),!0):void 0}function B(){return!tr.strictSemicolons&&(fr===qr||fr===lt||Wt.test(nr.slice(xr,sr)))}function L(){U(mt)||B()||F()}function V(e){fr===e?w():F()}function F(){r(sr,"Unexpected token")}function R(e){"Identifier"!==e.type&&"MemberExpression"!==e.type&&r(e.start,"Assigning to rvalue"),Ar&&"Identifier"===e.type&&Ot(e.name)&&r(e.start,"Assigning to "+e.name+" in strict mode")}function q(e){s(),kr=xr=ir,tr.locations&&(wr=i()),Er=Ar=null,Cr=[],p();var r=e||C(),t=!0;for(e||(r.body=[]);fr!==qr;){var n=D();r.body.push(n),t&&I(n)&&E(!0),t=!1}return S(r,"Program")}function D(){fr===yt&&p(!0);var e=fr,t=C();switch(e){case Dr:case Mr:w();var n=e===Dr;U(mt)||B()?t.label=null:fr!==Rr?F():(t.label=rr(),L());for(var a=0;Cr.length>a;++a){var o=Cr[a];if(null==t.label||o.name===t.label.name){if(null!=o.kind&&(n||"loop"===o.kind))break;if(t.label&&n)break}}return a===Cr.length&&r(t.start,"Unsyntactic "+e.keyword),S(t,n?"BreakStatement":"ContinueStatement");case jr:return w(),S(t,"DebuggerStatement");case zr:return w(),Cr.push(Pt),t.body=D(),Cr.pop(),V(Zr),t.test=O(),L(),S(t,"DoWhileStatement");case Jr:if(w(),Cr.push(Pt),V(ft),fr===mt)return M(t,null);if(fr===Yr){var i=C();return w(),X(i,!0),1===i.declarations.length&&U(ot)?j(t,i):M(t,i)}var i=z(!1,!0);return U(ot)?(R(i),j(t,i)):M(t,i);case Pr:return w(),_(t,!0);case $r:return w(),t.test=O(),t.consequent=D(),t.alternate=U(Nr)?D():null,S(t,"IfStatement");case Gr:return Er||r(sr,"'return' outside of function"),w(),U(mt)||B()?t.argument=null:(t.argument=z(),L()),S(t,"ReturnStatement");case Hr:w(),t.discriminant=O(),t.cases=[],V(ct),Cr.push($t);for(var s,u;fr!=lt;)if(fr===Or||fr===Xr){var c=fr===Or;s&&S(s,"SwitchCase"),t.cases.push(s=C()),s.consequent=[],w(),c?s.test=z():(u&&r(kr,"Multiple default clauses"),u=!0,s.test=null),V(ht)}else s||F(),s.consequent.push(D());return s&&S(s,"SwitchCase"),w(),Cr.pop(),S(t,"SwitchStatement");case Kr:return w(),Wt.test(nr.slice(xr,sr))&&r(xr,"Illegal newline after throw"),t.argument=z(),S(t,"ThrowStatement");case Qr:for(w(),t.block=T(),t.handlers=[];fr===Tr;){var l=C();w(),V(ft),l.param=rr(),Ar&&Ot(l.param.name)&&r(l.param.start,"Binding "+l.param.name+" in strict mode"),V(pt),l.guard=null,l.body=T(),t.handlers.push(S(l,"CatchClause"))}return t.finalizer=U(Wr)?T():null,t.handlers.length||t.finalizer||r(t.start,"Missing catch or finally clause"),S(t,"TryStatement");case Yr:return w(),t=X(t),L(),t;case Zr:return w(),t.test=O(),Cr.push(Pt),t.body=D(),Cr.pop(),S(t,"WhileStatement");case _r:return Ar&&r(sr,"'with' in strict mode"),w(),t.object=O(),t.body=D(),S(t,"WithStatement");case ct:return T();case mt:return w(),S(t,"EmptyStatement");default:var f=pr,d=z();if(e===Rr&&"Identifier"===d.type&&U(ht)){for(var a=0;Cr.length>a;++a)Cr[a].name===f&&r(d.start,"Label '"+f+"' is already declared");var m=fr.isLoop?"loop":fr===Hr?"switch":null;return Cr.push({name:f,kind:m}),t.body=D(),t.label=d,S(t,"LabeledStatement")}return t.expression=d,L(),S(t,"ExpressionStatement")}}function O(){V(ft);var e=z();return V(pt),e}function T(){var e,r=C(),t=!0,n=!1;for(r.body=[],V(ct);!U(lt);){var a=D();r.body.push(a),t&&I(a)&&(e=n,E(n=!0)),t=!1}return n&&!e&&E(!1),S(r,"BlockStatement")}function M(e,r){return e.init=r,V(mt),e.test=fr===mt?null:z(),V(mt),e.update=fr===pt?null:z(),V(pt),e.body=D(),Cr.pop(),S(e,"ForStatement")}function j(e,r){return e.left=r,e.right=z(),V(pt),e.body=D(),Cr.pop(),S(e,"ForInStatement")}function X(e,t){for(e.declarations=[],e.kind="var";;){var n=C();if(n.id=rr(),Ar&&Ot(n.id.name)&&r(n.id.start,"Binding "+n.id.name+" in strict mode"),n.init=U(gt)?z(!0,t):null,e.declarations.push(S(n,"VariableDeclarator")),!U(dt))break}return S(e,"VariableDeclaration")}function z(e,r){var t=N(r);if(!e&&fr===dt){var n=A(t);for(n.expressions=[t];U(dt);)n.expressions.push(N(r));return S(n,"SequenceExpression")}return t}function N(e){var r=W(e);if(fr.isAssign){var t=A(r);return t.operator=pr,t.left=r,w(),t.right=N(e),R(r),S(t,"AssignmentExpression")}return r}function W(e){var r=J(e);if(U(bt)){var t=A(r);return t.test=r,t.consequent=z(!0),V(ht),t.alternate=z(!0,e),S(t,"ConditionalExpression")}return r}function J(e){return P($(e),-1,e)}function P(e,r,t){var n=fr.binop;if(null!=n&&(!t||fr!==ot)&&n>r){var a=A(e);a.left=e,a.operator=pr,w(),a.right=P($(t),n,t);var a=S(a,/&&|\|\|/.test(a.operator)?"LogicalExpression":"BinaryExpression");return P(a,r,t)}return e}function $(e){if(fr.prefix){var t=C(),n=fr.isUpdate;return t.operator=pr,t.prefix=!0,w(),t.argument=$(e),n?R(t.argument):Ar&&"delete"===t.operator&&"Identifier"===t.argument.type&&r(t.start,"Deleting local variable in strict mode"),S(t,n?"UpdateExpression":"UnaryExpression")}for(var a=G();fr.postfix&&!B();){var t=A(a);t.operator=pr,t.prefix=!1,t.argument=a,R(a),w(),a=S(t,"UpdateExpression")}return a}function G(){return H(K())}function H(e,r){if(U(vt)){var t=A(e);return t.object=e,t.property=rr(!0),t.computed=!1,H(S(t,"MemberExpression"),r)}if(U(st)){var t=A(e);return t.object=e,t.property=z(),t.computed=!0,V(ut),H(S(t,"MemberExpression"),r)}if(!r&&U(ft)){var t=A(e);return t.callee=e,t.arguments=er(pt,!1),H(S(t,"CallExpression"),r)}return e}function K(){switch(fr){case rt:var e=C();return w(),S(e,"ThisExpression");case Rr:return rr();case Lr:case Fr:case Vr:var e=C();return e.value=pr,e.raw=nr.slice(sr,ur),w(),S(e,"Literal");case tt:case nt:case at:var e=C();return e.value=fr.atomValue,w(),S(e,"Literal");case ft:var r=cr,t=sr;w();var n=z();return n.start=t,n.end=ur,tr.locations&&(n.loc.start=r,n.loc.end=lr),tr.ranges&&(n.range=[t,ur]),V(pt),n;case st:var e=C();return w(),e.elements=er(ut,!0,!0),S(e,"ArrayExpression");case ct:return Y();case Pr:var e=C();return w(),_(e,!1);case et:return Q();default:F()}}function Q(){var e=C();return w(),e.callee=H(K(!1),!0),e.arguments=U(ft)?er(pt,!1):[],S(e,"NewExpression")}function Y(){var e=C(),t=!0,n=!1;for(e.properties=[],w();!U(lt);){if(t)t=!1;else if(V(dt),tr.allowTrailingCommas&&U(lt))break;var a,o={key:Z()},i=!1;if(U(ht)?(o.value=z(!0),a=o.kind="init"):tr.ecmaVersion>=5&&"Identifier"===o.key.type&&("get"===o.key.name||"set"===o.key.name)?(i=n=!0,a=o.kind=o.key.name,o.key=Z(),!fr===ft&&F(),o.value=_(C(),!1)):F(),"Identifier"===o.key.type&&(Ar||n))for(var s=0;e.properties.length>s;++s){var u=e.properties[s];if(u.key.name===o.key.name){var c=a==u.kind||i&&"init"===u.kind||"init"===a&&("get"===u.kind||"set"===u.kind);c&&!Ar&&"init"===a&&"init"===u.kind&&(c=!1),c&&r(o.key.start,"Redefinition of property")}}e.properties.push(o)}return S(e,"ObjectExpression")}function Z(){return fr===Lr||fr===Fr?K():rr(!0)}function _(e,t){fr===Rr?e.id=rr():t?F():e.id=null,e.params=[];var n=!0;for(V(ft);!U(pt);)n?n=!1:V(dt),e.params.push(rr());var a=Er,o=Cr;if(Er=!0,Cr=[],e.body=T(!0),Er=a,Cr=o,Ar||e.body.body.length&&I(e.body.body[0]))for(var i=e.id?-1:0;e.params.length>i;++i){var s=0>i?e.id:e.params[i];if((Dt(s.name)||Ot(s.name))&&r(s.start,"Defining '"+s.name+"' in strict mode"),i>=0)for(var u=0;i>u;++u)s.name===e.params[u].name&&r(s.start,"Argument name clash in strict mode")}return S(e,t?"FunctionDeclaration":"FunctionExpression")}function er(e,r,t){for(var n=[],a=!0;!U(e);){if(a)a=!1;else if(V(dt),r&&tr.allowTrailingCommas&&U(e))break;t&&fr===dt?n.push(null):n.push(z(!0))}return n}function rr(e){var r=C();return r.name=fr===Rr?pr:e&&!tr.forbidReserved&&fr.keyword||F(),w(),S(r,"Identifier")}e.version="0.0.1";var tr,nr,ar,or;e.parse=function(e,r){nr=e+"",ar=nr.length,tr=r||{};for(var t in Ur)tr.hasOwnProperty(t)||(tr[t]=Ur[t]);return or=tr.sourceFile||null,q(tr.program)};var ir,sr,ur,cr,lr,fr,pr,dr,mr,hr,vr,br,yr,gr,kr,xr,wr,Er,Cr,Ar,Sr,Ir,Ur=e.defaultOptions={ecmaVersion:5,strictSemicolons:!1,allowTrailingCommas:!0,forbidReserved:!1,trackComments:!1,locations:!1,ranges:!1,program:null,sourceFile:null},Br=e.getLineInfo=function(e,r){for(var t=1,n=0;;){Jt.lastIndex=n;var a=Jt.exec(e);if(!(a&&r>a.index))break;++t,n=a.index+a[0].length}return{line:t,column:r-n}},Lr={type:"num"},Vr={type:"regexp"},Fr={type:"string"},Rr={type:"name"},qr={type:"eof"},Dr={keyword:"break"},Or={keyword:"case",beforeExpr:!0},Tr={keyword:"catch"},Mr={keyword:"continue"},jr={keyword:"debugger"},Xr={keyword:"default"},zr={keyword:"do",isLoop:!0},Nr={keyword:"else",beforeExpr:!0},Wr={keyword:"finally"},Jr={keyword:"for",isLoop:!0},Pr={keyword:"function"},$r={keyword:"if"},Gr={keyword:"return",beforeExpr:!0},Hr={keyword:"switch"},Kr={keyword:"throw",beforeExpr:!0},Qr={keyword:"try"},Yr={keyword:"var"},Zr={keyword:"while",isLoop:!0},_r={keyword:"with"},et={keyword:"new",beforeExpr:!0},rt={keyword:"this"},tt={keyword:"null",atomValue:null},nt={keyword:"true",atomValue:!0},at={keyword:"false",atomValue:!1},ot={keyword:"in",binop:7,beforeExpr:!0},it={"break":Dr,"case":Or,"catch":Tr,"continue":Mr,"debugger":jr,"default":Xr,"do":zr,"else":Nr,"finally":Wr,"for":Jr,"function":Pr,"if":$r,"return":Gr,"switch":Hr,"throw":Kr,"try":Qr,"var":Yr,"while":Zr,"with":_r,"null":tt,"true":nt,"false":at,"new":et,"in":ot,"instanceof":{keyword:"instanceof",binop:7},"this":rt,"typeof":{keyword:"typeof",prefix:!0},"void":{keyword:"void",prefix:!0},"delete":{keyword:"delete",prefix:!0}},st={type:"[",beforeExpr:!0},ut={type:"]"},ct={type:"{",beforeExpr:!0},lt={type:"}"},ft={type:"(",beforeExpr:!0},pt={type:")"},dt={type:",",beforeExpr:!0},mt={type:";",beforeExpr:!0},ht={type:":",beforeExpr:!0},vt={type:"."},bt={type:"?",beforeExpr:!0},yt={binop:10,beforeExpr:!0},gt={isAssign:!0,beforeExpr:!0},kt={isAssign:!0,beforeExpr:!0},xt={binop:9,prefix:!0,beforeExpr:!0},wt={postfix:!0,prefix:!0,isUpdate:!0},Et={prefix:!0,beforeExpr:!0},Ct={binop:1,beforeExpr:!0},At={binop:2,beforeExpr:!0},St={binop:3,beforeExpr:!0},It={binop:4,beforeExpr:!0},Ut={binop:5,beforeExpr:!0},Bt={binop:6,beforeExpr:!0},Lt={binop:7,beforeExpr:!0},Vt={binop:8,beforeExpr:!0},Ft={binop:10,beforeExpr:!0},Rt=t("abstract boolean byte char class double enum export extends final float goto implements import int interface long native package private protected public short static super synchronized throws transient volatile"),qt=t("class enum extends super const export import"),Dt=t("implements interface let package private protected public static yield"),Ot=t("eval arguments"),Tt=t("break case catch continue debugger default do else finally for function if return switch throw try var while with null true false instanceof typeof void delete new in this"),Mt=/[\u1680\u180e\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]/,jt="\u00aa\u00b5\u00ba\u00c0-\u00d6\u00d8-\u00f6\u00f8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u0527\u0531-\u0556\u0559\u0561-\u0587\u05d0-\u05ea\u05f0-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u08a0\u08a2-\u08ac\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0977\u0979-\u097f\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c33\u0c35-\u0c39\u0c3d\u0c58\u0c59\u0c60\u0c61\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d60\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f4\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f0\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1877\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191c\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19c1-\u19c7\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1ce9-\u1cec\u1cee-\u1cf1\u1cf5\u1cf6\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2119-\u211d\u2124\u2126\u2128\u212a-\u212d\u212f-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u2e2f\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309d-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312d\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fcc\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua697\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua78e\ua790-\ua793\ua7a0-\ua7aa\ua7f8-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa80-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uabc0-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc",Xt="\u0371-\u0374\u0483-\u0487\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u0610-\u061a\u0620-\u0649\u0672-\u06d3\u06e7-\u06e8\u06fb-\u06fc\u0730-\u074a\u0800-\u0814\u081b-\u0823\u0825-\u0827\u0829-\u082d\u0840-\u0857\u08e4-\u08fe\u0900-\u0903\u093a-\u093c\u093e-\u094f\u0951-\u0957\u0962-\u0963\u0966-\u096f\u0981-\u0983\u09bc\u09be-\u09c4\u09c7\u09c8\u09d7\u09df-\u09e0\u0a01-\u0a03\u0a3c\u0a3e-\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a66-\u0a71\u0a75\u0a81-\u0a83\u0abc\u0abe-\u0ac5\u0ac7-\u0ac9\u0acb-\u0acd\u0ae2-\u0ae3\u0ae6-\u0aef\u0b01-\u0b03\u0b3c\u0b3e-\u0b44\u0b47\u0b48\u0b4b-\u0b4d\u0b56\u0b57\u0b5f-\u0b60\u0b66-\u0b6f\u0b82\u0bbe-\u0bc2\u0bc6-\u0bc8\u0bca-\u0bcd\u0bd7\u0be6-\u0bef\u0c01-\u0c03\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c62-\u0c63\u0c66-\u0c6f\u0c82\u0c83\u0cbc\u0cbe-\u0cc4\u0cc6-\u0cc8\u0cca-\u0ccd\u0cd5\u0cd6\u0ce2-\u0ce3\u0ce6-\u0cef\u0d02\u0d03\u0d46-\u0d48\u0d57\u0d62-\u0d63\u0d66-\u0d6f\u0d82\u0d83\u0dca\u0dcf-\u0dd4\u0dd6\u0dd8-\u0ddf\u0df2\u0df3\u0e34-\u0e3a\u0e40-\u0e45\u0e50-\u0e59\u0eb4-\u0eb9\u0ec8-\u0ecd\u0ed0-\u0ed9\u0f18\u0f19\u0f20-\u0f29\u0f35\u0f37\u0f39\u0f41-\u0f47\u0f71-\u0f84\u0f86-\u0f87\u0f8d-\u0f97\u0f99-\u0fbc\u0fc6\u1000-\u1029\u1040-\u1049\u1067-\u106d\u1071-\u1074\u1082-\u108d\u108f-\u109d\u135d-\u135f\u170e-\u1710\u1720-\u1730\u1740-\u1750\u1772\u1773\u1780-\u17b2\u17dd\u17e0-\u17e9\u180b-\u180d\u1810-\u1819\u1920-\u192b\u1930-\u193b\u1951-\u196d\u19b0-\u19c0\u19c8-\u19c9\u19d0-\u19d9\u1a00-\u1a15\u1a20-\u1a53\u1a60-\u1a7c\u1a7f-\u1a89\u1a90-\u1a99\u1b46-\u1b4b\u1b50-\u1b59\u1b6b-\u1b73\u1bb0-\u1bb9\u1be6-\u1bf3\u1c00-\u1c22\u1c40-\u1c49\u1c5b-\u1c7d\u1cd0-\u1cd2\u1d00-\u1dbe\u1e01-\u1f15\u200c\u200d\u203f\u2040\u2054\u20d0-\u20dc\u20e1\u20e5-\u20f0\u2d81-\u2d96\u2de0-\u2dff\u3021-\u3028\u3099\u309a\ua640-\ua66d\ua674-\ua67d\ua69f\ua6f0-\ua6f1\ua7f8-\ua800\ua806\ua80b\ua823-\ua827\ua880-\ua881\ua8b4-\ua8c4\ua8d0-\ua8d9\ua8f3-\ua8f7\ua900-\ua909\ua926-\ua92d\ua930-\ua945\ua980-\ua983\ua9b3-\ua9c0\uaa00-\uaa27\uaa40-\uaa41\uaa4c-\uaa4d\uaa50-\uaa59\uaa7b\uaae0-\uaae9\uaaf2-\uaaf3\uabc0-\uabe1\uabec\uabed\uabf0-\uabf9\ufb20-\ufb28\ufe00-\ufe0f\ufe20-\ufe26\ufe33\ufe34\ufe4d-\ufe4f\uff10-\uff19\uff3f",zt=RegExp("["+jt+"]"),Nt=RegExp("["+jt+Xt+"]"),Wt=/[\n\r\u2028\u2029]/,Jt=/\r\n|[\n\r\u2028\u2029]/g,Pt={kind:"loop"},$t={kind:"switch"}})("undefined"==typeof exports?window.acorn={}:exports);

var PaperScript = this.PaperScript = new function() {

	var binaryOperators = {
		'+': 'add',
		'-': 'subtract',
		'*': 'multiply',
		'/': 'divide',
		'%': 'modulo',
		'==': 'equals',
		'!=': 'equals'
	};

	var unaryOperators = {
		'-': 'negate',
		'+': null
	};

	function _$_(left, operator, right) {
		var handler = binaryOperators[operator];
		if (left && left[handler]) {
			var res = left[handler](right);
			return operator === '!=' ? !res : res;
		}
		switch (operator) {
		case '+': return left + right;
		case '-': return left - right;
		case '*': return left * right;
		case '/': return left / right;
		case '%': return left % right;
		case '==': return left == right;
		case '!=': return left != right;
		}
	}

	function $_(operator, value) {
		var handler = unaryOperators[operator];
		if (handler && value && value[handler])
			return value[handler]();
		switch (operator) {
		case '+': return +value;
		case '-': return -value;
		}
	}

	function compile(code) {

		var insertions = [];

		function getOffset(offset) {
			var start = offset;
			for (var i = 0, l = insertions.length; i < l; i++) {
				var insertion = insertions[i];
				if (insertion[0] >= offset)
					break;
				offset += insertion[1];
			}
			return offset;
		}

		function getCode(node) {
			return code.substring(getOffset(node.range[0]),
					getOffset(node.range[1]));
		}

		function replaceCode(node, str) {
			var start = getOffset(node.range[0]),
				end = getOffset(node.range[1]);
			var insert = 0;
			for (var i = insertions.length - 1; i >= 0; i--) {
				if (start > insertions[i][0]) {
					insert = i + 1;
					break;
				}
			}
			insertions.splice(insert, 0, [start, str.length - end + start]);
			code = code.substring(0, start) + str + code.substring(end);
		}

		function walkAst(node) {
			for (var key in node) {
				if (key === 'range')
					continue;
				var value = node[key];
				if (Array.isArray(value)) {
					for (var i = 0, l = value.length; i < l; i++)
						walkAst(value[i]);
				} else if (Base.isPlainObject(value)) {
					walkAst(value);
				}
			}
			switch (node && node.type) {
			case 'BinaryExpression':
				if (node.operator in binaryOperators
						&& node.left.type !== 'Literal') {
					var left = getCode(node.left),
						right = getCode(node.right);
					replaceCode(node, '_$_(' + left + ', "' + node.operator
							+ '", ' + right + ')');
				}
				break;
			case 'AssignmentExpression':
				if (/^.=$/.test(node.operator)
						&& node.left.type !== 'Literal') {
					var left = getCode(node.left),
						right = getCode(node.right);
					replaceCode(node, left + ' = _$_(' + left + ', "'
							+ node.operator[0] + '", ' + right + ')');
				}
				break;
			case 'UpdateExpression':
				if (!node.prefix) {
					var arg = getCode(node.argument);
					replaceCode(node, arg + ' = _$_(' + arg + ', "'
							+ node.operator[0] + '", 1)');
				}
				break;
			case 'UnaryExpression':
				if (node.operator in unaryOperators
						&& node.argument.type !== 'Literal') {
					var arg = getCode(node.argument);
					replaceCode(node, '$_("' + node.operator + '", '
							+ arg + ')');
				}
				break;
			}
		}
		walkAst(acorn.parse(code, { ranges: true }));
		return code;
	}

	function evaluate(code, scope) {
		paper = scope;
		var view = scope.project && scope.project.view,
			res;
		with (scope) {
			(function() {
				var onActivate, onDeactivate, onEditOptions,
					onMouseDown, onMouseUp, onMouseDrag, onMouseMove,
					onKeyDown, onKeyUp, onFrame, onResize;
				res = eval(compile(code));
				if (/on(?:Key|Mouse)(?:Up|Down|Move|Drag)/.test(code)) {
					Base.each(Tool.prototype._events, function(key) {
						var value = eval(key);
						if (value) {
							scope.getTool()[key] = value;
						}
					});
				}
				if (view) {
					view.setOnResize(onResize);
					view.fire('resize', {
						size: view.size,
						delta: new Point()
					});
					view.setOnFrame(onFrame);
					view.draw();
				}
			}).call(scope);
		}
		return res;
	}

	function request(url, scope) {
		var xhr = new (window.ActiveXObject || XMLHttpRequest)(
				'Microsoft.XMLHTTP');
		xhr.open('GET', url, true);
		if (xhr.overrideMimeType)
			xhr.overrideMimeType('text/plain');
		xhr.onreadystatechange = function() {
			if (xhr.readyState === 4) {
				return evaluate(xhr.responseText, scope);
			}
		};
		return xhr.send(null);
	}

	function load() {
		var scripts = document.getElementsByTagName('script');
		var scopes = {};
		for (var i = 0, l = scripts.length; i < l; i++) {
			var script = scripts[i];
			if (/^text\/(?:x-|)paperscript$/.test(script.type)
					&& !script.getAttribute('data-paper-ignore')) {
				var canvas = PaperScript.getAttribute(script, 'canvas');
				var scope;
				if (scopes.hasOwnProperty(canvas)) {
					scope = scopes[canvas];
				} else {
					scope = new PaperScope(script);
					scope.setup(canvas);
					scopes[canvas] = scope;
				}
				if (script.src) {
					request(script.src, scope);
				} else {
					evaluate(script.innerHTML, scope);
				}
				script.setAttribute('data-paper-ignore', true);
			}
		}
	}

	if (document.readyState === 'complete') {
		setTimeout(load);
	} else {
		DomEvent.add(window, { load: load });
	}

	function handleAttribute(name) {
		name += 'Attribute';
		return function(el, attr) {
			return el[name](attr) || el[name]('data-paper-' + attr);
		};
	}

	return {
		compile: compile,
		evaluate: evaluate,
		load: load,
		getAttribute: handleAttribute('get'),
		hasAttribute: handleAttribute('has')
	};

};

Base.each(this, function(val, key) {
	if (val && val.prototype instanceof Base) {
		val._name = key;
	}
});

this.enumerable = true;
return new (PaperScope.inject(this));
};
