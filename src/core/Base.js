/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * All rights reserved.
 */

// Extend Base with utility functions used across the library.
Base.inject({
	statics: true,

	read: function(list, start, length) {
		var start = start || 0,
			length = length || list.length - start;
		var obj = list[start];
		if (obj instanceof this
				// If the class defines _readNull, return null when nothing
				// was provided
				|| this.prototype._readNull && obj == null && length <= 1)
			return obj;
		obj = new this(this.dont);
		return obj.initialize.apply(obj, start > 0 || length < list.length
			? Array.prototype.slice.call(list, start, start + length)
			: list) || obj;
	},

	readAll: function(list, start) {
		var res = [], entry;
		for (var i = start || 0, l = list.length; i < l; i++) {
			res.push(Array.isArray(entry = list[i])
				? this.read(entry, 0)
				: this.read(list, i, 1));
		}
		return res;
	},

	/**
	 * Utility function for adding and removing items from a list of which
	 * each entry keeps a reference to its index in the list in the private
	 * _index property. Used for paper.documents and Item#children.
	 */
	splice: function(list, items, index, remove) {
		var amount = items && items.length,
			append = index === undefined;
		index = append ? list.length : index;
		// Update _index on the items to be added first.
		for (var i = 0; i < amount; i++) {
			items[i]._index = index + i;
		}
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
			// Adjust the indices of the items above.
			for (var i = index + amount, l = list.length; i < l; i++) {
				list[i]._index = i;
			}
			return removed;
		}
	},

	capitalize: function(str) {
		return str.replace(/\b[a-z]/g, function(match) {
			return match.toUpperCase();
		});
	},

	camelize: function(str) {
		return str.replace(/-(\w)/g, function(all, chr) {
			return chr.toUpperCase();
		});
	},

	/**
	 * Utility function for rendering numbers to strings at a precision of up
	 * to 5 fractional digits.
	 */
	formatNumber: function(num) {
		return (Math.round(num * 100000) / 100000).toString();
	},

	/**
	 * Utility function for rendering objects to strings, in object literal
	 * notation.
	 */
	formatObject: function(obj) {
		return '{ ' + Base.each(obj, function(value, key) {
			this.push(key + ': ' + value);
		}, []).join(', ') + ' }';
	}
});
