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
	statics: {
		create: function(item) {
			var style = new this(this.dont);
			style._item = item;
			return style;
		}
	}
});
