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

// Outlines the stroke of every case in cases.json with every join, cap and
// width, and reports the problems. With --update, writes the ones that fail to
// known.json, which the tests expect to fail.
// Usage: node test/offsetting/sweep.mjs [--update] [--verbose]

import fs from 'node:fs'
import { createRequire } from 'node:module'
import { caps, checkOutline, createPath, joins, widths } from './check.mjs'

const require = createRequire(import.meta.url)
const paper = require('../../dist/paper-full.js')
const dir = new URL('.', import.meta.url).pathname
const cases = JSON.parse(fs.readFileSync(dir + 'cases.json', 'utf8'))
const update = process.argv.includes('--update')
const verbose = process.argv.includes('--verbose')

paper.setup(new paper.Size(2000, 2000))
const failures = {}
let count = 0
for (const entry of cases) {
  for (const strokeJoin of joins) {
    for (const strokeCap of caps) {
      for (const strokeWidth of widths) {
        const path = createPath(paper, entry, {
          strokeWidth,
          strokeJoin,
          strokeCap
        })
        const problems = checkOutline(paper, path)
        const key = `${entry.name} / ${strokeJoin} ${strokeCap} ${strokeWidth}`
        count++
        if (problems.length) {
          failures[key] = problems.join(', ')
          if (verbose) console.log(`${key}: ${failures[key]}`)
        }
      }
    }
  }
}
const known = JSON.parse(fs.readFileSync(dir + 'known.json', 'utf8'))
const fixed = Object.keys(known).filter(key => !(key in failures))
const broken = Object.keys(failures).filter(key => !(key in known))
console.log(
  `${count} outlines of ${cases.length} cases: ` +
  `${Object.keys(failures).length} fail, ` +
  `${fixed.length} fixed and ${broken.length} broken since known.json.`
)
for (const key of broken) console.log(`  broken: ${key}: ${failures[key]}`)
if (update) {
  fs.writeFileSync(dir + 'known.json', JSON.stringify(failures, null, 2) + '\n')
}
