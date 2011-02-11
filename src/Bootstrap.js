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

////////////////////////////////////////////////////////////////////////////////
// Base

new function() { // Bootstrap scope
	// Fix __proto__ for browsers where it is not implemented (IE and Opera).
	// Do this before anything else, for "var i in" to work without filtering.
	var fix = !this.__proto__ && [Function, Number, Boolean, String, Array, Date, RegExp];
	if (fix)
		for (var i in fix)
			fix[i].prototype.__proto__ = fix[i].prototype;

	/**
	 * Private function that checks if an object contains a given property.
	 * Naming it 'has' causes problems on Opera when defining
	 * Object.prototype.has, as the local version then seems to be overriden
	 * by that. Giving it a idfferent name fixes it.
	 */
	function has(obj, name) {
		return (!fix || name != '__proto__') && obj.hasOwnProperty(name);
	}

	// Support a mixed environment of some ECMAScript 5 features present,
	// along with __defineGetter/Setter__ functions, as found in browsers today.
	var _define = Object.defineProperty, _describe = Object.getOwnPropertyDescriptor;

	function define(obj, name, desc) {
		if (_define)
			try { return _define(obj, name, desc); } catch (e) {}
		if ((desc.get || desc.set) && obj.__defineGetter__) {
			if (desc.get) obj.__defineGetter__(obj, desc.get);
			if (desc.set) obj.__defineSetter__(obj, desc.set);
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

	/**
	 * Private function that injects functions from src into dest, overriding
	 * (and inherinting from) base. if allowProto is set, the name "prototype"
	 * is inherited too. This is false for static fields, as prototype there
	 * points to the classes' prototype.
	 */
	function inject(dest, src, enumerable, base, generics) {
		/**
		 * Private function that injects one field with given name
		 */
		function field(name, val, dontCheck, generics) {
			// This does even work for prop: 0, as it will just be looked up
			// again through describe...
			if (!val)
				val = (val = describe(src, name)) && (val.get ? val : val.value);
			var type = typeof val, func = type == 'function', res = val,
				prev = dest[name], bean;
			// Make generics first, as we might jump out bellow in the
			// val !== (src.__proto__ || Object.prototype)[name] check,
			// e.g. when explicitely reinjecting Array.prototype methods
			// to produce generics of them.
			if (generics && func && (!src.preserve || !generics[name])) generics[name] = function(bind) {
				// Do not call Array.slice generic here, as on Safari,
				// this seems to confuse scopes (calling another
				// generic from generic-producing code).
				return bind && dest[name].apply(bind,
					Array.prototype.slice.call(arguments, 1));
			}
			// TODO: On proper JS implementation, dontCheck is always set
			// Add this with a compile switch here!
			if ((dontCheck || val !== undefined && has(src, name)) && (!prev || !src.preserve)) {
				if (func) {
					if (prev && /\bthis\.base\b/.test(val)) {
						var fromBase = base && base[name] == prev;
						res = (function() {
							// Look up the base function each time if we can,
							// to reflect changes to the base class after
							// inheritance.
							var tmp = describe(this, 'base');
							define(this, 'base', { value: fromBase ? base[name] : prev, configurable: true });
							try { return val.apply(this, arguments); }
							finally { tmp ? define(this, 'base', tmp) : delete this.base; }
						}).pretend(val);
					}
					// Only set produce bean properties when getters are
					// specified. This does not produce properties for setter-
					// only properties which makes sense and also avoids double-
					// injection for beans with both getters and setters.
					if (src.beans && (bean = name.match(/^(get|is)(([A-Z])(.*))$/)))
						try {
							field(bean[3].toLowerCase() + bean[4], {
								get: src['get' + bean[2]] || src['is' + bean[2]],
								set: src['set' + bean[2]]
							}, true);
						} catch (e) {}
				}
				// No need to look up getter if this is a function already.
				// This also prevents _collection from becoming a getter, as
				// DomElements is a constructor function and has both get / set
				// generics for DomElement#get / #set.
				if (!res || func || !res.get && !res.set)
					res = { value: res, writable: true };
				// Only set/change configurable and enumerable if this field is
				// configurable
				if ((describe(dest, name) || { configurable: true }).configurable) {
					res.configurable = true;
					res.enumerable = enumerable;
				}
				define(dest, name, res);
			}
		}
		// Iterate through all definitions in src with an iteator function
		// that checks if the field is a function that needs to be wrapped for
		// calls of base. This is only needed if the function in base is
		// different from the one in src, and if the one in src is actually
		// calling base through base. the string of the function is parsed
		// for base to detect calls.
		// dest[name] then is set to either src[name] or the wrapped function.
		if (src) {
			for (var name in src)
				if (has(src, name) && !/^(statics|generics|preserve|beans|prototype|__proto__|toString|valueOf)$/.test(name))
					field(name, null, true, generics);
			// IE (and some other browsers?) never enumerate these, even 
			// if they are simply set on an object. Force their creation.
			// Do not create generics for these, and check them for not
			// being defined (by passing undefined for dontCheck).
			field('toString');
			field('valueOf');
		}
	}

	/**
	 * Private function that creates a constructor to extend the given object.
	 * When this constructor is called through new, a new object is craeted
	 * that inherits all from obj.
	 */
	function extend(obj) {
		// Create the constructor for the new prototype that calls initialize
		// if it is defined.
		function ctor(dont) {
			// Fix __proto__
			if (fix) define(this, '__proto__', { value: obj });
			// Call the constructor function, if defined and we're not inheriting
			// in which case ctor.dont would be set, see further bellow.
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

	// Now we can use the private inject to add methods to the Function.prototype
	inject(Function.prototype, {
		inject: function(src/*, ... */) {
			if (src) {
				var proto = this.prototype, base = proto.__proto__ && proto.__proto__.constructor;
				// When called from extend, a third argument is passed, pointing
				// to the base class (the constructor).
				// this variable is needed for inheriting static fields and proper
				// lookups of base on each call (see bellow)
				inject(proto, src, false, base && base.prototype, src.generics && this);
				// Define new static fields as enumerable, and inherit from base.
				// enumerable is necessary so they can be copied over from base,
				// and it does not disturb to be enumerable in the constructor.
				inject(this, src.statics, true, base);
			}
			// If there are more than one argument, loop through them and call
			// inject again. Do not simple inline the above code in one loop,
			// since each of the passed objects might override this.inject.
			for (var i = 1, l = arguments.length; i < l; i++)
				this.inject(arguments[i]);
			return this;
		},

		extend: function(src/* , ... */) {
			// The new prototype extends the constructor on which extend is called.
			// Fix constructor
			// TODO: Consider using Object.create instead of using this.dont if
			// available?
			var proto = new this(this.dont), ctor = extend(proto);
			define(proto, 'constructor', { value: ctor, writable: true, configurable: true });
			// An object to be passed as the first parameter in constructors
			// when initialize should not be called. This needs to be a property
			// of the created constructor, so that if .extend is called on native
			// constructors or constructors not created through .extend,
			// this.dont will be undefined and no value will be passed to the
			// constructor that would not know what to do with it.
			ctor.dont = {};
			// Copy over static fields, as prototype-like inheritance
			// is not possible for static fields. Mark them as enumerable
			// so they can be copied over again.
			// TODO: This needs fixing for versioning on the server!
			inject(ctor, this, true);
			// Inject all the definitions in src
			// Use the new inject instead of the one in ctor, in case it was
			// overriden.
			// Needed when overriding static inject as in HtmlElements.js.
			// Only inject if there's something to actually inject.
			return arguments.length ? this.inject.apply(ctor, arguments) : ctor;
		},

		pretend: function(fn) {
			// Redirect toString to the one from the original function
			// to "hide" the wrapper function
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

	// Let's not touch Object.prototype
	Base = Object.extend({
		/**
		 * Returns true if the object contains a property with the given name,
		 * false otherwise.
		 * Just like in .each, objects only contained in the prototype(s) are
		 * filtered.
		 */
		has: function(name) {
			return has(this, name);
		},

		each: function(iter, bind) {
			return each(this, iter, bind);
		},

		/**
		 * Injects the fields from the given object, adding base functionality
		 */
		inject: function(/* src, ... */) {
			for (var i = 0, l = arguments.length; i < l; i++)
				inject(this, arguments[i]);
			return this;
		},

		/**
		 * Returns a new object that inherits all properties from "this", through
		 * proper JS inheritance, not copying.
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

		statics: {
			// Expose some local privates as Base generics.
			has: has,
			each: each,
			define: define,
			describe: describe,

			type: function(obj) {
				// Handle elements, as needed by DomNode.js
				return (obj || obj === 0) && (
					obj._type || obj.nodeName && (
						obj.nodeType == 1 && 'element' ||
						obj.nodeType == 3 && 'textnode' ||
						obj.nodeType == 9 && 'document')
						// TODO: Find better way to identify windows and use
						// the same cod ein DomNode$getConstructor
						|| obj.location && obj.frames && obj.history && 'window'
						|| typeof obj) || null;
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
			 * Converts the argument to an iterator function. If none is
			 * specified, the identity function is returned.
			 * This supports normal functions, which are returned unmodified,
			 * and values to compare to. Wherever this function is used in the
			 * Enumerable functions, a value, a Function or null may be passed.
			 */
			iterator: function(iter) {
				return !iter
					? function(val) { return val }
					: typeof iter != 'function'
						? function(val) { return val == iter }
						: iter;
				/*
				// For RegExp support, used this:
				else switch (Base.type(iter)) {
					case 'function': return iter;
					case 'regexp': return function(val) { return iter.test(val) };
					default: return function(val) { return val == iter };
				}
				*/
			},

			/**
			 * A special constant, to be thrown by closures passed to each()
			 *
			 * $continue / Base.next is not implemented, as the same
			 * functionality can achieved by using return in the closure.
			 * In prototype, the implementation of $continue also leads to a huge
			 * speed decrease, as the closure is wrapped in another closure that
			 * does nothing else than handling $continue.
			 */
			stop: {}
		}
	}, {
		generics: true,

		debug: function() {
			return /^(string|number|function|regexp)$/.test(Base.type(this)) ? this
				: Base.each(this, function(val, key) { this.push(key + ': ' + val); }, []).join(', ');
			/*
			switch (Base.type(this)) {
			case 'string': case 'number': case 'regexp':
				return this;
			case 'function':
				return 'function ' + (this.name || '');
			}
			var buf = [];
			for (var key in this)
				if (Base.has(this, key))
					buf.push(key + ': ' + Base.debug(this[key]));
			return buf.join(', ');
			*/
		},

		/**
		 * Creates a new object of the same type and copies over all
		 * name / value pairs from this object.
		 */
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

////////////////////////////////////////////////////////////////////////////////
// Enumerable

/**
 * The Enumerable interface. To add enumerable functionality to any prototype,
 * just use Constructor.inject(Enumerable);
 * This adds the function .each() that can handle both arrays (detected through
 * .length) and dictionaries (if it's not an array, enumerating with for-in).
 */

// TODO: Base.each is used mostly so functions can be generalized.
// But that's not enough, since find and others are still called
// on this.
Enumerable = {
	generics: true,
	// Make sure it's not overriding native functions when injecting into Array
	preserve: true,

	/**
	 * Searches the list for the first element where the passed iterator
	 * does not return null and returns an object containing key, value and
	 * iterator result for the given entry. This is used in find and remove.
	 * If no iterator is passed, the value is used directly.
	 */
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

	/**
	 * Calls the passed iterator for each element and returns the first
	 * result of the iterator calls that is not null.
	 * If no iterator is passed, the value is used directly.
	 */
	find: function(iter, bind) {
		var entry = this.findEntry(iter, bind);
		return entry && entry.result;
	},

	contains: function(iter) {
		return !!this.findEntry(iter);
	},

	remove: function(iter, bind) {
		var entry = this.findEntry(iter, bind);
		if (entry) {
			delete this[entry.key];
			return entry.value;
		}
	},

	/**
	 * Collects all elements for which the condition of the passed iterator
	 * or regular expression is true.
	 * This is compatible with JS 1.5's Array#filter
	 */
	filter: function(iter, bind) {
		var that = this;
		return Base.each(this, function(val, i) {
			if (iter.call(bind, val, i, that))
				this[this.length] = val;
		}, []);
	},

	/**
	 * Maps the result of the given iterator applied to each of the
	 * elements to an array and returns it.
	 * If no iterator is passed, the value is used directly.
	 * This is compatible with JS 1.5's Array#map
	 */
	map: function(iter, bind) {
		var that = this;
		return Base.each(this, function(val, i) {
			this[this.length] = iter.call(bind, val, i, that);
		}, []);
	},

	/**
	 * Returns true if the condition defined by the passed iterator is true
	 * for	all elements, false otherwise.
	 * If no iterator is passed, the value is used directly.
	 * This is compatible with JS 1.5's Array#every
	 */
	every: function(iter, bind) {
		var that = this;
		return this.find(function(val, i) {
			// as "this" is not used for anything else, use it for bind,
			// so that lookups on the object are faster (according to
			// benchmarking)
			return !iter.call(this, val, i, that);
		}, bind || null) == null;
		// See #some for explanation of || null
	},

	/**
	 * Returns true if the condition defined by the passed iterator is true
	 * for one or more of the elements, false otherwise.
	 * If no iterator is passed, the value is used directly.
	 * This is compatible with JS 1.5's Array#some
	 */
	some: function(iter, bind) {
		// Passing null instead of undefined causes bind not to be set to
		// this, as we want the same behavior here as the native Array#some.
		return this.find(iter, bind || null) != null;
	},

	/**
	 * Collects the result of the given iterator applied to each of the
	 * elements to an array and returns it.
	 * The difference to map is that it does not add null / undefined values.
	 */
	collect: function(iter, bind) {
		var that = this, iter = Base.iterator(iter);
		return Base.each(this, function(val, i) {
		 	val = iter.call(bind, val, i, that);
			if (val != null)
				this[this.length] = val;
		}, []);
	},

	/**
	 * Returns the maximum value of the result of the passed iterator
	 * applied to each element.
	 * If no iterator is passed, the value is used directly.
	 */
	max: function(iter, bind) {
		var that = this, iter = Base.iterator(iter);
		return Base.each(this, function(val, i) {
			val = iter.call(bind, val, i, that);
			if (val >= (this.max || val)) this.max = val;
		}, {}).max;
	},

	/**
	 * Returns the minimum value of the result of the passed iterator
	 * applied to each element.
	 * If no iterator is passed, the value is used directly.
	 */
	min: function(iter, bind) {
		var that = this, iter = Base.iterator(iter);
		return Base.each(this, function(val, i) {
			val = iter.call(bind, val, i, that);
			if (val <= (this.min || val)) this.min = val;
		}, {}).min;
	},

	/**
	 * Collects the values of the given property of each of the elements
	 * in an array and returns it.
	 */
	pluck: function(prop) {
		return this.map(function(val) {
			return val[prop];
		});
	},

	/**
	 * Sorts the elements depending on the outcome of the passed iterator
	 * and returns the sorted list in an array.
	 * Inspired by Prototype.js
	 */
	sortBy: function(iter, bind) {
		var that = this, iter = Base.iterator(iter);
		// TODO: Does not work as generics
		return this.map(function(val, i) {
			return { value: val, compare: iter.call(bind, val, i, that) };
		}, bind).sort(function(left, right) {
			var a = left.compare, b = right.compare;
			return a < b ? -1 : a > b ? 1 : 0;
		}).pluck('value');
	},

	/**
	 * Converts the Enumerable to a normal array.
	 */
	toArray: function() {
		return this.map(function(value) {
			return value;
		});
	}
};

////////////////////////////////////////////////////////////////////////////////
// Hash

/**
 * As Object only defines each and two other basic functions to avoid name
 * clashes in all other prototypes, define a second prototype called Hash,
 * which basically does the same but fully implements Enumberable.
 * Also note the difference to Prototype.js, where Hash does not iterate
 * in the same way. Instead of creating a new key / value pair object for
 * each element and passing the numerical index of it in the iteration as a
 * second argument, use the key as the index, and the value as the first
 * element. This is much simpler and faster, and I have not yet found out the
 * advantage of how Prototype handles it.
 */
Hash = Base.extend(Enumerable, {
	generics: true,

	/**
	 * Constructs a new Hash. The constructor takes a variable amount of
	 * argument objects of which the fields are all merged into the hash.
	 */
	initialize: function(arg) {
		// If the first argument is a string, assume pairs of key/value arguments,
		// to be set on the hash.
		if (typeof arg == 'string') {
			for (var i = 0, l = arguments.length; i < l; i += 2)
				this[arguments[i]] = arguments[i + 1];
		} else {
			this.append.apply(this, arguments);
		}
		// Explicitly return object as it is used in Hash.create's return statement
		return this;
	},

	each: function(iter, bind) {
		// Do not use Object.keys for iteration as iterators might modify
		// the object we're iterating over, making the hasOwnProperty still
		// necessary.
		// If  is used, we can fully rely on hasOwnProperty,
		// as even for , define(this, '__proto__', {}) is used.
		var bind = bind || this, iter = Base.iterator(iter);
		try {
			for (var i in this)
				if (this.hasOwnProperty(i))
					iter.call(bind, this[i], i, this);
		} catch (e) {
			if (e !== Base.stop) throw e;
		}
		return bind;
	},

	/**
	 * append is faster and more low level than merge, completely based on
	 * for-in and Base.has, and not relying on any .each function, so can
	 * be used early in the bootstrapping process.
	 */
	append: function() {
		for (var i = 0, l = arguments.length; i < l; i++) {
			var obj = arguments[i];
			for (var key in obj)
				if (Base.has(obj, key))
					this[key] = obj[key];
		}
		return this;
	},

	/**
	 * Deep merges with the given enumerable object and returns the modifed hash.
	 * Recursively calls merge or clone on value pairs if they are dictionaries.
	 */
	merge: function() {
		// Allways use Base.each() as we don't know wether the passed object
		// really inherits from Base.
		// Do not rely on .each / .forEach, so merge can be used in low level
		// operations such as insertion of such functions as well. Just use
		// the Base.has generic to filter out parent values.
		return Array.each(arguments, function(obj) {
			Base.each(obj, function(val, key) {
				this[key] = Base.type(this[key]) == 'object'
					? Hash.prototype.merge.call(this[key], val)
					: Base.type(val) == 'object' ? Base.clone(val) : val;
			}, this);
		}, this);
	},

	/**
	 * Returns the keys of all elements in an array.
	 */
	getKeys: function() {
		return Hash.getKeys(this);
	},

	/**
	 * Does the same as toArray(), but renamed to go together with getKeys()
	 */
	getValues: Enumerable.toArray,

	getSize: function() {
		return this.each(function() {
			this.size++;
		}, { size: 0 }).size;
	},

	statics: {
		/**
		 * Converts the passed object to a hash.
		 * Warning: Does not create a new instance if it is a hash already!
		 */
		create: function(obj) {
			return arguments.length == 1 && obj.constructor == Hash
				? obj : Hash.prototype.initialize.apply(new Hash(), arguments);
		},

		/**
		 * Returns the keys of all elements in an array.
		 * Uses the native Object.keys if available.
		 */
		getKeys: Object.keys || function(obj) {
			return Hash.map(function(val, key) {
				return key;
			});
		}
	}
});

// Short-cut to Hash.create
$H = Hash.create;

////////////////////////////////////////////////////////////////////////////////
// Array

// Define standard methods that might not be present and only get injected
// if they don't exist because of preserve: true
Array.inject({
	generics: true,
	preserve: true,
	// tell Base.type what to return for arrays.
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
	// TODO: this.each / this.findEntry / this.indexOf breaks many generics!
	generics: true,
	beans: true,

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
		// Use the faster indexOf in case we're not using iterator functions.
		if (typeof iter != 'function') {
			var i = this.indexOf(iter);
			// Return the same result as if Enumerable.findEntry was used
			// and the iter object was converter to an iterator.
			return i == -1 ? null : { key: i, value: iter, result: iter };
		}
		// Do not use this.base, as we might call this on non-arrays
		return Enumerable.findEntry.call(this, iter, bind);
	},

	remove: function(iter, bind) {
		var entry = this.findEntry(iter, bind);
		if (entry) {
			this.splice(entry.key, 1);
			return entry.value;
		}
	},

	/**
	 * Overrides the definition in Enumerable.toArray with a more efficient
	 * version.
	 */
	toArray: function() {
		return Array.prototype.slice.call(this);
	},

	/**
	 * Clones the array.
	 */
	clone: function() {
		return this.toArray();
	},

	/**
	 * Clears the array.
	 */
	clear: function() {
		this.length = 0;
	},

	/**
	 * Returns a compacted version of the array containing only
	 * elements that are not null.
	 */
	compact: function() {
		return this.filter(function(value) {
			return value != null;
		});
	},

	/**
	 * Appends the items of the passed array to this array.
	 */
	append: function(items) {
		// It would be nice if calling push with the items of the array
		// as arguments would work, but it does not for non-arrays:
		// this.push.apply(this, items);
		// this.length is explicitely altered, so non-array sub-prototypes
		// can use it too.
		for (var i = 0, l = items.length; i < l; i++)
			this[this.length++] = items[i];
		return this;
	},

	/**
	 * Creates a hash object containing the array's values associated to the
	 * given keys as defined by obj.
	 * This is based on mootools' associate, but extended by the possibility
	 * to not pass an obj, or pass a function:
	 * - If obj is an array, its values are the new keys.
	 * - If obj is a hash object, mootools behavior is assumed.
	 * - If obj is not defined, it is set to the array itself, resulting in
	 *   a hash with key and value set to the same (the initial array entry).
	 * - If obj is a function, it's passed to this.map(), and the resulting
	 *   array is used for the key values.
	 */
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
			// Produce a new bare object since we're deleting from it.
			obj = Hash.append({}, obj);
			// Use Base.each since this is also used for generics
			return Array.each(this, function(val) {
				var type = Base.type(val);
				// Use Base.each since it's a bare object for speed reasons
				// on the browser.
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

	/**
	 * adds all elements in the passed array, if they are not contained
	 * in the array already.
	 */
	/* TODO: needed? Call unite instead? or union?
	include: function(obj) {
		return Base.each(obj, function(val) {
			if (this.indexOf(val) == -1) this.push(val);
		}, this);
	},
	*/

	/**
	 * Flattens multi-dimensional array structures by breaking down each
	 * sub-array into the main array.
	 */
	flatten: function() {
		// Make it generics friendly through Array.each
		return Array.each(this, function(val) {
			if (val != null && val.flatten) this.append(val.flatten());
			else this.push(val);
		}, []);
	},

	/**
	 * Swaps two elements of the object at the given indices, and returns
	 * the value that is placed at the first index.
	 */
	swap: function(i, j) {
		var tmp = this[j];
		this[j] = this[i];
		this[i] = tmp;
		return tmp;
	},

	/**
	 * Returns a copy of the array containing the elements in
	 * shuffled sequence.
	 */
	shuffle: function() {
		var res = this.clone();
		var i = this.length;
		while (i--) res.swap(i, Math.rand(i + 1));
		return res;
	},

	pick: function() {
		return this[Math.rand(this.length)];
	},

	/**
	 * Returns the first element of the array.
	 */
	getFirst: function() {
		return this[0];
	},

	/**
	 * Returns the last element of the array.
	 */
	getLast: function() {
		return this[this.length - 1];
	}
}, new function() {
	// Merge sutract / combine in one function through a producer:
	function combine(subtract) {
		return function(items) {
			var res = new this.constructor();
			for (var i = this.length - 1; i >= 0; i--)
				if (subtract == !Array.find(items, this[i]))
					res.push(this[i]);
			return res;
		}
	}

	return {
		/**
		 * Returns a new array containing all objects from this array that are
		 * not contained in items.
		 */
		subtract: combine(true),

		/**
		 * Returns a new array containing all objects contained in both arrays.
		 */
		intersect: combine(false)
	}
});

// Now add code that makes Array.extend() a possibilitiy:
Array.inject(new function() {
	// Fields that are hidden in Array.prototype are explicitely copied over,
	// so that they can be inherited in extend() below, and generics are created
	// for them too.
	var proto = Array.prototype, fields = ['push','pop','shift','unshift','sort',
		'reverse','join','slice','splice','forEach','indexOf','lastIndexOf',
		'filter','map','every','some','reduce','concat'].each(function(name) {
		this[name] = proto[name];
	}, { generics: true, preserve: true });

	// Make sure there are generics for all of them. Again this is not dangerous
	// because we'rew using preserve: true
	Array.inject(fields);

	// Now add the fields to be injected into sub-prototypes from Array.
	// See Array.extend for more explanation.
	Hash.append(fields, proto, {
		/**
		 * Clears the array.
		 * For non-array sub-prototypes, setting this.length = 0 does not clear
		 * the array. Exlicit delete is needed. For sub-prototypes.
		 */
		clear: function() {
			for (var i = 0, l = this.length; i < l; i++)
				delete this[i];
			this.length = 0;
		},

		// Safari breaks native concat on sub classes of arrays. Simulate it here.
		// TODO: Test if newer versions are find with this.
		concat: function(list) {
			return Browser.WEBKIT
				? new Array(this.length + list.length).append(this).append(list)
				: Array.concat(this, list);
		},

		// The native toString does not work for classes inheriting from Array.
		// but luckily join does the same and works.
		toString: proto.join,

		// length is set so instances of array have it set to 0 to begin with.
		// (any length modifying operation on them like #push will then
		// define / modify the length field in the insance).
		length: 0
	});

	return {
		statics: {
			/**
			 * Creates an array from the past object.
			 */
			create: function(obj) {
				if (obj == null)
					return [];
				if (obj.toArray)
					return obj.toArray();
				if (typeof obj.length == 'number')
					return Array.prototype.slice.call(obj);
				return [obj];
			},

			/**
			 * Makes sure the passed object is an array and converts it to one
			 * if not through Array.create.
			 */
			convert: function(obj) {
				return Base.type(obj) == 'array' ? obj : Array.create(obj);
			},

			extend: function(src) {
				// On IE browsers, we cannot directly inherit from Array
				// by setting ctor.prototype = new Array(), as setting of #length
				// on such instances is ignored.
				// Simulate extending of Array, by actually extending Base and
				// injecting the Array fields, which explicitely contain the
				// native functions too (see bellow).
				// Notice: since fields as the preserve flag set, the 
				// Array#clone() will not override the Base#clone method,
				// so derived arrays will successfully clone themselves.
				var ret = Base.extend(fields, src);
				// The subclass can use the normal extend again:
				ret.extend = Function.extend;
				return ret;
			}
		}
	};
});

// Short-cut to Array.create
$A = Array.create;

////////////////////////////////////////////////////////////////////////////////
// Function

Function.inject(new function() {

	function timer(set) {
		return function(delay, bind, args) {
			// It's a bit of a shame we can't use the ES5 bind() here easily:
			var func = this.wrap(bind, args);
			// If delay is not defined, execute right away and return the result
			// of the function. This is used in fireEvent.
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

////////////////////////////////////////////////////////////////////////////////
// Number

Number.inject({
	// tell Base.type that number objects are numbers too.
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

////////////////////////////////////////////////////////////////////////////////
// String

String.inject({
	_type: 'string',

	test: function(exp, param) {
		return new RegExp(exp, param || '').test(this);
	},

	/**
	 * Splits the string into an array of words. This can also be used on any
	 * String through $A as defined in Array.js, to work similarly to $w in Ruby
	 */
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

	// TODO: Is this a good name? Does it need to be improved? (lighter.js relies on it).
	escapeRegExp: function() {
		return this.replace(/([-.*+?^${}()|[\]\/\\])/g, '\\$1');
	},

	/**
	 * Trims away characters matching a given regular expression at the beginning
	 * and end of the strnig. If no expression is given, \s is used to match white
	 * space.
	 */
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
		// Nice trick from Prototype:
		return count < 1 ? '' : new Array(count + 1).join(this);
	},

	isHtml: function() {
		// From jQuery:
		return /^[^<]*(<(.|\s)+>)[^>]*$/.test(this);
	}
});

////////////////////////////////////////////////////////////////////////////////
// RegExp

RegExp.inject({
	// Tell Base.type what to return for regexps.
	_type: 'regexp'
});

////////////////////////////////////////////////////////////////////////////////
// Date

Date.inject({
	statics: {
		SECOND: 1000,
		MINUTE: 60000,
		HOUR: 3600000,
		DAY: 86400000,
		WEEK: 604800000, // 7 * DAY
		MONTH: 2592000000, // 30 * DAY
		YEAR: 31536000000, // 365 * DAY

		now: Date.now || function() {
			return +new Date();
		}
	}
});

////////////////////////////////////////////////////////////////////////////////
// Math

/**
 * Returns a random integer number first <= x < second, if two arguments are
 * passed or 0 <= x < first, if there is donly one.
 */
Math.rand = function(first, second) {
	return second == undefined
		? Math.rand(0, first)
		: Math.floor(Math.random() * (second - first) + first);
}

////////////////////////////////////////////////////////////////////////////////
// Color

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

////////////////////////////////////////////////////////////////////////////////
// Json

Json = function(JSON) {
	var special = { '\b': '\\b', '\t': '\\t', '\n': '\\n', '\f': '\\f', '\r': '\\r', '"' : '\\"', "'" : "\\'", '\\': '\\\\' };
	// Support the native Json object if it is there, fall back on JS version.
	return {
		encode: JSON
			? function(obj, properties) {
				// Unfortunately IE does not natively support __proto__, so
				// we need to filter it out from Json
				return JSON.stringify(obj, properties || Browser.TRIDENT && function(key, value) {
					return key == '__proto__' ? undefined : value;
				});
			}
			: function(obj, properties) {
				if (Base.type(properties) == 'array') {
					// Convert properties to a lookup table:
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
					// Treat hash just like object
					case 'hash':
						return '{' + Hash.collect(obj, function(val, key) {
							if (!properties || properties[key]) {
								val = Json.encode(val, properties);
								if (val !== undefined)
									return Json.encode(key) + ':' + val;
							}
						}) + '}';
					// Filter out functions, they are not part of JSON
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
					// No need for security checks when using native JSON.
					return JSON.parse(str);
				} catch (e) {
					return null;
				}
			}
			: function(str, secure) {
				try {
					// Make sure the incoming data is actual JSON
					// Logic borrowed from http://json.org/json2.js
					// Make sure leading/trailing whitespace is removed (IE can't handle it)
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

////////////////////////////////////////////////////////////////////////////////
// Browser

Browser = new function() {
	var name = window.orientation != undefined ? 'ipod'
			: (navigator.platform.match(/mac|win|linux|nix/i) || ['other'])[0].toLowerCase();
	var fields = {
		PLATFORM: name,
		XPATH: !!document.evaluate,
		QUERY: !!document.querySelector
	};
	// Add platform name directly in uppercase too
	fields[name.toUpperCase()] = true;

	function getVersion(prefix, min, max) {
		var ver = (new RegExp(prefix + '([\\d.]+)', 'i').exec(navigator.userAgent) || [0, '0'])[1].split('.');
		return (ver.slice(0, min).join('') + '.' + ver.slice(min, max || ver.length).join('')).toFloat();
	}

	var engines = {
		presto: function() {
			// Opera < v.10 does not report Presto versions, so use Opera versions
			// there instead. As presto starts at 22.15 the range of the value
			// does not clash and we can compare, e.g. Browser.VERSION < 10.
			// Also, Opera 8 reports "...Opera 8...", while 9 reports "...Opera/9..."
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

	// Add console loggin on most browsers as good as we can.
	fields.log = function() {
		// IE does not seem to join with ' ' and has problems with apply
		if (!Browser.TRIDENT && window.console && console.log)
			console.log.apply(console, arguments);
		else
			(window.console && console.log
				|| window.opera && opera.postError
				|| alert)(Array.join(arguments, ' '));
	}

	return fields;
};

// DomElement

////////////////////////////////////////////////////////////////////////////////
// DomNodes

/**
 * DomNodes extends inject so that each of the functions
 * defined bellow are executed on the whole set of nodes, and the
 * returned values are collected in an array and converted to a DomNodes
 * array again, if it contains only nodes.
 */
DomNodes = Array.extend(new function() {
	var unique = 0;
	return {
		initialize: function(nodes) {
			// Define this collections's unique ID. Nodes that are added to it
			// get that field set too, in order to detect multiple additions of
			// nodes in one go. Notice that this does not work when nodes
			// are added to another collection, then again to this one.
			// But for Dom Query functions, this is enough.
			this._unique = unique++;
			// Do not use nodes.push to detect arrays, as we're passing pseudo
			// arrays here too (e.g. childNodes). But the native Option defines
			// .length too, so rule that out by checking nodeType as well.
			this.append(nodes && nodes.length != null && !nodes.nodeType
				? nodes : arguments);
		},

		/**
		 * Only #push wraps the added node in a DomNode. splice and unshift
		 * are NOT overridden to do the same.
		 */
		push: function() {
			this.append(arguments);
			return this.length;
		},

		append: function(items) {
			for (var i = 0, l = items.length; i < l; i++) {
				var el = items[i];
				// Try _wrapper first, for faster performance
				if ((el = el && (el._wrapper || DomNode.wrap(el))) && el._unique != this._unique) {
					el._unique = this._unique;
					this[this.length++] = el;
				}
			}
			return this;
		},

		toNode: function() {
			// return the DomNodes array itself. See inserters comments further bellow
			return this;
		},

		statics: {
			inject: function(src/*, ... */) {
				// For each function that is injected into DomNodes, create a
				// new function that iterates that calls the function on each of
				// the collection's nodes.
				// src can either be a function to be called, or a object literal.
				var proto = this.prototype;
				this.base(Base.each(src || {}, function(val, key) {
					if (typeof val == 'function') {
						var func = val, prev = proto[key];
						var count = func.length, prevCount = prev && prev.length;
						val = function() {
							var args = arguments, values;
							// If there was a previous implementation under this name
							// and the arguments match better, use that one instead.
							// The strategy is very basic: If the same amount of arguments
							// are provided as the previous one accepts, or if more arguments
							// are provided than the new function can handle and the previous
							// implementation expects more, use the previous one instead.
							if (prev && args.length == prevCount
								|| (args.length > count && args.length <= prevCount))
								return prev.apply(this, args);
							this.each(function(obj) {
								// Try to use original method if it's there, in order
								// to support base, as this will be the wrapper that
								// sets it
								var ret = (obj[key] || func).apply(obj, args);
								// Only collect return values if defined and not
								// returning 'this'.
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

////////////////////////////////////////////////////////////////////////////////
// DomNode

DomNode = Base.extend(new function() {
	var nodes = [];
	// LUTs for tags and class based constructors. Bootstrap can automatically
	// use sub-prototype of DomNode for any given wrapped node based on
	// its className Attribute. The sub-prototype only needs to define _class
	var tags = {}, classes = {}, classCheck, unique = 0;

	// Garbage collection - uncache nodes/purge listeners on orphaned nodes
	// so we don't hold a reference and cause the browser to retain them.
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
	// TODO: this seems to cause problems. Turn off for now.
	// dispose.periodic(30000);

	// Private inject function for DomNode. It adds support for
	// _methods and _properties declarations, which forward calls and define
	// getter / setters for fields of the native DOM node.
	function inject(src) {
		// Forward method calls. Returns result if any, otherwise reference
		// to this.
		src = src || {};
		(src._methods || []).each(function(name) {
			src[name] = function(arg) {
				// .apply seems to not be present on native dom functions on
				// Safari. Just pass on the first argument and call directly.
				var ret = this.$[name] && this.$[name](arg);
				return ret === undefined ? this : ret;
			}
		});
		// Define getter / setters
		(src._properties || []).each(function(name) {
			// get/setProperty() expects lowercase property name.
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
		// Use DomNode as as the default, HtmlElement for anything with
		// className !== undefined and special constructors based on tag names.
		// tags stores both upper-case and lower-case references for higher
		// speed.
		// classCheck only exists if HtmlElement was extended with prototypes
		// defining _class. In this case, classCheck is a regular expression that
		// checks className for the occurence of any of the prototype mapped
		// classes, and returns the first occurence, which is then used to
		// decide for constructor. This allows using e.g. "window hidden" for
		// an element that should map to a window prototype.
		var match;
		// Check classCheck first, since it can override the _tag setting
		return classCheck && el.className && (match = el.className.match(classCheck)) && match[2] && classes[match[2]] ||
			// Check _tag settings for extended HtmlElement prototypes bound to tagNames, e.g. HtmlForm, etc.
			el.tagName && tags[el.tagName] ||
			// Html elements
			el.className !== undefined && HtmlElement ||
			// Elements
			el.nodeType == 1 && DomElement ||
			// TextNodes
			el.nodeType == 3 && DomTextNode ||
			// Documents
			el.nodeType == 9 && (el.documentElement.nodeName.toLowerCase() == 'html' && HtmlDocument || DomDocument) ||
			// Windows
			el.location && el.frames && el.history && DomWindow ||
			// Everything else
			DomNode;
	}

	var dont = {};

	return {
		beans: true,
		// Tells Base.type the type to return when encountering an node.
		_type: 'node',
		_collection: DomNodes,
		// Tell extend to automatically call this.base in overridden initialize
		// methods of DomNodes
		// See extend bellow for more information about this.
		_initialize: true,

		initialize: function(el, props, doc) {
			if (!el) return null;
			// Support node creating constructors on subclasses of DomNode
			// that define prototype._tag and can take one argument, which
			// defines the properties to be set:
			if (this._tag && Base.type(el) == 'object') {
				props = el;
				el = this._tag;
			}
			// doc is only used when producing an node from a string.
			if (typeof(el) == 'string') {
				// Call the internal element creation helper. This does not fully
				// set props, only the one needed for the IE workaround.
				// Set(props) is called further bellow.
				el = DomElement.create(el, props, doc);
			} else if (el._wrapper) {
				// Does the DomNode wrapper for this node already exist?
				return el._wrapper;
			}
			if (props === dont) {
				props = null;
			} else {
				// Check if we're using the right constructor, if not, construct
				// with the right one:
				var ctor = getConstructor(el);
				if (ctor != this.constructor)
					return new ctor(el, props);
			}
			// Store a reference to the native node.
			this.$ = el;
			// Store a reference in the native node to the wrapper.
			// Needs to be cleaned up by garbage collection. See above.
			// Not all nodes allow setting of values. E.g. on IE, textnodes don't
			// For now we just ingore them and do not store the wrapper.
			try {
				el._wrapper = this;
				nodes[nodes.length] = el;
			} catch (e) {} // Ignore error
			if (props) this.set(props);
		},

		statics: {
			inject: function(src/*, ... */) {
				if (src) {
					// Produce generic-versions for each of the injected
					// non-static methods, so that they function on native
					// methods instead of wrapped ones. This means
					// DomNode.getProperty(el, name) can be called on non
					// wrapped nodes.
					var proto = this.prototype, that = this;
					src.statics = Base.each(src, function(val, name) {
						if (typeof val == 'function' && !this[name] && !that[name]) {
							// We need to be fast, so assume a maximum of two
							// params instead of using Function#apply.
							this[name] = function(el, param1, param2) {
								if (el) try {
									// Use the ugly but fast trick of setting
									// $ on the prototype and call throught
									// that, then erase again.
									proto.$ = el.$ || el;
									return proto[name](param1, param2);
								} finally {
									delete proto.$;
								}
							}
						}
					}, src.statics || {});
					inject.call(this, src);
					// Remove toString, as we do not want it to be multiplied in
					// _collection (it would not return a string but an array then).
					delete src.toString;
					// Now, after src was processed in #inject, inject not only
					// into this, but also into DomNodes where the functions
					// are "multiplied" for each of the nodes of the collection.
					proto._collection.inject(src);
				}
				for (var i = 1, l = arguments.length; i < l; i++)
					this.inject(arguments[i]);
				return this;
			},

			extend: function(src) {
				// Do not pass src to base, as we weed to fix #inject first.
				var ret = this.base();
				// If initialize is defined, explicitely calls this.base(el, props)
				// here. This is a specialy DomNode extension that does not
				// require the user to call this.base(), since it is used for _class
				// stuff often.
				var init = src.initialize;
				if (init) src.initialize = function(el, props) {
					var ret = this._initialize && this.base(el, props);
					if (ret) return ret;
					init.apply(this, arguments);
				}
				inject.call(ret, src);
				// Undo overriding of the inject method above for subclasses that
				// do not define a different _collection value, as only injecting
				// into DomNode (not subclasses) shall also inject into DomNodes!
				// Reseting before does not work, as it would be overridden
				// during static inheritance again.
				if (ret.prototype._collection == this.prototype._collection)
					ret.inject = inject;
				// When extending DomNode with a tag name field specified, this
				// prototype will be used when wrapping nodes of that type.
				// If this is a prototype for a certain tag name, store it in the LUT.
				if (src) {
					// tags stores both upper-case and lower-case references
					// for higher speed in getConstructor, since tagName can
					// be used for direct lookup, regardless of its case.
					if (src._tag)
						tags[src._tag.toLowerCase()] = tags[src._tag.toUpperCase()] = ret;
					// classCheck is null until a sub-prototype defines _class
					if (src._class) {
						classes[src._class] = ret;
						// Create a regular expression that allows detection of
						// the first prototype mapped className. This needs to
						// contain all defined classes. See getConstructor
						// e.g.: /(^|\s)(post-it|window)(\s|$)/
						classCheck = new RegExp('(^|\\s)(' + Base.each(classes, function(val, name) {
							this.push(name);
						}, []).join('|') + ')(\\s|$)');
						// If the prototype defines an initialize method, and it
						// does not want to be lazily loaded, force wrapping of
						// these nodes on domready, so that initialize will be
						// directly called and further dom manipulation can be done.
						if (!src._lazy && src.initialize) Browser.document.addEvent('domready', function() {
							this.getElements('.' + src._class);
						});
					}
				}
				return ret;
			},

			/**
			 * Wraps the passed node in a DomNode wrapper.
			 * It returns existing wrappers through el._wrapper, if defined.
			 */
			wrap: function(el) {
				return el ? typeof el == 'string' // selector?
					? DomElement.get(el)
					// Make sure we're using the right constructor.
					: el._wrapper || el._collection && el || new (getConstructor(el))(el, dont)
						: null;
			},

			/**
			 * Unwraps a wrapped node and returns its native dom node, or
			 * the node itself if it is already native.
			 */
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

// Use the modified inject function from above which injects both into DomNode
// and DomNodes.
DomNode.inject(new function() {
	// Dom / Html to JS property mappings, as used by getProperty, setProperty
	// and removeProperty.
	var bools = ['compact', 'nowrap', 'ismap', 'declare', 'noshade', 'checked',
		'disabled', 'readonly', 'multiple', 'selected', 'noresize', 'defer'
	].associate();
	var properties = Hash.append({ // props
		text: Browser.TRIDENT || Browser.WEBKIT && Browser.VERSION < 420 || Browser.PRESTO && Browser.VERSION < 9
			? function(node) {
				return node.$.innerText !== undefined ? 'innerText' : 'nodeValue'
			} : 'textContent',
		// Make sure that setting both class and className uses this.$.className instead of setAttribute
		html: 'innerHTML', 'class': 'className', className: 'className', 'for': 'htmlFor'
	}, [ // camels and other values that need to be accessed directly, not through getAttribute
		'value', 'accessKey', 'cellPadding', 'cellSpacing', 'colSpan',
		'frameBorder', 'maxLength', 'readOnly', 'rowSpan', 'tabIndex',
		'selectedIndex', 'useMap', 'width', 'height'
	].associate(function(name) {
		return name.toLowerCase();
	}), bools);

	// Values to manually copy over when cloning with content
	var clones = { input: 'checked', option: 'selected', textarea: Browser.WEBKIT && Browser.VERSION < 420 ? 'innerHTML' : 'value' };

	// handle() handles both get and set calls for any given property name.
	// prefix is either set or get, and is used for lookup of getter / setter
	// methods. get/setProperty is used as a fallback.
	// See DomElement#get/set
	function handle(that, prefix, name, value) {
		var ctor = that.__proto__.constructor;
		// handle caches getter and setter functions for given property names.
		// Store the handlers in the constructor of each prototype, so caching
		// between different sub-prototypes that might redefine getter/setters
		// does not get mixed up:
		var handlers = ctor.handlers = ctor.handlers || { get: {}, set: {} };
		var list = handlers[prefix];
		// First see if there is a getter / setter for the given property
		var fn = name == 'events' && prefix == 'set' ? that.addEvents : list[name];
		if (fn === undefined)
			fn = list[name] = that[prefix + name.capitalize()] || null;
		// If the passed value is an array, use it as the argument
		// list for the call.
		return fn
			? fn[Base.type(value) == 'array' ? 'apply' : 'call'](that, value)
			: that[prefix + 'Property'](name, value);
	}

	// A helper for calling toNode and returning results.
	function toNodes(elements) {
		// Support passing things as argument lists, without the first wrapping array
		// Do not reset elements, since this causes a circular reference on Opera
		// where arguments inherits from array and therefore is returned umodified
		// by Array.create, and where setting elements to a new value modifies
		// this arguments list directly.
		var els = Base.type(elements) == 'array' ? elements : Array.create(arguments);
		// Find out if elements are created, or if they were already passed.
		// The convention is to return the newly created elements if they are not
		// elements already, otherwise return this.
		var created = els.find(function(el) {
			return !DomNode.isNode(el);
		});
		// toNode can either return a single DomElement or a DomElements array.
		var result = els.toNode(this.getDocument());
		return {
			// Make sure we always return an array of the resulted elements as well,
			// for simpler handling in inserters below
			array: result ? (Base.type(result) == 'array' ? result : [result]) : [],
			// Result might be a single element or an array, depending on what the
			// user passed. This is to be returned back. Only define it if the elements
			// were created.
			result: created && result
		};
	}

	var fields = {
		beans: true,
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

		// Returns all the Element's children including text nodes
		getChildNodes: function() {
		 	return new DomNodes(this.$.childNodes);
		},

		hasChildNodes: function() {
			return this.$.hasChildNodes();
		},

		appendChild: function(el) {
			if (el = DomNode.wrap(el)) {
				// Fix a bug on Mac IE when inserting Option elements to Select
				// elements, where the text on these objects is lost after insertion
				// -> inserters.before does the same.
				// This appears to still be needed on IE7.
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
				// Use toNodes to support on the fly creation of one or more
				// elements to replace with:
				el = toNodes.apply(this, arguments);
				var els = el.array;
				// Replace the first item of the array and insert all the others
				// afterwards, if there are more than one:
				if (els.length > 0)
					this.$.parentNode.replaceChild(els[0].$, this.$);
				for (var i = els.length - 1; i > 0; i--)
					els[i].insertAfter(els[0]);
				return el.result;
			}
			return null;
		},

		/**
		 * Wraps the passed elements around the current one.
		 * Elements are converted through toNodes
		 *
		 * Inspired by: jQuery
		 */
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

		hasProperty: function(name) {
			var key = properties[name];
			// Support key branching through functions, as needed by 'text' on IE
			key = key && typeof key == 'function' ? key(this) : key;
			return key ? this.$[key] !== undefined : this.$.hasAttribute(name);
		},

		getProperty: function(name) {
			var key = properties[name], value;
			// Support key branching through functions, as needed by 'text' on IE
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

	// Inserters are only used internally and can assume the source and dest
	// elements to be wrapped elements.
	var inserters = {
		/**
		 * Inserts the source element before the dest element in the DOM.
		 */
		before: function(source, dest) {
			if (source && dest && dest.$.parentNode) {
				// Fix a bug on Mac IE when inserting Option elements to Select
				// elements, where the text on these objects is lost after insertion.
				// -> DomNode#appendChild does the same.
				var text = Browser.TRIDENT && dest.$.text;
				if (text) dest.$.text = '';
				dest.$.parentNode.insertBefore(source.$, dest.$);
				if (text) dest.$.text = text;
			}
		},

		/**
		 * Inserts the source element after the dest element in the DOM.
		 */
		after: function(source, dest) {
			if (source && dest && dest.$.parentNode) {
				var next = dest.$.nextSibling;
				// Do not use the native methods since these do not include the
				// workaround for legacy browsers above. Once that part is
				// deprecated, we can change strategy here. Might be bit faster.
				if (next) source.insertBefore(next);
				else dest.getParent().appendChild(source);
			}
		},

		/**
		 * Inserts the source element at the bottom of the dest element's children.
		 */
		bottom: function(source, dest) {
			if (source && dest)
				dest.appendChild(source);
		},

		/**
		 * Inserts the source element at the top of the dest element's children.
		 */
		top: function(source, dest) {
			if (source && dest) {
				var first = dest.$.firstChild;
				if (first) source.insertBefore(first);
				else dest.appendChild(source);
			}
		}
	};

	inserters.inside = inserters.bottom;

	// Now add the inserters
	// Important: The inseters return this if the object passed is already an
	// element. But if it is a string or an array that is converted to an element,
	// the newly created element is returned instead.

	Base.each(inserters, function(inserter, name) {
		var part = name.capitalize();
		// #insert* acts like the dom #insert* functions, inserting this element
		// into the passed element(s).
		fields['insert' + part] = function(el) {
			el = toNodes.apply(this, arguments);
			// Clone the object for every index other than the first
			// as we're inserting into multiple times.
			for (var i = 0, list = el.array, l = list.length; i < l; i++)
				inserter(i == 0 ? this : this.clone(true), list[i]);
			return el.result || this;
		}

		// #inject* does the reverse of #insert*, it injects the passed element(s)
		// into this element.
		fields['inject' + part] = function(el) {
			el = toNodes.apply(this, arguments);
			for (var i = 0, list = el.array, l = list.length; i < l; i++)
				inserter(list[i], this);
			return el.result || this;
		}
	});

	return fields;
});

////////////////////////////////////////////////////////////////////////////////
// DomElements

DomElements = DomNodes.extend();

////////////////////////////////////////////////////////////////////////////////
// DomElement

DomElement = DomNode.extend({
	beans: true,
	// Tells Base.type the type to return when encountering an element.
	_type: 'element',
	_collection: DomElements,

	statics: {
		/**
		 * Returns the first element matching the given selector, within root
		 * or Browser.document, if root is not specified.
		 */
		get: function(selector, root) {
			// Do not use this for DomElement since $ is a link to DomElement.get
			return (root && DomNode.wrap(root) || Browser.document).getElement(selector);
		},

		/**
		 * Returns all elements matching the given selector, within root
		 * or Browser.document, if root is not specified.
		 */
		getAll: function(selector, root) {
			// Do not use this for DomElement since $$ is a link to DomElement.getAll
			return (root && DomNode.wrap(root) || Browser.document).getElements(selector);
		},

		/**
		 * This is only a helper method that's used both in DomDocument and DomElement.
		 * It does not fully set props, only the values needed for a IE workaround.
		 * It also returns an unwrapped object, that needs to further initalization
		 * and setting of props.
		 * This is needed to avoid production of two objects to match the proper
		 * prototype when using new HtmlElement(name, props).
		 */
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
			// Handle el.ownerDocumet == parent specially for efficiency and
			// also since documents don't define neither contains nor
			// compareDocumentPosition
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
	// A helper for walking the DOM, skipping text nodes
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
		beans: true,
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

		// Returns all the Element's children excluding text nodes
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

////////////////////////////////////////////////////////////////////////////////
// DomTextNode

DomTextNode = DomNode.extend({
	_type: 'textnode'
});

////////////////////////////////////////////////////////////////////////////////
// DomDocument

DomDocument = DomElement.extend({
	beans: true,
	_type: 'document',

	initialize: function() {
		if(Browser.TRIDENT && Browser.VERSION < 7)
			try {
				// Fix background flickering on IE.
				this.$.execCommand('BackgroundImageCache', false, true);
			} catch (e) {}
	},

	createElement: function(tag, props) {
		// Call DomElement.create, the internal creation helper. This does not
		// fully set props, only the one needed for the IE workaround.
		// set(props) is called after for all the others.
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

////////////////////////////////////////////////////////////////////////////////
// DomWindow

// Let Window point to DomWindow for now, so new Window(...) can be called.
// This makese for nicer code, but might have to change in the future.
Window = DomWindow = DomElement.extend({
	beans: true,
	_type: 'window',
	// Don't automatically call this.base in overridden initialize methods
	_initialize: false,
	_methods: ['close', 'alert', 'prompt', 'confirm', 'blur', 'focus', 'reload'],

	getDocument: function() {
		return DomNode.wrap(this.$.document);
	},

	getWindow: function() {
		return this;
	},

	// TODO: add get/setStatus, get/setLocation, and find way to deal with
	// referencing of native fields at the end of initialize.

	/**
	 * A constructor for DomWindow that is based on window.open and extends it
	 * to allow more options in the third parameter.
	 *
	 * If param is a string, the standard window.open is executed.
	 * If param is an object, additional parameters maybe be defined, such as
	 * param.confirm, param.focus, etc. Also, if param.width & height are
	 * defined, The window is centered on screen.
	 */
	initialize: function(param) {
		var win;
		// Are we wrapping a window?
		if (param.location && param.frames && param.history) {
			// Do not return yet as we need to add some properties further down
			win = this.base(param) || this;
		} else {
			// If param a string, convert to param object, using its value for url.
			if (typeof param == 'string')
				param = { url: param };
			// Convert boolean values to 0 / 1:
			(['toolbar','menubar','location','status','resizable','scrollbars']).each(function(key) {
				param[key] = param[key] ? 1 : 0;
			});
			// Center window if left / top is not defined, but dimensions are:
			if (param.width && param.height) {
				if (param.left == null) param.left = Math.round(
					Math.max(0, (screen.width - param.width) / 2));
				if (param.top == null) param.top = Math.round(
					Math.max(0, (screen.height - param.height) / 2 - 40));
			}
			// Now convert paramets to string.
			var str = Base.each(param, function(val, key) {
				// Filter out non-standard param names and convert boolean values to 0 / 1 simply by adding 0 to it
				if (!/^(focus|confirm|url|name)$/.test(key))
					this.push(key + '=' + (val + 0));
			}, []).join();
			win = this.base(window.open(param.url, param.name.replace(/\s+|\.+|-+/gi, ''), str)) || this;
			if (win && param.focus)
				win.focus();
		}
		// Copy over default windows properties before returning
		return ['location', 'frames', 'history'].each(function(key) {
			this[key] = this.$[key];
		}, win);
	}
});

////////////////////////////////////////////////////////////////////////////////
// Dimension

// TODO: Consider splitting this into Position and Dimension, or naming it
// Measure instead
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
		// Pass one of these:
		// (left, top, width, height, clip)
		// ([left, top, width, height, clip])
		// ({ left: , top: , width: , height: , clip: })
		// Do not set bounds, as arguments would then be modified, which we're
		// referencing here:
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
		// Safari returns margins on body which is incorrect if the
		// child is absolutely positioned.
		return next.$ != document.body || cur.getStyle('position') != 'absolute';
	} : null, true);

	var getPositioned = cumulate('offset', 'offsetParent', function(cur, next) {
		return next.$ != document.body && !/^(relative|absolute)$/.test(next.getStyle('position'));
	});

	var getScrollOffset = cumulate('scroll', 'parentNode');

	var fields = {
		beans: true,

		getSize: function() {
			return body(this)
				? this.getWindow().getSize()
				: { width: this.$.offsetWidth, height: this.$.offsetHeight };
		},

		/**
		 * relative can either be a boolean value, indicating positioned (true)
		 * or absolute (false) offsets, or it can be an element in relation to
		 * which the offset is returned.
		 */
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
				// Convert { x: y: } to x / y
				var off = typeof x == 'object' ? x : { x: x, y: y };
				this.$.scrollLeft = off.x;
				this.$.scrollTop = off.y;
			}
			return this;
		},

		scrollTo: function(x, y) {
			// Redirect to setScrollOffset, wich is there for symetry with getScrolloffset
			// Do not simply point to the same function, since setScrollOffset is overridden
			// for DomDocument and DomWindow.
			return this.setScrollOffset(x, y);
		},

		contains: function(pos) {
			var bounds = this.getBounds();
			return pos.x >= bounds.left && pos.x < bounds.right &&
				pos.y >= bounds.top && pos.y < bounds.bottom;
		},

		/**
		 * Tests wether element is within the window bounds and thus visible.
		 * Also returns false if display style is set to none.
		 * @fully specifies wether to test for full or partial visibility.
		 */
		isVisible: function(fully) {
			var win = this.getWindow(), top = win.getScrollOffset().y,
				bottom = top + win.getSize().height, bounds = this.getBounds();
			return (bounds.height > 0 || bounds.width > 0) // visible
					&& (bounds.top >= top && bounds.bottom <= bottom // fully
						|| (fully && bounds.top <= top && bounds.bottom >= bottom) // fully & bigger than screen
						|| !fully && (bounds.top <= top && bounds.bottom >= top // partly top
							|| bounds.top <= bottom && bounds.bottom >= bottom)); // partly bottom
		}
	};

	// Dimension getters and setters:
	['left', 'top', 'right', 'bottom', 'width', 'height'].each(function(name) {
		var part = name.capitalize();
		fields['get' + part] = function() {
			return this.$['offset' + part];
		};
		fields['set' + part] = function(value) {
			// Check for isNaN since it might be values like 'auto' too:
			this.$.style[name] = isNaN(value) ? value : value + 'px';
		};
	});

	return fields;
});

// Inject dimension methods into both DomDocument and Window.
// Use the bind object in each to do so:
[DomDocument, DomWindow].each(function(ctor) {
	ctor.inject(this);
}, {
	beans: true,

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
		// Convert { x: y: } to x / y
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

////////////////////////////////////////////////////////////////////////////////
// DomEvent

// Name it DomEvent instead of Event, as Event is a native prototype.
DomEvent = Base.extend(new function() {
	// MACIE does not accept numbers for keys, so use strings:
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
				this.target = this.target.getParentNode(); // Safari
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
				// TODO: Calculate only if Dimension.js is defined! Add conditional macro?
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
			// Needed for dragging
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
						// Only install it once, since fireEvent calls all the
						// handlers.
						doc.onDomReady = function() {
							if (!Browser.loaded) {
								Browser.loaded = true;
								doc.fireEvent('domready');
								win.fireEvent('domready');
							}
						}
						if (Browser.TRIDENT) {
							// From: http://www.hedgerwow.com/360/dhtml/ie-dom-ondocumentready.html
							var temp = doc.createElement('div');
							// Do not call immediatelly. Call it right after the event handler
							// is actually installed, through delay 0.
							(function() {
								try {
									// This throws an error when the dom is not ready, except for framesets,
									// where the second line is needed and will throw an error when not ready.
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
	// Function that fires / triggers an event. The difference is taht
	// to trigger fake events, one need to call the 'bound' object, whereas
	// to fire the response, one calls 'func'. Bootstrap supports calling both
	// and callEvent produces the closure for each case.
	// In most cases, this calls the same function, but e.g. to initiate
	// a dragstart, we need to trigger it.
	function callEvent(fire) {
		return function(type, args, delay) {
			var entries = (this.events || {})[type];
			if (entries) {
				// Make sure we pass already wrapped events through
				var event = args && args[0];
				if (event)
					args[0] = event.event ? event : new DomEvent(event);
				entries.each(function(entry) {
					entry[fire ? 'func' : 'bound'].delay(delay, this, args);
				}, this);
			}
			// Return true if event was fired, false otherwise
			return !!entries;
		}
	}

	return {
		addEvent: function(type, func) {
			this.events = this.events || {};
			var entries = this.events[type] = this.events[type] || [];
			if (func && !entries.find(function(entry) { return entry.func == func })) {
				// See if we have a pseudo event here.
				var listener = func, name = type, pseudo = DomEvent.events[type];
				if (pseudo) {
					if (typeof pseudo == 'function') pseudo = pseudo.call(this, func);
					listener = pseudo && pseudo.listener || listener;
					// name should contain the name of the native handler that should
					// be remove in removeEvent. It's ok for this to be empty.
					name = pseudo && pseudo.type;
				}
				// Wrap the event handler in another function that checks if an event
				// object was passed or globally set. The DomEvent contstructor
				// handles window.event as well.
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
				// Func is the one to be called through fireEvent. see dragstart
				// Also store a refrence to name here, as this might have changed too.
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

////////////////////////////////////////////////////////////////////////////////
// Drag

// Fake dragstart, drag and dragend events, all in a self contained inject scope.

DomEvent.add(new function() {
	var object, last;

	function dragStart(event) {
		if (object != this) {
			event.type = 'dragstart';
			last = event.page;
			this.fireEvent('dragstart', [event]);
			// dragstart might stop the event, check here
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

// Dom Selectors

////////////////////////////////////////////////////////////////////////////////
// Selectors

DomElement.inject(new function() {
	// Method indices:
	var XPATH= 0, FILTER = 1;

	var methods = [{ // XPATH
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
	}, { // FILTER
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
				// First try getElementById. If that does not return the right
				// object, retrieve tags first and then filter by id.
				var el = (context.ownerDocument || context).getElementById(params.id);
				// Clear as it is already filtered by getElementById
				params.id = null;
				return el && DomElement.isAncestor(el, context)
					&& match(el, params, data) ? [el] : null;
			} else {
				if (!items.length) {
					items = context.getElementsByTagName(tag);
					// Clear as it is already filtered by getElementsByTagName
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
		selector.replace(/:([^:(]+)*(?:\((["']?)(.*?)\2\))?|\[([\w-]+)(?:([!*^$~|]?=)(["']?)(.*?)\6)?\]|\.[\w-]+|#[\w-]+|\w+|\*/g, function(part) {
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
			// Use a hack to call DomElement.prototype.getProperty on
			// unwrapped elements very quickly: Set $ on
			// DomElement.prototype, then call getProperty on it.
			// This is much faster than the DomElement.getProperty generic.
			proto.$ = el; // Point to the native elment for the call
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
		// XPATH does not properly match selected attributes in option elements
		// Force filter code when the selectors contain "option["
		// Also, use FILTER when filtering a previously filled list of items,
		// as used by getParents()
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
			if (!params) return elements; // TODO: correct?
			var next = method.getParam(items, separators[i - 1], context, params, data);
			if (!next) break;
			items = next;
		}
		method.getElements(items, elements, context);
		return elements;
	}

	return {
		beans: true,

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
			// Try  fetching by id first, if no success, assume a real selector.
			// Note that '#' is not needed, a string that could be an id (a-zA-Z_-)
			// is enough for trying getElementById first.
			// So $() can also work like Mootools' $()
			if (type == 'window') {
				el = selector;
			} else {
				if (type == 'string' && (match = selector.match(/^#?([\w-]+)$/)))
					el = this.getDocument().$.getElementById(match[1]);
				// TODO!
				else if (DomNode.isNode(type))
					el = DomElement.unwrap(selector);
				// If el was fetched by id above, but is not a child of this or is this,
				// use the real selector.
				if (el && el != this.$ && !DomElement.isAncestor(el, this.$))
					el = null;
				// TODO: Is there a way to only fetch the first in getElements,
				// with an optional third parameter?
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

////////////////////////////////////////////////////////////////////////////////
// Separators

DomElement.separators = {
	'~': [
		// XPATH
		'/following-sibling::',
		// FILTER
		function(item, params, add) {
			while (item = item.nextSibling)
				if (item.nodeType == 1 && add(item))
					break;
		}
	],

	'+': [
		// XPATH
		'/following-sibling::*[1]/self::',
		// FILTER
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
		// XPATH
	 	'/',
		// FILTER
		function(item, params, add) {
			var children = item.childNodes;
			for (var i = 0, l = children.length; i < l; i++)
				if (children[i].nodeType == 1)
					add(children[i]);
		}
	],

	' ': [
		// XPATH
		'//',
		// FILTER
		function(item, params, add) {
			var children = item.getElementsByTagName(params.tag);
			params.clearTag = true;
			for (var i = 0, l = children.length; i < l; i++)
				add(children[i]);
		}
	]
};

////////////////////////////////////////////////////////////////////////////////
// Operators

DomElement.operators = new function() {
	// Producer for the group of contains based operators: *=, |=, ~=. See bellow.
	function contains(sep) {
		return [
			// XPATH
			function(a, v) {
				return '[contains(' + (sep ? 'concat("' + sep + '", @' + a + ', "' + sep + '")' : '@' + a) + ', "' + sep + v + sep + '")]';
			},
			// FILTER
			function(a, v) {
				return a.contains(v, sep);
			}
		]
	}

	return {
		'=': [
			// XPATH
			function(a, v) {
				return '[@' + a + '="' + v + '"]';
			},
			// FILTER
			function(a, v) {
				return a == v;
			}
		],

		'^=': [
			// XPATH
	 		function(a, v) {
				return '[starts-with(@' + a + ', "' + v + '")]';
			},
			// FILTER
			function(a, v) {
				return a.substring(0, v.length) == v;
			}
		],

		'$=': [
			// XPATH
			function(a, v) {
				return '[substring(@' + a + ', string-length(@' + a + ') - ' + v.length + ' + 1) = "' + v + '"]';
			},
			// FILTER
			function(a, v) {
				return a.substring(a.length - v.length) == v;
			}
		],

		'!=': [
			// XPATH
			function(a, v) {
				return '[@' + a + '!="' + v + '"]';
			},
			// FILTER
			function(a, v) {
				return a != v;
			}
		],

		'*=': contains(''),

		'|=': contains('-'),

		'~=': contains(' ')
	};
};

////////////////////////////////////////////////////////////////////////////////
// Pseudos

DomElement.pseudos = new function() {
	// Handler for the nth-child group of pseudo operators.
	var nthChild = [
		// XPATH
		function(argument) {
			switch (argument.special) {
				case 'n': return '[count(preceding-sibling::*) mod ' + argument.a + ' = ' + argument.b + ']';
				case 'first': return '[count(preceding-sibling::*) = 0]';
				case 'last': return '[count(following-sibling::*) = 0]';
				case 'only': return '[not(preceding-sibling::* or following-sibling::*)]';
				case 'index': return '[count(preceding-sibling::*) = ' + argument.a + ']';
			}
		},
		// FILTER
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

	// Producer for both case-sensitive and caseless versions of the contains
	// pseudo operator.
	function contains(caseless) {
		// abc for lowercase translation.
		var abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
		return [
			// XPATH
			function(argument) {
				return '[contains(' + (caseless ? 'translate(text(), "' + abc
					+ '", "' + abc.toLowerCase() + '")' : 'text()') + ', "'
					+ (caseless && argument ? argument.toLowerCase() : argument) + '")]';
			},
			// FILTER
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

		// Short-cut to nth-child(even) / nth-child(2n)
		'even': {
			parser: { a: 2, b: 1, special: 'n' },
			handler: nthChild
		},

		// Short-cut to nth-child(odd) / nth-child(2n+1)
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
			// XPATH
			function() {
				return '[not(@disabled)]';
			},
			// FILTER
			function(el) {
				return !el.disabled;
			}
		],

		'empty': [
			// XPATH
		 	function() {
				return '[not(node())]';
			},
			// FILTER
			function(el) {
				return !(el.innerText || el.textContent || '').length;
			}
		],

		'contains': contains(false),

		// Extension of contains for case insensitive compare. This is very
		// helpfull for on-site searches.
		'contains-caseless': contains(true)
	};
};

// Html

////////////////////////////////////////////////////////////////////////////////
// HtmlElements

HtmlElements = DomElements.extend();

////////////////////////////////////////////////////////////////////////////////
// HtmlElement

HtmlElement = DomElement.extend({
	_collection: HtmlElements
});

// Use the modified inject function from above which injects both into HtmlElement
// and HtmlElements.
HtmlElement.inject({
	beans: true,
	_properties: ['html'],

	getClass: function() {
		return this.$.className;
	},

	setClass: function(cls) {
		this.$.className = cls;
	},

	modifyClass: function(name, add) {
		if (!this.hasClass(name) ^ !add) // xor
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

////////////////////////////////////////////////////////////////////////////////
// toNode conversion for Array and String

Array.inject({
	toNode: function(doc) {
		doc = DomNode.wrap(doc || document);
		//	['div', { margin: 10 }, [ // Children
		//		'span', { html: 'hello ' },
		//		'<span>world</span>'
		//	]]
		var elements = new HtmlElements();
		for (var i = 0; i < this.length;) {
			var value = this[i++], element = null, type = Base.type(value);
			if (type == 'string') {
				// If the string is html, convert it through String#toNode.
				// Otherwise assume it's a tag name, and look see the following
				// value is a properties hash. Use these to create the element:
				var props = /^(object|hash)$/.test(Base.type(this[i])) && this[i++];
				element = value.isHtml()
					? value.toNode(doc).set(props)
					: doc.createElement(value, props);
				// See if it has children defined, and add them through Array#toNode
				if (Base.type(this[i]) == 'array')
					element.injectBottom(this[i++].toNode(doc));
			} else if (DomNode.isNode(type)) {
				// Raw nodes / elements
				element = value;
			} else if (value && value.toNode) {
				// Anything else
				element = value.toNode(doc);
			}
			// Append arrays and push single elements.
			if (element)
				elements[Base.type(element) == 'array' ? 'append' : 'push'](element);
		}
		// Unbox if there's only one element in the array
		return elements.length == 1 ? elements[0] : elements;
	}
});

String.inject({
	toNode: function(doc) {
		var doc = doc || document, elements;
		// See if it contains tags. If so, produce nodes, otherwise execute
		// the string as a selector
		if (this.isHtml()) {
			// Html code. Conversion to HtmlElements ported from jQuery
			// Trim whitespace, otherwise indexOf won't work as expected
			var str = this.trim().toLowerCase();
			// doc can be native or wrapped:
			var div = DomElement.unwrap(doc).createElement('div');

			var wrap =
				 // option or optgroup
				!str.indexOf('<opt') &&
				[1, '<select>', '</select>'] ||
				!str.indexOf('<leg') &&
				[1, '<fieldset>', '</fieldset>'] ||
				(!str.indexOf('<thead') || !str.indexOf('<tbody') || !str.indexOf('<tfoot') || !str.indexOf('<colg')) &&
				[1, '<table>', '</table>'] ||
				!str.indexOf('<tr') &&
				[2, '<table><tbody>', '</tbody></table>'] ||
			 	// <thead> matched above
				(!str.indexOf('<td') || !str.indexOf('<th')) &&
				[3, '<table><tbody><tr>', '</tr></tbody></table>'] ||
				!str.indexOf('<col') &&
				[2, '<table><colgroup>', '</colgroup></table>'] ||
				[0,'',''];

			// Go to html and back, then peel off extra wrappers
			div.innerHTML = wrap[1] + this + wrap[2];
			// Move to the right depth
			while (wrap[0]--)
				div = div.firstChild;
			// Remove IE's autoinserted <tbody> from table fragments
			if (Browser.TRIDENT) {
				var els = [];
				if (!str.indexOf('<table') && str.indexOf('<tbody') < 0) {
					// String was a <table>, *may* have spurious <tbody>
					els = div.firstChild && div.firstChild.childNodes;
				} else if (wrap[1] == '<table>' && str.indexOf('<tbody') < 0) {
					// String was a bare <thead> or <tfoot>
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
			// Simply execute string as dom selector.
			// Make sure doc is wrapped.
			elements = DomNode.wrap(doc).getElements(this);
		}
		// Unbox if there's only one element in the array
		return elements.length == 1 ? elements[0] : elements;
	}
});

////////////////////////////////////////////////////////////////////////////////
// HtmlDocument

HtmlDocument = DomDocument.extend({
	// Use HtmlElements collection instead of DomElements for HtmlDocuments
	_collection: HtmlElements
});

////////////////////////////////////////////////////////////////////////////////
// Style

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

	// Now pre-split all style.all settings at ' ', instead of each time
	// in setStyles
	Base.each(styles.all, function(val, name) {
		this[name] = val.split(' ');
	});

	var fields = {
		beans: true,

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
				// Fix IE / Opera style that falsly include border and padding:
				if (/^(width|height)$/.test(name)) {
					var size = 0;
					(name == 'width' ? ['left', 'right'] : ['top', 'bottom']).each(function(val) {
						size += this.getStyle('border-' + val + '-width').toInt() + this.getStyle('padding-' + val).toInt();
					}, this);
					// TODO: Should 'scroll' be used instead, as 'offset' also includes the scroll bars?
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
					// Setting clip to true sets it to the current bounds
					// TODO: Calculate only if Dimension.js is defined? add conditional macro?
					if (value == true)
						value = [0, el.offsetWidth, el.offsetHeight, 0];
					break;
				default:
					name = name.camelize();
			}
			var type = Base.type(value);
			if (value != undefined && type != 'string') {
				var parts = styles.all[name] || ['@'], index = 0;
				// Flatten arrays, e.g. for borderColor where it might be an
				// array of four color arrays.
				value = (type == 'array' ? value.flatten() : [value]).map(function(val) {
					var part = parts[index++];
					if (!part)
						throw Base.stop;
					return Base.type(val) == 'number' ? part.replace('@', name == 'opacity' ? val : Math.round(val)) : val;
				}).join(' ');
			}
			switch (name) {
				case 'visibility':
					// Convert 0 to false, 1 to true before converting to visible / hidden
					if (!isNaN(value)) value = !!value.toInt() + '';
					// Convert true -> visible, false -> hidden, everything else remains unchanged
				 	value = value == 'true' && 'visible' || value == 'false' && 'hidden' || value;
					break;
				case 'opacity':
					// Set opacity to 1 if it's 0 and set visibility to 0 instead,
					// to fix a problem on Firefox on Mac, where antialiasing is affected
					// otherwise... TODO: Find better solution?
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
						// only set styles that have a defined value (null !== undefined)
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

	// Create getters and setters for some often used css properties:
	// TODO: Add more?
	['opacity', 'color', 'background', 'visibility', 'clip', 'zIndex',
		'border', 'margin', 'padding', 'display'].each(function(name) {
		var part = name.capitalize();
		fields['get' + part] = function() {
			return this.getStyle(name);
		};
		fields['set' + part] = function(value) {
			// pass mutliple params as array
			return this.setStyle(name, arguments.length > 1
				? Array.create(arguments) : value);
		};
	});

	return fields;
});

////////////////////////////////////////////////////////////////////////////////
// HtmlForm

// HtmlForm related functions, but available in all elements:

HtmlElement.inject({
	beans: true,

	getFormElements: function() {
		return this.getElements(['input', 'select', 'textarea']);
	},

	getValue: function(name) {
		var el = this.getElement(name);
		return el && el.getValue && el.getValue();
	},

	setValue: function(name, val) {
		var el = this.getElement(name);
		// On Safari, using injectBottom here causes problems with transmission of
		// some of the form values sometimes. Injecting at the top seems to solve
		// this.
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

HtmlForm = HtmlElement.extend({
	beans: true,
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

HtmlFormElement = HtmlElement.extend({
	beans: true,
	_properties: ['name', 'disabled'],
	_methods: ['focus', 'blur'],

	enable: function(enable) {
		var disabled = !enable && enable !== undefined;
		if (disabled) this.$.blur();
		this.$.disabled = disabled;
		return this;
	}
});

HtmlInput = HtmlFormElement.extend({
	beans: true,
	_tag: 'input',
	_properties: ['type', 'checked', 'defaultChecked', 'readOnly', 'maxLength'],
	_methods: ['click'],

	getValue: function() {
		if (this.$.checked && /^(checkbox|radio)$/.test(this.$.type) ||
			/^(hidden|text|password|button|search)$/.test(this.$.type))
			return this.$.value;
	},

	// TODO: Decide if setValue for checkboxes / radios should actually change
	// the value or set checked if the values match! Maybe a new function is
	// needed that does that, e.g. set / getCurrent
	setValue: function(val) {
		if (/^(checkbox|radio)$/.test(this.$.type)) this.$.checked = this.$.value == val;
		// Fix IE bug where string values set to null appear as 'null' instead of ''
		else this.$.value = val != null ? val : '';
		return this;
	}
});

HtmlTextArea = HtmlFormElement.extend({
	beans: true,
	_tag: 'textarea',
	_properties: ['value']
});

HtmlSelect = HtmlFormElement.extend({
	beans: true,
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

HtmlOption = HtmlFormElement.extend({
	beans: true,
	_tag: 'option',
	_properties: ['text', 'value', 'selected', 'defaultSelected', 'index']
});

////////////////////////////////////////////////////////////////////////////////
// Selection

HtmlFormElement.inject({
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
		// Fix Firefox scroll bug, see http://userscripts.org/scripts/review/9452, #insertAtCaret()
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

////////////////////////////////////////////////////////////////////////////////
// HtmlImage

HtmlImage = HtmlElement.extend({
	beans: true,
	_tag: 'img',
	_properties: ['src', 'alt', 'title']
});

// Globals

////////////////////////////////////////////////////////////////////////////////
// Globals

// Sort out garbage collection at the same time
$document = Browser.document = DomNode.wrap(document);
$window = Browser.window = DomNode.wrap(window).addEvent('unload', DomNode.dispose);

// Remote

////////////////////////////////////////////////////////////////////////////////
// Callback

/**
 * Chain interface
 */
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

/**
 * Callback interface
 */
Callback = {
	addEvent: function(type, fn) {
		var ref = this.events = this.events || {};
		ref = ref[type] = ref[type] || [];
		// We need to pass an iterator function to find, as otherwise fn
		// is used as an iterator.
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
		// Keep copying this.options, as it might be defined in the prototype
		return (this.options = Hash.create(this.options, opts)).each(function(val, i) {
			if (typeof val == 'function' && (i = i.match(/^on([A-Z]\w*)/)))
				this.addEvent(i[1].toLowerCase(), val);
		}, this);
	},

	statics: {
		inject: function(/* ... */) {
			var proto = this.prototype, options = proto.options;
			this.base.apply(this, arguments);
			if (proto.options != options)
				proto.options = Hash.merge({}, options, proto.options);
			return this;
		}
	}
};

////////////////////////////////////////////////////////////////////////////////
// Request

// options:
//   data
//   headers
//   method
//   async
//	 link
//   urlEncoded
//   encoding
//   evalScripts
//   evalResponse
//   emulation
//   type (json, html, xml)
//   secure
//   update
//   filter

Request = Base.extend(Chain, Callback, new function() {
	var unique = 0;

	function createRequest(that) {
		if (!that.transport)
			that.transport = window.XMLHttpRequest && new XMLHttpRequest()
				|| Browser.TRIDENT && new ActiveXObject('Microsoft.XMLHTTP');
	}

	function createFrame(that) {
		var id = 'request_' + unique++, load = that.onFrameLoad.bind(that);
		// IE Fix: Setting load event on iframes does not work, use onreadystatechange
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
		// Opera fix: force the iframe to be valid
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

		initialize: function(/* url: 'string', options: 'object', handler: 'function' */) {
			var params = Array.associate(arguments, { url: 'string', options: 'object', handler: 'function' });
			this.setOptions(params.options);
			// If a handler is passed, it is used to recieve both success and
			// failure events. Only the success event will recieve a result
			// argument though.
			if (params.handler)
				this.addEvent('complete', params.handler);
			// Always set type to html if updating elements
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
				// Try fetching value from the first tetarea in the document first,
				// since that's the convention to send data with iframes now, just
				// like in dojo.
				var html = this.options.type == 'html', area = !html
					&& doc.getElementsByTagName('textarea')[0];
				var text = doc && (area && area.value || doc.body
					&& (html && doc.body.innerHTML || doc.body.textContent
					|| doc.body.innerText)) || '';
				// Clear src
				this.frame.element.setProperty('src', '');
				// TODO: Add support for xml?
				this.success(text);
				// We need the iframe to stay around for a little while,
				// otherwise it appears to load endlessly. Insert it back in
				// and use delay to remove it again. This even works if
				// success above changes the whole html and would remove the
				// iframe, as it can happen during editing. Since we remove
				// it before already, it is untouched by this.
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
			default: // xml?
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
				// Strip scripts from text and execute bellow
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
					// No need to post using forms if there are no files
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
					// No support for POST when using iframes. We could fake
					// it through a hidden form that's produced on the fly,
					// parse data and url for query values, but that's going a bit
					// far for legacy support.
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
			// Check frame first, as this is never reused.
			if (this.frame) {
				// Are we sending the request by submitting a form or simply
				// setting the src?
				var form = !string && data;
				if (form) {
					form.set({
						target: this.frame.id, action: url, method: method,
						enctype: /* TODO: opts.urlEncoded || */ method == 'get'
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

HtmlForm.inject({
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

////////////////////////////////////////////////////////////////////////////////
// Asset

Asset = new function() {
	// Clones props and remove all handlers:
	function getProperties(props) {
		return props ? Hash.create(props).each(function(val, key) {
			if (/^on/.test(key)) delete this[key];
		}) : {};
	}

	/*
	Trial at syncronized loading for multiple script assets
	but how to return the full set of assets, since they are created serially?
	function createMultiple(type, sources, options, sync) {
		var props = getProperties(options), count = 0;
		options = options || {};
		var assets = new HtmlElements();
		function load(src) {
			props.onLoad = function() {
				if (options.onProgress)
					options.onProgress.call(this, src);
				if (++count == sources.length && options.onComplete)
					options.onComplete.call(this);
			}
			assets.push(Asset[type](src, props));
		}
		if (sync) {
			var progress = options.onProgress;
			options.onProgress = function(src) {
				if (progress)
					progress.call(this, src);
				var next = sources[count + 1];
				if (next)
					load(next);
			};
			load(sources[0]);
		} else {
			sources.each(load);
		}
		return assets;
	}
	*/
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
				 	// props.onLoad can be null
					load: props.onLoad && function() {
						// We receive this event more than once on Opera, filter
						// out here...
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
			// On Safari < 3, execute a Request for the same resource at
			// the same time. The resource will only be loaded once, and the
			// Request will recieve a notification, while the script does not.
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

////////////////////////////////////////////////////////////////////////////////
// Cookie

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

// Effects

////////////////////////////////////////////////////////////////////////////////
// Fx

// Mootools uses #setNow to define the current value and #increase to set them
// Bootstrap relies instead on #update that recieves a value to set and #get
// to retrieve the current value. Any class extending Fx needs to define these.

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
		// Fx.Elements allows effects to be run in slave mode.
		if (!this.slave) {
			this.timer = this.step.periodic(Math.round(1000 / this.options.fps), this);
			this.fireEvent('start', [this.element]);
		}
		// Make the first step now:
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

////////////////////////////////////////////////////////////////////////////////
// Fx.Scroll

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

////////////////////////////////////////////////////////////////////////////////
// Fx.CSS

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
			// If only one value is specified, use the current state as the
			// starting point.
			if (!Base.check(values[1]))
				values = [ element.getStyle(property), values[0] ];
			var parsed = values.map(Fx.CSS.set);
			return { from: parsed[0], to: parsed[1] };
		},

		set: function(value) {
			// Array.create splits strings at white spaces through String#toArray
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

////////////////////////////////////////////////////////////////////////////////
// Fx.Style

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

////////////////////////////////////////////////////////////////////////////////
// Fx.Style

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
			// Tell Fx we're in slave mode
			fx.slave = true;
			fx.start(val);
		}

		Base.each(obj, function(val, key) {
			if (key == '*') {
				// Wildcard for effects to be applied to all elements
				this.elements.each(function(el, key) {
					start(this, key, val);
				}, this);
			} else if (isNaN(parseInt(key))) {
				// A selector, for elements to be added, if they are not there
				// already.
				var els = DomElement.getAll(key);
				this.elements.append(els);
				els.each(function(el) {
					start(this, this.elements.indexOf(el), val);
				}, this);
			} else {
				// A normal array index in the passed elements array
				start(this, key, val);
			}
		}, this);
		return this.base();
	},

	set: function(to) {
		// do nothing, since update() handles slaves
	},

	update: function(to) {
		Base.each(this.effects, function(fx) {
			fx.step();
		});
	}
});

Fx.Transitions = new Base().inject({
	// Override the Fx.Transitions' inject function so that each function that
	// is injected recieved #In, #Out and #InOut as additional methods.
	inject: function(src) {
		// Walk through all passed functions and add the additional functions.
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

