module('Layer');

test('previousSibling / nextSibling', function() {
	var doc = new Document();
	var firstLayer = doc.activeLayer;
	var secondLayer = new Layer();
	equals(secondLayer.previousSibling == firstLayer, true);
	equals(secondLayer.nextSibling == null, true);
	
	// Move another layer into secondLayer and check nextSibling /
	// previousSibling:
	var path = new Path();
	var thirdLayer = new Layer();
	secondLayer.appendBottom(thirdLayer);
	equals(secondLayer.children.length, 2);
	equals(thirdLayer.nextSibling == path, true);
	secondLayer.appendTop(thirdLayer);
	equals(thirdLayer.nextSibling == null, true);
	equals(thirdLayer.previousSibling == path, true);
	equals(doc.layers.length == 2, true);
	
	firstLayer.appendTop(secondLayer);
	equals(doc.layers.length == 1, true);
});

test('moveAbove / moveBelow', function() {
	var doc = new Document();
	var firstLayer = doc.activeLayer;
	var secondLayer = new Layer();
	secondLayer.moveBelow(firstLayer);
	equals(secondLayer.previousSibling == null, true);
	equals(secondLayer.nextSibling == firstLayer, true);
	
	var path = new Path();
	firstLayer.appendTop(path);

	// move the layer above the path, inside the firstLayer:
	secondLayer.moveAbove(path);
	equals(secondLayer.previousSibling == path, true);
	equals(secondLayer.parent == firstLayer, true);

	// There should now only be one layer left:
	equals(doc.layers.length, 1);
});