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

QUnit.module('PaperScript');

function executeCode(code, expected) {
    try {
        equals(PaperScript.execute(code, paper), expected, code);
    } catch (err) {
        ok(false, err + '');
    }
}

test('PaperScript with prefix decrement operators', function() {
    executeCode(
        'var j = 0; for (var i = 10; i > 0; i--) { j++ }; module.exports = j',
        10
    );
    executeCode(
        'var x = 1; var y = 4 * --x; y; module.exports = x + " " + y',
        '0 0'
    );
});

test('PaperScript with suffix increment operators', function() {
    executeCode(
        'var j = 0; for (var i = 0; i < 10; ++i) { j++ }; module.exports = j',
        10
    );
    // #691
    executeCode(
        'var x = 1; x = x++; module.exports = x',
        1
    );
    executeCode(
        'var x = 1; var y = 4 * x++; y; module.exports = x + " " + y',
        '2 4'
    );
});

test('PaperScript with inline source maps', function() {
    var source = 'var a = 1;\nvar b = 2;',
        code = PaperScript.compile(source, {
            url: 'test.js',
            sourceMaps: 'inline'
        }).code,
        match = code.match(
            /\n\/\/# sourceMappingURL=data:application\/json;base64,(\S+)\n/),
        map = JSON.parse(window.atob(match[1]));
    equals(map.version, 3);
    equals(map.sources, ['test.js']);
    equals(map.sourcesContent, [source]);
    // One group of mappings per line of generated code:
    equals(map.mappings.split(';').length, 2);
});

if (!isNodeContext) {
    test('PaperScript.load() with source urls (#1753)', function() {
        var current = paper,
            canvas = document.createElement('canvas');
        canvas.id = 'paperscript-canvas';
        document.body.appendChild(canvas);

        function load(code, src, detached) {
            var script = document.createElement('script');
            script.type = 'text/paperscript';
            script.setAttribute('canvas', canvas.id);
            if (src) {
                script.setAttribute('data-src', src);
            } else {
                script.text = code;
            }
            if (detached) {
                PaperScript.load(script);
            } else {
                document.body.appendChild(script);
                PaperScript.load(script);
                document.body.removeChild(script);
            }
            return getScope().stack;
        }

        // With the built library, PaperScript doesn't set the global `paper`,
        // so get the canvas' scope:
        function getScope() {
            return PaperScope.get(canvas.getAttribute('data-paper-scope'));
        }

        // Stack traces name the sourceURL that devtools list the code under:
        var src = 'data:text/plain,paper.stack=new%20Error().stack;',
            stack = load(null, src);
        ok(stack.indexOf(src) !== -1, stack);
        stack = load('paper.stack = new Error("inline").stack;');
        ok(stack.indexOf(document.baseURI) !== -1, stack);
        // Inline code that isn't part of the html:
        stack = load('paper.stack = new Error("detached").stack;', null, true);
        ok(stack.indexOf(document.baseURI) !== -1, stack);
        getScope().remove();
        document.body.removeChild(canvas);
        current.activate();
    });
}

test('PaperScript keeps the native globals (#1832)', function() {
    var exports = PaperScript.execute(
            'module.exports.symbol = Symbol;\n'
            + 'module.exports.event = Event;\n'
            + 'module.exports.path = Path;', paper);
    // Paper.js's classes of the same names don't shadow the native ones:
    equals(function() {
        return exports.symbol === Symbol && exports.symbol !== paper.Symbol;
    }, true, 'Symbol');
    // In the browser, the tests load the sources directly, which declares
    // Paper.js's classes as globals, so only Node.js has the native Event:
    if (isNodeContext) {
        equals(function() {
            return exports.event !== paper.Event;
        }, true, 'Event');
    }
    equals(function() {
        return exports.path === Path;
    }, true, 'Path');
});

test('PaperScript.execute(code, scope, { handlers })', function() {
    var exports = PaperScript.execute(
            'function onStop() { return \'stopped\'; }\n'
            + 'function onStart() {}', paper, { handlers: ['onStop'] });
    equals(function() {
        return exports.onStop();
    }, 'stopped');
    equals(function() {
        return exports.onStart;
    }, undefined);
});

test('PaperScript creates a tool for onActivate()', function() {
    var exports = PaperScript.execute('function onActivate() {}', paper),
        tool = paper.tools[paper.tools.length - 1];
    equals(function() {
        return tool && tool.onActivate === exports.onActivate;
    }, true);
    if (tool)
        tool.remove();
});

// Hosts can provide a current Acorn as self.acorn, for the syntax that the
// bundled one doesn't parse, such as let, arrow functions and exports:
function withAcornLatest(callback) {
    var global = isNodeContext ? paper.window : window,
        previous = global.acorn;
    global.acorn = acornLatest;
    try {
        callback();
    } finally {
        global.acorn = previous;
    }
}

test('PaperScript with a current Acorn', function() {
    withAcornLatest(function() {
        var exports = PaperScript.execute(
                'const offset = (point) => point + [1, 1];\n'
                + 'let { x, y } = offset(new Point(1, 2));\n'
                + 'module.exports.result = `${x},${y}`;', paper);
        equals(exports.result, '2,3');
    });
});

test('PaperScript exports', function() {
    withAcornLatest(function() {
        var exports = PaperScript.execute(
                'export function multiply(a, b) { return a * b; }\n'
                + 'var a = 1, b = 2;\n'
                + 'export { a, b as c };\n'
                + 'export var point = new Point(1, 2) + 1;', paper);
        equals(function() {
            return exports.multiply(2, 3);
        }, 6, 'export function');
        equals(function() {
            return [exports.a, exports.c];
        }, [1, 2], 'export { a, b as c }');
        equals(function() {
            return exports.point;
        }, new Point(2, 3), 'export var');
        // Exported variables are local variables too, also several in a row
        // and from destructuring:
        exports = PaperScript.execute(
                'export var a = 1, b = new Point(1, 2) + a;\n'
                + 'export const { x, y: [z] } = { x: -b, y: [a * 2] };', paper);
        equals(function() {
            return [exports.a, exports.b, exports.x, exports.z];
        }, [1, new Point(2, 3), new Point(-2, -3), 2], 'export var a, b');
        // Without semicolons:
        exports = PaperScript.execute('export const big = new Point(1, 2) * 2\n'
                + 'export function twice(a) { return a * 2 }', paper);
        equals(function() {
            return [exports.big, exports.twice(2)];
        }, [new Point(2, 4), 4], 'without semicolons');
        // The default export sits next to the named ones:
        exports = PaperScript.execute(
                'export default function(a) { return a + 1; }\n'
                + 'export const name = "add";', paper);
        equals(function() {
            return [exports.default(1), exports.name, exports.__esModule];
        }, [2, 'add', true], 'export default');
    });
});

test('PaperScript imports', function() {
    withAcornLatest(function() {
        var modules = {
                'default.js': 'export default new Point(1, 2) * 2;',
                'named.js': 'export const x = 1;\n'
                    + 'export function f() { return 2; }',
                'all.js': 'export * from "named.js";\n'
                    + 'export * from "default.js";\n'
                    + 'export { x as y } from "named.js";',
                // A CommonJS-style module:
                'common.js': 'module.exports = { a: 1 };'
            },
            calls = [],
            cache = {};
        // Like a host's loader, run each module once:
        function load(specifier, url) {
            calls.push(specifier + ' from ' + url);
            return cache[specifier] || (cache[specifier] = PaperScript.execute(
                    modules[specifier], paper, { url: specifier, load: load }));
        }
        var exports = PaperScript.execute(
                'import point from "default.js";\n'
                + 'import { x, f as g } from "named.js";\n'
                + 'import * as all from "all.js";\n'
                + 'import common from "common.js";\n'
                + 'import * as commonAll from "common.js";\n'
                + 'export const result = [point, x, g(), all.x, all.y,\n'
                + '    "default" in all, common.a, commonAll.a,\n'
                + '    commonAll.default === common];',
                paper, { url: 'main.js', load: load });
        equals(function() {
            return exports.result;
        }, [new Point(2, 4), 1, 2, 1, 1, false, 1, 1, true]);
        equals(calls, [
            'default.js from main.js',
            'named.js from main.js',
            'all.js from main.js',
            'named.js from all.js',
            'default.js from all.js',
            'named.js from all.js',
            'common.js from main.js',
            'common.js from main.js'
        ], 'specifiers as written, with the importing url');
        var message;
        try {
            PaperScript.execute('import "named.js";', paper);
        } catch (e) {
            message = e.message;
        }
        equals(message, 'Unable to import \'named.js\': no loader was passed '
                + 'to PaperScript.execute().');
    });
});

test('PaperScript compound assignments evaluate their targets once', function() {
    executeCode('var calls = 0;\n'
            + 'function index() { calls++; return 0; }\n'
            + 'function object() { calls++; return o; }\n'
            + 'var points = [new Point(1, 1)], o = { p: new Point(1, 1) };\n'
            + 'points[index()] += [1, 2];\n'
            + 'object().p *= 2;\n'
            + 'module.exports = [calls, points[0], o.p, (o.p -= 1)];',
            [2, new Point(2, 3), new Point(2, 2), new Point(1, 1)]);
});

test('PaperScript binary operators', function() {
    // Each case: the code of an expression, and its expected result:
    [
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
        ['new Color(0.2, 0.2, 0.2) + new Color(0.1, 0.2, 0.3)',
            new Color(0.3, 0.4, 0.5)],
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
    ].forEach(function(entry) {
        executeCode('module.exports = ' + entry[0], entry[1]);
    });
});

test('PaperScript equality operators', function() {
    [
        ['new Point(1, 2) == new Point(1, 2)', true],
        ['new Point(1, 2) == [1, 2]', true],
        ['new Point(1, 2) != new Point(1, 2)', false],
        ['new Point(1, 2) != new Point(2, 1)', true],
        ['new Size(1, 2) == new Size(1, 2)', true],
        ['new Color(1, 0, 0) == new Color(1, 0, 0)', true],
        ['1 == "1"', true],
        ['null == undefined', true],
        ['"a" != "b"', true]
    ].forEach(function(entry) {
        executeCode('module.exports = ' + entry[0], entry[1]);
    });
});

test('PaperScript unary operators', function() {
    [
        ['-new Point(1, -2)', new Point(-1, 2)],
        ['+new Point(1, 2)', new Point(1, 2)],
        ['-new Size(1, 2)', new Size(-1, -2)],
        ['-5', -5],
        ['+"5"', 5],
        ['var p = new Point(1, 2); module.exports = -p * 2', new Point(-2, -4)]
    ].forEach(function(entry) {
        executeCode(/module\.exports/.test(entry[0]) ? entry[0]
                : 'module.exports = ' + entry[0], entry[1]);
    });
});

test('PaperScript compound assignments', function() {
    executeCode('var p = new Point(1, 2); p += [10, 0]; module.exports = p',
            new Point(11, 2));
    executeCode('var p = new Point(1, 2); p *= 2; p -= 1; p /= 2; '
            + 'module.exports = p', new Point(0.5, 1.5));
    // On properties and elements, the most common use in scripts:
    executeCode('var path = new Path.Circle({ center: [50, 50], radius: 10 });'
            + ' path.position += [10, 0]; module.exports = path.position',
            new Point(60, 50));
    executeCode('var points = [new Point(1, 2)]; points[0] *= 3; '
            + 'module.exports = points[0]', new Point(3, 6));
    executeCode('var o = { s: new Size(1, 2) }; o["s"] += 1; '
            + 'module.exports = o.s', new Size(2, 3));
    // Numbers and strings behave as in JavaScript:
    executeCode('var n = 1; n += 2; n *= 3; module.exports = n', 9);
    executeCode('var s = "a"; s += 1; module.exports = s', 'a1');
});

test('PaperScript with operator overloading turned off', function() {
    var code = 'var p = new Point(1, 2); module.exports = p + 1;';
    equals(PaperScript.compile(code, {
        paperFeatures: { operatorOverloading: false }
    }).code, code);
    equals(PaperScript.execute(code, paper, {
        paperFeatures: { operatorOverloading: false }
    }), '{ x: 1, y: 2 }1');
});

test('PaperScript.execute() globals', function() {
    var exports = PaperScript.execute(
            'module.exports = {\n'
            + '    project: project === paper.project,\n'
            + '    view: view === paper.view,\n'
            + '    point: new Point(1, 2) instanceof paper.Point\n'
            + '};', paper);
    equals(exports, { project: true, view: true, point: true });
});

test('PaperScript.execute() handlers', function() {
    var view = paper.view,
        exports = PaperScript.execute(
            'var calls = [];\n'
            + 'function onFrame(event) { calls.push("frame"); }\n'
            + 'function onResize(event) { calls.push("resize"); }\n'
            + 'function onMouseDown(event) {}\n'
            + 'module.exports.calls = calls;\n'
            + 'module.exports.tool = tool;', paper);
    equals(function() {
        return view.onFrame === exports.onFrame
                && view.onResize === exports.onResize;
    }, true, 'view handlers');
    // onResize is called once right away, so scripts can lay out:
    equals(exports.calls, ['resize'], 'onResize called once');
    equals(function() {
        return exports.tool && exports.tool.onMouseDown
                === exports.onMouseDown;
    }, true, 'tool handlers on the created tool');
    view.onFrame = view.onResize = null;
    exports.tool.remove();
});

if (!isNodeContext) {
    test('PaperScript.load() with several scripts per canvas', function() {
        var current = paper,
            canvas = document.createElement('canvas');
        canvas.id = 'paperscript-scopes';
        document.body.appendChild(canvas);
        function load(code, ignore) {
            var script = document.createElement('script');
            script.type = 'text/paperscript';
            script.setAttribute('canvas', canvas.id);
            if (ignore)
                script.setAttribute('data-paper-ignore', 'true');
            script.text = code;
            document.body.appendChild(script);
            PaperScript.load(script);
            document.body.removeChild(script);
        }
        // Scripts for the same canvas share its scope:
        load('paper.first = view;');
        load('paper.second = paper.first === view;');
        load('paper.ignored = true;', true);
        var scope = PaperScope.get(canvas.getAttribute('data-paper-scope'));
        equals(function() {
            return scope.second;
        }, true, 'shared scope');
        equals(function() {
            return scope.ignored;
        }, undefined, 'data-paper-ignore');
        scope.remove();
        document.body.removeChild(canvas);
        current.activate();
    });
}

test('PaperScript syntax errors', function() {
    var message;
    try {
        PaperScript.compile('var a = ;');
    } catch (e) {
        message = e.message;
    }
    equals(function() {
        return /Unexpected token/.test(message);
    }, true, message);
});
