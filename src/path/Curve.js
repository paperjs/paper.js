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
 * @name Curve
 *
 * @class The Curve object represents the parts of a path that are connected by
 * two following {@link Segment} objects. The curves of a path can be accessed
 * through its {@link Path#curves} array.
 *
 * While a segment describe the anchor point and its incoming and outgoing
 * handles, a Curve object describes the curve passing between two such
 * segments. Curves and segments represent two different ways of looking at the
 * same thing, but focusing on different aspects. Curves for example offer many
 * convenient ways to work with parts of the path, finding lengths, positions or
 * tangents at given offsets.
 */
var Curve = Base.extend(/** @lends Curve# */{
    _class: 'Curve',
    // Enforce creation of beans, as some bean getters have hidden parameters.
    // See #getValues() below.
    beans: true,

    /**
     * Creates a new curve object.
     *
     * @name Curve#initialize
     * @param {Segment} segment1
     * @param {Segment} segment2
     */
    /**
     * Creates a new curve object.
     *
     * @name Curve#initialize
     * @param {Point} point1
     * @param {Point} handle1
     * @param {Point} handle2
     * @param {Point} point2
     */
    /**
     * Creates a new curve object.
     *
     * @name Curve#initialize
     * @ignore
     * @param {Number} x1
     * @param {Number} y1
     * @param {Number} handle1x
     * @param {Number} handle1y
     * @param {Number} handle2x
     * @param {Number} handle2y
     * @param {Number} x2
     * @param {Number} y2
     */
    initialize: function Curve(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7) {
        var count = arguments.length,
            seg1, seg2,
            point1, point2,
            handle1, handle2;
        // The following code has to either set seg1 & seg2,
        // or point1, point2, handle1 & handle2. At the end, the internal
        // segments are created accordingly.
        if (count === 3) {
            // Undocumented internal constructor, used by Path#getCurves()
            // new Segment(path, segment1, segment2);
            this._path = arg0;
            seg1 = arg1;
            seg2 = arg2;
        } else if (!count) {
            seg1 = new Segment();
            seg2 = new Segment();
        } else if (count === 1) {
            // new Segment(segment);
            // NOTE: This copies from existing segments through bean getters
            if ('segment1' in arg0) {
                seg1 = new Segment(arg0.segment1);
                seg2 = new Segment(arg0.segment2);
            } else if ('point1' in arg0) {
                // As printed by #toString()
                point1 = arg0.point1;
                handle1 = arg0.handle1;
                handle2 = arg0.handle2;
                point2 = arg0.point2;
            } else if (Array.isArray(arg0)) {
                // Convert getValues() array back to points and handles so we
                // can create segments for those.
                point1 = [arg0[0], arg0[1]];
                point2 = [arg0[6], arg0[7]];
                handle1 = [arg0[2] - arg0[0], arg0[3] - arg0[1]];
                handle2 = [arg0[4] - arg0[6], arg0[5] - arg0[7]];
            }
        } else if (count === 2) {
            // new Segment(segment1, segment2);
            seg1 = new Segment(arg0);
            seg2 = new Segment(arg1);
        } else if (count === 4) {
            point1 = arg0;
            handle1 = arg1;
            handle2 = arg2;
            point2 = arg3;
        } else if (count === 8) {
            // Convert getValues() array from arguments list back to points and
            // handles so we can create segments for those.
            // NOTE: This could be merged with the above code after the array
            // check through the `arguments` object, but it would break JS
            // optimizations.
            point1 = [arg0, arg1];
            point2 = [arg6, arg7];
            handle1 = [arg2 - arg0, arg3 - arg1];
            handle2 = [arg4 - arg6, arg5 - arg7];
        }
        this._segment1 = seg1 || new Segment(point1, null, handle1);
        this._segment2 = seg2 || new Segment(point2, handle2, null);
    },

    _serialize: function(options, dictionary) {
        // If it has no handles, only serialize points, otherwise handles too.
        return Base.serialize(this.hasHandles()
                ? [this.getPoint1(), this.getHandle1(), this.getHandle2(),
                    this.getPoint2()]
                : [this.getPoint1(), this.getPoint2()],
                options, true, dictionary);
    },

    _changed: function() {
        // Clear cached values.
        this._length = this._bounds = undefined;
    },

    /**
     * Returns a copy of the curve.
     *
     * @return {Curve}
     */
    clone: function() {
        return new Curve(this._segment1, this._segment2);
    },

    /**
     * @return {String} a string representation of the curve
     */
    toString: function() {
        var parts = [ 'point1: ' + this._segment1._point ];
        if (!this._segment1._handleOut.isZero())
            parts.push('handle1: ' + this._segment1._handleOut);
        if (!this._segment2._handleIn.isZero())
            parts.push('handle2: ' + this._segment2._handleIn);
        parts.push('point2: ' + this._segment2._point);
        return '{ ' + parts.join(', ') + ' }';
    },

    /**
     * Determines the type of cubic Bézier curve via discriminant
     * classification, as well as the curve-time parameters of the associated
     * points of inflection, loops, cusps, etc.
     *
     * @return {Object} the curve classification information as an object, see
     *     options
     * @result info.type {String} the type of Bézier curve, possible values are:
     *     {@values 'line', 'quadratic', 'serpentine', 'cusp', 'loop', 'arch'}
     * @result info.roots {Number[]} the curve-time parameters of the
     *     associated points of inflection for serpentine curves, loops, cusps,
           etc
     */
    classify: function() {
        return Curve.classify(this.getValues());
    },

    /**
     * Removes the curve from the path that it belongs to, by removing its
     * second segment and merging its handle with the first segment.
     * @return {Boolean} {@true if the curve was removed}
     */
    remove: function() {
        var removed = false;
        if (this._path) {
            var segment2 = this._segment2,
                handleOut = segment2._handleOut;
            removed = segment2.remove();
            if (removed)
                this._segment1._handleOut.set(handleOut);
        }
        return removed;
    },

    /**
     * The first anchor point of the curve.
     *
     * @bean
     * @type Point
     */
    getPoint1: function() {
        return this._segment1._point;
    },

    setPoint1: function(/* point */) {
        this._segment1._point.set(Point.read(arguments));
    },

    /**
     * The second anchor point of the curve.
     *
     * @bean
     * @type Point
     */
    getPoint2: function() {
        return this._segment2._point;
    },

    setPoint2: function(/* point */) {
        this._segment2._point.set(Point.read(arguments));
    },

    /**
     * The handle point that describes the tangent in the first anchor point.
     *
     * @bean
     * @type Point
     */
    getHandle1: function() {
        return this._segment1._handleOut;
    },

    setHandle1: function(/* point */) {
        this._segment1._handleOut.set(Point.read(arguments));
    },

    /**
     * The handle point that describes the tangent in the second anchor point.
     *
     * @bean
     * @type Point
     */
    getHandle2: function() {
        return this._segment2._handleIn;
    },

    setHandle2: function(/* point */) {
        this._segment2._handleIn.set(Point.read(arguments));
    },

    /**
     * The first segment of the curve.
     *
     * @bean
     * @type Segment
     */
    getSegment1: function() {
        return this._segment1;
    },

    /**
     * The second segment of the curve.
     *
     * @bean
     * @type Segment
     */
    getSegment2: function() {
        return this._segment2;
    },

    /**
     * The path that the curve belongs to.
     *
     * @bean
     * @type Path
     */
    getPath: function() {
        return this._path;
    },

    /**
     * The index of the curve in the {@link Path#curves} array.
     *
     * @bean
     * @type Number
     */
    getIndex: function() {
        return this._segment1._index;
    },

    /**
     * The next curve in the {@link Path#curves} array that the curve
     * belongs to.
     *
     * @bean
     * @type Curve
     */
    getNext: function() {
        var curves = this._path && this._path._curves;
        return curves && (curves[this._segment1._index + 1]
                || this._path._closed && curves[0]) || null;
    },

    /**
     * The previous curve in the {@link Path#curves} array that the curve
     * belongs to.
     *
     * @bean
     * @type Curve
     */
    getPrevious: function() {
        var curves = this._path && this._path._curves;
        return curves && (curves[this._segment1._index - 1]
                || this._path._closed && curves[curves.length - 1]) || null;
    },

    /**
     * Checks if the this is the first curve in the {@link Path#curves} array.
     *
     * @return {Boolean} {@true if this is the first curve}
     */
    isFirst: function() {
        return !this._segment1._index;
    },

    /**
     * Checks if the this is the last curve in the {@link Path#curves} array.
     *
     * @return {Boolean} {@true if this is the last curve}
     */
    isLast: function() {
        var path = this._path;
        return path && this._segment1._index === path._curves.length - 1
                || false;
    },

    /**
     * Specifies whether the points and handles of the curve are selected.
     *
     * @bean
     * @type Boolean
     */
    isSelected: function() {
        return this.getPoint1().isSelected()
                && this.getHandle1().isSelected()
                && this.getHandle2().isSelected()
                && this.getPoint2().isSelected();
    },

    setSelected: function(selected) {
        this.getPoint1().setSelected(selected);
        this.getHandle1().setSelected(selected);
        this.getHandle2().setSelected(selected);
        this.getPoint2().setSelected(selected);
    },

    /**
     * An array of 8 float values, describing this curve's geometry in four
     * absolute x/y pairs (point1, handle1, handle2, point2). This format is
     * used internally for efficient processing of curve geometries, e.g. when
     * calculating intersections or bounds.
     *
     * Note that the handles are converted to absolute coordinates.
     *
     * @bean
     * @type Number[]
     */
    getValues: function(matrix) {
        return Curve.getValues(this._segment1, this._segment2, matrix);
    },

    /**
     * An array of 4 point objects, describing this curve's geometry in absolute
     * coordinates (point1, handle1, handle2, point2).
     *
     * Note that the handles are converted to absolute coordinates.
     *
     * @bean
     * @type Point[]
     */
    getPoints: function() {
        // Convert to array of absolute points
        var coords = this.getValues(),
            points = [];
        for (var i = 0; i < 8; i += 2)
            points.push(new Point(coords[i], coords[i + 1]));
        return points;
    }
}, /** @lends Curve# */{
    /**
     * The approximated length of the curve.
     *
     * @bean
     * @type Number
     */
    getLength: function() {
        if (this._length == null)
            this._length = Curve.getLength(this.getValues(), 0, 1);
        return this._length;
    },

    /**
     * The area that the curve's geometry is covering.
     *
     * @bean
     * @type Number
     */
    getArea: function() {
        return Curve.getArea(this.getValues());
    },

    /**
     * @bean
     * @type Line
     * @private
     */
    getLine: function() {
        return new Line(this._segment1._point, this._segment2._point);
    },

    /**
     * Creates a new curve as a sub-curve from this curve, its range defined by
     * the given curve-time parameters. If `from` is larger than `to`, then
     * the resulting curve will have its direction reversed.
     *
     * @param {Number} from the curve-time parameter at which the sub-curve
     * starts
     * @param {Number} to the curve-time parameter at which the sub-curve
     * ends
     * @return {Curve} the newly create sub-curve
     */
    getPart: function(from, to) {
        return new Curve(Curve.getPart(this.getValues(), from, to));
    },

    // DOCS: Curve#getPartLength(from, to)
    getPartLength: function(from, to) {
        return Curve.getLength(this.getValues(), from, to);
    },

    // TODO: adjustThroughPoint

    /**
     * Divides the curve into two curves at the given offset or location. The
     * curve itself is modified and becomes the first part, the second part is
     * returned as a new curve. If the curve belongs to a path item, a new
     * segment is inserted into the path at the given location, and the second
     * part becomes a part of the path as well.
     *
     * @param {Number|CurveLocation} location the offset or location on the
     *     curve at which to divide
     * @return {Curve} the second part of the divided curve if the location is
     *     valid, {code null} otherwise
     * @see #divideAtTime(time)
     */
    divideAt: function(location) {
        // Accept offsets and CurveLocation objects, as well as objects that act
        // like them.
        return this.divideAtTime(location && location.curve === this
                ? location.time : this.getTimeAt(location));
    },

    /**
     * Divides the curve into two curves at the given curve-time parameter. The
     * curve itself is modified and becomes the first part, the second part is
     * returned as a new curve. If the modified curve belongs to a path item,
     * the second part is also added to the path.
     *
     * @param {Number} time the curve-time parameter on the curve at which to
     *     divide
     * @return {Curve} the second part of the divided curve, if the offset is
     *     within the valid range, {code null} otherwise.
     * @see #divideAt(offset)
     */
    divideAtTime: function(time, _setHandles) {
        // Only divide if not at the beginning or end.
        var tMin = /*#=*/Numerical.CURVETIME_EPSILON,
            tMax = 1 - tMin,
            res = null;
        if (time >= tMin && time <= tMax) {
            var parts = Curve.subdivide(this.getValues(), time),
                left = parts[0],
                right = parts[1],
                setHandles = _setHandles || this.hasHandles(),
                seg1 = this._segment1,
                seg2 = this._segment2,
                path = this._path;
            if (setHandles) {
                // Adjust the handles on the existing segments. The new segment
                // will be inserted between the existing segment1 and segment2:
                // Convert absolute -> relative
                seg1._handleOut._set(left[2] - left[0], left[3] - left[1]);
                seg2._handleIn._set(right[4] - right[6],right[5] - right[7]);
            }
            // Create the new segment:
            var x = left[6], y = left[7],
                segment = new Segment(new Point(x, y),
                        setHandles && new Point(left[4] - x, left[5] - y),
                        setHandles && new Point(right[2] - x, right[3] - y));
            // Insert it in the segments list, if needed:
            if (path) {
                // By inserting at seg1.index + 1, we make sure to insert at
                // the end if this curve is a closing curve of a closed path,
                // as with segment2.index it would be inserted at 0.
                path.insert(seg1._index + 1, segment);
                // The newly inserted segment is the start of the next curve:
                res = this.getNext();
            } else {
                // otherwise create it from the result of split
                this._segment2 = segment;
                this._changed();
                res = new Curve(segment, seg2);
            }
        }
        return res;
    },

    /**
     * Splits the path this curve belongs to at the given offset. After
     * splitting, the path will be open. If the path was open already, splitting
     * will result in two paths.
     *
     * @param {Number|CurveLocation} location the offset or location on the
     *     curve at which to split
     * @return {Path} the newly created path after splitting, if any
     * @see Path#splitAt(offset)
     */
    splitAt: function(location) {
        var path = this._path;
        return path ? path.splitAt(location) : null;
    },

    /**
     * Splits the path this curve belongs to at the given offset. After
     * splitting, the path will be open. If the path was open already, splitting
     * will result in two paths.
     *
     * @param {Number} time the curve-time parameter on the curve at which to
     *     split
     * @return {Path} the newly created path after splitting, if any
     * @see Path#splitAt(offset)
     */
    splitAtTime: function(time) {
        return this.splitAt(this.getLocationAtTime(time));
    },

    // TODO: Remove in 1.0.0? (deprecated January 2016):
    /**
     * @deprecated use use {@link #divideAt(offset)} or
     * {@link #divideAtTime(time)} instead.
     */
    divide: function(offset, isTime) {
        return this.divideAtTime(offset === undefined ? 0.5 : isTime ? offset
                : this.getTimeAt(offset));
    },

    // TODO: Remove in 1.0.0? (deprecated January 2016):
    /**
     * @deprecated use use {@link #splitAt(offset)} or
     * {@link #splitAtTime(time)} instead.
     */
    split: function(offset, isTime) {
        return this.splitAtTime(offset === undefined ? 0.5 : isTime ? offset
                : this.getTimeAt(offset));
    },

    /**
     * Returns a reversed version of the curve, without modifying the curve
     * itself.
     *
     * @return {Curve} a reversed version of the curve
     */
    reversed: function() {
        return new Curve(this._segment2.reversed(), this._segment1.reversed());
    },

    /**
     * Clears the curve's handles by setting their coordinates to zero,
     * turning the curve into a straight line.
     */
    clearHandles: function() {
        this._segment1._handleOut._set(0, 0);
        this._segment2._handleIn._set(0, 0);
    },

statics: /** @lends Curve */{
    getValues: function(segment1, segment2, matrix, straight) {
        var p1 = segment1._point,
            h1 = segment1._handleOut,
            h2 = segment2._handleIn,
            p2 = segment2._point,
            x1 = p1.x, y1 = p1.y,
            x2 = p2.x, y2 = p2.y,
            values = straight
                ? [ x1, y1, x1, y1, x2, y2, x2, y2 ]
                : [
                    x1, y1,
                    x1 + h1._x, y1 + h1._y,
                    x2 + h2._x, y2 + h2._y,
                    x2, y2
                ];
        if (matrix)
            matrix._transformCoordinates(values, values, 4);
        return values;
    },

    subdivide: function(v, t) {
        var x0 = v[0], y0 = v[1],
            x1 = v[2], y1 = v[3],
            x2 = v[4], y2 = v[5],
            x3 = v[6], y3 = v[7];
        if (t === undefined)
            t = 0.5;
        // Triangle computation, with loops unrolled.
        var u = 1 - t,
            // Interpolate from 4 to 3 points
            x4 = u * x0 + t * x1, y4 = u * y0 + t * y1,
            x5 = u * x1 + t * x2, y5 = u * y1 + t * y2,
            x6 = u * x2 + t * x3, y6 = u * y2 + t * y3,
            // Interpolate from 3 to 2 points
            x7 = u * x4 + t * x5, y7 = u * y4 + t * y5,
            x8 = u * x5 + t * x6, y8 = u * y5 + t * y6,
            // Interpolate from 2 points to 1 point
            x9 = u * x7 + t * x8, y9 = u * y7 + t * y8;
        // We now have all the values we need to build the sub-curves:
        return [
            [x0, y0, x4, y4, x7, y7, x9, y9], // left
            [x9, y9, x8, y8, x6, y6, x3, y3] // right
        ];
    },

    /**
     * Splits the specified curve values into curves that are monotone in the
     * specified coordinate direction.
     *
     * @param {Number[]} v the curve values, as returned by {@link Curve#values}
     * @param {Boolean} [dir=false] the direction in which the curves should be
     *     monotone, `false`: in x-direction, `true`: in y-direction
     * @return {Number[][]} an array of curve value arrays of the resulting
     *     monotone curve. If the original curve was already monotone, an array
     *     only containing its values are returned.
     * @private
     */
    getMonoCurves: function(v, dir) {
        var curves = [],
            // Determine the ordinate index in the curve values array.
            io = dir ? 0 : 1,
            o0 = v[io + 0],
            o1 = v[io + 2],
            o2 = v[io + 4],
            o3 = v[io + 6];
        if ((o0 >= o1) === (o1 >= o2) && (o1 >= o2) === (o2 >= o3)
                || Curve.isStraight(v)) {
            // Straight curves and curves with all involved points ordered
            // in coordinate direction are guaranteed to be monotone.
            curves.push(v);
        } else {
            var a = 3 * (o1 - o2) - o0 + o3,
                b = 2 * (o0 + o2) - 4 * o1,
                c = o1 - o0,
                tMin = /*#=*/Numerical.CURVETIME_EPSILON,
                tMax = 1 - tMin,
                roots = [],
                n = Numerical.solveQuadratic(a, b, c, roots, tMin, tMax);
            if (!n) {
                curves.push(v);
            } else {
                roots.sort();
                var t = roots[0],
                    parts = Curve.subdivide(v, t);
                curves.push(parts[0]);
                if (n > 1) {
                    t = (roots[1] - t) / (1 - t);
                    parts = Curve.subdivide(parts[1], t);
                    curves.push(parts[0]);
                }
                curves.push(parts[1]);
            }
        }
        return curves;
    },

    // Converts from the point coordinates (p0, p1, p2, p3) for one axis to
    // the polynomial coefficients and solves the polynomial for val
    solveCubic: function (v, coord, val, roots, min, max) {
        var v0 = v[coord],
            v1 = v[coord + 2],
            v2 = v[coord + 4],
            v3 = v[coord + 6],
            res = 0;
        // If val is outside the curve values, no solution is possible.
        if (  !(v0 < val && v3 < val && v1 < val && v2 < val ||
                v0 > val && v3 > val && v1 > val && v2 > val)) {
            var c = 3 * (v1 - v0),
                b = 3 * (v2 - v1) - c,
                a = v3 - v0 - c - b;
            res = Numerical.solveCubic(a, b, c, v0 - val, roots, min, max);
        }
        return res;
    },

    getTimeOf: function(v, point) {
        // Before solving cubics, compare the beginning and end of the curve
        // with zero epsilon:
        var p0 = new Point(v[0], v[1]),
            p3 = new Point(v[6], v[7]),
            epsilon = /*#=*/Numerical.EPSILON,
            geomEpsilon = /*#=*/Numerical.GEOMETRIC_EPSILON,
            t = point.isClose(p0, epsilon) ? 0
              : point.isClose(p3, epsilon) ? 1
              : null;
        if (t === null) {
            // Solve the cubic for both x- and y-coordinates and consider all
            // solutions, testing with the larger / looser geometric epsilon.
            var coords = [point.x, point.y],
                roots = [];
            for (var c = 0; c < 2; c++) {
                var count = Curve.solveCubic(v, c, coords[c], roots, 0, 1);
                for (var i = 0; i < count; i++) {
                    var u = roots[i];
                    if (point.isClose(Curve.getPoint(v, u), geomEpsilon))
                        return u;
                }
            }
        }
        // Since we're comparing with geometric epsilon for any other t along
        // the curve, do so as well now for the beginning and end of the curve.
        return point.isClose(p0, geomEpsilon) ? 0
             : point.isClose(p3, geomEpsilon) ? 1
             : null;
    },

    getNearestTime: function(v, point) {
        if (Curve.isStraight(v)) {
            var x0 = v[0], y0 = v[1],
                x3 = v[6], y3 = v[7],
                vx = x3 - x0, vy = y3 - y0,
                det = vx * vx + vy * vy;
            // Avoid divisions by zero.
            if (det === 0)
                return 0;
            // Project the point onto the line and calculate its linear
            // parameter u along the line: u = (point - p1).dot(v) / v.dot(v)
            var u = ((point.x - x0) * vx + (point.y - y0) * vy) / det;
            return u < /*#=*/Numerical.EPSILON ? 0
                 : u > /*#=*/(1 - Numerical.EPSILON) ? 1
                 : Curve.getTimeOf(v,
                    new Point(x0 + u * vx, y0 + u * vy));
        }

        var count = 100,
            minDist = Infinity,
            minT = 0;

        function refine(t) {
            if (t >= 0 && t <= 1) {
                var dist = point.getDistance(Curve.getPoint(v, t), true);
                if (dist < minDist) {
                    minDist = dist;
                    minT = t;
                    return true;
                }
            }
        }

        for (var i = 0; i <= count; i++)
            refine(i / count);

        // Now iteratively refine solution until we reach desired precision.
        var step = 1 / (count * 2);
        while (step > /*#=*/Numerical.CURVETIME_EPSILON) {
            if (!refine(minT - step) && !refine(minT + step))
                step /= 2;
        }
        return minT;
    },

    // TODO: Find better name
    getPart: function(v, from, to) {
        var flip = from > to;
        if (flip) {
            var tmp = from;
            from = to;
            to = tmp;
        }
        if (from > 0)
            v = Curve.subdivide(v, from)[1]; // [1] right
        // Interpolate the parameter at 'to' in the new curve and cut there.
        if (to < 1)
            v = Curve.subdivide(v, (to - from) / (1 - from))[0]; // [0] left
        // Return reversed curve if from / to were flipped:
        return flip
                ? [v[6], v[7], v[4], v[5], v[2], v[3], v[0], v[1]]
                : v;
    },

    /**
     * Determines if a curve is sufficiently flat, meaning it appears as a
     * straight line and has curve-time that is enough linear, as specified by
     * the given `flatness` parameter.
     *
     * @param {Number} flatness the maximum error allowed for the straight line
     *     to deviate from the curve
     *
     * @private
     */
    isFlatEnough: function(v, flatness) {
        // Thanks to Kaspar Fischer and Roger Willcocks for the following:
        // http://hcklbrrfnn.files.wordpress.com/2012/08/bez.pdf
        var x0 = v[0], y0 = v[1],
            x1 = v[2], y1 = v[3],
            x2 = v[4], y2 = v[5],
            x3 = v[6], y3 = v[7],
            ux = 3 * x1 - 2 * x0 - x3,
            uy = 3 * y1 - 2 * y0 - y3,
            vx = 3 * x2 - 2 * x3 - x0,
            vy = 3 * y2 - 2 * y3 - y0;
        return Math.max(ux * ux, vx * vx) + Math.max(uy * uy, vy * vy)
                <= 16 * flatness * flatness;
    },

    getArea: function(v) {
        // http://objectmix.com/graphics/133553-area-closed-bezier-curve.html
        var x0 = v[0], y0 = v[1],
            x1 = v[2], y1 = v[3],
            x2 = v[4], y2 = v[5],
            x3 = v[6], y3 = v[7];
        return 3 * ((y3 - y0) * (x1 + x2) - (x3 - x0) * (y1 + y2)
                + y1 * (x0 - x2) - x1 * (y0 - y2)
                + y3 * (x2 + x0 / 3) - x3 * (y2 + y0 / 3)) / 20;
    },

    getBounds: function(v) {
        var min = v.slice(0, 2), // Start with values of point1
            max = min.slice(), // clone
            roots = [0, 0];
        for (var i = 0; i < 2; i++)
            Curve._addBounds(v[i], v[i + 2], v[i + 4], v[i + 6],
                    i, 0, min, max, roots);
        return new Rectangle(min[0], min[1], max[0] - min[0], max[1] - min[1]);
    },

    /**
     * Private helper for both Curve.getBounds() and Path.getBounds(), which
     * finds the 0-crossings of the derivative of a bezier curve polynomial, to
     * determine potential extremas when finding the bounds of a curve.
     * NOTE: padding is only used for Path.getBounds().
     */
    _addBounds: function(v0, v1, v2, v3, coord, padding, min, max, roots) {
        // Code ported and further optimised from:
        // http://blog.hackers-cafe.net/2009/06/how-to-calculate-bezier-curves-bounding.html
        function add(value, padding) {
            var left = value - padding,
                right = value + padding;
            if (left < min[coord])
                min[coord] = left;
            if (right > max[coord])
                max[coord] = right;
        }

        padding /= 2; // strokePadding is in width, not radius
        var minPad = min[coord] + padding,
            maxPad = max[coord] - padding;
        // Perform a rough bounds checking first: The curve can only extend the
        // current bounds if at least one value is outside the min-max range.
        if (    v0 < minPad || v1 < minPad || v2 < minPad || v3 < minPad ||
                v0 > maxPad || v1 > maxPad || v2 > maxPad || v3 > maxPad) {
            if (v1 < v0 != v1 < v3 && v2 < v0 != v2 < v3) {
                // If the values of a curve are sorted, the extrema are simply
                // the start and end point.
                // Only add strokeWidth to bounds for points which lie within 0
                // < t < 1. The corner cases for cap and join are handled in
                // getStrokeBounds()
                add(v0, 0);
                add(v3, 0);
            } else {
                // Calculate derivative of our bezier polynomial, divided by 3.
                // Doing so allows for simpler calculations of a, b, c and leads
                // to the same quadratic roots.
                var a = 3 * (v1 - v2) - v0 + v3,
                    b = 2 * (v0 + v2) - 4 * v1,
                    c = v1 - v0,
                    count = Numerical.solveQuadratic(a, b, c, roots),
                    // Add some tolerance for good roots, as t = 0, 1 are added
                    // separately anyhow, and we don't want joins to be added
                    // with radii in getStrokeBounds()
                    tMin = /*#=*/Numerical.CURVETIME_EPSILON,
                    tMax = 1 - tMin;
                // See above for an explanation of padding = 0 here:
                add(v3, 0);
                for (var i = 0; i < count; i++) {
                    var t = roots[i],
                        u = 1 - t;
                    // Test for good roots and only add to bounds if good.
                    if (tMin <= t && t <= tMax)
                    // Calculate bezier polynomial at t.
                        add(u * u * u * v0
                            + 3 * u * u * t * v1
                            + 3 * u * t * t * v2
                            + t * t * t * v3,
                            padding);
                }
            }
        }
    }
}}, Base.each(
    ['getBounds', 'getStrokeBounds', 'getHandleBounds'],
    // NOTE: Although Curve.getBounds() exists, we are using Path.getBounds() to
    // determine the bounds of Curve objects with defined segment1 and segment2
    // values Curve.getBounds() can be used directly on curve arrays, without
    // the need to create a Curve object first, as required by the code that
    // finds path interesections.
    function(name) {
        this[name] = function() {
            if (!this._bounds)
                this._bounds = {};
            var bounds = this._bounds[name];
            if (!bounds) {
                // Calculate the curve bounds by passing a segment list for the
                // curve to the static Path.get*Boudns methods.
                bounds = this._bounds[name] = Path[name](
                        [this._segment1, this._segment2], false, this._path);
            }
            return bounds.clone();
        };
    },
/** @lends Curve# */{
    /**
     * {@grouptitle Bounding Boxes}
     *
     * The bounding rectangle of the curve excluding stroke width.
     *
     * @name Curve#bounds
     * @type Rectangle
     */

    /**
     * The bounding rectangle of the curve including stroke width.
     *
     * @name Curve#strokeBounds
     * @type Rectangle
     */

    /**
     * The bounding rectangle of the curve including handles.
     *
     * @name Curve#handleBounds
     * @type Rectangle
     */

    /**
     * The rough bounding rectangle of the curve that is sure to include all of
     * the drawing, including stroke width.
     *
     * @name Curve#roughBounds
     * @type Rectangle
     * @ignore
     */
}), Base.each({ // Injection scope for tests both as instance and static methods
    // NOTE: Curve#isStraight is documented further down.
    isStraight: function(p1, h1, h2, p2) {
        if (h1.isZero() && h2.isZero()) {
            // No handles.
            return true;
        } else {
            var v = p2.subtract(p1);
            if (v.isZero()) {
                // Zero-length line, with some handles defined.
                return false;
            } else if (v.isCollinear(h1) && v.isCollinear(h2)) {
                // Collinear handles: In addition to v.isCollinear(h) checks, we
                // need to measure the distance to the line, in order to be able
                // to use the same epsilon as in Curve#getTimeOf(), see #1066.
                var l = new Line(p1, p2),
                    epsilon = /*#=*/Numerical.GEOMETRIC_EPSILON;
                if (l.getDistance(p1.add(h1)) < epsilon &&
                    l.getDistance(p2.add(h2)) < epsilon) {
                    // Project handles onto line to see if they are in range:
                    var div = v.dot(v),
                        s1 = v.dot(h1) / div,
                        s2 = v.dot(h2) / div;
                    return s1 >= 0 && s1 <= 1 && s2 <= 0 && s2 >= -1;
                }
            }
        }
        return false;
    },

    // NOTE: Curve#isLinear is documented further down.
    isLinear: function(p1, h1, h2, p2) {
        var third = p2.subtract(p1).divide(3);
        return h1.equals(third) && h2.negate().equals(third);
    }
}, function(test, name) {
    // Produce the instance version that is called on curve object.
    this[name] = function(epsilon) {
        var seg1 = this._segment1,
            seg2 = this._segment2;
        return test(seg1._point, seg1._handleOut, seg2._handleIn, seg2._point,
                epsilon);
    };

    // Produce the static version that handles a curve values array.
    this.statics[name] = function(v, epsilon) {
        var x0 = v[0], y0 = v[1],
            x3 = v[6], y3 = v[7];
        return test(
                new Point(x0, y0),
                new Point(v[2] - x0, v[3] - y0),
                new Point(v[4] - x3, v[5] - y3),
                new Point(x3, y3), epsilon);
    };
}, /** @lends Curve# */{
    statics: {}, // Filled in the Base.each loop above.

    /**
     * {@grouptitle Curve Tests}
     *
     * Checks if this curve has any curve handles set.
     *
     * @return {Boolean} {@true if the curve has handles set}
     * @see Curve#handle1
     * @see Curve#handle2
     * @see Segment#hasHandles()
     * @see Path#hasHandles()
     */
    hasHandles: function() {
        return !this._segment1._handleOut.isZero()
                || !this._segment2._handleIn.isZero();
    },

    /**
     * Checks if this curve has any length.
     *
     * @param {Number} [epsilon=0] the epsilon against which to compare the
     *     curve's length
     * @return {Boolean} {@true if the curve is longer than the given epsilon}
     */
    hasLength: function(epsilon) {
        return (!this.getPoint1().equals(this.getPoint2()) || this.hasHandles())
                && this.getLength() > (epsilon || 0);
    },

    /**
     * Checks if this curve appears as a straight line. This can mean that
     * it has no handles defined, or that the handles run collinear with the
     * line that connects the curve's start and end point, not falling
     * outside of the line.
     *
     * @name Curve#isStraight
     * @function
     * @return {Boolean} {@true if the curve is straight}
     */

    /**
     * Checks if this curve is parametrically linear, meaning that it is
     * straight and its handles are positioned at 1/3 and 2/3 of the total
     * length of the curve.
     *
     * @name Curve#isLinear
     * @function
     * @return {Boolean} {@true if the curve is parametrically linear}
     */

    /**
     * Checks if the the two curves describe straight lines that are
     * collinear, meaning they run in parallel.
     *
     * @param {Curve} curve the other curve to check against
     * @return {Boolean} {@true if the two lines are collinear}
     */
    isCollinear: function(curve) {
        return curve && this.isStraight() && curve.isStraight()
                && this.getLine().isCollinear(curve.getLine());
    },

    /**
     * Checks if the curve is a straight horizontal line.
     *
     * @return {Boolean} {@true if the line is horizontal}
     */
    isHorizontal: function() {
        return this.isStraight() && Math.abs(this.getTangentAtTime(0.5).y)
                < /*#=*/Numerical.TRIGONOMETRIC_EPSILON;
    },

    /**
     * Checks if the curve is a straight vertical line.
     *
     * @return {Boolean} {@true if the line is vertical}
     */
    isVertical: function() {
        return this.isStraight() && Math.abs(this.getTangentAtTime(0.5).x)
                < /*#=*/Numerical.TRIGONOMETRIC_EPSILON;
    }
}), /** @lends Curve# */{
    // Explicitly deactivate the creation of beans, as we have functions here
    // that look like bean getters but actually read arguments.
    // See #getTimeOf(), #getLocationOf(), #getNearestLocation(), ...
    beans: false,

    /**
     * {@grouptitle Positions on Curves}
     *
     * Calculates the curve location at the specified offset on the curve.
     *
     * @param {Number} offset the offset on the curve
     * @return {CurveLocation} the curve location at the specified the offset
     */
    getLocationAt: function(offset, _isTime) {
        // TODO: Remove _isTime handling in 1.0.0? (deprecated Jan 2016):
        return this.getLocationAtTime(
                _isTime ? offset : this.getTimeAt(offset));
    },

    /**
     * Calculates the curve location at the specified curve-time parameter on
     * the curve.
     *
     * @param {Number} time the curve-time parameter on the curve
     * @return {CurveLocation} the curve location at the specified the location
     */
    getLocationAtTime: function(t) {
        return t != null && t >= 0 && t <= 1
                ? new CurveLocation(this, t)
                : null;
    },

    /**
     * Calculates the curve-time parameter of the specified offset on the path,
     * relative to the provided start parameter. If offset is a negative value,
     * the parameter is searched to the left of the start parameter. If no start
     * parameter is provided, a default of `0` for positive values of `offset`
     * and `1` for negative values of `offset`.
     *
     * @param {Number} offset the offset at which to find the curve-time, in
     *     curve length units
     * @param {Number} [start] the curve-time in relation to which the offset is
     *     determined
     * @return {Number} the curve-time parameter at the specified location
     */
    getTimeAt: function(offset, start) {
        return Curve.getTimeAt(this.getValues(), offset, start);
    },

    // TODO: Remove in 1.0.0? (deprecated January 2016):
    /**
     * @deprecated use use {@link #getTimeOf(point)} instead.
     */
    getParameterAt: '#getTimeAt',

    /**
     * Calculates the curve-time parameters where the curve is tangential to
     * provided tangent. Note that tangents at the start or end are included.
     *
     * @param {Point} tangent the tangent to which the curve must be tangential
     * @return {Number[]} at most two curve-time parameters, where the curve is
     * tangential to the given tangent
     */
    getTimesWithTangent: function (/* tangent */) {
        var tangent = Point.read(arguments);
        return tangent.isZero()
                ? []
                : Curve.getTimesWithTangent(this.getValues(), tangent);
    },

    /**
     * Calculates the curve offset at the specified curve-time parameter on
     * the curve.
     *
     * @param {Number} time the curve-time parameter on the curve
     * @return {Number} the curve offset at the specified the location
     */
    getOffsetAtTime: function(t) {
        return this.getPartLength(0, t);
    },

    /**
     * Returns the curve location of the specified point if it lies on the
     * curve, `null` otherwise.
     *
     * @param {Point} point the point on the curve
     * @return {CurveLocation} the curve location of the specified point
     */
    getLocationOf: function(/* point */) {
        return this.getLocationAtTime(this.getTimeOf(Point.read(arguments)));
    },

    /**
     * Returns the length of the path from its beginning up to up to the
     * specified point if it lies on the path, `null` otherwise.
     *
     * @param {Point} point the point on the path
     * @return {Number} the length of the path up to the specified point
     */
    getOffsetOf: function(/* point */) {
        var loc = this.getLocationOf.apply(this, arguments);
        return loc ? loc.getOffset() : null;
    },

    /**
     * Returns the curve-time parameter of the specified point if it lies on the
     * curve, `null` otherwise.
     * Note that if there is more than one possible solution in a
     * self-intersecting curve, the first found result is returned.
     *
     * @param {Point} point the point on the curve
     * @return {Number} the curve-time parameter of the specified point
     */
    getTimeOf: function(/* point */) {
        return Curve.getTimeOf(this.getValues(), Point.read(arguments));
    },

    // TODO: Remove in 1.0.0? (deprecated January 2016):
    /**
     * @deprecated use use {@link #getTimeOf(point)} instead.
     */
    getParameterOf: '#getTimeOf',

    /**
     * Returns the nearest location on the curve to the specified point.
     *
     * @function
     * @param {Point} point the point for which we search the nearest location
     * @return {CurveLocation} the location on the curve that's the closest to
     * the specified point
     */
    getNearestLocation: function(/* point */) {
        var point = Point.read(arguments),
            values = this.getValues(),
            t = Curve.getNearestTime(values, point),
            pt = Curve.getPoint(values, t);
        return new CurveLocation(this, t, pt, null, point.getDistance(pt));
    },

    /**
     * Returns the nearest point on the curve to the specified point.
     *
     * @function
     * @param {Point} point the point for which we search the nearest point
     * @return {Point} the point on the curve that's the closest to the
     * specified point
     */
    getNearestPoint: function(/* point */) {
        var loc = this.getNearestLocation.apply(this, arguments);
        return loc ? loc.getPoint() : loc;
    }

    /**
     * Calculates the point on the curve at the given location.
     *
     * @name Curve#getPointAt
     * @function
     * @param {Number|CurveLocation} location the offset or location on the
     *     curve
     * @return {Point} the point on the curve at the given location
     */

    /**
     * Calculates the normalized tangent vector of the curve at the given
     * location.
     *
     * @name Curve#getTangentAt
     * @function
     * @param {Number|CurveLocation} location the offset or location on the
     *     curve
     * @return {Point} the normalized tangent of the curve at the given location
     */

    /**
     * Calculates the normal vector of the curve at the given location.
     *
     * @name Curve#getNormalAt
     * @function
     * @param {Number|CurveLocation} location the offset or location on the
     *     curve
     * @return {Point} the normal of the curve at the given location
     */

    /**
     * Calculates the weighted tangent vector of the curve at the given
     * location, its length reflecting the curve velocity at that location.
     *
     * @name Curve#getWeightedTangentAt
     * @function
     * @param {Number|CurveLocation} location the offset or location on the
     *     curve
     * @return {Point} the weighted tangent of the curve at the given location
     */

    /**
     * Calculates the weighted normal vector of the curve at the given location,
     * its length reflecting the curve velocity at that location.
     *
     * @name Curve#getWeightedNormalAt
     * @function
     * @param {Number|CurveLocation} location the offset or location on the
     *     curve
     * @return {Point} the weighted normal of the curve at the given location
     */

    /**
     * Calculates the curvature of the curve at the given location. Curvatures
     * indicate how sharply a curve changes direction. A straight line has zero
     * curvature, where as a circle has a constant curvature. The curve's radius
     * at the given location is the reciprocal value of its curvature.
     *
     * @name Curve#getCurvatureAt
     * @function
     * @param {Number|CurveLocation} location the offset or location on the
     *     curve
     * @return {Number} the curvature of the curve at the given location
     */

    /**
     * Calculates the point on the curve at the given location.
     *
     * @name Curve#getPointAtTime
     * @function
     * @param {Number} time the curve-time parameter on the curve
     * @return {Point} the point on the curve at the given location
     */

    /**
     * Calculates the normalized tangent vector of the curve at the given
     * location.
     *
     * @name Curve#getTangentAtTime
     * @function
     * @param {Number} time the curve-time parameter on the curve
     * @return {Point} the normalized tangent of the curve at the given location
     */

    /**
     * Calculates the normal vector of the curve at the given location.
     *
     * @name Curve#getNormalAtTime
     * @function
     * @param {Number} time the curve-time parameter on the curve
     * @return {Point} the normal of the curve at the given location
     */

    /**
     * Calculates the weighted tangent vector of the curve at the given
     * location, its length reflecting the curve velocity at that location.
     *
     * @name Curve#getWeightedTangentAtTime
     * @function
     * @param {Number} time the curve-time parameter on the curve
     * @return {Point} the weighted tangent of the curve at the given location
     */

    /**
     * Calculates the weighted normal vector of the curve at the given location,
     * its length reflecting the curve velocity at that location.
     *
     * @name Curve#getWeightedNormalAtTime
     * @function
     * @param {Number} time the curve-time parameter on the curve
     * @return {Point} the weighted normal of the curve at the given location
     */

    /**
     * Calculates the curvature of the curve at the given location. Curvatures
     * indicate how sharply a curve changes direction. A straight line has zero
     * curvature, where as a circle has a constant curvature. The curve's radius
     * at the given location is the reciprocal value of its curvature.
     *
     * @name Curve#getCurvatureAtTime
     * @function
     * @param {Number} time the curve-time parameter on the curve
     * @return {Number} the curvature of the curve at the given location
     */
},
new function() { // Injection scope for various curve evaluation methods
    var methods = ['getPoint', 'getTangent', 'getNormal', 'getWeightedTangent',
        'getWeightedNormal', 'getCurvature'];
    return Base.each(methods,
        function(name) {
            // NOTE: (For easier searching): This loop produces:
            // getPointAt, getTangentAt, getNormalAt, getWeightedTangentAt,
            // getWeightedNormalAt, getCurvatureAt, getPointAtTime,
            // getTangentAtTime, getNormalAtTime, getWeightedTangentAtTime,
            // getWeightedNormalAtTime, getCurvatureAtTime
            // TODO: Remove _isTime handling in 1.0.0? (deprecated Jan 2016):
            this[name + 'At'] = function(location, _isTime) {
                var values = this.getValues();
                return Curve[name](values, _isTime ? location
                        : Curve.getTimeAt(values, location));
            };

            this[name + 'AtTime'] = function(time) {
                return Curve[name](this.getValues(), time);
            };
        }, {
            statics: {
                _evaluateMethods: methods
            }
        }
    );
},
new function() { // Scope for methods that require private functions

    function getLengthIntegrand(v) {
        // Calculate the coefficients of a Bezier derivative.
        var x0 = v[0], y0 = v[1],
            x1 = v[2], y1 = v[3],
            x2 = v[4], y2 = v[5],
            x3 = v[6], y3 = v[7],

            ax = 9 * (x1 - x2) + 3 * (x3 - x0),
            bx = 6 * (x0 + x2) - 12 * x1,
            cx = 3 * (x1 - x0),

            ay = 9 * (y1 - y2) + 3 * (y3 - y0),
            by = 6 * (y0 + y2) - 12 * y1,
            cy = 3 * (y1 - y0);

        return function(t) {
            // Calculate quadratic equations of derivatives for x and y
            var dx = (ax * t + bx) * t + cx,
                dy = (ay * t + by) * t + cy;
            return Math.sqrt(dx * dx + dy * dy);
        };
    }

    // Amount of integral evaluations for the interval 0 <= a < b <= 1
    function getIterations(a, b) {
        // Guess required precision based and size of range...
        // TODO: There should be much better educated guesses for
        // this. Also, what does this depend on? Required precision?
        return Math.max(2, Math.min(16, Math.ceil(Math.abs(b - a) * 32)));
    }

    function evaluate(v, t, type, normalized) {
        // Do not produce results if parameter is out of range or invalid.
        if (t == null || t < 0 || t > 1)
            return null;
        var x0 = v[0], y0 = v[1],
            x1 = v[2], y1 = v[3],
            x2 = v[4], y2 = v[5],
            x3 = v[6], y3 = v[7],
            isZero = Numerical.isZero;
        // If the curve handles are almost zero, reset the control points to the
        // anchors.
        if (isZero(x1 - x0) && isZero(y1 - y0)) {
            x1 = x0;
            y1 = y0;
        }
        if (isZero(x2 - x3) && isZero(y2 - y3)) {
            x2 = x3;
            y2 = y3;
        }
        // Calculate the polynomial coefficients.
        var cx = 3 * (x1 - x0),
            bx = 3 * (x2 - x1) - cx,
            ax = x3 - x0 - cx - bx,
            cy = 3 * (y1 - y0),
            by = 3 * (y2 - y1) - cy,
            ay = y3 - y0 - cy - by,
            x, y;
        if (type === 0) {
            // type === 0: getPoint()
            // Calculate the curve point at parameter value t
            // Use special handling at t === 0 / 1, to avoid imprecisions.
            // See #960
            x = t === 0 ? x0 : t === 1 ? x3
                    : ((ax * t + bx) * t + cx) * t + x0;
            y = t === 0 ? y0 : t === 1 ? y3
                    : ((ay * t + by) * t + cy) * t + y0;
        } else {
            // type === 1: getTangent()
            // type === 2: getNormal()
            // type === 3: getCurvature()
            var tMin = /*#=*/Numerical.CURVETIME_EPSILON,
                tMax = 1 - tMin;
            // 1: tangent, 1st derivative
            // 2: normal, 1st derivative
            // 3: curvature, 1st derivative & 2nd derivative
            // Prevent tangents and normals of length 0:
            // https://stackoverflow.com/questions/10506868/
            if (t < tMin) {
                x = cx;
                y = cy;
            } else if (t > tMax) {
                x = 3 * (x3 - x2);
                y = 3 * (y3 - y2);
            } else {
                x = (3 * ax * t + 2 * bx) * t + cx;
                y = (3 * ay * t + 2 * by) * t + cy;
            }
            if (normalized) {
                // When the tangent at t is zero and we're at the beginning
                // or the end, we can use the vector between the handles,
                // but only when normalizing as its weighted length is 0.
                if (x === 0 && y === 0 && (t < tMin || t > tMax)) {
                    x = x2 - x1;
                    y = y2 - y1;
                }
                // Now normalize x & y
                var len = Math.sqrt(x * x + y * y);
                if (len) {
                    x /= len;
                    y /= len;
                }
            }
            if (type === 3) {
                // Calculate 2nd derivative, and curvature from there:
                // http://cagd.cs.byu.edu/~557/text/ch2.pdf page#31
                // k = |dx * d2y - dy * d2x| / (( dx^2 + dy^2 )^(3/2))
                var x2 = 6 * ax * t + 2 * bx,
                    y2 = 6 * ay * t + 2 * by,
                    d = Math.pow(x * x + y * y, 3 / 2);
                // For JS optimizations we always return a Point, although
                // curvature is just a numeric value, stored in x:
                x = d !== 0 ? (x * y2 - y * x2) / d : 0;
                y = 0;
            }
        }
        // The normal is simply the rotated tangent:
        return type === 2 ? new Point(y, -x) : new Point(x, y);
    }

    return { statics: {

        classify: function(v) {
            // See: Loop and Blinn, 2005, Resolution Independent Curve Rendering
            // using Programmable Graphics Hardware, GPU Gems 3 chapter 25
            //
            // Possible types:
            //   'line'       (d1 == d2 == d3 == 0)
            //   'quadratic'  (d1 == d2 == 0)
            //   'serpentine' (d > 0)
            //   'cusp'       (d == 0)
            //   'loop'       (d < 0)
            //   'arch'       (serpentine, cusp or loop with roots outside 0..1)
            //
            // NOTE: Roots for serpentine, cusp and loop curves are only
            // considered if they are within 0..1. If the roots are outside,
            // then we degrade the type of curve down to an 'arch'.

            var x0 = v[0], y0 = v[1],
                x1 = v[2], y1 = v[3],
                x2 = v[4], y2 = v[5],
                x3 = v[6], y3 = v[7],
                // Calculate coefficients of I(s, t), of which the roots are
                // inflection points.
                a1 = x0 * (y3 - y2) + y0 * (x2 - x3) + x3 * y2 - y3 * x2,
                a2 = x1 * (y0 - y3) + y1 * (x3 - x0) + x0 * y3 - y0 * x3,
                a3 = x2 * (y1 - y0) + y2 * (x0 - x1) + x1 * y0 - y1 * x0,
                d3 = 3 * a3,
                d2 = d3 - a2,
                d1 = d2 - a2 + a1,
                // Normalize the vector (d1, d2, d3) to keep error consistent.
                l = Math.sqrt(d1 * d1 + d2 * d2 + d3 * d3),
                s = l !== 0 ? 1 / l : 0,
                isZero = Numerical.isZero,
                serpentine = 'serpentine'; // short-cut
            d1 *= s;
            d2 *= s;
            d3 *= s;

            function type(type, t1, t2) {
                var hasRoots = t1 !== undefined,
                    t1Ok = hasRoots && t1 > 0 && t1 < 1,
                    t2Ok = hasRoots && t2 > 0 && t2 < 1;
                // Degrade to arch for serpentine, cusp or loop if no solutions
                // within 0..1 are found. loop requires 2 solutions to be valid.
                if (hasRoots && (!(t1Ok || t2Ok)
                        || type === 'loop' && !(t1Ok && t2Ok))) {
                    type = 'arch';
                    t1Ok = t2Ok = false;
                }
                return {
                    type: type,
                    roots: t1Ok || t2Ok
                            ? t1Ok && t2Ok
                                ? t1 < t2 ? [t1, t2] : [t2, t1] // 2 solutions
                                : [t1Ok ? t1 : t2] // 1 solution
                            : null
                };
            }

            if (isZero(d1)) {
                return isZero(d2)
                        ? type(isZero(d3) ? 'line' : 'quadratic') // 5. / 4.
                        : type(serpentine, d3 / (3 * d2));        // 3b.
            }
            var d = 3 * d2 * d2 - 4 * d1 * d3;
            if (isZero(d)) {
                return type('cusp', d2 / (2 * d1));               // 3a.
            }
            var f1 = d > 0 ? Math.sqrt(d / 3) : Math.sqrt(-d),
                f2 = 2 * d1;
            return type(d > 0 ? serpentine : 'loop',              // 1. / 2.
                    (d2 + f1) / f2,
                    (d2 - f1) / f2);
        },

        getLength: function(v, a, b, ds) {
            if (a === undefined)
                a = 0;
            if (b === undefined)
                b = 1;
            if (Curve.isStraight(v)) {
                // Sub-divide the linear curve at a and b, so we can simply
                // calculate the Pythagorean Theorem to get the range's length.
                var c = v;
                if (b < 1) {
                    c = Curve.subdivide(c, b)[0]; // left
                    a /= b; // Scale parameter to new sub-curve.
                }
                if (a > 0) {
                    c = Curve.subdivide(c, a)[1]; // right
                }
                // The length of straight curves can be calculated more easily.
                var dx = c[6] - c[0], // x3 - x0
                    dy = c[7] - c[1]; // y3 - y0
                return Math.sqrt(dx * dx + dy * dy);
            }
            return Numerical.integrate(ds || getLengthIntegrand(v), a, b,
                    getIterations(a, b));
        },

        getTimeAt: function(v, offset, start) {
            if (start === undefined)
                start = offset < 0 ? 1 : 0;
            if (offset === 0)
                return start;
            // See if we're going forward or backward, and handle cases
            // differently
            var abs = Math.abs,
                epsilon = /*#=*/Numerical.EPSILON,
                forward = offset > 0,
                a = forward ? start : 0,
                b = forward ? 1 : start,
                // Use integrand to calculate both range length and part
                // lengths in f(t) below.
                ds = getLengthIntegrand(v),
                // Get length of total range
                rangeLength = Curve.getLength(v, a, b, ds),
                diff = abs(offset) - rangeLength;
            if (abs(diff) < epsilon) {
                // Matched the end:
                return forward ? b : a;
            } else if (diff > epsilon) {
                // We're out of bounds.
                return null;
            }
            // Use offset / rangeLength for an initial guess for t, to
            // bring us closer:
            var guess = offset / rangeLength,
                length = 0;
            // Iteratively calculate curve range lengths, and add them up,
            // using integration precision depending on the size of the
            // range. This is much faster and also more precise than not
            // modifying start and calculating total length each time.
            function f(t) {
                // When start > t, the integration returns a negative value.
                length += Numerical.integrate(ds, start, t,
                        getIterations(start, t));
                start = t;
                return length - offset;
            }
            // Start with out initial guess for x.
            // NOTE: guess is a negative value when looking backwards.
            return Numerical.findRoot(f, ds, start + guess, a, b, 32,
                    /*#=*/Numerical.EPSILON);
        },

        getPoint: function(v, t) {
            return evaluate(v, t, 0, false);
        },

        getTangent: function(v, t) {
            return evaluate(v, t, 1, true);
        },

        getWeightedTangent: function(v, t) {
            return evaluate(v, t, 1, false);
        },

        getNormal: function(v, t) {
            return evaluate(v, t, 2, true);
        },

        getWeightedNormal: function(v, t) {
            return evaluate(v, t, 2, false);
        },

        getCurvature: function(v, t) {
            return evaluate(v, t, 3, false).x;
        },

        /**
         * Returns the t values for the "peaks" of the curve. The peaks are
         * calculated by finding the roots of the dot product of the first and
         * second derivative.
         *
         * Peaks are locations sharing some qualities of curvature extrema but
         * are cheaper to compute. They fulfill their purpose here quite well.
         * See:
         * https://math.stackexchange.com/questions/1954845/bezier-curvature-extrema
         *
         * @param {Number[]} v the curve values array
         * @return {Number[]} the roots of all found peaks
         */
        getPeaks: function(v) {
            var x0 = v[0], y0 = v[1],
                x1 = v[2], y1 = v[3],
                x2 = v[4], y2 = v[5],
                x3 = v[6], y3 = v[7],
                ax =     -x0 + 3 * x1 - 3 * x2 + x3,
                bx =  3 * x0 - 6 * x1 + 3 * x2,
                cx = -3 * x0 + 3 * x1,
                ay =     -y0 + 3 * y1 - 3 * y2 + y3,
                by =  3 * y0 - 6 * y1 + 3 * y2,
                cy = -3 * y0 + 3 * y1,
                tMin = /*#=*/Numerical.CURVETIME_EPSILON,
                tMax = 1 - tMin,
                roots = [];
            Numerical.solveCubic(
                    9 * (ax * ax + ay * ay),
                    9 * (ax * bx + by * ay),
                    2 * (bx * bx + by * by) + 3 * (cx * ax + cy * ay),
                    (cx * bx + by * cy),
                    // Exclude 0 and 1 as we don't count them as peaks.
                    roots, tMin, tMax);
            return roots.sort();
        }
    }};
},
new function() { // Scope for bezier intersection using fat-line clipping

    function addLocation(locations, include, c1, t1, c2, t2, overlap) {
        // Determine if locations at the beginning / end of the curves should be
        // excluded, in case the two curves are neighbors, but do not exclude
        // connecting points between two curves if they were part of overlap
        // checks, as they could be self-overlapping.
        // NOTE: We don't pass p1 and p2, because v1 and v2 may be transformed
        // by their path.matrix, while c1 and c2 are untransformed. Passing null
        // for point in CurveLocation() will do the right thing.
        var excludeStart = !overlap && c1.getPrevious() === c2,
            excludeEnd = !overlap && c1 !== c2 && c1.getNext() === c2,
            tMin = /*#=*/Numerical.CURVETIME_EPSILON,
            tMax = 1 - tMin;
        // Check t1 and t2 against correct bounds, based on excludeStart/End:
        // - excludeStart means the start of c1 connects to the end of c2
        // - excludeEnd means the end of c1 connects to the start of c2
        // - If either c1 or c2 are at the end of the path, exclude their end,
        //   which connects back to the beginning, but only if it's not part of
        //   a found overlap. The normal intersection will already be found at
        //   the beginning, and would be added twice otherwise.
        if (t1 !== null && t1 >= (excludeStart ? tMin : 0) &&
            t1 <= (excludeEnd ? tMax : 1)) {
            if (t2 !== null && t2 >= (excludeEnd ? tMin : 0) &&
                t2 <= (excludeStart ? tMax : 1)) {
                var loc1 = new CurveLocation(c1, t1, null, overlap),
                    loc2 = new CurveLocation(c2, t2, null, overlap);
                // Link the two locations to each other.
                loc1._intersection = loc2;
                loc2._intersection = loc1;
                if (!include || include(loc1)) {
                    CurveLocation.insert(locations, loc1, true);
                }
            }
        }
    }

    function addCurveIntersections(v1, v2, c1, c2, locations, include, flip,
            recursion, calls, tMin, tMax, uMin, uMax) {
        // Avoid deeper recursion, by counting the total amount of recursions,
        // as well as the total amount of calls, to avoid massive call-trees as
        // suggested by @iconexperience in #904#issuecomment-225283430.
        // See also: #565 #899 #1074
        if (++calls >= 4096 || ++recursion >= 40)
            return calls;
        // Use an epsilon smaller than CURVETIME_EPSILON to compare curve-time
        // parameters in fat-line clipping code.
        var fatLineEpsilon = 1e-9,
            // Let P be the first curve and Q be the second
            q0x = v2[0], q0y = v2[1], q3x = v2[6], q3y = v2[7],
            getSignedDistance = Line.getSignedDistance,
            // Calculate the fat-line L for Q is the baseline l and two
            // offsets which completely encloses the curve P.
            d1 = getSignedDistance(q0x, q0y, q3x, q3y, v2[2], v2[3]),
            d2 = getSignedDistance(q0x, q0y, q3x, q3y, v2[4], v2[5]),
            factor = d1 * d2 > 0 ? 3 / 4 : 4 / 9,
            dMin = factor * Math.min(0, d1, d2),
            dMax = factor * Math.max(0, d1, d2),
            // Calculate non-parametric bezier curve D(ti, di(t)):
            // - di(t) is the distance of P from baseline l of the fat-line
            // - ti is equally spaced in [0, 1]
            dp0 = getSignedDistance(q0x, q0y, q3x, q3y, v1[0], v1[1]),
            dp1 = getSignedDistance(q0x, q0y, q3x, q3y, v1[2], v1[3]),
            dp2 = getSignedDistance(q0x, q0y, q3x, q3y, v1[4], v1[5]),
            dp3 = getSignedDistance(q0x, q0y, q3x, q3y, v1[6], v1[7]),
            // Get the top and bottom parts of the convex-hull
            hull = getConvexHull(dp0, dp1, dp2, dp3),
            top = hull[0],
            bottom = hull[1],
            tMinClip,
            tMaxClip;
        // Stop iteration if all points and control points are collinear.
        if (d1 === 0 && d2 === 0
                && dp0 === 0 && dp1 === 0 && dp2 === 0 && dp3 === 0
            // Clip convex-hull with dMin and dMax, taking into account that
            // there will be no intersections if one of the results is null.
            || (tMinClip = clipConvexHull(top, bottom, dMin, dMax)) == null
            || (tMaxClip = clipConvexHull(top.reverse(), bottom.reverse(),
                dMin, dMax)) == null)
            return calls;
        // tMin and tMax are within the range (0, 1). Project it back to the
        // original parameter range for v2.
        var tMinNew = tMin + (tMax - tMin) * tMinClip,
            tMaxNew = tMin + (tMax - tMin) * tMaxClip;
        if (Math.max(uMax - uMin, tMaxNew - tMinNew) < fatLineEpsilon) {
            // We have isolated the intersection with sufficient precision
            var t = (tMinNew + tMaxNew) / 2,
                u = (uMin + uMax) / 2;
            addLocation(locations, include,
                    flip ? c2 : c1, flip ? u : t,
                    flip ? c1 : c2, flip ? t : u);
        } else {
            // Apply the result of the clipping to curve 1:
            v1 = Curve.getPart(v1, tMinClip, tMaxClip);
            var uDiff = uMax - uMin;
            if (tMaxClip - tMinClip > 0.8) {
                // Subdivide the curve which has converged the least.
                if (tMaxNew - tMinNew > uDiff) {
                    var parts = Curve.subdivide(v1, 0.5),
                        t = (tMinNew + tMaxNew) / 2;
                    calls = addCurveIntersections(
                            v2, parts[0], c2, c1, locations, include, !flip,
                            recursion, calls, uMin, uMax, tMinNew, t);
                    calls = addCurveIntersections(
                            v2, parts[1], c2, c1, locations, include, !flip,
                            recursion, calls, uMin, uMax, t, tMaxNew);
                } else {
                    var parts = Curve.subdivide(v2, 0.5),
                        u = (uMin + uMax) / 2;
                    calls = addCurveIntersections(
                            parts[0], v1, c2, c1, locations, include, !flip,
                            recursion, calls, uMin, u, tMinNew, tMaxNew);
                    calls = addCurveIntersections(
                            parts[1], v1, c2, c1, locations, include, !flip,
                            recursion, calls, u, uMax, tMinNew, tMaxNew);
                }
            } else { // Iterate
                // For some unclear reason we need to check against uDiff === 0
                // here, to prevent a regression from happening, see #1638.
                // Maybe @iconexperience could shed some light on this.
                if (uDiff === 0 || uDiff >= fatLineEpsilon) {
                    calls = addCurveIntersections(
                            v2, v1, c2, c1, locations, include, !flip,
                            recursion, calls, uMin, uMax, tMinNew, tMaxNew);
                } else {
                    // The interval on the other curve is already tight enough,
                    // therefore we keep iterating on the same curve.
                    calls = addCurveIntersections(
                            v1, v2, c1, c2, locations, include, flip,
                            recursion, calls, tMinNew, tMaxNew, uMin, uMax);
                }
            }
        }
        return calls;
    }

    /**
     * Calculate the convex hull for the non-parametric bezier curve D(ti, di(t))
     * The ti is equally spaced across [0..1] — [0, 1/3, 2/3, 1] for
     * di(t), [dq0, dq1, dq2, dq3] respectively. In other words our CVs for the
     * curve are already sorted in the X axis in the increasing order.
     * Calculating convex-hull is much easier than a set of arbitrary points.
     *
     * The convex-hull is returned as two parts [TOP, BOTTOM]:
     * (both are in a coordinate space where y increases upwards with origin at
     * bottom-left)
     * TOP: The part that lies above the 'median' (line connecting end points of
     * the curve)
     * BOTTOM: The part that lies below the median.
     */
    function getConvexHull(dq0, dq1, dq2, dq3) {
        var p0 = [ 0, dq0 ],
            p1 = [ 1 / 3, dq1 ],
            p2 = [ 2 / 3, dq2 ],
            p3 = [ 1, dq3 ],
            // Find vertical signed distance of p1 and p2 from line [p0, p3]
            dist1 = dq1 - (2 * dq0 + dq3) / 3,
            dist2 = dq2 - (dq0 + 2 * dq3) / 3,
            hull;
        // Check if p1 and p2 are on the opposite side of the line [p0, p3]
        if (dist1 * dist2 < 0) {
            // p1 and p2 lie on different sides of [p0, p3]. The hull is a
            // quadrilateral and line [p0, p3] is NOT part of the hull so we are
            // pretty much done here. The top part includes p1, we will reverse
            // it later if that is not the case.
            hull = [[p0, p1, p3], [p0, p2, p3]];
        } else {
            // p1 and p2 lie on the same sides of [p0, p3]. The hull can be a
            // triangle or a quadrilateral and line [p0, p3] is part of the
            // hull. Check if the hull is a triangle or a quadrilateral. We have
            // a triangle if the vertical distance of one of the middle points
            // (p1, p2) is equal or less than half the vertical distance of the
            // other middle point.
            var distRatio = dist1 / dist2;
            hull = [
                // p2 is inside, the hull is a triangle.
                distRatio >= 2 ? [p0, p1, p3]
                // p1 is inside, the hull is a triangle.
                : distRatio <= 0.5 ? [p0, p2, p3]
                // Hull is a quadrilateral, we need all lines in correct order.
                : [p0, p1, p2, p3],
                // Line [p0, p3] is part of the hull.
                [p0, p3]
            ];
        }
        // Flip hull if dist1 is negative or if it is zero and dist2 is negative
        return (dist1 || dist2) < 0 ? hull.reverse() : hull;
    }

    /**
     * Clips the convex-hull and returns [tMin, tMax] for the curve contained.
     */
    function clipConvexHull(hullTop, hullBottom, dMin, dMax) {
        if (hullTop[0][1] < dMin) {
            // Left of hull is below dMin, walk through the hull until it
            // enters the region between dMin and dMax
            return clipConvexHullPart(hullTop, true, dMin);
        } else if (hullBottom[0][1] > dMax) {
            // Left of hull is above dMax, walk through the hull until it
            // enters the region between dMin and dMax
            return clipConvexHullPart(hullBottom, false, dMax);
        } else {
            // Left of hull is between dMin and dMax, no clipping possible
            return hullTop[0][0];
        }
    }

    function clipConvexHullPart(part, top, threshold) {
        var px = part[0][0],
            py = part[0][1];
        for (var i = 1, l = part.length; i < l; i++) {
            var qx = part[i][0],
                qy = part[i][1];
            if (top ? qy >= threshold : qy <= threshold) {
                return qy === threshold ? qx
                        : px + (threshold - py) * (qx - px) / (qy - py);
            }
            px = qx;
            py = qy;
        }
        // All points of hull are above / below the threshold
        return null;
    }

    /**
     * Intersections between curve and line becomes rather simple here mostly
     * because of Numerical class. We can rotate the curve and line so that the
     * line is on the X axis, and solve the implicit equations for the X axis
     * and the curve.
     */
    function getCurveLineIntersections(v, px, py, vx, vy) {
        var isZero = Numerical.isZero;
        if (isZero(vx) && isZero(vy)) {
            // Handle special case of a line with no direction as a point,
            // and check if it is on the curve.
            var t = Curve.getTimeOf(v, new Point(px, py));
            return t === null ? [] : [t];
        }
        // Calculate angle to the x-axis (1, 0).
        var angle = Math.atan2(-vy, vx),
            sin = Math.sin(angle),
            cos = Math.cos(angle),
            // (rlx1, rly1) = (0, 0)
            // Calculate the curve values of the rotated curve.
            rv = [],
            roots = [];
        for (var i = 0; i < 8; i += 2) {
            var x = v[i] - px,
                y = v[i + 1] - py;
            rv.push(
                x * cos - y * sin,
                x * sin + y * cos);
        }
        // Solve it for y = 0. We need to include t = 0, 1 and let addLocation()
        // do the filtering, to catch important edge cases.
        Curve.solveCubic(rv, 1, 0, roots, 0, 1);
        return roots;
    }

    function addCurveLineIntersections(v1, v2, c1, c2, locations, include,
            flip) {
        // addCurveLineIntersections() is called so that v1 is always the curve
        // and v2 the line. flip indicates whether the curves need to be flipped
        // in the call to addLocation().
        var x1 = v2[0], y1 = v2[1],
            x2 = v2[6], y2 = v2[7],
            roots = getCurveLineIntersections(v1, x1, y1, x2 - x1, y2 - y1);
        // NOTE: count could be -1 for infinite solutions, but that should only
        // happen with lines, in which case we should not be here.
        for (var i = 0, l = roots.length; i < l; i++) {
            // For each found solution on the rotated curve, get the point on
            // the real curve and with that the location on the line.
            var t1 = roots[i],
                p1 = Curve.getPoint(v1, t1),
                t2 = Curve.getTimeOf(v2, p1);
            if (t2 !== null) {
                // Only use the time values if there was no recursion, and let
                // addLocation() figure out the actual time values otherwise.
                addLocation(locations, include,
                        flip ? c2 : c1, flip ? t2 : t1,
                        flip ? c1 : c2, flip ? t1 : t2);
            }
        }
    }

    function addLineIntersection(v1, v2, c1, c2, locations, include) {
        var pt = Line.intersect(
                v1[0], v1[1], v1[6], v1[7],
                v2[0], v2[1], v2[6], v2[7]);
        if (pt) {
            addLocation(locations, include,
                    c1, Curve.getTimeOf(v1, pt),
                    c2, Curve.getTimeOf(v2, pt));
        }
    }

    function getCurveIntersections(v1, v2, c1, c2, locations, include) {
        // Avoid checking curves if completely out of control bounds.
        var epsilon = /*#=*/Numerical.EPSILON,
            min = Math.min,
            max = Math.max;

        if (max(v1[0], v1[2], v1[4], v1[6]) + epsilon >
            min(v2[0], v2[2], v2[4], v2[6]) &&
            min(v1[0], v1[2], v1[4], v1[6]) - epsilon <
            max(v2[0], v2[2], v2[4], v2[6]) &&
            max(v1[1], v1[3], v1[5], v1[7]) + epsilon >
            min(v2[1], v2[3], v2[5], v2[7]) &&
            min(v1[1], v1[3], v1[5], v1[7]) - epsilon <
            max(v2[1], v2[3], v2[5], v2[7])) {
            // Now detect and handle overlaps:
            var overlaps = getOverlaps(v1, v2);
            if (overlaps) {
                for (var i = 0; i < 2; i++) {
                    var overlap = overlaps[i];
                    addLocation(locations, include,
                            c1, overlap[0],
                            c2, overlap[1], true);
                }
            } else {
                var straight1 = Curve.isStraight(v1),
                    straight2 = Curve.isStraight(v2),
                    straight = straight1 && straight2,
                    flip = straight1 && !straight2,
                    before = locations.length;
                // Determine the correct intersection method based on whether
                // one or curves are straight lines:
                (straight
                    ? addLineIntersection
                    : straight1 || straight2
                        ? addCurveLineIntersections
                        : addCurveIntersections)(
                            flip ? v2 : v1, flip ? v1 : v2,
                            flip ? c2 : c1, flip ? c1 : c2,
                            locations, include, flip,
                            // Define the defaults for these parameters of
                            // addCurveIntersections():
                            // recursion, calls, tMin, tMax, uMin, uMax
                            0, 0, 0, 1, 0, 1);
                // Handle the special case where the first curve's start- / end-
                // point overlaps with the second curve's start- / end-point,
                // but only if haven't found a line-line intersection already:
                // #805#issuecomment-148503018
                if (!straight || locations.length === before) {
                    for (var i = 0; i < 4; i++) {
                        var t1 = i >> 1, // 0, 0, 1, 1
                            t2 = i & 1,  // 0, 1, 0, 1
                            i1 = t1 * 6,
                            i2 = t2 * 6,
                            p1 = new Point(v1[i1], v1[i1 + 1]),
                            p2 = new Point(v2[i2], v2[i2 + 1]);
                        if (p1.isClose(p2, epsilon)) {
                            addLocation(locations, include,
                                    c1, t1,
                                    c2, t2);
                        }
                    }
                }
            }
        }
        return locations;
    }

    function getSelfIntersection(v1, c1, locations, include) {
        var info = Curve.classify(v1);
        if (info.type === 'loop') {
            var roots = info.roots;
            addLocation(locations, include,
                    c1, roots[0],
                    c1, roots[1]);
        }
      return locations;
    }

    function getIntersections(curves1, curves2, include, matrix1, matrix2,
            _returnFirst) {
        var epsilon = /*#=*/Numerical.GEOMETRIC_EPSILON,
            self = !curves2;
        if (self)
            curves2 = curves1;
        var length1 = curves1.length,
            length2 = curves2.length,
            values1 = new Array(length1),
            values2 = self ? values1 : new Array(length2),
            locations = [];

        for (var i = 0; i < length1; i++) {
            values1[i] = curves1[i].getValues(matrix1);
        }
        if (!self) {
            for (var i = 0; i < length2; i++) {
                values2[i] = curves2[i].getValues(matrix2);
            }
        }
        var boundsCollisions = CollisionDetection.findCurveBoundsCollisions(
                values1, values2, epsilon);
        for (var index1 = 0; index1 < length1; index1++) {
            var curve1 = curves1[index1],
                v1 = values1[index1];
            if (self) {
                // First check for self-intersections within the same curve.
                getSelfIntersection(v1, curve1, locations, include);
            }
            // Check for intersections with potentially intersecting curves.
            var collisions1 = boundsCollisions[index1];
            if (collisions1) {
                for (var j = 0; j < collisions1.length; j++) {
                    // There might be already one location from the above
                    // self-intersection check:
                    if (_returnFirst && locations.length)
                        return locations;
                    var index2 = collisions1[j];
                    if (!self || index2 > index1) {
                        var curve2 = curves2[index2],
                            v2 = values2[index2];
                        getCurveIntersections(
                                v1, v2, curve1, curve2, locations, include);
                    }
                }
            }
        }
        return locations;
    }

    /**
     * Code to detect overlaps of intersecting based on work by
     * @iconexperience in #648
     */
    function getOverlaps(v1, v2) {
        // Linear curves can only overlap if they are collinear. Instead of
        // using the #isCollinear() check, we pick the longer of the two curves
        // treated as lines, and see how far the starting and end points of the
        // other line are from this line (assumed as an infinite line). But even
        // if the curves are not straight, they might just have tiny handles
        // within geometric epsilon distance, so we have to check for that too.

        function getSquaredLineLength(v) {
            var x = v[6] - v[0],
                y = v[7] - v[1];
            return x * x + y * y;
        }

        var abs = Math.abs,
            getDistance = Line.getDistance,
            timeEpsilon = /*#=*/Numerical.CURVETIME_EPSILON,
            geomEpsilon = /*#=*/Numerical.GEOMETRIC_EPSILON,
            straight1 = Curve.isStraight(v1),
            straight2 = Curve.isStraight(v2),
            straightBoth = straight1 && straight2,
            flip = getSquaredLineLength(v1) < getSquaredLineLength(v2),
            l1 = flip ? v2 : v1,
            l2 = flip ? v1 : v2,
            // Get l1 start and end point values for faster referencing.
            px = l1[0], py = l1[1],
            vx = l1[6] - px, vy = l1[7] - py;
        // See if the starting and end point of curve two are very close to the
        // picked line. Note that the curve for the picked line might not
        // actually be a line, so we have to perform more checks after.
        if (getDistance(px, py, vx, vy, l2[0], l2[1], true) < geomEpsilon &&
            getDistance(px, py, vx, vy, l2[6], l2[7], true) < geomEpsilon) {
            // If not both curves are straight, check against both of their
            // handles, and treat them as straight if they are very close.
            if (!straightBoth &&
                getDistance(px, py, vx, vy, l1[2], l1[3], true) < geomEpsilon &&
                getDistance(px, py, vx, vy, l1[4], l1[5], true) < geomEpsilon &&
                getDistance(px, py, vx, vy, l2[2], l2[3], true) < geomEpsilon &&
                getDistance(px, py, vx, vy, l2[4], l2[5], true) < geomEpsilon) {
                straight1 = straight2 = straightBoth = true;
            }
        } else if (straightBoth) {
            // If both curves are straight and not very close to each other,
            // there can't be a solution.
            return null;
        }
        if (straight1 ^ straight2) {
            // If one curve is straight, the other curve must be straight too,
            // otherwise they cannot overlap.
            return null;
        }

        var v = [v1, v2],
            pairs = [];
        // Iterate through all end points:
        // First p1 of curve 1 & 2, then p2 of curve 1 & 2.
        for (var i = 0; i < 4 && pairs.length < 2; i++) {
            var i1 = i & 1,  // 0, 1, 0, 1
                i2 = i1 ^ 1, // 1, 0, 1, 0
                t1 = i >> 1, // 0, 0, 1, 1
                t2 = Curve.getTimeOf(v[i1], new Point(
                    v[i2][t1 ? 6 : 0],
                    v[i2][t1 ? 7 : 1]));
            if (t2 != null) {  // If point is on curve
                var pair = i1 ? [t1, t2] : [t2, t1];
                // Filter out tiny overlaps.
                if (!pairs.length ||
                    abs(pair[0] - pairs[0][0]) > timeEpsilon &&
                    abs(pair[1] - pairs[0][1]) > timeEpsilon) {
                    pairs.push(pair);
                }
            }
            // We checked 3 points but found no match, curves can't overlap.
            if (i > 2 && !pairs.length)
                break;
        }
        if (pairs.length !== 2) {
            pairs = null;
        } else if (!straightBoth) {
            // Straight pairs don't need further checks. If we found 2 pairs,
            // the end points on v1 & v2 should be the same.
            var o1 = Curve.getPart(v1, pairs[0][0], pairs[1][0]),
                o2 = Curve.getPart(v2, pairs[0][1], pairs[1][1]);
            // Check if handles of the overlapping curves are the same too.
            if (abs(o2[2] - o1[2]) > geomEpsilon ||
                abs(o2[3] - o1[3]) > geomEpsilon ||
                abs(o2[4] - o1[4]) > geomEpsilon ||
                abs(o2[5] - o1[5]) > geomEpsilon)
                pairs = null;
        }
        return pairs;
    }

    /**
     * Internal method to calculates the curve-time parameters where the curve
     * is tangential to provided tangent.
     * Tangents at the start or end are included.
     *
     * @param {Number[]} v curve values
     * @param {Point} tangent the tangent to which the curve must be tangential
     * @return {Number[]} at most two curve-time parameters, where the curve is
     * tangential to the given tangent
     */
    function getTimesWithTangent(v, tangent) {
        // Algorithm adapted from: https://stackoverflow.com/a/34837312/7615922
        var x0 = v[0], y0 = v[1],
            x1 = v[2], y1 = v[3],
            x2 = v[4], y2 = v[5],
            x3 = v[6], y3 = v[7],
            normalized = tangent.normalize(),
            tx = normalized.x,
            ty = normalized.y,
            ax = 3 * x3 - 9 * x2 + 9 * x1 - 3 * x0,
            ay = 3 * y3 - 9 * y2 + 9 * y1 - 3 * y0,
            bx = 6 * x2 - 12 * x1 + 6 * x0,
            by = 6 * y2 - 12 * y1 + 6 * y0,
            cx = 3 * x1 - 3 * x0,
            cy = 3 * y1 - 3 * y0,
            den = 2 * ax * ty - 2 * ay * tx,
            times = [];
        if (Math.abs(den) < Numerical.CURVETIME_EPSILON) {
            var num = ax * cy - ay * cx,
                den = ax * by - ay * bx;
            if (den != 0) {
                var t = -num / den;
                if (t >= 0 && t <= 1) times.push(t);
            }
        } else {
            var delta = (bx * bx - 4 * ax * cx) * ty * ty +
                (-2 * bx * by + 4 * ay * cx + 4 * ax * cy) * tx * ty +
                (by * by - 4 * ay * cy) * tx * tx,
                k = bx * ty - by * tx;
            if (delta >= 0 && den != 0) {
                var d = Math.sqrt(delta),
                    t0 = -(k + d) / den,
                    t1 = (-k + d) / den;
                if (t0 >= 0 && t0 <= 1) times.push(t0);
                if (t1 >= 0 && t1 <= 1) times.push(t1);
            }
        }
        return times;
    }

    return /** @lends Curve# */{
        /**
         * Returns all intersections between two {@link Curve} objects as an
         * array of {@link CurveLocation} objects.
         *
         * @param {Curve} curve the other curve to find the intersections with
         *     (if the curve itself or `null` is passed, the self intersection
         *     of the curve is returned, if it exists)
         * @return {CurveLocation[]} the locations of all intersections between
         *     the curves
         */
        getIntersections: function(curve) {
            var v1 = this.getValues(),
                v2 = curve && curve !== this && curve.getValues();
            return v2 ? getCurveIntersections(v1, v2, this, curve, [])
                      : getSelfIntersection(v1, this, []);
        },

        statics: /** @lends Curve */{
            getOverlaps: getOverlaps,
            // Exposed for use in boolean offsetting
            getIntersections: getIntersections,
            getCurveLineIntersections: getCurveLineIntersections,
            getTimesWithTangent: getTimesWithTangent
        }
    };
});
