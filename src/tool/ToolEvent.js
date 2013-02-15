/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name ToolEvent
 *
 * @class ToolEvent The ToolEvent object is received by the {@link Tool}'s mouse
 * event handlers {@link Tool#onMouseDown}, {@link Tool#onMouseDrag},
 * {@link Tool#onMouseMove} and {@link Tool#onMouseUp}. The ToolEvent
 * object is the only parameter passed to these functions and contains
 * information about the mouse event.
 *
 * @extends Event
 */
var ToolEvent = this.ToolEvent = Event.extend(/** @lends ToolEvent# */{
	// Have ToolEvent#item fall back to returning null, not undefined.
	_item: null,

	initialize: function(tool, type, event) {
		this.tool = tool;
		this.type = type;
		this.event = event;
	},

	/**
	 * Convenience method to allow local overrides of point values.
	 * See application below.
	 */
	_choosePoint: function(point, toolPoint) {
		return point ? point : toolPoint ? toolPoint.clone() : null;
	},

	/**
	 * The type of tool event.
	 *
	 * @name ToolEvent#type
	 * @type String('mousedown', 'mouseup', 'mousemove', 'mousedrag')
	 */

	/**
	 * The position of the mouse in project coordinates when the event was
	 * fired.
	 *
	 * @example
	 * function onMouseDrag(event) {
	 * 	// the position of the mouse when it is dragged
	 * 	console.log(event.point);
	 * }
	 *
	 * function onMouseUp(event) {
	 * 	// the position of the mouse when it is released
	 * 	console.log(event.point);
	 * }
	 *
	 * @type Point
	 * @bean
	 */
	getPoint: function() {
		return this._choosePoint(this._point, this.tool._point);
	},

	setPoint: function(point) {
		this._point = point;
	},

	/**
	 * The position of the mouse in project coordinates when the previous
	 * event was fired.
	 *
	 * @type Point
	 * @bean
	 */
	getLastPoint: function() {
		return this._choosePoint(this._lastPoint, this.tool._lastPoint);
	},

	setLastPoint: function(lastPoint) {
		this._lastPoint = lastPoint;
	},

	/**
	 * The position of the mouse in project coordinates when the mouse button
	 * was last clicked.
	 *
	 * @type Point
	 * @bean
	 */
	getDownPoint: function() {
		return this._choosePoint(this._downPoint, this.tool._downPoint);
	},

	setDownPoint: function(downPoint) {
		this._downPoint = downPoint;
	},

	/**
	 * The point in the middle between {@link #lastPoint} and
	 * {@link #point}. This is a useful position to use when creating
	 * artwork based on the moving direction of the mouse, as returned by
	 * {@link #delta}.
	 *
	 * @type Point
	 * @bean
	 */
	getMiddlePoint: function() {
		// For explanations, see getDelta()
		if (!this._middlePoint && this.tool._lastPoint) {
			// (point + lastPoint) / 2
			return this.tool._point.add(this.tool._lastPoint).divide(2);
		}
		return this.middlePoint;
	},

	setMiddlePoint: function(middlePoint) {
		this._middlePoint = middlePoint;
	},

	/**
	 * The difference between the current position and the last position of the
	 * mouse when the event was fired. In case of the mouseup event, the
	 * difference to the mousedown position is returned.
	 *
	 * @type Point
	 * @bean
	 */
	getDelta: function() {
		// Do not put the calculated delta into delta, since this only reserved
		// for overriding event.delta.
		// Instead, keep calculating the delta each time, so the result can be
		// directly modified by the script without changing the internal values.
		// We could cache this and use clone, but this is almost as fast...
		return !this._delta && this.tool._lastPoint
		 		? this.tool._point.subtract(this.tool._lastPoint)
				: this._delta;
	},

	setDelta: function(delta) {
		this._delta = delta;
	},

	/**
	 * The number of times the mouse event was fired.
	 *
	 * @type Number
	 * @bean
	 */
	getCount: function() {
		// Return downCount for both mouse down and up, since
		// the count is the same.
		return /^mouse(down|up)$/.test(this.type)
				? this.tool._downCount
				: this.tool._count;
	},

	setCount: function(count) {
		this.tool[/^mouse(down|up)$/.test(this.type) ? 'downCount' : 'count']
			= count;
	},

	/**
	 * The item at the position of the mouse (if any).
	 * 
	 * If the item is contained within one or more {@link Group} or
	 * {@link CompoundPath} items, the most top level group or compound path
	 * that it is contained within is returned.
	 *
	 * @type Item
	 * @bean
	 */
	getItem: function() {
		if (!this._item) {
			var result = this.tool._scope.project.hitTest(this.getPoint());
			if (result) {
				var item = result.item,
					// Find group parent
					parent = item._parent;
				while ((parent instanceof Group && !(parent instanceof Layer))
						|| parent instanceof CompoundPath) {
					item = parent;
					parent = parent._parent;
				}
				this._item = item;
			}
		}
		return this._item;
	},
	
	setItem: function(item) {
		this._item = item;
	},

	/**
	 * @return {String} A string representation of the tool event.
	 */
	toString: function() {
		return '{ type: ' + this.type
				+ ', point: ' + this.getPoint()
				+ ', count: ' + this.getCount()
				+ ', modifiers: ' + this.getModifiers()
				+ ' }';
	}
});
