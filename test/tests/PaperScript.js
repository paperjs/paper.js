/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2016, Juerg Lehni & Jonathan Puckey
 * http://scratchdisk.com/ & https://puckey.studio/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

QUnit.module('PaperScript');

test('PaperScript#compile() with prefix increment/decrement operators', function() {
    var code = 'var x = 1; var y = 1 * --x;';
    var compiled = PaperScript.compile(code, paper);
    PaperScript.execute(compiled, paper);
    expect(0);
});
