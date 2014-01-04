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

module('Project');

test('activate()', function() {
	var project = new Project();
	var secondDoc = new Project();
	project.activate();
	var path = new Path();
	equals(function() {
		return project.activeLayer.children[0] == path;
	}, true);
	equals(function() {
		return secondDoc.activeLayer.children.length == 0;
	}, true);
});

test('clear()', function() {
    var project = new Project();
    new Layer();
    new Layer();
    equals(project.layers.length, 3);
    project.clear();
    equals(project.layers.length, 0);
});
