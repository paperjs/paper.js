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
 * @name KeyEvent
 *
 * @class The KeyEvent object is received by the {@link Tool}'s keyboard
 * handlers {@link Tool#onKeyDown}, {@link Tool#onKeyUp}. The KeyEvent object is
 * the only parameter passed to these functions and contains information about
 * the keyboard event.
 *
 * @extends Event
 */
var KeyEvent = this.KeyEvent = Event.extend(/** @lends KeyEvent# */{
	initialize: function(down, key, character, event) {
		this.base(event);
		this.type = down ? 'keydown' : 'keyup';
		this.key = key;
		this.character = character;
	},

	/**
	 * The type of key event.
	 *
	 * @name KeyEvent#type
	 * @type String('keydown', 'keyup')
	 */

	/**
	 * The string character of the key that caused this key event.
	 *
	 * @name KeyEvent#character
	 * @type String
	 */

	/**
	 * The key that caused this key event.
	 *
	 * @name KeyEvent#key
	 * @type String
	 */

	/**
	 * @return {String} A string representation of the key event.
	 */
	toString: function() {
		return "{ type: '" + this.type
				+ "', key: '" + this.key
				+ "', character: '" + this.character
				+ "', modifiers: " + this.getModifiers()
				+ " }";
	}
});
