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
		this.content = null;
		this._characterStyle = CharacterStyle.create(this);
		this.setCharacterStyle(this._project.getCurrentStyle());
		this._paragraphStyle = ParagraphStyle.create(this);
		this.setParagraphStyle();
	},

	getCharacterStyle: function() {
		return this._characterStyle;
	},

	setCharacterStyle: function(style) {
		this._characterStyle.initialize(style);
	},
	
	getParagraphStyle: function() {
		return this._paragraphStyle;
	},

	setParagraphStyle: function(style) {
		this._paragraphStyle.initialize(style);
	}
});
