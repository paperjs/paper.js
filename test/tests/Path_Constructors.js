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

QUnit.module('Path Constructors');

test('new Path.Rectangle([50, 50], [100, 100])', function() {
    var path = new Path.Rectangle([50, 50], [100, 100]);
    equals(path.segments.toString(), '{ point: { x: 50, y: 150 } },{ point: { x: 50, y: 50 } },{ point: { x: 150, y: 50 } },{ point: { x: 150, y: 150 } }');
});

test('new Path.Rectangle({ from: [50, 50], to: [150, 150] })', function() {
    var path = new Path.Rectangle({
        from: [50, 50],
        to: [150, 150]
    });
    equals(path.segments.toString(), '{ point: { x: 50, y: 150 } },{ point: { x: 50, y: 50 } },{ point: { x: 150, y: 50 } },{ point: { x: 150, y: 150 } }');
});

test('new Path.Circle([100, 100], 50)', function() {
    var path = new Path.Circle([100, 100], 50);
    equals(path.segments.toString(), '{ point: { x: 50, y: 100 }, handleIn: { x: 0, y: 27.61424 }, handleOut: { x: 0, y: -27.61424 } },{ point: { x: 100, y: 50 }, handleIn: { x: -27.61424, y: 0 }, handleOut: { x: 27.61424, y: 0 } },{ point: { x: 150, y: 100 }, handleIn: { x: 0, y: -27.61424 }, handleOut: { x: 0, y: 27.61424 } },{ point: { x: 100, y: 150 }, handleIn: { x: 27.61424, y: 0 }, handleOut: { x: -27.61424, y: 0 } }');
});

test('new Path.Circle({ center: [100, 100], radius: 50 })', function() {
    var path = new Path.Circle({center: [100, 100], radius: 50});
    equals(path.segments.toString(), '{ point: { x: 50, y: 100 }, handleIn: { x: 0, y: 27.61424 }, handleOut: { x: 0, y: -27.61424 } },{ point: { x: 100, y: 50 }, handleIn: { x: -27.61424, y: 0 }, handleOut: { x: 27.61424, y: 0 } },{ point: { x: 150, y: 100 }, handleIn: { x: 0, y: -27.61424 }, handleOut: { x: 0, y: 27.61424 } },{ point: { x: 100, y: 150 }, handleIn: { x: 27.61424, y: 0 }, handleOut: { x: -27.61424, y: 0 } }');
});

test('new Path.Circle({ center: [100, 100], radius: 50, insert: true })', function() {
    paper.settings.insertItems = false;
    var path = new Path.Circle({ center: [100, 100], radius: 50, insert: true });
    equals(path.isInserted(), true);
    paper.settings.insertItems = true;
});

test('new Path.Ellipse(rect)', function() {
    var rect = new Rectangle([500, 500], [1000, 750]);
    var path = new Path.Ellipse(rect);
    equals(path.segments.toString(), '{ point: { x: 500, y: 875 }, handleIn: { x: 0, y: 207.10678 }, handleOut: { x: 0, y: -207.10678 } },{ point: { x: 1000, y: 500 }, handleIn: { x: -276.14237, y: 0 }, handleOut: { x: 276.14237, y: 0 } },{ point: { x: 1500, y: 875 }, handleIn: { x: 0, y: -207.10678 }, handleOut: { x: 0, y: 207.10678 } },{ point: { x: 1000, y: 1250 }, handleIn: { x: 276.14237, y: 0 }, handleOut: { x: -276.14237, y: 0 } }');
});

test('new Path.Rectangle(rectangle, radius)', function() {
    var rectangle = new Rectangle([50, 50], [200, 100]);
    var path = new Path.Rectangle(rectangle, 20);
    equals(path.segments.toString(), '{ point: { x: 70, y: 150 }, handleOut: { x: -11.04569, y: 0 } },{ point: { x: 50, y: 130 }, handleIn: { x: 0, y: 11.04569 } },{ point: { x: 50, y: 70 }, handleOut: { x: 0, y: -11.04569 } },{ point: { x: 70, y: 50 }, handleIn: { x: -11.04569, y: 0 } },{ point: { x: 230, y: 50 }, handleOut: { x: 11.04569, y: 0 } },{ point: { x: 250, y: 70 }, handleIn: { x: 0, y: -11.04569 } },{ point: { x: 250, y: 130 }, handleOut: { x: 0, y: 11.04569 } },{ point: { x: 230, y: 150 }, handleIn: { x: 11.04569, y: 0 } }');
});

test('new Path.Rectangle({ rectangle: rectangle, radius: radius })', function() {
    var rect = new Rectangle({
        point: [50, 50],
        size: [200, 100]
    });
    var path = new Path.Rectangle({
        rectangle: rect,
        radius: 20
    });
    equals(path.segments.toString(), '{ point: { x: 70, y: 150 }, handleOut: { x: -11.04569, y: 0 } },{ point: { x: 50, y: 130 }, handleIn: { x: 0, y: 11.04569 } },{ point: { x: 50, y: 70 }, handleOut: { x: 0, y: -11.04569 } },{ point: { x: 70, y: 50 }, handleIn: { x: -11.04569, y: 0 } },{ point: { x: 230, y: 50 }, handleOut: { x: 11.04569, y: 0 } },{ point: { x: 250, y: 70 }, handleIn: { x: 0, y: -11.04569 } },{ point: { x: 250, y: 130 }, handleOut: { x: 0, y: 11.04569 } },{ point: { x: 230, y: 150 }, handleIn: { x: 11.04569, y: 0 } }');
});

test('new Path.Rectangle(rect, size) - too large size', function() {
    var rect = new Rectangle([50, 50], [200, 100]);
    var path = new Path.Rectangle(rect, 200);
    equals(path.segments.toString(), '{ point: { x: 150, y: 150 }, handleOut: { x: -55.22847, y: 0 } },{ point: { x: 50, y: 100 }, handleIn: { x: 0, y: 27.61424 } },{ point: { x: 50, y: 100 }, handleOut: { x: 0, y: -27.61424 } },{ point: { x: 150, y: 50 }, handleIn: { x: -55.22847, y: 0 } },{ point: { x: 150, y: 50 }, handleOut: { x: 55.22847, y: 0 } },{ point: { x: 250, y: 100 }, handleIn: { x: 0, y: -27.61424 } },{ point: { x: 250, y: 100 }, handleOut: { x: 0, y: 27.61424 } },{ point: { x: 150, y: 150 }, handleIn: { x: 55.22847, y: 0 } }');
});

test('new Path.Arc(from, through, to)', function() {
    var path = new Path.Arc([0, 20], [75, 75], [100, 0]);
    equals(path.segments.toString(), '{ point: { x: 0, y: 20 }, handleOut: { x: -2.62559, y: 23.01251 } },{ point: { x: 30.89325, y: 74.75812 }, handleIn: { x: -21.05455, y: -9.65273 }, handleOut: { x: 21.05455, y: 9.65273 } },{ point: { x: 92.54397, y: 62.42797 }, handleIn: { x: -15.72238, y: 17.00811 }, handleOut: { x: 15.72238, y: -17.00811 } },{ point: { x: 100, y: 0 }, handleIn: { x: 11.27458, y: 20.23247 } }');
});

test('new Path.Arc({ from: from, through: through, to: to })', function() {
    var path = new Path.Arc({ from: [0, 20], through: [75, 75], to: [100, 0]});
    equals(path.segments.toString(), '{ point: { x: 0, y: 20 }, handleOut: { x: -2.62559, y: 23.01251 } },{ point: { x: 30.89325, y: 74.75812 }, handleIn: { x: -21.05455, y: -9.65273 }, handleOut: { x: 21.05455, y: 9.65273 } },{ point: { x: 92.54397, y: 62.42797 }, handleIn: { x: -15.72238, y: 17.00811 }, handleOut: { x: 15.72238, y: -17.00811 } },{ point: { x: 100, y: 0 }, handleIn: { x: 11.27458, y: 20.23247 } }');
});

test('new Path.RegularPolygon(center, sides, radius)', function() {
    var path = new Path.RegularPolygon(new Point(50, 50), 3, 10);
    equals(path.segments.toString(), '{ point: { x: 41.33975, y: 55 } },{ point: { x: 50, y: 40 } },{ point: { x: 58.66025, y: 55 } }');

    var path = new Path.RegularPolygon(new Point(250, 250), 10, 100);
    equals(path.segments.toString(), '{ point: { x: 219.0983, y: 345.10565 } },{ point: { x: 169.0983, y: 308.77853 } },{ point: { x: 150, y: 250 } },{ point: { x: 169.0983, y: 191.22147 } },{ point: { x: 219.0983, y: 154.89435 } },{ point: { x: 280.9017, y: 154.89435 } },{ point: { x: 330.9017, y: 191.22147 } },{ point: { x: 350, y: 250 } },{ point: { x: 330.9017, y: 308.77853 } },{ point: { x: 280.9017, y: 345.10565 } }');
});

test('new Path.RegularPolygon({ center: center, sides: sides, radius: radius })', function() {
    var path = new Path.RegularPolygon({center: new Point(50, 50), sides: 3, radius: 10});
    equals(path.segments.toString(), '{ point: { x: 41.33975, y: 55 } },{ point: { x: 50, y: 40 } },{ point: { x: 58.66025, y: 55 } }');

    var path = new Path.RegularPolygon({center: new Point(250, 250), sides: 10, radius: 100});
    equals(path.segments.toString(), '{ point: { x: 219.0983, y: 345.10565 } },{ point: { x: 169.0983, y: 308.77853 } },{ point: { x: 150, y: 250 } },{ point: { x: 169.0983, y: 191.22147 } },{ point: { x: 219.0983, y: 154.89435 } },{ point: { x: 280.9017, y: 154.89435 } },{ point: { x: 330.9017, y: 191.22147 } },{ point: { x: 350, y: 250 } },{ point: { x: 330.9017, y: 308.77853 } },{ point: { x: 280.9017, y: 345.10565 } }');
});


test('new Path.Star(center, points, radius1, radius2)', function() {
    var path = new Path.Star(new Point(100, 100), 10, 10, 20);
    equals(path.segments.toString(), '{ point: { x: 100, y: 90 } },{ point: { x: 106.18034, y: 80.97887 } },{ point: { x: 105.87785, y: 91.90983 } },{ point: { x: 116.18034, y: 88.24429 } },{ point: { x: 109.51057, y: 96.90983 } },{ point: { x: 120, y: 100 } },{ point: { x: 109.51057, y: 103.09017 } },{ point: { x: 116.18034, y: 111.75571 } },{ point: { x: 105.87785, y: 108.09017 } },{ point: { x: 106.18034, y: 119.02113 } },{ point: { x: 100, y: 110 } },{ point: { x: 93.81966, y: 119.02113 } },{ point: { x: 94.12215, y: 108.09017 } },{ point: { x: 83.81966, y: 111.75571 } },{ point: { x: 90.48943, y: 103.09017 } },{ point: { x: 80, y: 100 } },{ point: { x: 90.48943, y: 96.90983 } },{ point: { x: 83.81966, y: 88.24429 } },{ point: { x: 94.12215, y: 91.90983 } },{ point: { x: 93.81966, y: 80.97887 } }');

    var path = new Path.Star(new Point(100, 100), 5, 20, 10);
    equals(path.segments.toString(), '{ point: { x: 100, y: 80 } },{ point: { x: 105.87785, y: 91.90983 } },{ point: { x: 119.02113, y: 93.81966 } },{ point: { x: 109.51057, y: 103.09017 } },{ point: { x: 111.75571, y: 116.18034 } },{ point: { x: 100, y: 110 } },{ point: { x: 88.24429, y: 116.18034 } },{ point: { x: 90.48943, y: 103.09017 } },{ point: { x: 80.97887, y: 93.81966 } },{ point: { x: 94.12215, y: 91.90983 } }');
});

test('new Path.Star({ center: center, points: points, radius1: radius1, radius2: radius2 })', function() {
    var path = new Path.Star({
        center: new Point(100, 100),
        points: 10,
        radius1: 10,
        radius2: 20
    });
    equals(path.segments.toString(), '{ point: { x: 100, y: 90 } },{ point: { x: 106.18034, y: 80.97887 } },{ point: { x: 105.87785, y: 91.90983 } },{ point: { x: 116.18034, y: 88.24429 } },{ point: { x: 109.51057, y: 96.90983 } },{ point: { x: 120, y: 100 } },{ point: { x: 109.51057, y: 103.09017 } },{ point: { x: 116.18034, y: 111.75571 } },{ point: { x: 105.87785, y: 108.09017 } },{ point: { x: 106.18034, y: 119.02113 } },{ point: { x: 100, y: 110 } },{ point: { x: 93.81966, y: 119.02113 } },{ point: { x: 94.12215, y: 108.09017 } },{ point: { x: 83.81966, y: 111.75571 } },{ point: { x: 90.48943, y: 103.09017 } },{ point: { x: 80, y: 100 } },{ point: { x: 90.48943, y: 96.90983 } },{ point: { x: 83.81966, y: 88.24429 } },{ point: { x: 94.12215, y: 91.90983 } },{ point: { x: 93.81966, y: 80.97887 } }');

    var path = new Path.Star({
        center: new Point(100, 100),
        points: 5,
        radius1: 20,
        radius2: 10
    });
    equals(path.segments.toString(), '{ point: { x: 100, y: 80 } },{ point: { x: 105.87785, y: 91.90983 } },{ point: { x: 119.02113, y: 93.81966 } },{ point: { x: 109.51057, y: 103.09017 } },{ point: { x: 111.75571, y: 116.18034 } },{ point: { x: 100, y: 110 } },{ point: { x: 88.24429, y: 116.18034 } },{ point: { x: 90.48943, y: 103.09017 } },{ point: { x: 80.97887, y: 93.81966 } },{ point: { x: 94.12215, y: 91.90983 } }');
});

test('new Path.Line(from, to)', function() {
    var path = new Path.Line([20, 20], [40, 40]);
    equals(path.segments.toString(), '{ point: { x: 20, y: 20 } },{ point: { x: 40, y: 40 } }');
});

test('new Path.Line({ from: from, to: to })', function() {
    var path = new Path.Line({
        from: [20, 20],
        to: [40, 40]
    });
    equals(path.segments.toString(), '{ point: { x: 20, y: 20 } },{ point: { x: 40, y: 40 } }');
});

test('new Path.Line({ insert: false })', function() {
    var path = new Path.Line({
        from:[50, 50],
        to:[100, 100],
        insert: false
    });
    equals(function() {
        return typeof path.insert;
    }, 'function');
    equals(function() {
        return path.parent;
    }, null);
    equals(function() {
        return path.isInserted();
    }, false);
});
