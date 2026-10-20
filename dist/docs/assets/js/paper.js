/*!
 * Paper.js v0.14.0-develop - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2020, Jürg Lehni & Jonathan Puckey
 * http://juerglehni.com/ & https://puckey.studio/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 *
 * Date: Tue Oct 20 22:00:12 2026 +0200
 *
 ***
 *
 * Straps.js - Class inheritance library with support for bean-style accessors
 *
 * Copyright (c) 2006 - 2020 Jürg Lehni
 * http://juerglehni.com/
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

if (window && !document.createElement('canvas').getContext('2d'))
	window = null;

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
			hasValue = value !== undefined;
		if (hasValue) {
			var filtered = list.__filtered;
			if (!filtered) {
				var source = this.getSource(list);
				filtered = list.__filtered = Base.create(source);
				filtered.__unfiltered = source;
			}
			filtered[name] = undefined;
		}
		return this.read(hasValue ? [value] : list, start, options, amount);
	},

	readSupported: function(list, dest) {
		var source = this.getSource(list),
			that = this,
			read = false;
		if (source) {
			Object.keys(source).forEach(function(key) {
				if (key in dest) {
					var value = that.readNamed(list, key);
					if (value !== undefined) {
						dest[key] = value;
					}
					read = true;
				}
			});
		}
		return read;
	},

	getSource: function(list) {
		var source = list.__source;
		if (source === undefined) {
			var arg = list.length === 1 && list[0];
			source = list.__source = arg && Base.isPlainObject(arg)
				? arg : null;
		}
		return source;
	},

	getNamed: function(list, name) {
		var source = this.getSource(list);
		if (source) {
			return name ? source[name] : list.__filtered || source;
		}
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
						if (Base.isPlainObject(arg)) {
							arg.insert = false;
							if (useTarget) {
								args = args.concat([Item.INSERT]);
							}
						}
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
			segmentSize: null,
			hitTolerance: 0,
			scaleStrokes: false
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
				/(opera|chrome|safari|webkit|firefox|msie|trident|atom|node|jsdom)\/?\s*([.\d]+)(?:.*version\/([.\d]+))?(?:.*rv\:v?([.\d]+))?/g,
				function(match, n, v1, v2, rv) {
					if (!agent.chrome) {
						var v = n === 'opera' ? v2 :
								/^(node|trident)$/.test(n) ? rv : v1;
						agent.version = v;
						agent.versionNumber = parseFloat(v);
						n = { trident: 'msie', jsdom: 'node' }[n] || n;
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

	version: "0.14.0-develop",

	getView: function() {
		var project = this.project;
		return project && project._view;
	},

	getPaper: function() {
		return this;
	},

	execute: function(code, options) {
			var exports = paper.PaperScript.execute(code, this, options);
			if (window)
				View.updateFocus();
			return exports;
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
		for (var key in this) {
			if (!/^_/.test(key) && this[key] && !(key in scope))
				scope[key] = this[key];
		}
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

	getScope: function() {
		return this._scope;
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

var CollisionDetection = {
	findItemBoundsCollisions: function(items1, items2, tolerance) {
		function getBounds(items) {
			var bounds = new Array(items.length);
			for (var i = 0; i < items.length; i++) {
				var rect = items[i].getBounds();
				bounds[i] = [rect.left, rect.top, rect.right, rect.bottom];
			}
			return bounds;
		}

		var bounds1 = getBounds(items1),
			bounds2 = !items2 || items2 === items1
				? bounds1
				: getBounds(items2);
		return this.findBoundsCollisions(bounds1, bounds2, tolerance || 0);
	},

	findCurveBoundsCollisions: function(curves1, curves2, tolerance, bothAxis) {
		function getBounds(curves) {
			var min = Math.min,
				max = Math.max,
				bounds = new Array(curves.length);
			for (var i = 0; i < curves.length; i++) {
				var v = curves[i];
				bounds[i] = [
					min(v[0], v[2], v[4], v[6]),
					min(v[1], v[3], v[5], v[7]),
					max(v[0], v[2], v[4], v[6]),
					max(v[1], v[3], v[5], v[7])
				];
			}
			return bounds;
		}

		var bounds1 = getBounds(curves1),
			bounds2 = !curves2 || curves2 === curves1
				? bounds1
				: getBounds(curves2);
		if (bothAxis) {
			var hor = this.findBoundsCollisions(
					bounds1, bounds2, tolerance || 0, false, true),
				ver = this.findBoundsCollisions(
					bounds1, bounds2, tolerance || 0, true, true),
				list = [];
			for (var i = 0, l = hor.length; i < l; i++) {
				list[i] = { hor: hor[i], ver: ver[i] };
			}
			return list;
		}
		return this.findBoundsCollisions(bounds1, bounds2, tolerance || 0);
	},

	findBoundsCollisions: function(boundsA, boundsB, tolerance,
		sweepVertical, onlySweepAxisCollisions) {
		var self = !boundsB || boundsA === boundsB,
			allBounds = self ? boundsA : boundsA.concat(boundsB),
			lengthA = boundsA.length,
			lengthAll = allBounds.length;

		function binarySearch(indices, coord, value) {
			var lo = 0,
				hi = indices.length;
			while (lo < hi) {
				var mid = (hi + lo) >>> 1;
				if (allBounds[indices[mid]][coord] < value) {
					lo = mid + 1;
				} else {
					hi = mid;
				}
			}
			return lo - 1;
		}

		var pri0 = sweepVertical ? 1 : 0,
			pri1 = pri0 + 2,
			sec0 = sweepVertical ? 0 : 1,
			sec1 = sec0 + 2;
		var allIndicesByPri0 = new Array(lengthAll);
		for (var i = 0; i < lengthAll; i++) {
			allIndicesByPri0[i] = i;
		}
		allIndicesByPri0.sort(function(i1, i2) {
			return allBounds[i1][pri0] - allBounds[i2][pri0];
		});
		var activeIndicesByPri1 = [],
			allCollisions = new Array(lengthA);
		for (var i = 0; i < lengthAll; i++) {
			var curIndex = allIndicesByPri0[i],
				curBounds = allBounds[curIndex],
				origIndex = self ? curIndex : curIndex - lengthA,
				isCurrentA = curIndex < lengthA,
				isCurrentB = self || !isCurrentA,
				curCollisions = isCurrentA ? [] : null;
			if (activeIndicesByPri1.length) {
				var pruneCount = binarySearch(activeIndicesByPri1, pri1,
						curBounds[pri0] - tolerance) + 1;
				activeIndicesByPri1.splice(0, pruneCount);
				if (self && onlySweepAxisCollisions) {
					curCollisions = curCollisions.concat(activeIndicesByPri1);
					for (var j = 0; j < activeIndicesByPri1.length; j++) {
						var activeIndex = activeIndicesByPri1[j];
						allCollisions[activeIndex].push(origIndex);
					}
				} else {
					var curSec1 = curBounds[sec1],
						curSec0 = curBounds[sec0];
					for (var j = 0; j < activeIndicesByPri1.length; j++) {
						var activeIndex = activeIndicesByPri1[j],
							activeBounds = allBounds[activeIndex],
							isActiveA = activeIndex < lengthA,
							isActiveB = self || activeIndex >= lengthA;

						if (
							onlySweepAxisCollisions ||
							(
								isCurrentA && isActiveB ||
								isCurrentB && isActiveA
							) && (
								curSec1 >= activeBounds[sec0] - tolerance &&
								curSec0 <= activeBounds[sec1] + tolerance
							)
						) {
							if (isCurrentA && isActiveB) {
								curCollisions.push(
									self ? activeIndex : activeIndex - lengthA);
							}
							if (isCurrentB && isActiveA) {
								allCollisions[activeIndex].push(origIndex);
							}
						}
					}
				}
			}
			if (isCurrentA) {
				if (boundsA === boundsB) {
					curCollisions.push(curIndex);
				}
				allCollisions[curIndex] = curCollisions;
			}
			if (activeIndicesByPri1.length) {
				var curPri1 = curBounds[pri1],
					index = binarySearch(activeIndicesByPri1, pri1, curPri1);
				activeIndicesByPri1.splice(index + 1, 0, curIndex);
			} else {
				activeIndicesByPri1.push(curIndex);
			}
		}
		for (var i = 0; i < allCollisions.length; i++) {
			var collisions = allCollisions[i];
			if (collisions) {
				collisions.sort(function(i1, i2) { return i1 - i2; });
			}
		}
		return allCollisions;
	}
};

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
		ANGULAR_EPSILON: 1e-5,
		KAPPA: 4 * (sqrt(2) - 1) / 3,

		getEpsilon: function(magnitude) {
			return Math.max(EPSILON, magnitude * 4 * MACHINE_EPSILON);
		},

		isZero: function(val) {
			return val >= -EPSILON && val <= EPSILON;
		},

		isMachineZero: function(val) {
			return val >= -MACHINE_EPSILON && val <= MACHINE_EPSILON;
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
		},

		solveBernstein: function(coefficients, errors, roots, width) {
			var count = 0;

			function subdivide(values, bounds) {
				var left = [],
					right = [],
					leftBounds = [],
					rightBounds = [],
					v = values.slice(),
					e = bounds.slice();
				for (var n = v.length; n > 0; n--) {
					left.push(v[0]);
					right.unshift(v[n - 1]);
					leftBounds.push(e[0]);
					rightBounds.unshift(e[n - 1]);
					for (var i = 0; i < n - 1; i++) {
						v[i] = (v[i] + v[i + 1]) / 2;
						e[i] = (e[i] + e[i + 1]) / 2
								+ MACHINE_EPSILON * abs(v[i]);
					}
				}
				return [left, right, leftBounds, rightBounds];
			}

			function evaluate(values, t) {
				var v = values.slice();
				for (var n = v.length - 1; n > 0; n--) {
					for (var i = 0; i < n; i++)
						v[i] = v[i] + (v[i + 1] - v[i]) * t;
				}
				return v[0];
			}

			function solve(values, bounds, from, to) {
				var changes = 0,
					zeros = 0,
					sign = 0;
				for (var i = 0, l = values.length; i < l; i++) {
					var value = values[i];
					if (abs(value) <= bounds[i]) {
						zeros++;
					} else {
						var s = value > 0 ? 1 : -1;
						if (sign && s !== sign)
							changes++;
						sign = s;
					}
				}
				if (zeros === values.length
						|| (changes || zeros) && to - from <= width) {
					roots[count++] = (from + to) / 2;
				} else if (changes === 1 && !zeros) {
					var a = 0,
						b = 1,
						isNegative = values[0] < 0;
					while (from + (to - from) * a < from + (to - from) * b
							&& (a + b) / 2 > a && (a + b) / 2 < b) {
						var t = (a + b) / 2;
						if (evaluate(values, t) < 0 === isNegative) {
							a = t;
						} else {
							b = t;
						}
					}
					roots[count++] = from + (to - from) * (a + b) / 2;
				} else if (changes || zeros) {
					var parts = subdivide(values, bounds),
						middle = (from + to) / 2;
					solve(parts[0], parts[2], from, middle);
					solve(parts[1], parts[3], middle, to);
				}
			}

			solve(coefficients, errors, 0, 1);
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
			} else if ('angleInRadians' in obj) {
				this._set(obj.length || 0, 0);
				this.setAngleInRadians(obj.angleInRadians || 0);
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
		var args = arguments,
			point = Point.read(args),
			x = point.x - this.x,
			y = point.y - this.y,
			d = x * x + y * y,
			squared = Base.read(args);
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
		var args = arguments,
			point = Point.read(args),
			tolerance = Base.read(args);
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

	clamp: function() {
		var args = arguments,
			min = Point.read(args),
			max = Point.read(args);
		return new Point(
			Numerical.clamp(this.x, min.x, max.x),
			Numerical.clamp(this.y, min.y, max.y)
		);
	},

	statics: {
		min: function() {
			var args = arguments,
				point1 = Point.read(args),
				point2 = Point.read(args);
			return new Point(
				Math.min(point1.x, point2.x),
				Math.min(point1.y, point2.y)
			);
		},

		max: function() {
			var args = arguments,
				point1 = Point.read(args),
				point2 = Point.read(args);
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
		var args = arguments,
			type = typeof arg0,
			read;
		if (type === 'number') {
			this._set(arg0, arg1, arg2, arg3);
			read = 4;
		} else if (type === 'undefined' || arg0 === null) {
			this._set(0, 0, 0, 0);
			read = arg0 === null ? 1 : 0;
		} else if (args.length === 1
				|| Array.isArray(arg0) && arg0.length === 4
				|| arg0.x !== undefined && arg0.width !== undefined) {
			if (Array.isArray(arg0)) {
				this._set.apply(this, arg0);
				read = 1;
			} else if (arg0.x !== undefined || arg0.width !== undefined) {
				this._set(arg0.x || 0, arg0.y || 0,
						arg0.width || 0, arg0.height || 0);
				read = 1;
			} else if (arg0.from === undefined && arg0.to === undefined) {
				var builder = new RectangleBuilder();
				if (Base.readSupported(args, builder)) {
					read = 1;
				}
				this._set(builder.x, builder.y, builder.width, builder.height);
			}
		}
		if (read === undefined) {
			var frm = Point.readNamed(args, 'from'),
				next = Base.peek(args),
				x = frm.x,
				y = frm.y,
				width,
				height;
			if (next && next.x !== undefined || Base.hasNamed(args, 'to')) {
				var to = Point.readNamed(args, 'to');
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
				var size = Size.read(args);
				width = size.width;
				height = size.height;
			}
			this._set(x, y, width, height);
			read = args.__index;
		}
		var filtered = args.__filtered;
		if (filtered)
			this.__filtered = filtered;
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

	setSize: function() {
		var size = Size.read(arguments);
		this.width = size.width;
		this.height = size.height;
	},

	getLeft: function() {
		return this.x;
	},

	setLeft: function(left) {
		this.width -= left - this.x;
		this.x = left;
	},

	getTop: function() {
		return this.y;
	},

	setTop: function(top) {
		this.height -= top - this.y;
		this.y = top;
	},

	getRight: function() {
		return this.x + this.width;
	},

	setRight: function(right) {
		this.width = right - this.x;
	},

	getBottom: function() {
		return this.y + this.height;
	},

	setBottom: function(bottom) {
		this.height = bottom - this.y;
	},

	getCenterX: function() {
		return this.x + this.width / 2;
	},

	setCenterX: function(x) {
		this.x = x - this.width / 2;
	},

	getCenterY: function() {
		return this.y + this.height / 2;
	},

	setCenterY: function(y) {
		this.y = y - this.height / 2;
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

var RectangleBuilder = Rectangle.extend({
	beans: true,

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

	setLeft: function(left) {
		if (!this._fw) {
			var amount = left - this.x;
			this.width -= this._sx === 0.5 ? amount * 2 : amount;
		}
		this.x = left;
		this._sx = this._fw = 0;
	},

	setTop: function(top) {
		if (!this._fh) {
			var amount = top - this.y;
			this.height -= this._sy === 0.5 ? amount * 2 : amount;
		}
		this.y = top;
		this._sy = this._fh = 0;
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

	setBottom: function(bottom) {
		if (!this._fh) {
			var amount = bottom - this.y;
			this.height = this._sy === 0.5 ? amount * 2 : amount;
		}
		this.y = bottom - this.height;
		this._sy = 1;
		this._fh = 0;
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
	}
});

var Matrix = Base.extend({
	_class: 'Matrix',

	initialize: function Matrix(arg, _dontNotify) {
		var args = arguments,
			count = args.length,
			ok = true;
		if (count >= 6) {
			this._set.apply(this, args);
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
			owner.transform(null, Base.pick(recursively, true), _setApplyMatrix);
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
		var args = arguments,
			scale = Point.read(args),
			center = Point.read(args, 0, { readNull: true });
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
		var args = arguments,
			shear = Point.read(args),
			center = Point.read(args, 0, { readNull: true });
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
		var args = arguments,
			skew = Point.read(args),
			center = Point.read(args, 0, { readNull: true }),
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

	_getMeanScale: function() {
		return Math.sqrt(Math.abs(this._a * this._d - this._b * this._c));
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
			if (!Numerical.isMachineZero(cross)) {
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
			if (!isInfinite && Numerical.isMachineZero(ccw)) {
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
			  return  vx === 0 ? (vy > 0 ? x - px : px - x)
					: vy === 0 ? (vx < 0 ? y - py : py - y)
					: ((x - px) * vy - (y - py) * vx) / (
						vy > vx
							? Math.abs(vy)
								* Math.sqrt(1 + (vx * vx) / (vy * vy))
							: Math.abs(vx)
								* Math.sqrt(1 + (vy * vy) / (vx * vx))
					);
		},

		getDistance: function(px, py, vx, vy, x, y, asVector) {
			return Math.abs(
					Line.getSignedDistance(px, py, vx, vy, x, y, asVector));
		}
	}
});

var ChangeFlag = {
	APPEARANCE: 0x1,

	CHILDREN: 0x2,

	INSERTION: 0x4,

	GEOMETRY: 0x8,

	MATRIX: 0x10,

	SEGMENTS: 0x20,

	STROKE: 0x40,

	STYLE: 0x80,

	ATTRIBUTE: 0x100,

	CONTENT: 0x200,

	PIXELS: 0x400,

	CLIPPING: 0x800,

	VIEW: 0x1000
};

var Change = {
	CHILDREN: ChangeFlag.CHILDREN | ChangeFlag.GEOMETRY | ChangeFlag.APPEARANCE,
	INSERTION: ChangeFlag.INSERTION | ChangeFlag.APPEARANCE,
	GEOMETRY: ChangeFlag.GEOMETRY | ChangeFlag.APPEARANCE,
	MATRIX: ChangeFlag.MATRIX | ChangeFlag.GEOMETRY | ChangeFlag.APPEARANCE,
	SEGMENTS: ChangeFlag.SEGMENTS | ChangeFlag.GEOMETRY | ChangeFlag.APPEARANCE,
	STROKE: ChangeFlag.STROKE | ChangeFlag.STYLE | ChangeFlag.APPEARANCE,
	STYLE: ChangeFlag.STYLE | ChangeFlag.APPEARANCE,
	ATTRIBUTE: ChangeFlag.ATTRIBUTE | ChangeFlag.APPEARANCE,
	CONTENT: ChangeFlag.CONTENT | ChangeFlag.GEOMETRY | ChangeFlag.APPEARANCE,
	PIXELS: ChangeFlag.PIXELS | ChangeFlag.APPEARANCE,
	VIEW: ChangeFlag.VIEW | ChangeFlag.APPEARANCE
};

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
		if (changes && item && item.isInserted()) {
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

	getTrackChanges: function() {
		return !!this._changes;
	},

	setTrackChanges: function(trackChanges) {
		if (!this._changes ^ !trackChanges) {
			this._changes = trackChanges ? [] : null;
			this._changesById = trackChanges ? {} : null;
		}
	},

	takeChanges: function() {
		var changes = this._changes;
		if (changes) {
			this._changes = [];
			this._changesById = {};
		}
		return changes || null;
	},

	hasChanges: function() {
		return !!(this._changes && this._changes.length);
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

	_updateSelection: function(item, remove) {
		var id = item._id,
			selectionItems = this._selectionItems;
		if (item._selection && !remove && item.isInserted()) {
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
			ctx.lineWidth = 1;
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

		INSERT: { insert: true },
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
					if (this.isInserted())
						this.getView()._countItemEvent(type, 1);
				},

				uninstall: function(type) {
					if (this.isInserted())
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
		if (!project) {
			throw new Error('Unable to create an item without a project. '
					+ 'Call paper.setup() or create a Project first.');
		}
		this._id = internal ? null : UID.get();
		this._parent = this._index = null;
		this._applyMatrix = this._canApplyMatrix && settings.applyMatrix;
		if (point)
			matrix.translate(point);
		matrix._owner = this;
		this._style = new Style(project._currentStyle, this, project);
		if (internal || hasProps && props.insert == false
			|| !settings.insertItems && !(hasProps && props.insert == true)) {
			this._setProject(project);
		} else {
			(hasProps && props.parent || project)
					._insertItem(undefined, this, true);
		}
		if (hasProps && props !== Item.NO_INSERT && props !== Item.INSERT) {
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
					bounds.width !== 0 ? rect.width / bounds.width : 1,
					bounds.height !== 0 ? rect.height / bounds.height : 1);
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
		var internal = options.internal && !noInternal,
			cacheItem = options.cacheItem,
			_matrix = internal ? null : this._matrix._orNullIfIdentity();
		matrix = matrix ? matrix._orNullIfIdentity() : _matrix;
		var cacheKey = cacheItem && (matrix ? matrix.equals(_matrix) : !_matrix)
				&& this._getBoundsCacheKey(options, internal),
			isIntermediate = cacheKey && cacheItem !== this
					&& (this._children || this._definition),
			bounds = this._bounds;
		Item._updateBoundsCache(this._parent || this._symbol, cacheItem);
		if (isIntermediate)
			Item._updateBoundsCache(this, cacheItem);
		if (cacheKey && bounds && cacheKey in bounds) {
			var cached = bounds[cacheKey];
			return {
				rect: cached.rect.clone(),
				nonscaling: cached.nonscaling
			};
		}
		var res = this._getBounds(matrix, isIntermediate
				? Base.set({}, options, { cacheItem: this })
				: options),
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

		getBounds: function(items, options) {
			return Item._getBounds(items, null, options, true).rect;
		},

		_getBounds: function(items, matrix, options, global) {
			var x1 = Infinity,
				x2 = -x1,
				y1 = x1,
				y2 = x2,
				nonscaling = false;
			options = options || {};
			for (var i = 0, l = items.length; i < l; i++) {
				var item = items[i];
				if (item._visible && !item.isEmpty(true)) {
					var bounds = item._getCachedBounds(global
							? item.getGlobalMatrix(true)
							: matrix && matrix.appended(item._matrix),
							options, true),
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
				isZero = Numerical.isZero;
			if (isZero(current.x) || isZero(current.y)) {
				matrix.translate(decomposed.translation);
				if (rotation) {
					matrix.rotate(rotation);
				}
				matrix.scale(scaling.x, scaling.y);
				this._matrix.set(matrix);
			} else {
				var center = this.getPosition(true);
				matrix.translate(center);
				if (rotation)
					matrix.rotate(rotation);
				matrix.scale(scaling.x / current.x, scaling.y / current.y);
				if (rotation)
					matrix.rotate(-rotation);
				matrix.translate(center.negate());
				this.transform(matrix);
			}
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
		matrix.set.apply(matrix, arguments);
	},

	getGlobalMatrix: function(_dontClone) {
		var parent = this._parent,
			parentMatrix = parent && parent.getGlobalMatrix(true),
			matrix = this._globalMatrix;
		if (!matrix || this._parentGlobalMatrix !== parentMatrix) {
			matrix = this._globalMatrix = this._matrix.clone();
			if (parentMatrix)
				matrix.prepend(parentMatrix);
			this._parentGlobalMatrix = parentMatrix;
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
			this._project = project;
			var children = this._children;
			for (var i = 0, l = children && children.length; i < l; i++)
				children[i]._setProject(project);
		}
		if (installEvents)
			this._installEvents(true);
	},

	getView: function() {
		return this._project._view;
	},

	getScope: function() {
		return this._project._scope;
	},

	_installEvents: function _installEvents(install) {
		_installEvents.base.call(this, install);
		if (this._selection)
			this._project._updateSelection(this, !install);
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

	setIndex: function(index) {
		var parent = this._parent,
			children = parent && parent._children;
		if (children) {
			parent.insertChildren(index in children ? index : undefined,
								  [this]);
		}
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
					typeof options === 'boolean' ? options
						: paper.settings.insertItems),
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

	rasterize: function(arg0, arg1) {
		var resolution,
			insert,
			raster;
		if (Base.isPlainObject(arg0)) {
			resolution = arg0.resolution;
			insert = arg0.insert;
			raster = arg0.raster;
		} else {
			resolution = arg0;
			insert = arg1;
		}
		if (!raster) {
			raster = new Raster(Item.NO_INSERT);
		}
		var bounds = this.getStrokeBounds(),
			scale = (resolution || this.getView().getResolution()) / 72,
			topLeft = bounds.getTopLeft().floor(),
			bottomRight = bounds.getBottomRight().ceil(),
			boundsSize = new Size(bottomRight.subtract(topLeft)),
			rasterSize = boundsSize.multiply(scale);
		raster.setSize(rasterSize, true);

		if (!rasterSize.isZero()) {
			var ctx = raster.getContext(true),
				matrix = new Matrix().scale(scale).translate(topLeft.negate());
			ctx.save();
			matrix.applyToContext(ctx);
			this.draw(ctx, new Base({ matrices: [matrix] }));
			ctx.restore();
		}
		raster._matrix.set(
			new Matrix()
				.translate(topLeft.add(boundsSize.divide(2)))
				.scale(1 / scale)
		);
		if (Base.pick(insert, paper.settings.insertItems)) {
			raster.insertAbove(this);
		}
		return raster;
	},

	contains: function() {
		var matrix = this._matrix;
		return (
			matrix.isInvertible() &&
			!!this._contains(matrix._inverseTransform(Point.read(arguments)))
		);
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
			applyMatrix: false,
			matrix: this._matrix,
			insert: false,
		});
	},

	intersects: function(item, _matrix) {
		if (!(item instanceof Item))
			return false;
		var path1 = this._asPathItem(),
			path2 = item._asPathItem(),
			matrix1 = path1._matrix,
			matrix2 = _matrix || path2._matrix;

		function contains(path, matrix, other, otherMatrix) {
			var paths = path._children || [path];
			for (var i = 0, l = paths.length; i < l; i++) {
				var segment = paths[i]._segments[0],
					point = segment && otherMatrix._inverseTransform(
							matrix._transformPoint(segment._point));
				if (point && other._contains(point))
					return true;
			}
			return false;
		}

		return path1.getIntersections(path2, null, _matrix, true).length > 0
				|| contains(path2, matrix2, path1, matrix1)
				|| contains(path1, matrix1, path2, matrix2);
	}
},
new function() {
	function hitTest() {
		var args = arguments;
		return this._hitTest(
				Point.read(args),
				HitResult.getOptions(args));
	}

	function hitTestAll() {
		var args = arguments,
			point = Point.read(args),
			options = HitResult.getOptions(args),
			all = [];
		this._hitTest(point, new Base({ all: all }, options));
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
				|| !this._shell && this.isEmpty()) {
			return null;
		}

		var matrix = this._matrix,
			pointMatrix = parentViewMatrix ? matrix : this.getGlobalMatrix(),
			viewMatrix = parentViewMatrix
					? parentViewMatrix.appended(matrix)
					: pointMatrix.prepended(this.getView()._matrix),
			tolerance = Math.max(options.tolerance, 1e-12),
			tolerancePadding = options._tolerancePadding = new Size(
					Path._getStrokePadding(tolerance, viewMatrix
						.prepended(this.getView()._matrix.inverted())
						._shiftless().invert()));
		point = pointMatrix._inverseTransform(point);
		if (!point || (this._shell || !this._children) &&
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
			if (Array.isArray(hit)) {
				var first = null;
				for (var i = 0, l = hit.length; i < l; i++) {
					var res = filter(hit[i]);
					first = first || res;
				}
				return first;
			}
			if (hit && match && !match(hit))
				hit = null;
			if (hit && options.all) {
				if (hit.point)
					hit.point = that.getGlobalMatrix().transform(hit.point);
				options.all.push(hit);
			}
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
		if (res && res.point && !options.all) {
			res.point = pointMatrix.transform(res.point);
		}
		return res;
	},

	_hitTestSelf: function(point, options) {
		if (options.fill && this.getFillColor() && this._contains(point))
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
					recursive: !obj || obj.recursive !== false,
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
							|| param.overlapping
								&& param.path.intersects(child, childMatrix)))
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
		json = typeof json === 'string' ? JSON.parse(json) : json;
		var props = json && json[0] === this._class && json[1];
		if (Base.isPlainObject(props)) {
			var item = new this.constructor(Item.NO_INSERT),
				fields = Base.set({}, this._serializeFields,
					this instanceof Group ? null : this._style._defaults),
				defaults = {};
			for (var key in fields) {
				if (!(key in props) && !Base.equals(this[key], item[key]))
					defaults[key] = item[key];
			}
			this.set(defaults);
		}
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
			this._installEvents(false);
			if (notifySelf && project._changes)
				this._changed(5);
			if (index != null) {
				if (project._activeLayer === this)
					project._activeLayer = this.getNextSibling()
							|| this.getPreviousSibling();
				Base.splice(owner._children, null, index, 1);
			}
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
		var ok = item;
		for (var i = 0, l = arguments.length; i < l && ok; i++)
			ok = arguments[i] && arguments[i].insertBelow(this);
		if (ok)
			this.remove();
		return ok && item;
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

	isEmpty: function(recursively) {
		var children = this._children;
		var numChildren = children ? children.length : 0;
		if (recursively) {
			for (var i = 0; i < numChildren; i++) {
				if (!children[i].isEmpty(recursively)) {
					return false;
				}
			}
			return true;
		}
		return !numChildren;
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
		var args = arguments,
			value = (rotate ? Base : Point).read(args),
			center = Point.read(args, 0, { readNull: true });
		return this.transform(new Matrix()[key](value,
				center || this.getPosition(true)));
	};
}, {
	translate: function() {
		var mx = new Matrix();
		return this.transform(mx.translate.apply(mx, arguments));
	},

	transform: function(matrix, _applyRecursively, _setApplyMatrix) {
		var _matrix = this._matrix,
			transformMatrix = matrix && !matrix.isIdentity(),
			applyMatrix = (
				_setApplyMatrix && this._canApplyMatrix ||
				this._applyMatrix && (
					transformMatrix || !_matrix.isIdentity() ||
					_applyRecursively && this._children
				)
			);
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

		if (applyMatrix && (applyMatrix = this._transformContent(
				_matrix, _applyRecursively, _setApplyMatrix))) {
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
			for (var i = 0, l = children.length; i < l; i++) {
				children[i].transform(matrix, applyRecursively, setApplyMatrix);
			}
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

	fitBounds: function(rectangle, fit) {
		rectangle = Rectangle.read(arguments);
		fit = Base.read(arguments);
		if (fit === true)
			fit = 'cover';
		var bounds = this.getBounds(),
			hor = rectangle.width / bounds.width,
			ver = rectangle.height / bounds.height,
			size;

		function isScaling(ratio) {
			return ratio > 0 && isFinite(ratio);
		}

		if (fit === 'fill') {
			size = new Size(
				isScaling(hor) ? rectangle.width : bounds.width,
				isScaling(ver) ? rectangle.height : bounds.height);
		} else {
			var ratios = [hor, ver].filter(isScaling),
				scale = !ratios.length ? 1
					: fit === 'cover' ? Math.max.apply(Math, ratios)
					: Math.min.apply(Math, ratios);
			size = bounds.getSize().multiply(scale);
		}
		this.setBounds(new Rectangle(new Point(), size)
				.setCenter(rectangle.getCenter()));
	}
}), {

	_setStyles: function(ctx, param, viewMatrix, strokeMatrix) {
		var style = this._style,
			matrix = this._matrix;
		if (style.hasFill()) {
			ctx.fillStyle = style.getFillColor().toCanvasStyle(ctx, matrix,
					strokeMatrix);
		}
		if (style.hasStroke()) {
			ctx.strokeStyle = style.getStrokeColor().toCanvasStyle(ctx,
					matrix, strokeMatrix);
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
			parentMatrix = matrices[matrices.length - 1],
			globalMatrix = parentMatrix.appended(matrix);
		if (!globalMatrix.isInvertible())
			return;

		viewMatrix = viewMatrix ? viewMatrix.appended(globalMatrix)
				: globalMatrix;

		matrices.push(globalMatrix);
		if (param.updateMatrix) {
			this._globalMatrix = globalMatrix;
			this._parentGlobalMatrix = this._parent && parentMatrix;
		}

		var blendMode = this._blendMode,
			opacity = Numerical.clamp(this._opacity, 0, 1),
			normalBlend = blendMode === 'normal',
			nativeBlend = BlendMode.nativeModes[blendMode],
			direct = normalBlend && opacity === 1 && !this._isolated
					|| param.dontStart
					|| param.clip
					|| (nativeBlend || normalBlend && opacity < 1)
						&& this._canComposite(),
			pixelRatio = param.pixelRatio || 1,
			mainCtx, itemOffset, prevOffset;
		if (!direct) {
			var bounds = this.getStrokeBounds(viewMatrix),
				style = this._style;
			if (style.getShadowColor(true)) {
				var mx = viewMatrix._shiftless(),
					blur = mx.transform(
							new Point(style.getShadowBlur(true), 0)),
					offset = mx.transform(style.getShadowOffset(true));
				bounds = bounds.unite(
					new Rectangle(bounds.getPoint().add(offset),
						bounds.getSize()).expand(blur.getLength() * 3));
			}
			var canvas = ctx.canvas;
			bounds = bounds.intersect(
					new Rectangle(new Point(param.offset),
						new Size(canvas.width, canvas.height)
							.divide(pixelRatio)));
			if (bounds.width <= 0 || bounds.height <= 0) {
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
		if (clip) {
			(param.viewMatrix ? param.viewMatrix.appended(parentMatrix)
					: parentMatrix).applyToContext(ctx);
			param.clipItem.draw(ctx, param.extend({
				clip: true,
				matrices: matrices.slice(0, -1)
			}));
			matrix.applyToContext(ctx);
		} else if (transform) {
			(direct ? matrix : viewMatrix).applyToContext(ctx);
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
		if (param.clip && !param.dontFinish) {
			ctx.clip(this.getFillRule());
		}
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
				&& this._isUpdated(updateVersion) && this.isInserted()) {
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
		isolated: false,
		children: []
	},
	_isolated: false,

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

	ungroup: function() {
		if (!this._parent)
			return null;
		var children = this._children.slice(),
			clipItem = this._getClipItem(),
			matrix = this._matrix;
		if (clipItem)
			clipItem.setClipMask(false);
		if (!matrix.isIdentity()) {
			for (var i = 0, l = children.length; i < l; i++)
				children[i].transform(matrix);
		}
		return this.replaceWith.apply(this, children) ? children : null;
	},

	isIsolated: function() {
		return this._isolated;
	},

	setIsolated: function(isolated) {
		this._isolated = !!isolated;
		this._changed(257);
	},

	_getBounds: function _getBounds(matrix, options) {
		var clipItem = this._getClipItem();
		return clipItem
			? clipItem._getCachedBounds(clipItem._matrix.prepended(matrix),
				Base.set({}, options, { stroke: false }))
			: _getBounds.base.call(this, matrix, options);
	},

	_hitTestChildren: function _hitTestChildren(point, options, viewMatrix) {
		var clipItem = this._getClipItem();
		return (!clipItem || clipItem.contains(point))
				&& _hitTestChildren.base.call(this, point, options, viewMatrix,
					clipItem);
	},

	_hitTestSelf: function(point, options, viewMatrix) {
		if (options.match || options.class || options.type || options.all) {
			var res = this._hitTestChildren(point, options.extend({
				all: null, match: null, class: null, type: null
			}), viewMatrix);
			if (res)
				res.item = this;
			return res;
		}
	},

	_draw: function(ctx, param) {
		var clip = param.clip,
			clipItem = this._getClipItem();
		param = param.extend({ clipItem: !clip && clipItem, clip: false });
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
	_prioritize: ['type'],

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
				this._radius.set(Size.min(this._radius, size.divide(2).abs()));
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
			if (this._size) {
				this._size._set(size, size);
			} else {
				this._size = new Size(size, size);
			}
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
		var path = this._asPathItem();
		if (paper.settings.applyMatrix)
			path.setApplyMatrix(true);
		if (Base.pick(insert, paper.settings.insertItems))
			path.insertAbove(this);
		return path;
	},

	toShape: '#clone',

	_asPathItem: function() {
		var path = new Path[Base.capitalize(this._type)]({
			center: new Point(),
			size: this._size,
			radius: this._radius,
			insert: false
		});
		path.copyAttributes(this);
		return path;
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
			this._setStyles(ctx, param, viewMatrix, strokeMatrix);
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
		var size = this._size,
			rect = new Rectangle(size).setCenter(0, 0),
			style = this._style,
			strokeWidth = options.stroke && style.hasStroke()
					&& style.getStrokeWidth();
		if (matrix) {
			if (this._type === 'rectangle') {
				rect = matrix._transformBounds(rect);
			} else {
				var rx = size.width / 2,
					ry = size.height / 2,
					dx = Math.sqrt(Math.pow(matrix._a * rx, 2)
							+ Math.pow(matrix._c * ry, 2)),
					dy = Math.sqrt(Math.pow(matrix._b * rx, 2)
							+ Math.pow(matrix._d * ry, 2));
				rect = new Rectangle(matrix._tx - dx, matrix._ty - dy,
						2 * dx, 2 * dy);
			}
		}
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
				hitFill = options.fill && !!style.getFillColor();
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
		var item = Base.create(Shape.prototype);
		item._type = type;
		item._size = size;
		item._radius = radius;
		item._initialize(Base.getNamed(args), point);
		return item;
	}

	return {
		Circle: function() {
			var args = arguments,
				center = Point.readNamed(args, 'center'),
				radius = Base.readNamed(args, 'radius');
			return createShape('circle', center, new Size(radius * 2), radius,
					args);
		},

		Rectangle: function() {
			var args = arguments,
				rect = Rectangle.readNamed(args, 'rectangle'),
				radius = Size.min(Size.readNamed(args, 'radius'),
						rect.getSize(true).divide(2));
			return createShape('rectangle', rect.getCenter(true),
					rect.getSize(true), radius, args);
		},

		Ellipse: function() {
			var args = arguments,
				ellipse = Shape._readEllipse(args),
				radius = ellipse.radius;
			return createShape('ellipse', ellipse.center, radius.multiply(2),
					radius, args);
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
		size: new Size(),
		source: null
	},
	_prioritize: ['crossOrigin'],
	_smoothing: 'low',
	beans: true,

	initialize: function Raster(source, position) {
		if (!this._initialize(source,
				position !== undefined && Point.read([position]))) {
			var image,
				type = typeof source,
				object = type === 'string'
					? document.getElementById(source)
					: type  === 'object'
						? source
						: null;
			if (object && object !== Item.NO_INSERT) {
				if (object.getContext || object.naturalHeight != null) {
					image = object;
				} else if (object) {
					var size = Size.read(arguments);
					if (!size.isZero()) {
						image = CanvasProvider.getCanvas(size);
					}
				}
			}
			if (image) {
				this.setImage(image);
			} else {
				this.setSource(source);
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

	setSize: function(_size, _clear) {
		var size = Size.read(arguments);
		if (!size.equals(this._size)) {
			if (size.width > 0 && size.height > 0) {
				var element = !_clear && this.getElement();
				this._setImage(CanvasProvider.getCanvas(size));
				if (element) {
					this.getContext(true).drawImage(element, 0, 0,
							size.width, size.height);
				}
			} else {
				if (this._canvas)
					CanvasProvider.release(this._canvas);
				this._size = size.clone();
			}
		} else if (_clear) {
			this.clear();
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

	set: function set(props, exclude) {
		if (props && props.source && props.size) {
			this._size = new Size(props.size);
			exclude = Base.set({ size: true }, exclude);
		}
		return set.base.call(this, props, exclude);
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
		this._size = image && !this._loaded
				? this._size || new Size()
				: new Size(
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

	getContext: function(_change) {
		if (!this._context)
			this._context = this.getCanvas().getContext('2d');
		if (_change) {
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
		if (src)
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
		this._smoothing = typeof smoothing === 'string'
			? smoothing
			: smoothing ? 'low' : 'off';
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
		var args = arguments,
			point = Point.read(args),
			color = Color.read(args),
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

	clear: function() {
		var size = this._size;
		this.getContext(true).clearRect(0, 0, size.width + 1, size.height + 1);
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

	putImageData: function(data ) {
		var point = Point.read(arguments, 1);
		this.getContext(true).putImageData(data, point.x, point.y);
	},

	setImageData: function(data) {
		this.setSize(data);
		this.getContext(true).putImageData(data, 0, 0);
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
		if (param.dontFinish || param.clip) {
			var rect = this.getInternalBounds();
			if (!param.dontStart)
				ctx.beginPath();
			ctx.rect(rect.x, rect.y, rect.width, rect.height);
		} else if (element && element.width > 0 && element.height > 0) {
			ctx.globalAlpha = Numerical.clamp(this._opacity, 0, 1);

			this._setStyles(ctx, param, viewMatrix);

			var smoothing = this._smoothing,
				disabled = smoothing === 'off';
			DomElement.setPrefixed(
				ctx,
				disabled ? 'imageSmoothingEnabled' : 'imageSmoothingQuality',
				disabled ? false : smoothing
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
		var opts = options.extend({
			all: false, match: null, class: null, type: null
		});
		var res = this._definition._item._hitTest(point, opts, viewMatrix);
		if (res)
			res.item = this;
		return res;
	},

	_draw: function(ctx, param) {
		this._definition._item.draw(ctx, param.extend({ updateMatrix: false }));
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
			return new Base({
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
		var minPad = min[coord] + padding,
			maxPad = max[coord] - padding;
		if (    v0 < minPad || v1 < minPad || v2 < minPad || v3 < minPad ||
				v0 > maxPad || v1 > maxPad || v2 > maxPad || v3 > maxPad) {
			if (v1 < v0 != v1 < v3 && v2 < v0 != v2 < v3) {
				add(v0, 0);
				add(v3, 0);
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
	['getBounds', 'getStrokeBounds'],
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

	getHandleBounds: function() {
		var v = this.getValues(),
			x1 = Math.min(v[0], v[2], v[4], v[6]),
			y1 = Math.min(v[1], v[3], v[5], v[7]),
			x2 = Math.max(v[0], v[2], v[4], v[6]),
			y2 = Math.max(v[1], v[3], v[5], v[7]);
		return new Rectangle(x1, y1, x2 - x1, y2 - y1);
	},

}), Base.each({
	isStraight: function(x1, y1, h1x, h1y, h2x, h2y, x2, y2) {
		var isZero = Numerical.isZero;
		if (isZero(h1x) && isZero(h1y) && isZero(h2x) && isZero(h2y)) {
			return true;
		} else {
			var isCollinear = Point.isCollinear,
				vx = x2 - x1,
				vy = y2 - y1;
			if (isZero(vx) && isZero(vy)) {
				return false;
			} else if (isCollinear(vx, vy, h1x, h1y) &&
					isCollinear(vx, vy, h2x, h2y)) {
				var getDistance = Line.getDistance,
					epsilon = 1e-7;
				if (getDistance(x1, y1, vx, vy, x1 + h1x, y1 + h1y, true)
						< epsilon &&
					getDistance(x1, y1, vx, vy, x2 + h2x, y2 + h2y, true)
						< epsilon) {
					var div = vx * vx + vy * vy,
						s1 = (vx * h1x + vy * h1y) / div,
						s2 = (vx * h2x + vy * h2y) / div;
					return s1 >= 0 && s1 <= 1 && s2 <= 0 && s2 >= -1;
				}
			}
		}
		return false;
	},

	isLinear: function(x1, y1, h1x, h1y, h2x, h2y, x2, y2) {
		var x = (x2 - x1) / 3,
			y = (y2 - y1) / 3;
		return h1x === x && h1y === y && -h2x === x && -h2y === y;
	}
}, function(test, name) {
	this[name] = function(epsilon) {
		var p1 = this._segment1._point,
			h1 = this._segment1._handleOut,
			h2 = this._segment2._handleIn,
			p2 = this._segment2._point;
		return test(p1._x, p1._y, h1._x, h1._y, h2._x, h2._y, p2._x, p2._y,
				epsilon);
	};

	this.statics[name] = function(v, epsilon) {
		var x1 = v[0], y1 = v[1],
			x2 = v[6], y2 = v[7];
		return test(x1, y1, v[2] - x1, v[3] - y1, v[4] - x2, v[5] - y2, x2, y2,
				epsilon);
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

	function getCoefficients(v) {
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
			ay = y3 - y0 - cy - by;
		return [ax, bx, cx, ay, by, cy, x1, y1, x2, y2];
	}

	function getCoordinate(v0, v3, a, b, c, t) {
		return t === 0 ? v0 : t === 1 ? v3 : ((a * t + b) * t + c) * t + v0;
	}

	function evaluate(v, t, type, normalized) {
		if (t == null || t < 0 || t > 1)
			return null;
		var x0 = v[0], y0 = v[1],
			x3 = v[6], y3 = v[7],
			c = getCoefficients(v),
			ax = c[0], bx = c[1], cx = c[2],
			ay = c[3], by = c[4], cy = c[5],
			x1 = c[6], y1 = c[7],
			x2 = c[8], y2 = c[9],
			x, y;
		if (type === 0) {
			x = getCoordinate(x0, x3, ax, bx, cx, t);
			y = getCoordinate(y0, y3, ay, by, cy, t);
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
				magnitude = Math.max(
					Math.abs(x0), Math.abs(y0), Math.abs(x1), Math.abs(y1),
					Math.abs(x2), Math.abs(y2), Math.abs(x3), Math.abs(y3)),
				s = l > magnitude * Numerical.getEpsilon(magnitude) ? 1 / l : 0,
				isZero = Numerical.isZero,
				serpentine = 'serpentine';
			d1 *= s;
			d2 *= s;
			d3 *= s;

			function type(type, t1, t2) {
				var tMin = 1e-8,
					tMax = 1 - tMin,
					hasRoots = t1 !== undefined,
					t1Ok = hasRoots && t1 > tMin && t1 < tMax,
					t2Ok = hasRoots && t2 > tMin && t2 < tMax;
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

		getTimeOf: function(v, point, tolerance) {
			var abs = Math.abs,
				x0 = v[0], y0 = v[1],
				x3 = v[6], y3 = v[7],
				px = point.x,
				py = point.y,
				epsilon = tolerance || Math.max(
					1e-7,
					Numerical.getEpsilon(Math.max(
						abs(x0), abs(y0), abs(v[2]), abs(v[3]),
						abs(v[4]), abs(v[5]), abs(x3), abs(y3))));

			function isClose(x, y) {
				var dx = x - px,
					dy = y - py;
				return Math.sqrt(dx * dx + dy * dy) <= epsilon;
			}

			if (isClose(x0, y0))
				return 0;
			if (isClose(x3, y3))
				return 1;
			var c = getCoefficients(v),
				ax = c[0], bx = c[1], cx = c[2],
				ay = c[3], by = c[4], cy = c[5],
				roots = [];
			for (var i = 0; i < 2; i++) {
				var count = Curve.solveCubic(v, i, i ? py : px, roots, 0, 1);
				for (var j = 0; j < count; j++) {
					var t = roots[j];
					if (isClose(getCoordinate(x0, x3, ax, bx, cx, t),
							getCoordinate(y0, y3, ay, by, cy, t)))
						return t;
				}
			}
			return null;
		},

		getNearestTime: function(v, point) {
			var x0 = v[0], y0 = v[1],
				x3 = v[6], y3 = v[7],
				px = point.x,
				py = point.y;
			if (Curve.isStraight(v)) {
				var vx = x3 - x0, vy = y3 - y0,
					det = vx * vx + vy * vy;
				if (det === 0)
					return 0;
				var u = ((px - x0) * vx + (py - y0) * vy) / det;
				return u < 1e-12 ? 0
					 : u > 0.999999999999 ? 1
					 : Curve.getTimeOf(v,
						new Point(x0 + u * vx, y0 + u * vy));
			}

			var c = getCoefficients(v),
				ax = c[0], bx = c[1], cx = c[2],
				ay = c[3], by = c[4], cy = c[5],
				count = 100,
				minDist = Infinity,
				minT = 0;

			function refine(t) {
				if (t >= 0 && t <= 1) {
					var dx = getCoordinate(x0, x3, ax, bx, cx, t) - px,
						dy = getCoordinate(y0, y3, ay, by, cy, t) - py,
						dist = dx * dx + dy * dy;
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
			recursion, calls, tMin, tMax, uMin, uMax, tolerance) {
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
			var uDiff = uMax - uMin;
			if (tMaxClip - tMinClip > 0.8) {
				var isNext = tolerance && tMaxNew === 1 && uMin === 0
						&& c1.getNext() === c2,
					isPrevious = tolerance && !isNext && tMinNew === 0
						&& uMax === 1 && c1.getPrevious() === c2;
				if (isNext || isPrevious) {
					var offset = isNext ? tolerance : -tolerance,
						s1 = Curve.getTimeAt(v1, -offset),
						s2 = Curve.getTimeAt(v2, offset);
					if (s1 !== null && s2 !== null) {
						var t = tMinNew + (tMaxNew - tMinNew) * s1,
							u = uMin + (uMax - uMin) * s2;
						if (isNext) {
							v1 = Curve.getPart(v1, 0, s1);
							v2 = Curve.getPart(v2, s2, 1);
							tMaxNew = t;
							uMin = u;
						} else {
							v1 = Curve.getPart(v1, s1, 1);
							v2 = Curve.getPart(v2, 0, s2);
							tMinNew = t;
							uMax = u;
						}
						calls = addCurveIntersections(
								v1, v2, c1, c2, locations, include, flip,
								recursion, calls, tMinNew, tMaxNew, uMin, uMax,
								tolerance);
					}
				} else if (!(tolerance && addImplicitIntersections(
						v1, v2, c1, c2, locations, include, flip,
						tMinNew, tMaxNew, uMin, uMax, tolerance))) {
					if (tMaxNew - tMinNew > uDiff) {
						var parts = Curve.subdivide(v1, 0.5),
							t = (tMinNew + tMaxNew) / 2;
						calls = addCurveIntersections(
								v2, parts[0], c2, c1, locations, include, !flip,
								recursion, calls, uMin, uMax, tMinNew, t,
								tolerance);
						calls = addCurveIntersections(
								v2, parts[1], c2, c1, locations, include, !flip,
								recursion, calls, uMin, uMax, t, tMaxNew,
								tolerance);
					} else {
						var parts = Curve.subdivide(v2, 0.5),
							u = (uMin + uMax) / 2;
						calls = addCurveIntersections(
								parts[0], v1, c2, c1, locations, include, !flip,
								recursion, calls, uMin, u, tMinNew, tMaxNew,
								tolerance);
						calls = addCurveIntersections(
								parts[1], v1, c2, c1, locations, include, !flip,
								recursion, calls, u, uMax, tMinNew, tMaxNew,
								tolerance);
					}
				}
			} else {
				if (uDiff === 0 || uDiff >= fatLineEpsilon) {
					calls = addCurveIntersections(
							v2, v1, c2, c1, locations, include, !flip,
							recursion, calls, uMin, uMax, tMinNew, tMaxNew,
							tolerance);
				} else {
					calls = addCurveIntersections(
							v1, v2, c1, c2, locations, include, flip,
							recursion, calls, tMinNew, tMaxNew, uMin, uMax,
							tolerance);
				}
			}
		}
		return calls;
	}

	function addImplicitIntersections(v1, v2, c1, c2, locations, include,
			flip, tMin, tMax, uMin, uMax, tolerance) {
		var x0 = v2[0],
			y0 = v2[1],
			size = 0;
		for (var i = 0; i < 8; i += 2) {
			size = Math.max(size, Math.abs(v1[i] - x0), Math.abs(v1[i + 1] - y0),
					Math.abs(v2[i] - x0), Math.abs(v2[i + 1] - y0));
		}
		if (size) {
			var p = getLocalPoints(v1, x0, y0, size),
				q = getLocalPoints(v2, x0, y0, size),
				dx = v2[6] - 3 * (v2[4] - v2[2]) - x0,
				dy = v2[7] - 3 * (v2[5] - v2[3]) - y0,
				isQuadratic = 4 / 27 * Math.sqrt(dx * dx + dy * dy)
					<= tolerance,
				polynomial = isQuadratic
					? getQuadraticImplicit(p, [q[0], getQuadraticHandle(q), q[3]])
					: getCubicImplicit(p, q),
				roots = [],
				speed = 0;
			for (var i = 0; i < 6; i += 2) {
				speed = Math.max(speed,
						3 * Math.sqrt(Math.pow(v1[i + 2] - v1[i], 2)
							+ Math.pow(v1[i + 3] - v1[i + 1], 2)));
			}
			if (polynomial.coefficients.every(function(coefficient, i) {
				return Math.abs(coefficient) <= polynomial.errors[i];
			}))
				return false;
			var count = Numerical.solveBernstein(polynomial.coefficients,
					polynomial.errors, roots, speed ? tolerance / speed : 1);
			for (var i = 0; i < count; i++) {
				var t = roots[i],
					u = Curve.getTimeOf(v2, Curve.getPoint(v1, t), tolerance);
				if (u !== null) {
					t = tMin + (tMax - tMin) * t;
					u = uMin + (uMax - uMin) * u;
					addLocation(locations, include,
							flip ? c2 : c1, flip ? u : t,
							flip ? c1 : c2, flip ? t : u);
				}
			}
			return true;
		}
		return false;
	}

	function getLocalPoints(v, x0, y0, size) {
		var u = 1.12e-16,
			points = [];
		for (var i = 0; i < 8; i += 2) {
			var x = (v[i] - x0) / size,
				y = (v[i + 1] - y0) / size;
			points.push({ x: x, y: y, ex: 2 * u * Math.abs(x),
					ey: 2 * u * Math.abs(y) });
		}
		return points;
	}

	function getProductError(a, ea, b, eb) {
		return Math.abs(a) * eb + Math.abs(b) * ea + ea * eb
				+ 1.12e-16 * Math.abs(a * b);
	}

	function getLinearFactor(p, q, i, j, factor) {
		var u = 1.12e-16,
			coefficients = [],
			errors = [];
		for (var k = 0; k < 4; k++) {
			var r = p[k],
				dx1 = q[i].x - r.x,
				dy1 = q[j].y - r.y,
				dx2 = q[j].x - r.x,
				dy2 = q[i].y - r.y,
				error1 = getProductError(dx1,
					q[i].ex + r.ex + u * Math.abs(dx1),
					dy1, q[j].ey + r.ey + u * Math.abs(dy1)),
				error2 = getProductError(dx2,
					q[j].ex + r.ex + u * Math.abs(dx2),
					dy2, q[i].ey + r.ey + u * Math.abs(dy2)),
				difference = dx1 * dy1 - dx2 * dy2,
				value = factor * difference;
			coefficients.push(value);
			errors.push(factor * (error1 + error2 + u * Math.abs(difference))
					+ u * Math.abs(value));
		}
		return { coefficients: coefficients, errors: errors };
	}

	var binomials = [[1]];
	for (var i = 1; i <= 9; i++) {
		var row = [1];
		for (var j = 1; j < i; j++)
			row.push(binomials[i - 1][j - 1] + binomials[i - 1][j]);
		row.push(1);
		binomials.push(row);
	}

	function multiply(a, b) {
		var u = 1.12e-16,
			m = a.coefficients.length - 1,
			n = b.coefficients.length - 1,
			coefficients = [],
			errors = [];
		for (var k = 0; k <= m + n; k++) {
			var sum = 0,
				error = 0;
			for (var i = Math.max(0, k - n), l = Math.min(m, k); i <= l; i++) {
				var factor = binomials[m][i] * binomials[n][k - i]
						/ binomials[m + n][k],
					a1 = a.coefficients[i],
					b1 = b.coefficients[k - i],
					term = factor * (a1 * b1);
				sum += term;
				error += factor * getProductError(a1, a.errors[i],
							b1, b.errors[k - i])
						+ u * (2 * Math.abs(term) + Math.abs(sum));
			}
			coefficients.push(sum);
			errors.push(error);
		}
		return { coefficients: coefficients, errors: errors };
	}

	function add(a, b, sign) {
		var coefficients = [],
			errors = [];
		for (var i = 0, l = a.coefficients.length; i < l; i++) {
			var sum = a.coefficients[i] + sign * b.coefficients[i];
			coefficients.push(sum);
			errors.push(a.errors[i] + b.errors[i]
					+ 1.12e-16 * Math.abs(sum));
		}
		return { coefficients: coefficients, errors: errors };
	}

	function getCubicImplicit(p, q) {
		var l32 = getLinearFactor(p, q, 3, 2, 1 * 3),
			l31 = getLinearFactor(p, q, 3, 1, 1 * 3),
			l30 = getLinearFactor(p, q, 3, 0, 1 * 1),
			l21 = getLinearFactor(p, q, 2, 1, 3 * 3),
			l20 = getLinearFactor(p, q, 2, 0, 3 * 1),
			l10 = getLinearFactor(p, q, 1, 0, 3 * 1),
			m = add(l30, l21, 1);
		return add(add(
				multiply(l32, add(multiply(m, l10), multiply(l20, l20), -1)),
				multiply(l31, add(multiply(l31, l10), multiply(l20, l30), -1)),
				-1),
				multiply(l30, add(multiply(l31, l20), multiply(m, l30), -1)),
				1);
	}

	function getQuadraticHandle(q) {
		var u = 1.12e-16,
			x = (3 * q[1].x - q[0].x) / 2,
			y = (3 * q[1].y - q[0].y) / 2;
		return { x: x, y: y,
				ex: (3 * q[1].ex + q[0].ex) / 2 + 2 * u * Math.abs(x),
				ey: (3 * q[1].ey + q[0].ey) / 2 + 2 * u * Math.abs(y) };
	}

	function getQuadraticImplicit(p, q) {
		var l21 = getLinearFactor(p, q, 2, 1, 1 * 2),
			l20 = getLinearFactor(p, q, 2, 0, 1 * 1),
			l10 = getLinearFactor(p, q, 1, 0, 2 * 1);
		return add(multiply(l21, l10), multiply(l20, l20), -1);
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
		var epsilon = 1e-7;
		if (Math.abs(rv[1]) < epsilon)
			roots.push(0);
		if (Math.abs(rv[7]) < epsilon)
			roots.push(1);
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

	function getCurveIntersections(v1, v2, c1, c2, locations, include,
			tolerance) {
		var min = Math.min,
			max = Math.max,
			abs = Math.abs,
			minX1 = min(v1[0], v1[2], v1[4], v1[6]),
			maxX1 = max(v1[0], v1[2], v1[4], v1[6]),
			minY1 = min(v1[1], v1[3], v1[5], v1[7]),
			maxY1 = max(v1[1], v1[3], v1[5], v1[7]),
			minX2 = min(v2[0], v2[2], v2[4], v2[6]),
			maxX2 = max(v2[0], v2[2], v2[4], v2[6]),
			minY2 = min(v2[1], v2[3], v2[5], v2[7]),
			maxY2 = max(v2[1], v2[3], v2[5], v2[7]),
			epsilon = Numerical.getEpsilon(max(
					abs(minX1), abs(maxX1), abs(minY1), abs(maxY1),
					abs(minX2), abs(maxX2), abs(minY2), abs(maxY2)));

		var boundsEpsilon = max(epsilon,
				tolerance || 1e-7);
		if (maxX1 + boundsEpsilon > minX2 && minX1 - boundsEpsilon < maxX2 &&
			maxY1 + boundsEpsilon > minY2 && minY1 - boundsEpsilon < maxY2) {
			var overlaps = getOverlaps(v1, v2, tolerance);
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
							0, 0, 0, 1, 0, 1, tolerance);
				if (!straight || locations.length === before) {
					var endEpsilon = tolerance || epsilon;
					for (var i = 0; i < 4; i++) {
						var isSecond = i >> 1,
							t = i & 1,
							v = isSecond ? v2 : v1,
							x = v[t * 6],
							y = v[t * 6 + 1];
						if (isSecond
								? x >= minX1 - endEpsilon
									&& x <= maxX1 + endEpsilon
									&& y >= minY1 - endEpsilon
									&& y <= maxY1 + endEpsilon
								: x >= minX2 - endEpsilon
									&& x <= maxX2 + endEpsilon
									&& y >= minY2 - endEpsilon
									&& y <= maxY2 + endEpsilon) {
							var u = Curve.getTimeOf(isSecond ? v1 : v2,
									new Point(x, y), endEpsilon);
							if (u !== null) {
								addLocation(locations, include,
										c1, isSecond ? u : t,
										c2, isSecond ? t : u);
							}
						}
					}
				}
			}
		}
		return locations;
	}

	function getSelfIntersection(v1, c1, locations, include) {
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
			_returnFirst, _tolerance, _collisions) {
		var self = !curves2;
		if (self)
			curves2 = curves1;
		var length1 = curves1.length,
			length2 = curves2.length,
			values1 = new Array(length1),
			values2 = self ? values1 : new Array(length2),
			locations = [];

		for (var i = 0; i < length1; i++) {
			values1[i] = curves1[i].getValues(matrix1);
		}
		if (!self) {
			for (var i = 0; i < length2; i++) {
				values2[i] = curves2[i].getValues(matrix2);
			}
		}
		var boundsCollisions = _collisions
				|| CollisionDetection.findCurveBoundsCollisions(
					values1, values2,
					_tolerance || 1e-7);
		for (var index1 = 0; index1 < length1; index1++) {
			var curve1 = curves1[index1],
				v1 = values1[index1];
			if (self) {
				getSelfIntersection(v1, curve1, locations, include);
			}
			var collisions1 = boundsCollisions[index1];
			if (collisions1) {
				for (var j = 0; j < collisions1.length; j++) {
					if (_returnFirst && locations.length)
						return locations;
					var index2 = collisions1[j];
					if (!self || index2 > index1) {
						var curve2 = curves2[index2],
							v2 = values2[index2];
						getCurveIntersections(v1, v2, curve1, curve2,
								locations, include, _tolerance);
					}
				}
			}
		}
		return locations;
	}

	function getOverlaps(v1, v2, tolerance) {

		function getSquaredLineLength(v) {
			var x = v[6] - v[0],
				y = v[7] - v[1];
			return x * x + y * y;
		}

		var abs = Math.abs,
			getDistance = Line.getDistance,
			timeEpsilon = 1e-8,
			geomEpsilon = tolerance || 1e-7,
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
					v[i2][t1 ? 7 : 1]), geomEpsilon);
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
			var num = cx * ty - cy * tx,
				den = bx * ty - by * tx;
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
					  : getSelfIntersection(v1, this, []);
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

	_setPath: function(path) {
		this._path = path;
		this._version = path ? path._version : 0;
	},

	_setCurve: function(curve) {
		this._setPath(curve._path);
		this._curve = curve;
		this._segment = null;
		this._segment1 = curve._segment1;
		this._segment2 = curve._segment2;
	},

	_setSegment: function(segment) {
		var curve = segment.getCurve();
		if (curve) {
			this._setCurve(curve);
		} else {
			this._setPath(segment._path);
			this._segment1 = segment;
			this._segment2 = null;
		}
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
			c1 = c2 && t1 < tMin ? c2.getPrevious() : c2,
			c4 = inter.getCurve(),
			c3 = c4 && t2 < tMin ? c4.getPrevious() : c4;
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
				offset = Curve.getLength(v,
					end && count ? roots[count - 1] : 0,
					!end && count ? roots[0] : 1);
			offsets.push(count ? offset : offset / 32);
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

	_scaleStroke: function(matrix) {
		var style = this._style;
		if (this._project._scope.settings.scaleStrokes
				&& style.getStrokeScaling()) {
			style.setStrokeWidth(style.getStrokeWidth()
					* matrix._getMeanScale());
		}
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
			start = new Point(),
			number = '([+-]?(?:\\d*\\.\\d+|\\d+\\.?)(?:[eE][+-]?\\d+)?)',
			numbers = new RegExp(number, 'g'),
			flag = '([01])',
			arcs = new RegExp([number, number, number, flag, flag, number,
					number].join('[\\s,]*'), 'g');

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
			coords = part.match(numbers);
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
				while (coords = arcs.exec(part)) {
					this.arcTo(current = getPoint(6),
							new Size(+coords[1], +coords[2]),
							+coords[3], +coords[5], +coords[4]);
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
		var bounds1 = !self && this.getBounds(matrix1),
			bounds2 = !self && path.getBounds(matrix2),
			abs = Math.abs;
		return self || bounds1.intersects(bounds2, Numerical.getEpsilon(
				Math.max(abs(bounds1.left), abs(bounds1.right),
					abs(bounds1.top), abs(bounds1.bottom),
					abs(bounds2.left), abs(bounds2.right),
					abs(bounds2.top), abs(bounds2.bottom))))
				? Curve.getIntersections(
						this.getCurves(), !self && path.getCurves(), include,
						matrix1, matrix2, _returnFirst)
				: [];
	},

	getCrossings: function(path) {
		return this.getIntersections(path, function(inter) {
			return inter.isCrossing();
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
			var boundsOverlaps = CollisionDetection.findItemBoundsCollisions(paths1, paths2, Numerical.GEOMETRIC_EPSILON);
			for (var i1 = length1 - 1; i1 >= 0 && ok; i1--) {
				var path1 = paths1[i1];
				ok = false;
				var pathBoundsOverlaps = boundsOverlaps[i1];
				if (pathBoundsOverlaps) {
					for (var i2 = pathBoundsOverlaps.length - 1; i2 >= 0 && !ok; i2--) {
						if (path1.compare(paths2[pathBoundsOverlaps[i2]])) {
							if (!matched[pathBoundsOverlaps[i2]]) {
								matched[pathBoundsOverlaps[i2]] = true;
								count++;
							}
							ok = true;
						}
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
		var args = arguments,
			segments = Array.isArray(arg)
			? typeof arg[0] === 'object'
				? arg
				: args
			: arg && (arg.size === undefined && (arg.x !== undefined
					|| arg.point !== undefined))
				? args
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
		this._scaleStroke(matrix);
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
		var args = arguments;
		return args.length > 1 && typeof segment1 !== 'number'
			? this._add(Segment.readList(args))
			: this._add([ Segment.read(args) ])[0];
	},

	insert: function(index, segment1 ) {
		var args = arguments;
		return args.length > 2 && typeof segment1 !== 'number'
			? this._add(Segment.readList(args, 1), index)
			: this._add([ Segment.read(args, 1) ], index)[0];
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
		if (start > end && this._closed)
			return this.removeSegments(start).concat(
					this.removeSegments(0, end));
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
		if (loc && index < curves.length) {
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
			if (Base.pick(insert, paper.settings.insertItems))
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
			hits = options.all && [],
			hitStroke = options.stroke && style.hasStroke(),
			hitFill = options.fill && !!style.getFillColor(),
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
					var hit = new HitResult(name, that, {
						segment: seg,
						point: pt
					});
					if (!hits)
						return hit;
					hits.push(hit);
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
				} else {
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
		res = !loc && hitFill && this._contains(point)
				|| loc && !hitStroke && !hitCurves
					? new HitResult('fill', this)
					: loc
						? new HitResult(hitStroke ? 'stroke' : 'curve', this, {
							location: loc,
							point: loc.getPoint()
						})
						: null;
		if (hits) {
			hits.sort(function(hit1, hit2) {
				return hit1.point.getDistance(point)
						- hit2.point.getDistance(point);
			});
			if (res)
				hits.push(res);
			return hits;
		}
		return res;
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

	function drawHandles(ctx, segments, matrix, handleSize, segmentSize) {
		var handleHalf = handleSize / 2,
			half = segmentSize / 2,
			miniSize = segmentSize - 2,
			miniHalf = half - 1,
			coords = new Array(6),
			pX, pY;

		function drawHandle(index) {
			var hX = coords[index],
				hY = coords[index + 1];
			if (handleSize > 0 && (pX != hX || pY != hY)) {
				ctx.beginPath();
				ctx.moveTo(pX, pY);
				ctx.lineTo(hX, hY);
				ctx.stroke();
				ctx.beginPath();
				ctx.arc(hX, hY, handleHalf, 0, Math.PI * 2, true);
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
			if (segmentSize <= 0)
				continue;
			ctx.fillRect(pX - half, pY - half, segmentSize, segmentSize);
			if (miniSize > 0 && !(selection & 1)) {
				var fillStyle = ctx.fillStyle;
				ctx.fillStyle = '#ffffff';
				ctx.fillRect(pX - miniHalf, pY - miniHalf, miniSize, miniSize);
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
				this._setStyles(ctx, param, viewMatrix, strokeMatrix);
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
			var settings = paper.settings;
			drawHandles(ctx, this._segments, matrix, settings.handleSize,
					Base.pick(settings.segmentSize, settings.handleSize));
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
			var args = arguments,
				handle1 = Point.read(args),
				handle2 = Point.read(args),
				to = Point.read(args),
				current = getCurrentSegment(this);
			current.setHandleOut(handle1.subtract(current._point));
			this._add([ new Segment(to, handle2.subtract(to)) ]);
		},

		quadraticCurveTo: function() {
			var args = arguments,
				handle = Point.read(args),
				to = Point.read(args),
				current = getCurrentSegment(this)._point;
			this.cubicCurveTo(
				handle.add(current.subtract(handle).multiply(1 / 3)),
				handle.add(to.subtract(handle).multiply(1 / 3)),
				to
			);
		},

		curveTo: function() {
			var args = arguments,
				through = Point.read(args),
				to = Point.read(args),
				t = Base.pick(Base.read(args), 0.5),
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
			var args = arguments,
				abs = Math.abs,
				sqrt = Math.sqrt,
				current = getCurrentSegment(this),
				from = current._point,
				to = Point.read(args),
				through,
				peek = Base.peek(args),
				clockwise = Base.pick(peek, true),
				center, extent, vector, matrix;
			if (typeof clockwise === 'boolean') {
				var middle = from.add(to).divide(2),
				through = middle.add(middle.subtract(from).rotate(
						clockwise ? -90 : 90));
			} else if (Base.remain(args) <= 2) {
				through = to;
				to = Point.read(args);
			} else if (!from.equals(to)) {
				var radius = Size.read(args),
					isZero = Numerical.isZero;
				if (isZero(radius.width) || isZero(radius.height))
					return this.lineTo(to);
				var rotation = Base.read(args),
					clockwise = !!Base.read(args),
					large = !!Base.read(args),
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
			if (extent) {
				var epsilon = 1e-5,
					ext = abs(extent),
					count = ext >= 360
						? 4
						: Math.ceil((ext - epsilon) / 90),
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
			}
		},

		lineBy: function() {
			var to = Point.read(arguments),
				current = getCurrentSegment(this)._point;
			this.lineTo(current.add(to));
		},

		curveBy: function() {
			var args = arguments,
				through = Point.read(args),
				to = Point.read(args),
				parameter = Base.read(args),
				current = getCurrentSegment(this)._point;
			this.curveTo(current.add(through), current.add(to), parameter);
		},

		cubicCurveBy: function() {
			var args = arguments,
				handle1 = Point.read(args),
				handle2 = Point.read(args),
				to = Point.read(args),
				current = getCurrentSegment(this)._point;
			this.cubicCurveTo(current.add(handle1), current.add(handle2),
					current.add(to));
		},

		quadraticCurveBy: function() {
			var args = arguments,
				handle = Point.read(args),
				to = Point.read(args),
				current = getCurrentSegment(this)._point;
			this.quadraticCurveTo(current.add(handle), current.add(to));
		},

		arcBy: function() {
			var args = arguments,
				current = getCurrentSegment(this)._point,
				point = current.add(Point.read(args)),
				clockwise = Base.pick(Base.peek(args), true);
			if (typeof clockwise === 'boolean') {
				this.arcTo(point, clockwise);
			} else {
				this.arcTo(point, current.add(Point.read(args)));
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
		if (length > 0) {
			for (var i = 1; i < length; i++) {
				addJoin(segments[i], join);
			}
			if (closed) {
				addJoin(segments[0], join);
			} else {
				addCap(segments[0], cap);
				addCap(segments[segments.length - 1], cap);
			}
		}
		return bounds;
	},

	_getStrokePadding: function(radius, matrix) {
		if (!matrix)
			return [radius, radius];
		var a = matrix._a,
			b = matrix._b,
			c = matrix._c,
			d = matrix._d;
		return [radius * Math.sqrt(a * a + c * c),
				radius * Math.sqrt(b * b + d * d)];
	},

	_addBevelJoin: function(segment, join, radius, miterLimit, matrix,
			strokeMatrix, addPoint, isArea) {
		var curve2 = segment.getCurve(),
			curve1 = curve2.getPrevious(),
			point = curve2.getPoint1().transform(matrix),
			normal1 = curve1.getNormalAtTime(1).multiply(radius),
			normal2 = curve2.getNormalAtTime(0).multiply(radius),
			angle = normal1.getDirectedAngle(normal2);
		if (angle < 0 || angle >= 180) {
			normal1 = normal1.negate();
			normal2 = normal2.negate();
		}
		if (isArea)
			addPoint(point);
		addPoint(point.add(normal1.transform(strokeMatrix)));
		if (join === 'miter') {
			var corner = new Line(normal1,
					new Point(-normal1.y, normal1.x), true
				).intersect(new Line(normal2,
					new Point(-normal2.y, normal2.x), true
				), true);
			if (corner && corner.getLength() <= miterLimit * radius) {
				addPoint(point.add(corner.transform(strokeMatrix)));
			}
		}
		addPoint(point.add(normal2.transform(strokeMatrix)));
	},

	_addSquareCap: function(segment, cap, radius, matrix, strokeMatrix,
			addPoint, isArea) {
		var point = segment._point.transform(matrix),
			loc = segment.getLocation(),
			vector = loc.getNormal()
					.multiply(loc.getTime() === 0 ? radius : -radius),
			normal = vector.transform(strokeMatrix);
		if (cap === 'square') {
			if (isArea) {
				addPoint(point.subtract(normal));
				addPoint(point.add(normal));
			}
			point = point.add(vector.rotate(-90).transform(strokeMatrix));
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
			path = new Path(props && {
				insert: props.insert,
				project: props.project,
				parent: props.parent
			});
		path._add(segments);
		path._closed = closed;
		return path.set(props, { insert: true, project: true, parent: true });
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
			var args = arguments;
			return createPath([
				new Segment(Point.readNamed(args, 'from')),
				new Segment(Point.readNamed(args, 'to'))
			], false, args);
		},

		Circle: function() {
			var args = arguments,
				center = Point.readNamed(args, 'center'),
				radius = Base.readNamed(args, 'radius');
			return createEllipse(center, new Size(radius), args);
		},

		Rectangle: function() {
			var args = arguments,
				rect = Rectangle.readNamed(args, 'rectangle'),
				radius = Size.readNamed(args, 'radius', 0,
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
			return createPath(segments, true, args);
		},

		RoundRectangle: '#Rectangle',

		Ellipse: function() {
			var args = arguments,
				ellipse = Shape._readEllipse(args);
			return createEllipse(ellipse.center, ellipse.radius, args);
		},

		Oval: '#Ellipse',

		Arc: function() {
			var args = arguments,
				from = Point.readNamed(args, 'from'),
				through = Point.readNamed(args, 'through'),
				to = Point.readNamed(args, 'to'),
				arc = new Path(Item.NO_INSERT);
			arc.moveTo(from);
			arc.arcTo(through, to);
			return createPath(arc._segments, false, args);
		},

		RegularPolygon: function() {
			var args = arguments,
				center = Point.readNamed(args, 'center'),
				sides = Base.readNamed(args, 'sides'),
				radius = Base.readNamed(args, 'radius'),
				step = -360 / sides,
				offset = sides % 2 ? 0 : -0.5,
				vector = new Point(0, -radius),
				segments = new Array(sides);
			for (var i = 0; i < sides; i++)
				segments[i] = new Segment(center.add(
					vector.rotate((i + offset) * step)));
			return createPath(segments, true, args);
		},

		Star: function() {
			var args = arguments,
				center = Point.readNamed(args, 'center'),
				points = Base.readNamed(args, 'points') * 2,
				radius1 = Base.readNamed(args, 'radius1'),
				radius2 = Base.readNamed(args, 'radius2'),
				step = 360 / points,
				vector = new Point(0, -1),
				segments = new Array(points);
			for (var i = 0; i < points; i++)
				segments[i] = new Segment(center.add(vector.rotate(step * i)
						.multiply(i % 2 ? radius2 : radius1)));
			return createPath(segments, true, args);
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

	_transformContent: function _transformContent(matrix) {
		this._scaleStroke(matrix);
		return _transformContent.base.apply(this, arguments);
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
			this._setStyles(ctx, param, viewMatrix, strokeMatrix);
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
			unite: function(inside1, inside2) {
				return inside1 || inside2;
			},
			intersect: function(inside1, inside2) {
				return inside1 && inside2;
			},
			subtract: function(inside1, inside2) {
				return inside1 && !inside2;
			},
			exclude: function(inside1, inside2) {
				return inside1 !== inside2;
			}
		};

	function getPaths(path) {
		return path._children || [path];
	}

	function preparePath(path, close) {
		var res = path
			.clone(false)
			.reduce({ simplify: true })
			.transform(null, true, true);
		return close ? closePaths(res) : res;
	}

	function closePaths(item) {
		var paths = getPaths(item);
		for (var i = 0, l = paths.length; i < l; i++) {
			var path = paths[i];
			if (!path._closed && !path.isEmpty()) {
				var count = path._segments.length;
				path.closePath(1e-12);
				if (path._segments.length === count) {
					path.getFirstSegment().setHandleIn(0, 0);
					path.getLastSegment().setHandleOut(0, 0);
				}
			}
		}
		return item;
	}

	function createResult(paths, simplify, path1, path2, options) {
		var result = new CompoundPath(Item.NO_INSERT);
		result.addChildren(paths, true);
		result = result.reduce({ simplify: simplify });
		if (Base.pick(options && options.insert, paper.settings.insertItems)) {
			var above = path1,
				others = [].concat(path2 || []);
			for (var i = 0, l = others.length; i < l; i++) {
				var other = others[i];
				if (path1.isSibling(other)
						&& other.getIndex() > above.getIndex())
					above = other;
			}
			result.insertAbove(above);
		}
		result.copyAttributes(path1, true);
		return result;
	}

	function filterIntersection(inter) {
		return inter.hasOverlap() || inter.isCrossing();
	}

	function traceBoolean(path1, path2, operation, options) {
		if (options && (options.trace == false || options.stroke) &&
				/^(subtract|intersect)$/.test(operation))
			return splitBoolean(path1, path2, operation, options);
		var paths;
		if (operation === 'exclude' && Array.isArray(path2)
				&& path2.length > 1) {
			var items = [path1].concat(path2),
				compound = new CompoundPath(Item.NO_INSERT);
			compound.setFillRule('evenodd');
			for (var i = 0, l = items.length; i < l; i++) {
				compound.addChildren(tracePaths([preparePath(items[i], true)],
						operators.unite));
			}
			paths = tracePaths([compound], operators.unite);
		} else {
			paths = tracePaths(getOperands(path1,
					combinePaths(path2, operation)), operators[operation]);
		}
		return createResult(paths, true, path1, path2, options);
	}

	function combinePaths(paths, operation) {
		var isUnite = operation === 'unite' || operation === 'subtract';

		function combine(entries) {
			if (entries.length > 1) {
				if (isUnite) {
					var bounds = entries[0].bounds;
					for (var i = 1, l = entries.length; i < l; i++)
						bounds = bounds.unite(entries[i].bounds);
					var key = bounds.width > bounds.height ? 'x' : 'y';
					entries.sort(function(entry1, entry2) {
						return entry1.center[key] - entry2.center[key];
					});
				}
				var middle = entries.length >> 1;
				return traceBoolean(combine(entries.slice(0, middle)),
						combine(entries.slice(middle)),
						isUnite ? 'unite' : operation, { insert: false });
			}
			return entries[0].path;
		}

		var entries = [].concat(paths || []).map(function(path) {
			var bounds = path.getBounds();
			return { path: path, bounds: bounds, center: bounds.getCenter() };
		});
		return entries.length ? combine(entries) : null;
	}

	function splitBoolean(path1, path2, operation, options) {
		var _path1 = preparePath(path1),
			_path2 = preparePath(combinePaths(path2, operation)),
			crossings = _path1.getIntersections(_path2, filterIntersection),
			subtract = operation === 'subtract',
			divide = operation === 'divide',
			pieces = [],
			paths = [];

		for (var i = crossings.length - 1; i >= 0; i--) {
			var crossing = crossings[i],
				split = crossing.getPath(),
				path = crossing.split();
			if (path) {
				path.getFirstSegment().setHandleIn(0, 0);
				split.getLastSegment().setHandleOut(0, 0);
				if (pieces.indexOf(path) === -1)
					pieces.push(path);
			}
		}
		var children = _path1._children || [_path1];
		for (var i = 0, l = children.length; i < l; i++) {
			if (pieces.indexOf(children[i]) === -1)
				pieces.push(children[i]);
		}
		for (var i = 0, l = pieces.length; i < l; i++) {
			var piece = pieces[i];
			if (divide || _path2.contains(
					piece.getPointAt(piece.getLength() / 2)) ^ subtract)
				paths.unshift(piece);
		}
		return createResult(paths, false, path1, path2, options);
	}

	function getRayWinding(point, v) {
		var winding = 0,
			x = point.x,
			y = point.y;
		if (y >= min(v[1], v[3], v[5], v[7]) && y <= max(v[1], v[3], v[5], v[7])
				&& x < max(v[0], v[2], v[4], v[6])) {
			var monoCurves = Curve.getMonoCurves(v),
				roots = [];
			for (var i = 0, l = monoCurves.length; i < l; i++) {
				var mv = monoCurves[i],
					y0 = mv[1],
					y3 = mv[7],
					dir = y0 < y3 ? 1 : y0 > y3 ? -1 : 0;
				if (dir && y >= min(y0, y3) && y < max(y0, y3)) {
					var px = Curve.solveCubic(mv, 1, y, roots, 0, 1) > 0
							? Curve.getPoint(mv, roots[0]).x
							: abs(y - y0) < abs(y - y3) ? mv[0] : mv[6];
					if (px > x)
						winding += dir;
				}
			}
		}
		return winding;
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
			var collisions = CollisionDetection.findItemBoundsCollisions(sorted,
					null, Numerical.GEOMETRIC_EPSILON);
			if (clockwise == null)
				clockwise = first.isClockwise();
			for (var i = 0; i < length; i++) {
				var path1 = sorted[i],
					entry1 = lookup[path1._id],
					containerWinding = 0,
					indices = collisions[i];
				if (indices) {
					var point = null;
					for (var j = indices.length - 1; j >= 0; j--) {
						if (indices[j] < i) {
							point = point || path1.getInteriorPoint();
							var path2 = sorted[indices[j]];
							var curves = path2.getCurves(),
								winding = 0;
							for (var k = 0, n = curves.length; k < n; k++) {
								winding += getRayWinding(point,
										curves[k].getValues());
							}
							if (winding) {
								var entry2 = lookup[path2._id];
								containerWinding = entry2.winding;
								entry1.winding += containerWinding;
								entry1.container = entry2.exclude
									? entry2.container : path2;
								break;
							}
						}
					}
				}
				if (isInside(entry1.winding) === isInside(containerWinding)) {
					entry1.exclude = true;
					paths[entry1.index] = null;
				} else {
					var container = entry1.container;
					path1.setClockwise(
							container ? !container.isClockwise() : clockwise);
				}
			}
		}
		return paths;
	}

	function getWinding(point, curves, dir, closed, dontFlip) {
		var curvesList = Array.isArray(curves)
			? curves
			: curves[dir ? 'hor' : 'ver'];
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
				quality /= 4;
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

		for (var i = 0, l = curvesList.length; i < l; i++) {
			var curve = curvesList[i],
				path = curve._path,
				v = curve.getValues(),
				res;
			if (!i || curvesList[i - 1]._path !== path) {
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

			if (i + 1 === l || curvesList[i + 1]._path !== path) {
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

	function getPart(v, hasHandles, time1, time2, point1, point2) {
		var part;
		if (hasHandles) {
			part = Curve.getPart(v, time1, time2).slice();
			var dx1 = point1.x - part[0],
				dy1 = point1.y - part[1],
				dx2 = point2.x - part[6],
				dy2 = point2.y - part[7];
			part[0] += dx1;
			part[1] += dy1;
			part[2] += dx1;
			part[3] += dy1;
			part[4] += dx2;
			part[5] += dy2;
			part[6] += dx2;
			part[7] += dy2;
		} else {
			part = [point1.x, point1.y, point1.x, point1.y,
					point2.x, point2.y, point2.x, point2.y];
		}
		return part;
	}

	function createGraph(operands) {
		var curves = [],
			curveOperands = [],
			offsets = {},
			nonZeros = [],
			bounds = null;
		for (var i = 0, l = operands.length; i < l; i++) {
			var operand = operands[i],
				paths = getPaths(operand);
			nonZeros.push(operand.getFillRule() === 'nonzero');
			bounds = bounds ? bounds.unite(operand.getBounds())
					: operand.getBounds();
			for (var j = 0, k = paths.length; j < k; j++) {
				var pathCurves = paths[j].getCurves();
				offsets[paths[j]._id] = curves.length;
				for (var m = 0, n = pathCurves.length; m < n; m++) {
					curves.push(pathCurves[m]);
					curveOperands.push(i);
				}
			}
		}
		var resolution = Numerical.getEpsilon(max(
					abs(bounds.left), abs(bounds.right),
					abs(bounds.top), abs(bounds.bottom))),
			epsilon = max(resolution,
				bounds.getTopLeft().getDistance(bounds.getBottomRight())
					* 1e-7),
			values = [],
			cuts = [],
			xs = [],
			ys = [],
			isEnds = [];

		function addCut(index, time, point, isEnd) {
			cuts[index].push({ time: time, point: xs.length });
			xs.push(point.x);
			ys.push(point.y);
			isEnds.push(isEnd);
		}

		for (var i = 0, l = curves.length; i < l; i++) {
			var curve = curves[i];
			values.push(curve.getValues());
			cuts.push([]);
			addCut(i, 0, curve._segment1._point, true);
			addCut(i, 1, curve._segment2._point, true);
		}
		var collisions = CollisionDetection.findCurveBoundsCollisions(
				values, values, 2 * epsilon),
			locations = CurveLocation.expand(Curve.getIntersections(curves,
				null, null, null, null, false, epsilon, collisions));
		for (var i = 0, l = locations.length; i < l; i++) {
			var loc = locations[i],
				curve = loc.getCurve();
			addCut(offsets[curve._path._id] + curve.getIndex(), loc.getTime(),
					loc.getPoint(), false);
		}

		var count = xs.length,
			parents = new Array(count),
			order = new Array(count);
		for (var i = 0; i < count; i++)
			parents[i] = order[i] = i;

		function getRoot(i) {
			while (parents[i] !== i)
				i = parents[i] = parents[parents[i]];
			return i;
		}

		order.sort(function(a, b) {
			return xs[a] - xs[b];
		});
		for (var i = 0; i < count; i++) {
			var a = order[i];
			for (var j = i + 1; j < count && xs[order[j]] - xs[a] <= epsilon;
					j++) {
				var b = order[j],
					dx = xs[b] - xs[a],
					dy = ys[b] - ys[a];
				if (dx * dx + dy * dy <= epsilon * epsilon)
					parents[getRoot(a)] = getRoot(b);
			}
		}
		var vertexIndices,
			vertices;

		function createVertices() {
			vertexIndices = {};
			vertices = [];
			for (var i = 0; i < count; i++) {
				var root = getRoot(i),
					index = vertexIndices[root];
				if (index === undefined) {
					index = vertexIndices[root] = vertices.length;
					vertices.push({ x: xs[i], y: ys[i], isEnd: isEnds[i],
							point: i, outgoing: [] });
				} else if (isEnds[i] && !vertices[index].isEnd) {
					vertices[index] = { x: xs[i], y: ys[i], isEnd: true,
							point: i, outgoing: [] };
				}
			}
		}

		createVertices();

		function getVertex(point) {
			return vertexIndices[getRoot(point)];
		}

		function getPiece(i, cut1, cut2) {
			return getPart(values[i], curves[i].hasHandles(), cut1.time,
					cut2.time, vertices[getVertex(cut1.point)],
					vertices[getVertex(cut2.point)]);
		}

		function sortCuts(list) {
			return list.sort(function(a, b) {
				return a.time - b.time;
			});
		}

		var marks = new Array(vertices.length);

		function getHotPixels(i) {
			var v = values[i],
				left = min(v[0], v[2], v[4], v[6]) - 2 * epsilon,
				top = min(v[1], v[3], v[5], v[7]) - 2 * epsilon,
				right = max(v[0], v[2], v[4], v[6]) + 2 * epsilon,
				bottom = max(v[1], v[3], v[5], v[7]) + 2 * epsilon,
				indices = collisions[i],
				hotPixels = [];
			for (var j = 0, k = indices.length; j < k; j++) {
				var list = cuts[indices[j]];
				for (var m = 0, n = list.length; m < n; m++) {
					var index = getVertex(list[m].point);
					if (marks[index] !== i) {
						var vertex = vertices[index];
						marks[index] = i;
						if (vertex.x >= left && vertex.x <= right
								&& vertex.y >= top && vertex.y <= bottom)
							hotPixels.push(index);
					}
				}
			}
			return hotPixels.sort(function(a, b) {
				return a - b;
			});
		}

		function isNearPiece(piece, index, vertex) {
			var v = piece.values,
				x = vertex.x,
				y = vertex.y;
			return getVertex(piece.cut1.point) !== index
					&& getVertex(piece.cut2.point) !== index
					&& x >= min(v[0], v[2], v[4], v[6]) - epsilon
					&& x <= max(v[0], v[2], v[4], v[6]) + epsilon
					&& y >= min(v[1], v[3], v[5], v[7]) - epsilon
					&& y <= max(v[1], v[3], v[5], v[7]) + epsilon;
		}

		function addPiece(pieces, i, cut1, cut2) {
			pieces.push({
				values: getPiece(i, cut1, cut2),
				cut1: cut1,
				cut2: cut2
			});
		}

		for (var i = 0, l = curves.length; i < l; i++) {
			var candidates = getHotPixels(i);
			if (candidates.length) {
				var list = sortCuts(cuts[i]),
					pieces = [];
				for (var j = 1, k = list.length; j < k; j++)
					addPiece(pieces, i, list[j - 1], list[j]);
				while (pieces.length) {
					var piece = pieces.pop();
					for (var j = 0, k = candidates.length; j < k; j++) {
						var index = candidates[j],
							vertex = vertices[index];
						if (isNearPiece(piece, index, vertex)) {
							var point = new Point(vertex.x, vertex.y),
								t = Curve.getNearestTime(piece.values, point);
							if (t > 0 && t < 1 && point.isClose(
									Curve.getPoint(piece.values, t), epsilon)) {
								var cut1 = piece.cut1,
									cut2 = piece.cut2,
									cut = {
										time: curves[i].hasHandles()
											? cut1.time
												+ (cut2.time - cut1.time) * t
											: Curve.getNearestTime(values[i],
												point),
										point: vertex.point
									};
								cuts[i].push(cut);
								addPiece(pieces, i, cut1, cut);
								addPiece(pieces, i, cut, cut2);
								break;
							}
						}
					}
				}
			}
		}

		var pieces = [];
		for (var i = 0, l = curves.length; i < l; i++) {
			var list = sortCuts(cuts[i]);
			for (var j = 1, k = list.length; j < k; j++) {
				var cut1 = list[j - 1],
					cut2 = list[j];
				if (getVertex(cut1.point) !== getVertex(cut2.point)
						&& Curve.getLength(getPiece(i, cut1, cut2))
							< 4 * epsilon)
					pieces.push([cut1.point, cut2.point]);
			}
		}
		if (pieces.length) {
			for (var i = 0, l = pieces.length; i < l; i++) {
				var root1 = getRoot(pieces[i][0]),
					root2 = getRoot(pieces[i][1]);
				if (root1 !== root2)
					parents[root1] = root2;
			}
			createVertices();
		}

		var edges = [],
			edgesByVertex = [];

		function getCoincidence(edge1, edge2) {
			var v1 = edge1.values,
				v2 = edge2.values,
				times = [];
			for (var i = 1; i <= 3; i++) {
				var point = Curve.getPoint(v2, i / 4),
					time = Curve.getNearestTime(v1, point);
				if (!point.isClose(Curve.getPoint(v1, time), epsilon))
					return 0;
				times.push(time);
			}
			return times[0] < times[2] ? 1 : -1;
		}

		function addEdge(edge) {
			var first = min(edge.from, edge.to),
				last = max(edge.from, edge.to),
				list = edgesByVertex[first] || (edgesByVertex[first] = []);
			for (var i = 0, l = list.length; i < l; i++) {
				var other = list[i],
					direction = max(other.from, other.to) === last
						&& getCoincidence(other, edge);
				if (direction) {
					for (var j = 0; j < 2; j++)
						other.windings[j] += direction * edge.windings[j];
					return;
				}
			}
			list.push(edge);
			edges.push(edge);
		}

		for (var i = 0, l = curves.length; i < l; i++) {
			var list = cuts[i],
				isStraight = !curves[i].hasHandles(),
				prev = list[0];
			for (var j = 1, k = list.length; j < k; j++) {
				var cut = list[j],
					from = getVertex(prev.point),
					to = getVertex(cut.point),
					part = getPiece(i, prev, cut);
				if (from !== to || Curve.getLength(part) >= 4 * epsilon) {
					var windings = [0, 0];
					windings[curveOperands[i]] = 1;
					addEdge({
						values: part,
						from: from,
						to: to,
						isStraight: isStraight,
						windings: windings,
						curve: i,
						time1: prev.time,
						time2: cut.time
					});
				}
				prev = cut;
			}
		}

		var halfEdges = [];

		function getSide(halfEdge1, halfEdge2) {
			var v1 = halfEdge1.values,
				v2 = halfEdge2.values,
				edge2 = halfEdge2.edge,
				length = min(halfEdge1.edge.length, edge2.length) / 2,
				point = Curve.getPoint(v2, edge2.isStraight
						? length / edge2.length
						: Curve.getTimeAt(v2, length)),
				time = Curve.getNearestTime(v1, point);
			return time > 0 && time < 1
					? Curve.getTangent(v1, time).cross(
						point.subtract(Curve.getPoint(v1, time))) > 0 ? -1 : 1
					: 0;
		}

		function getDirections(v) {
			var angles = [];
			for (var i = 0; i < 6; i += 2) {
				var dx = v[i + 2] - v[i],
					dy = v[i + 3] - v[i + 1];
				if (dx || dy)
					angles.push(Math.atan2(dy, dx));
			}
			var first = angles[0],
				from = 0,
				to = 0;
			for (var i = 1, l = angles.length; i < l; i++) {
				var difference = (angles[i] - first + 3 * Math.PI)
						% (2 * Math.PI) - Math.PI;
				from = min(from, difference);
				to = max(to, difference);
			}
			return to - from < Math.PI
					? { start: (first + from + 2 * Math.PI) % (2 * Math.PI),
						width: to - from }
					: null;
		}

		function sortByDirections(outgoing) {
			var distance = Infinity;
			for (var j = 0, k = outgoing.length; j < k; j++) {
				var halfEdge = halfEdges[outgoing[j]],
					v = halfEdge.values;
				halfEdge.directions = getDirections(v);
				if (!halfEdge.directions)
					return false;
				distance = min(distance,
						Math.sqrt((v[6] - v[0]) * (v[6] - v[0])
							+ (v[7] - v[1]) * (v[7] - v[1])) / 2);
			}
			var sorted = outgoing.slice().sort(function(a, b) {
					return halfEdges[a].directions.start
							- halfEdges[b].directions.start;
				}),
				gap = Infinity,
				width = 0;
			for (var j = 0, k = sorted.length; j < k; j++) {
				var directions1 = halfEdges[sorted[j]].directions,
					directions2 = halfEdges[sorted[(j + 1) % k]].directions;
				gap = min(gap, directions2.start - directions1.start
						- directions1.width + (j + 1 < k ? 0 : 2 * Math.PI));
				width = max(width, directions1.width);
			}
			if (gap > 0 && distance * Math.cos(width / 2)
					* Math.sin(min(gap, Math.PI / 2)) > 2 * epsilon) {
				for (var j = 0, k = sorted.length; j < k; j++)
					outgoing[j] = sorted[j];
				return true;
			}
			return false;
		}

		for (var i = 0, l = edges.length; i < l; i++) {
			var edge = edges[i],
				v = edge.values;
			edge.reversed = [v[6], v[7], v[4], v[5], v[2], v[3], v[0], v[1]];
			halfEdges.push(
				{ edge: edge, values: v, from: edge.from, to: edge.to },
				{ edge: edge, values: edge.reversed, from: edge.to,
					to: edge.from });
			vertices[edge.from].outgoing.push(2 * i);
			vertices[edge.to].outgoing.push(2 * i + 1);
		}
		for (var i = 0, l = vertices.length; i < l; i++) {
			var vertex = vertices[i],
				outgoing = vertex.outgoing;
			if (outgoing.length > 2 && !sortByDirections(outgoing)) {
				var distance = Infinity;
				for (var j = 0, k = outgoing.length; j < k; j++) {
					var edge = halfEdges[outgoing[j]].edge;
					edge.length = edge.length || Curve.getLength(edge.values);
					distance = min(distance, edge.length / 2);
				}
				for (var j = 0, k = outgoing.length; j < k; j++) {
					var halfEdge = halfEdges[outgoing[j]],
						v = halfEdge.values,
						point = Curve.getPoint(v, halfEdge.edge.isStraight
								? distance / halfEdge.edge.length
								: Curve.getTimeAt(v, distance));
					halfEdge.point = point;
					halfEdge.angle = Math.atan2(point.y - vertex.y,
							point.x - vertex.x);
				}
				outgoing.sort(function(a, b) {
					return halfEdges[a].angle - halfEdges[b].angle;
				});
				var start = -Math.PI,
					gap = 0;
				for (var j = 0, k = outgoing.length; j < k; j++) {
					var angle = halfEdges[outgoing[j]].angle,
						previous = halfEdges[outgoing[(j || k) - 1]].angle,
						difference = (angle - previous + 2 * Math.PI)
							% (2 * Math.PI) || 2 * Math.PI;
					if (difference > gap) {
						gap = difference;
						start = angle;
					}
				}
				for (var j = 0, k = outgoing.length; j < k; j++) {
					var halfEdge = halfEdges[outgoing[j]];
					halfEdge.angle = (halfEdge.angle - start + 2 * Math.PI)
							% (2 * Math.PI);
				}
				outgoing.sort(function(a, b) {
					var halfEdge1 = halfEdges[a],
						halfEdge2 = halfEdges[b];
					return halfEdge1.point.isClose(halfEdge2.point, epsilon)
							&& getSide(halfEdge1, halfEdge2)
							|| halfEdge1.angle - halfEdge2.angle;
				});
			}
			for (var j = 0, k = outgoing.length; j < k; j++)
				halfEdges[outgoing[j]].position = j;
		}
		for (var i = 0, l = halfEdges.length; i < l; i++) {
			var outgoing = vertices[halfEdges[i].to].outgoing,
				position = halfEdges[i ^ 1].position;
			halfEdges[i].next = outgoing[(position || outgoing.length) - 1];
		}

		var faces = [];
		for (var i = 0, l = halfEdges.length; i < l; i++) {
			if (halfEdges[i].face === undefined) {
				var face = { halfEdges: [], area: 0, windings: null,
						component: null },
					index = i;
				do {
					var halfEdge = halfEdges[index];
					halfEdge.face = face;
					face.halfEdges.push(index);
					face.area += Curve.getArea(halfEdge.values);
					index = halfEdge.next;
				} while (index !== i);
				faces.push(face);
			}
		}

		var components = [],
			rays = [],
			bounds = [];
		for (var i = 0, l = faces.length; i < l; i++) {
			var face = faces[i];
			if (!face.component) {
				var component = {
						edges: [],
						bounds: [Infinity, Infinity, -Infinity, -Infinity],
						outside: face
					},
					list = [face];
				face.component = component;
				for (var j = 0; j < list.length; j++) {
					var indices = list[j].halfEdges;
					if (list[j].area < component.outside.area)
						component.outside = list[j];
					for (var k = 0, n = indices.length; k < n; k++) {
						var other = halfEdges[indices[k] ^ 1].face;
						if (!other.component) {
							other.component = component;
							list.push(other);
						}
					}
				}
				var vertex = vertices[
						halfEdges[component.outside.halfEdges[0]].from];
				components.push(component);
				rays.push([vertex.x, vertex.y, Infinity, vertex.y]);
				bounds.push(component.bounds);
			}
		}
		for (var i = 0, l = edges.length; i < l; i++) {
			var edge = edges[i],
				v = edge.values,
				component = halfEdges[2 * i].face.component,
				b = component.bounds;
			component.edges.push(edge);
			b[0] = min(b[0], v[0], v[2], v[4], v[6]);
			b[1] = min(b[1], v[1], v[3], v[5], v[7]);
			b[2] = max(b[2], v[0], v[2], v[4], v[6]);
			b[3] = max(b[3], v[1], v[3], v[5], v[7]);
		}
		var collisions = CollisionDetection.findBoundsCollisions(rays, bounds,
				0, true);
		for (var i = 0, l = components.length; i < l; i++) {
			var outside = components[i].outside,
				point = new Point(rays[i][0], rays[i][1]),
				indices = collisions[i],
				windings = [0, 0];
			for (var j = 0, k = indices.length; j < k; j++) {
				if (indices[j] !== i) {
					var list = components[indices[j]].edges;
					for (var m = 0, n = list.length; m < n; m++) {
						var edge = list[m],
							winding = getRayWinding(point, edge.values);
						windings[0] += winding * edge.windings[0];
						windings[1] += winding * edge.windings[1];
					}
				}
			}
			outside.windings = windings;
			var queue = [outside];
			for (var j = 0; j < queue.length; j++) {
				var face = queue[j],
					indices = face.halfEdges;
				for (var k = 0, n = indices.length; k < n; k++) {
					var index = indices[k],
						other = halfEdges[index ^ 1].face;
					if (!other.windings) {
						var windings = halfEdges[index].edge.windings,
							sign = index & 1 ? -1 : 1;
						other.windings = [
							face.windings[0] - sign * windings[0],
							face.windings[1] - sign * windings[1]
						];
						queue.push(other);
					}
				}
			}
		}
		return {
			curves: curves,
			values: values,
			vertices: vertices,
			edges: edges,
			halfEdges: halfEdges,
			faces: faces,
			nonZeros: nonZeros,
			epsilon: epsilon
		};
	}

	function tracePaths(operands, operator) {
		var graph = createGraph(operands),
			halfEdges = graph.halfEdges,
			faces = graph.faces,
			nonZeros = graph.nonZeros;
		for (var i = 0, l = faces.length; i < l; i++) {
			var face = faces[i],
				windings = face.windings;
			face.isInside = !!operator(
					nonZeros[0] ? !!windings[0] : !!(windings[0] & 1),
					nonZeros[1] ? !!windings[1] : !!(windings[1] & 1));
		}

		function isBoundary(index) {
			return halfEdges[index].face.isInside
					&& !halfEdges[index ^ 1].face.isInside;
		}

		function getTimes(index) {
			var edge = halfEdges[index].edge;
			return index & 1 ? [edge.time2, edge.time1]
					: [edge.time1, edge.time2];
		}

		function isContinued(index, next) {
			return halfEdges[index].edge.curve === halfEdges[next].edge.curve
					&& getTimes(index)[1] === getTimes(next)[0];
		}

		var paths = [],
			isVisited = [];
		for (var i = 0, l = halfEdges.length; i < l; i++) {
			if (!isVisited[i] && isBoundary(i)) {
				var contour = [],
					index = i;
				do {
					isVisited[index] = true;
					contour.push(index);
					index = halfEdges[index].next;
					while (!isBoundary(index))
						index = halfEdges[index ^ 1].next;
				} while (index !== i);
				var length = contour.length,
					start = 0;
				while (start < length && isContinued(
						contour[(start || length) - 1], contour[start]))
					start++;
				var segments = [],
					handleIn = null;
				for (var j = 0; j < length;) {
					var first = contour[(start + j) % length],
						last = first;
					while (++j < length && isContinued(last,
							contour[(start + j) % length]))
						last = contour[(start + j) % length];
					var edge = halfEdges[first].edge,
						isStraight = edge.isStraight,
						v = first === last
							? halfEdges[first].values
							: getPart(graph.values[edge.curve], !isStraight,
								getTimes(first)[0], getTimes(last)[1],
								graph.vertices[halfEdges[first].from],
								graph.vertices[halfEdges[last].to]);
					segments.push(new Segment(new Point(v[0], v[1]),
							handleIn,
							!isStraight && new Point(v[2] - v[0], v[3] - v[1])));
					handleIn = !isStraight
							&& new Point(v[4] - v[6], v[5] - v[7]);
				}
				if (handleIn)
					segments[0].setHandleIn(handleIn);
				var path = new Path(Item.NO_INSERT);
				path.setSegments(segments);
				path.setClosed(true);
				if (path.getArea() !== 0)
					paths.push(path);
			}
		}
		return paths;
	}

	function getOperands(path1, path2) {
		var operands = [preparePath(path1, true)];
		if (path2)
			operands.push(preparePath(path2, true));
		return operands;
	}

	return {
		statics: {
			_createGraph: function(path1, path2) {
				return createGraph(getOperands(path1, path2));
			}
		},

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
					? splitBoolean(this, path, 'divide', options)
					: createResult([
						this.subtract(path, options),
						this.intersect(path, options)
					], true, this, path, options);
		},

		resolveCrossings: function() {
			var children = this._children,
				paths = tracePaths([closePaths(this.clone(false))],
					function(inside) {
						return inside;
					});
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
			if (!this.contains(point) || this.getNearestPoint(point)
					.isClose(point, 1e-7)) {
				var curves = this.getCurves(),
					monoCurves = [],
					ys = [],
					intercepts = [],
					roots = [];
				for (var i = 0, l = curves.length; i < l; i++)
					Base.push(monoCurves, Curve.getMonoCurves(
							curves[i].getValues()));
				for (var i = 0, l = monoCurves.length; i < l; i++)
					ys.push(monoCurves[i][1], monoCurves[i][7]);
				ys.sort(function(a, b) { return a - b; });
				var y = point.y,
					below = y,
					above = y;
				for (var i = 0, l = ys.length; i < l && above === y; i++) {
					if (ys[i] <= y) {
						below = ys[i];
					} else {
						above = ys[i];
					}
				}
				y = point.y = (below + above) / 2;
				for (var i = 0, l = monoCurves.length; i < l; i++) {
					var mv = monoCurves[i],
						mo0 = mv[1],
						mo3 = mv[7];
					if (y > min(mo0, mo3) && y < max(mo0, mo3)) {
						intercepts.push(
								Curve.solveCubic(mv, 1, y, roots, 0, 1) === 1
									? Curve.getPoint(mv, roots[0]).x
									: (mv[0] + mv[6]) / 2);
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
		return Numerical.isMachineZero(df) ? u : u - diff.dot(pt1) / df;
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
	_boundsOptions: { handle: false },

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
		if (param.dontFinish || param.clip) {
			var rect = this.getInternalBounds();
			if (!param.dontStart)
				ctx.beginPath();
			ctx.rect(rect.x, rect.y, rect.width, rect.height);
		} else if (this._content) {
			this._setStyles(ctx, param, viewMatrix);
			var lines = this._lines,
				style = this._style,
				hasFill = style.hasFill(),
				hasStroke = style.hasStroke(),
				leading = style.getLeading(),
				shadowColor = ctx.shadowColor;
			if (hasStroke && !style.getStrokeScaling()) {
				var scale = viewMatrix._getMeanScale();
				ctx.lineWidth /= scale;
				if ('setLineDash' in ctx) {
					ctx.setLineDash(ctx.getLineDash().map(function(dash) {
						return dash / scale;
					}));
					ctx.lineDashOffset /= scale;
				}
			}
			ctx.font = style.getFontStyle();
			ctx.textAlign = style.getJustification();
			ctx.letterSpacing = style.getTrackingStyle();
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
		}
	},

	_getBounds: function(matrix, options) {
		var style = this._style,
			lines = this._lines,
			numLines = lines.length,
			justification = style.getJustification(),
			leading = style.getLeading(),
			width = this.getView().getTextWidth(style.getFontStyle(), lines,
					style.getTrackingStyle()),
			x = 0;
		if (justification !== 'left')
			x -= width / (justification === 'center' ? 2: 1);
		var rect = new Rectangle(x,
					numLines ? - 0.75 * leading : 0,
					width, numLines * leading);
		if (options.stroke && style.hasStroke())
			rect = rect.expand(style.getStrokeWidth());
		return matrix ? matrix._transformBounds(rect, rect) : rect;
	},

	_hitTestSelf: function(point, options) {
		if (options.fill && this.getFillColor()) {
			var bounds = this.getInternalBounds(),
				closest = point.clamp(bounds.getTopLeft(true),
						bounds.getBottomRight(true));
			if (point.subtract(closest).divide(options._tolerancePadding)
					.getLength() <= 1)
				return new HitResult('fill', this);
		}
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
			components = match[2].trim().split(/[,\s]+/g);
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
					value /= /%$/.test(component) ? 100 : 255;
				}
				components[i] = value;
			}
		} else {
			var color = namedColors[string];
			if (!color) {
				if (!colorCtx) {
					colorCtx = CanvasProvider.getContext(1, 1, {
						willReadFrequently: true
					});
					if (colorCtx)
						colorCtx.globalCompositeOperation = 'copy';
				}
				if (colorCtx) {
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
			if (this._owner) {
				if (this._setter) {
					this._owner[this._setter](this);
				} else {
					this._owner._changed(129);
				}
			}
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

		toCanvasStyle: function(ctx, matrix, strokeMatrix) {
			var isCacheable = !(this._type === 'gradient' && strokeMatrix);
			if (this._canvasStyle && isCacheable)
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
			if (strokeMatrix) {
				origin = strokeMatrix._transformPoint(origin);
				destination = strokeMatrix._transformPoint(destination);
				if (highlight)
					highlight = strokeMatrix._transformPoint(highlight);
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
			if (isCacheable)
				this._canvasStyle = canvasGradient;
			return canvasGradient;
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
			},

			_setOwner: function(color, owner, setter) {
				if (color) {
					if (color._owner && owner && color._owner !== owner) {
						color = color.clone();
					}
					if (!color._owner ^ !owner) {
						color._owner = owner || null;
						color._setter = setter || null;
					}
				}
				return color;
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
		Color._setOwner(this._color, null);
		this._color = Color._setOwner(Color.read(arguments, 0), this,
				'setColor');
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
		tracking: 0,
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
		tracking: 9,
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
						if (old && old.constructor === Color) {
							Color._setOwner(old, null);
							old._canvasStyle = null;
						}
						if (value && value.constructor === Color) {
							value = Color._setOwner(value, owner,
									applyToChildren && set);
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
				applyToChildren = children && children.length > 0
					&& !(owner instanceof CompoundPath),
				value;
			if (applyToChildren && !_dontMerge) {
				for (var i = 0, l = children.length; i < l; i++) {
					var childValue = children[i]._style[get]();
					if (!i) {
						value = childValue;
					} else if (!Base.equals(value, childValue)) {
						return undefined;
					}
				}
			} else if (key in this._defaults) {
				var value = this._values[key];
				if (value === undefined) {
					value = this._defaults[key];
					if (value && value.clone) {
						value = value.clone();
					}
				} else {
					var ctor = isColor ? Color : isPoint ? Point : null;
					if (ctor && !(value && value.constructor === ctor)) {
						this._values[key] = value = ctor.read([value], 0,
								{ readNull: true, clone: true });
					}
				}
			}
			if (value && isColor) {
				value = Color._setOwner(value, owner, applyToChildren && set);
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

	getTrackingStyle: function() {
		return this.getTracking() / 1000 + 'em';
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

		getInsets: function(el, start) {
			var style = DomElement.getStyles(el);
			function get(side) {
				return parseFloat(style['padding' + side])
						+ parseFloat(style['border' + side + 'Width']);
			}
			return start
					? new Size(get('Left'), get('Top'))
					: new Size(get('Left') + get('Right'),
						get('Top') + get('Bottom'));
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

	getPoint: function(event, target) {
		function find(touches) {
			for (var i = 0, l = touches.length; i < l; i++) {
				if (touches[i].target === target)
					return touches[i];
			}
		}

		var touches = event.targetTouches,
			pos = event;
		if (touches) {
			pos = find(event.touches) || find(event.changedTouches)
					|| (touches.length ? touches[0] : event.changedTouches[0]);
		}
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
		target = target || DomEvent.getTarget(event);
		return DomEvent.getPoint(event, target).subtract(
				DomElement.getOffset(target));
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
		if (requested) {
			nativeRequest(handleCallbacks);
		} else if (timer && !callbacks.length) {
			clearInterval(timer);
			timer = null;
		}
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
			var size = new Size(element.offsetWidth, element.offsetHeight);
			return size.isNaN() || size.isZero()
					? new Size(getSize('width'), getSize('height'))
					: size.subtract(DomElement.getInsets(element));
		}

		var size;
		if (window && element) {
			this._id = element.getAttribute('id');
			if (this._id == null)
				element.setAttribute('id', this._id = 'paper-view-' + View._id++);
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

	update: function(force) {
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
					if (!element
							|| (!DomElement.getPrefixed(document, 'hidden')
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

	getProject: function() {
		return this._project;
	},

	getScope: function() {
		return this._scope;
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

	setBounds: function() {
		this.fitBounds(Rectangle.read(arguments));
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
		var agent = paper.agent,
			element = this._element,
			ctx,
			pixels;
		if (element && agent && agent.firefox) {
			var parent = element.parentNode,
				temp = document.createElement('div');
			temp.style.fontSize = size;
			parent.appendChild(temp);
			pixels = parseFloat(DomElement.getStyles(temp).fontSize);
			parent.removeChild(temp);
		} else if (ctx = this._context || CanvasProvider.getContext(1, 1)) {
			var prevFont = ctx.font;
			ctx.font = size + ' serif';
			pixels = parseFloat(ctx.font);
			ctx.font = prevFont;
			if (ctx !== this._context)
				CanvasProvider.release(ctx);
		} else {
			pixels = parseFloat(size);
		}
		return pixels;
	},

	getTextWidth: function(font, lines, letterSpacing) {
		var ctx = this._context || CanvasProvider.getContext(1, 1),
			width = 0;
		if (ctx) {
			var prevFont = ctx.font,
				prevLetterSpacing = ctx.letterSpacing;
			ctx.font = font;
			ctx.letterSpacing = letterSpacing;
			for (var i = 0, l = lines.length; i < l; i++)
				width = Math.max(width, ctx.measureText(lines[i]).width);
			ctx.font = prevFont;
			ctx.letterSpacing = prevLetterSpacing;
			if (ctx !== this._context)
				CanvasProvider.release(ctx);
		}
		return width;
	}
}, Base.each(['rotate', 'scale', 'shear', 'skew'], function(key) {
	var rotate = key === 'rotate';
	this[key] = function() {
		var args = arguments,
			value = (rotate ? Base : Point).read(args),
			center = Point.read(args, 0, { readNull: true });
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
		return (Math.abs(scaling.x) + Math.abs(scaling.y)) / 2;
	},

	setZoom: function(zoom) {
		if (zoom > 0 && isFinite(zoom)) {
			this.transform(new Matrix().scale(zoom / this.getZoom(),
				this.getCenter()));
		}
	},

	getRotation: function() {
		return this._decompose().rotation;
	},

	setRotation: function(rotation) {
		var current = this.getRotation();
		if (current != null && rotation != null) {
			this._matrix.prepend(new Matrix().rotate(rotation - current,
					this.projectToView(this.getCenter())));
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
		matrix.set.apply(matrix, arguments);
	},

	transform: function(matrix) {
		this._matrix.append(matrix);
	},

	fitBounds: function(rectangle, fit) {
		rectangle = Rectangle.read(arguments);
		fit = Base.read(arguments);
		var matrix = this._matrix,
			size = this._viewSize,
			bounds = matrix._transformBounds(rectangle),
			scaleX = new Point(matrix._a, matrix._c).getLength(),
			scaleY = new Point(matrix._b, matrix._d).getLength(),
			ratios = [
				size.width / bounds.width * scaleX,
				size.height / bounds.height * scaleY
			].filter(function(ratio) {
				return ratio > 0 && isFinite(ratio);
			});
		this.setCenter(rectangle.getCenter());
		if (ratios.length) {
			var amount = fit === 'cover'
					? Math.max.apply(Math, ratios)
					: Math.min.apply(Math, ratios);
			matrix.prepend(new Matrix().scale(
					new Point(amount / scaleX, amount / scaleY),
					size.divide(2)));
		}
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
		var element = this._element,
			offset = DomEvent.getOffset(event, element),
			size = DomElement.getSize(element);
		if (!size.isZero()) {
			var cssSize = new Size(element.offsetWidth, element.offsetHeight);
			offset = offset.multiply(cssSize.divide(size))
					.subtract(DomElement.getInsets(element, true))
					.multiply(this.getViewSize().divide(
						cssSize.subtract(DomElement.getInsets(element))));
		}
		return this.viewToProject(offset);
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

	var viewEvents = {};

	if (window) {
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

		var docEvents = {
			mouseout: function(event) {
				var view = View._focused,
					target = DomEvent.getRelatedTarget(event);
				if (view && (!target || target.nodeName === 'HTML'))
					handleMouseMove(view, event);
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
	}

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

	function createEvent(type, options) {
		if (options.modifiers)
			Key.modifiers.set(options.modifiers);
		return {
			type: type,
			timeStamp: options.time != null ? options.time * 1000
					: options.timeStamp != null ? options.timeStamp
					: Date.now(),
			button: options.button || 0,
			cancelable: true,
			defaultPrevented: false,
			preventDefault: function() {
				this.defaultPrevented = true;
			},
			stopPropagation: function() {}
		};
	}

	var itemEventsMap = {
		mousedown: {
			mousedown: 1,
			mouseup: 1,
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

		dispatchMouseEvent: function(type, point, options) {
			if (!/^mouse(down|move|up)$/.test(type))
				throw new Error('Unknown mouse event type: \'' + type + '\'.');
			var event = createEvent(type, options || {});
			if (type === 'mousedown') {
				View._focused = this;
				mouseDown = dragging = true;
			}
			this._handleMouseEvent(type, event, new Point(point), true);
			if (type === 'mouseup')
				mouseDown = dragging = false;
			return event.defaultPrevented;
		},

		dispatchKeyEvent: function(type, key, options) {
			if (!/^key(down|up)$/.test(type))
				throw new Error('Unknown key event type: \'' + type + '\'.');
			options = options || {};
			Key._handleKey(type === 'keydown', key, options.character,
					createEvent(type, options), this);
		},

		_handleMouseEvent: function(type, event, point, dispatched) {
			var itemEvents = this._itemEvents,
				hitItems = itemEvents.native[type],
				nativeMove = type === 'mousemove',
				tool = this._scope.tool,
				view = this;

			function responds(type) {
				return itemEvents.virtual[type] || view.responds(type)
						|| tool && tool.responds(type);
			}

			function needsUp(hitItem) {
				if (view.responds('mouseup')
						|| tool && tool.responds('mouseup'))
					return true;
				for (var item = hitItem; item; item = item._parent) {
					for (var key in itemEventsMap.mouseup) {
						if (item.responds(key))
							return true;
					}
				}
				return false;
			}

			if (event.shiftKey !== undefined) {
				Key.modifiers.set({
					shift: event.shiftKey,
					control: event.ctrlKey,
					alt: event.altKey,
					meta: event.metaKey
				});
			}
			if (nativeMove && dragging && responds('mousedrag'))
				type = 'mousedrag';
			if (!point)
				point = this.getEventPoint(event);

			var target = DomEvent.getTarget(event),
				isCovered = nativeMove && !dragging && target
						&& target.nodeType === 1
						&& !target.contains(this._element),
				inView = dispatched
						|| !isCovered && this.getBounds().contains(point),
				hit = hitItems && inView && view._project.hitTest(point, {
					tolerance: view._scope.settings.hitTolerance,
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
					var time = Date.now();
					dblClick = !dblClick && hitItem === clickItem
						&& time - clickTime < 300
						&& point.getDistance(downPoint) < 3;
					downItem = clickItem = hitItem;
					clickTime = time;
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
						emitMouseEvents(this, hitItem, dblClick ? 'doubleclick'
								: 'click', event, point, downPoint);
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
				&& (called && !mouse.move || mouse.down && needsUp(hitItem))
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

			emit(this);
			if (tool && tool.responds(type))
				emit(tool);
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
		var pixelRatio = this._pixelRatio,
			element = this._element;
		_setElementSize.base.call(this, width * pixelRatio, height * pixelRatio);
		if (!PaperScope.hasAttribute(element, 'resize')) {
			var style = element.style,
				insets = DomElement.getStyles(element).boxSizing
					=== 'border-box'
						? DomElement.getInsets(element)
						: new Size();
			style.width = (width + insets.width) + 'px';
			style.height = (height + insets.height) + 'px';
		}
		if (pixelRatio !== 1) {
			var ctx = this._context;
			ctx.restore();
			ctx.save();
			ctx.scale(pixelRatio, pixelRatio);
		}
	},

	getContext: function() {
		return this._context;
	},

	update: function(force) {
		if (!this._needsUpdate && !force)
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

	getTime: function() {
		return this.event.timeStamp / 1000;
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
			'\xA0': 'space',
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

	function handleKey(down, key, character, event, view) {
		if (!view) {
			View.updateFocus();
			view = View._focused;
			if (view && !view.isVisible())
				view = null;
		}
		if (character == null)
			character = down ? key.length > 1 ? '' : key : charMap[key] || '';
		var name;
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
							handleKey(false, k, metaFixMap[k], event, view);
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
			var key = getKey(event);
			if (key.length > 1 || event.ctrlKey || event.altKey
					|| event.metaKey) {
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
		_handleKey: handleKey,

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

	getVelocity: function() {
		return this._velocity || this.tool._velocity.clone();
	},

	setVelocity: function(velocity) {
		this._velocity = velocity;
	},

	getElapsed: function() {
		return this._elapsed != null ? this._elapsed : this.tool._elapsed;
	},

	setElapsed: function(elapsed) {
		this._elapsed = elapsed;
	},

	getCount: function() {
		return this.tool[/^mouse(down|up)$/.test(this.type)
				? '_downCount' : '_moveCount'];
	},

	setCount: function(count) {
		this.tool[/^mouse(down|up)$/.test(this.type)
				? '_downCount' : '_moveCount'] = count;
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

	getEventInterval: function() {
		return this._eventInterval;
	},

	setEventInterval: function(interval) {
		this._eventInterval = interval;
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
			called = false,
			tool = this,
			time = event.timeStamp / 1000,
			elapsed = this._time != null ? time - this._time : 0,
			velocity = !mouse.down && this._point && elapsed > 0
					? point.subtract(this._point).divide(elapsed)
					: new Point();
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
			tool._velocity = velocity;
			tool._elapsed = elapsed;
			tool._time = time;
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
			if (this._eventInterval > 0) {
				clearInterval(this._timer);
				this._timer = setInterval(function() {
					if (tool.isActive()) {
						paper = tool._scope;
						tool._lastPoint = tool._point;
						tool._velocity = new Point();
						tool._elapsed = tool._eventInterval / 1000;
						tool._moveCount++;
						if (tool.responds('mousedrag')) {
							tool.emit('mousedrag',
									new ToolEvent(tool, 'mousedrag', event));
						}
					} else {
						clearInterval(tool._timer);
					}
				}, this._eventInterval);
			}
		} else if (mouse.up) {
			clearInterval(this._timer);
			update(null, this._maxDistance);
			emit();
		} else if (responds) {
			while (update(this._minDistance, this._maxDistance))
				emit();
		}
		return called;
	}

});

var Tween = Base.extend(Emitter, {
	_class: 'Tween',

	statics: {
		easings: new Base({
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
			},

			easeInSine: function(t) {
				return 1 - Math.cos(t * Math.PI / 2);
			},

			easeOutSine: function(t) {
				return Math.sin(t * Math.PI / 2);
			},

			easeInOutSine: function(t) {
				return (1 - Math.cos(t * Math.PI)) / 2;
			},

			easeInExpo: function(t) {
				return t === 0 ? 0 : Math.pow(2, 10 * t - 10);
			},

			easeOutExpo: function(t) {
				return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
			},

			easeInOutExpo: function(t) {
				return t === 0 || t === 1
					? t
					: t < 0.5
						? Math.pow(2, 20 * t - 10) / 2
						: 1 - Math.pow(2, 10 - 20 * t) / 2;
			},

			easeInCirc: function(t) {
				return 1 - Math.sqrt(1 - t * t);
			},

			easeOutCirc: function(t) {
				return Math.sqrt(1 - (--t) * t);
			},

			easeInOutCirc: function(t) {
				return t < 0.5
					? (1 - Math.sqrt(1 - 4 * t * t)) / 2
					: (1 + Math.sqrt(1 - 4 * (--t) * t)) / 2;
			}
		})
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
			if (progress >= 1) {
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
					value = (from && to && from.multiply && to.multiply)
						? to.subtract(from).multiply(factor).add(from)
						: ((to - from) * factor) + from;
				this._setProperty(this._parsedKeys[key], value);
			}

			if (this.responds('update')) {
				this.emit('update', new Base({
					progress: progress,
					factor: factor
				}));
			}
			if (!this.running && this._then) {
				this._then(this.object);
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
					operator.match(/^[+\-\*\/]=/)
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
		var name = { '+': 'add', '-': 'subtract', '*': 'multiply',
				'/': 'divide' }[operator];
		if (left && left[name])
			return left[name](right);
		switch (operator) {
		case '+': return left + right;
		case '-': return left - right;
		case '*': return left * right;
		case '/': return left / right;
		}
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

var CanvasProvider = Base.exports.CanvasProvider = {
	canvases: [],

	getCanvas: function(width, height, options) {
		if (!window && !self.OffscreenCanvas)
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
			canvas = window
					? document.createElement('canvas')
					: new self.OffscreenCanvas(width, height);
			clear = false;
		}
		var ctx = canvas.getContext('2d', options || {});
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

	getContext: function(width, height, options) {
		var canvas = this.getCanvas(width, height, options);
		return canvas ? canvas.getContext('2d', options || {}) : null;
	},

	release: function(obj) {
		var canvas = obj && obj.canvas ? obj.canvas : obj;
		if (canvas && canvas.getContext) {
			canvas.width = canvas.height = 0;
			if (this.canvases.length < 8)
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

		'pin-light': function() {
			dr = sr < 128 ? min(br, 2 * sr) : max(br, 2 * sr - 255);
			dg = sg < 128 ? min(bg, 2 * sg) : max(bg, 2 * sg - 255);
			db = sb < 128 ? min(bb, 2 * sb) : max(bb, 2 * sb - 255);
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

	var ctx = CanvasProvider.getContext(1, 1, { willReadFrequently: true });
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
				? node.getAttribute(name)
					|| node.getAttributeNS(namespace, name)
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
	fontWeight: ['font-weight', 'font'],
	fontSize: ['font-size', 'number'],
	tracking: ['letter-spacing', 'tracking'],
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
	var formatter,
		parentStyles;

	function getTransform(matrix, coordinates, center) {
		var attrs = new Base(),
			trans = matrix.getTranslation();
		if (coordinates) {
			var point;
			if (matrix.isInvertible()) {
				matrix = matrix._shiftless();
				point = matrix._inverseTransform(trans);
				trans = null;
			} else {
				point = new Point();
			}
			attrs[center ? 'cx' : 'x'] = point.x;
			attrs[center ? 'cy' : 'y'] = point.y;
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
			if (child.isClipMask()) {
				var clip = exportClip(child, options);
				setDefinition(child, clip, 'clip', options);
				SvgElement.set(node, {
					'clip-path': 'url(#' + clip.id + ')'
				});
			} else {
				var childNode = exportSVG(child, options);
				if (childNode)
					node.appendChild(childNode);
			}
		}
		return node;
	}

	function exportClip(item, options) {
		var clip = SvgElement.create('clipPath');

		function addItem(item) {
			if (item instanceof Group) {
				var children = item._children;
				for (var i = 0, l = children.length; i < l; i++) {
					if (!children[i]._clipMask)
						addItem(children[i]);
				}
			} else {
				var node = exportSVG(item, options);
				if (node)
					clip.appendChild(node);
			}
		}

		if (item instanceof Group) {
			item = item.clone({ insert: false });
			item.matrix.apply(true, true);
		}
		addItem(item);
		return clip;
	}

	function exportRaster(item, options) {
		var attrs = getTransform(item._matrix, true),
			size = item.getSize(),
			image = item.getImage(),
			href = options.embedImages == false && image && image.src
				|| item.toDataURL();
		attrs.x -= size.width / 2;
		attrs.y -= size.height / 2;
		if (options.reuseImages) {
			var node = getDefinition(href, 'image');
			if (!node) {
				node = SvgElement.create('image', {
					width: size.width,
					height: size.height,
					href: href
				}, formatter);
				setDefinition(href, node, 'image', options);
			}
			attrs.href = '#' + node.id;
			return SvgElement.create('use', attrs, formatter);
		} else {
			attrs.width = size.width;
			attrs.height = size.height;
			attrs.href = href;
			return SvgElement.create('image', attrs, formatter);
		}
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
			bounds = definitionItem.getStrokeBounds();
		if (!node) {
			node = SvgElement.create('symbol', {
				viewBox: formatter.rectangle(bounds)
			});
			node.appendChild(exportSVG(definitionItem, options));
			setDefinition(definition, node, 'symbol', options);
		}
		attrs.href = '#' + node.id;
		attrs.x += bounds.x;
		attrs.y += bounds.y;
		attrs.width = bounds.width;
		attrs.height = bounds.height;
		attrs.overflow = 'visible';
		return SvgElement.create('use', attrs, formatter);
	}

	function exportGradient(color, options) {
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
			setDefinition(color, gradientNode, 'color', options);
		}
		return 'url(#' + gradientNode.id + ')';
	}

	function exportText(item) {
		var attrs = getTransform(item._matrix, true),
			node = SvgElement.create('text', attrs, formatter),
			lines = item._lines;
		if (lines.length > 1) {
			var leading = item._style.getLeading();
			for (var i = 0, l = lines.length; i < l; i++) {
				var span = SvgElement.create('tspan', {
					x: attrs.x,
					y: attrs.y + i * leading
				}, formatter);
				span.textContent = lines[i];
				node.appendChild(span);
			}
		} else {
			node.textContent = item._content;
		}
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

	var cssBlendModes = Base.each(['normal', 'multiply', 'screen', 'overlay',
			'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light',
			'soft-light', 'difference', 'exclusion', 'hue', 'saturation',
			'color', 'luminosity'], function(mode) {
		this[mode] = true;
	}, {});

	function applyStyle(item, node, options, isRoot) {
		var attrs = {},
			parent = !isRoot && item.getParent(),
			parentStyle = parent && (parentStyles[parent._id] =
					parentStyles[parent._id] || {}),
			style = [];

		if (item._name != null)
			attrs.id = item._name;

		Base.each(SvgStyles, function(entry) {
			var get = entry.get,
				type = entry.type,
				value = item[get]();
			if (parent && !(get in parentStyle))
				parentStyle[get] = parent[get]();
			if (value !== undefined && (entry.exportFilter
					? entry.exportFilter(item, value)
					: options.reduceAttributes == false
						|| !parent || !Base.equals(parentStyle[get], value))) {
				if (type === 'color' && value != null) {
					var alpha = value.getAlpha();
					if (alpha < 1)
						attrs[entry.attribute + '-opacity'] = alpha;
				}
				if (type === 'style') {
					if (cssBlendModes[value]) {
						style.push(entry.attribute + ': ' + value);
					} else {
						attrs['data-paper-blend-mode'] = value;
					}
				} else if (type === 'font') {
					var font = ('' + value).match(
							/^(.*?)\s*\b(italic|oblique)\b\s*(.*)$/i);
					attrs[entry.attribute] = font
							? (font[1] + ' ' + font[3]).trim() || 'normal'
							: value;
					if (font)
						attrs['font-style'] = font[2].toLowerCase();
				} else {
					attrs[entry.attribute] = value == null ? 'none'
							: type === 'color' ? value.gradient
								? exportGradient(value, options)
								: value.toCSS(true)
							: type === 'array' ? value.join(',')
							: type === 'lookup' ? entry.toSVG[value]
							: type === 'tracking' ? value && value / 1000 + 'em'
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
		return item && definitions.svgs[getDefinitionKey(item, type)];
	}

	function setDefinition(item, node, type, options) {
		if (!definitions)
			getDefinition();
		var typeId = definitions.ids[type] = (definitions.ids[type] || 0) + 1;
		node.id = (options.idPrefix || '') + type + '-' + typeId;
		definitions.svgs[getDefinitionKey(item, type)] = node;
	}

	function getDefinitionKey(item, type) {
		return type + '-' + (typeof item === 'string' ? item
				: item._id || item.__id || (item.__id = UID.get('svg')));
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
		parentStyles = null;
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
		return node && applyStyle(item, node, options, isRoot);
	}

	function setOptions(options) {
		if (!options)
			options = {};
		formatter = new Formatter(options.precision);
		parentStyles = {};
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
				if (rect.x || rect.x === 0 || rect.y || rect.y === 0)
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
		using = {},
		rootSize,
		units = { 'in': 96, pt: 96 / 72, pc: 96 / 6, cm: 96 / 2.54,
			mm: 96 / 25.4 };

	function parseLength(value) {
		var unit = /(in|pt|pc|cm|mm)\s*$/.exec(value);
		return parseFloat(value) * (unit ? units[unit[1]] : 1);
	}

	function getValue(node, name, isString, allowNull, allowPercent,
			defaultValue) {
		var value = SvgElement.get(node, name) || defaultValue,
			res = value == null
				? allowNull
					? null
					: isString ? '' : 0
				: isString
					? value
					: parseLength(value);
		return /%\s*$/.test(value)
			? (res / 100) * (allowPercent ? 1
				: rootSize[/x|^width/.test(name) ? 'width' : 'height'])
			: res;
	}

	function getPoint(node, x, y, allowNull, allowPercent, defaultX, defaultY) {
		x = getValue(node, x || 'x', false, allowNull, allowPercent, defaultX);
		y = getValue(node, y || 'y', false, allowNull, allowPercent, defaultY);
		return allowNull && (x == null || y == null) ? null
				: new Point(x, y);
	}

	function getSize(node, w, h, allowNull, allowPercent) {
		w = getValue(node, w || 'width', false, allowNull, allowPercent);
		h = getValue(node, h || 'height', false, allowNull, allowPercent);
		return allowNull && (w == null || h == null) ? null
				: new Size(w, h);
	}

	function convertValue(value, type, lookup, options) {
		return value === 'none' ? null
				: type === 'number' ? parseLength(value)
				: type === 'array' ?
					value ? value.split(/[\s,]+/g).map(parseLength) : []
				: type === 'color' ? getDefinition(value, options) || value
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
			parentSize = rootSize,
			children = [];
		if (!isClip && !isDefs) {
			item = applyAttributes(item, node, options, isRoot);
			project._currentStyle = item._style.clone();
		}
		if (type === 'svg' && !isRoot) {
			rootSize = new Size(
					getValue(node, 'width', false, false, false, '100%'),
					getValue(node, 'height', false, false, false, '100%'));
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
			item = applyAttributes(item.reduce(), node, options, isRoot);
		project._currentStyle = currentStyle;
		rootSize = parentSize;
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

	function importGradient(node, type, options) {
		var id = (getValue(node, 'href', true) || '').substring(1),
			definition = getDefinitionById(id, options),
			radial = type === 'radialgradient',
			gradient;
		if (definition) {
			gradient = definition.getGradient();
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
					stops.push(applyAttributes(new GradientStop(), child,
							options));
			}
			gradient = new Gradient(stops, radial);
		}
		var origin, destination, highlight,
			scaleToBounds = getValue(node, 'gradientUnits', true) !==
				'userSpaceOnUse';
		if (radial) {
			origin = getPoint(node, 'cx', 'cy', false, scaleToBounds,
				'50%', '50%');
			destination = origin.add(
				getValue(node, 'r', false, false, scaleToBounds, '50%'), 0);
			highlight = getPoint(node, 'fx', 'fy', true, scaleToBounds);
		} else {
			origin = getPoint(node, 'x1', 'y1', false, scaleToBounds,
				'0%', '0%');
			destination = getPoint(node, 'x2', 'y2', false, scaleToBounds,
				'100%', '0%');
		}
		var color = applyAttributes(
				new Color(gradient, origin, destination, highlight), node,
				options);
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

		image: function (node, type, options) {
			var raster = new Raster({
					crossOrigin: options.crossOrigin,
					source: getValue(node, 'href', true)
				}),
				align = /none|x(Min|Mid|Max)Y(Min|Mid|Max)/.exec(
						getValue(node, 'preserveAspectRatio', true))
						|| [null, 'Mid', 'Mid'];
			raster.on('load', function() {
				var imageSize = this.getSize(),
					size = getSize(node, null, null, true) || imageSize,
					point = getPoint(node);
				if (align[0] !== 'none') {
					var factors = { Min: 0, Mid: 0.5, Max: 1 },
						fitted = imageSize.multiply(Math.min(
							size.width / imageSize.width,
							size.height / imageSize.height));
					point = point.add(size.subtract(fitted).multiply(
							[factors[align[1]], factors[align[2]]]));
					size = fitted;
				}
				var center = point.add(size.divide(2));
				this._matrix.append(new Matrix().translate(center)
						.scale(size.divide(imageSize)));
			});
			return raster;
		},

		symbol: function(node, type, options, isRoot) {
			return new SymbolDefinition(
					importGroup(node, type, options, isRoot), true);
		},

		defs: importGroup,

		use: function(node, type, options) {
			var id = (getValue(node, 'href', true) || '').substring(1),
				definition = getDefinitionById(id, options),
				point = getPoint(node),
				item = null;
			if (definition instanceof SymbolDefinition) {
				item = definition.place(point);
			} else if (definition && !using[id]) {
				using[id] = true;
				try {
					item = importNode(getSandbox().ownerDocument
							.getElementById(id), options, false)
							.translate(point);
				} finally {
					delete using[id];
				}
			}
			return item;
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
			var rx = getValue(node, 'rx', false, true),
				ry = getValue(node, 'ry', false, true);
			return new Shape.Rectangle(new Rectangle(
						getPoint(node),
						getSize(node)
					), new Size(
						rx == null ? ry || 0 : rx,
						ry == null ? rx || 0 : ry
					));
		},

		line: function(node) {
			return new Path.Line(
					getPoint(node, 'x1', 'y1'),
					getPoint(node, 'x2', 'y2'));
		},

		text: function(node) {
			var text = new PointText(getPoint(node).add(
					getPoint(node, 'dx', 'dy'))),
				lines = Base.each(node.childNodes, function(child) {
					if (/^tspan$/i.test(child.nodeName)
							&& child.hasAttribute('y'))
						this.push(child.textContent.trim());
				}, []);
			text.setContent(lines.length > 1 ? lines.join('\n')
					: node.textContent.trim());
			return text;
		},

		switch: importGroup
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
					command = parts[0].trim(),
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
		this[entry.attribute] = function(item, value, name, node, styles,
				options) {
			if (item[entry.set]) {
				item[entry.set](convertValue(value, entry.type, entry.fromSVG,
						options));
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
			if (item.setName && value !== (+value) + '')
				item.setName(value);
		},

		'clip-path': function(item, value, name, node, styles, options) {
			var clip = getDefinition(value, options);
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

		'data-paper-blend-mode': function(item, value) {
			if (item.setBlendMode)
				item.setBlendMode(value);
		},

		'font-style': function(item, value) {
			if (item.setFontWeight && /^(italic|oblique)$/.test(value)) {
				var weight = ('' + item.getFontWeight())
						.replace(/\s*\b(italic|oblique)\b/gi, '');
				item.setFontWeight(/^(normal|400)$/.test(weight) ? value
						: weight + ' ' + value);
			}
		},

		'letter-spacing': function(item, value) {
			if (item.setTracking) {
				var amount = parseFloat(value) || 0;
				item.setTracking(1000 * (/em$/.test(value) ? amount
						: amount / parseFloat(item.getFontSize())));
			}
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
		var style = Base.camelize(name),
			value = node.style && node.style[style];
		if (!value) {
			var attr = node.attributes[name];
			value = attr && attr.value;
			if (!value && node.style
					&& styles.node[style] !== styles.parent[style])
				value = styles.node[style];
		}
		return !value ? undefined
				: value === 'none' ? null
				: value;
	}

	function applyAttributes(item, node, options, isRoot) {
		var parent = node.parentNode,
			styles = {
				node: DomElement.getStyles(node) || {},
				parent: !isRoot && DomElement.getStyles(parent) || {}
			};
		if (isRoot && !styles.node.fill && item.setFillColor)
			item.setFillColor('black');
		Base.each(attributes, function(apply, name) {
			var value = getAttribute(node, name, styles);
			item = value !== undefined
					&& apply(item, value, name, node, styles, options) || item;
		});
		return item;
	}

	function getDefinitionById(id, options) {
		if (id && !definitions[id]) {
			var node = getSandbox().ownerDocument.getElementById(id);
			if (node)
				importNode(node, options, false);
		}
		return definitions[id];
	}

	function getDefinition(value, options) {
		var match = value && value.match(/\((?:["'#]*)([^"')]+)/),
			name = match && match[1],
			res = name && getDefinitionById(window
					? name.replace(window.location.href.split('#')[0] + '#', '')
					: name, options);
		if (res && res._scaleToBounds) {
			res = res.clone();
			res._scaleToBounds = true;
		}
		return res;
	}

	var sandbox;

	function getSandbox() {
		if (!(sandbox && sandbox.contentDocument)) {
			sandbox = document.createElement('iframe');
			sandbox.setAttribute('sandbox', 'allow-same-origin');
			sandbox.style.cssText = 'position: absolute; visibility: hidden;'
					+ ' width: 0; height: 0; border: 0';
			document.body.appendChild(sandbox);
			var doc = sandbox.contentDocument,
				meta = doc.createElement('meta');
			meta.httpEquiv = 'Content-Security-Policy';
			meta.content = "default-src 'none'; style-src 'unsafe-inline'";
			doc.head.appendChild(meta);
		}
		return sandbox.contentDocument.body;
	}

	function importNode(node, options, isRoot) {
		var type = node.nodeName.toLowerCase(),
			isElement = type !== '#document',
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
			getSandbox().appendChild(container);
		}
		var settings = paper.settings,
			applyMatrix = settings.applyMatrix,
			insertItems = settings.insertItems,
			importer = importers[type],
			item;
		try {
			settings.applyMatrix = false;
			settings.insertItems = false;
			try {
				item = importer && importer(node, type, options, isRoot)
						|| null;
			} finally {
				settings.insertItems = insertItems;
				settings.applyMatrix = applyMatrix;
			}
			if (item) {
				if (isElement && importer !== importGroup)
					item = applyAttributes(item, node, options, isRoot);
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
		} finally {
			if (container) {
				container.parentNode.removeChild(container);
				if (parent) {
					if (next) {
						parent.insertBefore(node, next);
					} else {
						parent.appendChild(node);
					}
				}
			}
			if (isRoot)
				definitions = {};
		}
		if (isRoot && item && Base.pick(options.applyMatrix, applyMatrix))
			item.matrix.apply(true, true);
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
				var node = typeof svg === 'object'
					? svg
					: new self.DOMParser().parseFromString(
						svg.trim(),
						'image/svg+xml'
					);
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

		if (typeof source === 'string' && !/^[\s\S]*</.test(source)) {
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

Base.exports.PaperScript = function() {
	var acorn = self.acorn;
	if (!acorn && typeof require !== 'undefined') {
		try { acorn = require('acorn'); } catch(e) {}
	}
	if (!acorn) {
		var exports, module;
		acorn = exports = module = {};

(function(root, mod) {
  if (typeof exports == "object" && typeof module == "object") return mod(exports);
  if (typeof define == "function" && define.amd) return define(["exports"], mod);
  mod(root.acorn || (root.acorn = {}));
})(this, function(exports) {
  "use strict";

  exports.version = "0.5.0";

  var options, input, inputLen, sourceFile;

  exports.parse = function(inpt, opts) {
	input = String(inpt); inputLen = input.length;
	setOptions(opts);
	initTokenState();
	return parseTopLevel(options.program);
  };

  var defaultOptions = exports.defaultOptions = {
	ecmaVersion: 5,
	strictSemicolons: false,
	allowTrailingCommas: true,
	forbidReserved: false,
	allowReturnOutsideFunction: false,
	locations: false,
	onComment: null,
	ranges: false,
	program: null,
	sourceFile: null,
	directSourceFile: null
  };

  function setOptions(opts) {
	options = opts || {};
	for (var opt in defaultOptions) if (!Object.prototype.hasOwnProperty.call(options, opt))
	  options[opt] = defaultOptions[opt];
	sourceFile = options.sourceFile || null;
  }

  var getLineInfo = exports.getLineInfo = function(input, offset) {
	for (var line = 1, cur = 0;;) {
	  lineBreak.lastIndex = cur;
	  var match = lineBreak.exec(input);
	  if (match && match.index < offset) {
		++line;
		cur = match.index + match[0].length;
	  } else break;
	}
	return {line: line, column: offset - cur};
  };

  exports.tokenize = function(inpt, opts) {
	input = String(inpt); inputLen = input.length;
	setOptions(opts);
	initTokenState();

	var t = {};
	function getToken(forceRegexp) {
	  lastEnd = tokEnd;
	  readToken(forceRegexp);
	  t.start = tokStart; t.end = tokEnd;
	  t.startLoc = tokStartLoc; t.endLoc = tokEndLoc;
	  t.type = tokType; t.value = tokVal;
	  return t;
	}
	getToken.jumpTo = function(pos, reAllowed) {
	  tokPos = pos;
	  if (options.locations) {
		tokCurLine = 1;
		tokLineStart = lineBreak.lastIndex = 0;
		var match;
		while ((match = lineBreak.exec(input)) && match.index < pos) {
		  ++tokCurLine;
		  tokLineStart = match.index + match[0].length;
		}
	  }
	  tokRegexpAllowed = reAllowed;
	  skipSpace();
	};
	return getToken;
  };

  var tokPos;

  var tokStart, tokEnd;

  var tokStartLoc, tokEndLoc;

  var tokType, tokVal;

  var tokRegexpAllowed;

  var tokCurLine, tokLineStart;

  var lastStart, lastEnd, lastEndLoc;

  var inFunction, labels, strict;

  function raise(pos, message) {
	var loc = getLineInfo(input, pos);
	message += " (" + loc.line + ":" + loc.column + ")";
	var err = new SyntaxError(message);
	err.pos = pos; err.loc = loc; err.raisedAt = tokPos;
	throw err;
  }

  var empty = [];

  var _num = {type: "num"}, _regexp = {type: "regexp"}, _string = {type: "string"};
  var _name = {type: "name"}, _eof = {type: "eof"};

  var _break = {keyword: "break"}, _case = {keyword: "case", beforeExpr: true}, _catch = {keyword: "catch"};
  var _continue = {keyword: "continue"}, _debugger = {keyword: "debugger"}, _default = {keyword: "default"};
  var _do = {keyword: "do", isLoop: true}, _else = {keyword: "else", beforeExpr: true};
  var _finally = {keyword: "finally"}, _for = {keyword: "for", isLoop: true}, _function = {keyword: "function"};
  var _if = {keyword: "if"}, _return = {keyword: "return", beforeExpr: true}, _switch = {keyword: "switch"};
  var _throw = {keyword: "throw", beforeExpr: true}, _try = {keyword: "try"}, _var = {keyword: "var"};
  var _while = {keyword: "while", isLoop: true}, _with = {keyword: "with"}, _new = {keyword: "new", beforeExpr: true};
  var _this = {keyword: "this"};

  var _null = {keyword: "null", atomValue: null}, _true = {keyword: "true", atomValue: true};
  var _false = {keyword: "false", atomValue: false};

  var _in = {keyword: "in", binop: 7, beforeExpr: true};

  var keywordTypes = {"break": _break, "case": _case, "catch": _catch,
					  "continue": _continue, "debugger": _debugger, "default": _default,
					  "do": _do, "else": _else, "finally": _finally, "for": _for,
					  "function": _function, "if": _if, "return": _return, "switch": _switch,
					  "throw": _throw, "try": _try, "var": _var, "while": _while, "with": _with,
					  "null": _null, "true": _true, "false": _false, "new": _new, "in": _in,
					  "instanceof": {keyword: "instanceof", binop: 7, beforeExpr: true}, "this": _this,
					  "typeof": {keyword: "typeof", prefix: true, beforeExpr: true},
					  "void": {keyword: "void", prefix: true, beforeExpr: true},
					  "delete": {keyword: "delete", prefix: true, beforeExpr: true}};

  var _bracketL = {type: "[", beforeExpr: true}, _bracketR = {type: "]"}, _braceL = {type: "{", beforeExpr: true};
  var _braceR = {type: "}"}, _parenL = {type: "(", beforeExpr: true}, _parenR = {type: ")"};
  var _comma = {type: ",", beforeExpr: true}, _semi = {type: ";", beforeExpr: true};
  var _colon = {type: ":", beforeExpr: true}, _dot = {type: "."}, _question = {type: "?", beforeExpr: true};

  var _slash = {binop: 10, beforeExpr: true}, _eq = {isAssign: true, beforeExpr: true};
  var _assign = {isAssign: true, beforeExpr: true};
  var _incDec = {postfix: true, prefix: true, isUpdate: true}, _prefix = {prefix: true, beforeExpr: true};
  var _logicalOR = {binop: 1, beforeExpr: true};
  var _logicalAND = {binop: 2, beforeExpr: true};
  var _bitwiseOR = {binop: 3, beforeExpr: true};
  var _bitwiseXOR = {binop: 4, beforeExpr: true};
  var _bitwiseAND = {binop: 5, beforeExpr: true};
  var _equality = {binop: 6, beforeExpr: true};
  var _relational = {binop: 7, beforeExpr: true};
  var _bitShift = {binop: 8, beforeExpr: true};
  var _plusMin = {binop: 9, prefix: true, beforeExpr: true};
  var _multiplyModulo = {binop: 10, beforeExpr: true};

  exports.tokTypes = {bracketL: _bracketL, bracketR: _bracketR, braceL: _braceL, braceR: _braceR,
					  parenL: _parenL, parenR: _parenR, comma: _comma, semi: _semi, colon: _colon,
					  dot: _dot, question: _question, slash: _slash, eq: _eq, name: _name, eof: _eof,
					  num: _num, regexp: _regexp, string: _string};
  for (var kw in keywordTypes) exports.tokTypes["_" + kw] = keywordTypes[kw];

  function makePredicate(words) {
	words = words.split(" ");
	var f = "", cats = [];
	out: for (var i = 0; i < words.length; ++i) {
	  for (var j = 0; j < cats.length; ++j)
		if (cats[j][0].length == words[i].length) {
		  cats[j].push(words[i]);
		  continue out;
		}
	  cats.push([words[i]]);
	}
	function compareTo(arr) {
	  if (arr.length == 1) return f += "return str === " + JSON.stringify(arr[0]) + ";";
	  f += "switch(str){";
	  for (var i = 0; i < arr.length; ++i) f += "case " + JSON.stringify(arr[i]) + ":";
	  f += "return true}return false;";
	}

	if (cats.length > 3) {
	  cats.sort(function(a, b) {return b.length - a.length;});
	  f += "switch(str.length){";
	  for (var i = 0; i < cats.length; ++i) {
		var cat = cats[i];
		f += "case " + cat[0].length + ":";
		compareTo(cat);
	  }
	  f += "}";

	} else {
	  compareTo(words);
	}
	return new Function("str", f);
  }

  var isReservedWord3 = makePredicate("abstract boolean byte char class double enum export extends final float goto implements import int interface long native package private protected public short static super synchronized throws transient volatile");

  var isReservedWord5 = makePredicate("class enum extends super const export import");

  var isStrictReservedWord = makePredicate("implements interface let package private protected public static yield");

  var isStrictBadIdWord = makePredicate("eval arguments");

  var isKeyword = makePredicate("break case catch continue debugger default do else finally for function if return switch throw try var while with null true false instanceof typeof void delete new in this");

  var nonASCIIwhitespace = /[\u1680\u180e\u2000-\u200a\u202f\u205f\u3000\ufeff]/;
  var nonASCIIidentifierStartChars = "\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u0527\u0531-\u0556\u0559\u0561-\u0587\u05d0-\u05ea\u05f0-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u08a0\u08a2-\u08ac\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0977\u0979-\u097f\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c33\u0c35-\u0c39\u0c3d\u0c58\u0c59\u0c60\u0c61\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d60\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f4\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f0\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1877\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191c\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19c1-\u19c7\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1ce9-\u1cec\u1cee-\u1cf1\u1cf5\u1cf6\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2119-\u211d\u2124\u2126\u2128\u212a-\u212d\u212f-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u2e2f\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309d-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312d\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fcc\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua697\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua78e\ua790-\ua793\ua7a0-\ua7aa\ua7f8-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa80-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uabc0-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc";
  var nonASCIIidentifierChars = "\u0300-\u036f\u0483-\u0487\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u0610-\u061a\u0620-\u0649\u0672-\u06d3\u06e7-\u06e8\u06fb-\u06fc\u0730-\u074a\u0800-\u0814\u081b-\u0823\u0825-\u0827\u0829-\u082d\u0840-\u0857\u08e4-\u08fe\u0900-\u0903\u093a-\u093c\u093e-\u094f\u0951-\u0957\u0962-\u0963\u0966-\u096f\u0981-\u0983\u09bc\u09be-\u09c4\u09c7\u09c8\u09d7\u09df-\u09e0\u0a01-\u0a03\u0a3c\u0a3e-\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a66-\u0a71\u0a75\u0a81-\u0a83\u0abc\u0abe-\u0ac5\u0ac7-\u0ac9\u0acb-\u0acd\u0ae2-\u0ae3\u0ae6-\u0aef\u0b01-\u0b03\u0b3c\u0b3e-\u0b44\u0b47\u0b48\u0b4b-\u0b4d\u0b56\u0b57\u0b5f-\u0b60\u0b66-\u0b6f\u0b82\u0bbe-\u0bc2\u0bc6-\u0bc8\u0bca-\u0bcd\u0bd7\u0be6-\u0bef\u0c01-\u0c03\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c62-\u0c63\u0c66-\u0c6f\u0c82\u0c83\u0cbc\u0cbe-\u0cc4\u0cc6-\u0cc8\u0cca-\u0ccd\u0cd5\u0cd6\u0ce2-\u0ce3\u0ce6-\u0cef\u0d02\u0d03\u0d46-\u0d48\u0d57\u0d62-\u0d63\u0d66-\u0d6f\u0d82\u0d83\u0dca\u0dcf-\u0dd4\u0dd6\u0dd8-\u0ddf\u0df2\u0df3\u0e34-\u0e3a\u0e40-\u0e45\u0e50-\u0e59\u0eb4-\u0eb9\u0ec8-\u0ecd\u0ed0-\u0ed9\u0f18\u0f19\u0f20-\u0f29\u0f35\u0f37\u0f39\u0f41-\u0f47\u0f71-\u0f84\u0f86-\u0f87\u0f8d-\u0f97\u0f99-\u0fbc\u0fc6\u1000-\u1029\u1040-\u1049\u1067-\u106d\u1071-\u1074\u1082-\u108d\u108f-\u109d\u135d-\u135f\u170e-\u1710\u1720-\u1730\u1740-\u1750\u1772\u1773\u1780-\u17b2\u17dd\u17e0-\u17e9\u180b-\u180d\u1810-\u1819\u1920-\u192b\u1930-\u193b\u1951-\u196d\u19b0-\u19c0\u19c8-\u19c9\u19d0-\u19d9\u1a00-\u1a15\u1a20-\u1a53\u1a60-\u1a7c\u1a7f-\u1a89\u1a90-\u1a99\u1b46-\u1b4b\u1b50-\u1b59\u1b6b-\u1b73\u1bb0-\u1bb9\u1be6-\u1bf3\u1c00-\u1c22\u1c40-\u1c49\u1c5b-\u1c7d\u1cd0-\u1cd2\u1d00-\u1dbe\u1e01-\u1f15\u200c\u200d\u203f\u2040\u2054\u20d0-\u20dc\u20e1\u20e5-\u20f0\u2d81-\u2d96\u2de0-\u2dff\u3021-\u3028\u3099\u309a\ua640-\ua66d\ua674-\ua67d\ua69f\ua6f0-\ua6f1\ua7f8-\ua800\ua806\ua80b\ua823-\ua827\ua880-\ua881\ua8b4-\ua8c4\ua8d0-\ua8d9\ua8f3-\ua8f7\ua900-\ua909\ua926-\ua92d\ua930-\ua945\ua980-\ua983\ua9b3-\ua9c0\uaa00-\uaa27\uaa40-\uaa41\uaa4c-\uaa4d\uaa50-\uaa59\uaa7b\uaae0-\uaae9\uaaf2-\uaaf3\uabc0-\uabe1\uabec\uabed\uabf0-\uabf9\ufb20-\ufb28\ufe00-\ufe0f\ufe20-\ufe26\ufe33\ufe34\ufe4d-\ufe4f\uff10-\uff19\uff3f";
  var nonASCIIidentifierStart = new RegExp("[" + nonASCIIidentifierStartChars + "]");
  var nonASCIIidentifier = new RegExp("[" + nonASCIIidentifierStartChars + nonASCIIidentifierChars + "]");

  var newline = /[\n\r\u2028\u2029]/;

  var lineBreak = /\r\n|[\n\r\u2028\u2029]/g;

  var isIdentifierStart = exports.isIdentifierStart = function(code) {
	if (code < 65) return code === 36;
	if (code < 91) return true;
	if (code < 97) return code === 95;
	if (code < 123)return true;
	return code >= 0xaa && nonASCIIidentifierStart.test(String.fromCharCode(code));
  };

  var isIdentifierChar = exports.isIdentifierChar = function(code) {
	if (code < 48) return code === 36;
	if (code < 58) return true;
	if (code < 65) return false;
	if (code < 91) return true;
	if (code < 97) return code === 95;
	if (code < 123)return true;
	return code >= 0xaa && nonASCIIidentifier.test(String.fromCharCode(code));
  };

  function line_loc_t() {
	this.line = tokCurLine;
	this.column = tokPos - tokLineStart;
  }

  function initTokenState() {
	tokCurLine = 1;
	tokPos = tokLineStart = 0;
	tokRegexpAllowed = true;
	skipSpace();
  }

  function finishToken(type, val) {
	tokEnd = tokPos;
	if (options.locations) tokEndLoc = new line_loc_t;
	tokType = type;
	skipSpace();
	tokVal = val;
	tokRegexpAllowed = type.beforeExpr;
  }

  function skipBlockComment() {
	var startLoc = options.onComment && options.locations && new line_loc_t;
	var start = tokPos, end = input.indexOf("*/", tokPos += 2);
	if (end === -1) raise(tokPos - 2, "Unterminated comment");
	tokPos = end + 2;
	if (options.locations) {
	  lineBreak.lastIndex = start;
	  var match;
	  while ((match = lineBreak.exec(input)) && match.index < tokPos) {
		++tokCurLine;
		tokLineStart = match.index + match[0].length;
	  }
	}
	if (options.onComment)
	  options.onComment(true, input.slice(start + 2, end), start, tokPos,
						startLoc, options.locations && new line_loc_t);
  }

  function skipLineComment() {
	var start = tokPos;
	var startLoc = options.onComment && options.locations && new line_loc_t;
	var ch = input.charCodeAt(tokPos+=2);
	while (tokPos < inputLen && ch !== 10 && ch !== 13 && ch !== 8232 && ch !== 8233) {
	  ++tokPos;
	  ch = input.charCodeAt(tokPos);
	}
	if (options.onComment)
	  options.onComment(false, input.slice(start + 2, tokPos), start, tokPos,
						startLoc, options.locations && new line_loc_t);
  }

  function skipSpace() {
	while (tokPos < inputLen) {
	  var ch = input.charCodeAt(tokPos);
	  if (ch === 32) {
		++tokPos;
	  } else if (ch === 13) {
		++tokPos;
		var next = input.charCodeAt(tokPos);
		if (next === 10) {
		  ++tokPos;
		}
		if (options.locations) {
		  ++tokCurLine;
		  tokLineStart = tokPos;
		}
	  } else if (ch === 10 || ch === 8232 || ch === 8233) {
		++tokPos;
		if (options.locations) {
		  ++tokCurLine;
		  tokLineStart = tokPos;
		}
	  } else if (ch > 8 && ch < 14) {
		++tokPos;
	  } else if (ch === 47) {
		var next = input.charCodeAt(tokPos + 1);
		if (next === 42) {
		  skipBlockComment();
		} else if (next === 47) {
		  skipLineComment();
		} else break;
	  } else if (ch === 160) {
		++tokPos;
	  } else if (ch >= 5760 && nonASCIIwhitespace.test(String.fromCharCode(ch))) {
		++tokPos;
	  } else {
		break;
	  }
	}
  }

  function readToken_dot() {
	var next = input.charCodeAt(tokPos + 1);
	if (next >= 48 && next <= 57) return readNumber(true);
	++tokPos;
	return finishToken(_dot);
  }

  function readToken_slash() {
	var next = input.charCodeAt(tokPos + 1);
	if (tokRegexpAllowed) {++tokPos; return readRegexp();}
	if (next === 61) return finishOp(_assign, 2);
	return finishOp(_slash, 1);
  }

  function readToken_mult_modulo() {
	var next = input.charCodeAt(tokPos + 1);
	if (next === 61) return finishOp(_assign, 2);
	return finishOp(_multiplyModulo, 1);
  }

  function readToken_pipe_amp(code) {
	var next = input.charCodeAt(tokPos + 1);
	if (next === code) return finishOp(code === 124 ? _logicalOR : _logicalAND, 2);
	if (next === 61) return finishOp(_assign, 2);
	return finishOp(code === 124 ? _bitwiseOR : _bitwiseAND, 1);
  }

  function readToken_caret() {
	var next = input.charCodeAt(tokPos + 1);
	if (next === 61) return finishOp(_assign, 2);
	return finishOp(_bitwiseXOR, 1);
  }

  function readToken_plus_min(code) {
	var next = input.charCodeAt(tokPos + 1);
	if (next === code) {
	  if (next == 45 && input.charCodeAt(tokPos + 2) == 62 &&
		  newline.test(input.slice(lastEnd, tokPos))) {
		tokPos += 3;
		skipLineComment();
		skipSpace();
		return readToken();
	  }
	  return finishOp(_incDec, 2);
	}
	if (next === 61) return finishOp(_assign, 2);
	return finishOp(_plusMin, 1);
  }

  function readToken_lt_gt(code) {
	var next = input.charCodeAt(tokPos + 1);
	var size = 1;
	if (next === code) {
	  size = code === 62 && input.charCodeAt(tokPos + 2) === 62 ? 3 : 2;
	  if (input.charCodeAt(tokPos + size) === 61) return finishOp(_assign, size + 1);
	  return finishOp(_bitShift, size);
	}
	if (next == 33 && code == 60 && input.charCodeAt(tokPos + 2) == 45 &&
		input.charCodeAt(tokPos + 3) == 45) {
	  tokPos += 4;
	  skipLineComment();
	  skipSpace();
	  return readToken();
	}
	if (next === 61)
	  size = input.charCodeAt(tokPos + 2) === 61 ? 3 : 2;
	return finishOp(_relational, size);
  }

  function readToken_eq_excl(code) {
	var next = input.charCodeAt(tokPos + 1);
	if (next === 61) return finishOp(_equality, input.charCodeAt(tokPos + 2) === 61 ? 3 : 2);
	return finishOp(code === 61 ? _eq : _prefix, 1);
  }

  function getTokenFromCode(code) {
	switch(code) {
	case 46:
	  return readToken_dot();

	case 40: ++tokPos; return finishToken(_parenL);
	case 41: ++tokPos; return finishToken(_parenR);
	case 59: ++tokPos; return finishToken(_semi);
	case 44: ++tokPos; return finishToken(_comma);
	case 91: ++tokPos; return finishToken(_bracketL);
	case 93: ++tokPos; return finishToken(_bracketR);
	case 123: ++tokPos; return finishToken(_braceL);
	case 125: ++tokPos; return finishToken(_braceR);
	case 58: ++tokPos; return finishToken(_colon);
	case 63: ++tokPos; return finishToken(_question);

	case 48:
	  var next = input.charCodeAt(tokPos + 1);
	  if (next === 120 || next === 88) return readHexNumber();
	case 49: case 50: case 51: case 52: case 53: case 54: case 55: case 56: case 57:
	  return readNumber(false);

	case 34: case 39:
	  return readString(code);

	case 47:
	  return readToken_slash(code);

	case 37: case 42:
	  return readToken_mult_modulo();

	case 124: case 38:
	  return readToken_pipe_amp(code);

	case 94:
	  return readToken_caret();

	case 43: case 45:
	  return readToken_plus_min(code);

	case 60: case 62:
	  return readToken_lt_gt(code);

	case 61: case 33:
	  return readToken_eq_excl(code);

	case 126:
	  return finishOp(_prefix, 1);
	}

	return false;
  }

  function readToken(forceRegexp) {
	if (!forceRegexp) tokStart = tokPos;
	else tokPos = tokStart + 1;
	if (options.locations) tokStartLoc = new line_loc_t;
	if (forceRegexp) return readRegexp();
	if (tokPos >= inputLen) return finishToken(_eof);

	var code = input.charCodeAt(tokPos);
	if (isIdentifierStart(code) || code === 92 ) return readWord();

	var tok = getTokenFromCode(code);

	if (tok === false) {
	  var ch = String.fromCharCode(code);
	  if (ch === "\\" || nonASCIIidentifierStart.test(ch)) return readWord();
	  raise(tokPos, "Unexpected character '" + ch + "'");
	}
	return tok;
  }

  function finishOp(type, size) {
	var str = input.slice(tokPos, tokPos + size);
	tokPos += size;
	finishToken(type, str);
  }

  function readRegexp() {
	var content = "", escaped, inClass, start = tokPos;
	for (;;) {
	  if (tokPos >= inputLen) raise(start, "Unterminated regular expression");
	  var ch = input.charAt(tokPos);
	  if (newline.test(ch)) raise(start, "Unterminated regular expression");
	  if (!escaped) {
		if (ch === "[") inClass = true;
		else if (ch === "]" && inClass) inClass = false;
		else if (ch === "/" && !inClass) break;
		escaped = ch === "\\";
	  } else escaped = false;
	  ++tokPos;
	}
	var content = input.slice(start, tokPos);
	++tokPos;
	var mods = readWord1();
	if (mods && !/^[gmsiy]*$/.test(mods)) raise(start, "Invalid regexp flag");
	try {
	  var value = new RegExp(content, mods);
	} catch (e) {
	  if (e instanceof SyntaxError) raise(start, e.message);
	  raise(e);
	}
	return finishToken(_regexp, value);
  }

  function readInt(radix, len) {
	var start = tokPos, total = 0;
	for (var i = 0, e = len == null ? Infinity : len; i < e; ++i) {
	  var code = input.charCodeAt(tokPos), val;
	  if (code >= 97) val = code - 97 + 10;
	  else if (code >= 65) val = code - 65 + 10;
	  else if (code >= 48 && code <= 57) val = code - 48;
	  else val = Infinity;
	  if (val >= radix) break;
	  ++tokPos;
	  total = total * radix + val;
	}
	if (tokPos === start || len != null && tokPos - start !== len) return null;

	return total;
  }

  function readHexNumber() {
	tokPos += 2;
	var val = readInt(16);
	if (val == null) raise(tokStart + 2, "Expected hexadecimal number");
	if (isIdentifierStart(input.charCodeAt(tokPos))) raise(tokPos, "Identifier directly after number");
	return finishToken(_num, val);
  }

  function readNumber(startsWithDot) {
	var start = tokPos, isFloat = false, octal = input.charCodeAt(tokPos) === 48;
	if (!startsWithDot && readInt(10) === null) raise(start, "Invalid number");
	if (input.charCodeAt(tokPos) === 46) {
	  ++tokPos;
	  readInt(10);
	  isFloat = true;
	}
	var next = input.charCodeAt(tokPos);
	if (next === 69 || next === 101) {
	  next = input.charCodeAt(++tokPos);
	  if (next === 43 || next === 45) ++tokPos;
	  if (readInt(10) === null) raise(start, "Invalid number");
	  isFloat = true;
	}
	if (isIdentifierStart(input.charCodeAt(tokPos))) raise(tokPos, "Identifier directly after number");

	var str = input.slice(start, tokPos), val;
	if (isFloat) val = parseFloat(str);
	else if (!octal || str.length === 1) val = parseInt(str, 10);
	else if (/[89]/.test(str) || strict) raise(start, "Invalid number");
	else val = parseInt(str, 8);
	return finishToken(_num, val);
  }

  function readString(quote) {
	tokPos++;
	var out = "";
	for (;;) {
	  if (tokPos >= inputLen) raise(tokStart, "Unterminated string constant");
	  var ch = input.charCodeAt(tokPos);
	  if (ch === quote) {
		++tokPos;
		return finishToken(_string, out);
	  }
	  if (ch === 92) {
		ch = input.charCodeAt(++tokPos);
		var octal = /^[0-7]+/.exec(input.slice(tokPos, tokPos + 3));
		if (octal) octal = octal[0];
		while (octal && parseInt(octal, 8) > 255) octal = octal.slice(0, -1);
		if (octal === "0") octal = null;
		++tokPos;
		if (octal) {
		  if (strict) raise(tokPos - 2, "Octal literal in strict mode");
		  out += String.fromCharCode(parseInt(octal, 8));
		  tokPos += octal.length - 1;
		} else {
		  switch (ch) {
		  case 110: out += "\n"; break;
		  case 114: out += "\r"; break;
		  case 120: out += String.fromCharCode(readHexChar(2)); break;
		  case 117: out += String.fromCharCode(readHexChar(4)); break;
		  case 85: out += String.fromCharCode(readHexChar(8)); break;
		  case 116: out += "\t"; break;
		  case 98: out += "\b"; break;
		  case 118: out += "\u000b"; break;
		  case 102: out += "\f"; break;
		  case 48: out += "\0"; break;
		  case 13: if (input.charCodeAt(tokPos) === 10) ++tokPos;
		  case 10:
			if (options.locations) { tokLineStart = tokPos; ++tokCurLine; }
			break;
		  default: out += String.fromCharCode(ch); break;
		  }
		}
	  } else {
		if (ch === 13 || ch === 10 || ch === 8232 || ch === 8233) raise(tokStart, "Unterminated string constant");
		out += String.fromCharCode(ch);
		++tokPos;
	  }
	}
  }

  function readHexChar(len) {
	var n = readInt(16, len);
	if (n === null) raise(tokStart, "Bad character escape sequence");
	return n;
  }

  var containsEsc;

  function readWord1() {
	containsEsc = false;
	var word, first = true, start = tokPos;
	for (;;) {
	  var ch = input.charCodeAt(tokPos);
	  if (isIdentifierChar(ch)) {
		if (containsEsc) word += input.charAt(tokPos);
		++tokPos;
	  } else if (ch === 92) {
		if (!containsEsc) word = input.slice(start, tokPos);
		containsEsc = true;
		if (input.charCodeAt(++tokPos) != 117)
		  raise(tokPos, "Expecting Unicode escape sequence \\uXXXX");
		++tokPos;
		var esc = readHexChar(4);
		var escStr = String.fromCharCode(esc);
		if (!escStr) raise(tokPos - 1, "Invalid Unicode escape");
		if (!(first ? isIdentifierStart(esc) : isIdentifierChar(esc)))
		  raise(tokPos - 4, "Invalid Unicode escape");
		word += escStr;
	  } else {
		break;
	  }
	  first = false;
	}
	return containsEsc ? word : input.slice(start, tokPos);
  }

  function readWord() {
	var word = readWord1();
	var type = _name;
	if (!containsEsc && isKeyword(word))
	  type = keywordTypes[word];
	return finishToken(type, word);
  }

  function next() {
	lastStart = tokStart;
	lastEnd = tokEnd;
	lastEndLoc = tokEndLoc;
	readToken();
  }

  function setStrict(strct) {
	strict = strct;
	tokPos = tokStart;
	if (options.locations) {
	  while (tokPos < tokLineStart) {
		tokLineStart = input.lastIndexOf("\n", tokLineStart - 2) + 1;
		--tokCurLine;
	  }
	}
	skipSpace();
	readToken();
  }

  function node_t() {
	this.type = null;
	this.start = tokStart;
	this.end = null;
  }

  function node_loc_t() {
	this.start = tokStartLoc;
	this.end = null;
	if (sourceFile !== null) this.source = sourceFile;
  }

  function startNode() {
	var node = new node_t();
	if (options.locations)
	  node.loc = new node_loc_t();
	if (options.directSourceFile)
	  node.sourceFile = options.directSourceFile;
	if (options.ranges)
	  node.range = [tokStart, 0];
	return node;
  }

  function startNodeFrom(other) {
	var node = new node_t();
	node.start = other.start;
	if (options.locations) {
	  node.loc = new node_loc_t();
	  node.loc.start = other.loc.start;
	}
	if (options.ranges)
	  node.range = [other.range[0], 0];

	return node;
  }

  function finishNode(node, type) {
	node.type = type;
	node.end = lastEnd;
	if (options.locations)
	  node.loc.end = lastEndLoc;
	if (options.ranges)
	  node.range[1] = lastEnd;
	return node;
  }

  function isUseStrict(stmt) {
	return options.ecmaVersion >= 5 && stmt.type === "ExpressionStatement" &&
	  stmt.expression.type === "Literal" && stmt.expression.value === "use strict";
  }

  function eat(type) {
	if (tokType === type) {
	  next();
	  return true;
	}
  }

  function canInsertSemicolon() {
	return !options.strictSemicolons &&
	  (tokType === _eof || tokType === _braceR || newline.test(input.slice(lastEnd, tokStart)));
  }

  function semicolon() {
	if (!eat(_semi) && !canInsertSemicolon()) unexpected();
  }

  function expect(type) {
	if (tokType === type) next();
	else unexpected();
  }

  function unexpected() {
	raise(tokStart, "Unexpected token");
  }

  function checkLVal(expr) {
	if (expr.type !== "Identifier" && expr.type !== "MemberExpression")
	  raise(expr.start, "Assigning to rvalue");
	if (strict && expr.type === "Identifier" && isStrictBadIdWord(expr.name))
	  raise(expr.start, "Assigning to " + expr.name + " in strict mode");
  }

  function parseTopLevel(program) {
	lastStart = lastEnd = tokPos;
	if (options.locations) lastEndLoc = new line_loc_t;
	inFunction = strict = null;
	labels = [];
	readToken();

	var node = program || startNode(), first = true;
	if (!program) node.body = [];
	while (tokType !== _eof) {
	  var stmt = parseStatement();
	  node.body.push(stmt);
	  if (first && isUseStrict(stmt)) setStrict(true);
	  first = false;
	}
	return finishNode(node, "Program");
  }

  var loopLabel = {kind: "loop"}, switchLabel = {kind: "switch"};

  function parseStatement() {
	if (tokType === _slash || tokType === _assign && tokVal == "/=")
	  readToken(true);

	var starttype = tokType, node = startNode();

	switch (starttype) {
	case _break: case _continue:
	  next();
	  var isBreak = starttype === _break;
	  if (eat(_semi) || canInsertSemicolon()) node.label = null;
	  else if (tokType !== _name) unexpected();
	  else {
		node.label = parseIdent();
		semicolon();
	  }

	  for (var i = 0; i < labels.length; ++i) {
		var lab = labels[i];
		if (node.label == null || lab.name === node.label.name) {
		  if (lab.kind != null && (isBreak || lab.kind === "loop")) break;
		  if (node.label && isBreak) break;
		}
	  }
	  if (i === labels.length) raise(node.start, "Unsyntactic " + starttype.keyword);
	  return finishNode(node, isBreak ? "BreakStatement" : "ContinueStatement");

	case _debugger:
	  next();
	  semicolon();
	  return finishNode(node, "DebuggerStatement");

	case _do:
	  next();
	  labels.push(loopLabel);
	  node.body = parseStatement();
	  labels.pop();
	  expect(_while);
	  node.test = parseParenExpression();
	  semicolon();
	  return finishNode(node, "DoWhileStatement");

	case _for:
	  next();
	  labels.push(loopLabel);
	  expect(_parenL);
	  if (tokType === _semi) return parseFor(node, null);
	  if (tokType === _var) {
		var init = startNode();
		next();
		parseVar(init, true);
		finishNode(init, "VariableDeclaration");
		if (init.declarations.length === 1 && eat(_in))
		  return parseForIn(node, init);
		return parseFor(node, init);
	  }
	  var init = parseExpression(false, true);
	  if (eat(_in)) {checkLVal(init); return parseForIn(node, init);}
	  return parseFor(node, init);

	case _function:
	  next();
	  return parseFunction(node, true);

	case _if:
	  next();
	  node.test = parseParenExpression();
	  node.consequent = parseStatement();
	  node.alternate = eat(_else) ? parseStatement() : null;
	  return finishNode(node, "IfStatement");

	case _return:
	  if (!inFunction && !options.allowReturnOutsideFunction)
		raise(tokStart, "'return' outside of function");
	  next();

	  if (eat(_semi) || canInsertSemicolon()) node.argument = null;
	  else { node.argument = parseExpression(); semicolon(); }
	  return finishNode(node, "ReturnStatement");

	case _switch:
	  next();
	  node.discriminant = parseParenExpression();
	  node.cases = [];
	  expect(_braceL);
	  labels.push(switchLabel);

	  for (var cur, sawDefault; tokType != _braceR;) {
		if (tokType === _case || tokType === _default) {
		  var isCase = tokType === _case;
		  if (cur) finishNode(cur, "SwitchCase");
		  node.cases.push(cur = startNode());
		  cur.consequent = [];
		  next();
		  if (isCase) cur.test = parseExpression();
		  else {
			if (sawDefault) raise(lastStart, "Multiple default clauses"); sawDefault = true;
			cur.test = null;
		  }
		  expect(_colon);
		} else {
		  if (!cur) unexpected();
		  cur.consequent.push(parseStatement());
		}
	  }
	  if (cur) finishNode(cur, "SwitchCase");
	  next();
	  labels.pop();
	  return finishNode(node, "SwitchStatement");

	case _throw:
	  next();
	  if (newline.test(input.slice(lastEnd, tokStart)))
		raise(lastEnd, "Illegal newline after throw");
	  node.argument = parseExpression();
	  semicolon();
	  return finishNode(node, "ThrowStatement");

	case _try:
	  next();
	  node.block = parseBlock();
	  node.handler = null;
	  if (tokType === _catch) {
		var clause = startNode();
		next();
		expect(_parenL);
		clause.param = parseIdent();
		if (strict && isStrictBadIdWord(clause.param.name))
		  raise(clause.param.start, "Binding " + clause.param.name + " in strict mode");
		expect(_parenR);
		clause.guard = null;
		clause.body = parseBlock();
		node.handler = finishNode(clause, "CatchClause");
	  }
	  node.guardedHandlers = empty;
	  node.finalizer = eat(_finally) ? parseBlock() : null;
	  if (!node.handler && !node.finalizer)
		raise(node.start, "Missing catch or finally clause");
	  return finishNode(node, "TryStatement");

	case _var:
	  next();
	  parseVar(node);
	  semicolon();
	  return finishNode(node, "VariableDeclaration");

	case _while:
	  next();
	  node.test = parseParenExpression();
	  labels.push(loopLabel);
	  node.body = parseStatement();
	  labels.pop();
	  return finishNode(node, "WhileStatement");

	case _with:
	  if (strict) raise(tokStart, "'with' in strict mode");
	  next();
	  node.object = parseParenExpression();
	  node.body = parseStatement();
	  return finishNode(node, "WithStatement");

	case _braceL:
	  return parseBlock();

	case _semi:
	  next();
	  return finishNode(node, "EmptyStatement");

	default:
	  var maybeName = tokVal, expr = parseExpression();
	  if (starttype === _name && expr.type === "Identifier" && eat(_colon)) {
		for (var i = 0; i < labels.length; ++i)
		  if (labels[i].name === maybeName) raise(expr.start, "Label '" + maybeName + "' is already declared");
		var kind = tokType.isLoop ? "loop" : tokType === _switch ? "switch" : null;
		labels.push({name: maybeName, kind: kind});
		node.body = parseStatement();
		labels.pop();
		node.label = expr;
		return finishNode(node, "LabeledStatement");
	  } else {
		node.expression = expr;
		semicolon();
		return finishNode(node, "ExpressionStatement");
	  }
	}
  }

  function parseParenExpression() {
	expect(_parenL);
	var val = parseExpression();
	expect(_parenR);
	return val;
  }

  function parseBlock(allowStrict) {
	var node = startNode(), first = true, strict = false, oldStrict;
	node.body = [];
	expect(_braceL);
	while (!eat(_braceR)) {
	  var stmt = parseStatement();
	  node.body.push(stmt);
	  if (first && allowStrict && isUseStrict(stmt)) {
		oldStrict = strict;
		setStrict(strict = true);
	  }
	  first = false;
	}
	if (strict && !oldStrict) setStrict(false);
	return finishNode(node, "BlockStatement");
  }

  function parseFor(node, init) {
	node.init = init;
	expect(_semi);
	node.test = tokType === _semi ? null : parseExpression();
	expect(_semi);
	node.update = tokType === _parenR ? null : parseExpression();
	expect(_parenR);
	node.body = parseStatement();
	labels.pop();
	return finishNode(node, "ForStatement");
  }

  function parseForIn(node, init) {
	node.left = init;
	node.right = parseExpression();
	expect(_parenR);
	node.body = parseStatement();
	labels.pop();
	return finishNode(node, "ForInStatement");
  }

  function parseVar(node, noIn) {
	node.declarations = [];
	node.kind = "var";
	for (;;) {
	  var decl = startNode();
	  decl.id = parseIdent();
	  if (strict && isStrictBadIdWord(decl.id.name))
		raise(decl.id.start, "Binding " + decl.id.name + " in strict mode");
	  decl.init = eat(_eq) ? parseExpression(true, noIn) : null;
	  node.declarations.push(finishNode(decl, "VariableDeclarator"));
	  if (!eat(_comma)) break;
	}
	return node;
  }

  function parseExpression(noComma, noIn) {
	var expr = parseMaybeAssign(noIn);
	if (!noComma && tokType === _comma) {
	  var node = startNodeFrom(expr);
	  node.expressions = [expr];
	  while (eat(_comma)) node.expressions.push(parseMaybeAssign(noIn));
	  return finishNode(node, "SequenceExpression");
	}
	return expr;
  }

  function parseMaybeAssign(noIn) {
	var left = parseMaybeConditional(noIn);
	if (tokType.isAssign) {
	  var node = startNodeFrom(left);
	  node.operator = tokVal;
	  node.left = left;
	  next();
	  node.right = parseMaybeAssign(noIn);
	  checkLVal(left);
	  return finishNode(node, "AssignmentExpression");
	}
	return left;
  }

  function parseMaybeConditional(noIn) {
	var expr = parseExprOps(noIn);
	if (eat(_question)) {
	  var node = startNodeFrom(expr);
	  node.test = expr;
	  node.consequent = parseExpression(true);
	  expect(_colon);
	  node.alternate = parseExpression(true, noIn);
	  return finishNode(node, "ConditionalExpression");
	}
	return expr;
  }

  function parseExprOps(noIn) {
	return parseExprOp(parseMaybeUnary(), -1, noIn);
  }

  function parseExprOp(left, minPrec, noIn) {
	var prec = tokType.binop;
	if (prec != null && (!noIn || tokType !== _in)) {
	  if (prec > minPrec) {
		var node = startNodeFrom(left);
		node.left = left;
		node.operator = tokVal;
		var op = tokType;
		next();
		node.right = parseExprOp(parseMaybeUnary(), prec, noIn);
		var exprNode = finishNode(node, (op === _logicalOR || op === _logicalAND) ? "LogicalExpression" : "BinaryExpression");
		return parseExprOp(exprNode, minPrec, noIn);
	  }
	}
	return left;
  }

  function parseMaybeUnary() {
	if (tokType.prefix) {
	  var node = startNode(), update = tokType.isUpdate;
	  node.operator = tokVal;
	  node.prefix = true;
	  tokRegexpAllowed = true;
	  next();
	  node.argument = parseMaybeUnary();
	  if (update) checkLVal(node.argument);
	  else if (strict && node.operator === "delete" &&
			   node.argument.type === "Identifier")
		raise(node.start, "Deleting local variable in strict mode");
	  return finishNode(node, update ? "UpdateExpression" : "UnaryExpression");
	}
	var expr = parseExprSubscripts();
	while (tokType.postfix && !canInsertSemicolon()) {
	  var node = startNodeFrom(expr);
	  node.operator = tokVal;
	  node.prefix = false;
	  node.argument = expr;
	  checkLVal(expr);
	  next();
	  expr = finishNode(node, "UpdateExpression");
	}
	return expr;
  }

  function parseExprSubscripts() {
	return parseSubscripts(parseExprAtom());
  }

  function parseSubscripts(base, noCalls) {
	if (eat(_dot)) {
	  var node = startNodeFrom(base);
	  node.object = base;
	  node.property = parseIdent(true);
	  node.computed = false;
	  return parseSubscripts(finishNode(node, "MemberExpression"), noCalls);
	} else if (eat(_bracketL)) {
	  var node = startNodeFrom(base);
	  node.object = base;
	  node.property = parseExpression();
	  node.computed = true;
	  expect(_bracketR);
	  return parseSubscripts(finishNode(node, "MemberExpression"), noCalls);
	} else if (!noCalls && eat(_parenL)) {
	  var node = startNodeFrom(base);
	  node.callee = base;
	  node.arguments = parseExprList(_parenR, false);
	  return parseSubscripts(finishNode(node, "CallExpression"), noCalls);
	} else return base;
  }

  function parseExprAtom() {
	switch (tokType) {
	case _this:
	  var node = startNode();
	  next();
	  return finishNode(node, "ThisExpression");
	case _name:
	  return parseIdent();
	case _num: case _string: case _regexp:
	  var node = startNode();
	  node.value = tokVal;
	  node.raw = input.slice(tokStart, tokEnd);
	  next();
	  return finishNode(node, "Literal");

	case _null: case _true: case _false:
	  var node = startNode();
	  node.value = tokType.atomValue;
	  node.raw = tokType.keyword;
	  next();
	  return finishNode(node, "Literal");

	case _parenL:
	  var tokStartLoc1 = tokStartLoc, tokStart1 = tokStart;
	  next();
	  var val = parseExpression();
	  val.start = tokStart1;
	  val.end = tokEnd;
	  if (options.locations) {
		val.loc.start = tokStartLoc1;
		val.loc.end = tokEndLoc;
	  }
	  if (options.ranges)
		val.range = [tokStart1, tokEnd];
	  expect(_parenR);
	  return val;

	case _bracketL:
	  var node = startNode();
	  next();
	  node.elements = parseExprList(_bracketR, true, true);
	  return finishNode(node, "ArrayExpression");

	case _braceL:
	  return parseObj();

	case _function:
	  var node = startNode();
	  next();
	  return parseFunction(node, false);

	case _new:
	  return parseNew();

	default:
	  unexpected();
	}
  }

  function parseNew() {
	var node = startNode();
	next();
	node.callee = parseSubscripts(parseExprAtom(), true);
	if (eat(_parenL)) node.arguments = parseExprList(_parenR, false);
	else node.arguments = empty;
	return finishNode(node, "NewExpression");
  }

  function parseObj() {
	var node = startNode(), first = true, sawGetSet = false;
	node.properties = [];
	next();
	while (!eat(_braceR)) {
	  if (!first) {
		expect(_comma);
		if (options.allowTrailingCommas && eat(_braceR)) break;
	  } else first = false;

	  var prop = {key: parsePropertyName()}, isGetSet = false, kind;
	  if (eat(_colon)) {
		prop.value = parseExpression(true);
		kind = prop.kind = "init";
	  } else if (options.ecmaVersion >= 5 && prop.key.type === "Identifier" &&
				 (prop.key.name === "get" || prop.key.name === "set")) {
		isGetSet = sawGetSet = true;
		kind = prop.kind = prop.key.name;
		prop.key = parsePropertyName();
		if (tokType !== _parenL) unexpected();
		prop.value = parseFunction(startNode(), false);
	  } else unexpected();

	  if (prop.key.type === "Identifier" && (strict || sawGetSet)) {
		for (var i = 0; i < node.properties.length; ++i) {
		  var other = node.properties[i];
		  if (other.key.name === prop.key.name) {
			var conflict = kind == other.kind || isGetSet && other.kind === "init" ||
			  kind === "init" && (other.kind === "get" || other.kind === "set");
			if (conflict && !strict && kind === "init" && other.kind === "init") conflict = false;
			if (conflict) raise(prop.key.start, "Redefinition of property");
		  }
		}
	  }
	  node.properties.push(prop);
	}
	return finishNode(node, "ObjectExpression");
  }

  function parsePropertyName() {
	if (tokType === _num || tokType === _string) return parseExprAtom();
	return parseIdent(true);
  }

  function parseFunction(node, isStatement) {
	if (tokType === _name) node.id = parseIdent();
	else if (isStatement) unexpected();
	else node.id = null;
	node.params = [];
	var first = true;
	expect(_parenL);
	while (!eat(_parenR)) {
	  if (!first) expect(_comma); else first = false;
	  node.params.push(parseIdent());
	}

	var oldInFunc = inFunction, oldLabels = labels;
	inFunction = true; labels = [];
	node.body = parseBlock(true);
	inFunction = oldInFunc; labels = oldLabels;

	if (strict || node.body.body.length && isUseStrict(node.body.body[0])) {
	  for (var i = node.id ? -1 : 0; i < node.params.length; ++i) {
		var id = i < 0 ? node.id : node.params[i];
		if (isStrictReservedWord(id.name) || isStrictBadIdWord(id.name))
		  raise(id.start, "Defining '" + id.name + "' in strict mode");
		if (i >= 0) for (var j = 0; j < i; ++j) if (id.name === node.params[j].name)
		  raise(id.start, "Argument name clash in strict mode");
	  }
	}

	return finishNode(node, isStatement ? "FunctionDeclaration" : "FunctionExpression");
  }

  function parseExprList(close, allowTrailingComma, allowEmpty) {
	var elts = [], first = true;
	while (!eat(close)) {
	  if (!first) {
		expect(_comma);
		if (allowTrailingComma && options.allowTrailingCommas && eat(close)) break;
	  } else first = false;

	  if (allowEmpty && tokType === _comma) elts.push(null);
	  else elts.push(parseExpression(true));
	}
	return elts;
  }

  function parseIdent(liberal) {
	var node = startNode();
	if (liberal && options.forbidReserved == "everywhere") liberal = false;
	if (tokType === _name) {
	  if (!liberal &&
		  (options.forbidReserved &&
		   (options.ecmaVersion === 3 ? isReservedWord3 : isReservedWord5)(tokVal) ||
		   strict && isStrictReservedWord(tokVal)) &&
		  input.slice(tokStart, tokEnd).indexOf("\\") == -1)
		raise(tokStart, "The keyword '" + tokVal + "' is reserved");
	  node.name = tokVal;
	} else if (liberal && tokType.keyword) {
	  node.name = tokType.keyword;
	} else {
	  unexpected();
	}
	tokRegexpAllowed = false;
	next();
	return finishNode(node, "Identifier");
  }

});

		if (!acorn.version)
			acorn = null;
	}

	function parse(code, options) {
		var parser = self.acorn || acorn;
		if (parseInt(parser.version, 10) >= 8)
			options = Base.set({ ecmaVersion: 'latest' }, options);
		return parser.parse(code, options);
	}

	var binaryOperators = {
		'+': '__add',
		'-': '__subtract',
		'*': '__multiply',
		'/': '__divide',
		'%': '__modulo',
		'==': '__equals',
		'!=': '__equals'
	};

	var unaryOperators = {
		'-': '__negate',
		'+': '__self'
	};

	var fields = Base.each(
		['add', 'subtract', 'multiply', 'divide', 'modulo', 'equals', 'negate'],
		function(name) {
			this['__' + name] = '#' + name;
		},
		{
			__self: function() {
				return this;
			}
		}
	);
	Point.inject(fields);
	Size.inject(fields);
	Color.inject(fields);

	function __$__(left, operator, right) {
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

	function __$assign__(object, key, operator, value) {
		return object[key] = __$__(object[key], operator, value);
	}

	function $__(operator, value) {
		var handler = unaryOperators[operator];
		if (value && value[handler])
			return value[handler]();
		switch (operator) {
		case '+': return +value;
		case '-': return -value;
		}
	}

	function compile(code, options) {
		if (!code)
			return '';
		options = options || {};

		var insertions = [];

		function getOffset(offset) {
			var current = offset;
			for (var i = 0, l = insertions.length; i < l; i++) {
				var insertion = insertions[i];
				if (insertion[1] <= offset)
					current += insertion[2];
			}
			return current;
		}

		function getCode(node) {
			return code.substring(getOffset(node.range[0]),
					getOffset(node.range[1]));
		}

		function getBetween(left, right) {
			return code.substring(getOffset(left.range[1]),
					getOffset(right.range[0]));
		}

		function replaceCode(node, str) {
			var range = node.range,
				start = getOffset(range[0]),
				end = getOffset(range[1]);
			insertions = insertions.filter(function(insertion) {
				return insertion[0] < range[0] || insertion[1] > range[1];
			});
			insertions.push([range[0], range[1],
					str.length - range[1] + range[0]]);
			code = code.substring(0, start) + str + code.substring(end);
		}

		function handleOverloading(node, parent) {
			switch (node.type) {
			case 'UnaryExpression':
				if (node.operator in unaryOperators
						&& node.argument.type !== 'Literal') {
					var arg = getCode(node.argument);
					replaceCode(node, '$__("' + node.operator + '", '
							+ arg + ')');
				}
				break;
			case 'BinaryExpression':
				if (node.operator in binaryOperators
						&& node.left.type !== 'Literal') {
					var left = getCode(node.left),
						right = getCode(node.right),
						between = getBetween(node.left, node.right),
						operator = node.operator;
					replaceCode(node, '__$__(' + left + ','
							+ between.replace(new RegExp('\\' + operator),
								'"' + operator + '"')
							+ ', ' + right + ')');
				}
				break;
			case 'UpdateExpression':
			case 'AssignmentExpression':
				var parentType = parent && parent.type;
				if (!(
						parentType === 'ForStatement'
						|| parentType === 'BinaryExpression'
							&& /^[=!<>]/.test(parent.operator)
						|| parentType === 'MemberExpression' && parent.computed
				)) {
					if (node.type === 'UpdateExpression') {
						var arg = getCode(node.argument),
							exp = '__$__(' + arg + ', "' + node.operator[0]
									+ '", 1)',
							str = arg + ' = ' + exp;
						if (node.prefix) {
							str = '(' + str + ')';
						} else if (
							parentType === 'AssignmentExpression' ||
							parentType === 'VariableDeclarator' ||
							parentType === 'BinaryExpression'
						) {
							if (getCode(parent.left || parent.id) === arg)
								str = exp;
							str = arg + '; ' + str;
						}
						replaceCode(node, str);
					} else {
						if (/^.=$/.test(node.operator)
								&& node.left.type !== 'Literal') {
							var target = node.left,
								left = getCode(target),
								right = getCode(node.right),
								operator = node.operator[0],
								member = target.type === 'MemberExpression'
									&& target.object.type !== 'Super'
									&& target.property.type
										!== 'PrivateIdentifier',
								exp = member
									? '__$assign__(' + getCode(target.object)
										+ ', ' + (target.computed
											? getCode(target.property)
											: JSON.stringify(
												target.property.name))
										+ ', "' + operator + '", ' + right + ')'
									: left + ' = __$__(' + left + ', "'
										+ operator + '", ' + right + ')';
							replaceCode(node, /^\(.*\)$/.test(getCode(node))
									? '(' + exp + ')' : exp);
						}
					}
				}
				break;
			}
		}

		function collectNames(node, names) {
			switch (node.type) {
			case 'Identifier':
				names.push(node.name);
				break;
			case 'ObjectPattern':
				node.properties.forEach(function(property) {
					collectNames(property.value || property.argument, names);
				});
				break;
			case 'ArrayPattern':
				node.elements.forEach(function(element) {
					if (element)
						collectNames(element, names);
				});
				break;
			case 'AssignmentPattern':
				collectNames(node.left, names);
				break;
			case 'RestElement':
				collectNames(node.argument, names);
				break;
			}
		}

		var moduleCount = 0,
			isModule = false;

		function getImport(source, as) {
			return '__$import__(' + JSON.stringify(source.value)
					+ (as ? ', "' + as + '"' : '') + ')';
		}

		function handleModules(node) {
			switch (node.type) {
			case 'ImportExpression':
				replaceCode(node, 'Promise.resolve().then(function() { '
						+ 'return __$import__(' + getCode(node.source)
						+ ', "dynamic"); })');
				break;
			case 'ImportDeclaration':
				var module = getImport(node.source),
					named = [];
				var vars = node.specifiers.map(function(specifier) {
					var local = specifier.local.name;
					if (specifier.type === 'ImportSpecifier') {
						named.push(local + ' = ' + '__$module' + moduleCount
								+ '__.' + specifier.imported.name);
						return null;
					}
					return local + ' = ' + getImport(node.source,
							specifier.type === 'ImportDefaultSpecifier'
								? 'default' : 'namespace');
				}).filter(Boolean);
				if (named.length) {
					vars.push('__$module' + moduleCount + '__ = ' + module);
					Base.push(vars, named);
					moduleCount++;
				}
				replaceCode(node, vars.length
						? 'var ' + vars.join(', ') + ';'
						: module + ';');
				break;
			case 'ExportAllDeclaration':
				isModule = true;
				replaceCode(node, node.exported
						? 'module.exports.' + node.exported.name + ' = '
							+ getImport(node.source, 'namespace') + ';'
						: '(function(m) { for (var k in m) if (k !== '
							+ '"default") module.exports[k] = m[k]; })('
							+ getImport(node.source) + ');');
				break;
			case 'ExportDefaultDeclaration':
				isModule = true;
				replaceCode({
					range: [node.start, node.declaration.start]
				}, 'module.exports.default = ');
				break;
			case 'ExportNamedDeclaration':
				isModule = true;
				var declaration = node.declaration;
				var specifiers = node.specifiers;
				if (declaration) {
					var names = [];
					if (declaration.declarations) {
						declaration.declarations.forEach(function(dec) {
							collectNames(dec.id, names);
						});
					} else {
						names.push(declaration.id.name);
					}
					var code = getCode(declaration);
					if (declaration.declarations && !/;\s*$/.test(code))
						code += ';';
					replaceCode(node, code + names.map(
						function(name) {
							return ' module.exports.' + name + ' = ' + name
									+ ';';
						}).join(''));
				} else if (specifiers) {
					var source = node.source && getImport(node.source) + '.';
					var exports = specifiers.map(function(specifier) {
						var local = specifier.local.name,
							exported = specifier.exported.name;
						return 'module.exports.' + exported + ' = '
								+ (source || '') + local + '; ';
					}).join('');
					if (exports) {
						replaceCode(node, exports);
					}
				}
				break;
			}
		}

		var functions = 0,
			isAsync = false;

		function walkAST(node, parent, paperFeatures) {
			if (node) {
				var isFunction = /Function/.test(node.type);
				if (isFunction)
					functions++;
				for (var key in node) {
					if (key !== 'range' && key !== 'loc') {
						var value = node[key];
						if (Array.isArray(value)) {
							for (var i = 0, l = value.length; i < l; i++) {
								walkAST(value[i], node, paperFeatures);
							}
						} else if (value && typeof value === 'object') {
							walkAST(value, node, paperFeatures);
						}
					}
				}
				if (isFunction)
					functions--;
				if (!functions && (node.type === 'AwaitExpression'
						|| node.type === 'ForOfStatement' && node.await)) {
					isAsync = true;
				}
				if (paperFeatures.operatorOverloading !== false) {
					handleOverloading(node, parent);
				}
				if (paperFeatures.moduleExports !== false) {
					handleModules(node);
				}
			}
		}

		function encodeVLQ(value) {
			var res = '',
				base64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
			value = (Math.abs(value) << 1) + (value < 0 ? 1 : 0);
			while (value || !res) {
				var next = value & (32 - 1);
				value >>= 5;
				if (value)
					next |= 32;
				res += base64[next];
			}
			return res;
		}

		var url = options.url || '',
			sourceMaps = options.sourceMaps,
			paperFeatures = options.paperFeatures || {},
			source = options.source || code,
			offset = options.offset || 0,
			agent = paper.agent,
			version = agent.versionNumber,
			offsetCode = false,
			lineBreaks = /\r\n|\n|\r/mg,
			map;
		if (sourceMaps && (agent.chrome && version >= 30
				|| agent.webkit && version >= 537.76
				|| agent.firefox && version >= 23
				|| agent.node)) {
			if (agent.node) {
				offset -= 2;
			} else if (window && url && !window.location.href.indexOf(url)) {
				var html = document.getElementsByTagName('html')[0].innerHTML,
					index = html.indexOf(code);
				if (index >= 0) {
					offset = html.substr(0, index + 1).match(
							lineBreaks).length + 1;
				}
			}
			offsetCode = offset > 0 && !(
					agent.chrome && version >= 36 ||
					agent.safari && version >= 600 ||
					agent.firefox && version >= 40 ||
					agent.node);
			var mappings = ['AA' + encodeVLQ(offsetCode ? 0 : offset) + 'A'];
			mappings.length = (code.match(lineBreaks) || []).length + 1
					+ (offsetCode ? offset : 0);
			map = {
				version: 3,
				file: url,
				names:[],
				mappings: mappings.join(';AACA'),
				sourceRoot: '',
				sources: [url],
				sourcesContent: [source]
			};
		}
		if (
			paperFeatures.operatorOverloading !== false ||
			paperFeatures.moduleExports !== false
		) {
			walkAST(parse(code, {
				ranges: true,
				preserveParens: true,
				sourceType: 'module'
			}), null, paperFeatures);
			if (isModule) {
				code += '\nObject.defineProperty(module.exports, '
						+ '"__esModule", { value: true });';
			}
		}
		if (map) {
			if (offsetCode) {
				code = new Array(offset + 1).join('\n') + code;
			}
			if (/^(inline|both)$/.test(sourceMaps)) {
				code += "\n//# " + "sourceMappingURL="
						+ "data:application/json;base64,"
						+ self.btoa(unescape(encodeURIComponent(
							JSON.stringify(map))));
			}
			code += "\n//# sourceURL=" + (url || 'paperscript');
		}
		return {
			url: url,
			source: source,
			code: code,
			map: map,
			async: isAsync
		};
	}

	function execute(code, scope, options) {
		paper = scope;
		var view = scope.getView(),
			tool = new RegExp('\\btool\\.\\w+|\\s+(?:'
					+ Tool.prototype._events.join('|') + ')\\b').test(code)
					&& !/\bnew\s+Tool\b/.test(code)
						? new Tool() : null,
			toolHandlers = tool ? tool._events : [],
			handlers = ['onFrame', 'onResize'].concat(toolHandlers,
					options && options.handlers || []),
			params = [],
			args = [],
			func,
			compiled = typeof code === 'object' ? code : compile(code, options);
		code = compiled.code;
		function expose(scope, hidden) {
			for (var key in scope) {
				if ((hidden || !/^_/.test(key)
						&& (!(key in self) || scope.hasOwnProperty(key)))
						&& new RegExp('([\\b\\s\\W]|^)'
						+ key.replace(/\$/g, '\\$') + '\\b').test(code)) {
					params.push(key);
					args.push(scope[key]);
				}
			}
		}
		var load = options && options.load,
			url = options && options.url;
		function __$import__(specifier, as) {
			if (!load) {
				throw new Error('Unable to import \'' + specifier + '\': no '
						+ 'loader was passed to PaperScript.execute().');
			}
			var exports = load(specifier, url);
			return as === 'dynamic'
					? Promise.resolve(exports).then(function(exports) {
						return getImported(exports, 'namespace');
					})
					: getImported(exports, as);
		}

		function getImported(exports, as) {
			var isModule = exports && exports.__esModule;
			return as === 'default'
					? isModule ? exports.default : exports
					: as === 'namespace' && !isModule
						? Base.set({ default: exports }, exports)
						: exports;
		}
		expose({ __$__: __$__, $__: $__, __$assign__: __$assign__,
				__$import__: __$import__,
				paper: scope, tool: tool }, true);
		expose(scope);
		code = 'var module = { exports: {} }; ' + code;
		var exports = Base.each(handlers, function(key) {
			if (new RegExp('\\s+' + key + '\\b').test(code)) {
				params.push(key);
				this.push('module.exports.' + key + ' = ' + key + ';');
			}
		}, []).join('\n');
		if (exports) {
			code += '\n' + exports;
		}
		code += '\nreturn module.exports;';
		var signature = (compiled.async ? 'async ' : '') + 'function('
				+ params + ') {',
			agent = paper.agent;
		if (document && (agent.chrome
				|| agent.firefox && agent.versionNumber < 40)) {
			var script = document.createElement('script'),
				head = document.head || document.getElementsByTagName('head')[0];
			if (agent.firefox)
				code = '\n' + code;
			script.appendChild(document.createTextNode(
				'document.__paperscript__ = ' + signature + code + '\n}'
			));
			head.appendChild(script);
			func = document.__paperscript__;
			delete document.__paperscript__;
			head.removeChild(script);
		} else {
			func = Function('return ' + signature + code + '\n}')();
		}

		function install(exports) {
			var obj = exports || {};
			Base.each(toolHandlers, function(key) {
				var value = obj[key];
				if (value)
					tool[key] = value;
			});
			if (view) {
				if (obj.onResize)
					view.setOnResize(obj.onResize);
				view.emit('resize', {
					size: view.size,
					delta: new Point()
				});
				if (obj.onFrame)
					view.setOnFrame(obj.onFrame);
				view.requestUpdate();
			}
			return exports;
		}

		var exports = func && func.apply(scope, args);
		return compiled.async ? exports.then(install) : install(exports);
	}

	function loadScript(script) {
		if (/^text\/(?:x-|)paperscript$/.test(script.type)
				&& PaperScope.getAttribute(script, 'ignore') !== 'true') {
			var canvasId = PaperScope.getAttribute(script, 'canvas'),
				canvas = document.getElementById(canvasId),
				src = script.src || script.getAttribute('data-src'),
				async = PaperScope.hasAttribute(script, 'async'),
				scopeAttribute = 'data-paper-scope';
			if (!canvas)
				throw new Error('Unable to find canvas with id "'
						+ canvasId + '"');
			var scope = PaperScope.get(canvas.getAttribute(scopeAttribute))
						|| new PaperScope().setup(canvas);
			canvas.setAttribute(scopeAttribute, scope._id);
			if (src) {
				Http.request({
					url: src,
					async: async,
					mimeType: 'text/plain',
					onLoad: function(code) {
						execute(code, scope, {
							url: src,
							sourceMaps: 'inline'
						});
					}
				});
			} else {
				execute(script.innerHTML, scope, {
					url: script.baseURI,
					sourceMaps: 'inline'
				});
			}
			script.setAttribute('data-paper-ignore', 'true');
			return scope;
		}
	}

	function loadAll() {
		Base.each(document && document.getElementsByTagName('script'),
				loadScript);
	}

	function load(script) {
		return script ? loadScript(script) : loadAll();
	}

	if (window) {
		if (document.readyState === 'complete') {
			setTimeout(loadAll);
		} else {
			DomEvent.add(window, { load: loadAll });
		}
	}

	return {
		compile: compile,
		execute: execute,
		load: load,
		parse: parse,
		calculateBinary: __$__,
		calculateUnary: $__
	};
}();

var paper = new (PaperScope.inject(Base.exports, {
	Base: Base,
	Numerical: Numerical,
	ChangeFlag: ChangeFlag,
	Key: Key,
	DomEvent: DomEvent,
	DomElement: DomElement,
	document: document,
	window: window,
	PlacedSymbol: SymbolItem,
	Symbol: SymbolDefinition
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
}(typeof self === 'object' ? self : null);
