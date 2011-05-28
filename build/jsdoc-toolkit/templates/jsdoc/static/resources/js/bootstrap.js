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

$each = Base.each;
$type = Base.type;
$check = Base.check;
$pick = Base.pick;
$stop = $break = Base.stop;

Enumerable = {
	generics: true,
	preserve: true,

	findEntry: function(iter, bind) {
		var that = this, iter = Base.iterator(iter), ret = null;
		Base.each(this, function(val, key) {
			var res = iter.call(bind, val, key, that);
			if (res) {
				ret = { key: key, value: val, result: res };
				throw Base.stop;
			}
		});
		return ret;
	},

	find: function(iter, bind) {
		var entry = this.findEntry(iter, bind);
		return entry && entry.result;
	},

	contains: function(obj) {
		return !!this.findEntry(obj);
	},

	remove: function(iter, bind) {
		var entry = this.findEntry(iter, bind);
		if (entry) {
			delete this[entry.key];
			return entry.value;
		}
	},

	filter: function(iter, bind) {
		var that = this;
		return Base.each(this, function(val, i) {
			if (iter.call(bind, val, i, that))
				this[this.length] = val;
		}, []);
	},

	map: function(iter, bind) {
		var that = this;
		return Base.each(this, function(val, i) {
			this[this.length] = iter.call(bind, val, i, that);
		}, []);
	},

	every: function(iter, bind) {
		var that = this;
		return this.find(function(val, i) {
			return !iter.call(this, val, i, that);
		}, bind || null) == null;
	},

	some: function(iter, bind) {
		return this.find(iter, bind || null) != null;
	},

	collect: function(iter, bind) {
		var that = this, iter = Base.iterator(iter);
		return Base.each(this, function(val, i) {
		 	val = iter.call(bind, val, i, that);
			if (val != null)
				this[this.length] = val;
		}, []);
	},

	max: function(iter, bind) {
		var that = this;
		return Base.each(this, function(val, i) {
			val = iter.call(bind, val, i, that);
			if (val >= (this.max || val)) this.max = val;
		}, {}).max;
	},

	min: function(iter, bind) {
		var that = this;
		return Base.each(this, function(val, i) {
			val = iter.call(bind, val, i, that);
			if (val <= (this.min || val)) this.min = val;
		}, {}).min;
	},

	pluck: function(prop) {
		return this.map(function(val) {
			return val[prop];
		});
	},

	sortBy: function(iter, bind) {
		var that = this;
		return this.map(function(val, i) {
			return { value: val, compare: iter.call(bind, val, i, that) };
		}, bind).sort(function(left, right) {
			var a = left.compare, b = right.compare;
			return a < b ? -1 : a > b ? 1 : 0;
		}).pluck('value');
	},

	toArray: function() {
		return this.map(function(value) {
			return value;
		});
	}
};

Hash = Base.extend(Enumerable, {
	generics: true,

	initialize: function(arg) {
		if (typeof arg == 'string') {
			for (var i = 0, l = arguments.length; i < l; i += 2)
				this[arguments[i]] = arguments[i + 1];
		} else {
			this.append.apply(this, arguments);
		}
		return this;
	},

	each: function(iter, bind) {
		var bind = bind || this, iter = Base.iterator(iter), has = Base.has;
		try {
			for (var i in this)
				if (has(this, i))
					iter.call(bind, this[i], i, this);
		} catch (e) {
			if (e !== Base.stop) throw e;
		}
		return bind;
	},

	append: function() {
		for (var i = 0, l = arguments.length; i < l; i++) {
			var obj = arguments[i];
			for (var key in obj)
				if (Base.has(obj, key))
					this[key] = obj[key];
		}
		return this;
	},

	merge: function() {
		return Array.each(arguments, function(obj) {
			Base.each(obj, function(val, key) {
				this[key] = Base.type(this[key]) == 'object'
					? Hash.prototype.merge.call(this[key], val)
					: Base.type(val) == 'object' ? Base.clone(val) : val;
			}, this);
		}, this);
	},

	getKeys: function() {
		return Hash.getKeys(this);
	},

	getValues: Enumerable.toArray,

	getSize: function() {
		return this.each(function() {
			this.size++;
		}, { size: 0 }).size;
	},

	statics: {
		create: function(obj) {
			return arguments.length == 1 && obj.constructor == Hash
				? obj : Hash.prototype.initialize.apply(new Hash(), arguments);
		},

		getKeys: Object.keys || function(obj) {
			return Hash.map(function(val, key) {
				return key;
			});
		}
	}
});

$H = Hash.create;

Array.inject({
	generics: true,
	preserve: true,
	_type: 'array',

	forEach: function(iter, bind) {
		for (var i = 0, l = this.length; i < l; i++)
			iter.call(bind, this[i], i, this);
	},

	indexOf: function(obj, i) {
		i = i || 0;
		if (i < 0) i = Math.max(0, this.length + i);
		for (var l = this.length; i < l; i++)
			if (this[i] == obj) return i;
		return -1;
	},

	lastIndexOf: function(obj, i) {
		i = i != null ? i : this.length - 1;
		if (i < 0) i = Math.max(0, this.length + i);
		for (; i >= 0; i--)
			if (this[i] == obj) return i;
		return -1;
	},

	filter: function(iter, bind) {
		var res = [];
		for (var i = 0, l = this.length; i < l; i++) {
			var val = this[i];
			if (iter.call(bind, val, i, this))
				res[res.length] = val;
		}
		return res;
	},

	map: function(iter, bind) {
		var res = new Array(this.length);
		for (var i = 0, l = this.length; i < l; i++)
			res[i] = iter.call(bind, this[i], i, this);
		return res;
	},

	every: function(iter, bind) {
		for (var i = 0, l = this.length; i < l; i++)
			if (!iter.call(bind, this[i], i, this))
				return false;
		return true;
	},

	some: function(iter, bind) {
		for (var i = 0, l = this.length; i < l; i++)
			if (iter.call(bind, this[i], i, this))
				return true;
		return false;
	},

	reduce: function(fn, value) {
		var i = 0;
		if (arguments.length < 2 && this.length) value = this[i++];
		for (var l = this.length; i < l; i++)
			value = fn.call(null, value, this[i], i, this);
		return value;
	}
}, Enumerable, {
	generics: true,

	each: function(iter, bind) {
		try {
			Array.prototype.forEach.call(this, Base.iterator(iter), bind = bind || this);
		} catch (e) {
			if (e !== Base.stop) throw e;
		}
		return bind;
	},

	collect: function(iter, bind) {
		var that = this;
		return this.each(function(val, i) {
			if ((val = iter.call(bind, val, i, that)) != null)
				this[this.length] = val;
		}, []);
	},

	findEntry: function(iter, bind) {
		if (typeof iter != 'function') {
			var i = this.indexOf(iter);
			return i == -1 ? null : { key: i, value: iter, result: iter };
		}
		return Enumerable.findEntry.call(this, iter, bind);
	},

	remove: function(iter, bind) {
		var entry = this.findEntry(iter, bind);
		if (entry.key != null)
			this.splice(entry.key, 1);
		return entry.value;
	},

	remove: function(iter, bind) {
		var entry = this.findEntry(iter, bind);
		if (entry) {
			this.splice(entry.key, 1);
			return entry.value;
		}
	},

	toArray: function() {
		return Array.prototype.slice.call(this);
	},

	clone: function() {
		return this.toArray();
	},

	clear: function() {
		this.length = 0;
	},

	compact: function() {
		return this.filter(function(value) {
			return value != null;
		});
	},

	append: function(items) {
		for (var i = 0, l = items.length; i < l; i++)
			this[this.length++] = items[i];
		return this;
	},

	subtract: function(items) {
		for (var i = 0, l = items.length; i < l; i++)
			Array.remove(this, items[i]);
		return this;
	},

	intersect: function(items) {
		for (var i = this.length - 1; i >= 0; i--)
			if (!items.find(this[i]))
				this.splice(i, 1);
		return this;
	},

	associate: function(obj) {
		if (!obj)
			obj = this;
		else if (typeof obj == 'function')
			obj = this.map(obj);
		if (obj.length != null) {
			var that = this;
			return Base.each(obj, function(name, index) {
				this[name] = that[index];
				if (index == that.length)
					throw Base.stop;
			}, {});
		} else {
			obj = Hash.append({}, obj);
			return Array.each(this, function(val) {
				var type = Base.type(val);
				Base.each(obj, function(hint, name) {
					if (hint == 'any' || type == hint) {
						this[name] = val;
						delete obj[name];
						throw Base.stop;
					}
				}, this);
			}, {});
		}
	},

	flatten: function() {
		return Array.each(this, function(val) {
			if (val != null && val.flatten) this.append(val.flatten());
			else this.push(val);
		}, []);
	},

	swap: function(i, j) {
		var tmp = this[j];
		this[j] = this[i];
		this[i] = tmp;
		return tmp;
	},

	shuffle: function() {
		var res = this.clone();
		var i = this.length;
		while (i--) res.swap(i, Math.rand(i + 1));
		return res;
	},

	pick: function() {
		return this[Math.rand(this.length)];
	},

	getFirst: function() {
		return this[0];
	},

	getLast: function() {
		return this[this.length - 1];
	}
});

Array.inject(new function() {
	var proto = Array.prototype, fields = ['push','pop','shift','unshift','sort',
		'reverse','join','slice','splice','forEach','indexOf','lastIndexOf',
		'filter','map','every','some','reduce','concat'].each(function(name) {
		this[name] = proto[name];
	}, { generics: true, preserve: true });

	Array.inject(fields);

	Hash.append(fields, proto, {
		clear: function() {
			for (var i = 0, l = this.length; i < l; i++)
				delete this[i];
			this.length = 0;
		},

		concat: function(list) {
			return Browser.WEBKIT
				? new Array(this.length + list.length).append(this).append(list)
				: Array.concat(this, list);
		},

		toString: proto.join,

		length: 0
	});

	return {
		statics: {
			create: function(obj) {
				if (obj == null)
					return [];
				if (obj.toArray)
					return obj.toArray();
				if (typeof obj.length == 'number')
					return Array.prototype.slice.call(obj);
				return [obj];
			},

			convert: function(obj) {
				return Base.type(obj) == 'array' ? obj : Array.create(obj);
			},

			extend: function(src) {
				var ret = Base.extend(fields, src);
				ret.extend = Function.extend;
				return ret;
			}
		}
	};
});

$A = Array.create;

Function.inject(new function() {

	function timer(set) {
		return function(delay, bind, args) {
			var func = this.wrap(bind, args);
			if (delay === undefined)
				return func();
			var timer = set(func, delay);
			func.clear = function() {
				clearTimeout(timer);
				clearInterval(timer);
			};
			return func;
		};
	}

	return {
		generics: true,
		preserve: true,

		delay: timer(setTimeout),
		periodic: timer(setInterval),

		bind: function(bind) {
			var that = this, slice = Array.prototype.slice,
				args = arguments.length > 1 ? slice.call(arguments, 1) : null;
			return function() {
				return that.apply(bind, args ? arguments.length > 0
					? args.concat(slice.call(arguments)) : args : arguments);
			}
		},

		wrap: function(bind, args) {
			var that = this;
			return function() {
				return that.apply(bind, args || arguments);
			}
		}
	}
});

Number.inject({
	_type: 'number',

	limit: function(min, max) {
		return Math.min(max, Math.max(min, this));
	},

	times: function(func, bind) {
		for (var i = 0; i < this; i++)
			func.call(bind, i);
		return bind || this;
	},

	toInt: function(base) {
		return parseInt(this, base || 10);
	},

	toFloat: function() {
		return parseFloat(this);
	},

	toPaddedString: function(length, base, prefix) {
		var str = this.toString(base || 10);
		return (prefix || '0').times(length - str.length) + str;
	}
});

String.inject({
	_type: 'string',

	test: function(exp, param) {
		return new RegExp(exp, param || '').test(this);
	},

	toArray: function() {
		return this ? this.split(/\s+/) : [];
	},

	toInt: Number.prototype.toInt,

	toFloat: Number.prototype.toFloat,

	camelize: function(separator) {
		return this.replace(separator ? new RegExp('[' + separator + '](\\w)', 'g') : /-(\w)/g, function(all, chr) {
			return chr.toUpperCase();
		});
	},

	uncamelize: function(separator) {
		separator = separator || ' ';
		return this.replace(/[a-z][A-Z0-9]|[0-9][a-zA-Z]|[A-Z]{2}[a-z]/g, function(match) {
			return match.charAt(0) + separator + match.substring(1);
		});
	},

	hyphenate: function(separator) {
		return this.uncamelize(separator || '-').toLowerCase();
	},

	capitalize: function() {
		return this.replace(/\b[a-z]/g, function(match) {
			return match.toUpperCase();
		});
	},

	escapeRegExp: function() {
		return this.replace(/([-.*+?^${}()|[\]\/\\])/g, '\\$1');
	},

	trim: function(exp) {
		exp = exp ? '[' + exp + ']' : '\\s';
		return this.replace(new RegExp('^' + exp + '+|' + exp + '+$', 'g'), '');
	},

	clean: function() {
		return this.replace(/\s{2,}/g, ' ').trim();
	},

	contains: function(string, sep) {
		return (sep ? (sep + this + sep).indexOf(sep + string + sep) : this.indexOf(string)) != -1;
	},

	times: function(count) {
		return count < 1 ? '' : new Array(count + 1).join(this);
	},

	isHtml: function() {
		return /^[^<]*(<(.|\s)+>)[^>]*$/.test(this);
	}
});

RegExp.inject({
	_type: 'regexp'
});

Date.inject({
	statics: {
		SECOND: 1000,
		MINUTE: 60000,
		HOUR: 3600000,
		DAY: 86400000,
		WEEK: 604800000, 
		MONTH: 2592000000, 
		YEAR: 31536000000, 

		now: Date.now || function() {
			return +new Date();
		}
	}
});

Math.rand = function(first, second) {
	return second == undefined
		? Math.rand(0, first)
		: Math.floor(Math.random() * (second - first) + first);
}

Array.inject({
	hexToRgb: function(toArray) {
		if (this.length >= 3) {
			var rgb = [];
			for (var i = 0; i < 3; i++)
				rgb.push((this[i].length == 1 ? this[i] + this[i] : this[i]).toInt(16));
			return toArray ? rgb : 'rgb(' + rgb.join(',') + ')';
		}
	},

	rgbToHex: function(toArray) {
		if (this.length >= 3) {
			if (this.length == 4 && this[3] == 0 && !toArray) return 'transparent';
			var hex = [];
			for (var i = 0; i < 3; i++) {
				var bit = (this[i] - 0).toString(16);
				hex.push(bit.length == 1 ? '0' + bit : bit);
			}
			return toArray ? hex : '#' + hex.join('');
		}
	},

	rgbToHsb: function() {
		var r = this[0], g = this[1], b = this[2];
		var hue, saturation, brightness;
		var max = Math.max(r, g, b), min = Math.min(r, g, b);
		var delta = max - min;
		brightness = max / 255;
		saturation = (max != 0) ? delta / max : 0;
		if (saturation == 0) {
			hue = 0;
		} else {
			var rr = (max - r) / delta;
			var gr = (max - g) / delta;
			var br = (max - b) / delta;
			if (r == max) hue = br - gr;
			else if (g == max) hue = 2 + rr - br;
			else hue = 4 + gr - rr;
			hue /= 6;
			if (hue < 0) hue++;
		}
		return [Math.round(hue * 360), Math.round(saturation * 100), Math.round(brightness * 100)];
	},

	hsbToRgb: function() {
		var br = Math.round(this[2] / 100 * 255);
		if (this[1] == 0) {
			return [br, br, br];
		} else {
			var hue = this[0] % 360;
			var f = hue % 60;
			var p = Math.round((this[2] * (100 - this[1])) / 10000 * 255);
			var q = Math.round((this[2] * (6000 - this[1] * f)) / 600000 * 255);
			var t = Math.round((this[2] * (6000 - this[1] * (60 - f))) / 600000 * 255);
			switch (Math.floor(hue / 60)) {
				case 0: return [br, t, p];
				case 1: return [q, br, p];
				case 2: return [p, br, t];
				case 3: return [p, q, br];
				case 4: return [t, p, br];
				case 5: return [br, p, q];
			}
		}
	}
});

String.inject({
	hexToRgb: function(toArray) {
		var hex = this.match(/^#?(\w{1,2})(\w{1,2})(\w{1,2})$/);
		return hex && hex.slice(1).hexToRgb(toArray);
	},

	rgbToHex: function(toArray) {
		var rgb = this.match(/\d{1,3}/g);
		return rgb && rgb.rgbToHex(toArray);
	}
});

Json = function(JSON) {
	var special = { '\b': '\\b', '\t': '\\t', '\n': '\\n', '\f': '\\f', '\r': '\\r', '"' : '\\"', "'" : "\\'", '\\': '\\\\' };
	return {
		encode: JSON
			? JSON.stringify
			: function(obj, properties) {
				if (Base.type(properties) == 'array') {
					properties = properties.each(function(val) {
						this[val] = true;
					}, {});
				}
				switch (Base.type(obj)) {
					case 'string':
						return '"' + obj.replace(/[\x00-\x1f\\"]/g, function(chr) {
							return special[chr] || '\\u' + chr.charCodeAt(0).toPaddedString(4, 16);
						}) + '"';
					case 'array':
						return '[' + obj.collect(function(val) {
							return Json.encode(val, properties);
						}) + ']';
					case 'object':
					case 'hash':
						return '{' + Hash.collect(obj, function(val, key) {
							if (!properties || properties[key]) {
								val = Json.encode(val, properties);
								if (val !== undefined)
									return Json.encode(key) + ':' + val;
							}
						}) + '}';
					case 'function':
						return undefined;
					default:
						return obj + '';
				}
				return null;
			},

		decode: JSON
			? function(str, secure) {
				try {
					return JSON.parse(str);
				} catch (e) {
					return null;
				}
			}
			: function(str, secure) {
				try {
					return Base.type(str) == 'string' && (str = str.trim()) &&
						(!secure || /^[\],:{}\s]*$/.test(
							str.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, "@")
								.replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, "]")
								.replace(/(?:^|:|,)(?:\s*\[)+/g, "")))
									? (new Function('return ' + str))() : null;
				} catch (e) {
					return null;
				}
			}
	};
}(this.JSON);

Browser = new function() {
	var name = window.orientation != undefined ? 'ipod'
			: (navigator.platform.match(/mac|win|linux|nix/i) || ['other'])[0].toLowerCase();
	var fields = {
		PLATFORM: name,
		XPATH: !!document.evaluate,
		QUERY: !!document.querySelector
	};
	fields[name.toUpperCase()] = true;

	function getVersion(prefix, min, max) {
		var ver = (new RegExp(prefix + '([\\d.]+)', 'i').exec(navigator.userAgent) || [0, '0'])[1].split('.');
		return (ver.slice(0, min).join('') + '.' + ver.slice(min, max || ver.length).join('')).toFloat();
	}

	var engines = {
		presto: function() {
			return !window.opera ? false : getVersion('Presto/', 2) || getVersion('Opera[/ ]', 1);
		},

		trident: function() {
			return !window.ActiveXObject ? false : getVersion('MSIE ', 1);
		},

		webkit: function() {
			return navigator.taintEnabled ? false : getVersion('WebKit/', 1, 2);
		},

		gecko: function() {
			return !document.getBoxObjectFor && window.mozInnerScreenX == null ? false : getVersion('rv:', 2);
		}
	};

	for (var engine in engines) {
		var version = engines[engine]();
		if (version) {
			fields.ENGINE = engine;
			fields.VERSION = version;
			engine = engine.toUpperCase();
			fields[engine] = true;
			fields[(engine + version).replace(/\./g, '')] = true;
			break;
		}
	}

	fields.log = function() {
		if (!Browser.TRIDENT && window.console && console.log)
			console.log.apply(console, arguments);
		else
			(window.console && console.log
				|| window.opera && opera.postError
				|| alert)(Array.join(arguments, ' '));
	}

	return fields;
};

DomNodes = Array.extend(new function() {
	var unique = 0;
	return {
		initialize: function(nodes) {
			this._unique = unique++;
			this.append(nodes && nodes.length != null && !nodes.nodeType
				? nodes : arguments);
		},

		push: function() {
			this.append(arguments);
			return this.length;
		},

		append: function(items) {
			for (var i = 0, l = items.length; i < l; i++) {
				var el = items[i];
				if ((el = el && (el._wrapper || DomNode.wrap(el))) && el._unique != this._unique) {
					el._unique = this._unique;
					this[this.length++] = el;
				}
			}
			return this;
		},

		toNode: function() {
			return this;
		},

		statics: {
			inject: function(src) {
				var proto = this.prototype;
				this.base(Base.each(src || {}, function(val, key) {
					if (typeof val == 'function') {
						var func = val, prev = proto[key];
						var count = func.length, prevCount = prev && prev.length;
						val = function() {
							var args = arguments, values;
							if (prev && args.length == prevCount
								|| (args.length > count && args.length <= prevCount))
								return prev.apply(this, args);
							this.each(function(obj) {
								var ret = (obj[key] || func).apply(obj, args);
								if (ret !== undefined && ret != obj) {
									values = values || (DomNode.isNode(ret)
										? new obj._collection() : []);
									values.push(ret);
								}
							});
							return values || this;
						}
					}
					this[key] = val;
				}, {}));
				for (var i = 1, l = arguments.length; i < l; i++)
					this.inject(arguments[i]);
				return this;
			}
		}
	};
});

DomNode = Base.extend(new function() {
	var nodes = [];
	var tags = {}, classes = {}, classCheck, unique = 0;

	function dispose(force) {
		for (var i = nodes.length - 1; i >= 0; i--) {
			var el = nodes[i];
			if (force || (!el || el != window && el != document &&
				(!el.parentNode || !el.offsetParent))) {
				if (el) {
					var obj = el._wrapper;
					if (obj && obj.finalize) obj.finalize();
					el._wrapper = el._unique = null;
				}
				if (!force) nodes.splice(i, 1);
			}
		}
	}

	function inject(src) {
		src = src || {};
		(src._methods || []).each(function(name) {
			src[name] = function(arg) {
				var ret = this.$[name] && this.$[name](arg);
				return ret === undefined ? this : ret;
			}
		});
		(src._properties || []).each(function(name) {
			var part = name.capitalize(), prop = name.toLowerCase();
			src['get' + part] = function() {
				return this.getProperty(prop);
			}
			src['set' + part] = function(value) {
				return this.setProperty(prop, value);
			}
		});
		delete src._methods;
		delete src._properties;
		return Function.inject.call(this, src);
	}

	function getConstructor(el) {
		var match;
		return classCheck && el.className && (match = el.className.match(classCheck)) && match[2] && classes[match[2]] ||
			el.tagName && tags[el.tagName] ||
			el.className !== undefined && HtmlElement ||
			el.nodeType == 1 && DomElement ||
			el.nodeType == 3 && DomTextNode ||
			el.nodeType == 9 && (el.documentElement.nodeName.toLowerCase() == 'html' && HtmlDocument || DomDocument) ||
			el.location && el.frames && el.history && DomWindow ||
			DomNode;
	}

	var dont = {};

	return {
		_type: 'node',
		_collection: DomNodes,
		_initialize: true,

		initialize: function(el, props, doc) {
			if (!el) return null;
			if (this._tag && Base.type(el) == 'object') {
				props = el;
				el = this._tag;
			}
			if (typeof(el) == 'string') {
				el = DomElement.create(el, props, doc);
			} else if (el._wrapper) {
				return el._wrapper;
			}
			if (props === dont) {
				props = null;
			} else {
				var ctor = getConstructor(el);
				if (ctor != this.constructor)
					return new ctor(el, props);
			}
			this.$ = el;
			try {
				el._wrapper = this;
				nodes[nodes.length] = el;
			} catch (e) {} 
			if (props) this.set(props);
		},

		statics: {
			inject: function(src) {
				if (src) {
					var proto = this.prototype, that = this;
					src.statics = Base.each(src, function(val, name) {
						if (typeof val == 'function' && !this[name] && !that[name]) {
							this[name] = function(el, param1, param2) {
								if (el) try {
									proto.$ = el.$ || el;
									return proto[name](param1, param2);
								} finally {
									delete proto.$;
								}
							}
						}
					}, src.statics || {});
					inject.call(this, src);
					delete src.toString;
					proto._collection.inject(src);
				}
				for (var i = 1, l = arguments.length; i < l; i++)
					this.inject(arguments[i]);
				return this;
			},

			extend: function(src) {
				var ret = this.base();
				var init = src.initialize;
				if (init) src.initialize = function(el, props) {
					var ret = this._initialize && this.base(el, props);
					if (ret) return ret;
					init.apply(this, arguments);
				}
				inject.call(ret, src);
				if (ret.prototype._collection == this.prototype._collection)
					ret.inject = inject;
				if (src) {
					if (src._tag)
						tags[src._tag.toLowerCase()] = tags[src._tag.toUpperCase()] = ret;
					if (src._class) {
						classes[src._class] = ret;
						classCheck = new RegExp('(^|\\s)(' + Base.each(classes, function(val, name) {
							this.push(name);
						}, []).join('|') + ')(\\s|$)');
						if (!src._lazy && src.initialize) Browser.document.addEvent('domready', function() {
							this.getElements('.' + src._class);
						});
					}
				}
				return ret;
			},

			wrap: function(el) {
				return el ? typeof el == 'string' 
					? DomElement.get(el)
					: el._wrapper || el._collection && el || new (getConstructor(el))(el, dont)
						: null;
			},

			unwrap: function(el) {
				return el && el.$ || el;
			},

			unique: function(el) {
				if (!el._unique) {
					nodes.push(el);
					el._unique = ++unique;
				}
			},

			isNode: function(obj) {
				return /^(element|node|textnode|document)$/.test(
					typeof obj == 'string' ? obj : Base.type(obj));
			},

			dispose: function() {
				dispose(true);
			}
		}
	}
});

DomNode.inject(new function() {
	var bools = ['compact', 'nowrap', 'ismap', 'declare', 'noshade', 'checked',
		'disabled', 'readonly', 'multiple', 'selected', 'noresize', 'defer'
	].associate();
	var properties = Hash.append({ 
		text: Browser.TRIDENT || Browser.WEBKIT && Browser.VERSION < 420 || Browser.PRESTO && Browser.VERSION < 9
			? function(node) {
				return node.$.innerText !== undefined ? 'innerText' : 'nodeValue'
			} : 'textContent',
		html: 'innerHTML', 'class': 'className', className: 'className', 'for': 'htmlFor'
	}, [ 
		'value', 'accessKey', 'cellPadding', 'cellSpacing', 'colSpan',
		'frameBorder', 'maxLength', 'readOnly', 'rowSpan', 'tabIndex',
		'selectedIndex', 'useMap', 'width', 'height'
	].associate(function(name) {
		return name.toLowerCase();
	}), bools);

	var clones = { input: 'checked', option: 'selected', textarea: Browser.WEBKIT && Browser.VERSION < 420 ? 'innerHTML' : 'value' };

	function handle(that, prefix, name, value) {
		var ctor = that.__proto__.constructor;
		var handlers = ctor.handlers = ctor.handlers || { get: {}, set: {} };
		var list = handlers[prefix];
		var fn = name == 'events' && prefix == 'set' ? that.addEvents : list[name];
		if (fn === undefined)
			fn = list[name] = that[prefix + name.capitalize()] || null;
		return fn
			? fn[Base.type(value) == 'array' ? 'apply' : 'call'](that, value)
			: that[prefix + 'Property'](name, value);
	}

	function toNodes(elements) {
		var els = Base.type(elements) == 'array' ? elements : Array.create(arguments);
		var created = els.find(function(el) {
			return !DomNode.isNode(el);
		});
		var result = els.toNode(this.getDocument());
		return {
			array: result ? (Base.type(result) == 'array' ? result : [result]) : [],
			result: created && result
		};
	}

	var fields = {
		_properties: ['text'],

		set: function(name, value) {
			switch (Base.type(name)) {
				case 'string':
					return handle(this, 'set', name, value);
				case 'object':
					return Base.each(name, function(value, key) {
						handle(this, 'set', key, value);
					}, this);
			}
			return this;
		},

		get: function(name) {
			return handle(this, 'get', name);
		},

		getDocument: function() {
			return DomNode.wrap(this.$.ownerDocument);
		},

		getWindow: function() {
			return this.getDocument().getWindow();
		},

		getPreviousNode: function() {
			return DomNode.wrap(this.$.previousSibling);
		},

		getNextNode: function() {
			return DomNode.wrap(this.$.nextSibling);
		},

		getFirstNode: function() {
			return DomNode.wrap(this.$.firstChild);
		},

		getLastNode: function() {
			return DomNode.wrap(this.$.lastChild);
		},

		getParentNode: function() {
			return DomNode.wrap(this.$.parentNode);
		},

		getChildNodes: function() {
		 	return new DomNodes(this.$.childNodes);
		},

		hasChildNodes: function() {
			return this.$.hasChildNodes();
		},

		appendChild: function(el) {
			if (el = DomNode.wrap(el)) {
				var text = Browser.TRIDENT && el.$.text;
				if (text) el.$.text = '';
				this.$.appendChild(el.$);
				if (text) el.$.text = text;
			}
			return this;
		},

		appendChildren: function() {
			return Array.flatten(arguments).each(function(el) {
				this.appendChild($(DomNode.wrap(el)));
			}, this);
		},

		appendText: function(text) {
			return this.injectBottom(this.getDocument().createTextNode(text));
		},

		prependText: function(text) {
			return this.injectTop(this.getDocument().createTextNode(text));
		},

		remove: function() {
			if (this.$.parentNode)
				this.$.parentNode.removeChild(this.$);
			return this;
		},

		removeChild: function(el) {
			el = DomNode.wrap(el);
			this.$.removeChild(el.$);
			return el;
		},

		removeChildren: function() {
			var nodes = this.getChildNodes();
			nodes.remove();
			return nodes;
		},

		replaceWith: function(el) {
			if (this.$.parentNode) {
				el = toNodes.apply(this, arguments);
				var els = el.array;
				if (els.length > 0)
					this.$.parentNode.replaceChild(els[0].$, this.$);
				for (var i = els.length - 1; i > 0; i--)
					els[i].insertAfter(els[0]);
				return el.result;
			}
			return null;
		},

		wrap: function() {
			var el = this.injectBefore.apply(this, arguments), last;
			do {
				last = el;
				el = el.getFirst();
			} while(el);
			last.appendChild(this);
			return last;
		},

		clone: function(contents) {
			var clone = this.$.cloneNode(!!contents);
			function clean(left, right) {
				if (Browser.TRIDENT) {
					left.clearAttributes();
					left.mergeAttributes(right);
					left.removeAttribute('_wrapper');
					left.removeAttribute('_unique');
					if (left.options)
						for (var l = left.options, r = right.options, i = l.length; i--;)
							l[i].selected = r[i].selected;
				}
				var name = clones[right.tagName.toLowerCase()];
				if (name && right[name])
					left[name] = right[name];
				if (contents)
					for (var l = left.childNodes, r = right.childNodes, i = l.length; i--;)
						clean(l[i], r[i]);
			}
			clean(clone, this.$);
			return DomNode.wrap(clone);
		},

		getProperty: function(name) {
			var key = properties[name], value;
			key = key && typeof key == 'function' ? key(this) : key;
			var value = key ? this.$[key] : this.$.getAttribute(name);
			return bools[name] ? !!value : value;
		},

		setProperty: function(name, value) {
			var key = properties[name], defined = value !== undefined;
			key = key && typeof key == 'function' ? key(this) : key;
			if (key && bools[name]) value = value || !defined ? true : false;
			else if (!defined) return this.removeProperty(name);
			key ? this.$[key] = value : this.$.setAttribute(name, value);
			return this;
		},

		removeProperty: function(name) {
			var key = properties[name], bool = key && bools[name];
			key = key && typeof key == 'function' ? key(this) : key;
			key ? this.$[key] = bool ? false : '' : this.$.removeAttribute(name);
			return this;
		},

		getProperties: function() {
			var props = {};
			for (var i = 0; i < arguments.length; i++)
				props[arguments[i]] = this.getProperty(arguments[i]);
			return props;
		},

		setProperties: function(src) {
			return Base.each(src, function(value, name) {
				this.setProperty(name, value);
			}, this);
		},

		removeProperties: function() {
			return Array.each(arguments, this.removeProperty, this);
		}
	};

	var inserters = {
		before: function(source, dest) {
			if (source && dest && dest.$.parentNode) {
				var text = Browser.TRIDENT && dest.$.text;
				if (text) dest.$.text = '';
				dest.$.parentNode.insertBefore(source.$, dest.$);
				if (text) dest.$.text = text;
			}
		},

		after: function(source, dest) {
			if (source && dest && dest.$.parentNode) {
				var next = dest.$.nextSibling;
				if (next) source.insertBefore(next);
				else dest.getParent().appendChild(source);
			}
		},

		bottom: function(source, dest) {
			if (source && dest)
				dest.appendChild(source);
		},

		top: function(source, dest) {
			if (source && dest) {
				var first = dest.$.firstChild;
				if (first) source.insertBefore(first);
				else dest.appendChild(source);
			}
		}
	};

	inserters.inside = inserters.bottom;

	Base.each(inserters, function(inserter, name) {
		var part = name.capitalize();
		fields['insert' + part] = function(el) {
			el = toNodes.apply(this, arguments);
			for (var i = 0, list = el.array, l = list.length; i < l; i++)
				inserter(i == 0 ? this : this.clone(true), list[i]);
			return el.result || this;
		}

		fields['inject' + part] = function(el) {
			el = toNodes.apply(this, arguments);
			for (var i = 0, list = el.array, l = list.length; i < l; i++)
				inserter(list[i], this);
			return el.result || this;
		}
	});

	return fields;
});

DomElements = DomNodes.extend();

DomElement = DomNode.extend({
	_type: 'element',
	_collection: DomElements,

	statics: {
		get: function(selector, root) {
			return (root && DomNode.wrap(root) || Browser.document).getElement(selector);
		},

		getAll: function(selector, root) {
			return (root && DomNode.wrap(root) || Browser.document).getElements(selector);
		},

		create: function(tag, props, doc) {
			if (Browser.TRIDENT && props) {
				['name', 'type', 'checked'].each(function(key) {
					if (props[key]) {
						tag += ' ' + key + '="' + props[key] + '"';
						if (key != 'checked')
							delete props[key];
					}
				});
				tag = '<' + tag + '>';
			}
			return (DomElement.unwrap(doc) || document).createElement(tag);
		},

		isAncestor: function(el, parent) {
			return !el ? false : el.ownerDocument == parent ? true
				: Browser.WEBKIT && Browser.VERSION < 420
					? Array.contains(parent.getElementsByTagName(el.tagName), el)
					: parent.contains
						? parent != el && parent.contains(el)
						: !!(parent.compareDocumentPosition(el) & 16)
		}
	}
});

DomElement.inject(new function() {
	function walk(el, walk, start, match, all) {
		var elements = all && new el._collection();
		el = el.$[start || walk];
		while (el) {
			if (el.nodeType == 1 && (!match || DomElement.match(el, match))) {
				if (!all) return DomNode.wrap(el);
				elements.push(el);
			}
			el = el[walk];
		}
		return elements;
	}

	return {
		_properties: ['id'],

		getTag: function() {
			return (this.$.tagName || '').toLowerCase();
		},

		getPrevious: function(match) {
			return walk(this, 'previousSibling', null, match);
		},

		getAllPrevious: function(match) {
			return walk(this, 'previousSibling', null, match, true);
		},

		getNext: function(match) {
			return walk(this, 'nextSibling', null, match);
		},

		getAllNext: function(match) {
			return walk(this, 'nextSibling', null, match, true);
		},

		getFirst: function(match) {
			return walk(this, 'nextSibling', 'firstChild', match);
		},

		getLast: function(match) {
			return walk(this, 'previousSibling', 'lastChild', match);
		},

		hasChild: function(match) {
			return DomNode.isNode(match)
				? DomElement.isAncestor(DomElement.unwrap(match), this.$)
				: !!this.getFirst(match);
		},

		getParent: function(match) {
			return walk(this, 'parentNode', null, match);
		},

		getParents: function(match) {
			return walk(this, 'parentNode', null, match, true);
		},

		hasParent: function(match) {
			return DomNode.isNode(match)
				? DomElement.isAncestor(this.$, DomElement.unwrap(match))
				: !!this.getParent(match);
		},

		getChildren: function(match) {
			return walk(this, 'nextSibling', 'firstChild', match, true);
		},

		hasChildren: function(match) {
			return !!this.getChildren(match).length;
		},

		toString: function() {
			return (this.$.tagName || this._type).toLowerCase() +
				(this.$.id ? '#' + this.$.id : '');
		},

		toNode: function() {
			return this;
		}
	};
});

$ = DomElement.get;
$$ = DomElement.getAll;

DomTextNode = DomNode.extend({
	_type: 'textnode'
});

DomDocument = DomElement.extend({
	_type: 'document',

	initialize: function() {
		if(Browser.TRIDENT && Browser.VERSION < 7)
			try {
				this.$.execCommand('BackgroundImageCache', false, true);
			} catch (e) {}
	},

	createElement: function(tag, props) {
		return DomNode.wrap(DomElement.create(tag, props, this.$)).set(props);
	},

	createTextNode: function(text) {
		return $(this.$.createTextNode(text));
	},

	getDocument: function() {
		return this;
	},

	getWindow: function() {
		return DomNode.wrap(this.$.defaultView || this.$.parentWindow);
	},

	open: function() {
		this.$.open();
	},

	close: function() {
		this.$.close();
	},

	write: function(markup) {
		this.$.write(markup);
	},

	writeln: function(markup) {
		this.$.writeln(markup);
	}
});

Window = DomWindow = DomElement.extend({
	_type: 'window',
	_initialize: false,
	_methods: ['close', 'alert', 'prompt', 'confirm', 'blur', 'focus', 'reload'],

	getDocument: function() {
		return DomNode.wrap(this.$.document);
	},

	getWindow: function() {
		return this;
	},

	initialize: function(param) {
		var win;
		if (param.location && param.frames && param.history) {
			win = this.base(param) || this;
		} else {
			if (typeof param == 'string')
				param = { url: param };
			(['toolbar','menubar','location','status','resizable','scrollbars']).each(function(key) {
				param[key] = param[key] ? 1 : 0;
			});
			if (param.width && param.height) {
				if (param.left == null) param.left = Math.round(
					Math.max(0, (screen.width - param.width) / 2));
				if (param.top == null) param.top = Math.round(
					Math.max(0, (screen.height - param.height) / 2 - 40));
			}
			var str = Base.each(param, function(val, key) {
				if (!/^(focus|confirm|url|name)$/.test(key))
					this.push(key + '=' + (val + 0));
			}, []).join();
			win = this.base(window.open(param.url, param.name.replace(/\s+|\.+|-+/gi, ''), str)) || this;
			if (win && param.focus)
				win.focus();
		}
		return ['location', 'frames', 'history'].each(function(key) {
			this[key] = this.$[key];
		}, win);
	}
});

DomElement.inject(new function() {
	function cumulate(name, parent, iter) {
		var left = name + 'Left', top = name + 'Top';
		return function(that) {
			var cur, next = that, x = 0, y = 0;
			do {
				cur = next;
				x += cur.$[left] || 0;
				y += cur.$[top] || 0;
			} while((next = DomNode.wrap(cur.$[parent])) && (!iter || iter(cur, next)))
			return { x: x, y: y };
		}
	}

	function bounds(fields, offset) {
		return function(values) {
			var vals = /^(object|array)$/.test(Base.type(values)) ? values : arguments;
			if (offset) {
				if (vals.x) vals.left = vals.x;
				if (vals.y) vals.top = vals.y;
			}
			var i = 0;
			return fields.each(function(name) {
				var val = vals.length ? vals[i++] : vals[name];
				if (val != null) this.setStyle(name, val);
			}, this);
		}
	}

	function body(that) {
		return that.getTag() == 'body';
	}

	var getAbsolute = cumulate('offset', 'offsetParent', Browser.WEBKIT ? function(cur, next) {
		return next.$ != document.body || cur.getStyle('position') != 'absolute';
	} : null, true);

	var getPositioned = cumulate('offset', 'offsetParent', function(cur, next) {
		return next.$ != document.body && !/^(relative|absolute)$/.test(next.getStyle('position'));
	});

	var getScrollOffset = cumulate('scroll', 'parentNode');

	var fields = {

		getSize: function() {
			return body(this)
				? this.getWindow().getSize()
				: { width: this.$.offsetWidth, height: this.$.offsetHeight };
		},

		getOffset: function(relative) {
			if (body(this))
				return this.getWindow().getOffset();
		 	if (relative && !DomNode.isNode(relative))
				return getPositioned(this);
			var off = getAbsolute(this);
			if (relative) {
				var rel = getAbsolute(DomNode.wrap(relative));
				off = { x: off.x - rel.x, y: off.y - rel.y };
			}
			return off;
		},

		getScrollOffset: function() {
			return body(this)
				? this.getWindow().getScrollOffset()
			 	: getScrollOffset(this);
		},

		getScrollSize: function() {
			return body(this)
				? this.getWindow().getScrollSize()
				: { width: this.$.scrollWidth, height: this.$.scrollHeight };
		},

		getBounds: function(relative) {
			if (body(this))
				return this.getWindow().getBounds();
			var off = this.getOffset(relative), el = this.$;
			return {
				left: off.x,
				top: off.y,
				right: off.x + el.offsetWidth,
				bottom: off.y + el.offsetHeight,
				width: el.offsetWidth,
				height: el.offsetHeight
			};
		},

		setBounds: bounds(['left', 'top', 'width', 'height', 'clip'], true),

		setOffset: bounds(['left', 'top'], true),

		setSize: bounds(['width', 'height', 'clip']),

		setScrollOffset: function(x, y) {
			if (body(this)) {
				this.getWindow().setScrollOffset(x, y);
			} else {
				var off = typeof x == 'object' ? x : { x: x, y: y };
				this.$.scrollLeft = off.x;
				this.$.scrollTop = off.y;
			}
			return this;
		},

		scrollTo: function(x, y) {
			return this.setScrollOffset(x, y);
		},

		contains: function(pos) {
			var bounds = this.getBounds();
			return pos.x >= bounds.left && pos.x < bounds.right &&
				pos.y >= bounds.top && pos.y < bounds.bottom;
		}
	};

	['left', 'top', 'right', 'bottom', 'width', 'height'].each(function(name) {
		var part = name.capitalize();
		fields['get' + part] = function() {
			return this.$['offset' + part];
		};
		fields['set' + part] = function(value) {
			this.$.style[name] = isNaN(value) ? value : value + 'px';
		};
	});

	return fields;
});

[DomDocument, DomWindow].each(function(ctor) {
	ctor.inject(this);
}, {

	getSize: function() {
		if (Browser.PRESTO || Browser.WEBKIT) {
			var win = this.getWindow().$;
			return { width: win.innerWidth, height: win.innerHeight };
		}
		var doc = this.getCompatElement();
		return { width: doc.clientWidth, height: doc.clientHeight };
	},

	getScrollOffset: function() {
		var win = this.getWindow().$, doc = this.getCompatElement();
		return { x: win.pageXOffset || doc.scrollLeft, y: win.pageYOffset || doc.scrollTop };
	},

	getScrollSize: function() {
		var doc = this.getCompatElement(), min = this.getSize();
		return { width: Math.max(doc.scrollWidth, min.width), height: Math.max(doc.scrollHeight, min.height) };
	},

	getOffset: function() {
		return { x: 0, y: 0 };
	},

	getBounds: function() {
		var size = this.getSize();
		return {
			left: 0, top: 0,
			right: size.width, bottom: size.height,
			width: size.width, height: size.height
		};
	},

	setScrollOffset: function(x, y) {
		var off = typeof x == 'object' ? x : { x: x, y: y };
		this.getWindow().$.scrollTo(off.x, off.y);
		return this;
	},

	getElementAt: function(pos, exclude) {
		var el = this.getDocument().getElement('body');
		while (true) {
			var max = -1;
			var ch = el.getFirst();
			while (ch) {
				if (ch.contains(pos) && ch != exclude) {
					var z = ch.$.style.zIndex.toInt() || 0;
					if (z >= max) {
						el = ch;
						max = z;
					}
				}
				ch = ch.getNext();
			}
			if (max < 0) break;
		}
		return el;
	},

	getCompatElement: function() {
		var doc = this.getDocument();
		return doc.getElement(!doc.$.compatMode
				|| doc.$.compatMode == 'CSS1Compat' ? 'html' : 'body').$;
	}
});

DomEvent = Base.extend(new function() {
	var keys = {
		 '8': 'backspace',
		'13': 'enter',
		'27': 'escape',
		'32': 'space',
		'37': 'left',
		'38': 'up',
		'39': 'right',
		'40': 'down',
		'46': 'delete'
	};

	function hover(name, type) {
		return {
			type: type,
			listener: function(event) {
				if (event.relatedTarget != this && !this.hasChild(event.relatedTarget))
					this.fireEvent(name, [event]);
			}
		}
	}

	return {
		initialize: function(event) {
			this.event = event = event || window.event;
			this.type = event.type;
			this.target = DomNode.wrap(event.target || event.srcElement);
			if (this.target && this.target.$.nodeType == 3)
				this.target = this.target.getParent(); 
			this.shift = event.shiftKey;
			this.control = event.ctrlKey;
			this.alt = event.altKey;
			this.meta = event.metaKey;
			if (/^(mousewheel|DOMMouseScroll)$/.test(this.type)) {
				this.wheel = event.wheelDelta ?
					event.wheelDelta / (window.opera ? -120 : 120) :
					- (event.detail || 0) / 3;
			} else if (/^key/.test(this.type)) {
				this.code = event.which || event.keyCode;
				this.key = keys[this.code] || String.fromCharCode(this.code).toLowerCase();
			} else if (/^mouse|^click$/.test(this.type)) {
				this.page = {
					x: event.pageX || event.clientX + document.documentElement.scrollLeft,
					y: event.pageY || event.clientY + document.documentElement.scrollTop
				};
				this.client = {
					x: event.pageX ? event.pageX - window.pageXOffset : event.clientX,
					y: event.pageY ? event.pageY - window.pageYOffset : event.clientY
				};
				var offset = this.target.getOffset();
				this.offset = {
					x: this.page.x - offset.x,
					y: this.page.y - offset.y
				}
				this.rightClick = event.which == 3 || event.button == 2;
				if (/^mouse(over|out)$/.test(this.type))
					this.relatedTarget = DomNode.wrap(event.relatedTarget ||
						this.type == 'mouseout' ? event.toElement : event.fromElement);
			}
		},

		stop: function() {
			this.stopPropagation();
			this.preventDefault();
			return this;
		},

		stopPropagation: function() {
			if (this.event.stopPropagation) this.event.stopPropagation();
			else this.event.cancelBubble = true;
			this.stopped = true;
			return this;
		},

		preventDefault: function() {
			if (this.event.preventDefault) this.event.preventDefault();
			else this.event.returnValue = false;
			return this;
		},

		statics: {
			events: new Hash({
				mouseenter: hover('mouseenter', 'mouseover'),

				mouseleave: hover('mouseleave', 'mouseout'),

				mousewheel: { type: Browser.GECKO ? 'DOMMouseScroll' : 'mousewheel' },

				domready: function(func) {
					var win = this.getWindow(), doc = this.getDocument();
					if (Browser.loaded) {
						func.call(this);
					} else if (!doc.onDomReady) {
						doc.onDomReady = function() {
							if (!Browser.loaded) {
								Browser.loaded = true;
								doc.fireEvent('domready');
								win.fireEvent('domready');
							}
						}
						if (Browser.TRIDENT) {
							var temp = doc.createElement('div');
							(function() {
								try {
									temp.$.doScroll('left');
									temp.insertBottom(DomElement.get('body')).setHtml('temp').remove();
									doc.onDomReady();
								} catch (e) {
									arguments.callee.delay(50);
								}
							}).delay(0);
						} else if (Browser.WEBKIT && Browser.VERSION < 525) {
							(function() {
								/^(loaded|complete)$/.test(doc.$.readyState)
									? doc.onDomReady() : arguments.callee.delay(50);
							})();
						} else {
							win.addEvent('load', doc.onDomReady);
							doc.addEvent('DOMContentLoaded', doc.onDomReady);
						}
					}
				}
			}),

			add: function(events) {
				this.events.append(events);
			}
		}
	};
});

DomElement.inject(new function() {
	function callEvent(fire) {
		return function(type, args, delay) {
			var entries = (this.events || {})[type];
			if (entries) {
				var event = args && args[0];
				if (event)
					args[0] = event.event ? event : new DomEvent(event);
				entries.each(function(entry) {
					entry[fire ? 'func' : 'bound'].delay(delay, this, args);
				}, this);
			}
			return !!entries;
		}
	}

	return {
		addEvent: function(type, func) {
			this.events = this.events || {};
			var entries = this.events[type] = this.events[type] || [];
			if (func && !entries.find(function(entry) { return entry.func == func })) {
				var listener = func, name = type, pseudo = DomEvent.events[type];
				if (pseudo) {
					if (typeof pseudo == 'function') pseudo = pseudo.call(this, func);
					listener = pseudo && pseudo.listener || listener;
					name = pseudo && pseudo.type;
				}
				var that = this, bound = function(event) {
						if (event || window.event)
						 	event = event && event.event ? event : new DomEvent(event);
						if (listener.call(that, event) === false && event)
							event.stop();
					};
				if (name) {
					if (this.$.addEventListener) {
						this.$.addEventListener(name, bound, false);
					} else if (this.$.attachEvent) {
						this.$.attachEvent('on' + name, bound);
					}
				}
				entries.push({ func: func, name: name, bound: bound });
			}
			return this;
		},

		removeEvent: function(type, func) {
			var entries = (this.events || {})[type], entry;
			if (func && entries) {
				if (entry = entries.remove(function(entry) { return entry.func == func })) {
					var name = entry.name, pseudo = DomEvent.events[type];
					if (pseudo && pseudo.remove) pseudo.remove.call(this, func);
					if (name) {
						if (this.$.removeEventListener) {
							this.$.removeEventListener(name, entry.bound, false);
						} else if (this.$.detachEvent) {
							this.$.detachEvent('on' + name, entry.bound);
						}
					}
				}
			}
			return this;
		},

		addEvents: function(events) {
			return Base.each(events || [], function(fn, type) {
				this.addEvent(type, fn);
			}, this);
		},

		removeEvents: function(type) {
			if (this.events) {
				if (type) {
					(this.events[type] || []).each(function(fn) {
						this.removeEvent(type, fn);
					}, this);
					delete this.events[type];
				} else {
					Base.each(this.events, function(ev, type) {
						this.removeEvents(type);
					}, this);
					this.events = null;
				}
			}
			return this;
		},

		fireEvent: callEvent(true),

		triggerEvent: callEvent(false),

		finalize: function() {
			this.removeEvents();
		}
	};
});

DomEvent.add(new function() {
	var object, last;

	function dragStart(event) {
		if (object != this) {
			event.type = 'dragstart';
			last = event.page;
			this.fireEvent('dragstart', [event]);
			if (!event.stopped) {
				event.stop();
				var doc = this.getDocument();
				doc.addEvent('mousemove', drag);
				doc.addEvent('mouseup', dragEnd);
				object = this;
			}
		}
	}

	function drag(event) {
		event.type = 'drag';
		event.delta = {
			x: event.page.x - last.x,
			y: event.page.y - last.y
		}
		last = event.page;
		object.fireEvent('drag', [event]);
		event.preventDefault();
	}

	function dragEnd(event) {
		if (object) {
			event.type = 'dragend';
			object.fireEvent('dragend', [event]);
			event.preventDefault();
			var doc = object.getDocument();
			doc.removeEvent('mousemove', drag);
			doc.removeEvent('mouseup', dragEnd);
			object = null;
		}
	}

	return {
		dragstart: {
			type: 'mousedown',
			listener: dragStart
		},

		drag: {
			type: 'mousedown',
			listener: dragStart
		},

		dragend: {}
	};
});

DomElement.inject(new function() {
	var XPATH= 0, FILTER = 1;

	var methods = [{ 
		getParam: function(items, separator, context, params) {
			var str = context.namespaceURI ? 'xhtml:' + params.tag : params.tag;
			if (separator && (separator = DomElement.separators[separator]))
				str = separator[XPATH] + str;
			for (var i = params.pseudos.length; i--;) {
				var pseudo = params.pseudos[i];
				str += pseudo.handler[XPATH](pseudo.argument);
			}
			if (params.id) str += '[@id="' + params.id + '"]';
			for (var i = params.classes.length; i--;)
				str += '[contains(concat(" ", @class, " "), " ' + params.classes[i] + ' ")]';
			for (var i = params.attributes.length; i--;) {
				var attribute = params.attributes[i];
				var operator = DomElement.operators[attribute[1]];
				if (operator) str += operator[XPATH](attribute[0], attribute[2]);
				else str += '[@' + attribute[0] + ']';
			}
			items.push(str);
			return items;
		},

		getElements: function(items, elements, context) {
			function resolver(prefix) {
				return prefix == 'xhtml' ? 'http://www.w3.org/1999/xhtml' : false;
			}
			var res = (context.ownerDocument || context).evaluate('.//' + items.join(''), context,
				resolver, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
			for (var i = 0, l = res.snapshotLength; i < l; i++)
				elements.push(res.snapshotItem(i));
		}
	}, { 
		getParam: function(items, separator, context, params, data) {
			var found = [];
			var tag = params.tag;
			if (separator && (separator = DomElement.separators[separator])) {
				separator = separator[FILTER];
				var uniques = {};
				function add(item) {
					if (!item._unique)
						DomNode.unique(item);
					if (!uniques[item._unique] && match(item, params, data)) {
						uniques[item._unique] = true;
						found.push(item);
						return true;
					}
				}
				for (var i = 0, l = items.length; i < l; i++)
					separator(items[i], params, add);
				if (params.clearTag)
					params.tag = params.clearTag = null;
				return found;
			}
			if (params.id) {
				var el = (context.ownerDocument || context).getElementById(params.id);
				params.id = null;
				return el && DomElement.isAncestor(el, context)
					&& match(el, params, data) ? [el] : null;
			} else {
				if (!items.length) {
					items = context.getElementsByTagName(tag);
					params.tag = null;
				}
				for (var i = 0, l = items.length; i < l; i++)
					if (match(items[i], params, data))
						found.push(items[i]);
			}
			return found;
		},

		getElements: function(items, elements, context) {
			elements.append(items);
		}
	}];

	function parse(selector) {
		var params = { tag: '*', id: null, classes: [], attributes: [], pseudos: [] };
		selector.replace(/:([^:(]+)*(?:\((["']?)(.*?)\2\))?|\[(\w+)(?:([!*^$~|]?=)(["']?)(.*?)\6)?\]|\.[\w-]+|#[\w-]+|\w+|\*/g, function(part) {
			switch (part.charAt(0)) {
				case '.': params.classes.push(part.slice(1)); break;
				case '#': params.id = part.slice(1); break;
				case '[': params.attributes.push([arguments[4], arguments[5], arguments[7]]); break;
				case ':':
					var handler = DomElement.pseudos[arguments[1]];
					if (!handler) {
						params.attributes.push([arguments[1], arguments[3] ? '=' : '', arguments[3]]);
						break;
					}
					params.pseudos.push({
						name: arguments[1],
						argument: handler && handler.parser
							? (handler.parser.apply ? handler.parser(arguments[3]) : handler.parser)
							: arguments[3],
						handler: handler.handler || handler
					});
				break;
				default: params.tag = part;
			}
			return '';
		});
		return params;
	}

	function match(el, params, data) {
		if (params.id && params.id != el.id)
			return false;

		if (params.tag && params.tag != '*' && params.tag != (el.tagName || '').toLowerCase())
			return false;

		for (var i = params.classes.length; i--;)
			if (!el.className || !el.className.contains(params.classes[i], ' '))
				return false;

		var proto = DomElement.prototype;
		for (var i = params.attributes.length; i--;) {
			var attribute = params.attributes[i];
			proto.$ = el; 
			var val = proto.getProperty(attribute[0]);
			if (!val) return false;
			var operator = DomElement.operators[attribute[1]];
			operator = operator && operator[FILTER];
			if (operator && (!val || !operator(val, attribute[2])))
				return false;
		}

		for (var i = params.pseudos.length; i--;) {
			var pseudo = params.pseudos[i];
			if (!pseudo.handler[FILTER](el, pseudo.argument, data))
				return false;
		}

		return true;
	}

	function filter(items, selector, context, elements, data) {
		var method = methods[!Browser.XPATH || items.length ||
			typeof selector == 'string' && selector.contains('option[')
			? FILTER : XPATH];
		var separators = [];
		selector = selector.trim().replace(/\s*([+>~\s])[a-zA-Z#.*\s]/g, function(match) {
			if (match.charAt(2)) match = match.trim();
			separators.push(match.charAt(0));
			return ':)' + match.charAt(1);
		}).split(':)');
		for (var i = 0, l = selector.length; i < l; i++) {
			var params = parse(selector[i]);
			if (!params) return elements; 
			var next = method.getParam(items, separators[i - 1], context, params, data);
			if (!next) break;
			items = next;
		}
		method.getElements(items, elements, context);
		return elements;
	}

	return {

		getElements: function(selectors, nowrap) {
			var elements = nowrap ? [] : new this._collection();
			selectors = !selectors ? ['*'] : typeof selectors == 'string'
				? selectors.split(',')
				: selectors.length != null ? selectors : [selectors];
			for (var i = 0, l = selectors.length; i < l; i++) {
				var selector = selectors[i];
				if (Base.type(selector) == 'element') elements.push(selector);
				else filter([], selector, this.$, elements, {});
			}
			return elements;
		},

		getElement: function(selector) {
			var el, type = Base.type(selector), match;
			if (type == 'window') {
				el = selector;
			} else {
				if (type == 'string' && (match = selector.match(/^#?([\w-]+)$/)))
					el = this.getDocument().$.getElementById(match[1]);
				else if (DomNode.isNode(type))
					el = DomElement.unwrap(selector);
				if (el && el != this.$ && !DomElement.isAncestor(el, this.$))
					el = null;
				if (!el)
					el = this.getElements(selector, true)[0];
			}
			return DomNode.wrap(el);
		},

		hasElement: function(selector) {
			return !!this.getElement(selector);
		},

		match: function(selector) {
			return !selector || match(this.$, parse(selector), {});
		},

		filter: function(elements, selector) {
			return filter(elements, selector, this.$, new this._collection(), {});
		},

		statics: {
			match: function(el, selector) {
				return !selector || match(DomElement.unwrap(el), parse(selector), {});
			}
		}
	};
});

DomElement.separators = {
	'~': [
		'/following-sibling::',
		function(item, params, add) {
			while (item = item.nextSibling)
				if (item.nodeType == 1 && add(item))
					break;
		}
	],

	'+': [
		'/following-sibling::*[1]/self::',
		function(item, params, add) {
			while (item = item.nextSibling) {
				if (item.nodeType == 1) {
					add(item);
					break;
				}
			}
		}
	],

	'>': [
	 	'/',
		function(item, params, add) {
			var children = item.childNodes;
			for (var i = 0, l = children.length; i < l; i++)
				if (children[i].nodeType == 1)
					add(children[i]);
		}
	],

	' ': [
		'//',
		function(item, params, add) {
			var children = item.getElementsByTagName(params.tag);
			params.clearTag = true;
			for (var i = 0, l = children.length; i < l; i++)
				add(children[i]);
		}
	]
};

DomElement.operators = new function() {
	function contains(sep) {
		return [
			function(a, v) {
				return '[contains(' + (sep ? 'concat("' + sep + '", @' + a + ', "' + sep + '")' : '@' + a) + ', "' + sep + v + sep + '")]';
			},
			function(a, v) {
				return a.contains(v, sep);
			}
		]
	}

	return {
		'=': [
			function(a, v) {
				return '[@' + a + '="' + v + '"]';
			},
			function(a, v) {
				return a == v;
			}
		],

		'^=': [
	 		function(a, v) {
				return '[starts-with(@' + a + ', "' + v + '")]';
			},
			function(a, v) {
				return a.substring(0, v.length) == v;
			}
		],

		'$=': [
			function(a, v) {
				return '[substring(@' + a + ', string-length(@' + a + ') - ' + v.length + ' + 1) = "' + v + '"]';
			},
			function(a, v) {
				return a.substring(a.length - v.length) == v;
			}
		],

		'!=': [
			function(a, v) {
				return '[@' + a + '!="' + v + '"]';
			},
			function(a, v) {
				return a != v;
			}
		],

		'*=': contains(''),

		'|=': contains('-'),

		'~=': contains(' ')
	};
};

DomElement.pseudos = new function() {
	var nthChild = [
		function(argument) {
			switch (argument.special) {
				case 'n': return '[count(preceding-sibling::*) mod ' + argument.a + ' = ' + argument.b + ']';
				case 'first': return '[count(preceding-sibling::*) = 0]';
				case 'last': return '[count(following-sibling::*) = 0]';
				case 'only': return '[not(preceding-sibling::* or following-sibling::*)]';
				case 'index': return '[count(preceding-sibling::*) = ' + argument.a + ']';
			}
		},
		function(el, argument, data) {
			var count = 0;
			switch (argument.special) {
				case 'n':
					data.indices = data.indices || {};
					if (!data.indices[el._unique]) {
						var children = el.parentNode.childNodes;
						for (var i = 0, l = children.length; i < l; i++) {
							var child = children[i];
							if (child.nodeType == 1) {
								if (!child._unique)
									DomNode.unique(item);
								data.indices[child._unique] = count++;
							}
						}
					}
					return data.indices[el._unique] % argument.a == argument.b;
				case 'first':
					while (el = el.previousSibling)
						if (el.nodeType == 1)
							return false;
					return true;
				case 'last':
					while (el = el.nextSibling)
						if (el.nodeType == 1)
							return false;
					return true;
				case 'only':
					var prev = el;
					while(prev = prev.previousSibling)
						if (prev.nodeType == 1)
							return false;
					var next = el;
					while (next = next.nextSibling)
						if (next.nodeType == 1)
							return false;
					return true;
				case 'index':
					while (el = el.previousSibling)
						if (el.nodeType == 1 && ++count > argument.a)
							return false;
					return true;
			}
			return false;
		}
	];

	function contains(caseless) {
		var abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
		return [
			function(argument) {
				return '[contains(' + (caseless ? 'translate(text(), "' + abc
					+ '", "' + abc.toLowerCase() + '")' : 'text()') + ', "'
					+ (caseless && argument ? argument.toLowerCase() : argument) + '")]';
			},
			function(el, argument) {
				if (caseless && argument) argument = argument.toLowerCase();
				var nodes = el.childNodes;
				for (var i = nodes.length - 1; i >= 0; i--) {
					var child = nodes[i];
					if (child.nodeName && child.nodeType == 3 &&
						(caseless ? child.nodeValue.toLowerCase() : child.nodeValue).contains(argument))
							return true;
				}
				return false;
			}
		];
	}

	return {
		'nth-child': {
			parser: function(argument) {
				var match = argument ? argument.match(/^([+-]?\d*)?([a-z]+)?([+-]?\d*)?$/) : [null, 1, 'n', 0];
				if (!match) return null;
				var i = parseInt(match[1]),
					a = isNaN(i) ? 1 : i,
					special = match[2],
					b = parseInt(match[3]) || 0;
				if (a != 0) {
					b--;
					while (b < 1) b += a;
					while (b >= a) b -= a;
				} else {
					a = b;
					special = 'index';
				}
				switch (special) {
					case 'n': return { a: a, b: b, special: 'n' };
					case 'odd': return { a: 2, b: 0, special: 'n' };
					case 'even': return { a: 2, b: 1, special: 'n' };
					case 'first': return { special: 'first' };
					case 'last': return { special: 'last' };
					case 'only': return { special: 'only' };
					default: return { a: a - 1, special: 'index' };
				}
			},
			handler: nthChild
		},

		'even': {
			parser: { a: 2, b: 1, special: 'n' },
			handler: nthChild
		},

		'odd': {
			parser: { a: 2, b: 0, special: 'n' },
			handler: nthChild
		},

		'first-child': {
			parser: { special: 'first' },
			handler: nthChild
		},

		'last-child': {
			parser: { special: 'last' },
			handler: nthChild
		},

		'only-child': {
			parser: { special: 'only' },
			handler: nthChild
		},

		'enabled': [
			function() {
				return '[not(@disabled)]';
			},
			function(el) {
				return !el.disabled;
			}
		],

		'empty': [
		 	function() {
				return '[not(node())]';
			},
			function(el) {
				return !(el.innerText || el.textContent || '').length;
			}
		],

		'contains': contains(false),

		'contains-caseless': contains(true)
	};
};

HtmlElements = DomElements.extend();

HtmlElement = DomElement.extend({
	_collection: HtmlElements
});

HtmlElement.inject({
	_properties: ['html'],

	getClass: function() {
		return this.$.className;
	},

	setClass: function(cls) {
		this.$.className = cls;
	},

	modifyClass: function(name, add) {
		if (!this.hasClass(name) ^ !add) 
			this.$.className = (add ? this.$.className + ' ' + name :
				this.$.className.replace(name, '')).clean();
		return this;
	},

	addClass: function(name) {
		return this.modifyClass(name, true);
	},

	removeClass: function(name) {
		return this.modifyClass(name, false);
	},

	toggleClass: function(name) {
		return this.modifyClass(name, !this.hasClass(name));
	},

	hasClass: function(name) {
		return this.$.className.contains(name, ' ');
	}
});

Array.inject({
	toNode: function(doc) {
		doc = DomNode.wrap(doc || document);
		var elements = new HtmlElements();
		for (var i = 0; i < this.length;) {
			var value = this[i++], element = null, type = Base.type(value);
			if (type == 'string') {
				var props = /^(object|hash)$/.test(Base.type(this[i])) && this[i++];
				element = value.isHtml()
					? value.toNode(doc).set(props)
					: doc.createElement(value, props);
				if (Base.type(this[i]) == 'array')
					element.injectBottom(this[i++].toNode(doc));
			} else if (DomNode.isNode(type)) {
				element = value;
			} else if (value && value.toNode) {
				element = value.toNode(doc);
			}
			if (element)
				elements[Base.type(element) == 'array' ? 'append' : 'push'](element);
		}
		return elements.length == 1 ? elements[0] : elements;
	}
});

String.inject({
	toNode: function(doc) {
		var doc = doc || document, elements;
		if (this.isHtml()) {
			var str = this.trim().toLowerCase();
			var div = DomElement.unwrap(doc).createElement('div');

			var wrap =
				!str.indexOf('<opt') &&
				[1, '<select>', '</select>'] ||
				!str.indexOf('<leg') &&
				[1, '<fieldset>', '</fieldset>'] ||
				(!str.indexOf('<thead') || !str.indexOf('<tbody') || !str.indexOf('<tfoot') || !str.indexOf('<colg')) &&
				[1, '<table>', '</table>'] ||
				!str.indexOf('<tr') &&
				[2, '<table><tbody>', '</tbody></table>'] ||
				(!str.indexOf('<td') || !str.indexOf('<th')) &&
				[3, '<table><tbody><tr>', '</tr></tbody></table>'] ||
				!str.indexOf('<col') &&
				[2, '<table><colgroup>', '</colgroup></table>'] ||
				[0,'',''];

			div.innerHTML = wrap[1] + this + wrap[2];
			while (wrap[0]--)
				div = div.firstChild;
			if (Browser.TRIDENT) {
				var els = [];
				if (!str.indexOf('<table') && str.indexOf('<tbody') < 0) {
					els = div.firstChild && div.firstChild.childNodes;
				} else if (wrap[1] == '<table>' && str.indexOf('<tbody') < 0) {
					els = div.childNodes;
				}
				for (var i = els.length - 1; i >= 0 ; --i) {
					var el = els[i];
					if (el.nodeName.toLowerCase() == 'tbody' && !el.childNodes.length)
						el.parentNode.removeChild(el);
				}
			}
			elements = new HtmlElements(div.childNodes);
		} else {
			elements = DomNode.wrap(doc).getElements(this);
		}
		return elements.length == 1 ? elements[0] : elements;
	}
});

HtmlDocument = DomDocument.extend({
	_collection: HtmlElements
});

HtmlElement.inject(new function() {
	var styles = {
		all: {
			width: '@px', height: '@px', left: '@px', top: '@px', right: '@px', bottom: '@px',
			color: 'rgb(@, @, @)', backgroundColor: 'rgb(@, @, @)', backgroundPosition: '@px @px',
			fontSize: '@px', letterSpacing: '@px', lineHeight: '@px', textIndent: '@px',
			margin: '@px @px @px @px', padding: '@px @px @px @px',
			border: '@px @ rgb(@, @, @) @px @ rgb(@, @, @) @px @ rgb(@, @, @) @px @ rgb(@, @, @)',
			borderWidth: '@px @px @px @px', borderStyle: '@ @ @ @',
			borderColor: 'rgb(@, @, @) rgb(@, @, @) rgb(@, @, @) rgb(@, @, @)',
			clip: 'rect(@px, @px, @px, @px)', opacity: '@'
		},
		part: {
			'border': {}, 'borderWidth': {}, 'borderStyle': {}, 'borderColor': {},
			'margin': {}, 'padding': {}
		}
	};

	['Top', 'Right', 'Bottom', 'Left'].each(function(dir) {
		['margin', 'padding'].each(function(style) {
			var sd = style + dir;
			styles.part[style][sd] = styles.all[sd] = '@px';
		});
		var bd = 'border' + dir;
		styles.part.border[bd] = styles.all[bd] = '@px @ rgb(@, @, @)';
		var bdw = bd + 'Width', bds = bd + 'Style', bdc = bd + 'Color';
		styles.part[bd] = {};
		styles.part.borderWidth[bdw] = styles.part[bd][bdw] = '@px';
		styles.part.borderStyle[bds] = styles.part[bd][bds] = '@';
		styles.part.borderColor[bdc] = styles.part[bd][bdc] = 'rgb(@, @, @)';
	});

	Base.each(styles.all, function(val, name) {
		this[name] = val.split(' ');
	});

	var fields = {

		getComputedStyle: function(name) {
			if (this.$.currentStyle) return this.$.currentStyle[name.camelize()];
			var style = this.getWindow().$.getComputedStyle(this.$, null);
			return style ? style.getPropertyValue(name.hyphenate()) : null;
		},

		getStyle: function(name) {
			if (name === undefined) return this.getStyles();
			if (name == 'opacity') {
				var op = this.opacity;
				return op || op == 0 ? op : this.getVisibility() ? 1 : 0;
			}
			var el = this.$;
			name = name.camelize();
			var style = el.style[name];
			if (!Base.check(style)) {
				if (styles.part[name]) {
					style = Hash.map(styles.part[name], function(val, key) {
						return this.getStyle(key);
					}, this);
					return style.every(function(val) {
						return val == style[0];
					}) ? style[0] : style.join(' ');
				}
				style = this.getComputedStyle(name);
			}
			if (name == 'visibility')
				return /^(visible|inherit(|ed))$/.test(style);
			var color = style && style.match(/rgb[a]?\([\d\s,]+\)/);
			if (color) return style.replace(color[0], color[0].rgbToHex());
			if (Browser.PRESTO || Browser.TRIDENT && isNaN(parseInt(style))) {
				if (/^(width|height)$/.test(name)) {
					var size = 0;
					(name == 'width' ? ['left', 'right'] : ['top', 'bottom']).each(function(val) {
						size += this.getStyle('border-' + val + '-width').toInt() + this.getStyle('padding-' + val).toInt();
					}, this);
					return this.$['offset' + name.capitalize()] - size + 'px';
				}
				if (Browser.PRESTO && /px/.test(style)) return style;
				if (/border(.+)[wW]idth|margin|padding/.test(name)) return '0px';
			}
			return style;
		},

		setStyle: function(name, value) {
			if (value === undefined) return this.setStyles(name);
			var el = this.$;
			switch (name) {
				case 'float':
					name = Browser.TRIDENT ? 'styleFloat' : 'cssFloat';
					break;
				case 'clip':
					if (value == true)
						value = [0, el.offsetWidth, el.offsetHeight, 0];
					break;
				default:
					name = name.camelize();
			}
			var type = Base.type(value);
			if (value != undefined && type != 'string') {
				var parts = styles.all[name] || ['@'], index = 0;
				value = (type == 'array' ? value.flatten() : [value]).map(function(val) {
					var part = parts[index++];
					if (!part)
						throw Base.stop;
					return Base.type(val) == 'number' ? part.replace('@', name == 'opacity' ? val : Math.round(val)) : val;
				}).join(' ');
			}
			switch (name) {
				case 'visibility':
					if (!isNaN(value)) value = !!value.toInt() + '';
				 	value = value == 'true' && 'visible' || value == 'false' && 'hidden' || value;
					break;
				case 'opacity':
					this.opacity = value = parseFloat(value);
					this.setStyle('visibility', !!value);
					if (!value) value = 1;
					if (!el.currentStyle || !el.currentStyle.hasLayout) el.style.zoom = 1;
					if (Browser.TRIDENT) el.style.filter = value > 0 && value < 1 ? 'alpha(opacity=' + value * 100 + ')' : '';
					el.style.opacity = value;
					return this;
			}
			el.style[name] = value;
			return this;
		},

		getStyles: function() {
			return arguments.length ? Array.each(arguments, function(name) {
				this[name] = that.getStyle(name);
			}, {}) : this.$.style.cssText;
		},

		setStyles: function(styles) {
			switch (Base.type(styles)) {
				case 'object':
					Base.each(styles, function(style, name) {
						if (style !== undefined)
							this.setStyle(name, style);
					}, this);
					break;
				case 'string':
					this.$.style.cssText = styles;
			}
			return this;
		}
	};

	['opacity', 'color', 'background', 'visibility', 'clip', 'zIndex',
		'border', 'margin', 'padding', 'display'].each(function(name) {
		var part = name.capitalize();
		fields['get' + part] = function() {
			return this.getStyle(name);
		};
		fields['set' + part] = function(value) {
			return this.setStyle(name, arguments.length > 1
				? Array.create(arguments) : value);
		};
	});

	return fields;
});

HtmlElement.inject({

	getFormElements: function() {
		return this.getElements(['input', 'select', 'textarea']);
	},

	getValue: function(name) {
		var el = this.getElement(name);
		return el && el.getValue && el.getValue();
	},

	setValue: function(name, val) {
		var el = this.getElement(name);
		if (!el) el = this.injectTop('input', { type: 'hidden', id: name, name: name });
		return el.setValue(val);
	},

	getValues: function() {
		return this.getFormElements().each(function(el) {
			var name = el.getName(), value = el.getValue();
			if (name && value !== undefined && !el.getDisabled())
				this[name] = value;
		}, new Hash());
	},

	setValues: function(values) {
		return Base.each(values, function(val, name) {
			this.setValue(name, val);
		}, this);
	},

	toQueryString: function() {
		return Base.toQueryString(this.getValues());
	}
});

Form = HtmlElement.extend({
	_tag: 'form',
	_properties: ['action', 'method', 'target'],
	_methods: ['submit'],

	blur: function() {
		return this.getFormElements().each(function(el) {
			el.blur();
		}, this);
	},

	enable: function(enable) {
		return this.getFormElements().each(function(el) {
			el.enable(enable);
		}, this);
	}
});

FormElement = HtmlElement.extend({
	_properties: ['name', 'disabled'],
	_methods: ['focus', 'blur'],

	enable: function(enable) {
		var disabled = !enable && enable !== undefined;
		if (disabled) this.$.blur();
		this.$.disabled = disabled;
		return this;
	}
});

Input = FormElement.extend({
	_tag: 'input',
	_properties: ['type', 'checked', 'defaultChecked', 'readOnly', 'maxLength'],
	_methods: ['click'],

	getValue: function() {
		if (this.$.checked && /^(checkbox|radio)$/.test(this.$.type) ||
			/^(hidden|text|password|button|search)$/.test(this.$.type))
			return this.$.value;
	},

	setValue: function(val) {
		if (/^(checkbox|radio)$/.test(this.$.type)) this.$.checked = this.$.value == val;
		else this.$.value = val != null ? val : '';
		return this;
	}
});

TextArea = FormElement.extend({
	_tag: 'textarea',
	_properties: ['value']
});

Select = FormElement.extend({
	_tag: 'select',
	_properties: ['type', 'selectedIndex'],

	getOptions: function() {
		return this.getElements('option');
	},

	getSelected: function() {
		return this.getElements('option[selected]');
	},

	setSelected: function(values) {
		this.$.selectedIndex = -1;
		if (values) {
			Array.each(values.length != null ? values : [values], function(val) {
				val = DomElement.unwrap(val);
				if (val != null)
					this.getElements('option[value="' + (val.value || val) + '"]').setProperty('selected', true);
			}, this);
		}
		return this;
	},

	getValue: function() {
		return this.getSelected().getProperty('value');
	},

	setValue: function(values) {
		return this.setSelected(values);
	}
});

SelectOption = FormElement.extend({
	_tag: 'option',
	_properties: ['text', 'value', 'selected', 'defaultSelected', 'index']
});

FormElement.inject({
	setSelection: function(start, end) {
		var sel = end == undefined ? start : { start: start, end: end };
		this.focus();
		if(this.$.setSelectionRange) {
			this.$.setSelectionRange(sel.start, sel.end);
		} else {
			var value = this.getValue();
			var len = value.substring(sel.start, sel.end).replace(/\r/g, '').length;
			var pos = value.substring(0, sel.start).replace(/\r/g, '').length;
			var range = this.$.createTextRange();
			range.collapse(true);
			range.moveEnd('character', pos + len);
			range.moveStart('character', pos);
			range.select();
		}
		return this;
	},

	getSelection: function() {
		if (this.$.selectionStart !== undefined) {
			return { start: this.$.selectionStart, end: this.$.selectionEnd };
		} else {
			this.focus();
			var pos = { start: 0, end: 0 };
			var range = this.getDocument().$.selection.createRange();
			var dup = range.duplicate();
			if (this.$.type == 'text') {
				pos.start = 0 - dup.moveStart('character', -100000);
				pos.end = pos.start + range.text.length;
			} else {
				var value = this.getValue();
				dup.moveToElementText(this.$);
				dup.setEndPoint('StartToEnd', range);
				pos.end = value.length - dup.text.length;
				dup.setEndPoint('StartToStart', range);
				pos.start = value.length - dup.text.length;
			}
			return pos;
		}
	},

	getSelectedText: function() {
 		var range = this.getSelection();
		return this.getValue().substring(range.start, range.end);
	},

	replaceSelectedText: function(value, select) {
		var range = this.getSelection(), current = this.getValue();
		var top = this.$.scrollTop, height = this.$.scrollHeight;
		this.setValue(current.substring(0, range.start) + value + current.substring(range.end, current.length));
		if(top != null)
			this.$.scrollTop = top + this.$.scrollHeight - height;
		return select || select == undefined
			? this.setSelection(range.start, range.start + value.length)
			: this.setCaret(range.start + value.length);
	},

	getCaret: function() {
		return this.getSelection().start;
	},

	setCaret: function(pos) {
		return this.setSelection(pos, pos);
	}
});

$document = Browser.document = DomNode.wrap(document);
$window = Browser.window = DomNode.wrap(window).addEvent('unload', DomNode.dispose);

Chain = {
	chain: function(fn) {
		(this._chain = this._chain || []).push(fn);
		return this;
	},

	callChain: function() {
		if (this._chain && this._chain.length)
			this._chain.shift().apply(this, arguments);
		return this;
	},

	clearChain: function() {
		this._chain = [];
		return this;
	}
};

Callback = {
	addEvent: function(type, fn) {
		var ref = this.events = this.events || {};
		ref = ref[type] = ref[type] || [];
		if (!ref.find(function(val) { return val == fn })) ref.push(fn);
		return this;
	},

	addEvents: function(events) {
		return Base.each((events || []), function(fn, type) {
			this.addEvent(type, fn);
		}, this);
	},

	fireEvent: function(type, args, delay) {
		return (this.events && this.events[type] || []).each(function(fn) {
			fn.delay(delay, this, args);
		}, this);
	},

	removeEvent: function(type, fn) {
		if (this.events && this.events[type])
			this.events[type].remove(function(val) { return fn == val; });
		return this;
	},

	setOptions: function(opts) {
		return (this.options = Hash.create(this.options, opts)).each(function(val, i) {
			if (typeof val == 'function' && (i = i.match(/^on([A-Z]\w*)/)))
				this.addEvent(i[1].toLowerCase(), val);
		}, this);
	},

	statics: {
		inject: function() {
			var proto = this.prototype, options = proto.options;
			this.base.apply(this, arguments);
			if (proto.options != options)
				proto.options = Hash.merge({}, options, proto.options);
			return this;
		}
	}
};

Request = Base.extend(Chain, Callback, new function() {
	var unique = 0;

	function createRequest(that) {
		if (!that.transport)
			that.transport = window.XMLHttpRequest && new XMLHttpRequest()
				|| Browser.TRIDENT && new ActiveXObject('Microsoft.XMLHTTP');
	}

	function createFrame(that) {
		var id = 'request_' + unique++, load = that.onFrameLoad.bind(that);
		var div = DomElement.get('body').injectBottom('div', {
				styles: {
					position: 'absolute', width: 0, height: 0, top: 0, marginLeft: '-10000px'
				}
			}, [
				'iframe', {
					name: id, id: id, events: { load: load, readystatechange: load }
				}
			]
		);
		that.frame = {
			id: id, div: div,
			iframe: window.frames[id] || document.getElementById(id),
			element: DomElement.get(id)
		};
		div.offsetWidth;
	}

	return {
		options: {
			headers: {
				'X-Requested-With': 'XMLHttpRequest',
				'Accept': 'text/javascript, text/html, application/xml, text/xml, */*'
			},
			method: 'post',
			async: true,
			urlEncoded: true,
			encoding: 'utf-8',
			emulation: true,
			secure: false
		},

		initialize: function() {
			var params = Array.associate(arguments, { url: 'string', options: 'object', handler: 'function' });
			this.setOptions(params.options);
			if (params.handler)
				this.addEvent('complete', params.handler);
			if (this.options.update)
				this.options.type = 'html';
			this.headers = new Hash(this.options.headers);
			if (this.options.type == 'json') {
				this.setHeader('Accept', 'application/json');
				this.setHeader('X-Request', 'JSON');
			}
			if (this.options.urlEncoded && /^(post|put)$/.test(this.options.method)) {
				this.setHeader('Content-Type', 'application/x-www-form-urlencoded' +
					(this.options.encoding ? '; charset=' + this.options.encoding : ''));
			}
			this.headers.append(this.options.headers);
		},

		onStateChange: function() {
			if (this.transport.readyState == 4 && this.running) {
				this.running = false;
				this.status = 0;
				try {
					this.status = this.transport.status;
					delete this.transport.onreadystatechange;
				} catch (e) {}
				if (!this.status || this.status >= 200 && this.status < 300) {
					this.success(this.transport.responseText, this.transport.responseXML);
				} else {
					this.fireEvent('complete').fireEvent('failure');
				}
			}
		},

		onFrameLoad: function() {
			var frame = this.frame && this.frame.iframe, loc = frame && frame.location,
				doc = frame && (frame.contentDocument || frame.contentWindow || frame).document;
			if (this.running && frame && loc && (!loc.href || loc.href.indexOf(this.url) != -1)
				&& /^(loaded|complete|undefined)$/.test(doc.readyState)) {
				this.running = false;
				var html = this.options.type == 'html', area = !html
					&& doc.getElementsByTagName('textarea')[0];
				var text = doc && (area && area.value || doc.body
					&& (html && doc.body.innerHTML || doc.body.textContent
					|| doc.body.innerText)) || '';
				this.frame.element.setProperty('src', '');
				this.success(text);
				if (!this.options.link) {
					var div = this.frame.div;
					div.insertBottom(DomElement.get('body'));
					div.remove.delay(5000, div);
					this.frame = null;
				}
			}
		},

		success: function(text, xml) {
			var args;
			switch (this.options.type) {
			case 'html':
				var match = text.match(/<body[^>]*>([\u0000-\uffff]*?)<\/body>/i);
				var stripped = this.stripScripts(match ? match[1] : text);
				if (this.options.update)
					DomElement.get(this.options.update).setHtml(stripped.html);
				if (this.options.evalScripts)
					this.executeScript(stripped.script);
				args = [ stripped.html, text ];
				break;
			case 'json':
				args = [ Json.decode(text, this.options.secure), text ];
				break;
			default: 
				args = [ this.processScripts(text), xml ]
			}
			this.fireEvent('complete', args)
				.fireEvent('success', args)
				.callChain();
		},

		stripScripts: function(html) {
			var script = '';
			html = html.replace(/<script[^>]*>([\u0000-\uffff]*?)<\/script>/gi, function() {
				script += arguments[1] + '\n';
				return '';
			});
			return { html: html, script: script };
		},

		processScripts: function(text) {
			if (this.options.evalResponse || (/(ecma|java)script/).test(this.getHeader('Content-type'))) {
				this.executeScript(text);
				return text;
			} else {
				var stripped = this.stripScripts(text);
				if (this.options.evalScripts)
					this.executeScript(stripped.script);
				return stripped.html;
			}
		},

		executeScript: function(script) {
			if (window.execScript) {
				window.execScript(script);
			} else {
				DomElement.get('head').injectBottom('script', {
					type: 'text/javascript', text: script
				}).remove();
			}
		},

		setHeader: function(name, value) {
			this.headers[name] = value;
			return this;
		},

		getHeader: function(name) {
			try {
				if (this.transport)
					return this.transport.getResponseHeader(name);
			} catch (e) {}
			return null;
		},

		send: function() {
			var params = Array.associate(arguments, { url: 'string', options: 'object', handler: 'function' });
			var opts = params.options ? Hash.merge(params.options, this.options) : this.options;
			if (params.handler)
				this.addEvent('complete', function() {
					params.handler.apply(this, arguments);
					this.removeEvent('complete', arguments.callee);
				});
			if (this.running) {
				switch (opts.link) {
					case 'cancel':
						this.cancel();
						break;
					case 'chain':
						this.chain(this.send.wrap(this, arguments));
					default:
						return this;
				}
			}
			var data = opts.data || '';
			var url = params.url || opts.url;
			switch (Base.type(data)) {
				case 'element':
				 	data = DomNode.wrap(data);
					if (data.getTag() != 'form' || !data.hasElement('input[type=file]'))
						data = data.toQueryString();
					break;
				case 'object':
					data = Base.toQueryString(data);
					break;
				default:
					data = data.toString();
			}
			var string = typeof data == 'string', method = opts.method;
			if (opts.emulation && /^(put|delete)$/.test(method)) {
				if (string) data += '&_method=' + method;
				else data.setValue('_method', method);
				method = 'post';
			}
			if (string && !this.options.iframe) {
				createRequest(this);
				if (!this.transport) {
					if (!this.frame)
						createFrame(this);
					method = 'get';
				}
			} else if (!this.frame) {
 				createFrame(this);
			}
			if (string && data && method == 'get') {
				url += (url.contains('?') ? '&' : '?') + data;
				data = null;
			}
			this.running = true;
			this.url = url;
			if (this.frame) {
				var form = !string && data;
				if (form) {
					form.set({
						target: this.frame.id, action: url, method: method,
						enctype:  method == 'get'
							? 'application/x-www-form-urlencoded'
							: 'multipart/form-data',
						'accept-charset': opts.encoding || ''
					}).submit();
				} else {
					this.frame.element.setProperty('src', url);
				}
			} else if (this.transport) {
				try {
					this.transport.open(method.toUpperCase(), url, opts.async);
					this.transport.onreadystatechange = this.onStateChange.bind(this);
					new Hash(this.headers, opts.headers).each(function(header, name) {
						try{
							this.transport.setRequestHeader(name, header);
						} catch (e) {
							this.fireEvent('exception', [e, name, header]);
						}
					}, this);
					this.fireEvent('request');
					this.transport.send(data);
					if (!opts.async)
						this.onStateChange();
				} catch (e) {
					this.fireEvent('failure', [e]);
				}
			}
			return this;
		},

		cancel: function() {
			if (this.running) {
				this.running = false;
				if (this.transport) {
					this.transport.abort();
					this.transport.onreadystatechange = null;
					this.transport = null;
				} else if (this.frame) {
					this.frame.div.remove();
					this.frame = null;
				}
				this.fireEvent('cancel');
			}
			return this;
		}
	};
});

Form.inject({
	send: function(url) {
		if (!this.sender)
			this.sender = new Request({ link: 'cancel' });
		this.sender.send({
			url: url || this.getProperty('action'),
			data: this, method: this.getProperty('method') || 'post'
		});
	}
});

HtmlElement.inject({
	load: function() {
		if (!this.loader)
			this.loader = new Request({ link: 'cancel', update: this, method: 'get' });
		this.loader.send(Array.associate(arguments, { data: 'object', url: 'string' }));
		return this;
	}
});

Asset = new function() {
	function getProperties(props) {
		return props ? Hash.create(props).each(function(val, key) {
			if (/^on/.test(key)) delete this[key];
		}) : {};
	}

	function createMultiple(type, sources, options) {
		var props = getProperties(options), count = 0;
		options = options || {};
		return sources.each(function(src) {
			props.onLoad = function() {
				if (options.onProgress)
					options.onProgress(src);
				if (++count == sources.length && options.onComplete)
					options.onComplete();
			}
			this.push(Asset[type](src, props));
		}, new HtmlElements());
	}

	return {
		script: function(src, props) {
			var script = DomElement.get('head').injectBottom('script', Hash.merge({
				events: {
					load: props.onLoad && function() {
						if (!this.loaded) {
							this.loaded = true;
							props.onLoad.call(this);
						}
					},
					readystatechange: function() {
						if (/loaded|complete/.test(this.$.readyState))
							this.fireEvent('load');
					}
				},
				src: src
			}, getProperties(props)));
			if (Browser.WEBKIT && Browser.VERSION < 420)
				new Request({ url: src, method: 'get' }).addEvent('success', function() {
					script.fireEvent('load', [], 1);
				}).send();
			return script;
		},

		stylesheet: function(src, props) {
			return new HtmlElement('link', new Hash({
				rel: 'stylesheet', media: 'screen', type: 'text/css', href: src
			}, props)).insertInside(DomElement.get('head'));
		},

		image: function(src, props) {
			props = props || {};
			var image = new Image();
			image.src = src;
			var element = new HtmlElement('img', { src: src });
			['load', 'abort', 'error'].each(function(type) {
				var name = 'on' + type.capitalize();
				if (props[name]) element.addEvent(type, function() {
					this.removeEvent(type, arguments.callee);
					props[name].call(this);
				});
			});
			if (image.width && image.height)
				element.fireEvent('load', [], 1);
			return element.setProperties(getProperties(props));
		},

	 	scripts: function(sources, options) {
			return createMultiple('script', sources, options);
		},

	 	stylesheets: function(sources, options) {
			return createMultiple('stylesheet', sources, options);
		},

	 	images: function(sources, options) {
			return createMultiple('image', sources, options);
		}
	}
};

Cookie = {
	set: function(name, value, expires, path) {
		document.cookie = name + '=' + encodeURIComponent(value) + (expires ? ';expires=' +
			expires.toGMTString() : '') + ';path=' + (path || '/');
	},
	get: function(name) {
		var res = document.cookie.match('(?:^|;)\\s*' + name + '=([^;]*)');
		if (res) return decodeURIComponent(res[1]);
	},

	remove: function(name) {
		this.set(name, '', -1);
	}
};

Fx = Base.extend(Chain, Callback, {
	options: {
		fps: 50,
		unit: false,
		duration: 500,
		wait: true,
		transition: function(p) {
			return -(Math.cos(Math.PI * p) - 1) / 2;
		}
	},

	initialize: function(element, options) {
		this.element = DomElement.get(element);
		this.setOptions(options);
	},

	step: function() {
		var time = Date.now();
		if (time < this.time + this.options.duration) {
			this.delta = this.options.transition((time - this.time) / this.options.duration);
			this.update(this.get());
		} else {
			this.stop(true);
			this.update(this.to);
			this.fireEvent('complete', [this.element]).callChain();
		}
	},

	set: function(to) {
		this.update(to);
		this.fireEvent('set', [this.element]);
		return this;
	},

	get: function() {
		return this.compute(this.from, this.to);
	},

	compute: function(from, to) {
		return (to - from) * this.delta + from;
	},

	start: function(from, to) {
		if (!this.options.wait) this.stop();
		else if (this.timer) return this;
		this.from = from;
		this.to = to;
		this.time = Date.now();
		if (!this.slave) {
			this.timer = this.step.periodic(Math.round(1000 / this.options.fps), this);
			this.fireEvent('start', [this.element]);
		}
		this.step();
		return this;
	},

	stop: function(end) {
		if (this.timer) {
			this.timer = this.timer.clear();
			if (!end) this.fireEvent('cancel', [this.element]).clearChain();
		}
		return this;
	}
});

Fx.Scroll = Fx.extend({
	options: {
		offset: { x: 0, y: 0 },
		wheelStops: true
	},

	initialize: function(element, options) {
		this.base(element, options);
		if (this.options.wheelStops) {
			var stop = this.stop.bind(this), stopper = this.element;
			this.addEvent('start', function() {
				stopper.addEvent('mousewheel', stop);
			}, true);
			this.addEvent('complete', function() {
				stopper.removeEvent('mousewheel', stop);
			}, true);
		}
	},

	update: function(x, y) {
		var now = Array.flatten(arguments);
		this.element.setScrollOffset(now[0], now[1]);
	},

	get: function() {
		var now = [];
		for (var i = 0; i < 2; i++)
			now.push(this.compute(this.from[i], this.to[i]));
		return now;
	},

	start: function(x, y) {
		var offsetSize = this.element.getSize(),
			scrollSize = this.element.getScrollSize(),
			scroll = this.element.getScrollOffset(),
			values = { x: x, y: y };
		var lookup = { x: 'width', y: 'height' };
		for (var i in values) {
			var s = lookup[i];
			var max = scrollSize[s] - offsetSize[s];
			if (Base.check(values[i]))
				values[i] = Base.type(values[i]) == 'number'
					? values[i].limit(0, max) : max;
			else values[i] = scroll[i];
			values[i] += this.options.offset[i];
		}
		return this.base([scroll.x, scroll.y], [values.x, values.y]);
	},

	toTop: function() {
		return this.start(false, 0);
	},

	toLeft: function() {
		return this.start(0, false);
	},

	toRight: function() {
		return this.start('right', false);
	},

	toBottom: function() {
		return this.start(false, 'bottom');
	},

	toElement: function(el) {
		var offset = DomElement.get(el).getOffset();
		return this.start(offset.x, offset.y);
	}
});

Fx.SmoothScroll = Fx.Scroll.extend({
	initialize: function(options, context) {
		context = DomElement.get(context || document);
		var doc = context.getDocument(), win = context.getWindow();
		this.base(doc, options);
		var links = this.options.links ? $$(this.options.links) : $$('a', context);
		var loc = win.location.href.match(/^[^#]*/)[0] + '#';
		links.each(function(link) {
			if (link.$.href.indexOf(loc) != 0) return;
			var hash = link.$.href.substring(loc.length);
			var anchor = hash && DomElement.get('#' + hash, context);
			if (anchor) {
				link.addEvent('click', function(event) {
					this.toElement(anchor);
					var props = anchor.getProperties('name', 'id');
					anchor.removeProperties('name', 'id');
					win.location.hash = hash;
					anchor.setProperties(props);
					event.stop();
				}.bind(this));
			}
		}, this);
	}
});

Fx.CSS = new function() {

	var parsers = new Hash({
		color: {
			match: function(value) {
				if (value.match(/^#[0-9a-f]{3,6}$/i)) return value.hexToRgb(true);
				return ((value = value.match(/(\d+),\s*(\d+),\s*(\d+)/))) ? [value[1], value[2], value[3]] : false;
			},

			compute: function(from, to, fx) {
				return from.map(function(value, i) {
					return Math.round(fx.compute(value, to[i]));
				});
			},

			get: function(value) {
				return value.map(Number);
			}
		},

		number: {
			match: function(value) {
				return parseFloat(value);
			},

			compute: function(from, to, fx) {
				return fx.compute(from, to);
			},

			get: function(value, unit) {
				return (unit) ? value + unit : value;
			}
		}
	});

	return {
		start: function(element, property, values) {
			values = Array.convert(values);
			if (!Base.check(values[1]))
				values = [ element.getStyle(property), values[0] ];
			var parsed = values.map(Fx.CSS.set);
			return { from: parsed[0], to: parsed[1] };
		},

		set: function(value) {
			return Array.convert(value).map(function(val) {
				val = val + '';
				var res = parsers.find(function(parser, key) {
					var value = parser.match(val);
					if (Base.check(value)) return { value: value, parser: parser };
				}) || {
					value: val,
					parser: {
						compute: function(from, to) {
							return to;
						}
					}
				};
				return res;
			});
		},

		compute: function(from, to, fx) {
			return from.map(function(obj, i) {
				return {
					value: obj.parser.compute(obj.value, to[i].value, fx),
					parser: obj.parser
				};
			});
		},

		get: function(now, unit) {
			return now.reduce(function(prev, cur) {
				var get = cur.parser.get;
				return prev.concat(get ? get(cur.value, unit) : cur.value);
			}, []);
		}
	}
};

Fx.Style = Fx.extend({
	initialize: function(element, property, options) {
		this.base(element, options);
		this.property = property;
	},

	hide: function() {
		return this.set(0);
	},

	get: function() {
		return Fx.CSS.compute(this.from, this.to, this);
	},

	set: function(to) {
		return this.base(Fx.CSS.set(to));
	},

	start: function(from, to) {
		if (this.timer && this.options.wait) return this;
		var parsed = Fx.CSS.start(this.element, this.property, [from, to]);
		return this.base(parsed.from, parsed.to);
	},

	update: function(val) {
		this.element.setStyle(this.property, Fx.CSS.get(val, this.options.unit));
	}
});

HtmlElement.inject({
	effect: function(prop, opts) {
		return new Fx.Style(this, prop, opts);
	}
});

Fx.Styles = Fx.extend({
	get: function() {
		var that = this;
		return Base.each(this.from, function(from, key) {
			this[key] = Fx.CSS.compute(from, that.to[key], that);
		}, {});
	},

	set: function(to) {
		return this.base(Base.each(to, function(val, key) {
			this[key] = Fx.CSS.set(val);
		}, {}));
	},

	start: function(obj) {
		if (this.timer && this.options.wait) return this;
		var from = {}, to = {};
		Base.each(obj, function(val, key) {
			var parsed = Fx.CSS.start(this.element, key, val);
			from[key] = parsed.from;
			to[key] = parsed.to;
		}, this);
		return this.base(from, to);
	},

	update: function(val) {
		Base.each(val, function(val, key) {
			this.element.setStyle(key, Fx.CSS.get(val, this.options.unit));
		}, this);
	}

});

HtmlElement.inject({
	effects: function(opts) {
		return new Fx.Styles(this, opts);
	}
});

Fx.Elements = Fx.extend({
	initialize: function(elements, options) {
		this.base(null, options);
		this.elements = DomElement.getAll(elements);
	},

	start: function(obj) {
		if (this.timer && this.options.wait) return this;
		this.effects = {};

		function start(that, key, val) {
			var fx = that.effects[key] = new Fx.Styles(that.elements[key], that.options);
			fx.slave = true;
			fx.start(val);
		}

		Base.each(obj, function(val, key) {
			if (key == '*') {
				this.elements.each(function(el, key) {
					start(this, key, val);
				}, this);
			} else if (isNaN(parseInt(key))) {
				var els = DomElement.getAll(key);
				this.elements.append(els);
				els.each(function(el) {
					start(this, this.elements.indexOf(el), val);
				}, this);
			} else {
				start(this, key, val);
			}
		}, this);
		return this.base();
	},

	set: function(to) {
	},

	update: function(to) {
		Base.each(this.effects, function(fx) {
			fx.step();
		});
	}
});

Fx.Transitions = new Base().inject({
	inject: function(src) {
		return this.base(Base.each(src, function(func, name) {
			func.In = func;

			func.Out = function(pos) {
				return 1 - func(1 - pos);
			}

			func.InOut = function(pos) {
				return pos <= 0.5 ? func(2 * pos) / 2 : (2 - func(2 * (1 - pos))) / 2;
			}
		}));
	},

	Linear: function(p) {
		return p;
	}
});

Fx.Transitions.inject({
	Pow: function(p, x) {
		return Math.pow(p, x[0] || 6);
	},

	Expo: function(p) {
		return Math.pow(2, 8 * (p - 1));
	},

	Circ: function(p) {
		return 1 - Math.sin(Math.acos(p));
	},

	Sine: function(p) {
		return 1 - Math.sin((1 - p) * Math.PI / 2);
	},

	Back: function(p, x) {
		x = x[0] || 1.618;
		return Math.pow(p, 2) * ((x + 1) * p - x);
	},

	Bounce: function(p) {
		var value;
		for (var a = 0, b = 1; 1; a += b, b /= 2) {
			if (p >= (7 - 4 * a) / 11) {
				value = - Math.pow((11 - 6 * a - 11 * p) / 4, 2) + b * b;
				break;
			}
		}
		return value;
	},

	Elastic: function(p, x) {
		return Math.pow(2, 10 * --p) * Math.cos(20 * p * Math.PI * (x[0] || 1) / 3);
	}

});

Fx.Transitions.inject(['Quad', 'Cubic', 'Quart', 'Quint'].each(function(name, i) {
	this[name] = function(p) {
		return Math.pow(p, i + 2);
	}
}, {}));

