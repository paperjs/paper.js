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

import { Base, EffectInstance, Group, PathItem } from '../internal.ts'
import type { Item } from './Item.ts'

// The description of a parameter, e.g. `{ label, type, range, value }`:
type EffectParameter = Record<string, any>

type EffectEvent = { art: Item; item: Item }

type EffectProps = {
  type: string
  label?: string
  parameters?: Record<string, EffectParameter>
  // Called on the instance, or on the effect itself where Path applies the
  // outline effect to its stroke profile without one:
  onApply?: (this: EffectInstance | Effect, event: EffectEvent) => Item | void
  onEditParameters?: (this: EffectInstance) => void
}

/**
 * A live effect, which derives what is drawn from an item without changing
 * the item itself, as the effects in Illustrator do. Creating one registers it
 * under its type, replacing any effect registered there before, and items use
 * it by that type, see {@link Item#effects}, each through an
 * {@link EffectInstance} with its own parameters.
 *
 * @example
 * new Effect({
 *     type: 'shrink',
 *     label: 'Shrink',
 *     parameters: {
 *         amount: { label: 'Amount', type: 'number', value: 0.5 }
 *     },
 *     onApply: function(event) {
 *         return event.art.scale(this.amount);
 *     }
 * });
 * path.addEffect({ type: 'shrink', parameters: { amount: 0.8 } });
 */
export class Effect extends Base {
  // Changes with the registered effects, for items to apply theirs again,
  // see Item#getEffectOutput():
  static _version = 0

  #type: string
  #label: string
  #parameters: Record<string, EffectParameter>
  // The defaults of the declared parameters, and their accessors on the
  // instances, see EffectInstance:
  _defaults: Record<string, any>
  _accessors: PropertyDescriptorMap

  /**
   * The function that applies the effect, called with the instance as
   * `this`, and returning what the effect makes of the art that it gets,
   * which it doesn't change.
   *
   * @option event.art {Item} the item to apply the effect to, or what the
   *     effect before it returned
   * @option event.item {Item} the item that the instance is part of
   */
  onApply: EffectProps['onApply'] | null

  /**
   * The function that hosts call when the user edits the parameters of an
   * instance, with the instance as `this`, to set its properties. Paper.js
   * itself doesn't call it.
   */
  onEditParameters: EffectProps['onEditParameters'] | null

  /**
   * Creates an effect and registers it under its type.
   *
   * @param props the {@link #type} of the effect, its {@link #label} and
   *     {@link #parameters}, and {@link #onApply} and
   *     {@link #onEditParameters}
   */
  constructor(props: EffectProps) {
    super()
    const defaults = {}
    const accessors: PropertyDescriptorMap = {}
    this.#type = props.type
    this.#label = props.label || props.type
    this.#parameters = props.parameters ?? {}
    this.onApply = props.onApply ?? null
    this.onEditParameters = props.onEditParameters ?? null
    // The declared parameters become properties of the instances:
    for (const [key, parameter] of Object.entries(this.#parameters)) {
      if (key in EffectInstance.prototype) {
        throw new Error(`Invalid parameter name: '${key}'.`)
      }
      defaults[key] = parameter.value
      accessors[key] = {
        configurable: true,
        get(this: EffectInstance) {
          return this._parameters[key]
        },
        set(this: EffectInstance, value: any) {
          this._parameters[key] = value
          this._changed()
        }
      }
    }
    this._defaults = defaults
    this._accessors = accessors
    Effect.add(this)
  }

  /**
   * The type that the effect is registered under, and that items use it by.
   */
  get type(): string {
    return this.#type
  }

  /**
   * The label of the effect, for hosts to show to users.
   *
   * @default the type
   */
  get label(): string {
    return this.#label
  }

  /**
   * The declared parameters of the effect by their names, as objects that
   * describe them for hosts to build their settings from, with the default
   * as their `value`, e.g.
   * `{ label: 'Amount', type: 'number', range: [0, 100], value: 10 }`.
   * The instances of the effect have them as properties.
   */
  get parameters(): Record<string, EffectParameter> {
    return this.#parameters
  }

  /**
   * Removes the effect from the registered effects.
   *
   * @return {@true if the effect was registered}
   */
  remove(): boolean {
    return Effect.remove(this)
  }

  /**
   * Registers the effect under its type, replacing any effect registered
   * there before. Effects register themselves when they are created.
   *
   * @param effect
   * @return the effect
   */
  static add(effect: Effect): Effect {
    getEffects()[effect.#type] = effect
    Effect._version++
    return effect
  }

  /**
   * Returns the effect registered under the type.
   *
   * @param type
   * @return the effect, or `null`
   */
  static get(type: string): Effect | null {
    const effects = getEffects()
    return Object.hasOwn(effects, type) ? effects[type] : null
  }

  /**
   * Returns all registered effects.
   *
   * @return the effects
   */
  static getAll(): Effect[] {
    return Object.values(getEffects())
  }

  /**
   * Removes the effect from the registered effects.
   *
   * @param effect
   * @return {@true if the effect was registered}
   */
  static remove(effect: Effect): boolean {
    const effects = getEffects()
    const type = effect.#type
    if (effects[type] === effect) {
      delete effects[type]
      Effect._version++
      return true
    }
    return false
  }
}

// The registered effects by their types, with the effects of Paper.js, which
// are registered at first use, see registerEffects():
let effectsByType: Record<string, Effect> = null

function getEffects(): Record<string, Effect> {
  if (!effectsByType) {
    effectsByType = {}
    registerEffects()
  }
  return effectsByType
}

// Registers the effects of Paper.js, see Item#effects:
function registerEffects() {
  // Offsets the paths, see PathItem#offset():
  new Effect({
    type: 'offset',
    label: 'Offset Path',
    parameters: {
      distance: {
        label: 'Distance',
        type: 'number',
        units: 'point',
        value: 0
      },
      join: {
        label: 'Join',
        type: 'list',
        options: ['miter', 'round', 'bevel'],
        value: 'miter'
      },
      miterLimit: { label: 'Miter Limit', type: 'number', value: 10 }
    },

    onApply(this: EffectInstance, event) {
      return applyToPaths(event.art, path =>
        path.offset(this.distance, {
          join: this.join,
          miterLimit: this.miterLimit,
          insert: false
        })
      )
    }
  })

  // Outlines the strokes of the paths as filled areas next to their fills,
  // following their stroke profiles, see PathItem#outline():
  new Effect({
    type: 'outline',
    label: 'Outline Stroke',

    onApply(event) {
      return applyToPaths(event.art, path => {
        if (!path.hasStroke()) {
          return path
        }
        const outline = path.outline({ insert: false })
        if (!path.hasFill()) {
          return outline
        }
        path.strokeColor = null
        return new Group({
          children: [path, outline],
          insert: false
        })
      })
    }
  })
}

// Applies the function to the paths in the art, and returns the art with the
// paths replaced by what it returns:
function applyToPaths(art: Item, func: (path: PathItem) => Item): Item {
  if (art instanceof PathItem) {
    return func(art)
  }
  const children = art._children
  if (children) {
    for (let i = children.length - 1; i >= 0; i--) {
      const child = children[i]
      const result = applyToPaths(child, func)
      if (result !== child) {
        child.replaceWith(result)
      }
    }
  }
  return art
}
