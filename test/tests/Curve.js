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

QUnit.module('Curve');

function testClassify(curve, expeced, message) {
    var info = curve.classify();
    if (expeced.type) {
        equals(info.type, expeced.type,
                'info.type == \'' + expeced.type + '\'');
    }
    if (expeced.roots !== undefined) {
        equals(info.roots, expeced.roots,
                'info.roots == ' + (expeced.roots ? '[' + expeced.roots + ']'
                        : expeced.roots));
    }
}

test('Curve#classify()', function() {
    var point = new Curve([100, 100], null, null, [100, 100]);
    var line = new Curve([100, 100], null, null, [200, 200]);
    var cusp = new Curve([100, 200], [100, -100], [-100, -100], [200, 200]);
    var loop = new Curve([100, 200], [150, -100], [-150, -100], [200, 200]);
    var single = new Curve([100, 100], [50, 0], [-27, -46], [200, 200]);
    var double = new Curve([100, 200], [100, -100], [-40, -80], [200, 200]);
    var arch = new Curve([100, 100], [50, 0], [0, -50], [200, 200]);
    testClassify(point, { type: 'line', roots: null });
    testClassify(line, { type: 'line', roots: null });
    testClassify(cusp, { type: 'cusp', roots: [ 0.5 ] });
    testClassify(loop, { type: 'loop', roots: [ 0.17267316464601132, 0.8273268353539888 ] });
    testClassify(single, { type: 'serpentine', roots: [ 0.870967741935484 ] });
    testClassify(double, { type: 'serpentine', roots: [ 0.15047207654837885, 0.7384168123405099 ] });
    testClassify(arch, { type: 'arch', roots: null });
});

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

    // #960:
    var curve = new Curve({
        segment1: [178.58559999999994, 333.41440000000006],
        segment2: [178.58559999999994, 178.58560000000008]
    });
    equals(curve.getPointAtTime(0).y, curve.point1.y,
            'Point at t=0 should not deviate from the actual coordinates.');
    equals(curve.getPointAtTime(1).y, curve.point2.y,
            'Point at t=1 should not deviate from the actual coordinates.');
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
        var o1 = curve.length * f,
            o2 = -curve.length * (1 - f),
            t1 = curve.getTimeAt(o1),
            t2 = curve.getTimeAt(o2);
        var message = 'Curve-time parameter at offset ' + o1
                + ' should be the same value as at offset ' + o2;
        equals(t1, t2, message, Numerical.CURVETIME_EPSILON);
        equals(function() { return curve.getOffsetAtTime(t1); }, o1);
        equals(function() { return curve.getOffsetAtTime(t2); }, curve.length + o2);
        // Legacy version:
        equals(curve.getParameterAt(o1), curve.getParameterAt(o2),
                'Legacy: ' + message, Numerical.CURVETIME_EPSILON);
        // Test other methods with negatives offsets
        equals(curve.getTangentAt(o1), curve.getTangentAt(o2),
                'Tangent at offset ' + o1
                + ' should be the same value as at offset ' + o2);
    }

    equals(curve.getTimeAt(curve.length + 1), null,
            'Should return null when offset is out of range.');
});

test('Curve#getTimeAt() with straight curve', function() {
    var path = new Path();
    path.moveTo(100, 100);
    path.lineTo(500, 500);
    var curve = path.firstCurve;
    var length = curve.length;
    var t = curve.getTimeAt(length / 3);
    equals(t, 0.3869631475722452);
});

test('Curve#getTimeAt() with straight curve', function() {
    // #1000:
    var curve = new Curve([
        1584.4999999999998, 1053.2499999999995,
        1584.4999999999998,1053.2499999999995,
        1520.5,1053.2499999999995,
        1520.5,1053.2499999999995
    ]);
    var offset = 63.999999999999716;
    equals(function() { return offset < curve.length; }, true);
    equals(function() { return curve.getTimeAt(offset); }, 1);
});

test('Curve#getTimeAt() with offset at end of curve', function() {
    // #1149:
    var curve = [-7500, 0, -7500, 4142.135623730952, -4142.135623730952, 7500, 0, 7500];
    equals(Curve.getTimeAt(curve, 11782.625235553916), 1);
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
    equals(function() { // #1269
        return new Curve([100, 300], [ 20, -20 ],  [ -10, 10 ], [200, 200]).isStraight();
    }, true);
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
    // #708:
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

test('Curve#getPartLength() with straight curve', function() {
    var curve = new Curve([0, 0, 0, 0, 64, 0, 64, 0]);
    equals(function() { return curve.getPartLength(0.0, 0.25); }, 10);
    equals(function() { return curve.getPartLength(0.25, 0.5); }, 22);
    equals(function() { return curve.getPartLength(0.25, 0.75); }, 44);
    equals(function() { return curve.getPartLength(0.5, 0.75); }, 22);
    equals(function() { return curve.getPartLength(0.75, 1); }, 10);
});

test('Curve#divideAt(offset)', function() {
    var point1 = new Point(0, 0);
    var point2 = new Point(100, 0);
    var middle = point1.add(point2).divide(2);
    equals(function() {
        return new Curve(point1, point2).divideAt(50).point1;
    }, middle);
    equals(function() {
        return new Curve(point1, point2).divideAtTime(0.5).point1;
    }, middle);
});

test('Curve#getTimesWithTangent()', function() {
    var curve = new Curve([0, 0], [100, 0], [0, -100], [200, 200]);
    equals(curve.getTimesWithTangent(), [], 'should return empty array when called without argument');
    equals(curve.getTimesWithTangent([1, 0]), [0], 'should return tangent at start');
    equals(curve.getTimesWithTangent([-1, 0]), [0], 'should return the same when called with opposite direction vector');
    equals(curve.getTimesWithTangent([0, 1]), [1], 'should return tangent at end');
    equals(curve.getTimesWithTangent([1, 1]), [0.5], 'should return tangent at middle');
    equals(curve.getTimesWithTangent([1, -1]), [], 'should return empty array when there is no tangent');

    equals(
        new Curve([0, 0], [100, 0], [500, -500], [-500, -500]).getTimesWithTangent([1, 0]).length,
        2,
        'should return 2 values for specific self-intersecting path case'
    );

    equals(
        new Curve([0, 0], [100, 0], [0, -100], [0, -100]).getTimesWithTangent([1, 0]).length,
        2,
        'should return 2 values for specific parabollic path case'
    );
});
