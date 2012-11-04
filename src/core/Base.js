/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
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
// this.Base on the injection scope, since bootstrap.js ommits that.
this.Base = Base.inject(/** @lends Base# */{
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
		return '{ ' + Base.each(this, function(value, key) {
			// Hide internal properties even if they are enumerable
			if (key.charAt(0) != '_') {
				var type = typeof value;
				this.push(key + ': ' + (type === 'number'
						? Base.formatNumber(value)
						: type === 'string' ? "'" + value + "'" : value));
			}
		}, []).join(', ') + ' }';
	},

	statics: /** @lends Base */{
		/**
		 * Reads arguments of the type of the class on which it is called on
		 * from the passed arguments list or array, at the given index, up to
		 * the specified length. This is used in argument conversion, e.g. by
		 * all basic types (Point, Size, Rectangle) and also higher classes such
		 * as Color and Segment.
		 * @param {Number} start the index at which to start reading in the list
		 * @param {Number} length the amount of elements that can be read
		 * @param {Boolean} clone controls wether passed objects should be
		 *        cloned if they are already provided in the required type
		 */
		read: function(list, start, length, clone) {
			var proto = this.prototype,
				readIndex = proto._readIndex,
				index = start || readIndex && list._index || 0;
			if (!length)
				length = list.length - index;
			var obj = list[index];
			if (obj instanceof this
					// If the class defines _readNull, return null when nothing
					// was provided
					|| proto._readNull && obj == null && length <= 1) {
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

		peekValue: function(list, start) {
			return list[list._index = start || list._index || 0];
		},

		readValue: function(list, start) {
			var value = this.peekValue(list, start);
			list._index++;
			list._read = 1;
			return value;
		},

		/**
		 * Reads all readable arguments from the list, handling nested arrays
		 * seperately.
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
		 * Utility function for adding and removing items from a list of which
		 * each entry keeps a reference to its index in the list in the private
		 * _index property. Used for PaperScope#projects and Item#children.
		 */
		splice: function(list, items, index, remove) {
			var amount = items && items.length,
				append = index === undefined;
			index = append ? list.length : index;
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
			return str.replace(/-(\w)/g, function(all, chr) {
				return chr.toUpperCase();
			});
		},

		/**
		 * Converst camelized strings to hyphenated ones: CapsLock -> caps-lock
		 */
		hyphenate: function(str) {
			return str.replace(/[a-z][A-Z0-9]|[0-9][a-zA-Z]|[A-Z]{2}[a-z]/g,
				function(match) {
					return match.charAt(0) + '-' + match.substring(1);
				}
			).toLowerCase();
		},

		/**
		 * Utility function for rendering numbers to strings at a precision of
		 * up to 5 fractional digits.
		 */
		formatNumber: function(num) {
			return (Math.round(num * 100000) / 100000).toString();
		}
	}
});
