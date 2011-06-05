module('Path Drawing Commands');

test('path.lineTo(point);', function() {
	var path = new Path();
	path.moveTo([50, 50]);
	path.lineTo([100, 100]);
	equals(path.segments.toString(), '{ point: { x: 50, y: 50 } },{ point: { x: 100, y: 100 } }');
});

test('path.arcTo(from, through, to);', function() {
	var path = new Path();
	path.moveTo([50, 50]);
	path.arcTo([100, 100], [75, 75]);
	equals(path.segments.toString(), '{ point: { x: 50, y: 50 }, handleOut: { x: 10.11156, y: -10.11156 } },{ point: { x: 88.5299, y: 42.33593 }, handleIn: { x: -13.21138, y: -5.47233 }, handleOut: { x: 13.21138, y: 5.47233 } },{ point: { x: 110.35534, y: 75 }, handleIn: { x: 0, y: -14.2999 } }');
});

test('path.arcTo(from, through, to); where from, through and to all share the same y position and through lies in between from and to', function() {
	var path = new Path();
	path.strokeColor = 'black';

	path.add([40, 75]);
	path.arcTo([50, 75], [100, 75]);
	equals(path.lastSegment.point.toString(), '{ x: 100, y: 75 }', 'We expect the last segment point to be at the position where we wanted to draw the arc to.');
});

test('path.arcTo(from, through, to); where from, through and to all share the same y position and through lies to the right of to', function() {
	var path = new Path();
	path.strokeColor = 'black';

	path.add([40, 75]);
	path.arcTo([150, 75], [100, 75]);
	equals(path.lastSegment.point.toString(), '{ x: 100, y: 75 }', 'We expect the last segment point to be at the position where we wanted to draw the arc to.');
});

test('path.arcTo(from, through, to); where from, through and to all share the same y position and through lies to the left of to', function() {
	var path = new Path();
	path.strokeColor = 'black';

	path.add([40, 75]);
	path.arcTo([10, 75], [100, 75]);
	equals(path.lastSegment.point.toString(), '{ x: 100, y: 75 }', 'We expect the last segment point to be at the position where we wanted to draw the arc to.');
});