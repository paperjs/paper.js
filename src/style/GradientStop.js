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
     * @param {Number} [rampPoint=0] the position of the stop on the gradient
     *                               ramp as a value between 0 and 1.
     */
    initialize: function GradientStop(arg0, arg1) {
        if (arg0) {
            var color, rampPoint;
            if (arg1 === undefined && Array.isArray(arg0)) {
                // [color, rampPoint]
                color = arg0[0];
                rampPoint = arg0[1];
            } else if (arg0.color) {
                // stop
                color = arg0.color;
                rampPoint = arg0.rampPoint;
            } else {
                // color, rampPoint
                color = arg0;
                rampPoint = arg1;
            }
            this.setColor(color);
            this.setRampPoint(rampPoint);
        }
    },

    // TODO: Do we really need to also clone the color here?
    /**
     * @return {GradientStop} a copy of the gradient-stop
     */
    clone: function() {
        return new GradientStop(this._color.clone(), this._rampPoint);
    },

    _serialize: function(options, dictionary) {
        return Base.serialize([this._color, this._rampPoint], options, true,
                dictionary);
    },

    /**
     * Called by various setters whenever a value changes
     */
    _changed: function() {
        // Loop through the gradients that use this stop and notify them about
        // the change, so they can notify their gradient colors, which in turn
        // will notify the items they are used in:
        if (this._owner)
            this._owner._changed(/*#=*/Change.STYLE);
    },

    /**
     * The ramp-point of the gradient stop as a value between {@code 0} and
     * {@code 1}.
     *
     * @type Number
     * @bean
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
     *     // Animate the rampPoint between 0.7 and 0.9:
     *     blackStop.rampPoint = Math.sin(event.time * 5) * 0.1 + 0.8;
     *
     *     // Animate the rampPoint between 0.2 and 0.4
     *     var redStop = gradient.stops[1];
     *     redStop.rampPoint = Math.sin(event.time * 3) * 0.1 + 0.3;
     * }
     */
    getRampPoint: function() {
        return this._rampPoint;
    },

    setRampPoint: function(rampPoint) {
        this._defaultRamp = rampPoint == null;
        this._rampPoint = rampPoint || 0;
        this._changed();
    },

    /**
     * The color of the gradient stop.
     *
     * @type Color
     * @bean
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
     *     // Animate the rampPoint between 0.7 and 0.9:
     *     blackStop.rampPoint = Math.sin(event.time * 5) * 0.1 + 0.8;
     *
     *     // Animate the rampPoint between 0.2 and 0.4
     *     redStop.rampPoint = Math.sin(event.time * 3) * 0.1 + 0.3;
     * }
     */
    getColor: function() {
        return this._color;
    },

    setColor: function(color) {
        // Make sure newly set colors are cloned, since they can only have
        // one owner.
        this._color = Color.read(arguments);
        if (this._color === color)
            this._color = color.clone();
        this._color._owner = this;
        this._changed();
    },

    equals: function(stop) {
        return stop === this || stop && this._class === stop._class
                && this._color.equals(stop._color)
                && this._rampPoint == stop._rampPoint
                || false;
    }
});
