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

module('Path Contains');

function testPoint(path, point, inside) {
	equals(path.contains(point), inside, 'The point ' + point
			+ ' should be ' + (inside ? 'inside' : 'outside') + '.');
}

test('Path#contains (Regular Polygon)', function() {
	var path = new Path.RegularPolygon([0, 0], 6, 20);

	testPoint(path, new Point(0, -20), true);
	testPoint(path, new Point(0, -10), true);
	testPoint(path, new Point(0, 0), true);
	testPoint(path, new Point(0, 10), true);
	testPoint(path, new Point(0, 20), true);

	testPoint(path, new Point(-10, -20), false);
	testPoint(path, new Point(-10, -10), true);
	testPoint(path, new Point(-10, 0), true);
	testPoint(path, new Point(-10, 10), true);
	testPoint(path, new Point(-10, 20), false);

	testPoint(path, new Point(10, -20), false);
	testPoint(path, new Point(10, -10), true);
	testPoint(path, new Point(10, 0), true);
	testPoint(path, new Point(10, 10), true);
	testPoint(path, new Point(10, 20), false);
});

test('CompoundPath#contains (Donut)', function() {
	var path = new CompoundPath([
		new Path.Circle([0, 0], 50),
		new Path.Circle([0, 0], 25)
	]);

	equals(path.contains(new Point(0, 0)), false,
		'The center point should be outside the donut.');
	equals(path.contains(new Point(-35, 0)), true,
		'A vertically centered point on the left side should be inside the donut.');
	equals(path.contains(new Point(35, 0)), true,
		'A vertically centered point on the right side should be inside the donut.');
	equals(path.contains(new Point(0, 49)), true,
		'The near bottom center point of the outer circle should be inside the donut.');
	equals(path.contains(new Point(0, 50)), true,
		'The bottom center point of the outer circle should be inside the donut.');
	equals(path.contains(new Point(0, 51)), false,
		'The near bottom center point of the outer circle should be outside the donut.');
	equals(path.contains(new Point({ length: 50, angle: 30 })), true,
		'A random point on the periphery of the outer circle should be inside the donut.');
	equals(path.contains(new Point(0, 25)), false,
		'The bottom center point of the inner circle should be outside the donut.');
	equals(path.contains(new Point({ length: 25, angle: 30 })), false,
		'A random point on the periphery of the inner circle should be outside the donut.');
	equals(path.contains(new Point(-50, -50)), false,
		'The top left point of bounding box should be outside the donut.');
	equals(path.contains(new Point(-50, 50)), false,
		'The bottom left point of bounding box should be outside the donut.');
	equals(path.contains(new Point(-45, 45)), false,
		'The near bottom left point of bounding box should be outside the donut.');
});
