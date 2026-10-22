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
  Color,
  CompoundPath,
  Gradient,
  Group,
  Path,
  Point,
  PointText,
  Project,
  Rectangle,
  Shape,
  Size,
  SymbolDefinition
} from 'paper'
import { equals, test } from '../helpers.js'

describe('JSON', () => {
  function testExportImportJSON(project) {
    // Use higher precision than in comparissons, for bounds
    const json = project.exportJSON({ precision: 8 })
    const project2 = new Project()
    project2.importJSON(json)
    equals(project, project2, null, { dontShareProject: true })
  }

  test('Circles', () => {
    let topLeft = new Point(200, 200)
    let size = new Size(150, 100)
    let rectangle = new Rectangle(topLeft, size)
    let path = new Path.Ellipse(rectangle)
    path.fillColor = 'black'

    topLeft = new Point(5, 400)
    size = new Size(100, 50)
    rectangle = new Rectangle(topLeft, size)
    path = new Path.Ellipse(rectangle)
    path.fillColor = 'yellow'

    path = new Path.Circle(new Point(50, 50), 25)
    path.fillColor = 'red'

    testExportImportJSON(paper.project)
  })

  test('CompoundPath', () => {
    paper.project.currentStyle.fillColor = 'black'
    const path1 = new Path.Rectangle([200, 200], [100, 100])
    const path2 = new Path.Rectangle([50, 50], [200, 200])
    const path3 = new Path.Rectangle([0, 0], [400, 400])
    new CompoundPath(path1, path2, path3)

    testExportImportJSON(paper.project)
  })

  test('Empty Path', () => {
    new Path()
    testExportImportJSON(paper.project)
  })

  test('Gradients', () => {
    const path = new Path.Circle([100, 100], 40)
    const gradient = new Gradient(['yellow', 'red', 'black'], true)
    const from = path.position
    const to = path.bounds.rightCenter
    const gradientColor = new Color(gradient, from, to)
    path.fillColor = gradientColor
    path.strokeColor = 'black'
    testExportImportJSON(paper.project)
  })

  test('Group transform', () => {
    const circle1 = new Path.Circle([100, 100], 50)
    circle1.fillColor = 'red'
    const circle2 = new Path.Circle([200, 100], 50)
    circle2.fillColor = 'blue'
    const group = new Group(circle1, circle2)
    group.translate([100, 100])
    group.scale(0.5)
    group.rotate(10)
    testExportImportJSON(paper.project)
  })

  test('Rectangle testing', () => {
    const point1 = new Point(10, 10)
    const size1 = new Size(50, 50)
    const rectangle1 = new Rectangle(point1, size1)
    const path1 = new Path.Rectangle(rectangle1)
    path1.strokeColor = 'black'
    path1.fillColor = 'red'
    path1.name = 'square1'
    path1.strokeCap = 'square'
    path1.opacity = 0.1
    path1.dashArray = [5, 2]
    path1.dashOffset = 0

    const point2 = new Point(75, 75)
    const point22 = new Point(100, 100)
    const path2 = new Path.Rectangle(point2, point22)
    path2.strokeColor = 'red'
    path2.strokeWidth = 4
    path2.fillColor = 'blue'
    path2.name = 'square2'
    path2.strokeCap = 'butt'

    const point3 = new Point(150, 150)
    const size3 = new Size(50, 50)
    const rectangle3 = new Rectangle(point3, size3)
    const path3 = new Path.Rectangle(rectangle3)
    path3.strokeColor = 'blue'

    const point4 = new Point(200, 200)
    const size4 = new Size(100, 100)
    const rectangle4 = new Rectangle(point4, size4)
    const cornerSize4 = new Size(30, 30)
    const path4 = new Path.Rectangle(rectangle4, cornerSize4)
    path4.strokeColor = 'yellow'
    path4.fillColor = 'purple'
    testExportImportJSON(paper.project)
  })

  test('Symbols', () => {
    const ellipse = new Path.Ellipse({
      from: [0, 0],
      to: [200, 100],
      fillColor: 'red'
    })
    const definition = new SymbolDefinition(ellipse)
    const p1 = definition.place([100, 100])
    p1.rotate(45)
    const p2 = definition.place([300, 200])
    p2.rotate(-30)

    testExportImportJSON(paper.project)
  })

  test('Symbol items write their definition as definition', () => {
    const definition = new SymbolDefinition(
      new Path.Rectangle({ point: [0, 0], size: [10, 10], fillColor: 'red' })
    )
    const json = definition.place([100, 100]).exportJSON({ asString: false }),
      props = json[1][1]
    equals('definition' in props && !('symbol' in props), true)
    // JSON that writes it as symbol, as before, still imports:
    props.symbol = props.definition
    delete props.definition
    const item = new Project().importJSON(json)
    equals(item.className, 'SymbolItem')
    equals(item.definition.item.bounds, new Rectangle(-5, -5, 10, 10))
    equals(item.position, new Point(100, 100))
  })

  test('PointText testing', () => {
    let text = new PointText(new Point(50, 100))
    text.fillColor = 'black'
    text.content = 'This is a test'

    text = new PointText(new Point(100, 150))
    text.fillColor = 'red'
    text.strokeWidth = '4'
    text.content = 'This is also a test'

    text.rotate(45)
    text.shear(0.85, 0.15)
    text.scale(0.85, 2)
    testExportImportJSON(paper.project)
  })

  test('transform test 1', () => {
    const circlePath = new Path.Circle(new Point(280, 100), 25)
    circlePath.strokeColor = 'black'
    circlePath.fillColor = 'white'

    const clones = 30
    const angle = 360 / clones

    for (let i = 0; i < clones; i++) {
      const clonedPath = circlePath.clone()
      clonedPath.rotate(angle * i, circlePath.bounds.topLeft)
    }
    testExportImportJSON(paper.project)
  })

  test('transform test 2', () => {
    const path = new Path.Rectangle(new Point(50, 50), new Size(100, 50))
    path.style = {
      fillColor: 'white',
      strokeColor: 'black'
    }
    const copy = path.clone()
    copy.strokeColor = 'red'
    copy.rotate(-45)
    copy.scale(0.5)
    testExportImportJSON(paper.project)
  })

  test('Item#name', () => {
    new Path({
      name: 'dave'
    })
    testExportImportJSON(paper.project)
  })

  test('Item#data', () => {
    const path = new Path()
    path.data = {
      string: '----',
      number: 1234,
      array: ['a ray', 'some rays'],
      bool: true,
      nil: null,
      point: new Point(12, 34),
      size: new Size(12, 34),
      rectangle: new Rectangle([12, 34], [56, 78]),
      deep: {
        deeper: {
          deepest: true
        }
      }
    }
    testExportImportJSON(paper.project)
  })

  test('Color', () => {
    new Path({
      fillColor: new Color(1, 1, 0, 0.5)
    })
    testExportImportJSON(paper.project)
  })

  test('Color#importJSON()', () => {
    const topLeft = [100, 100]
    const bottomRight = [200, 200]

    const path = new Path.Rectangle({
      topLeft,
      bottomRight,
      // Fill the path with a gradient of three color stops
      // that runs between the two points we defined earlier:
      fillColor: {
        gradient: {
          stops: [
            ['yellow', 0],
            ['red', 0.5],
            ['blue', 1]
          ]
        },
        origin: topLeft,
        destination: bottomRight
      }
    })

    const json = path.fillColor.exportJSON(),
      id = path.fillColor.gradient._id,
      color = new Color(),
      str = (
        '[["dictionary",{"#' +
        id +
        '":["Gradient",[[[1,1,0],0],[[1,0,0],0.5],[[0,0,1],1]],false]}],["Color","gradient",["#' +
        id +
        '"],[100,100],[200,200]]]'
      )

    equals(json, str)

    equals(() => color.importJSON(json) === color, true)

    equals(() => color.equals(path.fillColor), true)
  })

  test('Path#importJSON()', () => {
    const path = new Path()
    const layer = paper.project.activeLayer
    equals(() => path.parent === layer, true)
    path.importJSON(
      '["Path",{"segments":[[[50,100],[0,27.61424],[0,-27.61424]],[[100,50],[-27.61424,0],[27.61424,0]],[[150,100],[0,-27.61424],[0,27.61424]],[[100,150],[27.61424,0],[-27.61424,0]]],"closed":true,"fillColor":[1,0,0]}]'
    )
    equals(() => path.bounds, { x: 50, y: 50, width: 100, height: 100 })
    equals(() => path.fillColor, { red: 1, green: 0, blue: 0 })
    equals(() => layer.firstChild === path, true)
    equals(() => path.parent === layer, true)
  })

  test('Shape#importJSON() with type after radius (#1820)', () => {
    const circle = new Shape.Circle({
      center: [50, 50],
      radius: 25,
      fillColor: 'red'
    })
    let imported = new Shape().importJSON(
      '["Shape",{"applyMatrix":false,"matrix":[1,0,0,1,50,50],' +
      '"radius":25,"size":[50,50],"type":"circle","fillColor":[1,0,0]}]'
    )
    equals(imported, circle)
    equals(imported.radius, 25, 'imported.radius')
    equals(
      imported.bounds,
      new Rectangle(25, 25, 50, 50),
      'imported.bounds'
    )

    const ellipse = new Shape.Ellipse({
      center: [50, 50],
      radius: [40, 20]
    })
    imported = new Shape().importJSON(
      '["Shape",{"applyMatrix":false,"matrix":[1,0,0,1,50,50],' +
      '"radius":[40,20],"size":[80,40],"type":"ellipse"}]'
    )
    equals(imported, ellipse)
  })

  test('Item#importJSON() does not override Item#insert()', () => {
    const path = new Path()
    equals(typeof path.insert, 'function')
    path.importJSON(path.exportJSON())
    equals(typeof path.insert, 'function')
  })

  test('Item#importJSON() resets the fields that the JSON leaves out (#1425, #1324)', () => {
    const path = new Path.Rectangle({
      point: [10, 10],
      size: [20, 20],
      fillColor: 'red',
      strokeWidth: 4,
      name: 'changed',
      visible: false,
      selected: true
    })
    path.rotate(30)
    path.onMouseDown = () => {}
    const parent = path.parent,
      index = path.index
    const res = path.importJSON(
      '["Path",{"segments":[[0,0],[10,0],[10,10]],"closed":true}]'
    )
    // The same as importing a new item:
    equals(res === path, true, 'same item')
    equals(path.segments.length, 3)
    equals(path.visible, true, 'visible')
    equals(path.selected, false, 'selected')
    equals(!path.name, true, 'name')
    equals(path.fillColor, null, 'fillColor')
    equals(path.strokeWidth, 1, 'strokeWidth')
    equals(path.matrix.isIdentity(), true, 'matrix')
    // But it keeps its place in the scene graph and its handlers:
    equals(path.parent === parent && path.index === index, true, 'place')
    equals(path.responds('mousedown'), true, 'handlers')
    // Groups lose the children that the JSON doesn't have:
    const group = new Group([new Path.Circle([50, 50], 10)])
    group.importJSON('["Group",{}]')
    equals(group.children.length, 0, 'group children')
  })
})
