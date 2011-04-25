var Key = new function() {
	// TODO: make sure the keys are called the same as in Scriptographer
	var keys = {
		 '8': 'backspace',
		'13': 'enter',
		'16': 'shift',
		'17': 'control',
		'19': 'alt',
		'20': 'capsLock',
		'27': 'escape',
		'32': 'space',
		'37': 'left',
		'38': 'up',
		'39': 'right',
		'40': 'down',
		'46': 'delete',
		'91': 'command'
	};

	var activeKeys = {};
	
	var modifiers = {
		shift: false,
		control: false,
		alt: false,
		command: false,
		capsLock: false
	};
	
	var eventHandlers = Base.each(['keyDown', 'keyUp'], function(type) {
		var toolHandler = 'on' + Base.capitalize(type),
			keyDown = type == 'keyDown';
		this[type.toLowerCase()] = function(event) {
			var code = event.which || event.keyCode,
				key = keys[code] || String.fromCharCode(code).toLowerCase();
			activeKeys[key] = keyDown;
			
			// If the key is a modifier, update the modifiers:
			if (modifiers[key] !== undefined)
				modifiers[key] = keyDown;
			
			// Call the onKeyDown or onKeyUp handler if present:
			// TODO: don't call the key handler if the key is a modifier?
			if (paper.tool[toolHandler]) {
				var preventDefault = paper.tool[toolHandler]({
					type: keyDown ? 'key-down' : 'key-up',
					keyCode: code,
					character: key,
					modifiers: modifiers,
					// 'preventDefault: event.preventDefault' throws
					// an error in Safari when called, so we have to wrap
					// it into a function.
					// TODO: port to Scriptographer.
					preventDefault: function() {
						event.preventDefault()
					}
				});
				// TODO: port to Scriptographer:
				// When the handler function returns false, prevent the
				// default behaviour of the key event:
				if (preventDefault === false)
					event.preventDefault();
			}
		};
	}, {});
	Event.add(document, eventHandlers);
	
	return {
		modifiers: modifiers,
		isDown: function(key) {
			return !!activeKeys[key];
		}
	};
};