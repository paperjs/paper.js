/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2020, Jürg Lehni & Jonathan Puckey
 * http://juerglehni.com/ & https://puckey.studio/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

QUnit.module('Item');

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
        return secondDoc.activeLayer.children.indexOf(path) === 0;
    }, true);
});

test('item.remove()', function() {
    var project = paper.project;
    var path = new Path();
    equals(function() {
        return project.activeLayer.children.length;
    }, 1);
    path.remove();
    equals(function() {
        return project.activeLayer.children.length;
    }, 0);
    var group = new Group(path);
    equals(function() {
        return group.children.length;
    }, 1);
    path.remove();
    equals(function() {
        return group.children.length;
    }, 0);
});


test('item.addChildren() / item.removeChildren()', function() {
    var project = paper.project,
        layer = project.activeLayer,
        path1 = new Path({ insert: false }),
        path2 = new Path({ insert: false, name: 'path2' });

    layer.addChildren([path1, path2]);
    equals(function() { return path1.index; }, 0);
    equals(function() { return path2.index; }, 1);
    equals(function() { return path1.parent === layer; }, true);
    equals(function() { return path2.parent === layer; }, true);
    equals(function() { return layer.children['path2'] === path2; }, true);
    layer.removeChildren();
    equals(function() { return path1.index; }, undefined);
    equals(function() { return path2.index; }, undefined);
    equals(function() { return path1.parent; }, null);
    equals(function() { return path2.parent; }, null);
    equals(function() { return layer.children['path2'] === undefined; }, true);

    layer.children = [path1, path2];
    equals(function() { return path1.index; }, 0);
    equals(function() { return path2.index; }, 1);
    equals(function() { return path1.parent === layer; }, true);
    equals(function() { return path2.parent === layer; }, true);
    equals(function() { return layer.children['path2'] === path2; }, true);
    layer.children = [];
    equals(function() { return path1.index; }, undefined);
    equals(function() { return path2.index; }, undefined);
    equals(function() { return path1.parent; }, null);
    equals(function() { return path2.parent; }, null);
    equals(function() { return layer.children['path2'] === undefined; }, true);
});

test('item.lastChild / item.firstChild', function() {
    var project = paper.project;
    var path1 = new Path();
    var path2 = new Path();
    equals(function() {
        return project.activeLayer.firstChild == path1;
    }, true);
    equals(function() {
        return project.activeLayer.lastChild == path2;
    }, true);
});

test('item.nextSibling / item.previousSibling', function() {
    var path1 = new Path();
    var path2 = new Path();
    equals(function() {
        return path1.previousSibling == null;
    }, true);
    equals(function() {
        return path1.nextSibling == path2;
    }, true);
    equals(function() {
        return path2.previousSibling == path1;
    }, true);
    equals(function() {
        return path2.nextSibling == null;
    }, true);
});

test('item.replaceWith(other)', function() {
    var project = paper.project;
    var path1 = new Path();
    var path2 = new Path();
    var path3 = new Path();
    equals(function() {
        return project.activeLayer.children.length;
    }, 3);
    equals(function() {
        return path1.replaceWith(path2) == path2;
    }, true);
    equals(function() {
        return project.activeLayer.children.length;
    }, 2);
    equals(function() {
        return path1.parent == null;
    }, true);
    equals(function() {
        return path2.previousSibling == null;
    }, true);
    equals(function() {
        return path2.nextSibling == path3;
    }, true);
});

test('item.replaceWith(item)', function() {
    var item = new Path();
    equals(function() {
        return item.replaceWith(item) == null;
    }, true);
    equals(function() {
        return item.getParent() != null;
    }, true);
});

test('item.insertChild(0, child)', function() {
    var project = paper.project;
    var path1 = new Path();
    var path2 = new Path();
    project.activeLayer.insertChild(0, path2);
    equals(function() {
        return path2.index < path1.index;
    }, true);
});

test('item.insertAbove(other)', function() {
    var path1 = new Path();
    var path2 = new Path();
    equals(function() {
        return path2.index > path1.index;
    }, true);
    equals(function() {
        return path1.insertAbove(path2) == path1;
    }, true);
    equals(function() {
        return path2.index < path1.index;
    }, true);
    equals(function() {
        return paper.project.activeLayer.lastChild == path1;
    }, true);
});

test('item.insertBelow(other)', function() {
    var path1 = new Path();
    var path2 = new Path();
    equals(function() {
        return path2.index > path1.index;
    }, true);
    equals(function() {
        return path2.insertBelow(path1) == path2;
    }, true);
    equals(function() {
        return path2.index < path1.index;
    }, true);
    equals(function() {
        return paper.project.activeLayer.lastChild == path1;
    }, true);
});

test('item.insertAbove(item)', function() {
    var path = new Path();
    equals(function() {
        return path.insertAbove(path) == null;
    }, true);
    equals(function() {
        return path.insertBelow(path) == null;
    }, true);
});

test('item.sendToBack()', function() {
    var path1 = new Path();
    var path2 = new Path();
    path2.sendToBack();
    equals(function() {
        return path2.index === 0;
    }, true);
});

test('item.bringToFront()', function() {
    var path1 = new Path();
    var path2 = new Path();
    path1.bringToFront();
    equals(function() {
        return path1.index == 1;
    }, true);
});

test('item.isDescendant(other) / item.isAncestor(other)', function() {
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

test('item.addChildren(items)', function() {
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

test('item.isGroupedWith(other)', function() {
    var path = new Path();
    var path2 = new Path();
    var group = new Group([path]);
    var secondGroup = new Group([path2]);

    equals(function() {
        return path.isGroupedWith(path2);
    }, false);
    secondGroup.addChild(path);
    equals(function() {
        return path.isGroupedWith(path2);
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
        return path.isGroupedWith(path2);
    }, false);
    paper.project.activeLayer.addChild(path2);
    equals(function() {
        return path.isGroupedWith(path2);
    }, false);
});

test('reverseChildren()', function() {
    var project = paper.project;
    var path = new Path();
    var path2 = new Path();
    var path3 = new Path();
    equals(function() {
        return project.activeLayer.firstChild == path;
    }, true);
    project.activeLayer.reverseChildren();
    equals(function() {
        return project.activeLayer.firstChild == path;
    }, false);
    equals(function() {
        return project.activeLayer.firstChild == path3;
    }, true);
    equals(function() {
        return project.activeLayer.lastChild == path;
    }, true);
});

test('Check item#project when moving items across projects', function() {
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
    var path1 = new Path({ name: 'test' });
    var layer = paper.project.activeLayer;
    equals(function() {
        return layer.children['test'] === path1;
    }, true);

    var path2 = new Path({ name: 'test' });

    equals(function() {
        return layer.children['test'] === path1;
    }, true);

    path2.remove();

    equals(function() {
        return layer.children['test'] === path1;
    }, true);

    path1.remove();

    equals(function() {
        return !layer.children['test'];
    }, true);
});

test('Named child access 1', function() {
    var path1 = new Path({ name: 'test' });
    var path2 = new Path({ name: 'test' });
    var layer = paper.project.activeLayer;

    equals(function() {
        return layer.children['test'] === path1;
    }, true);

    path1.remove();

    equals(function() {
        return layer.children['test'] === path2;
    }, true);

    path2.remove();

    equals(function() {
        return layer.children['test'] === undefined;
    }, true);
});

test('Named child access 2', function() {
    var path1 = new Path({ name: 'test' });
    var path2 = new Path({ name: 'test' });
    var layer = paper.project.activeLayer;

    var group = new Group();

    group.addChild(path2);

    equals(function() {
        return layer.children['test'] === path1;
    }, true);

    path1.remove();

    equals(function() {
        return layer.children['test'] === undefined;
    }, true);

    equals(function() {
        return group.children['test'] === path2;
    }, true);

    path2.remove();

    equals(function() {
        return group.children['test'] === undefined;
    }, true);

    group.addChild(path2);

    equals(function() {
        return group.children['test'] === path2;
    }, true);

    layer.appendTop(path2);

    equals(function() {
        return group.children['test'] === undefined;
    }, true);

    equals(function() {
        return layer.children['test'] === path2;
    }, true);

    layer.addChild(path1);

    equals(function() {
        return layer.children['test'] === path2;
    }, true);

    path2.remove();

    equals(function() {
        return layer.children['test'] === path1;
    }, true);
});

test('Setting name of child back to null', function() {
    var path1 = new Path({ name: 'test' });
    var path2 = new Path({ name: 'test' });
    var layer = paper.project.activeLayer;

    equals(function() {
        return layer.children['test'] == path1;
    }, true);

    path1.name = null;

    equals(function() {
        return layer.children['test'] == path2;
    }, true);

    path2.name = null;

    equals(function() {
        return layer.children['test'] === undefined;
    }, true);
});

test('Renaming item', function() {
    var path = new Path({ name: 'test' });
    path.name = 'test2';
    var layer = paper.project.activeLayer;

    equals(function() {
        return layer.children['test'] === undefined;
    }, true);

    equals(function() {
        return layer.children['test2'] == path;
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
    equals(function() {
        return path.name;
    }, 'test');
});

test('Naming a layer', function() {
    var layer = new Layer();
    layer.name = 'test';
    equals(function() {
        return layer.name;
    }, 'test');
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

test('Item#className', function() {
    equals(new Group().className, 'Group');
    equals(new Path().className, 'Path');
    equals(new CompoundPath().className, 'CompoundPath');
    equals(new Raster().className, 'Raster');
    equals(new SymbolItem().className, 'SymbolItem');
    equals(new PlacedSymbol().className, 'SymbolItem'); // deprecated
    equals(new PointText().className, 'PointText');
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
    };
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

    var raster = layer.rasterize(72, false);
    equals(raster.getPixel(0, 0), new Color(1, 0, 0, 1),
            'Top left pixel should be red');
    equals(raster.getPixel(50, 50), new Color(1, 1, 0, 1),
            'Middle center pixel should be yellow');

    path2.position = [0, 0];

    var group = new Group(path2);
    group.position = [50, 50];

    var raster = layer.rasterize(72, false);
    equals(raster.getPixel(0, 0), new Color(1, 0, 0, 1),
            'Top left pixel should be red');
    equals(raster.getPixel(50, 50), new Color(1, 1, 0, 1),
            'Middle center pixel should be yellow');
});

test('Item#opacity', function() {
    var layer = new Layer();
    var background = new Path.Rectangle({
        size: [100, 100],
        fillColor: 'white'
    });

    var circle = new Path.Circle({
        radius: 25,
        center: [50, 50],
        fillColor: 'red'
    });

    const red = new Color(1, 0, 0, 1)
    const white = new Color(1, 1, 1, 1)

    equals(layer.rasterize(72, false).getPixel(50, 50), red,
        'Center pixel should be red');
    circle.opacity = 0;
    equals(layer.rasterize(72, false).getPixel(50, 50), white,
        'Center pixel should be white');
    circle.opacity = -1;
    equals(layer.rasterize(72, false).getPixel(50, 50), white,
        'Center pixel should be white');
    circle.opacity = 1;
    equals(layer.rasterize(72, false).getPixel(50, 50), red,
        'Center pixel should be red');
    circle.opacity = 2;
    equals(layer.rasterize(72, false).getPixel(50, 50), red,
        'Center pixel should be red');
});

test('Item#applyMatrix', function() {
    equals(function() {
        return new Path({ applyMatrix: true }).applyMatrix;
    }, true);
    equals(function() {
        return new Path({ applyMatrix: false }).applyMatrix;
    }, false);
    equals(function() {
        return new Raster({ applyMatrix: false }).applyMatrix;
    }, false);
    equals(function() {
        return new Raster({ applyMatrix: true }).applyMatrix;
    }, false);

    var applyMatrix = paper.settings.applyMatrix;
    paper.settings.applyMatrix = true;
    equals(function() {
        return new Path().applyMatrix;
    }, true);
    equals(function() {
        return new Raster().applyMatrix;
    }, false);
    paper.settings.applyMatrix = false;
    equals(function() {
        return new Path().applyMatrix;
    }, false);
    equals(function() {
        return new Raster().applyMatrix;
    }, false);
    paper.settings.applyMatrix = applyMatrix;

    var path = new Path.Rectangle({
        size: [100, 100],
        position: [0, 0]
    });

    path.applyMatrix = false;

    equals(path.matrix, new Matrix(),
            'path.matrix before scaling');
    equals(path.bounds, new Rectangle(-50, -50, 100, 100),
            'path.bounds before scaling');
    equals(path.segments[0].point, new Point(-50, 50),
            'path.segments[0].point before scaling');

    path.scale(1, 2);

    equals(path.matrix, new Matrix().scale(1, 2),
            'path.matrix after scaling');
    equals(path.bounds, new Rectangle(-50, -100, 100, 200),
            'path.bounds after scaling');
    equals(path.segments[0].point, new Point(-50, 50),
            'path.segments[0].point after scaling');

    path.applyMatrix = true;

    equals(path.matrix, new Matrix(),
            'path.matrix after setting path.applyMatrix = true;');
    equals(path.bounds, new Rectangle(-50, -100, 100, 200),
            'path.bounds after setting path.applyMatrix = true;');
    equals(path.segments[0].point, new Point(-50, 100),
            'path.segments[0].point after setting path.applyMatrix = true;');
});

test('PaperScope#settings.insertItems', function() {
    var insertItems = paper.settings.insertItems;
    paper.settings.insertItems = true;

    var path1, path2;

    equals(function() {
        path1 = new Path();
        return path1.parent === project.activeLayer;
    }, true);
    paper.settings.insertItems = false;

    equals(function() {
        path2 = new Path();
        return path2.parent === null;
    }, true);

    equals(function() {
        return project.activeLayer.children.length;
    }, 1);

    project.activeLayer.addChild(path2);

    equals(function() {
        return project.activeLayer.children.length;
    }, 2);

    paper.settings.insertItems = insertItems;
});

test('Item#pivot', function() {
    var path1 = new Path.Rectangle({
        point: [50, 50],
        size: [100, 100],
        strokeColor: 'red',
        applyMatrix: false
    });

    var path2 = new Path.Rectangle({
        point: [50, 50],
        size: [100, 100],
        strokeColor: 'green',
        applyMatrix: true
    });

    var pivot = new Point(100, 100);

    path1.pivot = pivot;
    path1.position = [200, 200];
    equals(path1.pivot, pivot,
            'Changing position of an item with applyMatrix = false should not change pivot');

    var difference = new Point(100, 100);
    path2.pivot = pivot;
    path2.position = path2.position.add(difference);
    equals(path2.pivot, pivot.add(difference),
            'Changing position of an item with applyMatrix = true should change pivot');
});

test('Item#position with irregular shape, #pivot and rotation', function() {
    var path1 = new Path([ [0, 0], [200, 100], [0, 100] ]);
    var path2 = path1.clone();
    path2.pivot = path2.position;
    equals(path1.position, new Point(100, 50),
            'path1.position, before rotation');
    path1.rotate(45);
    equals(path1.position, new Point(64.64466, 50),
            'path1.position, after rotation');
    equals(path2.position, new Point(100, 50),
            'path2.position with pivot, before rotation');
    path2.rotate(45);
    equals(path2.position, new Point(100, 50),
            'path2.position with pivot, after rotation');
});

test('Item#scaling, #rotation', function() {
    var expected = new Rectangle(100, 50, 100, 200);

    var rect1 = new Path.Rectangle({
        from: [100, 100],
        to: [200, 200],
        applyMatrix: false
    });
    var rect2 = rect1.clone();

    rect1.scaling = [2, 1];
    rect1.rotation = 90;
    equals(rect1.bounds, expected,
            'rect1.bounds, setting rect1.scaling before rect1.rotation');

    rect2.rotation = 90;
    rect2.scaling = [2, 1];
    equals(rect2.bounds, expected,
            'rect2.bounds, setting rect2.scaling before rect2.rotation');

    var shape1 = new Shape.Rectangle({
        from: [100, 100],
        to: [200, 200]
    });
    var shape2 = shape1.clone();

    shape1.scaling = [2, 1];
    shape1.rotation = 90;
    equals(shape1.bounds, expected,
            'shape1.bounds, setting shape1.scaling before shape1.rotation');

    shape2.rotation = 90;
    shape2.scaling = [2, 1];
    equals(shape2.bounds, expected,
            'shape2.bounds, setting shape2.scaling before shape2.rotation');
});

test('Item#scaling = 0 (#1816)', function() {
    const circle = new Path.Circle({
        radius: 100,
        center: [100, 100],
        fillColor: 'red',
        applyMatrix: false
    })

    circle.translate(100)
    circle.scaling = 0
    equals(circle.bounds, new Rectangle(200, 200, 0, 0),
            'circle.bounds, with scaling = 0');

    circle.scaling = 1
    equals(circle.bounds, new Rectangle(100, 100, 200, 200),
            'circle.bounds, with scaling = 1');

    circle.scaling = [0, 1]
    equals(circle.bounds, new Rectangle(200, 100, 0, 200),
            'circle.bounds, with scaling = [0, 1]');

    circle.scaling = 1
    equals(circle.bounds, new Rectangle(100, 100, 200, 200),
            'circle.bounds, with scaling = 1');

    const rect = new Path.Rectangle({
        center: [100, 100],
        size: [200, 100],
        fillColor: 'red',
        applyMatrix: false
    })

    rect.translate(100)
    rect.rotate(45)

    rect.scaling = 0
    equals(rect.bounds, new Rectangle(200, 200, 0, 0),
            'rect.bounds, with scaling = 0');
    equals(rect.rotation, 45);

    rect.scaling = 1
    equals(rect.bounds, new Rectangle(93.93398, 93.93398, 212.13203, 212.13203),
            'rect.bounds, with scaling = 1');
    equals(rect.rotation, 45);
});

test('Item#position pivot point and caching (#1503)', function() {
    var item = Path.Rectangle(new Point(0, 0), new Size(20));
    item.pivot = new Point(0, 0);
    var bounds = item.bounds;
    item.translate(5, 5);
    equals(item.position, new Point(5, 5));
});

test('Children global matrices are cleared after parent transformation', function() {
    var item = Path.Rectangle(new Point(0, 0), new Size(100));
    var group = new Group({ children: [item], applyMatrix: false });
    equals(item.localToGlobal(item.getPointAt(0)), new Point(0, 100));
    group.translate(100, 0);
    equals(item.localToGlobal(item.getPointAt(0)), new Point(100, 100));
});

test('Item#rasterize() with empty bounds', function() {
    new Path.Line([0, 0], [100, 0]).rasterize();
    view.update(); // This should not throw
    expect(0);
});

test('Item#rasterize() bounds', function() {
    var circle = new Path.Circle({
        center: [50, 50],
        radius: 5,
        fillColor: 'red'
    });
    equals(function() {
        return circle.bounds;
    }, new Rectangle({ x: 45, y: 45, width: 10, height: 10 }));
    equals(function() {
        return circle.rasterize({ resolution: 72 }).bounds;
    }, new Rectangle({ x: 45, y: 45, width: 10, height: 10 }));
    equals(function() {
        return circle.rasterize({ resolution: 144 }).bounds;
    }, new Rectangle({ x: 45, y: 45, width: 10, height: 10 }));
    equals(function() {
        return circle.rasterize({ resolution: 200 }).bounds;
    }, new Rectangle({ x: 45.14, y: 45.14, width: 9.72, height: 9.72 }));
    equals(function() {
        return circle.rasterize({ resolution: 400 }).bounds;
    }, new Rectangle({ x: 45.05, y: 45.05, width: 9.9, height: 9.9 }));
    equals(function() {
        return circle.rasterize({ resolution: 600 }).bounds;
    }, new Rectangle({ x: 45.02, y: 45.02, width: 9.96, height: 9.96 }));
    equals(function() {
        return circle.rasterize({ resolution: 1000 }).bounds;
    }, new Rectangle({ x: 45.032, y: 45.032, width: 9.936, height: 9.936 }));
    equals(function() {
        var raster = circle.rasterize({ resolution: 1000 });
        // Reusing the raster for a 2nd rasterization should leave it in place.
        return circle.rasterize({ resolution: 1000, raster: raster }).bounds;
    }, new Rectangle({ x: 45.032, y: 45.032, width: 9.936, height: 9.936 }));
});

test('Item#draw() with CompoundPath as clip item', function() {
    function createdClippedGroup(invertedOrder) {
        var compound = new CompoundPath({
            children: [
                new Path.Circle(new Point(50, 50), 50),
                new Path.Circle(new Point(100, 50), 50)
            ],
            fillRule: 'evenodd'
        });

        var rectangle = new Shape.Rectangle(new Point(0, 0), new Point(150, 50));

        var group = new Group();
        group.children = invertedOrder
            ? [compound, rectangle]
            : [rectangle, compound];
        group.fillColor = 'black';
        group.clipped = true;
        return group;
    };

    comparePixels(createdClippedGroup(true), createdClippedGroup(false));
});
