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
    initialize: function CurveLocation(curve, parameter, point,
            _distance, _overlap, _intersection) {
        // Merge intersections very close to the end of a curve to the
        // beginning of the next curve.
        if (parameter >= 1 - /*#=*/Numerical.CURVETIME_EPSILON) {
            var next = curve.getNext();
            if (next) {
                parameter = 0;
                curve = next;
            }
        }
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
        this._distance = _distance;
        this._overlap = _overlap;
        this._intersection = _intersection;
        if (_intersection) {
            _intersection._intersection = this;
            // TODO: Remove this once debug logging is removed.
            _intersection._other = true;
        }
        this._segment = null; // To be determined, see #getSegment()
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
        return this._intersection;
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
    equals: function(loc, _ignoreIntersection) {
        return this === loc
            || loc instanceof CurveLocation
                // Call getCurve() and getParameter() to keep in sync
                && this.getCurve() === loc.getCurve()
                // Use the same tolerance for curve time parameter
                // comparisons as in Curve.js
                && Math.abs(this.getParameter() - loc.getParameter())
                    < /*#=*/Numerical.CURVETIME_EPSILON
                && (_ignoreIntersection
                    || (!this._intersection && !loc._intersection
                        || this._intersection && this._intersection.equals(
                                loc._intersection, true)))
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
            locations.sort(function compare(l1, l2) {
                var curve1 = l1._curve,
                    curve2 = l2._curve,
                    path1 = curve1._path,
                    path2 = curve2._path,
                    res;
                // Sort by path-id, curve, parameter, curve2, parameter2 so we
                // can easily remove duplicates with calls to equals() after.
                // NOTE: We don't call getCurve() / getParameter() here, since
                // this code is used internally in boolean operations where all
                // this information remains valid during processing.
                if (path1 === path2) {
                    if (curve1 === curve2) {
                        var diff = l1._parameter - l2._parameter;
                        if (Math.abs(diff) < /*#=*/Numerical.CURVETIME_EPSILON){
                            var i1 = l1._intersection,
                                i2 = l2._intersection,
                                curve21 = i1 && i1._curve,
                                curve22 = i2 && l2._curve;
                            res = curve21 === curve22 // equal or both null
                                ? i1 && i2 ? i1._parameter - i2._parameter : 0
                                : curve21 && curve22
                                    ? curve21.getIndex() - curve22.getIndex()
                                    : curve21 ? 1 : -1;
                        } else {
                            res = diff;
                        }
                    } else {
                        res = curve1.getIndex() - curve2.getIndex();
                    }
                } else {
                    // Sort by path id to group all locs on the same path.
                    res = path1._id - path2._id;
                }
                return res;
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
