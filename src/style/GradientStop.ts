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

import { Base, Color, serialize } from '../internal.ts'
import type { ColorLike } from './Color.ts'
import type { Gradient } from './Gradient.ts'

/**
 * What a gradient stop can be passed as, where a function takes one.
 */
export type GradientStopLike =
  | GradientStop
  | ColorLike
  | [ColorLike, number?]
  | { color?: ColorLike; offset?: number }

// TODO: Support midPoint? (initial tests didn't look nice)
/**
 * The GradientStop object.
 */
export class GradientStop extends Base {
  // Read by Color and the SVG export:
  _color: Color
  _offset: number
  // The gradient that the stop belongs to, set by Gradient:
  _owner: Gradient

  /**
   * Creates a GradientStop object.
   *
   * @param color the color of the stop, black by default
   * @param offset the position of the stop on the gradient ramp as a value
   *     between `0` and `1`; `null` or `undefined` for automatic assignment.
   */
  constructor(color?: ColorLike, offset?: number)
  /**
   * Creates a GradientStop object from any of the values that
   * {@link Gradient#stops} accepts: a color, an array of a color and an
   * offset, or an object with these properties.
   *
   * @param stop
   */
  constructor(stop: GradientStopLike)
  constructor(arg0?: GradientStopLike, arg1?: number) {
    super()
    let color = arg0 as ColorLike
    let offset = arg1
    if (typeof arg0 === 'object' && arg1 === undefined) {
      // Make sure the first entry in the array is not a number, in which
      // case the whole array would be a color, and the assignments would
      // already have occurred correctly above.
      if (Array.isArray(arg0) && typeof arg0[0] !== 'number') {
        // ([color, offset])
        color = arg0[0]
        offset = arg0[1]
      } else if ('color' in arg0 || 'offset' in arg0) {
        // (stop)
        const stop = arg0 as { color?: ColorLike; offset?: number }
        color = stop.color
        offset = stop.offset || 0
      }
    }
    this.color = color
    this.offset = offset
  }

  // TODO: Do we really need to also clone the color here?
  /**
   * @return a copy of the gradient-stop
   */
  clone(): GradientStop {
    return new GradientStop(this._color.clone(), this._offset)
  }

  _serialize(options: any, dictionary: any) {
    const color = this._color
    const offset = this._offset
    return serialize(
      offset == null ? [color] : [color, offset],
      options,
      true,
      dictionary
    )
  }

  /**
   * Called by various setters whenever a value changes
   */
  #changed() {
    // Notify the gradient that uses this stop about the change, so it can
    // notify its gradient colors, which in turn will notify the items they
    // are used in:
    this._owner?._changed()
  }

  /**
   * The ramp-point of the gradient stop as a value between `0` and `1`.
   *
   * @example {@paperscript height=300}
   * // Animating a gradient's ramp points:
   *
   * // Create a circle shaped path at the center of the view,
   * // using 40% of the height of the view as its radius
   * // and fill it with a radial gradient color:
   * var path = Path.circle({
   *     center: view.center,
   *     radius: view.bounds.height * 0.4
   * });
   *
   * path.fillColor = {
   *     gradient: {
   *         stops: [['yellow', 0.05], ['red', 0.2], ['black', 1]],
   *         radial: true
   *     },
   *     origin: path.position,
   *     destination: path.bounds.rightCenter
   * };
   *
   * var gradient = path.fillColor.gradient;
   *
   * // This function is called each frame of the animation:
   * function onFrame(event) {
   *     var blackStop = gradient.stops[2];
   *     // Animate the offset between 0.7 and 0.9:
   *     blackStop.offset = Math.sin(event.time * 5) * 0.1 + 0.8;
   *
   *     // Animate the offset between 0.2 and 0.4
   *     var redStop = gradient.stops[1];
   *     redStop.offset = Math.sin(event.time * 3) * 0.1 + 0.3;
   * }
   */
  get offset(): number {
    return this._offset
  }

  set offset(offset: number) {
    this._offset = offset
    this.#changed()
  }

  /**
   * The color of the gradient stop.
   *
   * @example {@paperscript height=300}
   * // Animating a gradient's ramp points:
   *
   * // Create a circle shaped path at the center of the view,
   * // using 40% of the height of the view as its radius
   * // and fill it with a radial gradient color:
   * var path = Path.circle({
   *     center: view.center,
   *     radius: view.bounds.height * 0.4
   * });
   *
   * path.fillColor = {
   *     gradient: {
   *         stops: [['yellow', 0.05], ['red', 0.2], ['black', 1]],
   *         radial: true
   *     },
   *     origin: path.position,
   *     destination: path.bounds.rightCenter
   * };
   *
   * var redStop = path.fillColor.gradient.stops[1];
   * var blackStop = path.fillColor.gradient.stops[2];
   *
   * // This function is called each frame of the animation:
   * function onFrame(event) {
   *     // Animate the offset between 0.7 and 0.9:
   *     blackStop.offset = Math.sin(event.time * 5) * 0.1 + 0.8;
   *
   *     // Animate the offset between 0.2 and 0.4
   *     redStop.offset = Math.sin(event.time * 3) * 0.1 + 0.3;
   * }
   */
  get color(): Color {
    return this._color
  }

  set color(color: ColorLike) {
    // Clear old color owner before setting new one:
    Color._setOwner(this._color, null)
    this._color = Color._setOwner(Color.from(color), this, 'color')
    this.#changed()
  }

  /**
   * Checks whether the gradient stop is equal to the supplied one.
   *
   * @param stop
   * @return {@true if they are equal}
   */
  equals(stop: GradientStop): boolean {
    return !!(
      stop === this || (
        stop instanceof GradientStop &&
        this._color.equals(stop._color) &&
        this._offset == stop._offset
      )
    )
  }
}
