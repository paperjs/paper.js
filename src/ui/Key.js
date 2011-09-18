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
 * @name Key
 * @namespace
 */
var Key = this.Key = new function() {
	// TODO: Make sure the keys are called the same as in Scriptographer
	// Missing: tab, cancel, clear, page-down, page-up, comma, minus, period,
	// slash, etc etc etc.

	var keys = {
		 8: 'backspace',
		13: 'enter',
		16: 'shift',
		17: 'control',
		18: 'option',
		19: 'pause',
		20: 'caps-lock',
		27: 'escape',
		32: 'space',
		35: 'end',
		36: 'home',
		37: 'left',
		38: 'up',
		39: 'right',
		40: 'down',
		46: 'delete',
		91: 'command',
		93: 'command', // WebKit right command button
		224: 'command'  // Gecko command button
	},

	// Use Base.merge to convert into a Base object, for #toString()
	modifiers = Base.merge({
		shift: false,
		control: false,
		option: false,
		command: false,
		capsLock: false
	}),

	// Since only keypress gets proper keyCodes that are actually representing
	// characters, we need to perform a little trickery here to use these codes
	// in onKeyDown/Up: keydown is used to store the downCode and handle
	// modifiers and special keys such as arrows, space, etc, keypress fires the
	// actual onKeyDown event and maps the keydown keyCode to the keypress
	// charCode so keyup can do the right thing too.
	charCodeMap = {}, // keyCode -> charCode mappings for pressed keys
	keyMap = {}, // Map for currently pressed keys
	downCode; // The last keyCode from keydown

	function handleKey(down, keyCode, charCode, event) {
		var character = String.fromCharCode(charCode),
			key = keys[keyCode] || character.toLowerCase(),
			handler = down ? 'onKeyDown' : 'onKeyUp',
			view = View._focused,
			scope = view && view.isVisible() && view._scope,
			tool = scope && scope.tool;
		keyMap[key] = down;
		if (tool && tool[handler]) {
			// Call the onKeyDown or onKeyUp handler if present
			// When the handler function returns false, prevent the
			// default behaviour of the key event:
			// PORT: Add to Sg
			var keyEvent = new KeyEvent(down, key, character, event);
			if (tool[handler](keyEvent) === false)
				keyEvent.preventDefault();
			if (view)
				view.draw(true);
		}
	}

	DomEvent.add(document, {
		keydown: function(event) {
			var code = event.which || event.keyCode;
			// If the keyCode is in keys, it needs to be handled by keydown and
			// not in keypress after (arrows for example wont be triggering
			// a keypress, but space would).
			var key = keys[code], name;
			if (key) {
				// Do not fire handleKey for modifiers, but for other keys such
				// ass arrows, delete, backspace, etc.
				if (modifiers[name = Base.camelize(key)] !== undefined) {
					modifiers[name] = true;
				} else {
					// No char code for special keys, but mark as pressed
					charCodeMap[code] = 0;
					handleKey(true, code, null, event);
				}
				// Do not set downCode as we handled it already. Space would
				// be handled twice otherwise, once here, once in keypress.
			} else {
				downCode = code;
			}
		},

		keypress: function(event) {
			if (downCode != null) {
				var code = event.which || event.keyCode;
				// Link the downCode from keydown with the code form keypress, so
				// keyup can retrieve that code again.
				charCodeMap[downCode] = code;
				handleKey(true, downCode, code, event);
				downCode = null;
			}
		},

		keyup: function(event) {
			var code = event.which || event.keyCode,
				key = keys[code], name;
			if (key && modifiers[name = Base.camelize(key)] !== undefined) {
				modifiers[name] = false;
			} else if (charCodeMap[code] != null) {
				handleKey(false, code, charCodeMap[code], event);
				delete charCodeMap[code];
			}
		}
	});

	return /** @lends Key */{
		modifiers: modifiers,

		/**
		 * Checks whether the specified key is pressed.
		 *
		 * @param {String} key One of: 'backspace', 'enter', 'shift', 'control',
		 * 'option', 'pause', 'caps-lock', 'escape', 'space', 'end', 'home',
		 * 'left', 'up', 'right', 'down', 'delete', 'command'
		 * @return {Boolean} {@true if the key is pressed}
		 *
		 * @example
		 * // Whenever the user clicks, create a circle shaped path. If the
		 * // 'a' key is pressed, fill it with red, otherwise fill it with blue:
		 * function onMouseDown(event) {
		 * 	var path = new Path.Circle(event.point, 10);
		 * 	if(Key.isDown('a')) {
		 * 		path.fillColor = 'red';
		 * 	} else {
		 * 		path.fillColor = 'blue';
		 * 	}
		 * }
		 */
		isDown: function(key) {
			return !!keyMap[key];
		}
	};
};