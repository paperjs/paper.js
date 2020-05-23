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
