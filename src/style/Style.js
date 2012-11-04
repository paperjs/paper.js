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
 * @name Style
 *
 * @class Internal base-class for all style objects, e.g. PathStyle,
 * CharacterStyle, PargraphStyle.
 *
 * @private
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

	/**
	 * Returns the children to be used to unify style attributes, if any.
	 */
	_getChildren: function() {
		// Only unify styles on children of Group items, excluding CompoundPath.
		return this._item instanceof Group && this._item._children;
	},

	statics: {
		create: function(item) {
			var style = Base.create(this);
			style._item = item;
			return style;
		},

		extend: function(src) {
			// Inject style getters and setters into the 'owning' class, which
			// redirect calls to the linked style objects through their internal
			// property on the instances of that class, as defined by _style.
			var styleKey = '_' + src._style,
				stylePart = Base.capitalize(src._style),
				flags = src._flags || {},
				owner = {};

			// Define accessor on owner class for this style:
			owner['get' + stylePart] = function() {
				return this[styleKey];
			};

			owner['set' + stylePart] = function(style) {
				this[styleKey].initialize(style);
			};

			Base.each(src._defaults, function(value, key) {
				var isColor = /Color$/.test(key),
					part = Base.capitalize(key),
					set = 'set' + part,
					get = 'get' + part;
				// Simply extend src with these getters and setters, to be
				// injected into this class using this.base() further down.
				src[set] = function(value) {
					var children = this._getChildren();
					// Clone color objects since they reference their owner
					value = isColor ? Color.read(arguments, 0, 0, true) : value;
					if (children) {
						for (var i = 0, l = children.length; i < l; i++)
							children[i][styleKey][set](value);
					} else {
						var old = this['_' + key];
						if (!Base.equals(old, value)) {
							if (isColor) {
								if (old)
									delete old._owner;
								if (value) {
									value._owner = this._item;
								}
							}
							this['_' + key] = value;
							// Notify the item of the style change STYLE is
							// always set, additional flags come from _flags,
							// as used for STROKE:
							if (this._item)
								this._item._changed(flags[key] || Change.STYLE);
						}
					}
					return this;
				};
				src[get] = function() {
					var children = this._getChildren(),
						style;
					// If this item has children, walk through all of them and
					// see if they all have the same style.
					if (!children)
						return this['_' + key];
					for (var i = 0, l = children.length; i < l; i++) {
						var childStyle = children[i][styleKey][get]();
						if (!style) {
							style = childStyle;
						} else if (!Base.equals(style, childStyle)) {
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
				owner[set] = function(value) {
					this[styleKey][set](value);
					return this;
				};
				owner[get] = function() {
					return this[styleKey][get]();
				};
			});
			src._owner.inject(owner);
			// Pass on to base()
			return this.base.apply(this, arguments);
		}
	}
});
