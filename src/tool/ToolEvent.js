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

/**
 * The ToolEvent object is received by the {@link Tool}'s mouse event handlers
 * {@link Tool#getOnMouseDown()}, {@link Tool#getOnMouseDrag()},
 * {@link Tool#getOnMouseMove()} and {@link Tool#getOnMouseUp()}. The ToolEvent
 * object is the only parameter passed to these functions and contains
 * information about the mouse event.
 * 
 * Sample code:
 * <code>
 * function onMouseUp(event) {
 * 	// the position of the mouse when it is released
 * 	print(event.point);
 * }
 * </code>
 * 
 * @author lehni
 */
var ToolEvent = this.ToolEvent = Base.extend({
	beans: true,

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
	 * The position of the mouse in document coordinates when the event was
	 * fired.
	 * 
	 * Sample code:
	 * <code>
	 * function onMouseDrag(event) {
	 * 	// the position of the mouse when it is dragged
	 * 	print(event.point);
	 * }
	 * 
	 * function onMouseUp(event) {
	 * 	// the position of the mouse when it is released
	 * 	print(event.point);
	 * }
	 * </code>
	 */
	getPoint: function() {
		return this._choosePoint(this._point, this.tool._point);
	},

	setPoint: function(point) {
		this._point = point;
	},

	/**
	 * The position of the mouse in document coordinates when the previous
	 * event was fired.
	 */
	getLastPoint: function() {
		return this._choosePoint(this._lastPoint, this.tool._lastPoint);
	},

	setLastPoint: function(lastPoint) {
		this._lastPoint = lastPoint;
	},

	/**
	 * The position of the mouse in document coordinates when the mouse button
	 * was last clicked.
	 */
	getDownPoint: function() {
		return this._choosePoint(this._downPoint, this.tool._downPoint);
	},

	setDownPoint: function(downPoint) {
		this._downPoint = downPoint;
	},

	/**
	 * The point in the middle between {@link #getLastPoint()} and
	 * {@link #getPoint()}. This is a useful position to use when creating
	 * artwork based on the moving direction of the mouse, as returned by
	 * {@link #getDelta()}.
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
	 * Sample code:
	 * <code>
	 * function onMouseDrag(event) {
	 * 	// the amount of times the onMouseDrag event was fired
	 * 	// since the last onMouseDown event
	 * 	print(event.count);
	 * }
	 * 
	 * function onMouseUp(event) {
	 * 	// the amount of times the onMouseUp event was fired
	 * 	// since the tool was activated 
	 * 	print(event.point);
	 * }
	 * </code>
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
	
	getModifiers: function() {
		return Key.modifiers;
	},

	// TODO: implement hitTest first
	// getItem: function() {
	// 	if (this.item == null) {
	// 		var result = Document.getActiveDocument().hitTest(this.getPoint());
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
	
	toString: function() {
		return '{ type: ' + this.type 
				+ ', point: ' + this.getPoint()
				+ ', count: ' + this.getCount()
				+ ', modifiers: ' + this.getModifiers()
				+ ' }';
	}
});
