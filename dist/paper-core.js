/*!
 * Paper.js v0.12.0 - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2016, Juerg Lehni & Jonathan Puckey
 * http://scratchdisk.com/ & https://puckey.studio/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 *
 * Date: Mon Dec 3 14:19:11 2018 +0100
 *
 ***
 *
 * Straps.js - Class inheritance library with support for bean-style accessors
 *
 * Copyright (c) 2006 - 2016 Juerg Lehni
 * http://scratchdisk.com/
 *
 * Distributed under the MIT license.
 *
 ***
 *
 * Acorn.js
 * https://marijnhaverbeke.nl/acorn/
 *
 * Acorn is a tiny, fast JavaScript parser written in JavaScript,
 * created by Marijn Haverbeke and released under an MIT license.
 *
 */

var paper = function(self, undefined) {

self = self || require('./node/self.js');
var window = self.window,
	document = self.document;

var Base = new function() {
	var hidden = /^(statics|enumerable|beans|preserve)$/,
		array = [],
		slice = array.slice,
		create = Object.create,
		describe = Object.getOwnPropertyDescriptor,
		define = Object.defineProperty,

		forEach = array.forEach || function(iter, bind) {
			for (var i = 0, l = this.length; i < l; i++) {
				iter.call(bind, this[i], i, this);
			}
		},

		forIn = function(iter, bind) {
			for (var i in this) {
				if (this.hasOwnProperty(i))
					iter.call(bind, this[i], i, this);
			}
		},

		set = Object.assign || function(dst) {
			for (var i = 1, l = arguments.length; i < l; i++) {
				var src = arguments[i];
				for (var key in src) {
					if (src.hasOwnProperty(key))
						dst[key] = src[key];
				}
			}
			return dst;
		},

		each = function(obj, iter, bind) {
			if (obj) {
				var desc = describe(obj, 'length');
				(desc && typeof desc.value === 'number' ? forEach : forIn)
					.call(obj, iter, bind = bind || obj);
			}
			return bind;
		};

	function inject(dest, src, enumerable, beans, preserve) {
		var beansNames = {};

		function field(name, val) {
			val = val || (val = describe(src, name))
					&& (val.get ? val : val.value);
			if (typeof val === 'string' && val[0] === '#')
				val = dest[val.substring(1)] || val;
			var isFunc = typeof val === 'function',
				res = val,
				prev = preserve || isFunc && !val.base
						? (val && val.get ? name in dest : dest[name])
						: null,
				bean;
			if (!preserve || !prev) {
				if (isFunc && prev)
					val.base = prev;
				if (isFunc && beans !== false
						&& (bean = name.match(/^([gs]et|is)(([A-Z])(.*))$/)))
					beansNames[bean[3].toLowerCase() + bean[4]] = bean[2];
				if (!res || isFunc || !res.get || typeof res.get !== 'function'
						|| !Base.isPlainObject(res)) {
					res = { value: res, writable: true };
				}
				if ((describe(dest, name)
						|| { configurable: true }).configurable) {
					res.configurable = true;
					res.enumerable = enumerable != null ? enumerable : !bean;
				}
				define(dest, name, res);
			}
		}
		if (src) {
			for (var name in src) {
				if (src.hasOwnProperty(name) && !hidden.test(name))
					field(name);
			}
			for (var name in beansNames) {
				var part = beansNames[name],
					set = dest['set' + part],
					get = dest['get' + part] || set && dest['is' + part];
				if (get && (beans === true || get.length === 0))
					field(name, { get: get, set: set });
			}
		}
		return dest;
	}

	function Base() {
		for (var i = 0, l = arguments.length; i < l; i++) {
			var src = arguments[i];
			if (src)
				set(this, src);
		}
		return this;
	}

	return inject(Base, {
		inject: function(src) {
			if (src) {
				var statics = src.statics === true ? src : src.statics,
					beans = src.beans,
					preserve = src.preserve;
				if (statics !== src)
					inject(this.prototype, src, src.enumerable, beans, preserve);
				inject(this, statics, null, beans, preserve);
			}
			for (var i = 1, l = arguments.length; i < l; i++)
				this.inject(arguments[i]);
			return this;
		},

		extend: function() {
			var base = this,
				ctor,
				proto;
			for (var i = 0, obj, l = arguments.length;
					i < l && !(ctor && proto); i++) {
				obj = arguments[i];
				ctor = ctor || obj.initialize;
				proto = proto || obj.prototype;
			}
			ctor = ctor || function() {
				base.apply(this, arguments);
			};
			proto = ctor.prototype = proto || create(this.prototype);
			define(proto, 'constructor',
					{ value: ctor, writable: true, configurable: true });
			inject(ctor, this);
			if (arguments.length)
				this.inject.apply(ctor, arguments);
			ctor.base = base;
			return ctor;
		}
	}).inject({
		enumerable: false,

		initialize: Base,

		set: Base,

		inject: function() {
			for (var i = 0, l = arguments.length; i < l; i++) {
				var src = arguments[i];
				if (src) {
					inject(this, src, src.enumerable, src.beans, src.preserve);
				}
			}
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
			return new this.constructor(this);
		},

		statics: {
			set: set,
			each: each,
			create: create,
			define: define,
			describe: describe,

			clone: function(obj) {
				return set(new obj.constructor(), obj);
			},

			isPlainObject: function(obj) {
				var ctor = obj != null && obj.constructor;
				return ctor && (ctor === Object || ctor === Base
						|| ctor.name === 'Object');
			},

			pick: function(a, b) {
				return a !== undefined ? a : b;
			},

			slice: function(list, begin, end) {
				return slice.call(list, begin, end);
			}
		}
	});
};

if (typeof module !== 'undefined')
	module.exports = Base;

Base.inject({
	enumerable: false,

	toString: function() {
		return this._id != null
			?  (this._class || 'Object') + (this._name
				? " '" + this._name + "'"
				: ' @' + this._id)
			: '{ ' + Base.each(this, function(value, key) {
				if (!/^_/.test(key)) {
					var type = typeof value;
					this.push(key + ': ' + (type === 'number'
							? Formatter.instance.number(value)
							: type === 'string' ? "'" + value + "'" : value));
				}
			}, []).join(', ') + ' }';
	},

	getClassName: function() {
		return this._class || '';
	},

	importJSON: function(json) {
		return Base.importJSON(json, this);
	},

	exportJSON: function(options) {
		return Base.exportJSON(this, options);
	},

	toJSON: function() {
		return Base.serialize(this);
	},

	set: function(props, exclude) {
		if (props)
			Base.filter(this, props, exclude, this._prioritize);
		return this;
	}
}, {

beans: false,
statics: {
	exports: {},

	extend: function extend() {
		var res = extend.base.apply(this, arguments),
			name = res.prototype._class;
		if (name && !Base.exports[name])
			Base.exports[name] = res;
		return res;
	},

	equals: function(obj1, obj2) {
		if (obj1 === obj2)
			return true;
		if (obj1 && obj1.equals)
			return obj1.equals(obj2);
		if (obj2 && obj2.equals)
			return obj2.equals(obj1);
		if (obj1 && obj2
				&& typeof obj1 === 'object' && typeof obj2 === 'object') {
			if (Array.isArray(obj1) && Array.isArray(obj2)) {
				var length = obj1.length;
				if (length !== obj2.length)
					return false;
				while (length--) {
					if (!Base.equals(obj1[length], obj2[length]))
						return false;
				}
			} else {
				var keys = Object.keys(obj1),
					length = keys.length;
				if (length !== Object.keys(obj2).length)
					return false;
				while (length--) {
					var key = keys[length];
					if (!(obj2.hasOwnProperty(key)
							&& Base.equals(obj1[key], obj2[key])))
						return false;
				}
			}
			return true;
		}
		return false;
	},

	read: function(list, start, options, amount) {
		if (this === Base) {
			var value = this.peek(list, start);
			list.__index++;
			return value;
		}
		var proto = this.prototype,
			readIndex = proto._readIndex,
			begin = start || readIndex && list.__index || 0,
			length = list.length,
			obj = list[begin];
		amount = amount || length - begin;
		if (obj instanceof this
			|| options && options.readNull && obj == null && amount <= 1) {
			if (readIndex)
				list.__index = begin + 1;
			return obj && options && options.clone ? obj.clone() : obj;
		}
		obj = Base.create(proto);
		if (readIndex)
			obj.__read = true;
		obj = obj.initialize.apply(obj, begin > 0 || begin + amount < length
				? Base.slice(list, begin, begin + amount)
				: list) || obj;
		if (readIndex) {
			list.__index = begin + obj.__read;
			var filtered = obj.__filtered;
			if (filtered) {
				list.__filtered = filtered;
				obj.__filtered = undefined;
			}
			obj.__read = undefined;
		}
		return obj;
	},

	peek: function(list, start) {
		return list[list.__index = start || list.__index || 0];
	},

	remain: function(list) {
		return list.length - (list.__index || 0);
	},

	readList: function(list, start, options, amount) {
		var res = [],
			entry,
			begin = start || 0,
			end = amount ? begin + amount : list.length;
		for (var i = begin; i < end; i++) {
			res.push(Array.isArray(entry = list[i])
					? this.read(entry, 0, options)
					: this.read(list, i, options, 1));
		}
		return res;
	},

	readNamed: function(list, name, start, options, amount) {
		var value = this.getNamed(list, name),
			hasObject = value !== undefined;
		if (hasObject) {
			var filtered = list.__filtered;
			if (!filtered) {
				filtered = list.__filtered = Base.create(list[0]);
				filtered.__unfiltered = list[0];
			}
			filtered[name] = undefined;
		}
		var l = hasObject ? [value] : list,
			res = this.read(l, start, options, amount);
		return res;
	},

	getNamed: function(list, name) {
		var arg = list[0];
		if (list._hasObject === undefined)
			list._hasObject = list.length === 1 && Base.isPlainObject(arg);
		if (list._hasObject)
			return name ? arg[name] : list.__filtered || arg;
	},

	hasNamed: function(list, name) {
		return !!this.getNamed(list, name);
	},

	filter: function(dest, source, exclude, prioritize) {
		var processed;

		function handleKey(key) {
			if (!(exclude && key in exclude) &&
				!(processed && key in processed)) {
				var value = source[key];
				if (value !== undefined)
					dest[key] = value;
			}
		}

		if (prioritize) {
			var keys = {};
			for (var i = 0, key, l = prioritize.length; i < l; i++) {
				if ((key = prioritize[i]) in source) {
					handleKey(key);
					keys[key] = true;
				}
			}
			processed = keys;
		}

		Object.keys(source.__unfiltered || source).forEach(handleKey);
		return dest;
	},

	isPlainValue: function(obj, asString) {
		return Base.isPlainObject(obj) || Array.isArray(obj)
				|| asString && typeof obj === 'string';
	},

	serialize: function(obj, options, compact, dictionary) {
		options = options || {};

		var isRoot = !dictionary,
			res;
		if (isRoot) {
			options.formatter = new Formatter(options.precision);
			dictionary = {
				length: 0,
				definitions: {},
				references: {},
				add: function(item, create) {
					var id = '#' + item._id,
						ref = this.references[id];
					if (!ref) {
						this.length++;
						var res = create.call(item),
							name = item._class;
						if (name && res[0] !== name)
							res.unshift(name);
						this.definitions[id] = res;
						ref = this.references[id] = [id];
					}
					return ref;
				}
			};
		}
		if (obj && obj._serialize) {
			res = obj._serialize(options, dictionary);
			var name = obj._class;
			if (name && !obj._compactSerialize && (isRoot || !compact)
					&& res[0] !== name) {
				res.unshift(name);
			}
		} else if (Array.isArray(obj)) {
			res = [];
			for (var i = 0, l = obj.length; i < l; i++)
				res[i] = Base.serialize(obj[i], options, compact, dictionary);
		} else if (Base.isPlainObject(obj)) {
			res = {};
			var keys = Object.keys(obj);
			for (var i = 0, l = keys.length; i < l; i++) {
				var key = keys[i];
				res[key] = Base.serialize(obj[key], options, compact,
						dictionary);
			}
		} else if (typeof obj === 'number') {
			res = options.formatter.number(obj, options.precision);
		} else {
			res = obj;
		}
		return isRoot && dictionary.length > 0
				? [['dictionary', dictionary.definitions], res]
				: res;
	},

	deserialize: function(json, create, _data, _setDictionary, _isRoot) {
		var res = json,
			isFirst = !_data,
			hasDictionary = isFirst && json && json.length
				&& json[0][0] === 'dictionary';
		_data = _data || {};
		if (Array.isArray(json)) {
			var type = json[0],
				isDictionary = type === 'dictionary';
			if (json.length == 1 && /^#/.test(type)) {
				return _data.dictionary[type];
			}
			type = Base.exports[type];
			res = [];
			for (var i = type ? 1 : 0, l = json.length; i < l; i++) {
				res.push(Base.deserialize(json[i], create, _data,
						isDictionary, hasDictionary));
			}
			if (type) {
				var args = res;
				if (create) {
					res = create(type, args, isFirst || _isRoot);
				} else {
					res = new type(args);
				}
			}
		} else if (Base.isPlainObject(json)) {
			res = {};
			if (_setDictionary)
				_data.dictionary = res;
			for (var key in json)
				res[key] = Base.deserialize(json[key], create, _data);
		}
		return hasDictionary ? res[1] : res;
	},

	exportJSON: function(obj, options) {
		var json = Base.serialize(obj, options);
		return options && options.asString == false
				? json
				: JSON.stringify(json);
	},

	importJSON: function(json, target) {
		return Base.deserialize(
				typeof json === 'string' ? JSON.parse(json) : json,
				function(ctor, args, isRoot) {
					var useTarget = isRoot && target
							&& target.constructor === ctor,
						obj = useTarget ? target
							: Base.create(ctor.prototype);
					if (args.length === 1 && obj instanceof Item
							&& (useTarget || !(obj instanceof Layer))) {
						var arg = args[0];
						if (Base.isPlainObject(arg))
							arg.insert = false;
					}
					(useTarget ? obj.set : ctor).apply(obj, args);
					if (useTarget)
						target = null;
					return obj;
				});
	},

	push: function(list, items) {
		var itemsLength = items.length;
		if (itemsLength < 4096) {
			list.push.apply(list, items);
		} else {
			var startLength = list.length;
			list.length += itemsLength;
			for (var i = 0; i < itemsLength; i++) {
				list[startLength + i] = items[i];
			}
		}
		return list;
	},

	splice: function(list, items, index, remove) {
		var amount = items && items.length,
			append = index === undefined;
		index = append ? list.length : index;
		if (index > list.length)
			index = list.length;
		for (var i = 0; i < amount; i++)
			items[i]._index = index + i;
		if (append) {
			Base.push(list, items);
			return [];
		} else {
			var args = [index, remove];
			if (items)
				Base.push(args, items);
			var removed = list.splice.apply(list, args);
			for (var i = 0, l = removed.length; i < l; i++)
				removed[i]._index = undefined;
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
		return str.replace(/-(.)/g, function(match, chr) {
			return chr.toUpperCase();
		});
	},

	hyphenate: function(str) {
		return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
	}
}});

var Emitter = {
	on: function(type, func) {
		if (typeof type !== 'string') {
			Base.each(type, function(value, key) {
				this.on(key, value);
			}, this);
		} else {
			var types = this._eventTypes,
				entry = types && types[type],
				handlers = this._callbacks = this._callbacks || {};
			handlers = handlers[type] = handlers[type] || [];
			if (handlers.indexOf(func) === -1) {
				handlers.push(func);
				if (entry && entry.install && handlers.length === 1)
					entry.install.call(this, type);
			}
		}
		return this;
	},

	off: function(type, func) {
		if (typeof type !== 'string') {
			Base.each(type, function(value, key) {
				this.off(key, value);
			}, this);
			return;
		}
		var types = this._eventTypes,
			entry = types && types[type],
			handlers = this._callbacks && this._callbacks[type],
			index;
		if (handlers) {
			if (!func || (index = handlers.indexOf(func)) !== -1
					&& handlers.length === 1) {
				if (entry && entry.uninstall)
					entry.uninstall.call(this, type);
				delete this._callbacks[type];
			} else if (index !== -1) {
				handlers.splice(index, 1);
			}
		}
		return this;
	},

	once: function(type, func) {
		return this.on(type, function handler() {
			func.apply(this, arguments);
			this.off(type, handler);
		});
	},

	emit: function(type, event) {
		var handlers = this._callbacks && this._callbacks[type];
		if (!handlers)
			return false;
		var args = Base.slice(arguments, 1),
			setTarget = event && event.target && !event.currentTarget;
		handlers = handlers.slice();
		if (setTarget)
			event.currentTarget = this;
		for (var i = 0, l = handlers.length; i < l; i++) {
			if (handlers[i].apply(this, args) == false) {
				if (event && event.stop)
					event.stop();
				break;
		   }
		}
		if (setTarget)
			delete event.currentTarget;
		return true;
	},

	responds: function(type) {
		return !!(this._callbacks && this._callbacks[type]);
	},

	attach: '#on',
	detach: '#off',
	fire: '#emit',

	_installEvents: function(install) {
		var types = this._eventTypes,
			handlers = this._callbacks,
			key = install ? 'install' : 'uninstall';
		if (types) {
			for (var type in handlers) {
				if (handlers[type].length > 0) {
					var entry = types[type],
						func = entry && entry[key];
					if (func)
						func.call(this, type);
				}
			}
		}
	},

	statics: {
		inject: function inject(src) {
			var events = src._events;
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
						var prev = this[name];
						if (prev)
							this.off(type, prev);
						if (func)
							this.on(type, func);
						this[name] = func;
					};
				});
				src._eventTypes = types;
			}
			return inject.base.apply(this, arguments);
		}
	}
};

var PaperScope = Base.extend({
	_class: 'PaperScope',

	initialize: function PaperScope() {
		paper = this;
		this.settings = new Base({
			applyMatrix: true,
			insertItems: true,
			handleSize: 4,
			hitTolerance: 0
		});
		this.project = null;
		this.projects = [];
		this.tools = [];
		this._id = PaperScope._id++;
		PaperScope._scopes[this._id] = this;
		var proto = PaperScope.prototype;
		if (!this.support) {
			var ctx = CanvasProvider.getContext(1, 1) || {};
			proto.support = {
				nativeDash: 'setLineDash' in ctx || 'mozDash' in ctx,
				nativeBlendModes: BlendMode.nativeModes
			};
			CanvasProvider.release(ctx);
		}
		if (!this.agent) {
			var user = self.navigator.userAgent.toLowerCase(),
				os = (/(darwin|win|mac|linux|freebsd|sunos)/.exec(user)||[])[0],
				platform = os === 'darwin' ? 'mac' : os,
				agent = proto.agent = proto.browser = { platform: platform };
			if (platform)
				agent[platform] = true;
			user.replace(
				/(opera|chrome|safari|webkit|firefox|msie|trident|atom|node)\/?\s*([.\d]+)(?:.*version\/([.\d]+))?(?:.*rv\:v?([.\d]+))?/g,
				function(match, n, v1, v2, rv) {
					if (!agent.chrome) {
						var v = n === 'opera' ? v2 :
								/^(node|trident)$/.test(n) ? rv : v1;
						agent.version = v;
						agent.versionNumber = parseFloat(v);
						n = n === 'trident' ? 'msie' : n;
						agent.name = n;
						agent[n] = true;
					}
				}
			);
			if (agent.chrome)
				delete agent.webkit;
			if (agent.atom)
				delete agent.chrome;
		}
	},

	version: "0.12.0",

	getView: function() {
		var project = this.project;
		return project && project._view;
	},

	getPaper: function() {
		return this;
	},

	execute: function(code, options) {
	},

	install: function(scope) {
		var that = this;
		Base.each(['project', 'view', 'tool'], function(key) {
			Base.define(scope, key, {
				configurable: true,
				get: function() {
					return that[key];
				}
			});
		});
		for (var key in this)
			if (!/^_/.test(key) && this[key])
				scope[key] = this[key];
	},

	setup: function(element) {
		paper = this;
		this.project = new Project(element);
		return this;
	},

	createCanvas: function(width, height) {
		return CanvasProvider.getCanvas(width, height);
	},

	activate: function() {
		paper = this;
	},

	clear: function() {
		var projects = this.projects,
			tools = this.tools;
		for (var i = projects.length - 1; i >= 0; i--)
			projects[i].remove();
		for (var i = tools.length - 1; i >= 0; i--)
			tools[i].remove();
	},

	remove: function() {
		this.clear();
		delete PaperScope._scopes[this._id];
	},

	statics: new function() {
		function handleAttribute(name) {
			name += 'Attribute';
			return function(el, attr) {
				return el[name](attr) || el[name]('data-paper-' + attr);
			};
		}

		return {
			_scopes: {},
			_id: 0,

			get: function(id) {
				return this._scopes[id] || null;
			},

			getAttribute: handleAttribute('get'),
			hasAttribute: handleAttribute('has')
		};
	}
});

var PaperScopeItem = Base.extend(Emitter, {

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
		if (prev && prev !== this)
			prev.emit('deactivate');
		this._scope[this._reference] = this;
		this.emit('activate', prev);
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
	},

	getView: function() {
		return this._scope.getView();
	}
});

var Formatter = Base.extend({
	initialize: function(precision) {
		this.precision = Base.pick(precision, 5);
		this.multiplier = Math.pow(10, this.precision);
	},

	number: function(val) {
		return this.precision < 16
				? Math.round(val * this.multiplier) / this.multiplier : val;
	},

	pair: function(val1, val2, separator) {
		return this.number(val1) + (separator || ',') + this.number(val2);
	},

	point: function(val, separator) {
		return this.number(val.x) + (separator || ',') + this.number(val.y);
	},

	size: function(val, separator) {
		return this.number(val.width) + (separator || ',')
				+ this.number(val.height);
	},

	rectangle: function(val, separator) {
		return this.point(val, separator) + (separator || ',')
				+ this.size(val, separator);
	}
});

Formatter.instance = new Formatter();

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
		log2 = Math.log2 || function(x) {
			return Math.log(x) * Math.LOG2E;
		},
		EPSILON = 1e-12,
		MACHINE_EPSILON = 1.12e-16;

	function clamp(value, min, max) {
		return value < min ? min : value > max ? max : value;
	}

	function getDiscriminant(a, b, c) {
		function split(v) {
			var x = v * 134217729,
				y = v - x,
				hi = y + x,
				lo = v - hi;
			return [hi, lo];
		}

		var D = b * b - a * c,
			E = b * b + a * c;
		if (abs(D) * 3 < E) {
			var ad = split(a),
				bd = split(b),
				cd = split(c),
				p = b * b,
				dp = (bd[0] * bd[0] - p + 2 * bd[0] * bd[1]) + bd[1] * bd[1],
				q = a * c,
				dq = (ad[0] * cd[0] - q + ad[0] * cd[1] + ad[1] * cd[0])
						+ ad[1] * cd[1];
			D = (p - q) + (dp - dq);
		}
		return D;
	}

	function getNormalizationFactor() {
		var norm = Math.max.apply(Math, arguments);
		return norm && (norm < 1e-8 || norm > 1e8)
				? pow(2, -Math.round(log2(norm)))
				: 0;
	}

	return {
		EPSILON: EPSILON,
		MACHINE_EPSILON: MACHINE_EPSILON,
		CURVETIME_EPSILON: 1e-8,
		GEOMETRIC_EPSILON: 1e-7,
		TRIGONOMETRIC_EPSILON: 1e-8,
		KAPPA: 4 * (sqrt(2) - 1) / 3,

		isZero: function(val) {
			return val >= -EPSILON && val <= EPSILON;
		},

		clamp: clamp,

		integrate: function(f, a, b, n) {
			var x = abscissas[n - 2],
				w = weights[n - 2],
				A = (b - a) * 0.5,
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
					dx = fx / df(x),
					nx = x - dx;
				if (abs(dx) < tolerance) {
					x = nx;
					break;
				}
				if (fx > 0) {
					b = x;
					x = nx <= a ? (a + b) * 0.5 : nx;
				} else {
					a = x;
					x = nx >= b ? (a + b) * 0.5 : nx;
				}
			}
			return clamp(x, a, b);
		},

		solveQuadratic: function(a, b, c, roots, min, max) {
			var x1, x2 = Infinity;
			if (abs(a) < EPSILON) {
				if (abs(b) < EPSILON)
					return abs(c) < EPSILON ? -1 : 0;
				x1 = -c / b;
			} else {
				b *= -0.5;
				var D = getDiscriminant(a, b, c);
				if (D && abs(D) < MACHINE_EPSILON) {
					var f = getNormalizationFactor(abs(a), abs(b), abs(c));
					if (f) {
						a *= f;
						b *= f;
						c *= f;
						D = getDiscriminant(a, b, c);
					}
				}
				if (D >= -MACHINE_EPSILON) {
					var Q = D < 0 ? 0 : sqrt(D),
						R = b + (b < 0 ? -Q : Q);
					if (R === 0) {
						x1 = c / a;
						x2 = -x1;
					} else {
						x1 = R / a;
						x2 = c / R;
					}
				}
			}
			var count = 0,
				boundless = min == null,
				minB = min - EPSILON,
				maxB = max + EPSILON;
			if (isFinite(x1) && (boundless || x1 > minB && x1 < maxB))
				roots[count++] = boundless ? x1 : clamp(x1, min, max);
			if (x2 !== x1
					&& isFinite(x2) && (boundless || x2 > minB && x2 < maxB))
				roots[count++] = boundless ? x2 : clamp(x2, min, max);
			return count;
		},

		solveCubic: function(a, b, c, d, roots, min, max) {
			var f = getNormalizationFactor(abs(a), abs(b), abs(c), abs(d)),
				x, b1, c2, qd, q;
			if (f) {
				a *= f;
				b *= f;
				c *= f;
				d *= f;
			}

			function evaluate(x0) {
				x = x0;
				var tmp = a * x;
				b1 = tmp + b;
				c2 = b1 * x + c;
				qd = (tmp + b1) * x + c2;
				q = c2 * x + d;
			}

			if (abs(a) < EPSILON) {
				a = b;
				b1 = c;
				c2 = d;
				x = Infinity;
			} else if (abs(d) < EPSILON) {
				b1 = b;
				c2 = c;
				x = 0;
			} else {
				evaluate(-(b / a) / 3);
				var t = q / a,
					r = pow(abs(t), 1/3),
					s = t < 0 ? -1 : 1,
					td = -qd / a,
					rd = td > 0 ? 1.324717957244746 * Math.max(r, sqrt(td)) : r,
					x0 = x - s * rd;
				if (x0 !== x) {
					do {
						evaluate(x0);
						x0 = qd === 0 ? x : x - q / qd / (1 + MACHINE_EPSILON);
					} while (s * x0 > s * x);
					if (abs(a) * x * x > abs(d / x)) {
						c2 = -d / x;
						b1 = (c2 - c) / x;
					}
				}
			}
			var count = Numerical.solveQuadratic(a, b1, c2, roots, min, max),
				boundless = min == null;
			if (isFinite(x) && (count === 0
					|| count > 0 && x !== roots[0] && x !== roots[1])
					&& (boundless || x > min - EPSILON && x < max + EPSILON))
				roots[count++] = boundless ? x : clamp(x, min, max);
			return count;
		}
	};
};

var UID = {
	_id: 1,
	_pools: {},

	get: function(name) {
		if (name) {
			var pool = this._pools[name];
			if (!pool)
				pool = this._pools[name] = { _id: 1 };
			return pool._id++;
		} else {
			return this._id++;
		}
	}
};

var Point = Base.extend({
	_class: 'Point',
	_readIndex: true,

	initialize: function Point(arg0, arg1) {
		var type = typeof arg0,
			reading = this.__read,
			read = 0;
		if (type === 'number') {
			var hasY = typeof arg1 === 'number';
			this._set(arg0, hasY ? arg1 : arg0);
			if (reading)
				read = hasY ? 2 : 1;
		} else if (type === 'undefined' || arg0 === null) {
			this._set(0, 0);
			if (reading)
				read = arg0 === null ? 1 : 0;
		} else {
			var obj = type === 'string' ? arg0.split(/[\s,]+/) || [] : arg0;
			read = 1;
			if (Array.isArray(obj)) {
				this._set(+obj[0], +(obj.length > 1 ? obj[1] : obj[0]));
			} else if ('x' in obj) {
				this._set(obj.x || 0, obj.y || 0);
			} else if ('width' in obj) {
				this._set(obj.width || 0, obj.height || 0);
			} else if ('angle' in obj) {
				this._set(obj.length || 0, 0);
				this.setAngle(obj.angle || 0);
			} else {
				this._set(0, 0);
				read = 0;
			}
		}
		if (reading)
			this.__read = read;
		return this;
	},

	set: '#initialize',

	_set: function(x, y) {
		this.x = x;
		this.y = y;
		return this;
	},

	equals: function(point) {
		return this === point || point
				&& (this.x === point.x && this.y === point.y
					|| Array.isArray(point)
						&& this.x === point[0] && this.y === point[1])
				|| false;
	},

	clone: function() {
		return new Point(this.x, this.y);
	},

	toString: function() {
		var f = Formatter.instance;
		return '{ x: ' + f.number(this.x) + ', y: ' + f.number(this.y) + ' }';
	},

	_serialize: function(options) {
		var f = options.formatter;
		return [f.number(this.x), f.number(this.y)];
	},

	getLength: function() {
		return Math.sqrt(this.x * this.x + this.y * this.y);
	},

	setLength: function(length) {
		if (this.isZero()) {
			var angle = this._angle || 0;
			this._set(
				Math.cos(angle) * length,
				Math.sin(angle) * length
			);
		} else {
			var scale = length / this.getLength();
			if (Numerical.isZero(scale))
				this.getAngle();
			this._set(
				this.x * scale,
				this.y * scale
			);
		}
	},
	getAngle: function() {
		return this.getAngleInRadians.apply(this, arguments) * 180 / Math.PI;
	},

	setAngle: function(angle) {
		this.setAngleInRadians.call(this, angle * Math.PI / 180);
	},

	getAngleInDegrees: '#getAngle',
	setAngleInDegrees: '#setAngle',

	getAngleInRadians: function() {
		if (!arguments.length) {
			return this.isZero()
					? this._angle || 0
					: this._angle = Math.atan2(this.y, this.x);
		} else {
			var point = Point.read(arguments),
				div = this.getLength() * point.getLength();
			if (Numerical.isZero(div)) {
				return NaN;
			} else {
				var a = this.dot(point) / div;
				return Math.acos(a < -1 ? -1 : a > 1 ? 1 : a);
			}
		}
	},

	setAngleInRadians: function(angle) {
		this._angle = angle;
		if (!this.isZero()) {
			var length = this.getLength();
			this._set(
				Math.cos(angle) * length,
				Math.sin(angle) * length
			);
		}
	},

	getQuadrant: function() {
		return this.x >= 0 ? this.y >= 0 ? 1 : 4 : this.y >= 0 ? 2 : 3;
	}
}, {
	beans: false,

	getDirectedAngle: function() {
		var point = Point.read(arguments);
		return Math.atan2(this.cross(point), this.dot(point)) * 180 / Math.PI;
	},

	getDistance: function() {
		var point = Point.read(arguments),
			x = point.x - this.x,
			y = point.y - this.y,
			d = x * x + y * y,
			squared = Base.read(arguments);
		return squared ? d : Math.sqrt(d);
	},

	normalize: function(length) {
		if (length === undefined)
			length = 1;
		var current = this.getLength(),
			scale = current !== 0 ? length / current : 0,
			point = new Point(this.x * scale, this.y * scale);
		if (scale >= 0)
			point._angle = this._angle;
		return point;
	},

	rotate: function(angle, center) {
		if (angle === 0)
			return this.clone();
		angle = angle * Math.PI / 180;
		var point = center ? this.subtract(center) : this,
			sin = Math.sin(angle),
			cos = Math.cos(angle);
		point = new Point(
			point.x * cos - point.y * sin,
			point.x * sin + point.y * cos
		);
		return center ? point.add(center) : point;
	},

	transform: function(matrix) {
		return matrix ? matrix._transformPoint(this) : this;
	},

	add: function() {
		var point = Point.read(arguments);
		return new Point(this.x + point.x, this.y + point.y);
	},

	subtract: function() {
		var point = Point.read(arguments);
		return new Point(this.x - point.x, this.y - point.y);
	},

	multiply: function() {
		var point = Point.read(arguments);
		return new Point(this.x * point.x, this.y * point.y);
	},

	divide: function() {
		var point = Point.read(arguments);
		return new Point(this.x / point.x, this.y / point.y);
	},

	modulo: function() {
		var point = Point.read(arguments);
		return new Point(this.x % point.x, this.y % point.y);
	},

	negate: function() {
		return new Point(-this.x, -this.y);
	},

	isInside: function() {
		return Rectangle.read(arguments).contains(this);
	},

	isClose: function() {
		var point = Point.read(arguments),
			tolerance = Base.read(arguments);
		return this.getDistance(point) <= tolerance;
	},

	isCollinear: function() {
		var point = Point.read(arguments);
		return Point.isCollinear(this.x, this.y, point.x, point.y);
	},

	isColinear: '#isCollinear',

	isOrthogonal: function() {
		var point = Point.read(arguments);
		return Point.isOrthogonal(this.x, this.y, point.x, point.y);
	},

	isZero: function() {
		var isZero = Numerical.isZero;
		return isZero(this.x) && isZero(this.y);
	},

	isNaN: function() {
		return isNaN(this.x) || isNaN(this.y);
	},

	isInQuadrant: function(q) {
		return this.x * (q > 1 && q < 4 ? -1 : 1) >= 0
			&& this.y * (q > 2 ? -1 : 1) >= 0;
	},

	dot: function() {
		var point = Point.read(arguments);
		return this.x * point.x + this.y * point.y;
	},

	cross: function() {
		var point = Point.read(arguments);
		return this.x * point.y - this.y * point.x;
	},

	project: function() {
		var point = Point.read(arguments),
			scale = point.isZero() ? 0 : this.dot(point) / point.dot(point);
		return new Point(
			point.x * scale,
			point.y * scale
		);
	},

	statics: {
		min: function() {
			var point1 = Point.read(arguments),
				point2 = Point.read(arguments);
			return new Point(
				Math.min(point1.x, point2.x),
				Math.min(point1.y, point2.y)
			);
		},

		max: function() {
			var point1 = Point.read(arguments),
				point2 = Point.read(arguments);
			return new Point(
				Math.max(point1.x, point2.x),
				Math.max(point1.y, point2.y)
			);
		},

		random: function() {
			return new Point(Math.random(), Math.random());
		},

		isCollinear: function(x1, y1, x2, y2) {
			return Math.abs(x1 * y2 - y1 * x2)
					<= Math.sqrt((x1 * x1 + y1 * y1) * (x2 * x2 + y2 * y2))
						* 1e-8;
		},

		isOrthogonal: function(x1, y1, x2, y2) {
			return Math.abs(x1 * x2 + y1 * y2)
					<= Math.sqrt((x1 * x1 + y1 * y1) * (x2 * x2 + y2 * y2))
						* 1e-8;
		}
	}
}, Base.each(['round', 'ceil', 'floor', 'abs'], function(key) {
	var op = Math[key];
	this[key] = function() {
		return new Point(op(this.x), op(this.y));
	};
}, {}));

var LinkedPoint = Point.extend({
	initialize: function Point(x, y, owner, setter) {
		this._x = x;
		this._y = y;
		this._owner = owner;
		this._setter = setter;
	},

	_set: function(x, y, _dontNotify) {
		this._x = x;
		this._y = y;
		if (!_dontNotify)
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

	isSelected: function() {
		return !!(this._owner._selection & this._getSelection());
	},

	setSelected: function(selected) {
		this._owner._changeSelection(this._getSelection(), selected);
	},

	_getSelection: function() {
		return this._setter === 'setPosition' ? 4 : 0;
	}
});

var Size = Base.extend({
	_class: 'Size',
	_readIndex: true,

	initialize: function Size(arg0, arg1) {
		var type = typeof arg0,
			reading = this.__read,
			read = 0;
		if (type === 'number') {
			var hasHeight = typeof arg1 === 'number';
			this._set(arg0, hasHeight ? arg1 : arg0);
			if (reading)
				read = hasHeight ? 2 : 1;
		} else if (type === 'undefined' || arg0 === null) {
			this._set(0, 0);
			if (reading)
				read = arg0 === null ? 1 : 0;
		} else {
			var obj = type === 'string' ? arg0.split(/[\s,]+/) || [] : arg0;
			read = 1;
			if (Array.isArray(obj)) {
				this._set(+obj[0], +(obj.length > 1 ? obj[1] : obj[0]));
			} else if ('width' in obj) {
				this._set(obj.width || 0, obj.height || 0);
			} else if ('x' in obj) {
				this._set(obj.x || 0, obj.y || 0);
			} else {
				this._set(0, 0);
				read = 0;
			}
		}
		if (reading)
			this.__read = read;
		return this;
	},

	set: '#initialize',

	_set: function(width, height) {
		this.width = width;
		this.height = height;
		return this;
	},

	equals: function(size) {
		return size === this || size && (this.width === size.width
				&& this.height === size.height
				|| Array.isArray(size) && this.width === size[0]
					&& this.height === size[1]) || false;
	},

	clone: function() {
		return new Size(this.width, this.height);
	},

	toString: function() {
		var f = Formatter.instance;
		return '{ width: ' + f.number(this.width)
				+ ', height: ' + f.number(this.height) + ' }';
	},

	_serialize: function(options) {
		var f = options.formatter;
		return [f.number(this.width),
				f.number(this.height)];
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

	isZero: function() {
		var isZero = Numerical.isZero;
		return isZero(this.width) && isZero(this.height);
	},

	isNaN: function() {
		return isNaN(this.width) || isNaN(this.height);
	},

	statics: {
		min: function(size1, size2) {
			return new Size(
				Math.min(size1.width, size2.width),
				Math.min(size1.height, size2.height));
		},

		max: function(size1, size2) {
			return new Size(
				Math.max(size1.width, size2.width),
				Math.max(size1.height, size2.height));
		},

		random: function() {
			return new Size(Math.random(), Math.random());
		}
	}
}, Base.each(['round', 'ceil', 'floor', 'abs'], function(key) {
	var op = Math[key];
	this[key] = function() {
		return new Size(op(this.width), op(this.height));
	};
}, {}));

var LinkedSize = Size.extend({
	initialize: function Size(width, height, owner, setter) {
		this._width = width;
		this._height = height;
		this._owner = owner;
		this._setter = setter;
	},

	_set: function(width, height, _dontNotify) {
		this._width = width;
		this._height = height;
		if (!_dontNotify)
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
	}
});

var Rectangle = Base.extend({
	_class: 'Rectangle',
	_readIndex: true,
	beans: true,

	initialize: function Rectangle(arg0, arg1, arg2, arg3) {
		var type = typeof arg0,
			read;
		if (type === 'number') {
			this._set(arg0, arg1, arg2, arg3);
			read = 4;
		} else if (type === 'undefined' || arg0 === null) {
			this._set(0, 0, 0, 0);
			read = arg0 === null ? 1 : 0;
		} else if (arguments.length === 1) {
			if (Array.isArray(arg0)) {
				this._set.apply(this, arg0);
				read = 1;
			} else if (arg0.x !== undefined || arg0.width !== undefined) {
				this._set(arg0.x || 0, arg0.y || 0,
						arg0.width || 0, arg0.height || 0);
				read = 1;
			} else if (arg0.from === undefined && arg0.to === undefined) {
				this._set(0, 0, 0, 0);
				Base.filter(this, arg0);
				read = 1;
			}
		}
		if (read === undefined) {
			var frm = Point.readNamed(arguments, 'from'),
				next = Base.peek(arguments),
				x = frm.x,
				y = frm.y,
				width,
				height;
			if (next && next.x !== undefined
					|| Base.hasNamed(arguments, 'to')) {
				var to = Point.readNamed(arguments, 'to');
				width = to.x - x;
				height = to.y - y;
				if (width < 0) {
					x = to.x;
					width = -width;
				}
				if (height < 0) {
					y = to.y;
					height = -height;
				}
			} else {
				var size = Size.read(arguments);
				width = size.width;
				height = size.height;
			}
			this._set(x, y, width, height);
			read = arguments.__index;
			var filtered = arguments.__filtered;
			if (filtered)
				this.__filtered = filtered;
		}
		if (this.__read)
			this.__read = read;
		return this;
	},

	set: '#initialize',

	_set: function(x, y, width, height) {
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
		return this;
	},

	clone: function() {
		return new Rectangle(this.x, this.y, this.width, this.height);
	},

	equals: function(rect) {
		var rt = Base.isPlainValue(rect)
				? Rectangle.read(arguments)
				: rect;
		return rt === this
				|| rt && this.x === rt.x && this.y === rt.y
					&& this.width === rt.width && this.height === rt.height
				|| false;
	},

	toString: function() {
		var f = Formatter.instance;
		return '{ x: ' + f.number(this.x)
				+ ', y: ' + f.number(this.y)
				+ ', width: ' + f.number(this.width)
				+ ', height: ' + f.number(this.height)
				+ ' }';
	},

	_serialize: function(options) {
		var f = options.formatter;
		return [f.number(this.x),
				f.number(this.y),
				f.number(this.width),
				f.number(this.height)];
	},

	getPoint: function(_dontLink) {
		var ctor = _dontLink ? Point : LinkedPoint;
		return new ctor(this.x, this.y, this, 'setPoint');
	},

	setPoint: function() {
		var point = Point.read(arguments);
		this.x = point.x;
		this.y = point.y;
	},

	getSize: function(_dontLink) {
		var ctor = _dontLink ? Size : LinkedSize;
		return new ctor(this.width, this.height, this, 'setSize');
	},

	_fw: 1,
	_fh: 1,

	setSize: function() {
		var size = Size.read(arguments),
			sx = this._sx,
			sy = this._sy,
			w = size.width,
			h = size.height;
		if (sx) {
			this.x += (this.width - w) * sx;
		}
		if (sy) {
			this.y += (this.height - h) * sy;
		}
		this.width = w;
		this.height = h;
		this._fw = this._fh = 1;
	},

	getLeft: function() {
		return this.x;
	},

	setLeft: function(left) {
		if (!this._fw) {
			var amount = left - this.x;
			this.width -= this._sx === 0.5 ? amount * 2 : amount;
		}
		this.x = left;
		this._sx = this._fw = 0;
	},

	getTop: function() {
		return this.y;
	},

	setTop: function(top) {
		if (!this._fh) {
			var amount = top - this.y;
			this.height -= this._sy === 0.5 ? amount * 2 : amount;
		}
		this.y = top;
		this._sy = this._fh = 0;
	},

	getRight: function() {
		return this.x + this.width;
	},

	setRight: function(right) {
		if (!this._fw) {
			var amount = right - this.x;
			this.width = this._sx === 0.5 ? amount * 2 : amount;
		}
		this.x = right - this.width;
		this._sx = 1;
		this._fw = 0;
	},

	getBottom: function() {
		return this.y + this.height;
	},

	setBottom: function(bottom) {
		if (!this._fh) {
			var amount = bottom - this.y;
			this.height = this._sy === 0.5 ? amount * 2 : amount;
		}
		this.y = bottom - this.height;
		this._sy = 1;
		this._fh = 0;
	},

	getCenterX: function() {
		return this.x + this.width / 2;
	},

	setCenterX: function(x) {
		if (this._fw || this._sx === 0.5) {
			this.x = x - this.width / 2;
		} else {
			if (this._sx) {
				this.x += (x - this.x) * 2 * this._sx;
			}
			this.width = (x - this.x) * 2;
		}
		this._sx = 0.5;
		this._fw = 0;
	},

	getCenterY: function() {
		return this.y + this.height / 2;
	},

	setCenterY: function(y) {
		if (this._fh || this._sy === 0.5) {
			this.y = y - this.height / 2;
		} else {
			if (this._sy) {
				this.y += (y - this.y) * 2 * this._sy;
			}
			this.height = (y - this.y) * 2;
		}
		this._sy = 0.5;
		this._fh = 0;
	},

	getCenter: function(_dontLink) {
		var ctor = _dontLink ? Point : LinkedPoint;
		return new ctor(this.getCenterX(), this.getCenterY(), this, 'setCenter');
	},

	setCenter: function() {
		var point = Point.read(arguments);
		this.setCenterX(point.x);
		this.setCenterY(point.y);
		return this;
	},

	getArea: function() {
		return this.width * this.height;
	},

	isEmpty: function() {
		return this.width === 0 || this.height === 0;
	},

	contains: function(arg) {
		return arg && arg.width !== undefined
				|| (Array.isArray(arg) ? arg : arguments).length === 4
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

	intersects: function() {
		var rect = Rectangle.read(arguments),
			epsilon = Base.read(arguments) || 0;
		return rect.x + rect.width > this.x - epsilon
				&& rect.y + rect.height > this.y - epsilon
				&& rect.x < this.x + this.width + epsilon
				&& rect.y < this.y + this.height + epsilon;
	},

	intersect: function() {
		var rect = Rectangle.read(arguments),
			x1 = Math.max(this.x, rect.x),
			y1 = Math.max(this.y, rect.y),
			x2 = Math.min(this.x + this.width, rect.x + rect.width),
			y2 = Math.min(this.y + this.height, rect.y + rect.height);
		return new Rectangle(x1, y1, x2 - x1, y2 - y1);
	},

	unite: function() {
		var rect = Rectangle.read(arguments),
			x1 = Math.min(this.x, rect.x),
			y1 = Math.min(this.y, rect.y),
			x2 = Math.max(this.x + this.width, rect.x + rect.width),
			y2 = Math.max(this.y + this.height, rect.y + rect.height);
		return new Rectangle(x1, y1, x2 - x1, y2 - y1);
	},

	include: function() {
		var point = Point.read(arguments);
		var x1 = Math.min(this.x, point.x),
			y1 = Math.min(this.y, point.y),
			x2 = Math.max(this.x + this.width, point.x),
			y2 = Math.max(this.y + this.height, point.y);
		return new Rectangle(x1, y1, x2 - x1, y2 - y1);
	},

	expand: function() {
		var amount = Size.read(arguments),
			hor = amount.width,
			ver = amount.height;
		return new Rectangle(this.x - hor / 2, this.y - ver / 2,
				this.width + hor, this.height + ver);
	},

	scale: function(hor, ver) {
		return this.expand(this.width * hor - this.width,
				this.height * (ver === undefined ? hor : ver) - this.height);
	}
}, Base.each([
		['Top', 'Left'], ['Top', 'Right'],
		['Bottom', 'Left'], ['Bottom', 'Right'],
		['Left', 'Center'], ['Top', 'Center'],
		['Right', 'Center'], ['Bottom', 'Center']
	],
	function(parts, index) {
		var part = parts.join(''),
			xFirst = /^[RL]/.test(part);
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
		this[get] = function(_dontLink) {
			var ctor = _dontLink ? Point : LinkedPoint;
			return new ctor(this[getX](), this[getY](), this, set);
		};
		this[set] = function() {
			var point = Point.read(arguments);
			this[setX](point.x);
			this[setY](point.y);
		};
	}, {
		beans: true
	}
));

var LinkedRectangle = Rectangle.extend({
	initialize: function Rectangle(x, y, width, height, owner, setter) {
		this._set(x, y, width, height, true);
		this._owner = owner;
		this._setter = setter;
	},

	_set: function(x, y, width, height, _dontNotify) {
		this._x = x;
		this._y = y;
		this._width = width;
		this._height = height;
		if (!_dontNotify)
			this._owner[this._setter](this);
		return this;
	}
},
new function() {
	var proto = Rectangle.prototype;

	return Base.each(['x', 'y', 'width', 'height'], function(key) {
		var part = Base.capitalize(key),
			internal = '_' + key;
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
			this[name] = function() {
				this._dontNotify = true;
				proto[name].apply(this, arguments);
				this._dontNotify = false;
				this._owner[this._setter](this);
			};
		}, {
			isSelected: function() {
				return !!(this._owner._selection & 2);
			},

			setSelected: function(selected) {
				var owner = this._owner;
				if (owner._changeSelection) {
					owner._changeSelection(2, selected);
				}
			}
		})
	);
});

var Matrix = Base.extend({
	_class: 'Matrix',

	initialize: function Matrix(arg, _dontNotify) {
		var count = arguments.length,
			ok = true;
		if (count >= 6) {
			this._set.apply(this, arguments);
		} else if (count === 1 || count === 2) {
			if (arg instanceof Matrix) {
				this._set(arg._a, arg._b, arg._c, arg._d, arg._tx, arg._ty,
						_dontNotify);
			} else if (Array.isArray(arg)) {
				this._set.apply(this,
						_dontNotify ? arg.concat([_dontNotify]) : arg);
			} else {
				ok = false;
			}
		} else if (!count) {
			this.reset();
		} else {
			ok = false;
		}
		if (!ok) {
			throw new Error('Unsupported matrix parameters');
		}
		return this;
	},

	set: '#initialize',

	_set: function(a, b, c, d, tx, ty, _dontNotify) {
		this._a = a;
		this._b = b;
		this._c = c;
		this._d = d;
		this._tx = tx;
		this._ty = ty;
		if (!_dontNotify)
			this._changed();
		return this;
	},

	_serialize: function(options, dictionary) {
		return Base.serialize(this.getValues(), options, true, dictionary);
	},

	_changed: function() {
		var owner = this._owner;
		if (owner) {
			if (owner._applyMatrix) {
				owner.transform(null, true);
			} else {
				owner._changed(25);
			}
		}
	},

	clone: function() {
		return new Matrix(this._a, this._b, this._c, this._d,
				this._tx, this._ty);
	},

	equals: function(mx) {
		return mx === this || mx && this._a === mx._a && this._b === mx._b
				&& this._c === mx._c && this._d === mx._d
				&& this._tx === mx._tx && this._ty === mx._ty;
	},

	toString: function() {
		var f = Formatter.instance;
		return '[[' + [f.number(this._a), f.number(this._c),
					f.number(this._tx)].join(', ') + '], ['
				+ [f.number(this._b), f.number(this._d),
					f.number(this._ty)].join(', ') + ']]';
	},

	reset: function(_dontNotify) {
		this._a = this._d = 1;
		this._b = this._c = this._tx = this._ty = 0;
		if (!_dontNotify)
			this._changed();
		return this;
	},

	apply: function(recursively, _setApplyMatrix) {
		var owner = this._owner;
		if (owner) {
			owner.transform(null, true, Base.pick(recursively, true),
					_setApplyMatrix);
			return this.isIdentity();
		}
		return false;
	},

	translate: function() {
		var point = Point.read(arguments),
			x = point.x,
			y = point.y;
		this._tx += x * this._a + y * this._c;
		this._ty += x * this._b + y * this._d;
		this._changed();
		return this;
	},

	scale: function() {
		var scale = Point.read(arguments),
			center = Point.read(arguments, 0, { readNull: true });
		if (center)
			this.translate(center);
		this._a *= scale.x;
		this._b *= scale.x;
		this._c *= scale.y;
		this._d *= scale.y;
		if (center)
			this.translate(center.negate());
		this._changed();
		return this;
	},

	rotate: function(angle ) {
		angle *= Math.PI / 180;
		var center = Point.read(arguments, 1),
			x = center.x,
			y = center.y,
			cos = Math.cos(angle),
			sin = Math.sin(angle),
			tx = x - x * cos + y * sin,
			ty = y - x * sin - y * cos,
			a = this._a,
			b = this._b,
			c = this._c,
			d = this._d;
		this._a = cos * a + sin * c;
		this._b = cos * b + sin * d;
		this._c = -sin * a + cos * c;
		this._d = -sin * b + cos * d;
		this._tx += tx * a + ty * c;
		this._ty += tx * b + ty * d;
		this._changed();
		return this;
	},

	shear: function() {
		var shear = Point.read(arguments),
			center = Point.read(arguments, 0, { readNull: true });
		if (center)
			this.translate(center);
		var a = this._a,
			b = this._b;
		this._a += shear.y * this._c;
		this._b += shear.y * this._d;
		this._c += shear.x * a;
		this._d += shear.x * b;
		if (center)
			this.translate(center.negate());
		this._changed();
		return this;
	},

	skew: function() {
		var skew = Point.read(arguments),
			center = Point.read(arguments, 0, { readNull: true }),
			toRadians = Math.PI / 180,
			shear = new Point(Math.tan(skew.x * toRadians),
				Math.tan(skew.y * toRadians));
		return this.shear(shear, center);
	},

	append: function(mx, _dontNotify) {
		if (mx) {
			var a1 = this._a,
				b1 = this._b,
				c1 = this._c,
				d1 = this._d,
				a2 = mx._a,
				b2 = mx._c,
				c2 = mx._b,
				d2 = mx._d,
				tx2 = mx._tx,
				ty2 = mx._ty;
			this._a = a2 * a1 + c2 * c1;
			this._c = b2 * a1 + d2 * c1;
			this._b = a2 * b1 + c2 * d1;
			this._d = b2 * b1 + d2 * d1;
			this._tx += tx2 * a1 + ty2 * c1;
			this._ty += tx2 * b1 + ty2 * d1;
			if (!_dontNotify)
				this._changed();
		}
		return this;
	},

	prepend: function(mx, _dontNotify) {
		if (mx) {
			var a1 = this._a,
				b1 = this._b,
				c1 = this._c,
				d1 = this._d,
				tx1 = this._tx,
				ty1 = this._ty,
				a2 = mx._a,
				b2 = mx._c,
				c2 = mx._b,
				d2 = mx._d,
				tx2 = mx._tx,
				ty2 = mx._ty;
			this._a = a2 * a1 + b2 * b1;
			this._c = a2 * c1 + b2 * d1;
			this._b = c2 * a1 + d2 * b1;
			this._d = c2 * c1 + d2 * d1;
			this._tx = a2 * tx1 + b2 * ty1 + tx2;
			this._ty = c2 * tx1 + d2 * ty1 + ty2;
			if (!_dontNotify)
				this._changed();
		}
		return this;
	},

	appended: function(mx) {
		return this.clone().append(mx);
	},

	prepended: function(mx) {
		return this.clone().prepend(mx);
	},

	invert: function() {
		var a = this._a,
			b = this._b,
			c = this._c,
			d = this._d,
			tx = this._tx,
			ty = this._ty,
			det = a * d - b * c,
			res = null;
		if (det && !isNaN(det) && isFinite(tx) && isFinite(ty)) {
			this._a = d / det;
			this._b = -b / det;
			this._c = -c / det;
			this._d = a / det;
			this._tx = (c * ty - d * tx) / det;
			this._ty = (b * tx - a * ty) / det;
			res = this;
		}
		return res;
	},

	inverted: function() {
		return this.clone().invert();
	},

	concatenate: '#append',
	preConcatenate: '#prepend',
	chain: '#appended',

	_shiftless: function() {
		return new Matrix(this._a, this._b, this._c, this._d, 0, 0);
	},

	_orNullIfIdentity: function() {
		return this.isIdentity() ? null : this;
	},

	isIdentity: function() {
		return this._a === 1 && this._b === 0 && this._c === 0 && this._d === 1
				&& this._tx === 0 && this._ty === 0;
	},

	isInvertible: function() {
		var det = this._a * this._d - this._c * this._b;
		return det && !isNaN(det) && isFinite(this._tx) && isFinite(this._ty);
	},

	isSingular: function() {
		return !this.isInvertible();
	},

	transform: function( src, dst, count) {
		return arguments.length < 3
			? this._transformPoint(Point.read(arguments))
			: this._transformCoordinates(src, dst, count);
	},

	_transformPoint: function(point, dest, _dontNotify) {
		var x = point.x,
			y = point.y;
		if (!dest)
			dest = new Point();
		return dest._set(
				x * this._a + y * this._c + this._tx,
				x * this._b + y * this._d + this._ty,
				_dontNotify);
	},

	_transformCoordinates: function(src, dst, count) {
		for (var i = 0, max = 2 * count; i < max; i += 2) {
			var x = src[i],
				y = src[i + 1];
			dst[i] = x * this._a + y * this._c + this._tx;
			dst[i + 1] = x * this._b + y * this._d + this._ty;
		}
		return dst;
	},

	_transformCorners: function(rect) {
		var x1 = rect.x,
			y1 = rect.y,
			x2 = x1 + rect.width,
			y2 = y1 + rect.height,
			coords = [ x1, y1, x2, y1, x2, y2, x1, y2 ];
		return this._transformCoordinates(coords, coords, 4);
	},

	_transformBounds: function(bounds, dest, _dontNotify) {
		var coords = this._transformCorners(bounds),
			min = coords.slice(0, 2),
			max = min.slice();
		for (var i = 2; i < 8; i++) {
			var val = coords[i],
				j = i & 1;
			if (val < min[j]) {
				min[j] = val;
			} else if (val > max[j]) {
				max[j] = val;
			}
		}
		if (!dest)
			dest = new Rectangle();
		return dest._set(min[0], min[1], max[0] - min[0], max[1] - min[1],
				_dontNotify);
	},

	inverseTransform: function() {
		return this._inverseTransform(Point.read(arguments));
	},

	_inverseTransform: function(point, dest, _dontNotify) {
		var a = this._a,
			b = this._b,
			c = this._c,
			d = this._d,
			tx = this._tx,
			ty = this._ty,
			det = a * d - b * c,
			res = null;
		if (det && !isNaN(det) && isFinite(tx) && isFinite(ty)) {
			var x = point.x - this._tx,
				y = point.y - this._ty;
			if (!dest)
				dest = new Point();
			res = dest._set(
					(x * d - y * c) / det,
					(y * a - x * b) / det,
					_dontNotify);
		}
		return res;
	},

	decompose: function() {
		var a = this._a,
			b = this._b,
			c = this._c,
			d = this._d,
			det = a * d - b * c,
			sqrt = Math.sqrt,
			atan2 = Math.atan2,
			degrees = 180 / Math.PI,
			rotate,
			scale,
			skew;
		if (a !== 0 || b !== 0) {
			var r = sqrt(a * a + b * b);
			rotate = Math.acos(a / r) * (b > 0 ? 1 : -1);
			scale = [r, det / r];
			skew = [atan2(a * c + b * d, r * r), 0];
		} else if (c !== 0 || d !== 0) {
			var s = sqrt(c * c + d * d);
			rotate = Math.asin(c / s)  * (d > 0 ? 1 : -1);
			scale = [det / s, s];
			skew = [0, atan2(a * c + b * d, s * s)];
		} else {
			rotate = 0;
			skew = scale = [0, 0];
		}
		return {
			translation: this.getTranslation(),
			rotation: rotate * degrees,
			scaling: new Point(scale),
			skewing: new Point(skew[0] * degrees, skew[1] * degrees)
		};
	},

	getValues: function() {
		return [ this._a, this._b, this._c, this._d, this._tx, this._ty ];
	},

	getTranslation: function() {
		return new Point(this._tx, this._ty);
	},

	getScaling: function() {
		return this.decompose().scaling;
	},

	getRotation: function() {
		return this.decompose().rotation;
	},

	applyToContext: function(ctx) {
		if (!this.isIdentity()) {
			ctx.transform(this._a, this._b, this._c, this._d,
					this._tx, this._ty);
		}
	}
}, Base.each(['a', 'b', 'c', 'd', 'tx', 'ty'], function(key) {
	var part = Base.capitalize(key),
		prop = '_' + key;
	this['get' + part] = function() {
		return this[prop];
	};
	this['set' + part] = function(value) {
		this[prop] = value;
		this._changed();
	};
}, {}));

var Line = Base.extend({
	_class: 'Line',

	initialize: function Line(arg0, arg1, arg2, arg3, arg4) {
		var asVector = false;
		if (arguments.length >= 4) {
			this._px = arg0;
			this._py = arg1;
			this._vx = arg2;
			this._vy = arg3;
			asVector = arg4;
		} else {
			this._px = arg0.x;
			this._py = arg0.y;
			this._vx = arg1.x;
			this._vy = arg1.y;
			asVector = arg2;
		}
		if (!asVector) {
			this._vx -= this._px;
			this._vy -= this._py;
		}
	},

	getPoint: function() {
		return new Point(this._px, this._py);
	},

	getVector: function() {
		return new Point(this._vx, this._vy);
	},

	getLength: function() {
		return this.getVector().getLength();
	},

	intersect: function(line, isInfinite) {
		return Line.intersect(
				this._px, this._py, this._vx, this._vy,
				line._px, line._py, line._vx, line._vy,
				true, isInfinite);
	},

	getSide: function(point, isInfinite) {
		return Line.getSide(
				this._px, this._py, this._vx, this._vy,
				point.x, point.y, true, isInfinite);
	},

	getDistance: function(point) {
		return Math.abs(this.getSignedDistance(point));
	},

	getSignedDistance: function(point) {
		return Line.getSignedDistance(this._px, this._py, this._vx, this._vy,
				point.x, point.y, true);
	},

	isCollinear: function(line) {
		return Point.isCollinear(this._vx, this._vy, line._vx, line._vy);
	},

	isOrthogonal: function(line) {
		return Point.isOrthogonal(this._vx, this._vy, line._vx, line._vy);
	},

	statics: {
		intersect: function(p1x, p1y, v1x, v1y, p2x, p2y, v2x, v2y, asVector,
				isInfinite) {
			if (!asVector) {
				v1x -= p1x;
				v1y -= p1y;
				v2x -= p2x;
				v2y -= p2y;
			}
			var cross = v1x * v2y - v1y * v2x;
			if (!Numerical.isZero(cross)) {
				var dx = p1x - p2x,
					dy = p1y - p2y,
					u1 = (v2x * dy - v2y * dx) / cross,
					u2 = (v1x * dy - v1y * dx) / cross,
					epsilon = 1e-12,
					uMin = -epsilon,
					uMax = 1 + epsilon;
				if (isInfinite
						|| uMin < u1 && u1 < uMax && uMin < u2 && u2 < uMax) {
					if (!isInfinite) {
						u1 = u1 <= 0 ? 0 : u1 >= 1 ? 1 : u1;
					}
					return new Point(
							p1x + u1 * v1x,
							p1y + u1 * v1y);
				}
			}
		},

		getSide: function(px, py, vx, vy, x, y, asVector, isInfinite) {
			if (!asVector) {
				vx -= px;
				vy -= py;
			}
			var v2x = x - px,
				v2y = y - py,
				ccw = v2x * vy - v2y * vx;
			if (!isInfinite && Numerical.isZero(ccw)) {
				ccw = (v2x * vx + v2x * vx) / (vx * vx + vy * vy);
				if (ccw >= 0 && ccw <= 1)
					ccw = 0;
			}
			return ccw < 0 ? -1 : ccw > 0 ? 1 : 0;
		},

		getSignedDistance: function(px, py, vx, vy, x, y, asVector) {
			if (!asVector) {
				vx -= px;
				vy -= py;
			}
			return vx === 0 ? vy > 0 ? x - px : px - x
				 : vy === 0 ? vx < 0 ? y - py : py - y
				 : ((x-px) * vy - (y-py) * vx) / Math.sqrt(vx * vx + vy * vy);
		},

		getDistance: function(px, py, vx, vy, x, y, asVector) {
			return Math.abs(
					Line.getSignedDistance(px, py, vx, vy, x, y, asVector));
		}
	}
});

var Project = PaperScopeItem.extend({
	_class: 'Project',
	_list: 'projects',
	_reference: 'project',
	_compactSerialize: true,

	initialize: function Project(element) {
		PaperScopeItem.call(this, true);
		this._children = [];
		this._namedChildren = {};
		this._activeLayer = null;
		this._currentStyle = new Style(null, null, this);
		this._view = View.create(this,
				element || CanvasProvider.getCanvas(1, 1));
		this._selectionItems = {};
		this._selectionCount = 0;
		this._updateVersion = 0;
	},

	_serialize: function(options, dictionary) {
		return Base.serialize(this._children, options, true, dictionary);
	},

	_changed: function(flags, item) {
		if (flags & 1) {
			var view = this._view;
			if (view) {
				view._needsUpdate = true;
				if (!view._requested && view._autoUpdate)
					view.requestUpdate();
			}
		}
		var changes = this._changes;
		if (changes && item) {
			var changesById = this._changesById,
				id = item._id,
				entry = changesById[id];
			if (entry) {
				entry.flags |= flags;
			} else {
				changes.push(changesById[id] = { item: item, flags: flags });
			}
		}
	},

	clear: function() {
		var children = this._children;
		for (var i = children.length - 1; i >= 0; i--)
			children[i].remove();
	},

	isEmpty: function() {
		return !this._children.length;
	},

	remove: function remove() {
		if (!remove.base.call(this))
			return false;
		if (this._view)
			this._view.remove();
		return true;
	},

	getView: function() {
		return this._view;
	},

	getCurrentStyle: function() {
		return this._currentStyle;
	},

	setCurrentStyle: function(style) {
		this._currentStyle.set(style);
	},

	getIndex: function() {
		return this._index;
	},

	getOptions: function() {
		return this._scope.settings;
	},

	getLayers: function() {
		return this._children;
	},

	getActiveLayer: function() {
		return this._activeLayer || new Layer({ project: this, insert: true });
	},

	getSymbolDefinitions: function() {
		var definitions = [],
			ids = {};
		this.getItems({
			class: SymbolItem,
			match: function(item) {
				var definition = item._definition,
					id = definition._id;
				if (!ids[id]) {
					ids[id] = true;
					definitions.push(definition);
				}
				return false;
			}
		});
		return definitions;
	},

	getSymbols: 'getSymbolDefinitions',

	getSelectedItems: function() {
		var selectionItems = this._selectionItems,
			items = [];
		for (var id in selectionItems) {
			var item = selectionItems[id],
				selection = item._selection;
			if ((selection & 1) && item.isInserted()) {
				items.push(item);
			} else if (!selection) {
				this._updateSelection(item);
			}
		}
		return items;
	},

	_updateSelection: function(item) {
		var id = item._id,
			selectionItems = this._selectionItems;
		if (item._selection) {
			if (selectionItems[id] !== item) {
				this._selectionCount++;
				selectionItems[id] = item;
			}
		} else if (selectionItems[id] === item) {
			this._selectionCount--;
			delete selectionItems[id];
		}
	},

	selectAll: function() {
		var children = this._children;
		for (var i = 0, l = children.length; i < l; i++)
			children[i].setFullySelected(true);
	},

	deselectAll: function() {
		var selectionItems = this._selectionItems;
		for (var i in selectionItems)
			selectionItems[i].setFullySelected(false);
	},

	addLayer: function(layer) {
		return this.insertLayer(undefined, layer);
	},

	insertLayer: function(index, layer) {
		if (layer instanceof Layer) {
			layer._remove(false, true);
			Base.splice(this._children, [layer], index, 0);
			layer._setProject(this, true);
			var name = layer._name;
			if (name)
				layer.setName(name);
			if (this._changes)
				layer._changed(5);
			if (!this._activeLayer)
				this._activeLayer = layer;
		} else {
			layer = null;
		}
		return layer;
	},

	_insertItem: function(index, item, _created) {
		item = this.insertLayer(index, item)
				|| (this._activeLayer || this._insertItem(undefined,
						new Layer(Item.NO_INSERT), true))
						.insertChild(index, item);
		if (_created && item.activate)
			item.activate();
		return item;
	},

	getItems: function(options) {
		return Item._getItems(this, options);
	},

	getItem: function(options) {
		return Item._getItems(this, options, null, null, true)[0] || null;
	},

	importJSON: function(json) {
		this.activate();
		var layer = this._activeLayer;
		return Base.importJSON(json, layer && layer.isEmpty() && layer);
	},

	removeOn: function(type) {
		var sets = this._removeSets;
		if (sets) {
			if (type === 'mouseup')
				sets.mousedrag = null;
			var set = sets[type];
			if (set) {
				for (var id in set) {
					var item = set[id];
					for (var key in sets) {
						var other = sets[key];
						if (other && other != set)
							delete other[item._id];
					}
					item.remove();
				}
				sets[type] = null;
			}
		}
	},

	draw: function(ctx, matrix, pixelRatio) {
		this._updateVersion++;
		ctx.save();
		matrix.applyToContext(ctx);
		var children = this._children,
			param = new Base({
				offset: new Point(0, 0),
				pixelRatio: pixelRatio,
				viewMatrix: matrix.isIdentity() ? null : matrix,
				matrices: [new Matrix()],
				updateMatrix: true
			});
		for (var i = 0, l = children.length; i < l; i++) {
			children[i].draw(ctx, param);
		}
		ctx.restore();

		if (this._selectionCount > 0) {
			ctx.save();
			ctx.strokeWidth = 1;
			var items = this._selectionItems,
				size = this._scope.settings.handleSize,
				version = this._updateVersion;
			for (var id in items) {
				items[id]._drawSelection(ctx, matrix, size, items, version);
			}
			ctx.restore();
		}
	}
});

var Item = Base.extend(Emitter, {
	statics: {
		extend: function extend(src) {
			if (src._serializeFields)
				src._serializeFields = Base.set({},
					this.prototype._serializeFields, src._serializeFields);
			return extend.base.apply(this, arguments);
		},

		NO_INSERT: { insert: false }
	},

	_class: 'Item',
	_name: null,
	_applyMatrix: true,
	_canApplyMatrix: true,
	_canScaleStroke: false,
	_pivot: null,
	_visible: true,
	_blendMode: 'normal',
	_opacity: 1,
	_locked: false,
	_guide: false,
	_clipMask: false,
	_selection: 0,
	_selectBounds: true,
	_selectChildren: false,
	_serializeFields: {
		name: null,
		applyMatrix: null,
		matrix: new Matrix(),
		pivot: null,
		visible: true,
		blendMode: 'normal',
		opacity: 1,
		locked: false,
		guide: false,
		clipMask: false,
		selected: false,
		data: {}
	},
	_prioritize: ['applyMatrix']
},
new function() {
	var handlers = ['onMouseDown', 'onMouseUp', 'onMouseDrag', 'onClick',
			'onDoubleClick', 'onMouseMove', 'onMouseEnter', 'onMouseLeave'];
	return Base.each(handlers,
		function(name) {
			this._events[name] = {
				install: function(type) {
					this.getView()._countItemEvent(type, 1);
				},

				uninstall: function(type) {
					this.getView()._countItemEvent(type, -1);
				}
			};
		}, {
			_events: {
				onFrame: {
					install: function() {
						this.getView()._animateItem(this, true);
					},

					uninstall: function() {
						this.getView()._animateItem(this, false);
					}
				},

				onLoad: {},
				onError: {}
			},
			statics: {
				_itemHandlers: handlers
			}
		}
	);
}, {
	initialize: function Item() {
	},

	_initialize: function(props, point) {
		var hasProps = props && Base.isPlainObject(props),
			internal = hasProps && props.internal === true,
			matrix = this._matrix = new Matrix(),
			project = hasProps && props.project || paper.project,
			settings = paper.settings;
		this._id = internal ? null : UID.get();
		this._parent = this._index = null;
		this._applyMatrix = this._canApplyMatrix && settings.applyMatrix;
		if (point)
			matrix.translate(point);
		matrix._owner = this;
		this._style = new Style(project._currentStyle, this, project);
		if (internal || hasProps && props.insert == false
			|| !settings.insertItems && !(hasProps && props.insert === true)) {
			this._setProject(project);
		} else {
			(hasProps && props.parent || project)
					._insertItem(undefined, this, true);
		}
		if (hasProps && props !== Item.NO_INSERT) {
			this.set(props, {
				internal: true, insert: true, project: true, parent: true
			});
		}
		return hasProps;
	},

	_serialize: function(options, dictionary) {
		var props = {},
			that = this;

		function serialize(fields) {
			for (var key in fields) {
				var value = that[key];
				if (!Base.equals(value, key === 'leading'
						? fields.fontSize * 1.2 : fields[key])) {
					props[key] = Base.serialize(value, options,
							key !== 'data', dictionary);
				}
			}
		}

		serialize(this._serializeFields);
		if (!(this instanceof Group))
			serialize(this._style._defaults);
		return [ this._class, props ];
	},

	_changed: function(flags) {
		var symbol = this._symbol,
			cacheParent = this._parent || symbol,
			project = this._project;
		if (flags & 8) {
			this._bounds = this._position = this._decomposed = undefined;
		}
		if (flags & 16) {
			this._globalMatrix = undefined;
		}
		if (cacheParent
				&& (flags & 72)) {
			Item._clearBoundsCache(cacheParent);
		}
		if (flags & 2) {
			Item._clearBoundsCache(this);
		}
		if (project)
			project._changed(flags, this);
		if (symbol)
			symbol._changed(flags);
	},

	getId: function() {
		return this._id;
	},

	getName: function() {
		return this._name;
	},

	setName: function(name) {

		if (this._name)
			this._removeNamed();
		if (name === (+name) + '')
			throw new Error(
					'Names consisting only of numbers are not supported.');
		var owner = this._getOwner();
		if (name && owner) {
			var children = owner._children,
				namedChildren = owner._namedChildren;
			(namedChildren[name] = namedChildren[name] || []).push(this);
			if (!(name in children))
				children[name] = this;
		}
		this._name = name || undefined;
		this._changed(256);
	},

	getStyle: function() {
		return this._style;
	},

	setStyle: function(style) {
		this.getStyle().set(style);
	}
}, Base.each(['locked', 'visible', 'blendMode', 'opacity', 'guide'],
	function(name) {
		var part = Base.capitalize(name),
			key = '_' + name,
			flags = {
				locked: 256,
				visible: 265
			};
		this['get' + part] = function() {
			return this[key];
		};
		this['set' + part] = function(value) {
			if (value != this[key]) {
				this[key] = value;
				this._changed(flags[name] || 257);
			}
		};
	},
{}), {
	beans: true,

	getSelection: function() {
		return this._selection;
	},

	setSelection: function(selection) {
		if (selection !== this._selection) {
			this._selection = selection;
			var project = this._project;
			if (project) {
				project._updateSelection(this);
				this._changed(257);
			}
		}
	},

	_changeSelection: function(flag, selected) {
		var selection = this._selection;
		this.setSelection(selected ? selection | flag : selection & ~flag);
	},

	isSelected: function() {
		if (this._selectChildren) {
			var children = this._children;
			for (var i = 0, l = children.length; i < l; i++)
				if (children[i].isSelected())
					return true;
		}
		return !!(this._selection & 1);
	},

	setSelected: function(selected) {
		if (this._selectChildren) {
			var children = this._children;
			for (var i = 0, l = children.length; i < l; i++)
				children[i].setSelected(selected);
		}
		this._changeSelection(1, selected);
	},

	isFullySelected: function() {
		var children = this._children,
			selected = !!(this._selection & 1);
		if (children && selected) {
			for (var i = 0, l = children.length; i < l; i++)
				if (!children[i].isFullySelected())
					return false;
			return true;
		}
		return selected;
	},

	setFullySelected: function(selected) {
		var children = this._children;
		if (children) {
			for (var i = 0, l = children.length; i < l; i++)
				children[i].setFullySelected(selected);
		}
		this._changeSelection(1, selected);
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
			this._changed(257);
			if (this._parent)
				this._parent._changed(2048);
		}
	},

	getData: function() {
		if (!this._data)
			this._data = {};
		return this._data;
	},

	setData: function(data) {
		this._data = data;
	},

	getPosition: function(_dontLink) {
		var ctor = _dontLink ? Point : LinkedPoint;
		var position = this._position ||
			(this._position = this._getPositionFromBounds());
		return new ctor(position.x, position.y, this, 'setPosition');
	},

	setPosition: function() {
		this.translate(Point.read(arguments).subtract(this.getPosition(true)));
	},

	_getPositionFromBounds: function(bounds) {
		return this._pivot
				? this._matrix._transformPoint(this._pivot)
				: (bounds || this.getBounds()).getCenter(true);
	},

	getPivot: function() {
		var pivot = this._pivot;
		return pivot
				? new LinkedPoint(pivot.x, pivot.y, this, 'setPivot')
				: null;
	},

	setPivot: function() {
		this._pivot = Point.read(arguments, 0, { clone: true, readNull: true });
		this._position = undefined;
	}
}, Base.each({
		getStrokeBounds: { stroke: true },
		getHandleBounds: { handle: true },
		getInternalBounds: { internal: true }
	},
	function(options, key) {
		this[key] = function(matrix) {
			return this.getBounds(matrix, options);
		};
	},
{
	beans: true,

	getBounds: function(matrix, options) {
		var hasMatrix = options || matrix instanceof Matrix,
			opts = Base.set({}, hasMatrix ? options : matrix,
					this._boundsOptions);
		if (!opts.stroke || this.getStrokeScaling())
			opts.cacheItem = this;
		var rect = this._getCachedBounds(hasMatrix && matrix, opts).rect;
		return !arguments.length
				? new LinkedRectangle(rect.x, rect.y, rect.width, rect.height,
					this, 'setBounds')
				: rect;
	},

	setBounds: function() {
		var rect = Rectangle.read(arguments),
			bounds = this.getBounds(),
			_matrix = this._matrix,
			matrix = new Matrix(),
			center = rect.getCenter();
		matrix.translate(center);
		if (rect.width != bounds.width || rect.height != bounds.height) {
			if (!_matrix.isInvertible()) {
				_matrix.set(_matrix._backup
						|| new Matrix().translate(_matrix.getTranslation()));
				bounds = this.getBounds();
			}
			matrix.scale(
					bounds.width !== 0 ? rect.width / bounds.width : 0,
					bounds.height !== 0 ? rect.height / bounds.height : 0);
		}
		center = bounds.getCenter();
		matrix.translate(-center.x, -center.y);
		this.transform(matrix);
	},

	_getBounds: function(matrix, options) {
		var children = this._children;
		if (!children || !children.length)
			return new Rectangle();
		Item._updateBoundsCache(this, options.cacheItem);
		return Item._getBounds(children, matrix, options);
	},

	_getBoundsCacheKey: function(options, internal) {
		return [
			options.stroke ? 1 : 0,
			options.handle ? 1 : 0,
			internal ? 1 : 0
		].join('');
	},

	_getCachedBounds: function(matrix, options, noInternal) {
		matrix = matrix && matrix._orNullIfIdentity();
		var internal = options.internal && !noInternal,
			cacheItem = options.cacheItem,
			_matrix = internal ? null : this._matrix._orNullIfIdentity(),
			cacheKey = cacheItem && (!matrix || matrix.equals(_matrix))
				&& this._getBoundsCacheKey(options, internal),
			bounds = this._bounds;
		Item._updateBoundsCache(this._parent || this._symbol, cacheItem);
		if (cacheKey && bounds && cacheKey in bounds) {
			var cached = bounds[cacheKey];
			return {
				rect: cached.rect.clone(),
				nonscaling: cached.nonscaling
			};
		}
		var res = this._getBounds(matrix || _matrix, options),
			rect = res.rect || res,
			style = this._style,
			nonscaling = res.nonscaling || style.hasStroke()
				&& !style.getStrokeScaling();
		if (cacheKey) {
			if (!bounds) {
				this._bounds = bounds = {};
			}
			var cached = bounds[cacheKey] = {
				rect: rect.clone(),
				nonscaling: nonscaling,
				internal: internal
			};
		}
		return {
			rect: rect,
			nonscaling: nonscaling
		};
	},

	_getStrokeMatrix: function(matrix, options) {
		var parent = this.getStrokeScaling() ? null
				: options && options.internal ? this
					: this._parent || this._symbol && this._symbol._item,
			mx = parent ? parent.getViewMatrix().invert() : matrix;
		return mx && mx._shiftless();
	},

	statics: {
		_updateBoundsCache: function(parent, item) {
			if (parent && item) {
				var id = item._id,
					ref = parent._boundsCache = parent._boundsCache || {
						ids: {},
						list: []
					};
				if (!ref.ids[id]) {
					ref.list.push(item);
					ref.ids[id] = item;
				}
			}
		},

		_clearBoundsCache: function(item) {
			var cache = item._boundsCache;
			if (cache) {
				item._bounds = item._position = item._boundsCache = undefined;
				for (var i = 0, list = cache.list, l = list.length; i < l; i++){
					var other = list[i];
					if (other !== item) {
						other._bounds = other._position = undefined;
						if (other._boundsCache)
							Item._clearBoundsCache(other);
					}
				}
			}
		},

		_getBounds: function(items, matrix, options) {
			var x1 = Infinity,
				x2 = -x1,
				y1 = x1,
				y2 = x2,
				nonscaling = false;
			options = options || {};
			for (var i = 0, l = items.length; i < l; i++) {
				var item = items[i];
				if (item._visible && !item.isEmpty()) {
					var bounds = item._getCachedBounds(
						matrix && matrix.appended(item._matrix), options, true),
						rect = bounds.rect;
					x1 = Math.min(rect.x, x1);
					y1 = Math.min(rect.y, y1);
					x2 = Math.max(rect.x + rect.width, x2);
					y2 = Math.max(rect.y + rect.height, y2);
					if (bounds.nonscaling)
						nonscaling = true;
				}
			}
			return {
				rect: isFinite(x1)
					? new Rectangle(x1, y1, x2 - x1, y2 - y1)
					: new Rectangle(),
				nonscaling: nonscaling
			};
		}
	}

}), {
	beans: true,

	_decompose: function() {
		return this._applyMatrix
			? null
			: this._decomposed || (this._decomposed = this._matrix.decompose());
	},

	getRotation: function() {
		var decomposed = this._decompose();
		return decomposed ? decomposed.rotation : 0;
	},

	setRotation: function(rotation) {
		var current = this.getRotation();
		if (current != null && rotation != null) {
			var decomposed = this._decomposed;
			this.rotate(rotation - current);
			if (decomposed) {
				decomposed.rotation = rotation;
				this._decomposed = decomposed;
			}
		}
	},

	getScaling: function() {
		var decomposed = this._decompose(),
			s = decomposed && decomposed.scaling;
		return new LinkedPoint(s ? s.x : 1, s ? s.y : 1, this, 'setScaling');
	},

	setScaling: function() {
		var current = this.getScaling(),
			scaling = Point.read(arguments, 0, { clone: true, readNull: true });
		if (current && scaling && !current.equals(scaling)) {
			var rotation = this.getRotation(),
				decomposed = this._decomposed,
				matrix = new Matrix(),
				center = this.getPosition(true);
			matrix.translate(center);
			if (rotation)
				matrix.rotate(rotation);
			matrix.scale(scaling.x / current.x, scaling.y / current.y);
			if (rotation)
				matrix.rotate(-rotation);
			matrix.translate(center.negate());
			this.transform(matrix);
			if (decomposed) {
				decomposed.scaling = scaling;
				this._decomposed = decomposed;
			}
		}
	},

	getMatrix: function() {
		return this._matrix;
	},

	setMatrix: function() {
		var matrix = this._matrix;
		matrix.initialize.apply(matrix, arguments);
	},

	getGlobalMatrix: function(_dontClone) {
		var matrix = this._globalMatrix;
		if (matrix) {
			var parent = this._parent;
			var parents = [];
			while (parent) {
				if (!parent._globalMatrix) {
					matrix = null;
					for (var i = 0, l = parents.length; i < l; i++) {
						parents[i]._globalMatrix = null;
					}
					break;
				}
				parents.push(parent);
				parent = parent._parent;
			}
		}
		if (!matrix) {
			matrix = this._globalMatrix = this._matrix.clone();
			var parent = this._parent;
			if (parent)
				matrix.prepend(parent.getGlobalMatrix(true));
		}
		return _dontClone ? matrix : matrix.clone();
	},

	getViewMatrix: function() {
		return this.getGlobalMatrix().prepend(this.getView()._matrix);
	},

	getApplyMatrix: function() {
		return this._applyMatrix;
	},

	setApplyMatrix: function(apply) {
		if (this._applyMatrix = this._canApplyMatrix && !!apply)
			this.transform(null, true);
	},

	getTransformContent: '#getApplyMatrix',
	setTransformContent: '#setApplyMatrix',
}, {
	getProject: function() {
		return this._project;
	},

	_setProject: function(project, installEvents) {
		if (this._project !== project) {
			if (this._project)
				this._installEvents(false);
			this._project = project;
			var children = this._children;
			for (var i = 0, l = children && children.length; i < l; i++)
				children[i]._setProject(project);
			installEvents = true;
		}
		if (installEvents)
			this._installEvents(true);
	},

	getView: function() {
		return this._project._view;
	},

	_installEvents: function _installEvents(install) {
		_installEvents.base.call(this, install);
		var children = this._children;
		for (var i = 0, l = children && children.length; i < l; i++)
			children[i]._installEvents(install);
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

	setParent: function(item) {
		return item.addChild(this);
	},

	_getOwner: '#getParent',

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
		var owner = this._getOwner();
		return owner && owner._children[this._index + 1] || null;
	},

	getPreviousSibling: function() {
		var owner = this._getOwner();
		return owner && owner._children[this._index - 1] || null;
	},

	getIndex: function() {
		return this._index;
	},

	equals: function(item) {
		return item === this || item && this._class === item._class
				&& this._style.equals(item._style)
				&& this._matrix.equals(item._matrix)
				&& this._locked === item._locked
				&& this._visible === item._visible
				&& this._blendMode === item._blendMode
				&& this._opacity === item._opacity
				&& this._clipMask === item._clipMask
				&& this._guide === item._guide
				&& this._equals(item)
				|| false;
	},

	_equals: function(item) {
		return Base.equals(this._children, item._children);
	},

	clone: function(options) {
		var copy = new this.constructor(Item.NO_INSERT),
			children = this._children,
			insert = Base.pick(options ? options.insert : undefined,
					options === undefined || options === true),
			deep = Base.pick(options ? options.deep : undefined, true);
		if (children)
			copy.copyAttributes(this);
		if (!children || deep)
			copy.copyContent(this);
		if (!children)
			copy.copyAttributes(this);
		if (insert)
			copy.insertAbove(this);
		var name = this._name,
			parent = this._parent;
		if (name && parent) {
			var children = parent._children,
				orig = name,
				i = 1;
			while (children[name])
				name = orig + ' ' + (i++);
			if (name !== orig)
				copy.setName(name);
		}
		return copy;
	},

	copyContent: function(source) {
		var children = source._children;
		for (var i = 0, l = children && children.length; i < l; i++) {
			this.addChild(children[i].clone(false), true);
		}
	},

	copyAttributes: function(source, excludeMatrix) {
		this.setStyle(source._style);
		var keys = ['_locked', '_visible', '_blendMode', '_opacity',
				'_clipMask', '_guide'];
		for (var i = 0, l = keys.length; i < l; i++) {
			var key = keys[i];
			if (source.hasOwnProperty(key))
				this[key] = source[key];
		}
		if (!excludeMatrix)
			this._matrix.set(source._matrix, true);
		this.setApplyMatrix(source._applyMatrix);
		this.setPivot(source._pivot);
		this.setSelection(source._selection);
		var data = source._data,
			name = source._name;
		this._data = data ? Base.clone(data) : null;
		if (name)
			this.setName(name);
	},

	rasterize: function(resolution, insert) {
		var bounds = this.getStrokeBounds(),
			scale = (resolution || this.getView().getResolution()) / 72,
			topLeft = bounds.getTopLeft().floor(),
			bottomRight = bounds.getBottomRight().ceil(),
			size = new Size(bottomRight.subtract(topLeft)),
			raster = new Raster(Item.NO_INSERT);
		if (!size.isZero()) {
			var canvas = CanvasProvider.getCanvas(size.multiply(scale)),
				ctx = canvas.getContext('2d'),
				matrix = new Matrix().scale(scale).translate(topLeft.negate());
			ctx.save();
			matrix.applyToContext(ctx);
			this.draw(ctx, new Base({ matrices: [matrix] }));
			ctx.restore();
			raster.setCanvas(canvas);
		}
		raster.transform(new Matrix().translate(topLeft.add(size.divide(2)))
				.scale(1 / scale));
		if (insert === undefined || insert)
			raster.insertAbove(this);
		return raster;
	},

	contains: function() {
		return !!this._contains(
				this._matrix._inverseTransform(Point.read(arguments)));
	},

	_contains: function(point) {
		var children = this._children;
		if (children) {
			for (var i = children.length - 1; i >= 0; i--) {
				if (children[i].contains(point))
					return true;
			}
			return false;
		}
		return point.isInside(this.getInternalBounds());
	},

	isInside: function() {
		return Rectangle.read(arguments).contains(this.getBounds());
	},

	_asPathItem: function() {
		return new Path.Rectangle({
			rectangle: this.getInternalBounds(),
			matrix: this._matrix,
			insert: false,
		});
	},

	intersects: function(item, _matrix) {
		if (!(item instanceof Item))
			return false;
		return this._asPathItem().getIntersections(item._asPathItem(), null,
				_matrix, true).length > 0;
	}
},
new function() {
	function hitTest() {
		return this._hitTest(
				Point.read(arguments),
				HitResult.getOptions(arguments));
	}

	function hitTestAll() {
		var point = Point.read(arguments),
			options = HitResult.getOptions(arguments),
			all = [];
		this._hitTest(point, Base.set({ all: all }, options));
		return all;
	}

	function hitTestChildren(point, options, viewMatrix, _exclude) {
		var children = this._children;
		if (children) {
			for (var i = children.length - 1; i >= 0; i--) {
				var child = children[i];
				var res = child !== _exclude && child._hitTest(point, options,
						viewMatrix);
				if (res && !options.all)
					return res;
			}
		}
		return null;
	}

	Project.inject({
		hitTest: hitTest,
		hitTestAll: hitTestAll,
		_hitTest: hitTestChildren
	});

	return {
		hitTest: hitTest,
		hitTestAll: hitTestAll,
		_hitTestChildren: hitTestChildren,
	};
}, {

	_hitTest: function(point, options, parentViewMatrix) {
		if (this._locked || !this._visible || this._guide && !options.guides
				|| this.isEmpty()) {
			return null;
		}

		var matrix = this._matrix,
			viewMatrix = parentViewMatrix
					? parentViewMatrix.appended(matrix)
					: this.getGlobalMatrix().prepend(this.getView()._matrix),
			tolerance = Math.max(options.tolerance, 1e-12),
			tolerancePadding = options._tolerancePadding = new Size(
					Path._getStrokePadding(tolerance,
						matrix._shiftless().invert()));
		point = matrix._inverseTransform(point);
		if (!point || !this._children &&
			!this.getBounds({ internal: true, stroke: true, handle: true })
				.expand(tolerancePadding.multiply(2))._containsPoint(point)) {
			return null;
		}

		var checkSelf = !(options.guides && !this._guide
				|| options.selected && !this.isSelected()
				|| options.type && options.type !== Base.hyphenate(this._class)
				|| options.class && !(this instanceof options.class)),
			match = options.match,
			that = this,
			bounds,
			res;

		function filter(hit) {
			if (hit && match && !match(hit))
				hit = null;
			if (hit && options.all)
				options.all.push(hit);
			return hit;
		}

		function checkPoint(type, part) {
			var pt = part ? bounds['get' + part]() : that.getPosition();
			if (point.subtract(pt).divide(tolerancePadding).length <= 1) {
				return new HitResult(type, that, {
					name: part ? Base.hyphenate(part) : type,
					point: pt
				});
			}
		}

		var checkPosition = options.position,
			checkCenter = options.center,
			checkBounds = options.bounds;
		if (checkSelf && this._parent
				&& (checkPosition || checkCenter || checkBounds)) {
			if (checkCenter || checkBounds) {
				bounds = this.getInternalBounds();
			}
			res = checkPosition && checkPoint('position') ||
					checkCenter && checkPoint('center', 'Center');
			if (!res && checkBounds) {
				var points = [
					'TopLeft', 'TopRight', 'BottomLeft', 'BottomRight',
					'LeftCenter', 'TopCenter', 'RightCenter', 'BottomCenter'
				];
				for (var i = 0; i < 8 && !res; i++) {
					res = checkPoint('bounds', points[i]);
				}
			}
			res = filter(res);
		}

		if (!res) {
			res = this._hitTestChildren(point, options, viewMatrix)
				|| checkSelf
					&& filter(this._hitTestSelf(point, options, viewMatrix,
						this.getStrokeScaling() ? null
							: viewMatrix._shiftless().invert()))
				|| null;
		}
		if (res && res.point) {
			res.point = matrix.transform(res.point);
		}
		return res;
	},

	_hitTestSelf: function(point, options) {
		if (options.fill && this.hasFill() && this._contains(point))
			return new HitResult('fill', this);
	},

	matches: function(name, compare) {
		function matchObject(obj1, obj2) {
			for (var i in obj1) {
				if (obj1.hasOwnProperty(i)) {
					var val1 = obj1[i],
						val2 = obj2[i];
					if (Base.isPlainObject(val1) && Base.isPlainObject(val2)) {
						if (!matchObject(val1, val2))
							return false;
					} else if (!Base.equals(val1, val2)) {
						return false;
					}
				}
			}
			return true;
		}
		var type = typeof name;
		if (type === 'object') {
			for (var key in name) {
				if (name.hasOwnProperty(key) && !this.matches(key, name[key]))
					return false;
			}
			return true;
		} else if (type === 'function') {
			return name(this);
		} else if (name === 'match') {
			return compare(this);
		} else {
			var value = /^(empty|editable)$/.test(name)
					? this['is' + Base.capitalize(name)]()
					: name === 'type'
						? Base.hyphenate(this._class)
						: this[name];
			if (name === 'class') {
				if (typeof compare === 'function')
					return this instanceof compare;
				value = this._class;
			}
			if (typeof compare === 'function') {
				return !!compare(value);
			} else if (compare) {
				if (compare.test) {
					return compare.test(value);
				} else if (Base.isPlainObject(compare)) {
					return matchObject(compare, value);
				}
			}
			return Base.equals(value, compare);
		}
	},

	getItems: function(options) {
		return Item._getItems(this, options, this._matrix);
	},

	getItem: function(options) {
		return Item._getItems(this, options, this._matrix, null, true)[0]
				|| null;
	},

	statics: {
		_getItems: function _getItems(item, options, matrix, param, firstOnly) {
			if (!param) {
				var obj = typeof options === 'object' && options,
					overlapping = obj && obj.overlapping,
					inside = obj && obj.inside,
					bounds = overlapping || inside,
					rect = bounds && Rectangle.read([bounds]);
				param = {
					items: [],
					recursive: obj && obj.recursive !== false,
					inside: !!inside,
					overlapping: !!overlapping,
					rect: rect,
					path: overlapping && new Path.Rectangle({
						rectangle: rect,
						insert: false
					})
				};
				if (obj) {
					options = Base.filter({}, options, {
						recursive: true, inside: true, overlapping: true
					});
				}
			}
			var children = item._children,
				items = param.items,
				rect = param.rect;
			matrix = rect && (matrix || new Matrix());
			for (var i = 0, l = children && children.length; i < l; i++) {
				var child = children[i],
					childMatrix = matrix && matrix.appended(child._matrix),
					add = true;
				if (rect) {
					var bounds = child.getBounds(childMatrix);
					if (!rect.intersects(bounds))
						continue;
					if (!(rect.contains(bounds)
							|| param.overlapping && (bounds.contains(rect)
								|| param.path.intersects(child, childMatrix))))
						add = false;
				}
				if (add && child.matches(options)) {
					items.push(child);
					if (firstOnly)
						break;
				}
				if (param.recursive !== false) {
					_getItems(child, options, childMatrix, param, firstOnly);
				}
				if (firstOnly && items.length > 0)
					break;
			}
			return items;
		}
	}
}, {

	importJSON: function(json) {
		var res = Base.importJSON(json, this);
		return res !== this ? this.addChild(res) : res;
	},

	addChild: function(item) {
		return this.insertChild(undefined, item);
	},

	insertChild: function(index, item) {
		var res = item ? this.insertChildren(index, [item]) : null;
		return res && res[0];
	},

	addChildren: function(items) {
		return this.insertChildren(this._children.length, items);
	},

	insertChildren: function(index, items) {
		var children = this._children;
		if (children && items && items.length > 0) {
			items = Base.slice(items);
			var inserted = {};
			for (var i = items.length - 1; i >= 0; i--) {
				var item = items[i],
					id = item && item._id;
				if (!item || inserted[id]) {
					items.splice(i, 1);
				} else {
					item._remove(false, true);
					inserted[id] = true;
				}
			}
			Base.splice(children, items, index, 0);
			var project = this._project,
				notifySelf = project._changes;
			for (var i = 0, l = items.length; i < l; i++) {
				var item = items[i],
					name = item._name;
				item._parent = this;
				item._setProject(project, true);
				if (name)
					item.setName(name);
				if (notifySelf)
					item._changed(5);
			}
			this._changed(11);
		} else {
			items = null;
		}
		return items;
	},

	_insertItem: '#insertChild',

	_insertAt: function(item, offset) {
		var owner = item && item._getOwner(),
			res = item !== this && owner ? this : null;
		if (res) {
			res._remove(false, true);
			owner._insertItem(item._index + offset, res);
		}
		return res;
	},

	insertAbove: function(item) {
		return this._insertAt(item, 1);
	},

	insertBelow: function(item) {
		return this._insertAt(item, 0);
	},

	sendToBack: function() {
		var owner = this._getOwner();
		return owner ? owner._insertItem(0, this) : null;
	},

	bringToFront: function() {
		var owner = this._getOwner();
		return owner ? owner._insertItem(undefined, this) : null;
	},

	appendTop: '#addChild',

	appendBottom: function(item) {
		return this.insertChild(0, item);
	},

	moveAbove: '#insertAbove',

	moveBelow: '#insertBelow',

	addTo: function(owner) {
		return owner._insertItem(undefined, this);
	},

	copyTo: function(owner) {
		return this.clone(false).addTo(owner);
	},

	reduce: function(options) {
		var children = this._children;
		if (children && children.length === 1) {
			var child = children[0].reduce(options);
			if (this._parent) {
				child.insertAbove(this);
				this.remove();
			} else {
				child.remove();
			}
			return child;
		}
		return this;
	},

	_removeNamed: function() {
		var owner = this._getOwner();
		if (owner) {
			var children = owner._children,
				namedChildren = owner._namedChildren,
				name = this._name,
				namedArray = namedChildren[name],
				index = namedArray ? namedArray.indexOf(this) : -1;
			if (index !== -1) {
				if (children[name] == this)
					delete children[name];
				namedArray.splice(index, 1);
				if (namedArray.length) {
					children[name] = namedArray[0];
				} else {
					delete namedChildren[name];
				}
			}
		}
	},

	_remove: function(notifySelf, notifyParent) {
		var owner = this._getOwner(),
			project = this._project,
			index = this._index;
		if (this._style)
			this._style._dispose();
		if (owner) {
			if (this._name)
				this._removeNamed();
			if (index != null) {
				if (project._activeLayer === this)
					project._activeLayer = this.getNextSibling()
							|| this.getPreviousSibling();
				Base.splice(owner._children, null, index, 1);
			}
			this._installEvents(false);
			if (notifySelf && project._changes)
				this._changed(5);
			if (notifyParent)
				owner._changed(11, this);
			this._parent = null;
			return true;
		}
		return false;
	},

	remove: function() {
		return this._remove(true, true);
	},

	replaceWith: function(item) {
		var ok = item && item.insertBelow(this);
		if (ok)
			this.remove();
		return ok;
	},

	removeChildren: function(start, end) {
		if (!this._children)
			return null;
		start = start || 0;
		end = Base.pick(end, this._children.length);
		var removed = Base.splice(this._children, null, start, end - start);
		for (var i = removed.length - 1; i >= 0; i--) {
			removed[i]._remove(true, false);
		}
		if (removed.length > 0)
			this._changed(11);
		return removed;
	},

	clear: '#removeChildren',

	reverseChildren: function() {
		if (this._children) {
			this._children.reverse();
			for (var i = 0, l = this._children.length; i < l; i++)
				this._children[i]._index = i;
			this._changed(11);
		}
	},

	isEmpty: function() {
		var children = this._children;
		return !children || !children.length;
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

	hasFill: function() {
		return this.getStyle().hasFill();
	},

	hasStroke: function() {
		return this.getStyle().hasStroke();
	},

	hasShadow: function() {
		return this.getStyle().hasShadow();
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

	isInserted: function() {
		return this._parent ? this._parent.isInserted() : false;
	},

	isAbove: function(item) {
		return this._getOrder(item) === -1;
	},

	isBelow: function(item) {
		return this._getOrder(item) === 1;
	},

	isParent: function(item) {
		return this._parent === item;
	},

	isChild: function(item) {
		return item && item._parent === this;
	},

	isDescendant: function(item) {
		var parent = this;
		while (parent = parent._parent) {
			if (parent === item)
				return true;
		}
		return false;
	},

	isAncestor: function(item) {
		return item ? item.isDescendant(this) : false;
	},

	isSibling: function(item) {
		return this._parent === item._parent;
	},

	isGroupedWith: function(item) {
		var parent = this._parent;
		while (parent) {
			if (parent._parent
				&& /^(Group|Layer|CompoundPath)$/.test(parent._class)
				&& item.isDescendant(parent))
					return true;
			parent = parent._parent;
		}
		return false;
	},

}, Base.each(['rotate', 'scale', 'shear', 'skew'], function(key) {
	var rotate = key === 'rotate';
	this[key] = function() {
		var value = (rotate ? Base : Point).read(arguments),
			center = Point.read(arguments, 0, { readNull: true });
		return this.transform(new Matrix()[key](value,
				center || this.getPosition(true)));
	};
}, {
	translate: function() {
		var mx = new Matrix();
		return this.transform(mx.translate.apply(mx, arguments));
	},

	transform: function(matrix, _applyMatrix, _applyRecursively,
			_setApplyMatrix) {
		var _matrix = this._matrix,
			transformMatrix = matrix && !matrix.isIdentity(),
			applyMatrix = (_applyMatrix || this._applyMatrix)
					&& ((!_matrix.isIdentity() || transformMatrix)
						|| _applyMatrix && _applyRecursively && this._children);
		if (!transformMatrix && !applyMatrix)
			return this;
		if (transformMatrix) {
			if (!matrix.isInvertible() && _matrix.isInvertible())
				_matrix._backup = _matrix.getValues();
			_matrix.prepend(matrix, true);
			var style = this._style,
				fillColor = style.getFillColor(true),
				strokeColor = style.getStrokeColor(true);
			if (fillColor)
				fillColor.transform(matrix);
			if (strokeColor)
				strokeColor.transform(matrix);
		}
		if (applyMatrix && (applyMatrix = this._transformContent(_matrix,
				_applyRecursively, _setApplyMatrix))) {
			var pivot = this._pivot;
			if (pivot)
				_matrix._transformPoint(pivot, pivot, true);
			_matrix.reset(true);
			if (_setApplyMatrix && this._canApplyMatrix)
				this._applyMatrix = true;
		}
		var bounds = this._bounds,
			position = this._position;
		if (transformMatrix || applyMatrix) {
			this._changed(25);
		}
		var decomp = transformMatrix && bounds && matrix.decompose();
		if (decomp && decomp.skewing.isZero() && decomp.rotation % 90 === 0) {
			for (var key in bounds) {
				var cache = bounds[key];
				if (cache.nonscaling) {
					delete bounds[key];
				} else if (applyMatrix || !cache.internal) {
					var rect = cache.rect;
					matrix._transformBounds(rect, rect);
				}
			}
			this._bounds = bounds;
			var cached = bounds[this._getBoundsCacheKey(
				this._boundsOptions || {})];
			if (cached) {
				this._position = this._getPositionFromBounds(cached.rect);
			}
		} else if (transformMatrix && position && this._pivot) {
			this._position = matrix._transformPoint(position, position);
		}
		return this;
	},

	_transformContent: function(matrix, applyRecursively, setApplyMatrix) {
		var children = this._children;
		if (children) {
			for (var i = 0, l = children.length; i < l; i++)
				children[i].transform(matrix, true, applyRecursively,
						setApplyMatrix);
			return true;
		}
	},

	globalToLocal: function() {
		return this.getGlobalMatrix(true)._inverseTransform(
				Point.read(arguments));
	},

	localToGlobal: function() {
		return this.getGlobalMatrix(true)._transformPoint(
				Point.read(arguments));
	},

	parentToLocal: function() {
		return this._matrix._inverseTransform(Point.read(arguments));
	},

	localToParent: function() {
		return this._matrix._transformPoint(Point.read(arguments));
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
					new Size(bounds.width * scale, bounds.height * scale));
		newBounds.setCenter(rectangle.getCenter());
		this.setBounds(newBounds);
	}
}), {

	_setStyles: function(ctx, param, viewMatrix) {
		var style = this._style,
			matrix = this._matrix;
		if (style.hasFill()) {
			ctx.fillStyle = style.getFillColor().toCanvasStyle(ctx, matrix);
		}
		if (style.hasStroke()) {
			ctx.strokeStyle = style.getStrokeColor().toCanvasStyle(ctx, matrix);
			ctx.lineWidth = style.getStrokeWidth();
			var strokeJoin = style.getStrokeJoin(),
				strokeCap = style.getStrokeCap(),
				miterLimit = style.getMiterLimit();
			if (strokeJoin)
				ctx.lineJoin = strokeJoin;
			if (strokeCap)
				ctx.lineCap = strokeCap;
			if (miterLimit)
				ctx.miterLimit = miterLimit;
			if (paper.support.nativeDash) {
				var dashArray = style.getDashArray(),
					dashOffset = style.getDashOffset();
				if (dashArray && dashArray.length) {
					if ('setLineDash' in ctx) {
						ctx.setLineDash(dashArray);
						ctx.lineDashOffset = dashOffset;
					} else {
						ctx.mozDash = dashArray;
						ctx.mozDashOffset = dashOffset;
					}
				}
			}
		}
		if (style.hasShadow()) {
			var pixelRatio = param.pixelRatio || 1,
				mx = viewMatrix._shiftless().prepend(
					new Matrix().scale(pixelRatio, pixelRatio)),
				blur = mx.transform(new Point(style.getShadowBlur(), 0)),
				offset = mx.transform(this.getShadowOffset());
			ctx.shadowColor = style.getShadowColor().toCanvasStyle(ctx);
			ctx.shadowBlur = blur.getLength();
			ctx.shadowOffsetX = offset.x;
			ctx.shadowOffsetY = offset.y;
		}
	},

	draw: function(ctx, param, parentStrokeMatrix) {
		var updateVersion = this._updateVersion = this._project._updateVersion;
		if (!this._visible || this._opacity === 0)
			return;
		var matrices = param.matrices,
			viewMatrix = param.viewMatrix,
			matrix = this._matrix,
			globalMatrix = matrices[matrices.length - 1].appended(matrix);
		if (!globalMatrix.isInvertible())
			return;

		viewMatrix = viewMatrix ? viewMatrix.appended(globalMatrix)
				: globalMatrix;

		matrices.push(globalMatrix);
		if (param.updateMatrix) {
			this._globalMatrix = globalMatrix;
		}

		var blendMode = this._blendMode,
			opacity = this._opacity,
			normalBlend = blendMode === 'normal',
			nativeBlend = BlendMode.nativeModes[blendMode],
			direct = normalBlend && opacity === 1
					|| param.dontStart
					|| param.clip
					|| (nativeBlend || normalBlend && opacity < 1)
						&& this._canComposite(),
			pixelRatio = param.pixelRatio || 1,
			mainCtx, itemOffset, prevOffset;
		if (!direct) {
			var bounds = this.getStrokeBounds(viewMatrix);
			if (!bounds.width || !bounds.height) {
				matrices.pop();
				return;
			}
			prevOffset = param.offset;
			itemOffset = param.offset = bounds.getTopLeft().floor();
			mainCtx = ctx;
			ctx = CanvasProvider.getContext(bounds.getSize().ceil().add(1)
					.multiply(pixelRatio));
			if (pixelRatio !== 1)
				ctx.scale(pixelRatio, pixelRatio);
		}
		ctx.save();
		var strokeMatrix = parentStrokeMatrix
				? parentStrokeMatrix.appended(matrix)
				: this._canScaleStroke && !this.getStrokeScaling(true)
					&& viewMatrix,
			clip = !direct && param.clipItem,
			transform = !strokeMatrix || clip;
		if (direct) {
			ctx.globalAlpha = opacity;
			if (nativeBlend)
				ctx.globalCompositeOperation = blendMode;
		} else if (transform) {
			ctx.translate(-itemOffset.x, -itemOffset.y);
		}
		if (transform) {
			(direct ? matrix : viewMatrix).applyToContext(ctx);
		}
		if (clip) {
			param.clipItem.draw(ctx, param.extend({ clip: true }));
		}
		if (strokeMatrix) {
			ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
			var offset = param.offset;
			if (offset)
				ctx.translate(-offset.x, -offset.y);
		}
		this._draw(ctx, param, viewMatrix, strokeMatrix);
		ctx.restore();
		matrices.pop();
		if (param.clip && !param.dontFinish)
			ctx.clip();
		if (!direct) {
			BlendMode.process(blendMode, ctx, mainCtx, opacity,
					itemOffset.subtract(prevOffset).multiply(pixelRatio));
			CanvasProvider.release(ctx);
			param.offset = prevOffset;
		}
	},

	_isUpdated: function(updateVersion) {
		var parent = this._parent;
		if (parent instanceof CompoundPath)
			return parent._isUpdated(updateVersion);
		var updated = this._updateVersion === updateVersion;
		if (!updated && parent && parent._visible
				&& parent._isUpdated(updateVersion)) {
			this._updateVersion = updateVersion;
			updated = true;
		}
		return updated;
	},

	_drawSelection: function(ctx, matrix, size, selectionItems, updateVersion) {
		var selection = this._selection,
			itemSelected = selection & 1,
			boundsSelected = selection & 2
					|| itemSelected && this._selectBounds,
			positionSelected = selection & 4;
		if (!this._drawSelected)
			itemSelected = false;
		if ((itemSelected || boundsSelected || positionSelected)
				&& this._isUpdated(updateVersion)) {
			var layer,
				color = this.getSelectedColor(true) || (layer = this.getLayer())
					&& layer.getSelectedColor(true),
				mx = matrix.appended(this.getGlobalMatrix(true)),
				half = size / 2;
			ctx.strokeStyle = ctx.fillStyle = color
					? color.toCanvasStyle(ctx) : '#009dec';
			if (itemSelected)
				this._drawSelected(ctx, mx, selectionItems);
			if (positionSelected) {
				var pos = this.getPosition(true),
					parent = this._parent,
					point = parent ? parent.localToGlobal(pos) : pos,
					x = point.x,
					y = point.y;
				ctx.beginPath();
				ctx.arc(x, y, half, 0, Math.PI * 2, true);
				ctx.stroke();
				var deltas = [[0, -1], [1, 0], [0, 1], [-1, 0]],
					start = half,
					end = size + 1;
				for (var i = 0; i < 4; i++) {
					var delta = deltas[i],
						dx = delta[0],
						dy = delta[1];
					ctx.moveTo(x + dx * start, y + dy * start);
					ctx.lineTo(x + dx * end, y + dy * end);
					ctx.stroke();
				}
			}
			if (boundsSelected) {
				var coords = mx._transformCorners(this.getInternalBounds());
				ctx.beginPath();
				for (var i = 0; i < 8; i++) {
					ctx[!i ? 'moveTo' : 'lineTo'](coords[i], coords[++i]);
				}
				ctx.closePath();
				ctx.stroke();
				for (var i = 0; i < 8; i++) {
					ctx.fillRect(coords[i] - half, coords[++i] - half,
							size, size);
				}
			}
		}
	},

	_canComposite: function() {
		return false;
	}
}, Base.each(['down', 'drag', 'up', 'move'], function(key) {
	this['removeOn' + Base.capitalize(key)] = function() {
		var hash = {};
		hash[key] = true;
		return this.removeOn(hash);
	};
}, {

	removeOn: function(obj) {
		for (var name in obj) {
			if (obj[name]) {
				var key = 'mouse' + name,
					project = this._project,
					sets = project._removeSets = project._removeSets || {};
				sets[key] = sets[key] || {};
				sets[key][this._id] = this;
			}
		}
		return this;
	}
}), {
	tween: function(from, to, options) {
		if (!options) {
			options = to;
			to = from;
			from = null;
			if (!options) {
				options = to;
				to = null;
			}
		}
		var easing = options && options.easing,
			start = options && options.start,
			duration = options != null && (
				typeof options === 'number' ? options : options.duration
			),
			tween = new Tween(this, from, to, duration, easing, start);
		function onFrame(event) {
			tween._handleFrame(event.time * 1000);
			if (!tween.running) {
				this.off('frame', onFrame);
			}
		}
		if (duration) {
			this.on('frame', onFrame);
		}
		return tween;
	},

	tweenTo: function(to, options) {
		return this.tween(null, to, options);
	},

	tweenFrom: function(from, options) {
		return this.tween(from, null, options);
	}
});

var Group = Item.extend({
	_class: 'Group',
	_selectBounds: false,
	_selectChildren: true,
	_serializeFields: {
		children: []
	},

	initialize: function Group(arg) {
		this._children = [];
		this._namedChildren = {};
		if (!this._initialize(arg))
			this.addChildren(Array.isArray(arg) ? arg : arguments);
	},

	_changed: function _changed(flags) {
		_changed.base.call(this, flags);
		if (flags & 2050) {
			this._clipItem = undefined;
		}
	},

	_getClipItem: function() {
		var clipItem = this._clipItem;
		if (clipItem === undefined) {
			clipItem = null;
			var children = this._children;
			for (var i = 0, l = children.length; i < l; i++) {
				if (children[i]._clipMask) {
					clipItem = children[i];
					break;
				}
			}
			this._clipItem = clipItem;
		}
		return clipItem;
	},

	isClipped: function() {
		return !!this._getClipItem();
	},

	setClipped: function(clipped) {
		var child = this.getFirstChild();
		if (child)
			child.setClipMask(clipped);
	},

	_getBounds: function _getBounds(matrix, options) {
		var clipItem = this._getClipItem();
		return clipItem
			? clipItem._getCachedBounds(
				matrix && matrix.appended(clipItem._matrix),
				Base.set({}, options, { stroke: false }))
			: _getBounds.base.call(this, matrix, options);
	},

	_hitTestChildren: function _hitTestChildren(point, options, viewMatrix) {
		var clipItem = this._getClipItem();
		return (!clipItem || clipItem.contains(point))
				&& _hitTestChildren.base.call(this, point, options, viewMatrix,
					clipItem);
	},

	_draw: function(ctx, param) {
		var clip = param.clip,
			clipItem = !clip && this._getClipItem();
		param = param.extend({ clipItem: clipItem, clip: false });
		if (clip) {
			ctx.beginPath();
			param.dontStart = param.dontFinish = true;
		} else if (clipItem) {
			clipItem.draw(ctx, param.extend({ clip: true }));
		}
		var children = this._children;
		for (var i = 0, l = children.length; i < l; i++) {
			var item = children[i];
			if (item !== clipItem)
				item.draw(ctx, param);
		}
	}
});

var Layer = Group.extend({
	_class: 'Layer',

	initialize: function Layer() {
		Group.apply(this, arguments);
	},

	_getOwner: function() {
		return this._parent || this._index != null && this._project;
	},

	isInserted: function isInserted() {
		return this._parent ? isInserted.base.call(this) : this._index != null;
	},

	activate: function() {
		this._project._activeLayer = this;
	},

	_hitTestSelf: function() {
	}
});

var Shape = Item.extend({
	_class: 'Shape',
	_applyMatrix: false,
	_canApplyMatrix: false,
	_canScaleStroke: true,
	_serializeFields: {
		type: null,
		size: null,
		radius: null
	},

	initialize: function Shape(props, point) {
		this._initialize(props, point);
	},

	_equals: function(item) {
		return this._type === item._type
			&& this._size.equals(item._size)
			&& Base.equals(this._radius, item._radius);
	},

	copyContent: function(source) {
		this.setType(source._type);
		this.setSize(source._size);
		this.setRadius(source._radius);
	},

	getType: function() {
		return this._type;
	},

	setType: function(type) {
		this._type = type;
	},

	getShape: '#getType',
	setShape: '#setType',

	getSize: function() {
		var size = this._size;
		return new LinkedSize(size.width, size.height, this, 'setSize');
	},

	setSize: function() {
		var size = Size.read(arguments);
		if (!this._size) {
			this._size = size.clone();
		} else if (!this._size.equals(size)) {
			var type = this._type,
				width = size.width,
				height = size.height;
			if (type === 'rectangle') {
				this._radius.set(Size.min(this._radius, size.divide(2)));
			} else if (type === 'circle') {
				width = height = (width + height) / 2;
				this._radius = width / 2;
			} else if (type === 'ellipse') {
				this._radius._set(width / 2, height / 2);
			}
			this._size._set(width, height);
			this._changed(9);
		}
	},

	getRadius: function() {
		var rad = this._radius;
		return this._type === 'circle'
				? rad
				: new LinkedSize(rad.width, rad.height, this, 'setRadius');
	},

	setRadius: function(radius) {
		var type = this._type;
		if (type === 'circle') {
			if (radius === this._radius)
				return;
			var size = radius * 2;
			this._radius = radius;
			this._size._set(size, size);
		} else {
			radius = Size.read(arguments);
			if (!this._radius) {
				this._radius = radius.clone();
			} else {
				if (this._radius.equals(radius))
					return;
				this._radius.set(radius);
				if (type === 'rectangle') {
					var size = Size.max(this._size, radius.multiply(2));
					this._size.set(size);
				} else if (type === 'ellipse') {
					this._size._set(radius.width * 2, radius.height * 2);
				}
			}
		}
		this._changed(9);
	},

	isEmpty: function() {
		return false;
	},

	toPath: function(insert) {
		var path = new Path[Base.capitalize(this._type)]({
			center: new Point(),
			size: this._size,
			radius: this._radius,
			insert: false
		});
		path.copyAttributes(this);
		if (paper.settings.applyMatrix)
			path.setApplyMatrix(true);
		if (insert === undefined || insert)
			path.insertAbove(this);
		return path;
	},

	toShape: '#clone',

	_asPathItem: function() {
		return this.toPath(false);
	},

	_draw: function(ctx, param, viewMatrix, strokeMatrix) {
		var style = this._style,
			hasFill = style.hasFill(),
			hasStroke = style.hasStroke(),
			dontPaint = param.dontFinish || param.clip,
			untransformed = !strokeMatrix;
		if (hasFill || hasStroke || dontPaint) {
			var type = this._type,
				radius = this._radius,
				isCircle = type === 'circle';
			if (!param.dontStart)
				ctx.beginPath();
			if (untransformed && isCircle) {
				ctx.arc(0, 0, radius, 0, Math.PI * 2, true);
			} else {
				var rx = isCircle ? radius : radius.width,
					ry = isCircle ? radius : radius.height,
					size = this._size,
					width = size.width,
					height = size.height;
				if (untransformed && type === 'rectangle' && rx === 0 && ry === 0) {
					ctx.rect(-width / 2, -height / 2, width, height);
				} else {
					var x = width / 2,
						y = height / 2,
						kappa = 1 - 0.5522847498307936,
						cx = rx * kappa,
						cy = ry * kappa,
						c = [
							-x, -y + ry,
							-x, -y + cy,
							-x + cx, -y,
							-x + rx, -y,
							x - rx, -y,
							x - cx, -y,
							x, -y + cy,
							x, -y + ry,
							x, y - ry,
							x, y - cy,
							x - cx, y,
							x - rx, y,
							-x + rx, y,
							-x + cx, y,
							-x, y - cy,
							-x, y - ry
						];
					if (strokeMatrix)
						strokeMatrix.transform(c, c, 32);
					ctx.moveTo(c[0], c[1]);
					ctx.bezierCurveTo(c[2], c[3], c[4], c[5], c[6], c[7]);
					if (x !== rx)
						ctx.lineTo(c[8], c[9]);
					ctx.bezierCurveTo(c[10], c[11], c[12], c[13], c[14], c[15]);
					if (y !== ry)
						ctx.lineTo(c[16], c[17]);
					ctx.bezierCurveTo(c[18], c[19], c[20], c[21], c[22], c[23]);
					if (x !== rx)
						ctx.lineTo(c[24], c[25]);
					ctx.bezierCurveTo(c[26], c[27], c[28], c[29], c[30], c[31]);
				}
			}
			ctx.closePath();
		}
		if (!dontPaint && (hasFill || hasStroke)) {
			this._setStyles(ctx, param, viewMatrix);
			if (hasFill) {
				ctx.fill(style.getFillRule());
				ctx.shadowColor = 'rgba(0,0,0,0)';
			}
			if (hasStroke)
				ctx.stroke();
		}
	},

	_canComposite: function() {
		return !(this.hasFill() && this.hasStroke());
	},

	_getBounds: function(matrix, options) {
		var rect = new Rectangle(this._size).setCenter(0, 0),
			style = this._style,
			strokeWidth = options.stroke && style.hasStroke()
					&& style.getStrokeWidth();
		if (matrix)
			rect = matrix._transformBounds(rect);
		return strokeWidth
				? rect.expand(Path._getStrokePadding(strokeWidth,
					this._getStrokeMatrix(matrix, options)))
				: rect;
	}
},
new function() {
	function getCornerCenter(that, point, expand) {
		var radius = that._radius;
		if (!radius.isZero()) {
			var halfSize = that._size.divide(2);
			for (var q = 1; q <= 4; q++) {
				var dir = new Point(q > 1 && q < 4 ? -1 : 1, q > 2 ? -1 : 1),
					corner = dir.multiply(halfSize),
					center = corner.subtract(dir.multiply(radius)),
					rect = new Rectangle(
							expand ? corner.add(dir.multiply(expand)) : corner,
							center);
				if (rect.contains(point))
					return { point: center, quadrant: q };
			}
		}
	}

	function isOnEllipseStroke(point, radius, padding, quadrant) {
		var vector = point.divide(radius);
		return (!quadrant || vector.isInQuadrant(quadrant)) &&
				vector.subtract(vector.normalize()).multiply(radius)
					.divide(padding).length <= 1;
	}

	return {
		_contains: function _contains(point) {
			if (this._type === 'rectangle') {
				var center = getCornerCenter(this, point);
				return center
						? point.subtract(center.point).divide(this._radius)
							.getLength() <= 1
						: _contains.base.call(this, point);
			} else {
				return point.divide(this.size).getLength() <= 0.5;
			}
		},

		_hitTestSelf: function _hitTestSelf(point, options, viewMatrix,
				strokeMatrix) {
			var hit = false,
				style = this._style,
				hitStroke = options.stroke && style.hasStroke(),
				hitFill = options.fill && style.hasFill();
			if (hitStroke || hitFill) {
				var type = this._type,
					radius = this._radius,
					strokeRadius = hitStroke ? style.getStrokeWidth() / 2 : 0,
					strokePadding = options._tolerancePadding.add(
						Path._getStrokePadding(strokeRadius,
							!style.getStrokeScaling() && strokeMatrix));
				if (type === 'rectangle') {
					var padding = strokePadding.multiply(2),
						center = getCornerCenter(this, point, padding);
					if (center) {
						hit = isOnEllipseStroke(point.subtract(center.point),
								radius, strokePadding, center.quadrant);
					} else {
						var rect = new Rectangle(this._size).setCenter(0, 0),
							outer = rect.expand(padding),
							inner = rect.expand(padding.negate());
						hit = outer._containsPoint(point)
								&& !inner._containsPoint(point);
					}
				} else {
					hit = isOnEllipseStroke(point, radius, strokePadding);
				}
			}
			return hit ? new HitResult(hitStroke ? 'stroke' : 'fill', this)
					: _hitTestSelf.base.apply(this, arguments);
		}
	};
}, {

statics: new function() {
	function createShape(type, point, size, radius, args) {
		var item = new Shape(Base.getNamed(args), point);
		item._type = type;
		item._size = size;
		item._radius = radius;
		return item;
	}

	return {
		Circle: function() {
			var center = Point.readNamed(arguments, 'center'),
				radius = Base.readNamed(arguments, 'radius');
			return createShape('circle', center, new Size(radius * 2), radius,
					arguments);
		},

		Rectangle: function() {
			var rect = Rectangle.readNamed(arguments, 'rectangle'),
				radius = Size.min(Size.readNamed(arguments, 'radius'),
						rect.getSize(true).divide(2));
			return createShape('rectangle', rect.getCenter(true),
					rect.getSize(true), radius, arguments);
		},

		Ellipse: function() {
			var ellipse = Shape._readEllipse(arguments),
				radius = ellipse.radius;
			return createShape('ellipse', ellipse.center, radius.multiply(2),
					radius, arguments);
		},

		_readEllipse: function(args) {
			var center,
				radius;
			if (Base.hasNamed(args, 'radius')) {
				center = Point.readNamed(args, 'center');
				radius = Size.readNamed(args, 'radius');
			} else {
				var rect = Rectangle.readNamed(args, 'rectangle');
				center = rect.getCenter(true);
				radius = rect.getSize(true).divide(2);
			}
			return { center: center, radius: radius };
		}
	};
}});

var Raster = Item.extend({
	_class: 'Raster',
	_applyMatrix: false,
	_canApplyMatrix: false,
	_boundsOptions: { stroke: false, handle: false },
	_serializeFields: {
		crossOrigin: null,
		source: null
	},
	_prioritize: ['crossOrigin'],
	_smoothing: true,

	initialize: function Raster(object, position) {
		if (!this._initialize(object,
				position !== undefined && Point.read(arguments, 1))) {
			var image = typeof object === 'string'
					? document.getElementById(object) : object;
			if (image) {
				this.setImage(image);
			} else {
				this.setSource(object);
			}
		}
		if (!this._size) {
			this._size = new Size();
			this._loaded = false;
		}
	},

	_equals: function(item) {
		return this.getSource() === item.getSource();
	},

	copyContent: function(source) {
		var image = source._image,
			canvas = source._canvas;
		if (image) {
			this._setImage(image);
		} else if (canvas) {
			var copyCanvas = CanvasProvider.getCanvas(source._size);
			copyCanvas.getContext('2d').drawImage(canvas, 0, 0);
			this._setImage(copyCanvas);
		}
		this._crossOrigin = source._crossOrigin;
	},

	getSize: function() {
		var size = this._size;
		return new LinkedSize(size ? size.width : 0, size ? size.height : 0,
				this, 'setSize');
	},

	setSize: function() {
		var size = Size.read(arguments);
		if (!size.equals(this._size)) {
			if (size.width > 0 && size.height > 0) {
				var element = this.getElement();
				this._setImage(CanvasProvider.getCanvas(size));
				if (element)
					this.getContext(true).drawImage(element, 0, 0,
							size.width, size.height);
			} else {
				if (this._canvas)
					CanvasProvider.release(this._canvas);
				this._size = size.clone();
			}
		}
	},

	getWidth: function() {
		return this._size ? this._size.width : 0;
	},

	setWidth: function(width) {
		this.setSize(width, this.getHeight());
	},

	getHeight: function() {
		return this._size ? this._size.height : 0;
	},

	setHeight: function(height) {
		this.setSize(this.getWidth(), height);
	},

	getLoaded: function() {
		return this._loaded;
	},

	isEmpty: function() {
		var size = this._size;
		return !size || size.width === 0 && size.height === 0;
	},

	getResolution: function() {
		var matrix = this._matrix,
			orig = new Point(0, 0).transform(matrix),
			u = new Point(1, 0).transform(matrix).subtract(orig),
			v = new Point(0, 1).transform(matrix).subtract(orig);
		return new Size(
			72 / u.getLength(),
			72 / v.getLength()
		);
	},

	getPpi: '#getResolution',

	getImage: function() {
		return this._image;
	},

	setImage: function(image) {
		var that = this;

		function emit(event) {
			var view = that.getView(),
				type = event && event.type || 'load';
			if (view && that.responds(type)) {
				paper = view._scope;
				that.emit(type, new Event(event));
			}
		}

		this._setImage(image);
		if (this._loaded) {
			setTimeout(emit, 0);
		} else if (image) {
			DomEvent.add(image, {
				load: function(event) {
					that._setImage(image);
					emit(event);
				},
				error: emit
			});
		}
	},

	_setImage: function(image) {
		if (this._canvas)
			CanvasProvider.release(this._canvas);
		if (image && image.getContext) {
			this._image = null;
			this._canvas = image;
			this._loaded = true;
		} else {
			this._image = image;
			this._canvas = null;
			this._loaded = !!(image && image.src && image.complete);
		}
		this._size = new Size(
				image ? image.naturalWidth || image.width : 0,
				image ? image.naturalHeight || image.height : 0);
		this._context = null;
		this._changed(1033);
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

	setCanvas: '#setImage',

	getContext: function(modify) {
		if (!this._context)
			this._context = this.getCanvas().getContext('2d');
		if (modify) {
			this._image = null;
			this._changed(1025);
		}
		return this._context;
	},

	setContext: function(context) {
		this._context = context;
	},

	getSource: function() {
		var image = this._image;
		return image && image.src || this.toDataURL();
	},

	setSource: function(src) {
		var image = new self.Image(),
			crossOrigin = this._crossOrigin;
		if (crossOrigin)
			image.crossOrigin = crossOrigin;
		image.src = src;
		this.setImage(image);
	},

	getCrossOrigin: function() {
		var image = this._image;
		return image && image.crossOrigin || this._crossOrigin || '';
	},

	setCrossOrigin: function(crossOrigin) {
		this._crossOrigin = crossOrigin;
		var image = this._image;
		if (image)
			image.crossOrigin = crossOrigin;
	},

	getSmoothing: function() {
		return this._smoothing;
	},

	setSmoothing: function(smoothing) {
		this._smoothing = smoothing;
		this._changed(257);
	},

	getElement: function() {
		return this._canvas || this._loaded && this._image;
	}
}, {
	beans: false,

	getSubCanvas: function() {
		var rect = Rectangle.read(arguments),
			ctx = CanvasProvider.getContext(rect.getSize());
		ctx.drawImage(this.getCanvas(), rect.x, rect.y,
				rect.width, rect.height, 0, 0, rect.width, rect.height);
		return ctx.canvas;
	},

	getSubRaster: function() {
		var rect = Rectangle.read(arguments),
			raster = new Raster(Item.NO_INSERT);
		raster._setImage(this.getSubCanvas(rect));
		raster.translate(rect.getCenter().subtract(this.getSize().divide(2)));
		raster._matrix.prepend(this._matrix);
		raster.insertAbove(this);
		return raster;
	},

	toDataURL: function() {
		var image = this._image,
			src = image && image.src;
		if (/^data:/.test(src))
			return src;
		var canvas = this.getCanvas();
		return canvas ? canvas.toDataURL.apply(canvas, arguments) : null;
	},

	drawImage: function(image ) {
		var point = Point.read(arguments, 1);
		this.getContext(true).drawImage(image, point.x, point.y);
	},

	getAverageColor: function(object) {
		var bounds, path;
		if (!object) {
			bounds = this.getBounds();
		} else if (object instanceof PathItem) {
			path = object;
			bounds = object.getBounds();
		} else if (typeof object === 'object') {
			if ('width' in object) {
				bounds = new Rectangle(object);
			} else if ('x' in object) {
				bounds = new Rectangle(object.x - 0.5, object.y - 0.5, 1, 1);
			}
		}
		if (!bounds)
			return null;
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
		var matrix = new Matrix()
				.scale(width / bounds.width, height / bounds.height)
				.translate(-bounds.x, -bounds.y);
		matrix.applyToContext(ctx);
		if (path)
			path.draw(ctx, new Base({ clip: true, matrices: [matrix] }));
		this._matrix.applyToContext(ctx);
		var element = this.getElement(),
			size = this._size;
		if (element)
			ctx.drawImage(element, -size.width / 2, -size.height / 2);
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

	getPixel: function() {
		var point = Point.read(arguments);
		var data = this.getContext().getImageData(point.x, point.y, 1, 1).data;
		return new Color('rgb', [data[0] / 255, data[1] / 255, data[2] / 255],
				data[3] / 255);
	},

	setPixel: function() {
		var point = Point.read(arguments),
			color = Color.read(arguments),
			components = color._convert('rgb'),
			alpha = color._alpha,
			ctx = this.getContext(true),
			imageData = ctx.createImageData(1, 1),
			data = imageData.data;
		data[0] = components[0] * 255;
		data[1] = components[1] * 255;
		data[2] = components[2] * 255;
		data[3] = alpha != null ? alpha * 255 : 255;
		ctx.putImageData(imageData, point.x, point.y);
	},

	createImageData: function() {
		var size = Size.read(arguments);
		return this.getContext().createImageData(size.width, size.height);
	},

	getImageData: function() {
		var rect = Rectangle.read(arguments);
		if (rect.isEmpty())
			rect = new Rectangle(this._size);
		return this.getContext().getImageData(rect.x, rect.y,
				rect.width, rect.height);
	},

	setImageData: function(data ) {
		var point = Point.read(arguments, 1);
		this.getContext(true).putImageData(data, point.x, point.y);
	},

	_getBounds: function(matrix, options) {
		var rect = new Rectangle(this._size).setCenter(0, 0);
		return matrix ? matrix._transformBounds(rect) : rect;
	},

	_hitTestSelf: function(point) {
		if (this._contains(point)) {
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

	_draw: function(ctx, param, viewMatrix) {
		var element = this.getElement();
		if (element && element.width > 0 && element.height > 0) {
			ctx.globalAlpha = this._opacity;

			this._setStyles(ctx, param, viewMatrix);

			DomElement.setPrefixed(
				ctx, 'imageSmoothingEnabled', this._smoothing
			);

			ctx.drawImage(element,
					-this._size.width / 2, -this._size.height / 2);
		}
	},

	_canComposite: function() {
		return true;
	}
});

var SymbolItem = Item.extend({
	_class: 'SymbolItem',
	_applyMatrix: false,
	_canApplyMatrix: false,
	_boundsOptions: { stroke: true },
	_serializeFields: {
		symbol: null
	},

	initialize: function SymbolItem(arg0, arg1) {
		if (!this._initialize(arg0,
				arg1 !== undefined && Point.read(arguments, 1)))
			this.setDefinition(arg0 instanceof SymbolDefinition ?
					arg0 : new SymbolDefinition(arg0));
	},

	_equals: function(item) {
		return this._definition === item._definition;
	},

	copyContent: function(source) {
		this.setDefinition(source._definition);
	},

	getDefinition: function() {
		return this._definition;
	},

	setDefinition: function(definition) {
		this._definition = definition;
		this._changed(9);
	},

	getSymbol: '#getDefinition',
	setSymbol: '#setDefinition',

	isEmpty: function() {
		return this._definition._item.isEmpty();
	},

	_getBounds: function(matrix, options) {
		var item = this._definition._item;
		return item._getCachedBounds(item._matrix.prepended(matrix), options);
	},

	_hitTestSelf: function(point, options, viewMatrix) {
		var res = this._definition._item._hitTest(point, options, viewMatrix);
		if (res)
			res.item = this;
		return res;
	},

	_draw: function(ctx, param) {
		this._definition._item.draw(ctx, param);
	}

});

var SymbolDefinition = Base.extend({
	_class: 'SymbolDefinition',

	initialize: function SymbolDefinition(item, dontCenter) {
		this._id = UID.get();
		this.project = paper.project;
		if (item)
			this.setItem(item, dontCenter);
	},

	_serialize: function(options, dictionary) {
		return dictionary.add(this, function() {
			return Base.serialize([this._class, this._item],
					options, false, dictionary);
		});
	},

	_changed: function(flags) {
		if (flags & 8)
			Item._clearBoundsCache(this);
		if (flags & 1)
			this.project._changed(flags);
	},

	getItem: function() {
		return this._item;
	},

	setItem: function(item, _dontCenter) {
		if (item._symbol)
			item = item.clone();
		if (this._item)
			this._item._symbol = null;
		this._item = item;
		item.remove();
		item.setSelected(false);
		if (!_dontCenter)
			item.setPosition(new Point());
		item._symbol = this;
		this._changed(9);
	},

	getDefinition: '#getItem',
	setDefinition: '#setItem',

	place: function(position) {
		return new SymbolItem(this, position);
	},

	clone: function() {
		return new SymbolDefinition(this._item.clone(false));
	},

	equals: function(symbol) {
		return symbol === this
				|| symbol && this._item.equals(symbol._item)
				|| false;
	}
});

var HitResult = Base.extend({
	_class: 'HitResult',

	initialize: function HitResult(type, item, values) {
		this.type = type;
		this.item = item;
		if (values)
			this.inject(values);
	},

	statics: {
		getOptions: function(args) {
			var options = args && Base.read(args);
			return Base.set({
				type: null,
				tolerance: paper.settings.hitTolerance,
				fill: !options,
				stroke: !options,
				segments: !options,
				handles: false,
				ends: false,
				position: false,
				center: false,
				bounds: false,
				guides: false,
				selected: false
			}, options);
		}
	}
});

var Segment = Base.extend({
	_class: 'Segment',
	beans: true,
	_selection: 0,

	initialize: function Segment(arg0, arg1, arg2, arg3, arg4, arg5) {
		var count = arguments.length,
			point, handleIn, handleOut, selection;
		if (count > 0) {
			if (arg0 == null || typeof arg0 === 'object') {
				if (count === 1 && arg0 && 'point' in arg0) {
					point = arg0.point;
					handleIn = arg0.handleIn;
					handleOut = arg0.handleOut;
					selection = arg0.selection;
				} else {
					point = arg0;
					handleIn = arg1;
					handleOut = arg2;
					selection = arg3;
				}
			} else {
				point = [ arg0, arg1 ];
				handleIn = arg2 !== undefined ? [ arg2, arg3 ] : null;
				handleOut = arg4 !== undefined ? [ arg4, arg5 ] : null;
			}
		}
		new SegmentPoint(point, this, '_point');
		new SegmentPoint(handleIn, this, '_handleIn');
		new SegmentPoint(handleOut, this, '_handleOut');
		if (selection)
			this.setSelection(selection);
	},

	_serialize: function(options, dictionary) {
		var point = this._point,
			selection = this._selection,
			obj = selection || this.hasHandles()
					? [point, this._handleIn, this._handleOut]
					: point;
		if (selection)
			obj.push(selection);
		return Base.serialize(obj, options, true, dictionary);
	},

	_changed: function(point) {
		var path = this._path;
		if (!path)
			return;
		var curves = path._curves,
			index = this._index,
			curve;
		if (curves) {
			if ((!point || point === this._point || point === this._handleIn)
					&& (curve = index > 0 ? curves[index - 1] : path._closed
						? curves[curves.length - 1] : null))
				curve._changed();
			if ((!point || point === this._point || point === this._handleOut)
					&& (curve = curves[index]))
				curve._changed();
		}
		path._changed(41);
	},

	getPoint: function() {
		return this._point;
	},

	setPoint: function() {
		this._point.set(Point.read(arguments));
	},

	getHandleIn: function() {
		return this._handleIn;
	},

	setHandleIn: function() {
		this._handleIn.set(Point.read(arguments));
	},

	getHandleOut: function() {
		return this._handleOut;
	},

	setHandleOut: function() {
		this._handleOut.set(Point.read(arguments));
	},

	hasHandles: function() {
		return !this._handleIn.isZero() || !this._handleOut.isZero();
	},

	isSmooth: function() {
		var handleIn = this._handleIn,
			handleOut = this._handleOut;
		return !handleIn.isZero() && !handleOut.isZero()
				&& handleIn.isCollinear(handleOut);
	},

	clearHandles: function() {
		this._handleIn._set(0, 0);
		this._handleOut._set(0, 0);
	},

	getSelection: function() {
		return this._selection;
	},

	setSelection: function(selection) {
		var oldSelection = this._selection,
			path = this._path;
		this._selection = selection = selection || 0;
		if (path && selection !== oldSelection) {
			path._updateSelection(this, oldSelection, selection);
			path._changed(257);
		}
	},

	_changeSelection: function(flag, selected) {
		var selection = this._selection;
		this.setSelection(selected ? selection | flag : selection & ~flag);
	},

	isSelected: function() {
		return !!(this._selection & 7);
	},

	setSelected: function(selected) {
		this._changeSelection(7, selected);
	},

	getIndex: function() {
		return this._index !== undefined ? this._index : null;
	},

	getPath: function() {
		return this._path || null;
	},

	getCurve: function() {
		var path = this._path,
			index = this._index;
		if (path) {
			if (index > 0 && !path._closed
					&& index === path._segments.length - 1)
				index--;
			return path.getCurves()[index] || null;
		}
		return null;
	},

	getLocation: function() {
		var curve = this.getCurve();
		return curve
				? new CurveLocation(curve, this === curve._segment1 ? 0 : 1)
				: null;
	},

	getNext: function() {
		var segments = this._path && this._path._segments;
		return segments && (segments[this._index + 1]
				|| this._path._closed && segments[0]) || null;
	},

	smooth: function(options, _first, _last) {
		var opts = options || {},
			type = opts.type,
			factor = opts.factor,
			prev = this.getPrevious(),
			next = this.getNext(),
			p0 = (prev || this)._point,
			p1 = this._point,
			p2 = (next || this)._point,
			d1 = p0.getDistance(p1),
			d2 = p1.getDistance(p2);
		if (!type || type === 'catmull-rom') {
			var a = factor === undefined ? 0.5 : factor,
				d1_a = Math.pow(d1, a),
				d1_2a = d1_a * d1_a,
				d2_a = Math.pow(d2, a),
				d2_2a = d2_a * d2_a;
			if (!_first && prev) {
				var A = 2 * d2_2a + 3 * d2_a * d1_a + d1_2a,
					N = 3 * d2_a * (d2_a + d1_a);
				this.setHandleIn(N !== 0
					? new Point(
						(d2_2a * p0._x + A * p1._x - d1_2a * p2._x) / N - p1._x,
						(d2_2a * p0._y + A * p1._y - d1_2a * p2._y) / N - p1._y)
					: new Point());
			}
			if (!_last && next) {
				var A = 2 * d1_2a + 3 * d1_a * d2_a + d2_2a,
					N = 3 * d1_a * (d1_a + d2_a);
				this.setHandleOut(N !== 0
					? new Point(
						(d1_2a * p2._x + A * p1._x - d2_2a * p0._x) / N - p1._x,
						(d1_2a * p2._y + A * p1._y - d2_2a * p0._y) / N - p1._y)
					: new Point());
			}
		} else if (type === 'geometric') {
			if (prev && next) {
				var vector = p0.subtract(p2),
					t = factor === undefined ? 0.4 : factor,
					k = t * d1 / (d1 + d2);
				if (!_first)
					this.setHandleIn(vector.multiply(k));
				if (!_last)
					this.setHandleOut(vector.multiply(k - t));
			}
		} else {
			throw new Error('Smoothing method \'' + type + '\' not supported.');
		}
	},

	getPrevious: function() {
		var segments = this._path && this._path._segments;
		return segments && (segments[this._index - 1]
				|| this._path._closed && segments[segments.length - 1]) || null;
	},

	isFirst: function() {
		return !this._index;
	},

	isLast: function() {
		var path = this._path;
		return path && this._index === path._segments.length - 1 || false;
	},

	reverse: function() {
		var handleIn = this._handleIn,
			handleOut = this._handleOut,
			tmp = handleIn.clone();
		handleIn.set(handleOut);
		handleOut.set(tmp);
	},

	reversed: function() {
		return new Segment(this._point, this._handleOut, this._handleIn);
	},

	remove: function() {
		return this._path ? !!this._path.removeSegment(this._index) : false;
	},

	clone: function() {
		return new Segment(this._point, this._handleIn, this._handleOut);
	},

	equals: function(segment) {
		return segment === this || segment && this._class === segment._class
				&& this._point.equals(segment._point)
				&& this._handleIn.equals(segment._handleIn)
				&& this._handleOut.equals(segment._handleOut)
				|| false;
	},

	toString: function() {
		var parts = [ 'point: ' + this._point ];
		if (!this._handleIn.isZero())
			parts.push('handleIn: ' + this._handleIn);
		if (!this._handleOut.isZero())
			parts.push('handleOut: ' + this._handleOut);
		return '{ ' + parts.join(', ') + ' }';
	},

	transform: function(matrix) {
		this._transformCoordinates(matrix, new Array(6), true);
		this._changed();
	},

	interpolate: function(from, to, factor) {
		var u = 1 - factor,
			v = factor,
			point1 = from._point,
			point2 = to._point,
			handleIn1 = from._handleIn,
			handleIn2 = to._handleIn,
			handleOut2 = to._handleOut,
			handleOut1 = from._handleOut;
		this._point._set(
				u * point1._x + v * point2._x,
				u * point1._y + v * point2._y, true);
		this._handleIn._set(
				u * handleIn1._x + v * handleIn2._x,
				u * handleIn1._y + v * handleIn2._y, true);
		this._handleOut._set(
				u * handleOut1._x + v * handleOut2._x,
				u * handleOut1._y + v * handleOut2._y, true);
		this._changed();
	},

	_transformCoordinates: function(matrix, coords, change) {
		var point = this._point,
			handleIn = !change || !this._handleIn.isZero()
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
			matrix._transformCoordinates(coords, coords, i / 2);
			x = coords[0];
			y = coords[1];
			if (change) {
				point._x = x;
				point._y = y;
				i = 2;
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
	}
});

var SegmentPoint = Point.extend({
	initialize: function SegmentPoint(point, owner, key) {
		var x, y,
			selected;
		if (!point) {
			x = y = 0;
		} else if ((x = point[0]) !== undefined) {
			y = point[1];
		} else {
			var pt = point;
			if ((x = pt.x) === undefined) {
				pt = Point.read(arguments);
				x = pt.x;
			}
			y = pt.y;
			selected = pt.selected;
		}
		this._x = x;
		this._y = y;
		this._owner = owner;
		owner[key] = this;
		if (selected)
			this.setSelected(true);
	},

	_set: function(x, y) {
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
		var isZero = Numerical.isZero;
		return isZero(this._x) && isZero(this._y);
	},

	isSelected: function() {
		return !!(this._owner._selection & this._getSelection());
	},

	setSelected: function(selected) {
		this._owner._changeSelection(this._getSelection(), selected);
	},

	_getSelection: function() {
		var owner = this._owner;
		return this === owner._point ? 1
			: this === owner._handleIn ? 2
			: this === owner._handleOut ? 4
			: 0;
	}
});

var Curve = Base.extend({
	_class: 'Curve',
	beans: true,

	initialize: function Curve(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7) {
		var count = arguments.length,
			seg1, seg2,
			point1, point2,
			handle1, handle2;
		if (count === 3) {
			this._path = arg0;
			seg1 = arg1;
			seg2 = arg2;
		} else if (!count) {
			seg1 = new Segment();
			seg2 = new Segment();
		} else if (count === 1) {
			if ('segment1' in arg0) {
				seg1 = new Segment(arg0.segment1);
				seg2 = new Segment(arg0.segment2);
			} else if ('point1' in arg0) {
				point1 = arg0.point1;
				handle1 = arg0.handle1;
				handle2 = arg0.handle2;
				point2 = arg0.point2;
			} else if (Array.isArray(arg0)) {
				point1 = [arg0[0], arg0[1]];
				point2 = [arg0[6], arg0[7]];
				handle1 = [arg0[2] - arg0[0], arg0[3] - arg0[1]];
				handle2 = [arg0[4] - arg0[6], arg0[5] - arg0[7]];
			}
		} else if (count === 2) {
			seg1 = new Segment(arg0);
			seg2 = new Segment(arg1);
		} else if (count === 4) {
			point1 = arg0;
			handle1 = arg1;
			handle2 = arg2;
			point2 = arg3;
		} else if (count === 8) {
			point1 = [arg0, arg1];
			point2 = [arg6, arg7];
			handle1 = [arg2 - arg0, arg3 - arg1];
			handle2 = [arg4 - arg6, arg5 - arg7];
		}
		this._segment1 = seg1 || new Segment(point1, null, handle1);
		this._segment2 = seg2 || new Segment(point2, handle2, null);
	},

	_serialize: function(options, dictionary) {
		return Base.serialize(this.hasHandles()
				? [this.getPoint1(), this.getHandle1(), this.getHandle2(),
					this.getPoint2()]
				: [this.getPoint1(), this.getPoint2()],
				options, true, dictionary);
	},

	_changed: function() {
		this._length = this._bounds = undefined;
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

	classify: function() {
		return Curve.classify(this.getValues());
	},

	remove: function() {
		var removed = false;
		if (this._path) {
			var segment2 = this._segment2,
				handleOut = segment2._handleOut;
			removed = segment2.remove();
			if (removed)
				this._segment1._handleOut.set(handleOut);
		}
		return removed;
	},

	getPoint1: function() {
		return this._segment1._point;
	},

	setPoint1: function() {
		this._segment1._point.set(Point.read(arguments));
	},

	getPoint2: function() {
		return this._segment2._point;
	},

	setPoint2: function() {
		this._segment2._point.set(Point.read(arguments));
	},

	getHandle1: function() {
		return this._segment1._handleOut;
	},

	setHandle1: function() {
		this._segment1._handleOut.set(Point.read(arguments));
	},

	getHandle2: function() {
		return this._segment2._handleIn;
	},

	setHandle2: function() {
		this._segment2._handleIn.set(Point.read(arguments));
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

	isFirst: function() {
		return !this._segment1._index;
	},

	isLast: function() {
		var path = this._path;
		return path && this._segment1._index === path._curves.length - 1
				|| false;
	},

	isSelected: function() {
		return this.getPoint1().isSelected()
				&& this.getHandle1().isSelected()
				&& this.getHandle2().isSelected()
				&& this.getPoint2().isSelected();
	},

	setSelected: function(selected) {
		this.getPoint1().setSelected(selected);
		this.getHandle1().setSelected(selected);
		this.getHandle2().setSelected(selected);
		this.getPoint2().setSelected(selected);
	},

	getValues: function(matrix) {
		return Curve.getValues(this._segment1, this._segment2, matrix);
	},

	getPoints: function() {
		var coords = this.getValues(),
			points = [];
		for (var i = 0; i < 8; i += 2)
			points.push(new Point(coords[i], coords[i + 1]));
		return points;
	}
}, {
	getLength: function() {
		if (this._length == null)
			this._length = Curve.getLength(this.getValues(), 0, 1);
		return this._length;
	},

	getArea: function() {
		return Curve.getArea(this.getValues());
	},

	getLine: function() {
		return new Line(this._segment1._point, this._segment2._point);
	},

	getPart: function(from, to) {
		return new Curve(Curve.getPart(this.getValues(), from, to));
	},

	getPartLength: function(from, to) {
		return Curve.getLength(this.getValues(), from, to);
	},

	divideAt: function(location) {
		return this.divideAtTime(location && location.curve === this
				? location.time : this.getTimeAt(location));
	},

	divideAtTime: function(time, _setHandles) {
		var tMin = 1e-8,
			tMax = 1 - tMin,
			res = null;
		if (time >= tMin && time <= tMax) {
			var parts = Curve.subdivide(this.getValues(), time),
				left = parts[0],
				right = parts[1],
				setHandles = _setHandles || this.hasHandles(),
				seg1 = this._segment1,
				seg2 = this._segment2,
				path = this._path;
			if (setHandles) {
				seg1._handleOut._set(left[2] - left[0], left[3] - left[1]);
				seg2._handleIn._set(right[4] - right[6],right[5] - right[7]);
			}
			var x = left[6], y = left[7],
				segment = new Segment(new Point(x, y),
						setHandles && new Point(left[4] - x, left[5] - y),
						setHandles && new Point(right[2] - x, right[3] - y));
			if (path) {
				path.insert(seg1._index + 1, segment);
				res = this.getNext();
			} else {
				this._segment2 = segment;
				this._changed();
				res = new Curve(segment, seg2);
			}
		}
		return res;
	},

	splitAt: function(location) {
		var path = this._path;
		return path ? path.splitAt(location) : null;
	},

	splitAtTime: function(time) {
		return this.splitAt(this.getLocationAtTime(time));
	},

	divide: function(offset, isTime) {
		return this.divideAtTime(offset === undefined ? 0.5 : isTime ? offset
				: this.getTimeAt(offset));
	},

	split: function(offset, isTime) {
		return this.splitAtTime(offset === undefined ? 0.5 : isTime ? offset
				: this.getTimeAt(offset));
	},

	reversed: function() {
		return new Curve(this._segment2.reversed(), this._segment1.reversed());
	},

	clearHandles: function() {
		this._segment1._handleOut._set(0, 0);
		this._segment2._handleIn._set(0, 0);
	},

statics: {
	getValues: function(segment1, segment2, matrix, straight) {
		var p1 = segment1._point,
			h1 = segment1._handleOut,
			h2 = segment2._handleIn,
			p2 = segment2._point,
			x1 = p1.x, y1 = p1.y,
			x2 = p2.x, y2 = p2.y,
			values = straight
				? [ x1, y1, x1, y1, x2, y2, x2, y2 ]
				: [
					x1, y1,
					x1 + h1._x, y1 + h1._y,
					x2 + h2._x, y2 + h2._y,
					x2, y2
				];
		if (matrix)
			matrix._transformCoordinates(values, values, 4);
		return values;
	},

	subdivide: function(v, t) {
		var x0 = v[0], y0 = v[1],
			x1 = v[2], y1 = v[3],
			x2 = v[4], y2 = v[5],
			x3 = v[6], y3 = v[7];
		if (t === undefined)
			t = 0.5;
		var u = 1 - t,
			x4 = u * x0 + t * x1, y4 = u * y0 + t * y1,
			x5 = u * x1 + t * x2, y5 = u * y1 + t * y2,
			x6 = u * x2 + t * x3, y6 = u * y2 + t * y3,
			x7 = u * x4 + t * x5, y7 = u * y4 + t * y5,
			x8 = u * x5 + t * x6, y8 = u * y5 + t * y6,
			x9 = u * x7 + t * x8, y9 = u * y7 + t * y8;
		return [
			[x0, y0, x4, y4, x7, y7, x9, y9],
			[x9, y9, x8, y8, x6, y6, x3, y3]
		];
	},

	getMonoCurves: function(v, dir) {
		var curves = [],
			io = dir ? 0 : 1,
			o0 = v[io + 0],
			o1 = v[io + 2],
			o2 = v[io + 4],
			o3 = v[io + 6];
		if ((o0 >= o1) === (o1 >= o2) && (o1 >= o2) === (o2 >= o3)
				|| Curve.isStraight(v)) {
			curves.push(v);
		} else {
			var a = 3 * (o1 - o2) - o0 + o3,
				b = 2 * (o0 + o2) - 4 * o1,
				c = o1 - o0,
				tMin = 1e-8,
				tMax = 1 - tMin,
				roots = [],
				n = Numerical.solveQuadratic(a, b, c, roots, tMin, tMax);
			if (!n) {
				curves.push(v);
			} else {
				roots.sort();
				var t = roots[0],
					parts = Curve.subdivide(v, t);
				curves.push(parts[0]);
				if (n > 1) {
					t = (roots[1] - t) / (1 - t);
					parts = Curve.subdivide(parts[1], t);
					curves.push(parts[0]);
				}
				curves.push(parts[1]);
			}
		}
		return curves;
	},

	solveCubic: function (v, coord, val, roots, min, max) {
		var v0 = v[coord],
			v1 = v[coord + 2],
			v2 = v[coord + 4],
			v3 = v[coord + 6],
			res = 0;
		if (  !(v0 < val && v3 < val && v1 < val && v2 < val ||
				v0 > val && v3 > val && v1 > val && v2 > val)) {
			var c = 3 * (v1 - v0),
				b = 3 * (v2 - v1) - c,
				a = v3 - v0 - c - b;
			res = Numerical.solveCubic(a, b, c, v0 - val, roots, min, max);
		}
		return res;
	},

	getTimeOf: function(v, point) {
		var p0 = new Point(v[0], v[1]),
			p3 = new Point(v[6], v[7]),
			epsilon = 1e-12,
			geomEpsilon = 1e-7,
			t = point.isClose(p0, epsilon) ? 0
			  : point.isClose(p3, epsilon) ? 1
			  : null;
		if (t === null) {
			var coords = [point.x, point.y],
				roots = [];
			for (var c = 0; c < 2; c++) {
				var count = Curve.solveCubic(v, c, coords[c], roots, 0, 1);
				for (var i = 0; i < count; i++) {
					var u = roots[i];
					if (point.isClose(Curve.getPoint(v, u), geomEpsilon))
						return u;
				}
			}
		}
		return point.isClose(p0, geomEpsilon) ? 0
			 : point.isClose(p3, geomEpsilon) ? 1
			 : null;
	},

	getNearestTime: function(v, point) {
		if (Curve.isStraight(v)) {
			var x0 = v[0], y0 = v[1],
				x3 = v[6], y3 = v[7],
				vx = x3 - x0, vy = y3 - y0,
				det = vx * vx + vy * vy;
			if (det === 0)
				return 0;
			var u = ((point.x - x0) * vx + (point.y - y0) * vy) / det;
			return u < 1e-12 ? 0
				 : u > 0.999999999999 ? 1
				 : Curve.getTimeOf(v,
					new Point(x0 + u * vx, y0 + u * vy));
		}

		var count = 100,
			minDist = Infinity,
			minT = 0;

		function refine(t) {
			if (t >= 0 && t <= 1) {
				var dist = point.getDistance(Curve.getPoint(v, t), true);
				if (dist < minDist) {
					minDist = dist;
					minT = t;
					return true;
				}
			}
		}

		for (var i = 0; i <= count; i++)
			refine(i / count);

		var step = 1 / (count * 2);
		while (step > 1e-8) {
			if (!refine(minT - step) && !refine(minT + step))
				step /= 2;
		}
		return minT;
	},

	getPart: function(v, from, to) {
		var flip = from > to;
		if (flip) {
			var tmp = from;
			from = to;
			to = tmp;
		}
		if (from > 0)
			v = Curve.subdivide(v, from)[1];
		if (to < 1)
			v = Curve.subdivide(v, (to - from) / (1 - from))[0];
		return flip
				? [v[6], v[7], v[4], v[5], v[2], v[3], v[0], v[1]]
				: v;
	},

	isFlatEnough: function(v, flatness) {
		var x0 = v[0], y0 = v[1],
			x1 = v[2], y1 = v[3],
			x2 = v[4], y2 = v[5],
			x3 = v[6], y3 = v[7],
			ux = 3 * x1 - 2 * x0 - x3,
			uy = 3 * y1 - 2 * y0 - y3,
			vx = 3 * x2 - 2 * x3 - x0,
			vy = 3 * y2 - 2 * y3 - y0;
		return Math.max(ux * ux, vx * vx) + Math.max(uy * uy, vy * vy)
				<= 16 * flatness * flatness;
	},

	getArea: function(v) {
		var x0 = v[0], y0 = v[1],
			x1 = v[2], y1 = v[3],
			x2 = v[4], y2 = v[5],
			x3 = v[6], y3 = v[7];
		return 3 * ((y3 - y0) * (x1 + x2) - (x3 - x0) * (y1 + y2)
				+ y1 * (x0 - x2) - x1 * (y0 - y2)
				+ y3 * (x2 + x0 / 3) - x3 * (y2 + y0 / 3)) / 20;
	},

	getBounds: function(v) {
		var min = v.slice(0, 2),
			max = min.slice(),
			roots = [0, 0];
		for (var i = 0; i < 2; i++)
			Curve._addBounds(v[i], v[i + 2], v[i + 4], v[i + 6],
					i, 0, min, max, roots);
		return new Rectangle(min[0], min[1], max[0] - min[0], max[1] - min[1]);
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

		padding /= 2;
		var minPad = min[coord] - padding,
			maxPad = max[coord] + padding;
		if (    v0 < minPad || v1 < minPad || v2 < minPad || v3 < minPad ||
				v0 > maxPad || v1 > maxPad || v2 > maxPad || v3 > maxPad) {
			if (v1 < v0 != v1 < v3 && v2 < v0 != v2 < v3) {
				add(v0, padding);
				add(v3, padding);
			} else {
				var a = 3 * (v1 - v2) - v0 + v3,
					b = 2 * (v0 + v2) - 4 * v1,
					c = v1 - v0,
					count = Numerical.solveQuadratic(a, b, c, roots),
					tMin = 1e-8,
					tMax = 1 - tMin;
				add(v3, 0);
				for (var i = 0; i < count; i++) {
					var t = roots[i],
						u = 1 - t;
					if (tMin <= t && t <= tMax)
						add(u * u * u * v0
							+ 3 * u * u * t * v1
							+ 3 * u * t * t * v2
							+ t * t * t * v3,
							padding);
				}
			}
		}
	}
}}, Base.each(
	['getBounds', 'getStrokeBounds', 'getHandleBounds'],
	function(name) {
		this[name] = function() {
			if (!this._bounds)
				this._bounds = {};
			var bounds = this._bounds[name];
			if (!bounds) {
				bounds = this._bounds[name] = Path[name](
						[this._segment1, this._segment2], false, this._path);
			}
			return bounds.clone();
		};
	},
{

}), Base.each({
	isStraight: function(p1, h1, h2, p2) {
		if (h1.isZero() && h2.isZero()) {
			return true;
		} else {
			var v = p2.subtract(p1);
			if (v.isZero()) {
				return false;
			} else if (v.isCollinear(h1) && v.isCollinear(h2)) {
				var l = new Line(p1, p2),
					epsilon = 1e-7;
				if (l.getDistance(p1.add(h1)) < epsilon &&
					l.getDistance(p2.add(h2)) < epsilon) {
					var div = v.dot(v),
						s1 = v.dot(h1) / div,
						s2 = v.dot(h2) / div;
					return s1 >= 0 && s1 <= 1 && s2 <= 0 && s2 >= -1;
				}
			}
		}
		return false;
	},

	isLinear: function(p1, h1, h2, p2) {
		var third = p2.subtract(p1).divide(3);
		return h1.equals(third) && h2.negate().equals(third);
	}
}, function(test, name) {
	this[name] = function(epsilon) {
		var seg1 = this._segment1,
			seg2 = this._segment2;
		return test(seg1._point, seg1._handleOut, seg2._handleIn, seg2._point,
				epsilon);
	};

	this.statics[name] = function(v, epsilon) {
		var x0 = v[0], y0 = v[1],
			x3 = v[6], y3 = v[7];
		return test(
				new Point(x0, y0),
				new Point(v[2] - x0, v[3] - y0),
				new Point(v[4] - x3, v[5] - y3),
				new Point(x3, y3), epsilon);
	};
}, {
	statics: {},

	hasHandles: function() {
		return !this._segment1._handleOut.isZero()
				|| !this._segment2._handleIn.isZero();
	},

	hasLength: function(epsilon) {
		return (!this.getPoint1().equals(this.getPoint2()) || this.hasHandles())
				&& this.getLength() > (epsilon || 0);
	},

	isCollinear: function(curve) {
		return curve && this.isStraight() && curve.isStraight()
				&& this.getLine().isCollinear(curve.getLine());
	},

	isHorizontal: function() {
		return this.isStraight() && Math.abs(this.getTangentAtTime(0.5).y)
				< 1e-8;
	},

	isVertical: function() {
		return this.isStraight() && Math.abs(this.getTangentAtTime(0.5).x)
				< 1e-8;
	}
}), {
	beans: false,

	getLocationAt: function(offset, _isTime) {
		return this.getLocationAtTime(
				_isTime ? offset : this.getTimeAt(offset));
	},

	getLocationAtTime: function(t) {
		return t != null && t >= 0 && t <= 1
				? new CurveLocation(this, t)
				: null;
	},

	getTimeAt: function(offset, start) {
		return Curve.getTimeAt(this.getValues(), offset, start);
	},

	getParameterAt: '#getTimeAt',

	getTimesWithTangent: function () {
		var tangent = Point.read(arguments);
		return tangent.isZero()
				? []
				: Curve.getTimesWithTangent(this.getValues(), tangent);
	},

	getOffsetAtTime: function(t) {
		return this.getPartLength(0, t);
	},

	getLocationOf: function() {
		return this.getLocationAtTime(this.getTimeOf(Point.read(arguments)));
	},

	getOffsetOf: function() {
		var loc = this.getLocationOf.apply(this, arguments);
		return loc ? loc.getOffset() : null;
	},

	getTimeOf: function() {
		return Curve.getTimeOf(this.getValues(), Point.read(arguments));
	},

	getParameterOf: '#getTimeOf',

	getNearestLocation: function() {
		var point = Point.read(arguments),
			values = this.getValues(),
			t = Curve.getNearestTime(values, point),
			pt = Curve.getPoint(values, t);
		return new CurveLocation(this, t, pt, null, point.getDistance(pt));
	},

	getNearestPoint: function() {
		var loc = this.getNearestLocation.apply(this, arguments);
		return loc ? loc.getPoint() : loc;
	}

},
new function() {
	var methods = ['getPoint', 'getTangent', 'getNormal', 'getWeightedTangent',
		'getWeightedNormal', 'getCurvature'];
	return Base.each(methods,
		function(name) {
			this[name + 'At'] = function(location, _isTime) {
				var values = this.getValues();
				return Curve[name](values, _isTime ? location
						: Curve.getTimeAt(values, location));
			};

			this[name + 'AtTime'] = function(time) {
				return Curve[name](this.getValues(), time);
			};
		}, {
			statics: {
				_evaluateMethods: methods
			}
		}
	);
},
new function() {

	function getLengthIntegrand(v) {
		var x0 = v[0], y0 = v[1],
			x1 = v[2], y1 = v[3],
			x2 = v[4], y2 = v[5],
			x3 = v[6], y3 = v[7],

			ax = 9 * (x1 - x2) + 3 * (x3 - x0),
			bx = 6 * (x0 + x2) - 12 * x1,
			cx = 3 * (x1 - x0),

			ay = 9 * (y1 - y2) + 3 * (y3 - y0),
			by = 6 * (y0 + y2) - 12 * y1,
			cy = 3 * (y1 - y0);

		return function(t) {
			var dx = (ax * t + bx) * t + cx,
				dy = (ay * t + by) * t + cy;
			return Math.sqrt(dx * dx + dy * dy);
		};
	}

	function getIterations(a, b) {
		return Math.max(2, Math.min(16, Math.ceil(Math.abs(b - a) * 32)));
	}

	function evaluate(v, t, type, normalized) {
		if (t == null || t < 0 || t > 1)
			return null;
		var x0 = v[0], y0 = v[1],
			x1 = v[2], y1 = v[3],
			x2 = v[4], y2 = v[5],
			x3 = v[6], y3 = v[7],
			isZero = Numerical.isZero;
		if (isZero(x1 - x0) && isZero(y1 - y0)) {
			x1 = x0;
			y1 = y0;
		}
		if (isZero(x2 - x3) && isZero(y2 - y3)) {
			x2 = x3;
			y2 = y3;
		}
		var cx = 3 * (x1 - x0),
			bx = 3 * (x2 - x1) - cx,
			ax = x3 - x0 - cx - bx,
			cy = 3 * (y1 - y0),
			by = 3 * (y2 - y1) - cy,
			ay = y3 - y0 - cy - by,
			x, y;
		if (type === 0) {
			x = t === 0 ? x0 : t === 1 ? x3
					: ((ax * t + bx) * t + cx) * t + x0;
			y = t === 0 ? y0 : t === 1 ? y3
					: ((ay * t + by) * t + cy) * t + y0;
		} else {
			var tMin = 1e-8,
				tMax = 1 - tMin;
			if (t < tMin) {
				x = cx;
				y = cy;
			} else if (t > tMax) {
				x = 3 * (x3 - x2);
				y = 3 * (y3 - y2);
			} else {
				x = (3 * ax * t + 2 * bx) * t + cx;
				y = (3 * ay * t + 2 * by) * t + cy;
			}
			if (normalized) {
				if (x === 0 && y === 0 && (t < tMin || t > tMax)) {
					x = x2 - x1;
					y = y2 - y1;
				}
				var len = Math.sqrt(x * x + y * y);
				if (len) {
					x /= len;
					y /= len;
				}
			}
			if (type === 3) {
				var x2 = 6 * ax * t + 2 * bx,
					y2 = 6 * ay * t + 2 * by,
					d = Math.pow(x * x + y * y, 3 / 2);
				x = d !== 0 ? (x * y2 - y * x2) / d : 0;
				y = 0;
			}
		}
		return type === 2 ? new Point(y, -x) : new Point(x, y);
	}

	return { statics: {

		classify: function(v) {

			var x0 = v[0], y0 = v[1],
				x1 = v[2], y1 = v[3],
				x2 = v[4], y2 = v[5],
				x3 = v[6], y3 = v[7],
				a1 = x0 * (y3 - y2) + y0 * (x2 - x3) + x3 * y2 - y3 * x2,
				a2 = x1 * (y0 - y3) + y1 * (x3 - x0) + x0 * y3 - y0 * x3,
				a3 = x2 * (y1 - y0) + y2 * (x0 - x1) + x1 * y0 - y1 * x0,
				d3 = 3 * a3,
				d2 = d3 - a2,
				d1 = d2 - a2 + a1,
				l = Math.sqrt(d1 * d1 + d2 * d2 + d3 * d3),
				s = l !== 0 ? 1 / l : 0,
				isZero = Numerical.isZero,
				serpentine = 'serpentine';
			d1 *= s;
			d2 *= s;
			d3 *= s;

			function type(type, t1, t2) {
				var hasRoots = t1 !== undefined,
					t1Ok = hasRoots && t1 > 0 && t1 < 1,
					t2Ok = hasRoots && t2 > 0 && t2 < 1;
				if (hasRoots && (!(t1Ok || t2Ok)
						|| type === 'loop' && !(t1Ok && t2Ok))) {
					type = 'arch';
					t1Ok = t2Ok = false;
				}
				return {
					type: type,
					roots: t1Ok || t2Ok
							? t1Ok && t2Ok
								? t1 < t2 ? [t1, t2] : [t2, t1]
								: [t1Ok ? t1 : t2]
							: null
				};
			}

			if (isZero(d1)) {
				return isZero(d2)
						? type(isZero(d3) ? 'line' : 'quadratic')
						: type(serpentine, d3 / (3 * d2));
			}
			var d = 3 * d2 * d2 - 4 * d1 * d3;
			if (isZero(d)) {
				return type('cusp', d2 / (2 * d1));
			}
			var f1 = d > 0 ? Math.sqrt(d / 3) : Math.sqrt(-d),
				f2 = 2 * d1;
			return type(d > 0 ? serpentine : 'loop',
					(d2 + f1) / f2,
					(d2 - f1) / f2);
		},

		getLength: function(v, a, b, ds) {
			if (a === undefined)
				a = 0;
			if (b === undefined)
				b = 1;
			if (Curve.isStraight(v)) {
				var c = v;
				if (b < 1) {
					c = Curve.subdivide(c, b)[0];
					a /= b;
				}
				if (a > 0) {
					c = Curve.subdivide(c, a)[1];
				}
				var dx = c[6] - c[0],
					dy = c[7] - c[1];
				return Math.sqrt(dx * dx + dy * dy);
			}
			return Numerical.integrate(ds || getLengthIntegrand(v), a, b,
					getIterations(a, b));
		},

		getTimeAt: function(v, offset, start) {
			if (start === undefined)
				start = offset < 0 ? 1 : 0;
			if (offset === 0)
				return start;
			var abs = Math.abs,
				epsilon = 1e-12,
				forward = offset > 0,
				a = forward ? start : 0,
				b = forward ? 1 : start,
				ds = getLengthIntegrand(v),
				rangeLength = Curve.getLength(v, a, b, ds),
				diff = abs(offset) - rangeLength;
			if (abs(diff) < epsilon) {
				return forward ? b : a;
			} else if (diff > epsilon) {
				return null;
			}
			var guess = offset / rangeLength,
				length = 0;
			function f(t) {
				length += Numerical.integrate(ds, start, t,
						getIterations(start, t));
				start = t;
				return length - offset;
			}
			return Numerical.findRoot(f, ds, start + guess, a, b, 32,
					1e-12);
		},

		getPoint: function(v, t) {
			return evaluate(v, t, 0, false);
		},

		getTangent: function(v, t) {
			return evaluate(v, t, 1, true);
		},

		getWeightedTangent: function(v, t) {
			return evaluate(v, t, 1, false);
		},

		getNormal: function(v, t) {
			return evaluate(v, t, 2, true);
		},

		getWeightedNormal: function(v, t) {
			return evaluate(v, t, 2, false);
		},

		getCurvature: function(v, t) {
			return evaluate(v, t, 3, false).x;
		},

		getPeaks: function(v) {
			var x0 = v[0], y0 = v[1],
				x1 = v[2], y1 = v[3],
				x2 = v[4], y2 = v[5],
				x3 = v[6], y3 = v[7],
				ax =     -x0 + 3 * x1 - 3 * x2 + x3,
				bx =  3 * x0 - 6 * x1 + 3 * x2,
				cx = -3 * x0 + 3 * x1,
				ay =     -y0 + 3 * y1 - 3 * y2 + y3,
				by =  3 * y0 - 6 * y1 + 3 * y2,
				cy = -3 * y0 + 3 * y1,
				tMin = 1e-8,
				tMax = 1 - tMin,
				roots = [];
			Numerical.solveCubic(
					9 * (ax * ax + ay * ay),
					9 * (ax * bx + by * ay),
					2 * (bx * bx + by * by) + 3 * (cx * ax + cy * ay),
					(cx * bx + by * cy),
					roots, tMin, tMax);
			return roots.sort();
		}
	}};
},
new function() {

	function addLocation(locations, include, c1, t1, c2, t2, overlap) {
		var excludeStart = !overlap && c1.getPrevious() === c2,
			excludeEnd = !overlap && c1 !== c2 && c1.getNext() === c2,
			tMin = 1e-8,
			tMax = 1 - tMin;
		if (t1 !== null && t1 >= (excludeStart ? tMin : 0) &&
			t1 <= (excludeEnd ? tMax : 1)) {
			if (t2 !== null && t2 >= (excludeEnd ? tMin : 0) &&
				t2 <= (excludeStart ? tMax : 1)) {
				var loc1 = new CurveLocation(c1, t1, null, overlap),
					loc2 = new CurveLocation(c2, t2, null, overlap);
				loc1._intersection = loc2;
				loc2._intersection = loc1;
				if (!include || include(loc1)) {
					CurveLocation.insert(locations, loc1, true);
				}
			}
		}
	}

	function addCurveIntersections(v1, v2, c1, c2, locations, include, flip,
			recursion, calls, tMin, tMax, uMin, uMax) {
		if (++calls >= 4096 || ++recursion >= 40)
			return calls;
		var fatLineEpsilon = 1e-9,
			q0x = v2[0], q0y = v2[1], q3x = v2[6], q3y = v2[7],
			getSignedDistance = Line.getSignedDistance,
			d1 = getSignedDistance(q0x, q0y, q3x, q3y, v2[2], v2[3]),
			d2 = getSignedDistance(q0x, q0y, q3x, q3y, v2[4], v2[5]),
			factor = d1 * d2 > 0 ? 3 / 4 : 4 / 9,
			dMin = factor * Math.min(0, d1, d2),
			dMax = factor * Math.max(0, d1, d2),
			dp0 = getSignedDistance(q0x, q0y, q3x, q3y, v1[0], v1[1]),
			dp1 = getSignedDistance(q0x, q0y, q3x, q3y, v1[2], v1[3]),
			dp2 = getSignedDistance(q0x, q0y, q3x, q3y, v1[4], v1[5]),
			dp3 = getSignedDistance(q0x, q0y, q3x, q3y, v1[6], v1[7]),
			hull = getConvexHull(dp0, dp1, dp2, dp3),
			top = hull[0],
			bottom = hull[1],
			tMinClip,
			tMaxClip;
		if (d1 === 0 && d2 === 0
				&& dp0 === 0 && dp1 === 0 && dp2 === 0 && dp3 === 0
			|| (tMinClip = clipConvexHull(top, bottom, dMin, dMax)) == null
			|| (tMaxClip = clipConvexHull(top.reverse(), bottom.reverse(),
				dMin, dMax)) == null)
			return calls;
		var tMinNew = tMin + (tMax - tMin) * tMinClip,
			tMaxNew = tMin + (tMax - tMin) * tMaxClip;
		if (Math.max(uMax - uMin, tMaxNew - tMinNew) < fatLineEpsilon) {
			var t = (tMinNew + tMaxNew) / 2,
				u = (uMin + uMax) / 2;
			addLocation(locations, include,
					flip ? c2 : c1, flip ? u : t,
					flip ? c1 : c2, flip ? t : u);
		} else {
			v1 = Curve.getPart(v1, tMinClip, tMaxClip);
			if (tMaxClip - tMinClip > 0.8) {
				if (tMaxNew - tMinNew > uMax - uMin) {
					var parts = Curve.subdivide(v1, 0.5),
						t = (tMinNew + tMaxNew) / 2;
					calls = addCurveIntersections(
							v2, parts[0], c2, c1, locations, include, !flip,
							recursion, calls, uMin, uMax, tMinNew, t);
					calls = addCurveIntersections(
							v2, parts[1], c2, c1, locations, include, !flip,
							recursion, calls, uMin, uMax, t, tMaxNew);
				} else {
					var parts = Curve.subdivide(v2, 0.5),
						u = (uMin + uMax) / 2;
					calls = addCurveIntersections(
							parts[0], v1, c2, c1, locations, include, !flip,
							recursion, calls, uMin, u, tMinNew, tMaxNew);
					calls = addCurveIntersections(
							parts[1], v1, c2, c1, locations, include, !flip,
							recursion, calls, u, uMax, tMinNew, tMaxNew);
				}
			} else {
				if (uMax - uMin >= fatLineEpsilon) {
					calls = addCurveIntersections(
							v2, v1, c2, c1, locations, include, !flip,
							recursion, calls, uMin, uMax, tMinNew, tMaxNew);
				} else {
					calls = addCurveIntersections(
							v1, v2, c1, c2, locations, include, flip,
							recursion, calls, tMinNew, tMaxNew, uMin, uMax);
				}
			}
		}
		return calls;
	}

	function getConvexHull(dq0, dq1, dq2, dq3) {
		var p0 = [ 0, dq0 ],
			p1 = [ 1 / 3, dq1 ],
			p2 = [ 2 / 3, dq2 ],
			p3 = [ 1, dq3 ],
			dist1 = dq1 - (2 * dq0 + dq3) / 3,
			dist2 = dq2 - (dq0 + 2 * dq3) / 3,
			hull;
		if (dist1 * dist2 < 0) {
			hull = [[p0, p1, p3], [p0, p2, p3]];
		} else {
			var distRatio = dist1 / dist2;
			hull = [
				distRatio >= 2 ? [p0, p1, p3]
				: distRatio <= 0.5 ? [p0, p2, p3]
				: [p0, p1, p2, p3],
				[p0, p3]
			];
		}
		return (dist1 || dist2) < 0 ? hull.reverse() : hull;
	}

	function clipConvexHull(hullTop, hullBottom, dMin, dMax) {
		if (hullTop[0][1] < dMin) {
			return clipConvexHullPart(hullTop, true, dMin);
		} else if (hullBottom[0][1] > dMax) {
			return clipConvexHullPart(hullBottom, false, dMax);
		} else {
			return hullTop[0][0];
		}
	}

	function clipConvexHullPart(part, top, threshold) {
		var px = part[0][0],
			py = part[0][1];
		for (var i = 1, l = part.length; i < l; i++) {
			var qx = part[i][0],
				qy = part[i][1];
			if (top ? qy >= threshold : qy <= threshold) {
				return qy === threshold ? qx
						: px + (threshold - py) * (qx - px) / (qy - py);
			}
			px = qx;
			py = qy;
		}
		return null;
	}

	function getCurveLineIntersections(v, px, py, vx, vy) {
		var isZero = Numerical.isZero;
		if (isZero(vx) && isZero(vy)) {
			var t = Curve.getTimeOf(v, new Point(px, py));
			return t === null ? [] : [t];
		}
		var angle = Math.atan2(-vy, vx),
			sin = Math.sin(angle),
			cos = Math.cos(angle),
			rv = [],
			roots = [];
		for (var i = 0; i < 8; i += 2) {
			var x = v[i] - px,
				y = v[i + 1] - py;
			rv.push(
				x * cos - y * sin,
				x * sin + y * cos);
		}
		Curve.solveCubic(rv, 1, 0, roots, 0, 1);
		return roots;
	}

	function addCurveLineIntersections(v1, v2, c1, c2, locations, include,
			flip) {
		var x1 = v2[0], y1 = v2[1],
			x2 = v2[6], y2 = v2[7],
			roots = getCurveLineIntersections(v1, x1, y1, x2 - x1, y2 - y1);
		for (var i = 0, l = roots.length; i < l; i++) {
			var t1 = roots[i],
				p1 = Curve.getPoint(v1, t1),
				t2 = Curve.getTimeOf(v2, p1);
			if (t2 !== null) {
				addLocation(locations, include,
						flip ? c2 : c1, flip ? t2 : t1,
						flip ? c1 : c2, flip ? t1 : t2);
			}
		}
	}

	function addLineIntersection(v1, v2, c1, c2, locations, include) {
		var pt = Line.intersect(
				v1[0], v1[1], v1[6], v1[7],
				v2[0], v2[1], v2[6], v2[7]);
		if (pt) {
			addLocation(locations, include,
					c1, Curve.getTimeOf(v1, pt),
					c2, Curve.getTimeOf(v2, pt));
		}
	}

	function getCurveIntersections(v1, v2, c1, c2, locations, include) {
		var epsilon = 1e-12,
			min = Math.min,
			max = Math.max;

		if (max(v1[0], v1[2], v1[4], v1[6]) + epsilon >
			min(v2[0], v2[2], v2[4], v2[6]) &&
			min(v1[0], v1[2], v1[4], v1[6]) - epsilon <
			max(v2[0], v2[2], v2[4], v2[6]) &&
			max(v1[1], v1[3], v1[5], v1[7]) + epsilon >
			min(v2[1], v2[3], v2[5], v2[7]) &&
			min(v1[1], v1[3], v1[5], v1[7]) - epsilon <
			max(v2[1], v2[3], v2[5], v2[7])) {
			var overlaps = getOverlaps(v1, v2);
			if (overlaps) {
				for (var i = 0; i < 2; i++) {
					var overlap = overlaps[i];
					addLocation(locations, include,
							c1, overlap[0],
							c2, overlap[1], true);
				}
			} else {
				var straight1 = Curve.isStraight(v1),
					straight2 = Curve.isStraight(v2),
					straight = straight1 && straight2,
					flip = straight1 && !straight2,
					before = locations.length;
				(straight
					? addLineIntersection
					: straight1 || straight2
						? addCurveLineIntersections
						: addCurveIntersections)(
							flip ? v2 : v1, flip ? v1 : v2,
							flip ? c2 : c1, flip ? c1 : c2,
							locations, include, flip,
							0, 0, 0, 1, 0, 1);
				if (!straight || locations.length === before) {
					for (var i = 0; i < 4; i++) {
						var t1 = i >> 1,
							t2 = i & 1,
							i1 = t1 * 6,
							i2 = t2 * 6,
							p1 = new Point(v1[i1], v1[i1 + 1]),
							p2 = new Point(v2[i2], v2[i2 + 1]);
						if (p1.isClose(p2, epsilon)) {
							addLocation(locations, include,
									c1, t1,
									c2, t2);
						}
					}
				}
			}
		}
		return locations;
	}

	function getLoopIntersection(v1, c1, locations, include) {
		var info = Curve.classify(v1);
		if (info.type === 'loop') {
			var roots = info.roots;
			addLocation(locations, include,
					c1, roots[0],
					c1, roots[1]);
		}
	  return locations;
	}

	function getIntersections(curves1, curves2, include, matrix1, matrix2,
			_returnFirst) {
		var self = !curves2;
		if (self)
			curves2 = curves1;
		var length1 = curves1.length,
			length2 = curves2.length,
			values2 = [],
			arrays = [],
			locations,
			current;
		for (var i = 0; i < length2; i++)
			values2[i] = curves2[i].getValues(matrix2);
		for (var i = 0; i < length1; i++) {
			var curve1 = curves1[i],
				values1 = self ? values2[i] : curve1.getValues(matrix1),
				path1 = curve1.getPath();
			if (path1 !== current) {
				current = path1;
				locations = [];
				arrays.push(locations);
			}
			if (self) {
				getLoopIntersection(values1, curve1, locations, include);
			}
			for (var j = self ? i + 1 : 0; j < length2; j++) {
				if (_returnFirst && locations.length)
					return locations;
				getCurveIntersections(values1, values2[j], curve1, curves2[j],
						locations, include);
			}
		}
		locations = [];
		for (var i = 0, l = arrays.length; i < l; i++) {
			Base.push(locations, arrays[i]);
		}
		return locations;
	}

	function getOverlaps(v1, v2) {

		function getSquaredLineLength(v) {
			var x = v[6] - v[0],
				y = v[7] - v[1];
			return x * x + y * y;
		}

		var abs = Math.abs,
			getDistance = Line.getDistance,
			timeEpsilon = 1e-8,
			geomEpsilon = 1e-7,
			straight1 = Curve.isStraight(v1),
			straight2 = Curve.isStraight(v2),
			straightBoth = straight1 && straight2,
			flip = getSquaredLineLength(v1) < getSquaredLineLength(v2),
			l1 = flip ? v2 : v1,
			l2 = flip ? v1 : v2,
			px = l1[0], py = l1[1],
			vx = l1[6] - px, vy = l1[7] - py;
		if (getDistance(px, py, vx, vy, l2[0], l2[1], true) < geomEpsilon &&
			getDistance(px, py, vx, vy, l2[6], l2[7], true) < geomEpsilon) {
			if (!straightBoth &&
				getDistance(px, py, vx, vy, l1[2], l1[3], true) < geomEpsilon &&
				getDistance(px, py, vx, vy, l1[4], l1[5], true) < geomEpsilon &&
				getDistance(px, py, vx, vy, l2[2], l2[3], true) < geomEpsilon &&
				getDistance(px, py, vx, vy, l2[4], l2[5], true) < geomEpsilon) {
				straight1 = straight2 = straightBoth = true;
			}
		} else if (straightBoth) {
			return null;
		}
		if (straight1 ^ straight2) {
			return null;
		}

		var v = [v1, v2],
			pairs = [];
		for (var i = 0; i < 4 && pairs.length < 2; i++) {
			var i1 = i & 1,
				i2 = i1 ^ 1,
				t1 = i >> 1,
				t2 = Curve.getTimeOf(v[i1], new Point(
					v[i2][t1 ? 6 : 0],
					v[i2][t1 ? 7 : 1]));
			if (t2 != null) {
				var pair = i1 ? [t1, t2] : [t2, t1];
				if (!pairs.length ||
					abs(pair[0] - pairs[0][0]) > timeEpsilon &&
					abs(pair[1] - pairs[0][1]) > timeEpsilon) {
					pairs.push(pair);
				}
			}
			if (i > 2 && !pairs.length)
				break;
		}
		if (pairs.length !== 2) {
			pairs = null;
		} else if (!straightBoth) {
			var o1 = Curve.getPart(v1, pairs[0][0], pairs[1][0]),
				o2 = Curve.getPart(v2, pairs[0][1], pairs[1][1]);
			if (abs(o2[2] - o1[2]) > geomEpsilon ||
				abs(o2[3] - o1[3]) > geomEpsilon ||
				abs(o2[4] - o1[4]) > geomEpsilon ||
				abs(o2[5] - o1[5]) > geomEpsilon)
				pairs = null;
		}
		return pairs;
	}

	function getTimesWithTangent(v, tangent) {
		var x0 = v[0], y0 = v[1],
			x1 = v[2], y1 = v[3],
			x2 = v[4], y2 = v[5],
			x3 = v[6], y3 = v[7],
			normalized = tangent.normalize(),
			tx = normalized.x,
			ty = normalized.y,
			ax = 3 * x3 - 9 * x2 + 9 * x1 - 3 * x0,
			ay = 3 * y3 - 9 * y2 + 9 * y1 - 3 * y0,
			bx = 6 * x2 - 12 * x1 + 6 * x0,
			by = 6 * y2 - 12 * y1 + 6 * y0,
			cx = 3 * x1 - 3 * x0,
			cy = 3 * y1 - 3 * y0,
			den = 2 * ax * ty - 2 * ay * tx,
			times = [];
		if (Math.abs(den) < Numerical.CURVETIME_EPSILON) {
			var num = ax * cy - ay * cx,
				den = ax * by - ay * bx;
			if (den != 0) {
				var t = -num / den;
				if (t >= 0 && t <= 1) times.push(t);
			}
		} else {
			var delta = (bx * bx - 4 * ax * cx) * ty * ty +
				(-2 * bx * by + 4 * ay * cx + 4 * ax * cy) * tx * ty +
				(by * by - 4 * ay * cy) * tx * tx,
				k = bx * ty - by * tx;
			if (delta >= 0 && den != 0) {
				var d = Math.sqrt(delta),
					t0 = -(k + d) / den,
					t1 = (-k + d) / den;
				if (t0 >= 0 && t0 <= 1) times.push(t0);
				if (t1 >= 0 && t1 <= 1) times.push(t1);
			}
		}
		return times;
	}

	return {
		getIntersections: function(curve) {
			var v1 = this.getValues(),
				v2 = curve && curve !== this && curve.getValues();
			return v2 ? getCurveIntersections(v1, v2, this, curve, [])
					  : getLoopIntersection(v1, this, []);
		},

		statics: {
			getOverlaps: getOverlaps,
			getIntersections: getIntersections,
			getCurveLineIntersections: getCurveLineIntersections,
			getTimesWithTangent: getTimesWithTangent
		}
	};
});

var CurveLocation = Base.extend({
	_class: 'CurveLocation',

	initialize: function CurveLocation(curve, time, point, _overlap, _distance) {
		if (time >= 0.99999999) {
			var next = curve.getNext();
			if (next) {
				time = 0;
				curve = next;
			}
		}
		this._setCurve(curve);
		this._time = time;
		this._point = point || curve.getPointAtTime(time);
		this._overlap = _overlap;
		this._distance = _distance;
		this._intersection = this._next = this._previous = null;
	},

	_setCurve: function(curve) {
		var path = curve._path;
		this._path = path;
		this._version = path ? path._version : 0;
		this._curve = curve;
		this._segment = null;
		this._segment1 = curve._segment1;
		this._segment2 = curve._segment2;
	},

	_setSegment: function(segment) {
		this._setCurve(segment.getCurve());
		this._segment = segment;
		this._time = segment === this._segment1 ? 0 : 1;
		this._point = segment._point.clone();
	},

	getSegment: function() {
		var segment = this._segment;
		if (!segment) {
			var curve = this.getCurve(),
				time = this.getTime();
			if (time === 0) {
				segment = curve._segment1;
			} else if (time === 1) {
				segment = curve._segment2;
			} else if (time != null) {
				segment = curve.getPartLength(0, time)
					< curve.getPartLength(time, 1)
						? curve._segment1
						: curve._segment2;
			}
			this._segment = segment;
		}
		return segment;
	},

	getCurve: function() {
		var path = this._path,
			that = this;
		if (path && path._version !== this._version) {
			this._time = this._offset = this._curveOffset = this._curve = null;
		}

		function trySegment(segment) {
			var curve = segment && segment.getCurve();
			if (curve && (that._time = curve.getTimeOf(that._point)) != null) {
				that._setCurve(curve);
				return curve;
			}
		}

		return this._curve
			|| trySegment(this._segment)
			|| trySegment(this._segment1)
			|| trySegment(this._segment2.getPrevious());
	},

	getPath: function() {
		var curve = this.getCurve();
		return curve && curve._path;
	},

	getIndex: function() {
		var curve = this.getCurve();
		return curve && curve.getIndex();
	},

	getTime: function() {
		var curve = this.getCurve(),
			time = this._time;
		return curve && time == null
			? this._time = curve.getTimeOf(this._point)
			: time;
	},

	getParameter: '#getTime',

	getPoint: function() {
		return this._point;
	},

	getOffset: function() {
		var offset = this._offset;
		if (offset == null) {
			offset = 0;
			var path = this.getPath(),
				index = this.getIndex();
			if (path && index != null) {
				var curves = path.getCurves();
				for (var i = 0; i < index; i++)
					offset += curves[i].getLength();
			}
			this._offset = offset += this.getCurveOffset();
		}
		return offset;
	},

	getCurveOffset: function() {
		var offset = this._curveOffset;
		if (offset == null) {
			var curve = this.getCurve(),
				time = this.getTime();
			this._curveOffset = offset = time != null && curve
					&& curve.getPartLength(0, time);
		}
		return offset;
	},

	getIntersection: function() {
		return this._intersection;
	},

	getDistance: function() {
		return this._distance;
	},

	divide: function() {
		var curve = this.getCurve(),
			res = curve && curve.divideAtTime(this.getTime());
		if (res) {
			this._setSegment(res._segment1);
		}
		return res;
	},

	split: function() {
		var curve = this.getCurve(),
			path = curve._path,
			res = curve && curve.splitAtTime(this.getTime());
		if (res) {
			this._setSegment(path.getLastSegment());
		}
		return  res;
	},

	equals: function(loc, _ignoreOther) {
		var res = this === loc;
		if (!res && loc instanceof CurveLocation) {
			var c1 = this.getCurve(),
				c2 = loc.getCurve(),
				p1 = c1._path,
				p2 = c2._path;
			if (p1 === p2) {
				var abs = Math.abs,
					epsilon = 1e-7,
					diff = abs(this.getOffset() - loc.getOffset()),
					i1 = !_ignoreOther && this._intersection,
					i2 = !_ignoreOther && loc._intersection;
				res = (diff < epsilon
						|| p1 && abs(p1.getLength() - diff) < epsilon)
					&& (!i1 && !i2 || i1 && i2 && i1.equals(i2, true));
			}
		}
		return res;
	},

	toString: function() {
		var parts = [],
			point = this.getPoint(),
			f = Formatter.instance;
		if (point)
			parts.push('point: ' + point);
		var index = this.getIndex();
		if (index != null)
			parts.push('index: ' + index);
		var time = this.getTime();
		if (time != null)
			parts.push('time: ' + f.number(time));
		if (this._distance != null)
			parts.push('distance: ' + f.number(this._distance));
		return '{ ' + parts.join(', ') + ' }';
	},

	isTouching: function() {
		var inter = this._intersection;
		if (inter && this.getTangent().isCollinear(inter.getTangent())) {
			var curve1 = this.getCurve(),
				curve2 = inter.getCurve();
			return !(curve1.isStraight() && curve2.isStraight()
					&& curve1.getLine().intersect(curve2.getLine()));
		}
		return false;
	},

	isCrossing: function() {
		var inter = this._intersection;
		if (!inter)
			return false;
		var t1 = this.getTime(),
			t2 = inter.getTime(),
			tMin = 1e-8,
			tMax = 1 - tMin,
			t1Inside = t1 >= tMin && t1 <= tMax,
			t2Inside = t2 >= tMin && t2 <= tMax;
		if (t1Inside && t2Inside)
			return !this.isTouching();
		var c2 = this.getCurve(),
			c1 = t1 < tMin ? c2.getPrevious() : c2,
			c4 = inter.getCurve(),
			c3 = t2 < tMin ? c4.getPrevious() : c4;
		if (t1 > tMax)
			c2 = c2.getNext();
		if (t2 > tMax)
			c4 = c4.getNext();
		if (!c1 || !c2 || !c3 || !c4)
			return false;

		var offsets = [];

		function addOffsets(curve, end) {
			var v = curve.getValues(),
				roots = Curve.classify(v).roots || Curve.getPeaks(v),
				count = roots.length,
				t = end && count > 1 ? roots[count - 1]
						: count > 0 ? roots[0]
						: 0.5;
			offsets.push(Curve.getLength(v, end ? t : 0, end ? 1 : t) / 2);
		}

		function isInRange(angle, min, max) {
			return min < max
					? angle > min && angle < max
					: angle > min || angle < max;
		}

		if (!t1Inside) {
			addOffsets(c1, true);
			addOffsets(c2, false);
		}
		if (!t2Inside) {
			addOffsets(c3, true);
			addOffsets(c4, false);
		}
		var pt = this.getPoint(),
			offset = Math.min.apply(Math, offsets),
			v2 = t1Inside ? c2.getTangentAtTime(t1)
					: c2.getPointAt(offset).subtract(pt),
			v1 = t1Inside ? v2.negate()
					: c1.getPointAt(-offset).subtract(pt),
			v4 = t2Inside ? c4.getTangentAtTime(t2)
					: c4.getPointAt(offset).subtract(pt),
			v3 = t2Inside ? v4.negate()
					: c3.getPointAt(-offset).subtract(pt),
			a1 = v1.getAngle(),
			a2 = v2.getAngle(),
			a3 = v3.getAngle(),
			a4 = v4.getAngle();
		return !!(t1Inside
				? (isInRange(a1, a3, a4) ^ isInRange(a2, a3, a4)) &&
				  (isInRange(a1, a4, a3) ^ isInRange(a2, a4, a3))
				: (isInRange(a3, a1, a2) ^ isInRange(a4, a1, a2)) &&
				  (isInRange(a3, a2, a1) ^ isInRange(a4, a2, a1)));
	},

	hasOverlap: function() {
		return !!this._overlap;
	}
}, Base.each(Curve._evaluateMethods, function(name) {
	var get = name + 'At';
	this[name] = function() {
		var curve = this.getCurve(),
			time = this.getTime();
		return time != null && curve && curve[get](time, true);
	};
}, {
	preserve: true
}),
new function() {

	function insert(locations, loc, merge) {
		var length = locations.length,
			l = 0,
			r = length - 1;

		function search(index, dir) {
			for (var i = index + dir; i >= -1 && i <= length; i += dir) {
				var loc2 = locations[((i % length) + length) % length];
				if (!loc.getPoint().isClose(loc2.getPoint(),
						1e-7))
					break;
				if (loc.equals(loc2))
					return loc2;
			}
			return null;
		}

		while (l <= r) {
			var m = (l + r) >>> 1,
				loc2 = locations[m],
				found;
			if (merge && (found = loc.equals(loc2) ? loc2
					: (search(m, -1) || search(m, 1)))) {
				if (loc._overlap) {
					found._overlap = found._intersection._overlap = true;
				}
				return found;
			}
		var path1 = loc.getPath(),
			path2 = loc2.getPath(),
			diff = path1 !== path2
				? path1._id - path2._id
				: (loc.getIndex() + loc.getTime())
				- (loc2.getIndex() + loc2.getTime());
			if (diff < 0) {
				r = m - 1;
			} else {
				l = m + 1;
			}
		}
		locations.splice(l, 0, loc);
		return loc;
	}

	return { statics: {
		insert: insert,

		expand: function(locations) {
			var expanded = locations.slice();
			for (var i = locations.length - 1; i >= 0; i--) {
				insert(expanded, locations[i]._intersection, false);
			}
			return expanded;
		}
	}};
});

var PathItem = Item.extend({
	_class: 'PathItem',
	_selectBounds: false,
	_canScaleStroke: true,
	beans: true,

	initialize: function PathItem() {
	},

	statics: {
		create: function(arg) {
			var data,
				segments,
				compound;
			if (Base.isPlainObject(arg)) {
				segments = arg.segments;
				data = arg.pathData;
			} else if (Array.isArray(arg)) {
				segments = arg;
			} else if (typeof arg === 'string') {
				data = arg;
			}
			if (segments) {
				var first = segments[0];
				compound = first && Array.isArray(first[0]);
			} else if (data) {
				compound = (data.match(/m/gi) || []).length > 1
						|| /z\s*\S+/i.test(data);
			}
			var ctor = compound ? CompoundPath : Path;
			return new ctor(arg);
		}
	},

	_asPathItem: function() {
		return this;
	},

	isClockwise: function() {
		return this.getArea() >= 0;
	},

	setClockwise: function(clockwise) {
		if (this.isClockwise() != (clockwise = !!clockwise))
			this.reverse();
	},

	setPathData: function(data) {

		var parts = data && data.match(/[mlhvcsqtaz][^mlhvcsqtaz]*/ig),
			coords,
			relative = false,
			previous,
			control,
			current = new Point(),
			start = new Point();

		function getCoord(index, coord) {
			var val = +coords[index];
			if (relative)
				val += current[coord];
			return val;
		}

		function getPoint(index) {
			return new Point(
				getCoord(index, 'x'),
				getCoord(index + 1, 'y')
			);
		}

		this.clear();

		for (var i = 0, l = parts && parts.length; i < l; i++) {
			var part = parts[i],
				command = part[0],
				lower = command.toLowerCase();
			coords = part.match(/[+-]?(?:\d*\.\d+|\d+\.?)(?:[eE][+-]?\d+)?/g);
			var length = coords && coords.length;
			relative = command === lower;
			if (previous === 'z' && !/[mz]/.test(lower))
				this.moveTo(current);
			switch (lower) {
			case 'm':
			case 'l':
				var move = lower === 'm';
				for (var j = 0; j < length; j += 2) {
					this[move ? 'moveTo' : 'lineTo'](current = getPoint(j));
					if (move) {
						start = current;
						move = false;
					}
				}
				control = current;
				break;
			case 'h':
			case 'v':
				var coord = lower === 'h' ? 'x' : 'y';
				current = current.clone();
				for (var j = 0; j < length; j++) {
					current[coord] = getCoord(j, coord);
					this.lineTo(current);
				}
				control = current;
				break;
			case 'c':
				for (var j = 0; j < length; j += 6) {
					this.cubicCurveTo(
							getPoint(j),
							control = getPoint(j + 2),
							current = getPoint(j + 4));
				}
				break;
			case 's':
				for (var j = 0; j < length; j += 4) {
					this.cubicCurveTo(
							/[cs]/.test(previous)
									? current.multiply(2).subtract(control)
									: current,
							control = getPoint(j),
							current = getPoint(j + 2));
					previous = lower;
				}
				break;
			case 'q':
				for (var j = 0; j < length; j += 4) {
					this.quadraticCurveTo(
							control = getPoint(j),
							current = getPoint(j + 2));
				}
				break;
			case 't':
				for (var j = 0; j < length; j += 2) {
					this.quadraticCurveTo(
							control = (/[qt]/.test(previous)
									? current.multiply(2).subtract(control)
									: current),
							current = getPoint(j));
					previous = lower;
				}
				break;
			case 'a':
				for (var j = 0; j < length; j += 7) {
					this.arcTo(current = getPoint(j + 5),
							new Size(+coords[j], +coords[j + 1]),
							+coords[j + 2], +coords[j + 4], +coords[j + 3]);
				}
				break;
			case 'z':
				this.closePath(1e-12);
				current = start;
				break;
			}
			previous = lower;
		}
	},

	_canComposite: function() {
		return !(this.hasFill() && this.hasStroke());
	},

	_contains: function(point) {
		var winding = point.isInside(
				this.getBounds({ internal: true, handle: true }))
					? this._getWinding(point)
					: {};
		return winding.onPath || !!(this.getFillRule() === 'evenodd'
				? winding.windingL & 1 || winding.windingR & 1
				: winding.winding);
	},

	getIntersections: function(path, include, _matrix, _returnFirst) {
		var self = this === path || !path,
			matrix1 = this._matrix._orNullIfIdentity(),
			matrix2 = self ? matrix1
				: (_matrix || path._matrix)._orNullIfIdentity();
		return self || this.getBounds(matrix1).intersects(
				path.getBounds(matrix2), 1e-12)
				? Curve.getIntersections(
						this.getCurves(), !self && path.getCurves(), include,
						matrix1, matrix2, _returnFirst)
				: [];
	},

	getCrossings: function(path) {
		return this.getIntersections(path, function(inter) {
			return inter.hasOverlap() || inter.isCrossing();
		});
	},

	getNearestLocation: function() {
		var point = Point.read(arguments),
			curves = this.getCurves(),
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

	getNearestPoint: function() {
		var loc = this.getNearestLocation.apply(this, arguments);
		return loc ? loc.getPoint() : loc;
	},

	interpolate: function(from, to, factor) {
		var isPath = !this._children,
			name = isPath ? '_segments' : '_children',
			itemsFrom = from[name],
			itemsTo = to[name],
			items = this[name];
		if (!itemsFrom || !itemsTo || itemsFrom.length !== itemsTo.length) {
			throw new Error('Invalid operands in interpolate() call: ' +
					from + ', ' + to);
		}
		var current = items.length,
			length = itemsTo.length;
		if (current < length) {
			var ctor = isPath ? Segment : Path;
			for (var i = current; i < length; i++) {
				this.add(new ctor());
			}
		} else if (current > length) {
			this[isPath ? 'removeSegments' : 'removeChildren'](length, current);
		}
		for (var i = 0; i < length; i++) {
			items[i].interpolate(itemsFrom[i], itemsTo[i], factor);
		}
		if (isPath) {
			this.setClosed(from._closed);
			this._changed(9);
		}
	},

	compare: function(path) {
		var ok = false;
		if (path) {
			var paths1 = this._children || [this],
				paths2 = path._children ? path._children.slice() : [path],
				length1 = paths1.length,
				length2 = paths2.length,
				matched = [],
				count = 0;
			ok = true;
			for (var i1 = length1 - 1; i1 >= 0 && ok; i1--) {
				var path1 = paths1[i1];
				ok = false;
				for (var i2 = length2 - 1; i2 >= 0 && !ok; i2--) {
					if (path1.compare(paths2[i2])) {
						if (!matched[i2]) {
							matched[i2] = true;
							count++;
						}
						ok = true;
					}
				}
			}
			ok = ok && count === length2;
		}
		return ok;
	},

});

var Path = PathItem.extend({
	_class: 'Path',
	_serializeFields: {
		segments: [],
		closed: false
	},

	initialize: function Path(arg) {
		this._closed = false;
		this._segments = [];
		this._version = 0;
		var segments = Array.isArray(arg)
			? typeof arg[0] === 'object'
				? arg
				: arguments
			: arg && (arg.size === undefined && (arg.x !== undefined
					|| arg.point !== undefined))
				? arguments
				: null;
		if (segments && segments.length > 0) {
			this.setSegments(segments);
		} else {
			this._curves = undefined;
			this._segmentSelection = 0;
			if (!segments && typeof arg === 'string') {
				this.setPathData(arg);
				arg = null;
			}
		}
		this._initialize(!segments && arg);
	},

	_equals: function(item) {
		return this._closed === item._closed
				&& Base.equals(this._segments, item._segments);
	},

	copyContent: function(source) {
		this.setSegments(source._segments);
		this._closed = source._closed;
	},

	_changed: function _changed(flags) {
		_changed.base.call(this, flags);
		if (flags & 8) {
			this._length = this._area = undefined;
			if (flags & 32) {
				this._version++;
			} else if (this._curves) {
			   for (var i = 0, l = this._curves.length; i < l; i++)
					this._curves[i]._changed();
			}
		} else if (flags & 64) {
			this._bounds = undefined;
		}
	},

	getStyle: function() {
		var parent = this._parent;
		return (parent instanceof CompoundPath ? parent : this)._style;
	},

	getSegments: function() {
		return this._segments;
	},

	setSegments: function(segments) {
		var fullySelected = this.isFullySelected(),
			length = segments && segments.length;
		this._segments.length = 0;
		this._segmentSelection = 0;
		this._curves = undefined;
		if (length) {
			var last = segments[length - 1];
			if (typeof last === 'boolean') {
				this.setClosed(last);
				length--;
			}
			this._add(Segment.readList(segments, 0, {}, length));
		}
		if (fullySelected)
			this.setFullySelected(true);
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
				curves[i] = new Curve(this, segments[i],
					segments[i + 1] || segments[0]);
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
					this._curves[length - 1] = new Curve(this,
						this._segments[length - 1], this._segments[0]);
			}
			this._changed(41);
		}
	}
}, {
	beans: true,

	getPathData: function(_matrix, _precision) {
		var segments = this._segments,
			length = segments.length,
			f = new Formatter(_precision),
			coords = new Array(6),
			first = true,
			curX, curY,
			prevX, prevY,
			inX, inY,
			outX, outY,
			parts = [];

		function addSegment(segment, skipLine) {
			segment._transformCoordinates(_matrix, coords);
			curX = coords[0];
			curY = coords[1];
			if (first) {
				parts.push('M' + f.pair(curX, curY));
				first = false;
			} else {
				inX = coords[2];
				inY = coords[3];
				if (inX === curX && inY === curY
						&& outX === prevX && outY === prevY) {
					if (!skipLine) {
						var dx = curX - prevX,
							dy = curY - prevY;
						parts.push(
							  dx === 0 ? 'v' + f.number(dy)
							: dy === 0 ? 'h' + f.number(dx)
							: 'l' + f.pair(dx, dy));
					}
				} else {
					parts.push('c' + f.pair(outX - prevX, outY - prevY)
							 + ' ' + f.pair( inX - prevX,  inY - prevY)
							 + ' ' + f.pair(curX - prevX, curY - prevY));
				}
			}
			prevX = curX;
			prevY = curY;
			outX = coords[4];
			outY = coords[5];
		}

		if (!length)
			return '';

		for (var i = 0; i < length; i++)
			addSegment(segments[i]);
		if (this._closed && length > 0) {
			addSegment(segments[0], true);
			parts.push('z');
		}
		return parts.join('');
	},

	isEmpty: function() {
		return !this._segments.length;
	},

	_transformContent: function(matrix) {
		var segments = this._segments,
			coords = new Array(6);
		for (var i = 0, l = segments.length; i < l; i++)
			segments[i]._transformCoordinates(matrix, coords, true);
		return true;
	},

	_add: function(segs, index) {
		var segments = this._segments,
			curves = this._curves,
			amount = segs.length,
			append = index == null,
			index = append ? segments.length : index;
		for (var i = 0; i < amount; i++) {
			var segment = segs[i];
			if (segment._path)
				segment = segs[i] = segment.clone();
			segment._path = this;
			segment._index = index + i;
			if (segment._selection)
				this._updateSelection(segment, 0, segment._selection);
		}
		if (append) {
			Base.push(segments, segs);
		} else {
			segments.splice.apply(segments, [index, 0].concat(segs));
			for (var i = index + amount, l = segments.length; i < l; i++)
				segments[i]._index = i;
		}
		if (curves) {
			var total = this._countCurves(),
				start = index > 0 && index + amount - 1 === total ? index - 1
					: index,
				insert = start,
				end = Math.min(start + amount, total);
			if (segs._curves) {
				curves.splice.apply(curves, [start, 0].concat(segs._curves));
				insert += segs._curves.length;
			}
			for (var i = insert; i < end; i++)
				curves.splice(i, 0, new Curve(this, null, null));
			this._adjustCurves(start, end);
		}
		this._changed(41);
		return segs;
	},

	_adjustCurves: function(start, end) {
		var segments = this._segments,
			curves = this._curves,
			curve;
		for (var i = start; i < end; i++) {
			curve = curves[i];
			curve._path = this;
			curve._segment1 = segments[i];
			curve._segment2 = segments[i + 1] || segments[0];
			curve._changed();
		}
		if (curve = curves[this._closed && !start ? segments.length - 1
				: start - 1]) {
			curve._segment2 = segments[start] || segments[0];
			curve._changed();
		}
		if (curve = curves[end]) {
			curve._segment1 = segments[end];
			curve._changed();
		}
	},

	_countCurves: function() {
		var length = this._segments.length;
		return !this._closed && length > 0 ? length - 1 : length;
	},

	add: function(segment1 ) {
		return arguments.length > 1 && typeof segment1 !== 'number'
			? this._add(Segment.readList(arguments))
			: this._add([ Segment.read(arguments) ])[0];
	},

	insert: function(index, segment1 ) {
		return arguments.length > 2 && typeof segment1 !== 'number'
			? this._add(Segment.readList(arguments, 1), index)
			: this._add([ Segment.read(arguments, 1) ], index)[0];
	},

	addSegment: function() {
		return this._add([ Segment.read(arguments) ])[0];
	},

	insertSegment: function(index ) {
		return this._add([ Segment.read(arguments, 1) ], index)[0];
	},

	addSegments: function(segments) {
		return this._add(Segment.readList(segments));
	},

	insertSegments: function(index, segments) {
		return this._add(Segment.readList(segments), index);
	},

	removeSegment: function(index) {
		return this.removeSegments(index, index + 1)[0] || null;
	},

	removeSegments: function(start, end, _includeCurves) {
		start = start || 0;
		end = Base.pick(end, this._segments.length);
		var segments = this._segments,
			curves = this._curves,
			count = segments.length,
			removed = segments.splice(start, end - start),
			amount = removed.length;
		if (!amount)
			return removed;
		for (var i = 0; i < amount; i++) {
			var segment = removed[i];
			if (segment._selection)
				this._updateSelection(segment, segment._selection, 0);
			segment._index = segment._path = null;
		}
		for (var i = start, l = segments.length; i < l; i++)
			segments[i]._index = i;
		if (curves) {
			var index = start > 0 && end === count + (this._closed ? 1 : 0)
					? start - 1
					: start,
				curves = curves.splice(index, amount);
			for (var i = curves.length - 1; i >= 0; i--)
				curves[i]._path = null;
			if (_includeCurves)
				removed._curves = curves.slice(1);
			this._adjustCurves(index, index);
		}
		this._changed(41);
		return removed;
	},

	clear: '#removeSegments',

	hasHandles: function() {
		var segments = this._segments;
		for (var i = 0, l = segments.length; i < l; i++) {
			if (segments[i].hasHandles())
				return true;
		}
		return false;
	},

	clearHandles: function() {
		var segments = this._segments;
		for (var i = 0, l = segments.length; i < l; i++)
			segments[i].clearHandles();
	},

	getLength: function() {
		if (this._length == null) {
			var curves = this.getCurves(),
				length = 0;
			for (var i = 0, l = curves.length; i < l; i++)
				length += curves[i].getLength();
			this._length = length;
		}
		return this._length;
	},

	getArea: function() {
		var area = this._area;
		if (area == null) {
			var segments = this._segments,
				closed = this._closed;
			area = 0;
			for (var i = 0, l = segments.length; i < l; i++) {
				var last = i + 1 === l;
				area += Curve.getArea(Curve.getValues(
						segments[i], segments[last ? 0 : i + 1],
						null, last && !closed));
			}
			this._area = area;
		}
		return area;
	},

	isFullySelected: function() {
		var length = this._segments.length;
		return this.isSelected() && length > 0 && this._segmentSelection
				=== length * 7;
	},

	setFullySelected: function(selected) {
		if (selected)
			this._selectSegments(true);
		this.setSelected(selected);
	},

	setSelection: function setSelection(selection) {
		if (!(selection & 1))
			this._selectSegments(false);
		setSelection.base.call(this, selection);
	},

	_selectSegments: function(selected) {
		var segments = this._segments,
			length = segments.length,
			selection = selected ? 7 : 0;
		this._segmentSelection = selection * length;
		for (var i = 0; i < length; i++)
			segments[i]._selection = selection;
	},

	_updateSelection: function(segment, oldSelection, newSelection) {
		segment._selection = newSelection;
		var selection = this._segmentSelection += newSelection - oldSelection;
		if (selection > 0)
			this.setSelected(true);
	},

	divideAt: function(location) {
		var loc = this.getLocationAt(location),
			curve;
		return loc && (curve = loc.getCurve().divideAt(loc.getCurveOffset()))
				? curve._segment1
				: null;
	},

	splitAt: function(location) {
		var loc = this.getLocationAt(location),
			index = loc && loc.index,
			time = loc && loc.time,
			tMin = 1e-8,
			tMax = 1 - tMin;
		if (time > tMax) {
			index++;
			time = 0;
		}
		var curves = this.getCurves();
		if (index >= 0 && index < curves.length) {
			if (time >= tMin) {
				curves[index++].divideAtTime(time);
			}
			var segs = this.removeSegments(index, this._segments.length, true),
				path;
			if (this._closed) {
				this.setClosed(false);
				path = this;
			} else {
				path = new Path(Item.NO_INSERT);
				path.insertAbove(this);
				path.copyAttributes(this);
			}
			path._add(segs, 0);
			this.addSegment(segs[0]);
			return path;
		}
		return null;
	},

	split: function(index, time) {
		var curve,
			location = time === undefined ? index
				: (curve = this.getCurves()[index])
					&& curve.getLocationAtTime(time);
		return location != null ? this.splitAt(location) : null;
	},

	join: function(path, tolerance) {
		var epsilon = tolerance || 0;
		if (path && path !== this) {
			var segments = path._segments,
				last1 = this.getLastSegment(),
				last2 = path.getLastSegment();
			if (!last2)
				return this;
			if (last1 && last1._point.isClose(last2._point, epsilon))
				path.reverse();
			var first2 = path.getFirstSegment();
			if (last1 && last1._point.isClose(first2._point, epsilon)) {
				last1.setHandleOut(first2._handleOut);
				this._add(segments.slice(1));
			} else {
				var first1 = this.getFirstSegment();
				if (first1 && first1._point.isClose(first2._point, epsilon))
					path.reverse();
				last2 = path.getLastSegment();
				if (first1 && first1._point.isClose(last2._point, epsilon)) {
					first1.setHandleIn(last2._handleIn);
					this._add(segments.slice(0, segments.length - 1), 0);
				} else {
					this._add(segments.slice());
				}
			}
			if (path._closed)
				this._add([segments[0]]);
			path.remove();
		}
		var first = this.getFirstSegment(),
			last = this.getLastSegment();
		if (first !== last && first._point.isClose(last._point, epsilon)) {
			first.setHandleIn(last._handleIn);
			last.remove();
			this.setClosed(true);
		}
		return this;
	},

	reduce: function(options) {
		var curves = this.getCurves(),
			simplify = options && options.simplify,
			tolerance = simplify ? 1e-7 : 0;
		for (var i = curves.length - 1; i >= 0; i--) {
			var curve = curves[i];
			if (!curve.hasHandles() && (!curve.hasLength(tolerance)
					|| simplify && curve.isCollinear(curve.getNext())))
				curve.remove();
		}
		return this;
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
		this._curves = null;
		this._changed(9);
	},

	flatten: function(flatness) {
		var flattener = new PathFlattener(this, flatness || 0.25, 256, true),
			parts = flattener.parts,
			length = parts.length,
			segments = [];
		for (var i = 0; i < length; i++) {
			segments.push(new Segment(parts[i].curve.slice(0, 2)));
		}
		if (!this._closed && length > 0) {
			segments.push(new Segment(parts[length - 1].curve.slice(6)));
		}
		this.setSegments(segments);
	},

	simplify: function(tolerance) {
		var segments = new PathFitter(this).fit(tolerance || 2.5);
		if (segments)
			this.setSegments(segments);
		return !!segments;
	},

	smooth: function(options) {
		var that = this,
			opts = options || {},
			type = opts.type || 'asymmetric',
			segments = this._segments,
			length = segments.length,
			closed = this._closed;

		function getIndex(value, _default) {
			var index = value && value.index;
			if (index != null) {
				var path = value.path;
				if (path && path !== that)
					throw new Error(value._class + ' ' + index + ' of ' + path
							+ ' is not part of ' + that);
				if (_default && value instanceof Curve)
					index++;
			} else {
				index = typeof value === 'number' ? value : _default;
			}
			return Math.min(index < 0 && closed
					? index % length
					: index < 0 ? index + length : index, length - 1);
		}

		var loop = closed && opts.from === undefined && opts.to === undefined,
			from = getIndex(opts.from, 0),
			to = getIndex(opts.to, length - 1);

		if (from > to) {
			if (closed) {
				from -= length;
			} else {
				var tmp = from;
				from = to;
				to = tmp;
			}
		}
		if (/^(?:asymmetric|continuous)$/.test(type)) {
			var asymmetric = type === 'asymmetric',
				min = Math.min,
				amount = to - from + 1,
				n = amount - 1,
				padding = loop ? min(amount, 4) : 1,
				paddingLeft = padding,
				paddingRight = padding,
				knots = [];
			if (!closed) {
				paddingLeft = min(1, from);
				paddingRight = min(1, length - to - 1);
			}
			n += paddingLeft + paddingRight;
			if (n <= 1)
				return;
			for (var i = 0, j = from - paddingLeft; i <= n; i++, j++) {
				knots[i] = segments[(j < 0 ? j + length : j) % length]._point;
			}

			var x = knots[0]._x + 2 * knots[1]._x,
				y = knots[0]._y + 2 * knots[1]._y,
				f = 2,
				n_1 = n - 1,
				rx = [x],
				ry = [y],
				rf = [f],
				px = [],
				py = [];
			for (var i = 1; i < n; i++) {
				var internal = i < n_1,
					a = internal ? 1 : asymmetric ? 1 : 2,
					b = internal ? 4 : asymmetric ? 2 : 7,
					u = internal ? 4 : asymmetric ? 3 : 8,
					v = internal ? 2 : asymmetric ? 0 : 1,
					m = a / f;
				f = rf[i] = b - m;
				x = rx[i] = u * knots[i]._x + v * knots[i + 1]._x - m * x;
				y = ry[i] = u * knots[i]._y + v * knots[i + 1]._y - m * y;
			}

			px[n_1] = rx[n_1] / rf[n_1];
			py[n_1] = ry[n_1] / rf[n_1];
			for (var i = n - 2; i >= 0; i--) {
				px[i] = (rx[i] - px[i + 1]) / rf[i];
				py[i] = (ry[i] - py[i + 1]) / rf[i];
			}
			px[n] = (3 * knots[n]._x - px[n_1]) / 2;
			py[n] = (3 * knots[n]._y - py[n_1]) / 2;

			for (var i = paddingLeft, max = n - paddingRight, j = from;
					i <= max; i++, j++) {
				var segment = segments[j < 0 ? j + length : j],
					pt = segment._point,
					hx = px[i] - pt._x,
					hy = py[i] - pt._y;
				if (loop || i < max)
					segment.setHandleOut(hx, hy);
				if (loop || i > paddingLeft)
					segment.setHandleIn(-hx, -hy);
			}
		} else {
			for (var i = from; i <= to; i++) {
				segments[i < 0 ? i + length : i].smooth(opts,
						!loop && i === from, !loop && i === to);
			}
		}
	},

	toShape: function(insert) {
		if (!this._closed)
			return null;

		var segments = this._segments,
			type,
			size,
			radius,
			topCenter;

		function isCollinear(i, j) {
			var seg1 = segments[i],
				seg2 = seg1.getNext(),
				seg3 = segments[j],
				seg4 = seg3.getNext();
			return seg1._handleOut.isZero() && seg2._handleIn.isZero()
					&& seg3._handleOut.isZero() && seg4._handleIn.isZero()
					&& seg2._point.subtract(seg1._point).isCollinear(
						seg4._point.subtract(seg3._point));
		}

		function isOrthogonal(i) {
			var seg2 = segments[i],
				seg1 = seg2.getPrevious(),
				seg3 = seg2.getNext();
			return seg1._handleOut.isZero() && seg2._handleIn.isZero()
					&& seg2._handleOut.isZero() && seg3._handleIn.isZero()
					&& seg2._point.subtract(seg1._point).isOrthogonal(
						seg3._point.subtract(seg2._point));
		}

		function isArc(i) {
			var seg1 = segments[i],
				seg2 = seg1.getNext(),
				handle1 = seg1._handleOut,
				handle2 = seg2._handleIn,
				kappa = 0.5522847498307936;
			if (handle1.isOrthogonal(handle2)) {
				var pt1 = seg1._point,
					pt2 = seg2._point,
					corner = new Line(pt1, handle1, true).intersect(
							new Line(pt2, handle2, true), true);
				return corner && Numerical.isZero(handle1.getLength() /
						corner.subtract(pt1).getLength() - kappa)
					&& Numerical.isZero(handle2.getLength() /
						corner.subtract(pt2).getLength() - kappa);
			}
			return false;
		}

		function getDistance(i, j) {
			return segments[i]._point.getDistance(segments[j]._point);
		}

		if (!this.hasHandles() && segments.length === 4
				&& isCollinear(0, 2) && isCollinear(1, 3) && isOrthogonal(1)) {
			type = Shape.Rectangle;
			size = new Size(getDistance(0, 3), getDistance(0, 1));
			topCenter = segments[1]._point.add(segments[2]._point).divide(2);
		} else if (segments.length === 8 && isArc(0) && isArc(2) && isArc(4)
				&& isArc(6) && isCollinear(1, 5) && isCollinear(3, 7)) {
			type = Shape.Rectangle;
			size = new Size(getDistance(1, 6), getDistance(0, 3));
			radius = size.subtract(new Size(getDistance(0, 7),
					getDistance(1, 2))).divide(2);
			topCenter = segments[3]._point.add(segments[4]._point).divide(2);
		} else if (segments.length === 4
				&& isArc(0) && isArc(1) && isArc(2) && isArc(3)) {
			if (Numerical.isZero(getDistance(0, 2) - getDistance(1, 3))) {
				type = Shape.Circle;
				radius = getDistance(0, 2) / 2;
			} else {
				type = Shape.Ellipse;
				radius = new Size(getDistance(2, 0) / 2, getDistance(3, 1) / 2);
			}
			topCenter = segments[1]._point;
		}

		if (type) {
			var center = this.getPosition(true),
				shape = new type({
					center: center,
					size: size,
					radius: radius,
					insert: false
				});
			shape.copyAttributes(this, true);
			shape._matrix.prepend(this._matrix);
			shape.rotate(topCenter.subtract(center).getAngle() + 90);
			if (insert === undefined || insert)
				shape.insertAbove(this);
			return shape;
		}
		return null;
	},

	toPath: '#clone',

	compare: function compare(path) {
		if (!path || path instanceof CompoundPath)
			return compare.base.call(this, path);
		var curves1 = this.getCurves(),
			curves2 = path.getCurves(),
			length1 = curves1.length,
			length2 = curves2.length;
		if (!length1 || !length2) {
			return length1 == length2;
		}
		var v1 = curves1[0].getValues(),
			values2 = [],
			pos1 = 0, pos2,
			end1 = 0, end2;
		for (var i = 0; i < length2; i++) {
			var v2 = curves2[i].getValues();
			values2.push(v2);
			var overlaps = Curve.getOverlaps(v1, v2);
			if (overlaps) {
				pos2 = !i && overlaps[0][0] > 0 ? length2 - 1 : i;
				end2 = overlaps[0][1];
				break;
			}
		}
		var abs = Math.abs,
			epsilon = 1e-8,
			v2 = values2[pos2],
			start2;
		while (v1 && v2) {
			var overlaps = Curve.getOverlaps(v1, v2);
			if (overlaps) {
				var t1 = overlaps[0][0];
				if (abs(t1 - end1) < epsilon) {
					end1 = overlaps[1][0];
					if (end1 === 1) {
						v1 = ++pos1 < length1 ? curves1[pos1].getValues() : null;
						end1 = 0;
					}
					var t2 = overlaps[0][1];
					if (abs(t2 - end2) < epsilon) {
						if (!start2)
							start2 = [pos2, t2];
						end2 = overlaps[1][1];
						if (end2 === 1) {
							if (++pos2 >= length2)
								pos2 = 0;
							v2 = values2[pos2] || curves2[pos2].getValues();
							end2 = 0;
						}
						if (!v1) {
							return start2[0] === pos2 && start2[1] === end2;
						}
						continue;
					}
				}
			}
			break;
		}
		return false;
	},

	_hitTestSelf: function(point, options, viewMatrix, strokeMatrix) {
		var that = this,
			style = this.getStyle(),
			segments = this._segments,
			numSegments = segments.length,
			closed = this._closed,
			tolerancePadding = options._tolerancePadding,
			strokePadding = tolerancePadding,
			join, cap, miterLimit,
			area, loc, res,
			hitStroke = options.stroke && style.hasStroke(),
			hitFill = options.fill && style.hasFill(),
			hitCurves = options.curves,
			strokeRadius = hitStroke
					? style.getStrokeWidth() / 2
					: hitFill && options.tolerance > 0 || hitCurves
						? 0 : null;
		if (strokeRadius !== null) {
			if (strokeRadius > 0) {
				join = style.getStrokeJoin();
				cap = style.getStrokeCap();
				miterLimit = style.getMiterLimit();
				strokePadding = strokePadding.add(
					Path._getStrokePadding(strokeRadius, strokeMatrix));
			} else {
				join = cap = 'round';
			}
		}

		function isCloseEnough(pt, padding) {
			return point.subtract(pt).divide(padding).length <= 1;
		}

		function checkSegmentPoint(seg, pt, name) {
			if (!options.selected || pt.isSelected()) {
				var anchor = seg._point;
				if (pt !== anchor)
					pt = pt.add(anchor);
				if (isCloseEnough(pt, strokePadding)) {
					return new HitResult(name, that, {
						segment: seg,
						point: pt
					});
				}
			}
		}

		function checkSegmentPoints(seg, ends) {
			return (ends || options.segments)
				&& checkSegmentPoint(seg, seg._point, 'segment')
				|| (!ends && options.handles) && (
					checkSegmentPoint(seg, seg._handleIn, 'handle-in') ||
					checkSegmentPoint(seg, seg._handleOut, 'handle-out'));
		}

		function addToArea(point) {
			area.add(point);
		}

		function checkSegmentStroke(segment) {
			var isJoin = closed || segment._index > 0
					&& segment._index < numSegments - 1;
			if ((isJoin ? join : cap) === 'round') {
				return isCloseEnough(segment._point, strokePadding);
			} else {
				area = new Path({ internal: true, closed: true });
				if (isJoin) {
					if (!segment.isSmooth()) {
						Path._addBevelJoin(segment, join, strokeRadius,
							   miterLimit, null, strokeMatrix, addToArea, true);
					}
				} else if (cap === 'square') {
					Path._addSquareCap(segment, cap, strokeRadius, null,
							strokeMatrix, addToArea, true);
				}
				if (!area.isEmpty()) {
					var loc;
					return area.contains(point)
						|| (loc = area.getNearestLocation(point))
							&& isCloseEnough(loc.getPoint(), tolerancePadding);
				}
			}
		}

		if (options.ends && !options.segments && !closed) {
			if (res = checkSegmentPoints(segments[0], true)
					|| checkSegmentPoints(segments[numSegments - 1], true))
				return res;
		} else if (options.segments || options.handles) {
			for (var i = 0; i < numSegments; i++)
				if (res = checkSegmentPoints(segments[i]))
					return res;
		}
		if (strokeRadius !== null) {
			loc = this.getNearestLocation(point);
			if (loc) {
				var time = loc.getTime();
				if (time === 0 || time === 1 && numSegments > 1) {
					if (!checkSegmentStroke(loc.getSegment()))
						loc = null;
				} else if (!isCloseEnough(loc.getPoint(), strokePadding)) {
					loc = null;
				}
			}
			if (!loc && join === 'miter' && numSegments > 1) {
				for (var i = 0; i < numSegments; i++) {
					var segment = segments[i];
					if (point.getDistance(segment._point)
							<= miterLimit * strokeRadius
							&& checkSegmentStroke(segment)) {
						loc = segment.getLocation();
						break;
					}
				}
			}
		}
		return !loc && hitFill && this._contains(point)
				|| loc && !hitStroke && !hitCurves
					? new HitResult('fill', this)
					: loc
						? new HitResult(hitStroke ? 'stroke' : 'curve', this, {
							location: loc,
							point: loc.getPoint()
						})
						: null;
	}

}, Base.each(Curve._evaluateMethods,
	function(name) {
		this[name + 'At'] = function(offset) {
			var loc = this.getLocationAt(offset);
			return loc && loc[name]();
		};
	},
{
	beans: false,

	getLocationOf: function() {
		var point = Point.read(arguments),
			curves = this.getCurves();
		for (var i = 0, l = curves.length; i < l; i++) {
			var loc = curves[i].getLocationOf(point);
			if (loc)
				return loc;
		}
		return null;
	},

	getOffsetOf: function() {
		var loc = this.getLocationOf.apply(this, arguments);
		return loc ? loc.getOffset() : null;
	},

	getLocationAt: function(offset) {
		if (typeof offset === 'number') {
			var curves = this.getCurves(),
				length = 0;
			for (var i = 0, l = curves.length; i < l; i++) {
				var start = length,
					curve = curves[i];
				length += curve.getLength();
				if (length > offset) {
					return curve.getLocationAt(offset - start);
				}
			}
			if (curves.length > 0 && offset <= this.getLength()) {
				return new CurveLocation(curves[curves.length - 1], 1);
			}
		} else if (offset && offset.getPath && offset.getPath() === this) {
			return offset;
		}
		return null;
	},

	getOffsetsWithTangent: function() {
		var tangent = Point.read(arguments);
		if (tangent.isZero()) {
			return [];
		}

		var offsets = [];
		var curveStart = 0;
		var curves = this.getCurves();
		for (var i = 0, l = curves.length; i < l; i++) {
			var curve = curves[i];
			var curveTimes = curve.getTimesWithTangent(tangent);
			for (var j = 0, m = curveTimes.length; j < m; j++) {
				var offset = curveStart + curve.getOffsetAtTime(curveTimes[j]);
				if (offsets.indexOf(offset) < 0) {
					offsets.push(offset);
				}
			}
			curveStart += curve.length;
		}
		return offsets;
	}
}),
new function() {

	function drawHandles(ctx, segments, matrix, size) {
		var half = size / 2,
			coords = new Array(6),
			pX, pY;

		function drawHandle(index) {
			var hX = coords[index],
				hY = coords[index + 1];
			if (pX != hX || pY != hY) {
				ctx.beginPath();
				ctx.moveTo(pX, pY);
				ctx.lineTo(hX, hY);
				ctx.stroke();
				ctx.beginPath();
				ctx.arc(hX, hY, half, 0, Math.PI * 2, true);
				ctx.fill();
			}
		}

		for (var i = 0, l = segments.length; i < l; i++) {
			var segment = segments[i],
				selection = segment._selection;
			segment._transformCoordinates(matrix, coords);
			pX = coords[0];
			pY = coords[1];
			if (selection & 2)
				drawHandle(2);
			if (selection & 4)
				drawHandle(4);
			ctx.fillRect(pX - half, pY - half, size, size);
			if (!(selection & 1)) {
				var fillStyle = ctx.fillStyle;
				ctx.fillStyle = '#ffffff';
				ctx.fillRect(pX - half + 1, pY - half + 1, size - 2, size - 2);
				ctx.fillStyle = fillStyle;
			}
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

		function drawSegment(segment) {
			if (matrix) {
				segment._transformCoordinates(matrix, coords);
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
				if (inX === curX && inY === curY
						&& outX === prevX && outY === prevY) {
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
			drawSegment(segments[i]);
		if (path._closed && length > 0)
			drawSegment(segments[0]);
	}

	return {
		_draw: function(ctx, param, viewMatrix, strokeMatrix) {
			var dontStart = param.dontStart,
				dontPaint = param.dontFinish || param.clip,
				style = this.getStyle(),
				hasFill = style.hasFill(),
				hasStroke = style.hasStroke(),
				dashArray = style.getDashArray(),
				dashLength = !paper.support.nativeDash && hasStroke
						&& dashArray && dashArray.length;

			if (!dontStart)
				ctx.beginPath();

			if (hasFill || hasStroke && !dashLength || dontPaint) {
				drawSegments(ctx, this, strokeMatrix);
				if (this._closed)
					ctx.closePath();
			}

			function getOffset(i) {
				return dashArray[((i % dashLength) + dashLength) % dashLength];
			}

			if (!dontPaint && (hasFill || hasStroke)) {
				this._setStyles(ctx, param, viewMatrix);
				if (hasFill) {
					ctx.fill(style.getFillRule());
					ctx.shadowColor = 'rgba(0,0,0,0)';
				}
				if (hasStroke) {
					if (dashLength) {
						if (!dontStart)
							ctx.beginPath();
						var flattener = new PathFlattener(this, 0.25, 32, false,
								strokeMatrix),
							length = flattener.length,
							from = -style.getDashOffset(), to,
							i = 0;
						from = from % length;
						while (from > 0) {
							from -= getOffset(i--) + getOffset(i--);
						}
						while (from < length) {
							to = from + getOffset(i++);
							if (from > 0 || to > 0)
								flattener.drawPart(ctx,
										Math.max(from, 0), Math.max(to, 0));
							from = to + getOffset(i++);
						}
					}
					ctx.stroke();
				}
			}
		},

		_drawSelected: function(ctx, matrix) {
			ctx.beginPath();
			drawSegments(ctx, this, matrix);
			ctx.stroke();
			drawHandles(ctx, this._segments, matrix, paper.settings.handleSize);
		}
	};
},
new function() {
	function getCurrentSegment(that) {
		var segments = that._segments;
		if (!segments.length)
			throw new Error('Use a moveTo() command first');
		return segments[segments.length - 1];
	}

	return {
		moveTo: function() {
			var segments = this._segments;
			if (segments.length === 1)
				this.removeSegment(0);
			if (!segments.length)
				this._add([ new Segment(Point.read(arguments)) ]);
		},

		moveBy: function() {
			throw new Error('moveBy() is unsupported on Path items.');
		},

		lineTo: function() {
			this._add([ new Segment(Point.read(arguments)) ]);
		},

		cubicCurveTo: function() {
			var handle1 = Point.read(arguments),
				handle2 = Point.read(arguments),
				to = Point.read(arguments),
				current = getCurrentSegment(this);
			current.setHandleOut(handle1.subtract(current._point));
			this._add([ new Segment(to, handle2.subtract(to)) ]);
		},

		quadraticCurveTo: function() {
			var handle = Point.read(arguments),
				to = Point.read(arguments),
				current = getCurrentSegment(this)._point;
			this.cubicCurveTo(
				handle.add(current.subtract(handle).multiply(1 / 3)),
				handle.add(to.subtract(handle).multiply(1 / 3)),
				to
			);
		},

		curveTo: function() {
			var through = Point.read(arguments),
				to = Point.read(arguments),
				t = Base.pick(Base.read(arguments), 0.5),
				t1 = 1 - t,
				current = getCurrentSegment(this)._point,
				handle = through.subtract(current.multiply(t1 * t1))
					.subtract(to.multiply(t * t)).divide(2 * t * t1);
			if (handle.isNaN())
				throw new Error(
					'Cannot put a curve through points with parameter = ' + t);
			this.quadraticCurveTo(handle, to);
		},

		arcTo: function() {
			var abs = Math.abs,
				sqrt = Math.sqrt,
				current = getCurrentSegment(this),
				from = current._point,
				to = Point.read(arguments),
				through,
				peek = Base.peek(arguments),
				clockwise = Base.pick(peek, true),
				center, extent, vector, matrix;
			if (typeof clockwise === 'boolean') {
				var middle = from.add(to).divide(2),
				through = middle.add(middle.subtract(from).rotate(
						clockwise ? -90 : 90));
			} else if (Base.remain(arguments) <= 2) {
				through = to;
				to = Point.read(arguments);
			} else {
				var radius = Size.read(arguments),
					isZero = Numerical.isZero;
				if (isZero(radius.width) || isZero(radius.height))
					return this.lineTo(to);
				var rotation = Base.read(arguments),
					clockwise = !!Base.read(arguments),
					large = !!Base.read(arguments),
					middle = from.add(to).divide(2),
					pt = from.subtract(middle).rotate(-rotation),
					x = pt.x,
					y = pt.y,
					rx = abs(radius.width),
					ry = abs(radius.height),
					rxSq = rx * rx,
					rySq = ry * ry,
					xSq = x * x,
					ySq = y * y;
				var factor = sqrt(xSq / rxSq + ySq / rySq);
				if (factor > 1) {
					rx *= factor;
					ry *= factor;
					rxSq = rx * rx;
					rySq = ry * ry;
				}
				factor = (rxSq * rySq - rxSq * ySq - rySq * xSq) /
						(rxSq * ySq + rySq * xSq);
				if (abs(factor) < 1e-12)
					factor = 0;
				if (factor < 0)
					throw new Error(
							'Cannot create an arc with the given arguments');
				center = new Point(rx * y / ry, -ry * x / rx)
						.multiply((large === clockwise ? -1 : 1) * sqrt(factor))
						.rotate(rotation).add(middle);
				matrix = new Matrix().translate(center).rotate(rotation)
						.scale(rx, ry);
				vector = matrix._inverseTransform(from);
				extent = vector.getDirectedAngle(matrix._inverseTransform(to));
				if (!clockwise && extent > 0)
					extent -= 360;
				else if (clockwise && extent < 0)
					extent += 360;
			}
			if (through) {
				var l1 = new Line(from.add(through).divide(2),
							through.subtract(from).rotate(90), true),
					l2 = new Line(through.add(to).divide(2),
							to.subtract(through).rotate(90), true),
					line = new Line(from, to),
					throughSide = line.getSide(through);
				center = l1.intersect(l2, true);
				if (!center) {
					if (!throughSide)
						return this.lineTo(to);
					throw new Error(
							'Cannot create an arc with the given arguments');
				}
				vector = from.subtract(center);
				extent = vector.getDirectedAngle(to.subtract(center));
				var centerSide = line.getSide(center, true);
				if (centerSide === 0) {
					extent = throughSide * abs(extent);
				} else if (throughSide === centerSide) {
					extent += extent < 0 ? 360 : -360;
				}
			}
			var epsilon = 1e-7,
				ext = abs(extent),
				count = ext >= 360 ? 4 : Math.ceil((ext - epsilon) / 90),
				inc = extent / count,
				half = inc * Math.PI / 360,
				z = 4 / 3 * Math.sin(half) / (1 + Math.cos(half)),
				segments = [];
			for (var i = 0; i <= count; i++) {
				var pt = to,
					out = null;
				if (i < count) {
					out = vector.rotate(90).multiply(z);
					if (matrix) {
						pt = matrix._transformPoint(vector);
						out = matrix._transformPoint(vector.add(out))
								.subtract(pt);
					} else {
						pt = center.add(vector);
					}
				}
				if (!i) {
					current.setHandleOut(out);
				} else {
					var _in = vector.rotate(-90).multiply(z);
					if (matrix) {
						_in = matrix._transformPoint(vector.add(_in))
								.subtract(pt);
					}
					segments.push(new Segment(pt, _in, out));
				}
				vector = vector.rotate(inc);
			}
			this._add(segments);
		},

		lineBy: function() {
			var to = Point.read(arguments),
				current = getCurrentSegment(this)._point;
			this.lineTo(current.add(to));
		},

		curveBy: function() {
			var through = Point.read(arguments),
				to = Point.read(arguments),
				parameter = Base.read(arguments),
				current = getCurrentSegment(this)._point;
			this.curveTo(current.add(through), current.add(to), parameter);
		},

		cubicCurveBy: function() {
			var handle1 = Point.read(arguments),
				handle2 = Point.read(arguments),
				to = Point.read(arguments),
				current = getCurrentSegment(this)._point;
			this.cubicCurveTo(current.add(handle1), current.add(handle2),
					current.add(to));
		},

		quadraticCurveBy: function() {
			var handle = Point.read(arguments),
				to = Point.read(arguments),
				current = getCurrentSegment(this)._point;
			this.quadraticCurveTo(current.add(handle), current.add(to));
		},

		arcBy: function() {
			var current = getCurrentSegment(this)._point,
				point = current.add(Point.read(arguments)),
				clockwise = Base.pick(Base.peek(arguments), true);
			if (typeof clockwise === 'boolean') {
				this.arcTo(point, clockwise);
			} else {
				this.arcTo(point, current.add(Point.read(arguments)));
			}
		},

		closePath: function(tolerance) {
			this.setClosed(true);
			this.join(this, tolerance);
		}
	};
}, {

	_getBounds: function(matrix, options) {
		var method = options.handle
				? 'getHandleBounds'
				: options.stroke
				? 'getStrokeBounds'
				: 'getBounds';
		return Path[method](this._segments, this._closed, this, matrix, options);
	},

statics: {
	getBounds: function(segments, closed, path, matrix, options, strokePadding) {
		var first = segments[0];
		if (!first)
			return new Rectangle();
		var coords = new Array(6),
			prevCoords = first._transformCoordinates(matrix, new Array(6)),
			min = prevCoords.slice(0, 2),
			max = min.slice(),
			roots = new Array(2);

		function processSegment(segment) {
			segment._transformCoordinates(matrix, coords);
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
		return new Rectangle(min[0], min[1], max[0] - min[0], max[1] - min[1]);
	},

	getStrokeBounds: function(segments, closed, path, matrix, options) {
		var style = path.getStyle(),
			stroke = style.hasStroke(),
			strokeWidth = style.getStrokeWidth(),
			strokeMatrix = stroke && path._getStrokeMatrix(matrix, options),
			strokePadding = stroke && Path._getStrokePadding(strokeWidth,
				strokeMatrix),
			bounds = Path.getBounds(segments, closed, path, matrix, options,
				strokePadding);
		if (!stroke)
			return bounds;
		var strokeRadius = strokeWidth / 2,
			join = style.getStrokeJoin(),
			cap = style.getStrokeCap(),
			miterLimit = style.getMiterLimit(),
			joinBounds = new Rectangle(new Size(strokePadding));

		function addPoint(point) {
			bounds = bounds.include(point);
		}

		function addRound(segment) {
			bounds = bounds.unite(
					joinBounds.setCenter(segment._point.transform(matrix)));
		}

		function addJoin(segment, join) {
			if (join === 'round' || segment.isSmooth()) {
				addRound(segment);
			} else {
				Path._addBevelJoin(segment, join, strokeRadius, miterLimit,
						matrix, strokeMatrix, addPoint);
			}
		}

		function addCap(segment, cap) {
			if (cap === 'round') {
				addRound(segment);
			} else {
				Path._addSquareCap(segment, cap, strokeRadius, matrix,
						strokeMatrix, addPoint);
			}
		}

		var length = segments.length - (closed ? 0 : 1);
		for (var i = 1; i < length; i++)
			addJoin(segments[i], join);
		if (closed) {
			addJoin(segments[0], join);
		} else if (length > 0) {
			addCap(segments[0], cap);
			addCap(segments[segments.length - 1], cap);
		}
		return bounds;
	},

	_getStrokePadding: function(radius, matrix) {
		if (!matrix)
			return [radius, radius];
		var hor = new Point(radius, 0).transform(matrix),
			ver = new Point(0, radius).transform(matrix),
			phi = hor.getAngleInRadians(),
			a = hor.getLength(),
			b = ver.getLength();
		var sin = Math.sin(phi),
			cos = Math.cos(phi),
			tan = Math.tan(phi),
			tx = Math.atan2(b * tan, a),
			ty = Math.atan2(b, tan * a);
		return [Math.abs(a * Math.cos(tx) * cos + b * Math.sin(tx) * sin),
				Math.abs(b * Math.sin(ty) * cos + a * Math.cos(ty) * sin)];
	},

	_addBevelJoin: function(segment, join, radius, miterLimit, matrix,
			strokeMatrix, addPoint, isArea) {
		var curve2 = segment.getCurve(),
			curve1 = curve2.getPrevious(),
			point = curve2.getPoint1().transform(matrix),
			normal1 = curve1.getNormalAtTime(1).multiply(radius)
				.transform(strokeMatrix),
			normal2 = curve2.getNormalAtTime(0).multiply(radius)
				.transform(strokeMatrix);
		if (normal1.getDirectedAngle(normal2) < 0) {
			normal1 = normal1.negate();
			normal2 = normal2.negate();
		}
		if (isArea)
			addPoint(point);
		addPoint(point.add(normal1));
		if (join === 'miter') {
			var corner = new Line(point.add(normal1),
					new Point(-normal1.y, normal1.x), true
				).intersect(new Line(point.add(normal2),
					new Point(-normal2.y, normal2.x), true
				), true);
			if (corner && point.getDistance(corner) <= miterLimit * radius) {
				addPoint(corner);
			}
		}
		addPoint(point.add(normal2));
	},

	_addSquareCap: function(segment, cap, radius, matrix, strokeMatrix,
			addPoint, isArea) {
		var point = segment._point.transform(matrix),
			loc = segment.getLocation(),
			normal = loc.getNormal()
					.multiply(loc.getTime() === 0 ? radius : -radius)
					.transform(strokeMatrix);
		if (cap === 'square') {
			if (isArea) {
				addPoint(point.subtract(normal));
				addPoint(point.add(normal));
			}
			point = point.add(normal.rotate(-90));
		}
		addPoint(point.add(normal));
		addPoint(point.subtract(normal));
	},

	getHandleBounds: function(segments, closed, path, matrix, options) {
		var style = path.getStyle(),
			stroke = options.stroke && style.hasStroke(),
			strokePadding,
			joinPadding;
		if (stroke) {
			var strokeMatrix = path._getStrokeMatrix(matrix, options),
				strokeRadius = style.getStrokeWidth() / 2,
				joinRadius = strokeRadius;
			if (style.getStrokeJoin() === 'miter')
				joinRadius = strokeRadius * style.getMiterLimit();
			if (style.getStrokeCap() === 'square')
				joinRadius = Math.max(joinRadius, strokeRadius * Math.SQRT2);
			strokePadding = Path._getStrokePadding(strokeRadius, strokeMatrix);
			joinPadding = Path._getStrokePadding(joinRadius, strokeMatrix);
		}
		var coords = new Array(6),
			x1 = Infinity,
			x2 = -x1,
			y1 = x1,
			y2 = x2;
		for (var i = 0, l = segments.length; i < l; i++) {
			var segment = segments[i];
			segment._transformCoordinates(matrix, coords);
			for (var j = 0; j < 6; j += 2) {
				var padding = !j ? joinPadding : strokePadding,
					paddingX = padding ? padding[0] : 0,
					paddingY = padding ? padding[1] : 0,
					x = coords[j],
					y = coords[j + 1],
					xn = x - paddingX,
					xx = x + paddingX,
					yn = y - paddingY,
					yx = y + paddingY;
				if (xn < x1) x1 = xn;
				if (xx > x2) x2 = xx;
				if (yn < y1) y1 = yn;
				if (yx > y2) y2 = yx;
			}
		}
		return new Rectangle(x1, y1, x2 - x1, y2 - y1);
	}
}});

Path.inject({ statics: new function() {

	var kappa = 0.5522847498307936,
		ellipseSegments = [
			new Segment([-1, 0], [0, kappa ], [0, -kappa]),
			new Segment([0, -1], [-kappa, 0], [kappa, 0 ]),
			new Segment([1, 0], [0, -kappa], [0, kappa ]),
			new Segment([0, 1], [kappa, 0 ], [-kappa, 0])
		];

	function createPath(segments, closed, args) {
		var props = Base.getNamed(args),
			path = new Path(props && props.insert == false && Item.NO_INSERT);
		path._add(segments);
		path._closed = closed;
		return path.set(props, { insert: true });
	}

	function createEllipse(center, radius, args) {
		var segments = new Array(4);
		for (var i = 0; i < 4; i++) {
			var segment = ellipseSegments[i];
			segments[i] = new Segment(
				segment._point.multiply(radius).add(center),
				segment._handleIn.multiply(radius),
				segment._handleOut.multiply(radius)
			);
		}
		return createPath(segments, true, args);
	}

	return {
		Line: function() {
			return createPath([
				new Segment(Point.readNamed(arguments, 'from')),
				new Segment(Point.readNamed(arguments, 'to'))
			], false, arguments);
		},

		Circle: function() {
			var center = Point.readNamed(arguments, 'center'),
				radius = Base.readNamed(arguments, 'radius');
			return createEllipse(center, new Size(radius), arguments);
		},

		Rectangle: function() {
			var rect = Rectangle.readNamed(arguments, 'rectangle'),
				radius = Size.readNamed(arguments, 'radius', 0,
						{ readNull: true }),
				bl = rect.getBottomLeft(true),
				tl = rect.getTopLeft(true),
				tr = rect.getTopRight(true),
				br = rect.getBottomRight(true),
				segments;
			if (!radius || radius.isZero()) {
				segments = [
					new Segment(bl),
					new Segment(tl),
					new Segment(tr),
					new Segment(br)
				];
			} else {
				radius = Size.min(radius, rect.getSize(true).divide(2));
				var rx = radius.width,
					ry = radius.height,
					hx = rx * kappa,
					hy = ry * kappa;
				segments = [
					new Segment(bl.add(rx, 0), null, [-hx, 0]),
					new Segment(bl.subtract(0, ry), [0, hy]),
					new Segment(tl.add(0, ry), null, [0, -hy]),
					new Segment(tl.add(rx, 0), [-hx, 0], null),
					new Segment(tr.subtract(rx, 0), null, [hx, 0]),
					new Segment(tr.add(0, ry), [0, -hy], null),
					new Segment(br.subtract(0, ry), null, [0, hy]),
					new Segment(br.subtract(rx, 0), [hx, 0])
				];
			}
			return createPath(segments, true, arguments);
		},

		RoundRectangle: '#Rectangle',

		Ellipse: function() {
			var ellipse = Shape._readEllipse(arguments);
			return createEllipse(ellipse.center, ellipse.radius, arguments);
		},

		Oval: '#Ellipse',

		Arc: function() {
			var from = Point.readNamed(arguments, 'from'),
				through = Point.readNamed(arguments, 'through'),
				to = Point.readNamed(arguments, 'to'),
				props = Base.getNamed(arguments),
				path = new Path(props && props.insert == false
						&& Item.NO_INSERT);
			path.moveTo(from);
			path.arcTo(through, to);
			return path.set(props);
		},

		RegularPolygon: function() {
			var center = Point.readNamed(arguments, 'center'),
				sides = Base.readNamed(arguments, 'sides'),
				radius = Base.readNamed(arguments, 'radius'),
				step = 360 / sides,
				three = sides % 3 === 0,
				vector = new Point(0, three ? -radius : radius),
				offset = three ? -1 : 0.5,
				segments = new Array(sides);
			for (var i = 0; i < sides; i++)
				segments[i] = new Segment(center.add(
					vector.rotate((i + offset) * step)));
			return createPath(segments, true, arguments);
		},

		Star: function() {
			var center = Point.readNamed(arguments, 'center'),
				points = Base.readNamed(arguments, 'points') * 2,
				radius1 = Base.readNamed(arguments, 'radius1'),
				radius2 = Base.readNamed(arguments, 'radius2'),
				step = 360 / points,
				vector = new Point(0, -1),
				segments = new Array(points);
			for (var i = 0; i < points; i++)
				segments[i] = new Segment(center.add(vector.rotate(step * i)
						.multiply(i % 2 ? radius2 : radius1)));
			return createPath(segments, true, arguments);
		}
	};
}});

var CompoundPath = PathItem.extend({
	_class: 'CompoundPath',
	_serializeFields: {
		children: []
	},
	beans: true,

	initialize: function CompoundPath(arg) {
		this._children = [];
		this._namedChildren = {};
		if (!this._initialize(arg)) {
			if (typeof arg === 'string') {
				this.setPathData(arg);
			} else {
				this.addChildren(Array.isArray(arg) ? arg : arguments);
			}
		}
	},

	insertChildren: function insertChildren(index, items) {
		var list = items,
			first = list[0];
		if (first && typeof first[0] === 'number')
			list = [list];
		for (var i = items.length - 1; i >= 0; i--) {
			var item = list[i];
			if (list === items && !(item instanceof Path))
				list = Base.slice(list);
			if (Array.isArray(item)) {
				list[i] = new Path({ segments: item, insert: false });
			} else if (item instanceof CompoundPath) {
				list.splice.apply(list, [i, 1].concat(item.removeChildren()));
				item.remove();
			}
		}
		return insertChildren.base.call(this, index, list);
	},

	reduce: function reduce(options) {
		var children = this._children;
		for (var i = children.length - 1; i >= 0; i--) {
			var path = children[i].reduce(options);
			if (path.isEmpty())
				path.remove();
		}
		if (!children.length) {
			var path = new Path(Item.NO_INSERT);
			path.copyAttributes(this);
			path.insertAbove(this);
			this.remove();
			return path;
		}
		return reduce.base.call(this);
	},

	isClosed: function() {
		var children = this._children;
		for (var i = 0, l = children.length; i < l; i++) {
			if (!children[i]._closed)
				return false;
		}
		return true;
	},

	setClosed: function(closed) {
		var children = this._children;
		for (var i = 0, l = children.length; i < l; i++) {
			children[i].setClosed(closed);
		}
	},

	getFirstSegment: function() {
		var first = this.getFirstChild();
		return first && first.getFirstSegment();
	},

	getLastSegment: function() {
		var last = this.getLastChild();
		return last && last.getLastSegment();
	},

	getCurves: function() {
		var children = this._children,
			curves = [];
		for (var i = 0, l = children.length; i < l; i++) {
			Base.push(curves, children[i].getCurves());
		}
		return curves;
	},

	getFirstCurve: function() {
		var first = this.getFirstChild();
		return first && first.getFirstCurve();
	},

	getLastCurve: function() {
		var last = this.getLastChild();
		return last && last.getLastCurve();
	},

	getArea: function() {
		var children = this._children,
			area = 0;
		for (var i = 0, l = children.length; i < l; i++)
			area += children[i].getArea();
		return area;
	},

	getLength: function() {
		var children = this._children,
			length = 0;
		for (var i = 0, l = children.length; i < l; i++)
			length += children[i].getLength();
		return length;
	},

	getPathData: function(_matrix, _precision) {
		var children = this._children,
			paths = [];
		for (var i = 0, l = children.length; i < l; i++) {
			var child = children[i],
				mx = child._matrix;
			paths.push(child.getPathData(_matrix && !mx.isIdentity()
					? _matrix.appended(mx) : _matrix, _precision));
		}
		return paths.join('');
	},

	_hitTestChildren: function _hitTestChildren(point, options, viewMatrix) {
		return _hitTestChildren.base.call(this, point,
				options.class === Path || options.type === 'path' ? options
					: Base.set({}, options, { fill: false }),
				viewMatrix);
	},

	_draw: function(ctx, param, viewMatrix, strokeMatrix) {
		var children = this._children;
		if (!children.length)
			return;

		param = param.extend({ dontStart: true, dontFinish: true });
		ctx.beginPath();
		for (var i = 0, l = children.length; i < l; i++)
			children[i].draw(ctx, param, strokeMatrix);

		if (!param.clip) {
			this._setStyles(ctx, param, viewMatrix);
			var style = this._style;
			if (style.hasFill()) {
				ctx.fill(style.getFillRule());
				ctx.shadowColor = 'rgba(0,0,0,0)';
			}
			if (style.hasStroke())
				ctx.stroke();
		}
	},

	_drawSelected: function(ctx, matrix, selectionItems) {
		var children = this._children;
		for (var i = 0, l = children.length; i < l; i++) {
			var child = children[i],
				mx = child._matrix;
			if (!selectionItems[child._id]) {
				child._drawSelected(ctx, mx.isIdentity() ? matrix
						: matrix.appended(mx));
			}
		}
	}
},
new function() {
	function getCurrentPath(that, check) {
		var children = that._children;
		if (check && !children.length)
			throw new Error('Use a moveTo() command first');
		return children[children.length - 1];
	}

	return Base.each(['lineTo', 'cubicCurveTo', 'quadraticCurveTo', 'curveTo',
			'arcTo', 'lineBy', 'cubicCurveBy', 'quadraticCurveBy', 'curveBy',
			'arcBy'],
		function(key) {
			this[key] = function() {
				var path = getCurrentPath(this, true);
				path[key].apply(path, arguments);
			};
		}, {
			moveTo: function() {
				var current = getCurrentPath(this),
					path = current && current.isEmpty() ? current
							: new Path(Item.NO_INSERT);
				if (path !== current)
					this.addChild(path);
				path.moveTo.apply(path, arguments);
			},

			moveBy: function() {
				var current = getCurrentPath(this, true),
					last = current && current.getLastSegment(),
					point = Point.read(arguments);
				this.moveTo(last ? point.add(last._point) : point);
			},

			closePath: function(tolerance) {
				getCurrentPath(this, true).closePath(tolerance);
			}
		}
	);
}, Base.each(['reverse', 'flatten', 'simplify', 'smooth'], function(key) {
	this[key] = function(param) {
		var children = this._children,
			res;
		for (var i = 0, l = children.length; i < l; i++) {
			res = children[i][key](param) || res;
		}
		return res;
	};
}, {}));

PathItem.inject(new function() {
	var min = Math.min,
		max = Math.max,
		abs = Math.abs,
		operators = {
			unite:     { '1': true, '2': true },
			intersect: { '2': true },
			subtract:  { '1': true },
			exclude:   { '1': true, '-1': true }
		};

	function preparePath(path, resolve) {
		var res = path.clone(false).reduce({ simplify: true })
				.transform(null, true, true);
		return resolve
				? res.resolveCrossings().reorient(
					res.getFillRule() === 'nonzero', true)
				: res;
	}

	function createResult(paths, simplify, path1, path2, options) {
		var result = new CompoundPath(Item.NO_INSERT);
		result.addChildren(paths, true);
		result = result.reduce({ simplify: simplify });
		if (!(options && options.insert == false)) {
			result.insertAbove(path2 && path1.isSibling(path2)
					&& path1.getIndex() < path2.getIndex() ? path2 : path1);
		}
		result.copyAttributes(path1, true);
		return result;
	}

	function traceBoolean(path1, path2, operation, options) {
		if (options && (options.trace == false || options.stroke) &&
				/^(subtract|intersect)$/.test(operation))
			return splitBoolean(path1, path2, operation);
		var _path1 = preparePath(path1, true),
			_path2 = path2 && path1 !== path2 && preparePath(path2, true),
			operator = operators[operation];
		operator[operation] = true;
		if (_path2 && (operator.subtract || operator.exclude)
				^ (_path2.isClockwise() ^ _path1.isClockwise()))
			_path2.reverse();
		var crossings = divideLocations(
				CurveLocation.expand(_path1.getCrossings(_path2))),
			paths1 = _path1._children || [_path1],
			paths2 = _path2 && (_path2._children || [_path2]),
			segments = [],
			curves = [],
			paths;

		function collect(paths) {
			for (var i = 0, l = paths.length; i < l; i++) {
				var path = paths[i];
				Base.push(segments, path._segments);
				Base.push(curves, path.getCurves());
				path._overlapsOnly = true;
			}
		}

		if (crossings.length) {
			collect(paths1);
			if (paths2)
				collect(paths2);
			for (var i = 0, l = crossings.length; i < l; i++) {
				propagateWinding(crossings[i]._segment, _path1, _path2, curves,
						operator);
			}
			for (var i = 0, l = segments.length; i < l; i++) {
				var segment = segments[i],
					inter = segment._intersection;
				if (!segment._winding) {
					propagateWinding(segment, _path1, _path2, curves, operator);
				}
				if (!(inter && inter._overlap))
					segment._path._overlapsOnly = false;
			}
			paths = tracePaths(segments, operator);
		} else {
			paths = reorientPaths(
					paths2 ? paths1.concat(paths2) : paths1.slice(),
					function(w) {
						return !!operator[w];
					});
		}

		return createResult(paths, true, path1, path2, options);
	}

	function splitBoolean(path1, path2, operation) {
		var _path1 = preparePath(path1),
			_path2 = preparePath(path2),
			crossings = _path1.getCrossings(_path2),
			subtract = operation === 'subtract',
			divide = operation === 'divide',
			added = {},
			paths = [];

		function addPath(path) {
			if (!added[path._id] && (divide ||
					_path2.contains(path.getPointAt(path.getLength() / 2))
						^ subtract)) {
				paths.unshift(path);
				return added[path._id] = true;
			}
		}

		for (var i = crossings.length - 1; i >= 0; i--) {
			var path = crossings[i].split();
			if (path) {
				if (addPath(path))
					path.getFirstSegment().setHandleIn(0, 0);
				_path1.getLastSegment().setHandleOut(0, 0);
			}
		}
		addPath(_path1);
		return createResult(paths, false, path1, path2);
	}

	function linkIntersections(from, to) {
		var prev = from;
		while (prev) {
			if (prev === to)
				return;
			prev = prev._previous;
		}
		while (from._next && from._next !== to)
			from = from._next;
		if (!from._next) {
			while (to._previous)
				to = to._previous;
			from._next = to;
			to._previous = from;
		}
	}

	function clearCurveHandles(curves) {
		for (var i = curves.length - 1; i >= 0; i--)
			curves[i].clearHandles();
	}

	function reorientPaths(paths, isInside, clockwise) {
		var length = paths && paths.length;
		if (length) {
			var lookup = Base.each(paths, function (path, i) {
					this[path._id] = {
						container: null,
						winding: path.isClockwise() ? 1 : -1,
						index: i
					};
				}, {}),
				sorted = paths.slice().sort(function (a, b) {
					return abs(b.getArea()) - abs(a.getArea());
				}),
				first = sorted[0];
			if (clockwise == null)
				clockwise = first.isClockwise();
			for (var i = 0; i < length; i++) {
				var path1 = sorted[i],
					entry1 = lookup[path1._id],
					point = path1.getInteriorPoint(),
					containerWinding = 0;
				for (var j = i - 1; j >= 0; j--) {
					var path2 = sorted[j];
					if (path2.contains(point)) {
						var entry2 = lookup[path2._id];
						containerWinding = entry2.winding;
						entry1.winding += containerWinding;
						entry1.container = entry2.exclude ? entry2.container
								: path2;
						break;
					}
				}
				if (isInside(entry1.winding) === isInside(containerWinding)) {
					entry1.exclude = true;
					paths[entry1.index] = null;
				} else {
					var container = entry1.container;
					path1.setClockwise(container ? !container.isClockwise()
							: clockwise);
				}
			}
		}
		return paths;
	}

	function divideLocations(locations, include, clearLater) {
		var results = include && [],
			tMin = 1e-8,
			tMax = 1 - tMin,
			clearHandles = false,
			clearCurves = clearLater || [],
			clearLookup = clearLater && {},
			renormalizeLocs,
			prevCurve,
			prevTime;

		function getId(curve) {
			return curve._path._id + '.' + curve._segment1._index;
		}

		for (var i = (clearLater && clearLater.length) - 1; i >= 0; i--) {
			var curve = clearLater[i];
			if (curve._path)
				clearLookup[getId(curve)] = true;
		}

		for (var i = locations.length - 1; i >= 0; i--) {
			var loc = locations[i],
				time = loc._time,
				origTime = time,
				exclude = include && !include(loc),
				curve = loc._curve,
				segment;
			if (curve) {
				if (curve !== prevCurve) {
					clearHandles = !curve.hasHandles()
							|| clearLookup && clearLookup[getId(curve)];
					renormalizeLocs = [];
					prevTime = null;
					prevCurve = curve;
				} else if (prevTime >= tMin) {
					time /= prevTime;
				}
			}
			if (exclude) {
				if (renormalizeLocs)
					renormalizeLocs.push(loc);
				continue;
			} else if (include) {
				results.unshift(loc);
			}
			prevTime = origTime;
			if (time < tMin) {
				segment = curve._segment1;
			} else if (time > tMax) {
				segment = curve._segment2;
			} else {
				var newCurve = curve.divideAtTime(time, true);
				if (clearHandles)
					clearCurves.push(curve, newCurve);
				segment = newCurve._segment1;
				for (var j = renormalizeLocs.length - 1; j >= 0; j--) {
					var l = renormalizeLocs[j];
					l._time = (l._time - time) / (1 - time);
				}
			}
			loc._setSegment(segment);
			var inter = segment._intersection,
				dest = loc._intersection;
			if (inter) {
				linkIntersections(inter, dest);
				var other = inter;
				while (other) {
					linkIntersections(other._intersection, inter);
					other = other._next;
				}
			} else {
				segment._intersection = dest;
			}
		}
		if (!clearLater)
			clearCurveHandles(clearCurves);
		return results || locations;
	}

	function getWinding(point, curves, dir, closed, dontFlip) {
		var ia = dir ? 1 : 0,
			io = ia ^ 1,
			pv = [point.x, point.y],
			pa = pv[ia],
			po = pv[io],
			windingEpsilon = 1e-9,
			qualityEpsilon = 1e-6,
			paL = pa - windingEpsilon,
			paR = pa + windingEpsilon,
			windingL = 0,
			windingR = 0,
			pathWindingL = 0,
			pathWindingR = 0,
			onPath = false,
			onAnyPath = false,
			quality = 1,
			roots = [],
			vPrev,
			vClose;

		function addWinding(v) {
			var o0 = v[io + 0],
				o3 = v[io + 6];
			if (po < min(o0, o3) || po > max(o0, o3)) {
				return;
			}
			var a0 = v[ia + 0],
				a1 = v[ia + 2],
				a2 = v[ia + 4],
				a3 = v[ia + 6];
			if (o0 === o3) {
				if (a0 < paR && a3 > paL || a3 < paR && a0 > paL) {
					onPath = true;
				}
				return;
			}
			var t =   po === o0 ? 0
					: po === o3 ? 1
					: paL > max(a0, a1, a2, a3) || paR < min(a0, a1, a2, a3)
					? 1
					: Curve.solveCubic(v, io, po, roots, 0, 1) > 0
						? roots[0]
						: 1,
				a =   t === 0 ? a0
					: t === 1 ? a3
					: Curve.getPoint(v, t)[dir ? 'y' : 'x'],
				winding = o0 > o3 ? 1 : -1,
				windingPrev = vPrev[io] > vPrev[io + 6] ? 1 : -1,
				a3Prev = vPrev[ia + 6];
			if (po !== o0) {
				if (a < paL) {
					pathWindingL += winding;
				} else if (a > paR) {
					pathWindingR += winding;
				} else {
					onPath = true;
				}
				if (a > pa - qualityEpsilon && a < pa + qualityEpsilon)
					quality /= 2;
			} else {
				if (winding !== windingPrev) {
					if (a0 < paL) {
						pathWindingL += winding;
					} else if (a0 > paR) {
						pathWindingR += winding;
					}
				} else if (a0 != a3Prev) {
					if (a3Prev < paR && a > paR) {
						pathWindingR += winding;
						onPath = true;
					} else if (a3Prev > paL && a < paL) {
						pathWindingL += winding;
						onPath = true;
					}
				}
				quality = 0;
			}
			vPrev = v;
			return !dontFlip && a > paL && a < paR
					&& Curve.getTangent(v, t)[dir ? 'x' : 'y'] === 0
					&& getWinding(point, curves, !dir, closed, true);
		}

		function handleCurve(v) {
			var o0 = v[io + 0],
				o1 = v[io + 2],
				o2 = v[io + 4],
				o3 = v[io + 6];
			if (po <= max(o0, o1, o2, o3) && po >= min(o0, o1, o2, o3)) {
				var a0 = v[ia + 0],
					a1 = v[ia + 2],
					a2 = v[ia + 4],
					a3 = v[ia + 6],
					monoCurves = paL > max(a0, a1, a2, a3) ||
								 paR < min(a0, a1, a2, a3)
							? [v] : Curve.getMonoCurves(v, dir),
					res;
				for (var i = 0, l = monoCurves.length; i < l; i++) {
					if (res = addWinding(monoCurves[i]))
						return res;
				}
			}
		}

		for (var i = 0, l = curves.length; i < l; i++) {
			var curve = curves[i],
				path = curve._path,
				v = curve.getValues(),
				res;
			if (!i || curves[i - 1]._path !== path) {
				vPrev = null;
				if (!path._closed) {
					vClose = Curve.getValues(
							path.getLastCurve().getSegment2(),
							curve.getSegment1(),
							null, !closed);
					if (vClose[io] !== vClose[io + 6]) {
						vPrev = vClose;
					}
				}

				if (!vPrev) {
					vPrev = v;
					var prev = path.getLastCurve();
					while (prev && prev !== curve) {
						var v2 = prev.getValues();
						if (v2[io] !== v2[io + 6]) {
							vPrev = v2;
							break;
						}
						prev = prev.getPrevious();
					}
				}
			}

			if (res = handleCurve(v))
				return res;

			if (i + 1 === l || curves[i + 1]._path !== path) {
				if (vClose && (res = handleCurve(vClose)))
					return res;
				if (onPath && !pathWindingL && !pathWindingR) {
					pathWindingL = pathWindingR = path.isClockwise(closed) ^ dir
							? 1 : -1;
				}
				windingL += pathWindingL;
				windingR += pathWindingR;
				pathWindingL = pathWindingR = 0;
				if (onPath) {
					onAnyPath = true;
					onPath = false;
				}
				vClose = null;
			}
		}
		windingL = abs(windingL);
		windingR = abs(windingR);
		return {
			winding: max(windingL, windingR),
			windingL: windingL,
			windingR: windingR,
			quality: quality,
			onPath: onAnyPath
		};
	}

	function propagateWinding(segment, path1, path2, curves, operator) {
		var chain = [],
			start = segment,
			totalLength = 0,
			winding;
		do {
			var curve = segment.getCurve(),
				length = curve.getLength();
			chain.push({ segment: segment, curve: curve, length: length });
			totalLength += length;
			segment = segment.getNext();
		} while (segment && !segment._intersection && segment !== start);
		var offsets = [0.5, 0.25, 0.75],
			winding = { winding: 0, quality: -1 },
			tMin = 1e-8,
			tMax = 1 - tMin;
		for (var i = 0; i < offsets.length && winding.quality < 0.5; i++) {
			var length = totalLength * offsets[i];
			for (var j = 0, l = chain.length; j < l; j++) {
				var entry = chain[j],
					curveLength = entry.length;
				if (length <= curveLength) {
					var curve = entry.curve,
						path = curve._path,
						parent = path._parent,
						operand = parent instanceof CompoundPath ? parent : path,
						t = Numerical.clamp(curve.getTimeAt(length), tMin, tMax),
						pt = curve.getPointAtTime(t),
						dir = abs(curve.getTangentAtTime(t).y) < Math.SQRT1_2;
					var wind = null;
					if (operator.subtract && path2) {
						var pathWinding = operand === path1
										  ? path2._getWinding(pt, dir, true)
										  : path1._getWinding(pt, dir, true);
						if (operand === path1 && pathWinding.winding ||
							operand === path2 && !pathWinding.winding) {
							if (pathWinding.quality < 1) {
								continue;
							} else {
								wind = { winding: 0, quality: 1 };
							}
						}
					}
					wind = wind || getWinding(pt, curves, dir, true);
					if (wind.quality > winding.quality)
						winding = wind;
					break;
				}
				length -= curveLength;
			}
		}
		for (var j = chain.length - 1; j >= 0; j--) {
			chain[j].segment._winding = winding;
		}
	}

	function tracePaths(segments, operator) {
		var paths = [],
			starts;

		function isValid(seg) {
			var winding;
			return !!(seg && !seg._visited && (!operator
					|| operator[(winding = seg._winding || {}).winding]
						&& !(operator.unite && winding.winding === 2
							&& winding.windingL && winding.windingR)));
		}

		function isStart(seg) {
			if (seg) {
				for (var i = 0, l = starts.length; i < l; i++) {
					if (seg === starts[i])
						return true;
				}
			}
			return false;
		}

		function visitPath(path) {
			var segments = path._segments;
			for (var i = 0, l = segments.length; i < l; i++) {
				segments[i]._visited = true;
			}
		}

		function getCrossingSegments(segment, collectStarts) {
			var inter = segment._intersection,
				start = inter,
				crossings = [];
			if (collectStarts)
				starts = [segment];

			function collect(inter, end) {
				while (inter && inter !== end) {
					var other = inter._segment,
						path = other && other._path;
					if (path) {
						var next = other.getNext() || path.getFirstSegment(),
							nextInter = next._intersection;
						if (other !== segment && (isStart(other)
							|| isStart(next)
							|| next && (isValid(other) && (isValid(next)
								|| nextInter && isValid(nextInter._segment))))
						) {
							crossings.push(other);
						}
						if (collectStarts)
							starts.push(other);
					}
					inter = inter._next;
				}
			}

			if (inter) {
				collect(inter);
				while (inter && inter._prev)
					inter = inter._prev;
				collect(inter, start);
			}
			return crossings;
		}

		segments.sort(function(seg1, seg2) {
			var inter1 = seg1._intersection,
				inter2 = seg2._intersection,
				over1 = !!(inter1 && inter1._overlap),
				over2 = !!(inter2 && inter2._overlap),
				path1 = seg1._path,
				path2 = seg2._path;
			return over1 ^ over2
					? over1 ? 1 : -1
					: !inter1 ^ !inter2
						? inter1 ? 1 : -1
						: path1 !== path2
							? path1._id - path2._id
							: seg1._index - seg2._index;
		});

		for (var i = 0, l = segments.length; i < l; i++) {
			var seg = segments[i],
				valid = isValid(seg),
				path = null,
				finished = false,
				closed = true,
				branches = [],
				branch,
				visited,
				handleIn;
			if (valid && seg._path._overlapsOnly) {
				var path1 = seg._path,
					path2 = seg._intersection._segment._path;
				if (path1.compare(path2)) {
					if (path1.getArea())
						paths.push(path1.clone(false));
					visitPath(path1);
					visitPath(path2);
					valid = false;
				}
			}
			while (valid) {
				var first = !path,
					crossings = getCrossingSegments(seg, first),
					other = crossings.shift(),
					finished = !first && (isStart(seg) || isStart(other)),
					cross = !finished && other;
				if (first) {
					path = new Path(Item.NO_INSERT);
					branch = null;
				}
				if (finished) {
					if (seg.isFirst() || seg.isLast())
						closed = seg._path._closed;
					seg._visited = true;
					break;
				}
				if (cross && branch) {
					branches.push(branch);
					branch = null;
				}
				if (!branch) {
					if (cross)
						crossings.push(seg);
					branch = {
						start: path._segments.length,
						crossings: crossings,
						visited: visited = [],
						handleIn: handleIn
					};
				}
				if (cross)
					seg = other;
				if (!isValid(seg)) {
					path.removeSegments(branch.start);
					for (var j = 0, k = visited.length; j < k; j++) {
						visited[j]._visited = false;
					}
					visited.length = 0;
					do {
						seg = branch && branch.crossings.shift();
						if (!seg || !seg._path) {
							seg = null;
							branch = branches.pop();
							if (branch) {
								visited = branch.visited;
								handleIn = branch.handleIn;
							}
						}
					} while (branch && !isValid(seg));
					if (!seg)
						break;
				}
				var next = seg.getNext();
				path.add(new Segment(seg._point, handleIn,
						next && seg._handleOut));
				seg._visited = true;
				visited.push(seg);
				seg = next || seg._path.getFirstSegment();
				handleIn = next && next._handleIn;
			}
			if (finished) {
				if (closed) {
					path.getFirstSegment().setHandleIn(handleIn);
					path.setClosed(closed);
				}
				if (path.getArea() !== 0) {
					paths.push(path);
				}
			}
		}
		return paths;
	}

	return {
		_getWinding: function(point, dir, closed) {
			return getWinding(point, this.getCurves(), dir, closed);
		},

		unite: function(path, options) {
			return traceBoolean(this, path, 'unite', options);
		},

		intersect: function(path, options) {
			return traceBoolean(this, path, 'intersect', options);
		},

		subtract: function(path, options) {
			return traceBoolean(this, path, 'subtract', options);
		},

		exclude: function(path, options) {
			return traceBoolean(this, path, 'exclude', options);
		},

		divide: function(path, options) {
			return options && (options.trace == false || options.stroke)
					? splitBoolean(this, path, 'divide')
					: createResult([
						this.subtract(path, options),
						this.intersect(path, options)
					], true, this, path, options);
		},

		resolveCrossings: function() {
			var children = this._children,
				paths = children || [this];

			function hasOverlap(seg, path) {
				var inter = seg && seg._intersection;
				return inter && inter._overlap && inter._path === path;
			}

			var hasOverlaps = false,
				hasCrossings = false,
				intersections = this.getIntersections(null, function(inter) {
					return inter.hasOverlap() && (hasOverlaps = true) ||
							inter.isCrossing() && (hasCrossings = true);
				}),
				clearCurves = hasOverlaps && hasCrossings && [];
			intersections = CurveLocation.expand(intersections);
			if (hasOverlaps) {
				var overlaps = divideLocations(intersections, function(inter) {
					return inter.hasOverlap();
				}, clearCurves);
				for (var i = overlaps.length - 1; i >= 0; i--) {
					var overlap = overlaps[i],
						path = overlap._path,
						seg = overlap._segment,
						prev = seg.getPrevious(),
						next = seg.getNext();
					if (hasOverlap(prev, path) && hasOverlap(next, path)) {
						seg.remove();
						prev._handleOut._set(0, 0);
						next._handleIn._set(0, 0);
						if (prev !== seg && !prev.getCurve().hasLength()) {
							next._handleIn.set(prev._handleIn);
							prev.remove();
						}
					}
				}
			}
			if (hasCrossings) {
				divideLocations(intersections, hasOverlaps && function(inter) {
					var curve1 = inter.getCurve(),
						seg1 = inter.getSegment(),
						other = inter._intersection,
						curve2 = other._curve,
						seg2 = other._segment;
					if (curve1 && curve2 && curve1._path && curve2._path)
						return true;
					if (seg1)
						seg1._intersection = null;
					if (seg2)
						seg2._intersection = null;
				}, clearCurves);
				if (clearCurves)
					clearCurveHandles(clearCurves);
				paths = tracePaths(Base.each(paths, function(path) {
					Base.push(this, path._segments);
				}, []));
			}
			var length = paths.length,
				item;
			if (length > 1 && children) {
				if (paths !== children)
					this.setChildren(paths);
				item = this;
			} else if (length === 1 && !children) {
				if (paths[0] !== this)
					this.setSegments(paths[0].removeSegments());
				item = this;
			}
			if (!item) {
				item = new CompoundPath(Item.NO_INSERT);
				item.addChildren(paths);
				item = item.reduce();
				item.copyAttributes(this);
				this.replaceWith(item);
			}
			return item;
		},

		reorient: function(nonZero, clockwise) {
			var children = this._children;
			if (children && children.length) {
				this.setChildren(reorientPaths(this.removeChildren(),
						function(w) {
							return !!(nonZero ? w : w & 1);
						},
						clockwise));
			} else if (clockwise !== undefined) {
				this.setClockwise(clockwise);
			}
			return this;
		},

		getInteriorPoint: function() {
			var bounds = this.getBounds(),
				point = bounds.getCenter(true);
			if (!this.contains(point)) {
				var curves = this.getCurves(),
					y = point.y,
					intercepts = [],
					roots = [];
				for (var i = 0, l = curves.length; i < l; i++) {
					var v = curves[i].getValues(),
						o0 = v[1],
						o1 = v[3],
						o2 = v[5],
						o3 = v[7];
					if (y >= min(o0, o1, o2, o3) && y <= max(o0, o1, o2, o3)) {
						var monoCurves = Curve.getMonoCurves(v);
						for (var j = 0, m = monoCurves.length; j < m; j++) {
							var mv = monoCurves[j],
								mo0 = mv[1],
								mo3 = mv[7];
							if ((mo0 !== mo3) &&
								(y >= mo0 && y <= mo3 || y >= mo3 && y <= mo0)){
								var x = y === mo0 ? mv[0]
									: y === mo3 ? mv[6]
									: Curve.solveCubic(mv, 1, y, roots, 0, 1)
										=== 1
										? Curve.getPoint(mv, roots[0]).x
										: (mv[0] + mv[6]) / 2;
								intercepts.push(x);
							}
						}
					}
				}
				if (intercepts.length > 1) {
					intercepts.sort(function(a, b) { return a - b; });
					point.x = (intercepts[0] + intercepts[1]) / 2;
				}
			}
			return point;
		}
	};
});

var PathFlattener = Base.extend({
	_class: 'PathFlattener',

	initialize: function(path, flatness, maxRecursion, ignoreStraight, matrix) {
		var curves = [],
			parts = [],
			length = 0,
			minSpan = 1 / (maxRecursion || 32),
			segments = path._segments,
			segment1 = segments[0],
			segment2;

		function addCurve(segment1, segment2) {
			var curve = Curve.getValues(segment1, segment2, matrix);
			curves.push(curve);
			computeParts(curve, segment1._index, 0, 1);
		}

		function computeParts(curve, index, t1, t2) {
			if ((t2 - t1) > minSpan
					&& !(ignoreStraight && Curve.isStraight(curve))
					&& !Curve.isFlatEnough(curve, flatness || 0.25)) {
				var halves = Curve.subdivide(curve, 0.5),
					tMid = (t1 + t2) / 2;
				computeParts(halves[0], index, t1, tMid);
				computeParts(halves[1], index, tMid, t2);
			} else {
				var dx = curve[6] - curve[0],
					dy = curve[7] - curve[1],
					dist = Math.sqrt(dx * dx + dy * dy);
				if (dist > 0) {
					length += dist;
					parts.push({
						offset: length,
						curve: curve,
						index: index,
						time: t2,
					});
				}
			}
		}

		for (var i = 1, l = segments.length; i < l; i++) {
			segment2 = segments[i];
			addCurve(segment1, segment2);
			segment1 = segment2;
		}
		if (path._closed)
			addCurve(segment2 || segment1, segments[0]);
		this.curves = curves;
		this.parts = parts;
		this.length = length;
		this.index = 0;
	},

	_get: function(offset) {
		var parts = this.parts,
			length = parts.length,
			start,
			i, j = this.index;
		for (;;) {
			i = j;
			if (!j || parts[--j].offset < offset)
				break;
		}
		for (; i < length; i++) {
			var part = parts[i];
			if (part.offset >= offset) {
				this.index = i;
				var prev = parts[i - 1],
					prevTime = prev && prev.index === part.index ? prev.time : 0,
					prevOffset = prev ? prev.offset : 0;
				return {
					index: part.index,
					time: prevTime + (part.time - prevTime)
						* (offset - prevOffset) / (part.offset - prevOffset)
				};
			}
		}
		return {
			index: parts[length - 1].index,
			time: 1
		};
	},

	drawPart: function(ctx, from, to) {
		var start = this._get(from),
			end = this._get(to);
		for (var i = start.index, l = end.index; i <= l; i++) {
			var curve = Curve.getPart(this.curves[i],
					i === start.index ? start.time : 0,
					i === end.index ? end.time : 1);
			if (i === start.index)
				ctx.moveTo(curve[0], curve[1]);
			ctx.bezierCurveTo.apply(ctx, curve.slice(2));
		}
	}
}, Base.each(Curve._evaluateMethods,
	function(name) {
		this[name + 'At'] = function(offset) {
			var param = this._get(offset);
			return Curve[name](this.curves[param.index], param.time);
		};
	}, {})
);

var PathFitter = Base.extend({
	initialize: function(path) {
		var points = this.points = [],
			segments = path._segments,
			closed = path._closed;
		for (var i = 0, prev, l = segments.length; i < l; i++) {
			var point = segments[i].point;
			if (!prev || !prev.equals(point)) {
				points.push(prev = point.clone());
			}
		}
		if (closed) {
			points.unshift(points[points.length - 1]);
			points.push(points[1]);
		}
		this.closed = closed;
	},

	fit: function(error) {
		var points = this.points,
			length = points.length,
			segments = null;
		if (length > 0) {
			segments = [new Segment(points[0])];
			if (length > 1) {
				this.fitCubic(segments, error, 0, length - 1,
						points[1].subtract(points[0]),
						points[length - 2].subtract(points[length - 1]));
				if (this.closed) {
					segments.shift();
					segments.pop();
				}
			}
		}
		return segments;
	},

	fitCubic: function(segments, error, first, last, tan1, tan2) {
		var points = this.points;
		if (last - first === 1) {
			var pt1 = points[first],
				pt2 = points[last],
				dist = pt1.getDistance(pt2) / 3;
			this.addCurve(segments, [pt1, pt1.add(tan1.normalize(dist)),
					pt2.add(tan2.normalize(dist)), pt2]);
			return;
		}
		var uPrime = this.chordLengthParameterize(first, last),
			maxError = Math.max(error, error * error),
			split,
			parametersInOrder = true;
		for (var i = 0; i <= 4; i++) {
			var curve = this.generateBezier(first, last, uPrime, tan1, tan2);
			var max = this.findMaxError(first, last, curve, uPrime);
			if (max.error < error && parametersInOrder) {
				this.addCurve(segments, curve);
				return;
			}
			split = max.index;
			if (max.error >= maxError)
				break;
			parametersInOrder = this.reparameterize(first, last, uPrime, curve);
			maxError = max.error;
		}
		var tanCenter = points[split - 1].subtract(points[split + 1]);
		this.fitCubic(segments, error, first, split, tan1, tanCenter);
		this.fitCubic(segments, error, split, last, tanCenter.negate(), tan2);
	},

	addCurve: function(segments, curve) {
		var prev = segments[segments.length - 1];
		prev.setHandleOut(curve[1].subtract(curve[0]));
		segments.push(new Segment(curve[3], curve[2].subtract(curve[3])));
	},

	generateBezier: function(first, last, uPrime, tan1, tan2) {
		var epsilon = 1e-12,
			abs = Math.abs,
			points = this.points,
			pt1 = points[first],
			pt2 = points[last],
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
				tmp = points[first + i]
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
			alpha1,
			alpha2;
		if (abs(detC0C1) > epsilon) {
			var detC0X = C[0][0] * X[1]    - C[1][0] * X[0],
				detXC1 = X[0]    * C[1][1] - X[1]    * C[0][1];
			alpha1 = detXC1 / detC0C1;
			alpha2 = detC0X / detC0C1;
		} else {
			var c0 = C[0][0] + C[0][1],
				c1 = C[1][0] + C[1][1];
			alpha1 = alpha2 = abs(c0) > epsilon ? X[0] / c0
							: abs(c1) > epsilon ? X[1] / c1
							: 0;
		}

		var segLength = pt2.getDistance(pt1),
			eps = epsilon * segLength,
			handle1,
			handle2;
		if (alpha1 < eps || alpha2 < eps) {
			alpha1 = alpha2 = segLength / 3;
		} else {
			var line = pt2.subtract(pt1);
			handle1 = tan1.normalize(alpha1);
			handle2 = tan2.normalize(alpha2);
			if (handle1.dot(line) - handle2.dot(line) > segLength * segLength) {
				alpha1 = alpha2 = segLength / 3;
				handle1 = handle2 = null;
			}
		}

		return [pt1,
				pt1.add(handle1 || tan1.normalize(alpha1)),
				pt2.add(handle2 || tan2.normalize(alpha2)),
				pt2];
	},

	reparameterize: function(first, last, u, curve) {
		for (var i = first; i <= last; i++) {
			u[i - first] = this.findRoot(curve, this.points[i], u[i - first]);
		}
		for (var i = 1, l = u.length; i < l; i++) {
			if (u[i] <= u[i - 1])
				return false;
		}
		return true;
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
		return Numerical.isZero(df) ? u : u - diff.dot(pt1) / df;
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

var TextItem = Item.extend({
	_class: 'TextItem',
	_applyMatrix: false,
	_canApplyMatrix: false,
	_serializeFields: {
		content: null
	},
	_boundsOptions: { stroke: false, handle: false },

	initialize: function TextItem(arg) {
		this._content = '';
		this._lines = [];
		var hasProps = arg && Base.isPlainObject(arg)
				&& arg.x === undefined && arg.y === undefined;
		this._initialize(hasProps && arg, !hasProps && Point.read(arguments));
	},

	_equals: function(item) {
		return this._content === item._content;
	},

	copyContent: function(source) {
		this.setContent(source._content);
	},

	getContent: function() {
		return this._content;
	},

	setContent: function(content) {
		this._content = '' + content;
		this._lines = this._content.split(/\r\n|\n|\r/mg);
		this._changed(521);
	},

	isEmpty: function() {
		return !this._content;
	},

	getCharacterStyle: '#getStyle',
	setCharacterStyle: '#setStyle',

	getParagraphStyle: '#getStyle',
	setParagraphStyle: '#setStyle'
});

var PointText = TextItem.extend({
	_class: 'PointText',

	initialize: function PointText() {
		TextItem.apply(this, arguments);
	},

	getPoint: function() {
		var point = this._matrix.getTranslation();
		return new LinkedPoint(point.x, point.y, this, 'setPoint');
	},

	setPoint: function() {
		var point = Point.read(arguments);
		this.translate(point.subtract(this._matrix.getTranslation()));
	},

	_draw: function(ctx, param, viewMatrix) {
		if (!this._content)
			return;
		this._setStyles(ctx, param, viewMatrix);
		var lines = this._lines,
			style = this._style,
			hasFill = style.hasFill(),
			hasStroke = style.hasStroke(),
			leading = style.getLeading(),
			shadowColor = ctx.shadowColor;
		ctx.font = style.getFontStyle();
		ctx.textAlign = style.getJustification();
		for (var i = 0, l = lines.length; i < l; i++) {
			ctx.shadowColor = shadowColor;
			var line = lines[i];
			if (hasFill) {
				ctx.fillText(line, 0, 0);
				ctx.shadowColor = 'rgba(0,0,0,0)';
			}
			if (hasStroke)
				ctx.strokeText(line, 0, 0);
			ctx.translate(0, leading);
		}
	},

	_getBounds: function(matrix, options) {
		var style = this._style,
			lines = this._lines,
			numLines = lines.length,
			justification = style.getJustification(),
			leading = style.getLeading(),
			width = this.getView().getTextWidth(style.getFontStyle(), lines),
			x = 0;
		if (justification !== 'left')
			x -= width / (justification === 'center' ? 2: 1);
		var rect = new Rectangle(x,
					numLines ? - 0.75 * leading : 0,
					width, numLines * leading);
		return matrix ? matrix._transformBounds(rect, rect) : rect;
	}
});

var Color = Base.extend(new function() {
	var types = {
		gray: ['gray'],
		rgb: ['red', 'green', 'blue'],
		hsb: ['hue', 'saturation', 'brightness'],
		hsl: ['hue', 'saturation', 'lightness'],
		gradient: ['gradient', 'origin', 'destination', 'highlight']
	};

	var componentParsers = {},
		namedColors = {
			transparent: [0, 0, 0, 0]
		},
		colorCtx;

	function fromCSS(string) {
		var match = string.match(
				/^#([\da-f]{2})([\da-f]{2})([\da-f]{2})([\da-f]{2})?$/i
			) || string.match(
				/^#([\da-f])([\da-f])([\da-f])([\da-f])?$/i
			),
			type = 'rgb',
			components;
		if (match) {
			var amount = match[4] ? 4 : 3;
			components = new Array(amount);
			for (var i = 0; i < amount; i++) {
				var value = match[i + 1];
				components[i] = parseInt(value.length == 1
						? value + value : value, 16) / 255;
			}
		} else if (match = string.match(/^(rgb|hsl)a?\((.*)\)$/)) {
			type = match[1];
			components = match[2].split(/[,\s]+/g);
			var isHSL = type === 'hsl';
			for (var i = 0, l = Math.min(components.length, 4); i < l; i++) {
				var component = components[i];
				var value = parseFloat(component);
				if (isHSL) {
					if (i === 0) {
						var unit = component.match(/([a-z]*)$/)[1];
						value *= ({
							turn: 360,
							rad: 180 / Math.PI,
							grad: 0.9
						}[unit] || 1);
					} else if (i < 3) {
						value /= 100;
					}
				} else if (i < 3) {
					value /= 255;
				}
				components[i] = value;
			}
		} else {
			var color = namedColors[string];
			if (!color) {
				if (window) {
					if (!colorCtx) {
						colorCtx = CanvasProvider.getContext(1, 1);
						colorCtx.globalCompositeOperation = 'copy';
					}
					colorCtx.fillStyle = 'rgba(0,0,0,0)';
					colorCtx.fillStyle = string;
					colorCtx.fillRect(0, 0, 1, 1);
					var data = colorCtx.getImageData(0, 0, 1, 1).data;
					color = namedColors[string] = [
						data[0] / 255,
						data[1] / 255,
						data[2] / 255
					];
				} else {
					color = [0, 0, 0];
				}
			}
			components = color.slice();
		}
		return [type, components];
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
		'rgb-hsb': function(r, g, b) {
			var max = Math.max(r, g, b),
				min = Math.min(r, g, b),
				delta = max - min,
				h = delta === 0 ? 0
					:   ( max == r ? (g - b) / delta + (g < b ? 6 : 0)
						: max == g ? (b - r) / delta + 2
						:            (r - g) / delta + 4) * 60;
			return [h, max === 0 ? 0 : delta / max, max];
		},

		'hsb-rgb': function(h, s, b) {
			h = (((h / 60) % 6) + 6) % 6;
			var i = Math.floor(h),
				f = h - i,
				i = hsbIndices[i],
				v = [
					b,
					b * (1 - s),
					b * (1 - s * f),
					b * (1 - s * (1 - f))
				];
			return [v[i[0]], v[i[1]], v[i[2]]];
		},

		'rgb-hsl': function(r, g, b) {
			var max = Math.max(r, g, b),
				min = Math.min(r, g, b),
				delta = max - min,
				achromatic = delta === 0,
				h = achromatic ? 0
					:   ( max == r ? (g - b) / delta + (g < b ? 6 : 0)
						: max == g ? (b - r) / delta + 2
						:            (r - g) / delta + 4) * 60,
				l = (max + min) / 2,
				s = achromatic ? 0 : l < 0.5
						? delta / (max + min)
						: delta / (2 - max - min);
			return [h, s, l];
		},

		'hsl-rgb': function(h, s, l) {
			h = (((h / 360) % 1) + 1) % 1;
			if (s === 0)
				return [l, l, l];
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
			return c;
		},

		'rgb-gray': function(r, g, b) {
			return [r * 0.2989 + g * 0.587 + b * 0.114];
		},

		'gray-rgb': function(g) {
			return [g, g, g];
		},

		'gray-hsb': function(g) {
			return [0, 0, g];
		},

		'gray-hsl': function(g) {
			return [0, 0, g];
		},

		'gradient-rgb': function() {
			return [];
		},

		'rgb-gradient': function() {
			return [];
		}

	};

	return Base.each(types, function(properties, type) {
		componentParsers[type] = [];
		Base.each(properties, function(name, index) {
			var part = Base.capitalize(name),
				hasOverlap = /^(hue|saturation)$/.test(name),
				parser = componentParsers[type][index] = type === 'gradient'
					? name === 'gradient'
						? function(value) {
							var current = this._components[0];
							value = Gradient.read(
								Array.isArray(value)
									? value
									: arguments, 0, { readNull: true }
							);
							if (current !== value) {
								if (current)
									current._removeOwner(this);
								if (value)
									value._addOwner(this);
							}
							return value;
						}
						: function() {
							return Point.read(arguments, 0, {
									readNull: name === 'highlight',
									clone: true
							});
						}
					: function(value) {
						return value == null || isNaN(value) ? 0 : +value;
					};
			this['get' + part] = function() {
				return this._type === type
					|| hasOverlap && /^hs[bl]$/.test(this._type)
						? this._components[index]
						: this._convert(type)[index];
			};

			this['set' + part] = function(value) {
				if (this._type !== type
						&& !(hasOverlap && /^hs[bl]$/.test(this._type))) {
					this._components = this._convert(type);
					this._properties = types[type];
					this._type = type;
				}
				this._components[index] = parser.call(this, value);
				this._changed();
			};
		}, this);
	}, {
		_class: 'Color',
		_readIndex: true,

		initialize: function Color(arg) {
			var args = arguments,
				reading = this.__read,
				read = 0,
				type,
				components,
				alpha,
				values;
			if (Array.isArray(arg)) {
				args = arg;
				arg = args[0];
			}
			var argType = arg != null && typeof arg;
			if (argType === 'string' && arg in types) {
				type = arg;
				arg = args[1];
				if (Array.isArray(arg)) {
					components = arg;
					alpha = args[2];
				} else {
					if (reading)
						read = 1;
					args = Base.slice(args, 1);
					argType = typeof arg;
				}
			}
			if (!components) {
				values = argType === 'number'
						? args
						: argType === 'object' && arg.length != null
							? arg
							: null;
				if (values) {
					if (!type)
						type = values.length >= 3
								? 'rgb'
								: 'gray';
					var length = types[type].length;
					alpha = values[length];
					if (reading) {
						read += values === arguments
							? length + (alpha != null ? 1 : 0)
							: 1;
					}
					if (values.length > length)
						values = Base.slice(values, 0, length);
				} else if (argType === 'string') {
					var converted = fromCSS(arg);
					type = converted[0];
					components = converted[1];
					if (components.length === 4) {
						alpha = components[3];
						components.length--;
					}
				} else if (argType === 'object') {
					if (arg.constructor === Color) {
						type = arg._type;
						components = arg._components.slice();
						alpha = arg._alpha;
						if (type === 'gradient') {
							for (var i = 1, l = components.length; i < l; i++) {
								var point = components[i];
								if (point)
									components[i] = point.clone();
							}
						}
					} else if (arg.constructor === Gradient) {
						type = 'gradient';
						values = args;
					} else {
						type = 'hue' in arg
							? 'lightness' in arg
								? 'hsl'
								: 'hsb'
							: 'gradient' in arg || 'stops' in arg
									|| 'radial' in arg
								? 'gradient'
								: 'gray' in arg
									? 'gray'
									: 'rgb';
						var properties = types[type],
							parsers = componentParsers[type];
						this._components = components = [];
						for (var i = 0, l = properties.length; i < l; i++) {
							var value = arg[properties[i]];
							if (value == null && !i && type === 'gradient'
									&& 'stops' in arg) {
								value = {
									stops: arg.stops,
									radial: arg.radial
								};
							}
							value = parsers[i].call(this, value);
							if (value != null)
								components[i] = value;
						}
						alpha = arg.alpha;
					}
				}
				if (reading && type)
					read = 1;
			}
			this._type = type || 'rgb';
			if (!components) {
				this._components = components = [];
				var parsers = componentParsers[this._type];
				for (var i = 0, l = parsers.length; i < l; i++) {
					var value = parsers[i].call(this, values && values[i]);
					if (value != null)
						components[i] = value;
				}
			}
			this._components = components;
			this._properties = types[this._type];
			this._alpha = alpha;
			if (reading)
				this.__read = read;
			return this;
		},

		set: '#initialize',

		_serialize: function(options, dictionary) {
			var components = this.getComponents();
			return Base.serialize(
					/^(gray|rgb)$/.test(this._type)
						? components
						: [this._type].concat(components),
					options, true, dictionary);
		},

		_changed: function() {
			this._canvasStyle = null;
			if (this._owner)
				this._owner._changed(129);
		},

		_convert: function(type) {
			var converter;
			return this._type === type
					? this._components.slice()
					: (converter = converters[this._type + '-' + type])
						? converter.apply(this, this._components)
						: converters['rgb-' + type].apply(this,
							converters[this._type + '-rgb'].apply(this,
								this._components));
		},

		convert: function(type) {
			return new Color(type, this._convert(type), this._alpha);
		},

		getType: function() {
			return this._type;
		},

		setType: function(type) {
			this._components = this._convert(type);
			this._properties = types[type];
			this._type = type;
		},

		getComponents: function() {
			var components = this._components.slice();
			if (this._alpha != null)
				components.push(this._alpha);
			return components;
		},

		getAlpha: function() {
			return this._alpha != null ? this._alpha : 1;
		},

		setAlpha: function(alpha) {
			this._alpha = alpha == null ? null : Math.min(Math.max(alpha, 0), 1);
			this._changed();
		},

		hasAlpha: function() {
			return this._alpha != null;
		},

		equals: function(color) {
			var col = Base.isPlainValue(color, true)
					? Color.read(arguments)
					: color;
			return col === this || col && this._class === col._class
					&& this._type === col._type
					&& this.getAlpha() === col.getAlpha()
					&& Base.equals(this._components, col._components)
					|| false;
		},

		toString: function() {
			var properties = this._properties,
				parts = [],
				isGradient = this._type === 'gradient',
				f = Formatter.instance;
			for (var i = 0, l = properties.length; i < l; i++) {
				var value = this._components[i];
				if (value != null)
					parts.push(properties[i] + ': '
							+ (isGradient ? value : f.number(value)));
			}
			if (this._alpha != null)
				parts.push('alpha: ' + f.number(this._alpha));
			return '{ ' + parts.join(', ') + ' }';
		},

		toCSS: function(hex) {
			var components = this._convert('rgb'),
				alpha = hex || this._alpha == null ? 1 : this._alpha;
			function convert(val) {
				return Math.round((val < 0 ? 0 : val > 1 ? 1 : val) * 255);
			}
			components = [
				convert(components[0]),
				convert(components[1]),
				convert(components[2])
			];
			if (alpha < 1)
				components.push(alpha < 0 ? 0 : alpha);
			return hex
					? '#' + ((1 << 24) + (components[0] << 16)
						+ (components[1] << 8)
						+ components[2]).toString(16).slice(1)
					: (components.length == 4 ? 'rgba(' : 'rgb(')
						+ components.join(',') + ')';
		},

		toCanvasStyle: function(ctx, matrix) {
			if (this._canvasStyle)
				return this._canvasStyle;
			if (this._type !== 'gradient')
				return this._canvasStyle = this.toCSS();
			var components = this._components,
				gradient = components[0],
				stops = gradient._stops,
				origin = components[1],
				destination = components[2],
				highlight = components[3],
				inverse = matrix && matrix.inverted(),
				canvasGradient;
			if (inverse) {
				origin = inverse._transformPoint(origin);
				destination = inverse._transformPoint(destination);
				if (highlight)
					highlight = inverse._transformPoint(highlight);
			}
			if (gradient._radial) {
				var radius = destination.getDistance(origin);
				if (highlight) {
					var vector = highlight.subtract(origin);
					if (vector.getLength() > radius)
						highlight = origin.add(vector.normalize(radius - 0.1));
				}
				var start = highlight || origin;
				canvasGradient = ctx.createRadialGradient(start.x, start.y,
						0, origin.x, origin.y, radius);
			} else {
				canvasGradient = ctx.createLinearGradient(origin.x, origin.y,
						destination.x, destination.y);
			}
			for (var i = 0, l = stops.length; i < l; i++) {
				var stop = stops[i],
					offset = stop._offset;
				canvasGradient.addColorStop(
						offset == null ? i / (l - 1) : offset,
						stop._color.toCanvasStyle());
			}
			return this._canvasStyle = canvasGradient;
		},

		transform: function(matrix) {
			if (this._type === 'gradient') {
				var components = this._components;
				for (var i = 1, l = components.length; i < l; i++) {
					var point = components[i];
					matrix._transformPoint(point, point, true);
				}
				this._changed();
			}
		},

		statics: {
			_types: types,

			random: function() {
				var random = Math.random;
				return new Color(random(), random(), random());
			}
		}
	});
},
new function() {
	var operators = {
		add: function(a, b) {
			return a + b;
		},

		subtract: function(a, b) {
			return a - b;
		},

		multiply: function(a, b) {
			return a * b;
		},

		divide: function(a, b) {
			return a / b;
		}
	};

	return Base.each(operators, function(operator, name) {
		this[name] = function(color) {
			color = Color.read(arguments);
			var type = this._type,
				components1 = this._components,
				components2 = color._convert(type);
			for (var i = 0, l = components1.length; i < l; i++)
				components2[i] = operator(components1[i], components2[i]);
			return new Color(type, components2,
					this._alpha != null
							? operator(this._alpha, color.getAlpha())
							: null);
		};
	}, {
	});
});

var Gradient = Base.extend({
	_class: 'Gradient',

	initialize: function Gradient(stops, radial) {
		this._id = UID.get();
		if (stops && Base.isPlainObject(stops)) {
			this.set(stops);
			stops = radial = null;
		}
		if (this._stops == null) {
			this.setStops(stops || ['white', 'black']);
		}
		if (this._radial == null) {
			this.setRadial(typeof radial === 'string' && radial === 'radial'
					|| radial || false);
		}
	},

	_serialize: function(options, dictionary) {
		return dictionary.add(this, function() {
			return Base.serialize([this._stops, this._radial],
					options, true, dictionary);
		});
	},

	_changed: function() {
		for (var i = 0, l = this._owners && this._owners.length; i < l; i++) {
			this._owners[i]._changed();
		}
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
			if (!this._owners.length)
				this._owners = undefined;
		}
	},

	clone: function() {
		var stops = [];
		for (var i = 0, l = this._stops.length; i < l; i++) {
			stops[i] = this._stops[i].clone();
		}
		return new Gradient(stops, this._radial);
	},

	getStops: function() {
		return this._stops;
	},

	setStops: function(stops) {
		if (stops.length < 2) {
			throw new Error(
					'Gradient stop list needs to contain at least two stops.');
		}
		var _stops = this._stops;
		if (_stops) {
			for (var i = 0, l = _stops.length; i < l; i++)
				_stops[i]._owner = undefined;
		}
		_stops = this._stops = GradientStop.readList(stops, 0, { clone: true });
		for (var i = 0, l = _stops.length; i < l; i++)
			_stops[i]._owner = this;
		this._changed();
	},

	getRadial: function() {
		return this._radial;
	},

	setRadial: function(radial) {
		this._radial = radial;
		this._changed();
	},

	equals: function(gradient) {
		if (gradient === this)
			return true;
		if (gradient && this._class === gradient._class) {
			var stops1 = this._stops,
				stops2 = gradient._stops,
				length = stops1.length;
			if (length === stops2.length) {
				for (var i = 0; i < length; i++) {
					if (!stops1[i].equals(stops2[i]))
						return false;
				}
				return true;
			}
		}
		return false;
	}
});

var GradientStop = Base.extend({
	_class: 'GradientStop',

	initialize: function GradientStop(arg0, arg1) {
		var color = arg0,
			offset = arg1;
		if (typeof arg0 === 'object' && arg1 === undefined) {
			if (Array.isArray(arg0) && typeof arg0[0] !== 'number') {
				color = arg0[0];
				offset = arg0[1];
			} else if ('color' in arg0 || 'offset' in arg0
					|| 'rampPoint' in arg0) {
				color = arg0.color;
				offset = arg0.offset || arg0.rampPoint || 0;
			}
		}
		this.setColor(color);
		this.setOffset(offset);
	},

	clone: function() {
		return new GradientStop(this._color.clone(), this._offset);
	},

	_serialize: function(options, dictionary) {
		var color = this._color,
			offset = this._offset;
		return Base.serialize(offset == null ? [color] : [color, offset],
				options, true, dictionary);
	},

	_changed: function() {
		if (this._owner)
			this._owner._changed(129);
	},

	getOffset: function() {
		return this._offset;
	},

	setOffset: function(offset) {
		this._offset = offset;
		this._changed();
	},

	getRampPoint: '#getOffset',
	setRampPoint: '#setOffset',

	getColor: function() {
		return this._color;
	},

	setColor: function() {
		var color = Color.read(arguments, 0, { clone: true });
		if (color)
			color._owner = this;
		this._color = color;
		this._changed();
	},

	equals: function(stop) {
		return stop === this || stop && this._class === stop._class
				&& this._color.equals(stop._color)
				&& this._offset == stop._offset
				|| false;
	}
});

var Style = Base.extend(new function() {
	var itemDefaults = {
		fillColor: null,
		fillRule: 'nonzero',
		strokeColor: null,
		strokeWidth: 1,
		strokeCap: 'butt',
		strokeJoin: 'miter',
		strokeScaling: true,
		miterLimit: 10,
		dashOffset: 0,
		dashArray: [],
		shadowColor: null,
		shadowBlur: 0,
		shadowOffset: new Point(),
		selectedColor: null
	},
	groupDefaults = Base.set({}, itemDefaults, {
		fontFamily: 'sans-serif',
		fontWeight: 'normal',
		fontSize: 12,
		leading: null,
		justification: 'left'
	}),
	textDefaults = Base.set({}, groupDefaults, {
		fillColor: new Color()
	}),
	flags = {
		strokeWidth: 193,
		strokeCap: 193,
		strokeJoin: 193,
		strokeScaling: 201,
		miterLimit: 193,
		fontFamily: 9,
		fontWeight: 9,
		fontSize: 9,
		font: 9,
		leading: 9,
		justification: 9
	},
	item = {
		beans: true
	},
	fields = {
		_class: 'Style',
		beans: true,

		initialize: function Style(style, _owner, _project) {
			this._values = {};
			this._owner = _owner;
			this._project = _owner && _owner._project || _project
					|| paper.project;
			this._defaults = !_owner || _owner instanceof Group ? groupDefaults
					: _owner instanceof TextItem ? textDefaults
					: itemDefaults;
			if (style)
				this.set(style);
		}
	};

	Base.each(groupDefaults, function(value, key) {
		var isColor = /Color$/.test(key),
			isPoint = key === 'shadowOffset',
			part = Base.capitalize(key),
			flag = flags[key],
			set = 'set' + part,
			get = 'get' + part;

		fields[set] = function(value) {
			var owner = this._owner,
				children = owner && owner._children,
				applyToChildren = children && children.length > 0
					&& !(owner instanceof CompoundPath);
			if (applyToChildren) {
				for (var i = 0, l = children.length; i < l; i++)
					children[i]._style[set](value);
			}
			if ((key === 'selectedColor' || !applyToChildren)
					&& key in this._defaults) {
				var old = this._values[key];
				if (old !== value) {
					if (isColor) {
						if (old && old._owner !== undefined) {
							old._owner = undefined;
							old._canvasStyle = null;
						}
						if (value && value.constructor === Color) {
							if (value._owner)
								value = value.clone();
							value._owner = owner;
						}
					}
					this._values[key] = value;
					if (owner)
						owner._changed(flag || 129);
				}
			}
		};

		fields[get] = function(_dontMerge) {
			var owner = this._owner,
				children = owner && owner._children,
				value;
			if (key in this._defaults && (!children || !children.length
					|| _dontMerge || owner instanceof CompoundPath)) {
				var value = this._values[key];
				if (value === undefined) {
					value = this._defaults[key];
					if (value && value.clone)
						value = value.clone();
				} else {
					var ctor = isColor ? Color : isPoint ? Point : null;
					if (ctor && !(value && value.constructor === ctor)) {
						this._values[key] = value = ctor.read([value], 0,
								{ readNull: true, clone: true });
						if (value && isColor)
							value._owner = owner;
					}
				}
			} else if (children) {
				for (var i = 0, l = children.length; i < l; i++) {
					var childValue = children[i]._style[get]();
					if (!i) {
						value = childValue;
					} else if (!Base.equals(value, childValue)) {
						return undefined;
					}
				}
			}
			return value;
		};

		item[get] = function(_dontMerge) {
			return this._style[get](_dontMerge);
		};

		item[set] = function(value) {
			this._style[set](value);
		};
	});

	Base.each({
		Font: 'FontFamily',
		WindingRule: 'FillRule'
	}, function(value, key) {
		var get = 'get' + key,
			set = 'set' + key;
		fields[get] = item[get] = '#get' + value;
		fields[set] = item[set] = '#set' + value;
	});

	Item.inject(item);
	return fields;
}, {
	set: function(style) {
		var isStyle = style instanceof Style,
			values = isStyle ? style._values : style;
		if (values) {
			for (var key in values) {
				if (key in this._defaults) {
					var value = values[key];
					this[key] = value && isStyle && value.clone
							? value.clone() : value;
				}
			}
		}
	},

	equals: function(style) {
		function compare(style1, style2, secondary) {
			var values1 = style1._values,
				values2 = style2._values,
				defaults2 = style2._defaults;
			for (var key in values1) {
				var value1 = values1[key],
					value2 = values2[key];
				if (!(secondary && key in values2) && !Base.equals(value1,
						value2 === undefined ? defaults2[key] : value2))
					return false;
			}
			return true;
		}

		return style === this || style && this._class === style._class
				&& compare(this, style)
				&& compare(style, this, true)
				|| false;
	},

	_dispose: function() {
		var color;
		color = this.getFillColor();
		if (color) color._canvasStyle = null;
		color = this.getStrokeColor();
		if (color) color._canvasStyle = null;
		color = this.getShadowColor();
		if (color) color._canvasStyle = null;
	},

	hasFill: function() {
		var color = this.getFillColor();
		return !!color && color.alpha > 0;
	},

	hasStroke: function() {
		var color = this.getStrokeColor();
		return !!color && color.alpha > 0 && this.getStrokeWidth() > 0;
	},

	hasShadow: function() {
		var color = this.getShadowColor();
		return !!color && color.alpha > 0 && (this.getShadowBlur() > 0
				|| !this.getShadowOffset().isZero());
	},

	getView: function() {
		return this._project._view;
	},

	getFontStyle: function() {
		var fontSize = this.getFontSize();
		return this.getFontWeight()
				+ ' ' + fontSize + (/[a-z]/i.test(fontSize + '') ? ' ' : 'px ')
				+ this.getFontFamily();
	},

	getFont: '#getFontFamily',
	setFont: '#setFontFamily',

	getLeading: function getLeading() {
		var leading = getLeading.base.call(this),
			fontSize = this.getFontSize();
		if (/pt|em|%|px/.test(fontSize))
			fontSize = this.getView().getPixelSize(fontSize);
		return leading != null ? leading : fontSize * 1.2;
	}

});

var DomElement = new function() {
	function handlePrefix(el, name, set, value) {
		var prefixes = ['', 'webkit', 'moz', 'Moz', 'ms', 'o'],
			suffix = name[0].toUpperCase() + name.substring(1);
		for (var i = 0; i < 6; i++) {
			var prefix = prefixes[i],
				key = prefix ? prefix + suffix : name;
			if (key in el) {
				if (set) {
					el[key] = value;
				} else {
					return el[key];
				}
				break;
			}
		}
	}

	return {
		getStyles: function(el) {
			var doc = el && el.nodeType !== 9 ? el.ownerDocument : el,
				view = doc && doc.defaultView;
			return view && view.getComputedStyle(el, '');
		},

		getBounds: function(el, viewport) {
			var doc = el.ownerDocument,
				body = doc.body,
				html = doc.documentElement,
				rect;
			try {
				rect = el.getBoundingClientRect();
			} catch (e) {
				rect = { left: 0, top: 0, width: 0, height: 0 };
			}
			var x = rect.left - (html.clientLeft || body.clientLeft || 0),
				y = rect.top - (html.clientTop || body.clientTop || 0);
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
			return new Rectangle(0, 0,
				view.innerWidth || html.clientWidth,
				view.innerHeight || html.clientHeight
			);
		},

		getOffset: function(el, viewport) {
			return DomElement.getBounds(el, viewport).getPoint();
		},

		getSize: function(el) {
			return DomElement.getBounds(el, true).getSize();
		},

		isInvisible: function(el) {
			return DomElement.getSize(el).equals(new Size(0, 0));
		},

		isInView: function(el) {
			return !DomElement.isInvisible(el)
					&& DomElement.getViewportBounds(el).intersects(
						DomElement.getBounds(el, true));
		},

		isInserted: function(el) {
			return document.body.contains(el);
		},

		getPrefixed: function(el, name) {
			return el && handlePrefix(el, name);
		},

		setPrefixed: function(el, name, value) {
			if (typeof name === 'object') {
				for (var key in name)
					handlePrefix(el, key, true, name[key]);
			} else {
				handlePrefix(el, name, true, value);
			}
		}
	};
};

var DomEvent = {
	add: function(el, events) {
		if (el) {
			for (var type in events) {
				var func = events[type],
					parts = type.split(/[\s,]+/g);
				for (var i = 0, l = parts.length; i < l; i++) {
					var name = parts[i];
					var options = (
						el === document
						&& (name === 'touchstart' || name === 'touchmove')
					) ? { passive: false } : false;
					el.addEventListener(name, func, options);
				}
			}
		}
	},

	remove: function(el, events) {
		if (el) {
			for (var type in events) {
				var func = events[type],
					parts = type.split(/[\s,]+/g);
				for (var i = 0, l = parts.length; i < l; i++)
					el.removeEventListener(parts[i], func, false);
			}
		}
	},

	getPoint: function(event) {
		var pos = event.targetTouches
				? event.targetTouches.length
					? event.targetTouches[0]
					: event.changedTouches[0]
				: event;
		return new Point(
			pos.pageX || pos.clientX + document.documentElement.scrollLeft,
			pos.pageY || pos.clientY + document.documentElement.scrollTop
		);
	},

	getTarget: function(event) {
		return event.target || event.srcElement;
	},

	getRelatedTarget: function(event) {
		return event.relatedTarget || event.toElement;
	},

	getOffset: function(event, target) {
		return DomEvent.getPoint(event).subtract(DomElement.getOffset(
				target || DomEvent.getTarget(event)));
	}
};

DomEvent.requestAnimationFrame = new function() {
	var nativeRequest = DomElement.getPrefixed(window, 'requestAnimationFrame'),
		requested = false,
		callbacks = [],
		timer;

	function handleCallbacks() {
		var functions = callbacks;
		callbacks = [];
		for (var i = 0, l = functions.length; i < l; i++)
			functions[i]();
		requested = nativeRequest && callbacks.length;
		if (requested)
			nativeRequest(handleCallbacks);
	}

	return function(callback) {
		callbacks.push(callback);
		if (nativeRequest) {
			if (!requested) {
				nativeRequest(handleCallbacks);
				requested = true;
			}
		} else if (!timer) {
			timer = setInterval(handleCallbacks, 1000 / 60);
		}
	};
};

var View = Base.extend(Emitter, {
	_class: 'View',

	initialize: function View(project, element) {

		function getSize(name) {
			return element[name] || parseInt(element.getAttribute(name), 10);
		}

		function getCanvasSize() {
			var size = DomElement.getSize(element);
			return size.isNaN() || size.isZero()
					? new Size(getSize('width'), getSize('height'))
					: size;
		}

		var size;
		if (window && element) {
			this._id = element.getAttribute('id');
			if (this._id == null)
				element.setAttribute('id', this._id = 'view-' + View._id++);
			DomEvent.add(element, this._viewEvents);
			var none = 'none';
			DomElement.setPrefixed(element.style, {
				userDrag: none,
				userSelect: none,
				touchCallout: none,
				contentZooming: none,
				tapHighlightColor: 'rgba(0,0,0,0)'
			});

			if (PaperScope.hasAttribute(element, 'resize')) {
				var that = this;
				DomEvent.add(window, this._windowEvents = {
					resize: function() {
						that.setViewSize(getCanvasSize());
					}
				});
			}

			size = getCanvasSize();

			if (PaperScope.hasAttribute(element, 'stats')
					&& typeof Stats !== 'undefined') {
				this._stats = new Stats();
				var stats = this._stats.domElement,
					style = stats.style,
					offset = DomElement.getOffset(element);
				style.position = 'absolute';
				style.left = offset.x + 'px';
				style.top = offset.y + 'px';
				document.body.appendChild(stats);
			}
		} else {
			size = new Size(element);
			element = null;
		}
		this._project = project;
		this._scope = project._scope;
		this._element = element;
		if (!this._pixelRatio)
			this._pixelRatio = window && window.devicePixelRatio || 1;
		this._setElementSize(size.width, size.height);
		this._viewSize = size;
		View._views.push(this);
		View._viewsById[this._id] = this;
		(this._matrix = new Matrix())._owner = this;
		if (!View._focused)
			View._focused = this;
		this._frameItems = {};
		this._frameItemCount = 0;
		this._itemEvents = { native: {}, virtual: {} };
		this._autoUpdate = !paper.agent.node;
		this._needsUpdate = false;
	},

	remove: function() {
		if (!this._project)
			return false;
		if (View._focused === this)
			View._focused = null;
		View._views.splice(View._views.indexOf(this), 1);
		delete View._viewsById[this._id];
		var project = this._project;
		if (project._view === this)
			project._view = null;
		DomEvent.remove(this._element, this._viewEvents);
		DomEvent.remove(window, this._windowEvents);
		this._element = this._project = null;
		this.off('frame');
		this._animate = false;
		this._frameItems = {};
		return true;
	},

	_events: Base.each(
		Item._itemHandlers.concat(['onResize', 'onKeyDown', 'onKeyUp']),
		function(name) {
			this[name] = {};
		}, {
			onFrame: {
				install: function() {
					this.play();
				},

				uninstall: function() {
					this.pause();
				}
			}
		}
	),

	_animate: false,
	_time: 0,
	_count: 0,

	getAutoUpdate: function() {
		return this._autoUpdate;
	},

	setAutoUpdate: function(autoUpdate) {
		this._autoUpdate = autoUpdate;
		if (autoUpdate)
			this.requestUpdate();
	},

	update: function() {
	},

	draw: function() {
		this.update();
	},

	requestUpdate: function() {
		if (!this._requested) {
			var that = this;
			DomEvent.requestAnimationFrame(function() {
				that._requested = false;
				if (that._animate) {
					that.requestUpdate();
					var element = that._element;
					if ((!DomElement.getPrefixed(document, 'hidden')
							|| PaperScope.getAttribute(element, 'keepalive')
								=== 'true') && DomElement.isInView(element)) {
						that._handleFrame();
					}
				}
				if (that._autoUpdate)
					that.update();
			});
			this._requested = true;
		}
	},

	play: function() {
		this._animate = true;
		this.requestUpdate();
	},

	pause: function() {
		this._animate = false;
	},

	_handleFrame: function() {
		paper = this._scope;
		var now = Date.now() / 1000,
			delta = this._last ? now - this._last : 0;
		this._last = now;
		this.emit('frame', new Base({
			delta: delta,
			time: this._time += delta,
			count: this._count++
		}));
		if (this._stats)
			this._stats.update();
	},

	_animateItem: function(item, animate) {
		var items = this._frameItems;
		if (animate) {
			items[item._id] = {
				item: item,
				time: 0,
				count: 0
			};
			if (++this._frameItemCount === 1)
				this.on('frame', this._handleFrameItems);
		} else {
			delete items[item._id];
			if (--this._frameItemCount === 0) {
				this.off('frame', this._handleFrameItems);
			}
		}
	},

	_handleFrameItems: function(event) {
		for (var i in this._frameItems) {
			var entry = this._frameItems[i];
			entry.item.emit('frame', new Base(event, {
				time: entry.time += event.delta,
				count: entry.count++
			}));
		}
	},

	_changed: function() {
		this._project._changed(4097);
		this._bounds = this._decomposed = undefined;
	},

	getElement: function() {
		return this._element;
	},

	getPixelRatio: function() {
		return this._pixelRatio;
	},

	getResolution: function() {
		return this._pixelRatio * 72;
	},

	getViewSize: function() {
		var size = this._viewSize;
		return new LinkedSize(size.width, size.height, this, 'setViewSize');
	},

	setViewSize: function() {
		var size = Size.read(arguments),
			delta = size.subtract(this._viewSize);
		if (delta.isZero())
			return;
		this._setElementSize(size.width, size.height);
		this._viewSize.set(size);
		this._changed();
		this.emit('resize', { size: size, delta: delta });
		if (this._autoUpdate) {
			this.update();
		}
	},

	_setElementSize: function(width, height) {
		var element = this._element;
		if (element) {
			if (element.width !== width)
				element.width = width;
			if (element.height !== height)
				element.height = height;
		}
	},

	getBounds: function() {
		if (!this._bounds)
			this._bounds = this._matrix.inverted()._transformBounds(
					new Rectangle(new Point(), this._viewSize));
		return this._bounds;
	},

	getSize: function() {
		return this.getBounds().getSize();
	},

	isVisible: function() {
		return DomElement.isInView(this._element);
	},

	isInserted: function() {
		return DomElement.isInserted(this._element);
	},

	getPixelSize: function(size) {
		var element = this._element,
			pixels;
		if (element) {
			var parent = element.parentNode,
				temp = document.createElement('div');
			temp.style.fontSize = size;
			parent.appendChild(temp);
			pixels = parseFloat(DomElement.getStyles(temp).fontSize);
			parent.removeChild(temp);
		} else {
			pixels = parseFloat(pixels);
		}
		return pixels;
	},

	getTextWidth: function(font, lines) {
		return 0;
	}
}, Base.each(['rotate', 'scale', 'shear', 'skew'], function(key) {
	var rotate = key === 'rotate';
	this[key] = function() {
		var value = (rotate ? Base : Point).read(arguments),
			center = Point.read(arguments, 0, { readNull: true });
		return this.transform(new Matrix()[key](value,
				center || this.getCenter(true)));
	};
}, {
	_decompose: function() {
		return this._decomposed || (this._decomposed = this._matrix.decompose());
	},

	translate: function() {
		var mx = new Matrix();
		return this.transform(mx.translate.apply(mx, arguments));
	},

	getCenter: function() {
		return this.getBounds().getCenter();
	},

	setCenter: function() {
		var center = Point.read(arguments);
		this.translate(this.getCenter().subtract(center));
	},

	getZoom: function() {
		var scaling = this._decompose().scaling;
		return (scaling.x + scaling.y) / 2;
	},

	setZoom: function(zoom) {
		this.transform(new Matrix().scale(zoom / this.getZoom(),
			this.getCenter()));
	},

	getRotation: function() {
		return this._decompose().rotation;
	},

	setRotation: function(rotation) {
		var current = this.getRotation();
		if (current != null && rotation != null) {
			this.rotate(rotation - current);
		}
	},

	getScaling: function() {
		var scaling = this._decompose().scaling;
		return new LinkedPoint(scaling.x, scaling.y, this, 'setScaling');
	},

	setScaling: function() {
		var current = this.getScaling(),
			scaling = Point.read(arguments, 0, { clone: true, readNull: true });
		if (current && scaling) {
			this.scale(scaling.x / current.x, scaling.y / current.y);
		}
	},

	getMatrix: function() {
		return this._matrix;
	},

	setMatrix: function() {
		var matrix = this._matrix;
		matrix.initialize.apply(matrix, arguments);
	},

	transform: function(matrix) {
		this._matrix.append(matrix);
	},

	scrollBy: function() {
		this.translate(Point.read(arguments).negate());
	}
}), {

	projectToView: function() {
		return this._matrix._transformPoint(Point.read(arguments));
	},

	viewToProject: function() {
		return this._matrix._inverseTransform(Point.read(arguments));
	},

	getEventPoint: function(event) {
		return this.viewToProject(DomEvent.getOffset(event, this._element));
	},

}, {
	statics: {
		_views: [],
		_viewsById: {},
		_id: 0,

		create: function(project, element) {
			if (document && typeof element === 'string')
				element = document.getElementById(element);
			var ctor = window ? CanvasView : View;
			return new ctor(project, element);
		}
	}
},
new function() {
	if (!window)
		return;
	var prevFocus,
		tempFocus,
		dragging = false,
		mouseDown = false;

	function getView(event) {
		var target = DomEvent.getTarget(event);
		return target.getAttribute && View._viewsById[
				target.getAttribute('id')];
	}

	function updateFocus() {
		var view = View._focused;
		if (!view || !view.isVisible()) {
			for (var i = 0, l = View._views.length; i < l; i++) {
				if ((view = View._views[i]).isVisible()) {
					View._focused = tempFocus = view;
					break;
				}
			}
		}
	}

	function handleMouseMove(view, event, point) {
		view._handleMouseEvent('mousemove', event, point);
	}

	var navigator = window.navigator,
		mousedown, mousemove, mouseup;
	if (navigator.pointerEnabled || navigator.msPointerEnabled) {
		mousedown = 'pointerdown MSPointerDown';
		mousemove = 'pointermove MSPointerMove';
		mouseup = 'pointerup pointercancel MSPointerUp MSPointerCancel';
	} else {
		mousedown = 'touchstart';
		mousemove = 'touchmove';
		mouseup = 'touchend touchcancel';
		if (!('ontouchstart' in window && navigator.userAgent.match(
				/mobile|tablet|ip(ad|hone|od)|android|silk/i))) {
			mousedown += ' mousedown';
			mousemove += ' mousemove';
			mouseup += ' mouseup';
		}
	}

	var viewEvents = {},
		docEvents = {
			mouseout: function(event) {
				var view = View._focused,
					target = DomEvent.getRelatedTarget(event);
				if (view && (!target || target.nodeName === 'HTML')) {
					var offset = DomEvent.getOffset(event, view._element),
						x = offset.x,
						abs = Math.abs,
						ax = abs(x),
						max = 1 << 25,
						diff = ax - max;
					offset.x = abs(diff) < ax ? diff * (x < 0 ? -1 : 1) : x;
					handleMouseMove(view, event, view.viewToProject(offset));
				}
			},

			scroll: updateFocus
		};

	viewEvents[mousedown] = function(event) {
		var view = View._focused = getView(event);
		if (!dragging) {
			dragging = true;
			view._handleMouseEvent('mousedown', event);
		}
	};

	docEvents[mousemove] = function(event) {
		var view = View._focused;
		if (!mouseDown) {
			var target = getView(event);
			if (target) {
				if (view !== target) {
					if (view)
						handleMouseMove(view, event);
					if (!prevFocus)
						prevFocus = view;
					view = View._focused = tempFocus = target;
				}
			} else if (tempFocus && tempFocus === view) {
				if (prevFocus && !prevFocus.isInserted())
					prevFocus = null;
				view = View._focused = prevFocus;
				prevFocus = null;
				updateFocus();
			}
		}
		if (view)
			handleMouseMove(view, event);
	};

	docEvents[mousedown] = function() {
		mouseDown = true;
	};

	docEvents[mouseup] = function(event) {
		var view = View._focused;
		if (view && dragging)
			view._handleMouseEvent('mouseup', event);
		mouseDown = dragging = false;
	};

	DomEvent.add(document, docEvents);

	DomEvent.add(window, {
		load: updateFocus
	});

	var called = false,
		prevented = false,
		fallbacks = {
			doubleclick: 'click',
			mousedrag: 'mousemove'
		},
		wasInView = false,
		overView,
		downPoint,
		lastPoint,
		downItem,
		overItem,
		dragItem,
		clickItem,
		clickTime,
		dblClick;

	function emitMouseEvent(obj, target, type, event, point, prevPoint,
			stopItem) {
		var stopped = false,
			mouseEvent;

		function emit(obj, type) {
			if (obj.responds(type)) {
				if (!mouseEvent) {
					mouseEvent = new MouseEvent(type, event, point,
							target || obj,
							prevPoint ? point.subtract(prevPoint) : null);
				}
				if (obj.emit(type, mouseEvent)) {
					called = true;
					if (mouseEvent.prevented)
						prevented = true;
					if (mouseEvent.stopped)
						return stopped = true;
				}
			} else {
				var fallback = fallbacks[type];
				if (fallback)
					return emit(obj, fallback);
			}
		}

		while (obj && obj !== stopItem) {
			if (emit(obj, type))
				break;
			obj = obj._parent;
		}
		return stopped;
	}

	function emitMouseEvents(view, hitItem, type, event, point, prevPoint) {
		view._project.removeOn(type);
		prevented = called = false;
		return (dragItem && emitMouseEvent(dragItem, null, type, event,
					point, prevPoint)
			|| hitItem && hitItem !== dragItem
				&& !hitItem.isDescendant(dragItem)
				&& emitMouseEvent(hitItem, null, type === 'mousedrag' ?
					'mousemove' : type, event, point, prevPoint, dragItem)
			|| emitMouseEvent(view, dragItem || hitItem || view, type, event,
					point, prevPoint));
	}

	var itemEventsMap = {
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

	return {
		_viewEvents: viewEvents,

		_handleMouseEvent: function(type, event, point) {
			var itemEvents = this._itemEvents,
				hitItems = itemEvents.native[type],
				nativeMove = type === 'mousemove',
				tool = this._scope.tool,
				view = this;

			function responds(type) {
				return itemEvents.virtual[type] || view.responds(type)
						|| tool && tool.responds(type);
			}

			if (nativeMove && dragging && responds('mousedrag'))
				type = 'mousedrag';
			if (!point)
				point = this.getEventPoint(event);

			var inView = this.getBounds().contains(point),
				hit = hitItems && inView && view._project.hitTest(point, {
					tolerance: 0,
					fill: true,
					stroke: true
				}),
				hitItem = hit && hit.item || null,
				handle = false,
				mouse = {};
			mouse[type.substr(5)] = true;

			if (hitItems && hitItem !== overItem) {
				if (overItem) {
					emitMouseEvent(overItem, null, 'mouseleave', event, point);
				}
				if (hitItem) {
					emitMouseEvent(hitItem, null, 'mouseenter', event, point);
				}
				overItem = hitItem;
			}
			if (wasInView ^ inView) {
				emitMouseEvent(this, null, inView ? 'mouseenter' : 'mouseleave',
						event, point);
				overView = inView ? this : null;
				handle = true;
			}
			if ((inView || mouse.drag) && !point.equals(lastPoint)) {
				emitMouseEvents(this, hitItem, nativeMove ? type : 'mousemove',
						event, point, lastPoint);
				handle = true;
			}
			wasInView = inView;
			if (mouse.down && inView || mouse.up && downPoint) {
				emitMouseEvents(this, hitItem, type, event, point, downPoint);
				if (mouse.down) {
					dblClick = hitItem === clickItem
						&& (Date.now() - clickTime < 300);
					downItem = clickItem = hitItem;
					if (!prevented && hitItem) {
						var item = hitItem;
						while (item && !item.responds('mousedrag'))
							item = item._parent;
						if (item)
							dragItem = hitItem;
					}
					downPoint = point;
				} else if (mouse.up) {
					if (!prevented && hitItem === downItem) {
						clickTime = Date.now();
						emitMouseEvents(this, hitItem, dblClick ? 'doubleclick'
								: 'click', event, point, downPoint);
						dblClick = false;
					}
					downItem = dragItem = null;
				}
				wasInView = false;
				handle = true;
			}
			lastPoint = point;
			if (handle && tool) {
				called = tool._handleMouseEvent(type, event, point, mouse)
					|| called;
			}

			if (
				event.cancelable !== false
				&& (called && !mouse.move || mouse.down && responds('mouseup'))
			) {
				event.preventDefault();
			}
		},

		_handleKeyEvent: function(type, event, key, character) {
			var scope = this._scope,
				tool = scope.tool,
				keyEvent;

			function emit(obj) {
				if (obj.responds(type)) {
					paper = scope;
					obj.emit(type, keyEvent = keyEvent
							|| new KeyEvent(type, event, key, character));
				}
			}

			if (this.isVisible()) {
				emit(this);
				if (tool && tool.responds(type))
					emit(tool);
			}
		},

		_countItemEvent: function(type, sign) {
			var itemEvents = this._itemEvents,
				native = itemEvents.native,
				virtual = itemEvents.virtual;
			for (var key in itemEventsMap) {
				native[key] = (native[key] || 0)
						+ (itemEventsMap[key][type] || 0) * sign;
			}
			virtual[type] = (virtual[type] || 0) + sign;
		},

		statics: {
			updateFocus: updateFocus,

			_resetState: function() {
				dragging = mouseDown = called = wasInView = false;
				prevFocus = tempFocus = overView = downPoint = lastPoint =
					downItem = overItem = dragItem = clickItem = clickTime =
					dblClick = null;
			}
		}
	};
});

var CanvasView = View.extend({
	_class: 'CanvasView',

	initialize: function CanvasView(project, canvas) {
		if (!(canvas instanceof window.HTMLCanvasElement)) {
			var size = Size.read(arguments, 1);
			if (size.isZero())
				throw new Error(
						'Cannot create CanvasView with the provided argument: '
						+ Base.slice(arguments, 1));
			canvas = CanvasProvider.getCanvas(size);
		}
		var ctx = this._context = canvas.getContext('2d');
		ctx.save();
		this._pixelRatio = 1;
		if (!/^off|false$/.test(PaperScope.getAttribute(canvas, 'hidpi'))) {
			var deviceRatio = window.devicePixelRatio || 1,
				backingStoreRatio = DomElement.getPrefixed(ctx,
						'backingStorePixelRatio') || 1;
			this._pixelRatio = deviceRatio / backingStoreRatio;
		}
		View.call(this, project, canvas);
		this._needsUpdate = true;
	},

	remove: function remove() {
		this._context.restore();
		return remove.base.call(this);
	},

	_setElementSize: function _setElementSize(width, height) {
		var pixelRatio = this._pixelRatio;
		_setElementSize.base.call(this, width * pixelRatio, height * pixelRatio);
		if (pixelRatio !== 1) {
			var element = this._element,
				ctx = this._context;
			if (!PaperScope.hasAttribute(element, 'resize')) {
				var style = element.style;
				style.width = width + 'px';
				style.height = height + 'px';
			}
			ctx.restore();
			ctx.save();
			ctx.scale(pixelRatio, pixelRatio);
		}
	},

	getPixelSize: function getPixelSize(size) {
		var agent = paper.agent,
			pixels;
		if (agent && agent.firefox) {
			pixels = getPixelSize.base.call(this, size);
		} else {
			var ctx = this._context,
				prevFont = ctx.font;
			ctx.font = size + ' serif';
			pixels = parseFloat(ctx.font);
			ctx.font = prevFont;
		}
		return pixels;
	},

	getTextWidth: function(font, lines) {
		var ctx = this._context,
			prevFont = ctx.font,
			width = 0;
		ctx.font = font;
		for (var i = 0, l = lines.length; i < l; i++)
			width = Math.max(width, ctx.measureText(lines[i]).width);
		ctx.font = prevFont;
		return width;
	},

	update: function() {
		if (!this._needsUpdate)
			return false;
		var project = this._project,
			ctx = this._context,
			size = this._viewSize;
		ctx.clearRect(0, 0, size.width + 1, size.height + 1);
		if (project)
			project.draw(ctx, this._matrix, this._pixelRatio);
		this._needsUpdate = false;
		return true;
	}
});

var Event = Base.extend({
	_class: 'Event',

	initialize: function Event(event) {
		this.event = event;
		this.type = event && event.type;
	},

	prevented: false,
	stopped: false,

	preventDefault: function() {
		this.prevented = true;
		this.event.preventDefault();
	},

	stopPropagation: function() {
		this.stopped = true;
		this.event.stopPropagation();
	},

	stop: function() {
		this.stopPropagation();
		this.preventDefault();
	},

	getTimeStamp: function() {
		return this.event.timeStamp;
	},

	getModifiers: function() {
		return Key.modifiers;
	}
});

var KeyEvent = Event.extend({
	_class: 'KeyEvent',

	initialize: function KeyEvent(type, event, key, character) {
		this.type = type;
		this.event = event;
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

var Key = new function() {
	var keyLookup = {
			'\t': 'tab',
			' ': 'space',
			'\b': 'backspace',
			'\x7f': 'delete',
			'Spacebar': 'space',
			'Del': 'delete',
			'Win': 'meta',
			'Esc': 'escape'
		},

		charLookup = {
			'tab': '\t',
			'space': ' ',
			'enter': '\r'
		},

		keyMap = {},
		charMap = {},
		metaFixMap,
		downKey,

		modifiers = new Base({
			shift: false,
			control: false,
			alt: false,
			meta: false,
			capsLock: false,
			space: false
		}).inject({
			option: {
				get: function() {
					return this.alt;
				}
			},

			command: {
				get: function() {
					var agent = paper && paper.agent;
					return agent && agent.mac ? this.meta : this.control;
				}
			}
		});

	function getKey(event) {
		var key = event.key || event.keyIdentifier;
		key = /^U\+/.test(key)
				? String.fromCharCode(parseInt(key.substr(2), 16))
				: /^Arrow[A-Z]/.test(key) ? key.substr(5)
				: key === 'Unidentified'  || key === undefined
					? String.fromCharCode(event.keyCode)
					: key;
		return keyLookup[key] ||
				(key.length > 1 ? Base.hyphenate(key) : key.toLowerCase());
	}

	function handleKey(down, key, character, event) {
		var type = down ? 'keydown' : 'keyup',
			view = View._focused,
			name;
		keyMap[key] = down;
		if (down) {
			charMap[key] = character;
		} else {
			delete charMap[key];
		}
		if (key.length > 1 && (name = Base.camelize(key)) in modifiers) {
			modifiers[name] = down;
			var agent = paper && paper.agent;
			if (name === 'meta' && agent && agent.mac) {
				if (down) {
					metaFixMap = {};
				} else {
					for (var k in metaFixMap) {
						if (k in charMap)
							handleKey(false, k, metaFixMap[k], event);
					}
					metaFixMap = null;
				}
			}
		} else if (down && metaFixMap) {
			metaFixMap[key] = character;
		}
		if (view) {
			view._handleKeyEvent(down ? 'keydown' : 'keyup', event, key,
					character);
		}
	}

	DomEvent.add(document, {
		keydown: function(event) {
			var key = getKey(event),
				agent = paper && paper.agent;
			if (key.length > 1 || agent && (agent.chrome && (event.altKey
						|| agent.mac && event.metaKey
						|| !agent.mac && event.ctrlKey))) {
				handleKey(true, key,
						charLookup[key] || (key.length > 1 ? '' : key), event);
			} else {
				downKey = key;
			}
		},

		keypress: function(event) {
			if (downKey) {
				var key = getKey(event),
					code = event.charCode,
					character = code >= 32 ? String.fromCharCode(code)
						: key.length > 1 ? '' : key;
				if (key !== downKey) {
					key = character.toLowerCase();
				}
				handleKey(true, key, character, event);
				downKey = null;
			}
		},

		keyup: function(event) {
			var key = getKey(event);
			if (key in charMap)
				handleKey(false, key, charMap[key], event);
		}
	});

	DomEvent.add(window, {
		blur: function(event) {
			for (var key in charMap)
				handleKey(false, key, charMap[key], event);
		}
	});

	return {
		modifiers: modifiers,

		isDown: function(key) {
			return !!keyMap[key];
		}
	};
};

var MouseEvent = Event.extend({
	_class: 'MouseEvent',

	initialize: function MouseEvent(type, event, point, target, delta) {
		this.type = type;
		this.event = event;
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

var ToolEvent = Event.extend({
	_class: 'ToolEvent',
	_item: null,

	initialize: function ToolEvent(tool, type, event) {
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
		return this._middlePoint;
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
		return this.tool[/^mouse(down|up)$/.test(this.type)
				? '_downCount' : '_moveCount'];
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
				while (/^(Group|CompoundPath)$/.test(parent._class)) {
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

var Tool = PaperScopeItem.extend({
	_class: 'Tool',
	_list: 'tools',
	_reference: 'tool',
	_events: ['onMouseDown', 'onMouseUp', 'onMouseDrag', 'onMouseMove',
			'onActivate', 'onDeactivate', 'onEditOptions', 'onKeyDown',
			'onKeyUp'],

	initialize: function Tool(props) {
		PaperScopeItem.call(this);
		this._moveCount = -1;
		this._downCount = -1;
		this.set(props);
	},

	getMinDistance: function() {
		return this._minDistance;
	},

	setMinDistance: function(minDistance) {
		this._minDistance = minDistance;
		if (minDistance != null && this._maxDistance != null
				&& minDistance > this._maxDistance) {
			this._maxDistance = minDistance;
		}
	},

	getMaxDistance: function() {
		return this._maxDistance;
	},

	setMaxDistance: function(maxDistance) {
		this._maxDistance = maxDistance;
		if (this._minDistance != null && maxDistance != null
				&& maxDistance < this._minDistance) {
			this._minDistance = maxDistance;
		}
	},

	getFixedDistance: function() {
		return this._minDistance == this._maxDistance
			? this._minDistance : null;
	},

	setFixedDistance: function(distance) {
		this._minDistance = this._maxDistance = distance;
	},

	_handleMouseEvent: function(type, event, point, mouse) {
		paper = this._scope;
		if (mouse.drag && !this.responds(type))
			type = 'mousemove';
		var move = mouse.move || mouse.drag,
			responds = this.responds(type),
			minDistance = this.minDistance,
			maxDistance = this.maxDistance,
			called = false,
			tool = this;
		function update(minDistance, maxDistance) {
			var pt = point,
				toolPoint = move ? tool._point : (tool._downPoint || pt);
			if (move) {
				if (tool._moveCount >= 0 && pt.equals(toolPoint)) {
					return false;
				}
				if (toolPoint && (minDistance != null || maxDistance != null)) {
					var vector = pt.subtract(toolPoint),
						distance = vector.getLength();
					if (distance < (minDistance || 0))
						return false;
					if (maxDistance) {
						pt = toolPoint.add(vector.normalize(
								Math.min(distance, maxDistance)));
					}
				}
				tool._moveCount++;
			}
			tool._point = pt;
			tool._lastPoint = toolPoint || pt;
			if (mouse.down) {
				tool._moveCount = -1;
				tool._downPoint = pt;
				tool._downCount++;
			}
			return true;
		}

		function emit() {
			if (responds) {
				called = tool.emit(type, new ToolEvent(tool, type, event))
						|| called;
			}
		}

		if (mouse.down) {
			update();
			emit();
		} else if (mouse.up) {
			update(null, maxDistance);
			emit();
		} else if (responds) {
			while (update(minDistance, maxDistance))
				emit();
		}
		return called;
	}

});

var Tween = Base.extend(Emitter, {
	_class: 'Tween',

	statics: {
		easings: {
			linear: function(t) {
				return t;
			},

			easeInQuad: function(t) {
				return t * t;
			},

			easeOutQuad: function(t) {
				return t * (2 - t);
			},

			easeInOutQuad: function(t) {
				return t < 0.5
					? 2 * t * t
					: -1 + 2 * (2 - t) * t;
			},

			easeInCubic: function(t) {
				return t * t * t;
			},

			easeOutCubic: function(t) {
				return --t * t * t + 1;
			},

			easeInOutCubic: function(t) {
				return t < 0.5
					? 4 * t * t * t
					: (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
			},

			easeInQuart: function(t) {
				return t * t * t * t;
			},

			easeOutQuart: function(t) {
				return 1 - (--t) * t * t * t;
			},

			easeInOutQuart: function(t) {
				return t < 0.5
					? 8 * t * t * t * t
					: 1 - 8 * (--t) * t * t * t;
			},

			easeInQuint: function(t) {
				return t * t * t * t * t;
			},

			easeOutQuint: function(t) {
				return 1 + --t * t * t * t * t;
			},

			easeInOutQuint: function(t) {
				return t < 0.5
					? 16 * t * t * t * t * t
					: 1 + 16 * (--t) * t * t * t * t;
			}
		}
	},

	initialize: function Tween(object, from, to, duration, easing, start) {
		this.object = object;
		var type = typeof easing;
		var isFunction = type === 'function';
		this.type = isFunction
			? type
			: type === 'string'
				? easing
				: 'linear';
		this.easing = isFunction ? easing : Tween.easings[this.type];
		this.duration = duration;
		this.running = false;

		this._then = null;
		this._startTime = null;
		var state = from || to;
		this._keys = state ? Object.keys(state) : [];
		this._parsedKeys = this._parseKeys(this._keys);
		this._from = state && this._getState(from);
		this._to = state && this._getState(to);
		if (start !== false) {
			this.start();
		}
	},

	then: function(then) {
		this._then = then;
		return this;
	},

	start: function() {
		this._startTime = null;
		this.running = true;
		return this;
	},

	stop: function() {
		this.running = false;
		return this;
	},

	update: function(progress) {
		if (this.running) {
			if (progress > 1) {
				progress = 1;
				this.running = false;
			}

			var factor = this.easing(progress),
				keys = this._keys,
				getValue = function(value) {
					return typeof value === 'function'
						? value(factor, progress)
						: value;
				};
			for (var i = 0, l = keys && keys.length; i < l; i++) {
				var key = keys[i],
					from = getValue(this._from[key]),
					to = getValue(this._to[key]),
					value = (from && to && from.__add && to.__add)
						? to.__subtract(from).__multiply(factor).__add(from)
						: ((to - from) * factor) + from;
				this._setProperty(this._parsedKeys[key], value);
			}

			if (!this.running && this._then) {
				this._then(this.object);
			}
			if (this.responds('update')) {
				this.emit('update', new Base({
					progress: progress,
					factor: factor
				}));
			}
		}
		return this;
	},

	_events: {
		onUpdate: {}
	},

	_handleFrame: function(time) {
		var startTime = this._startTime,
			progress = startTime
				? (time - startTime) / this.duration
				: 0;
		if (!startTime) {
			this._startTime = time;
		}
		this.update(progress);
	},

	_getState: function(state) {
		var keys = this._keys,
			result = {};
		for (var i = 0, l = keys.length; i < l; i++) {
			var key = keys[i],
				path = this._parsedKeys[key],
				current = this._getProperty(path),
				value;
			if (state) {
				var resolved = this._resolveValue(current, state[key]);
				this._setProperty(path, resolved);
				value = this._getProperty(path);
				value = value && value.clone ? value.clone() : value;
				this._setProperty(path, current);
			} else {
				value = current && current.clone ? current.clone() : current;
			}
			result[key] = value;
		}
		return result;
	},

	_resolveValue: function(current, value) {
		if (value) {
			if (Array.isArray(value) && value.length === 2) {
				var operator = value[0];
				return (
					operator &&
					operator.match &&
					operator.match(/^[+\-*/]=/)
				)
					? this._calculate(current, operator[0], value[1])
					: value;
			} else if (typeof value === 'string') {
				var match = value.match(/^[+\-*/]=(.*)/);
				if (match) {
					var parsed = JSON.parse(match[1].replace(
						/(['"])?([a-zA-Z0-9_]+)(['"])?:/g,
						'"$2": '
					));
					return this._calculate(current, value[0], parsed);
				}
			}
		}
		return value;
	},

	_calculate: function(left, operator, right) {
		return paper.PaperScript.calculateBinary(left, operator, right);
	},

	_parseKeys: function(keys) {
		var parsed = {};
		for (var i = 0, l = keys.length; i < l; i++) {
			var key = keys[i],
				path = key
					.replace(/\.([^.]*)/g, '/$1')
					.replace(/\[['"]?([^'"\]]*)['"]?\]/g, '/$1');
			parsed[key] = path.split('/');
		}
		return parsed;
	},

	_getProperty: function(path, offset) {
		var obj = this.object;
		for (var i = 0, l = path.length - (offset || 0); i < l && obj; i++) {
			obj = obj[path[i]];
		}
		return obj;
	},

	_setProperty: function(path, value) {
		var dest = this._getProperty(path, 1);
		if (dest) {
			dest[path[path.length - 1]] = value;
		}
	}
});

var Http = {
	request: function(options) {
		var xhr = new self.XMLHttpRequest();
		xhr.open((options.method || 'get').toUpperCase(), options.url,
				Base.pick(options.async, true));
		if (options.mimeType)
			xhr.overrideMimeType(options.mimeType);
		xhr.onload = function() {
			var status = xhr.status;
			if (status === 0 || status === 200) {
				if (options.onLoad) {
					options.onLoad.call(xhr, xhr.responseText);
				}
			} else {
				xhr.onerror();
			}
		};
		xhr.onerror = function() {
			var status = xhr.status,
				message = 'Could not load "' + options.url + '" (Status: '
						+ status + ')';
			if (options.onError) {
				options.onError(message, status);
			} else {
				throw new Error(message);
			}
		};
		return xhr.send(null);
	}
};

var CanvasProvider = {
	canvases: [],

	getCanvas: function(width, height) {
		if (!window)
			return null;
		var canvas,
			clear = true;
		if (typeof width === 'object') {
			height = width.height;
			width = width.width;
		}
		if (this.canvases.length) {
			canvas = this.canvases.pop();
		} else {
			canvas = document.createElement('canvas');
			clear = false;
		}
		var ctx = canvas.getContext('2d');
		if (!ctx) {
			throw new Error('Canvas ' + canvas +
					' is unable to provide a 2D context.');
		}
		if (canvas.width === width && canvas.height === height) {
			if (clear)
				ctx.clearRect(0, 0, width + 1, height + 1);
		} else {
			canvas.width = width;
			canvas.height = height;
		}
		ctx.save();
		return canvas;
	},

	getContext: function(width, height) {
		var canvas = this.getCanvas(width, height);
		return canvas ? canvas.getContext('2d') : null;
	},

	release: function(obj) {
		var canvas = obj && obj.canvas ? obj.canvas : obj;
		if (canvas && canvas.getContext) {
			canvas.getContext('2d').restore();
			this.canvases.push(canvas);
		}
	}
};

var BlendMode = new function() {
	var min = Math.min,
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
			var ln = 255 - l,
				mxl = mx - l;
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
		mn = mn === r ? 0 : mn === g ? 1 : 2;
		mx = mx === r ? 0 : mx === g ? 1 : 2;
		md = min(mn, mx) === 0 ? max(mn, mx) === 1 ? 2 : 1 : 0;
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
			dr = br + sr - (br * sr / 255);
			dg = bg + sg - (bg * sg / 255);
			db = bb + sb - (bb * sb / 255);
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
			dr = br === 0 ? 0 : sr === 255 ? 255 : min(255, 255 * br / (255 - sr));
			dg = bg === 0 ? 0 : sg === 255 ? 255 : min(255, 255 * bg / (255 - sg));
			db = bb === 0 ? 0 : sb === 255 ? 255 : min(255, 255 * bb / (255 - sb));
		},

		'color-burn': function() {
			dr = br === 255 ? 255 : sr === 0 ? 0 : max(0, 255 - (255 - br) * 255 / sr);
			dg = bg === 255 ? 255 : sg === 0 ? 0 : max(0, 255 - (255 - bg) * 255 / sg);
			db = bb === 255 ? 255 : sb === 0 ? 0 : max(0, 255 - (255 - bb) * 255 / sb);
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

	var nativeModes = this.nativeModes = Base.each([
		'source-over', 'source-in', 'source-out', 'source-atop',
		'destination-over', 'destination-in', 'destination-out',
		'destination-atop', 'lighter', 'darker', 'copy', 'xor'
	], function(mode) {
		this[mode] = true;
	}, {});

	var ctx = CanvasProvider.getContext(1, 1);
	if (ctx) {
		Base.each(modes, function(func, mode) {
			var darken = mode === 'darken',
				ok = false;
			ctx.save();
			try {
				ctx.fillStyle = darken ? '#300' : '#a00';
				ctx.fillRect(0, 0, 1, 1);
				ctx.globalCompositeOperation = mode;
				if (ctx.globalCompositeOperation === mode) {
					ctx.fillStyle = darken ? '#a00' : '#300';
					ctx.fillRect(0, 0, 1, 1);
					ok = ctx.getImageData(0, 0, 1, 1).data[0] !== darken
							? 170 : 51;
				}
			} catch (e) {}
			ctx.restore();
			nativeModes[mode] = ok;
		});
		CanvasProvider.release(ctx);
	}

	this.process = function(mode, srcContext, dstContext, alpha, offset) {
		var srcCanvas = srcContext.canvas,
			normal = mode === 'normal';
		if (normal || nativeModes[mode]) {
			dstContext.save();
			dstContext.setTransform(1, 0, 0, 1, 0, 0);
			dstContext.globalAlpha = alpha;
			if (!normal)
				dstContext.globalCompositeOperation = mode;
			dstContext.drawImage(srcCanvas, offset.x, offset.y);
			dstContext.restore();
		} else {
			var process = modes[mode];
			if (!process)
				return;
			var dstData = dstContext.getImageData(offset.x, offset.y,
					srcCanvas.width, srcCanvas.height),
				dst = dstData.data,
				src = srcContext.getImageData(0, 0,
					srcCanvas.width, srcCanvas.height).data;
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
};

var SvgElement = new function() {
	var svg = 'http://www.w3.org/2000/svg',
		xmlns = 'http://www.w3.org/2000/xmlns',
		xlink = 'http://www.w3.org/1999/xlink',
		attributeNamespace = {
			href: xlink,
			xlink: xmlns,
			xmlns: xmlns + '/',
			'xmlns:xlink': xmlns + '/'
		};

	function create(tag, attributes, formatter) {
		return set(document.createElementNS(svg, tag), attributes, formatter);
	}

	function get(node, name) {
		var namespace = attributeNamespace[name],
			value = namespace
				? node.getAttributeNS(namespace, name)
				: node.getAttribute(name);
		return value === 'null' ? null : value;
	}

	function set(node, attributes, formatter) {
		for (var name in attributes) {
			var value = attributes[name],
				namespace = attributeNamespace[name];
			if (typeof value === 'number' && formatter)
				value = formatter.number(value);
			if (namespace) {
				node.setAttributeNS(namespace, name, value);
			} else {
				node.setAttribute(name, value);
			}
		}
		return node;
	}

	return {
		svg: svg,
		xmlns: xmlns,
		xlink: xlink,

		create: create,
		get: get,
		set: set
	};
};

var SvgStyles = Base.each({
	fillColor: ['fill', 'color'],
	fillRule: ['fill-rule', 'string'],
	strokeColor: ['stroke', 'color'],
	strokeWidth: ['stroke-width', 'number'],
	strokeCap: ['stroke-linecap', 'string'],
	strokeJoin: ['stroke-linejoin', 'string'],
	strokeScaling: ['vector-effect', 'lookup', {
		true: 'none',
		false: 'non-scaling-stroke'
	}, function(item, value) {
		return !value
				&& (item instanceof PathItem
					|| item instanceof Shape
					|| item instanceof TextItem);
	}],
	miterLimit: ['stroke-miterlimit', 'number'],
	dashArray: ['stroke-dasharray', 'array'],
	dashOffset: ['stroke-dashoffset', 'number'],
	fontFamily: ['font-family', 'string'],
	fontWeight: ['font-weight', 'string'],
	fontSize: ['font-size', 'number'],
	justification: ['text-anchor', 'lookup', {
		left: 'start',
		center: 'middle',
		right: 'end'
	}],
	opacity: ['opacity', 'number'],
	blendMode: ['mix-blend-mode', 'style']
}, function(entry, key) {
	var part = Base.capitalize(key),
		lookup = entry[2];
	this[key] = {
		type: entry[1],
		property: key,
		attribute: entry[0],
		toSVG: lookup,
		fromSVG: lookup && Base.each(lookup, function(value, name) {
			this[value] = name;
		}, {}),
		exportFilter: entry[3],
		get: 'get' + part,
		set: 'set' + part
	};
}, {});

new function() {
	var formatter;

	function getTransform(matrix, coordinates, center) {
		var attrs = new Base(),
			trans = matrix.getTranslation();
		if (coordinates) {
			matrix = matrix._shiftless();
			var point = matrix._inverseTransform(trans);
			attrs[center ? 'cx' : 'x'] = point.x;
			attrs[center ? 'cy' : 'y'] = point.y;
			trans = null;
		}
		if (!matrix.isIdentity()) {
			var decomposed = matrix.decompose();
			if (decomposed) {
				var parts = [],
					angle = decomposed.rotation,
					scale = decomposed.scaling,
					skew = decomposed.skewing;
				if (trans && !trans.isZero())
					parts.push('translate(' + formatter.point(trans) + ')');
				if (angle)
					parts.push('rotate(' + formatter.number(angle) + ')');
				if (!Numerical.isZero(scale.x - 1)
						|| !Numerical.isZero(scale.y - 1))
					parts.push('scale(' + formatter.point(scale) +')');
				if (skew.x)
					parts.push('skewX(' + formatter.number(skew.x) + ')');
				if (skew.y)
					parts.push('skewY(' + formatter.number(skew.y) + ')');
				attrs.transform = parts.join(' ');
			} else {
				attrs.transform = 'matrix(' + matrix.getValues().join(',') + ')';
			}
		}
		return attrs;
	}

	function exportGroup(item, options) {
		var attrs = getTransform(item._matrix),
			children = item._children;
		var node = SvgElement.create('g', attrs, formatter);
		for (var i = 0, l = children.length; i < l; i++) {
			var child = children[i];
			var childNode = exportSVG(child, options);
			if (childNode) {
				if (child.isClipMask()) {
					var clip = SvgElement.create('clipPath');
					clip.appendChild(childNode);
					setDefinition(child, clip, 'clip');
					SvgElement.set(node, {
						'clip-path': 'url(#' + clip.id + ')'
					});
				} else {
					node.appendChild(childNode);
				}
			}
		}
		return node;
	}

	function exportRaster(item, options) {
		var attrs = getTransform(item._matrix, true),
			size = item.getSize(),
			image = item.getImage();
		attrs.x -= size.width / 2;
		attrs.y -= size.height / 2;
		attrs.width = size.width;
		attrs.height = size.height;
		attrs.href = options.embedImages == false && image && image.src
				|| item.toDataURL();
		return SvgElement.create('image', attrs, formatter);
	}

	function exportPath(item, options) {
		var matchShapes = options.matchShapes;
		if (matchShapes) {
			var shape = item.toShape(false);
			if (shape)
				return exportShape(shape, options);
		}
		var segments = item._segments,
			length = segments.length,
			type,
			attrs = getTransform(item._matrix);
		if (matchShapes && length >= 2 && !item.hasHandles()) {
			if (length > 2) {
				type = item._closed ? 'polygon' : 'polyline';
				var parts = [];
				for (var i = 0; i < length; i++) {
					parts.push(formatter.point(segments[i]._point));
				}
				attrs.points = parts.join(' ');
			} else {
				type = 'line';
				var start = segments[0]._point,
					end = segments[1]._point;
				attrs.set({
					x1: start.x,
					y1: start.y,
					x2: end.x,
					y2: end.y
				});
			}
		} else {
			type = 'path';
			attrs.d = item.getPathData(null, options.precision);
		}
		return SvgElement.create(type, attrs, formatter);
	}

	function exportShape(item) {
		var type = item._type,
			radius = item._radius,
			attrs = getTransform(item._matrix, true, type !== 'rectangle');
		if (type === 'rectangle') {
			type = 'rect';
			var size = item._size,
				width = size.width,
				height = size.height;
			attrs.x -= width / 2;
			attrs.y -= height / 2;
			attrs.width = width;
			attrs.height = height;
			if (radius.isZero())
				radius = null;
		}
		if (radius) {
			if (type === 'circle') {
				attrs.r = radius;
			} else {
				attrs.rx = radius.width;
				attrs.ry = radius.height;
			}
		}
		return SvgElement.create(type, attrs, formatter);
	}

	function exportCompoundPath(item, options) {
		var attrs = getTransform(item._matrix);
		var data = item.getPathData(null, options.precision);
		if (data)
			attrs.d = data;
		return SvgElement.create('path', attrs, formatter);
	}

	function exportSymbolItem(item, options) {
		var attrs = getTransform(item._matrix, true),
			definition = item._definition,
			node = getDefinition(definition, 'symbol'),
			definitionItem = definition._item,
			bounds = definitionItem.getBounds();
		if (!node) {
			node = SvgElement.create('symbol', {
				viewBox: formatter.rectangle(bounds)
			});
			node.appendChild(exportSVG(definitionItem, options));
			setDefinition(definition, node, 'symbol');
		}
		attrs.href = '#' + node.id;
		attrs.x += bounds.x;
		attrs.y += bounds.y;
		attrs.width = bounds.width;
		attrs.height = bounds.height;
		attrs.overflow = 'visible';
		return SvgElement.create('use', attrs, formatter);
	}

	function exportGradient(color) {
		var gradientNode = getDefinition(color, 'color');
		if (!gradientNode) {
			var gradient = color.getGradient(),
				radial = gradient._radial,
				origin = color.getOrigin(),
				destination = color.getDestination(),
				attrs;
			if (radial) {
				attrs = {
					cx: origin.x,
					cy: origin.y,
					r: origin.getDistance(destination)
				};
				var highlight = color.getHighlight();
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
			gradientNode = SvgElement.create((radial ? 'radial' : 'linear')
					+ 'Gradient', attrs, formatter);
			var stops = gradient._stops;
			for (var i = 0, l = stops.length; i < l; i++) {
				var stop = stops[i],
					stopColor = stop._color,
					alpha = stopColor.getAlpha(),
					offset = stop._offset;
				attrs = {
					offset: offset == null ? i / (l - 1) : offset
				};
				if (stopColor)
					attrs['stop-color'] = stopColor.toCSS(true);
				if (alpha < 1)
					attrs['stop-opacity'] = alpha;
				gradientNode.appendChild(
						SvgElement.create('stop', attrs, formatter));
			}
			setDefinition(color, gradientNode, 'color');
		}
		return 'url(#' + gradientNode.id + ')';
	}

	function exportText(item) {
		var node = SvgElement.create('text', getTransform(item._matrix, true),
				formatter);
		node.textContent = item._content;
		return node;
	}

	var exporters = {
		Group: exportGroup,
		Layer: exportGroup,
		Raster: exportRaster,
		Path: exportPath,
		Shape: exportShape,
		CompoundPath: exportCompoundPath,
		SymbolItem: exportSymbolItem,
		PointText: exportText
	};

	function applyStyle(item, node, isRoot) {
		var attrs = {},
			parent = !isRoot && item.getParent(),
			style = [];

		if (item._name != null)
			attrs.id = item._name;

		Base.each(SvgStyles, function(entry) {
			var get = entry.get,
				type = entry.type,
				value = item[get]();
			if (entry.exportFilter
					? entry.exportFilter(item, value)
					: !parent || !Base.equals(parent[get](), value)) {
				if (type === 'color' && value != null) {
					var alpha = value.getAlpha();
					if (alpha < 1)
						attrs[entry.attribute + '-opacity'] = alpha;
				}
				if (type === 'style') {
					style.push(entry.attribute + ': ' + value);
				} else {
					attrs[entry.attribute] = value == null ? 'none'
							: type === 'color' ? value.gradient
								? exportGradient(value, item)
								: value.toCSS(true)
							: type === 'array' ? value.join(',')
							: type === 'lookup' ? entry.toSVG[value]
							: value;
				}
			}
		});

		if (style.length)
			attrs.style = style.join(';');

		if (attrs.opacity === 1)
			delete attrs.opacity;

		if (!item._visible)
			attrs.visibility = 'hidden';

		return SvgElement.set(node, attrs, formatter);
	}

	var definitions;
	function getDefinition(item, type) {
		if (!definitions)
			definitions = { ids: {}, svgs: {} };
		return item && definitions.svgs[type + '-'
				+ (item._id || item.__id || (item.__id = UID.get('svg')))];
	}

	function setDefinition(item, node, type) {
		if (!definitions)
			getDefinition();
		var typeId = definitions.ids[type] = (definitions.ids[type] || 0) + 1;
		node.id = type + '-' + typeId;
		definitions.svgs[type + '-' + (item._id || item.__id)] = node;
	}

	function exportDefinitions(node, options) {
		var svg = node,
			defs = null;
		if (definitions) {
			svg = node.nodeName.toLowerCase() === 'svg' && node;
			for (var i in definitions.svgs) {
				if (!defs) {
					if (!svg) {
						svg = SvgElement.create('svg');
						svg.appendChild(node);
					}
					defs = svg.insertBefore(SvgElement.create('defs'),
							svg.firstChild);
				}
				defs.appendChild(definitions.svgs[i]);
			}
			definitions = null;
		}
		return options.asString
				? new self.XMLSerializer().serializeToString(svg)
				: svg;
	}

	function exportSVG(item, options, isRoot) {
		var exporter = exporters[item._class],
			node = exporter && exporter(item, options);
		if (node) {
			var onExport = options.onExport;
			if (onExport)
				node = onExport(item, node, options) || node;
			var data = JSON.stringify(item._data);
			if (data && data !== '{}' && data !== 'null')
				node.setAttribute('data-paper-data', data);
		}
		return node && applyStyle(item, node, isRoot);
	}

	function setOptions(options) {
		if (!options)
			options = {};
		formatter = new Formatter(options.precision);
		return options;
	}

	Item.inject({
		exportSVG: function(options) {
			options = setOptions(options);
			return exportDefinitions(exportSVG(this, options, true), options);
		}
	});

	Project.inject({
		exportSVG: function(options) {
			options = setOptions(options);
			var children = this._children,
				view = this.getView(),
				bounds = Base.pick(options.bounds, 'view'),
				mx = options.matrix || bounds === 'view' && view._matrix,
				matrix = mx && Matrix.read([mx]),
				rect = bounds === 'view'
					? new Rectangle([0, 0], view.getViewSize())
					: bounds === 'content'
						? Item._getBounds(children, matrix, { stroke: true })
							.rect
						: Rectangle.read([bounds], 0, { readNull: true }),
				attrs = {
					version: '1.1',
					xmlns: SvgElement.svg,
					'xmlns:xlink': SvgElement.xlink,
				};
			if (rect) {
				attrs.width = rect.width;
				attrs.height = rect.height;
				if (rect.x || rect.y)
					attrs.viewBox = formatter.rectangle(rect);
			}
			var node = SvgElement.create('svg', attrs, formatter),
				parent = node;
			if (matrix && !matrix.isIdentity()) {
				parent = node.appendChild(SvgElement.create('g',
						getTransform(matrix), formatter));
			}
			for (var i = 0, l = children.length; i < l; i++) {
				parent.appendChild(exportSVG(children[i], options, true));
			}
			return exportDefinitions(node, options);
		}
	});
};

new function() {

	var definitions = {},
		rootSize;

	function getValue(node, name, isString, allowNull, allowPercent) {
		var value = SvgElement.get(node, name),
			res = value == null
				? allowNull
					? null
					: isString ? '' : 0
				: isString
					? value
					: parseFloat(value);
		return /%\s*$/.test(value)
			? (res / 100) * (allowPercent ? 1
				: rootSize[/x|^width/.test(name) ? 'width' : 'height'])
			: res;
	}

	function getPoint(node, x, y, allowNull, allowPercent) {
		x = getValue(node, x || 'x', false, allowNull, allowPercent);
		y = getValue(node, y || 'y', false, allowNull, allowPercent);
		return allowNull && (x == null || y == null) ? null
				: new Point(x, y);
	}

	function getSize(node, w, h, allowNull, allowPercent) {
		w = getValue(node, w || 'width', false, allowNull, allowPercent);
		h = getValue(node, h || 'height', false, allowNull, allowPercent);
		return allowNull && (w == null || h == null) ? null
				: new Size(w, h);
	}

	function convertValue(value, type, lookup) {
		return value === 'none' ? null
				: type === 'number' ? parseFloat(value)
				: type === 'array' ?
					value ? value.split(/[\s,]+/g).map(parseFloat) : []
				: type === 'color' ? getDefinition(value) || value
				: type === 'lookup' ? lookup[value]
				: value;
	}

	function importGroup(node, type, options, isRoot) {
		var nodes = node.childNodes,
			isClip = type === 'clippath',
			isDefs = type === 'defs',
			item = new Group(),
			project = item._project,
			currentStyle = project._currentStyle,
			children = [];
		if (!isClip && !isDefs) {
			item = applyAttributes(item, node, isRoot);
			project._currentStyle = item._style.clone();
		}
		if (isRoot) {
			var defs = node.querySelectorAll('defs');
			for (var i = 0, l = defs.length; i < l; i++) {
				importNode(defs[i], options, false);
			}
		}
		for (var i = 0, l = nodes.length; i < l; i++) {
			var childNode = nodes[i],
				child;
			if (childNode.nodeType === 1
					&& !/^defs$/i.test(childNode.nodeName)
					&& (child = importNode(childNode, options, false))
					&& !(child instanceof SymbolDefinition))
				children.push(child);
		}
		item.addChildren(children);
		if (isClip)
			item = applyAttributes(item.reduce(), node, isRoot);
		project._currentStyle = currentStyle;
		if (isClip || isDefs) {
			item.remove();
			item = null;
		}
		return item;
	}

	function importPoly(node, type) {
		var coords = node.getAttribute('points').match(
					/[+-]?(?:\d*\.\d+|\d+\.?)(?:[eE][+-]?\d+)?/g),
			points = [];
		for (var i = 0, l = coords.length; i < l; i += 2)
			points.push(new Point(
					parseFloat(coords[i]),
					parseFloat(coords[i + 1])));
		var path = new Path(points);
		if (type === 'polygon')
			path.closePath();
		return path;
	}

	function importPath(node) {
		return PathItem.create(node.getAttribute('d'));
	}

	function importGradient(node, type) {
		var id = (getValue(node, 'href', true) || '').substring(1),
			radial = type === 'radialgradient',
			gradient;
		if (id) {
			gradient = definitions[id].getGradient();
			if (gradient._radial ^ radial) {
				gradient = gradient.clone();
				gradient._radial = radial;
			}
		} else {
			var nodes = node.childNodes,
				stops = [];
			for (var i = 0, l = nodes.length; i < l; i++) {
				var child = nodes[i];
				if (child.nodeType === 1)
					stops.push(applyAttributes(new GradientStop(), child));
			}
			gradient = new Gradient(stops, radial);
		}
		var origin, destination, highlight,
			scaleToBounds = getValue(node, 'gradientUnits', true) !==
				'userSpaceOnUse';
		if (radial) {
			origin = getPoint(node, 'cx', 'cy', false, scaleToBounds);
			destination = origin.add(
					getValue(node, 'r', false, false, scaleToBounds), 0);
			highlight = getPoint(node, 'fx', 'fy', true, scaleToBounds);
		} else {
			origin = getPoint(node, 'x1', 'y1', false, scaleToBounds);
			destination = getPoint(node, 'x2', 'y2', false, scaleToBounds);
		}
		var color = applyAttributes(
				new Color(gradient, origin, destination, highlight), node);
		color._scaleToBounds = scaleToBounds;
		return null;
	}

	var importers = {
		'#document': function (node, type, options, isRoot) {
			var nodes = node.childNodes;
			for (var i = 0, l = nodes.length; i < l; i++) {
				var child = nodes[i];
				if (child.nodeType === 1)
					return importNode(child, options, isRoot);
			}
		},
		g: importGroup,
		svg: importGroup,
		clippath: importGroup,
		polygon: importPoly,
		polyline: importPoly,
		path: importPath,
		lineargradient: importGradient,
		radialgradient: importGradient,

		image: function (node) {
			var raster = new Raster(getValue(node, 'href', true));
			raster.on('load', function() {
				var size = getSize(node);
				this.setSize(size);
				var center = getPoint(node).add(size.divide(2));
				this._matrix.append(new Matrix().translate(center));
			});
			return raster;
		},

		symbol: function(node, type, options, isRoot) {
			return new SymbolDefinition(
					importGroup(node, type, options, isRoot), true);
		},

		defs: importGroup,

		use: function(node) {
			var id = (getValue(node, 'href', true) || '').substring(1),
				definition = definitions[id],
				point = getPoint(node);
			return definition
					? definition instanceof SymbolDefinition
						? definition.place(point)
						: definition.clone().translate(point)
					: null;
		},

		circle: function(node) {
			return new Shape.Circle(
					getPoint(node, 'cx', 'cy'),
					getValue(node, 'r'));
		},

		ellipse: function(node) {
			return new Shape.Ellipse({
				center: getPoint(node, 'cx', 'cy'),
				radius: getSize(node, 'rx', 'ry')
			});
		},

		rect: function(node) {
			return new Shape.Rectangle(new Rectangle(
						getPoint(node),
						getSize(node)
					), getSize(node, 'rx', 'ry'));
			},

		line: function(node) {
			return new Path.Line(
					getPoint(node, 'x1', 'y1'),
					getPoint(node, 'x2', 'y2'));
		},

		text: function(node) {
			var text = new PointText(getPoint(node).add(
					getPoint(node, 'dx', 'dy')));
			text.setContent(node.textContent.trim() || '');
			return text;
		}
	};

	function applyTransform(item, value, name, node) {
		if (item.transform) {
			var transforms = (node.getAttribute(name) || '').split(/\)\s*/g),
				matrix = new Matrix();
			for (var i = 0, l = transforms.length; i < l; i++) {
				var transform = transforms[i];
				if (!transform)
					break;
				var parts = transform.split(/\(\s*/),
					command = parts[0],
					v = parts[1].split(/[\s,]+/g);
				for (var j = 0, m = v.length; j < m; j++)
					v[j] = parseFloat(v[j]);
				switch (command) {
				case 'matrix':
					matrix.append(
							new Matrix(v[0], v[1], v[2], v[3], v[4], v[5]));
					break;
				case 'rotate':
					matrix.rotate(v[0], v[1] || 0, v[2] || 0);
					break;
				case 'translate':
					matrix.translate(v[0], v[1] || 0);
					break;
				case 'scale':
					matrix.scale(v);
					break;
				case 'skewX':
					matrix.skew(v[0], 0);
					break;
				case 'skewY':
					matrix.skew(0, v[0]);
					break;
				}
			}
			item.transform(matrix);
		}
	}

	function applyOpacity(item, value, name) {
		var key = name === 'fill-opacity' ? 'getFillColor' : 'getStrokeColor',
			color = item[key] && item[key]();
		if (color)
			color.setAlpha(parseFloat(value));
	}

	var attributes = Base.set(Base.each(SvgStyles, function(entry) {
		this[entry.attribute] = function(item, value) {
			if (item[entry.set]) {
				item[entry.set](convertValue(value, entry.type, entry.fromSVG));
				if (entry.type === 'color') {
					var color = item[entry.get]();
					if (color) {
						if (color._scaleToBounds) {
							var bounds = item.getBounds();
							color.transform(new Matrix()
								.translate(bounds.getPoint())
								.scale(bounds.getSize()));
						}
					}
				}
			}
		};
	}, {}), {
		id: function(item, value) {
			definitions[value] = item;
			if (item.setName)
				item.setName(value);
		},

		'clip-path': function(item, value) {
			var clip = getDefinition(value);
			if (clip) {
				clip = clip.clone();
				clip.setClipMask(true);
				if (item instanceof Group) {
					item.insertChild(0, clip);
				} else {
					return new Group(clip, item);
				}
			}
		},

		gradientTransform: applyTransform,
		transform: applyTransform,

		'fill-opacity': applyOpacity,
		'stroke-opacity': applyOpacity,

		visibility: function(item, value) {
			if (item.setVisible)
				item.setVisible(value === 'visible');
		},

		display: function(item, value) {
			if (item.setVisible)
				item.setVisible(value !== null);
		},

		'stop-color': function(item, value) {
			if (item.setColor)
				item.setColor(value);
		},

		'stop-opacity': function(item, value) {
			if (item._color)
				item._color.setAlpha(parseFloat(value));
		},

		offset: function(item, value) {
			if (item.setOffset) {
				var percent = value.match(/(.*)%$/);
				item.setOffset(percent ? percent[1] / 100 : parseFloat(value));
			}
		},

		viewBox: function(item, value, name, node, styles) {
			var rect = new Rectangle(convertValue(value, 'array')),
				size = getSize(node, null, null, true),
				group,
				matrix;
			if (item instanceof Group) {
				var scale = size ? size.divide(rect.getSize()) : 1,
				matrix = new Matrix().scale(scale)
						.translate(rect.getPoint().negate());
				group = item;
			} else if (item instanceof SymbolDefinition) {
				if (size)
					rect.setSize(size);
				group = item._item;
			}
			if (group)  {
				if (getAttribute(node, 'overflow', styles) !== 'visible') {
					var clip = new Shape.Rectangle(rect);
					clip.setClipMask(true);
					group.addChild(clip);
				}
				if (matrix)
					group.transform(matrix);
			}
		}
	});

	function getAttribute(node, name, styles) {
		var attr = node.attributes[name],
			value = attr && attr.value;
		if (!value && node.style) {
			var style = Base.camelize(name);
			value = node.style[style];
			if (!value && styles.node[style] !== styles.parent[style])
				value = styles.node[style];
		}
		return !value ? undefined
				: value === 'none' ? null
				: value;
	}

	function applyAttributes(item, node, isRoot) {
		var parent = node.parentNode,
			styles = {
				node: DomElement.getStyles(node) || {},
				parent: !isRoot && !/^defs$/i.test(parent.tagName)
						&& DomElement.getStyles(parent) || {}
			};
		Base.each(attributes, function(apply, name) {
			var value = getAttribute(node, name, styles);
			item = value !== undefined
					&& apply(item, value, name, node, styles) || item;
		});
		return item;
	}

	function getDefinition(value) {
		var match = value && value.match(/\((?:["'#]*)([^"')]+)/),
			name = match && match[1],
			res = name && definitions[window
					? name.replace(window.location.href.split('#')[0] + '#', '')
					: name];
		if (res && res._scaleToBounds) {
			res = res.clone();
			res._scaleToBounds = true;
		}
		return res;
	}

	function importNode(node, options, isRoot) {
		var type = node.nodeName.toLowerCase(),
			isElement = type !== '#document',
			body = document.body,
			container,
			parent,
			next;
		if (isRoot && isElement) {
			rootSize = paper.getView().getSize();
			rootSize = getSize(node, null, null, true) || rootSize;
			container = SvgElement.create('svg', {
				style: 'stroke-width: 1px; stroke-miterlimit: 10'
			});
			parent = node.parentNode;
			next = node.nextSibling;
			container.appendChild(node);
			body.appendChild(container);
		}
		var settings = paper.settings,
			applyMatrix = settings.applyMatrix,
			insertItems = settings.insertItems;
		settings.applyMatrix = false;
		settings.insertItems = false;
		var importer = importers[type],
			item = importer && importer(node, type, options, isRoot) || null;
		settings.insertItems = insertItems;
		settings.applyMatrix = applyMatrix;
		if (item) {
			if (isElement && !(item instanceof Group))
				item = applyAttributes(item, node, isRoot);
			var onImport = options.onImport,
				data = isElement && node.getAttribute('data-paper-data');
			if (onImport)
				item = onImport(node, item, options) || item;
			if (options.expandShapes && item instanceof Shape) {
				item.remove();
				item = item.toPath();
			}
			if (data)
				item._data = JSON.parse(data);
		}
		if (container) {
			body.removeChild(container);
			if (parent) {
				if (next) {
					parent.insertBefore(node, next);
				} else {
					parent.appendChild(node);
				}
			}
		}
		if (isRoot) {
			definitions = {};
			if (item && Base.pick(options.applyMatrix, applyMatrix))
				item.matrix.apply(true, true);
		}
		return item;
	}

	function importSVG(source, options, owner) {
		if (!source)
			return null;
		options = typeof options === 'function' ? { onLoad: options }
				: options || {};
		var scope = paper,
			item = null;

		function onLoad(svg) {
			try {
				var node = typeof svg === 'object' ? svg : new self.DOMParser()
						.parseFromString(svg, 'image/svg+xml');
				if (!node.nodeName) {
					node = null;
					throw new Error('Unsupported SVG source: ' + source);
				}
				paper = scope;
				item = importNode(node, options, true);
				if (!options || options.insert !== false) {
					owner._insertItem(undefined, item);
				}
				var onLoad = options.onLoad;
				if (onLoad)
					onLoad(item, svg);
			} catch (e) {
				onError(e);
			}
		}

		function onError(message, status) {
			var onError = options.onError;
			if (onError) {
				onError(message, status);
			} else {
				throw new Error(message);
			}
		}

		if (typeof source === 'string' && !/^.*</.test(source)) {
			var node = document.getElementById(source);
			if (node) {
				onLoad(node);
			} else {
				Http.request({
					url: source,
					async: true,
					onLoad: onLoad,
					onError: onError
				});
			}
		} else if (typeof File !== 'undefined' && source instanceof File) {
			var reader = new FileReader();
			reader.onload = function() {
				onLoad(reader.result);
			};
			reader.onerror = function() {
				onError(reader.error);
			};
			return reader.readAsText(source);
		} else {
			onLoad(source);
		}

		return item;
	}

	Item.inject({
		importSVG: function(node, options) {
			return importSVG(node, options, this);
		}
	});

	Project.inject({
		importSVG: function(node, options) {
			this.activate();
			return importSVG(node, options, this);
		}
	});
};

var paper = new (PaperScope.inject(Base.exports, {
	Base: Base,
	Numerical: Numerical,
	Key: Key,
	DomEvent: DomEvent,
	DomElement: DomElement,
	document: document,
	window: window,
	Symbol: SymbolDefinition,
	PlacedSymbol: SymbolItem
}))();

if (paper.agent.node) {
	require('./node/extend.js')(paper);
}

if (typeof define === 'function' && define.amd) {
	define('paper', paper);
} else if (typeof module === 'object' && module) {
	module.exports = paper;
}

return paper;
}.call(this, typeof self === 'object' ? self : null);
