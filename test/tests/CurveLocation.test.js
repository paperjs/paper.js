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
import { Path, Point } from 'paper'
import { equals, test } from '../helpers.js'

describe('CurveLocation', () => {
  test('CurveLocation#offset', () => {
    const path = new Path()
    path.add(new Point(100, 100))
    path.add(new Point(200, 100))
    path.add(new Point(300, 100))
    path.add(new Point(400, 100))

    for (let i = 0; i < 4; i++) {
      equals(path.segments[i].location.offset, i * 100)
    }
  })
})
