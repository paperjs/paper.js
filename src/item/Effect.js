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
 * before it returned. Each type of effect is a subclass with its params as
 * properties, registered by its type, see {@link Effect.types}. Effects of
 * types that aren't registered keep their params and leave what they get as
 * it is, so that they still round-trip. {@link Effect.extend(src)} creates
 * new types.
 */
var Effect = Base.extend(/** @lends Effect# */{
    _class: 'Effect',
    // JSON writes the effects of items as plain objects:
    _compactSerialize: true,
    // The type and the params with their defaults, set by subclasses:
    _type: null,
    _defaults: {},

    /**
     * Creates an effect of the type of its class, or of the type that the
     * object names, see {@link Effect.create(object)}.
     *
     * @param {Object} [object] the params of the effect, and its `visible`
     *     flag
     *
     * @example
     * var path = new Path.Circle({
     *     center: [50, 50],
     *     radius: 20,
     *     fillColor: 'red'
     * });
     * path.addEffect(new Effect.types.offset({ distance: 10 }));
     */
    initialize: function Effect(props) {
        props = props || {};
        var defaults = this._defaults,
            // Effects of unknown types keep all their params:
            params = this.constructor === Effect ? Base.set({}, props) : {};
        delete params.type;
        delete params.visible;
        for (var key in defaults) {
            var value = props[key];
            params[key] = value !== undefined ? value : defaults[key];
        }
        this._item = null;
        this._index = null;
        this._type = this._type || props.type || null;
        this._visible = props.visible !== false;
        this._params = params;
    },

    /**
     * @return {Effect} a copy of the effect, without an item
     */
    clone: function() {
        return new this.constructor(Base.set({
            type: this._type,
            visible: this._visible
        }, Base.clone(this._params)));
    },

    _serialize: function(options, dictionary) {
        var props = Base.set({ type: this._type }, this._params);
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
     * The params of the effect as a plain object. Each type of effect also
     * has them as properties. Changing the returned object isn't tracked.
     *
     * @bean
     * @type Object
     */
    getParams: function() {
        return this._params;
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
                && Base.equals(this._params, effect._params)
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
         * it, `{ type, ...params, visible }`, of the class registered for its
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
         * params, which become its properties, and its {@link #apply(art)}.
         * The params of subclasses add to those of their base classes.
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
         * path.addEffect({ type: 'shrink', amount: 0.8 });
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
                    return this._params[key];
                };
                src['set' + part] = function(value) {
                    this._params[key] = value;
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
            var params = this._params;
            return applyToPaths(art, function(path) {
                return path.offset(params.distance, {
                    join: params.join,
                    miterLimit: params.miterLimit,
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
