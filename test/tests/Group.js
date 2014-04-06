/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2014, Juerg Lehni & Jonathan Puckey
 * http://scratchdisk.com/ & http://jonathanpuckey.com/
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

test('new Group({children:[item]})', function() {
	var path = new Path();
	var group = new Group({
		children: [path]
	});
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
	compareRectangles(group.bounds, { x: 89.97687, y: 82.94085, width: 170.04627, height: 177.08228 }, 'rotated group.bounds');
	compareRectangles(group.strokeBounds, { x: 87.47687, y: 80.44085, width: 175.04627, height: 182.08228 }, 'rotated group.strokeBounds');
	group.rotate(20, new Point(50, 50));
	compareRectangles(group.bounds, { x: 39.70708, y: 114.9919, width: 170.00396, height: 180.22418 }, 'rotated group.bounds');
	compareRectangles(group.strokeBounds, { x: 37.20708, y: 112.4919, width: 175.00396, height: 185.22418 }, 'rotated group.strokeBounds');
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
