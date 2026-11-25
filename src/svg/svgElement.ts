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

import { getDocument } from '../internal.ts'
import type { Formatter } from '../util/Formatter.ts'

// SVG related namespaces
export const svgNamespace = 'http://www.w3.org/2000/svg'
const xmlnsNamespace = 'http://www.w3.org/2000/xmlns'
export const xlinkNamespace = 'http://www.w3.org/1999/xlink'

// Mapping of attribute names to required namespaces:
const attributeNamespace = {
  'href': xlinkNamespace,
  'xlink': xmlnsNamespace,
  // Only the xmlns attribute needs the trailing slash. See #984
  'xmlns': xmlnsNamespace + '/',
  // IE needs the xmlns namespace when setting 'xmlns:xlink'. See #984
  'xmlns:xlink': xmlnsNamespace + '/'
}

/**
 * Creates an SVG element with the tag and the attributes, with their numbers
 * formatted by the formatter.
 *
 * @private
 */
export function createSvgElement(
  tag: string,
  attributes?: Record<string, any>,
  formatter?: Formatter
): SVGElement {
  return setSvgAttributes(
    getDocument().createElementNS(svgNamespace, tag),
    attributes,
    formatter
  )
}

/**
 * Returns the value of the node's attribute, read in its namespace if it has
 * one.
 *
 * @private
 */
export function getSvgAttribute(node: Element, name: string): string | null {
  // SVG 2 replaces xlink:href with plain href, which takes precedence:
  const namespace = attributeNamespace[name]
  const value = namespace
    ? node.getAttribute(name) || node.getAttributeNS(namespace, name)
    : node.getAttribute(name)
  return value === 'null' ? null : value
}

/**
 * Sets the attributes on the node, in their namespaces if they have one, with
 * their numbers formatted by the formatter.
 *
 * @private
 */
export function setSvgAttributes<T extends Element>(
  node: T,
  attributes: Record<string, any>,
  formatter?: Formatter
): T {
  for (const name in attributes) {
    let value = attributes[name]
    const namespace = attributeNamespace[name]
    if (typeof value === 'number' && formatter) {
      value = formatter.number(value)
    }
    if (namespace) {
      node.setAttributeNS(namespace, name, value)
    } else {
      node.setAttribute(name, value)
    }
  }
  return node
}

// The attributes that hold the geometry of the elements that svgExport writes:
const geometryAttributes = [
  'd', 'points', 'transform', 'x', 'y', 'width', 'height', 'cx', 'cy', 'r',
  'rx', 'ry', 'x1', 'y1', 'x2', 'y2'
]

/**
 * Returns a hash of the geometry of the element and its descendants, which
 * tells svgImport whether another editor changed what svgExport wrote for an
 * item that it restores, see `data-paper-item`.
 *
 * @private
 */
export function getGeometryHash(node: Element): string {
  // FNV-1a, over the geometry attributes of the elements in document order:
  let hash = 0x811c9dc5
  for (const element of [node, ...node.querySelectorAll('*')]) {
    for (const name of geometryAttributes) {
      const value = element.getAttribute(name)
      if (value != null) {
        for (const char of `${name}=${value};`) {
          hash = Math.imul(hash ^ char.charCodeAt(0), 0x01000193)
        }
      }
    }
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}
