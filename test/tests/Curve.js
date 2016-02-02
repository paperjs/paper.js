/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2016, Juerg Lehni & Jonathan Puckey
 * http://scratchdisk.com/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

QUnit.module('Curve');

test('Curve#getPointAtTime()', function() {
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
        equals(curve.getPointAtTime(entry[0]), entry[1],
                'curve.getPointAtTime(' + entry[0] + ');');
        // Legacy version:
        equals(curve.getPointAt(entry[0], true), entry[1],
                'Legacy: curve.getPointAt(' + entry[0] + ', true);');
    }

    equals(curve.getPointAt(curve.length + 1), null,
            'Should return null when offset is out of range.');
});

test('Curve#getTangentAtTime()', function() {
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
        equals(curve.getTangentAtTime(entry[0]), entry[1].normalize(),
                'curve.getTangentAtTime(' + entry[0] + ');');
        equals(curve.getWeightedTangentAtTime(entry[0]), entry[1],
                'curve.getWeightedTangentAtTime(' + entry[0] + ');');
        // Legacy version:
        equals(curve.getTangentAt(entry[0], true), entry[1].normalize(),
                'Legacy: curve.getTangentAt(' + entry[0] + ', true);');
        equals(curve.getWeightedTangentAt(entry[0], true), entry[1],
                'Legacy: curve.getWeightedTangentAt(' + entry[0] + ', true);');
    }
});

test('Curve#getNormalAtTime()', function() {
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
        equals(curve.getNormalAtTime(entry[0]), entry[1].normalize(),
                'curve.getNormalAtTime(' + entry[0] + ');');
        equals(curve.getWeightedNormalAtTime(entry[0]), entry[1],
                'curve.getWeightedNormalAtTime(' + entry[0] + ');');
        // Legacy version:
        equals(curve.getNormalAt(entry[0], true), entry[1].normalize(),
                'Legacy: curve.getNormalAt(' + entry[0] + ', true);');
        equals(curve.getWeightedNormalAt(entry[0], true), entry[1],
                'Legacy: curve.getWeightedNormalAt(' + entry[0] + ', true);');
    }
});

test('Curve#getCurvatureAtTime()', function() {
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
        equals(curve.getCurvatureAtTime(entry[0]), entry[1],
                'curve.getCurvatureAtTime(' + entry[0] + ');');
        // Legacy version:
        equals(curve.getCurvatureAt(entry[0], true), entry[1],
                'Legacy: curve.getCurvatureAt(' + entry[0] + ', true);');
    }
});

test('Curve#getCurvatureAtTime()', function() {
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
        equals(curve.getCurvatureAtTime(entry[0]), entry[1],
                'curve.getCurvatureAtTime(' + entry[0] + ');');
        // Legacy version:
        equals(curve.getCurvatureAt(entry[0], true), entry[1],
                'Legacy: curve.getCurvatureAt(' + entry[0] + ', true);');
    }
});

test('Curve#getTimeAt()', function() {
    var curve = new Path([
        [[0, 0], [0, 0], [100, 0]],
        [[200, 200]],
    ]).firstCurve;

    for (var f = 0; f <= 1; f += 0.1) {
        var o1 = curve.length * f;
        var o2 = -curve.length * (1 - f);
        var message = 'Curve-time parameter at offset ' + o1
                + ' should be the same value as at offset' + o2;
        equals(curve.getTimeAt(o1), curve.getTimeAt(o2), message,
                Numerical.CURVETIME_EPSILON);
        // Legacy version:
        equals(curve.getParameterAt(o1), curve.getParameterAt(o2),
                'Legacy: ' + message, Numerical.CURVETIME_EPSILON);
    }

    equals(curve.getTimeAt(curve.length + 1), null,
            'Should return null when offset is out of range.');
});

test('Curve#getLocationAt()', function() {
    var curve = new Path([
        [[0, 0], [0, 0], [100, 0]],
        [[200, 200]],
    ]).firstCurve;

    equals(curve.getLocationAt(curve.length + 1), null,
            'Should return null when offset is out of range.');
});

test('Curve#isStraight()', function() {
    equals(function() {
        return new Curve([100, 100], null, null, [200, 200]).isStraight();
    }, true);
    equals(function() {
        return new Curve([100, 100], [-50, -50], null, [200, 200]).isStraight();
    }, false);
    equals(function() {
        return new Curve([100, 100], [50, 50], null, [200, 200]).isStraight();
    }, true);
    equals(function() {
        return new Curve([100, 100], [50, 50], [-50, -50], [200, 200]).isStraight();
    }, true);
    equals(function() {
        return new Curve([100, 100], [50, 50], [50, 50], [200, 200]).isStraight();
    }, false);
    equals(function() {
        return new Curve([100, 100], null, [-50, -50], [200, 200]).isStraight();
    }, true);
    equals(function() {
        return new Curve([100, 100], null, [50, 50], [200, 200]).isStraight();
    }, false);
    equals(function() {
        return new Curve([100, 100], null, null, [100, 100]).isStraight();
    }, true);
    equals(function() {
        return new Curve([100, 100], [50, 50], null, [100, 100]).isStraight();
    }, false);
    equals(function() {
        return new Curve([100, 100], null, [-50, -50], [100, 100]).isStraight();
    }, false);
});

test('Curve#isLinear()', function() {
    equals(function() {
        return new Curve([100, 100], [100 / 3, 100 / 3], [-100 / 3, -100 / 3], [200, 200]).isLinear();
    }, true);
    equals(function() {
        return new Curve([100, 100], null, null, [100, 100]).isLinear();
    }, true);
    equals(function() {
        return new Curve([100, 100], null, null, [200, 200]).isLinear();
    }, false);
});

test('Curve#getTimeOf()', function() {
    // For issue #708:
    var path = new Path.Rectangle({
        center: new Point(300, 100),
        size: new Point(100, 100),
        strokeColor: 'black'
    });

    for (var pos = 0; pos < path.length; pos += 10) {
        var point1 = path.getPointAt(pos),
            point2 = null;
        for (var i = 0; i < path.curves.length; i++) {
            var curve = path.curves[i];
            var time = curve.getTimeOf(point1);
            if (time) {
                // Legacy-check-hack:
                equals(curve.getParameterOf(point1), time,
                        'Legacy: curve.getParameterOf() should return the same'
                        + ' as curve.getTimeOf()');
                point2 = curve.getLocationAtTime(time).point;
                break;
            }
        }
        equals(point1, point2, 'curve.getLocationAt(curve.getTimeOf('
                + point1 + ')).point;');
    }
});
