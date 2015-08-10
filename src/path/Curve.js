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
        var count = arguments.length;
        if (count === 3) {
            // Undocumented internal constructor, used by Path#getCurves()
            // new Segment(path, segment1, segment2);
            this._path = arg0;
            this._segment1 = arg1;
            this._segment2 = arg2;
        } else if (count === 0) {
            this._segment1 = new Segment();
            this._segment2 = new Segment();
        } else if (count === 1) {
            // new Segment(segment);
            // Note: This copies from existing segments through bean getters
            this._segment1 = new Segment(arg0.segment1);
            this._segment2 = new Segment(arg0.segment2);
        } else if (count === 2) {
            // new Segment(segment1, segment2);
            this._segment1 = new Segment(arg0);
            this._segment2 = new Segment(arg1);
        } else {
            var point1, handle1, handle2, point2;
            if (count === 4) {
                point1 = arg0;
                handle1 = arg1;
                handle2 = arg2;
                point2 = arg3;
            } else if (count === 8) {
                // Convert getValue() array back to points and handles so we
                // can create segments for those.
                point1 = [arg0, arg1];
                point2 = [arg6, arg7];
                handle1 = [arg2 - arg0, arg3 - arg1];
                handle2 = [arg4 - arg6, arg5 - arg7];
            }
            this._segment1 = new Segment(point1, null, handle1);
            this._segment2 = new Segment(point2, handle2, null);
        }
    },

    _changed: function() {
        // Clear cached values.
        this._length = this._bounds = undefined;
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

    getValues: function(matrix) {
        return Curve.getValues(this._segment1, this._segment2, matrix);
    },

    getPoints: function() {
        // Convert to array of absolute points
        var coords = this.getValues(),
            points = [];
        for (var i = 0; i < 8; i += 2)
            points.push(new Point(coords[i], coords[i + 1]));
        return points;
    },

    /**
     * The approximated length of the curve in points.
     *
     * @type Number
     * @bean
     */
    getLength: function() {
        if (this._length == null) {
            // Use simple point distance for linear curves
            this._length = this.isLinear()
                ? this._segment2._point.getDistance(this._segment1._point)
                : Curve.getLength(this.getValues(), 0, 1);
        }
        return this._length;
    },

    getArea: function() {
        return Curve.getArea(this.getValues());
    },

    getPart: function(from, to) {
        return new Curve(Curve.getPart(this.getValues(), from, to));
    },

    // DOCS: Curve#getPartLength(from, to)
    getPartLength: function(from, to) {
        return Curve.getLength(this.getValues(), from, to);
    },

    /**
     * Checks if this curve is linear, meaning it does not define any curve
     * handle.

     * @return {Boolean} {@true if the curve is linear}
     */
    isLinear: function() {
        return this._segment1._handleOut.isZero()
                && this._segment2._handleIn.isZero();
    },

    // DOCS: Curve#getIntersections()
    getIntersections: function(curve) {
        return Curve.filterIntersections(Curve.getIntersections(
                this.getValues(), curve.getValues(), this, curve, []));
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
     * @return {Curve} the second part of the divided curve
     */
    // TODO: Rename to divideAt()?
    divide: function(offset, isParameter, ignoreLinear) {
        var parameter = this._getParameter(offset, isParameter),
            tolerance = /*#=*/Numerical.TOLERANCE,
            res = null;
        if (parameter > tolerance && parameter < 1 - tolerance) {
            var parts = Curve.subdivide(this.getValues(), parameter),
                isLinear = ignoreLinear ? false : this.isLinear(),
                left = parts[0],
                right = parts[1];

            // Write back the results:
            if (!isLinear) {
                this._segment1._handleOut.set(left[2] - left[0],
                        left[3] - left[1]);
                // segment2 is the end segment. By inserting newSegment
                // between segment1 and 2, 2 becomes the end segment.
                // Convert absolute -> relative
                this._segment2._handleIn.set(right[4] - right[6],
                        right[5] - right[7]);
            }

            // Create the new segment, convert absolute -> relative:
            var x = left[6], y = left[7],
                segment = new Segment(new Point(x, y),
                        !isLinear && new Point(left[4] - x, left[5] - y),
                        !isLinear && new Point(right[2] - x, right[3] - y));

            // Insert it in the segments list, if needed:
            if (this._path) {
                // Insert at the end if this curve is a closing curve of a
                // closed path, since otherwise it would be inserted at 0.
                if (this._segment1._index > 0 && this._segment2._index === 0) {
                    this._path.add(segment);
                } else {
                    this._path.insert(this._segment2._index, segment);
                }
                // The way Path#_add handles curves, this curve will always
                // become the owner of the newly inserted segment.
                // TODO: I expect this.getNext() to produce the correct result,
                // but since we're inserting differently in _add (something
                // linked with CurveLocation#divide()), this is not the case...
                res = this; // this.getNext();
            } else {
                // otherwise create it from the result of split
                var end = this._segment2;
                this._segment2 = segment;
                res = new Curve(segment, end);
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
    reverse: function() {
        return new Curve(this._segment2.reverse(), this._segment1.reverse());
    },

    /**
     * Removes the curve from the path that it belongs to, by merging its two
     * path segments.
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

// Mess with indentation in order to get more line-space below...
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

    // TODO: Instead of constants for type, use a "enum" and code substitution.
    evaluate: function(v, t, type) {
        // Do not produce results if parameter is out of range or invalid.
        if (t == null || t < 0 || t > 1)
            return null;
        var p1x = v[0], p1y = v[1],
            c1x = v[2], c1y = v[3],
            c2x = v[4], c2y = v[5],
            p2x = v[6], p2y = v[7],
            tolerance = /*#=*/Numerical.TOLERANCE,
            x, y;

        // Handle special case at beginning / end of curve
        if (type === 0 && (t < tolerance || t > 1 - tolerance)) {
            var isZero = t < tolerance;
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
                // Prevent tangents and normals of length 0:
                // http://stackoverflow.com/questions/10506868/
                if (t < tolerance && c1x === p1x && c1y === p1y
                        || t > 1 - tolerance && c2x === p2x && c2y === p2y) {
                    x = c2x - c1x;
                    y = c2y - c1y;
                } else if (t < tolerance) {
                    x = cx;
                    y = cy;
                } else if (t > 1 - tolerance) {
                    x = 3 * (p2x - c2x);
                    y = 3 * (p2y - c2y);
                } else {
                    // Simply use the derivation of the bezier function for both
                    // the x and y coordinates:
                    x = (3 * ax * t + 2 * bx) * t + cx;
                    y = (3 * ay * t + 2 * by) * t + cy;
                }
                if (type === 3) {
                    // Calculate 2nd derivative, and curvature from there:
                    // http://cagd.cs.byu.edu/~557/text/ch2.pdf page#31
                    // k = |dx * d2y - dy * d2x| / (( dx^2 + dy^2 )^(3/2))
                    var x2 = 6 * ax * t + 2 * bx,
                        y2 = 6 * ay * t + 2 * by;
                    return (x * y2 - y * x2) / Math.pow(x * x + y * y, 3 / 2);
                }
            }
        }
        // The normal is simply the rotated tangent:
        return type === 2 ? new Point(y, -x) : new Point(x, y);
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
            a = p2 - p1 - c - b,
            isZero = Numerical.isZero;
        // If both a and b are near zero, we should treat the curve as a line in
        // order to find the right solutions in some edge-cases in
        // Curve.getParameterOf()
        if (isZero(a) && isZero(b))
            a = b = 0;
        return Numerical.solveCubic(a, b, c, p1 - val, roots, min, max);
    },

    getParameterOf: function(v, x, y) {
        // Handle beginnings and end separately, as they are not detected
        // sometimes.
        var tolerance = /*#=*/Numerical.TOLERANCE;
        if (Math.abs(v[0] - x) < tolerance && Math.abs(v[1] - y) < tolerance)
            return 0;
        if (Math.abs(v[6] - x) < tolerance && Math.abs(v[7] - y) < tolerance)
            return 1;
        var txs = [],
            tys = [],
            sx = Curve.solveCubic(v, 0, x, txs, 0, 1),
            sy = Curve.solveCubic(v, 1, y, tys, 0, 1),
            tx, ty;
        // sx, sy === -1 means infinite solutions:
        // Loop through all solutions for x and match with solutions for y,
        // to see if we either have a matching pair, or infinite solutions
        // for one or the other.
        for (var cx = 0;  sx === -1 || cx < sx;) {
            if (sx === -1 || (tx = txs[cx++]) > 0 && tx < 1) {
                for (var cy = 0; sy === -1 || cy < sy;) {
                    if (sy === -1 || (ty = tys[cy++]) > 0 && ty < 1) {
                        // Handle infinite solutions by assigning root of
                        // the other polynomial
                        if (sx === -1) {
                            tx = ty;
                        } else if (sy === -1) {
                            ty = tx;
                        }
                        // Use average if we're within tolerance
                        if (Math.abs(tx - ty) < tolerance)
                            return (tx + ty) * 0.5;
                    }
                }
                // Avoid endless loops here: If sx is infinite and there was
                // no fitting ty, there's no solution for this bezier
                if (sx === -1)
                    break;
            }
        }
        return null;
    },

    // TODO: Find better name
    getPart: function(v, from, to) {
        if (from > 0)
            v = Curve.subdivide(v, from)[1]; // [1] right
        // Interpolate the parameter at 'to' in the new curve and cut there.
        if (to < 1)
            v = Curve.subdivide(v, (to - from) / (1 - from))[0]; // [0] left
        return v;
    },

    isLinear: function(v) {
        var isZero = Numerical.isZero;
        return isZero(v[0] - v[2]) && isZero(v[1] - v[3])
                && isZero(v[4] - v[6]) && isZero(v[5] - v[7]);
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
        var p1x = v[0], p1y = v[1],
            c1x = v[2], c1y = v[3],
            c2x = v[4], c2y = v[5],
            p2x = v[6], p2y = v[7];
        // http://objectmix.com/graphics/133553-area-closed-bezier-curve.html
        return (  3.0 * c1y * p1x - 1.5 * c1y * c2x
                - 1.5 * c1y * p2x - 3.0 * p1y * c1x
                - 1.5 * p1y * c2x - 0.5 * p1y * p2x
                + 1.5 * c2y * p1x + 1.5 * c2y * c1x
                - 3.0 * c2y * p2x + 0.5 * p2y * p1x
                + 1.5 * p2y * c1x + 3.0 * p2y * c2x) / 10;
    },

    getEdgeSum: function(v) {
        // Method derived from:
        // http://stackoverflow.com/questions/1165647
        // We treat the curve points and handles as the outline of a polygon of
        // which we determine the orientation using the method of calculating
        // the sum over the edges. This will work even with non-convex polygons,
        // telling you whether it's mostly clockwise
        return    (v[0] - v[2]) * (v[3] + v[1])
                + (v[2] - v[4]) * (v[5] + v[3])
                + (v[4] - v[6]) * (v[7] + v[5]);
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
            tMin = /*#=*/Numerical.TOLERANCE,
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
}}, Base.each(['getBounds', 'getStrokeBounds', 'getHandleBounds', 'getRoughBounds'],
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
                bounds = this._bounds[name] = Path[name]([this._segment1,
                        this._segment2], false, this._path.getStyle());
            }
            return bounds.clone();
        };
    },
/** @lends Curve# */{
    /**
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
}), Base.each(['getPoint', 'getTangent', 'getNormal', 'getCurvature'],
    // Note: Although Curve.getBounds() exists, we are using Path.getBounds() to
    // determine the bounds of Curve objects with defined segment1 and segment2
    // values Curve.getBounds() can be used directly on curve arrays, without
    // the need to create a Curve object first, as required by the code that
    // finds path interesections.
    function(name, index) {
        this[name + 'At'] = function(offset, isParameter) {
            var values = this.getValues();
            return Curve.evaluate(values, isParameter
                    ? offset : Curve.getParameterAt(values, offset, 0), index);
        };
        // Deprecated and undocumented, but keep around for now.
        // TODO: Remove once enough time has passed (28.01.2013)
        this[name] = function(parameter) {
            return Curve.evaluate(this.getValues(), parameter, index);
        };
    },
/** @lends Curve# */{
    // Explicitly deactivate the creation of beans, as we have functions here
    // that look like bean getters but actually read arguments.
    // See #getParameterOf(), #getLocationOf(), #getNearestLocation(), ...
    beans: false,

    /**
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
        var point = Point.read(arguments);
        return Curve.getParameterOf(this.getValues(), point.x, point.y);
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

    getNearestLocation: function(/* point */) {
        var point = Point.read(arguments),
            values = this.getValues(),
            count = 100,
            minDist = Infinity,
            minT = 0;

        function refine(t) {
            if (t >= 0 && t <= 1) {
                var dist = point.getDistance(
                        Curve.evaluate(values, t, 0), true);
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
        while (step > /*#=*/Numerical.TOLERANCE) {
            if (!refine(minT - step) && !refine(minT + step))
                step /= 2;
        }
        var pt = Curve.evaluate(values, minT, 0);
        return new CurveLocation(this, minT, pt, null, null, null,
                point.getDistance(pt));
    },

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
     * @return {Point} the point on the curve at the specified offset
     */

    /**
     * Calculates the tangent vector of the curve at the given offset.
     *
     * @name Curve#getTangentAt
     * @function
     * @param {Number} offset the offset on the curve, or the curve time
     * parameter if {@code isParameter} is {@code true}
     * @param {Boolean} [isParameter=false] pass {@code true} if {@code offset}
     * is a curve time parameter
     * @return {Point} the tangent of the curve at the specified offset
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
     * @return {Point} the normal of the curve at the specified offset
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
     * @return {Number} the curvature of the curve at the specified offset
     */
}),
new function() { // Scope for methods that require numerical integration

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

    return {
        statics: true,

        getLength: function(v, a, b) {
            if (a === undefined)
                a = 0;
            if (b === undefined)
                b = 1;
            var isZero = Numerical.isZero;
            // See if the curve is linear by checking p1 == c1 and p2 == c2
            if (a === 0 && b === 1
                    && isZero(v[0] - v[2]) && isZero(v[1] - v[3])
                    && isZero(v[6] - v[4]) && isZero(v[7] - v[5])) {
                // Straight line
                var dx = v[6] - v[0], // p2x - p1x
                    dy = v[7] - v[1]; // p2y - p1y
                return Math.sqrt(dx * dx + dy * dy);
            }
            var ds = getLengthIntegrand(v);
            return Numerical.integrate(ds, a, b, getIterations(a, b));
        },

        getParameterAt: function(v, offset, start) {
            if (start === undefined)
                start = offset < 0 ? 1 : 0
            if (offset === 0)
                return start;
            // See if we're going forward or backward, and handle cases
            // differently
            var tolerance = /*#=*/Numerical.TOLERANCE,
                abs = Math.abs,
                forward = offset > 0,
                a = forward ? start : 0,
                b = forward ? 1 : start,
                // Use integrand to calculate both range length and part
                // lengths in f(t) below.
                ds = getLengthIntegrand(v),
                // Get length of total range
                rangeLength = Numerical.integrate(ds, a, b,
                        getIterations(a, b));
            if (abs(offset - rangeLength) < tolerance) {
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
            return Numerical.findRoot(f, ds, start + guess, a, b, 16,
                    tolerance);
        }
    };
}, new function() { // Scope for intersection using bezier fat-line clipping
    function addLocation(locations, include, curve1, t1, point1, curve2, t2,
            point2) {
        var loc = new CurveLocation(curve1, t1, point1, curve2, t2, point2);
        if (!include || include(loc))
            locations.push(loc);
    }

    function addCurveIntersections(v1, v2, curve1, curve2, locations, include,
            tMin, tMax, uMin, uMax, oldTDiff, reverse, recursion) {
/*#*/ if (__options.fatlineClipping) {
        // Avoid deeper recursion.
        // NOTE: @iconexperience determined that more than 20 recursions are
        // needed sometimes, depending on the tDiff threshold values further
        // below when determining which curve converges the least. He also
        // recommended a threshold of 0.5 instead of the initial 0.8
        // See: https://github.com/paperjs/paper.js/issues/565
        if (recursion > 32)
            return;
        // Let P be the first curve and Q be the second
        var q0x = v2[0], q0y = v2[1], q3x = v2[6], q3y = v2[7],
            tolerance = /*#=*/Numerical.TOLERANCE,
            getSignedDistance = Line.getSignedDistance,
            // Calculate the fat-line L for Q is the baseline l and two
            // offsets which completely encloses the curve P.
            d1 = getSignedDistance(q0x, q0y, q3x, q3y, v2[2], v2[3]) || 0,
            d2 = getSignedDistance(q0x, q0y, q3x, q3y, v2[4], v2[5]) || 0,
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
            tMinNew, tMaxNew, tDiff;
        if (q0x === q3x && uMax - uMin < tolerance && recursion > 3) {
            // The fatline of Q has converged to a point, the clipping is not
            // reliable. Return the value we have even though we will miss the
            // precision.
            tMaxNew = tMinNew = (tMax + tMin) / 2;
            tDiff = 0;
        } else {
            // Get the top and bottom parts of the convex-hull
            var hull = getConvexHull(dp0, dp1, dp2, dp3),
                top = hull[0],
                bottom = hull[1],
                tMinClip, tMaxClip;
            // Clip the convex-hull with dMin and dMax
            tMinClip = clipConvexHull(top, bottom, dMin, dMax);
            top.reverse();
            bottom.reverse();
            tMaxClip = clipConvexHull(top, bottom, dMin, dMax);
            // No intersections if one of the tvalues are null or 'undefined'
            if (tMinClip == null || tMaxClip == null)
                return;
            // Clip P with the fatline for Q
            v1 = Curve.getPart(v1, tMinClip, tMaxClip);
            tDiff = tMaxClip - tMinClip;
            // tMin and tMax are within the range (0, 1). We need to project it
            // to the original parameter range for v2.
            tMinNew = tMax * tMinClip + tMin * (1 - tMinClip);
            tMaxNew = tMax * tMaxClip + tMin * (1 - tMaxClip);
        }
        // Check if we need to subdivide the curves
        if (oldTDiff > 0.5 && tDiff > 0.5) {
            // Subdivide the curve which has converged the least.
            if (tMaxNew - tMinNew > uMax - uMin) {
                var parts = Curve.subdivide(v1, 0.5),
                    t = tMinNew + (tMaxNew - tMinNew) / 2;
                addCurveIntersections(
                    v2, parts[0], curve2, curve1, locations, include,
                    uMin, uMax, tMinNew, t, tDiff, !reverse, ++recursion);
                addCurveIntersections(
                    v2, parts[1], curve2, curve1, locations, include,
                    uMin, uMax, t, tMaxNew, tDiff, !reverse, recursion);
            } else {
                var parts = Curve.subdivide(v2, 0.5),
                    t = uMin + (uMax - uMin) / 2;
                addCurveIntersections(
                    parts[0], v1, curve2, curve1, locations, include,
                    uMin, t, tMinNew, tMaxNew, tDiff, !reverse, ++recursion);
                addCurveIntersections(
                    parts[1], v1, curve2, curve1, locations, include,
                    t, uMax, tMinNew, tMaxNew, tDiff, !reverse, recursion);
            }
        } else if (Math.max(uMax - uMin, tMaxNew - tMinNew) < tolerance) {
            // We have isolated the intersection with sufficient precision
            var t1 = tMinNew + (tMaxNew - tMinNew) / 2,
                t2 = uMin + (uMax - uMin) / 2;
            if (reverse) {
                addLocation(locations, include,
                        curve2, t2, Curve.evaluate(v2, t2, 0),
                        curve1, t1, Curve.evaluate(v1, t1, 0));
            } else {
                addLocation(locations, include,
                        curve1, t1, Curve.evaluate(v1, t1, 0),
                        curve2, t2, Curve.evaluate(v2, t2, 0));
            }
        } else if (tDiff > 0) { // Iterate
            addCurveIntersections(v2, v1, curve2, curve1, locations, include,
                    uMin, uMax, tMinNew, tMaxNew, tDiff, !reverse, ++recursion);
        }
/*#*/ } else { // !__options.fatlineClipping
        // Subdivision method
        var bounds1 = Curve.getBounds(v1),
            bounds2 = Curve.getBounds(v2),
            tolerance = /*#=*/Numerical.TOLERANCE;
        if (bounds1.touches(bounds2)) {
            // See if both curves are flat enough to be treated as lines, either
            // because they have no control points at all, or are "flat enough"
            // If the curve was flat in a previous iteration, we don't need to
            // recalculate since it does not need further subdivision then.
            if ((Curve.isLinear(v1) || Curve.isFlatEnough(v1, tolerance))
                && (Curve.isLinear(v2) || Curve.isFlatEnough(v2, tolerance))) {
                // See if the parametric equations of the lines interesct.
                addLineIntersection(v1, v2, curve1, curve2, locations, include);
            } else {
                // Subdivide both curves, and see if they intersect.
                // If one of the curves is flat already, no further subdivion
                // is required.
                var v1s = Curve.subdivide(v1),
                    v2s = Curve.subdivide(v2);
                for (var i = 0; i < 2; i++)
                    for (var j = 0; j < 2; j++)
                        addCurveIntersections(v1s[i], v2s[j], curve1, curve2,
                                locations, include);
            }
        }
/*#*/ } // !__options.fatlineClipping
    }

/*#*/ if (__options.fatlineClipping) {
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
            // Find signed distance of p1 and p2 from line [ p0, p3 ]
            getSignedDistance = Line.getSignedDistance,
            dist1 = getSignedDistance(0, dq0, 1, dq3, 1 / 3, dq1),
            dist2 = getSignedDistance(0, dq0, 1, dq3, 2 / 3, dq2),
            flip = false,
            hull;
        // Check if p1 and p2 are on the same side of the line [ p0, p3 ]
        if (dist1 * dist2 < 0) {
            // p1 and p2 lie on different sides of [ p0, p3 ]. The hull is a
            // quadrilateral and line [ p0, p3 ] is NOT part of the hull so we
            // are pretty much done here.
            // The top part includes p1,
            // we will reverse it later if that is not the case
            hull = [[p0, p1, p3], [p0, p2, p3]];
            flip = dist1 < 0;
        } else {
            // p1 and p2 lie on the same sides of [ p0, p3 ]. The hull can be
            // a triangle or a quadrilateral and line [ p0, p3 ] is part of the
            // hull. Check if the hull is a triangle or a quadrilateral.
            // Also, if at least one of the distances for p1 or p2, from line
            // [p0, p3] is zero then hull must at most have 3 vertices.
            var pmax, cross = 0,
                distZero = dist1 === 0 || dist2 === 0;
            if (Math.abs(dist1) > Math.abs(dist2)) {
                pmax = p1;
                // apex is dq3 and the other apex point is dq0 vector dqapex ->
                // dqapex2 or base vector which is already part of the hull.
                cross = (dq3 - dq2 - (dq3 - dq0) / 3)
                        * (2 * (dq3 - dq2) - dq3 + dq1) / 3;
            } else {
                pmax = p2;
                // apex is dq0 in this case, and the other apex point is dq3
                // vector dqapex -> dqapex2 or base vector which is already part
                // of the hull.
                cross = (dq1 - dq0 + (dq0 - dq3) / 3)
                        * (-2 * (dq0 - dq1) + dq0 - dq2) / 3;
            }
            // Compare cross products of these vectors to determine if the point
            // is in the triangle [ p3, pmax, p0 ], or if it is a quadrilateral.
            hull = cross < 0 || distZero
                    // p2 is inside the triangle, hull is a triangle.
                    ? [[p0, pmax, p3], [p0, p3]]
                    // Convex hull is a quadrilateral and we need all lines in
                    // correct order where line [ p0, p3 ] is part of the hull.
                    : [[p0, p1, p2, p3], [p0, p3]];
            flip = dist1 ? dist1 < 0 : dist2 < 0;
        }
        return flip ? hull.reverse() : hull;
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
            if (top ? qy >= threshold : qy <= threshold)
                return px + (threshold - py) * (qx - px) / (qy - py);
            px = qx;
            py = qy;
        }
        // All points of hull are above / below the threshold
        return null;
    }
/*#*/ } // __options.fatlineClipping

    /**
     * Intersections between curve and line becomes rather simple here mostly
     * because of Numerical class. We can rotate the curve and line so that the
     * line is on the X axis, and solve the implicit equations for the X axis
     * and the curve.
     */
    function addCurveLineIntersections(v1, v2, curve1, curve2, locations,
            include) {
        var flip = Curve.isLinear(v1),
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
            rlx2 = ldx * cos - ldy * sin,
            // The curve values for the rotated line.
            rvl = [0, 0, 0, 0, rlx2, 0, rlx2, 0],
            // Calculate the curve values of the rotated curve.
            rvc = [];
        for(var i = 0; i < 8; i += 2) {
            var x = vc[i] - lx1,
                y = vc[i + 1] - ly1;
            rvc.push(
                x * cos - y * sin,
                y * cos + x * sin);
        }
        var roots = [],
            count = Curve.solveCubic(rvc, 1, 0, roots, 0, 1);
        // NOTE: count could be -1 for infinite solutions, but that should only
        // happen with lines, in which case we should not be here.
        for (var i = 0; i < count; i++) {
            var tc = roots[i],
                x = Curve.evaluate(rvc, tc, 0).x;
            // We do have a point on the infinite line. Check if it falls on
            // the line *segment*.
            if (x >= 0 && x <= rlx2) {
                // Find the parameter of the intersection on the rotated line.
                var tl = Curve.getParameterOf(rvl, x, 0),
                    t1 = flip ? tl : tc,
                    t2 = flip ? tc : tl;
                addLocation(locations, include,
                        curve1, t1, Curve.evaluate(v1, t1, 0),
                        curve2, t2, Curve.evaluate(v2, t2, 0));
            }
        }
    }

    function addLineIntersection(v1, v2, curve1, curve2, locations, include) {
        var point = Line.intersect(
                v1[0], v1[1], v1[6], v1[7],
                v2[0], v2[1], v2[6], v2[7]);
        if (point) {
            // We need to return the parameters for the intersection,
            // since they will be used for sorting
            var x = point.x,
                y = point.y;
            addLocation(locations, include,
                    curve1, Curve.getParameterOf(v1, x, y), point,
                    curve2, Curve.getParameterOf(v2, x, y), point);
        }
    }

    return { statics: /** @lends Curve */{
        // We need to provide the original left curve reference to the
        // #getIntersections() calls as it is required to create the resulting
        // CurveLocation objects.
        getIntersections: function(v1, v2, c1, c2, locations, include) {
            var linear1 = Curve.isLinear(v1),
                linear2 = Curve.isLinear(v2),
                c1p1 = c1.getPoint1(),
                c1p2 = c1.getPoint2(),
                c2p1 = c2.getPoint1(),
                c2p2 = c2.getPoint2(),
                tolerance = /*#=*/Numerical.TOLERANCE;
            // Handle a special case where if both curves start or end at the
            // same point, the same end-point case will be handled after we
            // calculate other intersections within the curve.
            if (c1p1.isClose(c2p1, tolerance))
                addLocation(locations, include, c1, 0, c1p1, c2, 0, c1p1);
            if (c1p1.isClose(c2p2, tolerance))
                addLocation(locations, include, c1, 0, c1p1, c2, 1, c1p1);
            // Determine the correct intersection method based on values of
            // linear1 & 2:
            (linear1 && linear2
                ? addLineIntersection
                : linear1 || linear2
                    ? addCurveLineIntersections
                    : addCurveIntersections)(
                        v1, v2, c1, c2, locations, include,
                        // Define the defaults for these parameters of
                        // addCurveIntersections():
                        // tMin, tMax, uMin, uMax, oldTDiff, reverse, recursion
                        0, 1, 0, 1, 0, false, 0);
            // Handle the special case where c1's end-point overlap with
            // c2's points.
            if (c1p2.isClose(c2p1, tolerance))
                addLocation(locations, include, c1, 1, c1p2, c2, 0, c1p2);
            if (c1p2.isClose(c2p2, tolerance))
                addLocation(locations, include, c1, 1, c1p2, c2, 1, c1p2);
            return locations;
        },

        filterIntersections: function(locations, _expand) {
            var last = locations.length - 1,
                tMax = 1 - /*#=*/Numerical.TOLERANCE;
            // Merge intersections very close to the end of a curve to the
            // beginning of the next curve.
            for (var i = last; i >= 0; i--) {
                var loc = locations[i],
                    next = loc._curve.getNext(),
                    next2 = loc._curve2.getNext();
                if (next && loc._parameter >= tMax) {
                    loc._parameter = 0;
                    loc._curve = next;
                }
                if (next2 && loc._parameter2 >= tMax) {
                    loc._parameter2 = 0;
                    loc._curve2 = next2;
                }
            }

            // Compare helper to filter locations
            function compare(loc1, loc2) {
                var path1 = loc1.getPath(),
                    path2 = loc2.getPath();
                return path1 === path2
                        // We can add parameter (0 <= t <= 1) to index
                        // (a integer) to compare both at the same time
                        ? (loc1.getIndex() + loc1.getParameter())
                                - (loc2.getIndex() + loc2.getParameter())
                        // Sort by path id to group all locations on the same path.
                        : path1._id - path2._id;
            }

            if (last > 0) {
                locations.sort(compare);
                // Filter out duplicate locations.
                for (var i = last; i > 0; i--) {
                    if (locations[i].equals(locations[i - 1])) {
                        locations.splice(i, 1);
                        last--;
                    }
                }
            }
            if (_expand) {
                for (var i = last; i >= 0; i--)
                    locations.push(locations[i].getIntersection());
                locations.sort(compare);
            }
            return locations;
        }
    }};
});
