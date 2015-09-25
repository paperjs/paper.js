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
     * @param {Point} [point]
     */
    initialize: function CurveLocation(curve, parameter, point, _curve2,
            _parameter2, _point2, _distance) {
        // Define this CurveLocation's unique id.
        // NOTE: We do not use the same pool as the rest of the library here,
        // since this is only required to be unique at runtime among other
        // CurveLocation objects.
        this._id = UID.get(CurveLocation);
        var path = curve._path;
        this._version = path ? path._version : 0;
        this._curve = curve;
        this._parameter = parameter;
        this._point = point || curve.getPointAt(parameter, true);
        this._curve2 = _curve2;
        this._parameter2 = _parameter2;
        this._point2 = _point2;
        this._distance = _distance;
        // Also store references to segment1 and segment2, in case path
        // splitting / dividing is going to happen, in which case the segments
        // can be used to determine the new curves, see #getCurve(true)
        this._segment1 = curve._segment1;
        this._segment2 = curve._segment2;
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
    getCurve: function() {
        var curve = this._curve,
            path = curve && curve._path;
        if (path && path._version !== this._version) {
            // If the path's segments have changed in the meantime, clear the
            // internal _parameter value and force refetching of the correct
            // curve again here.
            curve = null;
            this._parameter = null;
        }
        if (!curve) {
            // If we're asked to get the curve uncached, access current curve
            // objects through segment1 / segment2. Since path splitting or
            // dividing might have happened in the meantime, try segment1's
            // curve, and see if _point lies on it still, otherwise assume it's
            // the curve before segment2.
            curve = this._segment1.getCurve();
            if (curve.getParameterOf(this._point) == null)
                curve = this._segment2.getPrevious().getCurve();
            this._curve = curve;
            // Fetch path again as it could be on a new one through split()
            path = curve._path;
            this._version = path ? path._version : 0;
        }
        return curve;
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
     * The curve parameter, as used by various bezier curve calculations. It is
     * value between {@code 0} (beginning of the curve) and {@code 1} (end of
     * the curve).
     *
     * @type Number
     * @bean
     */
    getParameter: function() {
        var curve = this.getCurve(),
            parameter = this._parameter;
        return curve && parameter == null
            ? this._parameter = curve.getParameterOf(this._point)
            : parameter;
    },

    /**
     * The point which is defined by the {@link #curve} and
     * {@link #parameter}.
     *
     * @type Point
     * @bean
     */
    getPoint: function() {
        return this._point;
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
            // If we have the parameter on the other curve use that for
            // intersection rather than the point.
            this._intersection = intersection = new CurveLocation(this._curve2,
                    this._parameter2, this._point2 || this._point);
            intersection._overlap = this._overlap;
            intersection._intersection = this;
        }
        return intersection;
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
     * @see Curve#getNearestLocation(point)
     * @see Path#getNearestLocation(point)
     */
    getDistance: function() {
        return this._distance;
    },

    // DOCS: divide(), split()

    divide: function() {
        var curve = this.getCurve();
        return curve && curve.divide(this.getParameter(), true);
    },

    split: function() {
        var curve = this.getCurve();
        return curve && curve.split(this.getParameter(), true);
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
                || loc instanceof CurveLocation
                    // Call getCurve() and getParameter() to keep in sync
                    && this.getCurve() === loc.getCurve()
                    && abs(this.getParameter() - loc.getParameter()) < tolerance
                    // _curve2/_parameter2 are only used for Boolean operations
                    // and don't need syncing there.
                    // TODO: That's not quite true though... Rework this!
                    && this._curve2 === loc._curve2
                    && abs((this._parameter2 || 0) - (loc._parameter2 || 0))
                            < tolerance
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
    },

    statics: {
        sort: function(locations) {
            var tolerance = /*#=*/Numerical.TOLERANCE;
            locations.sort(function compare(l1, l2) {
                var curve1 = l1._curve,
                    curve2 = l2._curve,
                    path1 = curve1._path,
                    path2 = curve2._path;
                // Sort by path-id, curve, parameter, curve2, parameter2 so we
                // can easily remove duplicates with calls to equals() after.
                return path1 === path2
                    ? curve1 === curve2
                        ? Math.abs(l1._parameter - l2._parameter) < tolerance
                            ? l1._curve2 === l2._curve2
                                ? l1._parameter2 - l2._parameter2
                                : l1._curve2.getIndex() - l2._curve2.getIndex()
                            : l1._parameter - l2._parameter
                        : curve1.getIndex() - curve2.getIndex()
                    // Sort by path id to group all locs on the same path.
                    : path1._id - path2._id;
            });
        }
    }
}, Base.each(Curve.evaluateMethods, function(name) {
    // Produce getters for #getTangent() / #getNormal() / #getCurvature()
    if (name !== 'getPoint') {
        var get = name + 'At';
        this[name] = function() {
            var parameter = this.getParameter(),
                curve = this.getCurve();
            return parameter != null && curve && curve[get](parameter, true);
        };
    }
}, {}));
