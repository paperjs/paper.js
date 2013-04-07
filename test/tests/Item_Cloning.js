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

function cloneAndCompare(item) {
	var copy = item.clone();
	equals(function() {
		return item.parent == copy.parent;
	}, true);
	equals(function() {
		return item.nextSibling == copy;
	}, true);
	if (item.name) {
		equals(function() {
			return copy.parent.children[copy.name] == copy;
		}, true);
	}
	compareItems(item, copy, true, true);
	// Remove the cloned item to restore the document:
	copy.remove();
}

test('Path#clone()', function() {
	var path = new Path([10, 20], [30, 40]);
	path.closed = true;
	path.name = 'test';
	path.style = {
		strokeCap: 'round',
		strokeJoin: 'round',
		dashOffset: 10,
		dashArray: [10, 2, 10],
		fillColor: new Color(0, 0, 1),
		strokeColor: new Color(0, 0, 1),
		miterLimit: 5
	};
	path.clockwise = false;
	path.opacity = 0.5;
	path.locked = true;
	path.visible = false;
	path.blendMode = 'multiply';
	path.clipMask = true;
	path.selected = true;
	cloneAndCompare(path);
});

test('Path#clone() with GradientColor', function() {
	var colors = ['red', 'green', 'black'];
	var gradient = new RadialGradient(colors);
	var color = new GradientColor(gradient, [0, 0], [20, 20], [10, 10]);

	var path = new Path([10, 20], [30, 40]);
	path.fillColor = color;
	cloneAndCompare(path);
});

test('CompoundPath#clone()', function() {
	var path1 = new Path.Rectangle([200, 200], [100, 100]);
	var path2 = new Path.Rectangle([50, 50], [200, 200]);
	var compound = new CompoundPath(path1, path2);
	cloneAndCompare(compound);
});

test('Layer#clone()', function() {
	var path = new Path.Rectangle([200, 200], [100, 100]);
	cloneAndCompare(paper.project.activeLayer);
});

test('Layer#clone() - check activeLayer', function() {
	var project = paper.project,
		activeLayer = project.activeLayer,
		layer = activeLayer.clone();
	equals(function() {
		return layer == project.activeLayer;
	}, true);
	equals(function() {
		return activeLayer != project.activeLayer;
	}, true);
});

test('Group#clone()', function() {
	var path = new Path.Circle([150, 150], 60);
	path.style = {
		strokeCap: 'round',
		strokeJoin: 'round',
		dashOffset: 10,
		dashArray: [10, 2, 10],
		fillColor: new Color(0, 0, 1),
		strokeColor: new Color(0, 0, 1),
		miterLimit: 5
	};
	var secondPath = new Path.Circle([175, 175], 85);
	var group = new Group([path, secondPath]);
	cloneAndCompare(group);
});

test('PointText#clone()', function() {
	var pointText = new PointText(new Point(50, 50));
	pointText.content = 'test';
	pointText.position = pointText.position.add(100);
	pointText.characterStyle = {
		font: 'serif',
		fontSize: 20
	};
	pointText.justification = 'center';
	cloneAndCompare(pointText);
});

test('PlacedSymbol#clone()', function() {
	var path = new Path.Circle([150, 150], 60);
	var symbol = new Symbol(path);
	var placedSymbol = new PlacedSymbol(symbol);
	placedSymbol.position = [100, 100];
	placedSymbol.rotate(90);
	cloneAndCompare(placedSymbol);
});

test('Symbol#clone()', function() {
	var path = new Path.Circle([150, 150], 60);
	path.style = {
		strokeCap: 'round',
		strokeJoin: 'round',
		dashOffset: 10,
		dashArray: [10, 2, 10],
		fillColor: new Color(0, 0, 1),
		strokeColor: new Color(0, 0, 1),
		miterLimit: 5
	};
	path.selected = true;
	var symbol = new Symbol(path);
	var copy = symbol.clone();
	compareItems(symbol.definition, copy.definition);
	equals(function() {
		return symbol.project == copy.project;
	}, true);
	equals(function() {
		return paper.project.symbols.length == 2;
	}, true);
});

test('Raster#clone()', function() {
	var path = new Path.Circle([150, 150], 60);
	path.style = {
		fillColor: new Color(0, 0, 1),
		strokeColor: new Color(0, 0, 1)
	};
	var raster = path.rasterize();
	raster.opacity = 0.5;
	raster.locked = true;
	raster.visible = false;
	raster.blendMode = 'multiply';
	raster.rotate(20).translate(100);
	cloneAndCompare(raster);
});

test('Group with clipmask', function() {
	var path = new Path.Circle([100, 100], 30),
		path2 = new Path.Circle([100, 100], 20),
		group = new Group([path, path2]);
	group.clipped = true;
	cloneAndCompare(group);
});