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
 * @name Path
 *
 * @class The path item represents a path in a Paper.js project.
 *
 * @extends PathItem
 */
// DOCS: Explain that path matrix is always applied with each transformation.
var Path = PathItem.extend(/** @lends Path# */{
    _class: 'Path',
    _serializeFields: {
        segments: [],
        closed: false
    },

    /**
     * Creates a new path item and places it at the top of the active layer.
     *
     * @name Path#initialize
     * @param {Segment[]} [segments] An array of segments (or points to be
     * converted to segments) that will be added to the path
     * @return {Path} the newly created path
     *
     * @example
     * // Create an empty path and add segments to it:
     * var path = new Path();
     * path.strokeColor = 'black';
     * path.add(new Point(30, 30));
     * path.add(new Point(100, 100));
     *
     * @example
     * // Create a path with two segments:
     * var segments = [new Point(30, 30), new Point(100, 100)];
     * var path = new Path(segments);
     * path.strokeColor = 'black';
     */
    /**
     * Creates a new path item from an object description and places it at the
     * top of the active layer.
     *
     * @name Path#initialize
     * @param {Object} object an object containing properties to be set on the
     *     path
     * @return {Path} the newly created path
     *
     * @example {@paperscript}
     * var path = new Path({
     *     segments: [[20, 20], [80, 80], [140, 20]],
     *     fillColor: 'black',
     *     closed: true
     * });
     *
     * @example {@paperscript}
     * var path = new Path({
     *     segments: [[20, 20], [80, 80], [140, 20]],
     *     strokeColor: 'red',
     *     strokeWidth: 20,
     *     strokeCap: 'round',
     *     selected: true
     * });
     */
    /**
     * Creates a new path item from SVG path-data and places it at the top of
     * the active layer.
     *
     * @name Path#initialize
     * @param {String} pathData the SVG path-data that describes the geometry
     * of this path
     * @return {Path} the newly created path
     *
     * @example {@paperscript}
     * var pathData = 'M100,50c0,27.614-22.386,50-50,50S0,77.614,0,50S22.386,0,50,0S100,22.386,100,50';
     * var path = new Path(pathData);
     * path.fillColor = 'red';
     */
    initialize: function Path(arg) {
        this._closed = false;
        this._segments = [];
        // Increased on every change of segments, so CurveLocation knows when to
        // update its internally cached values.
        this._version = 0;
        // arg can either be an object literal containing properties to be set
        // on the path, a list of segments to be set, or the first of multiple
        // arguments describing separate segments.
        // If it is an array, it can also be a description of a point, so
        // check its first entry for object as well.
        // But first see if segments are directly passed at all. If not, try
        // _set(arg).
        var args = arguments,
            segments = Array.isArray(arg)
            ? typeof arg[0] === 'object'
                ? arg
                : args
            // See if it behaves like a segment or a point, but filter out
            // rectangles, as accepted by some Path.Constructor constructors.
            : arg && (arg.size === undefined && (arg.x !== undefined
                    || arg.point !== undefined))
                ? args
                : null;
        // Always call setSegments() to initialize a few related variables.
        if (segments && segments.length > 0) {
            // This sets _curves and _segmentSelection too!
            this.setSegments(segments);
        } else {
            this._curves = undefined; // For hidden class optimization
            this._segmentSelection = 0;
            if (!segments && typeof arg === 'string') {
                this.setPathData(arg);
                // Erase for _initialize() call below.
                arg = null;
            }
        }
        // Only pass on arg as props if it wasn't consumed for segments already.
        this._initialize(!segments && arg);
    },

    _equals: function(item) {
        return this._closed === item._closed
                && Base.equals(this._segments, item._segments);
    },

    copyContent: function(source) {
        this.setSegments(source._segments);
        this._closed = source._closed;
    },

    _changed: function _changed(flags) {
        _changed.base.call(this, flags);
        if (flags & /*#=*/ChangeFlag.GEOMETRY) {
            this._length = this._area = undefined;
            if (flags & /*#=*/ChangeFlag.SEGMENTS) {
                this._version++; // See CurveLocation
            } else if (this._curves) {
                // Only notify all curves if we're not told that only segments
                // have changed and took already care of notifications.
               for (var i = 0, l = this._curves.length; i < l; i++)
                    this._curves[i]._changed();
            }
        } else if (flags & /*#=*/ChangeFlag.STROKE) {
            // TODO: We could preserve the purely geometric bounds that are not
            // affected by stroke: _bounds.bounds and _bounds.handleBounds
            this._bounds = undefined;
        }
    },

    getStyle: function() {
        // If this path is part of a compound-path, return the parent's style.
        var parent = this._parent;
        return (parent instanceof CompoundPath ? parent : this)._style;
    },

    /**
     * The segments contained within the path.
     *
     * @bean
     * @type Segment[]
     */
    getSegments: function() {
        return this._segments;
    },

    setSegments: function(segments) {
        var fullySelected = this.isFullySelected(),
            length = segments && segments.length;
        this._segments.length = 0;
        this._segmentSelection = 0;
        // Calculate new curves next time we call getCurves()
        this._curves = undefined;
        if (length) {
            // See if the last segment is a boolean describing the path's closed
            // state. This is part of the shorter segment array notation that
            // can also be nested to create compound-paths out of one array.
            var last = segments[length - 1];
            if (typeof last === 'boolean') {
                this.setClosed(last);
                length--;
            }
            this._add(Segment.readList(segments, 0, {}, length));
        }
        // Preserve fullySelected state.
        // TODO: Do we still need this?
        if (fullySelected)
            this.setFullySelected(true);
    },

    /**
     * The first Segment contained within the path.
     *
     * @bean
     * @type Segment
     */
    getFirstSegment: function() {
        return this._segments[0];
    },

    /**
     * The last Segment contained within the path.
     *
     * @bean
     * @type Segment
     */
    getLastSegment: function() {
        return this._segments[this._segments.length - 1];
    },

    /**
     * The curves contained within the path.
     *
     * @bean
     * @type Curve[]
     */
    getCurves: function() {
        var curves = this._curves,
            segments = this._segments;
        if (!curves) {
            var length = this._countCurves();
            curves = this._curves = new Array(length);
            for (var i = 0; i < length; i++)
                curves[i] = new Curve(this, segments[i],
                    // Use first segment for segment2 of closing curve
                    segments[i + 1] || segments[0]);
        }
        return curves;
    },

    /**
     * The first Curve contained within the path.
     *
     * @bean
     * @type Curve
     */
    getFirstCurve: function() {
        return this.getCurves()[0];
    },

    /**
     * The last Curve contained within the path.
     *
     * @bean
     * @type Curve
     */
    getLastCurve: function() {
        var curves = this.getCurves();
        return curves[curves.length - 1];
    },

    /**
     * Specifies whether the path is closed. If it is closed, Paper.js connects
     * the first and last segments.
     *
     * @bean
     * @type Boolean
     *
     * @example {@paperscript}
     * var myPath = new Path();
     * myPath.strokeColor = 'black';
     * myPath.add(new Point(50, 75));
     * myPath.add(new Point(100, 25));
     * myPath.add(new Point(150, 75));
     *
     * // Close the path:
     * myPath.closed = true;
     */
    isClosed: function() {
        return this._closed;
    },

    setClosed: function(closed) {
        // On-the-fly conversion to boolean:
        if (this._closed != (closed = !!closed)) {
            this._closed = closed;
            // Update _curves length
            if (this._curves) {
                var length = this._curves.length = this._countCurves();
                // If we were closing this path, we need to add a new curve now
                if (closed)
                    this._curves[length - 1] = new Curve(this,
                        this._segments[length - 1], this._segments[0]);
            }
            // Use SEGMENTS notification instead of GEOMETRY since curves are
            // up-to-date and don't need notification.
            this._changed(/*#=*/Change.SEGMENTS);
        }
    }
}, /** @lends Path# */{
    // Enforce creation of beans, as bean getters have hidden parameters.
    // See #getPathData() below.
    beans: true,

    getPathData: function(_matrix, _precision) {
        // NOTE: #setPathData() is defined in PathItem.
        var segments = this._segments,
            length = segments.length,
            f = new Formatter(_precision),
            coords = new Array(6),
            first = true,
            curX, curY,
            prevX, prevY,
            inX, inY,
            outX, outY,
            parts = [];

        function addSegment(segment, skipLine) {
            segment._transformCoordinates(_matrix, coords);
            curX = coords[0];
            curY = coords[1];
            if (first) {
                parts.push('M' + f.pair(curX, curY));
                first = false;
            } else {
                inX = coords[2];
                inY = coords[3];
                if (inX === curX && inY === curY
                        && outX === prevX && outY === prevY) {
                    // l = relative lineto:
                    if (!skipLine) {
                        var dx = curX - prevX,
                            dy = curY - prevY;
                        parts.push(
                              dx === 0 ? 'v' + f.number(dy)
                            : dy === 0 ? 'h' + f.number(dx)
                            : 'l' + f.pair(dx, dy));
                    }
                } else {
                    // c = relative curveto:
                    parts.push('c' + f.pair(outX - prevX, outY - prevY)
                             + ' ' + f.pair( inX - prevX,  inY - prevY)
                             + ' ' + f.pair(curX - prevX, curY - prevY));
                }
            }
            prevX = curX;
            prevY = curY;
            outX = coords[4];
            outY = coords[5];
        }

        if (!length)
            return '';

        for (var i = 0; i < length; i++)
            addSegment(segments[i]);
        // Close path by drawing first segment again
        if (this._closed && length > 0) {
            addSegment(segments[0], true);
            parts.push('z');
        }
        return parts.join('');
    },

    // TODO: Consider adding getSubPath(a, b), returning a part of the current
    // path, with the added benefit that b can be < a, and closed looping is
    // taken into account.

    isEmpty: function() {
        return !this._segments.length;
    },

    _transformContent: function(matrix) {
        var segments = this._segments,
            coords = new Array(6);
        for (var i = 0, l = segments.length; i < l; i++)
            segments[i]._transformCoordinates(matrix, coords, true);
        return true;
    },

    /**
     * Private method that adds segments to the segment list. It assumes that
     * the passed object is an array of segments already and does not perform
     * any checks. If a curves list was requested, it will be kept in sync with
     * the segments list automatically.
     */
    _add: function(segs, index) {
        // Local short-cuts:
        var segments = this._segments,
            curves = this._curves,
            amount = segs.length,
            append = index == null,
            index = append ? segments.length : index;
        // Scan through segments to add first, convert if necessary and set
        // _path and _index references on them.
        for (var i = 0; i < amount; i++) {
            var segment = segs[i];
            // If the segments belong to another path already, clone them before
            // adding:
            if (segment._path)
                segment = segs[i] = segment.clone();
            segment._path = this;
            segment._index = index + i;
            // If parts of this segment are selected, adjust the internal
            // _segmentSelection now
            if (segment._selection)
                this._updateSelection(segment, 0, segment._selection);
        }
        if (append) {
            // Append them all at the end.
            Base.push(segments, segs);
        } else {
            // Insert somewhere else
            segments.splice.apply(segments, [index, 0].concat(segs));
            // Adjust the indices of the segments above.
            for (var i = index + amount, l = segments.length; i < l; i++)
                segments[i]._index = i;
        }
        // Keep the curves list in sync all the time in case it was requested
        // already.
        if (curves) {
            var total = this._countCurves(),
                // If we're adding a new segment to the end of an open path,
                // we need to step one index down to get its curve.
                start = index > 0 && index + amount - 1 === total ? index - 1
                    : index,
                insert = start,
                end = Math.min(start + amount, total);
            if (segs._curves) {
                // Reuse removed curves.
                curves.splice.apply(curves, [start, 0].concat(segs._curves));
                insert += segs._curves.length;
            }
            // Insert new curves, but do not initialize their segments yet,
            // since #_adjustCurves() handles all that for us.
            for (var i = insert; i < end; i++)
                curves.splice(i, 0, new Curve(this, null, null));
            // Adjust segments for the curves before and after the removed ones
            this._adjustCurves(start, end);
        }
        // Use SEGMENTS notification instead of GEOMETRY since curves are kept
        // up-to-date by _adjustCurves() and don't need notification.
        this._changed(/*#=*/Change.SEGMENTS);
        return segs;
    },

    /**
     * Adjusts segments of curves before and after inserted / removed segments.
     */
    _adjustCurves: function(start, end) {
        var segments = this._segments,
            curves = this._curves,
            curve;
        for (var i = start; i < end; i++) {
            curve = curves[i];
            curve._path = this;
            curve._segment1 = segments[i];
            curve._segment2 = segments[i + 1] || segments[0];
            curve._changed();
        }
        // If it's the first segment, correct the last segment of closed
        // paths too:
        if (curve = curves[this._closed && !start ? segments.length - 1
                : start - 1]) {
            curve._segment2 = segments[start] || segments[0];
            curve._changed();
        }
        // Fix the segment after the modified range, if it exists
        if (curve = curves[end]) {
            curve._segment1 = segments[end];
            curve._changed();
        }
    },

    /**
     * Returns the amount of curves this path item is supposed to have, based
     * on its amount of #segments and #closed state.
     */
    _countCurves: function() {
        var length = this._segments.length;
        // Reduce length by one if it's an open path:
        return !this._closed && length > 0 ? length - 1 : length;
    },

    // DOCS: find a way to document the variable segment parameters of Path#add
    /**
     * Adds one or more segments to the end of the {@link #segments} array of
     * this path.
     *
     * @param {...(Segment|Point|Number[])} segment the segment or point to be
     * added.
     * @return {Segment|Segment[]} the added segment(s). This is not necessarily
     * the same object, e.g. if the segment to be added already belongs to
     * another path.
     *
     * @example {@paperscript}
     * // Adding segments to a path using point objects:
     * var path = new Path({
     *     strokeColor: 'black'
     * });
     *
     * // Add a segment at {x: 30, y: 75}
     * path.add(new Point(30, 75));
     *
     * // Add two segments in one go at {x: 100, y: 20}
     * // and {x: 170, y: 75}:
     * path.add(new Point(100, 20), new Point(170, 75));
     *
     * @example {@paperscript}
     * // Adding segments to a path using arrays containing number pairs:
     * var path = new Path({
     *     strokeColor: 'black'
     * });
     *
     * // Add a segment at {x: 30, y: 75}
     * path.add([30, 75]);
     *
     * // Add two segments in one go at {x: 100, y: 20}
     * // and {x: 170, y: 75}:
     * path.add([100, 20], [170, 75]);
     *
     * @example {@paperscript}
     * // Adding segments to a path using objects:
     * var path = new Path({
     *     strokeColor: 'black'
     * });
     *
     * // Add a segment at {x: 30, y: 75}
     * path.add({x: 30, y: 75});
     *
     * // Add two segments in one go at {x: 100, y: 20}
     * // and {x: 170, y: 75}:
     * path.add({x: 100, y: 20}, {x: 170, y: 75});
     *
     * @example {@paperscript}
     * // Adding a segment with handles to a path:
     * var path = new Path({
     *     strokeColor: 'black'
     * });
     *
     * path.add(new Point(30, 75));
     *
     * // Add a segment with handles:
     * var point = new Point(100, 20);
     * var handleIn = new Point(-50, 0);
     * var handleOut = new Point(50, 0);
     * var added = path.add(new Segment(point, handleIn, handleOut));
     *
     * // Select the added segment, so we can see its handles:
     * added.selected = true;
     *
     * path.add(new Point(170, 75));
     */
    add: function(segment1 /*, segment2, ... */) {
        var args = arguments;
        return args.length > 1 && typeof segment1 !== 'number'
            // addSegments
            ? this._add(Segment.readList(args))
            // addSegment
            : this._add([ Segment.read(args) ])[0];
    },

    /**
     * Inserts one or more segments at a given index in the list of this path's
     * segments.
     *
     * @param {Number} index the index at which to insert the segment
     * @param {Segment|Point} segment the segment or point to be inserted.
     * @return {Segment} the added segment. This is not necessarily the same
     * object, e.g. if the segment to be added already belongs to another path
     *
     * @example {@paperscript}
     * // Inserting a segment:
     * var myPath = new Path();
     * myPath.strokeColor = 'black';
     * myPath.add(new Point(50, 75));
     * myPath.add(new Point(150, 75));
     *
     * // Insert a new segment into myPath at index 1:
     * myPath.insert(1, new Point(100, 25));
     *
     * // Select the segment which we just inserted:
     * myPath.segments[1].selected = true;
     *
     * @example {@paperscript}
     * // Inserting multiple segments:
     * var myPath = new Path();
     * myPath.strokeColor = 'black';
     * myPath.add(new Point(50, 75));
     * myPath.add(new Point(150, 75));
     *
     * // Insert two segments into myPath at index 1:
     * myPath.insert(1, [80, 25], [120, 25]);
     *
     * // Select the segments which we just inserted:
     * myPath.segments[1].selected = true;
     * myPath.segments[2].selected = true;
     */
    insert: function(index, segment1 /*, segment2, ... */) {
        var args = arguments;
        return args.length > 2 && typeof segment1 !== 'number'
            // insertSegments
            ? this._add(Segment.readList(args, 1), index)
            // insertSegment
            : this._add([ Segment.read(args, 1) ], index)[0];
    },

    addSegment: function(/* segment */) {
        return this._add([ Segment.read(arguments) ])[0];
    },

    insertSegment: function(index /*, segment */) {
        return this._add([ Segment.read(arguments, 1) ], index)[0];
    },

    /**
     * Adds an array of segments (or types that can be converted to segments)
     * to the end of the {@link #segments} array.
     *
     * @param {Segment[]} segments
     * @return {Segment[]} an array of the added segments. These segments are
     * not necessarily the same objects, e.g. if the segment to be added already
     * belongs to another path
     *
     * @example {@paperscript}
     * // Adding an array of Point objects:
     * var path = new Path({
     *     strokeColor: 'black'
     * });
     * var points = [new Point(30, 50), new Point(170, 50)];
     * path.addSegments(points);
     *
     * @example {@paperscript}
     * // Adding an array of [x, y] arrays:
     * var path = new Path({
     *     strokeColor: 'black'
     * });
     * var array = [[30, 75], [100, 20], [170, 75]];
     * path.addSegments(array);
     *
     * @example {@paperscript}
     * // Adding segments from one path to another:
     *
     * var path = new Path({
     *     strokeColor: 'black'
     * });
     * path.addSegments([[30, 75], [100, 20], [170, 75]]);
     *
     * var path2 = new Path();
     * path2.strokeColor = 'red';
     *
     * // Add the second and third segments of path to path2:
     * path2.add(path.segments[1], path.segments[2]);
     *
     * // Move path2 30pt to the right:
     * path2.position.x += 30;
     */
    addSegments: function(segments) {
        return this._add(Segment.readList(segments));
    },

    /**
     * Inserts an array of segments at a given index in the path's
     * {@link #segments} array.
     *
     * @param {Number} index the index at which to insert the segments
     * @param {Segment[]} segments the segments to be inserted
     * @return {Segment[]} an array of the added segments. These segments are
     * not necessarily the same objects, e.g. if the segment to be added already
     * belongs to another path
     */
    insertSegments: function(index, segments) {
        return this._add(Segment.readList(segments), index);
    },

    /**
     * Removes the segment at the specified index of the path's
     * {@link #segments} array.
     *
     * @param {Number} index the index of the segment to be removed
     * @return {Segment} the removed segment
     *
     * @example {@paperscript}
     * // Removing a segment from a path:
     *
     * // Create a circle shaped path at { x: 80, y: 50 }
     * // with a radius of 35:
     * var path = new Path.Circle({
     *     center: new Point(80, 50),
     *     radius: 35,
     *     strokeColor: 'black'
     * });
     *
     * // Remove its second segment:
     * path.removeSegment(1);
     *
     * // Select the path, so we can see its segments:
     * path.selected = true;
     */
    removeSegment: function(index) {
        return this.removeSegments(index, index + 1)[0] || null;
    },

    /**
     * Removes all segments from the path's {@link #segments} array.
     *
     * @name Path#removeSegments
     * @alias Path#clear
     * @function
     * @return {Segment[]} an array containing the removed segments
     */
    /**
     * Removes the segments from the specified `from` index to the `to` index
     * from the path's {@link #segments} array.
     *
     * @param {Number} from the beginning index, inclusive
     * @param {Number} [to=segments.length] the ending index, exclusive
     * @return {Segment[]} an array containing the removed segments
     *
     * @example {@paperscript}
     * // Removing segments from a path:
     *
     * // Create a circle shaped path at { x: 80, y: 50 }
     * // with a radius of 35:
     * var path = new Path.Circle({
     *     center: new Point(80, 50),
     *     radius: 35,
     *     strokeColor: 'black'
     * });
     *
     * // Remove the segments from index 1 till index 2:
     * path.removeSegments(1, 2);
     *
     * // Select the path, so we can see its segments:
     * path.selected = true;
     */
    removeSegments: function(start, end, _includeCurves) {
        start = start || 0;
        end = Base.pick(end, this._segments.length);
        var segments = this._segments,
            curves = this._curves,
            count = segments.length, // segment count before removal
            removed = segments.splice(start, end - start),
            amount = removed.length;
        if (!amount)
            return removed;
        // Update selection state accordingly
        for (var i = 0; i < amount; i++) {
            var segment = removed[i];
            if (segment._selection)
                this._updateSelection(segment, segment._selection, 0);
            // Clear the indices and path references of the removed segments
            segment._index = segment._path = null;
        }
        // Adjust the indices of the segments above.
        for (var i = start, l = segments.length; i < l; i++)
            segments[i]._index = i;
        // Keep curves in sync
        if (curves) {
            // If we're removing the last segment, remove the last curve (the
            // one to the left of the segment, not to the right, as normally).
            // Also take into account closed paths, which have one curve more
            // than segments.
            var index = start > 0 && end === count + (this._closed ? 1 : 0)
                    ? start - 1
                    : start,
                curves = curves.splice(index, amount);
            // Unlink the removed curves from the path.
            for (var i = curves.length - 1; i >= 0; i--)
                curves[i]._path = null;
            // Return the removed curves as well, if we're asked to include
            // them, but exclude the first curve, since that's shared with the
            // previous segment and does not connect the returned segments.
            if (_includeCurves)
                removed._curves = curves.slice(1);
            // Adjust segments for the curves before and after the removed ones
            this._adjustCurves(index, index);
        }
        // Use SEGMENTS notification instead of GEOMETRY since curves are kept
        // up-to-date by _adjustCurves() and don't need notification.
        this._changed(/*#=*/Change.SEGMENTS);
        return removed;
    },

    // DOCS Path#clear()
    clear: '#removeSegments',

    /**
     * Checks if any of the curves in the path have curve handles set.
     *
     * @return {Boolean} {@true if the path has curve handles set}
     * @see Segment#hasHandles()
     * @see Curve#hasHandles()
     */
    hasHandles: function() {
        var segments = this._segments;
        for (var i = 0, l = segments.length; i < l; i++) {
            if (segments[i].hasHandles())
                return true;
        }
        return false;
    },

    /**
     * Clears the path's handles by setting their coordinates to zero,
     * turning the path into a polygon (or a polyline if it isn't closed).
     */
    clearHandles: function() {
        var segments = this._segments;
        for (var i = 0, l = segments.length; i < l; i++)
            segments[i].clearHandles();
    },

    /**
     * The approximate length of the path.
     *
     * @bean
     * @type Number
     */
    getLength: function() {
        if (this._length == null) {
            var curves = this.getCurves(),
                length = 0;
            for (var i = 0, l = curves.length; i < l; i++)
                length += curves[i].getLength();
            this._length = length;
        }
        return this._length;
    },

    /**
     * The area that the path's geometry is covering. Self-intersecting paths
     * can contain sub-areas that cancel each other out.
     *
     * @bean
     * @type Number
     */
    getArea: function() {
        var area = this._area;
        if (area == null) {
            var segments = this._segments,
                closed = this._closed;
            area = 0;
            for (var i = 0, l = segments.length; i < l; i++) {
                var last = i + 1 === l;
                area += Curve.getArea(Curve.getValues(
                        segments[i], segments[last ? 0 : i + 1],
                        // If this is the last curve and the last is not closed,
                        // connect with a straight curve and ignore the handles.
                        null, last && !closed));
            }
            this._area = area;
        }
        return area;
    },

    /**
     * Specifies whether an path is selected and will also return `true` if the
     * path is partially selected, i.e. one or more of its segments is selected.
     *
     * Paper.js draws the visual outlines of selected items on top of your
     * project. This can be useful for debugging, as it allows you to see the
     * construction of paths, position of path curves, individual segment points
     * and bounding boxes of symbol and raster items.
     *
     * @bean
     * @type Boolean
     * @see Project#selectedItems
     * @see Segment#selected
     * @see Point#selected
     *
     * @example {@paperscript}
     * // Selecting an item:
     * var path = new Path.Circle({
     *     center: [80, 50],
     *     radius: 35
     * });
     * path.selected = true; // Select the path
     *
     * @example {@paperscript}
     * // A path is selected, if one or more of its segments is selected:
     * var path = new Path.Circle({
     *     center: [80, 50],
     *     radius: 35
     * });
     *
     * // Select the second segment of the path:
     * path.segments[1].selected = true;
     *
     * // If the path is selected (which it is), set its fill color to red:
     * if (path.selected) {
     *     path.fillColor = 'red';
     * }
     *
     */
    /**
     * Specifies whether the path and all its segments are selected. Cannot be
     * `true` on an empty path.
     *
     * @bean
     * @type Boolean
     *
     * @example {@paperscript}
     * // A path is fully selected, if all of its segments are selected:
     * var path = new Path.Circle({
     *     center: [80, 50],
     *     radius: 35
     * });
     * path.fullySelected = true;
     *
     * var path2 = new Path.Circle({
     *     center: [180, 50],
     *     radius: 35
     * });
     *
     * // Deselect the second segment of the second path:
     * path2.segments[1].selected = false;
     *
     * // If the path is fully selected (which it is),
     * // set its fill color to red:
     * if (path.fullySelected) {
     *     path.fillColor = 'red';
     * }
     *
     * // If the second path is fully selected (which it isn't, since we just
     * // deselected its second segment),
     * // set its fill color to red:
     * if (path2.fullySelected) {
     *     path2.fillColor = 'red';
     * }
     */
    isFullySelected: function() {
        var length = this._segments.length;
        return this.isSelected() && length > 0 && this._segmentSelection
                === length * /*#=*/SegmentSelection.ALL;
    },

    setFullySelected: function(selected) {
        // No need to call _selectSegments() when selected is false, since
        // #setSelected() does that for us
        if (selected)
            this._selectSegments(true);
        this.setSelected(selected);
    },

    setSelection: function setSelection(selection) {
        // Deselect all segments when path is marked as not selected
        if (!(selection & /*#=*/ItemSelection.ITEM))
            this._selectSegments(false);
        setSelection.base.call(this, selection);
    },

    _selectSegments: function(selected) {
        var segments = this._segments,
            length = segments.length,
            selection = selected ? /*#=*/SegmentSelection.ALL : 0;
        this._segmentSelection = selection * length;
        for (var i = 0; i < length; i++)
            segments[i]._selection = selection;
    },

    _updateSelection: function(segment, oldSelection, newSelection) {
        segment._selection = newSelection;
        var selection = this._segmentSelection += newSelection - oldSelection;
        // Set this path as selected in case we have selected segments. Do not
        // unselect if we're down to 0, as the path itself can still remain
        // selected even when empty.
        if (selection > 0)
            this.setSelected(true);
    },

    /**
     * Divides the path on the curve at the given offset or location into two
     * curves, by inserting a new segment at the given location.
     *
     * @param {Number|CurveLocation} location the offset or location on the
     *     path at which to divide the existing curve by inserting a new segment
     * @return {Segment} the newly inserted segment if the location is valid,
     *     `null` otherwise
     * @see Curve#divideAt(location)
     */
    divideAt: function(location) {
        var loc = this.getLocationAt(location),
            curve;
        return loc && (curve = loc.getCurve().divideAt(loc.getCurveOffset()))
                ? curve._segment1
                : null;
    },

    /**
     * Splits the path at the given offset or location. After splitting, the
     * path will be open. If the path was open already, splitting will result in
     * two paths.
     *
     * @param {Number|CurveLocation} location the offset or location at which to
     *     split the path
     * @return {Path} the newly created path after splitting, if any
     *
     * @example {@paperscript}
     * var path = new Path.Circle({
     *     center: view.center,
     *     radius: 40,
     *     strokeColor: 'black'
     * });
     *
     * var pointOnCircle = view.center + {
     *     length: 40,
     *     angle: 30
     * };
     *
     * var location = path.getNearestLocation(pointOnCircle);
     *
     * path.splitAt(location);
     * path.lastSegment.selected = true;
     *
     * @example {@paperscript} // Splitting an open path
     * // Draw a V shaped path:
     * var path = new Path([20, 20], [50, 80], [80, 20]);
     * path.strokeColor = 'black';
     *
     * // Split the path half-way:
     * var path2 = path.splitAt(path.length / 2);
     *
     * // Give the resulting path a red stroke-color
     * // and move it 20px to the right:
     * path2.strokeColor = 'red';
     * path2.position.x += 20;
     *
     * @example {@paperscript} // Splitting a closed path
     * var path = new Path.Rectangle({
     *     from: [20, 20],
     *     to: [80, 80],
     *     strokeColor: 'black'
     * });
     *
     * // Split the path half-way:
     * path.splitAt(path.length / 2);
     *
     * // Move the first segment, to show where the path
     * // was split:
     * path.firstSegment.point.x += 20;
     *
     * // Select the first segment:
     * path.firstSegment.selected = true;
     */
    splitAt: function(location) {
        // NOTE: getLocationAt() handles both offset and location:
        var loc = this.getLocationAt(location),
            index = loc && loc.index,
            time = loc && loc.time,
            tMin = /*#=*/Numerical.CURVETIME_EPSILON,
            tMax = 1 - tMin;
        if (time > tMax) {
            // time == 1 is the same location as time == 0 and index++
            index++;
            time = 0;
        }
        var curves = this.getCurves();
        if (index >= 0 && index < curves.length) {
            // Only divide curves if we're not on an existing segment already.
            if (time >= tMin) {
                // Divide the curve with the index at the given curve-time.
                // Increase because dividing adds more segments to the path.
                curves[index++].divideAtTime(time);
            }
            // Create the new path with the segments to the right of given
            // curve-time, which are removed from the current path. Pass true
            // for includeCurves, since we want to preserve and move them to
            // the new path through _add(), allowing us to have CurveLocation
            // keep the connection to the new path through moved curves.
            var segs = this.removeSegments(index, this._segments.length, true),
                path;
            if (this._closed) {
                // If the path is closed, open it and move the segments round,
                // otherwise create two paths.
                this.setClosed(false);
                // Just have path point to this. The moving around of segments
                // will happen below.
                path = this;
            } else {
                path = new Path(Item.NO_INSERT);
                path.insertAbove(this);
                path.copyAttributes(this);
            }
            path._add(segs, 0);
            // Add dividing segment again. In case of a closed path, that's the
            // beginning segment again at the end, since we opened it.
            this.addSegment(segs[0]);
            return path;
        }
        return null;
    },

    /**
     * @deprecated use use {@link #splitAt(offset)} instead.
     */
    split: function(index, time) {
        var curve,
            location = time === undefined ? index
                : (curve = this.getCurves()[index])
                    && curve.getLocationAtTime(time);
        return location != null ? this.splitAt(location) : null;
    },

    /**
     * Joins the path with the other specified path, which will be removed in
     * the process. They can be joined if the first or last segments of either
     * path lie in the same location. Locations are optionally compare with a
     * provide `tolerance` value.
     *
     * If `null` or `this` is passed as the other path, the path will be joined
     * with itself if the first and last segment are in the same location.
     *
     * @param {Path} path the path to join this path with; `null` or `this` to
     *     join the path with itself
     * @param {Number} [tolerance=0] the tolerance with which to decide if two
     *     segments are to be considered the same location when joining
     *
     * @example {@paperscript}
     * // Joining two paths:
     * var path = new Path({
     *     segments: [[30, 25], [30, 75]],
     *     strokeColor: 'black'
     * });
     *
     * var path2 = new Path({
     *     segments: [[200, 25], [200, 75]],
     *     strokeColor: 'black'
     * });
     *
     * // Join the paths:
     * path.join(path2);
     *
     * @example {@paperscript}
     * // Joining two paths that share a point at the start or end of their
     * // segments array:
     * var path = new Path({
     *     segments: [[30, 25], [30, 75]],
     *     strokeColor: 'black'
     * });
     *
     * var path2 = new Path({
     *     segments: [[30, 25], [80, 25]],
     *     strokeColor: 'black'
     * });
     *
     * // Join the paths:
     * path.join(path2);
     *
     * // After joining, path with have 3 segments, since it
     * // shared its first segment point with the first
     * // segment point of path2.
     *
     * // Select the path to show that they have joined:
     * path.selected = true;
     *
     * @example {@paperscript}
     * // Joining two paths that connect at two points:
     * var path = new Path({
     *     segments: [[30, 25], [80, 25], [80, 75]],
     *     strokeColor: 'black'
     * });
     *
     * var path2 = new Path({
     *     segments: [[30, 25], [30, 75], [80, 75]],
     *     strokeColor: 'black'
     * });
     *
     * // Join the paths:
     * path.join(path2);
     *
     * // Because the paths were joined at two points, the path is closed
     * // and has 4 segments.
     *
     * // Select the path to show that they have joined:
     * path.selected = true;
     */
    join: function(path, tolerance) {
        var epsilon = tolerance || 0;
        if (path && path !== this) {
            var segments = path._segments,
                last1 = this.getLastSegment(),
                last2 = path.getLastSegment();
            if (!last2) // an empty path?
                return this;
            if (last1 && last1._point.isClose(last2._point, epsilon))
                path.reverse();
            var first2 = path.getFirstSegment();
            if (last1 && last1._point.isClose(first2._point, epsilon)) {
                last1.setHandleOut(first2._handleOut);
                this._add(segments.slice(1));
            } else {
                var first1 = this.getFirstSegment();
                if (first1 && first1._point.isClose(first2._point, epsilon))
                    path.reverse();
                last2 = path.getLastSegment();
                if (first1 && first1._point.isClose(last2._point, epsilon)) {
                    first1.setHandleIn(last2._handleIn);
                    // Prepend all segments from path except the last one.
                    this._add(segments.slice(0, segments.length - 1), 0);
                } else {
                    this._add(segments.slice());
                }
            }
            if (path._closed)
                this._add([segments[0]]);
            path.remove();
        }
        // If the first and last segment touch, close the resulting path and
        // merge the end segments. Also do this if no path argument was provided
        // in which cases the path is joined with itself only if its ends touch.
        var first = this.getFirstSegment(),
            last = this.getLastSegment();
        if (first !== last && first._point.isClose(last._point, epsilon)) {
            first.setHandleIn(last._handleIn);
            last.remove();
            this.setClosed(true);
        }
        return this;
    },

    /**
     * Reduces the path by removing curves that have a length of 0,
     * and unnecessary segments between two collinear flat curves.
     *
     * @return {Path} the reduced path
     */
    reduce: function(options) {
        var curves = this.getCurves(),
            // TODO: Find a better name, to not confuse with PathItem#simplify()
            simplify = options && options.simplify,
            // When not simplifying, only remove curves if their lengths are
            // absolutely 0.
            tolerance = simplify ? /*#=*/Numerical.GEOMETRIC_EPSILON : 0;
        for (var i = curves.length - 1; i >= 0; i--) {
            var curve = curves[i];
            // When simplifying, compare curves with isCollinear() will remove
            // any collinear neighboring curves regardless of their orientation.
            // This serves as a reliable way to remove linear overlaps but only
            // as long as the lines are truly overlapping.
            if (!curve.hasHandles() && (!curve.hasLength(tolerance)
                    || simplify && curve.isCollinear(curve.getNext())))
                curve.remove();
        }
        return this;
    },

    // NOTE: Documentation is in PathItem#reverse()
    reverse: function() {
        this._segments.reverse();
        // Reverse the handles:
        for (var i = 0, l = this._segments.length; i < l; i++) {
            var segment = this._segments[i];
            var handleIn = segment._handleIn;
            segment._handleIn = segment._handleOut;
            segment._handleOut = handleIn;
            segment._index = i;
        }
        // Clear curves since it all has changed.
        this._curves = null;
        this._changed(/*#=*/Change.GEOMETRY);
    },

    // NOTE: Documentation is in PathItem#flatten()
    flatten: function(flatness) {
        // Use PathFlattener to subdivide the curves into parts that are flat
        // enough, as specified by `flatness` / Curve.isFlatEnough():
        var flattener = new PathFlattener(this, flatness || 0.25, 256, true),
            parts = flattener.parts,
            length = parts.length,
            segments = [];
        for (var i = 0; i < length; i++) {
            segments.push(new Segment(parts[i].curve.slice(0, 2)));
        }
        if (!this._closed && length > 0) {
            // Explicitly add the end point of the last curve on open paths.
            segments.push(new Segment(parts[length - 1].curve.slice(6)));
        }
        this.setSegments(segments);
    },

    // NOTE: Documentation is in PathItem#simplify()
    simplify: function(tolerance) {
        var segments = new PathFitter(this).fit(tolerance || 2.5);
        if (segments)
            this.setSegments(segments);
        return !!segments;
    },

    // NOTE: Documentation is in PathItem#smooth()
    smooth: function(options) {
        var that = this,
            opts = options || {},
            type = opts.type || 'asymmetric',
            segments = this._segments,
            length = segments.length,
            closed = this._closed;

        // Helper method to pick the right from / to indices.
        // Supports numbers and segment objects.
        // For numbers, the `to` index is exclusive, while for segments and
        // curves, it is inclusive, handled by the `offset` parameter.
        function getIndex(value, _default) {
            // Support both Segment and Curve through #index getter.
            var index = value && value.index;
            if (index != null) {
                // Make sure the segment / curve is not from a wrong path.
                var path = value.path;
                if (path && path !== that)
                    throw new Error(value._class + ' ' + index + ' of ' + path
                            + ' is not part of ' + that);
                // Add offset of 1 to curves to reach their end segment.
                if (_default && value instanceof Curve)
                    index++;
            } else {
                index = typeof value === 'number' ? value : _default;
            }
            // Handle negative values based on whether a path is open or not:
            // Ranges on closed paths are allowed to wrapped around the
            // beginning/end (e.g. start near the end, end near the beginning),
            // while ranges on open paths stay within the path's open range.
            return Math.min(index < 0 && closed
                    ? index % length
                    : index < 0 ? index + length : index, length - 1);
        }

        var loop = closed && opts.from === undefined && opts.to === undefined,
            from = getIndex(opts.from, 0),
            to = getIndex(opts.to, length - 1);

        if (from > to) {
            if (closed) {
                from -= length;
            } else {
                var tmp = from;
                from = to;
                to = tmp;
            }
        }
        if (/^(?:asymmetric|continuous)$/.test(type)) {
            // Continuous smoothing approach based on work by Lubos Brieda,
            // Particle In Cell Consulting LLC, but further simplified by
            // addressing handle symmetry across segments, and the possibility
            // to process x and y coordinates simultaneously. Also added
            // handling of closed paths.
            // https://www.particleincell.com/2012/bezier-splines/
            //
            // We use different parameters for the two supported smooth methods
            // that use this algorithm: continuous and asymmetric. asymmetric
            // was the only approach available in v0.9.25 & below.
            var asymmetric = type === 'asymmetric',
                min = Math.min,
                amount = to - from + 1,
                n = amount - 1,
                // Overlap by up to 4 points on closed paths since a current
                // segment is affected by its 4 neighbors on both sides (?).
                padding = loop ? min(amount, 4) : 1,
                paddingLeft = padding,
                paddingRight = padding,
                knots = [];
            if (!closed) {
                // If the path is open and a range is defined, try using a
                // padding of 1 on either side.
                paddingLeft = min(1, from);
                paddingRight = min(1, length - to - 1);
            }
            // Set up the knots array now, taking the paddings into account.
            n += paddingLeft + paddingRight;
            if (n <= 1)
                return;
            for (var i = 0, j = from - paddingLeft; i <= n; i++, j++) {
                knots[i] = segments[(j < 0 ? j + length : j) % length]._point;
            }

            // In the algorithm we treat these 3 cases:
            // - left most segment (L)
            // - internal segments (I)
            // - right most segment (R)
            //
            // In both the continuous and asymmetric method, c takes these
            // values and can hence be removed from the loop starting in n - 2:
            // c = 1 (L), 1 (I), 0 (R)
            //
            // continuous:
            // a = 0 (L), 1 (I), 2 (R)
            // b = 2 (L), 4 (I), 7 (R)
            // u = 1 (L), 4 (I), 8 (R)
            // v = 2 (L), 2 (I), 1 (R)
            //
            // asymmetric:
            // a = 0 (L), 1 (I), 1 (R)
            // b = 2 (L), 4 (I), 2 (R)
            // u = 1 (L), 4 (I), 3 (R)
            // v = 2 (L), 2 (I), 0 (R)

            // (L): u = 1, v = 2
            var x = knots[0]._x + 2 * knots[1]._x,
                y = knots[0]._y + 2 * knots[1]._y,
                f = 2,
                n_1 = n - 1,
                rx = [x],
                ry = [y],
                rf = [f],
                px = [],
                py = [];
            // Solve with the Thomas algorithm
            for (var i = 1; i < n; i++) {
                var internal = i < n_1,
                    //  internal--(I)  asymmetric--(R) (R)--continuous
                    a = internal ? 1 : asymmetric ? 1 : 2,
                    b = internal ? 4 : asymmetric ? 2 : 7,
                    u = internal ? 4 : asymmetric ? 3 : 8,
                    v = internal ? 2 : asymmetric ? 0 : 1,
                    m = a / f;
                f = rf[i] = b - m;
                x = rx[i] = u * knots[i]._x + v * knots[i + 1]._x - m * x;
                y = ry[i] = u * knots[i]._y + v * knots[i + 1]._y - m * y;
            }

            px[n_1] = rx[n_1] / rf[n_1];
            py[n_1] = ry[n_1] / rf[n_1];
            for (var i = n - 2; i >= 0; i--) {
                px[i] = (rx[i] - px[i + 1]) / rf[i];
                py[i] = (ry[i] - py[i + 1]) / rf[i];
            }
            px[n] = (3 * knots[n]._x - px[n_1]) / 2;
            py[n] = (3 * knots[n]._y - py[n_1]) / 2;

            // Now update the segments
            for (var i = paddingLeft, max = n - paddingRight, j = from;
                    i <= max; i++, j++) {
                var segment = segments[j < 0 ? j + length : j],
                    pt = segment._point,
                    hx = px[i] - pt._x,
                    hy = py[i] - pt._y;
                if (loop || i < max)
                    segment.setHandleOut(hx, hy);
                if (loop || i > paddingLeft)
                    segment.setHandleIn(-hx, -hy);
            }
        } else {
            // All other smoothing methods are handled directly on the segments:
            for (var i = from; i <= to; i++) {
                segments[i < 0 ? i + length : i].smooth(opts,
                        !loop && i === from, !loop && i === to);
            }
        }
    },

    // TODO: reduceSegments([flatness])

    /**
     * Attempts to create a new shape item with same geometry as this path item,
     * and inherits all settings from it, similar to {@link Item#clone()}.
     *
     * @param {Boolean} [insert=true] specifies whether the new shape should be
     * inserted into the scene graph. When set to `true`, it is inserted above
     * the path item
     * @return {Shape} the newly created shape item with the same geometry as
     * this path item if it can be matched, `null` otherwise
     * @see Shape#toPath(insert)
     */
    toShape: function(insert) {
        if (!this._closed)
            return null;

        var segments = this._segments,
            type,
            size,
            radius,
            topCenter;

        function isCollinear(i, j) {
            var seg1 = segments[i],
                seg2 = seg1.getNext(),
                seg3 = segments[j],
                seg4 = seg3.getNext();
            return seg1._handleOut.isZero() && seg2._handleIn.isZero()
                    && seg3._handleOut.isZero() && seg4._handleIn.isZero()
                    && seg2._point.subtract(seg1._point).isCollinear(
                        seg4._point.subtract(seg3._point));
        }

        function isOrthogonal(i) {
            var seg2 = segments[i],
                seg1 = seg2.getPrevious(),
                seg3 = seg2.getNext();
            return seg1._handleOut.isZero() && seg2._handleIn.isZero()
                    && seg2._handleOut.isZero() && seg3._handleIn.isZero()
                    && seg2._point.subtract(seg1._point).isOrthogonal(
                        seg3._point.subtract(seg2._point));
        }

        function isArc(i) {
            var seg1 = segments[i],
                seg2 = seg1.getNext(),
                handle1 = seg1._handleOut,
                handle2 = seg2._handleIn,
                kappa = /*#=*/Numerical.KAPPA;
            // Look at handle length and the distance to the imaginary corner
            // point and see if it their relation is kappa.
            if (handle1.isOrthogonal(handle2)) {
                var pt1 = seg1._point,
                    pt2 = seg2._point,
                    // Find the corner point by intersecting the lines described
                    // by both handles:
                    corner = new Line(pt1, handle1, true).intersect(
                            new Line(pt2, handle2, true), true);
                return corner && Numerical.isZero(handle1.getLength() /
                        corner.subtract(pt1).getLength() - kappa)
                    && Numerical.isZero(handle2.getLength() /
                        corner.subtract(pt2).getLength() - kappa);
            }
            return false;
        }

        function getDistance(i, j) {
            return segments[i]._point.getDistance(segments[j]._point);
        }

        // See if actually have any curves in the path. Differentiate
        // between straight objects (line, polyline, rect, and polygon) and
        // objects with curves(circle, ellipse, roundedRectangle).
        if (!this.hasHandles() && segments.length === 4
                && isCollinear(0, 2) && isCollinear(1, 3) && isOrthogonal(1)) {
            type = Shape.Rectangle;
            size = new Size(getDistance(0, 3), getDistance(0, 1));
            topCenter = segments[1]._point.add(segments[2]._point).divide(2);
        } else if (segments.length === 8 && isArc(0) && isArc(2) && isArc(4)
                && isArc(6) && isCollinear(1, 5) && isCollinear(3, 7)) {
            // It's a rounded rectangle.
            type = Shape.Rectangle;
            size = new Size(getDistance(1, 6), getDistance(0, 3));
            // Subtract side lengths from total width and divide by 2 to get the
            // corner radius size.
            radius = size.subtract(new Size(getDistance(0, 7),
                    getDistance(1, 2))).divide(2);
            topCenter = segments[3]._point.add(segments[4]._point).divide(2);
        } else if (segments.length === 4
                && isArc(0) && isArc(1) && isArc(2) && isArc(3)) {
            // If the distance between (point0 and point2) and (point1
            // and point3) are equal, then it is a circle
            if (Numerical.isZero(getDistance(0, 2) - getDistance(1, 3))) {
                type = Shape.Circle;
                radius = getDistance(0, 2) / 2;
            } else {
                type = Shape.Ellipse;
                radius = new Size(getDistance(2, 0) / 2, getDistance(3, 1) / 2);
            }
            topCenter = segments[1]._point;
        }

        if (type) {
            var center = this.getPosition(true),
                shape = new type({
                    center: center,
                    size: size,
                    radius: radius,
                    insert: false
                });
            // Pass `true` to exclude the matrix, so we can prepend after
            shape.copyAttributes(this, true);
            shape._matrix.prepend(this._matrix);
            // Determine and apply the shape's angle of rotation.
            shape.rotate(topCenter.subtract(center).getAngle() + 90);
            if (insert === undefined || insert)
                shape.insertAbove(this);
            return shape;
        }
        return null;
    },

    toPath: '#clone',

    // NOTE: Documentation is in PathItem#compare()
    compare: function compare(path) {
        // If a compound-path is involved, redirect to PathItem#compare()
        if (!path || path instanceof CompoundPath)
            return compare.base.call(this, path);
        var curves1 = this.getCurves(),
            curves2 = path.getCurves(),
            length1 = curves1.length,
            length2 = curves2.length;
        if (!length1 || !length2) {
            // If one path defines curves and the other doesn't, we can't have
            // matching geometries.
            return length1 == length2;
        }
        var v1 = curves1[0].getValues(),
            values2 = [],
            pos1 = 0, pos2,
            end1 = 0, end2;
        // First, loop through curves2, looking for the start of the overlapping
        // sequence with curves1[0]. Also cache curve values for later reuse.
        for (var i = 0; i < length2; i++) {
            var v2 = curves2[i].getValues();
            values2.push(v2);
            var overlaps = Curve.getOverlaps(v1, v2);
            if (overlaps) {
                // If the overlap doesn't start at the beginning of v2, then it
                // can only be a partial overlap with curves2[0], and the start
                // will be at curves2[length2 - 1]:
                pos2 = !i && overlaps[0][0] > 0 ? length2 - 1 : i;
                // Set end2 to the start of the first overlap on curves2, so
                // connection checks further down can work.
                end2 = overlaps[0][1];
                break;
            }
        }
        // Now loop through both curve arrays, find their overlaps, verify that
        // they keep joining, and see if we end back at the start on both paths.
        var abs = Math.abs,
            epsilon = /*#=*/Numerical.CURVETIME_EPSILON,
            v2 = values2[pos2],
            start2;
        while (v1 && v2) {
            var overlaps = Curve.getOverlaps(v1, v2);
            if (overlaps) {
                // Check that the overlaps are joining on curves1.
                var t1 = overlaps[0][0];
                if (abs(t1 - end1) < epsilon) {
                    end1 = overlaps[1][0];
                    if (end1 === 1) {
                        // Skip to the next curve if we're at the end of the
                        // current, and set v1 to null if at the end of curves1.
                        v1 = ++pos1 < length1 ? curves1[pos1].getValues() : null;
                        end1 = 0;
                    }
                    // Check that the overlaps are joining on curves2.
                    var t2 = overlaps[0][1];
                    if (abs(t2 - end2) < epsilon) {
                        if (!start2)
                            start2 = [pos2, t2];
                        end2 = overlaps[1][1];
                        if (end2 === 1) {
                            // Wrap pos2 around the end on values2:
                            if (++pos2 >= length2)
                                pos2 = 0;
                            // Reuse cached values from initial search.
                            v2 = values2[pos2] || curves2[pos2].getValues();
                            end2 = 0;
                        }
                        if (!v1) {
                            // We're done with curves1. If we're not back at the
                            // start on curve2, the two paths are not identical.
                            return start2[0] === pos2 && start2[1] === end2;
                        }
                        // All good, continue to avoid the break; further down.
                        continue;
                    }
                }
            }
            // No overlap match found, break out early.
            break;
        }
        return false;
    },

    _hitTestSelf: function(point, options, viewMatrix, strokeMatrix) {
        var that = this,
            style = this.getStyle(),
            segments = this._segments,
            numSegments = segments.length,
            closed = this._closed,
            // transformed tolerance padding, see Item#hitTest. We will add
            // stroke padding on top if stroke is defined.
            tolerancePadding = options._tolerancePadding,
            strokePadding = tolerancePadding,
            join, cap, miterLimit,
            area, loc, res,
            hitStroke = options.stroke && style.hasStroke(),
            hitFill = options.fill && style.hasFill(),
            hitCurves = options.curves,
            strokeRadius = hitStroke
                    ? style.getStrokeWidth() / 2
                    // Set radius to 0 when we're hit-testing fills with
                    // tolerance, to handle tolerance through stroke hit-test
                    // functionality. Also use 0 when hit-testing curves.
                    : hitFill && options.tolerance > 0 || hitCurves
                        ? 0 : null;
        if (strokeRadius !== null) {
            if (strokeRadius > 0) {
                join = style.getStrokeJoin();
                cap = style.getStrokeCap();
                miterLimit = style.getMiterLimit();
                // Add the stroke radius to tolerance padding, taking
                // #strokeScaling into account through _getStrokeMatrix().
                strokePadding = strokePadding.add(
                    Path._getStrokePadding(strokeRadius, strokeMatrix));
            } else {
                join = cap = 'round';
            }
            // Using tolerance padding for fill tests will also work if there is
            // no stroke, in which case radius = 0 and we will test for stroke
            // locations to extend the fill area by tolerance.
        }

        function isCloseEnough(pt, padding) {
            return point.subtract(pt).divide(padding).length <= 1;
        }

        function checkSegmentPoint(seg, pt, name) {
            if (!options.selected || pt.isSelected()) {
                var anchor = seg._point;
                if (pt !== anchor)
                    pt = pt.add(anchor);
                if (isCloseEnough(pt, strokePadding)) {
                    return new HitResult(name, that, {
                        segment: seg,
                        point: pt
                    });
                }
            }
        }

        function checkSegmentPoints(seg, ends) {
            // Note, when checking for ends, we don't also check for handles,
            // since this will happen afterwards in a separate loop, see below.
            return (ends || options.segments)
                && checkSegmentPoint(seg, seg._point, 'segment')
                || (!ends && options.handles) && (
                    checkSegmentPoint(seg, seg._handleIn, 'handle-in') ||
                    checkSegmentPoint(seg, seg._handleOut, 'handle-out'));
        }

        // Code to check stroke join / cap areas

        function addToArea(point) {
            area.add(point);
        }

        function checkSegmentStroke(segment) {
            // Handle joins / caps that are not round specifically, by
            // hit-testing their polygon areas.
            var isJoin = closed || segment._index > 0
                    && segment._index < numSegments - 1;
            if ((isJoin ? join : cap) === 'round') {
                // Round join / cap is easy to handle.
                return isCloseEnough(segment._point, strokePadding);
            } else {
                // Create an 'internal' path without id and outside the scene
                // graph to run the hit-test on it.
                area = new Path({ internal: true, closed: true });
                if (isJoin) {
                    // Only add bevels to segments that aren't smooth.
                    if (!segment.isSmooth()) {
                        // _addBevelJoin() handles both 'bevel' and 'miter'.
                        Path._addBevelJoin(segment, join, strokeRadius,
                               miterLimit, null, strokeMatrix, addToArea, true);
                    }
                } else if (cap === 'square') {
                    Path._addSquareCap(segment, cap, strokeRadius, null,
                            strokeMatrix, addToArea, true);
                }
                // See if the above produced an area to check for
                if (!area.isEmpty()) {
                    // Also use stroke check with tolerancePadding if the point
                    // is not inside the area itself, to use test caps and joins
                    // with same tolerance.
                    var loc;
                    return area.contains(point)
                        || (loc = area.getNearestLocation(point))
                            && isCloseEnough(loc.getPoint(), tolerancePadding);
                }
            }
        }

        // If we're asked to query for segments, ends or handles, do all that
        // before stroke or fill.
        if (options.ends && !options.segments && !closed) {
            if (res = checkSegmentPoints(segments[0], true)
                    || checkSegmentPoints(segments[numSegments - 1], true))
                return res;
        } else if (options.segments || options.handles) {
            for (var i = 0; i < numSegments; i++)
                if (res = checkSegmentPoints(segments[i]))
                    return res;
        }
        // If we're querying for stroke, perform that before fill
        if (strokeRadius !== null) {
            loc = this.getNearestLocation(point);
            // Note that paths need at least two segments to have an actual
            // stroke. But we still check for segments with the radius fallback
            // check if there is only one segment.
            if (loc) {
                // Now see if we're on a segment, and if so, check for its
                // stroke join / cap first. If not, do a normal radius check
                // for round strokes.
                var time = loc.getTime();
                if (time === 0 || time === 1 && numSegments > 1) {
                    if (!checkSegmentStroke(loc.getSegment()))
                        loc = null;
                } else if (!isCloseEnough(loc.getPoint(), strokePadding)) {
                    loc = null;
                }
            }
            // If we have miter joins, we may not be done yet, since they can be
            // longer than the radius. Check for each segment within reach now.
            if (!loc && join === 'miter' && numSegments > 1) {
                for (var i = 0; i < numSegments; i++) {
                    var segment = segments[i];
                    if (point.getDistance(segment._point)
                            <= miterLimit * strokeRadius
                            && checkSegmentStroke(segment)) {
                        loc = segment.getLocation();
                        break;
                    }
                }
            }
        }
        // Don't process loc yet, as we also need to query for stroke after fill
        // in some cases. Simply skip fill query if we already have a matching
        // stroke. If we have a loc and no stroke then it's a result for fill.
        return !loc && hitFill && this._contains(point)
                || loc && !hitStroke && !hitCurves
                    ? new HitResult('fill', this)
                    : loc
                        ? new HitResult(hitStroke ? 'stroke' : 'curve', this, {
                            location: loc,
                            // It's fine performance wise to call getPoint()
                            // again since it was already called before.
                            point: loc.getPoint()
                        })
                        : null;
    }

    // TODO: intersects(item)
    // TODO: contains(item)
}, Base.each(Curve._evaluateMethods,
    function(name) {
        // NOTE: (For easier searching): This loop produces:
        // getPointAt, getTangentAt, getNormalAt, getWeightedTangentAt,
        // getWeightedNormalAt, getCurvatureAt
        this[name + 'At'] = function(offset) {
            var loc = this.getLocationAt(offset);
            return loc && loc[name]();
        };
    },
/** @lends Path# */{
    // Explicitly deactivate the creation of beans, as we have functions here
    // that look like bean getters but actually read arguments.
    // See #getLocationOf(), #getOffsetOf(), #getLocationAt()
    beans: false,

    /**
     * {@grouptitle Positions on Paths and Curves}
     *
     * Returns the curve location of the specified point if it lies on the
     * path, `null` otherwise.
     *
     * @param {Point} point the point on the path
     * @return {CurveLocation} the curve location of the specified point
     */
    getLocationOf: function(/* point */) {
        var point = Point.read(arguments),
            curves = this.getCurves();
        for (var i = 0, l = curves.length; i < l; i++) {
            var loc = curves[i].getLocationOf(point);
            if (loc)
                return loc;
        }
        return null;
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
     * Returns the curve location of the specified offset on the path.
     *
     * @param {Number} offset the offset on the path, where `0` is at
     * the beginning of the path and {@link Path#length} at the end
     * @return {CurveLocation} the curve location at the specified offset
     */
    getLocationAt: function(offset) {
        if (typeof offset === 'number') {
            var curves = this.getCurves(),
                length = 0;
            for (var i = 0, l = curves.length; i < l; i++) {
                var start = length,
                    curve = curves[i];
                length += curve.getLength();
                if (length > offset) {
                    // Found the segment within which the length lies
                    return curve.getLocationAt(offset - start);
                }
            }
            // It may be that through imprecision of getLength, that the end of
            // the last curve was missed:
            if (curves.length > 0 && offset <= this.getLength()) {
                return new CurveLocation(curves[curves.length - 1], 1);
            }
        } else if (offset && offset.getPath && offset.getPath() === this) {
            // offset is already a CurveLocation on this path, just return it.
            return offset;
        }
        return null;
    },

    /**
     * Calculates the point on the path at the given offset.
     *
     * @name Path#getPointAt
     * @function
     * @param {Number} offset the offset on the path, where `0` is at
     * the beginning of the path and {@link Path#length} at the end
     * @return {Point} the point at the given offset
     *
     * @example {@paperscript height=150}
     * // Finding the point on a path at a given offset:
     *
     * // Create an arc shaped path:
     * var path = new Path({
     *     strokeColor: 'black'
     * });
     *
     * path.add(new Point(40, 100));
     * path.arcTo(new Point(150, 100));
     *
     * // We're going to be working with a third of the length
     * // of the path as the offset:
     * var offset = path.length / 3;
     *
     * // Find the point on the path:
     * var point = path.getPointAt(offset);
     *
     * // Create a small circle shaped path at the point:
     * var circle = new Path.Circle({
     *     center: point,
     *     radius: 3,
     *     fillColor: 'red'
     * });
     *
     * @example {@paperscript height=150}
     * // Iterating over the length of a path:
     *
     * // Create an arc shaped path:
     * var path = new Path({
     *     strokeColor: 'black'
     * });
     *
     * path.add(new Point(40, 100));
     * path.arcTo(new Point(150, 100));
     *
     * var amount = 5;
     * var length = path.length;
     * for (var i = 0; i < amount + 1; i++) {
     *     var offset = i / amount * length;
     *
     *     // Find the point on the path at the given offset:
     *     var point = path.getPointAt(offset);
     *
     *     // Create a small circle shaped path at the point:
     *     var circle = new Path.Circle({
     *         center: point,
     *         radius: 3,
     *         fillColor: 'red'
     *     });
     * }
     */

    /**
     * Calculates the normalized tangent vector of the path at the given offset.
     *
     * @name Path#getTangentAt
     * @function
     * @param {Number} offset the offset on the path, where `0` is at
     * the beginning of the path and {@link Path#length} at the end
     * @return {Point} the normalized tangent vector at the given offset
     *
     * @example {@paperscript height=150}
     * // Working with the tangent vector at a given offset:
     *
     * // Create an arc shaped path:
     * var path = new Path({
     *     strokeColor: 'black'
     * });
     *
     * path.add(new Point(40, 100));
     * path.arcTo(new Point(150, 100));
     *
     * // We're going to be working with a third of the length
     * // of the path as the offset:
     * var offset = path.length / 3;
     *
     * // Find the point on the path:
     * var point = path.getPointAt(offset);
     *
     * // Find the tangent vector at the given offset
     * // and give it a length of 60:
     * var tangent = path.getTangentAt(offset) * 60;
     *
     * var line = new Path({
     *     segments: [point, point + tangent],
     *     strokeColor: 'red'
     * })
     *
     * @example {@paperscript height=200}
     * // Iterating over the length of a path:
     *
     * // Create an arc shaped path:
     * var path = new Path({
     *     strokeColor: 'black'
     * });
     *
     * path.add(new Point(40, 100));
     * path.arcTo(new Point(150, 100));
     *
     * var amount = 6;
     * var length = path.length;
     * for (var i = 0; i < amount + 1; i++) {
     *     var offset = i / amount * length;
     *
     *     // Find the point on the path at the given offset:
     *     var point = path.getPointAt(offset);
     *
     *     // Find the tangent vector on the path at the given offset
     *     // and give it a length of 60:
     *     var tangent = path.getTangentAt(offset) * 60;
     *
     *     var line = new Path({
     *         segments: [point, point + tangent],
     *         strokeColor: 'red'
     *     })
     * }
     */

    /**
     * Calculates the normal vector of the path at the given offset.
     *
     * @name Path#getNormalAt
     * @function
     * @param {Number} offset the offset on the path, where `0` is at
     * the beginning of the path and {@link Path#length} at the end
     * @return {Point} the normal vector at the given offset
     *
     * @example {@paperscript height=150}
     * // Working with the normal vector at a given offset:
     *
     * // Create an arc shaped path:
     * var path = new Path({
     *     strokeColor: 'black'
     * });
     *
     * path.add(new Point(40, 100));
     * path.arcTo(new Point(150, 100));
     *
     * // We're going to be working with a third of the length
     * // of the path as the offset:
     * var offset = path.length / 3;
     *
     * // Find the point on the path:
     * var point = path.getPointAt(offset);
     *
     * // Find the normal vector on the path at the given offset
     * // and give it a length of 30:
     * var normal = path.getNormalAt(offset) * 30;
     *
     * var line = new Path({
     *     segments: [point, point + normal],
     *     strokeColor: 'red'
     * });
     *
     * @example {@paperscript height=200}
     * // Iterating over the length of a path:
     *
     * // Create an arc shaped path:
     * var path = new Path({
     *     strokeColor: 'black'
     * });
     *
     * path.add(new Point(40, 100));
     * path.arcTo(new Point(150, 100));
     *
     * var amount = 10;
     * var length = path.length;
     * for (var i = 0; i < amount + 1; i++) {
     *     var offset = i / amount * length;
     *
     *     // Find the point on the path at the given offset:
     *     var point = path.getPointAt(offset);
     *
     *     // Find the normal vector on the path at the given offset
     *     // and give it a length of 30:
     *     var normal = path.getNormalAt(offset) * 30;
     *
     *     var line = new Path({
     *         segments: [point, point + normal],
     *         strokeColor: 'red'
     *     });
     * }
     */

    /**
     * Calculates the weighted tangent vector of the path at the given offset.
     *
     * @name Path#getWeightedTangentAt
     * @function
     * @param {Number} offset the offset on the path, where `0` is at
     * the beginning of the path and {@link Path#length} at the end
     * @return {Point} the weighted tangent vector at the given offset
     */

    /**
     * Calculates the weighted normal vector of the path at the given offset.
     *
     * @name Path#getWeightedNormalAt
     * @function
     * @param {Number} offset the offset on the path, where `0` is at
     * the beginning of the path and {@link Path#length} at the end
     * @return {Point} the weighted normal vector at the given offset
     */

    /**
     * Calculates the curvature of the path at the given offset. Curvatures
     * indicate how sharply a path changes direction. A straight line has zero
     * curvature, where as a circle has a constant curvature. The path's radius
     * at the given offset is the reciprocal value of its curvature.
     *
     * @name Path#getCurvatureAt
     * @function
     * @param {Number} offset the offset on the path, where `0` is at
     * the beginning of the path and {@link Path#length} at the end
     * @return {Number} the normal vector at the given offset
     */

    /**
     * Calculates path offsets where the path is tangential to the provided
     * tangent. Note that tangents at the start or end are included. Tangents at
     * segment points are returned even if only one of their handles is
     * collinear with the provided tangent.
     *
     * @param {Point} tangent the tangent to which the path must be tangential
     * @return {Number[]} path offsets where the path is tangential to the
     * provided tangent
     */
    getOffsetsWithTangent: function(/* tangent */) {
        var tangent = Point.read(arguments);
        if (tangent.isZero()) {
            return [];
        }

        var offsets = [];
        var curveStart = 0;
        var curves = this.getCurves();
        for (var i = 0, l = curves.length; i < l; i++) {
            var curve = curves[i];
            // Calculate curves times at vector tangent...
            var curveTimes = curve.getTimesWithTangent(tangent);
            for (var j = 0, m = curveTimes.length; j < m; j++) {
                // ...and convert them to path offsets...
                var offset = curveStart + curve.getOffsetAtTime(curveTimes[j]);
                // ...avoiding duplicates.
                if (offsets.indexOf(offset) < 0) {
                    offsets.push(offset);
                }
            }
            curveStart += curve.length;
        }
        return offsets;
    }
}),
new function() { // Scope for drawing

    // Note that in the code below we're often accessing _x and _y on point
    // objects that were read from segments. This is because the SegmentPoint
    // class overrides the plain x / y properties with getter / setters and
    // stores the values in these private properties internally. To avoid
    // calling of getter functions all the time we directly access these private
    // properties here. The distinction between normal Point objects and
    // SegmentPoint objects maybe seem a bit tedious but is worth the benefit in
    // performance.

    function drawHandles(ctx, segments, matrix, size) {
        // Only draw if size is not null or negative.
        if (size <= 0) return;

        var half = size / 2,
            miniSize = size - 2,
            miniHalf = half - 1,
            coords = new Array(6),
            pX, pY;

        function drawHandle(index) {
            var hX = coords[index],
                hY = coords[index + 1];
            if (pX != hX || pY != hY) {
                ctx.beginPath();
                ctx.moveTo(pX, pY);
                ctx.lineTo(hX, hY);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(hX, hY, half, 0, Math.PI * 2, true);
                ctx.fill();
            }
        }

        for (var i = 0, l = segments.length; i < l; i++) {
            var segment = segments[i],
                selection = segment._selection;
            segment._transformCoordinates(matrix, coords);
            pX = coords[0];
            pY = coords[1];
            if (selection & /*#=*/SegmentSelection.HANDLE_IN)
                drawHandle(2);
            if (selection & /*#=*/SegmentSelection.HANDLE_OUT)
                drawHandle(4);
            // Draw a rectangle at segment.point:
            ctx.fillRect(pX - half, pY - half, size, size);
            // If the point is not selected, draw a white square that is 1px
            // smaller on all sides, but only draw it if size is big enough.
            if (miniSize > 0 && !(selection & /*#=*/SegmentSelection.POINT)) {
                var fillStyle = ctx.fillStyle;
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(pX - miniHalf, pY - miniHalf, miniSize, miniSize);
                ctx.fillStyle = fillStyle;
            }
        }
    }

    function drawSegments(ctx, path, matrix) {
        var segments = path._segments,
            length = segments.length,
            coords = new Array(6),
            first = true,
            curX, curY,
            prevX, prevY,
            inX, inY,
            outX, outY;

        function drawSegment(segment) {
            // Optimise code when no matrix is provided by accessing segment
            // points hand handles directly, since this is the default when
            // drawing paths. Matrix is only used for drawing selections and
            // when #strokeScaling is false.
            if (matrix) {
                segment._transformCoordinates(matrix, coords);
                curX = coords[0];
                curY = coords[1];
            } else {
                var point = segment._point;
                curX = point._x;
                curY = point._y;
            }
            if (first) {
                ctx.moveTo(curX, curY);
                first = false;
            } else {
                if (matrix) {
                    inX = coords[2];
                    inY = coords[3];
                } else {
                    var handle = segment._handleIn;
                    inX = curX + handle._x;
                    inY = curY + handle._y;
                }
                if (inX === curX && inY === curY
                        && outX === prevX && outY === prevY) {
                    ctx.lineTo(curX, curY);
                } else {
                    ctx.bezierCurveTo(outX, outY, inX, inY, curX, curY);
                }
            }
            prevX = curX;
            prevY = curY;
            if (matrix) {
                outX = coords[4];
                outY = coords[5];
            } else {
                var handle = segment._handleOut;
                outX = prevX + handle._x;
                outY = prevY + handle._y;
            }
        }

        for (var i = 0; i < length; i++)
            drawSegment(segments[i]);
        // Close path by drawing first segment again
        if (path._closed && length > 0)
            drawSegment(segments[0]);
    }

    return {
        _draw: function(ctx, param, viewMatrix, strokeMatrix) {
            var dontStart = param.dontStart,
                dontPaint = param.dontFinish || param.clip,
                style = this.getStyle(),
                hasFill = style.hasFill(),
                hasStroke = style.hasStroke(),
                dashArray = style.getDashArray(),
                // dashLength is only set if we can't draw dashes natively
                dashLength = !paper.support.nativeDash && hasStroke
                        && dashArray && dashArray.length;

            if (!dontStart)
                ctx.beginPath();

            if (hasFill || hasStroke && !dashLength || dontPaint) {
                // Prepare the canvas path if we have any situation that
                // requires it to be defined.
                drawSegments(ctx, this, strokeMatrix);
                if (this._closed)
                    ctx.closePath();
            }

            function getOffset(i) {
                // Negative modulo is necessary since we're stepping back
                // in the dash sequence first.
                return dashArray[((i % dashLength) + dashLength) % dashLength];
            }

            if (!dontPaint && (hasFill || hasStroke)) {
                // If the path is part of a compound path or doesn't have a fill
                // or stroke, there is no need to continue.
                this._setStyles(ctx, param, viewMatrix);
                if (hasFill) {
                    ctx.fill(style.getFillRule());
                    // If shadowColor is defined, clear it after fill, so it
                    // won't be applied to both fill and stroke. If the path is
                    // only stroked, we don't have to clear it.
                    ctx.shadowColor = 'rgba(0,0,0,0)';
                }
                if (hasStroke) {
                    if (dashLength) {
                        // We cannot use the path created by drawSegments above
                        // Use PathFlattener to draw dashed paths:
                        if (!dontStart)
                            ctx.beginPath();
                        var flattener = new PathFlattener(this, 0.25, 32, false,
                                strokeMatrix),
                            length = flattener.length,
                            from = -style.getDashOffset(), to,
                            i = 0;
                        // Step backwards in the dash sequence (dash -- no-dash)
                        // first until the from parameter is below 0.
                        while (from > 0) {
                            from -= getOffset(i--) + getOffset(i--);
                        }
                        while (from < length) {
                            to = from + getOffset(i++);
                            if (from > 0 || to > 0)
                                flattener.drawPart(ctx,
                                        Math.max(from, 0), Math.max(to, 0));
                            from = to + getOffset(i++);
                        }
                    }
                    ctx.stroke();
                }
            }
        },

        _drawSelected: function(ctx, matrix) {
            ctx.beginPath();
            drawSegments(ctx, this, matrix);
            // Now stroke it and draw its handles:
            ctx.stroke();
            drawHandles(ctx, this._segments, matrix, paper.settings.handleSize);
        }
    };
},
new function() { // PostScript-style drawing commands
    /**
     * Helper method that returns the current segment and checks if a moveTo()
     * command is required first.
     */
    function getCurrentSegment(that) {
        var segments = that._segments;
        if (!segments.length)
            throw new Error('Use a moveTo() command first');
        return segments[segments.length - 1];
    }

    return {
        // NOTE: Documentation for these methods is found in PathItem, as they
        // are considered abstract methods of PathItem and need to be defined in
        // all implementing classes.
        moveTo: function(/* point */) {
            // moveTo should only be called at the beginning of paths. But it
            // can ce called again if there is nothing drawn yet, in which case
            // the first segment gets readjusted.
            var segments = this._segments;
            if (segments.length === 1)
                this.removeSegment(0);
            // Let's not be picky about calling moveTo() when not at the
            // beginning of a path, just bail out:
            if (!segments.length)
                this._add([ new Segment(Point.read(arguments)) ]);
        },

        moveBy: function(/* point */) {
            throw new Error('moveBy() is unsupported on Path items.');
        },

        lineTo: function(/* point */) {
            // Let's not be picky about calling moveTo() first:
            this._add([ new Segment(Point.read(arguments)) ]);
        },

        cubicCurveTo: function(/* handle1, handle2, to */) {
            var args = arguments,
                handle1 = Point.read(args),
                handle2 = Point.read(args),
                to = Point.read(args),
                // First modify the current segment:
                current = getCurrentSegment(this);
            // Convert to relative values:
            current.setHandleOut(handle1.subtract(current._point));
            // And add the new segment, with handleIn set to c2
            this._add([ new Segment(to, handle2.subtract(to)) ]);
        },

        quadraticCurveTo: function(/* handle, to */) {
            var args = arguments,
                handle = Point.read(args),
                to = Point.read(args),
                current = getCurrentSegment(this)._point;
            // This is exact:
            // If we have the three quad points: A E D,
            // and the cubic is A B C D,
            // B = E + 1/3 (A - E)
            // C = E + 1/3 (D - E)
            this.cubicCurveTo(
                handle.add(current.subtract(handle).multiply(1 / 3)),
                handle.add(to.subtract(handle).multiply(1 / 3)),
                to
            );
        },

        curveTo: function(/* through, to, time */) {
            var args = arguments,
                through = Point.read(args),
                to = Point.read(args),
                t = Base.pick(Base.read(args), 0.5),
                t1 = 1 - t,
                current = getCurrentSegment(this)._point,
                // handle = (through - (1 - t)^2 * current - t^2 * to) /
                // (2 * (1 - t) * t)
                handle = through.subtract(current.multiply(t1 * t1))
                    .subtract(to.multiply(t * t)).divide(2 * t * t1);
            if (handle.isNaN())
                throw new Error(
                    'Cannot put a curve through points with parameter = ' + t);
            this.quadraticCurveTo(handle, to);
        },

        arcTo: function(/* to, clockwise | through, to
                | to, radius, rotation, clockwise, large */) {
            // Get the start point:
            var args = arguments,
                abs = Math.abs,
                sqrt = Math.sqrt,
                current = getCurrentSegment(this),
                from = current._point,
                to = Point.read(args),
                through,
                // Peek at next value to see if it's clockwise, with true as the
                // default value.
                peek = Base.peek(args),
                clockwise = Base.pick(peek, true),
                center, extent, vector, matrix;
            // We're handling three different approaches to drawing arcs in one
            // large function:
            if (typeof clockwise === 'boolean') {
                // #1: arcTo(to, clockwise)
                var middle = from.add(to).divide(2),
                through = middle.add(middle.subtract(from).rotate(
                        clockwise ? -90 : 90));
            } else if (Base.remain(args) <= 2) {
                // #2: arcTo(through, to)
                through = to;
                to = Point.read(args);
            } else if (!from.equals(to)) {
                // #3: arcTo(to, radius, rotation, clockwise, large)
                // Draw arc in SVG style, but only if `from` and `to` are not
                // equal (#1613).
                var radius = Size.read(args),
                    isZero = Numerical.isZero;
                // If rx = 0 or ry = 0 then this arc is treated as a
                // straight line joining the endpoints.
                // NOTE: radius.isZero() would require both values to be 0.
                if (isZero(radius.width) || isZero(radius.height))
                    return this.lineTo(to);
                // See for an explanation of the following calculations:
                // https://www.w3.org/TR/SVG/implnote.html#ArcImplementationNotes
                var rotation = Base.read(args),
                    clockwise = !!Base.read(args),
                    large = !!Base.read(args),
                    middle = from.add(to).divide(2),
                    pt = from.subtract(middle).rotate(-rotation),
                    x = pt.x,
                    y = pt.y,
                    rx = abs(radius.width),
                    ry = abs(radius.height),
                    rxSq = rx * rx,
                    rySq = ry * ry,
                    xSq = x * x,
                    ySq = y * y;
                // "...ensure radii are large enough"
                var factor = sqrt(xSq / rxSq + ySq / rySq);
                if (factor > 1) {
                    rx *= factor;
                    ry *= factor;
                    rxSq = rx * rx;
                    rySq = ry * ry;
                }
                factor = (rxSq * rySq - rxSq * ySq - rySq * xSq) /
                        (rxSq * ySq + rySq * xSq);
                if (abs(factor) < /*#=*/Numerical.EPSILON)
                    factor = 0;
                if (factor < 0)
                    throw new Error(
                            'Cannot create an arc with the given arguments');
                center = new Point(rx * y / ry, -ry * x / rx)
                        // "...where the + sign is chosen if fA != fS,
                        // and the - sign is chosen if fA = fS."
                        .multiply((large === clockwise ? -1 : 1) * sqrt(factor))
                        .rotate(rotation).add(middle);
                // Now create a matrix that maps the unit circle to the ellipse,
                // for easier construction below.
                matrix = new Matrix().translate(center).rotate(rotation)
                        .scale(rx, ry);
                // Transform from and to to the unit circle coordinate space
                // and calculate start vector and extend from there.
                vector = matrix._inverseTransform(from);
                extent = vector.getDirectedAngle(matrix._inverseTransform(to));
                // "...if fS = 0 and extent is > 0, then subtract 360, whereas
                // if fS = 1 and extend is < 0, then add 360."
                if (!clockwise && extent > 0)
                    extent -= 360;
                else if (clockwise && extent < 0)
                    extent += 360;
            }
            if (through) {
                // Calculate center, vector and extend for non SVG versions:
                // Construct the two perpendicular middle lines to
                // (from, through) and (through, to), and intersect them to get
                // the center.
                var l1 = new Line(from.add(through).divide(2),
                            through.subtract(from).rotate(90), true),
                    l2 = new Line(through.add(to).divide(2),
                            to.subtract(through).rotate(90), true),
                    line = new Line(from, to),
                    throughSide = line.getSide(through);
                center = l1.intersect(l2, true);
                // If the two lines are collinear, there cannot be an arc as the
                // circle is infinitely big and has no center point. If side is
                // 0, the connecting arc line of this huge circle is a line
                // between the two points, so we can use #lineTo instead.
                // Otherwise we bail out:
                if (!center) {
                    if (!throughSide)
                        return this.lineTo(to);
                    throw new Error(
                            'Cannot create an arc with the given arguments');
                }
                vector = from.subtract(center);
                extent = vector.getDirectedAngle(to.subtract(center));
                var centerSide = line.getSide(center, true);
                if (centerSide === 0) {
                    // If the center is lying on the line, we might have gotten
                    // the wrong sign for extent above. Use the sign of the side
                    // of the through point.
                    extent = throughSide * abs(extent);
                } else if (throughSide === centerSide) {
                    // If the center is on the same side of the line (from, to)
                    // as the through point, we're extending bellow 180 degrees
                    // and need to adapt extent.
                    extent += extent < 0 ? 360 : -360;
                }
            }
            if (extent) {
                var epsilon = /*#=*/Numerical.ANGULAR_EPSILON,
                    ext = abs(extent),
                    // Calculate amount of segments required to approximate over
                    // `extend` degrees (extend / 90), but prevent ceil() from
                    // rounding up small imprecisions by subtracting epsilon.
                    count = ext >= 360
                        ? 4
                        : Math.ceil((ext - epsilon) / 90),
                    inc = extent / count,
                    half = inc * Math.PI / 360,
                    z = 4 / 3 * Math.sin(half) / (1 + Math.cos(half)),
                    segments = [];
                for (var i = 0; i <= count; i++) {
                    // Explicitly use to point for last segment, since depending
                    // on values the calculation adds imprecision:
                    var pt = to,
                        out = null;
                    if (i < count) {
                        out = vector.rotate(90).multiply(z);
                        if (matrix) {
                            pt = matrix._transformPoint(vector);
                            out = matrix._transformPoint(vector.add(out))
                                    .subtract(pt);
                        } else {
                            pt = center.add(vector);
                        }
                    }
                    if (!i) {
                        // Modify startSegment
                        current.setHandleOut(out);
                    } else {
                        // Add new Segment
                        var _in = vector.rotate(-90).multiply(z);
                        if (matrix) {
                            _in = matrix._transformPoint(vector.add(_in))
                                    .subtract(pt);
                        }
                        segments.push(new Segment(pt, _in, out));
                    }
                    vector = vector.rotate(inc);
                }
                // Add all segments at once at the end for higher performance
                this._add(segments);
            }
        },

        lineBy: function(/* to */) {
            var to = Point.read(arguments),
                current = getCurrentSegment(this)._point;
            this.lineTo(current.add(to));
        },

        curveBy: function(/* through, to, parameter */) {
            var args = arguments,
                through = Point.read(args),
                to = Point.read(args),
                parameter = Base.read(args),
                current = getCurrentSegment(this)._point;
            this.curveTo(current.add(through), current.add(to), parameter);
        },

        cubicCurveBy: function(/* handle1, handle2, to */) {
            var args = arguments,
                handle1 = Point.read(args),
                handle2 = Point.read(args),
                to = Point.read(args),
                current = getCurrentSegment(this)._point;
            this.cubicCurveTo(current.add(handle1), current.add(handle2),
                    current.add(to));
        },

        quadraticCurveBy: function(/* handle, to */) {
            var args = arguments,
                handle = Point.read(args),
                to = Point.read(args),
                current = getCurrentSegment(this)._point;
            this.quadraticCurveTo(current.add(handle), current.add(to));
        },

        // TODO: Implement version for: (to, radius, rotation, clockwise, large)
        arcBy: function(/* to, clockwise | through, to */) {
            var args = arguments,
                current = getCurrentSegment(this)._point,
                point = current.add(Point.read(args)),
                // Peek at next value to see if it's clockwise, with true as
                // default value.
                clockwise = Base.pick(Base.peek(args), true);
            if (typeof clockwise === 'boolean') {
                this.arcTo(point, clockwise);
            } else {
                this.arcTo(point, current.add(Point.read(args)));
            }
        },

        closePath: function(tolerance) {
            this.setClosed(true);
            this.join(this, tolerance);
        }
    };
}, { // A dedicated scope for the tricky bounds calculations
    // We define all the different getBounds functions as static methods on Path
    // and have #_getBounds directly access these. All static bounds functions
    // below have the same first four parameters: segments, closed, path,
    // matrix, so they can be called from #_getBounds() and also be used in
    // Curve. But not all of them use all these parameters, and some define
    // additional ones after.

    _getBounds: function(matrix, options) {
        var method = options.handle
                ? 'getHandleBounds'
                : options.stroke
                ? 'getStrokeBounds'
                : 'getBounds';
        return Path[method](this._segments, this._closed, this, matrix, options);
    },

// Mess with indentation in order to get more line-space below:
statics: {
    /**
     * Returns the bounding rectangle of the item excluding stroke width.
     *
     * @private
     */
    getBounds: function(segments, closed, path, matrix, options, strokePadding) {
        var first = segments[0];
        // If there are no segments, return "empty" rectangle, just like groups,
        // since #bounds is assumed to never return null.
        if (!first)
            return new Rectangle();
        var coords = new Array(6),
            // Make coordinates for first segment available in prevCoords.
            prevCoords = first._transformCoordinates(matrix, new Array(6)),
            min = prevCoords.slice(0, 2), // Start with values of first point
            max = min.slice(), // clone
            roots = new Array(2);

        function processSegment(segment) {
            segment._transformCoordinates(matrix, coords);
            for (var i = 0; i < 2; i++) {
                Curve._addBounds(
                    prevCoords[i], // prev.point
                    prevCoords[i + 4], // prev.handleOut
                    coords[i + 2], // segment.handleIn
                    coords[i], // segment.point,
                    i, strokePadding ? strokePadding[i] : 0, min, max, roots);
            }
            // Swap coordinate buffers.
            var tmp = prevCoords;
            prevCoords = coords;
            coords = tmp;
        }

        for (var i = 1, l = segments.length; i < l; i++)
            processSegment(segments[i]);
        if (closed)
            processSegment(first);
        return new Rectangle(min[0], min[1], max[0] - min[0], max[1] - min[1]);
    },

    /**
     * Returns the bounding rectangle of the item including stroke width.
     *
     * @private
     */
    getStrokeBounds: function(segments, closed, path, matrix, options) {
        var style = path.getStyle(),
            stroke = style.hasStroke(),
            strokeWidth = style.getStrokeWidth(),
            strokeMatrix = stroke && path._getStrokeMatrix(matrix, options),
            strokePadding = stroke && Path._getStrokePadding(strokeWidth,
                strokeMatrix),
            // Start with normal path bounds with added stroke padding. Then we
            // only need to look at each segment and handle join / cap / miter.
            bounds = Path.getBounds(segments, closed, path, matrix, options,
                strokePadding);
        if (!stroke)
            return bounds;
        var strokeRadius = strokeWidth / 2,
            join = style.getStrokeJoin(),
            cap = style.getStrokeCap(),
            miterLimit = style.getMiterLimit(),
            // Create a rectangle of padding size, used for union with bounds
            // further down
            joinBounds = new Rectangle(new Size(strokePadding));

        // helper function that is passed to _addBevelJoin() and _addSquareCap()
        // to handle the point transformations.
        function addPoint(point) {
            bounds = bounds.include(point);
        }

        function addRound(segment) {
            bounds = bounds.unite(
                    joinBounds.setCenter(segment._point.transform(matrix)));
        }

        function addJoin(segment, join) {
            // When both handles are set in a segment and they are collinear,
            // the join setting is ignored and round is always used.
            if (join === 'round' || segment.isSmooth()) {
                addRound(segment);
            } else {
                    // _addBevelJoin() handles both 'bevel' and 'miter' joins.
                Path._addBevelJoin(segment, join, strokeRadius, miterLimit,
                        matrix, strokeMatrix, addPoint);
            }
        }

        function addCap(segment, cap) {
            if (cap === 'round') {
                addRound(segment);
            } else {
                // _addSquareCap() handles both 'square' and 'butt' caps.
                Path._addSquareCap(segment, cap, strokeRadius, matrix,
                        strokeMatrix, addPoint);
            }
        }

        var length = segments.length - (closed ? 0 : 1);
        if (length > 0) {
            for (var i = 1; i < length; i++) {
                addJoin(segments[i], join);
            }
            if (closed) {
                // Go back to the beginning
                addJoin(segments[0], join);
            } else {
                // Handle caps on open paths
                addCap(segments[0], cap);
                addCap(segments[segments.length - 1], cap);
            }
        }
        return bounds;
    },

    /**
     * Returns the horizontal and vertical padding that a transformed round
     * stroke adds to the bounding box, by calculating the dimensions of a
     * rotated ellipse.
     */
    _getStrokePadding: function(radius, matrix) {
        if (!matrix)
            return [radius, radius];
        // If a matrix is provided, we need to rotate the stroke circle
        // and calculate the bounding box of the resulting rotated ellipse:
        // Get rotated hor and ver vectors, and determine rotation angle
        // and ellipse values from them:
        var hor = new Point(radius, 0).transform(matrix),
            ver = new Point(0, radius).transform(matrix),
            phi = hor.getAngleInRadians(),
            a = hor.getLength(),
            b = ver.getLength();
        // Formula for rotated ellipses:
        // x = cx + a*cos(t)*cos(phi) - b*sin(t)*sin(phi)
        // y = cy + b*sin(t)*cos(phi) + a*cos(t)*sin(phi)
        // Derivatives (by Wolfram Alpha):
        // derivative of x = cx + a*cos(t)*cos(phi) - b*sin(t)*sin(phi)
        // dx/dt = a sin(t) cos(phi) + b cos(t) sin(phi) = 0
        // derivative of y = cy + b*sin(t)*cos(phi) + a*cos(t)*sin(phi)
        // dy/dt = b cos(t) cos(phi) - a sin(t) sin(phi) = 0
        // This can be simplified to:
        // tan(t) = -b * tan(phi) / a // x
        // tan(t) =  b * cot(phi) / a // y
        // Solving for t gives:
        // t = pi * n - arctan(b * tan(phi) / a) // x
        // t = pi * n + arctan(b * cot(phi) / a)
        //   = pi * n + arctan(b / tan(phi) / a) // y
        var sin = Math.sin(phi),
            cos = Math.cos(phi),
            tan = Math.tan(phi),
            tx = Math.atan2(b * tan, a),
            ty = Math.atan2(b, tan * a);
        // Due to symmetry, we don't need to cycle through pi * n solutions:
        return [Math.abs(a * Math.cos(tx) * cos + b * Math.sin(tx) * sin),
                Math.abs(b * Math.sin(ty) * cos + a * Math.cos(ty) * sin)];
    },

    _addBevelJoin: function(segment, join, radius, miterLimit, matrix,
            strokeMatrix, addPoint, isArea) {
        // Handles both 'bevel' and 'miter' joins, as they share a lot of code,
        // using different matrices to transform segment points and stroke
        // vectors to support Style#strokeScaling.
        var curve2 = segment.getCurve(),
            curve1 = curve2.getPrevious(),
            point = curve2.getPoint1().transform(matrix),
            normal1 = curve1.getNormalAtTime(1).multiply(radius)
                .transform(strokeMatrix),
            normal2 = curve2.getNormalAtTime(0).multiply(radius)
                .transform(strokeMatrix),
                angle = normal1.getDirectedAngle(normal2);
        if (angle < 0 || angle >= 180) {
            normal1 = normal1.negate();
            normal2 = normal2.negate();
        }
        if (isArea)
            addPoint(point);
        addPoint(point.add(normal1));
        if (join === 'miter') {
            // Intersect the two lines
            var corner = new Line(point.add(normal1),
                    new Point(-normal1.y, normal1.x), true
                ).intersect(new Line(point.add(normal2),
                    new Point(-normal2.y, normal2.x), true
                ), true);
            // See if we actually get a bevel point and if its distance is below
            // the miterLimit. If not, make a normal bevel.
            if (corner && point.getDistance(corner) <= miterLimit * radius) {
                addPoint(corner);
            }
        }
        // Produce a normal bevel
        addPoint(point.add(normal2));
    },

    _addSquareCap: function(segment, cap, radius, matrix, strokeMatrix,
            addPoint, isArea) {
        // Handles both 'square' and 'butt' caps, as they share a lot of code.
        // Calculate the corner points of butt and square caps, using different
        // matrices to transform segment points and stroke vectors to support
        // Style#strokeScaling.
        var point = segment._point.transform(matrix),
            loc = segment.getLocation(),
            // Checking loc.getTime() for 0 is to see whether this is the first
            // or the last segment of the open path, in order to determine in
            // which direction to flip the normal.
            normal = loc.getNormal()
                    .multiply(loc.getTime() === 0 ? radius : -radius)
                    .transform(strokeMatrix);
        // For square caps, we need to step away from point in the direction of
        // the tangent, which is the rotated normal.
        if (cap === 'square') {
            if (isArea) {
                addPoint(point.subtract(normal));
                addPoint(point.add(normal));
            }
            point = point.add(normal.rotate(-90));
        }
        addPoint(point.add(normal));
        addPoint(point.subtract(normal));
    },

    /**
     * Returns the bounding rectangle of the item including handles.
     *
     * @private
     */
    getHandleBounds: function(segments, closed, path, matrix, options) {
        var style = path.getStyle(),
            stroke = options.stroke && style.hasStroke(),
            strokePadding,
            joinPadding;
        if (stroke) {
            var strokeMatrix = path._getStrokeMatrix(matrix, options),
                strokeRadius = style.getStrokeWidth() / 2,
                joinRadius = strokeRadius;
            if (style.getStrokeJoin() === 'miter')
                joinRadius = strokeRadius * style.getMiterLimit();
            if (style.getStrokeCap() === 'square')
                joinRadius = Math.max(joinRadius, strokeRadius * Math.SQRT2);
            strokePadding = Path._getStrokePadding(strokeRadius, strokeMatrix);
            joinPadding = Path._getStrokePadding(joinRadius, strokeMatrix);
        }
        var coords = new Array(6),
            x1 = Infinity,
            x2 = -x1,
            y1 = x1,
            y2 = x2;
        for (var i = 0, l = segments.length; i < l; i++) {
            var segment = segments[i];
            segment._transformCoordinates(matrix, coords);
            for (var j = 0; j < 6; j += 2) {
                // Use different padding for points or handles
                var padding = !j ? joinPadding : strokePadding,
                    paddingX = padding ? padding[0] : 0,
                    paddingY = padding ? padding[1] : 0,
                    x = coords[j],
                    y = coords[j + 1],
                    xn = x - paddingX,
                    xx = x + paddingX,
                    yn = y - paddingY,
                    yx = y + paddingY;
                if (xn < x1) x1 = xn;
                if (xx > x2) x2 = xx;
                if (yn < y1) y1 = yn;
                if (yx > y2) y2 = yx;
            }
        }
        return new Rectangle(x1, y1, x2 - x1, y2 - y1);
    }
}});
