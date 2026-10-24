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
 * @name Effect
 *
 * @class A live effect, which derives what is drawn from an item without
 * changing the item itself, as the effects in Illustrator do. Creating one
 * registers it under its type, replacing any effect registered there before,
 * and items use it by that type, see {@link Item#effects}, each through an
 * {@link EffectInstance} with its own parameters.
 *
 * @example
 * new Effect({
 *     type: 'shrink',
 *     label: 'Shrink',
 *     parameters: {
 *         amount: { label: 'Amount', type: 'number', value: 0.5 }
 *     },
 *     onApply: function(event) {
 *         return event.art.scale(this.amount);
 *     }
 * });
 * path.addEffect({ type: 'shrink', parameters: { amount: 0.8 } });
 */
var Effect = Base.extend(new function() {
    var effects = {};

    return /** @lends Effect# */{
        _class: 'Effect',

        /**
         * Creates an effect and registers it under its type.
         *
         * @param {Object} props the {@link #type} of the effect, its
         *     {@link #label} and {@link #parameters}, and {@link #onApply}
         *     and {@link #onEditParameters}
         */
        initialize: function Effect(props) {
            var defaults = {},
                accessors = {};
            this._type = props.type;
            this._label = props.label || props.type;
            this._parameters = props.parameters || {};
            this.onApply = props.onApply || null;
            this.onEditParameters = props.onEditParameters || null;
            // The declared parameters become properties of the instances:
            Base.each(this._parameters, function(parameter, key) {
                if (key in EffectInstance.prototype)
                    throw new Error('Invalid parameter name: \'' + key + '\'.');
                defaults[key] = parameter.value;
                accessors[key] = {
                    configurable: true,
                    get: function() {
                        return this._parameters[key];
                    },
                    set: function(value) {
                        this._parameters[key] = value;
                        this._changed();
                    }
                };
            });
            this._defaults = defaults;
            this._accessors = accessors;
            Effect.add(this);
        },

        /**
         * The type that the effect is registered under, and that items use it
         * by.
         *
         * @bean
         * @type String
         */
        getType: function() {
            return this._type;
        },

        /**
         * The label of the effect, for hosts to show to users.
         *
         * @bean
         * @type String
         * @default the type
         */
        getLabel: function() {
            return this._label;
        },

        /**
         * The declared parameters of the effect by their names, as objects
         * that describe them for hosts to build their settings from, with the
         * default as their `value`, e.g.
         * `{ label: 'Amount', type: 'number', range: [0, 100], value: 10 }`.
         * The instances of the effect have them as properties.
         *
         * @bean
         * @type Object
         */
        getParameters: function() {
            return this._parameters;
        },

        /**
         * The function that applies the effect, called with the instance as
         * `this`, and returning what the effect makes of the art that it gets,
         * which it doesn't change.
         *
         * @name Effect#onApply
         * @property
         * @type ?Function
         *
         * @option event.art {Item} the item to apply the effect to, or what
         *     the effect before it returned
         * @option event.item {Item} the item that the instance is part of
         */

        /**
         * The function that hosts call when the user edits the parameters of
         * an instance, with the instance as `this`, to set its properties.
         * Paper.js itself doesn't call it.
         *
         * @name Effect#onEditParameters
         * @property
         * @type ?Function
         */

        /**
         * Removes the effect from the registered effects.
         *
         * @return {Boolean} {@true if the effect was registered}
         */
        remove: function() {
            return Effect.remove(this);
        },

        statics: /** @lends Effect */{
            // Changes with the registered effects, for items to apply theirs
            // again, see Item#getEffectOutput():
            _version: 0,

            /**
             * Registers the effect under its type, replacing any effect
             * registered there before. Effects register themselves when they
             * are created.
             *
             * @param {Effect} effect
             * @return {Effect} the effect
             */
            add: function(effect) {
                effects[effect._type] = effect;
                Effect._version++;
                return effect;
            },

            /**
             * Returns the effect registered under the type.
             *
             * @param {String} type
             * @return {?Effect} the effect, or `null`
             */
            get: function(type) {
                return effects.hasOwnProperty(type) ? effects[type] : null;
            },

            /**
             * Returns all registered effects.
             *
             * @return {Effect[]} the effects
             */
            getAll: function() {
                return Object.keys(effects).map(function(type) {
                    return effects[type];
                });
            },

            /**
             * Removes the effect from the registered effects.
             *
             * @param {Effect} effect
             * @return {Boolean} {@true if the effect was registered}
             */
            remove: function(effect) {
                var type = effect._type;
                if (effects[type] === effect) {
                    delete effects[type];
                    Effect._version++;
                    return true;
                }
                return false;
            }
        }
    };
});

// The effects of Paper.js, see Item#effects:
new function() {
    // Applies the function to the paths in the art, and returns the art with
    // the paths replaced by what it returns:
    function applyToPaths(art, func) {
        if (art instanceof PathItem)
            return func(art);
        var children = art._children;
        if (children) {
            for (var i = children.length - 1; i >= 0; i--) {
                var child = children[i],
                    result = applyToPaths(child, func);
                if (result !== child)
                    child.replaceWith(result);
            }
        }
        return art;
    }

    // Offsets the paths, see PathItem#offset():
    new Effect({
        type: 'offset',
        label: 'Offset Path',
        parameters: {
            distance: {
                label: 'Distance', type: 'number', units: 'point', value: 0
            },
            join: {
                label: 'Join', type: 'list',
                options: ['miter', 'round', 'bevel'], value: 'miter'
            },
            miterLimit: { label: 'Miter Limit', type: 'number', value: 10 }
        },

        onApply: function(event) {
            var instance = this;
            return applyToPaths(event.art, function(path) {
                return path.offset(instance.distance, {
                    join: instance.join,
                    miterLimit: instance.miterLimit,
                    insert: false
                });
            });
        }
    });

    // Outlines the strokes of the paths as filled areas next to their fills,
    // following their stroke profiles, see PathItem#outline():
    new Effect({
        type: 'outline',
        label: 'Outline Stroke',

        onApply: function(event) {
            return applyToPaths(event.art, function(path) {
                if (!path.hasStroke())
                    return path;
                var outline = path.outline({ insert: false });
                if (!path.hasFill())
                    return outline;
                path.setStrokeColor(null);
                return new Group({
                    children: [path, outline],
                    insert: false
                });
            });
        }
    });
};
