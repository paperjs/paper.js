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

module('Item');

test('copyTo(project)', function() {
	var project = paper.project;
	var path = new Path();
	var secondDoc = new Project();
	var copy = path.copyTo(secondDoc);
	equals(function() {
		return secondDoc.activeLayer.children.indexOf(copy) != -1;
	}, true);
	equals(function() {
		return project.activeLayer.children.indexOf(copy) == -1;
	}, true);
	equals(function() {
		return copy != path;
	}, true);
});

test('copyTo(layer)', function() {
	var project = paper.project;
	var path = new Path();

	var layer = new Layer();
	var copy = path.copyTo(layer);
	equals(function() {
		return layer.children.indexOf(copy) != -1;
	}, true);
	equals(function() {
		return project.layers[0].children.indexOf(copy) == -1;
	}, true);
});

test('clone()', function() {
	var project = paper.project;
	var path = new Path();
	var copy = path.clone();
	equals(function() {
		return project.activeLayer.children.length;
	}, 2);
	equals(function() {
		return path != copy;
	}, true);
});

test('addChild(item)', function() {
	var project = paper.project;
	var path = new Path();
	project.activeLayer.addChild(path);
	equals(function() {
		return project.activeLayer.children.length;
	},  1);
});

test('setting item.parent', function() {
	var layer1 = paper.project.activeLayer;
	var layer2 = new Layer();
	layer1.activate();
	var group = new Group();

	var path = new Path();
	equals(function() {
		return path.parent === layer1;
	}, true, 'Path is a child of layer1 because it is active');

	path.parent = layer2;
	equals(function() {
		return path.parent === layer2;
	}, true, 'The parent of path was set to layer2');

	path.parent = group;
	equals(function() {
		return path.parent === group;
	}, true, 'The parent of path was set to group');

	equals(function() {
		return layer2.children.indexOf(path) === -1;
	}, true, 'The path is no longer a child of layer2');

	var path2 = new Path({
		parent: group
	});
	equals(function() {
		return path2.parent === group;
	}, true, 'setting the parent in the constructor');
	equals(function() {
		return group.children.indexOf(path2) == 1;
	}, true, 'the index of path2 is 1, because group already contains path from before');
});

test('item.parent / item.isChild / item.isParent / item.layer', function() {
	var project = paper.project;
	var secondDoc = new Project();
	var path = new Path();
	project.activeLayer.addChild(path);
	equals(function() {
		return project.activeLayer.children.indexOf(path) != -1;
	}, true);
		equals(function() {
		return path.layer == project.activeLayer;
	}, true);
	secondDoc.activeLayer.addChild(path);
	equals(function() {
		return project.activeLayer.isChild(path);
	}, false);
	equals(function() {
		return path.layer == secondDoc.activeLayer;
	}, true);
	equals(function() {
		return path.isParent(project.activeLayer);
	}, false);
	equals(function() {
		return secondDoc.activeLayer.isChild(path);
	}, true);
	equals(function() {
		return path.isParent(secondDoc.activeLayer);
	}, true);
	equals(function() {
		return project.activeLayer.children.indexOf(path) == -1;
	}, true);
	equals(function() {
		return secondDoc.activeLayer.children.indexOf(path) == 0;
	}, true);
});

test('item.lastChild / item.firstChild', function() {
	var project = paper.project;
	var path = new Path();
	var secondPath = new Path();
	equals(function() {
		return project.activeLayer.firstChild == path;
	}, true);
	equals(function() {
		return project.activeLayer.lastChild == secondPath;
	}, true);
});

test('insertChild(0, item)', function() {
	var project = paper.project;
	var path = new Path();
	var secondPath = new Path();
	project.activeLayer.insertChild(0, secondPath);
	equals(function() {
		return secondPath.index < path.index;
	}, true);
});

test('insertAbove(item)', function() {
	var project = paper.project;
	var path = new Path();
	var secondPath = new Path();
	path.insertAbove(secondPath);
	equals(function() {
		return project.activeLayer.lastChild == path;
	}, true);
});

test('insertBelow(item)', function() {
	var project = paper.project;
	var firstPath = new Path();
	var secondPath = new Path();
	equals(function() {
		return secondPath.index > firstPath.index;
	}, true);
	secondPath.insertBelow(firstPath);
	equals(function() {
		return secondPath.index < firstPath.index;
	}, true);
});

test('sendToBack()', function() {
	var project = paper.project;
	var firstPath = new Path();
	var secondPath = new Path();
	secondPath.sendToBack();
	equals(function() {
		return secondPath.index == 0;
	}, true);
});

test('bringToFront()', function() {
	var project = paper.project;
	var firstPath = new Path();
	var secondPath = new Path();
	firstPath.bringToFront();
	equals(function() {
		return firstPath.index == 1;
	}, true);
});

test('isDescendant(item) / isAncestor(item)', function() {
	var project = paper.project;
	var path = new Path();
	equals(function() {
		return path.isDescendant(project.activeLayer);
	}, true);
	equals(function() {
		return project.activeLayer.isDescendant(path);
	}, false);
	equals(function() {
		return path.isAncestor(project.activeLayer);
	}, false);
	equals(function() {
		return project.activeLayer.isAncestor(path);
	}, true);

	// an item can't be its own descendant:
	equals(function() {
		return project.activeLayer.isDescendant(project.activeLayer);
	}, false);
	// an item can't be its own ancestor:
	equals(function() {
		return project.activeLayer.isAncestor(project.activeLayer);
	}, false);
});

test('addChildren(items)', function() {
	var project = paper.project;
	var path1 = new Path(),
		path2 = new Path(),
		path3 = new Path(),
		group = new Group([path1, path2, path3]);

	function check(i1, i2, i3) {
		equals(function() {
			return group.children.length;
		}, 3);
		equals(function() {
			return path1.index;
		}, i1);
		equals(function() {
			return path2.index;
		}, i2);
		equals(function() {
			return path3.index;
		}, i3);
	}
	check(0, 1, 2);
	group.addChild(path1);
	check(2, 0, 1);
	group.addChild(path2);
	check(1, 2, 0);
	group.addChildren([path1, path2, path3]);
	check(0, 1, 2);
});

test('isGroupedWith', function() {
	var project = paper.project;
	var path = new Path();
	var secondPath = new Path();
	var group = new Group([path]);
	var secondGroup = new Group([secondPath]);

	equals(function() {
		return path.isGroupedWith(secondPath);
	}, false);
	secondGroup.addChild(path);
	equals(function() {
		return path.isGroupedWith(secondPath);
	}, true);
	equals(function() {
		return path.isGroupedWith(group);
	}, false);
	equals(function() {
		return path.isDescendant(secondGroup);
	}, true);
	equals(function() {
		return secondGroup.isDescendant(path);
	}, false);
	equals(function() {
		return secondGroup.isDescendant(secondGroup);
	}, false);
	equals(function() {
		return path.isGroupedWith(secondGroup);
	}, false);
	paper.project.activeLayer.addChild(path);
	equals(function() {
		return path.isGroupedWith(secondPath);
	}, false);
	paper.project.activeLayer.addChild(secondPath);
	equals(function() {
		return path.isGroupedWith(secondPath);
	}, false);
});

test('getPreviousSibling() / getNextSibling()', function() {
	var firstPath = new Path();
	var secondPath = new Path();
	equals(function() {
		return firstPath.nextSibling == secondPath;
	}, true);
	equals(function() {
		return secondPath.previousSibling == firstPath;
	}, true);
	equals(function() {
		return secondPath.nextSibling == null;
	}, true);
});

test('reverseChildren()', function() {
	var project = paper.project;
	var path = new Path();
	var secondPath = new Path();
	var thirdPath = new Path();
	equals(function() {
		return project.activeLayer.firstChild == path;
	}, true);
	project.activeLayer.reverseChildren();
	equals(function() {
		return project.activeLayer.firstChild == path;
	}, false);
	equals(function() {
		return project.activeLayer.firstChild == thirdPath;
	}, true);
	equals(function() {
		return project.activeLayer.lastChild == path;
	}, true);
});

test('Check item#project when moving items across projects', function() {
	var project = paper.project;
	var doc1 = new Project();
	var path = new Path();
	var group = new Group();
	group.addChild(new Path());

	equals(function() {
		return path.project == doc1;
	}, true);
	var doc2 = new Project();
	doc2.activeLayer.addChild(path);
	equals(function() {
		return path.project == doc2;
	}, true);

	doc2.activeLayer.addChild(group);
	equals(function() {
		return group.children[0].project == doc2;
	}, true);
});

test('group.selected', function() {
	var path = new Path([0, 0]);
	var path2 = new Path([0, 0]);
	var group = new Group([path, path2]);
	path.selected = true;
	equals(function() {
		return group.selected;
	}, true);

	path.selected = false;
	equals(function() {
		return group.selected;
	}, false);

	group.selected = true;
	equals(function() {
		return path.selected;
	}, true);
	equals(function() {
		return path2.selected;
	}, true);

	group.selected = false;
	equals(function() {
		return path.selected;
	}, false);
	equals(function() {
		return path2.selected;
	}, false);
});

test('Check parent children object for named item', function() {
	var path = new Path();
	path.name = 'test';
	equals(function() {
		return paper.project.activeLayer.children['test'] == path;
	}, true);

	var path2 = new Path();
	path2.name = 'test';

	equals(function() {
		return paper.project.activeLayer.children['test'] == path2;
	}, true);

	path2.remove();

	equals(function() {
		return paper.project.activeLayer.children['test'] == path;
	}, true);

	path.remove();

	equals(function() {
		return !paper.project.activeLayer.children['test'];
	}, true);
});

test('Named child access 1', function() {
	var path = new Path();
	path.name = 'test';

	var path2 = new Path();
	path2.name = 'test';

	path.remove();

	equals(function() {
		return paper.project.activeLayer.children['test'] == path2;
	}, true);
});

test('Named child access 2', function() {
	var path = new Path();
	path.name = 'test';

	var path2 = new Path();
	path2.name = 'test';

	path.remove();

	equals(function() {
		return paper.project.activeLayer.children['test'] == path2;
	}, true);

	equals(function() {
		return paper.project.activeLayer._namedChildren['test'].length == 1;
	}, true);

	path2.remove();

	equals(function() {
		return !paper.project.activeLayer._namedChildren['test'];
	}, true);

	equals(function() {
		return paper.project.activeLayer.children['test'] === undefined;
	}, true);
});

test('Named child access 3', function() {
	var path = new Path();
	path.name = 'test';

	var path2 = new Path();
	path2.name = 'test';

	var group = new Group();

	group.addChild(path2);

	equals(function() {
		return paper.project.activeLayer.children['test'] == path;
	}, true);

	// TODO: Tests should not access internal properties
	equals(function() {
		return paper.project.activeLayer._namedChildren['test'].length;
	}, 1);

	equals(function() {
		return group.children['test'] == path2;
	}, true);

	equals(function() {
		return group._namedChildren['test'].length == 1;
	}, true);

	equals(function() {
		return paper.project.activeLayer._namedChildren['test'][0] == path;
	}, true);

	paper.project.activeLayer.appendTop(path2);

	equals(function() {
		return group.children['test'] == null;
	}, true);

	equals(function() {
		return group._namedChildren['test'] === undefined;
	}, true);

	equals(function() {
		return paper.project.activeLayer.children['test'] == path2;
	}, true);

	equals(function() {
		return paper.project.activeLayer._namedChildren['test'].length;
	}, 2);
});

test('Setting name of child back to null', function() {
	var path = new Path();
	path.name = 'test';

	var path2 = new Path();
	path2.name = 'test';

	equals(function() {
		return paper.project.activeLayer.children['test'] == path2;
	}, true);

	path2.name = null;

	equals(function() {
		return paper.project.activeLayer.children['test'] == path;
	}, true);

	path.name = null;

	equals(function() {
		return paper.project.activeLayer.children['test'] === undefined;
	}, true);
});

test('Renaming item', function() {
	var path = new Path();
	path.name = 'test';

	path.name = 'test2';

	equals(function() {
		return paper.project.activeLayer.children['test'] === undefined;
	}, true);

	equals(function() {
		return paper.project.activeLayer.children['test2'] == path;
	}, true);
});

test('Changing item#position.x', function() {
	var path = new Path.Circle(new Point(50, 50), 50);
	path.position.x += 5;
	equals(path.position.toString(), '{ x: 55, y: 50 }',
			'path.position.x += 5');
});

test('Naming a removed item', function() {
	var path = new Path();
	path.remove();
	path.name = 'test';
});

test('Naming a layer', function() {
	var layer = new Layer();
	layer.name = 'test';
});

test('Cloning a linked size', function() {
	var path = new Path([40, 75], [140, 75]);
	var error = null;
	try {
		var cloneSize = path.bounds.size.clone();
	} catch (e) {
		error = e;
	}
	var description = 'Cloning a linked size should not throw an error';
	if (error)
		description += ': ' + error;
	equals(error == null, true, description);
});

test('Item#type', function() {
	equals(new Group().type, 'group');
	equals(new Path().type, 'path');
	equals(new CompoundPath().type, 'compound-path');

	var canvas = document.createElement('canvas');
	equals(new Raster(canvas).type, 'raster');
	equals(new PlacedSymbol().type, 'placed-symbol');
	equals(new PointText().type, 'point-text');
});

test('Item#isInserted', function() {
	var item = new Path();
	equals(item.isInserted(), true);
	item.remove();
	equals(item.isInserted(), false);

	var group = new Group(item);
	equals(item.isInserted(), true);
	group.remove();
	equals(item.isInserted(), false);
});

test('Item#data', function() {
	var item = new Path();
	var description = 'When accessed before any data was set, a plain object is created for us';
	equals(Base.isPlainObject(item.data), true, description);

	var item = new Path();
	item.data.test = true;
	equals(item.data.test, true, description);

	var item = new Path();
	var point = new Point();
	item.data.point = point;
	equals(item.data.point, point, 'We can set basic types on data');

	var item = new Path();
	item.data = {
		testing: true
	}
	equals(item.data.testing, true, 'we can set data using an object literal');

	var item = new Path({
		data: {
			testing: true
		}
	});
	equals(item.data.testing, true,
			'we can set data using an object literal constructor');

	// TODO: add tests to see if importing and exporting of Item#data works
});

test('Item#blendMode in a transformed Group', function() {
	var layer = new Layer();
	var path1 = new Path.Rectangle({
		size: [100, 100],
		fillColor: new Color(1, 0, 0)
	});

	var path2 = new Path.Circle({
		radius: 25,
		center: [50, 50],
		fillColor: new Color(0, 1, 0),
		blendMode: 'screen'
	});

	var raster = layer.rasterize();
	compareColors(raster.getPixel(0, 0), new Color(1, 0, 0, 1),
			'Top left pixel should be red:');
	compareColors(raster.getPixel(50, 50), new Color(1, 1, 0, 1),
			'Middle center pixel should be yellow:');

	raster.remove();
	path2.position = [0, 0];

	var group = new Group(path2);
	group.position = [50, 50];

	var raster = layer.rasterize();
	compareColors(raster.getPixel(0, 0), new Color(1, 0, 0, 1),
			'Top left pixel should be red:');
	compareColors(raster.getPixel(50, 50), new Color(1, 1, 0, 1),
			'Middle center pixel should be yellow:');
});
