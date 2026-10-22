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
  Base,
  CompoundPath,
  Key,
  Matrix,
  PaperScope,
  Path,
  Point,
  Project,
  Rectangle,
  Shape,
  Size,
  Tool,
  View,
  document,
  window
} from 'paper'
import { equals, isNodeContext, test, triggerMouseEvent } from '../helpers.js'

describe('View', () => {
  test('view.zoom of mirrored view (#1411)', () => {
    // The view is 100x100, so it mirrors and zooms around (50, 50).
    paper.view.scale(1, -1)
    equals(paper.view.zoom, 1, 'view.zoom')
    paper.view.zoom = 2
    equals(paper.view.zoom, 2, 'view.zoom')
    equals(paper.view.scaling, new Point(2, -2), 'view.scaling')
    // (x, y) -> (2 * x - 50, 100 - (2 * y - 50))
    equals(
      paper.view.matrix,
      new Matrix(2, 0, 0, -2, -50, 150),
      'view.matrix'
    )
  })

  test('view.rotation of mirrored view (#1893)', () => {
    // The view is 100x100, so it rotates around (50, 50), which stays in place:
    // (x, y) -> (cos * x - sin * y, sin * x + cos * y) when not mirrored, and
    // (cos * x + sin * y, sin * x - cos * y) when mirrored first.
    const cos = Math.cos(Math.PI / 6),
      sin = Math.sin(Math.PI / 6)
    paper.view.rotation = 30
    equals(paper.view.rotation, 30, 'view.rotation')
    equals(
      paper.view.matrix,
      new Matrix(
        cos,
        sin,
        -sin,
        cos,
        50 - 50 * (cos - sin),
        50 - 50 * (sin + cos)
      ),
      'view.matrix'
    )
    paper.view.matrix = new Matrix()
    paper.view.scale(1, -1)
    paper.view.rotation = 30
    equals(paper.view.rotation, 30, 'mirrored: view.rotation')
    equals(paper.view.scaling, new Point(1, -1), 'mirrored: view.scaling')
    equals(
      paper.view.matrix,
      new Matrix(
        cos,
        sin,
        sin,
        -cos,
        50 - 50 * (cos + sin),
        50 - 50 * (sin - cos)
      ),
      'mirrored: view.matrix'
    )
    // Setting the same rotation again doesn't change it:
    paper.view.rotation = 30
    equals(paper.view.rotation, 30, 'mirrored: view.rotation set again')
    // Non-uniform scaling is kept as well:
    paper.view.matrix = new Matrix()
    paper.view.scale(3, -2)
    paper.view.rotation = 30
    equals(paper.view.rotation, 30, 'scaled: view.rotation')
    equals(paper.view.scaling, new Point(3, -2), 'scaled: view.scaling')
    equals(paper.view.center, new Point(50, 50), 'scaled: view.center')
  })

  test('view.fitBounds() with empty rectangles', () => {
    ;['contain', 'cover'].forEach(fit => {
      // The view is 100x100. An empty rectangle can't scale the view, so it
      // only centers on it, keeping its zoom:
      paper.view.matrix = new Matrix()
      paper.view.zoom = 2
      paper.view.fitBounds(new Rectangle(30, 40, 0, 0), fit)
      equals(paper.view.zoom, 2, 'empty: view.zoom, ' + fit)
      equals(
        paper.view.center,
        new Point(30, 40),
        'empty: view.center, ' + fit
      )
      // A horizontal line can only scale the view by its width of 400:
      paper.view.matrix = new Matrix()
      paper.view.fitBounds(new Rectangle(0, 0, 400, 0), fit)
      equals(
        paper.view.scaling,
        new Point(0.25, 0.25),
        'line: view.scaling, ' + fit
      )
      equals(
        paper.view.center,
        new Point(200, 0),
        'line: view.center, ' + fit
      )
    })
    paper.view.matrix = new Matrix()
  })

  test('view.bounds = rect', () => {
    // The view is 100x100, so a 200x100 rectangle fits by its width:
    paper.view.matrix = new Matrix()
    paper.view.bounds = new Rectangle(0, 0, 200, 100)
    equals(paper.view.bounds, new Rectangle(0, -50, 200, 200))
    paper.view.matrix = new Matrix()
  })

  test(`view.zoom with values that aren't positive numbers (#1433)`, () => {
    paper.view.zoom = 2
    ;[0, -1, NaN, Infinity].forEach(zoom => {
      paper.view.zoom = zoom
      equals(paper.view.zoom, 2, 'view.zoom = ' + zoom)
    })
    // The view is 100x100, so at zoom 2 it shows 50x50 around its center:
    equals(paper.view.bounds, new Rectangle(25, 25, 50, 50), 'view.bounds')
  })

  test('view.update(force) (#1913)', () => {
    const path = new Path.Rectangle({
      from: [0, 0],
      to: [100, 100],
      fillColor: 'red'
    })
    const ctx = paper.view.element.getContext('2d')

    function getPixel() {
      const pixelRatio = paper.view.pixelRatio
      return Base.slice(
        ctx.getImageData(50 * pixelRatio, 50 * pixelRatio, 1, 1).data
      )
    }

    equals(paper.view.update(), true, 'view.update() after changes')
    equals(getPixel(), [255, 0, 0, 255], 'pixel after view.update()')
    // Clear the canvas behind the view's back, as e.g. a web font that loads
    // after drawing changes the result without changing the project:
    ctx.clearRect(0, 0, paper.view.element.width, paper.view.element.height)
    equals(paper.view.update(), false, 'view.update() without changes')
    equals(getPixel(), [0, 0, 0, 0], 'pixel after view.update()')
    equals(
      paper.view.update(true),
      true,
      'view.update(true) without changes'
    )
    equals(getPixel(), [255, 0, 0, 255], 'pixel after view.update(true)')
    equals(
      paper.view.update(),
      false,
      'view.update() after view.update(true)'
    )
    path.remove()
  })

  test('view.fitBounds(rectangle[, fit]) (#1688)', () => {
    // The view is 100x100. Start each fit from a view that is zoomed and
    // scrolled away, as fitting doesn't depend on the previous state.
    function fit(rectangle, mode) {
      paper.view.zoom = 3
      paper.view.center = [500, 500]
      paper.view.fitBounds(rectangle, mode)
    }

    // A rectangle wider than the view, centered at 200, 100: To contain it, the
    // view needs to show all 400 of its width, to cover it its 200 of height.
    const wide = new Rectangle(0, 0, 400, 200)
    fit(wide)
    equals(paper.view.zoom, 0.25, 'wide: view.zoom')
    equals(paper.view.center, new Point(200, 100), 'wide: view.center')
    equals(
      paper.view.bounds,
      new Rectangle(0, -100, 400, 400),
      'wide: view.bounds'
    )
    fit(wide, 'cover')
    equals(paper.view.zoom, 0.5, 'wide, cover: view.zoom')
    equals(
      paper.view.bounds,
      new Rectangle(100, 0, 200, 200),
      'wide, cover: view.bounds'
    )
    // Containing it in a stretched view undoes the stretching of its axes:
    paper.view.scale(2, 1)
    paper.view.fitBounds(wide)
    equals(
      paper.view.scaling,
      new Point(0.25, 0.25),
      'stretched: view.scaling'
    )
    equals(
      paper.view.bounds,
      new Rectangle(0, -100, 400, 400),
      'stretched: view.bounds'
    )

    // A rectangle taller than the view, centered at 35, 120: To contain it,
    // the view needs to show all 200 of its height, to cover it its 50 of
    // width.
    const tall = new Rectangle(10, 20, 50, 200)
    fit(tall)
    equals(paper.view.zoom, 0.5, 'tall: view.zoom')
    equals(
      paper.view.bounds,
      new Rectangle(-65, 20, 200, 200),
      'tall: view.bounds'
    )
    fit(tall, 'cover')
    equals(paper.view.zoom, 2, 'tall, cover: view.zoom')
    equals(
      paper.view.bounds,
      new Rectangle(10, 95, 50, 50),
      'tall, cover: view.bounds'
    )
    paper.view.zoom = 1
    paper.view.fitBounds(10, 20, 50, 200)
    equals(
      paper.view.bounds,
      new Rectangle(-65, 20, 200, 200),
      'tall, passed as numbers: view.bounds'
    )
    paper.view.fitBounds(10, 20, 50, 200, 'cover')
    equals(
      paper.view.bounds,
      new Rectangle(10, 95, 50, 50),
      'tall, cover, passed as numbers: view.bounds'
    )

    // A mirrored view stays mirrored:
    paper.view.matrix = new Matrix(1, 0, 0, -1, 0, 100)
    paper.view.fitBounds(wide)
    equals(
      paper.view.scaling,
      new Point(0.25, -0.25),
      'mirrored: view.scaling'
    )
    equals(
      paper.view.bounds,
      new Rectangle(0, -100, 400, 400),
      'mirrored: view.bounds'
    )

    // In a view rotated by 45°, the wide rectangle spans (400 + 200) / √2 in
    // both directions of the view, so the view's sides need to show that
    // much, and its bounds are √2 times as large: 600 in both directions.
    paper.view.matrix = new Matrix()
    paper.view.rotation = 45
    paper.view.fitBounds(wide)
    equals(paper.view.rotation, 45, 'rotated: view.rotation')
    equals(paper.view.zoom, 100 / (600 / Math.SQRT2), 'rotated: view.zoom')
    equals(
      paper.view.bounds,
      new Rectangle(-100, -200, 600, 600),
      'rotated: view.bounds'
    )
    paper.view.matrix = new Matrix()
  })

  test('view.project (#1634)', () => {
    const current = paper,
      scope = new PaperScope().setup(new Size(10, 10)),
      project = scope.project,
      view = scope.view
    current.activate()
    equals(() => view.project === project && project.view === view, true)
    // The view of the default scope displays its own project:
    equals(
      () => (
        current.view.project === current.project &&
        current.project !== project
      ),
      true
    )
    scope.remove()
  })

  test('view.dispatchMouseEvent()', () => {
    const path = new Path.Rectangle({
      point: [10, 10],
      size: [20, 20],
      fillColor: 'red'
    })
    const tool = new Tool({ minDistance: 5 })
    const log = []
    ;[
      'mouseenter', 'mousedown', 'mousedrag', 'mouseup', 'click',
      'mouseleave'
    ].forEach(type => {
      path.on(type, event => {
        log.push('item ' + type + ' ' + event.point)
      })
    })
    tool.onMouseDown = event => {
      log.push(
        'tool down ' +
        event.point +
        ' shift: ' +
        event.modifiers.shift
      )
    }
    tool.onMouseDrag = event => {
      log.push('tool drag ' + event.point)
    }
    paper.view.dispatchMouseEvent('mousemove', [15, 15])
    paper.view.dispatchMouseEvent('mousedown', [15, 15], {
      modifiers: { shift: true }
    })
    // Below the tool's minDistance:
    paper.view.dispatchMouseEvent('mousemove', [16, 15])
    paper.view.dispatchMouseEvent('mousemove', [25, 15])
    paper.view.dispatchMouseEvent('mouseup', [25, 15], {
      modifiers: { shift: false }
    })
    paper.view.dispatchMouseEvent('mousemove', [80, 80])
    equals(log, [
      'item mouseenter { x: 15, y: 15 }',
      'item mousedown { x: 15, y: 15 }',
      'tool down { x: 15, y: 15 } shift: true',
      'item mousedrag { x: 16, y: 15 }',
      'item mousedrag { x: 25, y: 15 }',
      'tool drag { x: 25, y: 15 }',
      'item mouseup { x: 25, y: 15 }',
      'item click { x: 25, y: 15 }',
      'item mouseleave { x: 80, y: 80 }'
    ])
    // Handlers can prevent the default, which the host can then skip:
    path.onMouseDown = event => {
      event.preventDefault()
    }
    equals(
      paper.view.dispatchMouseEvent('mousedown', [15, 15]),
      true,
      'prevented'
    )
    paper.view.dispatchMouseEvent('mouseup', [15, 15])
    let message
    try {
      paper.view.dispatchMouseEvent('mousedrag', [15, 15])
    } catch (e) {
      message = e.message
    }
    equals(message, `Unknown mouse event type: 'mousedrag'.`)
    tool.remove()
  })

  test('view.dispatchMouseEvent() with settings.hitTolerance (#1971)', () => {
    const path = new Path.Line({
        from: [10, 10],
        to: [50, 10],
        strokeColor: 'black'
      }),
      log = [],
      hitTolerance = paper.settings.hitTolerance
    path.onMouseEnter = path.onMouseLeave = event => {
      log.push(event.type + ' ' + event.point)
    }
    // 3 points away from the line, within a tolerance of 5:
    paper.view.dispatchMouseEvent('mousemove', [30, 13])
    paper.settings.hitTolerance = 5
    paper.view.dispatchMouseEvent('mousemove', [30, 14])
    paper.view.dispatchMouseEvent('mousemove', [30, 20])
    paper.settings.hitTolerance = hitTolerance
    equals(log, [
      'mouseenter { x: 30, y: 14 }',
      'mouseleave { x: 30, y: 20 }'
    ])
  })

  test('view.dispatchMouseEvent() outside the view', () => {
    // Hosts can draw around the view, e.g. around an artboard:
    const point = paper.view.bounds.leftCenter.subtract([50, 0]),
      path = new Path.Circle({
        center: point,
        radius: 10,
        fillColor: 'red'
      }),
      tool = new Tool(),
      log = []
    path.onMouseDown = event => {
      log.push('item down ' + event.point)
    }
    tool.onMouseDown = event => {
      log.push('tool down ' + event.point)
    }
    paper.view.dispatchMouseEvent('mousedown', point)
    paper.view.dispatchMouseEvent('mouseup', point)
    equals(log, [
      'item down ' + point,
      'tool down ' + point
    ])
    tool.remove()
  })

  test('event.time', () => {
    const tool = new Tool(),
      log = []
    tool.onMouseDown = tool.onKeyDown = event => {
      log.push(event.type + ' ' + event.time + ' ' + event.timeStamp)
    }
    paper.view.dispatchMouseEvent('mousedown', [10, 10], { time: 1.5 })
    paper.view.dispatchMouseEvent('mouseup', [10, 10], { time: 1.6 })
    paper.view.dispatchKeyEvent('keydown', 'a', { time: 2.25 })
    paper.view.dispatchKeyEvent('keyup', 'a', { time: 2.3 })
    // The deprecated options.timeStamp in milliseconds still works:
    paper.view.dispatchMouseEvent('mousedown', [10, 10], {
      timeStamp: 3500
    })
    paper.view.dispatchMouseEvent('mouseup', [10, 10], { timeStamp: 3600 })
    equals(log, [
      'mousedown 1.5 1500',
      'keydown 2.25 2250',
      'mousedown 3.5 3500'
    ])
    tool.remove()
  })

  test('view.dispatchKeyEvent()', () => {
    const tool = new Tool()
    const log = []
    tool.onKeyDown = tool.onKeyUp = event => {
      log.push(
        event.type + ' ' + event.key + ' "' + event.character + '"'
      )
    }
    paper.view.dispatchKeyEvent('keydown', 'shift')
    equals(Key.isDown('shift'), true, 'Key.isDown()')
    equals(Key.modifiers.shift, true, 'Key.modifiers')
    paper.view.dispatchKeyEvent('keydown', 'a', { character: 'A' })
    paper.view.dispatchKeyEvent('keyup', 'a')
    paper.view.dispatchKeyEvent('keyup', 'shift')
    equals(Key.isDown('shift'), false, 'Key.isDown() after keyup')
    equals(log, [
      'keydown shift ""',
      'keydown a "A"',
      'keyup a "A"',
      'keyup shift ""'
    ])
    tool.remove()
  })

  test('view.dispatchKeyEvent() with the characters of special keys (#2346)', () => {
    const tool = new Tool()
    const log = []
    tool.onKeyDown = tool.onKeyUp = event => {
      log.push(
        event.type +
        ' ' +
        event.key +
        ' ' +
        JSON.stringify(event.character)
      )
    }
    ;['space', 'enter', 'tab', 'a', 'shift'].forEach(key => {
      paper.view.dispatchKeyEvent('keydown', key)
      paper.view.dispatchKeyEvent('keyup', key)
    })
    // An explicit character still wins:
    paper.view.dispatchKeyEvent('keydown', 'space', { character: '\xA0' })
    paper.view.dispatchKeyEvent('keyup', 'space')
    equals(log, [
      'keydown space " "',
      'keyup space " "',
      'keydown enter "\\r"',
      'keyup enter "\\r"',
      'keydown tab "\\t"',
      'keyup tab "\\t"',
      'keydown a "a"',
      'keyup a "a"',
      'keydown shift ""',
      'keyup shift ""',
      'keydown space "\xA0"',
      'keyup space "\xA0"'
    ])
    tool.remove()
  })

  if (!isNodeContext) {
    test('view.viewSize of canvases with padding and border (#1160, #2033)', () => {
      // The padding of 10 and the border of 5 add 30 to the content box,
      // which is the size of the view:
      function createCanvas(boxSizing, resize) {
        const canvas = document.createElement('canvas')
        canvas.width = 200
        canvas.height = 100
        canvas.style.padding = '10px'
        canvas.style.border = '5px solid black'
        canvas.style.boxSizing = boxSizing
        if (resize) {
          canvas.setAttribute('resize', '')
          canvas.style.width = '300px'
          canvas.style.height = '150px'
        }
        document.body.appendChild(canvas)
        return canvas
      }

      function getBorderBoxSize(canvas) {
        const rect = canvas.getBoundingClientRect()
        return new Size(rect.width, rect.height)
      }

      function resizeWindow() {
        const event = document.createEvent('Event')
        event.initEvent('resize', false, false)
        window.dispatchEvent(event)
      }

      // Without the resize attribute, the view keeps the size of the canvas
      // when setting up projects for it again and again:
      ;['content-box', 'border-box'].forEach(boxSizing => {
        const canvas = createCanvas(boxSizing)
        for (let i = 0; i < 3; i++) {
          const project = new Project(canvas)
          equals(
            project.view.viewSize,
            new Size(200, 100),
            boxSizing + ': view.viewSize, setup ' + i
          )
          equals(
            getBorderBoxSize(canvas),
            new Size(230, 130),
            boxSizing + ': border box, setup ' + i
          )
          project.remove()
        }
        document.body.removeChild(canvas)
      })

      // With the resize attribute, the view takes the size of the content box
      // set through CSS, also after resizing:
      ;[
        ['content-box', new Size(300, 150)],
        ['border-box', new Size(270, 120)]
      ].forEach(entry => {
        const boxSizing = entry[0],
          canvas = createCanvas(boxSizing, true),
          project = new Project(canvas)
        for (let i = 0; i < 3; i++) {
          equals(
            project.view.viewSize,
            entry[1],
            boxSizing + ': view.viewSize with resize, ' + i
          )
          resizeWindow()
        }
        project.remove()
        document.body.removeChild(canvas)
      })
    })

    test('view.viewSize sets the CSS size of non-resizable canvases (#2088)', () => {
      // On every screen, not just at pixel ratios other than 1, so that
      // pages behave the same everywhere:
      const canvas = document.createElement('canvas')
      canvas.width = 200
      canvas.height = 100
      document.body.appendChild(canvas)
      const project = new Project(canvas)
      project.view.viewSize = new Size(300, 150)
      equals(canvas.style.width, '300px', 'style.width')
      equals(canvas.style.height, '150px', 'style.height')
      project.remove()
      document.body.removeChild(canvas)
    })

    test('view.viewSize of canvases under CSS transforms', () => {
      // A CSS transform on an ancestor scales the canvas on screen, but not
      // its content box, which is the size of the view:
      ;[false, true].forEach(resize => {
        ;[false, true].forEach(insets => {
          const name = (
              (resize ? 'resize' : 'fixed') +
              (insets ? ', padding and border' : '')
            ),
            container = document.createElement('div'),
            canvas = document.createElement('canvas')
          container.style.transform = 'scale(0.5)'
          canvas.width = 200
          canvas.height = 100
          canvas.style.display = 'block'
          if (resize) {
            canvas.setAttribute('resize', '')
            canvas.style.width = '200px'
            canvas.style.height = '100px'
          }
          if (insets) {
            canvas.style.padding = '6px'
            canvas.style.border = '2px solid black'
          }
          container.appendChild(canvas)
          document.body.appendChild(container)
          const project = new Project(canvas)
          equals(project.view.viewSize, new Size(200, 100), name)
          project.remove()
          document.body.removeChild(container)
        })
      })
    })

    test('event.point of canvases with padding, border and CSS transforms (#1729)', () => {
      // The view is 200 x 100. Its point (50, 40) lies on the screen at the
      // position of the container (20, 30), plus the padding of 6 and the
      // border of 2, plus the point itself, all scaled by the CSS transform:
      ;[
        ['plain', false, 1, new Point(70, 70)],
        ['padding and border', true, 1, new Point(78, 78)],
        ['transform', false, 0.5, new Point(45, 50)],
        ['padding, border and transform', true, 0.5, new Point(49, 54)]
      ].forEach(entry => {
        const name = entry[0],
          container = document.createElement('div'),
          canvas = document.createElement('canvas')
        container.style.position = 'fixed'
        container.style.left = '20px'
        container.style.top = '30px'
        container.style.transformOrigin = '0 0'
        canvas.width = 200
        canvas.height = 100
        canvas.style.display = 'block'
        if (entry[1]) {
          canvas.style.padding = '6px'
          canvas.style.border = '2px solid black'
        }
        container.appendChild(canvas)
        document.body.appendChild(container)
        const project = new Project(canvas)
        const view = project.view
        const item = new Path.Rectangle(new Point(45, 35), new Size(10))
        let point = null
        let hit = false
        item.fillColor = 'red'
        item.onMouseDown = () => {
          hit = true
        }
        view.onMouseDown = event => {
          point = event.point
        }
        // Transform the container after the setup, so the view keeps its
        // size:
        container.style.transform = 'scale(' + entry[2] + ')'
        triggerMouseEvent('mousedown', entry[3], canvas)
        triggerMouseEvent('mouseup', entry[3])
        equals(
          view.viewSize,
          new Size(200, 100),
          name + ': view.viewSize'
        )
        equals(point, new Point(50, 40), name + ': event.point')
        equals(hit, true, name + ': item hit')
        project.remove()
        document.body.removeChild(container)
      })
    })

    test('event.point of canvases with a CSS size different from the view size (#549)', () => {
      // Without the resize attribute, the view keeps its size when the CSS
      // size of the canvas changes, and the content box is stretched to it:
      const canvas = document.createElement('canvas')
      canvas.width = 200
      canvas.height = 100
      canvas.style.position = 'fixed'
      canvas.style.left = '20px'
      canvas.style.top = '30px'
      document.body.appendChild(canvas)
      const project = new Project(canvas)
      const view = project.view
      let point = null
      canvas.style.width = '400px'
      canvas.style.height = '150px'
      view.onMouseDown = event => {
        point = event.point
      }
      triggerMouseEvent('mousedown', new Point(120, 90), canvas)
      triggerMouseEvent('mouseup', new Point(120, 90))
      equals(view.viewSize, new Size(200, 100), 'view.viewSize')
      equals(point, new Point(50, 40), 'event.point')
      project.remove()
      document.body.removeChild(canvas)
    })
  }

  test('Selections are drawn with a line width of 1', () => {
    const path = new Path.Line({
      from: [10, 50],
      to: [90, 50],
      selected: true
    })
    const ctx = paper.view.element.getContext('2d')

    function getAlpha(x, y) {
      const pixelRatio = paper.view.pixelRatio
      return ctx.getImageData(x * pixelRatio, y * pixelRatio, 1, 1).data[3]
    }

    // Change the line width behind the view's back, as code drawing directly
    // on its context can:
    ctx.lineWidth = 10
    paper.view.update(true)
    // A line width of 1 only covers the pixels next to y = 50, 10 would reach
    // from y = 45 to 55:
    equals(getAlpha(50, 50) > 0, true, 'alpha on the line')
    equals(getAlpha(50, 53), 0, 'alpha next to the line')
    ctx.lineWidth = 1
    path.remove()
  })

  test('Selected bounds and strokeBounds (#1030)', () => {
    // The stroke reaches from 20 to 40 around the left edge at 30. The
    // selection's 1pt lines cover the pixels on both sides of these
    // coordinates, and its 4pt corner handles reach 2 further:
    const path = new Path.Rectangle({
        point: [30, 30],
        size: [40, 40],
        strokeColor: 'red',
        strokeWidth: 20,
        selectedColor: 'blue'
      }),
      ctx = paper.view.element.getContext('2d')

    function getBlue(x, y) {
      const pixelRatio = paper.view.pixelRatio
      return ctx.getImageData(x * pixelRatio, y * pixelRatio, 1, 1).data[2]
    }

    path.strokeBounds.selected = true
    paper.view.update(true)
    equals(getBlue(20, 40) > 0, true, 'the left edge of strokeBounds')
    equals(getBlue(18, 18) > 0, true, 'the top left handle of strokeBounds')
    equals(getBlue(30, 40), 0, 'no left edge of bounds')
    equals(getBlue(28, 28), 0, 'no top left handle of bounds')
    path.strokeBounds.selected = false
    path.bounds.selected = true
    paper.view.update(true)
    equals(getBlue(20, 40), 0, 'no left edge of strokeBounds')
    equals(getBlue(18, 18), 0, 'no top left handle of strokeBounds')
    equals(getBlue(30, 40) > 0, true, 'the left edge of bounds')
    equals(getBlue(28, 28) > 0, true, 'the top left handle of bounds')
    path.remove()
  })

  test('settings.segmentSize (#1899)', () => {
    const path = new Path({
        segments: [[[20, 50], null, [0, -30]], [80, 50]],
        fullySelected: true
      }),
      settings = paper.settings,
      handleSize = settings.handleSize,
      segmentSize = settings.segmentSize,
      ctx = paper.view.element.getContext('2d')

    function getAlpha(x, y) {
      const pixelRatio = paper.view.pixelRatio
      return ctx.getImageData(x * pixelRatio, y * pixelRatio, 1, 1).data[3]
    }

    // By default, the segments are drawn as large as the handles, 4 points:
    paper.view.update(true)
    equals(getAlpha(20, 20) > 0, true, 'the handle')
    equals(getAlpha(21, 51) > 0, true, 'the segment')
    equals(getAlpha(20, 54), 0, 'below the segment')
    // A larger segment without handles:
    settings.handleSize = 0
    settings.segmentSize = 10
    paper.view.update(true)
    equals(getAlpha(20, 20), 0, 'no handle')
    equals(getAlpha(20, 54) > 0, true, 'the larger segment')
    settings.handleSize = handleSize
    settings.segmentSize = segmentSize
    path.remove()
  })

  test('Shadows of filled and stroked paths (#892)', () => {
    // The stroke reaches from 15 to 65, so the shadow of the whole shape, 10
    // further, reaches from 25 to 75, while that of the fill only reaches 70:
    const props = {
        fillColor: 'red',
        strokeColor: 'blue',
        strokeWidth: 10,
        shadowColor: 'black',
        shadowOffset: [10, 10]
      },
      rect = new Rectangle(20, 20, 40, 40),
      ctx = paper.view.element.getContext('2d')

    function getPixel(x, y) {
      const pixelRatio = paper.view.pixelRatio,
        data = ctx.getImageData(
          x * pixelRatio,
          y * pixelRatio,
          1,
          1
        ).data
      return [data[0], data[1], data[2], data[3]]
    }

    ;[
      new Path.Rectangle(rect),
      new CompoundPath({ children: [new Path.Rectangle(rect)] }),
      new Shape.Rectangle(rect)
    ].forEach(item => {
      item.set(props)
      paper.view.update(true)
      const name = item.className
      equals(
        getPixel(72, 72),
        [0, 0, 0, 255],
        name + ': the shadow of the stroke'
      )
      equals(getPixel(77, 77)[3], 0, name + ': beyond the shadow')
      equals(getPixel(17, 40), [0, 0, 255, 255], name + ': the stroke')
      equals(getPixel(40, 40), [255, 0, 0, 255], name + ': the fill')
      item.remove()
    })
  })

  test('ToolEvent#velocity and #elapsed', () => {
    const tool = new Tool({ maxDistance: 10 }),
      log = []
    // ToolEvent reads its values from the tool, so record them in the handler:
    tool.onMouseDown =
      tool.onMouseDrag =
      tool.onMouseUp =
        event => {
          log.push(
            event.type + ' ' + event.velocity + ' ' + event.elapsed
          )
        }
    function dispatch(type, point, time) {
      paper.view.dispatchMouseEvent(type, point, { time })
    }
    // Quarter seconds, so the times add up without rounding:
    dispatch('mousedown', [0, 0], 1)
    dispatch('mousemove', [10, 0], 1.25)
    // Both steps that maxDistance adds share the speed of the report:
    dispatch('mousemove', [30, 0], 1.5)
    // No time passed:
    dispatch('mousemove', [40, 0], 1.5)
    // Since the last event, not since mousedown:
    dispatch('mouseup', [50, 0], 1.75)
    equals(log, [
      'mousedown { x: 0, y: 0 } 0',
      'mousedrag { x: 40, y: 0 } 0.25',
      'mousedrag { x: 80, y: 0 } 0.25',
      'mousedrag { x: 80, y: 0 } 0.25',
      'mousedrag { x: 0, y: 0 } 0',
      'mouseup { x: 40, y: 0 } 0.25'
    ])
    tool.remove()
  })

  test('tool.eventInterval repeats mousedrag while the mouse is held', assert => {
    const done = assert.async(),
      tool = new Tool({ eventInterval: 10 }),
      drags = []
    // ToolEvent reads its values from the tool, so record them in the handler:
    tool.onMouseDrag = event => {
      drags.push({
        point: event.point,
        delta: event.delta,
        count: event.count
      })
    }
    paper.view.dispatchMouseEvent('mousedown', [20, 20])
    paper.view.dispatchMouseEvent('mousemove', [30, 20])
    // Wait for the repeats rather than a fixed time, as timers slip when the
    // tests run in parallel:
    const release = () => {
      if (drags.length > 3) {
        paper.view.dispatchMouseEvent('mouseup', [30, 20])
        const count = drags.length
        // The first drag is the move, then the repeats at the same point:
        equals(count > 3, true, 'repeated')
        equals(
          drags.slice(1).every(
            (event, i) => (
              event.point.equals([30, 20]) &&
              event.delta.isZero() &&
              event.count === i + 1
            )
          ),
          true,
          'at the last point, without a delta, counting up'
        )
        // Nothing fires after the mouse is released:
        setTimeout(() => {
          equals(drags.length, count, 'stopped')
          tool.remove()
          done()
        }, 50)
      } else {
        setTimeout(release, 10)
      }
    }
    release()
  })

  test('Text measurements in views without a canvas', () => {
    // As in workers, a view without an element has no canvas of its own, but
    // measures with one from the CanvasProvider, as canvas views do:
    const view = new View(paper.project, null),
      canvasView = paper.view
    equals(
      () => {
        const width = view.getTextWidth(
          '20px sans-serif',
          ['Hello'],
          '0px'
        )
        return (
          width > 0 && (
            width ===
            canvasView.getTextWidth(
              '20px sans-serif',
              ['Hello'],
              '0px'
            )
          )
        )
      },
      true,
      'getTextWidth()'
    )
    equals(
      () => view.getPixelSize('12pt'),
      canvasView.getPixelSize('12pt'),
      'getPixelSize()'
    )
    view.remove()
  })
})
