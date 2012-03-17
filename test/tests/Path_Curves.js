/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

module('Path Curves');

test('path.curves Synchronisation', function() {
	var path = new Path();

	path.add(new Point(0, 100));
	equals(path.segments.toString(), "{ point: { x: 0, y: 100 } }", "path.segments: path.add(new Point(0, 100));");
	equals(path.curves.toString(), "", "path.curves: path.add(new Point(0, 100));");
	path.add(new Point(100, 100));
	equals(path.segments.toString(), "{ point: { x: 0, y: 100 } },{ point: { x: 100, y: 100 } }", "path.segments: path.add(new Point(100, 100));");
	equals(path.curves.toString(), "{ point1: { x: 0, y: 100 }, point2: { x: 100, y: 100 } }", "path.curves: path.add(new Point(100, 100));");
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
	path.curves[0].length;
	ok(path.curves[0]._length, 'Curve length does not appear to be cached');
	path.scale(2, [0, 0]);
	equals(path.curves[0].length, 200, 'Curve length should be updated when path is transformed')
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
