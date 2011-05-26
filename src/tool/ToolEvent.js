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

var ToolEvent = this.ToolEvent = Base.extend({
	/** @lends ToolEvent# */

	beans: true,

	/**
	 * @name ToolEvent
	 * @constructor
	 * 
	 * @class ToolEvent The ToolEvent object is received by the {@link Tool}'s mouse event handlers
	 * {@link Tool#onMouseDown}, {@link Tool#onMouseDrag},
	 * {@link Tool#onMouseMove} and {@link Tool#onMouseUp}. The ToolEvent
	 * object is the only parameter passed to these functions and contains
	 * information about the mouse event.
	 */
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
	 * @type number
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

	// DOCS: document ToolEvent#modifiers
	/**
	 * @type object
	 * @bean
	 */
	getModifiers: function() {
		return Key.modifiers;
	},

	// TODO: implement hitTest first
	// getItem: function() {
	// 	if (this.item == null) {
	// 		var result = Project.getActiveProject().hitTest(this.getPoint());
	// 		if (result != null) {
	// 			this.item = result.getItem();
	// 			// Find group parent
	// 			var parent = item.getParent();
	// 			while (parent instanceof Group || parent instanceof CompoundPath) {
	// 				item = parent;
	// 				parent = parent.getParent();
	// 			}
	// 		}
	// 	}
	// 	return item;
	// }
	// 
	// setItem: function(Item item) {
	// 	this.item = item;
	// }

	/**
	 * @return {string} A string representation of the tool event.
	 */
	toString: function() {
		return '{ type: ' + this.type 
				+ ', point: ' + this.getPoint()
				+ ', count: ' + this.getCount()
				+ ', modifiers: ' + this.getModifiers()
				+ ' }';
	}
});
