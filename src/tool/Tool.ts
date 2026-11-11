/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2026, Jürg Lehni & Jonathan Puckey
 * http://juerglehni.com/ & https://puckey.studio/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

import { PaperScopeItem, Point, ToolEvent, defineEvents } from '../internal.ts'
import type { PaperScope } from '../core/PaperScope.ts'
import type { KeyEvent } from '../event/KeyEvent.ts'

type Handler = (this: Tool, ...args: any[]) => any

type ToolHandler = ((this: Tool, event: ToolEvent) => any) | null

type KeyHandler = ((this: Tool, event: KeyEvent) => any) | null

// The properties that the constructor and set() take:
type ToolProps = Partial<
  Pick<
    Tool,
    | 'minDistance'
    | 'maxDistance'
    | 'fixedDistance'
    | 'eventInterval'
    | 'onMouseDown'
    | 'onMouseUp'
    | 'onMouseDrag'
    | 'onMouseMove'
    | 'onKeyDown'
    | 'onKeyUp'
    | 'onActivate'
    | 'onDeactivate'
  >
>

/**
 * The Tool object refers to a script that the user can interact with by
 * using the mouse and keyboard and can be accessed through the global
 * `tool` variable. All its properties are also available in the paper
 * scope.
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
export class Tool extends PaperScopeItem {
  // The state of the mouse that ToolEvent reads, see #_handleMouseEvent():
  _point: Point
  _lastPoint: Point
  _downPoint: Point
  _velocity: Point
  _elapsed: number
  // -1 so first event is 0:
  _moveCount = -1
  _downCount = -1
  #minDistance: number
  #maxDistance: number
  #eventInterval: number
  #time: number
  #timer: ReturnType<typeof setInterval>

  // DOCS: rewrite Tool constructor explanation
  constructor(props?: ToolProps) {
    super()
    this.set(props)
  }

  /**
   * Sets the properties of the passed object literal on the tool.
   *
   * @param props an object describing the properties to set
   */
  set(props: ToolProps): this {
    Object.assign(this, props)
    return this
  }

  /**
   * The minimum distance the mouse has to drag before firing the onMouseDrag
   * event, since the last onMouseDrag event.
   */
  get minDistance(): number {
    return this.#minDistance
  }

  set minDistance(minDistance: number) {
    this.#minDistance = minDistance
    if (
      minDistance != null &&
      this.#maxDistance != null &&
      minDistance > this.#maxDistance
    ) {
      this.#maxDistance = minDistance
    }
  }

  /**
   * The maximum distance the mouse has to drag before firing the onMouseDrag
   * event, since the last onMouseDrag event.
   */
  get maxDistance(): number {
    return this.#maxDistance
  }

  set maxDistance(maxDistance: number) {
    this.#maxDistance = maxDistance
    if (
      this.#minDistance != null &&
      maxDistance != null &&
      maxDistance < this.#minDistance
    ) {
      this.#minDistance = maxDistance
    }
  }

  /**
   * The interval in milliseconds at which the onMouseDrag event fires again
   * while the mouse button is held, also when the mouse doesn't move. The
   * repeated events are at the last point, with a zero
   * {@link ToolEvent#delta}. `null`, the default, or anything up to 0 turns
   * it off.
   *
   * @default null
   *
   * @example
   * // Fire the onMouseDrag event 10 times a second, while the mouse button
   * // is held:
   * tool.eventInterval = 100;
   */
  get eventInterval(): number {
    return this.#eventInterval
  }

  set eventInterval(interval: number) {
    this.#eventInterval = interval
  }

  // DOCS: document Tool#fixedDistance
  get fixedDistance(): number {
    return this.#minDistance == this.#maxDistance ? this.#minDistance : null
  }

  set fixedDistance(distance: number) {
    this.#minDistance = this.#maxDistance = distance
  }

  /**
   * Private method to handle tool-events.
   *
   * @return {@true if at least one event handler was called}.
   */
  _handleMouseEvent(
    type: string,
    event: globalThis.Event,
    point: Point,
    mouse: Record<string, boolean>
  ): boolean {
    // Update global reference to this scope.
    this._scope.activate()
    // If there is no mousedrag event installed, fall back to mousemove,
    // with which we share the actual event handling code anyhow.
    if (mouse.drag && !this.responds(type)) {
      type = 'mousemove'
    }
    const move = mouse.move || mouse.drag
    const responds = this.responds(type)
    let called = false
    // The time and velocity since the last tool event, in seconds and
    // points per second, measured between the mouse reports, so the
    // steps that maxDistance interpolates along the way share them:
    const time = event.timeStamp / 1000
    const elapsed = this.#time != null ? time - this.#time : 0
    const velocity =
      !mouse.down && this._point && elapsed > 0
        ? point.subtract(this._point).divide(elapsed)
        : new Point()

    // Updates the internal tool state, taking into account minDistance and
    // maxDistance and interpolating "fake" events along the moved distance
    // to respect their settings, if necessary.
    // Returns true as long as events should be fired, false when the target
    // is reached.
    const update = (minDistance?: number, maxDistance?: number) => {
      let current = point
      // Set toolPoint to the  previous point for moves or downPoint
      // for clicks, so mouseup has a delta spanning over the full
      // drag. Use the current point if this is the first mousedown,
      // so there's always a delta.
      const toolPoint = move ? this._point : this._downPoint ?? current
      if (move) {
        // After first move event was emitted, tool._moveCount = 0, so
        // we need to include 0 in this check.
        if (this._moveCount >= 0 && current.equals(toolPoint)) {
          return false
        }
        if (toolPoint && (minDistance != null || maxDistance != null)) {
          const vector = current.subtract(toolPoint)
          const distance = vector.length
          if (distance < (minDistance || 0)) {
            return false
          }
          // Produce a new point on the way to point if point is
          // further away than maxDistance
          if (maxDistance) {
            current = toolPoint.add(
              vector.normalize(Math.min(distance, maxDistance))
            )
          }
        }
        this._moveCount++
      }
      this._point = current
      this._lastPoint = toolPoint ?? current
      this._velocity = velocity
      this._elapsed = elapsed
      this.#time = time
      if (mouse.down) {
        this._moveCount = -1
        this._downPoint = current
        this._downCount++
      }
      return true
    }

    const emit = () => {
      if (responds) {
        called = this.emit(type, new ToolEvent(this, type, event)) || called
      }
    }

    if (mouse.down) {
      update()
      emit()
      if (this.#eventInterval > 0) {
        // Repeat mousedrag at the last point while the mouse is held,
        // until the mouse is released or another tool takes over:
        clearInterval(this.#timer)
        this.#timer = setInterval(() => {
          if (this.isActive()) {
            this._scope.activate()
            this._lastPoint = this._point
            // Not moving, but keep the time of the last report:
            this._velocity = new Point()
            this._elapsed = this.#eventInterval / 1000
            this._moveCount++
            if (this.responds('mousedrag')) {
              this.emit('mousedrag', new ToolEvent(this, 'mousedrag', event))
            }
          } else {
            clearInterval(this.#timer)
          }
        }, this.#eventInterval)
      }
    } else if (mouse.up) {
      clearInterval(this.#timer)
      update(null, this.#maxDistance)
      emit()
    } else if (responds) {
      while (update(this.#minDistance, this.#maxDistance)) {
        emit()
      }
    }
    return called
  }

  static {
    Object.assign(this.prototype, {
      _list: 'tools',
      // TODO: This should be `activeTool` instead?
      _reference: 'tool'
    })
    defineEvents(this, {
      onMouseDown: {},
      onMouseUp: {},
      onMouseDrag: {},
      onMouseMove: {},
      onActivate: {},
      onDeactivate: {},
      onEditOptions: {},
      onKeyDown: {},
      onKeyUp: {}
    })
  }
}

// Inherited members and event handlers:
export interface Tool {
  /**
   * The scope that this tool belongs to.
   *
   * @readonly
   */
  get scope(): PaperScope

  /**
   * Activates this tool, meaning {@link PaperScope#tool} will
   * point to it and it will be the one that receives tool events.
   */
  activate(): boolean

  /**
   * Removes this tool from the {@link PaperScope#tools} list.
   */
  remove(): boolean

  /**
   * {@grouptitle Mouse Event Handlers}
   *
   * The function to be called when the mouse button is pushed down. The
   * function receives a {@link ToolEvent} object which contains information
   * about the tool event.
   *
   * @example {@paperscript}
   * // Creating circle shaped paths where the user presses the mouse button:
   * tool.onMouseDown = function(event) {
   *     // Create a new circle shaped path with a radius of 10
   *     // at the position of the mouse (event.point):
   *     var path = Path.circle({
   *         center: event.point,
   *         radius: 10,
   *         fillColor: 'black'
   *     });
   * }
   */
  onMouseDown: ToolHandler

  /**
   * The function to be called when the mouse position changes while the mouse
   * is being dragged. The function receives a {@link ToolEvent} object which
   * contains information about the tool event.
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
  onMouseDrag: ToolHandler

  /**
   * The function to be called the mouse moves within the project view. The
   * function receives a {@link ToolEvent} object which contains information
   * about the tool event.
   *
   * While the mouse button is held down, the tool calls {@link #onMouseDrag}
   * instead, if it defines one, and `onMouseMove` only otherwise.
   *
   * @example {@paperscript}
   * // Moving a path to the position of the mouse:
   *
   * // Create a circle shaped path with a radius of 10 at {x: 0, y: 0}:
   * var path = Path.circle({
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
  onMouseMove: ToolHandler

  /**
   * The function to be called when the mouse button is released. The function
   * receives a {@link ToolEvent} object which contains information about the
   * tool event.
   *
   * @example {@paperscript}
   * // Creating circle shaped paths where the user releases the mouse:
   * tool.onMouseUp = function(event) {
   *     // Create a new circle shaped path with a radius of 10
   *     // at the position of the mouse (event.point):
   *     var path = Path.circle({
   *         center: event.point,
   *         radius: 10,
   *         fillColor: 'black'
   *     });
   * }
   */
  onMouseUp: ToolHandler

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
   * @example {@paperscript}
   * // Scaling a path whenever the user presses the space bar:
   *
   * // Create a circle shaped path:
   *     var path = Path.circle({
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
  onKeyDown: KeyHandler

  /**
   * The function to be called when the user releases a key on the keyboard.
   * The function receives a {@link KeyEvent} object which contains
   * information about the keyboard event.
   *
   * If the function returns `false`, the keyboard event will be prevented
   * from bubbling up. This can be used for example to stop the window from
   * scrolling, when you need the user to interact with arrow keys.
   *
   * @example
   * tool.onKeyUp = function(event) {
   *     if (event.key == 'space') {
   *         console.log('The spacebar was released!');
   *     }
   * }
   */
  onKeyUp: KeyHandler

  /**
   * {@grouptitle Activation Event Handlers}
   *
   * The function to be called when the tool is activated through
   * {@link #activate()}. The function receives the previously active tool,
   * which is the tool itself when it was already active.
   *
   * @example
   * tool.onActivate = function(previous) {
   *     if (previous == tool) {
   *         console.log('The tool was activated again!');
   *     }
   * }
   */
  onActivate: ((this: Tool, previous: Tool) => any) | null

  /**
   * The function to be called when another tool is activated through
   * {@link #activate()} while this one is active, or when this one is
   * removed while active.
   */
  onDeactivate: ((this: Tool) => any) | null

  onEditOptions: Handler | null

  /**
   * {@grouptitle Event Handling}
   *
   * Attach an event handler to the tool.
   *
   * @param type the event type: {@values 'mousedown', 'mouseup',
   *     'mousedrag', 'mousemove', 'keydown', 'keyup'}
   * @param function the function to be called when the event
   *     occurs, receiving a {@link ToolEvent} object as its sole argument
   * @return this tool itself, so calls can be chained
   */
  on(type: string, func: Handler): this
  /**
   * Attach one or more event handlers to the tool.
   *
   * @param param an object literal containing one or more of the
   *     following properties: {@values mousedown, mouseup, mousedrag,
   *     mousemove, keydown, keyup}
   * @return this tool itself, so calls can be chained
   */
  on(param: Record<string, Handler>): this

  /**
   * Detach an event handler from the tool.
   *
   * @param type the event type: {@values 'mousedown', 'mouseup',
   *     'mousedrag', 'mousemove', 'keydown', 'keyup'}
   * @param function the function to be detached
   * @return this tool itself, so calls can be chained
   */
  off(type: string, func?: Handler): this
  /**
   * Detach one or more event handlers from the tool.
   *
   * @param param an object literal containing one or more of the
   *     following properties: {@values mousedown, mouseup, mousedrag,
   *     mousemove, keydown, keyup}
   * @return this tool itself, so calls can be chained
   */
  off(param: Record<string, Handler>): this

  /**
   * Emit an event on the tool.
   *
   * @param type the event type: {@values 'mousedown', 'mouseup',
   *     'mousedrag', 'mousemove', 'keydown', 'keyup'}
   * @param event an object literal containing properties describing
   * the event
   * @return {@true if the event had listeners}
   */
  emit(type: string, event?: any): boolean

  /**
   * Check if the tool has one or more event handlers of the specified type.
   *
   * @param type the event type: {@values 'mousedown', 'mouseup',
   *     'mousedrag', 'mousemove', 'keydown', 'keyup'}
   * @return {@true if the tool has one or more event handlers of
   * the specified type}
   */
  responds(type: string): boolean
}
