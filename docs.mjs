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

// Build the reference from the sources: TypeDoc reads their doc comments into
// JSON, and docs/render.mjs renders it as the offline docs in dist/docs and as
// the website's fragments in dist/serverdocs: `pnpm build:docs`.
import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import { Application, Comment, Converter } from 'typedoc'
import { renderDocs } from './docs/render.mjs'

const root = import.meta.dirname
const { version } = JSON.parse(
  fs.readFileSync(path.join(root, 'package.json'), 'utf8')
)

const app = await Application.bootstrap({
  entryPoints: [
    'src/index.ts',
    'src/paperscript/index.ts',
    'src/hosted/index.ts',
    'src/docs/global.ts'
  ].map(file => path.join(root, file)),
  tsconfig: path.join(root, 'tsconfig.json'),
  // Keep the members in the order of the sources, which {@grouptitle} relies
  // on:
  sort: ['source-order'],
  useTsLinkResolution: false,
  blockTags: [
    '@param', '@return', '@returns', '@example', '@see', '@deprecated',
    '@default', '@classexample', '@option', '@values', '@result', '@module',
    '@author'
  ],
  inlineTags: ['@link', '@paperscript', '@true', '@grouptitle', '@values'],
  modifierTags: [
    '@private', '@internal', '@ignore', '@readonly', '@operator', '@chainable',
    '@property', '@override'
  ],
  validation: { invalidLink: false, notExported: false, notDocumented: false },
  excludePrivate: false,
  skipErrorChecking: true,
  logLevel: 'Warn'
})
// Read the @param tags from the sources, written as JSDoc's
// `[name=default] text`: TypeDoc loses defaults that contain braces, and tags
// without text, which the reference lists too. The renderer only lists the
// parameters that have a tag, as 0.17 did:
const paramTags = new Map()
// TypeDoc gives overloads without a doc comment the comment of the first one.
// Only the overloads with their own are documented, the others exist for the
// types, as in `add(...segments)`:
const copiedComments = new Set()
app.converter.on(
  Converter.EVENT_CREATE_SIGNATURE,
  (context, signature, declaration) => {
    const jsDoc = declaration && ts.getJSDocCommentsAndTags(declaration).at(-1)
    if (declaration && !(jsDoc && ts.isJSDoc(jsDoc))) {
      copiedComments.add(signature)
    }
    const source =
      jsDoc && ts.isJSDoc(jsDoc)
        ? jsDoc.getText().replace(/^\s*(\/\*\*|\*\/|\*)\s?/gm, '')
        : ''
    const tags = {}
    for (const [, name, defaultValue, text] of source.matchAll(
      /^@param\s+(?:\{[^}]*\}\s*)?\[?\s*([\w.]+)(?:\s*=\s*((?:[^[\]{}]|\{[^}]*\})*))?\]?[ \t]*([\s\S]*?)(?=^@|$(?![\s\S]))/gm
    )) {
      tags[name] = {
        defaultValue: defaultValue?.trim(),
        text: text.trim().replace(/\n[ \t]+/g, '\n')
      }
    }
    for (const parameter of signature.parameters ?? []) {
      if (tags[parameter.name]) {
        paramTags.set(parameter, tags[parameter.name])
      }
    }
  }
)

// Apply the @param tags read above, and turn links back into their source text
// before TypeDoc resolves them: it keeps only the text after a target that it
// understands, but Paper's links carry the parameters that the anchors need,
// as in `{@link #hitTest(point)}`. The renderer reads them like the other
// inline tags:
app.converter.on(
  Converter.EVENT_RESOLVE_END,
  ({ project }) => {
    for (const signature of copiedComments) {
      delete signature.comment
    }
    for (const [parameter, { defaultValue, text }] of paramTags) {
      if (defaultValue) {
        parameter.defaultValue = defaultValue
      }
      // Mark the parameter as documented, also with an empty text:
      parameter.comment = new Comment(
        [{ kind: 'text', text }],
        [],
        new Set(['@param'])
      )
    }
    for (const { comment } of Object.values(project.reflections)) {
      const lists = [
        comment?.summary,
        ...(comment?.blockTags ?? []).map(tag => tag.content)
      ]
      for (const part of lists.flat()) {
        if (part?.kind === 'inline-tag' && part.tag === '@link') {
          part.kind = 'text'
          part.text = `{@link ${part.text}}`
          delete part.tag
        }
      }
    }
  },
  // Before TypeDoc's own link resolution, which runs at -300:
  100
)
const project = await app.convert()
if (!project) {
  throw new Error('Unable to read the sources.')
}
const json = app.serializer.projectToObject(project, root)
for (const mode of ['docs', 'serverdocs']) {
  const dir = path.join(root, 'dist', mode)
  fs.rmSync(dir, { recursive: true, force: true })
  for (const [file, content] of Object.entries(
    renderDocs(json, { mode, version })
  )) {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true })
    fs.writeFileSync(path.join(dir, file), content)
  }
}
// The offline docs run their examples with the full library:
fs.cpSync(path.join(root, 'docs/static'), path.join(root, 'dist/docs'), {
  recursive: true
})
fs.copyFileSync(
  path.join(root, 'dist/paper-full.js'),
  path.join(root, 'dist/docs/assets/js/paper.js')
)
