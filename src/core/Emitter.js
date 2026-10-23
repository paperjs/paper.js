/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2020, Jürg Lehni & Jonathan Puckey
 * http://juerglehni.com/ & https://puckey.studio/
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
        } else {
            var types = this._eventTypes,
                entry = types && types[type];
            // Handlers on the prototype of a class are called for all its
            // objects, see Item.onDraw:
            if (this === this.constructor.prototype
                    && !(entry && entry.classLevel))
                throw new Error('Unsupported class-level event: \''
                        + type + '\'.');
            // Objects inherit the handlers of their prototypes, but keep their
            // own:
            var handlers = this._callbacks = this.hasOwnProperty('_callbacks')
                    && this._callbacks || {};
            handlers = handlers[type] = handlers[type] || [];
            if (handlers.indexOf(func) === -1) { // Not added yet, add now.
                handlers.push(func);
                // See if this is the first handler that we're attaching,
                // and call install if defined.
                if (entry && entry.install && handlers.length === 1)
                    entry.install.call(this, type);
            }
        }
        return this;
    },

    off: function(type, func) {
        // If an object literal is passed, detach all callbacks defined in it
        if (typeof type !== 'string') {
            Base.each(type, function(value, key) {
                this.off(key, value);
            }, this);
            return;
        }
        var types = this._eventTypes,
            entry = types && types[type],
            handlers = this.hasOwnProperty('_callbacks')
                    && this._callbacks[type],
            index;
        if (handlers) {
            // See if this is the last handler that we're detaching (or if we
            // are detaching all handlers), and call uninstall if defined.
            if (!func || (index = handlers.indexOf(func)) !== -1
                    && handlers.length === 1) {
                if (entry && entry.uninstall)
                    entry.uninstall.call(this, type);
                // Delete handlers entry again, so responds() returns false.
                delete this._callbacks[type];
            } else if (index !== -1) {
                // Just remove this one handler
                handlers.splice(index, 1);
            }
        }
        return this;
    },

    once: function(type, func) {
        return this.on(type, function handler() {
            func.apply(this, arguments);
            this.off(type, handler);
        });
    },


    emit: function(type, event) {
        // Returns true if any events were emitted, false otherwise.
        var handlers = this._getHandlers(type);
        if (!handlers.length)
            return false;
        var args = Base.slice(arguments, 1),
            // Set the current target to `this` if the event object defines
            // #target but not #currentTarget.
            setTarget = event && event.target && !event.currentTarget;
        if (setTarget)
            event.currentTarget = this;
        for (var i = 0, l = handlers.length; i < l; i++) {
            if (handlers[i].apply(this, args) == false) {
                // If the handler returns false, prevent the default behavior
                // and stop propagation of the event by calling stop()
                if (event && event.stop)
                    event.stop();
                // Stop propagation right now!
                break;
           }
        }
        if (setTarget)
            delete event.currentTarget;
        return true;
    },

    responds: function(type) {
        return this._getHandlers(type).length > 0;
    },

    // Collect the object's own handlers and then the ones of its prototypes,
    // in a new list that changes caused by on / off won't affect:
    _getHandlers: function(type) {
        var handlers = [];
        for (var obj = this; obj; obj = Object.getPrototypeOf(obj)) {
            var callbacks = obj.hasOwnProperty('_callbacks')
                    && obj._callbacks[type];
            if (callbacks)
                Base.push(handlers, callbacks);
        }
        return handlers;
    },

    // Keep deprecated methods around from previous Callback interface.
    attach: '#on',
    detach: '#off',
    fire: '#emit',

    _installEvents: function(install) {
        var types = this._eventTypes,
            handlers = this._callbacks,
            key = install ? 'install' : 'uninstall';
        if (types) {
            for (var type in handlers) {
                if (handlers[type].length > 0) {
                    var entry = types[type],
                        func = entry && entry[key];
                    if (func)
                        func.call(this, type);
                }
            }
        }
    },

    statics: {
        // Attach and detach handlers for all objects of the class and its
        // subclasses, for the event types that declare `classLevel: true`:
        on: function(type, func) {
            this.prototype.on(type, func);
            return this;
        },

        off: function(type, func) {
            this.prototype.off(type, func);
            return this;
        },

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
                        // Only the object's own handler, not its prototype's:
                        return this.hasOwnProperty(name) ? this[name] : null;
                    };
                    src['set' + part] = function(func) {
                        // Detach the previous event, if there was one.
                        var prev = this['get' + part]();
                        if (prev)
                            this.off(type, prev);
                        if (func)
                            this.on(type, func);
                        this[name] = func;
                    };
                    // And on the class, for the types that support it:
                    if (!isString && entry.classLevel) {
                        var statics = src.statics = src.statics || {};
                        statics['get' + part] = function() {
                            return this.prototype['get' + part]();
                        };
                        statics['set' + part] = function(func) {
                            this.prototype['set' + part](func);
                        };
                    }
                });
                src._eventTypes = types;
            }
            return inject.base.apply(this, arguments);
        }
    }
};
