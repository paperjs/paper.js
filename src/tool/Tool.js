/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2016, Juerg Lehni & Jonathan Puckey
 * http://scratchdisk.com/ & http://jonathanpuckey.com/
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
 * @classexample
 * var path;
 *
 * // Only execute onMouseDrag when the mouse
 * // has moved at least 10 points:
 * tool.distanceThreshold = 10;
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
    _reference: 'tool',
    _events: ['onMouseDown', 'onMouseUp', 'onMouseDrag', 'onMouseMove',
            'onActivate', 'onDeactivate', 'onEditOptions', 'onKeyDown',
            'onKeyUp'],

    // DOCS: rewrite Tool constructor explanation
    initialize: function Tool(props) {
        PaperScopeItem.call(this);
        this._firstMove = true;
        this._count = 0;
        this._downCount = 0;
        this._set(props);
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
     * @type Function
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
     * @type Function
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
     * @name Tool#onMouseMove
     * @property
     * @type Function
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
     * @type Function
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
     * @type Function
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
     * @type Function
     *
     * @example
     * tool.onKeyUp = function(event) {
     *     if (event.key == 'space') {
     *         console.log('The spacebar was released!');
     *     }
     * }
     */


    /**
     * Private method to handle tool-events.
     *
     * @return {@true if the default event should be prevented}. This is if at
     *     least one event handler was called and none of the called handlers
     *     wants to enforce the default.
     */
    _handleEvent: function(type, event, point) {
        // Update global reference to this scope.
        paper = this._scope;
        var minDistance = this.minDistance,
            maxDistance = this.maxDistance,
            // In order for idleInterval drag events to work, we need to not
            // check the first call for a change of position. Subsequent calls
            // required by min/maxDistance functionality will require it,
            // otherwise this might loop endlessly.
            needsChange = false,
            // If the mouse is moving faster than maxDistance, do not produce
            // events for what is left after the first event is generated in
            // case it is shorter than maxDistance, as this would produce weird
            // results. matchMaxDistance controls this.
            matchMaxDistance = false,
            called = false, // Has at least one handler been called?
            enforced = false, // Does a handler want to enforce the default?
            tool = this,
            mouse = {};
        // Create a simple lookup object to quickly check for different
        // mouse event types.
        mouse[type.substr(5)] = true;

        function update(start, minDistance, maxDistance) {
            var toolPoint = tool._point,
                pt = point;
            if (start) {
                tool._count = 0;
            } else {
                tool._count++;
                if (minDistance != null || maxDistance != null) {
                    var vector = pt.subtract(toolPoint),
                        distance = vector.getLength();
                    if (distance < (minDistance || 0))
                        return false;
                    // Produce a new point on the way to point if point is
                    // further away than maxDistance
                    if (maxDistance) {
                        if (distance > maxDistance) {
                            pt = toolPoint.add(vector.normalize(maxDistance));
                        } else if (matchMaxDistance) {
                            return false;
                        }
                    }
                }
                if (needsChange && pt.equals(toolPoint))
                    return false;
            }
            // Make sure mousemove events have lastPoint set even for the first
            // move so event.delta is always defined for them.
            // TODO: Decide whether mousedown also should always have delta set.
            tool._lastPoint = start && mouse.move ? pt : toolPoint;
            tool._point = pt;
            if (mouse.down) {
                tool._lastPoint = tool._downPoint;
                tool._downPoint = pt;
                tool._downCount++;
            } else if (mouse.up) {
                // Mouse up events return the down point for last point, so
                // delta is spanning over the whole drag.
                tool._lastPoint = tool._downPoint;
            }
            return true;
        }

        function emit() {
            if (tool.responds(type)) {
                var toolEvent = new ToolEvent(tool, type, event);
                if (tool.emit(type, toolEvent)) {
                    called = true;
                    if (toolEvent._enforced)
                        enforced = true;
                }
            }
        }

        if (mouse.down) {
            update(true);
            emit();
        } else if (mouse.up) {
            update(false, null, maxDistance);
            emit();
            // Start with new values for 'mousemove'
            update(true);
            this._firstMove = true;
        } else {
            // If there is no mousedrag event installed, fall back to mousemove,
            // with which we share the actual event handling code anyhow.
            var drag = mouse.drag && this.responds(type);
            if (!drag)
                type = 'mousemove';
            needsChange = !drag;
            while (update(!drag && this._firstMove, minDistance, maxDistance)) {
                emit();
                if (drag) {
                    needsChange = matchMaxDistance = true;
                } else {
                    this._firstMove = false;
                }
            }
        }
        return called && !enforced;
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
