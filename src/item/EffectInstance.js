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
 * @name EffectInstance
 *
 * @class The use of an {@link Effect} on an item, see {@link Item#effects},
 * with its parameters. The parameters that the effect declares are also its
 * properties. Instances of effects that aren't registered keep their
 * parameters and leave what they get as it is, so that they still round-trip.
 */
var EffectInstance = Base.extend(/** @lends EffectInstance# */{
    _class: 'EffectInstance',
    // JSON writes the effects of items as plain objects:
    _compactSerialize: true,

    // Items create their instances from plain objects, see Item#addEffect():
    initialize: function EffectInstance(props) {
        this._type = props.type;
        this._visible = props.visible !== false;
        this._item = this._index = null;
        this._setParameters(props.parameters);
    },

    // Takes the parameters as they are, with the defaults of the effect for
    // the ones that they don't set:
    _setParameters: function(parameters) {
        this._parameters = Base.set({}, parameters);
        this._setEffect(Effect.get(this._type));
    },

    // Binds the instance to its effect, with the declared parameters as
    // properties, and their defaults:
    _setEffect: function(effect) {
        if (effect) {
            var parameters = this._parameters,
                defaults = effect._defaults;
            for (var key in defaults) {
                if (parameters[key] === undefined)
                    parameters[key] = defaults[key];
            }
            Object.defineProperties(this, effect._accessors);
        }
        this._effect = effect;
        this._linkedParameters = null;
    },

    // Returns the plain object that items create the instance from, with a
    // copy of its parameters:
    _getProps: function() {
        var props = {
            type: this._type,
            parameters: Base.set({}, this._parameters)
        };
        if (!this._visible)
            props.visible = false;
        return props;
    },

    _serialize: function(options, dictionary) {
        return Base.serialize(this._getProps(), options, true, dictionary);
    },

    _changed: function() {
        var item = this._item;
        if (item)
            item._changed(/*#=*/Change.ATTRIBUTE);
    },

    /**
     * The type of the effect that the instance uses, also when it isn't
     * registered.
     *
     * @bean
     * @type String
     */
    getType: function() {
        return this._type;
    },

    /**
     * The effect that the instance uses, registered under its {@link #type},
     * or `null` if there is none.
     *
     * @bean
     * @type ?Effect
     */
    getEffect: function() {
        var effect = Effect.get(this._type);
        // Bind the instance again when its effect is redefined:
        if (effect !== this._effect)
            this._setEffect(effect);
        return effect;
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
     * The parameters of the instance. Changing them on the returned object
     * updates it, as setting them as its properties does. Parameters that it
     * doesn't have yet are added by setting them all, as are changes within
     * values such as arrays.
     *
     * @bean
     * @type Object
     *
     * @example
     * var instance = path.addEffect({
     *     type: 'offset',
     *     parameters: { distance: 10 }
     * });
     * instance.parameters.distance = 20; // Redraws.
     * instance.parameters = { distance: 5, join: 'round' };
     */
    getParameters: function() {
        var linked = this._linkedParameters;
        if (!linked) {
            // The parameters as accessors that update the instance:
            var instance = this;
            linked = this._linkedParameters = {};
            Base.each(this._parameters, function(value, key) {
                Object.defineProperty(linked, key, {
                    enumerable: true,
                    get: function() {
                        return instance._parameters[key];
                    },
                    set: function(value) {
                        instance._parameters[key] = value;
                        instance._changed();
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
     * The item that the instance is part of.
     *
     * @bean
     * @type ?Item
     */
    getItem: function() {
        return this._item;
    },

    /**
     * The index of the instance in the {@link Item#effects} of its item.
     *
     * @bean
     * @type ?Number
     */
    getIndex: function() {
        return this._index;
    },

    /**
     * Removes the instance from its item.
     *
     * @return {Boolean} {@true if the instance was removed}
     */
    remove: function() {
        return !!(this._item && this._item.removeEffect(this._index));
    },

    /**
     * Checks whether the instance is equal to the supplied one.
     *
     * @param {EffectInstance} instance
     * @return {Boolean} {@true if they are equal}
     */
    equals: function(instance) {
        return instance === this || instance instanceof EffectInstance
                && this._type === instance._type
                && this._visible === instance._visible
                && Base.equals(this._parameters, instance._parameters)
                || false;
    }
});
