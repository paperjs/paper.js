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

/**
 * Internal base-class for all style objects, e.g. PathStyle, CharacterStyle,
 * PargraphStyle.
 */
var Style = Item.extend({

	initialize: function(style) {
		// If the passed style object is also a Style, clone its clonable
		// fields rather than simply copying them.
		var clone = style instanceof Style;
		// Note: This relies on bean getters and setters that get implicetly
		// called when getting from style[key] and setting on this[key].
		return Base.each(this._defaults, function(value, key) {
			value = style && style[key] || value;
			this[key] = value && clone && value.clone
					? value.clone() : value;
		}, this);
	},

	statics: {
		create: function(item) {
			var style = new this(this.dont);
			style._item = item;
			return style;
		},

		extend: function(src) {
			// Inject style getters and setters into the 'owning' class, which
			// redirect calls to the linked style objects through their internal
			// property on the instances of that class, as defined by _style.
			var style = src._style;
			src._owner.inject(Base.each(src._defaults, function(value, key) {
				var part = Base.capitalize(key),
					set = 'set' + part,
					get = 'get' + part;
				this[set] = function(value) {
					this[style][set](value);
					return this;
				};
				this[get] = function() {
					return this[style][get]();
				};
			}, {}));
			return this.base(src);
		}
	}
});
