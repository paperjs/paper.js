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

import { describe } from 'vitest'
import paper, {
  AreaText,
  Base,
  CanvasProvider,
  Color,
  Group,
  Matrix,
  Path,
  PathItem,
  PathText,
  Point,
  PointText,
  Raster,
  Rectangle,
  Shape,
  Size,
  SymbolDefinition
} from 'paper'
import {
  compareSVG,
  createSVG,
  equals,
  isNodeContext,
  test
} from '../helpers.js'

describe('SvgExport', () => {
  test('Export SVG line', () => {
    const attrs = {
      x1: 5,
      x2: 45,
      y1: 5,
      y2: 45
    }
    const path = new Path.Line([attrs.x1, attrs.y1], [attrs.x2, attrs.y2])
    equals(path.exportSVG({ matchShapes: true }), createSVG('line', attrs))
  })

  test('Export SVG rect', () => {
    const attrs = {
      x: 25,
      y: 25,
      width: 100,
      height: 100
    }
    const path = new Path.Rectangle(attrs)
    equals(path.exportSVG({ matchShapes: true }), createSVG('rect', attrs))
  })

  test('Export SVG round rect', () => {
    const attrs = {
      x: 25,
      y: 25,
      rx: 50,
      ry: 50,
      width: 100,
      height: 100
    }
    const path = new Path.Rectangle(
      new Rectangle(attrs),
      new Size(attrs.rx, attrs.ry)
    )
    equals(path.exportSVG({ matchShapes: true }), createSVG('rect', attrs))
  })

  test('Export SVG ellipse', () => {
    const attrs = {
      cx: 300,
      cy: 80,
      rx: 100,
      ry: 50
    }
    const path = new Path.Ellipse({
      center: new Point(attrs.cx, attrs.cy),
      radius: new Point(attrs.rx, attrs.ry)
    })
    equals(
      path.exportSVG({ matchShapes: true }),
      createSVG('ellipse', attrs)
    )
  })

  test('Export SVG circle', () => {
    const attrs = {
      cx: 100,
      cy: 80,
      r: 50
    }
    const path = new Path.Circle({
      center: new Point(attrs.cx, attrs.cy),
      radius: attrs.r
    })
    equals(
      path.exportSVG({ matchShapes: true }),
      createSVG('circle', attrs)
    )
  })

  function createPolyPath(str) {
    const points = str
      .split(' ')
      .map(point => point.split(',').map(parseFloat))
    const path = new Path()
    path.moveTo(points[0])
    for (let i = 1; i < points.length; i++) path.lineTo(points[i])
    return path
  }

  test('Export SVG polygon', () => {
    const points = '100,10 40,180 190,60 10,60 160,180'
    const path = createPolyPath(points)
    path.closePath()
    equals(
      path.exportSVG({ matchShapes: true }),
      createSVG('polygon', {
        points
      })
    )
  })

  test('Export SVG polyline', () => {
    const points = '5,5 45,45 5,45 45,5'
    const path = createPolyPath(points)
    equals(
      path.exportSVG({ matchShapes: true }),
      createSVG('polyline', {
        points
      })
    )
  })

  test('Export SVG path defaults to precision 5', () => {
    const path = new Path('M0.123456789,1.9l0.8,1.1')
    equals(path.exportSVG({}).getAttribute('d'), 'M0.12346,1.9l0.8,1.1')
  })

  test('Export SVG path at precision 0', () => {
    const path = new Path('M0.123456789,1.9l0.8,1.1')
    equals(path.exportSVG({ precision: 0 }).getAttribute('d'), 'M0,2l1,1')
  })

  test('Export SVG viewbox attribute with top left at origin', () => {
    new Path.Rectangle(new Point(10, 10), new Size(80))
    const rectangle = new Rectangle(new Point(0, 0), new Size(100))
    equals(
      paper.project
        .exportSVG({ bounds: rectangle })
        .getAttribute('viewBox'),
      '0,0,100,100'
    )
  })

  test('Export SVG group with mixed children styles (#1732)', () => {
    const group = new Group([
      new Path.Rectangle({
        point: [0, 0],
        size: [10, 10],
        fillColor: 'red',
        fillRule: 'evenodd'
      }),
      new Path.Rectangle({
        point: [20, 0],
        size: [10, 10],
        strokeColor: 'blue'
      })
    ])
    let node = group.exportSVG()
    const first = node.childNodes[0]
    const second = node.childNodes[1]
    // Mixed styles are left to the children:
    ;['fill', 'fill-rule', 'stroke'].forEach(name => {
      equals(() => node.getAttribute(name), null, 'group ' + name)
    })
    equals(first.getAttribute('fill'), '#ff0000')
    equals(first.getAttribute('fill-rule'), 'evenodd')
    equals(first.getAttribute('stroke'), 'none')
    equals(second.getAttribute('fill'), 'none')
    equals(second.getAttribute('fill-rule'), 'nonzero')
    equals(second.getAttribute('stroke'), '#0000ff')
    // Styles shared by all children are set on the group:
    group.fillColor = null
    node = group.exportSVG()
    equals(node.getAttribute('fill'), 'none')
    equals(node.childNodes[0].getAttribute('fill'), null)
  })

  test('Export SVG of nested groups with shared styles (#1353)', () => {
    const inner = new Group([
        new Path.Circle({ center: [10, 10], radius: 5 }),
        new Path.Circle({ center: [30, 10], radius: 5 })
      ]),
      outer = new Group([
        inner,
        new Path.Circle({ center: [50, 10], radius: 5 })
      ])
    outer.fillColor = 'red'
    inner.strokeColor = 'blue'
    let node = outer.exportSVG(),
      innerNode = node.childNodes[0]
    // Each style is only set on the outermost group that shares it:
    equals(node.getAttribute('fill'), '#ff0000')
    equals(node.getAttribute('stroke'), null)
    equals(innerNode.getAttribute('fill'), null)
    equals(innerNode.getAttribute('stroke'), '#0000ff')
    equals(innerNode.childNodes[0].getAttribute('fill'), null)
    equals(innerNode.childNodes[0].getAttribute('stroke'), null)
    equals(node.childNodes[1].getAttribute('fill'), null)
    equals(node.childNodes[1].getAttribute('stroke'), 'none')
    // Without reducing attributes, every item gets them:
    node = outer.exportSVG({ reduceAttributes: false })
    innerNode = node.childNodes[0]
    equals(innerNode.getAttribute('fill'), '#ff0000')
    equals(innerNode.childNodes[0].getAttribute('fill'), '#ff0000')
    equals(innerNode.childNodes[0].getAttribute('stroke'), '#0000ff')
  })

  test('Export SVG as valid XML (#1922)', () => {
    const path = new Path.Rectangle({
      point: [0, 0],
      size: [10, 10],
      name: 'a<b>c&d"e',
      data: { tag: '<tag>' },
      fillColor: {
        gradient: { stops: ['red', 'blue'] },
        origin: [0, 0],
        destination: [10, 0]
      }
    })
    const svg = paper.project.exportSVG({ asString: true })
    // Attribute values are escaped and tag names keep their case:
    equals(
      svg.indexOf('id="a&lt;b&gt;c&amp;d&quot;e"') !== -1,
      true,
      'escaped id'
    )
    equals(svg.indexOf('&lt;tag&gt;') !== -1, true, 'escaped data')
    equals(svg.indexOf('<linearGradient') !== -1, true, 'linearGradient')
    // The export can be parsed as XML again:
    const imported = paper.project.importSVG(svg),
      copy = imported.getItem({ name: path.name })
    equals(() => copy && copy.data.tag, '<tag>')
  })

  test('Export SVG with nested groups as clip masks', () => {
    // A transformed clip mask group with a nested group, and a group that is
    // clipped itself:
    const clip = new Group({
      children: [
        new Group([
          new Path.Rectangle({
            point: [0, 0],
            size: [50, 50],
            clipMask: true
          }),
          new Path.Circle({ center: [25, 25], radius: 20 })
        ]),
        new Group([
          new Path.Rectangle({ point: [60, 0], size: [10, 10] })
        ])
      ],
      applyMatrix: false
    })
    clip.translate(10, 20)
    clip.clipMask = true
    const group = new Group([
        clip,
        new Path.Rectangle({
          point: [0, 0],
          size: [200, 200],
          fillColor: 'red'
        })
      ]),
      svg = group.exportSVG(),
      clipPath = svg.getElementsByTagName('clipPath')[0],
      nodes = clipPath.childNodes
    equals(
      svg.lastChild.getAttribute('clip-path'),
      'url(#' + clipPath.getAttribute('id') + ')'
    )
    // <clipPath> only contains the shapes, with the transformations applied,
    // and without the nested clip item, as on the canvas:
    equals(
      () =>
        Base.each(
          nodes,
          function (node) {
            this.push(
              node.nodeName.toLowerCase() +
              ':' +
              node.getAttribute('transform')
            )
          },
          []
        ),
      ['path:null', 'path:null']
    )
    equals(
      PathItem.create(nodes[0].getAttribute('d')).bounds,
      new Rectangle(15, 25, 40, 40)
    )
    equals(
      PathItem.create(nodes[1].getAttribute('d')).bounds,
      new Rectangle(70, 20, 10, 10)
    )
    // The exported clip mask leaves the original items untouched:
    equals(clip.matrix, new Matrix(1, 0, 0, 1, 10, 20))
    equals(clip.firstChild.firstChild.clipMask, true)
  })

  test('Export SVG with idPrefix (#1709)', () => {
    const clip = new Path.Rectangle({
      point: [0, 0],
      size: [50, 50],
      clipMask: true
    })
    new Group([
      clip,
      new Path.Circle({
        center: [25, 25],
        radius: 30,
        fillColor: {
          gradient: { stops: ['red', 'blue'] },
          origin: [0, 0],
          destination: [50, 0]
        },
        name: 'circle'
      })
    ])
    const canvas = CanvasProvider.getCanvas(10, 10),
      raster = new Raster(canvas),
      symbol = new SymbolDefinition(new Path.Rectangle([0, 0], [10, 10]))
    symbol.place([100, 100])
    raster.position = [80, 80]

    function getIds(options) {
      const svg = paper.project.exportSVG(options),
        uses = svg.querySelectorAll('use')
      return {
        definitions: Base.each(
          svg.querySelector('defs').childNodes,
          function (node) {
            this.push(node.getAttribute('id'))
          },
          []
        ),
        clipPath: svg
          .querySelector('g[clip-path]')
          .getAttribute('clip-path'),
        fill: svg.querySelector('#circle').getAttribute('fill'),
        uses: Base.each(
          uses,
          function (node) {
            this.push(
              node.getAttributeNS(
                'http://www.w3.org/1999/xlink',
                'href'
              )
            )
          },
          []
        )
      }
    }

    // Generated ids are named after their type and numbered per type:
    equals(getIds({ reuseImages: true }), {
      definitions: ['clip-1', 'color-1', 'image-1', 'symbol-1'],
      clipPath: 'url(#clip-1)',
      fill: 'url(#color-1)',
      uses: ['#image-1', '#symbol-1']
    })
    // idPrefix is prepended to them and to their references, but not to the
    // ids that come from item names:
    equals(getIds({ reuseImages: true, idPrefix: 'svg2-' }), {
      definitions: [
        'svg2-clip-1', 'svg2-color-1', 'svg2-image-1', 'svg2-symbol-1'
      ],
      clipPath: 'url(#svg2-clip-1)',
      fill: 'url(#svg2-color-1)',
      uses: ['#svg2-image-1', '#svg2-symbol-1']
    })
  })

  test('Export SVG multi-line text (#988)', () => {
    function getLines(text) {
      return Base.each(
        text.exportSVG().childNodes,
        function (node) {
          this.push([
            node.nodeName.toLowerCase(),
            node.getAttribute('x'),
            node.getAttribute('y'),
            node.textContent
          ])
        },
        []
      )
    }

    // Each line is placed at the leading's distance below the previous one,
    // starting at the text's point. The default leading is fontSize * 1.2:
    const text = new PointText({
      point: [10, 20],
      content: 'One\n\nThree',
      fontSize: 10
    })
    equals(getLines(text), [
      ['tspan', '10', '20', 'One'],
      ['tspan', '10', '32', ''],
      ['tspan', '10', '44', 'Three']
    ])
    text.leading = 15
    equals(getLines(text), [
      ['tspan', '10', '20', 'One'],
      ['tspan', '10', '35', ''],
      ['tspan', '10', '50', 'Three']
    ])
    // Rotating by 90° around the point moves it to [20, -10] in the rotated
    // coordinate system, in which the leading stays vertical:
    text.rotate(90, text.point)
    equals(getLines(text), [
      ['tspan', '20', '-10', 'One'],
      ['tspan', '20', '5', ''],
      ['tspan', '20', '20', 'Three']
    ])
    // Single lines don't need any <tspan>:
    const node = new PointText({
      point: [10, 20],
      content: 'One'
    }).exportSVG()
    equals(node.getAttribute('x'), '10')
    equals(node.getAttribute('y'), '20')
    equals(
      () => node.childNodes.length === 1 && node.firstChild.nodeType,
      3
    )
    equals(node.textContent, 'One')
  })

  test('Export and import SVG multi-line text (#988)', () => {
    const text = new PointText({
      point: [10, 20],
      content: 'One\n\nThree\n',
      fontSize: 10
    })
    const imported = paper.project.importSVG(
      text.exportSVG({ asString: true })
    )
    equals(imported.content, text.content)
    equals(imported.point, text.point)
    equals(imported.bounds, text.bounds)
  })

  test('Export SVG text with tracking', () => {
    const text = new PointText({
      point: [10, 20],
      content: 'One'
    })
    // Tracking is in thousandths of an em:
    equals(text.exportSVG().getAttribute('letter-spacing'), '0')
    text.tracking = 100
    equals(text.exportSVG().getAttribute('letter-spacing'), '0.1em')
  })

  test('Export SVG text with italic font weights', () => {
    const text = new PointText({
      point: [10, 20],
      content: 'One',
      fontWeight: 'bold italic'
    })
    // SVG keeps the font style apart from the weight:
    let node = text.exportSVG()
    equals(node.getAttribute('font-weight'), 'bold')
    equals(node.getAttribute('font-style'), 'italic')
    text.fontWeight = 'oblique'
    node = text.exportSVG()
    equals(node.getAttribute('font-weight'), 'normal')
    equals(node.getAttribute('font-style'), 'oblique')
    text.fontWeight = 600
    node = text.exportSVG()
    equals(node.getAttribute('font-weight'), '600')
    equals(node.getAttribute('font-style'), null)
  })

  test('Export SVG rasters with reuseImages (#1993)', assert => {
    const done = assert.async()

    function createImage(left, right) {
      // A 20 x 10 image with two differently colored halves:
      const canvas = CanvasProvider.getCanvas(20, 10),
        ctx = canvas.getContext('2d')
      ctx.fillStyle = left
      ctx.fillRect(0, 0, 10, 10)
      ctx.fillStyle = right
      ctx.fillRect(10, 0, 10, 10)
      return canvas.toDataURL()
    }

    function getHref(node) {
      return node.getAttributeNS('http://www.w3.org/1999/xlink', 'href')
    }

    const url = createImage('red', 'blue')

    const rasters = [
      new Raster(url),
      new Raster(url),
      new Raster(createImage('green', 'yellow'))
    ]

    let loaded = 0

    function onLoad() {
      if (++loaded === rasters.length) {
        rasters[0].position = [15, 10]
        rasters[1].position = [60, 60]
        rasters[1].rotate(90)
        rasters[1].scale(2)
        rasters[2].position = [30, 80]

        // By default, each raster is exported as an image of its own:
        let svg = paper.project.exportSVG({ bounds: 'content' })
        equals(
          svg.querySelectorAll('defs').length,
          0,
          'default: <defs>'
        )
        equals(
          svg.querySelectorAll('image').length,
          3,
          'default: <image>'
        )

        // The two rasters with the same image share one definition:
        svg = paper.project.exportSVG({
          bounds: 'content',
          reuseImages: true
        })
        const images = svg.querySelectorAll('image'),
          definitions = svg.querySelectorAll('defs > image'),
          uses = svg.querySelectorAll('use')
        equals(images.length, 2, '<image>')
        equals(definitions.length, 2, '<image> in <defs>')
        equals(uses.length, 3, '<use>')
        equals(images[0].getAttribute('width'), '20', '<image> width')
        equals(images[0].getAttribute('height'), '10', '<image> height')
        equals(getHref(uses[0]), '#' + images[0].id, '1st <use> href')
        equals(getHref(uses[1]), '#' + images[0].id, '2nd <use> href')
        equals(getHref(uses[2]), '#' + images[1].id, '3rd <use> href')
        equals(() => images[0].id !== images[1].id, true)

        // It imports again with the rasters in the same places, relative
        // to the exported content's top left corner:
        const offset = paper.project.activeLayer.bounds.topLeft

        const string = paper.project.exportSVG({
          bounds: 'content',
          reuseImages: true,
          asString: true
        })

        const copies = paper.project
          .importSVG(string, { insert: false })
          .getItems({ class: Raster })

        let copied = 0
        equals(copies.length, 3, 'imported rasters')
        copies.forEach(copy => {
          copy.on('load', () => {
            if (++copied === copies.length) {
              for (let i = 0; i < copies.length; i++) {
                const bounds = rasters[i].bounds
                equals(
                  copies[i].bounds,
                  new Rectangle(
                    bounds.topLeft.subtract(offset),
                    bounds.size
                  ),
                  'imported raster ' + i + ' bounds'
                )
              }
              // The browser draws the exported SVG the same as
              // Paper.js:
              if (isNodeContext) {
                done()
              } else {
                compareSVG(
                  done,
                  string,
                  paper.project.activeLayer
                )
              }
            }
          })
        })
      }
    }

    for (let i = 0; i < rasters.length; i++) rasters[i].on('load', onLoad)
  })

  if (!isNodeContext) {
    // JSDom does not have SVG rendering, so we can't test there.
    test('Export transformed shapes', assert => {
      let rect = new Shape.Rectangle({
        point: [200, 100],
        size: [200, 300],
        fillColor: 'red'
      })
      rect.rotate(40)

      const circle = new Shape.Circle({
        center: [200, 300],
        radius: 100,
        fillColor: 'green'
      })
      circle.scale(0.5, 1)
      circle.rotate(40)

      const ellipse = new Shape.Ellipse({
        point: [300, 300],
        size: [100, 200],
        fillColor: 'blue'
      })
      ellipse.rotate(-40)

      rect = new Shape.Rectangle({
        point: [250, 20],
        size: [200, 300],
        radius: [40, 20],
        fillColor: 'yellow'
      })
      rect.rotate(-20)
      const svg = paper.project.exportSVG({
        bounds: 'content',
        asString: true
      })
      compareSVG(assert.async(), svg, paper.project.activeLayer)
    })

    test('Export not invertible item.matrix', assert => {
      new Shape.Rectangle({
        point: [100, 100],
        size: [100, 100],
        fillColor: 'red',
        matrix: [1, 1, 1, 1, 1, 1]
      })
      const svg = paper.project.exportSVG({
        bounds: 'content',
        asString: true
      })
      compareSVG(assert.async(), svg, paper.project.activeLayer)
    })

    test('Export gradients', assert => {
      const bounds = new Rectangle(new Size(300, 600))
      const stops = [new Color(1, 1, 0, 0), 'red', 'black']

      const radius = bounds.width * 0.4
      let from = new Point(bounds.center.x)
      let to = from.add(radius, 0)

      new Path.Circle({
        center: from,
        radius,
        fillColor: {
          stops,
          radial: true,
          origin: from,
          destination: to
        },
        strokeColor: 'black'
      })

      ;((from = bounds.leftCenter), (to = bounds.bottomRight))

      const rect = new Path.Rectangle({
        from,
        to,
        fillColor: {
          stops,
          radial: false,
          origin: from,
          destination: to
        },
        strokeColor: 'black'
      })

      rect.rotate(45).scale(0.7)

      const svg = paper.project.exportSVG({
        bounds: 'content',
        asString: true
      })
      compareSVG(assert.async(), svg, paper.project.activeLayer, null, {
        tolerance: 1e-2
      })
    })

    test('Export SVG with clipping defs', assert => {
      new Group({
        children: [
          new Path.Circle({
            center: [150, 150],
            radius: 50
          }),
          new Path.Rectangle({
            point: [100, 100],
            size: [100, 100],
            fillColor: 'green'
          })
        ],
        clipped: true
      })
      const svg = paper.project.exportSVG({
        bounds: 'content',
        asString: true
      })
      compareSVG(assert.async(), svg, paper.project.activeLayer, null, {
        tolerance: 1e-2
      })
    })

    test('Export symbol with stroke', assert => {
      const item = new Path.Circle({
        center: [0, 0],
        radius: 50,
        strokeColor: 'blue',
        strokeWidth: 10
      })

      const symbol = new SymbolDefinition(item)
      symbol.place([50, 50])

      const svg = paper.project.exportSVG({
        bounds: 'content',
        asString: true
      })
      compareSVG(assert.async(), svg, paper.project.activeLayer)
    })

    test('Export SVG with a group as clip mask (#1445, #1590)', assert => {
      const clip = new Group({
        children: [
          new Path.Rectangle(new Point(0, 0), new Size(100)),
          new Path.Rectangle(new Point(150, 0), new Size(100))
        ],
        applyMatrix: false
      })
      clip.rotate(30)
      new Group(
        clip,
        new Path.Circle({
          center: [125, 50],
          radius: 75,
          fillColor: 'blue'
        })
      ).clipped = true
      const svg = paper.project.exportSVG({
        bounds: 'content',
        asString: true
      })
      compareSVG(assert.async(), svg, paper.project.activeLayer, null, {
        tolerance: 1e-2
      })
    })

    test('Export SVG with a clipped group as clip mask', assert => {
      // SVG with a viewBox imports as a group clipped to the viewBox:
      const clip = paper.project.importSVG(
        '<svg xmlns="http://www.w3.org/2000/svg"' +
        ' width="100" height="100" viewBox="0 0 100 100">' +
        '<circle cx="50" cy="50" r="40"/></svg>'
      )
      new Group(
        clip,
        new Path.Rectangle({
          point: [0, 0],
          size: [100, 100],
          fillColor: 'blue'
        })
      ).clipped = true
      const svg = paper.project.exportSVG({
        bounds: 'content',
        asString: true
      })
      compareSVG(assert.async(), svg, paper.project.activeLayer, null, {
        tolerance: 1e-2
      })
    })

    test('Export SVG shadows (#1003)', assert => {
      // A background, so the exported bounds include the shadows:
      new Path.Rectangle({
        point: [0, 0],
        size: [200, 100],
        fillColor: 'white'
      })
      new Path.Rectangle({
        point: [20, 20],
        size: [40, 40],
        fillColor: 'red',
        strokeColor: 'blue',
        strokeWidth: 6,
        shadowColor: new Color(0, 0, 0, 0.6),
        shadowBlur: 8,
        shadowOffset: [10, 10]
      })
      const shape = new Shape.Circle({
        center: [130, 40],
        radius: 20,
        fillColor: 'green',
        shadowColor: 'black',
        shadowOffset: [0, 12]
      })
      shape.scale(1.5, 1)
      const svg = paper.project.exportSVG({
        bounds: 'content',
        asString: true
      })
      compareSVG(assert.async(), svg, paper.project.activeLayer, null, {
        tolerance: 1e-2
      })
    })

    test('Export SVG multi-line text (#988)', assert => {
      const text = new PointText({
        point: [20, 40],
        content: 'Paper.js\n\nSVG text',
        fontFamily: 'sans-serif',
        fontSize: 20,
        leading: 30,
        fillColor: 'black'
      })
      text.rotate(30)
      const svg = paper.project.exportSVG({
        bounds: 'content',
        asString: true
      })
      compareSVG(assert.async(), svg, paper.project.activeLayer, null, {
        tolerance: 1e-2
      })
    })
  }

  test('Export and import SVG shadows (#1003)', () => {
    let path = new Path.Rectangle({
      point: [20, 20],
      size: [40, 40],
      fillColor: 'red',
      strokeColor: 'blue',
      strokeWidth: 4,
      shadowColor: new Color(0, 1, 0, 0.6),
      shadowBlur: 6,
      shadowOffset: [8, -4]
    })
    let node = paper.project.exportSVG()
    const filter = node.querySelector('filter')

    const primitives = Base.each(
      filter.childNodes,
      function (child) {
        this.push(child.nodeName)
      },
      []
    )

    function get(selector, name) {
      return filter.querySelector(selector).getAttribute(name)
    }
    equals(
      node.querySelector('path').getAttribute('filter'),
      'url(#' + filter.id + ')',
      'filter reference'
    )
    equals(
      primitives,
      [
        'feGaussianBlur', 'feOffset', 'feFlood', 'feComposite',
        'feComposite'
      ],
      'primitives'
    )
    // Canvas blurs with a standard deviation of half the shadow blur:
    equals(get('feGaussianBlur', 'stdDeviation'), '3', 'stdDeviation')
    equals(
      [get('feOffset', 'dx'), get('feOffset', 'dy')],
      ['8', '-4'],
      'offset'
    )
    equals(
      [get('feFlood', 'flood-color'), get('feFlood', 'flood-opacity')],
      ['#00ff00', '0.6'],
      'color'
    )
    // The region covers the stroke bounds from 18 to 62, moved by the offset,
    // and three standard deviations around them, from 9 to 79 and 5 to 71,
    // in percent of the bounds of the path from 20 to 60, as Illustrator
    // drops items with fractions:
    equals(
      ['x', 'y', 'width', 'height'].map(name => filter.getAttribute(name)),
      ['-27.5%', '-37.5%', '175%', '165%'],
      'region'
    )
    path.remove()

    let imported = paper.project.importSVG(node).getItem({ class: Path })
    equals(imported.shadowColor, new Color(0, 1, 0, 0.6), 'imported color')
    equals(imported.shadowBlur, 6, 'imported blur')
    equals(imported.shadowOffset, new Point(8, -4), 'imported offset')
    paper.project.activeLayer.removeChildren()

    // Without a blur, as SVG 1.1 renders a blur of 0 as nothing:
    path = new Path.Rectangle({
      point: [20, 20],
      size: [40, 40],
      fillColor: 'red',
      shadowColor: 'black',
      shadowOffset: [5, 5]
    })
    node = paper.project.exportSVG()
    equals(node.querySelector('feGaussianBlur'), null, 'no blur')
    equals(
      node.querySelector('feOffset').getAttribute('in'),
      'SourceAlpha',
      'offset of the alpha'
    )
    path.remove()
    imported = paper.project.importSVG(node).getItem({ class: Path })
    equals(imported.shadowBlur, 0, 'imported without a blur')
    equals(imported.shadowOffset, new Point(5, 5), 'imported offset')
    paper.project.activeLayer.removeChildren()

    // Horizontal lines have no height, which neither a relative region nor
    // Illustrator handles, so their shadow is left out:
    new Path.Line({
      from: [20, 20],
      to: [60, 20],
      strokeColor: 'black',
      strokeWidth: 2,
      shadowColor: 'black',
      shadowOffset: [0, 5]
    })
    node = paper.project.exportSVG()
    equals(
      [
        node.querySelector('filter'),
        node.querySelector('path').getAttribute('filter')
      ],
      [null, null],
      'no shadow on a line'
    )
    paper.project.activeLayer.removeChildren()

    // Strings break the lines around the definitions, as Illustrator ignores
    // filters otherwise:
    new Path.Rectangle({
      point: [20, 20],
      size: [40, 40],
      fillColor: 'red',
      shadowColor: 'black',
      shadowOffset: [5, 5]
    })
    equals(
      /<defs>\n<filter [^]*<\/filter>\n<\/defs>\n/.test(
        paper.project.exportSVG({ asString: true })
      ),
      true,
      'line breaks'
    )
    paper.project.activeLayer.removeChildren()

    // Groups don't draw shadows, only their children:
    new Group({
      children: [new Path.Circle({ center: [50, 50], radius: 10 })],
      fillColor: 'red',
      shadowColor: 'black',
      shadowOffset: [5, 5]
    })
    node = paper.project.exportSVG()
    equals(node.querySelectorAll('filter').length, 1, 'one filter')
    equals(
      node.querySelector('g g').getAttribute('filter'),
      null,
      'no filter on the group'
    )
    paper.project.activeLayer.removeChildren()

    // Other filters are left alone:
    imported = paper.project.importSVG(
      '<svg xmlns="http://www.w3.org/2000/svg">' +
      '<filter id="other"><feGaussianBlur stdDeviation="2"/></filter>' +
      '<rect width="10" height="10" filter="url(#other)"/></svg>'
    )
    equals(imported.lastChild.shadowColor, null, 'other filters')
    paper.project.activeLayer.removeChildren()
  })

  test('Import SVG shadows from CSS drop-shadow() (#1003)', () => {
    function importShadow(filter) {
      const item = paper.project.importSVG(
        '<svg xmlns="http://www.w3.org/2000/svg">' +
        '<rect width="10" height="10" style="filter: ' +
        filter +
        '"/></svg>'
      ).lastChild
      paper.project.activeLayer.removeChildren()
      return [item.shadowColor, item.shadowBlur, item.shadowOffset]
    }
    // Browsers put the color first, CSS allows it last too:
    equals(
      importShadow('drop-shadow(rgba(0, 0, 0, 0.5) 3px 4px 2px)'),
      [new Color(0, 0, 0, 0.5), 2, new Point(3, 4)],
      'color first'
    )
    equals(
      importShadow('drop-shadow(3px -4px 2px #ff0000)'),
      [new Color(1, 0, 0), 2, new Point(3, -4)],
      'color last'
    )
    equals(
      importShadow('drop-shadow(3px 4px)'),
      [new Color(0, 0, 0), 0, new Point(3, 4)],
      'without blur and color'
    )
    equals(importShadow('blur(2px)')[0], null, 'other filters')
  })

  test(`Export SVG opacity and blend modes, which aren't inherited`, () => {
    const path = new Path.Rectangle({
        point: [10, 10],
        size: [20, 20],
        fillColor: 'red',
        opacity: 0.5,
        blendMode: 'multiply'
      }),
      group = new Group({
        children: [
          path,
          new Path.Circle({ center: [50, 50], radius: 10 })
        ],
        opacity: 0.5,
        blendMode: 'multiply'
      }),
      node = paper.project.exportSVG(),
      paths = node.querySelectorAll('path'),
      nodes = [node.querySelector('g g'), paths[0], paths[1]]
    function getStyles(node) {
      return [node.getAttribute('opacity'), node.getAttribute('style')]
    }
    // The path keeps the same values as its group, as they multiply:
    equals(
      getStyles(nodes[0]),
      ['0.5', 'mix-blend-mode: multiply'],
      'group'
    )
    equals(getStyles(nodes[1]), ['0.5', 'mix-blend-mode: multiply'], 'path')
    // The defaults aren't written, also not where the group differs:
    equals(getStyles(nodes[2]), [null, null], 'defaults')
    equals(getStyles(node.querySelector('g')), [null, null], 'layer')
    group.remove()
  })

  test(`Export and import SVG blend modes that CSS doesn't have (#1296)`, () => {
    function roundTrip(blendMode) {
      const path = new Path.Rectangle({
        point: [10, 10],
        size: [20, 20],
        fillColor: 'red',
        blendMode
      })
      const node = path.exportSVG()
      path.remove()
      const imported = paper.project.importSVG(node)
      return { node, blendMode: imported.blendMode }
    }
    // CSS blend modes stay in the style, where other viewers render them:
    let res = roundTrip('multiply')
    equals(
      /mix-blend-mode: multiply/.test(res.node.getAttribute('style')),
      true,
      'multiply: style'
    )
    equals(res.blendMode, 'multiply', 'multiply: imported')
    // Paper.js's own modes go into an attribute that only Paper.js reads:
    ;['destination-out', 'add', 'negation'].forEach(blendMode => {
      res = roundTrip(blendMode)
      equals(
        res.node.getAttribute('data-paper-blend-mode'),
        blendMode,
        blendMode + ': attribute'
      )
      equals(
        /mix-blend-mode/.test(res.node.getAttribute('style') || ''),
        false,
        blendMode + ': not in the style'
      )
      equals(res.blendMode, blendMode, blendMode + ': imported')
    })
  })

  test('Export and import SVG paint-order (#1731)', () => {
    const path = new Path.Rectangle({
      point: [10, 10],
      size: [20, 20],
      fillColor: 'red',
      strokeColor: 'blue',
      paintOrder: 'stroke'
    })
    const node = path.exportSVG()
    path.remove()
    equals(node.getAttribute('paint-order'), 'stroke', 'exported')
    equals(paper.project.importSVG(node).paintOrder, 'stroke', 'imported')
    // Only the order of the fill and the stroke is imported, without markers:
    ;[
      ['stroke fill markers', 'stroke'],
      ['markers stroke', 'stroke'],
      ['fill', 'fill'],
      ['markers', 'fill'],
      ['normal', 'fill']
    ].forEach(([value, paintOrder]) => {
      const imported = paper.project.importSVG(
        createSVG('rect', { 'width': 10, 'height': 10, 'paint-order': value })
      )
      equals(imported.paintOrder, paintOrder, value)
    })
  })

  test('Export SVG text with start, end and justify justifications', () => {
    const text = new PointText({
      point: [10, 20],
      content: 'One'
    })
    text.justification = 'justify'
    equals(text.exportSVG().getAttribute('text-anchor'), 'start', 'justify')
    text.justification = 'end'
    equals(text.exportSVG().getAttribute('text-anchor'), 'end', 'end')
    text.justification = 'start'
    equals(text.exportSVG().getAttribute('text-anchor'), 'start', 'start')
    const imported = paper.project.importSVG(
      '<svg xmlns="http://www.w3.org/2000/svg"><text text-anchor="end">' +
      'One</text></svg>'
    )
    equals(imported.lastChild.justification, 'right', 'imported as before')
  })

  test('Export SVG text with mixed styles', () => {
    function getSpans(node) {
      return Base.each(
        node.childNodes,
        function (child) {
          this.push([
            child.textContent,
            child.getAttribute('font-size'),
            child.getAttribute('text-anchor')
          ])
        },
        []
      )
    }

    const text = new PointText({
      point: [10, 20],
      content: 'Hello world'
    })
    text.range(6, 11).fontSize = 20
    // Runs of mixed styles in their own <tspan>, the shared ones on <text>:
    let node = text.exportSVG()
    equals(node.getAttribute('font-size'), null, 'not on the text')
    equals(
      getSpans(node),
      [['Hello ', '12', null], ['world', '20', null]],
      'one line'
    )
    text.content = 'One\nTwo'
    text.paragraphs[1].justification = 'right'
    node = text.exportSVG()
    equals(
      getSpans(node),
      [['One', null, 'start'], ['Two', null, 'end']],
      'lines with mixed justifications'
    )
    equals(node.lastChild.getAttribute('x'), '10', 'anchored at the point')
  })

  test('Export and import SVG area text', () => {
    const text = new AreaText(new Rectangle(10, 20, 100, 200))
    text.content = 'Text in an area breaks into lines that fit it.'
    text.justification = 'right'
    const node = text.exportSVG(),
      lines = text.lines
    equals(node.childNodes.length, lines.length, 'a <tspan> per line')
    equals(
      Base.each(
        node.childNodes,
        function (child, i) {
          const isClose = (value, expected) => (
            Math.abs(+value - expected) < 0.001
          )
          this.push(
            isClose(
              child.getAttribute('y'),
              lines[i].baseline.point.y
            ) &&
            child.getAttribute('text-anchor') === 'start' &&
            isClose(
              child.firstChild.getAttribute('x'),
              lines[i].bounds.left
            )
          )
        },
        []
      ).every(placed => placed),
      true,
      'each at its baseline, its pieces where they start'
    )
    const imported = paper.project.importSVG(
      text.exportSVG({ asString: true })
    )
    equals(
      imported.content,
      lines.map(line => line.content.trim()).join('\n'),
      'imported as point text, line by line'
    )
  })

  test('Export SVG text on a path', () => {
    const text = new PathText(new Path.Line([0, 0], [0, 200]))
    text.content = 'Down'
    const node = text.exportSVG(),
      letters = node.firstChild.childNodes
    equals(letters.length, 4, 'a <tspan> per letter')
    equals(letters[0].getAttribute('rotate'), '90', 'turned with the path')
    equals(letters[0].getAttribute('x'), '0', 'on it')
  })
})
