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