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

// Build the library from the sources into dist/, as script files that set the
// global `paper`, with source maps: `node build.mjs`, or `pnpm build`.
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { minifySync } from 'oxc-minify'
import remapping from '@jridgewell/remapping'

const require = createRequire(import.meta.url)
const root = import.meta.dirname
const dist = path.join(root, 'dist')

export const builds = {
  full: { paperScript: true },
  core: { paperScript: false },
  hosted: { paperScript: true, hosted: true }
}

export function build() {
  // The version, with the branch as suffix outside of releases, and the date
  // of the last commit:
  const options = require('./gulp/utils/options.js')
  for (const [name, buildOptions] of Object.entries(builds)) {
    const file = `paper-${name}.js`
    const { code, map } = buildFromSources({ ...options, ...buildOptions })
    map.sources = map.sources.map(source => path.relative(dist, source))
    // Print the code again without its comments, except the license header:
    write(file, code, map, {
      compress: false,
      mangle: false,
      codegen: { removeWhitespace: false, legalComments: 'inline' }
    })
    if (name !== 'hosted') {
      // The sources use ES2015, which the minifier may use too:
      write(`paper-${name}.min.js`, code, map, {
        compress: { target: 'es2015' },
        codegen: { asciiOnly: true, legalComments: 'inline' }
      })
    }
  }
  // The Node.js layer, which the library requires at runtime:
  fs.mkdirSync(path.join(dist, 'node'), { recursive: true })
  for (const file of fs.readdirSync(path.join(root, 'src', 'node'))) {
    fs.copyFileSync(
      path.join(root, 'src', 'node', file),
      path.join(dist, 'node', file)
    )
  }
}

// Build the library from the sources as one script, with a source map back to
// them, used for dist/ and by the tests. prepro reads the files itself, and
// outputs each line that isn't a preprocessor statement, so tag these lines
// with their file and number as it reads them, and turn the tags into the map:
export function buildFromSources(options) {
  const Prepro = require('prepro')
  const prepro = new Prepro()
  const sources = []
  const sourcesContent = []
  // Evaluate constants.js first, for the constants substitution (`/*#=*/`):
  prepro.evaluate(path.join(root, 'src', 'constants.js'))
  prepro.setup(() => ({ __options: options }))
  const { readFileSync } = fs
  fs.readFileSync = function (file, ...args) {
    const content = readFileSync.call(this, file, ...args).toString()
    const index = sources.push(file) - 1
    sourcesContent.push(content)
    return content
      .split('\n')
      .map((line, i) =>
        /^\s*\/\*#\*\//.test(line) ? line : `${line}//@${index}:${i}`
      )
      .join('\n')
  }
  let code
  try {
    code = prepro.process(path.join(root, 'src', 'paper.js'))
  } finally {
    fs.readFileSync = readFileSync
  }
  let previous = [0, 0]
  const lines = code.split('\n')
  const mappings = lines.map((line, i) => {
    const match = line.match(/\/\/@(\d+):(\d+)$/)
    if (match) {
      lines[i] = line.slice(0, match.index)
      const current = [+match[1], +match[2]]
      const segment = encode([
        0,
        current[0] - previous[0],
        current[1] - previous[1],
        0
      ])
      previous = current
      return segment
    }
    return ''
  })
  return {
    code: lines.join('\n'),
    map: { version: 3, sources, sourcesContent, mappings: mappings.join(';') }
  }
}

// Write the code through oxc-minify with the given options, and its source map
// composed with the one of the sources:
function write(file, code, map, options) {
  const result = minifySync(file, code, { ...options, sourcemap: true })
  if (result.errors.length) {
    throw new Error(`Unable to build ${file}: ${result.errors[0].message}`)
  }
  // On develop, dist/paper-*.js are symlinks to src/load.js:
  fs.rmSync(path.join(dist, file), { force: true })
  fs.writeFileSync(
    path.join(dist, file),
    `${result.code}\n//# sourceMappingURL=${file}.map\n`
  )
  fs.writeFileSync(
    path.join(dist, `${file}.map`),
    remapping([result.map, map], () => null).toString()
  )
}

// Encode the values of a source map segment as base64 VLQs:
function encode(values) {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  return values
    .map(value => {
      let vlq = value < 0 ? (-value << 1) | 1 : value << 1
      let result = ''
      do {
        let digit = vlq & 31
        vlq >>>= 5
        if (vlq > 0) {
          digit |= 32
        }
        result += chars[digit]
      } while (vlq > 0)
      return result
    })
    .join('')
}

if (import.meta.main) {
  build()
}
