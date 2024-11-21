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

QUnit.module('Line');

test('new Line(10, 20, 30, 40)', function() {
    var line = new Line(10, 20, 30, 40);
    equals(line._px, 10, 'point._px');
    equals(line._py, 20, 'point._py');
    // _vx = p2.x - p1.x
    equals(line._vx, 20, 'point._vx');
    // _vy = p2.y - p1.y
    equals(line._vy, 20, 'point._vy');
});

test('new Line(10, 20, 30, 40, true)', function() {
    var line = new Line(10, 20, 30, 40, true);
    equals(line._px, 10, 'point._px');
    equals(line._py, 20, 'point._py');
    equals(line._vx, 30, 'point._vx');
    equals(line._vy, 40, 'point._vy');
});

test('getDistance()', function() {
    equals(function() {
        return new Line(10, 20, 20, 10, true).getDistance(new Point(20, 10));
    }, 13.416407864998737);
    equals(function() {
        return new Line(10, 20, -20, -10, true).getDistance(new Point(20, 10));
    }, 13.416407864998737);
    equals(function() {
        return new Line(10, 20, 20, 10, true).getDistance(new Point(0, 30));
    }, 13.416407864998737);
    equals(function() {
        return new Line(10, 20, -20, -10, true).getDistance(new Point(0, 30));
    }, 13.416407864998737);
});

test('getSignedDistance()', function() {
    equals(function() {
        return new Line(10, 20, 20, 10, true).getSignedDistance(new Point(20, 10));
    }, 13.416407864998737);
    equals(function() {
        // Change the line direction
        return new Line(10, 20, -20, -10, true).getSignedDistance(new Point(20, 10));
    }, -13.416407864998737);
    equals(function() {
        // Change the point side
        return new Line(10, 20, 20, 10, true).getSignedDistance(new Point(0, 30));
    }, -13.416407864998737);
    equals(function() {
        // Change the line direction and the point side
        return new Line(10, 20, -20, -10, true).getSignedDistance(new Point(0, 30));
    }, 13.416407864998737);
});
