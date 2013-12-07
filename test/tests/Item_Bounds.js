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

module('Item Bounds');

test('item.bounds caching', function() {
	var circle = new Path.Circle(new Point(100, 100), 50);
	var rectangle = new Path.Rectangle(new Point(75, 75), new Point(175, 175));
	var group = new Group([circle, rectangle]);
	compareRectangles(group.bounds, { x: 50, y: 50, width: 125, height: 125 }, 'group.bounds');
	rectangle.remove();
	equals(function() {
		return group.children.length;
	}, 1);
	compareRectangles(group.bounds, { x: 50, y: 50, width: 100, height: 100 }, 'group.bounds without rectangle');
	group.addChild(rectangle);
	equals(function() {
		return group.children.length;
	}, 2);
	compareRectangles(group.bounds, { x: 50, y: 50, width: 125, height: 125 }, 'group.bounds with rectangle');
	circle.remove();
	equals(function() {
		return group.children.length;
	}, 1);
	compareRectangles(group.bounds, { x: 75, y: 75, width: 100, height: 100 }, 'group.bounds without circle');
	group.addChild(circle);
	equals(function() {
		return group.children.length;
	}, 2);
	compareRectangles(group.bounds, { x: 50, y: 50, width: 125, height: 125 }, 'group.bounds with circle');
});

test('group.bounds when group contains empty group', function() {
	var group = new Group();
	var rectangle = new Path.Rectangle(new Point(75, 75), new Point(175, 175));
	group.addChild(rectangle);
	compareRectangles(group.bounds, { x: 75, y: 75, width: 100, height: 100 }, 'group.bounds without empty group');
	group.addChild(new Group());
	compareRectangles(group.bounds, { x: 75, y: 75, width: 100, height: 100 }, 'group.bounds with empty group');
});

test('group.bounds and position after children were modified', function() {
	var group = new Group();
	var rectangle = new Path.Rectangle(new Point(100, 100), new Point(200, 200));
	group.addChild(rectangle);
	compareRectangles(group.bounds, { x: 100, y: 100, width: 100, height: 100 }, 'group.bounds before change');
	comparePoints(group.position, { x: 150, y: 150 }, 'group.position before change');
	rectangle.firstSegment.point = [0, 0];
	compareRectangles(group.bounds, { x: 0, y: 0, width: 200, height: 200 }, 'group.bounds after change');
	comparePoints(group.position, { x: 100, y: 100 }, 'group.position after change');
});

test('path.bounds when contained in a transformed group', function() {
	var path = new Path([10, 10], [60, 60]);
	var group = new Group([path]);
	compareRectangles(path.bounds, { x: 10, y: 10, width: 50, height: 50 }, 'path.bounds before group translation');
	group.translate(100, 100);
	compareRectangles(path.bounds, { x: 110, y: 110, width: 50, height: 50 }, 'path.bounds after group translation');
});

test('text.bounds', function() {
	var text = new PointText(new Point(50, 100));
	text.fillColor = 'black';
	text.content = 'This is a test';
	compareRectangles(text.bounds, { x: 50, y: 89.2, width: 67, height: 14.4 } , 'text.bounds');
});
