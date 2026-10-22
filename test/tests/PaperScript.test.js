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
  Color,
  PaperScope,
  PaperScript,
  Path,
  Point,
  Size,
  document,
  window
} from 'paper'
import * as acornLatest from 'acorn-latest'
import { equals, isNodeContext, ok, test } from '../helpers.js'

describe('PaperScript', () => {
  function executeCode(code, expected) {
    try {
      equals(PaperScript.execute(code, paper), expected, code)
    } catch (err) {
      ok(false, err + '')
    }
  }

  test('PaperScript with prefix decrement operators', () => {
    executeCode(
      'var j = 0; for (var i = 10; i > 0; i--) { j++ }; module.exports = j',
      10
    )
    executeCode(
      'var x = 1; var y = 4 * --x; y; module.exports = x + " " + y',
      '0 0'
    )
  })

  test('PaperScript with suffix increment operators', () => {
    executeCode(
      'var j = 0; for (var i = 0; i < 10; ++i) { j++ }; module.exports = j',
      10
    )
    // #691
    executeCode(
      'var x = 1; x = x++; module.exports = x',
      1
    )
    executeCode(
      'var x = 1; var y = 4 * x++; y; module.exports = x + " " + y',
      '2 4'
    )
  })

  // Each case: code that exports its results, and the expected exports. The
  // compiled code has to parse, with both the bundled and a current Acorn:
  function executeUpdates(cases) {
    cases.forEach(([code, expected]) => {
      const compiled = PaperScript.compile(code)
      try {
        acornLatest.parse(compiled.code, { ecmaVersion: 'latest' })
      } catch (err) {
        ok(false, err + ': ' + compiled.code)
      }
      executeCode(code, expected)
    })
  }

  const updateCases = [
    // Statements and sequences:
    ['var x = 1; x++; ++x; x--, ++x; module.exports = x', 3],
    // Operands of logical, conditional and binary operators:
    ['var x = 1, y = true && x++; module.exports = [x, y]', [2, 1]],
    ['var x = 1, y = true && ++x; module.exports = [x, y]', [2, 2]],
    ['var x = 0, y = false || x--; module.exports = [x, y]', [-1, 0]],
    ['var x = 1, y = x ? x++ : 0; module.exports = [x, y]', [2, 1]],
    ['var x = 1, y = 10 * x++ + ++x; module.exports = [x, y]', [3, 13]],
    // Sequences, arguments and literals:
    ['var x = 1, y = (x++, x++); module.exports = [x, y]', [3, 2]],
    [
      'function f(a, b) { return [a, b]; }\n' +
      'var x = 1; module.exports = f(x++, ++x).concat(x)',
      [1, 3, 3]
    ],
    [
      'var x = 1, a = [x++, x], o = { v: x-- }; module.exports = [a, o.v, x]',
      [[1, 2], 2, 1]
    ],
    // Assignments of properties, returns and loops:
    [
      'var x = 1, o = {}; o.v = x++; o.w = --x; module.exports = [o.v, o.w, x]',
      [1, 1, 1]
    ],
    [
      'var x = 1; function f() { return x++; } module.exports = [f(), x]',
      [1, 2]
    ],
    [
      'for (var i = 0, j = 0; i < 3; i++, j++) {} module.exports = [i, j]',
      [3, 3]
    ],
    ['var i = 3, n = 0; while (i--) n++; module.exports = [i, n]', [-1, 3]],
    // Properties evaluate their object and key once:
    [
      'var calls = 0, o = { v: 1 }, a = [1];\n' +
      'function obj() { calls++; return o; }\n' +
        'function key() { calls++; return 0; }\n' +
        'var r = [obj().v++, ++obj().v, a[key()]++, ++a[key()],\n' +
        '  obj()["v"]--];\n' +
        'obj().v++;\n' +
        'module.exports = [r, o.v, a[0], calls]',
      [[1, 3, 1, 3, 3], 3, 3, 6]
    ],
    // Points are updated through operator overloading:
    [
      'var p = new Point(1, 2), q = p++, r = ++p; module.exports = [p, q, r]',
      [new Point(3, 4), new Point(1, 2), new Point(3, 4)]
    ],
    [
      'var o = { p: new Point(1, 2) }, q = o.p--; module.exports = [o.p, q]',
      [new Point(0, 1), new Point(1, 2)]
    ]
  ]

  test('PaperScript update expressions', () => {
    executeUpdates(updateCases)
    withAcornLatest(() => {
      executeUpdates(updateCases)
      executeUpdates([
        [
          'var x = 1, f = () => x++, g = () => ++x;\n' +
          'module.exports = [f(), g(), x]',
          [1, 3, 3]
        ]
      ])
    })
  })

  test('PaperScript update expressions in minified code', () => {
    // Minimized from socket.io's client:
    executeUpdates([
      [
        'var o = 2, t = "a=="; "=" === t[t.length - 2] && o--;\n' +
        'module.exports = o',
        1
      ],
      [
        'var S = { requestsCount: 0 };\n' +
        'function F() {\n' +
          '  "undefined" != typeof S &&\n' +
          '    (this.B = S.requestsCount++, this.C = 1)\n' +
          '}\n' +
          'var f = new F(); module.exports = [f.B, f.C, S.requestsCount]',
        [0, 1, 1]
      ]
    ])
  })

  test('PaperScript with inline source maps', () => {
    const source = 'var a = 1;\nvar b = 2;',
      code = PaperScript.compile(source, {
        url: 'test.js',
        sourceMaps: 'inline'
      }).code,
      match = code.match(
        /\n\/\/# sourceMappingURL=data:application\/json;base64,(\S+)\n/
      ),
      map = JSON.parse(window.atob(match[1]))
    equals(map.version, 3)
    equals(map.sources, ['test.js'])
    equals(map.sourcesContent, [source])
    // One group of mappings per line of generated code:
    equals(map.mappings.split(';').length, 2)
  })

  if (!isNodeContext) {
    test('PaperScript.load() with source urls (#1753)', () => {
      const current = paper,
        canvas = document.createElement('canvas')
      canvas.id = 'paperscript-canvas'
      document.body.appendChild(canvas)

      function load(code, src, detached) {
        const script = document.createElement('script')
        script.type = 'text/paperscript'
        script.setAttribute('canvas', canvas.id)
        if (src) {
          script.setAttribute('data-src', src)
        } else {
          script.text = code
        }
        if (detached) {
          PaperScript.load(script)
        } else {
          document.body.appendChild(script)
          PaperScript.load(script)
          document.body.removeChild(script)
        }
        return getScope().stack
      }

      // With the built library, PaperScript doesn't set the global `paper`,
      // so get the canvas' scope:
      function getScope() {
        return PaperScope.get(canvas.getAttribute('data-paper-scope'))
      }

      // Stack traces name the sourceURL that devtools list the code under:
      const src = 'data:text/plain,paper.stack=new%20Error().stack;'

      let stack = load(null, src)
      ok(stack.indexOf(src) !== -1, stack)
      stack = load('paper.stack = new Error("inline").stack;')
      ok(stack.indexOf(document.baseURI) !== -1, stack)
      // Inline code that isn't part of the html:
      stack = load(
        'paper.stack = new Error("detached").stack;',
        null,
        true
      )
      ok(stack.indexOf(document.baseURI) !== -1, stack)
      getScope().remove()
      document.body.removeChild(canvas)
      current.activate()
    })
  }

  test('PaperScript keeps the native globals (#1832)', () => {
    const exports = PaperScript.execute(
      'module.exports.symbol = Symbol;\n' +
      'module.exports.event = Event;\n' +
      'module.exports.path = Path;',
      paper
    )
    // Paper.js's classes of the same names don't shadow the native ones:
    equals(
      () => exports.symbol === Symbol && exports.symbol !== paper.Symbol,
      true,
      'Symbol'
    )
    // In the browser, the tests load the sources directly, which declares
    // Paper.js's classes as globals, so only Node.js has the native Event:
    if (isNodeContext) {
      equals(() => exports.event !== paper.Event, true, 'Event')
    }
    equals(() => exports.path === Path, true, 'Path')
  })

  test('PaperScript passes fields set on the scope over globals', () => {
    // Hosts such as sketch.paperjs.org provide their own console this way:
    const logged = []
    paper.console = {
      log(value) {
        logged.push(value)
      }
    }
    try {
      PaperScript.execute('console.log("logged");', paper)
    } finally {
      delete paper.console
    }
    equals(logged, ['logged'])
  })

  test('PaperScript.execute(code, scope, { handlers })', () => {
    const exports = PaperScript.execute(
      `function onStop() { return 'stopped'; }\n` +
      'function onStart() {}',
      paper,
      { handlers: ['onStop'] }
    )
    equals(() => exports.onStop(), 'stopped')
    equals(() => exports.onStart, undefined)
  })

  test('PaperScript creates a tool for onActivate()', () => {
    const exports = PaperScript.execute('function onActivate() {}', paper),
      tool = paper.tools[paper.tools.length - 1]
    equals(() => tool && tool.onActivate === exports.onActivate, true)
    if (tool) tool.remove()
  })

  // Hosts can provide a current Acorn as self.acorn, for the syntax that the
  // bundled one doesn't parse, such as let, arrow functions and exports:
  function withAcornLatest(callback) {
    const global = isNodeContext ? paper.window : window,
      previous = global.acorn
    global.acorn = acornLatest
    try {
      callback()
    } finally {
      global.acorn = previous
    }
  }

  test('PaperScript with a current Acorn', () => {
    withAcornLatest(() => {
      const exports = PaperScript.execute(
        'const offset = (point) => point + [1, 1];\n' +
        'let { x, y } = offset(new Point(1, 2));\n' +
        'module.exports.result = `${x},${y}`;',
        paper
      )
      equals(exports.result, '2,3')
    })
  })

  test('PaperScript exports', () => {
    withAcornLatest(() => {
      let exports = PaperScript.execute(
        'export function multiply(a, b) { return a * b; }\n' +
        'var a = 1, b = 2;\n' +
        'export { a, b as c };\n' +
        'export var point = new Point(1, 2) + 1;',
        paper
      )
      equals(() => exports.multiply(2, 3), 6, 'export function')
      equals(() => [exports.a, exports.c], [1, 2], 'export { a, b as c }')
      equals(() => exports.point, new Point(2, 3), 'export var')
      // Exported variables are local variables too, also several in a row
      // and from destructuring:
      exports = PaperScript.execute(
        'export var a = 1, b = new Point(1, 2) + a;\n' +
        'export const { x, y: [z] } = { x: -b, y: [a * 2] };',
        paper
      )
      equals(
        () => [exports.a, exports.b, exports.x, exports.z],
        [1, new Point(2, 3), new Point(-2, -3), 2],
        'export var a, b'
      )
      // Without semicolons:
      exports = PaperScript.execute(
        'export const big = new Point(1, 2) * 2\n' +
        'export function twice(a) { return a * 2 }',
        paper
      )
      equals(
        () => [exports.big, exports.twice(2)],
        [new Point(2, 4), 4],
        'without semicolons'
      )
      // The default export sits next to the named ones:
      exports = PaperScript.execute(
        'export default function(a) { return a + 1; }\n' +
        'export const name = "add";',
        paper
      )
      equals(
        () => [exports.default(1), exports.name, exports.__esModule],
        [2, 'add', true],
        'export default'
      )
    })
  })

  test('PaperScript imports', () => {
    withAcornLatest(() => {
      const modules = {
          'default.js': 'export default new Point(1, 2) * 2;',
          'named.js': (
            'export const x = 1;\n' +
            'export function f() { return 2; }'
          ),
          'all.js': (
            'export * from "named.js";\n' +
            'export * from "default.js";\n' +
            'export { x as y } from "named.js";'
          ),
          // A CommonJS-style module:
          'common.js': 'module.exports = { a: 1 };'
        },
        calls = [],
        cache = {}
      // Like a host's loader, run each module once:
      function load(specifier, url) {
        calls.push(specifier + ' from ' + url)
        return (
          cache[specifier] ||
          (cache[specifier] = PaperScript.execute(
            modules[specifier],
            paper,
            { url: specifier, load }
          ))
        )
      }
      const exports = PaperScript.execute(
        'import point from "default.js";\n' +
        'import { x, f as g } from "named.js";\n' +
        'import * as all from "all.js";\n' +
        'import common from "common.js";\n' +
        'import * as commonAll from "common.js";\n' +
        'export const result = [point, x, g(), all.x, all.y,\n' +
        '    "default" in all, common.a, commonAll.a,\n' +
        '    commonAll.default === common];',
        paper,
        { url: 'main.js', load }
      )
      equals(
        () => exports.result,
        [new Point(2, 4), 1, 2, 1, 1, false, 1, 1, true]
      )
      equals(
        calls,
        [
          'default.js from main.js',
          'named.js from main.js',
          'all.js from main.js',
          'named.js from all.js',
          'default.js from all.js',
          'named.js from all.js',
          'common.js from main.js',
          'common.js from main.js'
        ],
        'specifiers as written, with the importing url'
      )
      let message
      try {
        PaperScript.execute('import "named.js";', paper)
      } catch (e) {
        message = e.message
      }
      equals(
        message,
        `Unable to import 'named.js': no loader was passed ` +
        'to PaperScript.execute().'
      )
    })
  })

  test('PaperScript import attributes', () => {
    withAcornLatest(() => {
      const calls = []
      function load(specifier, url, attributes) {
        calls.push([specifier, attributes])
        return { x: 1 }
      }
      PaperScript.execute(
        'import { x } from "a.js" with { type: "paperscript" };\n' +
        'import b from "b.js" with { "type": "javascript" };\n' +
        'import "c.js";\n' +
        'export { x as y } from "d.js" with { type: "paperscript" };\n' +
        'export * from "e.js" with { type: "paperscript" };\n' +
        'export * as f from "f.js" with { type: "paperscript" };',
        paper,
        { load }
      )
      equals(calls, [
        ['a.js', { type: 'paperscript' }],
        ['b.js', { type: 'javascript' }],
        ['c.js', undefined],
        ['d.js', { type: 'paperscript' }],
        ['e.js', { type: 'paperscript' }],
        ['f.js', { type: 'paperscript' }]
      ])
    })
  })

  test('PaperScript dynamic import attributes', assert => {
    const done = assert.async()
    withAcornLatest(() => {
      const calls = [],
        order = []
      function load(specifier, url, attributes) {
        calls.push([specifier, attributes])
        return { x: 1 }
      }
      // Log the order in which specifier and options are evaluated:
      paper.log = value => {
        order.push(value)
        return value
      }
      let exports
      try {
        exports = PaperScript.execute(
          'module.exports.results = [\n' +
          '    import(log("a.js"), log({ with: { type: "paperscript" } })),\n' +
          '    import("b.js", {}),\n' +
          '    import("c.js")\n' +
          '];',
          paper,
          { load }
        )
      } finally {
        delete paper.log
      }
      Promise.all(exports.results)
        .then(() => {
          equals(calls, [
            ['a.js', { type: 'paperscript' }],
            ['b.js', undefined],
            ['c.js', undefined]
          ])
          equals(
            order,
            ['a.js', { with: { type: 'paperscript' } }],
            'the options are evaluated once, after the specifier'
          )
        })
        .then(done, error => {
          ok(false, error + '')
          done()
        })
    })
  })

  test('PaperScript compound assignments evaluate their targets once', () => {
    executeCode(
      'var calls = 0;\n' +
      'function index() { calls++; return 0; }\n' +
      'function object() { calls++; return o; }\n' +
      'var points = [new Point(1, 1)], o = { p: new Point(1, 1) };\n' +
      'points[index()] += [1, 2];\n' +
      'object().p *= 2;\n' +
      'module.exports = [calls, points[0], o.p, (o.p -= 1)];',
      [2, new Point(2, 3), new Point(2, 2), new Point(1, 1)]
    )
  })

  test('PaperScript binary operators', () => {
    // Each case: the code of an expression, and its expected result:
    ;[
      ['new Point(1, 2) + new Point(3, 4)', new Point(4, 6)],
      ['new Point(1, 2) + 1', new Point(2, 3)],
      ['new Point(1, 2) + [3, 4]', new Point(4, 6)],
      ['new Point(5, 5) - new Point(1, 2)', new Point(4, 3)],
      ['new Point(1, 2) * 2', new Point(2, 4)],
      ['new Point(1, 2) * new Point(3, 4)', new Point(3, 8)],
      ['new Point(4, 6) / 2', new Point(2, 3)],
      ['new Point(5, 7) % 3', new Point(2, 1)],
      ['new Size(10, 20) * 2', new Size(20, 40)],
      ['new Size(10, 20) + new Size(1, 2)', new Size(11, 22)],
      ['new Color(0.2, 0.4, 0.6) * 2', new Color(0.4, 0.8, 1.2)],
      [
        'new Color(0.2, 0.2, 0.2) + new Color(0.1, 0.2, 0.3)',
        new Color(0.3, 0.4, 0.5)
      ],
      // Precedence and parentheses are kept:
      ['new Point(1, 1) + new Point(1, 2) * 2', new Point(3, 5)],
      ['(new Point(1, 1) + new Point(1, 2)) * 2', new Point(4, 6)],
      // Operands that aren't Paper.js objects behave as in JavaScript, also
      // on the left of one, as only the left operand is overloaded:
      ['1 + 2 * 3', 7],
      ['1 + new Point(1, 2)', '1{ x: 1, y: 2 }'],
      ['"a" + 1', 'a1'],
      ['"x" + new Point(1, 2)', 'x{ x: 1, y: 2 }'],
      ['7 % 4', 3]
    ].forEach(entry => {
      executeCode('module.exports = ' + entry[0], entry[1])
    })
  })

  test('PaperScript equality operators', () => {
    ;[
      ['new Point(1, 2) == new Point(1, 2)', true],
      ['new Point(1, 2) == [1, 2]', true],
      ['new Point(1, 2) != new Point(1, 2)', false],
      ['new Point(1, 2) != new Point(2, 1)', true],
      ['new Size(1, 2) == new Size(1, 2)', true],
      ['new Color(1, 0, 0) == new Color(1, 0, 0)', true],
      ['1 == "1"', true],
      ['null == undefined', true],
      ['"a" != "b"', true]
    ].forEach(entry => {
      executeCode('module.exports = ' + entry[0], entry[1])
    })
  })

  test('PaperScript unary operators', () => {
    ;[
      ['-new Point(1, -2)', new Point(-1, 2)],
      ['+new Point(1, 2)', new Point(1, 2)],
      ['-new Size(1, 2)', new Size(-1, -2)],
      ['-5', -5],
      ['+"5"', 5],
      [
        'var p = new Point(1, 2); module.exports = -p * 2',
        new Point(-2, -4)
      ]
    ].forEach(entry => {
      executeCode(
        /module\.exports/.test(entry[0])
          ? entry[0]
          : 'module.exports = ' + entry[0],
        entry[1]
      )
    })
  })

  test('PaperScript compound assignments', () => {
    executeCode(
      'var p = new Point(1, 2); p += [10, 0]; module.exports = p',
      new Point(11, 2)
    )
    executeCode(
      'var p = new Point(1, 2); p *= 2; p -= 1; p /= 2; ' +
      'module.exports = p',
      new Point(0.5, 1.5)
    )
    // On properties and elements, the most common use in scripts:
    executeCode(
      'var path = new Path.Circle({ center: [50, 50], radius: 10 });' +
      ' path.position += [10, 0]; module.exports = path.position',
      new Point(60, 50)
    )
    executeCode(
      'var points = [new Point(1, 2)]; points[0] *= 3; ' +
      'module.exports = points[0]',
      new Point(3, 6)
    )
    executeCode(
      'var o = { s: new Size(1, 2) }; o["s"] += 1; ' +
      'module.exports = o.s',
      new Size(2, 3)
    )
    // Numbers and strings behave as in JavaScript:
    executeCode('var n = 1; n += 2; n *= 3; module.exports = n', 9)
    executeCode('var s = "a"; s += 1; module.exports = s', 'a1')
  })

  test('PaperScript with operator overloading turned off', () => {
    const code = 'var p = new Point(1, 2); module.exports = p + 1;'
    equals(
      PaperScript.compile(code, {
        paperFeatures: { operatorOverloading: false }
      }).code,
      code
    )
    equals(
      PaperScript.execute(code, paper, {
        paperFeatures: { operatorOverloading: false }
      }),
      '{ x: 1, y: 2 }1'
    )
  })

  test('PaperScript.execute() globals', () => {
    const exports = PaperScript.execute(
      'module.exports = {\n' +
      '    project: project === paper.project,\n' +
      '    view: view === paper.view,\n' +
      '    point: new Point(1, 2) instanceof paper.Point\n' +
      '};',
      paper
    )
    equals(exports, { project: true, view: true, point: true })
  })

  test('PaperScript.execute() handlers', () => {
    const view = paper.view,
      exports = PaperScript.execute(
        'var calls = [];\n' +
        'function onFrame(event) { calls.push("frame"); }\n' +
        'function onResize(event) { calls.push("resize"); }\n' +
        'function onMouseDown(event) {}\n' +
        'module.exports.calls = calls;\n' +
        'module.exports.tool = tool;',
        paper
      )
    equals(
      () => (
        view.onFrame === exports.onFrame &&
        view.onResize === exports.onResize
      ),
      true,
      'view handlers'
    )
    // onResize is called once right away, so scripts can lay out:
    equals(exports.calls, ['resize'], 'onResize called once')
    equals(
      () => (
        exports.tool && (
          exports.tool.onMouseDown ===
          exports.onMouseDown
        )
      ),
      true,
      'tool handlers on the created tool'
    )
    view.onFrame = view.onResize = null
    exports.tool.remove()
  })

  if (!isNodeContext) {
    test('PaperScript.load() with several scripts per canvas', () => {
      const current = paper,
        canvas = document.createElement('canvas')
      canvas.id = 'paperscript-scopes'
      document.body.appendChild(canvas)
      function load(code, ignore) {
        const script = document.createElement('script')
        script.type = 'text/paperscript'
        script.setAttribute('canvas', canvas.id)
        if (ignore) script.setAttribute('data-paper-ignore', 'true')
        script.text = code
        document.body.appendChild(script)
        PaperScript.load(script)
        document.body.removeChild(script)
      }
      // Scripts for the same canvas share its scope:
      load('paper.first = view;')
      load('paper.second = paper.first === view;')
      load('paper.ignored = true;', true)
      const scope = PaperScope.get(
        canvas.getAttribute('data-paper-scope')
      )
      equals(() => scope.second, true, 'shared scope')
      equals(() => scope.ignored, undefined, 'data-paper-ignore')
      scope.remove()
      document.body.removeChild(canvas)
      current.activate()
    })
  }

  test('PaperScript syntax errors', () => {
    let message
    try {
      PaperScript.compile('var a = ;')
    } catch (e) {
      message = e.message
    }
    equals(() => /Unexpected token/.test(message), true, message)
  })

  test('PaperScript dynamic imports', assert => {
    const done = assert.async()
    withAcornLatest(() => {
      // Run the modules now, while the current Acorn is lent, as the
      // imports only call the loader later:
      const modules = {
        'shapes.js': PaperScript.execute(
          'export default "shapes";\n' +
          'export const size = new Size(2, 3) * 2;',
          paper
        ),
        'common.js': PaperScript.execute(
          'module.exports = { a: 1 };',
          paper
        )
      }
      // The loader may also return a Promise for dynamic imports:
      function load(specifier) {
        return Promise.resolve(modules[specifier])
      }
      const exports = PaperScript.execute(
          'var name = "shapes";\n' +
          'module.exports.shapes = import(name + ".js");\n' +
          'module.exports.common = import("common.js");',
          paper,
          { load }
        ),
        failed = PaperScript.execute(
          'module.exports.result = import("shapes.js");',
          paper
        )
      Promise.all([exports.shapes, exports.common])
        .then(results => {
          equals(
            () => [results[0].default, results[0].size],
            ['shapes', new Size(4, 6)],
            'the namespace of an ES module'
          )
          equals(
            () => [results[1].a, results[1].default.a],
            [1, 1],
            'the namespace of CommonJS-style exports'
          )
          return failed.result
        })
        .then(
          () => {
            ok(false, 'import() without a loader should reject')
          },
          error => {
            equals(
              error.message,
              `Unable to import 'shapes.js': no loader ` +
              'was passed to PaperScript.execute().',
              'import() without a loader rejects'
            )
          }
        )
        .then(done, error => {
          ok(false, error + '')
          done()
        })
    })
  })

  test('PaperScript with top-level await', assert => {
    const done = assert.async()
    withAcornLatest(() => {
      // The handlers are installed once the code has run:
      const exports = PaperScript.execute(
          'var size = await Promise.resolve(new Size(2, 3));\n' +
          'for await (var factor of [Promise.resolve(2)])\n' +
          '    size *= factor;\n' +
          'function onMouseDown() {}\n' +
          'module.exports.size = size;',
          paper
        ),
        failed = PaperScript.execute(
          'await Promise.reject(new Error("failed"));',
          paper
        ),
        nested = PaperScript.execute(
          'async function twice(value) { return await value * 2; }\n' +
          'module.exports.twice = twice;',
          paper
        )
      equals(
        () => typeof nested.twice,
        'function',
        'await in functions keeps the exports synchronous'
      )
      exports
        .then(exports => {
          equals(exports.size, new Size(4, 6), 'the exports')
          equals(
            () => paper.tool.onMouseDown === exports.onMouseDown,
            true,
            'the installed handlers'
          )
          paper.tool.remove()
          return failed
        })
        .then(
          () => {
            ok(false, 'a rejected await should reject')
          },
          error => {
            equals(
              error.message,
              'failed',
              'a rejected await rejects'
            )
          }
        )
        .then(done, error => {
          ok(false, error + '')
          done()
        })
    })
  })
})
