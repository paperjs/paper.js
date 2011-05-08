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

var ToolHandler = this.ToolHandler = Base.extend({
	beans: true,

	/**
	 * Initializes the tool's settings, so a new tool can be assigned to it
	 */
	initialize: function(handlers) {
		this.firstMove = true;
		this.count = 0;
		this.downCount = 0;
		for (var i in handlers) {
			this[i] = handlers[i];
		}
	},

	/**
	 * The minimum distance the mouse has to drag before firing the onMouseDrag
	 * event, since the last onMouseDrag event.
	 * 
	 * Sample code:
	 * <code>
	 * // Fire the onMouseDrag event after the user has dragged
	 * // more then 5 points from the last onMouseDrag event:
	 * tool.minDistance = 5;
	 * </code>
	 */
	getMinDistance: function() {
		return this._minDistance;
	},

	setMinDistance: function(minDistance) {
		this._minDistance = minDistance;
		if (this._minDistance != null && this._maxDistance != null
				&& this._minDistance > this._maxDistance)
			this._maxDistance = this._minDistance;
	},

	getMaxDistance: function() {
		return this._maxDistance;
	},

	setMaxDistance: function(maxDistance) {
		this._maxDistance = maxDistance;
		if (this._minDistance != null && this._maxDistance != null
				&& this._maxDistance < this._minDistance)
			this._minDistance = maxDistance;
	},

	getFixedDistance: function() {
		if (this._minDistance == this._maxDistance)
			return this._minDistance;
		return null;
	},

	setFixedDistance: function(distance) {
		this.minDistance = distance;
		this.maxDistance = distance;
	},

	updateEvent: function(type, pt, minDistance, maxDistance, start,
			needsChange, matchMaxDistance) {
		if (!start) {
			if (minDistance != null || maxDistance != null) {
				var minDist = minDistance != null ? minDistance : 0;
				var vector = pt.subtract(this.point);
				var distance = vector.getLength();
				if (distance < minDist)
					return false;
				// Produce a new point on the way to pt if pt is further away
				// than maxDistance
				var maxDist = maxDistance != null ? maxDistance : 0;
				if (maxDist != 0) {
					if (distance > maxDist)
						pt = this.point.add(vector.normalize(maxDist));
					else if (matchMaxDistance)
						return false;
				}
			}
			if (needsChange && pt.equals(this.point))
				return false;
		}
		this.lastPoint = this.point;
		this.point = pt;
		switch (type) {
		case 'mousedown':
			this.lastPoint = this.downPoint;
			this.downPoint = this.point;
			this.downCount++;
			break;
		case 'mouseup':
			// Mouse up events return the down point for last point,
			// so delta is spanning over the whole drag.
			this.lastPoint = this.downPoint;
			break;
		}
		if (start) {
			this.count = 0;
		} else {
			this.count++;
		}
		return true;
	},

	onHandleEvent: function(type, pt, event) {
		switch (type) {
		case 'mousedown':
			this.updateEvent(type, pt, null, null, true, false, false);
			if (this.onMouseDown)
				this.onMouseDown(new ToolEvent(this, type, event));
			break;
		case 'mousedrag':
			// In order for idleInterval drag events to work, we need to
			// not check the first call for a change of position. 
			// Subsequent calls required by min/maxDistance functionality
			// will require it, otherwise this might loop endlessly.
			var needsChange = false,
			// If the mouse is moving faster than maxDistance, do not
			// produce events for what is left after the first event is
			// generated in case it is shorter than maxDistance, as this
			// would produce weird results. matchMaxDistance controls this.
				matchMaxDistance = false;
			while (this.updateEvent(type, pt, this.minDistance,
					this.maxDistance, false, needsChange, matchMaxDistance)) {
				if (this.onMouseDrag)
					this.onMouseDrag(new ToolEvent(this, type, event));
				needsChange = true;
				matchMaxDistance = true;
			}
			break;
		case 'mouseup':
			// If the last mouse drag happened in a different place, call
			// mouse drag first, then mouse up.
			if ((this.point.x != pt.x || this.point.y != pt.y)
					&& this.updateEvent('mousedrag', pt, this.minDistance,
							this.maxDistance, false, false, false)) {
				if (this.onMouseDrag)
					this.onMouseDrag(new ToolEvent(this, type, event));
			}
			this.updateEvent(type, pt, null, this.maxDistance, false,
					false, false);
			if (this.onMouseUp)
				this.onMouseUp(new ToolEvent(this, type, event));
			// Start with new values for 'mousemove'
			this.updateEvent(type, pt, null, null, true, false, false);
			this.firstMove = true;
			break;
		case 'mousemove':
			while (this.updateEvent(type, pt, this.minDistance,
					this.maxDistance, this.firstMove, true, false)) {
				if (this.onMouseMove)
					this.onMouseMove(new ToolEvent(this, type, event));
				this.firstMove = false;
			}
			break;
		}
	}
});
