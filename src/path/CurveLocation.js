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
 * @class CurveLocation objects describe a location on {@link Curve} objects,
 * as defined by the curve-time {@link #parameter}, a value between {@code 0}
 * (beginning of the curve) and {@code 1} (end of the curve). If the curve is
 * part of a {@link Path} item, its {@link #index} inside the
 * {@link Path#curves} array is also provided.
 *
 * The class is in use in many places, such as
 * {@link Path#getLocationAt(offset)},
 * {@link Path#getLocationOf(point)},
 * {@link Path#getNearestLocation(point)},
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
            _overlap, _distance) {
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
        this._setCurve(curve);
        this._parameter = parameter;
        this._point = point || curve.getPointAt(parameter, true);
        this._overlap = _overlap;
        this._distance = _distance;
        this._intersection = null;
    },

    _setCurve: function(curve) {
        var path = curve._path;
        this._version = path ? path._version : 0;
        this._curve = curve;
        this._segment = null; // To be determined, see #getSegment()
        // Also store references to segment1 and segment2, in case path
        // splitting / dividing is going to happen, in which case the segments
        // can be used to determine the new curves, see #getCurve(true)
        this._segment1 = curve._segment1;
        this._segment2 = curve._segment2;
    },

    _setSegment: function(segment) {
        this._setCurve(segment.getCurve());
        this._segment = segment;
        this._parameter = segment === this._segment1 ? 0 : 1;
    },

    /**
     * The segment of the curve which is closer to the described location.
     *
     * @type Segment
     * @bean
     */
    getSegment: function() {
        // Request curve first, so _segment gets invalidated if it's out of sync
        var curve = this.getCurve(),
            segment = this._segment;
        if (!segment) {
            var parameter = this.getParameter();
            if (parameter === 0) {
                segment = curve._segment1;
            } else if (parameter === 1) {
                segment = curve._segment2;
            } else if (parameter != null) {
                // Determine the closest segment by comparing curve lengths
                segment = curve.getPartLength(0, parameter)
                    < curve.getPartLength(parameter, 1)
                        ? curve._segment1
                        : curve._segment2;
            }
            this._segment = segment;
        }
        return segment;
    },

    /**
     * The curve that this location belongs to.
     *
     * @type Curve
     * @bean
     */
    getCurve: function() {
        var curve = this._curve,
            path = curve && curve._path,
            that = this;
        if (path && path._version !== this._version) {
            // If the path's segments have changed in the meantime, clear the
            // internal _parameter value and force refetching of the correct
            // curve again here.
            curve = this._parameter = this._curve = null;
        }

        // If path is out of sync, access current curve objects through segment1
        // / segment2. Since path splitting or dividing might have happened in
        // the meantime, try segment1's curve, and see if _point lies on it
        // still, otherwise assume it's the curve before segment2.
        function trySegment(segment) {
            var curve = segment && segment.getCurve();
            if (curve && (that._parameter = curve.getParameterOf(that._point))
                    != null) {
                // Fetch path again as it could be on a new one through split()
                that._setCurve(curve);
                that._segment = segment;
                return curve;
            }
        }

        return curve
            || trySegment(this._segment)
            || trySegment(this._segment1)
            || trySegment(this._segment2.getPrevious());
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
     * The index of the {@link #curve} within the {@link Path#curves} list, if
     * it is part of a {@link Path} item.
     *
     * @type Index
     * @bean
     */
    getIndex: function() {
        var curve = this.getCurve();
        return curve && curve.getIndex();
    },

    /**
     * The curve-time parameter, as used by various bezier curve calculations.
     * It is value between {@code 0} (beginning of the curve) and {@code 1}
     * (end of the curve).
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
     * The {@link #curve}'s {@link #index} and {@link #parameter} added to one
     * value that can conveniently be used for sorting and comparing of
     * locations.
     *
     * @type Number
     * @bean
     * @private
     */
    getIndexParameter: function() {
        return this.getIndex() + this.getParameter();
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
     * @name CurveLocation#getTangent
     * @type Point
     * @bean
     */

    /**
     * The normal vector to the {@link #curve} at the given location.
     *
     * @name CurveLocation#getNormal
     * @type Point
     * @bean
     */

    /**
     * The curvature of the {@link #curve} at the given location.
     *
     * @name CurveLocation#getCurvature
     * @type Number
     * @bean
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
    equals: function(loc, _ignoreOther) {
        // NOTE: We need to compare both by getIndexParameter() and by proximity
        // of points, see:
        // https://github.com/paperjs/paper.js/issues/784#issuecomment-143161586
        // Use a relaxed threshold of < 1 for getIndexParameter() difference
        // when deciding if two locations should be checked for point proximity.
        // This is necessary to catch equal locations on very small curves.
        var diff;
        return this === loc
            || loc instanceof CurveLocation
                && this.getPath() === loc.getPath()
                && ((diff = Math.abs(
                        this.getIndexParameter() - loc.getIndexParameter()))
                        < /*#=*/Numerical.CURVETIME_EPSILON
                    || diff < 1 && this.getPoint().isClose(loc.getPoint(),
                        /*#=*/Numerical.GEOMETRIC_EPSILON))
                && (_ignoreOther
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


    /**
     * {@grouptitle Tests}
     * Checks if the location is an intersection with another curve and is
     * merely touching the other curve, as opposed to crossing it.
     *
     * @return {Boolean} {@true if the location is an intersection that is
     * merely touching another curve}
     * @see #isCrossing()
     */
    isTouching: function() {
        var t1 = this.getTangent(),
            inter = this._intersection,
            t2 = inter && inter.getTangent();
        return t1 && t2 ? t1.isCollinear(t2) : false;
    },

    /**
     * Checks if the location is an intersection with another curve and is
     * crossing the other curve, as opposed to just touching it.
     *
     * @return {Boolean} {@true if the location is an intersection that is
     * crossing another curve}
     * @see #isTouching()
     */
    isCrossing: function(_report) {
        // Implementation based on work by Andy Finnell:
        // http://losingfight.com/blog/2011/07/09/how-to-implement-boolean-operations-on-bezier-paths-part-3/
        // https://bitbucket.org/andyfinnell/vectorboolean
        var inter = this._intersection;
        if (!inter)
            return false;
        // TODO: Make getCurve() and getParameter() sync work in boolean ops
        // before and after splitting!!!
        var t1 = this._parameter,
            t2 = inter._parameter,
            tMin = /*#=*/Numerical.CURVETIME_EPSILON,
            tMax = 1 - tMin;
        // If the intersection is in the middle of the path, it is either a
        // tangent or a crossing, no need for the detailed corner check below.
        // But we do need a check for the edge case of tangents?
        if (t1 >= tMin && t1 <= tMax || t2 >= tMin && t2 <= tMax)
            return !this.isTouching();
        // Values for getTangentAt() that are almost 0 and 1.
        // NOTE: Even though getTangentAt() has code to support 0 and 1 instead
        // of tMin and tMax, we still need to use this instead, as other issues
        // emerge from switching to 0 and 1 in edge cases.
        // NOTE: VectorBoolean has code that slowly shifts these points inwards
        // until the resulting tangents are not ambiguous. Do we need this too?
        var c2 = this._curve,
            c1 = c2.getPrevious(),
            c4 = inter._curve,
            c3 = c4.getPrevious(),
            PI = Math.PI;
        if (!c1 || !c3)
            return false;

        if (_report) {
            new Path.Circle({
                center: this.getPoint(),
                radius: 10,
                strokeColor: 'red'
            });
            new Path({
                segments: [c1.getSegment1(), c1.getSegment2(), c2.getSegment2()],
                strokeColor: 'red',
                strokeWidth: 4
            });
            new Path({
                segments: [c3.getSegment1(), c3.getSegment2(), c4.getSegment2()],
                strokeColor: 'orange',
                strokeWidth: 4
            });
        }

        function isInRange(angle, min, max) {
            return min < max
                ? angle > min && angle < max
                // The range wraps around -PI / PI:
                : angle > min && angle <= PI || angle >= -PI && angle < max;
        }

        // Calculate angles for all four tangents at the intersection point
        var a1 = c1.getTangentAt(tMax, true).negate().getAngleInRadians(),
            a2 = c2.getTangentAt(tMin, true).getAngleInRadians(),
            a3 = c3.getTangentAt(tMax, true).negate().getAngleInRadians(),
            a4 = c4.getTangentAt(tMin, true).getAngleInRadians();

        // Count how many times curve2 angles appear between the curve1 angles
        // If each pair of angles split the other two, then the edges cross.
        return (isInRange(a3, a1, a2) ^ isInRange(a4, a1, a2))
            && (isInRange(a3, a2, a1) ^ isInRange(a4, a2, a1));
    },

    /**
     * Checks if the location is an intersection with another curve and is
     * part of an overlap between the two involved paths.
     *
     * @return {Boolean} {@true if the location is an intersection that is
     * part of an overlap between the two involved paths}
     * @see #isCrossing()
     * @see #isTouching()
     */
    isOverlap: function() {
        return this._overlap;
    },

    statics: {
        add: function(locations, loc, merge) {
            // Insert-sort by path-id, curve, parameter so we can easily merge
            // duplicates with calls to equals() after.
            // NOTE: We don't call getCurve() / getParameter() here, since this
            // code is used internally in boolean operations where all this
            // information remains valid during processing.
            var length = locations.length,
                l = 0,
                r = length - 1,
                abs = Math.abs;

            function compare(loc1, loc2) {
                var path1 = loc1.getPath(),
                    path2 = loc2.getPath();
                return path1 === path2
                        ? loc1.getIndexParameter() - loc2.getIndexParameter()
                        // Sort by path id to group all locs on same path.
                        : path1._id - path2._id;
            }

            function search(start, dir) {
                for (var i = start + dir; i >= 0 && i < length; i += dir) {
                    var loc2 = locations[i];
                    // See #equals() for details of why `>= 1` is used here.
                    if (abs(compare(loc, loc2)) >= 1)
                        return null;
                    if (loc.equals(loc2))
                        return loc2;
                }
            }

            while (l <= r) {
                var m = (l + r) >>> 1,
                    loc2 = locations[m],
                    diff = compare(loc, loc2);
                // Only compare location with equals() if diff is < 1.
                // See #equals() for details of why `< 1` is used here.
                // NOTE: equals() takes the intersection location into account,
                // while the above calculation of diff doesn't!
                if (merge && abs(diff) < 1) {
                    // See if the two locations are actually the same, and merge
                    // if they are. If they aren't, we're not done yet since
                    // all neighbors with a diff < 1 are potential merge
                    // candidates, so check them too (see #search() for details)
                    if (loc2 = loc.equals(loc2) ? loc2
                            : search(m, -1) || search(m, 1)) {
                        // Carry over overlap setting!
                        if (loc._overlap) {
                            loc2._overlap = loc2._intersection._overlap = true;
                        }
                        // We're done, don't insert, merge with the found
                        // location instead:
                        return loc2;
                    }
                }
                if (diff < 0) {
                    r = m - 1;
                } else {
                    l = m + 1;
                }
            }
            // We didn't merge with a preexisting location, insert it now.
            locations.splice(l, 0, loc);
            return loc;
        },

        expand: function(locations) {
            // Create a copy since add() keeps modifying the array and inserting
            // at sorted indices.
            var expanded = locations.slice();
            for (var i = 0, l = locations.length; i < l; i++) {
                this.add(expanded, locations[i]._intersection, false);
            }
            return expanded;
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
