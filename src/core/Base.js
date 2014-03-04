/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2014, Juerg Lehni & Jonathan Puckey
 * http://scratchdisk.com/ & http://jonathanpuckey.com/
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
// Extend Base with utility functions used across the library.
Base.inject(/** @lends Base# */{
	/**
	 * Renders base objects to strings in object literal notation.
	 */
	toString: function() {
		return this._id != null
			?  (this._class || 'Object') + (this._name
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
	 * @param {Object} [options={ asString: true, precision: 5 }]
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
	 *
	 * @param {Object} props an object describing the properties to set
	 * @param {Object} [exclude=undefined] a lookup table listing properties to
	 * exclude.
	 * @return {Boolean} {@true if the object is a plain object}
	 */
	_set: function(props, exclude) {
		if (props && Base.isPlainObject(props)) {
			// If props is a filtering object, we need to execute hasOwnProperty
			// on the original object (it's parent / prototype). See _filtered
			// inheritance trick in the argument reading code.
			var orig = props._filtering || props;
			for (var key in orig) {
				if (key in this && orig.hasOwnProperty(key)
						&& (!exclude || !exclude[key])) {
					var value = props[key];
					// Due to the _filtered inheritance trick, undefined is used
					// to mask already consumed named arguments.
					if (value !== undefined)
						this[key] = value;
				}
			}
			return true;
		}
	},

	statics: /** @lends Base */{

		// Keep track of all named classes for serialization and exporting.
		exports: {
			enumerable: true // For PaperScope.inject() in export.js
		},

		extend: function extend() {
			// Override Base.extend() to register named classes in Base.exports,
			// for deserialization and injection into PaperScope.
			var res = extend.base.apply(this, arguments),
				name = res.prototype._class;
			if (name && !Base.exports[name])
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
					if (o1.hasOwnProperty(i) && !o2.hasOwnProperty(i))
						return false;
				return true;
			}
			if (obj1 === obj2)
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
					if (obj1.hasOwnProperty(i)
							&& !Base.equals(obj1[i], obj2[i]))
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
		 * or a normal array.
		 * @param {Number} start the index at which to start reading in the list
		 * @param {Number} length the amount of elements that can be read
		 * @param {Object} options {@code options.readNull} controls whether
		 * null is returned or converted. {@code options.clone} controls whether
		 * passed objects should be cloned if they are already provided in the 
		 * required type
		 */
		read: function(list, start, options, length) {
			// See if it's called directly on Base, and if so, read value and
			// return without object conversion.
			if (this === Base) {
				var value = this.peek(list, start);
				list.__index++;
				return value;
			}
			var proto = this.prototype,
				readIndex = proto._readIndex,
				index = start || readIndex && list.__index || 0;
			if (!length)
				length = list.length - index;
			var obj = list[index];
			if (obj instanceof this
				|| options && options.readNull && obj == null && length <= 1) {
				if (readIndex)
					list.__index = index + 1;
				return obj && options && options.clone ? obj.clone() : obj;
			}
			obj = Base.create(this.prototype);
			if (readIndex)
				obj.__read = true;
			obj = obj.initialize.apply(obj, index > 0 || length < list.length
				? Array.prototype.slice.call(list, index, index + length)
				: list) || obj;
			if (readIndex) {
				list.__index = index + obj.__read;
				obj.__read = undefined;
			}
			return obj;
		},

		/**
		 * Allows peeking ahead in reading of values and objects from arguments
		 * list through Base.read().
		 * @param {Array} list the list to read from, either an arguments object
		 * or a normal array.
		 * @param {Number} start the index at which to start reading in the list
		 */
		peek: function(list, start) {
			return list[list.__index = start || list.__index || 0];
		},

		/**
		 * Reads all readable arguments from the list, handling nested arrays
		 * separately.
		 * @param {Array} list the list to read from, either an arguments object
		 * or a normal array.
		 * @param {Number} start the index at which to start reading in the list
		 * @param {Object} options {@code options.readNull} controls whether
		 * null is returned or converted. {@code options.clone} controls whether
		 * passed objects should be cloned if they are already provided in the
		 * required type
		 */
		readAll: function(list, start, options) {
			var res = [],
				entry;
			for (var i = start || 0, l = list.length; i < l; i++) {
				res.push(Array.isArray(entry = list[i])
						? this.read(entry, 0, options)
						: this.read(list, i, options, 1));
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
		 * or a normal array.
		 * @param {Number} start the index at which to start reading in the list
		 * @param {String} name the property name to read from.
		 */
		readNamed: function(list, name, start, options, length) {
			var value = this.getNamed(list, name),
				hasObject = value !== undefined;
			if (hasObject) {
				// Create a _filtered object that inherits from argument 0, and
				// override all fields that were already read with undefined.
				var filtered = list._filtered;
				if (!filtered) {
					filtered = list._filtered = Base.create(list[0]);
					// Point _filtering to the original so Base#_set() can
					// execute hasOwnProperty on it.
					filtered._filtering = list[0];
				}
				// delete wouldn't work since the masked parent's value would
				// shine through.
				filtered[name] = undefined;
			}
			return this.read(hasObject ? [value] : list, start, options, length);
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
				return name ? arg[name] : list._filtered || arg;
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
		 * Returns true if obj is either a plain object or an array, as used by
		 * many argument reading methods.
		 */
		isPlainValue: function(obj) {
			return this.isPlainObject(obj) || Array.isArray(obj);
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
								name = item._class;
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
				var name = obj._class;
				if (name && !compact && !res._compact && res[0] !== name)
					res.unshift(name);
			} else if (Array.isArray(obj)) {
				res = [];
				for (var i = 0, l = obj.length; i < l; i++)
					res[i] = Base.serialize(obj[i], options, compact,
							dictionary);
				// Mark array as compact, so obj._serialize handling above
				// doesn't add the class name again.
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
		 * The passed json data is recoursively traversed and converted, leaves
		 * first
		 */
		deserialize: function(json, create, _data) {
			var res = json,
				isRoot = !_data;
			// A _data side-car to deserialize that can hold any kind of
			// 'global' data across a deserialization. It's currently only used
			// to hold dictionary definitions.
			_data = _data || {};
			if (Array.isArray(json)) {
				// See if it's a serialized type. If so, the rest of the array
				// are the arguments to #initialize(). Either way, we simply
				// deserialize all elements of the array.
				var type = json[0],
					// Handle stored dictionary specially, since we need to
					// keep is a lookup table to retrieve referenced items from.
					isDictionary = type === 'dictionary';
				if (!isDictionary) {
					// First see if this is perhaps a dictionary reference, and
					// if so return its definition instead.
					if (_data.dictionary && json.length == 1 && /^#/.test(type))
						return _data.dictionary[type];
					type = Base.exports[type];
				}
				res = [];
				// Skip first type entry for arguments
				for (var i = type ? 1 : 0, l = json.length; i < l; i++)
					res.push(Base.deserialize(json[i], create, _data));
				if (isDictionary) {
					_data.dictionary = res[0];
				} else if (type) {
					// Create serialized type and pass collected arguments to
					// constructor().
					var args = res;
					// If a create method is provided, handle our own 
					// creation. This is used in #importJSON() to pass
					// on insert = false to all items except layers.
					if (create) {
						res = create(type, args, isRoot);
					} else {
						res = Base.create(type.prototype);
						type.apply(res, args);
					}
					
				}
			} else if (Base.isPlainObject(json)) {
				res = {};
				for (var key in json)
					res[key] = Base.deserialize(json[key], create, _data);
			}
			return res;
		},

		exportJSON: function(obj, options) {
			var json = Base.serialize(obj, options);
			return options && options.asString === false
					? json
					: JSON.stringify(json);
		},

		importJSON: function(json, target) {
			return Base.deserialize(
					typeof json === 'string' ? JSON.parse(json) : json,
					// Provide our own create function to handle target and
					// insertion
					function(type, args, isRoot) {
						// If a target is provided and its of the right type,
						// import right into it.
						var obj = target && target.constructor === type
								? target
								: Base.create(type.prototype),
							isTarget = obj === target;
						// Note: We don't set insert false for layers since
						// we want these to be created on the fly in the active
						// project into which we're importing (except for if
						// it's a preexisting target layer).
						if (!isRoot && args.length === 1 && obj instanceof Item
								&& (!(obj instanceof Layer) || isTarget)) {
							var arg = args[0];
							if (Base.isPlainObject(arg))
								arg.insert = false;
						}
						type.apply(obj, args);
						// Clear target to only use it once
						if (isTarget)
							target = null;
						return obj;
					});
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
				// Erase the indices of the removed items
				for (var i = 0, l = removed.length; i < l; i++)
					removed[i]._index = undefined;
				// Adjust the indices of the items above.
				for (var i = index + amount, l = list.length; i < l; i++)
					list[i]._index = i;
				return removed;
			}
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
