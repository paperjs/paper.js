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

import { Change, ChangeFlag, Item } from '../internal.ts'
import type { Point } from '../basic/Point.ts'
import type { Matrix } from '../basic/Matrix.ts'
import type { Rectangle } from '../basic/Rectangle.ts'
import type { Style } from '../style/Style.ts'
import type { HitResult } from './HitResult.ts'

/**
 * A Group is a collection of items. When you transform a Group, its children
 * are treated as a single unit without changing their relative positions.
 */
export class Group extends Item {
  declare _isolated: boolean
  declare _buffered: boolean
  // The child that has _clipMask set to true, null if there is none, and
  // undefined if it wasn't looked for yet. Not private, as hosted shells are
  // created without the constructor, see Item#_loadContent():
  _clipItem: Item | null

  // DOCS: document new Group(item, item...);
  /**
   * Creates a new Group item and places it at the top of the active layer.
   *
   * @param children An array of children that will be added to the newly
   *     created group
   *
   * @example {@paperscript}
   * // Create a group containing two paths:
   * var path = new Path([100, 100], [100, 200]);
   * var path2 = new Path([50, 150], [150, 150]);
   *
   * // Create a group from the two paths:
   * var group = new Group([path, path2]);
   *
   * // Set the stroke color of all items in the group:
   * group.strokeColor = 'black';
   *
   * // Move the group to the center of the view:
   * group.position = view.center;
   *
   * @example {@paperscript height=320}
   * // Click in the view to add a path to the group, which in turn is rotated
   * // every frame:
   * var group = new Group();
   *
   * function onMouseDown(event) {
   *     // Create a new circle shaped path at the position
   *     // of the mouse:
   *     var path = Path.circle(event.point, 5);
   *     path.fillColor = 'black';
   *
   *     // Add the path to the group's children list:
   *     group.addChild(path);
   * }
   *
   * function onFrame(event) {
   *     // Rotate the group by 1 degree from
   *     // the centerpoint of the view:
   *     group.rotate(1, view.center);
   * }
   */
  constructor(children?: Item[])
  /**
   * Creates a new Group item and places it at the top of the active layer.
   *
   * @param object an object containing the properties to be set on the group
   *
   * @example {@paperscript}
   * var path = new Path([100, 100], [100, 200]);
   * var path2 = new Path([50, 150], [150, 150]);
   *
   * // Create a group from the two paths:
   * var group = new Group({
   *     children: [path, path2],
   *     // Set the stroke color of all items in the group:
   *     strokeColor: 'black',
   *     // Move the group to the center of the view:
   *     position: view.center
   * });
   */
  constructor(object: object)
  constructor(...children: Item[])
  constructor(...args: any[]) {
    super()
    // Allow Group to have children and named children
    this._children = []
    this._namedChildren = {}
    const [arg] = args
    if (!this._initialize(arg)) {
      this.addChildren(Array.isArray(arg) ? arg : args)
    }
  }

  // Styles set on groups apply to their children, and read as theirs:
  // @override
  _getStyles(): Style[] | null {
    const children = this._children
    return children.length > 0 ? children.map(child => child._style) : null
  }

  _changed(flags: number) {
    super._changed(flags)
    if (flags & (ChangeFlag.CHILDREN | ChangeFlag.CLIPPING)) {
      // Clear cached clip item whenever hierarchy changes
      this._clipItem = undefined
    }
  }

  _getClipItem(): Item | null {
    let clipItem = this._clipItem
    // Distinguish null (no clipItem set) and undefined (clipItem was not
    // looked for yet).
    if (clipItem === undefined) {
      clipItem = this._children.find(child => child._clipMask) ?? null
      this._clipItem = clipItem
    }
    return clipItem
  }

  /**
   * Specifies whether the group item is to be clipped. When setting to
   * `true`, the first child in the group is automatically defined as the
   * clipping mask.
   *
   * @example {@paperscript}
   * var star = Path.star({
   *     center: view.center,
   *     points: 6,
   *     radius1: 20,
   *     radius2: 40,
   *     fillColor: 'red'
   * });
   *
   * var circle = Path.circle({
   *     center: view.center,
   *     radius: 25,
   *     strokeColor: 'black'
   * });
   *
   * // Create a group of the two items and clip it:
   * var group = new Group(circle, star);
   * group.clipped = true;
   *
   * // Lets animate the circle:
   * function onFrame(event) {
   *     var offset = Math.sin(event.count / 30) * 30;
   *     circle.position.x = view.center.x + offset;
   * }
   */
  get clipped(): boolean {
    return !!this._getClipItem()
  }

  set clipped(clipped: boolean) {
    const child = this.firstChild
    if (child) {
      child.clipMask = clipped
    }
  }

  /**
   * Replaces the group with its children, which keep their appearance: the
   * group's matrix is applied to them, and its clipping mask is released.
   *
   * @return the children, or `null` if the group has no parent
   */
  ungroup(): Item[] | null {
    if (!this._parent) {
      return null
    }
    const children = this._children.slice()
    const clipItem = this._getClipItem()
    const matrix = this._matrix
    if (clipItem) {
      clipItem.clipMask = false
    }
    // Transform the children by the group's matrix, which they apply to
    // their content or their own matrix, depending on their applyMatrix:
    if (!matrix.isIdentity()) {
      for (const child of children) {
        child.transform(matrix)
      }
    }
    return this.replaceWith(...children) ? children : null
  }

  /**
   * Specifies whether the group is isolated, drawn through a temporary
   * canvas, so that the blend modes of its children only apply within it,
   * like CSS's `isolation: isolate`. Without it, a compositing mode such as
   * `'destination-out'` affects everything drawn below the group, also in
   * other layers. Groups with an {@link Item#opacity} below 1 or a
   * {@link Item#blendMode} are isolated anyway, and buffered groups always,
   * see {@link #buffered}.
   *
   * @default false
   */
  get isolated(): boolean {
    return this._isolated || this._buffered
  }

  set isolated(isolated: boolean) {
    this._isolated = !!isolated
    this._changed(Change.ATTRIBUTE)
  }

  /**
   * Specifies whether the group is buffered: when a view draws it, it draws
   * its content into a canvas of its own, which it keeps, and only draws
   * into it again when something in the group changes, or the part of it
   * that the view shows does, e.g. after zooming or panning. Otherwise, the
   * view only composites the buffer, with the group's {@link Item#opacity}
   * and {@link Item#blendMode}. This pays off for large groups and layers
   * that rarely change, such as a complex background below animated items.
   *
   * It doesn't pay off when the buffer is drawn again on every frame: while
   * the view pans or zooms on every frame, while the group itself is moved
   * or transformed, or when an item inside it is animated. Put animated
   * items into another group or layer instead.
   *
   * The buffer costs memory: it covers the part of the group that the view
   * shows, at up to `width × height × 4 × pixelRatio²` bytes for a group
   * that fills the whole view.
   *
   * Buffered groups are always {@link #isolated}: the blend modes of their
   * children only apply within them, not to the items below them, also in
   * other layers.
   *
   * Hit-testing, SVG export, {@link Item#rasterize()} and drawing into other
   * canvases than the view's don't use the buffer.
   *
   * A buffered group keeps one buffer, so inside a {@link SymbolDefinition}
   * that is placed several times, it draws into it again for each placement.
   * Changes to any symbol definition make all buffers stale, as do forced
   * updates through `view.update(true)`.
   *
   * @default false
   *
   * @example {@paperscript height=200}
   * // Draw many circles into a buffered layer, which is drawn once, while
   * // the circle in the layer above moves on every frame:
   * var background = project.activeLayer;
   * background.buffered = true;
   * for (var i = 0; i < 2000; i++) {
   *     Path.circle({
   *         center: Point.random() * view.size,
   *         radius: 5 + Math.random() * 10,
   *         fillColor: { hue: Math.random() * 360, saturation: 0.5,
   *                 brightness: 1 },
   *         opacity: 0.5
   *     });
   * }
   *
   * var circle = Path.circle({
   *     center: view.center,
   *     radius: 20,
   *     fillColor: 'black'
   * });
   * new Layer([circle]);
   *
   * function onFrame(event) {
   *     circle.position.x = view.center.x + Math.sin(event.time) * 100;
   * }
   */
  get buffered(): boolean {
    return this._buffered
  }

  set buffered(buffered: boolean) {
    this._buffered = !!buffered
    // Start without a buffer, and free it when turned off:
    this._buffer = null
    this._changed(Change.ATTRIBUTE)
  }

  _remove(notifySelf: boolean, notifyParent: boolean): boolean {
    // Free the buffer of removed groups:
    this._buffer = null
    return super._remove(notifySelf, notifyParent)
  }

  _serialize(options: any, dictionary: any) {
    const json = super._serialize(options, dictionary)
    // #isolated reads true for buffered groups, but store only their own:
    if (!this._isolated) {
      delete json[1].isolated
    }
    return json
  }

  _getBounds(
    matrix: Matrix,
    options: any
  ): Rectangle | { rect: Rectangle; nonscaling: boolean } {
    const clipItem = this._getClipItem()
    return clipItem
      ? clipItem._getCachedBounds(
          clipItem._matrix.prepended(matrix),
          { ...options, stroke: false }
        )
      : super._getBounds(matrix, options)
  }

  _hitTestChildren(
    point: Point,
    options: any,
    viewMatrix?: Matrix
  ): HitResult | null {
    const clipItem = this._getClipItem()
    return !clipItem || clipItem.contains(point)
      ? // Pass clipItem for hidden _exclude parameter
        super._hitTestChildren(point, options, viewMatrix, clipItem)
      : null
  }

  _hitTestSelf(
    point: Point,
    options: any,
    viewMatrix?: Matrix
  ): HitResult | undefined {
    // A group is hit wherever one of its children is hit, as in Illustrator.
    // Without filters or the collecting of all hits, the children were
    // already tested without result:
    if (options.match || options.class || options.type || options.all) {
      const res = this._hitTestChildren(
        point,
        Object.assign(Object.create(options), {
          all: null,
          match: null,
          class: null,
          type: null
        }),
        viewMatrix
      )
      if (res) {
        res.item = this
      }
      return res
    }
  }

  _draw(ctx: CanvasRenderingContext2D, param: any) {
    const { clip } = param
    const clipItem = this._getClipItem()
    param = Object.assign(Object.create(param), {
      clipItem: !clip && clipItem,
      clip: false
    })
    if (clip) {
      // If told to clip with a group, we start our own path and draw each
      // child just like in a compound-path. A single path can only add up
      // shapes, so a nested clip item can't intersect them. Leave it out,
      // which clips with all of the clipped content (#1618):
      ctx.beginPath()
      param.dontStart = param.dontFinish = true
    } else if (clipItem) {
      clipItem.draw(ctx, Object.assign(Object.create(param), { clip: true }))
    }
    for (const child of this._children) {
      if (child !== clipItem) {
        child.draw(ctx, param)
      }
    }
  }

  static {
    Object.assign(this.prototype, {
      _selectBounds: false,
      _selectChildren: true,
      _serializeFields: {
        ...Item.prototype._serializeFields,
        isolated: false,
        buffered: false,
        children: []
      },
      _isolated: false,
      _buffered: false,
      _attributes: [...Item.prototype._attributes, '_isolated', '_buffered']
    })
  }
}
