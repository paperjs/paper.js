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

import { Event } from '../internal.ts'
import type { Point } from '../basic/Point.ts'
import type { Item } from '../item/Item.ts'
import type { Tool } from './Tool.ts'

/**
 * The ToolEvent object is received by the {@link Tool}'s mouse event handlers
 * {@link Tool#onMouseDown}, {@link Tool#onMouseDrag},
 * {@link Tool#onMouseMove} and {@link Tool#onMouseUp}. The ToolEvent
 * object is the only parameter passed to these functions and contains
 * information about the mouse event.
 */
export class ToolEvent extends Event {
  /**
   * The type of tool event.
   *
   * @values 'mousedown', 'mouseup', 'mousemove', 'mousedrag'
   */
  declare type: string

  /**
   * The tool that fired the event.
   */
  tool: Tool

  // The values set on the event, which override the ones of the tool:
  #point: Point
  #lastPoint: Point
  #downPoint: Point
  #middlePoint: Point
  #delta: Point
  #velocity: Point
  #elapsed: number
  // Have ToolEvent#item fall back to returning null, not undefined.
  #item: Item = null

  constructor(tool: Tool, type: string, event: globalThis.Event) {
    super(event)
    this.tool = tool
    this.type = type
  }

  // Convenience method to allow local overrides of point values.
  // See application below.
  #choosePoint(point: Point, toolPoint: Point): Point {
    return point ? point : toolPoint ? toolPoint.clone() : null
  }

  /**
   * The position of the mouse in project coordinates when the event was
   * fired.
   *
   * @example
   * function onMouseDrag(event) {
   *     // the position of the mouse when it is dragged
   *     console.log(event.point);
   * }
   *
   * function onMouseUp(event) {
   *     // the position of the mouse when it is released
   *     console.log(event.point);
   * }
   */
  get point(): Point {
    return this.#choosePoint(this.#point, this.tool._point)
  }

  set point(point: Point) {
    this.#point = point
  }

  /**
   * The position of the mouse in project coordinates when the previous
   * event was fired.
   */
  get lastPoint(): Point {
    return this.#choosePoint(this.#lastPoint, this.tool._lastPoint)
  }

  set lastPoint(lastPoint: Point) {
    this.#lastPoint = lastPoint
  }

  /**
   * The position of the mouse in project coordinates when the mouse button
   * was last clicked.
   */
  get downPoint(): Point {
    return this.#choosePoint(this.#downPoint, this.tool._downPoint)
  }

  set downPoint(downPoint: Point) {
    this.#downPoint = downPoint
  }

  /**
   * The point in the middle between {@link #lastPoint} and
   * {@link #point}. This is a useful position to use when creating
   * artwork based on the moving direction of the mouse, as returned by
   * {@link #delta}.
   */
  get middlePoint(): Point {
    // For explanations, see delta
    if (!this.#middlePoint && this.tool._lastPoint) {
      // (point + lastPoint) / 2
      return this.tool._point.add(this.tool._lastPoint).divide(2)
    }
    return this.#middlePoint
  }

  set middlePoint(middlePoint: Point) {
    this.#middlePoint = middlePoint
  }

  /**
   * The difference between the current position and the last position of the
   * mouse when the event was fired. In case of the mouseup event, the
   * difference to the mousedown position is returned.
   */
  get delta(): Point {
    // Do not put the calculated delta into delta, since this only reserved
    // for overriding event.delta.
    // Instead, keep calculating the delta each time, so the result can be
    // directly modified by the script without changing the internal values.
    // We could cache this and use clone, but this is almost as fast...
    return !this.#delta && this.tool._lastPoint
      ? this.tool._point.subtract(this.tool._lastPoint)
      : this.#delta
  }

  set delta(delta: Point) {
    this.#delta = delta
  }

  /**
   * The velocity of the mouse, in points per second: the distance it moved
   * since the last tool event, divided by the time between them, so it
   * points in the direction of the move, and its length is the speed. It
   * stays even when the system misses a mouse report. The events that
   * {@link Tool#maxDistance} adds along one move share its velocity, and the
   * repeats of {@link Tool#eventInterval} have none. On mousedown, and when
   * no time passed, it's zero.
   */
  get velocity(): Point {
    return this.#velocity ?? this.tool._velocity.clone()
  }

  set velocity(velocity: Point) {
    this.#velocity = velocity
  }

  /**
   * The time since the last tool event, in seconds, measured between the
   * reports of the mouse as {@link #velocity} is: the events that
   * {@link Tool#maxDistance} adds along one move share it, and the repeats
   * of {@link Tool#eventInterval} have the interval. It's zero on the first
   * event.
   */
  get elapsed(): number {
    return this.#elapsed ?? this.tool._elapsed
  }

  set elapsed(elapsed: number) {
    this.#elapsed = elapsed
  }

  /**
   * The number of times the mouse event was fired.
   */
  get count(): number {
    return this.tool[this.#getCountName()]
  }

  set count(count: number) {
    this.tool[this.#getCountName()] = count
  }

  #getCountName(): '_downCount' | '_moveCount' {
    // Use downCount for both mouse down and up, since the count is the
    // same.
    return /^mouse(down|up)$/.test(this.type) ? '_downCount' : '_moveCount'
  }

  /**
   * The item at the position of the mouse (if any).
   *
   * If the item is contained within one or more {@link Group} or
   * {@link CompoundPath} items, the most top level group or compound path
   * that it is contained within is returned.
   */
  get item(): Item {
    if (!this.#item) {
      const result = this.tool.scope.project.hitTest(this.point)
      if (result) {
        let { item } = result
        // Find group parent, but exclude layers
        let parent = item._parent
        while (/^(Group|CompoundPath)$/.test(parent.className)) {
          item = parent
          parent = parent._parent
        }
        this.#item = item
      }
    }
    return this.#item
  }

  set item(item: Item) {
    this.#item = item
  }

  /**
   * @return a string representation of the tool event
   */
  toString(): string {
    return (
      `{ type: ${this.type}, point: ${this.point}, ` +
      `count: ${this.count}, modifiers: ${this.modifiers} }`
    )
  }
}
