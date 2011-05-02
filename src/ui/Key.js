var Key = new function() {
	// TODO: make sure the keys are called the same as in Scriptographer
	// Missing: tab, cancel, clear, pause, page-down, page-up, end, home, comma,
	// minus, period, slash, etc etc etc.
	var keys = {
		 '8': 'backspace',
		'13': 'enter',
		'16': 'shift',
		'17': 'control',
		'19': 'option', // was alt
		'20': 'capsLock',
		'27': 'escape',
		'32': 'space',
		'37': 'left',
		'38': 'up',
		'39': 'right',
		'40': 'down',
		'46': 'delete',
		'91': 'command'
	},
	modifiers = {
		shift: false,
		control: false,
		option: false,
		command: false,
		capsLock: false
	},
	activeKeys = {};
	
	Event.add(document, Base.each(['keyDown', 'keyUp'], function(type) {
		var toolHandler = 'on' + Base.capitalize(type),
			keyDown = type === 'keyDown';
		this[type.toLowerCase()] = function(event) {
			var code = event.which || event.keyCode,
				key = keys[code] || String.fromCharCode(code).toLowerCase();
			activeKeys[key] = keyDown;
			
			// If the key is a modifier, update the modifiers:
			if (modifiers[key] !== undefined)
				modifiers[key] = keyDown;
			
			// Call the onKeyDown or onKeyUp handler if present:
			// TODO: don't call the key handler if the key is a modifier?
			if (paper.tool && paper.tool[toolHandler]) {
				// TODO: Introduce a class for this?
				var keyEvent = {
					type: keyDown ? 'key-down' : 'key-up',
					keyCode: code,
					character: key,
					modifiers: modifiers,
					// 'preventDefault: event.preventDefault' throws
					// an error in Safari when called, so we have to wrap
					// it into a function.
					// TODO: Port to Scriptographer:
					preventDefault: function() {
						if (event.preventDefault) {
							event.preventDefault();
						} else {
							event.returnValue = false;
						}
					}
				};
				var res = paper.tool[toolHandler](keyEvent);
				// TODO: Port to Scriptographer:
				// When the handler function returns false, prevent the
				// default behaviour of the key event:
				if (res === false)
					keyEvent.preventDefault();
			}
		};
	}, {}));
	
	return {
		modifiers: modifiers,
		isDown: function(key) {
			return !!activeKeys[key];
		}
	};
};