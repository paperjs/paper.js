module('Path Curves');

test('path.curves Synchronisation', function() {

	var doc = new Document();
	var path = new Path();

	path.add(new Point(0, 100));
	equals(path.curves.toString(), '');

	path.add(new Point(100, 100));
	equals(path.curves.toString(),
		'{ point1: { x: 0, y: 100 }, point2: { x: 100, y: 100 } }',
		'2 x path.add()');

	path.insert(1, { point: [50, 0], handleIn: [-25, 0], handleOut: [25, 0] });
	equals(path.curves.toString(),
		'{ point1: { x: 0, y: 100 }, handle2: { x: -25, y: 0 }, point2: { x: 50, y: 0 } },{ point1: { x: 50, y: 0 }, handle1: { x: 25, y: 0 }, point2: { x: 100, y: 100 } }',
		'path.insert()'
	);

	path.closed = true;
	equals(path.curves.toString(),
		'{ point1: { x: 0, y: 100 }, handle2: { x: -25, y: 0 }, point2: { x: 50, y: 0 } },{ point1: { x: 50, y: 0 }, handle1: { x: 25, y: 0 }, point2: { x: 100, y: 100 } },{ point1: { x: 100, y: 100 }, point2: { x: 0, y: 100 } }',
		'path.closed = true');

	path.removeSegments(2, 3);
	equals(path.curves.toString(),
		'{ point1: { x: 0, y: 100 }, handle2: { x: -25, y: 0 }, point2: { x: 50, y: 0 } },{ point1: { x: 50, y: 0 }, handle1: { x: 25, y: 0 }, point2: { x: 0, y: 100 } }',
		'path.removeSegments(2, 3)');

	equals(path.segments.toString(),
		'{ point: { x: 0, y: 100 } },{ point: { x: 50, y: 0 }, handleIn: { x: -25, y: 0 }, handleOut: { x: 25, y: 0 } }',
		'segments');

	path.add(new Point(100, 100));
	equals(path.curves.toString(),
		'{ point1: { x: 0, y: 100 }, handle2: { x: -25, y: 0 }, point2: { x: 50, y: 0 } },{ point1: { x: 50, y: 0 }, handle1: { x: 25, y: 0 }, point2: { x: 100, y: 100 } },{ point1: { x: 100, y: 100 }, point2: { x: 0, y: 100 } }',
		'path.add()');

	path.removeSegments(1, 2);
	equals(path.curves.toString(),
		'{ point1: { x: 0, y: 100 }, point2: { x: 100, y: 100 } },{ point1: { x: 100, y: 100 }, point2: { x: 0, y: 100 } }',
		'path.removeSegments(1, 2)');

	equals(path.segments.toString(),
		'{ point: { x: 0, y: 100 } },{ point: { x: 100, y: 100 } }',
		'segments');
});
