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

// Sweeps the boolean operations of the tests and issue cases with tiny moves of
// their second operand, and compares how many results stay the same and how
// many points they fill wrongly with baseline.json, see sweep.mjs. Fails if any
// case got worse. Update the baseline with --update, test another entry than
// the sources with --entry, run fewer processes than cores with --jobs, leave
// out the points within a multiple of the operation's epsilon of an outline
// with --exclusion, e.g. `--exclusion=10`, and scale or move all operands with
// --scale and --translation: `pnpm test:booleans`.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { parseArgs } from 'node:util'

const { values: argv } = parseArgs({
  options: {
    update: { type: 'boolean' },
    entry: { type: 'string', default: 'src/node/index.ts' },
    jobs: { type: 'string' },
    exclusion: { type: 'string', default: '' },
    scale: { type: 'string', default: '' },
    translation: { type: 'string', default: '' }
  }
})
const dir = import.meta.dirname
const baselineFile = path.join(dir, 'baseline.json')
const results = []

// Sweeps every n-th case from the given one on in one child process per job,
// each restarted after a case that doesn't return within 2 minutes:
const step = +argv.jobs || os.availableParallelism()
let running = 0
let failed = false

function run(first) {
  running++
  const child = spawn(
    process.execPath,
    [
      path.join(dir, 'sweep.mjs'),
      argv.entry,
      `${first}:${step}`,
      argv.exclusion,
      argv.scale,
      argv.translation
    ],
    // Let the children write their errors directly:
    { stdio: ['ignore', 'pipe', 'inherit'] }
  )
  let buffer = ''
  let started
  let timer
  const watch = delay => {
    clearTimeout(timer)
    timer = setTimeout(() => child.kill(), delay)
  }
  // Loading the library and the tests takes longer than a case:
  watch(60000)
  child.stdout.on('data', data => {
    const lines = (buffer + data).split('\n')
    buffer = lines.pop()
    for (const line of lines) {
      const result = JSON.parse(line)
      if (result.start) {
        started = result
      } else {
        results.push(result)
      }
    }
    watch(120000)
  })
  child.on('exit', (code, signal) => {
    clearTimeout(timer)
    running--
    if (signal) {
      results.push({
        label: started.label,
        op: started.op,
        index: started.index,
        timeout: true
      })
      run(started.index + step)
    } else if (code) {
      failed = true
      console.error('The boolean sweep failed.')
      process.exitCode = 1
    } else if (!running && !failed) {
      finish()
    }
  })
}

function finish() {
  // Key the results by label, operation and occurrence, in the order of the
  // cases:
  const current = {}
  const counts = {}
  results.sort((a, b) => a.index - b.index)
  for (const result of results) {
    let key = `${result.label} / ${result.op}`
    counts[key] = (counts[key] || 0) + 1
    if (counts[key] > 1) {
      key += ` (${counts[key]})`
    }
    current[key] = result.timeout
      ? { timeout: true }
      : result.skipped || result.error
        ? { skipped: result.skipped || result.error }
        : {
            stable: result.stable,
            wrong: result.wrong,
            movedWrong: result.movedWrong,
            nonPlanar: result.nonPlanar
          }
  }
  const baseline = fs.existsSync(baselineFile)
    ? JSON.parse(fs.readFileSync(baselineFile, 'utf8'))
    : {}
  const worse = []
  const better = []
  let stable = 0
  let wrong = 0
  let movedWrong = 0
  let nonPlanar = 0
  let timeouts = 0
  for (const [key, entry] of Object.entries(current)) {
    const base = baseline[key]
    stable += entry.stable || 0
    wrong += entry.wrong || 0
    movedWrong += entry.movedWrong || 0
    nonPlanar += entry.nonPlanar || 0
    timeouts += entry.timeout ? 1 : 0
    if (base) {
      const change = entry.timeout
        ? base.timeout
          ? 0
          : -1
        : base.timeout
          ? 1
          : entry.stable - base.stable || base.wrong - entry.wrong
      if (change < 0) {
        worse.push(
          `${key}: ${JSON.stringify(base)} -> ${JSON.stringify(entry)}`
        )
      }
      if (change > 0) {
        better.push(key)
      }
    }
  }
  console.log(
    `Boolean sweep: ${results.length} cases, ${stable} stable results ` +
    `under tiny moves, ${wrong} wrongly filled points, ${movedWrong} in the ` +
    `results of the tiny moves, ${nonPlanar} graphs that are not planar, ` +
    `${timeouts} timeouts. ${better.length} better than the baseline, ` +
    `${worse.length} worse.`
  )
  // The points close to the outlines, per multiple of epsilon:
  for (const name of ['near', 'movedNear']) {
    const sums = {}
    for (const result of results) {
      for (const [factor, [count, total]] of Object.entries(
        result[name] || {}
      )) {
        const sum = (sums[factor] ||= [0, 0])
        sum[0] += count
        sum[1] += total
      }
    }
    console.log(
      `${
        name === 'near'
          ? 'Close to the outlines'
          : 'Close to the outlines of the tiny moves'
      }: ${Object.entries(sums)
        .map(
          ([factor, [count, total]]) =>
            `${count} of ${total} wrong at ${factor} epsilon`
        )
        .join(', ')}.`
    )
  }
  for (const line of worse) {
    console.log(`Worse: ${line}`)
  }
  for (const result of results) {
    if (result.wrong || result.movedWrong) {
      console.log(
        `Wrong: ${result.label} / ${result.op}: ${result.wrong}, in the ` +
        `results of the tiny moves: ${result.movedWrong}`
      )
    }
    if (result.nonPlanar) {
      console.log(
        `Not planar: ${result.label} / ${result.op}: ${result.nonPlanar}, ` +
        JSON.stringify(result.repro)
      )
    }
  }
  if (argv.update) {
    fs.writeFileSync(baselineFile, `${JSON.stringify(current, null, 4)}\n`)
    console.log(`Updated ${baselineFile}.`)
  } else if (worse.length) {
    console.error('The boolean sweep got worse than the baseline.')
    process.exitCode = 1
  }
}

for (let i = 0; i < step; i++) {
  run(i)
}
