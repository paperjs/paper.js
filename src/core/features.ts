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

import type { boolean } from '../boolean/index.ts'
import type { offset } from '../offset/index.ts'
import type { svg } from '../svg/index.ts'
import type { effects } from '../item/effects.ts'
import type { raster } from '../item/Raster.ts'
import type { tween } from '../anim/Tween.ts'

// The optional features of the library, which use() adds, see
// PORT-DECISIONS 133. The `paper` entry adds them all, `paper/core` none:
type Features = {
  boolean: typeof boolean.feature
  offset: typeof offset.feature
  svg: typeof svg.feature
  effects: typeof effects.feature
  tween: typeof tween.feature
  raster: typeof raster.feature
}

type Feature = Features[keyof Features]

const features: Partial<Features> = {}

// The entries of the features that `paper/core` exports itself, for the
// error when one is missing, see getFeature():
const entries: Partial<Record<keyof Features, string>> = {
  effects: 'core',
  tween: 'core',
  raster: 'core'
}

/**
 * Adds the features to the library that `paper/core` leaves out, e.g.
 * `use(boolean)` with `boolean` from `paper/boolean` for the boolean
 * operations of path items. The `paper` entry adds all of them.
 *
 * @param list the features to add
 */
export function use(...list: { feature: Feature }[]) {
  for (const { feature } of list) {
    Object.assign(features, { [feature.name]: feature })
  }
}

/**
 * Returns the feature, or throws if it wasn't added through use().
 *
 * @private
 */
export function getFeature<K extends keyof Features>(name: K): Features[K] {
  const feature = features[name] as Features[K]
  if (!feature) {
    throw new Error(
      `Unable to use ${name} without use(${name}) from 'paper/${
        entries[name] ?? name
      }'.`
    )
  }
  return feature
}

/**
 * Returns the feature if it was added through use(), for what works without
 * it too.
 *
 * @private
 */
export function findFeature<K extends keyof Features>(
  name: K
): Features[K] | undefined {
  return features[name] as Features[K]
}
