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

QUnit.module('Matrix');

test('Decomposition: rotate()', function() {
    function testAngle(a, ea) {
        var m = new Matrix().rotate(a),
            s = 'new Matrix().rotate(' + a + ')';
        equals(m.getRotation(), Base.pick(ea, a),
            s + '.getRotation()');
        equals(m.getScaling(), new Point(1, 1),
            s + '.getScaling()');
    }

    testAngle(0);
    testAngle(1);
    testAngle(45);
    testAngle(90);
    testAngle(135);
    testAngle(180);
    testAngle(270, -90);
    testAngle(-1);
    testAngle(-45);
    testAngle(-90);
    testAngle(-135);
    testAngle(-180);
    testAngle(-270, 90);
});

test('Decomposition: scale()', function() {
    function testScale(sx, sy, ex, ey, ea) {
        var m = new Matrix().scale(sx, sy),
            s = 'new Matrix().scale(' + sx + ', ' + sy + ')';
        equals(m.getRotation(), ea || 0,
                s + '.getRotation()');
        equals(m.getScaling(), new Point(Base.pick(ex, sx), Base.pick(ey, sy)),
                s + '.getScaling()');
    }

    testScale(1, 1);
    testScale(1, -1);
    testScale(-1, 1, 1, -1, -180); // Decomposing results in correct flipping
    testScale(-1, -1, 1, 1, -180); // Decomposing results in correct flipping
    testScale(2, 4);
    testScale(2, -4);
    testScale(4, 2);
    testScale(-4, 2, 4, -2, -180); // Decomposing results in correct flipping
    testScale(-4, -4, 4, 4, -180); // Decomposing results in correct flipping
});

test('Decomposition: scale() & rotate()', function() {
    function testAngleAndScale(sx, sy, a, ex, ey, ea) {
        var m = new Matrix().rotate(a).scale(sx, sy),
            s = 'new Matrix().scale(' + sx + ', ' + sy + ').rotate(' + a + ')';
        equals(m.getRotation(), ea || a,
                s + '.getRotation()');
        equals(m.getScaling(), new Point(Base.pick(ex, sx), Base.pick(ey, sy)),
                s + '.getScaling()');
    }

    testAngleAndScale(2, 4, 45);
    testAngleAndScale(2, -4, 45);
    testAngleAndScale(-2, 4, 45, 2, -4, -135);
    testAngleAndScale(-2, -4, 45, 2, 4, -135);
});
