module('Path Length');

test('path.length', function() {
	var doc = new Document();
	var path = new Path([
		new Segment(new Point(121, 334), new Point(-19, 38), new Point(30.7666015625, -61.53369140625)),
		new Segment(new Point(248, 320), new Point(-42, -74), new Point(42, 74))
	]);
	var t = Date.now(), c = 1000;
	for (var i = 0; i < c; i++) {
		var length = path.length;
	}
	window.console.log(Date.now() - t, length);
	compareNumbers(length, 172.10122680664062);

	var t = Date.now(), c = 1000;
	for (var i = 0; i < c; i++) {
		var param = path.curves[0].getParameter(length / 4);
	}
	window.console.log(Date.now() - t, param);
	compareNumbers(param, 0.2255848449949521);
});
