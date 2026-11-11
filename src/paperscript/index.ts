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

import {
  PaperScope,
  View,
  addEvents,
  getDocument,
  getWindow,
  inject
} from '../internal.ts'
import * as PaperScript from './PaperScript.ts'
import type { ExecuteOptions } from './PaperScript.ts'

declare module '../core/PaperScope.ts' {
  export interface PaperScope {
    /**
     * The PaperScript functions, to compile, execute and load PaperScript
     * code.
     */
    PaperScript: typeof PaperScript

    /**
     * Compiles the PaperScript code into a compiled function and executes it.
     * The compiled function receives all properties of this {@link PaperScope}
     * as arguments, to emulate a global scope with unaffected performance. It
     * also installs global view and tool handlers automatically on the
     * respective objects.
     *
     * @option options.url {String} the url of the source, for source-map
     *     debugging
     * @option options.source {String} the source to be used for the source-
     *     mapping, in case the code that's passed in has already been mingled.
     *
     * @param code the PaperScript code
     * @param options the compilation options
     */
    execute(code: string, options?: ExecuteOptions): any
  }
}

// PaperScript joins the classes in the scope's namespace, which scripts see as
// their globals:
inject(PaperScope.prototype, { PaperScript }, { enumerable: true })

inject(PaperScope.prototype, {
  execute(this: PaperScope, code: string, options?: ExecuteOptions) {
    const exports = PaperScript.execute(code, this, options)
    // Focus handling only exists in the browser, not in web workers:
    if (getWindow()) {
      View.updateFocus()
    }
    return exports
  }
})

const window = getWindow()
if (window) {
  // Catch cases where paper.js is loaded after the browser event has
  // already occurred.
  if (getDocument().readyState === 'complete') {
    // Handle it asynchronously
    setTimeout(() => PaperScript.load())
  } else {
    addEvents(window, { load: () => PaperScript.load() })
  }
}

export { PaperScript }
