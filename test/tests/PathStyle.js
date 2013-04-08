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

module('Path Style');

test('style defaults', function() {
	var path = new Path();
	equals(function() {
		return path.strokeWidth;
	}, 1);
	equals(function() {
		return path.strokeCap;
	}, 'butt');
	equals(function() {
		return path.strokeJoin;
	}, 'miter');
	equals(function() {
		return path.miterLimit;
	}, 10);
	equals(function() {
		return path.dashOffset;
	}, 0);
	equals(function() {
		return path.dashArray + '';
	}, [] + '');
});

test('currentStyle', function() {
	paper.project.currentStyle.fillColor = 'black';
	var path = new Path();
	compareColors(path.fillColor, 'black', 'path.fillColor');

	// When changing the current style of the project, the style of
	// paths created using project.currentStyle should not change.
	paper.project.currentStyle.fillColor = 'red';
	compareColors(path.fillColor, 'black', 'path.fillColor');
});

test('setting currentStyle to an object', function() {
	paper.project.currentStyle = {
		fillColor: 'red',
		strokeColor: 'green'
	};
	var path = new Path();
	compareColors(path.fillColor, 'red', 'path.fillColor');
	compareColors(path.strokeColor, 'green', 'path.strokeColor');
});

test('setting path styles to an object', function() {
	var path = new Path();
	path.style = {
		fillColor: 'red',
		strokeColor: 'green'
	};
	compareColors(path.fillColor, 'red', 'path.fillColor');
	compareColors(path.strokeColor, 'green', 'path.strokeColor');
});

test('setting group styles to an object', function() {
	var group = new Group();
	var path = new Path();
	group.addChild(path);
	group.style = {
		fillColor: 'red',
		strokeColor: 'green'
	};
	compareColors(path.fillColor, 'red', 'path.fillColor');
	compareColors(path.strokeColor, 'green', 'path.strokeColor');
});

test('getting group styles', function() {
	var group = new Group();
	var path = new Path();
	path.fillColor = 'red';
	group.addChild(path);

	compareColors(group.fillColor, 'red', 'group.fillColor');

	var secondPath = new Path();
	secondPath.fillColor = 'black';
	group.addChild(secondPath);

	// the group now contains two paths with different fillColors and therefore
	// should return undefined:
	equals(function() {
		return group.fillColor;
	}, undefined);

	//If we remove the first path, it should now return 'black':
	group.children[0].remove();
	compareColors(group.fillColor, 'black', 'group.fillColor');
});

test('setting group styles', function() {
	var group = new Group();
	var path = new Path();
	path.fillColor = 'red';
	group.addChild(path);

	var secondPath = new Path();
	secondPath.fillColor = 'blue';
	secondPath.strokeColor = 'red';
	group.addChild(secondPath);

	// Change the fill color of the group:
	group.fillColor = 'black';

	// the paths contained in the group should now both have their fillColor
	// set to black:
	compareColors(path.fillColor, 'black', 'path.fillColor');
	compareColors(secondPath.fillColor, 'black', 'secondPath.fillColor');

	// The second path still has its strokeColor set to red:
	compareColors(secondPath.strokeColor, 'red', 'secondPath.strokeColor');
});

test('setting group styles 2', function() {
	var group = new Group();
	var path = new Path();
	path.fillColor = 'red';
	group.addChild(path);

	compareColors(group.fillColor, 'red', 'group.fillColor');

	var secondPath = new Path();
	secondPath.fillColor = 'blue';
	secondPath.strokeColor = 'red';
	group.addChild(secondPath);

	compareColors(secondPath.fillColor, 'blue', 'secondPath.fillColor');
	compareColors(secondPath.strokeColor, 'red', 'secondPath.strokeColor');

	// By appending a path with a different fillcolor,
	// the group's fillColor should return undefined:
	equals(function() {
		return group.fillColor;
	}, undefined);

	// But, both paths have a red strokeColor, so:
	compareColors(group.strokeColor, 'red', 'group.strokeColor');

	// Change the fill color of the group's style:
	group.style.fillColor = 'black';

	// the paths contained in the group should now both have their fillColor
	// set to black:
	compareColors(path.fillColor, 'black', 'path.fillColor');
	compareColors(secondPath.fillColor, 'black', 'secondPath.fillColor');

	// The second path still has its strokeColor set to red:
	compareColors(secondPath.strokeColor, 'red', 'secondPath.strokeColor');
});