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

var KeyEvent = this.KeyEvent = Event.extend(new function() {
	return {
		initialize: function(down, keyCode, character, event) {
			this.base(event);
			this.type = down ? 'key-down' : 'key-up';
			this.keyCode = keyCode;
			this.character = character;
		}
	};
});
