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
import { Point, Size } from 'paper'
import { equals, test } from '../helpers.js'

describe('Size', () => {
  test('new Size(10, 20)', () => {
    const size = new Size(10, 20)
    equals(size.toString(), '{ width: 10, height: 20 }')
  })

  test('new Size([10, 20])', () => {
    const size = new Size([10, 20])
    equals(size.toString(), '{ width: 10, height: 20 }')
  })

  test('new Size({width: 10, height: 20})', () => {
    const size = new Size({ width: 10, height: 20 })
    equals(size.toString(), '{ width: 10, height: 20 }')
  })

  test('new Size(new Point(10, 20))', () => {
    const size = new Size(new Point(10, 20))
    equals(size.toString(), '{ width: 10, height: 20 }')
  })

  test('new Size({ x: 10, y: 20})', () => {
    const size = new Size({ x: 10, y: 20 })
    equals(size.toString(), '{ width: 10, height: 20 }')
  })

  test('new Size("10, 20")', () => {
    equals(new Size('10, 20'), new Size(10, 20))
    equals(new Size('10,20'), new Size(10, 20))
    equals(new Size('10 20'), new Size(10, 20))
    // Make sure it's integer values from the string:
    equals(new Size('10 20').add(10), new Size(20, 30))
  })

  test('Size#values', () => {
    equals(new Size(10, 20).values, [10, 20])
  })
})
