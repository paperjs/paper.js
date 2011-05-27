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
	/** @lends TextItem# */

	beans: true,

	/**
	 * @constructs TextItem
	 * 
	 * @class The TextItem type allows you to create typography. Its
	 * functionality is inherited by different text item types such as
	 * {@link PointText}, and {@link AreaText} (coming soon). They each add a
	 * layer of functionality that is unique to their type, but share the
	 * underlying properties and functions that they inherit from TextItem.
	 * 
	 * @extends Item
	 */
	initialize: function() {
		this.base();
		this.content = null;
		this._characterStyle = CharacterStyle.create(this);
		this.setCharacterStyle(this._project.getCurrentStyle());
		this._paragraphStyle = ParagraphStyle.create(this);
		this.setParagraphStyle();
	},

	/**
	 * The text contents of the text item.
	 *
	 * @name TextItem#content
	 * @type String
	 */

	_clone: function(copy) {
		copy.setCharacterStyle(this._characterStyle);
		copy.setParagraphStyle(this._paragraphStyle);
		return this.base(copy);
	},

	/**
	 * {@grouptitle Style Properties}
	 * 
	 * The character style of the text item.
	 * 
	 * @type CharacterStyle
	 * @bean
	 */
	getCharacterStyle: function() {
		return this._characterStyle;
	},

	setCharacterStyle: function(style) {
		this._characterStyle.initialize(style);
	},

	/**
	 * The paragraph style of the text item.
	 * 
	 * @type ParagraphStyle
	 * @bean
	 */
	getParagraphStyle: function() {
		return this._paragraphStyle;
	},

	setParagraphStyle: function(style) {
		this._paragraphStyle.initialize(style);
	}
});
