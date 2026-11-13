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
import paper, {
  CompoundPath,
  Path,
  Project,
  Rectangle,
  StrokeProfileStop
} from 'paper'
import { equals, test } from '../helpers.js'

describe('StrokeProfile', () => {
  // A straight path from 0 to 200 along x, with a stroke of width 10 that
  // tapers from half of it to twice of it, in a straight line:
  function createTaper(segments = [[0, 0], [200, 0]]) {
    return new Path({
      segments,
      strokeWidth: 10,
      strokeProfile: [
        { offset: 0, width: 0.5, smooth: false },
        { offset: 200, width: 2, smooth: false }
      ]
    })
  }

  function getOffsets(path) {
    return path.strokeProfile.map(stop => stop.offset)
  }

  // The absolute widths of the pen at the offsets:
  function getWidths(path, offsets) {
    return offsets.map(
      offset => path.getStrokeProfileAt(offset).width * path.strokeWidth
    )
  }

  test('Path#getStrokeProfileAt()', () => {
    const path = createTaper()
    equals(path.strokeProfile[0] instanceof StrokeProfileStop, true)
    equals(path.strokeProfile[0].path === path, true)
    equals(getOffsets(path), [0, 200])
    equals(getWidths(path, [0, 100, 200]), [5, 12.5, 20])
    // Beyond the ends, the widths stay as at the first and last stops:
    equals(getWidths(path, [-10, 250]), [5, 20])
    path.strokeProfile = null
    const stop = path.getStrokeProfileAt(100)
    equals(stop instanceof StrokeProfileStop, true)
    equals(stop.path, null, 'not on the path')
    equals(stop.offset, 100)
    equals(
      [stop.width, stop.aspect, stop.angle],
      [1, 1, 0],
      'a round pen of the stroke width without one'
    )
  })

  test('Each value changes between the stops that set it', () => {
    const path = createTaper()
    path.strokeProfile = [
      { offset: 0, width: 1, angle: 0, smooth: false },
      { offset: 50, aspect: 0.2, smooth: false },
      { offset: 100, angle: 90, smooth: false },
      { offset: 200, width: 2, aspect: 0.6, angle: 450, smooth: false }
    ]
    const stop = path.getStrokeProfileAt(150)
    equals(stop.width, 1.75)
    equals(stop.aspect, 0.2 + 0.4 * 100 / 150)
    // Angles aren't wrapped, so the pen turns a whole turn more:
    equals(stop.angle, 270)
    equals(path.getStrokeProfileAt(25).aspect, 0.2, 'beyond the first')
  })

  test('Changing a stop leaves the stops that set the value as they are', () => {
    const path = createTaper()
    path.strokeProfile = [
      { offset: 0, angle: 0 },
      { offset: 100, width: 2 },
      { offset: 200, angle: 0 }
    ]
    path.strokeProfile[0].angle = 90
    equals(path.strokeProfile[2].angle, 0)
    equals(path.getStrokeProfileAt(200).angle, 0)
    // The stop between them doesn't set an angle, so it follows them:
    equals(path.strokeProfile[1].angle, null)
    equals(path.getStrokeProfileAt(100).angle, 45)
  })

  test('Adding the pen at an offset leaves the profile as it is', () => {
    const path = createTaper()
    // In straight lines, which a stop in between that isn't smooth
    // continues:
    path.strokeProfile = [
      { offset: 0, width: 1, smooth: false },
      { offset: 200, width: 2, angle: 45, smooth: false }
    ]
    const offsets = [0, 60, 120, 180],
      before = offsets.map(offset => path.getStrokeProfileAt(offset))
    const stop = path.getStrokeProfileAt(100)
    stop.smooth = false
    path.strokeProfile = path.strokeProfile.concat(stop)
    equals(path.strokeProfile.length, 3)
    offsets.forEach((offset, i) => {
      const stop = path.getStrokeProfileAt(offset)
      equals(
        [stop.width, stop.aspect, stop.angle],
        [before[i].width, before[i].aspect, before[i].angle]
      )
    })
  })

  test('Smooth stops ease in and out', () => {
    const path = createTaper()
    path.strokeProfile = [
      { offset: 0, width: 0.5 },
      { offset: 200, width: 2 }
    ]
    // Two stops ease from one to the other, flat at both:
    equals(
      path.getStrokeProfileAt(50).width,
      0.5 + 1.5 * (3 * 0.25 ** 2 - 2 * 0.25 ** 3)
    )
    equals(path.getStrokeProfileAt(100).width, 1.25)
    // A stop in between makes a steady change pause there, so that it only
    // shapes the values up to the stops on either side:
    path.strokeProfile = [
      { offset: 0, width: 1 },
      { offset: 100, width: 2 },
      { offset: 200, width: 3 }
    ]
    // The slopes before and after an offset:
    const getSlopes = offset => {
      const width = path.getStrokeProfileAt(offset).width
      return [
        (width - path.getStrokeProfileAt(offset - 0.001).width) / 0.001,
        (path.getStrokeProfileAt(offset + 0.001).width - width) / 0.001
      ]
    }
    equals(getSlopes(100), [0, 0], null, { tolerance: 1e-4 })
    // Without smoothing, it changes in straight lines on both sides:
    path.strokeProfile = [
      { offset: 0, width: 1, smooth: false },
      { offset: 100, width: 2, smooth: false },
      { offset: 200, width: 4, smooth: false }
    ]
    equals(getSlopes(100), [0.01, 0.02], null, { tolerance: 1e-4 })
    path.strokeProfile[1].smooth = true
    const [before, after] = getSlopes(100)
    equals(before, after, null, { tolerance: 1e-4 })
  })

  test('Smooth stops keep peaks and plateaus where they are', () => {
    const path = createTaper()
    path.strokeProfile = [
      { offset: 0, width: 1 },
      { offset: 60, width: 1 },
      { offset: 100, width: 3 },
      { offset: 200, width: 0.5 }
    ]
    const widths = []
    for (let offset = 0; offset <= 200; offset += 2) {
      widths.push(path.getStrokeProfileAt(offset).width)
    }
    equals(Math.max(...widths), 3, 'the peak at its stop')
    equals(Math.min(...widths), 0.5, 'no overshoot')
    equals(path.getStrokeProfileAt(30).width, 1, 'flat between equal stops')
  })

  test('Smooth stops survive clones and JSON', () => {
    const path = createTaper()
    path.strokeProfile[0].smooth = true
    equals(path.strokeProfile[1].smooth, false)
    equals(
      path.clone().strokeProfile.map(stop => stop.smooth),
      [true, false]
    )
    const json = path.exportJSON()
    equals(json.includes('"smooth":false'), true)
    const copy = new Project().importJSON(json)
    equals(
      copy.strokeProfile.map(stop => stop.smooth),
      [true, false]
    )
  })

  test('Two stops at the same offset make a step', () => {
    const path = createTaper()
    path.strokeProfile = [
      { offset: 100, width: 1 },
      { offset: 100, width: 2 }
    ]
    equals(getWidths(path, [50, 100, 150]), [10, 20, 20])
  })

  test('Closed paths interpolate around their ends', () => {
    const path = Path.rectangle({
      point: [0, 0],
      size: [100, 100],
      strokeWidth: 10,
      strokeProfile: [
        { offset: 50, width: 1, smooth: false },
        { offset: 150, width: 3, smooth: false }
      ]
    })
    // From 150 at 3 around to 450 at 1:
    equals(getWidths(path, [350, 0]), [
      (3 - 2 * 200 / 300) * 10,
      (3 - 2 * 250 / 300) * 10
    ])
  })

  test('Stops stay between the same segments when they move', () => {
    const path = createTaper([[0, 0], [100, 0], [200, 0]])
    path.strokeProfile = [{ offset: 150, width: 1 }]
    path.segments[2].point.x = 300
    equals(getOffsets(path), [200], 'halfway along the curve')
    path.segments[0].point.x = -100
    equals(getOffsets(path), [300], 'after the longer curve')
  })

  test('Changing stops changes the profile', () => {
    const path = createTaper()
    const [first, last] = path.strokeProfile
    last.width = 3
    equals(getWidths(path, [200]), [30])
    first.offset = 150
    last.offset = 100
    equals(path.strokeProfile[0] === last, true, 'sorted again')
    equals(getOffsets(path), [100, 150])
    last.offset = 300
    equals(getOffsets(path), [150, 200], 'within the path')
  })

  test('Path#divideAt() keeps the stops where they are', () => {
    const path = createTaper()
    path.strokeProfile = [
      { offset: 0, width: 1 },
      { offset: 50, width: 2 },
      { offset: 150, width: 1 }
    ]
    path.divideAt(100)
    equals(getOffsets(path), [0, 50, 150])
    equals(getWidths(path, [25, 100]), [15, 15])
  })

  test('Inserting segments keeps the stops between the segments', () => {
    const path = createTaper([[0, 0], [100, 0], [200, 0]])
    path.strokeProfile = [
      { offset: 50, width: 1 },
      { offset: 150, width: 2 }
    ]
    path.insert(0, [-100, 0])
    equals(getOffsets(path), [150, 250], 'before the path')
    path.add([300, 0])
    equals(getOffsets(path), [150, 250], 'after the path')
    // The stop on the curve that the segment divides stays at its fraction
    // of the curves between the segments around it:
    path.insert(2, [50, 100])
    const curves = path.curves,
      length = curves[1].length + curves[2].length
    equals(
      path.strokeProfile[0].offset,
      curves[0].length + length / 2,
      'halfway between the segments'
    )
  })

  test('Removing segments keeps the stops between the segments', () => {
    const path = createTaper([[0, 0], [100, 0], [300, 0]])
    path.strokeProfile = [
      { offset: 50, width: 1 },
      { offset: 100, width: 2 },
      { offset: 200, width: 3 }
    ]
    path.removeSegment(1)
    equals(getOffsets(path), [50, 100, 200])
    equals(path.strokeProfile.length, 3)
    path.removeSegment(0)
    equals(path.strokeProfile, null, 'the ones beyond the ends go')
  })

  test('Removing the end segments lets go of the stops beyond', () => {
    const path = createTaper([[0, 0], [100, 0], [200, 0]])
    path.strokeProfile = [
      { offset: 50, width: 1 },
      { offset: 150, width: 2 }
    ]
    const [first, last] = path.strokeProfile
    path.removeSegment(2)
    equals(path.strokeProfile.length, 1)
    equals(path.strokeProfile[0] === first, true)
    equals(last.path, null)
    equals(last.offset, 150, 'keeping its offset')
    path.removeSegment(0)
    equals(path.strokeProfile, null)
  })

  test('Path#reverse() reverses the stops', () => {
    const path = createTaper([[0, 0], [100, 0], [200, 0]])
    path.reverse()
    equals(getOffsets(path), [0, 200])
    equals(getWidths(path, [0, 50, 200]), [20, 16.25, 5])
    const rectangle = Path.rectangle({
      point: [0, 0],
      size: [100, 100],
      strokeProfile: [
        { offset: 50, width: 1, smooth: false },
        { offset: 150, width: 3, smooth: false }
      ]
    })
    rectangle.reverse()
    equals(getOffsets(rectangle), [150, 250])
    equals(rectangle.strokeProfile[0].width, 3)
  })

  test('Path#splitAt() gives both parts their widths at the cut', () => {
    const path = createTaper([[0, 0], [100, 0], [200, 0]])
    const part = path.splitAt(150)
    equals(getWidths(path, [0, 75, 150]), [5, 10.625, 16.25])
    equals(getWidths(part, [0, 50]), [16.25, 20])
    const rectangle = Path.rectangle({
      point: [0, 0],
      size: [100, 100],
      strokeWidth: 10,
      strokeProfile: [
        { offset: 50, width: 1, smooth: false },
        { offset: 150, width: 3, smooth: false }
      ]
    })
    const offsets = [0, 100, 200, 300, 399],
      widths = getWidths(rectangle, offsets)
    rectangle.splitAt(100)
    equals(
      getWidths(
        rectangle,
        offsets.map(offset => (offset + 300) % 400)
      ),
      widths,
      'a closed path, opened at the cut'
    )
  })

  test('Path#join() keeps the widths of both paths', () => {
    const path = createTaper([[0, 0], [100, 0]])
    path.strokeProfile = [
      { offset: 0, width: 1 },
      { offset: 100, width: 2 }
    ]
    const other = new Path([
      [200, 0],
      [100, 0]
    ])
    path.join(other)
    equals(path.segments.length, 3)
    equals(getWidths(path, [50, 100, 150, 200]), [15, 10, 10, 10])
    equals(getOffsets(path), [0, 100, 100])
    const prepended = createTaper([[100, 0], [200, 0]])
    prepended.strokeProfile = [{ offset: 0, width: 2 }]
    prepended.join(new Path([[0, 0], [100, 0]]))
    equals(getWidths(prepended, [0, 50, 100, 200]), [10, 10, 20, 20])
    // With a gap between them, which the width crosses linearly:
    const apart = createTaper([[0, 0], [100, 0]])
    apart.strokeProfile = [{ offset: 0, width: 2 }]
    apart.join(new Path([[200, 0], [300, 0]]))
    equals(getWidths(apart, [50, 150, 250]), [20, 15, 10])
  })

  test('Path#join() keeps the default pen of paths without profiles', () => {
    const path = createTaper([
      [0, 0],
      [100, 0]
    ])
    path.strokeProfile = [{ offset: 0, aspect: 0.2, angle: 45 }]
    path.join(new Path([[100, 0], [200, 0]]))
    const [first, second] = [50, 150].map(offset =>
      path.getStrokeProfileAt(offset)
    )
    equals([first.aspect, first.angle], [0.2, 45])
    equals([second.aspect, second.angle], [1, 0])
  })

  test('Path#join() of the ends closes the profile around them', () => {
    const path = createTaper([[0, 0], [100, 0], [100, 100], [0, 0]])
    path.strokeProfile = [
      { offset: 0, width: 1 },
      { offset: path.length, width: 2 }
    ]
    path.join()
    equals(path.closed, true)
    equals(getOffsets(path), [0, 0])
    equals(getWidths(path, [0]), [10], 'the width after the step')
  })

  test('Path#closed = false lets go of the stops on the closing curve', () => {
    const path = Path.rectangle({
      point: [0, 0],
      size: [100, 100],
      strokeProfile: [
        { offset: 50, width: 1 },
        { offset: 350, width: 3 }
      ]
    })
    path.closed = false
    equals(getOffsets(path), [50])
  })

  test('New segments keep the stops at their fractions of the length', () => {
    const path = createTaper([[0, 0], [100, 0], [200, 0]])
    path.segments = [
      [0, 0],
      [400, 0]
    ]
    equals(getOffsets(path), [0, 400])
  })

  test('JSON stores the stops with their indices', () => {
    const path = createTaper([[0, 0], [100, 0], [300, 0]])
    path.strokeProfile = [{ offset: 150, width: 2 }]
    const json = path.exportJSON({ asString: false })
    equals(json[1].strokeProfile, [{ index: 1.25, width: 2 }])
    path.strokeProfile = [{ offset: 150, aspect: 0.5, angle: 30 }]
    equals(path.exportJSON({ asString: false })[1].strokeProfile, [
      { index: 1.25, aspect: 0.5, angle: 30 }
    ])
    path.strokeProfile = [{ offset: 150, width: 2 }]
    const copy = new Project().importJSON(json)
    equals(getOffsets(copy), [150])
    equals(copy.strokeProfile[0].width, 2)
    // Offsets take the segments that follow them in the description:
    const described = new Path({
      strokeProfile: [{ offset: 150, width: 2 }],
      segments: [
        [0, 0],
        [100, 0],
        [300, 0]
      ]
    })
    equals(getOffsets(described), [150])
  })

  test('Path#clone() copies the stops', () => {
    const path = createTaper()
    path.strokeProfile[1].aspect = 0.5
    path.strokeProfile[1].angle = 30
    const copy = path.clone()
    equals(copy.strokeProfile.length, 2)
    equals(copy.strokeProfile[1].aspect, 0.5)
    equals(copy.strokeProfile[1].angle, 30)
    equals(copy.strokeProfile[0] !== path.strokeProfile[0], true)
    equals(copy.strokeProfile[0].path === copy, true)
    equals(getOffsets(copy), [0, 200])
    equals(copy.compare(path), true)
  })

  test('Paths draw, bound and hit-test the outline of their profile', () => {
    const path = createTaper()
    path.strokeColor = 'black'
    // From 5 wide at the start to 20 at the end:
    equals(path.strokeBounds, new Rectangle(0, -10, 200, 20), null, {
      tolerance: 0.5
    })
    equals(path.previewBounds, path.strokeBounds)
    equals(path.outline({ insert: false }).bounds, path.strokeBounds)
    const isHit = point => !!path.hitTest(point, { stroke: true, tolerance: 0 })
    equals([isHit([190, 8]), isHit([10, 8])], [true, false])
    const raster = path.rasterize({ resolution: 72, insert: false })
    const getAlpha = point =>
      raster.getPixel(raster.globalToLocal(point).add(raster.size.divide(2)))
        .alpha
    equals([getAlpha([190, 8]), getAlpha([10, 8])], [1, 0])
    // Changing the profile changes all of them:
    path.strokeProfile[1].width = 1
    equals(path.strokeBounds.height, 10, null, { tolerance: 0.01 })
    equals(isHit([190, 8]), false)
    // Dashes too, and changing them changes the outline:
    path.dashArray = [20, 20]
    equals([isHit([10, 0]), isHit([30, 0])], [true, false])
    path.dashOffset = 20
    equals([isHit([10, 0]), isHit([30, 0])], [false, true])
  })

  test('Compound paths draw the profiles of their children as one', () => {
    // The taper, and a plain line from 0 to 200, 50 below it:
    const compound = new CompoundPath({
      strokeColor: 'black',
      strokeWidth: 10,
      children: [createTaper(), new Path([[0, 50], [200, 50]])]
    })
    const getSides = rectangle => [rectangle.top, rectangle.bottom]
    const isHit = point => !!compound.hitTest(point, { stroke: true })
    const options = { tolerance: 0.1 }
    equals(getSides(compound.strokeBounds), [-10, 55], null, options)
    equals(
      [isHit([190, 8]), isHit([10, 4]), isHit([100, 54])],
      [true, false, true]
    )
    // As the outline of all their strokes:
    const output = compound.getEffectOutput()
    equals(getSides(output.bounds), [-10, 55], null, options)
    equals(output.fillColor, compound.strokeColor)
    equals(output.hasStroke(), false)
    equals(compound.children[0].getEffectOutput(), null, 'not the children')
    equals(getSides(compound.clone().strokeBounds), [-10, 55], null, options)
    // In the compound path's style, and without profiles as before:
    compound.strokeWidth = 20
    equals(getSides(compound.strokeBounds), [-20, 60], null, options)
    compound.children[0].strokeProfile = null
    equals(compound.getEffectOutput(), null)
    equals(getSides(compound.strokeBounds), [-10, 60])
    compound.strokeWidth = 10
    equals(getSides(compound.strokeBounds), [-5, 55])
    // New compound paths take the stroke of the project's style:
    const { currentStyle } = paper.project
    currentStyle.strokeWidth = 20
    equals(new CompoundPath().strokeWidth, 20)
    currentStyle.strokeWidth = 1
  })

  test('StrokeProfileStop#equals() compares its values and place', () => {
    // Without a path, by its offset:
    const stop = new StrokeProfileStop()
    stop.offset = 20
    equals(stop.offset, 20)
    const other = new StrokeProfileStop({ offset: 20 })
    equals(stop.equals(other), true)
    equals(stop.equals(stop), true)
    equals(stop.equals({ offset: 20 }), false, 'no stop')
    for (const [key, value] of Object.entries({
      offset: 30,
      width: 2,
      aspect: 0.5,
      angle: 45,
      smooth: false
    })) {
      const changed = other.clone()
      changed[key] = value
      equals(stop.equals(changed), false, key)
    }
    // On paths, by its place between the segments:
    equals(
      createTaper().strokeProfile[1].equals(createTaper().strokeProfile[1]),
      true
    )
  })
})
