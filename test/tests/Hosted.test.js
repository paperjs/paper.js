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

import { describe } from 'vitest'
import paper, {
  AreaText,
  Base,
  ChangeFlag,
  Color,
  CompoundPath,
  Group,
  HostItem,
  Layer,
  Matrix,
  Path,
  PathText,
  PatternDefinition,
  Point,
  PointText,
  Project,
  Rectangle,
  Size,
  SymbolDefinition,
  SymbolItem,
  TextItem
} from 'paper'
import { equals, test, testFontFamily } from '../helpers.js'

describe.skipIf(!HostItem)('Hosted', () => {
  // The host document is played by another project, served through the host
  // interface by item id. The host logs its calls, so tests can check what
  // loading touched.
  function createHost(document) {
    const host = {
      document,
      calls: [],

      getNode(key) {
        return document.getItem({ id: key })
      },

      getColumns(items) {
        const typeNames = [],
          columns = {
            keys: new Float64Array(items.length),
            types: new Uint8Array(items.length),
            typeNames,
            flags: new Uint16Array(items.length),
            boxes: new Float64Array(items.length * 12),
            names: {},
            matrices: {}
          }
        items.forEach((item, i) => {
          const type = item.className
          let index = typeNames.indexOf(type)
          if (index === -1) index = typeNames.push(type) - 1
          columns.keys[i] = item.id
          columns.types[i] = index
          // A container's own selection, not its children's:
          const selected = item.selected && !(item instanceof Group)
          columns.flags[i] = (
            (selected ? 1 : 0) |
            (item.visible ? 2 : 0) |
            (item.locked ? 4 : 0) |
            (item.strokeScaling !== false ? 8 : 0) |
            (item.clipMask ? 64 : 0) |
            (item.guide ? 128 : 0) |
            (item.isEmpty(true) ? 256 : 0)
          )
          ;[
            {},
            { stroke: true },
            { stroke: true, handle: true }
          ].forEach((options, j) => {
            const rect = item.getBounds(
              Base.set({ internal: true }, options)
            )
            columns.boxes.set(
              [rect.x, rect.y, rect.width, rect.height],
              i * 12 + j * 4
            )
          })
          if (item.name) columns.names[i] = item.name
          if (!item.matrix.isIdentity())
            columns.matrices[i] = item.matrix.values
        })
        return columns
      },

      getChildren(key) {
        host.calls.push(['getChildren', key])
        return host.getColumns(
          key == null
            ? document.layers
            : host.getNode(key).children
        )
      },

      getItem(key) {
        host.calls.push(['getItem', key])
        const node = host.getNode(key)
        let json = node.exportJSON({ asString: false })
        // Items refer to the definitions that the host shares by key:
        if (json[0][0] === 'dictionary') {
          json = json[1]
          for (const name of ['fillColor', 'strokeColor']) {
            if (node[name]?.type === 'pattern') {
              json[1][name][1] = host.getReference(node[name].pattern)
            }
          }
          if (node instanceof SymbolItem) {
            json[1].definition = host.getReference(node.definition)
          }
        }
        // Selection comes through the flags, and the children of
        // containers through getChildren():
        delete json[1].selected
        if (json[0] !== 'CompoundPath') delete json[1].children
        // Linked text gives its story through getStory():
        if (node instanceof TextItem && node.isLinked()) {
          json[1].linked = node.story.textItems.map(item => item.id)
          for (const name in json[1]) {
            if (host.isStoryKey(node, name)) delete json[1][name]
          }
        }
        return json
      },

      getStory(key) {
        host.calls.push(['getStory', key])
        const node = host.getNode(key),
          props = node.exportJSON({ asString: false })[1],
          story = {}
        for (const name in props) {
          if (host.isStoryKey(node, name)) story[name] = props[name]
        }
        return JSON.stringify(story)
      },

      // The story of a text holds its content, runs, paragraphs, and all its
      // styles but those of the text item itself:
      isStoryKey(node, name) {
        return (
          /^(content|runs|paragraphs)$/.test(name) || (
            name in node.style._defaults &&
            !(name in node.story._itemKeys)
          )
        )
      },

      // The definitions that the host shares between its items, by key:
      definitions: new Map(),

      getDefinition(key) {
        host.calls.push(['getDefinition', key])
        const definition = host.definitions.get(key),
          name = definition.name || undefined
        return Base.serialize(
          definition instanceof PatternDefinition
            ? [
                'PatternDefinition',
                definition.item,
                { tile: definition.tile, spacing: definition.spacing, name }
              ]
            : ['SymbolDefinition', definition.item, { name }]
        )
      },

      getDefinitionKeys(type) {
        return [...host.definitions]
          .filter(([, definition]) => definition.className === type)
          .map(([key]) => key)
      },

      getReference(definition) {
        for (const [key, value] of host.definitions) {
          if (value === definition) return [`@${key}`]
        }
      },

      getAncestorKeys(key) {
        host.calls.push(['getAncestorKeys', key])
        const keys = []
        let node = host.getNode(key)
        while ((node = node.parent || null)) keys.unshift(node.id)
        return keys
      },

      // Returns the calls made since the last call, and clears the log.
      takeCalls() {
        const calls = host.calls
        host.calls = []
        return calls
      }
    }
    return host
  }

  function createDocument() {
    const document = new Project()
    const layer = new Layer({ name: 'art' })
    new Path.Circle({
      center: [50, 50],
      radius: 20,
      fillColor: 'red',
      name: 'circle'
    })
    const group = new Group({ name: 'group' })
    group.addChild(
      new Path.Rectangle({
        point: [200, 200],
        size: [40, 20],
        strokeColor: 'blue',
        strokeWidth: 4
      })
    )
    group.addChild(
      new CompoundPath({
        children: [
          new Path.Rectangle([300, 300], [50, 50]),
          new Path.Rectangle([310, 310], [30, 30])
        ],
        fillColor: 'green',
        selected: true
      })
    )
    new Layer({ name: 'empty' })
    layer.activate()
    return document
  }

  function createHostedProject() {
    const host = createHost(createDocument())
    const project = new Project()
    project.host = host
    return { project, host }
  }

  test('Setting the host loads only the layers', () => {
    const res = createHostedProject()
    equals(res.project.layers.length, 2)
    equals(res.project.layers[0].name, 'art')
    equals(res.project.activeLayer === res.project.layers[0], true)
    equals(res.project.layers[0].key, res.host.document.layers[0].id)
    equals(res.host.takeCalls(), [['getChildren', null]])
  })

  test('Containers load their children on first access', () => {
    const res = createHostedProject()
    res.host.takeCalls()
    const layer = res.project.layers[0]
    equals(layer.children.length, 2)
    equals(layer.children.circle.className, 'Path')
    equals(res.host.takeCalls(), [['getChildren', layer.key]])
    // A second access doesn't load them again:
    equals(layer.children.length, 2)
    equals(res.host.takeCalls(), [])
  })

  test('Items load their content on first access', () => {
    const res = createHostedProject()
    const original = res.host.document.getItem({ name: 'circle' })
    const circle = res.project.layers[0].children.circle
    res.host.takeCalls()
    equals(circle.segments.length, 4)
    equals(res.host.takeCalls(), [['getItem', circle.key]])
    equals(circle.fillColor, original.fillColor)
    equals(circle.segments, original.segments)
    equals(res.host.takeCalls(), [])
  })

  test('A loaded project matches the host document', () => {
    const res = createHostedProject()
    equals(res.project.exportJSON(), res.host.document.exportJSON())
  })

  test('Bounds come from the host without loading', () => {
    const res = createHostedProject()
    const document = res.host.document
    const layer = res.project.layers[0]
    const group = layer.children.group
    const path = group.children[0]
    res.host.takeCalls()
    equals(path.bounds, document.getItem({ id: path.key }).bounds)
    equals(
      path.strokeBounds,
      document.getItem({ id: path.key }).strokeBounds
    )
    equals(group.bounds, document.getItem({ name: 'group' }).bounds)
    equals(layer.bounds, document.layers[0].bounds)
    equals(res.host.takeCalls(), [])
  })

  test('Hit tests load only the items that are hit', () => {
    const res = createHostedProject()
    const layer = res.project.layers[0]
    const group = layer.children.group
    const circle = layer.children.circle
    res.host.takeCalls()
    const result = res.project.hitTest([50, 50])
    equals(result && result.item === circle, true)
    // The group is rejected by its bounds, without loading its children:
    equals(res.host.takeCalls(), [['getItem', circle.key]])
    equals(group.hasOwnProperty('_children'), false)
  })

  test(`getItemByKey() loads only the ancestors' children`, () => {
    const res = createHostedProject()
    const original = res.host.document.getItem({ class: CompoundPath })
    res.host.takeCalls()
    const item = res.project.getItemByKey(original.id)
    equals(item.className, 'CompoundPath')
    equals(item.parent.name, 'group')
    const layerKey = res.project.layers[0].key
    equals(res.host.takeCalls(), [
      ['getAncestorKeys', original.id],
      ['getChildren', layerKey],
      ['getChildren', item.parent.key]
    ])
  })

  test('Selected shells are registered in the selection', () => {
    const res = createHostedProject()
    const item = res.project.getItemByKey(
      res.host.document.getItem({ class: CompoundPath }).id
    )
    res.host.takeCalls()
    equals(res.project.selectedItems.length, 1)
    equals(res.project.selectedItems[0] === item, true)
    equals(res.host.takeCalls(), [])
  })

  test('Paths load their stroke profiles', () => {
    const res = createHostedProject()
    res.host.document.getItem({ name: 'circle' }).strokeProfile = [
      { offset: 0, width: 2 }
    ]
    const circle = res.project.layers[0].children.circle
    equals(circle.strokeProfile.length, 1)
    equals(circle.strokeProfile[0].width, 2)
  })

  test('Items load their effects', () => {
    const res = createHostedProject()
    res.host.document.getItem({ name: 'circle' }).effects = [
      { type: 'offset', parameters: { distance: 5 } },
      {
        type: 'pixelate.mezzotint',
        parameters: { type: 'fineDots', visible: 1 }
      }
    ]
    const circle = res.project.layers[0].children.circle
    equals(circle.effects.length, 2)
    equals(circle.effects[0].distance, 5)
    equals(circle.effects[1].parameters, { type: 'fineDots', visible: 1 })
    equals(
      circle.previewBounds,
      circle.strokeBounds.expand(10),
      'measured with them'
    )
  })

  test('Loading and invalidating are not logged as changes', () => {
    const res = createHostedProject()
    const project = res.project
    project.trackChanges = true
    const circle = project.layers[0].children.circle
    circle.segments
    res.host.document.getItem({ name: 'circle' }).position.x += 10
    project.invalidate(
      res.host.getColumns([
        res.host.document.getItem({ name: 'circle' })
      ])
    )
    equals(project.takeChanges().length, 0)
    circle.position.x += 10
    const changes = project.takeChanges()
    equals(changes.length, 1)
    equals(changes[0].item === circle, true)
  })

  test('invalidate() reloads changed content into the same item', () => {
    const res = createHostedProject()
    const original = res.host.document.getItem({ name: 'circle' })
    const circle = res.project.layers[0].children.circle
    equals(circle.position, new Point(50, 50))
    original.position = [100, 100]
    const columns = res.host.getColumns([original])
    columns.flags[0] |= 16
    res.project.invalidate(columns)
    equals(res.project.layers[0].children.circle === circle, true)
    equals(circle.bounds, original.bounds)
    equals(circle.segments, original.segments)
  })

  test('invalidate() reloads changed children, keeping their items', () => {
    const res = createHostedProject()
    const document = res.host.document
    const layer = res.project.layers[0]
    const circle = layer.children.circle
    document.layers[0].insertChild(
      0,
      new Path.Star({
        center: [150, 50],
        points: 5,
        radius1: 10,
        radius2: 20,
        name: 'star'
      })
    )
    const columns = res.host.getColumns([document.layers[0]])
    columns.flags[0] |= 32
    res.project.invalidate(columns)
    equals(layer.children.length, 3)
    equals(layer.children[0].name, 'star')
    equals(layer.children[1] === circle, true)
    equals(circle.index, 1)
    equals(layer.bounds, document.layers[0].bounds)
  })

  test('invalidate() keeps the remaining children inserted', () => {
    const res = createHostedProject()
    const project = res.project
    const document = res.host.document
    const layer = project.layers[0]
    const circle = layer.children.circle
    project.trackChanges = true
    document.getItem({ name: 'group' }).remove()
    const columns = res.host.getColumns([document.layers[0]])
    columns.flags[0] |= 32
    project.invalidate(columns)
    // A script that holds on to the circle changes it, without accessing the
    // layer's children first:
    circle.position.x += 10
    equals(circle.isInserted(), true)
    const changes = project.takeChanges()
    equals(changes.length, 1)
    equals(changes[0].item === circle, true)
    equals(layer.children.length, 1)
  })

  test('invalidate() reloads items that a script created and keyed', () => {
    const res = createHostedProject()
    const project = res.project
    const layer = project.layers[0]
    // A script creates a circle, which the host writes back and keys:
    const circle = new Path.Circle({
      center: [20, 20],
      radius: 5,
      fillColor: 'blue',
      parent: layer
    })
    const node = circle.clone({ insert: false })
    res.host.document.layers[0].addChild(node)
    circle.key = node.id
    // The user moves it in the host, which invalidates its content:
    node.position.x += 10
    project.trackChanges = true
    const columns = res.host.getColumns([node])
    columns.flags[0] |= 16
    project.invalidate(columns)
    equals(project.getItemByKey(node.id) === circle, true)
    equals(circle.position, node.position)
    equals(circle.segments, node.segments)
    equals(project.takeChanges().length, 0)
  })

  test('A failing host leaves the item a shell, to retry', () => {
    const res = createHostedProject()
    const circle = res.project.layers[0].children.circle
    const getItem = res.host.getItem
    res.host.getItem = () => {
      throw new Error('Unavailable')
    }
    let message
    try {
      circle.segments
    } catch (e) {
      message = e.message
    }
    equals(message, 'Unavailable')
    res.host.getItem = getItem
    equals(circle.segments.length, 4)
  })

  test('Item#key registers new items once', () => {
    const res = createHostedProject()
    const path = new Path.Line({
      from: [0, 0],
      to: [10, 10],
      parent: res.project.layers[0]
    })
    equals(path.key, null)
    path.key = 1000
    equals(res.project.getItemByKey(1000) === path, true)
    let message
    try {
      path.key = 1001
    } catch (e) {
      message = e.message
    }
    equals(message, 'Unable to change the key of an item.')
  })

  test('Items that move to another host load and drop their keys', () => {
    const from = createHostedProject()
    const to = createHostedProject()
    const original = from.host.document.getItem({ name: 'group' })
    const group = from.project.layers[0].children.group
    const key = group.key
    // Load the children that the group joins before taking the calls:
    const layer = to.project.layers[0]
    layer.children
    from.host.takeCalls()
    to.host.takeCalls()
    from.project.trackChanges = true
    to.project.trackChanges = true
    layer.addChild(group)
    // Everything loads from the host it came from, before the move:
    equals(from.host.takeCalls(), [
      ['getItem', key],
      ['getChildren', key],
      ['getItem', original.children[0].id],
      ['getItem', original.children[1].id]
    ])
    equals(to.host.takeCalls(), [])
    equals(
      [group, ...group.getItems({})].map(item => item.key),
      [null, null, null, null, null]
    )
    group.name = 'group'
    equals(group.exportJSON(), original.exportJSON())
    // The new project logs a new item, the old one no longer holds it:
    const changes = to.project.takeChanges()
    equals(
      () => changes.some(change => change.item === group),
      true
    )
    equals(() => from.project.getItemByKey(key) !== group, true)
    // The old project logs the parent that the group left:
    equals(
      from.project.takeChanges().map(change => change.item.key),
      [from.project.layers[0].key]
    )
  })

  test('Items that move within a host keep their keys', () => {
    const from = createHostedProject()
    const to = new Project()
    to.host = from.host
    const group = from.project.layers[0].children.group
    const key = group.key
    to.layers[0].addChild(group)
    equals(group.key, key)
  })

  test('HostItem', () => {
    const Blend = HostItem.extend({
      _class: 'TestBlend',
      _serializeFields: { steps: 0 },
      _hasChildren: true,

      initialize: function TestBlend() {
        HostItem.apply(this, arguments)
      },

      getSteps() {
        return this._values.steps || 0
      },

      setSteps(steps) {
        this._values.steps = steps
        this._changed(
          ChangeFlag.CONTENT |
          ChangeFlag.GEOMETRY |
          ChangeFlag.APPEARANCE
        )
      }
    })
    const blend = new Blend({ steps: 5, insert: false })
    equals(blend.steps, 5)
    equals(
      blend.exportJSON(),
      '["TestBlend",{"applyMatrix":false,"steps":5}]'
    )
    blend.addChild(new Path.Circle({ center: [0, 0], radius: 10 }))
    equals(blend.children.length, 1)
    // Without a host record, a HostItem has empty bounds, whatever its
    // children are:
    equals(blend.bounds, new Rectangle())
  })

  // A host document with text, whose host lays it out as Paper.js does in the
  // document itself, as plain lines and pieces:
  function createHostedText() {
    const document = new Project(),
      point = new PointText({
        point: [20, 40],
        content: 'Hello world',
        fontFamily: testFontFamily,
        name: 'point'
      })
    new PathText({
      textPath: new Path.Line([0, 100], [200, 100]),
      content: 'Along a path',
      fontFamily: testFontFamily,
      startOffset: 10,
      name: 'path'
    })
    new AreaText({
      textPath: new Path.Rectangle([0, 200], [100, 100]),
      content: 'Text in an area breaks into lines that fit it.',
      fontFamily: testFontFamily,
      columns: 2,
      gutter: 4,
      name: 'area'
    })
    point.range(6, 11).fontSize = 20
    const host = createHost(document)
    host.layOut = (json, start, key) => {
      host.calls.push([
        'layOut',
        key,
        json === null ? 'unchanged' : 'json'
      ])
      if (json !== null) {
        equals(typeof json, 'string', 'the text as a JSON string')
        json = JSON.parse(json)
      }
      // Text the script didn't change is the host's own, which it lays out
      // where it is, also in its story:
      const current = paper.project
      document.activate()
      const text =
          json === null
            ? host.getNode(key)
            : new Base.exports[json[0]]({
                insert: false
              }).importJSON(json),
        lines = text._layOut()
      current.activate()
      return {
        end: text._visibleEnd,
        lines: lines.map(line =>
          Base.set({}, line, {
            pieces: line.pieces.map(piece => {
              const plain = Base.set({}, piece)
              delete plain.style
              delete plain.font
              delete plain.scale
              delete plain.content
              return plain
            })
          })
        )
      }
    }
    const project = new Project()
    project.host = host
    return { project, host, document }
  }

  function getLines(text) {
    return text.lines.map(line => [
      line.content,
      line.baseline.point.y,
      line.bounds.left
    ])
  }

  test('Text loads its story, path and settings on first access', () => {
    const res = createHostedText(),
      children = res.project.layers[0].children,
      original = res.document.layers[0].children
    res.host.takeCalls()
    const point = children.point
    equals(point.hasOwnProperty('_story'), false, 'a shell')
    equals(point.content, 'Hello world', 'its content')
    equals(res.host.takeCalls(), [['getItem', point.key]], 'loaded once')
    equals(
      point.runs.map(run => run.fontSize),
      [12, 20],
      'its runs'
    )
    equals(
      children.path.textPath.segments,
      original.path.textPath.segments,
      `a path text's path`
    )
    equals(children.path.startOffset, 10, 'and its settings')
    equals(children.area.columns, 2, `an area text's settings`)
  })

  test('The host lays out hosted text', () => {
    const res = createHostedText(),
      children = res.project.layers[0].children,
      original = res.document.layers[0].children
    ;['point', 'path', 'area'].forEach(name => {
      const text = children[name]
      text.content
      res.host.takeCalls()
      equals(
        getLines(text),
        getLines(original[name]),
        name + ': its lines'
      )
      equals(
        res.host.takeCalls(),
        [['layOut', text.key, 'unchanged']],
        name + ': from the host, without its JSON, as it has it'
      )
      equals(
        text.visibleRange.end,
        original[name].visibleRange.end,
        name + ': its visible range'
      )
      equals(text.bounds, original[name].bounds, name + ': its bounds')
    })
    // Lines are in the text's coordinates, hit tests in the project's:
    const point = children.point,
      center = point.localToGlobal(point.lines[0].bounds.center),
      hit = point.hitTest(center, { fill: true })
    equals(hit && hit.item === point, true, 'hit on its letters')
    equals(point.exportSVG().textContent, 'Hello world', 'exported to SVG')
  })

  test('Hosted text is laid out as the script holds it', () => {
    const res = createHostedText(),
      area = res.project.layers[0].children.area,
      original = res.document.layers[0].children.area
    area.content = 'Changed by the script'
    equals(
      area.lines.map(line => line.content.trim()).join(' '),
      'Changed by the script',
      'before the host has it'
    )
    equals(
      original.content.indexOf('Changed'),
      -1,
      'the host document as it was'
    )
  })

  test('Without layOut(), Paper.js lays out hosted text', () => {
    const res = createHostedText(),
      area = res.project.layers[0].children.area,
      original = res.document.layers[0].children.area
    res.host.layOut = null
    equals(getLines(area), getLines(original))
  })

  test('invalidate() reloads the story of hosted text', () => {
    const res = createHostedText(),
      point = res.project.layers[0].children.point,
      original = res.document.layers[0].children.point
    equals(point.content, 'Hello world')
    original.content = 'Changed in the host'
    const columns = res.host.getColumns([original])
    columns.flags[0] |= 16
    res.project.invalidate(columns)
    equals(point.content, 'Changed in the host', 'its content')
    equals(getLines(point), getLines(original), 'its lines')
  })

  test(`invalidate() reloads a text's path into the path it has`, () => {
    const res = createHostedText(),
      children = res.project.layers[0].children,
      original = res.document.layers[0].children
    ;['path', 'area'].forEach(name => {
      const text = children[name],
        path = text.textPath
      original[name].textPath.translate(10, 20)
      original[name].fillColor = 'red'
      const columns = res.host.getColumns([original[name]])
      columns.flags[0] |= 16
      res.project.invalidate(columns)
      equals(
        text.textPath === path && path.parent === text,
        true,
        name + ': the same path, which a script may hold'
      )
      equals(
        path.segments,
        original[name].textPath.segments,
        name + `: with the host's geometry`
      )
      equals(
        text.fillColor,
        original[name].fillColor,
        name + `: and the host's content`
      )
      const left = text.bounds.left
      path.translate(5, 0)
      equals(
        text.bounds.left,
        left + 5,
        name + ': and the text moves with it'
      )
    })
  })

  test('New text takes the current text style, new paths the current style', () => {
    const project = createHostedText().project
    project.currentStyle = { fillColor: 'white', strokeColor: 'black' }
    const before = new PointText({ point: [10, 10], content: 'Before' })
    equals(
      before.strokeColor,
      new Color('black'),
      'without a text style, text takes the current style'
    )
    project.currentTextStyle = { fillColor: 'red', strokeColor: null }
    const text = new PointText({ point: [10, 10], content: 'Hello' }),
      stroked = new PointText({
        point: [10, 30],
        content: 'Hi',
        strokeColor: 'blue'
      }),
      path = new Path.Circle({ center: [50, 50], radius: 10 })
    equals(text.fillColor, new Color('red'), `text: the text style's fill`)
    equals(text.strokeColor, null, 'and no stroke')
    equals(stroked.strokeColor, new Color('blue'), 'unless it sets one')
    equals(path.strokeColor, new Color('black'), 'paths take the current style')
    equals(path.fillColor, new Color('white'))
  })

  test(`Hosted text draws its host's layout`, () => {
    const res = createHostedText(),
      point = res.project.layers[0].children.point,
      raster = point.rasterize({ insert: false })
    equals(raster.width > 0, true, 'without errors')
  })

  test('Writes before loading stay', () => {
    const res = createHostedProject(),
      circle = res.project.layers[0].children.circle
    circle.pivot = [0, 0]
    equals(circle.fillColor, new Color('red'), 'loaded')
    equals(circle.pivot, new Point(0, 0), 'with what was written')
    const res2 = createHostedText(),
      area = res2.project.layers[0].children.area
    area.columns = 3
    equals(area.content.length > 0, true, 'loaded')
    equals(area.columns, 3, `an area text's setting`)
  })

  test('Text that the script changed is laid out from its JSON', () => {
    const res = createHostedText(),
      area = res.project.layers[0].children.area,
      original = res.document.layers[0].children.area
    area.lines
    res.host.takeCalls()
    area.textPath.bounds.width = 60
    area.lines
    equals(
      res.host.takeCalls(),
      [['layOut', area.key, 'json']],
      'after a change of its path'
    )
    original.textPath.bounds.width = 60
    const columns = res.host.getColumns([original])
    columns.flags[0] |= 16
    res.project.invalidate(columns)
    area.lines
    equals(
      res.host.takeCalls().filter(call => call[0] === 'layOut'),
      [['layOut', area.key, 'unchanged']],
      'and without, once the host has it'
    )
    res.project.trackChanges = true
    area.textPath.bounds.width = 50
    res.project.takeChanges()
    area.lines
    equals(
      res.host.takeCalls().filter(call => call[0] === 'layOut'),
      [['layOut', area.key, 'unchanged']],
      'or once the host took them'
    )
    res.project.trackChanges = false
    const created = new PointText({
      content: 'New',
      fontFamily: testFontFamily
    })
    created.lines
    equals(
      res.host.takeCalls(),
      [['layOut', null, 'json']],
      `new text, which the host doesn't have`
    )
  })

  // Three area texts that the host links, the last one in a group:
  function createLinkedText() {
    const res = createHostedText(),
      layer = res.document.layers[0],
      current = paper.project
    res.document.activate()
    const frames = [0, 1, 2].map(
      i =>
        new AreaText({
          textPath: new Path.Rectangle([200 + i * 60, 0], [50, 40]),
          fontFamily: testFontFamily,
          parent: layer
        })
    )
    new Group({ children: [frames[2]], parent: layer })
    frames[0].content = (
      'A story that flows through three linked frames, ' +
      'each one starting where the one before it ends.'
    )
    frames[0].range(2, 7).fontSize = 16
    frames[0].link(frames[1])
    frames[1].link(frames[2])
    current.activate()
    res.frames = frames
    return res
  }

  test('Linked text loads into one story, from any of its items', () => {
    ;[0, 1, 2].forEach(index => {
      const res = createLinkedText(),
        project = res.project,
        items = res.frames.map(frame => project.getItemByKey(frame.id))
      items[index].content
      const story = items[index].story
      equals(
        story.textItems.length === 3 &&
        story.textItems.every(
          (item, i) => item === items[i] && item.story === story
        ),
        true,
        index + ': one story, with the items in order'
      )
      const calls = res.host.takeCalls()
      equals(
        calls.filter(call => call[0] === 'getItem').length,
        3,
        index + ': each loaded once'
      )
      equals(
        calls.filter(call => call[0] === 'getStory'),
        [['getStory', items[index].key]],
        index + ': the story once'
      )
      items.forEach((item, i) => {
        equals(
          item.exportJSON(),
          res.frames[i].exportJSON(),
          index + ': ' + i + ' as the host has it'
        )
        equals(
          item.linked,
          undefined,
          index + ': ' + i + ' without the keys'
        )
      })
    })
  })

  test('The host lays out linked text from where each item starts', () => {
    const res = createLinkedText(),
      project = res.project,
      layOut = res.host.layOut,
      starts = []
    res.host.layOut = function (json, start) {
      starts.push(start)
      return layOut.apply(this, arguments)
    }
    res.frames.forEach((frame, i) => {
      const item = project.getItemByKey(frame.id)
      res.host.takeCalls()
      equals(getLines(item), getLines(frame), i + ': its lines')
      equals(
        res.host.takeCalls().filter(call => call[0] === 'layOut'),
        [['layOut', frame.id, 'unchanged']],
        i + ': from the host'
      )
      equals(
        item.visibleRange.start,
        frame.visibleRange.start,
        i + ': its visible range'
      )
    })
    equals(
      starts,
      res.frames.map(frame => frame.visibleRange.start),
      'each from its start'
    )
    equals(
      starts[2] > starts[1] && starts[1] > 0,
      true,
      'which flows through the items'
    )
  })

  test('invalidate() reloads an item of linked text into its story', () => {
    const res = createLinkedText(),
      project = res.project,
      items = res.frames.map(frame => project.getItemByKey(frame.id)),
      story = items[0].story,
      original = res.frames[1]
    items[1].content
    original.textPath.bounds.width = 40
    const columns = res.host.getColumns([original])
    columns.flags[0] |= 16
    project.invalidate(columns)
    equals(
      items[1].textPath.segments,
      original.textPath.segments,
      'its own content'
    )
    equals(
      items[1].story === story &&
      story.textItems.length === 3 &&
      story.textItems[1] === items[1],
      true,
      'in its story'
    )
    equals(story.content, original.content, 'which it shows once')
    equals(getLines(items[1]), getLines(original), 'its lines')
  })

  test('invalidate() of all items of linked text reloads its story', () => {
    const res = createLinkedText(),
      project = res.project,
      items = res.frames.map(frame => project.getItemByKey(frame.id))
    items[0].content
    res.frames[0].content = 'A story that changed in the host.'
    const columns = res.host.getColumns(res.frames)
    for (let i = 0; i < 3; i++) columns.flags[i] |= 16
    res.host.takeCalls()
    project.invalidate(columns)
    const story = items[1].story
    equals(
      story.content,
      'A story that changed in the host.',
      'its content'
    )
    equals(
      res.host.takeCalls().filter(call => call[0] === 'getStory').length,
      1,
      'loaded once'
    )
    equals(
      story.textItems.length === 3 &&
      story.textItems.every(
        (item, i) => item === items[i] && item.story === story
      ),
      true,
      'into one story, with the items in order'
    )
  })

  // A document whose items share a pattern of red 5 × 5 squares in 10 × 10
  // tiles, and a symbol of a red 10 × 10 square:
  function createHostedDefinitions() {
    const document = new Project()
    new Layer({ name: 'art' })
    const pattern = new PatternDefinition(
      new Path.Rectangle({ point: [0, 0], size: [5, 5], fillColor: 'red' }),
      { tile: new Rectangle(0, 0, 10, 10) }
    )
    const symbol = new SymbolDefinition(
      new Path.Rectangle({ point: [0, 0], size: [10, 10], fillColor: 'red' })
    )
    symbol.name = 'Star'
    new Path.Rectangle({
      point: [0, 0],
      size: [40, 40],
      fillColor: { pattern },
      name: 'first'
    })
    new Path.Rectangle({
      point: [50, 0],
      size: [40, 40],
      fillColor: { pattern },
      name: 'second'
    })
    symbol.place([100, 100]).name = 'star'
    symbol.place([150, 100]).name = 'other'
    const host = createHost(document)
    host.definitions.set('pattern/Dots', pattern)
    host.definitions.set('symbol/Star', symbol)
    const project = new Project()
    project.host = host
    return { project, host, pattern, symbol }
  }

  function getPixel(item, x, y) {
    return item.rasterize({ resolution: 72, insert: false }).getPixel(x, y)
  }

  const red = new Color(1, 0, 0, 1),
    blue = new Color(0, 0, 1, 1)

  test('Items share the pattern definitions of the host', () => {
    const res = createHostedDefinitions(),
      { first, second } = res.project.layers[0].children
    res.host.takeCalls()
    const pattern = first.fillColor.pattern
    equals(pattern instanceof PatternDefinition, true)
    equals(second.fillColor.pattern === pattern, true, 'one definition')
    equals(pattern.tile, new Rectangle(0, 0, 10, 10))
    equals(
      res.host.takeCalls().filter(call => call[0] === 'getDefinition'),
      [['getDefinition', 'pattern/Dots']],
      'loaded once'
    )
    equals(getPixel(first, 2, 2), red, 'drawn')
    equals(getPixel(second, 7, 7).alpha, 0, 'with gaps')
  })

  test('Symbol items share the symbol definitions of the host', () => {
    const res = createHostedDefinitions(),
      { star, other } = res.project.layers[0].children
    equals(res.host.getItem(star.key), [
      'SymbolItem',
      {
        applyMatrix: false,
        matrix: [1, 0, 0, 1, 100, 100],
        name: 'star',
        definition: ['@symbol/Star']
      }
    ])
    const definition = star.definition
    equals(definition instanceof SymbolDefinition, true)
    equals(other.definition === definition, true, 'one definition')
    equals(star.matrix, res.host.getNode(star.key).matrix)
    equals(getPixel(star, 5, 5), red, 'drawn')
  })

  test('Shared definitions export as references to their keys', () => {
    const res = createHostedDefinitions(),
      { first, star } = res.project.layers[0].children
    equals(first.exportJSON({ asString: false })[1].fillColor, [
      'pattern',
      ['@pattern/Dots']
    ])
    equals(star.exportJSON({ asString: false }), [
      'SymbolItem',
      {
        applyMatrix: false,
        matrix: [1, 0, 0, 1, 100, 100],
        name: 'star',
        definition: ['@symbol/Star']
      }
    ])
    // The host stores the symbol item as exported, and gives it back:
    const definition = star.definition,
      json = star.exportJSON()
    res.host.getItem = () => json
    res.host.takeCalls()
    const columns = res.host.getColumns([res.host.getNode(star.key)])
    columns.flags[0] |= 16
    res.project.invalidate(columns)
    equals(star.definition === definition, true, 'the same symbol')
    equals(star.matrix, new Matrix(1, 0, 0, 1, 100, 100))
    equals(
      res.host.takeCalls().filter(call => call[0] === 'getDefinition'),
      [],
      'without loading it again'
    )
    // Definitions that scripts create are written out whole:
    first.fillColor.pattern = first.fillColor.pattern.clone()
    equals(first.exportJSON({ asString: false })[0][0], 'dictionary')
  })

  test('invalidate() reloads definitions into the same objects', () => {
    const res = createHostedDefinitions(),
      { first, star } = res.project.layers[0].children
    const pattern = first.fillColor.pattern,
      definition = star.definition
    equals(getPixel(first, 2, 2), red)
    equals(getPixel(star, 5, 5), red)
    res.pattern.item.fillColor = 'blue'
    res.pattern.spacing = 10
    res.symbol.item.fillColor = 'blue'
    res.host.takeCalls()
    res.project.invalidate({
      keys: [],
      flags: [],
      definitions: ['pattern/Dots', 'symbol/Star', 'symbol/Unused']
    })
    equals(res.host.takeCalls(), [
      ['getDefinition', 'pattern/Dots'],
      ['getDefinition', 'symbol/Star']
    ])
    equals(first.fillColor.pattern === pattern, true, 'the same pattern')
    equals(star.definition === definition, true, 'the same symbol')
    equals(pattern.spacing, new Size(10, 10))
    equals(getPixel(first, 2, 2), blue, 'drawn anew')
    equals(getPixel(first, 12, 2).alpha, 0, 'with the new spacing')
    equals(getPixel(star, 5, 5), blue, 'drawn anew')
  })

  test('Missing definitions come empty, and draw nothing', () => {
    const res = createHostedDefinitions(),
      { first, star } = res.project.layers[0].children
    // For keys that it has no definitions of, the host gives empty ones:
    res.host.getDefinition = key => [
      key.startsWith('pattern/') ? 'PatternDefinition' : 'SymbolDefinition',
      ['Group', {}]
    ]
    equals(first.fillColor.pattern.item.isEmpty(), true, 'an empty pattern')
    equals(getPixel(first, 2, 2).alpha, 0, 'drawing nothing')
    equals(star.definition.item.isEmpty(), true, 'an empty symbol')
    equals(first.exportJSON({ asString: false })[1].fillColor, [
      'pattern',
      ['@pattern/Dots']
    ])
    equals(star.exportJSON().includes('["@symbol/Star"]'), true)
  })

  test('invalidate() empties definitions that the host no longer has', () => {
    const res = createHostedDefinitions(),
      { first, star } = res.project.layers[0].children
    const pattern = first.fillColor.pattern
    equals(getPixel(star, 5, 5), red)
    res.host.definitions.clear()
    res.host.getDefinition = () => null
    res.project.invalidate({ definitions: ['pattern/Dots', 'symbol/Star'] })
    equals(first.fillColor.pattern === pattern, true, 'the same pattern')
    equals(pattern.item.isEmpty(), true, 'emptied')
    equals(star.definition.item.isEmpty(), true, 'emptied')
    equals(getPixel(first, 2, 2).alpha, 0, 'drawing nothing')
  })
  test('takeChanges() lists the new definitions that items use first', () => {
    const res = createHostedDefinitions(),
      project = res.project
    project.trackChanges = true
    const inner = new PatternDefinition(
      new Path.Rectangle({ point: [0, 0], size: [5, 5], fillColor: 'blue' })
    )
    const symbol = new SymbolDefinition(
      new Path.Rectangle({
        point: [0, 0],
        size: [10, 10],
        fillColor: { pattern: inner }
      })
    )
    // Definitions that no inserted item uses aren't the host's:
    new SymbolDefinition(new Path.Rectangle([0, 0], [10, 10]))
    const group = new Group({
      children: [symbol.place([0, 0])],
      parent: project.layers[0]
    })
    const changes = project.takeChanges()
    equals(changes[0].definition === inner, true, 'nested ones first')
    equals(changes[1].definition === symbol, true)
    equals(!!(changes[0].flags & ChangeFlag.INSERTION), true)
    equals(!!(changes[1].flags & ChangeFlag.INSERTION), true)
    equals(
      changes.slice(2).every(change => change.item),
      true,
      'followed by the items'
    )
    equals(
      changes.some(change => change.item === group),
      true
    )
  })

  test(`takeChanges() lists the changes of the host's definitions`, () => {
    const res = createHostedDefinitions(),
      project = res.project,
      { first, star } = project.layers[0].children
    const pattern = first.fillColor.pattern,
      symbol = star.definition
    project.trackChanges = true
    pattern.spacing = 10
    const inner = new PatternDefinition(
      new Path.Rectangle({
        point: [0, 0],
        size: [5, 5],
        fillColor: 'blue',
        insert: false
      })
    )
    symbol.item.fillColor = { pattern: inner }
    const changes = project.takeChanges()
    equals(changes.length, 3)
    equals(changes[0].definition === inner, true, 'the new one first')
    equals(changes[1].definition === pattern, true)
    equals(!!(changes[1].flags & ChangeFlag.STYLE), true)
    equals(changes[2].definition === symbol, true)
    equals(!!(changes[2].flags & ChangeFlag.STYLE), true)
    equals(project.takeChanges().length, 0)
  })

  test('Keys register new definitions, which export as references', () => {
    const res = createHostedDefinitions(),
      project = res.project
    const symbol = new SymbolDefinition(
      new Path.Rectangle({ point: [0, 0], size: [10, 10], fillColor: 'blue' })
    )
    const item = symbol.place([0, 0])
    project.layers[0].addChild(item)
    equals(item.exportJSON({ asString: false })[0][0], 'dictionary')
    symbol.key = 'symbol/New'
    equals(item.exportJSON({ asString: false })[1].definition, [
      '@symbol/New'
    ])
    // Items that the host gives with its key share it, without loading it:
    const { star } = project.layers[0].children
    res.host.getItem = () => ['SymbolItem', { definition: ['@symbol/New'] }]
    res.host.takeCalls()
    const columns = res.host.getColumns([res.host.getNode(star.key)])
    columns.flags[0] |= 16
    project.invalidate(columns)
    equals(star.definition === symbol, true)
    equals(
      res.host.takeCalls().filter(call => call[0] === 'getDefinition'),
      []
    )
    let message = null
    try {
      symbol.key = 'symbol/Other'
    } catch (err) {
      message = err.message
    }
    equals(message, 'Unable to change the key of a definition.')
    new Project()
    message = null
    try {
      new SymbolDefinition(new Path()).key = 'symbol/New'
    } catch (err) {
      message = err.message
    }
    equals(message, 'Unable to set a key in a project without a host.')
  })

  test('Definitions have the names of the host', () => {
    const res = createHostedDefinitions(),
      { star } = res.project.layers[0].children
    const definition = star.definition
    equals(definition.name, 'Star')
    let message = null
    try {
      definition.name = 'Other'
    } catch (err) {
      message = err.message
    }
    equals(message, 'Unable to rename a definition of the host.')
    res.symbol.name = 'Renamed'
    res.project.invalidate({ definitions: ['symbol/Star'] })
    equals(definition.name, 'Renamed')
  })

  test(`symbolDefinitions and patternDefinitions list the host's`, () => {
    const res = createHostedDefinitions(),
      project = res.project
    res.host.definitions.set(
      'symbol/Unused',
      new SymbolDefinition(new Path.Rectangle([0, 0], [10, 10]))
    )
    res.host.takeCalls()
    project.trackChanges = true
    const symbols = project.symbolDefinitions
    equals(symbols.length, 2)
    equals(
      symbols.map(definition => definition.key),
      [
        'symbol/Star',
        'symbol/Unused'
      ]
    )
    equals(project.patternDefinitions.length, 1)
    equals(project.patternDefinitions[0].key, 'pattern/Dots')
    // Without loading the items:
    equals(
      res.host.takeCalls().filter(call => call[0] !== 'getDefinition'),
      []
    )
    // New definitions follow, once items use them:
    const symbol = new SymbolDefinition(new Path.Rectangle([0, 0], [10, 10]))
    equals(project.symbolDefinitions.length, 2)
    project.layers[0].addChild(symbol.place([0, 0]))
    equals(project.symbolDefinitions.length, 3)
    equals(project.symbolDefinitions[2] === symbol, true)
  })

  test('Items that move to another host use copies of its definitions', () => {
    const from = createHostedDefinitions(),
      to = createHostedProject(),
      { first, second, star, other } = from.project.layers[0].children,
      pattern = first.fillColor.pattern,
      symbol = other.definition,
      layer = to.project.layers[0]
    from.project.trackChanges = true
    to.project.trackChanges = true
    layer.addChildren([first, star])
    layer.addChild(second)
    // The old project logs only the parent that the items left:
    equals(
      from.project.takeChanges().map(change => change.item.key),
      [from.project.layers[0].key]
    )
    const copy = first.fillColor.pattern
    equals(copy !== pattern && copy.key === null, true, 'a copy')
    equals(second.fillColor.pattern === copy, true, 'one copy')
    equals(
      star.definition !== symbol && star.definition.key === null,
      true,
      'a copy of the symbol'
    )
    equals(star.definition.name, 'Star', 'with its name')
    equals(getPixel(first, 2, 2), red, 'drawn')
    // The old project keeps its own:
    equals(pattern.key, 'pattern/Dots')
    equals(other.definition === symbol && symbol.key === 'symbol/Star', true)
    // The new project logs the copies as new definitions:
    const changes = to.project.takeChanges()
    equals(
      changes[0].definition === copy &&
      changes[1].definition === star.definition,
      true
    )
    equals(!!(changes[0].flags & ChangeFlag.INSERTION), true)
  })

  test('Copied definitions use copies of the definitions they use', () => {
    const from = createHostedDefinitions(),
      to = createHostedProject(),
      getDefinition = from.host.getDefinition
    // The host's symbol fills its square with the host's pattern, by key:
    const square = new Path.Rectangle({
      point: [0, 0],
      size: [10, 10],
      fillColor: { pattern: from.pattern },
      parent: from.host.document.layers[0]
    })
    const json = from.host.getItem(square.id)
    square.remove()
    from.host.getDefinition = key =>
      key === 'symbol/Star'
        ? ['SymbolDefinition', json, { name: 'Star' }]
        : getDefinition(key)
    const { first, star } = from.project.layers[0].children,
      pattern = first.fillColor.pattern
    equals(star.definition.item.fillColor.pattern === pattern, true)
    to.project.trackChanges = true
    to.project.layers[0].addChild(star)
    const copy = star.definition.item.fillColor.pattern
    equals(copy !== pattern && copy.key === null, true, 'a copy')
    equals(first.fillColor.pattern === pattern, true, 'the old one stays')
    const changes = to.project.takeChanges()
    equals(
      changes[0].definition === copy &&
      changes[1].definition === star.definition,
      true,
      'nested ones first'
    )
  })
})
