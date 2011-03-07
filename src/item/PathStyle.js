/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * All rights reserved. See LICENSE file for details.
 */

var PathStyle = this.PathStyle = Base.extend(new function() {
	var keys = ['windingRule', 'resolution', 'strokeColor', 'strokeWidth',
			'strokeCap', 'strokeJoin', 'dashOffset','dashArray', 'miterLimit',
			'strokeOverprint', 'fillColor', 'fillOverprint'];

	var fields = {
		beans: true,

		initialize: function(item, style) {
			this.item = item;
			if (style) {
				for (var i = 0, l = keys.length; i < l; i++) {
					var key = keys[i];
					if (style[key] !== undefined)
						this[key] = style[key];
				}
			}
		}
	};

	Item.inject(Base.each(keys, function(key) {
		var isColor = !!(key.match(/Color$/)),
			set = 'set' + Base.capitalize(key),
			get = 'get' + Base.capitalize(key);

		fields[set] = function(value) {
			if (this.item && this.item.children) {
				for (var i = 0, l = this.item.children.length; i < l; i++) {
					this.item.children[i]._style[set](value);
				}
			} else {
				this['_' + key] = isColor ? Color.read(arguments) : value;
			}
			return this;
		};

		fields[get] = function() {
			if (this.item && this.item.children) {
				var style;
				for (var i = 0, l = this.item.children.length; i < l; i++) {
					var childStyle = this.item.children[i]._style[get]();
					if (!style) {
						style = childStyle;
					} else if (style != childStyle) {
						// If there is another item with a different style:
						return undefined;
					}
				}
				return style;
			} else {
				return this['_' + key];
			}
		};

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
