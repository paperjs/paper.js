/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

module('Path Curves');

test('path.curves synchronisation', function() {
	var path = new Path();

	path.add(new Point(100, 100));
	equals(path.segments.toString(), "{ point: { x: 100, y: 100 } }", "path.segments: path.add(new Point(100, 100));");
	equals(path.curves.toString(), "", "path.curves: path.add(new Point(100, 100));");
	path.insert(0, new Point(0, 100));
	equals(path.segments.toString(), "{ point: { x: 0, y: 100 } },{ point: { x: 100, y: 100 } }", "path.segments: path.insert(0, new Point(0, 100));");
	equals(path.curves.toString(), "{ point1: { x: 0, y: 100 }, point2: { x: 100, y: 100 } }", "path.curves: path.insert(0, new Point(0, 100));");
	path.insert(1, {point:[50, 0], handleIn:[-25, 0], handleOut:[25, 0]});
	equals(path.segments.toString(), "{ point: { x: 0, y: 100 } },{ point: { x: 50, y: 0 }, handleIn: { x: -25, y: 0 }, handleOut: { x: 25, y: 0 } },{ point: { x: 100, y: 100 } }", "path.segments: path.insert(1, {point:[50, 0], handleIn:[-25, 0], handleOut:[25, 0]});");
	equals(path.curves.toString(), "{ point1: { x: 0, y: 100 }, handle2: { x: -25, y: 0 }, point2: { x: 50, y: 0 } },{ point1: { x: 50, y: 0 }, handle1: { x: 25, y: 0 }, point2: { x: 100, y: 100 } }", "path.curves: path.insert(1, {point:[50, 0], handleIn:[-25, 0], handleOut:[25, 0]});");
	path.closed = true;
	equals(path.segments.toString(), "{ point: { x: 0, y: 100 } },{ point: { x: 50, y: 0 }, handleIn: { x: -25, y: 0 }, handleOut: { x: 25, y: 0 } },{ point: { x: 100, y: 100 } }", "path.segments: path.closed = true;");
	equals(path.curves.toString(), "{ point1: { x: 0, y: 100 }, handle2: { x: -25, y: 0 }, point2: { x: 50, y: 0 } },{ point1: { x: 50, y: 0 }, handle1: { x: 25, y: 0 }, point2: { x: 100, y: 100 } },{ point1: { x: 100, y: 100 }, point2: { x: 0, y: 100 } }", "path.curves: path.closed = true;");
	path.removeSegments(2, 3);
	equals(path.segments.toString(), "{ point: { x: 0, y: 100 } },{ point: { x: 50, y: 0 }, handleIn: { x: -25, y: 0 }, handleOut: { x: 25, y: 0 } }", "path.segments: path.removeSegments(2, 3);");
	equals(path.curves.toString(), "{ point1: { x: 0, y: 100 }, handle2: { x: -25, y: 0 }, point2: { x: 50, y: 0 } },{ point1: { x: 50, y: 0 }, handle1: { x: 25, y: 0 }, point2: { x: 0, y: 100 } }", "path.curves: path.removeSegments(2, 3);");
	path.add(new Point(100, 100));
	path.removeSegments(1, 2);
	equals(path.segments.toString(), "{ point: { x: 0, y: 100 } },{ point: { x: 100, y: 100 } }", "path.segments: path.add(new Point(100, 100));\npath.removeSegments(1, 2);");
	equals(path.curves.toString(), "{ point1: { x: 0, y: 100 }, point2: { x: 100, y: 100 } },{ point1: { x: 100, y: 100 }, point2: { x: 0, y: 100 } }", "path.curves: path.add(new Point(100, 100));\npath.removeSegments(1, 2);");
	
	// Transform the path, and the curves length should be invalidated (first, force-cache the first segment's length by accessing it
	var length = path.curves[0].length;
	ok(path.curves[0]._length, 'Curve length does not appear to be cached');
	path.scale(2, [0, 0]);
	compareNumbers(path.curves[0].length, 200, 'Curve length should be updated when path is transformed');

	var points = [];
	for (var i = 0; i < 40; i++)
	    points.push(Point.random());
	var path = new Path(points);
	equals(path.segments.length, 40, 'segments.length');
	equals(path.curves.length, 39, 'curves.length');
	path.removeSegments();    
	equals(path.segments.length, 0, 'segments.length');
	equals(path.curves.length, 0, 'curves.length');
});

test('path.curves on closed paths', function() {
	var path = new Path.Circle(new Point(100, 100) , 100);
	equals(path.curves.toString(), "{ point1: { x: 0, y: 100 }, handle1: { x: 0, y: -55.22847 }, handle2: { x: -55.22847, y: 0 }, point2: { x: 100, y: 0 } },{ point1: { x: 100, y: 0 }, handle1: { x: 55.22847, y: 0 }, handle2: { x: 0, y: -55.22847 }, point2: { x: 200, y: 100 } },{ point1: { x: 200, y: 100 }, handle1: { x: 0, y: 55.22847 }, handle2: { x: 55.22847, y: 0 }, point2: { x: 100, y: 200 } },{ point1: { x: 100, y: 200 }, handle1: { x: -55.22847, y: 0 }, handle2: { x: 0, y: 55.22847 }, point2: { x: 0, y: 100 } }");
	path.removeSegments(0, 1);
	equals(path.curves.toString(), "{ point1: { x: 100, y: 0 }, handle1: { x: 55.22847, y: 0 }, handle2: { x: 0, y: -55.22847 }, point2: { x: 200, y: 100 } },{ point1: { x: 200, y: 100 }, handle1: { x: 0, y: 55.22847 }, handle2: { x: 55.22847, y: 0 }, point2: { x: 100, y: 200 } },{ point1: { x: 100, y: 200 }, handle1: { x: -55.22847, y: 0 }, handle2: { x: -55.22847, y: 0 }, point2: { x: 100, y: 0 } }");
});


test('path.flatten(maxDistance)', function() {
	var path = new Path.Circle(new Size(80, 50), 35);

	// Convert its curves to points, with a max distance of 20:
	path.flatten(20);

	equals(function() {
		return path.lastSegment.point.equals(path.firstSegment.point);
	}, false, 'The points of the last and first segments should not be the same.');

	equals(function() {
		return path.lastSegment.point.toString() != path.segments[path.segments.length - 2].point.toString();
	}, true, 'The points of the last and before last segments should not be so close, that calling toString on them returns the same string value.');
});

test('Curve list after removing a segment - 1', function() {
	var path = new paper.Path([0, 0], [1, 1], [2, 2]);

	equals(function() {
		return path.curves.length;
	}, 2, 'After creating a path with three segments, we should have two curves. By accessing path.curves we also make sure the curves are created internally.');

	equals(function() {
		return path.segments[1].remove();
	}, true, 'Removing the paths second segment should be succesfull.');

	equals(function() {
		return path.curves.length;
	}, 1, 'After removing the middle segment, we should be left with one curve');
});

test('Curve list after removing a segment - 2', function() {
	var path = new paper.Path([0, 0], [1, 1], [2, 2]);

	equals(function() {
		return path.curves.length;
	}, 2, 'After creating a path with three segments, we should have two curves. By accessing path.curves we also make sure the curves are created internally.');

	equals(function() {
		return path.segments[2].remove();
	}, true, 'Removing the paths last segment should be succesfull.');

	equals(function() {
		return path.curves.length;
	}, 1, 'After removing the last segment, we should be left with one curve');
});

test('Splitting a straight path should produce linear segments', function() {
	var path = new Path.Line([0, 0], [50, 50]);
	var path2 = path.split(0, 0.5);
	equals(function() {
		return path2.firstSegment.linear;
	}, true);
});
