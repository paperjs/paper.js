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
 * @name Key
 * @namespace
 */
var Key = new function() {
	// TODO: cancel, clear, page-down, page-up, comma, minus, period, slash, ...

	var specialKeys = {
		8: 'backspace',
		9: 'tab',
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

	// Mark the special skeys that still can be interpreted as chars too
	specialChars = {
		9: true, // tab
		13: true, // enter
		32: true // space
	},

	// Use new Base() to convert into a Base object, for #toString()
	modifiers = new Base({
		shift: false,
		control: false,
		option: false,
		command: false,
		capsLock: false,
		space: false
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
		var character = charCode ? String.fromCharCode(charCode) : '',
			specialKey = specialKeys[keyCode],
			key = specialKey || character.toLowerCase(),
			type = down ? 'keydown' : 'keyup',
			view = View._focused,
			scope = view && view.isVisible() && view._scope,
			tool = scope && scope._tool,
			name;
		keyMap[key] = down;
		// Detect modifiers and mark them as pressed / released
		if (specialKey && (name = Base.camelize(specialKey)) in modifiers)
			modifiers[name] = down;
		// Link the keyCode from keydown with the charCode form keypress,
		// so keyup can retrieve the charCode again.
		// Use delete instead of setting to null, so charCodeMap only contains
		// keyCodes that are currently pressed, allowing the use of `keyCode in
		// charCodeMap` checks and enumeration over pressed keys, e.g. in the
		// window blur event.
		if (down) {
			charCodeMap[keyCode] = charCode;
		} else {
			delete charCodeMap[keyCode];
		}
		if (tool && tool.responds(type)) {
			// Update global reference to this scope.
			paper = scope;
			// Call the onKeyDown or onKeyUp handler if present
			tool.fire(type, new KeyEvent(down, key, character, event));
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
			if (code in specialKeys) {
				// No char code for special keys (except the ones listed in
				// specialChars), but mark as pressed by setting to 0.
				handleKey(true, code, code in specialChars ? code : 0, event);
				// Do not set downCode as we handled it already. Space would
				// be handled twice otherwise, once here, once in keypress.
			} else {
				downCode = code;
			}
		},

		keypress: function(event) {
			if (downCode != null) {
				handleKey(true, downCode, event.which || event.keyCode, event);
				downCode = null;
			}
		},

		keyup: function(event) {
			var code = event.which || event.keyCode;
			if (code in charCodeMap)
				handleKey(false, code, charCodeMap[code], event);
		}
	});

	DomEvent.add(window, {
		blur: function(event) {
			// Fire key-up events for all currently pressed keys.
			for (var code in charCodeMap)
				handleKey(false, code, charCodeMap[code], event);
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
		 * 	if (Key.isDown('a')) {
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