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

import { describe, expect } from 'vitest'
import paper, {
  Base,
  Color,
  Layer,
  Path,
  PathItem,
  Point,
  Segment,
  Size
} from 'paper'
import { equals, ok, test } from '../helpers.js'

describe('Path', () => {
  test('Path#length', () => {
    const path = new Path([
      new Segment(
        [121, 334],
        [-19, 38],
        [30.7666015625, -61.53369140625]
      ),
      new Segment([248, 320], [-42, -74], [42, 74])
    ])

    equals(() => path.length, 172.10112809179614)

    equals(
      () => path.curves[0].getTimeAt(path.length / 4),
      0.2255849553116685
    )
  })

  test('Path#area', () => {
    const rect = new Path.Rectangle({
      point: [0, 0],
      size: [10, 10]
    })

    equals(() => rect.area, 100)

    const circle = new Path.Circle({
      center: [0, 0],
      radius: 10
    })

    equals(() => circle.area, Math.PI * 100, null, { tolerance: 0.1 })
  })

  test('Path#equals(path)', () => {
    const path1 = new Path({
      segments: [
        [1, 1],
        [2, 2],
        [3, 3]
      ]
    })

    const path2 = new Path({
      segments: [
        [1, 1],
        [2, 2],
        [3, 3]
      ]
    })

    equals(() => path1.equals(path2), true)

    path2.strokeWidth = path1.strokeWidth

    equals(() => path1.equals(path2), true)

    path1.strokeWidth = path2.strokeWidth

    equals(() => path1.equals(path2), true)

    path1.strokeWidth = path2.strokeWidth = 10

    equals(() => path1.equals(path2), true)
  })

  test('Path#join(path)', () => {
    let path1 = new Path()
    path1.add(0, 0)
    path1.add(10, 0)

    let path2 = new Path()
    path2.add(10, 0)
    path2.add(20, 10)

    path1.join(path2)
    equals(
      path1.segments.toString(),
      '{ point: { x: 0, y: 0 } },{ point: { x: 10, y: 0 } },{ point: { x: 20, y: 10 } }'
    )
    equals(() => paper.project.activeLayer.children.length, 1)

    path1 = new Path()
    path1.add(0, 0)
    path1.add(10, 0)

    path2 = new Path()
    path2.add(20, 10)
    path2.add(10, 0)
    path1.join(path2)
    equals(
      path1.segments.toString(),
      '{ point: { x: 0, y: 0 } },{ point: { x: 10, y: 0 } },{ point: { x: 20, y: 10 } }'
    )

    path1 = new Path()
    path1.add(0, 0)
    path1.add(10, 0)

    path2 = new Path()
    path2.add(30, 10)
    path2.add(40, 0)
    path1.join(path2)
    equals(
      path1.segments.toString(),
      '{ point: { x: 0, y: 0 } },{ point: { x: 10, y: 0 } },{ point: { x: 30, y: 10 } },{ point: { x: 40, y: 0 } }'
    )

    path1 = new Path()
    path1.add(0, 0)
    path1.add(10, 0)
    path1.add(20, 10)

    path2 = new Path()
    path2.add(0, 0)
    path2.add(10, 5)
    path2.add(20, 10)

    path1.join(path2)

    equals(
      path1.segments.toString(),
      '{ point: { x: 0, y: 0 } },{ point: { x: 10, y: 0 } },{ point: { x: 20, y: 10 } },{ point: { x: 10, y: 5 } }'
    )
    equals(() => path1.closed, true)
  })

  test('Path#join(path, tolerance)', () => {
    const path1 = new Path()
    path1.add(0, 0)
    path1.add(10, 0)

    const path2 = new Path()
    path2.add(path1.lastSegment.point.add(1e-14))
    path2.add(20, 10)

    equals(() => path1.clone().join(path2.clone(), 0).segments.length, 4)
    equals(
      () => path1.clone().join(path2.clone(), 1e-12).segments.length,
      3
    )
  })

  test('Path#remove()', () => {
    const path = new Path()
    path.add(0, 0)
    path.add(10, 0)
    path.add(20, 0)
    path.add(30, 0)

    path.removeSegment(0)
    equals(() => path.segments.length, 3)

    path.removeSegment(0)
    equals(() => path.segments.length, 2)

    path.removeSegments(0, 1)
    equals(() => path.segments.length, 1)

    path.remove()

    equals(() => paper.project.activeLayer.children.length, 0)
  })

  test('Path#removeSegments()', () => {
    const path = new Path()
    path.add(0, 0)
    path.add(10, 0)
    path.add(20, 0)
    path.add(30, 0)

    path.removeSegments()
    equals(() => path.segments.length, 0)
  })

  test('Path#removeSegments(from, to) with from > to (#1881)', () => {
    const points = [[0, 0], [10, 0], [20, 10], [20, 20], [10, 30], [0, 20]]

    function getPoints(segments) {
      return Base.each(
        segments,
        function (segment) {
          this.push(segment.point.toString())
        },
        []
      )
    }

    function getExpected(indices) {
      return indices.map(index => new Point(points[index]).toString())
    }

    // On closed paths, it wraps around from the end to the beginning:
    let path = new Path({ segments: points, closed: true }),
      removed = path.removeSegments(4, 2)
    equals(getPoints(removed), getExpected([4, 5, 0, 1]), 'removed')
    equals(
      () =>
        removed.every(
          segment => segment.path === null && segment.index === null
        ),
      true
    )
    equals(
      path,
      new Path({
        segments: [points[2], points[3]],
        closed: true
      }),
      'path'
    )
    equals(path.curves.length, 2, 'path.curves.length')
    equals(path.lastCurve.segment2, path.firstSegment, 'closing curve')

    // With to = 0, only the end is removed:
    path = new Path({ segments: points, closed: true })
    removed = path.removeSegments(4, 0)
    equals(getPoints(removed), getExpected([4, 5]), 'to = 0: removed')
    equals(
      getPoints(path.segments),
      getExpected([0, 1, 2, 3]),
      'to = 0: path.segments'
    )

    // On open paths, nothing is removed:
    path = new Path({ segments: points })
    equals(path.removeSegments(4, 2).length, 0, 'open: removed')
    equals(path.segments.length, 6, 'open: path.segments.length')
  })

  test('Is the path deselected after setting a new list of segments?', () => {
    const path = new Path([0, 0])
    path.selected = true
    equals(() => path.selected, true)
    equals(() => paper.project.selectedItems.length, 1)

    path.segments = [[0, 10]]
    equals(() => path.selected, true)
    equals(() => paper.project.selectedItems.length, 1)
  })

  test('Setting Path#fullySelected=true on an empty path should only set path#selected=true', () => {
    const path = new Path()
    path.fullySelected = true
    equals(() => path.fullySelected, false)
    equals(() => path.selected, true)
  })

  test('After removing all segments of a fully selected path, it should still be selected.', () => {
    const path = new Path([10, 20], [30, 40])
    path.fullySelected = true
    equals(() => path.fullySelected, true)
    path.removeSegments()
    equals(() => path.fullySelected, false)
    equals(() => path.selected, true)
  })

  test('After removing all segments of a selected path, it should still be selected.', () => {
    const path = new Path([10, 20], [30, 40])
    path.selected = true
    path.removeSegments()
    equals(() => path.selected, true)
  })

  test('After simplifying a path using #simplify(), the path should stay fullySelected', () => {
    const path = new Path()
    for (let i = 0; i < 30; i++) {
      path.add(i * 10, 10)
    }
    path.fullySelected = true
    equals(() => path.selected, true)

    path.simplify()

    equals(() => path.selected, true)

    equals(() => path.fullySelected, true)
  })

  test('After cloning a selected item, it should be added to the Project#selectedItems array', () => {
    const path = new Path.Circle(new Size(80, 50), 35)
    path.selected = true
    path.clone()

    equals(() => paper.project.selectedItems.length, 2)
  })

  test('After simplifying a path using #simplify(), the path should stay selected', () => {
    const path = new Path()
    for (let i = 0; i < 30; i++) {
      path.add(i * 10, i % 2 ? 20 : 40)
    }
    path.selected = true
    path.simplify()
    equals(() => path.selected, true)
  })

  test('After smoothing a path using #smooth(), the path should stay fullySelected', () => {
    const path = new Path()
    for (let i = 0; i < 30; i++) {
      path.add(i * 10, i % 2 ? 20 : 40)
    }
    path.fullySelected = true
    path.smooth()
    equals(() => path.fullySelected, true)
  })

  test('After smoothing a path using #smooth(), the path should stay selected', () => {
    const path = new Path()
    for (let i = 0; i < 30; i++) {
      path.add(i * 10, i % 2 ? 20 : 40)
    }
    path.selected = true
    path.smooth()
    equals(() => path.selected, true)
  })

  test('After selecting a segment, Path#selected should return true', () => {
    const path = new Path()
    path.add([10, 10])
    path.firstSegment.selected = true
    equals(() => path.selected, true)
  })

  test('Path#reverse()', () => {
    const path = new Path.Circle([100, 100], 30)
    path.reverse()
    equals(
      path.segments.toString(),
      '{ point: { x: 100, y: 130 }, handleIn: { x: -16.56854, y: 0 }, handleOut: { x: 16.56854, y: 0 } },{ point: { x: 130, y: 100 }, handleIn: { x: 0, y: 16.56854 }, handleOut: { x: 0, y: -16.56854 } },{ point: { x: 100, y: 70 }, handleIn: { x: 16.56854, y: 0 }, handleOut: { x: -16.56854, y: 0 } },{ point: { x: 70, y: 100 }, handleIn: { x: 0, y: -16.56854 }, handleOut: { x: 0, y: 16.56854 } }'
    )
  })

  test('Path#reverse() should adjust segment indices', () => {
    const path = new Path([[0, 0], [10, 10], [20, 20]])
    path.reverse()
    equals(path.segments[0].index, 0)
    equals(path.segments[1].index, 1)
    equals(path.segments[2].index, 2)
  })

  test('Path#fullySelected', () => {
    const path = new Path.Circle([100, 100], 10)
    path.fullySelected = true
    path.segments[1].selected = false
    equals(() => path.fullySelected, false)
  })

  test('Simplifying a path with three segments of the same position should not throw an error', () => {
    const path = new Path([20, 20], [20, 20], [20, 20])
    path.simplify()
    equals(() => path.segments.length, 1)
  })

  test('Path#interpolate(from, to, factor)', () => {
    const path = new Path(),
      path0 = new Path.Circle({
        center: [0, 0],
        radius: 10
      }),
      path1 = new Path.Ellipse({
        center: [10, 20],
        radius: [20, 10]
      }),
      halfway = new Path.Ellipse({
        center: [5, 10],
        radius: [15, 10]
      })

    path.interpolate(path0, path1, 0)
    equals(path, path0)

    path.interpolate(path0, path1, 1)
    equals(path, path1)

    path.interpolate(path0, path1, 0.5)
    equals(path, halfway)
  })

  //////////////////////////////////////////////////////////////////////////////
  // Path Curves

  test('Path#curves synchronisation', () => {
    let path = new Path()

    path.add(new Point(100, 100))
    equals(
      path.segments.toString(),
      '{ point: { x: 100, y: 100 } }',
      'path.segments: path.add(new Point(100, 100));'
    )
    equals(
      path.curves.toString(),
      '',
      'path.curves: path.add(new Point(100, 100));'
    )
    path.insert(0, new Point(0, 100))
    equals(
      path.segments.toString(),
      '{ point: { x: 0, y: 100 } },{ point: { x: 100, y: 100 } }',
      'path.segments: path.insert(0, new Point(0, 100));'
    )
    equals(
      path.curves.toString(),
      '{ point1: { x: 0, y: 100 }, point2: { x: 100, y: 100 } }',
      'path.curves: path.insert(0, new Point(0, 100));'
    )
    path.insert(1, {
      point: [50, 0],
      handleIn: [-25, 0],
      handleOut: [25, 0]
    })
    equals(
      path.segments.toString(),
      '{ point: { x: 0, y: 100 } },{ point: { x: 50, y: 0 }, handleIn: { x: -25, y: 0 }, handleOut: { x: 25, y: 0 } },{ point: { x: 100, y: 100 } }',
      'path.segments: path.insert(1, {point:[50, 0], handleIn:[-25, 0], handleOut:[25, 0]});'
    )
    equals(
      path.curves.toString(),
      '{ point1: { x: 0, y: 100 }, handle2: { x: -25, y: 0 }, point2: { x: 50, y: 0 } },{ point1: { x: 50, y: 0 }, handle1: { x: 25, y: 0 }, point2: { x: 100, y: 100 } }',
      'path.curves: path.insert(1, {point:[50, 0], handleIn:[-25, 0], handleOut:[25, 0]});'
    )
    path.closed = true
    equals(
      path.segments.toString(),
      '{ point: { x: 0, y: 100 } },{ point: { x: 50, y: 0 }, handleIn: { x: -25, y: 0 }, handleOut: { x: 25, y: 0 } },{ point: { x: 100, y: 100 } }',
      'path.segments: path.closed = true;'
    )
    equals(
      path.curves.toString(),
      '{ point1: { x: 0, y: 100 }, handle2: { x: -25, y: 0 }, point2: { x: 50, y: 0 } },{ point1: { x: 50, y: 0 }, handle1: { x: 25, y: 0 }, point2: { x: 100, y: 100 } },{ point1: { x: 100, y: 100 }, point2: { x: 0, y: 100 } }',
      'path.curves: path.closed = true;'
    )
    path.removeSegments(2, 3)
    equals(
      path.segments.toString(),
      '{ point: { x: 0, y: 100 } },{ point: { x: 50, y: 0 }, handleIn: { x: -25, y: 0 }, handleOut: { x: 25, y: 0 } }',
      'path.segments: path.removeSegments(2, 3);'
    )
    equals(
      path.curves.toString(),
      '{ point1: { x: 0, y: 100 }, handle2: { x: -25, y: 0 }, point2: { x: 50, y: 0 } },{ point1: { x: 50, y: 0 }, handle1: { x: 25, y: 0 }, point2: { x: 0, y: 100 } }',
      'path.curves: path.removeSegments(2, 3);'
    )
    path.add(new Point(100, 100))
    path.removeSegments(1, 2)
    equals(
      path.segments.toString(),
      '{ point: { x: 0, y: 100 } },{ point: { x: 100, y: 100 } }',
      'path.segments: path.add(new Point(100, 100));\npath.removeSegments(1, 2);'
    )
    equals(
      path.curves.toString(),
      '{ point1: { x: 0, y: 100 }, point2: { x: 100, y: 100 } },{ point1: { x: 100, y: 100 }, point2: { x: 0, y: 100 } }',
      'path.curves: path.add(new Point(100, 100));\npath.removeSegments(1, 2);'
    )

    // Transform the path, and the curves length should be invalidated. Force-
    // cache the first segment's length first, by accessing it:
    path.curves[0].length
    ok(path.curves[0]._length, 'Curve length does not appear to be cached')
    path.scale(2, [0, 0])
    equals(
      path.curves[0].length,
      200,
      'Curve length should be updated when path is transformed'
    )

    const points = []
    for (let i = 0; i < 40; i++) points.push(Point.random())
    path = new Path(points)
    equals(path.segments.length, 40, 'segments.length')
    equals(path.curves.length, 39, 'curves.length')
    path.removeSegments()
    equals(path.segments.length, 0, 'segments.length')
    equals(path.curves.length, 0, 'curves.length')
  })

  test('Path#curves on closed paths', () => {
    const path = new Path.Circle(new Point(100, 100), 100)
    equals(
      path.curves.toString(),
      '{ point1: { x: 0, y: 100 }, handle1: { x: 0, y: -55.22847 }, handle2: { x: -55.22847, y: 0 }, point2: { x: 100, y: 0 } },{ point1: { x: 100, y: 0 }, handle1: { x: 55.22847, y: 0 }, handle2: { x: 0, y: -55.22847 }, point2: { x: 200, y: 100 } },{ point1: { x: 200, y: 100 }, handle1: { x: 0, y: 55.22847 }, handle2: { x: 55.22847, y: 0 }, point2: { x: 100, y: 200 } },{ point1: { x: 100, y: 200 }, handle1: { x: -55.22847, y: 0 }, handle2: { x: 0, y: 55.22847 }, point2: { x: 0, y: 100 } }'
    )
    path.removeSegments(0, 1)
    equals(
      path.curves.toString(),
      '{ point1: { x: 100, y: 0 }, handle1: { x: 55.22847, y: 0 }, handle2: { x: 0, y: -55.22847 }, point2: { x: 200, y: 100 } },{ point1: { x: 200, y: 100 }, handle1: { x: 0, y: 55.22847 }, handle2: { x: 55.22847, y: 0 }, point2: { x: 100, y: 200 } },{ point1: { x: 100, y: 200 }, handle1: { x: -55.22847, y: 0 }, handle2: { x: -55.22847, y: 0 }, point2: { x: 100, y: 0 } }'
    )
  })

  test('Path#flatten(maxDistance)', () => {
    const path = new Path.Circle(new Size(80, 50), 35)

    // Convert its curves to points, with a flatness of 5:
    path.flatten(5)

    equals(
      () => path.segments.length,
      8,
      'Using a flatness of 10, we should end up with 8 segments.'
    )

    equals(
      () => path.lastSegment.point.equals(path.firstSegment.point),
      false,
      'The points of the last and first segments should not be the same.'
    )

    equals(
      () => (
        path.lastSegment.point.toString() !==
        path.lastSegment.previous.point.toString()
      ),
      true,
      'The points of the last and before last segments should not be so close, that calling toString on them returns the same string value.'
    )
  })

  test('Path#single segment closed path flatten (#1338)', () => {
    const p = PathItem.create(
      'm445.26701,223.69688c6.1738,8.7566 -7.05172,14.0468 0,0z'
    )
    p.strokeColor = 'red'
    p.flatten()
    expect.assertions(0)
  })

  test('Path#curves after removing a segment - 1', () => {
    const path = new paper.Path([0, 0], [1, 1], [2, 2])
    const prevCurves = path.curves.slice()

    equals(
      () => path.curves.length,
      2,
      'After creating a path with three segments, we should have two curves. By accessing path.curves we also make sure the curves are created internally.'
    )

    equals(
      () => path.segments[1].remove(),
      true,
      'Removing the paths second segment should be successful.'
    )

    equals(
      () => path.curves.length,
      1,
      'After removing the middle segment, we should be left with one curve.'
    )

    equals(
      () => path.curves[0] === prevCurves[0],
      true,
      'The remaining curve should be the same as in the previous state of the curves array.'
    )

    equals(
      () => path.curves[0].path === path,
      true,
      'The remaining curve should stay linked to the path.'
    )

    equals(
      () => prevCurves[1].path === null,
      true,
      'The removed curve should not stay linked to the path.'
    )
  })

  test('Path#curves after removing a segment - 2', () => {
    const path = new paper.Path([0, 0], [1, 1], [2, 2])

    equals(
      () => path.curves.length,
      2,
      'After creating a path with three segments, we should have two curves. By accessing path.curves we also make sure the curves are created internally.'
    )

    equals(
      () => path.lastSegment.remove(),
      true,
      'Removing the last segment should be successful.'
    )

    equals(
      () => path.curves.length,
      1,
      'After removing the last segment, we should be left with one curve.'
    )

    equals(
      () => path.lastSegment.remove(),
      true,
      'Removing last segment should be successful.'
    )

    equals(
      () => path.curves.length,
      0,
      'After removing the last segment, we should be left with no curves.'
    )

    equals(
      () => path.lastSegment.remove(),
      true,
      'Removing the final remaining segment should be successful.'
    )

    equals(
      () => path.curves.length,
      0,
      'After removing all segments, we should be left with no curves.'
    )

    path.addSegment([0, 0])
    path.addSegment([1, 1])

    equals(
      () => path.curves.length,
      1,
      'After adding two new segments, we should have one curve again.'
    )

    path.addSegment([2, 2])

    equals(
      () => path.curves.length,
      2,
      'After adding a new segment, we should have two curves again.'
    )

    equals(
      () => path.curves[1].segment1 === path.curves[0].segment2,
      true,
      `The newly created curve's first segment needs to be the same as the previous curve's second segment.`
    )

    path.addSegments([[3, 3], [4, 4]])

    equals(
      () => path.curves.length,
      4,
      'After adding two new segments at the end, we should have four curves now.'
    )
  })

  test('Splitting a straight path should produce segments without handles', () => {
    const path1 = new Path.Line([0, 0], [50, 50])
    const path2 = path1.splitAt(path1.length / 2)
    equals(
      () => (
        !path1.lastSegment.hasHandles() &&
        !path2.firstSegment.hasHandles()
      ),
      true
    )
  })

  test('Splitting a path with one curve in the middle result in two paths of the same length with one curve each', () => {
    const path1 = new Path.Line([0, 0], [100, 100])
    const loc = path1.getLocationAt(path1.length / 2)
    const path2 = path1.splitAt(loc)
    equals(() => path1.curves.length, 1)
    equals(() => path2.curves.length, 1)
    equals(() => path1.length === path2.length, true)
  })

  test('Path#splitAt() with locations on other paths (#2021)', () => {
    const path = new Path([0, 0], [100, 0], [100, 100]),
      segments = path.segments.toString()

    function testSplitAt(location, message) {
      equals(path.splitAt(location), null, message)
      equals(
        path.segments.toString(),
        segments,
        'The path should keep its segments.'
      )
    }

    testSplitAt(
      path.clone().getLocationAt(50),
      'A location on a clone should not split the path.'
    )
    testSplitAt(
      path.firstCurve.clone().getLocationAtTime(0.5),
      'A location on a cloned curve should not split the path.'
    )
    testSplitAt(
      path.length + 1,
      'An offset beyond the length should not split the path.'
    )

    const path2 = path.splitAt(path.getLocationAt(50))
    equals(
      path.segments.toString(),
      '{ point: { x: 0, y: 0 } },{ point: { x: 50, y: 0 } }'
    )
    equals(
      path2.segments.toString(),
      '{ point: { x: 50, y: 0 } },{ point: { x: 100, y: 0 } },' +
      '{ point: { x: 100, y: 100 } }'
    )
  })

  //////////////////////////////////////////////////////////////////////////////
  // Path Drawing Commands

  test('Path#lineTo(point);', () => {
    const path = new Path()
    path.moveTo([50, 50])
    path.lineTo([100, 100])
    equals(
      path.segments.toString(),
      '{ point: { x: 50, y: 50 } },{ point: { x: 100, y: 100 } }'
    )
  })

  test('Path#arcTo(from, through, to);', () => {
    const path = new Path()
    path.moveTo([0, 20])
    path.arcTo([75, 75], [100, 0])
    equals(
      path.segments.toString(),
      '{ point: { x: 0, y: 20 }, handleOut: { x: -2.62559, y: 23.01251 } },{ point: { x: 30.89325, y: 74.75812 }, handleIn: { x: -21.05455, y: -9.65273 }, handleOut: { x: 21.05455, y: 9.65273 } },{ point: { x: 92.54397, y: 62.42797 }, handleIn: { x: -15.72238, y: 17.00811 }, handleOut: { x: 15.72238, y: -17.00811 } },{ point: { x: 100, y: 0 }, handleIn: { x: 11.27458, y: 20.23247 } }'
    )
  })

  test('Path#arcTo(from, through, to); where from, through and to all share the same y position and through lies in between from and to', () => {
    const path = new Path()
    path.strokeColor = 'black'

    path.add([40, 75])
    path.arcTo([50, 75], [100, 75])
    equals(
      path.lastSegment.point.toString(),
      '{ x: 100, y: 75 }',
      'We expect the last segment point to be at the position where we wanted to draw the arc to.'
    )
  })

  test('Path#arcTo(from, through, to); where from, through and to all share the same y position and through lies to the right of to', () => {
    const path = new Path()
    path.strokeColor = 'black'

    path.add([40, 75])
    let error = null
    try {
      path.arcTo([150, 75], [100, 75])
    } catch (e) {
      error = e
    }
    equals(
      error != null,
      true,
      'We expect this arcTo() command to throw an error'
    )
  })

  test('Path#arcTo(from, through, to); where from, through and to all share the same y position and through lies to the left of to', () => {
    const path = new Path()
    path.strokeColor = 'black'

    path.add([40, 75])
    let error = null
    try {
      path.arcTo([10, 75], [100, 75])
    } catch (e) {
      error = e
    }
    equals(
      error != null,
      true,
      'We expect this arcTo() command to throw an error'
    )
  })

  test('Path#getOffsetsWithTangent()', () => {
    const path = new Path.Circle(new Point(0, 0), 50)
    const length = path.length
    equals(
      path.getOffsetsWithTangent(),
      [],
      'should return empty array when called without argument'
    )
    equals(
      path.getOffsetsWithTangent([1, 0]),
      [0.25 * length, 0.75 * length],
      'should not return duplicates when tangent is at segment point'
    )
    equals(
      path.getOffsetsWithTangent([1, 1]).length,
      2,
      'should return 2 values when called on a circle with a diagonal vector'
    )
  })

  test('Path#add() with a lot of segments (#1493)', () => {
    const segments = []
    for (let i = 0; i < 100000; i++) {
      segments.push(new Point(0, 0))
    }
    const path = new Path(segments)
    path.clone()
    expect.assertions(0)
  })

  test('Path#arcTo(through, to) is on through point side (#1477)', () => {
    const p1 = new Point(16, 21.5)
    const p2 = new Point(22.5, 15)
    const p3 = new Point(16.000000000000004, 8.5)
    const path = new Path()
    path.add(p1)
    path.arcTo(p2, p3)
    equals(true, path.segments[1].point.x > p1.x)
  })

  test('Path#arcTo(to, radius, rotation, clockwise, large) when from and to are equal (#1613)', () => {
    const point = new Point(10, 10)
    const path = new Path()
    path.moveTo(point)
    path.arcTo(point, new Size(10), 0, true, true)
    expect.assertions(0)
  })

  test('Path#closed with blend mode', () => {
    new Path({
      strokeColor: 'black',
      blendMode: 'negation',
      closed: true
    })
    paper.view.update()
    expect.assertions(0)
  })

  test('Path#dashArray and #dashOffset draw dashes', () => {
    const layer = new Layer(),
      path = new Path({
        segments: [[0, 5], [40, 5]],
        strokeColor: 'red',
        strokeWidth: 10,
        dashArray: [10, 5]
      }),
      red = new Color(1, 0, 0, 1),
      none = new Color(0, 0, 0, 0)

    function testPixels(pixels, message) {
      const raster = layer.rasterize(72, false)
      for (const x in pixels) {
        equals(
          raster.getPixel(+x, 5),
          pixels[x] ? red : none,
          message + ', pixel at x = ' + x
        )
      }
    }

    // Dashes from 0 to 10, 15 to 25 and 30 to 40:
    testPixels({ 2: 1, 12: 0, 17: 1, 27: 0, 37: 1 }, 'dashArray')
    path.dashOffset = 5
    // Dashes from 0 to 5, 10 to 20 and 25 to 35:
    testPixels({ 2: 1, 7: 0, 17: 1, 22: 0, 37: 0 }, 'dashOffset')
  })
})
