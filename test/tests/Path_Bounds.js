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
	path.scale(0.5);
	compareRectangles(path.bounds, { x: 153.7437, y: 312.09976, width: 77.8329, height: 74.06381 });

	// Move the path to another position and check bounds
	path.position = [100, 100];
	compareRectangles(path.bounds, { x: 61.08355, y: 62.96797, width: 77.83289, height: 74.06384 });

	// Set new bounds and check segment list as result of resizing / positioning
	path.bounds = { x: 100, y: 100, width: 200, height: 200 };
	compareSegmentLists(path.segments, [{ point: { x: 107.93066, y: 179.56982 }, handleIn: { x: -24.41211, y: 51.30664 }, handleOut: { x: 39.52734, y: -83.08447 } }, { point: { x: 271.10107, y: 160.66553 }, handleIn: { x: -53.96289, y: -99.9126 }, handleOut: { x: 53.96143, y: 99.91406 } }, { point: { x: 215.85303, y: 296.96045 }, handleIn: { x: 85.81299, y: -17.18555 }, handleOut: { x: -101.49854, y: 20.32861 } }])

	path.rotate(40);
	compareRectangles(path.bounds, { x: 92.38155, y: 106.78981, width: 191.48048, height: 203.66789 });
	compareSegmentLists(path.segments, [{ point: { x: 142.604, y: 125.16748 }, handleIn: { x: -51.6792, y: 23.61182 }, handleOut: { x: 83.68457, y: -38.23438 } }, { point: { x: 279.75, y: 215.57129 }, handleIn: { x: 22.88525, y: -111.22363 }, handleOut: { x: -22.88623, y: 111.22363 } }, { point: { x: 149.81982, y: 284.46729 }, handleIn: { x: 76.78223, y: 41.99219 }, handleOut: { x: -90.81885, y: -49.67139 } }]);
});