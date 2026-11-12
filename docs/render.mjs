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

// Render the reference from TypeDoc's JSON of the sources, in the markup of
// 0.17's JsDoc templates: the offline docs (`docs`), or the fragments that the
// website includes (`serverdocs`).
import MarkdownIt from 'markdown-it'

const markdown = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true
})

const sidebar = {
  '_global_': ['Global Scope:_global_'],
  'Basic Types': ['Point', 'Size', 'Rectangle', 'Matrix'],
  'Project & Items': [
    'Project',
    'Item',
    'Layer',
    'Group',
    'Shape',
    'Raster',
    'ruler',
    'HitResult'
  ],
  'Paths': [
    'PathItem',
    'Path',
    'CompoundPath',
    'Segment',
    'Curve',
    'ruler',
    'CurveLocation',
    'StrokeProfileStop'
  ],
  'Symbols': ['SymbolDefinition', 'SymbolItem'],
  'Styling': [
    'Style',
    'Color',
    'Gradient',
    'GradientStop',
    'PatternDefinition'
  ],
  'Effects': ['Effect', 'EffectInstance'],
  'Animation': ['Tween'],
  'Typography': [
    'TextItem',
    'PointText',
    'PathText',
    'AreaText',
    'TextStory',
    'TextRange'
  ],
  'User Interaction & Events': [
    'View',
    'Event',
    'MouseEvent',
    'Tool',
    'ToolEvent',
    'Key',
    'KeyEvent'
  ],
  'JavaScript': ['PaperScope', 'PaperScript']
}

const operatorSymbols = {
  add: '+',
  subtract: '-',
  multiply: '*',
  divide: '/',
  modulo: '%',
  equals: '=='
}

// The kinds of TypeDoc's reflections that the reference reads:
const kinds = {
  namespace: 4,
  variable: 32,
  function: 64,
  class: 128,
  constructor: 512,
  property: 1024,
  method: 2048,
  accessor: 262144,
  typeAlias: 2097152
}

const intrinsics = {
  number: 'Number',
  string: 'String',
  boolean: 'Boolean',
  object: 'Object',
  any: '*',
  unknown: '*',
  null: 'null',
  bigint: 'Number',
  symbol: 'Object'
}

const globalName = 'Global Scope'

export function renderDocs(project, { mode, version }) {
  return new Reference(project, mode, version).render()
}

class Reference {
  constructor(project, mode, version) {
    this.version = version
    this.isServer = mode === 'serverdocs'
    this.ext = this.isServer ? '' : '.html'
    this.base = this.isServer ? '/reference/' : '../classes/'
    this.byId = {}
    this.classes = {}
    collectIds(project, this.byId)
    for (const module of project.children) {
      if (module.name === globalName) {
        // The globals of PaperScript, declared in src/docs/global.ts:
        this.classes._global_ = {
          name: '_global_',
          kind: kinds.namespace,
          comment: module.comment,
          children: module.children
        }
      } else {
        for (const child of module.children ?? []) {
          // Objects that serve as namespaces, such as Key and ChangeFlag:
          const children =
            child.kind === kinds.variable
              ? child.type?.declaration?.children
              : null
          const symbol = children?.some(hasComment)
            ? { ...child, kind: kinds.namespace, children }
            : child
          if (
            (symbol.kind === kinds.class || symbol.kind === kinds.namespace) &&
            symbol.comment &&
            !isPrivate(symbol) &&
            !isHidden(symbol.comment) &&
            !this.classes[symbol.name]
          ) {
            this.classes[symbol.name] = symbol
          }
        }
      }
    }
    for (const symbol of Object.values(this.classes)) {
      symbol.members = this.getMembers(symbol)
    }
  }

  render() {
    const files = {}
    for (const symbol of Object.values(this.classes)) {
      this.current = symbol
      const content = this.renderClass(symbol)
      if (this.isServer) {
        const name = symbol.name === '_global_' ? 'global' : symbol.name
        files[`${name}/class.txt`] = content
      } else {
        files[`classes/${this.getFileName(symbol.name)}.html`] = renderHtml(
          getTitle(symbol.name),
          content
        )
      }
    }
    if (this.isServer) {
      files['classes.txt'] = this.renderAside()
    } else {
      files['classes/index.html'] = this.renderIndex()
      files['index.html'] = renderMain(this.version)
    }
    return files
  }

  getFileName(name) {
    const fileName = name === '_global_' ? 'global' : name
    return this.isServer ? fileName.toLowerCase() : fileName
  }

  // Sort the members of the class into the sections of its page. Members that
  // the class inherits, or overrides without documenting them again, go into
  // the sections of the class that documents them:
  getMembers(symbol) {
    const members = {
      constructors: [],
      properties: [],
      staticProperties: [],
      methods: [],
      staticMethods: [],
      operators: {},
      inherited: {}
    }
    // The members of namespaces are static, except for the globals:
    const isNamespace = (
      symbol.kind === kinds.namespace &&
      symbol.name !== '_global_'
    )
    // In the order of the sources, by their lines: TypeDoc's source order goes
    // by symbols, which places some members elsewhere:
    const children = [...(symbol.children ?? [])].sort(compareSources)
    for (const child of children) {
      if (isPrivate(child)) {
        continue
      }
      const origin = this.getOrigin(symbol, child)
      const inherited = origin
        ? (members.inherited[origin] ??= { properties: [], methods: [] })
        : null
      const isStatic = child.flags.isStatic || isNamespace
      if (child.kind === kinds.constructor) {
        for (const signature of child.signatures.filter(isDocumented)) {
          members.constructors.push(
            createMember(signature, symbol, { isConstructor: true })
          )
        }
      } else if (
        child.kind === kinds.property ||
        child.kind === kinds.accessor ||
        child.kind === kinds.variable
      ) {
        const comment = child.comment ?? child.getSignature?.comment
        // Leave out the classes and namespaces that scopes carry, such as
        // `paper.Point` or `paper.Key`, which have pages of their own:
        if (
          comment &&
          !isHidden(comment) &&
          child.type?.type !== 'query' &&
          !this.classes[child.name]
        ) {
          const member = createMember(child, symbol, {
            comment,
            type: child.type ?? child.getSignature?.type,
            isStatic,
            isReadOnly:
              child.kind === kinds.accessor
                ? !child.setSignature
                : child.flags.isReadonly || hasModifier(comment, '@readonly')
          })
          ;(
            inherited?.properties ??
            (isStatic ? members.staticProperties : members.properties)
          ).push(member)
        }
      } else if (child.kind === kinds.method || child.kind === kinds.function) {
        for (const signature of child.signatures.filter(isDocumented)) {
          const member = createMember(signature, symbol, { isStatic })
          if (inherited) {
            inherited.methods.push(member)
          } else if (hasModifier(signature.comment, '@operator')) {
            ;(members.operators[member.name] ??= []).push(member)
          } else {
            ;(isStatic ? members.staticMethods : members.methods).push(member)
          }
        }
      }
    }
    // Give constructors and static members that share their anchor with an
    // instance member an anchor of their own, `#new-layer`, `#static-ondraw`:
    const all = [
      members.constructors,
      members.properties,
      members.staticProperties,
      members.methods,
      members.staticMethods,
      ...Object.values(members.inherited).flatMap(list => [
        list.properties,
        list.methods
      ])
    ].flat()
    const isShared = member => member.isConstructor || member.isStatic
    const ids = new Set(
      all.filter(member => !isShared(member)).map(member => member.id)
    )
    for (const member of all.filter(isShared)) {
      if (ids.has(member.id)) {
        member.id = `${member.isConstructor ? 'new' : 'static'}-${member.id}`
      }
    }
    return members
  }

  // Return the name of the class that documents an inherited member, or one
  // that the member overrides without documenting it again, or null for the
  // class's own members:
  getOrigin(symbol, child) {
    let member = child
    let owner = symbol
    while (member.inheritedFrom || this.isUndocumentedOverride(member)) {
      const target =
        this.byId[(member.inheritedFrom ?? member.overwrites).target]
      const parent = target && this.byId[target.parentId]
      if (!parent) {
        break
      }
      member = target
      owner = parent
    }
    // Members of classes without a page, such as Base, belong to the class:
    return owner === symbol || !this.classes[owner.name] ? null : owner.name
  }

  isUndocumentedOverride(member) {
    const overwritten = member.overwrites && this.byId[member.overwrites.target]
    return (
      !!overwritten &&
      (!hasComment(member) || equalComments(member, overwritten))
    )
  }

  renderClass(symbol) {
    // Count the PaperScript examples per class, so that a change only changes
    // the ids in the files of that class:
    this.paperScriptId = 0
    const {
      constructors,
      properties,
      staticProperties,
      methods,
      staticMethods,
      operators,
      inherited
    } = symbol.members
    const comment = symbol.comment ?? {}
    // The closest classes first, the base class last:
    const ancestors = this.getAncestors(symbol).filter(name => inherited[name])
    const operatorLists = Object.values(operators)
    const showConstructors = (
      !/(Event|Style)/.test(symbol.name) &&
      symbol.kind !== kinds.namespace &&
      constructors.length > 0
    )
    return joinLines([
      '<div class="reference-class">',
      this.isServer ? '' : `<h1>${getTitle(symbol.name)}</h1>`,
      ancestors.length
        ? `<p> Extends ${
            ancestors
              .map(name => `<b>${this.link(name, true)}</b>`)
              .join(', ')
          }</p>`
        : '',
      this.renderText(comment.summary),
      this.renderExamples(getBlockTags(comment, '@classexample')),
      this.renderSeeAlso(comment),
      '</div>',
      showConstructors
        ? this.renderSection(
            'Constructors',
            constructors.map(member => this.renderMember(member))
          )
        : '',
      this.renderSection(
        'Operators',
        operatorLists.map(list => this.renderOperators(list))
      ),
      this.renderSection(
        'Properties',
        properties.map(member => this.renderProperty(member))
      ),
      this.renderSection(
        'Static Properties',
        staticProperties.map(member => this.renderProperty(member))
      ),
      methods.length
        ? this.renderSection('Methods', [
            ...methods.map(member => this.renderMember(member)),
            ...(
              operatorLists.length
                ? [
                    '<h3>Math Operator Functions</h3>',
                    ...operatorLists
                      .flat()
                      .map(member => this.renderMember(member))
                  ]
                : []
            )
          ])
        : '',
      this.renderSection(
        'Static Methods',
        staticMethods.map(member => this.renderMember(member))
      ),
      ...ancestors.flatMap(name => [
        this.renderSection(
          `Properties inherited from ${this.link(name, true)}`,
          inherited[name].properties.map(member => this.renderProperty(member))
        ),
        this.renderSection(
          `Methods inherited from ${this.link(name, true)}`,
          inherited[name].methods.map(member => this.renderMember(member))
        )
      ]),
      this.isServer ? '' : renderFooter(this.version)
    ])
  }

  getAncestors(symbol) {
    const ancestors = []
    let type = symbol.extendedTypes?.[0]
    let parent
    while ((parent = type && this.byId[type.target])) {
      ancestors.push(parent.name)
      type = parent.extendedTypes?.[0]
    }
    return ancestors
  }

  renderSection(title, entries) {
    return entries.length
      ? [
          '<div class="reference-members">',
          `<h2>${title}</h2>`,
          ...entries,
          '</div>'
        ].join('\n')
      : ''
  }

  renderMember(member) {
    const { comment } = member
    const name = member.isConstructor
      ? member.className
      : member.isStatic
        ? `${member.className}.${member.name}`
        : member.name
    return joinLines([
      this.renderGroupTitle(comment),
      `<div id="${member.id}" class="member">`,
      '<div class="member-link">',
      `<a name="${member.id}" href="#${member.id}"><tt><b>${name}</b>${
        getSignature(member.parameters)
      }</tt></a>`,
      '</div>',
      '<div class="member-description hidden">',
      '<div class="member-text">',
      this.renderText(comment.summary),
      this.renderOptions(comment, '@option', 'Options'),
      this.renderParameters(member.parameters),
      this.renderReturns(member),
      this.renderSeeAlso(comment),
      this.renderExamples(getBlockTags(comment, '@example')),
      '</div>',
      '</div>',
      '</div>'
    ])
  }

  renderProperty(member) {
    const { comment } = member
    const name = member.isStatic
      ? `${member.className}.${member.name}`
      : member.name
    const values = getBlockText(comment, '@values')
    const defaultValue = getBlockText(comment, '@default')
    return joinLines([
      this.renderGroupTitle(comment),
      `<div id="${member.id}" class="member">`,
      '<div class="member-link">',
      `<a name="${member.id}" href="#${member.id}"><tt><b>${name}</b></tt></a>`,
      '</div>',
      '<div class="member-description hidden">',
      '<div class="member-text">',
      this.renderText(comment.summary),
      member.isReadOnly ? '<p>Read only.</p>' : '',
      values ? renderList('Values', [`<li>${renderValues(values)}</li>`]) : '',
      defaultValue
        ? renderList('Default', [
            `<li><tt>${stripCode(defaultValue)}</tt></li>`
          ])
        : '',
      renderList('Type', [`<li>${this.renderType(member.type)}</li>`]),
      this.renderOptions(comment, '@option', 'Options'),
      this.renderSeeAlso(comment),
      this.renderExamples(getBlockTags(comment, '@example')),
      '</div>',
      '</div>',
      '</div>'
    ])
  }

  renderOperators(list) {
    const title = list
      .map(member => {
        const type = this.getTypeNames(member.parameters[0]?.type)[0] ?? ''
        return `<tt><b>${operatorSymbols[member.name]}</b>${
          type.charAt(0).toLowerCase() + type.slice(1)
        }</tt>`
      })
      .join(', ')
    const id = list[0].name.toLowerCase()
    return [
      `<div id="${id}" class="member">`,
      '<div class="member-link">',
      `<a name="${id}" href="#${id}"><tt>${title}</tt></a>`,
      '</div>',
      '<div class="member-description hidden">',
      ...list.map(member =>
        joinLines([
          '<div class="member-text">',
          this.renderText(member.comment.summary),
          this.renderParameters(member.parameters),
          this.renderReturns(member),
          this.renderSeeAlso(member.comment),
          this.renderExamples(getBlockTags(member.comment, '@example')),
          '</div>'
        ])
      ),
      '</div>',
      '</div>'
    ].join('\n')
  }

  renderGroupTitle(comment) {
    const part = comment.summary?.find(part => part.tag === '@grouptitle')
    return part ? `<h3>${part.text.trim()}</h3>` : ''
  }

  renderParameters(parameters) {
    return parameters.length
      ? renderList(
          'Parameters',
          parameters.map(param => {
            const description = this.renderText(param.comment?.summary, true)
            const { defaultValue } = param
            return joinLines([
              '<li>',
              `<tt>${param.name}:</tt>`,
              this.renderType(param.type),
              description ? `&mdash;&nbsp;${description}` : '',
              isOptionalParameter(param)
                ? `&mdash;&nbsp;optional${
                    defaultValue
                      ? `, default: <tt>${
                          this.processText(defaultValue, true)
                        }</tt>`
                      : ''
                  }`
                : '',
              '</li>'
            ])
          })
        )
      : ''
  }

  renderReturns(member) {
    const [tag] = getBlockTags(member.comment, '@returns')
    const type = member.isConstructor
      ? { type: 'reference', name: member.className }
      : member.type
    const typeLink =
      tag || type?.type !== 'intrinsic' || type.name !== 'this'
        ? this.renderType(type)
        : ''
    const description = tag ? this.renderText(tag.content, true) : ''
    return joinLines([
      typeLink || description
        ? renderList('Returns', [
            `<li>\n<tt>${typeLink}</tt>${
              typeLink && description ? '&nbsp;&mdash;&nbsp;' : ''
            }${description}\n</li>`
          ])
        : '',
      this.renderOptions(member.comment, '@result')
    ])
  }

  // Render @option and @result tags, written as `[name=default] {Type} text`,
  // `[name] {Type} text` or `name {Type} text`:
  renderOptions(comment, tag, title) {
    const tags = getBlockTags(comment, tag)
    return tags.length
      ? renderList(
          title,
          tags.map(({ content }) => {
            const source = toSource(content).trim()
            const match = source.match(
              /^(?:\[([^=\]]+)(?:=((?:[^\]{]|\{[^}]*\})+))?\]|([\w.]+))\s*(?:\{([^}]*)\})?\s*([\s\S]*)$/
            )
            if (!match) {
              return `<li>${this.processText(source, true)}</li>`
            }
            const [, optionalName, defaultValue, name, type, text] = match
            return `<li><tt>${optionalName ?? name}: ${
              type ? this.link(type, true) : ''
            }</tt>${
              text.trim()
                ? ` &mdash; ${this.processText(text.trim(), true)}`
                : ''
            }${
              defaultValue
                ? ` &mdash;&nbsp;default: <tt>${
                    this.processText(defaultValue, true)
                  }</tt>`
                : ''
            }</li>`
          })
        )
      : ''
  }

  renderSeeAlso(comment) {
    const tags = getBlockTags(comment, '@see')
    return tags.length
      ? renderList(
          'See also',
          // TypeDoc joins several @see tags into one list of `- target`:
          tags
            .flatMap(({ content }) => toSource(content).split(/^\s*-\s+/m))
            .map(target =>
              target
                .trim()
                .replace(/^\{@link\s+([^}]+)\}$/, '$1')
                .replace(/\s+/g, '')
            )
            .filter(Boolean)
            .map(target => `<li><tt>${this.link(target, true)}</tt></li>`)
        )
      : ''
  }

  renderExamples(tags) {
    return tags
      .map(({ content }) => {
        let paperScript = null
        const code = toSource(content)
          .trim()
          // TypeDoc fences examples as TypeScript:
          .replace(/^```\w*\n([\s\S]*?)\n?```$/, '$1')
          .replace(/\{@paperscript\s*([^}]*)\}/, (tag, settings) => {
            paperScript = {
              width: 520,
              height: 100,
              split: 'true',
              id: this.paperScriptId++
            }
            for (const pair of settings.match(/\S+=[^\s}]+/g) ?? []) {
              const [key, value] = pair.split('=')
              paperScript[key] = value
            }
            paperScript.mode =
              paperScript.split === 'true'
                ? 'split'
                : paperScript.source === 'true'
                  ? 'source'
                  : null
            return ''
          })
          .trim()
        const lines = code.split('\n')
        const description = []
        // The description is the first commented lines:
        while (/^\/\//.test(lines[0])) {
          description.push(lines.shift().replace(/^\/\/\s?/, ''))
        }
        return renderExample(
          description.join(' ').trim(),
          lines.join('\n').trim(),
          paperScript
        )
      })
      .join('\n')
  }

  renderText(parts, stripParagraphs) {
    return parts ? this.processText(toSource(parts), stripParagraphs) : ''
  }

  // Process Paper's inline tags, then the Markdown, as 0.17 did:
  processText(text, stripParagraphs) {
    const html = markdown
      .render(
        text
          .replace(/\{@grouptitle\s+[^}]*\}/g, '')
          .replace(/\{@link\s+([^}]+)\}/g, (match, target) =>
            this.link(target.replace(/\s+/g, ''), true)
          )
          .replace(/\{@code\s+([^}]+)\}/g, '<tt>$1</tt>')
          .replace(
            /\{@true\s+([^}]+)\}/g,
            '<tt>true</tt> $1, <tt>false</tt> otherwise'
          )
          .replace(/\{@values\s+([^}]+)\}/g, (match, values) =>
            renderValues(values)
          )
          .trim()
      )
      .trim()
      .replace(/\.\.\./g, '…')
    return stripParagraphs ? html.replace(/<\/?p>/g, '') : html
  }

  renderType(type) {
    return this.getTypeNames(type)
      .map(name => this.link(name, true))
      .join('⟋')
  }

  // Return the names of the types in the forms that link() reads: `Point`,
  // `Number`, `Point[]` or `*`.
  getTypeNames(type) {
    switch (type?.type) {
      case undefined:
        return []
      case 'intrinsic':
        return /^(undefined|void|never)$/.test(type.name)
          ? []
          : type.name === 'this'
            ? [this.current.name]
            : [intrinsics[type.name] ?? type.name]
      case 'literal':
        return [type.value === null ? 'null' : intrinsics[typeof type.value]]
      case 'union': {
        // `PointLike | number` and `SizeLike | number` are the two-number form,
        // which the pages of Point and Size explain:
        const isPair = type.types.some(type =>
          /^(Point|Size)Like$/.test(type.name)
        )
        const names = [
          ...new Set(type.types.flatMap(type => this.getTypeNames(type)))
        ].filter(name => !isPair || name !== 'Number')
        // Put null last, as 0.17's `Type|null`:
        return [
          ...names.filter(name => name !== 'null'),
          ...names.filter(name => name === 'null')
        ]
      }
      case 'array':
        return this.getTypeNames(type.elementType).map(name => `${name}[]`)
      case 'reference': {
        const name = type.name.replace(/Like$/, '')
        // Describe type aliases by what they stand for, but `PointLike` and
        // the like by their class:
        const alias = this.byId[type.target]
        if (alias?.kind === kinds.typeAlias && !this.classes[name]) {
          return this.getTypeNames(alias.type)
        }
        // The types that the sources don't export, such as `Handler` or
        // `BoundsOptions`, by what their names say:
        if (type.target?.packageName === 'paper' && !this.classes[name]) {
          return [/Handler$/.test(type.name) ? 'Function' : 'Object']
        }
        return [
          this.classes[name]
            ? name
            : type.name === 'Array'
              ? `${this.getTypeNames(type.typeArguments?.[0])[0] ?? '*'}[]`
              : /^(Record|Partial|Pick|Omit)$/.test(type.name)
                ? 'Object'
                : type.name
        ]
      }
      case 'reflection':
        return [type.declaration?.signatures ? 'Function' : 'Object']
      case 'tuple':
        return ['Array']
      case 'intersection':
        return this.getTypeNames(type.types[0])
      default:
        return ['Object']
    }
  }

  // Link to a class or a member as 0.17's Link#toSymbol() did: `Class`,
  // `Class#member(params)`, `#member`, `Class.staticMember`, and `Type[]` for
  // arrays of a type.
  link(alias, asCode) {
    let prefix = ''
    let suffix = ''
    let text = ''
    const isAny = /^\*/.test(alias)
    if (/\[\]$/.test(alias)) {
      alias = alias.replace(/\[\]$/, '')
      prefix = 'Array of '
      text = alias
      if (/^(Number|Boolean|String)$/.test(alias)) {
        text += 's'
      } else if (isAny) {
        text = 'any values'
      } else {
        suffix = ' objects'
      }
    } else if (isAny) {
      text = 'any value'
    }
    return alias.replace(
      /(^|[^a-z$0-9_#.:^-])([*|a-z$0-9_#.:^-]+)(\([^)]*\))*($|[^a-z$0-9_#.:^-])/i,
      (match, before, names, parameters, after) => {
        const links = names
          .split('|')
          .map(name => this.linkSymbol(name, parameters, text, asCode))
        return `${before}${prefix}${links.join(`${suffix}⟋${prefix}`)}${
          suffix
        }${after}`
      }
    )
  }

  linkSymbol(alias, parameters, text, asCode) {
    let linkText = (
      (text || getTitle(alias)) +
      (parameters ?? '').replace(/,(\w)/g, ', $1')
    )
    const path = this.getLinkPath(alias, parameters)
    if (!path) {
      return asCode ? `<tt>${linkText}</tt>` : linkText
    }
    linkText = linkText.replace(/^#/, '')
    // `Item#position` reads as `item.position`:
    if (/^[A-Z].+#/.test(linkText)) {
      linkText = linkText.charAt(0).toLowerCase() + linkText.slice(1)
      linkText = linkText.replace(/#/g, '.')
    }
    return `<a href="${path}">${asCode ? `<tt>${linkText}</tt>` : linkText}</a>`
  }

  getLinkPath(alias, parameters) {
    const [, className, separator, memberName] = (
      alias.match(/^([^#.]*)(?:([#.])(.+))?$/) ?? []
    )
    const symbol = className ? this.classes[className] : this.current
    const matches = memberName
      ? this.getMembersNamed(symbol, memberName, separator === '.')
      : []
    if (!symbol || (memberName ? !matches.length : !className)) {
      return null
    }
    const file = `${this.base}${this.getFileName(symbol.name)}${this.ext}`
    if (!memberName) {
      return file
    }
    // The anchor, as in createMember(), without the optional parameters, or
    // the first one of the member if its parameters changed:
    const required = (parameters ?? '')
      .replace(/\[[^\]]*\]/g, '')
      .replace(/[()\s]+/g, '')
      .split(',')
      .filter(Boolean)
    const id = [memberName.toLowerCase(), ...required].join('-')
    return `${file}#${
      matches.some(member => member.id === id) ? id : matches[0].id
    }`
  }

  getMembersNamed(symbol, name, isStatic) {
    const { members } = symbol ?? {}
    return members
      ? [
          members.properties,
          members.methods,
          members.staticProperties,
          members.staticMethods,
          ...Object.values(members.operators),
          ...Object.values(members.inherited).flatMap(list => [
            list.properties,
            list.methods
          ])
        ]
          .flat()
          .filter(
            member => member.name === name && (!isStatic || member.isStatic)
          )
      : []
  }

  renderClassList() {
    const renderItem = name => {
      if (name === 'ruler') {
        return '<li><hr /></li>'
      }
      const [title, target = title] = name.split(':')
      return `<li>${
        target === '_global_'
          ? this.linkSymbol(target, '', title)
          : this.link(target)
      }</li>`
    }
    return [
      '<ul class="reference-classes">',
      ...Object.entries(sidebar).map(([heading, names]) =>
        heading === '_global_'
          ? names.map(renderItem).join('\n')
          : [
              '<li>',
              `<h2>${heading}</h2>`,
              '<ul>',
              ...names.map(renderItem),
              '</ul>',
              '</li>'
            ].join('\n')
      ),
      '</ul>'
    ].join('\n')
  }

  renderAside() {
    return [
      `<h1>Index<span class="version text">${this.version}</span></h1>`,
      `<div class="reference">${this.renderClassList()}</div>`
    ].join('\n')
  }

  renderIndex() {
    return [
      '<!DOCTYPE html>',
      '<html>',
      '<head>',
      '<meta charset="UTF-8">',
      `<title>Paper.js v${this.version}</title>`,
      '<base target="class-frame">',
      '<link href="../assets/css/style.css" rel="stylesheet" type="text/css">',
      '<link href="../assets/css/offline.css" rel="stylesheet" type="text/css">',
      '</head>',
      '<body class="reference">',
      '<div class="reference-index">',
      `<h1>Paper.js<span class="version text">${this.version}</span></h1>`,
      this.renderClassList(),
      '</body>',
      '</html>'
    ].join('\n')
  }
}

function createMember(
  reflection,
  symbol,
  {
    comment = reflection.comment ?? {},
    type = reflection.type,
    isConstructor = false,
    isStatic = false,
    isReadOnly = false
  }
) {
  // The parameters with a @param tag, or all of them where none has one, as
  // in 0.17:
  const all = (reflection.parameters ?? []).filter(
    param => !param.name.startsWith('_')
  )
  const parameters = all.some(param => param.comment)
    ? all.filter(param => param.comment)
    : all
  const required = parameters
    .filter(param => !isOptionalParameter(param))
    .map(param => param.name)
  const name = isConstructor ? symbol.name : reflection.name
  return {
    name: reflection.name,
    className: symbol.name,
    // The anchor: the lowercased name and the required parameters, as in
    // `#hittest-point` or `#importsvg-svg-onLoad`:
    id: [name.toLowerCase(), ...required].join('-'),
    comment,
    type,
    parameters,
    isConstructor,
    isStatic,
    isReadOnly
  }
}

// Signatures count as documented as soon as one of their parameters is:
function isDocumented(signature) {
  return (
    !signature.flags.isPrivate && (
      signature.comment
        ? !isHidden(signature.comment)
        : !!signature.parameters?.some(param => param.comment)
    )
  )
}

function hasComment(reflection) {
  return !!(
    reflection.comment ??
    reflection.getSignature?.comment ??
    reflection.signatures?.some(signature => signature.comment)
  )
}

// Rest parameters count as required, as 0.17's `...Type` did:
// Compare by file and line, with the ones without a source, such as the
// implicit constructor, first:
function compareSources(reflection1, reflection2) {
  const [source1] = reflection1.sources ?? []
  const [source2] = reflection2.sources ?? []
  return !source1 || !source2
    ? !!source1 - !!source2
    : source1.fileName.localeCompare(source2.fileName) ||
      source1.line - source2.line
}

function isOptionalParameter(param) {
  return (
    !param.flags.isRest &&
    (!!param.flags.isOptional || param.defaultValue !== undefined)
  )
}

function isPrivate(child) {
  return (
    /^[_#]/.test(child.name) ||
    child.flags.isPrivate ||
    child.flags.isProtected ||
    !!child.getSignature?.flags.isPrivate
  )
}

function isHidden(comment) {
  return (
    hasModifier(comment, '@private') ||
    hasModifier(comment, '@internal') ||
    hasModifier(comment, '@ignore') ||
    getBlockTags(comment, '@deprecated').length > 0
  )
}

function hasModifier(comment, tag) {
  return !!comment?.modifierTags?.includes(tag)
}

function getBlockTags(comment, tag) {
  return comment?.blockTags?.filter(block => block.tag === tag) ?? []
}

function getBlockText(comment, tag) {
  const [block] = getBlockTags(comment, tag)
  return block ? toSource(block.content).trim() : null
}

// Turn TypeDoc's comment parts back into the comment's source text, so that
// Paper's inline tags are processed in one place, see processText():
function toSource(parts) {
  return parts
    .map(part =>
      part.kind === 'inline-tag' ? `{${part.tag} ${part.text}}` : part.text
    )
    .join('')
}

function equalComments(member1, member2) {
  const getComments = member =>
    JSON.stringify(
      member.signatures?.map(signature => signature.comment) ??
      member.comment ??
      member.getSignature?.comment
    )
  return getComments(member1) === getComments(member2)
}

function collectIds(reflection, byId, parent) {
  if (reflection.id !== undefined) {
    byId[reflection.id] = reflection
    if (parent) {
      reflection.parentId = parent.id
    }
  }
  for (const child of reflection.children ?? []) {
    collectIds(child, byId, reflection)
  }
}

// Build the signature of a function, as `(point[, options])`:
function getSignature(parameters) {
  let signature = ''
  let closing = ''
  parameters.forEach((param, index) => {
    if (isOptionalParameter(param)) {
      signature += '['
      closing += ']'
    }
    if (index > 0) {
      signature += ', '
    }
    signature += (param.flags.isRest ? '...' : '') + param.name
  })
  return `(${signature}${closing})`
}

// Join the lines of a template, leaving out the empty ones:
function joinLines(lines) {
  return lines.filter(Boolean).join('\n')
}

function getTitle(name) {
  return name === '_global_' ? globalName : name
}

function stripCode(text) {
  return text.replace(/^```\w*\n([\s\S]*?)\n?```$/, '$1').replace(/^`|`$/g, '')
}

function renderValues(text) {
  return text
    .split(',')
    .map(value => {
      value = value.trim()
      return value === '...' ? '&hellip;' : `<tt>${value}</tt>`
    })
    .join(', ')
}

function renderList(title, items) {
  return joinLines([
    '<ul class="member-list">',
    title ? `<h4>${title}:</h4>` : '',
    ...items,
    '</ul>'
  ])
}

function renderExample(description, code, paperScript) {
  const heading = `<h4>Example:${
    description ? `<span class="description">${description}</span>` : ''
  }</h4>`
  if (!paperScript) {
    return `${heading}\n<pre><code>${code}</code></pre>`
  }
  const { mode, source, width, height, id } = paperScript
  return joinLines([
    heading,
    `<div class="paperscript ${mode ?? ''}">`,
    source !== 'false'
      ? `<div class="buttons">\n<div class="button run">${
          mode === 'source' ? 'Source' : 'Run'
        }</div>\n</div>`
      : '',
    `<script type="text/paperscript" canvas="canvas-${id}">`,
    code,
    '</script>',
    `<div class="canvas"><canvas width="${Number(width) - 4}" height="${
      height
    }" id="canvas-${id}"></canvas></div>`,
    '</div>'
  ])
}

function renderHtml(title, content) {
  return [
    '<!DOCTYPE html>',
    '<html>',
    '<head>',
    '<meta charset="UTF-8">',
    `<title>${title}</title>`,
    '<base target="class-frame">',
    '<link href="../assets/css/style.css" rel="stylesheet" type="text/css">',
    '<link href="../assets/css/offline.css" rel="stylesheet" type="text/css">',
    '<script src="../assets/js/paper.js"></script>',
    '<script src="../assets/js/jquery.js"></script>',
    '<script src="../assets/js/codemirror.js"></script>',
    '<script src="../assets/js/docs.js"></script>',
    '</head>',
    '<body>',
    '<article class="reference">',
    content,
    '</article>',
    '</body>'
  ].join('\n')
}

function renderMain(version) {
  return [
    '<!DOCTYPE html>',
    '<html>',
    '<head>',
    '<meta charset="UTF-8">',
    `<title>Paper.js v${version}</title>`,
    '</head>',
    '<frameset cols="280,*" frameborder="0" border="0">',
    '<frame src="classes/index.html" name="packageListFrame" title="All Packages">',
    '<frame src="about:blank" name="class-frame" title="Class and interface descriptions">',
    '</frameset>',
    '</html>'
  ].join('\n')
}

function renderFooter(version) {
  return [
    '<p class="footer">',
    `Paper.js v${version}<br>`,
    `Copyright &#169; 2011—${
      new Date().getFullYear()
    } <a href="http://www.lehni.org" target="_blank">J&uuml;rg Lehni</a> &amp; <a href="http://www.jonathanpuckey.com" target="_blank">Jonathan Puckey</a>. All Rights Reserved.</p>`,
    '<div class="content-end"></div>'
  ].join('\n')
}
