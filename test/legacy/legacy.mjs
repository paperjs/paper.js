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

// The last release of the old codebase, the baseline that the port and new
// boolean operations compare with, built from its release commit, which keeps
// the built library. Extracted once into build/, with the Node.js files next
// to it, as the release package has them:
// import { getLegacyPaper } from '../legacy/legacy.mjs'
// const legacy = getLegacyPaper()

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import { createRequire } from 'node:module'

export const legacyVersion = '0.17.0'

const require = createRequire(import.meta.url)
const dir = new URL(`./build/${legacyVersion}/`, import.meta.url).pathname

export function getLegacyPaper() {
  const main = `${dir}dist/paper-full.js`
  if (!fs.existsSync(main)) {
    const tag = `v${legacyVersion}`
    fs.mkdirSync(dir, { recursive: true })
    const files = ['dist/paper-full.js', 'dist/paper-core.js', 'src/node']
    execFileSync(
      'sh',
      ['-c', `git archive ${tag} ${files.join(' ')} | tar -x -C ${dir}`],
      { cwd: new URL('../..', import.meta.url).pathname }
    )
    fs.renameSync(`${dir}src/node`, `${dir}dist/node`)
    fs.rmSync(`${dir}src`, { recursive: true })
  }
  return require(main)
}
