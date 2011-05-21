module('Layer');

test('previousSibling / nextSibling', function() {
	var project = paper.project;
	var firstLayer = project.activeLayer;
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
		return project.layers.length == 2;
	}, true);
	
	firstLayer.appendTop(secondLayer);
	equals(function() {
		return project.layers.length == 1;
	}, true);
});

test('moveAbove / moveBelow', function() {
	var project = paper.project;
	var firstLayer = project.activeLayer;
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
		return project.layers.length;
	}, 1);
});

test('appendTop / appendBottom / nesting', function() {
	var project = paper.project;
	var firstLayer = project.activeLayer;
	var secondLayer = new Layer();
	// There should be two layers now in project.layers
	equals(function() {
		return project.layers.length;
	}, 2);
	firstLayer.appendTop(secondLayer);
	equals(function() {
		return secondLayer.parent == firstLayer;
	}, true);
	// There should only be the firsLayer now in project.layers
	equals(function() {
		return project.layers.length;
	}, 1);
	equals(function() {
		return project.layers[0] == firstLayer;
	}, true);
	// Now move secondLayer bellow the first again, in which case it should
	// reappear in project.layers
	secondLayer.moveBelow(firstLayer);
	// There should be two layers now in project.layers again now
	equals(function() {
		return project.layers.length;
	}, 2);
	equals(function() {
		return project.layers[0] == firstLayer
			&& project.layers[1] == secondLayer;
	}, true);
});