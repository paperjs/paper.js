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

var ParagraphStyle = this.ParagraphStyle = Base.extend({
	initialize: function(style) {
		this.justification = (style && style.justification) || 'left';
	},

	clone: function() {
		return new PathStyle(this);
	},

	statics: {
		create: function(item, other) {
			var style = new ParagraphStyle(PathStyle.dont);
			style._item = item;
			style.initialize(other);
			return style;
		}
	}
});
