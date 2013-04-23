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

module('SVGExport');

test('compare line path functions', function() {
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

	var line = new Path.Line([x1, y1], [x2, y2]);

	var exportedLine = line.exportSVG();

	var shapex1 = shape.getAttribute('x1');
	var shapey1 = shape.getAttribute('y1');
	var shapex2 = shape.getAttribute('x2');
	var shapey2 = shape.getAttribute('y2');

	var exportedx1 = exportedLine.getAttribute('x1');
	var exportedy1 = exportedLine.getAttribute('y1');
	var exportedx2 = exportedLine.getAttribute('x2');
	var exportedy2 = exportedLine.getAttribute('y2');

	equals(shapex1, exportedx1);
	equals(shapey1, exportedy1);
	equals(shapex2, exportedx2);
	equals(shapey2, exportedy2);

});

test('compare negative line path functions', function() {
	var svgns = 'http://www.w3.org/2000/svg';
	var shape = document.createElementNS(svgns, 'line');
	var x1 = -5,
		x2 = -45,
		y1 = -5,
		y2 = -45;
	shape.setAttribute('x1', x1);
	shape.setAttribute('y1', y1);
	shape.setAttribute('x2', x2);
	shape.setAttribute('y2', y2);

	var line = new Path.Line([x1, y1], [x2, y2]);

	var exportedLine = line.exportSVG();

	var shapex1 = shape.getAttribute('x1');
	var shapey1 = shape.getAttribute('y1');
	var shapex2 = shape.getAttribute('x2');
	var shapey2 = shape.getAttribute('y2');

	var exportedx1 = exportedLine.getAttribute('x1');
	var exportedy1 = exportedLine.getAttribute('y1');
	var exportedx2 = exportedLine.getAttribute('x2');
	var exportedy2 = exportedLine.getAttribute('y2');

	equals(shapex1, exportedx1);
	equals(shapey1, exportedy1);
	equals(shapex2, exportedx2);
	equals(shapey2, exportedy2);

});

test('compare invalid line path functions', function() {
	var svgns = 'http://www.w3.org/2000/svg';
	var shape = document.createElementNS(svgns, 'line');
	var x1 = null,
		x2 = null,
		y1 = null,
		y2 = null;
	shape.setAttribute('x1', x1);
	shape.setAttribute('y1', y1);
	shape.setAttribute('x2', x2);
	shape.setAttribute('y2', y2);
	
	var line = new Path.Line([x1, y1], [x2, y2]);

	var exportedLine = line.exportSVG();

	var shapex1 = shape.getAttribute('x1');
	var shapey1 = shape.getAttribute('y1');
	var shapex2 = shape.getAttribute('x2');
	var shapey2 = shape.getAttribute('y2');

	var exportedx1 = exportedLine.getAttribute('x1');
	var exportedy1 = exportedLine.getAttribute('y1');
	var exportedx2 = exportedLine.getAttribute('x2');
	var exportedy2 = exportedLine.getAttribute('y2');

	equals(shapex1, exportedx1);
	equals(shapey1, exportedy1);
	equals(shapex2, exportedx2);
	equals(shapey2, exportedy2);

});

/*test('compare rectangle values', function() {
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

	var point = new Point(100, 100);
	var size = new Size(100, 100);
	var path = new Path.Rectangle(point, size);
	
	var exportedRectangle = path.exportSVG();

	var shapex1 = shape.getAttribute('x');
	var shapey1 = shape.getAttribute('y1');
	var shapewidth = shape.getAttribute('width');
	var shapeheight = shape.getAttribute('height');

	var exportedx = exportedRectangle.getAttribute('x1');
	var exportedy = exportedRectangle.getAttribute('y1');

	var exportedwidth = exportedRectangle.getAttribute('width');
	var exportedheight = exportedRectangle.getAttribute('height');

	equals(shapex, exportedx);
	equals(shapey, exportedy);
	equals(shapewidth, exportedwidth);
	equals(shapeheight, exportedheight);
});

test('compare negative rectangle values', function() {
	var svgns = 'http://www.w3.org/2000/svg';
	var shape = document.createElementNS(svgns, 'rect');
	var x = -25,
		y = -25,
		width = -100,
		height = -100;
	shape.setAttribute('x', x);
	shape.setAttribute('y', y);
	shape.setAttribute('width', width);
	shape.setAttribute('height', height);

	var topLeft = new Point(x, y);
	var size = new Size(width, height);
	var rect = new Rectangle(topLeft, size);

	var exportedRectangle = rect.exportSVG();

	var shapex = shape.getAttribute('x');
	var shapey = shape.getAttribute('y');
	var shapewidth = shape.getAttribute('width');
	var shapeheight = shape.getAttribute('height');

	var exportedx = exportedRectangle.getAttribute('x');
	var exportedy = exportedRectangle.getAttribute('y');
	var exportedwidth = exportedRectangle.getAttribute('width');
	var exportedheight = exportedRectangle.getAttribute('height');

	equals(shapex, exportedx);
	equals(shapey, exportedy);
	equals(shapewidth, exportedwidth);
	equals(shapeheight, exportedheight);
});

test('compare invalid rectangle values', function() {
	var svgns = 'http://www.w3.org/2000/svg';
	var shape = document.createElementNS(svgns, 'rect');
	var x = null,
		y = null,
		width = null,
		height = 100;
	shape.setAttribute('x', x);
	shape.setAttribute('y', y);
	shape.setAttribute('width', width);
	shape.setAttribute('height', height);

	var topLeft = new Point(x, y);
	var size = new Size(width, height);
	var rect = new Rectangle(topLeft, size);

	var exportedRectangle = rect.exportSVG();

	var shapex = shape.getAttribute('x');
	var shapey = shape.getAttribute('y');
	var shapewidth = shape.getAttribute('width');
	var shapeheight = shape.getAttribute('height');

	var exportedx = exportedRectangle.getAttribute('x');
	var exportedy = exportedRectangle.getAttribute('y');
	var exportedwidth = exportedRectangle.getAttribute('width');
	var exportedheight = exportedRectangle.getAttribute('height');

	equals(shapex, exportedx);
	equals(shapey, exportedy);
	equals(shapewidth, exportedwidth);
	equals(shapeheight, exportedheight);
});

test('compare rounded rectangle values', function() {
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

	var topLeft = new Point(x, y);
	var size = new Size(width, height);
	var cornerSize = new Size(rx, ry);
	var rect = new Rectangle(topLeft, size);
	var roundRect = new Path.Rectangle(rect, cornerSize);

	var exportedRectangle = rect.exportSVG();

	var shapex = shape.getAttribute('x');
	var shapey = shape.getAttribute('y');
	var shapecx = shape.getAttribute('rx');
	var shapecy = shape.getAttribute('ry');
	var shapewidth = shape.getAttribute('width');
	var shapeheight = shape.getAttribute('height');

	var exportedx = exportedRectangle.getAttribute('x');
	var exportedy = exportedRectangle.getAttribute('y');
	var exportedcx = exportedRectangle.getAttribute('rx');
	var exportedcy = exportedRectangle.getAttribute('ry');
	var exportedwidth = exportedRectangle.getAttribute('width');
	var exportedheight = exportedRectangle.getAttribute('height');

	equals(shapex, exportedx);
	equals(shapey, exportedy);
	equals(shapewidth, exportedwidth);
	equals(shapeheight, exportedheight);
});

test('compare negative rounded rectangle values', function() {
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

	var topLeft = new Point(x, y);
	var size = new Size(width, height);
	var cornerSize = new Size(rx, ry);
	var rect = new Rectangle(topLeft, size);
	var roundRect = new Path.Rectangle(rect, cornerSize);

	var exportedRectangle = rect.exportSVG();

	var shapex = shape.getAttribute('x');
	var shapey = shape.getAttribute('y');
	var shapecx = shape.getAttribute('rx');
	var shapecy = shape.getAttribute('ry');
	var shapewidth = shape.getAttribute('width');
	var shapeheight = shape.getAttribute('height');

	var exportedx = exportedRectangle.getAttribute('x');
	var exportedy = exportedRectangle.getAttribute('y');
	var exportedcx = exportedRectangle.getAttribute('rx');
	var exportedcy = exportedRectangle.getAttribute('ry');
	var exportedwidth = exportedRectangle.getAttribute('width');
	var exportedheight = exportedRectangle.getAttribute('height');

	equals(shapex, exportedx);
	equals(shapey, exportedy);
	equals(shapewidth, exportedwidth);
	equals(shapeheight, exportedheight);
});

test('compare invalid rounded rectangle values', function() {
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

	var topLeft = new Point(x, y);
	var size = new Size(width, height);
	var cornerSize = new Size(rx, ry);
	var rect = new Rectangle(topLeft, size);
	var roundRect = new Path.Rectangle(rect, cornerSize);

	var exportedRectangle = rect.exportSVG();

	var shapex = shape.getAttribute('x');
	var shapey = shape.getAttribute('y');
	var shapecx = shape.getAttribute('rx');
	var shapecy = shape.getAttribute('ry');
	var shapewidth = shape.getAttribute('width');
	var shapeheight = shape.getAttribute('height');

	var exportedx = exportedRectangle.getAttribute('x');
	var exportedy = exportedRectangle.getAttribute('y');
	var exportedcx = exportedRectangle.getAttribute('rx');
	var exportedcy = exportedRectangle.getAttribute('ry');
	var exportedwidth = exportedRectangle.getAttribute('width');
	var exportedheight = exportedRectangle.getAttribute('height');

	equals(shapex, exportedx);
	equals(shapey, exportedy);
	equals(shapewidth, exportedwidth);
	equals(shapeheight, exportedheight);
});*/

test('compare ellipse values', function() {
	var svgns = 'http://www.w3.org/2000/svg'
	var shape = document.createElementNS(svgns, 'ellipse');
	var cx = 100,
		cy = 80,
		rx = 50,
		ry = 30;
	shape.setAttribute('cx', cx);
	shape.setAttribute('cy', cy);
	shape.setAttribute('rx', rx);
	shape.setAttribute('ry', ry);

	var center = new Point(cx, cy);
	var offset = new Point(rx, ry);
	var topLeft = center.subtract(offset);
	var bottomRight = center.add(offset);

	var rect = new Rectangle(topLeft, bottomRight);
	var ellipse = new Path.Ellipse(rect);

	var exportedEllipse = ellipse.exportSVG();

	var shapecx = shape.getAttribute('cx');
	var shapecy = shape.getAttribute('cy');
	var shaperx = shape.getAttribute('rx');
	var shapery = shape.getAttribute('ry');

	var exportedcx = exportedEllipse.getAttribute('cx');
	var exportedcy = exportedEllipse.getAttribute('cy');
	var exportedrx = exportedEllipse.getAttribute('rx');
	var exportedry = exportedEllipse.getAttribute('ry');

	equals(shapecx, exportedcx);
	equals(shapecy, exportedcy);
	equals(shaperx, exportedrx);
	equals(shapery, exportedry);

});

test('compare circle values', function() {
	var svgns = 'http://www.w3.org/2000/svg'
	var shape = document.createElementNS(svgns, 'circle');
	var cx = 100,
		cy = 80,
		r = 50;	
	shape.setAttribute('cx', cx);
	shape.setAttribute('cy', cy);
	shape.setAttribute('r', r);

	var center = new Point(cx, cy);
	var circle = new Path.Circle(center, r);

	var exportedCircle = circle.exportSVG();

	var shapecx = shape.getAttribute('cx');
	var shapecy = shape.getAttribute('cy');
	var shaper = shape.getAttribute('r');

	var exportedcx = exportedCircle.getAttribute('cx');
	var exportedcy = exportedCircle.getAttribute('cy');
	var exportedr = exportedCircle.getAttribute('r');

	equals(shapecx, exportedcx);
	equals(shapecy, exportedcy);
	equals(shaper, exportedr);

});

test('compare polygon values', function() {
	var svgns = 'http://www.w3.org/2000/svg'
	var shape = document.createElementNS(svgns, 'polygon');
	var svgpoints = "100,10 40,180 190,60 10,60 160,180";
	shape.setAttribute('points', svgpoints);

	var poly = new Path();
	var points = shape.points;
	var start = points.getItem(0)
	var point;
	poly.moveTo([start.x, start.y]);

	for (var i = 1; i < points.length; i++) {
		point = points.getItem(i);
		poly.lineTo([point.x, point.y]);
	}
	if (shape.nodeName.toLowerCase() == 'polygon') {
		poly.closePath();
	}

	var exportedPolygon = poly.exportSVG();

	var svgPoints = shape.getAttribute('points');

	var exportedPoints = shape.getAttribute('points');

	equals(svgPoints, exportedPoints);
	
});

test('compare negative polygon values', function() {
	var svgns = 'http://www.w3.org/2000/svg'
	var shape = document.createElementNS(svgns, 'polygon');
	var svgpoints = "-100,-10 -40,-180 -190,-60 -10,-60 -160,-180";
	shape.setAttribute('points', svgpoints);

	var poly = new Path();
	var points = shape.points;
	var start = points.getItem(0)
	var point;
	poly.moveTo([start.x, start.y]);

	for (var i = 1; i < points.length; i++) {
		point = points.getItem(i);
		poly.lineTo([point.x, point.y]);
	}
	if (shape.nodeName.toLowerCase() == 'polygon') {
		poly.closePath();
	}

	var exportedPolygon = poly.exportSVG();

	var svgPoints = shape.getAttribute('points');

	var exportedPoints = shape.getAttribute('points');

	equals(svgPoints, exportedPoints);

});

test('compare polyline values', function() {
	var svgns = 'http://www.w3.org/2000/svg'
	var shape = document.createElementNS(svgns, 'polyline');
	var svgpoints = "5,5 45,45 5,45 45,5";
	shape.setAttribute('points', svgpoints);

	var poly = new Path();
	var points = shape.points;
	var start = points.getItem(0)
	var point;
	poly.moveTo([start.x, start.y]);

	for (var i = 1; i < points.length; i++) {
		point = points.getItem(i);
		poly.lineTo([point.x, point.y]);
	}
	if (shape.nodeName.toLowerCase() == 'polygon') {
		poly.closePath();
	}

	var exportedPolygon = poly.exportSVG();

	var svgPoints = shape.getAttribute('points');

	var exportedPoints = shape.getAttribute('points');

	equals(svgPoints, exportedPoints);

});

test('compare negative polyline values', function() {
	var svgns = 'http://www.w3.org/2000/svg'
	var shape = document.createElementNS(svgns, 'polyline');
	var svgpoints = "-5,-5 -45,-45 -5,-45 -45,-5";
	shape.setAttribute('points', svgpoints);

	var poly = new Path();
	var points = shape.points;
	var start = points.getItem(0)
	var point;
	poly.moveTo([start.x, start.y]);

	for (var i = 1; i < points.length; i++) {
		point = points.getItem(i);
		poly.lineTo([point.x, point.y]);
	}
	if (shape.nodeName.toLowerCase() == 'polygon') {
		poly.closePath();
	}

	var exportedPolygon = poly.exportSVG();

	var svgPoints = shape.getAttribute('points');

	var exportedPoints = shape.getAttribute('points');

	equals(svgPoints, exportedPoints);

});
