/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

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
	secondLayer.insertChild(0, thirdLayer);
	equals(function() {
		return secondLayer.children.length;
	}, 2);
	equals(function() {
		return thirdLayer.nextSibling == path;
	}, true);
	secondLayer.addChild(thirdLayer);
	equals(function() {
		return thirdLayer.nextSibling == null;
	}, true);
	equals(function() {
		return thirdLayer.previousSibling == path;
	}, true);
	equals(function() {
		return project.layers.length == 2;
	}, true);

	firstLayer.addChild(secondLayer);
	equals(function() {
		return project.layers.length == 1;
	}, true);
});

test('insertAbove / insertBelow', function() {
	var project = paper.project;
	var firstLayer = project.activeLayer;
	var secondLayer = new Layer();
	var thirdLayer = new Layer();

	thirdLayer.insertBelow(firstLayer);
	equals(function() {
		return thirdLayer.previousSibling == null;
	}, true);
	equals(function() {
		return thirdLayer.nextSibling == firstLayer;
	}, true);

	secondLayer.insertBelow(firstLayer);
	equals(function() {
		return secondLayer.previousSibling == thirdLayer;
	}, true);
	equals(function() {
		return secondLayer.nextSibling == firstLayer;
	}, true);

	var path = new Path();
	firstLayer.addChild(path);

	// move the layer above the path, inside the firstLayer.
	// 'Above' means visually appearing on top, thus with a larger index.
	secondLayer.insertAbove(path);
	equals(function() {
		return path.nextSibling == secondLayer;
	}, true);
	equals(function() {
		return secondLayer.parent == firstLayer;
	}, true);
	// There should now only be two layers left:
	equals(function() {
		return project.layers.length;
	}, 2);
});

test('addChild / appendBottom / nesting', function() {
	var project = paper.project;
	var firstLayer = project.activeLayer;
	var secondLayer = new Layer();
	// There should be two layers now in project.layers
	equals(function() {
		return project.layers.length;
	}, 2);
	firstLayer.addChild(secondLayer);
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
	secondLayer.insertBelow(firstLayer);
	// There should be two layers now in project.layers again now
	equals(function() {
		return project.layers.length;
	}, 2);
	equals(function() {
		return project.layers[0] == secondLayer
			&& project.layers[1] == firstLayer;
	}, true);
});
