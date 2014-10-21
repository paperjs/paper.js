/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2014, Juerg Lehni & Jonathan Puckey
 * http://scratchdisk.com/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name Emitter
 * @namespace
 * @private
 */
var Emitter = {
    on: function(type, func) {
        // If an object literal is passed, attach all callbacks defined in it
        if (typeof type !== 'string') {
            Base.each(type, function(value, key) {
                this.on(key, value);
            }, this);
            return;
        }
        var entry = this._eventTypes[type];
        if (entry) {
            var handlers = this._callbacks = this._callbacks || {};
            handlers = handlers[type] = handlers[type] || [];
            if (handlers.indexOf(func) === -1) { // Not added yet, add it now
                handlers.push(func);
                // See if this is the first handler that we're attaching, and
                // call install if defined.
                if (entry.install && handlers.length == 1)
                    entry.install.call(this, type);
            }
        }
    },

    off: function(type, func) {
        // If an object literal is passed, detach all callbacks defined in it
        if (typeof type !== 'string') {
            Base.each(type, function(value, key) {
                this.off(key, value);
            }, this);
            return;
        }
        var entry = this._eventTypes[type],
            handlers = this._callbacks && this._callbacks[type],
            index;
        if (entry && handlers) {
            // See if this is the last handler that we're detaching (or if we
            // are detaching all handlers), and call uninstall if defined.
            if (!func || (index = handlers.indexOf(func)) !== -1
                    && handlers.length === 1) {
                if (entry.uninstall)
                    entry.uninstall.call(this, type);
                delete this._callbacks[type];
            } else if (index !== -1) {
                // Just remove this one handler
                handlers.splice(index, 1);
            }
        }
    },

    once: function(type, func) {
        this.on(type, function() {
            func.apply(this, arguments);
            this.off(type, func);
        });
    },

    emit: function(type, event) {
        // Returns true if fired, false otherwise
        var handlers = this._callbacks && this._callbacks[type];
        if (!handlers)
            return false;
        var args = [].slice.call(arguments, 1);
        for (var i = 0, l = handlers.length; i < l; i++) {
            // When the handler function returns false, prevent the default
            // behaviour and stop propagation of the event by calling stop()
            if (handlers[i].apply(this, args) === false
                    && event && event.stop) {
                event.stop();
                break;
            }
        }
        return true;
    },

    responds: function(type) {
        return !!(this._callbacks && this._callbacks[type]);
    },

    // Keep deprecated methods around from previous Callback interface.
    attach: '#on',
    detach: '#off',
    fire: '#emit',

    _installEvents: function(install) {
        var handlers = this._callbacks,
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
        // NOTE: This needs to be defined in the first injection scope, as for
        // simplicity, we don't loop through all of them here.
        inject: function inject(src) {
            var events = src._events;
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
                            this.off(type, prev);
                        if (func)
                            this.on(type, func);
                        this[name] = func;
                    };
                });
                src._eventTypes = types;
            }
            return inject.base.apply(this, arguments);
        }
    }
};
