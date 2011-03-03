module('Path');

test('path.currentSegment', function() {
	var doc = new Document();
	var path = new Path();
	path.moveTo([50, 50]);
	path.lineTo([100, 100]);
	
	compareSegments(path.segments[1], path.currentSegment);
});