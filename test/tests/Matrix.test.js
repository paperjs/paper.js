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

import { describe, expect } from 'vitest'
import { Matrix, Path, Point } from 'paper'
import { equals, test } from '../helpers.js'

describe('Matrix', () => {
  test('new Matrix() with unsupported parameters', () => {
    const message = 'Unsupported matrix parameters'
    expect(() => new Matrix(1, 2)).toThrow(message)
    expect(() => new Matrix(1, 2, 3, 4, 5)).toThrow(message)
    equals(new Matrix([1, 2, 3, 4, 5, 6]), new Matrix(1, 2, 3, 4, 5, 6))
  })

  test('Decomposition: rotate()', () => {
    function testAngle(a, ea) {
      const m = new Matrix().rotate(a),
        s = 'new Matrix().rotate(' + a + ')'
      equals(m.rotation, ea ?? a, s + '.rotation')
      equals(m.scaling, new Point(1, 1), s + '.scaling')
    }

    testAngle(0)
    testAngle(1)
    testAngle(45)
    testAngle(90)
    testAngle(135)
    testAngle(180)
    testAngle(270, -90)
    testAngle(-1)
    testAngle(-45)
    testAngle(-90)
    testAngle(-135)
    testAngle(-180)
    testAngle(-270, 90)
  })

  test('Decomposition: scale()', () => {
    function testScale(sx, sy, ex, ey, ea) {
      const m = new Matrix().scale(sx, sy),
        s = 'new Matrix().scale(' + sx + ', ' + sy + ')'
      equals(m.rotation, ea || 0, s + '.rotation')
      equals(
        m.scaling,
        new Point(ex ?? sx, ey ?? sy),
        s + '.scaling'
      )
    }

    testScale(1, 1)
    testScale(1, -1)
    testScale(-1, 1, 1, -1, -180) // Decomposing results in correct flipping
    testScale(-1, -1, 1, 1, -180) // Decomposing results in correct flipping
    testScale(2, 4)
    testScale(2, -4)
    testScale(4, 2)
    testScale(-4, 2, 4, -2, -180) // Decomposing results in correct flipping
    testScale(-4, -4, 4, 4, -180) // Decomposing results in correct flipping
  })

  test('Decomposition: scale() & rotate()', () => {
    function testAngleAndScale(sx, sy, a, ex, ey, ea) {
      const m = new Matrix().rotate(a).scale(sx, sy),
        s = (
          'new Matrix().scale(' +
          sx +
          ', ' +
          sy +
          ').rotate(' +
          a +
          ')'
        )
      equals(m.rotation, ea || a, s + '.rotation')
      equals(
        m.scaling,
        new Point(ex ?? sx, ey ?? sy),
        s + '.scaling'
      )
    }

    testAngleAndScale(2, 4, 45)
    testAngleAndScale(2, -4, 45)
    testAngleAndScale(-2, 4, 45, 2, -4, -135)
    testAngleAndScale(-2, -4, 45, 2, 4, -135)
  })

  test('scale() and shear() around a center, on an item that applies them', () => {
    // The path applies each change to its matrix at once, so the matrix must
    // only change once, not for each step around the center:
    const center = new Point(15, 15)
    function getBounds(transform) {
      const path = new Path.Rectangle({ point: [10, 10], size: [10, 10] })
      transform(path)
      return path.bounds
    }
    equals(
      getBounds(path => path.matrix.scale(2, center)),
      getBounds(path => path.scale(2, center))
    )
    equals(
      getBounds(path => path.matrix.shear(0.5, center)),
      getBounds(path => path.shear(0.5, center))
    )
  })
})
