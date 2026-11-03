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

/**
 * A function scope holding all the functionality needed to convert a
 * Paper.js DOM to a SVG DOM.
 */
new (function () {
  let definitions

  // TODO: Consider moving formatter into options object, and pass it along.
  let formatter
  // Getting the style values of groups walks all their children, so
  // cache the values of parents during each export:
  let parentStyles
  // The matrix of the transform of the element being exported:
  let elementMatrix

  function getTransform(matrix, coordinates, center) {
    // Use new Base() so we can use Base#set() on it.
    const attrs = new Base()
    let trans = matrix.getTranslation()
    if (coordinates) {
      // If the item supports x- and y- coordinates, we're taking out the
      // translation part of the matrix and move it to x, y attributes, to
      // produce more readable markup, and not have to use center points
      // in rotate(). To do so, SVG requires us to inverse transform the
      // translation point by the matrix itself, since they are provided
      // in local coordinates.
      let point
      if (matrix.isInvertible()) {
        matrix = matrix._shiftless()
        point = matrix._inverseTransform(trans)
        trans = null
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
        const angle = decomposed.rotation
        const scale = decomposed.scaling
        const skew = decomposed.skewing
        if (trans && !trans.isZero())
          parts.push('translate(' + formatter.point(trans) + ')')
        if (angle) parts.push('rotate(' + formatter.number(angle) + ')')
        if (!Numerical.isZero(scale.x - 1) || !Numerical.isZero(scale.y - 1))
          parts.push('scale(' + formatter.point(scale) + ')')
        if (skew.x) parts.push('skewX(' + formatter.number(skew.x) + ')')
        if (skew.y) parts.push('skewY(' + formatter.number(skew.y) + ')')
        attrs.transform = parts.join(' ')
      } else {
        attrs.transform = 'matrix(' + matrix.getValues().join(',') + ')'
      }
    }
    // The matrix of the element's transform, see exportGradient():
    elementMatrix = matrix
    return attrs
  }

  function exportGroup(item, options) {
    const attrs = getTransform(item._matrix)
    const children = item._children
    const node = SvgElement.create('g', attrs, formatter)
    for (let i = 0, l = children.length; i < l; i++) {
      const child = children[i]
      if (child.isClipMask()) {
        const clip = exportClip(child, options)
        setDefinition(child, clip, 'clip', options)
        SvgElement.set(node, {
          'clip-path': 'url(#' + clip.id + ')'
        })
      } else {
        const childNode = exportSVG(child, options)
        if (childNode) node.appendChild(childNode)
      }
    }
    return node
  }

  function exportClip(item, options) {
    const clip = SvgElement.create('clipPath')

    function addItem(item) {
      if (item instanceof Group) {
        const children = item._children
        for (let i = 0, l = children.length; i < l; i++) {
          // As in Group#_draw(), leave out the clip items of nested
          // groups, which clips with all of their clipped content:
          if (!children[i]._clipMask) addItem(children[i])
        }
      } else {
        const node = exportSVG(item, options)
        if (node) clip.appendChild(node)
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

  function exportRaster(item, options) {
    const attrs = getTransform(item._matrix, true)
    const size = item.getSize()
    const image = item.getImage()
    const href = (
      options.embedImages == false && image && image.src ||
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
        node = SvgElement.create(
          'image',
          {
            width: size.width,
            height: size.height,
            href: href
          },
          formatter
        )
        setDefinition(href, node, 'image', options)
      }
      attrs.href = '#' + node.id
      return SvgElement.create('use', attrs, formatter)
    } else {
      attrs.width = size.width
      attrs.height = size.height
      attrs.href = href
      return SvgElement.create('image', attrs, formatter)
    }
  }

  function exportPath(item, options) {
    const matchShapes = options.matchShapes
    const segmentsData = getSegmentsData(item)
    // Shapes have no segments that could keep their names and data:
    if (matchShapes && !segmentsData) {
      const shape = item.toShape(false)
      if (shape) return exportShape(shape, options)
    }
    const segments = item._segments
    const length = segments.length
    let type
    const attrs = getTransform(item._matrix)
    if (matchShapes && length >= 2 && !item.hasHandles()) {
      if (length > 2) {
        type = item._closed ? 'polygon' : 'polyline'
        const parts = []
        for (let i = 0; i < length; i++) {
          parts.push(formatter.point(segments[i]._point))
        }
        attrs.points = parts.join(' ')
      } else {
        type = 'line'
        const start = segments[0]._point
        const end = segments[1]._point
        attrs.set({
          x1: start.x,
          y1: start.y,
          x2: end.x,
          y2: end.y
        })
      }
    } else {
      type = 'path'
      attrs.d = item.getPathData(null, options.precision)
    }
    if (segmentsData) attrs['data-paper-segments'] = segmentsData
    return SvgElement.create(type, attrs, formatter)
  }

  function exportShape(item) {
    let type = item._type
    let radius = item._radius
    const attrs = getTransform(item._matrix, true, type !== 'rectangle')
    if (type === 'rectangle') {
      type = 'rect' // SVG
      const size = item._size
      const width = size.width
      const height = size.height
      attrs.x -= width / 2
      attrs.y -= height / 2
      attrs.width = width
      attrs.height = height
      if (radius.isZero()) radius = null
    }
    if (radius) {
      if (type === 'circle') {
        attrs.r = radius
      } else {
        attrs.rx = radius.width
        attrs.ry = radius.height
      }
    }
    return SvgElement.create(type, attrs, formatter)
  }

  function exportCompoundPath(item, options) {
    const attrs = getTransform(item._matrix)
    const data = item.getPathData(null, options.precision)
    const segmentsData = getSegmentsData(item)
    if (data) attrs.d = data
    if (segmentsData) attrs['data-paper-segments'] = segmentsData
    return SvgElement.create('path', attrs, formatter)
  }

  // Path data has no place for the names and data of segments, so store them
  // as JSON, keyed by the index of the segment across all paths of the item:
  function getSegmentsData(item) {
    const paths = item._children || [item]
    let entries = null
    let index = 0
    for (let i = 0, l = paths.length; i < l; i++) {
      const segments = paths[i]._segments
      for (let j = 0, m = segments.length; j < m; j++, index++) {
        const segment = segments[j]
        const name = segment._name
        const data = segment._data
        const hasData = data && !Base.equals(data, {})
        if (name || hasData) {
          const entry = ((entries = entries || {})[index] = {})
          if (name) entry.name = name
          if (hasData) entry.data = data
        }
      }
    }
    return entries && JSON.stringify(entries)
  }

  function exportSymbolItem(item, options) {
    const attrs = getTransform(item._matrix, true)
    const definition = item._definition
    let node = getDefinition(definition, 'symbol')
    const definitionItem = definition._item
    const bounds = definitionItem.getStrokeBounds()
    if (!node) {
      node = SvgElement.create('symbol', {
        viewBox: formatter.rectangle(bounds)
      })
      node.appendChild(exportSVG(definitionItem, options))
      setDefinition(definition, node, 'symbol', options)
    }
    attrs.href = '#' + node.id
    attrs.x += bounds.x
    attrs.y += bounds.y
    attrs.width = bounds.width
    attrs.height = bounds.height
    attrs.overflow = 'visible'
    return SvgElement.create('use', attrs, formatter)
  }

  function exportGradient(color, options) {
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
      const gradient = color.getGradient()
      const radial = gradient._radial
      const origin = color.getOrigin()
      const destination = color.getDestination()
      let attrs
      if (radial) {
        const aspect = color.getAspect()
        let highlight = color.getHighlight()
        let center = origin
        attrs = { r: origin.getDistance(destination) }
        if (aspect !== 1) {
          // An ellipse is a circle at 0, 0, rotated to the
          // gradient's axis and scaled across it:
          const angle = destination.subtract(origin).getAngle()
          const local = new Matrix()
            .translate(origin)
            .rotate(angle)
            .scale(1, aspect)
          center = new Point()
          if (highlight) highlight = local._inverseTransform(highlight)
          attrs.gradientTransform = (
            'translate(' +
            formatter.point(origin) +
            ') rotate(' +
            formatter.number(angle) +
            ') scale(1,' +
            formatter.number(aspect) +
            ')'
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
      gradientNode = SvgElement.create(
        (radial ? 'radial' : 'linear') +
        'Gradient',
        attrs,
        formatter
      )
      const stops = gradient._stops
      for (let i = 0, l = stops.length; i < l; i++) {
        const stop = stops[i]
        const stopColor = stop._color
        const alpha = stopColor.getAlpha()
        const offset = stop._offset
        attrs = {
          offset: offset == null ? i / (l - 1) : offset
        }
        if (stopColor) attrs['stop-color'] = stopColor.toCSS(true)
        // See applyStyle for an explanation of why there are separated
        // opacity / color attributes.
        if (alpha < 1) attrs['stop-opacity'] = alpha
        gradientNode.appendChild(
          SvgElement.create('stop', attrs, formatter)
        )
      }
      setDefinition(color, gradientNode, 'color', options)
    }
    return 'url(#' + gradientNode.id + ')'
  }

  function exportPattern(color, options) {
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
      const pattern = color.getPattern()
      const item = pattern._item
      const tile = pattern.getTile()
      const spacing = pattern._spacing
      const cell = new Rectangle(tile.getPoint(), tile.getSize().add(spacing))
      const transform = getTransform(color.getMatrix()).transform
      // SVG draws the content of tiles relative to their top left
      // corner, so map the cell onto itself through viewBox:
      const attrs = {
        x: cell.x,
        y: cell.y,
        width: cell.width,
        height: cell.height,
        viewBox: formatter.rectangle(cell),
        patternUnits: 'userSpaceOnUse'
      }
      let content = exportSVG(item, options)
      if (transform) attrs.patternTransform = transform
      patternNode = SvgElement.create('pattern', attrs, formatter)
      // Leave the spacing between the tiles empty, as on the canvas:
      if (!spacing.isZero() && !tile.contains(item.getStrokeBounds())) {
        const rect = new Shape.Rectangle({
          rectangle: tile,
          insert: false
        })
        const clip = exportClip(rect, options)
        const group = SvgElement.create('g')
        setDefinition(rect, clip, 'clip', options)
        group.setAttribute('clip-path', 'url(#' + clip.id + ')')
        group.appendChild(content)
        content = group
      }
      patternNode.appendChild(content)
      setDefinition(color, patternNode, 'pattern', options)
    }
    elementMatrix = matrix
    return 'url(#' + patternNode.id + ')'
  }

  function exportShadow(item, options) {
    // Shadows as SVG 1.1 filters, which browsers and editors render, with
    // their region in percent of the element's bounds, as Illustrator drops
    // items with fractions. Items without width or height can't have one,
    // so leave their shadows out (#1003):
    const box = item.getInternalBounds()
    if (!box.width || !box.height) return null
    const style = item._style
    const color = style.getShadowColor()
    const offset = style.getShadowOffset()
    // Canvas blurs with a standard deviation of half the shadow blur:
    const deviation = style.getShadowBlur() / 2
    // Cover the item and its shadow in its own coordinates, with the
    // blur up to three times its standard deviation:
    const bounds = item.getStrokeBounds(new Matrix())
    const rect = bounds
      .unite(new Rectangle(bounds.getPoint().add(offset), bounds.getSize()))
      .expand(6 * deviation)
    const region = new Matrix()
      .scale(100 / box.width, 100 / box.height)
      .translate(box.getPoint().negate())
      ._transformBounds(rect)
    const filter = SvgElement.create('filter')

    function add(type, attrs) {
      filter.appendChild(SvgElement.create(type, attrs, formatter))
    }

    Base.each(['x', 'y', 'width', 'height'], function (key) {
      filter.setAttribute(key, formatter.number(region[key]) + '%')
    })

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
      'flood-opacity': color.getAlpha(),
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
    return 'url(#' + filter.id + ')'
  }

  function exportText(item, options) {
    let i
    let l
    let line
    let span

    const attrs = getTransform(item._matrix, true)
    const node = SvgElement.create('text', attrs, formatter)
    const story = item._story
    const lines = item._getLayout()
    const isPointText = item instanceof PointText

    // A <tspan> with the attributes of the paragraph's or the run's styles
    // that are mixed in the text, and so not on the <text> itself:
    function createSpan(content, style, spanAttrs, isParagraph) {
      spanAttrs = Base.set({}, spanAttrs)
      Base.each(SvgStyles, function (entry) {
        if (
          (entry.property in story._paragraphKeys) === isParagraph &&
          item[entry.get]() === undefined
        ) {
          const value = style[entry.get]()
          if (value !== undefined)
            setAttributes(spanAttrs, [], entry, value, options)
        }
      })
      const span = SvgElement.create('tspan', spanAttrs, formatter)
      if (content != null) span.textContent = content
      return span
    }

    // The line's content, in <tspan> elements for runs of mixed styles,
    // or as text, if they share them all:
    function addRuns(parent, line) {
      let i
      let l

      const pieces = line.pieces
      const runs = []
      for (i = 0, l = pieces.length; i < l; i++) {
        const piece = pieces[i]
        const last = runs[runs.length - 1]
        if (last && last.style.equals(piece.style)) {
          last.content += piece.content
        } else {
          runs.push({ content: piece.content, style: piece.style })
        }
      }
      const isMixed = runs.some(function (run) {
        return createSpan(null, run.style, null, false).attributes.length > 0
      })
      if (isMixed) {
        for (i = 0, l = runs.length; i < l; i++) {
          parent.appendChild(
            createSpan(runs[i].content, runs[i].style, null, false)
          )
        }
      } else {
        parent.textContent = runs
          .map(function (run) {
            return run.content
          })
          .join('')
      }
    }

    if (isPointText) {
      // SVG text has no line breaks, so place each line in a <tspan> at
      // its own baseline, and where its justification and indents
      // anchor it. Use absolute y, as empty lines drop dy:
      if (lines.length > 1) {
        for (i = 0, l = lines.length; i < l; i++) {
          line = lines[i]
          const paragraph = story._getParagraph(line.start).style
          const side = item._getSide(
            paragraph.getJustification(),
            paragraph.getDirection()
          )
          span = createSpan(
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
      const justification = item.getJustification()
      const anchor = (
        justification &&
        justification !== 'left' &&
        { 'text-anchor': 'start' }
      )
      for (i = 0, l = lines.length; i < l; i++) {
        line = lines[i]
        const pieces = line.pieces
        span = SvgElement.create(
          'tspan',
          Base.set(
            {
              x: attrs.x + line.x,
              y: attrs.y + line.y
            },
            anchor
          ),
          formatter
        )
        for (let j = 0, m = pieces.length; j < m; j++) {
          const piece = pieces[j]
          const angle = piece.rotation
          const origin = new Point(piece.dx || 0, 0)
            .rotate(angle)
            .add(piece.x, line.y + piece.y)
          const pieceAttrs = {
            x: attrs.x + origin.x,
            y: attrs.y + origin.y
          }
          if (angle) pieceAttrs.rotate = angle
          span.appendChild(
            createSpan(piece.content, piece.style, pieceAttrs, false)
          )
        }
        node.appendChild(span)
      }
    }
    return node
  }

  const exporters = {
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
  const cssBlendModes = Base.each(
    [
      'normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten',
      'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference',
      'exclusion', 'hue', 'saturation', 'color', 'luminosity'
    ],
    function (mode) {
      this[mode] = true
    },
    {}
  )

  // Set the attributes of the style entry with its value, or its CSS style:
  function setAttributes(attrs, style, entry, value, options) {
    const type = entry.type
    if (type === 'color' && value != null) {
      // Support for css-style rgba() values is not in SVG 1.1, so
      // separate the alpha value of colors with alpha into the
      // separate fill- / stroke-opacity attribute:
      const alpha = value.getAlpha()
      if (alpha < 1) attrs[entry.attribute + '-opacity'] = alpha
    }
    if (type === 'style') {
      if (cssBlendModes[value]) {
        style.push(entry.attribute + ': ' + value)
      } else {
        attrs['data-paper-blend-mode'] = value
      }
    } else if (type === 'font') {
      // Paper.js combines the font style with the weight, while
      // SVG keeps it in its own attribute:
      const font = ('' + value).match(
        /^(.*?)\s*\b(italic|oblique)\b\s*(.*)$/i
      )
      attrs[entry.attribute] = font
        ? (font[1] + ' ' + font[3]).trim() || 'normal'
        : value
      if (font) attrs['font-style'] = font[2].toLowerCase()
    } else {
      attrs[entry.attribute] =
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
                  ? value && value / 1000 + 'em'
                  : value
    }
  }

  function applyStyle(item, node, options, isRoot) {
    const attrs = {}
    const parent = !isRoot && item.getParent()
    const parentStyle = (
      parent &&
      (parentStyles[parent._id] = parentStyles[parent._id] || {})
    )
    const isGroup = item instanceof Group
    const style = []

    if (item._name != null) attrs.id = item._name

    Base.each(SvgStyles, function (entry) {
      // Get a given style only if it differs from the value on the parent
      // (A layer or group which can have style values in SVG).
      const get = entry.get
      const value = item[get]()
      // SVG reads gradients and patterns in the coordinates of the
      // elements that draw them, so they don't go on groups (#2410):
      const isPaintServer = (
        entry.type === 'color' &&
        value &&
        (value.gradient || value.pattern)
      )
      if (parent && !(get in parentStyle)) parentStyle[get] = parent[get]()
      // Skip undefined values, as found on groups with mixed children:
      if (
        value !== undefined && (
          isPaintServer
            ? !isGroup
            : entry.exportFilter
              ? entry.exportFilter(item, value)
              : options.reduceAttributes == false ||
                !parent ||
                !Base.equals(parentStyle[get], value)
        )
      ) {
        setAttributes(attrs, style, entry, value, options)
      }
    })

    // Groups don't draw shadows, so only export those of the item itself:
    const filter = (
      item._style.getShadowColor(true) &&
      item.hasShadow() &&
      exportShadow(item, options)
    )
    if (filter) attrs.filter = filter

    if (style.length) attrs.style = style.join(';')

    if (!item._visible) attrs.visibility = 'hidden'

    return SvgElement.set(node, attrs, formatter)
  }

  function getDefinition(item, type) {
    if (!definitions) definitions = { ids: {}, svgs: {} }
    return item && definitions.svgs[getDefinitionKey(item, type)]
  }

  function setDefinition(item, node, type, options) {
    // Make sure the definitions lookup is created before we use it.
    // This is required by 'clip', where getDefinition() is not called.
    if (!definitions) getDefinition()
    // Have different id ranges per type
    const typeId = (definitions.ids[type] = (definitions.ids[type] || 0) + 1)
    // Give the svg node an id, and link to it from the item's key.
    node.id = (options.idPrefix || '') + type + '-' + typeId
    definitions.svgs[getDefinitionKey(item, type)] = node
  }

  function getDefinitionKey(item, type) {
    // Use #__id for items that don't have internal #_id properties (Color),
    // and give them ids from their own private id pool named 'svg'.
    // Strings, e.g. the href of images, are their own keys.
    return (
      type +
      '-' + (
        typeof item === 'string'
          ? item
          : item._id || item.__id || (item.__id = UID.get('svg'))
      )
    )
  }

  function exportDefinitions(node, options) {
    let svg = node
    let defs = null
    if (definitions) {
      // We can only use svg nodes as definition containers. Have the loop
      // produce one if it's a single item of another type (when calling
      // #exportSVG() on an item rather than a whole project)
      // jsdom in Node.js uses uppercase values for nodeName...
      svg = node.nodeName.toLowerCase() === 'svg' && node
      for (const i in definitions.svgs) {
        // This code is inside the loop so we only create a container if
        // we actually have svgs.
        if (!defs) {
          if (!svg) {
            svg = SvgElement.create('svg')
            svg.appendChild(node)
          }
          defs = svg.insertBefore(SvgElement.create('defs'), svg.firstChild)
        }
        defs.appendChild(definitions.svgs[i])
      }
      // Clear definitions at the end of export
      definitions = null
    }
    parentStyles = null
    // Illustrator ignores filters without line breaks around them:
    return options.asString
      ? new self.XMLSerializer()
          .serializeToString(svg)
          .replace(/<defs>|<\/filter>|<\/defs>/g, '$&\n')
      : svg
  }

  function exportSVG(item, options, isRoot) {
    let output = item.getEffectOutput()
    if (output) {
      // Write the output of the item's effects in its place, expanded:
      output = output.clone({ insert: false })
      output.transform(item._matrix)
      return exportSVG(output, options, isRoot)
    }
    const exporter = exporters[item._class]
    let node = exporter && exporter(item, options)
    if (node) {
      // Support processNode callback, to provide mechanism to handle
      // special attributes (e.g. inkscape:transform-center)
      const onExport = options.onExport
      const processNode = (
        options.processNode || (
          // TODO: Remove in 1.0.0? (deprecated October 2026),
          // alias with positional arguments:
          onExport &&
          function (arg) {
            return onExport(arg.item, arg.node, options)
          }
        )
      )
      if (processNode) node = processNode({ item: item, node: node }) || node
      const data = JSON.stringify(item._data)
      if (data && data !== '{}' && data !== 'null')
        node.setAttribute('data-paper-data', data)
      // Mark layers, so SvgImport can tell them from groups (#483):
      if (item instanceof Layer) node.setAttribute('data-paper-layer', '')
    }
    return node && applyStyle(item, node, options, isRoot)
  }

  function setOptions(options) {
    if (!options) options = {}
    formatter = new Formatter(options.precision)
    parentStyles = {}
    return options
  }

  // Export the items in an svg root element, sized to the bounds and
  // transformed by the matrix of the options:
  function exportRoot(items, view, bounds, options) {
    const mx = options.matrix || bounds === 'view' && view._matrix
    const matrix = mx && Matrix.read([mx])
    const rect =
      bounds === 'view'
        ? new Rectangle([0, 0], view.getViewSize())
        : bounds === 'content'
          ? Item._getBounds(items, matrix, { stroke: true }).rect
          : Rectangle.read([bounds], 0, { readNull: true })
    const attrs = {
      'version': '1.1',
      'xmlns': SvgElement.svg,
      'xmlns:xlink': SvgElement.xlink
    }
    if (rect) {
      attrs.width = rect.width
      attrs.height = rect.height
      if (rect.x || rect.x === 0 || rect.y || rect.y === 0)
        attrs.viewBox = formatter.rectangle(rect)
    }
    const node = SvgElement.create('svg', attrs, formatter)
    let parent = node
    // If the view has a transformation, wrap all items in a group with
    // that transformation applied to.
    if (matrix && !matrix.isIdentity()) {
      parent = node.appendChild(
        SvgElement.create('g', getTransform(matrix), formatter)
      )
    }
    for (let i = 0, l = items.length; i < l; i++) {
      parent.appendChild(exportSVG(items[i], options, true))
    }
    return exportDefinitions(node, options)
  }

  Item.inject({
    exportSVG: function (options) {
      options = setOptions(options)
      const bounds = options.bounds
      return bounds || options.matrix
        ? exportRoot([this], this.getView(), bounds, options)
        : exportDefinitions(exportSVG(this, options, true), options)
    }
  })

  Project.inject({
    exportSVG: function (options) {
      options = setOptions(options)
      return exportRoot(
        this._children,
        this.getView(),
        Base.pick(options.bounds, 'view'),
        options
      )
    }
  })
})()
