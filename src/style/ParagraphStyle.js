/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name ParagraphStyle
 *
 * @class The ParagraphStyle object represents the paragraph style of a text
 * item ({@link TextItem#paragraphStyle}).
 *
 * Currently, the ParagraphStyle object may seem a bit empty, with just the
 * {@link #justification} property. Yet, we have lots in store for Paper.js
 * when it comes to typography. Please stay tuned.
 *
 * @classexample
 * var text = new PointText(new Point(0,0));
 * text.fillColor = 'black';
 * text.content = 'Hello world.';
 * text.paragraphStyle.justification = 'center';
 */
var ParagraphStyle = this.ParagraphStyle = Style.extend(/** @lends ParagraphStyle# */{
	_owner: TextItem,
	_style: 'paragraphStyle',
	_defaults: {
		justification: 'left'
	},
	_flags: {
		justification: Change.GEOMETRY
	}

	/**
	 * ParagraphStyle objects don't need to be created directly. Just pass an
	 * object to {@link TextItem#paragraphStyle}, it will be converted to a
	 * ParagraphStyle object internally.
	 *
	 * @name ParagraphStyle#initialize
	 * @param {object} style
	 */

	/**
	 * The justification of the paragraph.
	 *
	 * @name ParagraphStyle#justification
	 * @default 'left'
	 * @type String('left', 'right', 'center')
	 */
});
