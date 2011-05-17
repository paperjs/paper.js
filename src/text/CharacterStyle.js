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

var CharacterStyle = this.CharacterStyle = PathStyle.extend({
	initialize: function(style) {
		Base.initialize(this, style, {
			fontSize: 10,
			font: 'sans-serif'
		});
		this.base(style);
	},
	
	statics: {
		create: function(item, other) {
			var style = new CharacterStyle(CharacterStyle.dont);
			style._item = item;
			style.initialize(other);
			return style;
		}
	}
});
