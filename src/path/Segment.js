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

    /**
     * Creates a new Segment object.
     *
     * @name Segment#initialize
     * @param {Point} [point={x: 0, y: 0}] the anchor point of the segment
     * @param {Point} [handleIn={x: 0, y: 0}] the handle point relative to the
     * anchor point of the segment that describes the in tangent of the
     * segment
     * @param {Point} [handleOut={x: 0, y: 0}] the handle point relative to the
     * anchor point of the segment that describes the out tangent of the
     * segment
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
     * @param {Object} object an object literal containing properties to
     * be set on the segment
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
            point, handleIn, handleOut;
        // TODO: Use Point.read or Point.readNamed to read these?
        if (count === 0) {
            // Nothing
        } else if (count === 1) {
            // Note: This copies from existing segments through accessors.
            if (arg0.point) {
                point = arg0.point;
                handleIn = arg0.handleIn;
                handleOut = arg0.handleOut;
            } else {
                point = arg0;
            }
        } else if (count === 2 && typeof arg0 === 'number') {
            point = arguments;
        } else if (count <= 3) {
            point = arg0;
            // Doesn't matter if these arguments exist, SegmentPointcreate
            // produces creates points with (0, 0) otherwise
            handleIn = arg1;
            handleOut = arg2;
        } else { // Read points from the arguments list as a row of numbers
            point = arg0 !== undefined ? [ arg0, arg1 ] : null;
            handleIn = arg2 !== undefined ? [ arg2, arg3 ] : null;
            handleOut = arg4 !== undefined ? [ arg4, arg5 ] : null;
        }
        new SegmentPoint(point, this, '_point');
        new SegmentPoint(handleIn, this, '_handleIn');
        new SegmentPoint(handleOut, this, '_handleOut');
    },

    _serialize: function(options) {
        // If the Segment is linear, only serialize point, otherwise handles too
        return Base.serialize(this.isLinear() ? this._point
                : [this._point, this._handleIn, this._handleOut],
                options, true);
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
     * @type Point
     * @bean
     */
    getPoint: function() {
        return this._point;
    },

    setPoint: function(/* point */) {
        var point = Point.read(arguments);
        // Do not replace the internal object but update it instead, so
        // references to it are kept alive.
        this._point.set(point.x, point.y);
    },

    /**
     * The handle point relative to the anchor point of the segment that
     * describes the in tangent of the segment.
     *
     * @type Point
     * @bean
     */
    getHandleIn: function() {
        return this._handleIn;
    },

    setHandleIn: function(/* point */) {
        var point = Point.read(arguments);
        // See #setPoint:
        this._handleIn.set(point.x, point.y);
        // Update corner accordingly
        // this.corner = !this._handleIn.isCollinear(this._handleOut);
    },

    /**
     * The handle point relative to the anchor point of the segment that
     * describes the out tangent of the segment.
     *
     * @type Point
     * @bean
     */
    getHandleOut: function() {
        return this._handleOut;
    },

    setHandleOut: function(/* point */) {
        var point = Point.read(arguments);
        // See #setPoint:
        this._handleOut.set(point.x, point.y);
        // Update corner accordingly
        // this.corner = !this._handleIn.isCollinear(this._handleOut);
    },

    // TODO: Rename this to #corner?
    /**
     * Specifies whether the segment has no handles defined, meaning it connects
     * two straight lines.
     *
     * @type Boolean
     * @bean
     */
    isLinear: function() {
        return this._handleIn.isZero() && this._handleOut.isZero();
    },

    setLinear: function(linear) {
        if (linear) {
            this._handleIn.set(0, 0);
            this._handleOut.set(0, 0);
        } else {
            // TODO: smooth() ?
        }
    },

    // DOCS: #isCollinear(segment), #isOrthogonal(), #isArc()

    /**
     * Returns true if the the two segments are the beginning of two lines and
     * if these two lines are running parallel.
     */
    isCollinear: function(segment) {
        var next1 = this.getNext(),
            next2 = segment.getNext();
        return this._handleOut.isZero() && next1._handleIn.isZero()
                && segment._handleOut.isZero() && next2._handleIn.isZero()
                && next1._point.subtract(this._point).isCollinear(
                    next2._point.subtract(segment._point));
    },

    // TODO: Remove version with typo after a while (deprecated June 2015)
    isColinear: '#isCollinear',

    isOrthogonal: function() {
        var prev = this.getPrevious(),
            next = this.getNext();
        return prev._handleOut.isZero() && this._handleIn.isZero()
            && this._handleOut.isZero() && next._handleIn.isZero()
            && this._point.subtract(prev._point).isOrthogonal(
                    next._point.subtract(this._point));
    },

    /**
     * Returns true if the segment at the given index is the beginning of an
     * orthogonal arc segment. The code looks at the length of the handles and
     * their relation to the distance to the imaginary corner point. If the
     * relation is kappa, then it's an arc.
     */
    isArc: function() {
        var next = this.getNext(),
            handle1 = this._handleOut,
            handle2 = next._handleIn,
            kappa = /*#=*/Numerical.KAPPA;
        if (handle1.isOrthogonal(handle2)) {
            var from = this._point,
                to = next._point,
                // Find the corner point by intersecting the lines described
                // by both handles:
                corner = new Line(from, handle1, true).intersect(
                        new Line(to, handle2, true), true);
            return corner && Numerical.isZero(handle1.getLength() /
                    corner.subtract(from).getLength() - kappa)
                && Numerical.isZero(handle2.getLength() /
                    corner.subtract(to).getLength() - kappa);
        }
        return false;
    },

    _selectionState: 0,

    /**
     * Specifies whether the {@link #point} of the segment is selected.
     * @type Boolean
     * @bean
     * @example {@paperscript}
     * var path = new Path.Circle({
     *     center: [80, 50],
     *     radius: 40
     * });
     *
     * // Select the third segment point:
     * path.segments[2].selected = true;
     */
    isSelected: function(_point) {
        var state = this._selectionState;
        return !_point ? !!(state & /*#=*/SelectionState.SEGMENT)
            : _point === this._point ? !!(state & /*#=*/SelectionState.POINT)
            : _point === this._handleIn ? !!(state & /*#=*/SelectionState.HANDLE_IN)
            : _point === this._handleOut ? !!(state & /*#=*/SelectionState.HANDLE_OUT)
            : false;
    },

    setSelected: function(selected, _point) {
        var path = this._path,
            selected = !!selected, // convert to boolean
            state = this._selectionState,
            oldState = state,
            flag = !_point ? /*#=*/SelectionState.SEGMENT
                    : _point === this._point ? /*#=*/SelectionState.POINT
                    : _point === this._handleIn ? /*#=*/SelectionState.HANDLE_IN
                    : _point === this._handleOut ? /*#=*/SelectionState.HANDLE_OUT
                    : 0;
        if (selected) {
            state |= flag;
        } else {
            state &= ~flag;
        }
        // Set the selection state even if path is not defined yet, to allow
        // selected segments to be inserted into paths and make JSON
        // deserialization work.
        this._selectionState = state;
        // If the selection state of the segment has changed, we need to let
        // it's path know and possibly add or remove it from
        // project._selectedItems
        if (path && state !== oldState) {
            path._updateSelection(this, oldState, state);
            // Let path know that we changed something and the view should be
            // redrawn
            path._changed(/*#=*/Change.ATTRIBUTE);
        }
    },

    /**
     * {@grouptitle Hierarchy}
     *
     * The index of the segment in the {@link Path#segments} array that the
     * segment belongs to.
     *
     * @type Number
     * @bean
     */
    getIndex: function() {
        return this._index !== undefined ? this._index : null;
    },

    /**
     * The path that the segment belongs to.
     *
     * @type Path
     * @bean
     */
    getPath: function() {
        return this._path || null;
    },

    /**
     * The curve that the segment belongs to. For the last segment of an open
     * path, the previous segment is returned.
     *
     * @type Curve
     * @bean
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
     * The curve location that describes this segment's position ont the path.
     *
     * @type CurveLocation
     * @bean
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
     * @type Segment
     * @bean
     */
    getNext: function() {
        var segments = this._path && this._path._segments;
        return segments && (segments[this._index + 1]
                || this._path._closed && segments[0]) || null;
    },

    /**
     * The previous segment in the {@link Path#segments} array that the
     * segment belongs to. If the segments belongs to a closed path, the last
     * segment is returned for the first segment of the path.
     *
     * @type Segment
     * @bean
     */
    getPrevious: function() {
        var segments = this._path && this._path._segments;
        return segments && (segments[this._index - 1]
                || this._path._closed && segments[segments.length - 1]) || null;
    },

    /**
     * Returns the reversed the segment, without modifying the segment itself.
     * @return {Segment} the reversed segment
     */
    reverse: function() {
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
                i  = 2;
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
