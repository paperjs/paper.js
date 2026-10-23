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
 * @class A live effect of an item, see {@link Item#effects}: it derives what
 * is drawn from the item without changing the item itself, as the effects in
 * Illustrator do. The effects of an item run in order, each on what the one
 * before it returned. Each type of effect is a subclass with its parameters
 * as properties, registered by its type, see {@link Effect.types}. Effects of
 * types that aren't registered keep their parameters and leave what they get
 * as it is, so that they still round-trip. {@link Effect.extend(src)} creates
 * new types.
 */
var Effect = Base.extend(/** @lends Effect# */{
    _class: 'Effect',
    // JSON writes the effects of items as plain objects:
    _compactSerialize: true,
    // The type and the parameters with their defaults, set by subclasses:
    _type: null,
    _defaults: {},

    /**
     * Creates an effect of the type of its class, or of the type that the
     * object names, see {@link Effect.create(object)}.
     *
     * @param {Object} [object] the effect's `parameters`, which it takes as
     *     they are, and its `visible` flag
     *
     * @example
     * var path = new Path.Circle({
     *     center: [50, 50],
     *     radius: 20,
     *     fillColor: 'red'
     * });
     * path.addEffect(new Effect.types.offset({
     *     parameters: { distance: 10 }
     * }));
     */
    initialize: function Effect(props) {
        props = props || {};
        this._item = null;
        this._index = null;
        this._type = this._type || props.type || null;
        this._visible = props.visible !== false;
        this._setParameters(props.parameters);
    },

    // Takes the parameters as they are, with the defaults for the ones that
    // they don't set:
    _setParameters: function(parameters) {
        var defaults = this._defaults;
        parameters = Base.set({}, parameters);
        for (var key in defaults) {
            if (parameters[key] === undefined)
                parameters[key] = defaults[key];
        }
        this._parameters = parameters;
        this._linkedParameters = null;
    },

    /**
     * @return {Effect} a copy of the effect, without an item
     */
    clone: function() {
        return new this.constructor({
            type: this._type,
            parameters: Base.clone(this._parameters),
            visible: this._visible
        });
    },

    _serialize: function(options, dictionary) {
        var props = { type: this._type, parameters: this._parameters };
        if (!this._visible)
            props.visible = false;
        return Base.serialize(props, options, true, dictionary);
    },

    _changed: function() {
        var item = this._item;
        if (item)
            item._changed(/*#=*/Change.ATTRIBUTE);
    },

    /**
     * The type of the effect, which names its class in {@link Effect.types}.
     *
     * @bean
     * @type String
     */
    getType: function() {
        return this._type;
    },

    /**
     * Whether the effect applies. Effects that aren't visible are skipped.
     *
     * @bean
     * @type Boolean
     * @default true
     */
    isVisible: function() {
        return this._visible;
    },

    setVisible: function(visible) {
        this._visible = !!visible;
        this._changed();
    },

    /**
     * The parameters of the effect. Changing them on the returned object
     * updates the effect, as setting them as properties of effects of known
     * types does. Parameters that it doesn't have yet are added by setting
     * them all, as are changes within values such as arrays.
     *
     * @bean
     * @type Object
     *
     * @example
     * var effect = path.addEffect({
     *     type: 'offset',
     *     parameters: { distance: 10 }
     * });
     * effect.parameters.distance = 20; // Redraws.
     * effect.parameters = { distance: 5, join: 'round' };
     */
    getParameters: function() {
        var linked = this._linkedParameters;
        if (!linked) {
            // The parameters as accessors that update the effect:
            var effect = this;
            linked = this._linkedParameters = {};
            Base.each(this._parameters, function(value, key) {
                Object.defineProperty(linked, key, {
                    enumerable: true,
                    get: function() {
                        return effect._parameters[key];
                    },
                    set: function(value) {
                        effect._parameters[key] = value;
                        effect._changed();
                    }
                });
            });
            // New parameters would be lost, so strict code throws on them:
            Object.preventExtensions(linked);
        }
        return linked;
    },

    setParameters: function(parameters) {
        this._setParameters(parameters);
        this._changed();
    },

    /**
     * The item that the effect is part of.
     *
     * @bean
     * @type ?Item
     */
    getItem: function() {
        return this._item;
    },

    /**
     * The index of the effect in the {@link Item#effects} of its item.
     *
     * @bean
     * @type ?Number
     */
    getIndex: function() {
        return this._index;
    },

    /**
     * Removes the effect from its item.
     *
     * @return {Boolean} {@true if the effect was removed}
     */
    remove: function() {
        return !!(this._item && this._item.removeEffect(this._index));
    },

    /**
     * Applies the effect to the art that it gets: the item, or what the
     * effect before it returned, which it doesn't change. Subclasses override
     * it, effects of unknown types return the art as it is.
     *
     * @param {Item} art the item to apply the effect to
     * @return {Item} the result
     */
    apply: function(art) {
        // To be overridden in sub-classes.
        return art;
    },

    /**
     * Checks whether the effect is equal to the supplied one.
     *
     * @param {Effect} effect
     * @return {Boolean} {@true if they are equal}
     */
    equals: function(effect) {
        return effect === this || effect instanceof Effect
                && this._type === effect._type
                && this._visible === effect._visible
                && Base.equals(this._parameters, effect._parameters)
                || false;
    },

    statics: /** @lends Effect */{
        /**
         * The classes of the effects by their types. Hosts can register their
         * own classes for types here, to replace the ones of Paper.js.
         *
         * @type Object
         */
        types: {},

        /**
         * Returns the effect, or creates one from an object that describes
         * it, `{ type, parameters, visible }`, of the class registered for its
         * type, or of `Effect` for unknown types.
         *
         * @param {Effect|Object} object
         * @return {Effect}
         */
        create: function(object) {
            var ctor = Effect.types[object.type] || Effect;
            return object instanceof Effect ? object : new ctor(object);
        },

        /**
         * Creates a type of effect: a subclass of `Effect` with its `type`,
         * which registers it in {@link Effect.types}, the `defaults` of its
         * parameters, which become its properties, and its
         * {@link #apply(art)}. The parameters of subclasses add to those of
         * their base classes.
         *
         * @param {Object} src the definition of the type
         * @return {Function} the class
         *
         * @example
         * Effect.extend({
         *     type: 'shrink',
         *     defaults: { amount: 0.5 },
         *     apply: function(art) {
         *         return art.scale(this.amount);
         *     }
         * });
         * path.addEffect({ type: 'shrink', parameters: { amount: 0.8 } });
         */
        extend: function extend(src) {
            // Keep the type and the defaults to the side, as the getter of
            // `type` serves the effects of unknown types too:
            var type = src.type,
                defaults = src._defaults = Base.set({},
                    this.prototype._defaults, src.defaults);
            delete src.type;
            delete src.defaults;
            if (type)
                src._type = type;
            Base.each(defaults, function(value, key) {
                var part = Base.capitalize(key);
                src['get' + part] = function() {
                    return this._parameters[key];
                };
                src['set' + part] = function(value) {
                    this._parameters[key] = value;
                    this._changed();
                };
            });
            var ctor = extend.base.apply(this, arguments);
            if (type)
                Effect.types[type] = ctor;
            return ctor;
        }
    }
});

// The first types of effects, registered in Effect.types, see Item#effects:
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
    Effect.extend({
        type: 'offset',
        defaults: { distance: 0, join: 'miter', miterLimit: 10 },

        apply: function(art) {
            var parameters = this._parameters;
            return applyToPaths(art, function(path) {
                return path.offset(parameters.distance, {
                    join: parameters.join,
                    miterLimit: parameters.miterLimit,
                    insert: false
                });
            });
        }
    });

    // Outlines the strokes of the paths as filled areas next to their fills,
    // following their stroke profiles, see PathItem#outline():
    Effect.extend({
        type: 'outline',

        apply: function(art) {
            return applyToPaths(art, function(path) {
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
