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