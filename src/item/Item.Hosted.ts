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

import { getClass } from '../core/serialization.ts'
import { paper } from '../core/PaperScope.ts'
import { Change, ChangeFlag, ItemSelection } from '../constants.ts'
import { inject } from '../util/object.ts'
import { addNamed } from '../util/list.ts'
import { getUID } from '../util/uid.ts'
import { Matrix } from '../basic/Matrix.ts'
import { Rectangle } from '../basic/Rectangle.ts'
import { Size } from '../basic/Size.ts'
import { Style } from '../style/Style.ts'
import type { Color } from '../style/Color.ts'
import { PatternDefinition } from '../style/PatternDefinition.ts'
import { DrawEvent } from '../event/DrawEvent.ts'
import { Path } from '../path/Path.ts'
import { CompoundPath } from '../path/CompoundPath.ts'
import { TextItem } from '../text/TextItem.ts'
import type { TextLine } from '../text/TextItem.ts'
import { PointText } from '../text/PointText.ts'
import { PathText } from '../text/PathText.ts'
import { AreaText } from '../text/AreaText.ts'
import { Item, importJSON } from './Item.ts'
import type { BoundsOptions } from './Item.ts'
import { Group } from './Group.ts'
import { Layer } from './Layer.ts'
import { Project } from './Project.ts'
import { Raster } from './Raster.ts'
import { HostItem } from './HostItem.ts'
import { ItemDefinition } from './ItemDefinition.ts'
import { SymbolDefinition } from './SymbolDefinition.ts'
import { SymbolItem } from './SymbolItem.ts'

// Items backed by a host document, see Project#host. Each item of such a
// project is created as a shell from the host's record of it, and loads its
// content on first access to any of the fields that hold it.

/**
 * The records of host nodes, as columns, see {@link Project#host}.
 */
export type HostColumns = {
  keys: ArrayLike<number>
  types: ArrayLike<number>
  typeNames: string[]
  flags: ArrayLike<number>
  boxes?: ArrayLike<number>
  names?: Record<number, string>
  matrices?: Record<number, number[]>
  // Only in Project#invalidate():
  definitions?: string[]
}

/**
 * The host document that a project's items come from, see
 * {@link Project#host}.
 */
export type Host = {
  getChildren(key: number | null): HostColumns
  getBounds?(key: number): ArrayLike<number> | null
  getItem(key: number): any[] | string
  getImage?(key: number): HTMLCanvasElement
  getStory?(key: number): any[] | string
  getAncestorKeys(key: number): number[] | null
  layOut?(
    json: string | null,
    start: number,
    key: number | null
  ): { end: number; lines: TextLine[] }
  getDefinition(key: string): any[] | string | null
  getDefinitionKeys(type: string): string[]
}

type Definition = SymbolDefinition | PatternDefinition

// The fields that #_load() fills in, by the class that defines them:
const contentFields: [Function, string[]][] = [
  [
    Item,
    [
      '_style', '_applyMatrix', '_opacity', '_blendMode', '_pivot', '_data',
      '_textWrap', '_effects'
    ]
  ],
  [
    Path,
    [
      '_segments', '_closed', '_version', '_curves', '_segmentSelection',
      '_strokeProfile'
    ]
  ],
  [CompoundPath, ['_children', '_namedChildren']],
  [SymbolItem, ['_definition']],
  [HostItem, ['_values']],
  [Raster, ['_size', '_loaded']],
  [TextItem, ['_story', '_orientation', '_layout', '_fontMetrics']],
  // The text path is a text's content, not one of its children:
  [
    PathText,
    ['_children', '_startOffset', '_endOffset', '_alignment', '_spacing']
  ],
  [
    AreaText,
    [
      '_children', '_columns', '_rows', '_gutter', '_inset',
      '_verticalAlign'
    ]
  ]
]
// The fields that #_loadChildren() fills in on containers of hosted
// items, Group and HostItem with _hasChildren:
const childrenFields = ['_children', '_namedChildren']
// The fields that #_loadPixels() fills in on rasters from the host's
// image, after their content:
const pixelFields = ['_image', '_canvas', '_context']
// The host boxes per item: bounds, strokeBounds and roughBounds.
const boxSize = 12
const shellPrototypes: Record<string, Item> = {}
// The flags of the host's records, see Project#host, and the two
// more of Project#invalidate():
const recordFlags = {
  selected: 1,
  visible: 2,
  locked: 4,
  strokeScaling: 8,
  content: 16,
  children: 32,
  clipMask: 64,
  guide: 128,
  empty: 256
}
// The changes that outdate the host's boxes:
const boundsFlags = ChangeFlag.GEOMETRY | ChangeFlag.STROKE
// Set while loading or invalidating, which aren't changes:
let isLoading = false
// The copies of definitions that one insertion or copy brings into a
// project with another host, see copyDefinitions():
let definitionCopies: Record<number, Definition> = null

// Keep the members that the hosted ones replace, to call them:
const { get: getName, set: setName } = Object.getOwnPropertyDescriptor(
  ItemDefinition.prototype,
  'name'
)

// Definitions that the host shares export as references to its keys:
inject(ItemDefinition.prototype, {
  _key: null,

  // The key of the host's definition, see Project#host. It can only be
  // set once, on a definition created by a script, to register the key
  // that the host gave its new definition:
  get key(): string {
    return this._key
  },

  set key(key: string) {
    const definitionsByKey = this.project._definitionsByKey
    if (this._key != null) {
      throw new Error('Unable to change the key of a definition.')
    }
    if (!definitionsByKey) {
      throw new Error('Unable to set a key in a project without a host.')
    }
    this._key = key
    definitionsByKey[key] = this
  },

  get name(): string {
    return getName.call(this)
  },

  set name(name: string) {
    if (this._key != null) {
      throw new Error('Unable to rename a definition of the host.')
    }
    setName.call(this, name)
  }
})

for (const ctor of [SymbolDefinition, PatternDefinition]) {
  const { _serialize } = ctor.prototype
  inject(ctor.prototype, {
    _serialize(this: Definition, options: any, dictionary: any) {
      return this._key != null
        ? ['@' + this._key]
        : _serialize.call(this, options, dictionary)
    }
  })
}

const {
  _setProject,
  copyAttributes,
  insertChildren,
  clone,
  reverseChildren
} = Item.prototype

inject(Item.prototype, {
  _key: null,

  get key(): number {
    return this._key
  },

  set key(key: number) {
    const itemsByKey = this._project._itemsByKey
    if (this._key != null) {
      throw new Error('Unable to change the key of an item.')
    }
    if (!itemsByKey) {
      throw new Error('Unable to set a key in a project without a host.')
    }
    this._key = key
    itemsByKey[key] = this
  },

  // An item that moves to a project with another host is new there: it
  // loads from its own host first, while still in its project, and then
  // drops its key. The children follow as _setProject() reaches them:
  _setProject(this: Item, project: Project, installEvents?: boolean) {
    const from = this._project
    const host = from?._host
    const isNewHost = !!host && host !== project._host
    if (isNewHost && this._key != null) {
      if (this._shell) {
        this._load()
      }
      if (
        this._contentFields &&
        !Object.hasOwn(this, '_children') &&
        (this instanceof Group || this._hasChildren)
      ) {
        this._loadChildren()
      }
      delete from._itemsByKey[this._key]
      // Its bounds no longer come from the host's boxes:
      this._key = this._boxes = null
      this._hostBounds = false
    }
    _setProject.call(this, project, installEvents)
    // Copy once the item is in the new project, which logs the change,
    // as part of its insertion:
    if (isNewHost) {
      // Linked text brings a copy of its story along, which flows on
      // through the items that stay:
      if (this instanceof TextItem && this.isLinked()) {
        const story = this._story
        const items = story._items
        items.splice(items.indexOf(this), 1)
        this._story = story._clone([this])
        story._changed(Change.CONTENT)
      }
      copyDefinitions(project, this)
    }
  },

  // Copies made in a project with another host use copies of the
  // definitions there too, as items that move do:
  copyAttributes(this: Item, source: Item, excludeMatrix?: boolean) {
    const project = this._project
    const isNewHost = (
      project &&
      isFromOtherHost(this, source._project, project)
    )
    copyAttributes.call(this, source, excludeMatrix)
    if (isNewHost) {
      copyDefinitions(project, this)
    }
  },

  // Check all items before moving any, as removing comes first. An item
  // of the host that moves reorders the children it joins, and those it
  // leaves in another project. One from another host is new here:
  insertChildren(this: Item, index: number, items: Item[]): Item[] | null {
    let isEntering = false
    const reordered = []
    for (const item of items ?? []) {
      if (item instanceof Item) {
        const isOther = isFromOtherHost(item, item._project, this._project)
        isEntering ||= isOther
        if (item._key != null) {
          if (!isOther) {
            reordered.push(this)
          }
          if (item._project !== this._project) {
            reordered.push(item._parent)
          }
        }
      }
    }
    const res = isEntering
      ? whileEntering(() => insertChildren.call(this, index, items))
      : insertChildren.call(this, index, items)
    reordered.forEach(setReordered)
    return res
  },

  clone(this: Item, options?: { insert?: boolean; deep?: boolean } | boolean) {
    return this._project?._host
      ? whileEntering(() => clone.call(this, options))
      : clone.call(this, options)
  },

  reverseChildren(this: Item) {
    reverseChildren.call(this)
    setReordered(this)
  },

  _getHostBounds(this: Item, options: BoundsOptions): Rectangle {
    let boxes = this._boxes
    let index = this._boxIndex
    // Hosts that don't send the boxes with the records give them when
    // asked, until they send the record again:
    if (boxes === undefined && this._key != null) {
      boxes = this._boxes = this._project._host.getBounds(this._key)
      index = this._boxIndex = 0
    }
    index += options.handle ? 8 : options.stroke ? 4 : 0
    return boxes
      ? new Rectangle(
          boxes[index], boxes[index + 1],
          boxes[index + 2], boxes[index + 3]
        )
      : new Rectangle()
  },

  _getHostBoundsCache(this: Item) {
    // The boxes are in the item's own coordinates, so they only match
    // the bounds in the parent's coordinates without a matrix:
    const bounds = {}
    const isIdentity = this._matrix.isIdentity()
    const nonscaling = !this._strokeScaling
    for (const [stroke, handle] of [
      [false, false],
      [true, false],
      [true, true]
    ]) {
      const options = { stroke, handle }
      const rect = this._getHostBounds(options)
      bounds[this._getBoundsCacheKey(options, true)] = {
        rect,
        nonscaling,
        internal: true
      }
      if (isIdentity) {
        bounds[this._getBoundsCacheKey(options, false)] = {
          rect: rect.clone(),
          nonscaling,
          internal: false
        }
      }
    }
    return bounds
  },

  _load(this: Item) {
    whileLoading(this._project, () => this._loadContent())
  },

  // Load the content in place, while loading. Also used for items that
  // a script created and keyed, which have no shell accessors:
  _loadContent(this: Item) {
    const project = this._project
    const value = project._host.getItem(this._key)
    const json = typeof value === 'string' ? JSON.parse(value) : value
    // Start shells from the class defaults, so loading doesn't recurse
    // when it reads fields that it hasn't filled in yet:
    if (this._contentFields) {
      const proto = this.constructor.prototype
      for (const name of this._contentFields) {
        defineValue(this, name, proto[name])
      }
    }
    // Initialize the content in place, which leaves the item's identity,
    // parent, matrix and children alone:
    this._initializeContent(project)
    // Linked text gives the keys of its story's text items, which
    // aren't a property of the item, see TextItem#_loadLinked():
    const { linked } = json[1]
    delete json[1].linked
    importHostJSON(project, json, this)
    this._shell = false
    if (linked) {
      ;(this as TextItem)._loadLinked(linked)
    }
  },

  _loadChildren(this: Item) {
    const project = this._project
    const columns = project._host.getChildren(this._key)
    whileLoading(project, () => setChildren(this, project, columns))
  },

  // Deleting the loaded fields uncovers the shell's accessors again.
  // Items that a script created and keyed have none, so they reload
  // right away. Only called by Project#invalidate(), while loading:
  _unload(this: Item) {
    this._edited = false
    if (!this._contentFields) {
      this._loadContent()
    } else if (!this._shell) {
      for (const name of this._contentFields) {
        delete this[name]
      }
      this._shell = true
    }
  },

  // Reload loaded children right away, so the ones that remain stay
  // inserted for the scripts that hold them. Only called by
  // Project#invalidate(), while loading:
  _reloadChildren(this: Item) {
    if (Object.hasOwn(this, '_children')) {
      const project = this._project
      for (const child of this._children) {
        child._parent = child._index = null
        project._updateSelection(child, true)
      }
      setChildren(this, project, project._host.getChildren(this._key))
    }
  }
})

const { set, _draw } = Raster.prototype

inject(Raster.prototype, {
  // Load the pixels after the content, which would reset them otherwise,
  // in the form of the host's canvas:
  _loadPixels(this: Raster) {
    if (this._shell) {
      this._load()
    }
    const project = this._project
    const canvas = project._host.getImage(this._key)
    whileLoading(project, () => {
      for (const name of pixelFields) {
        defineValue(this, name, null)
      }
      this._setImage(canvas)
    })
  },

  // Drop loaded pixels along with the content, to load them again:
  _unload(this: Raster) {
    Item.prototype._unload.call(this)
    if (this._contentFields) {
      for (const name of pixelFields) {
        delete this[name]
      }
    }
  },

  // The host's size holds the place of the pixels while loading, so
  // we don't create a canvas for it:
  set(this: Raster, props: any, exclude?: Record<string, boolean>) {
    if (isLoading && this._shell && props?.size) {
      this._size = Size.from(props.size)
      exclude = { size: true, ...exclude }
    }
    return set.call(this, props, exclude)
  },

  // Rasters that move to another host bring their pixels along:
  _setProject(this: Raster, project: Project, installEvents?: boolean) {
    const host = this._project?._host
    if (host && host !== project._host && this._key != null) {
      // Reading the element loads the pixels:
      this.element
    }
    Item.prototype._setProject.call(this, project, installEvents)
  },

  // Pixels that the host fails to give draw nothing. Scripts that ask
  // for them get the error:
  _draw(
    this: Raster,
    ctx: CanvasRenderingContext2D,
    param: any,
    viewMatrix: Matrix
  ) {
    try {
      this.element
    } catch {
      return
    }
    _draw.call(this, ctx, param, viewMatrix)
  }
})

inject(TextItem.prototype, {
  // New text takes the project's current text style, when the host set
  // one, see Project#currentTextStyle:
  _getCurrentStyle(this: TextItem, project: Project): Style {
    return (
      project._currentTextStyle ||
      Item.prototype._getCurrentStyle.call(this, project)
    )
  },

  // Text items that the host links share one story, in the order of the
  // keys: the first of them to load loads the story and the others,
  // which join it, as an item does that loads again after invalidate():
  _loadLinked(this: TextItem, keys: number[]) {
    const project = this._project
    const items = keys.map(key =>
      key === this._key ? this : project.getItemByKey(key)
    ) as TextItem[]
    const story = items.find(item => item !== this && !item._shell)?._story
    if (story) {
      this._story = story
    } else {
      // importJSON() parses and deserializes the story's JSON:
      this.set(importHostJSON(project, project._host.getStory(this._key)))
      for (const item of items) {
        if (item !== this) {
          item._loadContent()
        }
      }
      this._story._items = items
    }
  },

  // A loaded text's path loads again into the path it has, so the
  // scripts that hold it keep it, as children do, see
  // #_reloadChildren(). Project#invalidate() calls what this returns
  // once it has unloaded all items, so linked text loads its story
  // anew:
  _unload(this: TextItem) {
    const path = !this._shell && this.textPath
    Item.prototype._unload.call(this)
    return path
      ? () => {
          if (this._shell) {
            this._loadContent()
          }
          const loaded = this.textPath
          if (
            loaded &&
            loaded !== path &&
            loaded.constructor === path.constructor
          ) {
            path._parent = path._index = null
            path.removeChildren()
            path.copyContent(loaded)
            path.copyAttributes(loaded)
            this.textPath = path
          }
        }
      : null
  },

  // The host's layout of the text as the script holds it, also before
  // the host has its changes: the lines with their pieces, which take
  // what drawing needs from the styles of the story's runs, see
  // #_getPiece(), and their content from the story, see Project#host:
  _getHostLayout(this: TextItem, host: Host): TextLine[] {
    const story = this._story
    const content = story._content
    // Text the script didn't edit since it loaded is the host's
    // own, which it can lay out without the JSON:
    const json = this._key != null && !this._edited ? null : this.exportJSON()
    const layout = host.layOut(json, this._getStart(), this._key)
    this._visibleEnd = layout.end
    return layout.lines.map(line => {
      line.pieces = line.pieces.map(placed => {
        // The style of the run that the piece starts in, which any
        // character property finds:
        const [style] = story._getRangeStyles(
          'fontSize',
          placed.start,
          placed.end
        )
        const piece = Object.assign(this._getPiece(style), placed)
        if (piece.content == null) {
          piece.content = content.slice(piece.start, piece.end)
          if (piece.capitals) {
            piece.content = piece.content.toUpperCase()
          }
        }
        return piece
      })
      return line
    })
  }
})

// Hosted text is laid out by its host, as its document shows it, and by
// Paper.js where the host doesn't lay text out:
for (const ctor of [PointText, PathText, AreaText]) {
  const { _layOut } = ctor.prototype
  inject(ctor.prototype, {
    _layOut(this: TextItem): TextLine[] {
      const host = this._project._host
      return host?.layOut ? this._getHostLayout(host) : _layOut.call(this)
    }
  })
}

const { _changed, insertLayer, takeChanges, draw } = Project.prototype
const { get: getSymbolDefinitions } = Object.getOwnPropertyDescriptor(
  Project.prototype,
  'symbolDefinitions'
)
const { get: getPatternDefinitions } = Object.getOwnPropertyDescriptor(
  Project.prototype,
  'patternDefinitions'
)

inject(Project.prototype, {
  _currentTextStyle: null,

  get currentTextStyle(): Style {
    return this._currentTextStyle
  },

  set currentTextStyle(style: Style | object) {
    this._currentTextStyle ??= new Style(null, null, this)
    this._currentTextStyle.set(style)
  },

  // Items that the script changes are no longer as the host has them,
  // see TextItem#_getHostLayout(), until the host takes the changes:
  _changed(this: Project, flags: number, item?: Item) {
    _changed.call(this, flags, item)
    if (item && !isLoading) {
      item._edited = true
    }
  },

  insertLayer(this: Project, index: number, layer: Layer): Layer | null {
    return (
      layer instanceof Layer &&
      isFromOtherHost(layer, layer._project, this)
    )
      ? whileEntering(() => insertLayer.call(this, index, layer))
      : insertLayer.call(this, index, layer)
  },

  // The new definitions that the changed items use come first, nested
  // ones first, so the host can create them before the items that refer
  // to them. Other definitions without a key aren't the host's:
  takeChanges(this: Project) {
    const definitions = this._host && getNewDefinitions(this)
    const changes = takeChanges.call(this)
    for (const { item } of changes ?? []) {
      if (item) {
        item._edited = false
      }
    }
    return definitions && changes
      ? [
          ...definitions.map(definition => ({
            definition,
            flags: Change.INSERTION
          })),
          ...changes.filter(
            change => change.item || change.definition._key != null
          )
        ]
      : changes
  },

  get symbolDefinitions(): SymbolDefinition[] {
    return this._host
      ? getDefinitions(this, SymbolDefinition)
      : getSymbolDefinitions.call(this)
  },

  get patternDefinitions(): PatternDefinition[] {
    return this._host
      ? getDefinitions(this, PatternDefinition)
      : getPatternDefinitions.call(this)
  },

  get host(): Host {
    return this._host
  },

  set host(host: Host) {
    if (this._children.length) {
      throw new Error('Unable to set the host of a project with layers.')
    }
    this._host = host
    this._view.autoUpdate = false
    this._itemsByKey = {}
    this._definitionsByKey = {}
    whileLoading(this, () => {
      setChildren(this, this, host.getChildren(null))
      this._activeLayer = this._children[0] ?? null
    })
  },

  getItemByKey(this: Project, key: number): Item | null {
    const itemsByKey = this._itemsByKey
    let item = itemsByKey[key]
    if (!item || !item.isInserted()) {
      for (const ancestorKey of this._host.getAncestorKeys(key) ?? []) {
        const ancestor = itemsByKey[ancestorKey]
        if (ancestor) {
          // Reading the children loads them:
          ancestor.children
        }
      }
      item = itemsByKey[key]
    }
    return item?.isInserted() ? item : null
  },

  hasDrawHandlers(this: Project): boolean {
    return (
      this._drawCount > 0 ||
      Item._drawCount > 0 ||
      Object.values(this._selectionItems).some(item =>
        item.responds('drawselection')
      )
    )
  },

  // The host draws the items, so drawing only calls the draw handlers,
  // see #host. Without handlers of classes, only the items that are
  // loaded can have any, so we don't load the others:
  draw(
    this: Project,
    ctx: CanvasRenderingContext2D,
    matrix: Matrix,
    pixelRatio: number,
    _view?: any
  ) {
    if (!this._host) return draw.call(this, ctx, matrix, pixelRatio, _view)
    const updateVersion = ++this._updateVersion
    const view = this._view
    const loadAll = Item._drawCount > 0

    const drawItems = (items: Item[], parentMatrix: Matrix) => {
      for (const item of items) {
        if (item._visible) {
          // Mark the item as drawn, for its selection:
          item._updateVersion = updateVersion
          const globalMatrix = parentMatrix.appended(item._matrix)
          // Clip items only clip, see Item#draw():
          if (!item._clipMask && item.responds('draw')) {
            const viewMatrix = matrix.appended(globalMatrix)
            ctx.save()
            viewMatrix.applyToContext(ctx)
            item.emit(
              'draw',
              new DrawEvent({
                item,
                context: ctx,
                matrix: viewMatrix,
                pixelRatio,
                view
              })
            )
            ctx.restore()
          }
          if (
            (item instanceof Group || item._hasChildren) &&
            (loadAll || Object.hasOwn(item, '_children'))
          ) {
            drawItems(item._children, globalMatrix)
          }
        }
      }
    }

    drawItems(this._children, new Matrix())
    if (this._selectionCount > 0) {
      const items = this._selectionItems
      const size = this._scope.settings.handleSize
      ctx.save()
      ctx.lineWidth = 1
      for (const item of Object.values(items)) {
        // Others would load their content just to draw nothing:
        if (item.responds('drawselection')) {
          item._drawSelection(ctx, matrix, size, items, updateVersion, true)
        }
      }
      ctx.restore()
    }
  },

  invalidate(this: Project, columns: HostColumns) {
    const itemsByKey = this._itemsByKey
    const definitionsByKey = this._definitionsByKey
    const keys = columns.keys ?? []
    const definitionKeys = columns.definitions ?? []
    const names = columns.names || {}
    const reloads = []
    whileLoading(this, () => {
      for (const key of definitionKeys) {
        const definition = definitionsByKey[key]
        if (definition) {
          reloadDefinition(this, definition)
        }
      }
      for (let i = 0, l = keys.length; i < l; i++) {
        const item = itemsByKey[keys[i]]
        const flags = columns.flags[i]
        if (item) {
          const reload = flags & recordFlags.content && item._unload()
          if (reload) {
            reloads.push(reload)
          }
          if (flags & recordFlags.children) {
            item._reloadChildren()
          }
          if ((names[i] || undefined) !== item._name) {
            item.name = names[i] || null
          }
          if (item._parent) {
            Item._clearBoundsCache(item._parent)
          }
          Item._clearBoundsCache(item)
          setRecord(item, columns, i)
          item._globalMatrix = item._position = undefined
          this._updateSelection(item)
        }
      }
      // What loads again right away, see TextItem#_unload():
      for (const reload of reloads) {
        reload()
      }
    })
  }
})

// The members that Item, Project, the definitions and the other classes
// don't declare themselves:
declare module './Item.ts' {
  interface Item {
    _key: number
    /**
     * The key of the host's node that the item represents, in a project
     * backed by a host document, see {@link Project#host}. It can only be
     * set once, on an item created by a script, to register the key that
     * the host gave its new node.
     */
    get key(): number
    set key(key: number)
    // Set on HostItem kinds that contain other items, see HostItem:
    _hasChildren: boolean
    // The fields that the shell loads, see getShellPrototype():
    _contentFields: string[]
    // The fields of the host's record, see setRecord():
    _boxes: ArrayLike<number> | null
    _boxIndex: number
    _hostBounds: boolean
    _strokeScaling: boolean
    _empty: boolean
    // Whether the script changed the item since it loaded or the host took
    // its changes, see TextItem#_getHostLayout():
    _edited: boolean
    _getHostBounds(options: BoundsOptions): Rectangle
    _getHostBoundsCache(): Record<string, any>
    _load(): void
    _loadContent(): void
    _loadChildren(): void
    _unload(): (() => void) | null
    _reloadChildren(): void
  }
}

declare module './Project.ts' {
  interface Project {
    _host: Host
    _itemsByKey: Record<number, Item>
    _definitionsByKey: Record<string, Definition>
    _currentTextStyle: Style

    /**
     * The style new text items take in a hosted project, in place of
     * {@link #currentStyle}, when the host sets one: for hosts whose new
     * text has defaults of its own, such as a black fill without a stroke
     * whatever new paths take. Paths keep taking the current style.
     */
    get currentTextStyle(): Style
    set currentTextStyle(style: Style | object)

    /**
     * The host document that the project's items come from. Setting it
     * creates the project's layers from the host's records. All items
     * are created as shells that load their content and children from the
     * host on first access. The host draws its items, so setting it also
     * turns off {@link View#autoUpdate}, which would draw them all and
     * load them in full.
     *
     * The host provides:
     * - `getChildren(key)`, which returns the records of the children of
     *   the node with the given key, or of the top level for `null`, as
     *   columns: `keys`, `types` (indices into `typeNames`), `typeNames`,
     *   `flags` (selected: 1, visible: 2, locked: 4, strokeScaling: 8,
     *   clipMask: 64, guide: 128, empty: 256), optionally `boxes`
     *   (bounds, strokeBounds and roughBounds in the item's coordinates, 12
     *   numbers per item), and the sparse objects `names` and `matrices`.
     * - `getBounds(key)`, for hosts that don't send `boxes`, which returns
     *   the node's 12 numbers, or `null` for an empty node. Items ask for
     *   them when their bounds are needed, and again after the host sent
     *   their record again.
     * - `getItem(key)`, which returns the node's own content in the form
     *   of {@link Item#importJSON(json)}, without children. Linked text
     *   gives `linked`, the keys of its story's text items in order, and
     *   leaves out its story. Rasters give their `size` without a `source`
     *   and `crossOrigin`.
     * - `getImage(key)`, for rasters, which returns the node's pixels as a
     *   canvas with a 2D context, of the size that `getItem()` gives.
     *   Rasters load them on first access to their pixels, and Paper.js
     *   never loads them by itself, except to draw them. Rasters whose
     *   pixels the host fails to give draw nothing.
     * - `getStory(key)`, for linked text, which returns its story with the
     *   key of any of its text items: `content` or `runs`, `paragraphs`,
     *   and the character and paragraph styles, as
     *   {@link Item#exportJSON(options)} writes them in the JSON of a
     *   text item.
     * - `getAncestorKeys(key)`, which returns the keys from the top level
     *   down to the node's parent.
     * - Optionally `layOut(json, start, key)`, which lays out a text item
     *   from `start` in its story, given as the JSON string that
     *   {@link Item#exportJSON(options)} writes of it as the script holds
     *   it, or as `null` where the script didn't change it since it
     *   loaded or the host took its changes with
     *   {@link Project#takeChanges()}, for the host to lay out its own
     *   node, and returns
     *   `{ end, lines }`: where its visible text ends, and
     *   its lines, each `{ start, end, x, y, width, lineHeight, ascent,
     *   descent, pieces }`, with pieces `{ start, end, x, y, dx, width,
     *   rotation, size, ascent, descent, lineHeight }` and an optional
     *   `content`, as for a hyphen, all in the item's coordinates. `key`
     *   is null for text that the host doesn't know yet. Without it,
     *   Paper.js lays out text itself.
     * - `getDefinition(key)`, for the pattern and symbol definitions that
     *   the host shares between its items, which the JSON of its items
     *   refers to as `['@key']`, as in `fillColor: ['pattern',
     *   ['@pattern/Dots'], matrix]` or `definition: ['@symbol/Star']`.
     *   It returns the definition in the form of
     *   {@link Item#exportJSON(options)}, with its whole item:
     *   `['PatternDefinition', item, { tile, spacing }]` or
     *   `['SymbolDefinition', item]`, always: for a key that it has no
     *   definition of, an empty one of the type, as
     *   `['SymbolDefinition', ['Group', {}]]`. Each definition loads
     *   once, and the JSON of the items that use it, as
     *   {@link Item#exportJSON(options)} writes it, refers to it by its
     *   key again. Definitions that scripts create have no key, and are
     *   written out whole, until the host sets their `key`, which it can
     *   only set once. {@link Project#takeChanges()} lists those that the
     *   changed items use first, nested ones first, as
     *   `{ definition, flags }` with the `ChangeFlag.INSERTION` flag,
     *   followed by the changes of the host's definitions. Renaming those
     *   isn't supported.
     * - `getDefinitionKeys(type)`, which returns the keys of all the
     *   host's definitions of the type, `'SymbolDefinition'` or
     *   `'PatternDefinition'`, for {@link #symbolDefinitions} and
     *   {@link #patternDefinitions}.
     *
     * Items that move into a project with another host load in full from
     * their own host first, and drop their keys, so they are new items
     * there. They bring copies without keys of the symbol and pattern
     * definitions of their host along, shared by the items of one
     * insertion or copy, so the new host takes them as new ones too.
     * Linked text brings a copy of its story along, which flows on through
     * the items that stay. Host items can't enter the project of another
     * host.
     *
     * The host draws the items, and the selection. To show what scripts
     * draw in {@link Item#onDraw} and {@link Item#onDrawSelection}, it
     * calls `project.draw(ctx, matrix, pixelRatio)`, which in a hosted
     * project only calls these handlers, with the context, the view's
     * matrix and pixel ratio that the host gives, for the visible items
     * that have them, and for the selected ones. Handlers of classes,
     * such as `Path.onDraw`, load all items once. The host asks
     * {@link #hasDrawHandlers()} whether it needs to call it.
     *
     * {@link Project#takeChanges()} marks the changes of the items whose
     * children changed in order other than by new items inserted and
     * items removed, which the other changes don't tell, with
     * `reordered: true`: the host reads their children whole, and can
     * place the others' new items by their indices.
     */
    get host(): Host
    set host(host: Host)

    /**
     * Returns the item of the host's node with the given key, loading only
     * the children of its ancestors.
     *
     * @param key the key of the host's node
     * @return the item, or `null` if the host has no such node
     */
    getItemByKey(key: number): Item | null

    /**
     * Checks whether any item of the project or class has draw handlers,
     * {@link Item#onDraw} or, for the selected items,
     * {@link Item#onDrawSelection}, for hosts that draw the items
     * themselves, see {@link #host}.
     *
     * @return {@true if drawing the project calls any handlers}
     */
    hasDrawHandlers(): boolean

    /**
     * Updates the items of changed host nodes, given in the column format
     * of the host's `getChildren()`, with two more flags: 16 when the
     * node's own content changed, so the item loads it again on next
     * access, and 32 when its list of children changed, so it loads them
     * again right away if it had loaded them, keeping the items of nodes
     * that remain. Nodes without items are skipped. `definitions` lists
     * the keys of changed definitions of the host's `getDefinition()`,
     * which load again right away into the same objects, so the colors
     * and symbol items that use them change along. A definition that the
     * host no longer has, for which `getDefinition()` may return `null`
     * here, is emptied and draws nothing. The columns may hold only
     * definitions.
     *
     * @param columns the records of the changed nodes
     */
    invalidate(columns: HostColumns): void
  }
}

declare module './ItemDefinition.ts' {
  interface ItemDefinition {
    _key: string
    get key(): string
    set key(key: string)
  }
}

declare module './Raster.ts' {
  interface Raster {
    _loadPixels(): void
  }
}

declare module '../text/TextItem.ts' {
  interface TextItem {
    _loadLinked(keys: number[]): void
    _getHostLayout(host: Host): TextLine[]
  }
}

function defineValue(item: object, name: string, value: any) {
  Object.defineProperty(item, name, {
    value,
    writable: true,
    enumerable: true,
    configurable: true
  })
}

// Writes define the field on the item itself, where it hides the accessor.
// A script's writes load first, so loading doesn't replace what they
// write. Those of loading itself are what it loads:
function defineLoader(shell: Item, name: string, load: string) {
  Object.defineProperty(shell, name, {
    get() {
      this[load]()
      return this[name]
    },
    set(value) {
      if (!isLoading) {
        this[load]()
      }
      defineValue(this, name, value)
    },
    configurable: true
  })
}

function getShellPrototype(ctor: new (...args: any[]) => Item): Item {
  const proto = ctor?.prototype
  const name = proto?.className
  let shell = shellPrototypes[name]
  if (!shell) {
    if (!(proto instanceof Item)) {
      throw new Error(`Unknown item type: '${name}'.`)
    }
    shell = shellPrototypes[name] = Object.create(proto)
    const fields = (shell._contentFields = [])
    for (const [type, names] of contentFields) {
      if (shell instanceof type) {
        fields.push(...names)
      }
    }
    for (const field of fields) {
      defineLoader(shell, field, '_load')
    }
    if (shell instanceof Group || shell._hasChildren) {
      for (const field of childrenFields) {
        defineLoader(shell, field, '_loadChildren')
      }
    }
    if (shell instanceof Raster) {
      for (const field of pixelFields) {
        defineLoader(shell, field, '_loadPixels')
      }
      // Pixels that are still with the host export without a source:
      const serializeFields = { ...proto._serializeFields }
      delete serializeFields.crossOrigin
      delete serializeFields.source
      Object.defineProperty(shell, '_serializeFields', {
        get() {
          return Object.hasOwn(this, '_canvas')
            ? proto._serializeFields
            : serializeFields
        }
      })
    }
    inject(shell, {
      // Fill the bounds cache from the host boxes, until the item or
      // one of its descendants changes and Paper.js measures it itself:
      _getCachedBounds(
        this: Item,
        matrix: Matrix | null,
        options: BoundsOptions,
        noInternal?: boolean
      ) {
        if (this._hostBounds) {
          this._bounds = this._getHostBoundsCache()
          this._hostBounds = false
        }
        return proto._getCachedBounds.call(this, matrix, options, noInternal)
      },

      // Loading isn't a change, so it mustn't clear caches either:
      _changed(this: Item, flags: number) {
        if (!isLoading) {
          if (flags & boundsFlags) {
            for (let item = this; item; item = item._parent) {
              item._hostBounds = false
            }
          }
          proto._changed.call(this, flags)
        }
      },

      // Bounds unions skip empty items, so the record says whether the
      // item is empty, recursively for containers:
      isEmpty(this: Item, recursively?: boolean): boolean {
        return this._shell && !Object.hasOwn(this, '_children')
          ? this._empty
          : proto.isEmpty.call(this, recursively)
      },

      // The setter is kept, as an accessor with only a getter would hide it:
      get strokeScaling(): boolean {
        return this._shell
          ? this._strokeScaling
          : Reflect.get(proto, 'strokeScaling', this)
      },

      set strokeScaling(strokeScaling: boolean) {
        Reflect.set(proto, 'strokeScaling', strokeScaling, this)
      }
    })
  }
  return shell
}

// Sets the fields that the host's columns describe for the item at index.
function setRecord(item: Item, columns: HostColumns, index: number) {
  const flags = columns.flags[index]
  const [a, b, c, d, tx, ty] = columns.matrices?.[index] ?? [1, 0, 0, 1, 0, 0]
  item._visible = !!(flags & recordFlags.visible)
  item._locked = !!(flags & recordFlags.locked)
  item._strokeScaling = !!(flags & recordFlags.strokeScaling)
  item._clipMask = !!(flags & recordFlags.clipMask)
  item._guide = !!(flags & recordFlags.guide)
  item._empty = !!(flags & recordFlags.empty)
  item._selection = (
    (item._selection & ~ItemSelection.ITEM) |
    (flags & recordFlags.selected ? ItemSelection.ITEM : 0)
  )
  item._matrix._set(a, b, c, d, tx, ty, true)
  // Without boxes, the item asks for them, see #_getHostBounds():
  item._boxes = columns.boxes ?? undefined
  item._boxIndex = index * boxSize
  item._bounds = undefined
  item._hostBounds = true
}

// Creates or reuses the items that the host's columns describe, as the
// children of owner, an item or the project.
function setChildren(
  owner: Item | Project,
  project: Project,
  columns: HostColumns
) {
  const { keys, types, typeNames } = columns
  const names = columns.names || {}
  const itemsByKey = project._itemsByKey
  const parent = owner instanceof Item ? owner : null
  const children = []
  const namedChildren = {}
  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i]
    const ctor = getClass(typeNames[types[i]])
    const name = names[i]
    let item = itemsByKey[key]
    if (!item || item.constructor !== ctor) {
      item = itemsByKey[key] = Object.create(getShellPrototype(ctor))
      item._id = getUID()
      item._key = key
      item._project = project
      item._matrix = new Matrix()
      item._matrix._owner = item
      item._shell = true
    }
    setRecord(item, columns, i)
    item._name = name || undefined
    item._parent = parent
    item._index = i
    children.push(item)
    if (name) {
      addNamed(children, namedChildren, name, item)
    }
  }
  owner._children = children
  owner._namedChildren = namedChildren
  for (const child of children) {
    if (child._selection) {
      project._updateSelection(child)
    }
  }
}

// Loading and invalidating items isn't a change of the document, so we
// keep it out of the change log. Loading linked text loads the children
// of the containers of its other items while it loads. What it creates
// belongs to the project that it loads for, which we make the active one
// meanwhile, without activating it:
function whileLoading(project: Project, callback: () => void) {
  const changes = project._changes
  const loading = isLoading
  const active = paper.project
  project._changes = null
  isLoading = true
  paper.project = project
  try {
    callback()
  } finally {
    project._changes = changes
    isLoading = loading
    paper.project = active
  }
}

// Imports the host's JSON, resolving its references to the definitions
// that the host shares between items, see Project#host:
function importHostJSON(project: Project, json: any[] | string, target?: Item) {
  return importJSON(json, target, key => getDefinition(project, key))
}

// Each definition loads once, and keeps its key, which it exports as its
// reference:
function getDefinition(project: Project, key: string): Definition {
  const definitionsByKey = project._definitionsByKey
  let definition = definitionsByKey[key]
  if (!definition) {
    // Project#symbolDefinitions loads them outside of items, too:
    whileLoading(project, () => {
      definition = definitionsByKey[key] = importHostJSON(
        project,
        project._host.getDefinition(key)
      )
    })
    definition._key = key
  }
  return definition
}

// Marks the change of a container whose children changed in order other
// than by items inserted and removed, which the changes of their items
// don't tell the host, see Project#takeChanges(). The mark goes with the
// change, as containers outside the document aren't logged:
function setReordered(item: Item) {
  const project = item?._project
  const change = project?._changes && project._changesById[item._id]
  if (change) {
    change.reordered = true
  }
}

// Whether the item comes from a project with another host. Only their own
// host draws host items, so they can't enter the project of another one:
function isFromOtherHost(item: Item, from: Project, project: Project) {
  const host = from?._host
  const isOther = !!host && host !== project._host
  if (
    isOther &&
    (item instanceof HostItem || item.getItems({ class: HostItem }).length)
  ) {
    throw new Error('Unable to add host items to the project of another host.')
  }
  return isOther
}

// The items that one insertion or copy brings into a project with another
// host share the copies of their definitions:
function whileEntering<T>(callback: () => T): T {
  const copies = definitionCopies
  definitionCopies = copies ?? {}
  try {
    return callback()
  } finally {
    definitionCopies = copies
  }
}

// The pattern colors of an item, with those of the runs of its text.
// Linked text shares its runs with the other items of its story:
function getPatternColors(item: Item): Color[] {
  const styles = [item._style]
  const colors = []
  if (item instanceof TextItem && !item.isLinked()) {
    for (const run of item._story._runs) {
      styles.push(run.style)
    }
  }
  for (const style of styles) {
    for (const key of ['fillColor', 'strokeColor']) {
      const color = style._get(key, true)
      if (color?.type === 'pattern') {
        colors.push(color)
      }
    }
  }
  return colors
}

// Items that enter a project with another host bring copies of the
// definitions of their host along, which the new host takes as new ones.
// The items of one insertion or copy share them, see whileEntering():
function copyDefinitions(project: Project, item: Item) {
  const copies = definitionCopies ?? {}

  function getCopy<T extends Definition>(definition: T): T {
    let copy = copies[definition._id] as T
    if (!copy) {
      // Cloning creates the copy in the project, without logging
      // it, as the items that use it list it:
      whileLoading(project, () => {
        copy = copies[definition._id] = definition.clone() as T
      })
      // The items of the copy don't move, so we copy the
      // definitions that they use here:
      copyItem(copy._item)
      copy._item.getItems({}).forEach(copyItem)
    }
    return copy
  }

  function copyItem(item: Item) {
    if (item instanceof SymbolItem && item._definition._key != null) {
      item.definition = getCopy(item._definition)
    }
    for (const color of getPatternColors(item)) {
      const { pattern } = color
      if (pattern._key != null) {
        color.pattern = getCopy(pattern)
      }
    }
  }

  copyItem(item)
}

// Reloads a definition into the same object, so the colors and symbol
// items that use it change along with it. One that the host no longer
// has is emptied, and draws nothing:
function reloadDefinition(project: Project, definition: Definition) {
  const json = project._host.getDefinition(definition._key)
  const loaded = json
    ? importHostJSON(project, json)
    : new (definition.constructor as new (item: Item) => Definition)(
        new Group({ insert: false })
      )
  definition._setItem(loaded._item)
  definition._name = loaded._name
  if (definition instanceof PatternDefinition) {
    definition.tile = loaded._tile
    definition.spacing = loaded._spacing
  }
}

// The new definitions that the changed items use, which the host doesn't
// have yet: those without a key, nested ones first. Items that are still
// shells use only the host's:
function getNewDefinitions(project: Project): Definition[] {
  const changes = project._changes ?? []
  const definitions = []
  const ids = {}

  function addDefinition(definition: Definition) {
    if (definition && definition._key == null && !ids[definition._id]) {
      ids[definition._id] = true
      addDefinitions(definition._item)
      definitions.push(definition)
    }
  }

  function addDefinitions(item: Item) {
    if (!item._shell) {
      addDefinition(item._definition)
      for (const color of getPatternColors(item)) {
        addDefinition(color.pattern)
      }
      // The children of the host's items are logged themselves:
      if (item._key == null && item._children) {
        item._children.forEach(addDefinitions)
      }
    }
  }

  for (const { item, definition } of changes) {
    if (item ? item.isInserted() : definition._key != null) {
      addDefinitions(item || definition._item)
    }
  }
  return definitions
}

// The host's definitions of the given class, followed by the new ones:
function getDefinitions<T extends Definition>(
  project: Project,
  ctor: new (...args: any[]) => T
): T[] {
  const keys = project._host.getDefinitionKeys(ctor.prototype.className)
  return [
    ...keys.map(key => getDefinition(project, key) as T),
    ...getNewDefinitions(project).filter(
      (definition): definition is T => definition instanceof ctor
    )
  ]
}
