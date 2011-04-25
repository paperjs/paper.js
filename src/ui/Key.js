var Key = new function() {
	// TODO: make sure the keys are called the same in Scriptographer
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
	
	var modifiers = this.modifiers = {
		shift: false,
		control: false,
		alt: false,
		command: false,
		capsLock: false
	};
	
	function setActive(key, active) {
		var keyIsActive = activeKeys[key];
		if (!keyIsActive) {
			if(active)
				activeKeys[key] = true;
		} else {
			delete activeKeys[key];
		}
	}
	
	var eventHandlers = Base.each(['keyDown', 'keyUp'], function(type) {
		var toolHandler = 'on' + Base.capitalize(type),
			keyDown = type == 'keyDown';
		this[type.toLowerCase()] = function(event) {
			console.log(event.which || event.keyCode);
			var code = event.which || event.keyCode,
				key = keys[code] || String.fromCharCode(code).toLowerCase();
			// Activate or deactivate the key:
			setActive(key, keyDown);
			
			// If the key is a modifier, update the modifiers:
			if (modifiers[key] !== undefined)
				modifiers[key] = keyDown;
			
			// Call the onKeyDown or onKeyUp handler if present:
			if(paper.tool[toolHandler]) {
				paper.tool[toolHandler]({
					type: keyDown ? 'key-down' : 'key-up',
					keyCode: code,
					character: key,
					modifiers: modifiers
				});
			}
		}
	}, {});
	Event.add(document, eventHandlers);
	
	return {
		isDown: function(key) {
			return !!activeKeys[key];
		}
	};
};