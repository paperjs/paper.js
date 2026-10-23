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
 * @name StrokeProfileStop
 *
 * @class A stop of the stroke profile of a path, see
 * {@link Path#strokeProfile}: the pen that draws its stroke at an offset along
 * the path, an ellipse with a width, an aspect and an angle. Between the
 * stops, each of them changes along the path, easing into and out of smooth
 * stops and in straight lines from the others, see {@link #smooth}. A stop can set
 * only some of them, and leave the others to the stops around it.
 */
var StrokeProfileStop = Base.extend(/** @lends StrokeProfileStop# */{
    _class: 'StrokeProfileStop',
    // JSON writes the stops of paths as plain objects:
    _compactSerialize: true,

    /**
     * Creates a stroke profile stop.
     *
     * @param {Object} [object] the properties of the stop, its `offset`,
     *     `width`, `aspect`, `angle` and `smooth`
     *
     * @example
     * var path = new Path.Line([20, 50], [180, 50]);
     * path.strokeColor = 'black';
     * path.strokeWidth = 10;
     * path.strokeProfile = [
     *     new StrokeProfileStop({ offset: 0, width: 0.5 }),
     *     new StrokeProfileStop({ offset: 160, width: 2 })
     * ];
     */
    initialize: function StrokeProfileStop(props) {
        props = props || {};
        this._path = null;
        // The index of the segment before the stop plus the fraction of the
        // arc length to the next segment, once the stop is on a path. JSON
        // stores it instead of the offset, see Path#strokeProfile:
        this._index = props.index != null ? props.index : null;
        this._offset = props.offset || 0;
        // The values that the stop doesn't set are null:
        this._width = props.width != null ? props.width : null;
        this._aspect = props.aspect != null ? props.aspect : null;
        this._angle = props.angle != null ? props.angle : null;
        this._smooth = props.smooth !== false;
    },

    /**
     * @return {StrokeProfileStop} a copy of the stop, without a path
     */
    clone: function() {
        return new StrokeProfileStop({
            offset: this.getOffset(),
            width: this._width,
            aspect: this._aspect,
            angle: this._angle,
            smooth: this._smooth
        });
    },

    _serialize: function(options, dictionary) {
        var props = { index: this._index };
        ['width', 'aspect', 'angle'].forEach(function(key) {
            var value = this['_' + key];
            if (value != null)
                props[key] = value;
        }, this);
        if (!this._smooth)
            props.smooth = false;
        return Base.serialize(props, options, true, dictionary);
    },

    _changed: function() {
        if (this._path)
            this._path._changed(/*#=*/Change.STROKE);
    },

    /**
     * The path whose stroke profile the stop is part of.
     *
     * @bean
     * @type ?Path
     */
    getPath: function() {
        return this._path;
    },

    /**
     * The offset of the stop along its path, as in
     * {@link Path#getPointAt(offset)}. Unlike the offset of gradient stops, it
     * is a length, not a fraction. The stop stays between the same segments
     * when they move, so its offset changes with the lengths of the curves
     * before it.
     *
     * @bean
     * @type Number
     */
    getOffset: function() {
        var path = this._path;
        return path ? path._getOffsetAtIndex(this._index) : this._offset;
    },

    setOffset: function(offset) {
        var path = this._path;
        if (path) {
            this._index = path._getIndexAt(offset);
            path._sortStrokeProfile();
            this._changed();
        } else {
            this._offset = offset;
        }
    },

    /**
     * The width of the pen at the stop, as a factor of the path's
     * {@link Style#strokeWidth}: `1` for the stroke width, `2` for twice
     * as wide. Stops without a width leave it to the stops around them, and
     * without any, it is `1`.
     *
     * @bean
     * @type ?Number
     */
    getWidth: function() {
        return this._width;
    },

    setWidth: function(width) {
        this._width = width;
        this._changed();
    },

    /**
     * The aspect of the pen at the stop: its height as a factor of its width,
     * `1` for a round pen, less for a flat nib. Stops without an aspect leave
     * it to the stops around them, and without any, it is `1`.
     *
     * @bean
     * @type ?Number
     */
    getAspect: function() {
        return this._aspect;
    },

    setAspect: function(aspect) {
        this._aspect = aspect;
        this._changed();
    },

    /**
     * The angle of the pen at the stop, in degrees, in the path's coordinates.
     * Angles aren't wrapped: from `0` at one stop to `720` at the next, the
     * pen turns twice. Stops without an angle leave it to the stops around
     * them, and without any, it is `0`.
     *
     * @bean
     * @type ?Number
     */
    getAngle: function() {
        return this._angle;
    },

    setAngle: function(angle) {
        this._angle = angle;
        this._changed();
    },

    /**
     * Whether the values ease into and out of the stop: they arrive at it and
     * leave it flat, and between two smooth stops, a value follows a cubic
     * from one to the other, without overshooting them. As the slopes don't
     * depend on other stops, changing a stop only changes the values up to the
     * stops on either side of it. Without smoothing, the values change in
     * straight lines to the stops on either side.
     *
     * @bean
     * @type Boolean
     * @default true
     */
    isSmooth: function() {
        return this._smooth;
    },

    setSmooth: function(smooth) {
        this._smooth = !!smooth;
        this._changed();
    },

    /**
     * Checks whether the stop is equal to the supplied one.
     *
     * @param {StrokeProfileStop} stop
     * @return {Boolean} {@true if they are equal}
     */
    equals: function(stop) {
        return stop === this || stop instanceof StrokeProfileStop
                && this._width === stop._width
                && this._aspect === stop._aspect
                && this._angle === stop._angle
                && this._smooth === stop._smooth
                && (this._path
                    ? this._index === stop._index
                    : this._offset === stop._offset)
                || false;
    }
});
