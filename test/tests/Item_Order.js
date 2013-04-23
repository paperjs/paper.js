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

test('Item Order', function() {
	var line = new Path();
	line.add([0, 0], [100, 100]);
	line.name = 'line';

	var circle = new Path.Circle([50, 50], 50);
	circle.name = 'circle';

	var group = new Group([circle]);
	group.name = 'group';

	equals(function() {
		return circle.isAbove(line);
	}, true);
	equals(function() {
		return line.isBelow(circle);
	}, true);

	equals(function() {
		return group.isAbove(line);
	}, true);
	equals(function() {
		return line.isBelow(group);
	}, true);


	equals(function() {
		return group.isAncestor(circle);
	}, true);

	equals(function() {
		return circle.isDescendant(group);
	}, true);


	equals(function() {
		return group.isAbove(circle);
	}, false);

	equals(function() {
		return group.isBelow(circle);
	}, false);
});

test('Item#moveAbove(item) / Item#moveBelow(item)', function() {
	var item0, item1, item2;
	var testMove = function(command, indexes) {
		paper.project.clear();
		new Layer();
		item0 = new Group();
		item1 = new Group();
		item2 = new Group();
		command();
		equals(function() {
			return item0.index;
		}, indexes[0], command.toString());
		equals(function() {
			return item1.index;
		}, indexes[1]);
		equals(function() {
			return item2.index;
		}, indexes[2]);
	}

	testMove(function() { item0.moveBelow(item0) }, [0,1,2]);
	testMove(function() { item0.moveBelow(item1) }, [0,1,2]);
	testMove(function() { item0.moveBelow(item2) }, [1,0,2]);
	testMove(function() { item1.moveBelow(item0) }, [1,0,2]);
	testMove(function() { item1.moveBelow(item1) }, [0,1,2]);
	testMove(function() { item1.moveBelow(item2) }, [0,1,2]);

	testMove(function() { item2.moveBelow(item0) }, [1,2,0]);
	testMove(function() { item2.moveBelow(item1) }, [0,2,1]);
	testMove(function() { item2.moveBelow(item2) }, [0,1,2]);
 
	testMove(function() { item0.moveAbove(item0) }, [0,1,2]);
	testMove(function() { item0.moveAbove(item1) }, [1,0,2]);
	testMove(function() { item0.moveAbove(item2) }, [2,0,1]);
	testMove(function() { item1.moveAbove(item0) }, [0,1,2]);
	testMove(function() { item1.moveAbove(item1) }, [0,1,2]);
	testMove(function() { item1.moveAbove(item2) }, [0,2,1]);
	testMove(function() { item2.moveAbove(item0) }, [0,2,1]);
	testMove(function() { item2.moveAbove(item1) }, [0,1,2]);
	testMove(function() { item2.moveAbove(item2) }, [0,1,2]);
});
