/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * All rights reserved.
 */

var Path = this.Path = PathItem.extend({
	/** @lends Path# */

	beans: true,

	/**
	 * Creates a new Path item and places it at the top of the active layer.
	 * 
	 * @param {Segment[]} [segments] An optional array of segments (or points to be
	 * converted to segments) that will be added to the path.
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
	 * 
	 * @class The Path item represents a path in a Paper.js project.
	 * @extends PathItem
	 * @extends Item
	 * @constructs Path
	 */
	initialize: function(segments) {
		this.base();
		this._closed = false;
		this._selectedSegmentCount = 0;
		// Support both passing of segments as array or arguments
		// If it is an array, it can also be a description of a point, so
		// check its first entry for object as well
		this.setSegments(!segments || !Array.isArray(segments)
				|| typeof segments[0] !== 'object' ? arguments : segments);
	},

	clone: function() {
		var copy = this._clone(new Path(this._segments));
		copy._closed = this._closed;
		if (this._clockwise !== undefined)
			copy._clockwise = this._clockwise;
		return copy;
	},

	_changed: function(flags) {
		if (flags & ChangeFlags.GEOMETRY) {
			delete this._length;
			delete this._bounds;
			delete this._position;
			delete this._strokeBounds;
			// Clockwise state becomes undefined as soon as geometry changes.
			delete this._clockwise;
		} else if (flags & ChangeFlags.STROKE) {
			delete this._strokeBounds;
		}
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
		if (!this._segments) {
			this._segments = [];
		} else {
			this.setSelected(false);
			this._segments.length = 0;
			// Make sure new curves are calculated next time we call getCurves()
			if (this._curves)
				delete this._curves;
		}
		this._add(Segment.readAll(segments));
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
		if (!this._curves) {
			var segments = this._segments,
				length = segments.length;
			// Reduce length by one if it's an open path:
			if (!this._closed && length > 0)
				length--;
			this._curves = new Array(length);
			for (var i = 0; i < length; i++)
				this._curves[i] = Curve.create(this, segments[i],
					// Use first segment for segment2 of closing curve
					segments[i + 1] || segments[0]);
		}
		return this._curves;
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
	getClosed: function() {
		return this._closed;
	},

	setClosed: function(closed) {
		// On-the-fly conversion to boolean:
		if (this._closed != (closed = !!closed)) {
			this._closed = closed;
			// Update _curves length
			if (this._curves) {
				var length = this._segments.length,
					i;
				// Reduce length by one if it's an open path:
				if (!closed && length > 0)
					length--;
				this._curves.length = length;
				// If we were closing this path, we need to add a new curve now
				if (closed)
					this._curves[i = length - 1] = Curve.create(this,
						this._segments[i], this._segments[0]);
			}
			this._changed(ChangeFlags.GEOMETRY);
		}
	},

	// TODO: Consider adding getSubPath(a, b), returning a part of the current
	// path, with the added benefit that b can be < a, and closed looping is
	// taken into account.

	_transform: function(matrix, flags) {
		if (!matrix.isIdentity()) {
			var coords = new Array(6);
			for (var i = 0, l = this._segments.length; i < l; i++) {
				this._segments[i]._transformCoordinates(matrix, coords, true);
			}
			var fillColor = this.getFillColor(),
				strokeColor = this.getStrokeColor();
			if (fillColor && fillColor.transform)
				fillColor.transform(matrix);
			if (strokeColor && strokeColor.transform)
				strokeColor.transform(matrix);
		}
		this._changed(ChangeFlags.GEOMETRY);
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
			if (segment._path) {
				segment = segs[i] = new Segment(segment);
			}
			segment._path = this;
			segment._index = index + i;
			// If parts of this segment are selected, adjust the internal
			// _selectedSegmentCount now
			if (segment._selectionState)
				this._updateSelection(segment);
		}
		if (append) {
			// Append them all at the end by using push
			segments.push.apply(segments, segs);
		} else {
			// Insert somewhere else
			segments.splice.apply(segments, [index, 0].concat(segs));
			// Adjust the indices of the segments above.
			for (var i = index + amount, l = segments.length; i < l; i++) {
				segments[i]._index = i;
			}
		}
		// Keep the curves list in sync all the time in case it as requested
		// already. We need to step one index down from the inserted segment to
		// get its curve:
		if (curves && --index >= 0) {
			// Insert a new curve as well and update the curves above
			curves.splice(index, 0, Curve.create(this, segments[index],
				segments[index + 1]));
			// Adjust segment1 now for the curves above the inserted one
			var curve = curves[index + amount];
			if (curve) {
				curve._segment1 = segments[index + amount];
			}
		}
		this._changed(ChangeFlags.GEOMETRY);
		return segs;
	},

	_updateSelection: function(segment) {
		var count = this._selectedSegmentCount +=
				segment._selectionState ? 1 : -1;
		if (count <= 1)
			this._project._selectItem(this, count == 1);
	},

	// PORT: Add support for adding multiple segments at once to Scriptographer
	// DOCS: find a way to document the variable segment parameters of Path#add
	/**
	 * Adds one or more segments to the end of the {@link #segments} array of
	 * this path.
	 * 
	 * @param {Segment|Point} segment the segment or point to be added.
	 * @return {Segment} the added segment. This is not necessarily the same
	 * object, e.g. if the segment to be added already belongs to another path.
	 * @operator none
	 * 
	 * @example {@paperscript}
	 * // Adding segments to a path using point objects:
	 * var path = new Path();
	 * path.strokeColor = 'black';
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
	 * var path = new Path();
	 * path.strokeColor = 'black';
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
	 * var path = new Path();
	 * path.strokeColor = 'black';
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
	 * var path = new Path();
	 * path.strokeColor = 'black';
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

	// PORT: Add support for adding multiple segments at once to Scriptographer
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

	// PORT: Add to Scriptographer
	addSegment: function(segment) {
		return this._add([ Segment.read(arguments) ])[0];
	},

	// PORT: Add to Scriptographer
	insertSegment: function(index, segment) {
		return this._add([ Segment.read(arguments, 1) ], index)[0];
	},

	// PORT: Add to Scriptographer
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
	 * var path = new Path();
	 * path.strokeColor = 'black';
	 * var points = [new Point(30, 50), new Point(170, 50)];
	 * path.addSegments(points);
	 * 
	 * @example {@paperscript}
	 * // Adding an array of [x, y] arrays:
	 * var path = new Path();
	 * path.strokeColor = 'black';
	 * var array = [[30, 75], [100, 20], [170, 75]];
	 * path.addSegments(array);
	 * 
	 * @example {@paperscript}
	 * // Adding segments from one path to another:
	 * 
	 * var path = new Path();
	 * path.strokeColor = 'black';
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

	// PORT: Add to Scriptographer
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

	// PORT: Add to Scriptographer
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
	 * var path = new Path.Circle(new Point(80, 50), 35);
	 * path.strokeColor = 'black';
	 * 
	 * // Remove its second segment:
	 * path.removeSegment(1);
	 * 
	 * // Select the path, so we can see its segments:
	 * path.selected = true;
	 */
	removeSegment: function(index) {
		var segments = this.removeSegments(index, index + 1);
		return segments[0] || null;
	},
	
	// PORT: Add to Scriptographer
	/**
	 * Removes the segments from the specified 'from' index to the specified
	 * 'to' index from the path's {@link #segments} array.
	 * 
	 * @param {Number} from
	 * @param {Number} to
	 * @return {Array} an array containing the removed segments.
	 * 
	 * @example {@paperscript}
	 * // Removing segments from a path:
	 * 
	 * // Create a circle shaped path at { x: 80, y: 50 }
	 * // with a radius of 35:
	 * var path = new Path.Circle(new Point(80, 50), 35);
	 * path.strokeColor = 'black';
	 * 
	 * // Remove the segments from index 1 till index 2:
	 * path.removeSegments(1, 2);
	 * 
	 * // Select the path, so we can see its segments:
	 * path.selected = true;
	 */
	removeSegments: function(from, to) {
		from = from || 0;
	 	to = Base.pick(to, this._segments.length - 1);
		var segments = this._segments,
			curves = this._curves,
			last = to >= segments.length,
			removed = segments.splice(from, to - from),
			amount = removed.length;
		if (!amount)
			return removed;
		// Update selection state accordingly
		for (var i = 0; i < amount; i++) {
			var segment = removed[i];
			if (segment._selectionState) {
				segment._selectionState = 0;
				this._updateSelection(segment);
			}
			// Clear the indices and path references of the removed segments
			removed._index = removed._path = undefined;
		}
		// Adjust the indices of the segments above.
		for (var i = from, l = segments.length; i < l; i++)
			segments[i]._index = i;
		// Keep curves in sync
		if (curves) {
			curves.splice(from, amount);
			// Adjust segments for the curves before and after the removed ones
			var curve;
			if (curve = curves[from - 1])
				curve._segment2 = segments[from];
			if (curve = curves[from])
				curve._segment1 = segments[from];
			// If the last segment of a closing path was removed, we need to
			// readjust the last curve of the list now.
			if (last && this._closed && (curve = curves[curves.length - 1]))
				curve._segment2 = segments[0];
		}
		this._changed(ChangeFlags.GEOMETRY);
		return removed;
	},

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
	 * var path = new Path.Circle(new Size(80, 50), 35);
	 * path.selected = true; // Select the path
	 * 
	 * @example {@paperscript}
	 * // A path is selected, if one or more of its segments is selected:
	 * var path = new Path.Circle(new Size(80, 50), 35);
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
	isSelected: function() {
		return this._selectedSegmentCount > 0;
	},
	
	setSelected: function(selected) {
		var wasSelected = this.isSelected(),
			length = this._segments.length;
		if (!wasSelected != !selected && length)
			this._project._selectItem(this, selected);
		this._selectedSegmentCount = selected ? length : 0;
		for (var i = 0; i < length; i++)
			this._segments[i]._selectionState = selected
					? SelectionState.POINT : 0;
	},

	/**
	 * Specifies whether all segments of the path are selected.
	 * 
	 * @type Boolean
	 * @bean
	 * 
	 * @example {@paperscript}
	 * // A path is fully selected, if all of its segments are selected:
	 * var path = new Path.Circle(new Size(80, 50), 35);
	 * path.selected = true;
	 * 
	 * var path2 = new Path.Circle(new Size(180, 50), 35);
	 * path2.selected = true;
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
		return this._selectedSegmentCount == this._segments.length;
	},

	setFullySelected: function(selected) {
		this.setSelected(selected);
	},

	/**
	 * Converts the curves in the path to straight lines.
	 * 
	 * @param {Number} maxDistance the maximum distance between the points
	 * 
	 * @example {@paperscript}
	 * // Straightening the curves of a circle:
	 * 
	 * // Create a circle shaped path at { x: 80, y: 50 }
	 * // with a radius of 35:
	 * var path = new Path.Circle(new Size(80, 50), 35);
	 * 
	 * // Select the path, so we can inspect its segments:
	 * path.selected = true;
	 * 
	 * // Create a copy of the path and move it 150 points to the right:
	 * var copy = path.clone();
	 * copy.position.x += 150;
	 * 
	 * // Convert its curves to points, with a max distance of 20:
	 * copy.curvesToPoints(20);
	 * 
	 * // Select the copy, so we can inspect its segments:
	 * copy.selected = true;
	 */
	curvesToPoints: function(maxDistance) {
		var flattener = new PathFlattener(this),
			pos = 0,
			// Adapt step = maxDistance so the points distribute evenly.
			step = flattener.length / Math.ceil(flattener.length / maxDistance),
			// Add half of step to end, so imprecisions are ok too.
			end = flattener.length + step / 2;
		// Iterate over path and evaluate and add points at given offsets
		var segments = [];
		while (pos <= end) {
			segments.push(new Segment(flattener.evaluate(pos, 0)));
			pos += step;
		}
		this.setSegments(segments);
	},

	pointsToCurves: function(tolerance) {
		var fitter = new PathFitter(this, tolerance || 2.5);
		this.setSegments(fitter.fit());
	},

	// TODO: reduceSegments([flatness])
	// TODO: split(offset) / split(location) / split(index[, parameter])

	/**
	 * Specifies whether the path is oriented clock-wise.
	 * 
	 * @type Boolean
	 * @bean
	 */
	isClockwise: function() {
		if (this._clockwise !== undefined)
			return this._clockwise;
		var sum = 0,
			xPre, yPre;
		function edge(x, y) {
			if (xPre !== undefined)
				sum += (xPre - x) * (y + yPre);
			xPre = x;
			yPre = y;
		}
		// Method derived from:
		// http://stackoverflow.com/questions/1165647
		// We treat the curve points and handles as the outline of a polygon of
		// which we determine the orientation using the method of calculating
		// the sum over the edges. This will work even with non-convex polygons,
		// telling you whether it's mostly clockwise
		for (var i = 0, l = this._segments.length; i < l; i++) {
			var seg1 = this._segments[i],
				seg2 = this._segments[i + 1 < l ? i + 1 : 0],
				point1 = seg1._point,
				handle1 = seg1._handleOut,
				handle2 = seg2._handleIn,
				point2 = seg2._point;
			edge(point1._x, point1._y);
			edge(point1._x + handle1._x, point1._y + handle1._y);
			edge(point2._x + handle2._x, point2._y + handle2._y);
			edge(point2._x, point2._y);
		}
		return sum > 0;
	},

	setClockwise: function(clockwise) {
		// On-the-fly conversion to boolean:
		if (this.isClockwise() != (clockwise = !!clockwise)) {
			// Only revers the path if its clockwise orientation is not the same
			// as what it is now demanded to be.
			this.reverse();
			this._clockwise = clockwise;
		}
	},

	/**
	 * Reverses the segments of the path.
	 */
	reverse: function() {
		this._segments.reverse();
		// Reverse the handles:
		for (var i = 0, l = this._segments.length; i < l; i++) {
			var segment = this._segments[i];
			var handleIn = segment._handleIn;
			segment._handleIn = segment._handleOut;
			segment._handleOut = handleIn;
		}
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
	 * var path = new Path([30, 25], [30, 75]);
	 * path.strokeColor = 'black';
	 * 
	 * var path2 = new Path([200, 25], [200, 75]);
	 * path2.strokeColor = 'black';
	 * 
	 * // Join the paths:
	 * path.join(path2);
	 * 
	 * @example {@paperscript}
	 * // Joining two paths that share a point at the start or end of their
	 * // segments array:
	 * var path = new Path([30, 25], [30, 75]);
	 * path.strokeColor = 'black';
	 * 
	 * var path2 = new Path([30, 25], [80, 25]);
	 * path2.strokeColor = 'black';
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
	 * var path = new Path([30, 25], [80, 25], [80, 75]);
	 * path.strokeColor = 'black';
	 * 
	 * var path2 = new Path([30, 25], [30, 75], [80, 75]);
	 * path2.strokeColor = 'black';
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
			var first2 = path.getFirstSegment();
			if (last1._point.equals(first2._point)) {
				last1.setHandleOut(first2._handleOut);
				this._add(segments.slice(1));
			} else {
				var first1 = this.getFirstSegment();
				if (first1._point.equals(first2._point))
					path.reverse();
				last2 = path.getLastSegment();
				if (first1._point.equals(last2._point)) {
					first1.setHandleIn(last2._handleIn);
					// Prepend all segments from path except the last one
					this._add(segments.slice(0, segments.length - 1), 0);
				} else {
					this._add(segments.slice(0));
				}
			}
			path.remove();
			// Close if they touch in both places
			var first1 = this.getFirstSegment();
			last1 = this.getLastSegment();
			if (last1._point.equals(first1._point)) {
				first1.setHandleIn(last1._handleIn);
				last1.remove();
				this.setClosed(true);
			}
			this._changed(ChangeFlags.GEOMETRY);
			return true;
		}
		return false;
	},

	/**
	 * The length of the perimeter of the path.
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

	// TODO: getLocationAt(point, precision)
	// PORT: Rename functions and add new isParameter argument in Scriptographer
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
			return new CurveLocation(curves[index], offset - index);
		}
		for (var i = 0, l = curves.length; i < l; i++) {
			var start = length,
				curve = curves[i];
			length += curve.getLength();
			if (length >= offset) {
				// Found the segment within which the length lies
				return new CurveLocation(curve,
						curve.getParameter(offset - start));
			}
		}
		// It may be that through impreciseness of getLength, that the end
		// of the curves was missed:
		if (offset <= this.getLength())
			return new CurveLocation(curves[curves.length - 1], 1);
		return null;
	},

	// DOCS: improve Path#getPointAt documenation.
	/**
	 * Get the point on the path at the given offset.
	 * 
	 * @param {Number} offset
	 * @param {Boolean} [isParameter=false]
	 * @return {Point} the point at the given offset
	 * 
	 * @example {@paperscript height=150}
	 * // Finding the point on a path at a given offset:
	 * 
	 * // Create an arc shaped path:
	 * var path = new Path();
	 * path.strokeColor = 'black';
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
	 * var circle = new Path.Circle(point, 3);
	 * circle.fillColor = 'red';
	 * 
	 * @example {@paperscript height=150}
	 * // Iterating over the length of a path:
	 * 
	 * // Create an arc shaped path:
	 * var path = new Path();
	 * path.strokeColor = 'black';
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
	 * 	var circle = new Path.Circle(point, 3);
	 * 	circle.fillColor = 'red';
	 * }
	 */
	getPointAt: function(offset, isParameter) {
		var loc = this.getLocationAt(offset, isParameter);
		return loc && loc.getPoint();
	},
	
	/**
	 * Get the tangent to the path at the given offset as a vector
	 * point.
	 * 
	 * @param {Number} offset
	 * @param {Boolean} [isParameter=false]
	 * @return {Point} the tangent vector at the given offset
	 * 
	 * @example {@paperscript height=150}
	 * // Working with the tangent vector at a given offset:
	 * 
	 * // Create an arc shaped path:
	 * var path = new Path();
	 * path.strokeColor = 'black';
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
	 * var path = new Path();
	 * path.strokeColor = 'red';
	 * path.add(point);
	 * path.add(point + tangent);
	 * 
	 * @example {@paperscript height=200}
	 * // Iterating over the length of a path:
	 * 
	 * // Create an arc shaped path:
	 * var path = new Path();
	 * path.strokeColor = 'black';
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
	 * 	var line = new Path();
	 * 	line.strokeColor = 'red';
	 * 	line.add(point);
	 * 	line.add(point + tangent);
	 * }
	 */
	getTangentAt: function(offset, isParameter) {
		var loc = this.getLocationAt(offset, isParameter);
		return loc && loc.getTangent();
	},
	
	/**
	 * Get the normal to the path at the given offset as a vector point.
	 * 
	 * @param {Number} offset
	 * @param {Boolean} [isParameter=false]
	 * @return {Point} the normal vector at the given offset
	 *
	 * @example {@paperscript height=150}
	 * // Working with the normal vector at a given offset:
	 * 
	 * // Create an arc shaped path:
	 * var path = new Path();
	 * path.strokeColor = 'black';
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
	 * var path = new Path();
	 * path.strokeColor = 'red';
	 * path.add(point);
	 * path.add(point + normal);
	 * 
	 * @example {@paperscript height=200}
	 * // Iterating over the length of a path:
	 * 
	 * // Create an arc shaped path:
	 * var path = new Path();
	 * path.strokeColor = 'black';
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
	 * 	var line = new Path();
	 * 	line.strokeColor = 'red';
	 * 	line.add(point);
	 * 	line.add(point + normal);
	 * }
	 */
	getNormalAt: function(offset, isParameter) {
		var loc = this.getLocationAt(offset, isParameter);
		return loc && loc.getNormal();
	}
}, new function() { // Scope for drawing

	// Note that in the code below we're often accessing _x and _y on point
	// objects that were read from segments. This is because the SegmentPoint
	// class overrides the plain x / y properties with getter / setters and
	// stores the values in these private properties internally. To avoid
	// of getter functions all the time we directly access these private
	// properties here. The distinction between normal Point objects and
	// SegmentPoint objects maybe seem a bit tedious but is worth the
	// performance benefit.

	function drawHandles(ctx, segments) {
		for (var i = 0, l = segments.length; i < l; i++) {
			var segment = segments[i],
				point = segment._point,
				pointSelected = segment._selectionState == SelectionState.POINT;
			// TODO: draw handles depending on selection state of
			// segment.point and neighbouring segments.
				if (pointSelected || segment._isSelected(segment._handleIn))
					drawHandle(ctx, point, segment._handleIn);
				if (pointSelected || segment._isSelected(segment._handleOut))
					drawHandle(ctx, point, segment._handleOut);
			// Draw a rectangle at segment.point:
			ctx.save();
			ctx.beginPath();
			ctx.rect(point._x - 2, point._y - 2, 4, 4);
			ctx.fill();
			// If the point is not selected, draw a white square that is 1 px
			// smaller on all sides:
			if (!pointSelected) {
				ctx.beginPath();
				ctx.rect(point._x - 1, point._y - 1, 2, 2);
				ctx.fillStyle = '#ffffff';
				ctx.fill();
				ctx.restore();
			}
		}
	}
	
	function drawHandle(ctx, point, handle) {
		if (!handle.isZero()) {
			var handleX = point._x + handle._x,
				handleY = point._y + handle._y;
			ctx.beginPath();
			ctx.moveTo(point._x, point._y);
			ctx.lineTo(handleX, handleY);
			ctx.stroke();
			ctx.beginPath();
			ctx.arc(handleX, handleY, 1.75, 0, Math.PI * 2, true);
			ctx.fill();
		}
	}

	function drawSegments(ctx, path) {
		var segments = path._segments,
			length = segments.length,
			handleOut, outX, outY;

		function drawSegment(i) {
			var segment = segments[i],
				point = segment._point,
				x = point._x,
				y = point._y,
				handleIn = segment._handleIn;
			if (!handleOut) {
				ctx.moveTo(x, y);
			} else {
				if (handleIn.isZero() && handleOut.isZero()) {
					ctx.lineTo(x, y);
				} else {
					ctx.bezierCurveTo(outX, outY,
							handleIn._x + x, handleIn._y + y, x, y);
				}
			}
			handleOut = segment._handleOut;
			outX = handleOut._x + x;
			outY = handleOut._y + y;
		}

		for (var i = 0; i < length; i++)
			drawSegment(i);
		// Close path by drawing first segment again
		if (path._closed && length > 1)
			drawSegment(0);
	}

	function drawDashes(ctx, path, dashArray, dashOffset) {
		var flattener = new PathFlattener(path),
			from = dashOffset, to,
			i = 0;
		while (from < flattener.length) {
			to = from + dashArray[(i++) % dashArray.length];
			flattener.drawPart(ctx, from, to);
			from = to + dashArray[(i++) % dashArray.length];
		}
	}

	return {
		draw: function(ctx, param) {
			if (!param.compound)
				ctx.beginPath();

			var fillColor = this.getFillColor(),
				strokeColor = this.getStrokeColor(),
				dashArray = this.getDashArray() || [], // TODO: Always defined?
				hasDash = !!dashArray.length;

			if (param.compound || param.selection || param.clip || fillColor
					|| strokeColor && !hasDash) {
				drawSegments(ctx, this);
			}

			// If we are drawing the selection of a path, stroke it and draw
			// its handles:
			if (param.selection) {
				ctx.stroke();
				drawHandles(ctx, this._segments);
			} else if (param.clip) {
				ctx.clip();
			} else if (!param.compound && (fillColor || strokeColor)) {
				// If the path is part of a compound path or doesn't have a fill
				// or stroke, there is no need to continue.
				ctx.save();
				this._setStyles(ctx);
				// If the path only defines a strokeColor or a fillColor,
				// draw it directly with the globalAlpha set, otherwise
				// we will do it later when we composite the temporary
				// canvas.
				if (!fillColor || !strokeColor)
					ctx.globalAlpha = this.opacity;
				if (fillColor) {
					ctx.fillStyle = fillColor.getCanvasStyle(ctx);
					ctx.fill();
				}
				if (strokeColor) {
					ctx.strokeStyle = strokeColor.getCanvasStyle(ctx);
					if (hasDash) {
						// We cannot use the path created by drawSegments above
						// Use CurveFlatteners to draw dashed paths:
						ctx.beginPath();
						drawDashes(ctx, this, dashArray, this.getDashOffset());
					}
					ctx.stroke();
				}
				ctx.restore();
			}
		}
	};
}, new function() { // Inject methods that require scoped privates

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
	};

	var styles = {
		getStrokeWidth: 'lineWidth',
		getStrokeJoin: 'lineJoin',
		getStrokeCap: 'lineCap',
		getMiterLimit: 'miterLimit'
	};

	return {
		/** @lends Path# */

		_setStyles: function(ctx) {
			for (var i in styles) {
				var style = this._style[i]();
				if (style)
					ctx[styles[i]] = style;
			}
		},

		// DOCS: implement @movebefore tag and move the Path#smooth function up
		// in the documentation.
		/**
		 * {@grouptitle Path Smoothing}
		 * 
		 * Smooth bezier curves without changing the amount of segments or their
		 * points, by only smoothing and adjusting their handle points, for both
		 * open ended and closed paths.
		 * 
		 * @author Oleg V. Polikarpotchkin
		 * 
		 * @example {@paperscript}
		 * // Smoothing a closed shape:
		 * 
		 * // Create a rectangular path with its top-left point at
		 * // {x: 30, y: 25} and a size of {width: 50, height: 50}:
		 * var path = new Path.Rectangle(new Point(30, 25), new Size(50, 50));
		 * path.strokeColor = 'black';
		 * 
		 * // Select the path, so we can see its handles:
		 * path.selected = true;
		 * 
		 * // Create a copy of the path and move it 100pt to the right:
		 * var copy = path.clone();
		 * copy.position.x += 100;
		 * 
		 * // Smooth the segments of the copy:
		 * copy.smooth();
		 * 
		 * @example {@paperscript height=220}
		 * var path = new Path();
		 * path.strokeColor = 'black';
		 * 
		 * path.add(new Point(30, 50));
		 * 
		 * var y = 5;
		 * var x = 3;
		 * 
		 * for (var i = 0; i < 28; i++) {
		 *     y *= -1.1;
		 *     x *= 1.1;
		 *     path.lineBy(x, y);
		 * }
		 * 
		 * // Create a copy of the path and move it 100pt down:
		 * var copy = path.clone();
		 * copy.position.y += 120;
		 * 
		 * // Set its stroke color to red:
		 * copy.strokeColor = 'red';
		 * 
		 * // Smooth the segments of the copy:
		 * copy.smooth();
		 */
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
				n = size,
				// Add overlapping ends for averaging handles in closed paths
				overlap;

			if (size <= 2)
				return;

			if (this._closed) {
				// Overlap up to 4 points since averaging beziers affect the 4
				// neighboring points
				overlap = Math.min(size, 4);
				n += Math.min(size, overlap) * 2;
			} else {
				overlap = 0;
			}
			var knots = [];
			for (var i = 0; i < size; i++)
				knots[i + overlap] = segments[i]._point;
			if (this._closed) {
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

			if (this._closed) {
				// Do the actual averaging simply by linearly fading between the
				// overlapping values.
				for (var i = 0, j = size; i < overlap; i++, j++) {
					var f1 = (i / overlap);
					var f2 = 1 - f1;
					// Beginning
					x[j] = x[i] * f1 + x[j] * f2;
					y[j] = y[i] * f1 + y[j] * f2;
					// End
					var ie = i + overlap, je = j + overlap;
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
					if (i < n - 1)
						handleIn = new Point(
								2 * knots[i + 1]._x - x[i + 1],
								2 * knots[i + 1]._y - y[i + 1]);
					else
						handleIn = new Point(
								(knots[n]._x + x[n - 1]) / 2,
								(knots[n]._y + y[n - 1]) / 2);
				}
			}
			if (this._closed && handleIn) {
				var segment = this._segments[0];
				segment.setHandleIn(handleIn.subtract(segment._point));
			}
		}
	};
}, new function() { // PostScript-style drawing commands

	function getCurrentSegment(that) {
		var segments = that._segments;
		if (segments.length == 0)
			throw('Use a moveTo() command first');
		return segments[segments.length - 1];
	}

	/**
	 * Helper method that returns the current segment and checks if we need to
	 * execute a moveTo() command first.
	 */
	return {
		/** @lends Path# */

		// DOCS: document moveTo
		/**
		 * {@grouptitle Postscript Style Drawing Commands}
		 * 
		 * @param {Point} point
		 */
		moveTo: function(point) {
			// Let's not be picky about calling moveTo() when not at the
			// beginning of a path, just bail out:
			if (!this._segments.length)
				this._add([ new Segment(Point.read(arguments)) ]);
		},

		// DOCS: document lineTo
		/**
		 * @param {Point} point
		 */
		lineTo: function(point) {
			// Let's not be picky about calling moveTo() first:
			this._add([ new Segment(Point.read(arguments)) ]);
		},

		/**
		 * Adds a cubic bezier curve to the path, defined by two handles and a
		 * to point.
		 *
		 * @param {Point} handle1
		 * @param {Point} handle2
		 * @param {Point} to
		 */
		cubicCurveTo: function(handle1, handle2, to) {
			handle1 = Point.read(arguments, 0, 1);
			handle2 = Point.read(arguments, 1, 1);
			to = Point.read(arguments, 2, 1);
			// First modify the current segment:
			var current = getCurrentSegment(this);
			// Convert to relative values:
			current.setHandleOut(handle1.subtract(current._point));
			// And add the new segment, with handleIn set to c2
			this._add([ new Segment(to, handle2.subtract(to)) ]);
		},

		/**
		 * Adds a quadratic bezier curve to the path, defined by a handle and a
		 * to point.
		 *
		 * @param {Point} handle
		 * @param {Point} to
		 */
		quadraticCurveTo: function(handle, to) {
			handle = Point.read(arguments, 0, 1);
			to = Point.read(arguments, 1, 1);
			// This is exact:
			// If we have the three quad points: A E D,
			// and the cubic is A B C D,
			// B = E + 1/3 (A - E)
			// C = E + 1/3 (D - E)
			var current = getCurrentSegment(this)._point;
			this.cubicCurveTo(
				handle.add(current.subtract(handle).multiply(1/3)),
				handle.add(to.subtract(handle).multiply(1/3)),
				to
			);
		},

		// DOCS: document Path#curveTo 'paramater' param.
		/**
		 * Draws a curve from the position of the last segment point in
		 * the path that goes through the specified {@code through} point,
		 * to the specified {@code to} point by adding one segment to the path.
		 * 
		 * @param {Point} through the point through which the curve should go
		 * @param {Point} to the point where the curve should end
		 * @param {Number} [parameter=0.5]
		 * 
		 * @example {@paperscript height=300}
		 * // Interactive example. Click and drag in the view below:
		 * 
		 * var myPath;
		 * function onMouseDrag(event) {
		 * 	// If we created a path before, remove it:
		 * 	if (myPath) {
		 * 	    myPath.remove();
		 * 	}
		 * 
		 * 	// Create a new path and add a segment point to it
		 * 	// at {x: 150, y: 150):
		 * 	myPath = new Path();
		 * 	myPath.add(150, 150);
		 * 
		 * 	// Draw a curve through the position of the mouse to 'toPoint'
		 * 	var toPoint = new Point(350, 150);
		 * 	myPath.curveTo(event.point, toPoint);
		 * 
		 * 	// Select the path, so we can see its segments:
		 * 	myPath.selected = true;
		 * }
	     * 
		 * // When the mouse is released, deselect the path
		 * // and set its stroke-color to black:
		 * function onMouseUp(event) {
		 * 	myPath.selected = false;
		 * 	myPath.strokeColor = 'black';
		 * }
		 */
		curveTo: function(through, to, parameter) {
			through = Point.read(arguments, 0, 1);
			to = Point.read(arguments, 1, 1);
			var t = Base.pick(parameter, 0.5),
				t1 = 1 - t,
				current = getCurrentSegment(this)._point,
				// handle = (through - (1 - t)^2 * current - t^2 * to) /
				// (2 * (1 - t) * t)
				handle = through.subtract(current.multiply(t1 * t1))
					.subtract(to.multiply(t * t)).divide(2 * t * t1);
			if (handle.isNaN())
				throw new Error(
					"Cannot put a curve through points with parameter=" + t);
			this.quadraticCurveTo(handle, to);
		},

		/**
		 * Draws an arc from the position of the last segment point in
		 * the path that goes through the specified {@code through} point,
		 * to the specified {@code to} point by adding one or more segments to
		 * the path.
		 *
		 * @name Path#arcTo
		 * @function
		 * @param {Point} through the point where the arc should pass through
		 * @param {Point} to the point where the arc should end
		 * 
		 * @example {@paperscript}
		 * var path = new Path();
		 * path.strokeColor = 'black';
		 * 
		 * var firstPoint = new Point(30, 75);
		 * path.add(firstPoint);
		 * 
		 * // The point through which we will create the arc:
		 * var throughPoint = new Point(40, 40);
		 * 
		 * // The point at which the arc will end:
		 * var toPoint = new Point(130, 75);
		 * 
		 * // Draw an arc through 'throughPoint' to 'toPoint'
		 * path.arcTo(throughPoint, toPoint);
		 * 
		 * // Add a red circle shaped path at the position of 'throughPoint':
		 * var circle = new Path.Circle(throughPoint, 3);
		 * circle.fillColor = 'red';
		 * 
		 * @example {@paperscript height=300}
		 * // Interactive example. Click and drag in the view below:
		 * 
		 * var myPath;
		 * function onMouseDrag(event) {
		 * 	// If we created a path before, remove it:
		 * 	if (myPath) {
		 * 	    myPath.remove();
		 * 	}
		 * 	
		 * 	// Create a new path and add a segment point to it
		 * 	// at {x: 150, y: 150):
		 * 	myPath = new Path();
		 * 	myPath.add(150, 150);
		 * 	
		 * 	// Draw an arc through the position of the mouse to 'toPoint'
		 * 	var toPoint = new Point(350, 150);
		 * 	myPath.arcTo(event.point, toPoint);
		 * 	
		 * 	// Select the path, so we can see its segments:
		 * 	myPath.selected = true;
		 * }
		 * 
		 * // When the mouse is released, deselect the path
		 * // and fill it with black.
		 * function onMouseUp(event) {
		 * 	myPath.selected = false;
		 * 	myPath.fillColor = 'black';
		 * }
		 */
		/**
		 * Draws an arc from the position of the last segment point in
		 * the path to the specified point by adding one or more segments to the
		 * path.
		 * 
		 * @param {Point} point
		 * @param {Boolean} [clockwise=true] specifies whether the arc should
		 *                                   be drawn in clockwise direction.
		 * 
		 * @example {@paperscript}
		 * var path = new Path();
		 * path.strokeColor = 'black';
		 * 
		 * path.add(new Point(30, 75));
		 * path.arcTo(new Point(130, 75));
		 * 
		 * var path2 = new Path();
		 * path2.strokeColor = 'red';
		 * path2.add(new Point(180, 25));
		 * 
		 * // To draw an arc in anticlockwise direction,
		 * // we pass 'false' as the second argument to arcTo:
		 * path2.arcTo(new Point(280, 25), false);
		 * 
		 * @example {@paperscript height=300}
		 * // Interactive example. Click and drag in the view below:
		 * var myPath;
		 * 
		 * // The mouse has to move at least 20 points before
		 * // the next mouse drag event is fired:
		 * tool.minDistance = 20;
		 * 
		 * // When the user clicks, create a new path and add
		 * // the current mouse position to it as its first segment:
		 * function onMouseDown(event) {
		 * 	myPath = new Path();
		 * 	myPath.strokeColor = 'black';
		 * 	myPath.add(event.point);
		 * }
		 * 
		 * // On each mouse drag event, draw an arc to the current
		 * // position of the mouse:
		 * function onMouseDrag(event) {
		 * 	myPath.arcTo(event.point);
		 * }
		 */
		arcTo: function(to, clockwise) {
			// Get the start point:
			var current = getCurrentSegment(this),
				through;
			if (arguments[1] && typeof arguments[1] !== 'boolean') {
				through = Point.read(arguments, 0, 1);
				to = Point.read(arguments, 1, 1);
			} else {
				to = Point.read(arguments, 0, 1);
				if (clockwise === undefined)
					clockwise = true;
				var middle = current._point.add(to).divide(2),
					step = middle.subtract(current._point);
				through = clockwise 
						? middle.subtract(-step.y, step.x)
						: middle.add(-step.y, step.x);
			}

			var x1 = current._point._x, x2 = through.x, x3 = to.x,
				y1 = current._point._y, y2 = through.y, y3 = to.y,

				f = x3 * x3 - x3 * x2 - x1 * x3 + x1 * x2 + y3 * y3 - y3 * y2
					- y1 * y3 + y1 * y2,
				g = x3 * y1 - x3 * y2 + x1 * y2 - x1 * y3 + x2 * y3 - x2 * y1,
				m = g == 0 ? 0 : f / g,
				e = x1 * x2 + y1 * y2 - m * (x1 * y2 - y1 * x2),
				cx = (x1 + x2 - m * (y2 - y1)) / 2,
				cy = (y1 + y2 - m * (x1 - x2)) / 2,
				radius = Math.sqrt(cx * cx + cy * cy - e),
				angle = Math.atan2(y1 - cy, x1 - cx),
				middle = Math.atan2(y2 - cy, x2 - cx),
				extent = Math.atan2(y3 - cy, x3 - cx),
				diff = middle - angle,
				d90 = Math.PI, // = 90 degrees in radians
				d180 = d90 * 2; // = 180 degrees in radians

			if (diff < -d90)
				diff += d180;
			else if (diff > d90)
				diff -= d180;

			extent -= angle;
			if (extent <= 0)
				extent += d180;
			if (diff < 0)
				extent -= d180;

			var ext = Math.abs(extent),
				arcSegs =  ext >= d180
				 	? 4 : Math.ceil(ext * 2 / Math.PI),
				inc = Math.min(Math.max(extent, -d180), d180) / arcSegs,
				z = 4 / 3 * Math.sin(inc / 2) / (1 + Math.cos(inc / 2)),
				segments = [];
			// TODO: Use Point#setAngle() and Point vector algebra instead?
			for (var i = 0; i <= arcSegs; i++) {
				var relx = Math.cos(angle),
					rely = Math.sin(angle);
				var pt = new Point(
					cx + relx * radius,
					cy + rely * radius
				);
				var out = i == arcSegs
					? null
					: new Point(
						cx + (relx - z * rely) * radius - pt.x,
						cy + (rely + z * relx) * radius - pt.y
					);
				if (i == 0) {
					// Modify startSegment
					current.setHandleOut(out);
				} else {
					// Add new Segment
					segments.push(new Segment(pt, new Point(
						cx + (relx + z * rely) * radius - pt.x,
						cy + (rely - z * relx) * radius - pt.y
					), out));
				}
				angle += inc;
			}
			// Add all segments at once at the end for higher performance
			this._add(segments);
		},

		// DOCS: document Path#lineBy
		/**
		 * @param {Point} vector
		 */
		lineBy: function(vector) {
			vector = Point.read(arguments);
			var current = getCurrentSegment(this);
			this.lineTo(current._point.add(vector));
		},

		// DOCS: document Path#curveBy
		/**
		 * @param {Point} throughVector
		 * @param {Point} toVector
		 * @param {Number} [parameter=0.5]
		 */
		curveBy: function(throughVector, toVector, parameter) {
			throughVector = Point.read(throughVector);
			toVector = Point.read(toVector);
			var current = getCurrentSegment(this)._point;
			this.curveTo(current.add(throughVector), current.add(toVector),
					parameter);
		},

		// DOCS: document Path#arcBy
		/**
		 * @param {Point} throughVector
		 * @param {Point} toVector
		 */
		arcBy: function(throughVector, toVector) {
			throughVector = Point.read(throughVector);
			toVector = Point.read(toVector);
			var current = getCurrentSegment(this)._point;
			this.arcBy(current.add(throughVector), current.add(toVector));
		},

		/**
		 * Closes the path. When closed, Paper.js connects the first and last
		 * segments.
		 */
		closePath: function() {
			this.setClosed(true);
		}
	};
}, new function() { // A dedicated scope for the tricky bounds calculations

	function getBounds(that, matrix, strokePadding) {
		// Code ported and further optimised from:
		// http://blog.hackers-cafe.net/2009/06/how-to-calculate-bezier-curves-bounding.html
		var segments = that._segments,
			first = segments[0];
		if (!first)
			return null;
		var coords = new Array(6),
			prevCoords = new Array(6);
		// Make coordinates for first segment available in prevCoords.
		if (matrix && matrix.isIdentity())
			matrix = null;
		first._transformCoordinates(matrix, prevCoords, false);
		var min = prevCoords.slice(0, 2),
			max = min.slice(0), // clone
			// Add some tolerance for good roots, as t = 0 / 1 are added
			// seperately anyhow, and we don't want joins to be added with
			// radiuses in getStrokeBounds()
			tMin = Numerical.TOLERANCE,
			tMax = 1 - tMin;
		function processSegment(segment) {
			segment._transformCoordinates(matrix, coords, false);

			for (var i = 0; i < 2; i++) {
				var v0 = prevCoords[i], // prev.point
					v1 = prevCoords[i + 4], // prev.handleOut
					v2 = coords[i + 2], // segment.handleIn
					v3 = coords[i]; // segment.point

				function add(value, t) {
					var padding = 0;
					if (value == null) {
						// Calculate bezier polynomial at t
						var u = 1 - t;
						value = u * u * u * v0
								+ 3 * u * u * t * v1
								+ 3 * u * t * t * v2
								+ t * t * t * v3;
						// Only add strokeWidth to bounds for points which lie
						// within 0 < t < 1. The corner cases for cap and join
						// are handled in getStrokeBounds()
						padding = strokePadding ? strokePadding[i] : 0;
					}
					var left = value - padding,
						right = value + padding;
					if (left < min[i])
						min[i] = left;
					if (right > max[i])
						max[i] = right;

				}
				add(v3, null);

				// Calculate derivative of our bezier polynomial, divided by 3.
				// Dividing by 3 allows for simpler calculations of a, b, c and
				// leads to the same quadratic roots below.
				var a = 3 * (v1 - v2) - v0 + v3,
					b = 2 * (v0 + v2) - 4 * v1,
					c = v1 - v0;

				// Solve for derivative for quadratic roots. Each good root
				// (meaning a solution 0 < t < 1) is an extrema in the cubic
				// polynomial and thus a potential point defining the bounds
				if (a == 0) {
					if (b == 0)
					    continue;
					var t = -c / b;
					// Test for good root and add to bounds if good (same below)
					if (tMin < t && t < tMax)
						add(null, t);
					continue;
				}

				var b2ac = b * b - 4 * a * c;
				if (b2ac < 0)
					continue;
				var sqrt = Math.sqrt(b2ac),
					f = 1 / (a * -2),
				 	t1 = (b - sqrt) * f,
					t2 = (b + sqrt) * f;
				if (tMin < t1 && t1 < tMax)
					add(null, t1);
				if (tMin < t2 && t2 < tMax)
					add(null, t2);
			}
			// Swap coordinate buffers
			var tmp = prevCoords;
			prevCoords = coords;
			coords = tmp;
		}
		for (var i = 1, l = segments.length; i < l; i++)
			processSegment(segments[i]);
		if (that._closed)
			processSegment(first);
		return Rectangle.create(min[0], min[1],
					max[0] - min[0], max[1] - min[1]);
	}

	function getPenPadding(radius, matrix) {
		if (!matrix)
			return [radius, radius];
		// If a matrix is provided, we need to rotate the stroke circle
		// and calculate the bounding box of the resulting rotated elipse:
		// Get rotated hor and ver vectors, and determine rotation angle
		// and elipse values from them:
		var mx = matrix.createShiftless(),
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
		// this can be simplified to:
		// tan(t) = -b * tan(phi) / a // x
		// tan(t) = b * cot(phi) / a // y
		// Solving for t gives:
		// t = pi * n - arctan(b tan(phi)) // x
		// t = pi * n + arctan(b cot(phi)) // y
		var tx = - Math.atan(b * Math.tan(phi)),
			ty = + Math.atan(b / Math.tan(phi)),
			// Due to symetry, we don't need to cycle through pi * n
			// solutions:
			x = a * Math.cos(tx) * Math.cos(phi)
				- b * Math.sin(tx) * Math.sin(phi),
			y = b * Math.sin(ty) * Math.cos(phi)
				+ a * Math.cos(ty) * Math.sin(phi);
		// Now update the join / round padding, as required by
		// getBounds() and code below.
		return [Math.abs(x), Math.abs(y)];
	}

	return {
		beans: true,

		/**
		 * The bounding rectangle of the item excluding stroke width.
		 * @param matrix optional
		 */
		getBounds: function(/* matrix */) {
			var useCache = arguments.length == 0;
			// Pass the matrix hidden from Bootstrap, so it still inject 
			// getBounds as bean too.
			if (!useCache || !this._bounds) {
				var bounds = getBounds(this, arguments[0]);
				if (!useCache)
					return bounds;
				this._bounds = LinkedRectangle.create(this, 'setBounds',
						bounds.x, bounds.y, bounds.width, bounds.height);
			}
			return this._bounds;
		},

		/**
		 * The bounding rectangle of the item including stroke width.
		 */
		getStrokeBounds: function(/* matrix */) {
			if (!this._style._strokeColor || !this._style._strokeWidth)
				return this.getBounds.apply(this, arguments);
			var useCache = arguments.length == 0;
			if (this._strokeBounds && useCache)
				return this._strokeBounds;
			var matrix = arguments[0], // set #getBounds()
				width = this.getStrokeWidth(),
				radius = width / 2,
				padding = getPenPadding(radius, matrix),
				join = this.getStrokeJoin(),
				cap = this.getStrokeCap(),
				// miter is relative to width. Divide it by 2 since we're
				// measuring half the distance below
				miter = this.getMiterLimit() * width / 2,
				segments = this._segments,
				length = segments.length,
				// It seems to be compatible with Ai we need to pass pen padding
				// untransformed to getBounds()
				bounds = getBounds(this, matrix, getPenPadding(radius));
			// Create a rectangle of padding size, used for union with bounds
			// further down
			var joinBounds = new Rectangle(new Size(padding).multiply(2));

			function add(point) {
				bounds = bounds.include(matrix
					? matrix.transform(point) : point);
			}

			function addBevelJoin(curve, t) {
				var point = curve.getPoint(t),
					normal = curve.getNormal(t).normalize(radius);
				add(point.add(normal));
				add(point.subtract(normal));
			}

			function addJoin(segment, join) {
				var handleIn = segment.getHandleInIfSet(),
					handleOut = segment.getHandleOutIfSet();
				// When both handles are set in a segment, the join setting is
				// ignored and round is always used.
				if (join === 'round' || handleIn && handleOut) {
					bounds = bounds.unite(joinBounds.setCenter(matrix
						? matrix.transform(segment._point) : segment._point));
				} else if (join == 'bevel') {
					var curve = segment.getCurve();
					addBevelJoin(curve, 0);
					addBevelJoin(curve.getPrevious(), 1);
				} else if (join == 'miter') {
					var curve2 = segment.getCurve(),
						curve1 = curve2.getPrevious(),
						point = curve2.getPoint(0),
						normal1 = curve1.getNormal(1).normalize(radius),
						normal2 = curve2.getNormal(0).normalize(radius),
						// Intersect the two lines
						line1 = new Line(point.add(normal1),
								new Point(-normal1.y, normal1.x)),
						line2 = new Line(point.subtract(normal2),
								new Point(-normal2.y, normal2.x)),
						corner = line1.intersect(line2);
					// Now measure the distance from the segment to the
					// intersection, which his half of the miter distance
					if (!corner || point.getDistance(corner) > miter) {
						addJoin(segment, 'bevel');
					} else {
						add(corner);
					}
				}
			}

			function addCap(segment, cap, t) {
				switch (cap) {
				case 'round':
					return addJoin(segment, cap);
				case 'butt':
				case 'square':
					// Calculate the corner points of butt and square caps
					var curve = segment.getCurve(),
						point = curve.getPoint(t),
						normal = curve.getNormal(t).normalize(radius);
					// For square caps, we need to step away from point in the
					// direction of the tangent, which is the rotated normal
					if (cap === 'square')
						point = point.add(normal.y, -normal.x);
					add(point.add(normal));
					add(point.subtract(normal));
					break;
				}
			}

			for (var i = 1, l = length - (this._closed ? 0 : 1); i < l; i++) {
				addJoin(segments[i], join);
			}
			if (this._closed) {
				addJoin(segments[0], join);
			} else {
				addCap(segments[0], cap, 0);
				addCap(segments[length - 1], cap, 1);
			}
			if (useCache)
				this._strokeBounds = bounds;
			return bounds;
		},

		/**
		 * The bounding rectangle of the item including handles.
		 */
		getControlBounds: function() {
			// TODO: Implement!
		}
		
		// TODO: intersects(item)
		// TODO: contains(item)
		// TODO: contains(point)
		// TODO: intersect(item)
		// TODO: unite(item)
		// TODO: exclude(item)
		// TODO: getIntersections(path)
	};
});
