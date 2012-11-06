/*
 * Paper.js
 *
 * This file is part of Paper.js, a JavaScript Vector Graphics Library,
 * based on Scriptographer.org and designed to be largely API compatible.
 * http://paperjs.org/
 * http://scriptographer.org/
 *
 * Copyright (c) 2011, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

module('Group');

test('new Group()', function() {
	var group = new Group();
	equals(function() {
		return paper.project.activeLayer.children[0] == group;
	}, true);
});

test('new Group([])', function() {
	var group = new Group([]);
	equals(function() {
		return paper.project.activeLayer.children[0] == group;
	}, true);
	equals(function() {
		return group.children.length;
	}, 0);
});

test('new Group([item])', function() {
	var path = new Path();
	var group = new Group([path]);
	equals(function() {
		return paper.project.activeLayer.children.length;
	}, 1);
	equals(function() {
		return group.children[0] == path;
	}, true);
});

test('Group bounds', function() {
	paper.project.currentStyle = {
		strokeWidth: 5,
		strokeColor: 'black'
	};

	var path = new Path.Circle([150, 150], 60);
	var secondPath = new Path.Circle([175, 175], 85);
	var group = new Group([path, secondPath]);
	compareRectangles(group.bounds, { x: 90, y: 90, width: 170, height: 170 }, 'group.bounds');
	compareRectangles(group.strokeBounds, { x: 87.5, y: 87.5, width: 175, height: 175 }, 'group.strokeBounds');

	group.rotate(20);
	compareRectangles(group.bounds, { x: 89.97681, y: 82.94095, width: 170.04639, height: 177.08224 }, 'rotated group.bounds');
	compareRectangles(group.strokeBounds, { x: 87.47681, y: 80.44095, width: 175.04639, height: 182.08224 }, 'rotated group.strokeBounds');
	group.rotate(20, new Point(50, 50));
	compareRectangles(group.bounds, { x: 39.70692, y: 114.99196, width: 170.00412, height: 180.22401 }, 'rotated group.bounds');
	compareRectangles(group.strokeBounds, { x: 37.20692, y: 112.49196, width: 175.00412, height: 185.22401 }, 'rotated group.strokeBounds');
});

test('group.addChildren(otherGroup.children)', function() {
	var group = new Group();
	group.addChild(new Path());
	group.addChild(new Path());
	equals(function() {
		return group.children.length;
	}, 2);

	var secondGroup = new Group();
	secondGroup.addChildren(group.children);
	equals(function() {
		return secondGroup.children.length;
	}, 2);
	equals(function() {
		return group.children.length;
	}, 0);
});

test('group.insertChildren(0, otherGroup.children)', function() {
	var group = new Group();
	group.addChild(new Path());
	group.addChild(new Path());
	equals(function() {
		return group.children.length;
	}, 2);

	var secondGroup = new Group();
	secondGroup.insertChildren(0, group.children);
	equals(function() {
		return secondGroup.children.length;
	}, 2);
	equals(function() {
		return group.children.length;
	}, 0);
});