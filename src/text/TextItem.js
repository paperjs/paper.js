/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
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
var TextItem = this.TextItem = Item.extend(/** @lends TextItem# */{
	_serializeFields: {
		content: null
	},
	// TextItem doesn't make the distinction between the different bounds,
	// so use the same name for all of them
	_boundsGetter: 'getBounds',

	initialize: function(arg) {
		// Support two forms of item initialization: Passing one object literal
		// describing all the different properties to be set, or a point where
		// it should be placed (arg).
		// Note that internally #characterStyle is the same as #style, but
		// defined as an instance of CharacterStyle. We need to define it before
		// calling this.base(), to override the default PathStyle instance.
		this._style = CharacterStyle.create(this);
		this._paragraphStyle = ParagraphStyle.create(this);
		// See if a point is passed, and if so, pass it on to base(). If not, it
		// might be a properties object literal for #setPropeties() at the end.
		var hasProperties = Base.isPlainObject(arg)
				&& arg.x === undefined && arg.y === undefined;
		this.base(hasProperties ? null : Point.read(arguments));
		// No need to call setStyle(), since base() handles this already.
		// Call with no parameter to initalize defaults now.
		this.setParagraphStyle();
		this._content = '';
		this._lines = [];
		if (hasProperties) {
			this._setProperties(arg);
		}
	},

	/**
	 * The text contents of the text item.
	 *
	 * @name TextItem#content
	 * @type String
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

	_clone: function(copy) {
		copy.setContent(this._content);
		copy.setParagraphStyle(this._paragraphStyle);
		return this.base(copy);
	},

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
	 * {@grouptitle Style Properties}
	 *
	 * The character style of the text item.
	 *
	 * @type CharacterStyle
	 * @bean
	 */

	// As explained in CharacterStyle, this is internally the same as #style.
	getCharacterStyle: function() {
		return this.getStyle();
	},

	setCharacterStyle: function(style) {
		this.setStyle(style);
	}

	/**
	 * The paragraph style of the text item.
	 *
	 * @name TextItem#getParagraphStyle
	 * @type ParagraphStyle
	 * @bean
	 */
});
