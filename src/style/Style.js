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
			var styleKey = src._style,
				flags = src._flags || {};
			src._owner.inject(Base.each(src._defaults, function(value, key) {
				var isColor = !!key.match(/Color$/),
					part = Base.capitalize(key),
					set = 'set' + part,
					get = 'get' + part;
				// Simply extend src with these getters and setters, to be
				// injected into this class using this.base() further down.
				src[set] = function(value) {
					var children = this._item && this._item._children;
					value = isColor ? Color.read(arguments) : value;
					if (children) {
						for (var i = 0, l = children.length; i < l; i++)
							children[i][styleKey][set](value);
					} else {
						var old = this['_' + key];
						if (old != value && !(old && old.equals
									&& old.equals(value))) {
							this['_' + key] = value;
							if (isColor) {
								if (old)
									old._removeOwner(this._item);
								if (value)
									value._addOwner(this._item);
							}
							if (this._item)
								this._item._changed(flags[key] || Change.STYLE);
						}
					}
					return this;
				};
				src[get] = function() {
					var children = this._item && this._item._children,
						style;
					// If this item has children, walk through all of them and
					// see if they all have the same style.
					if (!children)
						return this['_' + key];
					for (var i = 0, l = children.length; i < l; i++) {
						var childStyle = children[i][styleKey][get]();
						if (!style) {
							style = childStyle;
						} else if (style != childStyle && !(style
								&& style.equals && style.equals(childStyle))) {
							// If there is another item with a different
							// style, the style is not defined:
							// PORT: Change this in Scriptographer
							// (currently returns null)
							return undefined;
						}
					}
					return style;
				};
				// Style-getters and setters for owner class:
				// 'this' = the Base.each() side-car = the object that is
				// returned from Base.each and injected into _owner above:
				this[set] = function(value) {
					this[styleKey][set](value);
					return this;
				};
				this[get] = function() {
					return this[styleKey][get]();
				};
			}, {}));
			return this.base(src);
		}
	}
});
