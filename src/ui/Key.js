var Key = new function() {
	// TODO: make sure the keys are called the same in Scriptographer
	var keys = {
		 '8': 'backspace',
		'13': 'enter',
		'27': 'escape',
		'32': 'space',
		'37': 'left',
		'38': 'up',
		'39': 'right',
		'40': 'down',
		'46': 'delete',
		
	};
	var modifierNames = [
		'shift', 'shiftKey',
		'control', 'ctrlKey',
		'alt', 'altKey',
		'command', 'metaKey'
		// TODO: capslock
	];
	var activeKeys = {};
	
	var eventHandlers = Base.each(['keyDown', 'keyUp'], function(type) {
		var toolHandler = 'on' + Base.capitalize(type),
			down = type == 'keyDown';
		this[type.toLowerCase()] = function(event) {
			var code = event.which || event.keyCode,
				key = keys[code] || String.fromCharCode(code).toLowerCase(),
				modifiers = {};
			activeKeys[key] = down;
			// Add the modifier keys to or remove from the activeKeys
			// and construct the modifiers object to be passed to the
			// key event
			for (var i = 0, l = modifierNames.length; i < l; i += 2) {
				var modifierKey = modifierNames[i];
				if ((down && event[modifierNames[i + 1]])
						|| (!down && modifierKey)) {
					activeKeys[modifierKey] = down;
				}
				modifiers[modifierKey] = down;
			}
			
			if(paper.tool[toolHandler]) {
				paper.tool[toolHandler]({
					type: down ? 'key-down' : 'key-up',
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