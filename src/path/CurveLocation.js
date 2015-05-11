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

/**
 * @name CurveLocation
 *
 * @class CurveLocation objects describe a location on {@link Curve}
 * objects, as defined by the curve {@link #parameter}, a value between
 * {@code 0} (beginning of the curve) and {@code 1} (end of the curve). If
 * the curve is part of a {@link Path} item, its {@link #index} inside the
 * {@link Path#curves} array is also provided.
 *
 * The class is in use in many places, such as
 * {@link Path#getLocationAt(offset, isParameter)},
 * {@link Path#getLocationOf(point)},
 * {@link Path#getNearestLocation(point),
 * {@link PathItem#getIntersections(path)},
 * etc.
 */
var CurveLocation = Base.extend(/** @lends CurveLocation# */{
    _class: 'CurveLocation',
    // Enforce creation of beans, as bean getters have hidden parameters.
    // See #getSegment() below.
    beans: true,

    // DOCS: CurveLocation class description: add these back when the  mentioned
    // functioned have been added: {@link Path#split(location)}
    /**
     * Creates a new CurveLocation object.
     *
     * @param {Curve} curve
     * @param {Number} parameter
     * @param {Point} point
     */
    initialize: function CurveLocation(curve, parameter, point, _curve2,
            _parameter2, _point2, _distance) {
        // Define this CurveLocation's unique id.
        // NOTE: We do not use the same pool as the rest of the library here,
        // since this is only required to be unique at runtime among other
        // CurveLocation objects.
        this._id = CurveLocation._id = (CurveLocation._id || 0) + 1;
        this._curve = curve;
        // Also store references to segment1 and segment2, in case path
        // splitting / dividing is going to happen, in which case the segments
        // can be used to determine the new curves, see #getCurve(true)
        this._segment1 = curve._segment1;
        this._segment2 = curve._segment2;
        this._parameter = parameter;
        this._point = point;
        this._curve2 = _curve2;
        this._parameter2 = _parameter2;
        this._point2 = _point2;
        this._distance = _distance;
    },

    /**
     * The segment of the curve which is closer to the described location.
     *
     * @type Segment
     * @bean
     */
    getSegment: function(_preferFirst) {
        if (!this._segment) {
            var curve = this.getCurve(),
                parameter = this.getParameter();
            if (parameter === 1) {
                this._segment = curve._segment2;
            } else if (parameter === 0 || _preferFirst) {
                this._segment = curve._segment1;
            } else if (parameter == null) {
                return null;
            } else {
                // Determine the closest segment by comparing curve lengths
                this._segment = curve.getPartLength(0, parameter)
                    < curve.getPartLength(parameter, 1)
                        ? curve._segment1
                        : curve._segment2;
            }
        }
        return this._segment;
    },

    /**
     * The curve that this location belongs to.
     *
     * @type Curve
     * @bean
     */
    getCurve: function(_uncached) {
        if (!this._curve || _uncached) {
            // If we're asked to get the curve uncached, access current curve
            // objects through segment1 / segment2. Since path splitting or
            // dividing might have happened in the meantime, try segment1's
            // curve, and see if _point lies on it still, otherwise assume it's
            // the curve before segment2.
            this._curve = this._segment1.getCurve();
            if (this._curve.getParameterOf(this._point) == null)
                this._curve = this._segment2.getPrevious().getCurve();
        }
        return this._curve;
    },

    /**
     * The curve location on the intersecting curve, if this location is the
     * result of a call to {@link PathItem#getIntersections(path)} /
     * {@link Curve#getIntersections(curve)}.
     *
     * @type CurveLocation
     * @bean
     */
    getIntersection: function() {
        var intersection = this._intersection;
        if (!intersection && this._curve2) {
            var param = this._parameter2;
            // If we have the parameter on the other curve use that for
            // intersection rather than the point.
            this._intersection = intersection = new CurveLocation(
                    this._curve2, param, this._point2 || this._point, this);
            intersection._intersection = this;
        }
        return intersection;
    },

    /**
     * The path this curve belongs to, if any.
     *
     * @type Item
     * @bean
     */
    getPath: function() {
        var curve = this.getCurve();
        return curve && curve._path;
    },

    /**
     * The index of the curve within the {@link Path#curves} list, if the
     * curve is part of a {@link Path} item.
     *
     * @type Index
     * @bean
     */
    getIndex: function() {
        var curve = this.getCurve();
        return curve && curve.getIndex();
    },

    /**
     * The length of the path from its beginning up to the location described
     * by this object. If the curve is not part of a path, then the length
     * within the curve is returned instead.
     *
     * @type Number
     * @bean
     */
    getOffset: function() {
        var path = this.getPath();
        return path ? path._getOffset(this) : this.getCurveOffset();
    },

    /**
     * The length of the curve from its beginning up to the location described
     * by this object.
     *
     * @type Number
     * @bean
     */
    getCurveOffset: function() {
        var curve = this.getCurve(),
            parameter = this.getParameter();
        return parameter != null && curve && curve.getPartLength(0, parameter);
    },

    /**
     * The curve parameter, as used by various bezier curve calculations. It is
     * value between {@code 0} (beginning of the curve) and {@code 1} (end of
     * the curve).
     *
     * @type Number
     * @bean
     */
    getParameter: function(_uncached) {
        if ((this._parameter == null || _uncached) && this._point) {
            var curve = this.getCurve(_uncached);
            this._parameter = curve && curve.getParameterOf(this._point);
        }
        return this._parameter;
    },

    /**
     * The point which is defined by the {@link #curve} and
     * {@link #parameter}.
     *
     * @type Point
     * @bean
     */
    getPoint: function(_uncached) {
        if ((!this._point || _uncached) && this._parameter != null) {
            var curve = this.getCurve(_uncached);
            this._point = curve && curve.getPointAt(this._parameter, true);
        }
        return this._point;
    },

    /**
     * The tangential vector to the {@link #curve} at the given location.
     *
     * @name Item#tangent
     * @type Point
     */

    /**
     * The normal vector to the {@link #curve} at the given location.
     *
     * @name Item#normal
     * @type Point
     */

    /**
     * The curvature of the {@link #curve} at the given location.
     *
     * @name Item#curvature
     * @type Number
     */

    /**
     * The distance from the queried point to the returned location.
     *
     * @type Number
     * @bean
     */
    getDistance: function() {
        return this._distance;
    },

    divide: function() {
        var curve = this.getCurve(true);
        return curve && curve.divide(this.getParameter(true), true);
    },

    split: function() {
        var curve = this.getCurve(true);
        return curve && curve.split(this.getParameter(true), true);
    },

    /**
     * Checks whether tow CurveLocation objects are describing the same location
     * on a path, by applying the same tolerances as elsewhere when dealing with
     * curve time parameters.
     *
     * @param {CurveLocation} location
     * @return {Boolean} {@true if the locations are equal}
     */
    equals: function(loc) {
        var abs = Math.abs,
            // Use the same tolerance for curve time parameter comparisons as
            // in Curve.js when considering two locations the same.
            tolerance = /*#=*/Numerical.TOLERANCE;
        return this === loc
                || loc
                    && this._curve === loc._curve
                    && this._curve2 === loc._curve2
                    && abs(this._parameter - loc._parameter) <= tolerance
                    && abs(this._parameter2 - loc._parameter2) <= tolerance
                || false;
    },

    /**
     * @return {String} a string representation of the curve location
     */
    toString: function() {
        var parts = [],
            point = this.getPoint(),
            f = Formatter.instance;
        if (point)
            parts.push('point: ' + point);
        var index = this.getIndex();
        if (index != null)
            parts.push('index: ' + index);
        var parameter = this.getParameter();
        if (parameter != null)
            parts.push('parameter: ' + f.number(parameter));
        if (this._distance != null)
            parts.push('distance: ' + f.number(this._distance));
        return '{ ' + parts.join(', ') + ' }';
    }
}, Base.each(['getTangent', 'getNormal', 'getCurvature'], function(name) {
    // Produce getters for #getTangent() / #getNormal() / #getCurvature()
    var get = name + 'At';
    this[name] = function() {
        var parameter = this.getParameter(),
            curve = this.getCurve();
        return parameter != null && curve && curve[get](parameter, true);
    };
}, {}));
