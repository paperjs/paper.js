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
const id = '\0paper'

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
        const code = isBuilt
          ? fs.readFileSync(file, 'utf8')
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
        return (
          `${header}${code}\nexport default paper\n` +
          `export const { ${names.join(', ')} } = paper\n`
        )
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

function buildFromSources(options) {
  const Prepro = require('prepro')
  const prepro = new Prepro()
  // Evaluate constants.js first, for the constants substitution (`/*#=*/`):
  prepro.evaluate(path.join(root, 'src', 'constants.js'))
  prepro.setup(() => ({
    __options: { ...require(path.join(root, 'src', 'options.js')), ...options }
  }))
  return prepro.process(path.join(root, 'src', 'paper.js'))
}
