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

module('Segment');
test('new Segment(point)', function() {
    var segment = new Segment(new Point(10, 10));
    equals(segment.toString(), '{ point: { x: 10, y: 10 } }');
});

test('new Segment(x, y)', function() {
    var segment = new Segment(10, 10);
    equals(segment.toString(), '{ point: { x: 10, y: 10 } }');
});

test('new Segment(object)', function() {
    var segment = new Segment({ point: { x: 10, y: 10 }, handleIn: { x: 5, y: 5 }, handleOut: { x: 15, y: 15 } });
    equals(segment.toString(), '{ point: { x: 10, y: 10 }, handleIn: { x: 5, y: 5 }, handleOut: { x: 15, y: 15 } }');
});

test('new Segment(point, handleIn, handleOut)', function() {
    var segment = new Segment(new Point(10, 10), new Point(5, 5), new Point(15, 15));
    equals(segment.toString(), '{ point: { x: 10, y: 10 }, handleIn: { x: 5, y: 5 }, handleOut: { x: 15, y: 15 } }');
});

test('new Segment(x, y, inX, inY, outX, outY)', function() {
    var segment = new Segment(10, 10, 5, 5, 15, 15);
    equals(segment.toString(), '{ point: { x: 10, y: 10 }, handleIn: { x: 5, y: 5 }, handleOut: { x: 15, y: 15 } }');
});

test('new Segment(size)', function() {
    var segment = new Segment(new Size(10, 10));
    equals(segment.toString(), '{ point: { x: 10, y: 10 } }');
});

test('segment.reverse()', function() {
    var segment = new Segment(new Point(10, 10), new Point(5, 5), new Point(15, 15));
    segment.reverse();
    equals(segment.toString(), '{ point: { x: 10, y: 10 }, handleIn: { x: 15, y: 15 }, handleOut: { x: 5, y: 5 } }');
});

test('segment.clone()', function() {
    var segment = new Segment(new Point(10, 10), new Point(5, 5), new Point(15, 15));
    var clone = segment.clone();
    equals(function() {
        return segment == clone;
    }, false);

    equals(function() {
        return segment.toString();
    }, clone.toString());
});

test('segment.remove()', function() {
    var path = new Path([10, 10], [5, 5], [10, 10]);
    path.segments[1].remove();
    equals(path.segments.toString(), '{ point: { x: 10, y: 10 } },{ point: { x: 10, y: 10 } }');
});

test('segment.selected', function() {
    var path = new Path([10, 20], [50, 100]);
    path.segments[0].point.selected = true;
    equals(function() {
        return path.segments[0].point.selected;
    }, true);
    path.segments[0].point.selected = false;
    equals(function() {
        return path.segments[0].point.selected;
    }, false);
});

test('segment.interpolate', function() {
    var segment = new Segment(),
        segment0 = new Segment({
            point: [10, 10],
            handleIn: [-10, -10],
            handleOut: [10, 10]
        }),
        segment1 = new Segment({
            point: [110, 110],
            handleIn: [-10, 10],
            handleOut: [10, -10]
        }),
        expected = new Segment({
            point: [60, 60],
            handleIn: [-10, 0],
            handleOut: [10, 0]
        });

    segment.interpolate(segment0, segment1, 0);
    equals(segment.toString(), segment0.toString());

    segment.interpolate(segment0, segment1, 1);
    equals(segment.toString(), segment1.toString());

    segment.interpolate(segment0, segment1, 0.5);
    equals(segment.toString(), expected.toString());
});
