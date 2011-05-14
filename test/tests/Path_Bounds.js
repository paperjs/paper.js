module('Path Bounds');

test('path.bounds', function() {
	var path = new Path([
		new Segment(new Point(121, 334), new Point(-19, 38), new Point(30.7666015625, -61.53369140625)),
		new Segment(new Point(248, 320), new Point(-42, -74), new Point(42, 74)),
		new Segment(new Point(205, 420.94482421875), new Point(66.7890625, -12.72802734375), new Point(-79, 15.05517578125))
	]);
	// Test both closed and open paths, as the bounds for them differ
	path.closed = false;
	compareRectangles(path.bounds, { x: 121, y: 275.06796, width: 149.49304, height: 145.87686 });
	comparePoints(path.position, { x: 195.74652, y: 348.00641 });

	// Test both closed and open paths, as the bounds for them differ
	path.closed = true;
	compareRectangles(path.bounds, { x: 114.82726, y: 275.06796, width: 155.66579, height: 148.12778 });
	comparePoints(path.position, { x: 192.66016, y: 349.13184 });

	// Scale the path by 0.5 and check bounds
	path.scale(0.5);
	compareRectangles(path.bounds, { x: 153.7437, y: 312.09976, width: 77.8329, height: 74.06381 });

	// Move the path to another position and check bounds
	path.position = [100, 100];
	compareRectangles(path.bounds, { x: 61.08355, y: 62.96797, width: 77.83289, height: 74.06384 });

	// Set new bounds and check segment list as result of resizing / positioning
	path.bounds = { x: 100, y: 100, width: 200, height: 200 };
	equals(path.segments.toString(), '{ point: { x: 107.93077, y: 179.56917 }, handleIn: { x: -24.41127, y: 51.30707 }, handleOut: { x: 39.52904, y: -83.08194 } },{ point: { x: 271.10084, y: 160.66656 }, handleIn: { x: -53.96176, y: -99.91377 }, handleOut: { x: 53.96176, y: 99.91377 } },{ point: { x: 215.85428, y: 296.96086 }, handleIn: { x: 85.81084, y: -17.18521 }, handleOut: { x: -101.49949, y: 20.32729 } }');

	// Now rotate by 40 degrees and test bounds and segments again.
	path.rotate(40);
	compareRectangles(path.bounds, { x: 92.38109, y: 106.78957, width: 191.4803, height: 203.66878 });

	equals(path.segments.toString(), '{ point: { x: 142.60356, y: 125.16811 }, handleIn: { x: -51.67967, y: 23.61224 }, handleOut: { x: 83.68504, y: -38.23568 } },{ point: { x: 279.74945, y: 215.57158 }, handleIn: { x: 22.88623, y: -111.22434 }, handleOut: { x: -22.88623, y: 111.22434 } },{ point: { x: 149.81984, y: 284.46726 }, handleIn: { x: 76.78135, y: 41.99351 }, handleOut: { x: -90.81925, y: -49.67101 } }');
});