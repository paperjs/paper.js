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

import { Base } from '../core/Base.ts'
import { serialize } from '../core/serialization.ts'
import { Change } from '../constants.ts'
import { equals } from '../util/object.ts'
import { Effect } from './Effect.ts'
import type { Item } from './Item.ts'

type EffectInstanceProps = {
  type: string
  parameters?: Record<string, any>
  visible?: boolean
}

/**
 * The use of an {@link Effect} on an item, see {@link Item#effects}, with its
 * parameters. The parameters that the effect declares are also its
 * properties. Instances of effects that aren't registered keep their
 * parameters and leave what they get as it is, so that they still round-trip.
 */
export class EffectInstance extends Base {
  // The declared parameters of the effect, as properties, see Effect:
  [key: string]: any

  #type: string
  #effect: Effect
  #linkedParameters: Record<string, any>
  // Read by Item, which also sets _item and _index, see Item#effects:
  _visible: boolean
  _item: Item
  _index: number
  // Read by the accessors of the parameters, see Effect:
  _parameters: Record<string, any>

  // Items create their instances from plain objects, see Item#addEffect():
  constructor(props: EffectInstanceProps) {
    super()
    this.#type = props.type
    this._visible = props.visible !== false
    this._item = this._index = null
    this.#setParameters(props.parameters)
  }

  // Takes the parameters as they are, with the defaults of the effect for
  // the ones that they don't set:
  #setParameters(parameters: Record<string, any>) {
    this._parameters = { ...parameters }
    this.#setEffect(Effect.get(this.#type))
  }

  // Binds the instance to its effect, with the declared parameters as
  // properties, and their defaults:
  #setEffect(effect: Effect | null) {
    if (effect) {
      const parameters = this._parameters
      for (const [key, value] of Object.entries(effect._defaults)) {
        if (parameters[key] === undefined) {
          parameters[key] = value
        }
      }
      Object.defineProperties(this, effect._accessors)
    }
    this.#effect = effect
    this.#linkedParameters = null
  }

  // Returns the plain object that items create the instance from, with a
  // copy of its parameters:
  _getProps(): EffectInstanceProps {
    const props: EffectInstanceProps = {
      type: this.#type,
      parameters: { ...this._parameters }
    }
    if (!this._visible) {
      props.visible = false
    }
    return props
  }

  _serialize(options: any, dictionary: any) {
    return serialize(this._getProps(), options, true, dictionary)
  }

  _changed() {
    this._item?._changed(Change.ATTRIBUTE)
  }

  /**
   * The type of the effect that the instance uses, also when it isn't
   * registered.
   */
  get type(): string {
    return this.#type
  }

  /**
   * The effect that the instance uses, registered under its {@link #type},
   * or `null` if there is none.
   */
  get effect(): Effect | null {
    const effect = Effect.get(this.#type)
    // Bind the instance again when its effect is redefined:
    if (effect !== this.#effect) {
      this.#setEffect(effect)
    }
    return effect
  }

  /**
   * Whether the effect applies. Effects that aren't visible are skipped.
   *
   * @default true
   */
  get visible(): boolean {
    return this._visible
  }

  set visible(visible: boolean) {
    this._visible = !!visible
    this._changed()
  }

  /**
   * The parameters of the instance. Changing them on the returned object
   * updates it, as setting them as its properties does. Parameters that it
   * doesn't have yet are added by setting them all, as are changes within
   * values such as arrays.
   *
   * @example
   * var instance = path.addEffect({
   *     type: 'offset',
   *     parameters: { distance: 10 }
   * });
   * instance.parameters.distance = 20; // Redraws.
   * instance.parameters = { distance: 5, join: 'round' };
   */
  get parameters(): Record<string, any> {
    let linked = this.#linkedParameters
    if (!linked) {
      // The parameters as accessors that update the instance:
      linked = this.#linkedParameters = {}
      for (const key of Object.keys(this._parameters)) {
        Object.defineProperty(linked, key, {
          enumerable: true,
          get: () => this._parameters[key],
          set: (value: any) => {
            this._parameters[key] = value
            this._changed()
          }
        })
      }
      // New parameters would be lost, so strict code throws on them:
      Object.preventExtensions(linked)
    }
    return linked
  }

  set parameters(parameters: Record<string, any>) {
    this.#setParameters(parameters)
    this._changed()
  }

  /**
   * The item that the instance is part of.
   */
  get item(): Item | null {
    return this._item
  }

  /**
   * The index of the instance in the {@link Item#effects} of its item.
   */
  get index(): number | null {
    return this._index
  }

  /**
   * Removes the instance from its item.
   *
   * @return {@true if the instance was removed}
   */
  remove(): boolean {
    return !!this._item?.removeEffect(this._index)
  }

  /**
   * Checks whether the instance is equal to the supplied one.
   *
   * @param instance
   * @return {@true if they are equal}
   */
  equals(instance: EffectInstance): boolean {
    return !!(
      instance === this || (
        instance instanceof EffectInstance &&
        this.#type === instance.#type &&
        this._visible === instance._visible &&
        equals(this._parameters, instance._parameters)
      )
    )
  }

  static {
    // JSON writes the effects of items as plain objects:
    this.prototype._compactSerialize = true
  }
}
