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

// Release the version in package.json: collect its changelog entries, commit
// and tag the release on develop, merge it into main and push both, for the
// release workflow on GitHub Actions to build and publish it: `pnpm release`.
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const root = import.meta.dirname
const { version } = JSON.parse(
  fs.readFileSync(path.join(root, 'package.json'), 'utf8')
)
const message = `Release version ${version}`

const git = (...args) =>
  execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim()

if (git('rev-parse', '--abbrev-ref', 'HEAD') !== 'develop') {
  throw new Error('Releasing is only allowed on the develop branch.')
}
updateChangelog()
git('add', '--update')
git('commit', '-m', message)
git('tag', '-a', `v${version}`, '-m', message)
git('checkout', 'main')
git('merge', 'develop', '-X', 'theirs')
git('push', 'origin', 'main', 'develop', '--tags')
git('checkout', 'develop')

// Collect the entries of the unreleased changes, along with those still in the
// Unreleased section of CHANGELOG.md, into the section of the new version, and
// delete their files. Each file in changelog/unreleased holds the entries of
// one pull request under the headings of their kind, so that pull requests
// don't conflict in CHANGELOG.md, see its README.
function updateChangelog() {
  const kinds = [
    'News',
    'Security',
    'Added',
    'Changed',
    'Deprecated',
    'Removed',
    'Fixed'
  ]
  const folder = path.join(root, 'changelog/unreleased')
  const files = fs
    .readdirSync(folder)
    .filter(file => file.endsWith('.md') && file !== 'README.md')
    .sort()
    .map(file => path.join(folder, file))
  const changelogFile = path.join(root, 'CHANGELOG.md')
  const changelog = fs.readFileSync(changelogFile, 'utf8')
  // The Unreleased section, or an empty one above the latest version:
  const match = changelog.match(/^## Unreleased\n([^]*?)(?=^## )/m)
  const start = match ? match.index : changelog.search(/^## /m)
  const end = match ? start + match[0].length : start
  const entries = {}

  const collect = (text, source) => {
    const sections = text.split(/^### /m)
    if (sections.shift().trim()) {
      throw new Error(`Text before the first heading in ${source}`)
    }
    for (const section of sections) {
      const [kind, ...lines] = section.split('\n')
      if (!kinds.includes(kind)) {
        throw new Error(`Unknown heading ### ${kind} in ${source}`)
      }
      // Each entry is a list item, with its indented lines:
      const items = lines
        .join('\n')
        .split(/\n(?=- )/)
        .map(item => item.trim())
        .filter(Boolean)
      entries[kind] = [...(entries[kind] || []), ...items]
    }
  }

  collect(match ? match[1] : '', 'CHANGELOG.md')
  for (const file of files) {
    collect(fs.readFileSync(file, 'utf8'), file)
  }
  const sections = kinds
    .filter(kind => entries[kind])
    .map(kind => `### ${kind}\n\n${entries[kind].join('\n')}\n`)
  if (!sections.length) {
    throw new Error('No changelog entries to release.')
  }
  fs.writeFileSync(
    changelogFile,
    changelog.slice(0, start) +
    `## \`${version}\`\n\n${sections.join('\n')}\n` +
    changelog.slice(end)
  )
  for (const file of files) {
    fs.unlinkSync(file)
  }
}
