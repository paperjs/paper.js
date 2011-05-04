module('Predefined Path Shapes');

test('new Path.Rectangle([50, 50], [100, 100])', function() {
	var path = new Path.Rectangle([50, 50], [100, 100]);
	equals(path.segments.toString(), '{ point: { x: 50, y: 150 } },{ point: { x: 50, y: 50 } },{ point: { x: 150, y: 50 } },{ point: { x: 150, y: 150 } }');
});

test('new Path.Circle([100, 100], 50)', function() {
	var path = new Path.Circle([100, 100], 50);
	var expectedSegments = [new Segment(new Point(50, 100), new Point(0, 27.6142578125), new Point(0, -27.6142578125)), new Segment(new Point(100, 50), new Point(-27.6142578125, 0), new Point(27.6142578125, 0)), new Segment(new Point(150, 100), new Point(0, -27.6142578125), new Point(0, 27.6142578125)), new Segment(new Point(100, 150), new Point(27.6142578125, 0), new Point(-27.6142578125, 0))];
	equals(path.segments.toString(), '{ point: { x: 50, y: 100 }, handleIn: { x: 0, y: 27.61424 }, handleOut: { x: 0, y: -27.61424 } },{ point: { x: 100, y: 50 }, handleIn: { x: -27.61424, y: 0 }, handleOut: { x: 27.61424, y: 0 } },{ point: { x: 150, y: 100 }, handleIn: { x: 0, y: -27.61424 }, handleOut: { x: 0, y: 27.61424 } },{ point: { x: 100, y: 150 }, handleIn: { x: 27.61424, y: 0 }, handleOut: { x: -27.61424, y: 0 } }');
});

test('new Path.Oval(rect)', function() {
	var rect = new Rectangle([500, 500], [1000, 750])
	var path = new Path.Oval(rect);
	var expectedSegments = [{ point: { x: 500, y: 875 }, handleIn: { x: 0, y: 207.10645 }, handleOut: { x: 0, y: -207.10645 } }, { point: { x: 1000, y: 500 }, handleIn: { x: -276.14258, y: 0 }, handleOut: { x: 276.14258, y: 0 } }, { point: { x: 1500, y: 875 }, handleIn: { x: 0, y: -207.10645 }, handleOut: { x: 0, y: 207.10645 } }, { point: { x: 1000, y: 1250 }, handleIn: { x: 276.14258, y: 0 }, handleOut: { x: -276.14258, y: 0 } }];
	equals(path.segments.toString(), '{ point: { x: 500, y: 875 }, handleIn: { x: 0, y: 207.10678 }, handleOut: { x: 0, y: -207.10678 } },{ point: { x: 1000, y: 500 }, handleIn: { x: -276.14237, y: 0 }, handleOut: { x: 276.14237, y: 0 } },{ point: { x: 1500, y: 875 }, handleIn: { x: 0, y: -207.10678 }, handleOut: { x: 0, y: 207.10678 } },{ point: { x: 1000, y: 1250 }, handleIn: { x: 276.14237, y: 0 }, handleOut: { x: -276.14237, y: 0 } }');
});

test('new Path.RoundRectangle(rect, size)', function() {
	var rect = new Rectangle([50, 50], [200, 100])
	var path = new Path.RoundRectangle(rect, 20);
	var expectedSegments = [{ point: { x: 70, y: 150 }, handleOut: { x: -11.0459, y: 0 } }, { point: { x: 50, y: 130 }, handleIn: { x: 0, y: 11.0459 } }, { point: { x: 50, y: 70 }, handleOut: { x: 0, y: -11.0459 } }, { point: { x: 70, y: 50 }, handleIn: { x: -11.0459, y: 0 } }, { point: { x: 230, y: 50 }, handleOut: { x: 11.0459, y: 0 } }, { point: { x: 250, y: 70 }, handleIn: { x: 0, y: -11.0459 } }, { point: { x: 250, y: 130 }, handleOut: { x: 0, y: 11.0459 } }, { point: { x: 230, y: 150 }, handleIn: { x: 11.0459, y: 0 } }];
	equals(path.segments.toString(), '{ point: { x: 70, y: 150 }, handleOut: { x: -11.04569, y: 0 } },{ point: { x: 50, y: 130 }, handleIn: { x: 0, y: 11.04569 } },{ point: { x: 50, y: 70 }, handleOut: { x: 0, y: -11.04569 } },{ point: { x: 70, y: 50 }, handleIn: { x: -11.04569, y: 0 } },{ point: { x: 230, y: 50 }, handleOut: { x: 11.04569, y: 0 } },{ point: { x: 250, y: 70 }, handleIn: { x: 0, y: -11.04569 } },{ point: { x: 250, y: 130 }, handleOut: { x: 0, y: 11.04569 } },{ point: { x: 230, y: 150 }, handleIn: { x: 11.04569, y: 0 } }');
});

test('new Path.RoundRectangle(rect, size) - too large size', function() {
	var rect = new Rectangle([50, 50], [200, 100])
	var path = new Path.RoundRectangle(rect, 200);
	var expectedSegments = [{ point: { x: 150, y: 150 }, handleOut: { x: -55.22852, y: 0 } }, { point: { x: 50, y: 100 }, handleIn: { x: 0, y: 27.61426 } }, { point: { x: 50, y: 100 }, handleOut: { x: 0, y: -27.61426 } }, { point: { x: 150, y: 50 }, handleIn: { x: -55.22852, y: 0 } }, { point: { x: 150, y: 50 }, handleOut: { x: 55.22852, y: 0 } }, { point: { x: 250, y: 100 }, handleIn: { x: 0, y: -27.61426 } }, { point: { x: 250, y: 100 }, handleOut: { x: 0, y: 27.61426 } }, { point: { x: 150, y: 150 }, handleIn: { x: 55.22852, y: 0 } }];
	equals(path.segments.toString(), '{ point: { x: 150, y: 150 }, handleOut: { x: -55.22847, y: 0 } },{ point: { x: 50, y: 100 }, handleIn: { x: 0, y: 27.61424 } },{ point: { x: 50, y: 100 }, handleOut: { x: 0, y: -27.61424 } },{ point: { x: 150, y: 50 }, handleIn: { x: -55.22847, y: 0 } },{ point: { x: 150, y: 50 }, handleOut: { x: 55.22847, y: 0 } },{ point: { x: 250, y: 100 }, handleIn: { x: 0, y: -27.61424 } },{ point: { x: 250, y: 100 }, handleOut: { x: 0, y: 27.61424 } },{ point: { x: 150, y: 150 }, handleIn: { x: 55.22847, y: 0 } }');
});

test('new Path.Arc(from, through, to)', function() {
	var path = new Path.Arc([50, 50], [100, 100], [75, 75]);
	var expectedSegments = [{ point: { x: 50, y: 50 }, handleOut: { x: 10.11156, y: -10.11156 } }, { point: { x: 88.5299, y: 42.33593 }, handleIn: { x: -13.21138, y: -5.47233 }, handleOut: { x: 13.21138, y: 5.47233 } }, { point: { x: 110.35534, y: 75 }, handleIn: { x: 0, y: -14.2999 } }];
	equals(path.segments.toString(), '{ point: { x: 50, y: 50 }, handleOut: { x: 10.11156, y: -10.11156 } },{ point: { x: 88.5299, y: 42.33593 }, handleIn: { x: -13.21138, y: -5.47233 }, handleOut: { x: 13.21138, y: 5.47233 } },{ point: { x: 110.35534, y: 75 }, handleIn: { x: 0, y: -14.2999 } }');
});

test('new Path.RegularPolygon(center, numSides, radius)', function() {
	var doc = new Document();
	var path = new Path.RegularPolygon(new Point(50, 50), 3, 10);
	var expectedSegments = [{ point: { x: 41.33984, y: 55 } }, { point: { x: 50, y: 40 } }, { point: { x: 58.66016, y: 55 } }];
	equals(path.segments.toString(), '{ point: { x: 41.33975, y: 55 } },{ point: { x: 50, y: 40 } },{ point: { x: 58.66025, y: 55 } }');

	var path = new Path.RegularPolygon(new Point(250, 250), 10, 100);
	var expectedSegments = [{ point: { x: 219.09814, y: 345.10547 } }, { point: { x: 169.09814, y: 308.77832 } }, { point: { x: 150, y: 250 } }, { point: { x: 169.09814, y: 191.22168 } }, { point: { x: 219.09814, y: 154.89453 } }, { point: { x: 280.90186, y: 154.89453 } }, { point: { x: 330.90186, y: 191.22168 } }, { point: { x: 350, y: 250 } }, { point: { x: 330.90186, y: 308.77832 } }, { point: { x: 280.90186, y: 345.10547 } }];
	equals(path.segments.toString(), '{ point: { x: 219.0983, y: 345.10565 } },{ point: { x: 169.0983, y: 308.77853 } },{ point: { x: 150, y: 250 } },{ point: { x: 169.0983, y: 191.22147 } },{ point: { x: 219.0983, y: 154.89435 } },{ point: { x: 280.9017, y: 154.89435 } },{ point: { x: 330.9017, y: 191.22147 } },{ point: { x: 350, y: 250 } },{ point: { x: 330.9017, y: 308.77853 } },{ point: { x: 280.9017, y: 345.10565 } }');
});

test('new Path.Star(center, numSides, radius1, radius2)', function() {
	var doc = new Document();
	var path = new Path.Star(new Point(100, 100), 10, 10, 20);
	var expectedSegments = [new Segment(new Point(100, 90)), new Segment(new Point(106.18017578125, 80.97900390625)), new Segment(new Point(105.8779296875, 91.90966796875)), new Segment(new Point(116.18017578125, 88.244140625)), new Segment(new Point(109.5107421875, 96.90966796875)), new Segment(new Point(120, 100)), new Segment(new Point(109.5107421875, 103.09033203125)), new Segment(new Point(116.18017578125, 111.755859375)), new Segment(new Point(105.8779296875, 108.09033203125)), new Segment(new Point(106.18017578125, 119.02099609375)), new Segment(new Point(100, 110)), new Segment(new Point(93.81982421875, 119.02099609375)), new Segment(new Point(94.1220703125, 108.09033203125)), new Segment(new Point(83.81982421875, 111.755859375)), new Segment(new Point(90.4892578125, 103.09033203125)), new Segment(new Point(80, 100)), new Segment(new Point(90.4892578125, 96.90966796875)), new Segment(new Point(83.81982421875, 88.244140625)), new Segment(new Point(94.1220703125, 91.90966796875)), new Segment(new Point(93.81982421875, 80.97900390625))];
	equals(path.segments.toString(), '{ point: { x: 100, y: 90 } },{ point: { x: 106.18034, y: 80.97887 } },{ point: { x: 105.87785, y: 91.90983 } },{ point: { x: 116.18034, y: 88.24429 } },{ point: { x: 109.51057, y: 96.90983 } },{ point: { x: 120, y: 100 } },{ point: { x: 109.51057, y: 103.09017 } },{ point: { x: 116.18034, y: 111.75571 } },{ point: { x: 105.87785, y: 108.09017 } },{ point: { x: 106.18034, y: 119.02113 } },{ point: { x: 100, y: 110 } },{ point: { x: 93.81966, y: 119.02113 } },{ point: { x: 94.12215, y: 108.09017 } },{ point: { x: 83.81966, y: 111.75571 } },{ point: { x: 90.48943, y: 103.09017 } },{ point: { x: 80, y: 100 } },{ point: { x: 90.48943, y: 96.90983 } },{ point: { x: 83.81966, y: 88.24429 } },{ point: { x: 94.12215, y: 91.90983 } },{ point: { x: 93.81966, y: 80.97887 } }');

	var doc = new Document();
	var path = new Path.Star(new Point(100, 100), 5, 20, 10);	
	var expectedSegments = [new Segment(new Point(100, 80)), new Segment(new Point(105.8779296875, 91.90966796875)), new Segment(new Point(119.02099609375, 93.81982421875)), new Segment(new Point(109.5107421875, 103.09033203125)), new Segment(new Point(111.755859375, 116.18017578125)), new Segment(new Point(100, 110)), new Segment(new Point(88.244140625, 116.18017578125)), new Segment(new Point(90.4892578125, 103.09033203125)), new Segment(new Point(80.97900390625, 93.81982421875)), new Segment(new Point(94.1220703125, 91.90966796875))];
	equals(path.segments.toString(), '{ point: { x: 100, y: 80 } },{ point: { x: 105.87785, y: 91.90983 } },{ point: { x: 119.02113, y: 93.81966 } },{ point: { x: 109.51057, y: 103.09017 } },{ point: { x: 111.75571, y: 116.18034 } },{ point: { x: 100, y: 110 } },{ point: { x: 88.24429, y: 116.18034 } },{ point: { x: 90.48943, y: 103.09017 } },{ point: { x: 80.97887, y: 93.81966 } },{ point: { x: 94.12215, y: 91.90983 } }');
});