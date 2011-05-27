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
	/** @lends CharacterStyle# */

	/**
	 * CharacterStyle objects don't need to be created directly. Just pass an
	 * object to {@link TextItem#characterStyle}, it will be converted to a
	 * CharacterStyle object internally.
	 *
	 * @constructs CharacterStyle
	 * @param {object} style
	 * 
	 * @constructs CharacterStyle
	 *
	 * @class The CharacterStyle object represents the character style of a text
	 * item ({@link TextItem#characterStyle})
	 * 
	 * Sample code:
	 * <pre>
	 * var text = new PointText(new Point(50, 50));
	 * text.fillColor = 'black';
	 * text.content = 'Hello world.';
	 * text.characterStyle.fontSize = 50;
	 * </pre>
	 * 
	 * @extends PathStyle
	 */
	initialize: function(style) {
		Base.initialize(this, style, {
			fontSize: 10,
			font: 'sans-serif'
		});
		this.base(style);
	},

	/**
	 * The font of the character style.
	 *
	 * @name CharacterStyle#font
	 * @default 'sans-serif'
	 * @type String
	 */

	/**
	 * The font size of the character style in points.
	 *
	 * @name CharacterStyle#fontSize
	 * @default 10
	 * @type Number
	 */

	statics: {
		create: function(item) {
			var style = new CharacterStyle(CharacterStyle.dont);
			style._item = item;
			return style;
		}
	}
});
