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

// The entry of SVG import and export, for `use(svg)` with `paper/core`, see
// the `use()` function there. The `paper` entry has it already.
import { exportItemSVG, exportProjectSVG, importSVG } from '../internal.ts'

/**
 * The import and export of SVG, for `use(svg)` with `paper/core`, see the
 * `use()` function there.
 */
export const svg = {
  feature: {
    name: 'svg' as const,
    exportItemSVG,
    exportProjectSVG,
    importSVG
  }
}
