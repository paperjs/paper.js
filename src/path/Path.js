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
	 * @param {Object} object an object literal containing properties to
	 * be set on the path
	 * @return {Path} the newly created path
	 *
	 * @example {@paperscript}
	 * var path = new Path({
	 * 	segments: [[20, 20], [80, 80], [140, 20]],
	 * 	fillColor: 'black',
	 * 	closed: true
	 * });
	 *
	 * @example {@paperscript}
	 * var path = new Path({
	 * 	segments: [[20, 20], [80, 80], [140, 20]],
	 * 	strokeColor: 'red',
	 * 	strokeWidth: 20,
	 * 	strokeCap: 'round',
	 * 	selected: true
	 * });
	 */
	/**
	 * Creates a new path item from SVG path-data and places it at the top of
	 * the active layer.
	 *
	 * @name Path#initialize
	 * @param {String} pathData the SVG path-data that describes the geometry
	 * of this path.
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
		// arg can either be an object literal containing properties to be set
		// on the path, a list of segments to be set, or the first of multiple
		// arguments describing separate segments.
		// If it is an array, it can also be a description of a point, so
		// check its first entry for object as well.
		// But first see if segments are directly passed at all. If not, try
		// _set(arg).
		var segments = Array.isArray(arg)
			? typeof arg[0] === 'object'
				? arg
				: arguments
			// See if it behaves like a segment or a point, but filter out
			// rectangles, as accepted by some Path.Constructor constructors.
			: arg && (arg.size === undefined && (arg.x !== undefined
					|| arg.point !== undefined))
				? arguments
				: null;
		// Always call setSegments() to initialize a few related variables.
		this.setSegments(segments || []);
		if (!segments && typeof arg === 'string') {
			this.setPathData(arg);
			// Erase for _initialize() call below.
			arg = null;
		}
		// Only pass on arg as props if it wasn't consumed for segments already.
		this._initialize(!segments && arg);
	},

	_equals: function(item) {
		return Base.equals(this._segments, item._segments);
	},

	clone: function(insert) {
		var copy = this._clone(new Path({
			segments: this._segments,
			insert: false
		}), insert);
		// Speed up things a little by copy over values that don't need checking
		copy._closed = this._closed;
		if (this._clockwise !== undefined)
			copy._clockwise = this._clockwise;
		return copy;
	},

	_changed: function _changed(flags) {
		_changed.base.call(this, flags);
		if (flags & /*#=*/ ChangeFlag.GEOMETRY) {
			// Clear cached native Path
			(this._compound ? this._parent : this)._currentPath = undefined;
			// Clockwise state becomes undefined as soon as geometry changes.
			this._length = this._clockwise = undefined;
			// Curves are no longer valid
			if (this._curves) {
				for (var i = 0, l = this._curves.length; i < l; i++)
					this._curves[i]._changed(/*#=*/ Change.GEOMETRY);
			}
			// Clear cached curves used for winding direction and containment
			// calculation.
			// NOTE: This is only needed with __options.booleanOperations
			this._monoCurves = undefined;
		} else if (flags & /*#=*/ ChangeFlag.STROKE) {
			// TODO: We could preserve the purely geometric bounds that are not
			// affected by stroke: _bounds.bounds and _bounds.handleBounds
			this._bounds = undefined;
		}
	},

	getStyle: function() {
		// If this path is part of a CompoundPath, use the paren't style instead
		var parent = this._parent;
		return (parent instanceof CompoundPath ? parent : this)._style;
	},

	/**
	 * The segments contained within the path.
	 *
	 * @type Segment[]
	 * @bean
	 */
	getSegments: function() {
		return this._segments;
	},

	setSegments: function(segments) {
		var fullySelected = this.isFullySelected();
		this._segments.length = 0;
		this._selectedSegmentState = 0;
		// Calculate new curves next time we call getCurves()
		this._curves = undefined;
		this._add(Segment.readAll(segments));
		if (fullySelected)
			this.setFullySelected(true);
	},

	/**
	 * The first Segment contained within the path.
	 *
	 * @type Segment
	 * @bean
	 */
	getFirstSegment: function() {
		return this._segments[0];
	},

	/**
	 * The last Segment contained within the path.
	 *
	 * @type Segment
	 * @bean
	 */
	getLastSegment: function() {
		return this._segments[this._segments.length - 1];
	},

	/**
	 * The curves contained within the path.
	 *
	 * @type Curve[]
	 * @bean
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
	 * @type Curve
	 * @bean
	 */
	getFirstCurve: function() {
		return this.getCurves()[0];
	},

	/**
	 * The last Curve contained within the path.
	 *
	 * @type Curve
	 * @bean
	 */
	getLastCurve: function() {
		var curves = this.getCurves();
		return curves[curves.length - 1];
	},

	/**
	 * The segments contained within the path, described as SVG style path data.
	 *
	 * @type String
	 * @bean
	 */
	getPathData: function(precision) {
		var segments = this._segments,
			f = Formatter.instance,
			parts = [];

		// TODO: Add support for H/V and/or relative commands, where appropriate
		// and resulting in shorter strings
		function addCurve(seg1, seg2, skipLine) {
			var point1 = seg1._point,
				point2 = seg2._point,
				handle1 = seg1._handleOut,
				handle2 = seg2._handleIn;
			if (handle1.isZero() && handle2.isZero()) {
				if (!skipLine) {
					// L = absolute lineto: moving to a point with drawing
					parts.push('L' + f.point(point2, precision));
				}
			} else {
				// c = relative curveto: handle1, handle2 + end - start,
				// end - start
				var end = point2.subtract(point1);
				parts.push('c' + f.point(handle1, precision)
						+ ' ' + f.point(end.add(handle2), precision)
						+ ' ' + f.point(end, precision));
			}
		}

		if (segments.length === 0)
			return '';
		parts.push('M' + f.point(segments[0]._point));
		for (var i = 0, l = segments.length  - 1; i < l; i++)
			addCurve(segments[i], segments[i + 1], false);
		if (this._closed) {
			addCurve(segments[segments.length - 1], segments[0], true);
			parts.push('z');
		}
		return parts.join('');
	},

	/**
	 * Specifies whether the path is closed. If it is closed, Paper.js connects
	 * the first and last segments.
	 *
	 * @type Boolean
	 * @bean
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
			this._changed(/*#=*/ Change.GEOMETRY);
		}
	},

	// TODO: Consider adding getSubPath(a, b), returning a part of the current
	// path, with the added benefit that b can be < a, and closed looping is
	// taken into account.

	isEmpty: function() {
		return this._segments.length === 0;
	},

	isPolygon: function() {
		for (var i = 0, l = this._segments.length; i < l; i++) {
			if (!this._segments[i].isLinear())
				return false;
		}
		return true;
	},

	_applyMatrix: function(matrix) {
		var coords = new Array(6);
		for (var i = 0, l = this._segments.length; i < l; i++)
			this._segments[i]._transformCoordinates(matrix, coords, true);
		return true;
	},

	/**
	 * Private method that adds a segment to the segment list. It assumes that
	 * the passed object is a segment already and does not perform any checks.
	 * If a curves list was requested, it will kept in sync with the segments
	 * list automatically.
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
			// _selectedSegmentState now
			if (segment._selectionState)
				this._updateSelection(segment, 0, segment._selectionState);
		}
		if (append) {
			// Append them all at the end by using push
			segments.push.apply(segments, segs);
		} else {
			// Insert somewhere else
			segments.splice.apply(segments, [index, 0].concat(segs));
			// Adjust the indices of the segments above.
			for (var i = index + amount, l = segments.length; i < l; i++)
				segments[i]._index = i;
		}
		// Keep the curves list in sync all the time in case it as requested
		// already.
		if (curves || segs._curves) {
			if (!curves)
				curves = this._curves = [];
			// We need to step one index down from the inserted segment to
			// get its curve, except for the first segment.
			var from = index > 0 ? index - 1 : index,
				start = from,
				to = Math.min(from + amount, this._countCurves());
			if (segs._curves) {
				// Reuse removed curves.
				curves.splice.apply(curves, [from, 0].concat(segs._curves));
				start += segs._curves.length;
			}
			// Insert new curves, but do not initialize their segments yet,
			// since #_adjustCurves() handles all that for us.
			for (var i = start; i < to; i++)
				curves.splice(i, 0, new Curve(this, null, null));
			// Adjust segments for the curves before and after the removed ones
			this._adjustCurves(from, to);
		}
		this._changed(/*#=*/ Change.GEOMETRY);
		return segs;
	},

	/**
	 * Adjusts segments of curves before and after inserted / removed segments.
	 */
	_adjustCurves: function(from, to) {
		var segments = this._segments,
			curves = this._curves,
			curve;
		for (var i = from; i < to; i++) {
			curve = curves[i];
			curve._path = this;
			curve._segment1 = segments[i];
			curve._segment2 = segments[i + 1] || segments[0];
		}
		// If it's the first segment, correct the last segment of closed
		// paths too:
		if (curve = curves[this._closed && from === 0 ? segments.length - 1
				: from - 1])
			curve._segment2 = segments[from] || segments[0];
		// Fix the segment after the modified range, if it exists
		if (curve = curves[to])
			curve._segment1 = segments[to];
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
	 * @param {Segment|Point} segment the segment or point to be added.
	 * @return {Segment} the added segment. This is not necessarily the same
	 * object, e.g. if the segment to be added already belongs to another path.
	 *
	 * @example {@paperscript}
	 * // Adding segments to a path using point objects:
	 * var path = new Path({
	 * 	strokeColor: 'black'
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
	 * 	strokeColor: 'black'
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
	 * 	strokeColor: 'black'
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
	 * 	strokeColor: 'black'
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
		return arguments.length > 1 && typeof segment1 !== 'number'
			// addSegments
			? this._add(Segment.readAll(arguments))
			// addSegment
			: this._add([ Segment.read(arguments) ])[0];
	},

	/**
	 * Inserts one or more segments at a given index in the list of this path's
	 * segments.
	 *
	 * @param {Number} index the index at which to insert the segment.
	 * @param {Segment|Point} segment the segment or point to be inserted.
	 * @return {Segment} the added segment. This is not necessarily the same
	 * object, e.g. if the segment to be added already belongs to another path.
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
		return arguments.length > 2 && typeof segment1 !== 'number'
			// insertSegments
			? this._add(Segment.readAll(arguments, 1), index)
			// insertSegment
			: this._add([ Segment.read(arguments, 1) ], index)[0];
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
	 * belongs to another path.
	 *
	 * @example {@paperscript}
	 * // Adding an array of Point objects:
	 * var path = new Path({
	 * 	strokeColor: 'black'
	 * });
	 * var points = [new Point(30, 50), new Point(170, 50)];
	 * path.addSegments(points);
	 *
	 * @example {@paperscript}
	 * // Adding an array of [x, y] arrays:
	 * var path = new Path({
	 * 	strokeColor: 'black'
	 * });
	 * var array = [[30, 75], [100, 20], [170, 75]];
	 * path.addSegments(array);
	 *
	 * @example {@paperscript}
	 * // Adding segments from one path to another:
	 *
	 * var path = new Path({
	 * 	strokeColor: 'black'
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
		return this._add(Segment.readAll(segments));
	},

	/**
	 * Inserts an array of segments at a given index in the path's
	 * {@link #segments} array.
	 *
	 * @param {Number} index the index at which to insert the segments.
	 * @param {Segment[]} segments the segments to be inserted.
	 * @return {Segment[]} an array of the added segments. These segments are
	 * not necessarily the same objects, e.g. if the segment to be added already
	 * belongs to another path.
	 */
	insertSegments: function(index, segments) {
		return this._add(Segment.readAll(segments), index);
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
	 * 	center: new Point(80, 50),
	 * 	radius: 35,
	 * 	strokeColor: 'black'
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
	 * Removes the segments from the specified {@code from} index to the
	 * {@code to} index from the path's {@link #segments} array.
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
	 * 	center: new Point(80, 50),
	 * 	radius: 35,
	 * 	strokeColor: 'black'
	 * });
	 *
	 * // Remove the segments from index 1 till index 2:
	 * path.removeSegments(1, 2);
	 *
	 * // Select the path, so we can see its segments:
	 * path.selected = true;
	 */
	removeSegments: function(from, to, _includeCurves) {
		from = from || 0;
		to = Base.pick(to, this._segments.length);
		var segments = this._segments,
			curves = this._curves,
			count = segments.length, // segment count before removal
			removed = segments.splice(from, to - from),
			amount = removed.length;
		if (!amount)
			return removed;
		// Update selection state accordingly
		for (var i = 0; i < amount; i++) {
			var segment = removed[i];
			if (segment._selectionState)
				this._updateSelection(segment, segment._selectionState, 0);
			// Clear the indices and path references of the removed segments
			segment._index = segment._path = null;
		}
		// Adjust the indices of the segments above.
		for (var i = from, l = segments.length; i < l; i++)
			segments[i]._index = i;
		// Keep curves in sync
		if (curves) {
			// If we're removing the last segment, remove the last curve (the
			// one to the left of the segment, not to the right, as normally).
			// Also take into account closed paths, which have one curve more
			// than segments.
			var index = from > 0 && to === count + (this._closed ? 1 : 0)
					? from - 1
					: from,
				curves = curves.splice(index, amount);
			// Return the removed curves as well, if we're asked to include
			// them, but exclude the first curve, since that's shared with the
			// previous segment and does not connect the returned segments.
			if (_includeCurves)
				removed._curves = curves.slice(1);
			// Adjust segments for the curves before and after the removed ones
			this._adjustCurves(index, index);
		}
		this._changed(/*#=*/ Change.GEOMETRY);
		return removed;
	},

	// DOCS Path#clear()
	clear: '#removeSegments',

	/**
	 * Specifies whether an path is selected and will also return {@code true}
	 * if the path is partially selected, i.e. one or more of its segments is
	 * selected.
	 *
	 * Paper.js draws the visual outlines of selected items on top of your
	 * project. This can be useful for debugging, as it allows you to see the
	 * construction of paths, position of path curves, individual segment points
	 * and bounding boxes of symbol and raster items.
	 *
	 * @type Boolean
	 * @bean
	 * @see Project#selectedItems
	 * @see Segment#selected
	 * @see Point#selected
	 *
	 * @example {@paperscript}
	 * // Selecting an item:
	 * var path = new Path.Circle({
	 * 	center: new Size(80, 50),
	 * 	radius: 35
	 * });
	 * path.selected = true; // Select the path
	 *
	 * @example {@paperscript}
	 * // A path is selected, if one or more of its segments is selected:
	 * var path = new Path.Circle({
	 * 	center: new Size(80, 50),
	 * 	radius: 35
	 * });
	 *
	 * // Select the second segment of the path:
	 * path.segments[1].selected = true;
	 *
	 * // If the path is selected (which it is), set its fill color to red:
	 * if (path.selected) {
	 * 	path.fillColor = 'red';
	 * }
	 *
	 */
	/**
	 * Specifies whether the path and all its segments are selected. Cannot be 
	 * {@code true} on an empty path.
	 *
	 * @type Boolean
	 * @bean
	 *
	 * @example {@paperscript}
	 * // A path is fully selected, if all of its segments are selected:
	 * var path = new Path.Circle({
	 * 	center: new Size(80, 50),
	 * 	radius: 35
	 * });
	 * path.fullySelected = true;
	 *
	 * var path2 = new Path.Circle({
	 * 	center: new Size(180, 50),
	 * 	radius: 35
	 * });
	 *
	 * // Deselect the second segment of the second path:
	 * path2.segments[1].selected = false;
	 *
	 * // If the path is fully selected (which it is),
	 * // set its fill color to red:
	 * if (path.fullySelected) {
	 * 	path.fillColor = 'red';
	 * }
	 *
	 * // If the second path is fully selected (which it isn't, since we just
	 * // deselected its second segment),
	 * // set its fill color to red:
	 * if (path2.fullySelected) {
	 * 	path2.fillColor = 'red';
	 * }
	 */
	isFullySelected: function() {
		var length = this._segments.length;
		return this._selected && length > 0 && this._selectedSegmentState
				=== length * /*#=*/ SelectionState.SEGMENT;
	},

	setFullySelected: function(selected) {
		// No need to call _selectSegments() when selected is false, since
		// #setSelected() does that for us
		if (selected)
			this._selectSegments(true);
		this.setSelected(selected);
	},

	setSelected: function setSelected(selected) {
		// Deselect all segments when path is marked as not selected
		if (!selected)
			this._selectSegments(false);
		// No need to pass true for noChildren since Path has none anyway.
		setSelected.base.call(this, selected);
	},

	_selectSegments: function(selected) {
		var length = this._segments.length;
		this._selectedSegmentState = selected
				? length * /*#=*/ SelectionState.SEGMENT : 0;
		for (var i = 0; i < length; i++)
			this._segments[i]._selectionState = selected
					? /*#=*/ SelectionState.SEGMENT : 0;
	},

	_updateSelection: function(segment, oldState, newState) {
		segment._selectionState = newState;
		var total = this._selectedSegmentState += newState - oldState;
		// Set this path as selected in case we have selected segments. Do not
		// unselect if we're down to 0, as the path itself can still remain
		// selected even when empty.
		if (total > 0)
			this.setSelected(true);
	},

	/**
	 * Converts the curves in a path to straight lines with an even distribution
	 * of points. The distance between the produced segments is as close as
	 * possible to the value specified by the {@code maxDistance} parameter.
	 *
	 * @param {Number} maxDistance the maximum distance between the points
	 *
	 * @example {@paperscript}
	 * // Flattening a circle shaped path:
	 *
	 * // Create a circle shaped path at { x: 80, y: 50 }
	 * // with a radius of 35:
	 * var path = new Path.Circle({
	 * 	center: new Size(80, 50),
	 * 	radius: 35
	 * });
	 *
	 * // Select the path, so we can inspect its segments:
	 * path.selected = true;
	 *
	 * // Create a copy of the path and move it 150 points to the right:
	 * var copy = path.clone();
	 * copy.position.x += 150;
	 *
	 * // Convert its curves to points, with a max distance of 20:
	 * copy.flatten(20);
	 */
	flatten: function(maxDistance) {
		var flattener = new PathFlattener(this),
			pos = 0,
			// Adapt step = maxDistance so the points distribute evenly.
			step = flattener.length / Math.ceil(flattener.length / maxDistance),
			// Add/remove half of step to end, so imprecisions are ok too.
			// For closed paths, remove it, because we don't want to add last
			// segment again
			end = flattener.length + (this._closed ? -step : step) / 2;
		// Iterate over path and evaluate and add points at given offsets
		var segments = [];
		while (pos <= end) {
			segments.push(new Segment(flattener.evaluate(pos, 0)));
			pos += step;
		}
		this.setSegments(segments);
	},

	/**
	 * Reduces the path by removing curves that have a lenght of 0.
	 */
	reduce: function() {
		var curves = this.getCurves();
		for (var i = curves.length - 1; i >= 0; i--) {
			var curve = curves[i];
			if (curve.isLinear() && curve.getLength() === 0)
				curve.remove();
		}
		return this;
	},

	/**
	 * Smooths a path by simplifying it. The {@link Path#segments} array is
	 * analyzed and replaced by a more optimal set of segments, reducing memory
	 * usage and speeding up drawing.
	 *
	 * @param {Number} [tolerance=2.5]
	 *
	 * @example {@paperscript height=300}
	 * // Click and drag below to draw to draw a line, when you release the
	 * // mouse, the is made smooth using path.simplify():
	 *
	 * var path;
	 * function onMouseDown(event) {
	 * 	// If we already made a path before, deselect it:
	 * 	if (path) {
	 * 		path.selected = false;
	 * 	}
	 * 
	 * 	// Create a new path and add the position of the mouse
	 * 	// as its first segment. Select it, so we can see the
	 * 	// segment points:
	 * 	path = new Path({
	 * 		segments: [event.point],
	 * 		strokeColor: 'black',
	 * 		selected: true
	 * 	});
	 * }
	 * 
	 * function onMouseDrag(event) {
	 * 	// On every drag event, add a segment to the path
	 * 	// at the position of the mouse:
	 * 	path.add(event.point);
	 * }
	 * 
	 * function onMouseUp(event) {
	 * 	// When the mouse is released, simplify the path:
	 * 	path.simplify();
	 * 	path.selected = true;
	 * }
	 */
	simplify: function(tolerance) {
		if (this._segments.length > 2) {
			var fitter = new PathFitter(this, tolerance || 2.5);
			this.setSegments(fitter.fit());
		}
	},

	// TODO: reduceSegments([flatness])

	/**
	 * Splits the path at the given offset. After splitting, the path will be
	 * open. If the path was open already, splitting will result in two paths.
	 * 
	 * @name Path#split
	 * @function
	 * @param {Number} offset the offset at which to split the path
	 * as a number between 0 and {@link Path#length}
	 * @return {Path} the newly created path after splitting, if any
	 * 
	 * @example {@paperscript} // Splitting an open path
	 * var path = new Path();
	 * path.strokeColor = 'black';
	 * path.add(20, 20);
	 * 
	 * // Add an arc through {x: 90, y: 80} to {x: 160, y: 20}
	 * path.arcTo([90, 80], [160, 20]);
	 * 
	 * // Split the path at 30% of its length:
	 * var path2 = path.split(path.length * 0.3);
	 * path2.strokeColor = 'red';
	 * 
	 * // Move the newly created path 40px to the right:
	 * path2.position.x += 40;
	 * 
	 * @example {@paperscript} // Splitting a closed path
	 * var path = new Path.Rectangle({
	 * 	from: [20, 20],
	 * 	to: [80, 80],
	 * 	strokeColor: 'black'
	 * });
	 * 
	 * // Split the path at 60% of its length:
	 * path.split(path.length * 0.6);
	 * 
	 * // Move the first segment, to show where the path
	 * // was split:
	 * path.firstSegment.point.x += 20;
	 * 
	 * // Select the first segment:
	 * path.firstSegment.selected = true;
	 */
	/**
	 * Splits the path at the given curve location. After splitting, the path
	 * will be open. If the path was open already, splitting will result in two
	 * paths.
	 * 
	 * @name Path#split
	 * @function
	 * @param {CurveLocation} location the curve location at which to split
	 * the path
	 * @return {Path} the newly created path after splitting, if any
	 * 
	 * @example {@paperscript}
	 * var path = new Path.Circle({
	 * 	center: view.center,
	 * 	radius: 40,
	 * 	strokeColor: 'black'
	 * });
	 * 
	 * var pointOnCircle = view.center + {
	 * 	length: 40,
	 * 	angle: 30
	 * };
	 * 
	 * var curveLocation = path.getNearestLocation(pointOnCircle);
	 * 
	 * path.split(curveLocation);
	 * path.lastSegment.selected = true;
	 */
	/**
	 * Splits the path at the given curve index and parameter. After splitting,
	 * the path will be open. If the path was open already, splitting will
	 * result in two paths.
	 * 
	 * @example {@paperscript} // Splitting an open path
	 * // Draw a V shaped path:
	 * var path = new Path([20, 20], [50, 80], [80, 20]);
	 * path.strokeColor = 'black';
	 * 
	 * // Split the path half-way down its second curve:
	 * var path2 = path.split(1, 0.5);
	 * 
	 * // Give the resulting path a red stroke-color
	 * // and move it 20px to the right:
	 * path2.strokeColor = 'red';
	 * path2.position.x += 20;
	 * 
	 * @example {@paperscript} // Splitting a closed path
	 * var path = new Path.Rectangle({
	 * 	from: [20, 20],
	 * 	to: [80, 80],
	 * 	strokeColor: 'black'
	 * });
	 * 
	 * // Split the path half-way down its second curve:
	 * path.split(2, 0.5);
	 * 
	 * // Move the first segment, to show where the path
	 * // was split:
	 * path.firstSegment.point.x += 20;
	 * 
	 * // Select the first segment:
	 * path.firstSegment.selected = true;
	 * 
	 * @param {Number} index the index of the curve in the {@link Path#curves}
	 * array at which to split
	 * @param {Number} parameter the parameter at which the curve will be split
	 * @return {Path} the newly created path after splitting, if any
	 */
	split: function(index, parameter) {
		if (parameter === null)
			return;
		if (arguments.length === 1) {
			var arg = index;
			// split(offset), convert offset to location
			if (typeof arg === 'number')
				arg = this.getLocationAt(arg);
			// split(location)
			index = arg.index;
			parameter = arg.parameter;
		}
		var tolerance = /*#=*/ Numerical.TOLERANCE;
		if (parameter >= 1 - tolerance) {
			// t == 1 is the same as t == 0 and index ++
			index++;
			parameter--;
		}
		var curves = this.getCurves();
		if (index >= 0 && index < curves.length) {
			// Only divide curves if we're not on an existing segment already.
			if (parameter > tolerance) {
				// Divide the curve with the index at given parameter.
				// Increase because dividing adds more segments to the path.
				curves[index++].divide(parameter, true);
			}
			// Create the new path with the segments to the right of given
			// parameter, which are removed from the current path. Pass true
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
			} else if (index > 0) {
				// Pass true for _preserve, in case of CompoundPath, to avoid 
				// reversing of path direction, which would mess with segs!
				// Use _clone to copy over all other attributes, including style
				path = this._clone(new Path().insertAbove(this, true));
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
	 * Specifies whether the path is oriented clock-wise.
	 *
	 * @type Boolean
	 * @bean
	 */
	isClockwise: function() {
		if (this._clockwise !== undefined)
			return this._clockwise;
		return Path.isClockwise(this._segments);
	},

	setClockwise: function(clockwise) {
		// Only revers the path if its clockwise orientation is not the same
		// as what it is now demanded to be.
		// On-the-fly conversion to boolean:
		if (this.isClockwise() != (clockwise = !!clockwise))
			this.reverse();
		// Reverse only flips _clockwise state if it was already set, so let's
		// always set this here now.
		this._clockwise = clockwise;
	},

	/**
	 * Reverses the orientation of the path, by reversing all its segments.
	 */
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
		// Flip clockwise state if it's defined
		if (this._clockwise !== undefined)
			this._clockwise = !this._clockwise;
	},

	// DOCS: document Path#join in more detail.
	/**
	 * Joins the path with the specified path, which will be removed in the
	 * process.
	 *
	 * @param {Path} path
	 *
	 * @example {@paperscript}
	 * // Joining two paths:
	 * var path = new Path({
	 * 	segments: [[30, 25], [30, 75]],
	 * 	strokeColor: 'black'
	 * });
	 * 
	 * var path2 = new Path({
	 * 	segments: [[200, 25], [200, 75]],
	 * 	strokeColor: 'black'
	 * });
	 * 
	 * // Join the paths:
	 * path.join(path2);
	 *
	 * @example {@paperscript}
	 * // Joining two paths that share a point at the start or end of their
	 * // segments array:
	 * var path = new Path({
	 * 	segments: [[30, 25], [30, 75]],
	 * 	strokeColor: 'black'
	 * });
	 * 
	 * var path2 = new Path({
	 * 	segments: [[30, 25], [80, 25]],
	 * 	strokeColor: 'black'
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
	 * 	segments: [[30, 25], [80, 25], [80, 75]],
	 * 	strokeColor: 'black'
	 * });
	 * 
	 * var path2 = new Path({
	 * 	segments: [[30, 25], [30, 75], [80, 75]],
	 * 	strokeColor: 'black'
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
	join: function(path) {
		if (path) {
			var segments = path._segments,
				last1 = this.getLastSegment(),
				last2 = path.getLastSegment();
			if (last1._point.equals(last2._point))
				path.reverse();
			var first1,
				first2 = path.getFirstSegment();
			if (last1._point.equals(first2._point)) {
				last1.setHandleOut(first2._handleOut);
				this._add(segments.slice(1));
			} else {
				first1 = this.getFirstSegment();
				if (first1._point.equals(first2._point))
					path.reverse();
				last2 = path.getLastSegment();
				if (first1._point.equals(last2._point)) {
					first1.setHandleIn(last2._handleIn);
					// Prepend all segments from path except the last one
					this._add(segments.slice(0, segments.length - 1), 0);
				} else {
					this._add(segments.slice());
				}
			}
			if (path.closed)
				this._add([segments[0]]);
			path.remove();
			// Close if they touch in both places. Fetch the segments again
			// since they may have changed.
			first1 = this.getFirstSegment();
			last1 = this.getLastSegment();
			if (last1._point.equals(first1._point)) {
				first1.setHandleIn(last1._handleIn);
				last1.remove();
				this.setClosed(true);
			}
			this._changed(/*#=*/ Change.GEOMETRY);
			return true;
		}
		return false;
	},

	/**
	 * The approximate length of the path in points.
	 *
	 * @type Number
	 * @bean
	 */
	getLength: function() {
		if (this._length == null) {
			var curves = this.getCurves();
			this._length = 0;
			for (var i = 0, l = curves.length; i < l; i++)
				this._length += curves[i].getLength();
		}
		return this._length;
	},

	/**
	 * The area of the path in square points. Self-intersecting paths can
	 * contain sub-areas that cancel each other out.
	 *
	 * @type Number
	 * @bean
	 */
	getArea: function() {
		var curves = this.getCurves();
		var area = 0;
		for (var i = 0, l = curves.length; i < l; i++)
			area += curves[i].getArea();
		return area;
	},

	_getOffset: function(location) {
		var index = location && location.getIndex();
		if (index != null) {
			var curves = this.getCurves(),
				offset = 0;
			for (var i = 0; i < index; i++)
				offset += curves[i].getLength();
			var curve = curves[index];
			return offset + curve.getLength(0, location.getParameter());
		}
		return null;
	},

	/**
	 * Returns the curve location of the specified point if it lies on the
	 * path, {@code null} otherwise.
	 * @param {Point} point the point on the path.
	 * @return {CurveLocation} the curve location of the specified point.
	 */
	getLocationOf: function(point) { // TODO: Fix argument assignment!
		var point = Point.read(arguments),
			curves = this.getCurves();
		for (var i = 0, l = curves.length; i < l; i++) {
			var loc = curves[i].getLocationOf(point);
			if (loc)
				return loc;
		}
		return null;
	},

	// DOCS: document Path#getLocationAt
	/**
	 * {@grouptitle Positions on Paths and Curves}
	 *
	 * @param {Number} offset
	 * @param {Boolean} [isParameter=false]
	 * @return {CurveLocation}
	 */
	getLocationAt: function(offset, isParameter) {
		var curves = this.getCurves(),
			length = 0;
		if (isParameter) {
			// offset consists of curve index and curve parameter, before and
			// after the fractional digit.
			var index = ~~offset; // = Math.floor()
			return curves[index].getLocationAt(offset - index, true);
		}
		for (var i = 0, l = curves.length; i < l; i++) {
			var start = length,
				curve = curves[i];
			length += curve.getLength();
			if (length > offset) {
				// Found the segment within which the length lies
				return curve.getLocationAt(offset - start);
			}
		}
		// It may be that through imprecision of getLength, that the end of the
		// last curve was missed:
		if (offset <= this.getLength())
			return new CurveLocation(curves[curves.length - 1], 1);
		return null;
	},

	/**
	 * Calculates the point on the path at the given offset.
	 *
	 * @param {Number} offset
	 * @param {Boolean} [isParameter=false]
	 * @return {Point} the point at the given offset
	 *
	 * @example {@paperscript height=150}
	 * // Finding the point on a path at a given offset:
	 *
	 * // Create an arc shaped path:
	 * var path = new Path({
	 * 	strokeColor: 'black'
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
	 * 	center: point,
	 * 	radius: 3,
	 * 	fillColor: 'red'
	 * });
	 *
	 * @example {@paperscript height=150}
	 * // Iterating over the length of a path:
	 *
	 * // Create an arc shaped path:
	 * var path = new Path({
	 * 	strokeColor: 'black'
	 * });
	 *
	 * path.add(new Point(40, 100));
	 * path.arcTo(new Point(150, 100));
	 *
	 * var amount = 5;
	 * var length = path.length;
	 * for (var i = 0; i < amount + 1; i++) {
	 * 	var offset = i / amount * length;
	 *
	 * 	// Find the point on the path at the given offset:
	 * 	var point = path.getPointAt(offset);
	 *
	 * 	// Create a small circle shaped path at the point:
	 * 	var circle = new Path.Circle({
	 * 		center: point,
	 * 		radius: 3,
	 * 		fillColor: 'red'
	 * 	});
	 * }
	 */
	getPointAt: function(offset, isParameter) {
		var loc = this.getLocationAt(offset, isParameter);
		return loc && loc.getPoint();
	},

	/**
	 * Calculates the tangent to the path at the given offset as a vector point.
	 *
	 * @param {Number} offset
	 * @param {Boolean} [isParameter=false]
	 * @return {Point} the tangent vector at the given offset
	 *
	 * @example {@paperscript height=150}
	 * // Working with the tangent vector at a given offset:
	 *
	 * // Create an arc shaped path:
	 * var path = new Path({
	 * 	strokeColor: 'black'
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
	 * // Find the tangent vector at the given offset:
	 * var tangent = path.getTangentAt(offset);
	 *
	 * // Make the tangent vector 60pt long:
	 * tangent.length = 60;
	 *
	 * var line = new Path({
	 * 	segments: [point, point + tangent],
	 * 	strokeColor: 'red'
	 * })
	 *
	 * @example {@paperscript height=200}
	 * // Iterating over the length of a path:
	 *
	 * // Create an arc shaped path:
	 * var path = new Path({
	 * 	strokeColor: 'black'
	 * });
	 *
	 * path.add(new Point(40, 100));
	 * path.arcTo(new Point(150, 100));
	 *
	 * var amount = 6;
	 * var length = path.length;
	 * for (var i = 0; i < amount + 1; i++) {
	 * 	var offset = i / amount * length;
	 *
	 * 	// Find the point on the path at the given offset:
	 * 	var point = path.getPointAt(offset);
	 *
	 * 	// Find the normal vector on the path at the given offset:
	 * 	var tangent = path.getTangentAt(offset);
	 *
	 * 	// Make the tangent vector 60pt long:
	 * 	tangent.length = 60;
	 *
	 * 	var line = new Path({
	 * 		segments: [point, point + tangent],
	 * 		strokeColor: 'red'
	 * 	})
	 * }
	 */
	getTangentAt: function(offset, isParameter) {
		var loc = this.getLocationAt(offset, isParameter);
		return loc && loc.getTangent();
	},

	/**
	 * Calculates the normal to the path at the given offset as a vector point.
	 *
	 * @param {Number} offset
	 * @param {Boolean} [isParameter=false]
	 * @return {Point} the normal vector at the given offset
	 *
	 * @example {@paperscript height=150}
	 * // Working with the normal vector at a given offset:
	 *
	 * // Create an arc shaped path:
	 * var path = new Path({
	 * 	strokeColor: 'black'
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
	 * // Find the normal vector at the given offset:
	 * var normal = path.getNormalAt(offset);
	 *
	 * // Make the normal vector 30pt long:
	 * normal.length = 30;
	 *
	 * var line = new Path({
	 * 	segments: [point, point + normal],
	 * 	strokeColor: 'red'
	 * });
	 *
	 * @example {@paperscript height=200}
	 * // Iterating over the length of a path:
	 *
	 * // Create an arc shaped path:
	 * var path = new Path({
	 * 	strokeColor: 'black'
	 * });
	 *
	 * path.add(new Point(40, 100));
	 * path.arcTo(new Point(150, 100));
	 *
	 * var amount = 10;
	 * var length = path.length;
	 * for (var i = 0; i < amount + 1; i++) {
	 * 	var offset = i / amount * length;
	 *
	 * 	// Find the point on the path at the given offset:
	 * 	var point = path.getPointAt(offset);
	 *
	 * 	// Find the normal vector on the path at the given offset:
	 * 	var normal = path.getNormalAt(offset);
	 *
	 * 	// Make the normal vector 30pt long:
	 * 	normal.length = 30;
	 *
	 * 	var line = new Path({
	 * 		segments: [point, point + normal],
	 * 		strokeColor: 'red'
	 * 	});
	 * }
	 */
	getNormalAt: function(offset, isParameter) {
		var loc = this.getLocationAt(offset, isParameter);
		return loc && loc.getNormal();
	},

	/**
	 * Returns the nearest location on the path to the specified point.
	 *
	 * @function
	 * @param point {Point} the point for which we search the nearest location
	 * @return {CurveLocation} the location on the path that's the closest to
	 * the specified point
	 */
	getNearestLocation: function(point) { // TODO: Fix argument assignment!
		var point = Point.read(arguments),
			curves = this.getCurves(),
			minDist = Infinity,
			minLoc = null;
		for (var i = 0, l = curves.length; i < l; i++) {
			var loc = curves[i].getNearestLocation(point);
			if (loc._distance < minDist) {
				minDist = loc._distance;
				minLoc = loc;
			}
		}
		return minLoc;
	},

	/**
	 * Returns the nearest point on the path to the specified point.
	 *
	 * @function
	 * @param point {Point} the point for which we search the nearest point
	 * @return {Point} the point on the path that's the closest to the specified
	 * point
	 * 
	 * @example {@paperscript height=200}
	 * var star = new Path.Star({
	 * 	center: view.center,
	 * 	points: 10,
	 * 	radius1: 30,
	 * 	radius2: 60,
	 * 	strokeColor: 'black'
	 * });
	 * 
	 * var circle = new Path.Circle({
	 * 	center: view.center,
	 * 	radius: 3,
	 * 	fillColor: 'red'
	 * });
	 * 
	 * function onMouseMove(event) {
	 * 	// Get the nearest point from the mouse position
	 * 	// to the star shaped path:
	 * 	var nearestPoint = star.getNearestPoint(event.point);
	 * 
	 * 	// Move the red circle to the nearest point:
	 * 	circle.position = nearestPoint;
	 * }
	 */
	getNearestPoint: function(point) { // TODO: Fix argument assignment!
		// We need to use point to avoid minification issues and prevent method
		// from turning into a bean (by removal of the point argument).
		var point = Point.read(arguments);
		return this.getNearestLocation(point).getPoint();
	},

	// DOCS: toShape

	toShape: function(insert) {
		if (!this._closed)
			return null;

		var segments = this._segments,
			type,
			size,
			radius,
			topCenter;

		function isColinear(i, j) {
			return segments[i].isColinear(segments[j]);
		}

		function isOrthogonal(i) {
			return segments[i].isOrthogonal();
		}

		function isArc(i) {
			return segments[i].isArc();
		}

		function getDistance(i, j) {
			return segments[i]._point.getDistance(segments[j]._point);
		}

		// See if actually have any curves in the path. Differentiate
		// between straight objects (line, polyline, rect, and  polygon) and
		// objects with curves(circle, ellipse, roundedRectangle).
		if (this.isPolygon() && segments.length === 4
				&& isColinear(0, 2) && isColinear(1, 3) && isOrthogonal(1)) {
			type = Shape.Rectangle;
			size = new Size(getDistance(0, 3), getDistance(0, 1));
			topCenter = segments[1]._point.add(segments[2]._point).divide(2);
		} else if (segments.length === 8 && isArc(0) && isArc(2) && isArc(4)
				&& isArc(6) && isColinear(1, 5) && isColinear(3, 7)) {
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
			// Determine and apply the shape's angle of rotation.
			shape.rotate(topCenter.subtract(center).getAngle() + 90);
			shape.setStyle(this._style);
			// Insert is true by default.
			if (insert || insert === undefined)
				shape.insertAbove(this);
			return shape;
		}
		return null;
	},

	_hitTest: function(point, options) {
		var that = this,
			style = this.getStyle(),
			segments = this._segments,
			closed = this._closed,
			// transformed tolerance padding, see Item#hitTest. We will add
			// stroke padding on top if stroke is defined.
			tolerancePadding = options._tolerancePadding,
			strokePadding = tolerancePadding,
			join, cap, miterLimit,
			area, loc, res,
			hasStroke = options.stroke && style.hasStroke(),
			hasFill = options.fill && style.hasFill(),
			radius = hasStroke ? style.getStrokeWidth() / 2
					// Set radius to 0 so when we're hit-testing, the tolerance
					// is used for fill too, through stroke functionality.
					: hasFill ? 0 : null;
		if (radius != null) {
			if (radius > 0) {
				join = style.getStrokeJoin();
				cap = style.getStrokeCap();
				miterLimit = radius * style.getMiterLimit();
				// Add the stroke radius to tolerance padding.
				strokePadding = tolerancePadding.add(new Point(radius, radius));
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

		function addAreaPoint(point) {
			area.add(point);
		}

		function checkSegmentStroke(segment) {
			// Handle joins / caps that are not round specificelly, by
			// hit-testing their polygon areas.
			if (join !== 'round' || cap !== 'round') {
				// Create an 'internal' path without id and outside the DOM
				// to run the hit-test on it.
				area = new Path({ internal: true, closed: true });
				if (closed || segment._index > 0
						&& segment._index < segments.length - 1) {
					// It's a join. See that it's not a round one (one of
					// the handles has to be zero too for this!)
					if (join !== 'round' && (segment._handleIn.isZero() 
							|| segment._handleOut.isZero()))
						Path._addSquareJoin(segment, join, radius, miterLimit,
								addAreaPoint, true);
				} else if (cap !== 'round') {
					// It's a cap
					Path._addSquareCap(segment, cap, radius, addAreaPoint, true);
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
			// Fallback scenario is a round join / cap.
			return isCloseEnough(segment._point, strokePadding);
		}

		// If we're asked to query for segments, ends or handles, do all that
		// before stroke or fill.
		if (options.ends && !options.segments && !closed) {
			if (res = checkSegmentPoints(segments[0], true)
					|| checkSegmentPoints(segments[segments.length - 1], true))
				return res;
		} else if (options.segments || options.handles) {
			for (var i = 0, l = segments.length; i < l; i++)
				if (res = checkSegmentPoints(segments[i]))
					return res;
		}
		// If we're querying for stroke, perform that before fill
		if (radius != null) {
			loc = this.getNearestLocation(point);
			if (loc) {
				// Now see if we're on a segment, and if so, check for its
				// stroke join / cap first. If not, do a normal radius check
				// for round strokes.
				var parameter = loc.getParameter();
				if (parameter === 0 || parameter === 1) {
					if (!checkSegmentStroke(loc.getSegment()))
						loc = null;
				} else  if (!isCloseEnough(loc.getPoint(), strokePadding)) {
					loc = null;
				}
			}
			// If we have miter joins, we may not be done yet, since they can be
			// longer than the radius. Check for each segment within reach now.
			if (!loc && join === 'miter') {
				for (var i = 0, l = segments.length; i < l; i++) {
					var segment = segments[i];
					if (point.getDistance(segment._point) <= miterLimit
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
		return !loc && hasFill && this._contains(point) || loc && !hasStroke
				? new HitResult('fill', this)
				: loc
					? new HitResult('stroke', this, {
						location: loc,
						// It's fine performance wise to call getPoint() again
						// since it was already called before.
						point: loc.getPoint()
					})
					: null;
	}

	// TODO: intersects(item)
	// TODO: contains(item)
	// TODO: intersect(item)
	// TODO: unite(item)
	// TODO: exclude(item)
}, new function() { // Scope for drawing

	// Note that in the code below we're often accessing _x and _y on point
	// objects that were read from segments. This is because the SegmentPoint
	// class overrides the plain x / y properties with getter / setters and
	// stores the values in these private properties internally. To avoid
	// calling of getter functions all the time we directly access these private
	// properties here. The distinction between normal Point objects and
	// SegmentPoint objects maybe seem a bit tedious but is worth the benefit in
	// performance.

	function drawHandles(ctx, segments, matrix, size) {
		var half = size / 2;

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

		var coords = new Array(6);
		for (var i = 0, l = segments.length; i < l; i++) {
			var segment = segments[i];
			segment._transformCoordinates(matrix, coords, false);
			var state = segment._selectionState,
				pX = coords[0],
				pY = coords[1];
			if (state & /*#=*/ SelectionState.HANDLE_IN)
				drawHandle(2);
			if (state & /*#=*/ SelectionState.HANDLE_OUT)
				drawHandle(4);
			// Draw a rectangle at segment.point:
			ctx.save();
			ctx.beginPath();
			ctx.rect(pX - half, pY - half, size, size);
			ctx.fill();
			// If the point is not selected, draw a white square that is 1 px
			// smaller on all sides:
			if (!(state & /*#=*/ SelectionState.POINT)) {
				ctx.beginPath();
				ctx.rect(pX - half + 1, pY - half + 1, size - 2, size - 2);
				ctx.fillStyle = '#ffffff';
				ctx.fill();
			}
			ctx.restore();
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

		function drawSegment(i) {
			var segment = segments[i];
			// Optimise code when no matrix is provided by accessing semgent
			// points hand handles directly, since this is the default when
			// drawing paths. Matrix is only used for drawing selections.
			if (matrix) {
				segment._transformCoordinates(matrix, coords, false);
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
				if (inX == curX && inY == curY && outX == prevX && outY == prevY) {
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
			drawSegment(i);
		// Close path by drawing first segment again
		if (path._closed && length > 0)
			drawSegment(0);
	}

	return {
		_draw: function(ctx, param) {
			var clip = param.clip,
				// Also mark this Path as _compound so _changed() knows about it
				compound = this._compound = param.compound;
			if (!compound)
				ctx.beginPath();

			var style = this.getStyle(),
				hasFill = style.hasFill(),
				hasStroke = style.hasStroke(),
				dashArray = style.getDashArray(),
				// dashLength is only set if we can't draw dashes natively
				dashLength = !paper.support.nativeDash && hasStroke
						&& dashArray && dashArray.length;

			function getOffset(i) {
				// Negative modulo is necessary since we're stepping back 
				// in the dash sequence first.
				return dashArray[((i % dashLength) + dashLength) % dashLength];
			}

			if (this._currentPath) {
				ctx.currentPath = this._currentPath;
			} else if (hasFill || hasStroke && !dashLength || compound || clip){
				// Prepare the canvas path if we have any situation that
				// requires it to be defined.
				drawSegments(ctx, this);
				if (this._closed)
					ctx.closePath();
				// CompoundPath collects its own _currentPath
				if (!compound)
					this._currentPath = ctx.currentPath;
			}

			if (!clip && !compound && (hasFill || hasStroke)) {
				// If the path is part of a compound path or doesn't have a fill
				// or stroke, there is no need to continue.
				this._setStyles(ctx);
				if (hasFill) {
					ctx.fill(style.getWindingRule());
					// If shadowColor is defined, clear it after fill, so it
					// won't be applied to both fill and stroke. If the path is
					// only stroked, we don't have to clear it.
					ctx.shadowColor = 'rgba(0,0,0,0)';
				}
				if (hasStroke) {
					if (dashLength) {
						// We cannot use the path created by drawSegments above
						// Use CurveFlatteners to draw dashed paths:
						// NOTE: We don't cache this path in another currentPath
						// since browsers that support currentPath also support
						// native dashes.
						ctx.beginPath();
						var flattener = new PathFlattener(this),
							length = flattener.length,
							from = -style.getDashOffset(), to,
							i = 0;
						from = from % length;
						// Step backwards in the dash sequence first until the
						// from parameter is below 0.
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
			drawHandles(ctx, this._segments, matrix,
					this._project.options.handleSize || 4);
		}
	};
}, new function() { // Path Smoothing

	/**
	 * Solves a tri-diagonal system for one of coordinates (x or y) of first
	 * bezier control points.
	 *
	 * @param rhs right hand side vector.
	 * @return Solution vector.
	 */
	function getFirstControlPoints(rhs) {
		var n = rhs.length,
			x = [], // Solution vector.
			tmp = [], // Temporary workspace.
			b = 2;
		x[0] = rhs[0] / b;
		// Decomposition and forward substitution.
		for (var i = 1; i < n; i++) {
			tmp[i] = 1 / b;
			b = (i < n - 1 ? 4 : 2) - tmp[i];
			x[i] = (rhs[i] - x[i - 1]) / b;
		}
		// Back-substitution.
		for (var i = 1; i < n; i++) {
			x[n - i - 1] -= tmp[n - i] * x[n - i];
		}
		return x;
	}

	return {
		// Note: Documentation for smooth() is in PathItem
		smooth: function() {
			// This code is based on the work by Oleg V. Polikarpotchkin,
			// http://ov-p.spaces.live.com/blog/cns!39D56F0C7A08D703!147.entry
			// It was extended to support closed paths by averaging overlapping
			// beginnings and ends. The result of this approach is very close to
			// Polikarpotchkin's closed curve solution, but reuses the same
			// algorithm as for open paths, and is probably executing faster as
			// well, so it is preferred.
			var segments = this._segments,
				size = segments.length,
				closed = this._closed,
				n = size,
				// Add overlapping ends for averaging handles in closed paths
				overlap = 0;
			if (size <= 2)
				return;
			if (closed) {
				// Overlap up to 4 points since averaging beziers affect the 4
				// neighboring points
				overlap = Math.min(size, 4);
				n += Math.min(size, overlap) * 2;
			}
			var knots = [];
			for (var i = 0; i < size; i++)
				knots[i + overlap] = segments[i]._point;
			if (closed) {
				// If we're averaging, add the 4 last points again at the
				// beginning, and the 4 first ones at the end.
				for (var i = 0; i < overlap; i++) {
					knots[i] = segments[i + size - overlap]._point;
					knots[i + size + overlap] = segments[i]._point;
				}
			} else {
				n--;
			}
			// Calculate first Bezier control points
			// Right hand side vector
			var rhs = [];

			// Set right hand side X values
			for (var i = 1; i < n - 1; i++)
				rhs[i] = 4 * knots[i]._x + 2 * knots[i + 1]._x;
			rhs[0] = knots[0]._x + 2 * knots[1]._x;
			rhs[n - 1] = 3 * knots[n - 1]._x;
			// Get first control points X-values
			var x = getFirstControlPoints(rhs);

			// Set right hand side Y values
			for (var i = 1; i < n - 1; i++)
				rhs[i] = 4 * knots[i]._y + 2 * knots[i + 1]._y;
			rhs[0] = knots[0]._y + 2 * knots[1]._y;
			rhs[n - 1] = 3 * knots[n - 1]._y;
			// Get first control points Y-values
			var y = getFirstControlPoints(rhs);

			if (closed) {
				// Do the actual averaging simply by linearly fading between the
				// overlapping values.
				for (var i = 0, j = size; i < overlap; i++, j++) {
					var f1 = i / overlap,
						f2 = 1 - f1,
						ie = i + overlap,
						je = j + overlap;
					// Beginning
					x[j] = x[i] * f1 + x[j] * f2;
					y[j] = y[i] * f1 + y[j] * f2;
					// End
					x[je] = x[ie] * f2 + x[je] * f1;
					y[je] = y[ie] * f2 + y[je] * f1;
				}
				n--;
			}
			var handleIn = null;
			// Now set the calculated handles
			for (var i = overlap; i <= n - overlap; i++) {
				var segment = segments[i - overlap];
				if (handleIn)
					segment.setHandleIn(handleIn.subtract(segment._point));
				if (i < n) {
					segment.setHandleOut(
							new Point(x[i], y[i]).subtract(segment._point));
					handleIn = i < n - 1
							? new Point(
								2 * knots[i + 1]._x - x[i + 1],
								2 * knots[i + 1]._y - y[i + 1])
							: new Point(
								(knots[n]._x + x[n - 1]) / 2,
								(knots[n]._y + y[n - 1]) / 2);
				}
			}
			if (closed && handleIn) {
				var segment = this._segments[0];
				segment.setHandleIn(handleIn.subtract(segment._point));
			}
		}
	};
}, new function() { // PostScript-style drawing commands
	/**
	 * Helper method that returns the current segment and checks if a moveTo()
	 * command is required first.
	 */
	function getCurrentSegment(that) {
		var segments = that._segments;
		if (segments.length == 0)
			throw new Error('Use a moveTo() command first');
		return segments[segments.length - 1];
	}

	return {
		// Note: Documentation for these methods is found in PathItem, as they
		// are considered abstract methods of PathItem and need to be defined in
		// all implementing classes.
		moveTo: function(/* point */) {
			// moveTo should only be called at the beginning of paths. But it 
			// can ce called again if there is nothing drawn yet, in which case
			// the first segment gets readjusted.
			if (this._segments.length === 1)
				this.removeSegment(0);
			// Let's not be picky about calling moveTo() when not at the
			// beginning of a path, just bail out:
			if (!this._segments.length)
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
			var handle1 = Point.read(arguments),
				handle2 = Point.read(arguments),
				to = Point.read(arguments),
				// First modify the current segment:
				current = getCurrentSegment(this);
			// Convert to relative values:
			current.setHandleOut(handle1.subtract(current._point));
			// And add the new segment, with handleIn set to c2
			this._add([ new Segment(to, handle2.subtract(to)) ]);
		},

		quadraticCurveTo: function(/* handle, to */) {
			var handle = Point.read(arguments),
				to = Point.read(arguments),
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

		curveTo: function(/* through, to, parameter */) {
			var through = Point.read(arguments),
				to = Point.read(arguments),
				t = Base.pick(Base.read(arguments), 0.5),
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

		arcTo: function(/* to, clockwise | through, to */) {
			// Get the start point:
			var current = getCurrentSegment(this),
				from = current._point,
				through,
				to = Point.read(arguments),
				// Peek at next value to see if it's clockwise,
				// with true as default value.
				clockwise = Base.pick(Base.peek(arguments), true);
			if (typeof clockwise === 'boolean') {
				// arcTo(to, clockwise)
				var middle = from.add(to).divide(2),
				through = middle.add(middle.subtract(from).rotate(
						clockwise ? -90 : 90));
			} else {
				// arcTo(through, to)
				through = to;
				to = Point.read(arguments);
			}
			// Construct the two perpendicular middle lines to (from, through)
			// and (through, to), and intersect them to get the center
			var l1 = new Line(from.add(through).divide(2),
						through.subtract(from).rotate(90), true),
				l2 = new Line(through.add(to).divide(2),
						to.subtract(through).rotate(90), true),
				center = l1.intersect(l2, true),
				line = new Line(from, to),
				throughSide = line.getSide(through);
			if (!center) {
				// If the two lines are colinear, there cannot be an arc as the
				// circle is infinitely big and has no center point. If side is
				// 0, the connecting arc line of this huge circle is a line
				// between the two points, so we can use #lineTo instead.
				// Otherwise we bail out:
				if (!throughSide)
					return this.lineTo(to);
				throw new Error('Cannot put an arc through the given points: '
					+ [from, through, to]);
			}
			var vector = from.subtract(center),
				extent = vector.getDirectedAngle(to.subtract(center)),
				centerSide = line.getSide(center);
			if (centerSide == 0) {
				// If the center is lying on the line, we might have gotten the
				// wrong sign for extent above. Use the sign of the side of the
				// through point.
				extent = throughSide * Math.abs(extent);
			} else if (throughSide == centerSide) {
				// If the center is on the same side of the line (from, to) as
				// the through point, we're extending bellow 180 degrees and
				// need to adapt extent.
				extent -= 360 * (extent < 0 ? -1 : 1);
			}
			var ext = Math.abs(extent),
				count =  ext >= 360 ? 4 : Math.ceil(ext / 90),
				inc = extent / count,
				half = inc * Math.PI / 360,
				z = 4 / 3 * Math.sin(half) / (1 + Math.cos(half)),
				segments = [];
			for (var i = 0; i <= count; i++) {
				// Explicitely use to point for last segment, since depending
				// on values the calculation adds imprecision:
				var pt = i < count ? center.add(vector) : to;
				var out = i < count ? vector.rotate(90).multiply(z) : null;
				if (i == 0) {
					// Modify startSegment
					current.setHandleOut(out);
				} else {
					// Add new Segment
					segments.push(
						new Segment(pt, vector.rotate(-90).multiply(z), out));
				}
				vector = vector.rotate(inc);
			}
			// Add all segments at once at the end for higher performance
			this._add(segments);
		},

		lineBy: function(/* to */) {
			var to = Point.read(arguments),
				current = getCurrentSegment(this)._point;
			this.lineTo(current.add(to));
		},

		curveBy: function(/* through, to, parameter */) {
			var through = Point.read(arguments),
				to = Point.read(arguments),
				parameter = Base.read(arguments),
				current = getCurrentSegment(this)._point;
			this.curveTo(current.add(through), current.add(to), parameter);
		},

		cubicCurveBy: function(/* handle1, handle2, to */) {
			var handle1 = Point.read(arguments),
				handle2 = Point.read(arguments),
				to = Point.read(arguments),
				current = getCurrentSegment(this)._point;
			this.cubicCurveTo(current.add(handle1), current.add(handle2),
					current.add(to));
		},

		quadraticCurveBy: function(/* handle, to */) {
			var handle = Point.read(arguments),
				to = Point.read(arguments),
				current = getCurrentSegment(this)._point;
			this.quadraticCurveTo(current.add(handle), current.add(to));
		},

		arcBy: function(/* to, clockwise | through, to */) {
			var current = getCurrentSegment(this)._point,
				point = current.add(Point.read(arguments)),
				// Peek at next value to see if it's clockwise, with true as
				// default value.
				clockwise = Base.pick(Base.peek(arguments), true);
			if (typeof clockwise === 'boolean') {
				this.arcTo(point, clockwise);
			} else {
				this.arcTo(point, current.add(Point.read(arguments)));
			}
		},

		closePath: function() {
			var first = this.getFirstSegment(),
				last = this.getLastSegment();
			if (first._point.equals(last._point)) {
				first.setHandleIn(last._handleIn);
				last.remove();
			}
			this.setClosed(true);
		}
	};
}, {  // A dedicated scope for the tricky bounds calculations
	// We define all the different getBounds functions as static methods on Path
	// and have #_getBounds directly access these. All static bounds functions
	// below have the same first four parameters: segments, closed, style,
	// matrix, so they can be called from #_getBounds() and also be used in
	// Curve. But not all of them use all these parameters, and some define
	// additional ones after.

	_getBounds: function(getter, matrix) {
		// See #draw() for an explanation of why we can access _style
		// properties directly here:
		return Path[getter](this._segments, this._closed, this.getStyle(),
				matrix);
	},

// Mess with indentation in order to get more line-space below:
statics: {
	/**
	 * Determines whether the segments describe a path in clockwise or counter-
	 * clockwise orientation.
	 *
	 * @private
	 */
	isClockwise: function(segments) {
		var sum = 0;
		// Method derived from:
		// http://stackoverflow.com/questions/1165647
		// We treat the curve points and handles as the outline of a polygon of
		// which we determine the orientation using the method of calculating
		// the sum over the edges. This will work even with non-convex polygons,
		// telling you whether it's mostly clockwise
		// TODO: Check if this works correctly for all open paths.
		for (var i = 0, l = segments.length; i < l; i++) {
			var v = Curve.getValues(
					segments[i], segments[i + 1 < l ? i + 1 : 0]);
			for (var j = 2; j < 8; j += 2)
				sum += (v[j - 2] - v[j]) * (v[j + 1] + v[j - 1]);
		}
		return sum > 0;
	},

	/**
	 * Returns the bounding rectangle of the item excluding stroke width.
	 *
	 * @private
	 */
	getBounds: function(segments, closed, style, matrix, strokePadding) {
		var first = segments[0];
		// If there are no segments, return "empty" rectangle, just like groups,
		// since #bounds is assumed to never return null.
		if (!first)
			return new Rectangle();
		var coords = new Array(6),
			// Make coordinates for first segment available in prevCoords.
			prevCoords = first._transformCoordinates(matrix, new Array(6), false),
			min = prevCoords.slice(0, 2), // Start with values of first point
			max = min.slice(), // clone
			roots = new Array(2);

		function processSegment(segment) {
			segment._transformCoordinates(matrix, coords, false);
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
	getStrokeBounds: function(segments, closed, style, matrix) {
		// TODO: Find a way to reuse 'bounds' cache instead?
		if (!style.hasStroke())
			return Path.getBounds(segments, closed, style, matrix);
		var length = segments.length - (closed ? 0 : 1),
			radius = style.getStrokeWidth() / 2,
			padding = Path._getPenPadding(radius, matrix),
			bounds = Path.getBounds(segments, closed, style, matrix, padding),
			join = style.getStrokeJoin(),
			cap = style.getStrokeCap(),
			miterLimit = radius * style.getMiterLimit();
		// Create a rectangle of padding size, used for union with bounds
		// further down
		var joinBounds = new Rectangle(new Size(padding).multiply(2));

		function add(point) {
			bounds = bounds.include(matrix
				? matrix._transformPoint(point, point) : point);
		}

		function addJoin(segment, join) {
			// When both handles are set in a segment, the join setting is
			// ignored and round is always used.
			if (join === 'round' || !segment._handleIn.isZero()
					&& !segment._handleOut.isZero()) {
				bounds = bounds.unite(joinBounds.setCenter(matrix
					? matrix._transformPoint(segment._point) : segment._point));
			} else {
				Path._addSquareJoin(segment, join, radius, miterLimit, add);
			}
		}

		function addCap(segment, cap) {
			if (cap === 'round') {
				addJoin(segment, cap);
			} else {
				Path._addSquareCap(segment, cap, radius, add); 
			}
		}

		for (var i = 1; i < length; i++)
			addJoin(segments[i], join);
		if (closed) {
			addJoin(segments[0], join);
		} else if (length > 0) {
			addCap(segments[0], cap);
			addCap(segments[segments.length - 1], cap);
		}
		return bounds;
	},

	/**
	 * Returns the horizontal and vertical padding that a transformed round
	 * stroke adds to the bounding box, by calculating the dimensions of a
	 * rotated ellipse.
	 */
	_getPenPadding: function(radius, matrix) {
		if (!matrix)
			return [radius, radius];
		// If a matrix is provided, we need to rotate the stroke circle
		// and calculate the bounding box of the resulting rotated elipse:
		// Get rotated hor and ver vectors, and determine rotation angle
		// and elipse values from them:
		var mx = matrix.shiftless(),
			hor = mx.transform(new Point(radius, 0)),
			ver = mx.transform(new Point(0, radius)),
			phi = hor.getAngleInRadians(),
			a = hor.getLength(),
			b = ver.getLength();
		// Formula for rotated ellipses:
		// x = cx + a*cos(t)*cos(phi) - b*sin(t)*sin(phi)
		// y = cy + b*sin(t)*cos(phi) + a*cos(t)*sin(phi)
		// Derivates (by Wolfram Alpha):
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
			tx = -Math.atan(b * tan / a),
			ty = Math.atan(b / (tan * a));
		// Due to symetry, we don't need to cycle through pi * n solutions:
		return [Math.abs(a * Math.cos(tx) * cos - b * Math.sin(tx) * sin),
				Math.abs(b * Math.sin(ty) * cos + a * Math.cos(ty) * sin)];
	},

	_addSquareJoin: function(segment, join, radius, miterLimit, addPoint, area) {
		// Treat bevel and miter in one go, since they share a lot of code.
		var curve2 = segment.getCurve(),
			curve1 = curve2.getPrevious(),
			point = curve2.getPointAt(0, true),
			normal1 = curve1.getNormalAt(1, true),
			normal2 = curve2.getNormalAt(0, true),
			step = normal1.getDirectedAngle(normal2) < 0 ? -radius : radius;
		normal1.setLength(step);
		normal2.setLength(step);
		if (area) {
			addPoint(point);
			addPoint(point.add(normal1));
		}
		if (join === 'miter') {
			// Intersect the two lines
			var corner = new Line(
					point.add(normal1),
					new Point(-normal1.y, normal1.x), true
				).intersect(new Line(
					point.add(normal2),
					new Point(-normal2.y, normal2.x), true
				), true);
			// See if we actually get a bevel point and if its distance is below
			// the miterLimit. If not, make a normal bevel.
			if (corner && point.getDistance(corner) <= miterLimit) {
				addPoint(corner);
				if (!area)
					return;
			}
		}
		// Produce a normal bevel
		if (!area)
			addPoint(point.add(normal1));
		addPoint(point.add(normal2));
	},

	_addSquareCap: function(segment, cap, radius, addPoint, area) {
		// Calculate the corner points of butt and square caps
		var point = segment._point,
			loc = segment.getLocation(),
			normal = loc.getNormal().normalize(radius);
		if (area) {
			addPoint(point.subtract(normal));
			addPoint(point.add(normal));
		}
		// For square caps, we need to step away from point in the direction of
		// the tangent, which is the rotated normal.
		// Checking loc.getParameter() for 0 is to see whether this is the first
		// or the last segment of the open path, in order to determine in which
		// direction to move the point.
		if (cap === 'square')
			point = point.add(normal.rotate(loc.getParameter() == 0 ? -90 : 90));
		addPoint(point.add(normal));
		addPoint(point.subtract(normal));
	},

	/**
	 * Returns the bounding rectangle of the item including handles.
	 *
	 * @private
	 */
	getHandleBounds: function(segments, closed, style, matrix, strokePadding,
			joinPadding) {
		var coords = new Array(6),
			x1 = Infinity,
			x2 = -x1,
			y1 = x1,
			y2 = x2;
		for (var i = 0, l = segments.length; i < l; i++) {
			var segment = segments[i];
			segment._transformCoordinates(matrix, coords, false);
			for (var j = 0; j < 6; j += 2) {
				// Use different padding for points or handles
				var padding = j == 0 ? joinPadding : strokePadding,
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
	},

	/**
	 * Returns the rough bounding rectangle of the item that is sure to include
	 * all of the drawing, including stroke width.
	 *
	 * @private
	 */
	getRoughBounds: function(segments, closed, style, matrix) {
		// Delegate to handleBounds, but pass on radius values for stroke and
		// joins. Hanlde miter joins specially, by passing the largets radius
		// possible.
		var strokeRadius = style.hasStroke() ? style.getStrokeWidth() / 2 : 0,
			joinRadius = strokeRadius;
		if (strokeRadius > 0) {
			if (style.getStrokeJoin() === 'miter')
				joinRadius = strokeRadius * style.getMiterLimit();
			if (style.getStrokeCap() === 'square')
				joinRadius = Math.max(joinRadius, strokeRadius * Math.sqrt(2));
		}
		return Path.getHandleBounds(segments, closed, style, matrix,
				Path._getPenPadding(strokeRadius, matrix),
				Path._getPenPadding(joinRadius, matrix));
	}
}});
