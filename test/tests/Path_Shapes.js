module('Predefined Path Shapes');

test('new Path.Rectangle([50, 50], [100, 100])', function() {
	var path = new Path.Rectangle([50, 50], [100, 100]);
	var expectedSegments = [new Segment(new Point(50, 150)), new Segment(new Point(50, 50)), new Segment(new Point(150, 50)), new Segment(new Point(150, 150))];
	compareSegmentLists(path.segments, expectedSegments);
});

test('new Path.Circle([100, 100], 50)', function() {
	var path = new Path.Circle([100, 100], 50);
	var expectedSegments = [new Segment(new Point(50, 100), new Point(0, 27.6142578125), new Point(0, -27.6142578125)), new Segment(new Point(100, 50), new Point(-27.6142578125, 0), new Point(27.6142578125, 0)), new Segment(new Point(150, 100), new Point(0, -27.6142578125), new Point(0, 27.6142578125)), new Segment(new Point(100, 150), new Point(27.6142578125, 0), new Point(-27.6142578125, 0))];
	compareSegmentLists(path.segments, expectedSegments);
});

test('new Path.Oval(rect)', function() {
	var rect = new Rectangle([500, 500], [1000, 750])
	var path = new Path.Oval(rect);
	var expectedSegments = [{ point: { x: 500, y: 875 }, handleIn: { x: 0, y: 207.10645 }, handleOut: { x: 0, y: -207.10645 } }, { point: { x: 1000, y: 500 }, handleIn: { x: -276.14258, y: 0 }, handleOut: { x: 276.14258, y: 0 } }, { point: { x: 1500, y: 875 }, handleIn: { x: 0, y: -207.10645 }, handleOut: { x: 0, y: 207.10645 } }, { point: { x: 1000, y: 1250 }, handleIn: { x: 276.14258, y: 0 }, handleOut: { x: -276.14258, y: 0 } }];
	compareSegmentLists(path.segments, expectedSegments);
});

test('new Path.RoundRectangle(rect, size)', function() {
	var rect = new Rectangle([50, 50], [200, 100])
	var path = new Path.RoundRectangle(rect, 20);
	var expectedSegments = [{ point: { x: 70, y: 150 }, handleOut: { x: -11.0459, y: 0 } }, { point: { x: 50, y: 130 }, handleIn: { x: 0, y: 11.0459 } }, { point: { x: 50, y: 70 }, handleOut: { x: 0, y: -11.0459 } }, { point: { x: 70, y: 50 }, handleIn: { x: -11.0459, y: 0 } }, { point: { x: 230, y: 50 }, handleOut: { x: 11.0459, y: 0 } }, { point: { x: 250, y: 70 }, handleIn: { x: 0, y: -11.0459 } }, { point: { x: 250, y: 130 }, handleOut: { x: 0, y: 11.0459 } }, { point: { x: 230, y: 150 }, handleIn: { x: 11.0459, y: 0 } }];
	compareSegmentLists(path.segments, expectedSegments);
});

test('new Path.RoundRectangle(rect, size) - too large size', function() {
	var rect = new Rectangle([50, 50], [200, 100])
	var path = new Path.RoundRectangle(rect, 200);
	var expectedSegments = [{ point: { x: 150, y: 150 }, handleOut: { x: -55.22852, y: 0 } }, { point: { x: 50, y: 100 }, handleIn: { x: 0, y: 27.61426 } }, { point: { x: 50, y: 100 }, handleOut: { x: 0, y: -27.61426 } }, { point: { x: 150, y: 50 }, handleIn: { x: -55.22852, y: 0 } }, { point: { x: 150, y: 50 }, handleOut: { x: 55.22852, y: 0 } }, { point: { x: 250, y: 100 }, handleIn: { x: 0, y: -27.61426 } }, { point: { x: 250, y: 100 }, handleOut: { x: 0, y: 27.61426 } }, { point: { x: 150, y: 150 }, handleIn: { x: 55.22852, y: 0 } }];
	compareSegmentLists(path.segments, expectedSegments);
});

test('new Path.Arc(from, through, to)', function() {
	var path = new Path.Arc([50, 50], [100, 100], [75, 75]);
	var expectedSegments = [{ point: { x: 50, y: 50 }, handleOut: { x: 10.11156, y: -10.11156 } }, { point: { x: 88.5299, y: 42.33593 }, handleIn: { x: -13.21138, y: -5.47233 }, handleOut: { x: 13.21138, y: 5.47233 } }, { point: { x: 110.35534, y: 75 }, handleIn: { x: 0, y: -14.2999 } }];
	compareSegmentLists(path.segments, expectedSegments);
});

test('new Path.RegularPolygon(center, numSides, radius)', function() {
	var doc = new Document();
	var path = new Path.RegularPolygon(new Point(50, 50), 3, 10);
	var expectedSegments = [{ point: { x: 41.33984, y: 55 } }, { point: { x: 50, y: 40 } }, { point: { x: 58.66016, y: 55 } }];
	compareSegmentLists(path.segments, expectedSegments);

	var path = new Path.RegularPolygon(new Point(250, 250), 10, 100);
	var expectedSegments = [{ point: { x: 219.09814, y: 345.10547 } }, { point: { x: 169.09814, y: 308.77832 } }, { point: { x: 150, y: 250 } }, { point: { x: 169.09814, y: 191.22168 } }, { point: { x: 219.09814, y: 154.89453 } }, { point: { x: 280.90186, y: 154.89453 } }, { point: { x: 330.90186, y: 191.22168 } }, { point: { x: 350, y: 250 } }, { point: { x: 330.90186, y: 308.77832 } }, { point: { x: 280.90186, y: 345.10547 } }];
	compareSegmentLists(path.segments, expectedSegments);
});