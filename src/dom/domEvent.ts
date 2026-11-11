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

import { Point, getDocument, getOffset, getWindow } from '../internal.ts'

type Listener = (event: any) => void

// The callbacks for the next frame, see requestFrame():
let callbacks: (() => void)[] = []
let isRequested = false
let timer: ReturnType<typeof setInterval> = null

/**
 * Adds the listeners to the element, keyed by their event types, several of
 * them separated by spaces or commas.
 *
 * @private
 */
export function addEvents(
  element: EventTarget,
  events: Record<string, Listener>
) {
  // Do not fail if element is not defined, that way we can keep the code that
  // should not fail in web-workers to a minimum.
  if (element) {
    const document = getDocument()
    for (const [types, listener] of Object.entries(events)) {
      for (const type of types.split(/[\s,]+/g)) {
        // For touchstart/touchmove events on document, we need to explicitly
        // declare that the event is not passive (can be prevented). Otherwise
        // chrome browser would ignore `event.preventDefault()` calls and omit
        // warnings. See #1501 and:
        // https://www.chromestatus.com/features/5093566007214080
        const options =
          (
            element === document &&
            (type === 'touchstart' || type === 'touchmove')
          )
            ? { passive: false }
            : false
        element.addEventListener(type, listener, options)
      }
    }
  }
}

/**
 * Removes the listeners that {@link addEvents()} added.
 *
 * @private
 */
export function removeEvents(
  element: EventTarget,
  events: Record<string, Listener>
) {
  // See addEvents() for an explanation of this check:
  if (element) {
    for (const [types, listener] of Object.entries(events)) {
      for (const type of types.split(/[\s,]+/g)) {
        element.removeEventListener(type, listener, false)
      }
    }
  }
}

/**
 * Returns the position of the event in the coordinates of its target element.
 *
 * @private
 */
export function getEventOffset(
  event: MouseEvent | TouchEvent,
  target?: Element
): Point {
  // Remove target offsets from page coordinates
  target ||= event.target as Element
  return getPagePoint(event, target).subtract(getOffset(target))
}

/**
 * Calls the callback in the next animation frame, or where there are none,
 * through an interval timer.
 *
 * @private
 */
export function requestFrame(callback: () => void) {
  // Add to the list of callbacks to be called in the next animation frame.
  callbacks.push(callback)
  const window = getWindow()
  if (window?.requestAnimationFrame) {
    // Handle animation natively. We only need to request the frame once for
    // all collected callbacks.
    if (!isRequested) {
      window.requestAnimationFrame(handleCallbacks)
      isRequested = true
    }
  } else if (!timer) {
    // Install interval timer that checks all callbacks. This results in faster
    // animations than repeatedly installing timeout timers.
    timer = setInterval(handleCallbacks, 1000 / 60)
  }
}

function handleCallbacks() {
  // Make a local references to the current callbacks array and set callbacks
  // to a new empty array, so it can collect the functions for the new
  // requests.
  const functions = callbacks
  callbacks = []
  // Call the collected callback functions.
  for (const callback of functions) {
    callback()
  }
  // Now see if the above calls have collected new callbacks. Keep requesting
  // new frames as long as we have callbacks.
  const window = getWindow()
  isRequested = !!window?.requestAnimationFrame && callbacks.length > 0
  if (isRequested) {
    window.requestAnimationFrame(handleCallbacks)
  } else if (timer && !callbacks.length) {
    // Stop the interval timer of the fallback when there's nothing left to
    // do, so it doesn't keep hosts running. The next request starts it again:
    clearInterval(timer)
    timer = null
  }
}

function getPagePoint(event: any, target: Element): Point {
  function find(touches: TouchList) {
    for (let i = 0, l = touches.length; i < l; i++) {
      if (touches[i].target === target) return touches[i]
    }
  }

  const touches: TouchList = event.targetTouches
  let position: MouseEvent | Touch = event
  if (touches) {
    // Prefer the first touch on the target, also when it just ended, so that
    // touches elsewhere don't take over its drag (#1875):
    position = (
      find(event.touches) ||
      find(event.changedTouches) ||
      (touches.length ? touches[0] : event.changedTouches[0])
    )
  }
  const { documentElement } = getDocument()
  return new Point(
    position.pageX || position.clientX + documentElement.scrollLeft,
    position.pageY || position.clientY + documentElement.scrollTop
  )
}
