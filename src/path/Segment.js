/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2016, Juerg Lehni & Jonathan Puckey
 * http://scratchdisk.com/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name Segment
 *
 * @class The Segment object represents the points of a path through which its
 * {@link Curve} objects pass. The segments of a path can be accessed through
 * its {@link Path#segments} array.
 *
 * Each segment consists of an anchor point ({@link Segment#point}) and
 * optionaly an incoming and an outgoing handle ({@link Segment#handleIn} and
 * {@link Segment#handleOut}), describing the tangents of the two {@link Curve}
 * objects that are connected by this segment.
 */
var Segment = Base.extend(/** @lends Segment# */{
    _class: 'Segment',
    beans: true,
    // The selection state, a combination of SegmentSelection
    _selection: 0,

    /**
     * Creates a new Segment object.
     *
     * @name Segment#initialize
     * @param {Point} [point={x: 0, y: 0}] the anchor point of the segment
     * @param {Point} [handleIn={x: 0, y: 0}] the handle point relative to the
     *     anchor point of the segment that describes the in tangent of the
     *     segment
     * @param {Point} [handleOut={x: 0, y: 0}] the handle point relative to the
     *     anchor point of the segment that describes the out tangent of the
     *     segment
     *
     * @example {@paperscript}
     * var handleIn = new Point(-80, -100);
     * var handleOut = new Point(80, 100);
     *
     * var firstPoint = new Point(100, 50);
     * var firstSegment = new Segment(firstPoint, null, handleOut);
     *
     * var secondPoint = new Point(300, 50);
     * var secondSegment = new Segment(secondPoint, handleIn, null);
     *
     * var path = new Path(firstSegment, secondSegment);
     * path.strokeColor = 'black';
     */
    /**
     * Creates a new Segment object.
     *
     * @name Segment#initialize
     * @param {Object} object an object containing properties to be set on the
     *     segment
     *
     * @example {@paperscript}
     * // Creating segments using object notation:
     * var firstSegment = new Segment({
     *     point: [100, 50],
     *     handleOut: [80, 100]
     * });
     *
     * var secondSegment = new Segment({
     *     point: [300, 50],
     *     handleIn: [-80, -100]
     * });
     *
     * var path = new Path({
     *     segments: [firstSegment, secondSegment],
     *     strokeColor: 'black'
     * });
     */
    /**
     * Creates a new Segment object.
     *
     * @param {Number} x the x coordinate of the segment point
     * @param {Number} y the y coordinate of the segment point
     * @param {Number} inX the x coordinate of the the handle point relative to
     * the anchor point of the segment that describes the in tangent of the
     * segment
     * @param {Number} inY the y coordinate of the the handle point relative to
     * the anchor point of the segment that describes the in tangent of the
     * segment
     * @param {Number} outX the x coordinate of the the handle point relative to
     * the anchor point of the segment that describes the out tangent of the
     * segment
     * @param {Number} outY the y coordinate of the the handle point relative to
     * the anchor point of the segment that describes the out tangent of the
     * segment
     *
     * @example {@paperscript}
     * var inX = -80;
     * var inY = -100;
     * var outX = 80;
     * var outY = 100;
     *
     * var x = 100;
     * var y = 50;
     * var firstSegment = new Segment(x, y, inX, inY, outX, outY);
     *
     * var x2 = 300;
     * var y2 = 50;
     * var secondSegment = new Segment( x2, y2, inX, inY, outX, outY);
     *
     * var path = new Path(firstSegment, secondSegment);
     * path.strokeColor = 'black';
     * @ignore
     */
    initialize: function Segment(arg0, arg1, arg2, arg3, arg4, arg5) {
        var count = arguments.length,
            point, handleIn, handleOut, selection;
        // TODO: Should we use Point.read() or Point.readNamed() to read these?
        if (count > 0) {
            if (arg0 == null || typeof arg0 === 'object') {
                // Handle undefined, null and passed objects:
                if (count === 1 && arg0 && 'point' in arg0) {
                    // NOTE: This copies from segments through accessors.
                    point = arg0.point;
                    handleIn = arg0.handleIn;
                    handleOut = arg0.handleOut;
                    selection = arg0.selection;
                } else {
                    // It doesn't matter if all of these arguments exist.
                    // SegmentPoint() creates points with (0, 0) otherwise.
                    point = arg0;
                    handleIn = arg1;
                    handleOut = arg2;
                    selection = arg3;
                }
            } else {
                // Read points from the arguments list as a row of numbers.
                point = [ arg0, arg1 ];
                handleIn = arg2 !== undefined ? [ arg2, arg3 ] : null;
                handleOut = arg4 !== undefined ? [ arg4, arg5 ] : null;
            }
        }
        new SegmentPoint(point, this, '_point');
        new SegmentPoint(handleIn, this, '_handleIn');
        new SegmentPoint(handleOut, this, '_handleOut');
        if (selection)
            this.setSelection(selection);
    },

    _serialize: function(options, dictionary) {
        // If it is has no handles, only serialize point, otherwise handles too.
        var point = this._point,
            selection = this._selection,
            obj = selection || this.hasHandles()
                    ? [point, this._handleIn, this._handleOut]
                    : point;
        if (selection)
            obj.push(selection);
        return Base.serialize(obj, options, true, dictionary);
    },

    _changed: function(point) {
        var path = this._path;
        if (!path)
            return;
        // Delegate changes to affected curves if they exist.
        var curves = path._curves,
            index = this._index,
            curve;
        if (curves) {
            // Updated the neighboring affected curves, depending on which point
            // is changing.
            // TODO: Consider exposing these curves too, through #curveIn,
            // and #curveOut, next to #curve?
            if ((!point || point === this._point || point === this._handleIn)
                    && (curve = index > 0 ? curves[index - 1] : path._closed
                        ? curves[curves.length - 1] : null))
                curve._changed();
            // No wrap around needed for outgoing curve, as only closed paths
            // will have one for the last segment.
            if ((!point || point === this._point || point === this._handleOut)
                    && (curve = curves[index]))
                curve._changed();
        }
        path._changed(/*#=*/Change.SEGMENTS);
    },

    /**
     * The anchor point of the segment.
     *
     * @bean
     * @type Point
     */
    getPoint: function() {
        return this._point;
    },

    setPoint: function(/* point */) {
        this._point.set(Point.read(arguments));
    },

    /**
     * The handle point relative to the anchor point of the segment that
     * describes the in tangent of the segment.
     *
     * @bean
     * @type Point
     */
    getHandleIn: function() {
        return this._handleIn;
    },

    setHandleIn: function(/* point */) {
        this._handleIn.set(Point.read(arguments));
    },

    /**
     * The handle point relative to the anchor point of the segment that
     * describes the out tangent of the segment.
     *
     * @bean
     * @type Point
     */
    getHandleOut: function() {
        return this._handleOut;
    },

    setHandleOut: function(/* point */) {
        this._handleOut.set(Point.read(arguments));
    },

    /**
     * Checks if the segment has any curve handles set.
     *
     * @return {Boolean} {@true if the segment has handles set}
     * @see Segment#getHandleIn()
     * @see Segment#getHandleOut()
     * @see Curve#hasHandles()
     * @see Path#hasHandles()
     */
    hasHandles: function() {
        return !this._handleIn.isZero() || !this._handleOut.isZero();
    },

    /**
     * Checks if the segment connects two curves smoothly, meaning that its two
     * handles are collinear and segment does not form a corner.
     *
     * @return {Boolean} {@true if the segment is smooth}
     * @see Point#isCollinear()
     */
    isSmooth: function() {
        var handleIn = this._handleIn,
            handleOut = this._handleOut;
        return !handleIn.isZero() && !handleOut.isZero()
                && handleIn.isCollinear(handleOut);
    },

    /**
     * Clears the segment's handles by setting their coordinates to zero,
     * turning the segment into a corner.
     */
    clearHandles: function() {
        this._handleIn._set(0, 0);
        this._handleOut._set(0, 0);
    },

    getSelection: function() {
        return this._selection;
    },

    setSelection: function(selection) {
        var oldSelection = this._selection,
            path = this._path;
        // Set the selection state even if path is not defined yet, to allow
        // selected segments to be inserted into paths and make JSON
        // deserialization work.
        this._selection = selection = selection || 0;
        // If the selection state of the segment has changed, we need to let
        // it's path know and possibly add or remove it from
        // project._selectionItems
        if (path && selection !== oldSelection) {
            path._updateSelection(this, oldSelection, selection);
            // Let path know that we changed something and the view should be
            // redrawn
            path._changed(/*#=*/Change.ATTRIBUTE);
        }
    },

    changeSelection: function(flag, selected) {
        var selection = this._selection;
        this.setSelection(selected ? selection | flag : selection & ~flag);
    },

    /**
     * Specifies whether the segment is selected.
     *
     * @bean
     * @type Boolean
     *
     * @example {@paperscript}
     * var path = new Path.Circle({
     *     center: [80, 50],
     *     radius: 40
     * });
     *
     * // Select the third segment point:
     * path.segments[2].selected = true;
     */
    isSelected: function() {
        return !!(this._selection & /*#=*/SegmentSelection.ALL);
    },

    setSelected: function(selected) {
        this.changeSelection(/*#=*/SegmentSelection.ALL, selected);
    },

    /**
     * {@grouptitle Hierarchy}
     *
     * The index of the segment in the {@link Path#segments} array that the
     * segment belongs to.
     *
     * @bean
     * @type Number
     */
    getIndex: function() {
        return this._index !== undefined ? this._index : null;
    },

    /**
     * The path that the segment belongs to.
     *
     * @bean
     * @type Path
     */
    getPath: function() {
        return this._path || null;
    },

    /**
     * The curve that the segment belongs to. For the last segment of an open
     * path, the previous segment is returned.
     *
     * @bean
     * @type Curve
     */
    getCurve: function() {
        var path = this._path,
            index = this._index;
        if (path) {
            // The last segment of an open path belongs to the last curve.
            if (index > 0 && !path._closed
                    && index === path._segments.length - 1)
                index--;
            return path.getCurves()[index] || null;
        }
        return null;
    },

    /**
     * The curve location that describes this segment's position on the path.
     *
     * @bean
     * @type CurveLocation
     */
    getLocation: function() {
        var curve = this.getCurve();
        return curve
                // Determine whether the parameter for this segment is 0 or 1.
                ? new CurveLocation(curve, this === curve._segment1 ? 0 : 1)
                : null;
    },

    /**
     * {@grouptitle Sibling Segments}
     *
     * The next segment in the {@link Path#segments} array that the segment
     * belongs to. If the segments belongs to a closed path, the first segment
     * is returned for the last segment of the path.
     *
     * @bean
     * @type Segment
     */
    getNext: function() {
        var segments = this._path && this._path._segments;
        return segments && (segments[this._index + 1]
                || this._path._closed && segments[0]) || null;
    },

    /**
     * Smooths the bezier curves that pass through this segment by taking into
     * account the segment's position and distance to the neighboring segments
     * and changing the direction and length of the segment's handles
     * accordingly without moving the segment itself.
     *
     * Two different smoothing methods are available:
     *
     * - `'catmull-rom'` uses the Catmull-Rom spline to smooth the segment.
     *
     *     The optionally passed factor controls the knot parametrization of the
     *     algorithm:
     *
     *     - `0.0`: the standard, uniform Catmull-Rom spline
     *     - `0.5`: the centripetal Catmull-Rom spline, guaranteeing no
     *         self-intersections
     *     - `1.0`: the chordal Catmull-Rom spline
     *
     * - `'geometric'` use a simple heuristic and empiric geometric method to
     *     smooth the segment's handles. The handles were weighted, meaning that
     *     big differences in distances between the segments will lead to
     *     probably undesired results.
     *
     *     The optionally passed factor defines the tension parameter (`0...1`),
     *     controlling the amount of smoothing as a factor by which to scale
     *     each handle.
     *
     * @option [options.type='catmull-rom'] {String} the type of smoothing
     *     method: {@values 'catmull-rom', 'geometric'}
     * @option options.factor {Number} the factor parameterizing the smoothing
     *     method — default: `0.5` for `'catmull-rom'`, `0.4` for `'geometric'`
     *
     * @param {Object} [options] the smoothing options
     *
     * @see PathItem#smooth([options])
     */
    smooth: function(options, _first, _last) {
        // _first = _last = false;
        var opts = options || {},
            type = opts.type,
            factor = opts.factor,
            prev = this.getPrevious(),
            next = this.getNext(),
            // Some precalculations valid for both 'catmull-rom' and 'geometric'
            p0 = (prev || this)._point,
            p1 = this._point,
            p2 = (next || this)._point,
            d1 = p0.getDistance(p1),
            d2 = p1.getDistance(p2);
        if (!type || type === 'catmull-rom') {
            // Implementation of by Catmull-Rom splines with factor parameter
            // based on work by @nicholaswmin:
            // https://github.com/nicholaswmin/VectorTests
            // Using these factors produces different types of splines:
            // 0.0: the standard, uniform Catmull-Rom spline
            // 0.5: the centripetal Catmull-Rom spline, guaranteeing no self-
            //      intersections
            // 1.0: the chordal Catmull-Rom spline
            var a = factor === undefined ? 0.5 : factor,
                d1_a = Math.pow(d1, a),
                d1_2a = d1_a * d1_a,
                d2_a = Math.pow(d2, a),
                d2_2a = d2_a * d2_a;
            if (!_first && prev) {
                var A = 2 * d2_2a + 3 * d2_a * d1_a + d1_2a,
                    N = 3 * d2_a * (d2_a + d1_a);
                this.setHandleIn(N !== 0
                    ? new Point(
                        (d2_2a * p0._x + A * p1._x - d1_2a * p2._x) / N - p1._x,
                        (d2_2a * p0._y + A * p1._y - d1_2a * p2._y) / N - p1._y)
                    : new Point());
            }
            if (!_last && next) {
                var A = 2 * d1_2a + 3 * d1_a * d2_a + d2_2a,
                    N = 3 * d1_a * (d1_a + d2_a);
                this.setHandleOut(N !== 0
                    ? new Point(
                        (d1_2a * p2._x + A * p1._x - d2_2a * p0._x) / N - p1._x,
                        (d1_2a * p2._y + A * p1._y - d2_2a * p0._y) / N - p1._y)
                    : new Point());
            }
        } else if (type === 'geometric') {
            // Geometric smoothing approach based on:
            // http://www.antigrain.com/research/bezier_interpolation/
            // http://scaledinnovation.com/analytics/splines/aboutSplines.html
            // http://bseth99.github.io/projects/animate/2-bezier-curves.html
            if (prev && next) {
                var vector = p0.subtract(p2),
                    t = factor === undefined ? 0.4 : factor,
                    k = t * d1 / (d1 + d2);
                if (!_first)
                    this.setHandleIn(vector.multiply(k));
                if (!_last)
                    this.setHandleOut(vector.multiply(k - t));
            }
        } else {
            throw new Error('Smoothing method \'' + type + '\' not supported.');
        }
    },

    /**
     * The previous segment in the {@link Path#segments} array that the
     * segment belongs to. If the segments belongs to a closed path, the last
     * segment is returned for the first segment of the path.
     *
     * @bean
     * @type Segment
     */
    getPrevious: function() {
        var segments = this._path && this._path._segments;
        return segments && (segments[this._index - 1]
                || this._path._closed && segments[segments.length - 1]) || null;
    },

    /**
     * Checks if the this is the first segment in the {@link Path#segments}
     * array.
     *
     * @return {Boolean} {@true if this is the first segment}
     */
    isFirst: function() {
        return !this._index;
    },

    /**
     * Checks if the this is the last segment in the {@link Path#segments}
     * array.
     *
     * @return {Boolean} {@true if this is the last segment}
     */
    isLast: function() {
        var path = this._path;
        return path && this._index === path._segments.length - 1 || false;
    },

    /**
     * Reverses the {@link #handleIn} and {@link #handleOut} vectors of this
     * segment, modifying the actual segment without creating a copy.
     *
     * @return {Segment} the reversed segment
     */
    reverse: function() {
        var handleIn = this._handleIn,
            handleOut = this._handleOut,
            tmp = handleIn.clone();
        handleIn.set(handleOut);
        handleOut.set(tmp);
    },

    /**
     * Returns the reversed the segment, without modifying the segment itself.
     * @return {Segment} the reversed segment
     */
    reversed: function() {
        return new Segment(this._point, this._handleOut, this._handleIn);
    },

    /**
     * Removes the segment from the path that it belongs to.
     * @return {Boolean} {@true if the segment was removed}
     */
    remove: function() {
        return this._path ? !!this._path.removeSegment(this._index) : false;
    },

    clone: function() {
        return new Segment(this._point, this._handleIn, this._handleOut);
    },

    equals: function(segment) {
        return segment === this || segment && this._class === segment._class
                && this._point.equals(segment._point)
                && this._handleIn.equals(segment._handleIn)
                && this._handleOut.equals(segment._handleOut)
                || false;
    },

    /**
     * @return {String} a string representation of the segment
     */
    toString: function() {
        var parts = [ 'point: ' + this._point ];
        if (!this._handleIn.isZero())
            parts.push('handleIn: ' + this._handleIn);
        if (!this._handleOut.isZero())
            parts.push('handleOut: ' + this._handleOut);
        return '{ ' + parts.join(', ') + ' }';
    },

    /**
     * Transform the segment by the specified matrix.
     *
     * @param {Matrix} matrix the matrix to transform the segment by
     */
    transform: function(matrix) {
        this._transformCoordinates(matrix, new Array(6), true);
        this._changed();
    },

    /**
     * Interpolates between the two specified segments and sets the point and
     * handles of this segment accordingly.
     *
     * @param {Segment} from the segment defining the geometry when `factor` is
     *     `0`
     * @param {Segment} to the segment defining the geometry when `factor` is
     *     `1`
     * @param {Number} factor the interpolation coefficient, typically between
     *     `0` and `1`, but extrapolation is possible too
     */
    interpolate: function(from, to, factor) {
        var u = 1 - factor,
            v = factor,
            point1 = from._point,
            point2 = to._point,
            handleIn1 = from._handleIn,
            handleIn2 = to._handleIn,
            handleOut2 = to._handleOut,
            handleOut1 = from._handleOut;
        this._point._set(
                u * point1._x + v * point2._x,
                u * point1._y + v * point2._y, true);
        this._handleIn._set(
                u * handleIn1._x + v * handleIn2._x,
                u * handleIn1._y + v * handleIn2._y, true);
        this._handleOut._set(
                u * handleOut1._x + v * handleOut2._x,
                u * handleOut1._y + v * handleOut2._y, true);
        this._changed();
    },

    _transformCoordinates: function(matrix, coords, change) {
        // Use matrix.transform version() that takes arrays of multiple
        // points for largely improved performance, as no calls to
        // Point.read() and Point constructors are necessary.
        var point = this._point,
            // If change is true, only transform handles if they are set, as
            // _transformCoordinates is called only to change the segment, no
            // to receive the coords.
            // This saves some computation time. If change is false, always
            // use the real handles, as we just want to receive a filled
            // coords array for getBounds().
            handleIn = !change || !this._handleIn.isZero()
                    ? this._handleIn : null,
            handleOut = !change || !this._handleOut.isZero()
                    ? this._handleOut : null,
            x = point._x,
            y = point._y,
            i = 2;
        coords[0] = x;
        coords[1] = y;
        // We need to convert handles to absolute coordinates in order
        // to transform them.
        if (handleIn) {
            coords[i++] = handleIn._x + x;
            coords[i++] = handleIn._y + y;
        }
        if (handleOut) {
            coords[i++] = handleOut._x + x;
            coords[i++] = handleOut._y + y;
        }
        // If no matrix was previded, this was just called to get the coords and
        // we are done now.
        if (matrix) {
            matrix._transformCoordinates(coords, coords, i / 2);
            x = coords[0];
            y = coords[1];
            if (change) {
                // If change is true, we need to set the new values back
                point._x = x;
                point._y = y;
                i = 2;
                if (handleIn) {
                    handleIn._x = coords[i++] - x;
                    handleIn._y = coords[i++] - y;
                }
                if (handleOut) {
                    handleOut._x = coords[i++] - x;
                    handleOut._y = coords[i++] - y;
                }
            } else {
                // We want to receive the results in coords, so make sure
                // handleIn and out are defined too, even if they're 0
                if (!handleIn) {
                    coords[i++] = x;
                    coords[i++] = y;
                }
                if (!handleOut) {
                    coords[i++] = x;
                    coords[i++] = y;
                }
            }
        }
        return coords;
    }
});
