new function() { 
	var fix = !this.__proto__ && [Function, Number, Boolean, String, Array, Date, RegExp];
	if (fix)
		for (var i in fix)
			fix[i].prototype.__proto__ = fix[i].prototype;

	var has = {}.hasOwnProperty
		? function(obj, name) {
			return (!fix || name != '__proto__') && obj.hasOwnProperty(name);
		}
		: function(obj, name) {
			return obj[name] !== (obj.__proto__ || Object.prototype)[name];
		};

	function inject(dest, src, enumerable, base, generics) {
		function field(name, dontCheck, generics) {
			var val = src[name], func = typeof val == 'function', res = val,
				prev = dest[name];
			if (generics && func && (!src.preserve || !generics[name])) generics[name] = function(bind) {
				return bind && dest[name].apply(bind,
					Array.prototype.slice.call(arguments, 1));
			}
			if ((dontCheck || val !== undefined && has(src, name)) && (!prev || !src.preserve)) {
				if (func) {
					if (prev && /\bthis\.base\b/.test(val)) {
						var fromBase = base && base[name] == prev;
						res = (function() {
							var tmp = this.base;
							this.base = fromBase ? base[name] : prev;
							try { return val.apply(this, arguments); }
							finally { tmp ? this.base = tmp : delete this.base; }
						}).pretend(val);
					}
				}
				dest[name] = res;
			}
		}
		if (src) {
			for (var name in src)
				if (has(src, name) && !/^(statics|generics|preserve|prototype|constructor|__proto__|toString|valueOf)$/.test(name))
					field(name, true, generics);
			field('toString');
			field('valueOf');
		}
	}

	function extend(obj) {
		function ctor(dont) {
			if (fix) this.__proto__ = obj;
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
				inject(proto, src, false, base && base.prototype, src.generics && this);
				inject(this, src.statics, true, base);
			}
			for (var i = 1, l = arguments.length; i < l; i++)
				this.inject(arguments[i]);
			return this;
		},

		extend: function(src) {
			var proto = new this(this.dont), ctor = proto.constructor = extend(proto);
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

	function each(obj, iter, bind) {
		return obj ? (typeof obj.length == 'number'
			? Array : Hash).prototype.each.call(obj, iter, bind) : bind;
	}

	Base = Object.extend({
		has: function(name) {
			return has(this, name);
		},

		each: function(iter, bind) {
			return each(this, iter, bind);
		},

		inject: function() {
			for (var i = 0, l = arguments.length; i < l; i++)
				inject(this, arguments[i]);
			return this;
		},

		extend: function() {
			var res = new (extend(this));
			return res.inject.apply(res, arguments);
		},

		statics: {
			has: has,
			each: each,

			type: function(obj) {
				return (obj || obj === 0) && (
					obj._type || obj.nodeName && (
						obj.nodeType == 1 && 'element' ||
						obj.nodeType == 3 && 'textnode' ||
						obj.nodeType == 9 && 'document')
						|| obj.location && obj.frames && obj.history && 'window'
						|| typeof obj) || null;
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

			iterator: function(iter) {
				return !iter
					? function(val) { return val }
					: typeof iter != 'function'
						? function(val) { return val == iter }
						: iter;
			},

			stop: {}
		}
	}, {
		generics: true,

		debug: function() {
			return /^(string|number|function|regexp)$/.test(Base.type(this)) ? this
				: Base.each(this, function(val, key) { this.push(key + ': ' + val); }, []).join(', ');
		},

		clone: function() {
			return Base.each(this, function(val, i) {
				this[i] = val;
			}, new this.constructor());
		},

		toQueryString: function() {
			return Base.each(this, function(val, key) {
				this.push(key + '=' + encodeURIComponent(val));
			}, []).join('&');
		}
	});
}