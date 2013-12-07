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

module('Point');
test('new Point(10, 20)', function() {
	var point = new Point(10, 20);
	comparePoints(point, { x: 10, y: 20 });
});

test('new Point([10, 20])', function() {
	var point = new Point([10, 20]);
	comparePoints(point, { x: 10, y: 20 });
});

test('new Point({x: 10, y: 20})', function() {
	var point = new Point({x: 10, y: 20});
	comparePoints(point, { x: 10, y: 20 });
});

test('new Point(new Size(10, 20))', function() {
	var point = new Point(new Size(10, 20));
	comparePoints(point, { x: 10, y: 20 });
});

test('new Point({ width: 10, height: 20})', function() {
	var point = new Point({width: 10, height: 20});
	comparePoints(point, { x: 10, y: 20 });
});

test('new Point({ angle: 45, length: 20})', function() {
	var point = new Point({ angle: 40, length: 20 });
	comparePoints(point, new Point(15.32089, 12.85575));
});

module('Point vector operations');

test('normalize(length)', function() {
	var point = new Point(0, 10).normalize(20);
	comparePoints(point, { x: 0, y: 20 });
});

test('set length', function() {
	var point = new Point(0, 10);
	point.length = 20;
	comparePoints(point, { x: 0, y: 20 });
});

test('get angle', function() {
	var angle = new Point(0, 10).angle;
    equals(angle, 90);
});

test('getAngle(point)', function() {
	var angle = new Point(0, 10).getAngle([10, 10]);
    equals(Math.round(angle), 45);
});

test('rotate(degrees)', function() {
	var point = new Point(100, 50).rotate(90);
	comparePoints(point, { x: -50, y: 100 });
});

test('set angle', function() {
	var point = new Point(10, 20);
	point.angle = 92;
    equals(point.angle, 92);
	comparePoints(point, new Point({
		angle: 92,
		length: Math.sqrt(10 * 10 + 20 * 20)
	}));
});

test('set angle & length', function() {
	var point1 = new Point();
	point1.length = Math.sqrt(2);
	point1.angle = -45;

	var point2 = new Point();
	point2.angle = -45;
	point2.length = Math.sqrt(2);

	comparePoints(point2, point1);
});

test('getting angle after x / y change', function() {
	var vector = new Point(1, 0);
	equals(vector.angle, 0, 'angle before x / y change');
	vector.x = 0;
	vector.y = 1;
	equals(vector.angle, 90, 'angle after x / y change');
});

test('getDirectedAngle(point)', function() {
	equals(function() {
		return new Point(10, 10).getDirectedAngle(new Point(1, 0));
	}, -45);

	equals(function() {
		return new Point(-10, 10).getDirectedAngle(new Point(1, 0));
	}, -135);

	equals(function() {
		return new Point(-10, -10).getDirectedAngle(new Point(1, 0));
	}, 135);

	equals(function() {
		return new Point(10, -10).getDirectedAngle(new Point(1, 0));
	}, 45);
});

test('equals()', function() {
	equals(function() {
		return new Point(10, 10).equals([10, 10]);
	}, true);

	equals(function() {
		return new Point(0, 0).equals({});
	}, false);

	equals(function() {
		return new Point(0, 0).equals(null);
	}, false);
});
