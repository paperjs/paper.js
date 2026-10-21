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
  Group,
  Item,
  Layer,
  Path,
  PointText,
  Raster,
  Rectangle,
  Shape,
  Size
} from 'paper'
import { equals, test } from '../helpers.js'

describe('Getting and Matching Items', () => {
  test('Item#getItems()', () => {
    const group = new Group([new Path({ selected: true }), new Raster()])
    equals(
      () =>
        group.getItems({
          type: 'path'
        }).length,
      1
    )

    equals(
      () =>
        group.getItems({
          selected: true
        }).length,
      1
    )
  })

  test('Item#matches()', () => {
    const path = new Path()
    equals(
      () =>
        path.matches({
          visible: false
        }),
      false
    )

    equals(
      () =>
        path.matches({
          visible: true
        }),
      true
    )
  })

  test('Project#getItems()', () => {
    const layer = new Layer()

    let matches = paper.project.getItems({
      class: Layer
    })
    equals(() => matches.length === 1 && matches[0] === layer, true)

    matches = paper.project.getItems({
      class: Item
    })
    equals(() => matches.length === 1 && matches[0] === layer, true)

    const path = new Path()
    matches = paper.project.getItems({
      class: Path
    })
    equals(() => matches.length === 1 && matches[0] === path, true)

    const group = new Group()
    matches = paper.project.getItems({
      className: 'Group'
    })
    equals(() => matches.length === 1 && matches[0] === group, true)

    matches = paper.project.getItems({
      type: 'group'
    })
    equals(() => matches.length === 1 && matches[0] === group, true)

    const raster = new Raster()
    matches = paper.project.getItems({
      class: Raster
    })
    equals(() => matches.length === 1 && matches[0] === raster, true)

    equals(
      () =>
        paper.project.getItems({
          selected: true
        }).length,
      0
    )

    raster.selected = true
    equals(
      () =>
        paper.project.getItems({
          selected: true
        }).length,
      2
    )

    raster.selected = true
    equals(
      () =>
        paper.project.getItems({
          selected: true,
          class: Raster
        }).length,
      1
    )
  })

  test('Project#getItems() with compare function', () => {
    new Path()
    const path = new Path({
      opacity: 0.5
    })

    const items = paper.project.getItems({
      opacity(value) {
        return value < 1
      }
    })
    equals(() => items.length === 1 && items[0] === path, true)
  })

  test('Project#getItems() with a match function', () => {
    const path = new Path(),
      group = new Group([new Path.Circle([50, 50], 10)]),
      circle = group.firstChild

    function isPath(item) {
      return item instanceof Path
    }

    // Functions match recursively, as the match option does:
    let items = paper.project.getItems(isPath)
    equals(
      () => items.length === 2 && items[0] === path && items[1] === circle,
      true
    )
    equals(() => paper.project.getItems({ match: isPath }).length, 2)
    items = paper.project.activeLayer.getItems(isPath)
    equals(
      () => items.length === 2 && items[0] === path && items[1] === circle,
      true
    )
    equals(() => paper.project.getItem(isPath) === path, true)
    // Without options, all items match: the layer, path, group and circle.
    equals(() => paper.project.getItems().length, 4)
  })

  test('Project#getItems() with specific property value', () => {
    const path = new Path()
    new Path({
      opacity: 0.5
    })

    const items = paper.project.getItems({
      opacity: 1,
      type: 'path'
    })
    equals(() => items.length === 1 && items[0] === path, true)
  })

  test('Project#getItems() with color', () => {
    const path = new Path({
      fillColor: 'red'
    })

    new Path({
      fillColor: 'black'
    })

    const items = paper.project.getItems({
      fillColor: 'red',
      type: 'path'
    })
    equals(() => items.length === 1 && items[0] === path, true)
  })

  test('Project#getItems() with regex function', () => {
    paper.project.activeLayer
    new Path({
      name: 'stop'
    })

    new Path({
      name: 'pause'
    })

    const startPath = new Path({
      name: 'starting'
    })

    const items = paper.project.getItems({
      name: /^start/g
    })

    // console.log(paper.project.activeLayer);
    equals(() => items.length === 1 && items[0] === startPath, true)

    equals(() => {
      const items = paper.project.getItems({
        name: /^st/g
      })
      return items.length === 2
    }, true)
  })

  test('Project#getItems() empty: true', () => {
    const layer = new Layer()
    new Path()
    new Path()

    equals(() => layer.children.length, 2)

    equals(
      () =>
        paper.project.getItems({
          empty: true
        }).length,
      2
    )
  })

  test('Project#getItems() overlapping', () => {
    const path = new Path.Circle({
      radius: 100,
      center: [200, 200],
      fillColor: 'red'
    })

    equals(() => {
      const matches = paper.project.getItems({
        class: Path,
        overlapping: [0, 0, 400, 400]
      })
      return matches.length === 1 && matches[0] === path
    }, true)

    equals(() => {
      const matches = paper.project.getItems({
        class: Path,
        overlapping: [200, 0, 400, 400]
      })
      return matches.length === 1 && matches[0] === path
    }, true)

    equals(() => {
      const matches = paper.project.getItems({
        class: Path,
        overlapping: [400, 0, 400, 400]
      })
      return matches.length === 0
    }, true)
  })

  test('Project#getItems() inside', () => {
    const path = new Path.Circle({
      radius: 100,
      center: [200, 200],
      fillColor: 'red'
    })

    equals(() => {
      const matches = paper.project.getItems({
        class: Path,
        inside: [0, 0, 400, 400]
      })
      return matches.length === 1 && matches[0] === path
    }, true)

    equals(() => {
      const matches = paper.project.getItems({
        class: Path,
        inside: [200, 0, 400, 400]
      })
      return matches.length === 0
    }, true)
  })

  test('Project#getItems() overlapping with a hole (#1751)', () => {
    const ring = new CompoundPath({
      children: [
        new Path.Circle([100, 100], 50),
        new Path.Circle([100, 100], 30)
      ],
      fillRule: 'evenodd'
    })
    function isFound(rect) {
      return (
        paper.project.getItems({
          class: CompoundPath,
          overlapping: rect
        }).length === 1
      )
    }
    // The ring's bounds contain these rectangles, but only the second one
    // overlaps the ring itself:
    equals(isFound(new Rectangle(95, 95, 10, 10)), false, 'in the hole')
    equals(isFound(new Rectangle(95, 55, 10, 10)), true, 'in the band')
    ring.remove()
  })

  test('Project#getItems() overlapping and inside with Shape, Raster and PointText (#1300)', () => {
    // The reported case:
    const shape = new Shape.Rectangle({
      point: [20, 20],
      size: [10, 10],
      fillColor: 'pink'
    })
    equals(() => {
      const matches = paper.project.getItems({
        class: Shape,
        overlapping: [0, 0, 21, 21]
      })
      return matches.length === 1 && matches[0] === shape
    }, true)
    shape.remove()

    // Each item is tested along with a path of the same geometry, which needs
    // to give the same results. `edge` names a point on the item's outline in
    // its internal bounds, `isCornerFilled` whether the item fills their
    // corners.
    const entries = [
      {
        create() {
          return new Shape.Rectangle({
            center: [0, 0],
            size: [100, 50]
          })
        },
        edge: 'topLeft',
        isCornerFilled: true
      },
      {
        create() {
          return new Shape.Circle({ center: [0, 0], radius: 50 })
        },
        createPath() {
          return new Path.Circle({ center: [0, 0], radius: 50 })
        },
        edge: 'leftCenter',
        isCornerFilled: false
      },
      {
        create() {
          return new Raster({ size: [100, 50] })
        },
        edge: 'topLeft',
        isCornerFilled: true
      },
      {
        create() {
          return new PointText({ content: 'Hello', fontSize: 40 })
        },
        edge: 'topLeft',
        isCornerFilled: true
      }
    ]

    const transforms = {
      'untransformed'() {},
      'translated'(item) {
        item.translate(200, 100)
      },
      'rotated'(item) {
        item.rotate(45, [0, 0])
        item.translate(200, 100)
      },
      'in transformed group'(item) {
        item.translate(30, 20)
        const group = new Group({
          applyMatrix: false,
          children: [item]
        })
        group.scale(2, [0, 0])
        group.rotate(30, [0, 0])
        group.translate(200, 100)
      }
    }

    function isFound(item, option, rect) {
      const options = {
        match(match) {
          return match === item
        }
      }
      options[option] = rect
      return paper.project.getItems(options).length === 1
    }

    entries.forEach(entry => {
      Base.each(transforms, (transform, name) => {
        const item = entry.create(),
          rect = item.internalBounds,
          path = entry.createPath
            ? entry.createPath()
            : new Path.Rectangle(rect),
          isRotated = (
            name === 'rotated' ||
            name === 'in transformed group'
          )
        transform(item)
        // Place the path the same way as the item:
        item.parent.addChild(path)
        path.transform(item.matrix)
        // The global bounding box of the item's internal bounds:
        const bounds = new Rectangle(
            item.localToGlobal(rect.topLeft),
            item.localToGlobal(rect.bottomRight)
          )
            .include(item.localToGlobal(rect.topRight))
            .include(item.localToGlobal(rect.bottomLeft)),
          edge = item.localToGlobal(rect[entry.edge]),
          // Each case: rect, overlapping, inside
          cases = {
            // Partially overlapping across the outline:
            edge: [
              new Rectangle(edge.subtract(5), new Size(10, 10)),
              true,
              false
            ],
            // Across the corner of the bounding box, not fully inside
            // it, as that always counts as overlapping:
            corner: [
              new Rectangle(
                bounds.topLeft.subtract(3),
                new Size(6, 6)
              ),
              entry.isCornerFilled && !isRotated,
              false
            ],
            around: [bounds.expand(20), true, true],
            far: [
              new Rectangle(
                bounds.bottomRight.add(100),
                new Size(10, 10)
              ),
              false,
              false
            ]
          }
        Base.each(cases, (values, key) => {
          ;[item, path].forEach(target => {
            const message = (
              (item.type || item.className) +
              (target === path ? ' path ' : ' ') +
              name +
              ', ' +
              key
            )
            equals(
              isFound(target, 'overlapping', values[0]),
              values[1],
              message + ', overlapping'
            )
            equals(
              isFound(target, 'inside', values[0]),
              values[2],
              message + ', inside'
            )
          })
        })
        paper.project.activeLayer.removeChildren()
      })
    })
  })
})
