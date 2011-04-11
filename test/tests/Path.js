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