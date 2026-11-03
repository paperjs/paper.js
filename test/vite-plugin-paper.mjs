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

import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const root = path.resolve(import.meta.dirname, '..')
const builds = {
  full: { paperScript: true },
  core: { paperScript: false },
  hosted: { paperScript: true, hosted: true }
}
// Under the path of src/paper.js rather than as a virtual module, which
// coverage leaves out:
const id = path.join(root, 'src', 'paper.js')

// Serve `paper` to the tests as a module, on Node and in the browser: the
// library built in dist/paper-<build>.js, as in CI, or else built from the
// sources, as `gulp build` does. PAPER_BUILD selects the build, `full` by
// default, and from the sources `hosted`, which has everything. On Node,
// PAPER_BUILD=load loads the sources through src/load.js instead.
export function paperPlugin() {
  const { PAPER_BUILD } = process.env
  const file = path.join(root, 'dist', `paper-${PAPER_BUILD || 'full'}.js`)
  // On develop, dist/paper-*.js are symlinks to src/load.js:
  const isBuilt = fs.existsSync(file) && !fs.lstatSync(file).isSymbolicLink()
  const names = getExportNames()
  return {
    name: 'paper',
    enforce: 'pre',

    resolveId(source) {
      return source === 'paper' ? id : null
    },

    load(source, options) {
      if (source === id && PAPER_BUILD === 'load' && options?.ssr) {
        // Load the sources through src/load.js, as in development, which
        // runs each file under its own name, so that coverage can tell
        // them apart:
        return (
          'import { createRequire } from "node:module"\n' +
          `const paper = createRequire(import.meta.url)(${
            JSON.stringify(path.join(root, 'src', 'load.js'))
          })\n` +
          'export default paper\n' +
          `export const { ${names.join(', ')} } = paper\n`
        )
      }
      if (source === id) {
        const { code, map } = isBuilt
          ? { code: fs.readFileSync(file, 'utf8') }
          : buildFromSources(builds[PAPER_BUILD || 'hosted'])
        // Hide the runner's module, so the library doesn't export itself
        // through CommonJS, and on Node, let it require its Node layer
        // relative to itself:
        const header = (
          'const module = undefined\n' + (
            options?.ssr
              ? 'import { createRequire } from "node:module"\n' +
                `const require = createRequire(${
                  JSON.stringify(
                    isBuilt ? file : path.join(root, 'src', 'paper.js')
                  )
                })\n`
              : ''
          )
        )
        return {
          code: (
            `${header}${code}\nexport default paper\n` +
            `export const { ${names.join(', ')} } = paper\n`
          ),
          // The header's lines come before the mapped ones:
          map: map && {
            ...map,
            mappings: ';'.repeat(header.split('\n').length - 1) + map.mappings
          }
        }
      }
    }
  }
}

// Get the classes of the library, and its document and window, which the
// tests import by name, from the sources, so builds without some of them
// export these as undefined. Leave out the deprecated aliases of
// SymbolDefinition and SymbolItem, as Symbol would hide the native one from
// the library in its module:
function getExportNames() {
  const paper = require(path.join(root, 'src', 'load.js'))
  const names = []
  for (const name in paper) {
    if (
      /^[A-Z]/.test(name) && name !== 'Symbol' && name !== 'PlacedSymbol' ||
      name === 'document' ||
      name === 'window'
    ) {
      names.push(name)
    }
  }
  return names
}

// Build the library from the sources as `gulp build` does, with a source map
// back to them, so that errors and coverage in the browser point to their
// files. prepro reads the files itself, and outputs each line that isn't a
// preprocessor statement, so tag these lines with their file and number as it
// reads them, and turn the tags into the map:
function buildFromSources(options) {
  const Prepro = require('prepro')
  const prepro = new Prepro()
  const sources = []
  // Evaluate constants.js first, for the constants substitution (`/*#=*/`):
  prepro.evaluate(path.join(root, 'src', 'constants.js'))
  prepro.setup(() => ({
    __options: { ...require(path.join(root, 'src', 'options.js')), ...options }
  }))
  const { readFileSync } = fs
  fs.readFileSync = function (file, ...args) {
    const content = readFileSync.call(this, file, ...args).toString()
    const index = sources.push(file) - 1
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
    map: { version: 3, sources, mappings: mappings.join(';') }
  }
}

// Encodes the values of a source map segment as base64 VLQs:
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
        if (vlq > 0) digit |= 32
        result += chars[digit]
      } while (vlq > 0)
      return result
    })
    .join('')
}
