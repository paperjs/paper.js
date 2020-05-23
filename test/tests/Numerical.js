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

QUnit.module('Numerical');

test('Numerical.solveQuadratic()', function() {
    function solve(s) {
        var roots = [],
            count = Numerical.solveQuadratic(s, 0, -s, roots);
        return roots;
    }

    var expected = [1, -1];

    equals(solve(1), expected,
            'Numerical.solveQuadratic().');
    equals(solve(Numerical.EPSILON), expected,
            'Numerical.solveQuadratic() with an identical set of' +
            'coefficients at different scale.');
});

test('Numerical.solveCubic()', function() {
    function solve(s) {
        var roots = [],
            count = Numerical.solveCubic(0.5 * s, -s, -s, -s, roots);
        return roots;
    }

    var expected = [2.919639565839418];

    equals(solve(1), expected,
            'Numerical.solveCubic().');
    equals(solve(Numerical.EPSILON), expected,
            'Numerical.solveCubic() with an identical set of' +
            'coefficients at different scale.');
});
