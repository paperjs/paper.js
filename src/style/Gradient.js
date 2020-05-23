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
 * @name Gradient
 *
 * @class The Gradient object.
 *
 * @classexample {@paperscript height=300}
 * // Applying a linear gradient color containing evenly distributed
 * // color stops:
 *
 * // Define two points which we will be using to construct
 * // the path and to position the gradient color:
 * var topLeft = view.center - [80, 80];
 * var bottomRight = view.center + [80, 80];
 *
 * // Create a rectangle shaped path between
 * // the topLeft and bottomRight points:
 * var path = new Path.Rectangle({
 *     topLeft: topLeft,
 *     bottomRight: bottomRight,
 *     // Fill the path with a gradient of three color stops
 *     // that runs between the two points we defined earlier:
 *     fillColor: {
 *         gradient: {
 *             stops: ['yellow', 'red', 'blue']
 *         },
 *         origin: topLeft,
 *         destination: bottomRight
 *     }
 * });
 *
 * @classexample {@paperscript height=300}
 * // Create a circle shaped path at the center of the view,
 * // using 40% of the height of the view as its radius
 * // and fill it with a radial gradient color:
 * var path = new Path.Circle({
 *     center: view.center,
 *     radius: view.bounds.height * 0.4
 * });
 *
 * // Fill the path with a radial gradient color with three stops:
 * // yellow from 0% to 5%, mix between red from 5% to 20%,
 * // mix between red and black from 20% to 100%:
 * path.fillColor = {
 *     gradient: {
 *         stops: [['yellow', 0.05], ['red', 0.2], ['black', 1]],
 *         radial: true
 *     },
 *     origin: path.position,
 *     destination: path.bounds.rightCenter
 * };
 */
var Gradient = Base.extend(/** @lends Gradient# */{
    _class: 'Gradient',

    // DOCS: Document #initialize()
    initialize: function Gradient(stops, radial) {
        // Use UID here since Gradients are exported through dictionary.add().
        this._id = UID.get();
        if (stops && Base.isPlainObject(stops)) {
            this.set(stops);
            // Erase arguments since we used the passed object instead.
            stops = radial = null;
        }
        // As these values might already have been set in the _set() call above,
        // only initialize them if that hasn't happened yet.
        if (this._stops == null) {
            this.setStops(stops || ['white', 'black']);
        }
        if (this._radial == null) {
            // Support old string type argument and new radial boolean.
            this.setRadial(typeof radial === 'string' && radial === 'radial'
                    || radial || false);
        }
    },

    _serialize: function(options, dictionary) {
        return dictionary.add(this, function() {
            return Base.serialize([this._stops, this._radial],
                    options, true, dictionary);
        });
    },

    /**
     * Called by various setters whenever a gradient value changes
     */
    _changed: function() {
        // Loop through the gradient-colors that use this gradient and notify
        // them, so they can notify the items they belong to.
        for (var i = 0, l = this._owners && this._owners.length; i < l; i++) {
            this._owners[i]._changed();
        }
    },

    /**
     * Called by Color#setGradient()
     * This is required to pass on _changed() notifications to the _owners.
     */
    _addOwner: function(color) {
        if (!this._owners)
            this._owners = [];
        this._owners.push(color);
    },

    /**
     * Called by Color whenever this gradient stops being used.
     */
    _removeOwner: function(color) {
        var index = this._owners ? this._owners.indexOf(color) : -1;
        if (index != -1) {
            this._owners.splice(index, 1);
            if (!this._owners.length)
                this._owners = undefined;
        }
    },

    /**
     * @return {Gradient} a copy of the gradient
     */
    clone: function() {
        var stops = [];
        for (var i = 0, l = this._stops.length; i < l; i++) {
            stops[i] = this._stops[i].clone();
        }
        return new Gradient(stops, this._radial);
    },

    /**
     * The gradient stops on the gradient ramp.
     *
     * @bean
     * @type GradientStop[]
     */
    getStops: function() {
        return this._stops;
    },

    setStops: function(stops) {
        if (stops.length < 2) {
            throw new Error(
                    'Gradient stop list needs to contain at least two stops.');
        }
        // If this gradient already contains stops, first remove their owner.
        var _stops = this._stops;
        if (_stops) {
            for (var i = 0, l = _stops.length; i < l; i++)
                _stops[i]._owner = undefined;
        }
        _stops = this._stops = GradientStop.readList(stops, 0, { clone: true });
        // Now assign this gradient as the new gradients' owner.
        for (var i = 0, l = _stops.length; i < l; i++)
            _stops[i]._owner = this;
        this._changed();
    },

    /**
     * Specifies whether the gradient is radial or linear.
     *
     * @bean
     * @type Boolean
     */
    getRadial: function() {
        return this._radial;
    },

    setRadial: function(radial) {
        this._radial = radial;
        this._changed();
    },

    /**
     * Checks whether the gradient is equal to the supplied gradient.
     *
     * @param {Gradient} gradient
     * @return {Boolean} {@true if they are equal}
     */
    equals: function(gradient) {
        if (gradient === this)
            return true;
        if (gradient && this._class === gradient._class) {
            var stops1 = this._stops,
                stops2 = gradient._stops,
                length = stops1.length;
            if (length === stops2.length) {
                for (var i = 0; i < length; i++) {
                    if (!stops1[i].equals(stops2[i]))
                        return false;
                }
                return true;
            }
        }
        return false;
    }
});
