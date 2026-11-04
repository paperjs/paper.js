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

// Build the library from the sources into dist/: the ES modules of the entries,
// and the script files that set the global `paper`, with source maps:
// `node build.mjs`, or `pnpm build`.
import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { build } from 'rolldown'

const root = import.meta.dirname
const dist = path.join(root, 'dist')
const { version } = JSON.parse(
  fs.readFileSync(path.join(root, 'package.json'), 'utf8')
)
const date = execSync('git log -1 --pretty=format:%ad').toString().trim()

// The entries of the package, see `exports` in package.json:
const entries = {
  paper: 'src/index.ts',
  paperscript: 'src/paperscript/index.ts',
  node: 'src/node/index.ts',
  hosted: 'src/hosted/index.ts'
}

// The script files, whose global `paper` is the first scope, the default
// export of the core, with PaperScript in the full one:
const scripts = {
  'paper-core': ['src/index.ts'],
  'paper-full': ['src/index.ts', 'src/paperscript/index.ts']
}

export async function buildAll() {
  // tsc writes the declarations to dist/types after this, see `pnpm build`:
  remove('esm')
  remove('types')
  await build({
    input: Object.fromEntries(
      Object.entries(entries).map(([name, file]) => [name, resolve(file)])
    ),
    // The dependencies and peers stay imports:
    external: [/^node:/, 'acorn', 'happy-dom', '@napi-rs/canvas'],
    output: {
      dir: path.join(dist, 'esm'),
      format: 'es',
      banner: getBanner(false),
      sourcemap: true
    }
  })
  for (const [name, files] of Object.entries(scripts)) {
    for (const minify of [false, true]) {
      const file = `${name}${minify ? '.min' : ''}.js`
      remove(file)
      remove(`${file}.map`)
      await build({
        input: `\0${name}`,
        plugins: [getScriptPlugin(name, files)],
        output: {
          file: path.join(dist, file),
          format: 'iife',
          name: 'paper',
          exports: 'default',
          banner: getBanner(files.length > 1),
          sourcemap: true,
          minify
        }
      })
    }
  }
}

// Each script file is built from a module of its own, which imports the
// entries and exports the scope:
function getScriptPlugin(name, files) {
  const id = `\0${name}`
  return {
    name: 'paper-script',
    resolveId(source) {
      return source === id ? id : null
    },
    load(source) {
      return source === id
        ? [
            `import paper from '${resolve(files[0])}'`,
            ...files.slice(1).map(file => `import '${resolve(file)}'`),
            'export default paper'
          ].join('\n')
        : null
    }
  }
}

function getBanner(withAcorn) {
  const acorn = `
 *
 ***
 *
 * Acorn.js
 * https://marijnhaverbeke.nl/acorn/
 *
 * Acorn is a tiny, fast JavaScript parser written in JavaScript,
 * created by Marijn Haverbeke and released under an MIT license.`
  return `/*!
 * Paper.js v${version} - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2026, Jürg Lehni & Jonathan Puckey
 * http://juerglehni.com/ & https://puckey.studio/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 *
 * Date: ${date}${withAcorn ? acorn : ''}
 */`
}

function resolve(file) {
  return path.join(root, file)
}

// Remove an output first, also where it's a symlink, so the build doesn't write
// through it:
function remove(file) {
  fs.rmSync(path.join(dist, file), { recursive: true, force: true })
}

if (import.meta.main) {
  await buildAll()
}
