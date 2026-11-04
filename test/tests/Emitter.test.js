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
import { Item } from 'paper'
import { equals, test } from '../helpers.js'

describe('Emitter', () => {
  test('on()', () => {
    let installed
    // Fake event type registration, in a class of its own:
    const emitter = new (class extends Item {
      static events = {
        mousemove: {
          install() {
            installed = true
          }
        }
      }
    })()
    equals(() => !emitter.responds('mousemove'), true)

    emitter.on('mousemove', () => {})
    equals(() => emitter.responds('mousemove'), true)
    equals(() => installed, true)

    // one time installation only
    installed = false
    emitter.on('mousemove', () => {})
    equals(() => !installed, true)

    emitter.on('customUnregistered', () => {})
    equals(() => emitter.responds('customUnregistered'), true)
  })

  test('off()', () => {
    let uninstalled
    let called = 0

    const handler = () => {
      called++
    }

    const handler2 = () => {}

    const emitter = new (class extends Item {
      static events = {
        mousemove: {
          uninstall() {
            uninstalled = true
          }
        }
      }
    })()

    emitter.on('mousemove', handler)
    emitter.on('mousemove', handler2)
    emitter.on('custom', handler)
    emitter.emit('mousemove')
    equals(() => called === 1, true)

    emitter.off('mousemove', handler2)
    emitter.emit('mousemove')
    equals(() => called === 2, true)
    equals(() => !uninstalled, true)

    emitter.off('mousemove', handler)
    emitter.emit('mousemove')
    equals(() => called === 2, true)
    equals(() => uninstalled, true)

    called = 0
    emitter.emit('custom')
    equals(() => called === 1, true)
    emitter.off('custom', handler)
    emitter.emit('custom')
    equals(() => called === 1, true)
  })

  test('emit()', () => {
    let called

    const handler = e => {
      called = e
    }

    // Fake event type registration, in a class of its own:
    const emitter = new (class extends Item {
      static events = { mousemove: {} }
    })()
    emitter.on('mousemove', handler)
    emitter.on('custom', handler)

    emitter.emit('mousemove', 'mousemove')
    equals(() => called === 'mousemove', true)

    emitter.emit('custom', 'custom')
    equals(() => called === 'custom', true)
  })
})
