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
        } else if (count === 0) {
            seg1 = new Segment();
            seg2 = new Segment();
        } else if (count === 1) {
            // new Segment(segment);
            // Note: This copies from existing segments through bean getters
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

    _serialize: function(options) {
        // If it has no handles, only serialize points, otherwise handles too.
        return Base.serialize(this.hasHandles()
                ? [this.getPoint1(), this.getHandle1(), this.getHandle2(),
                    this.getPoint2()]
                : [this.getPoint1(), this.getPoint2()],
                options, true);
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
                this._segment1._handleOut.set(handleOut.x, handleOut.y);
        }
        return removed;
    },

    /**
     * The first anchor point of the curve.
     *
     * @type Point
     * @bean
     */
    getPoint1: function() {
        return this._segment1._point;
    },

    setPoint1: function(/* point */) {
        var point = Point.read(arguments);
        this._segment1._point.set(point.x, point.y);
    },

    /**
     * The second anchor point of the curve.
     *
     * @type Point
     * @bean
     */
    getPoint2: function() {
        return this._segment2._point;
    },

    setPoint2: function(/* point */) {
        var point = Point.read(arguments);
        this._segment2._point.set(point.x, point.y);
    },

    /**
     * The handle point that describes the tangent in the first anchor point.
     *
     * @type Point
     * @bean
     */
    getHandle1: function() {
        return this._segment1._handleOut;
    },

    setHandle1: function(/* point */) {
        var point = Point.read(arguments);
        this._segment1._handleOut.set(point.x, point.y);
    },

    /**
     * The handle point that describes the tangent in the second anchor point.
     *
     * @type Point
     * @bean
     */
    getHandle2: function() {
        return this._segment2._handleIn;
    },

    setHandle2: function(/* point */) {
        var point = Point.read(arguments);
        this._segment2._handleIn.set(point.x, point.y);
    },

    /**
     * The first segment of the curve.
     *
     * @type Segment
     * @bean
     */
    getSegment1: function() {
        return this._segment1;
    },

    /**
     * The second segment of the curve.
     *
     * @type Segment
     * @bean
     */
    getSegment2: function() {
        return this._segment2;
    },

    /**
     * The path that the curve belongs to.
     *
     * @type Path
     * @bean
     */
    getPath: function() {
        return this._path;
    },

    /**
     * The index of the curve in the {@link Path#curves} array.
     *
     * @type Number
     * @bean
     */
    getIndex: function() {
        return this._segment1._index;
    },

    /**
     * The next curve in the {@link Path#curves} array that the curve
     * belongs to.
     *
     * @type Curve
     * @bean
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
     * @type Curve
     * @bean
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
        return this._segment1._index === 0;
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
     * @type Boolean
     * @bean
     */
    isSelected: function() {
        return this.getPoint1().isSelected()
                && this.getHandle2().isSelected()
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
     * @type Number[]
     * @bean
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
     * @type Point[]
     * @bean
     */
    getPoints: function() {
        // Convert to array of absolute points
        var coords = this.getValues(),
            points = [];
        for (var i = 0; i < 8; i += 2)
            points.push(new Point(coords[i], coords[i + 1]));
        return points;
    },

    /**
     * The approximated length of the curve.
     *
     * @type Number
     * @bean
     */
    getLength: function() {
        if (this._length == null)
            this._length = Curve.getLength(this.getValues(), 0, 1);
        return this._length;
    },

    /**
     * The area that the curve's geometry is covering.
     *
     * @type Number
     * @bean
     */
    getArea: function() {
        return Curve.getArea(this.getValues());
    },

    /**
     * @type Line
     * @bean
     * @private
     */
    getLine: function() {
        return new Line(this._segment1._point, this._segment2._point);
    },

    /**
     * Creates a new curve as a sub-curve from this curve, its range defined by
     * the given parameters. If {@code from} is larger than {@code to}, then
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

    /**
     * Returns all intersections between two {@link Curve} objects as an array
     * of {@link CurveLocation} objects.
     *
     * @param {Curve} curve the other curve to find the intersections with (if
     * the curve itself or {@code null} is passed, the self intersection of the
     * curve is returned, if it exists)
     * @return {CurveLocation[]} the locations of all intersections between the
     * curves
     */
    getIntersections: function(curve) {
        return Curve._getIntersections(this.getValues(),
                curve && curve !== this ? curve.getValues() : null,
                this, curve, [], {});
    },

    // TODO: adjustThroughPoint

    /**
     * Private method that handles all types of offset / isParameter pairs and
     * converts it to a curve parameter.
     */
    _getParameter: function(offset, isParameter) {
        return isParameter
                ? offset
                // Accept CurveLocation objects, and objects that act like
                // them:
                : offset && offset.curve === this
                    ? offset.parameter
                    : offset === undefined && isParameter === undefined
                        ? 0.5 // default is in the middle
                        : this.getParameterAt(offset, 0);
    },

    /**
     * Divides the curve into two curves at the given offset. The curve itself
     * is modified and becomes the first part, the second part is returned as a
     * new curve. If the modified curve belongs to a path item, the second part
     * is also added to the path.
     *
     * @name Curve#divide
     * @function
     * @param {Number} [offset=0.5] the offset on the curve at which to split,
     * or the curve time parameter if {@code isParameter} is {@code true}
     * @param {Boolean} [isParameter=false] pass {@code true} if {@code offset}
     * is a curve time parameter
     * @return {Curve} the second part of the divided curve, if the offset
     * is within the valid range, {code null} otherwise.
     */
    // TODO: Rename to divideAt()?
    divide: function(offset, isParameter, _setHandles) {
        var parameter = this._getParameter(offset, isParameter),
            tMin = /*#=*/Numerical.CURVETIME_EPSILON,
            tMax = 1 - tMin,
            res = null;
        // Only divide if not at the beginning or end.
        if (parameter >= tMin && parameter <= tMax) {
            var parts = Curve.subdivide(this.getValues(), parameter),
                left = parts[0],
                right = parts[1],
                setHandles = _setHandles || this.hasHandles(),
                segment1 = this._segment1,
                segment2 = this._segment2,
                path = this._path;
            if (setHandles) {
                // Adjust the handles on the existing segments. The new segment
                // will be inserted between the existing segment1 and segment2:
                // Convert absolute -> relative
                segment1._handleOut.set(left[2] - left[0],
                        left[3] - left[1]);
                segment2._handleIn.set(right[4] - right[6],
                        right[5] - right[7]);
            }
            // Create the new segment:
            var x = left[6], y = left[7],
                segment = new Segment(new Point(x, y),
                        setHandles && new Point(left[4] - x, left[5] - y),
                        setHandles && new Point(right[2] - x, right[3] - y));
            // Insert it in the segments list, if needed:
            if (path) {
                // By inserting at segment1.index + 1, we make sure to insert at
                // the end if this curve is a closing curve of a closed path,
                // as with segment2.index it would be inserted at 0.
                path.insert(segment1._index + 1, segment);
                // The newly inserted segment is the start of the next curve:
                res = this.getNext();
            } else {
                // otherwise create it from the result of split
                this._segment2 = segment;
                res = new Curve(segment, segment2);
            }
        }
        return res;
    },

    /**
     * Splits the path this curve belongs to at the given offset. After
     * splitting, the path will be open. If the path was open already, splitting
     * will result in two paths.
     *
     * @name Curve#split
     * @function
     * @param {Number} [offset=0.5] the offset on the curve at which to split,
     * or the curve time parameter if {@code isParameter} is {@code true}
     * @param {Boolean} [isParameter=false] pass {@code true} if {@code offset}
     * is a curve time parameter
     * @return {Path} the newly created path after splitting, if any
     * @see Path#split(index, parameter)
     */
    // TODO: Rename to splitAt()?
    split: function(offset, isParameter) {
        return this._path
            ? this._path.split(this._segment1._index,
                    this._getParameter(offset, isParameter))
            : null;
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
        this._segment1._handleOut.set(0, 0);
        this._segment2._handleIn.set(0, 0);
    },

statics: {
    getValues: function(segment1, segment2, matrix) {
        var p1 = segment1._point,
            h1 = segment1._handleOut,
            h2 = segment2._handleIn,
            p2 = segment2._point,
            values = [
                p1._x, p1._y,
                p1._x + h1._x, p1._y + h1._y,
                p2._x + h2._x, p2._y + h2._y,
                p2._x, p2._y
            ];
        if (matrix)
            matrix._transformCoordinates(values, values, 4);
        return values;
    },

    subdivide: function(v, t) {
        var p1x = v[0], p1y = v[1],
            c1x = v[2], c1y = v[3],
            c2x = v[4], c2y = v[5],
            p2x = v[6], p2y = v[7];
        if (t === undefined)
            t = 0.5;
        // Triangle computation, with loops unrolled.
        var u = 1 - t,
            // Interpolate from 4 to 3 points
            p3x = u * p1x + t * c1x, p3y = u * p1y + t * c1y,
            p4x = u * c1x + t * c2x, p4y = u * c1y + t * c2y,
            p5x = u * c2x + t * p2x, p5y = u * c2y + t * p2y,
            // Interpolate from 3 to 2 points
            p6x = u * p3x + t * p4x, p6y = u * p3y + t * p4y,
            p7x = u * p4x + t * p5x, p7y = u * p4y + t * p5y,
            // Interpolate from 2 points to 1 point
            p8x = u * p6x + t * p7x, p8y = u * p6y + t * p7y;
        // We now have all the values we need to build the sub-curves:
        return [
            [p1x, p1y, p3x, p3y, p6x, p6y, p8x, p8y], // left
            [p8x, p8y, p7x, p7y, p5x, p5y, p2x, p2y] // right
        ];
    },

    // Converts from the point coordinates (p1, c1, c2, p2) for one axis to
    // the polynomial coefficients and solves the polynomial for val
    solveCubic: function (v, coord, val, roots, min, max) {
        var p1 = v[coord],
            c1 = v[coord + 2],
            c2 = v[coord + 4],
            p2 = v[coord + 6],
            c = 3 * (c1 - p1),
            b = 3 * (c2 - c1) - c,
            a = p2 - p1 - c - b;
        return Numerical.solveCubic(a, b, c, p1 - val, roots, min, max);
    },

    getParameterOf: function(v, point) {
        // Before solving cubics, compare the beginning and end of the curve
        // with zero epsilon:
        var p1 = new Point(v[0], v[1]),
            p2 = new Point(v[6], v[7]),
            epsilon = /*#=*/Numerical.EPSILON,
            t = point.isClose(p1, epsilon) ? 0
              : point.isClose(p2, epsilon) ? 1
              : null;
        if (t !== null)
            return t;
        // Solve the cubic for both x- and y-coordinates and consider all found
        // solutions, testing with the larger / looser geometric epsilon.
        var coords = [point.x, point.y],
            roots = [],
            geomEpsilon = /*#=*/Numerical.GEOMETRIC_EPSILON;
        for (var c = 0; c < 2; c++) {
            var count = Curve.solveCubic(v, c, coords[c], roots, 0, 1);
            for (var i = 0; i < count; i++) {
                t = roots[i];
                if (point.isClose(Curve.getPoint(v, t), geomEpsilon))
                    return t;
            }
        }
        // For very short curves (length ~ 1e-13), the above code will not
        // necessarily produce any valid roots. As a fall-back, just check the
        // beginnings and ends at the end so we can still return a valid result.
        return point.isClose(p1, geomEpsilon) ? 0
             : point.isClose(p2, geomEpsilon) ? 1
             : null;
    },

    getNearestParameter: function(v, point) {
        if (Curve.isStraight(v)) {
            var p1x = v[0], p1y = v[1],
                p2x = v[6], p2y = v[7],
                vx = p2x - p1x, vy = p2y - p1y,
                det = vx * vx + vy * vy;
            // Avoid divisions by zero.
            if (det === 0)
                return 0;
            // Project the point onto the line and calculate its linear
            // parameter u along the line: u = (point - p1).dot(v) / v.dot(v)
            var u = ((point.x - p1x) * vx + (point.y - p1y) * vy) / det;
            return u < /*#=*/Numerical.EPSILON ? 0
                 : u > /*#=*/(1 - Numerical.EPSILON) ? 1
                 : Curve.getParameterOf(v,
                    new Point(p1x + u * vx, p1y + u * vy));
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

    hasHandles: function(v) {
        var isZero = Numerical.isZero;
        return !(isZero(v[0] - v[2]) && isZero(v[1] - v[3])
                && isZero(v[4] - v[6]) && isZero(v[5] - v[7]));
    },

    isFlatEnough: function(v, tolerance) {
        // Thanks to Kaspar Fischer and Roger Willcocks for the following:
        // http://hcklbrrfnn.files.wordpress.com/2012/08/bez.pdf
        var p1x = v[0], p1y = v[1],
            c1x = v[2], c1y = v[3],
            c2x = v[4], c2y = v[5],
            p2x = v[6], p2y = v[7],
            ux = 3 * c1x - 2 * p1x - p2x,
            uy = 3 * c1y - 2 * p1y - p2y,
            vx = 3 * c2x - 2 * p2x - p1x,
            vy = 3 * c2y - 2 * p2y - p1y;
        return Math.max(ux * ux, vx * vx) + Math.max(uy * uy, vy * vy)
                < 10 * tolerance * tolerance;
    },

    getArea: function(v) {
        // This is a combination of the methods to decide if a path is clockwise
        // and to calculate the area, as described here:
        // http://objectmix.com/graphics/133553-area-closed-bezier-curve.html
        // http://stackoverflow.com/questions/1165647
        // We treat the curve points and handles as the outline of a polygon of
        // which we determine the orientation using the method of calculating
        // the sum over the edges. This will work even with non-convex polygons,
        // telling you whether it's mostly clockwise.
        // With bezier curves, the trick appears to be to calculate edge sum
        // with half the handles' lengths, and then:
        // area = 6 * edge-sum / 10
        var p1x = v[0], p1y = v[1],
            p2x = v[6], p2y = v[7],
            h1x = (v[2] + p1x) / 2,
            h1y = (v[3] + p1y) / 2,
            h2x = (v[4] + v[6]) / 2,
            h2y = (v[5] + v[7]) / 2;
        return 6 * ((p1x - h1x) * (h1y + p1y)
                  + (h1x - h2x) * (h2y + h1y)
                  + (h2x - p2x) * (p2y + h2y)) / 10;
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
     * Note: padding is only used for Path.getBounds().
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
        // Calculate derivative of our bezier polynomial, divided by 3.
        // Doing so allows for simpler calculations of a, b, c and leads to the
        // same quadratic roots.
        var a = 3 * (v1 - v2) - v0 + v3,
            b = 2 * (v0 + v2) - 4 * v1,
            c = v1 - v0,
            count = Numerical.solveQuadratic(a, b, c, roots),
            // Add some tolerance for good roots, as t = 0, 1 are added
            // separately anyhow, and we don't want joins to be added with radii
            // in getStrokeBounds()
            tMin = /*#=*/Numerical.CURVETIME_EPSILON,
            tMax = 1 - tMin;
        // Only add strokeWidth to bounds for points which lie  within 0 < t < 1
        // The corner cases for cap and join are handled in getStrokeBounds()
        add(v3, 0);
        for (var i = 0; i < count; i++) {
            var t = roots[i],
                u = 1 - t;
            // Test for good roots and only add to bounds if good.
            if (tMin < t && t < tMax)
                // Calculate bezier polynomial at t.
                add(u * u * u * v0
                    + 3 * u * u * t * v1
                    + 3 * u * t * t * v2
                    + t * t * t * v3,
                    padding);
        }
    }
}}, Base.each(
    ['getBounds', 'getStrokeBounds', 'getHandleBounds', 'getRoughBounds'],
    // Note: Although Curve.getBounds() exists, we are using Path.getBounds() to
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
                var path = this._path;
                bounds = this._bounds[name] = Path[name](
                        [this._segment1, this._segment2], false,
                        path && path.getStyle());
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
     * The rough bounding rectangle of the curve that is shure to include all of
     * the drawing, including stroke width.
     *
     * @name Curve#roughBounds
     * @type Rectangle
     * @ignore
     */
}), Base.each({ // Injection scope for tests both as instance and static methods
    isStraight: function(l, h1, h2) {
        if (h1.isZero() && h2.isZero()) {
            // No handles.
            return true;
        } else if (l.isZero()) {
            // Zero-length line, with some handles defined.
            return false;
        } else if (h1.isCollinear(l) && h2.isCollinear(l)) {
            // Collinear handles. Project them onto line to see if they are
            // within the line's range:
            var div = l.dot(l),
                p1 = l.dot(h1) / div,
                p2 = l.dot(h2) / div;
            return p1 >= 0 && p1 <= 1 && p2 <= 0 && p2 >= -1;
        }
        return false;
    },

    isLinear: function(l, h1, h2) {
        var third = l.divide(3);
        return h1.equals(third) && h2.negate().equals(third);
    }
}, function(test, name) {
    // Produce the instance version that is called on curve object.
    this[name] = function() {
        var seg1 = this._segment1,
            seg2 = this._segment2;
        return test(seg2._point.subtract(seg1._point),
                seg1._handleOut, seg2._handleIn);
    };

    // Produce the static version that handles a curve values array.
    this.statics[name] = function(v) {
        var p1x = v[0], p1y = v[1],
            p2x = v[6], p2y = v[7];
        return test(new Point(p2x - p1x, p2y - p1y),
                new Point(v[2] - p1x, v[3] - p1y),
                new Point(v[4] - p2x, v[5] - p2y));
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
        return this.isStraight() && Math.abs(this.getTangentAt(0.5, true).y)
                < /*#=*/Numerical.TRIGONOMETRIC_EPSILON;
    },

    /**
     * Checks if the curve is a straight vertical line.
     *
     * @return {Boolean} {@true if the line is vertical}
     */
    isVertical: function() {
        return this.isStraight() && Math.abs(this.getTangentAt(0.5, true).x)
                < /*#=*/Numerical.TRIGONOMETRIC_EPSILON;
    }
}), /** @lends Curve# */{
    // Explicitly deactivate the creation of beans, as we have functions here
    // that look like bean getters but actually read arguments.
    // See #getParameterOf(), #getLocationOf(), #getNearestLocation(), ...
    beans: false,

    /**
     * {@grouptitle Positions on Curves}
     *
     * Calculates the curve time parameter of the specified offset on the path,
     * relative to the provided start parameter. If offset is a negative value,
     * the parameter is searched to the left of the start parameter. If no start
     * parameter is provided, a default of {@code 0} for positive values of
     * {@code offset} and {@code 1} for negative values of {@code offset}.
     *
     * @param {Number} offset
     * @param {Number} [start]
     * @return {Number} the curve time parameter at the specified offset
     */
    getParameterAt: function(offset, start) {
        return Curve.getParameterAt(this.getValues(), offset, start);
    },

    /**
     * Returns the curve time parameter of the specified point if it lies on the
     * curve, {@code null} otherwise.
     *
     * @param {Point} point the point on the curve
     * @return {Number} the curve time parameter of the specified point
     */
    getParameterOf: function(/* point */) {
        return Curve.getParameterOf(this.getValues(), Point.read(arguments));
    },

    /**
     * Calculates the curve location at the specified offset or curve time
     * parameter.
     *
     * @param {Number} offset the offset on the curve, or the curve time
     * parameter if {@code isParameter} is {@code true}
     * @param {Boolean} [isParameter=false] pass {@code true} if {@code offset}
     * is a curve time parameter
     * @return {CurveLocation} the curve location at the specified the offset
     */
    getLocationAt: function(offset, isParameter) {
        var t = isParameter ? offset : this.getParameterAt(offset);
        return t != null && t >= 0 && t <= 1
                ? new CurveLocation(this, t)
                : null;
    },

    /**
     * Returns the curve location of the specified point if it lies on the
     * curve, {@code null} otherwise.
     *
     * @param {Point} point the point on the curve
     * @return {CurveLocation} the curve location of the specified point
     */
    getLocationOf: function(/* point */) {
        return this.getLocationAt(this.getParameterOf(Point.read(arguments)),
                true);
    },

    /**
     * Returns the length of the path from its beginning up to up to the
     * specified point if it lies on the path, {@code null} otherwise.
     *
     * @param {Point} point the point on the path
     * @return {Number} the length of the path up to the specified point
     */
    getOffsetOf: function(/* point */) {
        var loc = this.getLocationOf.apply(this, arguments);
        return loc ? loc.getOffset() : null;
    },

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
            t = Curve.getNearestParameter(values, point),
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
        return this.getNearestLocation.apply(this, arguments).getPoint();
    }

    /**
     * Calculates the point on the curve at the given offset.
     *
     * @name Curve#getPointAt
     * @function
     * @param {Number} offset the offset on the curve, or the curve time
     * parameter if {@code isParameter} is {@code true}
     * @param {Boolean} [isParameter=false] pass {@code true} if {@code offset}
     * is a curve time parameter
     * @return {Point} the point on the curve at the given offset
     */

    /**
     * Calculates the normalized tangent vector of the curve at the given
     * offset.
     *
     * @name Curve#getTangentAt
     * @function
     * @param {Number} offset the offset on the curve, or the curve time
     * parameter if {@code isParameter} is {@code true}
     * @param {Boolean} [isParameter=false] pass {@code true} if {@code offset}
     * is a curve time parameter
     * @return {Point} the normalized tangent of the curve at the given offset
     */

    /**
     * Calculates the normal vector of the curve at the given offset.
     *
     * @name Curve#getNormalAt
     * @function
     * @param {Number} offset the offset on the curve, or the curve time
     * parameter if {@code isParameter} is {@code true}
     * @param {Boolean} [isParameter=false] pass {@code true} if {@code offset}
     * is a curve time parameter
     * @return {Point} the normal of the curve at the given offset
     */

    /**
     * Calculates the weighted tangent vector of the curve at the given
     * offset, its length reflecting the curve velocity at that location.
     *
     * @name Curve#getWeightedTangentAt
     * @function
     * @param {Number} offset the offset on the curve, or the curve time
     * parameter if {@code isParameter} is {@code true}
     * @param {Boolean} [isParameter=false] pass {@code true} if {@code offset}
     * is a curve time parameter
     * @return {Point} the weighted tangent of the curve at the given offset
     */

    /**
     * Calculates the weighted normal vector of the curve at the given offset,
     * its length reflecting the curve velocity at that location.
     *
     * @name Curve#getWeightedNormalAt
     * @function
     * @param {Number} offset the offset on the curve, or the curve time
     * parameter if {@code isParameter} is {@code true}
     * @param {Boolean} [isParameter=false] pass {@code true} if {@code offset}
     * is a curve time parameter
     * @return {Point} the weighted normal of the curve at the given offset
     */

    /**
     * Calculates the curvature of the curve at the given offset. Curvatures
     * indicate how sharply a curve changes direction. A straight line has zero
     * curvature, where as a circle has a constant curvature. The curve's radius
     * at the given offset is the reciprocal value of its curvature.
     *
     * @name Curve#getCurvatureAt
     * @function
     * @param {Number} offset the offset on the curve, or the curve time
     * parameter if {@code isParameter} is {@code true}
     * @param {Boolean} [isParameter=false] pass {@code true} if {@code offset}
     * is a curve time parameter
     * @return {Number} the curvature of the curve at the given offset
     */
},
new function() { // // Scope to inject various curve evaluation methods
    var methods = ['getPoint', 'getTangent', 'getNormal', 'getWeightedTangent',
        'getWeightedNormal', 'getCurvature'];
    return Base.each(methods,
    // Note: Although Curve.getBounds() exists, we are using Path.getBounds() to
    // determine the bounds of Curve objects with defined segment1 and segment2
    // values Curve.getBounds() can be used directly on curve arrays, without
    // the need to create a Curve object first, as required by the code that
    // finds path intersections.
    function(name) {
        this[name + 'At'] = function(offset, isParameter) {
            var values = this.getValues();
            return Curve[name](values, isParameter ? offset
                    : Curve.getParameterAt(values, offset, 0));
        };
    }, {
        statics: {
            evaluateMethods: methods
        }
    });
},
new function() { // Scope for methods that require private functions

    function getLengthIntegrand(v) {
        // Calculate the coefficients of a Bezier derivative.
        var p1x = v[0], p1y = v[1],
            c1x = v[2], c1y = v[3],
            c2x = v[4], c2y = v[5],
            p2x = v[6], p2y = v[7],

            ax = 9 * (c1x - c2x) + 3 * (p2x - p1x),
            bx = 6 * (p1x + c2x) - 12 * c1x,
            cx = 3 * (c1x - p1x),

            ay = 9 * (c1y - c2y) + 3 * (p2y - p1y),
            by = 6 * (p1y + c2y) - 12 * c1y,
            cy = 3 * (c1y - p1y);

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
        var p1x = v[0], p1y = v[1],
            c1x = v[2], c1y = v[3],
            c2x = v[4], c2y = v[5],
            p2x = v[6], p2y = v[7],
            tMin = /*#=*/Numerical.CURVETIME_EPSILON,
            tMax = 1 - tMin,
            x, y;

        // Handle special case at beginning / end of curve
        if (type === 0 && (t < tMin || t > tMax)) {
            var isZero = t < tMin;
            x = isZero ? p1x : p2x;
            y = isZero ? p1y : p2y;
        } else {
            // Calculate the polynomial coefficients.
            var cx = 3 * (c1x - p1x),
                bx = 3 * (c2x - c1x) - cx,
                ax = p2x - p1x - cx - bx,

                cy = 3 * (c1y - p1y),
                by = 3 * (c2y - c1y) - cy,
                ay = p2y - p1y - cy - by;
            if (type === 0) {
                // Calculate the curve point at parameter value t
                x = ((ax * t + bx) * t + cx) * t + p1x;
                y = ((ay * t + by) * t + cy) * t + p1y;
            } else {
                // 1: tangent, 1st derivative
                // 2: normal, 1st derivative
                // 3: curvature, 1st derivative & 2nd derivative
                // Simply use the derivation of the bezier function for both
                // the x and y coordinates:
                // Prevent tangents and normals of length 0:
                // http://stackoverflow.com/questions/10506868/
                if (t < tMin) {
                    x = cx;
                    y = cy;
                } else if (t > tMax) {
                    x = 3 * (p2x - c2x);
                    y = 3 * (p2y - c2y);
                } else {
                    x = (3 * ax * t + 2 * bx) * t + cx;
                    y = (3 * ay * t + 2 * by) * t + cy;
                }
                if (normalized) {
                    // When the tangent at t is zero and we're at the beginning
                    // or the end, we can use the vector between the handles,
                    // but only when normalizing as its weighted length is 0.
                    if (x === 0 && y === 0 && (t < tMin || t > tMax)) {
                        x = c2x - c1x;
                        y = c2y - c1y;
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
        }
        // The normal is simply the rotated tangent:
        return type === 2 ? new Point(y, -x) : new Point(x, y);
    }

    return { statics: {

        getLength: function(v, a, b) {
            if (a === undefined)
                a = 0;
            if (b === undefined)
                b = 1;
            if (a === 0 && b === 1 && Curve.isStraight(v)) {
                // The length of straight curves can be calculated more easily.
                var dx = v[6] - v[0], // p2x - p1x
                    dy = v[7] - v[1]; // p2y - p1y
                return Math.sqrt(dx * dx + dy * dy);
            }
            var ds = getLengthIntegrand(v);
            return Numerical.integrate(ds, a, b, getIterations(a, b));
        },

        getParameterAt: function(v, offset, start) {
            if (start === undefined)
                start = offset < 0 ? 1 : 0;
            if (offset === 0)
                return start;
            // See if we're going forward or backward, and handle cases
            // differently
            var abs = Math.abs,
                forward = offset > 0,
                a = forward ? start : 0,
                b = forward ? 1 : start,
                // Use integrand to calculate both range length and part
                // lengths in f(t) below.
                ds = getLengthIntegrand(v),
                // Get length of total range
                rangeLength = Numerical.integrate(ds, a, b,
                        getIterations(a, b));
            if (abs(offset - rangeLength) < /*#=*/Numerical.EPSILON) {
                // Matched the end:
                return forward ? b : a;
            } else if (abs(offset) > rangeLength) {
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
            // NOTE: guess is a negative value when not looking forward.
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
        }
    }};
},
new function() { // Scope for intersection using bezier fat-line clipping

    function addLocation(locations, param, v1, c1, t1, p1, v2, c2, t2, p2,
            overlap) {
        var startConnected = param.startConnected,
            endConnected = param.endConnected,
            tMin = /*#=*/Numerical.CURVETIME_EPSILON,
            tMax = 1 - tMin;
        if (t1 == null)
            t1 = Curve.getParameterOf(v1, p1);
        // Check t1 and t2 against correct bounds, based on start-/endConnected:
        // - startConnected means the start of c1 connects to the end of c2
        // - endConneted means the end of c1 connects to the start of c2
        // - If either c1 or c2 are at the end of the path, exclude their end,
        //   which connects back to the beginning, but only if it's not part of
        //   a found overlap. The normal intersection will already be found at
        //   the beginning, and would be added twice otherwise.
        if (t1 !== null && t1 >= (startConnected ? tMin : 0) &&
            t1 <= (endConnected ? tMax : 1)) {
            if (t2 == null)
                t2 = Curve.getParameterOf(v2, p2);
            if (t2 !== null && t2 >= (endConnected ? tMin : 0) &&
                t2 <= (startConnected ? tMax : 1)) {
                var renormalize = param.renormalize;
                if (renormalize) {
                    var res = renormalize(t1, t2);
                    t1 = res[0];
                    t2 = res[1];
                }
                var loc1 = new CurveLocation(c1, t1,
                        p1 || Curve.getPoint(v1, t1), overlap),
                    loc2 = new CurveLocation(c2, t2,
                        p2 || Curve.getPoint(v2, t2), overlap),
                    // For self-intersections, detect the case where the second
                    // curve wrapped around, and flip them so they can get
                    // matched to a potentially already existing intersection.
                    flip = loc1.getPath() === loc2.getPath()
                        && loc1.getIndex() > loc2.getIndex(),
                    loc = flip ? loc2 : loc1,
                    include = param.include;
                // Link the two locations to each other.
                loc1._intersection = loc2;
                loc2._intersection = loc1;
                if (!include || include(loc)) {
                    CurveLocation.insert(locations, loc, true);
                }
            }
        }
    }

    function addCurveIntersections(v1, v2, c1, c2, locations, param,
            tMin, tMax, uMin, uMax, oldTDiff, reverse, recursion) {
        // Avoid deeper recursion.
        // NOTE: @iconexperience determined that more than 20 recursions are
        // needed sometimes, depending on the tDiff threshold values further
        // below when determining which curve converges the least. He also
        // recommended a threshold of 0.5 instead of the initial 0.8
        // See: https://github.com/paperjs/paper.js/issues/565
        if (++recursion >= 24)
            return;
        // Let P be the first curve and Q be the second
        var q0x = v2[0], q0y = v2[1], q3x = v2[6], q3y = v2[7],
            getSignedDistance = Line.getSignedDistance,
            // Calculate the fat-line L for Q is the baseline l and two
            // offsets which completely encloses the curve P.
            d1 = getSignedDistance(q0x, q0y, q3x, q3y, v2[2], v2[3]),
            d2 = getSignedDistance(q0x, q0y, q3x, q3y, v2[4], v2[5]),
            factor = d1 * d2 > 0 ? 3 / 4 : 4 / 9,
            dMin = factor * Math.min(0, d1, d2),
            dMax = factor * Math.max(0, d1, d2),
            // Calculate non-parametric bezier curve D(ti, di(t)) - di(t) is the
            // distance of P from the baseline l of the fat-line, ti is equally
            // spaced in [0, 1]
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
        // Clip the convex-hull with dMin and dMax, taking into account that
        // there will be no intersections if one of the tvalues are null.
        if ((tMinClip = clipConvexHull(top, bottom, dMin, dMax)) == null ||
            (tMaxClip = clipConvexHull(top.reverse(), bottom.reverse(),
                dMin, dMax)) == null)
            return;
        // Clip P with the fat-line for Q
        v1 = Curve.getPart(v1, tMinClip, tMaxClip);
        var tDiff = tMaxClip - tMinClip,
            // tMin and tMax are within the range (0, 1). We need to project it
            // to the original parameter range for v2.
            tMinNew = tMin + (tMax - tMin) * tMinClip,
            tMaxNew = tMin + (tMax - tMin) * tMaxClip;
        // Check if we need to subdivide the curves
        if (oldTDiff > 0.5 && tDiff > 0.5) {
            // Subdivide the curve which has converged the least.
            if (tMaxNew - tMinNew > uMax - uMin) {
                var parts = Curve.subdivide(v1, 0.5),
                    t = tMinNew + (tMaxNew - tMinNew) / 2;
                addCurveIntersections(
                    v2, parts[0], c2, c1, locations, param,
                    uMin, uMax, tMinNew, t, tDiff, !reverse, recursion);
                addCurveIntersections(
                    v2, parts[1], c2, c1, locations, param,
                    uMin, uMax, t, tMaxNew, tDiff, !reverse, recursion);
            } else {
                var parts = Curve.subdivide(v2, 0.5),
                    t = uMin + (uMax - uMin) / 2;
                addCurveIntersections(
                    parts[0], v1, c2, c1, locations, param,
                    uMin, t, tMinNew, tMaxNew, tDiff, !reverse, recursion);
                addCurveIntersections(
                    parts[1], v1, c2, c1, locations, param,
                    t, uMax, tMinNew, tMaxNew, tDiff, !reverse, recursion);
            }
        } else if (Math.max(uMax - uMin, tMaxNew - tMinNew)
                < /*#=*/Numerical.CLIPPING_EPSILON) {
            // We have isolated the intersection with sufficient precision
            var t1 = tMinNew + (tMaxNew - tMinNew) / 2,
                t2 = uMin + (uMax - uMin) / 2;
            // Since we've been chopping up v1 and v2, we need to pass on the
            // original full curves here again to match the parameter space of
            // t1 and t2.
            // TODO: Add two more arguments to addCurveIntersections after param
            // to pass on the sub-curves.
            v1 = c1.getValues();
            v2 = c2.getValues();
            addLocation(locations, param,
                reverse ? v2 : v1, reverse ? c2 : c1, reverse ? t2 : t1, null,
                reverse ? v1 : v2, reverse ? c1 : c2, reverse ? t1 : t2, null);
        } else if (tDiff > /*#=*/Numerical.EPSILON) { // Iterate
            addCurveIntersections(v2, v1, c2, c1, locations, param,
                    uMin, uMax, tMinNew, tMaxNew, tDiff, !reverse, recursion);
        }
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
    function addCurveLineIntersections(v1, v2, c1, c2, locations, param) {
        var flip = Curve.isStraight(v1),
            vc = flip ? v2 : v1,
            vl = flip ? v1 : v2,
            lx1 = vl[0], ly1 = vl[1],
            lx2 = vl[6], ly2 = vl[7],
            // Rotate both curve and line around l1 so that line is on x axis.
            ldx = lx2 - lx1,
            ldy = ly2 - ly1,
            // Calculate angle to the x-axis (1, 0).
            angle = Math.atan2(-ldy, ldx),
            sin = Math.sin(angle),
            cos = Math.cos(angle),
            // (rlx1, rly1) = (0, 0)
            // Calculate the curve values of the rotated curve.
            rvc = [];
        for(var i = 0; i < 8; i += 2) {
            var x = vc[i] - lx1,
                y = vc[i + 1] - ly1;
            rvc.push(
                x * cos - y * sin,
                x * sin + y * cos);
        }
        // Solve it for y = 0. We need to include t = 0, 1 and let addLocation()
        // do the filtering, to catch important edge cases.
        var roots = [],
            count = Curve.solveCubic(rvc, 1, 0, roots, 0, 1);
        // NOTE: count could be -1 for infinite solutions, but that should only
        // happen with lines, in which case we should not be here.
        for (var i = 0; i < count; i++) {
            // For each found solution on the rotated curve, get the point on
            // the real curve and with that the location on the line.
            var tc = roots[i],
                pc = Curve.getPoint(vc, tc),
                tl = Curve.getParameterOf(vl, pc);
            if (tl !== null) {
                var pl = Curve.getPoint(vl, tl),
                    t1 = flip ? tl : tc,
                    t2 = flip ? tc : tl;
                // If the two curves are connected and the 2nd is very short,
                // (l < Numerical.GEOMETRIC_EPSILON), we need to filter out an
                // invalid intersection at the beginning of this short curve.
                if (!param.endConnected || t2 > Numerical.CURVETIME_EPSILON) {
                    addLocation(locations, param,
                            v1, c1, t1, flip ? pl : pc,
                            v2, c2, t2, flip ? pc : pl);
                }
            }
        }
    }

    function addLineIntersection(v1, v2, c1, c2, locations, param) {
        var pt = Line.intersect(
                v1[0], v1[1], v1[6], v1[7],
                v2[0], v2[1], v2[6], v2[7]);
        if (pt) {
            addLocation(locations, param, v1, c1, null, pt, v2, c2, null, pt);
        }
    }

    return { statics: /** @lends Curve */{
        _getIntersections: function(v1, v2, c1, c2, locations, param) {
            if (!v2) {
                // If v2 is not provided, search for a self-intersection on v1.
                return Curve._getSelfIntersection(v1, c1, locations, param);
            }
            // Avoid checking curves if completely out of control bounds. As
            // a little optimization, we can scale the handles with 0.75
            // before calculating the control bounds and still be sure that
            // the curve is fully contained.
            var c1p1x = v1[0], c1p1y = v1[1],
                c1p2x = v1[6], c1p2y = v1[7],
                c2p1x = v2[0], c2p1y = v2[1],
                c2p2x = v2[6], c2p2y = v2[7],
                // 's' stands for scaled handles...
                c1s1x = (3 * v1[2] + c1p1x) / 4,
                c1s1y = (3 * v1[3] + c1p1y) / 4,
                c1s2x = (3 * v1[4] + c1p2x) / 4,
                c1s2y = (3 * v1[5] + c1p2y) / 4,
                c2s1x = (3 * v2[2] + c2p1x) / 4,
                c2s1y = (3 * v2[3] + c2p1y) / 4,
                c2s2x = (3 * v2[4] + c2p2x) / 4,
                c2s2y = (3 * v2[5] + c2p2y) / 4,
                min = Math.min,
                max = Math.max;
            if (!(  max(c1p1x, c1s1x, c1s2x, c1p2x) >=
                    min(c2p1x, c2s1x, c2s2x, c2p2x) &&
                    min(c1p1x, c1s1x, c1s2x, c1p2x) <=
                    max(c2p1x, c2s1x, c2s2x, c2p2x) &&
                    max(c1p1y, c1s1y, c1s2y, c1p2y) >=
                    min(c2p1y, c2s1y, c2s2y, c2p2y) &&
                    min(c1p1y, c1s1y, c1s2y, c1p2y) <=
                    max(c2p1y, c2s1y, c2s2y, c2p2y)))
                return locations;
            // Now detect and handle overlaps:
            if (!param.startConnected && !param.endConnected) {
                var overlaps = Curve.getOverlaps(v1, v2);
                if (overlaps) {
                    for (var i = 0; i < 2; i++) {
                        var overlap = overlaps[i];
                        addLocation(locations, param,
                            v1, c1, overlap[0], null,
                            v2, c2, overlap[1], null, true);
                    }
                    return locations;
                }
            }

            var straight1 = Curve.isStraight(v1),
                straight2 = Curve.isStraight(v2),
                straight = straight1 && straight2,
                // NOTE: Use smaller Numerical.EPSILON to compare beginnings and
                // end points to avoid matching them on almost collinear lines,
                // see: https://github.com/paperjs/paper.js/issues/777
                epsilon = /*#=*/Numerical.EPSILON,
                before = locations.length;
            // Determine the correct intersection method based on whether one or
            // curves are straight lines:
            (straight
                ? addLineIntersection
                : straight1 || straight2
                    ? addCurveLineIntersections
                    : addCurveIntersections)(
                        v1, v2, c1, c2, locations, param,
                        // Define the defaults for these parameters of
                        // addCurveIntersections():
                        // tMin, tMax, uMin, uMax, oldTDiff, reverse, recursion
                        0, 1, 0, 1, 0, false, 0);
            // We're done if we handle lines and found one intersection already:
            // https://github.com/paperjs/paper.js/issues/805#issuecomment-148503018
            if (straight && locations.length > before)
                return locations;
            // Handle the special case where the first curve's start- or end-
            // point overlaps with the second curve's start or end-point.
            var c1p1 = new Point(c1p1x, c1p1y),
                c1p2 = new Point(c1p2x, c1p2y),
                c2p1 = new Point(c2p1x, c2p1y),
                c2p2 = new Point(c2p2x, c2p2y);
            if (c1p1.isClose(c2p1, epsilon))
                addLocation(locations, param, v1, c1, 0, c1p1, v2, c2, 0, c2p1);
            if (!param.startConnected && c1p1.isClose(c2p2, epsilon))
                addLocation(locations, param, v1, c1, 0, c1p1, v2, c2, 1, c2p2);
            if (!param.endConnected && c1p2.isClose(c2p1, epsilon))
                addLocation(locations, param, v1, c1, 1, c1p2, v2, c2, 0, c2p1);
            if (c1p2.isClose(c2p2, epsilon))
                addLocation(locations, param, v1, c1, 1, c1p2, v2, c2, 1, c2p2);
            return locations;
        },

        _getSelfIntersection: function(v1, c1, locations, param) {
            // Read a detailed description of the approach used to handle self-
            // intersection, developed by @iconexperience here:
            // https://github.com/paperjs/paper.js/issues/773#issuecomment-144018379
            var p1x = v1[0], p1y = v1[1],
                h1x = v1[2], h1y = v1[3],
                h2x = v1[4], h2y = v1[5],
                p2x = v1[6], p2y = v1[7];
            // Get the side of both control handles
            var line = new Line(p1x, p1y, p2x, p2y, false),
                side1 = line.getSide(new Point(h1x, h1y), true),
                side2 = line.getSide(new Point(h2x, h2y), true);
            if (side1 === side2) {
                var edgeSum = (p1x - h2x) * (h1y - p2y)
                            + (h1x - p2x) * (h2y - p1y);
                // If both handles are on the same side, the curve can only have
                // a self intersection if the edge sum and the handles' sides
                // have different signs. If the handles are on the left side,
                // the edge sum must be negative for a self intersection (and
                // vice-versa).
                if (edgeSum * side1 > 0)
                    return locations;
            }
            // As a second condition we check if the curve has an inflection
            // point. If an inflection point exists, the curve cannot have a
            // self intersection.
            var ax = p2x - 3 * h2x + 3 * h1x - p1x,
                bx = h2x - 2 * h1x + p1x,
                cx = h1x - p1x,
                ay = p2y - 3 * h2y + 3 * h1y - p1y,
                by = h2y - 2 * h1y + p1y,
                cy = h1y - p1y,
                // Condition for 1 or 2 inflection points:
                // (ay*cx-ax*cy)^2 - 4*(ay*bx-ax*by)*(by*cx-bx*cy) >= 0
                ac = ay * cx - ax * cy,
                ab = ay * bx - ax * by,
                bc = by * cx - bx * cy;
            if (ac * ac - 4 * ab * bc < 0) {
                // The curve has no inflection points, so it may have a self
                // intersection. Find the right parameter at which to split the
                // curve. We search for the parameter where the velocity has an
                // extremum by finding the roots of the cross product between
                // the bezier curve's first and second derivative.
                var roots = [],
                    tSplit,
                    count = Numerical.solveCubic(
                            ax * ax  + ay * ay,
                            3 * (ax * bx + ay * by),
                            2 * (bx * bx + by * by) + ax * cx + ay * cy,
                            bx * cx + by * cy,
                            roots, 0, 1);
                if (count > 0) {
                    // Select extremum with highest curvature. This is always on
                    // the loop in case of a self intersection.
                    for (var i = 0, maxCurvature = 0; i < count; i++) {
                        var curvature = Math.abs(
                                c1.getCurvatureAt(roots[i], true));
                        if (curvature > maxCurvature) {
                            maxCurvature = curvature;
                            tSplit = roots[i];
                        }
                    }
                    // Divide the curve in two and then apply the normal curve
                    // intersection code.
                    var parts = Curve.subdivide(v1, tSplit);
                    // After splitting, the end is always connected:
                    param.endConnected = true;
                    // Since the curve was split above, we need to adjust the
                    // parameters for both locations.
                    param.renormalize = function(t1, t2) {
                        return [t1 * tSplit, t2 * (1 - tSplit) + tSplit];
                    };
                    Curve._getIntersections(parts[0], parts[1], c1, c1,
                            locations, param);
                }
            }
            return locations;
        },

        /**
         * Code to detect overlaps of intersecting based on work by
         * @iconexperience: https://github.com/paperjs/paper.js/issues/648
         */
        getOverlaps: function(v1, v2) {
            var abs = Math.abs,
                timeEpsilon = /*#=*/Numerical.CURVETIME_EPSILON,
                geomEpsilon = /*#=*/Numerical.GEOMETRIC_EPSILON,
                straight1 = Curve.isStraight(v1),
                straight2 = Curve.isStraight(v2),
                straight =  straight1 && straight2;

            function getLineLengthSquared(v) {
                var x = v[6] - v[0],
                    y = v[7] - v[1];
                return x * x + y * y;
            }

            if (straight) {
                // Linear curves can only overlap if they are collinear. Instead
                // of using the #isCollinear() check, we pick the longer of the
                // two lines and see how far the starting and end points of the
                // other line are from this line (assumed as an infinite line).
                var flip = getLineLengthSquared(v1) < getLineLengthSquared(v2),
                    l1 = flip ? v2 : v1,
                    l2 = flip ? v1 : v2,
                    line = new Line(l1[0], l1[1], l1[6], l1[7]);
                if (line.getDistance(new Point(l2[0], l2[1])) > geomEpsilon ||
                    line.getDistance(new Point(l2[6], l2[7])) > geomEpsilon)
                    return null;
            } else if (straight1 ^ straight2) {
                // If one curve is straight, the other curve must be straight,
                // too, otherwise they cannot overlap.
                return null;
            }

            var v = [v1, v2],
                pairs = [];
            // Iterate through all end points: First p1 and p2 of curve 1,
            // then p1 and p2 of curve 2.
            for (var i = 0, t1 = 0;
                    i < 2 && pairs.length < 2;
                    i += t1 === 0 ? 0 : 1, t1 = t1 ^ 1) {
                var t2 = Curve.getParameterOf(v[i ^ 1], new Point(
                        v[i][t1 === 0 ? 0 : 6],
                        v[i][t1 === 0 ? 1 : 7]));
                if (t2 != null) {  // If point is on curve
                    var pair = i === 0 ? [t1, t2] : [t2, t1];
                    // Filter out tiny overlaps
                    // TODO: Compare distance of points instead of curve time?
                    if (pairs.length === 0 ||
                        abs(pair[0] - pairs[0][0]) > timeEpsilon &&
                        abs(pair[1] - pairs[0][1]) > timeEpsilon)
                        pairs.push(pair);
                }
                // If we checked 3 points but found no match,
                // curves cannot overlap.
                if (i === 1 && pairs.length === 0)
                    break;
            }
            if (pairs.length !== 2) {
                pairs = null;
            } else if (!straight) {
                // Straight pairs don't need further checks. If we found
                // 2 pairs, the end points on v1 & v2 should be the same.
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
    }};
});
