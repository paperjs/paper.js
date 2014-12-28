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

module('Path Bounds');

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
    equals(path.strokeBounds, { x: 120.44098, y: 312.88324 , width: 19.97544, height: 30.53977 });
});

test('path.strokeBounds with corners and miter limit', function() {
    var path = new Path({
        pathData: 'M47,385c120,-100 120,-100 400,-40c-280,140 -280,140 -400,40z',
        strokeWidth: 5,
        strokeJoin: "miter",
        strokeColor: "black"
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
