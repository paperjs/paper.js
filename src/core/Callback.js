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
 * @name Callback
 * @namespace
 */
var Callback = {
	attach: function(type, func) {
		// If an object literal is passed, attach all callbacks defined in it
		if (typeof type !== 'string') {
			return Base.each(type, function(value, key) {
				this.attach(key, value);
			}, this);
		}
		var entry = this._eventTypes[type];
		if (!entry)
			return this;
		var handlers = this._handlers = this._handlers || {};
		handlers = handlers[type] = handlers[type] || [];
		if (handlers.indexOf(func) == -1) { // Not added yet, add it now
			handlers.push(func);
			// See if this is the first handler that we're attaching, and 
			// call install if defined.
			if (entry.install && handlers.length == 1)
				entry.install.call(this, type);
		}
		return this;
	},

	detach: function(type, func) {
		// If an object literal is passed, detach all callbacks defined in it
		if (typeof type !== 'string') {
			return Base.each(type, function(value, key) {
				this.detach(key, value);
			}, this);
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
		return this;
	},

	fire: function(type, event) {
		// Returns true if fired, false otherwise
		var handlers = this._handlers && this._handlers[type];
		if (!handlers)
			return false;
		var args = [].slice.call(arguments, 1);
		Base.each(handlers, function(func) {
			// When the handler function returns false, prevent the default
			// behaviour of the event by calling stop() on it
			// PORT: Add to Sg
			if (func.apply(this, args) === false && event && event.stop)
				event.stop();
		}, this);
		return true;
	},

	responds: function(type) {
		return !!(this._handlers && this._handlers[type]);
	},

	statics: {
		inject: function(/* src, ... */) {
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
							if (func) {
								this.attach(type, func);
							} else if (this[name]) {
								this.detach(type, this[name]);
							}
							this[name] = func;
						};
					});
					src._eventTypes = types;
				}
				this.base(src);
			}
			return this;
		}
	}
};
