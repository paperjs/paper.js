module('Path Length');

test('path.length', function() {
	var doc = new Doc();
	var path = new Path([
		new Segment(new Point(121, 334), new Point(-19, 38), new Point(30.7666015625, -61.53369140625)),
		new Segment(new Point(248, 320), new Point(-42, -74), new Point(42, 74))
	]);
	compareNumbers(path.getCurveLength(), 172.10122680664062);
});
