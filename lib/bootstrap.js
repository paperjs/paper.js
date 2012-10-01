/**
 * Bootstrap JavaScript Library
 * (c) 2006 - 2011 Juerg Lehni, http://lehni.org/
 *
 * Bootstrap is released under the MIT license
 * http://bootstrapjs.org/
 *
 * Inspirations:
 * http://dean.edwards.name/weblog/2006/03/base/
 * http://dev.helma.org/Wiki/JavaScript+Inheritance+Sugar/
 * http://prototypejs.org/
 */

var Base = new function() { // Bootstrap scope
	// Fix __proto__ for browsers where it is not implemented (IE and Opera).
	var fix = !this.__proto__,
		hidden = /^(statics|generics|preserve|enumerable|prototype|__proto__|toString|valueOf)$/,
		proto = Object.prototype,
		/**
		 * Private function that checks if an object contains a given property.
		 * Naming it 'has' causes problems on Opera when defining
		 * Object.prototype.has, as the local version then seems to be overriden
		 * by that. Giving it a idfferent name fixes it.
		 */
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
		_define = Object.defineProperty,
		_describe = Object.getOwnPropertyDescriptor;

	// Support a mixed environment of some ECMAScript 5 features present,
	// along with __defineGetter/Setter__ functions, as found in browsers today.
	function define(obj, name, desc) {
		// Unfortunately Safari seems to ignore configurable: true and
		// does not override existing properties, so we need to delete
		// first:
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

	/**
	 * Private function that injects functions from src into dest, overriding
	 * (and inherinting from) base.
	 */
	function inject(dest, src, enumerable, base, preserve, generics) {
		var beans, bean;

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
					&& (val.get ? val : val.value),
				func = typeof val === 'function',
				res = val,
				// Only lookup previous value if we preserve or define a
				// function that might need it for this.base(). If we're
				// defining a getter, don't lookup previous value, but look if
				// the property exists (name in dest) and store result in prev
				prev = preserve || func
					? (val && val.get ? name in dest : dest[name]) : null;
			// Make generics first, as we might jump out bellow in the
			// val !== (src.__proto__ || Object.prototype)[name] check,
			// e.g. when explicitely reinjecting Array.prototype methods
			// to produce generics of them.
			if (generics && func && (!preserve || !generics[name])) {
				generics[name] = function(bind) {
					// Do not call Array.slice generic here, as on Safari,
					// this seems to confuse scopes (calling another
					// generic from generic-producing code).
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
							// Look up the base function each time if we can,
							// to reflect changes to the base class after
							// inheritance.
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
						// Make wrapping closure pretend to be the original
						// function on inspection
						res.toString = function() {
							return val.toString();
						}
						res.valueOf = function() {
							return val.valueOf();
						}
					}
					// Produce bean properties if getters are specified. This
					// does not produce properties for setter-only properties.
					// Just collect beans for now, and look them up in dest at
					// the end of fields injection. This ensures this.base()
					// works in beans too, and inherits setters for redefined
					// getters in subclasses. Only add getter beans if they do
					// not expect arguments. Functions that should function both
					// with optional arguments and as beans should not declare
					// the parameters and use the arguments array internally
					// instead.
					if (beans && val.length == 0
							&& (bean = name.match(/^(get|is)(([A-Z])(.*))$/)))
						beans.push([ bean[3].toLowerCase() + bean[4], bean[2] ]);
				}
				// No need to look up getter if this is a function already.
				if (!res || func || !res.get)
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
		}
		// Iterate through all definitions in src now and call field() for each.
		if (src) {
			beans = [];
			for (var name in src)
				if (has.call(src, name) && !hidden.test(name))
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
					var bean = beans[i], part = bean[1];
					field(bean[0], {
						get: dest['get' + part] || dest['is' + part],
						set: dest['set' + part]
					}, true);
				} catch (e) {}
		}
		return dest;
	}

	/**
	 * Private function that creates a constructor to extend the given object.
	 * When this constructor is called through new, a new object is craeted
	 * that inherits all from obj.
	 */
	function extend(obj) {
		// Create the constructor for the new prototype that calls initialize
		// if it is defined.
		var ctor = function(dont) {
			// Fix __proto__
			if (fix) define(this, '__proto__', { value: obj });
			// Call the constructor function, if defined and we are not
			// inheriting, in which case ctor.dont would be set, see bellow.
			if (this.initialize && dont !== ctor.dont)
				return this.initialize.apply(this, arguments);
		}
		ctor.prototype = obj;
		// Add a toString function that delegates to initialize if possible
		ctor.toString = function() {
			return (this.prototype.initialize || function() {}).toString();
		}
		return ctor;
	}

	/**
	 * Converts the argument to an iterator function. If none is specified, the
	 * identity function is returned.
	 * This supports normal functions, which are returned unmodified, and values
	 * to compare to. Wherever this function is used in the Enumerable
	 * functions, a value, a Function or null may be passed.
	 */
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

	// Inject into new ctor object that's passed to inject(), and then returned
	return inject(function() {}, {
		inject: function(src/*, ... */) {
			if (src) {
				var proto = this.prototype,
					base = proto.__proto__ && proto.__proto__.constructor,
					// Allow the whole scope to just define statics by defining
					// statics: true.
					statics = src.statics == true ? src : src.statics;
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
			// The new prototype extends the constructor on which extend is
			// called. Fix constructor.
			// TODO: Consider using Object.create instead of using this.dont if
			// available?
			var proto = new this(this.dont),
				ctor = extend(proto);
			define(proto, 'constructor',
					{ value: ctor, writable: true, configurable: true });
			// Define an object to be passed as the first parameter in
			// constructors when initialize should not be called.
			ctor.dont = {};
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
		 * Returns true if the object contains a property with the given name,
		 * false otherwise.
		 * Just like in .each, objects only contained in the prototype(s) are
		 * filtered.
		 */
		has: has,
		each: each,

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
			// Notice the "new" here: the private extend returns a constructor
			// as it's used for Function.prototype.extend as well. But when
			// extending objects, we want to return a new object that inherits
			// from "this". In that case, the constructor is never used again,
			// its just created to create a new object with the proper
			// inheritance set and is garbage collected right after.
			var res = new (extend(this));
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

			/**
			 * Returns the first argument that is defined.
			 * Null is counted as defined too, since !== undefined is used for
			 * comparisons. In this it differs from Mootools!
			 */
			pick: function() {
				for (var i = 0, l = arguments.length; i < l; i++)
					if (arguments[i] !== undefined)
						return arguments[i];
				return null;
			},

			/**
			 * A special constant, to be thrown by closures passed to each()
			 *
			 * $continue / Base.next is not implemented, as the same
			 * functionality can achieved by using return in the closure.
			 * In prototype, the implementation of $continue also leads to a
			 * huge speed decrease, as the closure is wrapped in another closure
			 * that does nothing else than handling $continue.
			 */
			stop: {}
		}
	});
}
