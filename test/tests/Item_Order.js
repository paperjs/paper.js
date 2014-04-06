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

test('Item#insertAbove(item) / Item#insertBelow(item)', function() {
	var item0, item1, item2;

	function testMove(command, indexes) {
		paper.project.clear();
		new Layer();
		item0 = new Group();
		item1 = new Group();
		item2 = new Group();
		command();
		var str = getFunctionBody(command);
		equals(item0.index, indexes[0], str + ': item0.index');
		equals(item1.index, indexes[1], str + ': item1.index');
		equals(item2.index, indexes[2], str + ': item2.index');
	}

	testMove(function() { item0.insertBelow(item0) }, [0,1,2]);
	testMove(function() { item0.insertBelow(item1) }, [0,1,2]);
	testMove(function() { item0.insertBelow(item2) }, [1,0,2]);
	testMove(function() { item1.insertBelow(item0) }, [1,0,2]);
	testMove(function() { item1.insertBelow(item1) }, [0,1,2]);
	testMove(function() { item1.insertBelow(item2) }, [0,1,2]);

	testMove(function() { item2.insertBelow(item0) }, [1,2,0]);
	testMove(function() { item2.insertBelow(item1) }, [0,2,1]);
	testMove(function() { item2.insertBelow(item2) }, [0,1,2]);

	testMove(function() { item0.insertAbove(item0) }, [0,1,2]);
	testMove(function() { item0.insertAbove(item1) }, [1,0,2]);
	testMove(function() { item0.insertAbove(item2) }, [2,0,1]);
	testMove(function() { item1.insertAbove(item0) }, [0,1,2]);
	testMove(function() { item1.insertAbove(item1) }, [0,1,2]);
	testMove(function() { item1.insertAbove(item2) }, [0,2,1]);
	testMove(function() { item2.insertAbove(item0) }, [0,2,1]);
	testMove(function() { item2.insertAbove(item1) }, [0,1,2]);
	testMove(function() { item2.insertAbove(item2) }, [0,1,2]);
});
