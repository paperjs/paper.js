/*!
* Paper.js v0.17.0-develop - The Swiss Army Knife of Vector Graphics Scripting.
* http://paperjs.org/
*
* Copyright (c) 2011 - 2020, Jürg Lehni & Jonathan Puckey
* http://juerglehni.com/ & https://puckey.studio/
*
* Distributed under the MIT license. See LICENSE file for details.
*
* All rights reserved.
*
* Date: Wed Nov 4 01:13:21 2026 +0100
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
var paper = (function(self, undefined) {
	"use strict";
	self = self || require("./node/self.js");
	let window = self.window;
	const document = self.document;
	if (window && !document.createElement("canvas").getContext("2d")) window = null;
	var Base = new function() {
		var hidden = /^(statics|enumerable|beans|preserve)$/, array = [], slice = array.slice, create = Object.create, describe = Object.getOwnPropertyDescriptor, define = Object.defineProperty, forEach = array.forEach || function(iter, bind) {
			for (var i = 0, l = this.length; i < l; i++) {
				iter.call(bind, this[i], i, this);
			}
		}, forIn = function(iter, bind) {
			for (var i in this) {
				if (this.hasOwnProperty(i)) iter.call(bind, this[i], i, this);
			}
		}, set = Object.assign || function(dst) {
			for (var i = 1, l = arguments.length; i < l; i++) {
				var src = arguments[i];
				for (var key in src) {
					if (src.hasOwnProperty(key)) dst[key] = src[key];
				}
			}
			return dst;
		}, each = function(obj, iter, bind) {
			if (obj) {
				var desc = describe(obj, "length");
				(desc && typeof desc.value === "number" ? forEach : forIn).call(obj, iter, bind = bind || obj);
			}
			return bind;
		};
		function inject(dest, src, enumerable, beans, preserve) {
			var beansNames = {};
			function field(name, val) {
				val = val || (val = describe(src, name)) && (val.get ? val : val.value);
				if (typeof val === "string" && val[0] === "#") val = dest[val.substring(1)] || val;
				var isFunc = typeof val === "function", res = val, prev = preserve || isFunc && !val.base ? val && val.get ? name in dest : dest[name] : null, bean;
				if (!preserve || !prev) {
					if (isFunc && prev) val.base = prev;
					if (isFunc && beans !== false && (bean = name.match(/^([gs]et|is)(([A-Z])(.*))$/))) beansNames[bean[3].toLowerCase() + bean[4]] = bean[2];
					if (!res || isFunc || !res.get || typeof res.get !== "function" || !Base.isPlainObject(res)) {
						res = {
							value: res,
							writable: true
						};
					}
					if ((describe(dest, name) || { configurable: true }).configurable) {
						res.configurable = true;
						res.enumerable = enumerable != null ? enumerable : !bean;
					}
					define(dest, name, res);
				}
			}
			if (src) {
				for (var name in src) {
					if (src.hasOwnProperty(name) && !hidden.test(name)) field(name);
				}
				for (var name in beansNames) {
					var part = beansNames[name], set = dest["set" + part], get = dest["get" + part] || set && dest["is" + part];
					if (get && (beans === true || get.length === 0)) field(name, {
						get,
						set
					});
				}
			}
			return dest;
		}
		function Base() {
			for (var i = 0, l = arguments.length; i < l; i++) {
				var src = arguments[i];
				if (src) set(this, src);
			}
			return this;
		}
		return inject(Base, {
			inject: function(src) {
				if (src) {
					var statics = src.statics === true ? src : src.statics, beans = src.beans, preserve = src.preserve;
					if (statics !== src) inject(this.prototype, src, src.enumerable, beans, preserve);
					inject(this, statics, null, beans, preserve);
				}
				for (var i = 1, l = arguments.length; i < l; i++) this.inject(arguments[i]);
				return this;
			},
			extend: function() {
				var base = this, ctor, proto;
				for (var i = 0, obj, l = arguments.length; i < l && !(ctor && proto); i++) {
					obj = arguments[i];
					ctor = ctor || obj.initialize;
					proto = proto || obj.prototype;
				}
				ctor = ctor || function() {
					base.apply(this, arguments);
				};
				proto = ctor.prototype = proto || create(this.prototype);
				define(proto, "constructor", {
					value: ctor,
					writable: true,
					configurable: true
				});
				inject(ctor, this);
				if (arguments.length) this.inject.apply(ctor, arguments);
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
				set,
				each,
				create,
				define,
				describe,
				clone: function(obj) {
					return set(new obj.constructor(), obj);
				},
				isPlainObject: function(obj) {
					var ctor = obj != null && obj.constructor;
					return ctor && (ctor === Object || ctor === Base || ctor.name === "Object");
				},
				pick: function(a, b) {
					return a !== undefined ? a : b;
				},
				slice: function(list, begin, end) {
					return slice.call(list, begin, end);
				}
			}
		});
	}();
	if (typeof module !== "undefined") module.exports = Base;
	Base.inject({
		enumerable: false,
		toString: function() {
			return this._id != null ? (this._class || "Object") + (this._name ? " '" + this._name + "'" : " @" + this._id) : "{ " + Base.each(this, function(value, key) {
				if (!/^_/.test(key)) {
					const type = typeof value;
					this.push(key + ": " + (type === "number" ? Formatter.instance.number(value) : type === "string" ? "'" + value + "'" : value));
				}
			}, []).join(", ") + " }";
		},
		getClassName: function() {
			return this._class || "";
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
			if (props) Base.filter(this, props, exclude, this._prioritize);
			return this;
		}
	}, {
		beans: false,
		statics: {
			exports: {},
			extend: function extend() {
				const res = extend.base.apply(this, arguments);
				const name = res.prototype._class;
				if (name && !Base.exports[name]) Base.exports[name] = res;
				return res;
			},
			equals: function(obj1, obj2) {
				let length;
				if (obj1 === obj2) return true;
				if (obj1 && obj1.equals) return obj1.equals(obj2);
				if (obj2 && obj2.equals) return obj2.equals(obj1);
				if (obj1 && obj2 && typeof obj1 === "object" && typeof obj2 === "object") {
					if (Array.isArray(obj1) && Array.isArray(obj2)) {
						length = obj1.length;
						if (length !== obj2.length) return false;
						while (length--) {
							if (!Base.equals(obj1[length], obj2[length])) return false;
						}
					} else {
						const keys = Object.keys(obj1);
						length = keys.length;
						if (length !== Object.keys(obj2).length) return false;
						while (length--) {
							const key = keys[length];
							if (!(obj2.hasOwnProperty(key) && Base.equals(obj1[key], obj2[key]))) return false;
						}
					}
					return true;
				}
				return false;
			},
			read: function(list, start, options, amount) {
				if (this === Base) {
					const value = this.peek(list, start);
					list.__index++;
					return value;
				}
				const proto = this.prototype;
				const readIndex = proto._readIndex;
				const begin = start || readIndex && list.__index || 0;
				const length = list.length;
				let obj = list[begin];
				amount = amount || length - begin;
				if (obj instanceof this || options && options.readNull && obj == null && amount <= 1) {
					if (readIndex) list.__index = begin + 1;
					return obj && options && options.clone ? obj.clone() : obj;
				}
				obj = Base.create(proto);
				if (readIndex) obj.__read = true;
				obj = obj.initialize.apply(obj, begin > 0 || begin + amount < length ? Base.slice(list, begin, begin + amount) : list) || obj;
				if (readIndex) {
					list.__index = begin + obj.__read;
					const filtered = obj.__filtered;
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
				const res = [];
				let entry;
				const begin = start || 0;
				const end = amount ? begin + amount : list.length;
				for (let i = begin; i < end; i++) {
					res.push(Array.isArray(entry = list[i]) ? this.read(entry, 0, options) : this.read(list, i, options, 1));
				}
				return res;
			},
			readNamed: function(list, name, start, options, amount) {
				const value = this.getNamed(list, name);
				const hasValue = value !== undefined;
				if (hasValue) {
					let filtered = list.__filtered;
					if (!filtered) {
						const source = this.getSource(list);
						filtered = list.__filtered = Base.create(source);
						filtered.__unfiltered = source;
					}
					filtered[name] = undefined;
				}
				return this.read(hasValue ? [value] : list, start, options, amount);
			},
			readSupported: function(list, dest) {
				const source = this.getSource(list);
				const that = this;
				let read = false;
				if (source) {
					Object.keys(source).forEach(function(key) {
						if (key in dest) {
							const value = that.readNamed(list, key);
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
				let source = list.__source;
				if (source === undefined) {
					const arg = list.length === 1 && list[0];
					source = list.__source = arg && Base.isPlainObject(arg) ? arg : null;
				}
				return source;
			},
			getNamed: function(list, name) {
				const source = this.getSource(list);
				if (source) {
					return name ? source[name] : list.__filtered || source;
				}
			},
			hasNamed: function(list, name) {
				return !!this.getNamed(list, name);
			},
			filter: function(dest, source, exclude, prioritize) {
				let i;
				let key;
				let l;
				let processed;
				function handleKey(key) {
					if (!(exclude && key in exclude) && !(processed && key in processed)) {
						const value = source[key];
						if (value !== undefined) dest[key] = value;
					}
				}
				if (prioritize) {
					const keys = {};
					for (i = 0, key, l = prioritize.length; i < l; i++) {
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
				return Base.isPlainObject(obj) || Array.isArray(obj) || asString && typeof obj === "string";
			},
			serialize: function(obj, options, compact, dictionary) {
				let i;
				let l;
				options = options || {};
				const isRoot = !dictionary;
				let res;
				if (isRoot) {
					options.formatter = new Formatter(options.precision);
					dictionary = {
						length: 0,
						definitions: {},
						references: {},
						add: function(item, create) {
							const id = "#" + item._id;
							let ref = this.references[id];
							if (!ref) {
								this.length++;
								const res = create.call(item);
								const name = item._class;
								if (name && res[0] !== name) res.unshift(name);
								this.definitions[id] = res;
								ref = this.references[id] = [id];
							}
							return ref;
						}
					};
				}
				if (obj && obj._serialize) {
					res = obj._serialize(options, dictionary);
					const name = obj._class;
					if (name && !obj._compactSerialize && (isRoot || !compact) && res[0] !== name) {
						res.unshift(name);
					}
				} else if (Array.isArray(obj)) {
					res = [];
					for (i = 0, l = obj.length; i < l; i++) res[i] = Base.serialize(obj[i], options, compact, dictionary);
				} else if (Base.isPlainObject(obj)) {
					res = {};
					const keys = Object.keys(obj);
					for (i = 0, l = keys.length; i < l; i++) {
						const key = keys[i];
						res[key] = Base.serialize(obj[key], options, compact, dictionary);
					}
				} else if (typeof obj === "number") {
					res = options.formatter.number(obj, options.precision);
				} else {
					res = obj;
				}
				return isRoot && dictionary.length > 0 ? [["dictionary", dictionary.definitions], res] : res;
			},
			deserialize: function(json, create, resolve, _data, _setDictionary, _isRoot) {
				let res = json;
				const isFirst = !_data;
				const hasDictionary = isFirst && json && json.length && json[0][0] === "dictionary";
				_data = _data || {};
				if (Array.isArray(json)) {
					let type = json[0];
					const isDictionary = type === "dictionary";
					if (json.length == 1 && /^#/.test(type)) {
						return _data.dictionary[type];
					}
					if (json.length == 1 && resolve && /^@/.test(type)) {
						return resolve(type.slice(1));
					}
					type = Base.exports[type];
					res = [];
					for (let i = type ? 1 : 0, l = json.length; i < l; i++) {
						res.push(Base.deserialize(json[i], create, resolve, _data, isDictionary, hasDictionary));
					}
					if (type) {
						const args = res;
						if (create) {
							res = create(type, args, isFirst || _isRoot);
						} else {
							res = new type(args);
						}
					}
				} else if (Base.isPlainObject(json)) {
					res = {};
					if (_setDictionary) _data.dictionary = res;
					for (const key in json) res[key] = Base.deserialize(json[key], create, resolve, _data);
				}
				return hasDictionary ? res[1] : res;
			},
			exportJSON: function(obj, options) {
				const json = Base.serialize(obj, options);
				return options && options.asString == false ? json : JSON.stringify(json);
			},
			importJSON: function(json, target, resolve) {
				return Base.deserialize(typeof json === "string" ? JSON.parse(json) : json, function(ctor, args, isRoot) {
					const useTarget = isRoot && target && target.constructor === ctor;
					const obj = useTarget ? target : Base.create(ctor.prototype);
					if (args.length === 1 && obj instanceof Item && (useTarget || !(obj instanceof Layer))) {
						const arg = args[0];
						if (Base.isPlainObject(arg)) {
							arg.insert = false;
							if (useTarget) {
								args = args.concat([Item.INSERT]);
							}
						}
					}
					;
					(useTarget ? obj.set : ctor).apply(obj, args);
					if (useTarget) target = null;
					return obj;
				}, resolve);
			},
			push: function(list, items) {
				const itemsLength = items.length;
				if (itemsLength < 4096) {
					list.push.apply(list, items);
				} else {
					const startLength = list.length;
					list.length += itemsLength;
					for (let i = 0; i < itemsLength; i++) {
						list[startLength + i] = items[i];
					}
				}
				return list;
			},
			splice: function(list, items, index, remove) {
				let i;
				let l;
				const amount = items && items.length;
				const append = index === undefined;
				index = append ? list.length : index;
				if (index > list.length) index = list.length;
				for (i = 0; i < amount; i++) items[i]._index = index + i;
				if (append) {
					Base.push(list, items);
					return [];
				} else {
					const args = [index, remove];
					if (items) Base.push(args, items);
					const removed = list.splice.apply(list, args);
					for (i = 0, l = removed.length; i < l; i++) removed[i]._index = undefined;
					for (i = index + amount, l = list.length; i < l; i++) list[i]._index = i;
					return removed;
				}
			},
			addNamed: function(list, named, name, item) {
				;
				(named[name] = named[name] || []).push(item);
				if (!(name in list)) list[name] = item;
			},
			removeNamed: function(list, named, name, item) {
				const namedArray = named[name];
				const index = namedArray ? namedArray.indexOf(item) : -1;
				if (index !== -1) {
					if (list[name] == item) delete list[name];
					namedArray.splice(index, 1);
					if (namedArray.length) {
						list[name] = namedArray[0];
					} else {
						delete named[name];
					}
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
				return str.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
			}
		}
	});
	const Emitter = {
		on: function(type, func) {
			if (typeof type !== "string") {
				Base.each(type, function(value, key) {
					this.on(key, value);
				}, this);
			} else {
				const types = this._eventTypes;
				const entry = types && types[type];
				if (this === this.constructor.prototype && !(entry && entry.classLevel)) throw new Error("Unsupported class-level event: '" + type + "'.");
				let handlers = this._callbacks = this.hasOwnProperty("_callbacks") && this._callbacks || {};
				handlers = handlers[type] = handlers[type] || [];
				if (handlers.indexOf(func) === -1) {
					handlers.push(func);
					if (entry && entry.install && handlers.length === 1) entry.install.call(this, type);
				}
			}
			return this;
		},
		off: function(type, func) {
			if (typeof type !== "string") {
				Base.each(type, function(value, key) {
					this.off(key, value);
				}, this);
				return;
			}
			const types = this._eventTypes;
			const entry = types && types[type];
			const handlers = this.hasOwnProperty("_callbacks") && this._callbacks[type];
			let index;
			if (handlers) {
				if (!func || (index = handlers.indexOf(func)) !== -1 && handlers.length === 1) {
					if (entry && entry.uninstall) entry.uninstall.call(this, type);
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
			const handlers = this._getHandlers(type);
			if (!handlers.length) return false;
			const args = Base.slice(arguments, 1);
			const setTarget = event && event.target && !event.currentTarget;
			if (setTarget) event.currentTarget = this;
			for (let i = 0, l = handlers.length; i < l; i++) {
				if (handlers[i].apply(this, args) == false) {
					if (event && event.stop) event.stop();
					break;
				}
			}
			if (setTarget) delete event.currentTarget;
			return true;
		},
		responds: function(type) {
			const callbacks = this._callbacks;
			if (callbacks) {
				if (this.hasOwnProperty("_callbacks") && callbacks[type]) return true;
				for (let obj = this.constructor.prototype; obj && obj._callbacks; obj = Object.getPrototypeOf(obj)) {
					if (obj.hasOwnProperty("_callbacks") && obj._callbacks[type]) return true;
				}
			}
			return false;
		},
		_getHandlers: function(type) {
			const handlers = [];
			for (let obj = this; obj; obj = Object.getPrototypeOf(obj)) {
				const callbacks = obj.hasOwnProperty("_callbacks") && obj._callbacks[type];
				if (callbacks) Base.push(handlers, callbacks);
			}
			return handlers;
		},
		attach: "#on",
		detach: "#off",
		fire: "#emit",
		_installEvents: function(install) {
			const types = this._eventTypes;
			const handlers = this.hasOwnProperty("_callbacks") && this._callbacks;
			const key = install ? "install" : "uninstall";
			if (types) {
				for (const type in handlers) {
					if (handlers[type].length > 0) {
						const entry = types[type];
						const func = entry && entry[key];
						if (func) func.call(this, type);
					}
				}
			}
		},
		statics: {
			on: function(type, func) {
				this.prototype.on(type, func);
				return this;
			},
			off: function(type, func) {
				this.prototype.off(type, func);
				return this;
			},
			inject: function inject(src) {
				const events = src._events;
				if (events) {
					const types = {};
					Base.each(events, function(entry, key) {
						const isString = typeof entry === "string";
						let name = isString ? entry : key;
						const part = Base.capitalize(name);
						const type = name.substring(2).toLowerCase();
						types[type] = isString ? {} : entry;
						name = "_" + name;
						src["get" + part] = function() {
							return this.hasOwnProperty(name) ? this[name] : null;
						};
						src["set" + part] = function(func) {
							const prev = this["get" + part]();
							if (prev) this.off(type, prev);
							if (func) this.on(type, func);
							this[name] = func;
						};
						if (!isString && entry.classLevel) {
							const statics = src.statics = src.statics || {};
							statics["get" + part] = function() {
								return this.prototype["get" + part]();
							};
							statics["set" + part] = function(func) {
								this.prototype["set" + part](func);
							};
						}
					});
					src._eventTypes = types;
				}
				return inject.base.apply(this, arguments);
			}
		}
	};
	const PaperScope = Base.extend({
		_class: "PaperScope",
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
			this._project = null;
			this.projects = [];
			this.tools = [];
			this._id = PaperScope._id++;
			PaperScope._scopes[this._id] = this;
			const proto = PaperScope.prototype;
			if (!this.support) {
				proto.support = { nativeBlendModes: BlendMode.nativeModes };
			}
			if (!this.agent) {
				const user = self.navigator.userAgent.toLowerCase();
				const os = (/(darwin|win|mac|linux|freebsd|sunos)/.exec(user) || [])[0];
				const platform = os === "darwin" ? "mac" : os;
				const agent = proto.agent = proto.browser = { platform };
				if (platform) agent[platform] = true;
				user.replace(/(opera|chrome|safari|webkit|firefox|msie|trident|atom|node|jsdom)\/?\s*([.\d]+)(?:.*version\/([.\d]+))?(?:.*rv:v?([.\d]+))?/g, function(match, n, v1, v2, rv) {
					if (!agent.chrome) {
						const v = n === "opera" ? v2 : /^(node|trident)$/.test(n) ? rv : v1;
						agent.version = v;
						agent.versionNumber = parseFloat(v);
						n = {
							trident: "msie",
							jsdom: "node"
						}[n] || n;
						agent.name = n;
						agent[n] = true;
					}
				});
				if (agent.chrome) delete agent.webkit;
				if (agent.atom) delete agent.chrome;
			}
		},
		version: "0.17.0-develop",
		getProject: function() {
			return this._project;
		},
		setProject: function(project) {
			this._project = project;
		},
		getView: function() {
			const project = this._project;
			return project && project._view;
		},
		getPaper: function() {
			return this;
		},
		execute: function(code, options) {},
		install: function(scope) {
			const that = this;
			Base.each([
				"project",
				"view",
				"tool"
			], function(key) {
				Base.define(scope, key, {
					configurable: true,
					get: function() {
						return that[key];
					}
				});
			});
			for (const key in this) {
				if (!/^_/.test(key) && this[key] && !(key in scope)) scope[key] = this[key];
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
			let i;
			const projects = this.projects;
			const tools = this.tools;
			for (i = projects.length - 1; i >= 0; i--) projects[i].remove();
			for (i = tools.length - 1; i >= 0; i--) tools[i].remove();
		},
		remove: function() {
			this.clear();
			delete PaperScope._scopes[this._id];
		},
		statics: new (function() {
			function handleAttribute(name) {
				name += "Attribute";
				return function(el, attr) {
					return el[name](attr) || el[name]("data-paper-" + attr);
				};
			}
			return {
				_scopes: {},
				_id: 0,
				get: function(id) {
					return this._scopes[id] || null;
				},
				getAttribute: handleAttribute("get"),
				hasAttribute: handleAttribute("has")
			};
		})()
	});
	const PaperScopeItem = Base.extend(Emitter, {
		initialize: function(activate) {
			this._scope = paper;
			this._index = this._scope[this._list].push(this) - 1;
			if (activate || !this._scope[this._reference]) this.activate();
		},
		activate: function() {
			if (!this._scope) return false;
			const prev = this._scope[this._reference];
			if (prev && prev !== this) prev.emit("deactivate");
			this._scope[this._reference] = this;
			this.emit("activate", prev);
			return true;
		},
		isActive: function() {
			return this._scope[this._reference] === this;
		},
		getScope: function() {
			return this._scope;
		},
		remove: function() {
			if (this._index == null) return false;
			Base.splice(this._scope[this._list], null, this._index, 1);
			if (this._scope[this._reference] == this) {
				this._scope[this._reference] = null;
				this.emit("deactivate");
			}
			this._scope = null;
			return true;
		},
		getView: function() {
			return this._scope.getView();
		}
	});
	const CollisionDetection = {
		findItemBoundsCollisions: function(items1, items2, tolerance) {
			function getBounds(items) {
				const bounds = new Array(items.length);
				for (let i = 0; i < items.length; i++) {
					const rect = items[i].getBounds();
					bounds[i] = [
						rect.left,
						rect.top,
						rect.right,
						rect.bottom
					];
				}
				return bounds;
			}
			const bounds1 = getBounds(items1);
			const bounds2 = !items2 || items2 === items1 ? bounds1 : getBounds(items2);
			return this.findBoundsCollisions(bounds1, bounds2, tolerance || 0);
		},
		findCurveBoundsCollisions: function(curves1, curves2, tolerance) {
			function getBounds(curves) {
				const min = Math.min;
				const max = Math.max;
				const bounds = new Array(curves.length);
				for (let i = 0; i < curves.length; i++) {
					const v = curves[i];
					bounds[i] = [
						min(v[0], v[2], v[4], v[6]),
						min(v[1], v[3], v[5], v[7]),
						max(v[0], v[2], v[4], v[6]),
						max(v[1], v[3], v[5], v[7])
					];
				}
				return bounds;
			}
			const bounds1 = getBounds(curves1);
			const bounds2 = !curves2 || curves2 === curves1 ? bounds1 : getBounds(curves2);
			return this.findBoundsCollisions(bounds1, bounds2, tolerance || 0);
		},
		findBoundsCollisions: function(boundsA, boundsB, tolerance, sweepVertical) {
			let i;
			const self = !boundsB || boundsA === boundsB;
			const allBounds = self ? boundsA : boundsA.concat(boundsB);
			const lengthA = boundsA.length;
			const lengthAll = allBounds.length;
			function binarySearch(indices, coord, value) {
				let lo = 0;
				let hi = indices.length;
				while (lo < hi) {
					const mid = hi + lo >>> 1;
					if (allBounds[indices[mid]][coord] < value) {
						lo = mid + 1;
					} else {
						hi = mid;
					}
				}
				return lo - 1;
			}
			const pri0 = sweepVertical ? 1 : 0;
			const pri1 = pri0 + 2;
			const sec0 = sweepVertical ? 0 : 1;
			const sec1 = sec0 + 2;
			const allIndicesByPri0 = new Array(lengthAll);
			for (i = 0; i < lengthAll; i++) {
				allIndicesByPri0[i] = i;
			}
			allIndicesByPri0.sort(function(i1, i2) {
				return allBounds[i1][pri0] - allBounds[i2][pri0];
			});
			const activeIndicesByPri1 = [];
			const allCollisions = new Array(lengthA);
			for (i = 0; i < lengthAll; i++) {
				const curIndex = allIndicesByPri0[i];
				const curBounds = allBounds[curIndex];
				const origIndex = self ? curIndex : curIndex - lengthA;
				const isCurrentA = curIndex < lengthA;
				const isCurrentB = self || !isCurrentA;
				const curCollisions = isCurrentA ? [] : null;
				if (activeIndicesByPri1.length) {
					const pruneCount = binarySearch(activeIndicesByPri1, pri1, curBounds[pri0] - tolerance) + 1;
					activeIndicesByPri1.splice(0, pruneCount);
					const curSec1 = curBounds[sec1];
					const curSec0 = curBounds[sec0];
					for (let j = 0; j < activeIndicesByPri1.length; j++) {
						const activeIndex = activeIndicesByPri1[j];
						const activeBounds = allBounds[activeIndex];
						const isActiveA = activeIndex < lengthA;
						const isActiveB = self || activeIndex >= lengthA;
						if ((isCurrentA && isActiveB || isCurrentB && isActiveA) && curSec1 >= activeBounds[sec0] - tolerance && curSec0 <= activeBounds[sec1] + tolerance) {
							if (isCurrentA && isActiveB) {
								curCollisions.push(self ? activeIndex : activeIndex - lengthA);
							}
							if (isCurrentB && isActiveA) {
								allCollisions[activeIndex].push(origIndex);
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
					const curPri1 = curBounds[pri1];
					const index = binarySearch(activeIndicesByPri1, pri1, curPri1);
					activeIndicesByPri1.splice(index + 1, 0, curIndex);
				} else {
					activeIndicesByPri1.push(curIndex);
				}
			}
			for (i = 0; i < allCollisions.length; i++) {
				const collisions = allCollisions[i];
				if (collisions) {
					collisions.sort(function(i1, i2) {
						return i1 - i2;
					});
				}
			}
			return allCollisions;
		}
	};
	const Formatter = Base.extend({
		initialize: function(precision) {
			this.precision = Base.pick(precision, 5);
			this.multiplier = Math.pow(10, this.precision);
		},
		number: function(val) {
			return this.precision < 16 ? Math.round(val * this.multiplier) / this.multiplier : val;
		},
		pair: function(val1, val2, separator) {
			return this.number(val1) + (separator || ",") + this.number(val2);
		},
		point: function(val, separator) {
			return this.number(val.x) + (separator || ",") + this.number(val.y);
		},
		size: function(val, separator) {
			return this.number(val.width) + (separator || ",") + this.number(val.height);
		},
		rectangle: function(val, separator) {
			return this.point(val, separator) + (separator || ",") + this.size(val, separator);
		}
	});
	Formatter.instance = new Formatter();
	var Numerical = new (function() {
		const kronrodNodes = [
			0,
			.20778495500789848,
			.4058451513773972,
			.5860872354676911,
			.7415311855993945,
			.8648644233597691,
			.9491079123427585,
			.9914553711208126
		];
		const kronrodWeights = [
			.20948214108472782,
			.20443294007529889,
			.19035057806478542,
			.1690047266392679,
			.14065325971552592,
			.10479001032225019,
			.06309209262997856,
			.022935322010529224
		];
		const gaussWeights = [
			.4179591836734694,
			.3818300505051189,
			.27970539148927664,
			.1294849661688697
		];
		const abs = Math.abs;
		const sqrt = Math.sqrt;
		const pow = Math.pow;
		const log2 = Math.log2 || function(x) {
			return Math.log(x) * Math.LOG2E;
		};
		const EPSILON = 1e-12;
		const MACHINE_EPSILON = 112e-18;
		function getKronrod(f, a, b) {
			const A = (b - a) * .5;
			const B = A + a;
			let fx = f(B);
			let kronrod = kronrodWeights[0] * fx;
			let gauss = gaussWeights[0] * fx;
			for (let i = 1; i < 8; i++) {
				const Ax = A * kronrodNodes[i];
				fx = f(B + Ax) + f(B - Ax);
				kronrod += kronrodWeights[i] * fx;
				if (!(i & 1)) gauss += gaussWeights[i >> 1] * fx;
			}
			return [A * kronrod, abs(A * (kronrod - gauss))];
		}
		function integrate(f, a, b, estimate, tolerance) {
			const m = (a + b) * .5;
			return estimate[1] <= tolerance || m === a || m === b ? estimate[0] : integrate(f, a, m, getKronrod(f, a, m), tolerance) + integrate(f, m, b, getKronrod(f, m, b), tolerance);
		}
		function clamp(value, min, max) {
			return value < min ? min : value > max ? max : value;
		}
		function getDiscriminant(a, b, c) {
			function split(v) {
				const x = v * 134217729;
				const y = v - x;
				const hi = y + x;
				const lo = v - hi;
				return [hi, lo];
			}
			let D = b * b - a * c;
			const E = b * b + a * c;
			if (abs(D) * 3 < E) {
				const ad = split(a);
				const bd = split(b);
				const cd = split(c);
				const p = b * b;
				const dp = bd[0] * bd[0] - p + 2 * bd[0] * bd[1] + bd[1] * bd[1];
				const q = a * c;
				const dq = ad[0] * cd[0] - q + ad[0] * cd[1] + ad[1] * cd[0] + ad[1] * cd[1];
				D = p - q + (dp - dq);
			}
			return D;
		}
		function getNormalizationFactor() {
			const norm = Math.max.apply(Math, arguments);
			return norm && (norm < 1e-8 || norm > 1e8) ? pow(2, -Math.round(log2(norm))) : 0;
		}
		return {
			EPSILON,
			MACHINE_EPSILON,
			CURVETIME_EPSILON: 1e-8,
			GEOMETRIC_EPSILON: 1e-7,
			TRIGONOMETRIC_EPSILON: 1e-8,
			ANGULAR_EPSILON: 1e-5,
			KAPPA: 4 * (sqrt(2) - 1) / 3,
			getEpsilon: function(magnitude, epsilon) {
				return Math.max(EPSILON, magnitude * 4 * MACHINE_EPSILON, epsilon || 0);
			},
			isZero: function(val) {
				return val >= -EPSILON && val <= EPSILON;
			},
			isMachineZero: function(val) {
				return val >= -MACHINE_EPSILON && val <= MACHINE_EPSILON;
			},
			clamp,
			integrate: function(f, a, b, tolerance) {
				const estimate = getKronrod(f, a, b);
				return integrate(f, a, b, estimate, abs(estimate[0]) * tolerance);
			},
			gauss: function(f, a, b) {
				const A = (b - a) * .5;
				const B = A + a;
				let gauss = gaussWeights[0] * f(B);
				for (let i = 2; i < 8; i += 2) {
					const Ax = A * kronrodNodes[i];
					gauss += gaussWeights[i >> 1] * (f(B + Ax) + f(B - Ax));
				}
				return A * gauss;
			},
			findRoot: function(f, df, x, a, b, n, tolerance) {
				for (let i = 0; i < n; i++) {
					const fx = f(x);
					const dx = fx / df(x);
					const nx = x - dx;
					if (abs(dx) < tolerance) {
						x = nx;
						break;
					}
					if (fx > 0) {
						b = x;
					} else {
						a = x;
					}
					x = nx > a && nx < b ? nx : (a + b) * .5;
				}
				return clamp(x, a, b);
			},
			findSignChange: function(f, a, b, fa, fb, tolerance) {
				const sign = fa < 0 ? 1 : -1;
				const steps = Math.max(Math.ceil(log2((b - a) / tolerance)) - 1, 0);
				let scaled = tolerance * Math.pow(2, steps + 1);
				const k1 = .2 / (b - a);
				fa *= sign;
				fb *= sign;
				while (b - a > 2 * tolerance) {
					const half = (a + b) / 2;
					const r = scaled - (b - a) / 2;
					const xf = (fb * a - fa * b) / (fb - fa);
					const sigma = half - xf;
					const delta = k1 * (b - a) * (b - a);
					const xt = delta <= abs(sigma) ? xf + (sigma < 0 ? -delta : delta) : half;
					const x = abs(xt - half) <= r ? xt : half - (sigma < 0 ? -r : r);
					const fx = sign * f(x);
					if (fx > 0) {
						b = x;
						fb = fx;
					} else if (fx < 0) {
						a = x;
						fa = fx;
					} else {
						return x;
					}
					scaled /= 2;
				}
				return (a + b) / 2;
			},
			solveQuadratic: function(a, b, c, roots, min, max) {
				let x1;
				let x2 = Infinity;
				if (abs(a) < EPSILON) {
					if (abs(b) < EPSILON) return abs(c) < EPSILON ? -1 : 0;
					x1 = -c / b;
				} else {
					b *= -.5;
					let D = getDiscriminant(a, b, c);
					if (D && abs(D) < MACHINE_EPSILON) {
						const f = getNormalizationFactor(abs(a), abs(b), abs(c));
						if (f) {
							a *= f;
							b *= f;
							c *= f;
							D = getDiscriminant(a, b, c);
						}
					}
					if (D >= -MACHINE_EPSILON) {
						const Q = D < 0 ? 0 : sqrt(D);
						const R = b + (b < 0 ? -Q : Q);
						if (R === 0) {
							x1 = c / a;
							x2 = -x1;
						} else {
							x1 = R / a;
							x2 = c / R;
						}
					}
				}
				let count = 0;
				const boundless = min == null;
				const minB = min - EPSILON;
				const maxB = max + EPSILON;
				if (isFinite(x1) && (boundless || x1 > minB && x1 < maxB)) roots[count++] = boundless ? x1 : clamp(x1, min, max);
				if (x2 !== x1 && isFinite(x2) && (boundless || x2 > minB && x2 < maxB)) roots[count++] = boundless ? x2 : clamp(x2, min, max);
				return count;
			},
			solveCubic: function(a, b, c, d, roots, min, max) {
				const f = getNormalizationFactor(abs(a), abs(b), abs(c), abs(d));
				let x;
				let b1;
				let c2;
				let qd;
				let q;
				if (f) {
					a *= f;
					b *= f;
					c *= f;
					d *= f;
				}
				function evaluate(x0) {
					x = x0;
					const tmp = a * x;
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
					const t = q / a;
					const r = pow(abs(t), 1 / 3);
					const s = t < 0 ? -1 : 1;
					const td = -qd / a;
					const rd = td > 0 ? 1.324717957244746 * Math.max(r, sqrt(td)) : r;
					let x0 = x - s * rd;
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
				let count = Numerical.solveQuadratic(a, b1, c2, roots, min, max);
				const boundless = min == null;
				if (isFinite(x) && (count === 0 || count > 0 && x !== roots[0] && x !== roots[1]) && (boundless || x > min - EPSILON && x < max + EPSILON)) roots[count++] = boundless ? x : clamp(x, min, max);
				return count;
			},
			solveBernstein: function(coefficients, errors, roots, width) {
				let count = 0;
				function subdivide(values, bounds) {
					const left = [];
					const right = [];
					const leftBounds = [];
					const rightBounds = [];
					const v = values.slice();
					const e = bounds.slice();
					for (let n = v.length; n > 0; n--) {
						left.push(v[0]);
						right.unshift(v[n - 1]);
						leftBounds.push(e[0]);
						rightBounds.unshift(e[n - 1]);
						for (let i = 0; i < n - 1; i++) {
							v[i] = (v[i] + v[i + 1]) / 2;
							e[i] = (e[i] + e[i + 1]) / 2 + MACHINE_EPSILON * abs(v[i]);
						}
					}
					return [
						left,
						right,
						leftBounds,
						rightBounds
					];
				}
				function evaluate(values, t) {
					const v = values.slice();
					for (let n = v.length - 1; n > 0; n--) {
						for (let i = 0; i < n; i++) v[i] = v[i] + (v[i + 1] - v[i]) * t;
					}
					return v[0];
				}
				function solve(values, bounds, from, to) {
					let changes = 0;
					let zeros = 0;
					let sign = 0;
					for (let i = 0, l = values.length; i < l; i++) {
						const value = values[i];
						if (abs(value) <= bounds[i]) {
							zeros++;
						} else {
							const s = value > 0 ? 1 : -1;
							if (sign && s !== sign) changes++;
							sign = s;
						}
					}
					if (zeros === values.length || (changes || zeros) && to - from <= width) {
						roots[count++] = (from + to) / 2;
					} else if (changes === 1 && !zeros) {
						let a = 0;
						let b = 1;
						const isNegative = values[0] < 0;
						while (from + (to - from) * a < from + (to - from) * b && (a + b) / 2 > a && (a + b) / 2 < b) {
							const t = (a + b) / 2;
							if (evaluate(values, t) < 0 === isNegative) {
								a = t;
							} else {
								b = t;
							}
						}
						roots[count++] = from + (to - from) * (a + b) / 2;
					} else if (changes || zeros) {
						const parts = subdivide(values, bounds);
						const middle = (from + to) / 2;
						solve(parts[0], parts[2], from, middle);
						solve(parts[1], parts[3], middle, to);
					}
				}
				solve(coefficients, errors, 0, 1);
				return count;
			}
		};
	})();
	const UID = {
		_id: 1,
		_pools: {},
		get: function(name) {
			if (name) {
				let pool = this._pools[name];
				if (!pool) pool = this._pools[name] = { _id: 1 };
				return pool._id++;
			} else {
				return this._id++;
			}
		}
	};
	const Point = Base.extend({
		_class: "Point",
		_readIndex: true,
		initialize: function Point(arg0, arg1) {
			const type = typeof arg0;
			const reading = this.__read;
			let read = 0;
			if (type === "number") {
				const hasY = typeof arg1 === "number";
				this._set(arg0, hasY ? arg1 : arg0);
				if (reading) read = hasY ? 2 : 1;
			} else if (type === "undefined" || arg0 === null) {
				this._set(0, 0);
				if (reading) read = arg0 === null ? 1 : 0;
			} else {
				const obj = type === "string" ? arg0.split(/[\s,]+/) || [] : arg0;
				read = 1;
				if (Array.isArray(obj)) {
					this._set(+obj[0], +(obj.length > 1 ? obj[1] : obj[0]));
				} else if ("x" in obj) {
					this._set(obj.x || 0, obj.y || 0);
				} else if ("width" in obj) {
					this._set(obj.width || 0, obj.height || 0);
				} else if ("angle" in obj) {
					this._set(obj.length || 0, 0);
					this.setAngle(obj.angle || 0);
				} else if ("angleInRadians" in obj) {
					this._set(obj.length || 0, 0);
					this.setAngleInRadians(obj.angleInRadians || 0);
				} else {
					this._set(0, 0);
					read = 0;
				}
			}
			if (reading) this.__read = read;
			return this;
		},
		set: "#initialize",
		_set: function(x, y) {
			this.x = x;
			this.y = y;
			return this;
		},
		equals: function(point) {
			return this === point || point && (this.x === point.x && this.y === point.y || Array.isArray(point) && this.x === point[0] && this.y === point[1]) || false;
		},
		clone: function() {
			return new Point(this.x, this.y);
		},
		toString: function() {
			const f = Formatter.instance;
			return "{ x: " + f.number(this.x) + ", y: " + f.number(this.y) + " }";
		},
		_serialize: function(options) {
			const f = options.formatter;
			return [f.number(this.x), f.number(this.y)];
		},
		getValues: function() {
			return [this.x, this.y];
		},
		getLength: function() {
			return Math.sqrt(this.x * this.x + this.y * this.y);
		},
		setLength: function(length) {
			if (this.isZero()) {
				const angle = this._angle || 0;
				this._set(Math.cos(angle) * length, Math.sin(angle) * length);
			} else {
				const scale = length / this.getLength();
				if (Numerical.isZero(scale)) this.getAngle();
				this._set(this.x * scale, this.y * scale);
			}
		},
		getAngle: function() {
			return this.getAngleInRadians.apply(this, arguments) * 180 / Math.PI;
		},
		setAngle: function(angle) {
			this.setAngleInRadians.call(this, angle * Math.PI / 180);
		},
		getAngleInDegrees: "#getAngle",
		setAngleInDegrees: "#setAngle",
		getAngleInRadians: function() {
			if (!arguments.length) {
				return this.isZero() ? this._angle || 0 : this._angle = Math.atan2(this.y, this.x);
			} else {
				const point = Point.read(arguments);
				const div = this.getLength() * point.getLength();
				if (Numerical.isZero(div)) {
					return NaN;
				} else {
					const a = this.dot(point) / div;
					return Math.acos(a < -1 ? -1 : a > 1 ? 1 : a);
				}
			}
		},
		setAngleInRadians: function(angle) {
			this._angle = angle;
			if (!this.isZero()) {
				const length = this.getLength();
				this._set(Math.cos(angle) * length, Math.sin(angle) * length);
			}
		},
		getQuadrant: function() {
			return this.x >= 0 ? this.y >= 0 ? 1 : 4 : this.y >= 0 ? 2 : 3;
		}
	}, {
		beans: false,
		getDirectedAngle: function() {
			const point = Point.read(arguments);
			return Math.atan2(this.cross(point), this.dot(point)) * 180 / Math.PI;
		},
		getDistance: function() {
			const args = arguments;
			const point = Point.read(args);
			const x = point.x - this.x;
			const y = point.y - this.y;
			const d = x * x + y * y;
			const squared = Base.read(args);
			return squared ? d : Math.sqrt(d);
		},
		normalize: function(length) {
			if (length === undefined) length = 1;
			const current = this.getLength();
			const scale = current !== 0 ? length / current : 0;
			const point = new Point(this.x * scale, this.y * scale);
			if (scale >= 0) point._angle = this._angle;
			return point;
		},
		rotate: function(angle, center) {
			if (angle === 0) return this.clone();
			angle = angle * Math.PI / 180;
			let point = center ? this.subtract(center) : this;
			const sin = Math.sin(angle);
			const cos = Math.cos(angle);
			point = new Point(point.x * cos - point.y * sin, point.x * sin + point.y * cos);
			return center ? point.add(center) : point;
		},
		transform: function(matrix) {
			return matrix ? matrix._transformPoint(this) : this;
		},
		add: function() {
			const point = Point.read(arguments);
			return new Point(this.x + point.x, this.y + point.y);
		},
		subtract: function() {
			const point = Point.read(arguments);
			return new Point(this.x - point.x, this.y - point.y);
		},
		multiply: function() {
			const point = Point.read(arguments);
			return new Point(this.x * point.x, this.y * point.y);
		},
		divide: function() {
			const point = Point.read(arguments);
			return new Point(this.x / point.x, this.y / point.y);
		},
		modulo: function() {
			const point = Point.read(arguments);
			return new Point(this.x % point.x, this.y % point.y);
		},
		negate: function() {
			return new Point(-this.x, -this.y);
		},
		isInside: function() {
			return Rectangle.read(arguments).contains(this);
		},
		isClose: function() {
			const args = arguments;
			const point = Point.read(args);
			const tolerance = Base.read(args);
			return this.getDistance(point) <= tolerance;
		},
		isCollinear: function() {
			const point = Point.read(arguments);
			return Point.isCollinear(this.x, this.y, point.x, point.y);
		},
		isColinear: "#isCollinear",
		isOrthogonal: function() {
			const point = Point.read(arguments);
			return Point.isOrthogonal(this.x, this.y, point.x, point.y);
		},
		isZero: function() {
			const isZero = Numerical.isZero;
			return isZero(this.x) && isZero(this.y);
		},
		isNaN: function() {
			return isNaN(this.x) || isNaN(this.y);
		},
		isInQuadrant: function(q) {
			return this.x * (q > 1 && q < 4 ? -1 : 1) >= 0 && this.y * (q > 2 ? -1 : 1) >= 0;
		},
		dot: function() {
			const point = Point.read(arguments);
			return this.x * point.x + this.y * point.y;
		},
		cross: function() {
			const point = Point.read(arguments);
			return this.x * point.y - this.y * point.x;
		},
		project: function() {
			const point = Point.read(arguments);
			const scale = point.isZero() ? 0 : this.dot(point) / point.dot(point);
			return new Point(point.x * scale, point.y * scale);
		},
		clamp: function() {
			const args = arguments;
			const min = Point.read(args);
			const max = Point.read(args);
			return new Point(Numerical.clamp(this.x, min.x, max.x), Numerical.clamp(this.y, min.y, max.y));
		},
		statics: {
			min: function() {
				const args = arguments;
				const point1 = Point.read(args);
				const point2 = Point.read(args);
				return new Point(Math.min(point1.x, point2.x), Math.min(point1.y, point2.y));
			},
			max: function() {
				const args = arguments;
				const point1 = Point.read(args);
				const point2 = Point.read(args);
				return new Point(Math.max(point1.x, point2.x), Math.max(point1.y, point2.y));
			},
			random: function() {
				return new Point(Math.random(), Math.random());
			},
			isCollinear: function(x1, y1, x2, y2) {
				return Math.abs(x1 * y2 - y1 * x2) <= Math.sqrt((x1 * x1 + y1 * y1) * (x2 * x2 + y2 * y2)) * 1e-8;
			},
			isOrthogonal: function(x1, y1, x2, y2) {
				return Math.abs(x1 * x2 + y1 * y2) <= Math.sqrt((x1 * x1 + y1 * y1) * (x2 * x2 + y2 * y2)) * 1e-8;
			}
		}
	}, Base.each([
		"round",
		"ceil",
		"floor",
		"abs"
	], function(key) {
		const op = Math[key];
		this[key] = function() {
			return new Point(op(this.x), op(this.y));
		};
	}, {}));
	const LinkedPoint = Point.extend({
		initialize: function Point(x, y, owner, setter) {
			this._x = x;
			this._y = y;
			this._owner = owner;
			this._setter = setter;
		},
		_set: function(x, y, _dontNotify) {
			this._x = x;
			this._y = y;
			if (!_dontNotify) this._owner[this._setter](this);
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
			return this._setter === "setPosition" ? 4 : 0;
		}
	});
	const Size = Base.extend({
		_class: "Size",
		_readIndex: true,
		initialize: function Size(arg0, arg1) {
			const type = typeof arg0;
			const reading = this.__read;
			let read = 0;
			if (type === "number") {
				const hasHeight = typeof arg1 === "number";
				this._set(arg0, hasHeight ? arg1 : arg0);
				if (reading) read = hasHeight ? 2 : 1;
			} else if (type === "undefined" || arg0 === null) {
				this._set(0, 0);
				if (reading) read = arg0 === null ? 1 : 0;
			} else {
				const obj = type === "string" ? arg0.split(/[\s,]+/) || [] : arg0;
				read = 1;
				if (Array.isArray(obj)) {
					this._set(+obj[0], +(obj.length > 1 ? obj[1] : obj[0]));
				} else if ("width" in obj) {
					this._set(obj.width || 0, obj.height || 0);
				} else if ("x" in obj) {
					this._set(obj.x || 0, obj.y || 0);
				} else {
					this._set(0, 0);
					read = 0;
				}
			}
			if (reading) this.__read = read;
			return this;
		},
		set: "#initialize",
		_set: function(width, height) {
			this.width = width;
			this.height = height;
			return this;
		},
		equals: function(size) {
			return size === this || size && (this.width === size.width && this.height === size.height || Array.isArray(size) && this.width === size[0] && this.height === size[1]) || false;
		},
		clone: function() {
			return new Size(this.width, this.height);
		},
		toString: function() {
			const f = Formatter.instance;
			return "{ width: " + f.number(this.width) + ", height: " + f.number(this.height) + " }";
		},
		_serialize: function(options) {
			const f = options.formatter;
			return [f.number(this.width), f.number(this.height)];
		},
		getValues: function() {
			return [this.width, this.height];
		},
		add: function() {
			const size = Size.read(arguments);
			return new Size(this.width + size.width, this.height + size.height);
		},
		subtract: function() {
			const size = Size.read(arguments);
			return new Size(this.width - size.width, this.height - size.height);
		},
		multiply: function() {
			const size = Size.read(arguments);
			return new Size(this.width * size.width, this.height * size.height);
		},
		divide: function() {
			const size = Size.read(arguments);
			return new Size(this.width / size.width, this.height / size.height);
		},
		modulo: function() {
			const size = Size.read(arguments);
			return new Size(this.width % size.width, this.height % size.height);
		},
		negate: function() {
			return new Size(-this.width, -this.height);
		},
		isZero: function() {
			const isZero = Numerical.isZero;
			return isZero(this.width) && isZero(this.height);
		},
		isNaN: function() {
			return isNaN(this.width) || isNaN(this.height);
		},
		statics: {
			min: function(size1, size2) {
				return new Size(Math.min(size1.width, size2.width), Math.min(size1.height, size2.height));
			},
			max: function(size1, size2) {
				return new Size(Math.max(size1.width, size2.width), Math.max(size1.height, size2.height));
			},
			random: function() {
				return new Size(Math.random(), Math.random());
			}
		}
	}, Base.each([
		"round",
		"ceil",
		"floor",
		"abs"
	], function(key) {
		const op = Math[key];
		this[key] = function() {
			return new Size(op(this.width), op(this.height));
		};
	}, {}));
	const LinkedSize = Size.extend({
		initialize: function Size(width, height, owner, setter) {
			this._width = width;
			this._height = height;
			this._owner = owner;
			this._setter = setter;
		},
		_set: function(width, height, _dontNotify) {
			this._width = width;
			this._height = height;
			if (!_dontNotify) this._owner[this._setter](this);
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
	const Rectangle = Base.extend({
		_class: "Rectangle",
		_readIndex: true,
		beans: true,
		initialize: function Rectangle(arg0, arg1, arg2, arg3) {
			const args = arguments;
			const type = typeof arg0;
			let read;
			if (type === "number") {
				this._set(arg0, arg1, arg2, arg3);
				read = 4;
			} else if (type === "undefined" || arg0 === null) {
				this._set(0, 0, 0, 0);
				read = arg0 === null ? 1 : 0;
			} else if (args.length === 1 || Array.isArray(arg0) && arg0.length === 4 || arg0.x !== undefined && arg0.width !== undefined) {
				if (Array.isArray(arg0)) {
					this._set.apply(this, arg0);
					read = 1;
				} else if (arg0.x !== undefined || arg0.width !== undefined) {
					this._set(arg0.x || 0, arg0.y || 0, arg0.width || 0, arg0.height || 0);
					read = 1;
				} else if (arg0.from === undefined && arg0.to === undefined) {
					const builder = new RectangleBuilder();
					if (Base.readSupported(args, builder)) {
						read = 1;
					}
					this._set(builder.x, builder.y, builder.width, builder.height);
				}
			}
			if (read === undefined) {
				const frm = Point.readNamed(args, "from");
				const next = Base.peek(args);
				let x = frm.x;
				let y = frm.y;
				let width;
				let height;
				if (next && next.x !== undefined || Base.hasNamed(args, "to")) {
					const to = Point.readNamed(args, "to");
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
					const size = Size.read(args);
					width = size.width;
					height = size.height;
				}
				this._set(x, y, width, height);
				read = args.__index;
			}
			const filtered = args.__filtered;
			if (filtered) this.__filtered = filtered;
			if (this.__read) this.__read = read;
			return this;
		},
		set: "#initialize",
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
			const rt = Base.isPlainValue(rect) ? Rectangle.read(arguments) : rect;
			return rt === this || rt && this.x === rt.x && this.y === rt.y && this.width === rt.width && this.height === rt.height || false;
		},
		toString: function() {
			const f = Formatter.instance;
			return "{ x: " + f.number(this.x) + ", y: " + f.number(this.y) + ", width: " + f.number(this.width) + ", height: " + f.number(this.height) + " }";
		},
		_serialize: function(options) {
			const f = options.formatter;
			return [
				f.number(this.x),
				f.number(this.y),
				f.number(this.width),
				f.number(this.height)
			];
		},
		getValues: function() {
			return [
				this.x,
				this.y,
				this.width,
				this.height
			];
		},
		getPoint: function(_dontLink) {
			const ctor = _dontLink ? Point : LinkedPoint;
			return new ctor(this.x, this.y, this, "setPoint");
		},
		setPoint: function() {
			const point = Point.read(arguments);
			this.x = point.x;
			this.y = point.y;
		},
		getSize: function(_dontLink) {
			const ctor = _dontLink ? Size : LinkedSize;
			return new ctor(this.width, this.height, this, "setSize");
		},
		setSize: function() {
			const size = Size.read(arguments);
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
			const ctor = _dontLink ? Point : LinkedPoint;
			return new ctor(this.getCenterX(), this.getCenterY(), this, "setCenter");
		},
		setCenter: function() {
			const point = Point.read(arguments);
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
			return arg && arg.width !== undefined || (Array.isArray(arg) ? arg : arguments).length === 4 ? this._containsRectangle(Rectangle.read(arguments)) : this._containsPoint(Point.read(arguments));
		},
		_containsPoint: function(point) {
			const x = point.x;
			const y = point.y;
			return x >= this.x && y >= this.y && x <= this.x + this.width && y <= this.y + this.height;
		},
		_containsRectangle: function(rect) {
			const x = rect.x;
			const y = rect.y;
			return x >= this.x && y >= this.y && x + rect.width <= this.x + this.width && y + rect.height <= this.y + this.height;
		},
		intersects: function() {
			const rect = Rectangle.read(arguments);
			const epsilon = Base.read(arguments) || 0;
			return rect.x + rect.width > this.x - epsilon && rect.y + rect.height > this.y - epsilon && rect.x < this.x + this.width + epsilon && rect.y < this.y + this.height + epsilon;
		},
		intersect: function() {
			const rect = Rectangle.read(arguments);
			const x1 = Math.max(this.x, rect.x);
			const y1 = Math.max(this.y, rect.y);
			const x2 = Math.min(this.x + this.width, rect.x + rect.width);
			const y2 = Math.min(this.y + this.height, rect.y + rect.height);
			return new Rectangle(x1, y1, x2 - x1, y2 - y1);
		},
		unite: function() {
			const rect = Rectangle.read(arguments);
			const x1 = Math.min(this.x, rect.x);
			const y1 = Math.min(this.y, rect.y);
			const x2 = Math.max(this.x + this.width, rect.x + rect.width);
			const y2 = Math.max(this.y + this.height, rect.y + rect.height);
			return new Rectangle(x1, y1, x2 - x1, y2 - y1);
		},
		include: function() {
			const point = Point.read(arguments);
			const x1 = Math.min(this.x, point.x);
			const y1 = Math.min(this.y, point.y);
			const x2 = Math.max(this.x + this.width, point.x);
			const y2 = Math.max(this.y + this.height, point.y);
			return new Rectangle(x1, y1, x2 - x1, y2 - y1);
		},
		expand: function() {
			const amount = Size.read(arguments);
			const hor = amount.width;
			const ver = amount.height;
			return new Rectangle(this.x - hor / 2, this.y - ver / 2, this.width + hor, this.height + ver);
		},
		scale: function() {
			const args = arguments;
			const scale = Point.read(args);
			const center = Point.read(args, 0, { readNull: true }) || this.getCenter(true);
			return new Rectangle(this.getTopLeft(true).subtract(center).multiply(scale).add(center), this.getBottomRight(true).subtract(center).multiply(scale).add(center));
		}
	}, Base.each([
		["Top", "Left"],
		["Top", "Right"],
		["Bottom", "Left"],
		["Bottom", "Right"],
		["Left", "Center"],
		["Top", "Center"],
		["Right", "Center"],
		["Bottom", "Center"]
	], function(parts, index) {
		const part = parts.join("");
		const xFirst = /^[RL]/.test(part);
		if (index >= 4) parts[1] += xFirst ? "Y" : "X";
		const x = parts[xFirst ? 0 : 1];
		const y = parts[xFirst ? 1 : 0];
		const getX = "get" + x;
		const getY = "get" + y;
		const setX = "set" + x;
		const setY = "set" + y;
		const get = "get" + part;
		const set = "set" + part;
		this[get] = function(_dontLink) {
			const ctor = _dontLink ? Point : LinkedPoint;
			return new ctor(this[getX](), this[getY](), this, set);
		};
		this[set] = function() {
			const point = Point.read(arguments);
			this[setX](point.x);
			this[setY](point.y);
		};
	}, { beans: true }));
	const LinkedRectangle = Rectangle.extend({
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
			if (!_dontNotify) this._owner[this._setter](this);
			return this;
		}
	}, new (function() {
		const proto = Rectangle.prototype;
		return Base.each([
			"x",
			"y",
			"width",
			"height"
		], function(key) {
			const part = Base.capitalize(key);
			const internal = "_" + key;
			this["get" + part] = function() {
				return this[internal];
			};
			this["set" + part] = function(value) {
				this[internal] = value;
				if (!this._dontNotify) this._owner[this._setter](this);
			};
		}, Base.each([
			"Point",
			"Size",
			"Center",
			"Left",
			"Top",
			"Right",
			"Bottom",
			"CenterX",
			"CenterY",
			"TopLeft",
			"TopRight",
			"BottomLeft",
			"BottomRight",
			"LeftCenter",
			"TopCenter",
			"RightCenter",
			"BottomCenter"
		], function(key) {
			const name = "set" + key;
			this[name] = function() {
				this._dontNotify = true;
				proto[name].apply(this, arguments);
				this._dontNotify = false;
				this._owner[this._setter](this);
			};
		}, {
			isSelected: function() {
				return !!(this._owner._selection & this._getSelection());
			},
			setSelected: function(selected) {
				const owner = this._owner;
				if (owner._changeSelection) {
					owner._changeSelection(this._getSelection(), selected);
				}
			},
			_getSelection: function() {
				return this._setter === "setStrokeBounds" ? 8 : 2;
			}
		}));
	})());
	const RectangleBuilder = Rectangle.extend({
		beans: true,
		_fw: 1,
		_fh: 1,
		setSize: function() {
			const size = Size.read(arguments);
			const sx = this._sx;
			const sy = this._sy;
			const w = size.width;
			const h = size.height;
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
				const amount = left - this.x;
				this.width -= this._sx === .5 ? amount * 2 : amount;
			}
			this.x = left;
			this._sx = this._fw = 0;
		},
		setTop: function(top) {
			if (!this._fh) {
				const amount = top - this.y;
				this.height -= this._sy === .5 ? amount * 2 : amount;
			}
			this.y = top;
			this._sy = this._fh = 0;
		},
		setRight: function(right) {
			if (!this._fw) {
				const amount = right - this.x;
				this.width = this._sx === .5 ? amount * 2 : amount;
			}
			this.x = right - this.width;
			this._sx = 1;
			this._fw = 0;
		},
		setBottom: function(bottom) {
			if (!this._fh) {
				const amount = bottom - this.y;
				this.height = this._sy === .5 ? amount * 2 : amount;
			}
			this.y = bottom - this.height;
			this._sy = 1;
			this._fh = 0;
		},
		setCenterX: function(x) {
			if (this._fw || this._sx === .5) {
				this.x = x - this.width / 2;
			} else {
				if (this._sx) {
					this.x += (x - this.x) * 2 * this._sx;
				}
				this.width = (x - this.x) * 2;
			}
			this._sx = .5;
			this._fw = 0;
		},
		setCenterY: function(y) {
			if (this._fh || this._sy === .5) {
				this.y = y - this.height / 2;
			} else {
				if (this._sy) {
					this.y += (y - this.y) * 2 * this._sy;
				}
				this.height = (y - this.y) * 2;
			}
			this._sy = .5;
			this._fh = 0;
		}
	});
	const Matrix = Base.extend({
		_class: "Matrix",
		initialize: function Matrix(arg, _dontNotify) {
			const args = arguments;
			const count = args.length;
			let ok = true;
			if (count >= 6) {
				this._set.apply(this, args);
			} else if (count === 1 || count === 2) {
				if (arg instanceof Matrix) {
					this._set(arg._a, arg._b, arg._c, arg._d, arg._tx, arg._ty, _dontNotify);
				} else if (Array.isArray(arg)) {
					this._set.apply(this, _dontNotify ? arg.concat([_dontNotify]) : arg);
				} else {
					ok = false;
				}
			} else if (!count) {
				this.reset();
			} else {
				ok = false;
			}
			if (!ok) {
				throw new Error("Unsupported matrix parameters");
			}
			return this;
		},
		set: "#initialize",
		_set: function(a, b, c, d, tx, ty, _dontNotify) {
			this._a = a;
			this._b = b;
			this._c = c;
			this._d = d;
			this._tx = tx;
			this._ty = ty;
			if (!_dontNotify) this._changed();
			return this;
		},
		_serialize: function(options, dictionary) {
			return Base.serialize(this.getValues(), options, true, dictionary);
		},
		_changed: function() {
			const owner = this._owner;
			if (owner) {
				if (owner._applyMatrix) {
					owner.transform(null, true);
				} else {
					owner._changed(25);
				}
			}
		},
		clone: function() {
			return new Matrix(this._a, this._b, this._c, this._d, this._tx, this._ty);
		},
		equals: function(mx) {
			return mx === this || mx && this._a === mx._a && this._b === mx._b && this._c === mx._c && this._d === mx._d && this._tx === mx._tx && this._ty === mx._ty;
		},
		toString: function() {
			const f = Formatter.instance;
			return "[[" + [
				f.number(this._a),
				f.number(this._c),
				f.number(this._tx)
			].join(", ") + "], [" + [
				f.number(this._b),
				f.number(this._d),
				f.number(this._ty)
			].join(", ") + "]]";
		},
		reset: function(_dontNotify) {
			this._a = this._d = 1;
			this._b = this._c = this._tx = this._ty = 0;
			if (!_dontNotify) this._changed();
			return this;
		},
		apply: function(recursively, _setApplyMatrix) {
			const owner = this._owner;
			if (owner) {
				owner.transform(null, Base.pick(recursively, true), _setApplyMatrix);
				return this.isIdentity();
			}
			return false;
		},
		translate: function() {
			const point = Point.read(arguments);
			const x = point.x;
			const y = point.y;
			this._tx += x * this._a + y * this._c;
			this._ty += x * this._b + y * this._d;
			this._changed();
			return this;
		},
		scale: function() {
			const args = arguments;
			const scale = Point.read(args);
			const center = Point.read(args, 0, { readNull: true });
			if (center) this.translate(center);
			this._a *= scale.x;
			this._b *= scale.x;
			this._c *= scale.y;
			this._d *= scale.y;
			if (center) this.translate(center.negate());
			this._changed();
			return this;
		},
		rotate: function(angle) {
			angle *= Math.PI / 180;
			const center = Point.read(arguments, 1);
			const x = center.x;
			const y = center.y;
			const cos = Math.cos(angle);
			const sin = Math.sin(angle);
			const tx = x - x * cos + y * sin;
			const ty = y - x * sin - y * cos;
			const a = this._a;
			const b = this._b;
			const c = this._c;
			const d = this._d;
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
			const args = arguments;
			const shear = Point.read(args);
			const center = Point.read(args, 0, { readNull: true });
			if (center) this.translate(center);
			const a = this._a;
			const b = this._b;
			this._a += shear.y * this._c;
			this._b += shear.y * this._d;
			this._c += shear.x * a;
			this._d += shear.x * b;
			if (center) this.translate(center.negate());
			this._changed();
			return this;
		},
		skew: function() {
			const args = arguments;
			const skew = Point.read(args);
			const center = Point.read(args, 0, { readNull: true });
			const toRadians = Math.PI / 180;
			const shear = new Point(Math.tan(skew.x * toRadians), Math.tan(skew.y * toRadians));
			return this.shear(shear, center);
		},
		append: function(mx, _dontNotify) {
			if (mx) {
				const a1 = this._a;
				const b1 = this._b;
				const c1 = this._c;
				const d1 = this._d;
				const a2 = mx._a;
				const b2 = mx._c;
				const c2 = mx._b;
				const d2 = mx._d;
				const tx2 = mx._tx;
				const ty2 = mx._ty;
				this._a = a2 * a1 + c2 * c1;
				this._c = b2 * a1 + d2 * c1;
				this._b = a2 * b1 + c2 * d1;
				this._d = b2 * b1 + d2 * d1;
				this._tx += tx2 * a1 + ty2 * c1;
				this._ty += tx2 * b1 + ty2 * d1;
				if (!_dontNotify) this._changed();
			}
			return this;
		},
		prepend: function(mx, _dontNotify) {
			if (mx) {
				const a1 = this._a;
				const b1 = this._b;
				const c1 = this._c;
				const d1 = this._d;
				const tx1 = this._tx;
				const ty1 = this._ty;
				const a2 = mx._a;
				const b2 = mx._c;
				const c2 = mx._b;
				const d2 = mx._d;
				const tx2 = mx._tx;
				const ty2 = mx._ty;
				this._a = a2 * a1 + b2 * b1;
				this._c = a2 * c1 + b2 * d1;
				this._b = c2 * a1 + d2 * b1;
				this._d = c2 * c1 + d2 * d1;
				this._tx = a2 * tx1 + b2 * ty1 + tx2;
				this._ty = c2 * tx1 + d2 * ty1 + ty2;
				if (!_dontNotify) this._changed();
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
			let res = null;
			if (this.isInvertible()) {
				const a = this._a;
				const b = this._b;
				const c = this._c;
				const d = this._d;
				const tx = this._tx;
				const ty = this._ty;
				const det = a * d - b * c;
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
		concatenate: "#append",
		preConcatenate: "#prepend",
		chain: "#appended",
		_shiftless: function() {
			return new Matrix(this._a, this._b, this._c, this._d, 0, 0);
		},
		_orNullIfIdentity: function() {
			return this.isIdentity() ? null : this;
		},
		isIdentity: function() {
			return this._a === 1 && this._b === 0 && this._c === 0 && this._d === 1 && this._tx === 0 && this._ty === 0;
		},
		isInvertible: function() {
			const det = this._a * this._d - this._c * this._b;
			return det && !isNaN(det) && isFinite(this._tx) && isFinite(this._ty);
		},
		_getMeanScale: function() {
			return Math.sqrt(Math.abs(this._a * this._d - this._b * this._c));
		},
		isSingular: function() {
			return !this.isInvertible();
		},
		transform: function(src, dst, count) {
			return arguments.length < 3 ? this._transformPoint(Point.read(arguments)) : this._transformCoordinates(src, dst, count);
		},
		_transformPoint: function(point, dest, _dontNotify) {
			const x = point.x;
			const y = point.y;
			if (!dest) dest = new Point();
			return dest._set(x * this._a + y * this._c + this._tx, x * this._b + y * this._d + this._ty, _dontNotify);
		},
		_transformCoordinates: function(src, dst, count) {
			for (let i = 0, max = 2 * count; i < max; i += 2) {
				const x = src[i];
				const y = src[i + 1];
				dst[i] = x * this._a + y * this._c + this._tx;
				dst[i + 1] = x * this._b + y * this._d + this._ty;
			}
			return dst;
		},
		_transformCorners: function(rect) {
			const x1 = rect.x;
			const y1 = rect.y;
			const x2 = x1 + rect.width;
			const y2 = y1 + rect.height;
			const coords = [
				x1,
				y1,
				x2,
				y1,
				x2,
				y2,
				x1,
				y2
			];
			return this._transformCoordinates(coords, coords, 4);
		},
		_transformBounds: function(bounds, dest) {
			const coords = this._transformCorners(bounds);
			const min = coords.slice(0, 2);
			const max = min.slice();
			for (let i = 2; i < 8; i++) {
				const val = coords[i];
				const j = i & 1;
				if (val < min[j]) {
					min[j] = val;
				} else if (val > max[j]) {
					max[j] = val;
				}
			}
			if (!dest) dest = new Rectangle();
			return dest._set(min[0], min[1], max[0] - min[0], max[1] - min[1]);
		},
		inverseTransform: function() {
			return this._inverseTransform(Point.read(arguments));
		},
		_inverseTransform: function(point) {
			let res = null;
			if (this.isInvertible()) {
				const a = this._a;
				const b = this._b;
				const c = this._c;
				const d = this._d;
				const det = a * d - b * c;
				const x = point.x - this._tx;
				const y = point.y - this._ty;
				res = new Point((x * d - y * c) / det, (y * a - x * b) / det);
			}
			return res;
		},
		decompose: function() {
			const a = this._a;
			const b = this._b;
			const c = this._c;
			const d = this._d;
			const det = a * d - b * c;
			const sqrt = Math.sqrt;
			const atan2 = Math.atan2;
			const degrees = 180 / Math.PI;
			let rotate;
			let scale;
			let skew;
			if (a !== 0 || b !== 0) {
				const r = sqrt(a * a + b * b);
				rotate = Math.acos(a / r) * (b > 0 ? 1 : -1);
				scale = [r, det / r];
				skew = [atan2(a * c + b * d, r * r), 0];
			} else if (c !== 0 || d !== 0) {
				const s = sqrt(c * c + d * d);
				rotate = Math.asin(c / s) * (d > 0 ? 1 : -1);
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
			return [
				this._a,
				this._b,
				this._c,
				this._d,
				this._tx,
				this._ty
			];
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
				ctx.transform(this._a, this._b, this._c, this._d, this._tx, this._ty);
			}
		},
		statics: { _getCircleExtents: function(radius, matrix) {
			if (!matrix) return [radius, radius];
			const a = matrix._a;
			const b = matrix._b;
			const c = matrix._c;
			const d = matrix._d;
			return [radius * Math.sqrt(a * a + c * c), radius * Math.sqrt(b * b + d * d)];
		} }
	}, Base.each([
		"a",
		"b",
		"c",
		"d",
		"tx",
		"ty"
	], function(key) {
		const part = Base.capitalize(key);
		const prop = "_" + key;
		this["get" + part] = function() {
			return this[prop];
		};
		this["set" + part] = function(value) {
			this[prop] = value;
			this._changed();
		};
	}, {}));
	const Line = Base.extend({
		_class: "Line",
		initialize: function Line(arg0, arg1, arg2, arg3, arg4) {
			let asVector;
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
			return Line.intersect(this._px, this._py, this._vx, this._vy, line._px, line._py, line._vx, line._vy, true, isInfinite);
		},
		getSide: function(point, isInfinite) {
			return Line.getSide(this._px, this._py, this._vx, this._vy, point.x, point.y, true, isInfinite);
		},
		getDistance: function(point) {
			return Math.abs(this.getSignedDistance(point));
		},
		getSignedDistance: function(point) {
			return Line.getSignedDistance(this._px, this._py, this._vx, this._vy, point.x, point.y, true);
		},
		isCollinear: function(line) {
			return Point.isCollinear(this._vx, this._vy, line._vx, line._vy);
		},
		isOrthogonal: function(line) {
			return Point.isOrthogonal(this._vx, this._vy, line._vx, line._vy);
		},
		statics: {
			intersect: function(p1x, p1y, v1x, v1y, p2x, p2y, v2x, v2y, asVector, isInfinite) {
				if (!asVector) {
					v1x -= p1x;
					v1y -= p1y;
					v2x -= p2x;
					v2y -= p2y;
				}
				const cross = v1x * v2y - v1y * v2x;
				if (!Numerical.isMachineZero(cross)) {
					const dx = p1x - p2x;
					const dy = p1y - p2y;
					let u1 = (v2x * dy - v2y * dx) / cross;
					const u2 = (v1x * dy - v1y * dx) / cross;
					const epsilon = 1e-12;
					const uMin = -epsilon;
					const uMax = 1 + epsilon;
					if (isInfinite || uMin < u1 && u1 < uMax && uMin < u2 && u2 < uMax) {
						if (!isInfinite) {
							u1 = u1 <= 0 ? 0 : u1 >= 1 ? 1 : u1;
						}
						return new Point(p1x + u1 * v1x, p1y + u1 * v1y);
					}
				}
			},
			getSide: function(px, py, vx, vy, x, y, asVector, isInfinite) {
				if (!asVector) {
					vx -= px;
					vy -= py;
				}
				const v2x = x - px;
				const v2y = y - py;
				let ccw = v2x * vy - v2y * vx;
				if (!isInfinite && Numerical.isMachineZero(ccw)) {
					ccw = (v2x * vx + v2x * vx) / (vx * vx + vy * vy);
					if (ccw >= 0 && ccw <= 1) ccw = 0;
				}
				return ccw < 0 ? -1 : ccw > 0 ? 1 : 0;
			},
			getSignedDistance: function(px, py, vx, vy, x, y, asVector) {
				if (!asVector) {
					vx -= px;
					vy -= py;
				}
				return vx === 0 ? vy > 0 ? x - px : px - x : vy === 0 ? vx < 0 ? y - py : py - y : ((x - px) * vy - (y - py) * vx) / (vy > vx ? Math.abs(vy) * Math.sqrt(1 + vx * vx / (vy * vy)) : Math.abs(vx) * Math.sqrt(1 + vy * vy / (vx * vx)));
			},
			getDistance: function(px, py, vx, vy, x, y, asVector) {
				return Math.abs(Line.getSignedDistance(px, py, vx, vy, x, y, asVector));
			}
		}
	});
	var ChangeFlag = {
		APPEARANCE: 1,
		CHILDREN: 2,
		INSERTION: 4,
		GEOMETRY: 8,
		MATRIX: 16,
		SEGMENTS: 32,
		STROKE: 64,
		STYLE: 128,
		ATTRIBUTE: 256,
		CONTENT: 512,
		PIXELS: 1024,
		CLIPPING: 2048,
		VIEW: 4096
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
	const Project = PaperScopeItem.extend({
		_class: "Project",
		_list: "projects",
		_reference: "project",
		_compactSerialize: true,
		_events: {
			onActivate: { classLevel: true },
			onDeactivate: { classLevel: true }
		},
		initialize: function Project(element) {
			PaperScopeItem.call(this, true);
			this._children = [];
			this._namedChildren = {};
			this._activeLayer = null;
			this._currentStyle = new Style(null, null, this);
			this._view = View.create(this, element || CanvasProvider.getCanvas(1, 1));
			this._selectionItems = {};
			this._selectionCount = 0;
			this._drawCount = 0;
			this._updateVersion = 0;
			this._bufferVersion = 0;
		},
		_serialize: function(options, dictionary) {
			return Base.serialize(this._children, options, true, dictionary);
		},
		_changed: function(flags, item) {
			if (flags & 1) {
				const view = this._view;
				if (view) {
					view._needsUpdate = true;
					if (!view._requested && view._autoUpdate) view.requestUpdate();
				}
			}
			if (item && item.isInserted()) this._logChange("item", item, flags);
		},
		_logChange: function(name, object, flags) {
			const changes = this._changes;
			if (changes) {
				const changesById = this._changesById;
				const id = object._id;
				let entry = changesById[id];
				if (entry) {
					entry.flags |= flags;
				} else {
					entry = changesById[id] = { flags };
					entry[name] = object;
					changes.push(entry);
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
			let changes = this._changes;
			const that = this;
			if (changes) {
				this._changes = [];
				this._changesById = {};
				changes = changes.filter(function(change) {
					const item = change.item;
					return !item || item._project === that;
				});
			}
			return changes || null;
		},
		hasChanges: function() {
			return !!(this._changes && this._changes.length);
		},
		clear: function() {
			const children = this._children;
			for (let i = children.length - 1; i >= 0; i--) children[i].remove();
		},
		isEmpty: function() {
			return !this._children.length;
		},
		remove: function remove() {
			if (!remove.base.call(this)) return false;
			if (this._view) this._view.remove();
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
			return this._activeLayer || new Layer({
				project: this,
				insert: true
			});
		},
		getSymbolDefinitions: function() {
			const definitions = [];
			const ids = {};
			this.getItems({
				class: SymbolItem,
				match: function(item) {
					const definition = item._definition;
					const id = definition._id;
					if (!ids[id]) {
						ids[id] = true;
						definitions.push(definition);
					}
					return false;
				}
			});
			return definitions;
		},
		getSymbols: "getSymbolDefinitions",
		getPatternDefinitions: function() {
			const definitions = [];
			const ids = {};
			this.getItems({ match: function(item) {
				const style = item._style;
				[style.getFillColor(true), style.getStrokeColor(true)].forEach(function(color) {
					const definition = color && color._type === "pattern" && color._components[0];
					if (definition && !ids[definition._id]) {
						ids[definition._id] = true;
						definitions.push(definition);
					}
				});
				return false;
			} });
			return definitions;
		},
		getSelectedItems: function() {
			const selectionItems = this._selectionItems;
			const items = [];
			for (const id in selectionItems) {
				const item = selectionItems[id];
				const selection = item._selection;
				if (selection & 1 && item.isInserted()) {
					items.push(item);
				} else if (!selection) {
					this._updateSelection(item);
				}
			}
			return items;
		},
		_updateSelection: function(item, remove) {
			const id = item._id;
			const selectionItems = this._selectionItems;
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
			const children = this._children;
			for (let i = 0, l = children.length; i < l; i++) children[i].setFullySelected(true);
		},
		deselectAll: function() {
			const selectionItems = this._selectionItems;
			for (const i in selectionItems) selectionItems[i].setFullySelected(false);
		},
		addLayer: function(layer) {
			return this.insertLayer(undefined, layer);
		},
		insertLayer: function(index, layer) {
			if (layer instanceof Layer) {
				layer._remove(false, true);
				Base.splice(this._children, [layer], index, 0);
				layer._setProject(this, true);
				const name = layer._name;
				if (name) layer.setName(name);
				if (this._changes) layer._changed(5);
				if (!this._activeLayer) this._activeLayer = layer;
			} else {
				layer = null;
			}
			return layer;
		},
		_insertItem: function(index, item, _created) {
			item = this.insertLayer(index, item) || (this._activeLayer || this._insertItem(undefined, new Layer(Item.NO_INSERT), true)).insertChild(index, item);
			if (_created && item.activate) item.activate();
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
			const layer = this._activeLayer;
			return Base.importJSON(json, layer && layer.isEmpty() && layer);
		},
		removeOn: function(type) {
			const sets = this._removeSets;
			if (sets) {
				if (type === "mouseup") sets.mousedrag = null;
				const set = sets[type];
				if (set) {
					for (const id in set) {
						const item = set[id];
						for (const key in sets) {
							const other = sets[key];
							if (other && other != set) delete other[item._id];
						}
						item.remove();
					}
					sets[type] = null;
				}
			}
		},
		draw: function(ctx, matrix, pixelRatio, _view) {
			this._updateVersion++;
			ctx.save();
			matrix.applyToContext(ctx);
			const children = this._children;
			const param = new Base({
				offset: new Point(0, 0),
				pixelRatio,
				view: _view,
				viewMatrix: matrix.isIdentity() ? null : matrix,
				matrices: [new Matrix()],
				updateMatrix: true
			});
			for (let i = 0, l = children.length; i < l; i++) {
				children[i].draw(ctx, param);
			}
			ctx.restore();
			if (this._selectionCount > 0) {
				ctx.save();
				ctx.lineWidth = 1;
				const items = this._selectionItems;
				const size = this._scope.settings.handleSize;
				const version = this._updateVersion;
				for (const id in items) {
					items[id]._drawSelection(ctx, matrix, size, items, version);
				}
				ctx.restore();
			}
		}
	});
	const Item = Base.extend(Emitter, {
		statics: {
			extend: function extend(src) {
				if (src._serializeFields) src._serializeFields = Base.set({}, this.prototype._serializeFields, src._serializeFields);
				return extend.base.apply(this, arguments);
			},
			INSERT: { insert: true },
			NO_INSERT: { insert: false }
		},
		_class: "Item",
		_name: null,
		_applyMatrix: true,
		_canApplyMatrix: true,
		_canScaleStroke: false,
		_pivot: null,
		_visible: true,
		_blendMode: "normal",
		_opacity: 1,
		_locked: false,
		_guide: false,
		_textWrap: null,
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
			blendMode: "normal",
			opacity: 1,
			locked: false,
			guide: false,
			clipMask: false,
			textWrap: null,
			effects: [],
			selected: false,
			data: {}
		},
		_attributes: [
			"_locked",
			"_visible",
			"_blendMode",
			"_opacity",
			"_clipMask",
			"_guide",
			"_textWrap"
		],
		_prioritize: ["applyMatrix"]
	}, new (function() {
		const handlers = [
			"onMouseDown",
			"onMouseUp",
			"onMouseDrag",
			"onClick",
			"onDoubleClick",
			"onMouseMove",
			"onMouseEnter",
			"onMouseLeave"
		];
		function countDrawHandlers(obj, sign) {
			if (obj === obj.constructor.prototype) {
				Item._drawCount += sign;
			} else if (obj.isInserted()) {
				obj._project._drawCount += sign;
			}
		}
		return Base.each(handlers, function(name) {
			this._events[name] = {
				install: function(type) {
					if (this.isInserted()) this.getView()._countItemEvent(type, 1);
				},
				uninstall: function(type) {
					if (this.isInserted()) this.getView()._countItemEvent(type, -1);
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
				onDraw: {
					classLevel: true,
					install: function() {
						countDrawHandlers(this, 1);
					},
					uninstall: function() {
						countDrawHandlers(this, -1);
					}
				},
				onDrawSelection: { classLevel: true },
				onLoad: {},
				onError: {}
			},
			statics: {
				_itemHandlers: handlers,
				_drawCount: 0
			}
		});
	})(), {
		initialize: function Item() {},
		_getCurrentStyle: function(project) {
			return project._currentStyle;
		},
		_initialize: function(props, point) {
			const hasProps = props && Base.isPlainObject(props);
			const internal = hasProps && props.internal === true;
			const matrix = this._matrix = new Matrix();
			const project = hasProps && props.project || paper.project;
			const settings = paper.settings;
			if (!project) {
				throw new Error("Unable to create an item without a project. " + "Call paper.setup() or create a Project first.");
			}
			this._id = internal ? null : UID.get();
			this._parent = this._index = null;
			this._applyMatrix = this._canApplyMatrix && settings.applyMatrix;
			if (point) matrix.translate(point);
			matrix._owner = this;
			this._style = new Style(this._getCurrentStyle(project), this, project);
			if (internal || hasProps && props.insert == false || !settings.insertItems && !(hasProps && props.insert == true)) {
				this._setProject(project);
			} else {
				;
				(hasProps && props.parent || project)._insertItem(undefined, this, true);
			}
			if (hasProps && props !== Item.NO_INSERT && props !== Item.INSERT) {
				this.set(props, {
					internal: true,
					insert: true,
					project: true,
					parent: true
				});
			}
			return hasProps;
		},
		_serialize: function(options, dictionary) {
			const props = {};
			const that = this;
			function serialize(fields) {
				for (const key in fields) {
					const value = that[key];
					if (!Base.equals(value, fields[key])) {
						props[key] = Base.serialize(value, options, key !== "data", dictionary);
					}
				}
			}
			serialize(this._serializeFields);
			if (!(this instanceof Group)) serialize(this._style._defaults);
			return [this._class, props];
		},
		_changed: function(flags) {
			let item;
			const symbol = this._symbol;
			const cacheParent = this._parent || symbol;
			const project = this._project;
			if (flags & 8) {
				this._bounds = this._position = this._decomposed = undefined;
			} else if (flags & 64) {
				this._bounds = undefined;
			}
			if (flags & 16) {
				this._globalMatrix = undefined;
			}
			if (cacheParent && flags & 72) {
				Item._clearBoundsCache(cacheParent);
			}
			if (flags & 2) {
				Item._clearBoundsCache(this);
			}
			if (flags & 1) {
				for (item = this; item; item = item._parent) {
					if (item._buffer) item._buffer.matrix = null;
					item._effectOutput = undefined;
					if (item._symbol && item !== this) item._symbol._changed(flags);
				}
			}
			for (item = this; item && !(item instanceof Layer); item = item._parent) {
				if (item._textWrap) {
					const layer = item.getLayer();
					if (layer) layer._textWrapVersion++;
					break;
				}
			}
			const isOwner = this._getChangeOwner() === this;
			if (project) project._changed(flags, isOwner ? this : null);
			if (!isOwner) this._parent._changed(flags);
			if (symbol) symbol._changed(flags);
		},
		_getChangeOwner: function() {
			const parent = this._parent;
			return parent && !parent.getChildren() ? parent._getChangeOwner() : this;
		},
		getId: function() {
			return this._id;
		},
		getName: function() {
			return this._name;
		},
		setName: function(name) {
			if (this._name) this._removeNamed();
			if (name === +name + "") throw new Error("Names consisting only of numbers are not supported.");
			const owner = this._getOwner();
			if (name && owner) Base.addNamed(owner._children, owner._namedChildren, name, this);
			this._name = name || undefined;
			this._changed(256);
		},
		getStyle: function() {
			return this._style;
		},
		setStyle: function(style) {
			this.getStyle().set(style);
		},
		_getStyles: function() {}
	}, Base.each([
		"locked",
		"visible",
		"blendMode",
		"opacity",
		"guide"
	], function(name) {
		const part = Base.capitalize(name);
		const key = "_" + name;
		const flags = {
			locked: 256,
			visible: 257 | Change.GEOMETRY
		};
		this["get" + part] = function() {
			return this[key];
		};
		this["set" + part] = function(value) {
			if (value != this[key]) {
				this[key] = value;
				this._changed(flags[name] || 257);
			}
		};
	}, {}), {
		beans: true,
		getTextWrap: function() {
			const wrap = this._textWrap;
			return wrap && Base.set({}, wrap);
		},
		setTextWrap: function(wrap) {
			if (wrap || this._textWrap) {
				this._textWrap = wrap ? Base.set({
					offset: 6,
					invert: false
				}, Base.isPlainObject(wrap) ? wrap : null) : null;
				this._updateTextWrap();
				this._changed(257);
			}
		},
		_updateTextWrap: function(remove) {
			const layer = this.getLayer();
			if (layer) {
				const items = layer._textWrapItems || (layer._textWrapItems = {});
				if (this._textWrap && !remove) {
					items[this._id] = this;
				} else {
					delete items[this._id];
				}
				layer._textWrapVersion++;
			}
		},
		getSelection: function() {
			return this._selection;
		},
		setSelection: function(selection) {
			if (selection !== this._selection) {
				this._selection = selection;
				const project = this._project;
				if (project) {
					project._updateSelection(this);
					project._changed(257, this._getChangeOwner());
				}
			}
		},
		_changeSelection: function(flag, selected) {
			const selection = this._selection;
			this.setSelection(selected ? selection | flag : selection & ~flag);
		},
		isSelected: function() {
			if (this._selectChildren) {
				const children = this._children;
				for (let i = 0, l = children.length; i < l; i++) if (children[i].isSelected()) return true;
			}
			return !!(this._selection & 1);
		},
		setSelected: function(selected) {
			if (this._selectChildren) {
				const children = this._children;
				for (let i = 0, l = children.length; i < l; i++) children[i].setSelected(selected);
			}
			this._changeSelection(1, selected);
		},
		isFullySelected: function() {
			const children = this._children;
			const selected = !!(this._selection & 1);
			if (children && selected) {
				for (let i = 0, l = children.length; i < l; i++) if (!children[i].isFullySelected()) return false;
				return true;
			}
			return selected;
		},
		setFullySelected: function(selected) {
			const children = this._children;
			if (children) {
				for (let i = 0, l = children.length; i < l; i++) children[i].setFullySelected(selected);
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
				if (this._parent) this._parent._changed(2048);
			}
		},
		getData: function() {
			if (!this._data) this._data = {};
			return this._data;
		},
		setData: function(data) {
			this._data = data;
		},
		getPosition: function(_dontLink) {
			const ctor = _dontLink ? Point : LinkedPoint;
			const position = this._position || (this._position = this._getPositionFromBounds());
			return new ctor(position.x, position.y, this, "setPosition");
		},
		setPosition: function() {
			this.translate(Point.read(arguments).subtract(this.getPosition(true)));
		},
		_getPositionFromBounds: function(bounds) {
			return this._pivot ? this._matrix._transformPoint(this._pivot) : (bounds || this.getBounds()).getCenter(true);
		},
		getPivot: function() {
			const pivot = this._pivot;
			return pivot ? new LinkedPoint(pivot.x, pivot.y, this, "setPivot") : null;
		},
		setPivot: function() {
			this._pivot = Point.read(arguments, 0, {
				clone: true,
				readNull: true
			});
			this._position = undefined;
		}
	}, Base.each({
		getHandleBounds: { handle: true },
		getInternalBounds: { internal: true }
	}, function(options, key) {
		this[key] = function(matrix) {
			return this.getBounds(matrix, options);
		};
	}, {
		beans: true,
		getBounds: function(matrix, options) {
			const hasMatrix = options || matrix instanceof Matrix;
			const opts = Base.set({}, hasMatrix ? options : matrix, this._boundsOptions);
			if (!opts.stroke || this.getStrokeScaling()) opts.cacheItem = this;
			const rect = this._getCachedBounds(hasMatrix && matrix, opts).rect;
			return !arguments.length ? new LinkedRectangle(rect.x, rect.y, rect.width, rect.height, this, "setBounds") : rect;
		},
		getStrokeBounds: function(matrix) {
			const rect = this.getBounds(matrix, { stroke: true });
			return !arguments.length ? new LinkedRectangle(rect.x, rect.y, rect.width, rect.height, this, "setStrokeBounds") : rect;
		},
		setBounds: function() {
			const rect = Rectangle.read(arguments);
			let bounds = this.getBounds();
			const _matrix = this._matrix;
			const matrix = new Matrix();
			let center = rect.getCenter();
			matrix.translate(center);
			if (rect.width != bounds.width || rect.height != bounds.height) {
				if (!_matrix.isInvertible()) {
					_matrix.set(_matrix._backup || new Matrix().translate(_matrix.getTranslation()));
					bounds = this.getBounds();
				}
				matrix.scale(bounds.width !== 0 ? rect.width / bounds.width : 1, bounds.height !== 0 ? rect.height / bounds.height : 1);
			}
			center = bounds.getCenter();
			matrix.translate(-center.x, -center.y);
			this.transform(matrix);
		},
		setStrokeBounds: function() {
			const rect = Rectangle.read(arguments);
			const item = this;
			const bounds = this.getBounds();
			const center = bounds.getCenter();
			const signX = rect.width < 0 ? -1 : 1;
			const signY = rect.height < 0 ? -1 : 1;
			const width = Math.abs(rect.width);
			const height = Math.abs(rect.height);
			const canScaleX = !!bounds.width;
			const canScaleY = !!bounds.height;
			const min = 1e-12;
			const epsilon = 1e-7;
			let sx = 1;
			let sy = 1;
			function getMatrix(sx, sy) {
				return new Matrix().scale(signX * sx, signY * sy, center);
			}
			function getStrokeBounds(sx, sy) {
				const matrix = getMatrix(sx, sy);
				return item.getBounds(matrix.appended(item._matrix), {
					stroke: true,
					transform: {
						matrix,
						item
					}
				});
			}
			for (let i = 0; i < 16; i++) {
				const size = getStrokeBounds(sx, sy).getSize();
				const fx = canScaleX ? size.width - width : 0;
				const fy = canScaleY ? size.height - height : 0;
				if (Math.abs(fx) < epsilon && Math.abs(fy) < epsilon) break;
				const hx = Math.max(sx, 1) * 1e-6;
				const hy = Math.max(sy, 1) * 1e-6;
				const sizeX = getStrokeBounds(sx + hx, sy).getSize();
				const sizeY = getStrokeBounds(sx, sy + hy).getSize();
				const a = canScaleX ? (sizeX.width - size.width) / hx : 1;
				const b = canScaleX && canScaleY ? (sizeY.width - size.width) / hy : 0;
				const c = canScaleX && canScaleY ? (sizeX.height - size.height) / hx : 0;
				const d = canScaleY ? (sizeY.height - size.height) / hy : 1;
				const det = a * d - b * c;
				if (!det) break;
				const nx = Math.max(sx - (fx * d - fy * b) / det, min);
				const ny = Math.max(sy - (fy * a - fx * c) / det, min);
				if (nx === sx && ny === sy) break;
				sx = nx;
				sy = ny;
			}
			this.transform(new Matrix().translate(rect.getCenter().subtract(getStrokeBounds(sx, sy).getCenter())).append(getMatrix(sx, sy)));
		},
		_getBounds: function(matrix, options) {
			const children = this._children;
			if (!children || !children.length) return new Rectangle();
			Item._updateBoundsCache(this, options.cacheItem);
			return Item._getBounds(children, matrix, options);
		},
		_getBoundsCacheKey: function(options, internal) {
			return [
				options.stroke ? 1 : 0,
				options.handle ? 1 : 0,
				internal ? 1 : 0
			].join("");
		},
		_getCachedBounds: function(matrix, options, noInternal) {
			let cached;
			const internal = options.internal && !noInternal;
			const cacheItem = options.cacheItem;
			const _matrix = internal ? null : this._matrix._orNullIfIdentity();
			matrix = matrix ? matrix._orNullIfIdentity() : _matrix;
			const cacheKey = cacheItem && (matrix ? matrix.equals(_matrix) : !_matrix) && this._getBoundsCacheKey(options, internal);
			const isIntermediate = cacheKey && cacheItem !== this && (this._children || this._definition);
			let bounds = this._bounds;
			Item._updateBoundsCache(this._parent || this._symbol, cacheItem);
			if (isIntermediate) Item._updateBoundsCache(this, cacheItem);
			if (cacheKey && bounds && cacheKey in bounds) {
				cached = bounds[cacheKey];
				return {
					rect: cached.rect.clone(),
					nonscaling: cached.nonscaling
				};
			}
			const res = this._getBounds(matrix, isIntermediate ? Base.set({}, options, { cacheItem: this }) : options);
			const rect = res.rect || res;
			const style = this._style;
			const nonscaling = res.nonscaling || style.hasStroke() && !style.getStrokeScaling();
			if (cacheKey) {
				if (!bounds) {
					this._bounds = bounds = {};
				}
				bounds[cacheKey] = {
					rect: rect.clone(),
					nonscaling,
					stroke: options.stroke,
					internal
				};
			}
			return {
				rect,
				nonscaling
			};
		},
		_getStrokeMatrix: function(matrix, options) {
			const parent = this.getStrokeScaling() ? null : options && options.internal ? this : this._parent || this._symbol && this._symbol._item;
			let mx = parent ? parent.getViewMatrix().invert() : matrix;
			const transform = !parent && options && options.transform;
			if (transform) {
				for (let item = this; item && item._applyMatrix; item = item._parent) {
					if (item === transform.item) {
						mx = transform.matrix.inverted().appended(mx);
						break;
					}
				}
			}
			return mx && mx._shiftless();
		},
		statics: {
			_updateBoundsCache: function(parent, item) {
				if (parent && item) {
					const id = item._id;
					const ref = parent._boundsCache = parent._boundsCache || {
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
				const cache = item._boundsCache;
				if (cache) {
					item._bounds = item._position = item._boundsCache = undefined;
					for (let i = 0, list = cache.list, l = list.length; i < l; i++) {
						const other = list[i];
						if (other !== item) {
							other._bounds = other._position = undefined;
							if (other._boundsCache) Item._clearBoundsCache(other);
						}
					}
				}
			},
			getBounds: function(items, options) {
				return Item._getBounds(items, null, options, true).rect;
			},
			_getBounds: function(items, matrix, options, global) {
				let x1 = Infinity;
				let x2 = -x1;
				let y1 = x1;
				let y2 = x2;
				let nonscaling = false;
				options = options || {};
				for (let i = 0, l = items.length; i < l; i++) {
					const item = items[i];
					if (item._visible && !item.isEmpty(true)) {
						const bounds = item._getCachedBounds(global ? item.getGlobalMatrix(true) : matrix && matrix.appended(item._matrix), options, true);
						const rect = bounds.rect;
						x1 = Math.min(rect.x, x1);
						y1 = Math.min(rect.y, y1);
						x2 = Math.max(rect.x + rect.width, x2);
						y2 = Math.max(rect.y + rect.height, y2);
						if (bounds.nonscaling) nonscaling = true;
					}
				}
				return {
					rect: isFinite(x1) ? new Rectangle(x1, y1, x2 - x1, y2 - y1) : new Rectangle(),
					nonscaling
				};
			}
		}
	}), {
		beans: true,
		_decompose: function() {
			return this._applyMatrix ? null : this._decomposed || (this._decomposed = this._matrix.decompose());
		},
		getRotation: function() {
			const decomposed = this._decompose();
			return decomposed ? decomposed.rotation : 0;
		},
		setRotation: function(rotation) {
			const current = this.getRotation();
			if (current != null && rotation != null) {
				const decomposed = this._decomposed;
				this.rotate(rotation - current);
				if (decomposed) {
					decomposed.rotation = rotation;
					this._decomposed = decomposed;
				}
			}
		},
		getScaling: function() {
			const decomposed = this._decompose();
			const s = decomposed && decomposed.scaling;
			return new LinkedPoint(s ? s.x : 1, s ? s.y : 1, this, "setScaling");
		},
		setScaling: function() {
			const current = this.getScaling();
			const scaling = Point.read(arguments, 0, {
				clone: true,
				readNull: true
			});
			if (current && scaling && !current.equals(scaling)) {
				const rotation = this.getRotation();
				const decomposed = this._decomposed;
				const matrix = new Matrix();
				const isZero = Numerical.isZero;
				if (isZero(current.x) || isZero(current.y)) {
					matrix.translate(decomposed.translation);
					if (rotation) {
						matrix.rotate(rotation);
					}
					matrix.scale(scaling.x, scaling.y);
					this._matrix.set(matrix);
				} else {
					const center = this.getPosition(true);
					matrix.translate(center);
					if (rotation) matrix.rotate(rotation);
					matrix.scale(scaling.x / current.x, scaling.y / current.y);
					if (rotation) matrix.rotate(-rotation);
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
			const matrix = this._matrix;
			matrix.set.apply(matrix, arguments);
		},
		getGlobalMatrix: function(_dontClone) {
			const parent = this._parent;
			const parentMatrix = parent && parent.getGlobalMatrix(true);
			let matrix = this._globalMatrix;
			if (!matrix || this._parentGlobalMatrix !== parentMatrix) {
				matrix = this._globalMatrix = this._matrix.clone();
				if (parentMatrix) matrix.prepend(parentMatrix);
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
			if (this._applyMatrix = this._canApplyMatrix && !!apply) this.transform(null, true);
		},
		getTransformContent: "#getApplyMatrix",
		setTransformContent: "#setApplyMatrix"
	}, {
		getProject: function() {
			return this._project;
		},
		_setProject: function(project, installEvents) {
			if (this._project !== project) {
				this._project = project;
				const children = this._children;
				for (let i = 0, l = children && children.length; i < l; i++) children[i]._setProject(project);
			}
			if (installEvents) this._installEvents(true);
		},
		getView: function() {
			return this._project._view;
		},
		getScope: function() {
			return this._project._scope;
		},
		_installEvents: function _installEvents(install) {
			_installEvents.base.call(this, install);
			if (this._selection) this._project._updateSelection(this, !install);
			if (this._textWrap) this._updateTextWrap(!install);
			const children = this._children;
			for (let i = 0, l = children && children.length; i < l; i++) children[i]._installEvents(install);
		},
		getLayer: function() {
			let parent = this;
			while (parent = parent._parent) {
				if (parent instanceof Layer) return parent;
			}
			return null;
		},
		getParent: function() {
			return this._parent;
		},
		setParent: function(item) {
			return item.addChild(this);
		},
		_getOwner: "#getParent",
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
			return this._children && this._children[this._children.length - 1] || null;
		},
		getNextSibling: function() {
			const owner = this._getOwner();
			return owner && owner._children[this._index + 1] || null;
		},
		getPreviousSibling: function() {
			const owner = this._getOwner();
			return owner && owner._children[this._index - 1] || null;
		},
		getIndex: function() {
			return this._index;
		},
		setIndex: function(index) {
			const parent = this._parent;
			const children = parent && parent._children;
			if (children) {
				parent.insertChildren(index in children ? index : undefined, [this]);
			}
		},
		equals: function(item) {
			return item === this || item && this._class === item._class && this._style.equals(item._style) && this._matrix.equals(item._matrix) && this._locked === item._locked && this._visible === item._visible && this._blendMode === item._blendMode && this._opacity === item._opacity && this._clipMask === item._clipMask && this._guide === item._guide && Base.equals(this._textWrap, item._textWrap) && this._equals(item) || false;
		},
		_equals: function(item) {
			return Base.equals(this._children, item._children);
		},
		clone: function(options) {
			let children;
			const copy = new this.constructor(Item.NO_INSERT);
			children = this._children;
			const insert = Base.pick(options ? options.insert : undefined, typeof options === "boolean" ? options : paper.settings.insertItems);
			const deep = Base.pick(options ? options.deep : undefined, true);
			if (children) copy.copyAttributes(this);
			if (!children || deep) copy.copyContent(this);
			if (!children) copy.copyAttributes(this);
			if (insert) copy.insertAbove(this);
			let name = this._name;
			const parent = this._parent;
			if (name && parent) {
				children = parent._children;
				const orig = name;
				let i = 1;
				while (children[name]) name = orig + " " + i++;
				if (name !== orig) copy.setName(name);
			}
			return copy;
		},
		copyContent: function(source) {
			const children = source._children;
			for (let i = 0, l = children && children.length; i < l; i++) {
				this.addChild(children[i].clone(false), true);
			}
		},
		copyAttributes: function(source, excludeMatrix) {
			this.setStyle(source._style);
			const keys = this._attributes;
			for (let i = 0, l = keys.length; i < l; i++) {
				const key = keys[i];
				if (source.hasOwnProperty(key)) this[key] = source[key];
			}
			if (!excludeMatrix) this._matrix.set(source._matrix, true);
			this.setApplyMatrix(source._applyMatrix);
			this.setPivot(source._pivot);
			this.setSelection(source._selection);
			const data = source._data;
			const name = source._name;
			const effects = source._effects;
			this._data = data ? Base.clone(data) : null;
			if (name) this.setName(name);
			this.setEffects(effects && effects.map(function(instance) {
				return instance._getProps();
			}));
		},
		rasterize: function(arg0, arg1) {
			let resolution;
			let insert;
			let raster;
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
			const bounds = this.getPreviewBounds();
			const scale = (resolution || this.getView().getResolution()) / 72;
			const topLeft = bounds.getTopLeft().floor();
			const bottomRight = bounds.getBottomRight().ceil();
			const boundsSize = new Size(bottomRight.subtract(topLeft));
			const rasterSize = boundsSize.multiply(scale);
			raster.setSize(rasterSize, true);
			if (!rasterSize.isZero()) {
				const ctx = raster.getContext(true);
				const matrix = new Matrix().translate(topLeft.negate());
				ctx.save();
				ctx.scale(scale, scale);
				matrix.applyToContext(ctx);
				this.draw(ctx, new Base({
					matrices: [matrix],
					pixelRatio: scale
				}));
				ctx.restore();
			}
			raster._matrix.set(new Matrix().translate(topLeft.add(boundsSize.divide(2))).scale(1 / scale));
			if (Base.pick(insert, paper.settings.insertItems)) {
				raster.insertAbove(this);
			}
			return raster;
		},
		contains: function() {
			const matrix = this._matrix;
			return matrix.isInvertible() && !!this._contains(matrix._inverseTransform(Point.read(arguments)));
		},
		_contains: function(point) {
			const children = this._children;
			if (children) {
				for (let i = children.length - 1; i >= 0; i--) {
					if (children[i].contains(point)) return true;
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
				insert: false
			});
		},
		intersects: function(item, _matrix) {
			if (!(item instanceof Item)) return false;
			const path1 = this._asPathItem();
			const path2 = item._asPathItem();
			const matrix1 = path1._matrix;
			const matrix2 = _matrix || path2._matrix;
			function contains(path, matrix, other, otherMatrix) {
				const paths = path._children || [path];
				for (let i = 0, l = paths.length; i < l; i++) {
					const segment = paths[i]._segments[0];
					const point = segment && otherMatrix._inverseTransform(matrix._transformPoint(segment._point));
					if (point && other._contains(point)) return true;
				}
				return false;
			}
			return path1.getIntersections(path2, null, _matrix, true).length > 0 || contains(path2, matrix2, path1, matrix1) || contains(path1, matrix1, path2, matrix2);
		}
	}, new (function() {
		function hitTest() {
			const args = arguments;
			return this._hitTest(Point.read(args), HitResult.getOptions(args));
		}
		function hitTestAll() {
			const args = arguments;
			const point = Point.read(args);
			const options = HitResult.getOptions(args);
			const all = [];
			this._hitTest(point, new Base({ all }, options));
			return all;
		}
		function hitTestChildren(point, options, viewMatrix, _exclude) {
			const children = this._children;
			if (children) {
				for (let i = children.length - 1; i >= 0; i--) {
					const child = children[i];
					const res = child !== _exclude && child._hitTest(point, options, viewMatrix);
					if (res && !options.all) return res;
				}
			}
			return null;
		}
		Project.inject({
			hitTest,
			hitTestAll,
			_hitTest: hitTestChildren
		});
		return {
			hitTest,
			hitTestAll,
			_hitTestChildren: hitTestChildren
		};
	})(), {
		_hitTest: function(point, options, parentViewMatrix) {
			if (this._locked || !this._visible || this._guide && !options.guides || !this._shell && this.isEmpty()) {
				return null;
			}
			const matrix = this._matrix;
			const pointMatrix = parentViewMatrix ? matrix : this.getGlobalMatrix();
			const viewMatrix = parentViewMatrix ? parentViewMatrix.appended(matrix) : pointMatrix.prepended(this.getView()._matrix);
			const tolerance = Math.max(options.tolerance, 1e-12);
			const tolerancePadding = options._tolerancePadding = new Size(Matrix._getCircleExtents(tolerance, viewMatrix.prepended(this.getView()._matrix.inverted())._shiftless().invert()));
			point = pointMatrix._inverseTransform(point);
			if (!point || (this._shell || !this._children) && !this.getBounds({
				internal: true,
				stroke: true,
				handle: true
			}).expand(tolerancePadding.multiply(2))._containsPoint(point)) {
				return null;
			}
			const checkSelf = !(options.guides && !this._guide || options.selected && !this.isSelected() || options.type && options.type !== Base.hyphenate(this._class) || options.class && !(this instanceof options.class));
			const match = options.match;
			const that = this;
			let bounds;
			let res;
			function filter(hit) {
				if (Array.isArray(hit)) {
					let first = null;
					for (let i = 0, l = hit.length; i < l; i++) {
						const res = filter(hit[i]);
						first = first || res;
					}
					return first;
				}
				if (hit && match && !match(hit)) hit = null;
				if (hit && options.all) {
					if (hit.point) hit.point = that.getGlobalMatrix().transform(hit.point);
					options.all.push(hit);
				}
				return hit;
			}
			function checkPoint(type, part) {
				const pt = part ? bounds["get" + part]() : that.getPosition();
				if (point.subtract(pt).divide(tolerancePadding).length <= 1) {
					return new HitResult(type, that, {
						name: part ? Base.hyphenate(part) : type,
						point: pt
					});
				}
			}
			const checkPosition = options.position;
			const checkCenter = options.center;
			const checkBounds = options.bounds;
			if (checkSelf && this._parent && (checkPosition || checkCenter || checkBounds)) {
				if (checkCenter || checkBounds) {
					bounds = this.getInternalBounds();
				}
				res = checkPosition && checkPoint("position") || checkCenter && checkPoint("center", "Center");
				if (!res && checkBounds) {
					const points = [
						"TopLeft",
						"TopRight",
						"BottomLeft",
						"BottomRight",
						"LeftCenter",
						"TopCenter",
						"RightCenter",
						"BottomCenter"
					];
					for (let i = 0; i < 8 && !res; i++) {
						res = checkPoint("bounds", points[i]);
					}
				}
				res = filter(res);
			}
			if (!res) {
				res = this._hitTestChildren(point, options, viewMatrix) || checkSelf && filter(this._hitTestSelf(point, options, viewMatrix, this.getStrokeScaling() ? null : viewMatrix._shiftless().invert())) || null;
			}
			if (res && res.point && !options.all) {
				res.point = pointMatrix.transform(res.point);
			}
			return res;
		},
		_hitTestSelf: function(point, options) {
			if (options.fill && this.getFillColor() && this._contains(point)) return new HitResult("fill", this);
		},
		matches: function(name, compare) {
			function matchObject(obj1, obj2) {
				for (const i in obj1) {
					if (obj1.hasOwnProperty(i)) {
						const val1 = obj1[i];
						const val2 = obj2[i];
						if (Base.isPlainObject(val1) && Base.isPlainObject(val2)) {
							if (!matchObject(val1, val2)) return false;
						} else if (!Base.equals(val1, val2)) {
							return false;
						}
					}
				}
				return true;
			}
			const type = typeof name;
			if (type === "object") {
				for (const key in name) {
					if (name.hasOwnProperty(key) && !this.matches(key, name[key])) return false;
				}
				return true;
			} else if (type === "function") {
				return name(this);
			} else if (name === "match") {
				return compare(this);
			} else {
				let value = /^(empty|editable)$/.test(name) ? this["is" + Base.capitalize(name)]() : name === "type" ? Base.hyphenate(this._class) : this[name];
				if (name === "class") {
					if (typeof compare === "function") return this instanceof compare;
					value = this._class;
				}
				if (typeof compare === "function") {
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
			return Item._getItems(this, options, this._matrix, null, true)[0] || null;
		},
		statics: { _getItems: function _getItems(item, options, matrix, param, firstOnly) {
			let bounds;
			let rect;
			if (!param) {
				const obj = typeof options === "object" && options;
				const overlapping = obj && obj.overlapping;
				const inside = obj && obj.inside;
				bounds = overlapping || inside;
				rect = bounds && Rectangle.read([bounds]);
				param = {
					items: [],
					recursive: !obj || obj.recursive !== false,
					inside: !!inside,
					overlapping: !!overlapping,
					rect,
					path: overlapping && new Path.Rectangle({
						rectangle: rect,
						insert: false
					})
				};
				if (obj) {
					options = Base.filter({}, options, {
						recursive: true,
						inside: true,
						overlapping: true
					});
				}
			}
			const children = item._children;
			const items = param.items;
			rect = param.rect;
			matrix = rect && (matrix || new Matrix());
			for (let i = 0, l = children && children.length; i < l; i++) {
				const child = children[i];
				const childMatrix = matrix && matrix.appended(child._matrix);
				let add = true;
				if (rect) {
					bounds = child.getBounds(childMatrix);
					if (!rect.intersects(bounds)) continue;
					if (!(rect.contains(bounds) || param.overlapping && param.path.intersects(child, childMatrix))) add = false;
				}
				if (add && child.matches(options)) {
					items.push(child);
					if (firstOnly) break;
				}
				if (param.recursive !== false && child.getChildren()) {
					_getItems(child, options, childMatrix, param, firstOnly);
				}
				if (firstOnly && items.length > 0) break;
			}
			return items;
		} }
	}, {
		importJSON: function(json) {
			json = typeof json === "string" ? JSON.parse(json) : json;
			const props = json && json[0] === this._class && json[1];
			if (Base.isPlainObject(props)) {
				const item = new this.constructor(Item.NO_INSERT);
				const fields = Base.set({}, this._serializeFields, this instanceof Group ? null : this._style._defaults);
				const defaults = {};
				for (const key in fields) {
					if (!(key in props) && !Base.equals(this[key], item[key])) defaults[key] = item[key];
				}
				this.set(defaults);
			}
			const res = Base.importJSON(json, this);
			return res !== this ? this.addChild(res) : res;
		},
		addChild: function(item) {
			return this.insertChild(undefined, item);
		},
		insertChild: function(index, item) {
			const res = item ? this.insertChildren(index, [item]) : null;
			return res && res[0];
		},
		addChildren: function(items) {
			return this.insertChildren(this._children.length, items);
		},
		insertChildren: function(index, items) {
			let i;
			let item;
			let l;
			const children = this._children;
			if (children && items && items.length > 0) {
				items = Base.slice(items);
				const inserted = {};
				for (i = items.length - 1; i >= 0; i--) {
					item = items[i];
					const id = item && item._id;
					if (!item || inserted[id] || item === this || this.isDescendant(item)) {
						items.splice(i, 1);
					} else {
						item._remove(false, true);
						inserted[id] = true;
					}
				}
				if (!items.length) return null;
				Base.splice(children, items, index, 0);
				const project = this._project;
				const notifySelf = project._changes;
				for (i = 0, l = items.length; i < l; i++) {
					item = items[i];
					const name = item._name;
					item._parent = this;
					item._setProject(project, true);
					if (name) item.setName(name);
					if (notifySelf) item._changed(5);
				}
				this._changed(11);
			} else {
				items = null;
			}
			return items;
		},
		_insertItem: "#insertChild",
		_insertAt: function(item, offset) {
			const owner = item && item._getOwner();
			const res = item !== this && owner ? this : null;
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
			const owner = this._getOwner();
			return owner ? owner._insertItem(0, this) : null;
		},
		bringToFront: function() {
			const owner = this._getOwner();
			return owner ? owner._insertItem(undefined, this) : null;
		},
		appendTop: "#addChild",
		appendBottom: function(item) {
			return this.insertChild(0, item);
		},
		moveAbove: "#insertAbove",
		moveBelow: "#insertBelow",
		addTo: function(owner) {
			return owner._insertItem(undefined, this);
		},
		copyTo: function(owner) {
			return this.clone(false).addTo(owner);
		},
		reduce: function(options) {
			const children = this._children;
			if (children && children.length === 1) {
				const child = children[0].reduce(options);
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
			const owner = this._getOwner();
			if (owner) Base.removeNamed(owner._children, owner._namedChildren, this._name, this);
		},
		_remove: function(notifySelf, notifyParent) {
			const owner = this._getOwner();
			const project = this._project;
			const index = this._index;
			if (this._style) this._style._dispose();
			if (owner) {
				if (this._name) this._removeNamed();
				this._installEvents(false);
				if (notifySelf && project._changes) this._changed(5);
				if (index != null) {
					if (project._activeLayer === this) project._activeLayer = this.getNextSibling() || this.getPreviousSibling();
					Base.splice(owner._children, null, index, 1);
				}
				if (notifyParent) owner._changed(11, this);
				this._parent = null;
				return true;
			}
			return false;
		},
		remove: function() {
			return this._remove(true, true);
		},
		replaceWith: function(item) {
			let ok = item;
			for (let i = 0, l = arguments.length; i < l && ok; i++) ok = arguments[i] && arguments[i].insertBelow(this);
			if (ok) this.remove();
			return ok && item;
		},
		removeChildren: function(start, end) {
			if (!this._children) return null;
			start = start || 0;
			end = Base.pick(end, this._children.length);
			const removed = Base.splice(this._children, null, start, end - start);
			for (let i = removed.length - 1; i >= 0; i--) {
				removed[i]._remove(true, false);
			}
			if (removed.length > 0) this._changed(11);
			return removed;
		},
		clear: "#removeChildren",
		reverseChildren: function() {
			if (this._children) {
				this._children.reverse();
				for (let i = 0, l = this._children.length; i < l; i++) this._children[i]._index = i;
				this._changed(11);
			}
		},
		isEmpty: function(recursively) {
			const children = this._children;
			const numChildren = children ? children.length : 0;
			if (recursively) {
				for (let i = 0; i < numChildren; i++) {
					if (!children[i].isEmpty(recursively)) {
						return false;
					}
				}
				return true;
			}
			return !numChildren;
		},
		isEditable: function() {
			let item = this;
			while (item) {
				if (!item._visible || item._locked) return false;
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
				const list = [];
				do {
					list.unshift(item);
				} while (item = item._parent);
				return list;
			}
			const list1 = getList(this);
			const list2 = getList(item);
			for (let i = 0, l = Math.min(list1.length, list2.length); i < l; i++) {
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
			let parent = this;
			while (parent = parent._parent) {
				if (parent === item) return true;
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
			let parent = this._parent;
			while (parent) {
				if (parent._parent && /^(Group|Layer|CompoundPath)$/.test(parent._class) && item.isDescendant(parent)) return true;
				parent = parent._parent;
			}
			return false;
		}
	}, Base.each([
		"rotate",
		"scale",
		"shear",
		"skew"
	], function(key) {
		const rotate = key === "rotate";
		this[key] = function() {
			const args = arguments;
			const value = (rotate ? Base : Point).read(args);
			const center = Point.read(args, 0, { readNull: true });
			return this.transform(new Matrix()[key](value, center || this.getPosition(true)));
		};
	}, {
		translate: function() {
			const mx = new Matrix();
			return this.transform(mx.translate.apply(mx, arguments));
		},
		transform: function(matrix, _applyRecursively, _setApplyMatrix) {
			const _matrix = this._matrix;
			const transformMatrix = matrix && !matrix.isIdentity();
			let applyMatrix = _setApplyMatrix && this._canApplyMatrix || this._applyMatrix && (transformMatrix || !_matrix.isIdentity() || _applyRecursively && this._children);
			if (!transformMatrix && !applyMatrix) return this;
			if (transformMatrix) {
				if (!matrix.isInvertible() && _matrix.isInvertible()) _matrix._backup = _matrix.getValues();
				_matrix.prepend(matrix, true);
				const style = this._style;
				const fillColor = style.getFillColor(true);
				const strokeColor = style.getStrokeColor(true);
				if (fillColor) fillColor.transform(matrix);
				if (strokeColor) strokeColor.transform(matrix);
			}
			if (applyMatrix && (applyMatrix = this._transformContent(_matrix, _applyRecursively, _setApplyMatrix))) {
				const pivot = this._pivot;
				if (pivot) _matrix._transformPoint(pivot, pivot, true);
				_matrix.reset(true);
				if (_setApplyMatrix && this._canApplyMatrix) this._applyMatrix = true;
			}
			const bounds = this._bounds;
			const position = this._position;
			if (transformMatrix || applyMatrix) {
				this._changed(25);
			}
			const decomp = transformMatrix && bounds && matrix.decompose();
			if (decomp && decomp.skewing.isZero() && decomp.rotation % 90 === 0) {
				for (const key in bounds) {
					const cache = bounds[key];
					if (cache.nonscaling || applyMatrix && cache.stroke && !decomp.scaling.abs().equals([1, 1])) {
						delete bounds[key];
					} else if (applyMatrix || !cache.internal) {
						const rect = cache.rect;
						matrix._transformBounds(rect, rect);
					}
				}
				this._bounds = bounds;
				const cached = bounds[this._getBoundsCacheKey(this._boundsOptions || {})];
				if (cached) {
					this._position = this._getPositionFromBounds(cached.rect);
				}
			} else if (transformMatrix && position && this._pivot) {
				this._position = matrix._transformPoint(position, position);
			}
			return this;
		},
		_transformContent: function(matrix, applyRecursively, setApplyMatrix) {
			const children = this._children;
			if (children) {
				for (let i = 0, l = children.length; i < l; i++) {
					children[i].transform(matrix, applyRecursively, setApplyMatrix);
				}
				return true;
			}
		},
		globalToLocal: function() {
			return this.getGlobalMatrix(true)._inverseTransform(Point.read(arguments));
		},
		localToGlobal: function() {
			return this.getGlobalMatrix(true)._transformPoint(Point.read(arguments));
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
			if (fit === true) fit = "cover";
			const bounds = this.getBounds();
			const hor = rectangle.width / bounds.width;
			const ver = rectangle.height / bounds.height;
			let size;
			function isScaling(ratio) {
				return ratio > 0 && isFinite(ratio);
			}
			if (fit === "fill") {
				size = new Size(isScaling(hor) ? rectangle.width : bounds.width, isScaling(ver) ? rectangle.height : bounds.height);
			} else {
				const ratios = [hor, ver].filter(isScaling);
				const scale = !ratios.length ? 1 : fit === "cover" ? Math.max.apply(Math, ratios) : Math.min.apply(Math, ratios);
				size = bounds.getSize().multiply(scale);
			}
			this.setBounds(new Rectangle(new Point(), size).setCenter(rectangle.getCenter()));
		}
	}), {
		_setStyles: function(ctx, param, viewMatrix, strokeMatrix, style) {
			const matrix = this._matrix;
			style = style || this._style;
			if (style.hasFill()) {
				ctx.fillStyle = style.getFillColor().toCanvasStyle(ctx, matrix, strokeMatrix);
			}
			if (style.hasStroke()) {
				ctx.strokeStyle = style.getStrokeColor().toCanvasStyle(ctx, matrix, strokeMatrix);
				ctx.lineWidth = style.getStrokeWidth();
				const strokeJoin = style.getStrokeJoin();
				const strokeCap = style.getStrokeCap();
				const miterLimit = style.getMiterLimit();
				if (strokeJoin) ctx.lineJoin = strokeJoin;
				if (strokeCap) ctx.lineCap = strokeCap;
				if (miterLimit) ctx.miterLimit = miterLimit;
				const dashArray = style.getDashArray();
				if (dashArray && dashArray.length) {
					ctx.setLineDash(dashArray);
					ctx.lineDashOffset = style.getDashOffset();
				}
			}
			if (this._style.hasShadow() && !param.dontShadow) this._setShadow(ctx, param, viewMatrix);
		},
		_paint: function(ctx, param, viewMatrix, strokeMatrix) {
			const style = this._style;
			const hasFill = style.hasFill();
			const hasStroke = style.hasStroke();
			if (hasFill || hasStroke) {
				const isStrokeFirst = hasStroke && style.getPaintOrder() === "stroke";
				this._setStyles(ctx, param, viewMatrix, strokeMatrix);
				if (isStrokeFirst) {
					ctx.stroke();
					ctx.shadowColor = "rgba(0,0,0,0)";
				}
				if (hasFill) {
					const fillColor = style.getFillColor();
					const ellipse = fillColor._getEllipseMatrix(this._matrix, strokeMatrix);
					if (ellipse) {
						ctx.save();
						ellipse.applyToContext(ctx);
						ctx.fillStyle = fillColor.toCanvasStyle(ctx, null, null, true);
					}
					ctx.fill(style.getFillRule());
					if (ellipse) ctx.restore();
					ctx.shadowColor = "rgba(0,0,0,0)";
				}
				if (hasStroke && !isStrokeFirst) ctx.stroke();
			}
		},
		_setShadow: function(ctx, param, viewMatrix) {
			const style = this._style;
			const pixelRatio = param.pixelRatio || 1;
			const mx = viewMatrix._shiftless().prepend(new Matrix().scale(pixelRatio, pixelRatio));
			const blur = mx.transform(new Point(style.getShadowBlur(), 0));
			const offset = mx.transform(this.getShadowOffset());
			ctx.shadowColor = style.getShadowColor().toCanvasStyle(ctx);
			ctx.shadowBlur = blur.getLength();
			ctx.shadowOffsetX = offset.x;
			ctx.shadowOffsetY = offset.y;
		},
		draw: function(ctx, param, parentStrokeMatrix) {
			let offset;
			this._updateVersion = this._project._updateVersion;
			if (!this._visible || this._opacity === 0) return;
			const matrices = param.matrices;
			let viewMatrix = param.viewMatrix;
			const matrix = this._matrix;
			const parentMatrix = matrices[matrices.length - 1];
			const globalMatrix = parentMatrix.appended(matrix);
			if (!globalMatrix.isInvertible()) return;
			viewMatrix = viewMatrix ? viewMatrix.appended(globalMatrix) : globalMatrix;
			matrices.push(globalMatrix);
			if (param.updateMatrix) {
				this._globalMatrix = globalMatrix;
				this._parentGlobalMatrix = this._parent && parentMatrix;
			}
			const blendMode = this._blendMode;
			const opacity = Numerical.clamp(this._opacity, 0, 1);
			const normalBlend = blendMode === "normal";
			const nativeBlend = BlendMode.nativeModes[blendMode];
			const style = this._style;
			const shadow = (normalBlend || nativeBlend) && style.getShadowColor(true) && style.hasShadow() && style.hasFill() && style.hasStroke();
			const direct = !shadow && (normalBlend && opacity === 1 && !(this instanceof Group && this.isIsolated()) || (nativeBlend || normalBlend && opacity < 1) && this._canComposite()) || param.dontStart || param.clip;
			const pixelRatio = param.pixelRatio || 1;
			let mainCtx;
			let itemOffset;
			let prevOffset;
			let itemSize;
			let buffer;
			let isFresh;
			if (!direct) {
				buffer = this._buffered && param.view && !param.clipItem && (this._buffer || (this._buffer = {}));
				const version = this._project._bufferVersion;
				isFresh = buffer && viewMatrix.equals(buffer.matrix) && buffer.version === version;
				let bounds = isFresh ? buffer.bounds : this.getPreviewBounds(viewMatrix);
				if (!isFresh && style.getShadowColor(true)) {
					const mx = viewMatrix._shiftless();
					const blur = mx.transform(new Point(style.getShadowBlur(true), 0));
					offset = mx.transform(style.getShadowOffset(true));
					bounds = bounds.unite(new Rectangle(bounds.getPoint().add(offset), bounds.getSize()).expand(blur.getLength() * 3));
				}
				if (buffer) {
					buffer.matrix = viewMatrix;
					buffer.version = version;
					buffer.bounds = bounds;
				}
				const canvas = ctx.canvas;
				bounds = bounds.intersect(new Rectangle(new Point(param.offset), new Size(canvas.width, canvas.height).divide(pixelRatio)));
				if (bounds.width <= 0 || bounds.height <= 0) {
					matrices.pop();
					return;
				}
				prevOffset = param.offset;
				itemOffset = param.offset = bounds.getTopLeft().floor();
				itemSize = bounds.getSize().ceil().add(1).multiply(pixelRatio).floor();
				mainCtx = ctx;
				if (buffer) {
					let bufferCanvas = buffer.canvas;
					isFresh = isFresh && itemOffset.equals(buffer.offset) && itemSize.equals(buffer.size);
					if (!bufferCanvas || bufferCanvas.width < itemSize.width || bufferCanvas.height < itemSize.height) {
						bufferCanvas = buffer.canvas = self.OffscreenCanvas ? new self.OffscreenCanvas(itemSize.width, itemSize.height) : CanvasProvider.getCanvas(itemSize);
						isFresh = false;
					}
					buffer.offset = itemOffset;
					buffer.size = itemSize;
					ctx = bufferCanvas.getContext("2d");
					ctx.setTransform(1, 0, 0, 1, 0, 0);
					if (!isFresh) ctx.clearRect(0, 0, bufferCanvas.width, bufferCanvas.height);
				} else {
					ctx = CanvasProvider.getContext(itemSize, { minimum: true });
				}
				if (pixelRatio !== 1) ctx.scale(pixelRatio, pixelRatio);
			}
			ctx.save();
			const strokeMatrix = parentStrokeMatrix ? parentStrokeMatrix.appended(matrix) : this._canScaleStroke && !this.getStrokeScaling(true) && viewMatrix;
			const clip = !direct && param.clipItem;
			const event = this.responds("draw") && !isFresh && !param.clip && !param.dontStart && new DrawEvent({
				item: this,
				context: ctx,
				matrix: viewMatrix.clone(),
				pixelRatio,
				view: param.view || null
			});
			const transform = !strokeMatrix || clip || event;
			if (direct) {
				ctx.globalAlpha = opacity;
				if (nativeBlend) ctx.globalCompositeOperation = blendMode;
			} else if (transform) {
				ctx.translate(-itemOffset.x, -itemOffset.y);
			}
			if (clip) {
				;
				(param.viewMatrix ? param.viewMatrix.appended(parentMatrix) : parentMatrix).applyToContext(ctx);
				param.clipItem.draw(ctx, param.extend({
					clip: true,
					matrices: matrices.slice(0, -1)
				}));
				matrix.applyToContext(ctx);
			} else if (transform) {
				;
				(direct ? matrix : viewMatrix).applyToContext(ctx);
			}
			if (event) {
				ctx.save();
				this.emit("draw", event);
				ctx.restore();
			}
			if (strokeMatrix) {
				ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
				offset = param.offset;
				if (offset) ctx.translate(-offset.x, -offset.y);
			}
			if (!isFresh && !(event && event.prevented)) {
				const drawParam = shadow && !direct ? param.extend({ dontShadow: true }) : param;
				const output = this.getEffectOutput();
				if (output) {
					output.draw(ctx, drawParam.extend({ updateMatrix: false }), strokeMatrix);
				} else {
					this._draw(ctx, drawParam, viewMatrix, strokeMatrix);
				}
			}
			ctx.restore();
			matrices.pop();
			if (param.clip && !param.dontFinish) {
				ctx.clip(this.getFillRule());
			}
			if (!direct) {
				if (shadow) {
					mainCtx.save();
					this._setShadow(mainCtx, param, viewMatrix);
				}
				BlendMode.process(blendMode, ctx, mainCtx, opacity, itemOffset.subtract(prevOffset).multiply(pixelRatio), itemSize);
				if (shadow) mainCtx.restore();
				if (!buffer) CanvasProvider.release(ctx);
				param.offset = prevOffset;
			}
		},
		_isUpdated: function(updateVersion) {
			const parent = this._parent;
			if (parent instanceof CompoundPath) return parent._isUpdated(updateVersion);
			let updated = this._updateVersion === updateVersion;
			if (!updated && parent && parent._visible && parent._isUpdated(updateVersion)) {
				this._updateVersion = updateVersion;
				updated = true;
			}
			return updated;
		},
		_drawSelection: function(ctx, matrix, size, selectionItems, updateVersion, handlersOnly) {
			const selection = this._selection;
			let itemSelected = selection & 1;
			const boundsSelected = selection & 2 || itemSelected && this._selectBounds;
			const strokeBoundsSelected = selection & 8;
			const positionSelected = selection & 4;
			if (!this._drawSelected) itemSelected = false;
			if (selection && this._isUpdated(updateVersion) && this.isInserted()) {
				let layer;
				const color = this.getSelectedColor(true) || (layer = this.getLayer()) && layer.getSelectedColor(true);
				const mx = matrix.appended(this.getGlobalMatrix(true));
				const half = size / 2;
				ctx.strokeStyle = ctx.fillStyle = color ? color.toCanvasStyle(ctx) : "#009dec";
				if (this.responds("drawselection")) {
					const event = new DrawEvent({
						item: this,
						context: ctx,
						matrix: mx.clone(),
						size,
						color: color || new Color(ctx.strokeStyle),
						view: this.getView()
					});
					ctx.save();
					this.emit("drawselection", event);
					ctx.restore();
					if (event.prevented) return;
				}
				if (handlersOnly) return;
				if (itemSelected) this._drawSelected(ctx, mx, selectionItems);
				if (positionSelected) {
					const pos = this.getPosition(true);
					const parent = this._parent;
					const point = parent ? parent.localToGlobal(pos) : pos;
					const x = point.x;
					const y = point.y;
					ctx.beginPath();
					ctx.arc(x, y, half, 0, Math.PI * 2, true);
					ctx.stroke();
					const deltas = [
						[0, -1],
						[1, 0],
						[0, 1],
						[-1, 0]
					];
					const start = half;
					const end = size + 1;
					for (let i = 0; i < 4; i++) {
						const delta = deltas[i];
						const dx = delta[0];
						const dy = delta[1];
						ctx.moveTo(x + dx * start, y + dy * start);
						ctx.lineTo(x + dx * end, y + dy * end);
						ctx.stroke();
					}
				}
				const drawBounds = function(bounds) {
					let i;
					const coords = mx._transformCorners(bounds);
					ctx.beginPath();
					for (i = 0; i < 8; i++) {
						ctx[!i ? "moveTo" : "lineTo"](coords[i], coords[++i]);
					}
					ctx.closePath();
					ctx.stroke();
					for (i = 0; i < 8; i++) {
						ctx.fillRect(coords[i] - half, coords[++i] - half, size, size);
					}
				};
				if (boundsSelected) drawBounds(this.getInternalBounds());
				if (strokeBoundsSelected) drawBounds(this.getBounds({
					internal: true,
					stroke: true
				}));
			}
		},
		_canComposite: function() {
			return false;
		}
	}, Base.each([
		"down",
		"drag",
		"up",
		"move"
	], function(key) {
		this["removeOn" + Base.capitalize(key)] = function() {
			const hash = {};
			hash[key] = true;
			return this.removeOn(hash);
		};
	}, { removeOn: function(obj) {
		for (const name in obj) {
			if (obj[name]) {
				const key = "mouse" + name;
				const project = this._project;
				const sets = project._removeSets = project._removeSets || {};
				sets[key] = sets[key] || {};
				sets[key][this._id] = this;
			}
		}
		return this;
	} }), {
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
			const easing = options && options.easing;
			const start = options && options.start;
			const duration = options != null && (typeof options === "number" ? options : options.duration);
			const tween = new Tween(this, from, to, duration, easing, start);
			function onFrame(event) {
				tween._handleFrame(event.time * 1e3);
				if (!tween.running) {
					this.off("frame", onFrame);
				}
			}
			if (duration) {
				this.on("frame", onFrame);
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
	const Group = Item.extend({
		_class: "Group",
		_selectBounds: false,
		_selectChildren: true,
		_serializeFields: {
			isolated: false,
			buffered: false,
			children: []
		},
		_isolated: false,
		_buffered: false,
		_attributes: Item.prototype._attributes.concat(["_isolated", "_buffered"]),
		initialize: function Group(arg) {
			this._children = [];
			this._namedChildren = {};
			if (!this._initialize(arg)) this.addChildren(Array.isArray(arg) ? arg : arguments);
		},
		_getStyles: function() {
			const children = this._children;
			return children.length > 0 ? children.map(function(child) {
				return child._style;
			}) : null;
		},
		_changed: function _changed(flags) {
			_changed.base.call(this, flags);
			if (flags & 2050) {
				this._clipItem = undefined;
			}
		},
		_getClipItem: function() {
			let clipItem = this._clipItem;
			if (clipItem === undefined) {
				clipItem = null;
				const children = this._children;
				for (let i = 0, l = children.length; i < l; i++) {
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
			const child = this.getFirstChild();
			if (child) child.setClipMask(clipped);
		},
		ungroup: function() {
			if (!this._parent) return null;
			const children = this._children.slice();
			const clipItem = this._getClipItem();
			const matrix = this._matrix;
			if (clipItem) clipItem.setClipMask(false);
			if (!matrix.isIdentity()) {
				for (let i = 0, l = children.length; i < l; i++) children[i].transform(matrix);
			}
			return this.replaceWith.apply(this, children) ? children : null;
		},
		isIsolated: function() {
			return this._isolated || this._buffered;
		},
		setIsolated: function(isolated) {
			this._isolated = !!isolated;
			this._changed(257);
		},
		isBuffered: function() {
			return this._buffered;
		},
		setBuffered: function(buffered) {
			this._buffered = !!buffered;
			this._buffer = null;
			this._changed(257);
		},
		_remove: function _remove(notifySelf, notifyParent) {
			this._buffer = null;
			return _remove.base.call(this, notifySelf, notifyParent);
		},
		_serialize: function _serialize(options, dictionary) {
			const json = _serialize.base.call(this, options, dictionary);
			if (!this._isolated) delete json[1].isolated;
			return json;
		},
		_getBounds: function _getBounds(matrix, options) {
			const clipItem = this._getClipItem();
			return clipItem ? clipItem._getCachedBounds(clipItem._matrix.prepended(matrix), Base.set({}, options, { stroke: false })) : _getBounds.base.call(this, matrix, options);
		},
		_hitTestChildren: function _hitTestChildren(point, options, viewMatrix) {
			const clipItem = this._getClipItem();
			return (!clipItem || clipItem.contains(point)) && _hitTestChildren.base.call(this, point, options, viewMatrix, clipItem);
		},
		_hitTestSelf: function(point, options, viewMatrix) {
			if (options.match || options.class || options.type || options.all) {
				const res = this._hitTestChildren(point, options.extend({
					all: null,
					match: null,
					class: null,
					type: null
				}), viewMatrix);
				if (res) res.item = this;
				return res;
			}
		},
		_draw: function(ctx, param) {
			const clip = param.clip;
			const clipItem = this._getClipItem();
			param = param.extend({
				clipItem: !clip && clipItem,
				clip: false
			});
			if (clip) {
				ctx.beginPath();
				param.dontStart = param.dontFinish = true;
			} else if (clipItem) {
				clipItem.draw(ctx, param.extend({ clip: true }));
			}
			const children = this._children;
			for (let i = 0, l = children.length; i < l; i++) {
				const item = children[i];
				if (item !== clipItem) item.draw(ctx, param);
			}
		}
	});
	const Layer = Group.extend({
		_class: "Layer",
		_textWrapVersion: 0,
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
		_hitTestSelf: function() {}
	});
	const Shape = Item.extend({
		_class: "Shape",
		_applyMatrix: false,
		_canApplyMatrix: false,
		_canScaleStroke: true,
		_serializeFields: {
			type: null,
			size: null,
			radius: null
		},
		_prioritize: ["type"],
		initialize: function Shape(props, point) {
			this._initialize(props, point);
		},
		_equals: function(item) {
			return this._type === item._type && this._size.equals(item._size) && Base.equals(this._radius, item._radius);
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
		getShape: "#getType",
		setShape: "#setType",
		getSize: function() {
			const size = this._size;
			return new LinkedSize(size.width, size.height, this, "setSize");
		},
		setSize: function() {
			const size = Size.read(arguments);
			if (!this._size) {
				this._size = size.clone();
			} else if (!this._size.equals(size)) {
				const type = this._type;
				let width = size.width;
				let height = size.height;
				if (type === "rectangle") {
					this._radius.set(Size.min(this._radius, size.divide(2).abs()));
				} else if (type === "circle") {
					width = height = (width + height) / 2;
					this._radius = width / 2;
				} else if (type === "ellipse") {
					this._radius._set(width / 2, height / 2);
				}
				this._size._set(width, height);
				this._changed(9);
			}
		},
		getRadius: function() {
			const rad = this._radius;
			return this._type === "circle" ? rad : new LinkedSize(rad.width, rad.height, this, "setRadius");
		},
		setRadius: function(radius) {
			let size;
			const type = this._type;
			if (type === "circle") {
				if (radius === this._radius) return;
				size = radius * 2;
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
					if (this._radius.equals(radius)) return;
					this._radius.set(radius);
					if (type === "rectangle") {
						size = Size.max(this._size, radius.multiply(2));
						this._size.set(size);
					} else if (type === "ellipse") {
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
			const path = this._asPathItem();
			if (paper.settings.applyMatrix) path.setApplyMatrix(true);
			if (Base.pick(insert, paper.settings.insertItems)) path.insertAbove(this);
			return path;
		},
		toShape: "#clone",
		_asPathItem: function() {
			const path = new Path[Base.capitalize(this._type)]({
				center: new Point(),
				size: this._size,
				radius: this._radius,
				insert: false
			});
			path.copyAttributes(this);
			return path;
		},
		_draw: function(ctx, param, viewMatrix, strokeMatrix) {
			const style = this._style;
			const hasFill = style.hasFill();
			const hasStroke = style.hasStroke();
			const dontPaint = param.dontFinish || param.clip;
			const untransformed = !strokeMatrix;
			if (hasFill || hasStroke || dontPaint) {
				const type = this._type;
				const radius = this._radius;
				const isCircle = type === "circle";
				if (!param.dontStart) ctx.beginPath();
				if (untransformed && isCircle) {
					ctx.arc(0, 0, radius, 0, Math.PI * 2, true);
				} else {
					const rx = isCircle ? radius : radius.width;
					const ry = isCircle ? radius : radius.height;
					const size = this._size;
					const width = size.width;
					const height = size.height;
					if (untransformed && type === "rectangle" && rx === 0 && ry === 0) {
						ctx.rect(-width / 2, -height / 2, width, height);
					} else {
						const x = width / 2;
						const y = height / 2;
						const kappa = 1 - .5522847498307936;
						const cx = rx * kappa;
						const cy = ry * kappa;
						const c = [
							-x,
							-y + ry,
							-x,
							-y + cy,
							-x + cx,
							-y,
							-x + rx,
							-y,
							x - rx,
							-y,
							x - cx,
							-y,
							x,
							-y + cy,
							x,
							-y + ry,
							x,
							y - ry,
							x,
							y - cy,
							x - cx,
							y,
							x - rx,
							y,
							-x + rx,
							y,
							-x + cx,
							y,
							-x,
							y - cy,
							-x,
							y - ry
						];
						if (strokeMatrix) strokeMatrix.transform(c, c, 32);
						ctx.moveTo(c[0], c[1]);
						ctx.bezierCurveTo(c[2], c[3], c[4], c[5], c[6], c[7]);
						if (x !== rx) ctx.lineTo(c[8], c[9]);
						ctx.bezierCurveTo(c[10], c[11], c[12], c[13], c[14], c[15]);
						if (y !== ry) ctx.lineTo(c[16], c[17]);
						ctx.bezierCurveTo(c[18], c[19], c[20], c[21], c[22], c[23]);
						if (x !== rx) ctx.lineTo(c[24], c[25]);
						ctx.bezierCurveTo(c[26], c[27], c[28], c[29], c[30], c[31]);
					}
				}
				ctx.closePath();
			}
			if (!dontPaint) this._paint(ctx, param, viewMatrix, strokeMatrix);
		},
		_canComposite: function() {
			return !(this.hasFill() && this.hasStroke());
		},
		_getBounds: function(matrix, options) {
			const size = this._size;
			let rect = new Rectangle(size).setCenter(0, 0);
			const style = this._style;
			const strokeRadius = options.stroke && style.hasStroke() && style.getStrokeWidth() / 2;
			if (matrix) {
				if (this._type === "rectangle") {
					rect = matrix._transformBounds(rect);
				} else {
					const extents = Matrix._getCircleExtents(1, matrix.clone().scale(size.width / 2, size.height / 2));
					rect = new Rectangle(new Size(extents).multiply(2)).setCenter(matrix._tx, matrix._ty);
				}
			}
			return strokeRadius ? rect.expand(new Size(Matrix._getCircleExtents(strokeRadius, this._getStrokeMatrix(matrix, options))).multiply(2)) : rect;
		}
	}, new (function() {
		function getCornerCenter(that, point) {
			const radius = that._radius;
			if (!radius.isZero()) {
				const halfSize = that._size.divide(2);
				for (let q = 1; q <= 4; q++) {
					const dir = new Point(q > 1 && q < 4 ? -1 : 1, q > 2 ? -1 : 1);
					const corner = dir.multiply(halfSize);
					const center = corner.subtract(dir.multiply(radius));
					const rect = new Rectangle(corner, center);
					if (rect.contains(point)) return {
						point: center,
						quadrant: q
					};
				}
			}
		}
		return {
			_contains: function _contains(point) {
				if (this._type === "rectangle") {
					const center = getCornerCenter(this, point);
					return center ? point.subtract(center.point).divide(this._radius).getLength() <= 1 : _contains.base.call(this, point);
				} else {
					return point.divide(this.size).getLength() <= .5;
				}
			},
			_hitTestSelf: function(point, options, viewMatrix, strokeMatrix) {
				const hit = this._asPathItem()._hitTestSelf(point, Base.set({}, options, {
					segments: false,
					handles: false,
					ends: false,
					curves: false,
					all: false
				}), viewMatrix, strokeMatrix);
				return hit && new HitResult(hit.type, this);
			}
		};
	})(), { statics: new (function() {
		function createShape(type, point, size, radius, args) {
			const item = Base.create(Shape.prototype);
			item._type = type;
			item._size = size;
			item._radius = radius;
			item._initialize(Base.getNamed(args), point);
			return item;
		}
		return {
			Circle: function() {
				const args = arguments;
				const center = Point.readNamed(args, "center");
				const radius = Base.readNamed(args, "radius");
				return createShape("circle", center, new Size(radius * 2), radius, args);
			},
			Rectangle: function() {
				const args = arguments;
				const rect = Rectangle.readNamed(args, "rectangle");
				const radius = Size.min(Size.readNamed(args, "radius"), rect.getSize(true).divide(2));
				return createShape("rectangle", rect.getCenter(true), rect.getSize(true), radius, args);
			},
			Ellipse: function() {
				const args = arguments;
				const ellipse = Shape._readEllipse(args);
				const radius = ellipse.radius;
				return createShape("ellipse", ellipse.center, radius.multiply(2), radius, args);
			},
			_readEllipse: function(args) {
				let center;
				let radius;
				if (Base.hasNamed(args, "radius")) {
					center = Point.readNamed(args, "center");
					radius = Size.readNamed(args, "radius");
				} else {
					const rect = Rectangle.readNamed(args, "rectangle");
					center = rect.getCenter(true);
					radius = rect.getSize(true).divide(2);
				}
				return {
					center,
					radius
				};
			}
		};
	})() });
	const Raster = Item.extend({
		_class: "Raster",
		_applyMatrix: false,
		_canApplyMatrix: false,
		_boundsOptions: {
			stroke: false,
			handle: false
		},
		_serializeFields: {
			crossOrigin: null,
			size: new Size(),
			source: null
		},
		_prioritize: ["crossOrigin"],
		_smoothing: "low",
		beans: true,
		initialize: function Raster(source, position) {
			if (!this._initialize(source, position !== undefined && Point.read([position]))) {
				let image;
				const type = typeof source;
				const object = type === "string" ? document && document.getElementById(source) : type === "object" ? source : null;
				if (object && object !== Item.NO_INSERT) {
					if (object.getContext || object.naturalHeight != null) {
						image = object;
					} else if (object) {
						const size = Size.read(arguments);
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
			const image = source._image;
			const canvas = source._canvas;
			if (image) {
				this._setImage(image);
			} else if (canvas) {
				const copyCanvas = CanvasProvider.getCanvas(source._size);
				copyCanvas.getContext("2d").drawImage(canvas, 0, 0);
				this._setImage(copyCanvas);
			}
			this._crossOrigin = source._crossOrigin;
		},
		getSize: function() {
			const size = this._size;
			return new LinkedSize(size ? size.width : 0, size ? size.height : 0, this, "setSize");
		},
		setSize: function(_size, _clear) {
			const size = Size.read(arguments);
			if (!size.equals(this._size)) {
				if (size.width > 0 && size.height > 0) {
					const element = !_clear && this.getElement();
					const canvas = CanvasProvider.getCanvas(size);
					if (element) {
						canvas.getContext("2d").drawImage(element, 0, 0, size.width, size.height);
					}
					this._setImage(canvas);
				} else {
					if (this._canvas) CanvasProvider.release(this._canvas);
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
			const size = this._size;
			return !size || size.width === 0 && size.height === 0;
		},
		getResolution: function() {
			const matrix = this._matrix;
			const orig = new Point(0, 0).transform(matrix);
			const u = new Point(1, 0).transform(matrix).subtract(orig);
			const v = new Point(0, 1).transform(matrix).subtract(orig);
			return new Size(72 / u.getLength(), 72 / v.getLength());
		},
		getPpi: "#getResolution",
		getImage: function() {
			return this._image;
		},
		setImage: function(image) {
			const that = this;
			function emit(event) {
				const view = that.getView();
				const type = event && event.type || "load";
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
			if (this._canvas) CanvasProvider.release(this._canvas);
			if (image && image.getContext) {
				this._image = null;
				this._canvas = image;
				this._loaded = true;
			} else {
				this._image = image;
				this._canvas = null;
				this._loaded = !!(image && image.src && image.complete);
			}
			this._size = image && !this._loaded ? this._size || new Size() : new Size(image ? image.naturalWidth || image.width : 0, image ? image.naturalHeight || image.height : 0);
			this._context = null;
			this._changed(9 | Change.PIXELS);
		},
		getCanvas: function() {
			if (!this._canvas) {
				const ctx = CanvasProvider.getContext(this._size);
				try {
					if (this._image) ctx.drawImage(this._image, 0, 0);
					this._canvas = ctx.canvas;
				} catch (e) {
					CanvasProvider.release(ctx);
				}
			}
			return this._canvas;
		},
		setCanvas: "#setImage",
		getContext: function(_change) {
			if (!this._context) this._context = this.getCanvas().getContext("2d");
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
			const image = this._image;
			return image && image.src || this.toDataURL();
		},
		setSource: function(src) {
			const image = new self.Image();
			const crossOrigin = this._crossOrigin;
			if (crossOrigin) image.crossOrigin = crossOrigin;
			if (src) image.src = src;
			this.setImage(image);
		},
		getCrossOrigin: function() {
			const image = this._image;
			return image && image.crossOrigin || this._crossOrigin || "";
		},
		setCrossOrigin: function(crossOrigin) {
			this._crossOrigin = crossOrigin;
			const image = this._image;
			if (image) image.crossOrigin = crossOrigin;
		},
		getSmoothing: function() {
			return this._smoothing;
		},
		setSmoothing: function(smoothing) {
			this._smoothing = typeof smoothing === "string" ? smoothing : smoothing ? "low" : "off";
			this._changed(257);
		},
		getElement: function() {
			return this._canvas || this._loaded && this._image;
		}
	}, {
		beans: false,
		getSubCanvas: function() {
			const rect = Rectangle.read(arguments);
			const ctx = CanvasProvider.getContext(rect.getSize());
			ctx.drawImage(this.getCanvas(), rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);
			return ctx.canvas;
		},
		getSubRaster: function() {
			const rect = Rectangle.read(arguments);
			const raster = new Raster(Item.NO_INSERT);
			raster._setImage(this.getSubCanvas(rect));
			raster.translate(rect.getCenter().subtract(this.getSize().divide(2)));
			raster._matrix.prepend(this._matrix);
			raster.insertAbove(this);
			return raster;
		},
		toDataURL: function() {
			const image = this._image;
			const src = image && image.src;
			if (/^data:/.test(src)) return src;
			const canvas = this.getCanvas();
			return canvas ? canvas.toDataURL.apply(canvas, arguments) : null;
		},
		drawImage: function(image) {
			const point = Point.read(arguments, 1);
			this.getContext(true).drawImage(image, point.x, point.y);
		},
		getAverageColor: function(object) {
			let i;
			let l;
			let bounds;
			let path;
			if (!object) {
				bounds = this.getBounds();
			} else if (object instanceof PathItem) {
				path = object;
				bounds = object.getBounds();
			} else if (typeof object === "object") {
				if ("width" in object) {
					bounds = new Rectangle(object);
				} else if ("x" in object) {
					bounds = new Rectangle(object.x - .5, object.y - .5, 1, 1);
				}
			}
			if (!bounds) return null;
			const sampleSize = 32;
			const width = Math.min(bounds.width, sampleSize);
			const height = Math.min(bounds.height, sampleSize);
			let ctx = Raster._sampleContext;
			if (!ctx) {
				ctx = Raster._sampleContext = CanvasProvider.getContext(new Size(sampleSize));
			} else {
				ctx.clearRect(0, 0, sampleSize + 1, sampleSize + 1);
			}
			ctx.save();
			const matrix = new Matrix().scale(width / bounds.width, height / bounds.height).translate(-bounds.x, -bounds.y);
			matrix.applyToContext(ctx);
			if (path) path.draw(ctx, new Base({
				clip: true,
				matrices: [matrix]
			}));
			this._matrix.applyToContext(ctx);
			const element = this.getElement();
			const size = this._size;
			if (element) ctx.drawImage(element, -size.width / 2, -size.height / 2);
			ctx.restore();
			const pixels = ctx.getImageData(.5, .5, Math.ceil(width), Math.ceil(height)).data;
			const channels = [
				0,
				0,
				0
			];
			let total = 0;
			for (i = 0, l = pixels.length; i < l; i += 4) {
				let alpha = pixels[i + 3];
				total += alpha;
				alpha /= 255;
				channels[0] += pixels[i] * alpha;
				channels[1] += pixels[i + 1] * alpha;
				channels[2] += pixels[i + 2] * alpha;
			}
			for (i = 0; i < 3; i++) channels[i] /= total;
			return total ? Color.read(channels) : null;
		},
		getPixel: function() {
			const point = Point.read(arguments);
			const data = this.getContext().getImageData(point.x, point.y, 1, 1).data;
			return new Color("rgb", [
				data[0] / 255,
				data[1] / 255,
				data[2] / 255
			], data[3] / 255);
		},
		setPixel: function() {
			const args = arguments;
			const point = Point.read(args);
			const color = Color.read(args);
			const components = color._convert("rgb");
			const alpha = color._alpha;
			const ctx = this.getContext(true);
			const imageData = ctx.createImageData(1, 1);
			const data = imageData.data;
			data[0] = components[0] * 255;
			data[1] = components[1] * 255;
			data[2] = components[2] * 255;
			data[3] = alpha != null ? alpha * 255 : 255;
			ctx.putImageData(imageData, point.x, point.y);
		},
		clear: function() {
			const size = this._size;
			this.getContext(true).clearRect(0, 0, size.width + 1, size.height + 1);
		},
		createImageData: function() {
			const size = Size.read(arguments);
			return this.getContext().createImageData(size.width, size.height);
		},
		getImageData: function() {
			let rect = Rectangle.read(arguments);
			if (rect.isEmpty()) rect = new Rectangle(this._size);
			return this.getContext().getImageData(rect.x, rect.y, rect.width, rect.height);
		},
		putImageData: function(data) {
			const point = Point.read(arguments, 1);
			this.getContext(true).putImageData(data, point.x, point.y);
		},
		setImageData: function(data) {
			this.setSize(data);
			this.getContext(true).putImageData(data, 0, 0);
		},
		_getBounds: function(matrix, options) {
			const rect = new Rectangle(this._size).setCenter(0, 0);
			return matrix ? matrix._transformBounds(rect) : rect;
		},
		_hitTestSelf: function(point) {
			if (this._contains(point)) {
				const that = this;
				return new HitResult("pixel", that, {
					offset: point.add(that._size.divide(2)).round(),
					color: { get: function() {
						return that.getPixel(this.offset);
					} }
				});
			}
		},
		_draw: function(ctx, param, viewMatrix) {
			const element = this.getElement();
			if (param.dontFinish || param.clip) {
				const rect = this.getInternalBounds();
				if (!param.dontStart) ctx.beginPath();
				ctx.rect(rect.x, rect.y, rect.width, rect.height);
			} else if (element && element.width > 0 && element.height > 0) {
				ctx.globalAlpha = Numerical.clamp(this._opacity, 0, 1);
				this._setStyles(ctx, param, viewMatrix);
				const smoothing = this._smoothing;
				const disabled = smoothing === "off";
				DomElement.setPrefixed(ctx, disabled ? "imageSmoothingEnabled" : "imageSmoothingQuality", disabled ? false : smoothing);
				ctx.drawImage(element, -this._size.width / 2, -this._size.height / 2);
			}
		},
		_canComposite: function() {
			return true;
		}
	});
	const ItemDefinition = Base.extend({
		_centerItem: false,
		_name: null,
		initialize: function ItemDefinition(item, dontCenter) {
			this._id = UID.get();
			this.project = paper.project;
			if (item) this.setItem(item, dontCenter);
		},
		_changed: function(flags) {
			const project = this.project;
			if (flags & 8) Item._clearBoundsCache(this);
			if (flags & 1) {
				project._bufferVersion++;
				project._changed(flags);
			}
			project._logChange("definition", this, flags);
		},
		getName: function() {
			return this._name;
		},
		setName: function(name) {
			this._name = name || null;
			this._changed(256);
		},
		getItem: function() {
			return this._item;
		},
		setItem: function(item, _dontCenter) {
			if (item._symbol) item = item.clone();
			if (this._item) this._item._symbol = null;
			this._item = item;
			item.remove();
			item.setSelected(false);
			if (this._centerItem && !_dontCenter) item.setPosition(new Point());
			item._symbol = this;
			this._changed(9);
		}
	});
	const SymbolItem = Item.extend({
		_class: "SymbolItem",
		_applyMatrix: false,
		_canApplyMatrix: false,
		_boundsOptions: { stroke: true },
		_serializeFields: { definition: null },
		initialize: function SymbolItem(arg0, arg1) {
			if (!this._initialize(arg0, arg1 !== undefined && Point.read(arguments, 1))) this.setDefinition(arg0 instanceof SymbolDefinition ? arg0 : new SymbolDefinition(arg0));
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
		getSymbol: "#getDefinition",
		setSymbol: "#setDefinition",
		isEmpty: function() {
			return this._definition._item.isEmpty();
		},
		_getBounds: function(matrix, options) {
			const item = this._definition._item;
			return item._getCachedBounds(item._matrix.prepended(matrix), options);
		},
		_hitTestSelf: function(point, options, viewMatrix) {
			const opts = options.extend({
				all: false,
				match: null,
				class: null,
				type: null
			});
			const res = this._definition._item._hitTest(point, opts, viewMatrix);
			if (res) res.item = this;
			return res;
		},
		_draw: function(ctx, param) {
			this._definition._item.draw(ctx, param.extend({ updateMatrix: false }));
		},
		embed: function() {
			if (!this._parent) return null;
			const item = this._definition._item.clone(false);
			item.transform(this._matrix);
			item.setOpacity(item._opacity * this._opacity);
			item.setVisible(item._visible && this._visible);
			item.setLocked(item._locked || this._locked);
			item.setGuide(item._guide || this._guide);
			if (this._blendMode !== "normal") item.setBlendMode(this._blendMode);
			item.setClipMask(this._clipMask);
			item.setSelected(this.isSelected());
			if (this._data) item._data = Base.clone(this._data);
			if (this._name) item.setName(this._name);
			return this.replaceWith(item) ? item : null;
		}
	});
	const SymbolDefinition = ItemDefinition.extend({
		_class: "SymbolDefinition",
		_centerItem: true,
		initialize: function SymbolDefinition(item, dontCenter) {
			const options = Base.isPlainObject(dontCenter) && dontCenter;
			ItemDefinition.call(this, item, options ? options.dontCenter : dontCenter);
			if (options) this.set(options, { dontCenter: true });
		},
		_serialize: function(options, dictionary) {
			return dictionary.add(this, function() {
				const json = [this._class, this._item];
				const props = {};
				if (!this._item.getPosition().isZero()) props.dontCenter = true;
				if (this._name) props.name = this._name;
				if (Object.keys(props).length) json.push(props);
				return Base.serialize(json, options, false, dictionary);
			});
		},
		getDefinition: "#getItem",
		setDefinition: "#setItem",
		place: function(position) {
			return new SymbolItem(this, position);
		},
		clone: function() {
			return new SymbolDefinition(this._item.clone(false), {
				dontCenter: true,
				name: this._name
			});
		},
		equals: function(symbol) {
			return symbol === this || symbol && this._item.equals(symbol._item) || false;
		}
	});
	const HitResult = Base.extend({
		_class: "HitResult",
		initialize: function HitResult(type, item, values) {
			this.type = type;
			this.item = item;
			if (values) this.inject(values);
		},
		statics: { getOptions: function(args) {
			const options = args && Base.read(args);
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
		} }
	});
	const EffectInstance = Base.extend({
		_class: "EffectInstance",
		_compactSerialize: true,
		initialize: function EffectInstance(props) {
			this._type = props.type;
			this._visible = props.visible !== false;
			this._item = this._index = null;
			this._setParameters(props.parameters);
		},
		_setParameters: function(parameters) {
			this._parameters = Base.set({}, parameters);
			this._setEffect(Effect.get(this._type));
		},
		_setEffect: function(effect) {
			if (effect) {
				const parameters = this._parameters;
				const defaults = effect._defaults;
				for (const key in defaults) {
					if (parameters[key] === undefined) parameters[key] = defaults[key];
				}
				Object.defineProperties(this, effect._accessors);
			}
			this._effect = effect;
			this._linkedParameters = null;
		},
		_getProps: function() {
			const props = {
				type: this._type,
				parameters: Base.set({}, this._parameters)
			};
			if (!this._visible) props.visible = false;
			return props;
		},
		_serialize: function(options, dictionary) {
			return Base.serialize(this._getProps(), options, true, dictionary);
		},
		_changed: function() {
			const item = this._item;
			if (item) item._changed(257);
		},
		getType: function() {
			return this._type;
		},
		getEffect: function() {
			const effect = Effect.get(this._type);
			if (effect !== this._effect) this._setEffect(effect);
			return effect;
		},
		isVisible: function() {
			return this._visible;
		},
		setVisible: function(visible) {
			this._visible = !!visible;
			this._changed();
		},
		getParameters: function() {
			let linked = this._linkedParameters;
			if (!linked) {
				const instance = this;
				linked = this._linkedParameters = {};
				Base.each(this._parameters, function(value, key) {
					Object.defineProperty(linked, key, {
						enumerable: true,
						get: function() {
							return instance._parameters[key];
						},
						set: function(value) {
							instance._parameters[key] = value;
							instance._changed();
						}
					});
				});
				Object.preventExtensions(linked);
			}
			return linked;
		},
		setParameters: function(parameters) {
			this._setParameters(parameters);
			this._changed();
		},
		getItem: function() {
			return this._item;
		},
		getIndex: function() {
			return this._index;
		},
		remove: function() {
			return !!(this._item && this._item.removeEffect(this._index));
		},
		equals: function(instance) {
			return instance === this || instance instanceof EffectInstance && this._type === instance._type && this._visible === instance._visible && Base.equals(this._parameters, instance._parameters) || false;
		}
	});
	const Effect = Base.extend(new (function() {
		const effects = {};
		return {
			_class: "Effect",
			initialize: function Effect(props) {
				const defaults = {};
				const accessors = {};
				this._type = props.type;
				this._label = props.label || props.type;
				this._parameters = props.parameters || {};
				this.onApply = props.onApply || null;
				this.onEditParameters = props.onEditParameters || null;
				Base.each(this._parameters, function(parameter, key) {
					if (key in EffectInstance.prototype) throw new Error("Invalid parameter name: '" + key + "'.");
					defaults[key] = parameter.value;
					accessors[key] = {
						configurable: true,
						get: function() {
							return this._parameters[key];
						},
						set: function(value) {
							this._parameters[key] = value;
							this._changed();
						}
					};
				});
				this._defaults = defaults;
				this._accessors = accessors;
				Effect.add(this);
			},
			getType: function() {
				return this._type;
			},
			getLabel: function() {
				return this._label;
			},
			getParameters: function() {
				return this._parameters;
			},
			remove: function() {
				return Effect.remove(this);
			},
			statics: {
				_version: 0,
				add: function(effect) {
					effects[effect._type] = effect;
					Effect._version++;
					return effect;
				},
				get: function(type) {
					return effects.hasOwnProperty(type) ? effects[type] : null;
				},
				getAll: function() {
					return Object.keys(effects).map(function(type) {
						return effects[type];
					});
				},
				remove: function(effect) {
					const type = effect._type;
					if (effects[type] === effect) {
						delete effects[type];
						Effect._version++;
						return true;
					}
					return false;
				}
			}
		};
	})());
	new (function() {
		function applyToPaths(art, func) {
			if (art instanceof PathItem) return func(art);
			const children = art._children;
			if (children) {
				for (let i = children.length - 1; i >= 0; i--) {
					const child = children[i];
					const result = applyToPaths(child, func);
					if (result !== child) child.replaceWith(result);
				}
			}
			return art;
		}
		new Effect({
			type: "offset",
			label: "Offset Path",
			parameters: {
				distance: {
					label: "Distance",
					type: "number",
					units: "point",
					value: 0
				},
				join: {
					label: "Join",
					type: "list",
					options: [
						"miter",
						"round",
						"bevel"
					],
					value: "miter"
				},
				miterLimit: {
					label: "Miter Limit",
					type: "number",
					value: 10
				}
			},
			onApply: function(event) {
				const instance = this;
				return applyToPaths(event.art, function(path) {
					return path.offset(instance.distance, {
						join: instance.join,
						miterLimit: instance.miterLimit,
						insert: false
					});
				});
			}
		});
		new Effect({
			type: "outline",
			label: "Outline Stroke",
			onApply: function(event) {
				return applyToPaths(event.art, function(path) {
					if (!path.hasStroke()) return path;
					const outline = path.outline({ insert: false });
					if (!path.hasFill()) return outline;
					path.setStrokeColor(null);
					return new Group({
						children: [path, outline],
						insert: false
					});
				});
			}
		});
	})();
	Item.inject(new (function() {
		function hasEffects(item) {
			const children = item._children;
			if (item._hasEffects()) return true;
			for (let i = 0, l = children ? children.length : 0; i < l; i++) {
				if (hasEffects(children[i])) return true;
			}
			return false;
		}
		return {
			beans: true,
			_effects: null,
			getEffects: function() {
				return this._effects || [];
			},
			setEffects: function(effects) {
				this.removeEffects();
				if (effects && effects.length) this.insertEffects(0, effects);
			},
			addEffect: function(effect) {
				return this.insertEffect(this.getEffects().length, effect);
			},
			insertEffect: function(index, effect) {
				return this.insertEffects(index, [effect])[0];
			},
			insertEffects: function(index, effects) {
				const list = this._effects || (this._effects = []);
				const inserted = [];
				for (let i = 0, l = effects.length; i < l; i++) {
					const instance = new EffectInstance(effects[i]);
					instance._item = this;
					inserted.push(instance);
				}
				Base.splice(list, inserted, index, 0);
				this._changed(257);
				return inserted;
			},
			removeEffect: function(index) {
				return this.removeEffects(index, index + 1)[0] || null;
			},
			removeEffects: function(start, end) {
				const list = this._effects;
				let removed = [];
				if (list) {
					start = start || 0;
					end = Base.pick(end, list.length);
					removed = Base.splice(list, null, start, end - start);
					for (let i = 0, l = removed.length; i < l; i++) {
						const instance = removed[i];
						instance._item = instance._index = null;
					}
					if (removed.length) this._changed(257);
					if (!list.length) this._effects = null;
				}
				return removed;
			},
			_hasEffects: function() {
				const list = this._effects;
				for (let i = 0, l = list ? list.length : 0; i < l; i++) {
					if (list[i]._visible) return true;
				}
				return false;
			},
			getEffectOutput: function() {
				let output = this._effectOutput;
				if (output === undefined || this._effectVersion !== Effect._version) {
					const art = this._hasEffects() && this._getEffectArt();
					output = art ? this._applyEffects(art) || art : null;
					this._effectOutput = output;
					this._effectVersion = Effect._version;
				}
				return output;
			},
			_applyEffects: function(art) {
				let output = null;
				for (let i = 0, l = this._effects ? this._effects.length : 0; i < l; i++) {
					const instance = this._effects[i];
					const effect = instance.getEffect();
					const onApply = effect && effect.onApply;
					if (instance._visible && onApply) {
						output = output || art;
						output = onApply.call(instance, {
							art: output,
							item: this
						}) || output;
					}
				}
				return output;
			},
			_getEffectArt: function() {
				const art = this.clone({ insert: false });
				art.setEffects(null);
				art.setMatrix(new Matrix());
				function expand(source, copy) {
					const children = source._children;
					for (let i = 0, l = children ? children.length : 0; i < l; i++) {
						const child = children[i];
						let output = child.getEffectOutput();
						if (output) {
							output = output.clone({ insert: false });
							output.transform(child._matrix);
							copy._children[i].replaceWith(output);
						} else {
							expand(child, copy._children[i]);
						}
					}
				}
				expand(this, art);
				return art;
			},
			getPreviewBounds: function(matrix) {
				const output = this.getEffectOutput();
				const children = this._children;
				if (output || children && hasEffects(this)) {
					let bounds = null;
					if (output) {
						bounds = output.getStrokeBounds();
					} else {
						for (let i = 0, l = children.length; i < l; i++) {
							const child = children[i];
							if (child._visible) {
								const rect = child.getPreviewBounds();
								bounds = bounds ? bounds.unite(rect) : rect;
							}
						}
					}
					if (bounds) {
						return (matrix ? matrix.appended(this._matrix) : this._matrix)._transformBounds(bounds);
					}
				}
				return this.getStrokeBounds(matrix);
			}
		};
	})());
	const Segment = Base.extend({
		_class: "Segment",
		_name: null,
		beans: true,
		_selection: 0,
		initialize: function Segment(arg0, arg1, arg2, arg3, arg4, arg5) {
			const count = arguments.length;
			let point;
			let handleIn;
			let handleOut;
			let selection;
			let name;
			let data;
			if (count > 0) {
				if (arg0 == null || typeof arg0 === "object") {
					if (count === 1 && arg0 && "point" in arg0) {
						point = arg0.point;
						handleIn = arg0.handleIn;
						handleOut = arg0.handleOut;
						selection = arg0.selection;
						name = arg0.name;
						data = arg0 instanceof Segment ? arg0._data && Base.clone(arg0._data) : arg0.data;
					} else {
						point = arg0;
						handleIn = arg1;
						handleOut = arg2;
						selection = arg3;
					}
				} else {
					point = [arg0, arg1];
					handleIn = arg2 !== undefined ? [arg2, arg3] : null;
					handleOut = arg4 !== undefined ? [arg4, arg5] : null;
				}
			}
			new SegmentPoint(point, this, "_point");
			new SegmentPoint(handleIn, this, "_handleIn");
			new SegmentPoint(handleOut, this, "_handleOut");
			if (selection) this.setSelection(selection);
			if (name) this.setName(name);
			if (data) this._data = data;
		},
		_serialize: function(options, dictionary) {
			const point = this._point;
			const selection = this._selection;
			const name = this._name;
			const data = this._data;
			const hasData = data && !Base.equals(data, {});
			if (name || hasData) {
				const props = Base.serialize({
					point,
					handleIn: this._handleIn,
					handleOut: this._handleOut,
					selection
				}, options, true, dictionary);
				if (name) props.name = name;
				if (hasData) props.data = Base.serialize(data, options, false, dictionary);
				return [props];
			} else {
				const obj = selection || this.hasHandles() ? [
					point,
					this._handleIn,
					this._handleOut
				] : point;
				if (selection) obj.push(selection);
				return Base.serialize(obj, options, true, dictionary);
			}
		},
		_changed: function(point) {
			const path = this._path;
			if (!path) return;
			const curves = path._curves;
			const index = this._index;
			let curve;
			if (curves) {
				if ((!point || point === this._point || point === this._handleIn) && (curve = index > 0 ? curves[index - 1] : path._closed ? curves[curves.length - 1] : null)) curve._changed();
				if ((!point || point === this._point || point === this._handleOut) && (curve = curves[index])) curve._changed();
			}
			path._changed(41);
		},
		getName: function() {
			return this._name;
		},
		setName: function(name) {
			const path = this._path;
			const named = path && path._namedSegments;
			if (this._name && named) Base.removeNamed(path._segments, named, this._name, this);
			if (name === +name + "") throw new Error("Names consisting only of numbers are not supported.");
			if (name && path) Base.addNamed(path._segments, named || (path._namedSegments = {}), name, this);
			this._name = name || undefined;
		},
		getData: function() {
			if (!this._data) this._data = {};
			return this._data;
		},
		setData: function(data) {
			this._data = data;
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
			const handleIn = this._handleIn;
			const handleOut = this._handleOut;
			return !handleIn.isZero() && !handleOut.isZero() && handleIn.isCollinear(handleOut);
		},
		clearHandles: function() {
			this._handleIn._set(0, 0);
			this._handleOut._set(0, 0);
		},
		getSelection: function() {
			return this._selection;
		},
		setSelection: function(selection) {
			const oldSelection = this._selection;
			const path = this._path;
			this._selection = selection = selection || 0;
			if (path && selection !== oldSelection) {
				path._updateSelection(this, oldSelection, selection);
				const project = path._project;
				if (project) project._changed(257, path._getChangeOwner());
			}
		},
		_changeSelection: function(flag, selected) {
			const selection = this._selection;
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
			const path = this._path;
			let index = this._index;
			if (path) {
				if (index > 0 && !path._closed && index === path._segments.length - 1) index--;
				return path.getCurves()[index] || null;
			}
			return null;
		},
		getLocation: function() {
			const curve = this.getCurve();
			return curve ? new CurveLocation(curve, this === curve._segment1 ? 0 : 1) : null;
		},
		getNext: function() {
			const segments = this._path && this._path._segments;
			return segments && (segments[this._index + 1] || this._path._closed && segments[0]) || null;
		},
		smooth: function(options, _first, _last) {
			let A;
			let N;
			const opts = options || {};
			const type = opts.type;
			const factor = opts.factor;
			const prev = this.getPrevious();
			const next = this.getNext();
			const p0 = (prev || this)._point;
			const p1 = this._point;
			const p2 = (next || this)._point;
			const d1 = p0.getDistance(p1);
			const d2 = p1.getDistance(p2);
			if (!type || type === "catmull-rom") {
				const a = factor === undefined ? .5 : factor;
				const d1_a = Math.pow(d1, a);
				const d1_2a = d1_a * d1_a;
				const d2_a = Math.pow(d2, a);
				const d2_2a = d2_a * d2_a;
				if (!_first && prev) {
					A = 2 * d2_2a + 3 * d2_a * d1_a + d1_2a;
					N = 3 * d2_a * (d2_a + d1_a);
					this.setHandleIn(N !== 0 ? new Point((d2_2a * p0._x + A * p1._x - d1_2a * p2._x) / N - p1._x, (d2_2a * p0._y + A * p1._y - d1_2a * p2._y) / N - p1._y) : new Point());
				}
				if (!_last && next) {
					A = 2 * d1_2a + 3 * d1_a * d2_a + d2_2a;
					N = 3 * d1_a * (d1_a + d2_a);
					this.setHandleOut(N !== 0 ? new Point((d1_2a * p2._x + A * p1._x - d2_2a * p0._x) / N - p1._x, (d1_2a * p2._y + A * p1._y - d2_2a * p0._y) / N - p1._y) : new Point());
				}
			} else if (type === "geometric") {
				if (prev && next) {
					const vector = p0.subtract(p2);
					const t = factor === undefined ? .4 : factor;
					const k = t * d1 / (d1 + d2);
					if (!_first) this.setHandleIn(vector.multiply(k));
					if (!_last) this.setHandleOut(vector.multiply(k - t));
				}
			} else {
				throw new Error("Smoothing method '" + type + "' not supported.");
			}
		},
		getPrevious: function() {
			const segments = this._path && this._path._segments;
			return segments && (segments[this._index - 1] || this._path._closed && segments[segments.length - 1]) || null;
		},
		isFirst: function() {
			return !this._index;
		},
		isLast: function() {
			const path = this._path;
			return path && this._index === path._segments.length - 1 || false;
		},
		reverse: function() {
			const handleIn = this._handleIn;
			const handleOut = this._handleOut;
			const tmp = handleIn.clone();
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
			const segment = new Segment(this._point, this._handleIn, this._handleOut);
			const name = this._name;
			const data = this._data;
			if (name) segment._name = name;
			if (data) segment._data = Base.clone(data);
			return segment;
		},
		equals: function(segment) {
			return segment === this || segment && this._class === segment._class && this._point.equals(segment._point) && this._handleIn.equals(segment._handleIn) && this._handleOut.equals(segment._handleOut) || false;
		},
		toString: function() {
			const parts = ["point: " + this._point];
			if (!this._handleIn.isZero()) parts.push("handleIn: " + this._handleIn);
			if (!this._handleOut.isZero()) parts.push("handleOut: " + this._handleOut);
			return "{ " + parts.join(", ") + " }";
		},
		transform: function(matrix) {
			this._transformCoordinates(matrix, new Array(6), true);
			this._changed();
		},
		interpolate: function(from, to, factor) {
			const u = 1 - factor;
			const v = factor;
			const point1 = from._point;
			const point2 = to._point;
			const handleIn1 = from._handleIn;
			const handleIn2 = to._handleIn;
			const handleOut2 = to._handleOut;
			const handleOut1 = from._handleOut;
			this._point._set(u * point1._x + v * point2._x, u * point1._y + v * point2._y, true);
			this._handleIn._set(u * handleIn1._x + v * handleIn2._x, u * handleIn1._y + v * handleIn2._y, true);
			this._handleOut._set(u * handleOut1._x + v * handleOut2._x, u * handleOut1._y + v * handleOut2._y, true);
			this._changed();
		},
		_transformCoordinates: function(matrix, coords, change) {
			const point = this._point;
			const handleIn = !change || !this._handleIn.isZero() ? this._handleIn : null;
			const handleOut = !change || !this._handleOut.isZero() ? this._handleOut : null;
			let x = point._x;
			let y = point._y;
			let i = 2;
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
	const SegmentPoint = Point.extend({
		initialize: function SegmentPoint(point, owner, key) {
			let x;
			let y;
			let selected;
			if (!point) {
				x = y = 0;
			} else if ((x = point[0]) !== undefined) {
				y = point[1];
			} else {
				let pt = point;
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
			if (selected) this.setSelected(true);
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
			const isZero = Numerical.isZero;
			return isZero(this._x) && isZero(this._y);
		},
		isSelected: function() {
			return !!(this._owner._selection & this._getSelection());
		},
		setSelected: function(selected) {
			this._owner._changeSelection(this._getSelection(), selected);
		},
		_getSelection: function() {
			const owner = this._owner;
			return this === owner._point ? 1 : this === owner._handleIn ? 2 : this === owner._handleOut ? 4 : 0;
		}
	});
	const Curve = Base.extend({
		_class: "Curve",
		beans: true,
		initialize: function Curve(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7) {
			const count = arguments.length;
			let seg1;
			let seg2;
			let point1;
			let point2;
			let handle1;
			let handle2;
			if (count === 3) {
				this._path = arg0;
				seg1 = arg1;
				seg2 = arg2;
			} else if (!count) {
				seg1 = new Segment();
				seg2 = new Segment();
			} else if (count === 1) {
				if ("segment1" in arg0) {
					seg1 = new Segment(arg0.segment1);
					seg2 = new Segment(arg0.segment2);
				} else if ("point1" in arg0) {
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
			return Base.serialize(this.hasHandles() ? [
				this.getPoint1(),
				this.getHandle1(),
				this.getHandle2(),
				this.getPoint2()
			] : [this.getPoint1(), this.getPoint2()], options, true, dictionary);
		},
		_changed: function() {
			this._length = this._bounds = undefined;
		},
		clone: function() {
			return new Curve(this._segment1, this._segment2);
		},
		toString: function() {
			const parts = ["point1: " + this._segment1._point];
			if (!this._segment1._handleOut.isZero()) parts.push("handle1: " + this._segment1._handleOut);
			if (!this._segment2._handleIn.isZero()) parts.push("handle2: " + this._segment2._handleIn);
			parts.push("point2: " + this._segment2._point);
			return "{ " + parts.join(", ") + " }";
		},
		classify: function() {
			return Curve.classify(this.getValues());
		},
		remove: function() {
			let removed = false;
			if (this._path) {
				const segment2 = this._segment2;
				const handleOut = segment2._handleOut;
				removed = segment2.remove();
				if (removed) this._segment1._handleOut.set(handleOut);
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
			const curves = this._path && this._path._curves;
			return curves && (curves[this._segment1._index + 1] || this._path._closed && curves[0]) || null;
		},
		getPrevious: function() {
			const curves = this._path && this._path._curves;
			return curves && (curves[this._segment1._index - 1] || this._path._closed && curves[curves.length - 1]) || null;
		},
		isFirst: function() {
			return !this._segment1._index;
		},
		isLast: function() {
			const path = this._path;
			return path && this._segment1._index === path._curves.length - 1 || false;
		},
		isSelected: function() {
			return this.getPoint1().isSelected() && this.getHandle1().isSelected() && this.getHandle2().isSelected() && this.getPoint2().isSelected();
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
			const coords = this.getValues();
			const points = [];
			for (let i = 0; i < 8; i += 2) points.push(new Point(coords[i], coords[i + 1]));
			return points;
		}
	}, {
		getLength: function() {
			if (this._length == null) this._length = Curve.getLength(this.getValues(), 0, 1);
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
			return this.divideAtTime(location && location.curve === this ? location.time : this.getTimeAt(location));
		},
		divideAtTime: function(time) {
			const tMin = 1e-8;
			const tMax = 1 - tMin;
			let res = null;
			if (time >= tMin && time <= tMax) {
				const parts = Curve.subdivide(this.getValues(), time);
				const left = parts[0];
				const right = parts[1];
				const setHandles = this.hasHandles();
				const seg1 = this._segment1;
				const seg2 = this._segment2;
				const path = this._path;
				if (setHandles) {
					seg1._handleOut._set(left[2] - left[0], left[3] - left[1]);
					seg2._handleIn._set(right[4] - right[6], right[5] - right[7]);
				}
				const x = left[6];
				const y = left[7];
				const segment = new Segment(new Point(x, y), setHandles && new Point(left[4] - x, left[5] - y), setHandles && new Point(right[2] - x, right[3] - y));
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
			const path = this._path;
			return path ? path.splitAt(location) : null;
		},
		splitAtTime: function(time) {
			return this.splitAt(this.getLocationAtTime(time));
		},
		divide: function(offset, isTime) {
			return this.divideAtTime(offset === undefined ? .5 : isTime ? offset : this.getTimeAt(offset));
		},
		split: function(offset, isTime) {
			return this.splitAtTime(offset === undefined ? .5 : isTime ? offset : this.getTimeAt(offset));
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
				const p1 = segment1._point;
				const h1 = segment1._handleOut;
				const h2 = segment2._handleIn;
				const p2 = segment2._point;
				const x1 = p1.x;
				const y1 = p1.y;
				const x2 = p2.x;
				const y2 = p2.y;
				const values = straight ? [
					x1,
					y1,
					x1,
					y1,
					x2,
					y2,
					x2,
					y2
				] : [
					x1,
					y1,
					x1 + h1._x,
					y1 + h1._y,
					x2 + h2._x,
					y2 + h2._y,
					x2,
					y2
				];
				if (matrix) matrix._transformCoordinates(values, values, 4);
				return values;
			},
			subdivide: function(v, t) {
				const x0 = v[0];
				const y0 = v[1];
				const x1 = v[2];
				const y1 = v[3];
				const x2 = v[4];
				const y2 = v[5];
				const x3 = v[6];
				const y3 = v[7];
				if (t === undefined) t = .5;
				const u = 1 - t;
				const x4 = u * x0 + t * x1;
				const y4 = u * y0 + t * y1;
				const x5 = u * x1 + t * x2;
				const y5 = u * y1 + t * y2;
				const x6 = u * x2 + t * x3;
				const y6 = u * y2 + t * y3;
				const x7 = u * x4 + t * x5;
				const y7 = u * y4 + t * y5;
				const x8 = u * x5 + t * x6;
				const y8 = u * y5 + t * y6;
				const x9 = u * x7 + t * x8;
				const y9 = u * y7 + t * y8;
				return [[
					x0,
					y0,
					x4,
					y4,
					x7,
					y7,
					x9,
					y9
				], [
					x9,
					y9,
					x8,
					y8,
					x6,
					y6,
					x3,
					y3
				]];
			},
			getMonoCurves: function(v, dir) {
				const curves = [];
				const io = dir ? 0 : 1;
				const o0 = v[io + 0];
				const o1 = v[io + 2];
				const o2 = v[io + 4];
				const o3 = v[io + 6];
				if (o0 >= o1 === o1 >= o2 && o1 >= o2 === o2 >= o3 || Curve.isStraight(v)) {
					curves.push(v);
				} else {
					const a = 3 * (o1 - o2) - o0 + o3;
					const b = 2 * (o0 + o2) - 4 * o1;
					const c = o1 - o0;
					const tMin = 1e-8;
					const tMax = 1 - tMin;
					const roots = [];
					const n = Numerical.solveQuadratic(a, b, c, roots, tMin, tMax);
					if (!n) {
						curves.push(v);
					} else {
						roots.sort();
						let t = roots[0];
						let parts = Curve.subdivide(v, t);
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
			solveCubic: function(v, coord, val, roots, min, max) {
				const v0 = v[coord];
				const v1 = v[coord + 2];
				const v2 = v[coord + 4];
				const v3 = v[coord + 6];
				let res = 0;
				if (!(v0 < val && v3 < val && v1 < val && v2 < val || v0 > val && v3 > val && v1 > val && v2 > val)) {
					const c = 3 * (v1 - v0);
					const b = 3 * (v2 - v1) - c;
					const a = v3 - v0 - c - b;
					res = Numerical.solveCubic(a, b, c, v0 - val, roots, min, max);
				}
				return res;
			},
			getPart: function(v, from, to) {
				const flip = from > to;
				if (flip) {
					const tmp = from;
					from = to;
					to = tmp;
				}
				if (from > 0) v = Curve.subdivide(v, from)[1];
				if (to < 1) v = Curve.subdivide(v, (to - from) / (1 - from))[0];
				return flip ? [
					v[6],
					v[7],
					v[4],
					v[5],
					v[2],
					v[3],
					v[0],
					v[1]
				] : v;
			},
			isFlatEnough: function(v, flatness) {
				const x0 = v[0];
				const y0 = v[1];
				const x1 = v[2];
				const y1 = v[3];
				const x2 = v[4];
				const y2 = v[5];
				const x3 = v[6];
				const y3 = v[7];
				const ux = 3 * x1 - 2 * x0 - x3;
				const uy = 3 * y1 - 2 * y0 - y3;
				const vx = 3 * x2 - 2 * x3 - x0;
				const vy = 3 * y2 - 2 * y3 - y0;
				return Math.max(ux * ux, vx * vx) + Math.max(uy * uy, vy * vy) <= 16 * flatness * flatness;
			},
			getArea: function(v) {
				const x0 = v[0];
				const y0 = v[1];
				const x1 = v[2];
				const y1 = v[3];
				const x2 = v[4];
				const y2 = v[5];
				const x3 = v[6];
				const y3 = v[7];
				return 3 * ((y3 - y0) * (x1 + x2) - (x3 - x0) * (y1 + y2) + y1 * (x0 - x2) - x1 * (y0 - y2) + y3 * (x2 + x0 / 3) - x3 * (y2 + y0 / 3)) / 20;
			},
			_addBounds: function(v0, v1, v2, v3, coord, padding, min, max, roots) {
				function add(value, padding) {
					const left = value - padding;
					const right = value + padding;
					if (left < min[coord]) min[coord] = left;
					if (right > max[coord]) max[coord] = right;
				}
				const minPad = min[coord] + padding;
				const maxPad = max[coord] - padding;
				if (v0 < minPad || v1 < minPad || v2 < minPad || v3 < minPad || v0 > maxPad || v1 > maxPad || v2 > maxPad || v3 > maxPad) {
					if (v1 < v0 != v1 < v3 && v2 < v0 != v2 < v3) {
						add(v0, 0);
						add(v3, 0);
					} else {
						const a = 3 * (v1 - v2) - v0 + v3;
						const b = 2 * (v0 + v2) - 4 * v1;
						const c = v1 - v0;
						const count = Numerical.solveQuadratic(a, b, c, roots);
						const tMin = 1e-8;
						const tMax = 1 - tMin;
						add(v3, 0);
						for (let i = 0; i < count; i++) {
							const t = roots[i];
							const u = 1 - t;
							if (tMin <= t && t <= tMax) add(u * u * u * v0 + 3 * u * u * t * v1 + 3 * u * t * t * v2 + t * t * t * v3, padding);
						}
					}
				}
			}
		}
	}, Base.each(["getBounds", "getStrokeBounds"], function(name) {
		this[name] = function() {
			if (!this._bounds) this._bounds = {};
			let bounds = this._bounds[name];
			if (!bounds) {
				const path = this._path;
				bounds = this._bounds[name] = Path[path ? name : "getBounds"]([this._segment1, this._segment2], false, path);
			}
			return bounds.clone();
		};
	}, { getHandleBounds: function() {
		const v = this.getValues();
		const x1 = Math.min(v[0], v[2], v[4], v[6]);
		const y1 = Math.min(v[1], v[3], v[5], v[7]);
		const x2 = Math.max(v[0], v[2], v[4], v[6]);
		const y2 = Math.max(v[1], v[3], v[5], v[7]);
		return new Rectangle(x1, y1, x2 - x1, y2 - y1);
	} }), Base.each({
		isStraight: function(x1, y1, h1x, h1y, h2x, h2y, x2, y2) {
			const isZero = Numerical.isZero;
			if (isZero(h1x) && isZero(h1y) && isZero(h2x) && isZero(h2y)) {
				return true;
			} else {
				const isCollinear = Point.isCollinear;
				const vx = x2 - x1;
				const vy = y2 - y1;
				if (isZero(vx) && isZero(vy)) {
					return false;
				} else if (isCollinear(vx, vy, h1x, h1y) && isCollinear(vx, vy, h2x, h2y)) {
					const getDistance = Line.getDistance;
					const epsilon = 1e-7;
					if (getDistance(x1, y1, vx, vy, x1 + h1x, y1 + h1y, true) < epsilon && getDistance(x1, y1, vx, vy, x2 + h2x, y2 + h2y, true) < epsilon) {
						const div = vx * vx + vy * vy;
						const s1 = (vx * h1x + vy * h1y) / div;
						const s2 = (vx * h2x + vy * h2y) / div;
						return s1 >= 0 && s1 <= 1 && s2 <= 0 && s2 >= -1;
					}
				}
			}
			return false;
		},
		isLinear: function(x1, y1, h1x, h1y, h2x, h2y, x2, y2) {
			const x = (x2 - x1) / 3;
			const y = (y2 - y1) / 3;
			return h1x === x && h1y === y && -h2x === x && -h2y === y;
		}
	}, function(test, name) {
		this[name] = function(epsilon) {
			const p1 = this._segment1._point;
			const h1 = this._segment1._handleOut;
			const h2 = this._segment2._handleIn;
			const p2 = this._segment2._point;
			return test(p1._x, p1._y, h1._x, h1._y, h2._x, h2._y, p2._x, p2._y, epsilon);
		};
		this.statics[name] = function(v, epsilon) {
			const x1 = v[0];
			const y1 = v[1];
			const x2 = v[6];
			const y2 = v[7];
			return test(x1, y1, v[2] - x1, v[3] - y1, v[4] - x2, v[5] - y2, x2, y2, epsilon);
		};
	}, {
		statics: {},
		hasHandles: function() {
			return !this._segment1._handleOut.isZero() || !this._segment2._handleIn.isZero();
		},
		hasLength: function(epsilon) {
			return (!this.getPoint1().equals(this.getPoint2()) || this.hasHandles()) && this.getLength() > (epsilon || 0);
		},
		isCollinear: function(curve) {
			return curve && this.isStraight() && curve.isStraight() && this.getLine().isCollinear(curve.getLine());
		},
		isHorizontal: function() {
			return this.isStraight() && Math.abs(this.getTangentAtTime(.5).y) < 1e-8;
		},
		isVertical: function() {
			return this.isStraight() && Math.abs(this.getTangentAtTime(.5).x) < 1e-8;
		}
	}), {
		beans: false,
		getLocationAt: function(offset, _isTime) {
			return this.getLocationAtTime(_isTime ? offset : this.getTimeAt(offset));
		},
		getLocationAtTime: function(t) {
			return t != null && t >= 0 && t <= 1 ? new CurveLocation(this, t) : null;
		},
		getTimeAt: function(offset, start) {
			return Curve.getTimeAt(this.getValues(), offset, start);
		},
		getParameterAt: "#getTimeAt",
		getTimesWithTangent: function() {
			const tangent = Point.read(arguments);
			return tangent.isZero() ? [] : Curve.getTimesWithTangent(this.getValues(), tangent);
		},
		getOffsetAtTime: function(t) {
			return this.getPartLength(0, t);
		},
		getLocationOf: function() {
			return this.getLocationAtTime(this.getTimeOf(Point.read(arguments)));
		},
		getOffsetOf: function() {
			const loc = this.getLocationOf.apply(this, arguments);
			return loc ? loc.getOffset() : null;
		},
		getTimeOf: function() {
			return Curve.getTimeOf(this.getValues(), Point.read(arguments));
		},
		getParameterOf: "#getTimeOf",
		getNearestLocation: function() {
			const point = Point.read(arguments);
			const values = this.getValues();
			const t = Curve.getNearestTime(values, point);
			const pt = Curve.getPoint(values, t);
			return new CurveLocation(this, t, pt, null, point.getDistance(pt));
		},
		getNearestPoint: function() {
			const loc = this.getNearestLocation.apply(this, arguments);
			return loc ? loc.getPoint() : loc;
		}
	}, new (function() {
		const methods = [
			"getPoint",
			"getTangent",
			"getNormal",
			"getWeightedTangent",
			"getWeightedNormal",
			"getCurvature"
		];
		return Base.each(methods, function(name) {
			this[name + "At"] = function(location, _isTime) {
				const values = this.getValues();
				return Curve[name](values, _isTime ? location : Curve.getTimeAt(values, location));
			};
			this[name + "AtTime"] = function(time) {
				return Curve[name](this.getValues(), time);
			};
		}, { statics: { _evaluateMethods: methods } });
	})(), new (function() {
		function getLengthIntegrand(c) {
			const ax = 3 * c[0];
			const bx = 2 * c[1];
			const cx = c[2];
			const ay = 3 * c[3];
			const by = 2 * c[4];
			const cy = c[5];
			return function(t) {
				const dx = (ax * t + bx) * t + cx;
				const dy = (ay * t + by) * t + cy;
				return Math.sqrt(dx * dx + dy * dy);
			};
		}
		function getPartLength(c, ds, a, b) {
			if (a > b) return -getPartLength(c, ds, b, a);
			const ax = 3 * c[0];
			const bx = 2 * c[1];
			const cx = c[2];
			const ay = 3 * c[3];
			const by = 2 * c[4];
			const cy = c[5];
			const tolerance = 1e-7;
			const x0 = (ax * a + bx) * a + cx;
			const y0 = (ay * a + by) * a + cy;
			const x1 = ax * a * b + bx * (a + b) * .5 + cx;
			const y1 = ay * a * b + by * (a + b) * .5 + cy;
			const x2 = (ax * b + bx) * b + cx;
			const y2 = (ay * b + by) * b + cy;
			const sx = x0 + x1 + x2;
			const sy = y0 + y1 + y2;
			const p0 = x0 * sx + y0 * sy;
			const p1 = x1 * sx + y1 * sy;
			const p2 = x2 * sx + y2 * sy;
			const l0 = x0 * x0 + y0 * y0;
			const l1 = x1 * x1 + y1 * y1;
			const l2 = x2 * x2 + y2 * y2;
			const max = l0 > l1 ? l0 > l2 ? l0 : l2 : l1 > l2 ? l1 : l2;
			if (p0 >= 0 && p2 >= 0 && p1 > 0 && p1 * p1 > .01 * (sx * sx + sy * sy) * max) {
				const min = p0 < p1 ? p0 < p2 ? p0 : p2 : p1 < p2 ? p1 : p2;
				const d01 = (x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0);
				const d12 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
				return (d01 > d12 ? d01 : d12) * (sx * sx + sy * sy) < .01 * min * min ? Numerical.gauss(ds, a, b) : Numerical.integrate(ds, a, b, tolerance);
			}
			const times = [];
			const count = Math.max(0, Numerical.solveCubic(2 * (ax * ax + ay * ay), 3 * (ax * bx + ay * by), bx * bx + by * by + 2 * (ax * cx + ay * cy), bx * cx + by * cy, times, a, b));
			let length = 0;
			times.length = count;
			times.sort(function(t1, t2) {
				return t1 - t2;
			});
			times.push(b);
			for (let i = 0; i <= count; i++) {
				const t = times[i];
				if (t > a) {
					length += Numerical.integrate(ds, a, t, tolerance);
					a = t;
				}
			}
			return length;
		}
		function getCoefficients(v) {
			const x0 = v[0];
			const y0 = v[1];
			let x1 = v[2];
			let y1 = v[3];
			let x2 = v[4];
			let y2 = v[5];
			const x3 = v[6];
			const y3 = v[7];
			const isZero = Numerical.isZero;
			if (isZero(x1 - x0) && isZero(y1 - y0)) {
				x1 = x0;
				y1 = y0;
			}
			if (isZero(x2 - x3) && isZero(y2 - y3)) {
				x2 = x3;
				y2 = y3;
			}
			const cx = 3 * (x1 - x0);
			const bx = 3 * (x2 - x1) - cx;
			const ax = x3 - x0 - cx - bx;
			const cy = 3 * (y1 - y0);
			const by = 3 * (y2 - y1) - cy;
			const ay = y3 - y0 - cy - by;
			return [
				ax,
				bx,
				cx,
				ay,
				by,
				cy,
				x1,
				y1,
				x2,
				y2
			];
		}
		function getCoordinate(v0, v3, a, b, c, t) {
			return t === 0 ? v0 : t === 1 ? v3 : ((a * t + b) * t + c) * t + v0;
		}
		function evaluate(v, t, type, normalized) {
			let x2;
			let y2;
			if (t == null || t < 0 || t > 1) return null;
			const x0 = v[0];
			const y0 = v[1];
			const x3 = v[6];
			const y3 = v[7];
			const c = getCoefficients(v);
			const ax = c[0];
			const bx = c[1];
			const cx = c[2];
			const ay = c[3];
			const by = c[4];
			const cy = c[5];
			const x1 = c[6];
			const y1 = c[7];
			x2 = c[8];
			y2 = c[9];
			let x;
			let y;
			if (type === 0) {
				x = getCoordinate(x0, x3, ax, bx, cx, t);
				y = getCoordinate(y0, y3, ay, by, cy, t);
			} else {
				const tMin = 1e-8;
				const tMax = 1 - tMin;
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
					const len = Math.sqrt(x * x + y * y);
					if (len) {
						x /= len;
						y /= len;
					}
				}
				if (type === 3) {
					x2 = 6 * ax * t + 2 * bx;
					y2 = 6 * ay * t + 2 * by;
					const d = Math.pow(x * x + y * y, 3 / 2);
					x = d !== 0 ? (x * y2 - y * x2) / d : 0;
					y = 0;
				}
			}
			return type === 2 ? new Point(y, -x) : new Point(x, y);
		}
		return { statics: {
			classify: function(v) {
				const x0 = v[0];
				const y0 = v[1];
				const x1 = v[2];
				const y1 = v[3];
				const x2 = v[4];
				const y2 = v[5];
				const x3 = v[6];
				const y3 = v[7];
				const a1 = x0 * (y3 - y2) + y0 * (x2 - x3) + x3 * y2 - y3 * x2;
				const a2 = x1 * (y0 - y3) + y1 * (x3 - x0) + x0 * y3 - y0 * x3;
				const a3 = x2 * (y1 - y0) + y2 * (x0 - x1) + x1 * y0 - y1 * x0;
				let d3 = 3 * a3;
				let d2 = d3 - a2;
				let d1 = d2 - a2 + a1;
				const l = Math.sqrt(d1 * d1 + d2 * d2 + d3 * d3);
				const magnitude = Math.max(Math.abs(x0), Math.abs(y0), Math.abs(x1), Math.abs(y1), Math.abs(x2), Math.abs(y2), Math.abs(x3), Math.abs(y3));
				const s = l > magnitude * Numerical.getEpsilon(magnitude) ? 1 / l : 0;
				const isZero = Numerical.isZero;
				const serpentine = "serpentine";
				d1 *= s;
				d2 *= s;
				d3 *= s;
				function type(type, t1, t2) {
					const tMin = 1e-8;
					const tMax = 1 - tMin;
					const hasRoots = t1 !== undefined;
					let t1Ok = hasRoots && t1 > tMin && t1 < tMax;
					let t2Ok = hasRoots && t2 > tMin && t2 < tMax;
					if (hasRoots && (!(t1Ok || t2Ok) || type === "loop" && !(t1Ok && t2Ok))) {
						type = "arch";
						t1Ok = t2Ok = false;
					}
					return {
						type,
						roots: t1Ok || t2Ok ? t1Ok && t2Ok ? t1 < t2 ? [t1, t2] : [t2, t1] : [t1Ok ? t1 : t2] : null
					};
				}
				if (isZero(d1)) {
					return isZero(d2) ? type(isZero(d3) ? "line" : "quadratic") : type(serpentine, d3 / (3 * d2));
				}
				const d = 3 * d2 * d2 - 4 * d1 * d3;
				if (isZero(d)) {
					return type("cusp", d2 / (2 * d1));
				}
				const f1 = d > 0 ? Math.sqrt(d / 3) : Math.sqrt(-d);
				const f2 = 2 * d1;
				return type(d > 0 ? serpentine : "loop", (d2 + f1) / f2, (d2 - f1) / f2);
			},
			getLength: function(v, a, b) {
				let c;
				if (a === undefined) a = 0;
				if (b === undefined) b = 1;
				if (Curve.isStraight(v)) {
					c = v;
					if (b < 1) {
						c = Curve.subdivide(c, b)[0];
						a /= b;
					}
					if (a > 0) {
						c = Curve.subdivide(c, a)[1];
					}
					const dx = c[6] - c[0];
					const dy = c[7] - c[1];
					return Math.sqrt(dx * dx + dy * dy);
				}
				c = getCoefficients(v);
				return getPartLength(c, getLengthIntegrand(c), a, b);
			},
			getTimeAt: function(v, offset, start) {
				if (start === undefined) start = offset < 0 ? 1 : 0;
				if (offset === 0) return start;
				const abs = Math.abs;
				const epsilon = 1e-12;
				const forward = offset > 0;
				const a = forward ? start : 0;
				const b = forward ? 1 : start;
				const c = getCoefficients(v);
				const ds = getLengthIntegrand(c);
				const rangeLength = getPartLength(c, ds, a, b);
				const diff = abs(offset) - rangeLength;
				if (abs(diff) < epsilon) {
					return forward ? b : a;
				} else if (diff > epsilon) {
					return null;
				}
				const guess = offset / rangeLength;
				let length = 0;
				function f(t) {
					length += getPartLength(c, ds, start, t);
					start = t;
					return length - offset;
				}
				return Numerical.findRoot(f, ds, start + guess, a, b, 32, 1e-8);
			},
			getTimeOf: function(v, point, tolerance) {
				const abs = Math.abs;
				const x0 = v[0];
				const y0 = v[1];
				const x3 = v[6];
				const y3 = v[7];
				const px = point.x;
				const py = point.y;
				const epsilon = tolerance || Numerical.getEpsilon(Math.max(abs(x0), abs(y0), abs(v[2]), abs(v[3]), abs(v[4]), abs(v[5]), abs(x3), abs(y3)), 1e-7);
				function isClose(x, y) {
					const dx = x - px;
					const dy = y - py;
					return Math.sqrt(dx * dx + dy * dy) <= epsilon;
				}
				if (isClose(x0, y0)) return 0;
				if (isClose(x3, y3)) return 1;
				const c = getCoefficients(v);
				const ax = c[0];
				const bx = c[1];
				const cx = c[2];
				const ay = c[3];
				const by = c[4];
				const cy = c[5];
				const roots = [];
				for (let i = 0; i < 2; i++) {
					const count = Curve.solveCubic(v, i, i ? py : px, roots, 0, 1);
					for (let j = 0; j < count; j++) {
						let t = roots[j];
						const x = getCoordinate(x0, x3, ax, bx, cx, t);
						const y = getCoordinate(y0, y3, ay, by, cy, t);
						if (isClose(x, y)) return t;
						const dx = (3 * ax * t + 2 * bx) * t + cx;
						const dy = (3 * ay * t + 2 * by) * t + cy;
						const length2 = dx * dx + dy * dy;
						if (length2) {
							t = Math.max(0, Math.min(1, t + ((px - x) * dx + (py - y) * dy) / length2));
							if (isClose(getCoordinate(x0, x3, ax, bx, cx, t), getCoordinate(y0, y3, ay, by, cy, t))) return t;
						}
					}
				}
				return null;
			},
			getNearestTime: function(v, point) {
				let i;
				const x0 = v[0];
				const y0 = v[1];
				const x3 = v[6];
				const y3 = v[7];
				const px = point.x;
				const py = point.y;
				if (Curve.isStraight(v)) {
					const vx = x3 - x0;
					const vy = y3 - y0;
					const det = vx * vx + vy * vy;
					if (det === 0) return 0;
					const u = ((px - x0) * vx + (py - y0) * vy) / det;
					return u < 1e-12 ? 0 : u > .999999999999 ? 1 : Curve.getTimeOf(v, new Point(x0 + u * vx, y0 + u * vy));
				}
				const c = getCoefficients(v);
				const ax = c[0];
				const bx = c[1];
				const cx = c[2];
				const ay = c[3];
				const by = c[4];
				const cy = c[5];
				const count = 100;
				const distances = [];
				let minDist = Infinity;
				let minT = 0;
				function getDistance(t) {
					const dx = getCoordinate(x0, x3, ax, bx, cx, t) - px;
					const dy = getCoordinate(y0, y3, ay, by, cy, t) - py;
					return dx * dx + dy * dy;
				}
				for (i = 0; i <= count; i++) distances.push(getDistance(i / count));
				for (i = 0; i <= count; i++) {
					let dist = distances[i];
					if ((i === 0 || dist < distances[i - 1]) && (i === count || dist <= distances[i + 1])) {
						let t = i / count;
						let step = 1 / (count * 2);
						while (step > 1e-8) {
							const t1 = t - step;
							const t2 = t + step;
							const dist1 = t1 >= 0 ? getDistance(t1) : Infinity;
							const dist2 = t2 <= 1 ? getDistance(t2) : Infinity;
							if (dist1 < dist && dist1 <= dist2) {
								t = t1;
								dist = dist1;
							} else if (dist2 < dist) {
								t = t2;
								dist = dist2;
							} else {
								step /= 2;
							}
						}
						if (dist < minDist) {
							minDist = dist;
							minT = t;
						}
					}
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
				const c = getCoefficients(v);
				const ax = c[0];
				const bx = c[1];
				const cx = c[2];
				const ay = c[3];
				const by = c[4];
				const cy = c[5];
				const tMin = 1e-8;
				const tMax = 1 - tMin;
				const roots = [];
				Numerical.solveCubic(9 * (ax * ax + ay * ay), 9 * (ax * bx + by * ay), 2 * (bx * bx + by * by) + 3 * (cx * ax + cy * ay), cx * bx + by * cy, roots, tMin, tMax);
				return roots.sort();
			},
			getReversals: function(v, tolerance) {
				let i;
				let dx = v[6] - v[0];
				let dy = v[7] - v[1];
				for (i = 0; i < 4; i += 2) {
					const hx = v[i + 2] - v[i];
					const hy = v[i + 3] - v[i + 1];
					if (hx * hx + hy * hy > dx * dx + dy * dy) {
						dx = hx;
						dy = hy;
					}
				}
				const length = Math.sqrt(dx * dx + dy * dy);
				const o = [];
				if (!length) return [];
				for (i = 0; i < 8; i += 2) {
					const x = v[i] - v[0];
					const y = v[i + 1] - v[1];
					if (Math.abs(x * dy - y * dx) > tolerance * length) return [];
					o.push((x * dx + y * dy) / length);
				}
				const roots = [];
				const count = Numerical.solveQuadratic(3 * (o[1] - o[2]) - o[0] + o[3], 2 * (o[0] + o[2]) - 4 * o[1], o[1] - o[0], roots, 1e-8, 1 - Numerical.CURVETIME_EPSILON);
				return count > 0 ? roots.slice(0, count).sort(function(a, b) {
					return a - b;
				}) : [];
			},
			getTimesWithTangent: function(v, tangent) {
				let den;
				const c = getCoefficients(v);
				const ax = 3 * c[0];
				const bx = 2 * c[1];
				const cx = c[2];
				const ay = 3 * c[3];
				const by = 2 * c[4];
				const cy = c[5];
				const normalized = tangent.normalize();
				const tx = normalized.x;
				const ty = normalized.y;
				den = 2 * ax * ty - 2 * ay * tx;
				const times = [];
				if (Math.abs(den) < Numerical.CURVETIME_EPSILON) {
					const num = cx * ty - cy * tx;
					den = bx * ty - by * tx;
					if (den != 0) {
						const t = -num / den;
						if (t >= 0 && t <= 1) times.push(t);
					}
				} else {
					const delta = (bx * bx - 4 * ax * cx) * ty * ty + (-2 * bx * by + 4 * ay * cx + 4 * ax * cy) * tx * ty + (by * by - 4 * ay * cy) * tx * tx;
					const k = bx * ty - by * tx;
					if (delta >= 0 && den != 0) {
						const d = Math.sqrt(delta);
						const t0 = -(k + d) / den;
						const t1 = (-k + d) / den;
						if (t0 >= 0 && t0 <= 1) times.push(t0);
						if (t1 >= 0 && t1 <= 1) times.push(t1);
					}
				}
				return times;
			}
		} };
	})(), new (function() {
		function addLocation(locations, include, c1, t1, c2, t2, overlap) {
			const excludeStart = !overlap && c1.getPrevious() === c2;
			const excludeEnd = !overlap && c1 !== c2 && c1.getNext() === c2;
			const tMin = 1e-8;
			const tMax = 1 - tMin;
			if (t1 !== null && t1 >= (excludeStart ? tMin : 0) && t1 <= (excludeEnd ? tMax : 1)) {
				if (t2 !== null && t2 >= (excludeEnd ? tMin : 0) && t2 <= (excludeStart ? tMax : 1)) {
					const loc1 = new CurveLocation(c1, t1, null, overlap);
					const loc2 = new CurveLocation(c2, t2, null, overlap);
					loc1._intersection = loc2;
					loc2._intersection = loc1;
					if (!include || include(loc1)) {
						CurveLocation.insert(locations, loc1, true);
					}
				}
			}
		}
		function addCurveIntersections(v1, v2, c1, c2, locations, include, flip, recursion, calls, tMin, tMax, uMin, uMax, tolerance) {
			let t;
			let u;
			let parts;
			if (++calls >= 4096 || ++recursion >= 40) return calls;
			const fatLineEpsilon = 1e-9;
			const q0x = v2[0];
			const q0y = v2[1];
			const q3x = v2[6];
			const q3y = v2[7];
			const getSignedDistance = Line.getSignedDistance;
			const d1 = getSignedDistance(q0x, q0y, q3x, q3y, v2[2], v2[3]);
			const d2 = getSignedDistance(q0x, q0y, q3x, q3y, v2[4], v2[5]);
			const factor = d1 * d2 > 0 ? 3 / 4 : 4 / 9;
			const dMin = factor * Math.min(0, d1, d2);
			const dMax = factor * Math.max(0, d1, d2);
			const dp0 = getSignedDistance(q0x, q0y, q3x, q3y, v1[0], v1[1]);
			const dp1 = getSignedDistance(q0x, q0y, q3x, q3y, v1[2], v1[3]);
			const dp2 = getSignedDistance(q0x, q0y, q3x, q3y, v1[4], v1[5]);
			const dp3 = getSignedDistance(q0x, q0y, q3x, q3y, v1[6], v1[7]);
			const hull = getConvexHull(dp0, dp1, dp2, dp3);
			const top = hull[0];
			const bottom = hull[1];
			let tMinClip;
			let tMaxClip;
			if (d1 === 0 && d2 === 0 && dp0 === 0 && dp1 === 0 && dp2 === 0 && dp3 === 0 || (tMinClip = clipConvexHull(top, bottom, dMin, dMax)) == null || (tMaxClip = clipConvexHull(top.reverse(), bottom.reverse(), dMin, dMax)) == null) return calls;
			let tMinNew = tMin + (tMax - tMin) * tMinClip;
			let tMaxNew = tMin + (tMax - tMin) * tMaxClip;
			if (Math.max(uMax - uMin, tMaxNew - tMinNew) < fatLineEpsilon) {
				t = (tMinNew + tMaxNew) / 2;
				u = (uMin + uMax) / 2;
				addLocation(locations, include, flip ? c2 : c1, flip ? u : t, flip ? c1 : c2, flip ? t : u);
			} else {
				v1 = Curve.getPart(v1, tMinClip, tMaxClip);
				const uDiff = uMax - uMin;
				if (tMaxClip - tMinClip > .8) {
					const isNext = tolerance && tMaxNew === 1 && uMin === 0 && c1.getNext() === c2;
					const isPrevious = tolerance && !isNext && tMinNew === 0 && uMax === 1 && c1.getPrevious() === c2;
					if (isNext || isPrevious) {
						const offset = isNext ? tolerance : -tolerance;
						const s1 = Curve.getTimeAt(v1, -offset);
						const s2 = Curve.getTimeAt(v2, offset);
						if (s1 !== null && s2 !== null) {
							t = tMinNew + (tMaxNew - tMinNew) * s1;
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
							calls = addCurveIntersections(v1, v2, c1, c2, locations, include, flip, recursion, calls, tMinNew, tMaxNew, uMin, uMax, tolerance);
						}
					} else if (!(tolerance && addImplicitIntersections(v1, v2, c1, c2, locations, include, flip, tMinNew, tMaxNew, uMin, uMax, tolerance))) {
						if (tMaxNew - tMinNew > uDiff) {
							parts = Curve.subdivide(v1, .5);
							t = (tMinNew + tMaxNew) / 2;
							calls = addCurveIntersections(v2, parts[0], c2, c1, locations, include, !flip, recursion, calls, uMin, uMax, tMinNew, t, tolerance);
							calls = addCurveIntersections(v2, parts[1], c2, c1, locations, include, !flip, recursion, calls, uMin, uMax, t, tMaxNew, tolerance);
						} else {
							parts = Curve.subdivide(v2, .5);
							u = (uMin + uMax) / 2;
							calls = addCurveIntersections(parts[0], v1, c2, c1, locations, include, !flip, recursion, calls, uMin, u, tMinNew, tMaxNew, tolerance);
							calls = addCurveIntersections(parts[1], v1, c2, c1, locations, include, !flip, recursion, calls, u, uMax, tMinNew, tMaxNew, tolerance);
						}
					}
				} else {
					if (uDiff === 0 || uDiff >= fatLineEpsilon) {
						calls = addCurveIntersections(v2, v1, c2, c1, locations, include, !flip, recursion, calls, uMin, uMax, tMinNew, tMaxNew, tolerance);
					} else {
						calls = addCurveIntersections(v1, v2, c1, c2, locations, include, flip, recursion, calls, tMinNew, tMaxNew, uMin, uMax, tolerance);
					}
				}
			}
			return calls;
		}
		function addImplicitIntersections(v1, v2, c1, c2, locations, include, flip, tMin, tMax, uMin, uMax, tolerance) {
			let i;
			const x0 = v2[0];
			const y0 = v2[1];
			let size = 0;
			for (i = 0; i < 8; i += 2) {
				size = Math.max(size, Math.abs(v1[i] - x0), Math.abs(v1[i + 1] - y0), Math.abs(v2[i] - x0), Math.abs(v2[i + 1] - y0));
			}
			if (size) {
				const p = getLocalPoints(v1, x0, y0, size);
				const q = getLocalPoints(v2, x0, y0, size);
				const dx = v2[6] - 3 * (v2[4] - v2[2]) - x0;
				const dy = v2[7] - 3 * (v2[5] - v2[3]) - y0;
				const isQuadratic = 4 / 27 * Math.sqrt(dx * dx + dy * dy) <= tolerance;
				const polynomial = isQuadratic ? getQuadraticImplicit(p, [
					q[0],
					getQuadraticHandle(q),
					q[3]
				]) : getCubicImplicit(p, q);
				const roots = [];
				let speed = 0;
				for (i = 0; i < 6; i += 2) {
					speed = Math.max(speed, 3 * Math.sqrt(Math.pow(v1[i + 2] - v1[i], 2) + Math.pow(v1[i + 3] - v1[i + 1], 2)));
				}
				if (polynomial.coefficients.every(function(coefficient, i) {
					return Math.abs(coefficient) <= polynomial.errors[i];
				})) return false;
				const count = Numerical.solveBernstein(polynomial.coefficients, polynomial.errors, roots, speed ? tolerance / speed : 1);
				if (count >= polynomial.coefficients.length) return false;
				for (i = 0; i < count; i++) {
					let t = roots[i];
					let u = Curve.getTimeOf(v2, Curve.getPoint(v1, t), tolerance);
					if (u !== null) {
						t = tMin + (tMax - tMin) * t;
						u = uMin + (uMax - uMin) * u;
						addLocation(locations, include, flip ? c2 : c1, flip ? u : t, flip ? c1 : c2, flip ? t : u);
					}
				}
				return true;
			}
			return false;
		}
		function getLocalPoints(v, x0, y0, size) {
			const u = 112e-18;
			const points = [];
			for (let i = 0; i < 8; i += 2) {
				const x = (v[i] - x0) / size;
				const y = (v[i + 1] - y0) / size;
				points.push({
					x,
					y,
					ex: 2 * u * Math.abs(x),
					ey: 2 * u * Math.abs(y)
				});
			}
			return points;
		}
		function getProductError(a, ea, b, eb) {
			return Math.abs(a) * eb + Math.abs(b) * ea + ea * eb + 112e-18 * Math.abs(a * b);
		}
		function getLinearFactor(p, q, i, j, factor) {
			const u = 112e-18;
			const coefficients = [];
			const errors = [];
			for (let k = 0; k < 4; k++) {
				const r = p[k];
				const dx1 = q[i].x - r.x;
				const dy1 = q[j].y - r.y;
				const dx2 = q[j].x - r.x;
				const dy2 = q[i].y - r.y;
				const error1 = getProductError(dx1, q[i].ex + r.ex + u * Math.abs(dx1), dy1, q[j].ey + r.ey + u * Math.abs(dy1));
				const error2 = getProductError(dx2, q[j].ex + r.ex + u * Math.abs(dx2), dy2, q[i].ey + r.ey + u * Math.abs(dy2));
				const difference = dx1 * dy1 - dx2 * dy2;
				const value = factor * difference;
				coefficients.push(value);
				errors.push(factor * (error1 + error2 + u * Math.abs(difference)) + u * Math.abs(value));
			}
			return {
				coefficients,
				errors
			};
		}
		const binomials = [[1]];
		for (let i = 1; i <= 9; i++) {
			const row = [1];
			for (let j = 1; j < i; j++) row.push(binomials[i - 1][j - 1] + binomials[i - 1][j]);
			row.push(1);
			binomials.push(row);
		}
		function multiply(a, b) {
			const u = 112e-18;
			const m = a.coefficients.length - 1;
			const n = b.coefficients.length - 1;
			const coefficients = [];
			const errors = [];
			for (let k = 0; k <= m + n; k++) {
				let sum = 0;
				let error = 0;
				for (let i = Math.max(0, k - n), l = Math.min(m, k); i <= l; i++) {
					const factor = binomials[m][i] * binomials[n][k - i] / binomials[m + n][k];
					const a1 = a.coefficients[i];
					const b1 = b.coefficients[k - i];
					const term = factor * (a1 * b1);
					sum += term;
					error += factor * getProductError(a1, a.errors[i], b1, b.errors[k - i]) + u * (2 * Math.abs(term) + Math.abs(sum));
				}
				coefficients.push(sum);
				errors.push(error);
			}
			return {
				coefficients,
				errors
			};
		}
		function add(a, b, sign) {
			const coefficients = [];
			const errors = [];
			for (let i = 0, l = a.coefficients.length; i < l; i++) {
				const sum = a.coefficients[i] + sign * b.coefficients[i];
				coefficients.push(sum);
				errors.push(a.errors[i] + b.errors[i] + 112e-18 * Math.abs(sum));
			}
			return {
				coefficients,
				errors
			};
		}
		function getCubicImplicit(p, q) {
			const l32 = getLinearFactor(p, q, 3, 2, 1 * 3);
			const l31 = getLinearFactor(p, q, 3, 1, 1 * 3);
			const l30 = getLinearFactor(p, q, 3, 0, 1 * 1);
			const l21 = getLinearFactor(p, q, 2, 1, 3 * 3);
			const l20 = getLinearFactor(p, q, 2, 0, 3 * 1);
			const l10 = getLinearFactor(p, q, 1, 0, 3 * 1);
			const m = add(l30, l21, 1);
			return add(add(multiply(l32, add(multiply(m, l10), multiply(l20, l20), -1)), multiply(l31, add(multiply(l31, l10), multiply(l20, l30), -1)), -1), multiply(l30, add(multiply(l31, l20), multiply(m, l30), -1)), 1);
		}
		function getQuadraticHandle(q) {
			const u = 112e-18;
			const x = (3 * q[1].x - q[0].x) / 2;
			const y = (3 * q[1].y - q[0].y) / 2;
			return {
				x,
				y,
				ex: (3 * q[1].ex + q[0].ex) / 2 + 2 * u * Math.abs(x),
				ey: (3 * q[1].ey + q[0].ey) / 2 + 2 * u * Math.abs(y)
			};
		}
		function getQuadraticImplicit(p, q) {
			const l21 = getLinearFactor(p, q, 2, 1, 1 * 2);
			const l20 = getLinearFactor(p, q, 2, 0, 1 * 1);
			const l10 = getLinearFactor(p, q, 1, 0, 2 * 1);
			return add(multiply(l21, l10), multiply(l20, l20), -1);
		}
		function getConvexHull(dq0, dq1, dq2, dq3) {
			const p0 = [0, dq0];
			const p1 = [1 / 3, dq1];
			const p2 = [2 / 3, dq2];
			const p3 = [1, dq3];
			const dist1 = dq1 - (2 * dq0 + dq3) / 3;
			const dist2 = dq2 - (dq0 + 2 * dq3) / 3;
			let hull;
			if (dist1 * dist2 < 0) {
				hull = [[
					p0,
					p1,
					p3
				], [
					p0,
					p2,
					p3
				]];
			} else {
				const distRatio = dist1 / dist2;
				hull = [distRatio >= 2 ? [
					p0,
					p1,
					p3
				] : distRatio <= .5 ? [
					p0,
					p2,
					p3
				] : [
					p0,
					p1,
					p2,
					p3
				], [p0, p3]];
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
			let px = part[0][0];
			let py = part[0][1];
			for (let i = 1, l = part.length; i < l; i++) {
				const qx = part[i][0];
				const qy = part[i][1];
				if (top ? qy >= threshold : qy <= threshold) {
					return qy === threshold ? qx : px + (threshold - py) * (qx - px) / (qy - py);
				}
				px = qx;
				py = qy;
			}
			return null;
		}
		function getCurveLineIntersections(v, px, py, vx, vy) {
			const isZero = Numerical.isZero;
			if (isZero(vx) && isZero(vy)) {
				const t = Curve.getTimeOf(v, new Point(px, py));
				return t === null ? [] : [t];
			}
			const angle = Math.atan2(-vy, vx);
			const sin = Math.sin(angle);
			const cos = Math.cos(angle);
			const rv = [];
			const roots = [];
			for (let i = 0; i < 8; i += 2) {
				const x = v[i] - px;
				const y = v[i + 1] - py;
				rv.push(x * cos - y * sin, x * sin + y * cos);
			}
			Curve.solveCubic(rv, 1, 0, roots, 0, 1);
			const epsilon = 1e-7;
			if (Math.abs(rv[1]) < epsilon) roots.push(0);
			if (Math.abs(rv[7]) < epsilon) roots.push(1);
			return roots;
		}
		function addCurveLineIntersections(v1, v2, c1, c2, locations, include, flip, tolerance) {
			const x1 = v2[0];
			const y1 = v2[1];
			const x2 = v2[6];
			const y2 = v2[7];
			const roots = getCurveLineIntersections(v1, x1, y1, x2 - x1, y2 - y1);
			for (let i = 0, l = roots.length; i < l; i++) {
				const t1 = roots[i];
				const p1 = Curve.getPoint(v1, t1);
				const t2 = Curve.getTimeOf(v2, p1, tolerance);
				if (t2 !== null) {
					addLocation(locations, include, flip ? c2 : c1, flip ? t2 : t1, flip ? c1 : c2, flip ? t1 : t2);
				}
			}
		}
		function addLineIntersection(v1, v2, c1, c2, locations, include, tolerance) {
			const pt = Line.intersect(v1[0], v1[1], v1[6], v1[7], v2[0], v2[1], v2[6], v2[7]);
			if (pt) {
				addLocation(locations, include, c1, Curve.getTimeOf(v1, pt, tolerance), c2, Curve.getTimeOf(v2, pt, tolerance));
			}
		}
		function getCurveIntersections(v1, v2, c1, c2, locations, include, tolerance) {
			let i;
			const min = Math.min;
			const max = Math.max;
			const abs = Math.abs;
			const minX1 = min(v1[0], v1[2], v1[4], v1[6]);
			const maxX1 = max(v1[0], v1[2], v1[4], v1[6]);
			const minY1 = min(v1[1], v1[3], v1[5], v1[7]);
			const maxY1 = max(v1[1], v1[3], v1[5], v1[7]);
			const minX2 = min(v2[0], v2[2], v2[4], v2[6]);
			const maxX2 = max(v2[0], v2[2], v2[4], v2[6]);
			const minY2 = min(v2[1], v2[3], v2[5], v2[7]);
			const maxY2 = max(v2[1], v2[3], v2[5], v2[7]);
			const epsilon = Numerical.getEpsilon(max(abs(minX1), abs(maxX1), abs(minY1), abs(maxY1), abs(minX2), abs(maxX2), abs(minY2), abs(maxY2)));
			const boundsEpsilon = max(epsilon, tolerance || 1e-7);
			if (maxX1 + boundsEpsilon > minX2 && minX1 - boundsEpsilon < maxX2 && maxY1 + boundsEpsilon > minY2 && minY1 - boundsEpsilon < maxY2) {
				const overlaps = getOverlaps(v1, v2, tolerance);
				if (overlaps) {
					for (i = 0; i < 2; i++) {
						const overlap = overlaps[i];
						addLocation(locations, include, c1, overlap[0], c2, overlap[1], true);
					}
				} else {
					const straight1 = Curve.isStraight(v1);
					const straight2 = Curve.isStraight(v2);
					const straight = straight1 && straight2;
					const before = locations.length;
					const lineTolerance = tolerance < 1e-7 ? tolerance : null;
					if (straight) {
						addLineIntersection(v1, v2, c1, c2, locations, include, lineTolerance);
					} else if (straight1 || straight2) {
						addCurveLineIntersections(straight1 ? v2 : v1, straight1 ? v1 : v2, straight1 ? c2 : c1, straight1 ? c1 : c2, locations, include, straight1, lineTolerance);
					} else {
						addCurveIntersections(v1, v2, c1, c2, locations, include, false, 0, 0, 0, 1, 0, 1, tolerance);
					}
					if (!straight || locations.length === before) {
						const endEpsilon = tolerance || epsilon;
						for (i = 0; i < 4; i++) {
							const isSecond = i >> 1;
							const t = i & 1;
							const v = isSecond ? v2 : v1;
							const x = v[t * 6];
							const y = v[t * 6 + 1];
							if (isSecond ? x >= minX1 - endEpsilon && x <= maxX1 + endEpsilon && y >= minY1 - endEpsilon && y <= maxY1 + endEpsilon : x >= minX2 - endEpsilon && x <= maxX2 + endEpsilon && y >= minY2 - endEpsilon && y <= maxY2 + endEpsilon) {
								const u = Curve.getTimeOf(isSecond ? v1 : v2, new Point(x, y), endEpsilon);
								if (u !== null) {
									addLocation(locations, include, c1, isSecond ? u : t, c2, isSecond ? t : u);
								}
							}
						}
					}
				}
			}
			return locations;
		}
		function getSelfIntersection(v1, c1, locations, include) {
			const info = Curve.classify(v1);
			if (info.type === "loop") {
				const roots = info.roots;
				addLocation(locations, include, c1, roots[0], c1, roots[1]);
			}
			return locations;
		}
		function getIntersections(curves1, curves2, include, matrix1, matrix2, _returnFirst, _tolerance, _collisions) {
			let i;
			const self = !curves2;
			if (self) curves2 = curves1;
			const length1 = curves1.length;
			const length2 = curves2.length;
			const values1 = new Array(length1);
			const values2 = self ? values1 : new Array(length2);
			const locations = [];
			for (i = 0; i < length1; i++) {
				values1[i] = curves1[i].getValues(matrix1);
			}
			if (!self) {
				for (i = 0; i < length2; i++) {
					values2[i] = curves2[i].getValues(matrix2);
				}
			}
			const boundsCollisions = _collisions || CollisionDetection.findCurveBoundsCollisions(values1, values2, _tolerance || 1e-7);
			for (let index1 = 0; index1 < length1; index1++) {
				const curve1 = curves1[index1];
				const v1 = values1[index1];
				if (self) {
					getSelfIntersection(v1, curve1, locations, include);
				}
				const collisions1 = boundsCollisions[index1];
				if (collisions1) {
					for (let j = 0; j < collisions1.length; j++) {
						if (_returnFirst && locations.length) return locations;
						const index2 = collisions1[j];
						if (!self || index2 > index1) {
							const curve2 = curves2[index2];
							const v2 = values2[index2];
							getCurveIntersections(v1, v2, curve1, curve2, locations, include, _tolerance);
						}
					}
				}
			}
			return locations;
		}
		function getOverlaps(v1, v2, tolerance) {
			function getSquaredLineLength(v) {
				const x = v[6] - v[0];
				const y = v[7] - v[1];
				return x * x + y * y;
			}
			const abs = Math.abs;
			const getDistance = Line.getDistance;
			const timeEpsilon = 1e-8;
			const geomEpsilon = tolerance || 1e-7;
			let straight1 = Curve.isStraight(v1);
			let straight2 = Curve.isStraight(v2);
			let straightBoth = straight1 && straight2;
			const flip = getSquaredLineLength(v1) < getSquaredLineLength(v2);
			const l1 = flip ? v2 : v1;
			const l2 = flip ? v1 : v2;
			const px = l1[0];
			const py = l1[1];
			const vx = l1[6] - px;
			const vy = l1[7] - py;
			if (getDistance(px, py, vx, vy, l2[0], l2[1], true) < geomEpsilon && getDistance(px, py, vx, vy, l2[6], l2[7], true) < geomEpsilon) {
				if (!straightBoth && getDistance(px, py, vx, vy, l1[2], l1[3], true) < geomEpsilon && getDistance(px, py, vx, vy, l1[4], l1[5], true) < geomEpsilon && getDistance(px, py, vx, vy, l2[2], l2[3], true) < geomEpsilon && getDistance(px, py, vx, vy, l2[4], l2[5], true) < geomEpsilon) {
					straight1 = straight2 = straightBoth = true;
				}
			} else if (straightBoth) {
				return null;
			}
			if (straight1 ^ straight2) {
				return null;
			}
			const v = [v1, v2];
			let pairs = [];
			for (let i = 0; i < 4 && pairs.length < 2; i++) {
				const i1 = i & 1;
				const i2 = i1 ^ 1;
				const t1 = i >> 1;
				const t2 = Curve.getTimeOf(v[i1], new Point(v[i2][t1 ? 6 : 0], v[i2][t1 ? 7 : 1]), geomEpsilon);
				if (t2 != null) {
					const pair = i1 ? [t1, t2] : [t2, t1];
					if (!pairs.length || abs(pair[0] - pairs[0][0]) > timeEpsilon && abs(pair[1] - pairs[0][1]) > timeEpsilon) {
						pairs.push(pair);
					}
				}
				if (i > 2 && !pairs.length) break;
			}
			if (pairs.length !== 2) {
				pairs = null;
			} else if (!straightBoth) {
				const o1 = Curve.getPart(v1, pairs[0][0], pairs[1][0]);
				const o2 = Curve.getPart(v2, pairs[0][1], pairs[1][1]);
				if (abs(o2[2] - o1[2]) > geomEpsilon || abs(o2[3] - o1[3]) > geomEpsilon || abs(o2[4] - o1[4]) > geomEpsilon || abs(o2[5] - o1[5]) > geomEpsilon) pairs = null;
			}
			return pairs;
		}
		return {
			getIntersections: function(curve) {
				const v1 = this.getValues();
				const v2 = curve && curve !== this && curve.getValues();
				return v2 ? getCurveIntersections(v1, v2, this, curve, []) : getSelfIntersection(v1, this, []);
			},
			statics: {
				getOverlaps,
				getIntersections
			}
		};
	})());
	const CurveLocation = Base.extend({
		_class: "CurveLocation",
		initialize: function CurveLocation(curve, time, point, _overlap, _distance) {
			if (time >= .99999999) {
				const next = curve.getNext();
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
			this._intersection = null;
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
			const curve = segment.getCurve();
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
			let segment = this._segment;
			if (!segment) {
				const curve = this.getCurve();
				const time = this.getTime();
				if (time === 0) {
					segment = curve._segment1;
				} else if (time === 1) {
					segment = curve._segment2;
				} else if (time != null) {
					segment = curve.getPartLength(0, time) < curve.getPartLength(time, 1) ? curve._segment1 : curve._segment2;
				}
				this._segment = segment;
			}
			return segment;
		},
		getCurve: function() {
			const path = this._path;
			const that = this;
			if (path && path._version !== this._version) {
				this._time = this._offset = this._curveOffset = this._curve = null;
			}
			function trySegment(segment) {
				const curve = segment && segment.getCurve();
				if (curve && (that._time = curve.getTimeOf(that._point)) != null) {
					that._setCurve(curve);
					return curve;
				}
			}
			return this._curve || trySegment(this._segment) || trySegment(this._segment1) || trySegment(this._segment2.getPrevious());
		},
		getPath: function() {
			const curve = this.getCurve();
			return curve && curve._path;
		},
		getIndex: function() {
			const curve = this.getCurve();
			return curve && curve.getIndex();
		},
		getTime: function() {
			const curve = this.getCurve();
			const time = this._time;
			return curve && time == null ? this._time = curve.getTimeOf(this._point) : time;
		},
		getParameter: "#getTime",
		getPoint: function() {
			return this._point;
		},
		getOffset: function() {
			let offset = this._offset;
			if (offset == null) {
				offset = 0;
				const path = this.getPath();
				const index = this.getIndex();
				if (path && index != null) {
					const curves = path.getCurves();
					for (let i = 0; i < index; i++) offset += curves[i].getLength();
				}
				this._offset = offset += this.getCurveOffset();
			}
			return offset;
		},
		getCurveOffset: function() {
			let offset = this._curveOffset;
			if (offset == null) {
				const curve = this.getCurve();
				const time = this.getTime();
				this._curveOffset = offset = time != null && curve && curve.getPartLength(0, time);
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
			const curve = this.getCurve();
			const res = curve && curve.divideAtTime(this.getTime());
			if (res) {
				this._setSegment(res._segment1);
			}
			return res;
		},
		split: function() {
			const curve = this.getCurve();
			const path = curve._path;
			const res = curve && curve.splitAtTime(this.getTime());
			if (res) {
				this._setSegment(path.getLastSegment());
			}
			return res;
		},
		equals: function(loc, _ignoreOther) {
			let res = this === loc;
			if (!res && loc instanceof CurveLocation) {
				const c1 = this.getCurve();
				const c2 = loc.getCurve();
				const p1 = c1._path;
				const p2 = c2._path;
				if (p1 === p2) {
					const abs = Math.abs;
					const epsilon = 1e-7;
					const i1 = !_ignoreOther && this._intersection;
					const i2 = !_ignoreOther && loc._intersection;
					const diff = this.getPoint().isClose(loc.getPoint(), epsilon) ? abs(this.getOffset() - loc.getOffset()) : Infinity;
					res = (diff < epsilon || p1 && abs(p1.getLength() - diff) < epsilon) && (!i1 && !i2 || i1 && i2 && i1.equals(i2, true));
				}
			}
			return res;
		},
		toString: function() {
			const parts = [];
			const point = this.getPoint();
			const f = Formatter.instance;
			if (point) parts.push("point: " + point);
			const index = this.getIndex();
			if (index != null) parts.push("index: " + index);
			const time = this.getTime();
			if (time != null) parts.push("time: " + f.number(time));
			if (this._distance != null) parts.push("distance: " + f.number(this._distance));
			return "{ " + parts.join(", ") + " }";
		},
		isTouching: function() {
			const inter = this._intersection;
			if (inter && this.getTangent().isCollinear(inter.getTangent())) {
				const curve1 = this.getCurve();
				const curve2 = inter.getCurve();
				return !(curve1.isStraight() && curve2.isStraight() && curve1.getLine().intersect(curve2.getLine()));
			}
			return false;
		},
		isCrossing: function() {
			const inter = this._intersection;
			if (!inter) return false;
			const t1 = this.getTime();
			const t2 = inter.getTime();
			const tMin = 1e-8;
			const tMax = 1 - tMin;
			const t1Inside = t1 >= tMin && t1 <= tMax;
			const t2Inside = t2 >= tMin && t2 <= tMax;
			if (t1Inside && t2Inside) return !this.isTouching();
			let c2 = this.getCurve();
			const c1 = c2 && t1 < tMin ? c2.getPrevious() : c2;
			let c4 = inter.getCurve();
			const c3 = c4 && t2 < tMin ? c4.getPrevious() : c4;
			if (t1 > tMax) c2 = c2.getNext();
			if (t2 > tMax) c4 = c4.getNext();
			if (!c1 || !c2 || !c3 || !c4) return false;
			const offsets = [];
			function addOffsets(curve, end) {
				const v = curve.getValues();
				const roots = Curve.classify(v).roots || Curve.getPeaks(v);
				const count = roots.length;
				const offset = Curve.getLength(v, end && count ? roots[count - 1] : 0, !end && count ? roots[0] : 1);
				offsets.push(count ? offset : offset / 32);
			}
			function isInRange(angle, min, max) {
				return min < max ? angle > min && angle < max : angle > min || angle < max;
			}
			if (!t1Inside) {
				addOffsets(c1, true);
				addOffsets(c2, false);
			}
			if (!t2Inside) {
				addOffsets(c3, true);
				addOffsets(c4, false);
			}
			const pt = this.getPoint();
			const offset = Math.min.apply(Math, offsets);
			const v2 = t1Inside ? c2.getTangentAtTime(t1) : c2.getPointAt(offset).subtract(pt);
			const v1 = t1Inside ? v2.negate() : c1.getPointAt(-offset).subtract(pt);
			const v4 = t2Inside ? c4.getTangentAtTime(t2) : c4.getPointAt(offset).subtract(pt);
			const v3 = t2Inside ? v4.negate() : c3.getPointAt(-offset).subtract(pt);
			const a1 = v1.getAngle();
			const a2 = v2.getAngle();
			const a3 = v3.getAngle();
			const a4 = v4.getAngle();
			return !!(t1Inside ? isInRange(a1, a3, a4) ^ isInRange(a2, a3, a4) && isInRange(a1, a4, a3) ^ isInRange(a2, a4, a3) : isInRange(a3, a1, a2) ^ isInRange(a4, a1, a2) && isInRange(a3, a2, a1) ^ isInRange(a4, a2, a1));
		},
		hasOverlap: function() {
			return !!this._overlap;
		}
	}, Base.each(Curve._evaluateMethods, function(name) {
		const get = name + "At";
		this[name] = function() {
			const curve = this.getCurve();
			const time = this.getTime();
			return time != null && curve && curve[get](time, true);
		};
	}, { preserve: true }), new (function() {
		function insert(locations, loc, merge) {
			let found;
			const length = locations.length;
			let l = 0;
			let r = length - 1;
			function search(index, dir) {
				for (let i = index + dir; i >= -1 && i <= length; i += dir) {
					const loc2 = locations[(i % length + length) % length];
					if (!loc.getPoint().isClose(loc2.getPoint(), 1e-7)) break;
					if (loc.equals(loc2)) return loc2;
				}
				return null;
			}
			while (l <= r) {
				const m = l + r >>> 1;
				const loc2 = locations[m];
				if (merge && (found = loc.equals(loc2) ? loc2 : search(m, -1) || search(m, 1))) {
					if (loc._overlap) {
						found._overlap = found._intersection._overlap = true;
					}
					return found;
				}
				const path1 = loc.getPath();
				const path2 = loc2.getPath();
				const diff = path1 !== path2 ? path1._id - path2._id : loc.getIndex() + loc.getTime() - (loc2.getIndex() + loc2.getTime());
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
			insert,
			expand: function(locations) {
				const expanded = locations.slice();
				for (let i = locations.length - 1; i >= 0; i--) {
					insert(expanded, locations[i]._intersection, false);
				}
				return expanded;
			}
		} };
	})());
	const PathItem = Item.extend({
		_class: "PathItem",
		_selectBounds: false,
		_canScaleStroke: true,
		beans: true,
		initialize: function PathItem() {},
		_scaleStroke: function(matrix) {
			const style = this._style;
			if (this._project._scope.settings.scaleStrokes && style.getStrokeScaling()) {
				style.setStrokeWidth(style.getStrokeWidth() * matrix._getMeanScale());
			}
		},
		statics: { create: function(arg) {
			let data;
			let segments;
			let compound;
			if (Base.isPlainObject(arg)) {
				segments = arg.segments;
				data = arg.pathData;
			} else if (Array.isArray(arg)) {
				segments = arg;
			} else if (typeof arg === "string") {
				data = arg;
			}
			if (segments) {
				const first = segments[0];
				compound = first && Array.isArray(first[0]);
			} else if (data) {
				compound = (data.match(/m/gi) || []).length > 1 || /z\s*\S+/i.test(data);
			}
			const ctor = compound ? CompoundPath : Path;
			return new ctor(arg);
		} },
		_asPathItem: function() {
			return this;
		},
		isClockwise: function() {
			return this.getArea() >= 0;
		},
		setClockwise: function(clockwise) {
			if (this.isClockwise() != !!clockwise) this.reverse();
		},
		setPathData: function(data) {
			let move;
			let j;
			let coord;
			const parts = data && data.match(/[mlhvcsqtaz][^mlhvcsqtaz]*/gi);
			let coords;
			let relative = false;
			let previous;
			let control;
			let current = new Point();
			let start = new Point();
			const number = "([+-]?(?:\\d*\\.\\d+|\\d+\\.?)(?:[eE][+-]?\\d+)?)";
			const numbers = new RegExp(number, "g");
			const flag = "([01])";
			const arcs = new RegExp([
				number,
				number,
				number,
				flag,
				flag,
				number,
				number
			].join("[\\s,]*"), "g");
			function getCoord(index, coord) {
				let val = +coords[index];
				if (relative) val += current[coord];
				return val;
			}
			function getPoint(index) {
				return new Point(getCoord(index, "x"), getCoord(index + 1, "y"));
			}
			this.clear();
			for (let i = 0, l = parts && parts.length; i < l; i++) {
				const part = parts[i];
				const command = part[0];
				const lower = command.toLowerCase();
				coords = part.match(numbers);
				const length = coords && coords.length;
				relative = command === lower;
				if (previous === "z" && !/[mz]/.test(lower)) this.moveTo(current);
				switch (lower) {
					case "m":
					case "l":
						move = lower === "m";
						for (j = 0; j < length; j += 2) {
							this[move ? "moveTo" : "lineTo"](current = getPoint(j));
							if (move) {
								start = current;
								move = false;
							}
						}
						control = current;
						break;
					case "h":
					case "v":
						coord = lower === "h" ? "x" : "y";
						current = current.clone();
						for (j = 0; j < length; j++) {
							current[coord] = getCoord(j, coord);
							this.lineTo(current);
						}
						control = current;
						break;
					case "c":
						for (j = 0; j < length; j += 6) {
							this.cubicCurveTo(getPoint(j), control = getPoint(j + 2), current = getPoint(j + 4));
						}
						break;
					case "s":
						for (j = 0; j < length; j += 4) {
							this.cubicCurveTo(/[cs]/.test(previous) ? current.multiply(2).subtract(control) : current, control = getPoint(j), current = getPoint(j + 2));
							previous = lower;
						}
						break;
					case "q":
						for (j = 0; j < length; j += 4) {
							this.quadraticCurveTo(control = getPoint(j), current = getPoint(j + 2));
						}
						break;
					case "t":
						for (j = 0; j < length; j += 2) {
							this.quadraticCurveTo(control = /[qt]/.test(previous) ? current.multiply(2).subtract(control) : current, current = getPoint(j));
							previous = lower;
						}
						break;
					case "a":
						while (coords = arcs.exec(part)) {
							this.arcTo(current = getPoint(6), new Size(+coords[1], +coords[2]), +coords[3], +coords[5], +coords[4]);
						}
						break;
					case "z":
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
			const winding = point.isInside(this.getBounds({
				internal: true,
				handle: true
			})) ? this._getWinding(point) : {};
			return winding.onPath || !!(this.getFillRule() === "evenodd" ? winding.windingL & 1 || winding.windingR & 1 : winding.winding);
		},
		getIntersections: function(path, include, _matrix, _returnFirst) {
			const self = this === path || !path;
			const matrix1 = this._matrix._orNullIfIdentity();
			const matrix2 = self ? matrix1 : (_matrix || path._matrix)._orNullIfIdentity();
			const bounds1 = !self && this.getBounds(matrix1);
			const bounds2 = !self && path.getBounds(matrix2);
			const abs = Math.abs;
			return self || bounds1.intersects(bounds2, Numerical.getEpsilon(Math.max(abs(bounds1.left), abs(bounds1.right), abs(bounds1.top), abs(bounds1.bottom), abs(bounds2.left), abs(bounds2.right), abs(bounds2.top), abs(bounds2.bottom)))) ? Curve.getIntersections(this.getCurves(), !self && path.getCurves(), include, matrix1, matrix2, _returnFirst) : [];
		},
		getCrossings: function(path) {
			return this.getIntersections(path, function(inter) {
				return inter.isCrossing();
			});
		},
		getNearestLocation: function() {
			const point = Point.read(arguments);
			const curves = this.getCurves();
			let minDist = Infinity;
			let minLoc = null;
			for (let i = 0, l = curves.length; i < l; i++) {
				const loc = curves[i].getNearestLocation(point);
				if (loc._distance < minDist) {
					minDist = loc._distance;
					minLoc = loc;
				}
			}
			return minLoc;
		},
		getNearestPoint: function() {
			const loc = this.getNearestLocation.apply(this, arguments);
			return loc ? loc.getPoint() : loc;
		},
		interpolate: function(from, to, factor) {
			let i;
			const isPath = !this._children;
			const name = isPath ? "_segments" : "_children";
			const itemsFrom = from[name];
			const itemsTo = to[name];
			const items = this[name];
			if (!itemsFrom || !itemsTo || itemsFrom.length !== itemsTo.length) {
				throw new Error("Invalid operands in interpolate() call: " + from + ", " + to);
			}
			const current = items.length;
			const length = itemsTo.length;
			if (current < length) {
				const ctor = isPath ? Segment : Path;
				for (i = current; i < length; i++) {
					this.add(new ctor());
				}
			} else if (current > length) {
				this[isPath ? "removeSegments" : "removeChildren"](length, current);
			}
			for (i = 0; i < length; i++) {
				items[i].interpolate(itemsFrom[i], itemsTo[i], factor);
			}
			if (isPath) {
				this.setClosed(from._closed);
				this._changed(9);
			}
		},
		compare: function(path) {
			let ok = false;
			if (path) {
				const paths1 = this._children || [this];
				const paths2 = path._children ? path._children.slice() : [path];
				const length1 = paths1.length;
				const length2 = paths2.length;
				const matched = [];
				let count = 0;
				ok = true;
				const boundsOverlaps = CollisionDetection.findItemBoundsCollisions(paths1, paths2, Numerical.GEOMETRIC_EPSILON);
				for (let i1 = length1 - 1; i1 >= 0 && ok; i1--) {
					const path1 = paths1[i1];
					ok = false;
					const pathBoundsOverlaps = boundsOverlaps[i1];
					if (pathBoundsOverlaps) {
						for (let i2 = pathBoundsOverlaps.length - 1; i2 >= 0 && !ok; i2--) {
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
		}
	});
	const Path = PathItem.extend({
		_class: "Path",
		_serializeFields: {
			segments: [],
			closed: false,
			strokeProfile: null
		},
		_prioritize: [
			"applyMatrix",
			"segments",
			"closed"
		],
		initialize: function Path(arg) {
			this._closed = false;
			this._segments = [];
			this._version = 0;
			const args = arguments;
			const segments = Array.isArray(arg) ? typeof arg[0] === "object" ? arg : args : arg && arg.size === undefined && (arg.x !== undefined || arg.point !== undefined) ? args : null;
			if (segments && segments.length > 0) {
				this.setSegments(segments);
			} else {
				this._curves = undefined;
				this._segmentSelection = 0;
				if (!segments && typeof arg === "string") {
					this.setPathData(arg);
					arg = null;
				}
			}
			this._initialize(!segments && arg);
		},
		_equals: function(item) {
			return this._closed === item._closed && Base.equals(this._segments, item._segments) && Base.equals(this._strokeProfile, item._strokeProfile);
		},
		copyContent: function(source) {
			const profile = source._strokeProfile;
			this.setSegments(source._segments);
			this._closed = source._closed;
			if (profile || this._strokeProfile) {
				this.setStrokeProfile(profile && profile.map(function(stop) {
					return {
						index: stop._index,
						width: stop._width,
						aspect: stop._aspect,
						angle: stop._angle,
						smooth: stop._smooth
					};
				}));
			}
		},
		_changed: function _changed(flags) {
			_changed.base.call(this, flags);
			if (flags & 8) {
				this._length = this._area = undefined;
				if (flags & 32) {
					this._version++;
				} else if (this._curves) {
					for (let i = 0, l = this._curves.length; i < l; i++) this._curves[i]._changed();
				}
			}
			if (flags & 72) this._strokeOutline = undefined;
		},
		_hasStrokeProfile: function() {
			return !!this._strokeProfile && this.hasStroke() && !(this._parent instanceof CompoundPath);
		},
		_hasEffects: function _hasEffects() {
			return _hasEffects.base.call(this) || this._hasStrokeProfile();
		},
		_applyEffects: function _applyEffects(art) {
			let output = _applyEffects.base.call(this, art);
			if (this._hasStrokeProfile()) {
				if (output) {
					const effect = Effect.get("outline");
					output = effect && effect.onApply({
						art: output,
						item: this
					}) || output;
				} else {
					const outline = this._getStrokeOutline().clone({ insert: false });
					outline.set({
						fillColor: this.getStrokeColor(),
						strokeColor: null
					});
					if (art.hasFill()) {
						art.setStrokeColor(null);
						output = new Group({
							children: this.getPaintOrder() === "stroke" ? [outline, art] : [art, outline],
							insert: false
						});
					} else {
						output = outline;
					}
				}
			}
			return output;
		},
		getStyle: function() {
			const parent = this._parent;
			return (parent instanceof CompoundPath ? parent : this)._style;
		},
		getSegments: function() {
			return this._segments;
		},
		setSegments: function(segments) {
			const fullySelected = this.isFullySelected();
			let length = segments && segments.length;
			const named = this._namedSegments;
			const profile = this._strokeProfile;
			let pathLength = profile && this.getLength();
			const fractions = profile && profile.map(function(stop) {
				return pathLength ? stop.getOffset() / pathLength : 0;
			});
			this._strokeProfile = null;
			if (named) {
				for (const name in named) delete this._segments[name];
				this._namedSegments = null;
			}
			this._segments.length = 0;
			this._segmentSelection = 0;
			this._curves = undefined;
			if (length) {
				const last = segments[length - 1];
				if (typeof last === "boolean") {
					this.setClosed(last);
					length--;
				}
				this._add(Segment.readList(segments, 0, {}, length));
			}
			if (fullySelected) this.setFullySelected(true);
			if (profile) {
				this._strokeProfile = profile;
				pathLength = this.getLength();
				for (let i = 0, l = profile.length; i < l; i++) profile[i]._index = this._getIndexAt(fractions[i] * pathLength);
				this._sortStrokeProfile();
			}
		},
		getFirstSegment: function() {
			return this._segments[0];
		},
		getLastSegment: function() {
			return this._segments[this._segments.length - 1];
		},
		getCurves: function() {
			let curves = this._curves;
			const segments = this._segments;
			if (!curves) {
				const length = this._countCurves();
				curves = this._curves = new Array(length);
				for (let i = 0; i < length; i++) curves[i] = new Curve(this, segments[i], segments[i + 1] || segments[0]);
			}
			return curves;
		},
		getFirstCurve: function() {
			return this.getCurves()[0];
		},
		getLastCurve: function() {
			const curves = this.getCurves();
			return curves[curves.length - 1];
		},
		isClosed: function() {
			return this._closed;
		},
		setClosed: function(closed) {
			if (this._closed != (closed = !!closed)) {
				if (!closed && this._strokeProfile) {
					const last = this._segments.length - 1;
					this._filterStrokeProfile(function(stop) {
						return stop._index <= last;
					});
				}
				this._closed = closed;
				if (this._curves) {
					const length = this._curves.length = this._countCurves();
					if (closed) this._curves[length - 1] = new Curve(this, this._segments[length - 1], this._segments[0]);
				}
				this._changed(41);
			}
		}
	}, {
		beans: true,
		getPathData: function(_matrix, _precision) {
			const segments = this._segments;
			const length = segments.length;
			const f = new Formatter(_precision);
			const coords = new Array(6);
			let first = true;
			let curX;
			let curY;
			let prevX;
			let prevY;
			let inX;
			let inY;
			let outX;
			let outY;
			const parts = [];
			function addSegment(segment, skipLine) {
				segment._transformCoordinates(_matrix, coords);
				curX = coords[0];
				curY = coords[1];
				if (first) {
					parts.push("M" + f.pair(curX, curY));
					first = false;
				} else {
					inX = coords[2];
					inY = coords[3];
					if (inX === curX && inY === curY && outX === prevX && outY === prevY) {
						if (!skipLine) {
							const dx = curX - prevX;
							const dy = curY - prevY;
							parts.push(dx === 0 ? "v" + f.number(dy) : dy === 0 ? "h" + f.number(dx) : "l" + f.pair(dx, dy));
						}
					} else {
						parts.push("c" + f.pair(outX - prevX, outY - prevY) + " " + f.pair(inX - prevX, inY - prevY) + " " + f.pair(curX - prevX, curY - prevY));
					}
				}
				prevX = curX;
				prevY = curY;
				outX = coords[4];
				outY = coords[5];
			}
			if (!length) return "";
			for (let i = 0; i < length; i++) addSegment(segments[i]);
			if (this._closed && length > 0) {
				addSegment(segments[0], true);
				parts.push("z");
			}
			return parts.join("");
		},
		isEmpty: function() {
			return !this._segments.length;
		},
		_transformContent: function(matrix) {
			const segments = this._segments;
			const coords = new Array(6);
			for (let i = 0, l = segments.length; i < l; i++) segments[i]._transformCoordinates(matrix, coords, true);
			this._scaleStroke(matrix);
			return true;
		},
		_add: function(segs, index) {
			let i;
			let l;
			const segments = this._segments;
			const curves = this._curves;
			const amount = segs.length;
			const append = index == null;
			index = append ? segments.length : index;
			for (i = 0; i < amount; i++) {
				let segment = segs[i];
				if (segment._path) segment = segs[i] = segment.clone();
				segment._path = this;
				segment._index = index + i;
				if (segment._name) segment.setName(segment._name);
				if (segment._selection) this._updateSelection(segment, 0, segment._selection);
			}
			if (append) {
				Base.push(segments, segs);
			} else {
				segments.splice.apply(segments, [index, 0].concat(segs));
				for (i = index + amount, l = segments.length; i < l; i++) segments[i]._index = i;
			}
			if (curves) {
				const total = this._countCurves();
				const start = index > 0 && index + amount - 1 === total ? index - 1 : index;
				let insert = start;
				const end = Math.min(start + amount, total);
				if (segs._curves) {
					curves.splice.apply(curves, [start, 0].concat(segs._curves));
					insert += segs._curves.length;
				}
				for (i = insert; i < end; i++) curves.splice(i, 0, new Curve(this, null, null));
				this._adjustCurves(start, end);
			}
			if (this._strokeProfile) this._insertStrokeProfile(index, amount);
			this._changed(41);
			return segs;
		},
		_adjustCurves: function(start, end) {
			const segments = this._segments;
			const curves = this._curves;
			let curve;
			for (let i = start; i < end; i++) {
				curve = curves[i];
				curve._path = this;
				curve._segment1 = segments[i];
				curve._segment2 = segments[i + 1] || segments[0];
				curve._changed();
			}
			if (curve = curves[this._closed && !start ? segments.length - 1 : start - 1]) {
				curve._segment2 = segments[start] || segments[0];
				curve._changed();
			}
			if (curve = curves[end]) {
				curve._segment1 = segments[end];
				curve._changed();
			}
		},
		_countCurves: function() {
			const length = this._segments.length;
			return !this._closed && length > 0 ? length - 1 : length;
		},
		add: function(segment1) {
			const args = arguments;
			return args.length > 1 && typeof segment1 !== "number" ? this._add(Segment.readList(args)) : this._add([Segment.read(args)])[0];
		},
		insert: function(index, segment1) {
			const args = arguments;
			return args.length > 2 && typeof segment1 !== "number" ? this._add(Segment.readList(args, 1), index) : this._add([Segment.read(args, 1)], index)[0];
		},
		addSegment: function() {
			return this._add([Segment.read(arguments)])[0];
		},
		insertSegment: function(index) {
			return this._add([Segment.read(arguments, 1)], index)[0];
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
			let curves;
			let i;
			let l;
			start = start || 0;
			end = Base.pick(end, this._segments.length);
			if (start > end && this._closed) return this.removeSegments(start).concat(this.removeSegments(0, end));
			const segments = this._segments;
			const count = segments.length;
			if (this._strokeProfile && start < Math.min(end, count)) this._removeStrokeProfile(start, Math.min(end, count));
			curves = this._curves;
			const removed = segments.splice(start, end - start);
			const amount = removed.length;
			if (!amount) return removed;
			for (i = 0; i < amount; i++) {
				const segment = removed[i];
				if (segment._selection) this._updateSelection(segment, segment._selection, 0);
				if (segment._name) Base.removeNamed(segments, this._namedSegments, segment._name, segment);
				segment._index = segment._path = null;
			}
			for (i = start, l = segments.length; i < l; i++) segments[i]._index = i;
			if (curves) {
				const index = start > 0 && end === count + (this._closed ? 1 : 0) ? start - 1 : start;
				curves = curves.splice(index, amount);
				for (i = curves.length - 1; i >= 0; i--) curves[i]._path = null;
				if (_includeCurves) removed._curves = curves.slice(1);
				this._adjustCurves(index, index);
			}
			this._changed(41);
			return removed;
		},
		clear: "#removeSegments",
		hasHandles: function() {
			const segments = this._segments;
			for (let i = 0, l = segments.length; i < l; i++) {
				if (segments[i].hasHandles()) return true;
			}
			return false;
		},
		clearHandles: function() {
			const segments = this._segments;
			for (let i = 0, l = segments.length; i < l; i++) segments[i].clearHandles();
		},
		getLength: function() {
			if (this._length == null) {
				const curves = this.getCurves();
				let length = 0;
				for (let i = 0, l = curves.length; i < l; i++) length += curves[i].getLength();
				this._length = length;
			}
			return this._length;
		},
		getArea: function() {
			let area = this._area;
			if (area == null) {
				const segments = this._segments;
				const closed = this._closed;
				area = 0;
				for (let i = 0, l = segments.length; i < l; i++) {
					const last = i + 1 === l;
					area += Curve.getArea(Curve.getValues(segments[i], segments[last ? 0 : i + 1], null, last && !closed));
				}
				this._area = area;
			}
			return area;
		},
		isFullySelected: function() {
			const length = this._segments.length;
			return this.isSelected() && length > 0 && this._segmentSelection === length * 7;
		},
		setFullySelected: function(selected) {
			if (selected) this._selectSegments(true);
			this.setSelected(selected);
		},
		setSelection: function setSelection(selection) {
			if (!(selection & 1)) this._selectSegments(false);
			setSelection.base.call(this, selection);
		},
		_selectSegments: function(selected) {
			const segments = this._segments;
			const length = segments.length;
			const selection = selected ? 7 : 0;
			this._segmentSelection = selection * length;
			for (let i = 0; i < length; i++) segments[i]._selection = selection;
		},
		_updateSelection: function(segment, oldSelection, newSelection) {
			segment._selection = newSelection;
			const selection = this._segmentSelection += newSelection - oldSelection;
			if (selection > 0) this.setSelected(true);
		},
		divideAt: function(location) {
			const loc = this.getLocationAt(location);
			let curve;
			return loc && (curve = loc.getCurve().divideAt(loc.getCurveOffset())) ? curve._segment1 : null;
		},
		splitAt: function(location) {
			const loc = this.getLocationAt(location);
			let index = loc && loc.index;
			let time = loc && loc.time;
			const tMin = 1e-8;
			const tMax = 1 - tMin;
			if (time > tMax) {
				index++;
				time = 0;
			}
			const curves = this.getCurves();
			if (loc && index < curves.length) {
				const cut = loc.getOffset();
				const profile = this._strokeProfile && this._takeStrokeProfile();
				if (time >= tMin) {
					curves[index++].divideAtTime(time);
				}
				const segs = this.removeSegments(index, this._segments.length, true);
				let path;
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
				if (profile) {
					if (path === this) {
						this._setStrokeProfilePart(profile, cut, cut + profile.length);
					} else {
						this._setStrokeProfilePart(profile, 0, cut);
						path._setStrokeProfilePart(profile, cut, profile.length);
					}
				}
				return path;
			}
			return null;
		},
		split: function(index, time) {
			let curve;
			const location = time === undefined ? index : (curve = this.getCurves()[index]) && curve.getLocationAtTime(time);
			return location != null ? this.splitAt(location) : null;
		},
		join: function(path, tolerance) {
			const epsilon = tolerance || 0;
			let parts = null;
			if (path && path !== this) {
				const segments = path._segments;
				const last1 = this.getLastSegment();
				let last2 = path.getLastSegment();
				if (!last2) return this;
				if (this._strokeProfile || path._strokeProfile) parts = [this._takeStrokeProfile()];
				if (last1 && last1._point.isClose(last2._point, epsilon)) path.reverse();
				const first2 = path.getFirstSegment();
				if (last1 && last1._point.isClose(first2._point, epsilon)) {
					if (parts) parts.push(path._takeStrokeProfile());
					last1.setHandleOut(first2._handleOut);
					this._add(segments.slice(1));
				} else {
					const first1 = this.getFirstSegment();
					if (first1 && first1._point.isClose(first2._point, epsilon)) path.reverse();
					last2 = path.getLastSegment();
					if (parts) parts.push(path._takeStrokeProfile());
					if (first1 && first1._point.isClose(last2._point, epsilon)) {
						if (parts) parts.reverse();
						first1.setHandleIn(last2._handleIn);
						this._add(segments.slice(0, segments.length - 1), 0);
					} else {
						this._add(segments.slice());
					}
				}
				if (path._closed) this._add([segments[0]]);
				path.remove();
			}
			const first = this.getFirstSegment();
			const last = this.getLastSegment();
			if (first !== last && first._point.isClose(last._point, epsilon)) {
				if (!parts && this._strokeProfile) parts = [this._takeStrokeProfile()];
				first.setHandleIn(last._handleIn);
				last.remove();
				this.setClosed(true);
			}
			if (parts) this._setStrokeProfileParts(parts);
			return this;
		},
		reduce: function(options) {
			const curves = this.getCurves();
			const simplify = options && options.simplify;
			const tolerance = simplify ? 1e-7 : 0;
			for (let i = curves.length - 1; i >= 0; i--) {
				const curve = curves[i];
				if (!curve.hasHandles() && (!curve.hasLength(tolerance) || simplify && curve.isCollinear(curve.getNext()))) curve.remove();
			}
			return this;
		},
		reverse: function() {
			this._segments.reverse();
			for (let i = 0, l = this._segments.length; i < l; i++) {
				const segment = this._segments[i];
				const handleIn = segment._handleIn;
				segment._handleIn = segment._handleOut;
				segment._handleOut = handleIn;
				segment._index = i;
			}
			this._curves = null;
			if (this._strokeProfile) this._reverseStrokeProfile();
			this._changed(9);
		},
		flatten: function(flatness) {
			const flattener = new PathFlattener(this, flatness || .25, 256, true);
			const parts = flattener.parts;
			const length = parts.length;
			const segments = [];
			for (let i = 0; i < length; i++) {
				segments.push(new Segment(parts[i].curve.slice(0, 2)));
			}
			if (!this._closed && length > 0) {
				segments.push(new Segment(parts[length - 1].curve.slice(6)));
			}
			this.setSegments(segments);
		},
		simplify: function(options) {
			const opts = typeof options === "number" ? { tolerance: options } : options || {};
			const segments = this._segments;
			const length = segments.length;
			let fitted = null;
			if (length > 0) {
				const range = this._getRange(opts.from, opts.to);
				const loop = range.loop;
				const from = range.from;
				const to = range.to;
				const first = segments[from < 0 ? from + length : from];
				const last = segments[to];
				const getTangent = function(handle, neighbor) {
					return !loop && neighbor && !handle.isZero() && handle.negate();
				};
				fitted = new PathFitter(from < 0 ? segments.slice(from).concat(segments.slice(0, to + 1)) : segments.slice(from, to + 1), loop).fit(opts.tolerance || 2.5, getTangent(first._handleIn, first.getPrevious()), getTangent(last._handleOut, last.getNext()));
				if (loop || !first.getPrevious() && !last.getNext()) {
					this.setSegments(fitted);
				} else {
					const fullySelected = this.isFullySelected();
					fitted[0].setHandleIn(first._handleIn);
					fitted[fitted.length - 1].setHandleOut(last._handleOut);
					if (from < 0) {
						this.removeSegments(from + length);
						this.removeSegments(0, to + 1);
						this.addSegments(fitted);
					} else {
						this.removeSegments(from, to + 1);
						this.insertSegments(from, fitted);
					}
					if (fullySelected) this.setFullySelected(true);
				}
			}
			return !!fitted;
		},
		smooth: function(options) {
			let i;
			let j;
			let max;
			const opts = options || {};
			const type = opts.type || "asymmetric";
			const segments = this._segments;
			const length = segments.length;
			const closed = this._closed;
			const range = this._getRange(opts.from, opts.to);
			const loop = range.loop;
			const from = range.from;
			const to = range.to;
			if (/^(?:asymmetric|continuous)$/.test(type)) {
				const asymmetric = type === "asymmetric";
				const min = Math.min;
				const amount = to - from + 1;
				let n = amount - 1;
				const padding = loop ? min(amount, 4) : 1;
				let paddingLeft = padding;
				let paddingRight = padding;
				const knots = [];
				if (!closed) {
					paddingLeft = min(1, from);
					paddingRight = min(1, length - to - 1);
				}
				n += paddingLeft + paddingRight;
				if (n <= 1) return;
				for (i = 0, j = from - paddingLeft; i <= n; i++, j++) {
					knots[i] = segments[(j < 0 ? j + length : j) % length]._point;
				}
				let x = knots[0]._x + 2 * knots[1]._x;
				let y = knots[0]._y + 2 * knots[1]._y;
				let f = 2;
				const n_1 = n - 1;
				const rx = [x];
				const ry = [y];
				const rf = [f];
				const px = [];
				const py = [];
				for (i = 1; i < n; i++) {
					const internal = i < n_1;
					const a = internal ? 1 : asymmetric ? 1 : 2;
					const b = internal ? 4 : asymmetric ? 2 : 7;
					const u = internal ? 4 : asymmetric ? 3 : 8;
					const v = internal ? 2 : asymmetric ? 0 : 1;
					const m = a / f;
					f = rf[i] = b - m;
					x = rx[i] = u * knots[i]._x + v * knots[i + 1]._x - m * x;
					y = ry[i] = u * knots[i]._y + v * knots[i + 1]._y - m * y;
				}
				px[n_1] = rx[n_1] / rf[n_1];
				py[n_1] = ry[n_1] / rf[n_1];
				for (i = n - 2; i >= 0; i--) {
					px[i] = (rx[i] - px[i + 1]) / rf[i];
					py[i] = (ry[i] - py[i + 1]) / rf[i];
				}
				px[n] = (3 * knots[n]._x - px[n_1]) / 2;
				py[n] = (3 * knots[n]._y - py[n_1]) / 2;
				for (i = paddingLeft, max = n - paddingRight, j = from; i <= max; i++, j++) {
					const segment = segments[j < 0 ? j + length : j];
					const pt = segment._point;
					const hx = px[i] - pt._x;
					const hy = py[i] - pt._y;
					if (loop || i < max) segment.setHandleOut(hx, hy);
					if (loop || i > paddingLeft) segment.setHandleIn(-hx, -hy);
				}
			} else {
				for (i = from; i <= to; i++) {
					segments[i < 0 ? i + length : i].smooth(opts, !loop && i === from, !loop && i === to);
				}
			}
		},
		_getRange: function(from, to) {
			const that = this;
			const length = this._segments.length;
			const closed = this._closed;
			function getIndex(value, _default) {
				let index = value && value.index;
				if (index != null) {
					const path = value.path;
					if (path && path !== that) throw new Error(value._class + " " + index + " of " + path + " is not part of " + that);
					if (_default && value instanceof Curve) index++;
				} else {
					index = typeof value === "number" ? value : _default;
				}
				return Math.min(index >= 0 ? index : closed ? (index % length + length) % length : index + length, length - 1);
			}
			const loop = closed && from === undefined && to === undefined;
			from = getIndex(from, 0);
			to = getIndex(to, length - 1);
			if (from > to) {
				if (closed) {
					from -= length;
				} else {
					const tmp = from;
					from = to;
					to = tmp;
				}
			}
			return {
				from,
				to,
				loop
			};
		},
		toShape: function(insert) {
			if (!this._closed) return null;
			const segments = this._segments;
			let type;
			let size;
			let radius;
			let topCenter;
			function isCollinear(i, j) {
				const seg1 = segments[i];
				const seg2 = seg1.getNext();
				const seg3 = segments[j];
				const seg4 = seg3.getNext();
				return seg1._handleOut.isZero() && seg2._handleIn.isZero() && seg3._handleOut.isZero() && seg4._handleIn.isZero() && seg2._point.subtract(seg1._point).isCollinear(seg4._point.subtract(seg3._point));
			}
			function isOrthogonal(i) {
				const seg2 = segments[i];
				const seg1 = seg2.getPrevious();
				const seg3 = seg2.getNext();
				return seg1._handleOut.isZero() && seg2._handleIn.isZero() && seg2._handleOut.isZero() && seg3._handleIn.isZero() && seg2._point.subtract(seg1._point).isOrthogonal(seg3._point.subtract(seg2._point));
			}
			function isArc(i) {
				const seg1 = segments[i];
				const seg2 = seg1.getNext();
				const handle1 = seg1._handleOut;
				const handle2 = seg2._handleIn;
				const kappa = .5522847498307936;
				if (handle1.isOrthogonal(handle2)) {
					const pt1 = seg1._point;
					const pt2 = seg2._point;
					const corner = new Line(pt1, handle1, true).intersect(new Line(pt2, handle2, true), true);
					return corner && Numerical.isZero(handle1.getLength() / corner.subtract(pt1).getLength() - kappa) && Numerical.isZero(handle2.getLength() / corner.subtract(pt2).getLength() - kappa);
				}
				return false;
			}
			function getDistance(i, j) {
				return segments[i]._point.getDistance(segments[j]._point);
			}
			if (!this.hasHandles() && segments.length === 4 && isCollinear(0, 2) && isCollinear(1, 3) && isOrthogonal(1)) {
				type = Shape.Rectangle;
				size = new Size(getDistance(0, 3), getDistance(0, 1));
				topCenter = segments[1]._point.add(segments[2]._point).divide(2);
			} else if (segments.length === 8 && isArc(0) && isArc(2) && isArc(4) && isArc(6) && isCollinear(1, 5) && isCollinear(3, 7)) {
				type = Shape.Rectangle;
				size = new Size(getDistance(1, 6), getDistance(0, 3));
				radius = size.subtract(new Size(getDistance(0, 7), getDistance(1, 2))).divide(2);
				topCenter = segments[3]._point.add(segments[4]._point).divide(2);
			} else if (segments.length === 4 && isArc(0) && isArc(1) && isArc(2) && isArc(3)) {
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
				const center = this.getPosition(true);
				const shape = new type({
					center,
					size,
					radius,
					insert: false
				});
				shape.copyAttributes(this, true);
				shape._matrix.prepend(this._matrix);
				shape.rotate(topCenter.subtract(center).getAngle() + 90);
				if (Base.pick(insert, paper.settings.insertItems)) shape.insertAbove(this);
				return shape;
			}
			return null;
		},
		toPath: "#clone",
		compare: function compare(path) {
			let v2;
			let overlaps;
			if (!path || path instanceof CompoundPath) return compare.base.call(this, path);
			const curves1 = this.getCurves();
			const curves2 = path.getCurves();
			const length1 = curves1.length;
			const length2 = curves2.length;
			if (!length1 || !length2) {
				return length1 == length2;
			}
			let v1 = curves1[0].getValues();
			const values2 = [];
			let pos1 = 0;
			let pos2;
			let end1 = 0;
			let end2;
			for (let i = 0; i < length2; i++) {
				v2 = curves2[i].getValues();
				values2.push(v2);
				overlaps = Curve.getOverlaps(v1, v2);
				if (overlaps) {
					pos2 = !i && overlaps[0][0] > 0 ? length2 - 1 : i;
					end2 = overlaps[0][1];
					break;
				}
			}
			const abs = Math.abs;
			const epsilon = 1e-8;
			v2 = values2[pos2];
			let start2;
			while (v1 && v2) {
				overlaps = Curve.getOverlaps(v1, v2);
				if (overlaps) {
					const t1 = overlaps[0][0];
					if (abs(t1 - end1) < epsilon) {
						end1 = overlaps[1][0];
						if (end1 === 1) {
							v1 = ++pos1 < length1 ? curves1[pos1].getValues() : null;
							end1 = 0;
						}
						const t2 = overlaps[0][1];
						if (abs(t2 - end2) < epsilon) {
							if (!start2) start2 = [pos2, t2];
							end2 = overlaps[1][1];
							if (end2 === 1) {
								if (++pos2 >= length2) pos2 = 0;
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
			let i;
			let l;
			const that = this;
			const style = this.getStyle();
			const segments = this._segments;
			const numSegments = segments.length;
			const closed = this._closed;
			const strokeSpace = strokeMatrix && strokeMatrix.inverted();
			const strokePoint = point.transform(strokeSpace);
			const tolerancePadding = strokeSpace ? new Size(Matrix._getCircleExtents(Math.max(options.tolerance, 1e-12), this.getView()._matrix._shiftless())) : options._tolerancePadding;
			let strokePadding = tolerancePadding;
			let join;
			let cap;
			let miterLimit;
			let area;
			let loc;
			let res;
			const hits = options.all && [];
			const hitStroke = options.stroke && style.hasStroke();
			const hitFill = options.fill && !!style.getFillColor();
			const hitCurves = options.curves;
			const strokeRadius = hitStroke ? style.getStrokeWidth() / 2 : hitFill && options.tolerance > 0 || hitCurves ? 0 : null;
			if (strokeRadius !== null) {
				if (strokeRadius > 0) {
					join = style.getStrokeJoin();
					cap = style.getStrokeCap();
					miterLimit = style.getMiterLimit();
					strokePadding = strokePadding.add(strokeRadius);
				} else {
					join = cap = "round";
				}
			}
			function isCloseEnough(pt, padding) {
				return strokePoint.subtract(pt).divide(padding).length <= 1;
			}
			function checkSegmentPoint(seg, pt, name) {
				if (!options.selected || pt.isSelected()) {
					const anchor = seg._point;
					if (pt !== anchor) pt = pt.add(anchor);
					if (isCloseEnough(pt.transform(strokeSpace), strokePadding)) {
						const hit = new HitResult(name, that, {
							segment: seg,
							point: pt
						});
						if (!hits) return hit;
						hits.push(hit);
					}
				}
			}
			function checkSegmentPoints(seg, ends) {
				return (ends || options.segments) && checkSegmentPoint(seg, seg._point, "segment") || !ends && options.handles && (checkSegmentPoint(seg, seg._handleIn, "handle-in") || checkSegmentPoint(seg, seg._handleOut, "handle-out"));
			}
			function addToArea(point) {
				area.add(point);
			}
			function getJoinTangent(curve, forward) {
				for (let i = 0; curve && i < numSegments; i++) {
					if (curve.hasLength()) return curve.getTangentAtTime(forward ? 0 : 1);
					curve = forward ? curve.getNext() : curve.getPrevious();
				}
			}
			function isFlatJoin(segment) {
				const curve = segment.getCurve();
				const tangent1 = getJoinTangent(curve.getPrevious(), false);
				const tangent2 = getJoinTangent(curve, true);
				return tangent1 && tangent2 && tangent1.isCollinear(tangent2) && tangent1.dot(tangent2) > 0;
			}
			function checkSegmentStroke(segment) {
				const isJoin = closed || segment._index > 0 && segment._index < numSegments - 1;
				if (isJoin && (segment.isSmooth() || isFlatJoin(segment)) || (isJoin ? join : cap) === "round") {
					return isCloseEnough(segment._point.transform(strokeSpace), strokePadding);
				} else {
					area = new Path({
						internal: true,
						closed: true
					});
					if (isJoin) {
						Path._addBevelJoin(segment, join, strokeRadius, miterLimit, strokeSpace, null, addToArea, true);
					} else {
						Path._addSquareCap(segment, cap, strokeRadius, strokeSpace, null, addToArea, true);
					}
					if (!area.isEmpty()) {
						let loc;
						return area.contains(strokePoint) || (loc = area.getNearestLocation(strokePoint)) && isCloseEnough(loc.getPoint(), tolerancePadding);
					}
				}
			}
			if (options.ends && !options.segments && !closed) {
				if (res = checkSegmentPoints(segments[0], true) || checkSegmentPoints(segments[numSegments - 1], true)) return res;
			} else if (options.segments || options.handles) {
				for (i = 0; i < numSegments; i++) if (res = checkSegmentPoints(segments[i])) return res;
			}
			if (strokeRadius !== null) {
				const curves = this.getCurves();
				let minDistance = Infinity;
				let nearest;
				for (i = 0, l = curves.length; i < l; i++) {
					const values = curves[i].getValues(strokeSpace);
					const t = Curve.getNearestTime(values, strokePoint);
					const pt = Curve.getPoint(values, t);
					const distance = pt.getDistance(strokePoint);
					if (distance < minDistance) {
						minDistance = distance;
						loc = new CurveLocation(curves[i], t);
						nearest = pt;
					}
				}
				const outline = hitStroke && this._hasStrokeProfile() && this._getStrokeOutline();
				if (loc && outline) {
					if (!outline.contains(strokePoint) && !isCloseEnough(outline.getNearestPoint(strokePoint), tolerancePadding)) loc = null;
				} else if (loc) {
					const time = loc.getTime();
					if (time === 0 || time === 1 && numSegments > 1) {
						if (!checkSegmentStroke(loc.getSegment())) loc = null;
					} else if (!isCloseEnough(nearest, strokePadding)) {
						loc = null;
					}
				}
				if (!loc && !outline && join === "miter" && numSegments > 1) {
					for (i = 0; i < numSegments; i++) {
						const segment = segments[i];
						if (strokePoint.getDistance(segment._point.transform(strokeSpace)) <= miterLimit * strokeRadius && checkSegmentStroke(segment)) {
							loc = segment.getLocation();
							break;
						}
					}
				}
			}
			res = !loc && hitFill && this._contains(point) || loc && !hitStroke && !hitCurves ? new HitResult("fill", this) : loc ? new HitResult(hitStroke ? "stroke" : "curve", this, {
				location: loc,
				point: loc.getPoint()
			}) : null;
			if (hits) {
				hits.sort(function(hit1, hit2) {
					return hit1.point.getDistance(point) - hit2.point.getDistance(point);
				});
				if (res) hits.push(res);
				return hits;
			}
			return res;
		}
	}, Base.each(Curve._evaluateMethods, function(name) {
		this[name + "At"] = function(offset) {
			const loc = this.getLocationAt(offset);
			return loc && loc[name]();
		};
	}, {
		beans: false,
		getLocationOf: function() {
			const point = Point.read(arguments);
			const curves = this.getCurves();
			for (let i = 0, l = curves.length; i < l; i++) {
				const loc = curves[i].getLocationOf(point);
				if (loc) return loc;
			}
			return null;
		},
		getOffsetOf: function() {
			const loc = this.getLocationOf.apply(this, arguments);
			return loc ? loc.getOffset() : null;
		},
		getLocationAt: function(offset) {
			if (typeof offset === "number") {
				const curves = this.getCurves();
				let length = 0;
				for (let i = 0, l = curves.length; i < l; i++) {
					const start = length;
					const curve = curves[i];
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
			const tangent = Point.read(arguments);
			if (tangent.isZero()) {
				return [];
			}
			const offsets = [];
			let curveStart = 0;
			const curves = this.getCurves();
			for (let i = 0, l = curves.length; i < l; i++) {
				const curve = curves[i];
				const curveTimes = curve.getTimesWithTangent(tangent);
				for (let j = 0, m = curveTimes.length; j < m; j++) {
					const offset = curveStart + curve.getOffsetAtTime(curveTimes[j]);
					if (offsets.indexOf(offset) < 0) {
						offsets.push(offset);
					}
				}
				curveStart += curve.length;
			}
			return offsets;
		}
	}), new (function() {
		function drawHandles(ctx, segments, matrix, handleSize, segmentSize) {
			const handleHalf = handleSize / 2;
			const half = segmentSize / 2;
			const miniSize = segmentSize - 2;
			const miniHalf = half - 1;
			const coords = new Array(6);
			let pX;
			let pY;
			function drawHandle(index) {
				const hX = coords[index];
				const hY = coords[index + 1];
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
			for (let i = 0, l = segments.length; i < l; i++) {
				const segment = segments[i];
				const selection = segment._selection;
				segment._transformCoordinates(matrix, coords);
				pX = coords[0];
				pY = coords[1];
				if (selection & 2) drawHandle(2);
				if (selection & 4) drawHandle(4);
				if (segmentSize <= 0) continue;
				ctx.fillRect(pX - half, pY - half, segmentSize, segmentSize);
				if (miniSize > 0 && !(selection & 1)) {
					const fillStyle = ctx.fillStyle;
					ctx.fillStyle = "#ffffff";
					ctx.fillRect(pX - miniHalf, pY - miniHalf, miniSize, miniSize);
					ctx.fillStyle = fillStyle;
				}
			}
		}
		function drawSegments(ctx, path, matrix) {
			const segments = path._segments;
			const length = segments.length;
			const coords = new Array(6);
			let first = true;
			let curX;
			let curY;
			let prevX;
			let prevY;
			let inX;
			let inY;
			let outX;
			let outY;
			function drawSegment(segment) {
				let handle;
				if (matrix) {
					segment._transformCoordinates(matrix, coords);
					curX = coords[0];
					curY = coords[1];
				} else {
					const point = segment._point;
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
						handle = segment._handleIn;
						inX = curX + handle._x;
						inY = curY + handle._y;
					}
					if (inX === curX && inY === curY && outX === prevX && outY === prevY) {
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
					handle = segment._handleOut;
					outX = prevX + handle._x;
					outY = prevY + handle._y;
				}
			}
			for (let i = 0; i < length; i++) drawSegment(segments[i]);
			if (path._closed && length > 0) drawSegment(segments[0]);
		}
		return {
			_draw: function(ctx, param, viewMatrix, strokeMatrix) {
				const dontPaint = param.dontFinish || param.clip;
				if (!param.dontStart) ctx.beginPath();
				if (this.hasFill() || this.hasStroke() || dontPaint) {
					drawSegments(ctx, this, strokeMatrix);
					if (this._closed) ctx.closePath();
				}
				if (!dontPaint) this._paint(ctx, param, viewMatrix, strokeMatrix);
			},
			_drawSelected: function(ctx, matrix) {
				ctx.beginPath();
				drawSegments(ctx, this, matrix);
				ctx.stroke();
				const settings = paper.settings;
				const handleSize = settings.handleSize;
				const segmentSize = settings.segmentSize;
				drawHandles(ctx, this._segments, matrix, handleSize, segmentSize != null ? segmentSize : handleSize);
			}
		};
	})(), new (function() {
		function getCurrentSegment(that) {
			const segments = that._segments;
			if (!segments.length) throw new Error("Use a moveTo() command first");
			return segments[segments.length - 1];
		}
		function addArc(that, center, vector, extent, to, matrix) {
			const current = getCurrentSegment(that);
			const epsilon = 1e-5;
			const count = Math.ceil((Math.abs(extent) - epsilon) / 90);
			if (count) {
				const inc = extent / count;
				const half = inc * Math.PI / 360;
				const z = 4 / 3 * Math.sin(half) / (1 + Math.cos(half));
				const segments = [];
				for (let i = 0; i <= count; i++) {
					let pt = to;
					let out = null;
					if (i < count) {
						out = vector.rotate(90).multiply(z);
						if (matrix) {
							pt = matrix._transformPoint(vector);
							out = matrix._transformPoint(vector.add(out)).subtract(pt);
						} else {
							pt = center.add(vector);
						}
					}
					if (!i) {
						current.setHandleOut(out);
					} else {
						let _in = vector.rotate(-90).multiply(z);
						if (matrix) {
							_in = matrix._transformPoint(vector.add(_in)).subtract(pt);
						}
						segments.push(new Segment(pt, _in, out));
					}
					vector = vector.rotate(inc);
				}
				that._add(segments);
			} else if (extent && !to.equals(current._point)) {
				that.lineTo(to);
			}
		}
		return {
			moveTo: function() {
				const segments = this._segments;
				if (segments.length === 1) this.removeSegment(0);
				if (!segments.length) this._add([new Segment(Point.read(arguments))]);
			},
			moveBy: function() {
				throw new Error("moveBy() is unsupported on Path items.");
			},
			lineTo: function() {
				this._add([new Segment(Point.read(arguments))]);
			},
			cubicCurveTo: function() {
				const args = arguments;
				const handle1 = Point.read(args);
				const handle2 = Point.read(args);
				const to = Point.read(args);
				const current = getCurrentSegment(this);
				current.setHandleOut(handle1.subtract(current._point));
				this._add([new Segment(to, handle2.subtract(to))]);
			},
			quadraticCurveTo: function() {
				const args = arguments;
				const handle = Point.read(args);
				const to = Point.read(args);
				const current = getCurrentSegment(this)._point;
				this.cubicCurveTo(handle.add(current.subtract(handle).multiply(1 / 3)), handle.add(to.subtract(handle).multiply(1 / 3)), to);
			},
			curveTo: function() {
				const args = arguments;
				const through = Point.read(args);
				const to = Point.read(args);
				const t = Base.pick(Base.read(args), .5);
				const t1 = 1 - t;
				const current = getCurrentSegment(this)._point;
				const handle = through.subtract(current.multiply(t1 * t1)).subtract(to.multiply(t * t)).divide(2 * t * t1);
				if (handle.isNaN()) throw new Error("Cannot put a curve through points with parameter = " + t);
				this.quadraticCurveTo(handle, to);
			},
			arcTo: function() {
				let through;
				let clockwise;
				let middle;
				const args = arguments;
				const abs = Math.abs;
				const sqrt = Math.sqrt;
				const from = getCurrentSegment(this)._point;
				let to = Point.read(args);
				const peek = Base.peek(args);
				clockwise = Base.pick(peek, true);
				let center;
				let extent;
				let vector;
				let matrix;
				if (typeof clockwise === "boolean") {
					middle = from.add(to).divide(2);
					through = middle.add(middle.subtract(from).rotate(clockwise ? -90 : 90));
				} else if (Base.remain(args) <= 2) {
					through = to;
					to = Point.read(args);
				} else if (!from.equals(to)) {
					const radius = Size.read(args);
					const isZero = Numerical.isZero;
					if (isZero(radius.width) || isZero(radius.height)) return this.lineTo(to);
					const rotation = Base.read(args);
					clockwise = !!Base.read(args);
					const large = !!Base.read(args);
					middle = from.add(to).divide(2);
					const pt = from.subtract(middle).rotate(-rotation);
					const x = pt.x;
					const y = pt.y;
					let rx = abs(radius.width);
					let ry = abs(radius.height);
					let rxSq = rx * rx;
					let rySq = ry * ry;
					const xSq = x * x;
					const ySq = y * y;
					let factor = sqrt(xSq / rxSq + ySq / rySq);
					if (factor > 1) {
						rx *= factor;
						ry *= factor;
						rxSq = rx * rx;
						rySq = ry * ry;
					}
					factor = (rxSq * rySq - rxSq * ySq - rySq * xSq) / (rxSq * ySq + rySq * xSq);
					if (abs(factor) < 1e-12) factor = 0;
					if (factor < 0) throw new Error("Cannot create an arc with the given arguments");
					center = new Point(rx * y / ry, -ry * x / rx).multiply((large === clockwise ? -1 : 1) * sqrt(factor)).rotate(rotation).add(middle);
					matrix = new Matrix().translate(center).rotate(rotation).scale(rx, ry);
					vector = matrix._inverseTransform(from);
					extent = vector.getDirectedAngle(matrix._inverseTransform(to));
					if (!clockwise && extent > 0) extent -= 360;
					else if (clockwise && extent < 0) extent += 360;
				}
				if (through) {
					const l1 = new Line(from.add(through).divide(2), through.subtract(from).rotate(90), true);
					const l2 = new Line(through.add(to).divide(2), to.subtract(through).rotate(90), true);
					const line = new Line(from, to);
					const throughSide = line.getSide(through);
					center = l1.intersect(l2, true);
					if (!center) {
						if (!throughSide) return this.lineTo(to);
						throw new Error("Cannot create an arc with the given arguments");
					}
					vector = from.subtract(center);
					extent = vector.getDirectedAngle(to.subtract(center));
					const centerSide = line.getSide(center, true);
					if (centerSide === 0) {
						extent = throughSide * abs(extent);
					} else if (throughSide === centerSide) {
						extent += extent < 0 ? 360 : -360;
					}
				}
				addArc(this, center, vector, extent, to, matrix);
			},
			arcAround: function() {
				const args = arguments;
				const center = Point.read(args);
				const angle = Base.read(args);
				const vector = getCurrentSegment(this)._point.subtract(center);
				addArc(this, center, vector, angle, center.add(vector.rotate(angle)));
			},
			arcTowards: function() {
				const to = Point.read(arguments);
				const current = getCurrentSegment(this);
				const previous = current.getPrevious();
				const from = current._point;
				const tangent = previous ? new Curve(previous, current).getTangentAtTime(1) : new Point();
				const normal = tangent.rotate(90);
				const vector = to.subtract(from);
				const distance = vector.dot(normal);
				if (!Numerical.isZero(distance)) {
					const center = from.add(normal.multiply(vector.dot(vector) / (2 * distance)));
					const start = from.subtract(center);
					let extent = start.getDirectedAngle(to.subtract(center));
					if (extent * distance < 0) extent += distance > 0 ? 360 : -360;
					addArc(this, center, start, extent, to);
				} else if (vector.dot(tangent) > 0) {
					this.lineTo(to);
				} else {
					throw new Error("Cannot create an arc with the given arguments");
				}
			},
			lineBy: function() {
				const to = Point.read(arguments);
				const current = getCurrentSegment(this)._point;
				this.lineTo(current.add(to));
			},
			curveBy: function() {
				const args = arguments;
				const through = Point.read(args);
				const to = Point.read(args);
				const parameter = Base.read(args);
				const current = getCurrentSegment(this)._point;
				this.curveTo(current.add(through), current.add(to), parameter);
			},
			cubicCurveBy: function() {
				const args = arguments;
				const handle1 = Point.read(args);
				const handle2 = Point.read(args);
				const to = Point.read(args);
				const current = getCurrentSegment(this)._point;
				this.cubicCurveTo(current.add(handle1), current.add(handle2), current.add(to));
			},
			quadraticCurveBy: function() {
				const args = arguments;
				const handle = Point.read(args);
				const to = Point.read(args);
				const current = getCurrentSegment(this)._point;
				this.quadraticCurveTo(current.add(handle), current.add(to));
			},
			arcBy: function() {
				const args = arguments;
				const current = getCurrentSegment(this)._point;
				const point = current.add(Point.read(args));
				const clockwise = Base.pick(Base.peek(args), true);
				if (typeof clockwise === "boolean") {
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
	})(), {
		_getBounds: function(matrix, options) {
			const method = options.handle ? "getHandleBounds" : options.stroke ? "getStrokeBounds" : "getBounds";
			return method === "getStrokeBounds" && this._hasStrokeProfile() ? this._getStrokeOutline().getBounds(matrix) : Path[method](this._segments, this._closed, this, matrix, options);
		},
		statics: {
			getBounds: function(segments, closed, path, matrix, options, strokePadding) {
				const first = segments[0];
				if (!first) return new Rectangle();
				let coords = new Array(6);
				let prevCoords = first._transformCoordinates(matrix, new Array(6));
				const min = prevCoords.slice(0, 2);
				const max = min.slice();
				const roots = new Array(2);
				function processSegment(segment) {
					segment._transformCoordinates(matrix, coords);
					for (let i = 0; i < 2; i++) {
						Curve._addBounds(prevCoords[i], prevCoords[i + 4], coords[i + 2], coords[i], i, strokePadding ? strokePadding[i] : 0, min, max, roots);
					}
					const tmp = prevCoords;
					prevCoords = coords;
					coords = tmp;
				}
				for (let i = 1, l = segments.length; i < l; i++) processSegment(segments[i]);
				if (closed) processSegment(first);
				return new Rectangle(min[0], min[1], max[0] - min[0], max[1] - min[1]);
			},
			getStrokeBounds: function(segments, closed, path, matrix, options) {
				const style = path.getStyle();
				const stroke = style.hasStroke();
				const strokeRadius = style.getStrokeWidth() / 2;
				const strokeMatrix = stroke && path._getStrokeMatrix(matrix, options);
				const strokePadding = stroke && Matrix._getCircleExtents(strokeRadius, strokeMatrix);
				let bounds = Path.getBounds(segments, closed, path, matrix, options, strokePadding);
				if (!stroke) return bounds;
				const join = style.getStrokeJoin();
				const cap = style.getStrokeCap();
				const miterLimit = style.getMiterLimit();
				const joinBounds = new Rectangle(new Size(strokePadding).multiply(2));
				function addPoint(point) {
					bounds = bounds.include(point);
				}
				function addRound(segment) {
					bounds = bounds.unite(joinBounds.setCenter(segment._point.transform(matrix)));
				}
				function addJoin(segment, join) {
					if (join === "round" || segment.isSmooth()) {
						addRound(segment);
					} else {
						Path._addBevelJoin(segment, join, strokeRadius, miterLimit, matrix, strokeMatrix, addPoint);
					}
				}
				function addCap(segment, cap) {
					if (cap === "round") {
						addRound(segment);
					} else {
						Path._addSquareCap(segment, cap, strokeRadius, matrix, strokeMatrix, addPoint);
					}
				}
				const length = segments.length - (closed ? 0 : 1);
				if (length > 0) {
					for (let i = 1; i < length; i++) {
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
			_getStrokeNormal: function(curve, time, radius, matrix, strokeMatrix) {
				const mx = matrix ? matrix._shiftless() : new Matrix();
				const inverse = strokeMatrix && strokeMatrix.inverted();
				const tangent = curve.getTangentAtTime(time).transform(inverse ? inverse.append(mx) : mx);
				return new Point(tangent.y, -tangent.x).normalize(radius);
			},
			_addBevelJoin: function(segment, join, radius, miterLimit, matrix, strokeMatrix, addPoint, isArea) {
				const curve2 = segment.getCurve();
				const curve1 = curve2.getPrevious();
				const point = curve2.getPoint1().transform(matrix);
				let normal1 = Path._getStrokeNormal(curve1, 1, radius, matrix, strokeMatrix);
				let normal2 = Path._getStrokeNormal(curve2, 0, radius, matrix, strokeMatrix);
				const angle = normal1.getDirectedAngle(normal2);
				if (angle < 0 || angle >= 180) {
					normal1 = normal1.negate();
					normal2 = normal2.negate();
				}
				if (isArea) addPoint(point);
				addPoint(point.add(normal1.transform(strokeMatrix)));
				if (join === "miter") {
					const corner = new Line(normal1, new Point(-normal1.y, normal1.x), true).intersect(new Line(normal2, new Point(-normal2.y, normal2.x), true), true);
					if (corner && corner.getLength() <= miterLimit * radius) {
						addPoint(point.add(corner.transform(strokeMatrix)));
					}
				}
				addPoint(point.add(normal2.transform(strokeMatrix)));
			},
			_addSquareCap: function(segment, cap, radius, matrix, strokeMatrix, addPoint, isArea) {
				let point = segment._point.transform(matrix);
				const loc = segment.getLocation();
				const time = loc.getTime();
				const vector = Path._getStrokeNormal(loc.getCurve(), time, time === 0 ? radius : -radius, matrix, strokeMatrix);
				const normal = vector.transform(strokeMatrix);
				if (cap === "square") {
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
				if (!segments.length) return new Rectangle();
				const style = path.getStyle();
				const stroke = options.stroke && style.hasStroke();
				let strokePadding;
				let joinPadding;
				if (stroke) {
					const strokeMatrix = path._getStrokeMatrix(matrix, options);
					const strokeRadius = style.getStrokeWidth() / 2;
					let joinRadius = strokeRadius;
					if (style.getStrokeJoin() === "miter") joinRadius = strokeRadius * style.getMiterLimit();
					if (style.getStrokeCap() === "square") joinRadius = Math.max(joinRadius, strokeRadius * Math.SQRT2);
					strokePadding = Matrix._getCircleExtents(strokeRadius, strokeMatrix);
					joinPadding = Matrix._getCircleExtents(joinRadius, strokeMatrix);
				}
				const coords = new Array(6);
				let x1 = Infinity;
				let x2 = -x1;
				let y1 = x1;
				let y2 = x2;
				for (let i = 0, l = segments.length; i < l; i++) {
					const segment = segments[i];
					segment._transformCoordinates(matrix, coords);
					for (let j = 0; j < 6; j += 2) {
						const padding = !j ? joinPadding : strokePadding;
						const paddingX = padding ? padding[0] : 0;
						const paddingY = padding ? padding[1] : 0;
						const x = coords[j];
						const y = coords[j + 1];
						const xn = x - paddingX;
						const xx = x + paddingX;
						const yn = y - paddingY;
						const yx = y + paddingY;
						if (xn < x1) x1 = xn;
						if (xx > x2) x2 = xx;
						if (yn < y1) y1 = yn;
						if (yx > y2) y2 = yx;
					}
				}
				return new Rectangle(x1, y1, x2 - x1, y2 - y1);
			}
		}
	});
	Path.inject({ statics: new (function() {
		const kappa = .5522847498307936;
		const ellipseSegments = [
			new Segment([-1, 0], [0, kappa], [0, -kappa]),
			new Segment([0, -1], [-kappa, 0], [kappa, 0]),
			new Segment([1, 0], [0, -kappa], [0, kappa]),
			new Segment([0, 1], [kappa, 0], [-kappa, 0])
		];
		function createPath(segments, closed, args) {
			const props = Base.getNamed(args);
			const path = new Path(props && {
				insert: props.insert,
				project: props.project,
				parent: props.parent
			});
			path._add(segments);
			path._closed = closed;
			return path.set(props, {
				insert: true,
				project: true,
				parent: true
			});
		}
		function createEllipse(center, radius, args) {
			const segments = new Array(4);
			for (let i = 0; i < 4; i++) {
				const segment = ellipseSegments[i];
				segments[i] = new Segment(segment._point.multiply(radius).add(center), segment._handleIn.multiply(radius), segment._handleOut.multiply(radius));
			}
			return createPath(segments, true, args);
		}
		return {
			Line: function() {
				const args = arguments;
				return createPath([new Segment(Point.readNamed(args, "from")), new Segment(Point.readNamed(args, "to"))], false, args);
			},
			Circle: function() {
				const args = arguments;
				const center = Point.readNamed(args, "center");
				const radius = Base.readNamed(args, "radius");
				return createEllipse(center, new Size(radius), args);
			},
			Rectangle: function() {
				const args = arguments;
				const rect = Rectangle.readNamed(args, "rectangle");
				let radius = Size.readNamed(args, "radius", 0, { readNull: true });
				const bl = rect.getBottomLeft(true);
				const tl = rect.getTopLeft(true);
				const tr = rect.getTopRight(true);
				const br = rect.getBottomRight(true);
				let segments;
				if (!radius || radius.isZero()) {
					segments = [
						new Segment(bl),
						new Segment(tl),
						new Segment(tr),
						new Segment(br)
					];
				} else {
					radius = Size.min(radius, rect.getSize(true).divide(2));
					const rx = radius.width;
					const ry = radius.height;
					const hx = rx * kappa;
					const hy = ry * kappa;
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
			RoundRectangle: "#Rectangle",
			Ellipse: function() {
				const args = arguments;
				const ellipse = Shape._readEllipse(args);
				return createEllipse(ellipse.center, ellipse.radius, args);
			},
			Oval: "#Ellipse",
			Arc: function() {
				const args = arguments;
				const from = Point.readNamed(args, "from");
				const through = Point.readNamed(args, "through");
				const to = Point.readNamed(args, "to");
				const arc = new Path(Item.NO_INSERT);
				arc.moveTo(from);
				arc.arcTo(through, to);
				return createPath(arc._segments, false, args);
			},
			RegularPolygon: function() {
				const args = arguments;
				const center = Point.readNamed(args, "center");
				const sides = Base.readNamed(args, "sides");
				const radius = Base.readNamed(args, "radius");
				const step = -360 / sides;
				const offset = sides % 2 ? 0 : -.5;
				const vector = new Point(0, -radius);
				const segments = new Array(sides);
				for (let i = 0; i < sides; i++) segments[i] = new Segment(center.add(vector.rotate((i + offset) * step)));
				return createPath(segments, true, args);
			},
			Star: function() {
				const args = arguments;
				const center = Point.readNamed(args, "center");
				const points = Base.readNamed(args, "points") * 2;
				const radius1 = Base.readNamed(args, "radius1");
				const radius2 = Base.readNamed(args, "radius2");
				const step = 360 / points;
				const vector = new Point(0, -1);
				const segments = new Array(points);
				for (let i = 0; i < points; i++) segments[i] = new Segment(center.add(vector.rotate(step * i).multiply(i % 2 ? radius2 : radius1)));
				return createPath(segments, true, args);
			}
		};
	})() });
	Path.inject(new (function() {
		const tMin = 1e-8;
		const tMax = 1 - tMin;
		const defaults = {
			width: 1,
			aspect: 1,
			angle: 0
		};
		function getEntries(path) {
			const profile = path._strokeProfile || [];
			return profile.map(function(stop) {
				return {
					offset: stop.getOffset(),
					width: stop._width,
					aspect: stop._aspect,
					angle: stop._angle,
					smooth: stop._smooth
				};
			});
		}
		function getValue(entries, key, offset, length, closed, after) {
			const stops = entries.filter(function(entry) {
				return entry[key] != null;
			});
			const count = stops.length;
			let index = -1;
			function getStop(index) {
				const turns = Math.floor(index / count);
				const stop = stops[index - turns * count];
				return {
					offset: stop.offset + turns * length,
					value: stop[key],
					smooth: stop.smooth
				};
			}
			function getSlope(index, forward) {
				const stop = getStop(index);
				const other = getStop(forward ? index + 1 : index - 1);
				return stop.smooth ? 0 : (other.value - stop.value) / (other.offset - stop.offset);
			}
			if (count) {
				for (let i = 0; i < count; i++) {
					const stopOffset = stops[i].offset;
					if (stopOffset < offset || stopOffset === offset && after) index = i;
				}
				if (closed || index >= 0 && index < count - 1) {
					const stop1 = getStop(index);
					const stop2 = getStop(index + 1);
					const h = stop2.offset - stop1.offset;
					const t = (offset - stop1.offset) / h;
					const v1 = stop1.value;
					const v2 = stop2.value;
					const m1 = getSlope(index, true) * h;
					const m2 = getSlope(index + 1, false) * h;
					return [
						((2 * t - 3) * t * t + 1) * v1 + ((t - 2) * t + 1) * t * m1 + (3 - 2 * t) * t * t * v2 + (t - 1) * t * t * m2,
						(6 * (t - 1) * t * (v1 - v2) + ((3 * t - 4) * t + 1) * m1 + (3 * t - 2) * t * m2) / h,
						((12 * t - 6) * (v1 - v2) + (6 * t - 4) * m1 + (6 * t - 2) * m2) / (h * h)
					];
				}
				return [
					stops[index < 0 ? 0 : count - 1][key],
					0,
					0
				];
			}
			return null;
		}
		function getValues(entries, offset, length, closed, after) {
			const values = { offset };
			for (const key in defaults) {
				const value = getValue(entries, key, offset, length, closed, after);
				values[key] = value && value[0];
			}
			return values;
		}
		function getPart(entries, from, to, length, closed, hasStart, hasEnd, fallbacks) {
			function getEnd(offset, after) {
				const values = getValues(entries, offset, length, closed, after);
				for (const key in fallbacks) {
					if (values[key] == null) values[key] = fallbacks[key];
				}
				let stop = null;
				for (let i = 0, l = entries.length; i < l; i++) {
					if (entries[i].offset === offset && (after || !stop)) stop = entries[i];
				}
				values.smooth = !!stop && stop.smooth;
				return values;
			}
			const part = [];
			for (let i = 0, l = entries.length; i < l; i++) {
				const entry = entries[i];
				let offset = entry.offset;
				if (closed && offset < from) offset += length;
				if ((offset > from || offset === from && !hasStart) && (offset < to || offset === to && !hasEnd)) part.push(Base.set({}, entry, { offset: offset - from }));
			}
			part.sort(function(a, b) {
				return a.offset - b.offset;
			});
			if (hasStart) part.unshift(Base.set(getEnd(from, true), { offset: 0 }));
			if (hasEnd) {
				part.push(Base.set(getEnd(closed ? to % length : to), { offset: to - from }));
			}
			return part;
		}
		function getSpanIndex(path, start, count, fraction) {
			let i;
			const curves = path.getCurves();
			const lengths = [];
			let total = 0;
			for (i = 0; i < count; i++) {
				const length = curves[(start + i) % curves.length].getLength();
				lengths.push(length);
				total += length;
			}
			let rest = fraction * total;
			i = 0;
			while (i < count - 1 && rest >= lengths[i]) rest -= lengths[i++];
			const index = start + i + (lengths[i] ? Math.min(rest / lengths[i], 1) : 0);
			return path._closed ? index % curves.length : index;
		}
		return {
			_strokeProfile: null,
			getStrokeProfile: function() {
				return this._strokeProfile;
			},
			setStrokeProfile: function(stops) {
				let i;
				let l;
				let stop;
				const previous = this._strokeProfile;
				let profile = null;
				if (stops && stops.length) {
					profile = [];
					for (i = 0, l = stops.length; i < l; i++) {
						stop = stops[i];
						if (!(stop instanceof StrokeProfileStop)) {
							stop = new StrokeProfileStop(stop);
						} else if (stop._path && stop._path !== this) {
							stop = stop.clone();
						}
						if (stop._path !== this) {
							if (stop._index == null) stop._index = this._getIndexAt(stop._offset);
							stop._path = this;
						}
						profile.push(stop);
					}
				}
				for (i = 0, l = previous ? previous.length : 0; i < l; i++) {
					stop = previous[i];
					if (!profile || profile.indexOf(stop) === -1) {
						stop._offset = stop.getOffset();
						stop._index = stop._path = null;
					}
				}
				this._strokeProfile = profile;
				if (profile) this._sortStrokeProfile();
				this._changed(193);
			},
			getStrokeProfileAt: function(offset) {
				const values = getValues(getEntries(this), offset, this.getLength(), this._closed, true);
				for (const key in defaults) {
					if (values[key] == null) values[key] = defaults[key];
				}
				return new StrokeProfileStop(values);
			},
			_getStrokeProfilePens: function() {
				const entries = getEntries(this);
				const length = this.getLength();
				const closed = this._closed;
				const pens = [];
				function getPen(offset, after) {
					const values = getValues(entries, offset, length, closed, after);
					for (const key in defaults) {
						if (values[key] == null) values[key] = defaults[key];
					}
					return values;
				}
				const offsets = [0].concat(entries.map(function(entry) {
					return entry.offset;
				}), length);
				for (let i = 0, l = offsets.length; i < l; i++) {
					const offset = offsets[i];
					if (!i || offset > offsets[i - 1]) {
						if (offset > 0) pens.push(getPen(offset, false));
						if (offset < length) {
							const pen = getPen(offset, true);
							if (!offset || !Base.equals(pen, pens[pens.length - 1])) pens.push(pen);
						}
					}
				}
				return pens;
			},
			_getStrokeProfileValues: function() {
				const entries = getEntries(this);
				const length = this.getLength();
				const closed = this._closed;
				return function(offset, after) {
					const values = {};
					for (const key in defaults) {
						values[key] = getValue(entries, key, offset, length, closed, after) || [
							defaults[key],
							0,
							0
						];
					}
					return values;
				};
			},
			_getIndexAt: function(offset) {
				const length = this.getLength();
				offset = this._closed ? length ? (offset % length + length) % length : 0 : Math.min(Math.max(offset, 0), length);
				const loc = this.getLocationAt(offset);
				if (loc) {
					const time = loc.getTime();
					const curveLength = loc.getCurve().getLength();
					return loc.getIndex() + (time < tMin || !curveLength ? 0 : time > tMax ? 1 : loc.getCurveOffset() / curveLength);
				}
				return this.getCurves().length;
			},
			_getOffsetAtIndex: function(index) {
				const curves = this.getCurves();
				const i = Math.floor(index);
				let offset = 0;
				for (let j = 0, l = Math.min(i, curves.length); j < l; j++) offset += curves[j].getLength();
				return i < curves.length ? offset + (index - i) * curves[i].getLength() : offset;
			},
			_sortStrokeProfile: function() {
				this._strokeProfile.sort(function(a, b) {
					return a._index - b._index;
				});
			},
			_filterStrokeProfile: function(callback) {
				const profile = this._strokeProfile.filter(callback);
				this.setStrokeProfile(profile);
			},
			_insertStrokeProfile: function(index, amount) {
				const profile = this._strokeProfile;
				const count = this._segments.length - amount;
				const closed = this._closed;
				const divided = closed ? (index + count - 1) % count : index > 0 && index < count ? index - 1 : -1;
				const start = divided < index ? divided : divided + amount;
				if (count) {
					for (let i = 0, l = profile.length; i < l; i++) {
						const stop = profile[i];
						const x = stop._index;
						if (divided >= 0 && x > divided && x < divided + 1) {
							stop._index = getSpanIndex(this, start, amount + 1, x - divided);
						} else if (x >= index) {
							stop._index = x + amount;
						}
					}
					this._sortStrokeProfile();
				}
			},
			_removeStrokeProfile: function(start, end) {
				const count = this._segments.length;
				const closed = this._closed;
				const amount = end - start;
				const curves = this.getCurves();
				const before = closed ? (start + count - 1) % count : start - 1;
				const index = before < start ? before : before - amount;
				const span = amount + 1;
				function isKept(stop) {
					const x = stop._index;
					return closed ? amount < count : start ? end < count || x <= before : x >= end;
				}
				this._filterStrokeProfile(isKept);
				const profile = this._strokeProfile || [];
				for (let i = 0, l = profile.length; i < l; i++) {
					const stop = profile[i];
					const x = stop._index;
					const d = closed ? (x - before + count) % count : x - before;
					if (before >= 0 && d > 0 && d < span) {
						let position = 0;
						let total = 0;
						for (let j = 0; j < span; j++) {
							const length = curves[(before + j) % curves.length].getLength();
							if (j < Math.floor(d)) {
								position += length;
							} else if (j === Math.floor(d)) {
								position += (d - j) * length;
							}
							total += length;
						}
						stop._index = index + (total ? position / total : d / span);
					} else if (x >= end) {
						stop._index = x - amount;
					}
				}
				if (profile.length) this._sortStrokeProfile();
			},
			_reverseStrokeProfile: function() {
				const profile = this._strokeProfile;
				const count = this._segments.length;
				for (let i = 0, l = profile.length; i < l; i++) {
					const stop = profile[i];
					stop._index = this._closed ? (2 * count - 1 - stop._index) % count : count - 1 - stop._index;
				}
				profile.reverse();
				this._sortStrokeProfile();
			},
			_takeStrokeProfile: function() {
				const part = {
					entries: getEntries(this),
					length: this.getLength(),
					closed: this._closed
				};
				if (this._strokeProfile) this.setStrokeProfile(null);
				return part;
			},
			_setStrokeProfileParts: function(parts) {
				const length = this.getLength();
				const closed = this._closed;
				const entries = [];
				const fallbacks = {};
				parts.forEach(function(part) {
					part.entries.forEach(function(entry) {
						for (const key in defaults) {
							if (entry[key] != null) fallbacks[key] = defaults[key];
						}
					});
				});
				for (let i = 0, l = parts.length; i < l; i++) {
					const part = parts[i];
					const start = i ? length - part.length : 0;
					const hasStart = closed || i > 0;
					const hasEnd = closed || i < l - 1;
					if (part.entries.length || l > 1 || closed) {
						const shifted = getPart(part.entries, 0, part.length, part.length, part.closed, hasStart, hasEnd, fallbacks);
						for (let j = 0, m = shifted.length; j < m; j++) {
							const entry = shifted[j];
							entry.offset += start;
							entries.push(entry);
						}
					}
				}
				if (closed && entries.length) entries.unshift(entries.pop());
				this.setStrokeProfile(entries);
			},
			_setStrokeProfilePart: function(part, from, to) {
				const length = part.length;
				this.setStrokeProfile(getPart(part.entries, from, to, length, part.closed, part.closed || from > 0, part.closed || to < length));
			}
		};
	})());
	const StrokeProfileStop = Base.extend({
		_class: "StrokeProfileStop",
		_compactSerialize: true,
		initialize: function StrokeProfileStop(props) {
			props = props || {};
			this._path = null;
			this._index = props.index != null ? props.index : null;
			this._offset = props.offset || 0;
			this._width = props.width != null ? props.width : null;
			this._aspect = props.aspect != null ? props.aspect : null;
			this._angle = props.angle != null ? props.angle : null;
			this._smooth = props.smooth !== false;
		},
		clone: function() {
			return new StrokeProfileStop({
				offset: this.getOffset(),
				width: this._width,
				aspect: this._aspect,
				angle: this._angle,
				smooth: this._smooth
			});
		},
		_serialize: function(options, dictionary) {
			const props = { index: this._index };
			[
				"width",
				"aspect",
				"angle"
			].forEach(function(key) {
				const value = this["_" + key];
				if (value != null) props[key] = value;
			}, this);
			if (!this._smooth) props.smooth = false;
			return Base.serialize(props, options, true, dictionary);
		},
		_changed: function() {
			if (this._path) this._path._changed(193);
		},
		getPath: function() {
			return this._path;
		},
		getOffset: function() {
			const path = this._path;
			return path ? path._getOffsetAtIndex(this._index) : this._offset;
		},
		setOffset: function(offset) {
			const path = this._path;
			if (path) {
				this._index = path._getIndexAt(offset);
				path._sortStrokeProfile();
				this._changed();
			} else {
				this._offset = offset;
			}
		},
		getWidth: function() {
			return this._width;
		},
		setWidth: function(width) {
			this._width = width;
			this._changed();
		},
		getAspect: function() {
			return this._aspect;
		},
		setAspect: function(aspect) {
			this._aspect = aspect;
			this._changed();
		},
		getAngle: function() {
			return this._angle;
		},
		setAngle: function(angle) {
			this._angle = angle;
			this._changed();
		},
		isSmooth: function() {
			return this._smooth;
		},
		setSmooth: function(smooth) {
			this._smooth = !!smooth;
			this._changed();
		},
		equals: function(stop) {
			return stop === this || stop instanceof StrokeProfileStop && this._width === stop._width && this._aspect === stop._aspect && this._angle === stop._angle && this._smooth === stop._smooth && (this._path ? this._index === stop._index : this._offset === stop._offset) || false;
		}
	});
	const CompoundPath = PathItem.extend({
		_class: "CompoundPath",
		_serializeFields: { children: [] },
		beans: true,
		initialize: function CompoundPath(arg) {
			this._children = [];
			this._namedChildren = {};
			if (!this._initialize(arg)) {
				if (typeof arg === "string") {
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
			let list = items;
			const first = list[0];
			if (first && typeof first[0] === "number") list = [list];
			for (let i = items.length - 1; i >= 0; i--) {
				const item = list[i];
				if (list === items && !(item instanceof Path)) list = Base.slice(list);
				if (Array.isArray(item)) {
					list[i] = new Path({
						segments: item,
						insert: false
					});
				} else if (item instanceof CompoundPath) {
					list.splice.apply(list, [i, 1].concat(item.removeChildren()));
					item.remove();
				}
			}
			return insertChildren.base.call(this, index, list);
		},
		reduce: function reduce(options) {
			let path;
			const children = this._children;
			for (let i = children.length - 1; i >= 0; i--) {
				path = children[i].reduce(options);
				if (path.isEmpty()) path.remove();
			}
			if (!children.length) {
				path = new Path(Item.NO_INSERT);
				path.copyAttributes(this);
				path.insertAbove(this);
				this.remove();
				return path;
			}
			const item = reduce.base.call(this);
			if (item !== this) item.copyAttributes(this, true);
			return item;
		},
		isClosed: function() {
			const children = this._children;
			for (let i = 0, l = children.length; i < l; i++) {
				if (!children[i]._closed) return false;
			}
			return true;
		},
		setClosed: function(closed) {
			const children = this._children;
			for (let i = 0, l = children.length; i < l; i++) {
				children[i].setClosed(closed);
			}
		},
		getFirstSegment: function() {
			const first = this.getFirstChild();
			return first && first.getFirstSegment();
		},
		getLastSegment: function() {
			const last = this.getLastChild();
			return last && last.getLastSegment();
		},
		getCurves: function() {
			const children = this._children;
			const curves = [];
			for (let i = 0, l = children.length; i < l; i++) {
				Base.push(curves, children[i].getCurves());
			}
			return curves;
		},
		getFirstCurve: function() {
			const first = this.getFirstChild();
			return first && first.getFirstCurve();
		},
		getLastCurve: function() {
			const last = this.getLastChild();
			return last && last.getLastCurve();
		},
		getArea: function() {
			const children = this._children;
			let area = 0;
			for (let i = 0, l = children.length; i < l; i++) area += children[i].getArea();
			return area;
		},
		getLength: function() {
			const children = this._children;
			let length = 0;
			for (let i = 0, l = children.length; i < l; i++) length += children[i].getLength();
			return length;
		},
		getPathData: function(_matrix, _precision) {
			const children = this._children;
			const paths = [];
			for (let i = 0, l = children.length; i < l; i++) {
				const child = children[i];
				const mx = child._matrix;
				paths.push(child.getPathData(_matrix && !mx.isIdentity() ? _matrix.appended(mx) : _matrix, _precision));
			}
			return paths.join("");
		},
		_hitTestChildren: function _hitTestChildren(point, options, viewMatrix) {
			return _hitTestChildren.base.call(this, point, options.class === Path || options.type === "path" ? options : Base.set({}, options, { fill: false }), viewMatrix);
		},
		_draw: function(ctx, param, viewMatrix, strokeMatrix) {
			const children = this._children;
			if (!children.length) return;
			param = param.extend({
				dontStart: true,
				dontFinish: true
			});
			ctx.beginPath();
			for (let i = 0, l = children.length; i < l; i++) children[i].draw(ctx, param, strokeMatrix);
			if (!param.clip) this._paint(ctx, param, viewMatrix, strokeMatrix);
		},
		_drawSelected: function(ctx, matrix, selectionItems) {
			const children = this._children;
			for (let i = 0, l = children.length; i < l; i++) {
				const child = children[i];
				const mx = child._matrix;
				if (!selectionItems[child._id]) {
					child._drawSelected(ctx, mx.isIdentity() ? matrix : matrix.appended(mx));
				}
			}
		}
	}, new (function() {
		function getCurrentPath(that, check) {
			const children = that._children;
			if (check && !children.length) throw new Error("Use a moveTo() command first");
			return children[children.length - 1];
		}
		return Base.each([
			"lineTo",
			"cubicCurveTo",
			"quadraticCurveTo",
			"curveTo",
			"arcTo",
			"arcAround",
			"arcTowards",
			"lineBy",
			"cubicCurveBy",
			"quadraticCurveBy",
			"curveBy",
			"arcBy"
		], function(key) {
			this[key] = function() {
				const path = getCurrentPath(this, true);
				path[key].apply(path, arguments);
			};
		}, {
			moveTo: function() {
				const current = getCurrentPath(this);
				const path = current && current.isEmpty() ? current : new Path(Item.NO_INSERT);
				if (path !== current) this.addChild(path);
				path.moveTo.apply(path, arguments);
			},
			moveBy: function() {
				const current = getCurrentPath(this, true);
				const last = current && current.getLastSegment();
				const point = Point.read(arguments);
				this.moveTo(last ? point.add(last._point) : point);
			},
			closePath: function(tolerance) {
				getCurrentPath(this, true).closePath(tolerance);
			}
		});
	})(), Base.each([
		"reverse",
		"flatten",
		"smooth"
	], function(key) {
		this[key] = function(param) {
			const children = this._children;
			for (let i = 0, l = children.length; i < l; i++) children[i][key](param);
		};
	}, { simplify: function(options) {
		const children = this._children;
		let res = false;
		for (let i = 0, l = children.length; i < l; i++) res = children[i].simplify(options) || res;
		return res;
	} }));
	PathItem.inject(new (function() {
		const min = Math.min;
		const max = Math.max;
		const abs = Math.abs;
		const operators = {
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
			const res = path.clone(false).reduce({ simplify: true }).transform(null, true, true);
			return close ? closePaths(res) : res;
		}
		function closePaths(item) {
			const paths = getPaths(item);
			for (let i = 0, l = paths.length; i < l; i++) {
				const path = paths[i];
				if (!path._closed && !path.isEmpty()) {
					const count = path._segments.length;
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
			let result = new CompoundPath(Item.NO_INSERT);
			result.addChildren(paths, true);
			result = result.reduce({ simplify });
			if (Base.pick(options && options.insert, paper.settings.insertItems)) {
				let above = path1;
				const others = [].concat(path2 || []);
				for (let i = 0, l = others.length; i < l; i++) {
					const other = others[i];
					if (path1.isSibling(other) && other.getIndex() > above.getIndex()) above = other;
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
			if (options && (options.trace == false || options.stroke) && /^(subtract|intersect)$/.test(operation)) return splitBoolean(path1, path2, operation, options);
			let paths;
			if (operation === "exclude" && Array.isArray(path2) && path2.length > 1) {
				const items = [path1].concat(path2);
				const compound = new CompoundPath(Item.NO_INSERT);
				compound.setFillRule("evenodd");
				for (let i = 0, l = items.length; i < l; i++) {
					compound.addChildren(tracePaths([preparePath(items[i], true)], operators.unite));
				}
				paths = tracePaths([compound], operators.unite);
			} else {
				paths = tracePaths(getOperands(path1, combinePaths(path2, operation)), operators[operation]);
			}
			return createResult(paths, true, path1, path2, options);
		}
		function combinePaths(paths, operation) {
			const isUnite = operation === "unite" || operation === "subtract";
			function combine(entries) {
				if (entries.length > 1) {
					if (isUnite) {
						let bounds = entries[0].bounds;
						for (let i = 1, l = entries.length; i < l; i++) bounds = bounds.unite(entries[i].bounds);
						const key = bounds.width > bounds.height ? "x" : "y";
						entries.sort(function(entry1, entry2) {
							return entry1.center[key] - entry2.center[key];
						});
					}
					const middle = entries.length >> 1;
					return traceBoolean(combine(entries.slice(0, middle)), combine(entries.slice(middle)), isUnite ? "unite" : operation, { insert: false });
				}
				return entries[0].path;
			}
			const entries = [].concat(paths || []).map(function(path) {
				const bounds = path.getBounds();
				return {
					path,
					bounds,
					center: bounds.getCenter()
				};
			});
			return entries.length ? combine(entries) : null;
		}
		function splitBoolean(path1, path2, operation, options) {
			let i;
			let l;
			const _path1 = preparePath(path1);
			const _path2 = preparePath(combinePaths(path2, operation));
			const crossings = _path1.getIntersections(_path2, filterIntersection);
			const subtract = operation === "subtract";
			const divide = operation === "divide";
			const pieces = [];
			const paths = [];
			for (i = crossings.length - 1; i >= 0; i--) {
				const crossing = crossings[i];
				const split = crossing.getPath();
				const path = crossing.split();
				if (path) {
					path.getFirstSegment().setHandleIn(0, 0);
					split.getLastSegment().setHandleOut(0, 0);
					if (pieces.indexOf(path) === -1) pieces.push(path);
				}
			}
			const children = _path1._children || [_path1];
			for (i = 0, l = children.length; i < l; i++) {
				if (pieces.indexOf(children[i]) === -1) pieces.push(children[i]);
			}
			for (i = 0, l = pieces.length; i < l; i++) {
				const piece = pieces[i];
				if (divide || _path2.contains(piece.getPointAt(piece.getLength() / 2)) ^ subtract) paths.unshift(piece);
			}
			return createResult(paths, false, path1, path2, options);
		}
		function getRayWinding(point, v) {
			let winding = 0;
			const x = point.x;
			const y = point.y;
			if (y >= min(v[1], v[3], v[5], v[7]) && y <= max(v[1], v[3], v[5], v[7]) && x < max(v[0], v[2], v[4], v[6])) {
				const monoCurves = Curve.getMonoCurves(v);
				const roots = [];
				for (let i = 0, l = monoCurves.length; i < l; i++) {
					const mv = monoCurves[i];
					const y0 = mv[1];
					const y3 = mv[7];
					const dir = y0 < y3 ? 1 : y0 > y3 ? -1 : 0;
					if (dir && y >= min(y0, y3) && y < max(y0, y3)) {
						const px = Curve.solveCubic(mv, 1, y, roots, 0, 1) > 0 ? Curve.getPoint(mv, roots[0]).x : abs(y - y0) < abs(y - y3) ? mv[0] : mv[6];
						if (px > x) winding += dir;
					}
				}
			}
			return winding;
		}
		function reorientPaths(paths, isInside, clockwise) {
			const length = paths && paths.length;
			if (length) {
				const lookup = Base.each(paths, function(path, i) {
					this[path._id] = {
						container: null,
						winding: path.isClockwise() ? 1 : -1,
						index: i
					};
				}, {});
				const sorted = paths.slice().sort(function(a, b) {
					return abs(b.getArea()) - abs(a.getArea());
				});
				const first = sorted[0];
				const collisions = CollisionDetection.findItemBoundsCollisions(sorted, null, Numerical.GEOMETRIC_EPSILON);
				if (clockwise == null) clockwise = first.isClockwise();
				for (let i = 0; i < length; i++) {
					const path1 = sorted[i];
					const entry1 = lookup[path1._id];
					let containerWinding = 0;
					const indices = collisions[i];
					if (indices) {
						let point = null;
						for (let j = indices.length - 1; j >= 0; j--) {
							if (indices[j] < i) {
								point = point || path1.getInteriorPoint();
								const path2 = sorted[indices[j]];
								const curves = path2.getCurves();
								let winding = 0;
								for (let k = 0, n = curves.length; k < n; k++) {
									winding += getRayWinding(point, curves[k].getValues());
								}
								if (winding) {
									const entry2 = lookup[path2._id];
									containerWinding = entry2.winding;
									entry1.winding += containerWinding;
									entry1.container = entry2.exclude ? entry2.container : path2;
									break;
								}
							}
						}
					}
					if (isInside(entry1.winding) === isInside(containerWinding)) {
						entry1.exclude = true;
						paths[entry1.index] = null;
					} else {
						const container = entry1.container;
						path1.setClockwise(container ? !container.isClockwise() : clockwise);
					}
				}
			}
			return paths;
		}
		function getWinding(point, curves, dir, dontFlip) {
			let res;
			const ia = dir ? 1 : 0;
			const io = ia ^ 1;
			const pv = [point.x, point.y];
			const pa = pv[ia];
			const po = pv[io];
			const windingEpsilon = 1e-9;
			const paL = pa - windingEpsilon;
			const paR = pa + windingEpsilon;
			let windingL = 0;
			let windingR = 0;
			let pathWindingL = 0;
			let pathWindingR = 0;
			let onPath = false;
			let onAnyPath = false;
			const roots = [];
			let vPrev;
			let vClose;
			function addWinding(v) {
				const o0 = v[io + 0];
				const o3 = v[io + 6];
				if (po < min(o0, o3) || po > max(o0, o3)) {
					return;
				}
				const a0 = v[ia + 0];
				const a1 = v[ia + 2];
				const a2 = v[ia + 4];
				const a3 = v[ia + 6];
				if (o0 === o3) {
					if (a0 < paR && a3 > paL || a3 < paR && a0 > paL) {
						onPath = true;
					}
					return;
				}
				const t = po === o0 ? 0 : po === o3 ? 1 : paL > max(a0, a1, a2, a3) || paR < min(a0, a1, a2, a3) ? 1 : Curve.solveCubic(v, io, po, roots, 0, 1) > 0 ? roots[0] : 1;
				const a = t === 0 ? a0 : t === 1 ? a3 : Curve.getPoint(v, t)[dir ? "y" : "x"];
				const winding = o0 > o3 ? 1 : -1;
				const windingPrev = vPrev[io] > vPrev[io + 6] ? 1 : -1;
				const a3Prev = vPrev[ia + 6];
				if (po !== o0) {
					if (a < paL) {
						pathWindingL += winding;
					} else if (a > paR) {
						pathWindingR += winding;
					} else {
						onPath = true;
					}
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
				}
				vPrev = v;
				return !dontFlip && a > paL && a < paR && Curve.getTangent(v, t)[dir ? "x" : "y"] === 0 && getWinding(point, curves, !dir, true);
			}
			function handleCurve(v) {
				const o0 = v[io + 0];
				const o1 = v[io + 2];
				const o2 = v[io + 4];
				const o3 = v[io + 6];
				if (po <= max(o0, o1, o2, o3) && po >= min(o0, o1, o2, o3)) {
					const a0 = v[ia + 0];
					const a1 = v[ia + 2];
					const a2 = v[ia + 4];
					const a3 = v[ia + 6];
					const monoCurves = paL > max(a0, a1, a2, a3) || paR < min(a0, a1, a2, a3) ? [v] : Curve.getMonoCurves(v, dir);
					let res;
					for (let i = 0, l = monoCurves.length; i < l; i++) {
						if (res = addWinding(monoCurves[i])) return res;
					}
				}
			}
			for (let i = 0, l = curves.length; i < l; i++) {
				const curve = curves[i];
				const path = curve._path;
				const v = curve.getValues();
				if (!i || curves[i - 1]._path !== path) {
					vPrev = null;
					if (!path._closed) {
						vClose = Curve.getValues(path.getLastCurve().getSegment2(), curve.getSegment1(), null, true);
						if (vClose[io] !== vClose[io + 6]) {
							vPrev = vClose;
						}
					}
					if (!vPrev) {
						vPrev = v;
						let prev = path.getLastCurve();
						while (prev && prev !== curve) {
							const v2 = prev.getValues();
							if (v2[io] !== v2[io + 6]) {
								vPrev = v2;
								break;
							}
							prev = prev.getPrevious();
						}
					}
				}
				if (res = handleCurve(v)) return res;
				if (i + 1 === l || curves[i + 1]._path !== path) {
					if (vClose && (res = handleCurve(vClose))) return res;
					if (onPath && !pathWindingL && !pathWindingR) {
						pathWindingL = pathWindingR = path.isClockwise() ^ dir ? 1 : -1;
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
				windingL,
				windingR,
				onPath: onAnyPath
			};
		}
		function getPart(v, hasHandles, time1, time2, point1, point2) {
			let part;
			if (hasHandles) {
				part = Curve.getPart(v, time1, time2).slice();
				const dx1 = point1.x - part[0];
				const dy1 = point1.y - part[1];
				const dx2 = point2.x - part[6];
				const dy2 = point2.y - part[7];
				part[0] += dx1;
				part[1] += dy1;
				part[2] += dx1;
				part[3] += dy1;
				part[4] += dx2;
				part[5] += dy2;
				part[6] += dx2;
				part[7] += dy2;
			} else {
				part = [
					point1.x,
					point1.y,
					point1.x,
					point1.y,
					point2.x,
					point2.y,
					point2.x,
					point2.y
				];
			}
			return part;
		}
		function createGraph(operands) {
			let bounds;
			let i;
			let l;
			let j;
			let k;
			let m;
			let n;
			let curve;
			let collisions;
			let b;
			let list;
			let windings;
			let edge;
			let v;
			let vertex;
			let outgoing;
			let halfEdge;
			let point;
			let face;
			let index;
			let component;
			let indices;
			let other;
			const curves = [];
			const curveOperands = [];
			const offsets = {};
			const nonZeros = [];
			bounds = null;
			for (i = 0, l = operands.length; i < l; i++) {
				const operand = operands[i];
				const paths = getPaths(operand);
				nonZeros.push(operand.getFillRule() === "nonzero");
				bounds = bounds ? bounds.unite(operand.getBounds()) : operand.getBounds();
				for (j = 0, k = paths.length; j < k; j++) {
					const pathCurves = paths[j].getCurves();
					offsets[paths[j]._id] = curves.length;
					for (m = 0, n = pathCurves.length; m < n; m++) {
						curves.push(pathCurves[m]);
						curveOperands.push(i);
					}
				}
			}
			const epsilon = Numerical.getEpsilon(max(abs(bounds.left), abs(bounds.right), abs(bounds.top), abs(bounds.bottom)), bounds.getTopLeft().getDistance(bounds.getBottomRight()) * 1e-7);
			const values = [];
			const cuts = [];
			const xs = [];
			const ys = [];
			const isEnds = [];
			function addCut(index, time, point, isEnd) {
				cuts[index].push({
					time,
					point: xs.length
				});
				xs.push(point.x);
				ys.push(point.y);
				isEnds.push(isEnd);
			}
			for (i = 0, l = curves.length; i < l; i++) {
				curve = curves[i];
				values.push(curve.getValues());
				cuts.push([]);
				addCut(i, 0, curve._segment1._point, true);
				addCut(i, 1, curve._segment2._point, true);
			}
			collisions = CollisionDetection.findCurveBoundsCollisions(values, values, 2 * epsilon);
			const locations = CurveLocation.expand(Curve.getIntersections(curves, null, null, null, null, false, epsilon, collisions));
			for (i = 0, l = locations.length; i < l; i++) {
				const loc = locations[i];
				curve = loc.getCurve();
				addCut(offsets[curve._path._id] + curve.getIndex(), loc.getTime(), loc.getPoint(), false);
			}
			for (i = 0, l = curves.length; i < l; i++) {
				const times = Curve.getReversals(values[i], epsilon);
				for (j = 0, k = times.length; j < k; j++) {
					addCut(i, times[j], Curve.getPoint(values[i], times[j]), false);
				}
			}
			const count = xs.length;
			const parents = new Array(count);
			const order = new Array(count);
			for (i = 0; i < count; i++) parents[i] = order[i] = i;
			function getRoot(i) {
				while (parents[i] !== i) i = parents[i] = parents[parents[i]];
				return i;
			}
			order.sort(function(a, b) {
				return xs[a] - xs[b];
			});
			for (i = 0; i < count; i++) {
				const a = order[i];
				for (j = i + 1; j < count && xs[order[j]] - xs[a] <= epsilon; j++) {
					b = order[j];
					const dx = xs[b] - xs[a];
					const dy = ys[b] - ys[a];
					if (dx * dx + dy * dy <= epsilon * epsilon) parents[getRoot(a)] = getRoot(b);
				}
			}
			let vertexIndices;
			let vertices;
			function createVertices() {
				vertexIndices = {};
				vertices = [];
				for (let i = 0; i < count; i++) {
					const root = getRoot(i);
					const index = vertexIndices[root];
					if (index === undefined) {
						vertexIndices[root] = vertices.length;
						vertices.push({
							x: xs[i],
							y: ys[i],
							isEnd: isEnds[i],
							point: i,
							outgoing: []
						});
					} else if (isEnds[i] && !vertices[index].isEnd) {
						vertices[index] = {
							x: xs[i],
							y: ys[i],
							isEnd: true,
							point: i,
							outgoing: []
						};
					}
				}
			}
			createVertices();
			function getVertex(point) {
				return vertexIndices[getRoot(point)];
			}
			function getPiece(i, cut1, cut2) {
				return getPart(values[i], curves[i].hasHandles(), cut1.time, cut2.time, vertices[getVertex(cut1.point)], vertices[getVertex(cut2.point)]);
			}
			function sortCuts(list) {
				return list.sort(function(a, b) {
					return a.time - b.time;
				});
			}
			let marks;
			function getHotPixels(i) {
				const v = values[i];
				const left = min(v[0], v[2], v[4], v[6]) - 2 * epsilon;
				const top = min(v[1], v[3], v[5], v[7]) - 2 * epsilon;
				const right = max(v[0], v[2], v[4], v[6]) + 2 * epsilon;
				const bottom = max(v[1], v[3], v[5], v[7]) + 2 * epsilon;
				const indices = collisions[i];
				const hotPixels = [];
				for (let j = 0, k = indices.length; j < k; j++) {
					const list = cuts[indices[j]];
					for (let m = 0, n = list.length; m < n; m++) {
						const index = getVertex(list[m].point);
						if (marks[index] !== i) {
							const vertex = vertices[index];
							marks[index] = i;
							if (vertex.x >= left && vertex.x <= right && vertex.y >= top && vertex.y <= bottom) hotPixels.push(index);
						}
					}
				}
				return hotPixels.sort(function(a, b) {
					return a - b;
				});
			}
			function isNearPiece(piece, index, vertex) {
				const v = piece.values;
				const x = vertex.x;
				const y = vertex.y;
				return getVertex(piece.cut1.point) !== index && getVertex(piece.cut2.point) !== index && x >= min(v[0], v[2], v[4], v[6]) - epsilon && x <= max(v[0], v[2], v[4], v[6]) + epsilon && y >= min(v[1], v[3], v[5], v[7]) - epsilon && y <= max(v[1], v[3], v[5], v[7]) + epsilon;
			}
			function addPiece(pieces, i, cut1, cut2) {
				pieces.push({
					values: getPiece(i, cut1, cut2),
					cut1,
					cut2
				});
			}
			function cutAtHotPixels(i) {
				let j;
				let k;
				const candidates = getHotPixels(i);
				if (candidates.length) {
					const list = sortCuts(cuts[i]);
					const pieces = [];
					for (j = 1, k = list.length; j < k; j++) addPiece(pieces, i, list[j - 1], list[j]);
					while (pieces.length) {
						const piece = pieces.pop();
						for (j = 0, k = candidates.length; j < k; j++) {
							const index = candidates[j];
							const vertex = vertices[index];
							if (isNearPiece(piece, index, vertex)) {
								const point = new Point(vertex.x, vertex.y);
								const t = Curve.getNearestTime(piece.values, point);
								if (t > 0 && t < 1 && point.isClose(Curve.getPoint(piece.values, t), epsilon)) {
									const cut1 = piece.cut1;
									const cut2 = piece.cut2;
									const cut = {
										time: curves[i].hasHandles() ? cut1.time + (cut2.time - cut1.time) * t : Curve.getNearestTime(values[i], point),
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
			function mergeShortPieces() {
				let i;
				let l;
				const pieces = [];
				let isMerged = false;
				for (i = 0, l = curves.length; i < l; i++) {
					const list = sortCuts(cuts[i]);
					for (let j = 1, k = list.length; j < k; j++) {
						const cut1 = list[j - 1];
						const cut2 = list[j];
						if (getVertex(cut1.point) !== getVertex(cut2.point)) {
							const v = getPiece(i, cut1, cut2);
							const dx = v[6] - v[0];
							const dy = v[7] - v[1];
							if (dx * dx + dy * dy < 16 * epsilon * epsilon && Curve.getLength(v) < 4 * epsilon) pieces.push([cut1.point, cut2.point]);
						}
					}
				}
				for (i = 0, l = pieces.length; i < l; i++) {
					const root1 = getRoot(pieces[i][0]);
					const root2 = getRoot(pieces[i][1]);
					if (root1 !== root2) {
						parents[root1] = root2;
						isMerged = true;
					}
				}
				if (isMerged) createVertices();
				return isMerged;
			}
			do {
				marks = new Array(vertices.length);
				for (i = 0, l = curves.length; i < l; i++) cutAtHotPixels(i);
			} while (mergeShortPieces());
			const edges = [];
			const edgesByVertex = [];
			function getCoincidence(edge1, edge2) {
				const v1 = edge1.values;
				const v2 = edge2.values;
				const times = [];
				for (let i = 1; i <= 3; i++) {
					const point = Curve.getPoint(v2, i / 4);
					const time = Curve.getNearestTime(v1, point);
					if (!point.isClose(Curve.getPoint(v1, time), epsilon)) return 0;
					times.push(time);
				}
				return times[0] < times[2] ? 1 : -1;
			}
			function addEdge(edge) {
				const first = min(edge.from, edge.to);
				const last = max(edge.from, edge.to);
				const list = edgesByVertex[first] || (edgesByVertex[first] = []);
				for (let i = 0, l = list.length; i < l; i++) {
					const other = list[i];
					const direction = max(other.from, other.to) === last && getCoincidence(other, edge);
					if (direction) {
						for (let j = 0; j < 2; j++) other.windings[j] += direction * edge.windings[j];
						return;
					}
				}
				list.push(edge);
				edges.push(edge);
			}
			for (i = 0, l = curves.length; i < l; i++) {
				list = cuts[i];
				const isStraight = !curves[i].hasHandles();
				let prev = list[0];
				for (j = 1, k = list.length; j < k; j++) {
					const cut = list[j];
					const from = getVertex(prev.point);
					const to = getVertex(cut.point);
					const part = getPiece(i, prev, cut);
					if (from !== to || Curve.getLength(part) >= 4 * epsilon) {
						windings = [0, 0];
						windings[curveOperands[i]] = 1;
						addEdge({
							values: part,
							from,
							to,
							isStraight,
							windings,
							curve: i,
							time1: prev.time,
							time2: cut.time
						});
					}
					prev = cut;
				}
			}
			const halfEdges = [];
			function getPointAt(halfEdge, distance) {
				const v = halfEdge.values;
				const edge = halfEdge.edge;
				const t = distance / edge.length;
				return edge.isStraight ? new Point(v[0] + (v[6] - v[0]) * t, v[1] + (v[7] - v[1]) * t) : Curve.getPoint(v, Curve.getTimeAt(v, distance));
			}
			function getSide(halfEdge1, halfEdge2) {
				const v1 = halfEdge1.values;
				const point = getPointAt(halfEdge2, min(halfEdge1.edge.length, halfEdge2.edge.length) / 2);
				const time = Curve.getNearestTime(v1, point);
				return time > 0 && time < 1 ? Curve.getTangent(v1, time).cross(point.subtract(Curve.getPoint(v1, time))) > 0 ? -1 : 1 : 0;
			}
			function getDirections(v) {
				let i;
				let l;
				const angles = [];
				for (i = 0; i < 6; i += 2) {
					const dx = v[i + 2] - v[i];
					const dy = v[i + 3] - v[i + 1];
					if (dx || dy) angles.push(Math.atan2(dy, dx));
				}
				const first = angles[0];
				let from = 0;
				let to = 0;
				for (i = 1, l = angles.length; i < l; i++) {
					const difference = (angles[i] - first + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
					from = min(from, difference);
					to = max(to, difference);
				}
				return to - from < Math.PI ? {
					start: (first + from + 2 * Math.PI) % (2 * Math.PI),
					width: to - from
				} : null;
			}
			function sortByDirections(outgoing) {
				let j;
				let k;
				let distance = Infinity;
				for (j = 0, k = outgoing.length; j < k; j++) {
					const halfEdge = halfEdges[outgoing[j]];
					const v = halfEdge.values;
					halfEdge.directions = getDirections(v);
					if (!halfEdge.directions) return false;
					distance = min(distance, Math.sqrt((v[6] - v[0]) * (v[6] - v[0]) + (v[7] - v[1]) * (v[7] - v[1])) / 2);
				}
				const sorted = outgoing.slice().sort(function(a, b) {
					return halfEdges[a].directions.start - halfEdges[b].directions.start;
				});
				let gap = Infinity;
				let width = 0;
				for (j = 0, k = sorted.length; j < k; j++) {
					const directions1 = halfEdges[sorted[j]].directions;
					const directions2 = halfEdges[sorted[(j + 1) % k]].directions;
					gap = min(gap, directions2.start - directions1.start - directions1.width + (j + 1 < k ? 0 : 2 * Math.PI));
					width = max(width, directions1.width);
				}
				if (gap > 0 && distance * Math.cos(width / 2) * Math.sin(min(gap, Math.PI / 2)) > 2 * epsilon) {
					for (j = 0, k = sorted.length; j < k; j++) outgoing[j] = sorted[j];
					return true;
				}
				return false;
			}
			for (i = 0, l = edges.length; i < l; i++) {
				edge = edges[i];
				v = edge.values;
				edge.reversed = [
					v[6],
					v[7],
					v[4],
					v[5],
					v[2],
					v[3],
					v[0],
					v[1]
				];
				halfEdges.push({
					edge,
					values: v,
					from: edge.from,
					to: edge.to
				}, {
					edge,
					values: edge.reversed,
					from: edge.to,
					to: edge.from
				});
				vertices[edge.from].outgoing.push(2 * i);
				vertices[edge.to].outgoing.push(2 * i + 1);
			}
			for (i = 0, l = vertices.length; i < l; i++) {
				vertex = vertices[i];
				outgoing = vertex.outgoing;
				if (outgoing.length > 2 && !sortByDirections(outgoing)) {
					let distance = Infinity;
					for (j = 0, k = outgoing.length; j < k; j++) {
						edge = halfEdges[outgoing[j]].edge;
						edge.length = edge.length || Curve.getLength(edge.values);
						distance = min(distance, edge.length / 2);
					}
					for (j = 0, k = outgoing.length; j < k; j++) {
						halfEdge = halfEdges[outgoing[j]];
						point = getPointAt(halfEdge, distance);
						halfEdge.point = point;
						halfEdge.angle = Math.atan2(point.y - vertex.y, point.x - vertex.x);
					}
					outgoing.sort(function(a, b) {
						return halfEdges[a].angle - halfEdges[b].angle;
					});
					let start = -Math.PI;
					let gap = 0;
					for (j = 0, k = outgoing.length; j < k; j++) {
						const angle = halfEdges[outgoing[j]].angle;
						const previous = halfEdges[outgoing[(j || k) - 1]].angle;
						const difference = (angle - previous + 2 * Math.PI) % (2 * Math.PI) || 2 * Math.PI;
						if (difference > gap) {
							gap = difference;
							start = angle;
						}
					}
					for (j = 0, k = outgoing.length; j < k; j++) {
						halfEdge = halfEdges[outgoing[j]];
						halfEdge.angle = (halfEdge.angle - start + 2 * Math.PI) % (2 * Math.PI);
					}
					outgoing.sort(function(a, b) {
						const halfEdge1 = halfEdges[a];
						const halfEdge2 = halfEdges[b];
						return halfEdge1.point.isClose(halfEdge2.point, epsilon) && getSide(halfEdge1, halfEdge2) || halfEdge1.angle - halfEdge2.angle;
					});
				}
				for (j = 0, k = outgoing.length; j < k; j++) halfEdges[outgoing[j]].position = j;
			}
			for (i = 0, l = halfEdges.length; i < l; i++) {
				outgoing = vertices[halfEdges[i].to].outgoing;
				const position = halfEdges[i ^ 1].position;
				halfEdges[i].next = outgoing[(position || outgoing.length) - 1];
			}
			const faces = [];
			for (i = 0, l = halfEdges.length; i < l; i++) {
				if (halfEdges[i].face === undefined) {
					face = {
						halfEdges: [],
						area: 0,
						windings: null,
						component: null
					};
					index = i;
					do {
						halfEdge = halfEdges[index];
						halfEdge.face = face;
						face.halfEdges.push(index);
						face.area += Curve.getArea(halfEdge.values);
						index = halfEdge.next;
					} while (index !== i);
					faces.push(face);
				}
			}
			const components = [];
			const rays = [];
			bounds = [];
			for (i = 0, l = faces.length; i < l; i++) {
				face = faces[i];
				if (!face.component) {
					component = {
						edges: [],
						bounds: [
							Infinity,
							Infinity,
							-Infinity,
							-Infinity
						],
						outside: face
					};
					list = [face];
					face.component = component;
					for (j = 0; j < list.length; j++) {
						indices = list[j].halfEdges;
						if (list[j].area < component.outside.area) component.outside = list[j];
						for (k = 0, n = indices.length; k < n; k++) {
							other = halfEdges[indices[k] ^ 1].face;
							if (!other.component) {
								other.component = component;
								list.push(other);
							}
						}
					}
					vertex = vertices[halfEdges[component.outside.halfEdges[0]].from];
					components.push(component);
					rays.push([
						vertex.x,
						vertex.y,
						Infinity,
						vertex.y
					]);
					bounds.push(component.bounds);
				}
			}
			for (i = 0, l = edges.length; i < l; i++) {
				edge = edges[i];
				v = edge.values;
				component = halfEdges[2 * i].face.component;
				b = component.bounds;
				component.edges.push(edge);
				b[0] = min(b[0], v[0], v[2], v[4], v[6]);
				b[1] = min(b[1], v[1], v[3], v[5], v[7]);
				b[2] = max(b[2], v[0], v[2], v[4], v[6]);
				b[3] = max(b[3], v[1], v[3], v[5], v[7]);
			}
			collisions = CollisionDetection.findBoundsCollisions(rays, bounds, 0, true);
			for (i = 0, l = components.length; i < l; i++) {
				const outside = components[i].outside;
				point = new Point(rays[i][0], rays[i][1]);
				indices = collisions[i];
				windings = [0, 0];
				for (j = 0, k = indices.length; j < k; j++) {
					if (indices[j] !== i) {
						list = components[indices[j]].edges;
						for (m = 0, n = list.length; m < n; m++) {
							edge = list[m];
							const winding = getRayWinding(point, edge.values);
							windings[0] += winding * edge.windings[0];
							windings[1] += winding * edge.windings[1];
						}
					}
				}
				outside.windings = windings;
				const queue = [outside];
				for (j = 0; j < queue.length; j++) {
					face = queue[j];
					indices = face.halfEdges;
					for (k = 0, n = indices.length; k < n; k++) {
						index = indices[k];
						other = halfEdges[index ^ 1].face;
						if (!other.windings) {
							windings = halfEdges[index].edge.windings;
							const sign = index & 1 ? -1 : 1;
							other.windings = [face.windings[0] - sign * windings[0], face.windings[1] - sign * windings[1]];
							queue.push(other);
						}
					}
				}
			}
			return {
				curves,
				values,
				vertices,
				edges,
				halfEdges,
				faces,
				nonZeros,
				epsilon
			};
		}
		function tracePaths(operands, operator) {
			let i;
			let l;
			const graph = createGraph(operands);
			const halfEdges = graph.halfEdges;
			const faces = graph.faces;
			const nonZeros = graph.nonZeros;
			for (i = 0, l = faces.length; i < l; i++) {
				const face = faces[i];
				const windings = face.windings;
				face.isInside = !!operator(nonZeros[0] ? !!windings[0] : !!(windings[0] & 1), nonZeros[1] ? !!windings[1] : !!(windings[1] & 1));
			}
			function isBoundary(index) {
				return halfEdges[index].face.isInside && !halfEdges[index ^ 1].face.isInside;
			}
			function getTimes(index) {
				const edge = halfEdges[index].edge;
				return index & 1 ? [edge.time2, edge.time1] : [edge.time1, edge.time2];
			}
			function isContinued(index, next) {
				return halfEdges[index].edge.curve === halfEdges[next].edge.curve && getTimes(index)[1] === getTimes(next)[0];
			}
			const paths = [];
			const isVisited = [];
			for (i = 0, l = halfEdges.length; i < l; i++) {
				if (!isVisited[i] && isBoundary(i)) {
					const contour = [];
					let index = i;
					do {
						isVisited[index] = true;
						contour.push(index);
						index = halfEdges[index].next;
						while (!isBoundary(index)) index = halfEdges[index ^ 1].next;
					} while (index !== i);
					const length = contour.length;
					let start = 0;
					while (start < length && isContinued(contour[(start || length) - 1], contour[start])) start++;
					const segments = [];
					let handleIn = null;
					for (let j = 0; j < length;) {
						const first = contour[(start + j) % length];
						let last = first;
						while (++j < length && isContinued(last, contour[(start + j) % length])) last = contour[(start + j) % length];
						const edge = halfEdges[first].edge;
						const isStraight = edge.isStraight;
						const v = first === last ? halfEdges[first].values : getPart(graph.values[edge.curve], !isStraight, getTimes(first)[0], getTimes(last)[1], graph.vertices[halfEdges[first].from], graph.vertices[halfEdges[last].to]);
						segments.push(new Segment(new Point(v[0], v[1]), handleIn, !isStraight && new Point(v[2] - v[0], v[3] - v[1])));
						handleIn = !isStraight && new Point(v[4] - v[6], v[5] - v[7]);
					}
					if (handleIn) segments[0].setHandleIn(handleIn);
					const path = new Path(Item.NO_INSERT);
					path.setSegments(segments);
					path.setClosed(true);
					if (path.getArea() !== 0) paths.push(path);
				}
			}
			return paths;
		}
		function getOperands(path1, path2) {
			const operands = [preparePath(path1, true)];
			if (path2) operands.push(preparePath(path2, true));
			return operands;
		}
		return {
			statics: { _createGraph: function(path1, path2) {
				return createGraph(getOperands(path1, path2));
			} },
			_getWinding: function(point) {
				return getWinding(point, this.getCurves());
			},
			unite: function(path, options) {
				return traceBoolean(this, path, "unite", options);
			},
			intersect: function(path, options) {
				return traceBoolean(this, path, "intersect", options);
			},
			subtract: function(path, options) {
				return traceBoolean(this, path, "subtract", options);
			},
			exclude: function(path, options) {
				return traceBoolean(this, path, "exclude", options);
			},
			divide: function(path, options) {
				return options && (options.trace == false || options.stroke) ? splitBoolean(this, path, "divide", options) : createResult([this.subtract(path, options), this.intersect(path, options)], true, this, path, options);
			},
			resolveCrossings: function() {
				const children = this._children;
				const paths = tracePaths([closePaths(this.clone(false))], function(inside) {
					return inside;
				});
				const length = paths.length;
				let item;
				if (length > 1 && children) {
					if (paths !== children) this.setChildren(paths);
					item = this;
				} else if (length === 1 && !children) {
					if (paths[0] !== this) this.setSegments(paths[0].removeSegments());
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
				const children = this._children;
				if (children && children.length) {
					this.setChildren(reorientPaths(this.removeChildren(), function(w) {
						return !!(nonZero ? w : w & 1);
					}, clockwise));
				} else if (clockwise !== undefined) {
					this.setClockwise(clockwise);
				}
				return this;
			},
			getInteriorPoint: function() {
				let i;
				let l;
				const bounds = this.getBounds();
				const point = bounds.getCenter(true);
				if (!this.contains(point) || this.getNearestPoint(point).isClose(point, 1e-7)) {
					const curves = this.getCurves();
					const monoCurves = [];
					const ys = [];
					const intercepts = [];
					const roots = [];
					for (i = 0, l = curves.length; i < l; i++) Base.push(monoCurves, Curve.getMonoCurves(curves[i].getValues()));
					for (i = 0, l = monoCurves.length; i < l; i++) ys.push(monoCurves[i][1], monoCurves[i][7]);
					ys.sort(function(a, b) {
						return a - b;
					});
					let y = point.y;
					let below = y;
					let above = y;
					for (i = 0, l = ys.length; i < l && above === y; i++) {
						if (ys[i] <= y) {
							below = ys[i];
						} else {
							above = ys[i];
						}
					}
					y = point.y = (below + above) / 2;
					for (i = 0, l = monoCurves.length; i < l; i++) {
						const mv = monoCurves[i];
						const mo0 = mv[1];
						const mo3 = mv[7];
						if (y > min(mo0, mo3) && y < max(mo0, mo3)) {
							intercepts.push(Curve.solveCubic(mv, 1, y, roots, 0, 1) === 1 ? Curve.getPoint(mv, roots[0]).x : (mv[0] + mv[6]) / 2);
						}
					}
					if (intercepts.length > 1) {
						intercepts.sort(function(a, b) {
							return a - b;
						});
						point.x = (intercepts[0] + intercepts[1]) / 2;
					}
				}
				return point;
			}
		};
	})());
	PathItem.inject(new (function() {
		const abs = Math.abs;
		const clamp = Numerical.clamp;
		const errorThreshold = .1;
		const epsilon = 1e-12;
		const geomEpsilon = 1e-7;
		const penSamples = [];
		for (let i = 0; i <= 32; i++) {
			const phi = (i + .5) * Math.PI / 16;
			penSamples.push({
				phi,
				cos: Math.cos(phi),
				sin: Math.sin(phi)
			});
		}
		function outlineStroke(paths, radius, join, cap, miterLimit) {
			const tolerance = Math.min(errorThreshold, radius / 100);
			const areas = [];
			function addSides(side1, side2, isStrip) {
				let part = new Path({
					segments: side1,
					insert: false
				});
				for (let i = side2.length - 1; i >= 0; i--) part.add(side2[i].reversed());
				part.setClosed(true);
				part = part.unite();
				if (isStrip ? !isThin(part) : !part.isEmpty()) areas.push(part);
			}
			function isThin(part) {
				const half = tolerance / 2;
				if (abs(part.getArea()) > half * part.getLength()) return false;
				const curves = part.getCurves();
				for (let i = 0, l = curves.length; i < l; i++) {
					const curve = curves[i];
					const inside = curve.getPointAtTime(.5).subtract(curve.getNormalAtTime(.5).multiply(half));
					if (part.contains(inside) && part.getNearestPoint(inside).getDistance(inside) > half * .99) return false;
				}
				return true;
			}
			function addPart(v) {
				const curvature = Curve.getCurvature(v, .5);
				if (abs(curvature) * radius > 1) {
					const inner = curvature > 0 ? -radius : radius;
					const evolute = getEvolute(v, inner, tolerance);
					addSides(getOffsetSegments(v, -inner, tolerance), evolute);
					addSides(getOffsetSegments(v, inner, tolerance), evolute);
				} else {
					addSides(getOffsetSegments(v, radius, tolerance), getOffsetSegments(v, -radius, tolerance));
				}
			}
			function addSector(point, normal1, normal2, direction) {
				const sector = new Path({ insert: false });
				sector.moveTo(point);
				sector.lineTo(point.add(normal1));
				sector.arcTo(point.add(direction.normalize(radius)), point.add(normal2));
				sector.closePath();
				areas.push(sector);
			}
			function addPolygon(points) {
				areas.push(new Path({
					segments: points,
					closed: true,
					insert: false
				}));
			}
			function addJoin(point, tangent1, tangent2) {
				let normal1 = new Point(tangent1.y, -tangent1.x).multiply(radius);
				let normal2 = new Point(tangent2.y, -tangent2.x).multiply(radius);
				const angle = normal1.getDirectedAngle(normal2);
				if (!Numerical.isZero(tangent1.cross(tangent2)) || tangent1.dot(tangent2) < 0) {
					if (angle < 0) {
						normal1 = normal1.negate();
						normal2 = normal2.negate();
					}
					const widening = Math.sqrt(tolerance / radius) * 180 / Math.PI * (angle < 0 ? -1 : 1);
					const outer1 = normal1.rotate(-widening);
					const outer2 = normal2.rotate(widening);
					let direction = normal1.add(normal2);
					if (direction.getLength() < geomEpsilon * radius) direction = tangent1;
					if (join === "round") {
						addSector(point, outer1, outer2, direction);
					} else {
						const length = radius / Math.cos(abs(angle) * Math.PI / 360);
						const points = [
							point,
							point.add(outer1),
							point.add(normal1)
						];
						if (join === "miter" && length <= miterLimit * radius) points.push(point.add(direction.normalize(length)));
						addPolygon(points.concat(point.add(normal2), point.add(outer2)));
					}
				}
			}
			function addCap(point, tangent) {
				const normal = new Point(-tangent.y, tangent.x).multiply(radius);
				if (cap === "round") {
					addSector(point, normal, normal.negate(), tangent);
				} else if (cap === "square") {
					const ahead = tangent.multiply(radius);
					addPolygon([
						point.add(normal),
						point.add(normal).add(ahead),
						point.subtract(normal).add(ahead),
						point.subtract(normal)
					]);
				}
			}
			function isSliver(v, t1, t2) {
				return getTurn(v, t1, t2) * radius < tolerance && (abs(Curve.getCurvature(v, (t1 + t2) / 2)) * radius > 1 || Curve.getLength(v, t1, t2) < tolerance);
			}
			function addPath(path) {
				let i;
				let l;
				let j;
				let m;
				let t0;
				const segments = path._segments;
				const closed = path._closed;
				const curves = path.getCurves();
				for (i = 0, l = segments.length; i < l; i++) {
					const segment = segments[i];
					const handleIn = segment._handleIn;
					const handleOut = segment._handleOut;
					if (!handleIn.isZero() && !handleOut.isZero()) {
						const angle = abs(handleOut.getDirectedAngle(handleIn.negate())) * Math.PI / 180;
						const lengthIn = handleIn.getLength();
						const lengthOut = handleOut.getLength();
						if (angle && angle * Math.max(radius, lengthIn, lengthOut) < tolerance) {
							const direction = handleOut.normalize().subtract(handleIn.normalize());
							segment.setHandleIn(direction.normalize(-lengthIn));
							segment.setHandleOut(direction.normalize(lengthOut));
						}
					}
				}
				if (!path.getLength()) {
					if (segments.length && !closed && cap !== "butt") {
						const center = segments[0]._point;
						areas.push(cap === "round" ? new Path.Circle({
							center,
							radius,
							insert: false
						}) : new Path.Rectangle({
							point: center.subtract(radius),
							size: [2 * radius, 2 * radius],
							insert: false
						}));
					}
				} else {
					const ends = [];
					for (i = 0, l = curves.length; i < l; i++) {
						const curve = curves[i];
						if (curve.hasLength(geomEpsilon)) {
							const v = regularize(curve.getValues(), tolerance / 4);
							const reversals = Curve.getReversals(v, tolerance);
							let start = Curve.getTangent(v, 0);
							let end = Curve.getTangent(v, 1);
							if (reversals.length) {
								const points = [new Point(v[0], v[1])];
								for (j = 0, m = reversals.length; j < m; j++) points.push(Curve.getPoint(v, reversals[j]));
								points.push(new Point(v[6], v[7]));
								start = points[1].subtract(points[0]).normalize();
								end = points[points.length - 1].subtract(points[points.length - 2]).normalize();
								for (j = 1, m = points.length; j < m; j++) {
									const p1 = points[j - 1];
									const p2 = points[j];
									addPart([
										p1.x,
										p1.y,
										p1.x,
										p1.y,
										p2.x,
										p2.y,
										p2.x,
										p2.y
									]);
									if (j < m - 1) {
										const tangent = p2.subtract(p1).normalize();
										const normal = new Point(-tangent.y, tangent.x).multiply(radius);
										addSector(p2, normal, normal.negate(), tangent);
										addSector(p2, normal.negate(), normal, tangent.negate());
									}
								}
							} else {
								const times = getCuspTimes(v, radius).concat(1);
								for (j = 0, t0 = 0, m = times.length; j < m; j++) {
									const t = times[j];
									if (t === 1 || !isSliver(v, t0, t) && !isSliver(v, t, times[j + 1])) {
										addPart(Curve.getPart(v, t0, t));
										t0 = t;
									}
								}
							}
							ends.push({
								curve,
								start,
								end
							});
						}
					}
					for (i = 1, l = ends.length; i <= l; i++) {
						const end1 = ends[i - 1];
						const end2 = ends[i % l];
						if (i < l || closed) addJoin(end2.curve._segment1._point, end1.end, end2.start);
					}
					if (!closed && ends.length) {
						const first = ends[0];
						const last = ends[ends.length - 1];
						addCap(first.curve._segment1._point, first.start.negate());
						addCap(last.curve._segment2._point, last.end);
					}
				}
			}
			function addProfilePath(path) {
				let pen;
				let i;
				let l;
				let offset;
				let j;
				let m;
				let start;
				let part;
				let first;
				let last;
				const pens = path._getStrokeProfilePens();
				const getValues = path._getStrokeProfileValues();
				const closed = path._closed;
				const length = path.getLength();
				const curves = path.getCurves();
				const spans = [];
				const ends = [];
				const allParts = [];
				function getPen(offset, after) {
					const values = getValues(offset, after);
					const width = values.width;
					const aspect = values.aspect;
					const angle = values.angle;
					const toRadians = Math.PI / 180;
					const a = radius * width[0];
					return {
						a,
						b: a * aspect[0],
						angle: angle[0] * toRadians,
						da: radius * width[1],
						db: radius * (width[1] * aspect[0] + width[0] * aspect[1]),
						dda: radius * width[2],
						ddb: radius * (width[2] * aspect[0] + 2 * width[1] * aspect[1] + width[0] * aspect[2]),
						dAngle: angle[1] * toRadians,
						ddAngle: angle[2] * toRadians
					};
				}
				function getSpanPen(span, offset) {
					const end = span.next.offset;
					return offset < end ? getPen(Math.max(offset, span.entry.offset), true) : getPen(end, false);
				}
				function getOffset(part, t) {
					return part.offset + part.length * Curve.getLength(part.v, 0, t) / part.curveLength;
				}
				function getTime(part, offset) {
					const start = part.offset;
					return offset <= start ? 0 : offset >= start + part.length ? 1 : Curve.getTimeAt(part.v, (offset - start) * part.curveLength / part.length);
				}
				function getSpan(offset, after) {
					if (closed && !after && !offset) offset = length;
					for (let i = 0, l = spans.length; i < l; i++) {
						const span = spans[i];
						if (after ? offset < span.next.offset : offset <= span.next.offset) return span;
					}
					return spans[spans.length - 1];
				}
				function addPen(point, pen, strips) {
					function getPoint(phi) {
						return new Point(Math.cos(phi), Math.sin(phi));
					}
					if (pen.a > 0 && pen.b > 0) {
						const full = 2 * Math.PI;
						const angles = [];
						const ellipse = new Path({ insert: false });
						(strips || []).forEach(function(strip) {
							;
							[strip.from.phi, strip.to.phi].forEach(function(phi) {
								angles.push((phi % full + full) % full);
							});
						});
						angles.sort(function(a, b) {
							return a - b;
						});
						if (!angles.length) angles.push(0);
						angles.push(angles[0] + full);
						ellipse.moveTo(getPoint(angles[0]));
						for (let i = 1, l = angles.length; i < l; i++) {
							const phi0 = angles[i - 1];
							const sweep = angles[i] - phi0;
							const count = Math.ceil(sweep / (Math.PI / 2) - 1e-9);
							const step = sweep / count;
							if (sweep > geomEpsilon) {
								for (let j = 1; j <= count; j++) {
									ellipse.arcTo(getPoint(phi0 + (j - .5) * step), getPoint(phi0 + j * step));
								}
							}
						}
						ellipse.closePath(geomEpsilon);
						areas.push(ellipse.transform(new Matrix().translate(point).rotate(pen.angle * 180 / Math.PI).scale(pen.a, pen.b)));
					}
				}
				function getAxes(pen) {
					const cos = Math.cos(pen.angle);
					const sin = Math.sin(pen.angle);
					return [new Point(cos, sin), new Point(-sin, cos)];
				}
				function getContacts(part, t, span) {
					let sample;
					let i;
					let l;
					let phi;
					const v = part.v;
					const pen = getSpanPen(span, getOffset(part, t));
					const a = pen.a;
					const b = pen.b;
					const da = pen.da;
					const db = pen.db;
					const dAngle = pen.dAngle;
					const contacts = {
						sides: null,
						strips: []
					};
					if (a > 0) {
						const point = Curve.getPoint(v, t);
						const tangent = Curve.getTangent(v, t);
						const normal = new Point(-tangent.y, tangent.x);
						const curvature = Curve.getCurvature(v, t);
						const axes = getAxes(pen);
						const t1 = tangent.dot(axes[0]);
						const t2 = tangent.dot(axes[1]);
						const dt1 = (dAngle - curvature) * t2;
						const dt2 = (curvature - dAngle) * t1;
						const fcs = function(c, s) {
							return t1 * b * c + t2 * a * s + da * b * c * c + a * db * s * s + dAngle * (a * a - b * b) * s * c;
						};
						const dfcs = function(c, s) {
							return -t1 * b * s + t2 * a * c + 2 * (a * db - da * b) * s * c + dAngle * (a * a - b * b) * (c * c - s * s);
						};
						const f = function(phi) {
							return fcs(Math.cos(phi), Math.sin(phi));
						};
						const df = function(phi) {
							return dfcs(Math.cos(phi), Math.sin(phi));
						};
						const ddf = function(phi) {
							const c = Math.cos(phi);
							const s = Math.sin(phi);
							return -t1 * b * c - t2 * a * s + 2 * (a * db - da * b) * (c * c - s * s) - 4 * dAngle * (a * a - b * b) * s * c;
						};
						const solve = function(f, df, phi0, phi1, f0, f1) {
							const sign = f0 < 0 ? 1 : -1;
							return Numerical.findRoot(function(phi) {
								return sign * f(phi);
							}, function(phi) {
								return sign * df(phi);
							}, (f1 * phi0 - f0 * phi1) / (f1 - f0), phi0, phi1, 32, epsilon);
						};
						sample = penSamples[0];
						let phi0 = sample.phi;
						let f0 = fcs(sample.cos, sample.sin);
						let d0 = dfcs(sample.cos, sample.sin);
						const roots = [];
						const addRoot = function(phi0, phi1, f0, f1) {
							const phi = solve(f, df, phi0, phi1, f0, f1);
							const c = Math.cos(phi);
							const s = Math.sin(phi);
							const dfs = (dt1 * b + t1 * db) * c + (dt2 * a + t2 * da) * s + da * db + pen.dda * b * c * c + a * pen.ddb * s * s + (pen.ddAngle * (a * a - b * b) + 2 * dAngle * (a * da - b * db)) * s * c;
							const dfphi = df(phi);
							const dphi = dfphi ? -dfs / dfphi : 0;
							const side = {
								phi,
								point: point.add(axes[0].multiply(a * c)).add(axes[1].multiply(b * s)),
								derivative: axes[0].multiply(t1 + da * c - (a * dphi + dAngle * b) * s).add(axes[1].multiply(t2 + db * s + (b * dphi + dAngle * a) * c))
							};
							side.distance = side.point.subtract(point).dot(normal);
							roots.push(side);
						};
						for (i = 1, l = penSamples.length; i < l; i++) {
							sample = penSamples[i];
							const phi1 = sample.phi;
							const f1 = fcs(sample.cos, sample.sin);
							const d1 = dfcs(sample.cos, sample.sin);
							if (f0 * f1 <= 0 && f0 !== f1) {
								addRoot(phi0, phi1, f0, f1);
							} else if (d0 * d1 < 0) {
								phi = solve(df, ddf, phi0, phi1, d0, d1);
								const f2 = f(phi);
								if (f2 * f0 < 0) {
									addRoot(phi0, phi, f0, f2);
									addRoot(phi, phi1, f2, f1);
								}
							}
							phi0 = phi1;
							f0 = f1;
							d0 = d1;
						}
						const count = roots.length;
						for (i = 0; i < count; i++) {
							const from = roots[i];
							const to = roots[(i + 1) % count];
							phi = from.phi + ((to.phi - from.phi + 2 * Math.PI) % (2 * Math.PI) || 2 * Math.PI) / 2;
							if (f(phi) > 0) {
								contacts.strips.push({
									from,
									to,
									distance: axes[0].multiply(a * Math.cos(phi)).add(axes[1].multiply(b * Math.sin(phi))).dot(normal)
								});
							}
						}
						contacts.strips.sort(function(a, b) {
							return b.distance - a.distance;
						});
						if (count > 1) {
							roots.sort(function(a, b) {
								return b.distance - a.distance;
							});
							contacts.sides = [roots[0], roots[count - 1]];
						}
					}
					return contacts;
				}
				function getSides(part, t, span) {
					return getContacts(part, t, span).sides;
				}
				function addPiece(part, span, ta, tb) {
					let i;
					let t0;
					let s0;
					let t1;
					let s1;
					let l;
					const v = part.v;
					const turn = abs(getSpanPen(span, getOffset(part, tb)).angle - getSpanPen(span, getOffset(part, ta)).angle) + getTurn(v, ta, tb);
					const count = Math.max(16, Math.ceil(turn * 18 / Math.PI));
					const splits = [[ta, ta], [tb, tb]];
					const cache = {};
					function getStrips(t) {
						return cache[t] || (cache[t] = getContacts(part, t, span).strips);
					}
					function getEnd(t, j, end) {
						const strip = getStrips(t)[j];
						return strip ? strip[end].point : Curve.getPoint(v, t);
					}
					function getMotions(strip) {
						const vector = strip.to.point.subtract(strip.from.point);
						const normal = new Point(-vector.y, vector.x);
						return [strip.from.derivative.dot(normal), strip.to.derivative.dot(normal)];
					}
					function isMoving(side) {
						const point = side[0]._point;
						return side.some(function(segment) {
							const other = segment._point;
							return other.getDistance(point) > tolerance || other.add(segment._handleIn).getDistance(point) > tolerance || other.add(segment._handleOut).getDistance(point) > tolerance;
						});
					}
					function isSame(strips, before) {
						if (strips.length !== before.length) return false;
						for (let i = 0, l = strips.length; i < l; i++) {
							const phi = strips[i].from.phi;
							for (let j = 0; j < l; j++) {
								if (j !== i && getAngle(phi, before[j].from.phi) < getAngle(phi, before[i].from.phi)) return false;
							}
						}
						return true;
					}
					function getAngle(phi1, phi2) {
						const angle = Math.abs(phi1 - phi2) % (2 * Math.PI);
						return Math.min(angle, 2 * Math.PI - angle);
					}
					function isClose(strips, before) {
						return strips.every(function(strip, i) {
							const other = before[i];
							return getAngle(strip.from.phi, other.from.phi) < .35 && getAngle(strip.to.phi, other.to.phi) < .35;
						});
					}
					const samples = [];
					for (i = 0; i < count; i++) samples.push(ta + (tb - ta) * i / count);
					samples.push(tb);
					getCurvatureExtrema(v).concat(getInflections(v)).forEach(function(t) {
						if (t > ta && t < tb) samples.push(t);
					});
					samples.sort(function(a, b) {
						return a - b;
					});
					for (i = 1, t0 = ta, s0 = getStrips(ta); i < samples.length; i++) {
						t1 = samples[i];
						s1 = getStrips(t1);
						if (isSame(s1, s0) && !isClose(s1, s0) && t1 - t0 > 1e-8) {
							samples.splice(i--, 0, (t0 + t1) / 2);
							continue;
						}
						while (!isSame(s1, s0)) {
							let t = t0;
							let u = t1;
							for (let j = 0; j < 40; j++) {
								const middle = (t + u) / 2;
								if (isSame(getStrips(middle), s0)) {
									t = middle;
								} else {
									u = middle;
								}
							}
							splits.push([t, u]);
							addPen(Curve.getPoint(v, t), getSpanPen(span, getOffset(part, t)), getStrips(t).concat(getStrips(u)));
							t0 = u;
							s0 = getStrips(u);
						}
						s0.forEach(function(strip, j) {
							let k;
							const m0 = getMotions(strip);
							const m1 = getMotions(s1[j]);
							for (k = 0; k < 2; k++) {
								if (m0[k] * m1[k] < 0) {
									const t = Numerical.findSignChange(function(t) {
										const strip = getStrips(t)[j];
										return strip ? getMotions(strip)[k] : 0;
									}, t0, t1, m0[k], m1[k], 1e-9);
									splits.push([t, t]);
								}
							}
						});
						t0 = t1;
						s0 = s1;
					}
					splits.sort(function(a, b) {
						return a[0] - b[0];
					});
					for (i = 1, l = splits.length; i < l; i++) {
						t0 = splits[i - 1][1];
						t1 = splits[i][0];
						const strips = t1 - t0 > geomEpsilon ? getStrips((t0 + t1) / 2) : [];
						strips.forEach(function(strip, j) {
							const motions = getMotions(strip);
							const from = fitSide(function(t) {
								return getEnd(t, j, "from");
							}, t0, t1);
							const to = fitSide(function(t) {
								return getEnd(t, j, "to");
							}, t0, t1);
							if (motions[0] * motions[1] < 0 && (isMoving(from) || isMoving(to))) {
								const still = fitSide(function(t) {
									const strip = getStrips(t)[j];
									if (!strip) return Curve.getPoint(v, t);
									const motions = getMotions(strip);
									const point = strip.from.point;
									const factor = clamp(motions[0] / (motions[0] - motions[1]), 0, 1);
									return point.add(strip.to.point.subtract(point).multiply(factor));
								}, t0, t1);
								addSides(from, still, true);
								addSides(to, still, true);
							} else {
								addSides(from, to, true);
							}
						});
					}
				}
				function addPart(part) {
					const start = part.offset;
					const end = start + part.length;
					part.curveLength = Curve.getLength(part.v);
					for (let i = 0, l = spans.length; i < l; i++) {
						const span = spans[i];
						const from = Math.max(span.entry.offset, start);
						const to = Math.min(span.next.offset, end);
						const ta = getTime(part, from);
						const tb = getTime(part, to);
						if (to > from && tb > ta) addPiece(part, span, ta, tb);
					}
				}
				function fitSide(evaluate, t0, t1) {
					const count = 8;
					const segments = [new Segment(evaluate(t0))];
					function fit(t0, t1, p0, p3, depth) {
						let i;
						let prev;
						let point;
						const delta = (t1 - t0) * 1e-5;
						const chord = p3.subtract(p0);
						let tangent0 = evaluate(t0 + delta).subtract(p0);
						let tangent3 = p3.subtract(evaluate(t1 - delta));
						const points = [];
						const times = [];
						let total = 0;
						let gap = 0;
						let index;
						tangent0 = (tangent0.isZero() ? chord : tangent0).normalize();
						tangent3 = (tangent3.isZero() ? chord : tangent3).normalize();
						for (i = 0, prev = p0; i <= count; i++) {
							point = i < count ? evaluate(t0 + (t1 - t0) * (i + 1) / (count + 1)) : p3;
							const distance = point.getDistance(prev);
							total += distance;
							if (distance > gap) {
								gap = distance;
								index = i;
							}
							if (i < count) {
								points.push(point);
								times.push(total);
							}
							prev = point;
						}
						for (i = 0; i < count; i++) times[i] = total ? times[i] / total : 0;
						const length = chord.getLength();
						let handle1;
						let handle2;
						let c;
						let error;
						for (let iteration = 0; iteration < 4; iteration++) {
							let c11 = 0;
							let c12 = 0;
							let c22 = 0;
							let x1 = 0;
							let x2 = 0;
							for (i = 0; i < count; i++) {
								const u = times[i];
								const w = 1 - u;
								const a1 = tangent0.multiply(3 * w * w * u);
								const a2 = tangent3.multiply(-3 * w * u * u);
								const rest = points[i].subtract(p0.multiply(w * w * (w + 3 * u))).subtract(p3.multiply(u * u * (u + 3 * w)));
								c11 += a1.dot(a1);
								c12 += a1.dot(a2);
								c22 += a2.dot(a2);
								x1 += a1.dot(rest);
								x2 += a2.dot(rest);
							}
							const det = c11 * c22 - c12 * c12;
							let alpha = det ? (x1 * c22 - x2 * c12) / det : 0;
							let beta = det ? (c11 * x2 - c12 * x1) / det : 0;
							if (!(alpha > epsilon && beta > epsilon && alpha < 2 * total && beta < 2 * total)) {
								alpha = beta = length / 3;
							}
							handle1 = tangent0.multiply(alpha);
							handle2 = tangent3.multiply(-beta);
							c = [
								p0.x,
								p0.y,
								p0.x + handle1.x,
								p0.y + handle1.y,
								p3.x + handle2.x,
								p3.y + handle2.y,
								p3.x,
								p3.y
							];
							error = 0;
							for (i = 0; i < count; i++) {
								const time = Curve.getNearestTime(c, points[i]);
								error = Math.max(error, points[i].getDistance(Curve.getPoint(c, time)));
								times[i] = time;
							}
							if (error <= tolerance) break;
						}
						for (i = 0; i <= count; i++) {
							point = evaluate(t0 + (t1 - t0) * (i + .5) / (count + 1));
							error = Math.max(error, point.getDistance(Curve.getPoint(c, Curve.getNearestTime(c, point))));
						}
						if (gap > Math.max(total / 2, tolerance)) {
							const from = index ? points[index - 1] : p0;
							const to = index < count ? points[index] : p3;
							point = Curve.getPoint(c, ((index ? times[index - 1] : 0) + (index < count ? times[index] : 1)) / 2);
							error = Math.max(error, Line.getDistance(from.x, from.y, to.x, to.y, point.x, point.y));
						}
						if (error > tolerance && depth < 12) {
							const t = (t0 + t1) / 2;
							point = evaluate(t);
							fit(t0, t, p0, point, depth + 1);
							fit(t, t1, point, p3, depth + 1);
						} else {
							segments[segments.length - 1].setHandleOut(handle1);
							segments.push(new Segment(p3, handle2));
						}
					}
					fit(t0, t1, segments[0]._point, evaluate(t1), 0);
					return segments;
				}
				function addJoin(end1, end2) {
					const point = end2.point;
					const part1 = end1.last;
					const part2 = end2.first;
					const offset = part2.offset;
					const tangent1 = end1.end;
					const tangent2 = end2.start;
					const cross = tangent1.cross(tangent2);
					const span = getSpan(offset, true);
					const pen = getSpanPen(span, offset);
					if (!Numerical.isZero(cross) || tangent1.dot(tangent2) < 0) {
						if (join === "round") {
							addPen(point, pen, getContacts(part1, 1, getSpan(offset, false)).strips.concat(getContacts(part2, 0, span).strips));
						} else {
							const span1 = getSpan(offset, false);
							const k = cross > 0 ? 1 : 0;
							const sides1 = getSides(part1, 1, span1);
							const sides2 = getSides(part2, 0, span);
							if (sides1 && sides2) {
								const widening = Math.sqrt(tolerance / radius);
								const widen = function(side, pen, direction) {
									const axes = getAxes(pen);
									const c = Math.cos(side.phi);
									const s = Math.sin(side.phi);
									const along = axes[0].multiply(-pen.a * s).add(axes[1].multiply(pen.b * c)).dot(side.derivative);
									const phi = side.phi + widening * (along > 0 ? direction : -direction);
									return side.point.add(axes[0].multiply(pen.a * (Math.cos(phi) - c))).add(axes[1].multiply(pen.b * (Math.sin(phi) - s)));
								};
								const side1 = sides1[k].point;
								const side2 = sides2[k].point;
								const direction1 = sides1[k].derivative.normalize();
								const direction2 = sides2[k].derivative.normalize();
								const points = [
									sides1[1 - k].point,
									widen(sides1[k], getSpanPen(span1, part1.offset + part1.length), -1),
									side1
								];
								if (join === "miter") {
									const miter = Line.intersect(side1.x, side1.y, direction1.x, direction1.y, side2.x, side2.y, direction2.x, direction2.y, true, true);
									if (miter && miter.getDistance(point) <= miterLimit * pen.a) points.push(miter);
								}
								addPolygon(points.concat(side2, widen(sides2[k], pen, 1), sides2[1 - k].point));
							}
						}
					}
				}
				function addCap(part, t, tangent) {
					const offset = part.offset + (t ? part.length : 0);
					const span = getSpan(offset, !t);
					const pen = getSpanPen(span, offset);
					if (cap === "round") {
						addPen(Curve.getPoint(part.v, t), pen, getContacts(part, t, span).strips);
					} else if (cap === "square") {
						const sides = getSides(part, t, span);
						if (sides) {
							const axes = getAxes(pen);
							const reach = new Point(pen.a * tangent.dot(axes[0]), pen.b * tangent.dot(axes[1])).getLength();
							const ahead = tangent.multiply(reach);
							const side0 = sides[0].point;
							const side1 = sides[1].point;
							addPolygon([
								side0,
								side0.add(ahead),
								side1.add(ahead),
								side1
							]);
						}
					}
				}
				if (!length) {
					const segments = path._segments;
					if (segments.length && !closed && cap !== "butt") {
						const center = segments[0]._point;
						pen = getPen(0, true);
						const axes = getAxes(pen);
						if (cap === "round") {
							addPen(center, pen);
						} else {
							const x = axes[0].multiply(pen.a);
							const y = axes[1].multiply(pen.b);
							addPolygon([
								center.subtract(x).subtract(y),
								center.add(x).subtract(y),
								center.add(x).add(y),
								center.subtract(x).add(y)
							]);
						}
					}
				} else {
					for (i = 1, l = pens.length; i < l; i++) {
						if (pens[i].offset > pens[i - 1].offset) spans.push({
							entry: pens[i - 1],
							next: pens[i]
						});
					}
					for (i = 0, offset = 0, l = curves.length; i < l; i++) {
						const curve = curves[i];
						const curveLength = curve.getLength();
						if (curve.hasLength(geomEpsilon)) {
							const v = regularize(curve.getValues(), tolerance / 4);
							const reversals = Curve.getReversals(v, tolerance);
							const parts = [];
							if (reversals.length) {
								const points = [new Point(v[0], v[1])];
								for (j = 0, m = reversals.length; j < m; j++) points.push(Curve.getPoint(v, reversals[j]));
								points.push(new Point(v[6], v[7]));
								for (j = 1, start = offset, m = points.length; j < m; j++) {
									const p1 = points[j - 1];
									const p2 = points[j];
									const third = p2.subtract(p1).divide(3);
									const distance = p1.getDistance(p2);
									parts.push({
										v: [
											p1.x,
											p1.y,
											p1.x + third.x,
											p1.y + third.y,
											p2.x - third.x,
											p2.y - third.y,
											p2.x,
											p2.y
										],
										offset: start,
										length: distance
									});
									start += distance;
								}
							} else {
								parts.push({
									v: regularizeCusp(v, tolerance / 4),
									offset,
									length: curveLength
								});
							}
							parts.forEach(addPart);
							for (j = 1, m = parts.length; j < m; j++) {
								part = parts[j];
								start = part.offset;
								const span = getSpan(start);
								addPen(new Point(part.v[0], part.v[1]), getSpanPen(span, start), getContacts(parts[j - 1], 1, span).strips.concat(getContacts(part, 0, span).strips));
							}
							allParts.push.apply(allParts, parts);
							first = parts[0];
							last = parts[parts.length - 1];
							ends.push({
								point: curve._segment1._point,
								first,
								last,
								start: Curve.getTangent(first.v, 0),
								end: Curve.getTangent(last.v, 1)
							});
						}
						offset += curveLength;
					}
					for (i = 0, l = pens.length; i < l; i++) {
						offset = pens[i].offset;
						const isStep = i > 0 && pens[i - 1].offset === offset || i < l - 1 && pens[i + 1].offset === offset;
						if (!isStep && (closed ? offset < length : offset > 0 && offset < length)) {
							pen = getPen(offset, true);
							const before = getPen(offset, false);
							const size = Math.max(pen.a, pen.b);
							const jump = size * (Math.abs(pen.da - before.da) + Math.abs(pen.db - before.db) + size * Math.abs(pen.dAngle - before.dAngle));
							if (jump > geomEpsilon) {
								j = 0;
								while (allParts[j].offset + allParts[j].length <= offset) j++;
								part = allParts[j];
								const t = getTime(part, offset);
								const previous = t ? part : allParts[j - 1] || allParts[allParts.length - 1];
								addPen(Curve.getPoint(part.v, t), pen, getContacts(previous, t || 1, getSpan(offset, false)).strips.concat(getContacts(part, t, getSpan(offset, true)).strips));
							}
						}
					}
					for (i = 1, l = ends.length; i <= l; i++) {
						if (i < l || closed) addJoin(ends[i - 1], ends[i % l]);
					}
					if (!closed && ends.length) {
						first = ends[0];
						last = ends[ends.length - 1];
						addCap(first.first, 0, first.start.negate());
						addCap(last.last, 1, last.end);
					}
				}
			}
			for (let i = 0, l = paths.length; i < l; i++) {
				const path = paths[i];
				if (path._strokeProfile) {
					addProfilePath(path);
				} else {
					addPath(path);
				}
			}
			return areas.length ? areas.length > 1 ? areas[0].unite(areas.slice(1)) : areas[0] : new Path({ insert: false });
		}
		function offsetSide(path, offset, join, miterLimit) {
			let j;
			const radius = abs(offset);
			const outline = outlineStroke([path], radius, join, "butt", miterLimit);
			const first = path.getFirstSegment();
			const last = path.getLastSegment();
			const caps = [[first._point, path.getFirstCurve().getNormalAtTime(0)], [last._point, path.getLastCurve().getNormalAtTime(1)]];
			const tolerance = radius / 1e4;
			const paths = [];
			function isCap(curve) {
				if (!curve.hasHandles()) {
					for (let i = 0; i < 2; i++) {
						const point = caps[i][0];
						const normal = caps[i][1];
						const vector1 = curve._segment1._point.subtract(point);
						const vector2 = curve._segment2._point.subtract(point);
						if (abs(vector1.cross(normal)) < tolerance && abs(vector2.cross(normal)) < tolerance) return true;
					}
				}
				return false;
			}
			function isOnSide(curve) {
				const point = curve.getPointAtTime(.5);
				const location = path.getNearestLocation(point);
				return !isCap(curve) && point.subtract(location.getPoint()).dot(location.getNormal()) * offset > 0;
			}
			function addRun(curves) {
				const segments = [new Segment(curves[0]._segment1._point, null, curves[0]._segment1._handleOut)];
				for (let i = 0, l = curves.length; i < l; i++) {
					const segment = curves[i]._segment2;
					segments.push(new Segment(segment._point, segment._handleIn, i < l - 1 ? segment._handleOut : null));
				}
				const run = new Path({
					segments,
					insert: false
				});
				if (path.getNearestLocation(run.getFirstSegment()._point).getOffset() > path.getNearestLocation(run.getLastSegment()._point).getOffset()) run.reverse();
				paths.push(run);
			}
			const contours = outline._children || [outline];
			for (let i = 0, l = contours.length; i < l; i++) {
				const curves = contours[i].getCurves();
				const count = curves.length;
				const keeps = [];
				let start = -1;
				for (j = 0; j < count; j++) {
					keeps.push(isOnSide(curves[j]));
					if (!keeps[j]) start = j;
				}
				if (count && start === -1) {
					paths.push(contours[i].clone({ insert: false }));
				} else {
					let run = [];
					for (j = 1; j <= count; j++) {
						const index = (start + j) % count;
						if (keeps[index]) {
							run.push(curves[index]);
						} else if (run.length) {
							addRun(run);
							run = [];
						}
					}
				}
			}
			return paths;
		}
		function getTurn(v, t1, t2) {
			const times = [t1].concat(getInflections(v).filter(function(t) {
				return t > t1 && t < t2;
			}), t2);
			let turn = 0;
			for (let i = 1, l = times.length; i < l; i++) {
				turn += abs(Curve.getTangent(v, times[i - 1]).getDirectedAngle(Curve.getTangent(v, times[i])));
			}
			return turn * Math.PI / 180;
		}
		function getCuspTimes(v, radius) {
			const times = getCurvatureExtrema(v).concat(getInflections(v), 0, 1).sort(function(a, b) {
				return a - b;
			});
			const cusps = [];
			function f(t) {
				const curvature = Curve.getCurvature(v, t) * radius;
				return 1 - curvature * curvature;
			}
			for (let i = 1, l = times.length; i < l; i++) {
				const t0 = times[i - 1];
				const t1 = times[i];
				const f0 = f(t0);
				const f1 = f(t1);
				if (f0 * f1 < 0) cusps.push(Numerical.findSignChange(f, t0, t1, f0, f1, epsilon));
			}
			return cusps;
		}
		function getEvoluteAt(v, t) {
			const x0 = v[0];
			const y0 = v[1];
			const cx = 3 * (v[2] - x0);
			const cy = 3 * (v[3] - y0);
			const bx = 3 * (v[4] - v[2]) - cx;
			const by = 3 * (v[5] - v[3]) - cy;
			const ax = v[6] - x0 - cx - bx;
			const ay = v[7] - y0 - cy - by;
			const dx = (3 * ax * t + 2 * bx) * t + cx;
			const dy = (3 * ay * t + 2 * by) * t + cy;
			const ddx = 6 * ax * t + 2 * bx;
			const ddy = 6 * ay * t + 2 * by;
			const cross = dx * ddy - dy * ddx;
			const length2 = dx * dx + dy * dy;
			const speed = 3 * (dx * ddx + dy * ddy) * cross - length2 * (dx * 6 * ay - dy * 6 * ax);
			const perp = new Point(-dy, dx);
			return {
				point: Curve.getPoint(v, t).add(perp.multiply(length2 / cross)),
				derivative: perp.multiply(speed / (cross * cross)),
				speed,
				radius: length2 * Math.sqrt(length2) / cross
			};
		}
		function getCurvatureExtrema(v) {
			const count = 32;
			const times = [];
			function f(t) {
				return getEvoluteAt(v, t).speed;
			}
			for (let i = 1, f0 = f(0); i <= count; i++) {
				const t0 = (i - 1) / count;
				const t1 = i / count;
				const f1 = f(t1);
				if (f0 * f1 < 0) {
					times.push(Numerical.findSignChange(f, t0, t1, f0, f1, epsilon));
				}
				f0 = f1;
			}
			return times;
		}
		function getEvolute(v, inner, tolerance) {
			const c = regularizeCusp(v, tolerance / 4);
			const times = getCurvatureExtrema(c).concat(1);
			let t0 = 0;
			let e0 = evaluate(0);
			const segments = [new Segment(e0.point)];
			function evaluate(t) {
				let e = getEvoluteAt(c, t);
				const distance = inner > 0 ? -e.radius : e.radius;
				if (!(distance >= 0 && distance < abs(inner) - tolerance)) {
					const derivative = Curve.getWeightedTangent(c, t);
					e = {
						point: Curve.getPoint(c, t).add(Curve.getNormal(c, t).multiply(inner)),
						derivative: derivative.multiply(1 + inner * Curve.getCurvature(c, t))
					};
				}
				return e;
			}
			function fit(t0, e0, t1, e1, depth) {
				const tm = (t0 + t1) / 2;
				const em = evaluate(tm);
				const h0 = e0.derivative.multiply((t1 - t0) / 3);
				const h1 = e1.derivative.multiply((t0 - t1) / 3);
				const mid = e0.point.add(e1.point).multiply(.5).add(h0.add(h1).multiply(3 / 8));
				if (depth < 8 && mid.getDistance(em.point) > tolerance / 10) {
					fit(t0, e0, tm, em, depth + 1);
					fit(tm, em, t1, e1, depth + 1);
				} else {
					segments[segments.length - 1].setHandleOut(h0);
					segments.push(new Segment(e1.point, h1));
				}
			}
			for (let i = 0, l = times.length; i < l; i++) {
				const e1 = evaluate(times[i]);
				fit(t0, e0, times[i], e1, 0);
				t0 = times[i];
				e0 = e1;
			}
			return segments;
		}
		function getOffsetSegments(v, offset, tolerance) {
			if (Curve.isStraight(v)) {
				return [new Segment(new Point(v[0], v[1]).add(Curve.getNormal(v, 0).multiply(offset))), new Segment(new Point(v[6], v[7]).add(Curve.getNormal(v, 1).multiply(offset)))];
			} else {
				return offsetCubic(v, -offset, tolerance);
			}
		}
		function offsetCubic(v, d, tolerance) {
			const c = regularizeCusp(v, tolerance / 4);
			const p0 = new Point(c[0], c[1]);
			const p1 = new Point(c[2], c[3]);
			const p2 = new Point(c[4], c[5]);
			const p3 = new Point(c[6], c[7]);
			const q0 = p1.subtract(p0).multiply(3);
			const q1 = p2.subtract(p1).multiply(3);
			const q2 = p3.subtract(p2).multiply(3);
			const q1xq0 = q1.cross(q0);
			const q2xq0 = q2.cross(q0);
			const q2xq1 = q2.cross(q1);
			const c0 = 2 * d * q1xq0;
			const c1 = 2 * d * (q2xq0 - 2 * q1xq0);
			const c2 = 2 * d * (q2xq1 - q2xq0 + q1xq0);
			const utan0 = Curve.getTangent(c, 0);
			const utan1 = Curve.getTangent(c, 1);
			const segments = [new Segment(p0.add(getUnitNormal(utan0, d)))];
			const count = 8;
			const weights = [];
			for (let i = 0; i < count; i++) {
				const t = (i + 1) / (count + 1);
				weights.push(3 * (1 - t) * (1 - t) * t);
			}
			function getUnitNormal(utan, length) {
				return new Point(-utan.y, utan.x).multiply(length);
			}
			function evaluate(t) {
				return Curve.getPoint(c, t);
			}
			function derive(t) {
				const u = 1 - t;
				const w0 = u * u;
				const w1 = 2 * t * u;
				const w2 = t * t;
				return new Point(w0 * q0.x + w1 * q1.x + w2 * q2.x, w0 * q0.y + w1 * q1.y + w2 * q2.y);
			}
			function getCusp(t) {
				const ds2 = derive(t).dot(derive(t));
				return ((c2 * t + c1) * t + c0) / (ds2 * Math.sqrt(ds2)) + 1;
			}
			function getEndCusp(tangent, y) {
				const length = Math.max(tangent.getLength(), epsilon);
				return y / (length * length * length) + 1;
			}
			function getOffsetCurve(part, a, b) {
				const s = (part.t1 - part.t0) / 3;
				const start = evaluate(part.t0).add(getUnitNormal(part.utan0, d));
				const end = evaluate(part.t1).add(getUnitNormal(part.utan1, d));
				const l0 = s * derive(part.t0).getLength() + a * d;
				const l1 = s * derive(part.t1).getLength() - b * d;
				return [
					start,
					l0 * part.cusp0 > 0 ? start.add(part.utan0.multiply(l0)) : start,
					l1 * part.cusp1 > 0 ? end.subtract(part.utan1.multiply(l1)) : end,
					end
				];
			}
			function getError(part, points, ts) {
				let error = 0;
				const normals = [];
				const vectors = [];
				const x0 = points[0].x;
				const y0 = points[0].y;
				const x1 = points[1].x;
				const y1 = points[1].y;
				const x2 = points[2].x;
				const y2 = points[2].y;
				const x3 = points[3].x;
				const y3 = points[3].y;
				const sign = part.cusp0 < 0 ? -1 : 1;
				for (let i = 0; i < count; i++) {
					const ta = (i + 1) / (count + 1);
					const u = 1 - ta;
					const w0 = u * u * u;
					const w1 = 3 * u * u * ta;
					const w2 = 3 * u * ta * ta;
					const w3 = ta * ta * ta;
					const px = w0 * x0 + w1 * x1 + w2 * x2 + w3 * x3;
					const py = w0 * y0 + w1 * y1 + w2 * y2 + w3 * y3;
					const tx = (x1 - x0) * u * u + (x2 - x1) * 2 * u * ta + (x3 - x2) * ta * ta;
					const ty = (y1 - y0) * u * u + (y2 - y1) * 2 * u * ta + (y3 - y2) * ta * ta;
					let t = ts[i];
					let point = evaluate(t);
					const derivative = derive(t);
					t += (tx * (px - point.x) + ty * (py - point.y)) / (tx * derivative.x + ty * derivative.y);
					t = ts[i] = clamp(t, part.t0, part.t1);
					point = evaluate(t);
					const length = Math.sqrt(tx * tx + ty * ty);
					const nx = -ty / length * sign;
					const ny = tx / length * sign;
					const vx = px - point.x - nx * d;
					const vy = py - point.y - ny * d;
					const squared = vx * vx + vy * vy;
					normals.push(new Point(nx, ny));
					vectors.push(new Point(vx, vy));
					error = Math.max(error, isFinite(squared) ? squared : 0xe8d4a51000);
				}
				return {
					squared: error,
					normals,
					vectors
				};
			}
			function refine(part, a, b, error) {
				const blend = .001;
				let aa = 0;
				let ab = 0;
				let ac = 0;
				let bb = 0;
				let bc = 0;
				for (let i = 0; i < count; i++) {
					const n = error.normals[i];
					const vector = error.vectors[i];
					const cn = vector.dot(n);
					const ct = vector.cross(n);
					const an = weights[i] * part.utan0.dot(n);
					const at = weights[i] * part.utan0.cross(n);
					const bn = weights[count - 1 - i] * part.utan1.dot(n);
					const bt = weights[count - 1 - i] * part.utan1.cross(n);
					aa += an * an + blend * at * at;
					ab += an * bn + blend * at * bt;
					ac += an * cn + blend * at * ct;
					bb += bn * bn + blend * bt * bt;
					bc += bn * cn + blend * bt * ct;
				}
				const idet = 1 / (d * (aa * bb - ab * ab));
				return [a - idet * (ac * bb - ab * bc), b - idet * (aa * bc - ac * ab)];
			}
			function getTimeWithTangent(utan0, t0, t1, tangent, force) {
				const z0 = tangent.cross(q0);
				const z1 = tangent.cross(q1);
				const z2 = tangent.cross(q2);
				const roots = [];
				const found = Numerical.solveQuadratic(z2 - 2 * z1 + z0, 2 * (z1 - z0), z0, roots, t0, t1);
				let t = roots[0];
				if (found !== 1) {
					if (!force) return null;
					t = derive(t0).getLength() > derive(t1).getLength() ? t1 : t0;
				}
				const q = derive(t);
				return {
					t,
					utan: found === 1 && q.dot(q) >= epsilon ? q.normalize() : tangent.dot(tangent) >= epsilon ? tangent.normalize() : getUnitNormal(utan0, 1)
				};
			}
			function getSubdivision(part) {
				let i;
				const t = (part.t0 + part.t1) / 2;
				const q = derive(t);
				const x0 = abs(part.utan0.cross(q));
				const x1 = abs(part.utan1.cross(q));
				if (x0 > .1 * x1 && x1 > .1 * x0) return {
					t,
					utan: q.normalize()
				};
				const chord = evaluate(part.t1).subtract(evaluate(part.t0));
				if (chord.cross(part.utan0) * chord.cross(part.utan1) < 0) {
					const split = getTimeWithTangent(part.utan0, part.t0, part.t1, part.utan0.add(part.utan1), false);
					if (split) return split;
				}
				const tangents = [part.utan0];
				const ts = [part.t0];
				const inflections = getInflections(c);
				for (i = 0; i < inflections.length; i++) {
					const ti = inflections[i];
					if (ti > part.t0 && ti < part.t1) {
						tangents.push(derive(ti));
						ts.push(ti);
					}
				}
				tangents.push(part.utan1);
				ts.push(part.t1);
				const angles = [];
				let sum = 0;
				for (i = 0; i < tangents.length - 1; i++) {
					const angle = Math.atan2(tangents[i].cross(tangents[i + 1]), tangents[i].dot(tangents[i + 1]));
					sum += abs(angle);
					angles.push(angle);
				}
				let target = sum / 2;
				let j = 0;
				while (abs(angles[j]) < target) {
					target -= abs(angles[j]);
					j++;
				}
				const base = tangents[j];
				const turn = angles[j] < 0 ? -target : target;
				const tangent = base.rotate(turn * 180 / Math.PI);
				return getTimeWithTangent(j ? base.normalize() : part.utan0, ts[j], ts[j + 1], tangent, true);
			}
			function subdivide(part, t, utan, cuspMinus, cuspPlus) {
				offsetPart({
					t0: part.t0,
					t1: t,
					utan0: part.utan0,
					utan1: utan,
					cusp0: part.cusp0,
					cusp1: cuspMinus,
					depth: part.depth + 1
				});
				offsetPart({
					t0: t,
					t1: part.t1,
					utan0: utan,
					utan1: part.utan1,
					cusp0: cuspPlus,
					cusp1: part.cusp1,
					depth: part.depth + 1
				});
			}
			function offsetPart(part) {
				let i;
				if (part.cusp0 * part.cusp1 < 0) {
					const t = Numerical.findSignChange(getCusp, part.t0, part.t1, part.cusp0, part.cusp1, epsilon);
					subdivide(part, t, derive(t).normalize(), part.cusp0 < 0 ? -epsilon : epsilon, part.cusp1 < 0 ? -epsilon : epsilon);
					return;
				}
				const angle = Math.atan2(part.utan1.cross(part.utan0), part.utan1.dot(part.utan0));
				let a = 2 / 3 / (1 + Math.cos(angle / 2)) * 2 * Math.sin(angle / 2);
				let b = -a;
				const dt = (part.t1 - part.t0) / (count + 1);
				const ts = [];
				for (i = 0; i < count; i++) ts.push(part.t0 + (i + 1) * dt);
				let points = getOffsetCurve(part, a, b);
				let error = getError(part, points, ts);
				const tolerance2 = tolerance * tolerance;
				for (i = 0; i < 2 && error.squared > tolerance2; i++) {
					const refined = refine(part, a, b, error);
					const points2 = getOffsetCurve(part, refined[0], refined[1]);
					const error2 = getError(part, points2, ts);
					if (error2.squared >= error.squared) break;
					a = refined[0];
					b = refined[1];
					points = points2;
					error = error2;
				}
				const isShort = points[1].getDistance(points[0]) < tolerance && points[2].getDistance(points[0]) < tolerance && points[3].getDistance(points[0]) < tolerance;
				if (part.depth < 8 && error.squared > tolerance2 && !isShort) {
					const split = getSubdivision(part);
					const cusp = getCusp(split.t);
					subdivide(part, split.t, split.utan, cusp, cusp);
				} else {
					const last = segments[segments.length - 1];
					last.setHandleOut(points[1].subtract(points[0]));
					segments.push(new Segment(points[3], points[2].subtract(points[3])));
				}
			}
			offsetPart({
				t0: 0,
				t1: 1,
				utan0,
				utan1,
				cusp0: getEndCusp(q0, c0),
				cusp1: getEndCusp(q2, c0 + c1 + c2),
				depth: 0
			});
			return segments;
		}
		function getInflections(v) {
			const p0 = new Point(v[0], v[1]);
			const p1 = new Point(v[2], v[3]);
			const p2 = new Point(v[4], v[5]);
			const p3 = new Point(v[6], v[7]);
			const a = p1.subtract(p0);
			const b = p2.subtract(p1).subtract(a);
			const c = p3.subtract(p0).subtract(p2.subtract(p1).multiply(3));
			const roots = [];
			const count = Numerical.solveQuadratic(b.cross(c), a.cross(c), a.cross(b), roots, 0, 1);
			return count > 0 ? roots.slice(0, count) : [];
		}
		function regularize(v, dimension) {
			const p0 = new Point(v[0], v[1]);
			let p1 = new Point(v[2], v[3]);
			let p2 = new Point(v[4], v[5]);
			const p3 = new Point(v[6], v[7]);
			const handle1 = p1.subtract(p0);
			const handle2 = p2.subtract(p3);
			if (handle1.getLength() < dimension) {
				if (!handle1.isZero()) {
					p1 = p0.add(handle1.normalize(dimension));
				} else if (p0.getDistance(p2) >= dimension) {
					p1 = p0.add(p2.subtract(p0).normalize(dimension));
				} else {
					p1 = p0.add(p3.subtract(p0).divide(3));
					p2 = p3.add(p0.subtract(p3).divide(3));
				}
			}
			if (handle2.getLength() < dimension) {
				if (!handle2.isZero()) {
					p2 = p3.add(handle2.normalize(dimension));
				} else if (p3.getDistance(p1) >= dimension) {
					p2 = p3.add(p1.subtract(p3).normalize(dimension));
				} else {
					p1 = p0.add(p3.subtract(p0).divide(3));
					p2 = p3.add(p0.subtract(p3).divide(3));
				}
			}
			return [
				p0.x,
				p0.y,
				p1.x,
				p1.y,
				p2.x,
				p2.y,
				p3.x,
				p3.y
			];
		}
		function regularizeCusp(v, dimension) {
			const p0 = new Point(v[0], v[1]);
			let p1 = new Point(v[2], v[3]);
			let p2 = new Point(v[4], v[5]);
			const p3 = new Point(v[6], v[7]);
			const d01 = p1.subtract(p0);
			const d02 = p2.subtract(p0);
			const d03 = p3.subtract(p0);
			const d12 = p2.subtract(p1);
			const d23 = p3.subtract(p2);
			const det012 = d01.cross(d02);
			const det123 = d12.cross(d23);
			const det013 = d01.cross(d03);
			const det023 = d02.cross(d03);
			if (det012 * det123 > 0 && det012 * det013 < 0 && det012 * det023 < 0) {
				const q0 = d01.multiply(3);
				const q1 = d12.multiply(3);
				const q2 = d23.multiply(3);
				const t = Curve.getNearestTime([
					q0.x,
					q0.y,
					q0.x + (q1.x - q0.x) * 2 / 3,
					q0.y + (q1.y - q0.y) * 2 / 3,
					q2.x + (q1.x - q2.x) * 2 / 3,
					q2.y + (q1.y - q2.y) * 2 / 3,
					q2.x,
					q2.y
				], new Point(0, 0));
				const u = 1 - t;
				const q = q0.multiply(u * u).add(q1.multiply(2 * t * u)).add(q2.multiply(t * t));
				const dq = q1.subtract(q0).multiply(2 * u).add(q2.subtract(q1).multiply(2 * t));
				const cross = q.cross(dq);
				const distance2 = q.dot(q);
				if (distance2 * distance2 * distance2 <= cross * dimension * cross * dimension) {
					const a = 3 * det012 + det023 - 2 * det013;
					const b = -3 * det012 + det013;
					const discriminant = b * b - 4 * a * det012;
					const l01 = d01.getLength();
					const l23 = d23.getLength();
					if (discriminant > 0) {
						if (l01 > 2 * dimension) p1 = p1.subtract(d01.multiply(dimension / l01));
						if (l23 > 2 * dimension) p2 = p2.add(d23.multiply(dimension / l23));
					} else {
						p1 = p1.add(d01.multiply(dimension / l01));
						p2 = p2.subtract(d23.multiply(dimension / l23));
					}
				}
			}
			return [
				p0.x,
				p0.y,
				p1.x,
				p1.y,
				p2.x,
				p2.y,
				p3.x,
				p3.y
			];
		}
		function prepare(item) {
			return item.clone({ insert: false }).transform(null, true, true).reduce();
		}
		function getDashes(paths, dashArray, dashOffset) {
			const count = dashArray.length;
			const isDashed = dashArray.some(function(dash) {
				return dash > 0;
			});
			const dashes = [];
			function getDash(i) {
				return dashArray[(i % count + count) % count];
			}
			function addDashes(path) {
				const curves = path.getCurves();
				const length = path.getLength();
				const profile = path._strokeProfile && path._takeStrokeProfile();
				let index = 0;
				let start = 0;
				let from = -dashOffset;
				let j = 0;
				function getLocation(offset) {
					let curve = curves[index];
					while (index < curves.length - 1 && start + curve.getLength() < offset) {
						start += curve.getLength();
						curve = curves[++index];
					}
					return {
						index,
						time: Curve.getTimeAt(curve.getValues(), Math.min(offset - start, curve.getLength())) || 0
					};
				}
				function addDash(from, to) {
					const a = getLocation(from);
					const b = getLocation(to);
					const segments = [];
					for (let i = a.index; i <= b.index; i++) {
						const v = Curve.getPart(curves[i].getValues(), i === a.index ? a.time : 0, i === b.index ? b.time : 1);
						if (segments.length) {
							segments[segments.length - 1].setHandleOut(v[2] - v[0], v[3] - v[1]);
						} else {
							segments.push(new Segment(new Point(v[0], v[1]), null, new Point(v[2] - v[0], v[3] - v[1])));
						}
						segments.push(new Segment(new Point(v[6], v[7]), new Point(v[4] - v[6], v[5] - v[7])));
					}
					const dash = new Path({
						segments,
						insert: false
					});
					if (profile) dash._setStrokeProfilePart(profile, from, to);
					dashes.push(dash);
				}
				while (from > 0) from -= getDash(--j) + getDash(--j);
				while (from < length) {
					const to = from + getDash(j++);
					if (Math.min(to, length) - Math.max(from, 0) > 1e-7) addDash(Math.max(from, 0), Math.min(to, length));
					from = to + getDash(j++);
				}
			}
			for (let i = 0, l = paths.length; i < l; i++) {
				if (isDashed) {
					addDashes(paths[i]);
				} else {
					dashes.push(paths[i]);
				}
			}
			return dashes;
		}
		function createResult(item, result, options) {
			if (Base.pick(options && options.insert, paper.settings.insertItems)) result.insertAbove(item);
			result.copyAttributes(item, true);
			return result;
		}
		return {
			offset: function(distance, options) {
				const join = options && options.join || "miter";
				const miterLimit = options && options.miterLimit || 10;
				const path = prepare(this);
				const paths = path._children || [path];
				let result;
				if (!distance) {
					result = path;
				} else if (this._children || this._closed) {
					const outline = outlineStroke(paths, abs(distance), join, "butt", miterLimit);
					result = path[distance > 0 ? "unite" : "subtract"](outline, { insert: false });
				} else {
					result = new CompoundPath({
						children: path.isEmpty() ? [] : offsetSide(path, distance, join, miterLimit),
						insert: false
					}).reduce();
				}
				return createResult(this, result, options);
			},
			outline: function(options) {
				options = options || {};
				let result;
				if (!this._children && this._matrix.isIdentity() && options.width === undefined && !options.join && !options.cap && !options.miterLimit) {
					result = this._getStrokeOutline().clone({ insert: false });
				} else {
					const path = prepare(this);
					result = outlineStroke(getDashes(path._children || [path], this.getDashArray(), this.getDashOffset()), Base.pick(options.width, this.getStrokeWidth()) / 2, options.join || this.getStrokeJoin(), options.cap || this.getStrokeCap(), options.miterLimit || this.getMiterLimit()).reduce();
				}
				result = createResult(this, result, options);
				result.setFillColor(this.getStrokeColor());
				result.setStrokeColor(null);
				return result;
			},
			dash: function(options) {
				options = options || {};
				const path = prepare(this);
				let result = new Group({
					children: getDashes(path._children || [path], Base.pick(options.dashArray, this.getDashArray()), Base.pick(options.dashOffset, this.getDashOffset())),
					insert: false
				});
				result = createResult(this, result, options);
				result.setDashArray([]);
				return result;
			},
			_getStrokeOutline: function() {
				return this._strokeOutline || (this._strokeOutline = outlineStroke(getDashes([this.clone({ insert: false }).reduce()], this.getDashArray(), this.getDashOffset()), this.getStrokeWidth() / 2, this.getStrokeJoin(), this.getStrokeCap(), this.getMiterLimit()).reduce());
			}
		};
	})());
	const PathFlattener = Base.extend({
		_class: "PathFlattener",
		initialize: function(path, flatness, maxRecursion, ignoreStraight, matrix) {
			const curves = [];
			const parts = [];
			let length = 0;
			const minSpan = 1 / (maxRecursion || 32);
			const segments = path._segments;
			let segment1 = segments[0];
			let segment2;
			function addCurve(segment1, segment2) {
				const curve = Curve.getValues(segment1, segment2, matrix);
				curves.push(curve);
				computeParts(curve, segment1._index, 0, 1);
			}
			function computeParts(curve, index, t1, t2) {
				if (t2 - t1 > minSpan && !(ignoreStraight && Curve.isStraight(curve)) && !Curve.isFlatEnough(curve, flatness || .25)) {
					const halves = Curve.subdivide(curve, .5);
					const tMid = (t1 + t2) / 2;
					computeParts(halves[0], index, t1, tMid);
					computeParts(halves[1], index, tMid, t2);
				} else {
					const dx = curve[6] - curve[0];
					const dy = curve[7] - curve[1];
					const dist = Math.sqrt(dx * dx + dy * dy);
					if (dist > 0) {
						length += dist;
						parts.push({
							offset: length,
							curve,
							index,
							time: t2,
							isStraight: Curve.isStraight(curve)
						});
					}
				}
			}
			for (let i = 1, l = segments.length; i < l; i++) {
				segment2 = segments[i];
				addCurve(segment1, segment2);
				segment1 = segment2;
			}
			if (path._closed) addCurve(segment2 || segment1, segments[0]);
			this.curves = curves;
			this.parts = parts;
			this.length = length;
			this.index = 0;
		},
		_get: function(offset) {
			const parts = this.parts;
			const length = parts.length;
			let i;
			let j = this.index;
			for (;;) {
				i = j;
				if (!j || parts[--j].offset < offset) break;
			}
			for (; i < length; i++) {
				const part = parts[i];
				if (part.offset >= offset) {
					this.index = i;
					const prev = parts[i - 1];
					const prevTime = prev && prev.index === part.index ? prev.time : 0;
					const prevOffset = prev ? prev.offset : 0;
					let factor = (offset - prevOffset) / (part.offset - prevOffset);
					if (part.isStraight) {
						const v = part.curve;
						factor = Curve.getTimeOf(v, new Point(v[0] + (v[6] - v[0]) * factor, v[1] + (v[7] - v[1]) * factor));
					}
					return {
						index: part.index,
						time: prevTime + (part.time - prevTime) * factor
					};
				}
			}
			return {
				index: parts[length - 1].index,
				time: 1
			};
		}
	}, Base.each(Curve._evaluateMethods, function(name) {
		this[name + "At"] = function(offset) {
			const param = this._get(offset);
			return Curve[name](this.curves[param.index], param.time);
		};
	}, {}));
	const PathFitter = Base.extend({
		initialize: function(segments, closed) {
			let i;
			let prev;
			let l;
			const points = this.points = [];
			for (i = 0, prev, l = segments.length; i < l; i++) {
				const point = segments[i].point;
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
		fit: function(error, tangent1, tangent2) {
			const points = this.points;
			const length = points.length;
			let segments = null;
			if (length > 0) {
				segments = [new Segment(points[0])];
				if (length > 1) {
					this.fitCubic(segments, error, 0, length - 1, tangent1 || points[1].subtract(points[0]), tangent2 || points[length - 2].subtract(points[length - 1]));
					if (this.closed) {
						segments.shift();
						segments.pop();
					}
				}
			}
			return segments;
		},
		fitCubic: function(segments, error, first, last, tangent1, tangent2) {
			const points = this.points;
			if (last - first === 1) {
				const pt1 = points[first];
				const pt2 = points[last];
				const dist = pt1.getDistance(pt2) / 3;
				this.addCurve(segments, [
					pt1,
					pt1.add(tangent1.normalize(dist)),
					pt2.add(tangent2.normalize(dist)),
					pt2
				]);
				return;
			}
			const uPrime = this.chordLengthParameterize(first, last);
			let maxError = Math.max(error, error * error);
			let split;
			let parametersInOrder = true;
			for (let i = 0; i <= 4; i++) {
				const curve = this.generateBezier(first, last, uPrime, tangent1, tangent2);
				const max = this.findMaxError(first, last, curve, uPrime);
				if (max.error < error && parametersInOrder) {
					this.addCurve(segments, curve);
					return;
				}
				split = max.index;
				if (max.error >= maxError) break;
				parametersInOrder = this.reparameterize(first, last, uPrime, curve);
				maxError = max.error;
			}
			const tangentCenter = points[split - 1].subtract(points[split + 1]);
			this.fitCubic(segments, error, first, split, tangent1, tangentCenter);
			this.fitCubic(segments, error, split, last, tangentCenter.negate(), tangent2);
		},
		addCurve: function(segments, curve) {
			const prev = segments[segments.length - 1];
			prev.setHandleOut(curve[1].subtract(curve[0]));
			segments.push(new Segment(curve[3], curve[2].subtract(curve[3])));
		},
		generateBezier: function(first, last, uPrime, tangent1, tangent2) {
			const epsilon = 1e-12;
			const abs = Math.abs;
			const points = this.points;
			const pt1 = points[first];
			const pt2 = points[last];
			const C = [[0, 0], [0, 0]];
			const X = [0, 0];
			for (let i = 0, l = last - first + 1; i < l; i++) {
				const u = uPrime[i];
				const t = 1 - u;
				const b = 3 * u * t;
				const b0 = t * t * t;
				const b1 = b * t;
				const b2 = b * u;
				const b3 = u * u * u;
				const a1 = tangent1.normalize(b1);
				const a2 = tangent2.normalize(b2);
				const tmp = points[first + i].subtract(pt1.multiply(b0 + b1)).subtract(pt2.multiply(b2 + b3));
				C[0][0] += a1.dot(a1);
				C[0][1] += a1.dot(a2);
				C[1][0] = C[0][1];
				C[1][1] += a2.dot(a2);
				X[0] += a1.dot(tmp);
				X[1] += a2.dot(tmp);
			}
			const detC0C1 = C[0][0] * C[1][1] - C[1][0] * C[0][1];
			let alpha1;
			let alpha2;
			if (abs(detC0C1) > epsilon) {
				const detC0X = C[0][0] * X[1] - C[1][0] * X[0];
				const detXC1 = X[0] * C[1][1] - X[1] * C[0][1];
				alpha1 = detXC1 / detC0C1;
				alpha2 = detC0X / detC0C1;
			} else {
				const c0 = C[0][0] + C[0][1];
				const c1 = C[1][0] + C[1][1];
				alpha1 = alpha2 = abs(c0) > epsilon ? X[0] / c0 : abs(c1) > epsilon ? X[1] / c1 : 0;
			}
			const segLength = pt2.getDistance(pt1);
			const eps = epsilon * segLength;
			let handle1;
			let handle2;
			if (alpha1 < eps || alpha2 < eps) {
				alpha1 = alpha2 = segLength / 3;
			} else {
				const line = pt2.subtract(pt1);
				handle1 = tangent1.normalize(alpha1);
				handle2 = tangent2.normalize(alpha2);
				if (handle1.dot(line) - handle2.dot(line) > segLength * segLength) {
					alpha1 = alpha2 = segLength / 3;
					handle1 = handle2 = null;
				}
			}
			return [
				pt1,
				pt1.add(handle1 || tangent1.normalize(alpha1)),
				pt2.add(handle2 || tangent2.normalize(alpha2)),
				pt2
			];
		},
		reparameterize: function(first, last, u, curve) {
			let i;
			let l;
			for (i = first; i <= last; i++) {
				u[i - first] = this.findRoot(curve, this.points[i], u[i - first]);
			}
			for (i = 1, l = u.length; i < l; i++) {
				if (u[i] <= u[i - 1]) return false;
			}
			return true;
		},
		findRoot: function(curve, point, u) {
			let i;
			const curve1 = [];
			const curve2 = [];
			for (i = 0; i <= 2; i++) {
				curve1[i] = curve[i + 1].subtract(curve[i]).multiply(3);
			}
			for (i = 0; i <= 1; i++) {
				curve2[i] = curve1[i + 1].subtract(curve1[i]).multiply(2);
			}
			const pt = this.evaluate(3, curve, u);
			const pt1 = this.evaluate(2, curve1, u);
			const pt2 = this.evaluate(1, curve2, u);
			const diff = pt.subtract(point);
			const df = pt1.dot(pt1) + diff.dot(pt2);
			return Numerical.isMachineZero(df) ? u : u - diff.dot(pt1) / df;
		},
		evaluate: function(degree, curve, t) {
			const tmp = curve.slice();
			for (let i = 1; i <= degree; i++) {
				for (let j = 0; j <= degree - i; j++) {
					tmp[j] = tmp[j].multiply(1 - t).add(tmp[j + 1].multiply(t));
				}
			}
			return tmp[0];
		},
		chordLengthParameterize: function(first, last) {
			let i;
			let m;
			const u = [0];
			for (i = first + 1; i <= last; i++) {
				u[i - first] = u[i - first - 1] + this.points[i].getDistance(this.points[i - 1]);
			}
			for (i = 1, m = last - first; i <= m; i++) {
				u[i] /= u[m];
			}
			return u;
		},
		findMaxError: function(first, last, curve, u) {
			let index = Math.floor((last - first + 1) / 2);
			let maxDist = 0;
			for (let i = first + 1; i < last; i++) {
				const P = this.evaluate(3, curve, u[i - first]);
				const v = P.subtract(this.points[i]);
				const dist = v.x * v.x + v.y * v.y;
				if (dist >= maxDist) {
					maxDist = dist;
					index = i;
				}
			}
			return {
				error: maxDist,
				index
			};
		}
	});
	const TextItem = Item.extend({
		_class: "TextItem",
		_applyMatrix: false,
		_canApplyMatrix: false,
		_serializeFields: {
			content: null,
			orientation: "horizontal"
		},
		_prioritize: [
			"applyMatrix",
			"content",
			"runs"
		],
		_orientation: "horizontal",
		_boundsOptions: { handle: false },
		initialize: function TextItem(arg) {
			this._story = new TextStory([this]);
			const hasProps = arg && Base.isPlainObject(arg) && arg.x === undefined && arg.y === undefined;
			this._initialize(hasProps && arg, !hasProps && Point.read(arguments));
		},
		_serialize: function _serialize(options, dictionary) {
			const json = _serialize.base.call(this, options, dictionary);
			const props = json[1];
			const story = this._story;
			const content = story._content;
			const runs = story._getRuns();
			const paragraphs = story._paragraphs;
			const keys = story._paragraphKeys;
			const itemKeys = story._itemKeys;
			function serialize(json, style, key) {
				const value = style[key];
				if (value !== undefined && !Base.equals(value, style._defaults[key])) json[key] = Base.serialize(value, options, false, dictionary);
			}
			if (runs.length > 1) {
				props.runs = runs.map(function(run) {
					const style = run.style;
					const values = style._values;
					const json = { content: content.slice(run.start, run.end) };
					for (const key in style._defaults) {
						if (key in values && !(key in keys || key in itemKeys)) serialize(json, style, key);
					}
					return json;
				});
				delete props.content;
			}
			if (paragraphs.some(function(style) {
				return !style.equals(paragraphs[0]);
			})) {
				props.paragraphs = paragraphs.map(function(style) {
					const json = {};
					for (const key in keys) serialize(json, style, key);
					return json;
				});
			}
			return json;
		},
		_equals: function(item) {
			const story1 = this._story;
			const story2 = item._story;
			const runs1 = story1._getRuns();
			const runs2 = story2._getRuns();
			const paragraphs1 = story1._paragraphs;
			const paragraphs2 = story2._paragraphs;
			return story1._content === story2._content && runs1.length === runs2.length && runs1.every(function(run, i) {
				const other = runs2[i];
				return run.end === other.end && run.style.equals(other.style);
			}) && paragraphs1.length === paragraphs2.length && paragraphs1.every(function(style, i) {
				return style.equals(paragraphs2[i]);
			});
		},
		_changed: function _changed(flags) {
			_changed.base.call(this, flags);
			if (flags & 136) {
				this._layout = this._fontMetrics = null;
				const next = this.getNextTextItem();
				if (next) next._changed(9);
			}
		},
		copyContent: function copyContent(source) {
			copyContent.base.call(this, source);
			this._story = source._story._clone([this]);
			this._orientation = source._orientation;
			this._changed(521);
		},
		_getStyles: function(style, key) {
			const story = this._story;
			return !(key in story._itemKeys) ? key in story._paragraphKeys ? story._paragraphs : story._runs.map(function(run) {
				return run.style;
			}) : null;
		},
		getOrientation: function() {
			return this._orientation;
		},
		setOrientation: function(orientation) {
			if (orientation !== this._orientation) {
				this._orientation = orientation;
				this._changed(9);
			}
		},
		getTextPath: function() {
			return this._children && this._children[0] || null;
		},
		setTextPath: function(path) {
			this.removeChildren();
			if (path) this.addChild(path);
			this._changed(9);
		},
		getChildren: function() {
			return null;
		},
		getFirstChild: function() {
			return null;
		},
		getLastChild: function() {
			return null;
		},
		_hitTestChildren: function() {
			return null;
		},
		getStory: function() {
			return this._story;
		},
		link: function(next) {
			const story = this._story;
			const other = next._story;
			if (other === story) return false;
			const items = story._items;
			const joined = other._items;
			story._append(other);
			items.splice.apply(items, [items.indexOf(this) + 1, 0].concat(joined));
			for (let i = 0, l = joined.length; i < l; i++) joined[i]._story = story;
			story._changed(521);
			return true;
		},
		isLinked: function() {
			return this._story._items.length > 1;
		},
		unlink: function(which) {
			let start;
			const story = this._story;
			const items = story._items;
			const index = items.indexOf(this);
			which = which || "both";
			if (items.length > 1 && !(which === "before" && index === 0 || which === "after" && index === items.length - 1)) {
				if (which === "both") {
					start = this.getVisibleRange()._start;
					const own = new TextStory([this]);
					own._runs[0].style = new Style(story._getRangeStyles("fontSize", start, start)[0], own);
					items.splice(index, 1);
					this._story = own;
					story._changed(521);
					this._changed(521);
				} else {
					const at = which === "before" ? index : index + 1;
					start = items[at].getVisibleRange()._start;
					const moved = items.splice(at, items.length - at);
					const rest = story._extract(start, moved);
					for (let i = 0, l = moved.length; i < l; i++) moved[i]._story = rest;
					story._changed(521);
					rest._changed(521);
				}
				return true;
			}
			return false;
		},
		getNextTextItem: function() {
			const items = this._story._items;
			return items[items.indexOf(this) + 1] || null;
		},
		getPreviousTextItem: function() {
			const items = this._story._items;
			return items[items.indexOf(this) - 1] || null;
		},
		getVisibleRange: function() {
			const range = this._getVisibleRange();
			return new TextRange(this._story, range[0], range[1]);
		},
		_getVisibleRange: function() {
			this._getLayout();
			return [this._getStart(), this._visibleEnd];
		},
		_getLayout: function() {
			return this._layout || (this._layout = this._layOut());
		},
		_layOut: function() {},
		_getStart: function() {
			const previous = this.getPreviousTextItem();
			return previous ? previous._getVisibleRange()[1] : 0;
		},
		isEmpty: function() {
			return !this._story._content;
		},
		_measure: function(start, end, direction, byLetter) {
			const view = this.getView();
			const story = this._story;
			const content = story._content;
			const runs = story._runs;
			let letters = null;
			let index = 0;
			const pieces = [];
			let total = 0;
			let lineHeight = 0;
			let ascent = 0;
			let descent = 0;
			let group = "";
			let groupWidth = 0;
			let previous = null;
			function advance(piece, text) {
				if (!(previous && previous.font === piece.font && previous.tracking === piece.tracking && previous.scale.equals(piece.scale) && previous.y === piece.y)) {
					group = "";
					groupWidth = 0;
				}
				const before = groupWidth;
				group += text;
				groupWidth = view.getTextWidth(piece.font, [group], piece.tracking, direction) * piece.scale.x;
				return groupWidth - before;
			}
			function add(piece, text, from, to, extra) {
				const shown = piece.capitals ? text.toUpperCase() : text;
				const width = advance(piece, shown) + extra;
				pieces.push(previous = Base.set({}, piece, {
					content: shown,
					start: from,
					end: to,
					x: total,
					width
				}));
				total += width;
			}
			for (let i = 0, l = runs.length, pos = 0; i < l; i++) {
				const run = runs[i];
				const next = pos + run.length;
				const from = Math.max(pos, start);
				const to = Math.min(next, end);
				if (from < to || start === end && from === to && !lineHeight) {
					const style = run.style;
					const piece = this._getPiece(style);
					const kerning = style.getLetterKerning();
					if (byLetter || kerning != null || piece.rotation) {
						letters = letters || story._getLetters();
						while (index < letters.length && letters[index]._start < to) {
							const letter = letters[index++];
							if (letter._start >= from) {
								if (kerning != null) {
									previous = null;
								}
								add(piece, letter.getContent(), letter._start, letter._end, (kerning || 0) / 1e3 * piece.size);
							}
						}
					} else {
						add(piece, content.slice(from, to), from, to, 0);
					}
					lineHeight = Math.max(lineHeight, piece.lineHeight);
					ascent = Math.max(ascent, piece.ascent - piece.y);
					descent = Math.max(descent, piece.descent + piece.y);
				}
				pos = next;
			}
			return {
				pieces,
				start,
				end,
				x: 0,
				y: 0,
				width: total,
				lineHeight,
				ascent,
				descent
			};
		},
		getLines: function() {
			const that = this;
			const story = this._story;
			return this._getLayout().map(function(line) {
				const range = new TextRange(story, line.start, line.end);
				range.baseline = new Line(new Point(line.x, line.y), new Point(line.x + line.width, line.y));
				range.bounds = that._getBox(line, line.x, line.y);
				return range;
			});
		},
		_getPiece: function(style) {
			const size = style._getFontSize();
			const font = style._getCanvasFont();
			const position = style.getBaselinePosition();
			const scale = Point.read([style.getLetterScaling()]);
			const cache = this._fontMetrics || (this._fontMetrics = {});
			const metrics = cache[font] || (cache[font] = this.getView().getFontMetrics(font) || {
				ascent: .75 * size,
				descent: .25 * size
			});
			return {
				style,
				font,
				tracking: style._getCanvasLetterSpacing(),
				size,
				ascent: metrics.ascent * scale.y,
				descent: metrics.descent * scale.y,
				lineHeight: style._getLineHeight(),
				y: -style.getBaselineShift() - (position === "superscript" ? 1 : position === "subscript" ? -1 : 0) * size * style._scriptShift,
				scale,
				rotation: style.getLetterRotation(),
				capitals: style.getCapitals() === "all"
			};
		},
		_getBox: function(entry, x, y) {
			const leading = (entry.lineHeight - entry.ascent - entry.descent) / 2;
			return new Rectangle(x, y - entry.ascent - leading, entry.width, entry.lineHeight);
		},
		_indent: function(paragraph, isFirst, left, right) {
			const isRightToLeft = paragraph.getDirection() === "rtl";
			const start = paragraph.getStartIndent() + (isFirst ? paragraph.getFirstLineIndent() : 0);
			const end = paragraph.getEndIndent();
			return [left + (isRightToLeft ? end : start), right - (isRightToLeft ? start : end)];
		},
		_place: function(line, paragraph, isLast, room) {
			const justification = paragraph.getJustification();
			const justifyLast = paragraph.getJustifyLast();
			const direction = paragraph.getDirection();
			const side = this._getSide(justification === "justify" && isLast && justifyLast !== "all" ? justifyLast : justification, direction);
			const left = room[0];
			const right = room[1];
			if (side === "justify" || side === "all") this._justify(line, right - left, direction);
			if (direction === "rtl") this._mirror(line.pieces, line.width);
			this._shift(line, side === "right" ? right - line.width : side === "center" ? (left + right - line.width) / 2 : left, 0);
		},
		_justify: function(line, width, direction) {
			const pieces = line.pieces;
			const content = this._story._content;
			const spaces = (content.slice(pieces.length ? pieces[0].start : 0, pieces.length ? pieces[pieces.length - 1].end : 0).match(/\s+/g) || []).length;
			if (spaces && width > line.width) {
				const extra = (width - line.width) / spaces;
				let moved = 0;
				const result = [];
				for (let i = 0, l = pieces.length; i < l; i++) {
					const piece = pieces[i];
					const parts = piece.content.split(/(\s+)/);
					let from = piece.start;
					let x = piece.x;
					if (parts.length === 1) {
						result.push(Base.set({}, piece, { x: x + moved }));
					} else {
						for (let j = 0, m = parts.length; j < m; j++) {
							const part = parts[j];
							if (part) {
								const advance = this._measure(from, from + part.length, direction).width;
								if (/^\s+$/.test(part)) {
									moved += extra;
								} else {
									result.push(Base.set({}, piece, {
										content: part,
										start: from,
										end: from + part.length,
										x: x + moved,
										width: advance
									}));
								}
								x += advance;
								from += part.length;
							}
						}
					}
				}
				line.pieces = result;
				line.width = width;
			}
		},
		_mirror: function(pieces, width) {
			for (let i = 0, l = pieces.length; i < l; i++) {
				const piece = pieces[i];
				piece.x = width - piece.x - piece.width;
			}
		},
		_shift: function(line, x, y) {
			const pieces = line.pieces;
			line.x = (line.x || 0) + x;
			line.y += y;
			for (let i = 0, l = pieces.length; i < l; i++) pieces[i].x += x;
		},
		_getSide: function(justification, direction) {
			const isRightToLeft = direction === "rtl";
			return justification === "start" ? isRightToLeft ? "right" : "left" : justification === "end" ? isRightToLeft ? "left" : "right" : justification;
		},
		_draw: function(ctx, param, viewMatrix) {
			if (param.dontFinish || param.clip) {
				const rect = this.getInternalBounds();
				if (!param.dontStart) ctx.beginPath();
				ctx.rect(rect.x, rect.y, rect.width, rect.height);
			} else if (this._story._content) {
				const story = this._story;
				const lines = this._getLayout();
				let paragraph = null;
				const scale = !this._style.getStrokeScaling() && viewMatrix._getMeanScale();
				ctx.textAlign = "left";
				for (let i = 0, l = lines.length; i < l; i++) {
					const line = lines[i];
					const pieces = line.pieces;
					if (!paragraph || line.start > paragraph.end) {
						paragraph = story._getParagraph(line.start);
						const direction = paragraph.style.getDirection() || "ltr";
						if (ctx.direction !== direction) ctx.direction = direction;
					}
					for (let j = 0, m = pieces.length; j < m; j++) {
						const piece = pieces[j];
						const style = piece.style;
						const hasFill = style.hasFill();
						const hasStroke = style.hasStroke();
						const isStrokeFirst = hasStroke && style.getPaintOrder() === "stroke";
						const size = piece.size;
						let x = piece.dx || 0;
						this._setStyles(ctx, param, viewMatrix, null, style);
						if (hasStroke && scale) {
							ctx.lineWidth /= scale;
							ctx.setLineDash(ctx.getLineDash().map(function(dash) {
								return dash / scale;
							}));
							ctx.lineDashOffset /= scale;
						}
						ctx.save();
						ctx.translate(piece.x, line.y + piece.y);
						if (piece.rotation) ctx.rotate(piece.rotation * Math.PI / 180);
						if (hasFill) {
							const thickness = size / 15;
							if (style.getUnderline()) ctx.fillRect(x, size / 8, piece.width, thickness);
							if (style.getStrikethrough()) {
								ctx.fillRect(x, -size * .3, piece.width, thickness);
							}
						}
						ctx.scale(piece.scale.x, piece.scale.y);
						x /= piece.scale.x;
						ctx.font = piece.font;
						ctx.letterSpacing = piece.tracking;
						if (isStrokeFirst) {
							ctx.strokeText(piece.content, x, 0);
							ctx.shadowColor = "rgba(0,0,0,0)";
						}
						if (hasFill) {
							ctx.fillText(piece.content, x, 0);
							ctx.shadowColor = "rgba(0,0,0,0)";
						}
						if (hasStroke && !isStrokeFirst) ctx.strokeText(piece.content, x, 0);
						ctx.restore();
					}
				}
			}
		},
		_hitTestSelf: function(point, options) {
			if (options.fill) {
				const lines = this._getLayout();
				for (let i = 0, l = lines.length; i < l; i++) {
					const line = lines[i];
					const pieces = line.pieces;
					for (let j = 0, m = pieces.length; j < m; j++) {
						const piece = pieces[j];
						const local = point.subtract(piece.x, line.y + piece.y).rotate(-piece.rotation);
						const rect = this._getBox(piece, piece.dx || 0, 0);
						const closest = local.clamp(rect.getTopLeft(true), rect.getBottomRight(true));
						if (piece.style.getFillColor() && local.subtract(closest).divide(options._tolerancePadding).getLength() <= 1) return new HitResult("fill", this);
					}
				}
			}
		},
		getCharacterStyle: "#getStyle",
		setCharacterStyle: "#setStyle",
		getParagraphStyle: "#getStyle",
		setParagraphStyle: "#setStyle"
	});
	TextItem.inject(Base.each([
		"getContent",
		"setContent",
		"replace",
		"range",
		"getRuns",
		"setRuns",
		"getParagraphs",
		"setParagraphs",
		"getWords",
		"getLetters"
	], function(name) {
		this[name] = function() {
			const story = this._story;
			return story[name].apply(story, arguments);
		};
	}, { beans: true }));
	const PointText = TextItem.extend({
		_class: "PointText",
		initialize: function PointText() {
			TextItem.apply(this, arguments);
		},
		getPoint: function() {
			const point = this._matrix.getTranslation();
			return new LinkedPoint(point.x, point.y, this, "setPoint");
		},
		setPoint: function() {
			const point = Point.read(arguments);
			this.translate(point.subtract(this._matrix.getTranslation()));
		},
		_layOut: function() {
			const story = this._story;
			const length = story._content.length;
			const paragraphs = new TextRange(story, this._getStart(), length).getParagraphs();
			const lines = [];
			let y = 0;
			let spaceAfter = 0;
			for (let i = 0, l = paragraphs.length; i < l; i++) {
				const range = paragraphs[i];
				const paragraph = story._getParagraph(range._start).style;
				const line = this._measure(range._start, range._end, paragraph.getDirection());
				if (i > 0) {
					y += line.lineHeight + Math.max(spaceAfter, paragraph.getSpaceBefore());
				}
				spaceAfter = paragraph.getSpaceAfter();
				line.y = y;
				this._place(line, paragraph, true, this._indent(paragraph, true, 0, 0));
				lines.push(line);
			}
			this._visibleEnd = length;
			return lines;
		},
		_getBounds: function(matrix, options) {
			const lines = this._getLayout();
			let rect = new Rectangle();
			let strokeWidth = 0;
			for (let i = 0, l = lines.length; i < l; i++) {
				const line = lines[i];
				const box = this._getBox(line, line.x, line.y);
				rect = i ? rect.unite(box) : box;
				for (let j = 0, m = line.pieces.length; j < m; j++) {
					const style = line.pieces[j].style;
					if (style.hasStroke()) strokeWidth = Math.max(strokeWidth, style.getStrokeWidth());
				}
			}
			if (options.stroke && strokeWidth) rect = rect.expand(strokeWidth);
			return matrix ? matrix._transformBounds(rect, rect) : rect;
		}
	});
	const PathText = TextItem.extend(new (function() {
		const fields = {
			startOffset: 0,
			endOffset: null,
			alignment: "baseline",
			spacing: 0
		};
		return Base.each(fields, function(value, name) {
			const part = Base.capitalize(name);
			const key = "_" + name;
			this[key] = value;
			this["get" + part] = function() {
				return this[key];
			};
			this["set" + part] = function(value) {
				this[key] = value;
				this._changed(9);
			};
		}, {
			_class: "PathText",
			_serializeFields: Base.set({ textPath: null }, fields),
			copyContent: function copyContent(source) {
				copyContent.base.call(this, source);
				for (const name in fields) {
					const key = "_" + name;
					this[key] = source[key];
				}
			}
		});
	})(), {
		initialize: function PathText(path, orientation) {
			const hasProps = Base.isPlainObject(path);
			this._children = [];
			TextItem.call(this, hasProps ? path : null);
			if (!hasProps) {
				this.setTextPath(path);
				if (orientation) this.setOrientation(orientation);
			}
		},
		_layOut: function() {
			let i;
			let l;
			let piece;
			const path = this.getTextPath();
			const story = this._story;
			const start = this._getStart();
			const flatteners = (path ? path._children || [path] : []).map(function(child) {
				return new PathFlattener(child, .25, 32, false, child === path ? path._matrix : path._matrix.appended(child._matrix));
			});
			const lengths = flatteners.map(function(flattener) {
				return flattener.length;
			});
			const length = lengths.reduce(function(sum, length) {
				return sum + length;
			}, 0);
			const from = Math.max(0, Math.min(this._startOffset, length));
			const to = this._endOffset == null ? length : Math.max(from, Math.min(this._endOffset, length));
			const spacing = this._spacing;
			const paragraph = story._getParagraph(start).style;
			const measured = this._measure(start, story._content.length, paragraph.getDirection(), true);
			const letters = measured.pieces;
			const pieces = [];
			let width = 0;
			for (i = 0, l = letters.length; i < l; i++) {
				piece = letters[i];
				if (width + piece.width > to - from) break;
				piece.x = width;
				pieces.push(piece);
				width += piece.width + spacing;
			}
			width -= pieces.length ? spacing : 0;
			if (paragraph.getDirection() === "rtl") this._mirror(pieces, width);
			const side = this._getSide(paragraph.getJustification(), paragraph.getDirection());
			const offset = side === "right" ? to - width : side === "center" ? from + (to - from - width) / 2 : from;
			const alignment = this._alignment;
			const below = alignment === "ascender" ? measured.ascent : alignment === "descender" ? -measured.descent : alignment === "center" ? (measured.ascent - measured.descent) / 2 : 0;
			for (i = 0, l = pieces.length; i < l; i++) {
				piece = pieces[i];
				let middle = offset + piece.x + piece.width / 2;
				let index = 0;
				while (index < lengths.length - 1 && middle > lengths[index]) {
					middle -= lengths[index];
					index++;
				}
				const flattener = flatteners[index];
				const tangent = flattener.getTangentAt(middle).normalize();
				const point = flattener.getPointAt(middle).add(tangent.rotate(90).multiply(below + piece.y));
				piece.x = point.x;
				piece.y = point.y;
				piece.dx = -piece.width / 2;
				piece.rotation += tangent.getAngle();
			}
			const last = pieces[pieces.length - 1];
			this._visibleEnd = last ? last.end : start;
			return [Base.set(measured, {
				pieces,
				end: this._visibleEnd,
				width
			})];
		},
		_getBounds: function(matrix, options) {
			const pieces = this._getLayout()[0].pieces;
			let bounds = null;
			for (let i = 0, l = pieces.length; i < l; i++) {
				const piece = pieces[i];
				let rect = this._getBox(piece, piece.dx, 0);
				const local = new Matrix().translate(piece.x, piece.y).rotate(piece.rotation);
				if (matrix) local.prepend(matrix);
				rect = local._transformBounds(rect, rect);
				bounds = bounds ? bounds.unite(rect) : rect;
			}
			return bounds || new Rectangle();
		}
	});
	const AreaText = TextItem.extend(new (function() {
		const fields = {
			columns: 1,
			rows: 1,
			gutter: 18,
			inset: 0,
			verticalAlign: "top"
		};
		return Base.each(fields, function(value, name) {
			const part = Base.capitalize(name);
			const key = "_" + name;
			this[key] = value;
			this["get" + part] = function() {
				return this[key];
			};
			this["set" + part] = function(value) {
				this[key] = value;
				this._changed(9);
			};
		}, {
			_class: "AreaText",
			_serializeFields: Base.set({ textPath: null }, fields),
			copyContent: function copyContent(source) {
				copyContent.base.call(this, source);
				for (const name in fields) {
					const key = "_" + name;
					this[key] = source[key];
				}
			}
		});
	})(), {
		initialize: function AreaText(area, orientation) {
			const hasProps = Base.isPlainObject(area) && area.width === undefined;
			this._children = [];
			TextItem.call(this, hasProps ? area : null);
			if (!hasProps) {
				this.setTextPath(area instanceof PathItem ? area : new Path.Rectangle({
					rectangle: Rectangle.read([area]),
					insert: false
				}));
				if (orientation) this.setOrientation(orientation);
			}
		},
		_installEvents: function _installEvents(install) {
			_installEvents.base.call(this, install);
			this._layout = null;
		},
		fitHeight: function() {
			const that = this;
			let path = this.getTextPath();
			if (path) {
				const bounds = path.getBounds();
				if (!bounds.height) {
					path = new Path.Rectangle({
						rectangle: new Rectangle(bounds.x, bounds.y, bounds.width, 1),
						insert: false
					});
					this.setTextPath(path);
				}
				const top = bounds.getTopCenter();
				const fits = function(height) {
					path.scale(1, height / path.getBounds().height, top);
					return that._getVisibleRange()[1] === that._story._content.length;
				};
				let low = 0;
				let high = path.getBounds().height;
				let count = 0;
				while (!fits(high) && count++ < 32) {
					low = high;
					high *= 2;
				}
				if (count <= 32) {
					while (high - low > .01) {
						const height = (low + high) / 2;
						if (fits(height)) {
							high = height;
						} else {
							low = height;
						}
					}
					fits(high);
				} else {
					fits(bounds.height || 1);
				}
			}
			return this;
		},
		_getLayout: function _getLayout() {
			const layer = this.getLayer();
			const version = layer && layer._textWrapVersion;
			if (this._textWrapVersion !== version) {
				this._textWrapVersion = version;
				this._layout = null;
			}
			return _getLayout.base.call(this);
		},
		_layOut: function() {
			let r;
			let l;
			let end;
			let getExcess;
			const that = this;
			const story = this._story;
			const content = story._content;
			const regions = this._getRegions();
			const wraps = this._getTextWraps();
			const offsets = regions.map(function() {
				return 0;
			});
			let state;
			const lay = function(getCut) {
				let pos = state.pos;
				let region = state.region;
				let y = state.y;
				const paragraph = story._getParagraph(pos);
				const style = paragraph.style;
				let space = pos === paragraph.start && y !== null ? Math.max(state.spaceAfter, style.getSpaceBefore()) : 0;
				const result = [];
				let isComplete = false;
				while (regions[region]) {
					const bounds = regions[region];
					const next = that._measure(pos, Math.min(pos + 1, paragraph.end), style.getDirection());
					const baseline = y === null ? bounds.top + offsets[region] + next.ascent : y + next.lineHeight + space;
					if (!next.lineHeight || next.lineHeight < 0) break;
					if (baseline + next.descent > bounds.bottom) {
						region++;
						y = null;
						continue;
					}
					const spans = that._getSpans(bounds, baseline, next, wraps);
					if (style.getDirection() === "rtl") spans.reverse();
					for (let i = 0, l = spans.length; i < l && !isComplete; i++) {
						const span = spans[i];
						const line = that._breakLine(pos, paragraph, pos === paragraph.start, span, getCut ? getCut(result.length) : 0, span[1] - span[0] >= bounds.width - 1e-7);
						if (line) {
							line.y = baseline;
							line.region = region;
							result.push(line);
							pos = line.end;
							isComplete = pos === paragraph.end;
						}
					}
					y = baseline;
					space = 0;
					if (isComplete) break;
				}
				return {
					lines: result,
					paragraph: style,
					isComplete,
					state: {
						pos,
						region,
						y,
						spaceAfter: style.getSpaceAfter()
					}
				};
			};
			const search = function(high, precision, isAbove) {
				let low = 0;
				while (high - low > precision) {
					const value = (low + high) / 2;
					if (isAbove(value)) {
						high = value;
					} else {
						low = value;
					}
				}
				return [low, high];
			};
			const keeps = function(attempt, count) {
				return attempt.isComplete && attempt.lines.length === count;
			};
			const balance = function(count, from) {
				const cutFrom = function(cut) {
					return function(index) {
						return index >= from ? cut : 0;
					};
				};
				const widest = regions.reduce(function(width, bounds) {
					return Math.max(width, bounds.width);
				}, 0);
				const cut = search(widest, .5, function(cut) {
					return !keeps(lay(cutFrom(cut)), count);
				})[0];
				return cut > 0 && lay(cutFrom(cut));
			};
			const layAll = function() {
				const layout = [];
				let result;
				let match;
				state = {
					pos: that._getStart(),
					region: 0,
					y: null,
					spaceAfter: 0
				};
				do {
					result = lay();
					const lines = result.lines;
					const count = lines.length;
					const wrap = result.paragraph.getLineWrap();
					if (result.isComplete && count > 1) {
						if (wrap === "balance") {
							result = balance(count, 0) || result;
						} else if (wrap === "pretty" && lines[count - 1].width < lines[count - 2].width / 3) {
							result = balance(count, Math.max(0, count - 4)) || result;
						}
					}
					layout.push.apply(layout, result.lines);
					state = result.state;
					match = result.isComplete && /^(\r\n|\n|\r)/.exec(content.slice(state.pos));
					if (match) state.pos += match[0].length;
				} while (match);
				return layout;
			};
			const getLast = function(layout, region) {
				for (let i = layout.length - 1; i >= 0; i--) {
					const line = layout[i];
					if (line.region === region) {
						return {
							line,
							free: regions[region].bottom - line.y - line.descent
						};
					}
				}
				return null;
			};
			let layout = layAll();
			const align = this._verticalAlign;
			if (align !== "top") {
				for (r = 0, l = regions.length; r < l; r++) {
					const last = getLast(layout, r);
					if (last && last.free > 0) {
						end = last.line.end;
						getExcess = function(offset) {
							offsets[r] = offset;
							const moved = getLast(layAll(), r);
							return moved && moved.line.end === end ? moved.free - (align === "center" ? offset : 0) : null;
						};
						const excess = getExcess(align === "center" ? last.free / 2 : last.free);
						if (excess === null || Math.abs(excess) > .01) {
							offsets[r] = search(last.free, .01, function(offset) {
								const excess = getExcess(offset);
								return excess === null || excess < 0;
							})[0];
						}
						layout = layAll();
					}
				}
			}
			this._visibleEnd = state.pos;
			return layout;
		},
		_getRegions: function() {
			const path = this.getTextPath();
			const regions = [];
			if (path) {
				const bounds = path.getBounds().expand(-2 * this._inset);
				const gutter = this._gutter;
				const rows = Math.max(1, this._rows);
				const columns = Math.max(1, this._columns);
				const width = (bounds.width - gutter * (columns - 1)) / columns;
				const height = (bounds.height - gutter * (rows - 1)) / rows;
				for (let row = 0; row < rows; row++) {
					for (let column = 0; column < columns; column++) {
						regions.push(new Rectangle(bounds.x + column * (width + gutter), bounds.y + row * (height + gutter), width, height));
					}
				}
			}
			return regions;
		},
		_getSpans: function(region, baseline, line, wraps) {
			let wrap;
			let offset;
			let invert;
			const that = this;
			const top = baseline - line.ascent;
			const bottom = baseline + line.descent;
			const middle = (top + bottom) / 2;
			const unite = function(stretches1, stretches2) {
				const all = stretches1.concat(stretches2).sort(function(a, b) {
					return a[0] - b[0];
				});
				const result = [];
				for (let i = 0, l = all.length; i < l; i++) {
					const last = result[result.length - 1];
					const stretch = all[i];
					if (last && stretch[0] <= last[1]) {
						last[1] = Math.max(last[1], stretch[1]);
					} else {
						result.push(stretch.slice());
					}
				}
				return result;
			};
			const intersect = function(stretches1, stretches2) {
				const result = [];
				for (let i = 0, l = stretches1.length; i < l; i++) {
					for (let j = 0, m = stretches2.length; j < m; j++) {
						const left = Math.max(stretches1[i][0], stretches2[j][0]);
						const right = Math.min(stretches1[i][1], stretches2[j][1]);
						if (right > left) result.push([left, right]);
					}
				}
				return result;
			};
			const subtract = function(stretches1, stretches2) {
				return intersect(stretches1, stretches2.reduce(function(outside, stretch) {
					const last = outside.pop();
					return outside.concat([[last[0], stretch[0]], [stretch[1], last[1]]]);
				}, [[-Infinity, Infinity]]));
			};
			const inside = function(paths, y) {
				const stretches = [];
				for (let i = 0, l = paths.length; i < l; i++) {
					const path = paths[i];
					const bounds = path.getBounds();
					const xs = path.getIntersections(new Path.Line({
						from: [bounds.left - 1, y],
						to: [bounds.right + 1, y],
						insert: false
					})).map(function(location) {
						return location.point.x;
					}).sort(function(a, b) {
						return a - b;
					});
					for (let j = 0; j + 1 < xs.length; j += 2) stretches.push([xs[j], xs[j + 1]]);
				}
				return unite(stretches, []);
			};
			let spans = [
				top,
				middle,
				bottom
			].reduce(function(spans, y) {
				return intersect(spans, inside([that.getTextPath()], y));
			}, [[region.left, region.right]]);
			for (let i = 0, l = wraps.length; i < l; i++) {
				wrap = wraps[i];
				offset = wrap.offset;
				invert = wrap.invert;
				const ys = [
					top - offset,
					top,
					middle,
					bottom,
					bottom + offset
				];
				const covered = ys.reduce(function(covered, y) {
					const stretches = inside(wrap.paths, y);
					return covered ? invert ? intersect(covered, stretches) : unite(covered, stretches) : stretches;
				}, null).map(function(stretch) {
					return invert ? [stretch[0] + offset, stretch[1] - offset] : [stretch[0] - offset, stretch[1] + offset];
				});
				spans = invert ? intersect(spans, covered) : subtract(spans, unite(covered, []));
			}
			return spans;
		},
		_getTextWraps: function() {
			const layer = this.getLayer();
			const items = layer && layer._textWrapItems;
			const toText = this.getGlobalMatrix(true).inverted();
			const wraps = [];
			const isShown = function(item) {
				for (; item !== layer; item = item._parent) {
					if (!item._visible) return false;
				}
				return true;
			};
			const getOutline = function(item, paths) {
				const matrix = toText.appended(item._parent.getGlobalMatrix(true));
				if (item instanceof PathItem) {
					const path = item.clone({
						insert: false,
						deep: true
					});
					path.transform(matrix);
					paths.push(path);
				} else if (item instanceof Group) {
					const clipItem = item._getClipItem();
					const children = clipItem ? [clipItem] : item._children;
					for (let i = 0, l = children.length; i < l; i++) {
						if (children[i]._visible) getOutline(children[i], paths);
					}
				} else {
					paths.push(new Path.Rectangle({
						rectangle: item.getBounds(matrix),
						insert: false
					}));
				}
				return paths;
			};
			for (const id in items) {
				const item = items[id];
				if (item !== this && item.isAbove(this) && isShown(item)) {
					wraps.push(Base.set({ paths: getOutline(item, []) }, item._textWrap));
				}
			}
			return wraps;
		},
		_breakLine: function(start, paragraph, isFirst, room, cut, canForce) {
			const that = this;
			const content = this._story._content;
			const style = paragraph.style;
			const direction = style.getDirection();
			const indented = this._indent(style, isFirst, room[0], room[1]);
			const words = /[^\s\u00ad]*\u00ad|\S+\s*|\s+/g;
			const text = content.slice(start, paragraph.end);
			const ends = [];
			let match;
			const measure = function(end) {
				const line = that._measure(start, start + content.slice(start, end).replace(/\s+$/, "").length, direction);
				if (content[end - 1] === "­") {
					const last = line.pieces[line.pieces.length - 1];
					const width = that.getView().getTextWidth(last.font, ["-"], last.tracking, direction) * last.scale.x;
					line.pieces.push(Base.set({}, last, {
						content: "-",
						start: end,
						end,
						x: last.x + last.width,
						width
					}));
					line.width += width;
				}
				return line;
			};
			while (match = words.exec(text)) ends.push(start + match.index + match[0].length);
			const width = indented[1] - indented[0] - cut;
			const fits = function(index) {
				return measure(ends[index]).width <= width;
			};
			let low = -1;
			let high = 0;
			while (high < ends.length && fits(high)) {
				low = high;
				high = 2 * high + 1;
			}
			high = Math.min(high, ends.length);
			while (high - low > 1) {
				const middle = low + high >> 1;
				if (fits(middle)) {
					low = middle;
				} else {
					high = middle;
				}
			}
			let end = low >= 0 ? ends[low] : start;
			if (end === start && ends.length) {
				if (!canForce) return null;
				end = ends[0];
			}
			const line = measure(end);
			this._place(line, style, end === paragraph.end, indented);
			line.end = end;
			return line;
		}
	});
	const TextStory = Base.extend({
		_class: "TextStory",
		beans: true,
		_paragraphKeys: {
			justification: true,
			justifyLast: true,
			justifySpacing: true,
			startIndent: true,
			endIndent: true,
			firstLineIndent: true,
			spaceBefore: true,
			spaceAfter: true,
			hyphenation: true,
			composer: true,
			lineWrap: true,
			tabs: true,
			direction: true
		},
		_itemKeys: {
			fillRule: true,
			strokeScaling: true,
			shadowColor: true,
			shadowBlur: true,
			shadowOffset: true,
			selectedColor: true
		},
		initialize: function TextStory(items) {
			this._content = "";
			this._runs = [{
				length: 0,
				style: new Style(null, this)
			}];
			this._paragraphs = [new Style(null, this)];
			this._items = items || [];
		},
		getTextItems: function() {
			return this._items.slice();
		},
		_clone: function(items) {
			const story = new TextStory(items);
			story._content = this._content;
			story._runs = this._runs.map(function(run) {
				return {
					length: run.length,
					style: new Style(run.style, story)
				};
			});
			story._paragraphs = this._paragraphs.map(function(style) {
				return new Style(style, story);
			});
			return story;
		},
		_append: function(other) {
			const that = this;
			const runs = other._runs.map(function(run) {
				return {
					length: run.length,
					style: new Style(run.style, that)
				};
			});
			this._content += other._content;
			this._runs = this._runs.concat(runs).filter(function(run) {
				return run.length > 0;
			});
			if (!this._runs.length) this._runs = [runs[0]];
			this._paragraphs = this._paragraphs.concat(other._paragraphs.slice(1).map(function(style) {
				return new Style(style, that);
			}));
		},
		_extract: function(start, items) {
			const rest = this._clone(items);
			const content = this._content;
			const paragraph = this._paragraphs[this._countBreaks(content.slice(0, start))];
			rest.replace("", 0, start);
			rest._paragraphs[0] = new Style(paragraph, rest);
			this.replace("", start, content.length);
			return rest;
		},
		_getStyles: function() {},
		_changed: function(flags) {
			const items = this._items;
			for (let i = 0, l = items.length; i < l; i++) items[i]._changed(flags);
		},
		getContent: function() {
			return this._content;
		},
		setContent: function(content) {
			this.replace(content, 0, this._content.length);
		},
		replace: function(content, start, end) {
			if (start && start.start !== undefined) {
				end = start.end;
				start = start.start;
			}
			const old = this._content;
			const length = old.length;
			const runs = this._runs;
			const paragraphs = this._paragraphs;
			content = "" + content;
			start = Math.max(0, Math.min(start, length));
			end = Math.max(start, Math.min(end, length));
			const i = this._split(start);
			const j = this._split(end);
			const source = (i < j ? runs[i] : runs[i - 1] || runs[i]).style;
			runs.splice(i, j - i, {
				length: content.length,
				style: new Style(source, this)
			});
			this._runs = runs.filter(function(run) {
				return run.length > 0;
			});
			if (!this._runs.length) this._runs = [runs[i]];
			const first = this._countBreaks(old.slice(0, start));
			const removed = this._countBreaks(old.slice(start, end));
			const added = this._countBreaks(content);
			const style = paragraphs[first];
			const inserted = [];
			for (let k = 0; k < added; k++) inserted.push(new Style(style, this));
			paragraphs.splice.apply(paragraphs, [first + 1, removed].concat(inserted));
			this._content = old.slice(0, start) + content + old.slice(end);
			this._changed(521);
		},
		_getParagraph: function(pos) {
			const content = this._content;
			const before = content.slice(0, pos);
			const start = /(\r\n|\n|\r)[^\r\n]*$/.exec(before);
			const end = /\r\n|\n|\r/.exec(content.slice(pos));
			return {
				style: this._paragraphs[this._countBreaks(before)],
				start: start ? start.index + start[1].length : 0,
				end: end ? pos + end.index : content.length
			};
		},
		_countBreaks: function(content) {
			const matches = content.match(/\r\n|\n|\r/g);
			return matches ? matches.length : 0;
		},
		_split: function(index) {
			const runs = this._runs;
			for (let i = 0, l = runs.length, start = 0; i < l; i++) {
				const run = runs[i];
				if (start === index) return i;
				if (index < start + run.length) {
					runs.splice(i + 1, 0, {
						length: start + run.length - index,
						style: new Style(run.style, this)
					});
					run.length = index - start;
					return i + 1;
				}
				start += run.length;
			}
			return runs.length;
		},
		_getRangeStyles: function(key, start, end, setting) {
			let i;
			let l;
			let pos;
			const runs = this._runs;
			if (key in this._itemKeys) {
				return [];
			} else if (key in this._paragraphKeys) {
				const content = this._content;
				const first = this._countBreaks(content.slice(0, start));
				const last = this._countBreaks(content.slice(0, Math.max(start, end - 1)));
				return this._paragraphs.slice(first, last + 1);
			} else if (setting) {
				i = this._split(start);
				return runs.slice(i, this._split(end)).map(function(run) {
					return run.style;
				});
			} else {
				const from = start < end ? start : Math.max(0, start - 1);
				const to = start < end ? end : from + 1;
				const styles = [];
				for (i = 0, l = runs.length, pos = 0; i < l; i++) {
					const run = runs[i];
					const next = pos + run.length;
					if (from < next && to > pos) styles.push(run.style);
					pos = next;
				}
				return styles.length ? styles : [runs[0].style];
			}
		},
		range: function(start, end) {
			return new TextRange(this, start, end);
		},
		getRuns: function() {
			const that = this;
			return this._getRuns().map(function(run) {
				return new TextRange(that, run.start, run.end);
			});
		},
		_getRuns: function() {
			const runs = this._runs;
			const joined = [];
			for (let i = 0, l = runs.length, start = 0, end = 0; i < l; i++) {
				const run = runs[i];
				const next = runs[i + 1];
				end += run.length;
				if (!next || !run.style.equals(next.style)) {
					joined.push({
						start,
						end,
						style: run.style
					});
					start = end;
				}
			}
			return joined;
		},
		setRuns: function(runs) {
			const that = this;
			runs = runs.map(function(run) {
				return run instanceof TextRange ? run.toJSON() : run;
			});
			const content = runs.map(function(run) {
				return run.content || "";
			}).join("");
			this.setContent(content);
			this._runs = runs.map(function(run) {
				const style = new Style(that._runs[0].style, that);
				style.set(run);
				return {
					length: (run.content || "").length,
					style
				};
			}).filter(function(run) {
				return run.length > 0;
			});
			if (!this._runs.length) this._runs = [{
				length: 0,
				style: new Style(null, this)
			}];
			this._changed(521);
		},
		getParagraphs: function() {
			const ranges = [];
			const breaks = /\r\n|\n|\r/g;
			const content = this._content;
			let start = 0;
			let match;
			while (match = breaks.exec(content)) {
				ranges.push(new TextRange(this, start, match.index));
				start = match.index + match[0].length;
			}
			ranges.push(new TextRange(this, start, content.length));
			return ranges;
		},
		setParagraphs: function(paragraphs) {
			const styles = this._paragraphs;
			const keys = this._paragraphKeys;
			for (let i = 0, l = Math.min(paragraphs.length, styles.length); i < l; i++) {
				const paragraph = paragraphs[i];
				const style = styles[i];
				for (const key in keys) {
					const value = paragraph[key];
					if (value !== undefined) style[key] = value;
				}
			}
		},
		getWords: function() {
			return this._segment("word", /\S+/g);
		},
		getLetters: function() {
			return this._segment("grapheme", /[\s\S]/g);
		},
		_getLetters: function() {
			if (this._lettersOf !== this._content) {
				this._letters = this.getLetters();
				this._lettersOf = this._content;
			}
			return this._letters;
		},
		_segment: function(granularity, pattern) {
			const content = this._content;
			const ranges = [];
			const Segmenter = typeof Intl !== "undefined" && Intl.Segmenter;
			if (Segmenter) {
				const segments = new Segmenter(undefined, { granularity }).segment(content);
				const iterator = segments[Symbol.iterator]();
				let step;
				while (!(step = iterator.next()).done) {
					const segment = step.value;
					if (granularity !== "word" || segment.isWordLike) {
						ranges.push(new TextRange(this, segment.index, segment.index + segment.segment.length));
					}
				}
			} else {
				let match;
				while (match = pattern.exec(content)) {
					ranges.push(new TextRange(this, match.index, match.index + match[0].length));
				}
			}
			return ranges;
		}
	});
	const TextRange = Base.extend({
		_class: "TextRange",
		beans: true,
		initialize: function TextRange(story, start, end) {
			const length = story._content.length;
			this._story = story;
			this._start = Math.max(0, Math.min(start, length));
			this._end = Math.max(this._start, Math.min(end, length));
			this._style = new Style(null, this);
		},
		getStory: function() {
			return this._story;
		},
		getStart: function() {
			return this._start;
		},
		getEnd: function() {
			return this._end;
		},
		getContent: function() {
			return this._story._content.slice(this._start, this._end);
		},
		getStyle: function() {
			return this._style;
		},
		setStyle: function(style) {
			this._style.set(style);
		},
		_getStyles: function(style, key, setting) {
			return this._story._getRangeStyles(key, this._start, this._end, setting);
		},
		_changed: function(flags) {
			this._story._changed(flags);
		},
		toJSON: function() {
			const style = this._style;
			const defaults = style._defaults;
			const json = {
				start: this._start,
				end: this._end,
				content: this.getContent()
			};
			for (const key in defaults) {
				const value = style[key];
				if (value !== undefined && !Base.equals(value, defaults[key])) json[key] = Base.serialize(value);
			}
			return json;
		},
		toString: function() {
			return this.getContent();
		}
	}, Base.each([
		"Runs",
		"Paragraphs",
		"Words",
		"Letters"
	], function(name) {
		const get = "get" + name;
		this[get] = function() {
			const story = this._story;
			const start = this._start;
			const end = this._end;
			return story[get]().filter(function(range) {
				return range._start < end && range._end > start || range._start === range._end && range._start >= start && range._start <= end;
			}).map(function(range) {
				return new TextRange(story, Math.max(range._start, start), Math.min(range._end, end));
			});
		};
	}, { beans: true }));
	const Color = Base.extend(new (function() {
		const types = {
			gray: ["gray"],
			rgb: [
				"red",
				"green",
				"blue"
			],
			hsb: [
				"hue",
				"saturation",
				"brightness"
			],
			hsl: [
				"hue",
				"saturation",
				"lightness"
			],
			gradient: [
				"gradient",
				"origin",
				"destination",
				"highlight",
				"aspect"
			],
			pattern: ["pattern", "matrix"]
		};
		const componentParsers = {};
		const namedColors = { transparent: [
			0,
			0,
			0,
			0
		] };
		let colorCtx;
		function getCanvasTransform(matrix, strokeMatrix) {
			const inverse = matrix && matrix.inverted();
			return strokeMatrix && inverse ? strokeMatrix.appended(inverse) : strokeMatrix || inverse;
		}
		function transformGradient(components, dest, matrix) {
			const origin = components[1];
			const highlight = components[3];
			let aspect = components[4];
			const along = components[2].subtract(origin);
			const across = along.rotate(90);
			const linear = matrix._shiftless();
			const u = linear._transformPoint(along);
			const start = matrix._transformPoint(origin);
			let vector = u;
			if (!along.isZero()) {
				if (components[0]._radial) {
					const w = linear._transformPoint(across.multiply(aspect));
					const v = w.rotate(-90);
					const p = u.add(v);
					const q = u.subtract(v);
					const pLength = p.getLength();
					const qLength = q.getLength();
					let major = (pLength + qLength) / 2;
					const minor = Math.abs(pLength - qLength) / 2;
					let axis = u.normalize();
					aspect = 1;
					if (Math.min(pLength, qLength) > 1e-12 * major) {
						axis = new Point({
							angle: (p.getAngle() + q.getAngle()) / 2,
							length: 1
						});
						if (Math.abs(axis.cross(u)) > Math.abs(axis.dot(u))) {
							axis = axis.rotate(90);
							aspect = major / minor;
							major = minor;
						} else {
							aspect = minor / major;
						}
						if (axis.dot(u) < 0) axis = axis.negate();
					}
					vector = axis.multiply(major);
				} else {
					const stripe = linear._transformPoint(across);
					const normal = stripe.rotate(90);
					if (!normal.isZero()) {
						vector = normal.multiply(u.dot(normal) / normal.dot(normal));
					}
				}
			}
			dest[1] = (dest[1] || new Point())._set(start.x, start.y, true);
			dest[2] = (dest[2] || new Point())._set(start.x + vector.x, start.y + vector.y, true);
			if (highlight) dest[3] = matrix._transformPoint(highlight, dest[3], true);
			dest[4] = aspect;
			return dest;
		}
		function getEllipseMatrix(components) {
			const aspect = components[4];
			if (components[0]._radial && aspect !== 1) {
				const origin = components[1];
				const angle = components[2].subtract(origin).getAngle();
				return new Matrix().translate(origin).rotate(angle).scale(1, aspect).rotate(-angle).translate(origin.negate());
			}
		}
		function fromCSS(string) {
			let i;
			let value;
			let l;
			let match = string.match(/^#([\da-f]{2})([\da-f]{2})([\da-f]{2})([\da-f]{2})?$/i) || string.match(/^#([\da-f])([\da-f])([\da-f])([\da-f])?$/i);
			let type = "rgb";
			let components;
			if (match) {
				const amount = match[4] ? 4 : 3;
				components = new Array(amount);
				for (i = 0; i < amount; i++) {
					value = match[i + 1];
					components[i] = parseInt(value.length == 1 ? value + value : value, 16) / 255;
				}
			} else if (match = string.match(/^(rgb|hsl)a?\((.*)\)$/)) {
				type = match[1];
				components = match[2].trim().split(/[,\s]+/g);
				const isHSL = type === "hsl";
				for (i = 0, l = Math.min(components.length, 4); i < l; i++) {
					const component = components[i];
					value = parseFloat(component);
					if (isHSL) {
						if (i === 0) {
							const unit = component.match(/([a-z]*)$/)[1];
							value *= {
								turn: 360,
								rad: 180 / Math.PI,
								grad: .9
							}[unit] || 1;
						} else if (i < 3) {
							value /= 100;
						}
					} else if (i < 3) {
						value /= /%$/.test(component) ? 100 : 255;
					}
					components[i] = value;
				}
			} else {
				let color = namedColors[string];
				if (!color) {
					if (!colorCtx) {
						colorCtx = CanvasProvider.getContext(1, 1, { willReadFrequently: true });
						if (colorCtx) colorCtx.globalCompositeOperation = "copy";
					}
					if (colorCtx) {
						colorCtx.fillStyle = "rgba(0,0,0,0)";
						colorCtx.fillStyle = string;
						colorCtx.fillRect(0, 0, 1, 1);
						const data = colorCtx.getImageData(0, 0, 1, 1).data;
						color = namedColors[string] = [
							data[0] / 255,
							data[1] / 255,
							data[2] / 255
						];
					} else {
						color = [
							0,
							0,
							0
						];
					}
				}
				components = color.slice();
			}
			return [type, components];
		}
		const hsbIndices = [
			[
				0,
				3,
				1
			],
			[
				2,
				0,
				1
			],
			[
				1,
				0,
				3
			],
			[
				1,
				2,
				0
			],
			[
				3,
				1,
				0
			],
			[
				0,
				1,
				2
			]
		];
		const converters = {
			"rgb-hsb": function(r, g, b) {
				const max = Math.max(r, g, b);
				const min = Math.min(r, g, b);
				const delta = max - min;
				const h = delta === 0 ? 0 : (max == r ? (g - b) / delta + (g < b ? 6 : 0) : max == g ? (b - r) / delta + 2 : (r - g) / delta + 4) * 60;
				return [
					h,
					max === 0 ? 0 : delta / max,
					max
				];
			},
			"hsb-rgb": function(h, s, b) {
				let i;
				h = (h / 60 % 6 + 6) % 6;
				i = Math.floor(h);
				const f = h - i;
				i = hsbIndices[i];
				const v = [
					b,
					b * (1 - s),
					b * (1 - s * f),
					b * (1 - s * (1 - f))
				];
				return [
					v[i[0]],
					v[i[1]],
					v[i[2]]
				];
			},
			"rgb-hsl": function(r, g, b) {
				const max = Math.max(r, g, b);
				const min = Math.min(r, g, b);
				const delta = max - min;
				const achromatic = delta === 0;
				const h = achromatic ? 0 : (max == r ? (g - b) / delta + (g < b ? 6 : 0) : max == g ? (b - r) / delta + 2 : (r - g) / delta + 4) * 60;
				const l = (max + min) / 2;
				const s = achromatic ? 0 : l < .5 ? delta / (max + min) : delta / (2 - max - min);
				return [
					h,
					s,
					l
				];
			},
			"hsl-rgb": function(h, s, l) {
				h = (h / 360 % 1 + 1) % 1;
				if (s === 0) return [
					l,
					l,
					l
				];
				const t3s = [
					h + 1 / 3,
					h,
					h - 1 / 3
				];
				const t2 = l < .5 ? l * (1 + s) : l + s - l * s;
				const t1 = 2 * l - t2;
				const c = [];
				for (let i = 0; i < 3; i++) {
					let t3 = t3s[i];
					if (t3 < 0) t3 += 1;
					if (t3 > 1) t3 -= 1;
					c[i] = 6 * t3 < 1 ? t1 + (t2 - t1) * 6 * t3 : 2 * t3 < 1 ? t2 : 3 * t3 < 2 ? t1 + (t2 - t1) * (2 / 3 - t3) * 6 : t1;
				}
				return c;
			},
			"rgb-gray": function(r, g, b) {
				return [r * .2989 + g * .587 + b * .114];
			},
			"gray-rgb": function(g) {
				return [
					g,
					g,
					g
				];
			},
			"gray-hsb": function(g) {
				return [
					0,
					0,
					g
				];
			},
			"gray-hsl": function(g) {
				return [
					0,
					0,
					g
				];
			},
			"gradient-rgb": function() {
				return [];
			},
			"rgb-gradient": function() {
				return [];
			},
			"pattern-rgb": function() {
				return [];
			},
			"rgb-pattern": function() {
				return [];
			}
		};
		return Base.each(types, function(properties, type) {
			componentParsers[type] = [];
			Base.each(properties, function(name, index) {
				const part = Base.capitalize(name);
				const hasOverlap = /^(hue|saturation)$/.test(name);
				const parser = componentParsers[type][index] = type === "gradient" ? name === "gradient" ? function(value) {
					const current = this._components[0];
					value = Gradient.read(Array.isArray(value) ? value : arguments, 0, { readNull: true });
					if (current !== value) {
						if (current) current._removeOwner(this);
						if (value) value._addOwner(this);
					}
					return value;
				} : name === "aspect" ? function(value) {
					return value == null ? 1 : +value;
				} : function() {
					return Point.read(arguments, 0, {
						readNull: name === "highlight",
						clone: true
					});
				} : type === "pattern" ? name === "pattern" ? function() {
					return PatternDefinition.read(arguments, 0, { readNull: true });
				} : function(value) {
					return value ? new Matrix(value) : new Matrix();
				} : function(value) {
					return value == null || isNaN(value) ? 0 : +value;
				};
				this["get" + part] = function() {
					return this._type === type || hasOverlap && /^hs[bl]$/.test(this._type) ? this._components[index] : this._convert(type)[index];
				};
				this["set" + part] = function(value) {
					if (this._type !== type && !(hasOverlap && /^hs[bl]$/.test(this._type))) {
						this._components = this._convert(type);
						this._properties = types[type];
						this._type = type;
					}
					this._components[index] = parser.call(this, value);
					this._changed();
				};
			}, this);
		}, {
			_class: "Color",
			_readIndex: true,
			initialize: function Color(arg) {
				let i;
				let parsers;
				let l;
				let value;
				let args = arguments;
				const reading = this.__read;
				let read = 0;
				let type;
				let components;
				let alpha;
				let values;
				if (Array.isArray(arg)) {
					args = arg;
					arg = args[0];
				}
				let argType = arg != null && typeof arg;
				if (argType === "string" && arg in types) {
					type = arg;
					arg = args[1];
					if (Array.isArray(arg)) {
						components = arg;
						alpha = args[2];
					} else {
						if (reading) read = 1;
						args = Base.slice(args, 1);
						argType = typeof arg;
					}
				}
				if (!components) {
					values = argType === "number" ? args : argType === "object" && arg.length != null ? arg : null;
					if (values) {
						if (!type) type = values.length >= 3 ? "rgb" : "gray";
						const length = types[type].length;
						alpha = values[length];
						if (reading) {
							read += values === arguments ? length + (alpha != null ? 1 : 0) : 1;
						}
						if (values.length > length) values = Base.slice(values, 0, length);
					} else if (argType === "string") {
						const converted = fromCSS(arg);
						type = converted[0];
						components = converted[1];
						if (components.length === 4) {
							alpha = components[3];
							components.length--;
						}
					} else if (argType === "object") {
						if (arg.constructor === Color) {
							type = arg._type;
							components = arg._components.slice();
							alpha = arg._alpha;
							if (type === "gradient") {
								for (i = 1; i < 4; i++) {
									const point = components[i];
									if (point) components[i] = point.clone();
								}
							} else if (type === "pattern") {
								components[1] = components[1].clone();
							}
						} else if (arg.constructor === Gradient) {
							type = "gradient";
							values = args;
						} else if (arg.constructor === PatternDefinition) {
							type = "pattern";
							values = args;
						} else {
							type = "hue" in arg ? "lightness" in arg ? "hsl" : "hsb" : "gradient" in arg || "stops" in arg || "radial" in arg ? "gradient" : "pattern" in arg ? "pattern" : "gray" in arg ? "gray" : "rgb";
							const properties = types[type];
							parsers = componentParsers[type];
							this._components = components = [];
							for (i = 0, l = properties.length; i < l; i++) {
								value = arg[properties[i]];
								if (value == null && !i && type === "gradient" && "stops" in arg) {
									value = {
										stops: arg.stops,
										radial: arg.radial
									};
								}
								value = parsers[i].call(this, value);
								if (value != null) components[i] = value;
							}
							alpha = arg.alpha;
						}
					}
					if (reading && type) read = 1;
				}
				this._type = type || "rgb";
				if (!components) {
					this._components = components = [];
					parsers = componentParsers[this._type];
					for (i = 0, l = parsers.length; i < l; i++) {
						value = parsers[i].call(this, values && values[i]);
						if (value != null) components[i] = value;
					}
				}
				this._components = components;
				this._properties = types[this._type];
				this._alpha = alpha;
				if (reading) this.__read = read;
				return this;
			},
			set: "#initialize",
			_serialize: function(options, dictionary) {
				const components = this.getComponents();
				const hasAlpha = this._alpha != null;
				if (this._type === "gradient" && components[4] === 1 && !hasAlpha) components.length = components[3] ? 4 : 3;
				if (this._type === "pattern" && components[1].isIdentity() && !hasAlpha) components.length = 1;
				return Base.serialize(/^(gray|rgb)$/.test(this._type) ? components : [this._type].concat(components), options, true, dictionary);
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
				const converter = converters[this._type + "-" + type];
				return this._type === type ? this._components.slice() : converter ? converter.apply(this, this._components) : converters["rgb-" + type].apply(this, converters[this._type + "-rgb"].apply(this, this._components));
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
				const components = this._components.slice();
				if (this._alpha != null) components.push(this._alpha);
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
				const col = Base.isPlainValue(color, true) ? Color.read(arguments) : color;
				return col === this || col && this._class === col._class && this._type === col._type && this.getAlpha() === col.getAlpha() && Base.equals(this._components, col._components) || false;
			},
			toString: function() {
				const properties = this._properties;
				const parts = [];
				const isObject = /^(gradient|pattern)$/.test(this._type);
				const f = Formatter.instance;
				for (let i = 0, l = properties.length; i < l; i++) {
					const value = this._components[i];
					if (value != null) parts.push(properties[i] + ": " + (isObject ? value : f.number(value)));
				}
				if (this._alpha != null) parts.push("alpha: " + f.number(this._alpha));
				return "{ " + parts.join(", ") + " }";
			},
			toCSS: function(hex) {
				let components = this._convert("rgb");
				const alpha = hex || this._alpha == null ? 1 : this._alpha;
				function convert(val) {
					return Math.round((val < 0 ? 0 : val > 1 ? 1 : val) * 255);
				}
				components = [
					convert(components[0]),
					convert(components[1]),
					convert(components[2])
				];
				if (alpha < 1) components.push(alpha < 0 ? 0 : alpha);
				return hex ? "#" + ((1 << 24) + (components[0] << 16) + (components[1] << 8) + components[2]).toString(16).slice(1) : (components.length == 4 ? "rgba(" : "rgb(") + components.join(",") + ")";
			},
			_getCanvasComponents: function(matrix, strokeMatrix) {
				const components = this._components;
				const transform = getCanvasTransform(matrix, strokeMatrix);
				return transform ? transformGradient(components, [components[0]], transform) : components;
			},
			_getEllipseMatrix: function(matrix, strokeMatrix) {
				return this._type === "gradient" && getEllipseMatrix(this._getCanvasComponents(matrix, strokeMatrix)) || null;
			},
			toCanvasStyle: function(ctx, matrix, strokeMatrix, isEllipse) {
				if (this._type === "pattern") {
					const transform = getCanvasTransform(matrix, strokeMatrix);
					const placement = this._components[1];
					return this._components[0]._toCanvasStyle(ctx, transform ? transform.appended(placement) : placement);
				}
				const isCacheable = !(this._type === "gradient" && (strokeMatrix || this._components[4] !== 1));
				if (this._canvasStyle && isCacheable) return this._canvasStyle;
				if (this._type !== "gradient") return this._canvasStyle = this.toCSS();
				const components = this._getCanvasComponents(matrix, strokeMatrix);
				const gradient = components[0];
				const stops = gradient._stops;
				const origin = components[1];
				const destination = components[2];
				let highlight = components[3];
				let canvasGradient;
				if (isEllipse && highlight) {
					highlight = getEllipseMatrix(components)._inverseTransform(highlight);
				}
				if (gradient._radial) {
					const radius = destination.getDistance(origin);
					if (highlight) {
						const vector = highlight.subtract(origin);
						if (vector.getLength() > radius) highlight = origin.add(vector.normalize(radius - .1));
					}
					const start = highlight || origin;
					canvasGradient = ctx.createRadialGradient(start.x, start.y, 0, origin.x, origin.y, radius);
				} else {
					canvasGradient = ctx.createLinearGradient(origin.x, origin.y, destination.x, destination.y);
				}
				for (let i = 0, l = stops.length; i < l; i++) {
					const stop = stops[i];
					const offset = stop._offset;
					canvasGradient.addColorStop(offset == null ? i / (l - 1) : offset, stop._color.toCanvasStyle());
				}
				if (isCacheable) this._canvasStyle = canvasGradient;
				return canvasGradient;
			},
			transform: function(matrix) {
				const components = this._components;
				if (this._type === "gradient") {
					transformGradient(components, components, matrix);
					this._changed();
				} else if (this._type === "pattern") {
					components[1].prepend(matrix);
					this._changed();
				}
			},
			statics: {
				_types: types,
				random: function() {
					const random = Math.random;
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
	})(), new (function() {
		const operators = {
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
				const type = this._type;
				const components1 = this._components;
				const components2 = color._convert(type);
				for (let i = 0, l = components1.length; i < l; i++) components2[i] = operator(components1[i], components2[i]);
				return new Color(type, components2, this._alpha != null ? operator(this._alpha, color.getAlpha()) : null);
			};
		}, {});
	})());
	const Gradient = Base.extend({
		_class: "Gradient",
		initialize: function Gradient(stops, radial) {
			this._id = UID.get();
			if (stops && Base.isPlainObject(stops)) {
				this.set(stops);
				stops = radial = null;
			}
			if (this._stops == null) {
				this.setStops(stops || ["white", "black"]);
			}
			if (this._radial == null) {
				this.setRadial(typeof radial === "string" && radial === "radial" || radial || false);
			}
		},
		_serialize: function(options, dictionary) {
			return dictionary.add(this, function() {
				return Base.serialize([this._stops, this._radial], options, true, dictionary);
			});
		},
		_changed: function() {
			for (let i = 0, l = this._owners && this._owners.length; i < l; i++) {
				this._owners[i]._changed();
			}
		},
		_addOwner: function(color) {
			if (!this._owners) this._owners = [];
			this._owners.push(color);
		},
		_removeOwner: function(color) {
			const index = this._owners ? this._owners.indexOf(color) : -1;
			if (index != -1) {
				this._owners.splice(index, 1);
				if (!this._owners.length) this._owners = undefined;
			}
		},
		clone: function() {
			const stops = [];
			for (let i = 0, l = this._stops.length; i < l; i++) {
				stops[i] = this._stops[i].clone();
			}
			return new Gradient(stops, this._radial);
		},
		getStops: function() {
			return this._stops;
		},
		setStops: function(stops) {
			let i;
			let l;
			if (stops.length < 2) {
				throw new Error("Gradient stop list needs to contain at least two stops.");
			}
			let _stops = this._stops;
			if (_stops) {
				for (i = 0, l = _stops.length; i < l; i++) _stops[i]._owner = undefined;
			}
			_stops = this._stops = GradientStop.readList(stops, 0, { clone: true });
			for (i = 0, l = _stops.length; i < l; i++) _stops[i]._owner = this;
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
			if (gradient === this) return true;
			if (gradient && this._class === gradient._class) {
				const stops1 = this._stops;
				const stops2 = gradient._stops;
				const length = stops1.length;
				if (length === stops2.length) {
					for (let i = 0; i < length; i++) {
						if (!stops1[i].equals(stops2[i])) return false;
					}
					return true;
				}
			}
			return false;
		}
	});
	const GradientStop = Base.extend({
		_class: "GradientStop",
		initialize: function GradientStop(arg0, arg1) {
			let color = arg0;
			let offset = arg1;
			if (typeof arg0 === "object" && arg1 === undefined) {
				if (Array.isArray(arg0) && typeof arg0[0] !== "number") {
					color = arg0[0];
					offset = arg0[1];
				} else if ("color" in arg0 || "offset" in arg0 || "rampPoint" in arg0) {
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
			const color = this._color;
			const offset = this._offset;
			return Base.serialize(offset == null ? [color] : [color, offset], options, true, dictionary);
		},
		_changed: function() {
			if (this._owner) this._owner._changed(129);
		},
		getOffset: function() {
			return this._offset;
		},
		setOffset: function(offset) {
			this._offset = offset;
			this._changed();
		},
		getRampPoint: "#getOffset",
		setRampPoint: "#setOffset",
		getColor: function() {
			return this._color;
		},
		setColor: function() {
			Color._setOwner(this._color, null);
			this._color = Color._setOwner(Color.read(arguments, 0), this, "setColor");
			this._changed();
		},
		equals: function(stop) {
			return stop === this || stop && this._class === stop._class && this._color.equals(stop._color) && this._offset == stop._offset || false;
		}
	});
	const PatternDefinition = ItemDefinition.extend({
		_class: "PatternDefinition",
		initialize: function PatternDefinition(item, options) {
			this._tile = null;
			this._spacing = new Size();
			ItemDefinition.call(this, item);
			if (options) this.set(options);
		},
		_serialize: function(options, dictionary) {
			return dictionary.add(this, function() {
				const json = [this._class, this._item];
				const props = {};
				if (this._tile) props.tile = this._tile;
				if (!this._spacing.isZero()) props.spacing = this._spacing;
				if (this._name) props.name = this._name;
				if (Object.keys(props).length) json.push(props);
				return Base.serialize(json, options, false, dictionary);
			});
		},
		_changed: function _changed(flags) {
			_changed.base.call(this, flags);
			if (flags & 1) this._canvases = {};
		},
		getTile: function() {
			return this._tile || this._item.getBounds();
		},
		setTile: function() {
			this._tile = Rectangle.read(arguments, 0, {
				readNull: true,
				clone: true
			});
			this._changed(129);
		},
		getSpacing: function() {
			return this._spacing;
		},
		setSpacing: function() {
			this._spacing = Size.read(arguments, 0, { clone: true });
			this._changed(129);
		},
		clone: function() {
			return new PatternDefinition(this._item.clone(false), {
				tile: this._tile,
				spacing: this._spacing,
				name: this._name
			});
		},
		equals: function(pattern) {
			return pattern === this || pattern && this._class === pattern._class && this._item.equals(pattern._item) && Base.equals(this._tile, pattern._tile) && this._spacing.equals(pattern._spacing) || false;
		},
		_toCanvasStyle: function(ctx, matrix) {
			const transform = ctx.getTransform();
			const device = new Matrix(transform.a, transform.b, transform.c, transform.d, 0, 0).append(matrix);
			const scale = Math.max(Math.sqrt(device._a * device._a + device._b * device._b), Math.sqrt(device._c * device._c + device._d * device._d));
			const level = Math.ceil(Math.log(scale) / Math.LN2 * 4 - 1e-12);
			const tile = this.getTile();
			const cell = tile.getSize().add(this._spacing);
			const size = cell.multiply(Math.pow(2, level / 4)).ceil();
			if (!(size.width > 0 && size.height > 0)) return "rgba(0,0,0,0)";
			let canvas = this._canvases[level];
			if (!canvas) {
				canvas = this._canvases[level] = self.OffscreenCanvas ? new self.OffscreenCanvas(size.width, size.height) : CanvasProvider.getCanvas(size);
				const tileCtx = canvas.getContext("2d");
				const mx = new Matrix().scale(size.divide(cell)).translate(tile.getPoint().negate());
				mx.applyToContext(tileCtx);
				if (!this._spacing.isZero()) {
					tileCtx.beginPath();
					tileCtx.rect(tile.x, tile.y, tile.width, tile.height);
					tileCtx.clip();
				}
				this._item.draw(tileCtx, new Base({
					matrices: [mx],
					updateMatrix: false
				}));
			}
			const pattern = ctx.createPattern(canvas, "repeat");
			const placement = matrix.appended(new Matrix().translate(tile.getPoint()).scale(cell.divide(size)));
			transform.a = placement._a;
			transform.b = placement._b;
			transform.c = placement._c;
			transform.d = placement._d;
			transform.e = placement._tx;
			transform.f = placement._ty;
			pattern.setTransform(transform);
			return pattern;
		}
	});
	const Style = Base.extend(new (function() {
		const itemDefaults = {
			fillColor: null,
			fillRule: "nonzero",
			strokeColor: null,
			strokeWidth: 1,
			strokeCap: "butt",
			strokeJoin: "miter",
			strokeScaling: true,
			miterLimit: 10,
			dashOffset: 0,
			dashArray: [],
			paintOrder: "fill",
			shadowColor: null,
			shadowBlur: 0,
			shadowOffset: new Point(),
			selectedColor: null
		};
		const groupDefaults = Base.set({}, itemDefaults, {
			fontFamily: "sans-serif",
			fontWeight: "normal",
			fontStyle: "normal",
			fontSize: 12,
			fontVariations: null,
			lineHeight: "auto",
			letterTracking: 0,
			letterKerning: null,
			baselineShift: 0,
			baselinePosition: "normal",
			letterScaling: 1,
			letterRotation: 0,
			capitals: "normal",
			underline: false,
			strikethrough: false,
			features: null,
			justification: "left",
			justifyLast: "left",
			justifySpacing: null,
			startIndent: 0,
			endIndent: 0,
			firstLineIndent: 0,
			spaceBefore: 0,
			spaceAfter: 0,
			hyphenation: false,
			composer: "paragraph",
			lineWrap: "normal",
			tabs: null,
			direction: null
		});
		const textDefaults = Base.set({}, groupDefaults, { fillColor: new Color() });
		const flags = {
			strokeWidth: 193,
			strokeCap: 193,
			strokeJoin: 193,
			dashArray: 193,
			dashOffset: 193,
			strokeScaling: 193 | Change.GEOMETRY,
			miterLimit: 193
		};
		const item = { beans: true };
		const fields = {
			_class: "Style",
			beans: true,
			initialize: function Style(style, _owner, _project) {
				this._values = {};
				this._owner = _owner;
				this._project = _owner && _owner._project || _project || paper.project;
				this._defaults = !_owner || _owner instanceof Group ? groupDefaults : _owner instanceof TextItem || _owner instanceof TextStory || _owner instanceof TextRange ? textDefaults : itemDefaults;
				if (style) this.set(style);
			}
		};
		Base.each(groupDefaults, function(value, key) {
			const isColor = /Color$/.test(key);
			const isPoint = key === "shadowOffset";
			const part = Base.capitalize(key);
			const flag = !(key in itemDefaults) && key !== "underline" && key !== "strikethrough" ? 9 : flags[key];
			const set = "set" + part;
			const get = "get" + part;
			fields[set] = function(value) {
				const owner = this._owner;
				const styles = owner && owner._getStyles(this, key, true);
				if (styles) Style.apply(styles, key, value);
				if ((key === "selectedColor" || !styles) && key in this._defaults) {
					const old = this._values[key];
					if (old !== value) {
						if (isColor) {
							if (old && old.constructor === Color) {
								Color._setOwner(old, null);
								old._canvasStyle = null;
							}
							if (value && value.constructor === Color) {
								value = Color._setOwner(value, owner, styles && set);
							}
						}
						this._values[key] = value;
						if (owner) owner._changed(flag || 129);
					}
				}
			};
			fields[get] = function(_dontMerge) {
				let value;
				const owner = this._owner;
				const styles = owner && owner._getStyles(this, key);
				if (styles && !_dontMerge) {
					value = Style.merge(styles, key);
				} else if (key in this._defaults) {
					value = this._values[key];
					if (value === undefined) {
						value = this._defaults[key];
						if (value && value.clone) {
							value = value.clone();
						}
					} else {
						const ctor = isColor ? Color : isPoint ? Point : null;
						if (ctor && !(value && value.constructor === ctor)) {
							this._values[key] = value = ctor.read([value], 0, {
								readNull: true,
								clone: true
							});
						}
					}
				}
				if (value && isColor) {
					value = Color._setOwner(value, owner, styles && set);
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
			Font: "FontFamily",
			WindingRule: "FillRule"
		}, function(value, key) {
			const get = "get" + key;
			const set = "set" + key;
			fields[get] = item[get] = "#get" + value;
			fields[set] = item[set] = "#set" + value;
		});
		fields.getTracking = item.getTracking = "#getLetterTracking";
		fields.setTracking = item.setTracking = "#setLetterTracking";
		item.getLeading = function() {
			return this._style.getLeading();
		};
		item.setLeading = function(leading) {
			this._style.setLeading(leading);
		};
		Item.inject(item);
		TextRange.inject(item);
		return fields;
	})(), {
		statics: {
			merge: function(styles, key) {
				const get = "get" + Base.capitalize(key);
				let value;
				for (let i = 0, l = styles.length; i < l; i++) {
					const other = styles[i][get]();
					if (!i) {
						value = other;
					} else if (!Base.equals(value, other)) {
						return undefined;
					}
				}
				return value;
			},
			apply: function(styles, key, value) {
				const set = "set" + Base.capitalize(key);
				for (let i = 0, l = styles.length; i < l; i++) styles[i][set](value);
			}
		},
		set: function(style) {
			const isStyle = style instanceof Style;
			const values = isStyle ? style._values : style;
			if (values) {
				for (const key in values) {
					if (key in this._defaults || key in this._formerNames) {
						const value = values[key];
						this[key] = value && isStyle && value.clone ? value.clone() : value;
					}
				}
			}
		},
		equals: function(style) {
			function compare(style1, style2, secondary) {
				const values1 = style1._values;
				const values2 = style2._values;
				const defaults2 = style2._defaults;
				for (const key in values1) {
					const value1 = values1[key];
					const value2 = values2[key];
					if (!(secondary && key in values2) && !Base.equals(value1, value2 === undefined ? defaults2[key] : value2)) return false;
				}
				return true;
			}
			return style === this || style && this._class === style._class && compare(this, style) && compare(style, this, true) || false;
		},
		_dispose: function() {
			const colors = [
				this.getFillColor(),
				this.getStrokeColor(),
				this.getShadowColor()
			];
			for (let i = 0; i < 3; i++) {
				if (colors[i]) colors[i]._canvasStyle = null;
			}
		},
		hasFill: function() {
			const color = this.getFillColor();
			return !!color && color.alpha > 0;
		},
		hasStroke: function() {
			const color = this.getStrokeColor();
			return !!color && color.alpha > 0 && this.getStrokeWidth() > 0;
		},
		hasShadow: function() {
			const color = this.getShadowColor();
			return !!color && color.alpha > 0 && (this.getShadowBlur() > 0 || !this.getShadowOffset().isZero());
		},
		getView: function() {
			return this._project._view;
		},
		_getCanvasFont: function() {
			let fontSize = this.getFontSize();
			const fontStyle = this.getFontStyle();
			const families = this.getFontFamily().split(",").map(function(family) {
				family = family.trim();
				return /^(["'].*|[a-z-]+)$/i.test(family) ? family : "\"" + family.replace(/["\\]/g, "\\$&") + "\"";
			});
			if (this.getBaselinePosition() !== "normal" && !isNaN(fontSize)) fontSize *= this._scriptSize;
			return (fontStyle !== "normal" ? fontStyle + " " : "") + (this.getCapitals() === "small" ? "small-caps " : "") + this.getFontWeight() + " " + fontSize + (/[a-z]/i.test(fontSize + "") ? " " : "px ") + families.join(", ");
		},
		_scriptSize: .583,
		_scriptShift: .333,
		_formerNames: {
			tracking: true,
			leading: true
		},
		_getCanvasLetterSpacing: function() {
			return this.getLetterTracking() / 1e3 + "em";
		},
		_getFontSize: function() {
			const fontSize = this.getFontSize();
			return /pt|em|%|px/.test(fontSize) ? this.getView().getPixelSize(fontSize) : fontSize;
		},
		_getLineHeight: function() {
			const lineHeight = this.getLineHeight();
			return lineHeight === "auto" ? 1.2 * this._getFontSize() : typeof lineHeight === "string" ? this.getView().getPixelSize(lineHeight) : lineHeight * this._getFontSize();
		},
		getLeading: function() {
			return this.getLineHeight() === undefined ? undefined : this._getLineHeight();
		},
		setLeading: function(leading) {
			this.setLineHeight(leading == null ? "auto" : typeof leading === "number" ? leading + "px" : leading);
		}
	});
	const DomElement = new (function() {
		function handlePrefix(el, name, set, value) {
			const prefixes = [
				"",
				"webkit",
				"moz",
				"Moz",
				"ms",
				"o"
			];
			const suffix = name[0].toUpperCase() + name.substring(1);
			for (let i = 0; i < 6; i++) {
				const prefix = prefixes[i];
				const key = prefix ? prefix + suffix : name;
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
				const doc = el && el.nodeType !== 9 ? el.ownerDocument : el;
				const view = doc && doc.defaultView;
				return view && view.getComputedStyle(el, "");
			},
			getBounds: function(el, viewport) {
				const doc = el.ownerDocument;
				const body = doc.body;
				const html = doc.documentElement;
				const rect = el.getBoundingClientRect();
				let x = rect.left - (html.clientLeft || body.clientLeft || 0);
				let y = rect.top - (html.clientTop || body.clientTop || 0);
				if (!viewport) {
					const view = doc.defaultView;
					x += view.pageXOffset || html.scrollLeft || body.scrollLeft;
					y += view.pageYOffset || html.scrollTop || body.scrollTop;
				}
				return new Rectangle(x, y, rect.width, rect.height);
			},
			getViewportBounds: function(el) {
				const doc = el.ownerDocument;
				const view = doc.defaultView;
				const html = doc.documentElement;
				return new Rectangle(0, 0, view.innerWidth || html.clientWidth, view.innerHeight || html.clientHeight);
			},
			getOffset: function(el, viewport) {
				return DomElement.getBounds(el, viewport).getPoint();
			},
			getSize: function(el) {
				return DomElement.getBounds(el, true).getSize();
			},
			getInsets: function(el, start) {
				const style = DomElement.getStyles(el);
				function get(side) {
					return parseFloat(style["padding" + side]) + parseFloat(style["border" + side + "Width"]);
				}
				return start ? new Size(get("Left"), get("Top")) : new Size(get("Left") + get("Right"), get("Top") + get("Bottom"));
			},
			isInvisible: function(el) {
				return DomElement.getSize(el).equals(new Size(0, 0));
			},
			isInView: function(el) {
				return !DomElement.isInvisible(el) && DomElement.getViewportBounds(el).intersects(DomElement.getBounds(el, true));
			},
			isInserted: function(el) {
				return document.body.contains(el);
			},
			getPrefixed: function(el, name) {
				return el && handlePrefix(el, name);
			},
			setPrefixed: function(el, name, value) {
				if (typeof name === "object") {
					for (const key in name) handlePrefix(el, key, true, name[key]);
				} else {
					handlePrefix(el, name, true, value);
				}
			}
		};
	})();
	const DomEvent = {
		add: function(el, events) {
			if (el) {
				for (const type in events) {
					const func = events[type];
					const parts = type.split(/[\s,]+/g);
					for (let i = 0, l = parts.length; i < l; i++) {
						const name = parts[i];
						const options = el === document && (name === "touchstart" || name === "touchmove") ? { passive: false } : false;
						el.addEventListener(name, func, options);
					}
				}
			}
		},
		remove: function(el, events) {
			if (el) {
				for (const type in events) {
					const func = events[type];
					const parts = type.split(/[\s,]+/g);
					for (let i = 0, l = parts.length; i < l; i++) el.removeEventListener(parts[i], func, false);
				}
			}
		},
		getPoint: function(event, target) {
			function find(touches) {
				for (let i = 0, l = touches.length; i < l; i++) {
					if (touches[i].target === target) return touches[i];
				}
			}
			const touches = event.targetTouches;
			let pos = event;
			if (touches) {
				pos = find(event.touches) || find(event.changedTouches) || (touches.length ? touches[0] : event.changedTouches[0]);
			}
			return new Point(pos.pageX || pos.clientX + document.documentElement.scrollLeft, pos.pageY || pos.clientY + document.documentElement.scrollTop);
		},
		getTarget: function(event) {
			return event.target;
		},
		getRelatedTarget: function(event) {
			return event.relatedTarget;
		},
		getOffset: function(event, target) {
			target = target || DomEvent.getTarget(event);
			return DomEvent.getPoint(event, target).subtract(DomElement.getOffset(target));
		}
	};
	DomEvent.requestAnimationFrame = new (function() {
		const nativeRequest = DomElement.getPrefixed(window, "requestAnimationFrame");
		let requested = false;
		let callbacks = [];
		let timer;
		function handleCallbacks() {
			const functions = callbacks;
			callbacks = [];
			for (let i = 0, l = functions.length; i < l; i++) functions[i]();
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
				timer = setInterval(handleCallbacks, 1e3 / 60);
			}
		};
	})();
	const View = Base.extend(Emitter, {
		_class: "View",
		initialize: function View(project, element) {
			function getSize(name) {
				return element[name] || parseInt(element.getAttribute(name), 10);
			}
			function getCanvasSize() {
				const size = new Size(element.offsetWidth, element.offsetHeight);
				return size.isNaN() || size.isZero() ? new Size(getSize("width"), getSize("height")) : size.subtract(DomElement.getInsets(element));
			}
			let size;
			if (window && element) {
				this._id = element.getAttribute("id");
				if (this._id == null) element.setAttribute("id", this._id = "paper-view-" + View._id++);
				DomEvent.add(element, this._viewEvents);
				const none = "none";
				DomElement.setPrefixed(element.style, {
					userDrag: none,
					userSelect: none,
					touchCallout: none,
					contentZooming: none,
					tapHighlightColor: "rgba(0,0,0,0)"
				});
				if (PaperScope.hasAttribute(element, "resize")) {
					const that = this;
					DomEvent.add(window, this._windowEvents = { resize: function() {
						that.setViewSize(getCanvasSize());
					} });
				}
				size = getCanvasSize();
				if (PaperScope.hasAttribute(element, "stats") && typeof Stats !== "undefined") {
					this._stats = new Stats();
					const stats = this._stats.domElement;
					const style = stats.style;
					const offset = DomElement.getOffset(element);
					style.position = "absolute";
					style.left = offset.x + "px";
					style.top = offset.y + "px";
					document.body.appendChild(stats);
				}
			} else {
				size = new Size(element);
				element = null;
			}
			this._project = project;
			this._scope = project._scope;
			this._element = element;
			if (!this._pixelRatio) this._pixelRatio = window && window.devicePixelRatio || 1;
			this._setElementSize(size.width, size.height);
			this._viewSize = size;
			View._views.push(this);
			View._viewsById[this._id] = this;
			(this._matrix = new Matrix())._owner = this;
			if (!View._focused) View._focused = this;
			this._frameItems = {};
			this._frameItemCount = 0;
			this._itemEvents = {
				native: {},
				virtual: {}
			};
			this._autoUpdate = !paper.agent.node;
			this._needsUpdate = false;
		},
		remove: function() {
			if (!this._project) return false;
			if (View._focused === this) View._focused = null;
			View._views.splice(View._views.indexOf(this), 1);
			delete View._viewsById[this._id];
			const project = this._project;
			if (project._view === this) project._view = null;
			DomEvent.remove(this._element, this._viewEvents);
			DomEvent.remove(window, this._windowEvents);
			this._element = this._project = null;
			this.off("frame");
			this._animate = false;
			this._frameItems = {};
			return true;
		},
		_events: Base.each(Item._itemHandlers.concat([
			"onResize",
			"onKeyDown",
			"onKeyUp"
		]), function(name) {
			this[name] = {};
		}, { onFrame: {
			install: function() {
				this.play();
			},
			uninstall: function() {
				this.pause();
			}
		} }),
		_animate: false,
		_time: 0,
		_count: 0,
		getAutoUpdate: function() {
			return this._autoUpdate;
		},
		setAutoUpdate: function(autoUpdate) {
			this._autoUpdate = autoUpdate;
			if (autoUpdate) this.requestUpdate();
		},
		update: function(force) {},
		draw: function() {
			this.update();
		},
		requestUpdate: function() {
			if (!this._requested) {
				const that = this;
				DomEvent.requestAnimationFrame(function() {
					that._requested = false;
					if (that._animate) {
						that.requestUpdate();
						const element = that._element;
						if (!element || (!DomElement.getPrefixed(document, "hidden") || PaperScope.getAttribute(element, "keepalive") === "true") && DomElement.isInView(element)) {
							that._handleFrame();
						}
					}
					if (that._autoUpdate) that.update();
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
			const now = Date.now() / 1e3;
			const delta = this._last ? now - this._last : 0;
			this._last = now;
			this.emit("frame", new Base({
				delta,
				time: this._time += delta,
				count: this._count++
			}));
			if (this._stats) this._stats.update();
		},
		_animateItem: function(item, animate) {
			const items = this._frameItems;
			if (animate) {
				items[item._id] = {
					item,
					time: 0,
					count: 0
				};
				if (++this._frameItemCount === 1) this.on("frame", this._handleFrameItems);
			} else {
				delete items[item._id];
				if (--this._frameItemCount === 0) {
					this.off("frame", this._handleFrameItems);
				}
			}
		},
		_handleFrameItems: function(event) {
			for (const i in this._frameItems) {
				const entry = this._frameItems[i];
				entry.item.emit("frame", new Base(event, {
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
			const size = this._viewSize;
			return new LinkedSize(size.width, size.height, this, "setViewSize");
		},
		setViewSize: function() {
			const size = Size.read(arguments);
			const delta = size.subtract(this._viewSize);
			if (delta.isZero()) return;
			this._setElementSize(size.width, size.height);
			this._viewSize.set(size);
			this._changed();
			this.emit("resize", {
				size,
				delta
			});
			if (this._autoUpdate) {
				this.update();
			}
		},
		_setElementSize: function(width, height) {
			const element = this._element;
			if (element) {
				if (element.width !== width) element.width = width;
				if (element.height !== height) element.height = height;
			}
		},
		getBounds: function() {
			if (!this._bounds) this._bounds = this._matrix.inverted()._transformBounds(new Rectangle(new Point(), this._viewSize));
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
			const agent = paper.agent;
			const element = this._element;
			let ctx;
			let pixels;
			if (element && agent && agent.firefox) {
				const parent = element.parentNode;
				const temp = document.createElement("div");
				temp.style.fontSize = size;
				parent.appendChild(temp);
				pixels = parseFloat(DomElement.getStyles(temp).fontSize);
				parent.removeChild(temp);
			} else if (ctx = this._context || CanvasProvider.getContext(1, 1)) {
				const prevFont = ctx.font;
				ctx.font = size + " serif";
				pixels = parseFloat(ctx.font);
				ctx.font = prevFont;
				if (ctx !== this._context) CanvasProvider.release(ctx);
			} else {
				pixels = parseFloat(size);
			}
			return pixels;
		},
		getTextWidth: function(font, lines, letterSpacing, direction) {
			const ctx = this._context || CanvasProvider.getContext(1, 1);
			let width = 0;
			if (ctx) {
				const prevFont = ctx.font;
				const prevLetterSpacing = ctx.letterSpacing;
				const prevDirection = ctx.direction;
				const textDirection = direction || "ltr";
				ctx.font = font;
				ctx.letterSpacing = letterSpacing;
				if (prevDirection !== textDirection) ctx.direction = textDirection;
				for (let i = 0, l = lines.length; i < l; i++) width = Math.max(width, ctx.measureText(lines[i]).width);
				ctx.font = prevFont;
				ctx.letterSpacing = prevLetterSpacing;
				if (prevDirection !== textDirection) ctx.direction = prevDirection;
				if (ctx !== this._context) CanvasProvider.release(ctx);
			}
			return width;
		},
		getFontMetrics: function(font) {
			const ctx = this._context || CanvasProvider.getContext(1, 1);
			let metrics = null;
			if (ctx) {
				const prevFont = ctx.font;
				ctx.font = font;
				const measured = ctx.measureText("H");
				let ascent = measured.fontBoundingBoxAscent;
				let descent = measured.fontBoundingBoxDescent;
				if (ascent === undefined) {
					ascent = measured.emHeightAscent;
					descent = measured.emHeightDescent;
				}
				if (ascent !== undefined) metrics = {
					ascent,
					descent
				};
				ctx.font = prevFont;
				if (ctx !== this._context) CanvasProvider.release(ctx);
			}
			return metrics;
		}
	}, Base.each([
		"rotate",
		"scale",
		"shear",
		"skew"
	], function(key) {
		const rotate = key === "rotate";
		this[key] = function() {
			const args = arguments;
			const value = (rotate ? Base : Point).read(args);
			const center = Point.read(args, 0, { readNull: true });
			return this.transform(new Matrix()[key](value, center || this.getCenter(true)));
		};
	}, {
		_decompose: function() {
			return this._decomposed || (this._decomposed = this._matrix.decompose());
		},
		translate: function() {
			const mx = new Matrix();
			return this.transform(mx.translate.apply(mx, arguments));
		},
		getCenter: function() {
			return this.getBounds().getCenter();
		},
		setCenter: function() {
			const center = Point.read(arguments);
			this.translate(this.getCenter().subtract(center));
		},
		getZoom: function() {
			const scaling = this._decompose().scaling;
			return (Math.abs(scaling.x) + Math.abs(scaling.y)) / 2;
		},
		setZoom: function(zoom) {
			if (zoom > 0 && isFinite(zoom)) {
				this.transform(new Matrix().scale(zoom / this.getZoom(), this.getCenter()));
			}
		},
		getRotation: function() {
			return this._decompose().rotation;
		},
		setRotation: function(rotation) {
			const current = this.getRotation();
			if (current != null && rotation != null) {
				this._matrix.prepend(new Matrix().rotate(rotation - current, this.projectToView(this.getCenter())));
			}
		},
		getScaling: function() {
			const scaling = this._decompose().scaling;
			return new LinkedPoint(scaling.x, scaling.y, this, "setScaling");
		},
		setScaling: function() {
			const current = this.getScaling();
			const scaling = Point.read(arguments, 0, {
				clone: true,
				readNull: true
			});
			if (current && scaling) {
				this.scale(scaling.x / current.x, scaling.y / current.y);
			}
		},
		getMatrix: function() {
			return this._matrix;
		},
		setMatrix: function() {
			const matrix = this._matrix;
			matrix.set.apply(matrix, arguments);
		},
		transform: function(matrix) {
			this._matrix.append(matrix);
		},
		fitBounds: function(rectangle, fit) {
			rectangle = Rectangle.read(arguments);
			fit = Base.read(arguments);
			const matrix = this._matrix;
			const size = this._viewSize;
			const bounds = matrix._transformBounds(rectangle);
			const scaleX = new Point(matrix._a, matrix._c).getLength();
			const scaleY = new Point(matrix._b, matrix._d).getLength();
			const ratios = [size.width / bounds.width * scaleX, size.height / bounds.height * scaleY].filter(function(ratio) {
				return ratio > 0 && isFinite(ratio);
			});
			this.setCenter(rectangle.getCenter());
			if (ratios.length) {
				const amount = fit === "cover" ? Math.max.apply(Math, ratios) : Math.min.apply(Math, ratios);
				matrix.prepend(new Matrix().scale(new Point(amount / scaleX, amount / scaleY), size.divide(2)));
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
			const element = this._element;
			let offset = DomEvent.getOffset(event, element);
			const size = DomElement.getSize(element);
			if (!size.isZero()) {
				const cssSize = new Size(element.offsetWidth, element.offsetHeight);
				offset = offset.multiply(cssSize.divide(size)).subtract(DomElement.getInsets(element, true)).multiply(this.getViewSize().divide(cssSize.subtract(DomElement.getInsets(element))));
			}
			return this.viewToProject(offset);
		}
	}, { statics: {
		_views: [],
		_viewsById: {},
		_id: 0,
		create: function(project, element) {
			if (document && typeof element === "string") element = document.getElementById(element);
			const ctor = window ? CanvasView : View;
			return new ctor(project, element);
		}
	} }, new (function() {
		let prevFocus;
		let tempFocus;
		let dragging = false;
		let mouseDown = false;
		function getView(event) {
			const target = DomEvent.getTarget(event);
			return target.getAttribute && View._viewsById[target.getAttribute("id")];
		}
		function updateFocus() {
			let view = View._focused;
			if (!view || !view.isVisible()) {
				for (let i = 0, l = View._views.length; i < l; i++) {
					if ((view = View._views[i]).isVisible()) {
						View._focused = tempFocus = view;
						break;
					}
				}
			}
		}
		function handleMouseMove(view, event, point) {
			view._handleMouseEvent("mousemove", event, point);
		}
		const viewEvents = {};
		if (window) {
			let mousedown = "touchstart";
			let mousemove = "touchmove";
			let mouseup = "touchend touchcancel";
			if (!("ontouchstart" in window && window.navigator.userAgent.match(/mobile|tablet|ip(ad|hone|od)|android|silk/i))) {
				mousedown += " mousedown";
				mousemove += " mousemove";
				mouseup += " mouseup";
			}
			const docEvents = {
				mouseout: function(event) {
					const view = View._focused;
					const target = DomEvent.getRelatedTarget(event);
					if (view && (!target || target.nodeName === "HTML")) handleMouseMove(view, event);
				},
				scroll: updateFocus
			};
			viewEvents[mousedown] = function(event) {
				const view = View._focused = getView(event);
				if (!dragging) {
					dragging = true;
					view._handleMouseEvent("mousedown", event);
				}
			};
			docEvents[mousemove] = function(event) {
				let view = View._focused;
				if (!mouseDown) {
					const target = getView(event);
					if (target) {
						if (view !== target) {
							if (view) handleMouseMove(view, event);
							if (!prevFocus) prevFocus = view;
							view = View._focused = tempFocus = target;
						}
					} else if (tempFocus && tempFocus === view) {
						if (prevFocus && !prevFocus.isInserted()) prevFocus = null;
						view = View._focused = prevFocus;
						prevFocus = null;
						updateFocus();
					}
				}
				if (view) handleMouseMove(view, event);
			};
			docEvents[mousedown] = function() {
				mouseDown = true;
			};
			docEvents[mouseup] = function(event) {
				const view = View._focused;
				if (view && dragging) view._handleMouseEvent("mouseup", event);
				mouseDown = dragging = false;
			};
			DomEvent.add(document, docEvents);
			DomEvent.add(window, { load: updateFocus });
		}
		let called = false;
		let prevented = false;
		const fallbacks = {
			doubleclick: "click",
			mousedrag: "mousemove"
		};
		let wasInView = false;
		let downPoint;
		let lastPoint;
		let downItem;
		let overItem;
		let dragItem;
		let clickItem;
		let clickTime;
		let dblClick;
		function emitMouseEvent(obj, target, type, event, point, prevPoint, stopItem) {
			let stopped = false;
			let mouseEvent;
			function emit(obj, type) {
				if (obj.responds(type)) {
					if (!mouseEvent) {
						mouseEvent = new MouseEvent(type, event, point, target || obj, prevPoint ? point.subtract(prevPoint) : null);
					}
					if (obj.emit(type, mouseEvent)) {
						called = true;
						if (mouseEvent.prevented) prevented = true;
						if (mouseEvent.stopped) return stopped = true;
					}
				} else {
					const fallback = fallbacks[type];
					if (fallback) return emit(obj, fallback);
				}
			}
			while (obj && obj !== stopItem) {
				if (emit(obj, type)) break;
				obj = obj._parent;
			}
			return stopped;
		}
		function emitMouseEvents(view, hitItem, type, event, point, prevPoint) {
			view._project.removeOn(type);
			prevented = called = false;
			return dragItem && emitMouseEvent(dragItem, null, type, event, point, prevPoint) || hitItem && hitItem !== dragItem && !hitItem.isDescendant(dragItem) && emitMouseEvent(hitItem, null, type === "mousedrag" ? "mousemove" : type, event, point, prevPoint, dragItem) || emitMouseEvent(view, dragItem || hitItem || view, type, event, point, prevPoint);
		}
		function createEvent(type, options) {
			if (options.modifiers) Key.modifiers.set(options.modifiers);
			return {
				type,
				timeStamp: options.time != null ? options.time * 1e3 : options.timeStamp != null ? options.timeStamp : Date.now(),
				button: options.button || 0,
				cancelable: true,
				defaultPrevented: false,
				preventDefault: function() {
					this.defaultPrevented = true;
				},
				stopPropagation: function() {}
			};
		}
		const itemEventsMap = {
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
				if (!/^mouse(down|move|up)$/.test(type)) throw new Error("Unknown mouse event type: '" + type + "'.");
				const event = createEvent(type, options || {});
				if (type === "mousedown") {
					View._focused = this;
					mouseDown = dragging = true;
				}
				this._handleMouseEvent(type, event, new Point(point), true);
				if (type === "mouseup") mouseDown = dragging = false;
				return event.defaultPrevented;
			},
			dispatchKeyEvent: function(type, key, options) {
				if (!/^key(down|up)$/.test(type)) throw new Error("Unknown key event type: '" + type + "'.");
				options = options || {};
				Key._handleKey(type === "keydown", key, options.character, createEvent(type, options), this);
			},
			_handleMouseEvent: function(type, event, point, dispatched) {
				const itemEvents = this._itemEvents;
				const hitItems = itemEvents.native[type];
				const nativeMove = type === "mousemove";
				const tool = this._scope.tool;
				const view = this;
				function responds(type) {
					return itemEvents.virtual[type] || view.responds(type) || tool && tool.responds(type);
				}
				function needsUp(hitItem) {
					if (view.responds("mouseup") || tool && tool.responds("mouseup")) return true;
					for (let item = hitItem; item; item = item._parent) {
						for (const key in itemEventsMap.mouseup) {
							if (item.responds(key)) return true;
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
				if (nativeMove && dragging && responds("mousedrag")) type = "mousedrag";
				if (!point) point = this.getEventPoint(event);
				const target = DomEvent.getTarget(event);
				const isCovered = nativeMove && !dragging && target && target.nodeType === 1 && !target.contains(this._element);
				const inView = dispatched || !isCovered && this.getBounds().contains(point);
				const hit = hitItems && inView && view._project.hitTest(point, {
					tolerance: view._scope.settings.hitTolerance,
					fill: true,
					stroke: true
				});
				const hitItem = hit && hit.item || null;
				let handle = false;
				const mouse = {};
				mouse[type.substr(5)] = true;
				if (hitItems && hitItem !== overItem) {
					if (overItem) {
						emitMouseEvent(overItem, null, "mouseleave", event, point);
					}
					if (hitItem) {
						emitMouseEvent(hitItem, null, "mouseenter", event, point);
					}
					overItem = hitItem;
				}
				if (wasInView ^ inView) {
					emitMouseEvent(this, null, inView ? "mouseenter" : "mouseleave", event, point);
					handle = true;
				}
				if ((inView || mouse.drag) && !point.equals(lastPoint)) {
					emitMouseEvents(this, hitItem, nativeMove ? type : "mousemove", event, point, lastPoint);
					handle = true;
				}
				wasInView = inView;
				if (mouse.down && inView || mouse.up && downPoint) {
					emitMouseEvents(this, hitItem, type, event, point, downPoint);
					if (mouse.down) {
						const time = Date.now();
						dblClick = !dblClick && hitItem === clickItem && time - clickTime < 300 && point.getDistance(downPoint) < 3;
						downItem = clickItem = hitItem;
						clickTime = time;
						if (!prevented && hitItem) {
							let item = hitItem;
							while (item && !item.responds("mousedrag")) item = item._parent;
							if (item) dragItem = hitItem;
						}
						downPoint = point;
					} else if (mouse.up) {
						if (!prevented && hitItem === downItem) {
							emitMouseEvents(this, hitItem, dblClick ? "doubleclick" : "click", event, point, downPoint);
						}
						downItem = dragItem = null;
					}
					wasInView = false;
					handle = true;
				}
				lastPoint = point;
				if (handle && tool) {
					called = tool._handleMouseEvent(type, event, point, mouse) || called;
				}
				if (event.cancelable !== false && (called && !mouse.move || mouse.down && needsUp(hitItem))) {
					event.preventDefault();
				}
			},
			_handleKeyEvent: function(type, event, key, character) {
				const scope = this._scope;
				const tool = scope.tool;
				let keyEvent;
				function emit(obj) {
					if (obj.responds(type)) {
						paper = scope;
						obj.emit(type, keyEvent = keyEvent || new KeyEvent(type, event, key, character));
					}
				}
				emit(this);
				if (tool && tool.responds(type)) emit(tool);
			},
			_countItemEvent: function(type, sign) {
				const itemEvents = this._itemEvents;
				const native = itemEvents.native;
				const virtual = itemEvents.virtual;
				for (const key in itemEventsMap) {
					native[key] = (native[key] || 0) + (itemEventsMap[key][type] || 0) * sign;
				}
				virtual[type] = (virtual[type] || 0) + sign;
			},
			statics: {
				updateFocus,
				_resetState: function() {
					dragging = mouseDown = called = wasInView = false;
					prevFocus = tempFocus = downPoint = lastPoint = downItem = overItem = dragItem = clickItem = clickTime = dblClick = null;
				}
			}
		};
	})());
	const CanvasView = View.extend({
		_class: "CanvasView",
		initialize: function CanvasView(project, canvas) {
			if (!(canvas instanceof window.HTMLCanvasElement)) {
				const size = Size.read(arguments, 1);
				if (size.isZero()) throw new Error("Cannot create CanvasView with the provided argument: " + Base.slice(arguments, 1));
				canvas = CanvasProvider.getCanvas(size);
			}
			const ctx = this._context = canvas.getContext("2d");
			ctx.save();
			this._pixelRatio = 1;
			if (!/^off|false$/.test(PaperScope.getAttribute(canvas, "hidpi"))) {
				this._pixelRatio = window.devicePixelRatio || 1;
			}
			View.call(this, project, canvas);
			this._needsUpdate = true;
		},
		remove: function remove() {
			this._context.restore();
			return remove.base.call(this);
		},
		_setElementSize: function _setElementSize(width, height) {
			const pixelRatio = this._pixelRatio;
			const element = this._element;
			_setElementSize.base.call(this, width * pixelRatio, height * pixelRatio);
			if (!PaperScope.hasAttribute(element, "resize")) {
				const style = element.style;
				const insets = DomElement.getStyles(element).boxSizing === "border-box" ? DomElement.getInsets(element) : new Size();
				style.width = width + insets.width + "px";
				style.height = height + insets.height + "px";
			}
			if (pixelRatio !== 1) {
				const ctx = this._context;
				ctx.restore();
				ctx.save();
				ctx.scale(pixelRatio, pixelRatio);
			}
		},
		getContext: function() {
			return this._context;
		},
		update: function(force) {
			if (!this._needsUpdate && !force) return false;
			const project = this._project;
			const ctx = this._context;
			const size = this._viewSize;
			ctx.clearRect(0, 0, size.width + 1, size.height + 1);
			if (project) {
				if (force) project._bufferVersion++;
				project.draw(ctx, this._matrix, this._pixelRatio, this);
			}
			this._needsUpdate = false;
			return true;
		}
	});
	const Event = Base.extend({
		_class: "Event",
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
			return this.event.timeStamp / 1e3;
		},
		getTimeStamp: function() {
			return this.event.timeStamp;
		},
		getModifiers: function() {
			return Key.modifiers;
		}
	});
	const DrawEvent = Base.extend({
		_class: "DrawEvent",
		initialize: function DrawEvent(props) {
			Base.set(this, props);
		},
		prevented: false,
		preventDefault: function() {
			this.prevented = true;
		},
		stop: "#preventDefault"
	});
	const KeyEvent = Event.extend({
		_class: "KeyEvent",
		initialize: function KeyEvent(type, event, key, character) {
			this.type = type;
			this.event = event;
			this.key = key;
			this.character = character;
		},
		toString: function() {
			return "{ type: '" + this.type + "', key: '" + this.key + "', character: '" + this.character + "', modifiers: " + this.getModifiers() + " }";
		}
	});
	const Key = new (function() {
		const keyLookup = {
			"	": "tab",
			" ": "space",
			"\xA0": "space",
			"\b": "backspace",
			"": "delete",
			"Spacebar": "space",
			"Del": "delete",
			"Win": "meta",
			"Esc": "escape"
		};
		const charLookup = {
			tab: "	",
			space: " ",
			enter: "\r"
		};
		const keyMap = {};
		const charMap = {};
		let metaFixMap;
		let downKey;
		const modifiers = new Base({
			shift: false,
			control: false,
			alt: false,
			meta: false,
			capsLock: false,
			space: false
		}).inject({
			option: { get: function() {
				return this.alt;
			} },
			command: { get: function() {
				const agent = paper && paper.agent;
				return agent && agent.mac ? this.meta : this.control;
			} }
		});
		function getKey(event) {
			let key = event.key;
			key = /^Arrow[A-Z]/.test(key) ? key.substr(5) : key === "Unidentified" || key === undefined ? String.fromCharCode(event.keyCode) : key;
			return keyLookup[key] || (key.length > 1 ? Base.hyphenate(key) : key.toLowerCase());
		}
		function handleKey(down, key, character, event, view) {
			if (!view) {
				View.updateFocus();
				view = View._focused;
				if (view && !view.isVisible()) view = null;
			}
			if (character == null) {
				character = down ? charLookup[key] || (key.length > 1 ? "" : key) : charMap[key] || "";
			}
			let name;
			keyMap[key] = down;
			if (down) {
				charMap[key] = character;
			} else {
				delete charMap[key];
			}
			if (key.length > 1 && (name = Base.camelize(key)) in modifiers) {
				modifiers[name] = down;
				const agent = paper && paper.agent;
				if (name === "meta" && agent && agent.mac) {
					if (down) {
						metaFixMap = {};
					} else {
						for (const k in metaFixMap) {
							if (k in charMap) handleKey(false, k, metaFixMap[k], event, view);
						}
						metaFixMap = null;
					}
				}
			} else if (down && metaFixMap) {
				metaFixMap[key] = character;
			}
			if (view) {
				view._handleKeyEvent(down ? "keydown" : "keyup", event, key, character);
			}
		}
		DomEvent.add(document, {
			keydown: function(event) {
				const key = getKey(event);
				if (key.length > 1 || event.ctrlKey || event.altKey || event.metaKey) {
					handleKey(true, key, null, event);
				} else {
					downKey = key;
				}
			},
			keypress: function(event) {
				if (downKey) {
					let key = getKey(event);
					const code = event.charCode;
					const character = code >= 32 ? String.fromCharCode(code) : key.length > 1 ? "" : key;
					if (key !== downKey) {
						key = character.toLowerCase();
					}
					handleKey(true, key, character, event);
					downKey = null;
				}
			},
			keyup: function(event) {
				const key = getKey(event);
				if (key in charMap) handleKey(false, key, charMap[key], event);
			}
		});
		DomEvent.add(window, { blur: function(event) {
			for (const key in charMap) handleKey(false, key, charMap[key], event);
		} });
		return {
			_handleKey: handleKey,
			modifiers,
			isDown: function(key) {
				return !!keyMap[key];
			}
		};
	})();
	const MouseEvent = Event.extend({
		_class: "MouseEvent",
		initialize: function MouseEvent(type, event, point, target, delta) {
			this.type = type;
			this.event = event;
			this.point = point;
			this.target = target;
			this.delta = delta;
		},
		toString: function() {
			return "{ type: '" + this.type + "', point: " + this.point + ", target: " + this.target + (this.delta ? ", delta: " + this.delta : "") + ", modifiers: " + this.getModifiers() + " }";
		}
	});
	const ToolEvent = Event.extend({
		_class: "ToolEvent",
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
			return !this._delta && this.tool._lastPoint ? this.tool._point.subtract(this.tool._lastPoint) : this._delta;
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
			return this.tool[this._getCountName()];
		},
		setCount: function(count) {
			this.tool[this._getCountName()] = count;
		},
		_getCountName: function() {
			return /^mouse(down|up)$/.test(this.type) ? "_downCount" : "_moveCount";
		},
		getItem: function() {
			if (!this._item) {
				const result = this.tool._scope.project.hitTest(this.getPoint());
				if (result) {
					let item = result.item;
					let parent = item._parent;
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
			return "{ type: " + this.type + ", point: " + this.getPoint() + ", count: " + this.getCount() + ", modifiers: " + this.getModifiers() + " }";
		}
	});
	const Tool = PaperScopeItem.extend({
		_class: "Tool",
		_list: "tools",
		_reference: "tool",
		_events: [
			"onMouseDown",
			"onMouseUp",
			"onMouseDrag",
			"onMouseMove",
			"onActivate",
			"onDeactivate",
			"onEditOptions",
			"onKeyDown",
			"onKeyUp"
		],
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
			if (minDistance != null && this._maxDistance != null && minDistance > this._maxDistance) {
				this._maxDistance = minDistance;
			}
		},
		getMaxDistance: function() {
			return this._maxDistance;
		},
		setMaxDistance: function(maxDistance) {
			this._maxDistance = maxDistance;
			if (this._minDistance != null && maxDistance != null && maxDistance < this._minDistance) {
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
			return this._minDistance == this._maxDistance ? this._minDistance : null;
		},
		setFixedDistance: function(distance) {
			this._minDistance = this._maxDistance = distance;
		},
		_handleMouseEvent: function(type, event, point, mouse) {
			paper = this._scope;
			if (mouse.drag && !this.responds(type)) type = "mousemove";
			const move = mouse.move || mouse.drag;
			const responds = this.responds(type);
			let called = false;
			const tool = this;
			const time = event.timeStamp / 1e3;
			const elapsed = this._time != null ? time - this._time : 0;
			const velocity = !mouse.down && this._point && elapsed > 0 ? point.subtract(this._point).divide(elapsed) : new Point();
			function update(minDistance, maxDistance) {
				let pt = point;
				const toolPoint = move ? tool._point : tool._downPoint || pt;
				if (move) {
					if (tool._moveCount >= 0 && pt.equals(toolPoint)) {
						return false;
					}
					if (toolPoint && (minDistance != null || maxDistance != null)) {
						const vector = pt.subtract(toolPoint);
						const distance = vector.getLength();
						if (distance < (minDistance || 0)) return false;
						if (maxDistance) {
							pt = toolPoint.add(vector.normalize(Math.min(distance, maxDistance)));
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
					called = tool.emit(type, new ToolEvent(tool, type, event)) || called;
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
							tool._elapsed = tool._eventInterval / 1e3;
							tool._moveCount++;
							if (tool.responds("mousedrag")) {
								tool.emit("mousedrag", new ToolEvent(tool, "mousedrag", event));
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
				while (update(this._minDistance, this._maxDistance)) emit();
			}
			return called;
		}
	});
	const Tween = Base.extend(Emitter, {
		_class: "Tween",
		statics: { easings: new Base({
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
				return t < .5 ? 2 * t * t : -1 + 2 * (2 - t) * t;
			},
			easeInCubic: function(t) {
				return t * t * t;
			},
			easeOutCubic: function(t) {
				return --t * t * t + 1;
			},
			easeInOutCubic: function(t) {
				return t < .5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
			},
			easeInQuart: function(t) {
				return t * t * t * t;
			},
			easeOutQuart: function(t) {
				return 1 - --t * t * t * t;
			},
			easeInOutQuart: function(t) {
				return t < .5 ? 8 * t * t * t * t : 1 - 8 * --t * t * t * t;
			},
			easeInQuint: function(t) {
				return t * t * t * t * t;
			},
			easeOutQuint: function(t) {
				return 1 + --t * t * t * t * t;
			},
			easeInOutQuint: function(t) {
				return t < .5 ? 16 * t * t * t * t * t : 1 + 16 * --t * t * t * t * t;
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
				return t === 0 || t === 1 ? t : t < .5 ? Math.pow(2, 20 * t - 10) / 2 : 1 - Math.pow(2, 10 - 20 * t) / 2;
			},
			easeInCirc: function(t) {
				return 1 - Math.sqrt(1 - t * t);
			},
			easeOutCirc: function(t) {
				return Math.sqrt(1 - --t * t);
			},
			easeInOutCirc: function(t) {
				return t < .5 ? (1 - Math.sqrt(1 - 4 * t * t)) / 2 : (1 + Math.sqrt(1 - 4 * --t * t)) / 2;
			}
		}) },
		initialize: function Tween(object, from, to, duration, easing, start) {
			this.object = object;
			const type = typeof easing;
			const isFunction = type === "function";
			this.type = isFunction ? type : type === "string" ? easing : "linear";
			this.easing = isFunction ? easing : Tween.easings[this.type];
			this.duration = duration;
			this.running = false;
			this._then = null;
			this._startTime = null;
			const state = from || to;
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
				const factor = this.easing(progress);
				const keys = this._keys;
				const getValue = function(value) {
					return typeof value === "function" ? value(factor, progress) : value;
				};
				for (let i = 0, l = keys && keys.length; i < l; i++) {
					const key = keys[i];
					const from = getValue(this._from[key]);
					const to = getValue(this._to[key]);
					const value = from && to && from.multiply && to.multiply ? to.subtract(from).multiply(factor).add(from) : (to - from) * factor + from;
					this._setProperty(this._parsedKeys[key], value);
				}
				if (this.responds("update")) {
					this.emit("update", new Base({
						progress,
						factor
					}));
				}
				if (!this.running && this._then) {
					this._then(this.object);
				}
			}
			return this;
		},
		_events: { onUpdate: {} },
		_handleFrame: function(time) {
			let startTime = this._startTime;
			if (startTime == null) startTime = this._startTime = time;
			this.update((time - startTime) / this.duration);
		},
		_getState: function(state) {
			let value;
			const keys = this._keys;
			const result = {};
			for (let i = 0, l = keys.length; i < l; i++) {
				const key = keys[i];
				const path = this._parsedKeys[key];
				const current = this._getProperty(path);
				if (state) {
					const resolved = this._resolveValue(current, state[key]);
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
					const operator = value[0];
					return operator && operator.match && operator.match(/^[+\-*/]=/) ? this._calculate(current, operator[0], value[1]) : value;
				} else if (typeof value === "string") {
					const match = value.match(/^[+\-*/]=(.*)/);
					if (match) {
						const parsed = JSON.parse(match[1].replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, "\"$2\": "));
						return this._calculate(current, value[0], parsed);
					}
				}
			}
			return value;
		},
		_calculate: function(left, operator, right) {
			const name = {
				"+": "add",
				"-": "subtract",
				"*": "multiply",
				"/": "divide"
			}[operator];
			if (left && left[name]) return left[name](right);
			switch (operator) {
				case "+": return left + right;
				case "-": return left - right;
				case "*": return left * right;
				case "/": return left / right;
			}
		},
		_parseKeys: function(keys) {
			const parsed = {};
			for (let i = 0, l = keys.length; i < l; i++) {
				const key = keys[i];
				const path = key.replace(/\.([^.]*)/g, "/$1").replace(/\[['"]?([^'"\]]*)['"]?\]/g, "/$1");
				parsed[key] = path.split("/");
			}
			return parsed;
		},
		_getProperty: function(path, offset) {
			let obj = this.object;
			for (let i = 0, l = path.length - (offset || 0); i < l && obj; i++) {
				obj = obj[path[i]];
			}
			return obj;
		},
		_setProperty: function(path, value) {
			const dest = this._getProperty(path, 1);
			if (dest) {
				dest[path[path.length - 1]] = value;
			}
		}
	});
	const Http = { request: function(options) {
		const xhr = new self.XMLHttpRequest();
		xhr.open((options.method || "get").toUpperCase(), options.url, Base.pick(options.async, true));
		if (options.mimeType) xhr.overrideMimeType(options.mimeType);
		xhr.onload = function() {
			const status = xhr.status;
			if (status === 0 || status === 200) {
				if (options.onLoad) {
					options.onLoad.call(xhr, xhr.responseText);
				}
			} else {
				xhr.onerror();
			}
		};
		xhr.onerror = function() {
			const status = xhr.status;
			const message = "Could not load \"" + options.url + "\" (Status: " + status + ")";
			if (options.onError) {
				options.onError(message, status);
			} else {
				throw new Error(message);
			}
		};
		return xhr.send(null);
	} };
	const CanvasProvider = Base.exports.CanvasProvider = {
		canvases: [],
		getCanvas: function(width, height, options) {
			if (!window && !self.OffscreenCanvas) return null;
			if (typeof width === "object") {
				options = height;
				height = width.height;
				width = width.width;
			}
			const minimum = options && options.minimum;
			const canvases = this.canvases;
			const fits = function(canvas) {
				return minimum ? canvas.width >= width && canvas.height >= height : canvas.width === width && canvas.height === height;
			};
			let index = canvases.length - 1;
			for (let i = index; i >= 0; i--) {
				if (fits(canvases[i])) {
					index = i;
					break;
				}
			}
			const canvas = index >= 0 ? canvases.splice(index, 1)[0] : window ? document.createElement("canvas") : new self.OffscreenCanvas(width, height);
			const ctx = canvas.getContext("2d", options || {});
			if (!ctx) {
				throw new Error("Canvas " + canvas + " is unable to provide a 2D context.");
			}
			if (fits(canvas)) {
				if (ctx.reset) {
					ctx.reset();
				} else {
					ctx.setTransform(1, 0, 0, 1, 0, 0);
					ctx.clearRect(0, 0, canvas.width, canvas.height);
					ctx.globalAlpha = 1;
					ctx.globalCompositeOperation = "source-over";
					ctx.filter = "none";
					ctx.shadowColor = "transparent";
					ctx.shadowBlur = ctx.shadowOffsetX = ctx.shadowOffsetY = 0;
				}
			} else {
				canvas.width = width;
				canvas.height = height;
			}
			return canvas;
		},
		getContext: function(width, height, options) {
			const canvas = this.getCanvas(width, height, options);
			return canvas ? canvas.getContext("2d") : null;
		},
		release: function(obj) {
			const canvas = obj && obj.canvas ? obj.canvas : obj;
			if (canvas && canvas.getContext) {
				if (canvas.width * canvas.height > 256 * 256) canvas.width = canvas.height = 0;
				if (this.canvases.length < 8) this.canvases.push(canvas);
			}
		}
	};
	const BlendMode = new (function() {
		const min = Math.min;
		const max = Math.max;
		const abs = Math.abs;
		let sr;
		let sg;
		let sb;
		let sa;
		let br;
		let bg;
		let bb;
		let ba;
		let dr;
		let dg;
		let db;
		const modes = {
			"add": function() {
				dr = min(br + sr, 255);
				dg = min(bg + sg, 255);
				db = min(bb + sb, 255);
			},
			"subtract": function() {
				dr = max(br - sr, 0);
				dg = max(bg - sg, 0);
				db = max(bb - sb, 0);
			},
			"average": function() {
				dr = (br + sr) / 2;
				dg = (bg + sg) / 2;
				db = (bb + sb) / 2;
			},
			"pin-light": function() {
				dr = sr < 128 ? min(br, 2 * sr) : max(br, 2 * sr - 255);
				dg = sg < 128 ? min(bg, 2 * sg) : max(bg, 2 * sg - 255);
				db = sb < 128 ? min(bb, 2 * sb) : max(bb, 2 * sb - 255);
			},
			"negation": function() {
				dr = 255 - abs(255 - sr - br);
				dg = 255 - abs(255 - sg - bg);
				db = 255 - abs(255 - sb - bb);
			}
		};
		this.nativeModes = Base.each([
			"source-over",
			"source-in",
			"source-out",
			"source-atop",
			"destination-over",
			"destination-in",
			"destination-out",
			"destination-atop",
			"lighter",
			"darker",
			"copy",
			"xor",
			"multiply",
			"screen",
			"overlay",
			"soft-light",
			"hard-light",
			"color-dodge",
			"color-burn",
			"darken",
			"lighten",
			"difference",
			"exclusion",
			"hue",
			"saturation",
			"luminosity",
			"color"
		], function(mode) {
			this[mode] = true;
		}, Base.each(modes, function(process, mode) {
			this[mode] = false;
		}, {}));
		this.process = function(mode, srcContext, dstContext, alpha, offset, size) {
			const width = size.width;
			const height = size.height;
			const normal = mode === "normal";
			const process = modes[mode];
			if (!process) {
				dstContext.save();
				dstContext.setTransform(1, 0, 0, 1, 0, 0);
				dstContext.globalAlpha = alpha;
				if (!normal) dstContext.globalCompositeOperation = mode;
				dstContext.drawImage(srcContext.canvas, 0, 0, width, height, offset.x, offset.y, width, height);
				dstContext.restore();
			} else {
				const dstData = dstContext.getImageData(offset.x, offset.y, width, height);
				const dst = dstData.data;
				const src = srcContext.getImageData(0, 0, width, height).data;
				for (let i = 0, l = dst.length; i < l; i += 4) {
					sr = src[i];
					br = dst[i];
					sg = src[i + 1];
					bg = dst[i + 1];
					sb = src[i + 2];
					bb = dst[i + 2];
					sa = src[i + 3];
					ba = dst[i + 3];
					process();
					const a1 = sa * alpha / 255;
					const a2 = 1 - a1;
					dst[i] = a1 * dr + a2 * br;
					dst[i + 1] = a1 * dg + a2 * bg;
					dst[i + 2] = a1 * db + a2 * bb;
					dst[i + 3] = sa * alpha + a2 * ba;
				}
				dstContext.putImageData(dstData, offset.x, offset.y);
			}
		};
	})();
	const SvgElement = new (function() {
		const svg = "http://www.w3.org/2000/svg";
		const xmlns = "http://www.w3.org/2000/xmlns";
		const xlink = "http://www.w3.org/1999/xlink";
		const attributeNamespace = {
			"href": xlink,
			"xlink": xmlns,
			"xmlns": xmlns + "/",
			"xmlns:xlink": xmlns + "/"
		};
		function create(tag, attributes, formatter) {
			return set(document.createElementNS(svg, tag), attributes, formatter);
		}
		function get(node, name) {
			const namespace = attributeNamespace[name];
			const value = namespace ? node.getAttribute(name) || node.getAttributeNS(namespace, name) : node.getAttribute(name);
			return value === "null" ? null : value;
		}
		function set(node, attributes, formatter) {
			for (const name in attributes) {
				let value = attributes[name];
				const namespace = attributeNamespace[name];
				if (typeof value === "number" && formatter) value = formatter.number(value);
				if (namespace) {
					node.setAttributeNS(namespace, name, value);
				} else {
					node.setAttribute(name, value);
				}
			}
			return node;
		}
		return {
			svg,
			xmlns,
			xlink,
			create,
			get,
			set
		};
	})();
	const SvgStyles = Base.each({
		fillColor: ["fill", "color"],
		fillRule: ["fill-rule", "string"],
		strokeColor: ["stroke", "color"],
		strokeWidth: ["stroke-width", "number"],
		strokeCap: ["stroke-linecap", "string"],
		strokeJoin: ["stroke-linejoin", "string"],
		strokeScaling: [
			"vector-effect",
			"lookup",
			{
				true: "none",
				false: "non-scaling-stroke"
			},
			function(item, value) {
				return !value && (item instanceof PathItem || item instanceof Shape || item instanceof TextItem);
			}
		],
		miterLimit: ["stroke-miterlimit", "number"],
		dashArray: ["stroke-dasharray", "array"],
		dashOffset: ["stroke-dashoffset", "number"],
		paintOrder: ["paint-order", "order"],
		fontFamily: ["font-family", "string"],
		fontWeight: ["font-weight", "font"],
		fontSize: ["font-size", "number"],
		letterTracking: ["letter-spacing", "tracking"],
		justification: [
			"text-anchor",
			"lookup",
			{
				justify: "start",
				start: "start",
				end: "end",
				left: "start",
				center: "middle",
				right: "end"
			}
		],
		opacity: [
			"opacity",
			"number",
			null,
			function(item, value) {
				return value !== 1;
			}
		],
		blendMode: [
			"mix-blend-mode",
			"style",
			null,
			function(item, value) {
				return value !== "normal";
			}
		]
	}, function(entry, key) {
		const part = Base.capitalize(key);
		const lookup = entry[2];
		this[key] = {
			type: entry[1],
			property: key,
			attribute: entry[0],
			toSVG: lookup,
			fromSVG: lookup && Base.each(lookup, function(value, name) {
				this[value] = name;
			}, {}),
			exportFilter: entry[3],
			get: "get" + part,
			set: "set" + part
		};
	}, {});
	new (function() {
		let definitions;
		let formatter;
		let parentStyles;
		let elementMatrix;
		function getTransform(matrix, coordinates, center) {
			const attrs = new Base();
			let trans = matrix.getTranslation();
			if (coordinates) {
				let point;
				if (matrix.isInvertible()) {
					matrix = matrix._shiftless();
					point = matrix._inverseTransform(trans);
					trans = null;
				} else {
					point = new Point();
				}
				attrs[center ? "cx" : "x"] = point.x;
				attrs[center ? "cy" : "y"] = point.y;
			}
			if (!matrix.isIdentity()) {
				const decomposed = matrix.decompose();
				if (decomposed) {
					const parts = [];
					const angle = decomposed.rotation;
					const scale = decomposed.scaling;
					const skew = decomposed.skewing;
					if (trans && !trans.isZero()) parts.push("translate(" + formatter.point(trans) + ")");
					if (angle) parts.push("rotate(" + formatter.number(angle) + ")");
					if (!Numerical.isZero(scale.x - 1) || !Numerical.isZero(scale.y - 1)) parts.push("scale(" + formatter.point(scale) + ")");
					if (skew.x) parts.push("skewX(" + formatter.number(skew.x) + ")");
					if (skew.y) parts.push("skewY(" + formatter.number(skew.y) + ")");
					attrs.transform = parts.join(" ");
				} else {
					attrs.transform = "matrix(" + matrix.getValues().join(",") + ")";
				}
			}
			elementMatrix = matrix;
			return attrs;
		}
		function exportGroup(item, options) {
			const attrs = getTransform(item._matrix);
			const children = item._children;
			const node = SvgElement.create("g", attrs, formatter);
			for (let i = 0, l = children.length; i < l; i++) {
				const child = children[i];
				if (child.isClipMask()) {
					const clip = exportClip(child, options);
					setDefinition(child, clip, "clip", options);
					SvgElement.set(node, { "clip-path": "url(#" + clip.id + ")" });
				} else {
					const childNode = exportSVG(child, options);
					if (childNode) node.appendChild(childNode);
				}
			}
			return node;
		}
		function exportClip(item, options) {
			const clip = SvgElement.create("clipPath");
			function addItem(item) {
				if (item instanceof Group) {
					const children = item._children;
					for (let i = 0, l = children.length; i < l; i++) {
						if (!children[i]._clipMask) addItem(children[i]);
					}
				} else {
					const node = exportSVG(item, options);
					if (node) clip.appendChild(node);
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
			const attrs = getTransform(item._matrix, true);
			const size = item.getSize();
			const image = item.getImage();
			const href = options.embedImages == false && image && image.src || item.toDataURL();
			attrs.x -= size.width / 2;
			attrs.y -= size.height / 2;
			if (options.reuseImages) {
				let node = getDefinition(href, "image");
				if (!node) {
					node = SvgElement.create("image", {
						width: size.width,
						height: size.height,
						href
					}, formatter);
					setDefinition(href, node, "image", options);
				}
				attrs.href = "#" + node.id;
				return SvgElement.create("use", attrs, formatter);
			} else {
				attrs.width = size.width;
				attrs.height = size.height;
				attrs.href = href;
				return SvgElement.create("image", attrs, formatter);
			}
		}
		function exportPath(item, options) {
			const matchShapes = options.matchShapes;
			const segmentsData = getSegmentsData(item);
			if (matchShapes && !segmentsData) {
				const shape = item.toShape(false);
				if (shape) return exportShape(shape, options);
			}
			const segments = item._segments;
			const length = segments.length;
			let type;
			const attrs = getTransform(item._matrix);
			if (matchShapes && length >= 2 && !item.hasHandles()) {
				if (length > 2) {
					type = item._closed ? "polygon" : "polyline";
					const parts = [];
					for (let i = 0; i < length; i++) {
						parts.push(formatter.point(segments[i]._point));
					}
					attrs.points = parts.join(" ");
				} else {
					type = "line";
					const start = segments[0]._point;
					const end = segments[1]._point;
					attrs.set({
						x1: start.x,
						y1: start.y,
						x2: end.x,
						y2: end.y
					});
				}
			} else {
				type = "path";
				attrs.d = item.getPathData(null, options.precision);
			}
			if (segmentsData) attrs["data-paper-segments"] = segmentsData;
			return SvgElement.create(type, attrs, formatter);
		}
		function exportShape(item) {
			let type = item._type;
			let radius = item._radius;
			const attrs = getTransform(item._matrix, true, type !== "rectangle");
			if (type === "rectangle") {
				type = "rect";
				const size = item._size;
				const width = size.width;
				const height = size.height;
				attrs.x -= width / 2;
				attrs.y -= height / 2;
				attrs.width = width;
				attrs.height = height;
				if (radius.isZero()) radius = null;
			}
			if (radius) {
				if (type === "circle") {
					attrs.r = radius;
				} else {
					attrs.rx = radius.width;
					attrs.ry = radius.height;
				}
			}
			return SvgElement.create(type, attrs, formatter);
		}
		function exportCompoundPath(item, options) {
			const attrs = getTransform(item._matrix);
			const data = item.getPathData(null, options.precision);
			const segmentsData = getSegmentsData(item);
			if (data) attrs.d = data;
			if (segmentsData) attrs["data-paper-segments"] = segmentsData;
			return SvgElement.create("path", attrs, formatter);
		}
		function getSegmentsData(item) {
			const paths = item._children || [item];
			let entries = null;
			let index = 0;
			for (let i = 0, l = paths.length; i < l; i++) {
				const segments = paths[i]._segments;
				for (let j = 0, m = segments.length; j < m; j++, index++) {
					const segment = segments[j];
					const name = segment._name;
					const data = segment._data;
					const hasData = data && !Base.equals(data, {});
					if (name || hasData) {
						const entry = (entries = entries || {})[index] = {};
						if (name) entry.name = name;
						if (hasData) entry.data = data;
					}
				}
			}
			return entries && JSON.stringify(entries);
		}
		function exportSymbolItem(item, options) {
			const attrs = getTransform(item._matrix, true);
			const definition = item._definition;
			let node = getDefinition(definition, "symbol");
			const definitionItem = definition._item;
			const bounds = definitionItem.getStrokeBounds();
			if (!node) {
				node = SvgElement.create("symbol", { viewBox: formatter.rectangle(bounds) });
				node.appendChild(exportSVG(definitionItem, options));
				setDefinition(definition, node, "symbol", options);
			}
			attrs.href = "#" + node.id;
			attrs.x += bounds.x;
			attrs.y += bounds.y;
			attrs.width = bounds.width;
			attrs.height = bounds.height;
			attrs.overflow = "visible";
			return SvgElement.create("use", attrs, formatter);
		}
		function exportGradient(color, options) {
			if (!elementMatrix.isIdentity()) {
				color = color.clone();
				color.transform(elementMatrix.inverted());
			}
			let gradientNode = getDefinition(color, "color");
			if (!gradientNode) {
				const gradient = color.getGradient();
				const radial = gradient._radial;
				const origin = color.getOrigin();
				const destination = color.getDestination();
				let attrs;
				if (radial) {
					const aspect = color.getAspect();
					let highlight = color.getHighlight();
					let center = origin;
					attrs = { r: origin.getDistance(destination) };
					if (aspect !== 1) {
						const angle = destination.subtract(origin).getAngle();
						const local = new Matrix().translate(origin).rotate(angle).scale(1, aspect);
						center = new Point();
						if (highlight) highlight = local._inverseTransform(highlight);
						attrs.gradientTransform = "translate(" + formatter.point(origin) + ") rotate(" + formatter.number(angle) + ") scale(1," + formatter.number(aspect) + ")";
					}
					attrs.cx = center.x;
					attrs.cy = center.y;
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
				attrs.gradientUnits = "userSpaceOnUse";
				gradientNode = SvgElement.create((radial ? "radial" : "linear") + "Gradient", attrs, formatter);
				const stops = gradient._stops;
				for (let i = 0, l = stops.length; i < l; i++) {
					const stop = stops[i];
					const stopColor = stop._color;
					const alpha = stopColor.getAlpha();
					const offset = stop._offset;
					attrs = { offset: offset == null ? i / (l - 1) : offset };
					if (stopColor) attrs["stop-color"] = stopColor.toCSS(true);
					if (alpha < 1) attrs["stop-opacity"] = alpha;
					gradientNode.appendChild(SvgElement.create("stop", attrs, formatter));
				}
				setDefinition(color, gradientNode, "color", options);
			}
			return "url(#" + gradientNode.id + ")";
		}
		function exportPattern(color, options) {
			const matrix = elementMatrix;
			if (!matrix.isIdentity()) {
				color = color.clone();
				color.transform(matrix.inverted());
			}
			let patternNode = getDefinition(color, "pattern");
			if (!patternNode) {
				const pattern = color.getPattern();
				const item = pattern._item;
				const tile = pattern.getTile();
				const spacing = pattern._spacing;
				const cell = new Rectangle(tile.getPoint(), tile.getSize().add(spacing));
				const transform = getTransform(color.getMatrix()).transform;
				const attrs = {
					x: cell.x,
					y: cell.y,
					width: cell.width,
					height: cell.height,
					viewBox: formatter.rectangle(cell),
					patternUnits: "userSpaceOnUse"
				};
				let content = exportSVG(item, options);
				if (transform) attrs.patternTransform = transform;
				patternNode = SvgElement.create("pattern", attrs, formatter);
				if (!spacing.isZero() && !tile.contains(item.getStrokeBounds())) {
					const rect = new Shape.Rectangle({
						rectangle: tile,
						insert: false
					});
					const clip = exportClip(rect, options);
					const group = SvgElement.create("g");
					setDefinition(rect, clip, "clip", options);
					group.setAttribute("clip-path", "url(#" + clip.id + ")");
					group.appendChild(content);
					content = group;
				}
				patternNode.appendChild(content);
				setDefinition(color, patternNode, "pattern", options);
			}
			elementMatrix = matrix;
			return "url(#" + patternNode.id + ")";
		}
		function exportShadow(item, options) {
			const box = item.getInternalBounds();
			if (!box.width || !box.height) return null;
			const style = item._style;
			const color = style.getShadowColor();
			const offset = style.getShadowOffset();
			const deviation = style.getShadowBlur() / 2;
			const bounds = item.getStrokeBounds(new Matrix());
			const rect = bounds.unite(new Rectangle(bounds.getPoint().add(offset), bounds.getSize())).expand(6 * deviation);
			const region = new Matrix().scale(100 / box.width, 100 / box.height).translate(box.getPoint().negate())._transformBounds(rect);
			const filter = SvgElement.create("filter");
			function add(type, attrs) {
				filter.appendChild(SvgElement.create(type, attrs, formatter));
			}
			Base.each([
				"x",
				"y",
				"width",
				"height"
			], function(key) {
				filter.setAttribute(key, formatter.number(region[key]) + "%");
			});
			if (deviation > 0) {
				add("feGaussianBlur", {
					in: "SourceAlpha",
					stdDeviation: deviation,
					result: "blur"
				});
			}
			add("feOffset", {
				in: deviation > 0 ? "blur" : "SourceAlpha",
				dx: offset.x,
				dy: offset.y,
				result: "offset"
			});
			add("feFlood", {
				"flood-color": color.toCSS(true),
				"flood-opacity": color.getAlpha(),
				"result": "color"
			});
			add("feComposite", {
				in: "color",
				in2: "offset",
				operator: "in",
				result: "shadow"
			});
			add("feComposite", {
				in: "SourceGraphic",
				in2: "shadow",
				operator: "over"
			});
			setDefinition(item, filter, "filter", options);
			return "url(#" + filter.id + ")";
		}
		function exportText(item, options) {
			let i;
			let l;
			let line;
			let span;
			const attrs = getTransform(item._matrix, true);
			const node = SvgElement.create("text", attrs, formatter);
			const story = item._story;
			const lines = item._getLayout();
			const isPointText = item instanceof PointText;
			function createSpan(content, style, spanAttrs, isParagraph) {
				spanAttrs = Base.set({}, spanAttrs);
				Base.each(SvgStyles, function(entry) {
					if (entry.property in story._paragraphKeys === isParagraph && item[entry.get]() === undefined) {
						const value = style[entry.get]();
						if (value !== undefined) setAttributes(spanAttrs, [], entry, value, options);
					}
				});
				const span = SvgElement.create("tspan", spanAttrs, formatter);
				if (content != null) span.textContent = content;
				return span;
			}
			function addRuns(parent, line) {
				let i;
				let l;
				const pieces = line.pieces;
				const runs = [];
				for (i = 0, l = pieces.length; i < l; i++) {
					const piece = pieces[i];
					const last = runs[runs.length - 1];
					if (last && last.style.equals(piece.style)) {
						last.content += piece.content;
					} else {
						runs.push({
							content: piece.content,
							style: piece.style
						});
					}
				}
				const isMixed = runs.some(function(run) {
					return createSpan(null, run.style, null, false).attributes.length > 0;
				});
				if (isMixed) {
					for (i = 0, l = runs.length; i < l; i++) {
						parent.appendChild(createSpan(runs[i].content, runs[i].style, null, false));
					}
				} else {
					parent.textContent = runs.map(function(run) {
						return run.content;
					}).join("");
				}
			}
			if (isPointText) {
				if (lines.length > 1) {
					for (i = 0, l = lines.length; i < l; i++) {
						line = lines[i];
						const paragraph = story._getParagraph(line.start).style;
						const side = item._getSide(paragraph.getJustification(), paragraph.getDirection());
						span = createSpan(null, paragraph, {
							x: attrs.x + line.x + (side === "right" ? line.width : side === "center" ? line.width / 2 : 0),
							y: attrs.y + line.y
						}, true);
						addRuns(span, line);
						node.appendChild(span);
					}
				} else if (lines.length) {
					addRuns(node, lines[0]);
				}
			} else {
				const justification = item.getJustification();
				const anchor = justification && justification !== "left" && { "text-anchor": "start" };
				for (i = 0, l = lines.length; i < l; i++) {
					line = lines[i];
					const pieces = line.pieces;
					span = SvgElement.create("tspan", Base.set({
						x: attrs.x + line.x,
						y: attrs.y + line.y
					}, anchor), formatter);
					for (let j = 0, m = pieces.length; j < m; j++) {
						const piece = pieces[j];
						const angle = piece.rotation;
						const origin = new Point(piece.dx || 0, 0).rotate(angle).add(piece.x, line.y + piece.y);
						const pieceAttrs = {
							x: attrs.x + origin.x,
							y: attrs.y + origin.y
						};
						if (angle) pieceAttrs.rotate = angle;
						span.appendChild(createSpan(piece.content, piece.style, pieceAttrs, false));
					}
					node.appendChild(span);
				}
			}
			return node;
		}
		const exporters = {
			Group: exportGroup,
			Layer: exportGroup,
			Raster: exportRaster,
			Path: exportPath,
			Shape: exportShape,
			CompoundPath: exportCompoundPath,
			SymbolItem: exportSymbolItem,
			PointText: exportText,
			PathText: exportText,
			AreaText: exportText
		};
		const cssBlendModes = Base.each([
			"normal",
			"multiply",
			"screen",
			"overlay",
			"darken",
			"lighten",
			"color-dodge",
			"color-burn",
			"hard-light",
			"soft-light",
			"difference",
			"exclusion",
			"hue",
			"saturation",
			"color",
			"luminosity"
		], function(mode) {
			this[mode] = true;
		}, {});
		function setAttributes(attrs, style, entry, value, options) {
			const type = entry.type;
			if (type === "color" && value != null) {
				const alpha = value.getAlpha();
				if (alpha < 1) attrs[entry.attribute + "-opacity"] = alpha;
			}
			if (type === "style") {
				if (cssBlendModes[value]) {
					style.push(entry.attribute + ": " + value);
				} else {
					attrs["data-paper-blend-mode"] = value;
				}
			} else if (type === "font") {
				const font = ("" + value).match(/^(.*?)\s*\b(italic|oblique)\b\s*(.*)$/i);
				attrs[entry.attribute] = font ? (font[1] + " " + font[3]).trim() || "normal" : value;
				if (font) attrs["font-style"] = font[2].toLowerCase();
			} else {
				attrs[entry.attribute] = value == null ? "none" : type === "color" ? value.gradient ? exportGradient(value, options) : value.pattern ? exportPattern(value, options) : value.toCSS(true) : type === "array" ? value.join(",") : type === "lookup" ? entry.toSVG[value] : type === "tracking" ? value && value / 1e3 + "em" : value;
			}
		}
		function applyStyle(item, node, options, isRoot) {
			const attrs = {};
			const parent = !isRoot && item.getParent();
			const parentStyle = parent && (parentStyles[parent._id] = parentStyles[parent._id] || {});
			const isGroup = item instanceof Group;
			const style = [];
			if (item._name != null) attrs.id = item._name;
			Base.each(SvgStyles, function(entry) {
				const get = entry.get;
				const value = item[get]();
				const isPaintServer = entry.type === "color" && value && (value.gradient || value.pattern);
				if (parent && !(get in parentStyle)) parentStyle[get] = parent[get]();
				if (value !== undefined && (isPaintServer ? !isGroup : entry.exportFilter ? entry.exportFilter(item, value) : options.reduceAttributes == false || !parent || !Base.equals(parentStyle[get], value))) {
					setAttributes(attrs, style, entry, value, options);
				}
			});
			const filter = item._style.getShadowColor(true) && item.hasShadow() && exportShadow(item, options);
			if (filter) attrs.filter = filter;
			if (style.length) attrs.style = style.join(";");
			if (!item._visible) attrs.visibility = "hidden";
			return SvgElement.set(node, attrs, formatter);
		}
		function getDefinition(item, type) {
			if (!definitions) definitions = {
				ids: {},
				svgs: {}
			};
			return item && definitions.svgs[getDefinitionKey(item, type)];
		}
		function setDefinition(item, node, type, options) {
			if (!definitions) getDefinition();
			const typeId = definitions.ids[type] = (definitions.ids[type] || 0) + 1;
			node.id = (options.idPrefix || "") + type + "-" + typeId;
			definitions.svgs[getDefinitionKey(item, type)] = node;
		}
		function getDefinitionKey(item, type) {
			return type + "-" + (typeof item === "string" ? item : item._id || item.__id || (item.__id = UID.get("svg")));
		}
		function exportDefinitions(node, options) {
			let svg = node;
			let defs = null;
			if (definitions) {
				svg = node.nodeName.toLowerCase() === "svg" && node;
				for (const i in definitions.svgs) {
					if (!defs) {
						if (!svg) {
							svg = SvgElement.create("svg");
							svg.appendChild(node);
						}
						defs = svg.insertBefore(SvgElement.create("defs"), svg.firstChild);
					}
					defs.appendChild(definitions.svgs[i]);
				}
				definitions = null;
			}
			parentStyles = null;
			return options.asString ? new self.XMLSerializer().serializeToString(svg).replace(/<defs>|<\/filter>|<\/defs>/g, "$&\n") : svg;
		}
		function exportSVG(item, options, isRoot) {
			let output = item.getEffectOutput();
			if (output) {
				output = output.clone({ insert: false });
				output.transform(item._matrix);
				return exportSVG(output, options, isRoot);
			}
			const exporter = exporters[item._class];
			let node = exporter && exporter(item, options);
			if (node) {
				const onExport = options.onExport;
				const processNode = options.processNode || onExport && function(arg) {
					return onExport(arg.item, arg.node, options);
				};
				if (processNode) node = processNode({
					item,
					node
				}) || node;
				const data = JSON.stringify(item._data);
				if (data && data !== "{}" && data !== "null") node.setAttribute("data-paper-data", data);
				if (item instanceof Layer) node.setAttribute("data-paper-layer", "");
			}
			return node && applyStyle(item, node, options, isRoot);
		}
		function setOptions(options) {
			if (!options) options = {};
			formatter = new Formatter(options.precision);
			parentStyles = {};
			return options;
		}
		function exportRoot(items, view, bounds, options) {
			const mx = options.matrix || bounds === "view" && view._matrix;
			const matrix = mx && Matrix.read([mx]);
			const rect = bounds === "view" ? new Rectangle([0, 0], view.getViewSize()) : bounds === "content" ? Item._getBounds(items, matrix, { stroke: true }).rect : Rectangle.read([bounds], 0, { readNull: true });
			const attrs = {
				"version": "1.1",
				"xmlns": SvgElement.svg,
				"xmlns:xlink": SvgElement.xlink
			};
			if (rect) {
				attrs.width = rect.width;
				attrs.height = rect.height;
				if (rect.x || rect.x === 0 || rect.y || rect.y === 0) attrs.viewBox = formatter.rectangle(rect);
			}
			const node = SvgElement.create("svg", attrs, formatter);
			let parent = node;
			if (matrix && !matrix.isIdentity()) {
				parent = node.appendChild(SvgElement.create("g", getTransform(matrix), formatter));
			}
			for (let i = 0, l = items.length; i < l; i++) {
				parent.appendChild(exportSVG(items[i], options, true));
			}
			return exportDefinitions(node, options);
		}
		Item.inject({ exportSVG: function(options) {
			options = setOptions(options);
			const bounds = options.bounds;
			return bounds || options.matrix ? exportRoot([this], this.getView(), bounds, options) : exportDefinitions(exportSVG(this, options, true), options);
		} });
		Project.inject({ exportSVG: function(options) {
			options = setOptions(options);
			return exportRoot(this._children, this.getView(), Base.pick(options.bounds, "view"), options);
		} });
	})();
	new (function() {
		let definitions = {};
		const used = {};
		let rootSize;
		const units = {
			in: 96,
			pt: 96 / 72,
			pc: 96 / 6,
			cm: 96 / 2.54,
			mm: 96 / 25.4
		};
		function parseLength(value) {
			const unit = /(in|pt|pc|cm|mm)\s*$/.exec(value);
			return parseFloat(value) * (unit ? units[unit[1]] : 1);
		}
		function getValue(node, name, isString, allowNull, allowPercent, defaultValue) {
			const value = SvgElement.get(node, name) || defaultValue;
			const res = value == null ? allowNull ? null : isString ? "" : 0 : isString ? value : parseLength(value);
			return /%\s*$/.test(value) ? res / 100 * (allowPercent ? 1 : rootSize[/x|^width/.test(name) ? "width" : "height"]) : res;
		}
		function getPoint(node, x, y, allowNull, allowPercent, defaultX, defaultY) {
			x = getValue(node, x || "x", false, allowNull, allowPercent, defaultX);
			y = getValue(node, y || "y", false, allowNull, allowPercent, defaultY);
			return allowNull && (x == null || y == null) ? null : new Point(x, y);
		}
		function getSize(node, w, h, allowNull, allowPercent) {
			w = getValue(node, w || "width", false, allowNull, allowPercent);
			h = getValue(node, h || "height", false, allowNull, allowPercent);
			return allowNull && (w == null || h == null) ? null : new Size(w, h);
		}
		function convertValue(value, type, lookup, options) {
			return value === "none" ? null : type === "number" ? parseLength(value) : type === "array" ? value ? value.split(/[\s,]+/g).map(parseLength) : [] : type === "color" ? getDefinition(value, options) || value : type === "lookup" ? lookup[value] : type === "order" ? /^(markers\s+)?stroke\b/.test(value) ? "stroke" : "fill" : value;
		}
		function importGroup(node, type, options, isRoot) {
			let i;
			let l;
			let child;
			const nodes = node.childNodes;
			const isClip = type === "clippath" || type === "mask";
			const isDefs = type === "defs";
			const isPattern = type === "pattern";
			const ctor = node.hasAttribute("data-paper-layer") ? Layer : Group;
			let item = new ctor();
			const project = item._project;
			const currentStyle = project._currentStyle;
			const parentSize = rootSize;
			const children = [];
			if (!isClip && !isDefs && !isPattern) {
				item = applyAttributes(item, node, options, isRoot);
				project._currentStyle = item._style.clone();
			}
			if (type === "svg" && !isRoot) {
				rootSize = new Size(getValue(node, "width", false, false, false, "100%"), getValue(node, "height", false, false, false, "100%"));
			}
			if (isRoot) {
				const defs = node.querySelectorAll("defs");
				for (i = 0, l = defs.length; i < l; i++) {
					importNode(defs[i], options, false);
				}
			}
			for (i = 0, l = nodes.length; i < l; i++) {
				const childNode = nodes[i];
				if (childNode.nodeType === 1 && !/^defs$/i.test(childNode.nodeName) && (child = importNode(childNode, options, false)) && !(child instanceof SymbolDefinition)) children.push(child);
			}
			item.addChildren(children);
			if (isClip) {
				item = applyAttributes(item.reduce(), node, options, isRoot);
				if (type === "mask" && !isClipMask(item, SvgElement.get(node, "mask-type") === "alpha")) console.warn("Approximating SVG mask '" + node.id + "' as a clipping mask.");
			}
			project._currentStyle = currentStyle;
			rootSize = parentSize;
			if (isClip || isDefs) {
				item.remove();
				item = null;
			}
			return item;
		}
		function isClipMask(item, isAlpha) {
			if (item.getOpacity() !== 1) return false;
			if (item instanceof Group) {
				return item._children.every(function(child) {
					return isClipMask(child, isAlpha);
				});
			}
			const color = item.getFillColor();
			return (item instanceof PathItem || item instanceof Shape) && !item.hasStroke() && !!color && !color.gradient && !color.pattern && color.getAlpha() === 1 && (isAlpha || color.getBrightness() === 1 && color.getSaturation() === 0);
		}
		function importPoly(node, type) {
			const coords = node.getAttribute("points").match(/[+-]?(?:\d*\.\d+|\d+\.?)(?:[eE][+-]?\d+)?/g);
			const points = [];
			for (let i = 0, l = coords.length; i < l; i += 2) points.push(new Point(parseFloat(coords[i]), parseFloat(coords[i + 1])));
			const path = new Path(points);
			if (type === "polygon") path.closePath();
			return path;
		}
		function importPath(node) {
			return PathItem.create(node.getAttribute("d"));
		}
		function importGradient(node, type, options) {
			const id = (getValue(node, "href", true) || "").substring(1);
			const definition = getDefinitionById(id, options);
			const radial = type === "radialgradient";
			let gradient;
			if (definition) {
				gradient = definition.getGradient();
				if (gradient._radial ^ radial) {
					gradient = gradient.clone();
					gradient._radial = radial;
				}
			} else {
				const nodes = node.childNodes;
				const stops = [];
				for (let i = 0, l = nodes.length; i < l; i++) {
					const child = nodes[i];
					if (child.nodeType === 1) stops.push(applyAttributes(new GradientStop(), child, options));
				}
				gradient = new Gradient(stops, radial);
			}
			let origin;
			let destination;
			let highlight;
			const scaleToBounds = getValue(node, "gradientUnits", true) !== "userSpaceOnUse";
			if (radial) {
				origin = getPoint(node, "cx", "cy", false, scaleToBounds, "50%", "50%");
				destination = origin.add(getValue(node, "r", false, false, scaleToBounds, "50%"), 0);
				highlight = getPoint(node, "fx", "fy", true, scaleToBounds);
			} else {
				origin = getPoint(node, "x1", "y1", false, scaleToBounds, "0%", "0%");
				destination = getPoint(node, "x2", "y2", false, scaleToBounds, "100%", "0%");
			}
			const color = applyAttributes(new Color(gradient, origin, destination, highlight), node, options);
			color._scaleToBounds = scaleToBounds;
			return null;
		}
		function importPattern(node, type, options) {
			const item = importGroup(node, type, options);
			const tile = new Rectangle(getPoint(node), getSize(node));
			const viewBox = getValue(node, "viewBox", true);
			const matrix = new Matrix().translate(tile.getPoint());
			if (viewBox) {
				const rect = new Rectangle(convertValue(viewBox, "array"));
				matrix.scale(tile.getSize().divide(rect.getSize())).translate(rect.getPoint().negate());
			}
			item.transform(matrix);
			applyAttributes(new Color(new PatternDefinition(item, { tile })), node, options);
			return null;
		}
		const importers = {
			"#document": function(node, type, options, isRoot) {
				const nodes = node.childNodes;
				for (let i = 0, l = nodes.length; i < l; i++) {
					const child = nodes[i];
					if (child.nodeType === 1) return importNode(child, options, isRoot);
				}
			},
			"g": importGroup,
			"svg": importGroup,
			"clippath": importGroup,
			"mask": importGroup,
			"polygon": importPoly,
			"polyline": importPoly,
			"path": importPath,
			"lineargradient": importGradient,
			"radialgradient": importGradient,
			"pattern": importPattern,
			"image": function(node, type, options) {
				const raster = new Raster({
					crossOrigin: options.crossOrigin,
					source: getValue(node, "href", true)
				});
				const align = /none|x(Min|Mid|Max)Y(Min|Mid|Max)/.exec(getValue(node, "preserveAspectRatio", true)) || [
					null,
					"Mid",
					"Mid"
				];
				raster.on("load", function() {
					const imageSize = this.getSize();
					let size = getSize(node, null, null, true) || imageSize;
					let point = getPoint(node);
					if (align[0] !== "none") {
						const factors = {
							Min: 0,
							Mid: .5,
							Max: 1
						};
						const fitted = imageSize.multiply(Math.min(size.width / imageSize.width, size.height / imageSize.height));
						point = point.add(size.subtract(fitted).multiply([factors[align[1]], factors[align[2]]]));
						size = fitted;
					}
					const center = point.add(size.divide(2));
					this._matrix.append(new Matrix().translate(center).scale(size.divide(imageSize)));
				});
				return raster;
			},
			"symbol": function(node, type, options, isRoot) {
				return new SymbolDefinition(importGroup(node, type, options, isRoot), true);
			},
			"defs": importGroup,
			"use": function(node, type, options) {
				const id = (getValue(node, "href", true) || "").substring(1);
				const definition = getDefinitionById(id, options);
				const point = getPoint(node);
				let item = null;
				if (definition instanceof SymbolDefinition) {
					item = definition.place(point);
				} else if (definition && !used[id]) {
					used[id] = true;
					try {
						item = importNode(getElementById(id), options, false).translate(point);
					} finally {
						delete used[id];
					}
				}
				return item;
			},
			"circle": function(node) {
				return new Shape.Circle(getPoint(node, "cx", "cy"), getValue(node, "r"));
			},
			"ellipse": function(node) {
				return new Shape.Ellipse({
					center: getPoint(node, "cx", "cy"),
					radius: getSize(node, "rx", "ry")
				});
			},
			"rect": function(node) {
				const rx = getValue(node, "rx", false, true);
				const ry = getValue(node, "ry", false, true);
				return new Shape.Rectangle(new Rectangle(getPoint(node), getSize(node)), new Size(rx == null ? ry || 0 : rx, ry == null ? rx || 0 : ry));
			},
			"line": function(node) {
				return new Path.Line(getPoint(node, "x1", "y1"), getPoint(node, "x2", "y2"));
			},
			"text": function(node) {
				const text = new PointText(getPoint(node).add(getPoint(node, "dx", "dy")));
				const lines = Base.each(node.childNodes, function(child) {
					if (/^tspan$/i.test(child.nodeName) && child.hasAttribute("y")) this.push(child.textContent.trim());
				}, []);
				text.setContent(lines.length > 1 ? lines.join("\n") : node.textContent.trim());
				return text;
			},
			"switch": importGroup
		};
		function applyTransform(item, value, name, node) {
			if (item.transform) {
				const transforms = (node.getAttribute(name) || "").split(/\)\s*/g);
				const matrix = new Matrix();
				for (let i = 0, l = transforms.length; i < l; i++) {
					const transform = transforms[i];
					if (!transform) break;
					const parts = transform.split(/\(\s*/);
					const command = parts[0].trim();
					const v = parts[1].split(/[\s,]+/g);
					for (let j = 0, m = v.length; j < m; j++) v[j] = parseFloat(v[j]);
					switch (command) {
						case "matrix":
							matrix.append(new Matrix(v[0], v[1], v[2], v[3], v[4], v[5]));
							break;
						case "rotate":
							matrix.rotate(v[0], v[1] || 0, v[2] || 0);
							break;
						case "translate":
							matrix.translate(v[0], v[1] || 0);
							break;
						case "scale":
							matrix.scale(v);
							break;
						case "skewX":
							matrix.skew(v[0], 0);
							break;
						case "skewY":
							matrix.skew(0, v[0]);
							break;
					}
				}
				item.transform(matrix);
			}
		}
		function applyClipMask(item, value, name, node, styles, options) {
			let clip = getDefinition(value, options);
			if (clip) {
				clip = clip.clone();
				clip.setClipMask(true);
				if (item instanceof Group) {
					item.insertChild(0, clip);
				} else {
					return new Group(clip, item);
				}
			}
		}
		function applyOpacity(item, value, name) {
			const key = name === "fill-opacity" ? "getFillColor" : "getStrokeColor";
			const color = item[key] && item[key]();
			if (color) color.setAlpha(parseFloat(value));
		}
		const shadowPrimitives = "feOffset,feFlood,feComposite,feComposite";
		function getFilterShadow(filter) {
			const nodes = Base.slice(filter && filter.children || []);
			const names = nodes.map(function(node) {
				return node.nodeName;
			}).join();
			const blur = names === "feGaussianBlur," + shadowPrimitives && nodes.shift();
			if (!blur && names !== shadowPrimitives) return null;
			const offset = nodes[0];
			const flood = nodes[1];
			const color = new Color(flood.getAttribute("flood-color") || "black");
			const opacity = flood.getAttribute("flood-opacity");
			if (opacity) color.setAlpha(color.getAlpha() * parseFloat(opacity));
			return {
				color,
				blur: blur ? 2 * parseFloat(blur.getAttribute("stdDeviation")) : 0,
				offset: new Point(parseFloat(offset.getAttribute("dx")) || 0, parseFloat(offset.getAttribute("dy")) || 0)
			};
		}
		function getCssShadow(value) {
			const match = value.match(/^\s*drop-shadow\((.*)\)\s*$/);
			const color = match && match[1].match(/(?:rgba?|hsla?)\([^)]*\)|#[0-9a-f]+|\b[a-z]+\b/i);
			const lengths = match && match[1].replace(color && color[0], "").match(/-?[\d.]+/g);
			return lengths && lengths.length >= 2 ? {
				color: new Color(color ? color[0] : "black"),
				blur: parseFloat(lengths[2]) || 0,
				offset: new Point(parseFloat(lengths[0]), parseFloat(lengths[1]))
			} : null;
		}
		const attributes = Base.set(Base.each(SvgStyles, function(entry) {
			this[entry.attribute] = function(item, value, name, node, styles, options) {
				if (item[entry.set]) {
					item[entry.set](convertValue(value, entry.type, entry.fromSVG, options));
					if (entry.type === "color") {
						const color = item[entry.get]();
						if (color) {
							if (color._scaleToBounds) {
								const bounds = item.getBounds();
								color.transform(new Matrix().translate(bounds.getPoint()).scale(bounds.getSize()));
							}
						}
					}
				}
			};
		}, {}), {
			"id": function(item, value) {
				definitions[value] = item;
				if (item.setName && value !== +value + "") item.setName(value);
			},
			"clip-path": applyClipMask,
			"mask": applyClipMask,
			"gradientTransform": applyTransform,
			"patternTransform": applyTransform,
			"transform": applyTransform,
			"fill-opacity": applyOpacity,
			"stroke-opacity": applyOpacity,
			"visibility": function(item, value) {
				if (item.setVisible) item.setVisible(value === "visible");
			},
			"display": function(item, value) {
				if (item.setVisible) item.setVisible(value !== null);
			},
			"filter": function(item, value) {
				const shadow = value && !(item instanceof Group) && item.setShadowColor && (/^url\(/.test(value) ? getFilterShadow(getElementById(getDefinitionId(value))) : getCssShadow(value));
				if (shadow) {
					item.setShadowColor(shadow.color);
					item.setShadowBlur(shadow.blur);
					item.setShadowOffset(shadow.offset);
				}
			},
			"data-paper-blend-mode": function(item, value) {
				if (item.setBlendMode) item.setBlendMode(value);
			},
			"font-style": function(item, value) {
				if (item.setFontWeight && /^(italic|oblique)$/.test(value)) {
					const weight = ("" + item.getFontWeight()).replace(/\s*\b(italic|oblique)\b/gi, "");
					item.setFontWeight(/^(normal|400)$/.test(weight) ? value : weight + " " + value);
				}
			},
			"letter-spacing": function(item, value) {
				if (item.setLetterTracking) {
					const amount = parseFloat(value) || 0;
					item.setLetterTracking(1e3 * (/em$/.test(value) ? amount : amount / parseFloat(item.getFontSize())));
				}
			},
			"stop-color": function(item, value) {
				if (item.setColor) item.setColor(value);
			},
			"stop-opacity": function(item, value) {
				if (item._color) item._color.setAlpha(parseFloat(value));
			},
			"offset": function(item, value) {
				if (item.setOffset) {
					const percent = value.match(/(.*)%$/);
					item.setOffset(percent ? percent[1] / 100 : parseFloat(value));
				}
			},
			"viewBox": function(item, value, name, node, styles) {
				let matrix;
				const rect = new Rectangle(convertValue(value, "array"));
				const size = getSize(node, null, null, true);
				let group;
				if (item instanceof Group) {
					const scale = size ? size.divide(rect.getSize()) : 1;
					matrix = new Matrix().scale(scale).translate(rect.getPoint().negate());
					group = item;
				} else if (item instanceof SymbolDefinition) {
					if (size) rect.setSize(size);
					group = item._item;
				}
				if (group) {
					if (getAttribute(node, "overflow", styles) !== "visible") {
						const clip = new Shape.Rectangle(rect);
						clip.setClipMask(true);
						group.addChild(clip);
					}
					if (matrix) group.transform(matrix);
				}
			}
		});
		function getAttribute(node, name, styles) {
			const style = Base.camelize(name);
			let value = node.style && node.style[style];
			if (!value) {
				const attr = node.attributes[name];
				value = attr && attr.value;
				if (!value && node.style && styles.node[style] !== styles.parent[style]) value = styles.node[style];
			}
			return !value ? undefined : value === "none" ? null : value;
		}
		function applyAttributes(item, node, options, isRoot) {
			const parent = node.parentNode;
			const styles = {
				node: DomElement.getStyles(node) || {},
				parent: !isRoot && DomElement.getStyles(parent) || {}
			};
			if (isRoot && !styles.node.fill && item.setFillColor) item.setFillColor("black");
			Base.each(attributes, function(apply, name) {
				const value = getAttribute(node, name, styles);
				item = value !== undefined && apply(item, value, name, node, styles, options) || item;
			});
			return item;
		}
		function getDefinitionById(id, options) {
			if (id && !definitions[id]) {
				const node = getElementById(id);
				if (node) importNode(node, options, false);
			}
			return definitions[id];
		}
		function getDefinitionId(value) {
			const match = value && value.match(/\((?:["'#]*)([^"')]+)/);
			const name = match && match[1];
			return name && window ? name.replace(window.location.href.split("#")[0] + "#", "") : name;
		}
		function getDefinition(value, options) {
			const id = getDefinitionId(value);
			let res = id && getDefinitionById(id, options);
			if (res && res._scaleToBounds) {
				res = res.clone();
				res._scaleToBounds = true;
			}
			return res;
		}
		function getData(node) {
			let data = null;
			const attributes = node.attributes;
			const json = node.getAttribute("data-paper-data");
			for (let i = 0, l = attributes.length; i < l; i++) {
				const match = attributes[i].name.match(/^data-(?!paper-)(.+)$/);
				if (match) {
					data = data || {};
					data[Base.camelize(match[1])] = attributes[i].value;
				}
			}
			return json ? Base.set(data || {}, JSON.parse(json)) : data;
		}
		function setSegmentsData(item, node) {
			const json = node.getAttribute("data-paper-segments");
			if (json) {
				const entries = JSON.parse(json);
				const paths = item._children || [item];
				const segments = [];
				for (let i = 0, l = paths.length; i < l; i++) segments.push.apply(segments, paths[i]._segments);
				if (Math.max.apply(Math, Object.keys(entries)) < segments.length) {
					for (const index in entries) {
						const entry = entries[index];
						const segment = segments[index];
						if (entry.name) segment.setName(entry.name);
						if (entry.data) segment._data = entry.data;
					}
				}
			}
		}
		let sandbox;
		function getSandbox() {
			if (!(sandbox && sandbox.contentDocument)) {
				sandbox = document.createElement("iframe");
				sandbox.setAttribute("sandbox", "allow-same-origin");
				sandbox.style.cssText = "position: absolute; visibility: hidden;" + " width: 0; height: 0; border: 0";
				document.body.appendChild(sandbox);
				const doc = sandbox.contentDocument;
				const meta = doc.createElement("meta");
				meta.httpEquiv = "Content-Security-Policy";
				meta.content = "default-src 'none'; style-src 'unsafe-inline'";
				doc.head.appendChild(meta);
			}
			return sandbox.contentDocument.body;
		}
		function getElementById(id) {
			return getSandbox().ownerDocument.getElementById(id);
		}
		function importNode(node, options, isRoot) {
			const type = node.nodeName.toLowerCase();
			const isElement = type !== "#document";
			let container;
			let parent;
			let next;
			if (isRoot && isElement) {
				rootSize = paper.getView().getSize();
				rootSize = getSize(node, null, null, true) || rootSize;
				container = SvgElement.create("svg", { style: "stroke-width: 1px; stroke-miterlimit: 10" });
				parent = node.parentNode;
				next = node.nextSibling;
				container.appendChild(node);
				getSandbox().appendChild(container);
			}
			const settings = paper.settings;
			const applyMatrix = settings.applyMatrix;
			const insertItems = settings.insertItems;
			const importer = importers[type];
			let item;
			try {
				settings.applyMatrix = false;
				settings.insertItems = false;
				try {
					item = importer && importer(node, type, options, isRoot) || null;
				} finally {
					settings.insertItems = insertItems;
					settings.applyMatrix = applyMatrix;
				}
				if (item) {
					if (isElement && item instanceof PathItem) setSegmentsData(item, node);
					if (isElement && importer !== importGroup) item = applyAttributes(item, node, options, isRoot);
					const data = isElement && getData(node);
					if (data) item._data = data;
					const onImport = options.onImport;
					const processItem = isElement && (options.processItem || onImport && function(arg) {
						return onImport(arg.node, arg.item, options);
					});
					if (processItem) item = processItem({
						item,
						node
					}) || item;
					if (options.expandShapes && item instanceof Shape) {
						item.remove();
						item = item.toPath();
					}
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
				if (isRoot) definitions = {};
			}
			if (isRoot && item && Base.pick(options.applyMatrix, applyMatrix)) item.matrix.apply(true, true);
			return item;
		}
		function importSVG(source, options, owner) {
			if (!source) return null;
			options = typeof options === "function" ? { onLoad: options } : options || {};
			const scope = paper;
			let item = null;
			function onLoad(svg) {
				try {
					let node = typeof svg === "object" ? svg : new self.DOMParser().parseFromString(svg.trim(), "image/svg+xml");
					if (!node.nodeName) {
						node = null;
						throw new Error("Unsupported SVG source: " + source);
					}
					paper = scope;
					item = importNode(node, options, true);
					if (!options || options.insert !== false) {
						owner._insertItem(undefined, item);
					}
					const onLoad = options.onLoad;
					if (onLoad) onLoad(item, svg);
				} catch (e) {
					onError(e);
				}
			}
			function onError(message, status) {
				const onError = options.onError;
				if (onError) {
					onError(message, status);
				} else {
					throw new Error(message);
				}
			}
			if (typeof source === "string" && !/^[\s\S]*</.test(source)) {
				const node = document.getElementById(source);
				if (node) {
					onLoad(node);
				} else {
					Http.request({
						url: source,
						async: true,
						onLoad,
						onError
					});
				}
			} else if (typeof File !== "undefined" && source instanceof File) {
				const reader = new FileReader();
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
		Item.inject({ importSVG: function(node, options) {
			return importSVG(node, options, this);
		} });
		Project.inject({ importSVG: function(node, options) {
			this.activate();
			return importSVG(node, options, this);
		} });
	})();
	var paper = new (PaperScope.inject(Base.exports, {
		Base,
		Numerical,
		ChangeFlag,
		Key,
		DomEvent,
		DomElement,
		document,
		window,
		PlacedSymbol: SymbolItem,
		Symbol: SymbolDefinition
	}))();
	if (paper.agent.node) {
		require("./node/extend.js")(paper);
	}
	if (typeof define === "function" && define.amd) {
		define("paper", paper);
	} else if (typeof module === "object" && module) {
		module.exports = paper;
	}
	return paper;
})(typeof self === "object" ? self : null);

//# sourceMappingURL=paper-core.js.map
