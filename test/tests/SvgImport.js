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
 *
 * This test file was created by Stetson-Team-Alpha
 */

module('SvgImport');

test('Import complex CompoundPath and clone', function() {
	var svg = createSvg('<path id="path" fill="red" d="M4,14h20v-2H4V14z M15,26h7v-2h-7V26z M15,22h9v-2h-9V22z M15,18h9v-2h-9V18z M4,26h9V16H4V26z M28,10V6H0v22c0,0,0,4,4,4 h25c0,0,3-0.062,3-4V10H28z M4,30c-2,0-2-2-2-2V8h24v20c0,0.921,0.284,1.558,0.676,2H4z"/>;');
	var item = paper.project.importSvg(svg.getElementById('path'));
	compareItems(item, item.clone());
});

test('make an svg line', function() {
	var svgns = 'http://www.w3.org/2000/svg';
	var shape = document.createElementNS(svgns, 'line');
	var x1 = 5,
		x2 = 45,
		y1 = 5,
		y2 = 45;
	shape.setAttribute('x1', x1);
	shape.setAttribute('y1', y1);
	shape.setAttribute('x2', x2);
	shape.setAttribute('y2', y2);

	var importedLine = paper.project.importSvg(shape);

	var line = new Path.Line([x1, y1], [x2, y2]);

	compareSegmentLists(importedLine.segments, line.segments, true);
});

test('make an svg line with invalid values', function() {
	var svgns = 'http://www.w3.org/2000/svg';
	var shape = document.createElementNS(svgns, 'line');
	shape.setAttribute('x1', null);
	shape.setAttribute('y1', null);
	shape.setAttribute('x2', null);
	shape.setAttribute('y2', null);

	var importedLine = paper.project.importSvg(shape);

	var line = new Path.Line([0, 0], [0, 0]);

	compareSegmentLists(importedLine.segments, line.segments, true);
});

test('compare rectangle values', function() {
	var svgns = 'http://www.w3.org/2000/svg';
	var shape = document.createElementNS(svgns, 'rect');
	var x = 25,
		y = 25,
		width = 100,
		height = 100;
	shape.setAttribute('x', x);
	shape.setAttribute('y', y);
	shape.setAttribute('width', width);
	shape.setAttribute('height', height);

	var importedRectangle = paper.project.importSvg(shape);

	var topLeft = new Point(x, y);
	var size = new Size(width, height);
	var rectangle = new Rectangle(topLeft, size);
	var realRectangle = new Path.Rectangle(rectangle);

	compareSegmentLists(importedRectangle.segments, realRectangle.segments, true);
});


test('compare negative rectangle values', function() {
	var svgns = 'http://www.w3.org/2000/svg';
	var shape = document.createElementNS(svgns, 'rect');
	var x = -925,
		y = -111,
		width = -100,
		height = -18;
	shape.setAttribute('x', x);
	shape.setAttribute('y', y);
	shape.setAttribute('width', width);
	shape.setAttribute('height', height);

	var importedRectangle = paper.project.importSvg(shape);
		var topLeft = new Point(x, y);
		var size = new Size(width, height);
		var rectangle = new Rectangle(topLeft, size);
		var realRectangle = new Path.Rectangle(rectangle);
	
	compareSegmentLists(importedRectangle.segments, realRectangle.segments, true);
});


test('compare invalid rectangle values', function() {
	var svgns = 'http://www.w3.org/2000/svg';
	var shape = document.createElementNS(svgns, 'rect');

	shape.setAttribute('x', null);
	shape.setAttribute('y', null);
	shape.setAttribute('width', null);
	shape.setAttribute('height', null);

	var importedRectangle = paper.project.importSvg(shape);
	
	var topLeft = new Point(0, 0);
	var size = new Size(0, 0);
	var rectangle = new Rectangle(topLeft, size);
	var realRectangle = new Path.Rectangle(rectangle);

	compareSegmentLists(importedRectangle.segments, realRectangle.segments, true);
});

test('compare round rectangle values', function() {
	var svgns = 'http://www.w3.org/2000/svg';
	var shape = document.createElementNS(svgns, 'rect');
	var x = 25,
		y = 25,
		rx = 50,
		ry = 50,
		width = 100,
		height = 100;
	shape.setAttribute('x', x);
	shape.setAttribute('y', y);
	shape.setAttribute('rx', rx);
	shape.setAttribute('ry', ry);
	shape.setAttribute('width', width);
	shape.setAttribute('height', height);

	var importedRectangle = paper.project.importSvg(shape);

	var topLeft = new Point(x, y);
	var size = new Size(width, height);
	var cornerSize = new Size(rx, ry);
	var rectangle = new Rectangle(topLeft, size);
	var roundRect = new Path.RoundRectangle(rectangle, cornerSize);

	compareSegmentLists(importedRectangle.segments, roundRect.segments, true);
});

test('compare negative round rectangle values', function() {
	var svgns = 'http://www.w3.org/2000/svg';
	var shape = document.createElementNS(svgns, 'rect');
	var x = -25,
		y = -25,
		rx = -50,
		ry = -50,
		width = -100,
		height = -100;
	shape.setAttribute('x', x);
	shape.setAttribute('y', y);
	shape.setAttribute('rx', rx);
	shape.setAttribute('ry', ry);
	shape.setAttribute('width', width);
	shape.setAttribute('height', height);

	var importedRectangle = paper.project.importSvg(shape);

	var topLeft = new Point(x, y);
	var size = new Size(width, height);
	var cornerSize = new Size(rx, ry);
	var rectangle = new Rectangle(topLeft, size);
	var roundRect = new Path.RoundRectangle(rectangle, cornerSize);

	compareSegmentLists(importedRectangle.segments, roundRect.segments, true);
});

test('compare invalid round rectangle values', function() {
	var svgns = 'http://www.w3.org/2000/svg';
	var shape = document.createElementNS(svgns, 'rect');
	var x = null,
		y = null,
		rx = null,
		ry = null,
		width = null,
		height = null;
	shape.setAttribute('x', x);
	shape.setAttribute('y', y);
	shape.setAttribute('rx', rx);
	shape.setAttribute('ry', ry);
	shape.setAttribute('width', width);
	shape.setAttribute('height', height);

	var importedRectangle = paper.project.importSvg(shape);

	var topLeft = new Point(x, y);
	var size = new Size(width, height);
	var cornerSize = new Size(rx, ry);
	var rectangle = new Rectangle(topLeft, size);
	var roundRect = new Path.RoundRectangle(rectangle, cornerSize);

	compareSegmentLists(importedRectangle.segments, roundRect.segments, true);
});

test('compare ellipse values', function() {
	var svgns = 'http://www.w3.org/2000/svg';
	var shape = document.createElementNS(svgns, 'ellipse');
	var cx = 300,
		cy = 80,
		rx = 100,
		ry = 50;
	shape.setAttribute('cx', cx);
	shape.setAttribute('cy', cy);
	shape.setAttribute('rx', rx);
	shape.setAttribute('ry', ry);

	var importedEllipse = paper.project.importSvg(shape);

	var center = new Point(cx, cy);
	var offset = new Point(rx, ry);
	var topLeft = center.subtract(offset);
	var bottomRight = center.add(offset);

	var rect = new Rectangle(topLeft, bottomRight);
	var ellipse = new Path.Ellipse(rect);

	compareSegmentLists(importedEllipse.segments, ellipse.segments, true);
});

test('compare negative ellipse values', function() {
	var svgns = 'http://www.w3.org/2000/svg';
	var shape = document.createElementNS(svgns, 'ellipse');
	var cx = -111,
		cy = -2,
		rx = -292,
		ry = -1;
	shape.setAttribute('cx', cx);
	shape.setAttribute('cy', cy);
	shape.setAttribute('rx', rx);
	shape.setAttribute('ry', ry);

	var importedEllipse = paper.project.importSvg(shape);

	var center = new Point(cx, cy);
	var offset = new Point(rx, ry);
	var topLeft = center.subtract(offset);
	var bottomRight = center.add(offset);

	var rect = new Rectangle(topLeft, bottomRight);
	var ellipse = new Path.Ellipse(rect);

	compareSegmentLists(importedEllipse.segments, ellipse.segments, true);
});

test('compare invalid ellipse values', function() {
	var svgns = 'http://www.w3.org/2000/svg';
	var shape = document.createElementNS(svgns, 'ellipse');
	shape.setAttribute('cx', null);
	shape.setAttribute('cy', null);
	shape.setAttribute('rx', null);
	shape.setAttribute('ry', null);

	var importedEllipse = paper.project.importSvg(shape);

	var center = new Point(0, 0);
	var offset = new Point(0, 0);
	var topLeft = center.subtract(offset);
	var bottomRight = center.add(offset);

	var rect = new Rectangle(topLeft, bottomRight);
	var ellipse = new Path.Ellipse(rect);

	compareSegmentLists(importedEllipse.segments, ellipse.segments, true);
});

test('compare circle values', function() {
	var svgns = 'http://www.w3.org/2000/svg';
	var shape = document.createElementNS(svgns, 'circle');
	var cx = 100,
		cy = 80,
		r = 50;	
	shape.setAttribute('cx', cx);
	shape.setAttribute('cy', cy);
	shape.setAttribute('r', r);

	var importedCircle = paper.project.importSvg(shape);

	var center = new Point(cx, cy);
	var circle = new Path.Circle(center, r);

	compareSegmentLists(importedCircle.segments, circle.segments, true);
});

test('compare negative circle values', function() {
	var svgns = 'http://www.w3.org/2000/svg';
	var shape = document.createElementNS(svgns, 'circle');
	var cx = -234,
	cy = -77,
	r = -1110;
	shape.setAttribute('cx', cx);
	shape.setAttribute('cy', cy);
	shape.setAttribute('r', r);

	var importedCircle = paper.project.importSvg(shape);

	var center = new Point(cx, cy);
	var circle = new Path.Circle(center, r);

	compareSegmentLists(importedCircle.segments, circle.segments, true);
});


test('compare invalid circle values', function() {
	var svgns = 'http://www.w3.org/2000/svg';
	var shape = document.createElementNS(svgns, 'circle');
	shape.setAttribute('cx', null);
	shape.setAttribute('cy', null);
	shape.setAttribute('r', null);

	var importedCircle = paper.project.importSvg(shape);

	var center = new Point(0, 0);
	var circle = new Path.Circle(center, 0);

	compareSegmentLists(importedCircle.segments, circle.segments, true);

});

test('compare polygon values', function() {
	var svgns = 'http://www.w3.org/2000/svg';
	var shape = document.createElementNS(svgns, 'polygon');
	var svgpoints = "100,10 40,180 190,60 10,60 160,180";
	shape.setAttribute('points', svgpoints);

	var importedPolygon = paper.project.importSvg(shape);

	var poly = new Path();
	var points = shape.points;
	poly.moveTo(points.getItem(0));
	for (var i = 1; i < points.numberOfItems; i++) {
		poly.lineTo(points.getItem(i));
	}
	if (shape.nodeName.toLowerCase() == 'polygon') {
		poly.closePath();
	}

	compareSegmentLists(importedPolygon.segments, poly.segments, true);
});

test('compare negative polygon values', function() {
	var svgns = 'http://www.w3.org/2000/svg';
	var shape = document.createElementNS(svgns, 'polygon');
	var svgpoints = "-100,-10 -40,-180 -190,-60 -10,-60 -160,-180";
	shape.setAttribute('points', svgpoints);

	var importedPolygon = paper.project.importSvg(shape);

	var poly = new Path();
	var points = shape.points;
	poly.moveTo(points.getItem(0));
	for (var i = 1; i < points.numberOfItems; i++) {
		poly.lineTo(points.getItem(i));
	}
	if (shape.nodeName.toLowerCase() == 'polygon') {
		poly.closePath();
	}

	compareSegmentLists(importedPolygon.segments, poly.segments, true);
});

test('compare polyline values', function() {
	var svgns = 'http://www.w3.org/2000/svg';
	var shape = document.createElementNS(svgns, 'polyline');
	var svgpoints = "5,5 45,45 5,45 45,5";
	shape.setAttribute('points', svgpoints);

	var importedPolyline = paper.project.importSvg(shape);

	var poly = new Path();
	var points = shape.points;
	poly.moveTo(points.getItem(0));
	for (var i = 1; i < points.numberOfItems; i++) {
		poly.lineTo(points.getItem(i));
	}
	if (shape.nodeName.toLowerCase() == 'polygon') {
		poly.closePath();
	}

	compareSegmentLists(importedPolyline.segments, poly.segments, true);
});

test('compare negative polyline values', function() {
	var svgns = 'http://www.w3.org/2000/svg';
	var shape = document.createElementNS(svgns, 'polyline');
	var svgpoints = "-5,-5 -45,-45 -5,-45 -45,-5";
	shape.setAttribute('points', svgpoints);

	var importedPolyline = paper.project.importSvg(shape);

	var poly = new Path();
	var points = shape.points;
	poly.moveTo(points.getItem(0));
	for (var i = 1; i < points.numberOfItems; i++) {
		poly.lineTo(points.getItem(i));
	}
	if (shape.nodeName.toLowerCase() == 'polygon') {
		poly.closePath();
	}

	compareSegmentLists(importedPolyline.segments, poly.segments, true);
});

test('make a text', function() {
  var svgns = 'http://www.w3.org/2000/svg';
	var text = document.createElementNS(svgns, 'text');
	var tspanTextContent = "sample text";
	text.textContent = tspanTextContent;
	var importedText = paper.project.importSvg(text);
	equals(text.textContent, importedText.content, true);
});

test('make a text with tspan', function() {
  var svgns = 'http://www.w3.org/2000/svg';
	var text = document.createElementNS(svgns, 'text');
	var tspan = document.createElementNS(svgns, 'tspan');
	var tspanTextContent = "sample text";
	tspan.textContent = tspanTextContent;
	text.appendChild(tspan);
	var importedText = paper.project.importSvg(text);
	equals(text.textContent, importedText.children[0].content, true);
});

