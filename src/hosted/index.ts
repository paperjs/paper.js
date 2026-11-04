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

// The entry of the hosted library: the core library, with projects whose items
// a host stores and loads on demand, see Project#host, and HostItem.
import '../item/Item.Hosted.ts'
import { HostItem } from '../item/HostItem.ts'
import { PaperScope } from '../core/PaperScope.ts'
import { registerClasses } from '../core/serialization.ts'
import { inject } from '../util/object.ts'

registerClasses({ HostItem })
inject(PaperScope.prototype, { HostItem }, { enumerable: true })

declare module '../core/PaperScope.ts' {
  interface PaperScope {
    HostItem: typeof HostItem
  }
}

export * from '../index.ts'
export { default } from '../index.ts'
export { HostItem }
export type { Host, HostColumns } from '../item/Item.Hosted.ts'
