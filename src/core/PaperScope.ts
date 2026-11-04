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

import { Base } from './Base.ts'
import { nativeBlendModes } from '../canvas/blendModes.ts'
import { getCanvas } from '../canvas/canvasProvider.ts'
import { Project } from '../item/Project.ts'
import type { Tool } from '../tool/Tool.ts'
import type { View } from '../view/View.ts'
import type { Size } from '../basic/Size.ts'
import packageJson from '../../package.json' with { type: 'json' }

/**
 * The currently active scope, which PaperScope#activate() sets.
 */
export let paper: PaperScope = null

// The agent, as detected once on first use, see PaperScope#agent:
let agent: Record<string, any>

/**
 * The `PaperScope` class represents the scope associated with a Paper
 * context. When working with PaperScript, these scopes are automatically
 * created for us, and through clever scoping the properties and methods of
 * the active scope seem to become part of the global scope.
 *
 * When working with normal JavaScript code, `PaperScope` objects need to be
 * manually created and handled.
 *
 * Paper classes can only be accessed through `PaperScope` objects. Thus in
 * PaperScript they are global, while in JavaScript, they are available on the
 * global {@link paper} object. For JavaScript you can use {@link
 * PaperScope#install(scope) } to install the Paper classes and objects on the
 * global scope. Note that when working with more than one scope, this still
 * works for classes, but not for objects like {@link PaperScope#project}, since
 * they are not updated in the injected scope if scopes are switched.
 *
 * The global {@link paper} object is simply a reference to the currently active
 * `PaperScope`.
 */
export class PaperScope extends Base {
  static #scopes: Record<number, PaperScope> = {}
  static #nextId = 0

  /**
   * The version of Paper.js, as a string.
   */
  readonly version: string = packageJson.version

  /**
   * Gives access to paper's configurable settings.
   *
   * @option [settings.insertItems=true] {Boolean} controls whether newly
   *     created items are automatically inserted into the scene graph, by
   *     adding them to {@link Project#activeLayer}
   * @option [settings.applyMatrix=true] {Boolean} controls what value newly
   *     created items have their {@link Item#applyMatrix} property set to
   *     (Note that not all items can set this to `false`)
   * @option [settings.handleSize=4] {Number} the size of the curve handles
   *     when drawing selections
   * @option [settings.segmentSize=null] {Number} the size of the segments
   *     when drawing selections, or `null` to use `settings.handleSize`, e.g.
   *     with `handleSize: 0` to only draw the segments and not their handles
   * @option [settings.hitTolerance=0] {Number} the default tolerance for hit-
   *     tests, when no value is specified, and for the mouse events of items
   * @option [settings.scaleStrokes=false] {Boolean} controls whether applying
   *     a matrix to the content of paths and compound paths also scales their
   *     {@link Style#strokeWidth}, by the geometric mean of the scale factors
   *     for non-uniform scaling. Items that keep their matrix, with
   *     {@link Item#applyMatrix} set to `false`, scale their strokes when
   *     drawing anyway, unless {@link Style#strokeScaling} is `false`
   */
  settings = {
    applyMatrix: true,
    insertItems: true,
    handleSize: 4,
    segmentSize: null,
    hitTolerance: 0,
    scaleStrokes: false
  }

  /**
   * The list of all open projects within the current Paper.js context.
   */
  projects: Project[] = []

  /**
   * The reference to the active tool.
   */
  tool: Tool = null

  /**
   * The list of available tools.
   */
  tools: Tool[] = []

  _project: Project = null
  _id = PaperScope.#nextId++

  /**
   * Creates a PaperScope object.
   */
  constructor() {
    super()
    PaperScope.#scopes[this._id] = this
    // Whenever a PaperScope is created, it becomes the active one.
    this.activate()
  }

  /**
   * The currently active project.
   */
  get project(): Project {
    return this._project
  }

  set project(project: Project) {
    this._project = project
  }

  /**
   * The reference to the active project's view.
   */
  get view(): View {
    return this._project?._view
  }

  /**
   * A reference to the local scope. This is required, so `paper` will always
   * refer to the local scope, even when calling into it from another scope.
   * `paper.activate();` will have to be called in such a situation.
   *
   * @private
   */
  get paper(): PaperScope {
    return this
  }

  /**
   * An object containing properties that describe the support of various
   * features.
   */
  get support(): { nativeBlendModes: Record<string, boolean> } {
    return { nativeBlendModes }
  }

  /**
   * The platform and browser that Paper.js runs in, detected from the user
   * agent, e.g. `{ platform: 'mac', mac: true, name: 'chrome', chrome: true,
   * version: '130.0', versionNumber: 130 }`.
   */
  get agent(): Record<string, any> {
    if (!agent) {
      const user = (globalThis.navigator?.userAgent || '').toLowerCase()
      // Detect basic platforms, only mac internally required for now.
      const os = (/(darwin|win|mac|linux|freebsd|sunos)/.exec(user) || [])[0]
      const platform = os === 'darwin' ? 'mac' : os
      agent = { platform }
      if (platform) {
        agent[platform] = true
      }
      // Use replace() to get all matches, and deal with Chrome/Webkit
      // overlap:
      user.replace(
        /(opera|chrome|safari|webkit|firefox|msie|trident|atom|node|jsdom)\/?\s*([.\d]+)(?:.*version\/([.\d]+))?(?:.*rv:v?([.\d]+))?/g,
        (match, name, version1, version2, revision) => {
          // Do not set additional browsers once chrome is detected.
          if (!agent.chrome) {
            const version =
              name === 'opera'
                ? version2
                : /^(node|trident)$/.test(name)
                  ? revision
                  : version1
            agent.version = version
            agent.versionNumber = parseFloat(version)
            name = { trident: 'msie', jsdom: 'node' }[name] || name
            agent.name = name
            agent[name] = true
          }
          return match
        }
      )
      if (agent.chrome) {
        delete agent.webkit
      }
      if (agent.atom) {
        delete agent.chrome
      }
    }
    return agent
  }

  /**
   * Injects the paper scope into any other given scope. Can be used for
   * example to inject the currently active PaperScope into the window's
   * global scope, to emulate PaperScript-style globally accessible Paper
   * classes and objects.
   *
   * <b>Please note:</b> Using this method may override native constructors
   * (e.g. Path). This may cause problems when using Paper.js in conjunction
   * with other libraries that rely on these constructors. Keep the library
   * scoped if you encounter issues caused by this.
   *
   * @example
   * paper.install(window);
   */
  install(scope: Record<string, any>) {
    // Define project, view and tool as getters that redirect to these values
    // on the PaperScope, so they are kept up to date
    for (const key of ['project', 'view', 'tool']) {
      Object.defineProperty(scope, key, {
        configurable: true,
        get: () => this[key]
      })
    }
    // Copy over all fields from this scope to the destination, except the
    // hidden ones and the names that the destination has already, such as the
    // native Event, MouseEvent and Symbol (#1832). Use for…in, since we also
    // want to enumerate over fields on PaperScope.prototype, e.g. all classes:
    for (const key in this) {
      if (!/^_/.test(key) && this[key] && !(key in scope)) {
        scope[key] = this[key]
      }
    }
  }

  /**
   * Sets up an empty project for us. If a canvas is provided, it also creates
   * a {@link View} for it, both linked to this scope.
   *
   * @param element the HTML canvas element this scope should be associated
   * with, or an ID string by which to find the element, or the size of the
   * canvas to be created for usage in a web worker.
   */
  setup(element: HTMLCanvasElement | string | Size): this {
    // Make sure this is the active scope, so the created project and view are
    // automatically associated with it.
    this.activate()
    // Create an empty project for the scope.
    this.project = new Project(element)
    // This is needed in PaperScript.load().
    return this
  }

  /**
   * Creates a canvas of the given size, or reuses one that was released
   * internally.
   *
   * @param width the width of the canvas
   * @param height the height of the canvas
   * @return the canvas
   */
  createCanvas(width: number, height: number): HTMLCanvasElement {
    return getCanvas(width, height) as HTMLCanvasElement
  }

  /**
   * Activates this PaperScope, so all newly created items will be placed
   * in its active project.
   */
  activate() {
    paper = this
  }

  /**
   * Removes all projects, views and tools of this scope, along with their
   * installed event handlers.
   */
  clear() {
    for (const project of [...this.projects].reverse()) {
      project.remove()
    }
    for (const tool of [...this.tools].reverse()) {
      tool.remove()
    }
  }

  /**
   * Clears this scope and removes it from the list of scopes.
   */
  remove() {
    this.clear()
    delete PaperScope.#scopes[this._id]
  }

  /**
   * Retrieves a PaperScope object with the given scope id.
   *
   * @param id
   */
  static get(id: number): PaperScope {
    return PaperScope.#scopes[id] || null
  }

  // Check for both the attribute and its 'data-paper-' version, e.g.
  // 'canvas' and 'data-paper-canvas':
  static getAttribute(element: Element, name: string): string {
    return (
      element.getAttribute(name) ||
      element.getAttribute('data-paper-' + name)
    )
  }

  static hasAttribute(element: Element, name: string): boolean {
    return (
      element.hasAttribute(name) ||
      element.hasAttribute('data-paper-' + name)
    )
  }
}
