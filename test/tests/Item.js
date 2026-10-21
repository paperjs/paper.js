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

test('item.replaceWith(...items)', function() {
    var project = paper.project;
    var path1 = new Path();
    var path2 = new Path();
    var group = new Group([new Path(), new Path()]);
    var path3 = new Path();
    var children = group.children.slice();
    equals(function() {
        return group.replaceWith(children[0], children[1], path1)
                == children[0];
    }, true);
    equals(function() {
        return group.parent == null;
    }, true);
    equals(project.activeLayer.children,
            [path2, children[0], children[1], path1, path3]);
});

test('group.ungroup()', function() {
    var layer = paper.project.activeLayer;
    var path1 = new Path.Rectangle([0, 0], [10, 10]);
    var path2 = new Path.Rectangle([20, 0], [10, 10]);
    // A nested group that keeps its own matrix:
    var path3 = new Path.Rectangle([0, 20], [10, 10]);
    var nested = new Group({ children: [path3], applyMatrix: false });
    var group = new Group({
        children: [path1, path2, nested],
        applyMatrix: false,
        clipped: true
    });
    // Scale the group by 2 around (5, 5), the center of its bounds, which are
    // those of its clipping mask:
    group.scale(2);
    equals(group.ungroup(), [path1, path2, nested]);
    equals(group.parent, null);
    equals(layer.children, [path1, path2, nested]);
    // The children keep their place, and the mask is released:
    equals(path1.bounds, new Rectangle(-5, -5, 20, 20));
    equals(path2.bounds, new Rectangle(35, -5, 20, 20));
    equals(nested.bounds, new Rectangle(-5, 35, 20, 20));
    equals(nested.matrix, new Matrix(2, 0, 0, 2, -5, -5));
    equals(path3.segments[1].point, new Point(0, 20));
    equals(path1.clipMask, false);
    equals(group.applyMatrix, false);
    equals(layer.ungroup(), null);
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

test('item.bounds.selected and item.strokeBounds.selected (#1030)', function() {
    var path = new Path.Rectangle({
        point: [10, 10],
        size: [20, 20],
        strokeColor: 'black',
        strokeWidth: 10
    });
    path.strokeBounds.selected = true;
    equals(path.strokeBounds.selected, true, 'strokeBounds.selected');
    equals(path.bounds.selected, false, 'bounds.selected');
    equals(path.selected, false, 'selected');
    path.bounds.selected = true;
    path.strokeBounds.selected = false;
    equals(path.strokeBounds.selected, false, 'strokeBounds.selected');
    equals(path.bounds.selected, true, 'bounds.selected');
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

test('Item#blendMode = \'multiply\'', function() {
    // Multiply blends each channel as backdrop * source / 255, which canvas
    // draws natively, computed by hand below:
    var layer = new Layer();
    new Path.Rectangle({
        size: [100, 100],
        fillColor: '#ff8033' // 255, 128, 51
    });
    new Path.Rectangle({
        size: [100, 100],
        fillColor: '#3366ff', // 51, 102, 255
        blendMode: 'multiply'
    });
    var raster = layer.rasterize(72, false);
    // 255 * 51 / 255, 128 * 102 / 255 (51.2), 51 * 255 / 255:
    equals(raster.getPixel(50, 50), new Color(51 / 255, 51 / 255, 51 / 255, 1),
            'pixel');
});

test('Item#blendMode = \'pin-light\'', function() {
    // Pin light replaces the backdrop with 2 * source where that is darker for
    // sources below 50%, and with 2 * source - 255 where that is lighter for
    // sources above, computed by hand for each channel below:
    var layer = new Layer();
    new Path.Rectangle({
        size: [100, 100],
        fillColor: '#645032' // 100, 80, 50
    });
    new Group({
        children: [
            new Path.Rectangle({
                size: [50, 100],
                fillColor: '#1e64e6' // 30, 100, 230
            }),
            new Path.Rectangle({
                point: [50, 0],
                size: [50, 100],
                fillColor: '#c8148c' // 200, 20, 140
            })
        ],
        blendMode: 'pin-light'
    });
    var raster = layer.rasterize(72, false);

    function getColor(red, green, blue) {
        return new Color(red / 255, green / 255, blue / 255, 1);
    }

    // min(100, 60), min(80, 200), max(50, 205):
    equals(raster.getPixel(25, 50), getColor(60, 80, 205), 'left pixel');
    // max(100, 145), min(80, 40), max(50, 25):
    equals(raster.getPixel(75, 50), getColor(145, 40, 50), 'right pixel');
});

test('paper.support.nativeBlendModes (#2349)', function() {
    // Canvas supports the CSS blend modes, and Paper.js emulates its own:
    var nativeModes = paper.support.nativeBlendModes;
    [
        'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge',
        'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion',
        'hue', 'saturation', 'color', 'luminosity'
    ].forEach(function(mode) {
        equals(nativeModes[mode], true, mode);
    });
    ['add', 'subtract', 'average', 'pin-light', 'negation'].forEach(
        function(mode) {
            equals(nativeModes[mode], false, mode);
        }
    );
});

if (isNodeContext) {
    test('paper.support.nativeBlendModes with a canvas provided after loading', function() {
        // Hosts may only provide their canvas after Paper.js loads. Build the
        // library as gulp does, and load it where there is no canvas yet:
        // without a window, and without an OffscreenCanvas until later.
        var path = require('path'),
            vm = require('vm'),
            Prepro = require('prepro'),
            prepro = new Prepro();
        prepro.evaluate(path.resolve('../src/constants.js'));
        prepro.setup(function() {
            return {
                __options: Object.assign({},
                        require(path.resolve('../src/options.js')),
                        { paperScript: false })
            };
        });
        var context = vm.createContext({ navigator: { userAgent: '' } });
        context.self = context;
        vm.runInContext(prepro.process(path.resolve('../src/paper.js')),
                context);
        var support = context.paper.support;
        equals(support.nativeBlendModes.multiply, undefined,
                'multiply without a canvas');
        context.OffscreenCanvas = function(width, height) {
            return require('canvas').createCanvas(width, height);
        };
        equals(support.nativeBlendModes.multiply, true,
                'multiply with a canvas');
    });
}

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

test('Item#opacity and Item#blendMode on items larger than the view (#1644)', function() {
    // Items that are composited through a temporary canvas used to allocate
    // it for their full bounds, which fails for sizes beyond the browsers'
    // canvas size limits. Test the colors that the view draws, with the
    // expected values calculated by hand for the 100x100 view:
    var huge = 100000;

    function testPixels(pixels, name) {
        view.update();
        var pixelRatio = view.pixelRatio,
            ctx = view.element.getContext('2d');
        for (var i = 0; i < pixels.length; i++) {
            var point = pixels[i][0],
                expected = pixels[i][1],
                actual = Base.slice(ctx.getImageData(point[0] * pixelRatio,
                        point[1] * pixelRatio, 1, 1).data);
            // Allow for rounding of half-transparent channels:
            equals(function() {
                return actual.every(function(value, j) {
                    return Math.abs(value - expected[j]) <= 1;
                });
            }, true, name + ' at ' + point + ': ' + actual + ', expected: '
                    + expected);
        }
    }

    var transparent = [0, 0, 0, 0],
        halfRed = [255, 0, 0, 128],
        halfBlue = [0, 0, 255, 128];

    // A group with opacity, with a huge child that covers the left of the view
    // up to x = 50, and a circle that lies within the view on its right:
    var group = new Group({
        children: [
            new Path.Rectangle({
                from: [-huge, -huge],
                to: [50, huge],
                fillColor: 'red'
            }),
            new Path.Circle({
                center: [75, 50],
                radius: 20,
                fillColor: 'blue'
            })
        ],
        opacity: 0.5
    });
    // NOTE: The temporary canvas is only observable through CanvasProvider,
    // so record the sizes of the canvases that it hands out while drawing:
    // They need to be bounded by the view instead of the group.
    var getCanvas = CanvasProvider.getCanvas,
        sizes = [];
    CanvasProvider.getCanvas = function() {
        var canvas = getCanvas.apply(this, arguments);
        sizes.push(new Size(canvas.width, canvas.height));
        return canvas;
    };
    testPixels([
        [[0, 0], halfRed],
        [[25, 50], halfRed],
        [[48, 99], halfRed],
        [[52, 10], transparent],
        [[75, 50], halfBlue],
        [[60, 50], halfBlue],
        [[75, 25], transparent],
        [[99, 99], transparent]
    ], 'opacity');
    CanvasProvider.getCanvas = getCanvas;
    var bound = view.viewSize.add(1).multiply(view.pixelRatio);
    equals(sizes.length > 0 && sizes.every(function(size) {
        return size.width <= bound.width && size.height <= bound.height;
    }), true, 'temporary canvases bounded by the view');

    // Groups entirely outside the view aren't drawn:
    group.position = group.position.add(2 * huge, 0);
    testPixels([[[25, 50], transparent], [[75, 50], transparent]],
            'outside of the view');
    group.remove();

    // Nested in an opacity group, a multiplying group with a huge blue
    // rectangle that covers the top right of the view, from 40, 50 on:
    // Red * blue = black, and blue over nothing stays blue.
    group = new Group({
        children: [
            new Path.Rectangle({
                from: [-huge, -huge],
                to: [60, huge],
                fillColor: 'red'
            }),
            new Group({
                children: [
                    new Path.Rectangle({
                        from: [40, -huge],
                        to: [huge, 50],
                        fillColor: 'blue'
                    })
                ],
                blendMode: 'multiply'
            })
        ],
        opacity: 0.5
    });
    testPixels([
        [[20, 25], halfRed],
        [[20, 75], halfRed],
        [[50, 25], [0, 0, 0, 128]],
        [[50, 75], halfRed],
        [[80, 25], halfBlue],
        [[80, 75], transparent]
    ], 'nested opacity and blend mode');
    group.remove();

    // An emulated blend mode with a huge green rectangle that covers the right
    // of the view from x = 50 on, over a red background: Red + green = yellow.
    var background = new Path.Rectangle({
        from: [0, 0],
        to: [100, 100],
        fillColor: 'red'
    });
    group = new Group({
        children: [
            new Path.Rectangle({
                from: [50, -huge],
                to: [huge, huge],
                fillColor: new Color(0, 1, 0)
            })
        ],
        blendMode: 'add'
    });
    testPixels([
        [[25, 50], [255, 0, 0, 255]],
        [[75, 0], [255, 255, 0, 255]],
        [[75, 99], [255, 255, 0, 255]],
        [[99, 50], [255, 255, 0, 255]]
    ], 'emulated blend mode');
    background.remove();
    group.remove();

    // A clipped group with opacity, with a huge clip mask that covers the
    // left of the view up to x = 50, over a huge red rectangle:
    group = new Group({
        children: [
            new Path.Rectangle({
                from: [-huge, -huge],
                to: [50, huge]
            }),
            new Path.Rectangle({
                from: [-huge, -huge],
                to: [huge, huge],
                fillColor: 'red'
            })
        ],
        clipped: true,
        opacity: 0.5
    });
    testPixels([
        [[25, 50], halfRed],
        [[48, 0], halfRed],
        [[52, 50], transparent]
    ], 'clipped');
    group.remove();

    // When zooming in, the view only shows a part of the group. The view
    // shows 25..75 now, so the edge of the red rectangle at 50 is at 50 in
    // the view, and the circle at 75 at its right edge:
    group = new Group({
        children: [
            new Path.Rectangle({
                from: [-huge, -huge],
                to: [50, huge],
                fillColor: 'red'
            }),
            new Path.Circle({
                center: [75, 50],
                radius: 20,
                fillColor: 'blue'
            })
        ],
        opacity: 0.5
    });
    view.zoom = 2;
    testPixels([
        [[25, 50], halfRed],
        [[48, 50], halfRed],
        [[52, 50], transparent],
        [[99, 50], halfBlue]
    ], 'zoomed view');
    view.zoom = 1;
});

test('Item#shadowOffset and Item#shadowBlur with opacity (#1628)', function() {
    // Items with both a fill and a stroke and an opacity are composited
    // through a temporary canvas, and cast their shadow when compositing it.
    function getPixel(point) {
        var pixelRatio = view.pixelRatio,
            ctx = view.element.getContext('2d');
        return Base.slice(ctx.getImageData(point[0] * pixelRatio,
                point[1] * pixelRatio, 1, 1).data);
    }

    function testPixels(pixels, name) {
        view.update();
        for (var i = 0; i < pixels.length; i++) {
            var point = pixels[i][0],
                expected = pixels[i][1],
                actual = getPixel(point);
            // Allow for rounding of half-transparent channels, which Node.js'
            // canvas does more coarsely for blurred shadows with an alpha:
            equals(function() {
                return actual.every(function(value, j) {
                    return Math.abs(value - expected[j]) <= 2;
                });
            }, true, name + ' at ' + point + ': ' + actual + ', expected: '
                    + expected);
        }
    }

    // A square with a hard shadow, offset to the bottom right of it, without
    // any overlap: The item covers 9..31, the shadow 49..71.
    var path = new Path.Rectangle({
        from: [10, 10],
        to: [30, 30],
        fillColor: 'red',
        strokeColor: 'red',
        strokeWidth: 2,
        shadowColor: 'black',
        shadowOffset: [40, 40],
        opacity: 0.5
    });
    testPixels([
        [[20, 20], [255, 0, 0, 128]],
        [[52, 52], [0, 0, 0, 128]],
        [[60, 60], [0, 0, 0, 128]],
        [[68, 68], [0, 0, 0, 128]],
        [[75, 75], [0, 0, 0, 0]]
    ], 'shadowOffset');

    // The shadow is transformed with the item: Zoomed by 2 around the view's
    // center, the square from 30 to 40 covers 9..31 in the view again, and
    // its shadow 49..71.
    path.remove();
    path = new Path.Rectangle({
        from: [30, 30],
        to: [40, 40],
        fillColor: 'red',
        strokeColor: 'red',
        strokeWidth: 1,
        shadowColor: 'black',
        shadowOffset: [20, 20],
        opacity: 0.5
    });
    view.zoom = 2;
    testPixels([
        [[20, 20], [255, 0, 0, 128]],
        [[52, 52], [0, 0, 0, 128]],
        [[60, 60], [0, 0, 0, 128]],
        [[68, 68], [0, 0, 0, 128]],
        [[75, 75], [0, 0, 0, 0]]
    ], 'shadowOffset in a zoomed view');
    view.zoom = 1;
    path.remove();

    // A blurred shadow without an offset: Compare it to the shadow that the
    // canvas draws directly without opacity, composited at half opacity.
    path = new Path.Rectangle({
        from: [40, 40],
        to: [60, 60],
        fillColor: 'red',
        strokeColor: 'red',
        strokeWidth: 2,
        shadowColor: 'black',
        shadowBlur: 10
    });
    view.update();
    var points = [[50, 36], [50, 33], [50, 30], [64, 50], [64, 64]],
        pixels = points.map(function(point) {
            var pixel = getPixel(point);
            return [point, [0, 0, 0, Math.round(pixel[3] / 2)]];
        });
    equals(function() {
        return pixels.every(function(pixel) {
            return pixel[1][3] > 0;
        });
    }, true, 'The blurred shadow reaches all tested points');
    path.opacity = 0.5;
    testPixels(pixels, 'shadowBlur');
    path.remove();

    // Groups don't draw shadows themselves, and children with different
    // shadows don't stop them from drawing:
    var group = new Group({
        children: [
            new Path.Rectangle({
                from: [10, 10],
                to: [30, 30],
                fillColor: 'red',
                shadowColor: 'black',
                shadowOffset: [40, 40]
            }),
            new Path.Rectangle({
                from: [10, 40],
                to: [30, 50],
                fillColor: 'red',
                shadowColor: 'black',
                shadowOffset: [40, 0]
            })
        ],
        opacity: 0.5
    });
    testPixels([
        [[20, 20], [255, 0, 0, 128]],
        [[20, 45], [255, 0, 0, 128]]
    ], 'group with different shadows');
    group.remove();
});

test('Item#rasterize() with opacity (#1644)', function() {
    // Rasterizing draws into the raster's own canvas, away from the view:
    var group = new Group({
        children: [
            new Path.Rectangle({
                from: [200, 200],
                to: [300, 300],
                fillColor: 'red'
            }),
            new Path.Rectangle({
                from: [250, 200],
                to: [300, 250],
                fillColor: 'blue'
            })
        ],
        opacity: 0.5
    });
    var raster = group.rasterize(72, false);
    equals(raster.getPixel(25, 25), new Color(1, 0, 0, 128 / 255));
    equals(raster.getPixel(75, 25), new Color(0, 0, 1, 128 / 255));
    equals(raster.getPixel(75, 75), new Color(1, 0, 0, 128 / 255));
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

test('Sibling global matrices are cleared after parent transformation (#1750)', function() {
    function createItem() {
        return new Path.Rectangle({
            point: [0, 0],
            size: [100, 100],
            applyMatrix: false
        });
    }

    // The example from the issue: The first sibling rebuilds the parent's
    // global matrix, which must not validate the stale one of the second:
    var item1 = createItem(),
        item2 = createItem(),
        group = new Group({ children: [item1, item2], applyMatrix: false });
    equals(item1.localToGlobal([0, 0]), new Point(0, 0), 'item1 before');
    equals(item2.localToGlobal([0, 0]), new Point(0, 0), 'item2 before');
    group.translate(100, 0);
    equals(item1.localToGlobal([0, 0]), new Point(100, 0), 'item1 after');
    equals(item2.localToGlobal([0, 0]), new Point(100, 0), 'item2 after');

    // The same with global matrices cached by drawing:
    view.update();
    group.translate(0, 50);
    equals(item2.localToGlobal([0, 0]), new Point(100, 50),
            'item2 after drawing');
    equals(item1.localToGlobal([0, 0]), new Point(100, 50),
            'item1 after drawing');

    // Changing an item's own matrix:
    item1.translate(10, 0);
    equals(item1.localToGlobal([0, 0]), new Point(110, 50),
            'item1 after own translation');
    equals(item2.localToGlobal([0, 0]), new Point(100, 50),
            'item2 after item1 translation');

    // Deeper nesting, moving the grandparent and asking the children first:
    var outer = new Group({ children: [group], applyMatrix: false });
    equals(item2.globalMatrix, new Matrix(1, 0, 0, 1, 100, 50),
            'item2.globalMatrix nested');
    outer.translate(0, 25);
    equals(item2.globalMatrix, new Matrix(1, 0, 0, 1, 100, 75),
            'item2.globalMatrix after outer translation');
    equals(item1.globalMatrix, new Matrix(1, 0, 0, 1, 110, 75),
            'item1.globalMatrix after outer translation');
    equals(group.globalMatrix, new Matrix(1, 0, 0, 1, 100, 75),
            'group.globalMatrix after outer translation');

    // Moving an item to another parent, and removing it:
    var other = new Group({ applyMatrix: false });
    other.translate(0, 200);
    equals(other.globalMatrix, new Matrix(1, 0, 0, 1, 0, 200),
            'other.globalMatrix');
    other.addChild(item2);
    equals(item2.globalMatrix, new Matrix(1, 0, 0, 1, 0, 200),
            'item2.globalMatrix in other group');
    item2.remove();
    equals(item2.globalMatrix, new Matrix(), 'item2.globalMatrix removed');
});

test('Item#rasterize() with empty bounds', function() {
    new Path.Line([0, 0], [100, 0]).rasterize();
    view.update(); // This should not throw
    expect(0);
});

test('Item#fitBounds(rectangle[, fit])', function() {
    // A 10 x 20 item in a 50 x 50 rectangle: To be contained, its height
    // becomes 50, to cover the rectangle its width, and to fill it, both.
    var path = new Path.Rectangle([0, 0, 10, 20]);
    path.fitBounds([0, 0, 50, 50], 'cover');
    equals(path.bounds, new Rectangle(0, -25, 50, 100), 'cover');
    path.fitBounds(0, 0, 50, 50);
    equals(path.bounds, new Rectangle(12.5, 0, 25, 50), 'contain by default');
    path.fitBounds([0, 0, 50, 50], 'contain');
    equals(path.bounds, new Rectangle(12.5, 0, 25, 50), 'contain');
    path.fitBounds(0, 0, 50, 50, 'fill');
    equals(path.bounds, new Rectangle(0, 0, 50, 50), 'fill');
    // The deprecated booleans:
    path.fitBounds([0, 0, 50, 100], true);
    equals(path.bounds, new Rectangle(-25, 0, 100, 100), 'true for cover');
    path.fitBounds([0, 0, 50, 100], false);
    equals(path.bounds, new Rectangle(0, 25, 50, 50), 'false for contain');
});

test('Item#fitBounds() with empty rectangles and items', function() {
    ['contain', 'cover', 'fill'].forEach(function(fit) {
        // An empty rectangle can't scale the item, so it's only centered in
        // it, keeping its size:
        var path = new Path.Rectangle([0, 0, 10, 20]);
        path.fitBounds(new Rectangle(30, 40, 0, 0), fit);
        equals(path.bounds, new Rectangle(25, 30, 10, 20),
                'into an empty rectangle, ' + fit);
        // A line can only be scaled by its width:
        var line = new Path.Line([0, 0], [10, 0]);
        line.fitBounds(new Rectangle(0, 0, 50, 50), fit);
        equals(line.bounds, new Rectangle(0, 25, 50, 0),
                'a horizontal line, ' + fit);
    });
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

test('Item#draw() with opacity and a matrix in a clipped group (#1594)', function() {
    // Items with an opacity are drawn through a temporary canvas, which needs
    // the clip item of their parent too, without the item's own matrix. The
    // same in a clipped group with a matrix of its own:
    function createClippedGroup(item, matrix) {
        return new Group({
            applyMatrix: false,
            matrix: matrix,
            children: [
                new Path.Rectangle({
                    point: [0, 0],
                    size: [100, 100],
                    clipMask: true
                }),
                item
            ]
        });
    }

    function createNested() {
        return new Group({
            applyMatrix: false,
            matrix: new Matrix(0.5, 0, 0, 0.5, 0, 0),
            children: [
                new Path.Rectangle({
                    point: [0, 0],
                    size: [400, 400],
                    fillColor: 'red'
                })
            ],
            opacity: 0.5
        });
    }

    function createDirect() {
        return new Path.Rectangle({
            point: [0, 0],
            size: [200, 200],
            fillColor: 'red',
            opacity: 0.5
        });
    }

    var matrix = new Matrix(2, 0, 0, 2, 10, 20);
    comparePixels(createClippedGroup(createNested()),
            createClippedGroup(createDirect()), 'item with a matrix');
    comparePixels(createClippedGroup(createNested(), matrix),
            createClippedGroup(createDirect(), matrix),
            'item with a matrix in a group with a matrix');
});

test('settings.insertItems for items created from other items (#1721)', function() {
    var settings = paper.settings,
        path = new Path.Rectangle([0, 0], [100, 100]),
        circle = new Path.Circle([100, 100], 50),
        shape = new Shape.Rectangle([0, 0], [100, 100]);

    function create(insert) {
        // Explicit insert arguments override the setting, so only pass them
        // when defined:
        var options = insert !== undefined ? { insert: insert } : undefined;
        return {
            'clone()': path.clone(options),
            'clone({ deep: false })': path.clone(Base.set({ deep: false },
                    options)),
            'unite()': path.unite(circle, options),
            'subtract({ trace: false })': path.subtract(circle,
                    Base.set({ trace: false }, options)),
            'rasterize()': path.rasterize(Base.set({ resolution: 72 },
                    options)),
            'toShape()': path.toShape(insert),
            'toPath()': shape.toPath(insert)
        };
    }

    function check(items, inserted, message) {
        Base.each(items, function(item, name) {
            equals(item.isInserted(), inserted, name + ' ' + message);
            item.remove();
        });
    }

    check(create(), true, 'with insertItems');
    settings.insertItems = false;
    check(create(), false, 'without insertItems');
    check(create(true), true, 'with insert: true, without insertItems');
    settings.insertItems = true;
    check(create(false), false, 'with insert: false');
});

test('settings.scaleStrokes', function() {
    var settings = paper.settings;
    function createPath(props) {
        return new Path.Rectangle(Base.set({
            point: [0, 0],
            size: [10, 10],
            strokeColor: 'black',
            strokeWidth: 2
        }, props));
    }

    // Off by default, so applying a matrix leaves stroke widths as they are:
    var path = createPath();
    path.scale(2);
    equals(path.strokeWidth, 2, 'default');

    settings.scaleStrokes = true;
    path = createPath();
    path.scale(2);
    equals(path.strokeWidth, 4, 'uniform scale');
    // Non-uniform scaling uses the square root of the determinant:
    path = createPath();
    path.scale(2, 8);
    equals(path.strokeWidth, 8, 'non-uniform scale');
    path = createPath();
    path.rotate(45);
    equals(path.strokeWidth, 2, 'rotation');
    // Groups pass it on to their children:
    var group = new Group([createPath(), createPath({ strokeWidth: 1 })]);
    group.scale(3);
    equals(group.children[0].strokeWidth, 6, 'group child 1');
    equals(group.children[1].strokeWidth, 3, 'group child 2');
    // Compound paths scale their own stroke, which is the one they draw:
    var compound = new CompoundPath({
        children: [createPath(), createPath()],
        strokeColor: 'black',
        strokeWidth: 2
    });
    compound.scale(2);
    equals(compound.strokeWidth, 4, 'compound path');
    // Items that keep their matrix already scale the stroke when drawing:
    path = createPath({ applyMatrix: false });
    path.scale(2);
    equals(path.strokeWidth, 2, 'applyMatrix: false');
    // And non-scaling strokes keep their width:
    path = createPath({ strokeScaling: false });
    path.scale(2);
    equals(path.strokeWidth, 2, 'strokeScaling: false');
    settings.scaleStrokes = false;
});

test('Released canvases free their pixels (CanvasProvider)', function() {
    // Keeping released canvases at their size kept their pixels allocated
    // for the life of the page:
    var canvases = [];
    for (var i = 0; i < 12; i++)
        canvases.push(CanvasProvider.getCanvas(500, 500));
    canvases.forEach(function(canvas) {
        CanvasProvider.release(canvas);
    });
    equals(canvases.every(function(canvas) {
        return canvas.width === 0 && canvas.height === 0;
    }), true, 'zero size');
    equals(CanvasProvider.canvases.length <= 8, true, 'at most 8 kept');
    // Reused canvases get the requested size, with their pixels cleared:
    var canvas = CanvasProvider.getCanvas(20, 10);
    equals(new Size(canvas.width, canvas.height), new Size(20, 10), 'reused');
    CanvasProvider.release(canvas);
});

test('Creating an item without a project throws a clear error (#1889)', function() {
    var scope = paper,
        message;
    new PaperScope().activate();
    try {
        new Path();
    } catch (e) {
        message = e.message;
    }
    scope.activate();
    equals(message, 'Unable to create an item without a project. Call '
            + 'paper.setup() or create a Project first.');
});
