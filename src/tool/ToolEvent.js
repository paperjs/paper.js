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
	choosePoint: function(point, toolPoint) {
		if (point)
			return point;
		if (toolPoint)
			return new Point(toolPoint);
		return null;
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
		return this.choosePoint(this._point, this.tool.point);
	},

	setPoint: function(point) {
		this._point = point;
	},

	/**
	 * The position of the mouse in document coordinates when the previous
	 * event was fired.
	 */
	getLastPoint: function() {
		return this.choosePoint(this._lastPoint, this.tool.lastPoint);
	},

	setLastPoint: function(lastPoint) {
		this._lastPoint = lastPoint;
	},

	/**
	 * The position of the mouse in document coordinates when the mouse button
	 * was last clicked.
	 */
	getDownPoint: function() {
		return this.choosePoint(this._downPoint, this.tool.downPoint);
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
		if (this._middlePoint == null && this.tool.lastPoint != null) {
			// (point + lastPoint) / 2
			return this.tool.point.add(this.tool.lastPoint).divide(2);
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
		if (this._delta == null && this.tool.lastPoint != null) {
			return this.tool.point.subtract(this.tool.lastPoint);
		}
		return this._delta;
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
		switch (this.type) {
		case 'mousedown':
		case 'mouseup':
			// Return downCount for both mouse down and up, since
			// the count is the same.
			return this.tool.downCount;
		default:
			return this.tool.count;
		}
	},

	setCount: function(count) {
		switch (this.type) {
		case 'mousedown':
		case 'mouseup':
			this.tool.downCount = count;
			break;
		default:
			this.tool.count = count;
			break;
		}
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
				+ ', point: ' + this.point
				+ ', count: ' + this.count
				+ ', modifiers: ' + this.getModifiers(true)
				+ ' }';
	}
});
