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

var Callback = {
	attach: function(type, func) {
		var entry = this._events[type];
		// If an object literal is passed, attach all callbacks defined in it
		if (!entry) {
			return Base.each(type, function(value, key) {
				this.attach(key, value);
			}, this);
		}
		// Otherwise, attach the event now
		var handlers = this._handlers = this._handlers || {};
		handlers = handlers[type] = handlers[type] || [];
		if (handlers.indexOf(func) == -1) { // Not added yet, add it now
			// See if this is the first handler that we're attaching, and 
			// call install if defined.
			if (entry.install && !handlers.length)
				entry.install.call(this);
			handlers.push(func);
		}
		return this;
	},

	detach: function(type, func) {
		var entry = this._events[type];
		// If an object literal is passed, detach all callbacks defined in it
		if (!entry) {
			return Base.each(type, function(value, key) {
				this.detach(key, value);
			}, this);
		}
		// Otherwise, detach the event now
		var handlers = this._handlers && this._handlers[type],
			index = handlers && handlers.indexOf(func) || -1;
		if (index != -1) {
			handlers.splice(index, 1);
			// See if this is the last handler that we're detaching, and
			// call uninstall if defined.
			if (!handlers.length) {
				delete this._handlers[type];
				if (entry.uninstall)
					entry.uninstall.call(this);
			}
		}
		return this;
	},

	detachAll: function(type) {
		return Base.each(this._handlers && this._handlers[type] || [],
				function(func) {
					this.detach(type, func);
				},
				this);
	},

	fire: function(type, param) {
		// Returns true if fired, false otherwise
		var handlers = this._handlers && this._handlers[type];
		if (!handlers)
			return false;
		Base.each(handlers, function(func) {
			func.call(this, param);
		}, this);
		return true;
	},

	statics: {
		inject: function(/* src, ... */) {
			for (var i = 0, l = arguments.length; i < l; i++) {
				var src = arguments[i],
					events = src._events;
				if (events) {
					Base.each(events, function(entry, type) {
						var part = Base.capitalize(type);
						src['getOn' + part] = function() {
							return this['_on' + part];
						};
						src['setOn' + part] = function(func) {
							if (func) {
								this.attach(type, func);
							} else {
								this.detach(type, this['_on' + part]);
							}
							this['_on' + part] = func;
						};
					});
				}
				this.base(src);
			}
			return this;
		}
	}
};
