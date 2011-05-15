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

var Segment = this.Segment = Base.extend({
	beans: true,

	initialize: function(arg0, arg1, arg2, arg3, arg4, arg5) {
		if (arguments.length == 0) {
			this._point = SegmentPoint.create(this, 0, 0);
		} else if (arguments.length == 1) {
			// TODO: If beans are not activated, this won't copy from n existing
			// segment. OK?
			if (arg0.point) {
				this._point = SegmentPoint.create(this, arg0.point);
				this._handleIn = SegmentPoint.create(this, arg0.handleIn);
				this._handleOut = SegmentPoint.create(this, arg0.handleOut);
			} else {
				this._point = SegmentPoint.create(this, arg0);
			}
		} else if (arguments.length < 6) {
			if (arguments.length == 2 && !arg1.x) {
				this._point = SegmentPoint.create(this, arg0, arg1);
			} else {
				this._point = SegmentPoint.create(this, arg0);
				// Doesn't matter if these arguments exist, it creates 0, 0
				// points otherwise
				this._handleIn = SegmentPoint.create(this, arg1);
				this._handleOut = SegmentPoint.create(this, arg2);
			}
		} else if (arguments.length == 6) {
			this._point = SegmentPoint.create(this, arg0, arg1);
			this._handleIn = SegmentPoint.create(this, arg2, arg3);
			this._handleOut = SegmentPoint.create(this, arg4, arg5);
		}
		if (!this._handleIn)
			this._handleIn = SegmentPoint.create(this, 0, 0);
		if (!this._handleOut)
			this._handleOut = SegmentPoint.create(this, 0, 0);
	},

	_changed: function(point) {
		if (this._path) {
			// Delegate changes to affected curves if they exist
			if (this._path._curves) {
				var curve = this.getCurve(), other;
				if (curve) {
					curve._changed();
					// Get the other affected curve, which is the previous one
					// for _point or _handleIn changing when this segment is 
					// _segment1 of the curve, for all other cases it's the next
					// (e.g. _handleOut or this segment == _segment2)
					if (other = (curve[point == this._point
						|| point == this._handleIn && curve._segment1 == this
							? 'getPrevious' : 'getNext']())) {
						other._changed();
					}
				}
			}
			this._path._changed(ChangeFlags.GEOMETRY);
		}
	},

	getPoint: function() {
		return this._point;
	},

	setPoint: function(point) {
		point = Point.read(arguments);
		// Do not replace the internal object but update it instead, so
		// references to it are kept alive.
		this._point.set(point.x, point.y);
	},

	getHandleIn: function() {
		return this._handleIn;
	},

	setHandleIn: function(point) {
		point = Point.read(arguments);
		// See #setPoint:
		this._handleIn.set(point.x, point.y);
		// Update corner accordingly
		// this.corner = !this._handleIn.isColinear(this._handleOut);
	},

	getHandleInIfSet: function() {
		return this._handleIn._x == 0 && this._handleIn._y == 0
			? null : this._handleIn;
	},

	getHandleOut: function() {
		return this._handleOut;
	},

	setHandleOut: function(point) {
		point = Point.read(arguments);
		// See #setPoint:
		this._handleOut.set(point.x, point.y);
		// Update corner accordingly
		// this.corner = !this._handleIn.isColinear(this._handleOut);
	},

	getHandleOutIfSet: function() {
		return this._handleOut._x == 0 && this._handleOut._y == 0
			? null : this._handleOut;
	},

	getPath: function() {
		return this._path || null;
	},

	getIndex: function() {
		return this._index !== undefined ? this._index : null;
	},

	getCurve: function() {
		if (this._path) {
			var index = this._index;
			// The last segment of an open path belongs to the last curve
			if (!this._path._closed && index == this._path._segments.length - 1)
				index--;
			return this._path.getCurves()[index] || null;
		}
		return null;
	},

	getNext: function() {
		var segments = this._path && this._path._segments;
		return segments && (segments[this._index + 1]
				|| this._path._closed && segments[0]) || null;
	},

	getPrevious: function() {
		var segments = this._path && this._path._segments;
		return segments && (segments[this._index - 1]
				|| this._path._closed && segments[segments.length - 1]) || null;
	},

	_isSelected: function(point) {
		var state = this._selectionState;
		return point == this._point ? !!(state & SelectionState.POINT)
			: point == this._handleIn ? !!(state & SelectionState.HANDLE_IN)
			: point == this._handleOut ? !!(state & SelectionState.HANDLE_OUT)
			: false;
	},

	_setSelected: function(point, selected) {
		if (!this._path)
			return;
		var selected = !!selected, // convert to boolean
			state = this._selectionState,
			wasSelected = !!state,
			// For performance reasons use array indices to access the various
			// selection states: 0 = point, 1 = handleIn, 2 = handleOut
			selection = [
				!!(state & SelectionState.POINT),
				!!(state & SelectionState.HANDLE_IN),
				!!(state & SelectionState.HANDLE_OUT)
			];
		if (point == this._point) {
			if (selected) {
				// We're selecting point, deselect the handles
				selection[1] = selection[2] = false;
			} else {
				var previous = this.getPrevious(),
					next = this.getNext();
				// When deselecting a point, the handles get selected instead
				// depending on the selection state of their neighbors.
				selection[1] = previous && (previous._point.isSelected()
						|| previous._handleOut.isSelected());
				selection[2] = next && (next._point.isSelected()
						|| next._handleIn.isSelected());
			}
			selection[0] = selected;
		} else {
			var index = point == this._handleIn ? 1 : 2;
			if (selection[index] != selected) {
				// When selecting handles, the point get deselected.
				if (selected)
					selection[0] = false;
				selection[index] = selected;
			}
		}
		this._selectionState = (selection[0] ? SelectionState.POINT : 0)
				| (selection[1] ? SelectionState.HANDLE_IN : 0)
				| (selection[2] ? SelectionState.HANDLE_OUT : 0);
		// If the selection state of the segment has changed, we need to let
		// it's path know and possibly add or remove it from
		// document._selectedItems
		if (wasSelected != !!this._selectionState) {
			var path = this._path,
				count = path._selectedSegmentCount
						+= this._selectionState ? 1 : -1;
			if (count <= 1)
				path._document._selectItem(path, count == 1);
		}
	},

	isSelected: function() {
		return this._isSelected(this._point);
	},

	setSelected: function(selected) {
		this._setSelected(this._point, selected);
	},

	reverse: function() {
		return new Segment(this._point, this._handleOut, this._handleIn);
	},

	clone: function() {
		return new Segment(this);
	},

	remove: function() {
		return this._path ? !!this._path.removeSegment(this._index) : false;
	},

	toString: function() {
		var parts = [ 'point: ' + this._point ];
		if (!this._handleIn.isZero())
			parts.push('handleIn: ' + this._handleIn);
		if (!this._handleOut.isZero())
			parts.push('handleOut: ' + this._handleOut);
		return '{ ' + parts.join(', ') + ' }';
	},

	_transformCoordinates: function(matrix, coords, change) {
		// Use matrix.transform version() that takes arrays of multiple
		// points for largely improved performance, as no calls to
		// Point.read() and Point constructors are necessary.
		var point = this._point,
			// If a matrix is defined, only transform handles if they are set.
			// This saves some computation time. If no matrix is set, always
			// use the real handles, as we just want to receive a filled 
			// coords array for getBounds().
			handleIn =  matrix && this.getHandleInIfSet() || this._handleIn,
			handleOut = matrix && this.getHandleOutIfSet() || this._handleOut,
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
		if (matrix) {
			matrix._transformCoordinates(coords, 0, coords, 0, i / 2);
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
	}
});
