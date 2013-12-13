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
 * @name Callback
 * @namespace
 * @private
 */
var Callback = {
	attach: function(type, func) {
		// If an object literal is passed, attach all callbacks defined in it
		if (typeof type !== 'string') {
			Base.each(type, function(value, key) {
				this.attach(key, value);
			}, this);
			return;
		}
		var entry = this._eventTypes[type];
		if (entry) {
			var handlers = this._handlers = this._handlers || {};
			handlers = handlers[type] = handlers[type] || [];
			if (handlers.indexOf(func) == -1) { // Not added yet, add it now
				handlers.push(func);
				// See if this is the first handler that we're attaching, and 
				// call install if defined.
				if (entry.install && handlers.length == 1)
					entry.install.call(this, type);
			}
		}
	},

	detach: function(type, func) {
		// If an object literal is passed, detach all callbacks defined in it
		if (typeof type !== 'string') {
			Base.each(type, function(value, key) {
				this.detach(key, value);
			}, this);
			return;
		}
		var entry = this._eventTypes[type],
			handlers = this._handlers && this._handlers[type],
			index;
		if (entry && handlers) {
			// See if this is the last handler that we're detaching (or if we
			// are detaching all handlers), and call uninstall if defined.
			if (!func || (index = handlers.indexOf(func)) != -1
					&& handlers.length == 1) {
				if (entry.uninstall)
					entry.uninstall.call(this, type);
				delete this._handlers[type];
			} else if (index != -1) {
				// Just remove this one handler
				handlers.splice(index, 1);
			}
		}
	},

	once: function(type, func) {
		this.attach(type, function() {
			func.apply(this, arguments);
			this.detach(type, func);
		});
	},

	fire: function(type, event) {
		// Returns true if fired, false otherwise
		var handlers = this._handlers && this._handlers[type];
		if (!handlers)
			return false;
		var args = [].slice.call(arguments, 1),
			PaperScript = paper.PaperScript,
			handleException = PaperScript && PaperScript.handleException,
			that = this;

		function callHandlers() {
			for (var i in handlers) {
				// When the handler function returns false, prevent the default
				// behaviour and stop propagation of the event by calling stop()
				if (handlers[i].apply(that, args) === false
						&& event && event.stop) {
					event.stop();
					break;
				}
			}
		}
		// See PaperScript.handleException for an explanation of the following.
		// Firefox is to blame for the necessity of this... 
		if (handleException) {
			try {
				callHandlers();
			} catch (e) {
				handleException(e);
			}
		} else {
			callHandlers();
		}
		return true;
	},

	responds: function(type) {
		return !!(this._handlers && this._handlers[type]);
	},

	// Install jQuery-style aliases to our event handler methods
	on: '#attach',
	off: '#detach',
	trigger: '#fire',

	_installEvents: function(install) {
		var handlers = this._handlers,
			key = install ? 'install' : 'uninstall';
		for (var type in handlers) {
			if (handlers[type].length > 0) {
				var entry = this._eventTypes[type],
					func = entry[key];
				if (func)
					func.call(this, type);
			}
		}
	},

	statics: {
		// Override inject() so that sub-classes automatically add the accessors
		// for the event handler functions (e.g. #onMouseDown) for each property
		inject: function inject(/* src, ... */) {
			for (var i = 0, l = arguments.length; i < l; i++) {
				var src = arguments[i],
					events = src._events;
				if (events) {
					// events can either be an object literal or an array of
					// strings describing the on*-names.
					// We need to map lowercased event types to the event
					// entries represented by these on*-names in _events.
					var types = {};
					Base.each(events, function(entry, key) {
						var isString = typeof entry === 'string',
							name = isString ? entry : key,
							part = Base.capitalize(name),
							type = name.substring(2).toLowerCase();
						// Map the event type name to the event entry.
						types[type] = isString ? {} : entry;
						// Create getters and setters for the property
						// with the on*-name name:
						name = '_' + name;
						src['get' + part] = function() {
							return this[name];
						};
						src['set' + part] = function(func) {
							// Detach the previous event, if there was one.
							var prev = this[name];
							if (prev)
								this.detach(type, prev);
							if (func)
								this.attach(type, func);
							this[name] = func;
						};
					});
					src._eventTypes = types;
				}
				inject.base.call(this, src);
			}
			return this;
		}
	}
};
