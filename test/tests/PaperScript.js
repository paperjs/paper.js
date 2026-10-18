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
            return paper.stack;
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
        paper.remove();
        document.body.removeChild(canvas);
        current.activate();
    });
}
