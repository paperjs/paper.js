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

import { getWindow } from '../env.ts'

export interface RequestOptions {
  url: string
  method?: string
  async?: boolean
  mimeType?: string
  onLoad?(this: XMLHttpRequest, text: string): void
  onError?(message: string, status: number): void
}

/**
 * Loads the text at the URL and passes it to `options.onLoad()`.
 *
 * @private
 */
export function request(options: RequestOptions) {
  // Code borrowed from Coffee Script and extended.
  // On Node.js, XMLHttpRequest comes with the DOM's window:
  const { XMLHttpRequest } = (getWindow() || globalThis) as typeof globalThis
  const xhr = new XMLHttpRequest()
  xhr.open(
    (options.method || 'get').toUpperCase(),
    options.url,
    options.async ?? true
  )
  if (options.mimeType) {
    xhr.overrideMimeType(options.mimeType)
  }
  function handleError() {
    const { status } = xhr
    const message = `Could not load "${options.url}" (Status: ${status})`
    if (options.onError) {
      options.onError(message, status)
    } else {
      throw new Error(message)
    }
  }
  xhr.onload = function () {
    const { status } = xhr
    if (status === 0 || status === 200) {
      options.onLoad?.call(xhr, xhr.responseText)
    } else {
      handleError()
    }
  }
  xhr.onerror = handleError
  xhr.send(null)
}
