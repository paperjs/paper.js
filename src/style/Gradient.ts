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

import {
  Base,
  GradientStop,
  getUID,
  isPlainObject,
  serialize
} from '../internal.ts'
import type { GradientStopLike } from './GradientStop.ts'
import type { Color } from './Color.ts'

/**
 * What a gradient can be passed as, where a function takes one.
 */
export type GradientLike =
  | Gradient
  | GradientStopLike[]
  | { stops?: GradientStopLike[]; radial?: boolean }

/**
 * The Gradient object.
 *
 * @classexample {@paperscript height=300}
 * // Applying a linear gradient color containing evenly distributed
 * // color stops:
 *
 * // Define two points which we will be using to construct
 * // the path and to position the gradient color:
 * var topLeft = view.center - [80, 80];
 * var bottomRight = view.center + [80, 80];
 *
 * // Create a rectangle shaped path between
 * // the topLeft and bottomRight points:
 * var path = Path.rectangle({
 *     topLeft: topLeft,
 *     bottomRight: bottomRight,
 *     // Fill the path with a gradient of three color stops
 *     // that runs between the two points we defined earlier:
 *     fillColor: {
 *         gradient: {
 *             stops: ['yellow', 'red', 'blue']
 *         },
 *         origin: topLeft,
 *         destination: bottomRight
 *     }
 * });
 *
 * @classexample {@paperscript height=300}
 * // Create a circle shaped path at the center of the view,
 * // using 40% of the height of the view as its radius
 * // and fill it with a radial gradient color:
 * var path = Path.circle({
 *     center: view.center,
 *     radius: view.bounds.height * 0.4
 * });
 *
 * // Fill the path with a radial gradient color with three stops:
 * // yellow from 0% to 5%, mix between red from 5% to 20%,
 * // mix between red and black from 20% to 100%:
 * path.fillColor = {
 *     gradient: {
 *         stops: [['yellow', 0.05], ['red', 0.2], ['black', 1]],
 *         radial: true
 *     },
 *     origin: path.position,
 *     destination: path.bounds.rightCenter
 * };
 */
export class Gradient extends Base {
  _id: number
  _stops: GradientStop[]
  _radial: boolean
  // The gradient colors that use this gradient:
  #owners: Color[] = []

  /**
   * Creates a Gradient object from the given stops, white to black if there
   * are none.
   *
   * @param stops the gradient stops, as gradient stops or any of the values
   *     that {@link GradientStop()} takes
   * @param radial whether the gradient is radial or linear
   */
  constructor(stops?: GradientStopLike[], radial?: boolean)
  /**
   * Creates a Gradient object using the properties in the given object.
   *
   * @param object the object describing the gradient's properties
   */
  constructor(object: Exclude<GradientLike, Gradient | GradientStopLike[]>)
  /**
   * Creates a Gradient object from any of the values that a function taking a
   * gradient accepts, as {@link Gradient.from()} does.
   *
   * @param gradient
   */
  constructor(gradient: Exclude<GradientLike, Gradient>)
  constructor(stops?: any, radial?: boolean) {
    super()
    // Use UID here since Gradients are exported through dictionary.add().
    this._id = getUID()
    if (stops && isPlainObject(stops)) {
      this.set(stops)
      // Erase arguments since we used the passed object instead.
      stops = radial = null
    }
    // As these values might already have been set in the set() call above,
    // only initialize them if that hasn't happened yet.
    if (this._stops == null) {
      this.stops = stops || ['white', 'black']
    }
    if (this._radial == null) {
      this.radial = radial
    }
  }

  /**
   * Sets the properties of the passed object literal on the gradient.
   *
   * @param props an object describing the properties to set
   */
  set(props: Exclude<GradientLike, Gradient | GradientStopLike[]>): this {
    Object.assign(this, props)
    return this
  }

  _serialize(options: any, dictionary: any) {
    return dictionary.add(this, () =>
      serialize([this._stops, this._radial], options, true, dictionary)
    )
  }

  /**
   * Called by various setters whenever a gradient value changes
   */
  _changed() {
    // Loop through the gradient-colors that use this gradient and notify
    // them, so they can notify the items they belong to.
    for (const owner of this.#owners) {
      owner._changed()
    }
  }

  /**
   * Called by Color#gradient's setter.
   * This is required to pass on _changed() notifications to the owners.
   */
  _addOwner(color: Color) {
    this.#owners.push(color)
  }

  /**
   * Called by Color whenever this gradient stops being used.
   */
  _removeOwner(color: Color) {
    const index = this.#owners.indexOf(color)
    if (index !== -1) {
      this.#owners.splice(index, 1)
    }
  }

  /**
   * @return a copy of the gradient
   */
  clone(): Gradient {
    return new Gradient(
      this._stops.map(stop => stop.clone()),
      this._radial
    )
  }

  /**
   * The gradient stops on the gradient ramp.
   */
  get stops(): GradientStop[] {
    return this._stops
  }

  set stops(stops: GradientStopLike[]) {
    if (stops.length < 2) {
      throw new Error(
        'Gradient stop list needs to contain at least two stops.'
      )
    }
    // If this gradient already contains stops, first remove their owner.
    if (this._stops) {
      for (const stop of this._stops) {
        stop._owner = undefined
      }
    }
    // Copy the passed stops, and assign this gradient as their owner:
    this._stops = stops.map(stop => {
      const copy =
        stop instanceof GradientStop
          ? stop.clone()
          : new GradientStop(stop)
      copy._owner = this
      return copy
    })
    this._changed()
  }

  /**
   * Specifies whether the gradient is radial or linear.
   */
  get radial(): boolean {
    return this._radial
  }

  set radial(radial: boolean) {
    this._radial = !!radial
    this._changed()
  }

  /**
   * Checks whether the gradient is equal to the supplied gradient.
   *
   * @param gradient
   * @return {@true if they are equal}
   */
  equals(gradient: Gradient): boolean {
    return (
      gradient === this || (
        gradient instanceof Gradient &&
        this._stops.length === gradient._stops.length &&
        this._stops.every((stop, index) => stop.equals(gradient._stops[index]))
      )
    )
  }

  /**
   * Returns the passed gradient if it is one already, or else a new gradient
   * created from the passed values, as {@link Gradient()} reads them.
   *
   * @param gradient
   */
  static from(gradient: GradientLike): Gradient {
    return gradient instanceof Gradient ? gradient : new Gradient(gradient)
  }
}
