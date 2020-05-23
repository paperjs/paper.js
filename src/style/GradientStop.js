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

// TODO: Support midPoint? (initial tests didn't look nice)
/**
 * @name GradientStop
 *
 * @class The GradientStop object.
 */
var GradientStop = Base.extend(/** @lends GradientStop# */{
    _class: 'GradientStop',

    /**
     * Creates a GradientStop object.
     *
     * @param {Color} [color=new Color(0, 0, 0)] the color of the stop
     * @param {Number} [offset=null] the position of the stop on the gradient
     * ramp as a value between `0` and `1`; `null` or `undefined` for automatic
     * assignment.
     */
    initialize: function GradientStop(arg0, arg1) {
        // (color, offset)
        var color = arg0,
            offset = arg1;
        if (typeof arg0 === 'object' && arg1 === undefined) {
            // Make sure the first entry in the array is not a number, in which
            // case the whole array would be a color, and the assignments would
            // already have occurred correctly above.
            if (Array.isArray(arg0) && typeof arg0[0] !== 'number') {
                // ([color, offset])
                color = arg0[0];
                offset = arg0[1];
            } else if ('color' in arg0 || 'offset' in arg0
                    || 'rampPoint' in arg0) {
                // (stop)
                color = arg0.color;
                offset = arg0.offset || arg0.rampPoint || 0;
            }
        }
        this.setColor(color);
        this.setOffset(offset);
    },

    // TODO: Do we really need to also clone the color here?
    /**
     * @return {GradientStop} a copy of the gradient-stop
     */
    clone: function() {
        return new GradientStop(this._color.clone(), this._offset);
    },

    _serialize: function(options, dictionary) {
        var color = this._color,
            offset = this._offset;
        return Base.serialize(offset == null ? [color] : [color, offset],
                options, true, dictionary);
    },

    /**
     * Called by various setters whenever a value changes
     */
    _changed: function() {
        // Notify the graident that uses this stop about the change, so it can
        // notify its gradient colors, which in turn will notify the items they
        // are used in:
        if (this._owner)
            this._owner._changed(/*#=*/Change.STYLE);
    },

    /**
     * The ramp-point of the gradient stop as a value between `0` and `1`.
     *
     * @bean
     * @type Number
     *
     * @example {@paperscript height=300}
     * // Animating a gradient's ramp points:
     *
     * // Create a circle shaped path at the center of the view,
     * // using 40% of the height of the view as its radius
     * // and fill it with a radial gradient color:
     * var path = new Path.Circle({
     *     center: view.center,
     *     radius: view.bounds.height * 0.4
     * });
     *
     * path.fillColor = {
     *     gradient: {
     *         stops: [['yellow', 0.05], ['red', 0.2], ['black', 1]],
     *         radial: true
     *     },
     *     origin: path.position,
     *     destination: path.bounds.rightCenter
     * };
     *
     * var gradient = path.fillColor.gradient;
     *
     * // This function is called each frame of the animation:
     * function onFrame(event) {
     *     var blackStop = gradient.stops[2];
     *     // Animate the offset between 0.7 and 0.9:
     *     blackStop.offset = Math.sin(event.time * 5) * 0.1 + 0.8;
     *
     *     // Animate the offset between 0.2 and 0.4
     *     var redStop = gradient.stops[1];
     *     redStop.offset = Math.sin(event.time * 3) * 0.1 + 0.3;
     * }
     */
    getOffset: function() {
        return this._offset;
    },

    setOffset: function(offset) {
        this._offset = offset;
        this._changed();
    },

    /**
     * @private
     * @bean
     * @deprecated use {@link #offset} instead.
     */
    getRampPoint: '#getOffset',
    setRampPoint: '#setOffset',

    /**
     * The color of the gradient stop.
     *
     * @bean
     * @type Color
     *
     * @example {@paperscript height=300}
     * // Animating a gradient's ramp points:
     *
     * // Create a circle shaped path at the center of the view,
     * // using 40% of the height of the view as its radius
     * // and fill it with a radial gradient color:
     * var path = new Path.Circle({
     *     center: view.center,
     *     radius: view.bounds.height * 0.4
     * });
     *
     * path.fillColor = {
     *     gradient: {
     *         stops: [['yellow', 0.05], ['red', 0.2], ['black', 1]],
     *         radial: true
     *     },
     *     origin: path.position,
     *     destination: path.bounds.rightCenter
     * };
     *
     * var redStop = path.fillColor.gradient.stops[1];
     * var blackStop = path.fillColor.gradient.stops[2];
     *
     * // This function is called each frame of the animation:
     * function onFrame(event) {
     *     // Animate the offset between 0.7 and 0.9:
     *     blackStop.offset = Math.sin(event.time * 5) * 0.1 + 0.8;
     *
     *     // Animate the offset between 0.2 and 0.4
     *     redStop.offset = Math.sin(event.time * 3) * 0.1 + 0.3;
     * }
     */
    getColor: function() {
        return this._color;
    },

    setColor: function(/* color */) {
        // Clear old color owner before setting new one:
        Color._setOwner(this._color, null);
        this._color = Color._setOwner(Color.read(arguments, 0), this,
                'setColor');
        this._changed();
    },

    equals: function(stop) {
        return stop === this || stop && this._class === stop._class
                && this._color.equals(stop._color)
                && this._offset == stop._offset
                || false;
    }
});
