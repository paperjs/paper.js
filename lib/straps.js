/**
 * straps.js - Class inheritance library with support for bean-style accessors
 *
 * Copyright (c) 2006 - 2013 Juerg Lehni
 * http://lehni.org/
 *
 * Distributed under the MIT license.
 *
 * straps.js was created by extracting and simplifying the inheritance framework
 * from boostrap.js, a JavaScript DOM library, also published by Juerg Lehni:
 * https://github.com/lehni/bootstrap.js
 *
 * Inspirations:
 * http://dean.edwards.name/weblog/2006/03/base/
 * http://dev.helma.org/Wiki/JavaScript+Inheritance+Sugar/
 */

var Base = new function() {
	var hidden = /^(statics|generics|preserve|enumerable|prototype|toString|valueOf)$/,
		toString = Object.prototype.toString,
		proto = Array.prototype,
		slice = proto.slice,

		forEach = proto.forEach || function(iter, bind) {
			for (var i = 0, l = this.length; i < l; i++)
				iter.call(bind, this[i], i, this);
		},

		forIn = function(iter, bind) {
			// Do not use Object.keys for iteration as iterators might modify
			// the object we're iterating over, making the hasOwnProperty still
			// necessary.
			for (var i in this)
				if (this.hasOwnProperty(i))
					iter.call(bind, this[i], i, this);
		},

		isArray = Array.isArray = Array.isArray || function(obj) {
			return toString.call(obj) === '[object Array]';
		},

		// A short-cut to a simplified version of Object.create that only
		// supports the first parameter (in the emulation):
		create = Object.create || function(proto) {
			// From all browsers that do not offer Object.create(), we only
			// support Firefox 3.5 & 3.6, and this hack works there:
			return { __proto__: proto };
		},

		describe = Object.getOwnPropertyDescriptor || function(obj, name) {
			// Emulate Object.getOwnPropertyDescriptor for outdated browsers
			var get = obj.__lookupGetter__ && obj.__lookupGetter__(name);
			return get
					? { get: get, set: obj.__lookupSetter__(name),
						enumerable: true, configurable: true }
					: obj.hasOwnProperty(name)
						? { value: obj[name], enumerable: true,
							configurable: true, writable: true }
						: null;
		},

		_define = Object.defineProperty || function(obj, name, desc) {
			// Emulate Object.defineProperty for outdated browsers
			if ((desc.get || desc.set) && obj.__defineGetter__) {
				if (desc.get)
					obj.__defineGetter__(name, desc.get);
				if (desc.set)
					obj.__defineSetter__(name, desc.set);
			} else {
				obj[name] = desc.value;
			}
			return obj;
		},

		define = function(obj, name, desc) {
			// Both Safari and Chrome at one point ignored configurable = true
			// and did not allow overriding of existing properties:
			// https://code.google.com/p/chromium/issues/detail?id=72736
			// https://bugs.webkit.org/show_bug.cgi?id=54289
			// The workaround is to delete the property first.
			// TODO: Remove this fix in July 2014, and use _define directly.
			delete obj[name];
			return _define(obj, name, desc);
		};

	// Fix Function#name on browsers that do not support it (IE):
	if (!(function f() {}).name) {
		define(Function.prototype, 'name', {
			get: function() {
				var name = this.toString().match(/^\s*function\s*(\w*)\s*\(/)[1];
				// For better performance only parse once, and then cache the
				// result through a new accessor for repeated access.
				define(this, 'name', { value: name });
				return name;
			}
		});
	}

	/**
	 * Private function that injects functions from src into dest, overriding
	 * (and inherinting from) base.
	 */
	function inject(dest, src, enumerable, base, preserve, generics) {
		var beans;

		/**
		 * Private function that injects one field with given name and checks if
		 * the field is a function that needs to be wrapped for calls of base().
		 * This is only needed if the function in base is different from the one
		 * in src, and if the one in src is actually calling base through base.
		 * The string of the function is parsed for this.base to detect calls.
		 */
		function field(name, val, dontCheck, generics) {
			// This does even work for prop: 0, as it will just be looked up
			// again through describe.
			var val = val || (val = describe(src, name))
					&& (val.get ? val : val.value);
			// Allow aliases to properties with different names, by having
			// string values starting with '#'
			if (typeof val === 'string' && val[0] === '#')
				val = src[val.substring(1)] || val;
			var isFunc = typeof val === 'function',
				res = val,
				// Only lookup previous value if we preserve or define a
				// function that might need it for this.base(). If we're
				// defining a getter, don't lookup previous value, but look if
				// the property exists (name in dest) and store result in prev
				prev = preserve || isFunc
					? (val && val.get ? name in dest : dest[name]) : null,
				bean;
			if ((dontCheck || val !== undefined && src.hasOwnProperty(name))
					&& (!preserve || !prev)) {
				// Expose the 'super' function (meaning the one this function is
				// overriding) through #base:
				if (isFunc && prev)
					val.base = prev;
				// Produce bean properties if getters are specified. This does
				// not produce properties for setter-only properties. Just
				// collect beans for now, and look them up in dest at the end of
				// fields injection. This ensures base works for beans too, and
				// inherits setters for redefined getters in subclasses. Only
				// add getter beans if they do not expect arguments. Functions
				// that should function both with optional arguments and as
				// beans should not declare the parameters and use the arguments
				// array internally instead.
				if (isFunc && beans && val.length === 0
						&& (bean = name.match(/^(get|is)(([A-Z])(.*))$/)))
					beans.push([ bean[3].toLowerCase() + bean[4], bean[2] ]);
				// No need to look up getter if this is a function already.
				if (!res || isFunc || !res.get)
					res = { value: res, writable: true };
				// Only set/change configurable and enumerable if this field is
				// configurable
				if ((describe(dest, name)
						|| { configurable: true }).configurable) {
					res.configurable = true;
					res.enumerable = enumerable;
				}
				define(dest, name, res);
			}
			if (generics && isFunc && (!preserve || !generics[name])) {
				generics[name] = function(bind) {
					// Do not call Array.slice generic here, as on Safari,
					// this seems to confuse scopes (calling another
					// generic from generic-producing code).
					return bind && dest[name].apply(bind,
							slice.call(arguments, 1));
				};
			}
		}
		// Iterate through all definitions in src now and call field() for each.
		if (src) {
			beans = [];
			for (var name in src)
				if (src.hasOwnProperty(name) && !hidden.test(name))
					field(name, null, true, generics);
			// IE (and some other browsers?) never enumerate these, even  if
			// they are simply set on an object. Force their creation. Do not
			// create generics for these, and check them for not being defined
			// (by passing undefined for dontCheck).
			field('toString');
			field('valueOf');
			// Now finally define beans as well. Look up methods on dest, for
			// support of this.base() (See above).
			for (var i = 0, l = beans && beans.length; i < l; i++)
				try {
					var bean = beans[i],
						part = bean[1];
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
				(asArray || typeof asArray === 'undefined' && isArray(obj)
					? forEach : forIn).call(obj, iter, bind = bind || obj);
		} catch (e) {
			if (e !== Base.stop)
				throw e;
		}
		return bind;
	}

	function clone(obj) {
		return each(obj, function(val, i) {
			this[i] = val;
		}, new obj.constructor());
	}

	// Inject into new ctor object that's passed to inject(), and then returned
	// as the Base class.
	return inject(function Base() {}, {
		inject: function(src/*, ... */) {
			if (src) {
				var proto = this.prototype,
					base = Object.getPrototypeOf(proto).constructor,
					// Allow the whole scope to just define statics by defining
					// statics: true.
					statics = src.statics === true ? src : src.statics;
				if (statics != src)
					inject(proto, src, src.enumerable, base && base.prototype,
							src.preserve, src.generics && this);
				// Define new static fields as enumerable, and inherit from
				// base. enumerable is necessary so they can be copied over from
				// base, and it does not harm to have enumerable properties in
				// the constructor. Use the preserve setting in src.preserve for
				// statics too, not their own.
				inject(this, statics, true, base, src.preserve);
			}
			// If there are more than one argument, loop through them and call
			// inject again. Do not simple inline the above code in one loop,
			// since each of the passed objects might override this.inject.
			for (var i = 1, l = arguments.length; i < l; i++)
				this.inject(arguments[i]);
			return this;
		},

		extend: function(src/* , ... */) {
			var base = this,
				ctor;
			// Look for an initialize function in all injection objects and use
			// it directly as the actual constructor.
			for (var i = 0, l = arguments.length; i < l; i++)
				if (ctor = arguments[i].initialize)
					break;
			// If no initialize function is provided, create a constructor that
			// simply calls the base constructor.
			ctor = ctor || function() {
				base.apply(this, arguments);
			};
			ctor.prototype = create(this.prototype);
			// The new prototype extends the constructor on which extend is
			// called. Fix constructor.
			define(ctor.prototype, 'constructor',
					{ value: ctor, writable: true, configurable: true });
			// Copy over static fields, as prototype-like inheritance
			// is not possible for static fields. Mark them as enumerable
			// so they can be copied over again.
			inject(ctor, this, true);
			// Inject all the definitions in src. Use the new inject instead of
			// the one in ctor, in case it was overriden. this is needed when
			// overriding the static .inject(). But only inject if there's
			// something to actually inject.
			return arguments.length ? this.inject.apply(ctor, arguments) : ctor;
		}
		// Pass true for enumerable, so inject() and extend() can be passed on
		// to subclasses of Base through Base.inject() / extend().
	}, true).inject({
		/**
		 * Injects the fields from the given object, adding this.base()
		 * functionality
		 */
		inject: function(/* src, ... */) {
			for (var i = 0, l = arguments.length; i < l; i++)
				inject(this, arguments[i], arguments[i].enumerable);
			return this;
		},

		/**
		 * Returns a new object that inherits all properties from "this",
		 * through proper JS inheritance, not copying.
		 * Optionally, src and hide parameters can be passed to fill in the
		 * newly created object just like in inject(), to copy the behavior
		 * of Function.prototype.extend.
		 */
		extend: function(/* src, ... */) {
			var res = create(this);
			return res.inject.apply(res, arguments);
		},

		each: function(iter, bind) {
			return each(this, iter, bind);
		},

		/**
		 * Creates a new object of the same type and copies over all
		 * name / value pairs from this object.
		 */
		clone: function() {
			return clone(this);
		},

		statics: {
			// Expose some local privates as Base generics.
			each: each,
			clone: clone,
			define: define,
			describe: describe,

			// Base.create does something different from Object.create:
			// It works on constructors and uses their prototype.
			create: function(ctor) {
				return create(ctor.prototype);
			},

			/**
			 * Returns true if obj is a plain JavaScript object literal, or a 
			 * plain Base object, as produced by Base.merge().
			 */
			isPlainObject: function(obj) {
				var ctor = obj != null && obj.constructor;
				// We also need to check for ctor.name === 'Object', in case
				// this is an object from another global scope (e.g. an iframe,
				// or another vm context in node.js).
				return ctor && (ctor === Object || ctor === Base
						|| ctor.name === 'Object');
			},

			check: function(obj) {
				return !!(obj || obj === 0);
			},

			/**
			 * Returns the first argument that is defined. null is counted as
			 * defined too, as !== undefined is used for comparisons.
			 */
			pick: function() {
				for (var i = 0, l = arguments.length; i < l; i++)
					if (arguments[i] !== undefined)
						return arguments[i];
				return null;
			},

			/**
			 * Base.stop can be thrown by iterators passed to each()
			 *
			 * continue (Base.next) is not implemented, as the same can achieved
			 * by using return in the iterator.
			 */
			stop: {}
		}
	});
};
