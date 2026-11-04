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

// The functionality needed to convert a Paper.js DOM to a SVG DOM.

import {
  Formatter,
  Group,
  Item,
  Layer,
  Matrix,
  Point,
  PointText,
  Project,
  Rectangle,
  Shape,
  createSvgElement,
  equals,
  getDocument,
  getUID,
  inject,
  isZero,
  setSvgAttributes,
  svgNamespace,
  svgStyles,
  xlinkNamespace
} from '../internal.ts'
import type { SvgStyle } from './svgStyles.ts'
import type { Raster } from '../item/Raster.ts'
import type { SymbolItem } from '../item/SymbolItem.ts'
import type { Path } from '../path/Path.ts'
import type { CompoundPath } from '../path/CompoundPath.ts'
import type { TextItem } from '../text/TextItem.ts'
import type { Color } from '../style/Color.ts'
import type { View } from '../view/View.ts'

type Options = Record<string, any>
type Attributes = Record<string, any>

let definitions: {
  ids: Record<string, number>
  svgs: Record<string, SVGElement>
}

// TODO: Consider moving formatter into options object, and pass it along.
let formatter: Formatter
// Getting the style values of groups walks all their children, so
// cache the values of parents during each export:
let parentStyles: Record<number, Record<string, any>>
// The matrix of the transform of the element being exported:
let elementMatrix: Matrix

function getTransform(
  matrix: Matrix,
  coordinates?: boolean,
  center?: boolean
): Attributes {
  const attrs: Attributes = {}
  let translation = matrix.translation
  if (coordinates) {
    // If the item supports x- and y- coordinates, we're taking out the
    // translation part of the matrix and move it to x, y attributes, to
    // produce more readable markup, and not have to use center points
    // in rotate(). To do so, SVG requires us to inverse transform the
    // translation point by the matrix itself, since they are provided
    // in local coordinates.
    let point: Point
    if (matrix.isInvertible()) {
      matrix = matrix._shiftless()
      point = matrix._inverseTransform(translation)
      translation = null
    } else {
      point = new Point()
    }
    attrs[center ? 'cx' : 'x'] = point.x
    attrs[center ? 'cy' : 'y'] = point.y
  }
  if (!matrix.isIdentity()) {
    // See if we can decompose the matrix and can formulate it as a
    // simple translate/scale/rotate command sequence.
    const decomposed = matrix.decompose()
    if (decomposed) {
      const parts = []
      const { rotation: angle, scaling: scale, skewing: skew } = decomposed
      if (translation && !translation.isZero()) {
        parts.push(`translate(${formatter.point(translation)})`)
      }
      if (angle) {
        parts.push(`rotate(${formatter.number(angle)})`)
      }
      if (!isZero(scale.x - 1) || !isZero(scale.y - 1)) {
        parts.push(`scale(${formatter.point(scale)})`)
      }
      if (skew.x) {
        parts.push(`skewX(${formatter.number(skew.x)})`)
      }
      if (skew.y) {
        parts.push(`skewY(${formatter.number(skew.y)})`)
      }
      attrs.transform = parts.join(' ')
    } else {
      attrs.transform = `matrix(${matrix.values.join(',')})`
    }
  }
  // The matrix of the element's transform, see exportGradient():
  elementMatrix = matrix
  return attrs
}

function exportGroup(item: Group, options: Options): SVGElement {
  const attrs = getTransform(item._matrix)
  const node = createSvgElement('g', attrs, formatter)
  for (const child of item._children) {
    if (child.clipMask) {
      const clip = exportClip(child, options)
      setDefinition(child, clip, 'clip', options)
      setSvgAttributes(node, {
        'clip-path': `url(#${clip.id})`
      })
    } else {
      const childNode = exportSVG(child, options)
      if (childNode) {
        node.appendChild(childNode)
      }
    }
  }
  return node
}

function exportClip(item: Item, options: Options): SVGElement {
  const clip = createSvgElement('clipPath')

  function addItem(item: Item) {
    if (item instanceof Group) {
      for (const child of item._children) {
        // As in Group#_draw(), leave out the clip items of nested
        // groups, which clips with all of their clipped content:
        if (!child._clipMask) {
          addItem(child)
        }
      }
    } else {
      const node = exportSVG(item, options)
      if (node) {
        clip.appendChild(node)
      }
    }
  }

  // <clipPath> can only contain shapes, so flatten groups and apply
  // their transformations to their content, on a copy:
  if (item instanceof Group) {
    item = item.clone({ insert: false })
    item.matrix.apply(true, true)
  }
  addItem(item)
  return clip
}

function exportRaster(item: Raster, options: Options): SVGElement {
  const attrs = getTransform(item._matrix, true)
  const { size, image } = item
  const href = (
    options.embedImages == false && image && 'src' in image && image.src ||
    item.toDataURL()
  )
  // Take into account that rasters are centered:
  attrs.x -= size.width / 2
  attrs.y -= size.height / 2
  if (options.reuseImages) {
    // Export each image only once into the definitions, along with
    // its size, as <use> can't size images:
    let node = getDefinition(href, 'image')
    if (!node) {
      node = createSvgElement(
        'image',
        {
          width: size.width,
          height: size.height,
          href
        },
        formatter
      )
      setDefinition(href, node, 'image', options)
    }
    attrs.href = `#${node.id}`
    return createSvgElement('use', attrs, formatter)
  } else {
    attrs.width = size.width
    attrs.height = size.height
    attrs.href = href
    return createSvgElement('image', attrs, formatter)
  }
}

function exportPath(item: Path, options: Options): SVGElement {
  const { matchShapes } = options
  const segmentsData = getSegmentsData(item)
  // Shapes have no segments that could keep their names and data:
  if (matchShapes && !segmentsData) {
    const shape = item.toShape(false)
    if (shape) {
      return exportShape(shape)
    }
  }
  const segments = item._segments
  const { length } = segments
  let type: string
  const attrs = getTransform(item._matrix)
  if (matchShapes && length >= 2 && !item.hasHandles()) {
    if (length > 2) {
      type = item._closed ? 'polygon' : 'polyline'
      attrs.points = segments
        .map(segment => formatter.point(segment._point))
        .join(' ')
    } else {
      type = 'line'
      const start = segments[0]._point
      const end = segments[1]._point
      Object.assign(attrs, {
        x1: start.x,
        y1: start.y,
        x2: end.x,
        y2: end.y
      })
    }
  } else {
    type = 'path'
    attrs.d = item._getPathData(null, options.precision)
  }
  if (segmentsData) {
    attrs['data-paper-segments'] = segmentsData
  }
  return createSvgElement(type, attrs, formatter)
}

function exportShape(item: Shape): SVGElement {
  let { type } = item
  let radius = item.radius as any
  const attrs = getTransform(item._matrix, true, type !== 'rectangle')
  if (type === 'rectangle') {
    type = 'rect' // SVG
    const { width, height } = item.size
    attrs.x -= width / 2
    attrs.y -= height / 2
    attrs.width = width
    attrs.height = height
    if (radius.isZero()) {
      radius = null
    }
  }
  if (radius) {
    if (type === 'circle') {
      attrs.r = radius
    } else {
      attrs.rx = radius.width
      attrs.ry = radius.height
    }
  }
  return createSvgElement(type, attrs, formatter)
}

function exportCompoundPath(item: CompoundPath, options: Options): SVGElement {
  const attrs = getTransform(item._matrix)
  const data = item._getPathData(null, options.precision)
  const segmentsData = getSegmentsData(item)
  if (data) {
    attrs.d = data
  }
  if (segmentsData) {
    attrs['data-paper-segments'] = segmentsData
  }
  return createSvgElement('path', attrs, formatter)
}

// Path data has no place for the names and data of segments, so store them
// as JSON, keyed by the index of the segment across all paths of the item:
function getSegmentsData(item: Path | CompoundPath): string | null {
  const paths = (item._children || [item]) as Path[]
  let entries: Record<number, { name?: string; data?: object }> = null
  let index = 0
  for (const path of paths) {
    for (const segment of path._segments) {
      const { _name: name, _data: data } = segment
      const hasData = data && !equals(data, {})
      if (name || hasData) {
        const entry: { name?: string; data?: object } = {}
        if (name) {
          entry.name = name
        }
        if (hasData) {
          entry.data = data
        }
        entries ||= {}
        entries[index] = entry
      }
      index++
    }
  }
  return entries && JSON.stringify(entries)
}

function exportSymbolItem(item: SymbolItem, options: Options): SVGElement {
  const attrs = getTransform(item._matrix, true)
  const definition = item._definition
  let node = getDefinition(definition, 'symbol')
  const definitionItem = definition._item
  const bounds = definitionItem.strokeBounds
  if (!node) {
    node = createSvgElement('symbol', {
      viewBox: formatter.rectangle(bounds)
    })
    node.appendChild(exportSVG(definitionItem, options))
    setDefinition(definition, node, 'symbol', options)
  }
  attrs.href = `#${node.id}`
  attrs.x += bounds.x
  attrs.y += bounds.y
  attrs.width = bounds.width
  attrs.height = bounds.height
  attrs.overflow = 'visible'
  return createSvgElement('use', attrs, formatter)
}

function exportGradient(color: Color, options: Options): string {
  // Gradients are in the coordinates of the item's parent, but SVG reads
  // them in those of the element, after its transform (#2410):
  if (!elementMatrix.isIdentity()) {
    color = color.clone()
    color.transform(elementMatrix.inverted())
  }
  // NOTE: As long as the fillTransform attribute is not implemented,
  // we need to create a separate gradient object for each gradient,
  // even when they share the same gradient definition.
  // http://www.svgopen.org/2011/papers/20-Separating_gradients_from_geometry/
  // TODO: Implement gradient merging in SvgImport
  let gradientNode = getDefinition(color, 'color')
  if (!gradientNode) {
    const { gradient, origin, destination } = color
    const radial = gradient._radial
    let attrs: Attributes
    if (radial) {
      const { aspect } = color
      let { highlight } = color
      let center = origin
      attrs = { r: origin.getDistance(destination) }
      if (aspect !== 1) {
        // An ellipse is a circle at 0, 0, rotated to the
        // gradient's axis and scaled across it:
        const { angle } = destination.subtract(origin)
        const local = new Matrix()
          .translate(origin)
          .rotate(angle)
          .scale(1, aspect)
        center = new Point()
        if (highlight) {
          highlight = local._inverseTransform(highlight)
        }
        attrs.gradientTransform = (
          `translate(${formatter.point(origin)}) ` +
          `rotate(${formatter.number(angle)}) ` +
          `scale(1,${formatter.number(aspect)})`
        )
      }
      attrs.cx = center.x
      attrs.cy = center.y
      if (highlight) {
        attrs.fx = highlight.x
        attrs.fy = highlight.y
      }
    } else {
      attrs = {
        x1: origin.x,
        y1: origin.y,
        x2: destination.x,
        y2: destination.y
      }
    }
    attrs.gradientUnits = 'userSpaceOnUse'
    gradientNode = createSvgElement(
      `${radial ? 'radial' : 'linear'}Gradient`,
      attrs,
      formatter
    )
    const stops = gradient._stops
    const count = stops.length
    for (const [index, stop] of stops.entries()) {
      const { _color: stopColor, _offset: offset } = stop
      const { alpha } = stopColor
      const stopAttrs: Attributes = {
        offset: offset == null ? index / (count - 1) : offset
      }
      if (stopColor) {
        stopAttrs['stop-color'] = stopColor.toCSS(true)
      }
      // See applyStyle for an explanation of why there are separated
      // opacity / color attributes.
      if (alpha < 1) {
        stopAttrs['stop-opacity'] = alpha
      }
      gradientNode.appendChild(createSvgElement('stop', stopAttrs, formatter))
    }
    setDefinition(color, gradientNode, 'color', options)
  }
  return `url(#${gradientNode.id})`
}

function exportPattern(color: Color, options: Options): string {
  // Patterns are placed in the coordinates of the item's parent too, see
  // exportGradient(). Exporting them changes elementMatrix, so restore
  // it after, for the other color of the element:
  const matrix = elementMatrix
  if (!matrix.isIdentity()) {
    color = color.clone()
    color.transform(matrix.inverted())
  }
  let patternNode = getDefinition(color, 'pattern')
  if (!patternNode) {
    const { pattern } = color
    const { _item: item, tile, spacing } = pattern
    const cell = new Rectangle(tile.point, tile.size.add(spacing))
    const { transform } = getTransform(color.matrix)
    // SVG draws the content of tiles relative to their top left
    // corner, so map the cell onto itself through viewBox:
    const attrs: Attributes = {
      x: cell.x,
      y: cell.y,
      width: cell.width,
      height: cell.height,
      viewBox: formatter.rectangle(cell),
      patternUnits: 'userSpaceOnUse'
    }
    let content = exportSVG(item, options)
    if (transform) {
      attrs.patternTransform = transform
    }
    patternNode = createSvgElement('pattern', attrs, formatter)
    // Leave the spacing between the tiles empty, as on the canvas:
    if (!spacing.isZero() && !tile.contains(item.strokeBounds)) {
      const rect = new Shape.Rectangle({
        rectangle: tile,
        insert: false
      })
      const clip = exportClip(rect, options)
      const group = createSvgElement('g')
      setDefinition(rect, clip, 'clip', options)
      group.setAttribute('clip-path', `url(#${clip.id})`)
      group.appendChild(content)
      content = group
    }
    patternNode.appendChild(content)
    setDefinition(color, patternNode, 'pattern', options)
  }
  elementMatrix = matrix
  return `url(#${patternNode.id})`
}

function exportShadow(item: Item, options: Options): string | null {
  // Shadows as SVG 1.1 filters, which browsers and editors render, with
  // their region in percent of the element's bounds, as Illustrator drops
  // items with fractions. Items without width or height can't have one,
  // so leave their shadows out (#1003):
  const box = item.internalBounds
  if (!box.width || !box.height) {
    return null
  }
  const { shadowColor: color, shadowOffset: offset, shadowBlur } = item._style
  // Canvas blurs with a standard deviation of half the shadow blur:
  const deviation = shadowBlur / 2
  // Cover the item and its shadow in its own coordinates, with the
  // blur up to three times its standard deviation:
  const bounds = item.getStrokeBounds(new Matrix())
  const rect = bounds
    .unite(new Rectangle(bounds.point.add(offset), bounds.size))
    .expand(6 * deviation)
  const region = new Matrix()
    .scale(100 / box.width, 100 / box.height)
    .translate(box.point.negate())
    ._transformBounds(rect)
  const filter = createSvgElement('filter')

  function add(type: string, attrs: Attributes) {
    filter.appendChild(createSvgElement(type, attrs, formatter))
  }

  for (const key of ['x', 'y', 'width', 'height']) {
    filter.setAttribute(key, `${formatter.number(region[key])}%`)
  }

  // SVG 1.1 renders a blur of 0 as nothing, so leave it out then:
  if (deviation > 0) {
    add('feGaussianBlur', {
      in: 'SourceAlpha',
      stdDeviation: deviation,
      result: 'blur'
    })
  }
  add('feOffset', {
    in: deviation > 0 ? 'blur' : 'SourceAlpha',
    dx: offset.x,
    dy: offset.y,
    result: 'offset'
  })
  add('feFlood', {
    'flood-color': color.toCSS(true),
    'flood-opacity': color.alpha,
    'result': 'color'
  })
  add('feComposite', {
    in: 'color',
    in2: 'offset',
    operator: 'in',
    result: 'shadow'
  })
  add('feComposite', {
    in: 'SourceGraphic',
    in2: 'shadow',
    operator: 'over'
  })
  setDefinition(item, filter, 'filter', options)
  return `url(#${filter.id})`
}

function exportText(item: TextItem, options: Options): SVGElement {
  const attrs = getTransform(item._matrix, true)
  const node = createSvgElement('text', attrs, formatter)
  const story = item._story
  const lines = item._getLayout()
  const isPointText = item instanceof PointText

  // A <tspan> with the attributes of the paragraph's or the run's styles
  // that are mixed in the text, and so not on the <text> itself:
  function createSpan(
    content: string | null,
    style: any,
    attributes: Attributes | null,
    isParagraph: boolean
  ) {
    const spanAttrs = { ...attributes }
    for (const entry of Object.values(svgStyles)) {
      const { property } = entry
      if (
        (property in story._paragraphKeys) === isParagraph &&
        item[property] === undefined
      ) {
        const value = style[property]
        if (value !== undefined) {
          setAttributes(spanAttrs, [], entry, value, options)
        }
      }
    }
    const span = createSvgElement('tspan', spanAttrs, formatter)
    if (content != null) {
      span.textContent = content
    }
    return span
  }

  // The line's content, in <tspan> elements for runs of mixed styles,
  // or as text, if they share them all:
  function addRuns(parent: SVGElement, line: any) {
    const runs = []
    for (const piece of line.pieces) {
      const last = runs[runs.length - 1]
      if (last && last.style.equals(piece.style)) {
        last.content += piece.content
      } else {
        runs.push({ content: piece.content, style: piece.style })
      }
    }
    const isMixed = runs.some(
      run => createSpan(null, run.style, null, false).attributes.length > 0
    )
    if (isMixed) {
      for (const run of runs) {
        parent.appendChild(createSpan(run.content, run.style, null, false))
      }
    } else {
      parent.textContent = runs.map(run => run.content).join('')
    }
  }

  if (isPointText) {
    // SVG text has no line breaks, so place each line in a <tspan> at
    // its own baseline, and where its justification and indents
    // anchor it. Use absolute y, as empty lines drop dy:
    if (lines.length > 1) {
      for (const line of lines) {
        const paragraph = story._getParagraph(line.start).style
        const side = item._getSide(paragraph.justification, paragraph.direction)
        const span = createSpan(
          null,
          paragraph,
          {
            x: (
              attrs.x +
              line.x + (
                side === 'right'
                  ? line.width
                  : side === 'center'
                    ? line.width / 2
                    : 0
              )
            ),
            y: attrs.y + line.y
          },
          true
        )
        addRuns(span, line)
        node.appendChild(span)
      }
    } else if (lines.length) {
      addRuns(node, lines[0])
    }
  } else {
    // SVG 1.1 doesn't lay out area text or text on paths, so place
    // each line in a <tspan>, and each of its pieces in one at its
    // place, turned with its letters, from their start whatever the
    // text's justification anchors:
    const { justification } = item
    const anchor = (
      justification &&
      justification !== 'left' &&
      { 'text-anchor': 'start' }
    )
    for (const line of lines) {
      const span = createSvgElement(
        'tspan',
        Object.assign(
          {
            x: attrs.x + line.x,
            y: attrs.y + line.y
          },
          anchor
        ),
        formatter
      )
      for (const piece of line.pieces) {
        const angle = piece.rotation
        const origin = new Point(piece.dx || 0, 0)
          .rotate(angle)
          .add(piece.x, line.y + piece.y)
        const pieceAttrs: Attributes = {
          x: attrs.x + origin.x,
          y: attrs.y + origin.y
        }
        if (angle) {
          pieceAttrs.rotate = angle
        }
        span.appendChild(
          createSpan(piece.content, piece.style, pieceAttrs, false)
        )
      }
      node.appendChild(span)
    }
  }
  return node
}

const exporters: Record<string, (item: any, options: Options) => SVGElement> = {
  Group: exportGroup,
  Layer: exportGroup,
  Raster: exportRaster,
  Path: exportPath,
  Shape: exportShape,
  CompoundPath: exportCompoundPath,
  SymbolItem: exportSymbolItem,
  PointText: exportText,
  PathText: exportText,
  AreaText: exportText
}

// The blend modes of CSS's mix-blend-mode, which other SVG viewers render.
// Paper.js's own ones go into an attribute that only it reads (#1296):
const cssBlendModes = new Set([
  'normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten',
  'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference',
  'exclusion', 'hue', 'saturation', 'color', 'luminosity'
])

// Set the attributes of the style entry with its value, or its CSS style:
function setAttributes(
  attrs: Attributes,
  style: string[],
  entry: SvgStyle,
  value: any,
  options: Options
) {
  const { type, attribute } = entry
  if (type === 'color' && value != null) {
    // Support for css-style rgba() values is not in SVG 1.1, so
    // separate the alpha value of colors with alpha into the
    // separate fill- / stroke-opacity attribute:
    const { alpha } = value
    if (alpha < 1) {
      attrs[`${attribute}-opacity`] = alpha
    }
  }
  if (type === 'style') {
    if (cssBlendModes.has(value)) {
      style.push(`${attribute}: ${value}`)
    } else {
      attrs['data-paper-blend-mode'] = value
    }
  } else if (type === 'font') {
    // Paper.js combines the font style with the weight, while
    // SVG keeps it in its own attribute:
    const font = `${value}`.match(/^(.*?)\s*\b(italic|oblique)\b\s*(.*)$/i)
    attrs[attribute] = font
      ? `${font[1]} ${font[3]}`.trim() || 'normal'
      : value
    if (font) {
      attrs['font-style'] = font[2].toLowerCase()
    }
  } else {
    attrs[attribute] =
      value == null
        ? 'none'
        : type === 'color'
          ? value.gradient
            ? exportGradient(value, options)
            : value.pattern
              ? exportPattern(value, options)
              : // true for noAlpha, see above
                value.toCSS(true)
          : type === 'array'
            ? value.join(',')
            : type === 'lookup'
              ? entry.toSVG[value]
              : // Tracking is in thousandths of an em:
                type === 'tracking'
                ? value && `${value / 1000}em`
                : value
  }
}

function applyStyle(
  item: Item,
  node: SVGElement,
  options: Options,
  isRoot?: boolean
): SVGElement {
  const attrs: Attributes = {}
  const parent = !isRoot && item.parent
  const parentStyle = parent && (parentStyles[parent._id] ||= {})
  const isGroup = item instanceof Group
  const style = []

  if (item._name != null) {
    attrs.id = item._name
  }

  for (const entry of Object.values(svgStyles)) {
    // Get a given style only if it differs from the value on the parent
    // (A layer or group which can have style values in SVG).
    const { property } = entry
    const value = item[property]
    // SVG reads gradients and patterns in the coordinates of the
    // elements that draw them, so they don't go on groups (#2410):
    const isPaintServer = (
      entry.type === 'color' &&
      value &&
      (value.gradient || value.pattern)
    )
    if (parent && !(property in parentStyle)) {
      parentStyle[property] = parent[property]
    }
    // Skip undefined values, as found on groups with mixed children:
    if (
      value !== undefined && (
        isPaintServer
          ? !isGroup
          : entry.exportFilter
            ? entry.exportFilter(item, value)
            : options.reduceAttributes == false ||
              !parent ||
              !equals(parentStyle[property], value)
      )
    ) {
      setAttributes(attrs, style, entry, value, options)
    }
  }

  // Groups don't draw shadows, so only export those of the item itself:
  const filter = (
    item._style._get('shadowColor', true) &&
    item.hasShadow() &&
    exportShadow(item, options)
  )
  if (filter) {
    attrs.filter = filter
  }

  if (style.length) {
    attrs.style = style.join(';')
  }

  if (!item._visible) {
    attrs.visibility = 'hidden'
  }

  return setSvgAttributes(node, attrs, formatter)
}

function getDefinition(item: any, type?: string): SVGElement {
  definitions ||= { ids: {}, svgs: {} }
  return item && definitions.svgs[getDefinitionKey(item, type)]
}

function setDefinition(
  item: any,
  node: SVGElement,
  type: string,
  options: Options
) {
  // Make sure the definitions lookup is created before we use it.
  // This is required by 'clip', where getDefinition() is not called.
  if (!definitions) {
    getDefinition(null)
  }
  // Have different id ranges per type
  const typeId = (definitions.ids[type] = (definitions.ids[type] || 0) + 1)
  // Give the svg node an id, and link to it from the item's key.
  node.id = `${options.idPrefix || ''}${type}-${typeId}`
  definitions.svgs[getDefinitionKey(item, type)] = node
}

function getDefinitionKey(item: any, type: string): string {
  // Use #__id for items that don't have internal #_id properties (Color),
  // and give them ids from their own private id pool named 'svg'.
  // Strings, e.g. the href of images, are their own keys.
  return `${type}-${
    typeof item === 'string'
      ? item
      : item._id || item.__id || (item.__id = getUID('svg'))
  }`
}

function exportDefinitions(
  node: SVGElement,
  options: Options
): SVGElement | string {
  let svg = node
  let defs = null
  if (definitions) {
    // We can only use svg nodes as definition containers. Have the loop
    // produce one if it's a single item of another type (when calling
    // #exportSVG() on an item rather than a whole project)
    // jsdom in Node.js uses uppercase values for nodeName...
    svg = node.nodeName.toLowerCase() === 'svg' && node
    for (const definition of Object.values(definitions.svgs)) {
      // This code is inside the loop so we only create a container if
      // we actually have svgs.
      if (!defs) {
        if (!svg) {
          svg = createSvgElement('svg')
          svg.appendChild(node)
        }
        defs = svg.insertBefore(createSvgElement('defs'), svg.firstChild)
      }
      defs.appendChild(definition)
    }
    // Clear definitions at the end of export
    definitions = null
  }
  parentStyles = null
  // Illustrator ignores filters without line breaks around them:
  return options.asString
    ? new (getDocument().defaultView.XMLSerializer)()
        .serializeToString(svg)
        .replace(/<defs>|<\/filter>|<\/defs>/g, '$&\n')
    : svg
}

function exportSVG(item: Item, options: Options, isRoot?: boolean): SVGElement {
  let output = item.getEffectOutput()
  if (output) {
    // Write the output of the item's effects in its place, expanded:
    output = output.clone({ insert: false })
    output.transform(item._matrix)
    return exportSVG(output, options, isRoot)
  }
  const exporter = exporters[item.className]
  let node = exporter && exporter(item, options)
  if (node) {
    // Support processNode callback, to provide mechanism to handle
    // special attributes (e.g. inkscape:transform-center)
    const { processNode } = options
    if (processNode) {
      node = processNode({ item, node }) || node
    }
    const data = JSON.stringify(item._data)
    if (data && data !== '{}' && data !== 'null') {
      node.setAttribute('data-paper-data', data)
    }
    // Mark layers, so SvgImport can tell them from groups (#483):
    if (item instanceof Layer) {
      node.setAttribute('data-paper-layer', '')
    }
  }
  return node && applyStyle(item, node, options, isRoot)
}

function setOptions(options: Options): Options {
  options ||= {}
  formatter = new Formatter(options.precision)
  parentStyles = {}
  return options
}

// Export the items in an svg root element, sized to the bounds and
// transformed by the matrix of the options:
function exportRoot(
  items: Item[],
  view: View,
  bounds: any,
  options: Options
): SVGElement | string {
  const values = options.matrix || bounds === 'view' && view._matrix
  const matrix = values && new Matrix(values)
  const rect =
    bounds === 'view'
      ? new Rectangle([0, 0], view.viewSize)
      : bounds === 'content'
        ? Item._getBounds(items, matrix, { stroke: true }).rect
        : bounds && Rectangle.from(bounds)
  const attrs: Attributes = {
    'version': '1.1',
    'xmlns': svgNamespace,
    'xmlns:xlink': xlinkNamespace
  }
  if (rect) {
    attrs.width = rect.width
    attrs.height = rect.height
    if (rect.x || rect.x === 0 || rect.y || rect.y === 0) {
      attrs.viewBox = formatter.rectangle(rect)
    }
  }
  const node = createSvgElement('svg', attrs, formatter)
  let parent = node
  // If the view has a transformation, wrap all items in a group with
  // that transformation applied to.
  if (matrix && !matrix.isIdentity()) {
    parent = node.appendChild(
      createSvgElement('g', getTransform(matrix), formatter)
    )
  }
  for (const item of items) {
    parent.appendChild(exportSVG(item, options, true))
  }
  return exportDefinitions(node, options)
}

// NOTE: Documentation is in Item#exportSVG()
inject(Item.prototype, {
  exportSVG(this: Item, options?: Options): SVGElement | string {
    options = setOptions(options)
    const { bounds } = options
    return bounds || options.matrix
      ? exportRoot([this], this.view, bounds, options)
      : exportDefinitions(exportSVG(this, options, true), options)
  }
})

// NOTE: Documentation is in Project#exportSVG()
inject(Project.prototype, {
  exportSVG(this: Project, options?: Options): SVGElement | string {
    options = setOptions(options)
    return exportRoot(
      this._children,
      this.view,
      options.bounds !== undefined ? options.bounds : 'view',
      options
    )
  }
})
