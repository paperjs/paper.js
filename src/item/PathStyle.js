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

var PathStyle = this.PathStyle = Base.extend(new function() {
	var keys = ['windingRule', 'resolution', 'strokeColor', 'strokeWidth',
			'strokeCap', 'strokeJoin', 'dashOffset','dashArray', 'miterLimit',
			'strokeOverprint', 'fillColor', 'fillOverprint'],
		strokeFlags = {
			strokeWidth: true,
			strokeCap: true,
			strokeJoin: true,
			miterLimit: true
		};

	var fields = {
		beans: true,

		initialize: function(style) {
			if (style) {
				for (var i = 0, l = keys.length; i < l; i++) {
					var key = keys[i],
						value = style[key];
					if (value !== undefined)
						this[key] = value;
				}
			}
		},

		clone: function() {
			return new PathStyle(this);
		},

		statics: {
			create: function(item, other) {
				var style = new PathStyle(PathStyle.dont);
				style._item = item;
				style.initialize(other);
				return style;
			}
		}
	};

	Item.inject(Base.each(keys, function(key) {
		var isColor = !!key.match(/Color$/),
			part = Base.capitalize(key),
			set = 'set' + part,
			get = 'get' + part;

		fields[set] = function(value) {
			var children = this._item && this._item._children;
			value = isColor ? Color.read(arguments) : value;
			if (children) {
				for (var i = 0, l = children.length; i < l; i++)
					children[i]._style[set](value);
			} else {
				var old = this['_' + key];
				if (old != value && !(old && old.equals && old.equals(value))) {
					this['_' + key] = value;
					if (this._item) {
						this._item._changed(ChangeFlags.STYLE
							| (strokeFlags[key] ? ChangeFlags.STROKE : 0));
					}
				}
			}
			return this;
		};

		fields[get] = function() {
			var children = this._item && this._item._children,
				style;
			// If this item has children, walk through all of them and see if
			// they all have the same style.
			if (children) {
				for (var i = 0, l = children.length; i < l; i++) {
					var childStyle = children[i]._style[get]();
					if (!style) {
						style = childStyle;
					} else if (style != childStyle) {
						// If there is another item with a different style,
						// the style is not defined:
						// PORT: Change this in Sg (currently returns null)
						return undefined;
					}
				}
				return style;
			} else {
				return this['_' + key];
			}
		};

		// 'this' = the Base.each() side-car = the object that is injected into
		// Item above:
		this[set] = function(value) {
			this._style[set](value);
			return this;
		};

		this[get] = function() {
			return this._style[get]();
		};
	}, { beans: true }));

	return fields;
});
