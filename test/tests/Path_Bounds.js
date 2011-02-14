module('Path Bounds');

test('path.bounds', function() {
	var doc = new Doc();
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
	path.scale(0.5, 0.5);
	compareRectangles(path.bounds, { x: 153.7437, y: 312.09976, width: 77.8329, height: 74.06381 });

	// Now move the path to another position and check bounds again
	path.position = [100, 100];
	compareRectangles(path.bounds, { x: 61.08355, y: 62.96797, width: 77.83289, height: 74.06384 });
});
