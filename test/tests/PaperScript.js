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
        var add = PaperScript.execute(
                'export default function(a) { return a + 1; }', paper);
        equals(function() {
            return add(1);
        }, 2, 'export default');
    });
});

test('PaperScript imports', function() {
    withAcornLatest(function() {
        var modules = {
                'default.js': 'export default new Point(1, 2) * 2;',
                'named.js': 'export const x = 1;\n'
                    + 'export function f() { return 2; }',
                'all.js': 'export * from "named.js";\n'
                    + 'export { x as y } from "named.js";'
            },
            calls = [];
        function load(specifier, url) {
            calls.push(specifier + ' from ' + url);
            return PaperScript.execute(modules[specifier], paper,
                    { url: specifier, load: load });
        }
        var exports = PaperScript.execute(
                'import point from "default.js";\n'
                + 'import { x, f as g } from "named.js";\n'
                + 'import * as all from "all.js";\n'
                + 'export const result = [point, x, g(), all.x, all.y];',
                paper, { url: 'main.js', load: load });
        equals(function() {
            return exports.result;
        }, [new Point(2, 4), 1, 2, 1, 1]);
        equals(calls, [
            'default.js from main.js',
            'named.js from main.js',
            'all.js from main.js',
            'named.js from all.js',
            'named.js from all.js'
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
