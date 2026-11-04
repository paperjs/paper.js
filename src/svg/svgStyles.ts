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

import { PathItem, Shape, TextItem } from '../internal.ts'
import type { Item } from '../item/Item.ts'

/**
 * How a style property of Paper.js maps to an SVG attribute.
 *
 * @private
 */
export interface SvgStyle {
  // The type of the value, which says how it's converted:
  type: string
  property: string
  attribute: string
  // The SVG values of a 'lookup' type by the Paper.js values, and back:
  toSVG: Record<string, string> | null
  fromSVG: Record<string, string> | null
  // Whether the value is exported, for properties that aren't inherited:
  exportFilter: ((item: Item, value: any) => boolean) | null
}

// The entries: [attribute, type, lookup, exportFilter]
const entries: Record<
  string,
  [string, string, Record<string, string>?, SvgStyle['exportFilter']?]
> = {
  // Fill
  fillColor: ['fill', 'color'],
  fillRule: ['fill-rule', 'string'],
  // Stroke
  strokeColor: ['stroke', 'color'],
  strokeWidth: ['stroke-width', 'number'],
  strokeCap: ['stroke-linecap', 'string'],
  strokeJoin: ['stroke-linejoin', 'string'],
  strokeScaling: [
    'vector-effect',
    'lookup',
    {
      true: 'none',
      false: 'non-scaling-stroke'
    },
    function (item, value) {
      // no inheritance, only applies to graphical elements
      return (
        !value && ( // false, meaning non-scaling-stroke
          item instanceof PathItem ||
          item instanceof Shape ||
          item instanceof TextItem
        )
      )
    }
  ],
  miterLimit: ['stroke-miterlimit', 'number'],
  dashArray: ['stroke-dasharray', 'array'],
  dashOffset: ['stroke-dashoffset', 'number'],
  paintOrder: ['paint-order', 'order'],
  // Text
  fontFamily: ['font-family', 'string'],
  fontWeight: ['font-weight', 'font'],
  fontSize: ['font-size', 'number'],
  letterTracking: ['letter-spacing', 'tracking'],
  // The later of the justifications that share an anchor are imported:
  justification: [
    'text-anchor',
    'lookup',
    {
      justify: 'start',
      start: 'start',
      end: 'end',
      left: 'start',
      center: 'middle',
      right: 'end'
    }
  ],
  // Item, not inherited, so export them where they differ from the default:
  opacity: [
    'opacity',
    'number',
    null,
    function (item, value) {
      return value !== 1
    }
  ],
  blendMode: [
    'mix-blend-mode',
    'style',
    null,
    function (item, value) {
      return value !== 'normal'
    }
  ]
}

/**
 * The style properties that SVG import and export convert, by their names.
 *
 * @private
 */
export const svgStyles: Record<string, SvgStyle> = {}

for (const [property, entry] of Object.entries(entries)) {
  const [attribute, type, lookup, exportFilter] = entry
  svgStyles[property] = {
    type,
    property,
    attribute,
    toSVG: lookup,
    fromSVG: (
      lookup &&
      Object.fromEntries(
        Object.entries(lookup).map(([name, value]) => [value, name])
      )
    ),
    exportFilter
  }
}
