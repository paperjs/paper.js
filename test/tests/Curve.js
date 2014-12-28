/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2014, Juerg Lehni & Jonathan Puckey
 * http://scratchdisk.com/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

module('Curve');

test('Curve#getPointAt()', function() {
    var curve = new Path.Circle({
        center: [100, 100],
        radius: 100
    }).firstCurve;

    var points = [
        [0, new Point(0, 100)],
        [0.25, new Point(7.8585, 61.07549)],
        [0.5, new Point(29.28932, 29.28932)],
        [0.75, new Point(61.07549, 7.8585)],
        [1, new Point(100, 0)]
    ];

    for (var i = 0; i < points.length; i++) {
        var entry = points[i];
        equals(curve.getPointAt(entry[0], true), entry[1],
                'curve.getPointAt(' + entry[0] + ', true);');
    }
});

test('Curve#getTangentAt()', function() {
    var curve = new Path.Circle({
        center: [100, 100],
        radius: 100
    }).firstCurve;

    var tangents = [
        [0, new Point(0, -165.68542 )],
        [0.25, new Point(60.7233, -143.56602)],
        [0.5, new Point(108.57864, -108.57864)],
        [0.75, new Point(143.56602, -60.7233)],
        [1, new Point(165.68542, 0)]
    ];

    for (var i = 0; i < tangents.length; i++) {
        var entry = tangents[i];
        equals(curve.getTangentAt(entry[0], true), entry[1],
                'curve.getTangentAt(' + entry[0] + ', true);');
    }
});

test('Curve#getNormalAt()', function() {
    var curve = new Path.Circle({
        center: [100, 100],
        radius: 100
    }).firstCurve;

    var normals = [
        [0, new Point(-165.68542, 0)],
        [0.25, new Point(-143.56602, -60.7233)],
        [0.5, new Point(-108.57864, -108.57864)],
        [0.75, new Point(-60.7233, -143.56602)],
        [1, new Point(0, -165.68542)]
    ];

    for (var i = 0; i < normals.length; i++) {
        var entry = normals[i];
        equals(curve.getNormalAt(entry[0], true), entry[1],
                'curve.getNormalAt(' + entry[0] + ', true);');
    }
});

test('Curve#getCurvatureAt()', function() {
    var curve = new Path.Circle({
        center: [100, 100],
        radius: 100
    }).firstCurve;

    var curvatures = [
        [0, 0.009785533905932729],
        [0.25, 0.010062133221584524],
        [0.5, 0.009937576453041297],
        [0.75, 0.010062133221584524],
        [1, 0.009785533905932727]
    ];

    for (var i = 0; i < curvatures.length; i++) {
        var entry = curvatures[i];
        equals(curve.getCurvatureAt(entry[0], true), entry[1],
                'curve.getCurvatureAt(' + entry[0] + ', true);');
    }
});

test('Curve#getCurvatureAt()', function() {
    var curve = new Path.Line({
        from: [100, 100],
        to: [200, 200],
    }).firstCurve;

    var curvatures = [
        [0, 0],
        [0.25, 0],
        [0.5, 0],
        [0.75, 0],
        [1, 0]
    ];

    for (var i = 0; i < curvatures.length; i++) {
        var entry = curvatures[i];
        equals(curve.getCurvatureAt(entry[0], true), entry[1],
                'curve.getCurvatureAt(' + entry[0] + ', true);');
    }
});

test('Curve#getParameterAt()', function() {
    var curve = new Path([
        [[0, 0], [0, 0], [100, 0]],
        [[200, 200]],
    ]).firstCurve;

    for (var f = 0; f <= 1; f += 0.1) {
        var o1 = curve.length * f;
        var o2 = -curve.length * (1 - f);
        var t1 = curve.getParameterAt(o1);
        var t2 = curve.getParameterAt(o2);
        equals(t1, t2, 'Curve parameter at offset ' + o1
                + ' should be the same value as at offset' + o2,
                Numerical.TOLERANCE);
    }
});
