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

module('PathItem Contains');

function testPoint(item, point, inside, message) {
	equals(item.contains(point), inside, message || ('The point ' + point
			+ ' should be ' + (inside ? 'inside' : 'outside') + '.'));
}

test('Path#contains() (Regular Polygon)', function() {
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

test('Path#contains() (Circle Contours)', function() {
	var path = new Path.Circle({
		center: [100, 100],
		radius: 50,
		fillColor: 'blue',
	});

	testPoint(path, path.bounds.topCenter, true);
	testPoint(path, path.bounds.leftCenter, true);
	testPoint(path, path.bounds.rightCenter, true);
	testPoint(path, path.bounds.bottomCenter, true);
	testPoint(path, path.bounds.topLeft, false);
	testPoint(path, path.bounds.topRight, false);
	testPoint(path, path.bounds.bottomLeft, false);
	testPoint(path, path.bounds.bottomRight, false);
});

test('Path#contains() (Transformed Circle Contours)', function() {
	var path = new Path.Circle({
		center: [200, 200],
		radius: 50,
		fillColor: 'blue',
	});
	path.translate(100, 100);

	testPoint(path, path.bounds.topCenter, true);
	testPoint(path, path.bounds.leftCenter, true);
	testPoint(path, path.bounds.rightCenter, true);
	testPoint(path, path.bounds.bottomCenter, true);
	testPoint(path, path.bounds.topLeft, false);
	testPoint(path, path.bounds.topRight, false);
	testPoint(path, path.bounds.bottomLeft, false);
	testPoint(path, path.bounds.bottomRight, false);
});

test('Path#contains() (Round Rectangle)', function() {
	var rectangle = new Rectangle({
	    point: new Point(0, 0),
	    size: new Size(200, 40)
	});
	var path = new Path.Rectangle(rectangle, new Size(20, 20));
	testPoint(path, new Point(100, 20), true);
});

test('Path#contains() (Open Circle)', function() {
	var path = new Path.Circle([100, 100], 100);
	path.closed = false;
	path.fillColor = '#ff0000';
	testPoint(path, new Point(40, 160), false);
});

test('CompoundPath#contains() (Donut)', function() {
	var path = new CompoundPath([
		new Path.Circle([0, 0], 50),
		new Path.Circle([0, 0], 25)
	]);

	testPoint(path, new Point(0, -50), true,
		'The top center point of the outer circle should be inside the donut.');
	testPoint(path, new Point(0, 0), false,
		'The center point should be outside the donut.');
	testPoint(path, new Point(-35, 0), true,
		'A vertically centered point on the left side should be inside the donut.');
	testPoint(path, new Point(35, 0), true,
		'A vertically centered point on the right side should be inside the donut.');
	testPoint(path, new Point(0, 49), true,
		'The near bottom center point of the outer circle should be inside the donut.');
	testPoint(path, new Point(0, 50), true,
		'The bottom center point of the outer circle should be inside the donut.');
	testPoint(path, new Point(0, 51), false,
		'The near bottom center point of the outer circle should be outside the donut.');
	testPoint(path, new Point({ length: 50, angle: 30 }), true,
		'A random point on the periphery of the outer circle should be inside the donut.');
	testPoint(path, new Point(-25, 0), true,
		'The left center point of the inner circle should be inside the donut.');
	testPoint(path, new Point(0, -25), true,
		'The top center point of the inner circle should be inside the donut.');
	testPoint(path, new Point(25, 0), true,
		'The right center point of the inner circle should be inside the donut.');
	testPoint(path, new Point(0, 25), true,
		'The bottom center point of the inner circle should be inside the donut.');
	testPoint(path, new Point(-50, -50), false,
		'The top left point of bounding box should be outside the donut.');
	testPoint(path, new Point(50, -50), false,
		'The top right point of the bounding box should be outside the donut.');
	testPoint(path, new Point(-50, 50), false,
		'The bottom left point of bounding box should be outside the donut.');
	testPoint(path, new Point(50, 50), false,
		'The bottom right point of the bounding box should be outside the donut.');
	testPoint(path, new Point(-45, 45), false,
		'The near bottom left point of bounding box should be outside the donut.');
});

test('Shape#contains()', function() {
	var shape = new Shape.Circle([0, 0], 100);

	testPoint(shape, new Point(0, 0), true);
	testPoint(shape, new Point(0, -100), true);
	testPoint(shape, new Point({ length: 99, angle: 45 }), true);
	testPoint(shape, new Point({ length: 100, angle: 45 }), true);
	testPoint(shape, new Point({ length: 101, angle: 45 }), false);

	var size = new Size(100, 200),
		half = size.divide(2),
		shape = new Shape.Ellipse(half.negate(), size);
	testPoint(shape, new Point(0, 0), true);
	testPoint(shape, new Point(0, -1).multiply(half), true);
	testPoint(shape, new Point({ length: 0.9, angle: 45 }).multiply(half), true);
	testPoint(shape, new Point({ length: 1, angle: 45 }).multiply(half), true);
	testPoint(shape, new Point({ length: 1.1, angle: 45 }).multiply(half), false);


	var size = new Size(100, 200),
		half = size.divide(2),
		shape = new Shape.Rectangle(half.negate(), size);
	testPoint(shape, new Point(0, 0), true);
	testPoint(shape, new Point(0, 0.9).multiply(half), true);
	testPoint(shape, new Point(0, 1).multiply(half), true);
	testPoint(shape, new Point(0, 1.1).multiply(half), false);
	testPoint(shape, new Point(0.9, 0).multiply(half), true);
	testPoint(shape, new Point(1, 0).multiply(half), true);
	testPoint(shape, new Point(1.1, 0).multiply(half), false);
});

test('Path#contains() (Rectangle Contours)', function() {
	var path = new Path.Rectangle(new Point(100, 100), [200, 200]),
		curves = path.getCurves();

	for (var i = 0; i < curves.length; i++) {
		testPoint(path, curves[i].getPoint(0), true);
	    testPoint(path, curves[i].getPoint(0.5), true);
	}
});


test('Path#contains() (Rotated Rectangle Contours)', function() {
	var path = new Path.Rectangle(new Point(100, 100), [200, 200]),
		curves = path.getCurves();

	path.rotate(45);

	for (var i = 0; i < curves.length; i++) {
		testPoint(path, curves[i].getPoint(0), true);
	    testPoint(path, curves[i].getPoint(0.5), true);
	}
});

test('Path#contains() (touching stationary point with changing orientation)', function() {
	var path = new Path({
		segments: [
			new Segment([100, 100]),
			new Segment([200, 200], [-50, 0], [50, 0]),
			new Segment([300, 300]),
			new Segment([300, 100])
		],
		closed: true
	});

	testPoint(path, new Point(200, 200), true);
});

test('Path#contains() (complex shape)', function() {
	var path = new Path({
		pathData: 'M301 162L307 154L315 149L325 139.5L332.5 135.5L341 128.5L357.5 117.5L364.5 114.5L368.5 110.5L380 105.5L390.5 102L404 96L410.5 96L415 97.5L421 104L425.5 113.5L428.5 126L429.5 134L429.5 141L429.5 148L425.5 161.5L425.5 169L414 184.5L409.5 191L401 201L395 209L386 214.5L378.5 217L368 220L348 219.5L338 218L323.5 212.5L312 205.5L302.5 197.5L295.5 189L291.5 171.5L294 168L298 165.5L301 162z',
		fillColor: 'blue',
		strokeColor: 'green',
		strokeWidth: 2
	});

	testPoint(path, new Point(360, 160), true);
	testPoint(path, new Point(377, 96), false);
	testPoint(path, new Point(410, 218), false);
	testPoint(path, new Point(431, 104), false);
});

