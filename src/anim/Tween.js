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
 * @name Tween
 *
 * @class Allows tweening `Object` properties between two states for a given
 * duration. To tween properties on Paper.js {@link Item} instances,
 * {@link Item#tween(from, to, options)} can be used, which returns created
 * tween instance.
 *
 * @see Item#tween(from, to, options)
 * @see Item#tween(to, options)
 * @see Item#tween(options)
 * @see Item#tweenTo(to, options)
 * @see Item#tweenFrom(from, options)
 */
var Tween = Base.extend(Emitter, /** @lends Tween# */{
    _class: 'Tween',

    statics: {
        easings: new Base({
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
        })
    },

    /**
     * Creates a new tween.
     *
     * @param {Object} object the object to tween the properties on
     * @param {Object} from the state at the start of the tweening
     * @param {Object} to the state at the end of the tweening
     * @param {Number} duration the duration of the tweening
     * @param {String|Function} [easing='linear'] the type of the easing
     *     function or the easing function
     * @param {Boolean} [start=true] whether to start tweening automatically
     * @return {Tween} the newly created tween
     */
    initialize: function Tween(object, from, to, duration, easing, start) {
        this.object = object;
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

    /**
     * Set a function that will be executed when the tween completes.
     * @param {Function} function the function to execute when the tween
     *     completes
     * @return {Tween}
     *
     * @example {@paperscript}
     * // Tweens chaining:
     * var circle = new Path.Circle({
     *     center: view.center,
     *     radius: 40,
     *     fillColor: 'blue'
     * });
     * // Tween color from blue to red.
     * var tween = circle.tweenTo({ fillColor: 'red' }, 2000);
     * // When the first tween completes...
     * tween.then(function() {
     *     // ...tween color back to blue.
     *     circle.tweenTo({ fillColor: 'blue' }, 2000);
     * });
     */
    then: function(then) {
        // TODO: This only supports one callback for `then()`. Figure out how
        // to handle multiple calls to then in an decent way, without relying
        // on Promises (or should we?).
        this._then = then;
        return this;
    },

    /**
     * Start tweening.
     * @return {Tween}
     *
     * @example {@paperscript}
     * // Manually start tweening.
     * var circle = new Path.Circle({
     *     center: view.center,
     *     radius: 40,
     *     fillColor: 'blue'
     * });
     * var tween = circle.tweenTo(
     *     { fillColor: 'red' },
     *     { duration: 2000, start: false }
     * );
     * tween.start();
     */
    start: function() {
        this._startTime = null;
        this.running = true;
        return this;
    },

    /**
     * Stop tweening.
     * @return {Tween}
     *
     * @example {@paperscript}
     * // Stop a tween before it completes.
     * var circle = new Path.Circle({
     *     center: view.center,
     *     radius: 40,
     *     fillColor: 'blue'
     * });
     * // Start tweening from blue to red for 2 seconds.
     * var tween = circle.tweenTo({ fillColor: 'red' }, 2000);
     * // After 1 second...
     * setTimeout(function(){
     *     // ...stop tweening.
     *     tween.stop();
     * }, 1000);
     */
    stop: function() {
        this.running = false;
        return this;
    },

    // DOCS: Document Tween#update(progress)
    update: function(progress) {
        if (this.running) {
            if (progress >= 1) {
                // Always finish the animation.
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
                this._setProperty(this._parsedKeys[key], value);
            }

            // TODO: Set `progress` and `factor` on Tween object also, so they
            // can be used witout events.
            if (this.responds('update')) {
                this.emit('update', new Base({
                    progress: progress,
                    factor: factor
                }));
            }
            if (!this.running && this._then) {
                // TODO: Look into what should be returned.
                this._then(this.object);
            }
        }
        return this;
    },

    /**
     * {@grouptitle Event Handlers}
     *
     * The function to be called when the tween is updated. It receives an
     * object as its sole argument, containing the current progress of the
     * tweening and the factor calculated by the easing function.
     *
     * @name Tween#onUpdate
     * @property
     * @type ?Function
     *
     * @example {@paperscript}
     * // Display tween progression values:
     * var circle = new Path.Circle({
     *     center: view.center,
     *     radius: 40,
     *     fillColor: 'blue'
     * });
     * var tween = circle.tweenTo(
     *     { fillColor: 'red' },
     *     {
     *         duration: 2000,
     *         easing: 'easeInCubic'
     *     }
     * );
     * var progressText = new PointText(view.center + [60, -10]);
     * var factorText = new PointText(view.center + [60, 10]);
     *
     * // Install event using onUpdate() property:
     * tween.onUpdate = function(event) {
     *     progressText.content = 'progress: ' + event.progress.toFixed(2);
     * };
     *
     * // Install event using on('update') method:
     * tween.on('update', function(event) {
     *     factorText.content = 'factor: ' + event.factor.toFixed(2);
     * });
     */
    _events: {
        onUpdate: {}
    },

    _handleFrame: function(time) {
        var startTime = this._startTime,
            progress = startTime
                ? (time - startTime) / this.duration
                : 0;
        if (!startTime) {
            this._startTime = time;
        }
        this.update(progress);
    },

    _getState: function(state) {
        var keys = this._keys,
            result = {};
        for (var i = 0, l = keys.length; i < l; i++) {
            var key = keys[i],
                path = this._parsedKeys[key],
                current = this._getProperty(path),
                value;
            if (state) {
                var resolved = this._resolveValue(current, state[key]);
                // Temporarily set the resolved value, so we can retrieve the
                // coerced value from paper's internal magic.
                this._setProperty(path, resolved);
                value = this._getProperty(path);
                // Clone the value if possible to prevent future changes.
                value = value && value.clone ? value.clone() : value;
                this._setProperty(path, current);
            } else {
                // We want to get the current state at the time of the call, so
                // we have to clone if possible to prevent future changes.
                value = current && current.clone ? current.clone() : current;
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
                    // We're (unnecessarily) escaping '*/' here to not confuse
                    // the ol' JSDoc parser...
                    operator.match(/^[+\-\*\/]=/)
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

    _getProperty: function(path, offset) {
        var obj = this.object;
        for (var i = 0, l = path.length - (offset || 0); i < l && obj; i++) {
            obj = obj[path[i]];
        }
        return obj;
    },

    _setProperty: function(path, value) {
        var dest = this._getProperty(path, 1);
        if (dest) {
            dest[path[path.length - 1]] = value;
        }
    }
});
