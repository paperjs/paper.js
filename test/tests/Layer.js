module('Layer');

test('previousSibling / nextSibling', function() {
	var proj = paper.project;
	var firstLayer = proj.activeLayer;
	var secondLayer = new Layer();
	equals(function() {
		return secondLayer.previousSibling == firstLayer;
	}, true);
	equals(function() {
		return secondLayer.nextSibling == null;
	}, true);
	
	// Move another layer into secondLayer and check nextSibling /
	// previousSibling:
	var path = new Path();
	var thirdLayer = new Layer();
	secondLayer.appendBottom(thirdLayer);
	equals(function() {
		return secondLayer.children.length;
	}, 2);
	equals(function() {
		return thirdLayer.nextSibling == path;
	}, true);
	secondLayer.appendTop(thirdLayer);
	equals(function() {
		return thirdLayer.nextSibling == null;
	}, true);
	equals(function() {
		return thirdLayer.previousSibling == path;
	}, true);
	equals(function() {
		return proj.layers.length == 2;
	}, true);
	
	firstLayer.appendTop(secondLayer);
	equals(function() {
		return proj.layers.length == 1;
	}, true);
});

test('moveAbove / moveBelow', function() {
	var proj = paper.project;
	var firstLayer = proj.activeLayer;
	var secondLayer = new Layer();
	secondLayer.moveBelow(firstLayer);
	equals(function() {
		return secondLayer.previousSibling == null;
	}, true);
	equals(function() {
		return secondLayer.nextSibling == firstLayer;
	}, true);
	
	var path = new Path();
	firstLayer.appendTop(path);

	// move the layer above the path, inside the firstLayer:
	secondLayer.moveAbove(path);
	equals(function() {
		return secondLayer.previousSibling == path;
	}, true);
	equals(function() {
		return secondLayer.parent == firstLayer;
	}, true);
	// There should now only be one layer left:
	equals(function() {
		return proj.layers.length;
	}, 1);
});