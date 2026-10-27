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
import { CompoundPath, Path, Point } from 'paper'
import { equals, test } from '../helpers.js'

describe('Compound Path', () => {
  test('CompoundPath#simplify() without children', () => {
    equals(() => new CompoundPath().simplify(), false)
  })

  test('moveTo() / lineTo()', () => {
    const path = new CompoundPath()

    const lists = [
      [
        new Point(279, 151),
        new Point(149, 151),
        new Point(149, 281),
        new Point(279, 281)
      ],
      [
        new Point(319, 321),
        new Point(109, 321),
        new Point(109, 111),
        new Point(319, 111)
      ]
    ]

    for (let i = 0; i < lists.length; i++) {
      const list = lists[i]
      for (let j = 0; j < list.length; j++) {
        path[!j ? 'moveTo' : 'lineTo'](list[j])
      }
    }

    path.fillColor = 'black'

    equals(() => path.children.length, 2)
  })

  test('CompoundPath#reorient()', () => {
    const path1 = new Path.Rectangle([300, 300], [100, 100])
    const path2 = new Path.Rectangle([50, 50], [200, 200])
    const path3 = new Path.Rectangle([0, 0], [500, 500])

    equals(() => path1.clockwise, true)
    equals(() => path2.clockwise, true)
    equals(() => path3.clockwise, true)

    const compound = new CompoundPath({
      children: [path1, path2, path3]
    }).reorient()

    equals(() => compound.lastChild === path3, true)
    equals(() => compound.firstChild === path1, true)
    equals(() => path1.clockwise, false)
    equals(() => path2.clockwise, false)
    equals(() => path3.clockwise, true)
  })
})
