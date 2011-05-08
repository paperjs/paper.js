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

var Key = this.Key = new function() {
	// TODO: make sure the keys are called the same as in Scriptographer
	// Missing: tab, cancel, clear, pause, page-down, page-up, end, home, comma,
	// minus, period, slash, etc etc etc.

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
	},

	modifiers = {
		shift: false,
		control: false,
		option: false,
		command: false,
		capsLock: false
	},

	keyCodes = {},
	downCode,
	downTimer;

	function handleKey(down, code, event) {
		var character = String.fromCharCode(code),
			keyCode = keys[code] || character.toLowerCase(),
			handler = down ? 'onKeyDown' : 'onKeyUp';
		console.log(handler, keyCode, character);
		if (modifiers[keyCode] !== undefined) {
			modifiers[keyCode] = down;
		} else if (paper.tool && paper.tool[handler]) {
			// Call the onKeyDown or onKeyUp handler if present
			// When the handler function returns false, prevent the
			// default behaviour of the key event:
			// PORT: Add to Sg
			var keyEvent = new KeyEvent(down, keyCode, character, event);
			if (paper.tool[handler](keyEvent) === false) {
				keyEvent.preventDefault();
			}
		}
	}

	// Since only keypress gest proper keyCodes that are actually representing
	// characters, we need to add a little timeout to keydown events to see if
	// they are follow immediately by a keypress, and if so, map the keyCode
	// from the keydown to the one from keypress, so keyup still knows what
	// code has now been released.
	DomEvent.add(document, {
		keydown: function(event) {
			var code = downCode = event.which || event.keyCode;
			downTimer = setTimeout(function() {
				keyCodes[code] = code;
				handleKey(true, code, event);
			}, 1);
		},

		keypress: function(event) {
			clearTimeout(downTimer);
			var code = event.which || event.keyCode;
			keyCodes[downCode] = code;
			handleKey(true, code, event);
		},

		keyup: function(event) {
			var code = event.which || event.keyCode;
			handleKey(false, keyCodes[code], event);
			delete keyCodes[code];
		}
	});

	return {
		modifiers: modifiers,

		isDown: function(key) {
			return !!activeKeys[key];
		}
	};
};