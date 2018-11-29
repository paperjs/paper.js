/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2016, Juerg Lehni & Jonathan Puckey
 * http://scratchdisk.com/ & https://puckey.studio/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name Tween
 *
 * @class Allows to tween properties of an Item between two values
 */
var Tween = Base.extend(Emitter, /** @lends Tween# */{
    _class: 'Tween',

    statics: {
        easings: {
            // no easing, no acceleration
            linear: function(t) {
                return t;
            },

            // accelerating from zero velocity
            easeInQuad: function(t) {
                return t * t;
            },

            // decelerating to zero velocity
            easeOutQuad: function(t) {
                return t * (2 - t);
            },

            // acceleration until halfway, then deceleration
            easeInOutQuad: function(t) {
                return t < 0.5
                    ? 2 * t * t
                    : -1 + 2 * (2 - t) * t;
            },

            // accelerating from zero velocity
            easeInCubic: function(t) {
                return t * t * t;
            },

            // decelerating to zero velocity
            easeOutCubic: function(t) {
                return --t * t * t + 1;
            },

            // acceleration until halfway, then deceleration
            easeInOutCubic: function(t) {
                return t < 0.5
                    ? 4 * t * t * t
                    : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
            },

            // accelerating from zero velocity
            easeInQuart: function(t) {
                return t * t * t * t;
            },

            // decelerating to zero velocity
            easeOutQuart: function(t) {
                return 1 - (--t) * t * t * t;
            },

            // acceleration until halfway, then deceleration
            easeInOutQuart: function(t) {
                return t < 0.5
                    ? 8 * t * t * t * t
                    : 1 - 8 * (--t) * t * t * t;
            },

            // accelerating from zero velocity
            easeInQuint: function(t) {
                return t * t * t * t * t;
            },

            // decelerating to zero velocity
            easeOutQuint: function(t) {
                return 1 + --t * t * t * t * t;
            },

            // acceleration until halfway, then deceleration
            easeInOutQuint: function(t) {
                return t < 0.5
                    ? 16 * t * t * t * t * t
                    : 1 + 16 * (--t) * t * t * t * t;
            }
        }
    },

    /**
     * {@grouptitle Event Handling}
     *
     * Attaches an event handler to the tween.
     *
     * @name Tween#on
     * @function
     * @param {String} type the type of event (currently only 'update')
     * @param {Function} function the function to be called when the event
     *     occurs, receiving an object as its
     *     sole argument, containing the current progress of the
     *     tweening and the factor calculated by the easing function
     * @return {Tween} this tween itself, so calls can be chained
     */
    /**
     * Creates a new tween
     *
     * @name Path#initialize
     * @param {Item} item The Item to be tweened
     * @param {Object} from State at the start of the tweening
     * @param {Object} to State at the end of the tweening
     * @param {Number} duration Duration of the tweening
     * @param {String|Function} easing Type of the easing function or the easing
     * function
     * @param {Boolean} start Whether to start tweening automatically
     * @return {Tween} the newly created tween
     */
    initialize: function Tween(item, from, to, duration, easing, start) {
        this.item = item;
        var type = typeof easing;
        var isFunction = type === 'function';
        this.type = isFunction
            ? type
            : type === 'string'
                ? easing
                : 'linear';
        this.easing = isFunction ? easing : Tween.easings[this.type];
        this.duration = duration;
        this.running = false;

        this._then = null;
        this._startTime = null;
        var state = from || to;
        this._keys = state ? Object.keys(state) : [];
        this._parsedKeys = this._parseKeys(this._keys);
        this._from = state && this._getState(from);
        this._to = state && this._getState(to);
        if (start !== false) {
          this.start();
        }
    },

    handleFrame: function(time) {
        var startTime = this._startTime,
            progress = startTime
                ? (time - startTime) / this.duration
                : 0;
        if (!startTime) {
            this._startTime = time;
        }
        this.update(progress);
    },

    then: function(then) {
        this._then = then;
        return this;
    },

    start: function() {
        this._startTime = null;
        this.running = true;
        return this;
    },

    stop: function() {
        this.running = false;
        return this;
    },

    update: function(progress) {
        if (this.running) {
            if (progress > 1) {
                // always finish the animation
                progress = 1;
                this.running = false;
            }

            var factor = this.easing(progress),
                keys = this._keys,
                getValue = function(value) {
                    return typeof value === 'function'
                        ? value(factor, progress)
                        : value;
                };
            for (var i = 0, l = keys && keys.length; i < l; i++) {
                var key = keys[i],
                    from = getValue(this._from[key]),
                    to = getValue(this._to[key]),
                    // Some paper objects have math functions (e.g.: Point,
                    // Color) which can directly be used to do the tweening.
                    value = (from && to && from.__add && to.__add)
                        ? to.__subtract(from).__multiply(factor).__add(from)
                        : ((to - from) * factor) + from;
                this._setItemProperty(this._parsedKeys[key], value);
            }

            if (!this.running && this._then) {
                this._then(this.item);
            }
            if (this.responds('update')) {
                this.emit('update', new Base({
                    progress: progress,
                    factor: factor
                }));
            }
        }
        return this;
    },

    _getState: function(state) {
        var keys = this._keys,
            result = {};
        for (var i = 0, l = keys.length; i < l; i++) {
            var key = keys[i],
                path = this._parsedKeys[key],
                current = this._getItemProperty(path),
                value;
            if (state) {
                var resolved = this._resolveValue(current, state[key]);
                // Temporarily set the resolved value, so we can retrieve the
                // coerced value from paper's internal magic.
                this._setItemProperty(path, resolved);
                value = this._getItemProperty(path);
                // Clone the value if possible to prevent future changes.
                value = value.clone ? value.clone() : value;
                this._setItemProperty(path, current);
            } else {
                // We want to get the current state at the time of the call, so
                // we have to clone if possible to prevent future changes.
                value = current.clone ? current.clone() : current;
            }
            result[key] = value;
        }
        return result;
    },

    _resolveValue: function(current, value) {
        if (value) {
            if (Array.isArray(value) && value.length === 2) {
                var operator = value[0];
                return (
                    operator &&
                    operator.match &&
                    operator.match(/^[+\-*/]=/)
                )
                    ? this._calculate(current, operator[0], value[1])
                    : value;
            } else if (typeof value === 'string') {
                var match = value.match(/^[+\-*/]=(.*)/);
                if (match) {
                    var parsed = JSON.parse(match[1].replace(
                        /(['"])?([a-zA-Z0-9_]+)(['"])?:/g,
                        '"$2": '
                    ));
                    return this._calculate(current, value[0], parsed);
                }
            }
        }
        return value;
    },

    _calculate: function(left, operator, right) {
        return paper.PaperScript.calculateBinary(left, operator, right);
    },

    _parseKeys: function(keys) {
        var parsed = {};
        for (var i = 0, l = keys.length; i < l; i++) {
            var key = keys[i],
                path = key
                    // Convert from JS property access notation to JSON pointer:
                    .replace(/\.([^.]*)/g, '/$1')
                    // Expand array property access notation ([])
                    .replace(/\[['"]?([^'"\]]*)['"]?\]/g, '/$1');
            parsed[key] = path.split('/');
        }
        return parsed;
    },

    _getItemProperty: function(path, offset) {
        var obj = this.item;
        for (var i = 0, l = path.length - (offset || 0); i < l && obj; i++) {
            obj = obj[path[i]];
        }
        return obj;
    },

    _setItemProperty: function(path, value) {
        var dest = this._getItemProperty(path, 1);
        if (dest) {
            dest[path[path.length - 1]] = value;
        }
    }
});
