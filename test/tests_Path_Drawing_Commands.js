module('Path Drawing Commands');

test('path.lineTo(point);', function() {
	var path = new Path();
	path.moveTo([50, 50]);
	path.lineTo([100, 100]);
	var expectedSegments = [{ point: { x: 50, y: 50 } }, { point: { x: 100, y: 100 } }];
	compareSegmentLists(path.segments, expectedSegments);
});

test('path.arcTo(from, through, to);', function() {
	var path = new Path();
	path.moveTo([50, 50]);
	path.arcTo([100, 100], [75, 75]);
	var expectedSegments = [{ point: { x: 50, y: 50 }, handleOut: { x: 10.11156, y: -10.11156 } }, { point: { x: 88.5299, y: 42.33593 }, handleIn: { x: -13.21138, y: -5.47233 }, handleOut: { x: 13.21138, y: 5.47233 } }, { point: { x: 110.35534, y: 75 }, handleIn: { x: 0, y: -14.2999 } }];
	compareSegmentLists(path.segments, expectedSegments);
});