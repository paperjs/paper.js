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
	// ai: 172.10122680664062
	//  8: 172.10094440399325
	//  7: 172.10190407418446
	//  6: 172.09823801587845
	//  5: 172.1100076851322
	compareNumbers(length, 172.10122680664062);

	var t = Date.now(), c = 1000;
	for (var i = 0; i < c; i++) {
		var param = path.curves[0].getParameter(length / 4);
	}
	window.console.log(Date.now() - t, param);
	// ai: 0.2255849553116685
	//  8: 0.22558507711602457
	//  5: 0.22558507714028128
	//	4: 0.22558508917324532
	compareNumbers(param, 0.2255849553116685);
});
