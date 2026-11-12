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

/**
 * The PaperScript functions, to compile, execute and load PaperScript code.
 *
 * @module PaperScript
 */
import * as acorn from 'acorn'
import {
  Color,
  PaperScope,
  Point,
  Size,
  Tool,
  getDocument,
  getWindow
} from '../internal.ts'

export interface CompileOptions {
  url?: string
  source?: string
  sourceMaps?: boolean | 'inline' | 'both'
  offset?: number
  paperFeatures?: { operatorOverloading?: boolean; moduleExports?: boolean }
}

export interface ExecuteOptions extends CompileOptions {
  handlers?: string[]
  evaluate?(source: string, url: string): (...args: any[]) => any
  load?(
    specifier: string,
    url: string,
    attributes?: Record<string, string>
  ): any
}

export interface Compiled {
  url: string
  source: string
  code: string
  map: Record<string, any>
  async: boolean
}

// The nodes of Acorn's AST, walked by their types:
type Node = any

// Operators to overload, with the methods of Point, Size and Color that
// implement them:

const binaryOperators = {
  '+': 'add',
  '-': 'subtract',
  '*': 'multiply',
  '/': 'divide',
  '%': 'modulo',
  '==': 'equals',
  '!=': 'equals'
}

const unaryOperators = {
  '-': 'negate',
  // `+value` returns the value itself:
  '+': null
}

// Use very short name for the binary operator (__$__) as well as the
// unary operator ($__), as operations will be replaced with then.
// The underscores stands for the values, and the $ for the operators.

// Binary Operator Handler
function __$__(left: any, operator: string, right: any): any {
  if (isOperand(left)) {
    const result = left[binaryOperators[operator]](right)
    return operator === '!=' ? !result : result
  }
  switch (operator) {
    case '+':
      return left + right
    case '-':
      return left - right
    case '*':
      return left * right
    case '/':
      return left / right
    case '%':
      return left % right
    case '==':
      return left == right
    case '!=':
      return left != right
  }
}

// Compound assignment of a property, which evaluates the object and the
// key only once, e.g. for `array[index()] += 1`. Postfix updates such as
// `array[index()]++` return the old value:
function __$assign__(
  object: any,
  key: PropertyKey,
  operator: string,
  value: any,
  postfix?: boolean
): any {
  const old = object[key]
  const result = (object[key] = __$__(old, operator, value))
  return postfix ? old : result
}

// Unary Operator Handler
function $__(operator: string, value: any): any {
  if (isOperand(value)) {
    const method = unaryOperators[operator]
    return method ? value[method]() : value
  }
  switch (operator) {
    case '+':
      return +value
    case '-':
      return -value
  }
}

/**
 * Parses the code with Acorn as an ES module of the latest syntax, and returns
 * its AST.
 *
 * @param code the code to parse
 * @param options the options for Acorn's `parse()`
 * @return the AST of the code
 */
export function parse(
  code: string,
  options?: Partial<acorn.Options>
): acorn.Program {
  return acorn.parse(code, { ecmaVersion: 'latest', ...options })
}

/**
 * Compiles PaperScript code into JavaScript code.
 *
 * @option options.url {String} the url of the source, for source-map
 *     generation
 * @option options.source {String} the source to be used for the source-
 *     mapping, in case the code that's passed in has already been mingled.
 *
 * @param code the PaperScript code
 * @param options the compilation options
 * @return an object holding the compiled PaperScript translated
 *     into JavaScript code along with source-maps and other information.
 */
export function compile(code: string, options?: CompileOptions): Compiled {
  options ||= {}
  // Use Acorn to translate the code into an AST structure which is then
  // walked and parsed for operators to overload. Instead of modifying the
  // AST and translating it back to code, we directly change the source code
  // based on the parser's range information, to preserve line-numbers in
  // syntax errors and remove the need for Escodegen.

  // Track code insertions so their differences can be added to the
  // original offsets.
  let insertions: [number, number, number][] = []

  // Converts an original offset to the one in the current state of the
  // modified code.
  function getOffset(offset: number): number {
    // Add the changes of all replacements that end before this
    // location in the original code, to get its current offset:
    let current = offset
    for (const insertion of insertions) {
      if (insertion[1] <= offset) {
        current += insertion[2]
      }
    }
    return current
  }

  // Returns the node's code as a string, taking insertions into account.
  function getCode(node: Node): string {
    return code.substring(getOffset(node.range[0]), getOffset(node.range[1]))
  }

  // Returns the code between two nodes, e.g. an operator and white-space.
  function getBetween(left: Node, right: Node): string {
    return code.substring(getOffset(left.range[1]), getOffset(right.range[0]))
  }

  // Replaces the node's code with a new version and keeps insertions
  // information up-to-date. Each insertion holds the original range of
  // the replaced code and the change in length, so the order of the
  // replacements doesn't matter. A replacement of code that contains
  // others takes their place:
  function replaceCode(node: Node, str: string) {
    const { range } = node
    const start = getOffset(range[0])
    const end = getOffset(range[1])
    insertions = insertions.filter(
      insertion => insertion[0] < range[0] || insertion[1] > range[1]
    )
    // Keep the replacement apart from the identifiers or keywords
    // that minified code may put right next to it, as in `return-1`:
    if (/[\w$]/.test(code.charAt(start - 1)) && /^[\w$]/.test(str)) {
      str = ' ' + str
    }
    if (/[\w$]/.test(code.charAt(end)) && /[\w$]$/.test(str)) {
      str += ' '
    }
    insertions.push([range[0], range[1], str.length - range[1] + range[0]])
    code = code.substring(0, start) + str + code.substring(end)
  }

  function handleOverloading(node: Node, parent: Node) {
    switch (node.type) {
      case 'UnaryExpression': // -a
        if (
          node.operator in unaryOperators &&
          node.argument.type !== 'Literal'
        ) {
          replaceCode(
            node,
            `$__("${node.operator}", ${getCode(node.argument)})`
          )
        }
        break
      case 'BinaryExpression': // a + b, a - b, a / b, a * b, a == b, ...
        if (
          node.operator in binaryOperators &&
          node.left.type !== 'Literal'
        ) {
          const { operator } = node
          // To preserve line-breaks, get the code in between
          // left & right, and replace the occurrence of the
          // operator with its string counterpart:
          const between = getBetween(node.left, node.right).replace(
            new RegExp('\\' + operator),
            `"${operator}"`
          )
          replaceCode(
            node,
            `__$__(${getCode(node.left)},${between}, ${getCode(node.right)})`
          )
        }
        break
      case 'UpdateExpression': // a++, a--, ++a, --a
      case 'AssignmentExpression': {
        // a += b, a -= b
        const parentType = parent?.type
        if (!(
          // Filter out for statements to allow loop increments
          // to perform well
          parentType === 'ForStatement' || (
            // We need to filter out parents that are comparison
            // operators, e.g. for situations like `if (++i < 1)`,
            // as we can't replace that with
            // `if (__$__(i, "+", 1) < 1)`
            // Match any operator beginning with =, !, < and >.
            parentType === 'BinaryExpression' &&
            /^[=!<>]/.test(parent.operator)
          ) ||
          // array[i++] is a MemberExpression with computed = true
          // We can't replace that with array[__$__(i, "+", 1)].
          parentType === 'MemberExpression' && parent.computed
        )) {
          const isUpdate = node.type === 'UpdateExpression'
          const target = isUpdate ? node.argument : node.left
          if (
            isUpdate || (
              /^.=$/.test(node.operator) &&
              target.type !== 'Literal'
            )
          ) {
            const left = getCode(target)
            const right = isUpdate ? '1' : getCode(node.right)
            const operator = node.operator[0]
            // The value of updates is used, except in
            // statements and before the end of sequences:
            const isUsed = (
              isUpdate &&
              !(
                parentType === 'ExpressionStatement' || (
                  parentType === 'SequenceExpression' &&
                  node !== parent.expressions[parent.expressions.length - 1]
                )
              )
            )
            // Postfix updates (a++, a--) result in the old
            // value, see #691, #1450:
            const isPostfix = isUsed && !node.prefix
            // Assign properties through __$assign__(),
            // which evaluates their object and key once,
            // except for private ones and those of super:
            const member = (
              target.type === 'MemberExpression' &&
              target.object.type !== 'Super' &&
              target.property.type !== 'PrivateIdentifier'
            )
            let exp = member
              ? `__$assign__(${getCode(target.object)}, ${
                  target.computed
                    ? getCode(target.property)
                    : JSON.stringify(target.property.name)
                }, "${operator}", ${right}${isPostfix ? ', true' : ''})`
              : `${left} = __$__(${left}, "${operator}", ${right})`
            if (isUsed && !member) {
              // Turn the assignment into an expression of the
              // new value, or of the old one before it, see
              // #1611:
              exp = isPostfix ? `[${left}, ${exp}][0]` : `(${exp})`
            }
            // If the original expression is wrapped in
            // parenthesis, do the same with the replacement:
            replaceCode(node, /^\(.*\)$/.test(getCode(node)) ? `(${exp})` : exp)
          }
        }
        break
      }
    }
  }

  // Collects the names that a declaration's identifier or destructuring
  // pattern declares:
  function collectNames(node: Node, names: string[]) {
    switch (node.type) {
      case 'Identifier':
        names.push(node.name)
        break
      case 'ObjectPattern':
        for (const property of node.properties) {
          collectNames(property.value || property.argument, names)
        }
        break
      case 'ArrayPattern':
        for (const element of node.elements) {
          if (element) {
            collectNames(element, names)
          }
        }
        break
      case 'AssignmentPattern':
        collectNames(node.left, names)
        break
      case 'RestElement':
        collectNames(node.argument, names)
        break
    }
  }

  // The number of modules imported with named specifiers, for the names
  // of the variables that hold them:
  let moduleCount = 0
  // Whether the code exports with ES module syntax, to mark it so:
  let isModule = false

  // Static imports are turned into calls of __$import__(), which
  // execute() binds to the loader in options.load. `as` asks for the
  // module's 'default' export or its 'namespace', see __$import__(), and
  // the import attributes are passed on as an object:
  function getImport(node: Node, as?: string): string {
    const attributes = node.attributes ?? []
    const args = [JSON.stringify(node.source.value)]
    if (as || attributes.length) {
      args.push(as ? `"${as}"` : 'undefined')
    }
    if (attributes.length) {
      const values = {}
      for (const { key, value } of attributes) {
        values[key.name || key.value] = value.value
      }
      args.push(JSON.stringify(values))
    }
    return `__$import__(${args.join(', ')})`
  }

  function handleModules(node: Node) {
    switch (node.type) {
      case 'ImportExpression':
        // `import(specifier)` resolves to the module's namespace, as a
        // Promise, so a failed load rejects instead of throwing, and
        // `import(specifier, options)` passes on `options.with`:
        replaceCode(
          node,
          'Promise.resolve().then(function() { ' +
          `return __$import__(${getCode(node.source)}, "dynamic"${
            node.options ? `, (${getCode(node.options)} || {}).with` : ''
          }); })`
        )
        break
      case 'ImportDeclaration': {
        // `import x from 'm'` assigns the module's default export,
        // `import * as x from 'm'` its namespace, and
        // `import { a, b as c } from 'm'` reads names from its exports:
        const module = getImport(node)
        const named = []
        const vars = node.specifiers
          .map(specifier => {
            const local = specifier.local.name
            if (specifier.type === 'ImportSpecifier') {
              named.push(
                `${local} = __$module${moduleCount}__.${
                  specifier.imported.name
                }`
              )
              return null
            }
            return `${local} = ${
              getImport(
                node,
                specifier.type === 'ImportDefaultSpecifier'
                  ? 'default'
                  : 'namespace'
              )
            }`
          })
          .filter(Boolean)
        if (named.length) {
          vars.push(`__$module${moduleCount}__ = ${module}`, ...named)
          moduleCount++
        }
        replaceCode(
          node,
          vars.length ? `var ${vars.join(', ')};` : `${module};`
        )
        break
      }
      case 'ExportAllDeclaration':
        // `export * as x from 'm'`, and `export * from 'm'`, which
        // leaves out the default export, as in ES modules:
        isModule = true
        replaceCode(
          node,
          node.exported
            ? `module.exports.${node.exported.name} = ${
                getImport(node, 'namespace')
              };`
            : '(function(m) { for (var k in m) if (k !== ' +
              `"default") module.exports[k] = m[k]; })(${getImport(node)});`
        )
        break
      case 'ExportDefaultDeclaration':
        // Convert `export default` to `module.exports.default = `,
        // next to the named exports:
        isModule = true
        replaceCode(
          { range: [node.start, node.declaration.start] },
          'module.exports.default = '
        )
        break
      case 'ExportNamedDeclaration': {
        isModule = true
        // Convert named exports to `module.exports.NAME = NAME;`
        // statements both for new declarations and existing specifiers:
        const { declaration, specifiers } = node
        if (declaration) {
          // Declare variables, functions and classes as they are,
          // and export the declared names after:
          const names = []
          if (declaration.declarations) {
            for (const { id } of declaration.declarations) {
              collectNames(id, names)
            }
          } else {
            names.push(declaration.id.name)
          }
          // Variable declarations may end without a semicolon,
          // which the exports added after them need:
          let code = getCode(declaration)
          if (declaration.declarations && !/;\s*$/.test(code)) {
            code += ';'
          }
          replaceCode(
            node,
            code +
            names.map(name => ` module.exports.${name} = ${name};`).join('')
          )
        } else if (specifiers) {
          // `export { a, b as c }` exports the local names under
          // the exported ones, and `export { a } from 'm'` those
          // of another module:
          const source = node.source ? getImport(node) + '.' : ''
          const exports = specifiers
            .map(
              ({ local, exported }) =>
                `module.exports.${exported.name} = ${source}${local.name}; `
            )
            .join('')
          if (exports) {
            replaceCode(node, exports)
          }
        }
        break
      }
    }
  }

  // The number of functions that walkAST() is inside of, to find
  // top-level `await`, which makes the whole script an async function:
  let functions = 0
  let isAsync = false

  // Recursively walks the AST and replaces the code of certain nodes
  function walkAST(
    node: Node,
    parent: Node,
    paperFeatures: CompileOptions['paperFeatures']
  ) {
    if (node) {
      const isFunction = /Function/.test(node.type)
      if (isFunction) {
        functions++
      }
      // The easiest way to walk through the whole AST is to simply
      // loop over each property of the node and filter out fields we
      // don't need to consider...
      for (const key in node) {
        if (key !== 'range' && key !== 'loc') {
          const value = node[key]
          if (Array.isArray(value)) {
            for (const child of value) {
              walkAST(child, node, paperFeatures)
            }
          } else if (value && typeof value === 'object') {
            // Don't use isPlainObject() for these since
            // Acorn.js uses its own internal prototypes now.
            walkAST(value, node, paperFeatures)
          }
        }
      }
      if (isFunction) {
        functions--
      }
      if (
        !functions && (
          node.type === 'AwaitExpression' ||
          node.type === 'ForOfStatement' && node.await
        )
      ) {
        isAsync = true
      }
      if (paperFeatures.operatorOverloading !== false) {
        handleOverloading(node, parent)
      }
      if (paperFeatures.moduleExports !== false) {
        handleModules(node)
      }
    }
  }

  // Source-map support:
  // Encodes a Variable Length Quantity as a Base64 string.
  // See: https://www.html5rocks.com/en/tutorials/developertools/sourcemaps/
  function encodeVLQ(value: number): string {
    let result = ''
    const base64 =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    value = (Math.abs(value) << 1) + (value < 0 ? 1 : 0)
    while (value || !result) {
      let next = value & (32 - 1)
      value >>= 5
      if (value) {
        next |= 32
      }
      result += base64[next]
    }
    return result
  }

  const url = options.url || ''
  const { sourceMaps } = options
  const paperFeatures = options.paperFeatures || {}
  // Include the original code in the sourceMap if there is no linked
  // source file so the debugger can still display it correctly.
  const source = options.source || code
  let offset = options.offset || 0
  const lineBreaks = /\r\n|\n|\r/gm
  let map: Record<string, any>
  if (sourceMaps) {
    const window = getWindow()
    if (window && url && !window.location.href.indexOf(url)) {
      // If the code stems from the actual html page, determine the
      // offset of inlined code.
      const html = getDocument().documentElement.innerHTML
      const index = html.indexOf(code)
      // Count the amount of line breaks in the html before this code
      // to determine the offset, unless the script isn't in the html.
      if (index >= 0) {
        offset = html.substring(0, index + 1).match(lineBreaks).length + 1
      }
    }
    const mappings = ['AA' + encodeVLQ(offset) + 'A']
    // Create empty entries by the amount of lines + 1, so join can be
    // used below to produce the actual instructions that many times.
    mappings.length = (code.match(lineBreaks) ?? []).length + 1
    map = {
      version: 3,
      file: url,
      names: [],
      // Since PaperScript doesn't actually change the offsets between
      // the lines of the original code, all that is required is a
      // mappings string that increments by one between each line.
      // AACA is the instruction to increment the line by one.
      // TODO: Add support for column offsets!
      mappings: mappings.join(';AACA'),
      sourceRoot: '',
      sources: [url],
      sourcesContent: [source]
    }
  }
  if (
    paperFeatures.operatorOverloading !== false ||
    paperFeatures.moduleExports !== false
  ) {
    // Now do the parsing magic
    let ast: acorn.Program
    try {
      ast = parse(code, {
        ranges: true,
        preserveParens: true,
        sourceType: 'module'
      })
    } catch (error) {
      // Name the code's file in the location of syntax errors, with
      // columns from 1, as browsers do:
      if (url && error.loc) {
        error.message = `${error.message.replace(/ \(\d+:\d+\)$/, '')} (at ${
          url
        }:${error.loc.line}:${error.loc.column + 1})`
      }
      throw error
    }
    walkAST(ast, null, paperFeatures)
    // Mark ES modules like Babel and TypeScript do, so importers can
    // tell their default export from CommonJS-style exports. Added on
    // a new line at the end, so the lines before keep their numbers:
    if (isModule) {
      code += (
        '\nObject.defineProperty(module.exports, ' +
        '"__esModule", { value: true });'
      )
    }
  }
  if (map && (sourceMaps === 'inline' || sourceMaps === 'both')) {
    // Split the string so tools don't take it for the source map
    // comment of this file:
    code += (
      '\n//# ' +
      'sourceMappingURL=data:application/json;base64,' +
      btoa(unescape(encodeURIComponent(JSON.stringify(map))))
    )
  }
  // Name the code in stack traces and devtools:
  if (map || url) {
    code += '\n//# sourceURL=' + (url || 'paperscript')
  }
  return { url, source, code, map, async: isAsync }
}

/**
 * Compiles the PaperScript code into a compiled function and executes it.
 * The compiled function receives all properties of the passed {@link
 * PaperScope} as arguments, to emulate a global scope with unaffected
 * performance. It also installs global view and tool handlers automatically
 * on the respective objects.
 *
 * Code with top-level `await` runs as an async function. `execute()` then
 * returns a Promise of the exports, and installs the global handlers once
 * it resolves.
 *
 * @option options.url {String} the url of the source, for source-map
 *     generation
 * @option options.source {String} the source to be used for the source-
 *     mapping, in case the code that's passed in has already been mingled.
 * @option options.handlers {String[]} the names of further global
 *     handlers to export next to `onFrame`, `onResize` and the tool's
 *     handlers, for hosts that call them themselves
 * @option options.evaluate {Function} the evaluator for hosts that
 *     evaluate code their own way: called with the source of a function
 *     expression and `options.url`, and returning the function, e.g. by
 *     evaluating the source as a script of that url
 * @option options.load {Function} the loader for static `import`
 *     statements, called with the specifier as written, the `options.url`
 *     of the importing script, and the import attributes as an object,
 *     e.g. `{ type: 'paperscript' }` for `import x from 'm' with { type:
 *     'paperscript' }`, or `undefined` without them, and returning the
 *     module's exports, e.g. the result of executing it. Modules with ES
 *     `export` statements have their default export as `default` and are
 *     marked with `__esModule`, so `import x` receives the default export,
 *     and for CommonJS-style exports the whole exports. `import * as x`
 *     receives all exports, and for CommonJS-style exports, these as
 *     `default` too. Dynamic `import(specifier)` resolves to that
 *     namespace as a Promise, and its loader may return a Promise as well.
 *     `import(specifier, options)` passes on `options.with` as the
 *     attributes. The loader runs each module once and handles cycles.
 *
 * @param code the PaperScript code
 * @param scope the scope for which the code is executed
 * @param options the compilation options
 * @return the exports defined in the executed code, or
 *     with top-level `await`, a Promise of them
 */
export function execute(
  code: string | Compiled,
  scope: PaperScope,
  options?: ExecuteOptions
): any {
  options ||= {}
  // Set currently active scope.
  scope.activate()
  const { view } = scope
  const compiled = typeof code === 'object' ? code : compile(code, options)
  let body = compiled.code
  // The tool's handlers are the accessors of its events:
  const toolNames = Object.getOwnPropertyNames(Tool.prototype).filter(
    name => /^on[A-Z]/.test(name) && name.slice(2).toLowerCase() in Tool.events
  )
  // Only create a tool if the tool object is accessed or something
  // resembling a global tool handler is contained in the code, but
  // no tool objects are actually created.
  const toolPattern = new RegExp(
    `\\btool\\.\\w+|\\s+(?:${toolNames.join('|')})\\b`
  )
  const tool =
    toolPattern.test(body) && !/\bnew\s+Tool\b/.test(body) ? new Tool() : null
  const toolHandlers = tool ? toolNames : []
  // Compile a list of all handlers that can be defined globally
  // inside the PaperScript. These are passed on to the function as
  // undefined arguments, so that their name exists, rather than
  // injecting a code line that defines them as variables. They are
  // exported again at the end of the function.
  const handlers = ['onFrame', 'onResize'].concat(
    toolHandlers,
    options.handlers || []
  )
  // compile a list of parameter names for all variables that need to
  // appear as globals inside the script. At the same time, also
  // collect their values, so we can pass them on as arguments in the
  // function call.
  const params: string[] = []
  const args: any[] = []
  function expose(scope: object, hidden?: boolean) {
    // Look through all enumerable properties on the scope and expose
    // these too as pseudo-globals, but only if they seem to be in use.
    // The inherited classes don't shadow existing globals, such as the
    // native Event, MouseEvent and Symbol, as PaperScope#install()
    // doesn't either, but fields set on the scope itself do, e.g. a
    // console that a host provides:
    for (const key in scope) {
      // Next to \b well also need to match \s and \W in the beginning
      // of $__, since $ is not part of \w. And that causes \b to not
      // match ^ longer, so include that specifically too.
      if (
        (
          hidden || (
            !/^_/.test(key) &&
            (!(key in globalThis) || Object.hasOwn(scope, key))
          )
        ) &&
        new RegExp(`([\\b\\s\\W]|^)${key.replace(/\$/g, '\\$')}\\b`).test(body)
      ) {
        params.push(key)
        args.push(scope[key])
      }
    }
  }
  // Static imports call the loader that the host passes, see
  // handleModules():
  const { load, url } = options
  function __$import__(
    specifier: string,
    as?: string,
    attributes?: Record<string, string>
  ) {
    if (!load) {
      throw new Error(
        `Unable to import '${specifier}': no ` +
        'loader was passed to PaperScript.execute().'
      )
    }
    const exports = load(specifier, url, attributes)
    // Dynamic imports may receive a Promise from the loader:
    return as === 'dynamic'
      ? Promise.resolve(exports).then(exports =>
          getImported(exports, 'namespace')
        )
      : getImported(exports, as)
  }

  // ES modules have their default export as `default`, and their exports
  // as their namespace. CommonJS-style exports are the default export,
  // and also appear in the namespace, as in Node:
  function getImported(exports: any, as: string): any {
    const isModule = exports?.__esModule
    return as === 'default'
      ? isModule
        ? exports.default
        : exports
      : as === 'namespace' && !isModule
        ? { default: exports, ...exports }
        : exports
  }
  expose({ __$__, $__, __$assign__, __$import__, paper: scope, tool }, true)
  expose(scope)
  // Add a fake `module.exports` object so PaperScripts can export things.
  body = 'var module = { exports: {} }; ' + body
  // Finally define the handler variable names as parameters and add the
  // setting of the exported handlers to the end of the code, so we can
  // retrieve their values from the function call.
  for (const key of handlers) {
    // Check for each handler explicitly and only export them if they
    // seem to exist.
    if (new RegExp(`\\s+${key}\\b`).test(body)) {
      params.push(key)
      body += `\nmodule.exports.${key} = ${key};`
    }
  }
  // End by returning `module.exports` at the end of the generated code:
  body += '\nreturn module.exports;'
  // Top-level `await` requires an async function. The code stays on the
  // line of the signature, so that its lines keep their numbers:
  const source = `(${compiled.async ? 'async ' : ''}function(${params}) {${
    body
  }\n})`
  // Evaluated globally as a script through an indirect eval, which, unlike
  // Function(), adds no header before the code, so that its lines keep their
  // numbers in every engine:
  const func = options.evaluate
    ? options.evaluate(source, compiled.url)
    : (0, eval)(source)

  // Install the 'global' tool and view handlers, and we're done!
  function install(exports: any) {
    const obj = exports ?? {}
    for (const key of toolHandlers) {
      const value = obj[key]
      if (value) {
        tool[key] = value
      }
    }
    if (view) {
      if (obj.onResize) {
        view.onResize = obj.onResize
      }
      // Emit resize event directly, so any user
      // defined resize handlers are called.
      view.emit('resize', {
        size: view.size,
        delta: new Point()
      })
      if (obj.onFrame) {
        view.onFrame = obj.onFrame
      }
      // Automatically request an update at the end. This is only
      // needed if the script does not actually produce anything yet,
      // and the used canvas contains previous content.
      view.requestUpdate()
    }
    return exports
  }

  const exports = func?.apply(scope, args)
  // Async functions return a Promise of the exports:
  return compiled.async ? exports.then(install) : install(exports)
}

/**
 * Loads, compiles and executes PaperScript code in the HTML document. Note
 * that this method is executed automatically for all scripts in the
 * document through a window load event. You can optionally call it earlier
 * (e.g. from a DOM ready event), or you can mark scripts to be ignored by
 * setting the attribute `ignore="true"` or `data-paper-ignore="true"`, and
 * call the `PaperScript.load(script)` method for each script separately
 * when needed.
 *
 * @param script the script to load. If none is
 *     provided, all scripts of the HTML document are iterated over and
 *     loaded
 * @return the scope produced for the passed `script`, or
 *     `undefined` if multiple scripts are loaded
 */
export function load(script?: HTMLScriptElement): PaperScope {
  return script ? loadScript(script) : loadAll()
}

function loadAll(): undefined {
  const scripts = getDocument()?.getElementsByTagName('script') ?? []
  for (const script of Array.from(scripts)) {
    loadScript(script)
  }
}

// The scripts that wait for the ones before them to load from their `src`,
// so they execute in the order of the script tags, see loadScript():
let queue: Promise<void> = null

function loadScript(script: HTMLScriptElement): PaperScope {
  // Only load this script if it not loaded already.
  // Support both text/paperscript and text/x-paperscript:
  if (
    /^text\/(?:x-|)paperscript$/.test(script.type) &&
    PaperScope.getAttribute(script, 'ignore') !== 'true'
  ) {
    // Produce a new PaperScope for this script now. Scopes are cheap so
    // let's not worry about the initial one that was already created.
    // Define an id for each PaperScript, so its scope can be retrieved
    // through PaperScope.get().
    // If a canvas id is provided, pass it on to the PaperScope so a
    // project is created for it now.
    const canvasId = PaperScope.getAttribute(script, 'canvas')
    const canvas = getDocument().getElementById(canvasId) as HTMLCanvasElement
    // To avoid possible duplicate browser requests for PaperScript
    // files, support the data-src attribute as well as src:
    // TODO: Consider switching from data-paper- to data- prefix
    // in PaperScope.getAttribute() and use it here too:
    const src = script.src || script.getAttribute('data-src')
    const scopeAttribute = 'data-paper-scope'
    if (!canvas) {
      throw new Error(`Unable to find canvas with id "${canvasId}"`)
    }
    // See if there already is a scope for this canvas and reuse it, to
    // support multiple scripts per canvas. Otherwise create a new one.
    const id = canvas.getAttribute(scopeAttribute)
    const scope = id && PaperScope.get(+id) || new PaperScope().setup(canvas)
    // Link the element to this scope, so we can reuse the scope when
    // compiling multiple scripts for the same element.
    canvas.setAttribute(scopeAttribute, `${scope._id}`)
    const options: ExecuteOptions = {
      url: src || script.baseURI,
      sourceMaps: 'inline'
    }
    if (src && PaperScope.hasAttribute(script, 'async')) {
      // If the async attribute is specified on the script element,
      // execute the code as soon as it is retrieved.
      fetchCode(src).then(code => execute(code, scope, options))
    } else if (src || queue) {
      // Request the code right away, but execute it after the scripts
      // before it, also when one of them fails and reports its error:
      const code = src ? fetchCode(src) : script.innerHTML
      const previous = queue
      const current = (queue = new Promise<void>(resolve => {
        Promise.all([code, previous])
          .then(([code]) => execute(code, scope, options))
          .finally(() => {
            if (queue === current) {
              queue = null
            }
            resolve()
          })
      }))
    } else {
      // We can simply get the code form the script tag.
      execute(script.innerHTML, scope, options)
    }
    // Mark script as loaded now.
    script.setAttribute('data-paper-ignore', 'true')
    return scope
  }
}

// Point, Size and Color objects support the operators through their math
// methods, which take numbers and arrays as well:
function isOperand(value: any): value is Point | Size | Color {
  return (
    value instanceof Point ||
    value instanceof Size ||
    value instanceof Color
  )
}

async function fetchCode(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Unable to load '${url}' (status ${response.status}).`)
  }
  return response.text()
}
