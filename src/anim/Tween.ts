import { Emitter, defineEvents } from '../internal.ts'
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

type Easing = (t: number) => number

/**
 * Allows tweening `Object` properties between two states for a given
 * duration. To tween properties on Paper.js {@link Item} instances,
 * {@link Item#tween(from, to, options)} can be used, which returns created
 * tween instance.
 *
 * @see Item#tween(from, to, options)
 * @see Item#tween(to, options)
 * @see Item#tween(options)
 * @see Item#tweenTo(to, options)
 * @see Item#tweenFrom(from, options)
 */
export class Tween extends Emitter {
  static easings: Record<string, Easing> = {
    // no easing, no acceleration
    linear(t: number) {
      return t
    },

    // accelerating from zero velocity
    easeInQuad(t: number) {
      return t * t
    },

    // decelerating to zero velocity
    easeOutQuad(t: number) {
      return t * (2 - t)
    },

    // acceleration until halfway, then deceleration
    easeInOutQuad(t: number) {
      return t < 0.5
        ? 2 * t * t
        : -1 + 2 * (2 - t) * t
    },

    // accelerating from zero velocity
    easeInCubic(t: number) {
      return t * t * t
    },

    // decelerating to zero velocity
    easeOutCubic(t: number) {
      return --t * t * t + 1
    },

    // acceleration until halfway, then deceleration
    easeInOutCubic(t: number) {
      return t < 0.5
        ? 4 * t * t * t
        : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1
    },

    // accelerating from zero velocity
    easeInQuart(t: number) {
      return t * t * t * t
    },

    // decelerating to zero velocity
    easeOutQuart(t: number) {
      return 1 - --t * t * t * t
    },

    // acceleration until halfway, then deceleration
    easeInOutQuart(t: number) {
      return t < 0.5
        ? 8 * t * t * t * t
        : 1 - 8 * --t * t * t * t
    },

    // accelerating from zero velocity
    easeInQuint(t: number) {
      return t * t * t * t * t
    },

    // decelerating to zero velocity
    easeOutQuint(t: number) {
      return 1 + --t * t * t * t * t
    },

    // acceleration until halfway, then deceleration
    easeInOutQuint(t: number) {
      return t < 0.5
        ? 16 * t * t * t * t * t
        : 1 + 16 * --t * t * t * t * t
    },

    // accelerating from zero velocity
    easeInSine(t: number) {
      return 1 - Math.cos(t * Math.PI / 2)
    },

    // decelerating to zero velocity
    easeOutSine(t: number) {
      return Math.sin(t * Math.PI / 2)
    },

    // acceleration until halfway, then deceleration
    easeInOutSine(t: number) {
      return (1 - Math.cos(t * Math.PI)) / 2
    },

    // accelerating from zero velocity
    easeInExpo(t: number) {
      return t === 0 ? 0 : Math.pow(2, 10 * t - 10)
    },

    // decelerating to zero velocity
    easeOutExpo(t: number) {
      return t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
    },

    // acceleration until halfway, then deceleration
    easeInOutExpo(t: number) {
      return t === 0 || t === 1
        ? t
        : t < 0.5
          ? Math.pow(2, 20 * t - 10) / 2
          : 1 - Math.pow(2, 10 - 20 * t) / 2
    },

    // accelerating from zero velocity
    easeInCirc(t: number) {
      return 1 - Math.sqrt(1 - t * t)
    },

    // decelerating to zero velocity
    easeOutCirc(t: number) {
      return Math.sqrt(1 - --t * t)
    },

    // acceleration until halfway, then deceleration
    easeInOutCirc(t: number) {
      return t < 0.5
        ? (1 - Math.sqrt(1 - 4 * t * t)) / 2
        : (1 + Math.sqrt(1 - 4 * --t * t)) / 2
    }
  }

  object: object
  type: string
  easing: Easing
  duration: number
  running = false
  #then: (object: object) => void = null
  #startTime: number = null
  #keys: string[]
  #parsedKeys: Record<string, string[]>
  #from: Record<string, any>
  #to: Record<string, any>

  /**
   * Creates a new tween.
   *
   * @param object the object to tween the properties on
   * @param from the state at the start of the tweening
   * @param to the state at the end of the tweening
   * @param duration the duration of the tweening
   * @param [easing='linear'] the type of the easing
   *     function or the easing function
   * @param [start=true] whether to start tweening automatically
   */
  constructor(
    object: object,
    from: object,
    to: object,
    duration: number,
    easing?: string | Easing,
    start?: boolean
  ) {
    super()
    this.object = object
    const isFunction = typeof easing === 'function'
    this.type = isFunction
      ? 'function'
      : typeof easing === 'string'
        ? easing
        : 'linear'
    this.easing = isFunction ? easing : Tween.easings[this.type]
    this.duration = duration
    const state = from ?? to
    this.#keys = state ? Object.keys(state) : []
    this.#parsedKeys = this.#parseKeys(this.#keys)
    this.#from = state && this.#getState(from)
    this.#to = state && this.#getState(to)
    if (start !== false) {
      this.start()
    }
  }

  /**
   * Set a function that will be executed when the tween completes.
   * @param callback the function to execute when the tween
   *     completes
   *
   * @example {@paperscript}
   * // Tweens chaining:
   * var circle = Path.circle({
   *     center: view.center,
   *     radius: 40,
   *     fillColor: 'blue'
   * });
   * // Tween color from blue to red.
   * var tween = circle.tweenTo({ fillColor: 'red' }, 2000);
   * // When the first tween completes...
   * tween.then(function() {
   *     // ...tween color back to blue.
   *     circle.tweenTo({ fillColor: 'blue' }, 2000);
   * });
   */
  then(callback: (object: object) => void): this {
    // TODO: This only supports one callback for `then()`. Figure out how
    // to handle multiple calls to then in an decent way, without relying
    // on Promises (or should we?).
    this.#then = callback
    return this
  }

  /**
   * Start tweening.
   *
   * @example {@paperscript}
   * // Manually start tweening.
   * var circle = Path.circle({
   *     center: view.center,
   *     radius: 40,
   *     fillColor: 'blue'
   * });
   * var tween = circle.tweenTo(
   *     { fillColor: 'red' },
   *     { duration: 2000, start: false }
   * );
   * tween.start();
   */
  start(): this {
    this.#startTime = null
    this.running = true
    return this
  }

  /**
   * Stop tweening.
   *
   * @example {@paperscript}
   * // Stop a tween before it completes.
   * var circle = Path.circle({
   *     center: view.center,
   *     radius: 40,
   *     fillColor: 'blue'
   * });
   * // Start tweening from blue to red for 2 seconds.
   * var tween = circle.tweenTo({ fillColor: 'red' }, 2000);
   * // After 1 second...
   * setTimeout(function(){
   *     // ...stop tweening.
   *     tween.stop();
   * }, 1000);
   */
  stop(): this {
    this.running = false
    return this
  }

  // DOCS: Document Tween#update(progress)
  update(progress: number): this {
    if (this.running) {
      if (progress >= 1) {
        // Always finish the animation.
        progress = 1
        this.running = false
      }

      const factor = this.easing(progress)
      const getValue = (value: any) =>
        typeof value === 'function' ? value(factor, progress) : value
      for (const key of this.#keys) {
        const from = getValue(this.#from[key])
        const to = getValue(this.#to[key])
        // Some paper objects have math functions (e.g.: Point,
        // Color) which can directly be used to do the tweening.
        const value =
          from && to && from.multiply && to.multiply
            ? to.subtract(from).multiply(factor).add(from)
            : (to - from) * factor + from
        this.#setProperty(this.#parsedKeys[key], value)
      }

      // TODO: Set `progress` and `factor` on Tween object also, so they
      // can be used witout events.
      if (this.responds('update')) {
        this.emit('update', { progress, factor })
      }
      if (!this.running && this.#then) {
        // TODO: Look into what should be returned.
        this.#then(this.object)
      }
    }
    return this
  }

  _handleFrame(time: number) {
    // The first frame starts the tween, also when its time is 0:
    this.#startTime ??= time
    this.update((time - this.#startTime) / this.duration)
  }

  #getState(state: object): Record<string, any> {
    const result = {}
    for (const key of this.#keys) {
      const path = this.#parsedKeys[key]
      const current = this.#getProperty(path)
      let value
      if (state) {
        const resolved = this.#resolveValue(current, state[key])
        // Temporarily set the resolved value, so we can retrieve the
        // coerced value from paper's internal magic.
        this.#setProperty(path, resolved)
        value = this.#getProperty(path)
        // Clone the value if possible to prevent future changes.
        value = value?.clone ? value.clone() : value
        this.#setProperty(path, current)
      } else {
        // We want to get the current state at the time of the call, so
        // we have to clone if possible to prevent future changes.
        value = current?.clone ? current.clone() : current
      }
      result[key] = value
    }
    return result
  }

  #resolveValue(current: any, value: any) {
    if (value) {
      if (Array.isArray(value) && value.length === 2) {
        const operator = value[0]
        return operator?.match?.(/^[+\-*/]=/)
          ? this.#calculate(current, operator[0], value[1])
          : value
      } else if (typeof value === 'string') {
        const match = value.match(/^[+\-*/]=(.*)/)
        if (match) {
          const parsed = JSON.parse(
            match[1].replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2": ')
          )
          return this.#calculate(current, value[0], parsed)
        }
      }
    }
    return value
  }

  #calculate(left: any, operator: string, right: any) {
    // Use the math functions of objects that have them (e.g.: Point,
    // Color), and the operator itself for numbers.
    const name = {
      '+': 'add',
      '-': 'subtract',
      '*': 'multiply',
      '/': 'divide'
    }[operator]
    if (left?.[name]) {
      return left[name](right)
    }
    switch (operator) {
      case '+':
        return left + right
      case '-':
        return left - right
      case '*':
        return left * right
      case '/':
        return left / right
    }
  }

  #parseKeys(keys: string[]): Record<string, string[]> {
    const parsed = {}
    for (const key of keys) {
      const path = key
        // Convert from JS property access notation to JSON pointer:
        .replace(/\.([^.]*)/g, '/$1')
        // Expand array property access notation ([])
        .replace(/\[['"]?([^'"\]]*)['"]?\]/g, '/$1')
      parsed[key] = path.split('/')
    }
    return parsed
  }

  #getProperty(path: string[], offset = 0) {
    let { object } = this
    for (let i = 0, l = path.length - offset; i < l && object; i++) {
      object = object[path[i]]
    }
    return object as any
  }

  #setProperty(path: string[], value: any) {
    const destination = this.#getProperty(path, 1)
    if (destination) {
      destination[path[path.length - 1]] = value
    }
  }

  static {
    defineEvents(this, {
      onUpdate: {}
    })
  }
}

// The event handlers:
export interface Tween {
  /**
   * {@grouptitle Event Handlers}
   *
   * The function to be called when the tween is updated. It receives an
   * object as its sole argument, containing the current progress of the
   * tweening and the factor calculated by the easing function.
   *
   * @example {@paperscript}
   * // Display tween progression values:
   * var circle = Path.circle({
   *     center: view.center,
   *     radius: 40,
   *     fillColor: 'blue'
   * });
   * var tween = circle.tweenTo(
   *     { fillColor: 'red' },
   *     {
   *         duration: 2000,
   *         easing: 'easeInCubic'
   *     }
   * );
   * var progressText = new PointText(view.center + [60, -10]);
   * var factorText = new PointText(view.center + [60, 10]);
   *
   * // Install event using onUpdate() property:
   * tween.onUpdate = function(event) {
   *     progressText.content = 'progress: ' + event.progress.toFixed(2);
   * };
   *
   * // Install event using on('update') method:
   * tween.on('update', function(event) {
   *     factorText.content = 'factor: ' + event.factor.toFixed(2);
   * });
   */
  onUpdate: ((event: { progress: number; factor: number }) => void) | null
}
