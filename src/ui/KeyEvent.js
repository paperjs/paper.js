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
	var keys = {
		 8: 'backspace',
		13: 'enter',
		16: 'shift',
		17: 'control',
		19: 'option', // was alt
		20: 'capsLock',
		27: 'escape',
		32: 'space',
		37: 'left',
		38: 'up',
		39: 'right',
		40: 'down',
		46: 'delete',
		91: 'command'
	};

	return {
		initialize: function(down, keyCode, character, event) {
			this.base(event);
			this.type = down ? 'key-down' : 'key-up';
			this.keyCode = keyCode;
			this.character = character;
		}
	};
});
