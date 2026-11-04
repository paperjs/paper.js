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
import paper, { PaperScope } from 'paper'
import { equals, test } from '../helpers.js'

describe('PaperScope', () => {
  test('paper.PaperScope', () => {
    // Scripts create scopes of their own through the current one:
    equals(paper.PaperScope === PaperScope, true)
  })
})
