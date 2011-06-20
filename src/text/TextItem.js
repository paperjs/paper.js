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
		this._content = '';
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
	 * 
	 * @example {@paperscript}
	 * // Setting the content of a PointText item:
	 * 
	 * // Create a point-text item at {x: 30, y: 30}:
	 * var text = new PointText(new Point(30, 30));
	 * 
	 * // Set the content of the text item:
	 * text.content = 'Hello world';
	 * 
	 * @example {@paperscript}
	 * // Interactive example, move your mouse over the view below:
	 * 
	 * // Create a point-text item at {x: 30, y: 30}:
	 * var text = new PointText(new Point(30, 30));
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
		copy._content = this._content;
		copy.setCharacterStyle(this._characterStyle);
		copy.setParagraphStyle(this._paragraphStyle);
		return this.base(copy);
	},

	getContent: function() {
		return this._content;
	},

	setContent: function(content) {
		this._changed(Change.CONTENT);
		this._content = content;
	},

	/**
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

	/**
	 * {@grouptitle Style Properties}
	 * The font of the text item.
	 * 
	 * @example {@paperscript height=150}
	 * var textItem = new PointText(new Point(20, 80));
	 * textItem.content = 'Hello world.';
	 * textItem.fontSize = 30;
	 * textItem.font = 'times';
	 * 
	 * @name TextItem#font
	 * @default 'sans-serif'
	 * @type String
	 */

	/**
	 * The font size in points of the text item.
	 * 
	 * @name TextItem#fontSize
	 * @default 10
	 * @type Number
	 * 
	 * @example {@paperscript height=150}
	 * var textItem = new PointText(new Point(20, 80));
	 * textItem.content = 'Hello world.';
	 * textItem.fontSize = 30;
	 */

	/**
	 * The justification of the text item.
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
	 * 
	 * @name TextItem#justification
	 * @default 'left'
	 * @type String('left', 'right', 'center')
	 */
});
