/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2020, Jürg Lehni & Jonathan Puckey
 * http://juerglehni.com/ & https://puckey.studio/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name Tool
 *
 * @class The Tool object refers to a script that the user can interact with by
 *     using the mouse and keyboard and can be accessed through the global
 *     `tool` variable. All its properties are also available in the paper
 *     scope.
 *
 * The global `tool` variable only exists in scripts that contain mouse handler
 * functions ({@link #onMouseMove}, {@link #onMouseDown}, {@link #onMouseDrag},
 * {@link #onMouseUp}) or a keyboard handler function ({@link #onKeyDown},
 * {@link #onKeyUp}).
 *
 * @classexample {@paperscript height=300}
 * var path;
 *
 * // Only execute onMouseDrag when the mouse
 * // has moved at least 10 points:
 * tool.minDistance = 10;
 *
 * tool.onMouseDown = function(event) {
 *     // Create a new path every time the mouse is clicked
 *     path = new Path();
 *     path.add(event.point);
 *     path.strokeColor = 'black';
 * }
 *
 * tool.onMouseDrag = function(event) {
 *     // Add a point to the path every time the mouse is dragged
 *     path.add(event.point);
 * }
 */
var Tool = PaperScopeItem.extend(/** @lends Tool# */{
    _class: 'Tool',
    _list: 'tools',
    // TODO: This should be `activeTool` instead?
    _reference: 'tool',
    _events: ['onMouseDown', 'onMouseUp', 'onMouseDrag', 'onMouseMove',
            'onActivate', 'onDeactivate', 'onEditOptions', 'onKeyDown',
            'onKeyUp'],

    /**
     * The scope that this tool belongs to.
     *
     * @name Tool#scope
     * @property
     * @type PaperScope
     * @readonly
     */

    // DOCS: rewrite Tool constructor explanation
    initialize: function Tool(props) {
        PaperScopeItem.call(this);
        // -1 so first event is 0:
        this._moveCount = -1;
        this._downCount = -1;
        this.set(props);
    },

    /**
     * Activates this tool, meaning {@link PaperScope#tool} will
     * point to it and it will be the one that receives tool events.
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
     * @bean
     * @type Number
     */
    getMinDistance: function() {
        return this._minDistance;
    },

    setMinDistance: function(minDistance) {
        this._minDistance = minDistance;
        if (minDistance != null && this._maxDistance != null
                && minDistance > this._maxDistance) {
            this._maxDistance = minDistance;
        }
    },

    /**
     * The maximum distance the mouse has to drag before firing the onMouseDrag
     * event, since the last onMouseDrag event.
     *
     * @bean
     * @type Number
     */
    getMaxDistance: function() {
        return this._maxDistance;
    },

    setMaxDistance: function(maxDistance) {
        this._maxDistance = maxDistance;
        if (this._minDistance != null && maxDistance != null
                && maxDistance < this._minDistance) {
            this._minDistance = maxDistance;
        }
    },

    /**
     * The interval in milliseconds at which the onMouseDrag event fires again
     * while the mouse button is held, also when the mouse doesn't move. The
     * repeated events are at the last point, with a zero
     * {@link ToolEvent#delta}. `null`, the default, or anything up to 0 turns
     * it off.
     *
     * @bean
     * @type Number
     * @default null
     *
     * @example
     * // Fire the onMouseDrag event 10 times a second, while the mouse button
     * // is held:
     * tool.eventInterval = 100;
     */
    getEventInterval: function() {
        return this._eventInterval;
    },

    setEventInterval: function(interval) {
        this._eventInterval = interval;
    },

    // DOCS: document Tool#fixedDistance
    /**
     * @bean
     * @type Number
     */
    getFixedDistance: function() {
        return this._minDistance == this._maxDistance
            ? this._minDistance : null;
    },

    setFixedDistance: function(distance) {
        this._minDistance = this._maxDistance = distance;
    },

    /**
     * {@grouptitle Mouse Event Handlers}
     *
     * The function to be called when the mouse button is pushed down. The
     * function receives a {@link ToolEvent} object which contains information
     * about the tool event.
     *
     * @name Tool#onMouseDown
     * @property
     * @type ?Function
     *
     * @example {@paperscript}
     * // Creating circle shaped paths where the user presses the mouse button:
     * tool.onMouseDown = function(event) {
     *     // Create a new circle shaped path with a radius of 10
     *     // at the position of the mouse (event.point):
     *     var path = new Path.Circle({
     *         center: event.point,
     *         radius: 10,
     *         fillColor: 'black'
     *     });
     * }
     */

    /**
     * The function to be called when the mouse position changes while the mouse
     * is being dragged. The function receives a {@link ToolEvent} object which
     * contains information about the tool event.
     *
     * @name Tool#onMouseDrag
     * @property
     * @type ?Function
     *
     * @example {@paperscript}
     * // Draw a line by adding a segment to a path on every mouse drag event:
     *
     * // Create an empty path:
     * var path = new Path({
     *     strokeColor: 'black'
     * });
     *
     * tool.onMouseDrag = function(event) {
     *     // Add a segment to the path at the position of the mouse:
     *     path.add(event.point);
     * }
     */

    /**
     * The function to be called the mouse moves within the project view. The
     * function receives a {@link ToolEvent} object which contains information
     * about the tool event.
     *
     * While the mouse button is held down, the tool calls {@link #onMouseDrag}
     * instead, if it defines one, and `onMouseMove` only otherwise.
     *
     * @name Tool#onMouseMove
     * @property
     * @type ?Function
     *
     * @example {@paperscript}
     * // Moving a path to the position of the mouse:
     *
     * // Create a circle shaped path with a radius of 10 at {x: 0, y: 0}:
     * var path = new Path.Circle({
     *     center: [0, 0],
     *     radius: 10,
     *     fillColor: 'black'
     * });
     *
     * tool.onMouseMove = function(event) {
     *     // Whenever the user moves the mouse, move the path
     *     // to that position:
     *     path.position = event.point;
     * }
     */

    /**
     * The function to be called when the mouse button is released. The function
     * receives a {@link ToolEvent} object which contains information about the
     * tool event.
     *
     * @name Tool#onMouseUp
     * @property
     * @type ?Function
     *
     * @example {@paperscript}
     * // Creating circle shaped paths where the user releases the mouse:
     * tool.onMouseUp = function(event) {
     *     // Create a new circle shaped path with a radius of 10
     *     // at the position of the mouse (event.point):
     *     var path = new Path.Circle({
     *         center: event.point,
     *         radius: 10,
     *         fillColor: 'black'
     *     });
     * }
     */

    /**
     * {@grouptitle Keyboard Event Handlers}
     *
     * The function to be called when the user presses a key on the keyboard.
     * The function receives a {@link KeyEvent} object which contains
     * information about the keyboard event.
     *
     * If the function returns `false`, the keyboard event will be prevented
     * from bubbling up. This can be used for example to stop the window from
     * scrolling, when you need the user to interact with arrow keys.
     *
     * @name Tool#onKeyDown
     * @property
     * @type ?Function
     *
     * @example {@paperscript}
     * // Scaling a path whenever the user presses the space bar:
     *
     * // Create a circle shaped path:
     *     var path = new Path.Circle({
     *         center: new Point(50, 50),
     *         radius: 30,
     *         fillColor: 'red'
     *     });
     *
     * tool.onKeyDown = function(event) {
     *     if (event.key == 'space') {
     *         // Scale the path by 110%:
     *         path.scale(1.1);
     *
     *         // Prevent the key event from bubbling
     *         return false;
     *     }
     * }
     */

    /**
     * The function to be called when the user releases a key on the keyboard.
     * The function receives a {@link KeyEvent} object which contains
     * information about the keyboard event.
     *
     * If the function returns `false`, the keyboard event will be prevented
     * from bubbling up. This can be used for example to stop the window from
     * scrolling, when you need the user to interact with arrow keys.
     *
     * @name Tool#onKeyUp
     * @property
     * @type ?Function
     *
     * @example
     * tool.onKeyUp = function(event) {
     *     if (event.key == 'space') {
     *         console.log('The spacebar was released!');
     *     }
     * }
     */

    /**
     * {@grouptitle Activation Event Handlers}
     *
     * The function to be called when the tool is activated through
     * {@link #activate()}. The function receives the previously active tool,
     * which is the tool itself when it was already active.
     *
     * @name Tool#onActivate
     * @property
     * @type ?Function
     *
     * @example
     * tool.onActivate = function(previous) {
     *     if (previous == tool) {
     *         console.log('The tool was activated again!');
     *     }
     * }
     */

    /**
     * The function to be called when another tool is activated through
     * {@link #activate()} while this one is active, or when this one is
     * removed while active.
     *
     * @name Tool#onDeactivate
     * @property
     * @type ?Function
     */

    /**
     * Private method to handle tool-events, with the properties to add to the
     * tool events, as ToolEffect does.
     *
     * @return {@true if at least one event handler was called}.
     */
    _handleMouseEvent: function(type, event, point, mouse, props) {
        // Update global reference to this scope.
        paper = this._scope;
        // If there is no mousedrag event installed, fall back to mousemove,
        // with which we share the actual event handling code anyhow.
        if (mouse.drag && !this.responds(type))
            type = 'mousemove';
        var move = mouse.move || mouse.drag,
            responds = this.responds(type),
            called = false,
            tool = this,
            // The time and velocity since the last tool event, in seconds and
            // points per second, measured between the mouse reports, so the
            // steps that maxDistance interpolates along the way share them:
            time = event.timeStamp / 1000,
            elapsed = this._time != null ? time - this._time : 0,
            velocity = !mouse.down && this._point && elapsed > 0
                    ? point.subtract(this._point).divide(elapsed)
                    : new Point();
        // Updates the internal tool state, taking into account minDistance and
        // maxDistance and interpolating "fake" events along the moved distance
        // to respect their settings, if necessary.
        // Returns true as long as events should be fired, false when the target
        // is reached.
        function update(minDistance, maxDistance) {
            var pt = point,
                // Set toolPoint to the  previous point for moves or downPoint
                // for clicks, so mouseup has a delta spanning over the full
                // drag. Use the current point if this is the first mousedown,
                // so there's always a delta.
                toolPoint = move ? tool._point : (tool._downPoint || pt);
            if (move) {
                // After first move event was emitted, tool._moveCount = 0, so
                // we need to include 0 in this check.
                if (tool._moveCount >= 0 && pt.equals(toolPoint)) {
                    return false;
                }
                if (toolPoint && (minDistance != null || maxDistance != null)) {
                    var vector = pt.subtract(toolPoint),
                        distance = vector.getLength();
                    if (distance < (minDistance || 0))
                        return false;
                    // Produce a new point on the way to point if point is
                    // further away than maxDistance
                    if (maxDistance) {
                        pt = toolPoint.add(vector.normalize(
                                Math.min(distance, maxDistance)));
                    }
                }
                tool._moveCount++;
            }
            tool._point = pt;
            tool._lastPoint = toolPoint || pt;
            tool._velocity = velocity;
            tool._elapsed = elapsed;
            tool._time = time;
            if (mouse.down) {
                tool._moveCount = -1;
                tool._downPoint = pt;
                tool._downCount++;
            }
            return true;
        }

        function emit() {
            if (responds) {
                called = tool.emit(type,
                        new ToolEvent(tool, type, event).set(props)) || called;
            }
        }

        if (mouse.down) {
            update();
            emit();
            if (this._eventInterval > 0) {
                // Repeat mousedrag at the last point while the mouse is held,
                // until the mouse is released or another tool takes over:
                clearInterval(this._timer);
                this._timer = setInterval(function() {
                    if (tool.isActive()) {
                        paper = tool._scope;
                        tool._lastPoint = tool._point;
                        // Not moving, but keep the time of the last report:
                        tool._velocity = new Point();
                        tool._elapsed = tool._eventInterval / 1000;
                        tool._moveCount++;
                        if (tool.responds('mousedrag')) {
                            tool.emit('mousedrag',
                                    new ToolEvent(tool, 'mousedrag', event));
                        }
                    } else {
                        clearInterval(tool._timer);
                    }
                }, this._eventInterval);
            }
        } else if (mouse.up) {
            clearInterval(this._timer);
            update(null, this._maxDistance);
            emit();
        } else if (responds) {
            while (update(this._minDistance, this._maxDistance))
                emit();
        }
        return called;
    }
    /**
     * {@grouptitle Event Handling}
     *
     * Attach an event handler to the tool.
     *
     * @name Tool#on
     * @function
     * @param {String} type the event type: {@values 'mousedown', 'mouseup',
     *     'mousedrag', 'mousemove', 'keydown', 'keyup'}
     * @param {Function} function the function to be called when the event
     *     occurs, receiving a {@link ToolEvent} object as its sole argument
     * @return {Tool} this tool itself, so calls can be chained
     */
    /**
     * Attach one or more event handlers to the tool.
     *
     * @name Tool#on
     * @function
     * @param {Object} param an object literal containing one or more of the
     *     following properties: {@values mousedown, mouseup, mousedrag,
     *     mousemove, keydown, keyup}
     * @return {Tool} this tool itself, so calls can be chained
     */

    /**
     * Detach an event handler from the tool.
     *
     * @name Tool#off
     * @function
     * @param {String} type the event type: {@values 'mousedown', 'mouseup',
     *     'mousedrag', 'mousemove', 'keydown', 'keyup'}
     * @param {Function} function the function to be detached
     * @return {Tool} this tool itself, so calls can be chained
     */
    /**
     * Detach one or more event handlers from the tool.
     *
     * @name Tool#off
     * @function
     * @param {Object} param an object literal containing one or more of the
     *     following properties: {@values mousedown, mouseup, mousedrag,
     *     mousemove, keydown, keyup}
     * @return {Tool} this tool itself, so calls can be chained
     */

    /**
     * Emit an event on the tool.
     *
     * @name Tool#emit
     * @function
     * @param {String} type the event type: {@values 'mousedown', 'mouseup',
     *     'mousedrag', 'mousemove', 'keydown', 'keyup'}
     * @param {Object} event an object literal containing properties describing
     * the event
     * @return {Boolean} {@true if the event had listeners}
     */

    /**
     * Check if the tool has one or more event handlers of the specified type.
     *
     * @name Tool#responds
     * @function
     * @param {String} type the event type: {@values 'mousedown', 'mouseup',
     *     'mousedrag', 'mousemove', 'keydown', 'keyup'}
     * @return {Boolean} {@true if the tool has one or more event handlers of
     * the specified type}
     */
});
