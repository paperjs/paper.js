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

var ParagraphStyle = this.ParagraphStyle = Style.extend({
	/** @lends ParagraphStyle# */

	_defaults: {
		justification: 'left'
	},
	_owner: TextItem,
	_style: '_paragraphStyle'

	/**
	 * ParagraphStyle objects don't need to be created directly. Just pass an
	 * object to {@link TextItem#paragraphStyle}, it will be converted to a
	 * ParagraphStyle object internally.
	 * 
	 * @name ParagraphStyle
	 * @constructor
	 * @param {object} style
	 * 
	 * @class The ParagraphStyle object represents the paragraph style of a text
	 * item ({@link TextItem#paragraphStyle}).
	 * 
	 * Currently, the ParagraphStyle object may seem a bit empty, with just the
	 * {@link #justification} property. Yet, we have lots in store for Paper.js
	 * when it comes to typography. Please stay tuned.
	 */

	/**
	 * The justification of the paragraph.
	 * 
	 * @name ParagraphStyle#justification
	 * @default 'left'
	 * @type String('left', 'right', 'center')
	 * 
	 * @example {@paperscript height=150 split=false}
	 * // Examples of the different justifications:
	 * 
	 * // Create a vertical line that runs from the top center
	 * // of the view to the bottom center of the view:
	 * var bounds = view.bounds;
	 * var path = new Path(bounds.topCenter, bounds.bottomCenter);
	 * path.strokeColor = 'pink';
	 * 
	 * var textItem = new PointText(view.center - [0, 30]);
	 * textItem.content = 'left justified';
	 * 
	 * var textItem2 = new PointText(view.center);
	 * textItem2.content = 'center justified';
	 * textItem2.justification = 'center';
	 * 
	 * var textItem3 = new PointText(view.center + [0, 30]);
	 * textItem3.content = 'right justified';
	 * textItem3.justification = 'right';
	 */
});
