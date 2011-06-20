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

	_defaults: Base.merge(PathStyle.prototype._defaults, {
		// Override default fillColor of CharacterStyle
		fillColor: 'black',
		fontSize: 10,
		font: 'sans-serif'
	}),
	_owner: TextItem,
	_style: '_characterStyle'

	/**
	 * CharacterStyle objects don't need to be created directly. Just pass an
	 * object to {@link TextItem#characterStyle}, it will be converted to a
	 * CharacterStyle object internally.
	 * 
	 * @name CharacterStyle
	 * @constructor
	 * @param {object} style
	 * 
	 * @class The CharacterStyle object represents the character style of a text
	 * item ({@link TextItem#characterStyle})
	 * 
	 * Example:
	 * <code>
	 * var text = new PointText(new Point(50, 50));
	 * text.content = 'Hello world.';
	 * text.characterStyle = {
	 * 	fontSize: 50,
	 * 	fillColor: 'black',
	 * };
	 * </code>
	 * 
	 * @extends PathStyle
	 */

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
});
