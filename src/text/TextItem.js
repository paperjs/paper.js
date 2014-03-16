/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2014, Juerg Lehni & Jonathan Puckey
 * http://scratchdisk.com/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name TextItem
 *
 * @class The TextItem type allows you to create typography. Its
 * functionality is inherited by different text item types such as
 * {@link PointText}, and {@link AreaText} (coming soon). They each add a
 * layer of functionality that is unique to their type, but share the
 * underlying properties and functions that they inherit from TextItem.
 *
 * @extends Item
 */
var TextItem = Item.extend(/** @lends TextItem# */{
	_class: 'TextItem',
	_boundsSelected: true,
	_applyMatrix: false,
	_canApplyMatrix: false,
	_serializeFields: {
		content: null
	},
	// TextItem doesn't make the distinction between the different bounds,
	// so use the same name for all of them
	_boundsGetter: 'getBounds',

	initialize: function TextItem(arg) {
		this._content = '';
		this._lines = [];
		// Support two forms of item initialization: Passing one object literal
		// describing all the different properties to be set, or a point where
		// it should be placed (arg).
		// See if a point is passed, and if so, pass it on to _initialize().
		// If not, it might be a properties object literal.
		var hasProps = arg && Base.isPlainObject(arg)
				&& arg.x === undefined && arg.y === undefined;
		this._initialize(hasProps && arg, !hasProps && Point.read(arguments));
	},

	_equals: function(item) {
		return this._content === item._content;
	},

	_clone: function _clone(copy) {
		copy.setContent(this._content);
		return _clone.base.call(this, copy);
	},

	/**
	 * The text contents of the text item.
	 *
	 * @type String
	 * @bean
	 *
	 * @example {@paperscript}
	 * // Setting the content of a PointText item:
	 *
	 * // Create a point-text item at {x: 30, y: 30}:
	 * var text = new PointText(new Point(30, 30));
	 * text.fillColor = 'black';
	 *
	 * // Set the content of the text item:
	 * text.content = 'Hello world';
	 *
	 * @example {@paperscript}
	 * // Interactive example, move your mouse over the view below:
	 *
	 * // Create a point-text item at {x: 30, y: 30}:
	 * var text = new PointText(new Point(30, 30));
	 * text.fillColor = 'black';
	 *
	 * text.content = 'Move your mouse over the view, to see its position';
	 *
	 * function onMouseMove(event) {
	 * 	// Each time the mouse is moved, set the content of
	 * 	// the point text to describe the position of the mouse:
	 * 	text.content = 'Your position is: ' + event.point.toString();
	 * }
	 */
	getContent: function() {
		return this._content;
	},

	setContent: function(content) {
		this._content = '' + content;
		this._lines = this._content.split(/\r\n|\n|\r/mg);
		this._changed(/*#=*/ Change.CONTENT);
	},

	isEmpty: function() {
		return !this._content;
	},

	/**
	 * {@grouptitle Character Style}
	 *
	 * The font-family to be used in text content.
	 *
	 * @name TextItem#fontFamily
	 * @default 'sans-serif'
	 * @type String
	 */

	/**
	 *
	 * The font-weight to be used in text content.
	 *
	 * @name TextItem#fontWeight
	 * @default 'normal'
	 * @type String|Number
	 */

	/**
	 * The font size of text content, as {@Number} in pixels, or as {@String}
	 * with optional units {@code 'px'}, {@code 'pt'} and {@code 'em'}.
	 *
	 * @name TextItem#fontSize
	 * @default 10
	 * @type Number|String
	 */

	/**
	 *
	 * The font-family to be used in text content, as one {@String}.
	 * @deprecated use {@link #fontFamily} instead.
	 *
	 * @name TextItem#font
	 * @default 'sans-serif'
	 * @type String
	 */

	/**
	 * The text leading of text content.
	 *
	 * @name TextItem#leading
	 * @default fontSize * 1.2
	 * @type Number|String
	 */

	/**
	 * {@grouptitle Paragraph Style}
	 *
	 * The justification of text paragraphs.
	 *
	 * @name TextItem#justification
	 * @default 'left'
	 * @type String('left', 'right', 'center')
	 */

	/**
	 * @private
	 * @deprecated use {@link #getStyle()} instead.
	 */
	getCharacterStyle: '#getStyle',
	setCharacterStyle: '#setStyle',

	/**
	 * @private
	 * @deprecated use {@link #getStyle()} instead.
	 */
	getParagraphStyle: '#getStyle',
	setParagraphStyle: '#setStyle'
});
