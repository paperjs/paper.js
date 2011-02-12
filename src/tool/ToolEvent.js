/*
 * Scriptographer
 *
 * This file is part of Scriptographer, a Plugin for Adobe Illustrator.
 *
 * Copyright (c) 2002-2010 Juerg Lehni, http://www.scratchdisk.com.
 * All rights reserved.
 *
 * Please visit http://scriptographer.org/ for updates and contact.
 *
 * -- GPL LICENSE NOTICE --
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 675 Mass Ave, Cambridge, MA 02139, USA.
 * -- GPL LICENSE NOTICE --
 *
 * File created on 21.12.2004.
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
ToolEvent = Base.extend({
	beans: true,
	initialize: function(tool, type, modifiers) {
		// super(modifiers);
		this.tool = tool;
		this.type = type;
	},

	toString: function() {
		return '{ type: ' + type 
		+ ', point: ' + this.point
		+ ', count: ' + this.count
		+ ', modifiers: ' + this.modifiers
		+ ' }';
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
	 * mouse when the event was fired. In case of the mouse-up event, the
	 * difference to the mouse-down position is returned.
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
		case 'MOUSE_DOWN':
		case 'MOUSE_UP':
			// Return downCount for both mouse down and up, since
			// the count is the same.
			return this.tool.downCount;
		default:
			return this.tool.count;
		}
	},

	setCount: function(count) {
		switch (this.type) {
		case 'MOUSE_DOWN':
		case 'MOUSE_UP':
			this.tool.downCount = count;
			break;
		default:
			this.tool.count = count;
			break;
		}
	},

	// TODO: implement hitTest first
	// getItem: function() {
	// 	if (this.item == null) {
	// 		var result = Doc.getActiveDocument().hitTest(this.getPoint());
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
});
