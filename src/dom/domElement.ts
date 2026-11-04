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

import { Rectangle, Size, getDocument } from '../internal.ts'
import type { Point } from '../basic/Point.ts'

/**
 * Returns the computed styles of the element, or of the document's root.
 *
 * @private
 */
export function getStyles(element: Element | Document): CSSStyleDeclaration {
  // If element is a document (nodeType == 9), use it directly
  const document =
    element && element.nodeType !== 9
      ? element.ownerDocument
      : (element as Document)
  const view = document?.defaultView
  return view?.getComputedStyle(element as Element, '') ?? null
}

/**
 * Returns the position of the element in the page, or with `viewport`, in
 * the viewport.
 *
 * @private
 */
export function getOffset(element: Element, viewport?: boolean): Point {
  return getBounds(element, viewport).point
}

/**
 * Returns the size of the element.
 *
 * @private
 */
export function getSize(element: Element): Size {
  return getBounds(element, true).size
}

/**
 * Returns the horizontal and vertical sums of the element's padding
 * and border widths, or with `start`, only the left and top ones.
 *
 * @private
 */
export function getInsets(element: Element, start?: boolean): Size {
  const style = getStyles(element)
  function get(side: string) {
    return (
      parseFloat(style[`padding${side}`]) +
      parseFloat(style[`border${side}Width`])
    )
  }
  return start
    ? new Size(get('Left'), get('Top'))
    : new Size(get('Left') + get('Right'), get('Top') + get('Bottom'))
}

/**
 * Checks if element is visible in current viewport.
 *
 * @private
 */
export function isInView(element: Element): boolean {
  // See if the viewport bounds intersect with the windows rectangle
  // which always starts at 0, 0
  return (
    !isInvisible(element) &&
    getViewportBounds(element).intersects(getBounds(element, true))
  )
}

/**
 * Checks if element is inside the DOM.
 *
 * @private
 */
export function isInserted(element: Element): boolean {
  return getDocument().body.contains(element)
}

/**
 * Sets the given properties on the element, or its style, also under their
 * WebKit prefix where the browser only knows that one.
 *
 * @private
 */
export function setPrefixed(
  element: object,
  name: string | Record<string, unknown>,
  value?: unknown
) {
  if (typeof name === 'object') {
    for (const [key, value] of Object.entries(name)) {
      setPrefixed(element, key, value)
    }
  } else {
    const prefixed = `webkit${name[0].toUpperCase()}${name.substring(1)}`
    const key = name in element ? name : prefixed in element ? prefixed : null
    if (key) {
      element[key] = value
    }
  }
}

function getBounds(element: Element, viewport?: boolean): Rectangle {
  const rect = element.getBoundingClientRect()
  let x = rect.left
  let y = rect.top
  if (!viewport) {
    const view = element.ownerDocument.defaultView
    x += view.scrollX
    y += view.scrollY
  }
  return new Rectangle(x, y, rect.width, rect.height)
}

function getViewportBounds(element: Element): Rectangle {
  const view = element.ownerDocument.defaultView
  return new Rectangle(0, 0, view.innerWidth, view.innerHeight)
}

// Checks if element is invisible (display: none, ...).
function isInvisible(element: Element): boolean {
  return getSize(element).equals(new Size(0, 0))
}
