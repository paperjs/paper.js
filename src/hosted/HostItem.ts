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

import { HitResult, Item } from '../internal.ts'
import type { BoundsOptions } from '../item/Item.ts'
import type { Project } from '../item/Project.ts'
import type { Point } from '../basic/Point.ts'
import type { Matrix } from '../basic/Matrix.ts'
import type { Rectangle } from '../basic/Rectangle.ts'

/**
 * A HostItem represents a node of a host document that has no counterpart in
 * Paper.js. Its bounds come from the host, it draws nothing, and only its
 * matrix and attributes can be changed. Hosts can extend it to expose their
 * own node kinds, storing their properties in `_values`, and declare
 * `_hasChildren: true` on the prototype for kinds that contain other items.
 */
export class HostItem extends Item {
  // The properties of the host's node kind, see above:
  _values: Record<string, any>

  /**
   * Creates a host item from the properties described by an object literal.
   *
   * @param props the properties to be set on the item
   */
  constructor(props?: object) {
    super()
    // The children aren't content, so hosted loading keeps them, see
    // Item#_loadContent():
    if (this._hasChildren) {
      this._children = []
      this._namedChildren = {}
    }
    this._initialize(props)
  }

  // @override
  _initializeContent(project: Project) {
    super._initializeContent(project)
    this._values = {}
  }

  _getBounds(matrix: Matrix, options: BoundsOptions): Rectangle {
    // The host's bounds also cover what it paints beyond the children:
    const rect = this._getHostBounds(options)
    return matrix?._transformBounds(rect) ?? rect
  }

  _hitTestSelf(point: Point, options: Record<string, any>): HitResult {
    const bounds = this._getHostBounds({ stroke: true, handle: true })
    if (options.fill && bounds._containsPoint(point)) {
      return new HitResult('fill', this)
    }
  }

  _draw() {
    // The host draws its own nodes.
  }

  static {
    Object.assign(this.prototype, {
      _applyMatrix: false,
      _canApplyMatrix: false,
      _hasChildren: false
    })
  }
}
