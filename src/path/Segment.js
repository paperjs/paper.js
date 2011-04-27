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
			// TODO: If beans are not activated, this won't copy from
			// an existing segment. OK?
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
		// this.corner = !this._handleIn.isParallel(this._handleOut);
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
		// this.corner = !this._handleIn.isParallel(this._handleOut);
	},

	getHandleOutIfSet: function() {
		return this._handleOut._x == 0 && this._handleOut._y == 0
			? null : this._handleOut;
	},

	getIndex: function() {
		// TODO: Cache and update indices instead of searching?
		return this._path ? this._path._segments.indexOf(this) : -1;
	},

	getPath: function() {
		return this._path;
	},

	getCurve: function() {
		if (this._path != null) {
			var index = this.getIndex();
			// The last segment of an open path belongs to the last curve
			// TODO: Port back to Scriptographer
			if (!this._path.closed && index == this._path._segments.length - 1)
				index--;
			return this._path.getCurves()[index];
		}
		return null;
	},

	getNext: function() {
		var segments = this._path && this._path._segments;
		return segments && (segments[this.getIndex() + 1]
				|| this._path.closed && segments[0]) || null;
	},

	getPrevious: function() {
		var segments = this._path && this._path._segments;
		return segments && (segments[this.getIndex() - 1]
				|| this._path.closed && segments[segments.length - 1]) || null;
	},

	_isSelected: function(point) {
		var state = this._selectionState;
		if (point == this._point) {
			return !!(state & SelectionState.POINT);
		} else if (point == this._handleIn) {
			return !!(state & SelectionState.HANDLE_IN);
		} else if (point == this._handleOut) {
			return !!(state & SelectionState.HANDLE_OUT);
		}
		return false;
	},

	_setSelected: function(point, selected) {
		if (!this._path)
			return;
		var selected = !!selected, // convert to boolean
			state = this._selectionState,
			wasSelected = !!state,
			pointSelected = !!(state & SelectionState.POINT),
			handleInSelected = !!(state & SelectionState.HANDLE_IN),
			handleOutSelected = !!(state & SelectionState.HANDLE_OUT);
		if (point == this._point) {
			if (pointSelected != selected) {
				if (selected) {
					handleInSelected = handleOutSelected = false;
				} else {
					var previous = this.getPrevious(),
						next = this.getNext();
					// When deselecting a point, the handles get selected
					// instead depending on the selection state of their
					// neighbors.
					handleInSelected = previous
							&& (previous._point.isSelected()
							|| previous._handleOut.isSelected());
					handleOutSelected = next
							&& (next._point.isSelected()
							|| next._handleOut.isSelected());
				}
				pointSelected = selected;
			}
		} else if (point == this._handleIn) {
			if (handleInSelected != selected) {
				// When selecting handles, the point get deselected.
				if (selected)
					pointSelected = false;
				handleInSelected = selected;
			}
		} else if (point == this._handleOut) {
			if (handleOutSelected != selected) {
				// When selecting handles, the point get deselected.
				if (selected)
					pointSelected = false;
				handleOutSelected = selected;
			}
		}
		this._selectionState = (pointSelected ? SelectionState.POINT : 0)
				| (handleInSelected ? SelectionState.HANDLE_IN : 0)
				| (handleOutSelected ? SelectionState.HANDLE_OUT : 0);
		// If the selection state of the segment has changed, we need to let
		// it's path know and possibly add or remove it from
		// document._selectedItems
		if (wasSelected == !this._selectionState) {
			var path = this._path,
				selectedItems = path._document._selectedItems;
			if (!this._selectionState) {
				path._selectedSegmentCount--;
				if (path._selectedSegmentCount == 0)
					path._document._selectItem(path, false);
			} else {
				path._selectedSegmentCount++;
				if (path._selectedSegmentCount == 1)
					path._document._selectItem(path, true);
			}
		}	
	},

	// TODO: Port setSelected(selected) back to Scriptographer
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
		if (this._path) {
			this._path._segments.splice(this.getIndex(), 1);
			if (this.isSelected())
				this._path._selectedSegmentCount--;
			return true;
		}
		return false;
	},

	toString: function() {
		return '{ point: ' + this._point
				+ (!this._handleIn.isZero()
					? ', handleIn: ' + this._handleIn : '')
				+ (this._handleOut.isZero()
					? ', handleOut: ' + this._handleOut : '')
				+ ' }';
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
			y = point._y;
		coords[0] = x;
		coords[1] = y;
		var index = 2;
		// We need to convert handles to absolute coordinates in order
		// to transform them.
		if (handleIn) {
			coords[index++] = handleIn._x + x;
			coords[index++] = handleIn._y + y;
		}
		if (handleOut) {
			coords[index++] = handleOut._x + x;
			coords[index++] = handleOut._y + y;
		}
		if (matrix) {
			matrix.transform(coords, 0, coords, 0, index / 2);
			x = coords[0];
			y = coords[1];
			if (change) {
				// If change is true, we need to set the new values back
				point._x = x;
				point._y = y;
				index  = 2;
				if (handleIn) {
					handleIn._x = coords[index++] - x;
					handleIn._y = coords[index++] - y;
				}
				if (handleOut) {
					handleOut._x = coords[index++] - x;
					handleOut._y = coords[index++] - y;
				}
			} else {
				// We want to receive the results in coords, so make sure
				// handleIn and out are defined too, even if they're 0
				if (!handleIn) {
					coords[index++] = x;
					coords[index++] = y;
				}
				if (!handleOut) {
					coords[index++] = x;
					coords[index++] = y;
				}
			}
		}
	}
});
