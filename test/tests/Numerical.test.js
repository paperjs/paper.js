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
import { Numerical } from 'paper'
import { equals, test } from '../helpers.js'

describe('Numerical', () => {
  test('Numerical.solveQuadratic()', () => {
    function solve(s) {
      const roots = []
      Numerical.solveQuadratic(s, 0, -s, roots)
      return roots
    }

    const expected = [1, -1]

    equals(solve(1), expected, 'Numerical.solveQuadratic().')
    equals(
      solve(Numerical.EPSILON),
      expected,
      'Numerical.solveQuadratic() with an identical set of' +
      'coefficients at different scale.'
    )
  })

  test('Numerical.solveCubic()', () => {
    function solve(s) {
      const roots = []
      Numerical.solveCubic(0.5 * s, -s, -s, -s, roots)
      return roots
    }

    const expected = [2.919639565839418]

    equals(solve(1), expected, 'Numerical.solveCubic().')
    equals(
      solve(Numerical.EPSILON),
      expected,
      'Numerical.solveCubic() with an identical set of' +
      'coefficients at different scale.'
    )
  })

  test('Numerical.solveQuartic()', () => {
    function solve(a, b, c, d, e) {
      const roots = []
      const count = Numerical.solveQuartic(a, b, c, d, e, roots)
      return roots.slice(0, count).sort((x1, x2) => x1 - x2)
    }

    // (x - 1)(x - 2)(x - 3)(x - 4):
    equals(solve(1, -10, 35, -50, 24), [1, 2, 3, 4], 'four roots')
    const s = Numerical.EPSILON
    equals(
      solve(s, -10 * s, 35 * s, -50 * s, 24 * s),
      [1, 2, 3, 4],
      'an identical set of coefficients at different scale'
    )
    // The same roots at a thousandth of their size:
    equals(
      solve(1, -1e-2, 35e-6, -50e-9, 24e-12),
      [1e-3, 2e-3, 3e-3, 4e-3],
      'small roots'
    )
    // (x² + 1)(x - 2)(x + 3):
    equals(solve(1, 1, -5, 1, -6), [-3, 2], 'two roots')
    equals(solve(1, 0, -5, 0, 4), [-2, -1, 1, 2], 'a quadratic in x²')
    equals(solve(1, 0, 0, 0, 1), [], 'no roots')
    // Without the x⁴ term, it is solveCubic():
    equals(solve(0, 1, -6, 11, -6), [1, 2, 3], 'a cubic')
  })
})
