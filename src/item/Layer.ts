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

import { Group } from '../internal.ts'
import type { Item } from './Item.ts'
import type { Project } from './Project.ts'

/**
 * The Layer item represents a layer in a Paper.js project.
 *
 * The layer which is currently active can be accessed through
 * {@link Project#activeLayer}.
 * An array of all layers in a project can be accessed through
 * {@link Project#layers}.
 */
export class Layer extends Group {
  // Counts the changes of the layer's text wraps, by which its area texts
  // know to lay out again, see Item#textWrap:
  declare _textWrapVersion: number
  // The items that text wraps around, by id, see Item#textWrap:
  _textWrapItems: Record<string, any>

  // DOCS: improve constructor code example.
  /**
   * Creates a new Layer item and places it at the end of the
   * {@link Project#layers} array. The newly created layer will be activated,
   * so all newly created items will be placed within it.
   *
   * @param children an array of items that will be added to the newly created
   *     layer
   *
   * @example
   * var layer = new Layer();
   */
  constructor(children?: Item[])
  /**
   * Creates a new Layer item and places it at the end of the
   * {@link Project#layers} array. The newly created layer will be activated,
   * so all newly created items will be placed within it.
   *
   * @param object an object containing the properties to be set on the layer
   *
   * @example {@paperscript}
   * var path = new Path([100, 100], [100, 200]);
   * var path2 = new Path([50, 150], [150, 150]);
   *
   * // Create a layer. The properties in the object literal
   * // are set on the newly created layer.
   * var layer = new Layer({
   *     children: [path, path2],
   *     strokeColor: 'black',
   *     position: view.center
   * });
   */
  constructor(object: object)
  /**
   * Creates a new Layer item from the passed items and places it at the end
   * of the {@link Project#layers} array. The newly created layer will be
   * activated, so all newly created items will be placed within it.
   *
   * @param children the items that will be added to the newly created layer
   */
  constructor(...children: Item[])
  constructor(...args: any[]) {
    super(...args)
  }

  /**
   * Private helper to return the owner, either the parent, or the project
   * for top-level layers, if they are inserted in it.
   */
  _getOwner(): Item | Project {
    return this._parent || this._index != null && this._project
  }

  isInserted(): boolean {
    return this._parent ? super.isInserted() : this._index != null
  }

  /**
   * Activates the layer.
   *
   * @example
   * var firstLayer = project.activeLayer;
   * var secondLayer = new Layer();
   * console.log(project.activeLayer == secondLayer); // true
   * firstLayer.activate();
   * console.log(project.activeLayer == firstLayer); // true
   */
  activate() {
    this._project._activeLayer = this
  }

  _hitTestSelf(): undefined {}

  static {
    this.prototype._textWrapVersion = 0
    // Turn on again for now, since examples depend on it.
    // TODO: Discus with @puckey and come to a conclusion
    // this.prototype._selectChildren = false
  }
}
