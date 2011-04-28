module('Path');

test('path.join(path)', function() {
	var doc = new Document();
	var path = new Path();
	path.add(0, 0);
	path.add(10, 0);
	
	var path2 = new Path();
	path2.add(10, 0);
	path2.add(20, 10);
	
	path.join(path2);
	compareSegmentLists(path.segments, [new Segment(new Point(0, 0)),
		new Segment(new Point(10, 0)), new Segment(new Point(20, 10))]);
	equals(doc.activeLayer.children.length, 1);

	var path = new Path();
	path.add(0, 0);
	path.add(10, 0);
	
	var path2 = new Path();
	path2.add(20, 10);
	path2.add(10, 0);
	path.join(path2);
	compareSegmentLists(path.segments, [new Segment(new Point(0, 0)),
		new Segment(new Point(10, 0)), new Segment(new Point(20, 10))]);
		
	var path = new Path();
	path.add(0, 0);
	path.add(10, 0);

	var path2 = new Path();
	path2.add(30, 10);
	path2.add(40, 0);
	path.join(path2);
	compareSegmentLists(path.segments, [new Segment(new Point(0, 0)),
		new Segment(new Point(10, 0)), new Segment(new Point(30, 10)),
		new Segment(new Point(40, 0))]);
	
	var path = new Path();
	path.add(0, 0);
	path.add(10, 0);
	path.add(20, 10);

	var path2 = new Path();
	path2.add(0, 0);
	path2.add(10, 5);
	path2.add(20, 10);
	
	path.join(path2);
	compareSegmentLists(path.segments, [new Segment(new Point(0, 0)),
		new Segment(new Point(10, 0)), new Segment(new Point(20, 10)),
		new Segment(new Point(10, 5))]);
	equals(path.closed, true);
});

test('path.remove()', function() {
	var doc = new Document();
	var path = new Path();
	path.add(0, 0);
	path.add(10, 0);
	path.add(20, 0);
	path.add(30, 0);
	
	path.removeSegment(0);
	equals(path.segments.length, 3);

	path.removeSegment(0);
	equals(path.segments.length, 2);

	path.removeSegments(0, 1);
	equals(path.segments.length, 0);

	path.remove();
	
	equals(doc.activeLayer.children.length, 0);
});


test('Is the path deselected after setting a new list of segments?', function() {
	var doc = new Document();
	var path = new Path([0, 0]);
	path.selected = true;
	equals(path.selected, true);
	equals(doc.selectedItems.length, 1);

	path.segments = [[0, 10]];
	equals(path.selected, false);
	equals(doc.selectedItems.length, 0);
});

test('Path#reverse', function() {
	var doc = new Document();
	var path = new Path.Circle([100, 100], 30);
	path.reverse();
	compareSegmentLists(path.segments, [new Segment(new Point(100, 130),
		new Point(-16.568359375, 0), new Point(16.568359375, 0)),
		new Segment(new Point(130, 100), new Point(0, 16.568359375),
		new Point(0, -16.568359375)), new Segment(new Point(100, 70),
		new Point(16.568359375, 0), new Point(-16.568359375, 0)),
		new Segment(new Point(70, 100), new Point(0, -16.568359375),
		new Point(0, 16.568359375))]);
});

