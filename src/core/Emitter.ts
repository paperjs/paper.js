import { Base, inject } from '../internal.ts'
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

type Handler = (this: any, ...args: any[]) => any

export interface EventDeclaration {
  // Called when the first handler for the type is added, and when the last
  // one is removed:
  install?(this: any, type: string): void
  uninstall?(this: any, type: string): void
  // Whether handlers can be set on the class, for all its objects:
  classLevel?: boolean
}

/**
 * The base class of all objects that emit events: items, views, tools and
 * tweens.
 *
 * @private
 */
export class Emitter extends Base {
  // The declared event types of the class, keyed by type, see defineEvents():
  declare static events: Record<string, EventDeclaration>
  // The handlers by type, and the ones set through the on… properties. Not
  // private, as class-level handlers live on prototypes, which never get #
  // fields, and objects inherit the handlers of their prototypes:
  declare _callbacks: Record<string, Handler[]>
  declare _handlers: Record<string, Handler>

  on(type: string | Record<string, Handler>, func?: Handler): this {
    // If an object literal is passed, attach all callbacks defined in it
    if (typeof type !== 'string') {
      for (const [key, value] of Object.entries(type)) {
        this.on(key, value)
      }
    } else {
      const entry = (this.constructor as typeof Emitter).events?.[type]
      // Handlers on the prototype of a class are called for all its objects,
      // see Item.onDraw:
      if (this === this.constructor.prototype && !entry?.classLevel) {
        throw new Error(`Unsupported class-level event: '${type}'.`)
      }
      // Objects inherit the handlers of their prototypes, but keep their own:
      const callbacks = (this._callbacks = (
        Object.hasOwn(this, '_callbacks') &&
        this._callbacks
      ) || {})
      const handlers = (callbacks[type] ??= [])
      if (!handlers.includes(func)) {
        handlers.push(func)
        // Call install for the first handler of the type:
        if (handlers.length === 1) {
          entry?.install?.call(this, type)
        }
      }
    }
    return this
  }

  off(type: string | Record<string, Handler>, func?: Handler): this {
    // If an object literal is passed, detach all callbacks defined in it
    if (typeof type !== 'string') {
      for (const [key, value] of Object.entries(type)) {
        this.off(key, value)
      }
    } else {
      const handlers = (
        Object.hasOwn(this, '_callbacks') &&
        this._callbacks[type]
      )
      if (handlers) {
        const index = func ? handlers.indexOf(func) : -1
        // Call uninstall when detaching the last handler, or all of them:
        if (!func || index !== -1 && handlers.length === 1) {
          const entry = (this.constructor as typeof Emitter).events?.[type]
          entry?.uninstall?.call(this, type)
          // Delete handlers entry again, so responds() returns false.
          delete this._callbacks[type]
        } else if (index !== -1) {
          handlers.splice(index, 1)
        }
      }
    }
    return this
  }

  once(type: string, func: Handler): this {
    const handler = function (this: Emitter, ...args: any[]) {
      func.apply(this, args)
      this.off(type, handler)
    }
    return this.on(type, handler)
  }

  emit(type: string, event?: any, ...args: any[]): boolean {
    // Return true if any events were emitted, false otherwise.
    const handlers = this._getHandlers(type)
    if (!handlers.length) {
      return false
    }
    // Set the current target to `this` if the event object defines #target
    // but not #currentTarget.
    const setTarget = event?.target && !event.currentTarget
    if (setTarget) {
      event.currentTarget = this
    }
    for (const handler of handlers) {
      if (handler.call(this, event, ...args) == false) {
        // If the handler returns false, prevent the default behavior and stop
        // propagation of the event by calling stop()
        event?.stop?.()
        // Stop propagation right now!
        break
      }
    }
    if (setTarget) {
      delete event.currentTarget
    }
    return true
  }

  responds(type: string): boolean {
    // Drawing asks every item, so check the object's own handlers first, and
    // only walk up its prototypes while there are handlers above:
    if (this._callbacks) {
      if (Object.hasOwn(this, '_callbacks') && this._callbacks[type]) {
        return true
      }
      for (
        let obj = this.constructor.prototype;
        obj?._callbacks;
        obj = Object.getPrototypeOf(obj)
      ) {
        if (Object.hasOwn(obj, '_callbacks') && obj._callbacks[type]) {
          return true
        }
      }
    }
    return false
  }

  // Collect the object's own handlers and then the ones of its prototypes, in
  // a new list that changes caused by on / off won't affect. Not private, as
  // hosted shells of items are created without the constructor:
  _getHandlers(type: string): Handler[] {
    const handlers = []
    for (let obj = this; obj; obj = Object.getPrototypeOf(obj)) {
      const callbacks = Object.hasOwn(obj, '_callbacks') && obj._callbacks[type]
      if (callbacks) {
        handlers.push(...callbacks)
      }
    }
    return handlers
  }

  _installEvents(install: boolean) {
    // Only the object's own handlers, not the ones of its prototypes:
    const { events } = this.constructor as typeof Emitter
    const callbacks = Object.hasOwn(this, '_callbacks') && this._callbacks
    if (events && callbacks) {
      for (const [type, handlers] of Object.entries(callbacks)) {
        if (handlers.length > 0) {
          const entry = events[type]
          ;(install ? entry?.install : entry?.uninstall)?.call(this, type)
        }
      }
    }
  }

  // Attach and detach handlers for all objects of the class and its
  // subclasses, for the event types that declare `classLevel: true`:
  static on(type: string | Record<string, Handler>, func?: Handler) {
    this.prototype.on(type, func)
    return this
  }

  static off(type: string | Record<string, Handler>, func?: Handler) {
    this.prototype.off(type, func)
    return this
  }
}

/**
 * Declares the events of an emitter class by their handler names, e.g.
 * `onMouseDown`, and adds the class's `events` table keyed by type
 * (`mousedown`), and the accessors for the handler properties, on the class
 * too for the `classLevel` events.
 *
 * @private
 */
export function defineEvents(
  // Any emitter class, whatever its constructor takes:
  ctor: { prototype: Emitter; events?: Record<string, EventDeclaration> },
  declarations: Record<string, EventDeclaration>
) {
  // Inherit the events of the superclass:
  const events = { ...ctor.events }
  for (const [name, entry] of Object.entries(declarations)) {
    const type = name.slice(2).toLowerCase()
    events[type] = entry
    inject(ctor.prototype, {
      get [name]() {
        // Only the object's own handler, not its prototype's:
        return (
          (Object.hasOwn(this, '_handlers') && this._handlers[type]) || null
        )
      },
      set [name](func: Handler) {
        // Detach the previous handler, if there was one.
        const previous = this[name]
        if (previous) {
          this.off(type, previous)
        }
        if (func) {
          this.on(type, func)
        }
        const handlers = (this._handlers = (
          Object.hasOwn(this, '_handlers') &&
          this._handlers
        ) || {})
        handlers[type] = func
      }
    })
    // And on the class, for the types that support it:
    if (entry.classLevel) {
      inject(ctor, {
        get [name]() {
          return this.prototype[name]
        },
        set [name](func: Handler) {
          this.prototype[name] = func
        }
      })
    }
  }
  ctor.events = events
}
