module('Path');

test('path.join(path)', function() {
	var doc = new Document();
	var path = new Path();
	path.add([0, 0]);
	path.add([10, 0]);
	
	var path2 = new Path();
	path2.add([10, 0]);
	path2.add([20, 10]);
	
	path.join(path2);
	equals(path.segments.toString(), '{ point: { x: 0, y: 0 } },{ point: { x: 10, y: 0 } },{ point: { x: 20, y: 10 } }');
	equals(doc.activeLayer.children.length, 1);

	var path = new Path();
	path.add([0, 0]);
	path.add([10, 0]);
	
	var path2 = new Path();
	path2.add([20, 10]);
	path2.add([10, 0]);
	path.join(path2);
	equals(path.segments.toString(), '{ point: { x: 0, y: 0 } },{ point: { x: 10, y: 0 } },{ point: { x: 20, y: 10 } }');
		
	var path = new Path();
	path.add([0, 0]);
	path.add([10, 0]);

	var path2 = new Path();
	path2.add([30, 10]);
	path2.add([40, 0]);
	path.join(path2);
	equals(path.segments.toString(), '{ point: { x: 0, y: 0 } },{ point: { x: 10, y: 0 } },{ point: { x: 30, y: 10 } },{ point: { x: 40, y: 0 } }');

	var path = new Path();
	path.add([0, 0]);
	path.add([10, 0]);
	path.add([20, 10]);

	var path2 = new Path();
	path2.add([0, 0]);
	path2.add([10, 5]);
	path2.add([20, 10]);
	
	path.join(path2);
	
	equals(path.segments.toString(), '{ point: { x: 0, y: 0 } },{ point: { x: 10, y: 0 } },{ point: { x: 20, y: 10 } },{ point: { x: 10, y: 5 } }');
	equals(path.closed, true);
});

test('path.remove()', function() {
	var doc = new Document();
	var path = new Path();
	path.add([0, 0]);
	path.add([10, 0]);
	path.add([20, 0]);
	path.add([30, 0]);
	
	path.removeSegment(0);
	equals(path.segments.length, 3);

	path.removeSegment(0);
	equals(path.segments.length, 2);

	path.removeSegments(0, 2);
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
	equals(path.segments.toString(), '{ point: { x: 100, y: 130 }, handleIn: { x: -16.56854, y: 0 }, handleOut: { x: 16.56854, y: 0 } },{ point: { x: 130, y: 100 }, handleIn: { x: 0, y: 16.56854 }, handleOut: { x: 0, y: -16.56854 } },{ point: { x: 100, y: 70 }, handleIn: { x: 16.56854, y: 0 }, handleOut: { x: -16.56854, y: 0 } },{ point: { x: 70, y: 100 }, handleIn: { x: 0, y: -16.56854 }, handleOut: { x: 0, y: 16.56854 } }');
});

