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

var TextItem = this.TextItem = Item.extend({
	beans: true,

	initialize: function() {
		this.base();
		point = Point.read(arguments, 0, 1);
		this.content = null;
		this.setCharacterStyle(this._project.getCurrentStyle());
		this.setParagraphStyle();
	},

	getCharacterStyle: function() {
		return this._characterStyle;
	},

	setCharacterStyle: function(style) {
		this._characterStyle = CharacterStyle.create(this, style);
	},
	
	getParagraphStyle: function() {
		return this._paragraphStyle;
	},

	setParagraphStyle: function(style) {
		this._paragraphStyle = ParagraphStyle.create(this, style);
	}
});
