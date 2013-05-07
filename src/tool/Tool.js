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
 * @name Tool
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
 * @classexample
 * var path;
 *
 * // Only execute onMouseDrag when the mouse
 * // has moved at least 10 points:
 * tool.distanceThreshold = 10;
 *
 * function onMouseDown(event) {
 * 	// Create a new path every time the mouse is clicked
 * 	path = new Path();
 * 	path.add(event.point);
 * 	path.strokeColor = 'black';
 * }
 *
 * function onMouseDrag(event) {
 * 	// Add a point to the path every time the mouse is dragged
 * 	path.add(event.point);
 * }
 */
var Tool = this.Tool = PaperScopeItem.extend(/** @lends Tool# */{
	_list: 'tools',
	_reference: '_tool', // PaperScope has accessor for #tool
	_events: [ 'onActivate', 'onDeactivate', 'onEditOptions',
			'onMouseDown', 'onMouseUp', 'onMouseDrag', 'onMouseMove',
			'onKeyDown', 'onKeyUp' ],

	// DOCS: rewrite Tool constructor explanation
	initialize: function(props) {
		this.base();
		this._firstMove = true;
		this._count = 0;
		this._downCount = 0;
		this._set(props);
	},

	/**
	 * Activates this tool, meaning {@link PaperScope#tool} will
	 * point to it and it will be the one that recieves mouse events.
	 *
	 * @name Tool#activate
	 * @function
	 */

	/**
	 * Removes this tool from the {@link PaperScope#tools} list.
	 *
	 * @name Tool#remove
	 * @function
	 */

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
	 * @name Tool#onMouseDown
	 * @property
	 * @type Function
	 *
	 * @example {@paperscript}
	 * // Creating circle shaped paths where the user presses the mouse button:
	 * function onMouseDown(event) {
	 * 	// Create a new circle shaped path with a radius of 10
	 * 	// at the position of the mouse (event.point):
	 * 	var path = new Path.Circle({
	 * 		center: event.point,
	 * 		radius: 10,
	 * 		fillColor: 'black'
	 * 	});
	 * }
	 */

	/**
	 * The function to be called when the mouse position changes while the mouse
	 * is being dragged. The function receives a {@link ToolEvent} object which
	 * contains information about the mouse event.
	 *
	 * @name Tool#onMouseDrag
	 * @property
	 * @type Function
	 *
	 * @example {@paperscript}
	 * // Draw a line by adding a segment to a path on every mouse drag event:
	 *
	 * // Create an empty path:
	 * var path = new Path({
	 * 	strokeColor: 'black'
	 * });
	 * 
	 * function onMouseDrag(event) {
	 * 	// Add a segment to the path at the position of the mouse:
	 * 	path.add(event.point);
	 * }
	 */

	/**
	 * The function to be called the mouse moves within the project view. The
	 * function receives a {@link ToolEvent} object which contains information
	 * about the mouse event.
	 *
	 * @name Tool#onMouseMove
	 * @property
	 * @type Function
	 *
	 * @example {@paperscript}
	 * // Moving a path to the position of the mouse:
	 *
	 * // Create a circle shaped path with a radius of 10 at {x: 0, y: 0}:
	 * var path = new Path.Circle({
	 * 	center: [0, 0],
	 * 	radius: 10,
	 * 	fillColor: 'black'
	 * });
	 * 
	 * function onMouseMove(event) {
	 * 	// Whenever the user moves the mouse, move the path
	 * 	// to that position:
	 * 	path.position = event.point;
	 * }
	 */

	/**
	 * The function to be called when the mouse button is released. The function
	 * receives a {@link ToolEvent} object which contains information about the
	 * mouse event.
	 *
	 * @name Tool#onMouseUp
	 * @property
	 * @type Function
	 *
	 * @example {@paperscript}
	 * // Creating circle shaped paths where the user releases the mouse:
	 * function onMouseUp(event) {
	 * 	// Create a new circle shaped path with a radius of 10
	 * 	// at the position of the mouse (event.point):
	 * 	var path = new Path.Circle({
	 * 		center: event.point,
	 * 		radius: 10,
	 * 		fillColor: 'black'
	 * 	});
	 * }
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
	 * @name Tool#onKeyDown
	 * @property
	 * @type Function
	 *
	 * @example {@paperscript}
	 * // Scaling a path whenever the user presses the space bar:
	 *
	 * // Create a circle shaped path:
	 * 	var path = new Path.Circle({
	 * 		center: new Point(50, 50),
	 * 		radius: 30,
	 * 		fillColor: 'red'
	 * 	});
	 *
	 * function onKeyDown(event) {
	 * 	if (event.key == 'space') {
	 * 		// Scale the path by 110%:
	 * 		path.scale(1.1);
	 *
	 * 		// Prevent the key event from bubbling
	 * 		return false;
	 * 	}
	 * }
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
	 * @name Tool#onKeyUp
	 * @property
	 * @type Function
	 *
	 * @example
	 * function onKeyUp(event) {
	 * 	if (event.key == 'space') {
	 * 		console.log('The spacebar was released!');
	 * 	}
	 * }
	 */

	_updateEvent: function(type, point, minDistance, maxDistance, start,
			needsChange, matchMaxDistance) {
		if (!start) {
			if (minDistance != null || maxDistance != null) {
				var minDist = minDistance != null ? minDistance : 0,
					vector = point.subtract(this._point),
					distance = vector.getLength();
				if (distance < minDist)
					return false;
				// Produce a new point on the way to point if point is further
				// away than maxDistance
				var maxDist = maxDistance != null ? maxDistance : 0;
				if (maxDist != 0) {
					if (distance > maxDist) {
						point = this._point.add(vector.normalize(maxDist));
					} else if (matchMaxDistance) {
						return false;
					}
				}
			}
			if (needsChange && point.equals(this._point))
				return false;
		}
		// Make sure mousemove events have lastPoint set even for the first move
		// so event.delta is always defined for them.
		// TODO: Decide wether mousedown also should always have delta set.
		this._lastPoint = start && type == 'mousemove' ? point : this._point;
		this._point = point;
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

	fire: function(type, event) {
		// Override Callback#fire() so we can handle items marked in removeOn*()
		// calls first,.
		var sets = Tool._removeSets;
		if (sets) {
			// Always clear the drag set on mouseup
			if (type === 'mouseup')
				sets.mousedrag = null;
			var set = sets[type];
			if (set) {
				for (var id in set) {
					var item = set[id];
					// If we remove this item, we also need to erase it from all
					// other sets.
					for (var key in sets) {
						var other = sets[key];
						if (other && other != set)
							delete other[item._id];
					}
					item.remove();
				}
				sets[type] = null;
			}
		}
		return this.base(type, event);
	},

	_onHandleEvent: function(type, point, event) {
		// Update global reference to this scope.
		paper = this._scope;
		// Now handle event callbacks
		var called = false;
		switch (type) {
		case 'mousedown':
			this._updateEvent(type, point, null, null, true, false, false);
			if (this.responds(type))
				called = this.fire(type, new ToolEvent(this, type, event));
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
			while (this._updateEvent(type, point, this.minDistance,
					this.maxDistance, false, needsChange, matchMaxDistance)) {
				if (this.responds(type))
					called = this.fire(type, new ToolEvent(this, type, event));
				needsChange = true;
				matchMaxDistance = true;
			}
			break;
		case 'mouseup':
			// If the last mouse drag happened in a different place, call mouse
			// drag first, then mouse up.
			if (!point.equals(this._point)
					&& this._updateEvent('mousedrag', point, this.minDistance,
							this.maxDistance, false, false, false)) {
				if (this.responds('mousedrag'))
					called = this.fire('mousedrag',
							new ToolEvent(this, type, event));
			}
			this._updateEvent(type, point, null, this.maxDistance, false,
					false, false);
			if (this.responds(type))
				called = this.fire(type, new ToolEvent(this, type, event));
			// Start with new values for 'mousemove'
			this._updateEvent(type, point, null, null, true, false, false);
			this._firstMove = true;
			break;
		case 'mousemove':
			while (this._updateEvent(type, point, this.minDistance,
					this.maxDistance, this._firstMove, true, false)) {
				if (this.responds(type))
					called = this.fire(type, new ToolEvent(this, type, event));
				this._firstMove = false;
			}
			break;
		}
		// Return if a callback was called or not.
		return called;
	}
	/**
	 * {@grouptitle Event Handling}
	 * 
	 * Attach an event handler to the tool.
	 *
	 * @name Tool#on
	 * @function
	 * @param {String('mousedown', 'mouseup', 'mousedrag', 'mousemove',
	 * 'keydown', 'keyup')} type the event type
	 * @param {Function} function The function to be called when the event
	 * occurs
	 */
	/**
	 * Attach one or more event handlers to the tool.
	 *
	 * @name Tool#on^2
	 * @function
	 * @param {Object} param An object literal containing one or more of the
	 * following properties: {@code mousedown, mouseup, mousedrag, mousemove,
	 * keydown, keyup}.
	 */

	/**
	 * Detach an event handler from the tool.
	 *
	 * @name Tool#detach
	 * @function
	 * @param {String('mousedown', 'mouseup', 'mousedrag', 'mousemove',
	 * 'keydown', 'keyup')} type the event type
	 * @param {Function} function The function to be detached
	 */
	/**
	 * Detach one or more event handlers from the tool.
	 *
	 * @name Tool#detach^2
	 * @function
	 * @param {Object} param An object literal containing one or more of the
	 * following properties: {@code mousedown, mouseup, mousedrag, mousemove,
	 * keydown, keyup}
	 */

	/**
	 * Fire an event on the tool.
	 *
	 * @name Tool#fire
	 * @function
	 * @param {String('mousedown', 'mouseup', 'mousedrag', 'mousemove',
	 * 'keydown', 'keyup')} type the event type
	 * @param {Object} event An object literal containing properties describing
	 * the event.
	 */

	/**
	 * Check if the tool has one or more event handlers of the specified type.
	 *
	 * @name Tool#responds
	 * @function
	 * @param {String('mousedown', 'mouseup', 'mousedrag', 'mousemove',
	 * 'keydown', 'keyup')} type the event type
	 * @return {Boolean} {@true if the tool has one or more event handlers of
	 * the specified type}
	 */
});
