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

QUnit.module('Path Intersections');

function testIntersection(intersections, results) {
    equals(intersections.length, results.length, 'intersections.length');
    for (var i = 0; i < results.length; i++) {
        var inter = intersections[i];
        var values = results[i];
        var name = 'intersections[' + i + ']';
        equals(inter.point, new Point(values.point), name + '.point');
        equals(inter.index, values.index, name + '.index');
        equals(inter.time, values.time || 0, name + '.time');
        equals(inter.isCrossing(), values.crossing || false, name + '.isCrossing()');
    }
}

test('#565', function() {
    var curve1 = new Curve(new Point(421.75945, 416.40481), new Point(-181.49299, -224.94946), new Point(44.52004, -194.13319), new Point(397.47615, 331.34712));
    var curve2 = new Curve(new Point(360.09446, 350.97254), new Point(-58.58867, -218.45806), new Point(-109.55091, -220.99561), new Point(527.83582, 416.79948));
    var path1 = new Path([curve1.segment1, curve1.segment2]);
    var path2 = new Path([curve2.segment1, curve2.segment2]);
    testIntersection(curve1.getIntersections(curve2), [
        { point: { x: 354.13635, y: 220.81369 }, index: 0, time: 0.46725, crossing: true },
        { point: { x: 390.24772, y: 224.27351 }, index: 0, time: 0.71605, crossing: true }
    ]);

    // Alternative pair of curves that has the same issue
    var curve1 = new Curve(new Point(484.9026237381622, 404.11001967731863), new Point(-265.1185871567577, -204.00749347172678), new Point(-176.7118886578828, 111.96015905588865), new Point(438.8191690435633, 429.0297837462276));
    var curve2 = new Curve(new Point(388.25280445162207, 490.95032326877117), new Point(-194.0586572047323, -50.77360603027046), new Point(-184.71034923568368, -260.5346686206758), new Point(498.41401199810207, 455.55853731930256)); var path1 = new Path([curve1.segment1, curve1.segment2]);
    var path1 = new Path([curve1.segment1, curve1.segment2]);
    var path2 = new Path([curve2.segment1, curve2.segment2]);
    testIntersection(curve1.getIntersections(curve2), [
        { point: { x: 335.62744, y: 338.15939 }, index: 0, time: 0.26516, crossing: true }
    ]);
});

test('#568', function() {
    var curve1 = new Curve(new Point(509.05465863179415, 440.1211663847789), new Point(233.6728838738054, -245.8216403145343), new Point(-270.755685120821, 53.14275110140443), new Point(514.079892472364, 481.95262297522277));
    var curve2 = new Curve(new Point(542.1666181180626, 451.06309361290187), new Point(179.91238399408758, 148.68241581134498), new Point(193.42650789767504, -47.97609066590667), new Point(423.66228222381324, 386.3876062911004));
    var path1 = new Path([curve1.segment1, curve1.segment2]);
    var path2 = new Path([curve2.segment1, curve2.segment2]);
    testIntersection(curve1.getIntersections(curve2), [
        { point: { x: 547.96568, y: 396.66339 }, index: 0, time: 0.07024, crossing: true },
        { point: { x: 504.79973, y: 383.37886 }, index: 0, time: 0.48077, crossing: true }
    ]);

    var curve1 = new Curve(new Point(0, 0), new Point(20, 40) , new Point (-30, -50), new Point(50, 50));
    var curve2 = new Curve(new Point(50, 50), new Point(20, 100), new Point (-30, -120), new Point(250, 250));
    var path1 = new Path([curve1.segment1, curve1.segment2]);
    var path2 = new Path([curve2.segment1, curve2.segment2]);
    testIntersection(curve1.getIntersections(curve2), [
        { point: { x: 50, y: 50 }, index: 0, time: 1, crossing: false }
    ]);
});

test('#570', function() {
    var curve1 = new Curve(new Point(171, 359), new Point(65.26926656546078, 62.85188632229557), new Point(-37.43795644844329, 7.813022000754188), new Point(311.16034791674826, 406.2985255840872));
    var curve2 = new Curve(new Point(311.16034791674826, 406.2985255840872), new Point(39.997020018940304, -8.347079462067768), new Point(-73.86292504547487, -77.47859270504358), new Point(465, 467));
    var path1 = new Path([curve1.segment1, curve1.segment2]);
    var path2 = new Path([curve2.segment1, curve2.segment2]);
    var ints = curve1.getIntersections(curve2);
    testIntersection(curve1.getIntersections(curve2), [
        { point: { x: 311.16035, y: 406.29853 }, index: 0, time: 1, crossing: false }
    ]);
});

test('#571', function() {
    var curve1 = new Curve(new Point(171, 359),  new Point(205.3908899553486, -14.994581100305595), new Point(5.767644819815757, 28.49094950835297), new Point(420.1235851920127, 275.8351912321666));
    var curve2 = new Curve(new Point(420.1235851920127, 275.8351912321666), new Point(-10.77224553077383, -53.21262197949682), new Point(-259.2129470250785, -258.56165821345775), new Point(465, 467));
    var path1 = new Path([curve1.segment1, curve1.segment2]);
    var path2 = new Path([curve2.segment1, curve2.segment2]);
    testIntersection(curve1.getIntersections(curve2), [
        { point: { x: 352.39945, y: 330.44135 }, index: 0, time: 0.41159, crossing: true },
        { point: { x: 420.12359, y: 275.83519 }, index: 0, time: 1, crossing: false }
    ]);
});

test('overlapping circles', function() {
    var path1 = new Path.Circle(new paper.Point(50, 50), 50);
    var path2 = new Path.Circle(new paper.Point(100, 100), 50);
    testIntersection(path1.getIntersections(path2), [
        { point: { x: 100, y: 50 }, index: 2, crossing: true },
        { point: { x: 50, y: 100 }, index: 3, crossing: true }
    ]);
});

test('circle and square (existing segments overlaps on curves)', function() {
    var path1 = new Path.Circle(new Point(110, 110), 80);
    var path2 = new Path.Rectangle(new Point(110, 110), [100, 100]);
    testIntersection(path1.getIntersections(path2), [
        { point: { x: 190, y: 110 }, index: 2, time: 0, crossing: true },
        { point: { x: 110, y: 190 }, index: 3, time: 0, crossing: true }
    ]);
});
