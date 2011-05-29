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

var Tool = this.Tool = Base.extend({
	/** @lends Tool# */

	beans: true,

	// DOCS: rewrite Tool constructor explanation
	/**
	 * Initializes the tool's settings, so a new tool can be assigned to it
	 * 
	 * @constructs Tool
	 *
	 * @class The Tool object refers to a script that the user can interact with
	 * by using the mouse and keyboard and can be accessed through the global
	 * {@code tool} variable. All its properties are also available in the paper
	 * scope.
	 * 
	 * The global {@code tool} variable only exists in scripts that contain mouse
	 * handler functions ({@link #onMouseMove}, {@link #onMouseDown},
	 * {@link #onMouseDrag}, {@link #onMouseUp}) or a keyboard handler
	 * function ({@link #onKeyDown}, {@link #onKeyUp}).
	 * 
	 * Example code:
	 * <pre>
	 * var path;
	 * 
	 * // Only execute onMouseDrag when the mouse
	 * // has moved at least 10 points:
	 * tool.distanceThreshold = 10;
	 * 
	 * function onMouseDown(event) {
	 * 	// Create a new path every time the mouse is clicked
	 * 	path = new Path();
	 * 	path.strokeColor = 'black';
	 * }
	 * 
	 * function onMouseDrag(event) {
	 * 	// Add a point to the path every time the mouse is dragged
	 * 	path.lineTo(event.point);
	 * }
	 * </pre>
	 */
	initialize: function(handlers, scope) {
		this._scope = scope;
		this._firstMove = true;
		this._count = 0;
		this._downCount = 0;
		for (var i in handlers)
			this[i] = handlers[i];
	},

	/**
	 * The fixed time delay in milliseconds between each call to the
	 * {@link #onMouseDrag} event. Setting this to an interval means the
	 * {@link #onMouseDrag} event is called repeatedly after the initial
	 * {@link #onMouseDown} until the user releases the mouse.
	 * 
	 * @type Number
	 */
	eventInterval: null,

	/**
	 * The minimum distance the mouse has to drag before firing the onMouseDrag
	 * event, since the last onMouseDrag event.
	 * 
	 * @type Number
	 * @bean
	 */
	getMinDistance: function() {
		return this._minDistance;
	},

	setMinDistance: function(minDistance) {
		this._minDistance = minDistance;
		if (this._minDistance != null && this._maxDistance != null
				&& this._minDistance > this._maxDistance) {
			this._maxDistance = this._minDistance;
		}
	},

	/**
	 * The maximum distance the mouse has to drag before firing the onMouseDrag
	 * event, since the last onMouseDrag event.
	 * 
	 * @type Number
	 * @bean
	 */
	getMaxDistance: function() {
		return this._maxDistance;
	},

	setMaxDistance: function(maxDistance) {
		this._maxDistance = maxDistance;
		if (this._minDistance != null && this._maxDistance != null
				&& this._maxDistance < this._minDistance) {
			this._minDistance = maxDistance;
		}
	},

	// DOCS: document Tool#fixedDistance
	/**
	 * @type Number
	 * @bean
	 */
	getFixedDistance: function() {
		return this._minDistance == this._maxDistance
			? this._minDistance : null;
	},

	setFixedDistance: function(distance) {
		this._minDistance = distance;
		this._maxDistance = distance;
	},

	/**
	 * {@grouptitle Mouse Event Handlers}
	 * 
	 * The function to be called when the mouse button is pushed down. The
	 * function receives a {@link ToolEvent} object which contains information
	 * about the mouse event.
	 * 
	 * @example
	 * function onMouseDown(event) {
	 * 	// the position of the mouse in project coordinates:
	 * 	console.log(event.point);
	 * }
	 * 
	 * @name Tool#onMouseDown
	 * @property
	 * @type function
	 */

	/**
	 * The function to be called when the mouse position changes while the mouse
	 * is being dragged. The function receives a {@link ToolEvent} object which
	 * contains information about the mouse event.
	 * 
	 * This function can also be called periodically while the mouse doesn't
	 * move by setting the {@link #eventInterval}
	 * 
	 * @example
	 * function onMouseDrag(event) {
	 * 	// the position of the mouse in project coordinates
	 * 	console.log(event.point);
	 * }
	 * 
	 * @name Tool#onMouseDrag
	 * @property
	 * @type function
	 */

	/**
	 * The function to be called when the tool is selected and the mouse moves
	 * within the document. The function receives a {@link ToolEvent} object
	 * which contains information about the mouse event.
	 * 
	 * @example
	 * function onMouseMove(event) {
	 * 	// the position of the mouse in project coordinates
	 * 	console.log(event.point);
	 * }
	 * @name Tool#onMouseMove
	 * @property
	 * @type function
	 */

	/**
	 * The function to be called when the mouse button is released. The function
	 * receives a {@link ToolEvent} object which contains information about the
	 * mouse event.
	 * 
	 * @example
	 * function onMouseUp(event) {
	 * 	// the position of the mouse in project coordinates
	 * 	console.log(event.point);
	 * }
	 * @name Tool#onMouseUp
	 * @property
	 * @type function
	 */

	/**
	 * {@grouptitle Keyboard Event Handlers}
	 * 
	 * The function to be called when the user presses a key on the keyboard.
	 * The function receives a {@link KeyEvent} object which contains
	 * information about the keyboard event.
	 * If the function returns {@code false}, the keyboard event will be
	 * prevented from bubbling up. This can be used for example to stop the
	 * window from scrolling, when you need the user to interact with arrow
	 * keys.
	 * 
	 * @example
	 * function onKeyDown(event) {
	 * 	if(event.key == 'space') {
	 * 		console.log('The spacebar was pressed!');
	 * 	}
	 * }
	 * @name Tool#onKeyDown
	 * @property
	 * @type Function
	 */

	/**
	 * The function to be called when the user releases a key on the keyboard.
	 * The function receives a {@link KeyEvent} object which contains
	 * information about the keyboard event.
	 * If the function returns {@code false}, the keyboard event will be
	 * prevented from bubbling up. This can be used for example to stop the
	 * window from scrolling, when you need the user to interact with arrow
	 * keys.
	 * 
	 * @example
	 * function onKeyUp(event) {
	 * 	if(event.key == 'space') {
	 * 		console.log('The spacebar was released!');
	 * 	}
	 * }
	 *
	 * @name Tool#onKeyUp
	 * @property
	 * @type Function
	 */

	updateEvent: function(type, pt, minDistance, maxDistance, start,
			needsChange, matchMaxDistance) {
		if (!start) {
			if (minDistance != null || maxDistance != null) {
				var minDist = minDistance != null ? minDistance : 0;
				var vector = pt.subtract(this._point);
				var distance = vector.getLength();
				if (distance < minDist)
					return false;
				// Produce a new point on the way to pt if pt is further away
				// than maxDistance
				var maxDist = maxDistance != null ? maxDistance : 0;
				if (maxDist != 0) {
					if (distance > maxDist) {
						pt = this._point.add(vector.normalize(maxDist));
					} else if (matchMaxDistance) {
						return false;
					}
				}
			}
			if (needsChange && pt.equals(this._point))
				return false;
		}
		this._lastPoint = this._point;
		this._point = pt;
		switch (type) {
		case 'mousedown':
			this._lastPoint = this._downPoint;
			this._downPoint = this._point;
			this._downCount++;
			break;
		case 'mouseup':
			// Mouse up events return the down point for last point, so delta is
			// spanning over the whole drag.
			this._lastPoint = this._downPoint;
			break;
		}
		this._count = start ? 0 : this._count + 1;
		return true;
	},

	onHandleEvent: function(type, pt, event) {
		paper = this._scope;
		switch (type) {
		case 'mousedown':
			this.updateEvent(type, pt, null, null, true, false, false);
			if (this.onMouseDown)
				this.onMouseDown(new ToolEvent(this, type, event));
			break;
		case 'mousedrag':
			// In order for idleInterval drag events to work, we need to not
			// check the first call for a change of position. Subsequent calls
			// required by min/maxDistance functionality will require it,
			// otherwise this might loop endlessly.
			var needsChange = false,
			// If the mouse is moving faster than maxDistance, do not produce
			// events for what is left after the first event is generated in
			// case it is shorter than maxDistance, as this would produce weird
			// results. matchMaxDistance controls this.
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
			// If the last mouse drag happened in a different place, call mouse
			// drag first, then mouse up.
			if ((this._point.x != pt.x || this._point.y != pt.y)
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
			this._firstMove = true;
			break;
		case 'mousemove':
			while (this.updateEvent(type, pt, this.minDistance,
					this.maxDistance, this._firstMove, true, false)) {
				if (this.onMouseMove)
					this.onMouseMove(new ToolEvent(this, type, event));
				this._firstMove = false;
			}
			break;
		}
	}
});
