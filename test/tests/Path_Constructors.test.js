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

import { describe } from 'vitest'
import paper, { Group, Path, Point, Project, Rectangle, Size } from 'paper'
import { equals, test } from '../helpers.js'

describe('Path Constructors', () => {
  test('Path.rectangle([50, 50], [100, 100])', () => {
    const path = Path.rectangle([50, 50], [100, 100])
    equals(
      path.segments.toString(),
      '{ point: { x: 50, y: 50 } },{ point: { x: 150, y: 50 } },{ point: { x: 150, y: 150 } },{ point: { x: 50, y: 150 } }'
    )
  })

  test('Path.rectangle(new Size(50, 50), new Size(100, 100))', () => {
    // Like any value without an x, the size is the point:
    const path = Path.rectangle(new Size(50, 50), new Size(100, 100))
    equals(
      path.segments.toString(),
      '{ point: { x: 50, y: 50 } },{ point: { x: 150, y: 50 } },{ point: { x: 150, y: 150 } },{ point: { x: 50, y: 150 } }'
    )
  })

  test('Path.rectangle({ from: [50, 50], to: [150, 150] })', () => {
    const path = Path.rectangle({
      from: [50, 50],
      to: [150, 150]
    })
    equals(
      path.segments.toString(),
      '{ point: { x: 50, y: 50 } },{ point: { x: 150, y: 50 } },{ point: { x: 150, y: 150 } },{ point: { x: 50, y: 150 } }'
    )
  })

  test('Path.circle([100, 100], 50)', () => {
    const path = Path.circle([100, 100], 50)
    equals(
      path.segments.toString(),
      '{ point: { x: 150, y: 100 }, handleIn: { x: 0, y: -27.61424 }, handleOut: { x: 0, y: 27.61424 } },{ point: { x: 100, y: 150 }, handleIn: { x: 27.61424, y: 0 }, handleOut: { x: -27.61424, y: 0 } },{ point: { x: 50, y: 100 }, handleIn: { x: 0, y: 27.61424 }, handleOut: { x: 0, y: -27.61424 } },{ point: { x: 100, y: 50 }, handleIn: { x: -27.61424, y: 0 }, handleOut: { x: 27.61424, y: 0 } }'
    )
  })

  test('Path.circle({ center: [100, 100], radius: 50 })', () => {
    const path = Path.circle({ center: [100, 100], radius: 50 })
    equals(
      path.segments.toString(),
      '{ point: { x: 150, y: 100 }, handleIn: { x: 0, y: -27.61424 }, handleOut: { x: 0, y: 27.61424 } },{ point: { x: 100, y: 150 }, handleIn: { x: 27.61424, y: 0 }, handleOut: { x: -27.61424, y: 0 } },{ point: { x: 50, y: 100 }, handleIn: { x: 0, y: 27.61424 }, handleOut: { x: 0, y: -27.61424 } },{ point: { x: 100, y: 50 }, handleIn: { x: -27.61424, y: 0 }, handleOut: { x: 27.61424, y: 0 } }'
    )
  })

  test('Path.circle({ center: [100, 100], radius: 50, insert: true })', () => {
    paper.settings.insertItems = false
    const path = Path.circle({
      center: [100, 100],
      radius: 50,
      insert: true
    })
    equals(path.isInserted(), true)
    paper.settings.insertItems = true
  })

  test('Path.ellipse(rect)', () => {
    const rect = new Rectangle([500, 500], [1000, 750])
    const path = Path.ellipse(rect)
    equals(
      path.segments.toString(),
      '{ point: { x: 1500, y: 875 }, handleIn: { x: 0, y: -207.10678 }, handleOut: { x: 0, y: 207.10678 } },{ point: { x: 1000, y: 1250 }, handleIn: { x: 276.14237, y: 0 }, handleOut: { x: -276.14237, y: 0 } },{ point: { x: 500, y: 875 }, handleIn: { x: 0, y: 207.10678 }, handleOut: { x: 0, y: -207.10678 } },{ point: { x: 1000, y: 500 }, handleIn: { x: -276.14237, y: 0 }, handleOut: { x: 276.14237, y: 0 } }'
    )
  })

  test('Path.rectangle(rectangle, radius)', () => {
    const rectangle = new Rectangle([50, 50], [200, 100])
    const path = Path.rectangle(rectangle, 20)
    equals(
      path.segments.toString(),
      '{ point: { x: 70, y: 50 }, handleIn: { x: -11.04569, y: 0 } },{ point: { x: 230, y: 50 }, handleOut: { x: 11.04569, y: 0 } },{ point: { x: 250, y: 70 }, handleIn: { x: 0, y: -11.04569 } },{ point: { x: 250, y: 130 }, handleOut: { x: 0, y: 11.04569 } },{ point: { x: 230, y: 150 }, handleIn: { x: 11.04569, y: 0 } },{ point: { x: 70, y: 150 }, handleOut: { x: -11.04569, y: 0 } },{ point: { x: 50, y: 130 }, handleIn: { x: 0, y: 11.04569 } },{ point: { x: 50, y: 70 }, handleOut: { x: 0, y: -11.04569 } }'
    )
  })

  test('Path.rectangle({ rectangle: rectangle, radius: radius })', () => {
    const rect = new Rectangle({
      point: [50, 50],
      size: [200, 100]
    })
    const path = Path.rectangle({
      rectangle: rect,
      radius: 20
    })
    equals(
      path.segments.toString(),
      '{ point: { x: 70, y: 50 }, handleIn: { x: -11.04569, y: 0 } },{ point: { x: 230, y: 50 }, handleOut: { x: 11.04569, y: 0 } },{ point: { x: 250, y: 70 }, handleIn: { x: 0, y: -11.04569 } },{ point: { x: 250, y: 130 }, handleOut: { x: 0, y: 11.04569 } },{ point: { x: 230, y: 150 }, handleIn: { x: 11.04569, y: 0 } },{ point: { x: 70, y: 150 }, handleOut: { x: -11.04569, y: 0 } },{ point: { x: 50, y: 130 }, handleIn: { x: 0, y: 11.04569 } },{ point: { x: 50, y: 70 }, handleOut: { x: 0, y: -11.04569 } }'
    )
  })

  test('Path.rectangle(rect, size) - too large size', () => {
    const rect = new Rectangle([50, 50], [200, 100])
    const path = Path.rectangle(rect, 200)
    equals(
      path.segments.toString(),
      '{ point: { x: 150, y: 50 }, handleIn: { x: -55.22847, y: 0 } },{ point: { x: 150, y: 50 }, handleOut: { x: 55.22847, y: 0 } },{ point: { x: 250, y: 100 }, handleIn: { x: 0, y: -27.61424 } },{ point: { x: 250, y: 100 }, handleOut: { x: 0, y: 27.61424 } },{ point: { x: 150, y: 150 }, handleIn: { x: 55.22847, y: 0 } },{ point: { x: 150, y: 150 }, handleOut: { x: -55.22847, y: 0 } },{ point: { x: 50, y: 100 }, handleIn: { x: 0, y: 27.61424 } },{ point: { x: 50, y: 100 }, handleOut: { x: 0, y: -27.61424 } }'
    )
  })

  test('Path.arc(from, through, to)', () => {
    const path = Path.arc([0, 20], [75, 75], [100, 0])
    equals(
      path.segments.toString(),
      '{ point: { x: 0, y: 20 }, handleOut: { x: -2.62559, y: 23.01251 } },{ point: { x: 30.89325, y: 74.75812 }, handleIn: { x: -21.05455, y: -9.65273 }, handleOut: { x: 21.05455, y: 9.65273 } },{ point: { x: 92.54397, y: 62.42797 }, handleIn: { x: -15.72238, y: 17.00811 }, handleOut: { x: 15.72238, y: -17.00811 } },{ point: { x: 100, y: 0 }, handleIn: { x: 11.27458, y: 20.23247 } }'
    )
  })

  test('Path.arc({ from: from, through: through, to: to })', () => {
    const path = Path.arc({
      from: [0, 20],
      through: [75, 75],
      to: [100, 0]
    })
    equals(
      path.segments.toString(),
      '{ point: { x: 0, y: 20 }, handleOut: { x: -2.62559, y: 23.01251 } },{ point: { x: 30.89325, y: 74.75812 }, handleIn: { x: -21.05455, y: -9.65273 }, handleOut: { x: 21.05455, y: 9.65273 } },{ point: { x: 92.54397, y: 62.42797 }, handleIn: { x: -15.72238, y: 17.00811 }, handleOut: { x: 15.72238, y: -17.00811 } },{ point: { x: 100, y: 0 }, handleIn: { x: 11.27458, y: 20.23247 } }'
    )
  })

  test('Path.regularPolygon(center, sides, radius)', () => {
    let path = Path.regularPolygon(new Point(50, 50), 3, 10)
    equals(
      path.segments.toString(),
      '{ point: { x: 50, y: 40 } },{ point: { x: 41.33975, y: 55 } },{ point: { x: 58.66025, y: 55 } }'
    )

    path = Path.regularPolygon(new Point(250, 250), 10, 100)
    equals(
      path.segments.toString(),
      '{ point: { x: 280.9017, y: 154.89435 } },{ point: { x: 219.0983, y: 154.89435 } },{ point: { x: 169.0983, y: 191.22147 } },{ point: { x: 150, y: 250 } },{ point: { x: 169.0983, y: 308.77853 } },{ point: { x: 219.0983, y: 345.10565 } },{ point: { x: 280.9017, y: 345.10565 } },{ point: { x: 330.9017, y: 308.77853 } },{ point: { x: 350, y: 250 } },{ point: { x: 330.9017, y: 191.22147 } }'
    )
  })

  test('Path.regularPolygon() orientation and segment order (#1787)', () => {
    // As in Illustrator, for any number of sides, the polygon stands on a flat
    // bottom edge, and its segments run counterclockwise from its top vertex,
    // or with an even number of sides, from the right end of its top edge:
    for (let sides = 3; sides <= 12; sides++) {
      const path = Path.regularPolygon([0, 0], sides, 10),
        points = path.segments.map(segment => segment.point),
        ys = points.map(point => point.y),
        top = Math.min.apply(null, ys),
        bottom = Math.max.apply(null, ys),
        first = points[0]
      equals(path.clockwise, false, sides + ' sides: counterclockwise')
      equals(
        points.filter(point => Math.abs(point.y - bottom) < 1e-9).length,
        2,
        sides + ' sides: flat bottom edge'
      )
      equals(
        Math.abs(first.y - top) < 1e-9 &&
        (sides % 2 ? Math.abs(first.x) < 1e-9 : first.x > 0),
        true,
        sides + ' sides: first segment'
      )
    }
  })

  test('Path.regularPolygon({ center: center, sides: sides, radius: radius })', () => {
    let path = Path.regularPolygon({
      center: new Point(50, 50),
      sides: 3,
      radius: 10
    })
    equals(
      path.segments.toString(),
      '{ point: { x: 50, y: 40 } },{ point: { x: 41.33975, y: 55 } },{ point: { x: 58.66025, y: 55 } }'
    )

    path = Path.regularPolygon({
      center: new Point(250, 250),
      sides: 10,
      radius: 100
    })
    equals(
      path.segments.toString(),
      '{ point: { x: 280.9017, y: 154.89435 } },{ point: { x: 219.0983, y: 154.89435 } },{ point: { x: 169.0983, y: 191.22147 } },{ point: { x: 150, y: 250 } },{ point: { x: 169.0983, y: 308.77853 } },{ point: { x: 219.0983, y: 345.10565 } },{ point: { x: 280.9017, y: 345.10565 } },{ point: { x: 330.9017, y: 308.77853 } },{ point: { x: 350, y: 250 } },{ point: { x: 330.9017, y: 191.22147 } }'
    )
  })

  test('Path.star(center, points, radius1, radius2)', () => {
    let path = Path.star(new Point(100, 100), 10, 10, 20)
    equals(
      path.segments.toString(),
      '{ point: { x: 100, y: 90 } },{ point: { x: 106.18034, y: 80.97887 } },{ point: { x: 105.87785, y: 91.90983 } },{ point: { x: 116.18034, y: 88.24429 } },{ point: { x: 109.51057, y: 96.90983 } },{ point: { x: 120, y: 100 } },{ point: { x: 109.51057, y: 103.09017 } },{ point: { x: 116.18034, y: 111.75571 } },{ point: { x: 105.87785, y: 108.09017 } },{ point: { x: 106.18034, y: 119.02113 } },{ point: { x: 100, y: 110 } },{ point: { x: 93.81966, y: 119.02113 } },{ point: { x: 94.12215, y: 108.09017 } },{ point: { x: 83.81966, y: 111.75571 } },{ point: { x: 90.48943, y: 103.09017 } },{ point: { x: 80, y: 100 } },{ point: { x: 90.48943, y: 96.90983 } },{ point: { x: 83.81966, y: 88.24429 } },{ point: { x: 94.12215, y: 91.90983 } },{ point: { x: 93.81966, y: 80.97887 } }'
    )

    path = Path.star(new Point(100, 100), 5, 20, 10)
    equals(
      path.segments.toString(),
      '{ point: { x: 100, y: 80 } },{ point: { x: 105.87785, y: 91.90983 } },{ point: { x: 119.02113, y: 93.81966 } },{ point: { x: 109.51057, y: 103.09017 } },{ point: { x: 111.75571, y: 116.18034 } },{ point: { x: 100, y: 110 } },{ point: { x: 88.24429, y: 116.18034 } },{ point: { x: 90.48943, y: 103.09017 } },{ point: { x: 80.97887, y: 93.81966 } },{ point: { x: 94.12215, y: 91.90983 } }'
    )
  })

  test('Path.star({ center: center, points: points, radius1: radius1, radius2: radius2 })', () => {
    let path = Path.star({
      center: new Point(100, 100),
      points: 10,
      radius1: 10,
      radius2: 20
    })
    equals(
      path.segments.toString(),
      '{ point: { x: 100, y: 90 } },{ point: { x: 106.18034, y: 80.97887 } },{ point: { x: 105.87785, y: 91.90983 } },{ point: { x: 116.18034, y: 88.24429 } },{ point: { x: 109.51057, y: 96.90983 } },{ point: { x: 120, y: 100 } },{ point: { x: 109.51057, y: 103.09017 } },{ point: { x: 116.18034, y: 111.75571 } },{ point: { x: 105.87785, y: 108.09017 } },{ point: { x: 106.18034, y: 119.02113 } },{ point: { x: 100, y: 110 } },{ point: { x: 93.81966, y: 119.02113 } },{ point: { x: 94.12215, y: 108.09017 } },{ point: { x: 83.81966, y: 111.75571 } },{ point: { x: 90.48943, y: 103.09017 } },{ point: { x: 80, y: 100 } },{ point: { x: 90.48943, y: 96.90983 } },{ point: { x: 83.81966, y: 88.24429 } },{ point: { x: 94.12215, y: 91.90983 } },{ point: { x: 93.81966, y: 80.97887 } }'
    )

    path = Path.star({
      center: new Point(100, 100),
      points: 5,
      radius1: 20,
      radius2: 10
    })
    equals(
      path.segments.toString(),
      '{ point: { x: 100, y: 80 } },{ point: { x: 105.87785, y: 91.90983 } },{ point: { x: 119.02113, y: 93.81966 } },{ point: { x: 109.51057, y: 103.09017 } },{ point: { x: 111.75571, y: 116.18034 } },{ point: { x: 100, y: 110 } },{ point: { x: 88.24429, y: 116.18034 } },{ point: { x: 90.48943, y: 103.09017 } },{ point: { x: 80.97887, y: 93.81966 } },{ point: { x: 94.12215, y: 91.90983 } }'
    )
  })

  test('Path.line(from, to)', () => {
    const path = Path.line([20, 20], [40, 40])
    equals(
      path.segments.toString(),
      '{ point: { x: 20, y: 20 } },{ point: { x: 40, y: 40 } }'
    )
  })

  test('Path.line({ from: from, to: to })', () => {
    const path = Path.line({
      from: [20, 20],
      to: [40, 40]
    })
    equals(
      path.segments.toString(),
      '{ point: { x: 20, y: 20 } },{ point: { x: 40, y: 40 } }'
    )
  })

  test('Path.line({ insert: false })', () => {
    const path = Path.line({
      from: [50, 50],
      to: [100, 100],
      insert: false
    })
    equals(() => typeof path.insert, 'function')
    equals(() => path.parent, null)
    equals(() => path.isInserted(), false)
  })

  test('Path.rectangle(rectangle, radius)', () => {
    const path = Path.rectangle([0, 0, 10, 20], 2)
    equals(path.bounds, new Rectangle(0, 0, 10, 20))
    equals(path.segments.length, 8)
  })

  test('Path.arc({ insert: false })', () => {
    let path = Path.arc({
      from: [0, 0],
      through: [5, 5],
      to: [10, 0],
      insert: false
    })
    equals(() => typeof path.insert, 'function')
    equals(() => path.isInserted(), false)
    paper.settings.insertItems = false
    path = Path.arc({
      from: [0, 0],
      through: [5, 5],
      to: [10, 0],
      insert: true
    })
    paper.settings.insertItems = true
    equals(() => path.isInserted(), true)
  })

  test('new Path.*({ project: project, parent: parent, insert: insert }) (#2012)', () => {
    const { project } = paper,
      project2 = new Project(),
      group = new Group()
    project.activate()
    const props = {
      Line: { from: [0, 0], to: [10, 10] },
      Circle: { center: [10, 10], radius: 10 },
      Ellipse: { point: [0, 0], size: [20, 10] },
      Rectangle: { point: [0, 0], size: [20, 10] },
      Arc: { from: [0, 0], through: [5, 5], to: [10, 0] },
      RegularPolygon: { center: [10, 10], sides: 6, radius: 10 },
      Star: { center: [10, 10], points: 5, radius1: 5, radius2: 10 }
    }
    // Each constructor should handle these just like new Path() does:
    ;[
      { project: project2 },
      { project: project2, insert: true },
      { project: project2, insert: false },
      { parent: group },
      { parent: group, insert: true },
      { parent: group, insert: false }
    ].forEach((options, index) => {
      const expected = new Path(options)
      for (const [name, values] of Object.entries(props)) {
        const path = new Path[name](Object.assign({}, values, options)),
          message = 'new Path.' + name + '() with options #' + index
        equals(
          path.project === expected.project,
          true,
          message + ': project'
        )
        equals(
          path.parent === expected.parent,
          true,
          message + ': parent'
        )
        equals(
          path.isInserted(),
          expected.isInserted(),
          message + ': isInserted()'
        )
      }
    })
    // The geometry is still defined before the other named arguments are set:
    equals(
      Path.rectangle({
        point: [0, 0],
        size: [20, 10],
        position: [100, 100],
        project: project2
      }).bounds,
      new Rectangle(90, 95, 20, 10)
    )
  })

  test('The deprecated constructors create the paths of the factories', () => {
    const path = new Path.Circle([50, 50], 25)
    equals(path instanceof Path, true)
    equals(path.pathData, Path.circle([50, 50], 25).pathData)
    equals(
      new Path.Star({ center: [50, 50], points: 5, radius1: 20, radius2: 40 })
        .pathData,
      Path.star({ center: [50, 50], points: 5, radius1: 20, radius2: 40 })
        .pathData
    )
  })
})
