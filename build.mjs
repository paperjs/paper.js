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

// Build the library from the sources into dist/: the ES modules, and the script
// files that set the global `paper`, with source maps: `node build.mjs`, or
// `pnpm build`.
import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { build } from 'rolldown'
import ts from 'typescript'

const root = import.meta.dirname
const dist = path.join(root, 'dist')
const { version } = JSON.parse(
  fs.readFileSync(path.join(root, 'package.json'), 'utf8')
)
const date = execSync('git log -1 --pretty=format:%ad').toString().trim()

// The script files, whose global `paper` is the first scope, the default
// export of the core, with PaperScript in the full one, and also the hosted
// mode in the hosted one, for hosts that load Paper.js as a script. Those with
// PaperScript run the page's scripts once it has loaded:
const scripts = {
  'paper-core': ['src/index.ts'],
  'paper-full': ['src/index.ts', 'src/paperscript/autoload.ts'],
  'paper-hosted': ['src/hosted/index.ts', 'src/paperscript/autoload.ts']
}

export async function buildAll() {
  // tsc writes the declarations to dist/types after this, see `pnpm build`:
  remove('esm')
  remove('types')
  buildModules(path.join(dist, 'esm'))
  for (const name of Object.keys(scripts)) {
    for (const minify of [false, true]) {
      const file = `${name}${minify ? '.min' : ''}.js`
      remove(file)
      remove(`${file}.map`)
      await buildScript(name, { file: path.join(dist, file), minify })
    }
  }
}

// Build the script file, or return its code without a file. The script files
// bundle the sources, which `sideEffects` in package.json doesn't describe,
// as it lists the modules in dist/esm. Rolldown applies it to them anyway,
// also with `moduleSideEffects: true`, and drops imports for their effects,
// such as the hosted mode's, so the sources are named here:
export async function buildScript(name, { file, minify = false } = {}) {
  const files = scripts[name]
  const { output } = await build({
    input: `\0${name}`,
    plugins: [getScriptPlugin(name, files)],
    treeshake: { moduleSideEffects: id => id.startsWith(resolve('src')) },
    write: !!file,
    output: {
      file,
      format: 'iife',
      name: 'paper',
      exports: 'default',
      banner: getBanner(files.length > 1),
      sourcemap: !!file,
      minify
    }
  })
  return output[0].code
}

// Transpile each module of the sources on its own, as they are laid out, so
// bundlers leave out the modules that an app doesn't use, see `sideEffects` in
// package.json. It lists internal.js too, as bundlers that skip it lose the
// order in which it loads the modules, see there. The import of the version
// from package.json becomes the version itself, as the path differs in dist/:
export function buildModules(dir) {
  const src = resolve('src')
  for (const file of fs.readdirSync(src, { recursive: true })) {
    if (file.endsWith('.ts') && !file.startsWith('docs')) {
      const source = fs
        .readFileSync(path.join(src, file), 'utf8')
        .replace(
          /^import (\w+) from '[./]+package\.json' with \{ type: 'json' \}$/m,
          (match, name) => `const ${name} = { version: '${version}' }`
        )
      const { outputText, sourceMapText } = ts.transpileModule(source, {
        fileName: path.basename(file),
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.ESNext,
          verbatimModuleSyntax: true,
          rewriteRelativeImportExtensions: true,
          sourceMap: true,
          inlineSources: true
        }
      })
      const target = path.join(dir, file.replace(/\.ts$/, '.js'))
      fs.mkdirSync(path.dirname(target), { recursive: true })
      fs.writeFileSync(target, outputText)
      fs.writeFileSync(`${target}.map`, sourceMapText)
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
