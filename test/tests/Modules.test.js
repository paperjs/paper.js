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
import {
  contains,
  exclude,
  formatSVGPath,
  intersect,
  parseSVGPath,
  split,
  subtract,
  unite
} from '../../src/boolean/index.ts'
import * as offsetModule from '../../src/offset/index.ts'
import { offset, offsetPath, outline } from '../../src/offset/index.ts'
import { getPathArea } from '../../src/values/path.ts'
import { getRegionBounds } from '../../src/values/region.ts'
import { equals, isNodeContext, test } from '../helpers.js'

// The entries paper/boolean and paper/offset, on plain descriptions of paths
// only:
describe('paper/boolean and paper/offset', () => {
  const square = (x, y, size) => ({
    paths: [
      {
        segments: [[x, y], [x + size, y], [x + size, y + size], [x, y + size]],
        closed: true
      }
    ],
    fillRule: 'nonzero'
  })
  const getTotalArea = region =>
    Math.abs(region.paths.reduce((sum, path) => sum + getPathArea(path), 0))
  const getRect = region => {
    const { x, y, width, height } = getRegionBounds(region)
    return [x, y, width, height]
  }
  const a = square(0, 0, 100)
  const b = square(50, 0, 100)
  const c = square(25, 50, 100)

  test('unite(), subtract(), intersect() and exclude()', () => {
    equals(getTotalArea(unite([a, b])), 15000)
    equals(getTotalArea(subtract(a, b)), 5000)
    equals(getTotalArea(subtract(a, [b, c])), 3750, 'the union of others')
    equals(getTotalArea(intersect(a, b)), 5000)
    equals(getTotalArea(intersect(a, [b, c])), 2500, 'all of them')
    equals(getTotalArea(exclude(a, b)), 10000)
  })

  test('contains()', () => {
    equals(contains(a, [50, 50]), true)
    equals(contains(a, [150, 50]), false)
    equals(contains(a, [100, 50]), true, 'on the outline')
  })

  test('split()', () => {
    const line = { segments: [[-50, 50], [150, 50]], closed: false }
    const { inside, outside } = split([line], a)
    const getPoints = paths =>
      paths.map(({ segments }) => segments.map(([point]) => point))
    equals(getPoints(inside), [[[0, 50], [100, 50]]])
    equals(getPoints(outside), [
      [[-50, 50], [0, 50]],
      [[100, 50], [150, 50]]
    ])
  })

  test('offset(), offsetPath() and outline()', () => {
    equals(getRect(offset(a, 10)), [-10, -10, 120, 120])
    equals(getRect(offset(a, -10)), [10, 10, 80, 80])
    const line = { segments: [[0, 0], [100, 0]], closed: false }
    equals(
      offsetPath(line, 10).map(({ segments }) =>
        segments.map(([point]) => point)
      ),
      [[[0, -10], [100, -10]]]
    )
    equals(getRect(outline([line], { width: 20 })), [0, -10, 100, 20])
    equals(
      getRect(outline([line], { width: 20, cap: 'square' })),
      [-10, -10, 120, 20]
    )
  })

  test('parseSVGPath() and formatSVGPath()', () => {
    const getRegion = data => ({
      paths: parseSVGPath(data),
      fillRule: 'nonzero'
    })
    const { paths } = subtract(
      getRegion('M0,0h100v100h-100z'),
      getRegion('M50,50h100v100h-100z')
    )
    equals(formatSVGPath(paths), 'M0,0h100v50h-50v50h-50z')
    equals(
      offsetModule.parseSVGPath === parseSVGPath &&
      offsetModule.formatSVGPath === formatSVGPath,
      true,
      'the same functions in paper/offset'
    )
  })

  // Bundling and processes of their own need Node.js:
  if (isNodeContext) {
    // Run the code in a process of its own, as the tests load the paper entry,
    // and return what it logs:
    async function runProcess(code) {
      const { execFileSync } = await import('node:child_process')
      const output = execFileSync(
        process.execPath,
        ['--input-type=module', '--eval', code],
        { encoding: 'utf8' }
      )
      return JSON.parse(output)
    }

    const getURL = file => new URL(`../../src/${file}`, import.meta.url).href

    test('paper/core creates no scope until the first project', async () => {
      const output = await runProcess(`
        const { PaperScope, Path, Project } = await import('${
          getURL('core.ts')
        }')
        const before = PaperScope.get(0)
        const project = new Project()
        console.log(JSON.stringify([
          before,
          'Path' in PaperScope.prototype,
          PaperScope.get(0) === project._scope,
          Path.circle({ center: [5, 5], radius: 3 }).project === project
        ]))
      `)
      equals(output, [null, false, true, true])
    })

    test('paper/core adds booleans and offsetting through use()', async () => {
      const output = await runProcess(`
        const { Path, Project, use } = await import('${getURL('core.ts')}')
        const { boolean } = await import('${getURL('boolean/index.ts')}')
        const { offset } = await import('${getURL('offset/index.ts')}')
        new Project()
        const a = Path.rectangle({ point: [0, 0], size: [10, 10] })
        const b = Path.rectangle({ point: [5, 0], size: [10, 10] })
        const getError = callback => {
          try {
            callback()
          } catch (error) {
            return error.message
          }
        }
        const errors = [getError(() => a.unite(b)), getError(() => a.offset(1))]
        use(boolean, offset)
        console.log(JSON.stringify([...errors, a.unite(b).area, a.offset(1).area]))
      `)
      equals(output, [
        `Unable to use boolean without use(boolean) from 'paper/boolean'.`,
        `Unable to use offset without use(offset) from 'paper/offset'.`,
        150,
        144
      ])
    })

    test('Only the script files run the PaperScripts of the page', async () => {
      const output = await runProcess(`
        const { default: paper } = await import('${getURL('node/index.ts')}')
        paper.document.body.innerHTML = \`
          <canvas id="canvas"></canvas>
          <script type="text/paperscript" canvas="canvas">
            globalThis.ran = true
          </script>\`
        const wait = () => new Promise(resolve => setTimeout(resolve, 10))
        await import('${getURL('paperscript/index.ts')}')
        await wait()
        const ranByModule = !!globalThis.ran
        await import('${getURL('paperscript/autoload.ts')}')
        await wait()
        console.log(JSON.stringify([ranByModule, !!globalThis.ran]))
      `)
      equals(output, [false, true])
    })

    test('The bundles of the entries leave out the scene graph', async () => {
      const { build } = await import('rolldown')
      for (const name of ['boolean', 'offset']) {
        const { output } = await build({
          input: new URL(`../../src/${name}/index.ts`, import.meta.url)
            .pathname,
          write: false,
          output: { format: 'es' }
        })
        const classes = output[0].code.match(/\bclass [A-Z]\w*/g) ?? []
        equals(
          classes.filter(name =>
            /\b(Item|Path|Project|PaperScope|View|Style)$/.test(name)
          ),
          [],
          name
        )
      }
    })
  }
})
