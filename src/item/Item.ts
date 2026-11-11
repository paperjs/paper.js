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
  Change,
  ChangeFlag,
  Color,
  CompoundPath,
  DrawEvent,
  EPSILON,
  Effect,
  EffectInstance,
  Emitter,
  GEOMETRIC_EPSILON,
  Group,
  HitResult,
  ItemSelection,
  Layer,
  LinkedPoint,
  LinkedRectangle,
  Matrix,
  Path,
  Point,
  Raster,
  Rectangle,
  Size,
  Style,
  Tween,
  addNamed,
  blend,
  capitalize,
  clamp,
  defineEvents,
  defineStyleAccessors,
  deserialize,
  equals,
  exportItemSVG,
  getCanvas,
  getContext,
  getUID,
  hyphenate,
  importSVG,
  inject,
  isPlainObject,
  isZero,
  nativeBlendModes,
  paper,
  releaseCanvas,
  removeNamed,
  serialize,
  splice
} from '../internal.ts'
import type { PaperScope } from '../core/PaperScope.ts'
import type { PointLike } from '../basic/Point.ts'
import type { RectangleLike } from '../basic/Rectangle.ts'
import type { ColorLike } from '../style/Color.ts'
import type { Project } from './Project.ts'
import type { SymbolDefinition } from './SymbolDefinition.ts'
import type { View } from '../view/View.ts'
import type { PathItem } from '../path/PathItem.ts'
import type { ItemDefinition } from './ItemDefinition.ts'

type Handler = (this: Item, ...args: any[]) => any

type EffectProps = {
  type: string
  parameters?: Record<string, any>
  visible?: boolean
}

type TweenOptions = {
  duration?: number
  easing?: string | ((t: number) => number)
  start?: boolean
}

/**
 * The kinds of bounds that {@link Item#getBounds(matrix, options)} returns.
 */
export type BoundsOptions = {
  stroke?: boolean
  handle?: boolean
  internal?: boolean
  // The item that caches the bounds, and the transformation to predict, see
  // Item#_getCachedBounds() and Item#strokeBounds:
  cacheItem?: Item
  transform?: { matrix: Matrix; item: Item }
}

/**
 * The Item type allows you to access and modify the items in Paper.js
 * projects. Its functionality is inherited by different project item types
 * such as {@link Path}, {@link CompoundPath}, {@link Group}, {@link Layer} and
 * {@link Raster}. They each add a layer of functionality that is unique to
 * their type, but share the underlying properties and functions that they
 * inherit from Item.
 */
export class Item extends Emitter {
  /**
   * Two object constants that can be passed to Item#_initialize() to
   * control insertion into the scene graph in a performative way.
   *
   * @private
   */
  static INSERT = { insert: true }
  static NO_INSERT = { insert: false }

  // The handlers of the mouse events that the view dispatches to items:
  static _itemHandlers = [
    'onMouseDown', 'onMouseUp', 'onMouseDrag', 'onClick', 'onDoubleClick',
    'onMouseMove', 'onMouseEnter', 'onMouseLeave'
  ]

  // The classes with draw handlers, for hosts that draw the items themselves,
  // see Project#hasDrawHandlers():
  static _drawCount = 0

  // NOTE: Item classes keep their state in `_` fields rather than `#` fields:
  // Hosted items are created as shells with Object.create(), without their
  // constructor, see Project#host, and would lack them.

  // The prototype defaults, which #copyAttributes() tells from values that
  // are set, see the static block below:
  declare _name: string
  declare _applyMatrix: boolean
  declare _canApplyMatrix: boolean
  declare _canScaleStroke: boolean
  declare _pivot: Point
  declare _visible: boolean
  declare _blendMode: string
  declare _opacity: number
  declare _locked: boolean
  declare _guide: boolean
  declare _textWrap: { offset: number; invert: boolean }
  declare _clipMask: boolean
  declare _selection: number
  declare _selectBounds: boolean
  declare _selectChildren: boolean
  declare _serializeFields: Record<string, any>
  declare _attributes: string[]
  declare _prioritize: string[]
  // The defaults of subclasses, read here:
  declare _boundsOptions: BoundsOptions
  declare _buffered: boolean
  // Set by the subclasses that can have children:
  declare _children: Item[]
  declare _namedChildren: Record<string, Item[]>

  _id: number
  _parent: Item
  _index: number
  _project: Project
  _matrix: Matrix
  _style: Style
  _data: Record<string, any>
  // The caches of #bounds, #position, #rotation / #scaling and
  // #globalMatrix, the latter with the parent's global matrix it was built
  // from:
  _bounds: Record<string, any>
  _position: Point
  _decomposed: ReturnType<Matrix['decompose']>
  _globalMatrix: Matrix
  _parentGlobalMatrix: Matrix
  // The items whose cached bounds this item's children contribute to, see
  // Item._updateBoundsCache():
  _boundsCache: { ids: Record<number, Item>; list: Item[] }
  // The version of the project's drawing in which the item was drawn last:
  _updateVersion: number
  // The definition that this item is the item of, see SymbolDefinition:
  _symbol: ItemDefinition
  // The canvas that buffered groups draw into, see Group#buffered:
  declare _buffer: any
  // The live effects of the item, see #effects:
  declare _effects: EffectInstance[] | null
  // The cached output of the effects, see #getEffectOutput():
  declare _effectOutput: Item
  // The version of the registered effects that #_effectOutput is from:
  declare _effectVersion: number
  // Set on the shells of hosted items, see Project#host:
  declare _shell: boolean
  // The definition of SymbolItem, read here:
  declare _definition: SymbolDefinition

  // Item has no constructor of its own: Its subclasses call super(), set up
  // what they need, and then call #_initialize().

  /**
   * Private helper for the constructors of the subclasses that tries setting
   * properties from the passed props object, and applies the point
   * translation to the internal matrix.
   *
   * @param props the properties to be applied to the item
   * @param point the point by which to transform the internal matrix
   * @return {@true if the properties were successfully be applied, or if none
   *     were provided}
   */
  _initialize(props?: any, point?: PointLike): boolean {
    // Define this Item's unique id. But allow the creation of internally
    // used paths with no ids.
    const hasProps = isPlainObject(props)
    const internal = hasProps && props.internal === true
    const matrix = (this._matrix = new Matrix())
    // Allow setting another project than the currently active one.
    const project = hasProps && props.project || paper.project
    const { settings } = paper
    if (!project) {
      throw new Error(
        'Unable to create an item without a project. ' +
        'Call paper.setup() or create a Project first.'
      )
    }
    this._id = internal ? null : getUID()
    this._parent = this._index = null
    // Handle matrix before everything else, to avoid issues with
    // #addChild() calling _changed() and accessing _matrix already.
    if (point) {
      matrix.translate(point)
    }
    matrix._owner = this
    this._initializeContent(project)
    // Do not add to the project if it's an internal path,  or if
    // props.insert  or settings.insertItems is false.
    if (
      internal ||
      hasProps && props.insert == false ||
      !settings.insertItems && !(hasProps && props.insert == true)
    ) {
      this._setProject(project)
    } else {
      // Pass true for _created:
      ;(hasProps && props.parent || project)._insertItem(undefined, this, true)
    }
    // Filter out Item.*INSERT before set(), for performance reasons.
    if (hasProps && props !== Item.NO_INSERT && props !== Item.INSERT) {
      this.set(props, {
        // Filter out these properties as they were handled above:
        internal: true,
        insert: true,
        project: true,
        parent: true
      })
    }
    return hasProps
  }

  // Sets up the content of the item, leaving its identity, parent and matrix
  // alone. #_initialize() calls it, and so does the loading of hosted items,
  // see Project#host. Subclasses add their content:
  // @overridable
  _initializeContent(project: Project) {
    // Inherit the applyMatrix setting from settings.applyMatrix
    this._applyMatrix = this._canApplyMatrix && paper.settings.applyMatrix
    this._style = new Style(this._getCurrentStyle(project), this, project)
  }

  // The style a new item takes: the project's current style, see
  // Project#currentStyle.
  _getCurrentStyle(project: Project): Style {
    return project._currentStyle
  }

  _serialize(options: any, dictionary: any): any[] {
    const props = {}
    const serializeFields = (fields: Record<string, any>) => {
      for (const key in fields) {
        // value is the default value, only serialize if the current value is
        // different from it.
        const value = this[key]
        if (!equals(value, fields[key])) {
          props[key] = serialize(
            value,
            options,
            // Do not use compact mode for data
            key !== 'data',
            dictionary
          )
        }
      }
    }

    // Serialize fields that this Item subclass defines first
    serializeFields(this._serializeFields)
    // Serialize style fields, but only if they differ from defaults.
    // Do not serialize styles on Groups and Layers, since they just unify
    // their children's own styles.
    if (!(this instanceof Group)) {
      serializeFields(this._style._defaults)
    }
    // There is no compact form for Item serialization, we always keep the
    // class.
    return [this.className, props]
  }

  /**
   * Private notifier that is called whenever a change occurs in this item or
   * its sub-elements, such as Segments, Curves, Styles, etc.
   *
   * @param flags describes what exactly has changed
   */
  _changed(flags: number) {
    const symbol = this._symbol
    const cacheParent = this._parent ?? symbol
    const project = this._project
    if (flags & ChangeFlag.GEOMETRY) {
      // Clear cached bounds, position and decomposed matrix whenever
      // geometry changes.
      this._bounds = this._position = this._decomposed = undefined
    } else if (flags & ChangeFlag.STROKE) {
      // Strokes change the stroke bounds, but not the position:
      this._bounds = undefined
    }
    if (flags & ChangeFlag.MATRIX) {
      this._globalMatrix = undefined
    }
    if (cacheParent && flags & (ChangeFlag.GEOMETRY | ChangeFlag.STROKE)) {
      // Clear cached bounds of all items that this item contributes to.
      // We call this on the parent, since the information is cached on
      // the parent, see getBounds().
      Item._clearBoundsCache(cacheParent)
    }
    if (flags & ChangeFlag.CHILDREN) {
      // Clear cached bounds of all items that this item contributes to.
      // Here we don't call this on the parent, since adding / removing a
      // child triggers this notification on the parent.
      Item._clearBoundsCache(this)
    }
    // Changes of appearance make the buffers of the item and the groups
    // that contain it stale, see Group#buffered, as well as the output of
    // their effects, see #getEffectOutput(), and change the definition
    // that the top-most of them is the item of, notified below for itself:
    if (flags & ChangeFlag.APPEARANCE) {
      for (let item: Item = this; item; item = item._parent) {
        if (item._buffer) {
          item._buffer.matrix = null
        }
        item._effectOutput = undefined
        if (item._symbol && item !== this) {
          item._symbol._changed(flags)
        }
      }
    }
    // Changes of a text wrap, or of what's in it, change the text it wraps:
    for (
      let item: Item = this;
      item && !(item instanceof Layer);
      item = item._parent
    ) {
      if (item._textWrap) {
        const { layer } = item
        if (layer) {
          layer._textWrapVersion++
        }
        break
      }
    }
    // A child that its parent doesn't show is part of the parent, as a
    // text's path is: its changes are the parent's.
    const isOwner = this._getChangeOwner() === this
    if (project) {
      project._changed(flags, isOwner ? this : null)
    }
    if (!isOwner) {
      this._parent._changed(flags)
    }
    // If this item is a symbol's definition, notify it of the change too
    if (symbol) {
      symbol._changed(flags)
    }
  }

  // The item that the changes of this item are logged for: itself, or the
  // parent that doesn't show it as a child, as a text doesn't show its path.
  _getChangeOwner(): Item {
    const parent = this._parent
    return parent && !parent.children ? parent._getChangeOwner() : this
  }

  /**
   * Sets the properties of the passed object literal on this item to the
   * values defined in the object literal, if the item has property of the
   * given name (or a setter defined for it).
   *
   * @param props
   * @param exclude an object that can define any properties as `true` that
   *     should be excluded
   * @return the item itself
   * @chainable
   *
   * @example {@paperscript}
   * // Setting properties through an object literal
   * var circle = Path.circle({
   *     center: [80, 50],
   *     radius: 35
   * });
   *
   * circle.set({
   *     strokeColor: 'red',
   *     strokeWidth: 10,
   *     fillColor: 'black',
   *     selected: true
   * });
   */
  set(props: object, exclude?: Record<string, boolean>): this {
    if (props) {
      // Set the prioritized keys first, in their order, then the others:
      const keys = new Set([
        ...this._prioritize.filter(key => key in props),
        ...Object.keys(props)
      ])
      for (const key of keys) {
        const value = props[key]
        if (value !== undefined && !(exclude && key in exclude)) {
          this[key] = value
        }
      }
    }
    return this
  }

  /**
   * Renders the item to a string, with its class name and its name, or its
   * id if it has no name.
   */
  toString(): string {
    const name = this._name
    return this.className + (name ? ` '${name}'` : ` @${this._id}`)
  }

  /**
   * The unique id of the item.
   *
   * @readonly
   */
  get id(): number {
    return this._id
  }

  /**
   * The class name of the item as a string.
   *
   * @values 'Group', 'Layer', 'Path', 'CompoundPath', 'Shape', 'Raster',
   *     'SymbolItem', 'PointText'
   */
  declare readonly className: string

  /**
   * The name of the item. If the item has a name, it can be accessed by name
   * through its parent's children list.
   *
   * @example {@paperscript}
   * var path = Path.circle({
   *     center: [80, 50],
   *     radius: 35
   * });

   * // Set the name of the path:
   * path.name = 'example';
   *
   * // Create a group and add path to it as a child:
   * var group = new Group();
   * group.addChild(path);
   *
   * // The path can be accessed by name:
   * group.children['example'].fillColor = 'red';
   */
  get name(): string {
    return this._name
  }

  set name(name: string) {
    // NOTE: Don't check if the name has changed and bail out if it has not,
    // because the setter is used internally also to update internal
    // structures when an item is moved from one parent to another.

    // If the item already had a name, remove the reference to it from the
    // parent's children object:
    if (this._name) {
      this._removeNamed()
    }
    // See if the name is a simple number, which we cannot support due to
    // the named lookup on the children array.
    if (name === +name + '') {
      throw new Error('Names consisting only of numbers are not supported.')
    }
    const owner = this._getOwner()
    if (name && owner) {
      addNamed(owner._children, owner._namedChildren, name, this)
    }
    this._name = name || undefined
    this._changed(ChangeFlag.ATTRIBUTE)
  }

  /**
   * The path style of the item.
   *
   * Styles set on a {@link Group} or {@link Layer} are applied to the
   * children that it contains at that moment. Items added to it later do not
   * receive them.
   *
   * @example {@paperscript}
   * // Applying several styles to an item in one go, by passing an object
   * // to its style property:
   * var circle = Path.circle({
   *     center: [80, 50],
   *     radius: 30
   * });
   * circle.style = {
   *     fillColor: 'blue',
   *     strokeColor: 'red',
   *     strokeWidth: 5
   * };
   *
   * @example {@paperscript split=true height=100}
   * // Copying the style of another item:
   * var path = Path.circle({
   *     center: [50, 50],
   *     radius: 30,
   *     fillColor: 'red'
   * });
   *
   * var path2 = Path.circle({
   *     center: new Point(180, 50),
   *     radius: 20
   * });
   *
   * // Copy the path style of path:
   * path2.style = path.style;
   *
   * @example {@paperscript}
   * // Applying the same style object to multiple items:
   * var myStyle = {
   *     fillColor: 'red',
   *     strokeColor: 'blue',
   *     strokeWidth: 4
   * };
   *
   * var path = Path.circle({
   *     center: [50, 50],
   *     radius: 30
   * });
   * path.style = myStyle;
   *
   * var path2 = Path.circle({
   *     center: new Point(150, 50),
   *     radius: 20
   * });
   * path2.style = myStyle;
   */
  get style(): Style {
    return this._style
  }

  set style(style: Style | object) {
    // Don't access _style directly so the style getter can be overridden for
    // CompoundPaths.
    this.style.set(style)
  }

  // The styles that the item's style stands for, merged when read and set on
  // all when written, see Style.merge() and Style.apply().
  // @overridable
  _getStyles(style?: Style, key?: string, setting?: boolean): Style[] | null {
    // None for plain items: their style is their own.
    return null
  }

  /**
   * Specifies whether, and how, the item pushes aside the text of the
   * {@link AreaText} items below it in its layer: `null`, or an object with
   * `offset`, the space kept between them, and `invert`, to let the text
   * flow inside it instead. `true` sets the defaults.
   *
   * @default null
   *
   * @example
   * var circle = Path.circle({ center: [100, 100], radius: 40 });
   * circle.textWrap = { offset: 10 };
   */
  get textWrap(): { offset: number; invert: boolean } | null {
    const wrap = this._textWrap
    return wrap && { ...wrap }
  }

  set textWrap(
    wrap: { offset?: number; invert?: boolean } | boolean | null
  ) {
    if (wrap || this._textWrap) {
      this._textWrap = wrap
        ? {
            offset: 6,
            invert: false,
            ...(isPlainObject(wrap) ? (wrap as object) : null)
          }
        : null
      this._updateTextWrap()
      this._changed(Change.ATTRIBUTE)
    }
  }

  // Keep the layer's text wraps in sync, and have its area texts lay out
  // again, see AreaText#_getTextWraps():
  _updateTextWrap(remove?: boolean) {
    const { layer } = this
    if (layer) {
      const items = (layer._textWrapItems ??= {})
      if (this._textWrap && !remove) {
        items[this._id] = this
      } else {
        delete items[this._id]
      }
      layer._textWrapVersion++
    }
  }

  /**
   * The selection state of the item, a combination of the flags in
   * `ItemSelection`.
   *
   * @private
   */
  get selection(): number {
    return this._selection
  }

  set selection(selection: number) {
    if (selection !== this._selection) {
      this._selection = selection
      const project = this._project
      if (project) {
        project._updateSelection(this)
        // The project draws the selection over the items, so it
        // doesn't change them, nor the buffers they're drawn into:
        project._changed(Change.ATTRIBUTE, this._getChangeOwner())
      }
    }
  }

  _changeSelection(flag: number, selected: boolean) {
    const selection = this._selection
    this.selection = selected ? selection | flag : selection & ~flag
  }

  /**
   * Specifies whether the item is selected. This will also return `true` for
   * {@link Group} items if they are partially selected, e.g. groups
   * containing selected or partially selected paths.
   *
   * Paper.js draws the visual outlines of selected items on top of your
   * project. This can be useful for debugging, as it allows you to see the
   * construction of paths, position of path curves, individual segment points
   * and bounding boxes of symbol and raster items.
   *
   * @default false
   * @see Project#selectedItems
   * @see Segment#selected
   * @see Curve#selected
   * @see Point#selected
   *
   * @example {@paperscript}
   * // Selecting an item:
   * var path = Path.circle({
   *     center: [80, 50],
   *     radius: 35
   * });
   * path.selected = true; // Select the path
   */
  get selected(): boolean {
    if (this._selectChildren) {
      for (const child of this._children) {
        if (child.selected) {
          return true
        }
      }
    }
    return !!(this._selection & ItemSelection.ITEM)
  }

  set selected(selected: boolean) {
    if (this._selectChildren) {
      for (const child of this._children) {
        child.selected = selected
      }
    }
    this._changeSelection(ItemSelection.ITEM, selected)
  }

  /**
   * Specifies whether the item and all its descendants are selected. Setting
   * it selects or deselects them all.
   */
  get fullySelected(): boolean {
    const children = this._children
    const selected = !!(this._selection & ItemSelection.ITEM)
    if (children && selected) {
      for (const child of children) {
        if (!child.fullySelected) {
          return false
        }
      }
      return true
    }
    // If there are no children, this is the same as #selected
    return selected
  }

  set fullySelected(selected: boolean) {
    const children = this._children
    if (children) {
      for (const child of children) {
        child.fullySelected = selected
      }
    }
    this._changeSelection(ItemSelection.ITEM, selected)
  }

  /**
   * Specifies whether the item defines a clip mask. This can only be set on
   * paths and compound paths, and only if the item is already contained
   * within a clipping group.
   *
   * @default false
   */
  get clipMask(): boolean {
    return this._clipMask
  }

  set clipMask(clipMask: boolean) {
    // On-the-fly conversion to boolean:
    const isClipMask = !!clipMask
    if (this._clipMask != isClipMask) {
      this._clipMask = isClipMask
      if (isClipMask) {
        this.fillColor = null
        this.strokeColor = null
      }
      this._changed(Change.ATTRIBUTE)
      // Tell the parent the clipping mask has changed
      this._parent?._changed(ChangeFlag.CLIPPING)
    }
  }

  // TODO: get/setIsolated (print specific feature)
  // TODO: get/setKnockout (print specific feature)
  // TODO: get/setAlphaIsShape

  /**
   * A plain javascript object which can be used to store
   * arbitrary data on the item.
   *
   * @example
   * var path = new Path();
   * path.data.remember = 'milk';
   *
   * @example
   * var path = new Path();
   * path.data.malcolm = new Point(20, 30);
   * console.log(path.data.malcolm.x); // 20
   *
   * @example
   * var path = new Path();
   * path.data = {
   *     home: 'Omicron Theta',
   *     found: 2338,
   *     pets: ['Spot']
   * };
   * console.log(path.data.pets.length); // 1
   *
   * @example
   * var path = new Path({
   *     data: {
   *         home: 'Omicron Theta',
   *         found: 2338,
   *         pets: ['Spot']
   *     }
   * });
   * console.log(path.data.pets.length); // 1
   */
  get data(): Record<string, any> {
    return (this._data ??= {})
  }

  set data(data: Record<string, any>) {
    this._data = data
  }

  /**
   * {@grouptitle Position and Bounding Boxes}
   *
   * The item's position within the parent item's coordinate system. By
   * default, this is the {@link Rectangle#center} of the item's
   * {@link #bounds} rectangle.
   *
   * @example {@paperscript}
   * // Changing the position of a path:
   *
   * // Create a circle at position { x: 10, y: 10 }
   * var circle = Path.circle({
   *     center: new Point(10, 10),
   *     radius: 10,
   *     fillColor: 'red'
   * });
   *
   * // Move the circle to { x: 20, y: 20 }
   * circle.position = new Point(20, 20);
   *
   * // Move the circle 100 points to the right and 50 points down
   * circle.position += new Point(100, 50);
   *
   * @example {@paperscript split=true height=100}
   * // Changing the x coordinate of an item's position:
   *
   * // Create a circle at position { x: 20, y: 20 }
   * var circle = Path.circle({
   *     center: new Point(20, 20),
   *     radius: 10,
   *     fillColor: 'red'
   * });
   *
   * // Move the circle 100 points to the right
   * circle.position.x += 100;
   */
  get position(): Point {
    return this._getPosition()
  }

  set position(point: PointLike) {
    // Calculate the distance to the current position, by which to
    // translate the item. Pass true for _dontLink, as we do not need a
    // LinkedPoint to simply calculate this distance.
    this.translate(Point.from(point).subtract(this._getPosition(true)))
  }

  _getPosition(_dontLink?: boolean): Point {
    // Cache position value. Do not cache LinkedPoints directly, since we
    // would not be able to use them to calculate the difference in the
    // position setter, as when it is modified, it would hold new values
    // already and only then cause the calling of the setter.
    const { x, y } = (this._position ??= this._getPositionFromBounds())
    // Pass true for _dontLink to receive back a normal point:
    return _dontLink
      ? new Point(x, y)
      : new LinkedPoint(x, y, this, 'position')
  }

  /**
   * Internal method used to calculate position either from pivot point or
   * bounds.
   *
   * @param bounds if provided, these bounds are used instead of calling
   *     getBounds()
   * @return the transformed pivot point or the center of the bounds
   * @private
   */
  _getPositionFromBounds(bounds?: Rectangle): Point {
    // If an pivot point is provided, use it to determine position
    // based on the matrix. Otherwise use the center of the bounds.
    return this._pivot
      ? this._matrix._transformPoint(this._pivot)
      : (bounds ?? this.getBounds())._getCenter(true)
  }

  /**
   * The item's pivot point specified in the item coordinate system, defining
   * the point around which all transformations are hinging. This is also the
   * reference point for {@link #position}. By default, it is set to `null`,
   * meaning the {@link Rectangle#center} of the item's {@link #bounds}
   * rectangle is used as pivot.
   *
   * @default null
   */
  get pivot(): Point | null {
    const pivot = this._pivot
    return pivot ? new LinkedPoint(pivot.x, pivot.y, this, 'pivot') : null
  }

  set pivot(point: PointLike | null) {
    // Clone existing points since we're caching internally.
    this._pivot = point != null ? new Point(point) : null
    // No need for _changed() since the only thing this affects is _position
    this._position = undefined
  }

  /**
   * The bounding rectangle of the item excluding stroke width.
   */
  get bounds(): Rectangle {
    const { x, y, width, height } = this.getBounds()
    // Return a LinkedRectangle that updates the item through the setter
    // whenever the bounds are changed:
    return new LinkedRectangle(x, y, width, height, this, 'bounds')
  }

  set bounds(rectangle: RectangleLike) {
    const rect = Rectangle.from(rectangle)
    let bounds = this.getBounds()
    const _matrix = this._matrix
    const matrix = new Matrix()
    // Read this from bottom to top:
    // Translate to new center:
    matrix.translate(rect.center)
    // Scale to new Size, if size changes. A zero dimension can't be
    // scaled, so keep its scaling at 1 to keep the matrix invertible:
    if (rect.width != bounds.width || rect.height != bounds.height) {
      // If a previous transformation resulted in a non-invertible matrix,
      // Restore to the last revertible matrix stored in _backup, and get
      // the bounds again. That way, we can prevent collapsing to 0-size.
      if (!_matrix.isInvertible()) {
        _matrix.set(
          _matrix._backup ?? new Matrix().translate(_matrix.translation)
        )
        bounds = this.getBounds()
      }
      matrix.scale(
        bounds.width !== 0 ? rect.width / bounds.width : 1,
        bounds.height !== 0 ? rect.height / bounds.height : 1
      )
    }
    // Translate to bounds center:
    const center = bounds.center
    matrix.translate(-center.x, -center.y)
    // Now execute the transformation
    this.transform(matrix)
  }

  /**
   * The bounding rectangle of the item including stroke width.
   *
   * Setting it fits the item's {@link #bounds} into the given rectangle minus
   * the extent of the stroke on each side, also where this extent changes
   * with the item's proportions, as with miters. A rectangle smaller than the
   * stroke itself shrinks the bounds to its center.
   */
  get strokeBounds(): Rectangle {
    const { x, y, width, height } = this.getStrokeBounds()
    // Link the rectangle to the setter, as #bounds is linked:
    return new LinkedRectangle(x, y, width, height, this, 'strokeBounds')
  }

  set strokeBounds(rectangle: RectangleLike) {
    const rect = Rectangle.from(rectangle)
    const bounds = this.getBounds()
    const center = bounds.center
    // Negative sizes mirror the item, as in the bounds setter:
    const signX = rect.width < 0 ? -1 : 1
    const signY = rect.height < 0 ? -1 : 1
    const width = Math.abs(rect.width)
    const height = Math.abs(rect.height)
    // Dimensions without size can't be scaled:
    const canScaleX = !!bounds.width
    const canScaleY = !!bounds.height
    // The smallest scale that keeps the matrix invertible, for
    // rectangles smaller than the stroke itself:
    const min = EPSILON
    const epsilon = GEOMETRIC_EPSILON
    let sx = 1
    let sy = 1

    const getMatrix = (sx: number, sy: number) =>
      new Matrix().scale(signX * sx, signY * sy, center)

    // Returns the stroke bounds that the item would have when scaled by sx
    // and sy, without transforming it. The strokes of items that apply the
    // scaling to their content keep their width, see #_getStrokeMatrix():
    const getStrokeBounds = (sx: number, sy: number) => {
      const matrix = getMatrix(sx, sy)
      return this.getBounds(matrix.appended(this._matrix), {
        stroke: true,
        transform: { matrix, item: this }
      })
    }

    // Under non-uniform scaling, the extent of the stroke changes with the
    // angles of miters, bevels and square caps, so solve for the scales
    // with Newton's method, estimating the derivatives from small changes:
    for (let i = 0; i < 16; i++) {
      const size = getStrokeBounds(sx, sy).size
      const fx = canScaleX ? size.width - width : 0
      const fy = canScaleY ? size.height - height : 0
      if (Math.abs(fx) < epsilon && Math.abs(fy) < epsilon) {
        break
      }
      // Small changes, but large enough to be measured at tiny scales:
      const hx = Math.max(sx, 1) * 1e-6
      const hy = Math.max(sy, 1) * 1e-6
      const sizeX = getStrokeBounds(sx + hx, sy).size
      const sizeY = getStrokeBounds(sx, sy + hy).size
      const a = canScaleX ? (sizeX.width - size.width) / hx : 1
      const b = canScaleX && canScaleY ? (sizeY.width - size.width) / hy : 0
      const c = canScaleX && canScaleY ? (sizeX.height - size.height) / hx : 0
      const d = canScaleY ? (sizeY.height - size.height) / hy : 1
      const det = a * d - b * c
      if (!det) {
        break
      }
      const nx = Math.max(sx - (fx * d - fy * b) / det, min)
      const ny = Math.max(sy - (fy * a - fx * c) / det, min)
      // Stop where rectangles smaller than the stroke keep the scales at
      // their minimum:
      if (nx === sx && ny === sy) {
        break
      }
      sx = nx
      sy = ny
    }
    // Scale the item, and move the center of its stroke bounds to the
    // rectangle's center, which centers what can't be reached:
    this.transform(
      new Matrix()
        .translate(rect.center.subtract(getStrokeBounds(sx, sy).center))
        .append(getMatrix(sx, sy))
    )
  }

  /**
   * Returns the bounding rectangle of the item, in the parent's coordinate
   * space, of the kind that the options describe.
   *
   * @option [options.stroke=false] {Boolean} include the stroke width, as
   *     {@link #strokeBounds} does
   * @option [options.handle=false] {Boolean} include the handles, as
   *     {@link #handleBounds} does
   * @option [options.internal=false] {Boolean} leave out the item's own
   *     matrix, as {@link #internalBounds} does
   *
   * @param [options] the kind of bounds
   * @return the bounds
   */
  getBounds(options?: BoundsOptions): Rectangle
  /**
   * Returns the bounding rectangle of the item, transformed by the matrix
   * instead of the item's own matrix, of the kind that the options describe.
   * See {@link #getBounds(options)} for the options.
   *
   * @param matrix the matrix to transform the item's content by
   * @param [options] the kind of bounds
   * @return the bounds
   */
  getBounds(matrix: Matrix, options?: BoundsOptions): Rectangle
  getBounds(
    matrix?: Matrix | BoundsOptions | null,
    options?: BoundsOptions
  ): Rectangle {
    const hasMatrix = options || matrix instanceof Matrix
    const opts = {
      ...(hasMatrix ? options : (matrix as BoundsOptions)),
      ...this._boundsOptions
    }
    // We can only cache the bounds if the path uses stroke-scaling, or if
    // no stroke is involved in the calculation of the bounds.
    // When strokeScaling is false, the bounds are affected by the zoom
    // level of the view, hence we can't cache.
    // TODO: Look more into handling of stroke-scaling, e.g. on groups with
    // some children that have strokeScaling, as well as SymbolItem with
    // SymbolDefinition that have strokeScaling!
    // TODO: Once that is resolved, we should be able to turn off
    // opts.stroke if a resolved item definition does not have a stroke,
    // allowing the code to share caches between #strokeBounds and #bounds.
    if (!opts.stroke || this.strokeScaling) {
      // If we're caching bounds, pass on this item as cacheItem, so
      // the children can setup _boundsCache structures for it.
      opts.cacheItem = this
    }
    return this._getCachedBounds(hasMatrix ? (matrix as Matrix) : null, opts)
      .rect
  }

  /**
   * Returns the bounding rectangle of the item including stroke width,
   * transformed by the matrix instead of the item's own matrix.
   *
   * @param [matrix] the matrix to transform the item's content by
   * @return the bounds
   */
  getStrokeBounds(matrix?: Matrix): Rectangle {
    return this.getBounds(matrix, { stroke: true })
  }

  /**
   * Protected method used in all the bounds getters. It loops through all the
   * children, gets their bounds and finds the bounds around all of them.
   * Subclasses override it to define calculations for the various required
   * bounding types.
   */
  _getBounds(
    matrix: Matrix,
    options: BoundsOptions
  ): Rectangle | { rect: Rectangle; nonscaling: boolean } {
    // NOTE: We cannot cache these results here, since we do not get
    // _changed() notifications here for changing geometry in children.
    // But cacheName is used in sub-classes such as SymbolItem and Raster.
    const children = this._children
    // TODO: What to return if nothing is defined, e.g. empty Groups?
    // Scriptographer behaves weirdly then too.
    if (!children || !children.length) {
      return new Rectangle()
    }
    // Call _updateBoundsCache() even when the group only holds empty /
    // invisible items), so future changes in these items will cause right
    // handling of _boundsCache.
    Item._updateBoundsCache(this, options.cacheItem)
    return Item._getBounds(children, matrix, options)
  }

  _getBoundsCacheKey(options: BoundsOptions, internal?: boolean): string {
    return [
      options.stroke ? 1 : 0,
      options.handle ? 1 : 0,
      internal ? 1 : 0
    ].join('')
  }

  /**
   * Private method that deals with the calling of _getBounds, recursive
   * matrix concatenation and handles all the complicated caching mechanisms.
   */
  _getCachedBounds(
    matrix: Matrix | null,
    options: BoundsOptions,
    noInternal?: boolean
  ): { rect: Rectangle; nonscaling: boolean } {
    // See if we can cache these bounds. We only cache the bounds
    // transformed with the internally stored _matrix, (the default if no
    // matrix is passed).
    // Do not transform by the internal matrix for internal, untransformed
    // bounds.
    const internal = options.internal && !noInternal
    const { cacheItem } = options
    const _matrix = internal ? null : this._matrix._orNullIfIdentity()
    // A passed identity matrix still replaces the internal matrix:
    const transform = matrix ? matrix._orNullIfIdentity() : _matrix
    // Create a key for caching, reflecting all bounds options.
    const cacheKey = (
      cacheItem &&
      (transform ? transform.equals(_matrix) : !_matrix) &&
      this._getBoundsCacheKey(options, internal)
    )
    // Only items whose bounds come from other items need to pass the
    // cacheItem chain on, so that clearing caches propagates up:
    const isIntermediate = (
      cacheKey &&
      cacheItem !== this &&
      (this._children || this._definition)
    )
    let bounds = this._bounds
    // NOTE: This needs to happen before returning cached values, since even
    // then, _boundsCache needs to be kept up-to-date.
    Item._updateBoundsCache(this._parent || this._symbol, cacheItem)
    if (isIntermediate) {
      Item._updateBoundsCache(this, cacheItem)
    }
    if (cacheKey && bounds && cacheKey in bounds) {
      const cached = bounds[cacheKey]
      return {
        rect: cached.rect.clone(),
        nonscaling: cached.nonscaling
      }
    }
    const res = this._getBounds(
      transform,
      isIntermediate ? { ...options, cacheItem: this } : options
    )
    // Support two versions of _getBounds(): One that directly returns a
    // Rectangle, and one that returns a bounds object with nonscaling.
    const rect = res instanceof Rectangle ? res : res.rect
    const style = this._style
    const nonscaling = (
      !(res instanceof Rectangle) && res.nonscaling ||
      style.hasStroke() && !style.strokeScaling
    )
    // If we can cache the result, update the _bounds cache structure
    // before returning
    if (cacheKey) {
      bounds = this._bounds ??= {}
      bounds[cacheKey] = {
        rect: rect.clone(),
        nonscaling,
        stroke: options.stroke,
        // Mark as internal, so Item#transform() won't transform it
        internal
      }
    }
    return { rect, nonscaling }
  }

  /**
   * Returns to correct matrix to use to transform stroke related geometries
   * when calculating bounds: the item's matrix if {@link #strokeScaling} is
   * `true`, otherwise the parent's inverted view matrix. The returned matrix
   * is always shiftless, meaning its translation vector is reset to zero.
   */
  _getStrokeMatrix(matrix: Matrix, options?: BoundsOptions): Matrix {
    const parent = this.strokeScaling
      ? null
      : options?.internal
        ? this
        : this._parent ?? this._symbol?._item
    let mx = parent ? parent.viewMatrix.invert() : matrix
    const transform = !parent && options?.transform
    // When predicting the bounds after a transformation, see
    // #strokeBounds, it doesn't scale the strokes of items that apply it to
    // their content, all the way up to the transformed item:
    if (transform) {
      for (let item: Item = this; item?._applyMatrix; item = item._parent) {
        if (item === transform.item) {
          mx = transform.matrix.inverted().appended(mx)
          break
        }
      }
    }
    return mx?._shiftless() ?? null
  }

  /**
   * Set up a boundsCache structure that keeps track of items that keep
   * cached bounds that depend on this item. We store this in the parent,
   * for multiple reasons:
   * The parent receives CHILDREN change notifications for when its
   * children are added or removed and can thus clear the cache, and we
   * save a lot of memory, e.g. when grouping 100 items and asking the
   * group for its bounds. If stored on the children, we would have 100
   * times the same structure.
   *
   * @private
   */
  static _updateBoundsCache(parent: any, item: Item) {
    if (parent && item) {
      // Set-up the parent's boundsCache structure if it does not
      // exist yet and add the item to it.
      const id = item._id
      const ref = (parent._boundsCache ??= {
        // Use a hash-table for ids and an array for the list,
        // so we can keep track of items that were added already
        ids: {},
        list: []
      })
      if (!ref.ids[id]) {
        ref.list.push(item)
        ref.ids[id] = item
      }
    }
  }

  /**
   * Clears cached bounds of all items that the children of this item are
   * contributing to. See _updateBoundsCache() for an explanation why this
   * information is stored on parents, not the children themselves.
   *
   * @private
   */
  static _clearBoundsCache(item: any) {
    // This is defined as a static method so Symbol can used it too.
    // Clear the position as well, since it's depending on bounds.
    const cache = item._boundsCache
    if (cache) {
      // Erase cache before looping, to prevent circular recursion.
      item._bounds = item._position = item._boundsCache = undefined
      for (const other of cache.list) {
        if (other !== item) {
          other._bounds = other._position = undefined
          // We need to recursively call _clearBoundsCache, as
          // when the cache for the other item's children is not
          // valid anymore, that propagates up the scene graph.
          if (other._boundsCache) {
            Item._clearBoundsCache(other)
          }
        }
      }
    }
  }

  /**
   * Returns the bounds of the given items in project coordinates, as if
   * they were grouped, without moving them, e.g. the bounds of the
   * selection: `Item.getBounds(project.selectedItems)`. As in groups,
   * items that aren't visible or are empty are left out.
   *
   * @option [options.stroke=false] {Boolean} include the stroke widths,
   *     as {@link Item#strokeBounds} does
   * @option [options.handle=false] {Boolean} include the handles, as
   *     {@link Item#handleBounds} does
   *
   * @param items the items to get the bounds of
   * @param [options] the kind of bounds
   * @return the bounds of the items, empty if there are none
   */
  static getBounds(items: Item[], options?: BoundsOptions): Rectangle {
    return Item._getBounds(items, null, options, true).rect
  }

  /**
   * Gets the combined bounds of all specified items, transformed by the
   * matrix, or in project coordinates if global is set.
   *
   * @private
   */
  static _getBounds(
    items: Item[],
    matrix: Matrix | null,
    options?: BoundsOptions,
    global?: boolean
  ): { rect: Rectangle; nonscaling: boolean } {
    let x1 = Infinity
    let x2 = -x1
    let y1 = x1
    let y2 = x2
    let nonscaling = false
    // NOTE: As soon as one child-item has non-scaling strokes, the full
    // bounds need to be considered non-scaling for caching purposes.
    const opts = options ?? {}
    for (const item of items) {
      // Item is handled if it is visible and not recursively empty.
      // This avoid errors with nested empty groups (#1467).
      if (item._visible && !item.isEmpty(true)) {
        // Pass true for noInternal, since even when getting
        // internal bounds for this item, we need to apply the
        // matrices to its children.
        const bounds = item._getCachedBounds(
          global
            ? item._getGlobalMatrix(true)
            : matrix?.appended(item._matrix),
          opts,
          true
        )
        const { rect } = bounds
        x1 = Math.min(rect.x, x1)
        y1 = Math.min(rect.y, y1)
        x2 = Math.max(rect.x + rect.width, x2)
        y2 = Math.max(rect.y + rect.height, y2)
        if (bounds.nonscaling) {
          nonscaling = true
        }
      }
    }
    return {
      rect: isFinite(x1)
        ? new Rectangle(x1, y1, x2 - x1, y2 - y1)
        : new Rectangle(),
      nonscaling
    }
  }

  _decompose(): ReturnType<Matrix['decompose']> | null {
    // Only decompose if the item isn't directly baking transformations into
    // its content.
    return this._applyMatrix
      ? null
      : (this._decomposed ??= this._matrix.decompose())
  }

  /**
   * The current rotation angle of the item, as described by its
   * {@link #matrix}.
   * Please note that this only returns meaningful values for items with
   * {@link #applyMatrix} set to `false`, meaning they do not directly bake
   * transformations into their content.
   */
  get rotation(): number {
    const decomposed = this._decompose()
    // Return 0 if matrix wasn't decomposed, e.g. on items with #applyMatrix
    return decomposed?.rotation ?? 0
  }

  set rotation(rotation: number) {
    const current = this.rotation
    if (current != null && rotation != null) {
      // Preserve the cached _decomposed values over rotation, and only
      // update the rotation property on it.
      const decomposed = this._decomposed
      this.rotate(rotation - current)
      if (decomposed) {
        decomposed.rotation = rotation
        this._decomposed = decomposed
      }
    }
  }

  /**
   * The current scale factor of the item, as described by its
   * {@link #matrix}.
   * Please note that this only returns meaningful values for items with
   * {@link #applyMatrix} set to `false`, meaning they do not directly bake
   * transformations into their content.
   */
  get scaling(): Point {
    const decomposed = this._decompose()
    const s = decomposed?.scaling
    // Return [1, 1] if matrix wasn't decomposed, e.g. with #applyMatrix.
    return new LinkedPoint(s?.x ?? 1, s?.y ?? 1, this, 'scaling')
  }

  set scaling(scaling: PointLike | number) {
    const current = this.scaling
    // Clone existing points since we're caching internally.
    const value = scaling != null ? new Point(scaling) : null
    if (value && !current.equals(value)) {
      // See the rotation setter for preservation of _decomposed.
      const { rotation } = this
      const decomposed = this._decomposed
      const matrix = new Matrix()
      // Create a matrix in which the scaling is applied in the non-
      // rotated state, so it is always applied before the rotation.
      // TODO: What about skewing? Do we need separately stored values for
      // these properties, and apply them separately from the matrix?
      if (isZero(current.x) || isZero(current.y)) {
        // If current scaling is destructive (at least one axis is 0),
        // create a new matrix that applies the desired rotation,
        // translation and scaling, without also preserving skewing.
        matrix.translate(decomposed.translation)
        if (rotation) {
          matrix.rotate(rotation)
        }
        matrix.scale(value.x, value.y)
        this._matrix.set(matrix)
      } else {
        const center = this._getPosition(true)
        matrix.translate(center)
        if (rotation) {
          matrix.rotate(rotation)
        }
        matrix.scale(value.x / current.x, value.y / current.y)
        if (rotation) {
          matrix.rotate(-rotation)
        }
        matrix.translate(center.negate())
        this.transform(matrix)
      }
      if (decomposed) {
        decomposed.scaling = value
        this._decomposed = decomposed
      }
    }
  }

  /**
   * The item's transformation matrix, defining position and dimensions in
   * relation to its parent item in which it is contained.
   */
  get matrix(): Matrix {
    return this._matrix
  }

  set matrix(matrix: Matrix | number[]) {
    // Use Matrix#set() to easily copy over values.
    // NOTE: calling set() also calls #_changed() for us, and this also
    // handles _applyMatrix for us.
    this._matrix.set(matrix)
  }

  /**
   * The item's global transformation matrix in relation to the global project
   * coordinate space. Note that the view's transformations resulting from
   * zooming and panning are not factored in.
   */
  get globalMatrix(): Matrix {
    return this._getGlobalMatrix()
  }

  _getGlobalMatrix(_dontClone?: boolean): Matrix {
    const parent = this._parent
    const parentMatrix = parent?._getGlobalMatrix(true)
    let matrix = this._globalMatrix
    // The cached matrix is only valid if it was built from the parent's
    // current global matrix, which is replaced whenever it changes.
    if (!matrix || this._parentGlobalMatrix !== parentMatrix) {
      matrix = this._globalMatrix = this._matrix.clone()
      if (parentMatrix) {
        matrix.prepend(parentMatrix)
      }
      this._parentGlobalMatrix = parentMatrix
    }
    return _dontClone ? matrix : matrix.clone()
  }

  /**
   * The item's global matrix in relation to the view coordinate space. This
   * means that the view's transformations resulting from zooming and panning
   * are factored in.
   */
  get viewMatrix(): Matrix {
    return this.globalMatrix.prepend(this.view._matrix)
  }

  /**
   * Controls whether the transformations applied to the item (e.g. through
   * {@link #transform(matrix)}, {@link #rotate(angle)},
   * {@link #scale(scale)}, etc.) are stored in its {@link #matrix} property,
   * or whether they are directly applied to its contents or children (passed
   * on to the segments in {@link Path} items, the children of {@link Group}
   * items, etc.).
   *
   * @default true
   */
  get applyMatrix(): boolean {
    return this._applyMatrix
  }

  set applyMatrix(apply: boolean) {
    // Tell #transform() to apply the internal matrix if _applyMatrix
    // can be set to true.
    if ((this._applyMatrix = this._canApplyMatrix && !!apply)) {
      this.transform(null, true)
    }
  }

  /**
   * {@grouptitle Effects}
   *
   * The live effects of the item, in the order in which they apply, as the
   * instances of the {@link Effect effects} that they use. They derive what is
   * drawn from the item without changing it: drawing draws their output, and
   * {@link #previewBounds} measures it, while hit testing, {@link #bounds} and
   * {@link #strokeBounds} stay with the item itself. It is set to plain
   * objects describing them, `{ type, parameters, visible }`, with the `type`
   * of the effect. Changing the returned array directly isn't tracked, as with
   * {@link Path#segments}.
   *
   * Paper.js has these effects, and {@link Effect} creates more:
   *
   * - `offset`: offsets the paths, see {@link PathItem#offset()}, with the
   *   parameters `distance` (`0`), `join` (`'miter'`) and `miterLimit`
   *   (`10`).
   * - `outline`: outlines the strokes of the paths as filled areas next to
   *   their fills, see {@link PathItem#outline()}, following their
   *   {@link Path#strokeProfile}.
   *
   * @example {@paperscript}
   * var path = Path.star({
   *     center: view.center,
   *     points: 5,
   *     radius1: 20,
   *     radius2: 40,
   *     strokeColor: 'black',
   *     strokeWidth: 8
   * });
   * path.effects = [
   *     { type: 'offset', parameters: { distance: 10, join: 'round' } },
   *     { type: 'outline' }
   * ];
   */
  get effects(): EffectInstance[] {
    return this._effects ?? []
  }

  set effects(effects: EffectProps[] | null) {
    this.removeEffects()
    if (effects?.length) {
      this.insertEffects(0, effects)
    }
  }

  /**
   * Adds an effect at the end of the item's effects.
   *
   * @param effect the plain object describing the effect
   * @return the added instance
   */
  addEffect(effect: EffectProps): EffectInstance {
    return this.insertEffect(this.effects.length, effect)
  }

  /**
   * Inserts an effect into the item's effects at the given index.
   *
   * @param index the index at which to insert the effect
   * @param effect the plain object describing the effect
   * @return the inserted instance
   */
  insertEffect(index: number, effect: EffectProps): EffectInstance {
    return this.insertEffects(index, [effect])[0]
  }

  /**
   * Inserts effects into the item's effects at the given index.
   *
   * @param index the index at which to insert the effects
   * @param effects the plain objects describing the effects
   * @return the inserted instances
   */
  insertEffects(index: number, effects: EffectProps[]): EffectInstance[] {
    const list = (this._effects ??= [])
    const inserted = effects.map(effect => {
      const instance = new EffectInstance(effect)
      instance._item = this
      return instance
    })
    // Keeps the indices of the effects up to date:
    splice(list, inserted, index, 0)
    this._changed(Change.ATTRIBUTE)
    return inserted
  }

  /**
   * Removes the effect at the given index from the item's effects.
   *
   * @param index the index of the effect to remove
   * @return the removed instance, or `null`
   */
  removeEffect(index: number): EffectInstance | null {
    return this.removeEffects(index, index + 1)[0] ?? null
  }

  /**
   * Removes the effects from the start index to the end index from the item's
   * effects, or all of them.
   *
   * @param [start=0] the index of the first effect to remove
   * @param [end=effects.length] the index after the last one
   * @return the removed instances
   */
  removeEffects(start = 0, end?: number): EffectInstance[] {
    const list = this._effects
    let removed = []
    if (list) {
      removed = splice(list, null, start, (end ?? list.length) - start)
      for (const instance of removed) {
        instance._item = instance._index = null
      }
      if (removed.length) {
        this._changed(Change.ATTRIBUTE)
      }
      if (!list.length) {
        this._effects = null
      }
    }
    return removed
  }

  // Returns whether any of the item's effects are visible:
  _hasEffects(): boolean {
    return !!this._effects?.some(instance => instance._visible)
  }

  /**
   * Returns what the item's visible effects make of it, in the item's own
   * coordinates, outside of the scene graph, or `null` if it has none. It is
   * kept until the item, its content, its effects or the registered effects
   * change, so changing it isn't tracked.
   *
   * @return the output of the effects
   */
  getEffectOutput(): Item | null {
    let output = this._effectOutput
    if (output === undefined || this._effectVersion !== Effect._version) {
      const art = this._hasEffects() && this._getEffectArt()
      output = art ? this._applyEffects(art) ?? art : null
      this._effectOutput = output
      this._effectVersion = Effect._version
    }
    return output
  }

  // Applies the visible effects to the art in turn, and returns what they make
  // of it, or null if none applied:
  _applyEffects(art: Item): Item | null {
    let output = null
    for (const instance of this._effects ?? []) {
      const { effect } = instance
      const onApply = effect?.onApply
      // Unknown effects leave the art as it is:
      if (instance._visible && onApply) {
        output ??= art
        output = onApply.call(instance, { art: output, item: this }) || output
      }
    }
    return output
  }

  // Returns a copy of the item for its effects to apply to, in its own
  // coordinates, with the effects of its content expanded and without its own:
  _getEffectArt(): Item {
    const art = this.clone({ insert: false })
    art.effects = null
    art.matrix = new Matrix()

    function expand(source: Item, copy: Item) {
      const children = source._children
      if (children) {
        children.forEach((child, i) => {
          const output = child.getEffectOutput()
          if (output) {
            const transformed = output.clone({ insert: false })
            transformed.transform(child._matrix)
            copy._children[i].replaceWith(transformed)
          } else {
            expand(child, copy._children[i])
          }
        })
      }
    }

    expand(this, art)
    return art
  }

  /**
   * The bounds of what the item looks like with its effects, in the
   * coordinate space of its parent: of their output with its strokes, or of
   * its children's with their effects, and its {@link #strokeBounds} without
   * them, as Illustrator's "Use Preview Bounds".
   */
  get previewBounds(): Rectangle {
    return this.getPreviewBounds()
  }

  /**
   * Returns the bounds of what the item looks like with its effects, as
   * {@link #previewBounds}, in the coordinate space that the matrix maps to.
   *
   * @param matrix the matrix to transform the bounds with
   */
  getPreviewBounds(matrix?: Matrix): Rectangle {
    const output = this.getEffectOutput()
    const children = this._children
    // Without effects in it, it's the item's own:
    if (output || children && hasEffects(this)) {
      let bounds = null
      if (output) {
        bounds = output.strokeBounds
      } else {
        for (const child of children) {
          if (child._visible) {
            const rect = child.previewBounds
            bounds = bounds?.unite(rect) ?? rect
          }
        }
      }
      if (bounds) {
        return (
          matrix?.appended(this._matrix) ?? this._matrix
        )._transformBounds(bounds)
      }
    }
    return this.getStrokeBounds(matrix)
  }

  /**
   * {@grouptitle Project Hierarchy}
   * The project that this item belongs to.
   */
  get project(): Project {
    return this._project
  }

  _setProject(project: Project, installEvents?: boolean) {
    if (this._project !== project) {
      this._project = project
      const children = this._children
      if (children) {
        for (const child of children) {
          child._setProject(project)
        }
      }
    }
    // NOTE: _installEvents handles all children too!
    if (installEvents) {
      this._installEvents(true)
    }
  }

  /**
   * The view that this item belongs to.
   */
  get view(): View {
    return this._project._view
  }

  /**
   * The scope that this item belongs to, through its project.
   */
  get scope(): PaperScope {
    return this._project._scope
  }

  // Also call _installEvents on all children:
  // @override
  _installEvents(install: boolean) {
    super._installEvents(install)
    // Keep the project's selection and the layer's text wraps in sync with
    // insertion and removal:
    if (this._selection) {
      this._project._updateSelection(this, !install)
    }
    if (this._textWrap) {
      this._updateTextWrap(!install)
    }
    const children = this._children
    if (children) {
      for (const child of children) {
        child._installEvents(install)
      }
    }
  }

  /**
   * The layer that this item is contained within.
   */
  get layer(): Layer | null {
    let parent: Item = this
    while ((parent = parent._parent)) {
      if (parent instanceof Layer) {
        return parent
      }
    }
    return null
  }

  /**
   * The item that this item is contained within.
   *
   * @example
   * var path = new Path();
   *
   * // New items are placed in the active layer:
   * console.log(path.parent == project.activeLayer); // true
   *
   * var group = new Group();
   * group.addChild(path);
   *
   * // Now the parent of the path has become the group:
   * console.log(path.parent == group); // true
   *
   * @example // Setting the parent of the item to another item
   * var path = new Path();
   *
   * // New items are placed in the active layer:
   * console.log(path.parent == project.activeLayer); // true
   *
   * var group = new Group();
   * path.parent = group;
   *
   * // Now the parent of the path has become the group:
   * console.log(path.parent == group); // true
   *
   * // The path is now contained in the children list of group:
   * console.log(group.children[0] == path); // true
   *
   * @example // Setting the parent of an item in the constructor
   * var group = new Group();
   *
   * var path = new Path({
   *     parent: group
   * });
   *
   * // The parent of the path is the group:
   * console.log(path.parent == group); // true
   *
   * // The path is contained in the children list of group:
   * console.log(group.children[0] == path); // true
   */
  get parent(): Item {
    return this._parent
  }

  set parent(item: Item) {
    item.addChild(this)
  }

  /**
   * Private helper to return the owner, either the parent, or the project
   * for top-level layers. See Layer#_getOwner()
   */
  _getOwner(): Item | Project {
    return this._parent
  }

  /**
   * The children items contained within this item. Items that define a
   * {@link #name} can also be accessed by name.
   *
   * Only {@link Group}, {@link Layer} and {@link CompoundPath} items can have
   * children. On all other items, such as {@link Path}, {@link Shape},
   * {@link Raster}, {@link SymbolItem} and {@link PointText}, `children` is
   * `undefined`.
   *
   * <b>Please note:</b> The children array should not be modified directly
   * using array functions. To remove single items from the children list, use
   * {@link Item#remove()}, to remove all items from the children list, use
   * {@link Item#removeChildren()}. To add items to the children list, use
   * {@link Item#addChild(item)} or {@link Item#insertChild(index,item)}.
   *
   * @example {@paperscript}
   * // Accessing items in the children array:
   * var path = Path.circle({
   *     center: [80, 50],
   *     radius: 35
   * });
   *
   * // Create a group and move the path into it:
   * var group = new Group();
   * group.addChild(path);
   *
   * // Access the path through the group's children array:
   * group.children[0].fillColor = 'red';
   *
   * @example {@paperscript}
   * // Accessing children by name:
   * var path = Path.circle({
   *     center: [80, 50],
   *     radius: 35
   * });
   * // Set the name of the path:
   * path.name = 'example';
   *
   * // Create a group and move the path into it:
   * var group = new Group();
   * group.addChild(path);
   *
   * // The path can be accessed by name:
   * group.children['example'].fillColor = 'orange';
   *
   * @example {@paperscript}
   * // Passing an array of items to item.children:
   * var path = Path.circle({
   *     center: [80, 50],
   *     radius: 35
   * });
   *
   * var group = new Group();
   * group.children = [path];
   *
   * // The path is the first child of the group:
   * group.firstChild.fillColor = 'green';
   */
  get children(): Item[] {
    return this._children
  }

  set children(items: Item[]) {
    this.removeChildren()
    this.addChildren(items)
  }

  /**
   * The first item contained within this item. This is a shortcut for
   * accessing `item.children[0]`.
   */
  get firstChild(): Item | null {
    return this._children?.[0] ?? null
  }

  /**
   * The last item contained within this item.This is a shortcut for
   * accessing `item.children[item.children.length - 1]`.
   */
  get lastChild(): Item | null {
    return this._children?.[this._children.length - 1] ?? null
  }

  /**
   * The next item on the same level as this item.
   */
  get nextSibling(): Item | null {
    const owner = this._getOwner()
    return owner?._children[this._index + 1] ?? null
  }

  /**
   * The previous item on the same level as this item.
   */
  get previousSibling(): Item | null {
    const owner = this._getOwner()
    return owner?._children[this._index - 1] ?? null
  }

  /**
   * The index of this item within the list of its parent's children.
   */
  get index(): number {
    return this._index
  }

  set index(index: number) {
    const parent = this._parent
    const children = parent?._children
    if (children) {
      parent.insertChildren(index in children ? index : undefined, [this])
    }
  }

  equals(item: Item): boolean {
    // NOTE: We do not compare name and selected state.
    // TODO: Consider not comparing locked and visible also?
    return !!(
      item === this || (
        item &&
        this.className === item.className &&
        this._style.equals(item._style) &&
        this._matrix.equals(item._matrix) &&
        this._locked === item._locked &&
        this._visible === item._visible &&
        this._blendMode === item._blendMode &&
        this._opacity === item._opacity &&
        this._clipMask === item._clipMask &&
        this._guide === item._guide &&
        equals(this._textWrap, item._textWrap) &&
        this._equals(item)
      )
    )
  }

  /**
   * A private helper for #equals(), to be overridden in sub-classes. When it
   * is called, item is always defined, of the same class as `this` and has
   * equal general state attributes such as matrix, style, opacity, etc.
   */
  // Subclasses narrow item to their own class, which equals() makes sure of:
  _equals(item: any): boolean {
    return equals(this._children, item._children)
  }

  /**
   * Clones the item within the same project and places the copy above the
   * item.
   *
   * @option [insert=true] specifies whether the copy should be
   *     inserted into the scene graph. When set to `true`, it is inserted
   *     above the original
   * @option [deep=true] specifies whether the item's children should also be
   *     cloned
   *
   * @param [options={ insert: true, deep: true }]
   *
   * @return the newly cloned item
   * @chainable
   *
   * @example {@paperscript}
   * // Cloning items:
   * var circle = Path.circle({
   *     center: [50, 50],
   *     radius: 10,
   *     fillColor: 'red'
   * });
   *
   * // Make 20 copies of the circle:
   * for (var i = 0; i < 20; i++) {
   *     var copy = circle.clone();
   *
   *     // Distribute the copies horizontally, so we can see them:
   *     copy.position.x += i * copy.bounds.width;
   * }
   */
  clone(options?: { insert?: boolean; deep?: boolean } | boolean): this {
    const copy = new (this.constructor as any)(Item.NO_INSERT)
    const children = this._children
    // `insert` follows settings.insertItems and `deep` is true by
    // default. Also support a boolean parameter for insert:
    const { insert = paper.settings.insertItems, deep = true } =
      typeof options === 'boolean' ? { insert: options } : options ?? {}
    // On items with children, for performance reasons due to the way that
    // styles are currently "flattened" into existing children, we need to
    // clone attributes first, then content.
    // For all other items, it's the other way around, since applying
    // attributes might have an impact on their content.
    if (children) {
      copy.copyAttributes(this)
    }
    // Only copy content if we don't have children or if we're ask to create
    // a deep clone, which is the default.
    if (!children || deep) {
      copy.copyContent(this)
    }
    if (!children) {
      copy.copyAttributes(this)
    }
    if (insert) {
      copy.insertAbove(this)
    }
    // Make sure we're not overriding the original name in the same parent
    let name = this._name
    const parent = this._parent
    if (name && parent) {
      const siblings = parent._children
      const original = name
      let i = 1
      while (siblings[name]) {
        name = original + ' ' + i++
      }
      if (name !== original) {
        copy.name = name
      }
    }
    return copy
  }

  /**
   * Copies the content of the specified item over to this item.
   *
   * @param source the item to copy the content from, of the same class as
   *     this item, as which subclasses read it
   */
  copyContent(source: any) {
    const children = source._children
    if (children) {
      // Clone all children and add them to the copy.
      for (const child of children) {
        this.addChild(child.clone(false))
      }
    }
  }

  /**
   * Copies all attributes of the specified item over to this item. This
   * includes its style, visibility, matrix, pivot, blend-mode, opacity,
   * selection state, data, name, etc.
   *
   * @param source the item to copy the attributes from
   * @param excludeMatrix whether to exclude the transformation
   * matrix when copying all attributes
   */
  copyAttributes(source: Item, excludeMatrix?: boolean) {
    // Copy over style
    this.style = source._style
    // Only copy over these fields if they are actually defined in 'source',
    // meaning the default value has been overwritten (default is on
    // prototype).
    for (const key of this._attributes) {
      if (Object.hasOwn(source, key)) {
        this[key] = source[key]
      }
    }
    // Use Matrix#set() to easily copy over values.
    if (!excludeMatrix) {
      this._matrix.set(source._matrix, true)
    }
    // We can't just set _applyMatrix as many item types won't allow it,
    // e.g. creating a Shape in Path#toShape().
    // Using the setter instead takes care of it.
    // NOTE: This will also bake in the matrix that we just initialized,
    // in case #applyMatrix is true.
    this.applyMatrix = source._applyMatrix
    this.pivot = source._pivot
    // Copy over the selection state, use the setter so the item
    // is also added to Project#_selectionItems if it is selected.
    this.selection = source._selection
    // Copy over data, name and effects as well.
    const data = source._data
    const name = source._name
    const effects = source._effects
    this._data = data ? { ...data } : null
    if (name) {
      this.name = name
    }
    this.effects = effects?.map(instance => instance._getProps())
  }

  /**
   * Rasterizes the item into a newly created Raster object. The item itself
   * is not removed after rasterization.
   *
   * @option [options.resolution=view.resolution] {Number} the desired
   *     resolution to be used when rasterizing, in pixels per inch (DPI). If
   *     not specified, the value of `view.resolution` is used by default.
   * @option [options.raster=null] {Raster} specifies a raster to be reused
   *     when rasterizing. If the raster has the desired size already, then the
   *     underlying canvas is reused and no new memory needs to be allocated.
   *     If no raster is provided, a new raster item is created and returned
   *     instead.
   * @option [options.insert=true] {Boolean} specifies whether the raster
   *     should be inserted into the scene graph. When set to `true`, it is
   *     inserted above the rasterized item.
   *
   * @param [options={}] the rasterization options
   * @return the reused raster or the newly created raster item
   *
   * @example {@paperscript}
   * // Rasterizing an item:
   * var circle = Path.circle({
   *     center: [50, 50],
   *     radius: 5,
   *     fillColor: 'red'
   * });
   *
   * // Create a rasterized version of the path:
   * var raster = circle.rasterize();
   *
   * // Move it 100pt to the right:
   * raster.position.x += 100;
   *
   * // Scale the path and the raster by 300%, so we can compare them:
   * circle.scale(5);
   * raster.scale(5);
   */
  rasterize(
    options: { resolution?: number; raster?: Raster; insert?: boolean } = {}
  ): Raster {
    const { resolution, insert = paper.settings.insertItems } = options
    const raster = options.raster ?? new Raster(Item.NO_INSERT)
    // What the item draws, with its effects:
    const bounds = this.previewBounds
    const scale = (resolution || this.view.resolution) / 72
    // Floor top-left corner and ceil bottom-right corner, to never
    // blur or cut pixels.
    const topLeft = bounds._getTopLeft(true).floor()
    const bottomRight = bounds._getBottomRight(true).ceil()
    const boundsSize = new Size(bottomRight.subtract(topLeft))
    const rasterSize = boundsSize.multiply(scale)
    // Pass `true` for clear, so reused rasters don't draw over old pixels.
    raster._setSize(rasterSize, true)

    if (!rasterSize.isZero()) {
      const ctx = raster._getContext(true)
      const matrix = new Matrix().translate(topLeft.negate())
      ctx.save()
      // Draw with the resolution as the pixel ratio, as views do:
      ctx.scale(scale, scale)
      matrix.applyToContext(ctx)
      this.draw(ctx, { matrices: [matrix], pixelRatio: scale })
      ctx.restore()
    }
    raster._matrix.set(
      new Matrix()
        .translate(topLeft.add(boundsSize.divide(2)))
        // Take resolution into account and scale back to original size.
        .scale(1 / scale)
    )
    if (insert) {
      raster.insertAbove(this)
    }
    return raster
  }

  /**
   * {@grouptitle Geometric Tests}
   *
   * Checks whether the item's geometry contains the given point.
   *
   * @example {@paperscript} // Click within and outside the star below
   * // Create a star shaped path:
   * var path = Path.star({
   *     center: [50, 50],
   *     points: 12,
   *     radius1: 20,
   *     radius2: 40,
   *     fillColor: 'black'
   * });
   *
   * // Whenever the user presses the mouse:
   * function onMouseDown(event) {
   *     // If the position of the mouse is within the path,
   *     // set its fill color to red, otherwise set it to
   *     // black:
   *     if (path.contains(event.point)) {
   *         path.fillColor = 'red';
   *     } else {
   *         path.fillColor = 'black';
   *     }
   * }
   *
   * @param point the point to check for
   */
  contains(point: PointLike | number, y?: number): boolean {
    // See CompoundPath#_contains() for the reason for !!
    const matrix = this._matrix
    return (
      matrix.isInvertible() &&
      !!this._contains(matrix._inverseTransform(Point.from(point, y)))
    )
  }

  _contains(point: Point): boolean {
    const children = this._children
    if (children) {
      for (let i = children.length - 1; i >= 0; i--) {
        if (children[i].contains(point)) {
          return true
        }
      }
      return false
    }
    // We only implement it here for items with rectangular content,
    // for anything else we need to override #contains()
    return point.isInside(this.internalBounds)
  }

  // DOCS:
  // TEST:
  /**
   * @param rect the rectangle to check against
   */
  isInside(rect: RectangleLike): boolean {
    return Rectangle.from(rect).contains(this.getBounds())
  }

  // Internal helper function, used at the moment for intersects check only.
  // TODO: Move #getIntersections() to Item, make it handle all type of items
  // through _asPathItem(), and support Group items as well, taking nested
  // matrices into account properly!
  _asPathItem(): PathItem {
    // Creates a temporary rectangular path item with this item's bounds.
    // Keep the matrix unapplied, so getIntersections() can override it:
    return Path.rectangle({
      rectangle: this.internalBounds,
      applyMatrix: false,
      matrix: this._matrix,
      insert: false
    })
  }

  /**
   * Checks whether the item overlaps with the given item: whether their
   * outlines cross, or one contains the other, as
   * {@link Rectangle#intersects(rect)} does for rectangles. Items other than
   * paths and shapes are checked through their bounds. To only check whether
   * outlines cross, use {@link PathItem#getIntersections(path)}.
   *
   * @param item the item to check against
   * @return {@true if the items overlap}
   */
  intersects(item: Item, _matrix?: Matrix): boolean {
    if (!(item instanceof Item)) {
      return false
    }
    const path1 = this._asPathItem()
    const path2 = item._asPathItem()
    const matrix1 = path1._matrix
    const matrix2 = _matrix ?? path2._matrix

    // Checks whether a point of any of the path's sub-paths lies inside
    // the other path, which then contains it, as the outlines don't cross:
    function contains(
      path: Item, matrix: Matrix,
      other: Item, otherMatrix: Matrix
    ) {
      for (const child of path._children ?? [path]) {
        const segment = (child as Path)._segments[0]
        const point = (
          segment &&
          otherMatrix._inverseTransform(matrix._transformPoint(segment._point))
        )
        if (point && other._contains(point)) {
          return true
        }
      }
      return false
    }

    // Tell getIntersections() to return as soon as some intersections are
    // found, because all we care for here is there are some or none:
    return (
      path1.getIntersections(path2, null, _matrix, true).length > 0 ||
      contains(path2, matrix2, path1, matrix1) ||
      contains(path1, matrix1, path2, matrix2)
    )
  }

  /**
   * {@grouptitle Hit-testing, Fetching and Matching Items}
   *
   * Performs a hit-test on the item and its children (if it is a {@link
   * Group} or {@link Layer}) at the location of the specified point,
   * returning the first found hit.
   *
   * The options object allows you to control the specifics of the hit-test.
   * Without options, `fill`, `stroke` and `segments` are hit-tested. As soon
   * as an options object is passed, only the hit-tests that it sets to `true`
   * are performed. It may contain a combination of the following values:
   *
   * @option [options.tolerance={@link PaperScope#settings}.hitTolerance]
   *     {Number} the tolerance of the hit-test, in project coordinates
   * @option options.class {Function} only hit-test against a specific item
   *     class, or any of its sub-classes, by providing the constructor
   *     function against which an `instanceof` check is performed:
   *     {@values  Group, Layer, Path, CompoundPath, Shape, Raster,
   *     SymbolItem, PointText, ...}
   * @option options.match {Function} a match function to be called for each
   *     found hit result: Return `true` to return the result, `false` to keep
   *     searching
   * @option options.fill {Boolean} hit-test the fill of items
   * @option options.stroke {Boolean} hit-test the stroke of path items,
   *     taking into account the setting of stroke color and width
   * @option options.segments {Boolean} hit-test for {@link Segment#point} of
   *     {@link Path} items
   * @option options.curves {Boolean} hit-test the curves of path items,
   *     without taking the stroke color or width into account
   * @option options.handles {Boolean} hit-test for the handles ({@link
   *     Segment#handleIn} / {@link Segment#handleOut}) of path segments.
   * @option options.ends {Boolean} only hit-test for the first or last
   *     segment points of open path items
   * @option options.position {Boolean} hit-test the {@link Item#position} of
   *     of items, which depends on the setting of {@link Item#pivot}
   * @option options.center {Boolean} hit-test the {@link Rectangle#center} of
   *     the bounding rectangle of items ({@link Item#bounds})
   * @option options.bounds {Boolean} hit-test the corners and side-centers of
   *     the bounding rectangle of items ({@link Item#bounds})
   * @option options.guides {Boolean} only hit-test items that have {@link
   *     Item#guide} set to `true`
   * @option options.selected {Boolean} only hit selected items
   *
   * @param point the point where the hit-test should be performed
   *     (in global coordinates system).
   * @param [options={ fill: true, stroke: true, segments: true,
   *     tolerance: settings.hitTolerance }]
   * @return a hit result object describing what exactly was hit
   *     or `null` if nothing was hit
   */
  hitTest(point: PointLike, options?: Record<string, any>): HitResult | null {
    return hitTest(this, point, options)
  }

  /**
   * Performs a hit-test on the item and its children (if it is a {@link
   * Group} or {@link Layer}) at the location of the specified point,
   * returning all found hits.
   *
   * The options object allows you to control the specifics of the hit-
   * test. See {@link #hitTest(point[, options])} for a list of all options.
   *
   * @param point the point where the hit-test should be performed
   *     (in global coordinates system).
   * @param [options={ fill: true, stroke: true, segments: true,
   *     tolerance: settings.hitTolerance }]
   * @return hit result objects for all hits, describing what
   *     exactly was hit or `null` if nothing was hit
   * @see #hitTest(point[, options]);
   */
  hitTestAll(point: PointLike, options?: Record<string, any>): HitResult[] {
    return hitTestAll(this, point, options)
  }

  _hitTestChildren(
    point: Point,
    options: Record<string, any>,
    viewMatrix?: Matrix,
    _exclude?: Item
  ): HitResult | null {
    return hitTestChildren(this, point, options, viewMatrix, _exclude)
  }

  _hitTest(
    point: Point,
    options: Record<string, any>,
    parentViewMatrix?: Matrix
  ): HitResult | null {
    // Shells of hosted items are rejected by their bounds below, as
    // checking for emptiness would load them:
    if (
      this._locked ||
      !this._visible ||
      this._guide && !options.guides ||
      !this._shell && this.isEmpty()
    ) {
      return null
    }

    // Check if the point is within the bounds including stroke and handles
    // + tolerance, but only if this item does not have children, since
    // we'd have to travel up the chain already to determine these bounds.
    // Shells of hosted items know them without loading their children.
    const matrix = this._matrix
    // If this is the first one in the recursion, the point is in global
    // coordinates, so transform it by the item's globalMatrix:
    const pointMatrix = parentViewMatrix ? matrix : this.globalMatrix
    // Keep the accumulated matrices up to this item in options, so we
    // can keep calculating the correct _tolerancePadding values.
    const viewMatrix = parentViewMatrix
      ? parentViewMatrix.appended(matrix)
      : // If this is the first one in the recursion, factor in the
        // zoom of the view and the globalMatrix of the item.
        pointMatrix.prepended(this.view._matrix)
    // Calculate the transformed padding as 2D size that describes the
    // transformed tolerance circle / ellipse. Make sure it's never 0
    // since we're using it for division (see checkBounds()).
    const tolerance = Math.max(options.tolerance, EPSILON)
    // Hit-tests are performed in the item's local coordinate space,
    // while the tolerance is in project coordinates. To calculate the
    // correct 2D padding for tolerance, we therefore need to apply the
    // inverted accumulated matrices without the view's matrix.
    const tolerancePadding = (options._tolerancePadding = new Size(
      Matrix._getCircleExtents(
        tolerance,
        viewMatrix.prepended(this.view._matrix.inverted())._shiftless().invert()
      )
    ))
    // Transform point to local coordinates.
    const localPoint = pointMatrix._inverseTransform(point)
    // If the matrix is non-reversible, point will now be `null`:
    if (
      !localPoint ||
      (this._shell || !this._children) &&
      !this.getBounds({ internal: true, stroke: true, handle: true })
        .expand(tolerancePadding.multiply(2))
        ._containsPoint(localPoint)
    ) {
      return null
    }

    // See if we should check self (own content), by filtering for type,
    // guides and selected items if that's required.
    const checkSelf = !(
      options.guides && !this._guide ||
      options.selected && !this.selected ||
      options.class && !(this instanceof options.class)
    )
    const { match } = options
    let bounds: Rectangle
    let res: HitResult

    const filter = (hit: HitResult | HitResult[]): HitResult => {
      // Path#_hitTestSelf() returns a list of all its hits when we're
      // collecting them, see hitTestAll():
      if (Array.isArray(hit)) {
        // Filter every hit, and return the first one that passes:
        return hit.map(filter).find(result => result) ?? null
      }
      let result = hit
      if (result && match && !match(result)) {
        result = null
      }
      // If we're collecting all matches, add it to options.all, with its
      // point in project coordinates, as it won't be returned through the
      // ancestors that transform it below:
      if (result && options.all) {
        if (result.point) {
          result.point = this.globalMatrix.transform(result.point)
        }
        options.all.push(result)
      }
      return result
    }

    const checkPoint = (type: string, part?: string) => {
      const pt = part ? bounds[part] : this.position
      // Since there are transformations, we cannot simply use a numerical
      // tolerance value. Instead, we divide by a padding size, see above.
      if (localPoint.subtract(pt).divide(tolerancePadding).length <= 1) {
        return new HitResult(type, this, {
          name: part ? hyphenate(part) : type,
          point: pt
        })
      }
    }

    const checkPosition = options.position
    const checkCenter = options.center
    const checkBounds = options.bounds
    // Ignore top level layers by checking for _parent:
    if (
      checkSelf &&
      this._parent &&
      (checkPosition || checkCenter || checkBounds)
    ) {
      if (checkCenter || checkBounds) {
        // Get the internal, untransformed bounds, as we check against
        // transformed points.
        bounds = this.internalBounds
      }
      res = (
        checkPosition && checkPoint('position') ||
        checkCenter && checkPoint('center', 'center')
      )
      if (!res && checkBounds) {
        // TODO: Move these into a static property on Rectangle?
        const points = [
          'topLeft', 'topRight', 'bottomLeft', 'bottomRight',
          'leftCenter', 'topCenter', 'rightCenter', 'bottomCenter'
        ]
        for (let i = 0; i < 8 && !res; i++) {
          res = checkPoint('bounds', points[i])
        }
      }
      res = filter(res)
    }

    if (!res) {
      res = (
        this._hitTestChildren(localPoint, options, viewMatrix) || (
          // NOTE: We don't call match on _hitTestChildren() because
          // it is already called internally.
          checkSelf &&
          filter(
            this._hitTestSelf(
              localPoint,
              options,
              viewMatrix,
              // If the item has a non-scaling stroke, we need to
              // apply the inverted viewMatrix to stroke dimensions.
              this.strokeScaling ? null : viewMatrix._shiftless().invert()
            )
          )
        ) ||
        null
      )
    }
    // Transform the point back to the outer coordinate system, unless it
    // was collected in project coordinates already, see filter():
    if (res?.point && !options.all) {
      res.point = pointMatrix.transform(res.point)
    }
    return res
  }

  _hitTestSelf(
    point: Point,
    options: Record<string, any>,
    // Used by the overrides:
    _viewMatrix?: Matrix,
    _strokeMatrix?: Matrix
  ): HitResult | HitResult[] | null {
    // The default implementation only handles 'fill' through #_contains(),
    // transparent fills too, see Path#_hitTestSelf():
    return options.fill && this.fillColor && this._contains(point)
      ? new HitResult('fill', this)
      : null
  }

  /**
   * Checks whether the item matches the criteria described by the given
   * object, by iterating over all of its properties and matching against
   * their values through {@link #matches(name, compare)}.
   *
   * See {@link Project#getItems(options)} for a selection of illustrated
   * examples.
   *
   * @param options the criteria to match against
   * @return {@true if the item matches all the criteria}
   * @see #getItems(options)
   */
  matches(options: object | ((item: Item) => boolean)): boolean
  /**
   * Checks whether the item matches the given criteria. Extended matching is
   * possible by providing a compare function or a regular expression.
   * Matching points, colors only work as a comparison of the full object, not
   * partial matching (e.g. only providing the x-coordinate to match all
   * points with that x-value). Partial matching does work for
   * {@link Item#data}.
   *
   * See {@link Project#getItems(options)} for a selection of illustrated
   * examples.
   *
   * @param name the name of the state to match against
   * @param compare the value, function or regular expression to
   * compare against
   * @return {@true if the item matches the state}
   * @see #getItems(options)
   */
  matches(name: string, compare: any): boolean
  matches(name: any, compare?: any): boolean {
    // matchObject() is used to match against objects in a nested manner.
    // This is useful for matching against Item#data.
    function matchObject(obj1: object, obj2: object): boolean {
      for (const key in obj1) {
        if (Object.hasOwn(obj1, key)) {
          const value1 = obj1[key]
          const value2 = obj2[key]
          if (isPlainObject(value1) && isPlainObject(value2)) {
            if (!matchObject(value1, value2)) {
              return false
            }
          } else if (!equals(value1, value2)) {
            return false
          }
        }
      }
      return true
    }

    const type = typeof name
    if (type === 'object') {
      // `name` is the match object, not a string
      for (const key in name) {
        if (Object.hasOwn(name, key) && !this.matches(key, name[key])) {
          return false
        }
      }
      return true
    } else if (type === 'function') {
      return name(this)
    } else if (name === 'match') {
      return compare(this)
    } else {
      let value = /^(empty|editable)$/.test(name)
        ? // Handle boolean test functions separately, by calling them
          // to get the value.
          this['is' + capitalize(name)]()
        : this[name]
      if (name === 'class') {
        if (typeof compare === 'function') {
          return this instanceof compare
        }
        // Compare further with the className property value instead.
        value = this.className
      }
      if (typeof compare === 'function') {
        return !!compare(value)
      } else if (compare) {
        if (compare.test) {
          // RegExp-ish
          return compare.test(value)
        } else if (isPlainObject(compare)) {
          return matchObject(compare, value)
        }
      }
      return equals(value, compare)
    }
  }

  /**
   * Fetch the descendants (children or children of children) of this item
   * that match the properties in the specified object. Extended matching is
   * possible by providing a compare function or regular expression. Matching
   * points, colors only work as a comparison of the full object, not partial
   * matching (e.g. only providing the x- coordinate to match all points with
   * that x-value). Partial matching does work for {@link Item#data}.
   *
   * Matching items against a rectangular area is also possible, by setting
   * either `options.inside` or `options.overlapping` to a rectangle
   * describing the area in which the items either have to be fully or partly
   * contained.
   *
   * See {@link Project#getItems(options)} for a selection of illustrated
   * examples.
   *
   * @option [options.recursive=true] {Boolean} whether to loop recursively
   *     through all children, or stop at the current level
   * @option options.match {Function} a match function to be called for each
   *     item, allowing the definition of more flexible item checks that are
   *     not bound to properties. If no other match properties are defined,
   *     this function can also be passed instead of the `options` object
   * @option options.class {Function} the constructor function of the item
   *     type to match against
   * @option options.inside {Rectangle} the rectangle in which the items need
   *     to be fully contained
   * @option options.overlapping {Rectangle} the rectangle with which the
   *     items need to at least partly overlap
   *
   * @param options the criteria to match against
   * @return the list of matching descendant items, in their
   *     stacking order from bottom to top, with each item listed before its
   *     own descendants
   * @see #matches(options)
   */
  getItems(options: object | ((item: Item) => boolean)): Item[] {
    return Item._getItems(this, options, this._matrix)
  }

  /**
   * Fetch the first descendant (child or child of child) of this item
   * that matches the properties in the specified object.
   * Extended matching is possible by providing a compare function or
   * regular expression. Matching points, colors only work as a comparison
   * of the full object, not partial matching (e.g. only providing the x-
   * coordinate to match all points with that x-value). Partial matching
   * does work for {@link Item#data}.
   * See {@link Project#getItems(match)} for a selection of illustrated
   * examples.
   *
   * @param options the criteria to match against
   * @return the first descendant item matching the given criteria
   * @see #getItems(options)
   */
  getItem(options: object | ((item: Item) => boolean)): Item | null {
    return Item._getItems(this, options, this._matrix, null, true)[0] ?? null
  }

  // NOTE: We pass children instead of item as first argument so the
  // method can be used for Project#layers as well in Project.
  static _getItems(
    item: Item | Project,
    options: any,
    matrix?: Matrix | null,
    param?: any,
    firstOnly?: boolean
  ): Item[] {
    let match = options
    if (!param) {
      // Set up a couple of "side-car" values for the recursive calls
      // of _getItems below, mainly related to the handling of
      // inside / overlapping:
      const obj = typeof options === 'object' && options
      const { recursive, inside, overlapping, ...rest } = obj ?? {}
      // If overlapping is set, we also perform the inside check:
      const bounds = overlapping || inside
      const rect = bounds && Rectangle.from(bounds)
      param = {
        items: [], // The list to contain the results.
        recursive: recursive !== false,
        inside: !!inside,
        overlapping: !!overlapping,
        rect,
        path: overlapping && Path.rectangle({ rectangle: rect, insert: false })
      }
      if (obj) {
        // Use a copy of the options object that doesn't contain these
        // special properties:
        match = rest
      }
    }
    const children = item._children
    const { items, rect } = param
    const transform = rect ? (matrix ?? new Matrix()) : null
    if (children) {
      for (const child of children) {
        const childMatrix = transform?.appended(child._matrix)
        let add = true
        if (rect) {
          const bounds = child.getBounds(childMatrix)
          // Regardless of the setting of inside / overlapping, if the
          // bounds don't even intersect, we can skip this child.
          if (!rect.intersects(bounds)) {
            continue
          }
          if (
            !(
              rect.contains(bounds) || (
                // First check the bounds, if the rect is fully
                // contained, we are always overlapping, and don't
                // need to perform further checks, otherwise perform
                // a proper #intersects() check:
                param.overlapping &&
                param.path.intersects(child, childMatrix)
              )
            )
          ) {
            add = false
          }
        }
        if (add && child.matches(match)) {
          items.push(child)
          if (firstOnly) {
            break
          }
        }
        // Only into the children that the item shows:
        if (param.recursive !== false && child.children) {
          Item._getItems(child, match, childMatrix, param, firstOnly)
        }
        if (firstOnly && items.length > 0) {
          break
        }
      }
    }
    return items
  }

  /**
   * Imports (deserializes) the stored JSON data into this item. If the data
   * describes an item of the same class or a parent class of the item, the
   * data is imported into the item itself. If not, the imported item is added
   * to this item's {@link Item#children} list. Note that not all type of
   * items can have children.
   *
   * @param json the JSON data to import from
   */
  importJSON(json: string | any[]): Item {
    const data = typeof json === 'string' ? JSON.parse(json) : json
    const props = data?.[0] === this.className && data[1]
    if (isPlainObject(props)) {
      // Importing into this item: first reset the fields that the JSON
      // leaves out to the values of a new item, so it ends up the same
      // as a newly imported one (#1425):
      const item = new (this.constructor as any)(Item.NO_INSERT)
      const fields = {
        ...this._serializeFields,
        ...(this instanceof Group ? null : this._style._defaults)
      }
      const defaults = {}
      for (const key in fields) {
        if (!(key in props) && !equals(this[key], item[key])) {
          defaults[key] = item[key]
        }
      }
      this.set(defaults)
    }
    // Try importing into `this`. If another item is returned, try adding
    // it as a child (this won't be successful on some classes, returning
    // null).
    const res = importJSON(data, this)
    return res !== this ? this.addChild(res) : res
  }

  /**
   * Exports the item with its content and child items as an SVG DOM. With
   * `options.bounds` or `options.matrix`, the item is wrapped in an `<svg>`
   * element sized to the bounds, as {@link Project#exportSVG(options)} does.
   *
   * @option [options.bounds] {String|Rectangle} the bounds of the area to
   *     export, either as a string ({@values 'view', content'}), or a
   *     {@link Rectangle} object: `'view'` uses the view bounds,
   *     `'content'` uses the stroke bounds of the item
   * @option [options.matrix] {Matrix} the matrix with which to transform the
   *     exported content: If `options.bounds` is set to `'view'`,
   *     `paper.view.matrix` is used, for all other settings of
   *     `options.bounds` the identity matrix is used.
   * @option [options.asString=false] {Boolean} whether a SVG node or a
   *     `String` is to be returned
   * @option [options.precision=5] {Number} the amount of fractional digits in
   *     numbers used in SVG data
   * @option [options.matchShapes=false] {Boolean} whether path items should
   *     tried to be converted to SVG shape items (rect, circle, ellipse,
   *     line, polyline, polygon), if their geometries match
   * @option [options.embedImages=true] {Boolean} whether raster images should
   *     be embedded as base64 data inlined in the xlink:href attribute, or
   *     kept as a link to their external URL.
   * @option [options.reuseImages=false] {Boolean} whether raster images with
   *     the same content should only be exported once into the `<defs>`
   *     element, and placed through `<use>` elements referencing it
   * @option [options.idPrefix=''] {String} a prefix for the ids generated
   *     for definitions such as gradients, clip paths and symbols, to keep
   *     them unique when several exported SVGs are placed in one document
   * @option [options.reduceAttributes=true] {Boolean} wether to only include
   *     style attributes in the SVG output that differ from their parents,
   *     or to always include them (much faster but leading to redundancies).
   * @option [options.processNode] {Function} the function to process the
   *     SVG node made for each exported item, receiving an object with the
   *     `item` and its `node`: It can change the node, e.g. to add attributes
   *     that Paper.js doesn't export, or return a node to replace it with. It
   *     is called before the item's name, style, visibility and data are set
   *     on the node, which replace attributes of the same names.
   *
   * @param [options] the export options
   * @return the item converted to an SVG node or a
   * `String` depending on `option.asString` value
   */
  exportSVG(options?: Record<string, any>): SVGElement | string {
    return exportItemSVG(this, options)
  }

  /**
   * Converts the provided SVG content into Paper.js items and adds them to
   * the this item's children list. Note that the item is not cleared first.
   * You can call {@link Item#removeChildren()} to do so.
   *
   * `<symbol>` elements are imported as {@link SymbolDefinition} items, and
   * the `<use>` elements that place them as {@link SymbolItem} items. The
   * styles that `<use>` elements inherit don't reach the symbols' content.
   *
   * The layers in SVG content that Paper.js exported come back as
   * {@link Layer} items inside the imported group. To make them the layers
   * of a project again, import the content with
   * {@link Project#importSVG(svg)}.
   *
   * URLs are fetched as they are, so validate URLs that come from untrusted
   * sources first, especially on servers, where they could reach internal
   * addresses.
   *
   * @option [options.expandShapes=false] {Boolean} whether imported shape
   *     items should be expanded to path items
   * @option [options.crossOrigin] {String} the {@link Raster#crossOrigin}
   *     value of the rasters created for `<image>` elements, to load their
   *     images with CORS
   * @option options.onLoad {Function} the callback function to call once the
   *     SVG content is loaded from the given URL receiving two arguments: the
   *     converted `item` and the original `svg` data as a string. Only
   *     required when loading from external resources.
   * @option options.onError {Function} the callback function to call if an
   *     error occurs during loading. Only required when loading from external
   *     resources.
   * @option [options.insert=true] {Boolean} whether the imported items should
   *     be added to the item that `importSVG()` is called on
   * @option [options.applyMatrix={@link PaperScope#settings}.applyMatrix]
   *     {Boolean} whether the imported items should have their transformation
   *     matrices applied to their contents or not
   * @option [options.processItem] {Function} the function to process the
   *     item made for each imported SVG element, receiving an object with
   *     the `item` and its `node`: It can read attributes that Paper.js
   *     doesn't import, or return an item to replace it with. It is called
   *     after the element's attributes and data are applied to the item, so
   *     it can extend `item.data`. A replacement item doesn't receive them:
   *     copy them over from `item` as needed.
   *
   * @param svg the SVG content to import, either as a SVG
   *     DOM node, a string containing SVG content, or a string describing the
   *     URL of the SVG file to fetch.
   * @param [options] the import options
   * @return the newly created Paper.js item containing the converted
   *     SVG content
   */
  importSVG(
    svg: SVGElement | string,
    options?: Record<string, any>
  ): Item | null
  /**
   * Imports the provided external SVG file, converts it into Paper.js items
   * and adds them to the this item's children list. Note that the item is not
   * cleared first. You can call {@link Item#removeChildren()} to do so.
   *
   * @param svg the URL of the SVG file to fetch.
   * @param onLoad the callback function to call once the SVG
   *     content is loaded from the given URL receiving two arguments: the
   *     converted `item` and the original `svg` data as a string. Only
   *     required when loading from external files.
   * @return the newly created Paper.js item containing the converted
   *     SVG content
   */
  importSVG(
    svg: SVGElement | string,
    onLoad: (item: Item, svg: string) => void
  ): Item | null
  importSVG(svg: any, options?: any): Item | null {
    return importSVG(svg, options, this) as Item
  }

  /**
   * {@grouptitle Hierarchy Operations}
   *
   * Adds the specified item as a child of this item at the end of the its
   * {@link #children}  list. You can use this function for groups, compound
   * paths and layers.
   *
   * @param item the item to be added as a child
   * @return the added item, or `null` if adding was not possible
   */
  addChild(item: Item): Item | null {
    return this.insertChild(undefined, item)
  }

  /**
   * Inserts the specified item as a child of this item at the specified index
   * in its {@link #children} list. You can use this function for groups,
   * compound paths and layers.
   *
   * @param index the index at which to insert the item
   * @param item the item to be inserted as a child
   * @return the inserted item, or `null` if inserting was not possible
   */
  insertChild(index: number, item: Item): Item | null {
    const res = item ? this.insertChildren(index, [item]) : null
    return res?.[0] ?? null
  }

  /**
   * Adds the specified items as children of this item at the end of the its
   * children list. You can use this function for groups, compound paths and
   * layers.
   *
   * @param items the items to be added as children
   * @return the added items, or `null` if adding was not possible
   */
  addChildren(items: Item[]): Item[] | null {
    return this.insertChildren(this._children.length, items)
  }

  /**
   * Inserts the specified items as children of this item at the specified
   * index in its {@link #children} list. You can use this function for
   * groups, compound paths and layers.
   *
   * @param index
   * @param items the items to be appended as children
   * @return the inserted items, or `null` if inserted was not
   *     possible
   */
  insertChildren(index: number, items: Item[]): Item[] | null {
    const children = this._children
    if (children && items?.length > 0) {
      // We need to clone items because it may be an Item#children array.
      // Also, we're removing elements if they don't match _type.
      const list = Array.from(items)
      // Remove the items from their parents first, since they might be
      // inserted into their own parents, affecting indices.
      // Use the loop also to filter invalid items.
      const inserted = {}
      for (let i = list.length - 1; i >= 0; i--) {
        const item = list[i]
        const id = item?._id
        // If an item was inserted already, it must be included multiple
        // times in the items array. Only insert once. Also leave out
        // this item and its ancestors, which would create a cycle:
        if (
          !item ||
          inserted[id] ||
          item === this ||
          this.isDescendant(item)
        ) {
          list.splice(i, 1)
        } else {
          // Notify parent of change. Don't notify item itself yet,
          // as we're doing so when adding it to the new owner below.
          item._remove(false, true)
          inserted[id] = true
        }
      }
      if (!list.length) {
        return null
      }
      splice(children, list, index, 0)
      const project = this._project
      // See #_remove() for an explanation of this:
      const notifySelf = project._changes
      for (const item of list) {
        const name = item._name
        item._parent = this
        item._setProject(project, true)
        // Set the name again to make sure all name lookup structures
        // are kept in sync.
        if (name) {
          item.name = name
        }
        if (notifySelf) {
          item._changed(Change.INSERTION)
        }
      }
      this._changed(Change.CHILDREN)
      return list
    }
    return null
  }

  // Internal alias, so both Project and Item can be used in #copyTo(), and
  // through _getOwner() in the various Item#insert*() methods.
  _insertItem(index: number, item: Item, _created?: boolean): Item | null {
    return this.insertChild(index, item)
  }

  /**
   * Private helper method used by {@link #insertAbove(item)} and
   * {@link #insertBelow(item)}, to insert this item in relation to a
   * specified other item.
   *
   * @param item the item in relation to which which it should be
   *     inserted
   * @param offset the offset at which the item should be inserted
   * @return the inserted item, or `null` if inserting was not possible
   */
  _insertAt(item: Item, offset: number): this | null {
    const owner = item?._getOwner()
    // Only insert if the item is not the same as `this`, and if it
    // actually has an owner into which we can insert.
    const res = item !== this && owner ? this : null
    if (res) {
      // Notify parent of change. Don't notify item itself yet,
      // as we're doing so when adding it to the new owner below.
      res._remove(false, true)
      owner._insertItem(item._index + offset, res)
    }
    return res
  }

  /**
   * Inserts this item above the specified item.
   *
   * @param item the item above which it should be inserted
   * @return the inserted item, or `null` if inserting was not possible
   */
  insertAbove(item: Item): this | null {
    return this._insertAt(item, 1)
  }

  /**
   * Inserts this item below the specified item.
   *
   * @param item the item below which it should be inserted
   * @return the inserted item, or `null` if inserting was not possible
   */
  insertBelow(item: Item): this | null {
    return this._insertAt(item, 0)
  }

  /**
   * Sends this item to the back of all other items within the same parent.
   */
  sendToBack(): Item | null {
    const owner = this._getOwner()
    return owner?._insertItem(0, this) ?? null
  }

  /**
   * Brings this item to the front of all other items within the same parent.
   */
  bringToFront(): Item | null {
    const owner = this._getOwner()
    return owner?._insertItem(undefined, this) ?? null
  }

  /**
   * Adds it to the specified owner, which can be either a {@link Item} or a
   * {@link Project}.
   *
   * @param owner the item or project to
   * add the item to
   * @return the item itself, if it was successfully added
   * @chainable
   */
  addTo(owner: Item | Project): this {
    return owner._insertItem(undefined, this) as this
  }

  /**
   * Clones the item and adds it to the specified owner, which can be either
   * a {@link Item} or a {@link Project}.
   *
   * @param owner the item or project to
   * copy the item to
   * @return the new copy of the item, if it was successfully added
   * @chainable
   */
  copyTo(owner: Item | Project): this {
    return this.clone(false).addTo(owner)
  }

  /**
   * If this is a group, layer or compound-path with only one child-item,
   * the child-item is moved outside and the parent is erased. Otherwise, the
   * item itself is returned unmodified.
   *
   * @param [options] the options passed on to {@link
   *     Path#reduce(options)}
   * @return the reduced item
   */
  reduce(options?: object): Item {
    const children = this._children
    if (children?.length === 1) {
      const child = children[0].reduce(options)
      // Make sure the reduced item has the same parent as the original.
      if (this._parent) {
        child.insertAbove(this)
        this.remove()
      } else {
        child.remove()
      }
      return child
    }
    return this
  }

  /**
   * Removes the item from its parent's named children list.
   */
  _removeNamed() {
    const owner = this._getOwner()
    if (owner) {
      removeNamed(owner._children, owner._namedChildren, this._name, this)
    }
  }

  /**
   * Removes the item from its parent's children list.
   */
  _remove(notifySelf: boolean, notifyParent: boolean): boolean {
    const owner = this._getOwner()
    const project = this._project
    const index = this._index
    this._style?._dispose()
    if (owner) {
      // Handle named children separately from index:
      if (this._name) {
        this._removeNamed()
      }
      // Uninstall events while still inserted, as layers aren't anymore
      // after splice() below.
      this._installEvents(false)
      // Notify self of the insertion change while still inserted, so it
      // is logged. We only need this notification if we're tracking
      // changes.
      if (notifySelf && project._changes) {
        this._changed(Change.INSERTION)
      }
      // Handle index separately from owner: There are situations where
      // the item is already removed from its list through splice()
      // and index set to undefined, but the owner is still set,
      // e.g. in #removeChildren():
      if (index != null) {
        // Only required for layers but not enough to merit an override.
        if (project._activeLayer === (this as Item)) {
          const sibling = this.nextSibling ?? this.previousSibling
          project._activeLayer = sibling as Layer
        }
        splice(owner._children, null, index, 1)
      }
      // Notify owner of changed children (this can be the project too).
      if (notifyParent) {
        owner._changed(Change.CHILDREN, this)
      }
      this._parent = null
      return true
    }
    return false
  }

  /**
   * Removes the item and all its children from the project. The item is not
   * destroyed and can be inserted again after removal.
   *
   * @return {@true if the item was removed}
   */
  remove(): boolean {
    // Notify self and parent of change:
    return this._remove(true, true)
  }

  /**
   * Replaces this item with the provided new items which will take its place
   * in the project hierarchy instead, in the given order. This also ungroups
   * a group, e.g. `group.replaceWith(...group.children)`, but note that the
   * items keep their own matrices, see {@link Group#ungroup()}.
   *
   * @param items the items that will replace this item
   * @return {@true if the item was replaced}
   */
  replaceWith(...items: Item[]): boolean {
    let ok: any = items[0]
    for (let i = 0, l = items.length; i < l && ok; i++) {
      ok = items[i] && items[i].insertBelow(this)
    }
    if (ok) {
      this.remove()
    }
    return !!ok
  }

  /**
   * Removes all of the item's {@link #children} (if any).
   *
   * @return an array containing the removed items
   */
  removeChildren(): Item[] | null
  /**
   * Removes the children from the specified `start` index to and excluding
   * the `end` index from the parent's {@link #children} array.
   *
   * @param start the beginning index, inclusive
   * @param [end=children.length] the ending index, exclusive
   * @return an array containing the removed items
   */
  removeChildren(start: number, end?: number): Item[] | null
  removeChildren(start = 0, end?: number): Item[] | null {
    const children = this._children
    if (!children) {
      return null
    }
    // Use splice(), which adjusts #_index for the items above, and
    // deletes it for the removed items. Calling #_remove() afterwards is
    // fine, since it only calls splice() if #_index is set.
    const removed = splice(
      children,
      null,
      start,
      (end !== undefined ? end : children.length) - start
    )
    for (let i = removed.length - 1; i >= 0; i--) {
      // Don't notify parent each time, notify it separately after.
      removed[i]._remove(true, false)
    }
    if (removed.length > 0) {
      this._changed(Change.CHILDREN)
    }
    return removed
  }

  /**
   * Removes all of the item's {@link #children} (if any), as
   * {@link #removeChildren()} does.
   *
   * @return an array containing the removed items
   */
  // Typed loosely, as Path#clear() returns its removed segments:
  clear(): any[] | null {
    return this.removeChildren()
  }

  /**
   * Reverses the order of the item's children
   */
  reverseChildren() {
    const children = this._children
    if (children) {
      children.reverse()
      // Adjust indices
      for (let i = 0, l = children.length; i < l; i++) {
        children[i]._index = i
      }
      this._changed(Change.CHILDREN)
    }
  }

  /**
   * {@grouptitle Tests}
   * Specifies whether the item has any content or not. The meaning of what
   * content is differs from type to type. For example, a {@link Group} with
   * no children, a {@link TextItem} with no text content and a {@link Path}
   * with no segments all are considered empty.
   *
   * @param [recursively=false] whether an item with children should be
   * considered empty if all its descendants are empty
   */
  isEmpty(recursively?: boolean): boolean {
    const children = this._children
    const numChildren = children?.length ?? 0
    if (recursively) {
      // In recursive check, item is empty if all its children are empty.
      for (let i = 0; i < numChildren; i++) {
        if (!children[i].isEmpty(recursively)) {
          return false
        }
      }
      return true
    }
    return !numChildren
  }

  /**
   * Checks whether the item is editable.
   *
   * @return {@true when neither the item, nor its parents are
   * locked or hidden}
   * @ignore
   */
  // TODO: Item#isEditable is currently ignored in the documentation, as
  // locking an item currently has no effect
  isEditable(): boolean {
    for (let item: Item = this; item; item = item._parent) {
      if (!item._visible || item._locked) {
        return false
      }
    }
    return true
  }

  /**
   * Checks whether the item is valid, i.e. it hasn't been removed.
   *
   * @return {@true if the item is valid}
   */
  // TODO: isValid / checkValid

  /**
   * {@grouptitle Style Tests}
   *
   * Checks whether the item has a visible fill, a fill color with an alpha
   * above 0. Hit-tests also hit transparent fills, see {@link #hitTest}.
   *
   * @return {@true if the item has a visible fill}
   */
  hasFill(): boolean {
    return this.style.hasFill()
  }

  /**
   * Checks whether the item has a stroke.
   *
   * @return {@true if the item has a stroke}
   */
  hasStroke(): boolean {
    return this.style.hasStroke()
  }

  /**
   * Checks whether the item has a shadow.
   *
   * @return {@true if the item has a shadow}
   */
  hasShadow(): boolean {
    return this.style.hasShadow()
  }

  /**
   * Returns -1 if 'this' is above 'item', 1 if below, 0 if their order is not
   * defined in such a way, e.g. if one is a descendant of the other.
   */
  _getOrder(item: Item): number {
    // Private method that produces a list of ancestors, starting with the
    // root and ending with the actual element as the last entry.
    function getList(item: Item) {
      const list = []
      do {
        list.unshift(item)
      } while ((item = item._parent))
      return list
    }
    const list1 = getList(this)
    const list2 = getList(item)
    for (let i = 0, l = Math.min(list1.length, list2.length); i < l; i++) {
      if (list1[i] != list2[i]) {
        // Found the position in the parents list where the two start
        // to differ. Look at who's above who.
        return list1[i]._index < list2[i]._index ? 1 : -1
      }
    }
    return 0
  }

  /**
   * {@grouptitle Hierarchy Tests}
   *
   * Checks if the item contains any children items.
   *
   * @return {@true it has one or more children}
   */
  hasChildren(): boolean {
    return this._children?.length > 0
  }

  /**
   * Checks whether the item and all its parents are inserted into scene graph
   * or not.
   *
   * @return {@true if the item is inserted into the scene graph}
   */
  isInserted(): boolean {
    return !!this._parent?.isInserted()
  }

  /**
   * Checks if this item is above the specified item in the stacking order
   * of the project. If one item is a descendant of the other, neither is
   * above the other and `false` is returned.
   *
   * @param item the item to check against
   * @return {@true if it is above the specified item}
   */
  isAbove(item: Item): boolean {
    return this._getOrder(item) === -1
  }

  /**
   * Checks if the item is below the specified item in the stacking order of
   * the project. If one item is a descendant of the other, neither is below
   * the other and `false` is returned.
   *
   * @param item the item to check against
   * @return {@true if it is below the specified item}
   */
  isBelow(item: Item): boolean {
    return this._getOrder(item) === 1
  }

  /**
   * Checks whether the specified item is the parent of the item.
   *
   * @param item the item to check against
   * @return {@true if it is the parent of the item}
   */
  isParent(item: Item): boolean {
    return this._parent === item
  }

  /**
   * Checks whether the specified item is a child of the item.
   *
   * @param item the item to check against
   * @return {@true it is a child of the item}
   */
  isChild(item: Item): boolean {
    return item?._parent === this
  }

  /**
   * Checks if the item is contained within the specified item.
   *
   * @param item the item to check against
   * @return {@true if it is inside the specified item}
   */
  isDescendant(item: Item): boolean {
    let parent: Item = this
    while ((parent = parent._parent)) {
      if (parent === item) {
        return true
      }
    }
    return false
  }

  /**
   * Checks if the item is an ancestor of the specified item.
   *
   * @param item the item to check against
   * @return {@true if the item is an ancestor of the specified
   * item}
   */
  isAncestor(item: Item): boolean {
    return !!item?.isDescendant(this)
  }

  /**
   * Checks if the item is an a sibling of the specified item.
   *
   * @param item the item to check against
   * @return {@true if the item is aa sibling of the specified item}
   */
  isSibling(item: Item): boolean {
    return this._parent === item._parent
  }

  /**
   * Checks whether the item is grouped with the specified item.
   *
   * @param item
   * @return {@true if the items are grouped together}
   */
  isGroupedWith(item: Item): boolean {
    for (let parent = this._parent; parent; parent = parent._parent) {
      // Find group parents. Check for parent._parent, since don't want
      // top level layers, because they also inherit from Group
      if (
        parent._parent &&
        /^(Group|Layer|CompoundPath)$/.test(parent.className) &&
        item.isDescendant(parent)
      ) {
        return true
      }
    }
    return false
  }

  /**
   * {@grouptitle Transform Functions}
   *
   * Translates (moves) the item by the given offset views.
   *
   * @param delta the offset to translate the item by
   */
  translate(delta: PointLike | number, y?: number): this {
    return this.transform(new Matrix().translate(Point.from(delta, y)))
  }

  /**
   * Transform the item.
   *
   * @param matrix the matrix by which the item shall be transformed
   */
  // TODO: Implement flags:
  // @param {String[]} flags array of any of the following: 'objects',
  //        'children', 'fill-gradients', 'fill-patterns', 'stroke-patterns',
  //        'lines'. Default: ['objects', 'children']
  transform(
    matrix: Matrix | null,
    _applyRecursively?: boolean,
    _setApplyMatrix?: boolean
  ): this {
    const _matrix = this._matrix
    const transformMatrix = matrix && !matrix.isIdentity()
    // If no matrix is provided, or the matrix is the identity, we might
    // still have some work to do: _setApplyMatrix or _applyRecursively.
    let applyMatrix = (
      _setApplyMatrix && this._canApplyMatrix || (
        this._applyMatrix &&
        // Don't apply _matrix if the result of concatenating with
        // matrix would be identity.
        (
          transformMatrix ||
          !_matrix.isIdentity() ||
          // Even if it's an identity matrix, we may still need to
          // recursively apply the matrix to children.
          _applyRecursively && this._children
        )
      )
    )
    // Bail out if there is nothing to do.
    if (!transformMatrix && !applyMatrix) {
      return this
    }
    // Simply prepend the internal matrix with the passed one:
    if (transformMatrix) {
      // Keep a backup of the last valid state before the matrix becomes
      // non-invertible. This is then used again in the bounds setter to
      // restore.
      if (!matrix.isInvertible() && _matrix.isInvertible()) {
        _matrix._backup = _matrix.values
      }
      // Pass `true` for _dontNotify, as we're handling this after.
      _matrix.prepend(matrix, true)
      // When a new matrix was applied, we also need to transform gradient
      // color points. These always need transforming, regardless of
      // #applyMatrix, as they are defined in the parent's coordinate
      // system.
      // TODO: Introduce options to control whether fills should be
      // transformed or not.
      const style = this._style
      // Pass true for dontMerge so we don't recursively transform
      // styles on groups' children.
      const fillColor = style._get('fillColor', true)
      const strokeColor = style._get('strokeColor', true)
      fillColor?.transform(matrix)
      strokeColor?.transform(matrix)
    }
    // Call #_transformContent() now, if we need to directly apply the
    // internal _matrix transformations to the item's content.
    // Application is not possible on Raster, PointText, SymbolItem, since
    // the matrix is where the actual transformation state is stored.
    if (
      applyMatrix &&
      (applyMatrix = this._transformContent(
        _matrix, _applyRecursively, _setApplyMatrix
      ))
    ) {
      // Pivot is provided in the parent's coordinate system, so transform
      // it along too.
      const pivot = this._pivot
      if (pivot) {
        _matrix._transformPoint(pivot, pivot, true)
      }
      // Reset the internal matrix to the identity transformation if
      // it was possible to apply it, but do not notify owner of change.
      _matrix.reset(true)
      // Set the internal _applyMatrix flag to true if we're told to
      // do so
      if (_setApplyMatrix && this._canApplyMatrix) {
        this._applyMatrix = true
      }
    }
    // Calling _changed will clear _bounds and _position, but depending
    // on matrix we can calculate and set them again, so preserve them.
    const bounds = this._bounds
    const position = this._position
    if (transformMatrix || applyMatrix) {
      this._changed(Change.MATRIX)
    }
    // Detect matrices that contain only translations and scaling
    // and transform the cached _bounds and _position without having to
    // fully recalculate each time.
    const decomposed = transformMatrix && bounds && matrix.decompose()
    if (
      decomposed &&
      decomposed.skewing.isZero() &&
      decomposed.rotation % 90 === 0
    ) {
      // Transform the old bound by looping through all the cached
      // bounds in _bounds and transform each.
      for (const key in bounds) {
        const cache = bounds[key]
        // If any item involved in the determination of these bounds has
        // non-scaling strokes, or if a scaling matrix is applied to
        // the content without scaling its strokes, delete the cache
        // now as it can't be preserved through the transformation.
        if (
          cache.nonscaling || (
            applyMatrix &&
            cache.stroke &&
            !decomposed.scaling.abs().equals([1, 1])
          )
        ) {
          delete bounds[key]
        } else if (applyMatrix || !cache.internal) {
          // If these are internal bounds, only transform them if this
          // item applied its matrix.
          const { rect } = cache
          matrix._transformBounds(rect, rect)
        }
      }
      this._bounds = bounds
      // If we have cached bounds, try to determine _position as its
      // center. Use _boundsOptions do get the cached default bounds.
      const cached = bounds[this._getBoundsCacheKey(this._boundsOptions ?? {})]
      if (cached) {
        // use this method to handle pivot case (see #1503)
        this._position = this._getPositionFromBounds(cached.rect)
      }
    } else if (transformMatrix && position && this._pivot) {
      // If the item has a pivot defined, it means that the default
      // position defined as the center of the bounds won't shift with
      // arbitrary transformations and we can therefore update _position:
      this._position = matrix._transformPoint(position, position)
    }
    // Allow chaining here, since transform() is related to Matrix functions
    return this
  }

  _transformContent(
    matrix: Matrix,
    applyRecursively?: boolean,
    setApplyMatrix?: boolean
  ): boolean {
    const children = this._children
    if (children) {
      for (const child of children) {
        child.transform(matrix, applyRecursively, setApplyMatrix)
      }
      return true
    }
    return false
  }

  /**
   * Converts the specified point from global project coordinate space to the
   * item's own local coordinate space.
   *
   * @param point the point to be transformed
   * @return the transformed point as a new instance
   */
  globalToLocal(point: PointLike | number, y?: number): Point {
    return this._getGlobalMatrix(true)._inverseTransform(Point.from(point, y))
  }

  /**
   * Converts the specified point from the item's own local coordinate space
   * to the global project coordinate space.
   *
   * @param point the point to be transformed
   * @return the transformed point as a new instance
   */
  localToGlobal(point: PointLike | number, y?: number): Point {
    return this._getGlobalMatrix(true)._transformPoint(Point.from(point, y))
  }

  /**
   * Converts the specified point from the parent's coordinate space to
   * item's own local coordinate space.
   *
   * @param point the point to be transformed
   * @return the transformed point as a new instance
   */
  parentToLocal(point: PointLike | number, y?: number): Point {
    return this._matrix._inverseTransform(Point.from(point, y))
  }

  /**
   * Converts the specified point from the item's own local coordinate space
   * to the parent's coordinate space.
   *
   * @param point the point to be transformed
   * @return the transformed point as a new instance
   */
  localToParent(point: PointLike | number, y?: number): Point {
    return this._matrix._transformPoint(Point.from(point, y))
  }

  /**
   * Transform the item so that its {@link #bounds} are centered in the
   * specified rectangle and fitted to it as described by `fit`.
   *
   * @param rectangle
   * @param [fit='contain'] how to fit the item, as in CSS's
   * `object-fit`: `'contain'` fits all of it within the rectangle, `'cover'`
   * makes it cover the whole rectangle, and `'fill'` stretches it to the
   * rectangle, changing its aspect ratio.
   *
   * @example {@paperscript height=100}
   * // Fitting an item to the bounding rectangle of another item's bounding
   * // rectangle:
   *
   * // Create a rectangle shaped path with its top left corner
   * // at {x: 80, y: 25} and a size of {width: 75, height: 50}:
   * var path = Path.rectangle({
   *     point: [80, 25],
   *     size: [75, 50],
   *     fillColor: 'black'
   * });
   *
   * // Create a circle shaped path with its center at {x: 80, y: 50}
   * // and a radius of 30.
   * var circlePath = Path.circle({
   *     center: [80, 50],
   *     radius: 30,
   *     fillColor: 'red'
   * });
   *
   * // Fit the circlePath to the bounding rectangle of
   * // the rectangular path:
   * circlePath.fitBounds(path.bounds);
   *
   * @example {@paperscript height=100}
   * // Fitting an item to the bounding rectangle of another item's bounding
   * // rectangle, covering all of it:
   *
   * // Create a rectangle shaped path with its top left corner
   * // at {x: 80, y: 25} and a size of {width: 75, height: 50}:
   * var path = Path.rectangle({
   *     point: [80, 25],
   *     size: [75, 50],
   *     fillColor: 'black'
   * });
   *
   * // Create a circle shaped path with its center at {x: 80, y: 50}
   * // and a radius of 30.
   * var circlePath = Path.circle({
   *     center: [80, 50],
   *     radius: 30,
   *     fillColor: 'red'
   * });
   *
   * // Fit the circlePath to the bounding rectangle of
   * // the rectangular path:
   * circlePath.fitBounds(path.bounds, 'cover');
   *
   * @example {@paperscript height=200}
   * // Fitting an item to the bounding rectangle of the view
   * var path = Path.circle({
   *     center: [80, 50],
   *     radius: 30,
   *     fillColor: 'red'
   * });
   *
   * // Fit the path to the bounding rectangle of the view:
   * path.fitBounds(view.bounds);
   */
  fitBounds(
    rectangle: RectangleLike,
    fit: 'contain' | 'cover' | 'fill' = 'contain'
  ) {
    const rect = Rectangle.from(rectangle)
    const bounds = this.getBounds()
    const hor = rect.width / bounds.width
    const ver = rect.height / bounds.height
    let size: Size

    // Empty sides of the item or the rectangle give ratios of Infinity or
    // 0, which can't scale it, so only use the others:
    function isScaling(ratio: number) {
      return ratio > 0 && isFinite(ratio)
    }

    if (fit === 'fill') {
      size = new Size(
        isScaling(hor) ? rect.width : bounds.width,
        isScaling(ver) ? rect.height : bounds.height
      )
    } else {
      const ratios = [hor, ver].filter(isScaling)
      const scale = !ratios.length
        ? 1
        : fit === 'cover'
          ? Math.max(...ratios)
          : Math.min(...ratios)
      size = bounds.size.multiply(scale)
    }
    const fitted = new Rectangle(new Point(), size)
    fitted.center = rect.center
    this.bounds = fitted
  }

  /**
   * Private method that sets Path related styles on the canvas context.
   * Not defined in Path as it is required by other classes too,
   * e.g. PointText.
   */
  _setStyles(
    ctx: CanvasRenderingContext2D,
    param: any,
    viewMatrix: Matrix,
    strokeMatrix?: Matrix,
    style: Style = this._style
  ) {
    // We can access internal properties since we're only using this on
    // items without children, where styles would be merged. Text passes
    // the style of each of its runs.
    const matrix = this._matrix
    if (style.hasFill()) {
      ctx.fillStyle = style.fillColor.toCanvasStyle(ctx, matrix, strokeMatrix)
    }
    if (style.hasStroke()) {
      ctx.strokeStyle = style.strokeColor.toCanvasStyle(
        ctx, matrix, strokeMatrix
      )
      ctx.lineWidth = style.strokeWidth
      const { strokeJoin, strokeCap, miterLimit, dashArray } = style
      if (strokeJoin) {
        ctx.lineJoin = strokeJoin as CanvasLineJoin
      }
      if (strokeCap) {
        ctx.lineCap = strokeCap as CanvasLineCap
      }
      if (miterLimit) {
        ctx.miterLimit = miterLimit
      }
      if (dashArray?.length) {
        ctx.setLineDash(dashArray)
        ctx.lineDashOffset = style.dashOffset
      }
    }
    // The shadow is the item's, also for text, which passes the styles of
    // its runs. Items whose shadow is cast when compositing them don't
    // draw it, see #draw():
    if (this._style.hasShadow() && !param.dontShadow) {
      this._setShadow(ctx, param, viewMatrix)
    }
  }

  /**
   * Private method that fills and strokes the path defined on the canvas
   * context, shared by Path, CompoundPath and Shape.
   */
  _paint(
    ctx: CanvasRenderingContext2D,
    param: any,
    viewMatrix: Matrix,
    strokeMatrix?: Matrix
  ) {
    const style = this._style
    const hasFill = style.hasFill()
    const hasStroke = style.hasStroke()
    if (hasFill || hasStroke) {
      const isStrokeFirst = hasStroke && style.paintOrder === 'stroke'
      this._setStyles(ctx, param, viewMatrix, strokeMatrix)
      // If shadowColor is defined, clear it after the first paint, so it
      // won't be applied to both fill and stroke.
      if (isStrokeFirst) {
        ctx.stroke()
        ctx.shadowColor = 'rgba(0,0,0,0)'
      }
      if (hasFill) {
        // Elliptical radial gradients are drawn as circles, through
        // the matrix that stretches them, see Color#toCanvasStyle():
        const { fillColor } = style
        const ellipse = fillColor._getEllipseMatrix(this._matrix, strokeMatrix)
        if (ellipse) {
          ctx.save()
          ellipse.applyToContext(ctx)
          ctx.fillStyle = fillColor.toCanvasStyle(ctx, null, null, true)
        }
        ctx.fill(style.fillRule as CanvasFillRule)
        if (ellipse) {
          ctx.restore()
        }
        ctx.shadowColor = 'rgba(0,0,0,0)'
      }
      if (hasStroke && !isStrokeFirst) {
        ctx.stroke()
      }
    }
  }

  _setShadow(ctx: CanvasRenderingContext2D, param: any, viewMatrix: Matrix) {
    // In Canvas, shadows unfortunately ignore all transformations
    // completely. As almost no browser supports ctx.currentTransform,
    // we need to calculate our own here, and then use it to transform
    // the shadow-blur and offset accordingly.
    const style = this._style
    const pixelRatio = param.pixelRatio || 1
    const mx = viewMatrix
      ._shiftless()
      .prepend(new Matrix().scale(pixelRatio, pixelRatio))
    // Transform the blur value as a vector and use its new length:
    const blur = mx.transform(new Point(style.shadowBlur, 0))
    const offset = mx.transform(this.shadowOffset)
    ctx.shadowColor = style.shadowColor.toCanvasStyle(ctx) as string
    ctx.shadowBlur = blur.length
    ctx.shadowOffsetX = offset.x
    ctx.shadowOffsetY = offset.y
  }

  draw(
    ctx: CanvasRenderingContext2D,
    param: any,
    parentStrokeMatrix?: Matrix
  ) {
    // Each time the project gets drawn, it's _updateVersion is increased.
    // Keep the _updateVersion of drawn items in sync, so we have an easy
    // way to know for which selected items we need to draw selection info.
    this._updateVersion = this._project._updateVersion
    // Now bail out if no actual drawing is required.
    if (!this._visible || this._opacity === 0) {
      return
    }
    // Keep calculating the current global matrix, by keeping a history
    // and pushing / popping as we go along.
    const { matrices } = param
    const matrix = this._matrix
    const parentMatrix = matrices[matrices.length - 1]
    const globalMatrix = parentMatrix.appended(matrix)
    // If this item is not invertible, do not draw it. It appears to be a
    // good idea generally to not draw in such circumstances, e.g. SVG
    // handles it the same way.
    if (!globalMatrix.isInvertible()) {
      return
    }

    // Since globalMatrix does not take the view's matrix into account (we
    // could have multiple views with different zooms), we may have to
    // prepend the view's matrix.
    // NOTE: param.viewMatrix is only provided if it isn't the identity
    // matrix.
    const viewMatrix = param.viewMatrix
      ? param.viewMatrix.appended(globalMatrix)
      : globalMatrix

    // Only keep track of transformation if told so. See Project#draw()
    matrices.push(globalMatrix)
    if (param.updateMatrix) {
      // Remember the parent's global matrix that this one is built from,
      // see #globalMatrix. Layers start from identity, not a parent.
      this._globalMatrix = globalMatrix
      this._parentGlobalMatrix = this._parent && parentMatrix
    }

    // If the item has a blendMode or is defining an opacity, draw it on
    // a temporary canvas first and composite the canvas afterwards.
    // Paths with an opacity < 1 that both define a fillColor
    // and strokeColor also need to be drawn on a temporary canvas
    // first, since otherwise their stroke is drawn half transparent
    // over their fill.
    // Exclude Raster items since they never draw a stroke and handle
    // opacity by themselves (they also don't call _setStyles)
    const blendMode = this._blendMode
    const opacity = clamp(this._opacity, 0, 1)
    const normalBlend = blendMode === 'normal'
    const nativeBlend = nativeBlendModes[blendMode]
    const style = this._style
    // Canvas fills and strokes separately, so items with both can only
    // cast the shadow of one. Draw them on a temporary canvas, and cast
    // the shadow when compositing it, which native blending can. Pass
    // true for dontMerge, as groups don't draw the shadows of their
    // children (#892):
    const shadow = (
      (normalBlend || nativeBlend) &&
      style._get('shadowColor', true) &&
      style.hasShadow() &&
      style.hasFill() &&
      style.hasStroke()
    )
    // Determine if we can draw directly, or if we need to draw into a
    // separate canvas and then composite onto the main canvas.
    const direct = (
      !shadow && ( // e.g. CompoundPath
        (
          normalBlend &&
          opacity === 1 &&
          !(this instanceof Group && this.isolated)
        ) ||
        // If native blending is possible, see if the item allows it
        (nativeBlend || normalBlend && opacity < 1) &&
        this._canComposite()
      ) ||
      param.dontStart ||
      param.clip
    )
    const pixelRatio = param.pixelRatio || 1
    let mainCtx: CanvasRenderingContext2D
    let itemOffset: Point
    let prevOffset: Point
    let itemSize: Size
    let buffer: any
    let isFresh: boolean
    if (!direct) {
      // Buffered groups drawn by a view keep their temporary canvas, and
      // only draw into it again when it's stale, see Group#buffered.
      // A clip item isn't part of the group, so its changes wouldn't
      // make the buffer stale:
      buffer = (
        this._buffered &&
        param.view &&
        !param.clipItem &&
        (this._buffer ??= {})
      )
      const version = this._project._bufferVersion
      isFresh = (
        buffer &&
        viewMatrix.equals(buffer.matrix) &&
        buffer.version === version
      )
      // Apply the parent's global matrix to the calculation of correct
      // bounds, with what effects draw, and include the item's shadow
      // (#1628).
      let bounds = isFresh ? buffer.bounds : this.getPreviewBounds(viewMatrix)
      // Pass true for dontMerge, as groups don't draw the shadows of
      // their children.
      if (!isFresh && style._get('shadowColor', true)) {
        // Transform the shadow the same way as in _setStyles(), and
        // cover its blur up to three times the standard deviation,
        // which is half of shadowBlur in Canvas.
        const mx = viewMatrix._shiftless()
        const blur = mx.transform(new Point(style._get('shadowBlur', true), 0))
        const offset = mx.transform(style._get('shadowOffset', true))
        bounds = bounds.unite(
          new Rectangle(bounds.point.add(offset), bounds.size)
            .expand(blur.length * 3)
        )
      }
      if (buffer) {
        buffer.matrix = viewMatrix
        buffer.version = version
        buffer.bounds = bounds
      }
      // Only cover the part of the bounds that is visible on the canvas
      // that we're drawing into (#1644). NOTE: Item#rasterize() doesn't
      // set param.offset, so new Point() turns it into 0, 0.
      const { canvas } = ctx
      bounds = bounds.intersect(
        new Rectangle(
          new Point(param.offset),
          new Size(canvas.width, canvas.height).divide(pixelRatio)
        )
      )
      if (bounds.width <= 0 || bounds.height <= 0) {
        // Item won't be drawn so its global matrix need to be removed
        // from the stack (#1561).
        matrices.pop()
        return
      }
      // Store previous offset and save the main context, so we can
      // draw onto it later.
      prevOffset = param.offset
      // Floor the offset and ceil the size, so we don't cut off any
      // antialiased pixels when drawing onto the temporary canvas.
      itemOffset = param.offset = bounds._getTopLeft(true).floor()
      itemSize = bounds.size.ceil().add(1).multiply(pixelRatio).floor()
      // Set ctx to the context of the temporary canvas, so we draw onto
      // it, instead of the mainCtx. It may be larger than itemSize,
      // since only that part of it is composited:
      mainCtx = ctx
      if (buffer) {
        let bufferCanvas = buffer.canvas
        isFresh = (
          isFresh &&
          itemOffset.equals(buffer.offset) &&
          itemSize.equals(buffer.size)
        )
        if (
          !bufferCanvas ||
          bufferCanvas.width < itemSize.width ||
          bufferCanvas.height < itemSize.height
        ) {
          // In Chrome, OffscreenCanvas stays fast with many paths
          // where a detached canvas element doesn't:
          bufferCanvas = buffer.canvas = globalThis.OffscreenCanvas
            ? new OffscreenCanvas(itemSize.width, itemSize.height)
            : getCanvas(itemSize)
          isFresh = false
        }
        buffer.offset = itemOffset
        buffer.size = itemSize
        ctx = bufferCanvas.getContext('2d')
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        if (!isFresh) {
          ctx.clearRect(0, 0, bufferCanvas.width, bufferCanvas.height)
        }
      } else {
        ctx = getContext(itemSize, { minimum: true })
      }
      if (pixelRatio !== 1) {
        ctx.scale(pixelRatio, pixelRatio)
      }
    }
    ctx.save()
    // Get the transformation matrix for non-scaling strokes.
    const strokeMatrix = parentStrokeMatrix
      ? parentStrokeMatrix.appended(matrix)
      : // Pass `true` for dontMerge
        this._canScaleStroke && !this._style._get('strokeScaling', true)
        ? viewMatrix
        : null
    // If we're drawing into a separate canvas and a clipItem is defined
    // for the current rendering loop, we need to draw the clip item
    // again.
    const clip = !direct && param.clipItem
    // Clip items only clip, and the children of compound paths only add
    // to the path of their parent, so neither emits:
    const event = (
      this.responds('draw') &&
      !isFresh &&
      !param.clip &&
      !param.dontStart &&
      new DrawEvent({
        item: this,
        context: ctx,
        matrix: viewMatrix.clone(),
        pixelRatio,
        view: param.view ?? null
      })
    )
    // If we're drawing with a strokeMatrix, the CTM is reset either way
    // so we don't need to set it, except when we also have to draw a
    // clipItem, or emit the draw event in the item's coordinates.
    const transform = !strokeMatrix || clip || event
    // If drawing directly, handle opacity and native blending now,
    // otherwise we will do it later when the temporary canvas is composited.
    if (direct) {
      ctx.globalAlpha = opacity
      if (nativeBlend) {
        ctx.globalCompositeOperation = blendMode as GlobalCompositeOperation
      }
    } else if (transform) {
      // Translate the context so the topLeft of the item is at (0, 0)
      // on the temporary canvas.
      ctx.translate(-itemOffset.x, -itemOffset.y)
    }
    if (clip) {
      // The clip item is a sibling of this item, so draw it with the
      // parent's matrices before applying this item's matrix (#1594):
      const clipMatrix = param.viewMatrix
        ? param.viewMatrix.appended(parentMatrix)
        : parentMatrix
      clipMatrix.applyToContext(ctx)
      param.clipItem.draw(
        ctx,
        Object.assign(Object.create(param), {
          clip: true,
          matrices: matrices.slice(0, -1)
        })
      )
      matrix.applyToContext(ctx)
    } else if (transform) {
      // Apply viewMatrix when drawing into temporary canvas.
      ;(direct ? matrix : viewMatrix).applyToContext(ctx)
    }
    if (event) {
      // Don't let the handler's state leak into the default drawing:
      ctx.save()
      this.emit('draw', event)
      ctx.restore()
    }
    if (strokeMatrix) {
      // Reset the transformation but take HiDPI pixel ratio into account.
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      // Also offset again when drawing non-directly.
      // NOTE: Don't use itemOffset since offset might be from the parent,
      // e.g. CompoundPath
      const { offset } = param
      if (offset) {
        ctx.translate(-offset.x, -offset.y)
      }
    }
    if (!isFresh && !event?.prevented) {
      const drawParam =
        shadow && !direct
          ? Object.assign(Object.create(param), { dontShadow: true })
          : param
      const output = this.getEffectOutput()
      if (output) {
        // The output of the effects is drawn in the item's place, in
        // its coordinates, see #effects:
        output.draw(
          ctx,
          Object.assign(Object.create(drawParam), { updateMatrix: false }),
          strokeMatrix
        )
      } else {
        this._draw(ctx, drawParam, viewMatrix, strokeMatrix)
      }
    }
    ctx.restore()
    matrices.pop()
    if (param.clip && !param.dontFinish) {
      // Pass fill-rule to handle clipping with compound-paths (#1361).
      ctx.clip(this.fillRule as CanvasFillRule)
    }
    // If a temporary canvas was created, composite it onto the main canvas:
    if (!direct) {
      if (shadow) {
        mainCtx.save()
        this._setShadow(mainCtx, param, viewMatrix)
      }
      // Use blend() even for processing normal blendMode with opacity.
      blend(
        blendMode,
        ctx,
        mainCtx,
        opacity,
        // Calculate the pixel offset of the temporary canvas to the
        // main canvas. We also need to factor in the pixel-ratio.
        itemOffset.subtract(prevOffset).multiply(pixelRatio),
        itemSize
      )
      if (shadow) {
        mainCtx.restore()
      }
      // Return the temporary context, so it can be reused, unless the
      // group keeps it as its buffer:
      if (!buffer) {
        releaseCanvas(ctx)
      }
      // Restore previous offset.
      param.offset = prevOffset
    }
  }

  /**
   * Checks the _updateVersion of the item to see if it got drawn in the draw
   * loop. If the version is out of sync, the item is either not in the scene
   * graph anymore or is invisible.
   */
  _isUpdated(updateVersion: number): boolean {
    const parent = this._parent
    // For compound-paths, use the _updateVersion of the parent, because the
    // shape gets drawn at once at might get cached (e.g. Path2D soon).
    if (parent instanceof CompoundPath) {
      return parent._isUpdated(updateVersion)
    }
    // In case a parent is visible but isn't drawn (e.g. opacity == 0), the
    // _updateVersion of all its children will not be updated, but the
    // children should still be considered updated, and selections should be
    // drawn for them. Excluded are only items with _visible == false:
    let updated = this._updateVersion === updateVersion
    if (
      !updated &&
      parent?._visible &&
      parent._isUpdated(updateVersion)
    ) {
      this._updateVersion = updateVersion
      updated = true
    }
    return updated
  }

  // Hosts that draw the selection themselves only want the handlers, see
  // Project#hasDrawHandlers():
  _drawSelection(
    ctx: CanvasRenderingContext2D,
    matrix: Matrix,
    size: number,
    selectionItems: Record<string, Item>,
    updateVersion: number,
    handlersOnly?: boolean
  ) {
    const selection = this._selection
    const itemSelected = (
      !!(selection & ItemSelection.ITEM) &&
      !!this._drawSelected
    )
    const boundsSelected = (
      selection & ItemSelection.BOUNDS ||
      selection & ItemSelection.ITEM && this._selectBounds
    )
    const strokeBoundsSelected = selection & ItemSelection.STROKE_BOUNDS
    const positionSelected = selection & ItemSelection.POSITION
    // Items of symbol definitions are drawn too, but aren't inserted:
    if (selection && this._isUpdated(updateVersion) && this.isInserted()) {
      // Allow definition of selected color on a per item and per
      // layer level, with a fallback to #009dec
      const color = (
        this._style._get('selectedColor', true) ||
        this.layer?._style._get('selectedColor', true)
      )
      const mx = matrix.appended(this._getGlobalMatrix(true))
      const half = size / 2
      ctx.strokeStyle = ctx.fillStyle = color
        ? color.toCanvasStyle(ctx)
        : '#009dec'
      if (this.responds('drawselection')) {
        const event = new DrawEvent({
          item: this,
          context: ctx,
          matrix: mx.clone(),
          size,
          color: color ?? new Color(ctx.strokeStyle as string),
          view: this.view
        })
        // Don't let the handler's state leak into the default drawing:
        ctx.save()
        this.emit('drawselection', event)
        ctx.restore()
        if (event.prevented) {
          return
        }
      }
      if (handlersOnly) {
        return
      }
      if (itemSelected) {
        this._drawSelected(ctx, mx, selectionItems)
      }
      if (positionSelected) {
        // Convert position from the parent's coordinates system to the
        // global one:
        const position = this._getPosition(true)
        const parent = this._parent
        const { x, y } = parent?.localToGlobal(position) ?? position
        ctx.beginPath()
        ctx.arc(x, y, half, 0, Math.PI * 2, true)
        ctx.stroke()
        const deltas = [[0, -1], [1, 0], [0, 1], [-1, 0]]
        const start = half
        const end = size + 1
        for (const [dx, dy] of deltas) {
          ctx.moveTo(x + dx * start, y + dy * start)
          ctx.lineTo(x + dx * end, y + dy * end)
          ctx.stroke()
        }
      }
      const drawBounds = (bounds: Rectangle) => {
        const coords = mx._transformCorners(bounds)
        // Now draw a rectangle that connects the transformed
        // bounds corners, and draw the corners.
        ctx.beginPath()
        for (let i = 0; i < 8; i += 2) {
          ctx[i ? 'lineTo' : 'moveTo'](coords[i], coords[i + 1])
        }
        ctx.closePath()
        ctx.stroke()
        for (let i = 0; i < 8; i += 2) {
          ctx.fillRect(coords[i] - half, coords[i + 1] - half, size, size)
        }
      }
      if (boundsSelected) {
        drawBounds(this.internalBounds)
      }
      if (strokeBoundsSelected) {
        drawBounds(this.getBounds({ internal: true, stroke: true }))
      }
    }
  }

  _canComposite(): boolean {
    return false
  }

  /**
   * {@grouptitle Remove On Event}
   *
   * Removes the item when the events specified in the passed options object
   * occur.
   *
   * @option options.move {Boolean} remove the item when the next {@link
   *     Tool#onMouseMove} event is fired.
   *
   * @option options.drag {Boolean} remove the item when the next {@link
   *     Tool#onMouseDrag} event is fired.
   *
   * @option options.down {Boolean} remove the item when the next {@link
   *     Tool#onMouseDown} event is fired.
   *
   * @option options.up {Boolean} remove the item when the next {@link
   *     Tool#onMouseUp} event is fired.
   *
   * @param options
   *
   * @example {@paperscript height=200}
   * // Click and drag below:
   * function onMouseDrag(event) {
   *     // Create a circle shaped path at the mouse position,
   *     // with a radius of 10:
   *     var path = Path.circle({
   *         center: event.point,
   *         radius: 10,
   *         fillColor: 'black'
   *     });
   *
   *     // Remove the path on the next onMouseDrag or onMouseDown event:
   *     path.removeOn({
   *         drag: true,
   *         down: true
   *     });
   * }
   */
  // TODO: implement Item#removeOnFrame
  removeOn(options: {
    move?: boolean
    drag?: boolean
    down?: boolean
    up?: boolean
  }): this {
    for (const name in options) {
      if (options[name]) {
        const key = 'mouse' + name
        const project = this._project
        const sets = (project._removeSets ??= {})
        sets[key] ??= {}
        sets[key][this._id] = this
      }
    }
    return this
  }

  /**
   * {@grouptitle Tweening Functions}
   *
   * Tween item between two states.
   *
   * @option options.duration {Number} the duration of the tweening
   * @option [options.easing='linear'] {Function|String} an easing function or the type
   * of the easing: {@values 'linear' 'easeInQuad' 'easeOutQuad'
   * 'easeInOutQuad' 'easeInCubic' 'easeOutCubic' 'easeInOutCubic'
   * 'easeInQuart' 'easeOutQuart' 'easeInOutQuart' 'easeInQuint'
   * 'easeOutQuint' 'easeInOutQuint' 'easeInSine' 'easeOutSine'
   * 'easeInOutSine' 'easeInExpo' 'easeOutExpo' 'easeInOutExpo'
   * 'easeInCirc' 'easeOutCirc' 'easeInOutCirc'}
   * @option [options.start=true] {Boolean} whether to start tweening automatically
   *
   * @param from the state at the start of the tweening
   * @param to the state at the end of the tweening
   * @param options the options or the duration
   *
   * @example {@paperscript height=100}
   * // Tween fillColor:
   * var path = Path.circle({
   *     radius: view.bounds.height * 0.4,
   *     center: view.center
   * });
   * path.tween(
   *     { fillColor: 'blue' },
   *     { fillColor: 'red' },
   *     3000
   * );
   * @example {@paperscript height=100}
   * // Tween rotation:
   * var path = Shape.rectangle({
   *     fillColor: 'red',
   *     center: [50, view.center.y],
   *     size: [60, 60]
   * });
   * path.tween({
   *     rotation: 180,
   *     'position.x': view.bounds.width - 50,
   *     'fillColor.hue': '+= 90'
   * }, {
   *     easing: 'easeInOutCubic',
   *     duration: 2000
   * });
   */
  tween(from: object, to: object, options: TweenOptions | number): Tween
  /**
   * Tween item to a state.
   *
   * @param to the state at the end of the tweening
   * @param options the options or the duration
   *
   * @example {@paperscript height=200}
   * // Tween a nested property with relative values
   * var path = Path.rectangle({
   *     size: [100, 100],
   *     position: view.center,
   *     fillColor: 'red',
   * });
   *
   * var delta = { x: path.bounds.width / 2, y: 0 };
   *
   * path.tween({
   *     'segments[1].point': ['+=', delta],
   *     'segments[2].point.x': '-= 50'
   * }, 3000);
   *
   * @see Item#tween(from, to, options)
   */
  tween(to: object, options: TweenOptions | number): Tween
  /**
   * Tween item.
   *
   * @param options the options or the duration
   *
   * @see Item#tween(from, to, options)
   *
   * @example {@paperscript height=100}
   * // Start an empty tween and just use the update callback:
   * var path = Path.circle({
   *     fillColor: 'blue',
   *     radius: view.bounds.height * 0.4,
   *     center: view.center,
   * });
   * var pathFrom = path.clone({ insert: false })
   * var pathTo = Path.rectangle({
   *     position: view.center,
   *     rectangle: path.bounds,
   *     insert: false
   * });
   * path.tween(2000).onUpdate = function(event) {
   *     path.interpolate(pathFrom, pathTo, event.factor)
   * };
   */
  tween(options: TweenOptions | number): Tween
  tween(arg0: any, arg1?: any, arg2?: any): Tween {
    // If there are only two or one arguments, shift arguments to the
    // left by one (omit `from`):
    const [from, to, options] = arg2
      ? [arg0, arg1, arg2]
      : arg1
        ? [null, arg0, arg1]
        : [null, null, arg0]
    const easing = options?.easing
    const start = options?.start
    const duration = (
      options != null &&
      (typeof options === 'number' ? options : options.duration)
    )
    const tween = new Tween(this, from, to, duration, easing, start)
    function onFrame(this: Item, event: { time: number }) {
      tween._handleFrame(event.time * 1000)
      if (!tween.running) {
        this.off('frame', onFrame)
      }
    }
    if (duration) {
      this.on('frame', onFrame)
    }
    return tween
  }

  /**
   *
   * Tween item to a state.
   *
   * @param to the state at the end of the tweening
   * @param options the options or the duration
   *
   * @see Item#tween(to, options)
   */
  tweenTo(to: object, options: TweenOptions | number): Tween {
    return this.tween(null, to, options)
  }

  /**
   *
   * Tween item from a state to its state before the tweening.
   *
   * @param from the state at the start of the tweening
   * @param options the options or the duration
   *
   * @see Item#tween(from, to, options)
   *
   * @example {@paperscript height=100}
   * // Tween fillColor from red to the path's initial fillColor:
   * var path = Path.circle({
   *     fillColor: 'blue',
   *     radius: view.bounds.height * 0.4,
   *     center: view.center
   * });
   * path.tweenFrom({ fillColor: 'red' }, { duration: 1000 });
   */
  tweenFrom(from: object, options: TweenOptions | number): Tween {
    return this.tween(from, null, options)
  }

  /**
   * The function to be called whenever any item of the class or of its
   * subclasses is drawn, as {@link #onDraw} is for a single item, e.g.
   * `Path.onDraw` for all paths, including the ones created later. The
   * item's own handlers are called first, then the ones of its class and of
   * the classes it inherits from, up to `Item`, with `this` set to the item.
   * `Path.on('draw', handler)` and `Path.off('draw', handler)` attach and
   * detach them too. Only the drawing events can be handled for classes of
   * items. Classes are shared by all {@link PaperScope} objects, and so are
   * their handlers.
   */
  declare static onDraw: Handler | null

  /**
   * The function to be called when the selection of any selected item of the
   * class or of its subclasses is drawn, as {@link #onDrawSelection} is for
   * a single item, e.g. `Path.onDrawSelection` for all paths, see
   * {@link Item.onDraw}.
   */
  declare static onDrawSelection: Handler | null

  static {
    Object.assign(this.prototype, {
      _name: null,
      _effects: null,
      // All items apply their matrix by default.
      // Exceptions are Raster, SymbolItem, Clip and Shape.
      _applyMatrix: true,
      _canApplyMatrix: true,
      _canScaleStroke: false,
      _pivot: null,
      _visible: true,
      _blendMode: 'normal',
      _opacity: 1,
      _locked: false,
      _guide: false,
      _textWrap: null,
      _clipMask: false,
      _selection: 0,
      // Controls whether bounds should appear selected when the item is
      // selected. This is only turned off for Group, Layer and PathItem,
      // where it can be selected separately by setting
      // item.bounds.selected = true;
      _selectBounds: true,
      _selectChildren: false,
      // Provide information about fields to be serialized, with their
      // defaults that can be omitted. Subclasses spread these into theirs.
      _serializeFields: {
        name: null,
        applyMatrix: null,
        matrix: new Matrix(),
        pivot: null,
        visible: true,
        blendMode: 'normal',
        opacity: 1,
        locked: false,
        guide: false,
        clipMask: false,
        textWrap: null,
        effects: [],
        selected: false,
        data: {}
      },
      // The attributes that #copyAttributes() copies where the source defines
      // them, which subclasses extend:
      _attributes: [
        '_locked', '_visible', '_blendMode', '_opacity', '_clipMask',
        '_guide', '_textWrap'
      ],
      // Prioritize `applyMatrix` over `matrix`:
      _prioritize: ['applyMatrix']
    })

    // Only count the mouse events of inserted items, so removing an item
    // from a removed parent doesn't count them down twice:
    const mouseEvent = {
      install(this: Item, type: string) {
        if (this.isInserted()) {
          this.view._countItemEvent(type, 1)
        }
      },
      uninstall(this: Item, type: string) {
        if (this.isInserted()) {
          this.view._countItemEvent(type, -1)
        }
      }
    }
    defineEvents(this, {
      onFrame: {
        install(this: Item) {
          this.view._animateItem(this, true)
        },
        uninstall(this: Item) {
          this.view._animateItem(this, false)
        }
      },
      // Also for all items of a class, see Item.onDraw:
      onDraw: {
        classLevel: true,
        install(this: Item) {
          countDrawHandlers(this, 1)
        },
        uninstall(this: Item) {
          countDrawHandlers(this, -1)
        }
      },
      onDrawSelection: { classLevel: true },
      // Only for external sources, e.g. Raster
      onLoad: {},
      onError: {},
      ...Object.fromEntries(Item._itemHandlers.map(name => [name, mouseEvent]))
    })

    // Add the accessors of the style properties, see Style:
    defineStyleAccessors(this)

    // Produce getter/setters for properties. We need setters because we want
    // to call _changed() if a property was modified.
    const flags = {
      // #locked does not change appearance, all others do:
      locked: ChangeFlag.ATTRIBUTE,
      // #visible changes appearance
      visible: Change.ATTRIBUTE | Change.GEOMETRY
    }
    for (const name of ['locked', 'visible', 'blendMode', 'opacity', 'guide']) {
      const key = '_' + name
      inject(this.prototype, {
        get [name]() {
          return this[key]
        },
        set [name](value: any) {
          if (value != this[key]) {
            this[key] = value
            this._changed(flags[name] || Change.ATTRIBUTE)
          }
        }
      })
    }

    // Produce the bounds that differ from #bounds only by their options, as
    // accessors and as methods that take a matrix:
    const boundsOptions = {
      handleBounds: { handle: true },
      internalBounds: { internal: true }
    }
    for (const [key, options] of Object.entries(boundsOptions)) {
      const getter = `get${capitalize(key)}`
      inject(this.prototype, {
        [getter](matrix?: Matrix) {
          return this.getBounds(matrix, options)
        },
        get [key]() {
          return this[getter]()
        }
      })
    }

    // Produce the transformations around the item's position, or the center:
    for (const key of ['rotate', 'scale', 'shear', 'skew']) {
      inject(this.prototype, {
        [key](value: any, ver?: any, center?: any) {
          // scale(), shear() and skew() also take the two factors as numbers:
          const hasVer = key !== 'rotate' && typeof ver === 'number'
          const origin = (hasVer ? center : ver) ?? this._getPosition(true)
          const matrix = new Matrix()
          return this.transform(
            hasVer
              ? matrix[key](value, ver, origin)
              : matrix[key](value, origin)
          )
        }
      })
    }

    // Produce the shortcuts of #removeOn():
    for (const key of ['down', 'drag', 'up', 'move']) {
      inject(this.prototype, {
        [`removeOn${capitalize(key)}`]() {
          return this.removeOn({ [key]: true })
        }
      })
    }
  }
}

// The members defined at runtime rather than in the class body:
export interface Item {
  /**
   * Specifies whether the item is locked. When set to `true`, item
   * interactions with the mouse are disabled.
   *
   * @default false
   *
   * @example {@paperscript}
   * var unlockedItem = Path.circle({
   *     center: view.center - [35, 0],
   *     radius: 30,
   *     fillColor: 'springgreen',
   *     onMouseDown: function() {
   *         this.fillColor = Color.random();
   *     }
   * });
   *
   * var lockedItem = Path.circle({
   *     center: view.center + [35, 0],
   *     radius: 30,
   *     fillColor: 'crimson',
   *     locked: true,
   *     // This event won't be triggered because the item is locked.
   *     onMouseDown: function() {
   *         this.fillColor = Color.random();
   *     }
   * });
   *
   * new PointText({
   *     content: 'Click on both circles to see which one is locked.',
   *     point: view.center - [0, 35],
   *     justification: 'center'
   * });
   */
  locked: boolean

  /**
   * Specifies whether the item is visible. When set to `false`, the item
   * won't be drawn.
   *
   * @default true
   *
   * @example {@paperscript}
   * // Hiding an item:
   * var path = Path.circle({
   *     center: [50, 50],
   *     radius: 20,
   *     fillColor: 'red'
   * });
   *
   * // Hide the path:
   * path.visible = false;
   */
  visible: boolean

  /**
   * The blend mode with which the item is composited onto the canvas. Both
   * the standard canvas compositing modes, as well as the new CSS blend modes
   * are supported. Where the canvas doesn't support a CSS blend mode
   * natively, it draws as `'normal'`. Paper.js's own modes `'add'`,
   * `'subtract'`, `'average'`, `'pin-light'` and `'negation'` are emulated,
   * which can have an impact on performance.
   *
   * @values 'normal', 'multiply', 'screen', 'overlay', 'soft-light', 'hard-
   *     light', 'color-dodge', 'color-burn', 'darken', 'lighten',
   *     'difference', 'exclusion', 'hue', 'saturation', 'luminosity',
   *     'color', 'add', 'subtract', 'average', 'pin-light', 'negation',
   *     'source-over', 'source-in', 'source-out', 'source-atop',
   *     'destination-over', 'destination-in', 'destination-out',
   *     'destination-atop', 'lighter', 'darker', 'copy', 'xor'
   * @default 'normal'
   *
   * @example {@paperscript}
   * // Setting an item's blend mode:
   *
   * // Create a white rectangle in the background
   * // with the same dimensions as the view:
   * var background = Path.rectangle(view.bounds);
   * background.fillColor = 'white';
   *
   * var circle = Path.circle({
   *     center: [80, 50],
   *     radius: 35,
   *     fillColor: 'red'
   * });
   *
   * var circle2 = Path.circle({
   *     center: new Point(120, 50),
   *     radius: 35,
   *     fillColor: 'blue'
   * });
   *
   * // Set the blend mode of circle2:
   * circle2.blendMode = 'multiply';
   */
  blendMode: string

  /**
   * The opacity of the item as a value between `0` and `1`.
   *
   * @default 1
   *
   * @example {@paperscript}
   * // Making an item 50% transparent:
   * var circle = Path.circle({
   *     center: [80, 50],
   *     radius: 35,
   *     fillColor: 'red'
   * });
   *
   * var circle2 = Path.circle({
   *     center: new Point(120, 50),
   *     radius: 35,
   *     fillColor: 'blue',
   *     strokeColor: 'green',
   *     strokeWidth: 10
   * });
   *
   * // Make circle2 50% transparent:
   * circle2.opacity = 0.5;
   */
  opacity: number

  // TODO: Implement guides
  /**
   * Specifies whether the item functions as a guide. When set to `true`, the
   * item is drawn as usual, but left out of hit-tests and mouse
   * interactions. Hit-tests only find guides when `options.guides` is set,
   * and then only them, see {@link #hitTest(point[, options])}.
   *
   * @default false
   */
  guide: boolean

  /**
   * The bounding rectangle of the item including handles.
   */
  readonly handleBounds: Rectangle

  /**
   * Returns the bounding rectangle of the item including handles, transformed
   * by the matrix instead of the item's own matrix.
   *
   * @param [matrix] the matrix to transform the item's content by
   * @return the bounds
   */
  getHandleBounds(matrix?: Matrix): Rectangle

  /**
   * The bounding rectangle of the item without any matrix transformations.
   *
   * Typical use case would be drawing a frame around the object where you
   * want to draw something of the same size, position, rotation, and scaling,
   * like a selection frame.
   */
  readonly internalBounds: Rectangle

  /**
   * Returns the bounding rectangle of the item's content, transformed by the
   * matrix instead of none.
   *
   * @param [matrix] the matrix to transform the item's content by
   * @return the bounds
   */
  getInternalBounds(matrix?: Matrix): Rectangle

  /**
   * Rotates the item by a given angle around the given center point.
   *
   * Angles are oriented clockwise and measured in degrees.
   *
   * @param angle the rotation angle
   * @param [center={@link Item#position}]
   * @see Matrix#rotate(angle[, center])
   *
   * @example {@paperscript}
   * // Rotating an item:
   *
   * // Create a rectangle shaped path with its top left
   * // point at {x: 80, y: 25} and a size of {width: 50, height: 50}:
   * var path = Path.rectangle(new Point(80, 25), new Size(50, 50));
   * path.fillColor = 'black';
   *
   * // Rotate the path by 30 degrees:
   * path.rotate(30);
   *
   * @example {@paperscript height=200}
   * // Rotating an item around a specific point:
   *
   * // Create a rectangle shaped path with its top left
   * // point at {x: 175, y: 50} and a size of {width: 100, height: 100}:
   * var topLeft = new Point(175, 50);
   * var size = new Size(100, 100);
   * var path = Path.rectangle(topLeft, size);
   * path.fillColor = 'black';
   *
   * // Draw a circle shaped path in the center of the view,
   * // to show the rotation point:
   * var circle = Path.circle({
   *     center: view.center,
   *     radius: 5,
   *     fillColor: 'white'
   * });
   *
   * // Each frame rotate the path 3 degrees around the center point
   * // of the view:
   * function onFrame(event) {
   *     path.rotate(3, view.center);
   * }
   */
  rotate(angle: number, center?: PointLike): this

  /**
   * Scales the item by the given value from its center point, or optionally
   * from a supplied point.
   *
   * @param scale the scale factor
   * @param [center={@link Item#position}]
   *
   * @example {@paperscript}
   * // Scaling an item from its center point:
   *
   * // Create a circle shaped path at { x: 80, y: 50 }
   * // with a radius of 20:
   * var circle = Path.circle({
   *     center: [80, 50],
   *     radius: 20,
   *     fillColor: 'red'
   * });
   *
   * // Scale the path by 150% from its center point
   * circle.scale(1.5);
   *
   * @example {@paperscript}
   * // Scaling an item from a specific point:
   *
   * // Create a circle shaped path at { x: 80, y: 50 }
   * // with a radius of 20:
   * var circle = Path.circle({
   *     center: [80, 50],
   *     radius: 20,
   *     fillColor: 'red'
   * });
   *
   * // Scale the path 150% from its bottom left corner
   * circle.scale(1.5, circle.bounds.bottomLeft);
   */
  scale(scale: PointLike | number, center?: PointLike): this
  /**
   * Scales the item by the given values from its center point, or optionally
   * from a supplied point.
   *
   * @param hor the horizontal scale factor
   * @param ver the vertical scale factor
   * @param [center={@link Item#position}]
   *
   * @example {@paperscript}
   * // Scaling an item horizontally by 300%:
   *
   * // Create a circle shaped path at { x: 100, y: 50 }
   * // with a radius of 20:
   * var circle = Path.circle({
   *     center: [100, 50],
   *     radius: 20,
   *     fillColor: 'red'
   * });
   *
   * // Scale the path horizontally by 300%
   * circle.scale(3, 1);
   */
  scale(hor: number, ver: number, center?: PointLike): this

  // TODO: Add test for item shearing, as it might be behaving oddly.
  /**
   * Shears the item by the given value from its center point, or optionally
   * by a supplied point.
   *
   * @param shear the horizontal and vertical shear factors as a point
   * @param [center={@link Item#position}]
   * @see Matrix#shear(shear[, center])
   */
  shear(shear: PointLike | number, center?: PointLike): this
  /**
   * Shears the item by the given values from its center point, or optionally
   * by a supplied point.
   *
   * @param hor the horizontal shear factor
   * @param ver the vertical shear factor
   * @param [center={@link Item#position}]
   * @see Matrix#shear(hor, ver[, center])
   */
  shear(hor: number, ver: number, center?: PointLike): this

  /**
   * Skews the item by the given angles from its center point, or optionally
   * by a supplied point.
   *
   * @param skew the horizontal and vertical skew angles in degrees
   * @param [center={@link Item#position}]
   * @see Matrix#shear(skew[, center])
   */
  skew(skew: PointLike | number, center?: PointLike): this
  /**
   * Skews the item by the given angles from its center point, or optionally
   * by a supplied point.
   *
   * @param hor the horizontal skew angle in degrees
   * @param ver the vertical sskew angle in degrees
   * @param [center={@link Item#position}]
   * @see Matrix#shear(hor, ver[, center])
   */
  skew(hor: number, ver: number, center?: PointLike): this

  /**
   * Removes the item when the next {@link Tool#onMouseMove} event is fired.
   *
   * @example {@paperscript height=200}
   * // Move your mouse below:
   * function onMouseMove(event) {
   *     // Create a circle shaped path at the mouse position,
   *     // with a radius of 10:
   *     var path = Path.circle({
   *         center: event.point,
   *         radius: 10,
   *         fillColor: 'black'
   *     });
   *
   *     // On the next move event, automatically remove the path:
   *     path.removeOnMove();
   * }
   */
  removeOnMove(): this

  /**
   * Removes the item when the next {@link Tool#onMouseDown} event is fired.
   *
   * @example {@paperscript height=200}
   * // Click a few times below:
   * function onMouseDown(event) {
   *     // Create a circle shaped path at the mouse position,
   *     // with a radius of 10:
   *     var path = Path.circle({
   *         center: event.point,
   *         radius: 10,
   *         fillColor: 'black'
   *     });
   *
   *     // Remove the path, next time the mouse is pressed:
   *     path.removeOnDown();
   * }
   */
  removeOnDown(): this

  /**
   * Removes the item when the next {@link Tool#onMouseDrag} event is fired.
   *
   * @example {@paperscript height=200}
   * // Click and drag below:
   * function onMouseDrag(event) {
   *     // Create a circle shaped path at the mouse position,
   *     // with a radius of 10:
   *     var path = Path.circle({
   *         center: event.point,
   *         radius: 10,
   *         fillColor: 'black'
   *     });
   *
   *     // On the next drag event, automatically remove the path:
   *     path.removeOnDrag();
   * }
   */
  removeOnDrag(): this

  /**
   * Removes the item when the next {@link Tool#onMouseUp} event is fired.
   *
   * @example {@paperscript height=200}
   * // Click a few times below:
   * function onMouseDown(event) {
   *     // Create a circle shaped path at the mouse position,
   *     // with a radius of 10:
   *     var path = Path.circle({
   *         center: event.point,
   *         radius: 10,
   *         fillColor: 'black'
   *     });
   *
   *     // Remove the path, when the mouse is released:
   *     path.removeOnUp();
   * }
   */
  removeOnUp(): this

  // Document all style properties which get injected into Item by Style:

  /**
   * {@grouptitle Stroke Style}
   *
   * The color of the stroke.
   *
   * @example {@paperscript}
   * // Setting the stroke color of a path:
   *
   * // Create a circle shaped path at { x: 80, y: 50 }
   * // with a radius of 35:
   * var circle = Path.circle({
   *     center: [80, 50],
   *     radius: 35
   * });
   *
   * // Set its stroke color to RGB red:
   * circle.strokeColor = new Color(1, 0, 0);
   */
  get strokeColor(): Color | null
  set strokeColor(color: ColorLike | null)

  /**
   * The width of the stroke.
   *
   * @example {@paperscript}
   * // Setting an item's stroke width:
   *
   * // Create a circle shaped path at { x: 80, y: 50 }
   * // with a radius of 35:
   * var circle = Path.circle({
   *     center: [80, 50],
   *     radius: 35,
   *     strokeColor: 'red'
   * });
   *
   * // Set its stroke width to 10:
   * circle.strokeWidth = 10;
   */
  strokeWidth: number

  /**
   * The shape to be used at the beginning and end of open {@link Path} items,
   * when they have a stroke.
   *
   * @values 'round', 'square', 'butt'
   * @default 'butt'
   *
   * @example {@paperscript height=200}
   * // A look at the different stroke caps:
   *
   * var line = new Path({
   *     segments: [[80, 50], [420, 50]],
   *     strokeColor: 'black',
   *     strokeWidth: 20,
   *     selected: true
   * });
   *
   * // Set the stroke cap of the line to be round:
   * line.strokeCap = 'round';
   *
   * // Copy the path and set its stroke cap to be square:
   * var line2 = line.clone();
   * line2.position.y += 50;
   * line2.strokeCap = 'square';
   *
   * // Make another copy and set its stroke cap to be butt:
   * var line2 = line.clone();
   * line2.position.y += 100;
   * line2.strokeCap = 'butt';
   */
  strokeCap: string

  /**
   * The shape to be used at the segments and corners of {@link Path} items
   * when they have a stroke.
   *
   * @values 'miter', 'round', 'bevel'
   * @default 'miter'
   *
   * @example {@paperscript height=120}
   * // A look at the different stroke joins:
   * var path = new Path({
   *     segments: [[80, 100], [120, 40], [160, 100]],
   *     strokeColor: 'black',
   *     strokeWidth: 20,
   *     // Select the path, in order to see where the stroke is formed:
   *     selected: true
   * });
   *
   * var path2 = path.clone();
   * path2.position.x += path2.bounds.width * 1.5;
   * path2.strokeJoin = 'round';
   *
   * var path3 = path2.clone();
   * path3.position.x += path3.bounds.width * 1.5;
   * path3.strokeJoin = 'bevel';
   */
  strokeJoin: string

  /**
   * The dash offset of the stroke.
   *
   * @default 0
   */
  dashOffset: number

  /**
   * Specifies whether the stroke is to be drawn taking the current affine
   * transformation into account (the default behavior), or whether it should
   * appear as a non-scaling stroke. On text, non-scaling strokes are exact for
   * uniform scaling only, as the glyphs are always stroked through the
   * transformation.
   *
   * @default true
   */
  strokeScaling: boolean

  /**
   * Specifies an array containing the dash and gap lengths of the stroke.
   *
   * @example {@paperscript}
   * var path = Path.circle({
   *     center: [80, 50],
   *     radius: 40,
   *     strokeWidth: 2,
   *     strokeColor: 'black'
   * });
   *
   * // Set the dashed stroke to [10pt dash, 4pt gap]:
   * path.dashArray = [10, 4];
   *
   * @default []
   */
  dashArray: number[]

  /**
   * The miter limit of the stroke.
   * When two line segments meet at a sharp angle and miter joins have been
   * specified for {@link Item#strokeJoin}, it is possible for the miter to
   * extend far beyond the {@link Item#strokeWidth} of the path. The
   * miterLimit imposes a limit on the ratio of the miter length to the
   * {@link Item#strokeWidth}.
   *
   * @default 10
   */
  miterLimit: number

  /**
   * The order in which the fill and the stroke are painted, as in SVG's
   * `paint-order`, named after what is painted first: `'fill'` paints the
   * fill first, `'stroke'` paints the stroke first, so the fill covers its
   * inner half.
   *
   * @values 'fill', 'stroke'
   * @default 'fill'
   */
  paintOrder: string

  /**
   * {@grouptitle Fill Style}
   *
   * The fill color of the item.
   *
   * @example {@paperscript}
   * // Setting the fill color of a path to red:
   *
   * // Create a circle shaped path at { x: 80, y: 50 }
   * // with a radius of 35:
   * var circle = Path.circle({
   *     center: [80, 50],
   *     radius: 35
   * });
   *
   * // Set the fill color of the circle to RGB red:
   * circle.fillColor = new Color(1, 0, 0);
   */
  get fillColor(): Color | null
  set fillColor(color: ColorLike | null)

  /**
   * The fill-rule with which the shape gets filled. Please note that only
   * modern browsers support fill-rules other than `'nonzero'`.
   *
   * @values 'nonzero', 'evenodd'
   * @default 'nonzero'
   */
  fillRule: string

  /**
   * {@grouptitle Shadow Style}
   *
   * The shadow color.
   *
   * @example {@paperscript}
   * // Creating a circle with a black shadow:
   *
   * var circle = Path.circle({
   *     center: [80, 50],
   *     radius: 35,
   *     fillColor: 'white',
   *     // Set the shadow color of the circle to RGB black:
   *     shadowColor: new Color(0, 0, 0),
   *     // Set the shadow blur radius to 12:
   *     shadowBlur: 12,
   *     // Offset the shadow by { x: 5, y: 5 }
   *     shadowOffset: new Point(5, 5)
   * });
   */
  get shadowColor(): Color | null
  set shadowColor(color: ColorLike | null)

  /**
   * The shadow's blur radius.
   *
   * @default 0
   */
  shadowBlur: number

  /**
   * The shadow's offset.
   *
   * @default 0
   */
  get shadowOffset(): Point
  set shadowOffset(point: PointLike)

  // TODO: Find a better name than selectedColor. It should also be used for
  // guides, etc.
  /**
   * {@grouptitle Selection Style}
   *
   * The color the item is highlighted with when selected. If the item does
   * not specify its own color, the color defined by its layer is used instead.
   */
  get selectedColor(): Color | null
  set selectedColor(color: ColorLike | null)

  /**
   * {@grouptitle Event Handlers}
   *
   * Item level handler function to be called on each frame of an animation.
   * The function receives an event object which contains information about
   * the frame event:
   *
   * @option event.count {Number} the number of times the frame event was
   *     fired
   * @option event.time {Number} the total amount of time passed since the
   *     first frame event in seconds
   * @option event.delta {Number} the time passed in seconds since the last
   *     frame event
   *
   * @see View#onFrame
   *
   * @example {@paperscript}
   * // Creating an animation:
   *
   * // Create a rectangle shaped path with its top left point at:
   * // {x: 50, y: 25} and a size of {width: 50, height: 50}
   * var path = Path.rectangle(new Point(50, 25), new Size(50, 50));
   * path.fillColor = 'black';
   *
   * path.onFrame = function(event) {
   *     // Every frame, rotate the path by 3 degrees:
   *     this.rotate(3);
   * }
   */
  get onFrame(): Handler | null
  set onFrame(func: Handler | null)

  /**
   * The function to be called when the mouse button is pushed down on the
   * item. The function receives a {@link MouseEvent} object which contains
   * information about the mouse event.
   * Note that such mouse events bubble up the scene graph hierarchy and will
   * reach the view, unless they are stopped with {@link
   * Event#stopPropagation()} or by returning `false` from the handler.
   *
   * @see View#onMouseDown
   *
   * @example {@paperscript}
   * // Press the mouse button down on the circle shaped path, to make it red:
   *
   * // Create a circle shaped path at the center of the view:
   * var path = Path.circle({
   *     center: view.center,
   *     radius: 25,
   *     fillColor: 'black'
   * });
   *
   * // When the mouse is pressed on the item,
   * // set its fill color to red:
   * path.onMouseDown = function(event) {
   *     this.fillColor = 'red';
   * }
   *
   * @example {@paperscript}
   * // Press the mouse on the circle shaped paths to remove them:
   *
   * // Loop 30 times:
   * for (var i = 0; i < 30; i++) {
   *     // Create a circle shaped path at a random position
   *     // in the view:
   *     var path = Path.circle({
   *         center: Point.random() * view.size,
   *         radius: 25,
   *         fillColor: 'black',
   *         strokeColor: 'white'
   *     });
   *
   *     // When the mouse is pressed on the item, remove it:
   *     path.onMouseDown = function(event) {
   *         this.remove();
   *     }
   * }
   */
  get onMouseDown(): Handler | null
  set onMouseDown(func: Handler | null)

  /**
   * The function to be called when the mouse position changes while the mouse
   * is being dragged over the item. The function receives a {@link
   * MouseEvent} object which contains information about the mouse event.
   * Note that such mouse events bubble up the scene graph hierarchy and will
   * reach the view, unless they are stopped with {@link
   * Event#stopPropagation()} or by returning `false` from the handler.
   *
   * @see View#onMouseDrag
   *
   * @example {@paperscript height=240}
   * // Press and drag the mouse on the blue circle to move it:
   *
   * // Create a circle shaped path at the center of the view:
   * var path = Path.circle({
   *     center: view.center,
   *     radius: 50,
   *     fillColor: 'blue'
   * });
   *
   * // Install a drag event handler that moves the path along.
   * path.onMouseDrag = function(event) {
   *     path.position += event.delta;
   * }
   */
  get onMouseDrag(): Handler | null
  set onMouseDrag(func: Handler | null)

  /**
   * The function to be called when the mouse button is released over the item.
   * The function receives a {@link MouseEvent} object which contains
   * information about the mouse event.
   * Note that such mouse events bubble up the scene graph hierarchy and will
   * reach the view, unless they are stopped with {@link
   * Event#stopPropagation()} or by returning `false` from the handler.
   *
   * @see View#onMouseUp
   *
   * @example {@paperscript}
   * // Release the mouse button over the circle shaped path, to make it red:
   *
   * // Create a circle shaped path at the center of the view:
   * var path = Path.circle({
   *     center: view.center,
   *     radius: 25,
   *     fillColor: 'black'
   * });
   *
   * // When the mouse is released over the item,
   * // set its fill color to red:
   * path.onMouseUp = function(event) {
   *     this.fillColor = 'red';
   * }
   */
  get onMouseUp(): Handler | null
  set onMouseUp(func: Handler | null)

  /**
   * The function to be called when the mouse clicks on the item. The function
   * receives a {@link MouseEvent} object which contains information about the
   * mouse event.
   * Note that such mouse events bubble up the scene graph hierarchy and will
   * reach the view, unless they are stopped with {@link
   * Event#stopPropagation()} or by returning `false` from the handler.
   *
   * @see View#onClick
   *
   * @example {@paperscript}
   * // Click on the circle shaped path, to make it red:
   *
   * // Create a circle shaped path at the center of the view:
   * var path = Path.circle({
   *     center: view.center,
   *     radius: 25,
   *     fillColor: 'black'
   * });
   *
   * // When the mouse is clicked on the item,
   * // set its fill color to red:
   * path.onClick = function(event) {
   *     this.fillColor = 'red';
   * }
   *
   * @example {@paperscript}
   * // Click on the circle shaped paths to remove them:
   *
   * // Loop 30 times:
   * for (var i = 0; i < 30; i++) {
   *     // Create a circle shaped path at a random position
   *     // in the view:
   *     var path = Path.circle({
   *         center: Point.random() * view.size,
   *         radius: 25,
   *         fillColor: 'black',
   *         strokeColor: 'white'
   *     });
   *
   *     // When the mouse clicks on the item, remove it:
   *     path.onClick = function(event) {
   *         this.remove();
   *     }
   * }
   */
  get onClick(): Handler | null
  set onClick(func: Handler | null)

  /**
   * The function to be called when the mouse double clicks on the item. The
   * function receives a {@link MouseEvent} object which contains information
   * about the mouse event.
   * Note that such mouse events bubble up the scene graph hierarchy and will
   * reach the view, unless they are stopped with {@link
   * Event#stopPropagation()} or by returning `false` from the handler.
   *
   * @see View#onDoubleClick
   *
   * @example {@paperscript}
   * // Double click on the circle shaped path, to make it red:
   *
   * // Create a circle shaped path at the center of the view:
   * var path = Path.circle({
   *     center: view.center,
   *     radius: 25,
   *     fillColor: 'black'
   * });
   *
   * // When the mouse is double clicked on the item,
   * // set its fill color to red:
   * path.onDoubleClick = function(event) {
   *     this.fillColor = 'red';
   * }
   *
   * @example {@paperscript}
   * // Double click on the circle shaped paths to remove them:
   *
   * // Loop 30 times:
   * for (var i = 0; i < 30; i++) {
   *     // Create a circle shaped path at a random position
   *     // in the view:
   *     var path = Path.circle({
   *         center: Point.random() * view.size,
   *         radius: 25,
   *         fillColor: 'black',
   *         strokeColor: 'white'
   *     });
   *
   *     // When the mouse is double clicked on the item, remove it:
   *     path.onDoubleClick = function(event) {
   *         this.remove();
   *     }
   * }
   */
  get onDoubleClick(): Handler | null
  set onDoubleClick(func: Handler | null)

  /**
   * The function to be called repeatedly while the mouse moves over the item.
   * The function receives a {@link MouseEvent} object which contains
   * information about the mouse event.
   * Note that such mouse events bubble up the scene graph hierarchy and will
   * reach the view, unless they are stopped with {@link
   * Event#stopPropagation()} or by returning `false` from the handler.
   *
   * @see View#onMouseMove
   *
   * @example {@paperscript}
   * // Move over the circle shaped path, to change its opacity:
   *
   * // Create a circle shaped path at the center of the view:
   *     var path = Path.circle({
   *     center: view.center,
   *     radius: 25,
   *     fillColor: 'black'
   *     });
   *
   * // When the mouse moves on top of the item, set its opacity
   * // to a random value between 0 and 1:
   * path.onMouseMove = function(event) {
   *     this.opacity = Math.random();
   * }
   */
  get onMouseMove(): Handler | null
  set onMouseMove(func: Handler | null)

  /**
   * The function to be called when the mouse moves over the item. This
   * function will only be called again, once the mouse moved outside of the
   * item first. The function receives a {@link MouseEvent} object which
   * contains information about the mouse event.
   * Note that such mouse events bubble up the scene graph hierarchy and will
   * reach the view, unless they are stopped with {@link
   * Event#stopPropagation()} or by returning `false` from the handler.
   *
   * @see View#onMouseEnter
   *
   * @example {@paperscript}
   * // When you move the mouse over the item, its fill color is set to red.
   * // When you move the mouse outside again, its fill color is set back
   * // to black.
   *
   * // Create a circle shaped path at the center of the view:
   * var path = Path.circle({
   *     center: view.center,
   *     radius: 25,
   *     fillColor: 'black'
   * });
   *
   * // When the mouse enters the item, set its fill color to red:
   * path.onMouseEnter = function(event) {
   *     this.fillColor = 'red';
   * }
   *
   * // When the mouse leaves the item, set its fill color to black:
   * path.onMouseLeave = function(event) {
   *     this.fillColor = 'black';
   * }
   * @example {@paperscript}
   * // When you click the mouse, you create new circle shaped items. When you
   * // move the mouse over the item, its fill color is set to red. When you
   * // move the mouse outside again, its fill color is set back
   * // to black.
   *
   * function enter(event) {
   *     this.fillColor = 'red';
   * }
   *
   * function leave(event) {
   *     this.fillColor = 'black';
   * }
   *
   * // When the mouse is pressed:
   * function onMouseDown(event) {
   *     // Create a circle shaped path at the position of the mouse:
   *     var path = Path.circle(event.point, 25);
   *     path.fillColor = 'black';
   *
   *     // When the mouse enters the item, set its fill color to red:
   *     path.onMouseEnter = enter;
   *
   *     // When the mouse leaves the item, set its fill color to black:
   *     path.onMouseLeave = leave;
   * }
   */
  get onMouseEnter(): Handler | null
  set onMouseEnter(func: Handler | null)

  /**
   * The function to be called when the mouse moves out of the item.
   * The function receives a {@link MouseEvent} object which contains
   * information about the mouse event.
   * Note that such mouse events bubble up the scene graph hierarchy and will
   * reach the view, unless they are stopped with {@link
   * Event#stopPropagation()} or by returning `false` from the handler.
   *
   * @see View#onMouseLeave
   *
   * @example {@paperscript}
   * // Move the mouse over the circle shaped path and then move it out
   * // of it again to set its fill color to red:
   *
   * // Create a circle shaped path at the center of the view:
   * var path = Path.circle({
   *     center: view.center,
   *     radius: 25,
   *     fillColor: 'black'
   * });
   *
   * // When the mouse leaves the item, set its fill color to red:
   * path.onMouseLeave = function(event) {
   *     this.fillColor = 'red';
   * }
   */
  get onMouseLeave(): Handler | null
  set onMouseLeave(func: Handler | null)

  /**
   * The function to be called whenever the item is drawn: in views, in
   * {@link #rasterize()}, and once for each placement of a symbol whose
   * definition contains it. It is called right before the item's default
   * drawing, and draws with the canvas API beneath it, or replaces it by
   * returning `false` or calling `event.preventDefault()`. The function
   * receives a {@link DrawEvent} object with these fields:
   *
   * @option event.item {Item} the item that is drawn
   * @option event.context {CanvasRenderingContext2D} the canvas context,
   *     transformed into the item's coordinates
   * @option event.matrix {Matrix} the matrix from the item's coordinates to
   *     the pixels of the view, without its pixel ratio, for drawing things
   *     at a size in pixels
   * @option event.pixelRatio {Number} the device pixels per pixel: the
   *     view's pixel ratio, or the resolution divided by 72 in
   *     {@link #rasterize()}
   * @option event.view {View} the view drawn into, or `null` in
   *     {@link #rasterize()}
   *
   * What the handler draws isn't part of the item's hit testing, its bounds
   * or its SVG export. In buffered groups, it is only called when the group
   * draws its buffer again, see {@link Group#buffered}.
   *
   * @example {@paperscript}
   * // Draw a hairline cross through the center of a circle, beneath it:
   * var path = Path.circle({
   *     center: view.center,
   *     radius: 25,
   *     fillColor: 'rgba(255, 0, 0, 0.5)'
   * });
   *
   * path.onDraw = function(event) {
   *     var ctx = event.context,
   *         center = this.position,
   *         scale = event.matrix.scaling.x;
   *     ctx.beginPath();
   *     ctx.moveTo(center.x - 40, center.y);
   *     ctx.lineTo(center.x + 40, center.y);
   *     ctx.moveTo(center.x, center.y - 40);
   *     ctx.lineTo(center.x, center.y + 40);
   *     ctx.lineWidth = 1 / scale;
   *     ctx.stroke();
   * }
   */
  get onDraw(): Handler | null
  set onDraw(func: Handler | null)

  /**
   * The function to be called when the selection of the selected item is
   * drawn, over all the content. It is called right before the item's
   * default selection drawing, and draws with the canvas API beneath it, or
   * replaces it by returning `false` or calling `event.preventDefault()`. The
   * function receives a {@link DrawEvent} object with these fields:
   *
   * @option event.item {Item} the selected item
   * @option event.context {CanvasRenderingContext2D} the canvas context, in
   *     the pixels of the view, with the selection color as its `strokeStyle`
   *     and `fillStyle`, and a `lineWidth` of 1
   * @option event.matrix {Matrix} the matrix from the item's coordinates to
   *     the pixels of the view
   * @option event.size {Number} the size of the handles, see
   *     {@link PaperScope#settings}
   * @option event.color {Color} the selection color, see
   *     {@link #selectedColor}
   * @option event.view {View} the view drawn into
   *
   * What the handler draws isn't part of the item's hit testing, its bounds
   * or its SVG export.
   *
   * @example {@paperscript}
   * // Draw the selection of a path as a dot at each segment:
   * var path = Path.star({
   *     center: view.center,
   *     points: 5,
   *     radius1: 20,
   *     radius2: 40,
   *     strokeColor: 'black',
   *     selected: true
   * });
   *
   * path.onDrawSelection = function(event) {
   *     var ctx = event.context;
   *     this.segments.forEach(function(segment) {
   *         var point = event.matrix.transform(segment.point);
   *         ctx.beginPath();
   *         ctx.arc(point.x, point.y, event.size, 0, Math.PI * 2);
   *         ctx.fill();
   *     });
   *     return false;
   * }
   */
  get onDrawSelection(): Handler | null
  set onDrawSelection(func: Handler | null)

  // Only for external sources, e.g. Raster:
  get onLoad(): Handler | null
  set onLoad(func: Handler | null)
  get onError(): Handler | null
  set onError(func: Handler | null)

  /**
   * {@grouptitle Event Handling}
   *
   * Attaches an event handler to the item.
   *
   * @param type the type of event: {@values 'frame', mousedown',
   *     'mouseup', 'mousedrag', 'click', 'doubleclick', 'mousemove',
   *     'mouseenter', 'mouseleave', 'draw', 'drawselection'}
   * @param function the function to be called when the event
   *     occurs, receiving a {@link MouseEvent} or {@link Event} object as its
   *     sole argument
   * @return this item itself, so calls can be chained
   * @chainable
   *
   * @example {@paperscript}
   * // Change the fill color of the path to red when the mouse enters its
   * // shape and back to black again, when it leaves its shape.
   *
   * // Create a circle shaped path at the center of the view:
   * var path = Path.circle({
   *     center: view.center,
   *     radius: 25,
   *     fillColor: 'black'
   * });
   *
   * // When the mouse enters the item, set its fill color to red:
   * path.on('mouseenter', function() {
   *     this.fillColor = 'red';
   * });
   *
   * // When the mouse leaves the item, set its fill color to black:
   * path.on('mouseleave', function() {
   *     this.fillColor = 'black';
   * });
   */
  on(type: string, func: Handler): this
  /**
   * Attaches one or more event handlers to the item.
   *
   * @param object an object containing one or more of the following
   *     properties: {@values frame, mousedown, mouseup, mousedrag, click,
   *     doubleclick, mousemove, mouseenter, mouseleave, draw, drawselection}
   * @return this item itself, so calls can be chained
   * @chainable
   *
   * @example {@paperscript}
   * // Change the fill color of the path to red when the mouse enters its
   * // shape and back to black again, when it leaves its shape.
   *
   * // Create a circle shaped path at the center of the view:
   * var path = Path.circle({
   *     center: view.center,
   *     radius: 25
   * });
   * path.fillColor = 'black';
   *
   * // When the mouse enters the item, set its fill color to red:
   * path.on({
   *     mouseenter: function(event) {
   *         this.fillColor = 'red';
   *     },
   *     mouseleave: function(event) {
   *         this.fillColor = 'black';
   *     }
   * });
   * @example {@paperscript}
   * // When you click the mouse, you create new circle shaped items. When you
   * // move the mouse over the item, its fill color is set to red. When you
   * // move the mouse outside again, its fill color is set black.
   *
   * var pathHandlers = {
   *     mouseenter: function(event) {
   *         this.fillColor = 'red';
   *     },
   *     mouseleave: function(event) {
   *         this.fillColor = 'black';
   *     }
   * }
   *
   * // When the mouse is pressed:
   * function onMouseDown(event) {
   *     // Create a circle shaped path at the position of the mouse:
   *     var path = Path.circle({
   *         center: event.point,
   *         radius: 25,
   *         fillColor: 'black'
   *     });
   *
   *     // Attach the handers inside the object literal to the path:
   *     path.on(pathHandlers);
   * }
   */
  on(object: Record<string, Handler>): this

  /**
   * Detach an event handler from the item.
   *
   * @param type the type of event: {@values 'frame', mousedown',
   *     'mouseup', 'mousedrag', 'click', 'doubleclick', 'mousemove',
   *     'mouseenter', 'mouseleave', 'draw', 'drawselection'}
   * @param function the function to be detached
   * @return this item itself, so calls can be chained
   * @chainable
   */
  off(type: string, func?: Handler): this
  /**
   * Detach one or more event handlers to the item.
   *
   * @param object an object containing one or more of the following
   *     properties: {@values frame, mousedown, mouseup, mousedrag, click,
   *     doubleclick, mousemove, mouseenter, mouseleave, draw, drawselection}
   * @return this item itself, so calls can be chained
   * @chainable
   */
  off(object: Record<string, Handler>): this

  /**
   * Emit an event on the item.
   *
   * @param type the type of event: {@values 'frame', mousedown',
   *     'mouseup', 'mousedrag', 'click', 'doubleclick', 'mousemove',
   *     'mouseenter', 'mouseleave', 'draw', 'drawselection'}
   * @param event an object literal containing properties describing
   * the event
   * @return {@true if the event had listeners}
   */
  emit(type: string, event?: any, ...args: any[]): boolean

  /**
   * Check if the item has one or more event handlers of the specified type.
   *
   * @param type the type of event: {@values 'frame', mousedown',
   *     'mouseup', 'mousedrag', 'click', 'doubleclick', 'mousemove',
   *     'mouseenter', 'mouseleave', 'draw', 'drawselection'}
   * @return {@true if the item has one or more event handlers of
   * the specified type}
   */
  responds(type: string): boolean

  /**
   * {@grouptitle Importing / Exporting JSON and SVG}
   *
   * Exports (serializes) the item with its content and child items to a JSON
   * data string.
   *
   * @option [options.asString=true] {Boolean} whether the JSON is returned as
   *     a `Object` or a `String`
   * @option [options.precision=5] {Number} the amount of fractional digits in
   *     numbers used in JSON data
   *
   * @param [options] the serialization options
   * @return the exported JSON data
   */
  exportJSON(options?: { asString?: boolean; precision?: number }): any

  // Implemented by the subclasses that draw content and selections:
  _draw(
    ctx: CanvasRenderingContext2D,
    param: any,
    viewMatrix: Matrix,
    strokeMatrix?: Matrix
  ): void
  _drawSelected?(
    ctx: CanvasRenderingContext2D,
    matrix: Matrix,
    selectionItems: Record<string, Item>
  ): void
}

/**
 * Performs a hit-test on the item or project, see Item#hitTest(), which
 * Project shares.
 *
 * @private
 */
export function hitTest(
  owner: Item | Project,
  point: PointLike,
  options?: Record<string, any>
): HitResult | null {
  return owner._hitTest(Point.from(point), HitResult.getOptions(options))
}

/**
 * Collects all hits on the item or project, see Item#hitTestAll(), which
 * Project shares.
 *
 * @private
 */
export function hitTestAll(
  owner: Item | Project,
  point: PointLike,
  options?: Record<string, any>
): HitResult[] {
  const all = []
  owner._hitTest(
    Point.from(point),
    Object.assign(Object.create(HitResult.getOptions(options)), { all })
  )
  return all
}

/**
 * Hit-tests the children of the item or project, from the top down.
 *
 * @private
 */
export function hitTestChildren(
  owner: Item | Project,
  point: Point,
  options: Record<string, any>,
  viewMatrix?: Matrix,
  // Only used in Group#_hitTestChildren() to exclude #clipItem:
  _exclude?: Item
): HitResult | null {
  const children = owner._children
  if (children) {
    // Loop backwards, so items that get drawn last are tested first.
    for (let i = children.length - 1; i >= 0; i--) {
      const child = children[i]
      const res = (
        child !== _exclude &&
        child._hitTest(point, options, viewMatrix)
      )
      // Only return the found result if we're not asked to collect
      // all matches through hitTestAll()
      if (res && !options.all) {
        return res
      }
    }
  }
  return null
}

/**
 * Imports (deserializes) JSON data, into the target if it is of the class
 * of the data's root, see Item#importJSON() and Project#importJSON().
 * References of the form `['@key']` go to resolve(key).
 *
 * @private
 */
export function importJSON(
  json: string | any[],
  target?: Item | null,
  resolve?: (key: string) => any
): any {
  let reusable = target
  return deserialize(
    typeof json === 'string' ? JSON.parse(json) : json,
    // Provide our own create function to handle target and insertion:
    (ctor, args, isRoot) => {
      // If a target is provided and it's of the right type for the root
      // item, import right into it.
      const useTarget = isRoot && reusable?.constructor === ctor
      const isItem = ctor.prototype instanceof Item
      const isLayer = ctor === Layer || ctor.prototype instanceof Layer
      let values = args
      // NOTE: We don't set insert false for layers since we want these to be
      // created on the fly in the active project into which we're importing
      // (except for if it's a preexisting target layer).
      if (args.length === 1 && isItem && (useTarget || !isLayer)) {
        const [arg] = args
        if (isPlainObject(arg)) {
          arg.insert = false
          // When using target, make sure the `item.insert()` method is not
          // overridden with the `arg.insert` property that was just set.
          // Pass an exclude object to the call of `set()` below (#1392).
          if (useTarget) {
            values = [arg, Item.INSERT]
          }
        }
      }
      if (useTarget) {
        // When reusing an object, initialize it through #set() instead of
        // the constructor. Clear target to only use it once:
        const obj = reusable
        reusable = null
        return obj.set(values[0], values[1])
      }
      return new ctor(...values)
    },
    resolve
  )
}

// Count the classes and the inserted items with draw handlers, for hosts
// that draw the items themselves, see Project#hasDrawHandlers():
function countDrawHandlers(item: Item, sign: number) {
  if (item === item.constructor.prototype) {
    Item._drawCount += sign
  } else if (item.isInserted()) {
    item._project._drawCount += sign
  }
}

// Returns whether the item or its content have visible effects:
function hasEffects(item: Item): boolean {
  return (
    item._hasEffects() ||
    !!item._children?.some(child => hasEffects(child))
  )
}
