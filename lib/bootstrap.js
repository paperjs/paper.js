/**
 * Bootstrap JavaScript Library
 * (c) 2006 - 2010 Juerg Lehni, http://scratchdisk.com/
 *
 * Bootstrap is released under the MIT license
 * http://bootstrap-js.net/
 *
 * Inspirations:
 * http://dean.edwards.name/weblog/2006/03/base/
 * http://dev.helma.org/Wiki/JavaScript+Inheritance+Sugar/
 * http://prototypejs.org/
 * http://mootools.net/
 *
 * Some code in this file is based on Mootools.net and adapted to the
 * architecture of Bootstrap, with added changes in design and architecture
 * where deemeded necessary.
 * See http://www.bootstrap-js.net/wiki/MootoolsDifferences
 */
new function() { 
	var fix = !this.__proto__ && [Function, Number, Boolean, String, Array, Date, RegExp];
	if (fix)
		for (var i in fix)
			fix[i].prototype.__proto__ = fix[i].prototype;

	function has(obj, name) {
		return (!fix || name != '__proto__') && obj.hasOwnProperty(name);
	}

	var _define = Object.defineProperty,
		_describe = Object.getOwnPropertyDescriptor,
		slice = Array.prototype.slice,
		forEach = Array.prototype.forEach || function(iter, bind) {
			for (var i = 0, l = this.length; i < l; i++)
				iter.call(bind, this[i], i, this);
		},
		isArray = Array.isArray || function(obj) {
			return Object.prototype.toString.call(obj) === '[object Array]';
		};

	function define(obj, name, desc) {
		if (_define)
			try { delete obj[name]; return _define(obj, name, desc); } catch (e) {}
		if ((desc.get || desc.set) && obj.__defineGetter__) {
			if (desc.get) obj.__defineGetter__(name, desc.get);
			if (desc.set) obj.__defineSetter__(name, desc.set);
		} else {
			obj[name] = desc.value;
		}
		return obj;
	}

	function describe(obj, name) {
		if (_describe)
			try { return _describe(obj, name); } catch (e) {}
		var get = obj.__lookupGetter__ && obj.__lookupGetter__(name);
		return get
			? { enumerable: true, configurable: true, get: get, set: obj.__lookupSetter__(name) }
			: has(obj, name)
				? { enumerable: true, configurable: true, writable: true, value: obj[name] }
				: null;
	}

	function inject(dest, src, enumerable, base, preserve, generics) {
		var beans, bean;

		function field(name, val, dontCheck, generics) {
			var val = val || (val = describe(src, name)) && (val.get ? val : val.value),
				func = typeof val == 'function', res = val,
				prev = preserve || func ? (val && val.get ? name in dest : dest[name]) : null;
			if (generics && func && (!preserve || !generics[name])) generics[name] = function(bind) {
				return bind && dest[name].apply(bind, slice.call(arguments, 1));
			}
			if ((dontCheck || val !== undefined && has(src, name)) && (!preserve || !prev)) {
				if (func) {
					if (prev && /\bthis\.base\b/.test(val)) {
						var fromBase = base && base[name] == prev;
						res = (function() {
							var tmp = describe(this, 'base');
							define(this, 'base', { value: fromBase ? base[name] : prev, configurable: true });
							try { return val.apply(this, arguments); }
							finally { tmp ? define(this, 'base', tmp) : delete this.base; }
						}).pretend(val);
					}
					if (beans && (bean = name.match(/^(get|is)(([A-Z])(.*))$/)))
						beans.push([ bean[3].toLowerCase() + bean[4], bean[2] ]);
				}
				if (!res || func || !res.get && !res.set)
					res = { value: res, writable: true };
				if ((describe(dest, name) || { configurable: true }).configurable) {
					res.configurable = true;
					res.enumerable = enumerable;
				}
				define(dest, name, res);
			}
		}
		if (src) {
			beans = src.beans && [];
			for (var name in src)
				if (has(src, name) && !/^(statics|generics|preserve|beans|prototype|__proto__|toString|valueOf)$/.test(name))
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
	}

	function extend(obj) {
		function ctor(dont) {
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

	inject(Function.prototype, {
		inject: function(src) {
			if (src) {
				var proto = this.prototype, base = proto.__proto__ && proto.__proto__.constructor;
				inject(proto, src, false, base && base.prototype, src.preserve, src.generics && this);
				inject(this, src.statics, true, base, src.preserve);
			}
			for (var i = 1, l = arguments.length; i < l; i++)
				this.inject(arguments[i]);
			return this;
		},

		extend: function(src) {
			var proto = new this(this.dont), ctor = extend(proto);
			define(proto, 'constructor', { value: ctor, writable: true, configurable: true });
			ctor.dont = {};
			inject(ctor, this, true);
			return arguments.length ? this.inject.apply(ctor, arguments) : ctor;
		},

		pretend: function(fn) {
			this.toString = function() {
				return fn.toString();
			}
			this.valueOf = function() {
				return fn.valueOf();
			}
			return this;
		}
	});

	function each(iter, bind) {
		var bind = bind || this, iter = iterator(iter);
		try {
			if (isArray(this)) {
				forEach.call(this, iter, bind);
			} else {
				for (var i in this)
					if (this.hasOwnProperty(i))
						iter.call(bind, this[i], i, this);
			}
		} catch (e) {
			if (e !== Base.stop) throw e;
		}
		return bind;
	}

	function iterator(iter) {
		return !iter
			? function(val) { return val }
			: typeof iter != 'function'
				? function(val) { return val == iter }
				: iter;
	}

	function clone(obj) {
		return each.call(obj, function(val, i) {
			this[i] = val;
		}, new obj.constructor());
	}

	Base = Object.extend({
		has: function(name) {
			return has(this, name);
		},

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

		clone: function() {
			return clone(this);
		},

		statics: {
			has: has,
			// TODO: Use generics?
			each: function(obj, iter, bind) {
				return each.call(obj, iter, bind);
			},
			clone: clone,
			define: define,
			describe: describe,
			iterator: iterator,

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

			read: function(args, index, length) {
				var index = index || 0, length = length || args.length - index;
				if (length <= 1) {
					var arg = args[index];
					// Return null when nothing was provided
					if (arg instanceof this || arg == null)
						return arg;
				}
				var obj = new this(this.dont);
				obj = obj.initialize.apply(obj, index > 0 || length < args.length
						? slice.call(args, index, index + length)
						: args) || obj;
				return obj;
			},

			stop: {}
		}
	});
}
