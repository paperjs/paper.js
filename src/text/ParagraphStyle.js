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
	/** @lends ParagraphStyle# */

	/**
	 * ParagraphStyle objects don't need to be created directly. Just pass an
	 * object to {@link TextItem#paragraphStyle}, it will be converted to a
	 * ParagraphStyle object internally.
	 * 
	 * @constructs ParagraphStyle
	 * @param {object} style
	 * 
	 * @constructs ParagraphStyle
	 * 
	 * @class The ParagraphStyle object represents the paragraph style of a text
	 * item ({@link TextItem#paragraphStyle}).
	 * 
	 * Currently, the ParagraphStyle object may seem a bit empty, with just the
	 * {@link #justification} property. Yet, we have lots in store for Paper.js
	 * when it comes to typography. Please stay tuned.
	 * 
	 * Example:
	 * <pre>
	 * var text = new PointText(new Point(0,0));
	 * text.fillColor = 'black';
	 * text.content = 'Hello world.';
	 * text.paragraphStyle.justification = 'center';
	 * </pre>
	 */
	initialize: function(style) {
		Base.initialize(this, style, {
			justification: 'left'
		});
	},

	/**
	 * The justification of the paragraph.
	 * 
	 * @name ParagraphStyle#justification
	 * @default 'left'
	 * @type String('left', 'right', 'center')
	 */

	statics: {
		create: function(item) {
			var style = new ParagraphStyle(ParagraphStyle.dont);
			style._item = item;
			return style;
		}
	}
});
