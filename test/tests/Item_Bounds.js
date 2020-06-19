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

QUnit.module('Item Bounds');

test('item.bounds caching', function() {
    var circle = new Path.Circle(new Point(100, 100), 50);
    var rectangle = new Path.Rectangle(new Point(75, 75), new Point(175, 175));
    var group = new Group([circle, rectangle]);
    equals(group.bounds, new Rectangle(50, 50, 125, 125), 'group.bounds');
    rectangle.remove();
    equals(function() {
        return group.children.length;
    }, 1);
    equals(group.bounds, new Rectangle(50, 50, 100, 100), 'group.bounds without rectangle');
    group.addChild(rectangle);
    equals(function() {
        return group.children.length;
    }, 2);
    equals(group.bounds, new Rectangle(50, 50, 125, 125), 'group.bounds with rectangle');
    circle.remove();
    equals(function() {
        return group.children.length;
    }, 1);
    equals(group.bounds, new Rectangle(75, 75, 100, 100), 'group.bounds without circle');
    group.addChild(circle);
    equals(function() {
        return group.children.length;
    }, 2);
    equals(group.bounds, new Rectangle(50, 50, 125, 125), 'group.bounds with circle');
});

test('group.bounds when group contains empty group', function() {
    var group = new Group();
    var rectangle = new Path.Rectangle(new Point(75, 75), new Point(175, 175));
    group.addChild(rectangle);
    equals(group.bounds, new Rectangle(75, 75, 100, 100), 'group.bounds without empty group');
    group.addChild(new Group());
    equals(group.bounds, new Rectangle(75, 75, 100, 100), 'group.bounds with empty group');
});

test('group.bounds and position after children were modified', function() {
    var group = new Group();
    var rectangle = new Path.Rectangle(new Point(100, 100), new Point(200, 200));
    group.addChild(rectangle);
    equals(group.bounds, new Rectangle(100, 100, 100, 100), 'group.bounds before change');
    equals(group.position, new Point(150, 150), 'group.position before change');
    rectangle.firstSegment.point = [0, 0];
    equals(group.bounds, new Rectangle(0, 0, 200, 200), 'group.bounds after change');
    equals(group.position, new Point(100, 100), 'group.position after change');
});

test('group.bounds when containing empty path first', function() {
    var group = new Group();
    var path = new Path();
    group.addChild(path);
    equals(group.bounds, new Rectangle(0, 0, 0, 0), 'group.bounds with empty path');
    path.moveTo([75, 75]);
    path.lineTo([175, 175]);
    equals(group.bounds, new Rectangle(75, 75, 100, 100), 'group.bounds after adding segments to path');
});

test('path.bounds when contained in a transformed group', function() {
    var path = new Path([10, 10], [60, 60]);
    var group = new Group([path]);
    equals(path.bounds, new Rectangle(10, 10, 50, 50), 'path.bounds before group translation');
    group.translate(100, 100);
    equals(path.bounds, new Rectangle(110, 110, 50, 50), 'path.bounds after group translation');
});

test('shape.strokeBounds when scaled without strokeScaling', function(){
    var shape = new Shape.Rectangle({
        point: [5, 5],
        size: [20, 20],
        strokeScaling: false,
        strokeColor: 'black',
        strokeWidth: 10
    });
    equals(shape.strokeBounds, new Rectangle(0, 0, 30, 30), 'shape.strokeBounds before scaling');
    shape.scale(2, 2, [5, 5]);
    equals(shape.strokeBounds, new Rectangle(0, 0, 50, 50), 'shape.strokeBounds after scaling');
    shape.strokeScaling = true;
    equals(shape.strokeBounds, new Rectangle(-5, -5, 60, 60), 'shape.strokeBounds after enabling strokeScaling');
});

test('text.bounds', function() {
    var text = new PointText({
        fontFamily: 'Arial, Helvetica',
        fontSize: 14,
        fillColor: 'black',
        point: [50, 100],
        content: 'Hello World!'
    });
    equals(text.bounds, new Rectangle(50, 87.4, 76.25, 16.8), 'text.bounds', { tolerance: 1.0 });
});

test('path.bounds', function() {
    var path = new Path([
        new Segment(new Point(121, 334), new Point(-19, 38), new Point(30.7666015625, -61.53369140625)),
        new Segment(new Point(248, 320), new Point(-42, -74), new Point(42, 74)),
        new Segment(new Point(205, 420.94482421875), new Point(66.7890625, -12.72802734375), new Point(-79, 15.05517578125))
    ]);
    // Test both closed and open paths, as the bounds for them differ
    path.closed = false;
    equals(path.bounds,
            new Rectangle(121, 275.068, 149.49305, 145.87682),
            'open path.bounds');
    equals(path.position,
            new Point(195.74653, 348.00641),
            'open path.position');

    // Test both closed and open paths, as the bounds for them differ
    path.closed = true;
    equals(path.bounds,
            new Rectangle(114.82725, 275.068, 155.6658, 148.12773),
            'closed path.bounds');
    equals(path.position,
            new Point(192.66015, 349.13186),
            'closed path.position');

    // Scale the path by 0.5 and check bounds
    path.scale(0.5);
    equals(path.bounds,
            new Rectangle(153.7437, 312.09993, 77.8329, 74.06386),
            'scaled path.bounds');

    // Move the path to another position and check bounds
    path.position = [100, 100];
    equals(path.bounds,
            new Rectangle(61.08355, 62.96807, 77.8329, 74.06386),
            'moved path.bounds');

    // Set new bounds and check segment list as result of resizing / positioning
    path.bounds = { x: 100, y: 100, width: 200, height: 200 };
    equals(path.segments.toString(),
            '{ point: { x: 107.93077, y: 179.56917 }, handleIn: { x: -24.41127, y: 51.30707 }, handleOut: { x: 39.52904, y: -83.08194 } },{ point: { x: 271.10084, y: 160.66656 }, handleIn: { x: -53.96176, y: -99.91377 }, handleOut: { x: 53.96176, y: 99.91377 } },{ point: { x: 215.85428, y: 296.96086 }, handleIn: { x: 85.81084, y: -17.18521 }, handleOut: { x: -101.49949, y: 20.32729 } }',
            'resized path.segments');

    // Now rotate by 40 degrees and test bounds and segments again.
    path.rotate(40);
    equals(path.bounds,
            new Rectangle(92.38102, 106.78972, 191.48071, 203.66876),
            'rotated path.bounds');

    equals(path.segments.toString(),
            '{ point: { x: 142.60356, y: 125.16811 }, handleIn: { x: -51.67967, y: 23.61224 }, handleOut: { x: 83.68504, y: -38.23568 } },{ point: { x: 279.74945, y: 215.57158 }, handleIn: { x: 22.88623, y: -111.22434 }, handleOut: { x: -22.88623, y: 111.22434 } },{ point: { x: 149.81984, y: 284.46726 }, handleIn: { x: 76.78135, y: 41.99351 }, handleOut: { x: -90.81925, y: -49.67101 } }',
            'roated path.segments');
});

test('path.strokeBounds on path without stroke', function() {
    var path = new Path([
        new Segment(new Point(121, 334), new Point(-19, 38), new Point(30.7666015625, -61.53369140625)),
        new Segment(new Point(248, 320), new Point(-42, -74), new Point(42, 74)),
        new Segment(new Point(205, 420.94482421875), new Point(66.7890625, -12.72802734375), new Point(-79, 15.05517578125))
    ]);
    equals(path.strokeBounds, new Rectangle(121, 275.068, 149.49305, 145.87682));
});

test('path.strokeBounds on path with single segment and stroke color', function() {
    var path = new Path([
        new Segment(new Point(121, 334), new Point(-19, 38), new Point(30.7666015625, -61.53369140625))
    ]);
    path.strokeColor = 'black';
    equals(path.strokeBounds, new Rectangle(121, 334, 0, 0));
});

test('path.strokeBounds on closed path with single segment and stroke color', function() {
    var path = new Path([
        new Segment(new Point(121, 334), new Point(19, 38), new Point(30.7666015625, -61.53369140625))
    ]);
    path.strokeColor = 'black';
    path.closed = true;
    equals(path.strokeBounds, new Rectangle(120.44098, 312.88324 , 19.97544, 30.53977));
});

test('path.strokeBounds with corners and miter limit', function() {
    var path = new Path({
        pathData: 'M47,385c120,-100 120,-100 400,-40c-280,140 -280,140 -400,40z',
        strokeWidth: 5,
        strokeJoin: 'miter',
        strokeColor: 'black'
    });
    equals(path.strokeBounds, new Rectangle(43.09488, 301.5525, 411.3977, 156.57543));
});

test('path.bounds & path.strokeBounds with stroke styles', function() {
    function makePath() {
        var path = new Path();
        path.moveTo(200, 50);
        path.lineTo(230, 100);
        path.lineTo(250, 50);
        path.lineTo(280, 110);
        path.arcTo([250, 20], false);
        path.rotate(-5);
        path.strokeWidth = 30;
        path.miterLimit = 3;
        return path;
    }

    var path = makePath();
    path.strokeColor = 'black';
    path.strokeCap = 'butt';
    path.strokeJoin = 'round';
    equals(path.bounds,
            new Rectangle(199.01325, 16.78419, 113.50622, 90.96766),
            'butt/round path.bounds');
    equals(path.strokeBounds,
            new Rectangle(186.87242, 1.78419, 140.64705, 120.96766),
            'butt/round path.strokeBounds');

    var path = makePath().translate(150, 0);
    path.strokeColor = 'black';
    path.strokeCap = 'butt';
    path.strokeJoin = 'bevel';
    equals(path.bounds,
            new Rectangle(349.01325, 16.78419, 113.50622, 90.96766),
            'butt/bevel path.bounds');
    equals(path.strokeBounds,
            new Rectangle(336.87242, 1.78419, 140.64705, 119.73034),
            'butt/bevel path.strokeBounds');

    var path = makePath().translate(300, 0);
    path.strokeColor = 'black';
    path.strokeCap = 'butt';
    path.strokeJoin = 'miter';
    equals(path.bounds,
            new Rectangle(499.01325, 16.78419, 113.50622, 90.96766),
            'butt/miter path.bounds');
    equals(path.strokeBounds,
            new Rectangle(486.87242, 1.78419, 140.64705, 133.64882),
            'butt/miter path.strokeBounds');

    var path = makePath().translate(0, 150);
    path.strokeColor = 'black';
    path.strokeCap = 'square';
    path.strokeJoin = 'round';
    equals(path.bounds,
            new Rectangle(199.01325, 166.78419, 113.50622, 90.96766),
            'square/round path.bounds');
    equals(path.strokeBounds,
            new Rectangle(178.06332, 151.78419, 149.45615, 120.96766),
            'square/strokeBounds path.bounds');

    var path = makePath().translate(150, 150);
    path.strokeColor = 'black';
    path.strokeCap = 'square';
    path.strokeJoin = 'bevel';
    equals(path.bounds,
            new Rectangle(349.01325, 166.78419, 113.50622, 90.96766),
            'square/bevel path.bounds');
    equals(path.strokeBounds,
            new Rectangle(328.06332, 151.78419, 149.45615, 119.73034),
            'square/bevel path.strokeBounds');

    var path = makePath().translate(300, 150);
    path.strokeColor = 'black';
    path.strokeCap = 'square';
    path.strokeJoin = 'miter';
    equals(path.bounds,
            new Rectangle(499.01325, 166.78419, 113.50622, 90.96766),
            'square/miter path.bounds');
    equals(path.strokeBounds,
            new Rectangle(478.06332, 151.78419, 149.45615, 133.64882),
            'square/miter path.strokeBounds');

    var path = makePath().translate(0, 300);
    path.strokeColor = 'black';
    path.strokeCap = 'round';
    path.strokeJoin = 'round';
    equals(path.bounds,
            new Rectangle(199.01325, 316.78419, 113.50622, 90.96766),
            'round/round path.bounds');
    equals(path.strokeBounds,
            new Rectangle(184.01325, 301.78419, 143.50622, 120.96766),
            'round/round path.strokeBounds');

    var path = makePath().translate(150, 300);
    path.strokeColor = 'black';
    path.strokeCap = 'round';
    path.strokeJoin = 'bevel';
    equals(path.bounds,
            new Rectangle(349.01325, 316.78419, 113.50622, 90.96766),
            'round/bevel path.bounds');
    equals(path.strokeBounds,
            new Rectangle(334.01325, 301.78419, 143.50622, 119.73034),
            'round/bevel path.strokeBounds');

    var path = makePath().translate(300, 300);
    path.strokeColor = 'black';
    path.strokeCap = 'round';
    path.strokeJoin = 'miter';
    equals(path.bounds,
            new Rectangle(499.01325, 316.78419, 113.50622, 90.96766),
            'round/miter path.bounds');
    equals(path.strokeBounds,
            new Rectangle(484.01325, 301.78419, 143.50622, 133.64882),
            'round/miter path.strokeBounds');
});

test('path.strokeBounds with rectangles', function() {
    var path = new paper.Path.Rectangle({
        point: [100, 100],
        size: [100, 100],
        strokeWidth: 50,
        strokeColor: 'black'
    });
    equals(path.strokeBounds,
            new Rectangle(75, 75, 150, 150),
            'path.strokeBounds');
});

test('path.strokeBounds without strokeScaling and zoomed view', function() {
    var path = new Path.Circle({
        center: [0, 0],
        radius: 100,
        strokeColor: 'black',
        strokeWidth: 15,
        strokeScaling: false
    });

    view.zoom = 2;

    equals(path.strokeBounds,
            new Rectangle(-103.75, -103.75, 207.5, 207.5),
            'path.strokeBounds with zoomed view');

    view.zoom = 1;

    equals(path.strokeBounds,
            new Rectangle(-107.5, -107.5, 215, 215),
            'path.strokeBounds without zoomed view');
});

test('shape.strokeBounds without strokeScaling and zoomed view', function() {
    var path = new Shape.Circle({
        center: [0, 0],
        radius: 100,
        strokeColor: 'black',
        strokeWidth: 15,
        strokeScaling: false
    });

    view.zoom = 2;

    equals(path.strokeBounds,
            new Rectangle(-103.75, -103.75, 207.5, 207.5),
            'path.strokeBounds with zoomed view');

    view.zoom = 1;

    equals(path.strokeBounds,
            new Rectangle(-107.5, -107.5, 215, 215),
            'path.strokeBounds without zoomed view');
});


test('path.bounds', function() {
    var path = new Path([
        new Segment(new Point(121, 334), new Point(-19, 38), new Point(30.7666015625, -61.53369140625)),
        new Segment(new Point(248, 320), new Point(-42, -74), new Point(42, 74)),
        new Segment(new Point(205, 420.94482421875), new Point(66.7890625, -12.72802734375), new Point(-79, 15.05517578125))
    ]);
    // Test both closed and open paths, as the bounds for them differ
    path.closed = false;
    equals(path.bounds,
            new Rectangle(121, 275.068, 149.49305, 145.87682),
            'open path.bounds');
    equals(path.position,
            new Point(195.74653, 348.00641),
            'open path.position');

    // Test both closed and open paths, as the bounds for them differ
    path.closed = true;
    equals(path.bounds,
            new Rectangle(114.82725, 275.068, 155.6658, 148.12773),
            'closed path.bounds');
    equals(path.position,
            new Point(192.66015, 349.13186),
            'closed path.position');

    // Scale the path by 0.5 and check bounds
    path.scale(0.5);
    equals(path.bounds,
            new Rectangle(153.7437, 312.09993, 77.8329, 74.06386),
            'scaled path.bounds');

    // Move the path to another position and check bounds
    path.position = [100, 100];
    equals(path.bounds,
            new Rectangle(61.08355, 62.96807, 77.8329, 74.06386),
            'moved path.bounds');

    // Set new bounds and check segment list as result of resizing / positioning
    path.bounds = { x: 100, y: 100, width: 200, height: 200 };
    equals(path.segments.toString(),
            '{ point: { x: 107.93077, y: 179.56917 }, handleIn: { x: -24.41127, y: 51.30707 }, handleOut: { x: 39.52904, y: -83.08194 } },{ point: { x: 271.10084, y: 160.66656 }, handleIn: { x: -53.96176, y: -99.91377 }, handleOut: { x: 53.96176, y: 99.91377 } },{ point: { x: 215.85428, y: 296.96086 }, handleIn: { x: 85.81084, y: -17.18521 }, handleOut: { x: -101.49949, y: 20.32729 } }',
            'resized path.segments');

    // Now rotate by 40 degrees and test bounds and segments again.
    path.rotate(40);
    equals(path.bounds,
            new Rectangle(92.38102, 106.78972, 191.48071, 203.66876),
            'rotated path.bounds');

    equals(path.segments.toString(),
            '{ point: { x: 142.60356, y: 125.16811 }, handleIn: { x: -51.67967, y: 23.61224 }, handleOut: { x: 83.68504, y: -38.23568 } },{ point: { x: 279.74945, y: 215.57158 }, handleIn: { x: 22.88623, y: -111.22434 }, handleOut: { x: -22.88623, y: 111.22434 } },{ point: { x: 149.81984, y: 284.46726 }, handleIn: { x: 76.78135, y: 41.99351 }, handleOut: { x: -90.81925, y: -49.67101 } }',
            'roated path.segments');
});

test('path.strokeBounds on path without stroke', function() {
    var path = new Path([
        new Segment(new Point(121, 334), new Point(-19, 38), new Point(30.7666015625, -61.53369140625)),
        new Segment(new Point(248, 320), new Point(-42, -74), new Point(42, 74)),
        new Segment(new Point(205, 420.94482421875), new Point(66.7890625, -12.72802734375), new Point(-79, 15.05517578125))
    ]);
    equals(path.strokeBounds, new Rectangle(121, 275.068, 149.49305, 145.87682));
});

test('path.strokeBounds on path with single segment and stroke color', function() {
    var path = new Path([
        new Segment(new Point(121, 334), new Point(-19, 38), new Point(30.7666015625, -61.53369140625))
    ]);
    path.strokeColor = 'black';
    equals(path.strokeBounds, new Rectangle(121, 334, 0, 0));
});

test('path.strokeBounds on closed path with single segment and stroke color', function() {
    var path = new Path([
        new Segment(new Point(121, 334), new Point(19, 38), new Point(30.7666015625, -61.53369140625))
    ]);
    path.strokeColor = 'black';
    path.closed = true;
    equals(path.strokeBounds, new Rectangle(120.44098, 312.88324 , 19.97544, 30.53977));
});

test('path.strokeBounds with corners and miter limit', function() {
    var path = new Path({
        pathData: 'M47,385c120,-100 120,-100 400,-40c-280,140 -280,140 -400,40z',
        strokeWidth: 5,
        strokeJoin: 'miter',
        strokeColor: 'black'
    });
    equals(path.strokeBounds, new Rectangle(43.09488, 301.5525, 411.3977, 156.57543));
});

test('path.bounds & path.strokeBounds with stroke styles', function() {
    function makePath() {
        var path = new Path();
        path.moveTo(200, 50);
        path.lineTo(230, 100);
        path.lineTo(250, 50);
        path.lineTo(280, 110);
        path.arcTo([250, 20], false);
        path.rotate(-5);
        path.strokeWidth = 30;
        path.miterLimit = 3;
        return path;
    }

    var path = makePath();
    path.fullySelected = true;
    path.strokeColor = 'black';
    path.strokeCap = 'butt';
    path.strokeJoin = 'round';
    equals(path.bounds,
            new Rectangle(199.01325, 16.78419, 113.50622, 90.96766),
            'butt/round path.bounds');
    equals(path.strokeBounds,
            new Rectangle(186.87242, 1.78419, 140.64705, 120.96766),
            'butt/round path.strokeBounds');

    var path = makePath().translate(150, 0);
    path.strokeColor = 'black';
    path.strokeCap = 'butt';
    path.strokeJoin = 'bevel';
    equals(path.bounds,
            new Rectangle(349.01325, 16.78419, 113.50622, 90.96766),
            'butt/bevel path.bounds');
    equals(path.strokeBounds,
            new Rectangle(336.87242, 1.78419, 140.64705, 119.73034),
            'butt/bevel path.strokeBounds');

    var path = makePath().translate(300, 0);
    path.strokeColor = 'black';
    path.strokeCap = 'butt';
    path.strokeJoin = 'miter';
    equals(path.bounds,
            new Rectangle(499.01325, 16.78419, 113.50622, 90.96766),
            'butt/miter path.bounds');
    equals(path.strokeBounds,
            new Rectangle(486.87242, 1.78419, 140.64705, 133.64882),
            'butt/miter path.strokeBounds');

    var path = makePath().translate(0, 150);
    path.strokeColor = 'black';
    path.strokeCap = 'square';
    path.strokeJoin = 'round';
    equals(path.bounds,
            new Rectangle(199.01325, 166.78419, 113.50622, 90.96766),
            'square/round path.bounds');
    equals(path.strokeBounds,
            new Rectangle(178.06332, 151.78419, 149.45615, 120.96766),
            'square/strokeBounds path.bounds');

    var path = makePath().translate(150, 150);
    path.strokeColor = 'black';
    path.strokeCap = 'square';
    path.strokeJoin = 'bevel';
    equals(path.bounds,
            new Rectangle(349.01325, 166.78419, 113.50622, 90.96766),
            'square/bevel path.bounds');
    equals(path.strokeBounds,
            new Rectangle(328.06332, 151.78419, 149.45615, 119.73034),
            'square/bevel path.strokeBounds');

    var path = makePath().translate(300, 150);
    path.strokeColor = 'black';
    path.strokeCap = 'square';
    path.strokeJoin = 'miter';
    equals(path.bounds,
            new Rectangle(499.01325, 166.78419, 113.50622, 90.96766),
            'square/miter path.bounds');
    equals(path.strokeBounds,
            new Rectangle(478.06332, 151.78419, 149.45615, 133.64882),
            'square/miter path.strokeBounds');

    var path = makePath().translate(0, 300);
    path.strokeColor = 'black';
    path.strokeCap = 'round';
    path.strokeJoin = 'round';
    equals(path.bounds,
            new Rectangle(199.01325, 316.78419, 113.50622, 90.96766),
            'round/round path.bounds');
    equals(path.strokeBounds,
            new Rectangle(184.01325, 301.78419, 143.50622, 120.96766),
            'round/round path.strokeBounds');

    var path = makePath().translate(150, 300);
    path.strokeColor = 'black';
    path.strokeCap = 'round';
    path.strokeJoin = 'bevel';
    equals(path.bounds,
            new Rectangle(349.01325, 316.78419, 113.50622, 90.96766),
            'round/bevel path.bounds');
    equals(path.strokeBounds,
            new Rectangle(334.01325, 301.78419, 143.50622, 119.73034),
            'round/bevel path.strokeBounds');

    var path = makePath().translate(300, 300);
    path.strokeColor = 'black';
    path.strokeCap = 'round';
    path.strokeJoin = 'miter';
    equals(path.bounds,
            new Rectangle(499.01325, 316.78419, 113.50622, 90.96766),
            'round/miter path.bounds');
    equals(path.strokeBounds,
            new Rectangle(484.01325, 301.78419, 143.50622, 133.64882),
            'round/miter path.strokeBounds');
});

test('path.strokeBounds with rectangles', function() {
    var path = new paper.Path.Rectangle({
        point: [100, 100],
        size: [100, 100],
        strokeWidth: 50,
        strokeColor: 'black'
    });
    equals(path.strokeBounds,
            new Rectangle(75, 75, 150, 150),
            'path.strokeBounds');
});

test('path.strokeBounds without strokeScaling and zoomed view', function() {
    var path = new Path.Circle({
        center: [0, 0],
        radius: 100,
        strokeColor: 'black',
        strokeWidth: 20,
        strokeScaling: false,
        applyMatrix: false
    });

    view.zoom = 2;

    equals(path.strokeBounds, new Rectangle(-105, -105, 210, 210),
            'path.strokeBounds with zoomed view');

    view.zoom = 1;

    equals(path.strokeBounds, new Rectangle(-110, -110, 220, 220),
            'path.strokeBounds without zoomed view');

    path.scale(0.5, 1);

    view.zoom = 2;

    // Internal stroke bounds need to apply stroke deformation with
    // strokeScaling:
    equals(path.getBounds({ internal: true, stroke: true }),
            new Rectangle(-110, -105, 220, 210),
            'path.getBounds({ internal: true, stroke: true })'
                + ' with path.applyMatrix = false, path.scale(0.5, 1);');

    path.applyMatrix = true;

    equals(path.getBounds({ internal: true, stroke: true }),
            new Rectangle(-55, -105, 110, 210),
            'path.getBounds({ internal: true, stroke: true })'
                + ' with path.applyMatrix = true, path.scale(0.5, 1);');
});

test('shape.strokeBounds without strokeScaling and zoomed view', function() {
    var shape = new Shape.Circle({
        center: [0, 0],
        radius: 100,
        strokeColor: 'black',
        strokeWidth: 20,
        strokeScaling: false
    });

    view.zoom = 2;

    equals(shape.strokeBounds, new Rectangle(-105, -105, 210, 210),
            'shape.strokeBounds with zoomed view');

    view.zoom = 1;

    equals(shape.strokeBounds, new Rectangle(-110, -110, 220, 220),
            'shape.strokeBounds without zoomed view');

    shape.scale(0.5, 1);

    view.zoom = 2;

    // Internal stroke bounds need to apply stroke deformation with
    // strokeScaling:
    equals(shape.getBounds({ internal: true, stroke: true }),
            new Rectangle(-110, -105, 220, 210),
            'shape.getBounds({ internal: true, stroke: true })'
                + ' with shape.scale(0.5, 1);');
});

test('path.internalBounds', function() {
    // To test for a strange strokeBounds regression caused by commit
    // 1ac8e46d55643f663e439d2cb5d05a40fc68d011

    var path = new Path.Circle({
        center: [0, 0],
        radius: 100
    });

    equals(path.internalBounds, new Rectangle(-100, -100, 200, 200),
            'path.internalBounds');

    path.rotate(45);

    equals(path.internalBounds, new Rectangle(-100, -100, 200, 200),
            'path.internalBounds');
});

test('compoundPath.strokeBounds', function() {
    // #1021:
    var data = {
        pathData: 'M150 0 L75 200 L225 200 Z',
        fillColor: 'blue',
        strokeColor: 'red',
        strokeWidth: 20
    };
    var path = new Path(data);
    var compoundPath = new CompoundPath(data);
    var bounds = new Rectangle(75, 0, 150, 200);
    var strokeBounds = new Rectangle(60.57, -28.48001, 178.86001, 238.48001);
    equals(function() { return compoundPath.bounds; }, bounds);
    equals(function() { return compoundPath.strokeBounds; }, strokeBounds);
    equals(function() { return path.bounds; }, bounds);
    equals(function() { return path.strokeBounds; }, strokeBounds);
});

test('path.strokeBounds with applyMatrix disabled', function() {
    var path = new Path.Rectangle({
        applyMatrix: true,
        point: [10, 10],
        size: [20, 20],
        strokeScaling: true,
        strokeColor: 'red',
        strokeWidth: 10
    });
    equals(path.strokeBounds, new Rectangle(5, 5, 30, 30),
            'path.strokeBounds, applyMatrix enabled');
    path.applyMatrix = false;
    equals(path.strokeBounds, new Rectangle(5, 5, 30, 30),
            'path.strokeBounds, applyMatrix disabled');
    path.scale([4, 2], [0, 0]);
    var expected = new Rectangle(20, 10, 120, 60);
    equals(path.strokeBounds, expected,
            'path.strokeBounds after scaling, applyMatrix disabled');
    function testHitResult() {
        // Hit-testing needs to handle applyMatrix disabled with stroke scaling,
        // even when hit-testing on "distorted" stroke joins:
        var hitResult = path.hitTest(expected.topLeft);
        equals(function() { return hitResult && hitResult.type == 'stroke'; }, true);
        equals(function() { return hitResult && hitResult.item == path; }, true);
        // Test a little bit outside the bounds, and the stroke hit-test on the
        // join should return null:
        var hitResult = path.hitTest(expected.topLeft.subtract(1e-3));
        equals(function() { return hitResult == null; }, true);
    }
    testHitResult();
    path.applyMatrix = true;
    expected = new Rectangle(35, 15, 90, 50);
    equals(path.strokeBounds, expected,
            'path.strokeBounds after scaling, applyMatrix enabled');
    testHitResult();
});

test('path.strokeBounds with applyMatrix enabled', function() {
    var path = new Path.Rectangle({
        applyMatrix: false,
        point: [10, 10],
        size: [20, 20],
        strokeScaling: true,
        strokeColor: 'red',
        strokeWidth: 10
    });
    path.scale([4, 2], [0, 0]);
    equals(path.strokeBounds, new Rectangle(20, 10, 120, 60),
            'path.strokeBounds after scaling, applyMatrix disabled');
    path.applyMatrix = true;
    equals(path.strokeBounds, new Rectangle(35, 15, 90, 50),
            'path.strokeBounds after scaling, applyMatrix enabled');

});

test('symbolItem.bounds with strokeScaling disabled', function() {
    var path = new Path.Rectangle({
        size: [20, 20],
        strokeWidth: 10,
        strokeColor: 'red',
        strokeScaling: false
    });
    var symbol = new SymbolDefinition(path);
    var placed = symbol.place([100, 100]);
    equals(placed.bounds, new Rectangle(85, 85, 30, 30), 'placed.bounds');
    placed.scale(4, 2);
    equals(placed.bounds, new Rectangle(55, 75, 90, 50),
            'placed.bounds after scaling');
    path.strokeScaling = true;
    equals(placed.bounds, new Rectangle(40, 70, 120, 60),
            'placed.bounds after scaling, strokeScaling enabled');
});

test('item.visible and item.parents.bounds (#1248)', function() {
    var item = new Path.Rectangle({
       point: [0, 0],
       size: [50, 100],
       visible: false
    });
    equals(item.bounds, new Rectangle(0, 0, 50, 100), 'item.bounds');
    equals(item.parent.bounds, new Rectangle(0, 0, 0, 0),
            'item.parent.bounds with item.visible = false');
    item.visible = true;
    equals(item.parent.bounds, item.bounds,
            'item.parent.bounds with item.visible = true');
});

test('group.internalBounds with child and child.applyMatrix = false (#1250)', function() {
    var item1 = Shape.Rectangle({
        point: [100, 100],
        size: [200, 200]
    });
    var item2 = new Path.Rectangle({
        point: [0, 0],
        size: [100, 100]
    });
    var group = new Group([item1, item2]);
    equals(item1.bounds, new Rectangle(100, 100, 200, 200), 'item.bounds');
    equals(group.internalBounds, new Rectangle(0, 0, 300, 300),
            'group.internalBounds before scaling item1');
    item1.scale(0.5);
    equals(group.internalBounds, new Rectangle(0, 0, 250, 250),
            'group.internalBounds after scaling item1');
});

test('item._globalMatrix on item after empty symbol (#1561)', function() {
    var symbol = new SymbolItem(new Path());
    symbol.opacity = 0.5;
    symbol.skew(10);
    var item = new Path.Circle(new Point(0,0), 10);
    view.update();
    equals(item._globalMatrix, new Matrix());
});

test('path.strokeBounds of open, circular arc (#1817)', function() {
    var circle = new Path({
        pathData: 'M8,16c0,-4.4 3.6,-8 8,-8c4.4,0 8,3.6 8,8',
        strokeWidth: 8,
        strokeColor: 'red'
    });
    equals(circle.strokeBounds, new Rectangle(4, 4, 24, 12),
            'circle.strokeBounds');
});

test('path.strokeBounds applies stroke padding properly (#1824)', function() {
    var ellipse = new Path.Ellipse({
        point: [100, 100],
        size: [50, 80],
        strokeWidth: 32,
        strokeColor: 'red'
    });

    ellipse.rotate(50);
    equals(
        ellipse.strokeBounds,
        new Rectangle(74.39306, 91.93799, 101.21388, 96.12403),
        'ellipse.strokeBounds'
    );
})
