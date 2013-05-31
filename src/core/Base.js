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
 * @name Base
 * @class
 * @private
 */
// Extend Base with utility functions used across the library. Also set
// this.Base on the injection scope, since straps.js ommits that.
Base.inject(/** @lends Base# */{
	// Have generics versions of #clone() and #toString():
	generics: true,

	/**
	 * General purpose clone function that delegates cloning to the constructor
	 * that receives the object to be cloned as the first argument.
	 * Note: #clone() needs to be overridden in any class that requires other
	 * cloning behavior.
	 */
	clone: function() {
		return new this.constructor(this);
	},

	/**
	 * Renders base objects to strings in object literal notation.
	 */
	toString: function() {
		return this._id != null
			?  (this.constructor.name || 'Object') + (this._name
				? " '" + this._name + "'"
				: ' @' + this._id)
			: '{ ' + Base.each(this, function(value, key) {
				// Hide internal properties even if they are enumerable
				if (!/^_/.test(key)) {
					var type = typeof value;
					this.push(key + ': ' + (type === 'number'
							? Formatter.instance.number(value)
							: type === 'string' ? "'" + value + "'" : value));
				}
			}, []).join(', ') + ' }';
	},

	/**
	 * Serializes this object to a JSON string.
	 *
	 * @param {Object} [options={ precision: 5 }]
	 */
	exportJSON: function(options) {
		return Base.exportJSON(this, options);
	},

	// To support JSON.stringify:
	toJSON: function() {
		return Base.serialize(this);
	},

	/**
	 * #_set() is part of the mechanism for constructors which take one object
	 * literal describing all the properties to be set on the created instance.
	 * @return {Boolean} {@true if the object is a plain object}
	 */
	_set: function(props) {
		if (props && Base.isPlainObject(props)) {
			for (var key in props)
				if (props.hasOwnProperty(key) && key in this)
					this[key] = props[key];
			return true;
		}
	},

	statics: /** @lends Base */{

		// Keep track of all named classes for serialization and exporting.
		exports: new Base(),

		extend: function extend(src) {
			// Override Base.extend() to register named classes in Base.exports,
			// for deserialization and injection into PaperScope.
			var res = extend.base.apply(this, arguments),
				name = res.name;
			if (name)
				Base.exports[name] = res;
			return res;
		},

		/**
		 * Checks if two values or objects are equals to each other, by using
		 * their equals() methods if available, and also comparing elements of
		 * arrays and properties of objects.
		 */ 
		equals: function(obj1, obj2) {
			function checkKeys(o1, o2) {
				for (var i in o1)
					if (o1.hasOwnProperty(i) && typeof o2[i] === 'undefined')
						return false;
				return true;
			}
			if (obj1 == obj2)
				return true;
			// Call #equals() on both obj1 and obj2
			if (obj1 && obj1.equals)
				return obj1.equals(obj2);
			if (obj2 && obj2.equals)
				return obj2.equals(obj1);
			// Compare arrays
			if (Array.isArray(obj1) && Array.isArray(obj2)) {
				if (obj1.length !== obj2.length)
					return false;
				for (var i = 0, l = obj1.length; i < l; i++) {
					if (!Base.equals(obj1[i], obj2[i]))
						return false;
				}
				return true;
			}
			// Compare objects
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

		/**
		 * When called on a subclass of Base, it reads arguments of the type of
		 * the subclass from the passed arguments list or array, at the given
		 * index, up to the specified length.
		 * When called directly on Base, it reads any value without conversion
		 * from the apssed arguments list or array.
		 * This is used in argument conversion, e.g. by all basic types (Point,
		 * Size, Rectangle) and also higher classes such as Color and Segment.
		 * @param {Array} list the list to read from, either an arguments object
		 *        or a normal array.
		 * @param {Number} start the index at which to start reading in the list
		 * @param {Number} length the amount of elements that can be read
		 * @param {Boolean} clone controls wether passed objects should be
		 *        cloned if they are already provided in the required type
		 */
		read: function(list, start, length, clone, readNull) {
			// See if it's called directly on Base, and if so, read value and
			// return without object conversion.
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
			if (obj instanceof this || readNull && obj == null && length <= 1) {
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
				// Have arguments._read point to the amount of args read in the
				// last read() call
				list._read = obj._read;
				delete obj._read;
			}
			return obj;
		},

		/**
		 * Allows peeking ahead in reading of values and objects from arguments
		 * list through Base.read().
		 * @param {Array} list the list to read from, either an arguments object
		 *        or a normal array.
		 * @param {Number} start the index at which to start reading in the list
		 */
		peek: function(list, start) {
			return list[list._index = start || list._index || 0];
		},

		/**
		 * Reads all readable arguments from the list, handling nested arrays
		 * seperately.
		 * @param {Array} list the list to read from, either an arguments object
		 *        or a normal array.
		 * @param {Number} start the index at which to start reading in the list
		 * @param {Boolean} clone controls wether passed objects should be
		 *        cloned if they are already provided in the required type
		 */
		readAll: function(list, start, clone) {
			var res = [], entry;
			for (var i = start || 0, l = list.length; i < l; i++) {
				res.push(Array.isArray(entry = list[i])
					? this.read(entry, 0, 0, clone) // 0 for length = max
					: this.read(list, i, 1, clone));
			}
			return res;
		},

		/**
		 * Allows using of Base.read() mechanism in combination with reading
		 * named arguments form a passed property object literal. Calling 
		 * Base.readNamed() can read both from such named properties and normal
		 * unnamed arguments through Base.read(). In use for example for the
		 * various Path.Constructors.
		 * @param {Array} list the list to read from, either an arguments object
		 *        or a normal array.
		 * @param {Number} start the index at which to start reading in the list
		 * @param {String} name the property name to read from.
		 */
		readNamed: function(list, name, start, length, clone, readNull) {
			var value = this.getNamed(list, name);
			return this.read(value != null ? [value] : list, start, length,
					clone, readNull);
		},

		/**
		 * @return the named value if the list provides an arguments object,
		 * {@code null} if the named value is {@code null} or {@code undefined},
		 * and {@code undefined} if there is no arguments object. 
		 * If no name is provided, it returns the whole arguments object.
		 */
		getNamed: function(list, name) {
			var arg = list[0];
			if (list._hasObject === undefined)
				list._hasObject = list.length === 1 && Base.isPlainObject(arg);
			if (list._hasObject)
				// Return the whole arguments object if no name is provided.
				return name ? arg[name] : arg;
		},

		/**
		 * Checks if the argument list has a named argument with the given name.
		 * If name is {@code null}, it returns {@code true} if there are any
		 * named arguments.
		 */
		hasNamed: function(list, name) {
			return !!this.getNamed(list, name);
		},

		/**
		 * Serializes the passed object into a format that can be passed to 
		 * JSON.stringify() for JSON serialization.
		 */
		serialize: function(obj, options, compact, dictionary) {
			options = options || {};

			var root = !dictionary,
				res;
			if (root) {
				options.formatter = new Formatter(options.precision);
				// Create a simple dictionary object that handles all the
				// storing and retrieving of dictionary definitions and
				// references, e.g. for symbols and gradients. Items that want
				// to support this need to define globally unique _id attribute. 
				/**
				 * @namespace
				 * @private
				 */
				dictionary = {
					length: 0,
					definitions: {},
					references: {},
					add: function(item, create) {
						// See if we have reference entry with the given id
						// already. If not, call create on the item to allow it
						// to create the definition, then store the reference
						// to it and return it.
						var id = '#' + item._id,
							ref = this.references[id];
						if (!ref) {
							this.length++;
							var res = create.call(item),
								name = item.constructor.name;
							// Also automatically insert class for dictionary
							// entries.
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
				// If we don't serialize to compact form (meaning no type
				// identifier), see if _serialize didn't already add the class,
				// e.g. for classes that do not support compact form.
				var name = obj.constructor.name;
				if (name && !compact && !res._compact && res[0] !== name)
					res.unshift(name);
			} else if (Array.isArray(obj)) {
				res = [];
				for (var i = 0, l = obj.length; i < l; i++)
					res[i] = Base.serialize(obj[i], options, compact,
							dictionary);
				// Mark array as compact, so obj._serialize handling above
				// doesn't add the constructor name again.
				if (compact)
					res._compact = true;
			} else if (Base.isPlainObject(obj)) {
				res = {};
				for (var i in obj)
					if (obj.hasOwnProperty(i))
						res[i] = Base.serialize(obj[i], options, compact,
								dictionary);
			} else if (typeof obj === 'number') {
				res = options.formatter.number(obj, options.precision);
			} else {
				res = obj;
			}
			return root && dictionary.length > 0
					? [['dictionary', dictionary.definitions], res]
					: res;
		},

		/**
		 * Deserializes from parsed JSON data. A simple convention is followed:
		 * Array values with a string at the first position are links to
		 * deserializable types through Base.exports, and the values following
		 * in the array are the arguments to their initialize function.
		 * Any other value is passed on unmodified.
		 * The passed data is recoursively traversed and converted, leaves first
		 */
		deserialize: function(obj, data) {
			var res = obj;
			// A data side-car to deserialize that can hold any kind of 'global'
			// data across a deserialization. It's currently just used to hold
			// dictionary definitions.
			data = data || {};
			if (Array.isArray(obj)) {
				// See if it's a serialized type. If so, the rest of the array
				// are the arguments to #initialize(). Either way, we simply
				// deserialize all elements of the array.
				var type = obj[0],
					// Handle stored dictionary specially, since we need to
					// keep is a lookup table to retrieve referenced items from.
					isDictionary = type === 'dictionary';
				if (!isDictionary) {
					// First see if this is perhaps a dictionary reference, and
					// if so return its definition instead.
					if (data.dictionary && obj.length == 1 && /^#/.test(type))
						return data.dictionary[type];
					type = Base.exports[type];
				}
				res = [];
				// Skip first type entry for arguments
				for (var i = type ? 1 : 0, l = obj.length; i < l; i++)
					res.push(Base.deserialize(obj[i], data));
				if (isDictionary) {
					data.dictionary = res[0];
				} else if (type) {
					// Create serialized type and pass collected arguments to
					// #initialize().
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

		exportJSON: function(obj, options) {
			return JSON.stringify(Base.serialize(obj, options));
		},

		importJSON: function(json) {
			return Base.deserialize(
					typeof json === 'string' ? JSON.parse(json) : json);
		},

		/**
		 * Utility function for adding and removing items from a list of which
		 * each entry keeps a reference to its index in the list in the private
		 * _index property. Used for PaperScope#projects and Item#children.
		 */
		splice: function(list, items, index, remove) {
			var amount = items && items.length,
				append = index === undefined;
			index = append ? list.length : index;
			if (index > list.length)
				index = list.length;
			// Update _index on the items to be added first.
			for (var i = 0; i < amount; i++)
				items[i]._index = index + i;
			if (append) {
				// Append them all at the end by using push
				list.push.apply(list, items);
				// Nothing removed, and nothing to adjust above
				return [];
			} else {
				// Insert somewhere else and/or remove
				var args = [index, remove];
				if (items)
					args.push.apply(args, items);
				var removed = list.splice.apply(list, args);
				// Delete the indices of the removed items
				for (var i = 0, l = removed.length; i < l; i++)
					delete removed[i]._index;
				// Adjust the indices of the items above.
				for (var i = index + amount, l = list.length; i < l; i++)
					list[i]._index = i;
				return removed;
			}
		},

		/**
		 * Merge all passed hash objects into a newly creted Base object.
		 */
		merge: function() {
			return Base.each(arguments, function(hash) {
				Base.each(hash, function(value, key) {
					this[key] = value;
				}, this);
			}, new Base(), true); // Pass true for asArray, as arguments is none
		},

		/**
		 * Capitalizes the passed string: hello world -> Hello World
		 */
		capitalize: function(str) {
			return str.replace(/\b[a-z]/g, function(match) {
				return match.toUpperCase();
			});
		},

		/**
		 * Camelizes the passed hyphenated string: caps-lock -> capsLock
		 */
		camelize: function(str) {
			return str.replace(/-(.)/g, function(all, chr) {
				return chr.toUpperCase();
			});
		},

		/**
		 * Converst camelized strings to hyphenated ones: CapsLock -> caps-lock
		 */
		hyphenate: function(str) {
			return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
		}
	}
});
